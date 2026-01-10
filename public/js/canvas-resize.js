// Canvas resize handles functionality
// Handles creation, positioning, and interaction of resize handles for canvas elements

let isResizing = false;

function getIsResizing() {
    return isResizing;
}

function setIsResizing(value) {
    isResizing = value;
}

function createResizeHandles(element, canvas) {
    const handleRadius = CONFIG.resizeHandle.radius;

    // Create circles directly on canvas (not in a group)
    const handles = {
        nw: canvas.circle(handleRadius * 2)
            .addClass('resize-handle nw-resize')
            .fill('#ffffff')
            .stroke({ color: '#007AFF', width: 3 })
            .attr('style', 'cursor: nw-resize'),
        ne: canvas.circle(handleRadius * 2)
            .addClass('resize-handle ne-resize')
            .fill('#ffffff')
            .stroke({ color: '#007AFF', width: 3 })
            .attr('style', 'cursor: ne-resize'),
        sw: canvas.circle(handleRadius * 2)
            .addClass('resize-handle sw-resize')
            .fill('#ffffff')
            .stroke({ color: '#007AFF', width: 3 })
            .attr('style', 'cursor: sw-resize'),
        se: canvas.circle(handleRadius * 2)
            .addClass('resize-handle se-resize')
            .fill('#ffffff')
            .stroke({ color: '#007AFF', width: 3 })
            .attr('style', 'cursor: se-resize')
    };

    // Store references in an array
    const handlesArray = [handles.nw, handles.ne, handles.sw, handles.se];

    // Force visibility on each handle
    Object.keys(handles).forEach(corner => {
        const handle = handles[corner];
        handle.node.style.opacity = '1';
        handle.node.style.pointerEvents = 'all';
    });

    // Position handles initially
    updateResizeHandles(element, handlesArray);

    // Move all handles to front of SVG
    Object.keys(handles).forEach(corner => {
        handles[corner].front();
    });

    // Add resize functionality to each handle
    setupResizeHandle(handles.nw, element, 'nw', canvas);
    setupResizeHandle(handles.ne, element, 'ne', canvas);
    setupResizeHandle(handles.sw, element, 'sw', canvas);
    setupResizeHandle(handles.se, element, 'se', canvas);

    // Store handles reference - save array of IDs
    const handlesIds = handlesArray.map(h => h.attr('id')).join(',');
    element.attr('data-resize-handles-ids', handlesIds);

    // Hide handles by default (not visible until element is selected)
    handlesArray.forEach(handle => {
        handle.node.style.setProperty('opacity', '0', 'important');
        handle.node.style.setProperty('pointer-events', 'none', 'important');
    });

    return handlesArray;
}

function updateResizeHandles(element, handles) {
    if (!handles || !Array.isArray(handles) || handles.length < 4) return;

    const elementData = element.data('elementData');
    if (!elementData) return;

    // Use SVG coordinates instead of browser coordinates
    const x = element.x();
    const y = element.y();
    // Use stored dimensions for folders, actual dimensions for images
    const width = elementData.type === 'folder' ? elementData.width : element.width();
    const height = elementData.type === 'folder' ? elementData.height : element.height();
    const handleOffset = 12; // Match the handleRadius from createResizeHandles

    // Position each handle at the corners using SVG coordinates
    handles[0].center(x - handleOffset, y - handleOffset); // nw
    handles[1].center(x + width + handleOffset, y - handleOffset); // ne
    handles[2].center(x - handleOffset, y + height + handleOffset); // sw
    handles[3].center(x + width + handleOffset, y + height + handleOffset); // se
}

function setupResizeHandle(handle, element, corner, canvas) {
    let startData = {};

    handle.mousedown((event) => {
        event.preventDefault();
        event.stopPropagation();

        // Check if element is locked - prevent resizing locked elements
        const checkElementData = element.data('elementData');
        if (checkElementData && checkElementData.locked) {
            return;
        }

        // Record state before resize starts for undo
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

        isResizing = true;

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
            window.canvasCore.updateElementPosition(element);
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

    const minSize = CONFIG.element.minSize;
    const elementData = element.data('elementData');
    const isImage = !elementData || elementData.type !== 'folder';

    // Calculate aspect ratio for images
    const aspectRatio = startData.elementWidth / startData.elementHeight;

    if (isImage) {
        // For images, maintain aspect ratio using diagonal movement as scale factor
        // Calculate scale based on the corner being dragged
        let scale;

        switch (corner) {
            case 'nw':
                // Dragging NW corner: negative delta means larger
                // Use average of width and height change to determine scale
                scale = 1 - (deltaX + deltaY) / (startData.elementWidth + startData.elementHeight);
                break;
            case 'ne':
                // Dragging NE corner: positive deltaX and negative deltaY means larger
                scale = 1 + (deltaX - deltaY) / (startData.elementWidth + startData.elementHeight);
                break;
            case 'sw':
                // Dragging SW corner: negative deltaX and positive deltaY means larger
                scale = 1 + (-deltaX + deltaY) / (startData.elementWidth + startData.elementHeight);
                break;
            case 'se':
                // Dragging SE corner: positive delta means larger
                scale = 1 + (deltaX + deltaY) / (startData.elementWidth + startData.elementHeight);
                break;
        }

        // Apply scale to both dimensions
        newWidth = startData.elementWidth * scale;
        newHeight = startData.elementHeight * scale;

        // Enforce minimum size while maintaining aspect ratio
        if (newWidth < minSize || newHeight < minSize) {
            if (aspectRatio > 1) {
                // Wider than tall: constrain by height
                newHeight = minSize;
                newWidth = minSize * aspectRatio;
            } else {
                // Taller than wide: constrain by width
                newWidth = minSize;
                newHeight = minSize / aspectRatio;
            }
        }

        // Calculate position based on corner being dragged
        switch (corner) {
            case 'nw':
                // Anchor is SE corner
                newX = startData.elementX + startData.elementWidth - newWidth;
                newY = startData.elementY + startData.elementHeight - newHeight;
                break;
            case 'ne':
                // Anchor is SW corner
                newY = startData.elementY + startData.elementHeight - newHeight;
                break;
            case 'sw':
                // Anchor is NE corner
                newX = startData.elementX + startData.elementWidth - newWidth;
                break;
            case 'se':
                // Anchor is NW corner - position stays the same
                break;
        }

        // Apply changes for images
        element.move(newX, newY);
        element.size(newWidth, newHeight);
    } else {
        // For folders, allow free-form resizing (original behavior)
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

        // Enforce minimum size for folders
        if (newWidth < minSize) {
            if (corner.includes('w')) newX = startData.elementX + startData.elementWidth - minSize;
            newWidth = minSize;
        }
        if (newHeight < minSize) {
            if (corner.includes('n')) newY = startData.elementY + startData.elementHeight - minSize;
            newHeight = minSize;
        }

        // Apply changes for folders
        element.move(newX, newY);

        // For folders, manually resize components and update stored dimensions
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
    }
}

// Export for use by other modules
window.resizeAPI = {
    createResizeHandles,
    updateResizeHandles,
    resizeElement,
    getIsResizing,
    setIsResizing
};
