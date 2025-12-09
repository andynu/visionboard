// Keyboard shortcuts help overlay
// Press ? to show/hide the help overlay

const keyboardHelp = (function() {
    let helpOverlay = null;

    // Define all keyboard shortcuts
    const shortcuts = [
        { category: 'Navigation', items: [
            { keys: '?', description: 'Show/hide this help' },
            { keys: 'Esc', description: 'Close dialogs / deselect' },
        ]},
        { category: 'Tools', items: [
            { keys: 'H', description: 'Hand/Select tool' },
            { keys: 'R', description: 'Rectangle tool' },
            { keys: 'L', description: 'Line tool' },
            { keys: 'F', description: 'Freehand tool' },
        ]},
        { category: 'Editing', items: [
            { keys: 'Ctrl+Z', description: 'Undo' },
            { keys: 'Ctrl+Shift+Z', description: 'Redo' },
            { keys: 'Ctrl+C', description: 'Copy selected elements' },
            { keys: 'Ctrl+X', description: 'Cut selected elements' },
            { keys: 'Ctrl+V', description: 'Paste elements/images' },
            { keys: 'Ctrl+D', description: 'Duplicate selection' },
            { keys: 'Delete', description: 'Delete selected elements' },
        ]},
        { category: 'Arrange', items: [
            { keys: 'Ctrl+]', description: 'Bring forward' },
            { keys: 'Ctrl+Shift+]', description: 'Bring to front' },
            { keys: 'Ctrl+[', description: 'Send backward' },
            { keys: 'Ctrl+Shift+[', description: 'Send to back' },
        ]},
        { category: 'Canvas', items: [
            { keys: 'Mouse wheel', description: 'Zoom in/out' },
            { keys: 'Click + drag', description: 'Pan canvas' },
            { keys: 'Middle click + drag', description: 'Pan canvas (over elements)' },
            { keys: 'Ctrl+0', description: 'Zoom to fit all' },
            { keys: 'Ctrl+1', description: 'Zoom to 100%' },
            { keys: 'Ctrl+2', description: 'Zoom to selection' },
            { keys: 'G', description: 'Toggle grid visibility' },
            { keys: 'S', description: 'Toggle snap to grid' },
            { keys: 'Ctrl+R', description: 'Toggle rulers and guides' },
            { keys: 'Shift+L', description: 'Toggle layers panel' },
        ]},
        { category: 'Accessibility', items: [
            { keys: 'Ctrl+Shift+=', description: 'Cycle toolbar scale (1x/1.5x/2x)' },
        ]},
        { category: 'Selection', items: [
            { keys: 'Click', description: 'Select element' },
            { keys: 'Shift+Click', description: 'Add to selection' },
            { keys: 'Ctrl+Click', description: 'Toggle selection' },
            { keys: 'Ctrl+A', description: 'Select all elements' },
            { keys: 'Escape', description: 'Deselect all' },
            { keys: 'Double-click folder', description: 'Navigate to folder canvas' },
        ]},
        { category: 'Grouping', items: [
            { keys: 'Ctrl+G', description: 'Group selected elements' },
            { keys: 'Ctrl+Shift+G', description: 'Ungroup' },
            { keys: 'Ctrl+L', description: 'Lock/unlock selected' },
        ]},
        { category: 'Filters', items: [
            { keys: 'Alt+S', description: 'Toggle sepia' },
        ]},
        { category: 'Transform', items: [
            { keys: 'Ctrl+Shift+H', description: 'Flip horizontal' },
            { keys: 'Alt+V', description: 'Flip vertical' },
        ]},
        { category: 'Export', items: [
            { keys: 'Ctrl+Shift+E', description: 'Export as image...' },
        ]},
    ];

    function createOverlay() {
        // Create overlay container
        helpOverlay = document.createElement('div');
        helpOverlay.id = 'keyboard-help-overlay';
        helpOverlay.className = 'keyboard-help-overlay';
        helpOverlay.innerHTML = `
            <div class="keyboard-help-modal">
                <div class="keyboard-help-header">
                    <h2>Keyboard Shortcuts</h2>
                    <button class="keyboard-help-close" title="Close">&times;</button>
                </div>
                <div class="keyboard-help-content">
                    ${shortcuts.map(category => `
                        <div class="keyboard-help-category">
                            <h3>${category.category}</h3>
                            <ul>
                                ${category.items.map(item => `
                                    <li>
                                        <span class="keyboard-help-keys">${item.keys}</span>
                                        <span class="keyboard-help-desc">${item.description}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                <div class="keyboard-help-footer">
                    Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
                </div>
            </div>
        `;

        document.body.appendChild(helpOverlay);

        // Add event listeners
        helpOverlay.querySelector('.keyboard-help-close').addEventListener('click', hide);
        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                hide();
            }
        });
    }

    function show() {
        if (!helpOverlay) {
            createOverlay();
        }
        helpOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function hide() {
        if (helpOverlay) {
            helpOverlay.classList.remove('visible');
            document.body.style.overflow = '';
        }
    }

    function toggle() {
        if (helpOverlay && helpOverlay.classList.contains('visible')) {
            hide();
        } else {
            show();
        }
    }

    function isVisible() {
        return helpOverlay && helpOverlay.classList.contains('visible');
    }

    // Initialize keyboard listener
    function init() {
        document.addEventListener('keydown', (event) => {
            // Don't capture when typing in inputs
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // ? key to toggle help
            if (event.key === '?' || (event.shiftKey && event.key === '/')) {
                event.preventDefault();
                toggle();
            }

            // Escape to close help
            if (event.key === 'Escape' && isVisible()) {
                event.preventDefault();
                hide();
            }
        });

        // Help button click handler
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', toggle);
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API
    return {
        show,
        hide,
        toggle,
        isVisible
    };
})();

// Export globally
window.keyboardHelp = keyboardHelp;
