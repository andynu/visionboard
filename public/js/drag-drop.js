function initializeDragDrop() {
    const dropZone = document.getElementById('drop-zone');
    const canvasContainer = document.getElementById('canvas');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    
    // File input button
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', (event) => {
        handleFiles(event.target.files);
    });
    
    // Drag and drop events for drop zone
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Drag and drop events for canvas
    canvasContainer.addEventListener('dragover', handleDragOver);
    canvasContainer.addEventListener('drop', handleCanvasDrop);
    
    // Prevent default drag behaviors on the document
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.target.id === 'drop-zone' || event.target.closest('#drop-zone')) {
        document.getElementById('drop-zone').classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Only remove class if we're actually leaving the drop zone
    if (!event.currentTarget.contains(event.relatedTarget)) {
        document.getElementById('drop-zone').classList.remove('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    document.getElementById('drop-zone').classList.remove('drag-over');
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        handleFiles(imageFiles);
    } else {
        alert('Please drop only image files');
    }
}

function handleCanvasDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
        // Get drop position relative to canvas
        const canvasRect = event.currentTarget.getBoundingClientRect();
        const dropX = event.clientX - canvasRect.left;
        const dropY = event.clientY - canvasRect.top;
        
        // Convert screen coordinates to canvas coordinates
        const canvasCoords = screenToCanvasCoordinates(dropX, dropY);
        
        handleFiles(imageFiles, canvasCoords.x, canvasCoords.y);
    }
}

function screenToCanvasCoordinates(screenX, screenY) {
    // This is a simplified conversion - in a full implementation,
    // you'd need to account for the current pan/zoom state
    const canvasElement = document.getElementById('canvas');
    const rect = canvasElement.getBoundingClientRect();
    
    // Get the SVG viewBox to calculate scale
    const viewBox = canvas.viewbox();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    
    return {
        x: (screenX - rect.left) * scaleX + viewBox.x,
        y: (screenY - rect.top) * scaleY + viewBox.y
    };
}

async function handleFiles(files, dropX = null, dropY = null) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            // Show upload progress (simplified)
            console.log(`Uploading ${file.name}...`);
            
            const fileInfo = await uploadFile(file);
            
            // Calculate position for multiple files
            let x = dropX !== null ? dropX : 100 + (i * 50);
            let y = dropY !== null ? dropY : 100 + (i * 50);
            
            // Add to canvas
            addImageFromFile(fileInfo, x, y);
            
            // Hide drop zone after adding the first image
            hideDropZoneIfNeeded();
            
        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            // Show more specific error message
            const errorMsg = error.message || 'Upload failed';
            console.log(`Upload error for ${file.name}: ${errorMsg}`);
        }
    }
}

function hideDropZoneIfNeeded() {
    const dropZone = document.getElementById('drop-zone');
    
    // Hide drop zone when we have images on the canvas
    if (currentCanvas && currentCanvas.elements.length > 0) {
        dropZone.style.display = 'none';
    }
}

function showDropZoneIfNeeded() {
    const dropZone = document.getElementById('drop-zone');
    
    // Show drop zone when canvas is empty
    if (currentCanvas && currentCanvas.elements.length === 0) {
        dropZone.style.display = 'flex';
    }
}

async function uploadFile(file) {
    try {
        return await window.imageAPI.upload(file);
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error - cannot connect to server');
        }
        throw error;
    }
}

// Handle paste events for images from clipboard
document.addEventListener('paste', async (event) => {
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
        event.preventDefault();
        
        // Calculate cursor position for image placement
        let svgX = 100; // Default fallback
        let svgY = 100; // Default fallback
        
        // Try to get cursor position and convert to canvas coordinates
        try {
            // Get last known mouse position (if available from canvas.js)
            const lastMousePos = window.lastMousePosition;
            if (lastMousePos) {
                const canvasContainer = document.getElementById('canvas');
                const rect = canvasContainer.getBoundingClientRect();
                
                // Get relative mouse position within canvas
                let mouseX = lastMousePos.x - rect.left;
                let mouseY = lastMousePos.y - rect.top;
                
                // Clamp to canvas bounds
                mouseX = Math.max(0, Math.min(mouseX, rect.width));
                mouseY = Math.max(0, Math.min(mouseY, rect.height));
                
                // Get canvas and convert to SVG coordinates
                const canvas = document.querySelector('#canvas svg');
                if (canvas && window.canvas && window.canvas.viewbox) {
                    const vbox = window.canvas.viewbox();
                    svgX = vbox.x + (mouseX / rect.width) * vbox.width;
                    svgY = vbox.y + (mouseY / rect.height) * vbox.height;
                }
            }
        } catch (error) {
            console.log('Using default paste position');
        }
        
        for (const item of imageItems) {
            const file = item.getAsFile();
            if (file) {
                try {
                    const fileInfo = await uploadFile(file);
                    addImageFromFile(fileInfo, svgX, svgY);
                } catch (error) {
                    console.error('Error uploading pasted image:', error);
                    alert('Failed to upload pasted image');
                }
            }
        }
    }
});

// Expose handleFiles globally for Tauri file drop handler
window.handleFiles = handleFiles;