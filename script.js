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
