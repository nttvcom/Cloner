import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t, toggleLang } from '../i18n';
import { makeButton } from '../ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = VIEW_WIDTH / 2;

    this.add
      .text(cx, 110, t('menu.title'), {
        fontFamily: 'monospace',
        fontSize: '64px',
        color: UI.text,
        letterSpacing: 12,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 165, t('menu.subtitle'), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: UI.dim,
      })
      .setOrigin(0.5);

    makeButton(this, cx, 250, t('menu.duo'), () => this.scene.start('LevelSelect'));
    makeButton(this, cx, 315, t('menu.online'), () => this.scene.start('Online'));
    makeButton(this, cx, 380, t('menu.help'), () => this.scene.start('Help'));
    makeButton(
      this,
      cx,
      445,
      t('menu.lang'),
      () => {
        toggleLang();
        this.scene.restart();
      },
      { fontSize: 16 },
    );

    this.add
      .text(cx, VIEW_HEIGHT - 24, 'v1.0', { fontFamily: 'monospace', fontSize: '12px', color: UI.dim })
      .setOrigin(0.5);
  }
}
