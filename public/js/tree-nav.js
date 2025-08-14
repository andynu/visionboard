let treeData = null;
let currentCanvasId = 'main';
let expandedNodes = new Set(['main']); // Track expanded nodes

function initializeTreeNav() {
    setupSidebarToggle();
    setupTreeEventListeners();
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

async function loadTreeData() {
    try {
        const response = await fetch('/api/tree');
        if (response.ok) {
            treeData = await response.json();
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
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = canvasInfo.children.length > 0 ? '📁' : '📄';
    
    // Label
    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = canvasInfo.name;
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    const addButton = document.createElement('button');
    addButton.className = 'tree-action';
    addButton.textContent = '+';
    addButton.title = 'Add child canvas';
    addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showNewCanvasDialog(canvasId);
    });
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'tree-action';
    deleteButton.textContent = '×';
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
    try {
        currentCanvasId = canvasId;
        await loadCanvas(canvasId);
        renderTree(); // Re-render to update active state
        updateBreadcrumb();
        
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
        const icon = document.createElement('span');
        icon.style.marginRight = '0.25rem';
        if (index === 0) {
            icon.textContent = '🏠'; // Home icon for root
        } else if (canvasInfo.children.length > 0) {
            icon.textContent = '📁'; // Folder icon for containers
        } else {
            icon.textContent = '📄'; // Document icon for leaves
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
        // Create canvas
        const canvasResponse = await fetch('/api/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId })
        });
        
        if (!canvasResponse.ok) {
            throw new Error('Failed to create canvas');
        }
        
        const canvas = await canvasResponse.json();
        
        // Add to tree
        const treeResponse = await fetch('/api/tree/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                canvasId: canvas.id, 
                parentId, 
                name 
            })
        });
        
        if (!treeResponse.ok) {
            throw new Error('Failed to add canvas to tree');
        }
        
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
        const treeResponse = await fetch(`/api/tree/canvas/${canvasId}`, {
            method: 'DELETE'
        });
        
        if (!treeResponse.ok) {
            throw new Error('Failed to remove canvas from tree');
        }
        
        // Delete canvas file
        const canvasResponse = await fetch(`/api/canvas/${canvasId}`, {
            method: 'DELETE'
        });
        
        if (!canvasResponse.ok) {
            throw new Error('Failed to delete canvas');
        }
        
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