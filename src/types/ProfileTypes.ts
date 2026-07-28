export interface Profile {
    uuid: string;
    name: string;
    processName: string;
    auto: boolean;
    delay: number;
    // Optional: unset means "leave the window's current size alone, only
    // reposition it." Position stays mandatory.
    windowHeight?: number;
    windowWidth?: number;
    windowPosY: number;
    windowPosX: number;
    removeBorders: boolean;
    shiftTitlebarOffscreen: boolean;
    shortcut?: string;
    // Unset = sits in the top-level list alongside groups. Set = a member of
    // that group, shown nested under it instead.
    groupUuid?: string;
    // Sibling position: among other top-level entries (groups + ungrouped
    // profiles) when ungrouped, or among the other profiles in the same
    // group when grouped. Never compared across those two scopes.
    order: number;
}