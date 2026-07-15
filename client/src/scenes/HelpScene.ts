import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { makeButton, title } from '../ui';

export class HelpScene extends Phaser.Scene {
  constructor() {
    super('Help');
  }

  create(): void {
    const cx = VIEW_WIDTH / 2;
    title(this, cx, 60, t('help.title'));
    this.add
      .text(cx, 280, t('help.body'), {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: UI.text,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    makeButton(this, cx, VIEW_HEIGHT - 45, t('help.back'), () => this.scene.start('Menu'), {
      fontSize: 18,
    });
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}
