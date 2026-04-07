# Phase Runner - Gamedev.js Jam 2026 Entry

A fast-paced action platformer with a unique dimension-shifting mechanic for the Gamedev.js Jam 2026.

## 🎮 Gameplay

- **Dimension Shift Mechanic**: Press Q to toggle between two realities where platforms, enemies, and hazards exist differently
- **Fluid Controls**: Tight, responsive platforming with coyote time and jump buffering
- **Procedural Levels**: Each playthrough generates unique level layouts
- **Progressive Difficulty**: Increasing challenges as you advance
- **Score System**: Collect gems, defeat enemies, and complete levels quickly for high scores

## 🏆 Challenges Targeted

- **Open Source by GitHub**: This repository is public and open source
- **Build it with Phaser**: Created with Phaser 3 framework

## 🛠️ Technical Features

- **Procedural Audio**: All sound effects and music generated using Web Audio API (no audio files)
- **Programmatic Graphics**: All sprites and textures generated on canvas (no image assets)
- **Particle System**: Extensive visual effects including screen shake, dimension shift effects, and more
- **Mobile Ready**: Touch controls support
- **Responsive Design**: Works on various screen sizes

## 🚀 How to Play

### Desktop Controls:
- **Arrow Keys / WASD**: Move and jump
- **Q**: Dimension Shift
- **P / ESC**: Pause

### Mobile:
- Touch controls appear on screen

## 📁 Project Structure

```
src/
├── entities/         # Game entities (Player, Enemy)
├── scenes/           # Phaser scenes (Boot, Menu, Game, UI, GameOver)
├── systems/          # Game systems (Audio, Effects, Level Generation)
└── main.js           # Game entry point
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🎯 Jam Submission

This game was created for the Gamedev.js Jam 2026 running from April 13-26, 2026. The dimension-shifting core mechanic is designed to be adaptable to any jam theme.

**Theme Adaptability**: The dimension-shift mechanic represents duality, alternation, or transformation - concepts that can map to many potential themes.

Good luck to all jammers!