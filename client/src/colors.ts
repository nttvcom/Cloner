import type { DoorColor, PlayerColor } from '@cloner/shared';

export const UI = {
  background: 0x111216,
  panel: 0x1b1d23,
  text: '#e8e8ec',
  dim: '#8a8f98',
  accent: '#ffd166',
} as const;

export const PLAYER_TINTS: Record<PlayerColor, number> = {
  blue: 0x4da3ff,
  red: 0xff5a5a,
};

export const CLONE_TINTS: Record<PlayerColor, number> = {
  blue: 0x2a5f99,
  red: 0x993a3a,
};

export const EXIT_TINTS: Record<DoorColor, number> = {
  blue: 0x4da3ff,
  red: 0xff5a5a,
  gray: 0x9aa0aa,
  double: 0xb07cff,
};

export const WORLD = {
  solid: 0x3a3f4a,
  solidEdge: 0x545b69,
  door: 0xc98a2e,
  doorOpen: 0x6b5a35,
  button: 0x8fd14f,
  buttonPressed: 0x5a8f2e,
  platform: 0x7a8496,
  laserBeam: 0xff3355,
  laserEmitter: 0xd0d4dc,
} as const;
