import Phaser from 'phaser';
import {
  getLevelById,
  getLevelIndex,
  LEVELS,
  PLAYER_COLORS,
  PLAYER_SIZE,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type LobbyPlayer,
  type PlayerColor,
} from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import type { OnlineClient } from '../net/OnlineClient';
import { getProgress } from '../save';
import { setupCamera } from '../scale';
import { ensureGameTextures, playerTextureKey } from '../render/textures';
import { OnlineSession } from '../sessions/OnlineSession';
import { fadeIn, goTo, makeButton, makeText, makeTitle } from '../ui';

interface LobbyData {
  client: OnlineClient;
  code: string;
  color: PlayerColor;
  lobby: LobbyPlayer[];
  levelId: string;
}

export class LobbyScene extends Phaser.Scene {
  private client!: OnlineClient;
  private myColor!: PlayerColor;
  private ready = false;
  private slotTexts: Partial<Record<PlayerColor, Phaser.GameObjects.Text>> = {};
  private noteText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private levelIndex = 0;

  constructor() {
    super('Lobby');
  }

  create(data: LobbyData): void {
    this.client = data.client;
    this.myColor = data.color;
    this.ready = false;
    this.slotTexts = {};
    this.levelIndex = Math.max(0, getLevelIndex(data.levelId));
    setupCamera(this);
    ensureGameTextures(this);
    fadeIn(this);

    const cx = VIEW_WIDTH / 2;
    makeTitle(this, cx, 48, t('lobby.title'));
    makeText(this, cx, 105, data.code, {
      size: 44,
      bold: true,
      color: UI.accent,
      letterSpacing: 12,
    }).setOrigin(0.5);
    makeText(this, cx, 140, t('lobby.shareHint'), { size: 12, color: UI.dim }).setOrigin(0.5);

    PLAYER_COLORS.forEach((color, i) => {
      const y = 200 + i * 58;
      this.add.image(cx - 190, y, playerTextureKey(color)).setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
      this.slotTexts[color] = makeText(this, cx - 155, y, '', { size: 18 }).setOrigin(0, 0.5);
    });

    // Level picker: host cycles through unlocked levels, guest just watches.
    const pickerY = 340;
    makeText(this, cx, pickerY - 26, t('lobby.levelLabel'), { size: 13, color: UI.dim }).setOrigin(0.5);
    this.levelText = makeText(this, cx, pickerY, '', { size: 18, bold: true }).setOrigin(0.5);
    if (this.myColor === 'blue') {
      makeButton(this, cx - 180, pickerY, '<', () => this.cycleLevel(-1), {
        width: 46,
        height: 40,
        size: 18,
      });
      makeButton(this, cx + 180, pickerY, '>', () => this.cycleLevel(1), {
        width: 46,
        height: 40,
        size: 18,
      });
    }
    this.updateLevelText();

    this.noteText = makeText(this, cx, 400, t('lobby.hint'), { size: 15, color: UI.dim }).setOrigin(0.5);

    this.renderLobby(data.lobby);

    this.client.on('lobby', (lobby, levelId) => {
      this.levelIndex = Math.max(0, getLevelIndex(levelId));
      this.updateLevelText();
      this.renderLobby(lobby);
    });
    this.client.on('gameStart', (levelId) => {
      this.client.off('lobby');
      this.client.off('peerLeft');
      this.client.off('disconnected');
      this.client.off('gameStart');
      const session = new OnlineSession(this.client, levelId);
      this.scene.start('Game', { mode: 'online', session });
    });
    this.client.on('peerLeft', () => {
      this.ready = false;
      this.noteText.setText(`${t('lobby.peerLeft')}  ${t('lobby.hint')}`);
    });
    this.client.on('disconnected', () => this.scene.start('Online'));

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.ready = !this.ready;
      this.client.send({ type: 'setReady', ready: this.ready });
    });

    makeButton(
      this,
      cx,
      VIEW_HEIGHT - 42,
      t('lobby.leave'),
      () => {
        this.client.send({ type: 'leaveRoom' });
        this.client.disconnect();
        goTo(this, 'Menu');
      },
      { width: 170, height: 40, size: 15 },
    );
  }

  /** Host only: step through the levels this client has unlocked. */
  private cycleLevel(direction: number): void {
    const unlocked = Math.min(getProgress() + 1, LEVELS.length);
    this.levelIndex = (this.levelIndex + direction + unlocked) % unlocked;
    const level = LEVELS[this.levelIndex]!;
    this.updateLevelText();
    this.client.send({ type: 'selectLevel', levelId: level.id });
  }

  private updateLevelText(): void {
    const level = LEVELS[this.levelIndex] ?? LEVELS[0]!;
    this.levelText.setText(`${this.levelIndex + 1}. ${t(level.nameKey)}`);
    void getLevelById;
  }

  private renderLobby(lobby: LobbyPlayer[]): void {
    for (const color of PLAYER_COLORS) {
      const slot = lobby.find((p) => p.color === color);
      const text = this.slotTexts[color];
      if (!text) continue;
      if (!slot || !slot.connected) {
        text.setText(t('lobby.waiting')).setColor(UI.dim);
        continue;
      }
      if (color === this.myColor) this.ready = slot.ready;
      const you = color === this.myColor ? ` (${t('lobby.you')})` : '';
      const state = slot.ready ? t('lobby.ready') : t('lobby.notReady');
      text.setText(`${color === 'blue' ? 'P1' : 'P2'}${you} — ${state}`);
      text.setColor(slot.ready ? UI.good : UI.text);
    }
  }
}
