import styled from '@emotion/styled';
import { Profile } from '../types/ProfileTypes';
import { Maximize, Settings, Menu, X, Trash2 } from 'react-feather';
import { useState } from 'react';
import { ask } from '@tauri-apps/api/dialog';
import backend from '../utils/backend';
import { setScreen } from '../state/screenState';
import { Screen } from '../types/ScreenTypes';
import { removeProfile } from '../state/profileState';
import { useTranslation } from '../utils/i18n/useTranslation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    profile: Profile;
    // Rendered indented under its group, with a button to pull it back out
    // (drag-and-drop only supports moving a profile *into* a group — see
    // HomeScreen — so "back out" is a plain click instead).
    nested?: boolean;
    onRemoveFromGroup?: () => void;
}

const ProfileListItem = ({ profile, nested, onRemoveFromGroup }: Props) => {
    const t = useTranslation();
    const [loading, setLoading] = useState(false);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: profile.uuid });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const handleResize = () => {
        setLoading(true);
        backend.profile.apply(profile).finally(() => setLoading(false));
    };

    const handleEditProfile = () => {
        setScreen(Screen.PROFILE_EDITOR, { profile });
    };

    const handleDelete = async () => {
        const confirmed = await ask(
            t('profile.buttons.deleteConfirmMessage', { name: profile.name }),
            { title: t('profile.buttons.deleteConfirmTitle'), type: 'warning' }
        );
        if (!confirmed) return;

        backend.profile.delete(profile).then(() => {
            removeProfile(profile.uuid);
        });
    };

    return (
        <Component
            ref={setNodeRef}
            style={style}
            className={`card card-compact shadow-xl bg-base-100 mb-2 ${nested ? 'ml-8' : ''}`}
        >
            <div className="card-body gap-y-0">
                <div className="row">
                    <button
                        className="drag-handle btn btn-ghost btn-square btn-sm mr-1 cursor-grab active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <Menu size={16} />
                    </button>
                    <div className="label text-lg p-0">{profile.name}</div>
                    <div className="actions gap-1">
                        <button
                            disabled={loading}
                            className="btn btn-ghost btn-square btn-sm"
                            onClick={handleResize}
                        >
                            {loading ? (
                                <span className="loading loading-spinner w-4" />
                            ) : (
                                <Maximize size={16} />
                            )}
                        </button>
                        <button
                            className="btn btn-ghost btn-square btn-sm"
                            onClick={handleEditProfile}
                        >
                            <Settings size={16} />
                        </button>
                        {!!onRemoveFromGroup && (
                            <button
                                className="btn btn-ghost btn-square btn-sm"
                                onClick={onRemoveFromGroup}
                                title={t('group.removeMember')}
                            >
                                <X size={16} />
                            </button>
                        )}
                        {/* Delete is deliberately always the last/rightmost
                            action, nested or not — it's the only one of
                            these that's destructive and confirms first, and
                            keeping its position consistent avoids it being
                            confused with the non-destructive "remove from
                            group" button above when both are present. */}
                        <button
                            className="btn btn-ghost btn-square btn-sm"
                            onClick={handleDelete}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div className="meta text-2xs uppercase font-bold text-gray-600">
                    <span>
                        {profile.auto
                            ? t('profile.autoResize.enabled')
                            : t('profile.autoResize.disabled')}
                    </span>
                    {/* w:/h:/x:/y: labels are raw data-readout prefixes, not
                        translated prose (matches existing convention here) —
                        "auto" likewise left untranslated rather than adding a
                        new locale key for it. */}
                    <span>w: {profile.windowWidth ?? 'auto'}</span>
                    <span>h: {profile.windowHeight ?? 'auto'}</span>
                    <span>x: {profile.windowPosX}</span>
                    <span>y: {profile.windowPosY}</span>
                </div>
            </div>
        </Component>
    );
};

const Component = styled.div`
    .row {
        display: flex;
        flex-direction: row;
        width: 100%;
    }

    .label {
        display: flex;
        flex: 1;
    }

    .meta {
        display: inline-block;
        display: flex;
        gap: 5px;
        justify-content: flex-start;
        line-height: 1em;

        // add a bullet between each item
        span:not(:last-child)::after {
            content: '•';
            margin-left: 5px;
        }
    }

    .actions {
        display: flex;
        align-items: center;
    }
`;

export default ProfileListItem;
