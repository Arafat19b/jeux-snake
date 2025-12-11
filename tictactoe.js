/* TicTacToe — tictactoe.js
   - Stylish cyberpunk UI
   - PvP + PvC with Minimax (unbeatable)
   - Keyboard shortcuts (1..9) & arrows + Enter
   - localStorage wins tally
   - Small WebAudio cues
*/

/* DOM */
const boardEl = document.getElementById('board');
const overlay = document.getElementById('overlay');
const resultText = document.getElementById('resultText');
const detailText = document.getElementById('detailText');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');
const swapBtn = document.getElementById('swapBtn');
const pvpBtn = document.getElementById('pvpBtn');
const pvcBtn = document.getElementById('pvcBtn');
const xWinsEl = document.getElementById('xWins');
const oWinsEl = document.getElementById('oWins');

let cells = []; // array of 9 values: 'X'|'O'|null
let current = 'X';
let vsAI = false;
let allowInput = true;
let starting = 'X'; // who starts
let xWins = parseInt(localStorage.getItem('ttt_x') || '0',10);
let oWins = parseInt(localStorage.getItem('ttt_o') || '0',10);
xWinsEl.textContent = xWins; oWinsEl.textContent = oWins;

/* Audio */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function clickTone(freq=700){ try{ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sine'; o.frequency.value=freq; g.gain.value=0.06; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+0.06);}catch(e){} }

/* create 9 cells */
function buildBoard(){
  boardEl.innerHTML = '';
  cells = Array(9).fill(null);
  for(let i=0;i<9;i++){
    const div = document.createElement('div');
    div.className = 'cell';
    div.setAttribute('data-i', i);
    div.setAttribute('role','button');
    div.tabIndex = 0;
    div.addEventListener('click', ()=> handleMove(i));
    div.addEventListener('keydown', (e)=> { if(e.key==='Enter') handleMove(i); });
    boardEl.appendChild(div);
  }
}
buildBoard();

/* win combos */
const wins = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function checkWinner(b){
  for(const w of wins){
    const [a,b1,c] = w;
    if(b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  if(b.every(Boolean)) return 'draw';
  return null;
}

/* render board */
function renderBoard(){
  const nodes = boardEl.querySelectorAll('.cell');
  nodes.forEach((n, idx) => {
    n.textContent = cells[idx] || '';
    n.classList.toggle('disabled', !!cells[idx] || !allowInput);
  });
}

/* handle move */
function handleMove(i){
  if(!allowInput) return;
  if(cells[i]) return;
  cells[i] = current;
  clickTone(current==='X'?900:600);
  renderBoard();
  const res = checkWinner(cells);
  if(res){
    finishGame(res);
    return;
  }
  // swap
  current = (current === 'X') ? 'O' : 'X';
  if(vsAI && current === 'O'){
    allowInput = false;
    setTimeout(()=> {
      const aiIdx = bestMove(cells, 'O');
      cells[aiIdx] = 'O';
      clickTone(650);
      renderBoard();
      const r = checkWinner(cells);
      if(r) finishGame(r);
      else { current = 'X'; allowInput = true; }
    }, 260);
  }
}

/* finish */
function finishGame(res){
  allowInput = false;
  overlay.classList.remove('hidden');
  if(res === 'draw'){
    resultText.textContent = 'MATCH NUL';
    detailText.textContent = 'Personne ne gagne.';
  } else {
    resultText.textContent = res + ' GAGNE';
    detailText.textContent = `${res} a aligné 3 signes.`;
    // persist wins
    if(res === 'X'){ xWins++; localStorage.setItem('ttt_x', String(xWins)); xWinsEl.textContent = xWins; }
    if(res === 'O'){ oWins++; localStorage.setItem('ttt_o', String(oWins)); oWinsEl.textContent = oWins; }
  }
}

/* restart / new game */
function newGame(){
  overlay.classList.add('hidden');
  buildBoard();
  current = starting;
  allowInput = true;
  if(vsAI && current==='O'){
    // AI starts
    allowInput = false;
    setTimeout(()=> {
      const idx = bestMove(cells, 'O');
      cells[idx] = 'O';
      renderBoard();
      current = 'X';
      allowInput = true;
    }, 200);
  }
}

/* swap who starts */
swapBtn.addEventListener('click', ()=> {
  starting = (starting === 'X') ? 'O' : 'X';
  newGame();
});

/* reset tallies */
resetBtn.addEventListener('click', ()=> {
  xWins = 0; oWins = 0;
  localStorage.setItem('ttt_x', '0'); localStorage.setItem('ttt_o','0');
  xWinsEl.textContent = xWins; oWinsEl.textContent = oWins;
});

/* modes */
pvpBtn.addEventListener('click', ()=> {
  vsAI = false; pvpBtn.classList.add('active'); pvcBtn.classList.remove('active'); newGame();
});
pvcBtn.addEventListener('click', ()=> {
  vsAI = true; pvcBtn.classList.add('active'); pvpBtn.classList.remove('active'); newGame();
});

/* overlay buttons */
nextBtn.addEventListener('click', ()=> { newGame(); });
backBtn.addEventListener('click', ()=> { window.location.href = '../index.html'; });

/* keyboard numeric mapping 1..9 (numpad style)
   we map:
   7 8 9
   4 5 6
   1 2 3
   to indices:
   0 1 2
   3 4 5
   6 7 8
*/
const keyMapNum = {
  '1':6,'2':7,'3':8,'4':3,'5':4,'6':5,'7':0,'8':1,'9':2
};
window.addEventListener('keydown', (e) => {
  if(e.key in keyMapNum){
    const idx = keyMapNum[e.key];
    handleMove(idx);
  }
  // arrows + enter navigation (nice-to-have)
  if(e.key === 'Enter' && !overlay.classList.contains('hidden')) newGame();
});

/* Minimax AI — unbeatable for TicTacToe */
function bestMove(board, player){
  // returns best index for player ('O' in our usage)
  const avail = board.map((v,i)=> v? null:i).filter(v=>v!==null);
  // if board empty, choose center or corner
  if(avail.length === 9) return 4; // center

  function minimax(b, turn){
    const winner = checkWinner(b);
    if(winner === 'X') return {score:-10};
    if(winner === 'O') return {score:10};
    if(winner === 'draw') return {score:0};
    const moves = [];
    for(let i=0;i<9;i++){
      if(!b[i]){
        const copy = b.slice();
        copy[i] = turn;
        const result = minimax(copy, turn === 'O' ? 'X' : 'O');
        moves.push({ index: i, score: result.score });
      }
    }
    // choose best move depending on turn
    if(turn === 'O'){
      let best = moves[0];
      for(const m of moves) if(m.score > best.score) best = m;
      return best;
    } else {
      let best = moves[0];
      for(const m of moves) if(m.score < best.score) best = m;
      return best;
    }
  }

  const best = minimax(board.slice(), player);
  return best.index;
}

/* init */
newGame();

/* small LED pulse */
const leds = document.querySelectorAll('.led');
let t = 0;
function pulse(){ t += 0.03; leds.forEach((l,i)=> { const o = Math.sin(t + i*0.7)*0.5+0.5; l.style.opacity = 0.25 + o*0.8; if(l.classList.contains('on')) l.style.background = `rgba(255,62,197,${0.8*o})`; }); requestAnimationFrame(pulse); }
pulse();
