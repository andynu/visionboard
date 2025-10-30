use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ViewBox {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Canvas {
    version: String,
    id: String,
    name: String,
    #[serde(rename = "parentId")]
    parent_id: Option<String>,
    created: String,
    modified: String,
    #[serde(rename = "viewBox")]
    view_box: ViewBox,
    elements: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct TreeNode {
    name: String,
    children: Vec<String>,
    parent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TreeStructure {
    #[serde(rename = "rootCanvases")]
    root_canvases: Vec<String>,
    canvases: std::collections::HashMap<String, TreeNode>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UploadedFile {
    filename: String,
    #[serde(rename = "originalName")]
    original_name: String,
    size: u64,
    path: String,
}

// Helper function to get storage paths
fn get_storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))
        .map(|mut path| {
            path.push("storage");
            path
        })
}

fn get_canvases_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = get_storage_dir(app)?;
    path.push("canvases");
    Ok(path)
}

fn get_images_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = get_storage_dir(app)?;
    path.push("images");
    Ok(path)
}

fn get_tree_file(app: &AppHandle) -> Result<PathBuf, String> {
    let mut path = get_storage_dir(app)?;
    path.push("tree.json");
    Ok(path)
}

fn ensure_storage_directories(app: &AppHandle) -> Result<(), String> {
    let canvases_dir = get_canvases_dir(app)?;
    let images_dir = get_images_dir(app)?;

    fs::create_dir_all(&canvases_dir)
        .map_err(|e| format!("Failed to create canvases directory: {}", e))?;
    fs::create_dir_all(&images_dir)
        .map_err(|e| format!("Failed to create images directory: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_canvas(app: AppHandle, id: String) -> Result<Canvas, String> {
    let mut canvas_path = get_canvases_dir(&app)?;
    canvas_path.push(format!("{}.json", id));

    let content = fs::read_to_string(&canvas_path)
        .map_err(|_| "Canvas not found".to_string())?;

    let mut canvas: Canvas = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse canvas: {}", e))?;

    // Migration: Add version if missing
    if canvas.version.is_empty() {
        canvas.version = "1.0.0".to_string();
        canvas.modified = chrono::Utc::now().to_rfc3339();

        // Save the migrated canvas
        let content = serde_json::to_string_pretty(&canvas)
            .map_err(|e| format!("Failed to serialize canvas: {}", e))?;
        fs::write(&canvas_path, content)
            .map_err(|e| format!("Failed to save canvas: {}", e))?;
    }

    Ok(canvas)
}

#[tauri::command]
fn create_canvas(app: AppHandle, name: Option<String>, parent_id: Option<String>) -> Result<Canvas, String> {
    ensure_storage_directories(&app)?;

    let canvas = Canvas {
        version: "1.0.0".to_string(),
        id: Uuid::new_v4().to_string(),
        name: name.unwrap_or_else(|| "New Canvas".to_string()),
        parent_id,
        created: chrono::Utc::now().to_rfc3339(),
        modified: chrono::Utc::now().to_rfc3339(),
        view_box: ViewBox {
            x: 0.0,
            y: 0.0,
            width: 1920.0,
            height: 1080.0,
        },
        elements: serde_json::json!([]),
    };

    let mut canvas_path = get_canvases_dir(&app)?;
    canvas_path.push(format!("{}.json", canvas.id));

    let content = serde_json::to_string_pretty(&canvas)
        .map_err(|e| format!("Failed to serialize canvas: {}", e))?;
    fs::write(&canvas_path, content)
        .map_err(|e| format!("Failed to save canvas: {}", e))?;

    Ok(canvas)
}

#[tauri::command]
fn update_canvas(app: AppHandle, id: String, canvas_data: serde_json::Value) -> Result<Canvas, String> {
    let mut canvas_path = get_canvases_dir(&app)?;
    canvas_path.push(format!("{}.json", id));

    let mut canvas: Canvas = serde_json::from_value(canvas_data)
        .map_err(|e| format!("Failed to parse canvas data: {}", e))?;

    canvas.modified = chrono::Utc::now().to_rfc3339();
    if canvas.version.is_empty() {
        canvas.version = "1.0.0".to_string();
    }

    let content = serde_json::to_string_pretty(&canvas)
        .map_err(|e| format!("Failed to serialize canvas: {}", e))?;
    fs::write(&canvas_path, content)
        .map_err(|e| format!("Failed to save canvas: {}", e))?;

    Ok(canvas)
}

#[tauri::command]
fn delete_canvas(app: AppHandle, id: String) -> Result<bool, String> {
    let mut canvas_path = get_canvases_dir(&app)?;
    canvas_path.push(format!("{}.json", id));

    fs::remove_file(&canvas_path)
        .map_err(|_| "Canvas not found".to_string())?;

    Ok(true)
}

#[tauri::command]
fn get_tree(app: AppHandle) -> Result<TreeStructure, String> {
    let tree_file = get_tree_file(&app)?;

    if !tree_file.exists() {
        // Initialize default tree structure
        ensure_storage_directories(&app)?;
        let default_tree = TreeStructure {
            root_canvases: vec!["main".to_string()],
            canvases: {
                let mut map = std::collections::HashMap::new();
                map.insert("main".to_string(), TreeNode {
                    name: "Main Canvas".to_string(),
                    children: vec![],
                    parent: None,
                });
                map
            },
        };

        let content = serde_json::to_string_pretty(&default_tree)
            .map_err(|e| format!("Failed to serialize tree: {}", e))?;
        fs::write(&tree_file, content)
            .map_err(|e| format!("Failed to save tree: {}", e))?;

        return Ok(default_tree);
    }

    let content = fs::read_to_string(&tree_file)
        .map_err(|e| format!("Failed to read tree file: {}", e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse tree: {}", e))
}

#[tauri::command]
fn update_tree(app: AppHandle, tree_data: TreeStructure) -> Result<TreeStructure, String> {
    let tree_file = get_tree_file(&app)?;

    let content = serde_json::to_string_pretty(&tree_data)
        .map_err(|e| format!("Failed to serialize tree: {}", e))?;
    fs::write(&tree_file, content)
        .map_err(|e| format!("Failed to save tree: {}", e))?;

    Ok(tree_data)
}

#[tauri::command]
fn save_image(app: AppHandle, filename: String, data: Vec<u8>) -> Result<UploadedFile, String> {
    ensure_storage_directories(&app)?;

    let mut image_path = get_images_dir(&app)?;

    // Generate UUID filename with extension
    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png");

    let new_filename = format!("{}.{}", Uuid::new_v4(), ext);
    image_path.push(&new_filename);

    fs::write(&image_path, &data)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(UploadedFile {
        filename: new_filename.clone(),
        original_name: filename,
        size: data.len() as u64,
        path: format!("/api/images/{}", new_filename),
    })
}

#[tauri::command]
fn get_image_path(app: AppHandle, filename: String) -> Result<String, String> {
    let mut image_path = get_images_dir(&app)?;
    image_path.push(filename);

    if !image_path.exists() {
        return Err("Image not found".to_string());
    }

    image_path.to_str()
        .ok_or_else(|| "Invalid path".to_string())
        .map(|s| s.to_string())
}

fn init_default_canvas(app: &AppHandle) -> Result<(), String> {
    let mut canvas_path = get_canvases_dir(app)?;
    canvas_path.push("main.json");

    if !canvas_path.exists() {
        let default_canvas = Canvas {
            version: "1.0.0".to_string(),
            id: "main".to_string(),
            name: "Main Canvas".to_string(),
            parent_id: None,
            created: chrono::Utc::now().to_rfc3339(),
            modified: chrono::Utc::now().to_rfc3339(),
            view_box: ViewBox {
                x: 0.0,
                y: 0.0,
                width: 1920.0,
                height: 1080.0,
            },
            elements: serde_json::json!([]),
        };

        let content = serde_json::to_string_pretty(&default_canvas)
            .map_err(|e| format!("Failed to serialize canvas: {}", e))?;
        fs::write(&canvas_path, content)
            .map_err(|e| format!("Failed to save canvas: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .target(tauri_plugin_log::Target::new(
                            tauri_plugin_log::TargetKind::LogDir { file_name: Some("tauri".to_string()) }
                        ))
                        .build(),
                )?;

                // Print log file path to stdout
                if let Ok(log_dir) = app.path().app_log_dir() {
                    let log_file = log_dir.join("tauri.log");
                    println!("Tauri logs writing to: {}", log_file.display());
                }
            }

            // Initialize storage directories and default canvas
            ensure_storage_directories(&app.handle())?;
            init_default_canvas(&app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_canvas,
            create_canvas,
            update_canvas,
            delete_canvas,
            get_tree,
            update_tree,
            save_image,
            get_image_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
