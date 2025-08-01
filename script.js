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
const PLAYER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
  <defs>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4facfe"/>
      <stop offset="100%" stop-color="#00f2fe"/>
    </linearGradient>
    <linearGradient id="wingGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#43e97b"/>
      <stop offset="100%" stop-color="#38f9d7"/>
    </linearGradient>
  </defs>
  <polygon points="60,5 85,40 60,75 35,40" fill="url(#bodyGrad)" stroke="#ffffff" stroke-width="2"/>
  <polygon points="5,33 60,23 115,33 115,47 60,57 5,47" fill="url(#wingGrad)" stroke="#ffffff" stroke-width="2"/>
  <ellipse cx="60" cy="40" rx="10" ry="14" fill="#ffffff" opacity="0.6" stroke="#ffffff" stroke-width="1"/>
  <polygon points="53,60 67,60 72,75 48,75" fill="url(#bodyGrad)" stroke="#ffffff" stroke-width="2"/>
</svg>`;
const ENEMY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
  <defs>
    <linearGradient id="enemyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff9a9e"/>
      <stop offset="100%" stop-color="#fad0c4"/>
    </linearGradient>
  </defs>
  <ellipse cx="30" cy="20" rx="28" ry="15" fill="url(#enemyGrad)"/>
  <circle cx="20" cy="20" r="4" fill="#2c3e50"/>
  <circle cx="40" cy="20" r="4" fill="#2c3e50"/>
</svg>`;
const ENEMY_STRONG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50">
  <defs>
    <linearGradient id="enemyStrongGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd200"/>
      <stop offset="100%" stop-color="#f7971e"/>
    </linearGradient>
  </defs>
  <ellipse cx="35" cy="25" rx="30" ry="18" fill="url(#enemyStrongGrad)"/>
  <rect x="20" y="12" width="30" height="26" fill="rgba(255,255,255,0.3)"/>
</svg>`;
const ENEMY_FAST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
  <defs>
    <linearGradient id="enemyFastGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff00cc"/>
      <stop offset="100%" stop-color="#333399"/>
    </linearGradient>
  </defs>
  <polygon points="30,5 55,20 30,35 5,20" fill="url(#enemyFastGrad)"/>
</svg>`;
const ENEMY_SHOOTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50">
  <defs>
    <linearGradient id="enemyShooterGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#84fab0"/>
      <stop offset="100%" stop-color="#8fd3f4"/>
    </linearGradient>
  </defs>
  <rect x="5" y="15" width="60" height="20" rx="5" fill="url(#enemyShooterGrad)"/>
  <circle cx="35" cy="25" r="7" fill="#34495e"/>
</svg>`;
const ITEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
  <defs>
    <radialGradient id="itemGrad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f5d142"/>
    </radialGradient>
  </defs>
  <polygon points="25,2 31,18 48,18 34,29 39,46 25,36 11,46 16,29 2,18 19,18" fill="url(#itemGrad)" stroke="#e67e22" stroke-width="2"/>
</svg>`;

let playerY = window.innerHeight / 2;
let playerX = 50;
const speed = 5;
let keys = {};
let score = 0;
let gameOver = false;
let touchStartY = 0;
let touchStartX = 0;
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
  player.style.transform = 'rotate(90deg)';
  playerY = (window.innerHeight - player.offsetHeight) / 2;
  playerX = 50;
  player.style.top = `${playerY}px`;
  player.style.left = `${playerX}px`;
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
  touchStartX = e.touches[0].clientX;
}, { passive: false });
gameContainer.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const currentY = e.touches[0].clientY;
  const currentX = e.touches[0].clientX;
  const deltaY = currentY - touchStartY;
  const deltaX = currentX - touchStartX;
  playerY += deltaY;
  playerX += deltaX;
  const playerHeight = player.offsetHeight;
  const playerWidth = player.offsetWidth;
  playerY = Math.max(0, Math.min(window.innerHeight - playerHeight, playerY));
  playerX = Math.max(0, Math.min(window.innerWidth - playerWidth, playerX));
  player.style.top = `${playerY}px`;
  player.style.left = `${playerX}px`;
  touchStartY = currentY;
  touchStartX = currentX;
}, { passive: false });
gameContainer.addEventListener('touchend', (e) => {
  e.preventDefault();
  shoot('normal');
}, { passive: false });

// ==== 自機移動 ====
function movePlayer() {
  if (keys['ArrowUp']) playerY -= speed;
  if (keys['ArrowDown']) playerY += speed;
  if (keys['ArrowLeft']) playerX -= speed;
  if (keys['ArrowRight']) playerX += speed;
  const playerHeight = player.offsetHeight;
  const playerWidth = player.offsetWidth;
  playerY = Math.max(0, Math.min(window.innerHeight - playerHeight, playerY));
  playerX = Math.max(0, Math.min(window.innerWidth - playerWidth, playerX));
  player.style.top = `${playerY}px`;
  player.style.left = `${playerX}px`;
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
  bullet.style.left = `${player.offsetLeft + player.offsetWidth - 50}px`;
  gameContainer.appendChild(bullet);
  bullet.style.top = `${centerY - bullet.offsetHeight / 2}px`;
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
  beam.style.left = `${player.offsetLeft + player.offsetWidth - 50}px`;
  gameContainer.appendChild(beam);
  beam.style.top = `${player.offsetTop + player.offsetHeight / 2 - beam.offsetHeight / 2}px`;
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
  bullet.style.left = `${player.offsetLeft + player.offsetWidth - 50}px`;
  gameContainer.appendChild(bullet);
  bullet.style.top = `${player.offsetTop + player.offsetHeight / 2 - bullet.offsetHeight / 2}px`;
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
  gameContainer.appendChild(bullet);
  bullet.style.top = `${y - bullet.offsetHeight / 2}px`;
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
  const amplitude = 20 + Math.random() * 40;
  const baseTop = amplitude + Math.random() * (window.innerHeight - enemy.offsetHeight - amplitude * 2);
  enemy.style.top = `${baseTop}px`;
  enemy.dataset.baseTop = baseTop.toString();
  enemy.dataset.angle = '0';
  enemy.dataset.amp = amplitude.toString();
  enemy.dataset.freq = (0.05 + Math.random() * 0.05).toString();

  let speedX = 3;
  let shootInterval = null;
  if (type === 'enemy-strong') {
    speedX = 2;
    shootInterval = setInterval(() => {
      spawnEnemyBullet(enemy.offsetLeft, enemy.offsetTop + enemy.offsetHeight / 2, 6);
    }, 1500);
  } else if (type === 'enemy-fast') {
    speedX = 6;
    enemy.dataset.freq = (0.15 + Math.random() * 0.05).toString();
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
      let angle = parseFloat(enemy.dataset.angle);
      angle += parseFloat(enemy.dataset.freq);
      enemy.dataset.angle = angle.toString();
      const baseY = parseFloat(enemy.dataset.baseTop);
      const amp = parseFloat(enemy.dataset.amp);
      enemy.style.top = `${baseY + Math.sin(angle) * amp}px`;
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
