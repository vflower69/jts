// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playHit(freq = 150) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.12);
    }
    playParry() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.35);
    }
}

const sfx = new SoundFX();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');

const keys = {};
let mousePos = { x: 0, y: 0 };
let attackInput = false, dashInput = false, parryInput = false, swapInput = false;

window.addEventListener('keydown', e => {
    if (!keys[e.code]) {
        if (e.code === 'KeyQ' || e.code === 'ShiftLeft') swapInput = true;
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', e => {
    if (e.button === 0) attackInput = true;
    if (e.button === 2) dashInput = true;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

let gameState = 'MENU';
let timeDilation = 1.0;
let bulletTimeTimer = 0;
let cameraShake = 0;
let particles = [];
let floatingTexts = [];
let projectiles = [];

const player = {
    x: 200, y: 320, radius: 16,
    speed: 5.2, hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
    stance: 'RAPIER', // 'RAPIER' (Fast) vs 'GREATSWORD' (Heavy)
    dashTimer: 0, dashCd: 0,
    parryTimer: 0, attackCd: 0, angle: 0
};

const boss = {
    x: 800, y: 320, radius: 45,
    hp: 1200, maxHp: 1200, phase: 1,
    attackTimer: 0, patternTimer: 0, state: 'IDLE'
};

function spawnParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 20 + Math.random() * 15,
            color
        });
    }
}

function spawnFloatingText(x, y, text, color = '#fff') {
    floatingTexts.push({ x, y, text, color, life: 35, vy: -1.5 });
}

function triggerBulletTime(durationFrames) {
    bulletTimeTimer = durationFrames;
    timeDilation = 0.2;
}

function updatePlayer() {
    player.angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);

    // Stance Swap
    if (swapInput) {
        player.stance = player.stance === 'RAPIER' ? 'GREATSWORD' : 'RAPIER';
        spawnFloatingText(player.x, player.y - 25, player.stance, player.stance === 'RAPIER' ? '#00f0ff' : '#ff5500');
        swapInput = false;
    }

    // Movement
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const curSpeed = player.dashTimer > 0 ? player.speed * 2.5 : player.speed;
        player.x += (dx / len) * curSpeed;
        player.y += (dy / len) * curSpeed;
    }

    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Dash
    if ((dashInput || keys['KeyK']) && player.dashCd <= 0 && player.stamina >= 20) {
        player.dashTimer = 10;
        player.dashCd = 30;
        player.stamina -= 20;
        spawnParticles(player.x, player.y, '#7900ff', 10);
    }
    dashInput = false;

    if (player.dashTimer > 0) player.dashTimer--;
    if (player.dashCd > 0) player.dashCd--;

    // Parry
    if ((keys['Space'] || keys['KeyL']) && player.parryTimer <= 0 && player.stamina >= 15) {
        player.parryTimer = 12; // 12-frame parry window
        player.stamina -= 15;
    }
    if (player.parryTimer > 0) player.parryTimer--;

    // Attack
    if ((attackInput || keys['KeyJ']) && player.attackCd <= 0) {
        const isRapier = player.stance === 'RAPIER';
        player.attackCd = isRapier ? 12 : 28;
        const dmg = isRapier ? 28 : 85;
        const range = isRapier ? 80 : 110;

        sfx.playHit(isRapier ? 220 : 90);

        const distToBoss = Math.hypot(boss.x - player.x, boss.y - player.y);
        if (distToBoss < range + boss.radius) {
            boss.hp -= dmg;
            cameraShake = isRapier ? 5 : 15;
            spawnParticles(boss.x, boss.y, '#ff0055', isRapier ? 10 : 25);
            spawnFloatingText(boss.x, boss.y - 30, dmg.toString(), isRapier ? '#00f0ff' : '#ff5500');
        }
    }
    attackInput = false;

    if (player.attackCd > 0) player.attackCd--;
    if (player.stamina < player.maxStamina) player.stamina += 0.7;
}

function updateBoss() {
    if (boss.hp <= 0) {
        gameState = 'VICTORY';
        return;
    }

    if (boss.hp < boss.maxHp * 0.5) boss.phase = 2;

    boss.patternTimer += timeDilation;

    // Boss Attack Patterns
    if (boss.patternTimer > (boss.phase === 1 ? 90 : 50)) {
        boss.patternTimer = 0;
        const attackType = Math.random();

        if (attackType < 0.5) {
            // Nova Burst
            const count = boss.phase === 1 ? 12 : 20;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                projectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * (3.5 * timeDilation),
                    vy: Math.sin(angle) * (3.5 * timeDilation),
                    radius: 6, reflected: false
                });
            }
        } else {
            // Targeted Spiral Barrage
            const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
            for (let i = -2; i <= 2; i++) {
                const spread = angleToPlayer + (i * 0.15);
                projectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(spread) * (5.0 * timeDilation),
                    vy: Math.sin(spread) * (5.0 * timeDilation),
                    radius: 7, reflected: false
                });
            }
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.reflected) {
            // Reflected hit boss
            if (Math.hypot(p.x - boss.x, p.y - boss.y) < p.radius + boss.radius) {
                boss.hp -= 40;
                spawnParticles(boss.x, boss.y, '#00f0ff', 10);
                spawnFloatingText(boss.x, boss.y, '40', '#00f0ff');
                projectiles.splice(i, 1);
                continue;
            }
        } else {
            // Hit player
            const dist = Math.hypot(p.x - player.x, p.y - player.y);
            if (dist < p.radius + player.radius) {
                if (player.parryTimer > 0) {
                    // PERFECT PARRY
                    sfx.playParry();
                    p.reflected = true;
                    p.vx = -p.vx * 2.0;
                    p.vy = -p.vy * 2.0;
                    triggerBulletTime(40);
                    cameraShake = 8;
                    spawnParticles(player.x, player.y, '#00f0ff', 20);
                    spawnFloatingText(player.x, player.y - 20, "BULLET-TIME PARRY!", "#00f0ff");
                } else if (player.dashTimer <= 0) {
                    // Take damage
                    player.hp -= 15;
                    cameraShake = 10;
                    spawnParticles(player.x, player.y, '#ff0000', 12);
                    projectiles.splice(i, 1);
                    if (player.hp <= 0) gameState = 'GAMEOVER';
                }
            }
        }

        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    if (bulletTimeTimer > 0) {
        bulletTimeTimer--;
        if (bulletTimeTimer === 0) timeDilation = 1.0;
    }

    updatePlayer();
    updateBoss();
    updateProjectiles();

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    floatingTexts.forEach(t => { t.y += t.vy; t.life--; });
    floatingTexts = floatingTexts.filter(t => t.life > 0);

    if (cameraShake > 0) cameraShake *= 0.85;
}

function drawHUD() {
    // Player HP
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(20, 20, 220, 16);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(20, 20, (player.hp / player.maxHp) * 220, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(20, 20, 220, 16);

    // Player Stamina
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(20, 42, 180, 10);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(20, 42, (player.stamina / player.maxStamina) * 180, 10);

    // Boss HP
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(canvas.width / 2 - 250, 20, 500, 20);
    ctx.fillStyle = boss.phase === 1 ? '#7900ff' : '#ff5500';
    ctx.fillRect(canvas.width / 2 - 250, 20, (boss.hp / boss.maxHp) * 500, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(canvas.width / 2 - 250, 20, 500, 20);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`ZERO CORE - PHASE ${boss.phase}`, canvas.width / 2 - 60, 35);
}

function draw() {
    ctx.save();
    if (cameraShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
    }

    ctx.fillStyle = bulletTimeTimer > 0 ? '#050a15' : '#08080c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'PLAYING') {
        // Boss
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
        ctx.fillStyle = boss.phase === 1 ? '#7900ff' : '#ff5500';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Player Parry Aura
        if (player.parryTimer > 0) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 18, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Player
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.stance === 'RAPIER' ? '#00f0ff' : '#ff5500';
        ctx.fill();
        ctx.restore();

        // Projectiles
        projectiles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.reflected ? '#00f0ff' : '#ff0055';
            ctx.fill();
        });

        // Particles & Text
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        floatingTexts.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(t.text, t.x, t.y);
        });

        drawHUD();
    }

    ctx.restore();
}

function gameLoop() {
    update();
    draw();

    if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
        overlay.style.display = 'flex';
        title.innerText = gameState === 'VICTORY' ? 'CORE NEUTRALIZED' : 'SYSTEM OVERLOAD';
        subtitle.innerText = gameState === 'VICTORY' ? 'Flawless execution. Zero Core destroyed.' : 'Core pattern overwhelmed player defenses.';
        startBtn.innerText = 'Re-Engage';
    }

    requestAnimationFrame(gameLoop);
}

startBtn.onclick = () => {
    player.hp = 100; player.stamina = 100;
    boss.hp = 1200; boss.phase = 1;
    projectiles = []; particles = []; floatingTexts = [];
    gameState = 'PLAYING';
    overlay.style.display = 'none';
};

gameLoop();
