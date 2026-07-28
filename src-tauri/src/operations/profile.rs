extern crate uuid;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::api::path;
use tauri::{AppHandle, Manager, Runtime};
use uuid::Uuid;

use crate::errors::profile::Error as ProfileError;
use crate::setup::state::AppState;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default)]
pub struct Profile {
    pub uuid: Uuid,
    pub name: String,
    pub process_name: String,
    pub auto: bool,
    pub delay: i32,
    /// `None` means "leave the window's current size alone, only move it" —
    /// see `window_manager::resolved_size`. Position (`window_pos_x`/`_y`)
    /// stays mandatory; only size is optional.
    pub window_height: Option<i32>,
    pub window_width: Option<i32>,
    pub window_pos_y: i32,
    pub window_pos_x: i32,
    pub remove_borders: bool,
    /// Only meaningful when `remove_borders` is set. Pushes the window up and
    /// grows its height by however much leftover title-bar chrome we can
    /// measure, so the chrome lands off the top edge of the display instead of
    /// overlapping the game. See `window_manager::effective_target_rect` — it's
    /// strictly gated to windows we can actually measure (confirmed UWP
    /// `ApplicationFrameWindow` targets), so this is a no-op for every other
    /// game even if left on.
    pub shift_titlebar_offscreen: bool,
    pub shortcut: Option<String>,
    /// `None` = sits in the top-level list alongside groups. `Some(uuid)` =
    /// a member of that group — see `commands::group_commands`.
    pub group_uuid: Option<Uuid>,
    /// Sibling position: among other top-level entries (groups + ungrouped
    /// profiles) when `group_uuid` is `None`, or among the other profiles in
    /// the same group when it's `Some`. Never compared across those two
    /// scopes. See `Group::order` for the same convention on the group side.
    pub order: i32,
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            uuid: Uuid::new_v4(),
            name: "New Profile".to_string(),
            process_name: "".to_string(),
            auto: false,
            delay: 0,
            window_height: None,
            window_width: None,
            window_pos_y: 0,
            window_pos_x: 0,
            remove_borders: false,
            shift_titlebar_offscreen: false,
            shortcut: None,
            group_uuid: None,
            order: 0,
        }
    }
}

pub fn get_profiles_path<R: Runtime>(app_handle: &AppHandle<R>) -> Result<PathBuf, ProfileError> {
    let settings_path =
        path::app_data_dir(&app_handle.config()).ok_or(ProfileError::ProfilePathError)?;

    if !settings_path.exists() {
        fs::create_dir_all(&settings_path)?;
    }

    Ok(settings_path.join("profiles.json"))
}

pub fn load_profiles<R: Runtime>(app_handle: &AppHandle<R>) -> Result<Vec<Profile>, ProfileError> {
    let profile_path = get_profiles_path(app_handle)?;

    // If profiles doesnt exist we should create them with an empty object
    if !profile_path.exists() {
        let profiles: Vec<Profile> = vec![];
        let json_string: String = serde_json::to_string_pretty(&profiles)?;
        fs::write(&profile_path, json_string)?;
    }

    let profiles_json = fs::read_to_string(profile_path)?;
    serde_json::from_str(&profiles_json).map_err(Into::into)
}

fn save_profiles_to_disk<R: Runtime>(
    profiles: &Vec<Profile>,
    app_handle: &AppHandle<R>,
) -> Result<(), ProfileError> {
    let json_string: String = serde_json::to_string_pretty(&profiles)?;
    let profiles_path = get_profiles_path(app_handle)?;

    fs::write(profiles_path, json_string).map_err(Into::into)
}

fn update_profiles_state<R: Runtime>(profiles: Vec<Profile>, app_handle: &AppHandle<R>) {
    let state = app_handle.state::<AppState>();

    // Lock the state, replace the profiles list with the new list
    {
        let mut app_state = state.profiles.lock().unwrap();
        *app_state = profiles;
    } // Lock is automatically released here
}

pub fn add_profile<R: Runtime>(profile: Profile, app: &AppHandle<R>) -> Result<(), ProfileError> {
    let mut profiles = load_profiles(app)?;
    profiles.push(profile);

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}

pub fn update_profile<R: Runtime>(
    profile: Profile,
    app: &AppHandle<R>,
) -> Result<(), ProfileError> {
    let mut profiles = load_profiles(app)?;
    let index = profiles
        .iter()
        .position(|p| p.uuid == profile.uuid)
        .ok_or(ProfileError::NotFound)?;
    profiles[index] = profile;

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}

pub fn delete_profile<R: Runtime>(
    profile: Profile,
    app: &AppHandle<R>,
) -> Result<(), ProfileError> {
    let mut profiles = load_profiles(app)?;
    let index = profiles
        .iter()
        .position(|p| p.uuid == profile.uuid)
        .ok_or(ProfileError::NotFound)?;
    profiles.remove(index);

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}

pub fn has_importable_legacy_profiles<R: Runtime>(app: &AppHandle<R>) -> Result<bool, ProfileError> {
    let legacy_path = std::env::var("APPDATA")
        .map(|p| std::path::PathBuf::from(p).join("com.resizeraccoon.dev").join("profiles.json"))
        .map_err(|_| ProfileError::ProfilePathError)?;

    if !legacy_path.exists() {
        return Ok(false);
    }

    let legacy_json = fs::read_to_string(legacy_path)?;
    let legacy_profiles: Vec<Profile> = serde_json::from_str(&legacy_json)?;

    let current = load_profiles(app)?;
    let existing_uuids: std::collections::HashSet<Uuid> =
        current.iter().map(|p| p.uuid).collect();

    Ok(legacy_profiles
        .iter()
        .any(|p| !existing_uuids.contains(&p.uuid)))
}

pub fn import_legacy_profiles<R: Runtime>(app: &AppHandle<R>) -> Result<usize, ProfileError> {
    let legacy_path = std::env::var("APPDATA")
        .map(|p| std::path::PathBuf::from(p).join("com.resizeraccoon.dev").join("profiles.json"))
        .map_err(|_| ProfileError::ProfilePathError)?;

    if !legacy_path.exists() {
        return Ok(0);
    }

    let legacy_json = fs::read_to_string(legacy_path)?;
    let legacy_profiles: Vec<Profile> = serde_json::from_str(&legacy_json)?;

    let mut current = load_profiles(app)?;
    let existing_uuids: std::collections::HashSet<Uuid> =
        current.iter().map(|p| p.uuid).collect();

    let new_profiles: Vec<Profile> = legacy_profiles
        .into_iter()
        .filter(|p| !existing_uuids.contains(&p.uuid))
        .collect();

    let count = new_profiles.len();
    current.extend(new_profiles);

    save_profiles_to_disk(&current, app)?;
    update_profiles_state(current, app);

    Ok(count)
}

/// Clears `group_uuid` on every profile that belonged to `group_uuid` — used
/// when that group is deleted, so its members become ungrouped instead of
/// disappearing. Left `order` untouched; an ungrouped profile picking up a
/// stray order value from its old group's member list is harmless (it'll
/// just land wherever a stable sort puts it until the top level is reordered).
pub fn unassign_group<R: Runtime>(
    group_uuid: Uuid,
    app: &AppHandle<R>,
) -> Result<(), ProfileError> {
    let mut profiles = load_profiles(app)?;

    for profile in profiles.iter_mut() {
        if profile.group_uuid == Some(group_uuid) {
            profile.group_uuid = None;
        }
    }

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}

/// Sets `order` on whichever profiles appear in `orders` (by uuid), leaving
/// everyone else untouched — used by the top-level home-screen reorder
/// (groups + ungrouped profiles interleaved), which needs to write into both
/// `profiles.json` and `groups.json` in one pass. Unlike `reorder_profiles`,
/// callers here don't need to pass every candidate — just whichever ones
/// happen to be profiles vs. groups in a mixed drag-and-drop sequence.
pub fn set_orders<R: Runtime>(
    orders: &HashMap<Uuid, i32>,
    app: &AppHandle<R>,
) -> Result<(), ProfileError> {
    if orders.is_empty() {
        return Ok(());
    }

    let mut profiles = load_profiles(app)?;

    for profile in profiles.iter_mut() {
        if let Some(order) = orders.get(&profile.uuid) {
            profile.order = *order;
        }
    }

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}

/// Assigns `order` (0, 1, 2, ...) to exactly the profiles named in `uuids`,
/// matching their position in that list — used both for reordering ungrouped
/// profiles among themselves and for reordering the members of one specific
/// group (the caller passes just that subset). Deliberately only ever
/// *updates* `order` on matching profiles, never drops anyone from the
/// underlying store — earlier versions of this function replaced the whole
/// profiles list with exactly `uuids`, which would have silently deleted
/// every profile not included in a partial (e.g. single-group) list.
pub fn reorder_profiles<R: Runtime>(
    uuids: Vec<Uuid>,
    app: &AppHandle<R>,
) -> Result<(), ProfileError> {
    let mut profiles = load_profiles(app)?;

    for profile in profiles.iter_mut() {
        if let Some(index) = uuids.iter().position(|id| *id == profile.uuid) {
            profile.order = index as i32;
        }
    }

    save_profiles_to_disk(&profiles, app)?;
    update_profiles_state(profiles, app);

    Ok(())
}
