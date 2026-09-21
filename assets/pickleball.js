const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- SYNTHESIZED WEB AUDIO API SOUND ENGINE ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

const SoundFX = {
    playPaddleHit: function(pitchMod = 1.0) {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320 * pitchMod, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
    },
    playWallHit: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    },
    playScore: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    },
    playWhistle: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2800, now);
        osc.frequency.setValueAtTime(3200, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }
};

// Dimensions
const WIDTH = 960;
const HEIGHT = 540;

// Game State
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let playerScore = 0;
let aiScore = 0;
let rallyCount = 0;
let winningScore = 11;

// Court Dimensions (Top-Down 2D Pickleball Court Perspective)
const court = {
    x: 80,
    y: 60,
    width: 800,
    height: 420,
    netX: WIDTH / 2,
    kitchenWidth: 140
};

// Entities
let ball = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: 10,
    speed: 6.5,
    active: false
};

let player = {
    x: 140,
    y: HEIGHT / 2,
    width: 14,
    height: 80,
    vy: 0,
    score: 0
};

let ai = {
    x: WIDTH - 154,
    y: HEIGHT / 2,
    width: 14,
    height: 80,
    speed: 4.8,
    score: 0
};

// Input handling
let keys = {};
let mouseTargetY = HEIGHT / 2;

window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if(['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseTargetY = e.clientY - rect.top;
});

canvas.addEventListener('touchmove', e => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        mouseTargetY = e.touches[0].clientY - rect.top;
    }
    e.preventDefault();
}, { passive: false });

document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    SoundFX.playWhistle();
    startMatch();
});

document.getElementById('exit-btn').addEventListener('click', () => {
    initAudio();
    gotoMenu();
});

function startMatch() {
    document.getElementById('menu-overlay').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('exit-btn').style.display = 'inline-block';
    }, 300);

    playerScore = 0;
    aiScore = 0;
    rallyCount = 0;
    updateUI();
    resetRally(true);
    gameState = 'PLAYING';

    requestAnimationFrame(gameLoop);
}

function gotoMenu() {
    gameState = 'MENU';
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = 'Pickleball Pro Tour';
    overlay.querySelector('p').textContent = 'Experience fast-paced arcade pickleball! Use mouse/keyboard or touch to play. First to 11 points wins!';
    document.getElementById('start-btn').textContent = 'Serve Match';
    document.getElementById('exit-btn').style.display = 'none';
}

function endMatch(winner) {
    gameState = 'GAMEOVER';
    SoundFX.playScore();
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = winner === 'PLAYER' ? '🏆 Victory!' : 'Match Over - AI Wins';
    overlay.querySelector('p').textContent = `Final Score — You: ${playerScore} | AI: ${aiScore}. Outstanding rallies!`;
    document.getElementById('start-btn').textContent = 'Play Again';
}

function resetRally(playerServing) {
    ball.x = playerServing ? court.x + 150 : court.x + court.width - 150;
    ball.y = HEIGHT / 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.active = false;
    rallyCount = 0;
    updateUI();

    setTimeout(() => {
        if (gameState !== 'PLAYING') return;
        let angle = (Math.random() * 0.6 - 0.3);
        let dir = playerServing ? 1 : -1;
        ball.vx = Math.cos(angle) * ball.speed * dir;
        ball.vy = Math.sin(angle) * ball.speed;
        ball.active = true;
    }, 900);
}

function updateUI() {
    document.getElementById('player-score').textContent = playerScore;
    document.getElementById('ai-score').textContent = aiScore;
    document.getElementById('rally-display').textContent = `Rally: ${rallyCount} ⚡`;
}

// Main Game Loop
function gameLoop() {
    if (gameState !== 'PLAYING') return;

    update();
    render();

    requestAnimationFrame(gameLoop);
}

function update() {
    // --- PLAYER MOVEMENT ---
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y -= 7.5;
    } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y += 7.5;
    } else {
        // Smooth interpolation towards mouse/touch Y position
        player.y += (mouseTargetY - player.y) * 0.15;
    }

    // Restrict player inside their half & court boundary
    player.y = Math.max(court.y + player.height / 2, Math.min(court.y + court.height - player.height / 2, player.y));

    // --- AI MOVEMENT ---
    let targetAiY = ball.y;
    if (ball.vx > 0) {
        // Track ball with slight imperfect reaction time
        ai.y += (targetAiY - ai.y) * 0.12;
    } else {
        // Return to center position when ball is on player side
        ai.y += ((HEIGHT / 2) - ai.y) * 0.05;
    }
    ai.y = Math.max(court.y + ai.height / 2, Math.min(court.y + court.height - ai.height / 2, ai.y));

    // --- BALL PHYSICS ---
    if (ball.active) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Top & Bottom Court Wall bounces
        if (ball.y - ball.radius <= court.y) {
            ball.y = court.y + ball.radius;
            ball.vy *= -1;
            SoundFX.playWallHit();
        } else if (ball.y + ball.radius >= court.y + court.height) {
            ball.y = court.y + court.height - ball.radius;
            ball.vy *= -1;
            SoundFX.playWallHit();
        }

        // --- PLAYER PADDLE COLLISION ---
        if (ball.x - ball.radius <= player.x + player.width / 2 &&
            ball.x + ball.radius >= player.x - player.width / 2 &&
            ball.y >= player.y - player.height / 2 &&
            ball.y <= player.y + player.height / 2) {
            
            rallyCount++;
            SoundFX.playPaddleHit(1.0 + rallyCount * 0.02);

            let hitOffset = (ball.y - player.y) / (player.height / 2);
            let returnAngle = hitOffset * (Math.PI / 3); // Max 60 degree angle
            let currentSpeed = Math.min(13, Math.hypot(ball.vx, ball.vy) + 0.35);

            ball.vx = Math.cos(returnAngle) * currentSpeed;
            ball.vy = Math.sin(returnAngle) * currentSpeed;
            ball.x = player.x + player.width / 2 + ball.radius;
            updateUI();
        }

        // --- AI PADDLE COLLISION ---
        if (ball.x + ball.radius >= ai.x - ai.width / 2 &&
            ball.x - ball.radius <= ai.x + ai.width / 2 &&
            ball.y >= ai.y - ai.height / 2 &&
            ball.y <= ai.y + ai.height / 2) {
            
            rallyCount++;
            SoundFX.playPaddleHit(0.9 + rallyCount * 0.02);

            let hitOffset = (ball.y - ai.y) / (ai.height / 2);
            let returnAngle = hitOffset * (Math.PI / 3);
            let currentSpeed = Math.min(13, Math.hypot(ball.vx, ball.vy) + 0.35);

            ball.vx = -Math.cos(returnAngle) * currentSpeed;
            ball.vy = Math.sin(returnAngle) * currentSpeed;
            ball.x = ai.x - ai.width / 2 - ball.radius;
            updateUI();
        }

        // --- SCORING DETECTION ---
        if (ball.x < court.x) {
            // AI Scores
            aiScore++;
            SoundFX.playScore();
            updateUI();
            if (aiScore >= winningScore) {
                endMatch('AI');
            } else {
                resetRally(false);
            }
        } else if (ball.x > court.x + court.width) {
            // Player Scores
            playerScore++;
            SoundFX.playScore();
            updateUI();
            if (playerScore >= winningScore) {
                endMatch('PLAYER');
            } else {
                resetRally(true);
            }
        }
    }
}

// Render Graphics
function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // --- DRAW PICKLEBALL COURT ---
    // Outer Asphalt / Court Surround
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Court Surface (Dark Turquoise / Blue)
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(court.x, court.y, court.width, court.height);

    // Kitchen / Non-Volley Zones (Light Blue shading)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(court.netX - court.kitchenWidth / 2, court.y, court.kitchenWidth, court.height);

    // Court Boundary Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(court.x, court.y, court.width, court.height);

    // Kitchen Center Lines & Service lines
    ctx.beginPath();
    // Kitchen left boundary
    ctx.moveTo(court.netX - court.kitchenWidth / 2, court.y);
    ctx.lineTo(court.netX - court.kitchenWidth / 2, court.y + court.height);
    // Kitchen right boundary
    ctx.moveTo(court.netX + court.kitchenWidth / 2, court.y);
    ctx.lineTo(court.netX + court.kitchenWidth / 2, court.y + court.height);
    // Center service divider line (left side)
    ctx.moveTo(court.x, court.y + court.height / 2);
    ctx.lineTo(court.netX - court.kitchenWidth / 2, court.y + court.height / 2);
    // Center service divider line (right side)
    ctx.moveTo(court.netX + court.kitchenWidth / 2, court.y + court.height / 2);
    ctx.lineTo(court.x + court.width, court.y + court.height / 2);
    ctx.stroke();

    // --- DRAW NET ---
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(court.netX, court.y - 10);
    ctx.lineTo(court.netX, court.y + court.height + 10);
    ctx.stroke();

    // Net mesh pattern visual
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let yPos = court.y; yPos <= court.y + court.height; yPos += 12) {
        ctx.moveTo(court.netX - 5, yPos);
        ctx.lineTo(court.netX + 5, yPos);
    }
    ctx.stroke();

    // --- DRAW PLAYER PADDLE ---
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    
    // Player Composite Paddle (Composite face with comfort grip)
    ctx.fillStyle = '#10b981'; // Vibrant green pickleball paddle
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);

    // --- DRAW AI PADDLE ---
    ctx.fillStyle = '#ef4444'; // Red pro paddle for AI
    ctx.fillRect(ai.x - ai.width / 2, ai.y - ai.height / 2, ai.width, ai.height);
    ctx.strokeRect(ai.x - ai.width / 2, ai.y - ai.height / 2, ai.width, ai.height);

    // --- DRAW PICKLEBALL (Polymer perforated ball) ---
    ctx.fillStyle = '#facc15'; // Neon yellow-green pickleball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Perforation dots indicator on ball
    ctx.fillStyle = '#854d0e';
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 2, 1.2, 0, Math.PI * 2);
    ctx.arc(ball.x + 2, ball.y + 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}
