import { useState } from 'react';
import ProfileListItem from '../components/ProfileListItem';
import GroupListItem from '../components/GroupListItem';
import { Plus, FolderPlus, Settings as SettingsIcon } from 'react-feather';
import SettingsMenu from '../components/SettingsMenu';
import { getSettings, updateSettings } from '../state/settingsState';
import { getAppVersion } from '../state/appVersionState';
import { getProfiles, updateProfile, reorderProfiles } from '../state/profileState';
import { getGroups, updateGroup } from '../state/groupState';
import { Group } from '../types/GroupTypes';
import { Profile } from '../types/ProfileTypes';
import backend from '../utils/backend';
import { setScreen } from '../state/screenState';
import { Screen } from '../types/ScreenTypes';
import { useTranslation } from '../utils/i18n/useTranslation';
import {
    DndContext,
    closestCenter,
    pointerWithin,
    CollisionDetection,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';

type TopLevelItem =
    | { type: 'group'; uuid: string; group: Group }
    | { type: 'profile'; uuid: string; profile: Profile };

const HomeScreen = () => {
    const t = useTranslation();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const sensors = useSensors(useSensor(PointerSensor));

    const handleProcessWatcherToggle = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        updateSettings({ processWatcherEnabled: e.target.checked });
    };

    const handleNewProfile = () => {
        setScreen(Screen.PROFILE_EDITOR);
    };

    const handleNewGroup = () => {
        setScreen(Screen.GROUP_EDITOR);
    };

    const groups = getGroups();
    const profiles = getProfiles();
    const ungroupedProfiles = profiles.filter((p) => !p.groupUuid);

    // Groups and ungrouped profiles share one flat, orderable top-level list
    // — a group is never nested inside another group, and a profile sits
    // either here (ungrouped) or inside exactly one group's member list.
    const topLevelItems: TopLevelItem[] = [
        ...groups.map((group) => ({ type: 'group' as const, uuid: group.uuid, group })),
        ...ungroupedProfiles.map((profile) => ({ type: 'profile' as const, uuid: profile.uuid, profile })),
    ].sort((a, b) => {
        const orderA = a.type === 'group' ? a.group.order : a.profile.order;
        const orderB = b.type === 'group' ? b.group.order : b.profile.order;
        return orderA - orderB;
    });

    // A plain SortableContext treats every hover as a reorder-position
    // preview — every item (including groups) would visually shift out of
    // the way of the dragged item, making it impossible to actually hover
    // "over" a group long enough to drop onto it. Each GroupListItem
    // registers a separate droppable in a `groupdrop:` id namespace (its own
    // rect, not part of the sortable swap logic) — this collision strategy
    // checks the literal pointer position against those first, and only
    // falls back to normal closest-center sortable behavior when the
    // pointer isn't actually within a group's drop zone.
    const collisionDetectionStrategy: CollisionDetection = (args) => {
        const groupHits = pointerWithin(args).filter((c) =>
            String(c.id).startsWith('groupdrop:')
        );
        if (groupHits.length > 0) return groupHits;
        return closestCenter(args);
    };

    // 'top-level' or a group's uuid — where a given item currently lives.
    // Groups always live at the top level; a profile lives either there
    // (ungrouped) or inside exactly one group's member list.
    const TOP_LEVEL = 'top-level';
    const containerOf = (uuid: string): string | null => {
        if (groups.some((g) => g.uuid === uuid)) return TOP_LEVEL;
        const profile = profiles.find((p) => p.uuid === uuid);
        if (!profile) return null;
        return profile.groupUuid ?? TOP_LEVEL;
    };

    const reorderTopLevel = (activeId: string, overId: string) => {
        const oldIndex = topLevelItems.findIndex((item) => item.uuid === activeId);
        const newIndex = topLevelItems.findIndex((item) => item.uuid === overId);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove([...topLevelItems], oldIndex, newIndex);

        reordered.forEach((item, index) => {
            if (item.type === 'group') {
                updateGroup({ uuid: item.uuid, order: index });
            } else {
                updateProfile({ uuid: item.uuid, order: index });
            }
        });

        backend.home.reorder(reordered.map((item) => item.uuid)).catch(console.error);
    };

    const reorderWithinGroup = (groupUuid: string, activeId: string, overId: string) => {
        const members = profiles
            .filter((p) => p.groupUuid === groupUuid)
            .sort((a, b) => a.order - b.order);
        const oldIndex = members.findIndex((p) => p.uuid === activeId);
        const newIndex = members.findIndex((p) => p.uuid === overId);
        if (oldIndex === -1 || newIndex === -1) return;
        const reordered = arrayMove([...members], oldIndex, newIndex);
        reorderProfiles(reordered.map((p) => p.uuid));
    };

    // Moves a profile to a different container (ungrouped <-> a group, or
    // straight between two groups) — always appended at the end of the
    // destination rather than at a precise position, same simplification
    // already used for the original "drag into a group" interaction.
    const moveProfileToContainer = (profileId: string, targetContainer: string) => {
        const profile = profiles.find((p) => p.uuid === profileId);
        if (!profile) return;

        const updated =
            targetContainer === TOP_LEVEL
                ? { ...profile, groupUuid: undefined, order: topLevelItems.length }
                : {
                      ...profile,
                      groupUuid: targetContainer,
                      order: profiles.filter((p) => p.groupUuid === targetContainer).length,
                  };
        updateProfile(updated);
        backend.profile.update(updated).catch(console.error);
    };

    // One shared DndContext handles every drag interaction on this screen:
    // top-level reordering (groups + ungrouped profiles), dragging a profile
    // into a group, back out to the top level, straight between two groups,
    // and reordering within a group — all via this single handler, since
    // dnd-kit can only report cross-container drops within one DndContext.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeIdStr = String(active.id);
        const overIdStr = String(over.id);
        if (activeIdStr === overIdStr) return;

        const groupDropMatch = overIdStr.match(/^groupdrop:(.+)$/);
        const activeIsGroup = groups.some((g) => g.uuid === activeIdStr);

        // Groups only ever reorder at the top level — a `groupdrop:` hit
        // (dragged near another group's card) still resolves back to that
        // group's plain uuid so it reorders instead of being ignored.
        if (activeIsGroup) {
            const overId = groupDropMatch ? groupDropMatch[1] : overIdStr;
            if (activeIdStr === overId) return;
            reorderTopLevel(activeIdStr, overId);
            return;
        }

        const sourceContainer = containerOf(activeIdStr);
        const targetContainer = groupDropMatch ? groupDropMatch[1] : containerOf(overIdStr);
        if (sourceContainer === null || targetContainer === null) return;

        // Dropped directly on a group's own drop zone while already one of
        // its members — no meaningful position implied, nothing to do.
        if (groupDropMatch && sourceContainer === targetContainer) return;

        if (sourceContainer !== targetContainer) {
            moveProfileToContainer(activeIdStr, targetContainer);
            return;
        }

        if (targetContainer === TOP_LEVEL) {
            reorderTopLevel(activeIdStr, overIdStr);
        } else {
            reorderWithinGroup(targetContainer, activeIdStr, overIdStr);
        }
    };

    return (
        <div className="relative">
            <button
                className="btn btn-circle btn-outline btn-sm fixed top-4 left-4 z-[5]"
                onClick={() => setSettingsOpen(!settingsOpen)}
            >
                <SettingsIcon size={16} />
            </button>
            <div
                className={`w-full h-screen settings-drawer ${
                    settingsOpen ? 'sidebar-open' : ''
                }`}
            >
                <SettingsMenu />
                <div className="home-screen-grid grid h-screen grid-cols-[45%_55%] w-full bg-gradient-to-t from-[#660e99] to-[#941882]">
                    <div className="logo-col h-full flex flex-col justify-center items-center pb-8 pr-8 pl-8 pt-8">
                        <img
                            src="./resize-rabbit.png"
                            className="w-full max-w-full h-auto object-contain max-h-[50vh]"
                        />
                        <div className="text-container mt-4">
                            <span className="text-element text-4xl font-bold text-slate-200 tracking-wide font-noto">
                                Resize Rabbit
                            </span>
                        </div>
                        <div className="only-home flex flex-col">
                            <div className="uppercase text-2xs font-bold tracking-wide">
                                <div className="version-info flex justify-center gap-1">
                                    <div>
                                        <span className="lowercase">v</span>
                                        {getAppVersion()}
                                    </div>
                                    <div>•</div>
                                    <a
                                        className="link"
                                        target="_blank"
                                        href="https://github.com/rosscarlson/resize-rabbit"
                                    >
                                        {t('home.homepage')}
                                    </a>
                                </div>
                            </div>
                            <div className="divider w-20 self-center mt-2 mb-2" />
                            <div className="form-control flex w-full auto-resize-toggle">
                                <div
                                    className="tooltip tooltip-bottom self-center"
                                    data-tip="Process watching will automatically apply a profile when the application is started"
                                >
                                    <label className="label cursor-pointer justify-end gap-2 items-center p-0">
                                        <span className="label-text">
                                            <span className="badge font-semibold tracking-wide badge-outline badge-xs text-2xs uppercase inline mr-1">
                                                {t('home.beta')}
                                            </span>
                                            {t('home.processWatcher')}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-accent toggle-md"
                                            checked={
                                                getSettings()
                                                    .processWatcherEnabled
                                            }
                                            onChange={
                                                handleProcessWatcherToggle
                                            }
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col h-full overflow-y-auto pr-8 pt-12 pb-12 w-full">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={collisionDetectionStrategy}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={topLevelItems.map((item) => item.uuid)}
                                strategy={verticalListSortingStrategy}
                            >
                                {topLevelItems.map((item) =>
                                    item.type === 'group' ? (
                                        <GroupListItem
                                            key={item.uuid}
                                            group={item.group}
                                            members={profiles
                                                .filter((p) => p.groupUuid === item.group.uuid)
                                                .sort((a, b) => a.order - b.order)}
                                        />
                                    ) : (
                                        <ProfileListItem key={item.uuid} profile={item.profile} />
                                    )
                                )}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
                <button
                    className="btn btn-square btn-sm btn-outline fixed bottom-4 right-[4.5rem] z-[5]"
                    onClick={handleNewGroup}
                    title={t('group.buttons.new')}
                >
                    <FolderPlus size={20} />
                </button>
                <button
                    className="btn btn-square btn-sm btn-outline fixed bottom-4 right-4 z-[5]"
                    onClick={handleNewProfile}
                    title={t('profile.buttons.new')}
                >
                    <Plus size={20} />
                </button>
            </div>
        </div>
    );
};

export default HomeScreen;
