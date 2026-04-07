import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2 + 45, '0%', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff88, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    this.generateTextures();
    this.generateAudio();
  }

  create() {
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  generateTextures() {
    const generateTexture = (key, width, height, drawFn) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      drawFn(ctx, width, height);
      this.textures.addCanvas(key, canvas);
    };

    generateTexture('player', 64, 64, (ctx) => {
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.roundRect(20, 16, 24, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#66aaff';
      ctx.beginPath();
      ctx.arc(32, 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(36, 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(37, 12, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3366cc';
      ctx.fillRect(22, 44, 8, 14);
      ctx.fillRect(34, 44, 8, 14);
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#66aaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(20, 16, 24, 28, 6);
      ctx.stroke();
    });

    generateTexture('playerShifted', 64, 64, (ctx) => {
      ctx.fillStyle = '#ff44aa';
      ctx.beginPath();
      ctx.roundRect(20, 16, 24, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#ff66cc';
      ctx.beginPath();
      ctx.arc(32, 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(36, 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(37, 12, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cc3388';
      ctx.fillRect(22, 44, 8, 14);
      ctx.fillRect(34, 44, 8, 14);
      ctx.shadowColor = '#ff44aa';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#ff66cc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(20, 16, 24, 28, 6);
      ctx.stroke();
    });

    generateTexture('platform', 128, 32, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#556655');
      grad.addColorStop(1, '#334433');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#668866';
      ctx.fillRect(0, 0, w, 6);
      ctx.strokeStyle = '#445544';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 6);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
    });

    generateTexture('platformShifted', 128, 32, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#8844aa');
      grad.addColorStop(1, '#552277');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#aa66cc';
      ctx.fillRect(0, 0, w, 6);
      ctx.strokeStyle = '#7733aa';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 6);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      ctx.fillStyle = '#cc88ff';
      for (let i = 8; i < w; i += 32) {
        ctx.beginPath();
        ctx.arc(i, h / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    generateTexture('ground', 128, 48, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#445544');
      grad.addColorStop(0.3, '#334433');
      grad.addColorStop(1, '#223322');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#556655';
      ctx.fillRect(0, 0, w, 8);
      ctx.fillStyle = '#66aa55';
      for (let i = 4; i < w; i += 12) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 3, -6);
        ctx.lineTo(i + 6, 0);
        ctx.fill();
      }
    });

    generateTexture('enemy', 48, 48, (ctx) => {
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.ellipse(24, 30, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6666';
      ctx.beginPath();
      ctx.ellipse(24, 26, 16, 10, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(18, 24, 5, 0, Math.PI * 2);
      ctx.arc(30, 24, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(19, 24, 2.5, 0, Math.PI * 2);
      ctx.arc(31, 24, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(13, 18);
      ctx.lineTo(22, 20);
      ctx.moveTo(35, 18);
      ctx.lineTo(26, 20);
      ctx.stroke();
    });

    generateTexture('enemyPhantom', 48, 48, (ctx) => {
      ctx.fillStyle = '#aa44ff';
      ctx.beginPath();
      ctx.moveTo(24, 4);
      ctx.lineTo(44, 44);
      ctx.lineTo(36, 38);
      ctx.lineTo(30, 44);
      ctx.lineTo(24, 38);
      ctx.lineTo(18, 44);
      ctx.lineTo(12, 38);
      ctx.lineTo(4, 44);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cc66ff';
      ctx.beginPath();
      ctx.arc(24, 18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(20, 16, 4, 0, Math.PI * 2);
      ctx.arc(28, 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(20, 16, 2, 0, Math.PI * 2);
      ctx.arc(28, 16, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    generateTexture('gem', 32, 32, (ctx) => {
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(28, 12);
      ctx.lineTo(24, 28);
      ctx.lineTo(8, 28);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffee66';
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(22, 12);
      ctx.lineTo(16, 20);
      ctx.lineTo(10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(28, 12);
      ctx.lineTo(24, 28);
      ctx.lineTo(8, 28);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.stroke();
    });

    generateTexture('health', 32, 32, (ctx) => {
      ctx.fillStyle = '#ff3355';
      ctx.beginPath();
      ctx.arc(16, 16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 14, 12, 4);
      ctx.fillRect(14, 10, 4, 12);
    });

    generateTexture('portal', 64, 80, (ctx) => {
      const grad = ctx.createRadialGradient(32, 40, 4, 32, 40, 32);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#00ffff');
      grad.addColorStop(0.7, '#0088ff');
      grad.addColorStop(1, '#0044aa');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(32, 40, 24, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(32, 40, 24, 36, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    generateTexture('particle', 16, 16, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    generateTexture('star', 8, 8, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    generateTexture('spike', 32, 24, (ctx, w, h) => {
      ctx.fillStyle = '#888888';
      for (let i = 0; i < w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, h);
        ctx.lineTo(i + 4, 4);
        ctx.lineTo(i + 8, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#aaaaaa';
      for (let i = 0; i < w; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i + 1, h);
        ctx.lineTo(i + 4, 8);
        ctx.lineTo(i + 5, h);
        ctx.closePath();
        ctx.fill();
      }
    });

    generateTexture('movingPlatform', 96, 24, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#6688aa');
      grad.addColorStop(1, '#445577');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#88aacc';
      ctx.fillRect(0, 0, w, 4);
      ctx.fillStyle = '#aaccff';
      ctx.beginPath();
      ctx.moveTo(20, h / 2);
      ctx.lineTo(30, 8);
      ctx.lineTo(30, 16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(76, h / 2);
      ctx.lineTo(66, 8);
      ctx.lineTo(66, 16);
      ctx.closePath();
      ctx.fill();
    });
  }

  generateAudio() {
    // Create AudioSystem instance
    this.audioSystem = new AudioSystem(this);
    
    // Generate all sounds
    this.audioSystem.generateJumpSound();
    this.audioSystem.generateLandSound();
    this.audioSystem.generateCollectSound();
    this.audioSystem.generateDamageSound();
    this.audioSystem.generateDeathSound();
    this.audioSystem.generateShiftSound();
    this.audioSystem.generateEnemyDeathSound();
    this.audioSystem.generatePowerupSound();
    this.audioSystem.generateLevelCompleteSound();
    this.audioSystem.generateBackgroundMusic();
  }
}