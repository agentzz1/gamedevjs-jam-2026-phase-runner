import Phaser from 'phaser';
import TouchControls, { getSafeRect } from '../ui/TouchControls.js';

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

    // GameScene owns the pause state and emits showPause/hidePause (P / Esc are handled there).
    // Scene.events survives a scene stop, so these listeners are removed on shutdown or they stack up.
    this.isPaused = false;
    this.pauseOverlay = null;
    const onShow = () => this.showPauseMenu();
    const onHide = () => this.hidePauseMenu();
    this.events.on('showPause', onShow);
    this.events.on('hidePause', onHide);
    this.events.once('shutdown', () => {
      this.events.off('showPause', onShow);
      this.events.off('hidePause', onHide);
      this.scale.off('resize', this.layoutPauseButton, this);
      this.hidePauseMenu();
    });

    this.touchControls = new TouchControls(this, {
      onShift: () => {
        const gs = this.scene.get('GameScene');
        if (gs && !gs.isPaused) gs.toggleDimension();
      },
    });
  }

  update() {
    this.updateShiftIndicator();
    if (this.touchControls) {
      this.touchControls.cooldown = this.shiftMaxCooldown ? this.shiftCooldown / this.shiftMaxCooldown : 0;
      this.touchControls.update();
    }
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
        this.livesText.setText(`Lives: ${'❤'.repeat(Math.max(0, this.lives))}`);
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
    this.scoreText = this.add.text(24, 20, `Score: ${this.score}`, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setScrollFactor(0).setDepth(100);
  }

  createLivesText() {
    this.livesText = this.add.text(24, 54, `Lives: ${'❤'.repeat(Math.max(0, this.lives))}`, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ff6666',
    }).setScrollFactor(0).setDepth(100);
  }

  createLevelText() {
    const width = this.cameras.main.width;
    this.levelText = this.add.text(width / 2, 20, `Level ${this.level}`, {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  createHealthBar() {
    const width = this.cameras.main.width;
    this.healthBarWidth = 140;
    this.healthBarHeight = 18;
    this.healthBarX = width - 236; // right edge W-96 stays clear of the pause hit circle (starts at W-84)
    this.healthBarY = 26;

    this.healthBar = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.healthBar.fillStyle(0x333333, 0.8);
    this.healthBar.fillRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);

    const healthWidth = (this.health / 100) * this.healthBarWidth;
    this.healthBar.fillStyle(0x44ff44, 1);
    this.healthBar.fillRect(this.healthBarX, this.healthBarY, healthWidth, this.healthBarHeight);

    this.healthBar.lineStyle(2, 0xffffff, 0.5);
    this.healthBar.strokeRect(this.healthBarX, this.healthBarY, this.healthBarWidth, this.healthBarHeight);

    this.add.text(this.healthBarX - 8, this.healthBarY + 9, 'HP', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);
  }

  createShiftIndicator() {
    const width = this.cameras.main.width;
    this.shiftX = width - 44;
    this.shiftY = 118;
    this.shiftRadius = 22;

    this.shiftIndicator = this.add.graphics().setScrollFactor(0).setDepth(100);

    this.shiftLabel = this.add.text(this.shiftX, this.shiftY + 28, 'SHIFT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  updateShiftIndicator() {
    if (!this.shiftIndicator) return;

    // On touch the SHIFT button shows the cooldown sweep itself, so the HUD ring is desktop only.
    const touchUI = !!this.registry.get('touchUI');
    this.shiftIndicator.setVisible(!touchUI);
    this.shiftLabel.setVisible(!touchUI);
    if (touchUI) return;

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
    const r = 22;
    const draw = (hover) => {
      this.pauseBtn.clear();
      this.pauseBtn.fillStyle(hover ? 0x555555 : 0x333333, hover ? 0.9 : 0.8);
      this.pauseBtn.fillCircle(0, 0, r);
      this.pauseBtn.lineStyle(2, 0xffffff, 0.6);
      this.pauseBtn.strokeCircle(0, 0, r);
      this.pauseBtn.fillStyle(0xffffff, 1);
      this.pauseBtn.fillRect(-7, -9, 5, 18);
      this.pauseBtn.fillRect(2, -9, 5, 18);
    };

    // Drawn at local (0,0) and positioned from the safe rect; the 40 px hit circle is about 51 CSS px wide on an iPhone.
    this.pauseBtn = this.add.graphics().setScrollFactor(0).setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, 40), Phaser.Geom.Circle.Contains);
    draw(false);
    this.layoutPauseButton();
    this.scale.on('resize', this.layoutPauseButton, this);

    this.pauseBtn.on('pointerdown', () => {
      this.scene.get('GameScene')?.setPaused(true);
    });
    this.pauseBtn.on('pointerover', () => draw(true));
    this.pauseBtn.on('pointerout', () => draw(false));
  }

  layoutPauseButton() {
    const s = getSafeRect(this.game);
    this.pauseBtn.setPosition(s.right - 44, s.top + 44);
  }

  showPauseMenu() {
    if (this.pauseOverlay) return; // idempotent
    this.isPaused = true;
    this.touchControls?.setEnabled(false);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.pauseOverlay = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, width, height);
    // Whole-screen resume target. Resume on pointerup (touchend is a valid WebKit audio-unlock gesture and the
    // finger is already lifted), and only after a pointerdown on the overlay itself, so the tap that opened
    // the pause menu cannot resume it.
    this.pauseOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    let armed = false;
    this.pauseOverlay.on('pointerdown', () => { armed = true; });
    this.pauseOverlay.on('pointerup', () => {
      if (armed) this.scene.get('GameScene')?.setPaused(false);
    });

    this.pauseText = this.add.text(width / 2, height / 2 - 40, 'PAUSED', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    const resumeHint = this.registry.get('touchUI') ? 'Tap anywhere to resume' : 'Click or press P / Esc to resume';
    this.resumeText = this.add.text(width / 2, height / 2 + 30, resumeHint, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.resumeTween = this.tweens.add({
      targets: this.resumeText,
      alpha: 0.4,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  hidePauseMenu() {
    this.isPaused = false;
    this.touchControls?.setEnabled(true);
    this.resumeTween?.remove();
    this.resumeTween = null;

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
