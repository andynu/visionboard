// Context menu infrastructure for canvas elements
// Provides right-click context menus for images, folders, rectangles, and canvas background

let contextMenuElement = null;
let contextMenuTarget = null;  // SVG.js element that was right-clicked
let contextMenuTargetData = null;  // Element data from right-clicked element

/**
 * Initialize the context menu system
 */
function initializeContextMenu() {
    createContextMenuElement();
    attachContextMenuListeners();
}

/**
 * Create the context menu DOM element
 */
function createContextMenuElement() {
    contextMenuElement = document.createElement('div');
    contextMenuElement.id = 'context-menu';
    contextMenuElement.className = 'context-menu';
    contextMenuElement.innerHTML = `
        <div class="context-menu-items"></div>
    `;
    document.body.appendChild(contextMenuElement);
}

/**
 * Attach event listeners for context menu
 */
function attachContextMenuListeners() {
    const canvasContainer = document.getElementById('canvas');

    // Right-click handler on canvas container
    canvasContainer.addEventListener('contextmenu', handleContextMenu);

    // Close menu on click outside, escape, or scroll
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    canvasContainer.addEventListener('wheel', closeContextMenu);
}

/**
 * Handle right-click context menu event
 * @param {MouseEvent} event
 */
function handleContextMenu(event) {
    event.preventDefault();

    // Find what was clicked
    const target = event.target;
    const svgContainer = document.querySelector('#canvas svg');

    // Check if clicked on a canvas element
    let canvasElement = null;
    let currentTarget = target;

    while (currentTarget && currentTarget !== svgContainer) {
        if (currentTarget.classList && currentTarget.classList.contains('canvas-element')) {
            canvasElement = currentTarget;
            break;
        }
        currentTarget = currentTarget.parentElement;
    }

    if (canvasElement) {
        // Find the SVG.js element
        const canvas = window.canvasCore.getCanvas();
        const svgJsElement = canvas.children().find(child => {
            return child.node && child.node.id === canvasElement.id;
        });

        if (svgJsElement) {
            const elementData = svgJsElement.data('elementData');
            contextMenuTarget = svgJsElement;
            contextMenuTargetData = elementData;

            // Select the element if not already selected
            if (!window.selectionAPI.isSelected(svgJsElement)) {
                window.selectionAPI.selectElement(svgJsElement, canvas);
            }

            showContextMenu(event.clientX, event.clientY, getMenuItemsForElement(elementData));
        }
    } else {
        // Clicked on empty canvas space
        contextMenuTarget = null;
        contextMenuTargetData = null;
        showContextMenu(event.clientX, event.clientY, getCanvasMenuItems());
    }
}

/**
 * Get menu items based on element type
 * @param {Object} elementData - The element data
 * @returns {Array} Array of menu item configurations
 */
function getMenuItemsForElement(elementData) {
    const selectedCount = window.selectionAPI.getSelectionCount();

    if (elementData.type === 'group') {
        return getGroupMenuItems(selectedCount);
    } else if (elementData.type === 'image') {
        return getImageMenuItems(selectedCount);
    } else if (elementData.type === 'folder') {
        return getFolderMenuItems(selectedCount);
    } else if (elementData.type === 'rectangle') {
        return getRectangleMenuItems(selectedCount);
    }

    return getGenericMenuItems(selectedCount);
}

/**
 * Get menu items for group elements
 * @param {number} selectedCount - Number of selected elements
 * @returns {Array} Menu items
 */
function getGroupMenuItems(selectedCount) {
    const canGroup = window.grouping && window.grouping.canGroup();

    return [
        { label: 'Ungroup', action: 'ungroup', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+Shift+G' },
        { type: 'separator' },
        { label: 'Cut', action: 'cut', icon: 'fa-regular fa-scissors', shortcut: 'Ctrl+X' },
        { label: 'Copy', action: 'copy', icon: 'fa-regular fa-copy', shortcut: 'Ctrl+C' },
        { label: 'Duplicate', action: 'duplicate', icon: 'fa-regular fa-clone', shortcut: 'Ctrl+D' },
        { type: 'separator' },
        { label: 'Group', action: 'group', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+G', disabled: !canGroup },
        { type: 'separator' },
        { label: 'Bring to Front', action: 'bring-front', icon: 'fa-solid fa-arrow-up', shortcut: 'Ctrl+Shift+]' },
        { label: 'Send to Back', action: 'send-back', icon: 'fa-solid fa-arrow-down', shortcut: 'Ctrl+Shift+[' },
        { type: 'separator' },
        { label: 'Delete', action: 'delete', icon: 'fa-regular fa-trash-can', shortcut: 'Del', danger: true }
    ];
}

/**
 * Get menu items for image elements
 * @param {number} selectedCount - Number of selected elements
 * @returns {Array} Menu items
 */
function getImageMenuItems(selectedCount) {
    const items = [];

    // Get current lock state
    const elementData = contextMenuTarget?.data('elementData');
    const isLocked = elementData?.locked === true;

    // Get current filter state
    const filters = window.imageFilters ? window.imageFilters.getFilters(contextMenuTarget) : {};
    const isGrayscale = filters.grayscale && filters.grayscale > 0;
    const isSepia = filters.sepia && filters.sepia > 0;
    const isInvert = filters.invert && filters.invert > 0;
    const hasAnyFilter = window.imageFilters && window.imageFilters.hasFilters(contextMenuTarget);

    // Build presets submenu items
    const presets = window.imageFilters?.getPresets() || [];
    const presetsSubmenu = presets.map(preset => ({
        label: preset.name,
        action: `filter-preset-${preset.id}`,
        icon: `fa-solid ${preset.icon}`
    }));
    presetsSubmenu.push({ type: 'separator' });
    presetsSubmenu.push({ label: 'Reset Filters', action: 'filter-reset', icon: 'fa-solid fa-rotate-left', disabled: !hasAnyFilter });

    // Filters submenu with checkmarks for active filters
    items.push({
        label: 'Filters',
        icon: 'fa-solid fa-sliders',
        submenu: [
            { label: 'Adjust Filters...', action: 'filter-adjust', icon: 'fa-solid fa-sliders' },
            { type: 'separator' },
            { label: 'Presets', icon: 'fa-solid fa-wand-magic-sparkles', submenu: presetsSubmenu },
            { type: 'separator' },
            { label: 'Grayscale', action: 'filter-grayscale', icon: 'fa-solid fa-droplet', checked: isGrayscale },
            { label: 'Sepia', action: 'filter-sepia', icon: 'fa-solid fa-sun', checked: isSepia },
            { label: 'Invert', action: 'filter-invert', icon: 'fa-solid fa-circle-half-stroke', checked: isInvert },
            { type: 'separator' },
            { label: 'Reset Filters', action: 'filter-reset', icon: 'fa-solid fa-rotate-left', disabled: !hasAnyFilter }
        ]
    });

    items.push({ type: 'separator' });

    // Grouping options
    const canGroup = window.grouping && window.grouping.canGroup();
    items.push({ label: 'Group', action: 'group', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+G', disabled: !canGroup });

    items.push({ type: 'separator' });

    // Arrange options
    items.push({ label: 'Bring to Front', action: 'bring-to-front', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+]' });
    items.push({ label: 'Send to Back', action: 'send-to-back', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+[' });

    items.push({ type: 'separator' });

    // Edit options
    items.push({ label: 'Duplicate', action: 'duplicate', icon: 'fa-regular fa-clone', shortcut: 'Ctrl+D' });
    items.push({ label: 'Copy', action: 'copy', icon: 'fa-regular fa-copy', shortcut: 'Ctrl+C' });

    items.push({ type: 'separator' });

    // Transform options
    items.push({ label: 'Flip Horizontal', action: 'flip-horizontal', icon: 'fa-solid fa-left-right' });
    items.push({ label: 'Flip Vertical', action: 'flip-vertical', icon: 'fa-solid fa-up-down' });

    items.push({ type: 'separator' });

    // Lock/delete
    items.push({
        label: isLocked ? 'Unlock' : 'Lock',
        action: isLocked ? 'unlock' : 'lock',
        icon: isLocked ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock',
        shortcut: 'Ctrl+L'
    });
    items.push({ label: 'Delete', action: 'delete', icon: 'fa-regular fa-trash-can', shortcut: 'Del', danger: true });

    return items;
}

/**
 * Get menu items for folder elements
 * @param {number} selectedCount - Number of selected elements
 * @returns {Array} Menu items
 */
function getFolderMenuItems(selectedCount) {
    const canGroup = window.grouping && window.grouping.canGroup();

    return [
        { label: 'Open', action: 'folder-open', icon: 'fa-regular fa-folder-open' },
        { label: 'Rename', action: 'folder-rename', icon: 'fa-solid fa-pen', shortcut: 'F2' },
        { type: 'separator' },
        { label: 'Change Color', action: 'folder-color', icon: 'fa-solid fa-palette' },
        { type: 'separator' },
        { label: 'Group', action: 'group', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+G', disabled: !canGroup },
        { type: 'separator' },
        { label: 'Bring to Front', action: 'bring-to-front', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+]' },
        { label: 'Send to Back', action: 'send-to-back', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+[' },
        { type: 'separator' },
        { label: 'Duplicate', action: 'duplicate', icon: 'fa-regular fa-clone', shortcut: 'Ctrl+D' },
        { type: 'separator' },
        { label: 'Delete', action: 'delete', icon: 'fa-regular fa-trash-can', shortcut: 'Del', danger: true }
    ];
}

/**
 * Get menu items for rectangle elements
 * @param {number} selectedCount - Number of selected elements
 * @returns {Array} Menu items
 */
function getRectangleMenuItems(selectedCount) {
    const canGroup = window.grouping && window.grouping.canGroup();

    return [
        { label: 'Edit Style', action: 'rect-style', icon: 'fa-solid fa-pen' },
        { type: 'separator' },
        { label: 'Group', action: 'group', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+G', disabled: !canGroup },
        { type: 'separator' },
        { label: 'Bring to Front', action: 'bring-to-front', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+]' },
        { label: 'Send to Back', action: 'send-to-back', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+[' },
        { type: 'separator' },
        { label: 'Duplicate', action: 'duplicate', icon: 'fa-regular fa-clone', shortcut: 'Ctrl+D' },
        { label: 'Copy', action: 'copy', icon: 'fa-regular fa-copy', shortcut: 'Ctrl+C' },
        { type: 'separator' },
        { label: 'Delete', action: 'delete', icon: 'fa-regular fa-trash-can', shortcut: 'Del', danger: true }
    ];
}

/**
 * Get menu items for generic elements (fallback)
 * @param {number} selectedCount - Number of selected elements
 * @returns {Array} Menu items
 */
function getGenericMenuItems(selectedCount) {
    return [
        { label: 'Bring to Front', action: 'bring-to-front', icon: 'fa-solid fa-layer-group' },
        { label: 'Send to Back', action: 'send-to-back', icon: 'fa-solid fa-layer-group' },
        { type: 'separator' },
        { label: 'Duplicate', action: 'duplicate', icon: 'fa-regular fa-clone', shortcut: 'Ctrl+D' },
        { type: 'separator' },
        { label: 'Delete', action: 'delete', icon: 'fa-regular fa-trash-can', shortcut: 'Del', danger: true }
    ];
}

/**
 * Get menu items for empty canvas space
 * @returns {Array} Menu items
 */
function getCanvasMenuItems() {
    const canGroup = window.grouping && window.grouping.canGroup();
    const alignState = window.alignment ? window.alignment.getAlignmentState() : { canAlign: false, canDistribute: false };

    const items = [
        { label: 'Paste', action: 'paste', icon: 'fa-regular fa-paste', shortcut: 'Ctrl+V', disabled: !window.clipboardManager || !window.clipboardManager.hasContent() },
        { type: 'separator' },
        { label: 'Add Rectangle', action: 'add-rectangle', icon: 'fa-regular fa-square' },
        { label: 'Add Folder', action: 'add-folder', icon: 'fa-regular fa-folder' },
        { type: 'separator' },
        { label: 'Select All', action: 'select-all', icon: 'fa-solid fa-object-group', shortcut: 'Ctrl+A' },
        { label: 'Group', action: 'group', icon: 'fa-solid fa-layer-group', shortcut: 'Ctrl+G', disabled: !canGroup }
    ];

    // Add alignment submenu when multiple elements are selected
    if (alignState.canAlign) {
        items.push({
            label: 'Align',
            icon: 'fa-solid fa-align-left',
            submenu: [
                { label: 'Align Left', action: 'align-left', icon: 'fa-solid fa-align-left' },
                { label: 'Align Center', action: 'align-center-h', icon: 'fa-solid fa-align-center' },
                { label: 'Align Right', action: 'align-right', icon: 'fa-solid fa-align-right' },
                { type: 'separator' },
                { label: 'Align Top', action: 'align-top', icon: 'fa-solid fa-align-left fa-rotate-90' },
                { label: 'Align Middle', action: 'align-middle', icon: 'fa-solid fa-align-center fa-rotate-90' },
                { label: 'Align Bottom', action: 'align-bottom', icon: 'fa-solid fa-align-right fa-rotate-90' },
                { type: 'separator' },
                { label: 'Distribute Horizontally', action: 'distribute-h', icon: 'fa-solid fa-arrows-left-right', disabled: !alignState.canDistribute },
                { label: 'Distribute Vertically', action: 'distribute-v', icon: 'fa-solid fa-arrows-up-down', disabled: !alignState.canDistribute }
            ]
        });
    }

    items.push({ type: 'separator' });
    items.push({ label: 'Zoom to Fit', action: 'reset-view', icon: 'fa-solid fa-arrows-to-dot', shortcut: 'Ctrl+0' });
    items.push({ type: 'separator' });
    items.push({ label: 'Set Background Color...', action: 'set-background-color', icon: 'fa-solid fa-fill-drip' });
    items.push({ type: 'separator' });
    items.push({ label: 'Export as Image...', action: 'export-image', icon: 'fa-regular fa-image', shortcut: 'Ctrl+Shift+E' });

    return items;
}

/**
 * Show the context menu at the specified position
 * @param {number} x - X position (client coordinates)
 * @param {number} y - Y position (client coordinates)
 * @param {Array} items - Menu items to display
 */
function showContextMenu(x, y, items) {
    const itemsContainer = contextMenuElement.querySelector('.context-menu-items');
    itemsContainer.innerHTML = '';

    // Build menu items
    items.forEach(item => {
        if (item.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            itemsContainer.appendChild(separator);
        } else if (item.submenu) {
            const submenuItem = createSubmenuItem(item);
            itemsContainer.appendChild(submenuItem);
        } else {
            const menuItem = createMenuItem(item);
            itemsContainer.appendChild(menuItem);
        }
    });

    // Position the menu
    contextMenuElement.style.left = `${x}px`;
    contextMenuElement.style.top = `${y}px`;
    contextMenuElement.classList.add('visible');

    // Adjust position if menu goes off screen
    requestAnimationFrame(() => {
        const rect = contextMenuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            contextMenuElement.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > viewportHeight) {
            contextMenuElement.style.top = `${y - rect.height}px`;
        }
    });
}

/**
 * Create a menu item element
 * @param {Object} item - Menu item configuration
 * @returns {HTMLElement} Menu item element
 */
function createMenuItem(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'context-menu-item';
    if (item.disabled) {
        menuItem.classList.add('disabled');
    }
    if (item.danger) {
        menuItem.classList.add('danger');
    }
    if (item.checked) {
        menuItem.classList.add('checked');
    }

    // Use checkmark icon if checked, otherwise use provided icon
    const iconClass = item.checked ? 'fa-solid fa-check' : item.icon;

    menuItem.innerHTML = `
        <span class="context-menu-icon"><i class="${iconClass}"></i></span>
        <span class="context-menu-label">${item.label}</span>
        ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ''}
    `;

    if (!item.disabled) {
        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            executeAction(item.action);
            closeContextMenu();
        });
    }

    return menuItem;
}

/**
 * Create a submenu item element
 * @param {Object} item - Submenu item configuration
 * @returns {HTMLElement} Submenu item element
 */
function createSubmenuItem(item) {
    const submenuItem = document.createElement('div');
    submenuItem.className = 'context-menu-item has-submenu';

    submenuItem.innerHTML = `
        <span class="context-menu-icon"><i class="${item.icon}"></i></span>
        <span class="context-menu-label">${item.label}</span>
        <span class="context-menu-arrow"><i class="fa-solid fa-chevron-right"></i></span>
    `;

    // Create submenu
    const submenu = document.createElement('div');
    submenu.className = 'context-submenu';

    item.submenu.forEach(subItem => {
        if (subItem.type === 'separator') {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            submenu.appendChild(separator);
        } else {
            const menuItem = createMenuItem(subItem);
            submenu.appendChild(menuItem);
        }
    });

    submenuItem.appendChild(submenu);

    // Show/hide submenu on hover
    submenuItem.addEventListener('mouseenter', () => {
        submenu.classList.add('visible');
        // Position submenu
        const rect = submenuItem.getBoundingClientRect();
        const submenuRect = submenu.getBoundingClientRect();

        if (rect.right + submenuRect.width > window.innerWidth) {
            submenu.style.left = 'auto';
            submenu.style.right = '100%';
        }
    });

    submenuItem.addEventListener('mouseleave', () => {
        submenu.classList.remove('visible');
    });

    return submenuItem;
}

/**
 * Execute a context menu action
 * @param {string} action - Action identifier
 */
function executeAction(action) {
    switch (action) {
        // Element actions
        case 'delete':
            window.canvasCore.deleteSelectedElement();
            break;

        case 'lock':
        case 'unlock':
            if (window.layersPanel) {
                window.layersPanel.toggleLockSelected();
            }
            break;

        case 'duplicate':
            if (window.clipboardManager) {
                window.clipboardManager.duplicateSelected();
            }
            break;

        case 'copy':
            if (window.clipboardManager) {
                window.clipboardManager.copy();
            }
            break;

        case 'paste':
            if (window.clipboardManager) {
                window.clipboardManager.paste();
            }
            break;

        // Layer actions
        case 'bring-to-front':
            if (window.zOrder) {
                const selectedElements = window.selectionAPI.getSelectedElements();
                window.zOrder.bringToFront(selectedElements.length > 0 ? selectedElements : [contextMenuTarget]);
            }
            break;

        case 'send-to-back':
            if (window.zOrder) {
                const selectedElements = window.selectionAPI.getSelectedElements();
                window.zOrder.sendToBack(selectedElements.length > 0 ? selectedElements : [contextMenuTarget]);
            }
            break;

        // Transform actions
        case 'flip-horizontal':
            if (window.transform) {
                window.transform.flipSelectedHorizontal();
            }
            break;

        case 'flip-vertical':
            if (window.transform) {
                window.transform.flipSelectedVertical();
            }
            break;

        // Lock action (placeholder)
        case 'lock':
            console.log('Lock - not yet implemented');
            break;

        // Filter actions
        case 'filter-adjust':
            if (contextMenuTarget && window.imageFilters) {
                window.imageFilters.showFilterPanel(contextMenuTarget);
            }
            break;

        case 'filter-grayscale':
            if (contextMenuTarget && window.imageFilters) {
                window.imageFilters.toggleFilter(contextMenuTarget, 'grayscale');
            }
            break;

        case 'filter-sepia':
            if (contextMenuTarget && window.imageFilters) {
                window.imageFilters.toggleFilter(contextMenuTarget, 'sepia');
            }
            break;

        case 'filter-invert':
            if (contextMenuTarget && window.imageFilters) {
                window.imageFilters.toggleFilter(contextMenuTarget, 'invert');
            }
            break;

        case 'filter-reset':
            if (contextMenuTarget && window.imageFilters) {
                window.imageFilters.resetFilters(contextMenuTarget);
            }
            break;

        // Folder actions
        case 'folder-open':
            if (contextMenuTargetData && contextMenuTargetData.targetCanvasId) {
                window.switchToCanvas(contextMenuTargetData.targetCanvasId);
            }
            break;

        case 'folder-rename':
            console.log('Folder rename - not yet implemented');
            break;

        case 'folder-color':
            console.log('Folder color - not yet implemented');
            break;

        // Rectangle actions
        case 'rect-style':
            console.log('Rectangle style - not yet implemented');
            break;

        // Canvas actions
        case 'add-rectangle':
            if (window.toolManager) {
                window.toolManager.selectTool('rectangle');
            }
            break;

        case 'add-folder':
            window.canvasCore.showNewFolderDialog();
            break;

        case 'select-all':
            if (window.keyboardShortcuts) {
                window.keyboardShortcuts.selectAll();
            } else {
                selectAllElements();
            }
            break;

        case 'reset-view':
            if (window.zoomControls) {
                window.zoomControls.zoomToFitAll();
            } else {
                resetCanvasView();
            }
            break;

        case 'export-image':
            if (window.showExportDialog) {
                window.showExportDialog();
            }
            break;

        case 'set-background-color':
            if (window.canvasCore && window.canvasCore.showBackgroundColorPicker) {
                window.canvasCore.showBackgroundColorPicker();
            }
            break;

        // Grouping actions
        case 'group':
            if (window.grouping && window.grouping.canGroup()) {
                window.grouping.groupSelectedElements();
            }
            break;

        case 'ungroup':
            if (window.grouping) {
                window.grouping.ungroupElement(contextMenuTarget);
            }
            break;

        // Alignment actions
        case 'align-left':
            if (window.alignment) window.alignment.alignLeft();
            break;
        case 'align-center-h':
            if (window.alignment) window.alignment.alignCenterH();
            break;
        case 'align-right':
            if (window.alignment) window.alignment.alignRight();
            break;
        case 'align-top':
            if (window.alignment) window.alignment.alignTop();
            break;
        case 'align-middle':
            if (window.alignment) window.alignment.alignMiddle();
            break;
        case 'align-bottom':
            if (window.alignment) window.alignment.alignBottom();
            break;
        case 'distribute-h':
            if (window.alignment) window.alignment.distributeHorizontally();
            break;
        case 'distribute-v':
            if (window.alignment) window.alignment.distributeVertically();
            break;

        default:
            // Handle filter preset actions (filter-preset-bw, filter-preset-vintage, etc.)
            if (action.startsWith('filter-preset-')) {
                const presetId = action.replace('filter-preset-', '');
                if (contextMenuTarget && window.imageFilters) {
                    window.imageFilters.applyPreset(contextMenuTarget, presetId);
                }
            } else {
                console.log(`Unknown action: ${action}`);
            }
    }
}

/**
 * Select all elements on the canvas
 */
function selectAllElements() {
    const canvas = window.canvasCore.getCanvas();
    const currentCanvas = window.canvasCore.getCurrentCanvas();

    if (!canvas || !currentCanvas) return;

    const allElements = canvas.children().filter(child => {
        return child.node && child.node.classList.contains('canvas-element');
    });

    if (allElements.length > 0) {
        window.selectionAPI.selectElements(allElements, canvas);
    }
}

/**
 * Reset canvas view to initial state
 */
function resetCanvasView() {
    const canvas = window.canvasCore.getCanvas();
    if (canvas && window.CONFIG) {
        const vb = window.CONFIG.canvas.initialViewBox;
        canvas.viewbox(vb.x, vb.y, vb.width, vb.height);
    }
}

/**
 * Close the context menu
 */
function closeContextMenu() {
    if (contextMenuElement) {
        contextMenuElement.classList.remove('visible');
    }
    contextMenuTarget = null;
    contextMenuTargetData = null;
}

/**
 * Handle click outside context menu
 * @param {MouseEvent} event
 */
function handleClickOutside(event) {
    if (contextMenuElement && !contextMenuElement.contains(event.target)) {
        closeContextMenu();
    }
}

/**
 * Handle keyboard events for context menu
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
    if (event.key === 'Escape') {
        closeContextMenu();
    }
}

/**
 * Get the current context menu target element
 * @returns {Object|null} SVG.js element or null
 */
function getContextMenuTarget() {
    return contextMenuTarget;
}

/**
 * Get the current context menu target data
 * @returns {Object|null} Element data or null
 */
function getContextMenuTargetData() {
    return contextMenuTargetData;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContextMenu);
} else {
    initializeContextMenu();
}

// Export for use by other modules
window.contextMenu = {
    show: showContextMenu,
    close: closeContextMenu,
    getTarget: getContextMenuTarget,
    getTargetData: getContextMenuTargetData,
    executeAction
};
