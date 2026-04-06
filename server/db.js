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
  _seq: { folders: 0, links: 0, files: 0, spaces: 3 },
};

export const db = await JSONFilePreset(DB_PATH, defaultData);

// Migrate existing DBs that predate the spaces table
if (!db.data.spaces) {
  db.data.spaces = DEFAULT_SPACES;
  if (!db.data._seq.spaces) db.data._seq.spaces = 3;
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
  await db.write();
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
