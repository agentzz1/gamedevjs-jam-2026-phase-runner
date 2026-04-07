export class EffectSystem {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.particles = {};
    this._starfield = null;
    this._floatingParticles = null;
    this._parallaxLayers = [];
    this._trailEmitters = [];
  }

  createDustEmitter(x, y, count = 10) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 30 },
      y: { value: y, variance: 10 },
      speed: { min: 20, max: 60 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 400,
      gravityY: 100,
      tint: [0xaaaaaa, 0x888888, 0x999999],
      quantity: count,
      emitting: false,
      blendMode: 'NORMAL',
    });
    emitter.explode();
    this.scene.time.delayedCall(400, () => emitter.destroy());
    return emitter;
  }

  createTrailEmitter(followSprite, color) {
    const emitter = this.scene.add.particles(0, 0, 'particle', {
      speed: 10,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 300,
      gravityY: 0,
      tint: color,
      frequency: 50,
      blendMode: 'ADD',
      follow: followSprite,
    });
    this._trailEmitters.push(emitter);
    return emitter;
  }

  createExplosionEmitter(x, y, count = 20, color = 0xff6600) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 5 },
      y: { value: y, variance: 5 },
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      gravityY: 150,
      tint: [color, 0xffffff, 0xffaa00, 0xffcc44],
      quantity: count,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.explode();
    this.scene.time.delayedCall(500, () => emitter.destroy());
    return emitter;
  }

  createSparkleEmitter(x, y, count = 15) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 15 },
      y: { value: y, variance: 15 },
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      gravityY: -50,
      tint: [0xffff00, 0xffee88, 0xffffff, 0xffdd44],
      quantity: count,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.explode();
    this.scene.time.delayedCall(500, () => emitter.destroy());
    return emitter;
  }

  createDeathEmitter(x, y) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 10 },
      y: { value: y, variance: 10 },
      speed: { min: 50, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 100,
      tint: [0xff0000, 0xff4444, 0x880000, 0xff2222],
      quantity: 30,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.explode();
    this.scene.time.delayedCall(800, () => emitter.destroy());

    const ring = this.scene.add.circle(x, y, 5, 0xff0000, 0.8);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 20,
      scaleY: 20,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    return emitter;
  }

  createShiftEmitter(x, y) {
    const emitter1 = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 5 },
      y: { value: y, variance: 5 },
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      gravityY: 0,
      tint: [0xaa44ff, 0x6600cc, 0xff44ff, 0x8800ff],
      quantity: 30,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter1.explode();

    const emitter2 = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 20 },
      y: { value: y, variance: 20 },
      speed: { min: 30, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0.3 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      gravityY: 0,
      rotate: { min: 0, max: 360 },
      tint: [0x4400aa, 0x8844ff],
      quantity: 15,
      emitting: false,
      blendMode: 'ADD',
      frequency: 30,
    });
    emitter2.explode();

    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(x, y, 10 + i * 15, 0xaa44ff, 0.6 - i * 0.15);
      this.scene.tweens.add({
        targets: ring,
        scaleX: 15 + i * 5,
        scaleY: 15 + i * 5,
        alpha: 0,
        duration: 600 + i * 100,
        ease: 'Power2',
        delay: i * 80,
        onComplete: () => ring.destroy(),
      });
    }

    this.scene.time.delayedCall(800, () => {
      emitter1.destroy();
      emitter2.destroy();
    });

    return { emitter1, emitter2 };
  }

  createLandingEmitter(x, y) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 20 },
      y: { value: y, variance: 5 },
      speed: { min: 15, max: 40 },
      angle: { min: 220, max: 320 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 300,
      gravityY: 150,
      tint: [0xbbbbbb, 0x999999],
      quantity: 8,
      emitting: false,
      blendMode: 'NORMAL',
    });
    emitter.explode();
    this.scene.time.delayedCall(300, () => emitter.destroy());
    return emitter;
  }

  createRunningEmitter(followSprite) {
    const emitter = this.scene.add.particles(0, 0, 'particle', {
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.4, end: 0 },
      lifespan: 250,
      gravityY: 50,
      tint: [0xaaaaaa, 0x888888],
      frequency: 80,
      blendMode: 'NORMAL',
      follow: followSprite,
      followOffset: { x: 0, y: 16 },
    });
    this._trailEmitters.push(emitter);
    return emitter;
  }

  screenShake(intensity = 0.01, duration = 200) {
    this.camera.shake(duration, intensity);
  }

  screenFlash(color = 0xffffff, duration = 100) {
    const rgb = this._hexToRgb(color);
    this.camera.flash(duration, rgb.r, rgb.g, rgb.b, true);
  }

  screenFadeOut(color = 0x000000, duration = 500) {
    const rgb = this._hexToRgb(color);
    this.camera.fadeOut(duration, rgb.r, rgb.g, rgb.b);
  }

  screenFadeIn(color = 0x000000, duration = 500) {
    const rgb = this._hexToRgb(color);
    this.camera.fadeIn(duration, rgb.r, rgb.g, rgb.b);
  }

  triggerDimensionShiftEffect(player) {
    const px = player ? player.x : this.camera.midPoint.x;
    const py = player ? player.y : this.camera.midPoint.y;

    this.screenFlash(this.scene.dimensionShifted ? 0xaa44ff : 0x44aaff, 200);

    this.screenShake(0.008, 300);

    this._createRadialWave(px, py);

    this._createColorPaletteTransition();

    this._createParticleBurst(px, py);
  }

  _createRadialWave(x, y) {
    for (let i = 0; i < 4; i++) {
      const ring = this.scene.add.circle(x, y, 10 + i * 10, 0xaa44ff, 0.7 - i * 0.12);
      ring.setDepth(1000);
      ring.setScrollFactor(0);
      const cameraPoint = this.camera.worldToCamera(x, y);
      ring.setPosition(cameraPoint.x, cameraPoint.y);

      this.scene.tweens.add({
        targets: ring,
        scaleX: 40 + i * 10,
        scaleY: 40 + i * 10,
        alpha: 0,
        duration: 700 + i * 100,
        ease: 'Power2',
        delay: i * 60,
        onComplete: () => ring.destroy(),
      });
    }
  }

  _createColorPaletteTransition() {
    const overlay = this.scene.add.graphics();
    overlay.setDepth(999);
    overlay.setScrollFactor(0);

    const shiftColor = this.scene.dimensionShifted ? 0xaa44ff : 0x44aaff;
    const rgb = this._hexToRgb(shiftColor);

    overlay.fillStyle(shiftColor, 0.3);
    overlay.fillRect(0, 0, this.camera.width, this.camera.height);

    this.scene.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => overlay.destroy(),
    });
  }

  _createParticleBurst(x, y) {
    const emitter = this.scene.add.particles(x, y, 'particle', {
      x: { value: x, variance: 10 },
      y: { value: y, variance: 10 },
      speed: { min: 100, max: 350 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      gravityY: 0,
      tint: [0xaa44ff, 0x44aaff, 0xff44ff, 0x44ffaa, 0xffffff],
      quantity: 50,
      emitting: false,
      blendMode: 'ADD',
    });
    emitter.explode();
    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  createStarfieldBackground(count = 100) {
    this._starfield = this.scene.add.group();

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, this.camera.width * 3);
      const y = Phaser.Math.Between(0, this.camera.height);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
      const scrollFactor = Phaser.Math.FloatBetween(0.1, 0.4);

      const star = this.scene.add.circle(x, y, size, 0xffffff, alpha);
      star.setScrollFactor(scrollFactor);
      star.setDepth(-10);

      const twinkleSpeed = Phaser.Math.FloatBetween(1000, 3000);
      this.scene.tweens.add({
        targets: star,
        alpha: { from: alpha * 0.3, to: alpha },
        duration: twinkleSpeed,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this._starfield.add(star);
    }

    return this._starfield;
  }

  createFloatingParticles(count = 50) {
    this._floatingParticles = this.scene.add.group();

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, this.camera.width * 3);
      const y = Phaser.Math.Between(0, this.camera.height);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.4);
      const scrollFactor = Phaser.Math.FloatBetween(0.2, 0.6);
      const driftX = Phaser.Math.FloatBetween(-0.3, 0.3);
      const driftY = Phaser.Math.FloatBetween(-0.5, -0.1);

      const particle = this.scene.add.circle(x, y, size, 0x8888cc, alpha);
      particle.setScrollFactor(scrollFactor);
      particle.setDepth(-5);

      this.scene.tweens.add({
        targets: particle,
        x: x + driftX * 200,
        y: y + driftY * 200,
        alpha: { from: alpha, to: alpha * 0.2 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this._floatingParticles.add(particle);
    }

    return this._floatingParticles;
  }

  createParallaxLayers(count = 3) {
    this._parallaxLayers = [];

    const layerConfigs = [
      { depth: -30, scrollFactor: 0.1, color: 0x111122, elementCount: 8, size: 200 },
      { depth: -20, scrollFactor: 0.25, color: 0x1a1a33, elementCount: 12, size: 120 },
      { depth: -10, scrollFactor: 0.4, color: 0x222244, elementCount: 15, size: 60 },
    ];

    for (let i = 0; i < Math.min(count, layerConfigs.length); i++) {
      const config = layerConfigs[i];
      const layer = this.scene.add.group();

      for (let j = 0; j < config.elementCount; j++) {
        const x = Phaser.Math.Between(0, this.camera.width * 3);
        const y = Phaser.Math.Between(100, this.camera.height);

        const shape = this.scene.add.rectangle(x, y, config.size, config.size * 0.6, config.color, 0.5);
        shape.setScrollFactor(config.scrollFactor);
        shape.setDepth(config.depth);

        layer.add(shape);
      }

      this._parallaxLayers.push(layer);
    }

    return this._parallaxLayers;
  }

  _hexToRgb(hex) {
    return {
      r: (hex >> 16) & 0xff,
      g: (hex >> 8) & 0xff,
      b: hex & 0xff,
    };
  }

  destroy() {
    Object.values(this.particles).forEach((emitter) => {
      if (emitter && emitter.destroy) emitter.destroy();
    });
    this.particles = {};

    this._trailEmitters.forEach((emitter) => {
      if (emitter && emitter.destroy) emitter.destroy();
    });
    this._trailEmitters = [];

    if (this._starfield) {
      this._starfield.getChildren().forEach((star) => star.destroy());
      this._starfield = null;
    }

    if (this._floatingParticles) {
      this._floatingParticles.getChildren().forEach((p) => p.destroy());
      this._floatingParticles = null;
    }

    this._parallaxLayers.forEach((layer) => {
      if (layer) {
        layer.getChildren().forEach((element) => element.destroy());
      }
    });
    this._parallaxLayers = [];
  }
}
