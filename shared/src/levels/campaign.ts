import { VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import type { LevelDefinition } from '../types/level';

/**
 * The campaign. Geometry notes used while designing (from physics constants):
 * - jump apex ≈ 87px above the takeoff surface;
 * - a ledge is jumpable from the floor when its top y >= 413 (floor top 500);
 * - standing on a clone placed on the floor raises the reach to y >= 385;
 * - full-jump horizontal range ≈ 137px, safe gaps <= 110px.
 */

const FLOOR_H = 40;
const FLOOR_TOP = VIEW_HEIGHT - FLOOR_H; // 500
const EXIT_W = 36;
const EXIT_H = 44;
const ON_FLOOR_EXIT_Y = FLOOR_TOP - EXIT_H; // 456
const BUTTON_Y = FLOOR_TOP - 10; // plate sits on the floor

const fullFloor = { x: 0, y: FLOOR_TOP, width: VIEW_WIDTH, height: FLOOR_H };

/** 1 — movement, jumping, per-color exits. No clones required. */
const LEVEL_01: LevelDefinition = {
  id: 'level-01',
  nameKey: 'level.01.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 420, y: 440, width: 120, height: 60 }, // low step to hop over
  ],
  objects: [
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 700, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 780, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 2 — the Golden Rule as a ladder: the ledge (top 395) is unjumpable from the
 * floor but reachable from a clone. Your own clone is a ghost to you, so each
 * player climbs the OTHER's clone.
 */
const LEVEL_02: LevelDefinition = {
  id: 'level-02',
  nameKey: 'level.02.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 640, y: 395, width: 320, height: 105 }, // high shelf holding both exits
  ],
  objects: [
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 760, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 860, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 3 — held-only buttons: the door only stays open while weight is on the
 * plate, so a clone must be parked on it.
 */
const LEVEL_03: LevelDefinition = {
  id: 'level-03',
  nameKey: 'level.03.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 300, y: BUTTON_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 500, y: 380, width: 24, height: 120 } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 700, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 780, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 4 — lasers: the beam sweeps the floor to the right of the emitter. Two
 * suppressor buttons let the players ferry each other across, but only a
 * clone parked INSIDE the beam path lets everyone stand at the exits once
 * both buttons are released.
 */
const LEVEL_04: LevelDefinition = {
  id: 'level-04',
  nameKey: 'level.04.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 140, y: FLOOR_TOP - 28 }, red: { x: 190, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'laser', id: 'zap', origin: { x: 300, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'button', id: 'safety-left', position: { x: 60, y: BUTTON_Y }, targets: ['zap'] },
    { kind: 'button', id: 'safety-right', position: { x: 866, y: BUTTON_Y }, targets: ['zap'] },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 700, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 760, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 5 — elevator: powered only while a button is held. One button at the
 * bottom, one at the top; the players run the lift for each other.
 */
const LEVEL_05: LevelDefinition = {
  id: 'level-05',
  nameKey: 'level.05.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 674, y: 240, width: 286, height: 20 }, // upper ledge with the exits
  ],
  objects: [
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 580, y: 486 },
      to: { x: 580, y: 240 },
      speed: 90,
    },
    { kind: 'button', id: 'call-bottom', position: { x: 480, y: BUTTON_Y }, targets: ['lift'] },
    { kind: 'button', id: 'call-top', position: { x: 700, y: 230 }, targets: ['lift'] },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 800, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 870, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 6 — moving platform ferry over a pit with a vertical laser curtain. The
 * platform itself blocks the beam from below, shielding its riders — jumping
 * the pit on foot is lethal.
 */
const LEVEL_06: LevelDefinition = {
  id: 'level-06',
  nameKey: 'level.06.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 300, height: FLOOR_H },
    { x: 660, y: FLOOR_TOP, width: 300, height: FLOOR_H },
  ],
  objects: [
    { kind: 'laser', id: 'curtain', origin: { x: 480, y: VIEW_HEIGHT - 2 }, direction: 'up' },
    {
      kind: 'movingPlatform',
      id: 'ferry',
      size: { width: 80, height: 14 },
      path: [
        { x: 310, y: 460 },
        { x: 570, y: 460 },
      ],
      speed: 100,
    },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 760, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 850, y: ON_FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 7 — a two-story climb with clone limit 2: each player must leave one clone
 * at the base and one on the middle shelf for the OTHER player to climb, and
 * every placement teleports the placer back to the start.
 */
const LEVEL_07: LevelDefinition = {
  id: 'level-07',
  nameKey: 'level.07.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 340, y: 395, width: 200, height: 16 }, // shelf A (needs a floor clone)
    { x: 560, y: 290, width: 280, height: 16 }, // shelf B (needs a clone on A)
  ],
  objects: [
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 640, y: 290 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 720, y: 290 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 8 — finale: a door on a plate, a laser sweeping the exit hall and a hurdle.
 * Each player donates their only clone to one of the two plates, then both
 * cross together into the double exit.
 */
const LEVEL_08: LevelDefinition = {
  id: 'level-08',
  nameKey: 'level.08.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 130, y: FLOOR_TOP - 28 }, red: { x: 180, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 500, y: 440, width: 20, height: 60 }, // hurdle in front of the beam hall
  ],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 240, y: BUTTON_Y }, targets: ['gate'] },
    { kind: 'button', id: 'safety', position: { x: 56, y: BUTTON_Y }, targets: ['zap'] },
    { kind: 'door', id: 'gate', bounds: { x: 400, y: 360, width: 24, height: 140 } },
    { kind: 'laser', id: 'zap', origin: { x: 540, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'exit', id: 'exit-double', color: 'double', bounds: { x: 760, y: 440, width: 80, height: 60 } },
  ],
};

export const CAMPAIGN_LEVELS: readonly LevelDefinition[] = [
  LEVEL_01,
  LEVEL_02,
  LEVEL_03,
  LEVEL_04,
  LEVEL_05,
  LEVEL_06,
  LEVEL_07,
  LEVEL_08,
];
