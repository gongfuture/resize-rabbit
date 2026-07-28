import { signal } from '@preact/signals-react';
import { Group } from '../types/GroupTypes';
import { produce } from 'immer';
import backend from '../utils/backend';

const state = signal<Group[]>([]);

export const getGroups = (): Readonly<Group[]> => state.value;

export const setGroups = (newGroups: Group[]) => {
    state.value = produce(state.value, () => newGroups);
}

export const removeGroup = (uuid: string) => setGroups(state.value.filter(group => group.uuid !== uuid));

export const refreshGroups = async () => {
    const groups = await backend.group.all();
    setGroups(groups);
}

export const updateGroup = (updatedGroup: Partial<Group>) => {
    state.value = produce(state.value, draft => {
        const index = draft.findIndex(group => group.uuid === updatedGroup.uuid);
        draft[index] = {
            ...draft[index],
            ...updatedGroup
        }
    });
};

// Same partial-list-safe semantics as profileState's reorderProfiles.
export const reorderGroups = (orderedUuids: string[]) => {
    state.value = produce(state.value, draft => {
        orderedUuids.forEach((id, index) => {
            const group = draft.find(group => group.uuid === id);
            if (group) group.order = index;
        });
    });
};

backend.group.all().then(setGroups).catch(console.error);
