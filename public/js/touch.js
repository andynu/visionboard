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
        
        // Prevent iOS zoom on double-tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
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
            selectElement(element);
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
        
        if (distance > 10) { // Threshold for drag vs tap
            isPanning = true;
            
            if (selectedElement) {
                // Move selected element
                moveElementByDelta(selectedElement, deltaX, deltaY);
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
        if (now - lastTouchTime < 300) {
            handleDoubleTap(touch);
        } else {
            handleSingleTap(touch);
        }
        
        lastTouchTime = now;
    }
    
    // Reset states
    isPanning = false;
    isZooming = false;
    
    if (selectedElement && isPanning) {
        updateElementPosition(selectedElement);
    }
}

function handleSingleTap(touch) {
    const element = getElementAtTouch(touch);
    
    if (element) {
        selectElement(element);
    } else {
        deselectElement();
    }
}

function handleDoubleTap(touch) {
    const element = getElementAtTouch(touch);
    
    if (element) {
        // Show resize handles on double-tap
        showResizeHandles(element);
    } else {
        // Zoom to fit or reset zoom
        resetCanvasView();
    }
}

function getElementAtTouch(touch) {
    // Convert touch coordinates to canvas coordinates
    const canvasCoords = screenToCanvasCoordinates(touch.clientX, touch.clientY);
    
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
    canvas.viewbox(0, 0, 1920, 1080);
}

function deselectElement() {
    if (selectedElement) {
        // Handle both DOM elements and SVG.js elements
        if (selectedElement.removeClass) {
            selectedElement.removeClass('selected');
        } else {
            selectedElement.classList.remove('selected');
        }
        
        // Hide resize handles for the previously selected element (updated for new handle system)
        let handlesIds;
        if (selectedElement.attr) {
            handlesIds = selectedElement.attr('data-resize-handles-ids');
        } else {
            handlesIds = selectedElement.getAttribute('data-resize-handles-ids');
        }

        if (handlesIds) {
            const ids = handlesIds.split(',');
            ids.forEach(id => {
                const handle = document.getElementById(id);
                if (handle) {
                    handle.style.setProperty('opacity', '0', 'important');
                    handle.style.setProperty('pointer-events', 'none', 'important');
                }
            });
        }
        
        // Remove selected styling for folders (only for SVG.js elements)
        if (selectedElement.data && selectedElement.find) {
            const elementData = selectedElement.data('elementData');
            if (elementData && elementData.type === 'folder') {
                selectedElement.find('rect').first().stroke({ width: 2 });
            }
        }
        
        selectedElement = null;
    }
}

// Improved element selection for touch
function selectElement(element) {
    deselectElement();
    selectedElement = element;

    // Handle both DOM elements and SVG.js elements
    if (element.addClass) {
        element.addClass('selected');
    } else {
        element.classList.add('selected');
    }

    // Show resize handles for selected element (updated for new handle system)
    let handlesIds;
    if (element.attr) {
        handlesIds = element.attr('data-resize-handles-ids');
    } else {
        handlesIds = element.getAttribute('data-resize-handles-ids');
    }

    console.log('[touch.js selectElement] Looking for handles with IDs:', handlesIds);
    if (handlesIds) {
        const ids = handlesIds.split(',');
        ids.forEach((id, index) => {
            const handle = document.getElementById(id);
            if (handle) {
                handle.style.setProperty('opacity', '1', 'important');
                handle.style.setProperty('pointer-events', 'all', 'important');
                console.log(`[touch.js] Made handle ${index} visible: ${id}`);
            } else {
                console.warn(`[touch.js] Handle not found: ${id}`);
            }
        });
    } else {
        console.warn('[touch.js selectElement] No handles IDs stored on element');
    }
    
    // Add selected styling for folders (only for SVG.js elements)
    if (element.data && element.find) {
        const elementData = element.data('elementData');
        if (elementData && elementData.type === 'folder') {
            element.find('rect').first().stroke({ width: 3 });
        }
    }
    
    // Provide haptic feedback on supported devices
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// Initialize touch support when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTouchSupport);
} else {
    initializeTouchSupport();
}