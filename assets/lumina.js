// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
// --- Synthesizer Sound Engine (Polyphonic Audio Context) ---
        class SoundEngine {
            constructor() { this.ctx = null; }

            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            }

            playCoreCollect(comboLevel) {
                if (!this.ctx) return;
                const baseFreq = 320 + Math.min(comboLevel, 15) * 40;
                
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.12);
                
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
            }

            playPhaseShift() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.18);

                gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.18);
            }

            playNearMiss() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.15);

                gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.15);
            }

            playCollapse() {
                if (!this.ctx) return;
                const bufferSize = this.ctx.sampleRate * 0.5;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, this.ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.5);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start();
                noise.stop(this.ctx.currentTime + 0.5);
            }
        }

        const audio = new SoundEngine();

        // --- Canvas Setup ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let width, height;
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // Game State Variables
        let isRunning = false;
        let score = 0;
        let combo = 0;
        let multiplier = 1.0;
        let gameTime = 0;
        let slowMoTime = 0;
        let shakeTime = 0;
        let highScore = localStorage.getItem('lumina_highscore') || 0;

        const mouse = { x: width / 2, y: height / 2 };
        
        window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
            }
        });

        // Player Entity
        class Player {
            constructor() {
                this.x = width / 2;
                this.y = height / 2;
                this.radius = 12;
                this.dashCooldown = 0;
                this.dashMaxCooldown = 150; // ~2.5 seconds
                this.isDashing = false;
                this.dashTimer = 0;
                this.trail = [];
            }

            update() {
                const lerpSpeed = this.isDashing ? 0.35 : 0.14;
                this.x += (mouse.x - this.x) * lerpSpeed;
                this.y += (mouse.y - this.y) * lerpSpeed;

                // Motion Trail
                this.trail.unshift({ x: this.x, y: this.y, alpha: 1.0 });
                if (this.trail.length > (this.isDashing ? 18 : 8)) this.trail.pop();

                if (this.dashCooldown > 0) this.dashCooldown--;
                if (this.dashTimer > 0) {
                    this.dashTimer--;
                    if (this.dashTimer === 0) this.isDashing = false;
                }

                // HUD Bar Update
                const dashPct = Math.min(100, ((this.dashMaxCooldown - this.dashCooldown) / this.dashMaxCooldown) * 100);
                document.getElementById('dashBar').style.width = dashPct + '%';
            }

            dash() {
                if (this.dashCooldown === 0) {
                    this.dashCooldown = this.dashMaxCooldown;
                    this.isDashing = true;
                    this.dashTimer = 16;
                    audio.playPhaseShift();
                    createBurst(this.x, this.y, '#70e0ff', 24);
                }
            }

            draw() {
                // Draw Motion Trail
                this.trail.forEach((t, i) => {
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, this.radius * (1 - i / this.trail.length), 0, Math.PI * 2);
                    ctx.fillStyle = this.isDashing ? `rgba(255, 255, 255, ${t.alpha * 0.6})` : `rgba(112, 224, 255, ${t.alpha * 0.2})`;
                    ctx.fill();
                    t.alpha -= 0.08;
                });

                // Core Aura
                ctx.save();
                ctx.shadowBlur = this.isDashing ? 30 : 18;
                ctx.shadowColor = this.isDashing ? '#ffffff' : '#70e0ff';

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + (this.isDashing ? 6 : 3), 0, Math.PI * 2);
                ctx.strokeStyle = this.isDashing ? '#ffffff' : 'rgba(112, 224, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.isDashing ? '#ffffff' : '#70e0ff';
                ctx.fill();

                ctx.restore();
            }
        }

        // Void Pulses (Obstacles)
        class VoidPulse {
            constructor() {
                this.radius = Math.random() * 10 + 12;
                
                if (Math.random() < 0.5) {
                    this.x = Math.random() < 0.5 ? -40 : width + 40;
                    this.y = Math.random() * height;
                } else {
                    this.x = Math.random() * width;
                    this.y = Math.random() < 0.5 ? -40 : height + 40;
                }

                const angle = Math.atan2(height / 2 - this.y, width / 2 - this.x) + (Math.random() - 0.5) * 0.6;
                const speed = 2.8 + Math.min(gameTime / 500, 4.5);
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = '#ff4d6d';
                this.nearMissed = false;
            }

            update(speedFactor) {
                this.x += this.vx * speedFactor;
                this.y += this.vy * speedFactor;
            }

            draw() {
                ctx.save();
                ctx.shadowBlur = 14;
                ctx.shadowColor = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        // Light Cores (Collectibles)
        class LightCore {
            constructor() {
                this.x = Math.random() * (width - 120) + 60;
                this.y = Math.random() * (height - 120) + 60;
                this.radius = 8;
                this.pulse = Math.random() * Math.PI;
            }

            update() {
                this.pulse += 0.06;
            }

            draw() {
                const currentR = this.radius + Math.sin(this.pulse) * 2;
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#ffb703';
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentR, 0, Math.PI * 2);
                ctx.fillStyle = '#ffb703';
                ctx.fill();
                ctx.restore();
            }
        }

        // Particle System
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.radius = Math.random() * 3 + 1;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 5 + 1;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.alpha = 1;
                this.decay = Math.random() * 0.025 + 0.015;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.alpha);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        let player = new Player();
        let voidPulses = [];
        let lightCores = [];
        let particles = [];

        function createBurst(x, y, color, count = 16) {
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, color));
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && isRunning) player.dash();
        });

        function initGame() {
            audio.init();
            player = new Player();
            voidPulses = [];
            lightCores = [];
            particles = [];
            score = 0;
            combo = 0;
            multiplier = 1.0;
            gameTime = 0;
            slowMoTime = 0;
            
            for (let i = 0; i < 3; i++) lightCores.push(new LightCore());

            document.getElementById('scoreDisplay').innerText = '0';
            document.getElementById('multiplierDisplay').innerText = 'x1.0';
            document.getElementById('startOverlay').classList.add('hidden');
            document.getElementById('gameOverOverlay').classList.add('hidden');
            
            isRunning = true;
            requestAnimationFrame(gameLoop);
        }

        function triggerGameOver() {
            isRunning = false;
            audio.playCollapse();
            shakeTime = 22;

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('lumina_highscore', highScore);
            }

            document.getElementById('finalScore').innerText = Math.floor(score);
            document.getElementById('bestScore').innerText = Math.floor(highScore);
            document.getElementById('gameOverOverlay').classList.remove('hidden');
        }

        function gameLoop() {
            if (!isRunning) return;

            gameTime++;

            // Handle Slow-Motion near misses
            const speedFactor = slowMoTime > 0 ? 0.35 : 1.0;
            if (slowMoTime > 0) slowMoTime--;

            ctx.save();
            if (shakeTime > 0) {
                ctx.translate((Math.random() - 0.5) * shakeTime, (Math.random() - 0.5) * shakeTime);
                shakeTime--;
            }

            // Canvas Background Clear
            ctx.fillStyle = '#0b0c16';
            ctx.fillRect(0, 0, width, height);

            // Subtle Background Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 60) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += 60) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            // Spawn Void Pulses
            const spawnInterval = Math.max(14, 55 - Math.floor(gameTime / 110));
            if (gameTime % spawnInterval === 0) {
                voidPulses.push(new VoidPulse());
            }

            // Update Player
            player.update();
            player.draw();

            // Collectibles Update & Check
            lightCores.forEach((core, i) => {
                core.update();
                core.draw();

                const d = Math.hypot(player.x - core.x, player.y - core.y);
                if (d < player.radius + core.radius) {
                    combo++;
                    multiplier = Math.min(6.0, 1.0 + combo * 0.2);
                    score += 120 * multiplier;
                    audio.playCoreCollect(combo);

                    createBurst(core.x, core.y, '#ffb703', 14);
                    lightCores.splice(i, 1);
                    lightCores.push(new LightCore());

                    document.getElementById('scoreDisplay').innerText = Math.floor(score);
                    document.getElementById('multiplierDisplay').innerText = 'x' + multiplier.toFixed(1);
                }
            });

            // Obstacles Update & Collision Check
            voidPulses.forEach((pulse, i) => {
                pulse.update(speedFactor);
                pulse.draw();

                const d = Math.hypot(player.x - pulse.x, player.y - pulse.y);

                // Near-Miss Slow-Mo Detection
                if (!pulse.nearMissed && d < player.radius + pulse.radius + 24 && d > player.radius + pulse.radius) {
                    pulse.nearMissed = true;
                    slowMoTime = 20;
                    score += 40;
                    audio.playNearMiss();
                    createBurst(pulse.x, pulse.y, '#a855f7', 8);
                }

                // Direct Collision
                if (d < player.radius + pulse.radius) {
                    if (player.isDashing) {
                        createBurst(pulse.x, pulse.y, '#ff4d6d', 22);
                        audio.playCoreCollect(10);
                        voidPulses.splice(i, 1);
                        score += 80;
                    } else {
                        createBurst(player.x, player.y, '#70e0ff', 40);
                        triggerGameOver();
                    }
                }

                // Cleanup Offscreen
                if (pulse.x < -80 || pulse.x > width + 80 || pulse.y < -80 || pulse.y > height + 80) {
                    voidPulses.splice(i, 1);
                }
            });

            // Particles Update
            particles.forEach((p, i) => {
                p.update();
                p.draw();
                if (p.alpha <= 0) particles.splice(i, 1);
            });

            ctx.restore();

            if (isRunning) requestAnimationFrame(gameLoop);
        }

        document.getElementById('startBtn').addEventListener('click', initGame);
        document.getElementById('restartBtn').addEventListener('click', initGame);
