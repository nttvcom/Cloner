import Phaser from 'phaser';
import { ensureGameTextures } from '../render/textures';

/** Generates the canvas-drawn textures, then heads to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    ensureGameTextures(this);
    this.scene.start('Menu');
  }
}
