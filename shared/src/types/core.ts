/** The two players differ only by color; color doubles as the player id. */
export type PlayerColor = 'blue' | 'red';

export const PLAYER_COLORS: readonly PlayerColor[] = ['blue', 'red'];

export interface Vec2 {
  x: number;
  y: number;
}

/** Axis-aligned bounding box; x/y is the top-left corner in screen coordinates. */
export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Unique id of an object placed in a level definition. */
export type ObjectId = string;
