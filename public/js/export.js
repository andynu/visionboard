// Export functionality for Vision Board

// Global tracking for imported canvas names during session
let importedNamesThisSession = new Set();

function initializeExport() {
    setupExportButton();
}

function setupExportButton() {
    const exportBtn = document.getElementById('export-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCanvasToPNG);
    }
    
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportCanvasToJSON);
    }
    
    if (importJsonBtn) {
        importJsonBtn.addEventListener('click', importCanvasFromJSON);
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

async function exportCanvasToJSON() {
    try {
        // Get current canvas data
        if (!window.currentCanvas) {
            alert('No canvas data found to export');
            return;
        }

        // Clone elements and convert image URLs to base64
        const elementsWithEmbeddedImages = await Promise.all(
            (window.currentCanvas.elements || []).map(async (element) => {
                if (element.type === 'image' && element.src && !element.src.startsWith('data:')) {
                    try {
                        // Convert relative URLs to absolute
                        const absoluteUrl = new URL(element.src, window.location.origin).href;
                        const base64Data = await imageToDataUrl(absoluteUrl);
                        return {
                            ...element,
                            src: base64Data
                        };
                    } catch (error) {
                        console.warn('Failed to embed image:', element.src, error);
                        // Keep original URL if conversion fails
                        return element;
                    }
                }
                return element;
            })
        );

        // Create export data with metadata
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            canvas: {
                id: window.currentCanvas.id,
                name: window.currentCanvas.name || 'Untitled Canvas',
                parentId: window.currentCanvas.parentId || null,
                elements: elementsWithEmbeddedImages,
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

function importCanvasFromJSON() {
    try {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const importData = JSON.parse(text);
                
                // Validate the imported data structure
                if (!validateImportData(importData)) {
                    alert('Invalid JSON format. Please select a valid Vision Board export file.');
                    return;
                }
                
                // Create new canvas from imported data
                await createCanvasFromImport(importData);
                
            } catch (error) {
                console.error('Import error:', error);
                alert('Failed to import JSON file: ' + error.message);
            } finally {
                // Clean up the input element
                document.body.removeChild(input);
            }
        };
        
        // Add to DOM and trigger click
        document.body.appendChild(input);
        input.click();
        
    } catch (error) {
        console.error('JSON import error:', error);
        alert('Failed to import JSON: ' + error.message);
    }
}

function validateImportData(data) {
    // Check for required top-level properties
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.canvas) return false;
    
    const canvas = data.canvas;
    
    // Check for required canvas properties
    if (!canvas.id || !canvas.name) return false;
    if (!Array.isArray(canvas.elements)) return false;
    
    // Validate elements structure
    for (const element of canvas.elements) {
        if (!element.id || !element.type) return false;
        if (typeof element.x !== 'number' || typeof element.y !== 'number') return false;
        if (typeof element.width !== 'number' || typeof element.height !== 'number') return false;
        
        // Type-specific validation
        if (element.type === 'image' && !element.src) return false;
        if (element.type === 'folder' && (!element.name || !element.targetCanvasId)) return false;
    }
    
    return true;
}

async function generateUniqueCanvasName(baseName) {
    try {
        // Get all existing canvas names from multiple sources
        const existingNames = new Set();
        
        // 1. Get names from tree data
        try {
            const treeResponse = await fetch('/api/tree');
            if (treeResponse.ok) {
                const treeData = await treeResponse.json();
                if (treeData.canvases) {
                    Object.values(treeData.canvases).forEach(canvas => {
                        if (canvas.name) {
                            existingNames.add(canvas.name);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('Could not fetch tree data:', error);
        }
        
        // 2. Also check by trying to create candidates and seeing if they would conflict
        // Start with the base name and check if it's available
        let counter = 1;
        let candidateName = baseName;
        
        // Also check against names imported this session
        importedNamesThisSession.forEach(name => existingNames.add(name));
        
        // Keep trying until we find a name that's not in our set
        while (existingNames.has(candidateName)) {
            counter++;
            candidateName = `${baseName} (${counter})`;
            
            // Safety limit to prevent infinite loops
            if (counter > 100) {
                candidateName = `${baseName} (${Date.now()})`;
                break;
            }
        }
        
        // Track this name for the session to prevent future conflicts
        importedNamesThisSession.add(candidateName);
        
        return candidateName;
        
    } catch (error) {
        console.warn('Error generating unique canvas name:', error);
        // Fallback: add timestamp to ensure uniqueness
        return `${baseName} (${Date.now()})`;
    }
}

async function createCanvasFromImport(importData) {
    try {
        const canvasData = importData.canvas;
        
        // Generate new ID for imported canvas to avoid conflicts
        const newCanvasId = generateUniqueId();
        
        // Get unique name to avoid collisions
        const uniqueName = await generateUniqueCanvasName(`${canvasData.name} (Imported)`);
        
        const importedCanvas = {
            id: newCanvasId,
            name: uniqueName,
            parentId: canvasData.parentId || null,
            elements: canvasData.elements || [],
            viewBox: canvasData.viewBox || "0 0 1920 1080",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            version: "1.0.0"
        };
        
        // Create the canvas on the server using PUT to preserve all data
        const response = await fetch(`/api/canvas/${newCanvasId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(importedCanvas)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create imported canvas on server: ${response.status} - ${errorText}`);
        }
        
        // Add the canvas to the tree structure so it appears in navigation
        const treeResponse = await fetch('/api/tree/canvas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                canvasId: newCanvasId,
                parentId: importedCanvas.parentId,
                name: importedCanvas.name
            })
        });
        
        if (!treeResponse.ok) {
            console.warn('Failed to add canvas to tree structure, but canvas was created');
        }
        
        // Refresh the tree navigation to show the new canvas
        if (window.loadTreeData) {
            await window.loadTreeData();
        }
        
        // Navigate to the new canvas after tree is updated
        if (window.switchToCanvas) {
            window.switchToCanvas(newCanvasId);
        }
        
        alert(`Canvas "${importedCanvas.name}" imported successfully!`);
        
    } catch (error) {
        console.error('Error creating canvas from import:', error);
        throw new Error('Failed to create canvas from imported data: ' + error.message);
    }
}

function generateUniqueId() {
    return 'canvas-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Export functions for use by other modules
window.exportCanvasToPNG = exportCanvasToPNG;
window.exportCanvasToJSON = exportCanvasToJSON;
window.importCanvasFromJSON = importCanvasFromJSON;
window.generateUniqueId = generateUniqueId;
window.generateUniqueCanvasName = generateUniqueCanvasName;
window.validateImportData = validateImportData;
window.createCanvasFromImport = createCanvasFromImport;
window.initializeExport = initializeExport;