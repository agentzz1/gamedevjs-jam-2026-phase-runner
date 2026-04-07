import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.health = 100;
    this.dimensionShifted = false;
    this.shiftCooldown = 0;
    this.shiftMaxCooldown = 3000;
    this.isPaused = false;
    this.playerSpawn = { x: 100, y: 300 };
    this.audioSystem = null;
  }

  init(data) {
    if (data.level) this.level = data.level;
    if (data.score !== undefined) this.score = data.score;
    if (data.lives !== undefined) this.lives = data.lives;
    if (data.health !== undefined) this.health = data.health;
  }

  create() {
    this.isPaused = false;
    this.dimensionShifted = false;
    this.shiftCooldown = 0;
    this.cameras.main.setBounds(0, 0, 3200, 600);
    this.physics.world.setBounds(0, 0, 3200, 600);

    this.audioSystem = new AudioSystem(this);
    this.audioSystem.playMusic();

    this.createBackground();
    this.createPlatforms();
    this.createPlayer();
    this.createEnemies();
    this.createCollectibles();
    this.createPortal();
    this.createSpikes();
    this.createMovingPlatforms();
    this.createDimensionPlatforms();

    this.setupCollisions();
    this.setupInput();

    this.scene.launch('UIScene', {
      score: this.score,
      lives: this.lives,
      level: this.level,
      health: this.health,
      shiftCooldown: this.shiftCooldown,
      shiftMaxCooldown: this.shiftMaxCooldown,
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(500);

    this.events.on('shutdown', () => {
      this.scene.stop('UIScene');
      this.audioSystem.stopMusic();
    });
  }

  update(time, delta) {
    if (this.isPaused) return;

    this.handlePlayerMovement();
    this.updateEnemies(delta);
    this.updateMovingPlatforms(time);
    this.updateShiftCooldown(delta);
    this.updatePortal(time);
    this.checkFallDeath();
    this.updateUIScene();
  }

  createBackground() {
    const bg = this.add.graphics();
    const isShifted = this.dimensionShifted;
    const bgColor1 = isShifted ? 0x1a0a2a : 0x0a0a1a;
    const bgColor2 = isShifted ? 0x2a1a3a : 0x1a1a3a;

    bg.fillGradientStyle(bgColor1, bgColor1, bgColor2, bgColor2, 1);
    bg.fillRect(0, 0, 3200, 600);

    this.stars = [];
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, 3200);
      const y = Phaser.Math.Between(0, 600);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.7);
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      star.setScrollFactor(0.3);
      this.stars.push(star);
    }

    this.mountains = [];
    for (let i = 0; i < 20; i++) {
      const x = i * 160 + Phaser.Math.Between(-20, 20);
      const h = Phaser.Math.Between(80, 200);
      const w = Phaser.Math.Between(120, 250);
      const mtnColor = isShifted ? 0x2a1a4a : 0x1a2a1a;
      const mountain = this.add.triangle(
        x, 600,
        0, 0,
        w, 0,
        w / 2, -h,
        mtnColor, 0.6
      );
      mountain.setScrollFactor(0.5);
      this.mountains.push(mountain);
    }
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    const platformData = [
      { x: 100, y: 500, w: 3, type: 'ground' },
      { x: 350, y: 450, w: 2, type: 'normal' },
      { x: 550, y: 400, w: 1, type: 'normal' },
      { x: 750, y: 480, w: 3, type: 'ground' },
      { x: 1000, y: 420, w: 2, type: 'normal' },
      { x: 1200, y: 350, w: 1, type: 'normal' },
      { x: 1400, y: 450, w: 2, type: 'normal' },
      { x: 1600, y: 500, w: 4, type: 'ground' },
      { x: 1900, y: 400, w: 2, type: 'normal' },
      { x: 2100, y: 350, w: 1, type: 'normal' },
      { x: 2300, y: 450, w: 3, type: 'ground' },
      { x: 2600, y: 400, w: 2, type: 'normal' },
      { x: 2800, y: 350, w: 1, type: 'normal' },
      { x: 3000, y: 450, w: 3, type: 'ground' },
    ];

    platformData.forEach((p) => {
      for (let i = 0; i < p.w; i++) {
        const tex = p.type === 'ground' ? 'ground' : 'platform';
        const plat = this.platforms.create(p.x + i * 128, p.y, tex);
        plat.setDisplaySize(128, p.type === 'ground' ? 48 : 32);
        plat.refreshBody();
        plat.setData('type', p.type);
        plat.setData('dimension', 'normal');
      }
    });
  }

  createDimensionPlatforms() {
    this.dimensionPlatforms = this.physics.add.staticGroup();

    const dimData = [
      { x: 450, y: 350, w: 2 },
      { x: 900, y: 380, w: 1 },
      { x: 1300, y: 300, w: 2 },
      { x: 1750, y: 350, w: 1 },
      { x: 2000, y: 300, w: 2 },
      { x: 2500, y: 350, w: 1 },
      { x: 2900, y: 300, w: 2 },
    ];

    dimData.forEach((p) => {
      for (let i = 0; i < p.w; i++) {
        const plat = this.dimensionPlatforms.create(p.x + i * 128, p.y, 'platformShifted');
        plat.setDisplaySize(128, 32);
        plat.refreshBody();
        plat.setData('dimension', 'shifted');
        plat.setVisible(false);
        plat.body.checkCollision.none = true;
      }
    });
  }

  createPlayer() {
    this.player = this.physics.add.sprite(this.playerSpawn.x, this.playerSpawn.y, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.1);
    this.player.setData('canJump', false);
    this.player.setData('facing', 1);
    this.player.setData('invincible', false);
    this.player.setData('invincibleTimer', 0);
  }

  createEnemies() {
    this.enemies = this.physics.add.group();

    const enemyData = [
      { x: 400, y: 420, type: 'slime', patrol: 100, dimension: 'normal' },
      { x: 800, y: 450, type: 'slime', patrol: 150, dimension: 'normal' },
      { x: 1100, y: 390, type: 'slime', patrol: 80, dimension: 'normal' },
      { x: 1500, y: 420, type: 'slime', patrol: 120, dimension: 'normal' },
      { x: 1950, y: 370, type: 'slime', patrol: 100, dimension: 'normal' },
      { x: 2400, y: 420, type: 'slime', patrol: 140, dimension: 'normal' },
      { x: 2700, y: 370, type: 'slime', patrol: 90, dimension: 'normal' },
      { x: 600, y: 320, type: 'phantom', patrol: 120, dimension: 'shifted' },
      { x: 1350, y: 270, type: 'phantom', patrol: 100, dimension: 'shifted' },
      { x: 2050, y: 270, type: 'phantom', patrol: 80, dimension: 'shifted' },
      { x: 2950, y: 270, type: 'phantom', patrol: 100, dimension: 'shifted' },
    ];

    enemyData.forEach((e) => {
      const tex = e.type === 'phantom' ? 'enemyPhantom' : 'enemy';
      const enemy = this.enemies.create(e.x, e.y, tex);
      enemy.setCollideWorldBounds(true);
      enemy.setData('type', e.type);
      enemy.setData('dimension', e.dimension);
      enemy.setData('startX', e.x);
      enemy.setData('patrol', e.patrol);
      enemy.setData('direction', 1);
      enemy.setData('speed', e.type === 'phantom' ? 80 : 50);
      enemy.setData('alive', true);

      if (e.dimension === 'shifted') {
        enemy.setVisible(false);
        enemy.body.checkCollision.none = true;
      }
    });
  }

  createCollectibles() {
    this.gems = this.physics.add.staticGroup();
    this.healthPickups = this.physics.add.staticGroup();

    const gemPositions = [
      300, 400, 500, 650, 850, 1050, 1150, 1350, 1500, 1700,
      1850, 2050, 2200, 2400, 2550, 2750, 2900, 3050,
    ];

    gemPositions.forEach((x, i) => {
      const y = 300 + Math.sin(i * 0.5) * 80;
      const gem = this.gems.create(x, y, 'gem');
      gem.setData('collected', false);
    });

    const healthPositions = [500, 1200, 1800, 2500];
    healthPositions.forEach((x) => {
      const health = this.healthPickups.create(x, 350, 'health');
      health.setData('collected', false);
    });
  }

  createPortal() {
    this.portal = this.physics.add.sprite(3100, 380, 'portal');
    this.portal.setImmovable(true);
    this.portal.body.allowGravity = false;
  }

  createSpikes() {
    this.spikes = this.physics.add.staticGroup();

    const spikePositions = [480, 700, 1150, 1550, 1850, 2250, 2750];
    spikePositions.forEach((x) => {
      const spike = this.spikes.create(x, 584, 'spike');
      spike.setData('dimension', 'normal');
    });

    const shiftedSpikePositions = [650, 1050, 1450, 2150, 2650];
    shiftedSpikePositions.forEach((x) => {
      const spike = this.spikes.create(x, 584, 'spike');
      spike.setData('dimension', 'shifted');
      spike.setVisible(false);
      spike.body.checkCollision.none = true;
    });
  }

  createMovingPlatforms() {
    this.movingPlatforms = this.physics.add.group();

    const movingData = [
      { x: 600, y: 380, axis: 'y', distance: 80, speed: 0.001 },
      { x: 1100, y: 300, axis: 'x', distance: 100, speed: 0.0008 },
      { x: 1700, y: 350, axis: 'y', distance: 100, speed: 0.0012 },
      { x: 2200, y: 300, axis: 'x', distance: 120, speed: 0.001 },
      { x: 2800, y: 280, axis: 'y', distance: 80, speed: 0.0015 },
    ];

    movingData.forEach((m) => {
      const plat = this.movingPlatforms.create(m.x, m.y, 'movingPlatform');
      plat.setDisplaySize(96, 24);
      plat.refreshBody();
      plat.setData('startX', m.x);
      plat.setData('startY', m.y);
      plat.setData('axis', m.axis);
      plat.setData('distance', m.distance);
      plat.setData('speed', m.speed);
      plat.setData('time', 0);
      plat.body.allowGravity = false;
      plat.setImmovable(true);
    });
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.movingPlatforms);

    this.physics.add.overlap(this.player, this.gems, this.collectGem, null, this);
    this.physics.add.overlap(this.player, this.healthPickups, this.collectHealth, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.spikes, this.hitSpike, null, this);
    this.physics.add.overlap(this.player, this.portal, this.reachPortal, null, this);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.shiftKey = this.input.keyboard.addKey('Q');
    this.pauseKey = this.input.keyboard.addKey('P');
    this.escapeKey = this.input.keyboard.addKey('ESC');

    this.shiftKey.on('down', () => {
      if (!this.isPaused) this.toggleDimension();
    });

    this.pauseKey.on('down', () => {
      this.togglePause();
    });

    this.escapeKey.on('down', () => {
      this.togglePause();
    });
  }

  handlePlayerMovement() {
    const speed = 200;
    const jumpForce = -400;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd.W.isDown || this.cursors.space.isDown;

    if (left) {
      this.player.setVelocityX(-speed);
      this.player.setData('facing', -1);
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(speed);
      this.player.setData('facing', 1);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

        if (jump && this.player.body.touching.down) {
          this.player.setVelocityY(jumpForce);
          this.player.setData('canJump', false);
          this.audioSystem.play('jump');
          this.createJumpParticles();
    }

    if (this.player.body.touching.down) {
      this.player.setData('canJump', true);
    }

    if (this.player.getData('invincible')) {
      const timer = this.player.getData('invincibleTimer') - 16;
      this.player.setData('invincibleTimer', timer);
      if (timer <= 0) {
        this.player.setData('invincible', false);
        this.player.setAlpha(1);
      } else {
        this.player.setAlpha(Math.sin(this.time.now * 0.02) > 0 ? 1 : 0.3);
      }
    }
  }

  updateEnemies(delta) {
    this.enemies.getChildren().forEach((enemy) => {
      if (!enemy.getData('alive')) return;

      const startX = enemy.getData('startX');
      const patrol = enemy.getData('patrol');
      const speed = enemy.getData('speed');
      const direction = enemy.getData('direction');

      enemy.setVelocityX(speed * direction);

      if (enemy.x > startX + patrol) {
        enemy.setData('direction', -1);
        enemy.setFlipX(true);
      } else if (enemy.x < startX - patrol) {
        enemy.setData('direction', 1);
        enemy.setFlipX(false);
      }
    });
  }

  updateMovingPlatforms(time) {
    this.movingPlatforms.getChildren().forEach((plat) => {
      const axis = plat.getData('axis');
      const distance = plat.getData('distance');
      const speed = plat.getData('speed');
      const startX = plat.getData('startX');
      const startY = plat.getData('startY');

      plat.setData('time', time);
      const offset = Math.sin(time * speed) * distance;

      if (axis === 'x') {
        plat.setPosition(startX + offset, startY);
      } else {
        plat.setPosition(startX, startY + offset);
      }
    });
  }

  updateShiftCooldown(delta) {
    if (this.shiftCooldown > 0) {
      this.shiftCooldown = Math.max(0, this.shiftCooldown - delta);
    }
  }

  updatePortal(time) {
    if (this.portal) {
      this.portal.setY(380 + Math.sin(time * 0.003) * 10);
      this.portal.setAlpha(0.8 + Math.sin(time * 0.005) * 0.2);
    }
  }

  checkFallDeath() {
    if (this.player.y > 650) {
      this.playerDeath();
    }
  }

  toggleDimension() {
    if (this.shiftCooldown > 0) return;

    this.dimensionShifted = !this.dimensionShifted;
    this.shiftCooldown = this.shiftMaxCooldown;

    this.audioSystem.play('shift');
    this.createShiftEffect();

    this.dimensionPlatforms.getChildren().forEach((plat) => {
      const visible = this.dimensionShifted;
      plat.setVisible(visible);
      plat.body.checkCollision.none = !visible;
    });

    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.getData('dimension') === 'shifted') {
        const visible = this.dimensionShifted;
        enemy.setVisible(visible);
        enemy.body.checkCollision.none = !visible;
      }
    });

    this.spikes.getChildren().forEach((spike) => {
      if (spike.getData('dimension') === 'shifted') {
        const visible = this.dimensionShifted;
        spike.setVisible(visible);
        spike.body.checkCollision.none = !visible;
      }
    });

    const bgColor1 = this.dimensionShifted ? 0x1a0a2a : 0x0a0a1a;
    const bgColor2 = this.dimensionShifted ? 0x2a1a3a : 0x1a1a3a;
    const bg = this.add.graphics();
    bg.fillGradientStyle(bgColor1, bgColor1, bgColor2, bgColor2, 1);
    bg.fillRect(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      this.cameras.main.width,
      this.cameras.main.height
    );
    bg.setScrollFactor(0);
    bg.setDepth(-100);

    this.time.delayedCall(100, () => bg.destroy());

    const tex = this.dimensionShifted ? 'playerShifted' : 'player';
    this.player.setTexture(tex);
  }

  createShiftEffect() {
    const particles = this.add.particles(0, 0, 'particle', {
      x: this.player.x,
      y: this.player.y,
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 600,
      gravityY: 0,
      quantity: 30,
      emitting: false,
    });

    particles.explode();
    this.time.delayedCall(600, () => particles.destroy());

    this.cameras.main.flash(200, this.dimensionShifted ? 170 : 0, this.dimensionShifted ? 68 : 0, this.dimensionShifted ? 255 : 255, true);
  }

  createJumpParticles() {
    const particles = this.add.particles(0, 0, 'particle', {
      x: this.player.x,
      y: this.player.y + 20,
      speed: { min: 20, max: 60 },
      angle: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0 },
      lifespan: 300,
      gravityY: 200,
      quantity: 8,
      emitting: false,
    });
    particles.explode();
    this.time.delayedCall(300, () => particles.destroy());
  }

  createDeathParticles() {
    const particles = this.add.particles(0, 0, 'particle', {
      x: this.player.x,
      y: this.player.y,
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 100,
      quantity: 25,
      emitting: false,
    });
    particles.explode();
    this.time.delayedCall(800, () => particles.destroy());
  }

  collectGem(player, gem) {
    if (gem.getData('collected')) return;
    gem.setData('collected', true);
    gem.setVisible(false);
    gem.body.checkCollision.none = true;

    this.score += 100;
    this.audioSystem.play('collect');

    const particles = this.add.particles(0, 0, 'particle', {
      x: gem.x,
      y: gem.y,
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      quantity: 10,
      emitting: false,
    });
    particles.explode();
    this.time.delayedCall(400, () => particles.destroy());
  }

  collectHealth(player, health) {
    if (health.getData('collected')) return;
    health.setData('collected', true);
    health.setVisible(false);
    health.body.checkCollision.none = true;

    this.health = Math.min(100, this.health + 30);
    this.audioSystem.play('collect');
  }

  hitEnemy(player, enemy) {
    if (!enemy.getData('alive')) return;
    if (player.getData('invincible')) return;

    if (player.body.touching.down && enemy.body.touching.up) {
      enemy.setData('alive', false);
      enemy.setVelocityY(-200);
      enemy.setTint(0xff0000);
      this.score += 200;

      this.time.delayedCall(300, () => {
        enemy.destroy();
      });

      player.setVelocityY(-300);
    this.audioSystem.play('collect');
    } else {
      this.playerHit();
    }
  }

  hitSpike(player, spike) {
    if (player.getData('invincible')) return;
    this.playerHit();
  }

  playerHit() {
    if (this.player.getData('invincible')) return;

    this.health -= 34;
    this.audioSystem.play('hurt');
    this.cameras.main.shake(200, 0.01);

    if (this.health <= 0) {
      this.playerDeath();
    } else {
      this.player.setData('invincible', true);
      this.player.setData('invincibleTimer', 1500);
    }
  }

  playerDeath() {
    this.lives--;
      this.audioSystem.play('death');
    this.createDeathParticles();
    this.cameras.main.shake(300, 0.02);

    if (this.lives <= 0) {
      this.time.delayedCall(1000, () => {
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', {
          score: this.score,
          won: false,
        });
      });
    } else {
      this.health = 100;
      this.time.delayedCall(500, () => {
        this.player.setPosition(this.playerSpawn.x, this.playerSpawn.y);
        this.player.setVelocity(0, 0);
        this.player.setData('invincible', true);
        this.player.setData('invincibleTimer', 2000);
      });
    }
  }

  reachPortal(player, portal) {
      this.audioSystem.play('win');
    this.score += 500;

    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score: this.score,
        won: true,
      });
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.scene.get('UIScene')?.events.emit('showPause');
    } else {
      this.physics.resume();
      this.scene.get('UIScene')?.events.emit('hidePause');
    }
  }

  updateUIScene() {
    const uiScene = this.scene.get('UIScene');
    if (uiScene && uiScene.updateHUD) {
      uiScene.updateHUD({
        score: this.score,
        lives: this.lives,
        level: this.level,
        health: this.health,
        shiftCooldown: this.shiftCooldown,
        shiftMaxCooldown: this.shiftMaxCooldown,
        dimensionShifted: this.dimensionShifted,
      });
    }
  }
}
