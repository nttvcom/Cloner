import type {
  ClientMessage,
  LobbyPlayer,
  PlayerColor,
  RoomErrorReason,
  ServerMessage,
  SimulationSnapshot,
} from '@cloner/shared';

export interface OnlineClientEvents {
  joined: (code: string, color: PlayerColor, lobby: LobbyPlayer[]) => void;
  roomError: (reason: RoomErrorReason) => void;
  lobby: (lobby: LobbyPlayer[]) => void;
  gameStart: (levelId: string) => void;
  snapshot: (snapshot: SimulationSnapshot) => void;
  levelComplete: (levelId: string) => void;
  peerLeft: () => void;
  disconnected: () => void;
}

function serverUrl(): string {
  if (import.meta.env.DEV) return 'ws://localhost:3001';
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}`;
}

/**
 * Thin typed wrapper over the WebSocket. During gameplay the client only ever
 * sends inputs — the server simulates everything (never trust clients).
 */
export class OnlineClient {
  private socket: WebSocket | null = null;
  private readonly handlers: Partial<OnlineClientEvents> = {};
  yourColor: PlayerColor = 'blue';
  roomCode = '';

  on<E extends keyof OnlineClientEvents>(event: E, handler: OnlineClientEvents[E]): void {
    this.handlers[event] = handler;
  }

  off<E extends keyof OnlineClientEvents>(event: E): void {
    delete this.handlers[event];
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(serverUrl());
      this.socket = socket;
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error('connect failed'));
      socket.onclose = () => {
        this.socket = null;
        this.handlers.disconnected?.();
      };
      socket.onmessage = (event) => this.handleMessage(String(event.data));
    });
  }

  disconnect(): void {
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      socket.onclose = null;
      socket.close();
    }
  }

  send(message: ClientMessage): void {
    if (this.isConnected) this.socket!.send(JSON.stringify(message));
  }

  private handleMessage(raw: string): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case 'roomJoined':
        this.yourColor = message.yourColor;
        this.roomCode = message.code;
        this.handlers.joined?.(message.code, message.yourColor, message.lobby);
        break;
      case 'roomError':
        this.handlers.roomError?.(message.reason);
        break;
      case 'lobbyState':
        this.handlers.lobby?.(message.lobby);
        break;
      case 'gameStart':
        this.handlers.gameStart?.(message.levelId);
        break;
      case 'snapshot':
        this.handlers.snapshot?.(message.state);
        break;
      case 'levelComplete':
        this.handlers.levelComplete?.(message.levelId);
        break;
      case 'peerLeft':
        this.handlers.peerLeft?.();
        break;
    }
  }
}
