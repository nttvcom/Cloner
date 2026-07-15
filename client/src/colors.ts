import type { DoorColor, PlayerColor } from '@cloner/shared';

/**
 * The single place UI/world colors live — the designer will supply a final
 * style reference later, so a reskin should only ever touch this file.
 */

export const UI = {
  background: 0x101116,
  backgroundTop: 0x171a22,
  panel: 0x1b1e26,
  panelEdge: 0x2c313d,
  button: 0x21252f,
  buttonEdge: 0x343a47,
  buttonHover: 0x2a2f3b,
  buttonPrimary: 0x2251a3,
  buttonPrimaryEdge: 0x3a76d8,
  buttonPrimaryHover: 0x2a62c4,
  text: '#eceef2',
  dim: '#8b909c',
  accent: '#ffd166',
  accentHex: 0xffd166,
  good: '#7ed957',
} as const;

export const PLAYER_TINTS: Record<PlayerColor, number> = {
  blue: 0x3b82f6,
  red: 0xf25a4e,
};

export const EXIT_TINTS: Record<DoorColor, number> = {
  blue: 0x3b82f6,
  red: 0xf25a4e,
  gray: 0x9aa0aa,
  double: 0xb07cff,
};

export const WORLD = {
  solid: 0x2c3038,
  solidTop: 0x3d434e,
  solidEdge: 0x505764,
  door: 0xc98a2e,
  doorEdge: 0xe8ae55,
  doorOpen: 0x6b5a35,
  button: 0x8fd14f,
  buttonPressed: 0x5a8f2e,
  buttonBase: 0x3a4048,
  platform: 0x7a8496,
  platformEdge: 0xa5adbd,
  laserBeam: 0xff3355,
  laserGlow: 0xff8899,
  laserEmitter: 0xd0d4dc,
  wire: 0x4a5160,
  wireActive: 0x8fd14f,
} as const;
