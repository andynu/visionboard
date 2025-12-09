// Canvas element creation and interaction
// Handles adding images, folders, rectangles and making them interactive

let isDragging = false;

function getIsDragging() {
    return isDragging;
}

function setIsDragging(value) {
    isDragging = value;
}

async function addImageToCanvas(imageData, canvas, currentCanvas) {
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
        .size(imageData.width, imageData.height)
        .attr('id', imageData.id);

    if (imageData.rotation) {
        image.rotate(imageData.rotation);
    }

    // Store the element data
    image.data('elementData', imageData);

    // Make image interactive
    makeElementInteractive(image, canvas, currentCanvas);

    return image;
}

function addFolderToCanvas(folderData, canvas, currentCanvas) {
    // Create folder group
    const group = canvas.group()
        .attr('id', folderData.id);

    // Create folder background (positioned relative to group origin)
    const rect = group.rect(folderData.width, folderData.height)
        .move(0, 0)
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
        .attr('pointer-events', 'none');

    // Create folder label (positioned relative to group origin)
    const labelY = iconY + iconSize + 10;
    const label = group.text(folderData.name)
        .move(folderData.width / 2, labelY)
        .font({ size: 14, anchor: 'middle', weight: 'bold' })
        .fill('#333')
        .attr('pointer-events', 'none');

    // Position the entire group
    group.move(folderData.x, folderData.y);

    // Store the element data
    group.data('elementData', folderData);

    // Make folder interactive
    makeFolderInteractive(group, canvas, currentCanvas);

    return group;
}

function addRectangleToCanvas(rectangleData, canvas, currentCanvas) {
    // Create rectangle using SVG.js
    const rect = canvas.rect(rectangleData.width, rectangleData.height)
        .move(rectangleData.x, rectangleData.y)
        .fill(rectangleData.fill || 'none')
        .stroke({
            color: rectangleData.stroke || '#000000',
            width: rectangleData.strokeWidth || 2
        })
        .attr('id', rectangleData.id);

    // Store the element data
    rect.data('elementData', rectangleData);

    // Make rectangle interactive
    makeElementInteractive(rect, canvas, currentCanvas);

    return rect;
}

function makeFolderInteractive(element, canvas, currentCanvas) {
    element.addClass('canvas-element folder-element');

    // Create resize handles group
    const resizeHandles = window.resizeAPI.createResizeHandles(element, canvas);

    // Click to select (with modifier key support)
    element.on('click', (event) => {
        event.stopPropagation();
        selectElement(element, event);
    });

    // Double-click to navigate to folder canvas
    element.dblclick((event) => {
        event.stopPropagation();
        const folderData = element.data('elementData');
        if (folderData.targetCanvasId && window.switchToCanvas) {
            window.switchToCanvas(folderData.targetCanvasId);
        }
    });

    // Make draggable (supports multi-selection drag)
    let dragData = { offsetX: 0, offsetY: 0 };
    let multiDragOffsets = new Map();

    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (window.resizeAPI.getIsResizing()) return;

        // Ignore middle mouse button - let it bubble up for panning
        if (event.button === 1) return;

        event.preventDefault();
        event.stopPropagation();

        // Record state before drag starts for undo
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

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

        // If this element is part of a multi-selection, calculate offsets for all selected elements
        const selectedElements = window.selectionAPI.getSelectedElements();
        multiDragOffsets.clear();
        if (selectedElements.length > 1 && window.selectionAPI.isSelected(element)) {
            selectedElements.forEach(sel => {
                multiDragOffsets.set(sel, {
                    offsetX: svgPt.x - sel.x(),
                    offsetY: svgPt.y - sel.y()
                });
            });
        }

        const mousemove = (e) => {
            if (isDragging) {
                // Convert mouse position to SVG coordinates
                pt.x = e.clientX;
                pt.y = e.clientY;
                const currentSvgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

                // Move all selected elements if multi-selection, otherwise just this one
                if (multiDragOffsets.size > 1) {
                    multiDragOffsets.forEach((offset, sel) => {
                        sel.move(
                            currentSvgPt.x - offset.offsetX,
                            currentSvgPt.y - offset.offsetY
                        );
                    });
                } else {
                    // Move single element
                    element.move(
                        currentSvgPt.x - dragData.offsetX,
                        currentSvgPt.y - dragData.offsetY
                    );
                    // Update resize handles position
                    window.resizeAPI.updateResizeHandles(element, resizeHandles);
                }
            }
        };

        const mouseup = () => {
            isDragging = false;
            // Update positions for all moved elements
            if (multiDragOffsets.size > 1) {
                multiDragOffsets.forEach((offset, sel) => {
                    window.canvasCore.updateElementPosition(sel);
                });
            } else {
                window.canvasCore.updateElementPosition(element);
            }
            multiDragOffsets.clear();
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
}

function makeElementInteractive(element, canvas, currentCanvas) {
    // Handle both SVG.js v2.7.1 and potential version differences
    if (!element || typeof element.addClass !== 'function') {
        console.error('Invalid element passed to makeElementInteractive:', element);
        return;
    }

    element.addClass('canvas-element');

    // Create resize handles group
    const resizeHandles = window.resizeAPI.createResizeHandles(element, canvas);

    // Click to select (with modifier key support)
    element.on('click', (event) => {
        event.stopPropagation();
        selectElement(element, event);
    });

    // Make draggable (supports multi-selection drag)
    let dragData = { offsetX: 0, offsetY: 0 };
    let multiDragOffsets = new Map();

    element.mousedown((event) => {
        // Don't start dragging if we're clicking on a resize handle
        if (window.resizeAPI.getIsResizing()) return;

        // Ignore middle mouse button - let it bubble up for panning
        if (event.button === 1) return;

        event.preventDefault();
        event.stopPropagation();

        // Record state before drag starts for undo
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

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

        // If this element is part of a multi-selection, calculate offsets for all selected elements
        const selectedElements = window.selectionAPI.getSelectedElements();
        multiDragOffsets.clear();
        if (selectedElements.length > 1 && window.selectionAPI.isSelected(element)) {
            selectedElements.forEach(sel => {
                multiDragOffsets.set(sel, {
                    offsetX: svgPt.x - sel.x(),
                    offsetY: svgPt.y - sel.y()
                });
            });
        }

        const mousemove = (e) => {
            if (isDragging) {
                // Convert mouse position to SVG coordinates
                pt.x = e.clientX;
                pt.y = e.clientY;
                const currentSvgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

                // Move all selected elements if multi-selection, otherwise just this one
                if (multiDragOffsets.size > 1) {
                    multiDragOffsets.forEach((offset, sel) => {
                        sel.move(
                            currentSvgPt.x - offset.offsetX,
                            currentSvgPt.y - offset.offsetY
                        );
                    });
                } else {
                    // Move single element
                    element.move(
                        currentSvgPt.x - dragData.offsetX,
                        currentSvgPt.y - dragData.offsetY
                    );
                    // Update resize handles position
                    window.resizeAPI.updateResizeHandles(element, resizeHandles);
                }
            }
        };

        const mouseup = () => {
            isDragging = false;
            // Update positions for all moved elements
            if (multiDragOffsets.size > 1) {
                multiDragOffsets.forEach((offset, sel) => {
                    window.canvasCore.updateElementPosition(sel);
                });
            } else {
                window.canvasCore.updateElementPosition(element);
            }
            multiDragOffsets.clear();
            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
}

function selectElement(element, event) {
    // Use shared selection API with modifier key support
    const options = {};
    if (event && event.shiftKey) {
        options.addToSelection = true;
    }
    if (event && (event.ctrlKey || event.metaKey)) {
        options.toggleSelection = true;
    }
    window.selectionAPI.selectElement(element, window.canvas, options);
}

function getSelectedElement() {
    return window.selectionAPI.getSelectedElement();
}

function getSelectedElements() {
    return window.selectionAPI.getSelectedElements();
}

function deselectElement() {
    window.selectionAPI.deselectElement();
}

// Export for use by other modules
window.elementsAPI = {
    addImageToCanvas,
    addFolderToCanvas,
    addRectangleToCanvas,
    makeElementInteractive,
    makeFolderInteractive,
    selectElement,
    deselectElement,
    getSelectedElement,
    getSelectedElements,
    getIsDragging,
    setIsDragging
};
