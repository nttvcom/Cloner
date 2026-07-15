import Phaser from 'phaser';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { PLAYER_TINTS, UI } from '../colors';
import { t, toggleLang, getLang } from '../i18n';
import { setupCamera } from '../scale';
import { cloneTextureKey, ensureGameTextures, playerTextureKey } from '../render/textures';
import { fadeIn, goTo, makeButton, makeText } from '../ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    setupCamera(this);
    ensureGameTextures(this);
    this.drawBackground();
    fadeIn(this);

    const cx = VIEW_WIDTH / 2;

    // Title block
    const title = makeText(this, cx, 96, 'CLONER', {
      size: 64,
      bold: true,
      letterSpacing: 14,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 92,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    makeText(this, cx, 148, t('menu.subtitle'), { size: 14, color: UI.dim }).setOrigin(0.5);

    // Mascots: player cube + its dashed clone on each side of the title.
    this.mascot(cx - 250, 100, 'blue');
    this.mascot(cx + 250, 100, 'red');

    makeButton(this, cx, 235, t('menu.duo'), () => goTo(this, 'LevelSelect'), { primary: true });
    makeButton(this, cx, 302, t('menu.online'), () => goTo(this, 'Online'));
    makeButton(this, cx, 369, t('menu.help'), () => goTo(this, 'Help'));
    makeButton(
      this,
      cx,
      436,
      `${t('menu.langLabel')}: ${getLang().toUpperCase()}`,
      () => {
        toggleLang();
        this.scene.restart();
      },
      { width: 180, height: 40, size: 15 },
    );

    makeText(this, cx, VIEW_HEIGHT - 20, 'v1.1', { size: 11, color: UI.dim }).setOrigin(0.5);
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(-2);
    g.fillGradientStyle(UI.backgroundTop, UI.backgroundTop, UI.background, UI.background, 1);
    g.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    // faint grid
    g.lineStyle(1, 0xffffff, 0.025);
    for (let x = 0; x <= VIEW_WIDTH; x += 48) {
      g.lineBetween(x, 0, x, VIEW_HEIGHT);
    }
    for (let y = 0; y <= VIEW_HEIGHT; y += 48) {
      g.lineBetween(0, y, VIEW_WIDTH, y);
    }
    // drifting ghost clones in the far background
    for (let i = 0; i < 6; i += 1) {
      const color = i % 2 === 0 ? 'blue' : 'red';
      const ghost = this.add
        .image(
          Phaser.Math.Between(60, VIEW_WIDTH - 60),
          Phaser.Math.Between(200, VIEW_HEIGHT - 40),
          cloneTextureKey(color as 'blue' | 'red'),
        )
        .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE)
        .setAlpha(0.1)
        .setDepth(-1);
      this.tweens.add({
        targets: ghost,
        y: ghost.y - Phaser.Math.Between(15, 40),
        alpha: { from: 0.06, to: 0.16 },
        duration: Phaser.Math.Between(2400, 4200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500),
      });
    }
  }

  /** A bobbing player cube with its dashed clone peeking from behind. */
  private mascot(x: number, y: number, color: 'blue' | 'red'): void {
    const clone = this.add
      .image(x + 16, y + 10, cloneTextureKey(color))
      .setDisplaySize(PLAYER_SIZE * 1.5, PLAYER_SIZE * 1.5)
      .setAlpha(0.55);
    const cube = this.add
      .image(x - 6, y - 4, playerTextureKey(color))
      .setDisplaySize(PLAYER_SIZE * 1.9, PLAYER_SIZE * 1.9);
    this.tweens.add({
      targets: cube,
      y: y - 12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: color === 'red' ? 400 : 0,
    });
    this.tweens.add({
      targets: clone,
      y: y + 4,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: color === 'red' ? 200 : 600,
    });
    void PLAYER_TINTS;
  }
}
