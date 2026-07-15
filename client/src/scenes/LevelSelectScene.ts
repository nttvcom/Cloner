import Phaser from 'phaser';
import { LEVELS, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { getProgress } from '../save';
import { makeButton, title } from '../ui';

const COLS = 5;
const CELL = 120;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const cx = VIEW_WIDTH / 2;
    title(this, cx, 60, t('select.title'));

    const unlocked = getProgress() + 1; // number of playable levels
    const rows = Math.ceil(LEVELS.length / COLS);
    const gridW = Math.min(LEVELS.length, COLS) * CELL;
    const originX = cx - gridW / 2 + CELL / 2;
    const originY = 190;

    LEVELS.forEach((level, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = originX + col * CELL;
      const y = originY + row * CELL;
      const isUnlocked = index < unlocked;

      const box = this.add
        .rectangle(x, y, 92, 92, isUnlocked ? 0x252833 : 0x17181d)
        .setStrokeStyle(2, isUnlocked ? 0x545b69 : 0x2a2d35);
      this.add
        .text(x, y - 14, String(index + 1), {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: isUnlocked ? UI.text : UI.dim,
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + 26, isUnlocked ? t(level.nameKey) : t('select.locked'), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: UI.dim,
        })
        .setOrigin(0.5);

      if (isUnlocked) {
        box.setInteractive({ useHandCursor: true });
        box.on('pointerover', () => box.setStrokeStyle(2, 0xffd166));
        box.on('pointerout', () => box.setStrokeStyle(2, 0x545b69));
        box.on('pointerdown', () => this.scene.start('Game', { mode: 'local', levelIndex: index }));
      }
    });

    void rows;
    makeButton(this, cx, VIEW_HEIGHT - 45, t('select.back'), () => this.scene.start('Menu'), {
      fontSize: 18,
    });
    this.input.keyboard!.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}
