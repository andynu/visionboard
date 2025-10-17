// Tauri API wrapper for VisionBoard
// This module provides a unified API interface that works with Tauri commands

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && window.__TAURI__;

// Tauri invoke function
const invoke = isTauri ? window.__TAURI__.core.invoke : null;

// Convert file to base64 for Tauri
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
export const canvasAPI = {
    async get(id) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('get_canvas', { id });
    },

    async create(name, parentId) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('create_canvas', {
            name: name || null,
            parent_id: parentId || null
        });
    },

    async update(id, canvasData) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('update_canvas', {
            id,
            canvas_data: canvasData
        });
    },

    async delete(id) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('delete_canvas', { id });
    }
};

// Tree API
export const treeAPI = {
    async get() {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('get_tree');
    },

    async update(treeData) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('update_tree', { tree_data: treeData });
    }
};

// Image API
export const imageAPI = {
    async upload(file) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }

        const bytes = await fileToBytes(file);
        const result = await invoke('save_image', {
            filename: file.name,
            data: bytes
        });

        return result;
    },

    async uploadMultiple(files) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }

        const uploads = await Promise.all(
            Array.from(files).map(file => this.upload(file))
        );

        return { files: uploads };
    },

    async getPath(filename) {
        if (!isTauri) {
            throw new Error('Tauri API not available');
        }
        return await invoke('get_image_path', { filename });
    },

    // Convert image path for use in img src
    getImageUrl(filename) {
        if (!isTauri) {
            return `/api/images/${filename}`;
        }
        // In Tauri, we need to convert the filesystem path to a URL
        // For now, we'll use the convertFileSrc utility
        return window.__TAURI__.core.convertFileSrc(filename);
    }
};

// Check if running in Tauri
export function isTauriApp() {
    return isTauri;
}

// Initialize Tauri API
export async function initTauriAPI() {
    if (isTauri) {
        console.log('Running in Tauri app');
        return true;
    } else {
        console.log('Not running in Tauri - API calls will fail');
        return false;
    }
}
