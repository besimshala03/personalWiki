import { Router } from 'express';
import { getSpaceById, updateSyncConfig } from '../db.js';
import { getSyncStatus, restartSyncWatcher, runFullScan } from '../sync.js';

const router = Router();

router.get('/status', async (req, res) => {
  res.json(await getSyncStatus());
});

router.post('/config', async (req, res) => {
  const { enabled, onedrive_path, space } = req.body ?? {};

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled must be boolean' });
  }
  if (typeof onedrive_path !== 'string') {
    return res.status(400).json({ error: 'onedrive_path must be string' });
  }
  if (typeof space !== 'string' || !space.trim()) {
    return res.status(400).json({ error: 'space is required' });
  }
  if (!getSpaceById(space)) {
    return res.status(400).json({ error: 'space not found' });
  }

  await updateSyncConfig({
    enabled,
    onedrive_path: onedrive_path.trim(),
    space,
  });
  await restartSyncWatcher();

  res.json(await getSyncStatus());
});

router.post('/run', async (req, res) => {
  try {
    await runFullScan();
    res.json(await getSyncStatus());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
