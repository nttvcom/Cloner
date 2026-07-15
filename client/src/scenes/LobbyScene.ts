import Phaser from 'phaser';
import {
  PLAYER_COLORS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type LobbyPlayer,
  type PlayerColor,
} from '@cloner/shared';
import { PLAYER_TINTS, UI } from '../colors';
import { t } from '../i18n';
import type { OnlineClient } from '../net/OnlineClient';
import { OnlineSession } from '../sessions/OnlineSession';
import { makeButton, title } from '../ui';

interface LobbyData {
  client: OnlineClient;
  code: string;
  color: PlayerColor;
  lobby: LobbyPlayer[];
}

export class LobbyScene extends Phaser.Scene {
  private client!: OnlineClient;
  private myColor!: PlayerColor;
  private ready = false;
  private slotTexts: Partial<Record<PlayerColor, Phaser.GameObjects.Text>> = {};
  private noteText!: Phaser.GameObjects.Text;

  constructor() {
    super('Lobby');
  }

  create(data: LobbyData): void {
    this.client = data.client;
    this.myColor = data.color;
    this.ready = false;
    this.slotTexts = {};

    const cx = VIEW_WIDTH / 2;
    title(this, cx, 70, `${t('lobby.title')}`);
    this.add
      .text(cx, 130, data.code, {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: UI.accent,
        letterSpacing: 10,
      })
      .setOrigin(0.5);

    PLAYER_COLORS.forEach((color, i) => {
      const y = 230 + i * 70;
      this.add.rectangle(cx - 180, y, 28, 28, PLAYER_TINTS[color]);
      this.slotTexts[color] = this.add
        .text(cx - 130, y, '', { fontFamily: 'monospace', fontSize: '20px', color: UI.text })
        .setOrigin(0, 0.5);
    });

    this.noteText = this.add
      .text(cx, 400, t('lobby.hint'), { fontFamily: 'monospace', fontSize: '16px', color: UI.dim })
      .setOrigin(0.5);

    this.renderLobby(data.lobby);

    this.client.on('lobby', (lobby) => this.renderLobby(lobby));
    this.client.on('gameStart', (levelId) => {
      // Recreate handlers inside the session; hand the client over.
      this.client.off('lobby');
      this.client.off('peerLeft');
      this.client.off('disconnected');
      this.client.off('gameStart');
      const session = new OnlineSession(this.client, levelId);
      this.scene.start('Game', { mode: 'online', session });
    });
    this.client.on('peerLeft', () => {
      this.noteText.setText(`${t('lobby.peerLeft')}  ${t('lobby.hint')}`);
    });
    this.client.on('disconnected', () => this.scene.start('Online'));

    this.input.keyboard!.on('keydown-SPACE', () => {
      this.ready = !this.ready;
      this.client.send({ type: 'setReady', ready: this.ready });
    });

    makeButton(this, cx, VIEW_HEIGHT - 45, t('lobby.leave'), () => {
      this.client.send({ type: 'leaveRoom' });
      this.client.disconnect();
      this.scene.start('Menu');
    }, { fontSize: 18 });
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
      const you = color === this.myColor ? ` (${t('lobby.you')})` : '';
      const state = slot.ready ? t('lobby.ready') : t('lobby.notReady');
      text.setText(`${color.toUpperCase()}${you} — ${state}`);
      text.setColor(slot.ready ? '#8fd14f' : UI.text);
    }
  }
}
