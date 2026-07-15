import Phaser from 'phaser';
import {
  LEVELS,
  getLevelIndex,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type PlayerColor,
  type SimulationSnapshot,
} from '@cloner/shared';
import { PLAYER_TINTS, UI } from '../colors';
import { DuoKeyboard, SoloKeyboard } from '../input/keyboard';
import { t } from '../i18n';
import { LevelRenderer } from '../render/LevelRenderer';
import { recordLevelComplete } from '../save';
import type { GameSession } from '../sessions/GameSession';
import { LocalSession } from '../sessions/LocalSession';
import { OnlineSession } from '../sessions/OnlineSession';

type GameData =
  | { mode: 'local'; levelIndex: number }
  | { mode: 'online'; session: OnlineSession };

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private keyboard!: DuoKeyboard | SoloKeyboard;
  private levelRenderer!: LevelRenderer;
  private levelIndex = 0;

  private timerText!: Phaser.GameObjects.Text;
  private cloneTexts: Partial<Record<PlayerColor, Phaser.GameObjects.Text>> = {};
  private elapsedMs = 0;
  private overlayShown = false;
  private ended = false;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.elapsedMs = 0;
    this.overlayShown = false;
    this.ended = false;
    this.cloneTexts = {};

    if (data.mode === 'local') {
      this.levelIndex = data.levelIndex;
      this.session = new LocalSession(LEVELS[data.levelIndex]!);
      this.keyboard = new DuoKeyboard(this);
    } else {
      this.session = data.session;
      this.levelIndex = Math.max(0, getLevelIndex(this.session.level.id));
      this.keyboard = new SoloKeyboard(this);
    }

    this.levelRenderer = new LevelRenderer(this, this.session.level);
    this.buildHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.levelRenderer.destroy();
    });

    this.input.keyboard!.on('keydown-ESC', () => this.quitToMenu());
  }

  private quitToMenu(): void {
    this.session.dispose();
    if (this.session.mode === 'online') {
      const online = this.session as OnlineSession;
      void online; // client life ends with the page for now: simplest reliable cleanup
    }
    this.scene.start('Menu');
  }

  private buildHud(): void {
    const level = this.session.level;
    this.add
      .text(12, 10, `${this.levelIndex + 1}. ${t(level.nameKey)}`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: UI.dim,
      })
      .setDepth(10);
    this.timerText = this.add
      .text(VIEW_WIDTH / 2, 10, '00:00', { fontFamily: 'monospace', fontSize: '16px', color: UI.text })
      .setOrigin(0.5, 0)
      .setDepth(10);
    this.add
      .text(VIEW_WIDTH - 12, 10, t('game.menuHint'), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: UI.dim,
      })
      .setOrigin(1, 0)
      .setDepth(10);

    const colors: PlayerColor[] = ['blue', 'red'];
    colors.forEach((color, i) => {
      this.cloneTexts[color] = this.add
        .text(12 + i * 130, 32, '', {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: `#${PLAYER_TINTS[color].toString(16).padStart(6, '0')}`,
        })
        .setDepth(10);
    });
  }

  override update(_time: number, delta: number): void {
    if (this.ended) return;

    this.session.update(delta, this.keyboard);

    const snapshot = this.session.snapshot();
    if (snapshot) {
      this.levelRenderer.render(snapshot);
      this.updateHud(snapshot, delta);
    }

    for (const event of this.session.consumeEvents()) {
      if (event.type === 'levelReset') {
        this.cameras.main.flash(220, 255, 60, 60);
      }
      if (event.type === 'clonePlaced') {
        this.cameras.main.shake(60, 0.002);
      }
    }

    const status = this.session.status();
    if (status.kind === 'complete' && !this.overlayShown) {
      this.overlayShown = true;
      this.showComplete();
    } else if (status.kind === 'nextLevel') {
      const online = this.session as OnlineSession;
      online.advanceTo(status.level);
      this.scene.restart({ mode: 'online', session: online });
    } else if (status.kind === 'peerLeft' && !this.overlayShown) {
      this.overlayShown = true;
      this.showPeerLeft();
    }
  }

  private updateHud(snapshot: SimulationSnapshot, delta: number): void {
    this.elapsedMs += delta;
    const total = Math.floor(this.elapsedMs / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`);

    const limit = this.session.level.cloneLimitPerPlayer;
    for (const color of ['blue', 'red'] as PlayerColor[]) {
      const used = snapshot.clones.filter((c) => c.owner === color).length;
      this.cloneTexts[color]?.setText(`${color === 'blue' ? 'P1' : 'P2'} ${t('game.clones')}: ${used}/${limit}`);
    }
  }

  private dimBackground(): void {
    this.add
      .rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0.6)
      .setDepth(20);
  }

  private showComplete(): void {
    this.dimBackground();
    const cx = VIEW_WIDTH / 2;
    const isLast = this.levelIndex >= LEVELS.length - 1;

    if (this.session.mode === 'local') {
      recordLevelComplete(this.levelIndex);
      this.add
        .text(cx, VIEW_HEIGHT / 2 - 30, isLast ? t('game.finished') : t('game.complete'), {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: UI.accent,
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.add
        .text(cx, VIEW_HEIGHT / 2 + 25, isLast ? t('game.finishedHint') : t('game.nextHint'), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: UI.text,
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.input.keyboard!.once('keydown-SPACE', () => {
        this.ended = true;
        if (isLast) {
          this.scene.start('Menu');
        } else {
          this.scene.restart({ mode: 'local', levelIndex: this.levelIndex + 1 });
        }
      });
    } else {
      // Online: the server drives the next level; just tell the players.
      this.add
        .text(cx, VIEW_HEIGHT / 2 - 30, isLast ? t('game.finished') : t('game.complete'), {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: UI.accent,
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.add
        .text(cx, VIEW_HEIGHT / 2 + 25, isLast ? '' : t('game.nextOnline'), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: UI.text,
        })
        .setOrigin(0.5)
        .setDepth(21);
      // keep polling status(): the server will send the next gameStart
      this.overlayShown = true;
      this.time.addEvent({
        delay: 100,
        loop: true,
        callback: () => {
          const status = this.session.status();
          if (status.kind === 'nextLevel') {
            const online = this.session as OnlineSession;
            online.advanceTo(status.level);
            this.scene.restart({ mode: 'online', session: online });
          }
        },
      });
    }
  }

  private showPeerLeft(): void {
    this.dimBackground();
    this.add
      .text(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, t('game.peerLeft'), {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: UI.accent,
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.time.delayedCall(2500, () => this.quitToMenu());
  }
}
