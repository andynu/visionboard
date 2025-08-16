/**
 * ColorManager - Manages color palette and current color selection
 */
class ColorManager {
    constructor() {
        // Default color palette
        this.defaultPalette = ["#000000", "#FF0000", "#0066CC", "#00AA00"];
        this.palette = [...this.defaultPalette];
        this.currentColor = "#000000";
        this.currentTool = "hand"; // Default tool
        
        this.loadFromStorage();
        this.initializeUI();
    }
    
    /**
     * Get the currently selected color
     * @returns {string} Current color in hex format
     */
    getCurrentColor() {
        return this.currentColor;
    }
    
    /**
     * Set the current color
     * @param {string} color - Color in hex format
     */
    setCurrentColor(color) {
        this.currentColor = color;
        this.updateCurrentColorUI();
        this.saveToStorage();
    }
    
    /**
     * Get the entire color palette
     * @returns {string[]} Array of colors in hex format
     */
    getPalette() {
        return [...this.palette];
    }
    
    /**
     * Set a specific color in the palette
     * @param {number} index - Index (0-3) of color to change
     * @param {string} color - Color in hex format
     */
    setPaletteColor(index, color) {
        if (index >= 0 && index < this.palette.length) {
            this.palette[index] = color;
            this.updatePaletteUI();
            this.saveToStorage();
        }
    }
    
    /**
     * Save current state to localStorage
     */
    saveToStorage() {
        const state = {
            palette: this.palette,
            currentColor: this.currentColor,
            currentTool: this.currentTool
        };
        localStorage.setItem('visionboard-color-manager', JSON.stringify(state));
    }
    
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        const stored = localStorage.getItem('visionboard-color-manager');
        if (stored) {
            try {
                const state = JSON.parse(stored);
                if (state.palette && Array.isArray(state.palette) && state.palette.length === 4) {
                    this.palette = state.palette;
                }
                if (state.currentColor) {
                    this.currentColor = state.currentColor;
                }
                if (state.currentTool) {
                    this.currentTool = state.currentTool;
                }
            } catch (e) {
                console.warn('Failed to load color manager state from localStorage:', e);
                // Fall back to defaults
                this.palette = [...this.defaultPalette];
                this.currentColor = "#000000";
                this.currentTool = "hand";
            }
        }
    }
    
    /**
     * Initialize the UI elements
     */
    initializeUI() {
        this.updateCurrentColorUI();
        this.updatePaletteUI();
    }
    
    /**
     * Update the current color indicator in the UI
     */
    updateCurrentColorUI() {
        const currentColorElement = document.getElementById('current-color');
        if (currentColorElement) {
            currentColorElement.style.backgroundColor = this.currentColor;
        }
    }
    
    /**
     * Update all palette swatches in the UI
     */
    updatePaletteUI() {
        for (let i = 0; i < this.palette.length; i++) {
            const swatchElement = document.getElementById(`color-swatch-${i}`);
            if (swatchElement) {
                swatchElement.style.backgroundColor = this.palette[i];
                // Update selected state
                if (this.palette[i] === this.currentColor) {
                    swatchElement.classList.add('selected');
                } else {
                    swatchElement.classList.remove('selected');
                }
            }
        }
    }
    
    /**
     * Get the current tool
     * @returns {string} Current tool name
     */
    getCurrentTool() {
        return this.currentTool;
    }
    
    /**
     * Set the current tool
     * @param {string} tool - Tool name
     */
    setCurrentTool(tool) {
        this.currentTool = tool;
        this.saveToStorage();
    }
}

// Create singleton instance and expose globally
window.colorManager = new ColorManager();