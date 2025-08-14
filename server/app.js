const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const filesRouter = require('./routes/files');
const treeRouter = require('./routes/tree');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', filesRouter);
app.use('/api', treeRouter);

const STORAGE_DIR = path.join(__dirname, 'storage');
const CANVASES_DIR = path.join(STORAGE_DIR, 'canvases');
const IMAGES_DIR = path.join(STORAGE_DIR, 'images');

async function ensureStorageDirectories() {
  try {
    await fs.mkdir(CANVASES_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directories:', error);
  }
}

app.get('/api/canvas/:id', async (req, res) => {
  try {
    const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
    const data = await fs.readFile(canvasPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Canvas not found' });
    } else {
      res.status(500).json({ error: 'Failed to load canvas' });
    }
  }
});

app.post('/api/canvas', async (req, res) => {
  try {
    const canvas = {
      id: uuidv4(),
      name: req.body.name || 'New Canvas',
      parentId: req.body.parentId || null,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      viewBox: { x: 0, y: 0, width: 1920, height: 1080 },
      elements: []
    };

    const canvasPath = path.join(CANVASES_DIR, `${canvas.id}.json`);
    await fs.writeFile(canvasPath, JSON.stringify(canvas, null, 2));
    
    res.json(canvas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create canvas' });
  }
});

app.put('/api/canvas/:id', async (req, res) => {
  try {
    const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
    const canvas = {
      ...req.body,
      modified: new Date().toISOString()
    };
    
    await fs.writeFile(canvasPath, JSON.stringify(canvas, null, 2));
    res.json(canvas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update canvas' });
  }
});

app.delete('/api/canvas/:id', async (req, res) => {
  try {
    const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
    await fs.unlink(canvasPath);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Canvas not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete canvas' });
    }
  }
});

app.get('/api/images/:filename', (req, res) => {
  const imagePath = path.join(IMAGES_DIR, req.params.filename);
  res.sendFile(imagePath);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function startServer() {
  await ensureStorageDirectories();
  
  const defaultCanvasPath = path.join(CANVASES_DIR, 'main.json');
  try {
    await fs.access(defaultCanvasPath);
  } catch (error) {
    const defaultCanvas = {
      id: 'main',
      name: 'Main Canvas',
      parentId: null,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      viewBox: { x: 0, y: 0, width: 1920, height: 1080 },
      elements: []
    };
    await fs.writeFile(defaultCanvasPath, JSON.stringify(defaultCanvas, null, 2));
  }
  
  app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
      console.error(`Error starting server: ${err.message}`);
      process.exit(1);
    }
    console.log(`Vision Board server running at http://0.0.0.0:${PORT}`);
    console.log(`Access from other devices at http://[your-ip]:${PORT}`);
  });
}

startServer().catch(console.error);