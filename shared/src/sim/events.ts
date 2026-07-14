import type { PlayerColor } from '../types/core';

/**
 * Discrete things that happened during one simulation tick. The client uses
 * these for sounds and effects; the server relays gameplay-relevant ones.
 */
export type SimEvent =
  | { type: 'clonePlaced'; owner: PlayerColor }
  | { type: 'cloneRemoved'; owner: PlayerColor }
  | { type: 'playerDied'; color: PlayerColor }
  | { type: 'levelReset' }
  | { type: 'levelComplete' };
