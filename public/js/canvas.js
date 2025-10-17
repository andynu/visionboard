let canvas = null;
let currentCanvas = null;
let isDragging = false;
let isResizing = false;
let selectedElement = null;
let autoSaveTimeout = null;
let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewBoxStart = { x: 0, y: 0, width: 0, height: 0 };
let zoomLevel = 1.0;
const minZoom = 0.1;
const maxZoom = 10.0;
const zoomSpeed = 0.1;
let lastMousePosition = { x: 0, y: 0 };

function initializeCanvas() {
    const canvasContainer = document.getElementById('canvas');
    canvas = SVG(canvasContainer).size('100%', '100%');
    canvas.viewbox(-500, -300, 2420, 1380);
    
    // Expose canvas globally for tool manager
    window.canvas = canvas;
    
    // Note: Global function exposure moved to end of file after all functions are defined
    
    // Handle canvas clicks to deselect elements
    canvas.click((event) => {
        // Only deselect if we clicked on empty canvas space, not on an element
        const target = event.target;
        const isCanvasElement = target && (
            target.classList.contains('canvas-element') ||
            target.closest('.canvas-element') ||
            target.classList.contains('resize-handle')
        );
        
        if (selectedElement && !isPanning && !isCanvasElement) {
            deselectElement();
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

    // Render elements - handle async image loading
    for (const element of currentCanvas.elements) {
        if (element.type === 'image') {
            await addImageToCanvas(element);
        } else if (element.type === 'folder') {
            addFolderToCanvas(element);
        } else if (element.type === 'rectangle') {
            addRectangleToCanvas(element);
        }
    }
    
    // Re-attach event listeners to all canvas elements after loading
    setTimeout(() => {
        reattachEventListeners();
        // Ensure all resize handles are hidden after rendering
        hideAllResizeHandles();
    }, 100);
    
    // Hide drop zone if there are images on canvas
    hideDropZoneIfNeeded();
}

function reattachEventListeners() {
    console.log('Re-attaching event listeners to loaded elements...');
    
    // Use more reliable approach: listen at SVG container level and delegate to elements
    const svgContainer = document.querySelector('#canvas svg');
    if (svgContainer) {
        // Remove existing listener if any
        if (svgContainer._elementClickHandler) {
            svgContainer.removeEventListener('click', svgContainer._elementClickHandler);
        }
        
        // Create unified click handler for all canvas elements
        svgContainer._elementClickHandler = (event) => {
            const target = event.target;
            
            // Check if clicked element is a canvas element
            if (target && target.classList.contains('canvas-element')) {
                console.log('Canvas element clicked:', target.id);
                event.stopPropagation();
                
                let elementToSelect = null;
                
                // If user clicked on an image, check if there's a rectangle at the same location
                // This handles the case where rectangles are selection outlines behind images
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
                                console.log('Found rectangle under image click:', element.id);
                                target = element; // Switch target to the rectangle
                                break;
                            }
                        }
                    }
                }
                
                // Find the SVG.js element using more reliable DOM-based approach
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
                        console.log('canvas.select failed, trying alternative approach');
                    }
                }
                
                if (elementToSelect && elementToSelect.node) {
                    console.log('Found SVG.js element, selecting:', target.id);
                    selectElement(elementToSelect);
                    
                    // Debug: verify selection worked
                    setTimeout(() => {
                        const selected = document.querySelector('.selected');
                        console.log('Selection result - element with selected class:', selected?.id);
                        console.log('selectedElement variable:', selectedElement?.node?.id);
                    }, 100);
                } else {
                    console.log('Could not find SVG.js element for:', target.id);
                }
            }
        };
        
        // Add the listener with capture to ensure it gets events first
        svgContainer.addEventListener('click', svgContainer._elementClickHandler, true);
        console.log('Added unified click handler to SVG container');
    }
}

async function addImageToCanvas(imageData) {
    // Convert image path for Tauri if needed
    let imageSrc = imageData.src;

    if (window.isTauriApp && window.isTauriApp()) {
        // Extract filename from path like "/api/images/filename.ext"
        const filename = imageSrc.split('/').pop();

        try {
            // Get the actual filesystem path
            const fsPath = await window.imageAPI.getPath(filename);
            // Convert to asset URL that webview can load
            imageSrc = window.__TAURI__.core.convertFileSrc(fsPath);
        } catch (error) {
            console.error('Error converting image path:', error);
            // Fallback to original path
        }
    }

    const image = canvas.image(imageSrc)
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
    
    // Create folder background (positioned relative to group origin)
    const rect = group.rect(folderData.width, folderData.height)
        .move(0, 0)  // Position relative to group
        .fill('#FFF3E0')
        .stroke('#FF9800')
        .stroke({ width: 2 })
        .radius(8);
    
    // Create folder icon (positioned relative to group origin)
    const iconSize = Math.min(folderData.width, folderData.height) * 0.3;
    const iconX = (folderData.width - iconSize) / 2;
    const iconY = folderData.height * 0.2;
    
    // Create SVG folder icon using path
    const folderIcon = group.path('M4 4h6l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z')
        .fill('#6b7280')
        .size(iconSize)
        .move(iconX, iconY)
        .attr('pointer-events', 'none'); // Prevent icon from intercepting clicks
    
    // Create folder label (positioned relative to group origin)
    const labelY = iconY + iconSize + 10;
    const label = group.text(folderData.name)
        .move(folderData.width / 2, labelY)
        .font({ size: 14, anchor: 'middle', weight: 'bold' })
        .fill('#333')
        .attr('pointer-events', 'none'); // Prevent text from intercepting clicks
    
    // Position the entire group
    group.move(folderData.x, folderData.y);
    
    // Store the element data
    group.data('elementData', folderData);
    
    // Make folder interactive
    makeFolderInteractive(group);
    
    return group;
}

function addRectangleToCanvas(rectangleData) {
    // Create rectangle using SVG.js
    const rect = canvas.rect(rectangleData.width, rectangleData.height)
        .move(rectangleData.x, rectangleData.y)
        .fill(rectangleData.fill || 'none')
        .stroke({
            color: rectangleData.stroke || '#000000',
            width: rectangleData.strokeWidth || 2
        });
    
    // Store the element data
    rect.data('elementData', rectangleData);
    
    // Make rectangle interactive
    makeElementInteractive(rect);
    
    return rect;
}

function makeFolderInteractive(element) {
    element.addClass('canvas-element folder-element');
    
    // Create resize handles group
    const resizeHandles = createResizeHandles(element);
    
    // Click to select - try SVG.js .on() method which may work better than .click() in v2.7.1
    element.on('click', (event) => {
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
    
    // Show resize handles when folder is selected
    // (Resize handles will be shown/hidden in selectElement/deselectElement functions)
    
    // Make draggable (same as images)
    let dragData = { offsetX: 0, offsetY: 0 };
    
    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (isResizing) return;
        
        // Ignore middle mouse button - let it bubble up for panning
        if (event.button === 1) return;
        
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
    // Handle both SVG.js v2.7.1 and potential version differences
    if (!element || typeof element.addClass !== 'function') {
        console.error('Invalid element passed to makeElementInteractive:', element);
        return;
    }
    
    element.addClass('canvas-element');

    // Create resize handles group
    const resizeHandles = createResizeHandles(element);

    // Click to select - add direct click handler like folders have
    element.on('click', (event) => {
        event.stopPropagation();
        selectElement(element);
    });

    // Show resize handles when element is selected
    // (Resize handles will be shown/hidden in selectElement/deselectElement functions)

    // Make draggable (fixed implementation for SVG.js 2.7.1)
    let dragData = { offsetX: 0, offsetY: 0 };
    
    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (isResizing) return;
        
        // Ignore middle mouse button - let it bubble up for panning
        if (event.button === 1) return;
        
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
    console.log('selectElement called with:', element);
    deselectElement();
    
    // First hide ALL resize handles to prevent multiple visible handles
    const allHandles = document.querySelectorAll('[id*="handles-"]');
    allHandles.forEach(handlesGroup => {
        handlesGroup.style.setProperty('opacity', '0', 'important');
        handlesGroup.style.setProperty('pointer-events', 'none', 'important');
        handlesGroup.classList.remove('visible');
    });
    
    selectedElement = element;
    
    // Use DOM method for more reliable class management with SVG.js v2.7.1
    const domElement = element.node;
    if (domElement) {
        domElement.classList.add('selected');
        console.log('Added selected class to element:', domElement.id);
    }
    
    // Show resize handles for selected element only
    const handlesId = element.attr('data-resize-handles-id');
    if (handlesId) {
        const handlesGroup = document.getElementById(handlesId);
        if (handlesGroup) {
            handlesGroup.style.setProperty('opacity', '1', 'important');
            handlesGroup.style.setProperty('pointer-events', 'all', 'important');
            handlesGroup.classList.add('visible');
            console.log('Showing handles for selected element:', handlesId);
        }
    }
    
    // Add selected styling for folders
    if (element.data('elementData') && element.data('elementData').type === 'folder') {
        element.find('rect').first().stroke({ width: 3 });
    }
}

function deselectElement() {
    if (selectedElement) {
        // Use DOM method for more reliable class management with SVG.js v2.7.1
        const domElement = selectedElement.node;
        if (domElement) {
            domElement.classList.remove('selected');
        }
        
        // Hide resize handles for the previously selected element
        const handlesId = selectedElement.attr('data-resize-handles-id');
        if (handlesId) {
            // Use direct style manipulation with !important to override CSS rules
            const handlesGroup = document.getElementById(handlesId);
            if (handlesGroup) {
                handlesGroup.style.setProperty('opacity', '0', 'important');
                handlesGroup.style.setProperty('pointer-events', 'none', 'important');
                handlesGroup.classList.remove('visible');
            }
        }
        
        // Remove selected styling for folders
        if (selectedElement.data('elementData') && selectedElement.data('elementData').type === 'folder') {
            selectedElement.find('rect').first().stroke({ width: 2 });
        }
        
        selectedElement = null;
    }
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
        console.log('Canvas saved successfully');
        showAutosaveNotification('Saved', 'saved');
    } catch (error) {
        console.error('Error saving canvas:', error);
        showAutosaveNotification('Save failed', 'error');
    }
}

// Add image from uploaded file
async function addImageFromFile(fileInfo, x = 100, y = 100) {
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
    const svgElement = await addImageToCanvas(imageData);

    // Determine the correct image URL for dimension loading
    let imageUrl = fileInfo.path;
    if (window.isTauriApp && window.isTauriApp()) {
        const filename = imageUrl.split('/').pop();
        try {
            const fsPath = await window.imageAPI.getPath(filename);
            // Don't pass protocol parameter - let Tauri use its default
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
    img.src = imageUrl;
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

// Track mouse position for paste functionality
document.addEventListener('mousemove', (event) => {
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    // Make it globally accessible for drag-drop.js
    window.lastMousePosition = lastMousePosition;
});

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
        // Remove resize handles first using the stored ID
        const handlesId = selectedElement.attr('data-resize-handles-id');
        if (handlesId) {
            const handlesGroup = document.getElementById(handlesId);
            if (handlesGroup) {
                handlesGroup.remove();
            }
        }
        
        // Remove from canvas data
        currentCanvas.elements = currentCanvas.elements.filter(el => el.id !== elementData.id);
        
        // Remove from canvas
        selectedElement.remove();
        selectedElement = null;
        
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
    
    // Show saving notification
    showAutosaveNotification('Saving...', 'saving');
    
    // Schedule save in 2 seconds
    autoSaveTimeout = setTimeout(() => {
        saveCanvas();
    }, 2000);
}

// Resize handles functionality
function createResizeHandles(element) {
    const group = canvas.group().addClass('resize-handles');
    
    // Create 4 corner handles (larger for easier interaction)
    const handleSize = 16;
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
    
    // Keep handles visible during interaction
    group.on('mouseover', () => {
        if (group.hasClass('visible')) {
            // Only enhance visibility if already visible (selected)
            group.addClass('highlight');
        }
    });
    
    group.on('mouseout', () => {
        group.removeClass('highlight');
    });
    
    // Store handles reference using SVG.js attr method
    const handlesId = `handles-${Date.now()}-${Math.random()}`;
    element.attr('data-resize-handles-id', handlesId);
    group.attr('id', handlesId);
    
    // Ensure handles are hidden by default (not visible until element is selected)
    // Use direct style manipulation with !important to override CSS hover rules
    // SVG.js provides the .node property to access the actual DOM element
    group.node.style.setProperty('opacity', '0', 'important');
    group.node.style.setProperty('pointer-events', 'none', 'important');
    
    return group;
}

function updateResizeHandles(element, handles) {
    if (!handles) return;
    
    const elementData = element.data('elementData');
    if (!elementData) return;
    
    // Use SVG coordinates instead of browser coordinates
    const x = element.x();
    const y = element.y();
    // Use stored dimensions for folders, actual dimensions for images
    const width = elementData.type === 'folder' ? elementData.width : element.width();
    const height = elementData.type === 'folder' ? elementData.height : element.height();
    const handleSize = 8; // Half of handle size for centering
    
    // Position each handle at the corners using SVG coordinates
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
        
        // Find the handles group by ID
        const handlesId = element.attr('data-resize-handles-id');
        const handlesGroup = document.getElementById(handlesId);
        if (handlesGroup) {
            handlesGroup.classList.add('dragging');
        }
        
        // Get SVG point for accurate coordinate conversion
        const svg = canvas.node;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
        
        // Store initial state
        const elementData = element.data('elementData');
        const width = elementData && elementData.type === 'folder' ? elementData.width : element.width();
        const height = elementData && elementData.type === 'folder' ? elementData.height : element.height();
        
        startData = {
            mouseX: svgPt.x,
            mouseY: svgPt.y,
            elementX: element.x(),
            elementY: element.y(),
            elementWidth: width,
            elementHeight: height
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
                // Update resize handles position - get handles group by ID
                const currentHandlesGroup = document.getElementById(handlesId);
                if (currentHandlesGroup) {
                    // Convert DOM element back to SVG.js element for updateResizeHandles
                    const svgHandlesGroup = canvas.select(`#${handlesId}`).first();
                    if (svgHandlesGroup) {
                        updateResizeHandles(element, svgHandlesGroup);
                    }
                }
            }
        };
        
        const mouseup = () => {
            isResizing = false;
            // Remove dragging class from handles group
            if (handlesGroup) {
                handlesGroup.classList.remove('dragging');
            }
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
    element.move(newX, newY);
    
    const elementData = element.data('elementData');
    if (elementData && elementData.type === 'folder') {
        // For folders, we need to manually resize the components and update stored dimensions
        elementData.width = newWidth;
        elementData.height = newHeight;
        
        // Update the folder rectangle size
        const rect = element.find('rect').first();
        if (rect) {
            rect.size(newWidth, newHeight);
        }
        
        // Reposition folder icon and label
        const iconSize = Math.min(newWidth, newHeight) * 0.3;
        const iconX = (newWidth - iconSize) / 2;
        const iconY = newHeight * 0.2;
        
        const folderIcon = element.find('path').first();
        if (folderIcon) {
            folderIcon.size(iconSize).move(iconX, iconY);
        }
        
        const label = element.find('text').first();
        if (label) {
            const labelY = iconY + iconSize + 10;
            label.move(newWidth / 2, labelY);
        }
    } else {
        // For images, use the standard size method
        element.size(newWidth, newHeight);
    }
}


// Autosave notification system
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
    
    // Hide after delay (longer for saving, shorter for saved/error)
    const hideDelay = type === 'saving' ? 3000 : 1500;
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
        // Left mouse button (button 0) panning - only on empty canvas
        if (event.button === 0 && 
            (event.target === canvasContainer || event.target === canvas.node) && 
            !isDragging && !isResizing) {
            event.preventDefault();
            startPanning(event);
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
            !isDragging && !isResizing && !isPanning) {
            canvasContainer.style.cursor = 'grab';
        }
    });
    
    canvasContainer.addEventListener('mouseout', (event) => {
        if (!isPanning && !isDragging && !isResizing) {
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
            // Since we're moving the viewbox, we need to scale by the zoom factor
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
            // Reset cursor
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
        const zoomDirection = event.deltaY > 0 ? -1 : 1; // Invert for natural zoom direction
        const zoomFactor = 1 + (zoomSpeed * zoomDirection);
        
        // Calculate new zoom level and clamp it
        const newZoomLevel = zoomLevel * zoomFactor;
        if (newZoomLevel < minZoom || newZoomLevel > maxZoom) {
            return; // Don't zoom if it would exceed limits
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

// Export currentCanvas globally for use by other modules
Object.defineProperty(window, 'currentCanvas', {
    get: function() {
        return currentCanvas;
    }
});

function hideAllResizeHandles() {
    // Hide all resize handles using direct style manipulation for reliability
    const allHandles = document.querySelectorAll('.resize-handles');
    allHandles.forEach(handle => {
        handle.style.setProperty('opacity', '0', 'important');
        handle.style.setProperty('pointer-events', 'none', 'important');
        handle.classList.remove('visible', 'dragging');
    });
}

// Expose functions globally for drawing tools (after all functions are defined)
window.addRectangleToCanvas = addRectangleToCanvas;
window.autoSaveCanvas = saveCanvas;
window.makeElementInteractive = makeElementInteractive;
window.selectElement = selectElement;
window.deselectElement = deselectElement;

// Expose selectedElement for debugging and testing
Object.defineProperty(window, 'selectedElement', {
    get: () => selectedElement,
    set: (value) => { selectedElement = value; },
    configurable: true
});