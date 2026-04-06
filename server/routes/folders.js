import { Router } from 'express';
import { getFoldersBySpace, createFolder, renameFolder, deleteFolder } from '../db.js';

const router = Router();

router.get('/:space', (req, res) => {
  res.json(getFoldersBySpace(req.params.space));
});

router.post('/', async (req, res) => {
  const { name, space, parent_id } = req.body;
  if (!name || !space) return res.status(400).json({ error: 'name and space required' });
  const folder = await createFolder({ name, space, parent_id: parent_id ?? null });
  res.status(201).json(folder);
});

router.patch('/:id', async (req, res) => {
  await renameFolder(parseInt(req.params.id, 10), req.body.name);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await deleteFolder(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

export default router;
