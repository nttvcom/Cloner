import Phaser from 'phaser';
import { UI } from './colors';
import { RENDER_SCALE } from './scale';

export interface TextOptions {
  size?: number;
  color?: string;
  align?: string;
  lineSpacing?: number;
  letterSpacing?: number;
  bold?: boolean;
}

/** All UI text goes through here: `resolution` keeps glyphs crisp under zoom. */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  options: TextOptions = {},
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, str, {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    fontSize: `${options.size ?? 16}px`,
    fontStyle: options.bold ? 'bold' : 'normal',
    color: options.color ?? UI.text,
    align: options.align ?? 'center',
    lineSpacing: options.lineSpacing ?? 4,
  });
  text.setResolution(RENDER_SCALE * 2);
  if (options.letterSpacing) text.setLetterSpacing(options.letterSpacing);
  return text;
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  size?: number;
  primary?: boolean;
}

/** Rounded button with hover/press tweens. Returns the container. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const width = options.width ?? 300;
  const height = options.height ?? 52;
  const radius = 12;

  const bg = scene.add.graphics();
  const draw = (fill: number, stroke: number): void => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.lineStyle(2, stroke, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  };
  const base = options.primary ? UI.buttonPrimary : UI.button;
  const baseStroke = options.primary ? UI.buttonPrimaryEdge : UI.buttonEdge;
  draw(base, baseStroke);

  const text = makeText(scene, 0, 0, label, {
    size: options.size ?? 20,
    bold: true,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    draw(options.primary ? UI.buttonPrimaryHover : UI.buttonHover, UI.accentHex);
    scene.tweens.add({ targets: container, scale: 1.04, duration: 110, ease: 'Quad.easeOut' });
  });
  container.on('pointerout', () => {
    draw(base, baseStroke);
    scene.tweens.add({ targets: container, scale: 1, duration: 110, ease: 'Quad.easeOut' });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scale: 0.96, duration: 60, yoyo: true });
    scene.time.delayedCall(90, onClick);
  });
  return container;
}

export function makeTitle(scene: Phaser.Scene, x: number, y: number, label: string): void {
  makeText(scene, x, y, label, { size: 34, bold: true, letterSpacing: 2 }).setOrigin(0.5);
}

/** Fade the camera in on scene start; call at the top of create(). */
export function fadeIn(scene: Phaser.Scene, ms = 220): void {
  scene.cameras.main.fadeIn(ms, 10, 11, 14);
}

/** Fade out, then switch scenes. */
export function goTo(scene: Phaser.Scene, key: string, data?: object, ms = 180): void {
  scene.cameras.main.fadeOut(ms, 10, 11, 14);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
}
