// Export functionality for Vision Board

function initializeExport() {
    setupExportButton();
}

function setupExportButton() {
    const exportBtn = document.getElementById('export-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCanvasToPNG);
    }
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportCanvasToJSON);
    }
}

async function exportCanvasToPNG() {
    try {
        const canvasElement = document.getElementById('canvas');
        if (!canvasElement) {
            alert('No canvas found to export');
            return;
        }

        // Get the SVG element
        const svgElement = canvasElement.querySelector('svg');
        if (!svgElement) {
            alert('No content to export');
            return;
        }

        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);
        
        // Get the viewBox or default dimensions
        const viewBox = svgElement.getAttribute('viewBox');
        let width, height;
        
        if (viewBox) {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            width = w;
            height = h;
        } else {
            width = svgElement.clientWidth || 1920;
            height = svgElement.clientHeight || 1080;
            svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }

        // Set explicit dimensions for export
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        
        // Add white background if none exists
        const existingRect = svgClone.querySelector('rect[fill="white"]');
        if (!existingRect) {
            const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            backgroundRect.setAttribute('x', '0');
            backgroundRect.setAttribute('y', '0');
            backgroundRect.setAttribute('width', width);
            backgroundRect.setAttribute('height', height);
            backgroundRect.setAttribute('fill', 'white');
            svgClone.insertBefore(backgroundRect, svgClone.firstChild);
        }

        // Convert external images to embedded data URLs
        await embedImagesInSVG(svgClone);

        // Create a blob from the SVG
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create an image element to convert SVG to PNG
        const img = new Image();
        
        return new Promise((resolve, reject) => {
            img.onload = () => {
                try {
                    // Create a canvas for conversion
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw the image onto the canvas
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to PNG and download
                    canvas.toBlob((blob) => {
                        const link = document.createElement('a');
                        link.download = `vision-board-${getCurrentCanvasName()}.png`;
                        link.href = URL.createObjectURL(blob);
                        link.click();
                        
                        // Clean up
                        URL.revokeObjectURL(svgUrl);
                        URL.revokeObjectURL(link.href);
                        
                        resolve();
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Failed to load SVG for conversion'));
            };
            
            img.src = svgUrl;
        });

    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export canvas: ' + error.message);
    }
}

async function embedImagesInSVG(svgElement) {
    const images = svgElement.querySelectorAll('image');
    const promises = Array.from(images).map(async (img) => {
        const href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (href && !href.startsWith('data:')) {
            try {
                // Convert relative URLs to absolute
                const absoluteUrl = new URL(href, window.location.origin).href;
                const dataUrl = await imageToDataUrl(absoluteUrl);
                img.setAttribute('href', dataUrl);
                img.removeAttribute('xlink:href');
            } catch (error) {
                console.warn('Failed to embed image:', href, error);
            }
        }
    });
    
    await Promise.all(promises);
}

function imageToDataUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            ctx.drawImage(img, 0, 0);
            
            try {
                const dataUrl = canvas.toDataURL('image/png');
                resolve(dataUrl);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => {
            reject(new Error(`Failed to load image: ${url}`));
        };
        
        img.src = url;
    });
}

function getCurrentCanvasName() {
    // Try to get canvas name from breadcrumb or use current canvas ID
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        const activeItem = breadcrumb.querySelector('.breadcrumb-item.active');
        if (activeItem) {
            return activeItem.textContent.trim().replace(/[^a-zA-Z0-9]/g, '-');
        }
    }
    
    // Fallback to current canvas ID or timestamp
    if (window.getCurrentCanvasId) {
        return window.getCurrentCanvasId();
    }
    
    return new Date().toISOString().slice(0, 10);
}

function exportCanvasToJSON() {
    try {
        // Get current canvas data
        if (!window.currentCanvas) {
            alert('No canvas data found to export');
            return;
        }

        // Create export data with metadata
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            canvas: {
                id: window.currentCanvas.id,
                name: window.currentCanvas.name || 'Untitled Canvas',
                parentId: window.currentCanvas.parentId || null,
                elements: window.currentCanvas.elements || [],
                viewBox: window.currentCanvas.viewBox || "0 0 1920 1080",
                created: window.currentCanvas.created,
                modified: window.currentCanvas.modified
            }
        };

        // Convert to JSON string with formatting
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `vision-board-${getCurrentCanvasName()}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
        
    } catch (error) {
        console.error('JSON export error:', error);
        alert('Failed to export canvas as JSON: ' + error.message);
    }
}

// Export functions for use by other modules
window.exportCanvasToPNG = exportCanvasToPNG;
window.exportCanvasToJSON = exportCanvasToJSON;
window.initializeExport = initializeExport;