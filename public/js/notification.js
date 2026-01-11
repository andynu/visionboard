// Shared notification module
// Displays brief toast notifications using the autosave-notification element

(function() {
    'use strict';

    // Notification color presets
    const COLORS = {
        default: '#2196F3',  // Blue - general notifications
        success: '#2196F3',  // Blue - same as default
        info: '#9E9E9E',     // Gray - informational
        purple: '#9C27B0',   // Purple - zoom/scale operations
        accent: '#007AFF'    // iOS blue - grid/snap operations
    };

    // Default timeout duration
    const DEFAULT_TIMEOUT = 1200;

    // Track timeout for clearing when showing new notification quickly
    let hideTimeout = null;

    /**
     * Show a brief notification toast
     * @param {string} message - The message to display
     * @param {Object} options - Optional configuration
     * @param {string} options.color - Color name ('default', 'info', 'purple', 'accent') or hex color
     * @param {number} options.timeout - Duration in ms before hiding (default: 1200)
     */
    function showNotification(message, options = {}) {
        const notification = document.getElementById('autosave-notification');
        if (!notification) return;

        // Clear any pending hide timeout
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        // Determine the background color
        let bgColor = options.color || 'default';
        if (COLORS[bgColor]) {
            bgColor = COLORS[bgColor];
        }
        // If not a preset name, assume it's a hex color

        notification.textContent = message;
        notification.className = 'autosave-notification';
        notification.style.background = bgColor;
        notification.classList.add('show');

        const timeout = options.timeout || DEFAULT_TIMEOUT;
        hideTimeout = setTimeout(() => {
            notification.classList.remove('show');
            hideTimeout = null;
        }, timeout);
    }

    // Export to global scope
    window.showNotification = showNotification;

    // Also export colors for reference
    window.showNotification.COLORS = COLORS;
})();
