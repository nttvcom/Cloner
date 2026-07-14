import { describe, expect, it } from 'vitest';
import { PLAYER_SIZE } from '../../constants/game';
import { TELEPORT_DURATION_TICKS } from '../../constants/physics';
import { TEST_LEVEL } from '../../levels';
import { EMPTY_INPUT, type PlayerInput } from '../../types/input';
import { Simulation, type InputMap } from '../Simulation';

const FLOOR_Y = TEST_LEVEL.solids[0]!.y;
const BLUE_SPAWN = TEST_LEVEL.spawns.blue;

function inputs(blue: Partial<PlayerInput> = {}, red: Partial<PlayerInput> = {}): InputMap {
  return {
    blue: { ...EMPTY_INPUT, ...blue },
    red: { ...EMPTY_INPUT, ...red },
  };
}

function stepN(sim: Simulation, ticks: number, map: InputMap = inputs()): void {
  for (let i = 0; i < ticks; i += 1) sim.step(map);
}

/** Places blue's clone at blue's current position and waits out the teleport. */
function placeBlueCloneAndSettle(sim: Simulation): void {
  sim.step(inputs({ placeClone: true }));
  stepN(sim, TELEPORT_DURATION_TICKS);
}

describe('movement', () => {
  it('players settle grounded on the floor', () => {
    const sim = new Simulation(TEST_LEVEL);
    stepN(sim, 5);
    const { players } = sim.snapshot();
    expect(players.blue.isGrounded).toBe(true);
    expect(players.blue.position.y).toBe(FLOOR_Y - PLAYER_SIZE);
  });

  it('jumping lifts the player and gravity brings them back', () => {
    const sim = new Simulation(TEST_LEVEL);
    stepN(sim, 5);
    sim.step(inputs({ jump: true }));
    stepN(sim, 10);
    expect(sim.snapshot().players.blue.position.y).toBeLessThan(FLOOR_Y - PLAYER_SIZE);
    stepN(sim, 120);
    const blue = sim.snapshot().players.blue;
    expect(blue.isGrounded).toBe(true);
    expect(blue.position.y).toBe(FLOOR_Y - PLAYER_SIZE);
  });
});

describe('clones', () => {
  it('placing a clone leaves it at the placement spot and teleports the owner to spawn', () => {
    const sim = new Simulation(TEST_LEVEL);
    stepN(sim, 30, inputs({ right: true })); // walk away from spawn first
    const beforePlace = sim.snapshot().players.blue.position.x;
    expect(beforePlace).toBeGreaterThan(BLUE_SPAWN.x);

    const events = sim.step(inputs({ placeClone: true }));
    expect(events).toContainEqual({ type: 'clonePlaced', owner: 'blue' });
    const clone = sim.snapshot().clones[0]!;
    expect(clone.owner).toBe('blue');
    expect(clone.position.x).toBe(beforePlace);

    stepN(sim, TELEPORT_DURATION_TICKS);
    expect(sim.snapshot().players.blue.position).toEqual(BLUE_SPAWN);
  });

  it('enforces the per-player clone limit', () => {
    const sim = new Simulation(TEST_LEVEL); // limit is 1
    placeBlueCloneAndSettle(sim);
    stepN(sim, 30, inputs({ right: true })); // move off the clone
    const events = sim.step(inputs({ placeClone: true }));
    expect(events).toHaveLength(0);
    expect(sim.snapshot().clones).toHaveLength(1);
  });

  it('owner removes their own clone with the remove action while overlapping it', () => {
    const sim = new Simulation(TEST_LEVEL);
    placeBlueCloneAndSettle(sim); // clone sits at spawn; blue teleported onto it
    const events = sim.step(inputs({ removeClone: true }));
    expect(events).toContainEqual({ type: 'cloneRemoved', owner: 'blue' });
    expect(sim.snapshot().clones).toHaveLength(0);
  });

  it('remove does nothing when not touching the own clone', () => {
    const sim = new Simulation(TEST_LEVEL);
    placeBlueCloneAndSettle(sim);
    stepN(sim, 60, inputs({ right: true })); // walk far away from the clone
    const events = sim.step(inputs({ removeClone: true }));
    expect(events).toHaveLength(0);
    expect(sim.snapshot().clones).toHaveLength(1);
  });
});

describe('the Golden Rule', () => {
  it('blocks the other player and never the owner', () => {
    const sim = new Simulation(TEST_LEVEL);
    placeBlueCloneAndSettle(sim); // blue clone at x=100 on the floor

    // Red walks left and must stop flush against blue's clone.
    stepN(sim, 60, inputs({}, { left: true }));
    expect(sim.snapshot().players.red.position.x).toBe(BLUE_SPAWN.x + PLAYER_SIZE);

    // Blue starts inside their own clone and walks straight through it.
    stepN(sim, 60, inputs({ right: true }));
    expect(sim.snapshot().players.blue.position.x).toBeGreaterThan(BLUE_SPAWN.x + PLAYER_SIZE);
  });
});

describe('reset', () => {
  it('clears clones and restores both players to spawn', () => {
    const sim = new Simulation(TEST_LEVEL);
    placeBlueCloneAndSettle(sim);
    stepN(sim, 40, inputs({ right: true }, { right: true }));

    sim.reset();
    const snapshot = sim.snapshot();
    expect(snapshot.tick).toBe(0);
    expect(snapshot.clones).toHaveLength(0);
    expect(snapshot.players.blue.position).toEqual(TEST_LEVEL.spawns.blue);
    expect(snapshot.players.red.position).toEqual(TEST_LEVEL.spawns.red);
  });
});
