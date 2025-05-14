const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const moneyDisplay = document.getElementById('money');
const levelDisplay = document.getElementById('level');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

let time = 120;
let score = 0;
let money = 100;
let level = 1;
let gameInterval;

function init() {
    time = 120;
    score = 0;
    money = 100;
    level = 1;
    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;
    levelDisplay.innerText = level;
    timeDisplay.innerText = time;
    gameOverScreen.style.display = 'none';

    gameInterval = setInterval(updateGame, 1000);
}

function updateGame() {
    time--;
    timeDisplay.innerText = time;

    if (time <= 0) {
        clearInterval(gameInterval);
        gameOver();
    }
}

function gameOver() {
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
}

restartButton.addEventListener('click', init);

init();
// (接續上一部分的 JavaScript 程式碼)

// 遊戲畫布尺寸
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// 玩家 (火柴人)
const player = {
    x: canvasWidth / 2,
    y: canvasHeight - 50, // 火柴人站在底部
    width: 20,
    height: 40,
    color: 'black',
    speed: 5,
    dx: 0, // 水平移動方向
    dy: 0, // 垂直移動方向 (暫時不用於基本移動，可用於跳躍等)
    health: 100,
    isAlive: true,
    weapon: null // 初始沒有武器
};

// 繪製火柴人
function drawPlayer() {
    if (!player.isAlive) return;

    ctx.fillStyle = player.color;

    // 身體
    ctx.fillRect(player.x - player.width / 2, player.y - player.height, player.width, player.height);

    // 頭部
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.height - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // (可以根據需要添加更精細的手臂和腿部)
}

// 清除畫布
function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

// 遊戲主循環 (更新遊戲狀態並重繪)
function gameLoop() {
    if (!player.isAlive) {
        gameOver();
        return;
    }

    clearCanvas();
    updatePlayerPosition();
    drawPlayer();

    // 這裡將來會添加繪製敵人、子彈等邏輯

    requestAnimationFrame(gameLoop); // 實現流暢動畫
}

// 更新玩家位置
function updatePlayerPosition() {
    player.x += player.dx;
    player.y += player.dy;

    // 邊界檢測，防止玩家移出畫布
    if (player.x - player.width / 2 < 0) {
        player.x = player.width / 2;
    }
    if (player.x + player.width / 2 > canvasWidth) {
        player.x = canvasWidth - player.width / 2;
    }
    // 暫時不處理垂直邊界，因為火柴人主要在地面移動
}

// 鍵盤事件監聽 (控制玩家移動)
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function handleKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'd') {
        player.dx = player.speed;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.dx = -player.speed;
    }
    // 可以添加 'ArrowUp' 或 'w' 來控制跳躍 (dy)
}

function handleKeyUp(e) {
    if (
        (e.key === 'ArrowRight' || e.key === 'd') ||
        (e.key === 'ArrowLeft' || e.key === 'a')
    ) {
        player.dx = 0;
    }
    // 處理跳躍鍵釋放
}


// (覆蓋之前的 init 和 updateGame，並整合 gameLoop)
function init() {
    time = 120;
    score = 0;
    // money = 100; // 保留之前的金錢，或者根據遊戲設計重置
    level = 1;
    player.x = canvasWidth / 2;
    player.y = canvasHeight - 50;
    player.health = 100;
    player.isAlive = true;
    player.dx = 0;
    player.dy = 0;

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money; // 更新顯示
    levelDisplay.innerText = level;
    timeDisplay.innerText = time;
    gameOverScreen.style.display = 'none';

    clearInterval(gameInterval); // 清除舊的計時器
    gameInterval = setInterval(updateTimer, 1000); // 僅用於更新計時器

    // 啟動遊戲主循環
    if (typeof animationFrameId !== 'undefined') {
        cancelAnimationFrame(animationFrameId); // 如果有舊的動畫幀，取消它
    }
    gameLoop(); // 啟動新的遊戲循環
}

let animationFrameId; // 用於儲存 requestAnimationFrame 的 ID

function updateTimer() { // 將原來的 updateGame 改名為 updateTimer，專門處理時間
    time--;
    timeDisplay.innerText = time;

    if (time <= 0) {
        clearInterval(gameInterval);
        // 玩家生存下來，進入結算
        if (player.isAlive) {
            levelComplete();
        } else {
            gameOver();
        }
    }
}

function levelComplete() {
    clearInterval(gameInterval); // 停止計時器
    cancelAnimationFrame(animationFrameId); // 停止遊戲循環

    // 結算分數和金錢
    score += time * 10; // 假設剩餘時間可以加分
    money += 50 + (level * 20); // 基礎獎勵 + 關卡獎勵

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;

    alert(`關卡 ${level} 完成！\n獲得分數：${score}\n獲得金錢：${money}`);

    level++;
    if (level > 3) {
        alert("恭喜你！已通關所有關卡！");
        // 可以顯示最終通關畫面或重置遊戲
        init(); // 暫時重置遊戲
    } else {
        // 準備下一關
        time = 120; // 重置時間
        player.x = canvasWidth / 2; // 重置玩家位置
        player.y = canvasHeight - 50;
        // 可以在這裡添加敵人重置等邏輯
        levelDisplay.innerText = level;
        timeDisplay.innerText = time;
        gameInterval = setInterval(updateTimer, 1000);
        gameLoop();
    }
}


function gameOver() {
    player.isAlive = false; // 確保玩家狀態正確
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId); // 確保遊戲循環停止
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
}

// 確保在 gameLoop 中正確使用 animationFrameId
function gameLoop() {
    if (!player.isAlive) {
        // 如果在 gameLoop 內部檢測到玩家死亡，且 gameOverScreen 未顯示，則調用 gameOver
        if (gameOverScreen.style.display === 'none') {
            gameOver();
        }
        return;
    }

    clearCanvas();
    updatePlayerPosition();
    drawPlayer();

    // 這裡將來會添加繪製敵人、子彈等邏輯

    animationFrameId = requestAnimationFrame(gameLoop); // 更新 ID
}


restartButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    init();
});

init(); // 遊戲開始時初始化
// (接續前面程式碼)

// 敵人類別
class Enemy {
    constructor(x, y, speed, health) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 40;
        this.color = 'red';
        this.speed = speed;
        this.health = health;
        this.isAlive = true;
    }

    // 繪製敵人（簡單火柴人造型）
    draw() {
        if (!this.isAlive) return;

        ctx.fillStyle = this.color;
        // 身體
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        // 頭部
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height - 10, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    // 更新敵人位置，向玩家移動
    update() {
        if (!this.isAlive) return;

        // 簡單的水平追蹤玩家
        if (this.x < player.x) {
            this.x += this.speed;
        } else if (this.x > player.x) {
            this.x -= this.speed;
        }

        // 可以加上下移動或跳躍等行為，這裡先不做

        // 邊界限制
        if (this.x - this.width / 2 < 0) this.x = this.width / 2;
        if (this.x + this.width / 2 > canvasWidth) this.x = canvasWidth - this.width / 2;
    }

    // 簡單碰撞檢測 (與玩家)
    checkCollisionWithPlayer() {
        if (!this.isAlive || !player.isAlive) return false;

        // 簡單矩形碰撞檢測
        const enemyLeft = this.x - this.width / 2;
        const enemyRight = this.x + this.width / 2;
        const enemyTop = this.y - this.height - 10; // 頭部頂部
        const enemyBottom = this.y;

        const playerLeft = player.x - player.width / 2;
        const playerRight = player.x + player.width / 2;
        const playerTop = player.y - player.height - 10;
        const playerBottom = player.y;

        const isColliding = !(enemyRight < playerLeft ||
            enemyLeft > playerRight ||
            enemyBottom < playerTop ||
            enemyTop > playerBottom);

        return isColliding;
    }
}

// 敵人陣列
let enemies = [];

// 產生敵人
function spawnEnemy() {
    // 敵人出現在畫布上方隨機x座標，y固定在地面高度
    const x = Math.random() * (canvasWidth - 40) + 20;
    const y = canvasHeight - 10; // 地面高度
    const speed = 1 + level * 0.3; // 隨關卡提升速度
    const health = 20 + level * 10;

    const enemy = new Enemy(x, y, speed, health);
    enemies.push(enemy);
}

// 控制敵人生成頻率
let enemySpawnInterval;
function startEnemySpawn() {
    enemySpawnInterval = setInterval(() => {
        if (enemies.length < level * 5) { // 每關最多敵人數量
            spawnEnemy();
        }
    }, 2000); // 每2秒產生一隻敵人
}

function stopEnemySpawn() {
    clearInterval(enemySpawnInterval);
}

// 更新所有敵人
function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.update();

        // 檢查是否碰撞玩家
        if (enemy.checkCollisionWithPlayer()) {
            // 玩家受傷
            player.health -= 10;
            if (player.health <= 0) {
                player.isAlive = false;
            }
            // 敵人死亡
            enemy.isAlive = false;
        }
    });

    // 移除死亡敵人
    enemies = enemies.filter(enemy => enemy.isAlive);
}

// 繪製所有敵人
function drawEnemies() {
    enemies.forEach(enemy => enemy.draw());
}

// 修改 gameLoop 加入敵人更新與繪製
function gameLoop() {
    if (!player.isAlive) {
        if (gameOverScreen.style.display === 'none') {
            gameOver();
        }
        return;
    }

    clearCanvas();
    updatePlayerPosition();
    drawPlayer();

    updateEnemies();
    drawEnemies();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 修改 init 加入敵人初始化與生成
function init() {
    time = 120;
    score = 0;
    // money = 100; // 保留金錢或重置
    player.x = canvasWidth / 2;
    player.y = canvasHeight - 50;
    player.health = 100;
    player.isAlive = true;
    player.dx = 0;
    player.dy = 0;

    enemies = []; // 清空敵人陣列

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;
    levelDisplay.innerText = level;
    timeDisplay.innerText = time;
    gameOverScreen.style.display = 'none';

    clearInterval(gameInterval);
    gameInterval = setInterval(updateTimer, 1000);

    stopEnemySpawn();
    startEnemySpawn();

    if (typeof animationFrameId !== 'undefined') {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

// 修改 levelComplete 和 gameOver 停止敵人生成
function levelComplete() {
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId);
    stopEnemySpawn();

    score += time * 10;
    money += 50 + (level * 20);

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;

    alert(`關卡 ${level} 完成！\n獲得分數：${score}\n獲得金錢：${money}`);

    level++;
    if (level > 3) {
        alert("恭喜你！已通關所有關卡！");
        init();
    } else {
        time = 120;
        player.x = canvasWidth / 2;
        player.y = canvasHeight - 50;
        enemies = [];
        levelDisplay.innerText = level;
        timeDisplay.innerText = time;
        gameInterval = setInterval(updateTimer, 1000);
        stopEnemySpawn();
        startEnemySpawn();
        gameLoop();
    }
}

function gameOver() {
    player.isAlive = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId);
    stopEnemySpawn();
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
}
