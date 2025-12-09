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
 * Filter presets for quick one-click effects
 */
const FILTER_PRESETS = [
    {
        id: 'bw',
        name: 'Black & White',
        icon: 'fa-adjust',
        filters: { grayscale: 100 }
    },
    {
        id: 'vintage',
        name: 'Vintage',
        icon: 'fa-film',
        filters: { sepia: 40, contrast: 110, brightness: 95 }
    },
    {
        id: 'high-contrast',
        name: 'High Contrast',
        icon: 'fa-circle-half-stroke',
        filters: { contrast: 150, brightness: 105 }
    },
    {
        id: 'faded',
        name: 'Faded',
        icon: 'fa-cloud',
        filters: { contrast: 80, brightness: 110, saturate: 80 }
    },
    {
        id: 'dramatic',
        name: 'Dramatic',
        icon: 'fa-bolt',
        filters: { contrast: 130, brightness: 90, saturate: 120 }
    },
    {
        id: 'muted',
        name: 'Muted',
        icon: 'fa-moon',
        filters: { saturate: 50, brightness: 105 }
    },
    {
        id: 'warm',
        name: 'Warm',
        icon: 'fa-sun',
        filters: { sepia: 20, saturate: 110 }
    },
    {
        id: 'cool',
        name: 'Cool',
        icon: 'fa-snowflake',
        filters: { hueRotate: 180, saturate: 80 }
    }
];

/**
 * Filter panel configuration
 */
const FILTER_SLIDERS = [
    { key: 'brightness', label: 'Brightness', min: 0, max: 200, default: 100, unit: '%' },
    { key: 'contrast', label: 'Contrast', min: 0, max: 200, default: 100, unit: '%' },
    { key: 'saturate', label: 'Saturation', min: 0, max: 200, default: 100, unit: '%' },
    { key: 'grayscale', label: 'Grayscale', min: 0, max: 100, default: 0, unit: '%' },
    { key: 'sepia', label: 'Sepia', min: 0, max: 100, default: 0, unit: '%' },
    { key: 'blur', label: 'Blur', min: 0, max: 20, default: 0, unit: 'px', step: 0.5 },
    { key: 'hueRotate', label: 'Hue Rotate', min: 0, max: 360, default: 0, unit: '°' },
    { key: 'invert', label: 'Invert', min: 0, max: 100, default: 0, unit: '%' },
    { key: 'opacity', label: 'Opacity', min: 0, max: 100, default: 100, unit: '%' }
];

// Filter panel state
let filterPanelElement = null;
let filterPanelTarget = null;
let filterPanelOriginalFilters = null;

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

/**
 * Get all available filter presets
 * @returns {Array} Array of preset configurations
 */
function getPresets() {
    return FILTER_PRESETS;
}

/**
 * Apply a filter preset to an element
 * @param {Object} element - SVG.js image element
 * @param {string} presetId - The preset ID to apply
 */
function applyPreset(element, presetId) {
    if (!element) return;

    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (!preset) {
        showNotification('Preset not found');
        return;
    }

    // Verify it's an image element
    const elementData = element.data('elementData');
    if (!elementData || elementData.type !== 'image') {
        showNotification('Presets only work on images');
        return;
    }

    // Start with default filters and apply preset values
    const newFilters = { ...DEFAULT_FILTERS, ...preset.filters };

    // Use setFilters to apply with undo support
    setFilters(element, newFilters, true);

    showNotification(`${preset.name} applied`);
}

/**
 * Apply a filter preset to all selected elements
 * @param {string} presetId - The preset ID to apply
 */
function applyPresetToSelection(presetId) {
    const selectedElements = window.selectionAPI?.getSelectedElements() || [];
    const imageElements = selectedElements.filter(el => {
        const data = el.data?.('elementData');
        return data && data.type === 'image';
    });

    if (imageElements.length === 0) {
        showNotification('Select image(s) first');
        return;
    }

    // Record single undo state for all changes
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    imageElements.forEach(element => {
        const newFilters = { ...DEFAULT_FILTERS, ...preset.filters };
        setFilters(element, newFilters, false); // Don't record undo per element
    });

    showNotification(`${preset.name} applied to ${imageElements.length} image${imageElements.length > 1 ? 's' : ''}`);
}

/**
 * Create the filter panel DOM element
 */
function createFilterPanel() {
    filterPanelElement = document.createElement('div');
    filterPanelElement.id = 'filter-panel';
    filterPanelElement.className = 'filter-panel';

    const slidersHtml = FILTER_SLIDERS.map(slider => `
        <div class="filter-slider-row">
            <label class="filter-slider-label">
                <span class="filter-slider-name">${slider.label}</span>
                <span class="filter-slider-value" id="filter-value-${slider.key}">${slider.default}${slider.unit}</span>
            </label>
            <input type="range"
                   id="filter-${slider.key}"
                   class="filter-slider"
                   data-filter="${slider.key}"
                   min="${slider.min}"
                   max="${slider.max}"
                   value="${slider.default}"
                   step="${slider.step || 1}">
        </div>
    `).join('');

    const presetsHtml = FILTER_PRESETS.map(preset => `
        <button class="filter-preset-btn" data-preset="${preset.id}" title="${preset.name}">
            <i class="fa-solid ${preset.icon}"></i>
            <span>${preset.name}</span>
        </button>
    `).join('');

    filterPanelElement.innerHTML = `
        <div class="modal-overlay" id="filter-panel-overlay"></div>
        <div class="filter-panel-content">
            <div class="filter-panel-header">
                <h3>Adjust Filters</h3>
                <button id="filter-panel-close" class="modal-close">&times;</button>
            </div>
            <div class="filter-panel-body">
                <div class="filter-presets-section">
                    <div class="filter-section-label">Presets</div>
                    <div class="filter-presets-grid">
                        ${presetsHtml}
                    </div>
                </div>
                <div class="filter-sliders-section">
                    <div class="filter-section-label">Manual Adjustments</div>
                    <div class="filter-sliders">
                        ${slidersHtml}
                    </div>
                </div>
            </div>
            <div class="filter-panel-footer">
                <button id="filter-reset-btn" class="modal-button filter-reset-btn">Reset All</button>
                <div class="filter-panel-actions">
                    <button id="filter-cancel-btn" class="modal-button modal-cancel">Cancel</button>
                    <button id="filter-apply-btn" class="modal-button modal-ok">Apply</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(filterPanelElement);
    attachFilterPanelListeners();
}

/**
 * Attach event listeners for the filter panel
 */
function attachFilterPanelListeners() {
    // Close button
    document.getElementById('filter-panel-close').addEventListener('click', cancelFilterPanel);
    document.getElementById('filter-panel-overlay').addEventListener('click', cancelFilterPanel);
    document.getElementById('filter-cancel-btn').addEventListener('click', cancelFilterPanel);

    // Apply button
    document.getElementById('filter-apply-btn').addEventListener('click', applyFilterPanel);

    // Reset button
    document.getElementById('filter-reset-btn').addEventListener('click', resetFilterPanel);

    // Slider inputs - live preview
    document.querySelectorAll('.filter-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const filterKey = e.target.dataset.filter;
            const value = parseFloat(e.target.value);
            const config = FILTER_SLIDERS.find(s => s.key === filterKey);

            // Update value display
            const valueEl = document.getElementById(`filter-value-${filterKey}`);
            if (valueEl && config) {
                valueEl.textContent = `${value}${config.unit}`;
            }

            // Apply live preview (without recording undo)
            if (filterPanelTarget) {
                setFilters(filterPanelTarget, { [filterKey]: value }, false);
            }
        });
    });

    // Preset buttons - apply preset and update sliders
    document.querySelectorAll('.filter-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetId = e.currentTarget.dataset.preset;
            const preset = FILTER_PRESETS.find(p => p.id === presetId);
            if (!preset) return;

            // Apply preset filters to sliders and live preview
            const newFilters = { ...DEFAULT_FILTERS, ...preset.filters };

            // Update each slider
            FILTER_SLIDERS.forEach(slider => {
                const sliderEl = document.getElementById(`filter-${slider.key}`);
                const valueEl = document.getElementById(`filter-value-${slider.key}`);
                const value = newFilters[slider.key] !== undefined ? newFilters[slider.key] : slider.default;
                if (sliderEl) sliderEl.value = value;
                if (valueEl) valueEl.textContent = `${value}${slider.unit}`;
            });

            // Apply live preview
            if (filterPanelTarget) {
                applyFilters(filterPanelTarget, newFilters);
            }
        });
    });

    // Keyboard handling
    document.addEventListener('keydown', handleFilterPanelKeyboard);
}

/**
 * Handle keyboard events for filter panel
 */
function handleFilterPanelKeyboard(e) {
    if (!filterPanelElement || !filterPanelElement.classList.contains('show')) {
        return;
    }

    if (e.key === 'Escape') {
        e.preventDefault();
        cancelFilterPanel();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        applyFilterPanel();
    }
}

/**
 * Show the filter panel for an element
 * @param {Object} element - SVG.js image element to adjust
 */
function showFilterPanel(element) {
    if (!element) return;

    // Verify it's an image element
    const elementData = element.data('elementData');
    if (!elementData || elementData.type !== 'image') {
        showNotification('Filters only work on images');
        return;
    }

    if (!filterPanelElement) {
        createFilterPanel();
    }

    // Store target and original filters for cancel
    filterPanelTarget = element;
    filterPanelOriginalFilters = { ...getFilters(element) };

    // Update sliders to current values
    const currentFilters = getFilters(element);
    FILTER_SLIDERS.forEach(slider => {
        const sliderEl = document.getElementById(`filter-${slider.key}`);
        const valueEl = document.getElementById(`filter-value-${slider.key}`);
        if (sliderEl && valueEl) {
            const value = currentFilters[slider.key] !== undefined ? currentFilters[slider.key] : slider.default;
            sliderEl.value = value;
            valueEl.textContent = `${value}${slider.unit}`;
        }
    });

    // Show panel
    filterPanelElement.classList.add('show');
}

/**
 * Hide the filter panel
 */
function hideFilterPanel() {
    if (filterPanelElement) {
        filterPanelElement.classList.remove('show');
    }
    filterPanelTarget = null;
    filterPanelOriginalFilters = null;
}

/**
 * Cancel filter changes and restore original values
 */
function cancelFilterPanel() {
    if (filterPanelTarget && filterPanelOriginalFilters) {
        // Restore original filters without recording undo
        applyFilters(filterPanelTarget, filterPanelOriginalFilters);

        // Also restore the element data
        const elementData = filterPanelTarget.data('elementData');
        if (elementData) {
            if (Object.keys(filterPanelOriginalFilters).every(
                k => filterPanelOriginalFilters[k] === DEFAULT_FILTERS[k]
            )) {
                delete elementData.filters;
            } else {
                elementData.filters = { ...filterPanelOriginalFilters };
                // Clean up default values
                Object.keys(DEFAULT_FILTERS).forEach(key => {
                    if (elementData.filters[key] === DEFAULT_FILTERS[key]) {
                        delete elementData.filters[key];
                    }
                });
                if (Object.keys(elementData.filters).length === 0) {
                    delete elementData.filters;
                }
            }
            filterPanelTarget.data('elementData', elementData);
        }
    }
    hideFilterPanel();
}

/**
 * Apply filter changes (records undo and saves)
 */
function applyFilterPanel() {
    if (filterPanelTarget) {
        // Record undo for the overall change
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

        // Get current slider values
        const newFilters = {};
        FILTER_SLIDERS.forEach(slider => {
            const sliderEl = document.getElementById(`filter-${slider.key}`);
            if (sliderEl) {
                newFilters[slider.key] = parseFloat(sliderEl.value);
            }
        });

        // Update element data
        const elementData = filterPanelTarget.data('elementData');
        if (elementData) {
            elementData.filters = { ...newFilters };

            // Remove default values
            Object.keys(DEFAULT_FILTERS).forEach(key => {
                if (elementData.filters[key] === DEFAULT_FILTERS[key]) {
                    delete elementData.filters[key];
                }
            });
            if (Object.keys(elementData.filters).length === 0) {
                delete elementData.filters;
            }

            filterPanelTarget.data('elementData', elementData);

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

        showNotification('Filters applied');
    }
    hideFilterPanel();
}

/**
 * Reset all sliders to defaults
 */
function resetFilterPanel() {
    FILTER_SLIDERS.forEach(slider => {
        const sliderEl = document.getElementById(`filter-${slider.key}`);
        const valueEl = document.getElementById(`filter-value-${slider.key}`);
        if (sliderEl && valueEl) {
            sliderEl.value = slider.default;
            valueEl.textContent = `${slider.default}${slider.unit}`;
        }
    });

    // Apply live preview
    if (filterPanelTarget) {
        const defaultFilters = {};
        FILTER_SLIDERS.forEach(slider => {
            defaultFilters[slider.key] = slider.default;
        });
        applyFilters(filterPanelTarget, defaultFilters);
    }
}

// Export for use by other modules
window.imageFilters = {
    DEFAULT_FILTERS,
    FILTER_PRESETS,
    buildFilterString,
    applyFilters,
    getFilters,
    setFilters,
    resetFilters,
    toggleFilter,
    applyLoadedFilters,
    hasFilters,
    getPresets,
    applyPreset,
    applyPresetToSelection,
    showFilterPanel,
    hideFilterPanel
};
