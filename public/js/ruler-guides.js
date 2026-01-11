// Ruler and guides for Vision Board
// Shows rulers along canvas edges with draggable guides for precise alignment

let rulersVisible = false;
let horizontalRuler = null;
let verticalRuler = null;
let rulerContainer = null;
let guidesContainer = null;
let guides = []; // Array of { axis: 'x'|'y', position: number, element: HTMLElement }
let draggingGuide = null;
let mousePositionMarker = { h: null, v: null };

const RULER_SIZE = 20; // pixels
const RULER_COLOR = '#2c2c2e';
const RULER_TEXT_COLOR = '#8e8e93';
const GUIDE_COLOR = '#818cf8';
const TICK_SMALL = 5;
const TICK_MEDIUM = 10;
const TICK_LARGE = 15;

/**
 * Initialize the ruler and guides system
 */
function initializeRulerGuides() {
    createRulerElements();
    attachRulerListeners();
    createGuidesContainer();
}

/**
 * Create ruler DOM elements
 */
function createRulerElements() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;

    // Create ruler container
    rulerContainer = document.createElement('div');
    rulerContainer.className = 'ruler-container';
    rulerContainer.innerHTML = `
        <div class="ruler-corner"></div>
        <canvas id="ruler-horizontal" class="ruler ruler-horizontal"></canvas>
        <canvas id="ruler-vertical" class="ruler ruler-vertical"></canvas>
    `;

    canvasContainer.insertBefore(rulerContainer, canvasContainer.firstChild);

    horizontalRuler = document.getElementById('ruler-horizontal');
    verticalRuler = document.getElementById('ruler-vertical');

    // Create mouse position markers
    const hMarker = document.createElement('div');
    hMarker.className = 'ruler-marker ruler-marker-h';
    rulerContainer.appendChild(hMarker);
    mousePositionMarker.h = hMarker;

    const vMarker = document.createElement('div');
    vMarker.className = 'ruler-marker ruler-marker-v';
    rulerContainer.appendChild(vMarker);
    mousePositionMarker.v = vMarker;
}

/**
 * Create guides container
 */
function createGuidesContainer() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;

    guidesContainer = document.createElement('div');
    guidesContainer.className = 'guides-container';
    canvasContainer.appendChild(guidesContainer);
}

/**
 * Attach event listeners for rulers
 */
function attachRulerListeners() {
    if (!horizontalRuler || !verticalRuler) return;

    // Drag from horizontal ruler to create horizontal guide
    horizontalRuler.addEventListener('mousedown', (e) => {
        if (!rulersVisible) return;
        const rect = horizontalRuler.getBoundingClientRect();
        const canvasX = screenToCanvasX(e.clientX);
        createGuide('y', canvasX, e.clientY - rect.bottom);
    });

    // Drag from vertical ruler to create vertical guide
    verticalRuler.addEventListener('mousedown', (e) => {
        if (!rulersVisible) return;
        const rect = verticalRuler.getBoundingClientRect();
        const canvasY = screenToCanvasY(e.clientY);
        createGuide('x', canvasY, e.clientX - rect.right);
    });

    // Track mouse position for markers
    document.addEventListener('mousemove', handleMouseMove);

    // Listen for viewbox changes to update rulers
    window.addEventListener('viewBoxChanged', updateRulers);
    window.addEventListener('resize', () => {
        resizeRulers();
        updateRulers();
    });
}

/**
 * Handle mouse move for position markers
 * @param {MouseEvent} e
 */
function handleMouseMove(e) {
    if (!rulersVisible) return;

    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer) return;

    const containerRect = canvasContainer.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    // Update horizontal marker
    if (mousePositionMarker.h && x >= RULER_SIZE) {
        mousePositionMarker.h.style.left = `${x}px`;
        mousePositionMarker.h.style.display = 'block';
    } else if (mousePositionMarker.h) {
        mousePositionMarker.h.style.display = 'none';
    }

    // Update vertical marker
    if (mousePositionMarker.v && y >= RULER_SIZE) {
        mousePositionMarker.v.style.top = `${y}px`;
        mousePositionMarker.v.style.display = 'block';
    } else if (mousePositionMarker.v) {
        mousePositionMarker.v.style.display = 'none';
    }
}

/**
 * Resize ruler canvases to match container
 */
function resizeRulers() {
    const canvasContainer = document.querySelector('.canvas-container');
    if (!canvasContainer || !horizontalRuler || !verticalRuler) return;

    const rect = canvasContainer.getBoundingClientRect();

    horizontalRuler.width = rect.width - RULER_SIZE;
    horizontalRuler.height = RULER_SIZE;

    verticalRuler.width = RULER_SIZE;
    verticalRuler.height = rect.height - RULER_SIZE;
}

/**
 * Update rulers based on current viewBox
 */
function updateRulers() {
    if (!rulersVisible) return;

    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return;

    resizeRulers();
    drawHorizontalRuler();
    drawVerticalRuler();
    updateGuidePositions();
}

/**
 * Draw the horizontal ruler
 */
function drawHorizontalRuler() {
    if (!horizontalRuler) return;

    const ctx = horizontalRuler.getContext('2d');
    const width = horizontalRuler.width;
    const height = horizontalRuler.height;

    // Clear
    ctx.fillStyle = RULER_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Get viewBox
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return;

    const vb = canvas.viewbox();
    const scale = width / vb.width;

    // Calculate tick interval based on zoom level
    const tickInterval = getTickInterval(scale);

    // Draw ticks and labels
    ctx.fillStyle = RULER_TEXT_COLOR;
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    const startX = Math.floor(vb.x / tickInterval) * tickInterval;
    const endX = vb.x + vb.width;

    for (let x = startX; x <= endX; x += tickInterval) {
        const screenX = (x - vb.x) * scale;

        // Determine tick size
        let tickSize = TICK_SMALL;
        if (x % (tickInterval * 10) === 0) {
            tickSize = TICK_LARGE;
            // Draw label
            ctx.fillText(Math.round(x).toString(), screenX, height - TICK_LARGE - 2);
        } else if (x % (tickInterval * 5) === 0) {
            tickSize = TICK_MEDIUM;
        }

        // Draw tick
        ctx.beginPath();
        ctx.strokeStyle = RULER_TEXT_COLOR;
        ctx.lineWidth = 1;
        ctx.moveTo(screenX, height);
        ctx.lineTo(screenX, height - tickSize);
        ctx.stroke();
    }
}

/**
 * Draw the vertical ruler
 */
function drawVerticalRuler() {
    if (!verticalRuler) return;

    const ctx = verticalRuler.getContext('2d');
    const width = verticalRuler.width;
    const height = verticalRuler.height;

    // Clear
    ctx.fillStyle = RULER_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Get viewBox
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return;

    const vb = canvas.viewbox();
    const scale = height / vb.height;

    // Calculate tick interval based on zoom level
    const tickInterval = getTickInterval(scale);

    // Draw ticks and labels
    ctx.fillStyle = RULER_TEXT_COLOR;
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';

    const startY = Math.floor(vb.y / tickInterval) * tickInterval;
    const endY = vb.y + vb.height;

    for (let y = startY; y <= endY; y += tickInterval) {
        const screenY = (y - vb.y) * scale;

        // Determine tick size
        let tickSize = TICK_SMALL;
        if (y % (tickInterval * 10) === 0) {
            tickSize = TICK_LARGE;
            // Draw label (rotated)
            ctx.save();
            ctx.translate(width - TICK_LARGE - 2, screenY);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(Math.round(y).toString(), 0, 9);
            ctx.restore();
        } else if (y % (tickInterval * 5) === 0) {
            tickSize = TICK_MEDIUM;
        }

        // Draw tick
        ctx.beginPath();
        ctx.strokeStyle = RULER_TEXT_COLOR;
        ctx.lineWidth = 1;
        ctx.moveTo(width, screenY);
        ctx.lineTo(width - tickSize, screenY);
        ctx.stroke();
    }
}

/**
 * Get appropriate tick interval based on zoom scale
 * @param {number} scale - Pixels per canvas unit
 * @returns {number} Tick interval in canvas units
 */
function getTickInterval(scale) {
    const intervals = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const minPixelsBetweenTicks = 5;

    for (const interval of intervals) {
        if (interval * scale >= minPixelsBetweenTicks) {
            return interval;
        }
    }
    return intervals[intervals.length - 1];
}

/**
 * Convert screen X coordinate to canvas X coordinate
 * @param {number} screenX
 * @returns {number}
 */
function screenToCanvasX(screenX) {
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return 0;

    const canvasContainer = document.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    const vb = canvas.viewbox();

    const x = screenX - rect.left - RULER_SIZE;
    const canvasWidth = rect.width - RULER_SIZE;

    return vb.x + (x / canvasWidth) * vb.width;
}

/**
 * Convert screen Y coordinate to canvas Y coordinate
 * @param {number} screenY
 * @returns {number}
 */
function screenToCanvasY(screenY) {
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return 0;

    const canvasContainer = document.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    const vb = canvas.viewbox();

    const y = screenY - rect.top - RULER_SIZE;
    const canvasHeight = rect.height - RULER_SIZE;

    return vb.y + (y / canvasHeight) * vb.height;
}

/**
 * Convert canvas coordinate to screen position
 * @param {number} canvasX
 * @param {number} canvasY
 * @returns {{ x: number, y: number }}
 */
function canvasToScreen(canvasX, canvasY) {
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return { x: 0, y: 0 };

    const canvasContainer = document.querySelector('.canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    const vb = canvas.viewbox();

    const canvasWidth = rect.width - RULER_SIZE;
    const canvasHeight = rect.height - RULER_SIZE;

    return {
        x: RULER_SIZE + ((canvasX - vb.x) / vb.width) * canvasWidth,
        y: RULER_SIZE + ((canvasY - vb.y) / vb.height) * canvasHeight
    };
}

/**
 * Create a guide line
 * @param {string} axis - 'x' for vertical guide, 'y' for horizontal guide
 * @param {number} position - Canvas coordinate
 * @param {number} offset - Initial screen offset for dragging
 */
function createGuide(axis, position, offset = 0) {
    const guide = document.createElement('div');
    guide.className = `guide guide-${axis}`;
    guide.dataset.axis = axis;
    guide.dataset.position = position;

    guidesContainer.appendChild(guide);

    const guideData = { axis, position, element: guide };
    guides.push(guideData);

    // Position the guide
    updateSingleGuidePosition(guideData);

    // Start dragging the guide
    startDraggingGuide(guideData, offset);

    // Right-click to delete
    guide.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        deleteGuide(guideData);
    });

    // Double-click to delete
    guide.addEventListener('dblclick', () => {
        deleteGuide(guideData);
    });

    // Drag to reposition
    guide.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            e.preventDefault();
            startDraggingGuide(guideData, 0);
        }
    });
}

/**
 * Start dragging a guide
 * @param {Object} guideData
 * @param {number} offset
 */
function startDraggingGuide(guideData, offset) {
    draggingGuide = guideData;
    guideData.element.classList.add('dragging');

    const handleMove = (e) => {
        if (!draggingGuide) return;

        let newPosition;
        if (draggingGuide.axis === 'x') {
            newPosition = screenToCanvasY(e.clientY);
        } else {
            newPosition = screenToCanvasX(e.clientX);
        }

        draggingGuide.position = newPosition;
        draggingGuide.element.dataset.position = newPosition;
        updateSingleGuidePosition(draggingGuide);
    };

    const handleUp = (e) => {
        if (draggingGuide) {
            draggingGuide.element.classList.remove('dragging');

            // Check if guide is outside visible area (delete if dragged back to ruler)
            const canvasContainer = document.querySelector('.canvas-container');
            const rect = canvasContainer.getBoundingClientRect();

            if (draggingGuide.axis === 'x' && e.clientX < rect.left + RULER_SIZE + 10) {
                deleteGuide(draggingGuide);
            } else if (draggingGuide.axis === 'y' && e.clientY < rect.top + RULER_SIZE + 10) {
                deleteGuide(draggingGuide);
            } else {
                // Save guides to canvas data
                saveGuidesToCanvas();
            }

            draggingGuide = null;
        }
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
}

/**
 * Update position of a single guide element
 * @param {Object} guideData
 */
function updateSingleGuidePosition(guideData) {
    const pos = canvasToScreen(
        guideData.axis === 'y' ? guideData.position : 0,
        guideData.axis === 'x' ? guideData.position : 0
    );

    if (guideData.axis === 'x') {
        guideData.element.style.top = `${pos.y}px`;
    } else {
        guideData.element.style.left = `${pos.x}px`;
    }
}

/**
 * Update all guide positions (after zoom/pan)
 */
function updateGuidePositions() {
    guides.forEach(updateSingleGuidePosition);
}

/**
 * Delete a guide
 * @param {Object} guideData
 */
function deleteGuide(guideData) {
    guideData.element.remove();
    const index = guides.indexOf(guideData);
    if (index > -1) {
        guides.splice(index, 1);
    }
    saveGuidesToCanvas();
}

/**
 * Clear all guides
 */
function clearGuides() {
    guides.forEach(g => g.element.remove());
    guides = [];
}

/**
 * Save guides to current canvas data
 */
function saveGuidesToCanvas() {
    const currentCanvas = window.canvasCore?.getCurrentCanvas?.();
    if (!currentCanvas) return;

    currentCanvas.guides = guides.map(g => ({
        axis: g.axis,
        position: g.position
    }));

    if (window.canvasCore?.scheduleAutoSave) {
        window.canvasCore.scheduleAutoSave();
    }
}

/**
 * Load guides from canvas data
 */
function loadGuidesFromCanvas() {
    clearGuides();

    const currentCanvas = window.canvasCore?.getCurrentCanvas?.();
    if (!currentCanvas || !currentCanvas.guides) return;

    currentCanvas.guides.forEach(g => {
        const guide = document.createElement('div');
        guide.className = `guide guide-${g.axis}`;
        guide.dataset.axis = g.axis;
        guide.dataset.position = g.position;

        guidesContainer.appendChild(guide);

        const guideData = { axis: g.axis, position: g.position, element: guide };
        guides.push(guideData);

        updateSingleGuidePosition(guideData);

        // Right-click to delete
        guide.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            deleteGuide(guideData);
        });

        // Double-click to delete
        guide.addEventListener('dblclick', () => {
            deleteGuide(guideData);
        });

        // Drag to reposition
        guide.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                e.preventDefault();
                startDraggingGuide(guideData, 0);
            }
        });
    });
}

/**
 * Show rulers
 */
function showRulers() {
    rulersVisible = true;
    if (rulerContainer) {
        rulerContainer.classList.add('visible');
    }
    if (guidesContainer) {
        guidesContainer.classList.add('visible');
    }
    updateRulers();
    loadGuidesFromCanvas();
    updateToolbarButton();
}

/**
 * Hide rulers
 */
function hideRulers() {
    rulersVisible = false;
    if (rulerContainer) {
        rulerContainer.classList.remove('visible');
    }
    if (guidesContainer) {
        guidesContainer.classList.remove('visible');
    }
    updateToolbarButton();
}

/**
 * Toggle rulers visibility
 */
function toggleRulers() {
    if (rulersVisible) {
        hideRulers();
    } else {
        showRulers();
    }
    showNotification(rulersVisible ? 'Rulers shown' : 'Rulers hidden');
}

/**
 * Check if rulers are visible
 * @returns {boolean}
 */
function areRulersVisible() {
    return rulersVisible;
}

/**
 * Get all guides
 * @returns {Array}
 */
function getGuides() {
    return guides.map(g => ({ axis: g.axis, position: g.position }));
}

/**
 * Get guide snap positions for an element
 * @param {number} x - Element X position
 * @param {number} y - Element Y position
 * @param {number} width - Element width
 * @param {number} height - Element height
 * @param {number} threshold - Snap threshold in canvas units
 * @returns {{ x: number|null, y: number|null }} Snapped positions
 */
function snapToGuides(x, y, width, height, threshold = 10) {
    if (!rulersVisible || guides.length === 0) {
        return { x: null, y: null };
    }

    let snappedX = null;
    let snappedY = null;

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const rightX = x + width;
    const bottomY = y + height;

    guides.forEach(g => {
        if (g.axis === 'y') {
            // Vertical guide - snap X positions
            const pos = g.position;

            if (Math.abs(x - pos) < threshold) {
                snappedX = pos;
            } else if (Math.abs(centerX - pos) < threshold) {
                snappedX = pos - width / 2;
            } else if (Math.abs(rightX - pos) < threshold) {
                snappedX = pos - width;
            }
        } else {
            // Horizontal guide - snap Y positions
            const pos = g.position;

            if (Math.abs(y - pos) < threshold) {
                snappedY = pos;
            } else if (Math.abs(centerY - pos) < threshold) {
                snappedY = pos - height / 2;
            } else if (Math.abs(bottomY - pos) < threshold) {
                snappedY = pos - height;
            }
        }
    });

    return { x: snappedX, y: snappedY };
}

// Note: showNotification is provided by notification.js

// Keyboard shortcut for toggle rulers (Ctrl/Cmd + R)
function attachKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        // Skip if typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + R to toggle rulers (prevent browser reload)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            toggleRulers();
        }
    });

    // Toolbar button
    const rulerBtn = document.getElementById('ruler-btn');
    if (rulerBtn) {
        rulerBtn.addEventListener('click', toggleRulers);
    }
}

/**
 * Update toolbar button state
 */
function updateToolbarButton() {
    const rulerBtn = document.getElementById('ruler-btn');
    if (rulerBtn) {
        rulerBtn.classList.toggle('active', rulersVisible);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeRulerGuides();
        attachKeyboardShortcut();
    });
} else {
    initializeRulerGuides();
    attachKeyboardShortcut();
}

// Export for use by other modules
window.rulerGuides = {
    show: showRulers,
    hide: hideRulers,
    toggle: toggleRulers,
    isVisible: areRulersVisible,
    getGuides,
    snapToGuides,
    loadGuides: loadGuidesFromCanvas,
    clearGuides,
    update: updateRulers
};
