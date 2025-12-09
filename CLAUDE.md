# CLAUDE.md

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Server Management
- `npm start` - Start the server on port 3001 (production mode)
- `npm run dev` - Start the server in development mode (same as start)
- Server serves on `http://0.0.0.0:3001` and accepts connections from other devices

### Testing
- Uses Playwright for browser automation tests
- Run individual test files: `node test-[name].js` (e.g., `node test-visit.js`)
- Tests are not integrated into npm scripts; must be run manually
- Test files include: visit, upload, resize, hierarchy, breadcrumb, folder-nav functionality

### Project Structure

```
server/
  app.js                # Main Express server with canvas CRUD API
  routes/files.js       # Image upload handling (multer + UUID)
  routes/tree.js        # Canvas tree/hierarchy management
  storage/              # File-based persistence
    canvases/           # JSON canvas definitions
    images/             # Uploaded image files
    tree.json           # Canvas hierarchy structure

public/
  index.html            # Main application page
  css/main.css          # Application styles
  js/                   # Frontend JavaScript modules (32 files)
    # Core canvas
    canvas-core.js      # Canvas init, loading, panning, zooming, autosave
    canvas-elements.js  # Element creation (images, folders, rectangles)
    canvas-resize.js    # Resize handle creation and interaction
    selection.js        # Single/multi-element selection management

    # User interaction
    drag-drop.js        # File upload & drag-and-drop handling
    touch.js            # Mobile/tablet touch & gesture support
    context-menu.js     # Right-click context menus
    keyboard-shortcuts.js # Canvas keyboard shortcuts
    keyboard-help.js    # ? key help overlay

    # Element operations
    transform.js        # Flip, rotation, transforms
    z-order.js          # Element stacking (bring to front, etc.)
    grouping.js         # Group/ungroup multiple elements
    alignment.js        # Align & distribute selected elements
    clipboard.js        # Copy/paste of canvas elements
    undo-redo.js        # Undo/redo with state snapshots

    # Visual tools
    zoom-controls.js    # Zoom to fit, zoom to selection, reset
    grid-snap.js        # Visual grid & snap-to-grid positioning
    ruler-guides.js     # Rulers & draggable alignment guides
    drawing-tools.js    # Rectangle/line drawing tools
    image-filters.js    # Non-destructive image filters (CSS)
    color-manager.js    # Color palette & tool selection

    # UI panels
    tree-nav.js         # Sidebar tree navigation & canvas switching
    layers-panel.js     # Element list with reordering & visibility
    element-notes.js    # Attach text notes to elements
    element-tooltip.js  # Dimension/position tooltips on hover
    toolbar-scale.js    # HiDPI toolbar scaling (1x/1.5x/2x)

    # Import/export
    export.js           # Canvas export (PNG/SVG/JSON/clipboard)

    # Tauri integration
    tauri-api.js        # Unified API for Tauri backend
    api-adapter.js      # Backend adapter (Tauri vs Express)
    tauri-file-drop.js  # Tauri-specific file drop events
    console-logger.js   # Console logging to Tauri backend

    # Configuration
    config.js           # Centralized app configuration constants
```

## Architecture Overview

**Vision Board Application**: Web-based canvas tool for organizing images and creating hierarchical boards

### Core Technologies
- **Backend**: Express.js server with file-based JSON storage
- **Frontend**: Vanilla JavaScript + SVG.js for canvas manipulation
- **File Handling**: Multer for uploads, UUID for unique naming
- **Canvas System**: Hierarchical canvases with parent/child relationships

### Key Architectural Patterns

#### Canvas Data Model
- Each canvas stored as individual JSON file in `server/storage/canvases/`
- Canvas structure: `{ id, name, parentId, elements[], viewBox, created, modified }`
- Elements include images and folder objects that link to child canvases
- Tree hierarchy maintained separately in `tree.json`

#### API Design
- RESTful canvas operations: GET/POST/PUT/DELETE `/api/canvas/:id`
- Tree management: `/api/tree` endpoints for hierarchy operations
- Image serving: `/api/images/:filename` for uploaded files
- File upload: `/api/upload` and `/api/upload-multiple`

#### Frontend Architecture
- SVG.js handles canvas rendering and element interactions
- 32 modular JavaScript files organized by responsibility (see Project Structure)
- Element selection/dragging system with resize handles
- Real-time canvas updates with auto-save functionality
- Tauri integration layer for desktop app with backend adapter pattern

### Storage Strategy
- File-based persistence in `server/storage/` directory
- Images stored with UUID filenames to prevent conflicts
- Canvas definitions stored as formatted JSON for readability
- Tree structure cached for performance during navigation

### Canvas Element System
- **Images**: Positioned rectangles with drag/resize/rotation support
- **Folders**: Special elements that link to child canvases for navigation
- **Selection System**: Click to select, drag to move, corner handles for resize
- **Auto-save**: Debounced saves prevent data loss during editing

### Navigation Features
- Sidebar tree navigator with expand/collapse functionality
- Breadcrumb navigation showing current canvas path
- Canvas switching without page reload
- Parent/child canvas relationships with folder objects

## Development Notes

- Default canvas "main" is created automatically on first server start
- Server accepts connections from network devices for mobile testing
- No build process required; serves static files directly
- Uses SVG.js v2.7.1 from CDN
- Touch interactions optimized for iPad/tablet usage
- File uploads limited to 10MB with image type validation

### SVG.js v2.7.1 API Notes

**Element Property and Attribute Management:**
- SVG elements don't support arbitrary properties (e.g., `element.customProp = value` fails silently)
- Use `element.attr('key', value)` and `element.attr('key')` instead of `setAttribute`/`getAttribute`
- For element associations, use data attributes: `element.attr('data-custom-id', id)`

**Element Selection:**
- `canvas.select('#id')` can be unreliable for finding elements by ID
- Use `document.getElementById(id)` for more reliable element retrieval
- Mix SVG.js and DOM methods when needed: `document.getElementById(id).classList.add('class')`

**Event Handling:**
- Both `.on('event', handler)` and `.mouseover(handler)` work
- `.on('event', handler)` is more consistent across different element types
- Event propagation works normally with `event.stopPropagation()`

**Class Management:**
- SVG.js: `.addClass('class')` and `.removeClass('class')`
- DOM: `element.classList.add('class')` and `element.classList.remove('class')`
- Both approaches work; mixing them can provide better reliability

**Common Patterns:**
- Store references using data attributes rather than object properties
- Use DOM methods for class manipulation when SVG.js selection fails
- Combine SVG.js convenience methods with raw DOM access for complex operations
- You can see the log for this tauri app here /home/andy/.local/share/com.visionboard.app/logs/tauri.log