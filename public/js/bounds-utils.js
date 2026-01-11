// Bounds calculation utilities for Vision Board
// Consolidates similar bounds calculation functions from grouping.js, zoom-controls.js,
// export.js, and alignment.js into a single reusable module.

/**
 * Extract bounding box from different element types.
 * Handles SVG.js elements, DOM elements, and plain data objects.
 *
 * @param {Object} element - Element to get bounds from (SVG.js, DOM, or plain object)
 * @returns {Object} Bounding box { x, y, width, height }
 */
function getBoundsFromElement(element) {
    // SVG.js element with bbox() method
    if (element && typeof element.bbox === 'function') {
        const bbox = element.bbox();
        return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    }

    // SVG.js element with elementData attached
    if (element && typeof element.data === 'function') {
        const data = element.data('elementData');
        if (data) {
            return {
                x: data.x,
                y: data.y,
                width: data.width || 0,
                height: data.height || 0
            };
        }
    }

    // DOM SVG element with getBBox() method
    if (element && typeof element.getBBox === 'function') {
        const bbox = element.getBBox();
        return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    }

    // Plain data object with x, y, width, height properties
    if (element && typeof element.x === 'number' && typeof element.y === 'number') {
        return {
            x: element.x,
            y: element.y,
            width: element.width || 0,
            height: element.height || 0
        };
    }

    // Fallback
    return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Calculate the combined bounding box of multiple elements.
 * Works with arrays of SVG.js elements, DOM elements, or plain data objects.
 *
 * @param {Array} elements - Array of elements to calculate bounds for
 * @param {Object} options - Optional settings
 * @param {boolean} options.extended - Include extended properties (cx, cy, right, bottom)
 * @returns {Object|null} Combined bounding box or null if no valid elements
 */
function calculateBounds(elements, options = {}) {
    if (!elements || elements.length === 0) {
        return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(element => {
        const bounds = getBoundsFromElement(element);
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    // No valid bounds found
    if (minX === Infinity) {
        return null;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    const result = {
        x: minX,
        y: minY,
        width: width,
        height: height
    };

    // Add extended properties if requested
    if (options.extended) {
        result.cx = minX + width / 2;
        result.cy = minY + height / 2;
        result.right = maxX;
        result.bottom = maxY;
    }

    return result;
}

/**
 * Calculate bounds for a single element with extended properties.
 * Convenience function for getting full bounds info for one element.
 *
 * @param {Object} element - Single element (SVG.js, DOM, or plain object)
 * @returns {Object} Bounding box { x, y, width, height, cx, cy, right, bottom }
 */
function getElementBoundsExtended(element) {
    const bounds = getBoundsFromElement(element);
    return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        cx: bounds.x + bounds.width / 2,
        cy: bounds.y + bounds.height / 2,
        right: bounds.x + bounds.width,
        bottom: bounds.y + bounds.height
    };
}

/**
 * Calculate bounds from DOM elements matching a CSS selector.
 * Useful for export and rendering operations.
 *
 * @param {Element} container - Parent SVG element to search within
 * @param {string} selector - CSS selector for elements (default: '.canvas-element')
 * @returns {Object|null} Combined bounding box or null if no elements found
 */
function calculateBoundsFromSelector(container, selector = '.canvas-element') {
    const elements = container.querySelectorAll(selector);
    if (elements.length === 0) {
        return null;
    }
    return calculateBounds(Array.from(elements));
}

// Export for use by other modules
window.boundsUtils = {
    getBoundsFromElement,
    calculateBounds,
    getElementBoundsExtended,
    calculateBoundsFromSelector
};
