import type { PlayerColor } from '../types/core';
import type { SimulationSnapshot } from '../types/entities';
import type { PlayerInput } from '../types/input';

// ---------------------------------------------------------------------------
// Client -> Server
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: 'createRoom'; customCode?: string }
  | { type: 'joinRoom'; code: string }
  | { type: 'setReady'; ready: boolean }
  /** Host (blue) only, lobby only: pick the level the room will start from. */
  | { type: 'selectLevel'; levelId: string }
  | { type: 'input'; tick: number; input: PlayerInput }
  | { type: 'leaveRoom' };

// ---------------------------------------------------------------------------
// Server -> Client
// ---------------------------------------------------------------------------

export interface LobbyPlayer {
  color: PlayerColor;
  ready: boolean;
  connected: boolean;
}

export type RoomErrorReason = 'notFound' | 'full' | 'invalidCode' | 'codeTaken';

export type ServerMessage =
  | { type: 'roomJoined'; code: string; yourColor: PlayerColor; lobby: LobbyPlayer[]; levelId: string }
  | { type: 'roomError'; reason: RoomErrorReason }
  | { type: 'lobbyState'; lobby: LobbyPlayer[]; levelId: string }
  | { type: 'gameStart'; levelId: string; startTick: number }
  | { type: 'snapshot'; tick: number; state: SimulationSnapshot }
  | { type: 'levelComplete'; levelId: string }
  | { type: 'peerLeft' };
