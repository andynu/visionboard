# Vision Board Architecture

A hierarchical canvas-based image organization application built with Express.js backend and vanilla JavaScript + SVG.js frontend.

## System Overview

```d2
direction: right

user: User {
  shape: person
}

app: "Vision Board Application" {
  frontend: "Frontend (Browser)" {
    html: index.html
    modules: "JS Modules (32 files)" {
      core: "Core (canvas-core, canvas-elements, selection)"
      interact: "Interaction (context-menu, drag-drop, touch)"
      tools: "Tools (drawing, export, undo-redo)"
      ui: "UI (tree-nav, layers-panel)"
    }
    svg: "SVG.js Canvas"
  }

  backend: "Backend Options" {
    express: "Express Server" {
      routes: "API Routes"
      storage: "File Storage"
    }
    tauri: "Tauri Desktop" {
      native: "Native Commands"
      fs: "Local Filesystem"
    }
  }
}

user -> app.frontend: Interact
app.frontend.modules -> app.backend.express.routes: "HTTP API"
app.frontend.modules -> app.backend.tauri.native: "Tauri Invoke"
```

## Directory Structure

```d2
direction: down

root: visionboard/ {
  server: server/ {
    app: app.js {
      tooltip: "Express server entry point"
    }
    routes: routes/ {
      files: files.js
      tree: tree.js
    }
    storage: storage/ {
      canvases: canvases/*.json
      images: images/*
      tree_json: tree.json
    }
  }

  public: public/ {
    index: index.html
    css: css/main.css
    js: "js/ (32 modules)" {
      core: "canvas-core.js, canvas-elements.js"
      resize: "canvas-resize.js, selection.js"
      ui: "context-menu.js, layers-panel.js"
      api: "api-adapter.js, tauri-api.js"
      nav: "tree-nav.js, undo-redo.js"
      more: "... (see CLAUDE.md)"
    }
  }

  tauri: src-tauri/ {
    tooltip: "Tauri desktop app config"
  }
}
```

## Data Flow

```d2
direction: right

# User Actions
action: User Action {
  shape: parallelogram
}

# Frontend Processing
frontend: Frontend {
  handler: Event Handler
  canvas_mod: Canvas Module
  api_layer: API Adapter
}

# Backend Processing
backend: Backend {
  router: Express Router
  controller: Route Handler
  storage: File System
}

# Data Flow
action -> frontend.handler: Click/Drag/Type
frontend.handler -> frontend.canvas_mod: Update State
frontend.canvas_mod -> frontend.api_layer: Save Request
frontend.api_layer -> backend.router: HTTP/Tauri
backend.router -> backend.controller: Route Match
backend.controller -> backend.storage: Read/Write JSON
backend.storage -> backend.controller: Data
backend.controller -> frontend.api_layer: Response
frontend.api_layer -> frontend.canvas_mod: Update View
```

## Canvas Hierarchy Model

```d2
direction: down

tree: "Tree Structure (tree.json)" {
  root: "rootCanvases[]"
  nodes: "canvases {}"
}

main: "main (root)" {
  shape: rectangle
  style.fill: "#e1f5fe"
}

project_a: "Project A" {
  shape: rectangle
}

project_b: "Project B" {
  shape: rectangle
}

designs: Designs {
  shape: rectangle
}

photos: Photos {
  shape: rectangle
}

tree -> main: references
main -> project_a: folder element
main -> project_b: folder element
project_a -> designs: folder element
project_a -> photos: folder element
```

## API Endpoints

```d2
direction: down

api: "API Layer" {
  canvas_api: "Canvas Operations" {
    get: "GET /api/canvas/:id"
    create: "POST /api/canvas"
    update: "PUT /api/canvas/:id"
    delete: "DELETE /api/canvas/:id"
  }

  tree_api: "Tree Operations" {
    get_tree: "GET /api/tree"
    update_tree: "PUT /api/tree"
    add: "POST /api/tree/canvas"
    remove: "DELETE /api/tree/canvas/:id"
    move: "PUT /api/tree/canvas/:id/move"
  }

  file_api: "File Operations" {
    upload: "POST /api/upload"
    upload_multi: "POST /api/upload-multiple"
    serve: "GET /api/images/:filename"
  }
}
```

## Frontend Module Dependencies

```d2
direction: down

# Core Layer
core: "Core Layer" {
  style.fill: "#e3f2fd"

  canvas_core: canvas-core.js {
    tooltip: "Init, loading, panning, zoom, autosave"
  }
  canvas_elem: canvas-elements.js {
    tooltip: "Element creation, drag interaction"
  }
  canvas_resize: canvas-resize.js {
    tooltip: "Resize handles"
  }
  selection: selection.js {
    tooltip: "Single/multi-select state"
  }
  config: config.js {
    tooltip: "App constants"
  }
}

# Interaction Layer
interact: "Interaction Layer" {
  style.fill: "#fff3e0"

  context_menu: context-menu.js {
    tooltip: "Right-click menus"
  }
  drag_drop: drag-drop.js {
    tooltip: "File upload handling"
  }
  touch: touch.js {
    tooltip: "Mobile touch/gesture"
  }
  keyboard: keyboard-shortcuts.js {
    tooltip: "Keyboard handling"
  }
}

# Tools Layer
tools: "Tools Layer" {
  style.fill: "#e8f5e9"

  undo_redo: undo-redo.js {
    tooltip: "State history"
  }
  clipboard: clipboard.js {
    tooltip: "Copy/paste"
  }
  transform: transform.js {
    tooltip: "Flip, rotate"
  }
  z_order: z-order.js {
    tooltip: "Stack order"
  }
  alignment: alignment.js {
    tooltip: "Align/distribute"
  }
  grouping: grouping.js {
    tooltip: "Group elements"
  }
}

# Visual Layer
visual: "Visual Layer" {
  style.fill: "#f3e5f5"

  drawing: drawing-tools.js
  image_filters: image-filters.js
  grid_snap: grid-snap.js
  ruler_guides: ruler-guides.js
  zoom: zoom-controls.js
}

# UI Layer
ui: "UI Layer" {
  style.fill: "#fce4ec"

  tree_nav: tree-nav.js
  layers: layers-panel.js
  tooltip: element-tooltip.js
  notes: element-notes.js
  color: color-manager.js
  export: export.js
}

# API Layer
api: "API Layer" {
  style.fill: "#c8e6c9"

  adapter: api-adapter.js
  tauri: tauri-api.js
  tauri_drop: tauri-file-drop.js
}

# Key Dependencies
core.canvas_elem -> core.selection: uses
core.canvas_elem -> core.canvas_resize: creates handles
interact.context_menu -> core.selection: reads
interact.drag_drop -> core.canvas_elem: adds images
interact.drag_drop -> api.adapter: uploads
tools.undo_redo -> core.canvas_core: snapshots
ui.tree_nav -> core.canvas_core: loads canvas
ui.tree_nav -> api.adapter: fetches tree
ui.layers -> core.selection: syncs
visual.drawing -> core.canvas_core: draws on
ui.export -> core.canvas_core: exports from
api.adapter -> api.tauri: delegates (in Tauri)
```

## Element Lifecycle

```d2
direction: down

# States
upload: File Upload {
  shape: parallelogram
}

process: "Process and Store" {
  shape: rectangle
}

create: "Create Element" {
  shape: rectangle
}

render: "Render to SVG" {
  shape: rectangle
}

interact: Interactive {
  shape: diamond
  style.fill: "#fff9c4"
}

modify: Modify {
  shape: rectangle
}

save: Auto-Save {
  shape: rectangle
  style.fill: "#c8e6c9"
}

delete: Delete {
  shape: rectangle
  style.fill: "#ffcdd2"
}

# Flow
upload -> process: multer
process -> create: "add to elements[]"
create -> render: SVG.js
render -> interact: "makeElementInteractive()"
interact -> modify: "drag/resize"
interact -> delete: "delete key"
modify -> save: "scheduleAutoSave()"
save -> interact: "continue editing"
delete -> save: "remove from data"
```

## Selection and Resize System

```d2
direction: right

element: "SVG Element" {
  shape: rectangle
  style.fill: "#e3f2fd"
}

select: "selectElement()" {
  shape: rectangle
}

handles: "Resize Handles" {
  nw: NW {shape: circle}
  ne: NE {shape: circle}
  sw: SW {shape: circle}
  se: SE {shape: circle}
}

overlay: "Selection Overlay" {
  shape: rectangle
  style.stroke: "#2196f3"
  style.stroke-width: 2
}

resize: "resizeElement()" {
  shape: rectangle
}

update: "updateResizeHandles()" {
  shape: rectangle
}

element -> select: click
select -> handles: creates
select -> overlay: "creates for images"
handles.nw -> resize: drag
handles.ne -> resize: drag
handles.sw -> resize: drag
handles.se -> resize: drag
resize -> update: repositions
resize -> element: "modifies dimensions"
```

## Storage Schema

### Canvas JSON Structure

```json
{
  "id": "canvas-uuid",
  "name": "Canvas Name",
  "parentId": null,
  "created": "2025-01-01T00:00:00.000Z",
  "modified": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "viewBox": {
    "x": 0, "y": 0,
    "width": 1920, "height": 1080
  },
  "elements": [
    {
      "id": "element-uuid",
      "type": "image|folder|rectangle",
      "x": 100, "y": 100,
      "width": 200, "height": 200,
      "rotation": 0,
      "zIndex": 1,

      // Image-specific properties
      "src": "/api/images/filename.png",
      "flipH": false,
      "flipV": false,
      "filters": {
        "grayscale": 0,
        "brightness": 100,
        "contrast": 100,
        "blur": 0,
        "sepia": 0,
        "saturate": 100,
        "hueRotate": 0,
        "invert": 0,
        "opacity": 100
      },

      // Folder-specific properties
      "name": "Folder Name",
      "targetCanvasId": "child-canvas-id",

      // Rectangle-specific properties
      "fill": "#color",
      "stroke": "#color",
      "strokeWidth": 2,
      "opacity": 1,
      "cornerRadius": 0,

      // Annotation (all element types)
      "note": "User notes attached to this element"
    }
  ]
}
```

#### Element Property Reference

| Property | Type | Applies To | Description |
|----------|------|------------|-------------|
| `id` | string | All | Unique UUID for the element |
| `type` | string | All | Element type: `image`, `folder`, or `rectangle` |
| `x`, `y` | number | All | Position coordinates on canvas |
| `width`, `height` | number | All | Dimensions in canvas units |
| `rotation` | number | All | Rotation angle in degrees (0-360) |
| `zIndex` | number | All | Stacking order (higher = on top) |
| `note` | string | All | User annotation text (optional) |
| `src` | string | image | API path to image file (e.g., `/api/images/uuid.png`) |
| `flipH` | boolean | image | Horizontal flip transform (default: false) |
| `flipV` | boolean | image | Vertical flip transform (default: false) |
| `filters` | object | image | CSS filter values (see below) |
| `name` | string | folder | Display name shown on folder element |
| `targetCanvasId` | string | folder | Canvas ID to navigate to when opened |
| `fill` | string | rectangle | Fill color (CSS color value) |
| `stroke` | string | rectangle | Stroke color (CSS color value) |
| `strokeWidth` | number | rectangle | Stroke width in pixels |
| `opacity` | number | rectangle | Element opacity (0-1, default: 1) |
| `cornerRadius` | number | rectangle | Border radius in pixels (default: 0) |

**Filter Object Properties:**

| Filter | Range | Default | Description |
|--------|-------|---------|-------------|
| `grayscale` | 0-100 | 0 | Grayscale percentage |
| `brightness` | 0-200 | 100 | Brightness (100 = normal) |
| `contrast` | 0-200 | 100 | Contrast (100 = normal) |
| `blur` | 0-20 | 0 | Blur in pixels |
| `sepia` | 0-100 | 0 | Sepia percentage |
| `saturate` | 0-200 | 100 | Saturation (100 = normal) |
| `hueRotate` | 0-360 | 0 | Hue rotation in degrees |
| `invert` | 0-100 | 0 | Invert percentage |
| `opacity` | 0-100 | 100 | Filter opacity percentage |

### Tree JSON Structure

```json
{
  "rootCanvases": ["main"],
  "canvases": {
    "main": {
      "name": "Main Board",
      "children": ["project-a", "project-b"],
      "parent": null
    },
    "project-a": {
      "name": "Project A",
      "children": [],
      "parent": "main"
    }
  }
}
```

## Deployment Modes

```d2
direction: right

code: "Same Frontend Code" {
  shape: hexagon
  style.fill: "#fff9c4"
}

web: "Web Mode" {
  browser: Browser
  express: "Express Server"
  storage: "server/storage/"

  browser -> express: HTTP
  express -> storage: fs
}

desktop: "Desktop Mode" {
  tauri_app: "Tauri App"
  native: "Native Backend"
  local: "Local Files"

  tauri_app -> native: "invoke()"
  native -> local: "Rust fs"
}

code -> web.browser
code -> desktop.tauri_app
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| File-based JSON storage | Simple, no DB setup, human-readable, easy backup |
| SVG.js v2.7.1 | Lightweight, good browser support, mature API |
| Unified API adapter | Single codebase for web & desktop deployment |
| Debounced auto-save | Balance UX responsiveness with server load |
| Direct canvas children for handles | Simpler event handling than nested groups |
| Data attributes for element refs | Avoid breaking SVG.js element system |
| URL query params for canvas | Browser history & bookmarking support |
