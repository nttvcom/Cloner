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
import { DebugPanel } from '../debug/DebugPanel';
import { DuoKeyboard, SoloKeyboard } from '../input/keyboard';
import { t } from '../i18n';
import { LevelRenderer } from '../render/LevelRenderer';
import { recordLevelComplete } from '../save';
import { fadeIn, goTo, makeText } from '../ui';
import { setupCamera } from '../scale';
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
  private fpsText!: Phaser.GameObjects.Text;
  private cloneTexts: Partial<Record<PlayerColor, Phaser.GameObjects.Text>> = {};
  private elapsedMs = 0;
  private overlayShown = false;
  private ended = false;
  private showFps = false;
  private debugPanel: DebugPanel | null = null;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.elapsedMs = 0;
    this.overlayShown = false;
    this.ended = false;
    this.cloneTexts = {};
    setupCamera(this);
    fadeIn(this);

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
    this.announceLevel();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.debugPanel?.destroy();
      this.debugPanel = null;
      this.levelRenderer.destroy();
    });

    this.input.keyboard!.on('keydown-ESC', () => this.quitToMenu());
    this.input.keyboard!.on('keydown-F3', () => {
      this.showFps = !this.showFps;
      this.fpsText.setVisible(this.showFps);
    });
    // R: quick restart (local sessions — online resets are server-authoritative).
    this.input.keyboard!.on('keydown-R', () => this.restartLevel());
    // Shift+~: hidden developer panel.
    this.input.keyboard!.on('keydown-BACKTICK', (event: KeyboardEvent) => {
      if (!event.shiftKey) return;
      if (this.debugPanel) {
        this.debugPanel.destroy();
        this.debugPanel = null;
      } else {
        this.debugPanel = new DebugPanel(this, this.session, this.session.level, this.levelIndex, {
          switchLevel: (index) => this.jumpToLevel(index),
          resetLevel: () => this.restartLevel(),
        });
      }
    });
  }

  private restartLevel(): void {
    if (this.ended || this.session.mode !== 'local') return;
    this.ended = true;
    this.session.dispose();
    this.scene.restart({ mode: 'local', levelIndex: this.levelIndex });
  }

  /** Debug-only: jump to any campaign level, ignoring unlock state. */
  private jumpToLevel(index: number): void {
    if (this.ended || this.session.mode !== 'local') return;
    const wrapped = (index + LEVELS.length) % LEVELS.length;
    this.ended = true;
    this.session.dispose();
    this.scene.restart({ mode: 'local', levelIndex: wrapped });
  }

  private quitToMenu(): void {
    if (this.ended) return;
    this.ended = true;
    this.session.dispose();
    if (this.session instanceof OnlineSession) {
      this.session.leave();
    }
    goTo(this, 'Menu');
  }

  private buildHud(): void {
    const level = this.session.level;
    makeText(this, 12, 8, `${this.levelIndex + 1}. ${t(level.nameKey)}`, {
      size: 14,
      color: UI.dim,
    }).setDepth(10);
    this.timerText = makeText(this, VIEW_WIDTH / 2, 8, '00:00', { size: 15 })
      .setOrigin(0.5, 0)
      .setDepth(10);
    makeText(this, VIEW_WIDTH - 12, 8, t('game.menuHint'), { size: 12, color: UI.dim })
      .setOrigin(1, 0)
      .setDepth(10);
    this.fpsText = makeText(this, VIEW_WIDTH - 12, 28, '', { size: 12, color: UI.accent })
      .setOrigin(1, 0)
      .setDepth(10)
      .setVisible(this.showFps);

    const colors: PlayerColor[] = ['blue', 'red'];
    colors.forEach((color, i) => {
      this.cloneTexts[color] = makeText(this, 12 + i * 132, 28, '', {
        size: 12,
        color: `#${PLAYER_TINTS[color].toString(16).padStart(6, '0')}`,
      }).setDepth(10);
    });
  }

  /** Level-name banner easing in and out at the start. */
  private announceLevel(): void {
    const banner = makeText(
      this,
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 - 60,
      `${this.levelIndex + 1}. ${t(this.session.level.nameKey)}`,
      { size: 30, bold: true },
    )
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      y: VIEW_HEIGHT / 2 - 70,
      duration: 320,
      ease: 'Quad.easeOut',
      hold: 750,
      yoyo: true,
      onComplete: () => banner.destroy(),
    });
  }

  override update(_time: number, delta: number): void {
    if (this.ended) return;

    this.session.update(delta, this.keyboard);

    const snapshot = this.session.snapshot();
    if (snapshot) {
      this.levelRenderer.render(snapshot);
      this.updateHud(snapshot, delta);
      this.debugPanel?.update(snapshot);
    }
    this.session.consumeEvents(); // renderer diffing owns the FX now

    if (this.showFps) {
      this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
    }

    const status = this.session.status();
    if (status.kind === 'complete' && !this.overlayShown) {
      this.overlayShown = true;
      this.showComplete();
    } else if (status.kind === 'nextLevel') {
      const online = this.session as OnlineSession;
      this.ended = true;
      online.advanceTo(status.level);
      this.scene.restart({ mode: 'online', session: online });
    } else if (status.kind === 'peerLeft' && !this.overlayShown) {
      this.overlayShown = true;
      this.showPeerLeft();
    }
  }

  private updateHud(snapshot: SimulationSnapshot, delta: number): void {
    if (!this.overlayShown) this.elapsedMs += delta;
    const total = Math.floor(this.elapsedMs / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    this.timerText.setText(`${mm}:${ss}`);

    const limit = this.session.level.cloneLimitPerPlayer;
    for (const color of ['blue', 'red'] as PlayerColor[]) {
      const used = snapshot.clones.filter((c) => c.owner === color).length;
      this.cloneTexts[color]?.setText(
        `${color === 'blue' ? 'P1' : 'P2'} ${t('game.clones')}: ${used}/${limit}`,
      );
    }
  }

  private overlayPieces(main: string, hint: string): void {
    const dim = this.add
      .rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH, VIEW_HEIGHT, 0x000000, 0)
      .setDepth(19);
    this.tweens.add({ targets: dim, fillAlpha: 0.55, duration: 280 });

    const title = makeText(this, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 34, main, {
      size: 34,
      bold: true,
      color: UI.accent,
    })
      .setOrigin(0.5)
      .setDepth(21)
      .setScale(0.6)
      .setAlpha(0);
    this.tweens.add({
      targets: title,
      scale: 1,
      alpha: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
    if (hint) {
      const sub = makeText(this, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 22, hint, { size: 16 })
        .setOrigin(0.5)
        .setDepth(21)
        .setAlpha(0);
      this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 250 });
    }
  }

  private showComplete(): void {
    this.levelRenderer.celebrate();
    const isLast = this.levelIndex >= LEVELS.length - 1;

    if (this.session.mode === 'local') {
      recordLevelComplete(this.levelIndex);
      this.overlayPieces(
        isLast ? t('game.finished') : t('game.complete'),
        isLast ? t('game.finishedHint') : t('game.nextHint'),
      );
      this.input.keyboard!.once('keydown-SPACE', () => {
        this.ended = true;
        if (isLast) {
          goTo(this, 'Menu');
        } else {
          this.cameras.main.fadeOut(160, 10, 11, 14);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.restart({ mode: 'local', levelIndex: this.levelIndex + 1 });
          });
        }
      });
    } else {
      // Online: the server schedules the next level; update() will catch the
      // nextLevel status and restart the scene.
      this.overlayPieces(
        isLast ? t('game.finished') : t('game.complete'),
        isLast ? '' : t('game.nextOnline'),
      );
    }
  }

  private showPeerLeft(): void {
    this.overlayPieces(t('game.peerLeft'), '');
    this.time.delayedCall(2500, () => this.quitToMenu());
  }
}
