// Export functionality for Vision Board

// Global tracking for imported canvas names during session
let importedNamesThisSession = new Set();

// Export dialog state
let exportDialogElement = null;
let exportSettings = {
    format: 'png',
    quality: 92,
    sizeMode: 'current', // 'current', 'fit', 'custom'
    customWidth: 1920,
    customHeight: 1080,
    includeBackground: true,
    backgroundColor: '#ffffff'
};

function initializeExport() {
    setupExportButton();
    createExportDialog();
    attachExportKeyboardShortcut();
}

function setupExportButton() {
    const exportBtn = document.getElementById('export-btn');
    const exportPngBtn = document.getElementById('export-png-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const exportOpmlBtn = document.getElementById('export-opml-btn');
    const importOpmlBtn = document.getElementById('import-opml-btn');

    // Old export button - show dialog
    if (exportBtn) {
        exportBtn.addEventListener('click', showExportDialog);
    }

    // New PNG button - show dialog
    if (exportPngBtn) {
        exportPngBtn.addEventListener('click', showExportDialog);
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

/**
 * Create the export dialog DOM element
 */
function createExportDialog() {
    exportDialogElement = document.createElement('div');
    exportDialogElement.id = 'export-dialog';
    exportDialogElement.className = 'export-dialog';
    exportDialogElement.innerHTML = `
        <div class="modal-overlay" id="export-overlay"></div>
        <div class="modal-content export-modal-content">
            <div class="modal-header">
                <h3>Export Canvas as Image</h3>
                <button id="export-dialog-close" class="modal-close">&times;</button>
            </div>
            <div class="modal-body export-modal-body">
                <div class="export-preview-container">
                    <div id="export-preview" class="export-preview">
                        <div class="export-preview-placeholder">Preview</div>
                    </div>
                    <div id="export-dimensions" class="export-dimensions">1920 × 1080</div>
                </div>

                <div class="export-options">
                    <div class="export-option-group">
                        <label class="export-label">Format</label>
                        <div class="export-format-buttons">
                            <button id="format-png" class="export-format-btn active" data-format="png">PNG</button>
                            <button id="format-jpg" class="export-format-btn" data-format="jpg">JPG</button>
                        </div>
                    </div>

                    <div class="export-option-group" id="quality-group">
                        <label class="export-label">Quality: <span id="quality-value">92</span>%</label>
                        <input type="range" id="export-quality" min="10" max="100" value="92" class="export-slider">
                    </div>

                    <div class="export-option-group">
                        <label class="export-label">Size</label>
                        <div class="export-size-buttons">
                            <button id="size-current" class="export-size-btn active" data-size="current">Current View</button>
                            <button id="size-fit" class="export-size-btn" data-size="fit">Fit All Elements</button>
                            <button id="size-custom" class="export-size-btn" data-size="custom">Custom</button>
                        </div>
                    </div>

                    <div class="export-option-group" id="custom-size-group" style="display: none;">
                        <div class="export-custom-size">
                            <input type="number" id="export-width" value="1920" min="100" max="8192" class="export-size-input">
                            <span class="export-size-x">×</span>
                            <input type="number" id="export-height" value="1080" min="100" max="8192" class="export-size-input">
                            <span class="export-size-unit">px</span>
                        </div>
                    </div>

                    <div class="export-option-group">
                        <label class="export-checkbox-label">
                            <input type="checkbox" id="export-background" checked>
                            <span>Include background</span>
                        </label>
                        <input type="color" id="export-bg-color" value="#ffffff" class="export-color-input">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="export-cancel" class="modal-button modal-cancel">Cancel</button>
                <button id="export-save" class="modal-button modal-ok">Export</button>
            </div>
            <div id="export-progress" class="export-progress" style="display: none;">
                <div class="export-progress-bar">
                    <div class="export-progress-fill"></div>
                </div>
                <span class="export-progress-text">Exporting...</span>
            </div>
        </div>
    `;
    document.body.appendChild(exportDialogElement);

    // Attach event listeners
    attachExportDialogListeners();
}

/**
 * Attach event listeners for export dialog
 */
function attachExportDialogListeners() {
    // Close button
    document.getElementById('export-dialog-close').addEventListener('click', hideExportDialog);
    document.getElementById('export-cancel').addEventListener('click', hideExportDialog);
    document.getElementById('export-overlay').addEventListener('click', hideExportDialog);

    // Export button
    document.getElementById('export-save').addEventListener('click', executeExport);

    // Format buttons
    document.querySelectorAll('.export-format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            exportSettings.format = btn.dataset.format;

            // Show/hide quality slider for JPG only
            const qualityGroup = document.getElementById('quality-group');
            if (exportSettings.format === 'jpg') {
                qualityGroup.style.display = 'block';
            } else {
                qualityGroup.style.display = 'none';
            }
        });
    });

    // Quality slider
    document.getElementById('export-quality').addEventListener('input', (e) => {
        exportSettings.quality = parseInt(e.target.value);
        document.getElementById('quality-value').textContent = exportSettings.quality;
    });

    // Size buttons
    document.querySelectorAll('.export-size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.export-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            exportSettings.sizeMode = btn.dataset.size;

            // Show/hide custom size inputs
            const customGroup = document.getElementById('custom-size-group');
            if (exportSettings.sizeMode === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }

            updateExportPreview();
        });
    });

    // Custom size inputs
    document.getElementById('export-width').addEventListener('input', (e) => {
        exportSettings.customWidth = parseInt(e.target.value) || 1920;
        updateExportPreview();
    });
    document.getElementById('export-height').addEventListener('input', (e) => {
        exportSettings.customHeight = parseInt(e.target.value) || 1080;
        updateExportPreview();
    });

    // Background options
    document.getElementById('export-background').addEventListener('change', (e) => {
        exportSettings.includeBackground = e.target.checked;
        document.getElementById('export-bg-color').disabled = !e.target.checked;
    });
    document.getElementById('export-bg-color').addEventListener('input', (e) => {
        exportSettings.backgroundColor = e.target.value;
    });

    // Keyboard escape to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && exportDialogElement.classList.contains('show')) {
            hideExportDialog();
        }
    });
}

/**
 * Attach keyboard shortcut for export (Ctrl/Cmd+Shift+E)
 */
function attachExportKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
        // Don't capture when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + Shift + E: Show export dialog
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            showExportDialog();
        }
    });
}

/**
 * Show the export dialog
 */
function showExportDialog() {
    if (!exportDialogElement) {
        createExportDialog();
    }

    // Reset to defaults
    exportSettings.format = 'png';
    exportSettings.quality = 92;
    exportSettings.sizeMode = 'current';
    exportSettings.includeBackground = true;

    // Update UI to match settings
    document.querySelectorAll('.export-format-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.format === exportSettings.format);
    });
    document.getElementById('quality-group').style.display = exportSettings.format === 'jpg' ? 'block' : 'none';
    document.getElementById('export-quality').value = exportSettings.quality;
    document.getElementById('quality-value').textContent = exportSettings.quality;

    document.querySelectorAll('.export-size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.size === exportSettings.sizeMode);
    });
    document.getElementById('custom-size-group').style.display = 'none';

    document.getElementById('export-background').checked = exportSettings.includeBackground;
    document.getElementById('export-bg-color').value = exportSettings.backgroundColor;

    // Update preview
    updateExportPreview();

    // Show dialog
    exportDialogElement.classList.add('show');
}

/**
 * Hide the export dialog
 */
function hideExportDialog() {
    if (exportDialogElement) {
        exportDialogElement.classList.remove('show');
    }
}

/**
 * Update the export preview with current dimensions
 */
function updateExportPreview() {
    const dims = getExportDimensions();
    document.getElementById('export-dimensions').textContent = `${dims.width} × ${dims.height} px`;
}

/**
 * Calculate export dimensions based on current settings
 */
function getExportDimensions() {
    const svgElement = document.querySelector('#canvas svg');
    if (!svgElement) {
        return { width: 1920, height: 1080 };
    }

    const viewBox = svgElement.getAttribute('viewBox');
    let viewBoxValues = { x: 0, y: 0, width: 1920, height: 1080 };

    if (viewBox) {
        const parts = viewBox.split(' ').map(Number);
        viewBoxValues = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }

    switch (exportSettings.sizeMode) {
        case 'current':
            return { width: Math.round(viewBoxValues.width), height: Math.round(viewBoxValues.height) };

        case 'fit':
            const bounds = calculateElementsBounds(svgElement);
            if (bounds) {
                const padding = 50; // Add some padding
                return {
                    width: Math.round(bounds.width + padding * 2),
                    height: Math.round(bounds.height + padding * 2)
                };
            }
            return { width: Math.round(viewBoxValues.width), height: Math.round(viewBoxValues.height) };

        case 'custom':
            return { width: exportSettings.customWidth, height: exportSettings.customHeight };

        default:
            return { width: Math.round(viewBoxValues.width), height: Math.round(viewBoxValues.height) };
    }
}

/**
 * Calculate the bounding box of all canvas elements
 * Uses consolidated bounds-utils module.
 */
function calculateElementsBounds(svgElement) {
    return window.boundsUtils.calculateBoundsFromSelector(svgElement, '.canvas-element');
}

/**
 * Execute the export with current settings
 */
async function executeExport() {
    const progressEl = document.getElementById('export-progress');
    const saveBtn = document.getElementById('export-save');

    try {
        // Show progress
        progressEl.style.display = 'flex';
        saveBtn.disabled = true;

        await exportCanvasToImage();

        // Hide dialog on success
        hideExportDialog();
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export canvas: ' + error.message);
    } finally {
        progressEl.style.display = 'none';
        saveBtn.disabled = false;
    }
}

/**
 * Export canvas to image with configurable settings
 * Uses exportSettings for format, quality, size, and background options
 */
async function exportCanvasToImage() {
    const canvasElement = document.getElementById('canvas');
    if (!canvasElement) {
        throw new Error('No canvas found to export');
    }

    const svgElement = canvasElement.querySelector('svg');
    if (!svgElement) {
        throw new Error('No content to export');
    }

    const isTauri = window.isTauriApp && window.isTauriApp();

    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);

    // Calculate dimensions based on export settings
    const dims = getExportDimensions();
    const { width, height } = dims;

    // Get the viewBox to understand coordinate system
    const viewBox = svgElement.getAttribute('viewBox');
    let viewBoxX = 0, viewBoxY = 0, viewBoxWidth = width, viewBoxHeight = height;

    if (viewBox) {
        const parts = viewBox.split(' ').map(Number);
        viewBoxX = parts[0];
        viewBoxY = parts[1];
        viewBoxWidth = parts[2];
        viewBoxHeight = parts[3];
    }

    // Handle different size modes
    if (exportSettings.sizeMode === 'fit') {
        const bounds = calculateElementsBounds(svgElement);
        if (bounds) {
            const padding = 50;
            // Update viewBox to fit all elements
            svgClone.setAttribute('viewBox', `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`);
        }
    } else if (exportSettings.sizeMode === 'custom') {
        // Keep current viewBox but scale to custom dimensions
        svgClone.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
    }

    // Set explicit dimensions for export
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);

    // Handle background
    if (exportSettings.includeBackground) {
        // Remove any existing background rect first
        const existingBg = svgClone.querySelector('.export-background-rect');
        if (existingBg) {
            existingBg.remove();
        }

        // Get the viewBox of the clone for proper background sizing
        const cloneViewBox = svgClone.getAttribute('viewBox');
        const vbParts = cloneViewBox ? cloneViewBox.split(' ').map(Number) : [0, 0, width, height];

        const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        backgroundRect.setAttribute('class', 'export-background-rect');
        backgroundRect.setAttribute('x', vbParts[0]);
        backgroundRect.setAttribute('y', vbParts[1]);
        backgroundRect.setAttribute('width', vbParts[2]);
        backgroundRect.setAttribute('height', vbParts[3]);
        backgroundRect.setAttribute('fill', exportSettings.backgroundColor);
        svgClone.insertBefore(backgroundRect, svgClone.firstChild);
    }

    // Remove selection handles and other UI elements from export
    const uiElements = svgClone.querySelectorAll('.resize-handles, .selection-outline, .grid-pattern');
    uiElements.forEach(el => el.remove());

    // Convert external images to embedded data URLs
    // In Tauri, images are served from local filesystem, need to embed them
    await embedImagesInSVGForExport(svgClone);

    // Create a blob from the SVG
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Determine format and filename
    const format = exportSettings.format;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpg' ? 'jpg' : 'png';
    const filename = `vision-board-${getCurrentCanvasName()}.${extension}`;

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
            try {
                // Create a canvas for conversion
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Handle high-DPI displays - use scale factor
                const scale = window.devicePixelRatio || 1;
                const scaledWidth = width * scale;
                const scaledHeight = height * scale;

                // Set canvas dimensions (for high-DPI)
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;

                // Scale context for high-DPI
                ctx.scale(scale, scale);

                // For JPG format, we need to fill with background color first (no transparency)
                if (format === 'jpg') {
                    ctx.fillStyle = exportSettings.includeBackground ? exportSettings.backgroundColor : '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                }

                // Draw the image onto the canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to image format
                const quality = format === 'jpg' ? exportSettings.quality / 100 : undefined;

                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create image blob'));
                        return;
                    }

                    if (isTauri && window.__TAURI__.dialog) {
                        // Use Tauri's save dialog
                        try {
                            const filePath = await window.__TAURI__.dialog.save({
                                defaultPath: filename,
                                filters: [{
                                    name: format === 'jpg' ? 'JPEG Image' : 'PNG Image',
                                    extensions: [extension]
                                }]
                            });

                            if (filePath) {
                                const arrayBuffer = await blob.arrayBuffer();
                                const bytes = new Uint8Array(arrayBuffer);
                                await window.__TAURI__.fs.writeBinaryFile(filePath, bytes);
                            }
                        } catch (error) {
                            console.error('Tauri save error:', error);
                            // Fall back to browser download
                            downloadBinaryFile(blob, filename, mimeType);
                        }
                    } else {
                        // Use browser download
                        downloadBinaryFile(blob, filename, mimeType);
                    }

                    // Clean up
                    URL.revokeObjectURL(svgUrl);
                    resolve();
                }, mimeType, quality);
            } catch (error) {
                URL.revokeObjectURL(svgUrl);
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('Failed to load SVG for conversion'));
        };

        img.src = svgUrl;
    });
}

/**
 * Legacy function for quick PNG export without dialog
 */
async function exportCanvasToPNG() {
    // Set defaults for quick export
    exportSettings.format = 'png';
    exportSettings.sizeMode = 'current';
    exportSettings.includeBackground = true;
    exportSettings.backgroundColor = '#ffffff';

    try {
        await exportCanvasToImage();
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export canvas: ' + error.message);
    }
}

/**
 * Embed images in SVG for export (handles both URLs and Tauri paths)
 */
async function embedImagesInSVGForExport(svgElement) {
    const images = svgElement.querySelectorAll('image');
    const promises = Array.from(images).map(async (img) => {
        const href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (href && !href.startsWith('data:')) {
            try {
                const dataUrl = await convertImageToDataUrl(href);
                img.setAttribute('href', dataUrl);
                img.removeAttribute('xlink:href');
            } catch (error) {
                console.warn('Failed to embed image:', href, error);
            }
        }
    });

    await Promise.all(promises);
}

/**
 * Convert an image URL to a data URL
 * Handles both web URLs and Tauri asset:// URLs
 */
function convertImageToDataUrl(url) {
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

        if (isTauri && window.__TAURI__.dialog) {
            // Use Tauri's save dialog
            try {
                const filePath = await window.__TAURI__.dialog.save({
                    defaultPath: filename,
                    filters: [{
                        name: 'JSON',
                        extensions: ['json']
                    }]
                });

                if (filePath) {
                    await window.__TAURI__.fs.writeTextFile(filePath, jsonString);
                    // No alert needed - user picked the location via dialog
                }
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
window.exportCanvasToImage = exportCanvasToImage;
window.exportCanvasToJSON = exportCanvasToJSON;
window.importCanvasFromJSON = importCanvasFromJSON;
window.exportTreeToOPML = exportTreeToOPML;
window.importTreeFromOPML = importTreeFromOPML;
window.generateUniqueId = generateUniqueId;
window.generateUniqueCanvasName = generateUniqueCanvasName;
window.validateImportData = validateImportData;
window.createCanvasFromImport = createCanvasFromImport;
window.initializeExport = initializeExport;
window.showExportDialog = showExportDialog;
window.hideExportDialog = hideExportDialog;