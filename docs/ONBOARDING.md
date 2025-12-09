# Vision Board Developer Onboarding

Welcome to the Vision Board project! This guide will help you understand the codebase and start contributing.

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3001
```

## What is Vision Board?

A web-based canvas tool for organizing images into hierarchical boards. Think of it as an infinite whiteboard where you can:

- Drop images and arrange them freely
- Create nested canvases (folders) for organization
- Draw shapes and annotations
- Export to PNG or JSON

## Technology Stack

```d2
direction: right

stack: "Tech Stack" {
  backend: Backend {
    express: "Express.js v5"
    multer: "Multer (uploads)"
    uuid: "UUID (file naming)"
  }

  frontend: Frontend {
    vanilla: "Vanilla JS"
    svg: "SVG.js v2.7.1"
    css: "Plain CSS"
  }

  storage: Storage {
    json: "JSON files"
    images: "Image files"
  }

  desktop: "Desktop (Optional)" {
    tauri: "Tauri v2"
  }
}
```

## Project Layout

```
visionboard/
├── server/
│   ├── app.js              # Express server (start here!)
│   ├── routes/
│   │   ├── files.js        # Image upload endpoints
│   │   └── tree.js         # Canvas hierarchy endpoints
│   └── storage/            # Data lives here
│       ├── canvases/       # One JSON per canvas
│       ├── images/         # Uploaded images
│       └── tree.json       # Navigation structure
│
├── public/
│   ├── index.html          # Single page app
│   ├── css/main.css        # All styles
│   └── js/                 # 32 modular JS files
│       ├── canvas-core.js  # Canvas init, loading, panning, zoom
│       ├── canvas-elements.js # Element creation & interaction
│       ├── canvas-resize.js # Resize handles
│       ├── selection.js    # Single/multi-select management
│       ├── context-menu.js # Right-click context menus
│       ├── api-adapter.js  # Web/Tauri API layer
│       ├── tree-nav.js     # Sidebar navigation
│       ├── layers-panel.js # Layer list & reordering
│       ├── undo-redo.js    # Undo/redo state management
│       └── ... (see CLAUDE.md for full list)
│
├── src-tauri/              # Desktop app config
└── docs/                   # You are here
```

## Core Concepts

### 1. Canvas

A canvas is a single board containing elements (images, folders, shapes).

```d2
canvas: Canvas {
  metadata: Metadata {
    id
    name
    parentId
  }
  elements: "Elements[]" {
    images
    folders
    rectangles
  }
  viewBox: ViewBox {
    position
    zoom
  }
}
```

Stored as JSON in `server/storage/canvases/{id}.json`

### 2. Elements

Three element types exist on a canvas:

```d2
direction: right

image: Image {
  shape: rectangle
  style.fill: "#e3f2fd"
  label: "Draggable image\nwith resize handles"
}

folder: Folder {
  shape: rectangle
  style.fill: "#fff3e0"
  label: "Links to child canvas\nDouble-click to navigate"
}

rect: Rectangle {
  shape: rectangle
  style.fill: "#f3e5f5"
  label: "Drawn shape\nCustom fill/stroke"
}
```

### 3. Tree Hierarchy

Canvases form a tree structure for navigation:

```d2
direction: down

main: "Main Board" {
  style.fill: "#e8f5e9"
}

proj: Projects
photos: Photos
archive: Archive

proj_a: "Project A"
proj_b: "Project B"

main -> proj
main -> photos
main -> archive
proj -> proj_a
proj -> proj_b
```

Stored in `server/storage/tree.json`

## Key Files to Understand

### 1. `server/app.js` - Backend Entry Point

```javascript
// Main routes:
app.get('/api/canvas/:id', ...)    // Load canvas
app.put('/api/canvas/:id', ...)    // Save canvas
app.post('/api/upload', ...)       // Upload image
```

### 2. `public/js/canvas-core.js` - Canvas Core

The heart of the application - handles canvas lifecycle:

```javascript
initializeCanvas()      // Create SVG.js canvas
loadCanvas(id)          // Fetch and render a canvas
renderCanvas()          // Draw all elements
scheduleAutoSave()      // Debounced persistence
```

### 3. `public/js/canvas-elements.js` - Element Interactions

Handles element creation and drag behavior:

```javascript
addImageToCanvas()       // Add image element
addFolderToCanvas()      // Add folder element
makeElementInteractive() // Add drag/resize behavior
```

### 4. `public/js/selection.js` - Selection Management

Shared selection state for single/multi-select:

```javascript
selectElement(el)        // Select single element
getSelectedElements()    // Get all selected elements
clearSelection()         // Deselect everything
```

### 5. `public/js/context-menu.js` - Right-Click Menus

Context menus for all element types and canvas background:

```javascript
showContextMenu()        // Display menu at position
handleContextMenuAction() // Execute menu actions
```

### 6. `public/js/api-adapter.js` - API Layer

Unified interface for web and Tauri:

```javascript
// Detects environment automatically
const isTauri = window.__TAURI__ !== undefined;

// Same API regardless of backend:
canvasAPI.get(id)
canvasAPI.update(id, data)
imageAPI.upload(file)
treeAPI.get()
```

### 7. `public/js/tree-nav.js` - Navigation

Handles sidebar and breadcrumbs:

```javascript
loadTreeData()          // Fetch tree structure
renderTree()            // Build sidebar DOM
switchToCanvas(id)      // Navigate to canvas
updateBreadcrumb()      // Show path
```

## Common Development Tasks

### Adding a New Element Type

1. Define element structure in canvas data model
2. Add rendering in `canvas-core.js` → `renderCanvas()`
3. Add interaction in `canvas-elements.js` → `makeElementInteractive()`
4. Handle persistence in save/load cycle

### Adding a New API Endpoint

1. Add route in `server/app.js` or create route file in `server/routes/`
2. Add corresponding method in `public/js/api-adapter.js`
3. Both web (fetch) and Tauri (invoke) paths needed

### Modifying the Canvas Interaction

Interaction logic is split across several modules:

- **Selection**: `selection.js` - selectElement(), getSelectedElements()
- **Dragging**: `canvas-elements.js` - makeElementInteractive()
- **Resizing**: `canvas-resize.js` - createResizeHandles()
- **Panning/Zoom**: `canvas-core.js` - setupCanvasPanning()
- **Context menus**: `context-menu.js` - showContextMenu()
- **Undo/Redo**: `undo-redo.js` - recordState(), undo(), redo()

## Interaction Flow

```d2
direction: down

user: "User clicks element" {
  shape: parallelogram
}

delegate: "Event delegation in reattachEventListeners()" {
  shape: rectangle
}

find: "Find SVG.js element by ID" {
  shape: rectangle
}

select: "selectElement()" {
  shape: rectangle
  style.fill: "#c8e6c9"
}

handles: "Create resize handles" {
  shape: rectangle
}

drag: "Setup drag listeners" {
  shape: rectangle
}

user -> delegate
delegate -> find
find -> select
select -> handles
select -> drag
```

## Auto-Save Flow

```d2
direction: right

change: "Element changed" {
  shape: parallelogram
}

schedule: "scheduleAutoSave()" {
  shape: rectangle
  label: "Debounce 2s"
}

save: "saveCanvas()" {
  shape: rectangle
}

api: "canvasAPI.update()" {
  shape: rectangle
}

notify: "Show notification" {
  shape: rectangle
  style.fill: "#c8e6c9"
}

change -> schedule
schedule -> save: "after 2s"
save -> api
api -> notify
```

## Debugging Tips

### Browser DevTools

- Canvas state: `window.currentCanvas`
- SVG canvas: `window.canvas` (via canvasCore)
- Selected elements: `window.selectionAPI.getSelectedElements()`
- Tree data: Access via tree-nav module

### Tauri Logs

Desktop app logs to:
```
~/.local/share/com.visionboard.app/logs/tauri.log
```

### Common Issues

1. **Element not selectable**: Check `reattachEventListeners()` is called after render
2. **Save not working**: Check network tab for API errors
3. **Resize handles misaligned**: Verify SVG coordinate conversion

## SVG.js v2.7.1 Gotchas

```javascript
// DON'T: Arbitrary properties on elements
element.customProp = value;  // Fails silently!

// DO: Use data attributes
element.attr('data-custom', value);

// DON'T: Rely solely on SVG.js selection
canvas.select('#myid');  // Can be unreliable

// DO: Mix with DOM methods
document.getElementById('myid');

// Both work for classes:
element.addClass('selected');  // SVG.js
element.node.classList.add('selected');  // DOM
```

## Testing

Tests use Playwright for browser automation:

```bash
# Run individual tests
node test-visit.js
node test-upload.js
node test-resize.js
```

Tests are standalone scripts, not integrated with npm test.

## Architecture Decisions

| What | Why |
|------|-----|
| No framework | Simplicity, no build step, fast iteration |
| File-based storage | No DB setup, human-readable, easy backup |
| SVG.js | Mature, lightweight vector graphics |
| Debounced saves | UX balance - responsive yet efficient |
| API adapter pattern | Same code for web and desktop |

## Next Steps

1. Run the app locally and explore the UI
2. Read `canvas-core.js` and `canvas-elements.js` - they're the heart
3. Try adding a simple feature (e.g., element rotation UI)
4. Check `ARCHITECTURE.md` for detailed diagrams
5. See `CLAUDE.md` for the full list of 32 JS modules

## Questions?

Check the existing code for patterns. The codebase is intentionally simple and readable - when in doubt, grep for similar functionality.
