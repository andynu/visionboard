// Toolbar scale manager for HiDPI/accessibility
// Allows users to scale the toolbar to 1x, 1.5x, or 2x size

const toolbarScaleManager = (function() {
    const STORAGE_KEY = 'visionboard-toolbar-scale';
    const SCALE_OPTIONS = [1, 1.5, 2];
    let currentScale = 1;

    /**
     * Initialize the toolbar scale from localStorage
     */
    function init() {
        loadFromStorage();
        applyScale(currentScale);
        attachKeyboardShortcut();
    }

    /**
     * Load saved scale from localStorage
     */
    function loadFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = parseFloat(saved);
            if (SCALE_OPTIONS.includes(parsed)) {
                currentScale = parsed;
            }
        }
    }

    /**
     * Save current scale to localStorage
     */
    function saveToStorage() {
        localStorage.setItem(STORAGE_KEY, currentScale.toString());
    }

    /**
     * Apply scale by setting CSS custom property
     * @param {number} scale - Scale factor (1, 1.5, or 2)
     */
    function applyScale(scale) {
        document.documentElement.style.setProperty('--toolbar-scale', scale);
        currentScale = scale;
    }

    /**
     * Set the toolbar scale
     * @param {number} scale - Scale factor (1, 1.5, or 2)
     */
    function setScale(scale) {
        if (!SCALE_OPTIONS.includes(scale)) {
            console.warn('Invalid scale. Use 1, 1.5, or 2');
            return;
        }

        applyScale(scale);
        saveToStorage();
        showScaleNotification(`Toolbar scale: ${scale}x`);
    }

    /**
     * Cycle through scale options
     */
    function cycleScale() {
        const currentIndex = SCALE_OPTIONS.indexOf(currentScale);
        const nextIndex = (currentIndex + 1) % SCALE_OPTIONS.length;
        setScale(SCALE_OPTIONS[nextIndex]);
    }

    /**
     * Get current scale
     * @returns {number} Current scale factor
     */
    function getScale() {
        return currentScale;
    }

    /**
     * Get available scale options
     * @returns {number[]} Array of scale options
     */
    function getOptions() {
        return [...SCALE_OPTIONS];
    }

    /**
     * Attach keyboard shortcut for cycling toolbar scale
     * Ctrl+Shift+= or Ctrl+Shift++ to cycle through scales
     */
    function attachKeyboardShortcut() {
        document.addEventListener('keydown', (event) => {
            // Ctrl+Shift+= (or +) to cycle toolbar scale
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === '=' || event.key === '+')) {
                event.preventDefault();
                cycleScale();
            }
        });
    }

    // Note: uses shared showNotification from notification.js with purple color for scale
    function showScaleNotification(message) {
        showNotification(message, {color: 'purple', timeout: 1500});
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        setScale,
        getScale,
        cycleScale,
        getOptions
    };
})();

// Export globally
window.toolbarScale = toolbarScaleManager;
