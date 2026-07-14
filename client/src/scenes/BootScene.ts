import Phaser from 'phaser';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';

/**
 * First scene in the flow. For now it only proves the pipeline works
 * (Phaser boots, shared package resolves); milestone 3 replaces the
 * placeholder with Preload -> MainMenu.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const centerX = VIEW_WIDTH / 2;
    const centerY = VIEW_HEIGHT / 2;

    this.add
      .text(centerX, centerY - 40, 'CLONER', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8e8ec',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 16, 'scaffolding ok — milestone 1', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8a8f98',
      })
      .setOrigin(0.5);

    this.add.rectangle(centerX - 40, centerY + 80, PLAYER_SIZE, PLAYER_SIZE, 0x4da3ff);
    this.add.rectangle(centerX + 40, centerY + 80, PLAYER_SIZE, PLAYER_SIZE, 0xff5a5a);
  }
}
