import { VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import type { LevelDefinition } from '../types/level';

const FLOOR_HEIGHT = 40;
const FLOOR_TOP = VIEW_HEIGHT - FLOOR_HEIGHT;

/**
 * Flat sandbox level used by unit tests and the first playable build.
 * Not part of the real level set.
 */
export const TEST_LEVEL: LevelDefinition = {
  id: 'test',
  nameKey: 'level.test.name',
  cloneLimitPerPlayer: 1,
  spawns: {
    blue: { x: 100, y: FLOOR_TOP - 28 },
    red: { x: 200, y: FLOOR_TOP - 28 },
  },
  solids: [{ x: 0, y: FLOOR_TOP, width: VIEW_WIDTH, height: FLOOR_HEIGHT }],
  objects: [],
};
