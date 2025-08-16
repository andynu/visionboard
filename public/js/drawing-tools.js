/**
 * Base class for all drawing tools
 */
class DrawingTool {
    constructor(name) {
        this.name = name;
        this.isDrawing = false;
        this.canvas = null;
        this.svg = null;
    }
    
    /**
     * Activate this tool
     */
    activate() {
        console.log(`Activating ${this.name} tool`);
        this.isDrawing = false;
        this.onActivate();
    }
    
    /**
     * Deactivate this tool
     */
    deactivate() {
        console.log(`Deactivating ${this.name} tool`);
        this.isDrawing = false;
        this.onDeactivate();
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} event 
     */
    onMouseDown(event) {
        // Override in subclasses
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} event 
     */
    onMouseMove(event) {
        // Override in subclasses
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} event 
     */
    onMouseUp(event) {
        // Override in subclasses
    }
    
    /**
     * Called when tool is activated
     */
    onActivate() {
        // Override in subclasses
    }
    
    /**
     * Called when tool is deactivated
     */
    onDeactivate() {
        // Override in subclasses
    }
    
    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate
     * @returns {{x: number, y: number}} Canvas coordinates
     */
    screenToCanvas(clientX, clientY) {
        if (!this.canvas) return { x: clientX, y: clientY };
        
        const canvasElement = this.canvas.node;
        const rect = canvasElement.getBoundingClientRect();
        const viewBox = this.canvas.viewbox();
        
        // Calculate scale factors
        const scaleX = viewBox.width / rect.width;
        const scaleY = viewBox.height / rect.height;
        
        // Convert to canvas coordinates
        const x = (clientX - rect.left) * scaleX + viewBox.x;
        const y = (clientY - rect.top) * scaleY + viewBox.y;
        
        return { x, y };
    }
    
    /**
     * Get the current canvas instance
     * @returns {SVG} Current SVG canvas
     */
    getCanvas() {
        return this.canvas;
    }
    
    /**
     * Set the canvas instance
     * @param {SVG} canvas - SVG canvas instance
     */
    setCanvas(canvas) {
        this.canvas = canvas;
    }
}

/**
 * Tool Manager - Manages tool selection and state
 */
class ToolManager {
    constructor() {
        this.tools = new Map();
        this.activeTool = null;
        this.canvas = null;
        
        this.initializeTools();
        this.attachEventListeners();
    }
    
    /**
     * Initialize all available tools
     */
    initializeTools() {
        // Initialize tools (hand tool will be added in next task)
        this.tools.set('hand', new DrawingTool('hand'));
        
        // Set default tool
        this.setActiveTool('hand');
    }
    
    /**
     * Set the active tool
     * @param {string} toolName - Name of tool to activate
     */
    setActiveTool(toolName) {
        if (!this.tools.has(toolName)) {
            console.warn(`Tool ${toolName} not found`);
            return;
        }
        
        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        // Activate new tool
        this.activeTool = this.tools.get(toolName);
        this.activeTool.setCanvas(this.canvas);
        this.activeTool.activate();
        
        // Update UI
        this.updateToolUI(toolName);
        
        // Update color manager
        if (window.colorManager) {
            window.colorManager.setCurrentTool(toolName);
        }
    }
    
    /**
     * Get the currently active tool
     * @returns {DrawingTool} Active tool instance
     */
    getActiveTool() {
        return this.activeTool;
    }
    
    /**
     * Set the canvas instance for all tools
     * @param {SVG} canvas - SVG canvas instance
     */
    setCanvas(canvas) {
        this.canvas = canvas;
        if (this.activeTool) {
            this.activeTool.setCanvas(canvas);
        }
    }
    
    /**
     * Update tool button UI to reflect active tool
     * @param {string} toolName - Name of active tool
     */
    updateToolUI(toolName) {
        // Remove active class from all tool buttons
        document.querySelectorAll('.tool-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to current tool button
        const activeButton = document.getElementById(`tool-${toolName}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    /**
     * Attach event listeners for tool selection and keyboard shortcuts
     */
    attachEventListeners() {
        // Tool button click handlers
        document.addEventListener('click', (event) => {
            if (event.target.closest('.tool-button')) {
                const button = event.target.closest('.tool-button');
                const toolName = button.dataset.tool;
                if (toolName) {
                    this.setActiveTool(toolName);
                }
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts if not typing in an input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch (event.key.toLowerCase()) {
                case 'h':
                    this.setActiveTool('hand');
                    event.preventDefault();
                    break;
                case 'r':
                    this.setActiveTool('rectangle');
                    event.preventDefault();
                    break;
                case 'l':
                    this.setActiveTool('line');
                    event.preventDefault();
                    break;
                case 'f':
                    this.setActiveTool('freehand');
                    event.preventDefault();
                    break;
            }
        });
        
        // Canvas mouse event delegation
        document.addEventListener('mousedown', (event) => {
            if (this.activeTool && event.target.closest('.canvas')) {
                this.activeTool.onMouseDown(event);
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.activeTool && this.activeTool.isDrawing) {
                this.activeTool.onMouseMove(event);
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (this.activeTool && this.activeTool.isDrawing) {
                this.activeTool.onMouseUp(event);
            }
        });
    }
    
    /**
     * Register a new tool
     * @param {string} name - Tool name
     * @param {DrawingTool} tool - Tool instance
     */
    registerTool(name, tool) {
        this.tools.set(name, tool);
        if (this.canvas) {
            tool.setCanvas(this.canvas);
        }
    }
}

// Create global tool manager instance
window.toolManager = new ToolManager();