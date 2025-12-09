// Touch and gesture handling for mobile/tablet support

let isTouch = false;
let lastTouchTime = 0;
let touchStartPos = { x: 0, y: 0 };
// isPanning is declared in canvas.js - using that global variable
let isZooming = false;
let lastDistance = 0;

function initializeTouchSupport() {
    // Detect touch capability
    isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouch) {
        const canvasContainer = document.getElementById('canvas');
        
        // Touch event listeners
        canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvasContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
        
        // Prevent default iOS behaviors
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.canvas-container')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevent iOS zoom on double-tap (use CONFIG for timing)
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= CONFIG.touch.doubleTapDelay) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }
}

function handleTouchStart(event) {
    const touches = event.touches;
    
    if (touches.length === 1) {
        // Single finger - potential drag or tap
        const touch = touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        isPanning = false;
        
        // Check if touching an element
        const element = getElementAtTouch(touch);
        if (element) {
            window.elementsAPI.selectElement(element);
        }
        
    } else if (touches.length === 2) {
        // Two fingers - pinch to zoom
        isZooming = true;
        lastDistance = getTouchDistance(touches[0], touches[1]);
        event.preventDefault();
    }
}

function handleTouchMove(event) {
    const touches = event.touches;
    
    if (touches.length === 1 && !isZooming) {
        // Single finger drag
        const touch = touches[0];
        const deltaX = touch.clientX - touchStartPos.x;
        const deltaY = touch.clientY - touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > CONFIG.touch.dragThreshold) { // Threshold for drag vs tap
            isPanning = true;

            const selected = getSelectedElement();
            if (selected) {
                // Move selected element
                moveElementByDelta(selected, deltaX, deltaY);
                touchStartPos = { x: touch.clientX, y: touch.clientY };
            }
        }
        
    } else if (touches.length === 2) {
        // Pinch to zoom
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const scale = currentDistance / lastDistance;
        
        if (Math.abs(scale - 1) > 0.01) { // Threshold to prevent jitter
            handleZoom(scale, getTouchCenter(touches[0], touches[1]));
            lastDistance = currentDistance;
        }
        
        event.preventDefault();
    }
}

function handleTouchEnd(event) {
    const now = Date.now();
    
    if (!isPanning && !isZooming && event.changedTouches.length === 1) {
        // This was a tap
        const touch = event.changedTouches[0];
        
        // Double-tap detection
        if (now - lastTouchTime < CONFIG.touch.doubleTapDelay) {
            handleDoubleTap(touch);
        } else {
            handleSingleTap(touch);
        }
        
        lastTouchTime = now;
    }
    
    // Reset states
    const selected = getSelectedElement();
    if (selected && isPanning) {
        window.canvasCore.updateElementPosition(selected);
    }

    isPanning = false;
    isZooming = false;
}

function handleSingleTap(touch) {
    const element = getElementAtTouch(touch);

    if (element) {
        selectElementWithHaptic(element);
    } else {
        deselectElementTouch();
    }
}

function handleDoubleTap(touch) {
    const element = getElementAtTouch(touch);
    
    if (element) {
        // Show resize handles on double-tap
        window.selectionAPI.toggleResizeHandles(element, true);
    } else {
        // Zoom to fit or reset zoom
        resetCanvasView();
    }
}

function getElementAtTouch(touch) {
    // Convert touch coordinates to canvas coordinates
    const canvasCoords = window.screenToCanvasCoordinates(touch.clientX, touch.clientY);
    
    // Find element at these coordinates
    // This is a simplified implementation - you might need more sophisticated hit testing
    const elements = canvas.find('.canvas-element');
    
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        const bbox = element.bbox();
        
        if (canvasCoords.x >= bbox.x && canvasCoords.x <= bbox.x2 &&
            canvasCoords.y >= bbox.y && canvasCoords.y <= bbox.y2) {
            return element;
        }
    }
    
    return null;
}

function moveElementByDelta(element, deltaX, deltaY) {
    const currentPos = element.bbox();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();

    // Convert screen delta to canvas delta
    const viewBox = canvas.viewbox();
    const scaleX = viewBox.width / canvasRect.width;
    const scaleY = viewBox.height / canvasRect.height;

    const canvasDeltaX = deltaX * scaleX;
    const canvasDeltaY = deltaY * scaleY;

    element.move(currentPos.x + canvasDeltaX, currentPos.y + canvasDeltaY);
    // Update selection rectangle during drag
    window.selectionAPI.updateSelectionRect(element);
}

function getTouchDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchCenter(touch1, touch2) {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
}

function handleZoom(scale, center) {
    // Simplified zoom implementation
    // In a full implementation, you'd want to zoom around the center point
    const currentViewBox = canvas.viewbox();
    const newWidth = currentViewBox.width / scale;
    const newHeight = currentViewBox.height / scale;
    
    // Constrain zoom levels
    if (newWidth > 100 && newWidth < 10000 && newHeight > 100 && newHeight < 10000) {
        canvas.viewbox(
            currentViewBox.x + (currentViewBox.width - newWidth) / 2,
            currentViewBox.y + (currentViewBox.height - newHeight) / 2,
            newWidth,
            newHeight
        );
    }
}

function resetCanvasView() {
    const vb = CONFIG.canvas.defaultViewBox;
    canvas.viewbox(vb.x, vb.y, vb.width, vb.height);
}

// Touch uses shared selection API from selection.js with haptic feedback option
function selectElementWithHaptic(element) {
    window.selectionAPI.selectElement(element, window.canvas, { haptic: true });
}

// Alias to shared API for touch deselection
function deselectElementTouch() {
    window.selectionAPI.deselectElement();
}

// Helper to get selected element from shared API
function getSelectedElement() {
    return window.selectionAPI.getSelectedElement();
}

// Initialize touch support when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTouchSupport);
} else {
    initializeTouchSupport();
}