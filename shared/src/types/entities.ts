import type { ObjectId, PlayerColor, Vec2 } from './core';

export interface PlayerState {
  color: PlayerColor;
  /** Top-left corner of the player's box. */
  position: Vec2;
  velocity: Vec2;
  isGrounded: boolean;
  isAlive: boolean;
  /** Ticks remaining in the teleport-back-to-spawn animation; 0 = fully in play. */
  teleportTicksLeft: number;
}

export interface CloneState {
  owner: PlayerColor;
  /** Top-left corner. Clones never move on their own. */
  position: Vec2;
  /** Rotation kept from the moment of placement, radians. */
  rotation: number;
  /** Id of the moving platform / elevator currently carrying the clone, if any. */
  attachedPlatformId: ObjectId | null;
}

/** Exit-door colors per the spec's LEVEL COMPLETE rules. */
export type DoorColor = 'blue' | 'red' | 'gray' | 'double';

/**
 * Full authoritative state of one simulation tick.
 * Small on purpose: sent as-is in online snapshots (see Decision 3 in ARCHITECTURE.md).
 */
export interface SimulationSnapshot {
  tick: number;
  players: Record<PlayerColor, PlayerState>;
  clones: CloneState[];
  /** Button id -> is currently pressed. */
  buttons: Record<ObjectId, boolean>;
  /** Barrier-door id -> is open (open doors are not solid). */
  doors: Record<ObjectId, boolean>;
  /** Laser id -> is firing. */
  lasers: Record<ObjectId, boolean>;
  /** Moving platform / elevator id -> current top-left position. */
  platforms: Record<ObjectId, Vec2>;
}
