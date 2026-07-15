import Phaser from 'phaser';
import { PLAYER_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { setupCamera } from '../scale';
import { cloneTextureKey, ensureGameTextures, playerTextureKey } from '../render/textures';
import { fadeIn, goTo, makeButton, makeText, makeTitle } from '../ui';

export class HelpScene extends Phaser.Scene {
  constructor() {
    super('Help');
  }

  create(): void {
    setupCamera(this);
    ensureGameTextures(this);
    fadeIn(this);
    const cx = VIEW_WIDTH / 2;
    makeTitle(this, cx, 48, t('help.title'));

    // Icon legend: player vs clone.
    const iconY = 100;
    this.add.image(cx - 190, iconY, playerTextureKey('blue')).setDisplaySize(PLAYER_SIZE * 1.4, PLAYER_SIZE * 1.4);
    makeText(this, cx - 190, iconY + 32, t('help.iconPlayer'), { size: 12, color: UI.dim }).setOrigin(0.5);
    this.add.image(cx - 63, iconY, cloneTextureKey('blue')).setDisplaySize(PLAYER_SIZE * 1.4, PLAYER_SIZE * 1.4);
    makeText(this, cx - 63, iconY + 32, t('help.iconClone'), { size: 12, color: UI.dim }).setOrigin(0.5);
    this.add.image(cx + 63, iconY, playerTextureKey('red')).setDisplaySize(PLAYER_SIZE * 1.4, PLAYER_SIZE * 1.4);
    makeText(this, cx + 63, iconY + 32, t('help.iconPlayer'), { size: 12, color: UI.dim }).setOrigin(0.5);
    this.add.image(cx + 190, iconY, cloneTextureKey('red')).setDisplaySize(PLAYER_SIZE * 1.4, PLAYER_SIZE * 1.4);
    makeText(this, cx + 190, iconY + 32, t('help.iconClone'), { size: 12, color: UI.dim }).setOrigin(0.5);

    makeText(this, cx, 315, t('help.body'), { size: 14, lineSpacing: 5 }).setOrigin(0.5);

    makeButton(this, cx, VIEW_HEIGHT - 42, t('help.back'), () => goTo(this, 'Menu'), {
      width: 180,
      height: 42,
      size: 16,
    });
    this.input.keyboard!.once('keydown-ESC', () => goTo(this, 'Menu'));
  }
}
