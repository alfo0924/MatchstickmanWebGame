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
const groundLevel = canvasHeight - 30;

let time = 120;
let score = 0;
let money = 100;
let currentLevel = 1;
let gameInterval;
let animationFrameId;
let isGamePaused = true; // 初始為暫停狀態

const GRAVITY = 0.6;
const JUMP_FORCE = -12;

const player = {
    x: canvasWidth / 2,
    y: groundLevel,
    width: 15,
    height: 50,
    headRadius: 10,
    color: '#00ff00',
    speed: 4,
    dx: 0,
    velocityY: 0,
    isJumping: false,
    maxHealth: 100,
    health: 100,
    isAlive: true,
    facingDirection: 1,
    weapon: {
        name: "手槍",
        damage: 10,
        fireRate: 400,
        bulletSpeed: 10,
        lastShotTime: 0,
        muzzleFlashDuration: 50,
        muzzleFlashActive: false,
        muzzleFlashEndTime: 0
    }
};

let particles = [];
class Particle {
    constructor(x, y, color, size, speedX, speedY, lifetime) {
        this.x = x; this.y = y; this.color = color; this.size = size;
        this.speedX = speedX; this.speedY = speedY; this.lifetime = lifetime; this.alpha = 1;
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    update() {
        this.x += this.speedX; this.y += this.speedY; this.lifetime--;
        this.alpha = Math.max(0, this.lifetime / 100);
    }
}

function createExplosion(x, y, color = 'orange', count = 10) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 3 + 1;
        const speedX = Math.cos(angle) * speed; const speedY = Math.sin(angle) * speed;
        const size = Math.random() * 3 + 1; const lifetime = Math.random() * 60 + 40;
        particles.push(new Particle(x, y, color, size, speedX, speedY, lifetime));
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
}
function drawParticles() { particles.forEach(p => p.draw()); }

class Enemy {
    constructor(x, y, speed, health, type = 'normal') {
        this.x = x; this.y = y; this.width = 12; this.height = 45; this.headRadius = 9;
        this.color = type === 'elite' ? '#ff4500' : '#ff0000';
        this.speed = type === 'elite' ? speed * 1.2 : speed;
        this.maxHealth = type === 'elite' ? health * 2 : health; this.health = this.maxHealth;
        this.isAlive = true; this.type = type;
    }
    draw() {
        if (!this.isAlive) return;
        drawStickman(this.x, this.y, this.width, this.height, this.headRadius, this.color, this.health / this.maxHealth);
    }
    update() {
        if (!this.isAlive) return;
        if (this.x < player.x) this.x += this.speed; else if (this.x > player.x) this.x -= this.speed;
        if (this.x - this.width / 2 < 0) this.x = this.width / 2;
        if (this.x + this.width / 2 > canvasWidth) this.x = canvasWidth - this.width / 2;
    }
    checkCollisionWithPlayer() {
        if (!this.isAlive || !player.isAlive) return false;
        const dist = Math.hypot(this.x - player.x, (this.y - this.height / 2) - (player.y - player.height / 2));
        return dist < this.width / 2 + player.width / 2 + this.headRadius + player.headRadius - 20;
    }
}

class Bullet {
    constructor(x, y, dx, dy, speed, damage, color = '#00BFFF') {
        this.x = x; this.y = y; this.width = dx !== 0 ? 10 : 5; this.height = dx !== 0 ? 5 : 10;
        this.dx_direction = dx; this.dy_direction = dy; this.speed = speed; this.damage = damage;
        this.color = color; this.isActive = true;
    }
    draw() {
        if (!this.isActive) return;
        ctx.fillStyle = this.color; ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    update() {
        if (!this.isActive) return;
        this.x += this.dx_direction * this.speed; this.y += this.dy_direction * this.speed;
        if (this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight) this.isActive = false;
    }
    checkCollisionWithEnemy(enemy) {
        if (!this.isActive || !enemy.isAlive) return false;
        const dist = Math.hypot(this.x - enemy.x, this.y - (enemy.y - enemy.height / 2));
        return dist < this.width / 2 + enemy.width / 2 + enemy.headRadius - 10;
    }
}

let enemies = [];
let bullets = [];

const weapons = [
    { name: "散彈槍", damage: 15, fireRate: 900, bulletSpeed: 12, cost: 250, pellets: 5, spreadAngle: 0.3, description: "近距離威力巨大，一次發射5顆彈丸。" },
    { name: "衝鋒槍", damage: 7, fireRate: 100, bulletSpeed: 14, cost: 400, description: "射速極快，持續火力壓制。" },
    { name: "狙擊槍", damage: 60, fireRate: 1800, bulletSpeed: 25, cost: 600, description: "穿透力強，單發高傷害，射速慢。" }
];
const upgrades = [
    { name: "最大生命值 +50", cost: 150, effect: () => { player.maxHealth += 50; player.health = player.maxHealth; updatePlayerHealthUI(); }, description: "永久提升50點最大生命值並回滿。" },
    { name: "移動速度 +0.5", cost: 200, effect: () => { player.speed += 0.5; }, description: "永久提升移動速度。" },
    { name: "武器傷害 +15%", cost: 300, effect: () => { if (player.weapon) player.weapon.damage = Math.ceil(player.weapon.damage * 1.15); }, description: "提升當前武器基礎傷害15%。" },
    { name: "射速提升 10%", cost: 250, effect: () => { if (player.weapon && player.weapon.fireRate > 50) player.weapon.fireRate = Math.max(50, Math.floor(player.weapon.fireRate * 0.9)); }, description: "提升當前武器射速10% (減少射擊間隔)。" }
];

function drawStickman(x, y, bodyWidth, bodyHeight, headRadius, color, healthPercent = 1) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - bodyHeight - headRadius, headRadius, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - bodyHeight); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - bodyHeight * 0.7); ctx.lineTo(x - bodyWidth * 1.5, y - bodyHeight * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - bodyHeight * 0.7); ctx.lineTo(x + bodyWidth * 1.5, y - bodyHeight * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - bodyWidth, y + bodyHeight * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bodyWidth, y + bodyHeight * 0.4); ctx.stroke();
    if (healthPercent < 1 && healthPercent > 0) {
        const barWidth = headRadius * 2.5; const barHeight = 5;
        const barX = x - barWidth / 2; const barY = y - bodyHeight - headRadius * 2 - barHeight - 2;
        ctx.fillStyle = '#555'; ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'red'; ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }
}

function drawPlayer() {
    if (!player.isAlive) return;
    drawStickman(player.x, player.y, player.width, player.height, player.headRadius, player.color);
    if (player.weapon.muzzleFlashActive) {
        const flashX = player.x + player.facingDirection * (player.width / 2 + player.headRadius + 5);
        const flashY = player.y - player.height * 0.6;
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(flashX, flashY, 8, 0, Math.PI * 2); ctx.fill();
    }
}

function updatePlayerHealthUI() {
    const healthPercentage = (player.health / player.maxHealth) * 100;
    playerHealthBar.style.width = `${Math.max(0, healthPercentage)}%`;
    playerHealthValue.innerText = Math.max(0, Math.ceil(player.health)); // 取整顯示
    if (player.health <= player.maxHealth * 0.3) playerHealthBar.style.backgroundColor = '#dc3545';
    else if (player.health <= player.maxHealth * 0.6) playerHealthBar.style.backgroundColor = '#ffc107';
    else playerHealthBar.style.backgroundColor = '#4CAF50';
}

function spawnEnemy() {
    let x, y; const side = Math.random();
    if (side < 0.4) { x = -30; y = groundLevel; }
    else if (side < 0.8) { x = canvasWidth + 30; y = groundLevel; }
    else { x = Math.random() * (canvasWidth - 80) + 40; y = -30; }
    const speed = 1 + currentLevel * 0.25; const health = 30 + currentLevel * 15;
    const type = Math.random() < 0.2 + currentLevel * 0.05 ? 'elite' : 'normal';
    enemies.push(new Enemy(x, y, speed, health, type));
}

function shoot() {
    if (isGamePaused || !player.isAlive) return;
    const currentTime = Date.now();
    if (player.weapon && currentTime - player.weapon.lastShotTime > player.weapon.fireRate) {
        player.weapon.lastShotTime = currentTime;
        player.weapon.muzzleFlashActive = true;
        player.weapon.muzzleFlashEndTime = currentTime + player.weapon.muzzleFlashDuration;
        const bulletY = player.y - player.height * 0.6;
        if (player.weapon.name === "散彈槍" && player.weapon.pellets) {
            for (let i = 0; i < player.weapon.pellets; i++) {
                const angleOffset = (Math.random() - 0.5) * player.weapon.spreadAngle;
                const bulletX = player.x + player.facingDirection * (player.width / 2 + 5);
                const dirX = player.facingDirection; const dirY = Math.tan(angleOffset);
                bullets.push(new Bullet(bulletX, bulletY, dirX, dirY, player.weapon.bulletSpeed, player.weapon.damage));
            }
        } else {
            const bulletX = player.x + player.facingDirection * (player.width / 2 + player.headRadius + 5);
            bullets.push(new Bullet(bulletX, bulletY, player.facingDirection, 0, player.weapon.bulletSpeed, player.weapon.damage));
        }
    }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.update();
        if (enemy.y < groundLevel) { // 敵人掉落
            enemy.y += GRAVITY * 1.5; // 敵人下落可以快一點
            if (enemy.y > groundLevel) enemy.y = groundLevel;
        }
        if (enemy.checkCollisionWithPlayer()) {
            player.health -= (enemy.type === 'elite' ? 20 : 10);
            updatePlayerHealthUI();
            createExplosion(enemy.x, enemy.y - enemy.height / 2, 'red', 5);
            if (player.health <= 0) player.isAlive = false;
            enemy.isAlive = false;
            createExplosion(enemy.x, enemy.y - enemy.height / 2, enemy.color, 15);
        }
    });
    enemies = enemies.filter(enemy => enemy.isAlive);
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i]; bullet.update();
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.checkCollisionWithEnemy(enemy)) {
                enemy.health -= bullet.damage; bullet.isActive = false;
                createExplosion(bullet.x, bullet.y, 'yellow', 3);
                if (enemy.health <= 0) {
                    enemy.isAlive = false;
                    score += (enemy.type === 'elite' ? 50 : 15);
                    money += (enemy.type === 'elite' ? 15 : 8);
                    scoreDisplay.innerText = score; moneyDisplay.innerText = money;
                    createExplosion(enemy.x, enemy.y - enemy.height / 2, enemy.color, enemy.type === 'elite' ? 25 : 15);
                }
                break;
            }
        }
        if (!bullet.isActive) bullets.splice(i, 1);
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, "#2c3e50"); gradient.addColorStop(1, "#34495e");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#27ae60"; ctx.fillRect(0, groundLevel, canvasWidth, canvasHeight - groundLevel);
}

function updatePlayerPosition() {
    player.x += player.dx;
    if (player.isJumping) {
        player.y += player.velocityY; player.velocityY += GRAVITY;
        if (player.y >= groundLevel) {
            player.y = groundLevel; player.isJumping = false; player.velocityY = 0;
        }
    }
    if (player.x - player.width / 2 < 0) player.x = player.width / 2;
    if (player.x + player.width / 2 + player.headRadius > canvasWidth) player.x = canvasWidth - player.width / 2 - player.headRadius;
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function handleKeyDown(e) {
    // 如果任何彈出視窗是可見的，則遊戲輸入應該被禁用，除非是關閉這些視窗的特定按鍵(此處未實現)
    if (shopElement.style.display === 'block' || upgradesElement.style.display === 'block' || gameOverScreen.style.display === 'block' || levelStartScreen.style.display === 'block') {
        // 如果是Enter鍵且關卡開始畫面可見，則觸發開始按鈕
        if (e.key === 'Enter' && levelStartScreen.style.display === 'block') {
            startLevelButton.click();
        }
        return; // 阻止遊戲操作
    }
    // 只有在遊戲未暫停時才處理遊戲輸入
    if (isGamePaused) return;

    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') { player.dx = player.speed; player.facingDirection = 1; }
    else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') { player.dx = -player.speed; player.facingDirection = -1; }
    else if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !player.isJumping) { player.isJumping = true; player.velocityY = JUMP_FORCE; }
    else if (e.key === ' ' || e.key.toLowerCase() === 'k') { shoot(); }
}
function handleKeyUp(e) {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        player.dx = 0;
    }
}

function gameLoop() {
    // 如果遊戲結束或關卡開始畫面顯示，則不執行主要遊戲邏輯，但保持動畫循環
    if (gameOverScreen.style.display === 'block' || levelStartScreen.style.display === 'block') {
        drawBackground(); // 至少重繪背景避免畫面凍結
        drawPlayer(); // 玩家可能在遊戲結束畫面中
        drawParticles(); // 粒子效果可能還在
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // 如果遊戲暫停（例如商店打開），則只更新槍口火焰和粒子效果，並重繪基本場景
    if (isGamePaused) {
        const currentTime = Date.now();
        if (player.weapon.muzzleFlashActive && currentTime > player.weapon.muzzleFlashEndTime) {
            player.weapon.muzzleFlashActive = false;
        }
        updateParticles(); // 讓粒子效果在暫停時也能繼續
        drawBackground();
        drawPlayer();
        drawEnemies(); // 繪製靜止的敵人
        drawBullets(); // 繪製靜止的子彈
        drawParticles();
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    // --- 主要遊戲邏輯 ---
    const currentTime = Date.now();
    if (player.weapon.muzzleFlashActive && currentTime > player.weapon.muzzleFlashEndTime) {
        player.weapon.muzzleFlashActive = false;
    }

    updatePlayerPosition();
    updateEnemies();
    updateBullets();
    updateParticles();

    drawBackground();
    drawPlayer();
    drawEnemies();
    drawBullets();
    drawParticles();

    if (!player.isAlive && gameOverScreen.style.display === 'none') {
        gameOver(); // 如果玩家死亡且遊戲結束畫面未顯示，則調用gameOver
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

let enemySpawnInterval;
function startEnemySpawn() {
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(() => {
        if (isGamePaused || !player.isAlive || gameOverScreen.style.display === 'block' || levelStartScreen.style.display === 'block') return;
        const maxEnemies = 5 + currentLevel * 2;
        if (enemies.length < maxEnemies) {
            spawnEnemy();
        }
    }, Math.max(800, 2800 - currentLevel * 250)); // 稍微調整生成間隔和下限
}
function stopEnemySpawn() { clearInterval(enemySpawnInterval); }

showShopButton.addEventListener('click', () => {
    isGamePaused = true; shopElement.style.display = 'block';
    weaponListElement.innerHTML = "";
    weapons.forEach(weapon => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${weapon.name}</strong> - <span class="cost">價格：${weapon.cost}</span><span class="description">${weapon.description}</span><button class="buyButton" data-weapon-name='${weapon.name}'>購買</button>`;
        weaponListElement.appendChild(listItem);
    });
    document.querySelectorAll('.buyButton').forEach(button => {
        button.addEventListener('click', (e) => {
            const weaponName = e.target.dataset.weaponName;
            const selectedWeapon = weapons.find(w => w.name === weaponName);
            if (selectedWeapon) buyWeapon(selectedWeapon);
        });
    });
});
showUpgradesButton.addEventListener('click', () => {
    isGamePaused = true; upgradesElement.style.display = 'block';
    upgradeListElement.innerHTML = "";
    upgrades.forEach(upgrade => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${upgrade.name}</strong> - <span class="cost">價格：${upgrade.cost}</span><span class="description">${upgrade.description}</span><button class="upgradeButton" data-upgrade-name='${upgrade.name}'>購買</button>`;
        upgradeListElement.appendChild(listItem);
    });
    document.querySelectorAll('.upgradeButton').forEach(button => {
        button.addEventListener('click', (e) => {
            const upgradeName = e.target.dataset.upgradeName;
            const selectedUpgrade = upgrades.find(u => u.name === upgradeName);
            if (selectedUpgrade) buyUpgrade(selectedUpgrade);
        });
    });
});

function resumeGameIfPossible() {
    // 只有在遊戲主要邏輯應該運行時才取消暫停
    if (player.isAlive && time > 0 && levelStartScreen.style.display === 'none' && gameOverScreen.style.display === 'none') {
        isGamePaused = false;
    }
}

closeShopButton.addEventListener('click', () => {
    shopElement.style.display = 'none';
    resumeGameIfPossible();
});
closeUpgradesButton.addEventListener('click', () => {
    upgradesElement.style.display = 'none';
    resumeGameIfPossible();
});

function buyWeapon(weaponToBuy) {
    if (money >= weaponToBuy.cost) {
        money -= weaponToBuy.cost; moneyDisplay.innerText = money;
        player.weapon = { ...weaponToBuy, lastShotTime: 0, muzzleFlashActive: false, muzzleFlashEndTime: 0 };
        alert(`已購買 ${weaponToBuy.name}！`);
    } else alert("金錢不足！");
}
function buyUpgrade(upgradeToBuy) {
    if (money >= upgradeToBuy.cost) {
        money -= upgradeToBuy.cost; moneyDisplay.innerText = money;
        upgradeToBuy.effect(); alert(`已購買 ${upgradeToBuy.name}！`);
        updatePlayerHealthUI();
    } else alert("金錢不足！");
}

function updateTimer() {
    if (isGamePaused || !player.isAlive || gameOverScreen.style.display === 'block' || levelStartScreen.style.display === 'block') return;
    time--; timeDisplay.innerText = time;
    if (time <= 0) {
        clearInterval(gameInterval);
        if (player.isAlive) levelComplete();
    }
}

function showLevelStartScreen() {
    isGamePaused = true; // 確保在顯示開始畫面時遊戲是暫停的
    levelStartScreen.style.display = 'block';
    currentLevelDisplay.innerText = currentLevel;
    stopEnemySpawn(); clearInterval(gameInterval);
    // 在這裡清除之前的 animationFrameId 可能更好，以防萬一
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null; // 重置 ID
    }
    gameLoop(); // 重新啟動 gameLoop 以顯示背景和玩家
}

startLevelButton.addEventListener('click', () => {
    levelStartScreen.style.display = 'none';
    isGamePaused = false; // 明確設置為 false
    startGameplayForLevel();
});

function startGameplayForLevel() {
    isGamePaused = false; // 確保遊戲不是暫停狀態
    time = 120; timeDisplay.innerText = time;
    player.x = canvasWidth / 2; player.y = groundLevel;
    player.dx = 0; player.velocityY = 0; player.isJumping = false;
    player.health = player.maxHealth; // 關卡開始回滿血
    player.weapon.lastShotTime = 0;

    enemies = []; bullets = []; particles = [];
    levelDisplay.innerText = currentLevel;
    updatePlayerHealthUI();

    clearInterval(gameInterval);
    gameInterval = setInterval(updateTimer, 1000);
    startEnemySpawn();

    // 確保 gameLoop 正在運行
    if (!animationFrameId) { // 如果 animationFrameId 為 null (例如在 resetGame 後)
        gameLoop();
    }
}

function levelComplete() {
    isGamePaused = true; stopEnemySpawn(); clearInterval(gameInterval);
    // cancelAnimationFrame(animationFrameId); // gameLoop 內部會因 isGamePaused 處理

    score += time * 5 + currentLevel * 50; money += 100 + currentLevel * 50;
    scoreDisplay.innerText = score; moneyDisplay.innerText = money;
    alert(`關卡 ${currentLevel} 完成！\n剩餘時間獎勵：${time * 5}\n關卡獎勵：${currentLevel * 50}\n獲得金錢：${100 + currentLevel * 50}`);
    currentLevel++;
    if (currentLevel > 3) {
        alert("恭喜你！已通關所有關卡！最終分數：" + score);
        gameOver(); // 直接調用 gameOver 來顯示結束畫面
    } else {
        player.health = player.maxHealth;
        showLevelStartScreen();
    }
}

function gameOver() {
    isGamePaused = true; // 確保遊戲主邏輯停止
    player.isAlive = false; // 設置玩家為非活動狀態
    stopEnemySpawn(); clearInterval(gameInterval);
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
    // gameLoop 仍會運行以繪製 game over 畫面
}

function resetGame() {
    score = 0; money = 100; currentLevel = 1;
    player.maxHealth = 100; player.health = player.maxHealth;
    player.isAlive = true; player.speed = 4;
    player.weapon = { name: "手槍", damage: 10, fireRate: 400, bulletSpeed: 10, lastShotTime: 0, muzzleFlashDuration: 50, muzzleFlashActive: false, muzzleFlashEndTime: 0 };
    player.x = canvasWidth / 2; player.y = groundLevel; player.dx = 0; player.velocityY = 0; player.isJumping = false;


    scoreDisplay.innerText = score; moneyDisplay.innerText = money;
    levelDisplay.innerText = currentLevel;
    gameOverScreen.style.display = 'none';
    levelStartScreen.style.display = 'none'; // 確保開始畫面也隱藏

    showLevelStartScreen(); // 重新開始時顯示第一關開始畫面
}

restartButton.addEventListener('click', () => {
    resetGame();
});

// 初始調用
showLevelStartScreen(); // 遊戲加載時顯示關卡開始畫面
gameLoop(); // 在腳本末尾啟動一次主遊戲循環
