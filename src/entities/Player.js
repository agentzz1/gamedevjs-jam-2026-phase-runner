import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    this.speed = 200;
    this.jumpVelocity = -450;
    this.maxHealth = 5;
    this.health = 5;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.coyoteTime = 100;
    this.jumpBufferTime = 100;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isOnGround = false;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;

    this.facing = 1;
    this.dimension = 'normal';
    this.isAlive = true;
    this.lastJumpPressed = false;
    this.wasOnGround = false;
  }

  create() {
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.05);
    this.setDepth(10);
    this.setOrigin(0.5, 0.5);

    this.body.setGravityY(1200);
    this.body.setMaxVelocity(this.speed * 1.5, 600);

    this.createAnimations(this.scene);
    this.setupTrailEmitter();
    this.play('playerIdle');
  }

  setupTrailEmitter() {
    this.trailEmitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 30 },
      angle: { min: 170, max: 190 },
      scale: { start: 0.4, end: 0 },
      lifespan: 250,
      gravityY: 100,
      frequency: 80,
      emitting: false,
      tint: this.dimension === 'normal' ? 0x4488ff : 0xff44aa,
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
    });
    this.trailEmitter.setDepth(9);
  }

  createAnimations(scene) {
    if (!scene.anims.exists('playerIdle')) {
      scene.anims.create({
        key: 'playerIdle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('playerRun')) {
      scene.anims.create({
        key: 'playerRun',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('playerJump')) {
      scene.anims.create({
        key: 'playerJump',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!scene.anims.exists('playerFall')) {
      scene.anims.create({
        key: 'playerFall',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }
  }

  update(cursors, shiftKey, time) {
    if (!this.isAlive) return;

    this.updateTimers(time);
    this.checkGroundState();
    this.handleInput(cursors, shiftKey, time);
    this.updateAnimation();
    this.updateTrail();
    this.updateInvulnerability(time);
  }

  updateTimers(time) {
    if (this.coyoteTimer > 0) {
      this.coyoteTimer -= this.scene.game.loop.delta;
      if (this.coyoteTimer < 0) this.coyoteTimer = 0;
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= this.scene.game.loop.delta;
      if (this.jumpBufferTimer < 0) this.jumpBufferTimer = 0;
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= this.scene.game.loop.delta;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.setAlpha(1);
        this.body.checkCollision.none = false;
      }
    }
  }

  checkGroundState() {
    const wasOnGround = this.isOnGround;
    this.isOnGround = this.body.touching.down;

    if (this.isOnGround) {
      this.coyoteTimer = this.coyoteTime;
      this.canDoubleJump = true;
      this.hasDoubleJumped = false;

      if (!wasOnGround) {
        this.onLand();
      }
    }

    if (!this.isOnGround && wasOnGround) {
      this.coyoteTimer = this.coyoteTime;
    }
  }

  handleInput(cursors, shiftKey, time) {
    const left = cursors.left.isDown || cursors.A?.isDown;
    const right = cursors.right.isDown || cursors.D?.isDown;
    const jumpPressed = cursors.space.isDown || cursors.up.isDown || cursors.W?.isDown;

    this.handleMovement(left, right);
    this.handleJump(jumpPressed, time);
    this.handleDimensionShift(shiftKey);
  }

  handleMovement(left, right) {
    const acceleration = 1200;
    const deceleration = 800;
    const maxVel = this.speed;

    if (left) {
      this.setAccelerationX(-acceleration);
      if (this.body.velocity.x > -maxVel) {
        this.setVelocityX(Math.max(this.body.velocity.x - deceleration * 0.016, -maxVel));
      }
      this.facing = -1;
      this.setFlipX(true);
    } else if (right) {
      this.setAccelerationX(acceleration);
      if (this.body.velocity.x < maxVel) {
        this.setVelocityX(Math.min(this.body.velocity.x + deceleration * 0.016, maxVel));
      }
      this.facing = 1;
      this.setFlipX(false);
    } else {
      this.setAccelerationX(0);
      const friction = 0.85;
      this.setVelocityX(this.body.velocity.x * friction);

      if (Math.abs(this.body.velocity.x) < 5) {
        this.setVelocityX(0);
      }
    }
  }

  handleJump(jumpPressed, time) {
    if (jumpPressed && !this.lastJumpPressed) {
      this.jumpBufferTimer = this.jumpBufferTime;
    }
    this.lastJumpPressed = jumpPressed;

    if (this.jumpBufferTimer > 0) {
      if (this.coyoteTimer > 0) {
        this.jump();
        this.jumpBufferTimer = 0;
        this.coyoteTimer = 0;
      } else if (this.canDoubleJump && !this.hasDoubleJumped) {
        this.doubleJump();
        this.jumpBufferTimer = 0;
      }
    }

    if (!jumpPressed && this.body.velocity.y < this.jumpVelocity * 0.4) {
      this.setVelocityY(this.body.velocity.y * 0.5);
    }
  }

  jump() {
    this.setVelocityY(this.jumpVelocity);
    this.playSound('jump');
    this.createJumpParticles();
    this.squashAndStretch(1.3, 0.7);
  }

  doubleJump() {
    this.setVelocityY(this.jumpVelocity * 0.9);
    this.hasDoubleJumped = true;
    this.canDoubleJump = false;
    this.playSound('jump');
    this.createDoubleJumpParticles();
    this.squashAndStretch(1.4, 0.6);
  }

  onLand() {
    this.squashAndStretch(0.7, 1.3);
    this.createLandParticles();
    this.playSound('land');
  }

  squashAndStretch(scaleX, scaleY) {
    const targetScaleX = scaleX;
    const targetScaleY = scaleY;
    const originalScaleX = this.facing;
    const originalScaleY = 1;

    this.scene.tweens.add({
      targets: this,
      scaleX: { from: originalScaleX, to: targetScaleX * Math.sign(originalScaleX || 1) },
      scaleY: { from: originalScaleY, to: targetScaleY },
      duration: 80,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.setScale(Math.sign(this.facing || 1), 1);
      },
    });
  }

  updateAnimation() {
    if (!this.isOnGround && this.body.velocity.y < 0) {
      if (this.anims.currentAnim?.key !== 'playerJump') {
        this.play('playerJump', true);
      }
    } else if (!this.isOnGround && this.body.velocity.y > 0) {
      if (this.anims.currentAnim?.key !== 'playerFall') {
        this.play('playerFall', true);
      }
    } else if (Math.abs(this.body.velocity.x) > 10) {
      if (this.anims.currentAnim?.key !== 'playerRun') {
        this.play('playerRun', true);
      }
    } else {
      if (this.anims.currentAnim?.key !== 'playerIdle') {
        this.play('playerIdle', true);
      }
    }
  }

  updateTrail() {
    if (this.isOnGround && Math.abs(this.body.velocity.x) > 30) {
      if (!this.trailEmitter.emitting) {
        this.trailEmitter.startFollow(this);
        this.trailEmitter.emitParticle(1);
        this.trailEmitter.emitting = true;
      }
      this.trailEmitter.setTint(this.dimension === 'normal' ? 0x4488ff : 0xff44aa);
    } else {
      if (this.trailEmitter.emitting) {
        this.trailEmitter.emitting = false;
      }
    }
  }

  updateInvulnerability(time) {
    if (this.isInvulnerable) {
      this.blink();
    }
  }

  blink() {
    const visible = Math.sin(this.scene.time.now * 0.015) > 0;
    this.setVisible(visible);
  }

  handleDimensionShift(shiftKey) {
    if (shiftKey && Phaser.Input.Keyboard.JustDown(shiftKey)) {
      this.scene.toggleDimension?.();
    }
  }

  createJumpParticles() {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y + 16,
      speed: { min: 20, max: 60 },
      angle: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0 },
      lifespan: 300,
      gravityY: 200,
      quantity: 8,
      emitting: false,
      tint: this.dimension === 'normal' ? 0x4488ff : 0xff44aa,
      alpha: { start: 0.8, end: 0 },
    });
    particles.explode();
    this.scene.time.delayedCall(300, () => particles.destroy());
  }

  createDoubleJumpParticles() {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: 400,
      gravityY: 0,
      quantity: 20,
      emitting: false,
      tint: this.dimension === 'normal' ? 0x66aaff : 0xff88cc,
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
    });
    particles.explode();
    this.scene.time.delayedCall(400, () => particles.destroy());
  }

  createLandParticles() {
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y + 16,
      speed: { min: 15, max: 40 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0 },
      lifespan: 250,
      gravityY: 150,
      quantity: 6,
      emitting: false,
      tint: 0x888888,
      alpha: { start: 0.6, end: 0 },
    });
    particles.explode();
    this.scene.time.delayedCall(250, () => particles.destroy());
  }

  takeDamage(amount) {
    if (this.isInvulnerable || !this.isAlive) return;

    this.health = Math.max(0, this.health - amount);
    this.scene.playSound?.('hurt');
    this.scene.cameras.main.shake(200, 0.01);

    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => this.clearTint());

    if (this.health <= 0) {
      this.die();
    } else {
      this.setInvulnerable(1500);
    }

    this.scene.events.emit('playerHealthChanged', this.health);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.scene.playSound?.('collect');
    this.scene.events.emit('playerHealthChanged', this.health);

    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y,
      speed: { min: 20, max: 50 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      lifespan: 400,
      quantity: 10,
      emitting: false,
      tint: 0x00ff88,
      alpha: { start: 1, end: 0 },
    });
    particles.explode();
    this.scene.time.delayedCall(400, () => particles.destroy());
  }

  setInvulnerable(duration) {
    this.isInvulnerable = true;
    this.invulnerabilityTimer = duration;
    this.body.checkCollision.none = false;
  }

  die() {
    this.isAlive = false;
    this.scene.playSound?.('death');
    this.scene.cameras.main.shake(300, 0.02);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 500,
      ease: 'Back.easeIn',
    });

    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y,
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 100,
      quantity: 25,
      emitting: false,
      tint: this.dimension === 'normal' ? 0x4488ff : 0xff44aa,
    });
    particles.explode();
    this.scene.time.delayedCall(800, () => particles.destroy());

    if (this.trailEmitter) {
      this.trailEmitter.destroy();
    }

    this.scene.time.delayedCall(1000, () => {
      this.scene.events.emit('playerDied');
    });
  }

  respawn(x, y) {
    this.isAlive = true;
    this.health = this.maxHealth;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isOnGround = false;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;

    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();
    this.setVisible(true);
    this.body.checkCollision.none = false;

    this.setInvulnerable(2000);
    this.play('playerIdle');

    this.setupTrailEmitter();

    this.scene.events.emit('playerHealthChanged', this.health);
  }

  playSound(key) {
    this.scene.playSound?.(key);
  }

  destroy() {
    if (this.trailEmitter) {
      this.trailEmitter.destroy();
    }
    super.destroy();
  }
}
