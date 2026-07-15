import Phaser from 'phaser';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@cloner/shared';
import { RENDER_SCALE } from './scale';
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
  // Backbuffer is RENDER_SCALE times the logical 960x540; scenes zoom their
  // cameras to match, so gameplay code keeps thinking in 960x540.
  width: VIEW_WIDTH * RENDER_SCALE,
  height: VIEW_HEIGHT * RENDER_SCALE,
  backgroundColor: '#101116',
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, HelpScene, LevelSelectScene, OnlineScene, LobbyScene, GameScene],
});
