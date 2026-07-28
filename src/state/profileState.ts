import { signal } from '@preact/signals-react';
import {Profile} from '../types/ProfileTypes';
import { produce } from 'immer';
import backend from '../utils/backend';

const state = signal<Profile[]>([]);

export const getProfiles = (): Readonly<Profile[]> => state.value;

export const setProfiles = (newProfiles: Profile[]) => {
    state.value = produce(state.value, () => newProfiles);
}

export const removeProfile = (uuid: string) => setProfiles(state.value.filter(profile => profile.uuid !== uuid));
export const refreshProfiles = async () => {
    const profiles = await backend.profile.all();
    setProfiles(profiles);
}

export const updateProfile = (updatedProfile: Partial<Profile>) => {
    state.value = produce(state.value, draft => {
        const index = draft.findIndex(profile => profile.uuid === updatedProfile.uuid);
        draft[index] = {
            ...draft[index],
            ...updatedProfile
        }
    });
}

// `orderedUuids` may be a *subset* of all profiles (e.g. just one group's
// members) — only `order` on those matching profiles is touched, everyone
// else is left exactly as-is. An earlier version replaced the whole list
// with just `orderedUuids`, which would have silently dropped every profile
// not included in a partial list.
export const reorderProfiles = (orderedUuids: string[]) => {
    state.value = produce(state.value, draft => {
        orderedUuids.forEach((id, index) => {
            const p = draft.find(p => p.uuid === id);
            if (p) p.order = index;
        });
    });
    backend.profile.reorder(orderedUuids).catch(console.error);
}

backend.profile.all().then(setProfiles).catch(console.error);