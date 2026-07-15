import Phaser from 'phaser';
import { UI } from './colors';

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: { fontSize?: number; disabled?: boolean } = {},
): Phaser.GameObjects.Text {
  const text = scene.add
    .text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: `${options.fontSize ?? 24}px`,
      color: options.disabled ? UI.dim : UI.text,
      backgroundColor: '#1b1d23',
      padding: { x: 18, y: 10 },
    })
    .setOrigin(0.5);
  if (!options.disabled) {
    text.setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setColor(UI.accent));
    text.on('pointerout', () => text.setColor(UI.text));
    text.on('pointerdown', onClick);
  }
  return text;
}

export function title(scene: Phaser.Scene, x: number, y: number, label: string): void {
  scene.add
    .text(x, y, label, { fontFamily: 'monospace', fontSize: '44px', color: UI.text })
    .setOrigin(0.5);
}
