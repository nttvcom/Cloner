import { VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import type { LevelDefinition } from '../types/level';

/**
 * The 20-level campaign. Every level REQUIRES clones and cooperation.
 *
 * Physics cheat-sheet used for all geometry (floor top = 500, player = 28,
 * jump apex ≈ 87px):
 * - reachable ledge tops: from floor >= 413; from a clone on the floor
 *   >= 385; from a stacked clone (partner's clone on top of yours) >= 357;
 * - a barrier is unjumpable when its top < 413 (use <= 405);
 * - horizontal jump reach ~137px (velocity is instant), safe gaps <= 110;
 * - floor-level laser: origin y = 486, standing players always intersect;
 * - a clone/platform blocks a beam for everything past it;
 * - shield clones must be placed while the beam is suppressed (walking into
 *   a live beam kills before you can press E);
 * - placing a clone teleports the owner to spawn — every solution below
 *   accounts for the walk back.
 */

const FLOOR_H = 40;
const FLOOR_TOP = VIEW_HEIGHT - FLOOR_H; // 500
const EXIT_W = 36;
const EXIT_H = 44;
const FLOOR_EXIT_Y = FLOOR_TOP - EXIT_H; // 456
const PLATE_Y = FLOOR_TOP - 10; // a pressure plate sitting on the floor

const fullFloor = { x: 0, y: FLOOR_TOP, width: VIEW_WIDTH, height: FLOOR_H };

/**
 * 1 — the Golden Rule as a ladder. The shelf (top 395) is unjumpable from
 * the floor but reachable from a clone; your own clone is a ghost, so each
 * player must climb the OTHER's clone.
 */
const LEVEL_01: LevelDefinition = {
  id: 'level-01',
  nameKey: 'level.01.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 640, y: 395, width: 320, height: 105 }],
  objects: [
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 760, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 860, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 2 — held-only plates. The door (top 380, unjumpable) only stays open
 * while weight is on the plate, and both exits are beyond it — a clone must
 * be parked on the plate.
 */
const LEVEL_02: LevelDefinition = {
  id: 'level-02',
  nameKey: 'level.02.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 300, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 500, y: 380, width: 24, height: 120 } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 700, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 780, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 3 — teleport-after-place is a feature. Red's exit is on a high shelf
 * (needs blue's clone); blue's exit is near the spawn — placing the clone
 * teleports blue right where they need to be.
 */
const LEVEL_03: LevelDefinition = {
  id: 'level-03',
  nameKey: 'level.03.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 700, y: 395, width: 260, height: 105 }, { x: 430, y: 440, width: 30, height: 60 }],
  objects: [
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 800, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 300, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 4 — the airlock. Door A has plates on BOTH sides (humans ferry each other
 * through); door B has a single plate and needs a parked clone that the
 * non-owner then hops over.
 */
const LEVEL_04: LevelDefinition = {
  id: 'level-04',
  nameKey: 'level.04.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plateA1', position: { x: 300, y: PLATE_Y }, targets: ['gateA'] },
    { kind: 'button', id: 'plateA2', position: { x: 470, y: PLATE_Y }, targets: ['gateA'] },
    { kind: 'door', id: 'gateA', bounds: { x: 400, y: 360, width: 24, height: 140 } },
    { kind: 'button', id: 'plateB', position: { x: 560, y: PLATE_Y }, targets: ['gateB'] },
    { kind: 'door', id: 'gateB', bounds: { x: 650, y: 360, width: 24, height: 140 } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 780, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 850, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 5 — lasers. Two suppressor plates let the players ferry each other
 * across, but only a clone parked INSIDE the (suppressed) beam path lets
 * everyone stand at the exits once both plates are released.
 */
const LEVEL_05: LevelDefinition = {
  id: 'level-05',
  nameKey: 'level.05.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 140, y: FLOOR_TOP - 28 }, red: { x: 190, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'laser', id: 'zap', origin: { x: 300, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'button', id: 'safety-left', position: { x: 60, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'button', id: 'safety-right', position: { x: 866, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 700, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 760, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 6 — the elevator. Spawns sit right next to the lift so the
 * place-teleport-run-board loop is comfortable: one clone powers the lift,
 * the other holds the door on the upper ledge open. Both players ride.
 */
const LEVEL_06: LevelDefinition = {
  id: 'level-06',
  nameKey: 'level.06.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 500, y: FLOOR_TOP - 28 }, red: { x: 540, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 674, y: 240, width: 286, height: 20 }],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 380, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'button', id: 'plate-door', position: { x: 300, y: PLATE_Y }, targets: ['gate-top'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 580, y: 486 },
      to: { x: 580, y: 240 },
      speed: 60,
    },
    { kind: 'door', id: 'gate-top', bounds: { x: 780, y: 140, width: 20, height: 100 } },
    { kind: 'exit', id: 'exit-double', color: 'double', bounds: { x: 860, y: 196, width: 72, height: EXIT_H } },
  ],
};

/**
 * 7 — the ferry shields its riders from the floor-mounted laser curtain,
 * but boarding is gated: a clone must hold the gate plate first.
 */
const LEVEL_07: LevelDefinition = {
  id: 'level-07',
  nameKey: 'level.07.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 40, y: FLOOR_TOP - 28 }, red: { x: 80, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 300, height: FLOOR_H },
    { x: 660, y: FLOOR_TOP, width: 300, height: FLOOR_H },
  ],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 250, y: 360, width: 20, height: 140 } },
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
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 760, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 850, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 8 — stacking. Red places their clone standing ON blue's clone; only blue
 * can climb the resulting 2-story tower (each rung belongs to the partner)
 * to the tall pillar (365). Blue's second clone gives red the usual ladder
 * to the lower ledge (395).
 */
const LEVEL_08: LevelDefinition = {
  id: 'level-08',
  nameKey: 'level.08.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 120, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 420, y: 365, width: 110, height: 135 }, { x: 760, y: 395, width: 200, height: 105 }],
  objects: [
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 455, y: 365 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 830, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 9 — the ferry again, now through TWO curtains, with the boarding gate
 * further from the plate. Same skills, less hand-holding.
 */
const LEVEL_09: LevelDefinition = {
  id: 'level-09',
  nameKey: 'level.09.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 30, y: FLOOR_TOP - 28 }, red: { x: 70, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 280, height: FLOOR_H },
    { x: 640, y: FLOOR_TOP, width: 320, height: FLOOR_H },
  ],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 100, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 230, y: 360, width: 20, height: 140 } },
    { kind: 'laser', id: 'curtain-a', origin: { x: 420, y: VIEW_HEIGHT - 2 }, direction: 'up' },
    { kind: 'laser', id: 'curtain-b', origin: { x: 560, y: VIEW_HEIGHT - 2 }, direction: 'up' },
    {
      kind: 'movingPlatform',
      id: 'ferry',
      size: { width: 90, height: 14 },
      path: [
        { x: 300, y: 460 },
        { x: 620, y: 460 },
      ],
      speed: 90,
    },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 740, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 840, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 10 — tandem. Blue's clone parks on the door plate (holding it open
 * forever); red carries their clone to the far shelf for blue. Exits are on
 * opposite sides of the map.
 */
const LEVEL_10: LevelDefinition = {
  id: 'level-10',
  nameKey: 'level.10.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 250, y: FLOOR_TOP - 28 }, red: { x: 290, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 40, y: 440, width: 180, height: 60 }, { x: 740, y: 395, width: 220, height: 105 }],
  objects: [
    { kind: 'button', id: 'plate-left', position: { x: 380, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'button', id: 'plate-right', position: { x: 560, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 480, y: 360, width: 24, height: 140 } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 90, y: 440 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 820, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 11 — beam rider. A laser crosses the lift shaft at height 346; a clone
 * placed ON the lift deck rides along and shields everyone standing behind
 * it. The second clone powers the lift from the plate.
 */
const LEVEL_11: LevelDefinition = {
  id: 'level-11',
  nameKey: 'level.11.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 500, y: FLOOR_TOP - 28 }, red: { x: 530, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 654, y: 200, width: 306, height: 20 }],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 450, y: PLATE_Y }, targets: ['lift'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 560, y: 486 },
      to: { x: 560, y: 200 },
      speed: 70,
    },
    { kind: 'laser', id: 'zap', origin: { x: 952, y: 346 }, direction: 'left' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 750, y: 200 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 850, y: 200 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 12 — round trip: the plate Q both OPENS the gate and CLOSES the inverted
 * door I. The Q clone must later be REMOVED (F) to open I, and a second
 * clone parked beyond I re-opens the gate for the stranded player.
 */
const LEVEL_12: LevelDefinition = {
  id: 'level-12',
  nameKey: 'level.12.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 100, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate-q', position: { x: 400, y: PLATE_Y }, targets: ['gate', 'inverted'] },
    { kind: 'door', id: 'gate', bounds: { x: 500, y: 360, width: 24, height: 140 } },
    { kind: 'door', id: 'inverted', bounds: { x: 700, y: 360, width: 24, height: 140 }, openByDefault: true },
    { kind: 'button', id: 'plate-i', position: { x: 780, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 860, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 910, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 13 — high ground: a plate ON TOP of a clone-ladder ledge holds the exit
 * gate open. One clone is the ladder, the other parks on the high plate.
 */
const LEVEL_13: LevelDefinition = {
  id: 'level-13',
  nameKey: 'level.13.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 100, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 380, y: 395, width: 120, height: 105 }],
  objects: [
    { kind: 'button', id: 'plate-top', position: { x: 410, y: 385 }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 700, y: 380, width: 24, height: 120 } },
    { kind: 'exit', id: 'exit-double', color: 'double', bounds: { x: 800, y: 440, width: 80, height: 60 } },
  ],
};

/**
 * 14 — stop the lift: a clone placed on the overhanging ledge JAMS the
 * rising elevator, turning it into a bridge at ledge height. Requires the
 * clone stack to reach the overhang, a jam clone, and one player holding
 * the power plate. Exits split: blue high, red low.
 */
const LEVEL_14: LevelDefinition = {
  id: 'level-14',
  nameKey: 'level.14.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 40, y: FLOOR_TOP - 28 }, red: { x: 80, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 350, y: 360, width: 110, height: 14 }, // overhang: pokes into the shaft (450..460)
    { x: 550, y: 360, width: 160, height: 14 }, // landing ledge with blue's exit
  ],
  objects: [
    { kind: 'button', id: 'plate-w', position: { x: 150, y: PLATE_Y }, targets: ['lift'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 100, height: 14 },
      from: { x: 450, y: 486 },
      to: { x: 450, y: 160 },
      speed: 80,
    },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 610, y: 360 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 200, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 15 — the vault: Q suppresses the laser AND closes the inverted door.
 * Under suppression blue walks into the beam corridor and parks a shield
 * clone flush against the emitter; removing the Q clone then opens the way
 * out — through a gate danced open via its two plates.
 */
const LEVEL_15: LevelDefinition = {
  id: 'level-15',
  nameKey: 'level.15.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 100, y: FLOOR_TOP - 28 } },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate-q', position: { x: 430, y: PLATE_Y }, targets: ['inverted', 'zap'] },
    { kind: 'button', id: 'plate-g1', position: { x: 390, y: PLATE_Y - 0 }, targets: ['gate'] },
    { kind: 'button', id: 'plate-g2', position: { x: 620, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 520, y: 360, width: 24, height: 140 } },
    { kind: 'laser', id: 'zap', origin: { x: 560, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'door', id: 'inverted', bounds: { x: 700, y: 360, width: 24, height: 140 }, openByDefault: true },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 800, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 860, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 16 — climbing party: four clones, two routes. Blue climbs the stack in
 * the west (blue base + red stacked on top); red climbs blue's second clone
 * in the east — placed and reached under laser suppression held in turns.
 */
const LEVEL_16: LevelDefinition = {
  id: 'level-16',
  nameKey: 'level.16.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 220, y: FLOOR_TOP - 28 }, red: { x: 260, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 170, y: 365, width: 140, height: 14 }, { x: 700, y: 395, width: 260, height: 105 }],
  objects: [
    { kind: 'button', id: 'safety', position: { x: 60, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 480, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 200, y: 365 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 790, y: 395 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 17 — watchtower: the stack leads to a pillar-top plate; a clone parked
 * there suppresses the exit-hall laser AND holds the gate open at once.
 */
const LEVEL_17: LevelDefinition = {
  id: 'level-17',
  nameKey: 'level.17.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 60, y: FLOOR_TOP - 28 }, red: { x: 100, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 420, y: 365, width: 120, height: 135 }],
  objects: [
    { kind: 'button', id: 'plate-top', position: { x: 450, y: 355 }, targets: ['gate', 'zap'] },
    { kind: 'door', id: 'gate', bounds: { x: 700, y: 380, width: 24, height: 120 } },
    { kind: 'laser', id: 'zap', origin: { x: 580, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 790, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 850, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 18 — the conveyor: spawns are on the RIGHT. One clone powers the lift,
 * the ledge above is swept by a ceiling laser — the shield clone is placed
 * on the ledge while the partner holds the suppressor plate below.
 */
const LEVEL_18: LevelDefinition = {
  id: 'level-18',
  nameKey: 'level.18.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 790, y: FLOOR_TOP - 28 }, red: { x: 705, y: FLOOR_TOP - 28 } },
  solids: [{ x: 700, y: FLOOR_TOP, width: 260, height: FLOOR_H }, { x: 480, y: 240, width: 340, height: 20 }],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 740, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'button', id: 'safety', position: { x: 908, y: PLATE_Y }, targets: ['zap'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 830, y: 486 },
      to: { x: 830, y: 240 },
      speed: 60,
    },
    { kind: 'laser', id: 'zap', origin: { x: 600, y: 180 }, direction: 'down' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 500, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 550, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 19 — clockwork: the unwired lift launches immediately, so it must be
 * JAMMED low from the reachable perch, loaded with a shield clone on each
 * half of the deck (each player re-boards via the perch while the jam
 * holds), then released with F. The twin side beams are blocked by the two
 * riding clones; players squeeze between them.
 */
const LEVEL_19: LevelDefinition = {
  id: 'level-19',
  nameKey: 'level.19.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 340, y: FLOOR_TOP - 28 }, red: { x: 380, y: FLOOR_TOP - 28 } },
  solids: [
    fullFloor,
    { x: 380, y: 438, width: 80, height: 14 }, // perch overhanging the shaft
    { x: 320, y: 220, width: 130, height: 20 }, // top-left ledge (blue exit)
    { x: 550, y: 220, width: 130, height: 20 }, // top-right ledge (red exit)
  ],
  objects: [
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 100, height: 14 },
      from: { x: 450, y: 486 },
      to: { x: 450, y: 220 },
      speed: 30,
    },
    { kind: 'laser', id: 'beam-left', origin: { x: 8, y: 370 }, direction: 'right' },
    { kind: 'laser', id: 'beam-right', origin: { x: 952, y: 300 }, direction: 'left' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 350, y: 220 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 600, y: 220 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 20 — hand in hand: everything at once. The clone ladder over the wall
 * stays for BOTH return trips; the suppressed-shield trick guards the exit
 * hall; the finale is walked together.
 */
const LEVEL_20: LevelDefinition = {
  id: 'level-20',
  nameKey: 'level.20.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 40, y: FLOOR_TOP - 28 }, red: { x: 80, y: FLOOR_TOP - 28 } },
  solids: [fullFloor, { x: 350, y: 395, width: 40, height: 105 }],
  objects: [
    { kind: 'button', id: 'safety', position: { x: 520, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 600, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 800, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 860, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
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
  LEVEL_09,
  LEVEL_10,
  LEVEL_11,
  LEVEL_12,
  LEVEL_13,
  LEVEL_14,
  LEVEL_15,
  LEVEL_16,
  LEVEL_17,
  LEVEL_18,
  LEVEL_19,
  LEVEL_20,
];
