/* Neon Core — script.js */
/* Canvas background + panel interactions + keyboard navigation that triggers the real <a href> play links */

/* Canvas init */
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let DPR = window.devicePixelRatio || 1;
function resizeCanvas(){ canvas.width = innerWidth * DPR; canvas.height = innerHeight * DPR; canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
resizeCanvas();
window.addEventListener('resize', ()=>{ DPR = window.devicePixelRatio || 1; resizeCanvas(); });

/* Particles & beams */
const particles = [];
const P = 110;
for(let i=0;i<P;i++){
  particles.push({ x: Math.random()*innerWidth, y: Math.random()*innerHeight, vx:(Math.random()-0.5)*0.35, vy:(Math.random()-0.5)*0.35, r:0.6+Math.random()*1.8, hue:270 + Math.random()*120 });
}
function drawBg(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  const g = ctx.createLinearGradient(0,0,innerWidth,innerHeight);
  g.addColorStop(0, 'rgba(6,2,12,0.46)');
  g.addColorStop(1, 'rgba(2,1,6,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,innerWidth,innerHeight);

  ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<3;i++){
    const x = innerWidth * (0.18 + i*0.32);
    const y = innerHeight * (0.12 + Math.sin(Date.now()/4200 + i)*0.04);
    const grd = ctx.createRadialGradient(x,y,0,x,y,innerWidth*0.6);
    grd.addColorStop(0, `rgba(255,62,197,0.06)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,innerWidth,innerHeight);
  }

  for(const p of particles){
    p.x += p.vx; p.y += p.vy;
    if(p.x < -10) p.x = innerWidth + 10;
    if(p.x > innerWidth + 10) p.x = -10;
    if(p.y < -10) p.y = innerHeight + 10;
    if(p.y > innerHeight + 10) p.y = -10;
    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue},80%,60%,0.12)`;
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255,255,255,0.01)';
  for(let y=0;y<innerHeight;y+=6) ctx.fillRect(0,y,innerWidth,0.6);
  requestAnimationFrame(drawBg);
}
drawBg();

/* UI interactions */
const enterBtn = document.getElementById('enterBtn');
const panel = document.getElementById('panel');
const cards = document.querySelectorAll('.card');
const leds = document.querySelectorAll('.led');
const muteBtn = document.getElementById('muteBtn');

/* Enter to reveal panel */
enterBtn.addEventListener('click', ()=>{ panel.classList.remove('hidden'); enterBtn.style.display='none'; document.querySelector('.hero .tag').style.opacity=0.6; cards[0].focus(); });

/* simple mute button (no audio implemented, placeholder) */
muteBtn.addEventListener('click', ()=>{ muteBtn.classList.toggle('muted'); muteBtn.textContent = muteBtn.classList.contains('muted') ? '🔈' : '🔇'; });

/* tilt effect + make <a.play> clickable via Enter */
cards.forEach((card, idx) => {
  card.addEventListener('pointermove', e => {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 14; const rotX = (py - 0.5) * -10;
    card.style.transform = `perspective(900px) translateZ(6px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
  });
  card.addEventListener('pointerleave', ()=>card.style.transform = '');
  // Open on click: follow the anchor inside
  card.addEventListener('click', (e)=>{
    const a = card.querySelector('a.play');
    if(a) { window.location.href = a.getAttribute('href'); }
  });
  // Support keyboard Enter on focused card — trigger the real link
  card.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ const a = card.querySelector('a.play'); if(a) { window.location.href = a.getAttribute('href'); } }
  });
});

/* Keyboard navigation (arrows) + Enter triggers play on focused card */
let focusedIndex = 0;
function focusCard(i){
  focusedIndex = (i + cards.length) % cards.length;
  cards[focusedIndex].focus();
}
document.addEventListener('keydown', (e)=>{
  if(panel.classList.contains('hidden')) return;
  const cols = Math.max(1, Math.floor(panel.clientWidth / (cards[0].offsetWidth + 18)));
  switch(e.key){
    case 'ArrowRight': focusCard(focusedIndex + 1); break;
    case 'ArrowLeft': focusCard(focusedIndex - 1); break;
    case 'ArrowDown': focusCard(focusedIndex + cols); break;
    case 'ArrowUp': focusCard(focusedIndex - cols); break;
    case 'Enter': {
      const a = cards[focusedIndex].querySelector('a.play'); if(a) { window.location.href = a.getAttribute('href'); }
    } break;
    case 'Escape': {
      // go back to hero
      panel.classList.add('hidden');
      enterBtn.style.display = 'inline-block';
      document.querySelector('.hero .tag').style.opacity=1;
    } break;
  }
});

/* LED pulse */
let t = 0;
function pulse(){
  t += 0.02;
  leds.forEach((led,i)=>{
    const off = Math.sin(t + i*0.9) * 0.5 + 0.5;
    led.style.opacity = 0.2 + off*0.9;
    if(i===0) led.style.background = `rgba(255,62,197,${0.85*off})`;
  });
  requestAnimationFrame(pulse);
}
pulse();
