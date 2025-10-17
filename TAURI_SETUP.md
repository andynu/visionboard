# Tauri Integration for VisionBoard

This document describes the Tauri desktop application setup for VisionBoard.

## Overview

VisionBoard has been successfully wrapped as a Tauri application, providing a native desktop experience with the following benefits:

- **Native Desktop App**: Runs as a standalone application without requiring a separate server
- **File System Integration**: Direct access to the file system for storing canvases and images
- **Cross-Platform**: Can be built for Linux, macOS, and Windows
- **Smaller Resource Footprint**: No Node.js server required at runtime

## Architecture

### Backend (Rust)

Location: `src-tauri/src/lib.rs`

The Tauri backend provides the following commands:

- **Canvas Management**:
  - `get_canvas(id)` - Load a canvas by ID
  - `create_canvas(name, parent_id)` - Create a new canvas
  - `update_canvas(id, canvas_data)` - Update canvas data
  - `delete_canvas(id)` - Delete a canvas

- **Tree Management**:
  - `get_tree()` - Get the full canvas hierarchy
  - `update_tree(tree_data)` - Update the tree structure

- **Image Management**:
  - `save_image(filename, data)` - Save an uploaded image
  - `get_image_path(filename)` - Get the filesystem path for an image

### Frontend (JavaScript)

Location: `public/js/api-adapter.js`

The API adapter provides a unified interface that works with both:
- Tauri backend (using `window.__TAURI__.core.invoke`)
- Express backend (using `fetch` API calls)

This allows the same frontend code to work in both environments.

### Data Storage

- **Development Mode**: Data stored in Tauri's app data directory
  - Linux: `~/.local/share/com.visionboard.app/storage/`
  - macOS: `~/Library/Application Support/com.visionboard.app/storage/`
  - Windows: `%APPDATA%\com.visionboard.app\storage\`

- **Directory Structure**:
  ```
  storage/
  ├── canvases/     # Canvas JSON files
  ├── images/       # Uploaded images (UUID filenames)
  └── tree.json     # Canvas hierarchy
  ```

## Development

### Prerequisites

- Rust (latest stable) - Install from https://rustup.rs/
- Node.js and npm
- Platform-specific dependencies:
  - **Linux**: `sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode command line tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools

### Running in Development Mode

```bash
npm run tauri:dev
```

This will:
1. Build the Rust backend
2. Launch the Tauri window with the VisionBoard frontend
3. Enable hot-reload for frontend changes
4. Provide dev tools for debugging

### Building for Production

```bash
npm run tauri:build
```

This creates platform-specific installers in `src-tauri/target/release/bundle/`

## Migration from Express Server

The following changes were made to support Tauri:

1. **Backend Replacement**: Express routes replaced with Tauri commands
2. **API Adapter**: Created `api-adapter.js` to provide unified API
3. **Frontend Updates**: Modified `canvas.js`, `drag-drop.js`, and `tree-nav.js` to use API adapter
4. **Configuration**: Updated `tauri.conf.json` for standalone operation

### Maintaining Express Compatibility

The Express server (`server/app.js`) is still available and can be used by running:

```bash
npm start
```

The API adapter automatically detects the environment and uses the appropriate backend.

## Troubleshooting

### "Tauri API not available" errors

This means the frontend is trying to use Tauri commands but running in a browser with the Express server. Either:
- Run `npm run tauri:dev` instead of `npm start`
- Or the app will fallback to Express API calls

### File permission errors

Tauri apps have restricted file system access by default. The app only has access to:
- App data directory (automatically created)
- User-selected files through file dialogs

### Build errors

If you encounter build errors:
1. Ensure all system dependencies are installed
2. Run `cargo clean` in `src-tauri/` and try again
3. Check Tauri documentation for platform-specific issues: https://v2.tauri.app/

## Future Enhancements

Potential improvements for the Tauri app:

- [ ] Custom app icon
- [ ] Auto-update functionality
- [ ] System tray integration
- [ ] Native file picker dialogs
- [ ] Keyboard shortcuts
- [ ] Export to native image formats
- [ ] macOS and Windows builds
