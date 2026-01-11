// Canvas core functionality
// Handles canvas initialization, loading, rendering, panning, zooming, and autosave

let canvas = null;
let currentCanvas = null;
let autoSaveTimeout = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewBoxStart = { x: 0, y: 0, width: 0, height: 0 };
let zoomLevel = 1.0;
let lastMousePosition = { x: 0, y: 0 };

function initializeCanvas() {
    const canvasContainer = document.getElementById('canvas');
    canvas = SVG(canvasContainer).size('100%', '100%');
    const vb = CONFIG.canvas.initialViewBox;
    canvas.viewbox(vb.x, vb.y, vb.width, vb.height);

    // Expose canvas globally for tool manager
    window.canvas = canvas;

    // Handle canvas clicks to deselect elements
    canvas.click((event) => {
        // Only deselect if we clicked on empty canvas space, not on an element
        const target = event.target;
        const isCanvasElement = target && (
            target.classList.contains('canvas-element') ||
            target.closest('.canvas-element') ||
            target.classList.contains('resize-handle')
        );

        if (window.elementsAPI.getSelectedElement() && !isPanning && !isCanvasElement) {
            window.elementsAPI.deselectElement();
        }
    });

    // Add canvas panning functionality
    setupCanvasPanning();
}

async function loadCanvas(canvasId) {
    try {
        currentCanvas = await window.canvasAPI.get(canvasId);
        window.currentCanvas = currentCanvas;
        await renderCanvas();
    } catch (error) {
        console.error('Error loading canvas:', error);
        currentCanvas = {
            id: canvasId,
            name: 'Main Canvas',
            elements: []
        };
        window.currentCanvas = currentCanvas;
    }
}

async function renderCanvas() {
    canvas.clear();

    if (!currentCanvas || !currentCanvas.elements) return;

    // Apply canvas background color
    applyCanvasBackground();

    // Render elements - handle async image loading
    for (const element of currentCanvas.elements) {
        if (element.type === 'image') {
            await window.elementsAPI.addImageToCanvas(element, canvas, currentCanvas);
        } else if (element.type === 'folder') {
            window.elementsAPI.addFolderToCanvas(element, canvas, currentCanvas);
        } else if (element.type === 'rectangle') {
            window.elementsAPI.addRectangleToCanvas(element, canvas, currentCanvas);
        } else if (element.type === 'group') {
            // Load groups from grouping module
            if (window.grouping && window.grouping.loadGroups) {
                // Groups are loaded separately after all elements
            }
        }
    }

    // Load groups after elements are rendered
    if (window.grouping && window.grouping.loadGroups) {
        window.grouping.loadGroups(canvas, currentCanvas);
    }

    // Re-attach event listeners to all canvas elements after loading
    setTimeout(() => {
        reattachEventListeners();
    }, 100);

    // Hide drop zone if there are images on canvas
    hideDropZoneIfNeeded();
}

/**
 * Apply canvas background color to the canvas container
 */
function applyCanvasBackground() {
    const canvasContainer = document.getElementById('canvas');
    if (!canvasContainer) return;

    const bgColor = currentCanvas && currentCanvas.backgroundColor;

    if (bgColor === 'transparent' || bgColor === 'checkerboard') {
        // Apply checkerboard pattern for transparency
        canvasContainer.style.background = `
            repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)
            50% / 20px 20px
        `;
    } else if (bgColor) {
        canvasContainer.style.background = bgColor;
    } else {
        // Default white background
        canvasContainer.style.background = '#ffffff';
    }
}

/**
 * Get current canvas background color
 * @returns {string} Background color or null for default
 */
function getCanvasBackgroundColor() {
    return currentCanvas ? currentCanvas.backgroundColor : null;
}

/**
 * Set canvas background color
 * @param {string} color - CSS color value or 'transparent'
 */
function setCanvasBackgroundColor(color) {
    if (!currentCanvas) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    currentCanvas.backgroundColor = color;

    // Apply immediately
    applyCanvasBackground();

    // Trigger auto-save
    scheduleAutoSave();

    showNotification('Background color updated');
}

/**
 * Show background color picker dialog
 */
function showBackgroundColorPicker() {
    const currentColor = getCanvasBackgroundColor() || '#ffffff';

    // Create a simple modal dialog
    const dialog = document.createElement('div');
    dialog.className = 'bg-color-picker-dialog';
    dialog.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content bg-color-modal">
            <div class="modal-header">
                <h3>Canvas Background</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body bg-color-body">
                <div class="bg-color-presets">
                    <button class="bg-preset" data-color="#ffffff" title="White">
                        <span class="bg-preset-swatch" style="background: #ffffff;"></span>
                        <span>White</span>
                    </button>
                    <button class="bg-preset" data-color="#f5f5f5" title="Light Gray">
                        <span class="bg-preset-swatch" style="background: #f5f5f5;"></span>
                        <span>Light Gray</span>
                    </button>
                    <button class="bg-preset" data-color="#e0e0e0" title="Gray">
                        <span class="bg-preset-swatch" style="background: #e0e0e0;"></span>
                        <span>Gray</span>
                    </button>
                    <button class="bg-preset" data-color="#424242" title="Dark Gray">
                        <span class="bg-preset-swatch" style="background: #424242;"></span>
                        <span>Dark Gray</span>
                    </button>
                    <button class="bg-preset" data-color="#1a1a1a" title="Black">
                        <span class="bg-preset-swatch" style="background: #1a1a1a;"></span>
                        <span>Black</span>
                    </button>
                    <button class="bg-preset" data-color="transparent" title="Transparent">
                        <span class="bg-preset-swatch bg-transparent-swatch"></span>
                        <span>Transparent</span>
                    </button>
                </div>
                <div class="bg-color-custom">
                    <label>Custom Color:</label>
                    <input type="color" id="bg-custom-color" value="${currentColor === 'transparent' ? '#ffffff' : currentColor}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-button modal-cancel">Cancel</button>
                <button class="modal-button modal-ok">Apply</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    let selectedColor = currentColor;

    // Handle preset clicks
    dialog.querySelectorAll('.bg-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedColor = btn.dataset.color;
            dialog.querySelectorAll('.bg-preset').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });

        // Mark current color as selected
        if (btn.dataset.color === currentColor) {
            btn.classList.add('selected');
        }
    });

    // Handle custom color
    const customColorInput = dialog.querySelector('#bg-custom-color');
    customColorInput.addEventListener('input', (e) => {
        selectedColor = e.target.value;
        dialog.querySelectorAll('.bg-preset').forEach(b => b.classList.remove('selected'));
    });

    // Handle close
    const closeDialog = () => {
        dialog.remove();
    };

    dialog.querySelector('.modal-close').addEventListener('click', closeDialog);
    dialog.querySelector('.modal-cancel').addEventListener('click', closeDialog);
    dialog.querySelector('.modal-overlay').addEventListener('click', closeDialog);

    // Handle apply
    dialog.querySelector('.modal-ok').addEventListener('click', () => {
        setCanvasBackgroundColor(selectedColor);
        closeDialog();
    });

    // Handle escape key
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

function reattachEventListeners() {
    // Use more reliable approach: listen at SVG container level and delegate to elements
    const svgContainer = document.querySelector('#canvas svg');
    if (svgContainer) {
        // Remove existing listener if any
        if (svgContainer._elementClickHandler) {
            svgContainer.removeEventListener('click', svgContainer._elementClickHandler);
        }

        // Create unified click handler for all canvas elements
        svgContainer._elementClickHandler = (event) => {
            let target = event.target;

            // Check if clicked element is a canvas element
            if (target && target.classList.contains('canvas-element')) {
                event.stopPropagation();

                let elementToSelect = null;

                // If user clicked on an image, check if there's a rectangle at the same location
                if (target.tagName === 'image') {
                    // Get click coordinates relative to SVG
                    const svgRect = svgContainer.getBoundingClientRect();
                    const clickX = event.clientX - svgRect.left;
                    const clickY = event.clientY - svgRect.top;

                    // Look for rectangles under this point
                    const allElements = svgContainer.querySelectorAll('.canvas-element');
                    for (let element of allElements) {
                        if (element.tagName === 'rect' && element !== target) {
                            const rect = element.getBoundingClientRect();
                            const rectLeft = rect.left - svgRect.left;
                            const rectTop = rect.top - svgRect.top;
                            const rectRight = rectLeft + rect.width;
                            const rectBottom = rectTop + rect.height;

                            // Check if click is within rectangle bounds
                            if (clickX >= rectLeft && clickX <= rectRight &&
                                clickY >= rectTop && clickY <= rectBottom) {
                                target = element;
                                break;
                            }
                        }
                    }
                }

                // Find the SVG.js element using DOM-based approach
                if (canvas && canvas.children) {
                    elementToSelect = canvas.children().find(child => {
                        return child.node && child.node.id === target.id;
                    });
                }

                // Fallback: try canvas.select if the above didn't work
                if (!elementToSelect && canvas) {
                    try {
                        elementToSelect = canvas.select(`#${target.id}`).first();
                    } catch (e) {
                        // Fallback selection failed
                    }
                }

                if (elementToSelect && elementToSelect.node) {
                    try {
                        window.elementsAPI.selectElement(elementToSelect);
                    } catch (error) {
                        console.error('Selection failed:', error);
                    }
                }
            }
        };

        // Add the listener with capture to ensure it gets events first
        svgContainer.addEventListener('click', svgContainer._elementClickHandler, true);
    }
}

function updateElementPosition(element) {
    const elementData = element.data('elementData');

    if (elementData) {
        // Update position for all elements
        elementData.x = element.x();
        elementData.y = element.y();

        // For images, update dimensions from the actual element
        // For folders, width/height are stored in elementData and updated during resize
        if (elementData.type !== 'folder') {
            elementData.width = element.width();
            elementData.height = element.height();
        }

        // Update in canvas data
        const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
        if (index !== -1) {
            currentCanvas.elements[index] = elementData;
        }

        // Trigger auto-save
        scheduleAutoSave();
    }
}

async function saveCanvas() {
    if (!currentCanvas) return;

    try {
        await window.canvasAPI.update(currentCanvas.id, currentCanvas);
        showAutosaveNotification('Saved', 'saved');
    } catch (error) {
        console.error('Error saving canvas:', error);
        showAutosaveNotification('Save failed', 'error');
    }
}

function scheduleAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Show saving notification
    showAutosaveNotification('Saving...', 'saving');

    // Schedule save after debounce delay
    autoSaveTimeout = setTimeout(() => {
        saveCanvas();
    }, CONFIG.autosave.debounceDelay);
}

function showAutosaveNotification(message, type = 'saved') {
    const notification = document.getElementById('autosave-notification');
    if (!notification) return;

    // Clear any existing timeout
    if (notification.hideTimeout) {
        clearTimeout(notification.hideTimeout);
    }

    // Set message and type
    notification.textContent = message;
    notification.className = 'autosave-notification';

    if (type === 'saving') {
        notification.classList.add('saving');
    } else if (type === 'error') {
        notification.style.background = '#f44336';
    } else {
        notification.style.background = '#4CAF50';
    }

    // Show notification
    notification.classList.add('show');

    // Hide after delay
    const hideDelay = type === 'saving'
        ? CONFIG.autosave.savingNotificationDelay
        : CONFIG.autosave.savedNotificationDelay;
    notification.hideTimeout = setTimeout(() => {
        notification.classList.remove('show');
    }, hideDelay);
}

// Canvas panning functionality
function setupCanvasPanning() {
    const canvasContainer = document.getElementById('canvas');

    function startPanning(event) {
        isPanning = true;

        // Get initial mouse position in screen coordinates
        panStart.x = event.clientX;
        panStart.y = event.clientY;

        // Store current viewbox
        const vbox = canvas.viewbox();
        viewBoxStart.x = vbox.x;
        viewBoxStart.y = vbox.y;
        viewBoxStart.width = vbox.width;
        viewBoxStart.height = vbox.height;

        // Change cursor to indicate panning
        document.body.style.cursor = 'grabbing';
    }

    // Canvas container mousedown for left-click panning on empty areas
    canvasContainer.addEventListener('mousedown', (event) => {
        // Left mouse button (button 0) panning
        if (event.button === 0 && !window.elementsAPI.getIsDragging() && !window.resizeAPI.getIsResizing()) {
            // Allow panning on empty canvas, OR on elements when Shift+hand tool is active
            const isEmptyCanvas = event.target === canvasContainer || event.target === canvas.node;
            const isShiftHandTool = event.shiftKey && window.toolManager?.getActiveTool()?.name === 'hand';

            if (isEmptyCanvas || isShiftHandTool) {
                event.preventDefault();
                startPanning(event);
            }
        }
    });

    // Document-level mousedown for middle-click panning anywhere
    document.addEventListener('mousedown', (event) => {
        // Middle mouse button (button 1) panning - works anywhere in the canvas area
        if (event.button === 1 && canvasContainer.contains(event.target)) {
            event.preventDefault();
            startPanning(event);
        }
    });

    // Add hover effect for canvas background
    canvasContainer.addEventListener('mouseover', (event) => {
        if ((event.target === canvasContainer || event.target === canvas.node) &&
            !window.elementsAPI.getIsDragging() && !window.resizeAPI.getIsResizing() && !isPanning) {
            canvasContainer.style.cursor = 'grab';
        }
    });

    canvasContainer.addEventListener('mouseout', (event) => {
        if (!isPanning && !window.elementsAPI.getIsDragging() && !window.resizeAPI.getIsResizing()) {
            canvasContainer.style.cursor = 'default';
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (isPanning) {
            event.preventDefault();

            // Calculate mouse delta in screen coordinates
            const deltaX = event.clientX - panStart.x;
            const deltaY = event.clientY - panStart.y;

            // Convert screen delta to SVG coordinates
            const scaleX = viewBoxStart.width / canvasContainer.clientWidth;
            const scaleY = viewBoxStart.height / canvasContainer.clientHeight;

            // Move viewbox in opposite direction of mouse movement (pan effect)
            const newX = viewBoxStart.x - (deltaX * scaleX);
            const newY = viewBoxStart.y - (deltaY * scaleY);

            canvas.viewbox(newX, newY, viewBoxStart.width, viewBoxStart.height);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            document.body.style.cursor = 'default';
            canvasContainer.style.cursor = 'default';
        }
    });

    // Handle mouse leave to stop panning
    document.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            document.body.style.cursor = 'default';
            canvasContainer.style.cursor = 'default';
        }
    });

    // Mouse wheel zoom functionality
    canvasContainer.addEventListener('wheel', (event) => {
        event.preventDefault();

        // Get mouse position relative to canvas container
        const rect = canvasContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate zoom factor
        const zoomDirection = event.deltaY > 0 ? -1 : 1;
        const zoomFactor = 1 + (CONFIG.zoom.speed * zoomDirection);

        // Calculate new zoom level and clamp it
        const newZoomLevel = zoomLevel * zoomFactor;
        if (newZoomLevel < CONFIG.zoom.min || newZoomLevel > CONFIG.zoom.max) {
            return;
        }

        zoomLevel = newZoomLevel;

        // Get current viewbox
        const vbox = canvas.viewbox();

        // Convert mouse position to SVG coordinates before zoom
        const svgMouseX = vbox.x + (mouseX / canvasContainer.clientWidth) * vbox.width;
        const svgMouseY = vbox.y + (mouseY / canvasContainer.clientHeight) * vbox.height;

        // Calculate new viewbox dimensions
        const newWidth = vbox.width / zoomFactor;
        const newHeight = vbox.height / zoomFactor;

        // Calculate new viewbox position to keep mouse point fixed
        const newX = svgMouseX - (mouseX / canvasContainer.clientWidth) * newWidth;
        const newY = svgMouseY - (mouseY / canvasContainer.clientHeight) * newHeight;

        // Apply the new viewbox
        canvas.viewbox(newX, newY, newWidth, newHeight);
    });
}

function generateId() {
    return 'element-' + Math.random().toString(36).substr(2, 9);
}

// Add image from uploaded file
async function addImageFromFile(fileInfo, x = 100, y = 100) {
    // Record state before modification for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const imageData = {
        id: generateId(),
        type: 'image',
        src: fileInfo.path,
        x: x,
        y: y,
        width: CONFIG.element.defaultImageWidth,
        height: CONFIG.element.defaultImageHeight,
        rotation: 0,
        zIndex: currentCanvas.elements.length + 1
    };

    currentCanvas.elements.push(imageData);

    // Add immediately with default size
    const svgElement = await window.elementsAPI.addImageToCanvas(imageData, canvas, currentCanvas);

    // Determine the correct image URL for dimension loading
    let imageUrl = fileInfo.path;
    if (window.isTauriApp && window.isTauriApp()) {
        const filename = imageUrl.split('/').pop();
        try {
            const fsPath = await window.imageAPI.getPath(filename);
            imageUrl = window.__TAURI__.core.convertFileSrc(fsPath);
        } catch (error) {
            console.error('Error converting image path for dimensions:', error);
        }
    }

    // Load image to get actual dimensions and update the specific element
    const img = new Image();
    img.onload = function() {
        // Calculate aspect ratio and reasonable size
        const aspectRatio = this.naturalWidth / this.naturalHeight;
        const maxSize = CONFIG.element.maxImageSize;

        if (aspectRatio > 1) {
            // Landscape
            imageData.width = Math.min(maxSize, this.naturalWidth);
            imageData.height = imageData.width / aspectRatio;
        } else {
            // Portrait or square
            imageData.height = Math.min(maxSize, this.naturalHeight);
            imageData.width = imageData.height * aspectRatio;
        }

        // Update the specific SVG element instead of re-rendering everything
        if (svgElement) {
            svgElement.size(imageData.width, imageData.height);
        }

        scheduleAutoSave();
    };
    img.src = imageUrl;
}

function showNewFolderDialog() {
    const name = prompt('Enter folder name:', 'New Folder');
    if (name) {
        addFolderFromDialog(name);
    }
}

async function addFolderFromDialog(name) {
    try {
        // Record state before modification for undo
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

        // First create a new canvas for this folder
        const parentId = currentCanvas ? currentCanvas.id : null;
        const childCanvas = await window.canvasAPI.create(name, parentId);

        // Add canvas to tree
        await window.treeAPI.addCanvas(childCanvas.id, parentId, name);

        // Reload tree data to update navigation
        if (window.loadTreeData) {
            await window.loadTreeData();
        }

        // Create folder element data
        const folderData = {
            id: generateId(),
            type: 'folder',
            name: name,
            targetCanvasId: childCanvas.id,
            x: 200 + (currentCanvas.elements.length * 20),
            y: 200 + (currentCanvas.elements.length * 20),
            width: 120,
            height: 100,
            rotation: 0,
            zIndex: currentCanvas.elements.length + 1
        };

        // Add to current canvas
        currentCanvas.elements.push(folderData);

        // Add to SVG canvas
        window.elementsAPI.addFolderToCanvas(folderData, canvas, currentCanvas);

        // Save canvas
        scheduleAutoSave();

        // Hide drop zone if needed
        hideDropZoneIfNeeded();

    } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder');
    }
}

function deleteSelectedElement() {
    // Support deleting multiple selected elements
    const selectedElements = window.selectionAPI.getSelectedElements();
    if (selectedElements.length === 0) return;

    // Record state before modification for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Delete each selected element
    selectedElements.forEach(selected => {
        const elementData = selected.data('elementData');
        if (elementData) {
            // Remove resize handles first using the stored IDs
            const handlesIds = selected.attr('data-resize-handles-ids');
            if (handlesIds) {
                handlesIds.split(',').forEach(id => {
                    const handle = document.getElementById(id);
                    if (handle) {
                        handle.remove();
                    }
                });
            }

            // Remove selection rect if it's an image
            const selectionRect = selected.data('selectionRect');
            if (selectionRect) {
                selectionRect.remove();
            }

            // Remove from canvas data
            currentCanvas.elements = currentCanvas.elements.filter(el => el.id !== elementData.id);

            // Remove from canvas
            selected.remove();
        }
    });

    // Clear selection
    window.selectionAPI.clearSelection();

    // Show drop zone if canvas is now empty
    showDropZoneIfNeeded();

    // Trigger auto-save
    scheduleAutoSave();
}

function hideDropZoneIfNeeded() {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone && currentCanvas && currentCanvas.elements && currentCanvas.elements.length > 0) {
        dropZone.style.display = 'none';
    }
}

function showDropZoneIfNeeded() {
    const dropZone = document.getElementById('drop-zone');
    if (dropZone && currentCanvas && (!currentCanvas.elements || currentCanvas.elements.length === 0)) {
        dropZone.style.display = 'flex';
    }
}

function hideAllResizeHandles() {
    const allHandles = document.querySelectorAll('.resize-handles');
    allHandles.forEach(handle => {
        handle.style.setProperty('opacity', '0', 'important');
        handle.style.setProperty('pointer-events', 'none', 'important');
        handle.classList.remove('visible', 'dragging');
    });
}

// Getter for currentCanvas
function getCurrentCanvas() {
    return currentCanvas;
}

// Getter for canvas
function getCanvas() {
    return canvas;
}

// Export currentCanvas globally for use by other modules
Object.defineProperty(window, 'currentCanvas', {
    get: function() {
        return currentCanvas;
    },
    configurable: true
});

// Track mouse position for paste functionality
document.addEventListener('mousemove', (event) => {
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    window.lastMousePosition = lastMousePosition;
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete' && window.elementsAPI.getSelectedElement()) {
        deleteSelectedElement();
    }
});

// Event listeners for toolbar buttons
document.getElementById('save-btn').addEventListener('click', saveCanvas);
document.getElementById('new-folder-btn').addEventListener('click', showNewFolderDialog);

// Export for use by other modules
window.canvasCore = {
    initializeCanvas,
    loadCanvas,
    renderCanvas,
    saveCanvas,
    scheduleAutoSave,
    updateElementPosition,
    addImageFromFile,
    showNewFolderDialog,
    addFolderFromDialog,
    deleteSelectedElement,
    hideDropZoneIfNeeded,
    showDropZoneIfNeeded,
    generateId,
    getCurrentCanvas,
    getCanvas,
    // Background color functions
    getCanvasBackgroundColor,
    setCanvasBackgroundColor,
    showBackgroundColorPicker
};

// Expose functions globally for backward compatibility
window.addRectangleToCanvas = (data) => window.elementsAPI.addRectangleToCanvas(data, canvas, currentCanvas);
window.autoSaveCanvas = saveCanvas;
window.makeElementInteractive = (el) => window.elementsAPI.makeElementInteractive(el, canvas, currentCanvas);
window.selectElement = window.elementsAPI.selectElement;
window.deselectElement = window.elementsAPI.deselectElement;
window.getSelectedElement = window.elementsAPI.getSelectedElement;

// Expose selectedElement for debugging and testing (delegates to selectionAPI)
Object.defineProperty(window, 'selectedElement', {
    get: () => window.selectionAPI.getSelectedElement(),
    set: (value) => window.selectionAPI.setSelectedElement(value),
    configurable: true
});
