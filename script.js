const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const moneyDisplay = document.getElementById('money');
const levelDisplay = document.getElementById('level');
const playerHealthBar = document.getElementById('playerHealthBar');
const playerHealthValue = document.getElementById('playerHealthValue');

const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

const levelStartScreen = document.getElementById('levelStartScreen');
const currentLevelDisplay = document.getElementById('currentLevelDisplay');
const startLevelButton = document.getElementById('startLevelButton');

const showShopButton = document.getElementById('showShop');
const showUpgradesButton = document.getElementById('showUpgrades');
const shopElement = document.getElementById('shop');
const upgradesElement = document.getElementById('upgrades');
const closeShopButton = document.getElementById('closeShop');
const closeUpgradesButton = document.getElementById('closeUpgrades');
const weaponListElement = document.getElementById('weaponList');
const upgradeListElement = document.getElementById('upgradeList');

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const groundLevel = canvasHeight - 30; // 地面高度

let time = 120;
let score = 0;
let money = 100;
let currentLevel = 1;
let gameInterval;
let animationFrameId;
let isGamePaused = true; // 遊戲開始時暫停，等待按下開始按鈕

const GRAVITY = 0.6;
const JUMP_FORCE = -12;

// 玩家 (火柴人)
const player = {
    x: canvasWidth / 2,
    y: groundLevel,
    width: 15, // 身體寬度
    height: 50, // 身體高度
    headRadius: 10,
    color: '#00ff00', // 亮綠色
    speed: 4,
    dx: 0,
    velocityY: 0,
    isJumping: false,
    maxHealth: 100,
    health: 100,
    isAlive: true,
    facingDirection: 1, // 1: 右, -1: 左
    weapon: {
        name: "手槍",
        damage: 10,
        fireRate: 400, // ms
        bulletSpeed: 10,
        lastShotTime: 0,
        muzzleFlashDuration: 50, // ms
        muzzleFlashActive: false,
        muzzleFlashEndTime: 0
    }
};

// 粒子效果
let particles = [];
class Particle {
    constructor(x, y, color, size, speedX, speedY, lifetime) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.speedX = speedX;
        this.speedY = speedY;
        this.lifetime = lifetime;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.lifetime--;
        this.alpha = this.lifetime / 100; // 假設初始lifetime為100，逐漸消失
        if (this.lifetime <= 0) {
            this.alpha = 0;
        }
    }
}

function createExplosion(x, y, color = 'orange', count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const speedX = Math.cos(angle) * speed;
        const speedY = Math.sin(angle) * speed;
        const size = Math.random() * 3 + 1;
        const lifetime = Math.random() * 60 + 40; // 粒子壽命
        particles.push(new Particle(x, y, color, size, speedX, speedY, lifetime));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => p.draw());
}


// 敵人類別
class Enemy {
    constructor(x, y, speed, health, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 45;
        this.headRadius = 9;
        this.color = type === 'elite' ? '#ff4500' : '#ff0000'; // 精英怪橘紅色
        this.speed = type === 'elite' ? speed * 1.2 : speed;
        this.maxHealth = type === 'elite' ? health * 2 : health;
        this.health = this.maxHealth;
        this.isAlive = true;
        this.type = type;
    }

    draw() {
        if (!this.isAlive) return;
        drawStickman(this.x, this.y, this.width, this.height, this.headRadius, this.color, this.health / this.maxHealth);
    }

    update() {
        if (!this.isAlive) return;

        // 簡單追蹤
        if (this.x < player.x) {
            this.x += this.speed;
        } else if (this.x > player.x) {
            this.x -= this.speed;
        }

        // 避免超出邊界
        if (this.x - this.width / 2 < 0) this.x = this.width / 2;
        if (this.x + this.width / 2 > canvasWidth) this.x = canvasWidth - this.width / 2;
    }

    checkCollisionWithPlayer() {
        if (!this.isAlive || !player.isAlive) return false;
        // 簡化碰撞檢測 (頭部和身體)
        const dist = Math.hypot(this.x - player.x, (this.y - this.height / 2) - (player.y - player.height / 2));
        return dist < this.width / 2 + player.width / 2 + this.headRadius + player.headRadius - 20; // 調整碰撞距離
    }
}

// 子彈類別
class Bullet {
    constructor(x, y, dx, dy, speed, damage, color = '#00BFFF') { // DeepSkyBlue
        this.x = x;
        this.y = y;
        this.width = dx !== 0 ? 10 : 5; // 水平子彈寬，垂直子彈窄 (如果以後有垂直射擊)
        this.height = dx !== 0 ? 5 : 10;
        this.dx_direction = dx; // 水平方向
        this.dy_direction = dy; // 垂直方向 (用於散射等)
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.isActive = true;
    }

    draw() {
        if (!this.isActive) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (!this.isActive) return;
        this.x += this.dx_direction * this.speed;
        this.y += this.dy_direction * this.speed; // 應用垂直分量

        if (this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight) {
            this.isActive = false;
        }
    }

    checkCollisionWithEnemy(enemy) {
        if (!this.isActive || !enemy.isAlive) return false;
        const dist = Math.hypot(this.x - enemy.x, this.y - (enemy.y - enemy.height / 2));
        return dist < this.width / 2 + enemy.width / 2 + enemy.headRadius - 10; // 調整碰撞
    }
}

let enemies = [];
let bullets = [];

// 武器列表
const weapons = [
    {
        name: "散彈槍",
        damage: 15, // 每顆彈丸傷害
        fireRate: 900,
        bulletSpeed: 12,
        cost: 250,
        pellets: 5, // 彈丸數量
        spreadAngle: 0.3, // 散射角度 (弧度)
        description: "近距離威力巨大，一次發射5顆彈丸。"
    },
    {
        name: "衝鋒槍",
        damage: 7,
        fireRate: 100,
        bulletSpeed: 14,
        cost: 400,
        description: "射速極快，持續火力壓制。"
    },
    {
        name: "狙擊槍",
        damage: 60,
        fireRate: 1800,
        bulletSpeed: 25,
        cost: 600,
        description: "穿透力強，單發高傷害，射速慢。"
    }
];
// 升級選項列表
const upgrades = [
    {
        name: "最大生命值 +50",
        cost: 150,
        effect: () => { player.maxHealth += 50; player.health = player.maxHealth; updatePlayerHealthUI();},
        description: "永久提升50點最大生命值並回滿。"
    },
    {
        name: "移動速度 +0.5",
        cost: 200,
        effect: () => { player.speed += 0.5; },
        description: "永久提升移動速度。"
    },
    {
        name: "武器傷害 +15%",
        cost: 300,
        effect: () => {
            if (player.weapon) {
                player.weapon.damage = Math.ceil(player.weapon.damage * 1.15);
            }
        },
        description: "提升當前武器基礎傷害15%。"
    },
    {
        name: "射速提升 10%",
        cost: 250,
        effect: () => {
            if (player.weapon && player.weapon.fireRate > 50) { // 避免射速過快
                player.weapon.fireRate = Math.max(50, Math.floor(player.weapon.fireRate * 0.9));
            }
        },
        description: "提升當前武器射速10% (減少射擊間隔)。"
    }
];

// 繪製通用火柴人 (含血條)
function drawStickman(x, y, bodyWidth, bodyHeight, headRadius, color, healthPercent = 1) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    // 頭
    ctx.beginPath();
    ctx.arc(x, y - bodyHeight - headRadius, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // 身體
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight);
    ctx.lineTo(x, y);
    ctx.stroke();

    // 手臂 (簡單示意)
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x - bodyWidth * 1.5, y - bodyHeight * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x + bodyWidth * 1.5, y - bodyHeight * 0.5);
    ctx.stroke();

    // 腿 (簡單示意)
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - bodyWidth, y + bodyHeight * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + bodyWidth, y + bodyHeight * 0.4);
    ctx.stroke();

    // 敵人血條
    if (healthPercent < 1 && healthPercent > 0) {
        const barWidth = headRadius * 2.5;
        const barHeight = 5;
        const barX = x - barWidth / 2;
        const barY = y - bodyHeight - headRadius * 2 - barHeight - 2;
        ctx.fillStyle = '#555';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'red';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
}


// 繪製玩家
function drawPlayer() {
    if (!player.isAlive) return;
    drawStickman(player.x, player.y, player.width, player.height, player.headRadius, player.color);

    // 槍口火焰
    if (player.weapon.muzzleFlashActive) {
        const flashX = player.x + player.facingDirection * (player.width / 2 + player.headRadius + 5);
        const flashY = player.y - player.height * 0.6;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(flashX, flashY, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updatePlayerHealthUI() {
    const healthPercentage = (player.health / player.maxHealth) * 100;
    playerHealthBar.style.width = `${Math.max(0, healthPercentage)}%`;
    playerHealthValue.innerText = Math.max(0, player.health);
    if (player.health <= player.maxHealth * 0.3) {
        playerHealthBar.style.backgroundColor = '#dc3545'; // Red
    } else if (player.health <= player.maxHealth * 0.6) {
        playerHealthBar.style.backgroundColor = '#ffc107'; // Yellow
    } else {
        playerHealthBar.style.backgroundColor = '#4CAF50'; // Green
    }
}


// 產生敵人
function spawnEnemy() {
    let x, y;
    const side = Math.random();
    if (side < 0.4) { // 從左邊
        x = -30;
        y = groundLevel;
    } else if (side < 0.8) { // 從右邊
        x = canvasWidth + 30;
        y = groundLevel;
    } else { // 從上面掉落
        x = Math.random() * (canvasWidth - 80) + 40;
        y = -30;
    }

    const speed = 1 + currentLevel * 0.25;
    const health = 30 + currentLevel * 15;
    const type = Math.random() < 0.2 + currentLevel * 0.05 ? 'elite' : 'normal'; // 隨關卡增加精英怪機率

    const enemy = new Enemy(x, y, speed, health, type);
    enemies.push(enemy);

    // 測試用 - 確認敵人已生成
    console.log("敵人已生成:", enemy);
}

// 射擊函數
function shoot() {
    if (isGamePaused || !player.isAlive) return;
    const currentTime = Date.now();
    if (player.weapon && currentTime - player.weapon.lastShotTime > player.weapon.fireRate) {
        player.weapon.lastShotTime = currentTime;
        player.weapon.muzzleFlashActive = true;
        player.weapon.muzzleFlashEndTime = currentTime + player.weapon.muzzleFlashDuration;

        const bulletY = player.y - player.height * 0.6; // 從胸口高度發射

        if (player.weapon.name === "散彈槍" && player.weapon.pellets) {
            for (let i = 0; i < player.weapon.pellets; i++) {
                const angleOffset = (Math.random() - 0.5) * player.weapon.spreadAngle;
                const bulletX = player.x + player.facingDirection * (player.width / 2 + 5);
                const dirX = player.facingDirection; // 主要方向
                const dirY = Math.tan(angleOffset); // 根據角度計算的垂直偏移

                const newBullet = new Bullet(
                    bulletX,
                    bulletY,
                    dirX,
                    dirY,
                    player.weapon.bulletSpeed,
                    player.weapon.damage
                );
                bullets.push(newBullet);
            }
        } else {
            const bulletX = player.x + player.facingDirection * (player.width / 2 + player.headRadius + 5);
            const newBullet = new Bullet(
                bulletX,
                bulletY,
                player.facingDirection,
                0, // 直線射擊
                player.weapon.bulletSpeed,
                player.weapon.damage
            );
            bullets.push(newBullet);
        }
        // 播放音效 (如果有的話)
    }
}

// 更新所有敵人
function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.update();
        // 敵人掉落到地面
        if (enemy.y < groundLevel && enemy.type === 'normal' || enemy.y < groundLevel && enemy.type === 'elite' && Math.random() > 0.1) { // 精英怪可能浮空一會
            enemy.y += GRAVITY * 2; // 敵人下落快一點
            if (enemy.y > groundLevel) enemy.y = groundLevel;
        }


        if (enemy.checkCollisionWithPlayer()) {
            player.health -= (enemy.type === 'elite' ? 20 : 10); // 精英怪傷害更高
            updatePlayerHealthUI();
            createExplosion(enemy.x, enemy.y - enemy.height/2, 'red', 5); // 碰撞特效
            if (player.health <= 0) {
                player.isAlive = false;
            }
            enemy.isAlive = false; // 敵人撞到玩家後也死亡
            createExplosion(enemy.x, enemy.y - enemy.height/2, enemy.color, 15);
        }
    });
    enemies = enemies.filter(enemy => enemy.isAlive);
}

// 更新所有子彈
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.checkCollisionWithEnemy(enemy)) {
                enemy.health -= bullet.damage;
                bullet.isActive = false;
                createExplosion(bullet.x, bullet.y, 'yellow', 3); // 子彈擊中特效

                if (enemy.health <= 0) {
                    enemy.isAlive = false;
                    score += (enemy.type === 'elite' ? 50 : 15);
                    money += (enemy.type === 'elite' ? 15 : 8);
                    scoreDisplay.innerText = score;
                    moneyDisplay.innerText = money;
                    createExplosion(enemy.x, enemy.y - enemy.height/2, enemy.color, enemy.type === 'elite' ? 25 : 15);
                }
                break; // 子彈只擊中一個目標
            }
        }
        if (!bullet.isActive) {
            bullets.splice(i, 1);
        }
    }
}

// 清除畫布並繪製背景
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, "#2c3e50"); // 深藍
    gradient.addColorStop(1, "#34495e"); // 較淺的深藍
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 繪製地面
    ctx.fillStyle = "#27ae60"; // 綠色地面
    ctx.fillRect(0, groundLevel, canvasWidth, canvasHeight - groundLevel);
}

// 更新玩家位置
function updatePlayerPosition() {
    // 水平移動
    player.x += player.dx;

    // 跳躍邏輯
    if (player.isJumping) {
        player.y += player.velocityY;
        player.velocityY += GRAVITY;
        if (player.y >= groundLevel) {
            player.y = groundLevel;
            player.isJumping = false;
            player.velocityY = 0;
        }
    }

    // 邊界檢測
    if (player.x - player.width / 2 < 0) player.x = player.width / 2;
    if (player.x + player.width / 2 + player.headRadius > canvasWidth) player.x = canvasWidth - player.width / 2 - player.headRadius;
}

// 鍵盤事件
function handleKeyDown(e) {
    // 測試用 - 顯示按鍵和遊戲狀態
    console.log("按下按鍵:", e.key, "遊戲暫停:", isGamePaused);

    // 如果遊戲暫停但不是因為開始畫面，則不處理按鍵
    if (isGamePaused && levelStartScreen.style.display !== 'block') {
        // 允許在暫停時按下 Enter 或 空格來開始遊戲
        if (e.key === 'Enter' || e.code === 'Space') {
            if (levelStartScreen.style.display === 'block') {
                startLevelButton.click(); // 觸發 "開始" 按鈕
            }
        }
        return;
    }

    // 如果商店或升級選單打開，不處理遊戲控制按鍵
    if (shopElement.style.display === 'block' || upgradesElement.style.display === 'block') {
        return;
    }

    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        player.dx = player.speed;
        player.facingDirection = 1;
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        player.dx = -player.speed;
        player.facingDirection = -1;
    } else if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !player.isJumping) {
        player.isJumping = true;
        player.velocityY = JUMP_FORCE;
    } else if (e.key === ' ' || e.key.toLowerCase() === 'k') { // 空格或 K 射擊
        shoot();
    } else if (e.key === 'Enter') {
        // 在開始畫面按下 Enter 直接開始遊戲
        if (levelStartScreen.style.display === 'block') {
            startLevelButton.click(); // 觸發 "開始" 按鈕
        }
    }
}

function handleKeyUp(e) {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        if (player.dx > 0) player.dx = 0; // 只有當前向右移動時才停止
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        if (player.dx < 0) player.dx = 0; // 只有當前向左移動時才停止
    }
}

// 重新綁定鍵盤事件
document.removeEventListener('keydown', handleKeyDown);
document.removeEventListener('keyup', handleKeyUp);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

// 遊戲主循環
function gameLoop() {
    // 測試用 - 顯示遊戲狀態
    console.log("遊戲循環運行中, 暫停狀態:", isGamePaused);

    if (!player.isAlive) {
        if (gameOverScreen.style.display === 'none') {
            gameOver();
        }
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    if (isGamePaused) {
        // 即使暫停也保持循環以偵聽開始
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    const currentTime = Date.now();
    if (player.weapon.muzzleFlashActive && currentTime > player.weapon.muzzleFlashEndTime) {
        player.weapon.muzzleFlashActive = false;
    }

    drawBackground(); // 先畫背景
    updatePlayerPosition();
    updateEnemies();
    updateBullets();
    updateParticles();

    drawPlayer();
    drawEnemies();
    drawBullets();
    drawParticles();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 控制敵人生成
let enemySpawnInterval;
function startEnemySpawn() {
    // 清除舊的計時器
    if (enemySpawnInterval) {
        clearInterval(enemySpawnInterval);
    }

    // 立即生成一個敵人，確保有敵人出現
    if (!isGamePaused && player.isAlive) {
        spawnEnemy();
    }

    // 設置新的計時器，定期生成敵人
    enemySpawnInterval = setInterval(() => {
        if (isGamePaused || !player.isAlive) return;

        // 隨關卡增加敵人生成數量和頻率上限
        const maxEnemies = 5 + currentLevel * 2;
        if (enemies.length < maxEnemies) {
            spawnEnemy();
        }
    }, 1000); // 每秒生成一個敵人，比原來更頻繁
}

function stopEnemySpawn() {
    if (enemySpawnInterval) {
        clearInterval(enemySpawnInterval);
        enemySpawnInterval = null;
    }
}

// 商店和升級UI邏輯
showShopButton.addEventListener('click', () => {
    isGamePaused = true; // 打開商店時暫停遊戲
    shopElement.style.display = 'block';
    weaponListElement.innerHTML = "";
    weapons.forEach(weapon => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${weapon.name}</strong> - <span class="cost">價格：${weapon.cost}</span>
            <span class="description">${weapon.description}</span>
            <button class="buyButton" data-weapon-name='${weapon.name}'>購買</button>`;
        weaponListElement.appendChild(listItem);
    });

    // 使用事件委託來處理按鈕點擊
    weaponListElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('buyButton')) {
            const weaponName = e.target.dataset.weaponName;
            const selectedWeapon = weapons.find(w => w.name === weaponName);
            if (selectedWeapon) buyWeapon(selectedWeapon);
        }
    });
});

showUpgradesButton.addEventListener('click', () => {
    isGamePaused = true; // 打開升級時暫停遊戲
    upgradesElement.style.display = 'block';
    upgradeListElement.innerHTML = "";
    upgrades.forEach(upgrade => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>${upgrade.name}</strong> - <span class="cost">價格：${upgrade.cost}</span>
            <span class="description">${upgrade.description}</span>
            <button class="upgradeButton" data-upgrade-name='${upgrade.name}'>購買</button>`;
        upgradeListElement.appendChild(listItem);
    });

    // 使用事件委託來處理按鈕點擊
    upgradeListElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('upgradeButton')) {
            const upgradeName = e.target.dataset.upgradeName;
            const selectedUpgrade = upgrades.find(u => u.name === upgradeName);
            if (selectedUpgrade) buyUpgrade(selectedUpgrade);
        }
    });
});

closeShopButton.addEventListener('click', () => {
    shopElement.style.display = 'none';
    isGamePaused = false; // 關閉商店時繼續遊戲
    console.log("關閉商店，遊戲繼續");
});

closeUpgradesButton.addEventListener('click', () => {
    upgradesElement.style.display = 'none';
    isGamePaused = false; // 關閉升級時繼續遊戲
    console.log("關閉升級，遊戲繼續");
});

function buyWeapon(weaponToBuy) { // 參數名修改以避免與全局變量衝突
    if (money >= weaponToBuy.cost) {
        money -= weaponToBuy.cost;
        moneyDisplay.innerText = money;
        player.weapon = { ...weaponToBuy, lastShotTime: 0, muzzleFlashActive: false, muzzleFlashEndTime: 0 }; // 複製武器屬性並重置狀態
        alert(`已購買 ${weaponToBuy.name}！`);
    } else {
        alert("金錢不足！");
    }
}

function buyUpgrade(upgradeToBuy) {
    if (money >= upgradeToBuy.cost) {
        money -= upgradeToBuy.cost;
        moneyDisplay.innerText = money;
        upgradeToBuy.effect();
        alert(`已購買 ${upgradeToBuy.name}！`);
        // 可能需要更新UI，例如血條
        updatePlayerHealthUI();
    } else {
        alert("金錢不足！");
    }
}

// 計時器與關卡邏輯
function updateTimer() {
    if (isGamePaused || !player.isAlive) return;
    time--;
    timeDisplay.innerText = time;

    if (time <= 0) {
        clearInterval(gameInterval);
        if (player.isAlive) {
            levelComplete();
        } else {
            // gameOver() 會在 gameLoop 中被調用
        }
    }
}

function showLevelStartScreen() {
    isGamePaused = true;
    levelStartScreen.style.display = 'block';
    currentLevelDisplay.innerText = currentLevel; // 確保顯示正確的關卡數
    // 停止敵人生成和計時器，直到玩家點擊開始
    stopEnemySpawn();
    clearInterval(gameInterval);

    // 確保遊戲循環運行
    if (!animationFrameId) {
        gameLoop();
    }
}

startLevelButton.addEventListener('click', () => {
    console.log("開始按鈕被點擊");
    levelStartScreen.style.display = 'none';
    isGamePaused = false; // 關鍵：解除暫停狀態
    startGameplayForLevel();
});

function startGameplayForLevel() {
    console.log("開始關卡", currentLevel);
    time = 120; // 每關重置時間
    timeDisplay.innerText = time;
    player.x = canvasWidth / 2; // 重置玩家位置
    player.y = groundLevel;
    player.dx = 0;
    player.velocityY = 0;
    player.isJumping = false;
    player.health = player.maxHealth; // 關卡開始時回滿血
    player.weapon.lastShotTime = 0; // 確保射擊不延遲

    enemies = [];
    bullets = [];
    particles = [];

    levelDisplay.innerText = currentLevel;

    updatePlayerHealthUI(); // 更新血條

    clearInterval(gameInterval); // 清除舊的
    gameInterval = setInterval(updateTimer, 1000);

    // 確保敵人生成
    stopEnemySpawn();
    startEnemySpawn();

    // 確保遊戲循環運行
    if (!animationFrameId) {
        gameLoop();
    }

    // 確保遊戲未暫停
    isGamePaused = false;
    console.log("遊戲開始運行，暫停狀態:", isGamePaused);
}

function levelComplete() {
    isGamePaused = true;
    stopEnemySpawn();
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId); // 停止動畫

    score += time * 5 + currentLevel * 50; // 獎勵分數
    money += 100 + currentLevel * 50; // 獎勵金錢

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;

    alert(`關卡 ${currentLevel} 完成！\n剩餘時間獎勵：${time * 5}\n關卡獎勵：${currentLevel * 50}\n獲得金錢：${100 + currentLevel * 50}`);

    currentLevel++;
    if (currentLevel > 3) { // 假設總共3關
        alert("恭喜你！已通關所有關卡！最終分數：" + score);
        gameOverScreen.style.display = 'block'; // 或顯示通關畫面
        finalScoreDisplay.innerText = score;
        // resetGame(); // 可以選擇重置或停留在通關畫面
    } else {
        player.health = player.maxHealth; // 下一關回滿血
        showLevelStartScreen();
    }
}

function gameOver() {
    isGamePaused = true; // 確保遊戲主邏輯停止
    player.isAlive = false;
    stopEnemySpawn();
    clearInterval(gameInterval);
    // cancelAnimationFrame(animationFrameId); // gameLoop 內部會自己停止

    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
}

// 重置遊戲狀態 (用於重新開始)
function resetGame() {
    score = 0;
    money = 100; // 初始金錢
    currentLevel = 1;

    player.maxHealth = 100;
    player.health = player.maxHealth;
    player.isAlive = true;
    player.speed = 4;
    player.weapon = { // 重置為初始武器
        name: "手槍",
        damage: 10,
        fireRate: 400,
        bulletSpeed: 10,
        lastShotTime: 0,
        muzzleFlashDuration: 50,
        muzzleFlashActive: false,
        muzzleFlashEndTime: 0
    };

    scoreDisplay.innerText = score;
    moneyDisplay.innerText = money;
    levelDisplay.innerText = currentLevel;
    gameOverScreen.style.display = 'none';

    showLevelStartScreen(); // 重新開始時顯示第一關開始畫面
}

restartButton.addEventListener('click', () => {
    resetGame();
});

// 初始調用 - 確保遊戲開始
showLevelStartScreen(); // 遊戲開始時顯示第一關的開始畫面
gameLoop(); // 確保遊戲循環啟動
