import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'wiki.json');

const DEFAULT_SPACES = [
  { id: 'university', name: 'University', color: '#818cf8', created_at: new Date().toISOString() },
  { id: 'private',    name: 'Private',    color: '#34d399', created_at: new Date().toISOString() },
  { id: 'work',       name: 'Work',       color: '#fbbf24', created_at: new Date().toISOString() },
];

const defaultData = {
  spaces: DEFAULT_SPACES,
  folders: [],
  links: [],
  files: [],
  tasks: [],
  sync: {
    enabled: false,
    onedrive_path: '',
    space: 'university',
    last_run: null,
  },
  _seq: { folders: 0, links: 0, files: 0, tasks: 0, spaces: 3 },
};

export const db = await JSONFilePreset(DB_PATH, defaultData);

// Migrate existing DBs that predate the spaces table
if (!db.data.spaces) {
  db.data.spaces = DEFAULT_SPACES;
  if (!db.data._seq.spaces) db.data._seq.spaces = 3;
  await db.write();
}

if (!db.data.sync) {
  db.data.sync = { ...defaultData.sync };
  await db.write();
}

if (!db.data.tasks) {
  db.data.tasks = [];
  await db.write();
}

if (!db.data._seq) {
  db.data._seq = { ...defaultData._seq };
  await db.write();
} else if (db.data._seq.tasks === undefined) {
  db.data._seq.tasks = 0;
  await db.write();
}

function nextId(table) {
  db.data._seq[table]++;
  return db.data._seq[table];
}

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'space';
}

// ── Spaces ────────────────────────────────────────────────
export function getSpaces() {
  return db.data.spaces;
}

export function getSpaceById(id) {
  return db.data.spaces.find(s => s.id === id) ?? null;
}

export async function createSpace({ name, color }) {
  const base = slugify(name);
  let id = base;
  let i = 2;
  while (db.data.spaces.some(s => s.id === id)) { id = `${base}-${i++}`; }
  const space = { id, name, color, created_at: new Date().toISOString() };
  db.data.spaces.push(space);
  await db.write();
  return space;
}

export async function updateSpace(id, { name, color }) {
  const s = db.data.spaces.find(s => s.id === id);
  if (!s) return null;
  if (name !== undefined) s.name = name;
  if (color !== undefined) s.color = color;
  await db.write();
  return s;
}

export async function deleteSpace(id) {
  db.data.spaces  = db.data.spaces.filter(s => s.id !== id);
  db.data.folders = db.data.folders.filter(f => f.space !== id);
  db.data.links   = db.data.links.filter(l => l.space !== id);
  db.data.files   = db.data.files.filter(f => f.space !== id);
  db.data.tasks   = db.data.tasks.filter(t => t.space !== id);
  await db.write();
}

// ── Folders ──────────────────────────────────────────────
export function getFoldersBySpace(space) {
  return db.data.folders.filter(f => f.space === space);
}

export function getFolderById(id) {
  return db.data.folders.find(f => f.id === id) ?? null;
}

export async function createFolder({ name, space, parent_id = null }) {
  const folder = { id: nextId('folders'), name, space, parent_id, created_at: new Date().toISOString() };
  db.data.folders.push(folder);
  await db.write();
  return folder;
}

export async function renameFolder(id, name) {
  const f = db.data.folders.find(f => f.id === id);
  if (f) { f.name = name; await db.write(); }
}

export async function deleteFolder(id) {
  const toDelete = new Set();
  const collect = (pid) => {
    db.data.folders.filter(f => f.parent_id === pid).forEach(f => { toDelete.add(f.id); collect(f.id); });
  };
  toDelete.add(id);
  collect(id);
  db.data.folders = db.data.folders.filter(f => !toDelete.has(f.id));
  db.data.links   = db.data.links.filter(l => !toDelete.has(l.folder_id));
  db.data.files   = db.data.files.filter(f => !toDelete.has(f.folder_id));
  db.data.tasks   = db.data.tasks.filter(t => !toDelete.has(t.folder_id));
  await db.write();
}

// ── Links ────────────────────────────────────────────────
export function getLinks({ space, folder_id }) {
  return db.data.links
    .filter(l => l.space === space && (folder_id === null ? l.folder_id === null : l.folder_id === folder_id))
    .sort((a, b) => b.id - a.id);
}

export async function createLink({ title, url, description = null, space, folder_id = null }) {
  const link = { id: nextId('links'), title, url, description, space, folder_id, created_at: new Date().toISOString() };
  db.data.links.push(link);
  await db.write();
  return link;
}

export async function updateLink(id, { title, url, description }) {
  const l = db.data.links.find(l => l.id === id);
  if (l) { l.title = title; l.url = url; l.description = description ?? null; await db.write(); }
}

export async function deleteLink(id) {
  db.data.links = db.data.links.filter(l => l.id !== id);
  await db.write();
}

// ── Files ────────────────────────────────────────────────
export function getFiles({ space, folder_id }) {
  return db.data.files
    .filter(f => f.space === space && (folder_id === null ? f.folder_id === null : f.folder_id === folder_id))
    .sort((a, b) => b.id - a.id);
}

export async function insertFileRecord({
  original_name,
  stored_name,
  mime_type,
  size,
  space,
  folder_id = null,
  source_mtime = null,
}) {
  const file = {
    id: nextId('files'),
    original_name,
    stored_name,
    mime_type,
    size,
    space,
    folder_id,
    source_mtime,
    created_at: new Date().toISOString(),
  };
  db.data.files.push(file);
  await db.write();
  return file;
}

export async function deleteFileRecord(id) {
  const file = db.data.files.find(f => f.id === id);
  db.data.files = db.data.files.filter(f => f.id !== id);
  await db.write();
  return file;
}

// ── Tasks ────────────────────────────────────────────────
export function getTasks({ space, folder_id }) {
  return db.data.tasks
    .filter(task => task.space === space && (folder_id === null ? task.folder_id === null : task.folder_id === folder_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getAllTasks() {
  return [...db.data.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

export async function insertTask({ title, space, folder_id = null, due_date }) {
  const task = {
    id: nextId('tasks'),
    title,
    space,
    folder_id,
    due_date,
    completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
  };
  db.data.tasks.push(task);
  await db.write();
  return task;
}

export async function updateTask(id, fields) {
  const task = db.data.tasks.find(entry => entry.id === id);
  if (!task) return null;

  if (fields.title !== undefined) task.title = fields.title;
  if (fields.due_date !== undefined) task.due_date = fields.due_date;
  if (fields.completed !== undefined) task.completed = fields.completed;
  if (fields.completed_at !== undefined) task.completed_at = fields.completed_at;
  if (fields.folder_id !== undefined) task.folder_id = fields.folder_id;
  if (fields.space !== undefined) task.space = fields.space;

  await db.write();
  return task;
}

export async function deleteTask(id) {
  db.data.tasks = db.data.tasks.filter(task => task.id !== id);
  await db.write();
}

export function getFileById(id) {
  return db.data.files.find(f => f.id === id) ?? null;
}

export function findFileByName({ space, folder_id = null, original_name }) {
  return db.data.files.find(file =>
    file.space === space &&
    file.original_name === original_name &&
    file.folder_id === folder_id,
  ) ?? null;
}

export function getSyncConfig() {
  return { ...defaultData.sync, ...db.data.sync };
}

export async function updateSyncConfig({ enabled, onedrive_path, space }) {
  const current = getSyncConfig();
  db.data.sync = {
    ...current,
    enabled: enabled ?? current.enabled,
    onedrive_path: onedrive_path ?? current.onedrive_path,
    space: space ?? current.space,
  };
  await db.write();
  return db.data.sync;
}

export async function setSyncLastRun(lastRun) {
  db.data.sync = {
    ...getSyncConfig(),
    last_run: lastRun,
  };
  await db.write();
  return db.data.sync;
}
