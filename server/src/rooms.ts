import type { WebSocket } from 'ws';
import {
  EMPTY_INPUT,
  LEVELS,
  ROOM_CODE_LENGTH,
  SIMULATION_DELTA_MS,
  SIMULATION_TICK_RATE,
  SNAPSHOT_SEND_RATE,
  Simulation,
  type InputMap,
  type LobbyPlayer,
  type PlayerColor,
  type PlayerInput,
  type ServerMessage,
} from '@cloner/shared';

const SNAPSHOT_EVERY_TICKS = Math.round(SIMULATION_TICK_RATE / SNAPSHOT_SEND_RATE);
const NEXT_LEVEL_DELAY_MS = 2500;

/** Unambiguous alphabet: no 0/O, 1/I. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Never trust clients: coerce whatever arrived into strict booleans. */
function sanitizeInput(raw: unknown): PlayerInput {
  const input = (raw ?? {}) as Record<string, unknown>;
  return {
    left: input.left === true,
    right: input.right === true,
    jump: input.jump === true,
    placeClone: input.placeClone === true,
    removeClone: input.removeClone === true,
  };
}

export interface Member {
  socket: WebSocket;
  color: PlayerColor;
}

export class Room {
  readonly code: string;
  private readonly members = new Map<PlayerColor, Member>();
  private readonly ready: Record<PlayerColor, boolean> = { blue: false, red: false };
  private readonly inputs: InputMap = { blue: { ...EMPTY_INPUT }, red: { ...EMPTY_INPUT } };
  private sim: Simulation | null = null;
  private loop: NodeJS.Timeout | null = null;
  private pendingStart: NodeJS.Timeout | null = null;
  private levelIndex = 0;
  private readonly onEmpty: (room: Room) => void;

  constructor(code: string, onEmpty: (room: Room) => void) {
    this.code = code;
    this.onEmpty = onEmpty;
  }

  get isFull(): boolean {
    return this.members.size >= 2;
  }

  get isEmpty(): boolean {
    return this.members.size === 0;
  }

  join(socket: WebSocket): PlayerColor | null {
    const color: PlayerColor | null = !this.members.has('blue')
      ? 'blue'
      : !this.members.has('red')
        ? 'red'
        : null;
    if (!color) return null;
    this.members.set(color, { socket, color });
    return color;
  }

  lobbySnapshot(): LobbyPlayer[] {
    return (['blue', 'red'] as PlayerColor[]).map((color) => ({
      color,
      ready: this.ready[color],
      connected: this.members.has(color),
    }));
  }

  broadcast(message: ServerMessage): void {
    const raw = JSON.stringify(message);
    for (const member of this.members.values()) {
      if (member.socket.readyState === member.socket.OPEN) {
        member.socket.send(raw);
      }
    }
  }

  setReady(color: PlayerColor, ready: boolean): void {
    if (this.sim) return; // no toggling mid-game
    this.ready[color] = ready === true;
    this.broadcast({ type: 'lobbyState', lobby: this.lobbySnapshot() });
    if (this.isFull && this.ready.blue && this.ready.red) {
      this.startLevel(this.levelIndex);
    }
  }

  applyInput(color: PlayerColor, raw: unknown): void {
    this.inputs[color] = sanitizeInput(raw);
  }

  leave(color: PlayerColor): void {
    if (!this.members.has(color)) return;
    this.members.delete(color);
    this.ready.blue = false;
    this.ready.red = false;
    this.stopLoop();
    this.sim = null;
    if (this.isEmpty) {
      this.onEmpty(this);
      return;
    }
    this.broadcast({ type: 'peerLeft' });
    this.broadcast({ type: 'lobbyState', lobby: this.lobbySnapshot() });
  }

  memberByColor(color: PlayerColor): Member | undefined {
    return this.members.get(color);
  }

  private startLevel(index: number): void {
    const level = LEVELS[index];
    if (!level) {
      // Campaign finished: back to lobby for a rematch from level 1.
      this.levelIndex = 0;
      this.ready.blue = false;
      this.ready.red = false;
      this.broadcast({ type: 'lobbyState', lobby: this.lobbySnapshot() });
      return;
    }
    this.levelIndex = index;
    this.sim = new Simulation(level);
    this.inputs.blue = { ...EMPTY_INPUT };
    this.inputs.red = { ...EMPTY_INPUT };
    this.broadcast({ type: 'gameStart', levelId: level.id, startTick: 0 });
    this.startLoop();
  }

  private startLoop(): void {
    this.stopLoop();
    let sendCountdown = SNAPSHOT_EVERY_TICKS;
    let last = performance.now();
    let accumulatorMs = 0;
    // setInterval on some platforms fires at ~26ms for a 16.7ms request, so
    // the loop is wall-clock driven: run however many fixed steps real time
    // demands, capped to avoid a death spiral after a stall.
    this.loop = setInterval(() => {
      const sim = this.sim;
      if (!sim) return;
      const now = performance.now();
      accumulatorMs = Math.min(accumulatorMs + (now - last), 250);
      last = now;

      while (accumulatorMs >= SIMULATION_DELTA_MS) {
        accumulatorMs -= SIMULATION_DELTA_MS;
        const events = sim.step({ blue: this.inputs.blue, red: this.inputs.red });

        sendCountdown -= 1;
        if (sendCountdown <= 0) {
          sendCountdown = SNAPSHOT_EVERY_TICKS;
          const snapshot = sim.snapshot();
          this.broadcast({ type: 'snapshot', tick: snapshot.tick, state: snapshot });
        }

        if (events.some((event) => event.type === 'levelComplete')) {
          const levelId = sim.levelDefinition.id;
          this.stopLoop();
          this.sim = null;
          this.broadcast({ type: 'levelComplete', levelId });
          this.pendingStart = setTimeout(() => {
            this.pendingStart = null;
            if (this.isFull) this.startLevel(this.levelIndex + 1);
          }, NEXT_LEVEL_DELAY_MS);
          return;
        }
      }
    }, 8);
  }

  private stopLoop(): void {
    if (this.loop) {
      clearInterval(this.loop);
      this.loop = null;
    }
    if (this.pendingStart) {
      clearTimeout(this.pendingStart);
      this.pendingStart = null;
    }
  }
}

export class RoomManager {
  private readonly rooms = new Map<string, Room>();

  create(customCode?: string): Room | 'codeTaken' | 'invalidCode' {
    let code: string;
    if (customCode !== undefined) {
      code = String(customCode).toUpperCase();
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return 'invalidCode';
      if (this.rooms.has(code)) return 'codeTaken';
    } else {
      do {
        code = randomCode();
      } while (this.rooms.has(code));
    }
    const room = new Room(code, (empty) => this.rooms.delete(empty.code));
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(String(code).toUpperCase());
  }

  get size(): number {
    return this.rooms.size;
  }
}
