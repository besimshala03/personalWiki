import { Router } from 'express';
import { deleteTask, getAllTasks, getTasks, insertTask, updateTask } from '../db.js';
import { parseFolderId } from '../utils.js';

const router = Router();

router.get('/', (req, res) => {
  const { space, folder_id } = req.query;
  if (!space) return res.status(400).json({ error: 'space required' });
  const fid = parseFolderId(folder_id);
  res.json(getTasks({ space, folder_id: fid }));
});

router.get('/all', (req, res) => {
  res.json(getAllTasks());
});

router.post('/', async (req, res) => {
  const { title, space, folder_id, due_date } = req.body;
  if (!title || !space || !due_date) {
    return res.status(400).json({ error: 'title, space, due_date required' });
  }

  const task = await insertTask({
    title: title.trim(),
    space,
    folder_id: folder_id ?? null,
    due_date,
  });

  res.status(201).json(task);
});

router.patch('/:id', async (req, res) => {
  const task = await updateTask(parseInt(req.params.id, 10), req.body);
  if (!task) return res.status(404).json({ error: 'not found' });
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  await deleteTask(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

export default router;
