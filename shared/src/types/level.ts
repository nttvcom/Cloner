import type { AABB, ObjectId, PlayerColor, Vec2 } from './core';
import type { DoorColor } from './entities';

interface LevelObjectBase {
  id: ObjectId;
}

/**
 * Pressed by players or the OTHER player's clone (the Golden Rule applies to
 * button activation too). While active it powers every object in `targets`:
 * doors open, lasers stop firing, platforms/elevators run.
 */
export interface ButtonDef extends LevelObjectBase {
  kind: 'button';
  position: Vec2;
  targets: ObjectId[];
}

/** Button-controlled solid barrier. Not the level exit — see ExitDef. */
export interface DoorDef extends LevelObjectBase {
  kind: 'door';
  bounds: AABB;
  /** If true the door is open unless powered (inverted wiring). */
  openByDefault?: boolean;
}

/** The spec's colored "level complete" door. */
export interface ExitDef extends LevelObjectBase {
  kind: 'exit';
  bounds: AABB;
  /** 'double' requires both players inside simultaneously. */
  color: DoorColor;
}

/** Kills players instantly; clones survive and block the beam. */
export interface LaserDef extends LevelObjectBase {
  kind: 'laser';
  origin: Vec2;
  direction: 'up' | 'down' | 'left' | 'right';
}

/** Loops along `path` waypoints. Carries players and clones; blocked by clones. */
export interface MovingPlatformDef extends LevelObjectBase {
  kind: 'movingPlatform';
  size: { width: number; height: number };
  /** Waypoints of the top-left corner, visited in order, then looped. */
  path: Vec2[];
  /** Pixels per second. */
  speed: number;
}

/** Vertical platform that travels between two points while powered by a button. */
export interface ElevatorDef extends LevelObjectBase {
  kind: 'elevator';
  size: { width: number; height: number };
  from: Vec2;
  to: Vec2;
  /** Pixels per second. */
  speed: number;
}

export type LevelObjectDef =
  | ButtonDef
  | DoorDef
  | ExitDef
  | LaserDef
  | MovingPlatformDef
  | ElevatorDef;

export interface LevelDefinition {
  id: string;
  /** i18n key for the display name. */
  nameKey: string;
  /** Maximum clones a player may have placed at once (see open questions). */
  cloneLimitPerPlayer: number;
  spawns: Record<PlayerColor, Vec2>;
  /** Static solid geometry: floors, walls, ceilings. */
  solids: AABB[];
  objects: LevelObjectDef[];
}
