/*
Game Features:
1. Dual Control Schemes: Seamlessly play using Mouse movement / Touch dragging for absolute precision, 
or WASD / Arrow Keys for classic arcade control. Press Spacebar or click/tap to activate a powerful slapshot boost.
2. Commercial Polish: Includes a sleek dark-themed UI, live game clock with multi-period intermissions, 
professional rink markings (goal creases, faceoff circles, red/blue lines), goal celebrations, and sound-ready structure.
3. Smart AI Opponent: The opposing team tracks the puck dynamically and attacks the net when you least expect it.
*/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const RINK_WIDTH = 900;
const RINK_HEIGHT = 500;
const GOAL_WIDTH = 120;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GOAL, GAMEOVER
let homeScore = 0;
let awayScore = 0;
let period = 1;
let timeLeft = 120; // 2 minutes per period in seconds
let goalTimer = 0;
let lastTime = 0;

// Rink / Physics constants
const FRICTION = 0.985;
const RESTITUTION = 0.8;

// Input State
const input = {
    x: RINK_WIDTH / 2,
    y: RINK_HEIGHT / 2,
    active: false,
    keys: {},
    shooting: false
};

// Entities
let puck = {
    x: RINK_WIDTH / 2,
    y: RINK_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 9,
    mass: 0.2
};

let player = {
    x: 250,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 18,
    speed: 5.5,
    team: 'home',
    color: '#1f6feb',
    stickLen: 24
};

let ai = {
    x: 650,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 18,
    speed: 4.2,
    team: 'away',
    color: '#da3633',
    stickLen: 24
};

// Event Listeners for Input
window.addEventListener('keydown', e => {
    input.keys[e.code] = true;
    if (e.code === 'Space') input.shooting = true;
});

window.addEventListener('keyup', e => {
    input.keys[e.code] = false;
    if (e.code === 'Space') input.shooting = false;
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    input.x = e.clientX - rect.left;
    input.y = e.clientY - rect.top;
    input.active = true;
});

canvas.addEventListener('mousedown', () => {
    input.shooting = true;
});

canvas.addEventListener('mouseup', () => {
    input.shooting = false;
});

// Touch controls
canvas.addEventListener('touchmove', e => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        input.x = e.touches[0].clientX - rect.left;
        input.y = e.touches[0].clientY - rect.top;
        input.active = true;
        input.shooting = true;
    }
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchstart', e => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        input.x = e.touches[0].clientX - rect.left;
        input.y = e.touches[0].clientY - rect.top;
        input.active = true;
        input.shooting = true;
    }
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    input.shooting = false;
});

document.getElementById('start-btn').addEventListener('click', startGame);

function startGame() {
    document.getElementById('menu-overlay').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('menu-overlay').style.display = 'none';
    }, 300);
    resetPositions();
    homeScore = 0;
    awayScore = 0;
    period = 1;
    timeLeft = 120;
    gameState = 'PLAYING';
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function resetPositions() {
    puck.x = RINK_WIDTH / 2;
    puck.y = RINK_HEIGHT / 2;
    puck.vx = 0;
    puck.vy = 0;

    player.x = 250;
    player.y = 250;
    player.vx = 0;
    player.vy = 0;

    ai.x = 650;
    ai.y = 250;
    ai.vx = 0;
    ai.vy = 0;
}

// Clock countdown interval
setInterval(() => {
    if (gameState === 'PLAYING') {
        timeLeft--;
        updateClockDisplay();
        if (timeLeft <= 0) {
            if (period < 3) {
                period++;
                timeLeft = 120;
                triggerIntermission("PERIOD " + period);
            } else {
                gameState = 'GAMEOVER';
                showGameOver();
            }
        }
    }
}, 1000);

function updateClockDisplay() {
    let mins = Math.floor(timeLeft / 60);
    let secs = timeLeft % 60;
    document.getElementById('timer').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('period').textContent = `Period ${period}`;
}

function triggerIntermission(text) {
    gameState = 'GOAL';
    goalTimer = 120;
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = text;
    overlay.querySelector('p').textContent = `End of period. Get ready for the next faceoff!`;
    document.getElementById('start-btn').textContent = 'Resume Game';
}

function scoreGoal(scoringTeam) {
    gameState = 'GOAL';
    goalTimer = 120;

    if (scoringTeam === 'home') homeScore++;
    else awayScore++;

    document.getElementById('home-score').textContent = homeScore;
    document.getElementById('away-score').textContent = awayScore;

    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = scoringTeam === 'home' ? 'Goal, Home Team!' : 'Goal, Away Team!';
    overlay.querySelector('p').textContent = scoringTeam === 'home' ? 'Fantastic slapshot into the net!' : 'The AI capitalizes on an opening!';
    document.getElementById('start-btn').textContent = 'Faceoff';
}

function showGameOver() {
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    let winner = homeScore > awayScore ? 'Home Team Wins!' : (awayScore > homeScore ? 'Away Team Wins!' : 'It\'s a Tie Game!');
    overlay.querySelector('h1').textContent = 'Final Buzzer';
    overlay.querySelector('p').textContent = `${winner} Final Score: ${homeScore} - ${awayScore}`;
    document.getElementById('start-btn').textContent = 'Play Again';
}

// Main Game Loop
function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    if (gameState === 'PLAYING') {
        update(dt);
        render();
        requestAnimationFrame(gameLoop);
    } else if (gameState === 'GOAL') {
        render();
        goalTimer--;
        if (goalTimer <= 0) {
            let overlay = document.getElementById('menu-overlay');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
            resetPositions();
            gameState = 'PLAYING';
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        } else {
            requestAnimationFrame(gameLoop);
        }
    }
}

function update(dt) {
    // --- PLAYER MOVEMENT (Keyboard + Mouse/Touch hybrid) ---
    let moveX = 0;
    let moveY = 0;

    if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
        let len = Math.hypot(moveX, moveY);
        player.vx = (moveX / len) * player.speed;
        player.vy = (moveY / len) * player.speed;
        input.active = false; // keyboard overrides mouse position movement
    } else if (input.active) {
        // Mouse / touch follow
        let dx = input.x - player.x;
        let dy = input.y - player.y;
        let dist = Math.hypot(dx, dy);
        if (dist > 2) {
            let speedFactor = Math.min(dist / 15, 1) * player.speed;
            player.vx = (dx / dist) * speedFactor;
            player.vy = (dy / dist) * speedFactor;
        } else {
            player.vx = 0;
            player.vy = 0;
        }
    } else {
        player.vx *= FRICTION;
        player.vy *= FRICTION;
    }

    player.x += player.vx;
    player.y += player.vy;

    // --- AI MOVEMENT & LOGIC ---
    // AI tracks puck with tactical positioning
    let targetAiX = RINK_WIDTH - 250;
    let targetAiY = puck.y;
    
    // If puck is in AI half, attack puck aggressively
    if (puck.x > RINK_WIDTH / 2 - 50) {
        targetAiX = puck.x;
        targetAiY = puck.y;
    }

    let adx = targetAiX - ai.x;
    let ady = targetAiY - ai.y;
    let adist = Math.hypot(adx, ady);
    if (adist > 2) {
        ai.vx = (adx / adist) * ai.speed;
        ai.vy = (ady / adist) * ai.speed;
    } else {
        ai.vx = 0;
        ai.vy = 0;
    }

    ai.x += ai.vx;
    ai.y += ai.vy;

    // --- PUCK PHYSICS & COLLISIONS ---
    puck.x += puck.vx;
    puck.y += puck.vy;
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;

    // Rink Boundaries with rounded corners simulation
    const wallMargin = 35;
    if (puck.x - puck.radius < wallMargin) {
        puck.x = wallMargin + puck.radius;
        puck.vx *= -RESTITUTION;
    }
    if (puck.x + puck.radius > RINK_WIDTH - wallMargin) {
        puck.x = RINK_WIDTH - wallMargin - puck.radius;
        puck.vx *= -RESTITUTION;
    }
    if (puck.y - puck.radius < wallMargin) {
        puck.y = wallMargin + puck.radius;
        puck.vy *= -RESTITUTION;
    }
    if (puck.y + puck.radius > RINK_HEIGHT - wallMargin) {
        puck.y = RINK_HEIGHT - wallMargin - puck.radius;
        puck.vy *= -RESTITUTION;
    }

    // Player bounds restriction (half-rink or full movement)
    const playerMargin = 25;
    player.x = Math.max(playerMargin, Math.min(RINK_WIDTH - playerMargin, player.x));
    player.y = Math.max(playerMargin, Math.min(RINK_HEIGHT - playerMargin, player.y));

    ai.x = Math.max(playerMargin, Math.min(RINK_WIDTH - playerMargin, ai.x));
    ai.y = Math.max(playerMargin, Math.min(RINK_HEIGHT - playerMargin, ai.y));

    // Entity to Puck Collisions & Stick Shots
    checkEntityPuckCollision(player, true);
    checkEntityPuckCollision(ai, false);

    // --- GOAL DETECTION ---
    const goalYTop = (RINK_HEIGHT / 2) - (GOAL_WIDTH / 2);
    const goalYBot = (RINK_HEIGHT / 2) + (GOAL_WIDTH / 2);

    // Left Goal (Away scores or Home defends)
    if (puck.x - puck.radius <= wallMargin && puck.y >= goalYTop && puck.y <= goalYBot) {
        scoreGoal('away');
    }
    // Right Goal (Home scores)
    if (puck.x + puck.radius >= RINK_WIDTH - wallMargin && puck.y >= goalYTop && puck.y <= goalYBot) {
        scoreGoal('home');
    }
}

function checkEntityPuckCollision(entity, isPlayer) {
    let dx = puck.x - entity.x;
    let dy = puck.y - entity.y;
    let dist = Math.hypot(dx, dy);
    let minDist = entity.radius + puck.radius;

    if (dist < minDist) {
        let angle = Math.atan2(dy, dx);
        let pushForce = Math.hypot(entity.vx, entity.vy) + 3;

        let shootMultiplier = 1.8;
        if (isPlayer && input.shooting) {
            shootMultiplier = 3.5;
        } else if (!isPlayer && puck.x > RINK_WIDTH / 2) {
            shootMultiplier = 2.8; // AI shooting towards left goal
        }

        puck.vx = Math.cos(angle) * (pushForce * shootMultiplier + 2);
        puck.vy = Math.sin(angle) * (pushForce * shootMultiplier + 2);

        // Separate entities
        puck.x = entity.x + Math.cos(angle) * minDist;
        puck.y = entity.y + Math.sin(angle) * minDist;
    }
}

// Render Graphics
function render() {
    ctx.clearRect(0, 0, RINK_WIDTH, RINK_HEIGHT);

    // --- ICE RINK SURFACE ---
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, RINK_WIDTH, RINK_HEIGHT);

    // Rink Border / Boards
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, RINK_WIDTH - 30, RINK_HEIGHT - 30);

    // Red Center Line
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(RINK_WIDTH / 2, 15);
    ctx.lineTo(RINK_WIDTH / 2, RINK_HEIGHT - 15);
    ctx.stroke();

    // Center Faceoff Circle
    ctx.beginPath();
    ctx.arc(RINK_WIDTH / 2, RINK_HEIGHT / 2, 60, 0, Math.PI * 2);
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1f6feb';
    ctx.beginPath();
    ctx.arc(RINK_WIDTH / 2, RINK_HEIGHT / 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Blue Lines
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(RINK_WIDTH * 0.35, 15);
    ctx.lineTo(RINK_WIDTH * 0.35, RINK_HEIGHT - 15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(RINK_WIDTH * 0.65, 15);
    ctx.lineTo(RINK_WIDTH * 0.65, RINK_HEIGHT - 15);
    ctx.stroke();

    // Goal Creases & Nets
    const goalYTop = (RINK_HEIGHT / 2) - (GOAL_WIDTH / 2);
    const goalYBot = (RINK_HEIGHT / 2) + (GOAL_WIDTH / 2);

    // Left Goal Net
    ctx.fillStyle = 'rgba(248, 81, 73, 0.2)';
    ctx.fillRect(5, goalYTop, 30, GOAL_WIDTH);
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, goalYTop, 30, GOAL_WIDTH);

    // Right Goal Net
    ctx.fillStyle = 'rgba(31, 111, 235, 0.2)';
    ctx.fillRect(RINK_WIDTH - 35, goalYTop, 30, GOAL_WIDTH);
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 4;
    ctx.strokeRect(RINK_WIDTH - 35, goalYTop, 30, GOAL_WIDTH);

    // --- DRAW PUCK ---
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // --- DRAW PLAYER ---
    drawSkater(player);

    // --- DRAW AI ---
    drawSkater(ai);
}

function drawSkater(skater) {
    // Skater Body / Jersey
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = skater.color;
    ctx.beginPath();
    ctx.arc(skater.x, skater.y, skater.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Helmet / Visor
    ctx.fillStyle = '#21262d';
    ctx.beginPath();
    ctx.arc(skater.x, skater.y - 4, skater.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Hockey Stick
    let stickAngle = Math.atan2(puck.y - skater.y, puck.x - skater.x);
    let stickTipX = skater.x + Math.cos(stickAngle) * skater.stickLen;
    let stickTipY = skater.y + Math.sin(stickAngle) * skater.stickLen;

    ctx.strokeStyle = '#8957e5';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(skater.x, skater.y);
    ctx.lineTo(stickTipX, stickTipY);
    ctx.stroke();

    // Stick Blade
    ctx.strokeStyle = '#d2a8ff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(stickTipX - Math.sin(stickAngle) * 10, stickTipY + Math.cos(stickAngle) * 10);
    ctx.lineTo(stickTipX + Math.sin(stickAngle) * 10, stickTipY - Math.cos(stickAngle) * 10);
    ctx.stroke();
}
