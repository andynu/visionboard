let canvas = null;
let currentCanvas = null;
let isDragging = false;
let isResizing = false;
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
        } else if (element.type === 'folder') {
            addFolderToCanvas(element);
        }
    });
    
    // Hide drop zone if there are images on canvas
    hideDropZoneIfNeeded();
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

function addFolderToCanvas(folderData) {
    // Create folder group
    const group = canvas.group();
    
    // Create folder background
    const rect = group.rect(folderData.width, folderData.height)
        .move(folderData.x, folderData.y)
        .fill('#FFF3E0')
        .stroke('#FF9800')
        .stroke({ width: 2 })
        .radius(8);
    
    // Create folder icon
    const iconSize = Math.min(folderData.width, folderData.height) * 0.3;
    const iconX = folderData.x + (folderData.width - iconSize) / 2;
    const iconY = folderData.y + folderData.height * 0.2;
    
    const folderIcon = group.text('📁')
        .move(iconX, iconY)
        .font({ size: iconSize, anchor: 'middle' })
        .attr('pointer-events', 'none'); // Prevent text from intercepting clicks
    
    // Create folder label
    const labelY = iconY + iconSize + 10;
    const label = group.text(folderData.name)
        .move(folderData.x + folderData.width / 2, labelY)
        .font({ size: 14, anchor: 'middle', weight: 'bold' })
        .fill('#333')
        .attr('pointer-events', 'none'); // Prevent text from intercepting clicks
    
    // Store the element data
    group.data('elementData', folderData);
    
    // Make folder interactive
    makeFolderInteractive(group);
    
    return group;
}

function makeFolderInteractive(element) {
    element.addClass('canvas-element folder-element');
    
    // Create resize handles group
    const resizeHandles = createResizeHandles(element);
    
    // Click to select
    element.click((event) => {
        event.stopPropagation();
        selectElement(element);
    });
    
    // Double-click to navigate to folder canvas
    element.dblclick((event) => {
        event.stopPropagation();
        const folderData = element.data('elementData');
        if (folderData.targetCanvasId && window.switchToCanvas) {
            window.switchToCanvas(folderData.targetCanvasId);
        }
    });
    
    // Add folder-specific styling
    element.mouseover(() => {
        resizeHandles.addClass('visible');
        element.find('rect').first().stroke({ width: 3 });
    });
    
    element.mouseout(() => {
        if (!resizeHandles.hasClass('dragging')) {
            resizeHandles.removeClass('visible');
        }
        element.find('rect').first().stroke({ width: 2 });
    });
    
    // Make draggable (same as images)
    let dragData = { offsetX: 0, offsetY: 0 };
    
    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (isResizing) return;
        
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
                
                // Update resize handles position
                updateResizeHandles(element, resizeHandles);
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
}

function makeElementInteractive(element) {
    element.addClass('canvas-element');
    
    // Create resize handles group
    const resizeHandles = createResizeHandles(element);
    
    // Click to select
    element.click((event) => {
        event.stopPropagation();
        selectElement(element);
    });
    
    // Show/hide resize handles on hover
    element.mouseover(() => {
        resizeHandles.addClass('visible');
    });
    
    element.mouseout(() => {
        if (!resizeHandles.hasClass('dragging')) {
            resizeHandles.removeClass('visible');
        }
    });
    
    // Make draggable (fixed implementation for SVG.js 2.7.1)
    let dragData = { offsetX: 0, offsetY: 0 };
    
    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (isResizing) return;
        
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
                
                // Update resize handles position
                updateResizeHandles(element, resizeHandles);
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

function showNewFolderDialog() {
    const name = prompt('Enter folder name:', 'New Folder');
    if (name) {
        addFolderFromDialog(name);
    }
}

async function addFolderFromDialog(name) {
    try {
        // First create a new canvas for this folder
        const response = await fetch('/api/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: name,
                parentId: currentCanvas ? currentCanvas.id : null
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create canvas for folder');
        }
        
        const childCanvas = await response.json();
        
        // Add canvas to tree
        await fetch('/api/tree/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                canvasId: childCanvas.id, 
                parentId: currentCanvas ? currentCanvas.id : null,
                name: name
            })
        });
        
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
        addFolderToCanvas(folderData);
        
        // Save canvas
        scheduleAutoSave();
        
        // Hide drop zone if needed
        hideDropZoneIfNeeded();
        
    } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder');
    }
}

// Event listeners
document.getElementById('save-btn').addEventListener('click', saveCanvas);
document.getElementById('new-folder-btn').addEventListener('click', showNewFolderDialog);

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
        // Remove resize handles first
        const resizeHandles = selectedElement.resizeHandles;
        if (resizeHandles) {
            resizeHandles.remove();
        }
        
        // Remove from canvas data
        currentCanvas.elements = currentCanvas.elements.filter(el => el.id !== elementData.id);
        
        // Remove from canvas
        selectedElement.remove();
        selectedElement = null;
        hideResizeHandles();
        
        // Show drop zone if canvas is now empty
        showDropZoneIfNeeded();
        
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

// Resize handles functionality
function createResizeHandles(element) {
    const group = canvas.group().addClass('resize-handles');
    
    // Create 4 corner handles (larger for easier interaction)
    const handleSize = 10;
    const handles = {
        nw: group.circle(handleSize).addClass('resize-handle nw-resize').attr('style', 'cursor: nw-resize'),
        ne: group.circle(handleSize).addClass('resize-handle ne-resize').attr('style', 'cursor: ne-resize'),
        sw: group.circle(handleSize).addClass('resize-handle sw-resize').attr('style', 'cursor: sw-resize'),
        se: group.circle(handleSize).addClass('resize-handle se-resize').attr('style', 'cursor: se-resize')
    };
    
    // Position handles initially
    updateResizeHandles(element, group);
    
    // Add resize functionality to each handle
    setupResizeHandle(handles.nw, element, 'nw');
    setupResizeHandle(handles.ne, element, 'ne');
    setupResizeHandle(handles.sw, element, 'sw');
    setupResizeHandle(handles.se, element, 'se');
    
    // Store handles reference without using SVG.js data (to avoid circular reference)
    element.resizeHandles = group;
    
    return group;
}

function updateResizeHandles(element, handles) {
    if (!handles) return;
    
    const x = element.x();
    const y = element.y();
    const width = element.width();
    const height = element.height();
    const handleSize = 5; // Half of handle size for centering
    
    // Position each handle at the corners
    const children = handles.children();
    if (children.length >= 4) {
        children[0].center(x - handleSize, y - handleSize); // nw
        children[1].center(x + width + handleSize, y - handleSize); // ne
        children[2].center(x - handleSize, y + height + handleSize); // sw
        children[3].center(x + width + handleSize, y + height + handleSize); // se
    }
}

function setupResizeHandle(handle, element, corner) {
    let startData = {};
    
    handle.mousedown((event) => {
        event.preventDefault();
        event.stopPropagation();
        isResizing = true; // Use global variable
        
        const handles = element.resizeHandles;
        handles.addClass('dragging');
        
        // Get SVG point for accurate coordinate conversion
        const svg = canvas.node;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        // Store initial state
        startData = {
            mouseX: svgPt.x,
            mouseY: svgPt.y,
            elementX: element.x(),
            elementY: element.y(),
            elementWidth: element.width(),
            elementHeight: element.height()
        };
        
        const mousemove = (e) => {
            if (isResizing) {
                // Convert mouse position to SVG coordinates
                pt.x = e.clientX;
                pt.y = e.clientY;
                const currentSvgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
                
                const deltaX = currentSvgPt.x - startData.mouseX;
                const deltaY = currentSvgPt.y - startData.mouseY;
                
                resizeElement(element, corner, deltaX, deltaY, startData);
                updateResizeHandles(element, handles);
            }
        };
        
        const mouseup = () => {
            isResizing = false;
            handles.removeClass('dragging');
            updateElementPosition(element);
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };
        
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
}

function resizeElement(element, corner, deltaX, deltaY, startData) {
    let newX = startData.elementX;
    let newY = startData.elementY;
    let newWidth = startData.elementWidth;
    let newHeight = startData.elementHeight;
    
    const minSize = 20; // Minimum size for elements
    
    switch (corner) {
        case 'nw':
            newX = startData.elementX + deltaX;
            newY = startData.elementY + deltaY;
            newWidth = startData.elementWidth - deltaX;
            newHeight = startData.elementHeight - deltaY;
            break;
        case 'ne':
            newY = startData.elementY + deltaY;
            newWidth = startData.elementWidth + deltaX;
            newHeight = startData.elementHeight - deltaY;
            break;
        case 'sw':
            newX = startData.elementX + deltaX;
            newWidth = startData.elementWidth - deltaX;
            newHeight = startData.elementHeight + deltaY;
            break;
        case 'se':
            newWidth = startData.elementWidth + deltaX;
            newHeight = startData.elementHeight + deltaY;
            break;
    }
    
    // Enforce minimum size
    if (newWidth < minSize) {
        if (corner.includes('w')) newX = startData.elementX + startData.elementWidth - minSize;
        newWidth = minSize;
    }
    if (newHeight < minSize) {
        if (corner.includes('n')) newY = startData.elementY + startData.elementHeight - minSize;
        newHeight = minSize;
    }
    
    // Apply the changes
    element.move(newX, newY).size(newWidth, newHeight);
}

function hideResizeHandles() {
    // Hide all resize handles
    canvas.select('.resize-handles').forEach(handles => {
        handles.removeClass('visible dragging');
    });
}

// Export currentCanvas globally for use by other modules
Object.defineProperty(window, 'currentCanvas', {
    get: function() {
        return currentCanvas;
    }
});