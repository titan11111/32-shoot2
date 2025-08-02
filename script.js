const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const stageDisplay = document.getElementById('stage');
const gameOverDisplay = document.getElementById('game-over');
const bgm = document.getElementById('bgm');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

// ==== SVG キャッシュ機構 ====
const svgCache = {};
function getSvgImage(key, svgText) {
  if (!svgCache[key]) {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    svgCache[key] = URL.createObjectURL(blob);
  }
  const img = new Image();
  img.src = svgCache[key];
  return img;
}

// ==== SVG データ ====
const PLAYER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">
  <polygon points="10,30 70,18 110,30 70,42" fill="#3498db" stroke="#2980b9" stroke-width="2"/>
  <polygon points="50,20 80,30 50,40" fill="#bdc3c7"/>
  <polygon points="20,15 45,30 20,45" fill="#ecf0f1"/>
</svg>`;
const ENEMY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 30">
  <ellipse cx="25" cy="20" rx="20" ry="8" fill="#e74c3c"/>
  <ellipse cx="25" cy="10" rx="10" ry="5" fill="#c0392b"/>
</svg>`;
const ENEMY_STRONG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
  <ellipse cx="30" cy="25" rx="25" ry="10" fill="#27ae60"/>
  <ellipse cx="30" cy="12" rx="15" ry="8" fill="#2ecc71"/>
</svg>`;
const ENEMY_FAST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 30">
  <ellipse cx="25" cy="15" rx="20" ry="10" fill="#9b59b6"/>
  <circle cx="25" cy="15" r="5" fill="#8e44ad"/>
</svg>`;
const ENEMY_SHOOTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
  <rect x="5" y="10" width="50" height="20" fill="#f1c40f" rx="5"/>
  <circle cx="30" cy="20" r="6" fill="#f39c12"/>
</svg>`;
const ITEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="18" fill="gold"/>
  <polygon points="20,5 23,15 35,15 25,22 28,32 20,26 12,32 15,22 5,15 17,15" fill="orange"/>
</svg>`;

let playerY = window.innerHeight / 2;
const speed = 5;
let keys = {};
let score = 0;
let gameOver = false;
let touchStartY = 0;
let powerLevel = 0;
let barrierHits = 0;
let stage = 1;
let enemySpawnInterval = 2000;
let enemiesDestroyed = 0;

// ==== ゲーム開始 ====
startButton.addEventListener('click', () => {
  startScreen.style.display = 'none';
  gameContainer.style.display = 'block';
  player.appendChild(getSvgImage('player', PLAYER_SVG));
  player.style.transform = 'none';
  playerY = (window.innerHeight - player.offsetHeight) / 2;
  player.style.top = `${playerY}px`;
  bgm.play();
  gameLoop();
  spawnEnemy();
  spawnItem();
});

// ==== キー操作 ====
document.addEventListener('keydown', (e) => {
  if (gameOver) return;
  keys[e.code] = true;
  if (e.code === 'Space') {
    shoot('normal');
  } else if (e.code === 'KeyZ') {
    shoot('strong');
  }
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// ==== スマホ：スワイプ上下移動／タップ発射 ====
gameContainer.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStartY = e.touches[0].clientY;
}, { passive: false });
gameContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const currentY = e.touches[0].clientY;
  const delta = currentY - touchStartY;
  playerY += delta;
  const playerHeight = player.offsetHeight;
  playerY = Math.max(0, Math.min(window.innerHeight - playerHeight, playerY));
  player.style.top = `${playerY}px`;
  touchStartY = currentY;
}, { passive: false });
gameContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  shoot('normal');
}, { passive: false });

// ==== 自機移動 ====
function movePlayer() {
  if (keys['ArrowUp']) playerY -= speed;
  if (keys['ArrowDown']) playerY += speed;
  const playerHeight = player.offsetHeight;
  playerY = Math.max(0, Math.min(window.innerHeight - playerHeight, playerY));
  player.style.top = `${playerY}px`;
}

// ==== 弾発射（種類指定） ====
function shoot(type = 'normal') {
  if (gameOver) return;
  if (type === 'strong') {
    spawnBeam();
    return;
  }
  const center = player.offsetTop + player.offsetHeight / 2;
  switch (powerLevel) {
    case 0:
      spawnBullet(center);
      break;
    case 1:
      spawnBullet(center - 10);
      spawnBullet(center + 10);
      break;
    case 2:
      spawnBeam();
      break;
    case 3:
      spawnHoming();
      break;
    default:
      spawnBullet(center - 20);
      spawnBullet(center);
      spawnBullet(center + 20);
      break;
  }
}

function spawnBullet(centerY) {
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  bullet.style.left = `${player.offsetLeft + player.offsetWidth}px`;
  bullet.style.top = `${centerY - 2}px`;
  gameContainer.appendChild(bullet);
  const interval = setInterval(() => {
    const currentLeft = parseInt(bullet.style.left, 10);
    if (currentLeft > window.innerWidth) {
      bullet.remove();
      clearInterval(interval);
    } else {
      bullet.style.left = `${currentLeft + 8}px`;
      checkBulletCollision(bullet, interval, 'normal');
    }
  }, 16);
}

function spawnBeam() {
  const beam = document.createElement('div');
  beam.classList.add('beam');
  beam.style.left = `${player.offsetLeft + player.offsetWidth}px`;
  beam.style.top = `${player.offsetTop + player.offsetHeight / 2 - 4}px`;
  gameContainer.appendChild(beam);
  const interval = setInterval(() => {
    const currentLeft = parseInt(beam.style.left, 10);
    if (currentLeft > window.innerWidth) {
      beam.remove();
      clearInterval(interval);
    } else {
      beam.style.left = `${currentLeft + 12}px`;
      checkBulletCollision(beam, interval, 'beam');
    }
  }, 16);
}

function spawnHoming() {
  const bullet = document.createElement('div');
  bullet.classList.add('homing');
  bullet.style.left = `${player.offsetLeft + player.offsetWidth}px`;
  bullet.style.top = `${player.offsetTop + player.offsetHeight / 2 - 6}px`;
  gameContainer.appendChild(bullet);
  const interval = setInterval(() => {
    const currentLeft = parseInt(bullet.style.left, 10);
    const currentTop = parseInt(bullet.style.top, 10);
    if (currentLeft > window.innerWidth) {
      bullet.remove();
      clearInterval(interval);
    } else {
      bullet.style.left = `${currentLeft + 6}px`;
      const target = findNearestEnemy(currentLeft, currentTop);
      if (target) {
        const rect = target.getBoundingClientRect();
        const targetCenter = rect.top + rect.height / 2;
        if (targetCenter > currentTop) {
          bullet.style.top = `${currentTop + 2}px`;
        } else {
          bullet.style.top = `${currentTop - 2}px`;
        }
      }
      checkBulletCollision(bullet, interval, 'homing');
    }
  }, 20);
}

function spawnEnemyBullet(x, y, speed = 6) {
  const bullet = document.createElement('div');
  bullet.classList.add('enemy-bullet');
  bullet.style.left = `${x}px`;
  bullet.style.top = `${y - 4}px`;
  gameContainer.appendChild(bullet);
  const interval = setInterval(() => {
    const currentLeft = parseInt(bullet.style.left, 10);
    if (gameOver || currentLeft < -20) {
      bullet.remove();
      clearInterval(interval);
    } else {
      bullet.style.left = `${currentLeft - speed}px`;
      checkEnemyBulletCollision(bullet, interval);
    }
  }, 20);
}

function checkEnemyBulletCollision(bullet, interval) {
  const playerRect = player.getBoundingClientRect();
  const bulletRect = bullet.getBoundingClientRect();
  if (
    bulletRect.left < playerRect.right &&
    bulletRect.right > playerRect.left &&
    bulletRect.top < playerRect.bottom &&
    bulletRect.bottom > playerRect.top
  ) {
    bullet.remove();
    clearInterval(interval);
    if (barrierHits > 0) {
      barrierHits--;
      if (barrierHits <= 0) {
        const b = player.querySelector('.barrier');
        if (b) b.remove();
      }
    } else {
      createExplosion(player.offsetLeft, player.offsetTop);
      endGame();
    }
  }
}

// ==== 敵生成（4種類） ====
function spawnEnemy() {
  if (gameOver) return;
  const types = ['enemy', 'enemy-strong', 'enemy-fast', 'enemy-shooter'];
  const type = types[Math.floor(Math.random() * types.length)];
  const enemy = document.createElement('div');
  enemy.classList.add(type);
  const svgMap = {
    'enemy': ENEMY_SVG,
    'enemy-strong': ENEMY_STRONG_SVG,
    'enemy-fast': ENEMY_FAST_SVG,
    'enemy-shooter': ENEMY_SHOOTER_SVG
  };
  enemy.appendChild(getSvgImage(type, svgMap[type]));
  enemy.style.left = `${window.innerWidth}px`;
  gameContainer.appendChild(enemy);
  enemy.style.top = `${Math.random() * (window.innerHeight - enemy.offsetHeight)}px`;

  let speedX = 3;
  let shootInterval = null;
  if (type === 'enemy-strong') {
    speedX = 2;
    shootInterval = setInterval(() => {
      spawnEnemyBullet(enemy.offsetLeft, enemy.offsetTop + enemy.offsetHeight / 2, 6);
    }, 1500);
  } else if (type === 'enemy-fast') {
    speedX = 6;
    enemy.dataset.vy = '3';
  } else if (type === 'enemy-shooter') {
    speedX = 2;
    shootInterval = setInterval(() => {
      spawnEnemyBullet(enemy.offsetLeft, enemy.offsetTop + enemy.offsetHeight / 2, 8);
    }, 1000);
  }
  if (shootInterval) enemy.shootInterval = shootInterval;

  const moveInterval = setInterval(() => {
    const currentLeft = parseInt(enemy.style.left, 10);
    if (gameOver || currentLeft < -enemy.offsetWidth) {
      enemy.remove();
      clearInterval(moveInterval);
      if (shootInterval) clearInterval(shootInterval);
    } else {
      enemy.style.left = `${currentLeft - speedX}px`;
      if (enemy.dataset.vy) {
        let vy = parseInt(enemy.dataset.vy, 10);
        let newTop = parseInt(enemy.style.top, 10) + vy;
        if (newTop <= 0 || newTop >= window.innerHeight - enemy.offsetHeight) {
          vy = -vy;
          enemy.dataset.vy = vy.toString();
          newTop = parseInt(enemy.style.top, 10) + vy;
        }
        enemy.style.top = `${newTop}px`;
      }
      checkPlayerCollision(enemy, moveInterval);
    }
  }, 20);
  setTimeout(spawnEnemy, enemySpawnInterval);
}

// ==== 弾と敵の衝突判定 ====
function checkBulletCollision(bullet, interval, type) {
  const enemies = document.querySelectorAll('.enemy, .enemy-strong, .enemy-fast, .enemy-shooter');
  const bulletRect = bullet.getBoundingClientRect();

  enemies.forEach(enemy => {
    const enemyRect = enemy.getBoundingClientRect();
    if (
      bulletRect.left < enemyRect.right &&
      bulletRect.right > enemyRect.left &&
      bulletRect.top < enemyRect.bottom &&
      bulletRect.bottom > enemyRect.top
    ) {
      createExplosion(enemy.offsetLeft, enemy.offsetTop);
      if (enemy.shootInterval) clearInterval(enemy.shootInterval);
      enemy.remove();
      const points = enemy.classList.contains('enemy-strong') || enemy.classList.contains('enemy-shooter')
        ? 200
        : enemy.classList.contains('enemy-fast')
          ? 150
          : 100;
      updateScore(points);
      enemiesDestroyed++;
      checkStageProgress();
      if (type !== 'beam') {
        bullet.remove();
        clearInterval(interval);
      }
    }
  });
}

// ==== 自機と敵の衝突 ====
function checkPlayerCollision(enemy, interval) {
  const playerRect = player.getBoundingClientRect();
  const enemyRect = enemy.getBoundingClientRect();

  if (
    playerRect.left < enemyRect.right &&
    playerRect.right > enemyRect.left &&
    playerRect.top < enemyRect.bottom &&
    playerRect.bottom > enemyRect.top
  ) {
    createExplosion(enemy.offsetLeft, enemy.offsetTop);
    if (enemy.shootInterval) clearInterval(enemy.shootInterval);
    enemy.remove();
    clearInterval(interval);
    if (barrierHits > 0) {
      barrierHits--;
      if (barrierHits <= 0) {
        const b = player.querySelector('.barrier');
        if (b) b.remove();
      }
    } else {
      createExplosion(player.offsetLeft, player.offsetTop);
      endGame();
    }
  }
}

// ==== アイテム関連 ====
function spawnItem() {
  if (gameOver) return;
  const item = document.createElement('div');
  item.classList.add('item');
  item.style.left = `${window.innerWidth}px`;
  item.appendChild(getSvgImage('item', ITEM_SVG));
  gameContainer.appendChild(item);
  item.style.top = `${Math.random() * (window.innerHeight - item.offsetHeight)}px`;
  const move = setInterval(() => {
    const currentLeft = parseInt(item.style.left, 10);
    if (gameOver || currentLeft < -item.offsetWidth) {
      item.remove();
      clearInterval(move);
    } else {
      item.style.left = `${currentLeft - 3}px`;
      checkItemCollision(item, move);
    }
  }, 20);
  setTimeout(spawnItem, 15000);
}

function checkItemCollision(item, interval) {
  const playerRect = player.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  if (
    playerRect.left < itemRect.right &&
    playerRect.right > itemRect.left &&
    playerRect.top < itemRect.bottom &&
    playerRect.bottom > itemRect.top
  ) {
    item.remove();
    clearInterval(interval);
    upgradePower();
  }
}

function upgradePower() {
  if (powerLevel < 5) powerLevel++;
  if (powerLevel === 5) activateBarrier();
}

function activateBarrier() {
  if (player.querySelector('.barrier')) return;
  const b = document.createElement('div');
  b.classList.add('barrier');
  player.appendChild(b);
  barrierHits = 3;
}

function findNearestEnemy(x, y) {
  const enemies = document.querySelectorAll('.enemy, .enemy-strong, .enemy-fast, .enemy-shooter');
  let nearest = null;
  let dist = Infinity;
  enemies.forEach(enemy => {
    const rect = enemy.getBoundingClientRect();
    const dx = rect.left - x;
    const dy = rect.top + rect.height / 2 - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < dist) {
      dist = d;
      nearest = enemy;
    }
  });
  return nearest;
}

function checkStageProgress() {
  if (enemiesDestroyed >= stage * 10) {
    stage++;
    stageDisplay.textContent = `Stage: ${stage}`;
    enemySpawnInterval = Math.max(500, enemySpawnInterval - 300);
  }
}

// ==== 爆発 ====
function createExplosion(x, y) {
  const exp = document.createElement('div');
  exp.classList.add('explosion');
  exp.style.left = `${x}px`;
  exp.style.top = `${y}px`;
  gameContainer.appendChild(exp);
  setTimeout(() => exp.remove(), 300);
}

// ==== スコア加算 ====
function updateScore(amount) {
  score += amount;
  scoreDisplay.textContent = `Score: ${score}`;
}

// ==== ゲームオーバー ====
function endGame() {
  gameOver = true;
  gameOverDisplay.style.display = 'block';
  bgm.pause();
}

// ==== メインループ ====
function gameLoop() {
  if (!gameOver) {
    movePlayer();
    requestAnimationFrame(gameLoop);
  }
}
