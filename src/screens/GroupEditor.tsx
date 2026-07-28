import { useMemo, useState } from 'react';
import { ask } from '@tauri-apps/api/dialog';
import { v4 as uuidv4 } from 'uuid';
import { Group } from '../types/GroupTypes';
import backend from '../utils/backend';
import { setScreen } from '../state/screenState';
import { Screen } from '../types/ScreenTypes';
import { getGroups, refreshGroups, removeGroup } from '../state/groupState';
import { getProfiles } from '../state/profileState';
import FormControl from '../components/profile-editor/FormControl';
import ShortcutCapture from '../components/profile-editor/ShortcutCapture';
import LoadingButton from '../components/LoadingButton';
import { useTranslation } from '../utils/i18n/useTranslation';

interface Props {
    group?: Group;
}

const GroupEditor = ({ group }: Props) => {
    const t = useTranslation();
    const [name, setName] = useState<string>(group?.name || '');
    const [shortcut, setShortcut] = useState<string>(group?.shortcut || '');
    const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(!!group);
    const uuid = useMemo(() => group ? group.uuid : uuidv4(), [group]);

    const memberCount = useMemo(
        () => getProfiles().filter((p) => p.groupUuid === uuid).length,
        [uuid]
    );

    const sharedShortcutWith = useMemo(() => {
        if (!shortcut) return [];
        const groupNames = getGroups()
            .filter((g) => g.shortcut === shortcut && g.uuid !== uuid)
            .map((g) => g.name);
        const profileNames = getProfiles()
            .filter((p) => p.shortcut === shortcut)
            .map((p) => p.name);
        return [...groupNames, ...profileNames];
    }, [shortcut, uuid]);

    const canSave = !!name;

    const getUpdatedGroup = (): Group => ({
        uuid,
        name,
        shortcut: shortcut || undefined,
        collapsed: group?.collapsed || false,
        order: group?.order ?? 0,
    });

    const handleCancel = () => setScreen(Screen.HOME);

    const persistGroup = async () => {
        const updatedGroup = getUpdatedGroup();
        const endpoint = hasBeenSaved ? backend.group.update : backend.group.add;

        await endpoint(updatedGroup);
        setHasBeenSaved(true);
        await refreshGroups();
    };

    const handleSaveAndClose = async () => {
        await persistGroup();
        setScreen(Screen.HOME);
    };

    const handleDelete = async () => {
        if (!group?.uuid) return;

        const confirmed = await ask(
            t('group.buttons.deleteConfirmMessage', { name: group.name }),
            { title: t('group.buttons.deleteConfirmTitle'), type: 'warning' }
        );
        if (!confirmed) return;

        backend.group.delete(group).then(() => {
            removeGroup(group.uuid);
            setScreen(Screen.HOME);
        });
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-t from-[#660e99] to-[#941882]">
            <div className="flex-grow w-full pr-8 pl-8 pt-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                    <FormControl
                        id="group_name"
                        label={t('group.name.title')}
                        description={t('group.name.description')}
                        tooltip="top-right"
                    >
                        <input
                            type="text"
                            id="group_name"
                            className="input w-full"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </FormControl>
                    <FormControl
                        id="group_shortcut"
                        label={t('group.shortcut.title')}
                        description={t('group.shortcut.description')}
                        tooltip="top-left"
                    >
                        <ShortcutCapture value={shortcut} onChange={setShortcut} />
                        {sharedShortcutWith.length > 0 && (
                            <p className="text-2xs opacity-60 mt-1">
                                {t('group.shortcut.sharedWith', {
                                    names: sharedShortcutWith.join(', '),
                                })}
                            </p>
                        )}
                    </FormControl>
                    {hasBeenSaved && (
                        <p className="text-2xs opacity-60">
                            {t('group.memberCount', { count: memberCount })}
                        </p>
                    )}
                </div>
            </div>
            <div className="pb-8 pr-8 pl-8">
                <div className="divider pt-0 mt-0"></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-left">
                        {!!group && (
                            <LoadingButton
                                className="btn btn-outline btn-secondary"
                                onClick={handleDelete}
                            >
                                {t('group.buttons.delete')}
                            </LoadingButton>
                        )}
                    </div>
                    <div className="text-center">
                        <button className="btn btn-outline" onClick={handleCancel}>
                            {t('group.buttons.cancel')}
                        </button>
                    </div>
                    <div className="text-right">
                        <LoadingButton
                            className="btn"
                            onClick={handleSaveAndClose}
                            disabled={!canSave}
                        >
                            {t('group.buttons.save')}
                        </LoadingButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupEditor;
