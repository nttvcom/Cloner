import {
  EMPTY_INPUT,
  SIMULATION_DELTA_MS,
  Simulation,
  type LevelDefinition,
  type SimEvent,
  type SimulationSnapshot,
} from '@cloner/shared';
import { DuoKeyboard, SoloKeyboard } from '../input/keyboard';
import type { GameSession, SessionStatus } from './GameSession';

/**
 * Duo on one PC: the deterministic simulation runs right here at a fixed
 * 60Hz, fed by both halves of the keyboard.
 */
export class LocalSession implements GameSession {
  readonly mode = 'local' as const;
  readonly level: LevelDefinition;

  private readonly sim: Simulation;
  private accumulatorMs = 0;
  private events: SimEvent[] = [];

  constructor(level: LevelDefinition) {
    this.level = level;
    this.sim = new Simulation(level);
  }

  update(deltaMs: number, keyboard: DuoKeyboard | SoloKeyboard): void {
    // Solo levels drive one cube from a merged key set; Duo splits the board.
    let inputs;
    if (this.level.solo) {
      if (!(keyboard instanceof SoloKeyboard)) return;
      inputs = { blue: keyboard.readInput(), red: { ...EMPTY_INPUT } };
    } else {
      if (!(keyboard instanceof DuoKeyboard)) return;
      inputs = keyboard.readInputs();
    }
    // Cap to avoid a spiral after a background-tab stall.
    this.accumulatorMs = Math.min(this.accumulatorMs + deltaMs, 250);
    while (this.accumulatorMs >= SIMULATION_DELTA_MS) {
      this.accumulatorMs -= SIMULATION_DELTA_MS;
      this.events.push(...this.sim.step(inputs));
    }
  }

  snapshot(): SimulationSnapshot {
    return this.sim.snapshot();
  }

  consumeEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  status(): SessionStatus {
    return this.sim.isCompleted ? { kind: 'complete' } : { kind: 'playing' };
  }

  getSimulation(): Simulation {
    return this.sim;
  }

  dispose(): void {
    // Nothing to release: the simulation is plain data.
  }
}
