import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: false,
  roundPixels: true,
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
};

window.gameState = {
  score: 0,
  lives: 3,
  level: 1,
  highScore: parseInt(localStorage.getItem('highScore')) || 0,
  dimension: 'normal',
  isPaused: false,
};

const game = new Phaser.Game(config);

export default game;
