// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width = 0, height = 0, waterY = 0;

// Solfège frequencies: C4, D4, E4, F4, G4, A4, B4, C5, D5
const solfegeFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
let audioCtx = null;

// Global Audio Unlocker for Mobile & Desktop Web Browsers
function initOrResumeAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Unlock audio on any initial touch, pointer, or key press
['pointerdown', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, initOrResumeAudio, { once: true });
});

function playSkipSound(skipCount) {
    initOrResumeAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const noteIdx = Math.min(skipCount, solfegeFreqs.length - 1);
    const baseFreq = solfegeFreqs[noteIdx];

    // Master gain for ambient mix
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.3, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    masterGain.connect(audioCtx.destination);

    // Fundamental Sine Tone (Warm Base)
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    // Subtle Harmonic Overtone (Gives a bell/chime softness)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, now); // Octave higher
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc1.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
}

let rock = { x: 0, y: 0, vx: 0, vy: 0, active: false, inHand: true };
let pawPos = { x: 0, y: 0 };
let dragStart = null, currentDrag = null;
let currentSkips = 0, bestSkips = 0;
let ripples = [];

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    width = rect.width;
    height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    
    waterY = height * 0.62;
    resetRock();
}

function resetRock() {
    pawPos = { x: width * 0.78, y: height * 0.78 };
    rock.x = pawPos.x - 40;
    rock.y = pawPos.y - 25;
    rock.vx = 0;
    rock.vy = 0;
    rock.active = false;
    rock.inHand = true;
    currentSkips = 0;
    document.getElementById('skips').innerText = currentSkips;
}

window.addEventListener('resize', resize);

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function onDown(e) {
    initOrResumeAudio();
    if (!rock.inHand) return;
    const pos = getPos(e);
    if (Math.hypot(pos.x - rock.x, pos.y - rock.y) < 80) {
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

        if (dx > 15) {
            rock.vx = -dx * 0.09;
            rock.vy = dy * 0.08;
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

canvas.addEventListener('touchstart', onDown, { passive: true });
canvas.addEventListener('touchmove', onMove, { passive: true });
window.addEventListener('touchend', onUp);

function update() {
    if (rock.active) {
        rock.x += rock.vx;
        rock.y += rock.vy;
        rock.vy += 0.18; // Gravity

        if (rock.y >= waterY && rock.vy > 0) {
            if (Math.abs(rock.vy) > 0.6 && Math.abs(rock.vx) > 1.2) {
                currentSkips++;
                document.getElementById('skips').innerText = currentSkips;
                if (currentSkips > bestSkips) {
                    bestSkips = currentSkips;
                    document.getElementById('best').innerText = bestSkips;
                }

                playSkipSound(currentSkips - 1);
                ripples.push({ x: rock.x, y: waterY, r: 4, alpha: 1.0 });

                rock.y = waterY;
                rock.vy = -rock.vy * 0.62;
                rock.vx *= 0.86;
            } else {
                ripples.push({ x: rock.x, y: waterY, r: 8, alpha: 1.0 });
                rock.active = false;
                setTimeout(resetRock, 1200);
            }
        }

        if (rock.x < -50 || rock.y > height + 50) {
            rock.active = false;
            setTimeout(resetRock, 800);
        }
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 1.4;
        ripples[i].alpha -= 0.018;
        if (ripples[i].alpha <= 0) ripples.splice(i, 1);
    }
}

function drawWatercolorBackground() {
    // Sunset Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
    skyGrad.addColorStop(0, '#7dd3fc');
    skyGrad.addColorStop(0.35, '#bae6fd');
    skyGrad.addColorStop(0.7, '#fde68a');
    skyGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, waterY);

    // Distant Forest Silhouettes
    ctx.fillStyle = '#2d4a3e';
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= width; x += 15) {
        const h = Math.sin(x * 0.02) * 18 + Math.cos(x * 0.05) * 8 + 35;
        ctx.lineTo(x, waterY - h);
    }
    ctx.lineTo(width, waterY);
    ctx.fill();

    ctx.fillStyle = '#1b3328';
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= width; x += 10) {
        const h = Math.sin(x * 0.03 + 2) * 12 + Math.cos(x * 0.08) * 6 + 20;
        ctx.lineTo(x, waterY - h);
    }
    ctx.lineTo(width, waterY);
    ctx.fill();

    // Lake Water Base
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, height);
    waterGrad.addColorStop(0, '#38bdf8');
    waterGrad.addColorStop(0.2, '#0284c7');
    waterGrad.addColorStop(0.6, '#0369a1');
    waterGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, width, height - waterY);

    // Sunset Water Reflection
    const reflGrad = ctx.createLinearGradient(0, waterY, 0, waterY + 90);
    reflGrad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
    reflGrad.addColorStop(1, 'rgba(251, 146, 60, 0.0)');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(0, waterY, width, 90);

    // Subtle Water Waves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    for (let y = waterY + 12; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 40) {
            ctx.quadraticCurveTo(x + 20, y + Math.sin(x * 0.05) * 2, x + 40, y);
        }
        ctx.stroke();
    }
}

function drawDetailedPaw(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);

    // Arm fur
    const furGrad = ctx.createLinearGradient(-100, 80, 20, -20);
    furGrad.addColorStop(0, '#e5e7eb');
    furGrad.addColorStop(0.5, '#9ca3af');
    furGrad.addColorStop(1, '#374151');

    ctx.fillStyle = furGrad;
    ctx.beginPath();
    ctx.moveTo(80, 140);
    ctx.quadraticCurveTo(30, 40, -10, -10);
    ctx.quadraticCurveTo(-40, -20, -80, 20);
    ctx.quadraticCurveTo(-20, 80, 20, 160);
    ctx.fill();

    // Main Paw Pad
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.ellipse(-15, -10, 26, 20, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Toe Pads & Claws
    const toes = [
        { x: -42, y: -30, rot: -0.4 },
        { x: -24, y: -44, rot: -0.1 },
        { x: -2, y: -45, rot: 0.2 },
        { x: 18, y: -34, rot: 0.5 }
    ];

    toes.forEach(toe => {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(toe.x, toe.y, 8, 12, toe.rot, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(toe.x - 2, toe.y - 2, 3, 5, toe.rot, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

function draw() {
    drawWatercolorBackground();

    // Animated Ripples
    ripples.forEach(rip => {
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.r * 2.5, rip.r * 0.6, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${rip.alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Trajectory Aiming Line
    if (dragStart && currentDrag) {
        const dx = dragStart.x - currentDrag.x;
        const dy = dragStart.y - currentDrag.y;

        ctx.beginPath();
        ctx.setLineDash([8, 6]);
        ctx.moveTo(rock.x, rock.y);
        ctx.quadraticCurveTo(
            rock.x - dx * 0.8, 
            rock.y + dy * 0.8 - 40, 
            rock.x - dx * 1.8, 
            rock.y + dy * 1.8
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Jimothy's Paw
    drawDetailedPaw(pawPos.x, pawPos.y);

    // Smooth Skipping Stone
    if (rock.inHand || rock.active) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        
        const stoneGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
        stoneGrad.addColorStop(0, '#d1d5db');
        stoneGrad.addColorStop(0.6, '#6b7280');
        stoneGrad.addColorStop(1, '#374151');

        ctx.fillStyle = stoneGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 11, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

resize();
loop();
