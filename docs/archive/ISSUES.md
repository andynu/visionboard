# Known Issues

## Todo List

- [x] Resize handles not visible when selecting elements (Fixed 2025-10-29)
- [x] Image duplication on canvas rendering (Fixed 2025-10-29)

---

## Issue Details

### Resize Handles Not Visible

**Status:** Fixed
**Priority:** High
**Reported:** 2025-10-29
**Fixed:** 2025-10-29

**Description:**
When selecting an image or other element on the canvas, the resize handles (corner circles) are not visible to the user, making it impossible to resize elements interactively.

**Technical Details:**
- Resize handles are created as SVG circles in `createResizeHandles()` (canvas.js:788-833)
- Handles are created with size 16px and positioned at element corners
- Handles should be shown when element is selected via `selectElement()` (canvas.js:447-505)
- CSS styling: white fill (#fff) with blue stroke (#007AFF)
- Visibility controlled by opacity and pointer-events styles

**Potential Causes:**
1. SVG.js v2.7.1 `circle(size)` may not be setting radius correctly
2. Handles may be positioned off-screen or at (0,0)
3. Handles may be hidden behind other elements in SVG stacking order
4. Visibility toggle code may not be executing properly
5. Handle size may be too small or circles may not be rendering

**Investigation Notes:**
- Handles group is created with class `resize-handles`
- Each handle has class `resize-handle` plus corner-specific classes (nw-resize, etc.)
- Handles are hidden by default with `opacity: 0` and shown with `opacity: 1` on selection
- Handle IDs are stored using `data-resize-handles-id` attribute
- `updateResizeHandles()` positions handles using `element.x()`, `element.y()`, width, and height

**Fix Applied (Updated 2025-10-29):**

**Attempt 1:** Used `.radius()` method - may not work reliably in SVG.js v2.7.1

**Attempt 2 (Current):**
1. Create circles with no size parameter, then use `.attr()` to set all SVG attributes explicitly
2. Increased handle radius from 8 to 12 for better visibility
3. Set all attributes directly: `r`, `cx`, `cy`, `fill`, `stroke`, `stroke-width`
4. Changed `updateResizeHandles()` to use `.attr({ cx, cy })` instead of `.center()`
5. Added comprehensive debug logging:
   - `createResizeHandles()` logs handle creation and radius values
   - `selectElement()` logs handle ID lookup and visibility state
   - `updateResizeHandles()` logs positioning coordinates
6. Updated `handleOffset` to match new radius of 12

**Changes:**
- `public/js/canvas.js`: Modified `createResizeHandles()` function (lines 798-860)
- `public/js/canvas.js`: Updated `updateResizeHandles()` function (lines 894-921)
- `public/js/canvas.js`: Enhanced `selectElement()` logging (lines 490-510)

**Testing Instructions:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R) to clear JavaScript cache
2. Load the application
3. Add/select an image
4. Check console for debug output showing handle creation and positioning
5. Look for white circles with blue borders at element corners

**Debugging Status (2025-10-29):**

**Issue:** Tauri webview aggressively caches JavaScript and CSS files, making debugging difficult.

**Actions Taken:**
1. Added cache-busting parameters to both JS and CSS: `?v=20251029-handles-debug2`
2. Changed CSS to force handles always visible: `opacity: 1 !important`
3. Added inline style forcing in JavaScript to bypass CSS caching:
   - `handle.node.style.opacity = '1'`
   - `group.node.style.opacity = '1'`
4. Added comprehensive DOM debugging to log:
   - All SVG attributes (r, cx, cy, fill, stroke, stroke-width)
   - Computed CSS styles (opacity, fill, stroke, display, visibility)
   - Group visibility state

**ROOT CAUSE IDENTIFIED (2025-10-29):**

User observed handles flashing briefly during image load, then disappearing. Investigation revealed:

**The Bug:** `renderCanvas()` function line 86 was calling `hideAllResizeHandles()` after a 100ms delay, which explicitly hid all handles immediately after they were created.

```javascript
setTimeout(() => {
    reattachEventListeners();
    hideAllResizeHandles();  // <-- THIS WAS HIDING THEM!
}, 100);
```

**The Fix:** Removed the `hideAllResizeHandles()` call from `renderCanvas()`. Handle visibility should be controlled by:
1. CSS default state (opacity: 0 for unselected)
2. Selection state (opacity: 1 when element.selected)
3. Individual handle group visibility toggling in `selectElement()`/`deselectElement()`

Handles now remain in their proper CSS-controlled state instead of being forcibly hidden after every render.

---

### Image Duplication on Canvas Rendering

**Status:** Fixed (2025-10-29)
**Priority:** High

**Description:**
Images were being duplicated on canvas when rendering, with one instance appearing at the correct position and another at a different position.

**Root Cause:**
The canvas was being rendered twice - once in `addImageToCanvas()` and again in `renderCanvas()`. This was caused by calling `addImageToCanvas()` during the render loop, which added elements to both the canvas data and the SVG, and then the second render pass would add them again.

**Fix:**
Removed the duplicate rendering logic and ensured elements are only added once during the render process.

**Commit:** 8511e2b - Fix image duplication bug caused by double canvas rendering
