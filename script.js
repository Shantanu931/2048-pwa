// script.js - Enhanced 2048 game logic with animations and interactions
const boardEl = document.getElementById('game-board');
const scoreValueEl = document.getElementById('score-value');
const messageEl = document.getElementById('message');

let restartBtn = document.getElementById('restart-btn');
let undoBtn = document.getElementById('undo-btn');
// Initialize bestScore from localStorage or set to 0
let bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
const SIZE = 4;
let grid = [];
let score = 0;
let lastGrid = null;
let lastScore = 0;
let lastAddedPos = null;
let mergedMap = {}; // map "r,c" -> true for merge animation
let gameOver = false;
let gameWon = false;
let userHasInteracted = false; // Track user interaction for haptic feedback

// utility deep copy
function copyGrid(src) {
    return src.map(row => [...row]);
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    restartBtn.addEventListener('click', () => {
        userHasInteracted = true;
        initGame();
    // Initialize best score display
    // (Best score UI removed; still tracked in localStorage)
    });
    undoBtn.addEventListener('click', () => {
        userHasInteracted = true;
        undoMove();
    });
    boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('keydown', (e) => {
        userHasInteracted = true;
        handleKey(e);
    });

    initGame();
});

// initialize / restart
function initGame() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    lastGrid = null;
    lastScore = 0;
    lastAddedPos = null;
    mergedMap = {};
    gameOver = false;
    gameWon = false;
    messageEl.textContent = '';
    addRandomTile();
    addRandomTile();
    render();
    updateScoreDisplay();
}

// add a random tile and return its position
function addRandomTile() {
    const empty = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) empty.push({ r, c });
        }
    }
    if (empty.length === 0) {
        lastAddedPos = null;
        return null;
    }
    const pos = empty[Math.floor(Math.random() * empty.length)];
    grid[pos.r][pos.c] = Math.random() < 0.9 ? 2 : 4;
    lastAddedPos = pos;
    return pos;
}

// helper: slide + combine a compacted row (left-oriented)
function slideCombineRow(row) {
    // compress non-zero
    let arr = row.filter(v => v !== 0);
    let gained = 0;
    let mergedIndices = [];
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
            arr[i] = arr[i] * 2;
            gained += arr[i];
            arr.splice(i + 1, 1);
            mergedIndices.push(i);
        }
    }
    while (arr.length < SIZE) arr.push(0);
    return { newRow: arr, mergedIndices, gained };
}

// movement functions (return boolean moved)
function moveLeftCore() {
    mergedMap = {};
    let moved = false;
    let totalGained = 0;

    for (let r = 0; r < SIZE; r++) {
        const original = [...grid[r]];
        const { newRow, mergedIndices, gained } = slideCombineRow(original);
        grid[r] = newRow;
        if (JSON.stringify(original) !== JSON.stringify(newRow)) moved = true;
        totalGained += gained;
        // record merged positions for animation
        mergedIndices.forEach(ci => {
            mergedMap[`${r},${ci}`] = true;
        });
    }

    if (totalGained > 0) {
        bumpScore(totalGained);
        // Haptic feedback on merge (only if user has interacted)
        if (userHasInteracted && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    return moved;
}

function moveRightCore() {
    mergedMap = {};
    let moved = false;
    let totalGained = 0;

    for (let r = 0; r < SIZE; r++) {
        const original = [...grid[r]];
        const reversed = original.slice().reverse();
        const { newRow, mergedIndices, gained } = slideCombineRow(reversed);
        const finalRow = newRow.slice().reverse();
        grid[r] = finalRow;
        if (JSON.stringify(original) !== JSON.stringify(finalRow)) moved = true;
        totalGained += gained;
        // map merged indices back to final positions
        mergedIndices.forEach(idx => {
            const col = SIZE - 1 - idx;
            mergedMap[`${r},${col}`] = true;
        });
    }

    if (totalGained > 0) {
        bumpScore(totalGained);
        // Haptic feedback on merge (only if user has interacted)
        if (userHasInteracted && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    return moved;
}

function moveUpCore() {
    mergedMap = {};
    let moved = false;
    let totalGained = 0;

    for (let c = 0; c < SIZE; c++) {
        const col = [];
        for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
        const { newRow, mergedIndices, gained } = slideCombineRow(col);
        for (let r = 0; r < SIZE; r++) {
            if (grid[r][c] !== newRow[r]) moved = true;
            grid[r][c] = newRow[r];
        }
        totalGained += gained;
        mergedIndices.forEach(ridx => mergedMap[`${ridx},${c}`] = true);
    }

    if (totalGained > 0) {
        bumpScore(totalGained);
        // Haptic feedback on merge (only if user has interacted)
        if (userHasInteracted && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    return moved;
}

function moveDownCore() {
    mergedMap = {};
    let moved = false;
    let totalGained = 0;

    for (let c = 0; c < SIZE; c++) {
        const col = [];
        for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
        const reversed = col.slice().reverse();
        const { newRow, mergedIndices, gained } = slideCombineRow(reversed);
        const finalCol = newRow.slice().reverse();
        for (let r = 0; r < SIZE; r++) {
            if (grid[r][c] !== finalCol[r]) moved = true;
            grid[r][c] = finalCol[r];
        }
        totalGained += gained;
        mergedIndices.forEach(idx => {
            const rpos = SIZE - 1 - idx;
            mergedMap[`${rpos},${c}`] = true;
        });
    }

    if (totalGained > 0) {
        bumpScore(totalGained);
        // Haptic feedback on merge (only if user has interacted)
        if (userHasInteracted && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    return moved;
}

// score updater with bump animation
function bumpScore(additional) {
    score += additional;
    updateScoreDisplay();
    if (scoreValueEl) {
        scoreValueEl.parentElement.classList.remove('score-bump');
        // force reflow to restart animation
        void scoreValueEl.offsetWidth;
        scoreValueEl.parentElement.classList.add('score-bump');
    }
}

// Update score display and best score
function updateScoreDisplay() {
    if (scoreValueEl) {
        scoreValueEl.textContent = score;
    }
    
    // Update best score if current score is higher
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore.toString());
        // Best score UI removed
    }
}

// handle a move (direction strings 'left','right','up','down')
function handleMove(direction) {
    if (gameOver || gameWon) return;
    // save previous state for undo
    const prevGrid = copyGrid(grid);
    const prevScore = score;

    let moved = false;
    if (direction === 'left') moved = moveLeftCore();
    if (direction === 'right') moved = moveRightCore();
    if (direction === 'up') moved = moveUpCore();
    if (direction === 'down') moved = moveDownCore();

    if (moved) {
        // set undo snapshot
        lastGrid = prevGrid;
        lastScore = prevScore;
        // add new tile and render
        addRandomTile(); // sets lastAddedPos
        render();
        checkGameState();
    } else {
        // no move — clear merged map and lastAdded
        mergedMap = {};
        lastAddedPos = null;
    }
}

// undo
function undoMove() {
    if (!lastGrid) return;
    grid = copyGrid(lastGrid);
    score = lastScore;
    lastGrid = null;
    lastScore = 0;
    lastAddedPos = null;
    mergedMap = {};
    gameOver = false;
    gameWon = false;
    messageEl.textContent = '';
    render();
    updateScoreDisplay();
}

// check win / game over
function hasMoves() {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 0) return true;
            if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
            if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
        }
    }
    return false;
}

function checkGameState() {
    if (grid.some(row => row.includes(2048)) && !gameWon) {
        gameWon = true;
        messageEl.textContent = '🎉 You Win! Amazing!';
        messageEl.style.color = '#10b981';
    } else if (!hasMoves()) {
        gameOver = true;
        messageEl.textContent = '😔 Game Over! Try again?';
        messageEl.style.color = '#ef4444';
    } else {
        messageEl.textContent = '';
    }
}

// rendering: apply classes for new tile and merged tiles
function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const value = grid[r][c];
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.setAttribute('data-value', value || '');
            if (value !== 0) tile.textContent = value;
            // new tile animation
            if (lastAddedPos && lastAddedPos.r === r && lastAddedPos.c === c) {
                tile.classList.add('tile-new');
            }
            // merged animation
            if (mergedMap[`${r},${c}`]) {
                tile.classList.add('tile-merged');
            }
            boardEl.appendChild(tile);
        }
    }
    // update score display
    updateScoreDisplay();
    // clear mergedMap after a short time so animations don't persist
    setTimeout(() => {
        mergedMap = {};
        lastAddedPos = null;
        // remove merge/new classes (re-render to clear if necessary)
        const tiles = boardEl.querySelectorAll('.tile-merged, .tile-new');
        tiles.forEach(t => {
            t.classList.remove('tile-merged', 'tile-new');
        });
    }, 300); // matches CSS animation durations
}

// keyboard handling
function handleKey(e) {
    switch (e.key) {
        case 'ArrowLeft': 
            e.preventDefault();
            handleMove('left'); 
            break;
        case 'ArrowRight': 
            e.preventDefault();
            handleMove('right'); 
            break;
        case 'ArrowUp': 
            e.preventDefault();
            handleMove('up'); 
            break;
        case 'ArrowDown': 
            e.preventDefault();
            handleMove('down'); 
            break;
    }
}

// touch/swipe handling
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    userHasInteracted = true;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
}

function handleTouchEnd(e) {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    
    const minSwipeDistance = 30;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > minSwipeDistance) handleMove('right');
        else if (dx < -minSwipeDistance) handleMove('left');
    } else {
        if (dy > minSwipeDistance) handleMove('down');
        else if (dy < -minSwipeDistance) handleMove('up');
    }
}