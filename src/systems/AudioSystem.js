export class AudioSystem {
  constructor(scene) {
    this.scene = scene;
    this.audioContext = scene.sys.game.loop.audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = new Map();
    this.musicSource = null;
    this.musicGain = this.audioContext.createGain();
    this.musicGain.connect(this.audioContext.destination);
    this.musicVolume = 0.3;
    this.musicGain.gain.value = this.musicVolume;
    this.sfxVolume = 0.3;
    this.reverbNode = null;
    this.delayNode = null;
    this._initEffects();
  }

  _initEffects() {
    const ctx = this.audioContext;
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = rate * 2;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    convolver.buffer = impulse;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.2;
    convolver.connect(reverbGain);
    reverbGain.connect(ctx.destination);
    this.reverbNode = convolver;
    this.reverbGain = reverbGain;

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.15;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.15;
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);
    this.delayNode = delay;
    this.delayGain = delayGain;
  }

  _createBuffer(duration) {
    return this.audioContext.createBuffer(2, Math.ceil(this.audioContext.sampleRate * duration), this.audioContext.sampleRate);
  }

  _fillBuffer(buffer, generator) {
    const sampleRate = this.audioContext.sampleRate;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        data[i] = generator(i / sampleRate, i, sampleRate, channel);
      }
    }
  }

  _addTone(buffer, frequency, startTime, duration, type = 'sine', volume = 1, detune = 0) {
    const sampleRate = this.audioContext.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    const phaseOffset = detune / 1200;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate;
        const env = Math.min(1, t * 50) * Math.max(0, 1 - (t / duration));
        let sample = 0;
        switch (type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * t + phaseOffset);
            break;
          case 'square':
            sample = Math.sin(2 * Math.PI * frequency * t + phaseOffset) > 0 ? 1 : -1;
            break;
          case 'sawtooth':
            sample = 2 * ((frequency * t + phaseOffset / (2 * Math.PI)) % 1) - 1;
            break;
          case 'triangle':
            sample = 2 * Math.abs(2 * ((frequency * t + phaseOffset / (2 * Math.PI)) % 1) - 1) - 1;
            break;
        }
        data[i] += sample * volume * env * 0.3;
      }
    }
  }

  _addNoise(buffer, startTime, duration, volume = 1, decay = true) {
    const sampleRate = this.audioContext.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate;
        const env = decay ? Math.max(0, 1 - (t / duration)) : 1;
        data[i] += (Math.random() * 2 - 1) * volume * env * 0.3;
      }
    }
  }

  _addSweep(buffer, startFreq, endFreq, startTime, duration, type = 'sine', volume = 1) {
    const sampleRate = this.audioContext.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate;
        const freq = startFreq + (endFreq - startFreq) * (t / duration);
        const env = Math.min(1, t * 50) * Math.max(0, 1 - (t / duration));
        let sample = 0;
        switch (type) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * freq * t);
            break;
          case 'square':
            sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
            break;
          case 'sawtooth':
            sample = 2 * ((freq * t) % 1) - 1;
            break;
          case 'triangle':
            sample = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
            break;
        }
        data[i] += sample * volume * env * 0.3;
      }
    }
  }

  _addPercussion(buffer, startTime, duration, volume = 1, pitch = 150) {
    const sampleRate = this.audioContext.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate;
        const freq = pitch * Math.exp(-t * 30);
        const env = Math.exp(-t * 40);
        const sample = Math.sin(2 * Math.PI * freq * t) * env;
        data[i] += sample * volume * 0.3;
      }
    }
  }

  _addHiHat(buffer, startTime, duration, volume = 0.5) {
    const sampleRate = this.audioContext.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor((startTime + duration) * sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate;
        const env = Math.exp(-t * 60);
        const sample = (Math.random() * 2 - 1) * env;
        data[i] += sample * volume * 0.2;
      }
    }
  }

  generateJumpSound() {
    const buffer = this._createBuffer(0.2);
    this._addSweep(buffer, 200, 600, 0, 0.2, 'square', 0.8);
    this._addTone(buffer, 600, 0.15, 0.05, 'sine', 0.3);
    this.buffers.set('jump', buffer);
    return buffer;
  }

  generateLandSound() {
    const buffer = this._createBuffer(0.15);
    this._addPercussion(buffer, 0, 0.15, 0.6, 80);
    this._addNoise(buffer, 0, 0.05, 0.3);
    this.buffers.set('land', buffer);
    return buffer;
  }

  generateCollectSound() {
    const buffer = this._createBuffer(0.4);
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      this._addTone(buffer, freq, i * 0.08, 0.15, 'sine', 0.6);
      this._addTone(buffer, freq * 2, i * 0.08, 0.1, 'triangle', 0.2);
    });
    this.buffers.set('collect', buffer);
    return buffer;
  }

  generateDamageSound() {
    const buffer = this._createBuffer(0.3);
    this._addSweep(buffer, 400, 100, 0, 0.3, 'sawtooth', 0.7);
    this._addNoise(buffer, 0, 0.1, 0.4);
    this.buffers.set('damage', buffer);
    return buffer;
  }

  generateDeathSound() {
    const buffer = this._createBuffer(0.8);
    this._addSweep(buffer, 500, 50, 0, 0.8, 'sawtooth', 0.6);
    this._addSweep(buffer, 300, 30, 0.2, 0.6, 'square', 0.4);
    this._addNoise(buffer, 0, 0.5, 0.5);
    this._addNoise(buffer, 0.3, 0.5, 0.3);
    this.buffers.set('death', buffer);
    return buffer;
  }

  generateShiftSound() {
    const buffer = this._createBuffer(0.6);
    this._addSweep(buffer, 100, 800, 0, 0.3, 'sine', 0.5);
    this._addSweep(buffer, 800, 100, 0.3, 0.3, 'sine', 0.5);
    this._addNoise(buffer, 0, 0.6, 0.2);
    this._addTone(buffer, 400, 0.2, 0.2, 'triangle', 0.3);
    this.buffers.set('shift', buffer);
    return buffer;
  }

  generateEnemyDeathSound() {
    const buffer = this._createBuffer(0.5);
    this._addTone(buffer, 300, 0, 0.1, 'square', 0.7);
    this._addTone(buffer, 400, 0.1, 0.1, 'square', 0.6);
    this._addTone(buffer, 500, 0.2, 0.1, 'square', 0.5);
    this._addNoise(buffer, 0.2, 0.3, 0.4);
    this._addPercussion(buffer, 0.3, 0.2, 0.5, 100);
    this.buffers.set('enemyDeath', buffer);
    return buffer;
  }

  generatePowerupSound() {
    const buffer = this._createBuffer(0.6);
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      this._addTone(buffer, freq, i * 0.08, 0.2, 'sine', 0.5);
      this._addTone(buffer, freq * 1.5, i * 0.08, 0.15, 'triangle', 0.2);
    });
    this._addTone(buffer, 1046.50, 0.48, 0.12, 'sine', 0.6);
    this.buffers.set('powerup', buffer);
    return buffer;
  }

  generateLevelCompleteSound() {
    const buffer = this._createBuffer(1.2);
    const melody = [
      { freq: 523.25, start: 0, dur: 0.15 },
      { freq: 659.25, start: 0.15, dur: 0.15 },
      { freq: 783.99, start: 0.3, dur: 0.15 },
      { freq: 1046.50, start: 0.45, dur: 0.3 },
      { freq: 783.99, start: 0.8, dur: 0.1 },
      { freq: 1046.50, start: 0.9, dur: 0.3 },
    ];
    melody.forEach(note => {
      this._addTone(buffer, note.freq, note.start, note.dur, 'square', 0.5);
      this._addTone(buffer, note.freq * 0.5, note.start, note.dur, 'triangle', 0.3);
      this._addTone(buffer, note.freq * 1.5, note.start, note.dur * 0.5, 'sine', 0.15);
    });
    this._addPercussion(buffer, 0, 0.1, 0.4, 120);
    this._addPercussion(buffer, 0.45, 0.1, 0.4, 120);
    this._addPercussion(buffer, 0.9, 0.1, 0.4, 120);
    this.buffers.set('levelComplete', buffer);
    return buffer;
  }

  generateBackgroundMusic() {
    const bpm = 140;
    const beatDuration = 60 / bpm;
    const barDuration = beatDuration * 4;
    const numBars = 8;
    const totalDuration = barDuration * numBars;
    const buffer = this._createBuffer(totalDuration);
    const sampleRate = this.audioContext.sampleRate;

    const bassNotes = [130.81, 130.81, 164.81, 164.81, 174.61, 174.61, 196.00, 196.00];
    const melodyNotes = [
      [261.63, 329.63, 392.00, 329.63],
      [329.63, 392.00, 523.25, 392.00],
      [349.23, 440.00, 523.25, 440.00],
      [392.00, 493.88, 587.33, 493.88],
      [349.23, 440.00, 523.25, 440.00],
      [329.63, 392.00, 523.25, 392.00],
      [261.63, 329.63, 392.00, 329.63],
      [196.00, 261.63, 329.63, 261.63],
    ];

    for (let bar = 0; bar < numBars; bar++) {
      const barStart = bar * barDuration;

      this._addTone(buffer, bassNotes[bar], barStart, barDuration * 0.8, 'square', 0.35);
      this._addTone(buffer, bassNotes[bar] * 1.5, barStart, barDuration * 0.4, 'triangle', 0.15);

      const melody = melodyNotes[bar];
      for (let beat = 0; beat < 4; beat++) {
        const noteStart = barStart + beat * beatDuration;
        const freq = melody[beat];
        this._addTone(buffer, freq, noteStart, beatDuration * 0.7, 'square', 0.25);
        this._addTone(buffer, freq * 2, noteStart, beatDuration * 0.3, 'sine', 0.08);
      }

      for (let beat = 0; beat < 4; beat++) {
        const noteStart = barStart + beat * beatDuration;
        this._addPercussion(buffer, noteStart, beatDuration * 0.3, 0.3, 100);
        this._addHiHat(buffer, noteStart + beatDuration * 0.5, beatDuration * 0.15, 0.2);
      }

      this._addPercussion(buffer, barStart, 0.15, 0.4, 60);
    }

    this.buffers.set('backgroundMusic', buffer);
    return buffer;
  }

  _playBuffer(buffer, volume = 1) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume * this.sfxVolume;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.connect(this.delayNode);
    source.start(0);
    return source;
  }

  play(soundName, volume = 0.3) {
    if (!this.buffers.has(soundName)) {
      const generators = {
        jump: () => this.generateJumpSound(),
        land: () => this.generateLandSound(),
        collect: () => this.generateCollectSound(),
        damage: () => this.generateDamageSound(),
        death: () => this.generateDeathSound(),
        shift: () => this.generateShiftSound(),
        enemyDeath: () => this.generateEnemyDeathSound(),
        powerup: () => this.generatePowerupSound(),
        levelComplete: () => this.generateLevelCompleteSound(),
        backgroundMusic: () => this.generateBackgroundMusic(),
      };
      if (generators[soundName]) {
        generators[soundName]();
      } else {
        return null;
      }
    }
    const buffer = this.buffers.get(soundName);
    return this._playBuffer(buffer, volume);
  }

  playMusic() {
    if (!this.buffers.has('backgroundMusic')) {
      this.generateBackgroundMusic();
    }
    this.stopMusic();
    const buffer = this.buffers.get('backgroundMusic');
    this.musicSource = this.audioContext.createBufferSource();
    this.musicSource.buffer = buffer;
    this.musicSource.loop = true;
    this.musicSource.connect(this.musicGain);
    this.musicGain.gain.value = this.musicVolume;
    this.musicSource.start(0);
  }

  stopMusic() {
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource.disconnect();
      this.musicSource = null;
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  destroy() {
    this.stopMusic();
    this.buffers.clear();
    if (this.musicGain) {
      this.musicGain.disconnect();
    }
    if (this.reverbNode) {
      this.reverbNode.disconnect();
    }
    if (this.delayNode) {
      this.delayNode.disconnect();
    }
  }
}
