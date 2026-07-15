import {
  getLevelById,
  LEVELS,
  type LevelDefinition,
  type PlayerInput,
  type SimEvent,
  type SimulationSnapshot,
} from '@cloner/shared';
import { SoloKeyboard, type DuoKeyboard } from '../input/keyboard';
import type { OnlineClient } from '../net/OnlineClient';
import type { GameSession, SessionStatus } from './GameSession';

const INPUT_KEEPALIVE_MS = 100;

function sameInput(a: PlayerInput, b: PlayerInput): boolean {
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.jump === b.jump &&
    a.placeClone === b.placeClone &&
    a.removeClone === b.removeClone
  );
}

/**
 * Online co-op: sends this player's input upstream, renders whatever
 * snapshot the authoritative server last broadcast.
 */
export class OnlineSession implements GameSession {
  readonly mode = 'online' as const;
  level: LevelDefinition;

  private readonly client: OnlineClient;
  private latest: SimulationSnapshot | null = null;
  private lastSent: PlayerInput | null = null;
  private sinceSendMs = 0;
  private tickGuess = 0;
  private state: SessionStatus = { kind: 'playing' };
  private events: SimEvent[] = [];
  private lastTick = -1;

  constructor(client: OnlineClient, levelId: string) {
    this.client = client;
    this.level = getLevelById(levelId) ?? LEVELS[0]!;
    client.on('snapshot', (snapshot) => {
      // A tick that went backwards means the server reset the level (death).
      if (this.lastTick >= 0 && snapshot.tick < this.lastTick) {
        this.events.push({ type: 'levelReset' });
      }
      this.lastTick = snapshot.tick;
      this.latest = snapshot;
    });
    client.on('levelComplete', () => {
      this.state = { kind: 'complete' };
      this.events.push({ type: 'levelComplete' });
    });
    client.on('gameStart', (levelId) => {
      const next = getLevelById(levelId);
      if (next) {
        this.state = { kind: 'nextLevel', level: next };
      }
    });
    client.on('peerLeft', () => {
      this.state = { kind: 'peerLeft' };
    });
    client.on('disconnected', () => {
      this.state = { kind: 'peerLeft' };
    });
  }

  /** Called by GameScene when it restarts into the next level. */
  advanceTo(level: LevelDefinition): void {
    this.level = level;
    this.latest = null;
    this.lastTick = -1;
    this.state = { kind: 'playing' };
  }

  update(deltaMs: number, keyboard: DuoKeyboard | SoloKeyboard): void {
    if (!(keyboard instanceof SoloKeyboard)) return;
    if (this.state.kind !== 'playing') return;
    const input = keyboard.readInput();
    this.sinceSendMs += deltaMs;
    this.tickGuess += 1;
    const changed = !this.lastSent || !sameInput(input, this.lastSent);
    if (changed || this.sinceSendMs >= INPUT_KEEPALIVE_MS) {
      this.client.send({ type: 'input', tick: this.tickGuess, input });
      this.lastSent = input;
      this.sinceSendMs = 0;
    }
  }

  snapshot(): SimulationSnapshot | null {
    return this.latest;
  }

  consumeEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  status(): SessionStatus {
    return this.state;
  }

  dispose(): void {
    this.client.off('snapshot');
    this.client.off('levelComplete');
    this.client.off('gameStart');
    this.client.off('peerLeft');
  }
}
