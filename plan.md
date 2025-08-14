# Vision Board Software Project Plan

## Architecture Overview

**Hybrid Approach**: Web application with optional desktop wrapper
- **Frontend**: HTML/CSS/JavaScript with SVG-based canvas
- **Backend**: Node.js/Express web server for file operations and API
- **Storage**: JSON files for canvas definitions, filesystem for images
- **Desktop Wrapper**: Electron (future phase) for enhanced file operations

## Tech Stack

### Core Technologies
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript + SVG.js for canvas manipulation
- **Storage**: JSON files + filesystem for images
- **Styling**: CSS Grid/Flexbox for responsive layout

### Key Libraries
- **SVG.js**: SVG manipulation and interaction
- **Express.js**: Web server and API routes
- **Multer**: File upload handling
- **uuid**: Generate unique IDs for canvas elements
- **chokidar**: File system watching (for live updates)

## Project Structure

```
vision-board/
├── server/
│   ├── app.js              # Main server file
│   ├── routes/
│   │   ├── canvas.js       # Canvas CRUD operations
│   │   ├── files.js        # Image upload/management
│   │   └── tree.js         # Navigation tree operations
│   └── storage/
│       ├── canvases/       # JSON canvas definitions
│       └── images/         # Uploaded/embedded images
├── public/
│   ├── index.html
│   ├── css/
│   │   ├── main.css
│   │   └── mobile.css
│   ├── js/
│   │   ├── canvas.js       # SVG canvas management
│   │   ├── tree-nav.js     # Sidebar navigation
│   │   ├── drag-drop.js    # File handling
│   │   └── touch.js        # Mobile/tablet interactions
│   └── assets/
└── package.json
```

## Development Phases

### Phase 1: Basic Canvas & Images (2-3 weeks) ✅ COMPLETED

**Core Features:**
- ✅ Single SVG canvas with pan/zoom
- ✅ Drag & drop images from filesystem
- ✅ Basic image positioning and resizing
- ✅ Simple web server with file upload API
- ✅ Local data storage in standard app directory

**Technical Implementation:**
- ✅ Express server serving static files
- ✅ SVG.js for canvas interactions
- ✅ HTML5 drag-and-drop API
- ✅ JSON file format for canvas state
- ✅ Responsive CSS for basic mobile support

**Deliverables:**
- ✅ Working web app accessible at localhost:3001
- ✅ Can add, move, and resize images on canvas
- ✅ Images embedded/stored locally
- ✅ Basic touch support for iPad viewing

### Phase 2: Hierarchical Canvases (2-3 weeks) ✅ COMPLETED

**Core Features:**
- ✅ Folder objects that link to child canvases
- ✅ Tree navigation sidebar
- ✅ Canvas creation/deletion
- ✅ Breadcrumb navigation
- ✅ Parent/child relationship management

**Technical Implementation:**
- ✅ Canvas tree data structure in JSON
- ✅ Recursive tree rendering in sidebar
- ✅ Canvas switching without page reload
- ✅ URL routing for deep-linking canvases
- ✅ Folder visual representation on canvas

**Deliverables:**
- ✅ Multi-level canvas navigation
- ✅ Visual folder objects on canvas
- ✅ Tree sidebar with expand/collapse
- ✅ Ability to create nested canvas hierarchies

### Phase 3: Basic Drawing Tools (2-3 weeks)

**Core Features:**
- Freehand drawing with Apple Pencil support
- Basic shapes (rectangle, circle, line)
- Text tool with formatting
- Color picker and stroke options
- Undo/redo functionality

**Technical Implementation:**
- SVG path elements for drawings
- Touch/pointer event handling
- Pressure sensitivity for supported devices
- Command pattern for undo/redo
- Text editing modal/inline editing

**Deliverables:**
- Drawing tools toolbar
- Apple Pencil optimized drawing
- Text annotation capability
- Basic shape creation tools

### Phase 4: Enhanced UX & Polish (1-2 weeks)

**Core Features:**
- Improved mobile/tablet interface
- Keyboard shortcuts
- Export capabilities (PNG, SVG, PDF)
- Search functionality across canvases
- Settings/preferences

**Technical Implementation:**
- Enhanced touch gestures
- Canvas-to-image export
- Full-text search across canvas data
- User preferences storage
- Performance optimizations

### Phase 5: Desktop Wrapper (Optional, 2-3 weeks)

**Core Features:**
- Electron desktop application
- Enhanced drag-and-drop from filesystem
- System integration (file associations)
- Auto-start server on app launch
- Native menus and shortcuts

**Technical Implementation:**
- Electron main/renderer process setup
- Native file dialog integration
- System tray functionality
- Auto-updater capability
- OS-specific optimizations

## Data Models

### Canvas Definition (JSON)
```json
{
  "id": "canvas-uuid",
  "name": "My Canvas",
  "parentId": null,
  "created": "2025-08-14T10:00:00Z",
  "modified": "2025-08-14T10:30:00Z",
  "viewBox": { "x": 0, "y": 0, "width": 1920, "height": 1080 },
  "elements": [
    {
      "id": "element-uuid",
      "type": "image",
      "src": "images/photo1.jpg",
      "x": 100,
      "y": 100,
      "width": 300,
      "height": 200,
      "rotation": 0,
      "zIndex": 1
    },
    {
      "id": "folder-uuid", 
      "type": "folder",
      "name": "Robots",
      "targetCanvasId": "robots-canvas-uuid",
      "x": 400,
      "y": 300,
      "width": 100,
      "height": 100
    }
  ]
}
```

### Tree Structure (JSON)
```json
{
  "rootCanvases": ["main-canvas-uuid"],
  "canvases": {
    "main-canvas-uuid": {
      "name": "Drawing",
      "children": ["robots-uuid", "nature-uuid"]
    },
    "robots-uuid": {
      "name": "Robots", 
      "parent": "main-canvas-uuid",
      "children": ["garden-robots-uuid", "space-robots-uuid"]
    }
  }
}
```

## API Endpoints

```
GET  /api/tree                    # Get full canvas tree
GET  /api/canvas/:id              # Get specific canvas
POST /api/canvas                  # Create new canvas
PUT  /api/canvas/:id              # Update canvas
DEL  /api/canvas/:id              # Delete canvas

POST /api/upload                  # Upload image file
GET  /api/images/:filename        # Serve image files

GET  /api/export/:id/:format      # Export canvas (png/svg/pdf)
```

## Storage Strategy

**File System Layout:**
```
~/.local/share/vision-board/      # Linux
~/Library/Application Support/    # macOS  
%LOCALAPPDATA%/vision-board/      # Windows

├── canvases/
│   ├── main-canvas.json
│   ├── robots-canvas.json
│   └── garden-canvas.json
├── images/
│   ├── original/               # Full resolution
│   └── thumbnails/            # Generated previews
└── tree.json                  # Canvas hierarchy
```

## Development Timeline

**Total Estimated Time: 8-13 weeks**

- **Phase 1**: Weeks 1-3 (Foundation)
- **Phase 2**: Weeks 4-6 (Hierarchy) 
- **Phase 3**: Weeks 7-9 (Drawing)
- **Phase 4**: Weeks 10-11 (Polish)
- **Phase 5**: Weeks 12-13+ (Desktop - Optional)

## Getting Started

### Initial Setup Commands
```bash
mkdir vision-board && cd vision-board
npm init -y
npm install express multer uuid svg.js chokidar
mkdir -p server/routes public/{css,js} server/storage/{canvases,images}
```

### MVP Acceptance Criteria
- ✅ Can drag image files onto web canvas
- ✅ Images persist between sessions
- ✅ Can create and navigate folder hierarchies
- ✅ Works on iPad Safari with touch interactions
- ✅ Responsive design scales to different screen sizes
- ✅ Local data storage in appropriate OS directory

## Risk Considerations

**Technical Risks:**
- SVG performance with many elements (mitigation: virtualization)
- Touch interaction complexity (mitigation: proven libraries)
- File size management (mitigation: compression/thumbnails)

**Scope Risks:**
- Feature creep in drawing tools (mitigation: strict phase boundaries)
- Cross-platform desktop wrapper complexity (mitigation: web-first approach)

This plan prioritizes getting a working product quickly while maintaining clear upgrade paths for advanced features.


## wishlist
- ✅ browser back button support
- export entire board to png
- export entire board to json /w encoded embedded images
- load a board from that embedded image json format.
- delete image
- delete folder (with confirmation if it has contents)
- auto-arrange (non overlapping tight pack)
- autosave (on drag, on image add, on image resize)
