// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
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
    playRoll: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.4);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    },
    playPinHit: function(intensity = 1) {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.25 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    },
    playStrike: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, i) => {
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + (i * 0.08));
            gain.gain.setValueAtTime(0.3, now + (i * 0.08));
            gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.08) + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + (i * 0.08));
            osc.stop(now + (i * 0.08) + 0.35);
        });
    },
    playCheer: function() {
        if (!audioCtx) return;
        let now = audioCtx.currentTime;
        let bufferSize = audioCtx.sampleRate * 0.8;
        let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        let output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        let whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = buffer;
        let filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(1.5, now);

        let gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        whiteNoise.start(now);
    }
};

// Game Dimensions
const WIDTH = 900;
const HEIGHT = 550;

// Game States: MENU, AIMING, ROLLING, SCORE_PAUSE, GAMEOVER
let gameState = 'MENU';
let totalScore = 0;
let currentFrame = 1;
let currentThrow = 1;
let standingPinsCount = 10;
let messageTimer = 0;
let messageText = '';

// Lane perspective projection constants
const startX = WIDTH / 2;
const startY = 470;
const alleyTopX1 = 330;
const alleyTopX2 = 570;
const alleyTopY = 110;
const alleyBottomX1 = 150;
const alleyBottomX2 = 750;
const alleyBottomY = 490;

// Ball object
let ball = {
    x: WIDTH / 2,
    y: 470,
    vx: 0,
    vy: -16,
    radius: 22,
    active: false,
    aimAngle: -Math.PI / 2 // pointing straight up (-90 degrees)
};

// Input interaction
let input = {
    dragging: false,
    startX: 0,
    startY: 0,
    currX: WIDTH / 2,
    currY: 470,
    keys: {}
};

// Pins setup
let pins = [];

function initPins() {
    pins = [];
    const pinRadius = 12;
    const pinRows = [
        { count: 4, y: 135, startX: 405, spacing: 30 },
        { count: 3, y: 165, startX: 420, spacing: 30 },
        { count: 2, y: 195, startX: 435, spacing: 30 },
        { count: 1, y: 225, startX: 450, spacing: 0 }
    ];

    pinRows.forEach(row => {
        for (let i = 0; i < row.count; i++) {
            let px = row.startX + (i * row.spacing);
            pins.push({
                x: px,
                y: row.y,
                vx: 0,
                vy: 0,
                radius: pinRadius,
                standing: true,
                fallen: false,
                angle: 0,
                vAngle: 0,
                dead: false
            });
        }
    });
    standingPinsCount = pins.length;
}

// Event Listeners for Keyboard & Mouse/Touch
window.addEventListener('keydown', e => {
    input.keys[e.code] = true;
    if (e.code === 'Space' && gameState === 'AIMING') {
        launchBall();
    }
});

window.addEventListener('keyup', e => {
    input.keys[e.code] = false;
});

canvas.addEventListener('mousedown', e => {
    if (gameState !== 'AIMING') return;
    const rect = canvas.getBoundingClientRect();
    input.dragging = true;
    input.startX = e.clientX - rect.left;
    input.startY = e.clientY - rect.top;
    input.currX = input.startX;
    input.currY = input.startY;
});

canvas.addEventListener('mousemove', e => {
    if (!input.dragging || gameState !== 'AIMING') return;
    const rect = canvas.getBoundingClientRect();
    input.currX = e.clientX - rect.left;
    input.currY = e.clientY - rect.top;

    // Update aim angle directly from mouse drag relative to ball position
    let dx = input.currX - ball.x;
    let dy = input.currY - ball.y;
    ball.aimAngle = Math.atan2(dy, dx);
    // Clamp angle so player can only aim towards the pins (upwards)
    if (ball.aimAngle > -0.1) ball.aimAngle = -0.1;
    if (ball.aimAngle < -Math.PI + 0.1) ball.aimAngle = -Math.PI + 0.1;
});

canvas.addEventListener('mouseup', () => {
    if (!input.dragging || gameState !== 'AIMING') return;
    input.dragging = false;
    launchBall();
});

// Touch support
canvas.addEventListener('touchstart', e => {
    if (gameState !== 'AIMING') return;
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        input.dragging = true;
        input.startX = e.touches[0].clientX - rect.left;
        input.startY = e.touches[0].clientY - rect.top;
        input.currX = input.startX;
        input.currY = input.startY;
    }
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    if (!input.dragging || gameState !== 'AIMING') return;
    const rect = canvas.getBoundingClientRect();
    if (e.touches.length > 0) {
        input.currX = e.touches[0].clientX - rect.left;
        input.currY = e.touches[0].clientY - rect.top;

        let dx = input.currX - ball.x;
        let dy = input.currY - ball.y;
        ball.aimAngle = Math.atan2(dy, dx);
        if (ball.aimAngle > -0.1) ball.aimAngle = -0.1;
        if (ball.aimAngle < -Math.PI + 0.1) ball.aimAngle = -Math.PI + 0.1;
    }
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (!input.dragging || gameState !== 'AIMING') return;
    input.dragging = false;
    launchBall();
});

document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    startGame();
});

document.getElementById('exit-btn').addEventListener('click', () => {
    initAudio();
    gotoMenu();
});

function startGame() {
    document.getElementById('menu-overlay').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('exit-btn').style.display = 'inline-block';
    }, 300);
    totalScore = 0;
    currentFrame = 1;
    currentThrow = 1;
    updateUI();
    initPins();
    resetBall();
    gameState = 'AIMING';
}

function gotoMenu() {
    gameState = 'MENU';
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = 'Strike Arena';
    overlay.querySelector('p').textContent = 'Advanced Arcade Bowling! Adjust position with A/D, aim angle with mouse or W/S, and release.';
    document.getElementById('start-btn').textContent = 'Start Game';
    document.getElementById('exit-btn').style.display = 'none';
}

function resetBall() {
    ball.x = WIDTH / 2;
    ball.y = 470;
    ball.vx = 0;
    ball.vy = -16;
    ball.aimAngle = -Math.PI / 2;
    ball.active = false;
}

function launchBall() {
    initAudio();
    SoundFX.playRoll();
    // Calculate velocity based on current aim angle
    let speed = 16;
    ball.vx = Math.cos(ball.aimAngle) * speed;
    ball.vy = Math.sin(ball.aimAngle) * speed;
    ball.active = true;
    gameState = 'ROLLING';
}

function updateUI() {
    document.getElementById('score-display').textContent = totalScore;
    document.getElementById('frame-display').textContent = `${currentFrame}/10`;
    document.getElementById('pins-display').textContent = standingPinsCount;
}

// Main Game Loop
let lastTime = performance.now();

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

function update(dt) {
    // Keyboard controls for positioning and aim angle
    if (gameState === 'AIMING') {
        if (input.keys['KeyA'] || input.keys['ArrowLeft']) {
            ball.x = Math.max(320, ball.x - 4);
        }
        if (input.keys['KeyD'] || input.keys['ArrowRight']) {
            ball.x = Math.min(580, ball.x + 4);
        }
        if (input.keys['KeyW'] || input.keys['ArrowUp']) {
            ball.aimAngle -= 0.03;
            if (ball.aimAngle < -Math.PI + 0.1) ball.aimAngle = -Math.PI + 0.1;
        }
        if (input.keys['KeyS'] || input.keys['ArrowDown']) {
            ball.aimAngle += 0.03;
            if (ball.aimAngle > -0.1) ball.aimAngle = -0.1;
        }
    }

    if (gameState === 'ROLLING') {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Slight drift damping
        ball.vx *= 0.994;

        // Gutter bounce
        if (ball.x < 290 || ball.x > 610) {
            ball.vx *= -0.45;
        }

        // Check collision with pins
        pins.forEach(pin => {
            if (pin.standing) {
                let dx = ball.x - pin.x;
                let dy = ball.y - pin.y;
                let dist = Math.hypot(dx, dy);
                if (dist < ball.radius + pin.radius) {
                    pin.standing = false;
                    pin.fallen = true;
                    pin.vx = ball.vx * 0.75 + (Math.random() - 0.5) * 4;
                    pin.vy = ball.vy * 0.75 + (Math.random() - 0.5) * 4;
                    pin.vAngle = (Math.random() - 0.5) * 0.3;
                    SoundFX.playPinHit(1.2);
                }
            }
        });

        // Pin-to-pin physics collisions
        pins.forEach((p1, i) => {
            if (p1.fallen && !p1.dead) {
                p1.x += p1.vx;
                p1.y += p1.vy;
                p1.angle += p1.vAngle;
                p1.vx *= 0.95;
                p1.vy *= 0.95;

                for (let j = i + 1; j < pins.length; j++) {
                    let p2 = pins[j];
                    if (p2.standing) {
                        let pdx = p2.x - p1.x;
                        let pdy = p2.y - p1.y;
                        let pdist = Math.hypot(pdx, pdy);
                        if (pdist < p1.radius + p2.radius + 4) {
                            p2.standing = false;
                            p2.fallen = true;
                            p2.vx = p1.vx * 0.8 + (Math.random() - 0.5) * 3;
                            p2.vy = p1.vy * 0.8 + (Math.random() - 0.5) * 3;
                            p2.vAngle = (Math.random() - 0.5) * 0.3;
                            SoundFX.playPinHit(0.8);
                        }
                    }
                }

                if (p1.y < 90 || p1.y > 520 || p1.x < 260 || p1.x > 640) {
                    p1.dead = true;
                }
            }
        });

        // End of roll check
        if (ball.y < 100 || (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && ball.y < 350)) {
            endThrow();
        }
    }

    if (gameState === 'SCORE_PAUSE') {
        messageTimer--;
        if (messageTimer <= 0) {
            proceedNextThrowOrFrame();
        }
    }
}

function endThrow() {
    let standingNow = pins.filter(p => p.standing).length;
    let knockedDown = standingPinsCount - standingNow;
    standingPinsCount = standingNow;

    totalScore += knockedDown;
    pins.forEach(p => { if (p.fallen) p.counted = true; });

    updateUI();

    gameState = 'SCORE_PAUSE';
    messageTimer = 110;

    if (knockedDown === 10 && currentThrow === 1) {
        messageText = "STRIKE! Spectacular!";
        SoundFX.playStrike();
        SoundFX.playCheer();
    } else if (standingPinsCount === 0) {
        messageText = "SPARE! Fantastic Shot!";
        SoundFX.playStrike();
    } else {
        messageText = `Knocked down ${knockedDown} pins!`;
    }
}

function proceedNextThrowOrFrame() {
    if (currentThrow === 1 && standingPinsCount > 0) {
        currentThrow = 2;
        gameState = 'AIMING';
        resetBall();
    } else {
        currentFrame++;
        currentThrow = 1;
        if (currentFrame > 10) {
            gameState = 'GAMEOVER';
            showGameOver();
        } else {
            initPins();
            resetBall();
            gameState = 'AIMING';
        }
    }
    updateUI();
}

function showGameOver() {
    let overlay = document.getElementById('menu-overlay');
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.querySelector('h1').textContent = 'Game Complete!';
    overlay.querySelector('p').textContent = `Final Score: ${totalScore}! Outstanding arcade bowling performance!`;
    document.getElementById('start-btn').textContent = 'Play Again';
    document.getElementById('exit-btn').style.display = 'inline-block';
}

// Render Graphics
function render() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Alley background / Floor
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Wooden Bowling Alley
    ctx.fillStyle = '#d29034';
    ctx.beginPath();
    ctx.moveTo(alleyTopX1, alleyTopY);
    ctx.lineTo(alleyTopX2, alleyTopY);
    ctx.lineTo(alleyBottomX2, alleyBottomY);
    ctx.lineTo(alleyBottomX1, alleyBottomY);
    ctx.closePath();
    ctx.fill();

    // Alley wood grain lines
    ctx.strokeStyle = '#bc7b25';
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
        let x1 = alleyTopX1 + (alleyTopX2 - alleyTopX1) * (i / 6);
        let x2 = alleyBottomX1 + (alleyBottomX2 - alleyBottomX1) * (i / 6);
        ctx.beginPath();
        ctx.moveTo(x1, alleyTopY);
        ctx.lineTo(x2, alleyBottomY);
        ctx.stroke();
    }

    // Gutters
    ctx.fillStyle = '#21262d';
    ctx.beginPath();
    ctx.moveTo(alleyTopX1 - 35, alleyTopY);
    ctx.lineTo(alleyTopX1, alleyTopY);
    ctx.lineTo(alleyBottomX1, alleyBottomY);
    ctx.lineTo(alleyBottomX1 - 50, alleyBottomY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(alleyTopX2, alleyTopY);
    ctx.lineTo(alleyTopX2 + 35, alleyTopY);
    ctx.lineTo(alleyBottomX2 + 50, alleyBottomY);
    ctx.lineTo(alleyBottomX2, alleyBottomY);
    ctx.closePath();
    ctx.fill();

    // Foul line
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(205, 410);
    ctx.lineTo(695, 410);
    ctx.stroke();

    // --- DRAW PINS ---
    pins.forEach(pin => {
        if (!pin.dead) {
            ctx.save();
            ctx.translate(pin.x, pin.y);
            if (pin.fallen) {
                ctx.rotate(pin.angle);
                ctx.scale(0.85, 0.85);
            }
            ctx.fillStyle = pin.standing ? '#ffffff' : '#c9d1d9';
            ctx.beginPath();
            ctx.arc(0, 0, pin.radius, 0, Math.PI * 2);
            ctx.fill();

            if (pin.standing) {
                ctx.strokeStyle = '#da3633';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, pin.radius * 0.6, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    });

    // --- DRAW BALL ---
    if (gameState === 'AIMING' || gameState === 'ROLLING') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#1f6feb';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0d1117';
        ctx.beginPath();
        ctx.arc(ball.x - 4, ball.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(ball.x + 4, ball.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(ball.x, ball.y + 6, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- AIMING TRAJECTORY VECTOR LINE ---
    if (gameState === 'AIMING') {
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        let lineLength = 220;
        let targetX = ball.x + Math.cos(ball.aimAngle) * lineLength;
        let targetY = ball.y + Math.sin(ball.aimAngle) * lineLength;
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Aim Reticle Arrowhead
        ctx.fillStyle = '#3fb950';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- SCORE OVERLAY MESSAGE ---
    if (gameState === 'SCORE_PAUSE') {
        ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
        ctx.fillRect(0, HEIGHT / 2 - 50, WIDTH, 100);

        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(messageText, WIDTH / 2, HEIGHT / 2 + 10);
        ctx.textAlign = 'left';
    }
}
