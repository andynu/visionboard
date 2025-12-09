let treeData = null;
let currentCanvasId = 'main';
let expandedNodes = new Set(['main']); // Track expanded nodes

function initializeTreeNav() {
    setupSidebarToggle();
    setupTreeEventListeners();
    setupBrowserHistory();
    loadTreeData();
}

function setupSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
    
    // Close sidebar when clicking outside
    document.addEventListener('click', (event) => {
        if (!sidebar.contains(event.target) && 
            !sidebarToggle.contains(event.target) && 
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
}

function setupTreeEventListeners() {
    // New canvas button
    document.getElementById('new-canvas-btn').addEventListener('click', () => {
        showNewCanvasDialog();
    });
}

function setupBrowserHistory() {
    // Listen for browser back/forward buttons
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.canvasId) {
            // Navigate to the canvas without pushing new history
            switchToCanvasInternal(event.state.canvasId, false);
        } else {
            // Default to main canvas if no state
            switchToCanvasInternal('main', false);
        }
    });
    
    // Set initial history state on page load
    const urlParams = new URLSearchParams(window.location.search);
    const initialCanvasId = urlParams.get('canvas') || 'main';
    
    // Replace current state to ensure we have a proper history entry
    history.replaceState(
        { canvasId: initialCanvasId }, 
        '', 
        `${window.location.pathname}?canvas=${initialCanvasId}`
    );
    
    currentCanvasId = initialCanvasId;
}

async function loadTreeData() {
    try {
        treeData = await window.treeAPI.get();
        if (treeData) {
            
            // Load the initial canvas (from URL or default to main)
            const urlParams = new URLSearchParams(window.location.search);
            const targetCanvasId = urlParams.get('canvas') || currentCanvasId || 'main';
            
            // Verify the canvas exists in the tree, fallback to main if not
            if (treeData.canvases[targetCanvasId]) {
                currentCanvasId = targetCanvasId;
            } else {
                currentCanvasId = 'main';
                // Update URL to reflect the fallback
                const url = `${window.location.pathname}?canvas=main`;
                history.replaceState({ canvasId: 'main' }, '', url);
            }
            
            // Load the canvas and update UI
            await window.canvasCore.loadCanvas(currentCanvasId);
            renderTree();
            updateBreadcrumb();
        } else {
            console.error('Failed to load tree data');
        }
    } catch (error) {
        console.error('Error loading tree data:', error);
    }
}

function renderTree() {
    const treeContainer = document.getElementById('canvas-tree');
    treeContainer.innerHTML = '';
    
    if (!treeData) return;
    
    // Render root canvases
    treeData.rootCanvases.forEach(canvasId => {
        const node = renderTreeNode(canvasId, 0);
        treeContainer.appendChild(node);
    });
}

function renderTreeNode(canvasId, level) {
    const canvasInfo = treeData.canvases[canvasId];
    if (!canvasInfo) return null;
    
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'tree-node';
    nodeDiv.dataset.canvasId = canvasId;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = `tree-item ${currentCanvasId === canvasId ? 'active' : ''}`;
    
    // Expand/collapse button
    const expandButton = document.createElement('button');
    expandButton.className = 'tree-expand';
    if (canvasInfo.children.length > 0) {
        expandButton.className += expandedNodes.has(canvasId) ? ' expanded' : ' collapsed';
        expandButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNode(canvasId);
        });
    } else {
        expandButton.className += ' no-children';
    }
    
    // Icon
    const icon = document.createElement('i');
    icon.className = `tree-icon fas ${canvasInfo.children.length > 0 ? 'fa-folder' : 'fa-file'}`;
    if (canvasId === 'main') {
        icon.className = 'tree-icon fas fa-home';
    }
    
    // Label
    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = canvasInfo.name;
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    const addButton = document.createElement('button');
    addButton.className = 'tree-action';
    addButton.innerHTML = '<i class="fas fa-plus"></i>';
    addButton.title = 'Add child canvas';
    addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showNewCanvasDialog(canvasId);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'tree-action';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.title = 'Delete canvas';
    if (canvasId !== 'main') { // Don't allow deleting main canvas
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCanvas(canvasId);
        });
    } else {
        deleteButton.style.display = 'none';
    }
    
    actions.appendChild(addButton);
    actions.appendChild(deleteButton);
    
    // Assemble item
    itemDiv.appendChild(expandButton);
    itemDiv.appendChild(icon);
    itemDiv.appendChild(label);
    itemDiv.appendChild(actions);
    
    // Add click handler for navigation
    itemDiv.addEventListener('click', () => {
        switchToCanvas(canvasId);
    });
    
    nodeDiv.appendChild(itemDiv);
    
    // Add children
    if (canvasInfo.children.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = `tree-children ${expandedNodes.has(canvasId) ? '' : 'collapsed'}`;
        
        canvasInfo.children.forEach(childId => {
            const childNode = renderTreeNode(childId, level + 1);
            if (childNode) {
                childrenDiv.appendChild(childNode);
            }
        });
        
        nodeDiv.appendChild(childrenDiv);
    }
    
    return nodeDiv;
}

function toggleNode(canvasId) {
    if (expandedNodes.has(canvasId)) {
        expandedNodes.delete(canvasId);
    } else {
        expandedNodes.add(canvasId);
    }
    renderTree();
}

async function switchToCanvas(canvasId) {
    return switchToCanvasInternal(canvasId, true);
}

async function switchToCanvasInternal(canvasId, pushHistory = true) {
    try {
        currentCanvasId = canvasId;
        await window.canvasCore.loadCanvas(canvasId);
        renderTree(); // Re-render to update active state
        updateBreadcrumb();
        
        // Update browser history and URL
        if (pushHistory) {
            const url = `${window.location.pathname}?canvas=${canvasId}`;
            history.pushState(
                { canvasId: canvasId }, 
                '', 
                url
            );
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    } catch (error) {
        console.error('Error switching canvas:', error);
    }
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';
    
    if (!treeData || !treeData.canvases[currentCanvasId]) {
        // Show default breadcrumb when no tree data
        const defaultItem = document.createElement('span');
        defaultItem.className = 'breadcrumb-item active';
        defaultItem.textContent = 'Main Canvas';
        breadcrumb.appendChild(defaultItem);
        return;
    }
    
    const path = getCanvasPath(currentCanvasId);
    
    path.forEach((canvasId, index) => {
        const canvasInfo = treeData.canvases[canvasId];
        if (!canvasInfo) return;
        
        // Add separator
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            breadcrumb.appendChild(separator);
        }
        
        // Create breadcrumb item
        const item = document.createElement('span');
        const isActive = index === path.length - 1;
        item.className = `breadcrumb-item ${isActive ? 'active' : ''}`;
        
        // Add icon based on position and type
        const icon = document.createElement('i');
        icon.style.marginRight = '0.25rem';
        if (canvasId === 'main') {
            icon.className = 'fas fa-home'; // Home icon for main canvas
        } else if (canvasInfo.children.length > 0) {
            icon.className = 'fas fa-folder'; // Folder icon for containers
        } else {
            icon.className = 'fas fa-file'; // Document icon for leaves
        }
        
        const label = document.createElement('span');
        label.textContent = canvasInfo.name;
        
        item.appendChild(icon);
        item.appendChild(label);
        
        // Add click handler for non-active items
        if (!isActive) {
            item.addEventListener('click', () => {
                switchToCanvas(canvasId);
            });
            item.title = `Navigate to ${canvasInfo.name}`;
        } else {
            item.title = `Current canvas: ${canvasInfo.name}`;
        }
        
        breadcrumb.appendChild(item);
    });
    
    // Add quick actions for current canvas if it has children
    const currentCanvasInfo = treeData.canvases[currentCanvasId];
    if (currentCanvasInfo && currentCanvasInfo.children.length > 0) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        breadcrumb.appendChild(separator);
        
        const childrenIndicator = document.createElement('span');
        childrenIndicator.className = 'breadcrumb-item';
        childrenIndicator.style.opacity = '0.6';
        childrenIndicator.style.fontSize = '0.8em';
        childrenIndicator.textContent = `${currentCanvasInfo.children.length} child${currentCanvasInfo.children.length !== 1 ? 'ren' : ''}`;
        childrenIndicator.title = 'This canvas has child canvases';
        breadcrumb.appendChild(childrenIndicator);
    }
}

function getCanvasPath(canvasId) {
    const path = [];
    let current = canvasId;
    
    while (current && treeData.canvases[current]) {
        path.unshift(current);
        current = treeData.canvases[current].parent;
    }
    
    return path;
}

function showNewCanvasDialog(parentId = null) {
    const name = prompt('Enter canvas name:', 'New Canvas');
    if (name) {
        createNewCanvas(name, parentId);
    }
}

async function createNewCanvas(name, parentId = null) {
    try {
        // Create canvas and add to tree
        const canvas = await window.canvasAPI.create(name, parentId);
        await window.treeAPI.addCanvas(canvas.id, parentId, name);
        
        // Reload tree and switch to new canvas
        await loadTreeData();
        if (parentId) {
            expandedNodes.add(parentId);
        }
        switchToCanvas(canvas.id);
        
    } catch (error) {
        console.error('Error creating canvas:', error);
        alert('Failed to create canvas');
    }
}

async function deleteCanvas(canvasId) {
    if (canvasId === 'main') {
        alert('Cannot delete main canvas');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this canvas and all its contents?')) {
        return;
    }
    
    try {
        // Remove from tree first
        await window.treeAPI.removeCanvas(canvasId);

        // Delete canvas file
        await window.canvasAPI.delete(canvasId);
        
        // Reload tree and switch to main if we deleted current canvas
        await loadTreeData();
        if (currentCanvasId === canvasId) {
            switchToCanvas('main');
        }
        
    } catch (error) {
        console.error('Error deleting canvas:', error);
        alert('Failed to delete canvas');
    }
}

// Export functions for use by other modules
window.switchToCanvas = switchToCanvas;
window.getCurrentCanvasId = () => currentCanvasId;
window.loadTreeData = loadTreeData;