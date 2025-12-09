// Validation patterns for API input
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;

function isValidCanvasId(id) {
  if (!id || typeof id !== 'string') return false;
  // Allow 'main' as special case, UUIDs, or safe alphanumeric IDs
  if (id === 'main') return true;
  if (UUID_PATTERN.test(id)) return true;
  if (SAFE_ID_PATTERN.test(id) && id.length <= 64) return true;
  return false;
}

function isValidFilename(filename) {
  if (!filename || typeof filename !== 'string') return false;
  // Must match safe pattern and not contain path components
  if (!SAFE_FILENAME_PATTERN.test(filename)) return false;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
  if (filename.length > 255) return false;
  return true;
}

function validateCanvasId(req, res, next) {
  const id = req.params.id;
  if (!isValidCanvasId(id)) {
    return res.status(400).json({ error: 'Invalid canvas ID format' });
  }
  next();
}

function validateFilename(req, res, next) {
  const filename = req.params.filename;
  if (!isValidFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename format' });
  }
  next();
}

function validateCanvasBody(req, res, next) {
  const body = req.body;

  // For POST/PUT operations, validate body contents
  if (body.id && !isValidCanvasId(body.id)) {
    return res.status(400).json({ error: 'Invalid canvas ID in body' });
  }
  if (body.parentId && !isValidCanvasId(body.parentId)) {
    return res.status(400).json({ error: 'Invalid parent ID format' });
  }
  if (body.name && (typeof body.name !== 'string' || body.name.length > 256)) {
    return res.status(400).json({ error: 'Invalid canvas name' });
  }

  next();
}

function validateTreeCanvasBody(req, res, next) {
  const { canvasId, parentId, name } = req.body;

  if (canvasId && !isValidCanvasId(canvasId)) {
    return res.status(400).json({ error: 'Invalid canvas ID format' });
  }
  if (parentId && !isValidCanvasId(parentId)) {
    return res.status(400).json({ error: 'Invalid parent ID format' });
  }
  if (name && (typeof name !== 'string' || name.length > 256)) {
    return res.status(400).json({ error: 'Invalid canvas name' });
  }

  next();
}

module.exports = {
  isValidCanvasId,
  isValidFilename,
  validateCanvasId,
  validateFilename,
  validateCanvasBody,
  validateTreeCanvasBody
};
