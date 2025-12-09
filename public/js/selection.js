// Shared selection functionality for canvas elements
// Used by both canvas.js (mouse) and touch.js (touch)

let selectedElement = null;

function getSelectedElement() {
    return selectedElement;
}

function setSelectedElement(element) {
    selectedElement = element;
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
    // Check for elementData to determine if it's a folder
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

    element.data('selectionRect', selectionRect);
    return selectionRect;
}

// Remove selection rectangle from an image element
function removeSelectionRect(element) {
    if (element.type !== 'image') return;

    const selectionRect = element.data ? element.data('selectionRect') : null;
    if (selectionRect) {
        selectionRect.remove();
        if (element.data) {
            element.data('selectionRect', null);
        }
    }
}

// Main select function - used by both mouse and touch
function selectElement(element, canvas, options = {}) {
    // Deselect current element first
    deselectElement();

    // Hide all resize handles first
    hideAllResizeHandles();

    // Set the new selected element
    selectedElement = element;

    // Add selected class
    toggleClass(element, 'selected', true);

    // Create selection indicator for images
    if (canvas && element.type === 'image') {
        createSelectionRect(element, canvas);
    }

    // Show resize handles
    toggleResizeHandles(element, true);

    // Update folder styling
    updateFolderStroke(element, true);

    // Haptic feedback for touch devices
    if (options.haptic && navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// Main deselect function - used by both mouse and touch
function deselectElement() {
    if (!selectedElement) return;

    // Remove selected class
    toggleClass(selectedElement, 'selected', false);

    // Remove selection indicator for images
    removeSelectionRect(selectedElement);

    // Hide resize handles
    toggleResizeHandles(selectedElement, false);

    // Update folder styling
    updateFolderStroke(selectedElement, false);

    // Clear selected element
    selectedElement = null;
}

// Export functions for use by other modules
window.selectionAPI = {
    selectElement,
    deselectElement,
    getSelectedElement,
    setSelectedElement,
    hideAllResizeHandles,
    toggleResizeHandles
};
