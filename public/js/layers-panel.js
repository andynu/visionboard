// Layers Panel for Vision Board
// Shows all canvas elements with reordering and visibility controls

let layersPanel = null;
let layersList = null;
let layersBtn = null;
let isPanelOpen = false;
let draggedLayerItem = null;
let dragOverLayerItem = null;

/**
 * Initialize the layers panel
 */
function initializeLayersPanel() {
    layersPanel = document.getElementById('layers-panel');
    layersList = document.getElementById('layers-list');
    layersBtn = document.getElementById('layers-btn');

    if (!layersPanel || !layersList) return;

    // Set up toggle button
    if (layersBtn) {
        layersBtn.addEventListener('click', toggleLayersPanel);
    }

    // Set up close button
    const closeBtn = document.getElementById('layers-panel-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeLayersPanel);
    }

    // Set up keyboard shortcut
    document.addEventListener('keydown', handleKeyboardShortcut);

    // Listen for selection changes
    window.addEventListener('selectionChange', refreshLayersList);

    // Listen for canvas changes
    window.addEventListener('canvasLoaded', refreshLayersList);
    window.addEventListener('canvasModified', refreshLayersList);
}

/**
 * Handle keyboard shortcut for layers panel
 */
function handleKeyboardShortcut(event) {
    // Shift+L to toggle layers panel
    if (event.shiftKey && event.key.toLowerCase() === 'l' &&
        event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        toggleLayersPanel();
    }
}

/**
 * Toggle the layers panel open/closed
 */
function toggleLayersPanel() {
    if (isPanelOpen) {
        closeLayersPanel();
    } else {
        openLayersPanel();
    }
}

/**
 * Open the layers panel
 */
function openLayersPanel() {
    if (!layersPanel) return;

    layersPanel.classList.add('open');
    isPanelOpen = true;

    if (layersBtn) {
        layersBtn.classList.add('active');
    }

    refreshLayersList();
}

/**
 * Close the layers panel
 */
function closeLayersPanel() {
    if (!layersPanel) return;

    layersPanel.classList.remove('open');
    isPanelOpen = false;

    if (layersBtn) {
        layersBtn.classList.remove('active');
    }
}

/**
 * Refresh the layers list from current canvas state
 */
function refreshLayersList() {
    if (!layersList || !isPanelOpen) return;

    const currentCanvas = window.canvasCore?.getCurrentCanvas();
    if (!currentCanvas || !currentCanvas.elements) {
        layersList.innerHTML = '<div class="layers-empty">No elements on canvas</div>';
        return;
    }

    // Get all non-group elements (groups are rendered separately)
    const elements = currentCanvas.elements
        .filter(el => el.type !== 'group')
        .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); // Sort by z-index descending (top first)

    if (elements.length === 0) {
        layersList.innerHTML = '<div class="layers-empty">No elements on canvas</div>';
        return;
    }

    // Build the layer items
    layersList.innerHTML = '';
    elements.forEach(element => {
        const layerItem = createLayerItem(element);
        layersList.appendChild(layerItem);
    });
}

/**
 * Create a layer item DOM element
 * @param {Object} element - The element data
 * @returns {HTMLElement} The layer item element
 */
function createLayerItem(element) {
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.dataset.elementId = element.id;

    // Check if this element is selected
    const svgElement = findSvgElement(element.id);
    if (svgElement && window.selectionAPI?.isSelected(svgElement)) {
        item.classList.add('selected');
    }

    // Check visibility
    const isVisible = element.visible !== false;
    const isLocked = element.locked === true;

    // Build the item HTML
    item.innerHTML = `
        <span class="layer-drag-handle"><i class="fas fa-grip-vertical"></i></span>
        <button class="layer-visibility ${isVisible ? '' : 'hidden'}" title="${isVisible ? 'Hide' : 'Show'}">
            <i class="far ${isVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>
        </button>
        ${getLayerIcon(element)}
        <span class="layer-name">${getLayerName(element)}</span>
        <button class="layer-lock ${isLocked ? 'locked' : ''}" title="${isLocked ? 'Unlock' : 'Lock'}">
            <i class="fas ${isLocked ? 'fa-lock' : 'fa-lock-open'}"></i>
        </button>
    `;

    // Click to select
    item.addEventListener('click', (e) => {
        if (e.target.closest('.layer-visibility') ||
            e.target.closest('.layer-lock') ||
            e.target.closest('.layer-drag-handle')) {
            return; // Don't select when clicking controls
        }
        handleLayerClick(element.id, e);
    });

    // Visibility toggle
    const visBtn = item.querySelector('.layer-visibility');
    visBtn.addEventListener('click', () => toggleVisibility(element.id));

    // Lock toggle
    const lockBtn = item.querySelector('.layer-lock');
    lockBtn.addEventListener('click', () => toggleLock(element.id));

    // Drag and drop for reordering
    setupDragAndDrop(item, element);

    return item;
}

/**
 * Get the icon HTML for a layer based on element type
 */
function getLayerIcon(element) {
    switch (element.type) {
        case 'image':
            // Try to show a thumbnail
            const imgSrc = element.src || (element.url ? element.url : '');
            if (imgSrc) {
                return `<div class="layer-icon image-icon"><img src="${imgSrc}" alt=""></div>`;
            }
            return `<div class="layer-icon"><i class="far fa-image"></i></div>`;
        case 'folder':
            return `<div class="layer-icon folder-icon"><i class="far fa-folder"></i></div>`;
        case 'rectangle':
            const color = element.fill || '#60a5fa';
            return `<div class="layer-icon rectangle-icon"><i class="far fa-square" style="color: ${color}"></i></div>`;
        case 'group':
            return `<div class="layer-icon group-icon"><i class="fas fa-layer-group"></i></div>`;
        default:
            return `<div class="layer-icon"><i class="far fa-question-circle"></i></div>`;
    }
}

/**
 * Get a display name for a layer
 */
function getLayerName(element) {
    if (element.name) return element.name;

    switch (element.type) {
        case 'image':
            // Try to extract filename from URL
            if (element.src) {
                const parts = element.src.split('/');
                const filename = parts[parts.length - 1];
                // Remove extension and limit length
                const name = filename.split('.')[0];
                return name.length > 20 ? name.substring(0, 20) + '...' : name;
            }
            return 'Image';
        case 'folder':
            return element.label || 'Folder';
        case 'rectangle':
            return 'Rectangle';
        case 'group':
            return 'Group';
        default:
            return 'Element';
    }
}

/**
 * Find the SVG.js element for a given element ID
 */
function findSvgElement(elementId) {
    const canvas = window.canvasCore?.getCanvas();
    if (!canvas) return null;

    return canvas.children().find(child => {
        const data = child.data?.('elementData');
        return data && data.id === elementId;
    });
}

/**
 * Handle clicking on a layer to select it
 */
function handleLayerClick(elementId, event) {
    const svgElement = findSvgElement(elementId);
    const canvas = window.canvasCore?.getCanvas();

    if (!svgElement || !canvas) return;

    const isMultiSelect = event.ctrlKey || event.metaKey;
    const isRangeSelect = event.shiftKey;

    if (isMultiSelect) {
        // Toggle selection
        if (window.selectionAPI?.isSelected(svgElement)) {
            // Need to implement deselect single - for now just toggle
            window.selectionAPI.toggleElementSelection(svgElement, canvas);
        } else {
            window.selectionAPI.addToSelection(svgElement, canvas);
        }
    } else if (isRangeSelect) {
        // Range selection - select all between last selected and this one
        // For now, just add to selection
        window.selectionAPI.addToSelection(svgElement, canvas);
    } else {
        // Single select
        window.selectionAPI.selectElement(svgElement, canvas);
    }

    refreshLayersList();
}

/**
 * Toggle visibility of an element
 */
function toggleVisibility(elementId) {
    const currentCanvas = window.canvasCore?.getCurrentCanvas();
    const svgElement = findSvgElement(elementId);

    if (!currentCanvas || !svgElement) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find element data
    const elementIndex = currentCanvas.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;

    const elementData = currentCanvas.elements[elementIndex];
    const isCurrentlyVisible = elementData.visible !== false;

    // Toggle visibility
    elementData.visible = !isCurrentlyVisible;
    currentCanvas.elements[elementIndex] = elementData;

    // Update SVG element
    svgElement.data('elementData', elementData);
    if (elementData.visible) {
        svgElement.show();
    } else {
        svgElement.hide();
    }

    // Trigger auto-save
    window.canvasCore?.scheduleAutoSave();
    refreshLayersList();
    showNotification(elementData.visible ? 'Layer shown' : 'Layer hidden');
}

/**
 * Toggle lock state of an element
 */
function toggleLock(elementId) {
    const currentCanvas = window.canvasCore?.getCurrentCanvas();
    const svgElement = findSvgElement(elementId);

    if (!currentCanvas || !svgElement) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find element data
    const elementIndex = currentCanvas.elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;

    const elementData = currentCanvas.elements[elementIndex];
    const isCurrentlyLocked = elementData.locked === true;

    // Toggle lock
    elementData.locked = !isCurrentlyLocked;
    currentCanvas.elements[elementIndex] = elementData;

    // Update SVG element data
    svgElement.data('elementData', elementData);

    // Trigger auto-save
    window.canvasCore?.scheduleAutoSave();
    refreshLayersList();
    showNotification(elementData.locked ? 'Layer locked' : 'Layer unlocked');
}

/**
 * Set up drag and drop for reordering layers
 */
function setupDragAndDrop(item, element) {
    const dragHandle = item.querySelector('.layer-drag-handle');

    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', (e) => {
        // Only allow drag from the handle
        if (!e.target.closest('.layer-drag-handle') && e.target !== dragHandle) {
            e.preventDefault();
            return;
        }

        draggedLayerItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', element.id);
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedLayerItem = null;

        // Remove all drag-over states
        document.querySelectorAll('.layer-item.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedLayerItem && draggedLayerItem !== item) {
            e.dataTransfer.dropEffect = 'move';

            // Remove previous drag-over
            if (dragOverLayerItem && dragOverLayerItem !== item) {
                dragOverLayerItem.classList.remove('drag-over');
            }

            item.classList.add('drag-over');
            dragOverLayerItem = item;
        }
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');

        if (!draggedLayerItem || draggedLayerItem === item) return;

        const fromId = draggedLayerItem.dataset.elementId;
        const toId = item.dataset.elementId;

        reorderLayers(fromId, toId);
    });
}

/**
 * Reorder layers by swapping z-indices
 */
function reorderLayers(fromId, toId) {
    const currentCanvas = window.canvasCore?.getCurrentCanvas();
    if (!currentCanvas) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Find the elements
    const fromIndex = currentCanvas.elements.findIndex(el => el.id === fromId);
    const toIndex = currentCanvas.elements.findIndex(el => el.id === toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const fromElement = currentCanvas.elements[fromIndex];
    const toElement = currentCanvas.elements[toIndex];

    // Swap z-indices
    const tempZIndex = fromElement.zIndex || 0;
    fromElement.zIndex = toElement.zIndex || 0;
    toElement.zIndex = tempZIndex;

    // Update canvas data
    currentCanvas.elements[fromIndex] = fromElement;
    currentCanvas.elements[toIndex] = toElement;

    // Update SVG element data
    const fromSvg = findSvgElement(fromId);
    const toSvg = findSvgElement(toId);

    if (fromSvg) fromSvg.data('elementData', fromElement);
    if (toSvg) toSvg.data('elementData', toElement);

    // Reorder in DOM
    if (fromSvg && toSvg && fromSvg.node && toSvg.node) {
        const parent = fromSvg.node.parentNode;
        if (fromElement.zIndex > toElement.zIndex) {
            // Moving up (higher z-index = in front)
            parent.insertBefore(fromSvg.node, toSvg.node.nextSibling);
        } else {
            // Moving down
            parent.insertBefore(fromSvg.node, toSvg.node);
        }
    }

    // Trigger auto-save
    window.canvasCore?.scheduleAutoSave();
    refreshLayersList();
    showNotification('Layer reordered');
}

/**
 * Show notification message
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLayersPanel);
} else {
    initializeLayersPanel();
}

// Export for use by other modules
window.layersPanel = {
    toggle: toggleLayersPanel,
    open: openLayersPanel,
    close: closeLayersPanel,
    refresh: refreshLayersList,
    isOpen: () => isPanelOpen
};
