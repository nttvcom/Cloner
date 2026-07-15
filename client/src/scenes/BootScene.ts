import Phaser from 'phaser';

/** No assets to preload yet (everything is vector) — go straight to the menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Menu');
  }
}
