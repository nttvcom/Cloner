import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HelpScene } from './scenes/HelpScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LobbyScene } from './scenes/LobbyScene';
import { MenuScene } from './scenes/MenuScene';
import { OnlineScene } from './scenes/OnlineScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  backgroundColor: '#111216',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, HelpScene, LevelSelectScene, OnlineScene, LobbyScene, GameScene],
});
