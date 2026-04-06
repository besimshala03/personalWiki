import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getFiles, createFile, deleteFileRecord, getFileById } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

const router = Router();

router.get('/', (req, res) => {
  const { space, folder_id } = req.query;
  if (!space) return res.status(400).json({ error: 'space required' });
  const fid = folder_id === undefined || folder_id === 'null' ? null : parseInt(folder_id);
  res.json(getFiles({ space, folder_id: fid }));
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' });
  const { space, folder_id } = req.body;
  if (!space) return res.status(400).json({ error: 'space required' });

  const file = await createFile({
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    size: req.file.size,
    space,
    folder_id: folder_id ? parseInt(folder_id) : null,
  });
  res.status(201).json(file);
});

router.get('/:id/download', (req, res) => {
  const file = getFileById(parseInt(req.params.id));
  if (!file) return res.status(404).json({ error: 'not found' });
  res.download(path.join(UPLOAD_DIR, file.stored_name), file.original_name);
});

router.delete('/:id', async (req, res) => {
  const file = await deleteFileRecord(parseInt(req.params.id));
  if (!file) return res.status(404).json({ error: 'not found' });
  const filePath = path.join(UPLOAD_DIR, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ ok: true });
});

export default router;
