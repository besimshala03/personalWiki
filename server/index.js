import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize DB before routes (db.js uses top-level await)
await import('./db.js');

import spacesRouter from './routes/spaces.js';
import foldersRouter from './routes/folders.js';
import linksRouter from './routes/links.js';
import filesRouter from './routes/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

app.use('/api/spaces', spacesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/links', linksRouter);
app.use('/api/files', filesRouter);

// Serve React frontend
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(CLIENT_DIST));
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Personal Wiki running at http://localhost:${PORT}`);
});
