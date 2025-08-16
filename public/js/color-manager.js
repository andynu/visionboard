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
        
        // Initialize UI when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeUI());
        } else {
            this.initializeUI();
        }
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
        this.attachEventListeners();
    }
    
    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        // Add click handlers to color swatches
        for (let i = 0; i < this.palette.length; i++) {
            const swatchElement = document.getElementById(`color-swatch-${i}`);
            if (swatchElement) {
                swatchElement.addEventListener('click', () => {
                    this.setCurrentColor(this.palette[i]);
                });
                
                // Add right-click handler for color picker
                swatchElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.openColorPicker(i);
                });
            }
        }
        
        // Add click handler to current color indicator
        const currentColorElement = document.getElementById('current-color');
        if (currentColorElement) {
            currentColorElement.addEventListener('click', () => {
                this.openColorPicker(-1); // -1 indicates changing current color, not palette
            });
        }
        
        // Modal event listeners
        this.attachModalEventListeners();
    }
    
    /**
     * Attach modal-specific event listeners
     */
    attachModalEventListeners() {
        const modal = document.getElementById('color-picker-modal');
        const modalClose = document.getElementById('modal-close');
        const modalCancel = document.getElementById('modal-cancel');
        const modalOk = document.getElementById('modal-ok');
        const colorInput = document.getElementById('color-picker-input');
        const overlay = modal?.querySelector('.modal-overlay');
        
        // Close modal handlers
        [modalClose, modalCancel, overlay].forEach(element => {
            if (element) {
                element.addEventListener('click', () => this.closeColorPicker());
            }
        });
        
        // OK button handler
        if (modalOk) {
            modalOk.addEventListener('click', () => this.applyColorChoice());
        }
        
        // Color input change handler
        if (colorInput) {
            colorInput.addEventListener('input', (e) => this.updateColorPreview(e.target.value));
        }
        
        // Escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('show')) {
                this.closeColorPicker();
            }
        });
    }
    
    /**
     * Open the color picker modal
     * @param {number} swatchIndex - Index of swatch to modify, or -1 for current color
     */
    openColorPicker(swatchIndex) {
        this.currentPickerTarget = swatchIndex;
        const modal = document.getElementById('color-picker-modal');
        const colorInput = document.getElementById('color-picker-input');
        const currentPreview = document.getElementById('color-preview-current');
        const newPreview = document.getElementById('color-preview-new');
        
        if (!modal || !colorInput) return;
        
        // Set initial color
        const initialColor = swatchIndex >= 0 ? this.palette[swatchIndex] : this.currentColor;
        colorInput.value = initialColor;
        
        // Update preview colors
        if (currentPreview) currentPreview.style.backgroundColor = initialColor;
        if (newPreview) newPreview.style.backgroundColor = initialColor;
        
        // Show modal
        modal.classList.add('show');
    }
    
    /**
     * Close the color picker modal
     */
    closeColorPicker() {
        const modal = document.getElementById('color-picker-modal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentPickerTarget = null;
    }
    
    /**
     * Update color preview when color input changes
     * @param {string} color - New color value
     */
    updateColorPreview(color) {
        const newPreview = document.getElementById('color-preview-new');
        if (newPreview) {
            newPreview.style.backgroundColor = color;
        }
    }
    
    /**
     * Apply the chosen color and close modal
     */
    applyColorChoice() {
        const colorInput = document.getElementById('color-picker-input');
        if (!colorInput) return;
        
        const newColor = colorInput.value;
        
        if (this.currentPickerTarget >= 0) {
            // Update palette color
            this.setPaletteColor(this.currentPickerTarget, newColor);
        } else {
            // Update current color
            this.setCurrentColor(newColor);
        }
        
        this.closeColorPicker();
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