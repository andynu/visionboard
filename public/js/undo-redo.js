// Undo/Redo functionality for canvas operations
// Uses a command pattern with state snapshots for reversible operations

const undoRedoManager = (function() {
    const MAX_HISTORY_SIZE = 50;

    let undoStack = [];
    let redoStack = [];
    let isPerformingUndoRedo = false;

    // Capture current canvas state as a snapshot
    function captureState() {
        if (!window.currentCanvas) return null;

        // Deep clone the elements array
        return {
            elements: JSON.parse(JSON.stringify(window.currentCanvas.elements || [])),
            timestamp: Date.now()
        };
    }

    // Apply a state snapshot to the canvas
    async function applyState(state) {
        if (!window.currentCanvas || !state) return;

        isPerformingUndoRedo = true;

        // Update canvas data
        window.currentCanvas.elements = JSON.parse(JSON.stringify(state.elements));

        // Re-render the canvas
        if (window.canvasCore && window.canvasCore.renderCanvas) {
            await window.canvasCore.renderCanvas();
        }

        // Save to server (silent, no notification needed)
        if (window.canvasCore && window.canvasCore.saveCanvas) {
            await window.canvasCore.saveCanvas();
        }

        isPerformingUndoRedo = false;
        updateButtonStates();
    }

    // Record a state change (call before making changes)
    function recordState() {
        if (isPerformingUndoRedo) return;

        const state = captureState();
        if (!state) return;

        // Check if this state is different from the last recorded state
        if (undoStack.length > 0) {
            const lastState = undoStack[undoStack.length - 1];
            if (JSON.stringify(lastState.elements) === JSON.stringify(state.elements)) {
                return; // No change, don't record
            }
        }

        undoStack.push(state);

        // Limit stack size
        if (undoStack.length > MAX_HISTORY_SIZE) {
            undoStack.shift();
        }

        // Clear redo stack when new action is performed
        redoStack = [];

        updateButtonStates();
    }

    // Undo the last action
    async function undo() {
        if (undoStack.length === 0) return;

        // Save current state to redo stack
        const currentState = captureState();
        if (currentState) {
            redoStack.push(currentState);
        }

        // Pop and apply previous state
        const previousState = undoStack.pop();
        await applyState(previousState);

        showUndoRedoNotification('Undo');
    }

    // Redo the last undone action
    async function redo() {
        if (redoStack.length === 0) return;

        // Save current state to undo stack
        const currentState = captureState();
        if (currentState) {
            undoStack.push(currentState);
        }

        // Pop and apply redo state
        const redoState = redoStack.pop();
        await applyState(redoState);

        showUndoRedoNotification('Redo');
    }

    // Clear history (e.g., when switching canvases)
    function clearHistory() {
        undoStack = [];
        redoStack = [];
        updateButtonStates();
    }

    // Check if undo is available
    function canUndo() {
        return undoStack.length > 0;
    }

    // Check if redo is available
    function canRedo() {
        return redoStack.length > 0;
    }

    // Update UI button states
    function updateButtonStates() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = !canUndo();
            undoBtn.classList.toggle('disabled', !canUndo());
        }

        if (redoBtn) {
            redoBtn.disabled = !canRedo();
            redoBtn.classList.toggle('disabled', !canRedo());
        }
    }

    // Note: uses shared showNotification from notification.js with shorter timeout for undo/redo
    function showUndoRedoNotification(message) {
        showNotification(message, {timeout: 800});
    }

    // Initialize keyboard shortcuts
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Don't capture when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+Z / Cmd+Z for undo
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            }

            // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y for redo
            if ((event.ctrlKey || event.metaKey) &&
                ((event.key === 'z' && event.shiftKey) || event.key === 'y')) {
                event.preventDefault();
                redo();
            }
        });
    }

    // Initialize button handlers
    function initButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.addEventListener('click', undo);
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', redo);
        }

        updateButtonStates();
    }

    // Initialize the undo/redo system
    function init() {
        initKeyboardShortcuts();
        initButtons();
    }

    // Auto-initialize when DOM is ready
    onReady(init);

    // Public API
    return {
        recordState,
        undo,
        redo,
        clearHistory,
        canUndo,
        canRedo,
        init
    };
})();

// Export globally
window.undoRedoManager = undoRedoManager;
