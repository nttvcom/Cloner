import Phaser from 'phaser';
import { LEVELS, SOLO_LEVELS, VIEW_HEIGHT, VIEW_WIDTH, type LevelDefinition } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { getProgress, getSoloProgress } from '../save';
import { setupCamera } from '../scale';
import { fadeIn, goTo, makeButton, makeText, makeTitle } from '../ui';

type Campaign = 'coop' | 'solo';

const COLS = 5;
const CELL_W = 150;
const CELL_H = 76;

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(data: { campaign?: Campaign }): void {
    const campaign: Campaign = data?.campaign ?? 'coop';
    const levels: readonly LevelDefinition[] = campaign === 'solo' ? SOLO_LEVELS : LEVELS;
    const unlocked = (campaign === 'solo' ? getSoloProgress() : getProgress()) + 1;
    const gameMode = campaign === 'solo' ? 'solo' : 'local';

    setupCamera(this);
    fadeIn(this);
    const cx = VIEW_WIDTH / 2;
    makeTitle(this, cx, 40, t(campaign === 'solo' ? 'select.soloTitle' : 'select.title'));

    const rows = Math.ceil(levels.length / COLS);
    const gridW = COLS * CELL_W;
    const originX = cx - gridW / 2 + CELL_W / 2;
    const originY = 96;

    levels.forEach((level, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = originX + col * CELL_W;
      const y = originY + row * CELL_H;
      const isUnlocked = index < unlocked;

      const box = this.add
        .rectangle(x, y, CELL_W - 14, CELL_H - 12, isUnlocked ? UI.panel : 0x15161b)
        .setStrokeStyle(2, isUnlocked ? UI.panelEdge : 0x22242c);
      makeText(this, x - (CELL_W - 14) / 2 + 10, y - (CELL_H - 12) / 2 + 5, String(index + 1), {
        size: 20,
        bold: true,
        color: isUnlocked ? UI.text : UI.dim,
      });
      makeText(this, x, y + 15, isUnlocked ? t(level.nameKey) : t('select.locked'), {
        size: 11,
        color: UI.dim,
      }).setOrigin(0.5);

      if (isUnlocked) {
        box.setInteractive({ useHandCursor: true });
        box.on('pointerover', () => {
          box.setStrokeStyle(2, UI.accentHex);
          this.tweens.add({ targets: box, scale: 1.05, duration: 100 });
        });
        box.on('pointerout', () => {
          box.setStrokeStyle(2, UI.panelEdge);
          this.tweens.add({ targets: box, scale: 1, duration: 100 });
        });
        box.on('pointerdown', () => goTo(this, 'Game', { mode: gameMode, levelIndex: index }));
      } else {
        const lock = this.add.graphics();
        lock.lineStyle(2, 0x555a66, 1);
        lock.strokeCircle(x + (CELL_W - 14) / 2 - 14, y - (CELL_H - 12) / 2 + 11, 4);
        lock.fillStyle(0x555a66, 1);
        lock.fillRect(x + (CELL_W - 14) / 2 - 19, y - (CELL_H - 12) / 2 + 12, 10, 7);
      }
    });

    const backY = Math.min(VIEW_HEIGHT - 30, originY + rows * CELL_H + 6);
    makeButton(this, cx, backY, t('select.back'), () => goTo(this, 'Menu'), {
      width: 170,
      height: 38,
      size: 15,
    });
    this.input.keyboard!.once('keydown-ESC', () => goTo(this, 'Menu'));
  }
}
