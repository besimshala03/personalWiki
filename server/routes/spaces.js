import { Router } from 'express';
import { getSpaces, createSpace, updateSpace, deleteSpace } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(getSpaces());
});

router.post('/', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const space = await createSpace({ name, color: color ?? '#818cf8' });
  res.status(201).json(space);
});

router.patch('/:id', async (req, res) => {
  const { name, color } = req.body;
  const space = await updateSpace(req.params.id, { name, color });
  if (!space) return res.status(404).json({ error: 'not found' });
  res.json(space);
});

router.delete('/:id', async (req, res) => {
  await deleteSpace(req.params.id);
  res.json({ ok: true });
});

export default router;
