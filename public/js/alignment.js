// Alignment tools for Vision Board
// Provides alignment and distribution for multiple selected elements

/**
 * Get bounding box information for an element
 * @param {Object} element - SVG.js element
 * @returns {Object} Bounding box { x, y, width, height, cx, cy }
 */
function getElementBounds(element) {
    const bbox = element.bbox();
    return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        cx: bbox.x + bbox.width / 2,
        cy: bbox.y + bbox.height / 2,
        right: bbox.x + bbox.width,
        bottom: bbox.y + bbox.height
    };
}

/**
 * Move an element and update its data
 * @param {Object} element - SVG.js element
 * @param {number} x - New x position
 * @param {number} y - New y position
 */
function moveElement(element, x, y) {
    element.move(x, y);

    // Update element data
    const elementData = element.data('elementData');
    if (elementData) {
        elementData.x = x;
        elementData.y = y;
        element.data('elementData', elementData);

        // Update canvas data
        const currentCanvas = window.canvasCore.getCurrentCanvas();
        if (currentCanvas) {
            const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
            if (index !== -1) {
                currentCanvas.elements[index].x = x;
                currentCanvas.elements[index].y = y;
            }
        }
    }

    // Update selection rectangle
    window.selectionAPI.updateSelectionRect(element);
}

/**
 * Align selected elements to their left edges
 */
function alignLeft() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find leftmost x
    let minX = Infinity;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        minX = Math.min(minX, bounds.x);
    });

    // Align all to leftmost
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        moveElement(el, minX, bounds.y);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned left');
}

/**
 * Align selected elements to their horizontal centers
 */
function alignCenterH() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Calculate average center x
    let sumCx = 0;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        sumCx += bounds.cx;
    });
    const avgCx = sumCx / elements.length;

    // Align all to average center
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        const newX = avgCx - bounds.width / 2;
        moveElement(el, newX, bounds.y);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned center');
}

/**
 * Align selected elements to their right edges
 */
function alignRight() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find rightmost edge
    let maxRight = -Infinity;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        maxRight = Math.max(maxRight, bounds.right);
    });

    // Align all to rightmost
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        const newX = maxRight - bounds.width;
        moveElement(el, newX, bounds.y);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned right');
}

/**
 * Align selected elements to their top edges
 */
function alignTop() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find topmost y
    let minY = Infinity;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        minY = Math.min(minY, bounds.y);
    });

    // Align all to topmost
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        moveElement(el, bounds.x, minY);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned top');
}

/**
 * Align selected elements to their vertical centers
 */
function alignMiddle() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Calculate average center y
    let sumCy = 0;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        sumCy += bounds.cy;
    });
    const avgCy = sumCy / elements.length;

    // Align all to average center
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        const newY = avgCy - bounds.height / 2;
        moveElement(el, bounds.x, newY);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned middle');
}

/**
 * Align selected elements to their bottom edges
 */
function alignBottom() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 2) return;

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find bottommost edge
    let maxBottom = -Infinity;
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        maxBottom = Math.max(maxBottom, bounds.bottom);
    });

    // Align all to bottommost
    elements.forEach(el => {
        const bounds = getElementBounds(el);
        const newY = maxBottom - bounds.height;
        moveElement(el, bounds.x, newY);
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Aligned bottom');
}

/**
 * Distribute selected elements horizontally with even spacing
 */
function distributeHorizontally() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 3) {
        showNotification('Need 3+ elements to distribute');
        return;
    }

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Sort by x position
    const sorted = elements.slice().sort((a, b) => {
        return getElementBounds(a).x - getElementBounds(b).x;
    });

    // Calculate total width and spacing
    const firstBounds = getElementBounds(sorted[0]);
    const lastBounds = getElementBounds(sorted[sorted.length - 1]);

    const totalSpan = lastBounds.right - firstBounds.x;
    let totalElementWidth = 0;
    sorted.forEach(el => {
        totalElementWidth += getElementBounds(el).width;
    });

    const totalGap = totalSpan - totalElementWidth;
    const gap = totalGap / (sorted.length - 1);

    // Position elements
    let currentX = firstBounds.x;
    sorted.forEach(el => {
        const bounds = getElementBounds(el);
        moveElement(el, currentX, bounds.y);
        currentX += bounds.width + gap;
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Distributed horizontally');
}

/**
 * Distribute selected elements vertically with even spacing
 */
function distributeVertically() {
    const elements = window.selectionAPI.getSelectedElements();
    if (elements.length < 3) {
        showNotification('Need 3+ elements to distribute');
        return;
    }

    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Sort by y position
    const sorted = elements.slice().sort((a, b) => {
        return getElementBounds(a).y - getElementBounds(b).y;
    });

    // Calculate total height and spacing
    const firstBounds = getElementBounds(sorted[0]);
    const lastBounds = getElementBounds(sorted[sorted.length - 1]);

    const totalSpan = lastBounds.bottom - firstBounds.y;
    let totalElementHeight = 0;
    sorted.forEach(el => {
        totalElementHeight += getElementBounds(el).height;
    });

    const totalGap = totalSpan - totalElementHeight;
    const gap = totalGap / (sorted.length - 1);

    // Position elements
    let currentY = firstBounds.y;
    sorted.forEach(el => {
        const bounds = getElementBounds(el);
        moveElement(el, bounds.x, currentY);
        currentY += bounds.height + gap;
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Distributed vertically');
}

/**
 * Check if alignment/distribution actions are available
 * @returns {Object} { canAlign, canDistribute }
 */
function getAlignmentState() {
    const count = window.selectionAPI.getSelectionCount();
    return {
        canAlign: count >= 2,
        canDistribute: count >= 3
    };
}

// Note: showNotification is provided by notification.js

// Export for use by other modules
window.alignment = {
    alignLeft,
    alignCenterH,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontally,
    distributeVertically,
    getAlignmentState
};
