// Grid and snap-to-grid functionality
// Provides visual grid overlay and magnetic snapping for element positioning

const gridSnap = (function() {
    // State
    let gridVisible = false;
    let snapEnabled = false;
    let gridGroup = null;

    // Use CONFIG settings if available, otherwise use defaults
    function getSettings() {
        const cfg = window.CONFIG && window.CONFIG.grid;
        return {
            gridSize: cfg ? cfg.size : 40,
            snapThreshold: cfg ? cfg.snapThreshold : 8,
            gridColor: cfg ? cfg.color : '#e0e0e0',
            gridMajorColor: cfg ? cfg.majorColor : '#c0c0c0',
            majorGridInterval: cfg ? cfg.majorInterval : 5
        };
    }

    let settings = getSettings();

    function init() {
        // Setup keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Don't capture when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // G key to toggle grid visibility
            if (event.key === 'g' || event.key === 'G') {
                event.preventDefault();
                toggleGrid();
            }

            // S key to toggle snap (only if not in an input)
            // Check that we're not using S for other purposes (e.g., save)
            if (event.key === 's' && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                toggleSnap();
            }
        });

        // Setup toolbar button listeners
        const gridBtn = document.getElementById('grid-btn');
        const snapBtn = document.getElementById('snap-btn');

        if (gridBtn) {
            gridBtn.addEventListener('click', toggleGrid);
        }
        if (snapBtn) {
            snapBtn.addEventListener('click', toggleSnap);
        }
    }

    function toggleGrid() {
        gridVisible = !gridVisible;
        updateGridVisibility();
        updateToolbarButtons();
        showNotification(gridVisible ? 'Grid On' : 'Grid Off');
    }

    function toggleSnap() {
        snapEnabled = !snapEnabled;
        updateToolbarButtons();
        showNotification(snapEnabled ? 'Snap On' : 'Snap Off');
    }

    function isGridVisible() {
        return gridVisible;
    }

    function isSnapEnabled() {
        return snapEnabled;
    }

    function setGridVisible(visible) {
        gridVisible = visible;
        updateGridVisibility();
        updateToolbarButtons();
    }

    function setSnapEnabled(enabled) {
        snapEnabled = enabled;
        updateToolbarButtons();
    }

    function updateToolbarButtons() {
        const gridBtn = document.getElementById('grid-btn');
        const snapBtn = document.getElementById('snap-btn');

        if (gridBtn) {
            gridBtn.classList.toggle('active', gridVisible);
        }
        if (snapBtn) {
            snapBtn.classList.toggle('active', snapEnabled);
        }
    }

    function updateGridVisibility() {
        if (gridVisible) {
            drawGrid();
        } else {
            removeGrid();
        }
    }

    function drawGrid() {
        const canvas = window.canvas;
        if (!canvas) return;

        // Remove existing grid
        removeGrid();

        // Get current viewBox for grid bounds
        const vbox = canvas.viewbox();

        // Create a group for the grid (will be rendered behind all elements)
        gridGroup = canvas.group().attr('id', 'grid-overlay');

        // Calculate grid bounds with some padding for panning
        const padding = Math.max(vbox.width, vbox.height);
        const startX = Math.floor((vbox.x - padding) / settings.gridSize) * settings.gridSize;
        const startY = Math.floor((vbox.y - padding) / settings.gridSize) * settings.gridSize;
        const endX = vbox.x + vbox.width + padding;
        const endY = vbox.y + vbox.height + padding;

        // Draw vertical lines
        for (let x = startX; x <= endX; x += settings.gridSize) {
            const isMajor = Math.round(x / settings.gridSize) % settings.majorGridInterval === 0;
            gridGroup.line(x, startY, x, endY)
                .stroke({
                    color: isMajor ? settings.gridMajorColor : settings.gridColor,
                    width: isMajor ? 0.5 : 0.25
                })
                .attr('vector-effect', 'non-scaling-stroke');
        }

        // Draw horizontal lines
        for (let y = startY; y <= endY; y += settings.gridSize) {
            const isMajor = Math.round(y / settings.gridSize) % settings.majorGridInterval === 0;
            gridGroup.line(startX, y, endX, y)
                .stroke({
                    color: isMajor ? settings.gridMajorColor : settings.gridColor,
                    width: isMajor ? 0.5 : 0.25
                })
                .attr('vector-effect', 'non-scaling-stroke');
        }

        // Move grid to back (behind all elements)
        gridGroup.back();
    }

    function removeGrid() {
        if (gridGroup) {
            gridGroup.remove();
            gridGroup = null;
        }
        // Also try to remove by ID in case of stale reference
        const canvas = window.canvas;
        if (canvas) {
            try {
                const existing = canvas.select('#grid-overlay').first();
                if (existing) existing.remove();
            } catch (e) {
                // Grid not found, that's fine
            }
        }
    }

    function refreshGrid() {
        // Called when viewbox changes significantly
        if (gridVisible) {
            drawGrid();
        }
    }

    // Snap a position to the grid
    function snapToGrid(x, y) {
        if (!snapEnabled) {
            return { x, y };
        }

        const gridSize = settings.gridSize;
        const threshold = settings.snapThreshold;

        // Calculate nearest grid points
        const nearestGridX = Math.round(x / gridSize) * gridSize;
        const nearestGridY = Math.round(y / gridSize) * gridSize;

        // Calculate distances to nearest grid lines
        const distX = Math.abs(x - nearestGridX);
        const distY = Math.abs(y - nearestGridY);

        // Snap if within threshold
        const snappedX = distX <= threshold ? nearestGridX : x;
        const snappedY = distY <= threshold ? nearestGridY : y;

        return { x: snappedX, y: snappedY };
    }

    // Snap an element's position (considers element origin)
    function snapElementPosition(x, y, width, height) {
        if (!snapEnabled) {
            return { x, y };
        }

        const gridSize = settings.gridSize;
        const threshold = settings.snapThreshold;

        // Try snapping the top-left corner
        let snappedX = x;
        let snappedY = y;

        // First, check guide snapping (takes priority when visible)
        if (window.rulerGuides && window.rulerGuides.isVisible()) {
            const guideSnap = window.rulerGuides.snapToGuides(x, y, width, height, threshold);
            if (guideSnap.x !== null) {
                snappedX = guideSnap.x;
            }
            if (guideSnap.y !== null) {
                snappedY = guideSnap.y;
            }
            // If snapped to guides, return early
            if (guideSnap.x !== null || guideSnap.y !== null) {
                // Still check grid for any unsnapped axis
                if (guideSnap.x === null) {
                    const tlGridX = Math.round(x / gridSize) * gridSize;
                    const brGridX = Math.round((x + width) / gridSize) * gridSize;
                    const distTLX = Math.abs(x - tlGridX);
                    const distBRX = Math.abs((x + width) - brGridX);
                    if (distTLX <= threshold && distTLX <= distBRX) {
                        snappedX = tlGridX;
                    } else if (distBRX <= threshold) {
                        snappedX = brGridX - width;
                    }
                }
                if (guideSnap.y === null) {
                    const tlGridY = Math.round(y / gridSize) * gridSize;
                    const brGridY = Math.round((y + height) / gridSize) * gridSize;
                    const distTLY = Math.abs(y - tlGridY);
                    const distBRY = Math.abs((y + height) - brGridY);
                    if (distTLY <= threshold && distTLY <= distBRY) {
                        snappedY = tlGridY;
                    } else if (distBRY <= threshold) {
                        snappedY = brGridY - height;
                    }
                }
                return { x: snappedX, y: snappedY };
            }
        }

        // Calculate nearest grid points for corners
        const tlGridX = Math.round(x / gridSize) * gridSize;
        const tlGridY = Math.round(y / gridSize) * gridSize;
        const brGridX = Math.round((x + width) / gridSize) * gridSize;
        const brGridY = Math.round((y + height) / gridSize) * gridSize;

        // Check top-left corner
        const distTLX = Math.abs(x - tlGridX);
        const distTLY = Math.abs(y - tlGridY);

        // Check bottom-right corner
        const distBRX = Math.abs((x + width) - brGridX);
        const distBRY = Math.abs((y + height) - brGridY);

        // Snap to whichever corner is closer to a grid line
        if (distTLX <= threshold && distTLX <= distBRX) {
            snappedX = tlGridX;
        } else if (distBRX <= threshold) {
            snappedX = brGridX - width;
        }

        if (distTLY <= threshold && distTLY <= distBRY) {
            snappedY = tlGridY;
        } else if (distBRY <= threshold) {
            snappedY = brGridY - height;
        }

        return { x: snappedX, y: snappedY };
    }

    function showNotification(message) {
        const notification = document.getElementById('autosave-notification');
        if (!notification) return;

        if (notification.hideTimeout) {
            clearTimeout(notification.hideTimeout);
        }

        notification.textContent = message;
        notification.className = 'autosave-notification';
        notification.style.background = '#007AFF';
        notification.classList.add('show');

        notification.hideTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, 1000);
    }

    function getCurrentSettings() {
        return { ...settings };
    }

    function updateSettings(newSettings) {
        Object.assign(settings, newSettings);
        if (gridVisible) {
            drawGrid();
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        toggleGrid,
        toggleSnap,
        isGridVisible,
        isSnapEnabled,
        setGridVisible,
        setSnapEnabled,
        snapToGrid,
        snapElementPosition,
        refreshGrid,
        getSettings: getCurrentSettings,
        updateSettings
    };
})();

// Export globally
window.gridSnap = gridSnap;
