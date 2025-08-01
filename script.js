const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
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

let playerY = window.innerHeight / 2;
const speed = 5;
let keys = {};
let score = 0;
let gameOver = false;
let touchStartY = 0;

// ==== ゲーム開始 ====
startButton.addEventListener('click', () => {
  startScreen.style.display = 'none';
  gameContainer.style.display = 'block';
  player.appendChild(getSvgImage('player', PLAYER_SVG));
  bgm.play();
  gameLoop();
  setInterval(spawnEnemy, 2000);
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
  const bullet = document.createElement('div');
  bullet.classList.add(type === 'strong' ? 'bullet-strong' : 'bullet');
  bullet.style.left = `${player.offsetLeft + player.offsetWidth}px`;
  bullet.style.top = `${player.offsetTop + player.offsetHeight / 2 - 2}px`;
  gameContainer.appendChild(bullet);

  const interval = setInterval(() => {
    const currentLeft = parseInt(bullet.style.left, 10);
    if (currentLeft > window.innerWidth) {
      bullet.remove();
      clearInterval(interval);
    } else {
      bullet.style.left = `${currentLeft + (type === 'strong' ? 10 : 8)}px`;
      checkBulletCollision(bullet, interval, type);
    }
  }, 16);
}

// ==== 敵生成（2種類） ====
function spawnEnemy() {
  if (gameOver) return;
  const type = Math.random() < 0.5 ? 'enemy' : 'enemy-strong';
  const enemy = document.createElement('div');
  enemy.classList.add(type);
  enemy.appendChild(
    getSvgImage(
      type,
      type === 'enemy' ? ENEMY_SVG : ENEMY_STRONG_SVG
    )
  );
  const enemyY = Math.random() * (window.innerHeight - 50);
  enemy.style.left = `${window.innerWidth}px`;
  enemy.style.top = `${enemyY}px`;
  gameContainer.appendChild(enemy);

  const moveInterval = setInterval(() => {
    const currentLeft = parseInt(enemy.style.left, 10);
    if (gameOver || currentLeft < -50) {
      enemy.remove();
      clearInterval(moveInterval);
    } else {
      enemy.style.left = `${currentLeft - 3}px`;
      checkPlayerCollision(enemy, moveInterval);
    }
  }, 20);
}

// ==== 弾と敵の衝突判定 ====
function checkBulletCollision(bullet, interval, type) {
  const enemies = document.querySelectorAll('.enemy, .enemy-strong');
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
      if (type !== 'strong') bullet.remove();
      enemy.remove();
      clearInterval(interval);
      updateScore(enemy.classList.contains('enemy-strong') ? 200 : 100);
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
    createExplosion(player.offsetLeft, player.offsetTop);
    endGame();
    clearInterval(interval);
    enemy.remove();
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
