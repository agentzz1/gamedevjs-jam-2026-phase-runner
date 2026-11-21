import Phaser from 'phaser';
import { isTouchFirst, getSafeRect } from '../ui/TouchControls.js';
import { showInstallHint } from '../systems/platform.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.starting = false;
    this.touchUI = isTouchFirst(this.game) || !!this.registry.get('touchUI');

    this.createBackground();
    this.createTitle();
    this.createSubtitle();
    this.createStartText();
    // The bottom line sits above the home indicator (bottom safe area); the controls panel moves up only as far
    // as needed to clear it. On desktop (no insets) both keep their original positions.
    const bottomLine = showInstallHint ? this.createInstallHint() : this.createCredits();
    this.createControls(bottomLine.y - bottomLine.height / 2 - 6);
    this.createParticles();

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', (pointer) => {
      if (pointer.wasTouch) this.registry.set('touchUI', true);
      this.startGame();
    });
  }

  update(time) {
    if (this.titleText) {
      const glow = 10 + Math.sin(time * 0.003) * 5;
      this.titleText.setShadowBlur(glow);
    }

    if (this.startText) {
      const scale = 1 + Math.sin(time * 0.005) * 0.05;
      this.startText.setScale(scale);
      this.startText.setAlpha(0.6 + Math.sin(time * 0.005) * 0.4);
    }

    if (this.particles) {
      this.particles.forEach((p) => {
        p.y -= p.speed;
        p.alpha -= 0.003;
        if (p.y < -20 || p.alpha <= 0) {
          p.y = this.cameras.main.height + 20;
          p.x = Phaser.Math.Between(0, this.cameras.main.width);
          p.alpha = 1;
        }
      });
    }
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3a, 0x1a1a3a, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, this.cameras.main.width);
      const y = Phaser.Math.Between(0, this.cameras.main.height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.8);
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setData('twinkleSpeed', Phaser.Math.FloatBetween(0.001, 0.005));
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.3),
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createTitle() {
    const { width, height } = this.cameras.main;

    this.titleText = this.add.text(width / 2, height * 0.25, 'PHASE RUNNER', {
      fontFamily: 'monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#00ffff',
    }).setOrigin(0.5);

    this.titleText.setShadow(0, 0, '#00ffff', 10, true, true);

    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createSubtitle() {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height * 0.35, 'Gamedev.js Jam 2026', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#8888aa',
    }).setOrigin(0.5);
  }

  createStartText() {
    const { width, height } = this.cameras.main;

    this.startText = this.add.text(width / 2, height * 0.55, this.touchUI ? 'Tap to Start' : 'Press SPACE or Click to Start', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createControls(maxBottom) {
    const { width, height } = this.cameras.main;
    const panelH = 128;
    const top = Math.min(height * 0.65, maxBottom - panelH);

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.5);
    panel.fillRoundedRect(width / 2 - 270, top, 540, panelH, 10);
    panel.lineStyle(2, 0x444466, 0.8);
    panel.strokeRoundedRect(width / 2 - 270, top, 540, panelH, 10);

    const controls = this.touchUI ? [
      'Left thumb: arrow buttons - Move',
      'Right thumb: JUMP / SHIFT buttons',
      'Top-right pause button - Pause',
      'Collect gems, avoid enemies, reach the portal!',
    ] : [
      'Arrow Keys / WASD - Move & Jump',
      'Q - Dimension Shift',
      'P / Esc - Pause',
      'Collect gems, avoid enemies, reach the portal!',
    ];

    controls.forEach((text, i) => {
      this.add.text(width / 2, top + height * 0.025 + i * 26, text, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ccccdd',
      }).setOrigin(0.5);
    });
  }

  // Centre y = the default (height - offset), raised so the text box ends 2 px above the safe-area bottom.
  placeAboveSafeBottom(text, offset) {
    const safeBottom = getSafeRect(this.game).bottom;
    return text.setY(Math.min(this.cameras.main.height - offset, safeBottom - text.height / 2 - 2));
  }

  createCredits() {
    const { width } = this.cameras.main;

    const credits = this.add.text(width / 2, 0, 'Made with Phaser 3 & JavaScript', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#777799',
    }).setOrigin(0.5);
    return this.placeAboveSafeBottom(credits, 24);
  }

  // iOS Safari only (not when launched from the Home Screen): one passive line in place of the credits.
  createInstallHint() {
    const { width } = this.cameras.main;

    const tip = this.add.text(width / 2, 0, 'Tip: Share \u2192 Add to Home Screen for full screen', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#66ffcc',
      backgroundColor: 'rgba(0,0,0,0.45)',
      padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(10); // above the floating particles
    return this.placeAboveSafeBottom(tip, 28);
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, this.cameras.main.width),
        Phaser.Math.Between(0, this.cameras.main.height),
        Phaser.Math.FloatBetween(2, 5),
        Phaser.Math.RND.pick([0x00ffff, 0xff44aa, 0x4488ff, 0xffdd00]),
        Phaser.Math.FloatBetween(0.3, 0.8)
      );
      p.speed = Phaser.Math.FloatBetween(0.5, 2);
      this.particles.push(p);
    }
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });
  }
}
