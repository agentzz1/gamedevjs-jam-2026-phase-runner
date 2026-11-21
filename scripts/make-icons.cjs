// One-off generator for the home-screen / PWA icons. Output is committed, so this does NOT run in CI
// and Playwright is NOT a project dependency.
//
// Run (any machine with Playwright available):
//   NODE_PATH=$(npm root -g) node scripts/make-icons.cjs          # globally installed playwright
//   or: npm i --no-save playwright && npx playwright install chromium && node scripts/make-icons.cjs
//
// Writes into public/icons/: apple-touch-icon.png (180), icon-192.png, icon-512.png, favicon-32.png
// The player art is the same path data as BootScene's 'player' / 'playerShifted' textures (64x64 units),
// drawn vector-scaled so it stays crisp at 512 px. Left half = normal dimension (blue), right half =
// shifted dimension (pink): the game's mechanic in one picture.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'public', 'icons');
const TARGETS = [
  { file: 'apple-touch-icon.png', size: 180, mode: 'full' },  // iOS: opaque, full-bleed (iOS rounds corners itself)
  { file: 'icon-192.png', size: 192, mode: 'full' },          // manifest, purpose "any"
  { file: 'icon-512.png', size: 512, mode: 'full' },          // manifest, purpose "any" + "maskable"
  { file: 'favicon-32.png', size: 32, mode: 'favicon' },      // browser tab
];

function draw(size, mode) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const S = size;

  // Background: the MenuScene gradient (0x0a0a1a -> 0x1a1a3a). Opaque everywhere for 'full'
  // (iOS turns transparency black; Android maskable crops to a circle/squircle).
  ctx.save();
  if (mode === 'favicon') { ctx.beginPath(); ctx.roundRect(0, 0, S, S, S * 0.22); ctx.clip(); }
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, '#0a0a1a');
  bg.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Dimension glows: cyan behind the left half, magenta behind the right half.
  const glow = (x, color) => {
    const g = ctx.createRadialGradient(x, S * 0.5, 0, x, S * 0.5, S * 0.55);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  };
  glow(S * 0.28, 'rgba(0,255,255,0.22)');
  glow(S * 0.72, 'rgba(255,68,170,0.22)');

  // Sparkles (only where there is room for them).
  if (mode === 'full') {
    const star = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    star(S * 0.24, S * 0.26, S * 0.035, 'rgba(255,255,255,0.9)');
    star(S * 0.78, S * 0.30, S * 0.028, 'rgba(255,221,0,0.9)');
    star(S * 0.30, S * 0.76, S * 0.022, 'rgba(0,255,255,0.8)');
    star(S * 0.74, S * 0.74, S * 0.025, 'rgba(255,102,204,0.8)');
  }

  // Player art from BootScene (64x64 units). Art bbox x 20..44, y 4..58 -> centre (32, 31).
  // 'full': art height = 68% of the icon, inside the maskable safe circle (r = 40%).
  const k = mode === 'favicon' ? S / 58 : (S * 0.68) / 54;
  const player = (body, head, legs) => {
    ctx.save();
    ctx.translate(S / 2 - 32 * k, S / 2 - 31 * k);
    ctx.scale(k, k);
    ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(20, 16, 24, 28, 6); ctx.fill();
    ctx.fillStyle = head; ctx.beginPath(); ctx.arc(32, 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(36, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(37, 12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = legs; ctx.fillRect(22, 44, 8, 14); ctx.fillRect(34, 44, 8, 14);
    if (mode === 'full') { ctx.shadowColor = body; ctx.shadowBlur = 8 * k; }
    ctx.strokeStyle = head; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(20, 16, 24, 28, 6); ctx.stroke();
    ctx.restore();
  };
  // Split line, tilted ~14 degrees: top at x = S*0.56, bottom at x = S*0.44.
  const top = S * 0.56, bot = S * 0.44;
  const half = (left) => {
    ctx.save(); ctx.beginPath();
    if (left) { ctx.moveTo(0, 0); ctx.lineTo(top, 0); ctx.lineTo(bot, S); ctx.lineTo(0, S); }
    else { ctx.moveTo(top, 0); ctx.lineTo(S, 0); ctx.lineTo(S, S); ctx.lineTo(bot, S); }
    ctx.closePath(); ctx.clip();
  };
  half(true);  player('#4488ff', '#66aaff', '#3366cc'); ctx.restore();
  half(false); player('#ff44aa', '#ff66cc', '#cc3388'); ctx.restore();

  // The phase seam.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, S * 0.012);
  if (mode === 'full') { ctx.shadowColor = '#00ffff'; ctx.shadowBlur = S * 0.04; }
  ctx.beginPath(); ctx.moveTo(top + (bot - top) * 0.12, S * 0.12); ctx.lineTo(top + (bot - top) * 0.88, S * 0.88); ctx.stroke();
  ctx.restore();

  ctx.restore();
  return c.toDataURL('image/png');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><body></body>');
  for (const t of TARGETS) {
    const url = await page.evaluate(`(${draw})(${t.size}, ${JSON.stringify(t.mode)})`);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, t.file), buf);
    console.log(`${t.file}  ${t.size}x${t.size}  ${buf.length} bytes`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
