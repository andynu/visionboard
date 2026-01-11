/**
 * API Contract Tests for Tauri/Express Parity
 *
 * These tests verify that both backends (Express server and Tauri desktop app)
 * produce responses with the same structure and behavior.
 *
 * The tests define a contract that both implementations must satisfy:
 * - Response shapes must match
 * - Side effects must be equivalent
 * - Error handling must be consistent
 *
 * Run with: npx playwright test test/e2e/api-contract.spec.js
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

const TEST_CANVASES_DIR = path.join(__dirname, '../../server/storage/canvases');
const TEST_TREE_FILE = path.join(__dirname, '../../server/storage/tree.json');

// Track created test canvases for cleanup
const createdCanvases = [];
let originalTree = null;

/**
 * Shape validators - verify response has expected structure
 * These define the contract that both backends must satisfy
 */
const shapes = {
  /**
   * Canvas shape: {
   *   version: string,
   *   id: string,
   *   name: string,
   *   parentId: string | null,
   *   created: string (ISO date),
   *   modified: string (ISO date),
   *   viewBox: { x: number, y: number, width: number, height: number },
   *   elements: array
   * }
   */
  canvas: (data, context = '') => {
    expect(typeof data.version, `${context}version should be string`).toBe('string');
    expect(typeof data.id, `${context}id should be string`).toBe('string');
    expect(typeof data.name, `${context}name should be string`).toBe('string');
    expect(
      data.parentId === null || typeof data.parentId === 'string',
      `${context}parentId should be string or null`
    ).toBe(true);
    expect(typeof data.created, `${context}created should be string`).toBe('string');
    expect(typeof data.modified, `${context}modified should be string`).toBe('string');

    // viewBox shape
    expect(typeof data.viewBox, `${context}viewBox should be object`).toBe('object');
    expect(typeof data.viewBox.x, `${context}viewBox.x should be number`).toBe('number');
    expect(typeof data.viewBox.y, `${context}viewBox.y should be number`).toBe('number');
    expect(typeof data.viewBox.width, `${context}viewBox.width should be number`).toBe('number');
    expect(typeof data.viewBox.height, `${context}viewBox.height should be number`).toBe('number');

    // elements array
    expect(Array.isArray(data.elements), `${context}elements should be array`).toBe(true);
  },

  /**
   * Tree shape: {
   *   rootCanvases: string[],
   *   canvases: {
   *     [canvasId]: {
   *       name: string,
   *       children: string[],
   *       parent: string | null
   *     }
   *   }
   * }
   */
  tree: (data, context = '') => {
    expect(Array.isArray(data.rootCanvases), `${context}rootCanvases should be array`).toBe(true);
    expect(typeof data.canvases, `${context}canvases should be object`).toBe('object');

    // Validate each canvas node in the tree
    for (const [canvasId, node] of Object.entries(data.canvases)) {
      const nodeContext = `${context}canvases.${canvasId}.`;
      expect(typeof node.name, `${nodeContext}name should be string`).toBe('string');
      expect(Array.isArray(node.children), `${nodeContext}children should be array`).toBe(true);
      expect(
        node.parent === null || typeof node.parent === 'string',
        `${nodeContext}parent should be string or null`
      ).toBe(true);
    }
  },

  /**
   * TreeNode shape (individual canvas entry in tree): {
   *   name: string,
   *   children: string[],
   *   parent: string | null
   * }
   */
  treeNode: (data, context = '') => {
    expect(typeof data.name, `${context}name should be string`).toBe('string');
    expect(Array.isArray(data.children), `${context}children should be array`).toBe(true);
    expect(
      data.parent === null || typeof data.parent === 'string',
      `${context}parent should be string or null`
    ).toBe(true);
  },

  /**
   * Delete success response shape: { success: boolean }
   */
  deleteSuccess: (data, context = '') => {
    expect(typeof data.success, `${context}success should be boolean`).toBe('boolean');
    expect(data.success, `${context}success should be true`).toBe(true);
  },

  /**
   * Error response shape: { error: string }
   */
  error: (data, context = '') => {
    expect(typeof data.error, `${context}error should be string`).toBe('string');
  },
};

/**
 * Default value validators - verify created resources have expected defaults
 */
const defaults = {
  canvas: {
    version: '1.0.0',
    viewBox: { x: 0, y: 0, width: 1920, height: 1080 },
  },

  treeNode: (name) => ({
    name: name || 'New Canvas',
    children: [],
  }),
};

// Save original tree before tests
test.beforeAll(async () => {
  try {
    originalTree = await fs.readFile(TEST_TREE_FILE, 'utf8');
  } catch (e) {
    // File may not exist yet
  }
});

// Cleanup after each test
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

// Restore original tree after all tests
test.afterAll(async () => {
  if (originalTree) {
    await fs.writeFile(TEST_TREE_FILE, originalTree);
  }
});

test.describe('Canvas API Contract Tests', () => {
  test.describe('canvasAPI.get(id)', () => {
    test('returns canvas with correct shape', async ({ request }) => {
      const response = await request.get('/api/canvas/main');
      expect(response.status()).toBe(200);

      const data = await response.json();
      shapes.canvas(data, 'GET /api/canvas/main: ');
    });

    test('returns specific canvas fields correctly', async ({ request }) => {
      const response = await request.get('/api/canvas/main');
      const data = await response.json();

      // Main canvas should have expected values
      expect(data.id).toBe('main');
      expect(data.name).toBe('Main Canvas');
      expect(data.parentId).toBeNull();
    });

    test('returns 404 for non-existent canvas', async ({ request }) => {
      const response = await request.get('/api/canvas/nonexistent-test-canvas-xyz');
      expect(response.status()).toBe(404);

      const data = await response.json();
      shapes.error(data, 'GET non-existent canvas: ');
    });
  });

  test.describe('canvasAPI.create(name, parentId)', () => {
    test('creates canvas with correct shape', async ({ request }) => {
      const response = await request.post('/api/canvas', {
        data: { name: 'Contract Test Canvas' },
      });
      expect(response.status()).toBe(200);

      const data = await response.json();
      shapes.canvas(data, 'POST /api/canvas: ');
      createdCanvases.push(data.id);
    });

    test('creates canvas with expected defaults', async ({ request }) => {
      const response = await request.post('/api/canvas', {
        data: { name: 'Default Test Canvas' },
      });
      const data = await response.json();
      createdCanvases.push(data.id);

      // Verify defaults match contract
      expect(data.version).toBe(defaults.canvas.version);
      expect(data.viewBox).toEqual(defaults.canvas.viewBox);
      expect(data.elements).toEqual([]);
      expect(data.parentId).toBeNull();
    });

    test('creates canvas with provided name', async ({ request }) => {
      const testName = 'My Custom Canvas Name';
      const response = await request.post('/api/canvas', {
        data: { name: testName },
      });
      const data = await response.json();
      createdCanvases.push(data.id);

      expect(data.name).toBe(testName);
    });

    test('creates canvas with parent ID when provided', async ({ request }) => {
      const response = await request.post('/api/canvas', {
        data: { name: 'Child Test Canvas', parentId: 'main' },
      });
      const data = await response.json();
      createdCanvases.push(data.id);

      expect(data.parentId).toBe('main');
    });

    test('generates unique UUID for canvas ID', async ({ request }) => {
      const response1 = await request.post('/api/canvas', { data: { name: 'Canvas 1' } });
      const data1 = await response1.json();
      createdCanvases.push(data1.id);

      const response2 = await request.post('/api/canvas', { data: { name: 'Canvas 2' } });
      const data2 = await response2.json();
      createdCanvases.push(data2.id);

      // IDs should be different
      expect(data1.id).not.toBe(data2.id);

      // IDs should look like UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(data1.id).toMatch(uuidRegex);
      expect(data2.id).toMatch(uuidRegex);
    });

    test('sets created and modified timestamps', async ({ request }) => {
      const beforeCreate = new Date().toISOString();
      const response = await request.post('/api/canvas', { data: { name: 'Timestamp Test' } });
      const afterCreate = new Date().toISOString();
      const data = await response.json();
      createdCanvases.push(data.id);

      // Timestamps should be valid ISO dates
      expect(() => new Date(data.created)).not.toThrow();
      expect(() => new Date(data.modified)).not.toThrow();

      // Timestamps should be approximately now (within test window)
      const createdDate = new Date(data.created);
      expect(createdDate >= new Date(beforeCreate)).toBe(true);
      expect(createdDate <= new Date(afterCreate)).toBe(true);
    });
  });

  test.describe('canvasAPI.update(id, data)', () => {
    test('updates canvas and preserves shape', async ({ request }) => {
      // Create canvas first
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Update Test Canvas' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Update it
      const updateResponse = await request.put(`/api/canvas/${created.id}`, {
        data: {
          ...created,
          name: 'Updated Name',
        },
      });
      expect(updateResponse.status()).toBe(200);

      const updated = await updateResponse.json();
      shapes.canvas(updated, 'PUT /api/canvas/:id: ');
    });

    test('preserves unchanged fields during update', async ({ request }) => {
      // Create canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Preserve Test Canvas', parentId: 'main' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Update only the name
      const updateResponse = await request.put(`/api/canvas/${created.id}`, {
        data: {
          ...created,
          name: 'New Name Only',
        },
      });
      const updated = await updateResponse.json();

      // Original fields should be preserved
      expect(updated.id).toBe(created.id);
      expect(updated.parentId).toBe('main');
      expect(updated.viewBox).toEqual(created.viewBox);
      expect(updated.created).toBe(created.created);
    });

    test('updates modified timestamp on save', async ({ request }) => {
      // Create canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Modified Time Test' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update it
      const updateResponse = await request.put(`/api/canvas/${created.id}`, {
        data: { ...created, name: 'Modified' },
      });
      const updated = await updateResponse.json();

      // Modified should be updated (later than created)
      const createdTime = new Date(created.modified);
      const updatedTime = new Date(updated.modified);
      expect(updatedTime >= createdTime).toBe(true);
    });

    test('updates elements array', async ({ request }) => {
      // Create canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Elements Test Canvas' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      const testElements = [
        { type: 'image', id: 'img-1', x: 100, y: 200 },
        { type: 'folder', id: 'folder-1', x: 300, y: 400 },
      ];

      // Update with elements
      const updateResponse = await request.put(`/api/canvas/${created.id}`, {
        data: { ...created, elements: testElements },
      });
      const updated = await updateResponse.json();

      expect(updated.elements).toEqual(testElements);
    });
  });

  test.describe('canvasAPI.delete(id)', () => {
    test('deletes canvas and returns success shape', async ({ request }) => {
      // Create canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Delete Test Canvas' },
      });
      const created = await createResponse.json();

      // Delete it (don't add to cleanup since we're deleting)
      const deleteResponse = await request.delete(`/api/canvas/${created.id}`);
      expect(deleteResponse.status()).toBe(200);

      const data = await deleteResponse.json();
      shapes.deleteSuccess(data, 'DELETE /api/canvas/:id: ');
    });

    test('canvas is no longer accessible after delete', async ({ request }) => {
      // Create canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Verify Delete Canvas' },
      });
      const created = await createResponse.json();

      // Delete it
      await request.delete(`/api/canvas/${created.id}`);

      // Try to get it
      const getResponse = await request.get(`/api/canvas/${created.id}`);
      expect(getResponse.status()).toBe(404);
    });

    test('returns 404 for non-existent canvas', async ({ request }) => {
      const response = await request.delete('/api/canvas/nonexistent-delete-test-xyz');
      expect(response.status()).toBe(404);
    });
  });
});

// Run tree tests serially to avoid race conditions from parallel tree modifications
test.describe.serial('Tree API Contract Tests', () => {
  test.describe('treeAPI.get()', () => {
    test('returns tree with correct shape', async ({ request }) => {
      const response = await request.get('/api/tree');
      expect(response.status()).toBe(200);

      const data = await response.json();
      shapes.tree(data, 'GET /api/tree: ');
    });

    test('tree contains main canvas by default', async ({ request }) => {
      const response = await request.get('/api/tree');
      const data = await response.json();

      expect(data.rootCanvases).toContain('main');
      expect(data.canvases.main).toBeDefined();
      expect(data.canvases.main.name).toBe('Main Canvas');
    });
  });

  test.describe('treeAPI.update(treeData)', () => {
    test('updates tree and returns correct shape', async ({ request }) => {
      // Get current tree
      const getResponse = await request.get('/api/tree');
      const currentTree = await getResponse.json();

      // Update with same data (to not break anything)
      const updateResponse = await request.put('/api/tree', {
        data: currentTree,
      });
      expect(updateResponse.status()).toBe(200);

      const updated = await updateResponse.json();
      shapes.tree(updated, 'PUT /api/tree: ');
    });

    test('persists tree changes', async ({ request }) => {
      // Get current tree
      const getResponse = await request.get('/api/tree');
      const currentTree = await getResponse.json();

      // Add a test canvas to tree
      const testCanvasId = 'test-tree-update-' + Date.now();
      const modifiedTree = {
        ...currentTree,
        canvases: {
          ...currentTree.canvases,
          [testCanvasId]: {
            name: 'Test Tree Update Canvas',
            children: [],
            parent: null,
          },
        },
        rootCanvases: [...currentTree.rootCanvases, testCanvasId],
      };

      // Update tree
      await request.put('/api/tree', { data: modifiedTree });

      // Verify it persisted
      const verifyResponse = await request.get('/api/tree');
      const verifyTree = await verifyResponse.json();

      expect(verifyTree.canvases[testCanvasId]).toBeDefined();
      expect(verifyTree.rootCanvases).toContain(testCanvasId);
    });
  });

  test.describe('treeAPI.addCanvas(canvasId, parentId, name)', () => {
    test('adds canvas to tree with correct shape', async ({ request }) => {
      // Create a canvas first
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Tree Add Test Canvas' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Add to tree
      const treeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'Tree Add Test Canvas' },
      });
      expect(treeResponse.status()).toBe(200);

      const treeData = await treeResponse.json();
      shapes.tree(treeData, 'POST /api/tree/canvas: ');

      // Clean up from tree
      await request.delete(`/api/tree/canvas/${created.id}`);
    });

    test('adds canvas as root when no parent specified', async ({ request }) => {
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Root Canvas Test' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Add to tree without parent
      const treeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'Root Canvas Test' },
      });
      const treeData = await treeResponse.json();

      // Should be in rootCanvases
      expect(treeData.rootCanvases).toContain(created.id);
      // Node should have null parent
      expect(treeData.canvases[created.id].parent).toBeNull();

      // Clean up
      await request.delete(`/api/tree/canvas/${created.id}`);
    });

    test('adds canvas as child when parent specified', async ({ request }) => {
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Child Canvas Test', parentId: 'main' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Add to tree with parent
      const treeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, parentId: 'main', name: 'Child Canvas Test' },
      });
      const treeData = await treeResponse.json();

      // Should NOT be in rootCanvases
      expect(treeData.rootCanvases).not.toContain(created.id);
      // Node should have correct parent
      expect(treeData.canvases[created.id].parent).toBe('main');
      // Parent should have this as child
      expect(treeData.canvases.main.children).toContain(created.id);

      // Clean up
      await request.delete(`/api/tree/canvas/${created.id}`);
    });

    test('created tree node has correct defaults', async ({ request }) => {
      const testName = 'Default Node Test';
      const createResponse = await request.post('/api/canvas', {
        data: { name: testName },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Add to tree
      const treeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: testName },
      });
      const treeData = await treeResponse.json();

      const node = treeData.canvases[created.id];
      shapes.treeNode(node, `treeAPI.addCanvas node: `);

      // Verify defaults
      expect(node.name).toBe(testName);
      expect(node.children).toEqual([]);

      // Clean up
      await request.delete(`/api/tree/canvas/${created.id}`);
    });

    test('does not duplicate canvas in rootCanvases', async ({ request }) => {
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'No Duplicate Test' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Add to tree twice
      await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'No Duplicate Test' },
      });
      const treeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'No Duplicate Test' },
      });
      const treeData = await treeResponse.json();

      // Count occurrences in rootCanvases
      const count = treeData.rootCanvases.filter((id) => id === created.id).length;
      expect(count).toBe(1);

      // Clean up
      await request.delete(`/api/tree/canvas/${created.id}`);
    });
  });

  test.describe('treeAPI.removeCanvas(canvasId)', () => {
    test('removes canvas from tree and returns correct shape', async ({ request }) => {
      // Create and add canvas
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Remove Test Canvas' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'Remove Test Canvas' },
      });

      // Remove from tree
      const removeResponse = await request.delete(`/api/tree/canvas/${created.id}`);
      expect(removeResponse.status()).toBe(200);

      const treeData = await removeResponse.json();
      shapes.tree(treeData, 'DELETE /api/tree/canvas/:id: ');
    });

    test('canvas is removed from rootCanvases', async ({ request }) => {
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Root Remove Test' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, name: 'Root Remove Test' },
      });

      // Remove
      const removeResponse = await request.delete(`/api/tree/canvas/${created.id}`);
      const treeData = await removeResponse.json();

      expect(treeData.rootCanvases).not.toContain(created.id);
      expect(treeData.canvases[created.id]).toBeUndefined();
    });

    test('canvas is removed from parent children', async ({ request }) => {
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Child Remove Test', parentId: 'main' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      const addTreeResponse = await request.post('/api/tree/canvas', {
        data: { canvasId: created.id, parentId: 'main', name: 'Child Remove Test' },
      });
      const beforeTree = await addTreeResponse.json();

      // Verify it's in parent's children (use the returned tree from POST)
      expect(beforeTree.canvases.main.children).toContain(created.id);

      // Remove
      const removeResponse = await request.delete(`/api/tree/canvas/${created.id}`);
      const afterTree = await removeResponse.json();

      expect(afterTree.canvases.main.children).not.toContain(created.id);
    });

    test('orphaned children are re-parented to grandparent', async ({ request }) => {
      // Create parent canvas
      const parentResponse = await request.post('/api/canvas', {
        data: { name: 'Orphan Parent Test' },
      });
      const parent = await parentResponse.json();
      createdCanvases.push(parent.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: parent.id, name: 'Orphan Parent Test' },
      });

      // Create child canvas
      const childResponse = await request.post('/api/canvas', {
        data: { name: 'Orphan Child Test', parentId: parent.id },
      });
      const child = await childResponse.json();
      createdCanvases.push(child.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: child.id, parentId: parent.id, name: 'Orphan Child Test' },
      });

      // Remove parent - child should become root
      const removeResponse = await request.delete(`/api/tree/canvas/${parent.id}`);
      const treeData = await removeResponse.json();

      // Child should now be a root canvas
      expect(treeData.rootCanvases).toContain(child.id);
      expect(treeData.canvases[child.id].parent).toBeNull();

      // Clean up
      await request.delete(`/api/tree/canvas/${child.id}`);
    });

    test('orphaned children are re-parented to existing parent', async ({ request }) => {
      // Create child of main
      const parentResponse = await request.post('/api/canvas', {
        data: { name: 'Middle Parent Test', parentId: 'main' },
      });
      const middleParent = await parentResponse.json();
      createdCanvases.push(middleParent.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: middleParent.id, parentId: 'main', name: 'Middle Parent Test' },
      });

      // Create grandchild
      const childResponse = await request.post('/api/canvas', {
        data: { name: 'Grandchild Test', parentId: middleParent.id },
      });
      const grandchild = await childResponse.json();
      createdCanvases.push(grandchild.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: grandchild.id, parentId: middleParent.id, name: 'Grandchild Test' },
      });

      // Remove middle parent - grandchild should move to main
      const removeResponse = await request.delete(`/api/tree/canvas/${middleParent.id}`);
      const treeData = await removeResponse.json();

      // Grandchild should now be a child of main
      expect(treeData.canvases[grandchild.id].parent).toBe('main');
      expect(treeData.canvases.main.children).toContain(grandchild.id);

      // Clean up
      await request.delete(`/api/tree/canvas/${grandchild.id}`);
    });

    test('returns 404 for non-existent canvas', async ({ request }) => {
      const response = await request.delete('/api/tree/canvas/nonexistent-tree-remove-xyz');
      expect(response.status()).toBe(404);
    });
  });
});

// Run parity tests serially since they depend on tree state
test.describe.serial('API Parity Verification', () => {
  test.describe('Canvas lifecycle parity', () => {
    test('full CRUD cycle produces consistent results', async ({ request }) => {
      // CREATE
      const createResponse = await request.post('/api/canvas', {
        data: { name: 'Lifecycle Test', parentId: 'main' },
      });
      const created = await createResponse.json();
      createdCanvases.push(created.id);

      // Verify create shape
      shapes.canvas(created, 'Lifecycle CREATE: ');
      expect(created.name).toBe('Lifecycle Test');
      expect(created.parentId).toBe('main');

      // READ
      const getResponse = await request.get(`/api/canvas/${created.id}`);
      const fetched = await getResponse.json();

      // Verify read matches create (excluding modified which may differ)
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(created.name);
      expect(fetched.parentId).toBe(created.parentId);
      expect(fetched.version).toBe(created.version);
      expect(fetched.viewBox).toEqual(created.viewBox);
      expect(fetched.elements).toEqual(created.elements);

      // UPDATE
      const updateResponse = await request.put(`/api/canvas/${created.id}`, {
        data: {
          ...fetched,
          name: 'Updated Lifecycle Test',
          elements: [{ type: 'test', id: 'test-1' }],
        },
      });
      const updated = await updateResponse.json();

      // Verify update shape
      shapes.canvas(updated, 'Lifecycle UPDATE: ');
      expect(updated.name).toBe('Updated Lifecycle Test');
      expect(updated.elements).toEqual([{ type: 'test', id: 'test-1' }]);

      // Verify update persisted
      const verifyResponse = await request.get(`/api/canvas/${created.id}`);
      const verified = await verifyResponse.json();
      expect(verified.name).toBe('Updated Lifecycle Test');

      // DELETE
      const deleteResponse = await request.delete(`/api/canvas/${created.id}`);
      const deleted = await deleteResponse.json();

      shapes.deleteSuccess(deleted, 'Lifecycle DELETE: ');

      // Remove from cleanup since we deleted
      createdCanvases.pop();

      // Verify delete
      const notFoundResponse = await request.get(`/api/canvas/${created.id}`);
      expect(notFoundResponse.status()).toBe(404);
    });
  });

  test.describe('Tree operations parity', () => {
    test('tree reflects canvas hierarchy correctly', async ({ request }) => {
      // Create parent
      const parentResponse = await request.post('/api/canvas', {
        data: { name: 'Hierarchy Parent' },
      });
      const parent = await parentResponse.json();
      createdCanvases.push(parent.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: parent.id, name: 'Hierarchy Parent' },
      });

      // Create child
      const childResponse = await request.post('/api/canvas', {
        data: { name: 'Hierarchy Child', parentId: parent.id },
      });
      const child = await childResponse.json();
      createdCanvases.push(child.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: child.id, parentId: parent.id, name: 'Hierarchy Child' },
      });

      // Create grandchild
      const grandchildResponse = await request.post('/api/canvas', {
        data: { name: 'Hierarchy Grandchild', parentId: child.id },
      });
      const grandchild = await grandchildResponse.json();
      createdCanvases.push(grandchild.id);

      await request.post('/api/tree/canvas', {
        data: { canvasId: grandchild.id, parentId: child.id, name: 'Hierarchy Grandchild' },
      });

      // Verify tree structure
      const treeResponse = await request.get('/api/tree');
      const tree = await treeResponse.json();

      // Parent should be root
      expect(tree.rootCanvases).toContain(parent.id);
      expect(tree.canvases[parent.id].parent).toBeNull();
      expect(tree.canvases[parent.id].children).toContain(child.id);

      // Child should have parent and child
      expect(tree.canvases[child.id].parent).toBe(parent.id);
      expect(tree.canvases[child.id].children).toContain(grandchild.id);

      // Grandchild should have parent, no children
      expect(tree.canvases[grandchild.id].parent).toBe(child.id);
      expect(tree.canvases[grandchild.id].children).toEqual([]);

      // Clean up in reverse order
      await request.delete(`/api/tree/canvas/${grandchild.id}`);
      await request.delete(`/api/tree/canvas/${child.id}`);
      await request.delete(`/api/tree/canvas/${parent.id}`);
    });
  });
});
