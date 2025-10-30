// Console logger - intercepts console methods and sends logs to Tauri backend
(function() {
    'use strict';

    // Check if we're running in Tauri
    const isTauri = typeof window !== 'undefined' && window.__TAURI__;
    const invoke = isTauri ? window.__TAURI__.core.invoke : null;

    if (!isTauri) {
        console.log('Not running in Tauri - console logging to file disabled');
        return;
    }

    // Store original console methods
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };

    // Helper to format arguments into a single string
    function formatArgs(...args) {
        return args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    // Override console methods to send to Tauri
    console.log = function(...args) {
        const message = formatArgs(...args);
        originalConsole.log(...args);
        invoke('log_info', { message }).catch(err => {
            originalConsole.error('Failed to send log to backend:', err);
        });
    };

    console.info = function(...args) {
        const message = formatArgs(...args);
        originalConsole.info(...args);
        invoke('log_info', { message }).catch(err => {
            originalConsole.error('Failed to send log to backend:', err);
        });
    };

    console.warn = function(...args) {
        const message = formatArgs(...args);
        originalConsole.warn(...args);
        invoke('log_warn', { message }).catch(err => {
            originalConsole.error('Failed to send log to backend:', err);
        });
    };

    console.error = function(...args) {
        const message = formatArgs(...args);
        originalConsole.error(...args);
        invoke('log_error', { message }).catch(err => {
            originalConsole.error('Failed to send log to backend:', err);
        });
    };

    // Handle unhandled errors and rejections
    window.addEventListener('error', (event) => {
        const message = `Unhandled error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
        invoke('log_error', { message }).catch(() => {});
    });

    window.addEventListener('unhandledrejection', (event) => {
        const message = `Unhandled promise rejection: ${event.reason}`;
        invoke('log_error', { message }).catch(() => {});
    });

    originalConsole.log('Console logger initialized - logs will be written to tauri.log');
})();
