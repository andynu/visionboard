// Zoom controls for canvas view management
// Provides zoom to fit, zoom to selection, reset view functions

/**
 * Animate viewBox transition
 * @param {Object} canvas - SVG.js canvas
 * @param {Object} targetViewBox - Target {x, y, width, height}
 * @param {number} duration - Animation duration in ms
 */
function animateViewBox(canvas, targetViewBox, duration = 300) {
    const startViewBox = canvas.viewbox();
    const startTime = performance.now();

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        const currentX = startViewBox.x + (targetViewBox.x - startViewBox.x) * eased;
        const currentY = startViewBox.y + (targetViewBox.y - startViewBox.y) * eased;
        const currentW = startViewBox.width + (targetViewBox.width - startViewBox.width) * eased;
        const currentH = startViewBox.height + (targetViewBox.height - startViewBox.height) * eased;

        canvas.viewbox(currentX, currentY, currentW, currentH);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}

/**
 * Calculate bounding box of all elements on canvas
 * @returns {Object|null} {x, y, width, height} or null if no elements
 */
function getAllElementsBounds() {
    const canvas = window.canvasCore.getCanvas();
    const currentCanvas = window.canvasCore.getCurrentCanvas();

    if (!canvas || !currentCanvas || !currentCanvas.elements || currentCanvas.elements.length === 0) {
        return null;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    currentCanvas.elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + (el.width || 0));
        maxY = Math.max(maxY, el.y + (el.height || 0));
    });

    if (minX === Infinity) return null;

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Calculate bounding box of selected elements
 * @returns {Object|null} {x, y, width, height} or null if no selection
 */
function getSelectionBounds() {
    const selectedElements = window.selectionAPI.getSelectedElements();
    if (selectedElements.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    selectedElements.forEach(element => {
        const data = element.data('elementData');
        if (data) {
            minX = Math.min(minX, data.x);
            minY = Math.min(minY, data.y);
            maxX = Math.max(maxX, data.x + (data.width || 0));
            maxY = Math.max(maxY, data.y + (data.height || 0));
        }
    });

    if (minX === Infinity) return null;

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Zoom to fit all elements
 */
function zoomToFitAll() {
    const canvas = window.canvasCore.getCanvas();
    if (!canvas) return;

    const bounds = getAllElementsBounds();
    if (!bounds) {
        // No elements - reset to initial view
        resetView();
        showNotification('Canvas is empty', {color: 'purple'});
        return;
    }

    // Add padding (20% of bounds size, minimum 50px)
    const paddingX = Math.max(bounds.width * 0.2, 50);
    const paddingY = Math.max(bounds.height * 0.2, 50);

    const viewBox = {
        x: bounds.x - paddingX,
        y: bounds.y - paddingY,
        width: bounds.width + paddingX * 2,
        height: bounds.height + paddingY * 2
    };

    // Clamp to zoom limits
    const canvasContainer = document.getElementById('canvas');
    const aspectRatio = canvasContainer.clientWidth / canvasContainer.clientHeight;

    // Adjust viewBox to maintain aspect ratio
    const viewAspect = viewBox.width / viewBox.height;
    if (viewAspect > aspectRatio) {
        // Wider than container - adjust height
        const newHeight = viewBox.width / aspectRatio;
        viewBox.y -= (newHeight - viewBox.height) / 2;
        viewBox.height = newHeight;
    } else {
        // Taller than container - adjust width
        const newWidth = viewBox.height * aspectRatio;
        viewBox.x -= (newWidth - viewBox.width) / 2;
        viewBox.width = newWidth;
    }

    animateViewBox(canvas, viewBox);
    showNotification('Zoom to fit', {color: 'purple'});
}

/**
 * Zoom to fit selected elements
 */
function zoomToSelection() {
    const canvas = window.canvasCore.getCanvas();
    if (!canvas) return;

    const bounds = getSelectionBounds();
    if (!bounds) {
        showNotification('No selection', {color: 'purple'});
        return;
    }

    // Add padding
    const paddingX = Math.max(bounds.width * 0.3, 100);
    const paddingY = Math.max(bounds.height * 0.3, 100);

    const viewBox = {
        x: bounds.x - paddingX,
        y: bounds.y - paddingY,
        width: bounds.width + paddingX * 2,
        height: bounds.height + paddingY * 2
    };

    // Adjust aspect ratio
    const canvasContainer = document.getElementById('canvas');
    const aspectRatio = canvasContainer.clientWidth / canvasContainer.clientHeight;
    const viewAspect = viewBox.width / viewBox.height;

    if (viewAspect > aspectRatio) {
        const newHeight = viewBox.width / aspectRatio;
        viewBox.y -= (newHeight - viewBox.height) / 2;
        viewBox.height = newHeight;
    } else {
        const newWidth = viewBox.height * aspectRatio;
        viewBox.x -= (newWidth - viewBox.width) / 2;
        viewBox.width = newWidth;
    }

    animateViewBox(canvas, viewBox);
    showNotification('Zoom to selection', {color: 'purple'});
}

/**
 * Reset to 100% zoom
 */
function zoomTo100() {
    const canvas = window.canvasCore.getCanvas();
    if (!canvas) return;

    const canvasContainer = document.getElementById('canvas');
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    // Center the view at current center point
    const currentVB = canvas.viewbox();
    const centerX = currentVB.x + currentVB.width / 2;
    const centerY = currentVB.y + currentVB.height / 2;

    const viewBox = {
        x: centerX - width / 2,
        y: centerY - height / 2,
        width: width,
        height: height
    };

    animateViewBox(canvas, viewBox);
    showNotification('Zoom 100%', {color: 'purple'});
}

/**
 * Reset view to initial state
 */
function resetView() {
    const canvas = window.canvasCore.getCanvas();
    if (!canvas || !window.CONFIG) return;

    const vb = window.CONFIG.canvas.initialViewBox;
    animateViewBox(canvas, {
        x: vb.x,
        y: vb.y,
        width: vb.width,
        height: vb.height
    });

    showNotification('View reset', {color: 'purple'});
}

// Note: showNotification is provided by notification.js (uses 'purple' color for zoom operations)

/**
 * Attach keyboard shortcuts
 */
function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Don't capture when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + 0: Zoom to Fit All
        if ((event.ctrlKey || event.metaKey) && event.key === '0') {
            event.preventDefault();
            zoomToFitAll();
        }

        // Ctrl/Cmd + 1: Zoom to 100%
        if ((event.ctrlKey || event.metaKey) && event.key === '1') {
            event.preventDefault();
            zoomTo100();
        }

        // Ctrl/Cmd + 2: Zoom to Selection
        if ((event.ctrlKey || event.metaKey) && event.key === '2') {
            event.preventDefault();
            zoomToSelection();
        }
    });
}

// Initialize when DOM is ready
onReady(attachKeyboardShortcuts);

// Export for use by other modules
window.zoomControls = {
    zoomToFitAll,
    zoomToSelection,
    zoomTo100,
    resetView,
    animateViewBox
};
