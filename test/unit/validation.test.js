const { test, describe } = require('node:test');
const assert = require('node:assert');
const { isValidCanvasId, isValidFilename } = require('../../server/middleware/validation');

describe('isValidCanvasId', () => {
  test('accepts "main" as valid', () => {
    assert.strictEqual(isValidCanvasId('main'), true);
  });

  test('accepts valid UUIDs', () => {
    assert.strictEqual(isValidCanvasId('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.strictEqual(isValidCanvasId('123e4567-E89B-12D3-A456-426614174000'), true);
  });

  test('accepts safe alphanumeric IDs', () => {
    assert.strictEqual(isValidCanvasId('my-canvas'), true);
    assert.strictEqual(isValidCanvasId('canvas_123'), true);
    assert.strictEqual(isValidCanvasId('TestCanvas'), true);
  });

  test('rejects path traversal attempts', () => {
    assert.strictEqual(isValidCanvasId('../etc/passwd'), false);
    assert.strictEqual(isValidCanvasId('..'), false);
    assert.strictEqual(isValidCanvasId('foo/../bar'), false);
  });

  test('rejects invalid characters', () => {
    assert.strictEqual(isValidCanvasId('canvas/test'), false);
    assert.strictEqual(isValidCanvasId('canvas\\test'), false);
    assert.strictEqual(isValidCanvasId('canvas.json'), false);
    assert.strictEqual(isValidCanvasId('canvas:test'), false);
  });

  test('rejects empty or null values', () => {
    assert.strictEqual(isValidCanvasId(''), false);
    assert.strictEqual(isValidCanvasId(null), false);
    assert.strictEqual(isValidCanvasId(undefined), false);
  });

  test('rejects excessively long IDs', () => {
    assert.strictEqual(isValidCanvasId('a'.repeat(65)), false);
  });
});

describe('isValidFilename', () => {
  test('accepts valid image filenames', () => {
    assert.strictEqual(isValidFilename('550e8400-e29b-41d4-a716-446655440000.png'), true);
    assert.strictEqual(isValidFilename('image-123.jpg'), true);
    assert.strictEqual(isValidFilename('test_file.gif'), true);
  });

  test('rejects path traversal attempts', () => {
    assert.strictEqual(isValidFilename('../etc/passwd'), false);
    assert.strictEqual(isValidFilename('..'), false);
    assert.strictEqual(isValidFilename('foo/bar.png'), false);
    assert.strictEqual(isValidFilename('foo\\bar.png'), false);
  });

  test('rejects filenames without extensions', () => {
    assert.strictEqual(isValidFilename('noextension'), false);
  });

  test('rejects empty or null values', () => {
    assert.strictEqual(isValidFilename(''), false);
    assert.strictEqual(isValidFilename(null), false);
    assert.strictEqual(isValidFilename(undefined), false);
  });

  test('rejects excessively long filenames', () => {
    assert.strictEqual(isValidFilename('a'.repeat(256) + '.png'), false);
  });
});
