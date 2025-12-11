/* Snake multi-niveaux — snake.js
   - Canvas + neon trail
   - Automatic levels by score (with obstacles and speed changes)
   - Keyboard + touch + on-screen buttons
   - Score + highscore (localStorage)
   - Level up transitions & small WebAudio cues
*/

/* ---------- Canvas & sizing ---------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

function fitCanvas() {
  // maintain square playable area based on container
  const parentRect = canvas.parentElement.getBoundingClientRect();
  const size = Math.min(parentRect.width - 24, window.innerHeight - 240);
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width = Math.floor(size);
  canvas.height = Math.floor(size);
}
fitCanvas();
window.addEventListener('resize', () => { fitCanvas(); computeTileCount(); });

/* ---------- Grid & tiles ---------- */
const baseTile = 20;
let tileCount = 30;
function computeTileCount(){
  tileCount = Math.max(12, Math.floor(canvas.width / baseTile));
}
computeTileCount();

/* ---------- Game state ---------- */
let snake = [];
let dir = {x:0,y:0};
let apple = {x:0,y:0};
let score = 0;
let highscore = parseInt(localStorage.getItem('snake_neon_high') || '0', 10);
let level = 1;
let speed = 8; // ticks per second base
let tickInterval = 1000 / speed;
let tickTimer = null;
let running = false;
let trail = [];
let maxTrail = 18;
let obstacles = []; // array of {x,y}
let playArea = {margin:0}; // margin in tiles from edges (used to shrink play area per level)

/* DOM Elements */
const startScreen = document.getElementById('startScreen');
const playBtn = document.getElementById('playBtn');
const instructionsBtn = document.getElementById('instructionsBtn');
const instrEl = document.getElementById('instructions');
const instrClose = document.getElementById('instrClose');
const levelUpEl = document.getElementById('levelUp');
const levelUpText = document.getElementById('levelUpText');
const gameOverEl = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
const backMenuBtn = document.getElementById('backMenuBtn');
const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const finalScore = document.getElementById('finalScore');
const levelEl = document.getElementById('level');

highscoreEl.textContent = highscore;

/* ---------- Levels definition ----------
   thresholds: array of objects {scoreThreshold, speed, obstaclesCount, margin}
   - margin = number of tiles blocked from each side (shrinks area)
*/
const levels = [
  { score: 0, speed: 8, obstacles: 0, margin: 0, name: '1 - Starter' },
  { score: 6, speed: 10, obstacles: 3, margin: 0, name: '2 - Tension' },
  { score: 14, speed: 12, obstacles: 6, margin: 1, name: '3 - Hazard' },
  { score: 26, speed: 14, obstacles: 10, margin: 2, name: '4 - Frenzy' },
  { score: 40, speed: 18, obstacles: 14, margin: 3, name: '5 - Inferno' }
];

/* ---------- Audio (WebAudio) ---------- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq = 440, time = 0.06, type='sine', volume=0.06){
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + time);
  } catch(e){}
}

/* ---------- Helpers ---------- */
function randCoordWithinMargin() {
  const min = playArea.margin;
  const max = tileCount - 1 - playArea.margin;
  return { x: Math.floor(Math.random() * (max - min + 1)) + min, y: Math.floor(Math.random() * (max - min + 1)) + min };
}
function placeApple(){
  apple = randCoordWithinMargin();
  while (snake.some(s => s.x === apple.x && s.y === apple.y) || obstacles.some(o => o.x === apple.x && o.y === apple.y)) {
    apple = randCoordWithinMargin();
  }
}
function generateObstacles(count){
  obstacles = [];
  let attempts = 0;
  while(obstacles.length < count && attempts < 1000){
    const c = randCoordWithinMargin();
    // avoid near center start area
    const center = {x: Math.floor(tileCount/2), y: Math.floor(tileCount/2)};
    const distCenter = Math.abs(c.x - center.x) + Math.abs(c.y - center.y);
    if(distCenter < 4){ attempts++; continue; }
    if(snake.some(s => s.x === c.x && s.y === c.y)) { attempts++; continue; }
    if(apple.x === c.x && apple.y === c.y) { attempts++; continue; }
    if(obstacles.some(o => o.x === c.x && o.y === c.y)){ attempts++; continue; }
    obstacles.push(c);
    attempts++;
  }
}

/* ---------- Game control ---------- */
function initGameState(){
  computeTileCount();
  snake = [{ x: Math.floor(tileCount/2), y: Math.floor(tileCount/2) }];
  dir = {x:1, y:0};
  score = 0;
  trail = [];
  maxTrail = 18;
  level = 1;
  playArea.margin = 0;
  updateLevelUI();
  placeApple();
  generateObstacles(0);
  updateScoreUI();
}

function updateScoreUI(){
  scoreEl.textContent = score;
  highscoreEl.textContent = highscore;
  levelEl.textContent = level;
}

function levelForScore(s){
  // returns level index in levels (1-based)
  let idx = 0;
  for(let i=0;i<levels.length;i++){
    if(s >= levels[i].score) idx = i;
  }
  return idx;
}

function applyLevel(idx){
  const L = levels[idx];
  if(!L) return;
  // set speed, obstacles, margin
  speed = L.speed;
  playArea.margin = L.margin;
  generateObstacles(L.obstacles);
  // update tick interval
  if(tickTimer) clearInterval(tickTimer);
  tickInterval = 1000 / speed;
  if(running) tickTimer = setInterval(tick, tickInterval);
  // visual level-up
  level = idx + 1;
  levelEl.textContent = level;
  showLevelUp(L.name);
  beep(600 + idx*120, 0.12, 'sawtooth', 0.08);
}

let levelUpTimeout = null;
function showLevelUp(name){
  levelUpText.textContent = 'NIVEAU: ' + name;
  levelUpEl.classList.remove('hidden');
  if(levelUpTimeout) clearTimeout(levelUpTimeout);
  levelUpTimeout = setTimeout(()=> levelUpEl.classList.add('hidden'), 900);
}

/* ---------- Game loop: tick ---------- */
function startGame(){
  if(audioCtx.state === 'suspended') audioCtx.resume();
  initGameState();
  startScreen.classList.add('hidden');
  gameOverEl.classList.add('hidden');
  instrEl.classList.add('hidden');
  running = true;
  // apply initial level according to score=0
  applyLevel(levelForScore(score));
  tickInterval = 1000 / speed;
  if(tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tick, tickInterval);
  requestAnimationFrame(render);
  beep(720, 0.08, 'sine', 0.07);
}

function endGame(){
  running = false;
  clearInterval(tickTimer);
  finalScore.textContent = score;
  gameOverEl.classList.remove('hidden');
  if(score > highscore){
    highscore = score;
    localStorage.setItem('snake_neon_high', String(highscore));
    beep(1100, 0.18, 'sawtooth', 0.12);
  } else {
    beep(200, 0.12, 'sine', 0.09);
  }
}

/* ---------- Tick: update state ---------- */
function tick(){
  // compute new head
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // check bounds considering playArea.margin
  if(head.x < playArea.margin || head.x >= tileCount - playArea.margin || head.y < playArea.margin || head.y >= tileCount - playArea.margin){
    endGame(); return;
  }

  // collision with obstacles
  if(obstacles.some(o => o.x === head.x && o.y === head.y)){ endGame(); return; }

  // self collision
  if(snake.some(s => s.x === head.x && s.y === head.y)){
    endGame(); return;
  }

  snake.unshift(head);

  // apple collision
  if(head.x === apple.x && head.y === apple.y){
    score++;
    updateScoreUI();
    placeApple();
    // Grow trail and possibly bump speed slightly (also levels will handle speed)
    maxTrail = Math.min(36, maxTrail + 1);
    beep(880 - Math.min(450, score*6), 0.06, 'triangle', 0.06);
  } else {
    snake.pop();
  }

  // Check level change
  const lvlIdx = levelForScore(score);
  if(lvlIdx + 1 !== level){
    applyLevel(lvlIdx);
  }

  // update trail
  trail.unshift({ x: head.x, y: head.y, life: maxTrail });
  if(trail.length > 200) trail.pop();
}

/* ---------- Rendering ---------- */
function render(){
  // clear
  ctx.fillStyle = '#02000a';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // recalc tile size
  computeTileCount();
  const tileSize = Math.floor(canvas.width / tileCount);
  const gridW = tileSize * tileCount;
  const offsetX = Math.floor((canvas.width - gridW) / 2);
  const offsetY = Math.floor((canvas.height - gridW) / 2);

  // background gradient
  const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  g.addColorStop(0, 'rgba(9,2,20,0.95)');
  g.addColorStop(1, 'rgba(2,1,8,0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // faint grid
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for(let i = playArea.margin; i <= tileCount - playArea.margin; i++){
    const x = offsetX + (i - playArea.margin) * tileSize;
    ctx.moveTo(x, offsetY);
    ctx.lineTo(x, offsetY + (tileCount - playArea.margin*2)*tileSize);
    const y = offsetY + (i - playArea.margin) * tileSize;
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + (tileCount - playArea.margin*2)*tileSize, y);
  }
  ctx.stroke();

  // obstacles
  ctx.globalCompositeOperation = 'source-over';
  for(const o of obstacles){
    const ox = offsetX + (o.x - playArea.margin) * tileSize;
    const oy = offsetY + (o.y - playArea.margin) * tileSize;
    // neon block
    ctx.fillStyle = 'rgba(70,10,80,0.95)';
    roundRect(ctx, ox + 2, oy + 2, tileSize - 4, tileSize - 4, Math.max(4, tileSize*0.12));
    // glow
    ctx.fillStyle = 'rgba(255,62,197,0.12)';
    ctx.beginPath();
    ctx.ellipse(ox + tileSize/2, oy + tileSize/2, tileSize*0.9, tileSize*0.9, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // particle trail
  ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<trail.length;i++){
    const p = trail[i];
    const life = p.life / maxTrail;
    const cx = offsetX + (p.x - playArea.margin) * tileSize + tileSize/2;
    const cy = offsetY + (p.y - playArea.margin) * tileSize + tileSize/2;
    const r = Math.max(1, tileSize * 0.18 * life);
    ctx.fillStyle = `hsla(${280 + (i % 10)*4},80%,60%,${0.18 * life})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    p.life = Math.max(0, p.life - 0.08);
  }

  // apple
  const ax = offsetX + (apple.x - playArea.margin) * tileSize;
  const ay = offsetY + (apple.y - playArea.margin) * tileSize;
  const apPad = Math.floor(tileSize*0.12);
  ctx.fillStyle = '#ff3ec5';
  ctx.fillRect(ax + apPad, ay + apPad, tileSize - apPad*2, tileSize - apPad*2);
  // apple glow
  ctx.fillStyle = 'rgba(255,62,197,0.12)';
  ctx.beginPath();
  ctx.ellipse(ax + tileSize/2, ay + tileSize/2, tileSize*0.9, tileSize*0.9, 0, 0, Math.PI*2);
  ctx.fill();

  // snake segments
  for(let i=0;i<snake.length;i++){
    const s = snake[i];
    const x = offsetX + (s.x - playArea.margin) * tileSize;
    const y = offsetY + (s.y - playArea.margin) * tileSize;
    const hue = i === 0 ? 270 : 260 + (i % 6) * 3;
    const fill = (i === 0) ? '#8a4dff' : `hsl(${hue},70%,55%)`;
    roundRect(ctx, x + 2, y + 2, tileSize - 4, tileSize - 4, Math.max(4, tileSize*0.12), fill);
    // inner shine
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + tileSize*0.28, y + tileSize*0.12, tileSize*0.44, Math.max(2, Math.floor(tileSize*0.18)));
  }

  ctx.globalCompositeOperation = 'source-over';

  if(running) requestAnimationFrame(render);
}

/* rounded rect helper */
function roundRect(ctx, x, y, w, h, r, color){
  if(color) ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

/* ---------- Input handling ---------- */
const keyMap = {
  'ArrowUp': {x:0,y:-1}, 'ArrowDown':{x:0,y:1}, 'ArrowLeft':{x:-1,y:0}, 'ArrowRight':{x:1,y:0},
  'z': {x:0,y:-1}, 's':{x:0,y:1}, 'q':{x:-1,y:0}, 'd':{x:1,y:0}
};
window.addEventListener('keydown', (e) => {
  const k = e.key;
  if(k === ' ') { // pause toggle
    if(running) { running=false; clearInterval(tickTimer); } else { startGame(); }
    return;
  }
  const m = keyMap[k] || keyMap[k.toLowerCase()];
  if(!m) return;
  // prevent reversing into self
  if(snake.length > 1 && snake[0].x + m.x === snake[1].x && snake[0].y + m.y === snake[1].y) return;
  dir = {x: m.x, y: m.y};
});

/* touch swipe */
let touchStart = null;
canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; touchStart = {x:t.clientX, y:t.clientY}; });
canvas.addEventListener('touchmove', (e) => {
  if(!touchStart) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
  if(Math.hypot(dx,dy) > 40){
    if(Math.abs(dx) > Math.abs(dy)) dir = dx>0?{x:1,y:0}:{x:-1,y:0};
    else dir = dy>0?{x:0,y:1}:{x:0,y:-1};
    touchStart = null;
  }
});
canvas.addEventListener('touchend', ()=> touchStart = null);

/* on-screen buttons */
document.querySelectorAll('.tbtn').forEach(b => {
  b.addEventListener('touchstart', (e) => {
    const d = b.getAttribute('data-dir');
    const map = {up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0}};
    dir = map[d];
    e.preventDefault();
  });
});

/* ---------- UI Buttons ---------- */
playBtn.addEventListener('click', startGame);
instructionsBtn.addEventListener('click', ()=> { instrEl.classList.remove('hidden'); startScreen.classList.add('hidden'); });
instrClose.addEventListener('click', ()=> { instrEl.classList.add('hidden'); startScreen.classList.remove('hidden'); });
restartBtn.addEventListener('click', ()=> { startGame(); });
backMenuBtn.addEventListener('click', ()=> { window.location.href = '../index.html'; });

/* clicking overlay card shouldn't steal click if clicking buttons */
startScreen.addEventListener('click', (e) => {});

/* ---------- LED pulse ---------- */
const leds = document.querySelectorAll('.led');
let tt=0;
function pulse(){
  tt += 0.03;
  leds.forEach((l,i) => {
    const off = Math.sin(tt + i*0.6) * 0.5 + 0.5;
    l.style.opacity = 0.2 + off*0.9;
    if(l.classList.contains('on')) l.style.background = `rgba(255,62,197,${0.8*off})`;
  });
  requestAnimationFrame(pulse);
}
pulse();

/* ---------- Initialization ---------- */
function resetForDev(){
  clearInterval(tickTimer);
  running=false;
  computeTileCount();
  initGameState();
  render();
}
function initGameState(){
  computeTileCount();
  snake = [{ x: Math.floor(tileCount/2), y: Math.floor(tileCount/2) }];
  dir = {x:1, y:0};
  score = 0;
  level = 1;
  playArea.margin = 0;
  trail = [];
  maxTrail = 18;
  placeApple();
  generateObstacles(0);
  updateScoreUI();
}
function updateScoreUI(){ scoreEl.textContent = score; highscoreEl.textContent = highscore; levelEl.textContent = level; }

/* run initial frame */
computeTileCount();
initGameState();
requestAnimationFrame(render);

/* expose for debugging */
window.__snake_reset = resetForDev;
