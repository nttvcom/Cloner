/**
 * All physics tuning lives here — never inline these numbers in the step code.
 * Units: pixels, seconds.
 */

export const GRAVITY = 1800;

export const MOVE_SPEED = 220;

/** Negative = up (screen coordinates). */
export const JUMP_VELOCITY = -560;

export const MAX_FALL_SPEED = 900;

/** Duration of the place-clone teleport back to spawn, in simulation ticks. */
export const TELEPORT_DURATION_TICKS = 30;
