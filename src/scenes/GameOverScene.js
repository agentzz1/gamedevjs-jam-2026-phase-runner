import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
    this.score = 0;
    this.won = false;
    this.highScore = 0;
  }

  init(data) {
    this.score = data.score || 0;
    this.won = data.won || false;
  }

  create() {
    this.highScore = parseInt(localStorage.getItem('phaseRunnerHighScore') || '0', 10);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('phaseRunnerHighScore', this.highScore.toString());
    }

    this.createBackground();
    this.createTitle();
    this.createScoreDisplay();
    this.createHighScoreDisplay();
    this.createButtons();
    this.createParticles();
  }

  update(time) {
    if (this.particles) {
      this.particles.forEach((p) => {
        p.y -= p.speed;
        p.alpha -= 0.002;
        p.rotation += 0.02;
        if (p.y < -20 || p.alpha <= 0) {
          p.y = this.cameras.main.height + 20;
          p.x = Phaser.Math.Between(0, this.cameras.main.width);
          p.alpha = 1;
        }
      });
    }

    if (this.titleText) {
      const scale = 1 + Math.sin(time * 0.003) * 0.03;
      this.titleText.setScale(scale);
    }
  }

  createBackground() {
    const bg = this.add.graphics();
    const bgColor = this.won ? 0x0a1a0a : 0x1a0a0a;
    const bgColor2 = this.won ? 0x1a2a1a : 0x2a1a1a;
    bg.fillGradientStyle(bgColor, bgColor, bgColor2, bgColor2, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, this.cameras.main.width);
      const y = Phaser.Math.Between(0, this.cameras.main.height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.6);
      const color = this.won ? 0x44ff44 : 0xff4444;
      const star = this.add.circle(x, y, size, color, alpha);
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(1000, 2500),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createTitle() {
    const { width, height } = this.cameras.main;
    const title = this.won ? 'YOU WIN!' : 'GAME OVER';
    const color = this.won ? '#44ff44' : '#ff4444';

    this.titleText = this.add.text(width / 2, height * 0.25, title, {
      fontFamily: 'monospace',
      fontSize: '56px',
      fontStyle: 'bold',
      color: color,
    }).setOrigin(0.5);

    this.titleText.setGlow(15);

    this.tweens.add({
      targets: this.titleText,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createScoreDisplay() {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height * 0.4, `Final Score: ${this.score}`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  createHighScoreDisplay() {
    const { width, height } = this.cameras.main;
    const isNewHighScore = this.score >= this.highScore && this.score > 0;

    const highScoreText = isNewHighScore ? 'NEW HIGH SCORE!' : `High Score: ${this.highScore}`;
    const highScoreColor = isNewHighScore ? '#ffdd00' : '#aaaaaa';

    this.add.text(width / 2, height * 0.48, highScoreText, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: highScoreColor,
      fontStyle: isNewHighScore ? 'bold' : 'normal',
    }).setOrigin(0.5);

    if (isNewHighScore) {
      this.tweens.add({
        targets: this.children.list[this.children.list.length - 1],
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createButtons() {
    const { width, height } = this.cameras.main;

    this.createButton(width / 2, height * 0.62, 'Play Again', () => this.restartGame());
    this.createButton(width / 2, height * 0.72, 'Main Menu', () => this.goToMenu());
  }

  createButton(x, y, text, callback) {
    const btnWidth = 220;
    const btnHeight = 45;

    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.8);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
    bg.lineStyle(2, 0x444466, 0.8);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);

    const txt = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const hitArea = new Phaser.Geom.Rectangle(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight);

    const interactiveBg = this.add.graphics().setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    interactiveBg.setFillStyle(0x000000, 0);

    interactiveBg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x333344, 0.9);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0x00ffff, 1);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      txt.setColor('#00ffff');
      this.input.setDefaultCursor('pointer');
    });

    interactiveBg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x222222, 0.8);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      bg.lineStyle(2, 0x444466, 0.8);
      bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      txt.setColor('#ffffff');
      this.input.setDefaultCursor('default');
    });

    interactiveBg.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(0x444466, 1);
      bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 8);
      callback();
    });
  }

  createParticles() {
    this.particles = [];
    const colors = this.won ? [0x44ff44, 0x88ff88, 0xffdd00] : [0xff4444, 0xff8888, 0xffaa00];

    for (let i = 0; i < 25; i++) {
      const p = this.add.triangle(
        Phaser.Math.Between(0, this.cameras.main.width),
        Phaser.Math.Between(0, this.cameras.main.height),
        0, 0,
        10, -10,
        10, 10,
        Phaser.Math.RND.pick(colors),
        Phaser.Math.FloatBetween(0.2, 0.6)
      );
      p.speed = Phaser.Math.FloatBetween(0.3, 1.5);
      this.particles.push(p);
    }
  }

  restartGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.start('GameScene', {
        score: 0,
        lives: 3,
        level: 1,
        health: 100,
      });
    });
  }

  goToMenu() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.start('MenuScene');
    });
  }
}
