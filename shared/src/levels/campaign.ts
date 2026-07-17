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
 * 6 — the elevator. The lift rides in a notch in the floor so its deck is
 * flush with the ground at the bottom (seamless boarding, no timing tricks).
 * One clone powers the lift, the other holds the upper gate open; both
 * players then ride up to the shared double exit. The powered lift shuttles,
 * so whoever placed the power clone can still catch the next trip up.
 */
const LEVEL_06: LevelDefinition = {
  id: 'level-06',
  nameKey: 'level.06.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 360, y: FLOOR_TOP - 28 }, red: { x: 420, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 580, height: FLOOR_H }, // floor left of the shaft
    { x: 670, y: FLOOR_TOP, width: 290, height: FLOOR_H }, // floor right of the shaft
    { x: 670, y: 240, width: 290, height: 20 }, // upper ledge, flush with the lift's right edge
  ],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 300, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'button', id: 'plate-door', position: { x: 180, y: PLATE_Y }, targets: ['gate-top'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 580, y: FLOOR_TOP }, // deck flush with the floor at the bottom
      to: { x: 580, y: 240 }, // deck level with the upper ledge at the top
      speed: 60,
    },
    { kind: 'door', id: 'gate-top', bounds: { x: 782, y: 140, width: 20, height: 100 } },
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
 * 11 — beam rider (reworked to be fair). A laser sweeps the exit ledge at
 * standing height, so anyone arriving up there without cover dies instantly.
 * The two floor plates fix that from safety: one clone powers the lift, the
 * other SUPPRESSES the beam. With both parked, the pair ride up under a dead
 * beam and walk to their exits. Neither clone alone is enough — the lift needs
 * power AND the ledge needs to be safe.
 */
const LEVEL_11: LevelDefinition = {
  id: 'level-11',
  nameKey: 'level.11.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 470, y: FLOOR_TOP - 28 }, red: { x: 510, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, // floor left of the shaft
    { x: 650, y: FLOOR_TOP, width: 310, height: FLOOR_H }, // floor right of the shaft
    { x: 650, y: 240, width: 310, height: 20 }, // exit ledge, flush with the lift
  ],
  objects: [
    { kind: 'button', id: 'plate-suppress', position: { x: 180, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'button', id: 'plate-lift', position: { x: 300, y: PLATE_Y }, targets: ['lift'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 560, y: FLOOR_TOP }, // deck flush with the floor at the bottom
      to: { x: 560, y: 240 }, // deck level with the exit ledge at the top
      speed: 65,
    },
    // Sweeps the ledge 14px above its surface — lethal to anyone standing there.
    { kind: 'laser', id: 'zap', origin: { x: 952, y: 226 }, direction: 'left' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 720, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 830, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
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
 * 14 — inverted bridge: two laser pits separate the pair from their exits (red
 * far left, blue far right). Each pit is spanned by an inverted door that CLOSES
 * into a safe bridge when its plate is held. The trick is the crossing: blue's
 * clone holds the plate that bridges RED's pit, and red's the one that bridges
 * BLUE's — and each then vaults the partner's solid clone on the way across.
 */
const LEVEL_14: LevelDefinition = {
  id: 'level-14',
  nameKey: 'level.14.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 440, y: FLOOR_TOP - 28 }, red: { x: 510, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 200, height: FLOOR_H }, // left floor (red exit)
    { x: 400, y: FLOOR_TOP, width: 160, height: FLOOR_H }, // center floor (spawns + plates)
    { x: 760, y: FLOOR_TOP, width: 200, height: FLOOR_H }, // right floor (blue exit)
  ],
  objects: [
    { kind: 'button', id: 'plate-left', position: { x: 428, y: PLATE_Y }, targets: ['bridge-left'] },
    { kind: 'button', id: 'plate-right', position: { x: 510, y: PLATE_Y }, targets: ['bridge-right'] },
    { kind: 'door', id: 'bridge-left', bounds: { x: 200, y: FLOOR_TOP, width: 200, height: FLOOR_H }, openByDefault: true },
    { kind: 'door', id: 'bridge-right', bounds: { x: 560, y: FLOOR_TOP, width: 200, height: FLOOR_H }, openByDefault: true },
    { kind: 'laser', id: 'pit-left', origin: { x: 210, y: 524 }, direction: 'right' },
    { kind: 'laser', id: 'pit-right', origin: { x: 570, y: 524 }, direction: 'right' },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 60, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 880, y: FLOOR_EXIT_Y, width: EXIT_W, height: EXIT_H } },
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
 * 18 — the conveyor: spawns are on the RIGHT, plates further right, lift to
 * the left — so a placed clone (its solid outline blocks the OTHER player) is
 * always behind the pair as they head for the lift. One clone powers the lift,
 * the other suppresses the ceiling laser that sweeps the exit ledge; the pair
 * then ride up in a floor notch and walk left under the dead beam.
 */
const LEVEL_18: LevelDefinition = {
  id: 'level-18',
  nameKey: 'level.18.name',
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 680, y: FLOOR_TOP - 28 }, red: { x: 712, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, // floor left of the shaft
    { x: 650, y: FLOOR_TOP, width: 310, height: FLOOR_H }, // floor right of the shaft
    { x: 0, y: 240, width: 560, height: 20 }, // exit ledge, flush with the lift
  ],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 800, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'button', id: 'plate-suppress', position: { x: 880, y: PLATE_Y }, targets: ['zap'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 560, y: FLOOR_TOP }, // deck flush with the floor at the bottom
      to: { x: 560, y: 240 }, // deck level with the exit ledge at the top
      speed: 60,
    },
    // Ceiling beam drilling down onto the ledge between the exits and the lift.
    { kind: 'laser', id: 'zap', origin: { x: 300, y: 180 }, direction: 'down' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 80, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 180, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
  ],
};

/**
 * 19 — crossfire: TWO ceiling lasers rake the exit ledge, so three clone jobs
 * are needed — power the lift and suppress both beams — but only two players.
 * With a clone limit of two, one player spends both clones (power + one beam)
 * while the partner suppresses the other; then the pair ride up and split to
 * their exits under dead beams.
 */
const LEVEL_19: LevelDefinition = {
  id: 'level-19',
  nameKey: 'level.19.name',
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 680, y: FLOOR_TOP - 28 }, red: { x: 712, y: FLOOR_TOP - 28 } },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H },
    { x: 650, y: FLOOR_TOP, width: 310, height: FLOOR_H },
    { x: 0, y: 240, width: 560, height: 20 }, // exit ledge, flush with the lift
  ],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 760, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'button', id: 'plate-zapA', position: { x: 840, y: PLATE_Y }, targets: ['zapA'] },
    { kind: 'button', id: 'plate-zapB', position: { x: 920, y: PLATE_Y }, targets: ['zapB'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 560, y: FLOOR_TOP },
      to: { x: 560, y: 240 },
      speed: 60,
    },
    { kind: 'laser', id: 'zapA', origin: { x: 200, y: 180 }, direction: 'down' },
    { kind: 'laser', id: 'zapB', origin: { x: 420, y: 180 }, direction: 'down' },
    { kind: 'exit', id: 'exit-blue', color: 'blue', bounds: { x: 60, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
    { kind: 'exit', id: 'exit-red', color: 'red', bounds: { x: 300, y: 240 - EXIT_H, width: EXIT_W, height: EXIT_H } },
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
