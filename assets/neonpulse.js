// --- Web Audio Synthesizer Engine ---
        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.muted = false;
            }

            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            }

            playPickup(freq = 440) {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(freq * 1.8, this.ctx.currentTime + 0.12);
                
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.12);
            }

            playDash() {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);

                gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.2);
            }

            playExplosion() {
                if (!this.ctx) return;
                const bufferSize = this.ctx.sampleRate * 0.4;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800, this.ctx.currentTime);
                filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.4);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);

                noise.start();
                noise.stop(this.ctx.currentTime + 0.4);
            }
        }

        const audio = new SoundEngine();

        // --- Setup Canvas & State ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let width, height;
        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // Game Variables
        let isRunning = false;
        let score = 0;
        let multiplier = 1.0;
        let gameTime = 0;
        let shakeTime = 0;
        let highScore = localStorage.getItem('neon_pulse_highscore') || 0;

        // Mouse/Touch Position
        const mouse = { x: width / 2, y: height / 2 };
        
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

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
                this.radius = 14;
                this.color = '#00f3ff';
                this.dashCooldown = 0;
                this.dashMaxCooldown = 180; // 3 seconds at 60fps
                this.isDashing = false;
                this.dashTimer = 0;
            }

            update() {
                // Smooth interpolation toward target
                const speed = this.isDashing ? 0.35 : 0.12;
                this.x += (mouse.x - this.x) * speed;
                this.y += (mouse.y - this.y) * speed;

                // Handle Dash Timers
                if (this.dashCooldown > 0) this.dashCooldown--;
                if (this.dashTimer > 0) {
                    this.dashTimer--;
                    if (this.dashTimer === 0) this.isDashing = false;
                }

                // UI Update for Dash
                const dashPct = Math.min(100, ((this.dashMaxCooldown - this.dashCooldown) / this.dashMaxCooldown) * 100);
                document.getElementById('dashBar').style.width = dashPct + '%';
            }

            dash() {
                if (this.dashCooldown === 0) {
                    this.dashCooldown = this.dashMaxCooldown;
                    this.isDashing = true;
                    this.dashTimer = 15; // 15 frames of invulnerability/speed
                    audio.playDash();
                    createBurst(this.x, this.y, '#00f3ff', 25);
                }
            }

            draw() {
                ctx.save();
                ctx.shadowBlur = this.isDashing ? 30 : 15;
                ctx.shadowColor = this.color;

                // Outer aura ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + (this.isDashing ? 8 : 4), 0, Math.PI * 2);
                ctx.strokeStyle = this.isDashing ? '#ffffff' : 'rgba(0, 243, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Core orb
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.isDashing ? '#ffffff' : this.color;
                ctx.fill();

                ctx.restore();
            }
        }

        // Obstacles (Red / Magenta Pulse Orbs)
        class Obstacle {
            constructor() {
                this.radius = Math.random() * 12 + 10;
                
                // Spawn from screen edge
                if (Math.random() < 0.5) {
                    this.x = Math.random() < 0.5 ? -30 : width + 30;
                    this.y = Math.random() * height;
                } else {
                    this.x = Math.random() * width;
                    this.y = Math.random() < 0.5 ? -30 : height + 30;
                }

                // Angle towards center/player with slight variance
                const angle = Math.atan2(height / 2 - this.y, width / 2 - this.x) + (Math.random() - 0.5) * 0.5;
                const baseSpeed = 2.5 + Math.min(gameTime / 600, 4); // Speed increases over time
                this.vx = Math.cos(angle) * baseSpeed;
                this.vy = Math.sin(angle) * baseSpeed;
                this.color = '#ff0055';
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
            }

            draw() {
                ctx.save();
                ctx.shadowBlur = 12;
                ctx.shadowColor = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.restore();
            }
        }

        // Collectibles (Gold Energy Shards)
        class Shard {
            constructor() {
                this.x = Math.random() * (width - 100) + 50;
                this.y = Math.random() * (height - 100) + 50;
                this.radius = 8;
                this.pulse = 0;
            }

            update() {
                this.pulse += 0.05;
            }

            draw() {
                const currentRadius = this.radius + Math.sin(this.pulse) * 2;
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffcc00';
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffcc00';
                ctx.fill();
                ctx.restore();
            }
        }

        // Visual Particles
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.radius = Math.random() * 3 + 1;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 1;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.alpha = 1;
                this.decay = Math.random() * 0.03 + 0.015;
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

        // Manager Arrays
        let player = new Player();
        let obstacles = [];
        let shards = [];
        let particles = [];

        function createBurst(x, y, color, count = 15) {
            for (let i = 0; i < count; i++) {
                particles.push(new Particle(x, y, color));
            }
        }

        // Trigger Dash on Keypress
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && isRunning) {
                player.dash();
            }
        });

        // Game Loop
        function initGame() {
            audio.init();
            player = new Player();
            obstacles = [];
            shards = [];
            particles = [];
            score = 0;
            multiplier = 1.0;
            gameTime = 0;
            
            // Initial Shards
            for (let i = 0; i < 3; i++) shards.push(new Shard());

            document.getElementById('scoreDisplay').innerText = '0';
            document.getElementById('multiplierDisplay').innerText = 'x1.0';

            document.getElementById('startOverlay').classList.add('hidden');
            document.getElementById('gameOverOverlay').classList.add('hidden');
            
            isRunning = true;
            requestAnimationFrame(gameLoop);
        }

        function triggerGameOver() {
            isRunning = false;
            audio.playExplosion();
            shakeTime = 20;

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('neon_pulse_highscore', highScore);
            }

            document.getElementById('finalScore').innerText = Math.floor(score);
            document.getElementById('bestScore').innerText = Math.floor(highScore);
            document.getElementById('gameOverOverlay').classList.remove('hidden');
        }

        function gameLoop() {
            if (!isRunning) return;

            gameTime++;

            // Screen Shake Effect
            ctx.save();
            if (shakeTime > 0) {
                const dx = (Math.random() - 0.5) * shakeTime;
                const dy = (Math.random() - 0.5) * shakeTime;
                ctx.translate(dx, dy);
                shakeTime--;
            }

            // Clear Screen
            ctx.fillStyle = '#080811';
            ctx.fillRect(0, 0, width, height);

            // Draw Parallax Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Spawn Obstacles over time
            const spawnRate = Math.max(15, 60 - Math.floor(gameTime / 120));
            if (gameTime % spawnRate === 0) {
                obstacles.push(new Obstacle());
            }

            // Update & Draw Player
            player.update();
            player.draw();

            // Update & Draw Shards
            shards.forEach((shard, index) => {
                shard.update();
                shard.draw();

                // Collision with Player
                const dist = Math.hypot(player.x - shard.x, player.y - shard.y);
                if (dist < player.radius + shard.radius) {
                    score += 100 * multiplier;
                    multiplier = Math.min(5.0, multiplier + 0.2);
                    audio.playPickup(300 + multiplier * 100);
                    
                    createBurst(shard.x, shard.y, '#ffcc00', 12);
                    shards.splice(index, 1);
                    shards.push(new Shard()); // Respawn new shard

                    document.getElementById('scoreDisplay').innerText = Math.floor(score);
                    document.getElementById('multiplierDisplay').innerText = 'x' + multiplier.toFixed(1);
                }
            });

            // Update & Draw Obstacles
            obstacles.forEach((obs, index) => {
                obs.update();
                obs.draw();

                // Check Player Collision
                const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
                if (dist < player.radius + obs.radius) {
                    if (player.isDashing) {
                        // Destroy obstacle when dashing through
                        createBurst(obs.x, obs.y, '#ff0055', 20);
                        audio.playPickup(150);
                        obstacles.splice(index, 1);
                        score += 50;
                    } else {
                        // Game Over
                        createBurst(player.x, player.y, '#00f3ff', 35);
                        triggerGameOver();
                    }
                }

                // Remove Offscreen Obstacles
                if (obs.x < -100 || obs.x > width + 100 || obs.y < -100 || obs.y > height + 100) {
                    obstacles.splice(index, 1);
                }
            });

            // Update Particles
            particles.forEach((p, index) => {
                p.update();
                p.draw();
                if (p.alpha <= 0) particles.splice(index, 1);
            });

            ctx.restore();

            if (isRunning) {
                requestAnimationFrame(gameLoop);
            }
        }

        // Event Listeners for UI
        document.getElementById('startBtn').addEventListener('click', initGame);
        document.getElementById('restartBtn').addEventListener('click', initGame);
