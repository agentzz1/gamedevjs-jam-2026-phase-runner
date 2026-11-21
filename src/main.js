import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// The height is fixed at 540. The width is picked once at boot from the #game box aspect, so a wide phone
// screen is filled instead of letterboxed (desktop 16:9 stays 960x540). Every scene lays out from
// cameras.main.width. If the viewport aspect changes after boot (Safari toolbar shown, desktop window resized),
// Scale.FIT letterboxes instead of re-laying out: e.g. a 1038-wide game in an 844x342 view gets ~93 px side bars.
// Input mapping stays exact; a reload picks a new width.
const BASE_H = 540, MIN_W = 960, MAX_W = 1200;
const parentEl = document.getElementById('game');
const coarseMQ = matchMedia('(pointer: coarse)');
const portraitMQ = matchMedia('(orientation: portrait)');

function pickWidth() {
  const r = parentEl.getBoundingClientRect();
  if (!r.width || !r.height || r.width <= r.height) return MIN_W;
  return Math.max(MIN_W, Math.min(MAX_W, Math.round(BASE_H * r.width / r.height / 2) * 2));
}

// Browser gesture guards: iOS Safari ignores user-scalable=no, so block pinch zoom, double-tap zoom,
// scrolling / rubber-banding and the long-press menu here.
// NEVER preventDefault touchstart or touchend at document or window level: Phaser's window-level touchend
// handler skips defaultPrevented events, so a finger released outside the canvas would stay held.
const block = (e) => { if (e.cancelable) e.preventDefault(); };
const np = { passive: false };
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, block, np));
document.addEventListener('touchmove', block, np);
document.addEventListener('dblclick', block, np);
document.addEventListener('contextmenu', block);

window.gameState = {
  score: 0,
  lives: 3,
  level: 1,
  // localStorage can throw (Safari private mode, sandboxed iframes): never let it stop the boot.
  highScore: (() => { try { return parseInt(localStorage.getItem('highScore')) || 0; } catch (e) { return 0; } })(),
  dimension: 'normal',
  isPaused: false,
};

let game = null;

function boot() {
  if (game) return;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: pickWidth(),
    height: BASE_H,
    parent: 'game', // never 'body' or window: Phaser's iOS window path measures with a 100vh ruler
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
    input: {
      activePointers: 3, // the default is 1: d-pad + JUMP + SHIFT need three fingers
    },
    pixelArt: false,
    roundPixels: true,
    scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene],
  });
}

// Rotating a phone to portrait mid-run pauses the game (the #rotate overlay covers it). Nothing auto-resumes.
portraitMQ.addEventListener('change', (e) => {
  if (!e.matches || !coarseMQ.matches || !game) return;
  if (game.scene.isActive('GameScene')) game.scene.getScene('GameScene').autoPause();
});

// A phone opened in portrait boots on the first landscape layout, so the width matches the real aspect.
// The check polls because iOS updates element rects 1-2 frames after the orientation change event.
if (coarseMQ.matches && portraitMQ.matches) {
  const wait = () => {
    const r = parentEl.getBoundingClientRect();
    if (r.width > r.height) boot();
    else requestAnimationFrame(wait);
  };
  portraitMQ.addEventListener('change', (e) => { if (!e.matches) requestAnimationFrame(wait); });
} else boot();
