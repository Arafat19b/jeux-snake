// space.js — Space Invaders Neon Arcade

window.addEventListener('load', () => {

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('finalScore');
const overlay = document.getElementById('overlay');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');
const difficultySelect = document.getElementById('difficulty');

canvas.width = 600;
canvas.height = 400;

let keys = {};
let bullets = [];
let enemies = [];
let enemyDirection = 1;
let score = 0;
let gameOver = false;
let enemySpeed = 1;

const player = {
  x: canvas.width/2 - 20,
  y: canvas.height - 40,
  width: 40,
  height: 20,
  speed: 5
};

window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function initEnemies() {
    enemies = [];
    const rows = 3;
    const cols = 8;
    for(let r=0; r<rows; r++){
        for(let c=0; c<cols; c++){
            enemies.push({x: c*60 + 30, y: r*40 + 30, width:40, height:20, alive:true});
        }
    }
}

function update() {
    if(gameOver) return;

    if(keys['ArrowLeft'] && player.x>0) player.x -= player.speed;
    if(keys['ArrowRight'] && player.x+player.width<canvas.width) player.x += player.speed;

    if(keys[' '] && bullets.length<3){
        bullets.push({x:player.x+player.width/2-2.5, y:player.y, width:5, height:10});
        keys[' '] = false; // évite tirs continus
    }

    bullets.forEach((b,i) => {
        b.y -= 5;
        if(b.y<0) bullets.splice(i,1);
    });

    let shouldReverse = false;
    enemies.forEach(e => {
        e.x += enemyDirection * enemySpeed;
        if(e.x+e.width>=canvas.width || e.x<=0) shouldReverse = true;
    });
    if(shouldReverse){
        enemyDirection *= -1;
        enemies.forEach(e => e.y += 10);
    }

    bullets.forEach((b,bi) => {
        enemies.forEach((e,ei) => {
            if(e.alive && b.x < e.x+e.width && b.x+b.width>e.x && b.y < e.y+e.height && b.y+b.height>e.y){
                e.alive = false;
                bullets.splice(bi,1);
                score += 10;
                scoreDisplay.textContent = score;
            }
        });
    });

    enemies.forEach(e => { if(e.alive && e.y+e.height >= player.y){ gameOverFunc(); } });

    if(enemies.every(e=>!e.alive)) initEnemies();
}

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    bullets.forEach(b => ctx.fillRect(b.x,b.y,b.width,b.height));

    enemies.forEach(e => {
        if(e.alive){
            ctx.fillStyle = '#ff69b4';
            ctx.fillRect(e.x,e.y,e.width,e.height);
        }
    });

    if(!gameOver) requestAnimationFrame(draw);
}

function gameLoop(){
    update();
    if(!gameOver) requestAnimationFrame(gameLoop);
}

function gameOverFunc(){
    gameOver = true;
    finalScoreDisplay.textContent = score;
    overlay.classList.remove('hidden');
}

function setDifficulty(){
    const difficulty = difficultySelect.value;
    if(difficulty==='easy') enemySpeed = 1;
    if(difficulty==='medium') enemySpeed = 2;
    if(difficulty==='hard') enemySpeed = 3;
}

function resetGame(){
    score = 0;
    scoreDisplay.textContent = score;
    bullets = [];
    gameOver = false;
    player.x = canvas.width/2 - 20;
    setDifficulty();
    initEnemies();
    overlay.classList.add('hidden');
    gameLoop();
    draw();
}

nextBtn.addEventListener('click', resetGame);
backBtn.addEventListener('click', ()=>window.location.href='../index.html');
resetBtn.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', ()=>{ setDifficulty(); });

setDifficulty();
initEnemies();
gameLoop();
draw();

});
