/** Fixed simulation rate, Hz. The simulation only ever advances in these steps. */
export const SIMULATION_TICK_RATE = 60;

export const SIMULATION_DELTA_MS = 1000 / SIMULATION_TICK_RATE;

/** How often the server broadcasts full-state snapshots, Hz. */
export const SNAPSHOT_SEND_RATE = 20;

/** Logical view size; every level fits this screen exactly (static camera). */
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;

export const ROOM_CODE_LENGTH = 6;

/** Side of a player/clone cube in pixels. Placeholder until the art pass. */
export const PLAYER_SIZE = 28;
