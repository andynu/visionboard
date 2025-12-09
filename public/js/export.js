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
    const exportOpmlBtn = document.getElementById('export-opml-btn');
    const importOpmlBtn = document.getElementById('import-opml-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportCanvasToPNG);
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportCanvasToJSON);
    }

    if (importJsonBtn) {
        importJsonBtn.addEventListener('click', importCanvasFromJSON);
    }

    if (exportOpmlBtn) {
        exportOpmlBtn.addEventListener('click', exportTreeToOPML);
    }

    if (importOpmlBtn) {
        importOpmlBtn.addEventListener('click', importTreeFromOPML);
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

        const isTauri = window.isTauriApp && window.isTauriApp();

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

        // Convert external images to embedded data URLs (skip in Tauri - will fail)
        if (!isTauri) {
            await embedImagesInSVG(svgClone);
        }

        // Create a blob from the SVG
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create an image element to convert SVG to PNG
        const img = new Image();
        const filename = `vision-board-${getCurrentCanvasName()}.png`;

        return new Promise((resolve, reject) => {
            img.onload = async () => {
                try {
                    // Create a canvas for conversion
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions
                    canvas.width = width;
                    canvas.height = height;

                    // Draw the image onto the canvas
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to PNG
                    canvas.toBlob(async (blob) => {
                        if (isTauri && window.__TAURI__.fs && window.__TAURI__.path) {
                            // Use Tauri's fs to write to Downloads folder
                            try {
                                const downloadDir = await window.__TAURI__.path.downloadDir();
                                const sep = downloadDir.endsWith('/') || downloadDir.endsWith('\\') ? '' : '/';
                                const filePath = downloadDir + sep + filename;
                                const arrayBuffer = await blob.arrayBuffer();
                                const bytes = new Uint8Array(arrayBuffer);
                                await window.__TAURI__.fs.writeBinaryFile(filePath, bytes);
                                alert(`Image exported to:\n${filePath}`);
                            } catch (error) {
                                console.error('Tauri save error:', error);
                                // Fall back to browser download
                                downloadBinaryFile(blob, filename, 'image/png');
                            }
                        } else {
                            // Use browser download
                            downloadBinaryFile(blob, filename, 'image/png');
                        }

                        // Clean up
                        URL.revokeObjectURL(svgUrl);
                        resolve();
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(svgUrl);
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

// Helper function to download a file in browser
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}

// Helper function to download binary data in browser
function downloadBinaryFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}

async function exportCanvasToJSON() {
    try {
        // Get current canvas data
        if (!window.currentCanvas) {
            alert('No canvas data found to export');
            return;
        }

        // Clone elements - skip image embedding in Tauri mode, keep original refs
        const isTauri = window.isTauriApp && window.isTauriApp();
        let elementsForExport;

        if (isTauri) {
            // In Tauri, just use elements as-is (no image embedding)
            elementsForExport = window.currentCanvas.elements || [];
        } else {
            // In browser mode, try to embed images as base64
            elementsForExport = await Promise.all(
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
        }

        // Create export data with metadata
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            canvas: {
                id: window.currentCanvas.id,
                name: window.currentCanvas.name || 'Untitled Canvas',
                parentId: window.currentCanvas.parentId || null,
                elements: elementsForExport,
                viewBox: window.currentCanvas.viewBox || "0 0 1920 1080",
                created: window.currentCanvas.created,
                modified: window.currentCanvas.modified
            }
        };

        // Convert to JSON string with formatting
        const jsonString = JSON.stringify(exportData, null, 2);
        const filename = `vision-board-${getCurrentCanvasName()}.json`;

        if (isTauri && window.__TAURI__.fs && window.__TAURI__.path) {
            // Use Tauri's fs to write to Downloads folder
            try {
                const downloadDir = await window.__TAURI__.path.downloadDir();
                const sep = downloadDir.endsWith('/') || downloadDir.endsWith('\\') ? '' : '/';
                const filePath = downloadDir + sep + filename;
                await window.__TAURI__.fs.writeTextFile(filePath, jsonString);
                alert(`Canvas exported to:\n${filePath}`);
            } catch (error) {
                console.error('Tauri save error:', error);
                // Fall back to browser download
                downloadFile(jsonString, filename, 'application/json');
            }
        } else {
            // Use browser download
            downloadFile(jsonString, filename, 'application/json');
        }

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

// OPML Export - exports entire canvas tree hierarchy
async function exportTreeToOPML() {
    try {
        // Get tree structure
        const treeData = await window.treeAPI.get();

        // Load all canvas data for export
        const canvasDataMap = {};
        for (const canvasId of Object.keys(treeData.canvases)) {
            try {
                const canvasData = await window.canvasAPI.get(canvasId);
                canvasDataMap[canvasId] = canvasData;
            } catch (error) {
                console.warn(`Could not load canvas ${canvasId}:`, error);
            }
        }

        // Build OPML structure
        const opml = buildOPMLDocument(treeData, canvasDataMap);

        // Download the file
        const blob = new Blob([opml], { type: 'text/xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = `vision-board-tree-${new Date().toISOString().slice(0, 10)}.opml`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error('OPML export error:', error);
        alert('Failed to export tree as OPML: ' + error.message);
    }
}

function buildOPMLDocument(treeData, canvasDataMap) {
    const doc = document.implementation.createDocument(null, 'opml', null);
    const opml = doc.documentElement;
    opml.setAttribute('version', '2.0');

    // Head section
    const head = doc.createElement('head');
    const title = doc.createElement('title');
    title.textContent = 'Vision Board Canvas Tree';
    head.appendChild(title);

    const dateCreated = doc.createElement('dateCreated');
    dateCreated.textContent = new Date().toUTCString();
    head.appendChild(dateCreated);

    const generator = doc.createElement('ownerName');
    generator.textContent = 'Vision Board App';
    head.appendChild(generator);

    opml.appendChild(head);

    // Body section
    const body = doc.createElement('body');

    // Recursively build outline for each root canvas
    for (const rootId of treeData.rootCanvases) {
        const outline = buildCanvasOutline(doc, rootId, treeData, canvasDataMap);
        if (outline) {
            body.appendChild(outline);
        }
    }

    opml.appendChild(body);

    // Serialize to string
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(doc);

    // Add XML declaration
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlString;
}

function buildCanvasOutline(doc, canvasId, treeData, canvasDataMap) {
    const treeNode = treeData.canvases[canvasId];
    if (!treeNode) return null;

    const canvasData = canvasDataMap[canvasId];
    const outline = doc.createElement('outline');

    // Basic attributes
    outline.setAttribute('text', escapeXMLAttr(treeNode.name || canvasId));
    outline.setAttribute('vb:canvasId', canvasId);
    outline.setAttribute('type', 'canvas');

    // Canvas metadata as attributes
    if (canvasData) {
        if (canvasData.viewBox) {
            const vb = canvasData.viewBox;
            const viewBoxStr = typeof vb === 'string' ? vb : `${vb.x || 0} ${vb.y || 0} ${vb.width || 1920} ${vb.height || 1080}`;
            outline.setAttribute('vb:viewBox', viewBoxStr);
        }
        if (canvasData.created) {
            outline.setAttribute('vb:created', canvasData.created);
        }
        if (canvasData.modified) {
            outline.setAttribute('vb:modified', canvasData.modified);
        }

        // Add elements as child outlines
        if (canvasData.elements && canvasData.elements.length > 0) {
            for (const element of canvasData.elements) {
                const elementOutline = buildElementOutline(doc, element);
                outline.appendChild(elementOutline);
            }
        }
    }

    // Add child canvases (from tree structure)
    if (treeNode.children && treeNode.children.length > 0) {
        for (const childId of treeNode.children) {
            const childOutline = buildCanvasOutline(doc, childId, treeData, canvasDataMap);
            if (childOutline) {
                outline.appendChild(childOutline);
            }
        }
    }

    return outline;
}

function buildElementOutline(doc, element) {
    const outline = doc.createElement('outline');
    outline.setAttribute('type', 'element');
    outline.setAttribute('vb:elementType', element.type);
    outline.setAttribute('vb:elementId', element.id);

    // Position and size
    outline.setAttribute('vb:x', String(element.x));
    outline.setAttribute('vb:y', String(element.y));
    outline.setAttribute('vb:width', String(element.width));
    outline.setAttribute('vb:height', String(element.height));

    if (element.rotation) {
        outline.setAttribute('vb:rotation', String(element.rotation));
    }
    if (element.zIndex) {
        outline.setAttribute('vb:zIndex', String(element.zIndex));
    }

    // Type-specific attributes
    if (element.type === 'image') {
        outline.setAttribute('text', 'Image');
        // For images, we store the src - could be base64 or URL
        if (element.src) {
            if (element.src.startsWith('data:')) {
                // Base64 data - store inline
                outline.setAttribute('vb:src', element.src);
            } else {
                // URL reference - just store the path
                outline.setAttribute('vb:src', element.src);
            }
        }
    } else if (element.type === 'folder') {
        outline.setAttribute('text', escapeXMLAttr(element.name || 'Folder'));
        outline.setAttribute('vb:targetCanvasId', element.targetCanvasId || '');
    } else if (element.type === 'rectangle' || element.type === 'line' || element.type === 'freehand') {
        outline.setAttribute('text', element.type.charAt(0).toUpperCase() + element.type.slice(1));
        if (element.stroke) outline.setAttribute('vb:stroke', element.stroke);
        if (element.strokeWidth) outline.setAttribute('vb:strokeWidth', String(element.strokeWidth));
        if (element.fill) outline.setAttribute('vb:fill', element.fill);
        if (element.points) outline.setAttribute('vb:points', element.points);
    } else {
        outline.setAttribute('text', element.type || 'Unknown Element');
    }

    return outline;
}

function escapeXMLAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// OPML Import - imports tree hierarchy from OPML file
function importTreeFromOPML() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.opml,.xml,text/xml,application/xml';
        input.style.display = 'none';

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/xml');

                // Check for parsing errors
                const parseError = doc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('Invalid XML format: ' + parseError.textContent);
                }

                // Validate OPML structure
                const opml = doc.documentElement;
                if (opml.tagName.toLowerCase() !== 'opml') {
                    throw new Error('Not a valid OPML file');
                }

                const body = opml.querySelector('body');
                if (!body) {
                    throw new Error('OPML file has no body section');
                }

                // Import the tree
                await importOPMLTree(body);

            } catch (error) {
                console.error('OPML import error:', error);
                alert('Failed to import OPML file: ' + error.message);
            } finally {
                document.body.removeChild(input);
            }
        };

        document.body.appendChild(input);
        input.click();

    } catch (error) {
        console.error('OPML import setup error:', error);
        alert('Failed to setup OPML import: ' + error.message);
    }
}

async function importOPMLTree(body) {
    // Get existing tree to merge with
    const existingTree = await window.treeAPI.get();

    // Track new canvases and ID mappings
    const idMapping = {}; // old ID -> new ID
    const newCanvases = [];

    // Process all top-level outlines
    const topOutlines = body.querySelectorAll(':scope > outline');
    for (const outline of topOutlines) {
        await processOPMLOutline(outline, null, idMapping, newCanvases, existingTree);
    }

    // Update folder targetCanvasId references to use new IDs
    for (const canvas of newCanvases) {
        if (canvas.elements) {
            for (const element of canvas.elements) {
                if (element.type === 'folder' && element.targetCanvasId) {
                    const newTargetId = idMapping[element.targetCanvasId];
                    if (newTargetId) {
                        element.targetCanvasId = newTargetId;
                    }
                }
            }
        }
    }

    // Save all new canvases
    for (const canvas of newCanvases) {
        await window.canvasAPI.update(canvas.id, canvas);
    }

    // Update tree structure
    await window.treeAPI.update(existingTree);

    // Refresh navigation
    if (window.loadTreeData) {
        await window.loadTreeData();
    }

    const count = newCanvases.length;
    alert(`Successfully imported ${count} canvas${count !== 1 ? 'es' : ''} from OPML.`);
}

async function processOPMLOutline(outline, parentId, idMapping, newCanvases, treeData) {
    const type = outline.getAttribute('type');
    const text = outline.getAttribute('text') || 'Imported Canvas';

    // Only process canvas-type outlines (skip element outlines)
    if (type === 'element') {
        return null;
    }

    // Generate new ID for this canvas
    const oldId = outline.getAttribute('vb:canvasId');
    const newId = generateUniqueId();
    if (oldId) {
        idMapping[oldId] = newId;
    }

    // Generate unique name
    const uniqueName = await generateUniqueCanvasName(text);

    // Extract canvas data
    const viewBoxStr = outline.getAttribute('vb:viewBox') || '0 0 1920 1080';

    // Parse elements from child outlines
    const elements = [];
    const childOutlines = outline.querySelectorAll(':scope > outline');
    for (const child of childOutlines) {
        const childType = child.getAttribute('type');
        if (childType === 'element') {
            const element = parseElementOutline(child);
            if (element) {
                // Generate new element ID
                element.id = 'element-' + Math.random().toString(36).substr(2, 9);
                elements.push(element);
            }
        }
    }

    // Create canvas object
    const canvas = {
        id: newId,
        name: uniqueName,
        parentId: parentId,
        elements: elements,
        viewBox: viewBoxStr,
        created: outline.getAttribute('vb:created') || new Date().toISOString(),
        modified: new Date().toISOString(),
        version: '1.0.0'
    };

    newCanvases.push(canvas);

    // Add to tree structure
    treeData.canvases[newId] = {
        name: uniqueName,
        children: [],
        parent: parentId
    };

    if (parentId && treeData.canvases[parentId]) {
        treeData.canvases[parentId].children.push(newId);
    } else {
        treeData.rootCanvases.push(newId);
    }

    // Process child canvas outlines recursively
    for (const child of childOutlines) {
        const childType = child.getAttribute('type');
        if (childType !== 'element') {
            await processOPMLOutline(child, newId, idMapping, newCanvases, treeData);
        }
    }

    return newId;
}

function parseElementOutline(outline) {
    const elementType = outline.getAttribute('vb:elementType');
    if (!elementType) return null;

    const element = {
        type: elementType,
        x: parseFloat(outline.getAttribute('vb:x')) || 0,
        y: parseFloat(outline.getAttribute('vb:y')) || 0,
        width: parseFloat(outline.getAttribute('vb:width')) || 100,
        height: parseFloat(outline.getAttribute('vb:height')) || 100,
        rotation: parseFloat(outline.getAttribute('vb:rotation')) || 0,
        zIndex: parseInt(outline.getAttribute('vb:zIndex')) || 1
    };

    // Type-specific attributes
    if (elementType === 'image') {
        element.src = outline.getAttribute('vb:src') || '';
    } else if (elementType === 'folder') {
        element.name = outline.getAttribute('text') || 'Folder';
        element.targetCanvasId = outline.getAttribute('vb:targetCanvasId') || '';
    } else if (elementType === 'rectangle' || elementType === 'line' || elementType === 'freehand') {
        element.stroke = outline.getAttribute('vb:stroke') || '#000000';
        element.strokeWidth = parseFloat(outline.getAttribute('vb:strokeWidth')) || 2;
        if (outline.getAttribute('vb:fill')) {
            element.fill = outline.getAttribute('vb:fill');
        }
        if (outline.getAttribute('vb:points')) {
            element.points = outline.getAttribute('vb:points');
        }
    }

    return element;
}

// Export functions for use by other modules
window.exportCanvasToPNG = exportCanvasToPNG;
window.exportCanvasToJSON = exportCanvasToJSON;
window.importCanvasFromJSON = importCanvasFromJSON;
window.exportTreeToOPML = exportTreeToOPML;
window.importTreeFromOPML = importTreeFromOPML;
window.generateUniqueId = generateUniqueId;
window.generateUniqueCanvasName = generateUniqueCanvasName;
window.validateImportData = validateImportData;
window.createCanvasFromImport = createCanvasFromImport;
window.initializeExport = initializeExport;