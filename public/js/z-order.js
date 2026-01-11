// Z-order management for canvas elements
// Controls which elements appear in front of or behind others

/**
 * Bring element(s) to the front (highest z-order)
 * @param {Array|Object} elements - SVG.js element(s) to bring to front
 */
function bringToFront(elements) {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    if (elementsArray.length === 0) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (!currentCanvas) return;

    // Find the highest zIndex
    const maxZIndex = Math.max(...currentCanvas.elements.map(el => el.zIndex || 0));

    // Update each element
    elementsArray.forEach((element, idx) => {
        const elementData = element.data('elementData');
        if (!elementData) return;

        // Set new zIndex
        elementData.zIndex = maxZIndex + idx + 1;
        element.data('elementData', elementData);

        // Update in canvas data
        const canvasIndex = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (canvasIndex !== -1) {
            currentCanvas.elements[canvasIndex] = elementData;
        }

        // Move SVG element to front (end of parent)
        if (element.node && element.node.parentNode) {
            element.node.parentNode.appendChild(element.node);
        }
    });

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();
    showNotification('Brought to front');
}

/**
 * Send element(s) to the back (lowest z-order)
 * @param {Array|Object} elements - SVG.js element(s) to send to back
 */
function sendToBack(elements) {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    if (elementsArray.length === 0) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (!currentCanvas) return;

    // Find the lowest zIndex
    const minZIndex = Math.min(...currentCanvas.elements.map(el => el.zIndex || 0));

    // Update each element (in reverse order to maintain relative order)
    elementsArray.reverse().forEach((element, idx) => {
        const elementData = element.data('elementData');
        if (!elementData) return;

        // Set new zIndex
        elementData.zIndex = minZIndex - elementsArray.length + idx;
        element.data('elementData', elementData);

        // Update in canvas data
        const canvasIndex = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (canvasIndex !== -1) {
            currentCanvas.elements[canvasIndex] = elementData;
        }

        // Move SVG element to back (beginning of parent, after defs/etc)
        if (element.node && element.node.parentNode) {
            const parent = element.node.parentNode;
            const firstNonDefs = Array.from(parent.children).find(
                child => child.tagName !== 'defs' && child.tagName !== 'desc' && child.tagName !== 'title'
            );
            if (firstNonDefs) {
                parent.insertBefore(element.node, firstNonDefs);
            }
        }
    });

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();
    showNotification('Sent to back');
}

/**
 * Bring element(s) forward one step
 * @param {Array|Object} elements - SVG.js element(s) to bring forward
 */
function bringForward(elements) {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    if (elementsArray.length === 0) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (!currentCanvas) return;

    // Sort elements by current zIndex (ascending)
    const sortedElements = [...elementsArray].sort((a, b) => {
        const aData = a.data('elementData');
        const bData = b.data('elementData');
        return (aData?.zIndex || 0) - (bData?.zIndex || 0);
    });

    // Process from highest to lowest to avoid conflicts
    sortedElements.reverse().forEach(element => {
        const elementData = element.data('elementData');
        if (!elementData) return;

        // Find the next element in z-order
        const currentZIndex = elementData.zIndex || 0;
        const otherElements = currentCanvas.elements
            .filter(el => el.id !== elementData.id && (el.zIndex || 0) > currentZIndex)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        if (otherElements.length > 0) {
            // Swap with the next element
            const nextElement = otherElements[0];
            elementData.zIndex = nextElement.zIndex;
            nextElement.zIndex = currentZIndex;

            element.data('elementData', elementData);

            // Update canvas data
            const currentIndex = currentCanvas.elements.findIndex(el => el.id === elementData.id);
            const nextIndex = currentCanvas.elements.findIndex(el => el.id === nextElement.id);
            if (currentIndex !== -1) currentCanvas.elements[currentIndex] = elementData;
            if (nextIndex !== -1) currentCanvas.elements[nextIndex] = nextElement;

            // Reorder SVG: move this element after the next sibling
            if (element.node && element.node.nextElementSibling) {
                const nextSibling = element.node.nextElementSibling;
                if (nextSibling.nextSibling) {
                    element.node.parentNode.insertBefore(element.node, nextSibling.nextSibling);
                } else {
                    element.node.parentNode.appendChild(element.node);
                }
            }
        }
    });

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();
    showNotification('Brought forward');
}

/**
 * Send element(s) backward one step
 * @param {Array|Object} elements - SVG.js element(s) to send backward
 */
function sendBackward(elements) {
    const elementsArray = Array.isArray(elements) ? elements : [elements];
    if (elementsArray.length === 0) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (!currentCanvas) return;

    // Sort elements by current zIndex (descending)
    const sortedElements = [...elementsArray].sort((a, b) => {
        const aData = a.data('elementData');
        const bData = b.data('elementData');
        return (bData?.zIndex || 0) - (aData?.zIndex || 0);
    });

    // Process from lowest to highest to avoid conflicts
    sortedElements.reverse().forEach(element => {
        const elementData = element.data('elementData');
        if (!elementData) return;

        // Find the previous element in z-order
        const currentZIndex = elementData.zIndex || 0;
        const otherElements = currentCanvas.elements
            .filter(el => el.id !== elementData.id && (el.zIndex || 0) < currentZIndex)
            .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

        if (otherElements.length > 0) {
            // Swap with the previous element
            const prevElement = otherElements[0];
            elementData.zIndex = prevElement.zIndex;
            prevElement.zIndex = currentZIndex;

            element.data('elementData', elementData);

            // Update canvas data
            const currentIndex = currentCanvas.elements.findIndex(el => el.id === elementData.id);
            const prevIndex = currentCanvas.elements.findIndex(el => el.id === prevElement.id);
            if (currentIndex !== -1) currentCanvas.elements[currentIndex] = elementData;
            if (prevIndex !== -1) currentCanvas.elements[prevIndex] = prevElement;

            // Reorder SVG: move this element before its previous sibling
            if (element.node && element.node.previousElementSibling) {
                const prevSibling = element.node.previousElementSibling;
                element.node.parentNode.insertBefore(element.node, prevSibling);
            }
        }
    });

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();
    showNotification('Sent backward');
}

// Note: showNotification is provided by notification.js

/**
 * Attach keyboard shortcuts for z-order operations
 */
function attachKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Don't capture when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const selectedElements = window.selectionAPI.getSelectedElements();
        if (selectedElements.length === 0) return;

        // Ctrl/Cmd + ] for bring forward, Ctrl/Cmd + Shift + ] for bring to front
        if ((event.ctrlKey || event.metaKey) && event.key === ']') {
            event.preventDefault();
            if (event.shiftKey) {
                bringToFront(selectedElements);
            } else {
                bringForward(selectedElements);
            }
        }

        // Ctrl/Cmd + [ for send backward, Ctrl/Cmd + Shift + [ for send to back
        if ((event.ctrlKey || event.metaKey) && event.key === '[') {
            event.preventDefault();
            if (event.shiftKey) {
                sendToBack(selectedElements);
            } else {
                sendBackward(selectedElements);
            }
        }
    });
}

// Initialize keyboard shortcuts when DOM is ready
onReady(attachKeyboardShortcuts);

// Export for use by other modules
window.zOrder = {
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward
};
