import Phaser from 'phaser';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type, texture) {
    super(scene, x, y, texture);

    this.type = type;
    this.health = 1;
    this.speed = 50;
    this.patrolDistance = 150;
    this.startX = x;
    this.direction = 1;
    this.damage = 1;
    this.existsInDimension = 'both';
    this.isAlive = true;
    this.flashTimer = 0;
    this.patrolTimer = 0;
    this.moveTimer = 0;
    this.hopTimer = 0;
    this.sineOffset = Math.random() * Math.PI * 2;
  }

  create() {
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);

    this.setupPhysics(this.scene);
    this.setOrigin(0.5, 0.5);
    this.setDepth(5);

    this.createAnimations(this.scene);
  }

  setupPhysics(scene) {
    this.setCollideWorldBounds(true);
    this.body.setAllowGravity(this.type !== 'flying' && this.type !== 'phantom');
    this.body.setImmovable(false);
  }

  setPatrolBehavior(startX, distance) {
    this.startX = startX;
    this.patrolDistance = distance;
    this.direction = 1;
  }

  update(time, delta) {
    if (!this.isAlive) return;

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) {
        this.clearTint();
      }
    }

    switch (this.type) {
      case 'slime':
        this.updateSlime(time, delta);
        break;
      case 'phantom':
        this.updatePhantom(time, delta);
        break;
      case 'flying':
        this.updateFlying(time, delta);
        break;
    }

    this.updateFlip();
  }

  updateSlime(time, delta) {
    this.hopTimer += delta;

    if (this.hopTimer > 1000) {
      this.hopTimer = 0;
      if (this.body.touching.down) {
        this.setVelocityY(-200);
      }
    }

    this.setVelocityX(this.speed * this.direction);

    const currentDist = this.x - this.startX;
    if (currentDist > this.patrolDistance) {
      this.direction = -1;
    } else if (currentDist < -this.patrolDistance) {
      this.direction = 1;
    }
  }

  updatePhantom(time, delta) {
    this.moveTimer += delta;

    const driftSpeed = this.speed * 0.8;
    this.setVelocityX(driftSpeed * this.direction);
    this.setVelocityY(Math.sin(this.moveTimer * 0.002) * 30);

    const currentDist = this.x - this.startX;
    if (currentDist > this.patrolDistance * 1.5) {
      this.direction = -1;
    } else if (currentDist < -this.patrolDistance * 1.5) {
      this.direction = 1;
    }
  }

  updateFlying(time, delta) {
    this.moveTimer += delta;

    const flySpeed = this.speed * 1.2;
    this.setVelocityX(flySpeed * this.direction);

    const sineAmplitude = 60;
    const sineFrequency = 0.003;
    const targetY = this.startY + Math.sin(this.moveTimer * sineFrequency + this.sineOffset) * sineAmplitude;
    this.setVelocityY((targetY - this.y) * 0.05);

    const currentDist = this.x - this.startX;
    if (currentDist > this.patrolDistance * 2) {
      this.direction = -1;
    } else if (currentDist < -this.patrolDistance * 2) {
      this.direction = 1;
    }
  }

  updateFlip() {
    if (this.direction === -1) {
      this.setFlipX(true);
    } else {
      this.setFlipX(false);
    }
  }

  takeDamage(amount) {
    if (!this.isAlive) return;

    this.health -= amount;
    this.flashTimer = 150;
    this.setTint(0xffffff);

    this.scene.cameras.main.shake(100, 0.005);

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isAlive = false;
    this.scene.playSound?.('enemyDeath');

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
      },
    });

    const tint = this.type === 'slime' ? 0x44ff44 : this.type === 'phantom' ? 0xaa44ff : 0xffaa44;
    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: this.x,
      y: this.y,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: 600,
      gravityY: this.type === 'flying' ? -50 : 100,
      quantity: 15,
      emitting: false,
      tint: tint,
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
    });
    particles.explode();
    this.scene.time.delayedCall(600, () => particles.destroy());

    this.scene.events.emit('enemyDied', this);
  }

  createAnimations(scene) {
    const animKey = `enemy_${this.type}Idle`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [{ key: this.texture.key, frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }
    this.play(animKey);
  }

  destroy() {
    super.destroy();
  }
}
