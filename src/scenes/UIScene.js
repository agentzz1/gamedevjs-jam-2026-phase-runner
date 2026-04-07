import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.health = 100;
    this.shiftCooldown = 0;
    this.shiftMaxCooldown = 3000;
    this.dimensionShifted = false;
    this.isPaused = false;
  }

  init(data) {
    this.score = data.score || 0;
    this.lives = data.lives || 3;
    this.level = data.level || 1;
    this.health = data.health || 100;
    this.shiftCooldown = data.shiftCooldown || 0;
    this.shiftMaxCooldown = data.shiftMaxCooldown || 3000;
  }

  create() {
    this.cameras.main.setPostPipeline();

    this.createScoreText();
    this.createLivesText();
    this.createLevelText();
    this.createHealthBar();
    this.createShiftIndicator();
    this.createPauseButton();

    this.events.on('showPause', () => this.showPauseMenu());
    this.events.on('hidePause', () => this.hidePauseMenu());

    this.input.keyboard.on('keydown-P', () => {
      if (!this.isPaused) this.showPauseMenu();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.isPaused) this.showPauseMenu();
    });
  }

  update() {
    this.updateShiftIndicator();
  }

  updateHUD(data) {
    if (data.score !== undefined) {
      this.score = data.score;
      if (this.scoreText) {
        this.scoreText.setText(`Score: ${this.score}`);
      }
    }

    if (data.lives !== undefined) {
      this.lives = data.lives;
      if (this.livesText) {
        this.livesText.setText(`Lives: ${'❤'.repeat(this.lives)}`);
      }
    }

    if (data.level !== undefined) {
      this.level = data.level;
      if (this.levelText) {
        this.levelText.setText(`Level ${this.level}`);
      }
    }

    if (data.health !== undefined) {
      this.health = data.health;
      if (this.healthBar) {
        this.healthBar.clear();
        this.healthBar.fillStyle(0x333333, 0.8);
        this.healthBar.fillRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);

        const healthWidth = (this.health / 100) * this.healthBarWidth;
        const healthColor = this.health > 60 ? 0x44ff44 : this.health > 30 ? 0xffaa00 : 0xff3333;
        this.healthBar.fillStyle(healthColor, 1);
        this.healthBar.fillRect(this.healthBarX, this.healthBarY, healthWidth, this.healthBarHeight);

        this.healthBar.lineStyle(2, 0xffffff, 0.5);
        this.healthBar.strokeRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);
      }
    }

    if (data.shiftCooldown !== undefined) {
      this.shiftCooldown = data.shiftCooldown;
    }

    if (data.dimensionShifted !== undefined) {
      this.dimensionShifted = data.dimensionShifted;
    }
  }

  createScoreText() {
    this.scoreText = this.add.text(20, 20, `Score: ${this.score}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);
  }

  createLivesText() {
    this.livesText = this.add.text(20, 50, `Lives: ${'❤'.repeat(this.lives)}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ff6666',
    }).setScrollFactor(0).setDepth(100);
  }

  createLevelText() {
    const width = this.cameras.main.width;
    this.levelText = this.add.text(width / 2, 20, `Level ${this.level}`, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  createHealthBar() {
    const width = this.cameras.main.width;
    this.healthBarWidth = 120;
    this.healthBarHeight = 16;
    this.healthBarX = width - 160;
    this.healthBarY = 20;

    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);

    const healthWidth = (this.health / 100) * this.healthBarWidth;
    this.healthBar.fillStyle(0x44ff44, 1);
    this.healthBar.fillRect(this.healthBarX, this.healthBarY, healthWidth, this.healthBarHeight);

    this.healthBar.lineStyle(2, 0xffffff, 0.5);
    this.healthBar.strokeRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);

    this.add.text(this.healthBarX + this.healthBarWidth / 2, this.healthBarY - 14, 'HP', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  createShiftIndicator() {
    const width = this.cameras.main.width;
    this.shiftX = width - 50;
    this.shiftY = 70;
    this.shiftRadius = 20;

    this.shiftIndicator = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.add.text(this.shiftX, this.shiftY + 30, 'SHIFT', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  updateShiftIndicator() {
    if (!this.shiftIndicator) return;

    this.shiftIndicator.clear();

    this.shiftIndicator.lineStyle(2, 0x666666, 0.5);
    this.shiftIndicator.strokeCircle(this.shiftX, this.shiftY, this.shiftRadius);

    const cooldownPercent = 1 - (this.shiftCooldown / this.shiftMaxCooldown);
    const endAngle = Phaser.Math.DegToRad(cooldownPercent * 360 - 90);

    if (this.shiftCooldown <= 0) {
      this.shiftIndicator.fillStyle(this.dimensionShifted ? 0xff44aa : 0x4488ff, 0.6);
      this.shiftIndicator.fillCircle(this.shiftX, this.shiftY, this.shiftRadius - 2);

      this.shiftIndicator.lineStyle(2, this.dimensionShifted ? 0xff44aa : 0x4488ff, 1);
      this.shiftIndicator.strokeCircle(this.shiftX, this.shiftY, this.shiftRadius);
    } else {
      this.shiftIndicator.fillStyle(0x444444, 0.3);
      this.shiftIndicator.fillCircle(this.shiftX, this.shiftY, this.shiftRadius - 2);

      this.shiftIndicator.lineStyle(3, 0xffaa00, 0.8);
      this.shiftIndicator.beginPath();
      this.shiftIndicator.moveTo(this.shiftX, this.shiftY);
      this.shiftIndicator.arc(this.shiftX, this.shiftY, this.shiftRadius - 2, Phaser.Math.DegToRad(-90), endAngle, false);
      this.shiftIndicator.closePath();
      this.shiftIndicator.fillPath();
    }
  }

  createPauseButton() {
    const width = this.cameras.main.width;
    const btnX = width - 30;
    const btnY = 20;

    this.pauseBtn = this.add.graphics().setScrollFactor(0).setDepth(100).setInteractive(new Phaser.Geom.Circle(btnX, btnY, 15), Phaser.Geom.Circle.Contains);
    this.pauseBtn.fillStyle(0x333333, 0.8);
    this.pauseBtn.fillCircle(btnX, btnY, 15);
    this.pauseBtn.fillStyle(0xffffff, 1);
    this.pauseBtn.fillRect(btnX - 5, btnY - 6, 3, 12);
    this.pauseBtn.fillRect(btnX + 2, btnY - 6, 3, 12);

    this.pauseBtn.on('pointerdown', () => {
      const gameScene = this.scene.get('GameScene');
      if (gameScene) {
        gameScene.togglePause();
      }
    });

    this.pauseBtn.on('pointerover', () => {
      this.pauseBtn.clear();
      this.pauseBtn.fillStyle(0x555555, 0.9);
      this.pauseBtn.fillCircle(btnX, btnY, 15);
      this.pauseBtn.fillStyle(0xffffff, 1);
      this.pauseBtn.fillRect(btnX - 5, btnY - 6, 3, 12);
      this.pauseBtn.fillRect(btnX + 2, btnY - 6, 3, 12);
    });

    this.pauseBtn.on('pointerout', () => {
      this.pauseBtn.clear();
      this.pauseBtn.fillStyle(0x333333, 0.8);
      this.pauseBtn.fillCircle(btnX, btnY, 15);
      this.pauseBtn.fillStyle(0xffffff, 1);
      this.pauseBtn.fillRect(btnX - 5, btnY - 6, 3, 12);
      this.pauseBtn.fillRect(btnX + 2, btnY - 6, 3, 12);
    });
  }

  showPauseMenu() {
    this.isPaused = true;

    this.pauseOverlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.pauseText = this.add.text(width / 2, height / 2 - 40, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.resumeText = this.add.text(width / 2, height / 2 + 30, 'Press P or ESC to Resume', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: this.resumeText,
      alpha: 0.4,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  hidePauseMenu() {
    this.isPaused = false;

    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    if (this.pauseText) {
      this.pauseText.destroy();
      this.pauseText = null;
    }
    if (this.resumeText) {
      this.resumeText.destroy();
      this.resumeText = null;
    }
  }
}
