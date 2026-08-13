// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
// Audio Synthesizer (Web Audio API)
class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playHit() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    playParry() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.25);
    }
    playDash() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    }
}

const sfx = new SoundFX();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const augmentsDiv = document.getElementById('augments');
const title = document.getElementById('title');
const subtitle = document.getElementById('subtitle');

// Input Handling
const keys = {};
let mousePos = { x: 0, y: 0 };
let attackInput = false;
let dashInput = false;
let parryInput = false;

window.addEventListener('keydown', e => { keys[e.code] = true; });
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

// Game State
let gameState = 'MENU';
let wave = 1;
let score = 0;
let combo = 0;
let comboTimer = 0;
let cameraShake = 0;
let particles = [];
let floatingTexts = [];

// Player Object
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: 4.8,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    angle: 0,
    isDashing: false,
    dashTimer: 0,
    dashCd: 0,
    isParrying: false,
    parryWindow: 0,
    isAttacking: false,
    attackCd: 0,
    attackArc: 0,
    augments: { lifesteal: 0, chainLightning: 0, dashBlast: 0, overdrive: 0 }
};

// Enemy Class
class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'chaser', 'brute', 'ranged'
        this.radius = type === 'brute' ? 26 : 16;
        this.hp = type === 'brute' ? 180 : (type === 'ranged' ? 45 : 70);
        this.maxHp = this.hp;
        this.speed = type === 'brute' ? 1.8 : (type === 'ranged' ? 2.6 : 3.4);
        this.color = type === 'brute' ? '#ff3300' : (type === 'ranged' ? '#ffcc00' : '#ff0055');
        this.attackCd = 0;
        this.telegraph = 0;
        this.stunned = 0;
    }

    update() {
        if (this.stunned > 0) {
            this.stunned--;
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (this.type === 'ranged') {
            if (dist > 220) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            } else if (dist < 140) {
                this.x -= (dx / dist) * this.speed;
                this.y -= (dy / dist) * this.speed;
            }
            if (this.attackCd <= 0) {
                this.telegraph = 30; // Telegraph before shooting
                this.attackCd = 120;
            }
        } else {
            if (dist > this.radius + player.radius) {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        }

        if (this.telegraph > 0) {
            this.telegraph--;
            if (this.telegraph === 0 && this.type === 'ranged') {
                // Spawn projectile
                projectiles.push(new Projectile(this.x, this.y, dx / dist, dy / dist));
            }
        }

        if (this.attackCd > 0) this.attackCd--;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.telegraph > 0) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.stunned > 0 ? '#999999' : this.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Health Bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-15, -this.radius - 10, 30, 4);
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(-15, -this.radius - 10, (this.hp / this.maxHp) * 30, 4);
        }

        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx * 6;
        this.vy = vy * 6;
        this.radius = 5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
    }
}

let enemies = [];
let projectiles = [];

function spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20 + Math.random() * 15,
            color
        });
    }
}

function spawnFloatingText(x, y, text, color = '#fff') {
    floatingTexts.push({ x, y, text, color, life: 30, vy: -1.2 });
}

function startWave() {
    enemies = [];
    projectiles = [];
    const count = 3 + wave * 2;
    for (let i = 0; i < count; i++) {
        const type = Math.random() < 0.2 ? 'brute' : (Math.random() < 0.4 ? 'ranged' : 'chaser');
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 350 + Math.random() * 150;
        const x = player.x + Math.cos(angle) * spawnDist;
        const y = player.y + Math.sin(angle) * spawnDist;
        enemies.push(new Enemy(
            Math.max(30, Math.min(canvas.width - 30, x)),
            Math.max(30, Math.min(canvas.height - 30, y)),
            type
        ));
    }
}

function showAugmentDraft() {
    gameState = 'DRAFT';
    overlay.style.display = 'flex';
    title.innerText = `WAVE ${wave} CLEARED`;
    subtitle.innerText = "Select a Neural Augment to enhance your combat capabilities:";
    startBtn.style.display = 'none';
    augmentsDiv.style.display = 'flex';
    augmentsDiv.innerHTML = '';

    const list = [
        { id: 'lifesteal', title: 'Vampiric Blade', desc: 'Restore 5 HP on Parries & Finishers.' },
        { id: 'chainLightning', title: 'Arc Discharge', desc: 'Attacks emit chain lightning to adjacent targets.' },
        { id: 'dashBlast', title: 'Overdrive Dash', desc: 'Dashing releases a shockwave that pushes enemies.' },
        { id: 'overdrive', title: 'Focus Resonance', desc: 'Combo multiplier scales attack damage by 2x.' }
    ];

    // Pick 3 random
    const choices = list.sort(() => 0.5 - Math.random()).slice(0, 3);
    choices.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'aug-card';
        card.innerHTML = `<h3>${opt.title}</h3><p>${opt.desc}</p>`;
        card.onclick = () => {
            player.augments[opt.id]++;
            wave++;
            gameState = 'PLAYING';
            overlay.style.display = 'none';
            startWave();
        };
        augmentsDiv.appendChild(card);
    });
}

function updatePlayer() {
    // Rotation towards mouse
    player.angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);

    // Movement
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const speed = player.isDashing ? player.speed * 2.8 : player.speed;
        player.x += (dx / len) * speed;
        player.y += (dy / len) * speed;
    }

    // Clamp inside canvas
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    // Dash Action
    if ((dashInput || keys['KeyK']) && player.dashCd <= 0 && player.stamina >= 25) {
        player.isDashing = true;
        player.dashTimer = 12; // 12 i-frames
        player.dashCd = 35;
        player.stamina -= 25;
        sfx.playDash();
        spawnParticles(player.x, player.y, '#00f0ff', 12);
        if (player.augments.dashBlast) {
            enemies.forEach(e => {
                if (Math.hypot(e.x - player.x, e.y - player.y) < 100) {
                    e.hp -= 20;
                    e.stunned = 20;
                }
            });
        }
    }
    dashInput = false;

    if (player.dashTimer > 0) player.dashTimer--;
    else player.isDashing = false;
    if (player.dashCd > 0) player.dashCd--;

    // Parry Action
    if ((keys['Space'] || keys['KeyL']) && player.parryWindow <= 0 && player.stamina >= 15) {
        player.isParrying = true;
        player.parryWindow = 14; // Parry frame window
        player.stamina -= 15;
    }
    if (player.parryWindow > 0) {
        player.parryWindow--;
        if (player.parryWindow === 0) player.isParrying = false;
    }

    // Attack Action
    if ((attackInput || keys['KeyJ']) && player.attackCd <= 0) {
        player.isAttacking = true;
        player.attackCd = 16;
        player.attackArc = Math.PI / 1.8;
        sfx.playHit();

        // Perform Attack Hits
        const comboMult = 1 + (combo * 0.15 * (player.augments.overdrive ? 1.5 : 1.0));
        const baseDmg = 35 * comboMult;

        enemies.forEach(e => {
            const edx = e.x - player.x;
            const edy = e.y - player.y;
            const dist = Math.hypot(edx, edy);
            const enemyAngle = Math.atan2(edy, edx);
            let angleDiff = Math.abs(enemyAngle - player.angle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (dist < 75 && angleDiff < player.attackArc / 2) {
                e.hp -= baseDmg;
                e.stunned = 10;
                spawnParticles(e.x, e.y, '#ff0055', 8);
                spawnFloatingText(e.x, e.y, Math.round(baseDmg).toString(), '#ff5500');
                combo++;
                comboTimer = 180;
                score += 50;

                if (player.augments.chainLightning) {
                    enemies.forEach(e2 => {
                        if (e2 !== e && Math.hypot(e2.x - e.x, e2.y - e.y) < 120) {
                            e2.hp -= 15;
                            spawnParticles(e2.x, e2.y, '#00f0ff', 4);
                        }
                    });
                }
            }
        });
    }
    attackInput = false;

    if (player.attackCd > 0) player.attackCd--;
    if (player.stamina < player.maxStamina) player.stamina += 0.6;

    // Combo Decay
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer === 0) combo = 0;
    }
}

function checkCollisions() {
    enemies.forEach(e => {
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < e.radius + player.radius) {
            if (player.isParrying) {
                // Perfect Parry Success!
                sfx.playParry();
                e.stunned = 60;
                e.hp -= 30;
                player.stamina = Math.min(player.maxStamina, player.stamina + 30);
                cameraShake = 10;
                spawnParticles(player.x, player.y, '#66fcf1', 25);
                spawnFloatingText(player.x, player.y - 20, "PARRY!", "#66fcf1");
                if (player.augments.lifesteal) player.hp = Math.min(player.maxHp, player.hp + 5);
                player.isParrying = false;
            } else if (!player.isDashing && e.stunned <= 0 && e.attackCd <= 0) {
                // Take Damage
                player.hp -= 15;
                e.attackCd = 40;
                combo = 0;
                cameraShake = 12;
                spawnParticles(player.x, player.y, '#ff0000', 15);
                if (player.hp <= 0) gameState = 'GAMEOVER';
            }
        }
    });

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.update();
        if (Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius) {
            if (player.isParrying) {
                sfx.playParry();
                projectiles.splice(i, 1);
                spawnFloatingText(player.x, player.y - 20, "REFLECT!", "#66fcf1");
                continue;
            } else if (!player.isDashing) {
                player.hp -= 10;
                combo = 0;
                cameraShake = 8;
                projectiles.splice(i, 1);
                if (player.hp <= 0) gameState = 'GAMEOVER';
                continue;
            }
        }
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            projectiles.splice(i, 1);
        }
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    updatePlayer();

    // Remove dead enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].hp <= 0) {
            spawnParticles(enemies[i].x, enemies[i].y, enemies[i].color, 20);
            enemies.splice(i, 1);
            score += 150;
        }
    }

    checkCollisions();

    // Check wave complete
    if (enemies.length === 0) {
        showAugmentDraft();
    }

    // Particles & Floating Text
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);

    floatingTexts.forEach(t => { t.y += t.vy; t.life--; });
    floatingTexts = floatingTexts.filter(t => t.life > 0);

    if (cameraShake > 0) cameraShake *= 0.85;
}

function drawHUD() {
    // Player HP Bar
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fillRect(20, 20, 200, 16);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(20, 20, (player.hp / player.maxHp) * 200, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(20, 20, 200, 16);

    // Player Stamina Bar
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fillRect(20, 42, 160, 10);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(20, 42, (player.stamina / player.maxStamina) * 160, 10);

    // Score & Wave
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`SCORE: ${score}`, 20, 75);
    ctx.fillText(`WAVE: ${wave}`, 20, 95);

    // Combo Counter
    if (combo > 1) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${combo}x COMBO!`, canvas.width - 160, 45);
    }
}

function draw() {
    ctx.save();
    if (cameraShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * cameraShake, (Math.random() - 0.5) * cameraShake);
    }

    // Clear Screen
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Floor Pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    if (gameState === 'PLAYING' || gameState === 'DRAFT') {
        // Draw Player Attack Arc
        if (player.isAttacking) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, 65, player.angle - player.attackArc / 2, player.angle + player.attackArc / 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.fill();
        }

        // Draw Player Parry Field
        if (player.isParrying) {
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
            ctx.strokeStyle = '#66fcf1';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw Player
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.isDashing ? '#00f0ff' : '#45a29e';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pointer
        ctx.beginPath();
        ctx.moveTo(player.radius, 0);
        ctx.lineTo(player.radius + 10, 0);
        ctx.strokeStyle = '#66fcf1';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        // Draw Enemies & Projectiles
        enemies.forEach(e => e.draw());
        projectiles.forEach(p => p.draw());

        // Particles
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        // Floating Text
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
    if (gameState === 'GAMEOVER') {
        overlay.style.display = 'flex';
        title.innerText = 'NEURAL LINK SEVERED';
        subtitle.innerText = `Final Score: ${score} | Waves Cleared: ${wave - 1}`;
        augmentsDiv.style.display = 'none';
        startBtn.style.display = 'block';
        startBtn.innerText = 'Reboot System';
    }
    requestAnimationFrame(gameLoop);
}

startBtn.onclick = () => {
    player.hp = 100;
    player.stamina = 100;
    score = 0;
    wave = 1;
    player.augments = { lifesteal: 0, chainLightning: 0, dashBlast: 0, overdrive: 0 };
    gameState = 'PLAYING';
    overlay.style.display = 'none';
    startWave();
};

gameLoop();
