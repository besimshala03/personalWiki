import { Router } from 'express';
import { getLinks, createLink, updateLink, deleteLink } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { space, folder_id } = req.query;
  if (!space) return res.status(400).json({ error: 'space required' });
  const fid = folder_id === undefined || folder_id === 'null' ? null : parseInt(folder_id);
  res.json(getLinks({ space, folder_id: fid }));
});

router.post('/', async (req, res) => {
  const { title, url, description, space, folder_id } = req.body;
  if (!title || !url || !space) return res.status(400).json({ error: 'title, url, space required' });
  const link = await createLink({ title, url, description, space, folder_id: folder_id ?? null });
  res.status(201).json(link);
});

router.patch('/:id', async (req, res) => {
  await updateLink(parseInt(req.params.id), req.body);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await deleteLink(parseInt(req.params.id));
  res.json({ ok: true });
});

export default router;
