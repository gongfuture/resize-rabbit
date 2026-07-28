use tauri::{AppHandle, Runtime};

/// Ensures the logs folder exists (creating it if this is the first time
/// anyone's asked, e.g. logging was never toggled on in this install yet)
/// and opens it in Explorer.
///
/// Deliberately *not* `tauri::api::shell::open` — its scope validates the
/// path against `tauri > allowlist > shell > open`'s regex, which **defaults
/// to matching only `mailto:`/`tel:`/`http(s)://` URLs** (confirmed by
/// reading the vendored `tauri-1.5.2` source, `scope/shell.rs`'s `open()`)
/// — a plain Windows filesystem path never matches that, so every call
/// failed validation regardless of whether it was invoked from the frontend
/// or from a Rust command. That allowlist feature is for opening external
/// URLs, not browsing to a local folder. Launching `explorer.exe` directly
/// sidesteps that scope entirely, which is the correct tool for this.
#[tauri::command]
pub fn logging_open_folder<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    let dir = crate::logging::ensure_logs_dir(&app_handle)
        .ok_or_else(|| "Could not resolve the logs folder path".to_string())?;

    // `.spawn()`, not `.status()`/`.output()` — explorer.exe is notorious for
    // returning a non-zero exit code even on a fully successful open, so
    // waiting on and checking its exit status would misreport success as a
    // failure. We only care that the process launched at all.
    std::process::Command::new("explorer")
        .arg(dir)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}
