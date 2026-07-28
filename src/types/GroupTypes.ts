export interface Group {
    uuid: string;
    name: string;
    shortcut?: string;
    collapsed: boolean;
    // Position among other top-level entries (other groups, and ungrouped
    // profiles) — see Profile.order for the equivalent on the profile side.
    order: number;
}
