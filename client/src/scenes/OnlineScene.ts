import Phaser from 'phaser';
import { ROOM_CODE_LENGTH, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { OnlineClient } from '../net/OnlineClient';
import { setupCamera } from '../scale';
import { fadeIn, goTo, makeButton, makeText, makeTitle } from '../ui';

/** Host / join chooser plus the room-code keyboard entry. */
export class OnlineScene extends Phaser.Scene {
  private client: OnlineClient | null = null;
  private statusText!: Phaser.GameObjects.Text;
  private codeText: Phaser.GameObjects.Text | null = null;
  private enteredCode = '';
  private joining = false;

  constructor() {
    super('Online');
  }

  create(): void {
    this.client = null;
    this.enteredCode = '';
    this.joining = false;
    this.codeText = null;
    setupCamera(this);
    fadeIn(this);

    const cx = VIEW_WIDTH / 2;
    makeTitle(this, cx, 60, t('online.title'));

    makeButton(this, cx, 165, t('online.host'), () => void this.host(), { primary: true });
    makeButton(this, cx, 232, t('online.join'), () => this.showCodeEntry());

    this.statusText = makeText(this, cx, 300, '', { size: 15, color: UI.accent }).setOrigin(0.5);

    makeButton(
      this,
      cx,
      VIEW_HEIGHT - 42,
      t('online.back'),
      () => {
        this.client?.disconnect();
        goTo(this, 'Menu');
      },
      { width: 170, height: 40, size: 15 },
    );
    this.input.keyboard!.on('keydown-ESC', () => {
      this.client?.disconnect();
      goTo(this, 'Menu');
    });
  }

  private async connect(): Promise<OnlineClient | null> {
    if (this.client?.isConnected) return this.client;
    this.statusText.setText(t('online.connecting'));
    const client = new OnlineClient();
    try {
      await client.connect();
    } catch {
      this.statusText.setText(t('online.error.connect'));
      return null;
    }
    this.statusText.setText('');
    this.client = client;
    return client;
  }

  private async host(): Promise<void> {
    const client = await this.connect();
    if (!client) return;
    this.wireLobbyHandoff(client);
    client.send({ type: 'createRoom' });
  }

  private showCodeEntry(): void {
    if (this.codeText) return;
    const cx = VIEW_WIDTH / 2;
    makeText(this, cx, 348, t('online.enterCode'), { size: 15, color: UI.dim }).setOrigin(0.5);
    this.codeText = makeText(this, cx, 390, '______', {
      size: 34,
      bold: true,
      letterSpacing: 10,
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.joining) return;
      if (/^[a-zA-Z0-9]$/.test(event.key) && this.enteredCode.length < ROOM_CODE_LENGTH) {
        this.enteredCode += event.key.toUpperCase();
      } else if (event.key === 'Backspace') {
        this.enteredCode = this.enteredCode.slice(0, -1);
      } else if (event.key === 'Enter' && this.enteredCode.length === ROOM_CODE_LENGTH) {
        void this.join();
        return;
      }
      this.codeText?.setText(this.enteredCode.padEnd(ROOM_CODE_LENGTH, '_'));
    });
  }

  private async join(): Promise<void> {
    const client = await this.connect();
    if (!client) return;
    this.joining = true;
    this.wireLobbyHandoff(client);
    client.send({ type: 'joinRoom', code: this.enteredCode });
  }

  private wireLobbyHandoff(client: OnlineClient): void {
    client.on('joined', (code, color, lobby, levelId) => {
      client.off('joined');
      client.off('roomError');
      this.scene.start('Lobby', { client, code, color, lobby, levelId });
    });
    client.on('roomError', (reason) => {
      this.joining = false;
      this.statusText.setText(t(`online.error.${reason}`));
    });
  }
}
