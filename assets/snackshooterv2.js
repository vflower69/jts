// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SNACKS = [
    { emoji: '🫐', color: '#3b82f6' },
    { emoji: '🍓', color: '#ef4444' },
    { emoji: '🍊', color: '#f97316' },
    { emoji: '🧀', color: '#eab308' },
    { emoji: '🍇', color: '#a855f7' }
];

const COLS = 8;
const ROWS = 11;
let RADIUS = 20;
let grid = [];
let score = 0;

let currentSnack = null;
let nextSnack = null;
let projectile = null;
let aimAngle = -Math.PI / 2;
let isTouching = false;
let gameState = 'PLAYING';

function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    RADIUS = canvas.width / (COLS * 2 + 1);
}

function getRandomSnack() {
    return SNACKS[Math.floor(Math.random() * SNACKS.length)];
}

function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < (r % 2 === 0 ? COLS : COLS - 1); c++) {
            grid[r][c] = (r < 4) ? getRandomSnack() : null;
        }
    }
}

function updateNextUI() {
    const el = document.getElementById('nextBubble');
    if (nextSnack) {
        el.innerText = nextSnack.emoji;
        el.style.backgroundColor = nextSnack.color;
    }
}

function resetGame() {
    score = 0;
    document.getElementById('score').innerText = score;
    document.getElementById('gameOverModal').classList.add('hidden');
    initGrid();
    currentSnack = getRandomSnack();
    nextSnack = getRandomSnack();
    updateNextUI();
    projectile = null;
    gameState = 'PLAYING';
}

function getBubblePos(r, c) {
    const isOdd = r % 2 !== 0;
    const x = isOdd ? (c + 1) * (RADIUS * 2) : (c + 0.5) * (RADIUS * 2);
    const y = (r + 0.8) * (RADIUS * 1.732);
    return { x, y };
}

function handlePointer(e) {
    if (gameState !== 'PLAYING' || projectile) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const touchX = clientX - rect.left;
    const touchY = clientY - rect.top;

    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - RADIUS * 2;

    let dx = touchX - shooterX;
    let dy = touchY - shooterY;

    if (dy < -10) {
        aimAngle = Math.atan2(dy, dx);
        aimAngle = Math.max(-Math.PI + 0.2, Math.min(-0.2, aimAngle));
    }
}

canvas.addEventListener('touchstart', (e) => { isTouching = true; handlePointer(e); });
canvas.addEventListener('touchmove', (e) => { if (isTouching) handlePointer(e); });
canvas.addEventListener('touchend', () => {
    if (isTouching && !projectile && gameState === 'PLAYING') launchProjectile();
    isTouching = false;
});

canvas.addEventListener('mousedown', (e) => { isTouching = true; handlePointer(e); });
canvas.addEventListener('mousemove', (e) => { if (isTouching) handlePointer(e); });
canvas.addEventListener('mouseup', () => {
    if (isTouching && !projectile && gameState === 'PLAYING') launchProjectile();
    isTouching = false;
});

function launchProjectile() {
    const speed = 16;
    projectile = {
        x: canvas.width / 2,
        y: canvas.height - RADIUS * 2,
        vx: Math.cos(aimAngle) * speed,
        vy: Math.sin(aimAngle) * speed,
        snack: currentSnack
    };
}

function snapToGrid(proj) {
    let bestR = 0, bestC = 0, minDist = Infinity;
    for (let r = 0; r < ROWS; r++) {
        const maxC = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < maxC; c++) {
            if (!grid[r][c]) {
                const pos = getBubblePos(r, c);
                const d = Math.hypot(pos.x - proj.x, pos.y - proj.y);
                if (d < minDist) {
                    minDist = d;
                    bestR = r;
                    bestC = c;
                }
            }
        }
    }
    grid[bestR][bestC] = proj.snack;
    checkMatches(bestR, bestC);

    currentSnack = nextSnack;
    nextSnack = getRandomSnack();
    updateNextUI();
    projectile = null;

    for (let c = 0; c < grid[ROWS - 1].length; c++) {
        if (grid[ROWS - 1][c]) {
            gameState = 'GAMEOVER';
            document.getElementById('gameOverModal').classList.remove('hidden');
            break;
        }
    }
}

function checkMatches(startR, startC) {
    const target = grid[startR][startC];
    if (!target) return;

    let matchGroup = [];
    let visited = Array.from({ length: ROWS }, () => []);

    function floodFill(r, c) {
        if (r < 0 || r >= ROWS || c < 0) return;
        const maxC = r % 2 === 0 ? COLS : COLS - 1;
        if (c >= maxC || visited[r][c] || grid[r][c] !== target) return;

        visited[r][c] = true;
        matchGroup.push({ r, c });

        getNeighbors(r, c).forEach(n => floodFill(n.r, n.c));
    }

    floodFill(startR, startC);

    if (matchGroup.length >= 3) {
        matchGroup.forEach(b => { grid[b.r][b.c] = null; });
        score += matchGroup.length * 10;
        document.getElementById('score').innerText = score;
        dropFloatingBubbles();
    }
}

function getNeighbors(r, c) {
    const isOdd = r % 2 !== 0;
    const offsets = isOdd ?
        [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]] :
        [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
    return offsets.map(([dr, dc]) => ({ r: r + dr, c: c + dc }));
}

function dropFloatingBubbles() {
    let connected = Array.from({ length: ROWS }, () => []);

    function markConnected(r, c) {
        if (r < 0 || r >= ROWS || c < 0) return;
        const maxC = r % 2 === 0 ? COLS : COLS - 1;
        if (c >= maxC || connected[r][c] || !grid[r][c]) return;

        connected[r][c] = true;
        getNeighbors(r, c).forEach(n => markConnected(n.r, n.c));
    }

    for (let c = 0; c < COLS; c++) {
        if (grid[0][c]) markConnected(0, c);
    }

    for (let r = 0; r < ROWS; r++) {
        const maxC = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < maxC; c++) {
            if (grid[r][c] && !connected[r][c]) {
                grid[r][c] = null;
                score += 15;
            }
        }
    }
    document.getElementById('score').innerText = score;
}

function update() {
    if (projectile) {
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;

        if (projectile.x - RADIUS <= 0 || projectile.x + RADIUS >= canvas.width) {
            projectile.vx *= -1;
        }

        if (projectile.y - RADIUS <= 0) {
            snapToGrid(projectile);
            return;
        }

        for (let r = 0; r < ROWS; r++) {
            const maxC = r % 2 === 0 ? COLS : COLS - 1;
            for (let c = 0; c < maxC; c++) {
                if (grid[r][c]) {
                    const pos = getBubblePos(r, c);
                    if (Math.hypot(pos.x - projectile.x, pos.y - projectile.y) < RADIUS * 1.8) {
                        snapToGrid(projectile);
                        return;
                    }
                }
            }
        }
    }
}

function drawBubble(x, y, snack) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, RADIUS - 1), 0, Math.PI * 2);
    ctx.fillStyle = snack.color;
    ctx.fill();

    ctx.font = `${Math.max(10, RADIUS)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(snack.emoji, x, y + 1);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        const maxC = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < maxC; c++) {
            if (grid[r][c]) {
                const pos = getBubblePos(r, c);
                drawBubble(pos.x, pos.y, grid[r][c]);
            }
        }
    }

    const shooterX = canvas.width / 2;
    const shooterY = canvas.height - RADIUS * 2;

    if (!projectile && gameState === 'PLAYING') {
        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.moveTo(shooterX, shooterY);
        ctx.lineTo(shooterX + Math.cos(aimAngle) * 120, shooterY + Math.sin(aimAngle) * 120);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.arc(shooterX, shooterY, Math.max(1, RADIUS + 6), 0, Math.PI * 2);
    ctx.fillStyle = '#4338ca';
    ctx.fill();

    if (currentSnack && !projectile) {
        drawBubble(shooterX, shooterY, currentSnack);
    }

    if (projectile) {
        drawBubble(projectile.x, projectile.y, projectile.snack);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener('resize', resize);

// Initialization Order
resize();
resetGame();
loop();
