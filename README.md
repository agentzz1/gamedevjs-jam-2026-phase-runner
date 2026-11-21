# Phase Runner - Gamedev.js Jam 2026 Entry

A fast-paced action platformer with a unique dimension-shifting mechanic for the Gamedev.js Jam 2026.

**▶ [Play it in your browser](https://agentzz1.github.io/gamedevjs-jam-2026-phase-runner/)**

## 🎮 Gameplay

- **Dimension Shift**: Press Q (or tap the SHIFT button) to toggle between two realities. Some platforms, enemies and spikes exist in only one of them. Shifting has a 3 s cooldown.
- **One hand-built level**: Run, jump and shift your way to the portal at the end.
- **Score System**: Gem +100, stomp an enemy +200, reach the portal +500. Your high score is saved.
- **3 lives**: Enemies and spikes cost health; health pickups restore it.

## 🏆 Challenges Targeted

- **Open Source by GitHub**: This repository is public and open source
- **Build it with Phaser**: Created with Phaser 3 framework

## 🛠️ Technical Features

- **Procedural Audio**: All sound effects and music generated using Web Audio API (no audio files)
- **Programmatic Graphics**: All in-game sprites and textures generated on canvas (no image assets in the game; only the Home Screen / tab icons are PNGs)
- **Visual Effects**: Particles, screen shake and a flash on every dimension shift
- **Mobile Ready**: on-screen multi-touch controls, landscape layout that respects the iPhone notch and home indicator
- **Installable**: add it to your Home Screen to play full screen

## 🚀 How to Play

### Desktop Controls:
- **Arrow keys / WASD**: Move
- **Up / W / Space**: Jump
- **Q**: Dimension Shift
- **P / Esc**: Pause

The menu says *Press SPACE or Click to Start*.

### Mobile (iPhone / Android):
- Play in **landscape**. In portrait the game shows *Rotate your phone to landscape*. If the screen does not turn: *Won't rotate? Turn off Portrait Orientation Lock in Control Center.*
- *Tap to Start* on the menu.
- **Left thumb:** the ◀ ▶ buttons move.
- **Right thumb:** **JUMP** (hold to keep hopping) and **SHIFT** (tap; the 3 s cooldown is shown as an orange sweep).
- The **❚❚** button (top right) pauses. *Tap anywhere to resume.*
- Leaving the app, locking the phone or rotating to portrait pauses the game automatically.

**Full screen (recommended):**
- **iPhone Safari:** tap **Share** (on iOS 26: **•••** → **Share**) → **Add to Home Screen**, then start Phase Runner from its icon. The menu reminds you: *Tip: Share → Add to Home Screen for full screen*.
- **Android Chrome:** **⋮** → **Add to Home screen** / **Install app**.

**No sound on iPhone?** The Ring/Silent switch mutes web audio, so switch it to Ring. Sound starts with your first tap.

High scores are stored per browser: Safari and the Home Screen app keep separate scores.

## 📁 Project Structure

```
index.html                # Page shell: safe-area layout CSS, rotate-to-landscape overlay, home-screen tags
public/
├── manifest.webmanifest  # Web app manifest (Add to Home Screen / Install app)
└── icons/                # Home-screen icons and favicon (made by scripts/make-icons.cjs)
scripts/
└── make-icons.cjs        # One-off icon generator (output is committed; not run in CI)
src/
├── main.js               # Game config and boot
├── scenes/               # Phaser scenes (Boot, Menu, Game, UI, GameOver)
├── ui/
│   └── TouchControls.js  # On-screen multi-touch controls (d-pad, JUMP, SHIFT)
├── systems/
│   ├── AudioSystem.js    # Sound effects and music synthesized with Web Audio
│   ├── platform.js       # iOS / Home Screen detection for the install tip
│   ├── EffectSystem.js   # Experimental, not wired in
│   └── LevelGenerator.js # Experimental, not wired in
└── entities/             # Experimental (Player, Enemy, EnemyFactory), not wired in
```

## 🔧 Development

```bash
# Install dependencies
npm ci

# Run development server (http://localhost:8080)
npm run dev

# Test on a phone over Wi-Fi: open the "Network" URL it prints
npm run dev -- --host

# Build for production (output in dist/)
npm run build
```

### Deploy

Pushing to `master` runs GitHub Actions (`.github/workflows/deploy.yml`), which builds the game and publishes `dist/` to GitHub Pages. Pull requests to `master` are built and checked but not deployed.

First release (manual steps):
1. Repository owner: **Settings → Pages → Source: GitHub Actions**.
2. Merge PR #1 (`claude/new-session-keu35y` → `master`). Only `master` deploys.
3. If needed, run the workflow manually on `master` (**Actions → Deploy to GitHub Pages → Run workflow**).

## 🎯 Jam Submission

This game was created for the Gamedev.js Jam 2026 running from April 13-26, 2026. The dimension-shifting core mechanic is designed to be adaptable to any jam theme.

**Theme Adaptability**: The dimension-shift mechanic represents duality, alternation, or transformation - concepts that can map to many potential themes.

Good luck to all jammers!
