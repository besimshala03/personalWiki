import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  findFileByName,
  getFolderById,
  getFoldersBySpace,
  getSpaceById,
  getSyncConfig,
  setSyncLastRun,
} from './db.js';
import { deleteStoredFile, storeImportedFile } from './fileStore.js';

const MAX_LOG_ENTRIES = 50;
const COMMON_ONEDRIVE_PATHS = [
  path.join(os.homedir(), 'OneDrive', 'GoodNotes'),
  path.join(os.homedir(), 'OneDrive - Personal', 'GoodNotes'),
];

let watcher = null;
let watcherRoot = null;
let scanInFlight = null;
const logEntries = [];
const pendingTimers = new Map();

function normalizeName(value) {
  return value.trim().toLowerCase();
}

function canonicalizeName(value) {
  return normalizeName(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function addLog({ file, folder, action, error }) {
  logEntries.unshift({
    ts: new Date().toISOString(),
    file,
    folder,
    action,
    error: error ?? null,
  });
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.length = MAX_LOG_ENTRIES;
  }
}

async function pathExists(targetPath) {
  if (!targetPath) return false;
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveOneDrivePath(config = getSyncConfig()) {
  const configuredPath = config.onedrive_path?.trim();
  if (configuredPath && await pathExists(configuredPath)) {
    return configuredPath;
  }

  for (const candidate of COMMON_ONEDRIVE_PATHS) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return configuredPath || '';
}

function resolveTargetFolder(spaceId, relativeSegments) {
  const folders = getFoldersBySpace(spaceId);
  const space = getSpaceById(spaceId);
  const normalizedSegments = [...relativeSegments];

  // GoodNotes backups can include a top-level folder named after the selected
  // wiki space (for example `University/ss26/...`). That wrapper is not a wiki
  // folder, so ignore it before walking the folder tree.
  if (normalizedSegments.length > 0) {
    const first = normalizeName(normalizedSegments[0]);
    if (first === normalizeName(spaceId) || (space && first === normalizeName(space.name))) {
      normalizedSegments.shift();
    }
  }

  let parentId = null;
  let matchedFolder = null;

  for (const segment of normalizedSegments) {
    const nextFolder = folders.find(folder =>
      folder.parent_id === parentId &&
      (
        normalizeName(folder.name) === normalizeName(segment) ||
        canonicalizeName(folder.name) === canonicalizeName(segment)
      ),
    );

    if (!nextFolder) {
      return null;
    }

    matchedFolder = nextFolder;
    parentId = nextFolder.id;
  }

  return matchedFolder;
}

async function processPdfFile(absolutePath) {
  const config = getSyncConfig();
  const effectiveRoot = await resolveOneDrivePath(config);

  if (!config.enabled || !effectiveRoot || !getSpaceById(config.space)) {
    return;
  }

  const filename = path.basename(absolutePath);

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) return;

    const relativePath = path.relative(effectiveRoot, absolutePath);
    if (relativePath.startsWith('..')) return;

    const pathSegments = relativePath.split(path.sep).filter(Boolean);
    const folderSegments = pathSegments.slice(0, -1);
    const targetFolder = resolveTargetFolder(config.space, folderSegments);
    const folderId = targetFolder?.id ?? null;
    const folderLabel = targetFolder?.name ?? '(root)';

    const existing = findFileByName({
      space: config.space,
      folder_id: folderId,
      original_name: filename,
    });

    if (existing) {
      const sameSize = existing.size === stats.size;
      const sameMtime = existing.source_mtime != null && existing.source_mtime === stats.mtimeMs;
      if (sameSize && (sameMtime || existing.source_mtime == null)) {
        addLog({ file: filename, folder: folderLabel, action: 'skipped' });
        return;
      }

      await deleteStoredFile(existing.id);
    }

    await storeImportedFile({
      sourcePath: absolutePath,
      originalName: filename,
      size: stats.size,
      space: config.space,
      folder_id: folderId,
      source_mtime: stats.mtimeMs,
    });

    addLog({
      file: filename,
      folder: folderLabel,
      action: existing ? 'updated' : 'imported',
    });
  } catch (error) {
    addLog({
      file: filename,
      folder: '(unknown)',
      action: 'error',
      error: error.message,
    });
  }
}

async function collectPdfFiles(rootPath) {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectPdfFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(absolutePath);
    }
  }

  return files;
}

export async function runFullScan() {
  if (scanInFlight) return scanInFlight;

  scanInFlight = (async () => {
    const config = getSyncConfig();
    const effectiveRoot = await resolveOneDrivePath(config);

    if (!config.enabled) {
      throw new Error('Sync is disabled');
    }
    if (!getSpaceById(config.space)) {
      throw new Error(`Space "${config.space}" does not exist`);
    }
    if (!effectiveRoot || !await pathExists(effectiveRoot)) {
      throw new Error('OneDrive GoodNotes folder could not be found');
    }

    const pdfFiles = await collectPdfFiles(effectiveRoot);
    for (const absolutePath of pdfFiles) {
      await processPdfFile(absolutePath);
    }

    await setSyncLastRun(new Date().toISOString());
  })();

  try {
    await scanInFlight;
  } finally {
    scanInFlight = null;
  }
}

function scheduleProcess(absolutePath) {
  const existingTimer = pendingTimers.get(absolutePath);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(async () => {
    pendingTimers.delete(absolutePath);
    await processPdfFile(absolutePath);
  }, 400);

  pendingTimers.set(absolutePath, timer);
}

export async function stopSyncWatcher() {
  for (const timer of pendingTimers.values()) {
    clearTimeout(timer);
  }
  pendingTimers.clear();

  if (watcher) {
    await watcher.close();
    watcher = null;
    watcherRoot = null;
  }
}

export async function startSyncWatcher() {
  const config = getSyncConfig();
  const effectiveRoot = await resolveOneDrivePath(config);

  await stopSyncWatcher();

  if (!config.enabled) {
    return false;
  }

  if (!getSpaceById(config.space)) {
    addLog({
      file: '',
      folder: '(setup)',
      action: 'error',
      error: `Space "${config.space}" does not exist`,
    });
    return false;
  }

  if (!effectiveRoot || !await pathExists(effectiveRoot)) {
    addLog({
      file: '',
      folder: '(setup)',
      action: 'error',
      error: 'OneDrive GoodNotes folder could not be found',
    });
    return false;
  }

  watcherRoot = effectiveRoot;
  watcher = chokidar.watch(path.join(effectiveRoot, '**', '*.pdf'), {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 800,
      pollInterval: 100,
    },
  });

  watcher.on('add', scheduleProcess);
  watcher.on('change', scheduleProcess);
  watcher.on('error', (error) => {
    addLog({
      file: '',
      folder: '(watcher)',
      action: 'error',
      error: error.message,
    });
  });

  runFullScan().catch((error) => {
    addLog({
      file: '',
      folder: '(scan)',
      action: 'error',
      error: error.message,
    });
  });

  return true;
}

export async function restartSyncWatcher() {
  return startSyncWatcher();
}

export async function initializeSync() {
  await startSyncWatcher();
}

export async function getSyncStatus() {
  const config = getSyncConfig();
  const effectivePath = await resolveOneDrivePath(config);

  return {
    ...config,
    watcher_running: Boolean(watcher),
    effective_path: effectivePath,
    auto_detected: !config.onedrive_path?.trim() && Boolean(effectivePath),
    log: logEntries.slice(0, 50),
  };
}
