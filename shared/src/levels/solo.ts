import { VIEW_HEIGHT, VIEW_WIDTH } from '../constants/game';
import type { LevelDefinition, LevelObjectDef } from '../types/level';

/**
 * SINGLE-PLAYER campaign. One blue cube; the Golden Rule is inverted, so the
 * cube collides with its OWN clones — every puzzle is built on that.
 *
 * The clone mechanic is unchanged from co-op: placing a clone freezes a copy
 * where you stand and teleports YOU back to spawn. So a solo solution is a
 * sequence of runs from spawn, each placing a clone that extends where the
 * next run can reach — steps to climb, weight for plates, walls to block.
 * Clones can be removed by touching them (reuse under a tight clone limit is
 * the source of the hardest late puzzles).
 *
 * Physics cheat-sheet (identical engine to co-op):
 * - floor top 500, cube 28, jump apex 87px.
 * - reachable ledge tops: from floor >= 413; standing on a floor clone >= 385;
 *   each extra rung (a clone/shelf) adds ~28 of height and 87 of new jump.
 * - a ledge/shelf with top < 413 is unreachable from the floor (needs a clone).
 * - safe horizontal jump gap <= 110px.
 * - a clone on a plate holds a door / suppresses a laser (weight sensor).
 * - solo laser puzzles use suppressor plates, never "shield" clones: you would
 *   have to stand IN a beam to drop a clone there, which kills you first.
 */

const FLOOR_H = 40;
const FLOOR_TOP = VIEW_HEIGHT - FLOOR_H; // 500
const EXIT_W = 36;
const EXIT_H = 44;
const PLATE_Y = FLOOR_TOP - 10;
const SPAWN_Y = FLOOR_TOP - 28;

const fullFloor = { x: 0, y: FLOOR_TOP, width: VIEW_WIDTH, height: FLOOR_H };
/** Red is absent in solo; give it a harmless off-screen spawn slot. */
const NO_RED = { x: 0, y: 0 };

/** A climbable ledge: a solid wall from `topY` down to the screen bottom. */
function block(x: number, topY: number, width: number): { x: number; y: number; width: number; height: number } {
  return { x, y: topY, width, height: VIEW_HEIGHT - topY };
}

/** Solo exits are gray ("the player") — only one cube exists. */
function exit(id: string, x: number, topY: number): LevelObjectDef {
  return { kind: 'exit', id, color: 'gray', bounds: { x, y: topY - EXIT_H, width: EXIT_W, height: EXIT_H } };
}

/**
 * S1 — First Step. The exit ledge (top 400) is just above a standing jump.
 * Drop one clone at its foot, run back, climb it, hop up. Teaches place->climb.
 */
const SOLO_01: LevelDefinition = {
  id: 'solo-01',
  nameKey: 'solo.01.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, { x: 700, y: 400, width: 260, height: 100 }],
  objects: [exit('exit', 800, 400)],
};

/**
 * S2 — Doorstop. A held door blocks the exit. Park a clone on the plate to
 * keep it open — but the clone is solid to YOU now, so the plate sits behind
 * spawn and you never have to cross your own weight.
 */
const SOLO_02: LevelDefinition = {
  id: 'solo-02',
  nameKey: 'solo.02.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 260, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 540, y: 380, width: 24, height: 120 } },
    exit('exit', 820, FLOOR_TOP),
  ],
};

/**
 * S3 — Suppressor. A floor laser bars the hall. A clone on the plate behind
 * spawn kills the beam; then walk straight through.
 */
const SOLO_03: LevelDefinition = {
  id: 'solo-03',
  nameKey: 'solo.03.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 460, y: FLOOR_TOP - 14 }, direction: 'right' },
    exit('exit', 820, FLOOR_TOP),
  ],
};

/**
 * S4 — Two Steps. A staircase of two wide ledges. Clone #1 at the foot of the
 * lower ledge lifts you onto it; clone #2, placed on that ledge against the
 * upper wall, lifts you to the exit. Each clone sits flush against a tall wall
 * so there is no ledge to overshoot — logic, not precision.
 */
const SOLO_04: LevelDefinition = {
  id: 'solo-04',
  nameKey: 'solo.04.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [
    fullFloor,
    { x: 380, y: 400, width: 260, height: 100 }, // ledge 1 (reach via clone #1 at its foot)
    { x: 640, y: 300, width: 320, height: 200 }, // exit ledge (reach via clone #2)
  ],
  objects: [exit('exit', 780, 300)],
};

/**
 * S5 — Long Climb. Three wide ledges, each a clone-step above the last. Placing
 * the upper clones means re-climbing everything you have already built and
 * running back to spawn — the shape of every longer solo puzzle.
 */
const SOLO_05: LevelDefinition = {
  id: 'solo-05',
  nameKey: 'solo.05.name',
  solo: true,
  cloneLimitPerPlayer: 3,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [
    fullFloor,
    { x: 300, y: 400, width: 220, height: 100 }, // ledge 1
    { x: 520, y: 300, width: 220, height: 200 }, // ledge 2
    { x: 740, y: 200, width: 220, height: 300 }, // exit ledge
  ],
  objects: [exit('exit', 830, 200)],
};

/**
 * S6 — Lift Off. Solo elevator: a clone on the plate powers the lift; board it
 * in the floor notch and ride up to the exit ledge. The powered lift shuttles,
 * so you always catch the next trip.
 */
const SOLO_06: LevelDefinition = {
  id: 'solo-06',
  nameKey: 'solo.06.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H },
    { x: 650, y: FLOOR_TOP, width: 310, height: FLOOR_H },
    { x: 650, y: 240, width: 310, height: 20 },
  ],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    {
      kind: 'elevator',
      id: 'lift',
      size: { width: 90, height: 14 },
      from: { x: 560, y: FLOOR_TOP },
      to: { x: 560, y: 240 },
      speed: 60,
    },
    exit('exit', 780, 240),
  ],
};

/** S7 — Doorstep Climb. A door up on the exit ledge is held by a clone on a
 * floor plate; a second clone is the step that gets you onto the ledge. */
const SOLO_07: LevelDefinition = {
  id: 'solo-07',
  nameKey: 'solo.07.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(500, 400, 460)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 700, y: 300, width: 24, height: 100 } },
    exit('exit', 880, 400),
  ],
};

/** S8 — Airlock. Two doors in series, each held by its own floor plate behind
 * spawn; hold both, then walk straight through. */
const SOLO_08: LevelDefinition = {
  id: 'solo-08',
  nameKey: 'solo.08.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 260, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plateA', position: { x: 80, y: PLATE_Y }, targets: ['gateA'] },
    { kind: 'button', id: 'plateB', position: { x: 160, y: PLATE_Y }, targets: ['gateB'] },
    { kind: 'door', id: 'gateA', bounds: { x: 400, y: 380, width: 24, height: 120 } },
    { kind: 'door', id: 'gateB', bounds: { x: 560, y: 380, width: 24, height: 120 } },
    exit('exit', 820, FLOOR_TOP),
  ],
};

/** S9 — Overwatch. A laser rakes the exit ledge at head height; a clone on the
 * floor plate suppresses it, a second clone lifts you up to walk it. */
const SOLO_09: LevelDefinition = {
  id: 'solo-09',
  nameKey: 'solo.09.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(500, 400, 460)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 900, y: 386 }, direction: 'left' },
    exit('exit', 600, 400),
  ],
};

/** S10 — Lift Gate. A clone powers the lift, another holds open the gate at the
 * top; ride up and walk through. */
const SOLO_10: LevelDefinition = {
  id: 'solo-10',
  nameKey: 'solo.10.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [{ x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, block(650, 240, 310)],
  objects: [
    { kind: 'button', id: 'plate-door', position: { x: 150, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 240 }, speed: 60 },
    { kind: 'door', id: 'gate', bounds: { x: 760, y: 140, width: 24, height: 100 } },
    exit('exit', 860, 240),
  ],
};

/** S11 — Grand Staircase. Four wide ledges, four clone-steps: the long build. */
const SOLO_11: LevelDefinition = {
  id: 'solo-11',
  nameKey: 'solo.11.name',
  solo: true,
  cloneLimitPerPlayer: 4,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(250, 400, 180), block(430, 320, 180), block(610, 240, 180), block(790, 160, 170)],
  objects: [exit('exit', 870, 160)],
};

/** S12 — Crossfire Lift. The lift climbs into a ledge raked by a laser; suppress
 * it and power the lift, then ride up. */
const SOLO_12: LevelDefinition = {
  id: 'solo-12',
  nameKey: 'solo.12.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [{ x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, block(650, 240, 310)],
  objects: [
    { kind: 'button', id: 'plate-suppress', position: { x: 150, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 240 }, speed: 60 },
    { kind: 'laser', id: 'zap', origin: { x: 900, y: 226 }, direction: 'left' },
    exit('exit', 780, 240),
  ],
};

/** S13 — Doorstep II. A two-step staircase to a high ledge whose exit hides
 * behind a gate held from a floor plate. */
const SOLO_13: LevelDefinition = {
  id: 'solo-13',
  nameKey: 'solo.13.name',
  solo: true,
  cloneLimitPerPlayer: 3,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(400, 400, 200), block(600, 300, 360)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 760, y: 200, width: 24, height: 100 } },
    exit('exit', 860, 300),
  ],
};

/** S14 — Firewalk. A floor laser bars the hall to the climb spot; suppress it
 * from behind spawn, then reach and climb the exit ledge. */
const SOLO_14: LevelDefinition = {
  id: 'solo-14',
  nameKey: 'solo.14.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(700, 400, 260)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 120, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 400, y: FLOOR_TOP - 14 }, direction: 'right' },
    exit('exit', 820, 400),
  ],
};

/** S15 — Elevator Chain. Ride a lift to a mid ledge, then a clone-step from
 * that ledge reaches the exit — build the step from up top, ride up again. */
const SOLO_15: LevelDefinition = {
  id: 'solo-15',
  nameKey: 'solo.15.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [{ x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, block(650, 300, 200), block(850, 200, 110)],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 300 }, speed: 60 },
    exit('exit', 900, 200),
  ],
};

/** S16 — Overwatch II. Climb to a ledge, use its plate to kill the laser raking
 * the NEXT ledge, then build a step and climb on. */
const SOLO_16: LevelDefinition = {
  id: 'solo-16',
  nameKey: 'solo.16.name',
  solo: true,
  cloneLimitPerPlayer: 3,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(350, 400, 200), block(550, 300, 410)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 450, y: 390 }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 900, y: 286 }, direction: 'left' },
    exit('exit', 860, 300),
  ],
};

/** S17 — Order of Things. Two doors, two plates, but a clone on the near plate
 * walls off the far one: you must deduce the placement order. */
const SOLO_17: LevelDefinition = {
  id: 'solo-17',
  nameKey: 'solo.17.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'plateB', position: { x: 150, y: PLATE_Y }, targets: ['gateB'] },
    { kind: 'button', id: 'plateA', position: { x: 300, y: PLATE_Y }, targets: ['gateA'] },
    { kind: 'door', id: 'gateA', bounds: { x: 500, y: 380, width: 24, height: 120 } },
    { kind: 'door', id: 'gateB', bounds: { x: 600, y: 380, width: 24, height: 120 } },
    exit('exit', 820, FLOOR_TOP),
  ],
};

/** S18 — Inverted Bridge. A pit with a laser at the bottom. A clone on the plate
 * CLOSES an inverted door that fills the pit into a safe bridge. */
const SOLO_18: LevelDefinition = {
  id: 'solo-18',
  nameKey: 'solo.18.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 430, height: FLOOR_H },
    { x: 610, y: FLOOR_TOP, width: 350, height: FLOOR_H },
  ],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 150, y: PLATE_Y }, targets: ['bridge'] },
    { kind: 'door', id: 'bridge', bounds: { x: 430, y: FLOOR_TOP, width: 180, height: FLOOR_H }, openByDefault: true },
    { kind: 'laser', id: 'pit', origin: { x: 440, y: 524 }, direction: 'right' },
    exit('exit', 820, FLOOR_TOP),
  ],
};

/** S19 — Powerhouse. Suppress the shaft laser and power the lift from the floor,
 * ride up, then hold the exit gate with a clone placed on the top ledge. */
const SOLO_19: LevelDefinition = {
  id: 'solo-19',
  nameKey: 'solo.19.name',
  solo: true,
  cloneLimitPerPlayer: 3,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [{ x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H }, block(650, 240, 310)],
  objects: [
    { kind: 'button', id: 'plate-suppress', position: { x: 150, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 240 }, speed: 60 },
    { kind: 'laser', id: 'zap', origin: { x: 900, y: 360 }, direction: 'left' },
    { kind: 'button', id: 'plate-gate', position: { x: 700, y: 230 }, targets: ['gate'] },
    { kind: 'door', id: 'gate', bounds: { x: 800, y: 140, width: 24, height: 100 } },
    exit('exit', 880, 240),
  ],
};

/** S20 — Twin Bridges. Two laser pits, two inverted-door bridges, two plates. */
const SOLO_20: LevelDefinition = {
  id: 'solo-20',
  nameKey: 'solo.20.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 230, y: SPAWN_Y }, red: NO_RED },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 300, height: FLOOR_H },
    { x: 480, y: FLOOR_TOP, width: 180, height: FLOOR_H },
    { x: 840, y: FLOOR_TOP, width: 120, height: FLOOR_H },
  ],
  objects: [
    { kind: 'button', id: 'plate1', position: { x: 60, y: PLATE_Y }, targets: ['bridge1'] },
    { kind: 'button', id: 'plate2', position: { x: 150, y: PLATE_Y }, targets: ['bridge2'] },
    { kind: 'door', id: 'bridge1', bounds: { x: 300, y: FLOOR_TOP, width: 180, height: FLOOR_H }, openByDefault: true },
    { kind: 'door', id: 'bridge2', bounds: { x: 660, y: FLOOR_TOP, width: 180, height: FLOOR_H }, openByDefault: true },
    { kind: 'laser', id: 'pit1', origin: { x: 310, y: 524 }, direction: 'right' },
    { kind: 'laser', id: 'pit2', origin: { x: 670, y: 524 }, direction: 'right' },
    exit('exit', 900, FLOOR_TOP),
  ],
};

/** S21 — Tall Order. Five wide ledges: the ultimate staircase build. */
const SOLO_21: LevelDefinition = {
  id: 'solo-21',
  nameKey: 'solo.21.name',
  solo: true,
  cloneLimitPerPlayer: 5,
  spawns: { blue: { x: 60, y: SPAWN_Y }, red: NO_RED },
  solids: [
    fullFloor,
    block(200, 410, 150),
    block(350, 330, 150),
    block(500, 250, 150),
    block(650, 170, 150),
    block(800, 90, 160),
  ],
  objects: [exit('exit', 880, 90)],
};

/** S22 — Firewall. Three ceiling lasers bar the hall; three plates behind spawn
 * kill them, in the right order (a placed clone walls off the next plate). */
const SOLO_22: LevelDefinition = {
  id: 'solo-22',
  nameKey: 'solo.22.name',
  solo: true,
  cloneLimitPerPlayer: 3,
  spawns: { blue: { x: 250, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor],
  objects: [
    { kind: 'button', id: 'pA', position: { x: 40, y: PLATE_Y }, targets: ['zA'] },
    { kind: 'button', id: 'pB', position: { x: 110, y: PLATE_Y }, targets: ['zB'] },
    { kind: 'button', id: 'pC', position: { x: 180, y: PLATE_Y }, targets: ['zC'] },
    { kind: 'laser', id: 'zA', origin: { x: 360, y: 180 }, direction: 'down' },
    { kind: 'laser', id: 'zB', origin: { x: 520, y: 180 }, direction: 'down' },
    { kind: 'laser', id: 'zC', origin: { x: 680, y: 180 }, direction: 'down' },
    exit('exit', 860, FLOOR_TOP),
  ],
};

/** S23 — Trapdoor. The exit ledge is too high — but a clone on the plate CLOSES
 * an inverted door into the step that lets you climb it. */
const SOLO_23: LevelDefinition = {
  id: 'solo-23',
  nameKey: 'solo.23.name',
  solo: true,
  cloneLimitPerPlayer: 1,
  spawns: { blue: { x: 300, y: SPAWN_Y }, red: NO_RED },
  solids: [fullFloor, block(600, 400, 360)],
  objects: [
    { kind: 'button', id: 'plate', position: { x: 150, y: PLATE_Y }, targets: ['step'] },
    { kind: 'door', id: 'step', bounds: { x: 540, y: 472, width: 60, height: 68 }, openByDefault: true },
    exit('exit', 800, 400),
  ],
};

/** S24 — The Vault. Ride a lift to a ledge split by a gap; a clone on the ledge
 * plate closes an inverted-door bridge across it to the exit. */
const SOLO_24: LevelDefinition = {
  id: 'solo-24',
  nameKey: 'solo.24.name',
  solo: true,
  cloneLimitPerPlayer: 2,
  spawns: { blue: { x: 400, y: SPAWN_Y }, red: NO_RED },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H },
    { x: 650, y: 300, width: 160, height: 240 }, // mid ledge (lift landing)
    { x: 890, y: 300, width: 70, height: 240 }, // exit ledge across the gap
  ],
  objects: [
    { kind: 'button', id: 'plate-lift', position: { x: 250, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 300 }, speed: 60 },
    { kind: 'button', id: 'plate-bridge', position: { x: 700, y: 290 }, targets: ['bridge'] },
    { kind: 'door', id: 'bridge', bounds: { x: 810, y: 300, width: 80, height: 24 }, openByDefault: true },
    exit('exit', 905, 300),
  ],
};

/** S25 — Grand Finale. Everything: suppress the floor laser to reach the lift,
 * power it, ride up, hold the gate, and build the last step to the exit. */
const SOLO_25: LevelDefinition = {
  id: 'solo-25',
  nameKey: 'solo.25.name',
  solo: true,
  cloneLimitPerPlayer: 4,
  spawns: { blue: { x: 300, y: SPAWN_Y }, red: NO_RED },
  solids: [
    { x: 0, y: FLOOR_TOP, width: 560, height: FLOOR_H },
    block(650, 300, 200), // lift-landing ledge
    block(850, 200, 110), // exit ledge (needs a step from the landing)
  ],
  objects: [
    { kind: 'button', id: 'plate-suppress', position: { x: 120, y: PLATE_Y }, targets: ['zap'] },
    { kind: 'laser', id: 'zap', origin: { x: 400, y: FLOOR_TOP - 14 }, direction: 'right' },
    { kind: 'button', id: 'plate-lift', position: { x: 200, y: PLATE_Y }, targets: ['lift'] },
    { kind: 'elevator', id: 'lift', size: { width: 90, height: 14 }, from: { x: 560, y: FLOOR_TOP }, to: { x: 560, y: 300 }, speed: 60 },
    exit('exit', 900, 200),
  ],
};

const SOLO_LEVELS_LIST: readonly LevelDefinition[] = [
  SOLO_01, SOLO_02, SOLO_03, SOLO_04, SOLO_05,
  SOLO_06, SOLO_07, SOLO_08, SOLO_09, SOLO_10,
  SOLO_11, SOLO_12, SOLO_13, SOLO_14, SOLO_15,
  SOLO_16, SOLO_17, SOLO_18, SOLO_19, SOLO_20,
  SOLO_21, SOLO_22, SOLO_23, SOLO_24, SOLO_25,
];

export const SOLO_LEVELS = SOLO_LEVELS_LIST;
