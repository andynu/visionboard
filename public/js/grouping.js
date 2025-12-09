// Element grouping functionality for Vision Board
// Allows grouping multiple elements to move/transform as a unit

/**
 * Group selected elements into a single group
 * @returns {Object|null} The group element data or null if grouping failed
 */
function groupSelectedElements() {
    const selectedElements = window.selectionAPI.getSelectedElements();

    if (selectedElements.length < 2) {
        showNotification('Select multiple elements to group');
        return null;
    }

    // Record state before grouping for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const canvas = window.canvasCore.getCanvas();
    const currentCanvas = window.canvasCore.getCurrentCanvas();

    if (!canvas || !currentCanvas) {
        return null;
    }

    // Calculate bounding box of all selected elements
    const bounds = calculateGroupBounds(selectedElements);

    // Generate group ID
    const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Get element IDs and update their data with group reference
    const childIds = [];
    selectedElements.forEach(element => {
        const elementData = element.data('elementData');
        if (elementData) {
            childIds.push(elementData.id);
            // Store group ID on child element
            elementData.groupId = groupId;
            element.data('elementData', elementData);

            // Update in canvas data
            const index = currentCanvas.elements.findIndex(el => el.id === elementData.id);
            if (index !== -1) {
                currentCanvas.elements[index].groupId = groupId;
            }
        }
    });

    // Create group data
    const groupData = {
        id: groupId,
        type: 'group',
        children: childIds,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
    };

    // Add group to canvas elements
    currentCanvas.elements.push(groupData);

    // Create visual group element (invisible container for selection)
    const groupElement = createGroupElement(groupData, canvas, currentCanvas);

    // Clear selection and select the group
    window.selectionAPI.clearSelection();
    window.selectionAPI.selectElement(groupElement, canvas);

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();

    showNotification(`Grouped ${childIds.length} elements`);

    return groupData;
}

/**
 * Ungroup a group element
 * @param {Object} groupElement - SVG.js group element to ungroup
 * @returns {boolean} True if ungrouping succeeded
 */
function ungroupElement(groupElement) {
    if (!groupElement) {
        // Try to get selected element
        groupElement = window.selectionAPI.getSelectedElement();
    }

    if (!groupElement) {
        showNotification('Select a group to ungroup');
        return false;
    }

    const elementData = groupElement.data('elementData');
    if (!elementData || elementData.type !== 'group') {
        showNotification('Selected element is not a group');
        return false;
    }

    // Record state before ungrouping for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const canvas = window.canvasCore.getCanvas();
    const currentCanvas = window.canvasCore.getCurrentCanvas();

    if (!canvas || !currentCanvas) {
        return false;
    }

    // Find child elements and remove groupId
    const childElements = [];
    elementData.children.forEach(childId => {
        // Find child element on canvas
        const childSvgElement = findElementById(childId, canvas);
        if (childSvgElement) {
            childElements.push(childSvgElement);
            const childData = childSvgElement.data('elementData');
            if (childData) {
                delete childData.groupId;
                childSvgElement.data('elementData', childData);

                // Update in canvas data
                const index = currentCanvas.elements.findIndex(el => el.id === childData.id);
                if (index !== -1) {
                    delete currentCanvas.elements[index].groupId;
                }
            }
        }
    });

    // Remove group from canvas elements
    const groupIndex = currentCanvas.elements.findIndex(el => el.id === elementData.id);
    if (groupIndex !== -1) {
        currentCanvas.elements.splice(groupIndex, 1);
    }

    // Remove visual group element
    groupElement.remove();

    // Select the child elements
    if (childElements.length > 0) {
        window.selectionAPI.selectElements(childElements, canvas);
    }

    // Trigger auto-save
    window.canvasCore.scheduleAutoSave();

    showNotification(`Ungrouped ${elementData.children.length} elements`);

    return true;
}

/**
 * Calculate the bounding box of multiple elements
 * @param {Array} elements - Array of SVG.js elements
 * @returns {Object} Bounding box { x, y, width, height }
 */
function calculateGroupBounds(elements) {
    if (!elements || elements.length === 0) {
        return { x: 0, y: 0, width: 100, height: 100 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(element => {
        const bbox = element.bbox();
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
    });

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

/**
 * Create a visual group element on the canvas
 * @param {Object} groupData - Group element data
 * @param {Object} canvas - SVG.js canvas
 * @param {Object} currentCanvas - Current canvas data
 * @returns {Object} SVG.js group element
 */
function createGroupElement(groupData, canvas, currentCanvas) {
    // Create an invisible rectangle to represent the group
    // This allows selecting and dragging the entire group
    const groupRect = canvas.rect(groupData.width, groupData.height)
        .move(groupData.x, groupData.y)
        .fill('none')
        .stroke('none')
        .attr('id', groupData.id);

    // Store the element data
    groupRect.data('elementData', groupData);

    // Make group interactive
    makeGroupInteractive(groupRect, canvas, currentCanvas);

    return groupRect;
}

/**
 * Make a group element interactive (draggable, selectable)
 * @param {Object} groupElement - SVG.js group element
 * @param {Object} canvas - SVG.js canvas
 * @param {Object} currentCanvas - Current canvas data
 */
function makeGroupInteractive(groupElement, canvas, currentCanvas) {
    groupElement.addClass('canvas-element group-element');

    // Create resize handles
    const resizeHandles = window.resizeAPI.createResizeHandles(groupElement, canvas);

    // Click to select
    groupElement.on('click', (event) => {
        event.stopPropagation();

        const options = {};
        if (event.shiftKey) {
            options.addToSelection = true;
        }
        if (event.ctrlKey || event.metaKey) {
            options.toggleSelection = true;
        }
        window.selectionAPI.selectElement(groupElement, canvas, options);
    });

    // Dragging
    let isDragging = false;
    let dragData = { offsetX: 0, offsetY: 0 };

    groupElement.mousedown((event) => {
        if (window.resizeAPI.getIsResizing()) return;
        if (event.button === 1) return;

        event.preventDefault();
        event.stopPropagation();

        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

        isDragging = true;

        const svg = canvas.node;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

        dragData.offsetX = svgPt.x - groupElement.x();
        dragData.offsetY = svgPt.y - groupElement.y();

        const mousemove = (e) => {
            if (!isDragging) return;

            pt.x = e.clientX;
            pt.y = e.clientY;
            const currentSvgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

            let newX = currentSvgPt.x - dragData.offsetX;
            let newY = currentSvgPt.y - dragData.offsetY;

            // Calculate movement delta
            const deltaX = newX - groupElement.x();
            const deltaY = newY - groupElement.y();

            // Move group element
            groupElement.move(newX, newY);

            // Move all child elements
            const groupData = groupElement.data('elementData');
            if (groupData && groupData.children) {
                groupData.children.forEach(childId => {
                    const childElement = findElementById(childId, canvas);
                    if (childElement) {
                        childElement.move(childElement.x() + deltaX, childElement.y() + deltaY);
                        window.selectionAPI.updateSelectionRect(childElement);
                    }
                });
            }

            // Update resize handles
            window.resizeAPI.updateResizeHandles(groupElement, resizeHandles);
        };

        const mouseup = () => {
            isDragging = false;

            // Update group element position
            const groupData = groupElement.data('elementData');
            if (groupData) {
                groupData.x = groupElement.x();
                groupData.y = groupElement.y();
                groupElement.data('elementData', groupData);

                // Update canvas data
                const groupIndex = currentCanvas.elements.findIndex(el => el.id === groupData.id);
                if (groupIndex !== -1) {
                    currentCanvas.elements[groupIndex].x = groupData.x;
                    currentCanvas.elements[groupIndex].y = groupData.y;
                }

                // Update child element positions
                if (groupData.children) {
                    groupData.children.forEach(childId => {
                        const childElement = findElementById(childId, canvas);
                        if (childElement) {
                            window.canvasCore.updateElementPosition(childElement);
                        }
                    });
                }
            }

            window.canvasCore.scheduleAutoSave();

            document.removeEventListener('mousemove', mousemove);
            document.removeEventListener('mouseup', mouseup);
        };

        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    });
}

/**
 * Find an element on the canvas by its ID
 * @param {string} elementId - Element ID
 * @param {Object} canvas - SVG.js canvas
 * @returns {Object|null} SVG.js element or null
 */
function findElementById(elementId, canvas) {
    const elements = canvas.children();
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.attr('id') === elementId) {
            return el;
        }
    }
    return null;
}

/**
 * Load groups from canvas data (called during canvas load)
 * @param {Object} canvas - SVG.js canvas
 * @param {Object} currentCanvas - Current canvas data
 */
function loadGroups(canvas, currentCanvas) {
    if (!currentCanvas || !currentCanvas.elements) return;

    // Find all group elements
    const groups = currentCanvas.elements.filter(el => el.type === 'group');

    groups.forEach(groupData => {
        createGroupElement(groupData, canvas, currentCanvas);
    });
}

/**
 * Check if selected element is a group
 * @returns {boolean} True if selected element is a group
 */
function isGroupSelected() {
    const selectedElement = window.selectionAPI.getSelectedElement();
    if (!selectedElement) return false;

    const elementData = selectedElement.data('elementData');
    return elementData && elementData.type === 'group';
}

/**
 * Check if multiple elements are selected (can be grouped)
 * @returns {boolean} True if multiple elements are selected
 */
function canGroup() {
    return window.selectionAPI.getSelectionCount() >= 2;
}

/**
 * Show notification message
 * @param {string} message - Message to display
 */
function showNotification(message) {
    const notification = document.getElementById('autosave-notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = 'autosave-notification';
    notification.style.background = '#2196F3';
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 1200);
}

/**
 * Initialize grouping keyboard shortcuts
 */
function initializeGroupingShortcuts() {
    document.addEventListener('keydown', (event) => {
        // Don't capture when typing in inputs
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + G: Group
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'g') {
            event.preventDefault();
            if (canGroup()) {
                groupSelectedElements();
            }
        }

        // Ctrl/Cmd + Shift + G: Ungroup
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'g') {
            event.preventDefault();
            if (isGroupSelected()) {
                ungroupElement();
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGroupingShortcuts);
} else {
    initializeGroupingShortcuts();
}

// Export for use by other modules
window.grouping = {
    groupSelectedElements,
    ungroupElement,
    loadGroups,
    isGroupSelected,
    canGroup,
    calculateGroupBounds
};
