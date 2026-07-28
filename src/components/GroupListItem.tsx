import styled from '@emotion/styled';
import { ChevronDown, ChevronRight, Settings, Menu } from 'react-feather';
import { Group } from '../types/GroupTypes';
import { Profile } from '../types/ProfileTypes';
import { setScreen } from '../state/screenState';
import { Screen } from '../types/ScreenTypes';
import { useTranslation } from '../utils/i18n/useTranslation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ProfileListItem from './ProfileListItem';
import { updateGroup } from '../state/groupState';
import backend from '../utils/backend';
import { updateProfile } from '../state/profileState';

interface Props {
    group: Group;
    members: Profile[];
}

// All drag interactions (top-level reorder, into/out-of/between groups,
// within-group reorder) are handled by one shared `DndContext` in
// `HomeScreen` — this only renders a `SortableContext` for this group's own
// members so dnd-kit can animate reordering among them. It used to run its
// own separate `DndContext`, which structurally could never see a drag that
// started outside it — that's why dragging a profile back out of a group
// didn't work at all before this.
const GroupListItem = ({ group, members }: Props) => {
    const t = useTranslation();
    const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } =
        useSortable({ id: group.uuid });
    // A separate droppable, in its own `groupdrop:` id namespace, distinct
    // from the sortable id above — see HomeScreen's custom collision
    // detection. Needed because a plain SortableContext treats every hover
    // as a reorder-position preview (the group visually dodges out of the
    // way instead of acting as a stable drop target), which made dropping a
    // profile "onto" a group functionally impossible.
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `groupdrop:${group.uuid}`,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const handleToggleCollapsed = () => {
        const collapsed = !group.collapsed;
        updateGroup({ uuid: group.uuid, collapsed });
        backend.group.update({ ...group, collapsed }).catch(console.error);
    };

    const handleEditGroup = () => {
        setScreen(Screen.GROUP_EDITOR, { group });
    };

    const handleRemoveMember = (profile: Profile) => {
        const updated = { ...profile, groupUuid: undefined };
        updateProfile(updated);
        backend.profile.update(updated).catch(console.error);
    };

    return (
        <Component ref={setSortableRef} style={style} className="mb-2">
            <div
                ref={setDroppableRef}
                className={`card card-compact shadow-xl bg-base-200 ${
                    isOver ? 'ring-2 ring-accent' : ''
                }`}
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
                        <button
                            className="btn btn-ghost btn-square btn-sm mr-1"
                            onClick={handleToggleCollapsed}
                        >
                            {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <div className="label text-lg p-0">{group.name}</div>
                        <div className="actions gap-1">
                            <button
                                className="btn btn-ghost btn-square btn-sm"
                                onClick={handleEditGroup}
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="meta text-2xs uppercase font-bold text-gray-600">
                        <span>{t('group.memberCount', { count: members.length })}</span>
                        {!!group.shortcut && <span className="font-mono">{group.shortcut}</span>}
                    </div>
                </div>
            </div>
            {!group.collapsed && members.length > 0 && (
                <div className="mt-2">
                    <SortableContext
                        items={members.map((p) => p.uuid)}
                        strategy={verticalListSortingStrategy}
                    >
                        {members.map((profile) => (
                            <ProfileListItem
                                key={profile.uuid}
                                profile={profile}
                                nested
                                onRemoveFromGroup={() => handleRemoveMember(profile)}
                            />
                        ))}
                    </SortableContext>
                </div>
            )}
        </Component>
    );
};

const Component = styled.div`
    .row {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
    }

    .label {
        display: flex;
        flex: 1;
        font-weight: 600;
    }

    .meta {
        display: flex;
        gap: 5px;
        justify-content: flex-start;
        line-height: 1em;

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

export default GroupListItem;
