import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'wiki.json');

const defaultData = { folders: [], links: [], files: [], _seq: { folders: 0, links: 0, files: 0 } };

export const db = await JSONFilePreset(DB_PATH, defaultData);

function nextId(table) {
  db.data._seq[table]++;
  return db.data._seq[table];
}

// ── Folders ──────────────────────────────────────────────
export function getFoldersBySpace(space) {
  return db.data.folders.filter(f => f.space === space);
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
  // Collect all descendant ids
  const toDelete = new Set();
  const collect = (pid) => {
    db.data.folders.filter(f => f.parent_id === pid).forEach(f => { toDelete.add(f.id); collect(f.id); });
  };
  toDelete.add(id);
  collect(id);

  db.data.folders = db.data.folders.filter(f => !toDelete.has(f.id));
  db.data.links   = db.data.links.filter(l => !toDelete.has(l.folder_id));
  db.data.files   = db.data.files.filter(f => !toDelete.has(f.folder_id));
  await db.write();
  return [...toDelete];
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

export async function createFile({ original_name, stored_name, mime_type, size, space, folder_id = null }) {
  const file = { id: nextId('files'), original_name, stored_name, mime_type, size, space, folder_id, created_at: new Date().toISOString() };
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

export function getFileById(id) {
  return db.data.files.find(f => f.id === id) ?? null;
}
