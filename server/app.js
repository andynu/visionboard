const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const filesRouter = require('./routes/files');
const treeRouter = require('./routes/tree');
const { validateCanvasId, validateFilename, validateCanvasBody } = require('./middleware/validation');
const { errorHandler, notFound, asyncHandler } = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', filesRouter);
app.use('/api', treeRouter);

const STORAGE_DIR = path.join(__dirname, 'storage');
const CANVASES_DIR = path.join(STORAGE_DIR, 'canvases');
const IMAGES_DIR = path.join(STORAGE_DIR, 'images');
const PID_FILE = path.join(__dirname, '../server.pid');

async function ensureStorageDirectories() {
  try {
    await fs.mkdir(CANVASES_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directories:', error);
  }
}

app.get('/api/canvas/:id', validateCanvasId, asyncHandler(async (req, res) => {
  const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
  let data;
  try {
    data = await fs.readFile(canvasPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw notFound('Canvas not found');
    }
    throw error;
  }
  let canvas = JSON.parse(data);

  // Migration: Add version if missing
  if (!canvas.version) {
    canvas.version = '1.0.0';
    canvas.modified = new Date().toISOString();
    await fs.writeFile(canvasPath, JSON.stringify(canvas, null, 2));
  }

  res.json(canvas);
}));

app.post('/api/canvas', validateCanvasBody, asyncHandler(async (req, res) => {
  const canvas = {
    version: '1.0.0',
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
}));

app.put('/api/canvas/:id', validateCanvasId, validateCanvasBody, asyncHandler(async (req, res) => {
  const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
  const canvas = {
    ...req.body,
    version: req.body.version || '1.0.0', // Ensure version is preserved or set
    modified: new Date().toISOString()
  };

  await fs.writeFile(canvasPath, JSON.stringify(canvas, null, 2));
  res.json(canvas);
}));

app.delete('/api/canvas/:id', validateCanvasId, asyncHandler(async (req, res) => {
  const canvasPath = path.join(CANVASES_DIR, `${req.params.id}.json`);
  try {
    await fs.unlink(canvasPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw notFound('Canvas not found');
    }
    throw error;
  }
  res.json({ success: true });
}));

app.get('/api/images/:filename', validateFilename, (req, res) => {
  const imagePath = path.join(IMAGES_DIR, req.params.filename);
  res.sendFile(imagePath);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware - must be registered after all routes
app.use(errorHandler);

async function writePidFile() {
  try {
    await fs.writeFile(PID_FILE, process.pid.toString());
    console.log(`PID ${process.pid} written to ${PID_FILE}`);
  } catch (error) {
    console.error('Error writing PID file:', error);
  }
}

async function removePidFile() {
  try {
    await fs.unlink(PID_FILE);
    console.log('PID file removed');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error removing PID file:', error);
    }
  }
}

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM signal');
  await removePidFile();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT signal');
  await removePidFile();
  process.exit(0);
});

async function startServer() {
  await ensureStorageDirectories();
  await writePidFile();
  
  const defaultCanvasPath = path.join(CANVASES_DIR, 'main.json');
  try {
    await fs.access(defaultCanvasPath);
  } catch (error) {
    const defaultCanvas = {
      version: '1.0.0',
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
  
  app.listen(PORT, '0.0.0.0', async (err) => {
    if (err) {
      console.error(`Error starting server: ${err.message}`);
      await removePidFile();
      process.exit(1);
    }
    console.log(`Vision Board server running at http://0.0.0.0:${PORT}`);
    console.log(`Access from other devices at http://[your-ip]:${PORT}`);
  });
}

startServer().catch(console.error);