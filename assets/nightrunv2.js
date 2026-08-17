// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resizeCanvas() {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
}
resizeCanvas();

let gameState = 'PLAYING';

// Touch / Joystick control
let touchPos = null;
let isTouching = false;

// Safe Zone
const safeZoneWidth = 100;

// Player (Jimothy)
const player = {
    x: 40,
    y: height / 2,
    radius: 12,
    speed: 3
};

// Target (Vending Machine)
const goal = {
    x: 0,
    y: 0,
    w: 30,
    h: 50
};

// Cougars / Spotlights
const cougars = [
    { x: 0.3, y: 0.25, angle: 0, rotSpeed: 0.02, range: 130, fov: Math.PI / 4 },
    { x: 0.55, y: 0.7, angle: Math.PI, rotSpeed: -0.015, range: 150, fov: Math.PI / 3 },
    { x: 0.75, y: 0.3, angle: Math.PI / 2, rotSpeed: 0.025, range: 120, fov: Math.PI / 4 }
];

function initPositions() {
    player.x = 40;
    player.y = height / 2;
    goal.x = width - 45;
    goal.y = height / 2 - 25;
}
initPositions();

// Event Listeners for Touch and Mouse Controls
window.addEventListener('resize', () => { resizeCanvas(); initPositions(); });

function handlePointerDown(e) {
    isTouching = true;
    updatePointerPos(e);
}
function handlePointerMove(e) {
    if (isTouching) updatePointerPos(e);
}
function handlePointerUp() {
    isTouching = false;
    touchPos = null;
}

function updatePointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    touchPos = {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

canvas.addEventListener('touchstart', handlePointerDown);
canvas.addEventListener('touchmove', handlePointerMove);
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('mouseup', handlePointerUp);

function update() {
    if (gameState !== 'PLAYING') return;

    // Player Movement towards pointer
    if (touchPos) {
        const dx = touchPos.x - player.x;
        const dy = touchPos.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
            player.x += (dx / dist) * player.speed;
            player.y += (dy / dist) * player.speed;
        }
    }

    // Keep inside bounds
    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

    // Win Condition
    if (player.x + player.radius > goal.x &&
        player.x - player.radius < goal.x + goal.w &&
        player.y + player.radius > goal.y &&
        player.y - player.radius < goal.y + goal.h) {
        gameState = 'WIN';
        document.getElementById('winModal').classList.remove('hidden');
    }

    // Rotate spotlights & check detection (only outside Safe Zone)
    const inSafeZone = player.x <= safeZoneWidth;

    cougars.forEach(c => {
        c.angle += c.rotSpeed;

        if (!inSafeZone) {
            const cx = c.x * width;
            const cy = c.y * height;
            const dx = player.x - cx;
            const dy = player.y - cy;
            const dist = Math.hypot(dx, dy);

            if (dist < c.range) {
                let angleToPlayer = Math.atan2(dy, dx);
                let diff = angleToPlayer - c.angle;
                
                // Normalize angle
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < c.fov / 2) {
                    gameState = 'LOSE';
                    document.getElementById('loseModal').classList.remove('hidden');
                }
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    // Safe Zone
    ctx.fillStyle = 'rgba(46, 204, 113, 0.1)';
    ctx.fillRect(0, 0, safeZoneWidth, height);
    ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, safeZoneWidth, height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#2ecc71';
    ctx.font = '12px sans-serif';
    ctx.fillText('SAFE ZONE', 10, 20);

    // Vending Machine (Goal)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(goal.x + 5, goal.y + 5, goal.w - 10, 15);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(goal.x + 5, goal.y + 25, 8, 8);

    // Cougars & Spotlights
    cougars.forEach(c => {
        const cx = c.x * width;
        const cy = c.y * height;

        // Spotlight Cone
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, c.range, c.angle - c.fov / 2, c.angle + c.fov / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(241, 196, 15, 0.25)';
        ctx.fill();

        // Cougar icon/marker
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#d35400';
        ctx.fill();
    });

    // Player (Jimothy the Raccoon)
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#7f8c8d';
    ctx.fill();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Eyes / Mask details
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x - 6, player.y - 3, 12, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x - 4, player.y - 2, 2, 2);
    ctx.fillRect(player.x + 2, player.y - 2, 2, 2);
}

function resetGame() {
    initPositions();
    gameState = 'PLAYING';
    document.getElementById('winModal').classList.add('hidden');
    document.getElementById('loseModal').classList.add('hidden');
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
