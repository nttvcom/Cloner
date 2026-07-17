import { describe, expect, it } from 'vitest';
import { PLAYER_SIZE } from '../../constants/game';
import { TELEPORT_DURATION_TICKS } from '../../constants/physics';
import { SOLO_LEVELS } from '../../levels/solo';
import { getLevelById } from '../../levels';
import { EMPTY_INPUT, type PlayerInput } from '../../types/input';
import type { LevelDefinition } from '../../types/level';
import { Simulation, type InputMap } from '../Simulation';

/**
 * Scripted playthroughs of the SOLO campaign with the real (self-colliding)
 * physics: proof that each level has a concrete, reachable intended solution.
 * The bot only drives blue and knows how to climb its own clones/terrain.
 */
class SoloBot {
  readonly sim: Simulation;
  private readonly inp: InputMap = { blue: { ...EMPTY_INPUT }, red: { ...EMPTY_INPUT } };

  constructor(level: LevelDefinition) {
    this.sim = new Simulation(level);
  }
  private p() {
    return this.sim.snapshot().players.blue;
  }
  px(): number {
    return this.p().position.x;
  }
  feetY(): number {
    return this.p().position.y + PLAYER_SIZE;
  }
  grounded(): boolean {
    return this.p().isGrounded;
  }
  tp(): number {
    return this.p().teleportTicksLeft;
  }
  clones(): number {
    return this.sim.snapshot().clones.length;
  }
  platY(id: string): number {
    return this.sim.snapshot().platforms[id]!.y;
  }
  done(): boolean {
    return this.sim.isCompleted;
  }
  private hold(partial: Partial<PlayerInput>): void {
    this.inp.blue = { ...EMPTY_INPUT, ...partial };
  }
  private rest(): void {
    this.inp.blue = { ...EMPTY_INPUT };
  }
  step(n = 1): void {
    for (let i = 0; i < n; i += 1) this.sim.step(this.inp);
  }

  /** Flat walk to x (no obstacles between here and there). */
  walkTo(x: number, maxT = 400): void {
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return;
      if (this.tp() > 0) {
        this.step();
        continue;
      }
      const dx = x - this.px();
      if (Math.abs(dx) <= 2) break;
      this.hold({ left: dx < 0, right: dx > 0 });
      this.step();
    }
    this.rest();
  }

  /** Drop a clone here and wait out the teleport back to spawn. */
  place(): void {
    this.hold({ placeClone: true });
    this.step(1);
    this.rest();
    this.step(TELEPORT_DURATION_TICKS + 2);
  }

  placeAt(x: number): void {
    this.walkTo(x);
    this.place();
  }

  /**
   * Run toward targetX, jumping automatically whenever a step (clone/ledge)
   * blocks forward progress. Succeeds when standing near targetX; when
   * `targetFeetY` is given it must also be standing at that height (i.e. on the
   * intended surface). Returns true on success or level completion.
   */
  climb(targetX: number, targetFeetY: number | null, maxT = 900): boolean {
    let stuck = 0;
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return true;
      if (this.tp() > 0) {
        this.step();
        continue;
      }
      const grounded = this.grounded();
      const atX = Math.abs(this.px() - targetX) <= 6;
      if (targetFeetY !== null && atX && grounded && Math.abs(this.feetY() - targetFeetY) <= 5) {
        this.rest();
        return true;
      }
      const dir = targetX - this.px();
      const doJump = grounded && stuck >= 2;
      this.hold({ right: dir > 2, left: dir < -2, jump: doJump });
      const before = this.px();
      this.step();
      if (grounded && Math.abs(this.px() - before) < 0.4) stuck += 1;
      else stuck = 0;
    }
    this.rest();
    return this.done();
  }

  /** Board a shuttling lift at the bottom and ride until feet reach ledgeTopY. */
  rideUp(id: string, boardX: number, ledgeTopY: number, maxT = 1400): boolean {
    const bottom = this.startYFallback[id] ?? this.platY(id);
    for (let t = 0; t < 800; t += 1) {
      if (this.platY(id) >= bottom - 2) break;
      this.step();
    }
    this.walkTo(boardX, 160);
    const target = ledgeTopY - PLAYER_SIZE;
    for (let t = 0; t < maxT; t += 1) {
      if (this.done()) return true;
      if (this.p().position.y <= target + 2) return true;
      this.step();
    }
    return this.p().position.y <= target + 2;
  }
  private readonly startYFallback: Record<string, number> = {};
  recordBottoms(): void {
    for (const [id, pos] of Object.entries(this.sim.snapshot().platforms)) {
      this.startYFallback[id] = pos.y;
    }
  }
}

describe('solo: no level is trivially solvable without clones', () => {
  for (const level of SOLO_LEVELS) {
    it(`${level.id} needs clones`, () => {
      const sim = new Simulation(level);
      const patterns: Partial<PlayerInput>[] = [
        { right: true },
        { left: true },
        { right: true, jump: true },
        { left: true, jump: true },
      ];
      for (let i = 0; i < 1400; i += 1) {
        const base = patterns[Math.floor(i / 40) % patterns.length]!;
        const jump = i % 22 < 3;
        sim.step({
          blue: { ...EMPTY_INPUT, ...base, jump: base.jump || jump },
          red: { ...EMPTY_INPUT },
        });
        expect(sim.isCompleted, `${level.id} finished with no clones`).toBe(false);
      }
    });
  }
});

describe('solo: scripted solutions complete each level', () => {
  it('solo-01 — one clone step to the ledge', () => {
    const bot = new SoloBot(getLevelById('solo-01')!);
    bot.placeAt(660);
    bot.climb(800, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-02 — clone on the plate holds the door open', () => {
    const bot = new SoloBot(getLevelById('solo-02')!);
    bot.walkTo(130);
    bot.place();
    bot.climb(830, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-03 — clone on the plate suppresses the laser', () => {
    const bot = new SoloBot(getLevelById('solo-03')!);
    bot.walkTo(130);
    bot.place();
    bot.climb(830, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-04 — two clones, two steps', () => {
    const bot = new SoloBot(getLevelById('solo-04')!);
    bot.placeAt(350); // clone #1 at the foot of ledge 1 (against its wall)
    bot.climb(600, 400); // climb onto ledge 1
    bot.walkTo(610); // to the foot of the upper wall
    bot.place(); // clone #2 against the exit-ledge wall
    bot.climb(780, null); // climb #1 -> ledge 1 -> #2 -> exit ledge
    expect(bot.done()).toBe(true);
  });

  it('solo-05 — three-rung staircase', () => {
    const bot = new SoloBot(getLevelById('solo-05')!);
    bot.placeAt(270); // clone #1 (floor, foot of ledge 1)
    bot.climb(480, 400); // onto ledge 1
    bot.walkTo(490);
    bot.place(); // clone #2 (ledge 1, foot of ledge 2 wall)
    bot.climb(700, 300); // onto ledge 2
    bot.walkTo(710);
    bot.place(); // clone #3 (ledge 2, foot of exit-ledge wall)
    bot.climb(830, null); // full climb to the exit ledge
    expect(bot.done()).toBe(true);
  });

  it('solo-06 — clone powers the lift, ride up', () => {
    const bot = new SoloBot(getLevelById('solo-06')!);
    bot.recordBottoms();
    bot.walkTo(250);
    bot.place();
    bot.rideUp('lift', 600, 240);
    bot.walkTo(780, 400);
    for (let i = 0; i < 120 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('solo-07 — weight opens the ledge gate, step climbs to it', () => {
    const bot = new SoloBot(getLevelById('solo-07')!);
    bot.placeAt(120); // clone on the plate → gate open
    bot.placeAt(460); // step at the ledge foot
    bot.climb(880, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-08 — two plates, two doors', () => {
    const bot = new SoloBot(getLevelById('solo-08')!);
    bot.placeAt(80);
    bot.placeAt(160);
    bot.climb(830, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-09 — suppress the ledge laser, then climb it', () => {
    const bot = new SoloBot(getLevelById('solo-09')!);
    bot.placeAt(120); // suppress
    bot.placeAt(460); // step
    bot.climb(600, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-10 — power the lift and hold the top gate', () => {
    const bot = new SoloBot(getLevelById('solo-10')!);
    bot.recordBottoms();
    bot.placeAt(150); // gate plate
    bot.placeAt(250); // lift plate
    bot.rideUp('lift', 600, 240);
    bot.walkTo(860, 400);
    for (let i = 0; i < 120 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('solo-11 — four-rung grand staircase', () => {
    const bot = new SoloBot(getLevelById('solo-11')!);
    bot.placeAt(220);
    bot.climb(340, 400);
    bot.walkTo(400);
    bot.place();
    bot.climb(520, 320);
    bot.walkTo(580);
    bot.place();
    bot.climb(700, 240);
    bot.walkTo(760);
    bot.place();
    bot.climb(870, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-12 — suppress the shaft laser and power the lift', () => {
    const bot = new SoloBot(getLevelById('solo-12')!);
    bot.recordBottoms();
    bot.placeAt(150);
    bot.placeAt(250);
    bot.rideUp('lift', 600, 240);
    bot.walkTo(780, 400);
    for (let i = 0; i < 120 && !bot.done(); i += 1) bot.step();
    expect(bot.done()).toBe(true);
  });

  it('solo-13 — two steps plus a floor-held gate', () => {
    const bot = new SoloBot(getLevelById('solo-13')!);
    bot.placeAt(120); // gate plate
    bot.placeAt(370); // step 1
    bot.climb(500, 400);
    bot.walkTo(560);
    bot.place(); // step 2
    bot.climb(860, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-14 — suppress the floor laser, reach and climb the ledge', () => {
    const bot = new SoloBot(getLevelById('solo-14')!);
    bot.placeAt(120); // suppress
    bot.placeAt(660); // step past the (dead) laser
    bot.climb(820, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-15 — lift to a mid ledge, then a step to the exit', () => {
    const bot = new SoloBot(getLevelById('solo-15')!);
    bot.recordBottoms();
    bot.placeAt(250); // power the lift
    bot.rideUp('lift', 600, 300);
    bot.walkTo(820, 300);
    bot.place(); // step on the mid ledge
    bot.rideUp('lift', 600, 300);
    bot.climb(900, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-16 — climb, kill the next laser from this ledge, climb on', () => {
    const bot = new SoloBot(getLevelById('solo-16')!);
    bot.placeAt(320); // step 1
    bot.climb(420, 400); // onto ledge 1
    bot.walkTo(450);
    bot.place(); // suppress the next ledge's laser
    bot.climb(520, 400); // back onto ledge 1, past the suppress clone
    bot.place(); // step 2 against the upper wall
    bot.climb(860, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-17 — place the far plate first (order matters)', () => {
    const bot = new SoloBot(getLevelById('solo-17')!);
    bot.placeAt(150); // plate B first — placing A first would wall this off
    bot.placeAt(300); // plate A
    bot.climb(830, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-18 — clone closes the inverted bridge over the laser pit', () => {
    const bot = new SoloBot(getLevelById('solo-18')!);
    bot.placeAt(150);
    bot.climb(830, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-19 — suppress + power + ride + hold the top gate', () => {
    const bot = new SoloBot(getLevelById('solo-19')!);
    bot.recordBottoms();
    bot.placeAt(150); // suppress the shaft laser
    bot.placeAt(250); // power the lift
    bot.rideUp('lift', 600, 240);
    bot.walkTo(700, 300);
    bot.place(); // hold the gate open
    bot.rideUp('lift', 600, 240);
    bot.climb(880, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-20 — two bridges over two laser pits', () => {
    const bot = new SoloBot(getLevelById('solo-20')!);
    bot.placeAt(60);
    bot.placeAt(150);
    bot.climb(910, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-21 — five-rung tall order', () => {
    const bot = new SoloBot(getLevelById('solo-21')!);
    bot.placeAt(170);
    bot.climb(280, 410);
    bot.walkTo(320);
    bot.place();
    bot.climb(430, 330);
    bot.walkTo(470);
    bot.place();
    bot.climb(580, 250);
    bot.walkTo(620);
    bot.place();
    bot.climb(730, 170);
    bot.walkTo(770);
    bot.place();
    bot.climb(880, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-22 — three ceiling lasers, leftmost plate first', () => {
    const bot = new SoloBot(getLevelById('solo-22')!);
    bot.placeAt(40);
    bot.placeAt(110);
    bot.placeAt(180);
    bot.climb(860, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-23 — clone closes the inverted door into a step', () => {
    const bot = new SoloBot(getLevelById('solo-23')!);
    bot.placeAt(150);
    bot.climb(810, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-24 — lift up, then close the inverted bridge to the exit', () => {
    const bot = new SoloBot(getLevelById('solo-24')!);
    bot.recordBottoms();
    bot.placeAt(250); // power the lift
    bot.rideUp('lift', 600, 300);
    bot.walkTo(700, 300);
    bot.place(); // close the bridge
    bot.rideUp('lift', 600, 300);
    bot.climb(905, null);
    expect(bot.done()).toBe(true);
  });

  it('solo-25 — grand finale: suppress, power, ride, build the last step', () => {
    const bot = new SoloBot(getLevelById('solo-25')!);
    bot.recordBottoms();
    bot.placeAt(120); // suppress the floor laser
    bot.placeAt(200); // power the lift
    bot.rideUp('lift', 600, 300);
    bot.walkTo(820, 300);
    bot.place(); // step against the exit-ledge wall
    bot.rideUp('lift', 600, 300);
    bot.climb(900, null);
    expect(bot.done()).toBe(true);
  });
});
