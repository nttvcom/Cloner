import { describe, expect, it } from 'vitest';
import { PLAYER_SIZE } from '../../constants/game';
import { TELEPORT_DURATION_TICKS } from '../../constants/physics';
import { CAMPAIGN_LEVELS } from '../../levels/campaign';
import { getLevelById } from '../../levels';
import { EMPTY_INPUT, type PlayerInput } from '../../types/input';
import type { PlayerColor } from '../../types/core';
import type { LevelDefinition } from '../../types/level';
import { Simulation, type InputMap } from '../Simulation';

/**
 * Scripted "bot" playthroughs: proof that the intended solutions are actually
 * reachable with the real physics. This is the automated form of "playtest
 * every level" — if a bot can drive both cubes through a level, a human can.
 */
class Bot {
  readonly sim: Simulation;
  private readonly inp: InputMap = { blue: { ...EMPTY_INPUT }, red: { ...EMPTY_INPUT } };

  constructor(level: LevelDefinition) {
    this.sim = new Simulation(level);
  }

  snap() {
    return this.sim.snapshot();
  }
  px(c: PlayerColor): number {
    return this.snap().players[c].position.x;
  }
  py(c: PlayerColor): number {
    return this.snap().players[c].position.y;
  }
  tp(c: PlayerColor): number {
    return this.snap().players[c].teleportTicksLeft;
  }
  platY(id: string): number {
    return this.snap().platforms[id]!.y;
  }
  clones(c?: PlayerColor): number {
    const all = this.snap().clones;
    return c ? all.filter((k) => k.owner === c).length : all.length;
  }
  hold(c: PlayerColor, partial: Partial<PlayerInput>): void {
    this.inp[c] = { ...EMPTY_INPUT, ...partial };
  }
  rest(c: PlayerColor): void {
    this.inp[c] = { ...EMPTY_INPUT };
  }
  restAll(): void {
    this.rest('blue');
    this.rest('red');
  }
  step(n = 1): void {
    for (let i = 0; i < n; i += 1) this.sim.step(this.inp);
  }
  done(): boolean {
    return this.sim.isCompleted;
  }

  /** Walk one cube to target x (the other holds whatever it currently holds). */
  walkTo(c: PlayerColor, x: number, maxT = 500): void {
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return;
      if (this.tp(c) > 0) {
        this.step();
        continue;
      }
      const dx = x - this.px(c);
      if (Math.abs(dx) <= 2) break;
      this.hold(c, { left: dx < 0, right: dx > 0 });
      this.step();
    }
    this.rest(c);
  }

  /** Place a clone and wait out the teleport-to-spawn. */
  place(c: PlayerColor): void {
    this.hold(c, { placeClone: true });
    this.step(1);
    this.rest(c);
    this.step(TELEPORT_DURATION_TICKS + 2);
  }

  /** Remove the clone the cube is currently overlapping. */
  removeClone(c: PlayerColor): void {
    this.hold(c, { removeClone: true });
    this.step(1);
    this.rest(c);
    this.step(1);
  }

  /** Hop straight up in place (used to mount a low step/ledge next to you). */
  hopOnto(c: PlayerColor, x: number, maxT = 120): void {
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return;
      const dx = x - this.px(c);
      const near = Math.abs(dx) <= 4;
      this.hold(c, { left: dx < -4, right: dx > 4, jump: true });
      this.step();
      if (near) this.hold(c, { jump: true });
    }
    this.rest(c);
  }

  /** Wait for a shuttling lift to reach its low end (deck near `bottomY`). */
  waitLift(id: string, bottomY: number, maxT = 800): boolean {
    for (let t = 0; t < maxT; t += 1) {
      if (this.platY(id) >= bottomY - 2) return true;
      this.step();
    }
    return false;
  }

  /**
   * Ride a lift up: board at the bottom, then hold still until the cube is
   * standing on the destination ledge (feet at `ledgeTopY`).
   */
  rideUp(c: PlayerColor, id: string, boardX: number, ledgeTopY: number, maxT = 1200): boolean {
    const targetY = ledgeTopY - PLAYER_SIZE;
    this.waitLift(id, this.bottomOf(id));
    this.walkTo(c, boardX, 120);
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return true;
      if (this.py(c) <= targetY + 2) return true;
      this.step();
    }
    return this.py(c) <= targetY + 2;
  }

  private bottomOf(id: string): number {
    // Elevator `from` is the low end in every campaign level.
    return this.startYFallback[id] ?? this.platY(id);
  }
  private readonly startYFallback: Record<string, number> = {};
  recordBottoms(): void {
    for (const [id, p] of Object.entries(this.snap().platforms)) {
      this.startYFallback[id] = p.y;
    }
  }

  /** Wait for the lift's low end, then walk onto the deck at absolute x. */
  boardBottom(c: PlayerColor, id: string, atX: number): void {
    this.waitLift(id, this.bottomOf(id));
    this.walkTo(c, atX, 160);
  }
}

describe('campaign: no level is trivially solvable without clones', () => {
  // With zero clone usage, holding every movement key for both players must
  // never complete a level — clones are always load-bearing.
  for (const level of CAMPAIGN_LEVELS) {
    it(`${level.id} needs clones`, () => {
      const sim = new Simulation(level);
      const patterns: InputMap[] = [
        both({ right: true }),
        both({ left: true }),
        both({ right: true, jump: true }),
        both({ left: true, jump: true }),
      ];
      // Alternate patterns and jump pulses for a while; never place a clone.
      for (let i = 0; i < 1600; i += 1) {
        const base = patterns[Math.floor(i / 40) % patterns.length]!;
        const jump = i % 25 < 3;
        sim.step({
          blue: { ...base.blue, jump: base.blue.jump || jump },
          red: { ...base.red, jump: base.red.jump || jump },
        });
        expect(sim.isCompleted, `${level.id} completed with no clones`).toBe(false);
      }
    });
  }
});

function both(partial: Partial<PlayerInput>): InputMap {
  return { blue: { ...EMPTY_INPUT, ...partial }, red: { ...EMPTY_INPUT, ...partial } };
}

describe('campaign: scripted solutions complete the elevator levels', () => {
  it('level 6 — power the lift, open the top gate, both ride to the double exit', () => {
    const level = getLevelById('level-06')!;
    const bot = new Bot(level);
    bot.recordBottoms();
    // Red opens the top gate FIRST (its clone sits far left); if blue placed
    // its lift clone first, that solid clone would block red's path left.
    bot.walkTo('red', 180);
    bot.place('red');
    bot.walkTo('blue', 300);
    bot.place('blue');
    // both ride up and gather in the double exit
    bot.rideUp('blue', 'lift', 620, 240);
    bot.walkTo('blue', 872, 400);
    bot.rideUp('red', 'lift', 620, 240);
    bot.walkTo('red', 905, 400);
    // let them settle in the exit together
    for (let i = 0; i < 240 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('level 11 — suppress the ledge beam and power the lift, then both ride up', () => {
    const level = getLevelById('level-11')!;
    const bot = new Bot(level);
    bot.recordBottoms();
    // red suppresses the beam (far plate first so its solid clone can't block
    // blue's walk), blue powers the lift.
    bot.walkTo('red', 180);
    bot.place('red');
    bot.walkTo('blue', 300);
    bot.place('blue');
    // both ride up under the dead beam to their exits
    bot.rideUp('red', 'lift', 620, 240);
    bot.walkTo('red', 838, 400);
    bot.rideUp('blue', 'lift', 620, 240);
    bot.walkTo('blue', 728, 400);
    for (let i = 0; i < 180 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('level 18 — suppress the ceiling beam, power the lift, ride up and walk left', () => {
    const level = getLevelById('level-18')!;
    const bot = new Bot(level);
    bot.recordBottoms();
    // Place the far clone first so the near one isn't blocked; both plates are
    // right of spawn, the lift is left, so neither clone blocks the walk back.
    bot.walkTo('red', 880);
    bot.place('red'); // suppress the laser
    bot.walkTo('blue', 800);
    bot.place('blue'); // power the lift
    bot.rideUp('red', 'lift', 600, 240);
    bot.walkTo('red', 180, 400);
    bot.rideUp('blue', 'lift', 600, 240);
    bot.walkTo('blue', 80, 400);
    for (let i = 0; i < 180 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('level 14 — power + suppress, both ride up to the double exit', () => {
    const level = getLevelById('level-14')!;
    const bot = new Bot(level);
    bot.recordBottoms();
    bot.walkTo('red', 880);
    bot.place('red'); // suppress the ceiling beam
    bot.walkTo('blue', 800);
    bot.place('blue'); // power the lift
    bot.rideUp('blue', 'lift', 600, 240);
    bot.walkTo('blue', 140, 400);
    bot.rideUp('red', 'lift', 600, 240);
    bot.walkTo('red', 158, 400);
    for (let i = 0; i < 240 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('level 19 — power + two beam suppressors (one player spends both clones)', () => {
    const level = getLevelById('level-19')!;
    const bot = new Bot(level);
    bot.recordBottoms();
    // Rightmost clone first so nothing blocks the next placement.
    bot.walkTo('red', 920);
    bot.place('red'); // suppress zapB
    bot.walkTo('blue', 840);
    bot.place('blue'); // suppress zapA (blue's 1st clone)
    bot.walkTo('blue', 760);
    bot.place('blue'); // power the lift (blue's 2nd clone)
    bot.rideUp('red', 'lift', 600, 240);
    bot.walkTo('red', 300, 400);
    bot.rideUp('blue', 'lift', 600, 240);
    bot.walkTo('blue', 60, 400);
    for (let i = 0; i < 180 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });
});
