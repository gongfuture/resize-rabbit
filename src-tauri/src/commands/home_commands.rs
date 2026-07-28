use std::collections::{HashMap, HashSet};

use crate::errors::profile::Error as ProfileError;
use crate::operations::{group, profile};
use crate::setup::tray;
use tauri::{AppHandle, Runtime};
use uuid::Uuid;

/// Reorders the top-level home screen — groups and ungrouped profiles,
/// interleaved in a single sequence. `uuids` is the *complete* new top-level
/// order (every group + every ungrouped profile); grouped profiles are never
/// part of this list and are untouched (their order lives in the group's own
/// member sequence, reordered separately via `profile_reorder`).
///
/// Writes to both `profiles.json` and `groups.json`, so this isn't atomic
/// across the two files — matches the rest of this app's persistence, which
/// has never used transactions (e.g. tray/shortcut rebuilds after a profile
/// change are already sequential best-effort steps, not a single unit).
#[tauri::command]
pub fn home_reorder<R: Runtime>(
    uuids: Vec<Uuid>,
    app_handle: AppHandle<R>,
) -> Result<(), ProfileError> {
    let groups = group::load_groups(&app_handle).map_err(ProfileError::generic)?;
    let group_uuids: HashSet<Uuid> = groups.iter().map(|g| g.uuid).collect();

    let mut group_orders: HashMap<Uuid, i32> = HashMap::new();
    let mut profile_orders: HashMap<Uuid, i32> = HashMap::new();

    for (index, uuid) in uuids.into_iter().enumerate() {
        if group_uuids.contains(&uuid) {
            group_orders.insert(uuid, index as i32);
        } else {
            profile_orders.insert(uuid, index as i32);
        }
    }

    profile::set_orders(&profile_orders, &app_handle)?;
    group::set_orders(&group_orders, &app_handle).map_err(ProfileError::generic)?;

    tray::rebuild_tray_menu(&app_handle);

    Ok(())
}
