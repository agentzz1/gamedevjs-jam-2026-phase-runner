import Enemy from './Enemy.js';

export function createEnemy(scene, x, y, type, dimension = 'both') {
  let texture;
  let enemy;

  switch (type) {
    case 'slime':
      texture = 'enemy-slime';
      enemy = new Enemy(scene, x, y, type, texture);
      enemy.health = 1;
      enemy.speed = 40;
      enemy.patrolDistance = 120;
      enemy.existsInDimension = 'normal';
      enemy.damage = 1;
      break;

    case 'phantom':
      texture = 'enemy-phantom';
      enemy = new Enemy(scene, x, y, type, texture);
      enemy.health = 2;
      enemy.speed = 60;
      enemy.patrolDistance = 200;
      enemy.existsInDimension = 'shifted';
      enemy.damage = 1;
      enemy.body?.setAllowGravity(false);
      break;

    case 'flying':
      texture = 'enemy-flying';
      enemy = new Enemy(scene, x, y, type, texture);
      enemy.health = 1;
      enemy.speed = 70;
      enemy.patrolDistance = 180;
      enemy.existsInDimension = 'both';
      enemy.damage = 1;
      enemy.startY = y;
      enemy.body?.setAllowGravity(false);
      break;

    default:
      console.warn(`Unknown enemy type: ${type}`);
      return null;
  }

  enemy.create();
  return enemy;
}
