import type { PlayerColor } from '../types/core';

/**
 * THE Golden Rule of Cloner. In co-op: a player never collides with their own
 * clone and always fully collides with the other player's clone. In SOLO play
 * the rule inverts — the lone cube collides with (stands on, is blocked by) its
 * OWN clones, which is the whole basis of the single-player campaign.
 *
 * Every collision / interaction query in the simulation MUST go through this
 * function. Never re-implement this comparison anywhere else.
 */
export function playerCollidesWithClone(
  player: PlayerColor,
  cloneOwner: PlayerColor,
  solo = false,
): boolean {
  if (solo) return true;
  return player !== cloneOwner;
}
