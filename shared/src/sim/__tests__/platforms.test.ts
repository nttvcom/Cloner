import { describe, expect, it } from 'vitest';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '../../constants/game';
import { TELEPORT_DURATION_TICKS } from '../../constants/physics';
import { EMPTY_INPUT, type PlayerInput } from '../../types/input';
import type { LevelDefinition } from '../../types/level';
import { Simulation, type InputMap } from '../Simulation';

const FLOOR_TOP = VIEW_HEIGHT - 40;
const ON_FLOOR = FLOOR_TOP - PLAYER_SIZE;

function inputs(blue: Partial<PlayerInput> = {}, red: Partial<PlayerInput> = {}): InputMap {
  return {
    blue: { ...EMPTY_INPUT, ...blue },
    red: { ...EMPTY_INPUT, ...red },
  };
}

function stepN(sim: Simulation, ticks: number, map: InputMap = inputs()): void {
  for (let i = 0; i < ticks; i += 1) sim.step(map);
}

function level(partial: Partial<LevelDefinition>): LevelDefinition {
  return {
    id: 'fixture',
    nameKey: 'level.fixture',
    cloneLimitPerPlayer: 1,
    spawns: {
      blue: { x: 100, y: ON_FLOOR },
      red: { x: 200, y: ON_FLOOR },
    },
    solids: [{ x: 0, y: FLOOR_TOP, width: VIEW_WIDTH, height: 40 }],
    objects: [],
    ...partial,
  };
}

describe('moving platforms vs bodies', () => {
  it('pushes a standing player along instead of teleporting them', () => {
    // Platform slides right at floor level straight into red (x=400).
    const fixture = level({
      spawns: { blue: { x: 60, y: ON_FLOOR }, red: { x: 400, y: ON_FLOOR } },
      objects: [
        {
          kind: 'movingPlatform',
          id: 'pusher',
          size: { width: 60, height: 14 },
          path: [
            { x: 250, y: 486 },
            { x: 600, y: 486 },
          ],
          speed: 120,
        },
      ],
    });
    const sim = new Simulation(fixture);
    stepN(sim, 5);
    const before = sim.snapshot().players.red.position.x;
    stepN(sim, 90); // 1.5s: platform front (310+) travels ~180px into red
    const after = sim.snapshot().players.red.position.x;
    expect(after).toBeGreaterThan(before + 60); // shoved along smoothly
    // and red was never flung to the far side of the platform
    const platform = sim.snapshot().platforms['pusher']!;
    expect(after + PLAYER_SIZE / 2).toBeGreaterThan(platform.x + 60);
  });

  it('a clone in the path jams the platform', () => {
    const fixture = level({
      spawns: { blue: { x: 60, y: ON_FLOOR }, red: { x: 400, y: ON_FLOOR } },
      objects: [
        {
          kind: 'movingPlatform',
          id: 'pusher',
          size: { width: 60, height: 14 },
          path: [
            { x: 250, y: 486 },
            { x: 600, y: 486 },
          ],
          speed: 120,
        },
      ],
    });
    const sim = new Simulation(fixture);
    // Red drops a clone at x=400 (its box dips into the platform's band).
    sim.step(inputs({}, { placeClone: true }));
    stepN(sim, TELEPORT_DURATION_TICKS + 2);
    stepN(sim, 180, inputs({}, { right: true })); // red walks away; 3 seconds pass
    const platform = sim.snapshot().platforms['pusher']!;
    // Stalled flush against the clone (clone left edge at 400).
    expect(platform.x + 60).toBeLessThanOrEqual(400 + 0.001);
    expect(platform.x + 60).toBeGreaterThan(380);
  });
});

describe('elevator shuttle', () => {
  it('a powered elevator cycles: up, dwell, back down — no one-shot parking', () => {
    // Red spawns standing on the power button and never moves.
    const fixture = level({
      spawns: { blue: { x: 700, y: ON_FLOOR }, red: { x: 205, y: ON_FLOOR } },
      objects: [
        {
          kind: 'button',
          id: 'btn',
          position: { x: 200, y: FLOOR_TOP - 10 },
          targets: ['lift'],
        },
        {
          kind: 'elevator',
          id: 'lift',
          size: { width: 100, height: 12 },
          from: { x: 60, y: FLOOR_TOP - 12 },
          to: { x: 60, y: 200 },
          speed: 120,
        },
      ],
    });
    const sim = new Simulation(fixture);
    let minY = Number.POSITIVE_INFINITY;
    let cameBackDown = false;
    for (let i = 0; i < 900; i += 1) {
      sim.step(inputs());
      const y = sim.snapshot().platforms['lift']!.y;
      minY = Math.min(minY, y);
      if (minY <= 201 && y > 350) cameBackDown = true;
    }
    expect(minY).toBeLessThanOrEqual(201); // reached the top…
    expect(cameBackDown).toBe(true); // …and shuttled back down while powered
  });

  it('an unpowered elevator glides home and waits (no shuttle without power)', () => {
    const fixture = level({
      spawns: { blue: { x: 700, y: ON_FLOOR }, red: { x: 705, y: ON_FLOOR } },
      objects: [
        { kind: 'button', id: 'btn', position: { x: 200, y: FLOOR_TOP - 10 }, targets: ['lift'] },
        {
          kind: 'elevator',
          id: 'lift',
          size: { width: 100, height: 12 },
          from: { x: 60, y: FLOOR_TOP - 12 },
          to: { x: 60, y: 200 },
          speed: 120,
        },
      ],
    });
    const sim = new Simulation(fixture);
    // Nobody touches the button: the lift must sit at its low end forever.
    stepN(sim, 600);
    expect(sim.snapshot().platforms['lift']!.y).toBeCloseTo(FLOOR_TOP - 12, 1);
  });
});
