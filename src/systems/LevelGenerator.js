export class LevelGenerator {
  constructor(scene) {
    this.scene = scene;
    this.levelWidth = 4000;
    this.levelHeight = 600;
    this.platformTileWidth = 128;
    this.platformTileHeight = 32;
    this.groundTileHeight = 48;
    this.playerJumpHeight = 120;
    this.playerMaxJumpX = 200;
    this.difficulty = 1;
  }

  seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  isPlatformReachable(platform, allPlatforms) {
    const spawnX = 100;
    const spawnY = 400;

    if (this.distance(platform.x, platform.y, spawnX, spawnY) < this.playerMaxJumpX + 50) {
      return true;
    }

    for (const other of allPlatforms) {
      if (other === platform) continue;
      const dx = Math.abs(platform.x - other.x);
      const dy = platform.y - other.y;

      if (dy >= -this.playerJumpHeight && dy <= 150 && dx < this.playerMaxJumpX + (platform.width / 2 + other.width / 2)) {
        return true;
      }
    }

    return false;
  }

  generateLevel(levelNumber) {
    const seed = levelNumber * 7919 + 42;
    this.rng = this.seededRandom(seed);
    this.difficulty = Math.min(5, Math.max(1, Math.ceil(levelNumber / 2)));

    this.levelWidth = 3000 + levelNumber * 500;

    const platforms = this.generatePlatforms(this.difficulty);
    const enemies = this.generateEnemies(platforms, this.difficulty);
    const collectibles = this.generateCollectibles(platforms);
    const spikes = this.generateSpikes(platforms);
    const movingPlatforms = this.generateMovingPlatforms(platforms, this.difficulty);
    const portal = this.generatePortal(platforms);

    const levelData = {
      platforms,
      enemies,
      collectibles,
      spikes,
      movingPlatforms,
      portal,
      levelWidth: this.levelWidth,
      levelHeight: this.levelHeight,
      difficulty: this.difficulty,
    };

    this.ensureSolvable(levelData);

    return levelData;
  }

  generatePlatforms(difficulty) {
    const platforms = [];
    const gapChance = 0.15 + difficulty * 0.05;
    const shiftedChance = 0.1 + difficulty * 0.05;
    const floatingChance = 0.3 + difficulty * 0.05;

    const groundY = this.levelHeight - this.groundTileHeight / 2;
    let x = this.platformTileWidth / 2;

    platforms.push({
      x: x,
      y: groundY,
      width: this.platformTileWidth * 3,
      height: this.groundTileHeight,
      type: 'ground',
      dimension: 'both',
      isMoving: false,
    });

    x += this.platformTileWidth * 3;

    while (x < this.levelWidth - 400) {
      if (this.rng() < gapChance && x > 400) {
        const gapSize = this.platformTileWidth * (1 + Math.floor(this.rng() * (1 + difficulty * 0.5)));
        x += gapSize;
      }

      const segmentLength = 1 + Math.floor(this.rng() * 3);
      const isGround = this.rng() < 0.5;

      if (isGround) {
        for (let i = 0; i < segmentLength; i++) {
          let dimension = 'both';
          if (this.rng() < shiftedChance) {
            dimension = 'shifted';
          }

          platforms.push({
            x: x + i * this.platformTileWidth,
            y: groundY,
            width: this.platformTileWidth,
            height: this.groundTileHeight,
            type: 'ground',
            dimension,
            isMoving: false,
          });
        }
      } else {
        const heightVariation = Math.floor(this.rng() * 3);
        const y = groundY - (1 + heightVariation) * 80;

        for (let i = 0; i < segmentLength; i++) {
          let dimension = 'both';
          if (this.rng() < shiftedChance) {
            dimension = 'shifted';
          }

          platforms.push({
            x: x + i * this.platformTileWidth,
            y: y,
            width: this.platformTileWidth,
            height: this.platformTileHeight,
            type: 'floating',
            dimension,
            isMoving: false,
          });
        }
      }

      x += segmentLength * this.platformTileWidth;

      if (this.rng() < floatingChance) {
        const fx = x - this.platformTileWidth + this.rng() * this.platformTileWidth * 2;
        const fy = groundY - 100 - this.rng() * 200;
        let fDimension = 'both';
        if (this.rng() < shiftedChance * 1.5) {
          fDimension = 'shifted';
        }

        platforms.push({
          x: fx,
          y: fy,
          width: this.platformTileWidth,
          height: this.platformTileHeight,
          type: 'floating',
          dimension: fDimension,
          isMoving: false,
        });
      }
    }

    const endPlatformX = this.levelWidth - this.platformTileWidth * 2;
    platforms.push({
      x: endPlatformX,
      y: groundY,
      width: this.platformTileWidth * 2,
      height: this.groundTileHeight,
      type: 'ground',
      dimension: 'both',
      isMoving: false,
    });

    return platforms;
  }

  generateEnemies(platforms, difficulty) {
    const enemies = [];
    const groundPlatforms = platforms.filter(
      (p) => p.type === 'ground' && p.dimension !== 'shifted' && !p.isMoving
    );
    const shiftedPlatforms = platforms.filter(
      (p) => p.dimension === 'shifted' && !p.isMoving
    );

    const slimeCount = Math.floor(2 + difficulty * 1.5);
    const placedSlimes = new Set();

    for (let i = 0; i < Math.min(slimeCount, groundPlatforms.length); i++) {
      let idx;
      do {
        idx = Math.floor(this.rng() * groundPlatforms.length);
      } while (placedSlimes.has(idx) && placedSlimes.size < groundPlatforms.length);

      placedSlimes.add(idx);
      const plat = groundPlatforms[idx];

      enemies.push({
        x: plat.x,
        y: plat.y - 40,
        type: 'slime',
        patrol: 60 + this.rng() * 80,
        dimension: 'normal',
        speed: 40 + difficulty * 10,
      });
    }

    const phantomCount = Math.floor(1 + difficulty * 0.8);
    for (let i = 0; i < Math.min(phantomCount, shiftedPlatforms.length); i++) {
      const plat = shiftedPlatforms[i];

      enemies.push({
        x: plat.x,
        y: plat.y - 50,
        type: 'phantom',
        patrol: 50 + this.rng() * 70,
        dimension: 'shifted',
        speed: 50 + difficulty * 8,
      });
    }

    const flyingCount = Math.floor(difficulty * 0.6);
    for (let i = 0; i < flyingCount; i++) {
      const fx = 400 + this.rng() * (this.levelWidth - 600);
      const fy = 100 + this.rng() * 200;

      enemies.push({
        x: fx,
        y: fy,
        type: 'flying',
        patrol: 80 + this.rng() * 100,
        dimension: 'both',
        speed: 60 + difficulty * 10,
      });
    }

    return enemies;
  }

  generateCollectibles(platforms) {
    const collectibles = [];

    for (const plat of platforms) {
      if (plat.isMoving) continue;

      if (this.rng() < 0.4) {
        const numGems = 1 + Math.floor(this.rng() * 3);
        for (let i = 0; i < numGems; i++) {
          const offsetX = (i - (numGems - 1) / 2) * 30;
          collectibles.push({
            x: plat.x + offsetX,
            y: plat.y - plat.height / 2 - 20,
            type: 'gem',
            dimension: plat.dimension,
          });
        }
      }
    }

    for (let i = 0; i < 3; i++) {
      const arcCenterX = 300 + this.rng() * (this.levelWidth - 600);
      const arcCenterY = 200 + this.rng() * 150;
      const arcRadius = 60 + this.rng() * 40;

      for (let j = 0; j < 5; j++) {
        const angle = Math.PI + (j / 4) * Math.PI;
        collectibles.push({
          x: arcCenterX + Math.cos(angle) * arcRadius,
          y: arcCenterY + Math.sin(angle) * arcRadius * 0.5,
          type: 'gem',
          dimension: 'both',
        });
      }
    }

    const healthCount = 2 + Math.floor(this.rng() * 2);
    for (let i = 0; i < healthCount; i++) {
      const hx = 400 + this.rng() * (this.levelWidth - 600);
      const hy = 250 + this.rng() * 200;
      collectibles.push({
        x: hx,
        y: hy,
        type: 'health',
        dimension: 'both',
      });
    }

    return collectibles;
  }

  generateSpikes(platforms) {
    const spikes = [];
    const groundY = this.levelHeight - this.groundTileHeight / 2;

    for (let i = 0; i < platforms.length - 1; i++) {
      const current = platforms[i];
      const next = platforms[i + 1];

      if (current.type === 'ground' && next.type === 'ground' && current.dimension === 'both' && next.dimension === 'both') {
        const gapStart = current.x + current.width / 2;
        const gapEnd = next.x - next.width / 2;

        if (gapEnd > gapStart && gapEnd - gapStart < this.platformTileWidth * 2) {
          if (this.rng() < 0.3) {
            const spikeX = gapStart + (gapEnd - gapStart) / 2;
            spikes.push({
              x: spikeX,
              y: groundY + 8,
              dimension: 'normal',
            });
          }
        }
      }
    }

    for (const plat of platforms) {
      if (plat.type === 'ground' && plat.dimension === 'both' && !plat.isMoving) {
        if (this.rng() < 0.15) {
          const spikeX = plat.x + (this.rng() - 0.5) * plat.width * 0.5;
          spikes.push({
            x: spikeX,
            y: plat.y - plat.height / 2 - 8,
            dimension: 'normal',
          });
        }
      }

      if (plat.dimension === 'shifted' && this.rng() < 0.2) {
        const spikeX = plat.x + (this.rng() - 0.5) * plat.width * 0.5;
        spikes.push({
          x: spikeX,
          y: plat.y - plat.height / 2 - 8,
          dimension: 'shifted',
        });
      }
    }

    return spikes;
  }

  generateMovingPlatforms(platforms, difficulty) {
    const movingPlatforms = [];
    const count = 2 + Math.floor(difficulty * 0.8);

    for (let i = 0; i < count; i++) {
      const x = 400 + (this.levelWidth - 600) * ((i + 1) / (count + 1));
      const axis = this.rng() < 0.5 ? 'x' : 'y';
      const distance = 50 + this.rng() * 80;
      const speed = 0.0008 + this.rng() * 0.0005;

      let startY;
      if (axis === 'y') {
        startY = 200 + this.rng() * 250;
      } else {
        startY = 200 + this.rng() * 200;
      }

      movingPlatforms.push({
        x,
        y: startY,
        width: 96,
        height: 24,
        axis,
        distance,
        speed,
        dimension: 'both',
      });
    }

    return movingPlatforms;
  }

  generatePortal(platforms) {
    const rightmostPlatforms = platforms
      .filter((p) => p.dimension !== 'shifted')
      .sort((a, b) => (b.x + b.width / 2) - (a.x + a.width / 2));

    if (rightmostPlatforms.length > 0) {
      const targetPlat = rightmostPlatforms[0];
      return {
        x: targetPlat.x,
        y: targetPlat.y - targetPlat.height / 2 - 30,
      };
    }

    return {
      x: this.levelWidth - 150,
      y: this.levelHeight - 150,
    };
  }

  ensureSolvable(levelData) {
    const { platforms, enemies, collectibles, spikes, movingPlatforms, portal } = levelData;
    const allPlatforms = [...platforms, ...movingPlatforms.map((mp) => ({
      x: mp.x,
      y: mp.y,
      width: mp.width,
      height: mp.height,
      type: 'moving',
      dimension: mp.dimension,
      isMoving: true,
    }))];

    const reachableFromStart = this.floodFillReachable(allPlatforms, 100, 400);

    for (let i = allPlatforms.length - 1; i >= 0; i--) {
      const plat = allPlatforms[i];
      if (plat.dimension === 'shifted') continue;
      if (!reachableFromStart.has(plat) && plat.x < portal.x) {
        const nearestReachable = this.findNearestReachable(plat, reachableFromStart);
        if (nearestReachable) {
          const bridge = {
            x: (plat.x + nearestReachable.x) / 2,
            y: Math.min(plat.y, nearestReachable.y) - 40,
            width: this.platformTileWidth,
            height: this.platformTileHeight,
            type: 'floating',
            dimension: 'both',
            isMoving: false,
          };
          platforms.push(bridge);
          allPlatforms.push(bridge);
          reachableFromStart.add(bridge);
        }
      }
    }

    const portalReachable = this.canReachPortal(allPlatforms, portal);
    if (!portalReachable) {
      const rightmost = allPlatforms
        .filter((p) => p.dimension !== 'shifted' && p.x > portal.x - 300)
        .sort((a, b) => b.x - a.x)[0];

      if (rightmost) {
        platforms.push({
          x: portal.x,
          y: portal.y + 30,
          width: this.platformTileWidth * 2,
          height: this.groundTileHeight,
          type: 'ground',
          dimension: 'both',
          isMoving: false,
        });
      } else {
        platforms.push({
          x: portal.x - 64,
          y: portal.y + 30,
          width: this.platformTileWidth * 2,
          height: this.groundTileHeight,
          type: 'ground',
          dimension: 'both',
          isMoving: false,
        });
      }
    }

    levelData.collectibles = collectibles.filter((c) => {
      if (c.dimension === 'shifted') return true;
      for (const plat of allPlatforms) {
        if (plat.dimension === 'shifted') continue;
        if (
          c.x >= plat.x - plat.width / 2 - 20 &&
          c.x <= plat.x + plat.width / 2 + 20 &&
          c.y >= plat.y - plat.height / 2 - 150 &&
          c.y <= plat.y - plat.height / 2 + 20
        ) {
          return true;
        }
      }
      return false;
    });

    return levelData;
  }

  floodFillReachable(platforms, startX, startY) {
    const reachable = new Set();
    const queue = [{ x: startX, y: startY }];
    const visited = new Set();

    const virtualStart = { x: startX, y: startY, width: 40, height: 60 };
    visited.add('start');

    while (queue.length > 0) {
      const current = queue.shift();

      for (const plat of platforms) {
        if (plat.dimension === 'shifted') continue;
        const key = `${plat.x}-${plat.y}`;
        if (visited.has(key)) continue;

        const dx = Math.abs(plat.x - current.x);
        const dy = plat.y - current.y;

        const canReach =
          dy >= -this.playerJumpHeight &&
          dy <= 200 &&
          dx < this.playerMaxJumpX + plat.width / 2 + 20;

        if (canReach) {
          visited.add(key);
          reachable.add(plat);
          queue.push({ x: plat.x, y: plat.y });
        }
      }
    }

    return reachable;
  }

  findNearestReachable(platform, reachableSet) {
    let nearest = null;
    let minDist = Infinity;

    for (const r of reachableSet) {
      const dist = this.distance(platform.x, platform.y, r.x, r.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = r;
      }
    }

    return nearest;
  }

  canReachPortal(platforms, portal) {
    const reachable = this.floodFillReachable(platforms, 100, 400);

    for (const plat of reachable) {
      if (plat.dimension === 'shifted') continue;
      const dx = Math.abs(plat.x - portal.x);
      const dy = Math.abs(plat.y - portal.y);
      if (dx < 150 && dy < 150) {
        return true;
      }
    }

    return false;
  }
}
