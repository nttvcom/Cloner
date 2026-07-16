import type { LevelDefinition, SimEvent, Simulation, SimulationSnapshot } from '@cloner/shared';
import type { DuoKeyboard, SoloKeyboard } from '../input/keyboard';

export type SessionStatus =
  | { kind: 'playing' }
  | { kind: 'complete' }
  | { kind: 'nextLevel'; level: LevelDefinition }
  | { kind: 'peerLeft' };

/** What GameScene needs from a game, local or online. */
export interface GameSession {
  readonly mode: 'local' | 'online';
  readonly level: LevelDefinition;
  /** Advance / pump the session. Called every render frame. */
  update(deltaMs: number, keyboard: DuoKeyboard | SoloKeyboard): void;
  /** Latest authoritative state, if any has arrived yet. */
  snapshot(): SimulationSnapshot | null;
  /** Discrete events since the last call (effects, sounds). */
  consumeEvents(): SimEvent[];
  status(): SessionStatus;
  /** The local simulation, if this session runs one (null online). */
  getSimulation(): Simulation | null;
  dispose(): void;
}
