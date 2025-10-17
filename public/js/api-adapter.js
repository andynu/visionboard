// API Adapter for VisionBoard
// Provides a unified API interface that works with both Tauri and Express backends

(function() {
    // Detect if running in Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;

    // Helper to convert file to bytes for Tauri
    async function fileToBytes(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                const bytes = new Uint8Array(arrayBuffer);
                resolve(Array.from(bytes));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // Canvas API
    window.canvasAPI = {
        async get(id) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('get_canvas', { id });
            } else {
                const response = await fetch(`/api/canvas/${id}`);
                if (!response.ok) throw new Error('Failed to load canvas');
                return await response.json();
            }
        },

        async create(name, parentId) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('create_canvas', {
                    name: name || null,
                    parent_id: parentId || null
                });
            } else {
                const response = await fetch('/api/canvas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, parentId })
                });
                if (!response.ok) throw new Error('Failed to create canvas');
                return await response.json();
            }
        },

        async update(id, canvasData) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('update_canvas', {
                    id,
                    canvas_data: canvasData
                });
            } else {
                const response = await fetch(`/api/canvas/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(canvasData)
                });
                if (!response.ok) throw new Error('Failed to update canvas');
                return await response.json();
            }
        },

        async delete(id) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('delete_canvas', { id });
            } else {
                const response = await fetch(`/api/canvas/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete canvas');
                return await response.json();
            }
        }
    };

    // Tree API
    window.treeAPI = {
        async get() {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('get_tree');
            } else {
                const response = await fetch('/api/tree');
                if (!response.ok) throw new Error('Failed to load tree');
                return await response.json();
            }
        },

        async update(treeData) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('update_tree', {
                    tree_data: treeData
                });
            } else {
                const response = await fetch('/api/tree', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(treeData)
                });
                if (!response.ok) throw new Error('Failed to update tree');
                return await response.json();
            }
        },

        async addCanvas(canvasId, parentId, name) {
            if (isTauri) {
                // For Tauri, we update the tree manually
                const tree = await this.get();
                tree.canvases[canvasId] = {
                    name: name || 'New Canvas',
                    children: [],
                    parent: parentId || null
                };

                if (parentId && tree.canvases[parentId]) {
                    if (!tree.canvases[parentId].children.includes(canvasId)) {
                        tree.canvases[parentId].children.push(canvasId);
                    }
                } else {
                    if (!tree.rootCanvases.includes(canvasId)) {
                        tree.rootCanvases.push(canvasId);
                    }
                }

                return await this.update(tree);
            } else {
                const response = await fetch('/api/tree/canvas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ canvasId, parentId, name })
                });
                if (!response.ok) throw new Error('Failed to add canvas to tree');
                return await response.json();
            }
        },

        async removeCanvas(canvasId) {
            if (isTauri) {
                // For Tauri, we update the tree manually
                const tree = await this.get();

                if (!tree.canvases[canvasId]) {
                    throw new Error('Canvas not found in tree');
                }

                const canvas = tree.canvases[canvasId];

                // Remove from parent's children or root canvases
                if (canvas.parent && tree.canvases[canvas.parent]) {
                    tree.canvases[canvas.parent].children =
                        tree.canvases[canvas.parent].children.filter(id => id !== canvasId);
                } else {
                    tree.rootCanvases = tree.rootCanvases.filter(id => id !== canvasId);
                }

                // Move children to parent or root
                canvas.children.forEach(childId => {
                    if (tree.canvases[childId]) {
                        tree.canvases[childId].parent = canvas.parent;

                        if (canvas.parent && tree.canvases[canvas.parent]) {
                            tree.canvases[canvas.parent].children.push(childId);
                        } else {
                            tree.rootCanvases.push(childId);
                        }
                    }
                });

                // Remove canvas from tree
                delete tree.canvases[canvasId];

                return await this.update(tree);
            } else {
                const response = await fetch(`/api/tree/canvas/${canvasId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to remove canvas from tree');
                return await response.json();
            }
        }
    };

    // Image API
    window.imageAPI = {
        async upload(file) {
            if (isTauri) {
                const bytes = await fileToBytes(file);
                return await window.__TAURI__.core.invoke('save_image', {
                    filename: file.name,
                    data: bytes
                });
            } else {
                const formData = new FormData();
                formData.append('image', file);
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Failed to upload image');
                return await response.json();
            }
        },

        async uploadMultiple(files) {
            if (isTauri) {
                const uploads = await Promise.all(
                    Array.from(files).map(file => this.upload(file))
                );
                return { files: uploads };
            } else {
                const formData = new FormData();
                Array.from(files).forEach(file => {
                    formData.append('images', file);
                });
                const response = await fetch('/api/upload-multiple', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) throw new Error('Failed to upload images');
                return await response.json();
            }
        },

        async getPath(filename) {
            if (isTauri) {
                return await window.__TAURI__.core.invoke('get_image_path', {
                    filename
                });
            } else {
                return `/api/images/${filename}`;
            }
        },

        // Get image URL for use in img src
        async getImageUrl(filename) {
            if (isTauri) {
                const path = await this.getPath(filename);
                // Don't pass protocol parameter - let Tauri use its default
                return window.__TAURI__.core.convertFileSrc(path);
            } else {
                return `/api/images/${filename}`;
            }
        }
    };

    // Utility to check if running in Tauri
    window.isTauriApp = function() {
        return isTauri;
    };

    console.log(isTauri ? 'Running in Tauri app' : 'Running in browser with Express backend');
})();
