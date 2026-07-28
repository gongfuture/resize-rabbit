use std::collections::HashMap;

use tauri::{AppHandle, GlobalShortcutManager, Manager, Runtime};

use crate::debug_log;
use crate::operations::process;
use crate::operations::profile::Profile;
use crate::operations::window_manager::{self, ApplyConfig};
use crate::setup::state::AppState;

/// Applies every one of `candidates` whose game is actually running, so the
/// same shortcut can be bound to more than one profile (e.g. "move all my
/// games' windows to this monitor layout" bound to one key) and all of them
/// get moved, not just whichever was resolved first. With just one candidate
/// (the common case) this behaves exactly as before — no running-process
/// pre-check, straight to `apply_profile` including its own retry/window-
/// title-fallback logic — so single-profile shortcuts can't regress.
fn handle_shortcut_press(shortcut: &str, candidates: &[Profile]) {
    if candidates.len() == 1 {
        let _ = window_manager::apply_profile(
            &candidates[0],
            ApplyConfig::new().retry(true).monitor(true),
        );
        return;
    }

    let running: Vec<&Profile> = candidates
        .iter()
        .filter(|profile| !process::get_pids_from_profile(profile).is_empty())
        .collect();

    if running.is_empty() {
        debug_log!(
            "Shortcut '{}' pressed but none of the {} profiles sharing it have a running process — ignoring this press.",
            shortcut,
            candidates.len()
        );
        return;
    }

    debug_log!(
        "Shortcut '{}' pressed — {} of the {} profiles sharing it have a running process, applying all of them: {:?}",
        shortcut,
        running.len(),
        candidates.len(),
        running.iter().map(|p| &p.name).collect::<Vec<_>>()
    );

    for profile in running {
        let _ = window_manager::apply_profile(
            profile,
            ApplyConfig::new().retry(true).monitor(true),
        );
    }
}

pub fn rebuild_shortcuts<R: Runtime>(app_handle: &AppHandle<R>) {
    let state = app_handle.state::<AppState>();
    let profiles = state.profiles.lock().unwrap().clone();
    let groups = state.groups.lock().unwrap().clone();
    drop(state);

    let mut mgr = app_handle.global_shortcut_manager();
    let _ = mgr.unregister_all();

    // Group by shortcut string first — registering the same accelerator twice
    // would silently overwrite the first registration's callback (tauri's
    // global shortcut manager keys its internal listener map by the
    // accelerator itself), so exactly one native hotkey gets registered per
    // unique shortcut, covering every profile (and every group's members)
    // that uses it.
    let mut profiles_by_shortcut: HashMap<String, Vec<Profile>> = HashMap::new();

    for profile in &profiles {
        let shortcut = match &profile.shortcut {
            Some(s) if !s.is_empty() => s.clone(),
            _ => continue,
        };

        profiles_by_shortcut.entry(shortcut).or_default().push(profile.clone());
    }

    // A group's shortcut applies to all of its members — expand it into the
    // same candidate list a profile's own shortcut would build, so
    // `handle_shortcut_press`'s existing "apply every running candidate"
    // logic (see above) handles group hotkeys for free, no special-casing
    // needed. A profile keeps its own shortcut independent of its group's —
    // both loops can add the same profile under different keys, or even the
    // same key (deduped below) if a user sets them identically.
    for group in &groups {
        let shortcut = match &group.shortcut {
            Some(s) if !s.is_empty() => s.clone(),
            _ => continue,
        };

        let members = profiles.iter().filter(|p| p.group_uuid == Some(group.uuid)).cloned();
        profiles_by_shortcut.entry(shortcut).or_default().extend(members);
    }

    // Dedupe per-shortcut candidate lists by uuid (preserving first
    // occurrence) — a profile could otherwise appear twice under one
    // shortcut if its own shortcut and its group's happen to be set to the
    // same combo, which would apply it twice on a single press.
    for candidates in profiles_by_shortcut.values_mut() {
        let mut seen = std::collections::HashSet::new();
        candidates.retain(|p| seen.insert(p.uuid));
    }

    for (shortcut, candidates) in profiles_by_shortcut {
        let shortcut_clone = shortcut.clone();
        let result = mgr.register(&shortcut, move || {
            handle_shortcut_press(&shortcut_clone, &candidates);
        });

        if let Err(e) = result {
            eprintln!("Failed to register shortcut '{}': {}", shortcut, e);
        }
    }
}
