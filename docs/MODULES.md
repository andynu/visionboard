# Vision Board JavaScript Modules

Quick reference for all 32 frontend JavaScript modules in `public/js/`.

## Core

| Module | Description |
|--------|-------------|
| `canvas-core.js` | Canvas initialization, loading, rendering, panning, zooming, and autosave |
| `canvas-elements.js` | Element creation (images, folders, rectangles) and drag interaction |
| `canvas-resize.js` | Resize handle creation, positioning, and resize interaction |
| `selection.js` | Single and multi-element selection state management |
| `config.js` | Centralized application configuration constants |

## User Interaction

| Module | Description |
|--------|-------------|
| `context-menu.js` | Right-click context menus for all element types and canvas background |
| `drag-drop.js` | File upload via drag-and-drop and file input |
| `touch.js` | Mobile/tablet touch and pinch-to-zoom gesture support |
| `keyboard-shortcuts.js` | Canvas keyboard shortcuts (select all, delete, etc.) |
| `keyboard-help.js` | `?` key help overlay showing all keyboard shortcuts |

## Element Operations

| Module | Description |
|--------|-------------|
| `transform.js` | Element flip (horizontal/vertical) and rotation transforms |
| `z-order.js` | Element stacking order (bring to front, send to back, etc.) |
| `grouping.js` | Group and ungroup multiple elements for unified transforms |
| `alignment.js` | Align and distribute selected elements |
| `clipboard.js` | Copy, cut, paste, and duplicate of canvas elements |
| `undo-redo.js` | Undo/redo with canvas state snapshots |

## Visual Tools

| Module | Description |
|--------|-------------|
| `zoom-controls.js` | Zoom to fit, zoom to selection, reset view functions |
| `grid-snap.js` | Visual grid overlay and snap-to-grid positioning |
| `ruler-guides.js` | Rulers along canvas edges with draggable alignment guides |
| `drawing-tools.js` | Rectangle, line, and freehand drawing tool framework |
| `image-filters.js` | Non-destructive image filters via CSS (grayscale, brightness, etc.) |
| `color-manager.js` | Color palette selection and current tool state |

## UI Panels

| Module | Description |
|--------|-------------|
| `tree-nav.js` | Sidebar tree navigation, breadcrumbs, and canvas switching |
| `layers-panel.js` | Element list panel with drag reordering and visibility toggles |
| `element-notes.js` | Attach and edit text notes on individual elements |
| `element-tooltip.js` | Show element dimensions and position on hover |
| `toolbar-scale.js` | HiDPI toolbar scaling (1x/1.5x/2x) with keyboard toggle |

## Import/Export

| Module | Description |
|--------|-------------|
| `export.js` | Canvas export to PNG, SVG, JSON, and clipboard |

## Tauri Integration

| Module | Description |
|--------|-------------|
| `api-adapter.js` | Unified API interface that works with both Tauri and Express backends |
| `tauri-api.js` | Tauri-specific API wrapper and invoke helpers |
| `tauri-file-drop.js` | Tauri-specific file drop event handling |
| `console-logger.js` | Intercepts console methods and logs to Tauri backend file |

## Module Dependencies

For detailed module dependency diagrams, see [ARCHITECTURE.md](ARCHITECTURE.md#frontend-module-dependencies).

## Adding a New Module

1. Create the file in `public/js/`
2. Add a comment header describing the module's purpose
3. Include the script in `public/index.html`
4. Update this document with the module description
5. If the module has significant dependencies, update ARCHITECTURE.md diagram
