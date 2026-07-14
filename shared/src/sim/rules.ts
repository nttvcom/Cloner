import type { PlayerColor } from '../types/core';

/**
 * THE Golden Rule of Cloner: a player never collides with (or interacts with)
 * their own clone, and always fully collides with the other player's clone.
 *
 * Every collision / interaction query in the simulation MUST go through this
 * function. Never re-implement this comparison anywhere else.
 */
export function playerCollidesWithClone(
  player: PlayerColor,
  cloneOwner: PlayerColor,
): boolean {
  return player !== cloneOwner;
}
