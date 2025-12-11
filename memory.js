// memory.js — Logic for Memory Game Neon Pink

const board = document.getElementById('board');
const difficultySelect = document.getElementById('difficulty');
const movesCounter = document.getElementById('moves');
const overlay = document.getElementById('overlay');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const resetBtn = document.getElementById('resetBtn');

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;

function generateCards(difficulty) {
    let pairCount = 4;
    if (difficulty === 'medium') pairCount = 6;
    if (difficulty === 'hard') pairCount = 8;

    const symbols = ['😀','🚀','🔥','⭐','🌙','❄️','⚡','💀','🎵','🍀','❤️','🎯'].slice(0, pairCount);
    const cards = [...symbols, ...symbols];
    return cards.sort(() => Math.random() - 0.5);
}

function buildBoard() {
    const difficulty = difficultySelect.value;
    const cards = generateCards(difficulty);

    const gridSize = Math.sqrt(cards.length);
    board.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    board.innerHTML = '';
    overlay.classList.add('hidden');
    firstCard = secondCard = null;
    lockBoard = true; // Lock until initial reveal
    moves = 0;
    movesCounter.textContent = moves;

    cards.forEach(symbol => {
        const card = document.createElement('div');
        card.className = 'card revealed';
        card.dataset.symbol = symbol;
        card.textContent = symbol;
        board.appendChild(card);
    });

    // Show cards briefly, then hide
    setTimeout(() => {
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('revealed');
            card.textContent = '';
        });
        lockBoard = false;
    }, 2500);
}

function revealCard(card) {
    if (lockBoard || card.classList.contains('revealed') || card.classList.contains('matched')) return;

    card.classList.add('revealed');
    card.textContent = card.dataset.symbol;

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    moves++;
    movesCounter.textContent = moves;
    checkMatch();
}

function checkMatch() {
    lockBoard = true;
    if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        resetTurn();
        checkWin();
    } else {
        setTimeout(() => {
            firstCard.classList.remove('revealed');
            firstCard.textContent = '';
            secondCard.classList.remove('revealed');
            secondCard.textContent = '';
            resetTurn();
        }, 700);
    }
}

function resetTurn() {
    firstCard = secondCard = null;
    lockBoard = false;
}

function checkWin() {
    const allMatched = [...document.querySelectorAll('.card')].every(c => c.classList.contains('matched'));
    if (allMatched) overlay.classList.remove('hidden');
}

nextBtn.addEventListener('click', buildBoard);
backBtn.addEventListener('click', () => window.location.href='../index.html');
resetBtn.addEventListener('click', buildBoard);
difficultySelect.addEventListener('change', buildBoard);

buildBoard();
