import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { deleteFileRecord, insertFileRecord } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function createStoredFilename(originalName) {
  return `${Date.now()}-${randomUUID()}${path.extname(originalName)}`;
}

export async function storeImportedFile({
  sourcePath,
  originalName = path.basename(sourcePath),
  mimeType = 'application/pdf',
  size,
  space,
  folder_id = null,
  source_mtime = null,
}) {
  const storedName = createStoredFilename(originalName);
  const destination = path.join(UPLOAD_DIR, storedName);
  // `fs.copyFile()` can fail on macOS cloud placeholder files (for example
  // OneDrive "dataless" files). Reading the source first forces hydration and
  // makes the import path work for locally synced cloud files.
  const content = await fsp.readFile(sourcePath);
  await fsp.writeFile(destination, content);

  return insertFileRecord({
    original_name: originalName,
    stored_name: storedName,
    mime_type: mimeType,
    size,
    space,
    folder_id,
    source_mtime,
  });
}

export async function deleteStoredFile(id) {
  const file = await deleteFileRecord(id);
  if (!file) return null;

  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (fs.existsSync(filePath)) {
    await fsp.unlink(filePath);
  }

  return file;
}
