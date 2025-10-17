// Tauri-specific file drop handler
// Handles file drops in Tauri environment using the Tauri event system

(function() {
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;

    if (!isTauri) {
        return;
    }

    // Listen for Tauri file drop events
    const { listen } = window.__TAURI__.event;

    // Handle file drop hover
    listen('tauri://drag-over', (event) => {
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    });

    // Handle file drop leave
    listen('tauri://drag-leave', (event) => {
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    });

    // Handle file drop
    listen('tauri://drag-drop', async (event) => {
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }

        // event.payload contains the dropped file paths
        const filePaths = event.payload.paths || [];

        if (filePaths.length === 0) {
            return;
        }

        // Read the files and convert to File objects
        try {
            const files = [];

            for (const filePath of filePaths) {
                // Check if it's an image file by extension
                const extension = filePath.split('.').pop().toLowerCase();
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

                if (!imageExtensions.includes(extension)) {
                    continue;
                }

                // Read the file using Tauri's fs plugin
                const { readFile } = window.__TAURI__.fs;
                const contents = await readFile(filePath);

                // Create a File object from the bytes
                const fileName = filePath.split('/').pop().split('\\').pop();
                const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

                const blob = new Blob([contents], { type: mimeType });
                const file = new File([blob], fileName, { type: mimeType });

                files.push(file);
            }

            if (files.length > 0) {
                // Use the existing handleFiles function from drag-drop.js
                if (window.handleFiles) {
                    window.handleFiles(files);
                }
            } else {
                alert('Please drop only image files');
            }
        } catch (error) {
            console.error('Error handling dropped files:', error);
            alert('Error loading dropped files: ' + error.message);
        }
    });
})();
