const player = document.getElementById('player');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const gameOverDisplay = document.getElementById('game-over');
const bgm = document.getElementById('bgm');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

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
  touchStartY = e.touches[0].clientY;
});
gameContainer.addEventListener('touchmove', (e) => {
  const currentY = e.touches[0].clientY;
  const delta = currentY - touchStartY;
  playerY += delta;
  playerY = Math.max(0, Math.min(window.innerHeight - 40, playerY));
  player.style.top = `${playerY}px`;
  touchStartY = currentY;
});
gameContainer.addEventListener('touchend', () => {
  shoot('normal');
});

// ==== 自機移動 ====
function movePlayer() {
  if (keys['ArrowUp']) playerY -= speed;
  if (keys['ArrowDown']) playerY += speed;
  playerY = Math.max(0, Math.min(window.innerHeight - 40, playerY));
  player.style.top = `${playerY}px`;
}

// ==== 弾発射（種類指定） ====
function shoot(type = 'normal') {
  const bullet = document.createElement('div');
  bullet.classList.add(type === 'strong' ? 'bullet-strong' : 'bullet');
  bullet.style.left = `${player.offsetLeft + 60}px`;
  bullet.style.top = `${player.offsetTop + 18}px`;
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
