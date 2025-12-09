// Shared selection functionality for canvas elements
// Supports single and multi-selection
// Used by canvas-elements.js (mouse) and touch.js (touch)

let selectedElements = new Set();

function getSelectedElement() {
    // Return first selected element for backward compatibility
    return selectedElements.size > 0 ? Array.from(selectedElements)[0] : null;
}

function getSelectedElements() {
    return Array.from(selectedElements);
}

function setSelectedElement(element) {
    clearSelection();
    if (element) {
        selectedElements.add(element);
    }
}

function isSelected(element) {
    return selectedElements.has(element);
}

function getSelectionCount() {
    return selectedElements.size;
}

// Get handle IDs from an element (handles both SVG.js and DOM elements)
function getHandlesIds(element) {
    if (element.attr) {
        return element.attr('data-resize-handles-ids');
    }
    return element.getAttribute('data-resize-handles-ids');
}

// Add or remove class from element (handles both SVG.js and DOM elements)
function toggleClass(element, className, add) {
    if (element.node) {
        // SVG.js element - use DOM node
        if (add) {
            element.node.classList.add(className);
        } else {
            element.node.classList.remove(className);
        }
    } else if (element.classList) {
        // DOM element
        if (add) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    } else if (element.addClass && element.removeClass) {
        // SVG.js element without .node access
        if (add) {
            element.addClass(className);
        } else {
            element.removeClass(className);
        }
    }
}

// Show or hide resize handles for an element
function toggleResizeHandles(element, show) {
    const handlesIds = getHandlesIds(element);
    if (handlesIds) {
        const ids = handlesIds.split(',');
        ids.forEach(id => {
            const handle = document.getElementById(id);
            if (handle) {
                handle.style.setProperty('opacity', show ? '1' : '0', 'important');
                handle.style.setProperty('pointer-events', show ? 'all' : 'none', 'important');
            }
        });
    }
}

// Hide all resize handles in the document
function hideAllResizeHandles() {
    const allHandles = document.querySelectorAll('[id*="handles-"]');
    allHandles.forEach(handle => {
        handle.style.setProperty('opacity', '0', 'important');
        handle.style.setProperty('pointer-events', 'none', 'important');
        handle.classList.remove('visible');
    });
}

// Update folder stroke width for selection state
function updateFolderStroke(element, selected) {
    let elementData = null;
    if (element.data) {
        elementData = element.data('elementData');
    }

    if (elementData && elementData.type === 'folder' && element.find) {
        element.find('rect').first().stroke({ width: selected ? 3 : 2 });
    }
}

// Create selection rectangle for images (SVG images don't support stroke)
function createSelectionRect(element, canvas) {
    if (element.type !== 'image' || !canvas) return null;

    const bbox = element.bbox();
    const selectionRect = canvas.rect(bbox.width, bbox.height)
        .move(bbox.x, bbox.y)
        .fill('none')
        .stroke({ color: '#007AFF', width: 4 })
        .attr('id', 'selection-indicator-' + element.attr('id'))
        .attr('pointer-events', 'none');

    // Store reference directly on element (not via .data() which serializes to JSON)
    element._selectionRect = selectionRect;
    return selectionRect;
}

// Remove selection rectangle from an image element
function removeSelectionRect(element) {
    if (element.type !== 'image') return;

    const selectionRect = element._selectionRect;
    if (selectionRect) {
        selectionRect.remove();
        element._selectionRect = null;
    }
}

// Apply selection styling to an element
function applySelectionStyle(element, canvas) {
    toggleClass(element, 'selected', true);

    // Create selection indicator for images
    if (canvas && element.type === 'image') {
        createSelectionRect(element, canvas);
    }

    // Show resize handles only for single selection
    if (selectedElements.size === 1) {
        toggleResizeHandles(element, true);
    }

    updateFolderStroke(element, true);
}

// Remove selection styling from an element
function removeSelectionStyle(element) {
    toggleClass(element, 'selected', false);
    removeSelectionRect(element);
    toggleResizeHandles(element, false);
    updateFolderStroke(element, false);
}

// Main select function - used by both mouse and touch
// options.addToSelection: true to add to multi-selection (Shift+click)
// options.toggleSelection: true to toggle element in selection (Ctrl+click)
function selectElement(element, canvas, options = {}) {
    if (options.addToSelection && selectedElements.size > 0) {
        // Shift+click: Add to selection
        if (!selectedElements.has(element)) {
            selectedElements.add(element);
            applySelectionStyle(element, canvas);
            // Hide resize handles when multi-selecting
            hideAllResizeHandles();
        }
    } else if (options.toggleSelection) {
        // Ctrl+click: Toggle selection
        if (selectedElements.has(element)) {
            selectedElements.delete(element);
            removeSelectionStyle(element);
        } else {
            selectedElements.add(element);
            applySelectionStyle(element, canvas);
        }
        // Update resize handles visibility based on selection count
        if (selectedElements.size === 1) {
            const singleElement = Array.from(selectedElements)[0];
            toggleResizeHandles(singleElement, true);
        } else {
            hideAllResizeHandles();
        }
    } else {
        // Normal click: Replace selection
        clearSelection();
        selectedElements.add(element);
        applySelectionStyle(element, canvas);
    }

    // Haptic feedback for touch devices
    if (options.haptic && navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// Clear all selections
function clearSelection() {
    selectedElements.forEach(element => {
        removeSelectionStyle(element);
    });
    selectedElements.clear();
    hideAllResizeHandles();
}

// Main deselect function - used by both mouse and touch
function deselectElement() {
    clearSelection();
}

// Deselect a specific element from multi-selection
function deselectSpecificElement(element) {
    if (selectedElements.has(element)) {
        selectedElements.delete(element);
        removeSelectionStyle(element);
    }
}

// Select multiple elements at once (e.g., from marquee selection)
function selectElements(elements, canvas) {
    clearSelection();
    elements.forEach(element => {
        selectedElements.add(element);
        applySelectionStyle(element, canvas);
    });
    // Hide resize handles for multi-selection
    if (selectedElements.size > 1) {
        hideAllResizeHandles();
    }
}

// Export functions for use by other modules
window.selectionAPI = {
    selectElement,
    selectElements,
    deselectElement,
    deselectSpecificElement,
    clearSelection,
    getSelectedElement,
    getSelectedElements,
    setSelectedElement,
    isSelected,
    getSelectionCount,
    hideAllResizeHandles,
    toggleResizeHandles
};
