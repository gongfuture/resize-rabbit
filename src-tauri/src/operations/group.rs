use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::api::path;
use tauri::{AppHandle, Manager, Runtime};
use uuid::Uuid;

use crate::errors::group::Error as GroupError;
use crate::setup::state::AppState;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default)]
pub struct Group {
    pub uuid: Uuid,
    pub name: String,
    pub shortcut: Option<String>,
    pub collapsed: bool,
    /// Position among other top-level entries (other groups, and ungrouped
    /// profiles) — see `commands::group_commands::home_reorder`. Newly
    /// created groups default to `0`, same as everything else that's never
    /// been explicitly reordered yet; a stable sort means that's harmless
    /// until the user actually drags something.
    pub order: i32,
}

impl Default for Group {
    fn default() -> Self {
        Self {
            uuid: Uuid::new_v4(),
            name: "New Group".to_string(),
            shortcut: None,
            collapsed: false,
            order: 0,
        }
    }
}

pub fn get_groups_path<R: Runtime>(app_handle: &AppHandle<R>) -> Result<PathBuf, GroupError> {
    let settings_path =
        path::app_data_dir(&app_handle.config()).ok_or(GroupError::GroupPathError)?;

    if !settings_path.exists() {
        fs::create_dir_all(&settings_path)?;
    }

    Ok(settings_path.join("groups.json"))
}

pub fn load_groups<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<Group>, GroupError> {
    let groups_path = get_groups_path(app_handle)?;

    if !groups_path.exists() {
        let groups: Vec<Group> = vec![];
        let json_string: String = serde_json::to_string_pretty(&groups)?;
        fs::write(&groups_path, json_string)?;
    }

    let groups_json = fs::read_to_string(groups_path)?;
    serde_json::from_str(&groups_json).map_err(Into::into)
}

fn save_groups_to_disk<R: Runtime>(
    groups: &Vec<Group>,
    app_handle: &AppHandle<R>,
) -> Result<(), GroupError> {
    let json_string: String = serde_json::to_string_pretty(&groups)?;
    let groups_path = get_groups_path(app_handle)?;

    fs::write(groups_path, json_string).map_err(Into::into)
}

fn update_groups_state<R: Runtime>(groups: Vec<Group>, app_handle: &AppHandle<R>) {
    let state = app_handle.state::<AppState>();

    {
        let mut app_state = state.groups.lock().unwrap();
        *app_state = groups;
    }
}

pub fn add_group<R: Runtime>(group: Group, app: &AppHandle<R>) -> Result<(), GroupError> {
    let mut groups = load_groups(app)?;
    groups.push(group);

    save_groups_to_disk(&groups, app)?;
    update_groups_state(groups, app);

    Ok(())
}

pub fn update_group<R: Runtime>(group: Group, app: &AppHandle<R>) -> Result<(), GroupError> {
    let mut groups = load_groups(app)?;
    let index = groups
        .iter()
        .position(|g| g.uuid == group.uuid)
        .ok_or(GroupError::NotFound)?;
    groups[index] = group;

    save_groups_to_disk(&groups, app)?;
    update_groups_state(groups, app);

    Ok(())
}

/// Deletes the group and un-assigns it from every profile that was in it
/// (those profiles become ungrouped, not deleted) — same "removing the
/// container doesn't remove what's in it" behavior as deleting a folder.
pub fn delete_group<R: Runtime>(group: Group, app: &AppHandle<R>) -> Result<(), GroupError> {
    let mut groups = load_groups(app)?;
    let index = groups
        .iter()
        .position(|g| g.uuid == group.uuid)
        .ok_or(GroupError::NotFound)?;
    groups.remove(index);

    save_groups_to_disk(&groups, app)?;
    update_groups_state(groups, app);

    crate::operations::profile::unassign_group(group.uuid, app).map_err(GroupError::generic)?;

    Ok(())
}

/// Sets `order` on whichever groups appear in `orders` (by uuid), leaving
/// everyone else untouched — see `profile::set_orders`, the profile-side
/// counterpart used together with this one for the top-level home reorder.
pub fn set_orders<R: Runtime>(
    orders: &HashMap<Uuid, i32>,
    app: &AppHandle<R>,
) -> Result<(), GroupError> {
    if orders.is_empty() {
        return Ok(());
    }

    let mut groups = load_groups(app)?;

    for group in groups.iter_mut() {
        if let Some(order) = orders.get(&group.uuid) {
            group.order = *order;
        }
    }

    save_groups_to_disk(&groups, app)?;
    update_groups_state(groups, app);

    Ok(())
}
