use crate::debug_log;
use crate::errors::group::Error as GroupError;
use crate::operations::group::{self, Group};
use crate::setup::shortcuts;
use crate::setup::tray;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub fn group_get<R: Runtime>(app_handle: AppHandle<R>) -> Result<Vec<Group>, GroupError> {
    group::load_groups(&app_handle)
}

#[tauri::command]
pub fn group_add<R: Runtime>(
    group: Group,
    app_handle: AppHandle<R>,
) -> Result<(), GroupError> {
    let name = group.name.clone();
    let result = group::add_group(group, &app_handle);
    match &result {
        Ok(()) => debug_log!("Group created: '{}'", name),
        Err(e) => debug_log!("Failed to create group '{}': {}", name, e),
    }
    tray::rebuild_tray_menu(&app_handle);
    shortcuts::rebuild_shortcuts(&app_handle);
    result
}

#[tauri::command]
pub fn group_update<R: Runtime>(
    group: Group,
    app_handle: AppHandle<R>,
) -> Result<(), GroupError> {
    let name = group.name.clone();
    let result = group::update_group(group, &app_handle);
    match &result {
        Ok(()) => debug_log!("Group updated: '{}'", name),
        Err(e) => debug_log!("Failed to update group '{}': {}", name, e),
    }
    tray::rebuild_tray_menu(&app_handle);
    shortcuts::rebuild_shortcuts(&app_handle);
    result
}

#[tauri::command]
pub fn group_delete<R: Runtime>(
    group: Group,
    app_handle: AppHandle<R>,
) -> Result<(), GroupError> {
    let name = group.name.clone();
    let result = group::delete_group(group, &app_handle);
    match &result {
        Ok(()) => debug_log!("Group deleted: '{}'", name),
        Err(e) => debug_log!("Failed to delete group '{}': {}", name, e),
    }
    tray::rebuild_tray_menu(&app_handle);
    shortcuts::rebuild_shortcuts(&app_handle);
    result
}
