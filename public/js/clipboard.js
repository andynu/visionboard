// Clipboard functionality for copy/paste of canvas elements
// Uses an internal clipboard for complex elements (images, folders, rectangles)

const clipboardManager = (function() {
    let clipboard = [];
    let copySource = null; // Track which canvas the elements were copied from

    // Copy selected elements to clipboard
    function copy() {
        const selectedElements = window.selectionAPI.getSelectedElements();
        if (selectedElements.length === 0) return false;

        clipboard = [];
        copySource = window.currentCanvas ? window.currentCanvas.id : null;

        selectedElements.forEach(element => {
            const elementData = element.data('elementData');
            if (elementData) {
                // Deep clone the element data
                clipboard.push(JSON.parse(JSON.stringify(elementData)));
            }
        });

        showNotification(`Copied ${clipboard.length} element${clipboard.length > 1 ? 's' : ''}`);
        return clipboard.length > 0;
    }

    // Cut selected elements (copy + delete)
    function cut() {
        const count = window.selectionAPI.getSelectionCount();
        if (count === 0) return false;

        if (copy()) {
            window.canvasCore.deleteSelectedElement();
            showNotification(`Cut ${count} element${count > 1 ? 's' : ''}`);
            return true;
        }
        return false;
    }

    // Paste elements from clipboard
    function paste() {
        if (clipboard.length === 0) {
            showNotification('Nothing to paste', 'info');
            return false;
        }

        // Record state before modification for undo
        if (window.undoRedoManager) {
            window.undoRedoManager.recordState();
        }

        const canvas = window.canvas;
        const currentCanvas = window.currentCanvas;

        // Calculate paste offset (offset from original position or at mouse location)
        let pasteOffsetX = 20;
        let pasteOffsetY = 20;

        // If we're pasting to the same canvas, use a small offset
        // If pasting to a different canvas, position relative to mouse or center
        const isSameCanvas = copySource === currentCanvas.id;

        if (!isSameCanvas && window.lastMousePosition) {
            // Get canvas coordinates from mouse position
            const canvasContainer = document.getElementById('canvas');
            const svg = canvas.node;
            const pt = svg.createSVGPoint();
            pt.x = window.lastMousePosition.x;
            pt.y = window.lastMousePosition.y;
            const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

            // Calculate the bounding box of copied elements
            const minX = Math.min(...clipboard.map(el => el.x));
            const minY = Math.min(...clipboard.map(el => el.y));

            // Offset to position elements relative to mouse cursor
            pasteOffsetX = svgPt.x - minX;
            pasteOffsetY = svgPt.y - minY;
        }

        const pastedElements = [];

        clipboard.forEach(elementData => {
            // Create a new element with a new ID
            const newElement = {
                ...elementData,
                id: window.canvasCore.generateId(),
                x: elementData.x + pasteOffsetX,
                y: elementData.y + pasteOffsetY,
                zIndex: currentCanvas.elements.length + 1
            };

            // Handle folder elements specially - we copy the visual representation
            // but don't create a new linked canvas
            if (newElement.type === 'folder') {
                // Keep the same target canvas - the folder becomes a link to the same child canvas
                // Alternatively, we could skip the targetCanvasId if we don't want to copy folder links
            }

            // Add to current canvas
            currentCanvas.elements.push(newElement);

            // Add to SVG canvas
            let svgElement;
            if (newElement.type === 'image') {
                // Async - addImageToCanvas handles Tauri image paths
                window.elementsAPI.addImageToCanvas(newElement, canvas, currentCanvas).then(el => {
                    pastedElements.push(el);
                });
            } else if (newElement.type === 'folder') {
                svgElement = window.elementsAPI.addFolderToCanvas(newElement, canvas, currentCanvas);
                pastedElements.push(svgElement);
            } else if (newElement.type === 'rectangle') {
                svgElement = window.elementsAPI.addRectangleToCanvas(newElement, canvas, currentCanvas);
                pastedElements.push(svgElement);
            }
        });

        // Select pasted elements after a brief delay (to allow async image loading)
        setTimeout(() => {
            if (pastedElements.length > 0) {
                window.selectionAPI.selectElements(pastedElements, canvas);
            }
        }, 100);

        // Trigger auto-save
        window.canvasCore.scheduleAutoSave();

        // Hide drop zone
        window.canvasCore.hideDropZoneIfNeeded();

        showNotification(`Pasted ${clipboard.length} element${clipboard.length > 1 ? 's' : ''}`);
        return true;
    }

    // Check if clipboard has content
    function hasContent() {
        return clipboard.length > 0;
    }

    // Get clipboard content count
    function getCount() {
        return clipboard.length;
    }

    // Clear clipboard
    function clear() {
        clipboard = [];
        copySource = null;
    }

    // Show brief notification
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('autosave-notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = 'autosave-notification';

        if (type === 'info') {
            notification.style.background = '#9E9E9E';
        } else {
            notification.style.background = '#2196F3';
        }

        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 1200);
    }

    // Initialize keyboard shortcuts
    function init() {
        document.addEventListener('keydown', (event) => {
            // Don't capture when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+C / Cmd+C for copy
            if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey) {
                // Only handle if we have selected elements (let browser handle text selection)
                if (window.selectionAPI.getSelectionCount() > 0) {
                    event.preventDefault();
                    copy();
                }
            }

            // Ctrl+X / Cmd+X for cut
            if ((event.ctrlKey || event.metaKey) && event.key === 'x' && !event.shiftKey) {
                if (window.selectionAPI.getSelectionCount() > 0) {
                    event.preventDefault();
                    cut();
                }
            }

            // Ctrl+V / Cmd+V for paste (element paste only if clipboard has content)
            // Note: The existing paste handler in drag-drop.js handles image paste from system clipboard
            if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !event.shiftKey) {
                if (hasContent()) {
                    event.preventDefault();
                    paste();
                }
                // If no internal clipboard content, let it bubble up for image paste handling
            }

            // Ctrl+D / Cmd+D for duplicate (copy + paste in place)
            if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                if (window.selectionAPI.getSelectionCount() > 0) {
                    event.preventDefault();
                    copy();
                    paste();
                }
            }
        });
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        copy,
        cut,
        paste,
        hasContent,
        getCount,
        clear,
        init
    };
})();

// Export globally
window.clipboardManager = clipboardManager;
