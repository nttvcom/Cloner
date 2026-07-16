import {
  getLevelById,
  LEVELS,
  PLAYER_COLORS,
  SNAPSHOT_SEND_RATE,
  type LevelDefinition,
  type PlayerInput,
  type SimEvent,
  type SimulationSnapshot,
} from '@cloner/shared';
import { SoloKeyboard, type DuoKeyboard } from '../input/keyboard';
import type { OnlineClient } from '../net/OnlineClient';
import type { GameSession, SessionStatus } from './GameSession';

const INPUT_KEEPALIVE_MS = 100;
const SNAPSHOT_INTERVAL_MS = 1000 / SNAPSHOT_SEND_RATE;

function sameInput(a: PlayerInput, b: PlayerInput): boolean {
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.jump === b.jump &&
    a.placeClone === b.placeClone &&
    a.removeClone === b.removeClone
  );
}

interface TimedSnapshot {
  snap: SimulationSnapshot;
  at: number;
}

/**
 * Online co-op: sends this player's input upstream and renders the
 * authoritative server snapshots. Snapshots arrive at 20Hz but we render at
 * frame rate, so positions are interpolated between the two latest
 * snapshots (~one snapshot interval of added latency, in exchange for
 * motion as smooth as local play).
 */
export class OnlineSession implements GameSession {
  readonly mode = 'online' as const;
  level: LevelDefinition;

  private readonly client: OnlineClient;
  private prevSnap: TimedSnapshot | null = null;
  private latestSnap: TimedSnapshot | null = null;
  private lastSent: PlayerInput | null = null;
  private sinceSendMs = 0;
  private tickGuess = 0;
  private state: SessionStatus = { kind: 'playing' };
  private events: SimEvent[] = [];

  constructor(client: OnlineClient, levelId: string) {
    this.client = client;
    this.level = getLevelById(levelId) ?? LEVELS[0]!;
    client.on('snapshot', (snapshot) => {
      const now = performance.now();
      if (this.latestSnap && snapshot.tick < this.latestSnap.snap.tick) {
        // The server reset the level (someone died): don't lerp across it.
        this.events.push({ type: 'levelReset' });
        this.prevSnap = null;
        this.latestSnap = { snap: snapshot, at: now };
        return;
      }
      this.prevSnap = this.latestSnap;
      this.latestSnap = { snap: snapshot, at: now };
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
    this.prevSnap = null;
    this.latestSnap = null;
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
    const latest = this.latestSnap;
    if (!latest) return null;
    const prev = this.prevSnap;
    if (!prev) return latest.snap;

    // Ease from the previous snapshot toward the latest over one send
    // interval after the latest arrived.
    const t = Math.min(1, Math.max(0, (performance.now() - latest.at) / SNAPSHOT_INTERVAL_MS));
    if (t >= 1) return latest.snap;

    const out: SimulationSnapshot = {
      ...latest.snap,
      players: { ...latest.snap.players },
      platforms: { ...latest.snap.platforms },
    };
    for (const color of PLAYER_COLORS) {
      const a = prev.snap.players[color];
      const b = latest.snap.players[color];
      out.players[color] = {
        ...b,
        position: {
          x: a.position.x + (b.position.x - a.position.x) * t,
          y: a.position.y + (b.position.y - a.position.y) * t,
        },
      };
    }
    for (const [id, to] of Object.entries(latest.snap.platforms)) {
      const from = prev.snap.platforms[id];
      if (from) {
        out.platforms[id] = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        };
      }
    }
    return out;
  }

  consumeEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  status(): SessionStatus {
    return this.state;
  }

  getSimulation(): null {
    return null; // the server owns the simulation online
  }

  /** Leave the room cleanly (ESC from a game). */
  leave(): void {
    this.client.send({ type: 'leaveRoom' });
    this.client.disconnect();
  }

  dispose(): void {
    this.client.off('snapshot');
    this.client.off('levelComplete');
    this.client.off('gameStart');
    this.client.off('peerLeft');
    this.client.off('disconnected');
  }
}
