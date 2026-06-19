// Stable refs registered by RadioContext and PlayerContext at mount.
// Lets each context pause the other without circular imports or prop drilling.
// RadioProvider is an ancestor of PlayerProvider, so they cannot directly
// call each other's hooks — this module bridges the gap.
export const radioPause: { fn: () => void } = { fn: () => {} };
export const playerPause: { fn: () => void } = { fn: () => {} };
