const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('time');
const scoreDisplay = document.getElementById('score');
const moneyDisplay = document.getElementById('money');
const levelDisplay = document.getElementById('level');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

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

let time = 120;
let score = 0;
let money = 100;
let level = 1;
let gameInterval;
let animationFrameId;

// 玩家 (火柴人)
const player = {
    x: canvasWidth / 2,
    y: canvasHeight - 50,
    width: 20,
    height: 40,
    color: 'black',
    speed: 5,
    dx: 0,
    dy: 0,
    health: 100,
    isAlive: true,
    facingDirection: 1,
    weapon: {
        name: "手槍",
        damage: 10,
        fireRate: 500,
        bulletSpeed: 8,
        lastShotTime: 0
    }
};

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

    draw() {
        if (!this.isAlive) return;

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height - 10, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        if (!this.isAlive) return;

        if (this.x < player.x) {
            this.x += this.speed;
        } else if (this.x > player.x) {
            this.x -= this.speed;
        }

        if (this.x - this.width / 2 < 0) this.x = this.width / 2;
        if (this.x + this.width / 2 > canvasWidth) this.x = canvasWidth - this.width / 2;
    }

    checkCollisionWithPlayer() {
        if (!this.isAlive || !player.isAlive) return false;

        const enemyLeft = this.x - this.width / 2;
        const enemyRight = this.x + this.width / 2;
        const enemyTop = this.y - this.height - 10;
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

// 子彈類別
class Bullet {
    constructor(x, y, dx, dy, speed, damage, color = 'blue') {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 4;
        this.dx = dx;
        this.dy = dy;
        this.speed = speed;
        this.damage = damage;
        this.color = color;
        this.isActive = true;
    }

    draw() {
        if (!this.isActive) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    update() {
        if (!this.isActive) return;
        this.x += this.dx * this.speed;
        this.y += this.dy * this.speed;

        if (this.x < 0 || this.x > canvasWidth || this.y < 0 || this.y > canvasHeight) {
            this.isActive = false;
        }
    }

    checkCollisionWithEnemy(enemy) {
        if (!this.isActive || !enemy.isAlive) return false;

        const bulletLeft = this.x - this.width / 2;
        const bulletRight = this.x + this.width / 2;
        const bulletTop = this.y - this.height / 2;
        const bulletBottom = this.y + this.height / 2;

        const enemyLeft = enemy.x - enemy.width / 2;
        const enemyRight = enemy.x + enemy.width / 2;
        const enemyTop = enemy.y - enemy.height - 10;
        const enemyBottom = enemy.y;

        const isColliding = !(bulletRight < enemyLeft ||
            bulletLeft > enemyRight ||
            bulletBottom < enemyTop ||
            bulletTop > enemyBottom);
        return isColliding;
    }
}

let enemies = [];
let bullets = [];

// 武器列表
const weapons = [
    {
        name: "散彈槍",
        damage: 25,
        fireRate: 800,
        bulletSpeed: 10,
        cost: 200,
        description: "一次發射多顆子彈，威力強大。"
    },
    {
        name: "衝鋒槍",
        damage: 8,
        fireRate: 150,
        bulletSpeed: 12,
        cost: 300,
        description: "射速極快，適合壓制敵人。"
    },
    {
        name: "狙擊槍",
        damage: 50,
        fireRate: 1500,
        bulletSpeed: 20,
        cost: 500,
        description: "單發傷害極高，適合遠距離狙擊。"
    }
];

// 升級選項列表
const upgrades = [
    {
        name: "生命值提升",
        cost: 150,
        effect: () => { player.health += 50; },
        description: "增加 50 點生命值。"
    },
    {
        name: "武器傷害提升",
        cost: 200,
        effect: () => {
            if (player.weapon) {
                player.weapon.damage += 5;
            }
        },
        description: "提升當前武器傷害 5 點。"
    },
    {
        name: "射速提升",
        cost: 250,
        effect: () => {
            if (player.weapon && player.weapon.fireRate > 50) {
                player.weapon.fireRate -= 50;
            }
        },
        description: "稍微提升武器射速。"
    }
];

// 產生敵人
function spawnEnemy() {
    const x = Math.random() * (canvasWidth - 40) + 20;
    const y = canvasHeight - 10;
    const speed = 1 + level * 0.3;
    const health = 20 + level * 10;

    const enemy = new Enemy(x, y, speed, health);
    enemies.push(enemy);
}

// 射擊函數
function shoot() {
    const currentTime = Date.now();
    if (player.weapon && currentTime - player.weapon.lastShotTime > player.weapon.fireRate) {
        const bulletX = player.x + (player.facingDirection * (player.width / 2 + 5));
        const bulletY = player.y - player.height / 2 - 5;

        const newBullet = new Bullet(
            bulletX,
            bulletY,
            player.facingDirection,
            0,
            player.weapon.bulletSpeed,
            player.weapon.damage
        );
        bullets.push(newBullet);
        player.weapon.lastShotTime = currentTime;
    }
}

// 更新所有敵人
function updateEnemies() {
    enemies.forEach(enemy => {
        enemy.update();

        if (enemy.checkCollisionWithPlayer()) {
            player.health -= 10;
            if (player.health <= 0) {
                player.isAlive = false;
            }
            enemy.isAlive = false;
        }
    });

    enemies = enemies.filter(enemy => enemy.isAlive);
}

// 更新所有子彈
function updateBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        bullet.update();

        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.checkCollisionWithEnemy(enemy)) {
                enemy.health -= bullet.damage;
                bullet.isActive = false;

                if (enemy.health <= 0) {
                    enemy.isAlive = false;
                    score += 10;
                    money += 5;
                    scoreDisplay.innerText = score;
                    moneyDisplay.innerText = money;
                }
            }
        });

        if (!bullet.isActive) {
            bullets.splice(bulletIndex, 1);
        }
    });
}

// 繪製火柴人
function drawPlayer() {
    if (!player.isAlive) return;

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.width / 2, player.y - player.height, player.width, player.height);
    ctx.beginPath();
    ctx.arc(player.x, player.y - player.height - 10, 10, 0, Math.PI * 2);
    ctx.fill();
}

// 繪製所有敵人
function drawEnemies() {
    enemies.forEach(enemy => enemy.draw());
}

// 繪製所有子彈
function drawBullets() {
    bullets.forEach(bullet => bullet.draw());
}

// 清除畫布
function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

// 更新玩家位置
function updatePlayerPosition() {
    player.x += player.dx;
    player.y += player.dy;

    if (player.x - player.width / 2 < 0) {
        player.x = player.width / 2;
    }
    if (player.x + player.width / 2 > canvasWidth) {
        player.x = canvasWidth - player.width / 2;
    }
}

// 鍵盤事件監聽
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function handleKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'd') {
        player.dx = player.speed;
        player.facingDirection = 1;
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.dx = -player.speed;
        player.facingDirection = -1;
    } else if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        shoot();
    }
}

function handleKeyUp(e) {
    if (
        (e.key === 'ArrowRight' || e.key === 'd') ||
        (e.key === 'ArrowLeft' || e.key === 'a')
    ) {
        player.dx = 0;
    }
}

// 遊戲主循環
function gameLoop() {
    if (!player.isAlive) {
        if (gameOverScreen.style.display === 'none') {
            gameOver();
        }
        return;
    }

    clearCanvas();
    updatePlayerPosition();
    updateEnemies();
    updateBullets();

    drawPlayer();
    drawEnemies();
    drawBullets();

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 控制敵人生成頻率
let enemySpawnInterval;
function startEnemySpawn() {
    enemySpawnInterval = setInterval(() => {
        if (enemies.length < level * 5) {
            spawnEnemy();
        }
    }, 2000);
}

function stopEnemySpawn() {
    clearInterval(enemySpawnInterval);
}

// 顯示商店
showShopButton.addEventListener('click', () => {
    shopElement.style.display = 'block';
    weaponListElement.innerHTML = "";
    weapons.forEach(weapon => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${weapon.name} - ${weapon.description} - 價格：${weapon.cost} <button class="buyButton" data-weapon='${JSON.stringify(weapon)}'>購買</button>`;
        weaponListElement.appendChild(listItem);
    });

    const buyButtons = document.querySelectorAll('.buyButton');
    buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const weapon = JSON.parse(button.dataset.weapon);
            buyWeapon(weapon);
        });
    });
});

// 顯示升級選項
showUpgradesButton.addEventListener('click', () => {
    upgradesElement.style.display = 'block';
    upgradeListElement.innerHTML = "";
    upgrades.forEach(upgrade => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${upgrade.name} - ${upgrade.description} - 價格：${upgrade.cost} <button class="upgradeButton" data-upgrade='${JSON.stringify(upgrade)}'>購買</button>`;
        upgradeListElement.appendChild(listItem);
    });

    const upgradeButtons = document.querySelectorAll('.upgradeButton');
    upgradeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const upgrade = JSON.parse(button.dataset.upgrade);
            buyUpgrade(upgrade);
        });
    });
});

// 關閉商店
closeShopButton.addEventListener('click', () => {
    shopElement.style.display = 'none';
});

// 關閉升級選項
closeUpgradesButton.addEventListener('click', () => {
    upgradesElement.style.display = 'none';
});

// 購買武器函數
function buyWeapon(weapon) {
    if (money >= weapon.cost) {
        money -= weapon.cost;
        moneyDisplay.innerText = money;
        player.weapon = {
            name: weapon.name,
            damage: weapon.damage,
            fireRate: weapon.fireRate,
            bulletSpeed: weapon.bulletSpeed,
            lastShotTime: 0
        };
        alert(`已購買 ${weapon.name}！`);
    } else {
        alert("金錢不足！");
    }
}

// 購買升級函數
function buyUpgrade(upgrade) {
    if (money >= upgrade.cost) {
        money -= upgrade.cost;
        moneyDisplay.innerText = money;
        upgrade.effect();
        alert(`已購買 ${upgrade.name}！`);
    } else {
        alert("金錢不足！");
    }
}

// 更新計時器
function updateTimer() {
    time--;
    timeDisplay.innerText = time;

    if (time <= 0) {
        clearInterval(gameInterval);
        if (player.isAlive) {
            levelComplete();
        } else {
            gameOver();
        }
    }
}

// 關卡完成
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
        player.health = 100;
        player.weapon.lastShotTime = 0;
        enemies = [];
        bullets = [];
        levelDisplay.innerText = level;
        timeDisplay.innerText = time;
        gameInterval = setInterval(updateTimer, 1000);
        stopEnemySpawn();
        startEnemySpawn();
        gameLoop();
    }
}

// 遊戲結束
function gameOver() {
    player.isAlive = false;
    clearInterval(gameInterval);
    cancelAnimationFrame(animationFrameId);
    stopEnemySpawn();
    bullets = [];
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'block';
}

// 初始化遊戲
function init() {
    time = 120;
    score = 0;
    player.x = canvasWidth / 2;
    player.y = canvasHeight - 50;
    player.health = 100;
    player.isAlive = true;
    player.dx = 0;
    player.dy = 0;
    player.facingDirection = 1;
    player.weapon.lastShotTime = 0;

    enemies = [];
    bullets = [];

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

restartButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    init();
});

init();
