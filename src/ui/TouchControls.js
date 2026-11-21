import Phaser from 'phaser';

// All sizes are GAME px (base game 960x540). Worst-case CSS-px-per-game-px is 0.633
// (Scale.FIT in Safari landscape 750x342), so 76 game px = 48 CSS px.
const LAYOUT = {
  margin: 24,      // gap between the safe edge and the outer edge of a button
  dpadR: 46,       // visual radius of each arrow button  (92 game px)
  dpadGap: 116,    // centre-to-centre distance of the two arrow buttons
  dead: 10,        // horizontal dead zone around the d-pad centre
  jumpR: 58,       // visual radius of JUMP (116 game px)
  shiftR: 46,      // visual radius of SHIFT (92 game px)
  shiftHitR: 66,   // SHIFT hit radius (132 game px)
  shiftDX: 150,    // SHIFT centre = JUMP centre - (150, 34)
  shiftDY: 34,
  hudBand: 100,    // touches in the top 100 px of the safe rect never drive gameplay (HUD + pause)
  moveZone: 0.42,  // left 42% of the safe width captures movement
  actionZone: 0.5, // right 50% of the safe width is jump/shift
};

const IDLE_ALPHA = 0.32;
const DOWN_ALPHA = 0.75;

let probe = null;
// Reads env(safe-area-inset-*) in CSS px through a probe element (robust in WebKit and Blink).
export function readSafeAreaInsets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-area-probe';
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

// The part of the game that is visible on screen AND outside the safe-area insets, in game px.
// Works for FIT (letterbox), ENVELOP (cropped) and EXPAND/RESIZE.
export function getSafeRect(game, out = new Phaser.Geom.Rectangle()) {
  const r = game.canvas.getBoundingClientRect();
  if (!r.width || !r.height) return out.setTo(0, 0, game.scale.width, game.scale.height);
  const sx = game.scale.width / r.width;
  const sy = game.scale.height / r.height;
  const inset = readSafeAreaInsets();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(r.left, 0, inset.left);
  const right = Math.min(r.right, vw, vw - inset.right);
  const top = Math.max(r.top, 0, inset.top);
  const bottom = Math.min(r.bottom, vh, vh - inset.bottom);
  return out.setTo((left - r.left) * sx, (top - r.top) * sy, (right - left) * sx, (bottom - top) * sy);
}

export function isTouchFirst(game) {
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return !!(game.device.input.touch && coarse);
}

export default class TouchControls {
  constructor(scene, { onShift } = {}) {
    this.scene = scene;
    this.game = scene.sys.game;
    this.onShift = onShift || (() => {});

    // Public state read by GameScene every frame.
    this.left = false;
    this.right = false;
    this.jump = false;

    this.enabled = true;
    this.cooldown = 0; // 0..1, set by UIScene for the SHIFT sweep

    this.moveTouches = []; // [{ pointer, id }]  newest last; newest still-down wins
    this.jumpTouches = [];
    this.shiftTouches = [];

    this.safe = new Phaser.Geom.Rectangle();
    this.z = {};

    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(150);
    this.btnLeft = this.makeButton('left');
    this.btnRight = this.makeButton('right');
    this.btnJump = this.makeButton('jump');
    this.btnShift = this.makeButton('shift');
    this.shiftSweep = scene.add.graphics();
    this.root.add(this.shiftSweep);

    this.layout();
    this.shown = !!this.game.registry.get('touchUI') || isTouchFirst(this.game);
    if (this.shown) this.game.registry.set('touchUI', true);
    this.root.setVisible(this.shown);
    this.redraw();

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.scale.on('resize', this.layout, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.onLostFocus, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onLostFocus, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  makeButton(kind) {
    const g = this.scene.add.graphics();
    g.kind = kind;
    this.root.add(g);
    if (kind === 'jump' || kind === 'shift') {
      const t = this.scene.add.text(0, 0, kind === 'jump' ? 'JUMP' : 'SHIFT', {
        fontFamily: 'monospace', fontSize: kind === 'jump' ? '18px' : '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      g.label = t;
      this.root.add(t);
    }
    return g;
  }

  layout() {
    const s = getSafeRect(this.game, this.safe);
    const L = LAYOUT;
    const by = s.bottom - L.margin - L.dpadR;
    const lx = s.left + L.margin + L.dpadR;
    const rx = lx + L.dpadGap;
    const jx = s.right - L.margin - L.jumpR;
    const jy = s.bottom - L.margin - L.jumpR;
    this.z = {
      top: s.top + L.hudBand,
      moveMaxX: s.left + s.width * L.moveZone,
      actionMinX: s.left + s.width * (1 - L.actionZone),
      dpadCX: (lx + rx) / 2,
      left: { x: lx, y: by },
      right: { x: rx, y: by },
      jump: { x: jx, y: jy },
      shift: { x: jx - L.shiftDX, y: jy - L.shiftDY },
    };
    this.btnLeft.setPosition(lx, by);
    this.btnRight.setPosition(rx, by);
    this.btnJump.setPosition(jx, jy);
    this.btnShift.setPosition(this.z.shift.x, this.z.shift.y);
    this.btnJump.label.setPosition(jx, jy);
    this.btnShift.label.setPosition(this.z.shift.x, this.z.shift.y);
    this.shiftSweep.setPosition(this.z.shift.x, this.z.shift.y);
  }

  drawButton(g, down) {
    const L = LAYOUT;
    const r = g.kind === 'jump' ? L.jumpR : g.kind === 'shift' ? L.shiftR : L.dpadR;
    const tint = g.kind === 'shift' ? 0xff44aa : g.kind === 'jump' ? 0x44ffaa : 0x00ffff;
    g.clear();
    g.fillStyle(down ? tint : 0x000000, down ? 0.45 : 0.25);
    g.fillCircle(0, 0, r);
    g.lineStyle(3, down ? 0xffffff : tint, 0.9);
    g.strokeCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.95);
    if (g.kind === 'left') g.fillTriangle(-16, 0, 12, -18, 12, 18);
    if (g.kind === 'right') g.fillTriangle(16, 0, -12, -18, -12, 18);
    if (g.kind === 'jump') g.fillTriangle(0, -38, -16, -22, 16, -22);
    g.setAlpha(down ? DOWN_ALPHA : IDLE_ALPHA);
    g.setScale(down ? 0.92 : 1);
    if (g.label) g.label.setAlpha(down ? 1 : 0.7).setScale(down ? 0.92 : 1);
  }

  redraw() {
    this.drawButton(this.btnLeft, this.left);
    this.drawButton(this.btnRight, this.right);
    this.drawButton(this.btnJump, this.jump);
    this.drawButton(this.btnShift, this.shiftTouches.length > 0);
    this._drawn = `${this.left}${this.right}${this.jump}${this.shiftTouches.length > 0}`;
  }

  reveal() {
    if (this.shown) return;
    this.shown = true;
    this.game.registry.set('touchUI', true);
    this.root.setVisible(this.enabled);
  }

  onDown(pointer, currentlyOver) {
    if (pointer.wasTouch) this.reveal();
    if (!this.enabled || !this.shown) return;
    // A touch that landed on an interactive UI object (pause button, pause overlay) never drives gameplay.
    if (currentlyOver && currentlyOver.length) return;
    const { x, y } = pointer;
    const z = this.z;
    if (y < z.top) return;
    const entry = { pointer, id: pointer.identifier };
    if (x <= z.moveMaxX) {
      this.moveTouches.push(entry);
    } else if (x >= z.actionMinX) {
      if (Phaser.Math.Distance.Between(x, y, z.shift.x, z.shift.y) <= LAYOUT.shiftHitR) {
        this.shiftTouches.push(entry);
        this.onShift(); // edge-triggered, exactly once per touch (like Q 'down')
      } else {
        this.jumpTouches.push(entry); // held, like UP/W/SPACE isDown
      }
    }
    this.recompute();
  }

  onMove(pointer) {
    if (this.moveTouches.some(e => e.pointer === pointer)) this.recompute();
  }

  onUp(pointer) {
    const keep = e => e.pointer !== pointer;
    this.moveTouches = this.moveTouches.filter(keep);
    this.jumpTouches = this.jumpTouches.filter(keep);
    this.shiftTouches = this.shiftTouches.filter(keep);
    this.recompute();
  }

  // Safety net, called every frame by UIScene.update: drop any touch Phaser no longer reports as down
  // (lost touchend, touchcancel, pointer recycled for a new touch).
  update() {
    const alive = e => e.pointer.isDown && e.pointer.identifier === e.id;
    if (!this.moveTouches.every(alive) || !this.jumpTouches.every(alive) || !this.shiftTouches.every(alive)) {
      this.moveTouches = this.moveTouches.filter(alive);
      this.jumpTouches = this.jumpTouches.filter(alive);
      this.shiftTouches = this.shiftTouches.filter(alive);
      this.recompute();
    }
    this.drawSweep();
  }

  recompute() {
    const m = this.moveTouches[this.moveTouches.length - 1];
    const dx = m ? m.pointer.x - this.z.dpadCX : 0;
    this.left = !!m && dx < -LAYOUT.dead;
    this.right = !!m && dx > LAYOUT.dead;
    this.jump = this.jumpTouches.length > 0;
    const key = `${this.left}${this.right}${this.jump}${this.shiftTouches.length > 0}`;
    if (key !== this._drawn) this.redraw();
  }

  drawSweep() {
    const g = this.shiftSweep;
    g.clear();
    if (!this.root.visible || this.cooldown <= 0) {
      this.btnShift.label.setColor('#ffffff');
      return;
    }
    const r = LAYOUT.shiftR - 4;
    g.fillStyle(0x000000, 0.45);
    g.fillCircle(0, 0, r);
    g.fillStyle(0xffaa00, 0.55);
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + (1 - this.cooldown) * 360), false);
    g.closePath();
    g.fillPath();
    this.btnShift.label.setColor('#888888');
  }

  releaseAll() {
    this.moveTouches = [];
    this.jumpTouches = [];
    this.shiftTouches = [];
    this.recompute();
  }

  onLostFocus() {
    this.releaseAll();
    // If iOS never delivers touchend/touchcancel (app switch, Control Centre), Phaser keeps those
    // pointers 'active' and they can never be reused. Free them.
    this.scene.input.manager.pointers.forEach(p => { if (p.id !== 0 && p.active) p.reset(); });
  }

  setEnabled(on) {
    this.enabled = on;
    this.releaseAll();
    this.root.setVisible(on && this.shown);
  }

  destroy() {
    const s = this.scene;
    s.input.off('pointerdown', this.onDown, this);
    s.input.off('pointermove', this.onMove, this);
    s.input.off('pointerup', this.onUp, this);
    s.input.off('pointerupoutside', this.onUp, this);
    s.scale.off('resize', this.layout, this);
    this.game.events.off(Phaser.Core.Events.BLUR, this.onLostFocus, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.onLostFocus, this);
    s.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.left = this.right = this.jump = false;
    this.moveTouches = this.jumpTouches = this.shiftTouches = [];
    if (s.touchControls === this) s.touchControls = null;
  }
}

export { LAYOUT };
