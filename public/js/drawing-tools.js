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
        
        // Get the canvas element (same as existing canvas code)
        const canvasContainer = document.getElementById('canvas');
        if (!canvasContainer) return { x: clientX, y: clientY };
        
        const rect = canvasContainer.getBoundingClientRect();
        const viewBox = this.canvas.viewbox();
        
        // Convert mouse position to SVG coordinates (same logic as zoom function)
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        const svgX = viewBox.x + (mouseX / canvasContainer.clientWidth) * viewBox.width;
        const svgY = viewBox.y + (mouseY / canvasContainer.clientHeight) * viewBox.height;
        
        return { x: svgX, y: svgY };
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
 * HandTool - Selection and interaction tool that maintains existing behavior
 */
class HandTool extends DrawingTool {
    constructor() {
        super('hand');
    }
    
    /**
     * Activate hand tool - enable normal selection/interaction
     */
    onActivate() {
        // Hand tool uses the existing canvas interaction system
        // No special behavior needed on activation
        if (this.canvas) {
            this.canvas.node.style.cursor = 'grab';
        }
    }
    
    /**
     * Deactivate hand tool
     */
    onDeactivate() {
        // Reset cursor when deactivating
        if (this.canvas) {
            this.canvas.node.style.cursor = 'default';
        }
    }
    
    /**
     * Handle mouse down for hand tool
     * The existing canvas.js selection/drag system handles this
     */
    onMouseDown(event) {
        // Let the existing canvas interaction system handle selection and dragging
        // This method is implemented to satisfy the base class interface
    }
    
    /**
     * Handle mouse move for hand tool
     */
    onMouseMove(event) {
        // Existing drag/pan system handles this
    }
    
    /**
     * Handle mouse up for hand tool
     */
    onMouseUp(event) {
        // Existing system handles this
    }
}

/**
 * RectangleTool - Click-drag rectangle creation
 */
class RectangleTool extends DrawingTool {
    constructor() {
        super('rectangle');
        this.previewRect = null;
        this.startPoint = null;
    }
    
    /**
     * Activate rectangle tool
     */
    onActivate() {
        if (this.canvas) {
            this.canvas.node.style.cursor = 'crosshair';
        }
    }
    
    /**
     * Deactivate rectangle tool
     */
    onDeactivate() {
        this.cleanupPreview();
        if (this.canvas) {
            this.canvas.node.style.cursor = 'default';
        }
    }
    
    /**
     * Handle mouse down - start rectangle drawing
     */
    onMouseDown(event) {
        if (!this.canvas) return;
        
        // Don't start drawing if clicking on UI elements (but allow drawing over canvas elements)
        if (event.target.closest('.tool-button') || 
            event.target.closest('.color-swatch') ||
            event.target.closest('.resize-handle') ||
            event.target.closest('.sidebar') ||
            event.target.closest('.header')) {
            return;
        }
        
        // Get canvas coordinates
        const point = this.screenToCanvas(event.clientX, event.clientY);
        this.startPoint = point;
        this.isDrawing = true;
        
        // Create preview rectangle
        this.previewRect = this.canvas.rect(0, 0)
            .move(point.x, point.y)
            .fill('none')
            .stroke({
                color: window.colorManager ? window.colorManager.getCurrentColor() : '#000000',
                width: 2,
                dasharray: '5,5'
            })
            .opacity(0.7);
    }
    
    /**
     * Handle mouse move - update rectangle preview
     */
    onMouseMove(event) {
        if (!this.isDrawing || !this.previewRect || !this.startPoint) return;
        
        const currentPoint = this.screenToCanvas(event.clientX, event.clientY);
        
        // Calculate rectangle dimensions
        const x = Math.min(this.startPoint.x, currentPoint.x);
        const y = Math.min(this.startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        
        // Update preview rectangle
        this.previewRect.move(x, y).size(width, height);
    }
    
    /**
     * Handle mouse up - finalize rectangle creation
     */
    onMouseUp(event) {
        if (!this.isDrawing || !this.startPoint) return;
        
        const currentPoint = this.screenToCanvas(event.clientX, event.clientY);
        
        // Calculate final rectangle dimensions
        const x = Math.min(this.startPoint.x, currentPoint.x);
        const y = Math.min(this.startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        
        // Only create rectangle if it meets minimum size (20x20px)
        if (width >= 20 && height >= 20) {
            this.createRectangle(x, y, width, height);
        }
        
        // Clean up
        this.cleanupPreview();
        this.isDrawing = false;
        this.startPoint = null;
    }
    
    /**
     * Create the final rectangle element
     */
    createRectangle(x, y, width, height) {
        const currentColor = window.colorManager ? window.colorManager.getCurrentColor() : '#000000';
        
        // Generate unique ID for the rectangle
        const rectangleId = 'rect-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Create rectangle data
        const rectangleData = {
            id: rectangleId,
            type: 'rectangle',
            x: x,
            y: y,
            width: width,
            height: height,
            fill: 'none',
            stroke: currentColor,
            strokeWidth: 2,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        // Add to canvas elements array
        if (window.currentCanvas) {
            window.currentCanvas.elements.push(rectangleData);
            
            // Add to SVG canvas and make interactive
            if (window.addRectangleToCanvas) {
                window.addRectangleToCanvas(rectangleData);
            }
            
            // Auto-save canvas
            if (window.autoSaveCanvas) {
                window.autoSaveCanvas();
            }
        }
    }
    
    /**
     * Clean up preview rectangle
     */
    cleanupPreview() {
        if (this.previewRect) {
            this.previewRect.remove();
            this.previewRect = null;
        }
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
        // Initialize tools
        this.tools.set('hand', new HandTool());
        this.tools.set('rectangle', new RectangleTool());
        
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
        
        // Canvas mouse event delegation with high priority
        document.addEventListener('mousedown', (event) => {
            // Check if we're clicking in the canvas area (not on toolbar, sidebar, etc.)
            const canvasContainer = event.target.closest('.canvas-container');
            const isOnCanvas = canvasContainer && !event.target.closest('.sidebar') && !event.target.closest('.header');
            
            if (this.activeTool && isOnCanvas) {
                // For drawing tools (not hand tool), prevent default canvas behavior
                if (this.activeTool.name !== 'hand') {
                    event.stopPropagation();
                    event.preventDefault();
                }
                this.activeTool.onMouseDown(event);
            }
        }, true); // Use capture phase for higher priority
        
        document.addEventListener('mousemove', (event) => {
            if (this.activeTool && this.activeTool.isDrawing) {
                event.stopPropagation();
                event.preventDefault();
                this.activeTool.onMouseMove(event);
            }
        }, true);
        
        document.addEventListener('mouseup', (event) => {
            if (this.activeTool && this.activeTool.isDrawing) {
                event.stopPropagation();
                event.preventDefault();
                this.activeTool.onMouseUp(event);
            }
        }, true);
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