// Image filter management for non-destructive image effects
// Stores filter settings in element data and applies via CSS filters

/**
 * Default filter values (no effect applied)
 */
const DEFAULT_FILTERS = {
    grayscale: 0,      // 0-100%
    brightness: 100,   // 0-200% (100 = normal)
    contrast: 100,     // 0-200% (100 = normal)
    blur: 0,           // 0-20px
    sepia: 0,          // 0-100%
    saturate: 100,     // 0-200% (100 = normal)
    hueRotate: 0,      // 0-360deg
    invert: 0,         // 0-100%
    opacity: 100       // 0-100%
};

/**
 * Build a CSS filter string from a filter object
 * @param {Object} filters - Filter values
 * @returns {string} CSS filter property value
 */
function buildFilterString(filters) {
    if (!filters) return 'none';

    const parts = [];

    // Only add filters that differ from default (optimization)
    if (filters.grayscale && filters.grayscale !== 0) {
        parts.push(`grayscale(${filters.grayscale}%)`);
    }
    if (filters.brightness !== undefined && filters.brightness !== 100) {
        parts.push(`brightness(${filters.brightness}%)`);
    }
    if (filters.contrast !== undefined && filters.contrast !== 100) {
        parts.push(`contrast(${filters.contrast}%)`);
    }
    if (filters.blur && filters.blur !== 0) {
        parts.push(`blur(${filters.blur}px)`);
    }
    if (filters.sepia && filters.sepia !== 0) {
        parts.push(`sepia(${filters.sepia}%)`);
    }
    if (filters.saturate !== undefined && filters.saturate !== 100) {
        parts.push(`saturate(${filters.saturate}%)`);
    }
    if (filters.hueRotate && filters.hueRotate !== 0) {
        parts.push(`hue-rotate(${filters.hueRotate}deg)`);
    }
    if (filters.invert && filters.invert !== 0) {
        parts.push(`invert(${filters.invert}%)`);
    }
    if (filters.opacity !== undefined && filters.opacity !== 100) {
        parts.push(`opacity(${filters.opacity}%)`);
    }

    return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Apply filters to an SVG image element
 * @param {Object} element - SVG.js element
 * @param {Object} filters - Filter values
 */
function applyFilters(element, filters) {
    if (!element || !element.node) return;

    const filterString = buildFilterString(filters);
    element.node.style.filter = filterString;
}

/**
 * Get current filters from an element
 * @param {Object} element - SVG.js element
 * @returns {Object} Current filter values (or defaults)
 */
function getFilters(element) {
    if (!element) return { ...DEFAULT_FILTERS };

    const elementData = element.data('elementData');
    if (elementData && elementData.filters) {
        return { ...DEFAULT_FILTERS, ...elementData.filters };
    }

    return { ...DEFAULT_FILTERS };
}

/**
 * Set filters on an element (updates data and applies CSS)
 * @param {Object} element - SVG.js element
 * @param {Object} filters - New filter values
 * @param {boolean} recordUndo - Whether to record for undo/redo (default true)
 */
function setFilters(element, filters, recordUndo = true) {
    if (!element) return;

    const elementData = element.data('elementData');
    if (!elementData) return;

    // Record state before modification for undo
    if (recordUndo && window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Merge with existing filters
    elementData.filters = { ...DEFAULT_FILTERS, ...(elementData.filters || {}), ...filters };

    // Remove filters that are at default values to keep data clean
    Object.keys(DEFAULT_FILTERS).forEach(key => {
        if (elementData.filters[key] === DEFAULT_FILTERS[key]) {
            delete elementData.filters[key];
        }
    });

    // If all filters are default, remove the filters object entirely
    if (Object.keys(elementData.filters).length === 0) {
        delete elementData.filters;
    }

    // Update element data
    element.data('elementData', elementData);

    // Apply CSS filters
    applyFilters(element, elementData.filters);

    // Update canvas data
    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (currentCanvas) {
        const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (index !== -1) {
            currentCanvas.elements[index] = elementData;
        }
        // Trigger auto-save
        window.canvasCore.scheduleAutoSave();
    }
}

/**
 * Reset all filters on an element to defaults
 * @param {Object} element - SVG.js element
 */
function resetFilters(element) {
    if (!element) return;

    const elementData = element.data('elementData');
    if (!elementData) return;

    // Record state before modification for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Remove filters from element data
    delete elementData.filters;

    // Update element data
    element.data('elementData', elementData);

    // Clear CSS filters
    if (element.node) {
        element.node.style.filter = 'none';
    }

    // Update canvas data
    const currentCanvas = window.canvasCore.getCurrentCanvas();
    if (currentCanvas) {
        const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (index !== -1) {
            currentCanvas.elements[index] = elementData;
        }
        window.canvasCore.scheduleAutoSave();
    }

    showNotification('Filters reset');
}

/**
 * Toggle a simple filter (on/off at 100%)
 * @param {Object} element - SVG.js element
 * @param {string} filterName - Filter name (grayscale, sepia, invert)
 */
function toggleFilter(element, filterName) {
    if (!element) return;

    const currentFilters = getFilters(element);
    const currentValue = currentFilters[filterName] || 0;

    // Toggle: if currently 0, set to 100; otherwise set to 0
    const newValue = currentValue === 0 ? 100 : 0;

    setFilters(element, { [filterName]: newValue });

    const filterLabel = filterName.charAt(0).toUpperCase() + filterName.slice(1);
    showNotification(newValue === 0 ? `${filterLabel} off` : `${filterLabel} applied`);
}

/**
 * Apply filters to element during canvas loading
 * This is called from addImageToCanvas
 * @param {Object} element - SVG.js element
 * @param {Object} imageData - Element data with optional filters
 */
function applyLoadedFilters(element, imageData) {
    if (imageData && imageData.filters) {
        applyFilters(element, imageData.filters);
    }
}

/**
 * Show a brief notification
 * @param {string} message - Message to display
 */
function showNotification(message) {
    const notification = document.getElementById('autosave-notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'autosave-notification';
    notification.style.background = '#2196F3';
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 1200);
}

/**
 * Check if an element has any non-default filters
 * @param {Object} element - SVG.js element
 * @returns {boolean} True if element has filters applied
 */
function hasFilters(element) {
    if (!element) return false;

    const elementData = element.data('elementData');
    return elementData && elementData.filters && Object.keys(elementData.filters).length > 0;
}

// Export for use by other modules
window.imageFilters = {
    DEFAULT_FILTERS,
    buildFilterString,
    applyFilters,
    getFilters,
    setFilters,
    resetFilters,
    toggleFilter,
    applyLoadedFilters,
    hasFilters
};
