const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

const TEST_CANVASES_DIR = path.join(__dirname, '../../server/storage/canvases');

// Track created test canvases for cleanup
const createdCanvases = [];

test.afterEach(async () => {
  // Clean up test canvases
  for (const canvasId of createdCanvases) {
    try {
      await fs.unlink(path.join(TEST_CANVASES_DIR, `${canvasId}.json`));
    } catch (e) {
      // Ignore if already deleted
    }
  }
  createdCanvases.length = 0;
});

test.describe('Canvas API', () => {
  test('GET /api/canvas/main should return the main canvas', async ({ request }) => {
    const response = await request.get('/api/canvas/main');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('main');
    expect(data.name).toBe('Main Canvas');
    expect(data.version).toBeTruthy();
    expect(Array.isArray(data.elements)).toBe(true);
  });

  test('GET /api/canvas/nonexistent should return 404', async ({ request }) => {
    const response = await request.get('/api/canvas/nonexistent-canvas-id');
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  test('POST /api/canvas should create a new canvas', async ({ request }) => {
    const response = await request.post('/api/canvas', {
      data: { name: 'Test Canvas' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.id).toBeTruthy();
    expect(data.name).toBe('Test Canvas');
    expect(data.parentId).toBeNull();
    expect(data.created).toBeTruthy();
    expect(data.modified).toBeTruthy();
    expect(data.version).toBeTruthy();
    expect(Array.isArray(data.elements)).toBe(true);

    createdCanvases.push(data.id);
  });

  test('POST /api/canvas with parentId should create a child canvas', async ({ request }) => {
    const response = await request.post('/api/canvas', {
      data: { name: 'Child Canvas', parentId: 'main' },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.parentId).toBe('main');

    createdCanvases.push(data.id);
  });

  test('PUT /api/canvas/:id should update a canvas', async ({ request }) => {
    // First create a canvas
    const createResponse = await request.post('/api/canvas', {
      data: { name: 'Canvas to Update' },
    });
    const createData = await createResponse.json();
    const canvasId = createData.id;
    createdCanvases.push(canvasId);

    // Then update it
    const updateResponse = await request.put(`/api/canvas/${canvasId}`, {
      data: {
        ...createData,
        name: 'Updated Canvas Name',
        elements: [{ type: 'test' }],
      },
    });

    expect(updateResponse.status()).toBe(200);
    const updateData = await updateResponse.json();
    expect(updateData.name).toBe('Updated Canvas Name');
    expect(updateData.elements).toEqual([{ type: 'test' }]);
  });

  test('DELETE /api/canvas/:id should delete a canvas', async ({ request }) => {
    // First create a canvas
    const createResponse = await request.post('/api/canvas', {
      data: { name: 'Canvas to Delete' },
    });
    const createData = await createResponse.json();
    const canvasId = createData.id;

    // Delete it
    const deleteResponse = await request.delete(`/api/canvas/${canvasId}`);
    expect(deleteResponse.status()).toBe(200);
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);

    // Verify it's gone
    const getResponse = await request.get(`/api/canvas/${canvasId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('DELETE /api/canvas/nonexistent should return 404', async ({ request }) => {
    const response = await request.delete('/api/canvas/nonexistent-canvas-id');
    expect(response.status()).toBe(404);
  });

  test('API rejects path traversal in canvas ID', async ({ request }) => {
    // Express normalizes URLs, so we need to encode
    const response = await request.get('/api/canvas/..%2F..%2F..%2Fetc%2Fpasswd');
    expect(response.status()).toBe(400);
  });
});

test.describe('Tree API', () => {
  test('GET /api/tree should return tree structure', async ({ request }) => {
    const response = await request.get('/api/tree');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.rootCanvases)).toBe(true);
    expect(data.canvases).toBeTruthy();
    expect(data.canvases.main).toBeTruthy();
  });

  test('POST /api/tree/canvas should add canvas to tree', async ({ request }) => {
    // First create a canvas
    const createResponse = await request.post('/api/canvas', {
      data: { name: 'Tree Test Canvas' },
    });
    const createData = await createResponse.json();
    const canvasId = createData.id;
    createdCanvases.push(canvasId);

    // Add to tree
    const treeResponse = await request.post('/api/tree/canvas', {
      data: { canvasId: canvasId, name: 'Tree Test Canvas' },
    });

    expect(treeResponse.status()).toBe(200);
    const treeData = await treeResponse.json();
    expect(treeData.canvases[canvasId]).toBeTruthy();

    // Clean up tree
    await request.delete(`/api/tree/canvas/${canvasId}`);
  });
});
