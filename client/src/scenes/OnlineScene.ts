import Phaser from 'phaser';
import { ROOM_CODE_LENGTH, VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { UI } from '../colors';
import { t } from '../i18n';
import { OnlineClient } from '../net/OnlineClient';
import { makeButton, title } from '../ui';

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

    const cx = VIEW_WIDTH / 2;
    title(this, cx, 70, t('online.title'));

    makeButton(this, cx, 200, t('online.host'), () => void this.host());
    makeButton(this, cx, 270, t('online.join'), () => this.showCodeEntry());

    this.statusText = this.add
      .text(cx, 350, '', { fontFamily: 'monospace', fontSize: '16px', color: UI.accent })
      .setOrigin(0.5);

    makeButton(this, cx, VIEW_HEIGHT - 45, t('online.back'), () => {
      this.client?.disconnect();
      this.scene.start('Menu');
    }, { fontSize: 18 });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.client?.disconnect();
      this.scene.start('Menu');
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
    this.add
      .text(cx, 400, t('online.enterCode'), { fontFamily: 'monospace', fontSize: '16px', color: UI.dim })
      .setOrigin(0.5);
    this.codeText = this.add
      .text(cx, 440, '______', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: UI.text,
        letterSpacing: 8,
      })
      .setOrigin(0.5);

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
    client.on('joined', (code, color, lobby) => {
      client.off('joined');
      client.off('roomError');
      this.scene.start('Lobby', { client, code, color, lobby });
    });
    client.on('roomError', (reason) => {
      this.joining = false;
      this.statusText.setText(t(`online.error.${reason}`));
    });
  }
}
