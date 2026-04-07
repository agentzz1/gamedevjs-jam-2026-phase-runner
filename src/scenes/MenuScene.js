import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.createBackground();
    this.createTitle();
    this.createSubtitle();
    this.createStartText();
    this.createControls();
    this.createCredits();
    this.createParticles();

    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  update(time) {
    if (this.titleText) {
      const glow = 10 + Math.sin(time * 0.003) * 5;
      this.titleText.setGlow(glow);
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

    this.titleText.setGlow(10);

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
      fontSize: '20px',
      color: '#8888aa',
    }).setOrigin(0.5);
  }

  createStartText() {
    const { width, height } = this.cameras.main;

    this.startText = this.add.text(width / 2, height * 0.55, 'Press SPACE or Tap to Start', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createControls() {
    const { width, height } = this.cameras.main;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.5);
    panel.fillRoundedRect(width / 2 - 180, height * 0.65, 360, 120, 10);
    panel.lineStyle(2, 0x444466, 0.8);
    panel.strokeRoundedRect(width / 2 - 180, height * 0.65, 360, 120, 10);

    const controls = [
      'Arrow Keys / WASD - Move & Jump',
      'Q / Shift Button - Dimension Shift',
      'P / Esc - Pause',
      'Collect gems, avoid enemies, reach the portal!',
    ];

    controls.forEach((text, i) => {
      this.add.text(width / 2, height * 0.68 + i * 24, text, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ccccdd',
      }).setOrigin(0.5);
    });
  }

  createCredits() {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height - 30, 'Made with Phaser 3 & JavaScript', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#555577',
    }).setOrigin(0.5);
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
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });
  }
}
