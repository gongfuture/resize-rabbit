use std::sync::{
    atomic::{AtomicBool, AtomicU64},
    Arc, Mutex,
};

use crate::operations::group::Group;
use crate::profile::Profile;

pub struct AppState {
    pub profiles: Arc<Mutex<Vec<Profile>>>,
    pub groups: Arc<Mutex<Vec<Group>>>,
    pub process_watcher_enabled: Arc<AtomicBool>,
    pub poll_rate: Arc<AtomicU64>,
}
