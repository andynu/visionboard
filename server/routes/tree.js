const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const STORAGE_DIR = path.join(__dirname, '../storage');
const CANVASES_DIR = path.join(STORAGE_DIR, 'canvases');
const TREE_FILE = path.join(STORAGE_DIR, 'tree.json');

// Initialize default tree structure if it doesn't exist
async function ensureTreeStructure() {
    try {
        await fs.access(TREE_FILE);
    } catch (error) {
        const defaultTree = {
            rootCanvases: ['main'],
            canvases: {
                'main': {
                    name: 'Main Canvas',
                    children: [],
                    parent: null
                }
            }
        };
        await fs.writeFile(TREE_FILE, JSON.stringify(defaultTree, null, 2));
    }
}

// Get full canvas tree
router.get('/tree', async (req, res) => {
    try {
        await ensureTreeStructure();
        const treeData = await fs.readFile(TREE_FILE, 'utf8');
        res.json(JSON.parse(treeData));
    } catch (error) {
        res.status(500).json({ error: 'Failed to load tree structure' });
    }
});

// Update tree structure
router.put('/tree', async (req, res) => {
    try {
        await fs.writeFile(TREE_FILE, JSON.stringify(req.body, null, 2));
        res.json(req.body);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update tree structure' });
    }
});

// Add canvas to tree
router.post('/tree/canvas', async (req, res) => {
    try {
        await ensureTreeStructure();
        const treeData = JSON.parse(await fs.readFile(TREE_FILE, 'utf8'));
        
        const { canvasId, parentId, name } = req.body;
        
        // Add canvas to tree structure
        treeData.canvases[canvasId] = {
            name: name || 'New Canvas',
            children: [],
            parent: parentId || null
        };
        
        // Add to parent's children or root canvases
        if (parentId && treeData.canvases[parentId]) {
            if (!treeData.canvases[parentId].children.includes(canvasId)) {
                treeData.canvases[parentId].children.push(canvasId);
            }
        } else {
            if (!treeData.rootCanvases.includes(canvasId)) {
                treeData.rootCanvases.push(canvasId);
            }
        }
        
        await fs.writeFile(TREE_FILE, JSON.stringify(treeData, null, 2));
        res.json(treeData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add canvas to tree' });
    }
});

// Remove canvas from tree
router.delete('/tree/canvas/:id', async (req, res) => {
    try {
        await ensureTreeStructure();
        const treeData = JSON.parse(await fs.readFile(TREE_FILE, 'utf8'));
        const canvasId = req.params.id;
        
        if (!treeData.canvases[canvasId]) {
            return res.status(404).json({ error: 'Canvas not found in tree' });
        }
        
        const canvas = treeData.canvases[canvasId];
        
        // Remove from parent's children or root canvases
        if (canvas.parent && treeData.canvases[canvas.parent]) {
            treeData.canvases[canvas.parent].children = 
                treeData.canvases[canvas.parent].children.filter(id => id !== canvasId);
        } else {
            treeData.rootCanvases = treeData.rootCanvases.filter(id => id !== canvasId);
        }
        
        // Move children to parent or root
        canvas.children.forEach(childId => {
            if (treeData.canvases[childId]) {
                treeData.canvases[childId].parent = canvas.parent;
                
                if (canvas.parent && treeData.canvases[canvas.parent]) {
                    treeData.canvases[canvas.parent].children.push(childId);
                } else {
                    treeData.rootCanvases.push(childId);
                }
            }
        });
        
        // Remove canvas from tree
        delete treeData.canvases[canvasId];
        
        await fs.writeFile(TREE_FILE, JSON.stringify(treeData, null, 2));
        res.json(treeData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove canvas from tree' });
    }
});

// Move canvas in tree (change parent)
router.put('/tree/canvas/:id/move', async (req, res) => {
    try {
        await ensureTreeStructure();
        const treeData = JSON.parse(await fs.readFile(TREE_FILE, 'utf8'));
        const canvasId = req.params.id;
        const { newParentId } = req.body;
        
        if (!treeData.canvases[canvasId]) {
            return res.status(404).json({ error: 'Canvas not found in tree' });
        }
        
        const canvas = treeData.canvases[canvasId];
        const oldParentId = canvas.parent;
        
        // Remove from old parent
        if (oldParentId && treeData.canvases[oldParentId]) {
            treeData.canvases[oldParentId].children = 
                treeData.canvases[oldParentId].children.filter(id => id !== canvasId);
        } else {
            treeData.rootCanvases = treeData.rootCanvases.filter(id => id !== canvasId);
        }
        
        // Add to new parent
        canvas.parent = newParentId || null;
        if (newParentId && treeData.canvases[newParentId]) {
            if (!treeData.canvases[newParentId].children.includes(canvasId)) {
                treeData.canvases[newParentId].children.push(canvasId);
            }
        } else {
            if (!treeData.rootCanvases.includes(canvasId)) {
                treeData.rootCanvases.push(canvasId);
            }
        }
        
        await fs.writeFile(TREE_FILE, JSON.stringify(treeData, null, 2));
        res.json(treeData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to move canvas in tree' });
    }
});

module.exports = router;