let canvas = null;
let currentCanvas = null;
let isDragging = false;
let selectedElement = null;
let autoSaveTimeout = null;

function initializeCanvas() {
    const canvasContainer = document.getElementById('canvas');
    canvas = SVG(canvasContainer).size('100%', '100%');
    canvas.viewbox(0, 0, 1920, 1080);
    
    // Handle canvas clicks to deselect elements
    canvas.click(() => {
        if (selectedElement) {
            deselectElement();
        }
    });
}

async function loadCanvas(canvasId) {
    try {
        const response = await fetch(`/api/canvas/${canvasId}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.log('Canvas not found, creating new one');
                currentCanvas = {
                    id: canvasId,
                    name: 'Main Canvas',
                    elements: []
                };
                return;
            }
            throw new Error('Failed to load canvas');
        }
        
        currentCanvas = await response.json();
        renderCanvas();
    } catch (error) {
        console.error('Error loading canvas:', error);
        currentCanvas = {
            id: canvasId,
            name: 'Main Canvas',
            elements: []
        };
    }
}

function renderCanvas() {
    canvas.clear();
    
    if (!currentCanvas || !currentCanvas.elements) return;
    
    currentCanvas.elements.forEach(element => {
        if (element.type === 'image') {
            addImageToCanvas(element);
        }
    });
}

function addImageToCanvas(imageData) {
    const image = canvas.image(imageData.src)
        .move(imageData.x, imageData.y)
        .size(imageData.width, imageData.height);
    
    if (imageData.rotation) {
        image.rotate(imageData.rotation);
    }
    
    // Store the element data
    image.data('elementData', imageData);
    
    // Make image interactive
    makeElementInteractive(image);
    
    return image;
}

function makeElementInteractive(element) {
    element.addClass('canvas-element');
    
    // Click to select
    element.click((event) => {
        event.stopPropagation();
        selectElement(element);
    });
    
    // Make draggable (fixed implementation for SVG.js 2.7.1)
    let dragData = { offsetX: 0, offsetY: 0 };
    
    element.mousedown((event) => {
        event.preventDefault();
        event.stopPropagation();
        isDragging = true;
        
        // Get SVG point for accurate coordinate conversion
        const svg = canvas.node;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        // Calculate offset from mouse to element origin
        dragData.offsetX = svgPt.x - element.x();
        dragData.offsetY = svgPt.y - element.y();
        
        const mousemove = (e) => {
            if (isDragging) {
                // Convert mouse position to SVG coordinates
                pt.x = e.clientX;
                pt.y = e.clientY;
                const currentSvgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
                
                // Move element maintaining the original offset
                element.move(
                    currentSvgPt.x - dragData.offsetX,
                    currentSvgPt.y - dragData.offsetY
                );
            }
        };
        
        const mouseup = () => {
            isDragging = false;
            updateElementPosition(element);
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };
        
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
    
    // Double-click to show resize handles (simplified)
    element.dblclick(() => {
        showResizeHandles(element);
    });
}

function selectElement(element) {
    deselectElement();
    selectedElement = element;
    element.addClass('selected');
}

function deselectElement() {
    if (selectedElement) {
        selectedElement.removeClass('selected');
        hideResizeHandles();
        selectedElement = null;
    }
}

function showResizeHandles(element) {
    hideResizeHandles();
    
    const bbox = element.bbox();
    const handleSize = 8;
    
    // Create resize handles at corners
    const handles = [
        { x: bbox.x - handleSize/2, y: bbox.y - handleSize/2 },
        { x: bbox.x2 - handleSize/2, y: bbox.y - handleSize/2 },
        { x: bbox.x2 - handleSize/2, y: bbox.y2 - handleSize/2 },
        { x: bbox.x - handleSize/2, y: bbox.y2 - handleSize/2 }
    ];
    
    handles.forEach((handle, index) => {
        const rect = canvas.rect(handleSize, handleSize)
            .move(handle.x, handle.y)
            .addClass('resize-handle')
            .fill('#fff')
            .stroke('#000');
        
        rect.draggable();
        rect.on('dragmove', () => resizeElement(element, index, rect));
    });
}

function hideResizeHandles() {
    canvas.select('.resize-handle').forEach(handle => handle.remove());
}

function resizeElement(element, handleIndex, handle) {
    // Simplified resize logic - in a full implementation, 
    // you'd calculate new dimensions based on handle position
    const bbox = element.bbox();
    const handlePos = handle.bbox();
    
    // This is a basic implementation - you'd want more sophisticated resize logic
    if (handleIndex === 2) { // bottom-right handle
        const newWidth = handlePos.x - bbox.x;
        const newHeight = handlePos.y - bbox.y;
        element.size(Math.max(20, newWidth), Math.max(20, newHeight));
    }
}

function updateElementPosition(element) {
    const bbox = element.bbox();
    const elementData = element.data('elementData');
    
    if (elementData) {
        elementData.x = bbox.x;
        elementData.y = bbox.y;
        elementData.width = bbox.width;
        elementData.height = bbox.height;
        
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
        const response = await fetch(`/api/canvas/${currentCanvas.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentCanvas)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save canvas');
        }
        
        console.log('Canvas saved successfully');
    } catch (error) {
        console.error('Error saving canvas:', error);
        alert('Failed to save canvas');
    }
}

// Add image from uploaded file
function addImageFromFile(fileInfo, x = 100, y = 100) {
    const imageData = {
        id: generateId(),
        type: 'image',
        src: fileInfo.path,
        x: x,
        y: y,
        width: 300,
        height: 200,
        rotation: 0,
        zIndex: currentCanvas.elements.length + 1
    };
    
    currentCanvas.elements.push(imageData);
    
    // Add immediately with default size
    const svgElement = addImageToCanvas(imageData);
    
    // Load image to get actual dimensions and update the specific element
    const img = new Image();
    img.onload = function() {
        // Calculate aspect ratio and reasonable size
        const aspectRatio = this.naturalWidth / this.naturalHeight;
        const maxSize = 400;
        
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
    img.src = fileInfo.path;
}

function generateId() {
    return 'element-' + Math.random().toString(36).substr(2, 9);
}

// Event listeners
document.getElementById('save-btn').addEventListener('click', saveCanvas);

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete' && selectedElement) {
        deleteSelectedElement();
    }
});

function deleteSelectedElement() {
    if (!selectedElement) return;
    
    const elementData = selectedElement.data('elementData');
    if (elementData) {
        // Remove from canvas data
        currentCanvas.elements = currentCanvas.elements.filter(el => el.id !== elementData.id);
        
        // Remove from canvas
        selectedElement.remove();
        selectedElement = null;
        hideResizeHandles();
        
        // Trigger auto-save
        scheduleAutoSave();
    }
}

function scheduleAutoSave() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Schedule save in 2 seconds
    autoSaveTimeout = setTimeout(() => {
        saveCanvas();
    }, 2000);
}