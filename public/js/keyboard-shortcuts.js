// Additional keyboard shortcuts for canvas operations
// Consolidates remaining shortcuts not handled by specific modules

/**
 * Select all elements on the canvas
 */
function selectAll() {
    const canvas = window.canvasCore.getCanvas();
    const currentCanvas = window.canvasCore.getCurrentCanvas();

    if (!canvas || !currentCanvas) return;

    const allElements = canvas.children().filter(child => {
        return child.node && child.node.classList.contains('canvas-element');
    });

    if (allElements.length > 0) {
        window.selectionAPI.selectElements(allElements, canvas);
        showNotification(`Selected ${allElements.length} element${allElements.length > 1 ? 's' : ''}`);
    } else {
        showNotification('No elements to select');
    }
}

/**
 * Deselect all elements
 */
function deselectAll() {
    if (window.selectionAPI.getSelectionCount() > 0) {
        window.selectionAPI.deselectElement();
        showNotification('Deselected');
    }
}

/**
 * Toggle grayscale filter on selected image(s)
 */
function toggleGrayscale() {
    const selectedElements = window.selectionAPI.getSelectedElements();
    selectedElements.forEach(element => {
        const data = element.data('elementData');
        if (data && data.type === 'image' && window.imageFilters) {
            window.imageFilters.toggleFilter(element, 'grayscale');
        }
    });
}

/**
 * Toggle sepia filter on selected image(s)
 */
function toggleSepia() {
    const selectedElements = window.selectionAPI.getSelectedElements();
    selectedElements.forEach(element => {
        const data = element.data('elementData');
        if (data && data.type === 'image' && window.imageFilters) {
            window.imageFilters.toggleFilter(element, 'sepia');
        }
    });
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

        // Ctrl/Cmd + A: Select All
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
            event.preventDefault();
            selectAll();
        }

        // Escape: Deselect All
        if (event.key === 'Escape') {
            const selectedCount = window.selectionAPI.getSelectionCount();
            if (selectedCount > 0) {
                event.preventDefault();
                deselectAll();
            }
        }

        // Note: Ctrl/Cmd + Shift + G is now used for Ungroup (handled in grouping.js)
        // Grayscale can be toggled via right-click context menu

        // Ctrl/Cmd + Shift + S: Toggle Sepia (avoid conflict with Save in some apps)
        // Using Alt+S instead to avoid browser conflicts
        if (event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            toggleSepia();
        }

        // Backspace: Delete selected elements (in addition to Delete key)
        if (event.key === 'Backspace' && window.selectionAPI.getSelectionCount() > 0) {
            event.preventDefault();
            window.canvasCore.deleteSelectedElement();
        }

        // Ctrl/Cmd + L: Toggle lock on selected elements
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
            event.preventDefault();
            if (window.layersPanel) {
                window.layersPanel.toggleLockSelected();
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachKeyboardShortcuts);
} else {
    attachKeyboardShortcuts();
}

// Export for use by other modules
window.keyboardShortcuts = {
    selectAll,
    deselectAll,
    toggleGrayscale,
    toggleSepia
};
