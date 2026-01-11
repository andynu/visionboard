// Element transformation utilities
// Handles flip, rotation, and other transforms

/**
 * Build transform string from element data
 * @param {Object} elementData - Element data with transform properties
 * @returns {string} CSS transform string
 */
function buildTransformString(elementData) {
    const transforms = [];

    // Handle flips
    if (elementData.flipH) {
        transforms.push('scaleX(-1)');
    }
    if (elementData.flipV) {
        transforms.push('scaleY(-1)');
    }

    return transforms.length > 0 ? transforms.join(' ') : '';
}

/**
 * Apply transforms to an SVG element
 * @param {Object} element - SVG.js element
 * @param {Object} elementData - Element data
 */
function applyTransforms(element, elementData) {
    if (!element || !element.node) return;

    const transformString = buildTransformString(elementData);

    if (transformString) {
        // Calculate center point for transform origin
        const bbox = element.bbox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        element.node.style.transformOrigin = `${centerX}px ${centerY}px`;
        element.node.style.transform = transformString;
    } else {
        element.node.style.transform = '';
        element.node.style.transformOrigin = '';
    }
}

/**
 * Flip element horizontally
 * @param {Object} element - SVG.js element
 */
function flipHorizontal(element) {
    if (!element) return;

    const elementData = element.data('elementData');
    if (!elementData) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Toggle flip state
    elementData.flipH = !elementData.flipH;
    element.data('elementData', elementData);

    // Apply transform
    applyTransforms(element, elementData);

    // Update canvas data
    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (currentCanvas) {
        const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (index !== -1) {
            currentCanvas.elements[index] = elementData;
        }
        window.canvasCore.scheduleAutoSave();
    }
}

/**
 * Flip element vertically
 * @param {Object} element - SVG.js element
 */
function flipVertical(element) {
    if (!element) return;

    const elementData = element.data('elementData');
    if (!elementData) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Toggle flip state
    elementData.flipV = !elementData.flipV;
    element.data('elementData', elementData);

    // Apply transform
    applyTransforms(element, elementData);

    // Update canvas data
    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (currentCanvas) {
        const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (index !== -1) {
            currentCanvas.elements[index] = elementData;
        }
        window.canvasCore.scheduleAutoSave();
    }
}

/**
 * Flip selected elements horizontally
 */
function flipSelectedHorizontal() {
    const selectedElements = window.selectionAPI.getSelectedElements();
    if (selectedElements.length === 0) return;

    // Record state once for all elements
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    selectedElements.forEach(element => {
        const elementData = element.data('elementData');
        if (elementData && elementData.type === 'image') {
            elementData.flipH = !elementData.flipH;
            element.data('elementData', elementData);
            applyTransforms(element, elementData);

            // Update canvas data
            const currentCanvas = window.canvasCore.getCurrentCanvas();
            if (currentCanvas) {
                const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
                if (index !== -1) {
                    currentCanvas.elements[index] = elementData;
                }
            }
        }
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Flipped horizontal');
}

/**
 * Flip selected elements vertically
 */
function flipSelectedVertical() {
    const selectedElements = window.selectionAPI.getSelectedElements();
    if (selectedElements.length === 0) return;

    // Record state once for all elements
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    selectedElements.forEach(element => {
        const elementData = element.data('elementData');
        if (elementData && elementData.type === 'image') {
            elementData.flipV = !elementData.flipV;
            element.data('elementData', elementData);
            applyTransforms(element, elementData);

            // Update canvas data
            const currentCanvas = window.canvasCore.getCurrentCanvas();
            if (currentCanvas) {
                const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
                if (index !== -1) {
                    currentCanvas.elements[index] = elementData;
                }
            }
        }
    });

    window.canvasCore.scheduleAutoSave();
    showNotification('Flipped vertical');
}

/**
 * Apply transforms during canvas loading
 * @param {Object} element - SVG.js element
 * @param {Object} elementData - Element data
 */
function applyLoadedTransforms(element, elementData) {
    if (elementData && (elementData.flipH || elementData.flipV)) {
        applyTransforms(element, elementData);
    }
}

// Note: showNotification is provided by notification.js

/**
 * Attach keyboard shortcuts
 */
function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Don't capture when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + Shift + H: Flip Horizontal
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
            event.preventDefault();
            flipSelectedHorizontal();
        }

        // Ctrl/Cmd + Shift + V: Flip Vertical (note: may conflict with paste special in some apps)
        // Using Alt+V instead to avoid conflicts
        if (event.altKey && event.key.toLowerCase() === 'v') {
            event.preventDefault();
            flipSelectedVertical();
        }
    });
}

// Initialize when DOM is ready
onReady(attachKeyboardShortcuts);

// Export for use by other modules
window.transform = {
    buildTransformString,
    applyTransforms,
    flipHorizontal,
    flipVertical,
    flipSelectedHorizontal,
    flipSelectedVertical,
    applyLoadedTransforms
};
