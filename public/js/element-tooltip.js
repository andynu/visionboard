// Element tooltip for Vision Board
// Shows element dimensions and position on hover

let tooltipElement = null;
let tooltipTimeout = null;
let currentHoverElement = null;
const TOOLTIP_DELAY = 500; // ms

/**
 * Initialize the tooltip system
 */
function initializeElementTooltip() {
    createTooltipElement();
    attachGlobalListeners();
}

/**
 * Create the tooltip DOM element
 */
function createTooltipElement() {
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'element-tooltip';
    tooltipElement.className = 'element-tooltip';
    tooltipElement.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-dimensions"></div>
            <div class="tooltip-position"></div>
            <div class="tooltip-extra"></div>
        </div>
    `;
    document.body.appendChild(tooltipElement);
}

/**
 * Attach global listeners for drag/resize state
 */
function attachGlobalListeners() {
    // Hide tooltip during drag operations
    document.addEventListener('mousedown', () => {
        hideTooltip();
    });

    // Also listen for resize start
    window.addEventListener('resizeStart', hideTooltip);
}

/**
 * Show tooltip for an element
 * @param {Object} svgElement - SVG.js element
 * @param {MouseEvent} event - Mouse event for positioning
 */
function showTooltip(svgElement, event) {
    if (!tooltipElement || !svgElement) return;

    const elementData = svgElement.data?.('elementData');
    if (!elementData) return;

    currentHoverElement = svgElement;

    // Get element dimensions and position
    const width = Math.round(elementData.width || svgElement.width?.() || 0);
    const height = Math.round(elementData.height || svgElement.height?.() || 0);
    const x = Math.round(elementData.x || svgElement.x?.() || 0);
    const y = Math.round(elementData.y || svgElement.y?.() || 0);

    // Build tooltip content
    const dimensionsEl = tooltipElement.querySelector('.tooltip-dimensions');
    const positionEl = tooltipElement.querySelector('.tooltip-position');
    const extraEl = tooltipElement.querySelector('.tooltip-extra');

    dimensionsEl.textContent = `${width} × ${height}`;
    positionEl.textContent = `X: ${x}, Y: ${y}`;

    // Extra info based on element type
    let extraInfo = '';
    if (elementData.type === 'image' && elementData.src) {
        // Extract filename from URL
        const parts = elementData.src.split('/');
        const filename = parts[parts.length - 1];
        extraInfo = filename.length > 25 ? filename.substring(0, 25) + '...' : filename;
    } else if (elementData.type === 'folder') {
        extraInfo = elementData.label || 'Folder';
    } else if (elementData.type === 'group') {
        const childCount = elementData.children?.length || 0;
        extraInfo = `Group (${childCount} items)`;
    }

    if (extraInfo) {
        extraEl.textContent = extraInfo;
        extraEl.style.display = 'block';
    } else {
        extraEl.style.display = 'none';
    }

    // Position tooltip near cursor but not blocking the element
    positionTooltip(event.clientX, event.clientY);

    // Show tooltip
    tooltipElement.classList.add('visible');
}

/**
 * Position the tooltip near the cursor
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
function positionTooltip(clientX, clientY) {
    if (!tooltipElement) return;

    const offset = 15; // Distance from cursor
    const padding = 10; // Distance from viewport edge

    // Get tooltip dimensions
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position - prefer bottom-right of cursor
    let left = clientX + offset;
    let top = clientY + offset;

    // Adjust if would overflow right edge
    if (left + tooltipRect.width + padding > viewportWidth) {
        left = clientX - tooltipRect.width - offset;
    }

    // Adjust if would overflow bottom edge
    if (top + tooltipRect.height + padding > viewportHeight) {
        top = clientY - tooltipRect.height - offset;
    }

    // Ensure not negative
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
}

/**
 * Hide the tooltip
 */
function hideTooltip() {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }

    if (tooltipElement) {
        tooltipElement.classList.remove('visible');
    }

    currentHoverElement = null;
}

/**
 * Schedule tooltip display after delay
 * @param {Object} svgElement - SVG.js element
 * @param {MouseEvent} event - Mouse event
 */
function scheduleTooltip(svgElement, event) {
    // Cancel any pending tooltip
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
    }

    // Don't show tooltip during drag/resize
    if (window.resizeAPI?.getIsResizing?.()) return;

    tooltipTimeout = setTimeout(() => {
        showTooltip(svgElement, event);
    }, TOOLTIP_DELAY);
}

/**
 * Attach tooltip handlers to an element
 * @param {Object} svgElement - SVG.js element
 */
function attachTooltipHandlers(svgElement) {
    if (!svgElement || !svgElement.node) return;

    const node = svgElement.node;

    node.addEventListener('mouseenter', (e) => {
        scheduleTooltip(svgElement, e);
    });

    node.addEventListener('mousemove', (e) => {
        // Update position if tooltip is visible
        if (tooltipElement?.classList.contains('visible') && currentHoverElement === svgElement) {
            positionTooltip(e.clientX, e.clientY);
        }
    });

    node.addEventListener('mouseleave', () => {
        hideTooltip();
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeElementTooltip);
} else {
    initializeElementTooltip();
}

// Export for use by other modules
window.elementTooltip = {
    attachHandlers: attachTooltipHandlers,
    show: showTooltip,
    hide: hideTooltip
};
