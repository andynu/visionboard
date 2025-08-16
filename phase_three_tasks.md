# Phase 3 Drawing Tools - Detailed Task Breakdown

## Task-Level Implementation Guide
Each task below represents a single git commit and can be implemented independently. Tasks are ordered by dependency and logical implementation flow.

---

## 3.1: Color Palette System

### Task 3.1.1: Add color palette UI structure ✅ COMPLETED
**Files to modify**: `public/index.html`, `public/css/main.css`
**Description**: Add HTML structure for 4-color palette in toolbar
**Implementation**:
- Add color palette container to toolbar section
- Create 4 color swatch divs with IDs `color-swatch-0` through `color-swatch-3`
- Add current color indicator div with ID `current-color`
- Add basic CSS styling for color swatches (40x40px circles)
- Style current color indicator (larger circle with border)

### Task 3.1.2: Create ColorManager module ✅ COMPLETED
**Files to create**: `public/js/color-manager.js`
**Description**: Core color management functionality
**Implementation**:
- Create `ColorManager` class with default palette `["#000000", "#FF0000", "#0066CC", "#00AA00"]`
- Add methods: `getCurrentColor()`, `setCurrentColor(color)`, `getPalette()`, `setPaletteColor(index, color)`
- Add localStorage persistence: `saveToStorage()`, `loadFromStorage()`
- Initialize with default "hand" tool and black color
- Export singleton instance as `window.colorManager`

### Task 3.1.3: Wire up color palette UI interactions ✅ COMPLETED
**Files to modify**: `public/js/color-manager.js`, `public/index.html`
**Description**: Connect UI to ColorManager functionality
**Implementation**:
- Add click handlers to color swatches to set current color
- Add visual feedback for selected color (highlight border)
- Update current color indicator when selection changes
- Load saved colors from localStorage on page load
- Include color-manager.js script tag in index.html

### Task 3.1.4: Add color picker modal
**Files to modify**: `public/js/color-manager.js`, `public/css/main.css`, `public/index.html`
**Description**: Allow users to customize palette colors
**Implementation**:
- Add color picker modal HTML structure (hidden by default)
- Add right-click handler on color swatches to open picker
- Use HTML5 `<input type="color">` for color selection
- Add OK/Cancel buttons to modal
- Add CSS styling for modal overlay and content
- Save palette changes to localStorage

---

## 3.2: Basic Shape Tools

### Task 3.2.1: Add drawing tools UI to toolbar
**Files to modify**: `public/index.html`, `public/css/main.css`
**Description**: Add tool selection buttons to toolbar
**Implementation**:
- Add tool button container to toolbar
- Create 4 tool buttons: Hand (select), Rectangle, Line, Freehand
- Add icon styling using Unicode symbols or simple text
- Add CSS for active/inactive tool states
- Position tools section in toolbar layout

### Task 3.2.2: Create DrawingTool base class
**Files to create**: `public/js/drawing-tools.js`
**Description**: Base functionality for all drawing tools
**Implementation**:
- Create `DrawingTool` base class with common methods
- Add tool state management: `activeTool`, `isDrawing` flags
- Add methods: `activate()`, `deactivate()`, `onMouseDown()`, `onMouseMove()`, `onMouseUp()`
- Add canvas coordinate conversion helper methods
- Initialize default tool as "hand" (selection tool)

### Task 3.2.3: Implement HandTool (selection tool)
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Selection tool that maintains existing behavior
**Implementation**:
- Create `HandTool` class extending `DrawingTool`
- Implement existing selection/drag functionality as a formal tool
- Handle tool activation/deactivation properly
- Ensure compatibility with existing element interaction system

### Task 3.2.4: Wire up tool selection UI
**Files to modify**: `public/js/drawing-tools.js`, `public/index.html`
**Description**: Connect tool buttons to tool switching logic
**Implementation**:
- Add click handlers to tool buttons
- Add visual feedback for active tool (highlight/border)
- Add global tool manager: `window.toolManager` 
- Add keyboard shortcuts: H=hand, R=rectangle, L=line, F=freehand
- Include drawing-tools.js script tag in index.html

### Task 3.2.5: Implement RectangleTool drawing
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Click-drag rectangle creation
**Implementation**:
- Create `RectangleTool` class extending `DrawingTool`
- Implement mouse down/move/up handlers for rectangle drawing
- Create preview rectangle during drag (dotted border)
- Generate rectangle element data with current color
- Add rectangle to canvas and elements array on mouse up
- Handle minimum size constraints (20x20px)

### Task 3.2.6: Add rectangle element support to canvas system
**Files to modify**: `public/js/canvas.js`
**Description**: Render and interact with rectangle elements
**Implementation**:
- Add `"rectangle"` case to `renderCanvas()` switch statement
- Create `addRectangleToCanvas(rectangleData)` function
- Use SVG.js `rect()` to create rectangles with stroke/fill from data
- Apply existing `makeElementInteractive()` to rectangles
- Ensure rectangles work with selection/drag/resize system

### Task 3.2.7: Implement LineTool drawing
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Click-drag line creation
**Implementation**:
- Create `LineTool` class extending `DrawingTool`
- Implement mouse handlers for line drawing (point A to point B)
- Create preview line during drag
- Generate line element data with current color and stroke width
- Add line to canvas and elements array on mouse up
- Handle minimum length constraints

### Task 3.2.8: Add line element support to canvas system
**Files to modify**: `public/js/canvas.js`
**Description**: Render and interact with line elements
**Implementation**:
- Add `"line"` case to `renderCanvas()` switch statement
- Create `addLineToCanvas(lineData)` function using SVG.js `line()`
- Apply stroke color and width from element data
- Make lines interactive with custom resize handles (endpoints only)
- Adapt resize system for line-specific behavior (move endpoints)

---

## 3.3: Multi-Selection System

### Task 3.3.1: Convert single selection to multi-selection data structure
**Files to modify**: `public/js/canvas.js`
**Description**: Change selectedElement to selectedElements array
**Implementation**:
- Replace global `selectedElement` with `selectedElements = []`
- Update `selectElement()` to handle array operations
- Update `deselectElement()` to clear entire selection array
- Maintain backward compatibility with single selection as primary use case
- Update delete functionality to work with multiple elements

### Task 3.3.2: Add Ctrl/Cmd+click multi-selection
**Files to modify**: `public/js/canvas.js`
**Description**: Allow adding elements to selection with modifier key
**Implementation**:
- Detect Ctrl (Windows/Linux) or Cmd (Mac) key in element click handlers
- Modify `selectElement()` to add to selection when modifier pressed
- Add visual styling for multi-selected elements (different border color)
- Update resize handle display logic for multi-selection
- Prevent deselection when clicking selected element with modifier

### Task 3.3.3: Add rectangle selection (drag-select)
**Files to modify**: `public/js/canvas.js`, `public/css/main.css`
**Description**: Click-drag on empty canvas to select multiple elements
**Implementation**:
- Add mouse handlers to canvas background for rectangle selection
- Create selection rectangle visual feedback (dashed border)
- Calculate which elements intersect with selection rectangle
- Add intersecting elements to selection array
- Add CSS styling for selection rectangle overlay

### Task 3.3.4: Implement multi-element dragging
**Files to modify**: `public/js/canvas.js`
**Description**: Move all selected elements together when dragging
**Implementation**:
- Modify drag handlers to move all selected elements
- Calculate relative offsets for each element from primary drag element
- Maintain relative positions during multi-element drag
- Update all element positions in canvas data after drag
- Show drag preview for all selected elements

### Task 3.3.5: Add multi-element resize/scale
**Files to modify**: `public/js/canvas.js`
**Description**: Scale multiple selected elements proportionally
**Implementation**:
- Calculate bounding box for multi-selection
- Show resize handles around entire selection bounds
- Implement proportional scaling for all selected elements
- Maintain relative positions and aspect ratios during scaling
- Update all element data after multi-resize operation

---

## 3.4: Freehand Drawing

### Task 3.4.1: Implement basic FreehandTool structure
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Freehand drawing tool with pointer events
**Implementation**:
- Create `FreehandTool` class extending `DrawingTool`
- Set up pointer event handlers (pointerdown/pointermove/pointerup)
- Add path data collection during drawing
- Implement basic line drawing with SVG path
- Store points array during drawing session

### Task 3.4.2: Add stroke smoothing and path optimization
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Smooth curves and reduce path complexity
**Implementation**:
- Implement moving average smoothing for pointer coordinates
- Add distance-based point filtering (skip points too close together)
- Convert point array to smooth SVG path using Bezier curves
- Add path simplification to reduce file size and improve performance
- Optimize for Apple Pencil precision vs performance

### Task 3.4.3: Add pressure sensitivity support
**Files to modify**: `public/js/drawing-tools.js`
**Description**: Variable line width based on pressure
**Implementation**:
- Detect pressure data from PointerEvent.pressure
- Map pressure values to stroke width (e.g., 1-8px range)
- Create variable-width paths using SVG stroke-width or multiple path segments
- Add fallback for devices without pressure sensitivity
- Smooth pressure changes to avoid jarring width transitions

### Task 3.4.4: Optimize freehand for touch/Apple Pencil
**Files to modify**: `public/js/drawing-tools.js`, `public/css/main.css`
**Description**: Prevent interference with pan/zoom during drawing
**Implementation**:
- Add `touch-action: none` during active drawing
- Disable canvas panning when freehand tool is active and drawing
- Handle pointer events properly to distinguish stylus from finger
- Add palm rejection hints where supported
- Optimize for iPad Safari and Apple Pencil performance

### Task 3.4.5: Add freehand element support to canvas system
**Files to modify**: `public/js/canvas.js`
**Description**: Render and interact with freehand elements
**Implementation**:
- Add `"freehand"` case to `renderCanvas()` switch statement
- Create `addFreehandToCanvas(freehandData)` function
- Use SVG.js `path()` to render freehand drawings
- Apply stroke color and width from element data
- Make freehand drawings selectable and moveable (but not resizable)

---

## 3.5: Enhanced Object Movement

### Task 3.5.1: Add keyboard arrow key movement
**Files to modify**: `public/js/canvas.js`
**Description**: Move selected elements with arrow keys
**Implementation**:
- Add keydown event listener for arrow keys (when element selected)
- Implement 1px movement for arrow keys alone
- Implement 10px movement for Shift+arrow keys
- Update element positions and trigger auto-save
- Prevent page scrolling when moving elements

### Task 3.5.2: Add duplicate functionality
**Files to modify**: `public/js/canvas.js`
**Description**: Duplicate selected elements with Ctrl/Cmd+D
**Implementation**:
- Add keyboard shortcut handler for Ctrl/Cmd+D
- Clone selected element data with new IDs
- Offset duplicated elements by 20px x/y to avoid perfect overlap
- Add duplicated elements to canvas and select them
- Support multi-element duplication

### Task 3.5.3: Add z-order controls
**Files to modify**: `public/js/canvas.js`, `public/index.html`, `public/css/main.css`
**Description**: Bring to front / send to back functionality
**Implementation**:
- Add z-order buttons to toolbar or context menu
- Implement `bringToFront()` and `sendToBack()` functions
- Update element zIndex values and re-render canvas
- Add keyboard shortcuts (Ctrl+] for front, Ctrl+[ for back)
- Update element data and trigger auto-save

### Task 3.5.4: Add snap-to-grid option
**Files to modify**: `public/js/canvas.js`, `public/index.html`
**Description**: Optional grid snapping for precise positioning
**Implementation**:
- Add snap-to-grid toggle button to toolbar
- Implement 20px grid snapping during drag operations
- Add visual grid overlay when snap is enabled
- Store snap preference in localStorage
- Apply snapping to both drag and keyboard movement

---

## 3.6: Integration & Polish

### Task 3.6.1: Add undo/redo for drawing operations
**Files to create**: `public/js/undo-manager.js`
**Files to modify**: `public/js/canvas.js`
**Description**: Basic undo/redo functionality for canvas operations
**Implementation**:
- Create `UndoManager` class with command pattern
- Implement canvas state snapshots before operations
- Add Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Y (redo) keyboard shortcuts
- Limit undo history to 20 operations for memory management
- Include drawing, moving, resizing, and deleting operations

### Task 3.6.2: Update export functionality for new elements
**Files to modify**: Server routes and export functionality
**Description**: Ensure PNG export includes drawn shapes
**Implementation**:
- Update canvas-to-image export to include all new element types
- Test PNG export with rectangles, lines, and freehand drawings
- Ensure proper color and stroke rendering in exports
- Verify export quality and scaling

### Task 3.6.3: Add performance optimizations
**Files to modify**: `public/js/canvas.js`, `public/css/main.css`
**Description**: Handle canvases with many drawn elements efficiently
**Implementation**:
- Implement viewport culling for elements outside visible area
- Add element count limits and warnings for performance
- Optimize freehand path rendering for complex drawings
- Add loading indicators for heavy operations
- Implement element batching for large multi-selections

### Task 3.6.4: Add tooltips and help text
**Files to modify**: `public/index.html`, `public/css/main.css`
**Description**: User guidance for new drawing features
**Implementation**:
- Add tooltip text to all toolbar buttons
- Create help overlay or tutorial for drawing tools
- Add keyboard shortcut reference panel
- Include contextual tips for multi-selection and drawing
- Add accessibility labels for screen readers

### Task 3.6.5: Comprehensive testing and bug fixes
**Files to test**: All modified files
**Description**: End-to-end testing of drawing functionality
**Implementation**:
- Test all drawing tools on desktop and iPad
- Verify multi-selection with various element combinations
- Test performance with 50+ elements on canvas
- Verify color persistence across browser sessions
- Test integration with existing folder/navigation system
- Fix any discovered bugs or edge cases

---

## Implementation Notes

### Dependencies Between Tasks
- Tasks within each section (3.1, 3.2, etc.) should be completed in order
- Section 3.1 (Colors) should be completed before 3.2 (Shapes) 
- Section 3.2 (Shapes) should be completed before other sections
- Sections 3.3, 3.4, and 3.5 can be developed in parallel after 3.2
- Section 3.6 (Polish) should be completed last

### Testing Strategy
- Test each task individually after implementation
- Use browser dev tools to verify element data structures
- Test on both desktop and iPad Safari
- Verify backward compatibility with existing canvases
- Run through complete user workflows after each section

### Git Commit Guidelines
- Each task = one focused commit
- Include task number in commit message (e.g., "Task 3.1.1: Add color palette UI structure")
- Ensure code works and tests pass before committing
- Keep commits small and focused on single functionality