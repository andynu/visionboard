// Element notes for Vision Board
// Allows attaching text notes to individual elements

let noteEditorModal = null;
let currentNoteElement = null;

/**
 * Initialize the notes system
 */
function initializeElementNotes() {
    createNoteEditorModal();
}

/**
 * Create the note editor modal DOM
 */
function createNoteEditorModal() {
    noteEditorModal = document.createElement('div');
    noteEditorModal.id = 'note-editor-modal';
    noteEditorModal.className = 'note-editor-modal';
    noteEditorModal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>Element Note</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <textarea id="note-textarea" class="note-textarea" placeholder="Add a note to this element..."></textarea>
            </div>
            <div class="modal-footer">
                <button id="note-delete" class="modal-button modal-delete">Delete Note</button>
                <button id="note-cancel" class="modal-button modal-cancel">Cancel</button>
                <button id="note-save" class="modal-button modal-ok">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(noteEditorModal);

    // Attach event listeners
    noteEditorModal.querySelector('.modal-close').addEventListener('click', closeNoteEditor);
    noteEditorModal.querySelector('.modal-overlay').addEventListener('click', closeNoteEditor);
    noteEditorModal.querySelector('#note-cancel').addEventListener('click', closeNoteEditor);
    noteEditorModal.querySelector('#note-save').addEventListener('click', saveNote);
    noteEditorModal.querySelector('#note-delete').addEventListener('click', deleteNote);

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && noteEditorModal.classList.contains('visible')) {
            closeNoteEditor();
        }
    });
}

/**
 * Open the note editor for an element
 * @param {Object} svgElement - SVG.js element
 */
function openNoteEditor(svgElement) {
    if (!noteEditorModal || !svgElement) return;

    currentNoteElement = svgElement;
    const elementData = svgElement.data('elementData');
    const existingNote = elementData?.note || '';

    const textarea = noteEditorModal.querySelector('#note-textarea');
    textarea.value = existingNote;

    // Show/hide delete button based on whether note exists
    const deleteBtn = noteEditorModal.querySelector('#note-delete');
    deleteBtn.style.display = existingNote ? 'block' : 'none';

    noteEditorModal.classList.add('visible');
    textarea.focus();
}

/**
 * Close the note editor
 */
function closeNoteEditor() {
    if (noteEditorModal) {
        noteEditorModal.classList.remove('visible');
    }
    currentNoteElement = null;
}

/**
 * Save the note to the element
 */
function saveNote() {
    if (!currentNoteElement) return;

    const textarea = noteEditorModal.querySelector('#note-textarea');
    const noteText = textarea.value.trim();

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    // Get element data
    const elementData = currentNoteElement.data('elementData');
    if (elementData) {
        if (noteText) {
            elementData.note = noteText;
        } else {
            delete elementData.note;
        }
        currentNoteElement.data('elementData', elementData);

        // Update note indicator
        updateNoteIndicator(currentNoteElement);

        // Trigger auto-save
        if (window.canvasCore && window.canvasCore.scheduleAutoSave) {
            window.canvasCore.scheduleAutoSave();
        }

        // Update layers panel if open
        if (window.layersPanel && window.layersPanel.refresh) {
            window.layersPanel.refresh();
        }

        showNotification(noteText ? 'Note saved' : 'Note removed');
    }

    closeNoteEditor();
}

/**
 * Delete the note from the element
 */
function deleteNote() {
    if (!currentNoteElement) return;

    // Record state for undo
    if (window.undoRedoManager) {
        window.undoRedoManager.recordState();
    }

    const elementData = currentNoteElement.data('elementData');
    if (elementData) {
        delete elementData.note;
        currentNoteElement.data('elementData', elementData);

        // Update note indicator
        updateNoteIndicator(currentNoteElement);

        // Trigger auto-save
        if (window.canvasCore && window.canvasCore.scheduleAutoSave) {
            window.canvasCore.scheduleAutoSave();
        }

        showNotification('Note deleted');
    }

    closeNoteEditor();
}

/**
 * Check if an element has a note
 * @param {Object} svgElement - SVG.js element
 * @returns {boolean}
 */
function hasNote(svgElement) {
    if (!svgElement) return false;
    const elementData = svgElement.data('elementData');
    return !!(elementData && elementData.note);
}

/**
 * Get the note text for an element
 * @param {Object} svgElement - SVG.js element
 * @returns {string|null}
 */
function getNote(svgElement) {
    if (!svgElement) return null;
    const elementData = svgElement.data('elementData');
    return elementData?.note || null;
}

/**
 * Update the note indicator icon for an element
 * @param {Object} svgElement - SVG.js element
 */
function updateNoteIndicator(svgElement) {
    if (!svgElement || !svgElement.node) return;

    const elementId = svgElement.attr('id');
    const indicatorId = `note-indicator-${elementId}`;

    // Remove existing indicator
    const existingIndicator = document.getElementById(indicatorId);
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Only add indicator if element has a note
    if (!hasNote(svgElement)) return;

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.id = indicatorId;
    indicator.className = 'note-indicator';
    indicator.innerHTML = '<i class="fas fa-sticky-note"></i>';
    indicator.title = 'This element has a note. Click to view/edit.';

    // Position indicator
    positionNoteIndicator(svgElement, indicator);

    // Add click handler
    indicator.addEventListener('click', (e) => {
        e.stopPropagation();
        openNoteEditor(svgElement);
    });

    // Add to canvas container
    const canvasContainer = document.querySelector('.canvas-container');
    if (canvasContainer) {
        canvasContainer.appendChild(indicator);
    }
}

/**
 * Position the note indicator relative to an element
 * @param {Object} svgElement - SVG.js element
 * @param {HTMLElement} indicator - The indicator DOM element
 */
function positionNoteIndicator(svgElement, indicator) {
    if (!svgElement || !indicator) return;

    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas || !canvas.node) return;

    // Get element bounding box in screen coordinates
    const elementNode = svgElement.node;
    const bbox = elementNode.getBoundingClientRect();
    const containerRect = document.querySelector('.canvas-container').getBoundingClientRect();

    // Position at top-right corner of element
    const left = bbox.right - containerRect.left - 20;
    const top = bbox.top - containerRect.top + 4;

    indicator.style.left = `${left}px`;
    indicator.style.top = `${top}px`;
}

/**
 * Update all note indicators (call after zoom/pan)
 */
function updateAllNoteIndicators() {
    const canvas = window.canvasCore?.getCanvas?.();
    if (!canvas) return;

    canvas.children().forEach(child => {
        if (child.node && child.node.classList.contains('canvas-element')) {
            if (hasNote(child)) {
                updateNoteIndicator(child);
            }
        }
    });
}

/**
 * Remove all note indicators (call before canvas reload)
 */
function clearAllNoteIndicators() {
    const indicators = document.querySelectorAll('.note-indicator');
    indicators.forEach(ind => ind.remove());
}

/**
 * Attach note functionality to an element
 * @param {Object} svgElement - SVG.js element
 */
function attachNoteHandlers(svgElement) {
    // Add note indicator if element has a note
    if (hasNote(svgElement)) {
        updateNoteIndicator(svgElement);
    }
}

// Note: showNotification is provided by notification.js

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeElementNotes);
} else {
    initializeElementNotes();
}

// Listen for zoom/pan changes to update indicator positions
window.addEventListener('viewBoxChanged', updateAllNoteIndicators);
window.addEventListener('resize', updateAllNoteIndicators);

// Export for use by other modules
window.elementNotes = {
    openEditor: openNoteEditor,
    hasNote,
    getNote,
    updateIndicator: updateNoteIndicator,
    updateAllIndicators: updateAllNoteIndicators,
    clearAllIndicators: clearAllNoteIndicators,
    attachHandlers: attachNoteHandlers
};
