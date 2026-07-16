import Phaser from 'phaser';
import { BUTTON_HEIGHT, BUTTON_WIDTH, PLAYER_SIZE, type PlayerColor } from '@cloner/shared';

/**
 * Player/clone art per the designer's reference: rounded plate with a
 * vertical gradient, corner rivets, glossy top band and a smiley face;
 * clones are a dashed outline with the face in the owner's color.
 *
 * Drawn once on a hidden Canvas2D (gradients, setLineDash and arcs are all
 * native there) and registered as textures, so gameplay rendering is plain
 * sprite transforms — no per-frame vector work.
 */

/** Texture pixels per world pixel; sprites are drawn at PLAYER_SIZE anyway. */
const ART = 6;

interface PlayerPalette {
  top: string;
  bottom: string;
  border: string;
  rivet: string;
  rivetDot: string;
  gloss: string;
}

const PLAYER_PALETTES: Record<PlayerColor, PlayerPalette> = {
  blue: {
    top: '#6fb1f7',
    bottom: '#1f6be0',
    border: '#1450b4',
    rivet: '#2b62c4',
    rivetDot: '#7db4f5',
    gloss: 'rgba(255,255,255,0.28)',
  },
  red: {
    top: '#f28b82',
    bottom: '#d63a2f',
    border: '#a52318',
    rivet: '#b6382c',
    rivetDot: '#f4a49b',
    gloss: 'rgba(255,255,255,0.25)',
  },
};

const CLONE_TINTS: Record<PlayerColor, string> = {
  blue: '#3b82f6',
  red: '#fa5f55',
};

const FACE_DARK = '#101418';

export function playerTextureKey(color: PlayerColor): string {
  return `player-${color}`;
}

export function cloneTextureKey(color: PlayerColor): string {
  return `clone-${color}`;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawFace(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  const eyeW = s * 0.075;
  const eyeH = s * 0.14;
  const eyeY = s * 0.42;
  ctx.fillStyle = color;
  for (const ex of [s * 0.36, s * 0.64]) {
    roundedRectPath(ctx, ex - eyeW / 2, eyeY, eyeW, eyeH, eyeW / 2);
    ctx.fill();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.56, s * 0.155, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
}

function makeCanvas(s: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  return [canvas, canvas.getContext('2d')!];
}

function drawPlayer(color: PlayerColor): HTMLCanvasElement {
  const s = PLAYER_SIZE * ART;
  const [canvas, ctx] = makeCanvas(s);
  const p = PLAYER_PALETTES[color];
  const r = s * 0.2;

  // Border plate, then the gradient body inset into it.
  ctx.fillStyle = p.border;
  roundedRectPath(ctx, 0, 0, s, s, r);
  ctx.fill();

  const inset = s * 0.045;
  const grad = ctx.createLinearGradient(0, inset, 0, s - inset);
  grad.addColorStop(0, p.top);
  grad.addColorStop(1, p.bottom);
  ctx.fillStyle = grad;
  roundedRectPath(ctx, inset, inset, s - inset * 2, s - inset * 2, r * 0.82);
  ctx.fill();

  // Glossy top band.
  ctx.fillStyle = p.gloss;
  roundedRectPath(ctx, s * 0.1, s * 0.075, s * 0.8, s * 0.24, s * 0.1);
  ctx.fill();

  // Corner rivets.
  const rivetR = s * 0.042;
  for (const [rx, ry] of [
    [s * 0.16, s * 0.16],
    [s * 0.84, s * 0.16],
    [s * 0.16, s * 0.84],
    [s * 0.84, s * 0.84],
  ] as const) {
    ctx.fillStyle = p.rivet;
    ctx.beginPath();
    ctx.arc(rx, ry, rivetR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.rivetDot;
    ctx.beginPath();
    ctx.arc(rx, ry, rivetR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFace(ctx, s, FACE_DARK);
  return canvas;
}

function drawClone(color: PlayerColor): HTMLCanvasElement {
  const s = PLAYER_SIZE * ART;
  const [canvas, ctx] = makeCanvas(s);
  const tint = CLONE_TINTS[color];

  const lw = s * 0.055;
  ctx.strokeStyle = tint;
  ctx.lineWidth = lw;
  ctx.lineCap = 'butt';
  ctx.setLineDash([s * 0.1, s * 0.075]);
  roundedRectPath(ctx, lw, lw, s - lw * 2, s - lw * 2, s * 0.17);
  ctx.stroke();
  ctx.setLineDash([]);

  drawFace(ctx, s, tint);
  return canvas;
}

/** Idempotent: call from any scene's create() before using the keys. */
export function ensureGameTextures(scene: Phaser.Scene): void {
  const colors: PlayerColor[] = ['blue', 'red'];
  for (const color of colors) {
    if (!scene.textures.exists(playerTextureKey(color))) {
      scene.textures.addCanvas(playerTextureKey(color), drawPlayer(color));
    }
    if (!scene.textures.exists(cloneTextureKey(color))) {
      scene.textures.addCanvas(cloneTextureKey(color), drawClone(color));
    }
  }
}

// ---------------------------------------------------------------------------
// Environment textures (doors, platforms, button plates) — same Canvas2D
// approach, same palette as colors.ts, generated per-size on demand.
// ---------------------------------------------------------------------------

const ENV_ART = 4;

/** Roller-shutter door panel: horizontal slats, dark side rails. */
export function ensureDoorTexture(scene: Phaser.Scene, w: number, h: number): string {
  const key = `door-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const cw = w * ENV_ART;
  const ch = h * ENV_ART;
  const [canvas, ctx] = makeCanvas2(cw, ch);

  const grad = ctx.createLinearGradient(0, 0, cw, 0);
  grad.addColorStop(0, '#a06f24');
  grad.addColorStop(0.5, '#d29538');
  grad.addColorStop(1, '#a06f24');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  // Slats: the door reads as a shutter that retracts upward.
  const slat = 12 * ENV_ART;
  for (let y = 0; y < ch; y += slat) {
    ctx.fillStyle = 'rgba(255, 220, 140, 0.35)';
    ctx.fillRect(0, y, cw, 2 * ENV_ART);
    ctx.fillStyle = 'rgba(60, 38, 8, 0.35)';
    ctx.fillRect(0, y + slat - 1.5 * ENV_ART, cw, 1.5 * ENV_ART);
  }
  // Side rails.
  ctx.fillStyle = '#6e4c16';
  ctx.fillRect(0, 0, 2.5 * ENV_ART, ch);
  ctx.fillRect(cw - 2.5 * ENV_ART, 0, 2.5 * ENV_ART, ch);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Metal deck for moving platforms and elevators. */
export function ensurePlatformTexture(scene: Phaser.Scene, w: number, h: number): string {
  const key = `plat-${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const cw = w * ENV_ART;
  const ch = h * ENV_ART;
  const [canvas, ctx] = makeCanvas2(cw, ch);

  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#9aa4b6');
  grad.addColorStop(0.35, '#7a8496');
  grad.addColorStop(1, '#59616f');
  ctx.fillStyle = grad;
  roundedRectPath(ctx, 0, 0, cw, ch, 2 * ENV_ART);
  ctx.fill();
  // Bright walking surface.
  ctx.fillStyle = '#c3cad8';
  ctx.fillRect(1.5 * ENV_ART, 0, cw - 3 * ENV_ART, 1.5 * ENV_ART);
  // Tread marks.
  ctx.fillStyle = 'rgba(30, 34, 42, 0.4)';
  const step = 14 * ENV_ART;
  for (let x = step / 2; x < cw - 4; x += step) {
    ctx.fillRect(x, 3 * ENV_ART, 4 * ENV_ART, 1 * ENV_ART);
  }
  // End caps.
  ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
  ctx.fillRect(0, 0, 1.2 * ENV_ART, ch);
  ctx.fillRect(cw - 1.2 * ENV_ART, 0, 1.2 * ENV_ART, ch);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Pressure-plate top: idle (bright) and pressed (dark) variants. */
export function ensurePlateTextures(scene: Phaser.Scene): { idle: string; pressed: string } {
  const keys = { idle: 'plate-idle', pressed: 'plate-pressed' };
  if (scene.textures.exists(keys.idle)) return keys;
  const cw = BUTTON_WIDTH * ENV_ART;
  const ch = BUTTON_HEIGHT * ENV_ART;
  const draw = (top: string, bottom: string, rim: string): HTMLCanvasElement => {
    const [canvas, ctx] = makeCanvas2(cw, ch);
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    roundedRectPath(ctx, 0, 0, cw, ch, 2.5 * ENV_ART);
    ctx.fill();
    ctx.fillStyle = rim;
    ctx.fillRect(1.5 * ENV_ART, 0.6 * ENV_ART, cw - 3 * ENV_ART, 1.2 * ENV_ART);
    return canvas;
  };
  scene.textures.addCanvas(keys.idle, draw('#a8e06a', '#6ba635', 'rgba(255,255,255,0.5)'));
  scene.textures.addCanvas(keys.pressed, draw('#5f9431', '#3f6520', 'rgba(255,255,255,0.18)'));
  return keys;
}

function makeCanvas2(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!];
}
