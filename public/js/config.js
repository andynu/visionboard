// Application configuration constants
// Centralized configuration to avoid magic numbers throughout the codebase

const CONFIG = {
  // Canvas viewport settings
  canvas: {
    defaultViewBox: { x: 0, y: 0, width: 1920, height: 1080 },
    initialViewBox: { x: -500, y: -300, width: 2420, height: 1380 },
  },

  // Zoom settings
  zoom: {
    min: 0.1,
    max: 10.0,
    speed: 0.1, // Zoom increment per wheel event
  },

  // Default element dimensions
  element: {
    defaultImageWidth: 300,
    defaultImageHeight: 200,
    maxImageSize: 400, // Max dimension when auto-sizing
    folderWidth: 120,
    folderHeight: 100,
    minSize: 20, // Minimum element size during resize
  },

  // Resize handles
  resizeHandle: {
    radius: 12,
    strokeWidth: 3,
    color: '#007AFF',
    backgroundColor: '#ffffff',
  },

  // Touch/interaction settings
  touch: {
    doubleTapDelay: 300, // ms between taps for double-tap
    dragThreshold: 10, // pixels before drag is detected
    hapticDuration: 50, // ms for haptic feedback
  },

  // Autosave settings
  autosave: {
    debounceDelay: 2000, // ms before auto-save triggers
    savingNotificationDelay: 3000, // ms to show "saving" message
    savedNotificationDelay: 1500, // ms to show "saved" message
  },

  // Selection indicator
  selection: {
    strokeWidth: 4,
    color: '#007AFF',
  },

  // Grid and snap settings
  grid: {
    size: 40,              // Grid spacing in pixels
    snapThreshold: 8,      // Pixels within which snap activates
    color: '#e0e0e0',
    majorColor: '#c0c0c0',
    majorInterval: 5       // Every 5th line is a major grid line
  },
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.canvas);
Object.freeze(CONFIG.zoom);
Object.freeze(CONFIG.element);
Object.freeze(CONFIG.resizeHandle);
Object.freeze(CONFIG.touch);
Object.freeze(CONFIG.autosave);
Object.freeze(CONFIG.selection);
Object.freeze(CONFIG.grid);

// Export for use in modules
window.CONFIG = CONFIG;
