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
    const dropZone = document.getElementById('drop-zone');
    
    // Hide drop zone when we have images on the canvas
    if (currentCanvas && currentCanvas.elements.length === 0) {
        dropZone.style.display = 'none';
    }
    
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
            
        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            // Show more specific error message
            const errorMsg = error.message || 'Upload failed';
            console.log(`Upload error for ${file.name}: ${errorMsg}`);
        }
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            let errorMsg = 'Upload failed';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        
        return await response.json();
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
        
        for (const item of imageItems) {
            const file = item.getAsFile();
            if (file) {
                try {
                    const fileInfo = await uploadFile(file);
                    addImageFromFile(fileInfo);
                } catch (error) {
                    console.error('Error uploading pasted image:', error);
                    alert('Failed to upload pasted image');
                }
            }
        }
    }
});