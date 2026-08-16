// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let waterY;

// Solfège notes (C4 up to D5)
const solfegeFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
let audioCtx = null;

function playSkipSound(skipCount) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    const noteIdx = Math.min(skipCount, solfegeFreqs.length - 1);
    osc.frequency.setValueAtTime(solfegeFreqs[noteIdx], audioCtx.currentTime);

    // Warm, soothing envelope
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.7);
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    waterY = height * 0.65;
    resetRock();
}

let rock = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 12,
    active: false,
    inHand: true
};

let pawPos = { x: 0, y: 0 };
let dragStart = null;
let currentDrag = null;

let currentSkips = 0;
let bestSkips = 0;
let ripples = [];

function resetRock() {
    pawPos = { x: width * 0.18, y: waterY - 30 };
    rock.x = pawPos.x;
    rock.y = pawPos.y - 10;
    rock.vx = 0;
    rock.vy = 0;
    rock.active = false;
    rock.inHand = true;
    currentSkips = 0;
    document.getElementById('skips').innerText = currentSkips;
}

window.addEventListener('resize', resize);

// Input handling for dragging and launching
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function onDown(e) {
    if (!rock.inHand) return;
    const pos = getPos(e);
    if (Math.hypot(pos.x - rock.x, pos.y - rock.y) < 60) {
        dragStart = pos;
        currentDrag = pos;
    }
}

function onMove(e) {
    if (dragStart) {
        currentDrag = getPos(e);
    }
}

function onUp() {
    if (dragStart && currentDrag) {
        const dx = dragStart.x - currentDrag.x;
        const dy = dragStart.y - currentDrag.y;

        // Launch rock if pulled back sufficiently
        if (dx > 10) {
            rock.vx = dx * 0.12;
            rock.vy = dy * 0.10;
            rock.active = true;
            rock.inHand = false;
        }
    }
    dragStart = null;
    currentDrag = null;
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);

canvas.addEventListener('touchstart', onDown);
canvas.addEventListener('touchmove', onMove);
window.addEventListener('touchend', onUp);

function update() {
    // Update rock physics
    if (rock.active) {
        rock.x += rock.vx;
        rock.y += rock.vy;
        rock.vy += 0.22; // Gravity

        // Check water collision
        if (rock.y >= waterY) {
            if (rock.vy > 0.8 && rock.vx > 1.5) {
                // Successful skip!
                currentSkips++;
                document.getElementById('skips').innerText = currentSkips;
                if (currentSkips > bestSkips) {
                    bestSkips = currentSkips;
                    document.getElementById('best').innerText = bestSkips;
                }

                playSkipSound(currentSkips - 1);

                // Add water ripple
                ripples.push({ x: rock.x, y: waterY, r: 5, alpha: 1.0 });

                // Bounce mechanics
                rock.y = waterY;
                rock.vy = -rock.vy * 0.65;
                rock.vx *= 0.88;
            } else {
                // Sink
                ripples.push({ x: rock.x, y: waterY, r: 8, alpha: 1.0 });
                rock.active = false;
                setTimeout(resetRock, 1200);
            }
        }

        if (rock.x > width + 50 || rock.y > height + 50) {
            rock.active = false;
            setTimeout(resetRock, 800);
        }
    }

    // Update ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 1.2;
        ripples[i].alpha -= 0.02;
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
    }
}

function drawBackground() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.6, '#1e293b');
    skyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, waterY);

    // Lake water gradient
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, height);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(0.3, '#0369a1');
    waterGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, width, height - waterY);

    // Horizon waterline
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    ctx.lineTo(width, waterY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawRaccoonPaw(x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Dark grey raccoon fur arm
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-60, 40);
    ctx.lineTo(0, 0);
    ctx.lineTo(20, 20);
    ctx.lineTo(-40, 80);
    ctx.fill();

    // Main paw pad
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Raccoon fingers/claws
    const fingers = [-0.6, -0.2, 0.2, 0.6];
    ctx.fillStyle = '#0f172a';
    fingers.forEach(angle => {
        const fx = Math.cos(angle - Math.PI/2) * 22;
        const fy = Math.sin(angle - Math.PI/2) * 22;
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function draw() {
    drawBackground();

    // Draw ripples
    ripples.forEach(rip => {
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.r * 2, rip.r * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${rip.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Draw Aiming trajectory line
    if (dragStart && currentDrag) {
        const dx = dragStart.x - currentDrag.x;
        const dy = dragStart.y - currentDrag.y;

        ctx.beginPath();
        ctx.setLineDash([6, 6]);
        ctx.moveTo(rock.x, rock.y);
        ctx.lineTo(rock.x + dx * 2, rock.y + dy * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw Jimothy's Paw
    drawRaccoonPaw(pawPos.x, pawPos.y);

    // Draw Skipping Stone
    if (rock.inHand || rock.active) {
        ctx.beginPath();
        ctx.ellipse(rock.x, rock.y, rock.radius * 1.2, rock.radius * 0.7, -0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

resize();
loop();
