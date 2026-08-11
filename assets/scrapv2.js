     // hostname check - only run from jimothytracker.org domain
        if (window.location.hostname !== "jimothytracker.org") {
            document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";
        }

    // Below are the codes for the game
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Core Game Constants
        const GROUND_Y = 400;
        const GRAVITY = 0.8;
        const MOVE_SPEED = 5;
        const PLAYER_JUMP = -15;

        // Sound Effects (Web Audio API)
        let audioCtx = null;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }

        function playHitSound(type) {
            if (!audioCtx) return;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === 'punching') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
                
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.start(now);
                osc.stop(now + 0.1);
            } else if (type === 'kicking') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

                osc.start(now);
                osc.stop(now + 0.15);
            }
        }

        // Game State
        let isRunning = false;
        let score = 0;
        let highScore = localStorage.getItem('jimothy_fighter_high') || 21000;
        document.getElementById('high-score-value').textContent = highScore;
        let frameCount = 0;
        let keys = {};

        // AI State Variables
        let aiDecisionTimer = 0;
        let aiCurrentAction = 'chase'; // 'chase', 'retreat', 'wander', 'idle'
        let aiWanderDirection = 1;

        // Vfx references
        const powText = document.getElementById('pow-effect');
        const comboText = document.getElementById('combo-effect');

        class Fighter {
            constructor(x, y, width, height, name, maxHealth, isPlayer) {
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.name = name;
                this.maxHealth = maxHealth;
                this.health = maxHealth;
                this.isPlayer = isPlayer;

                // Physics/Movement
                this.vx = 0;
                this.vy = 0;
                this.isGrounded = false;
                this.facingLeft = !isPlayer;

                // Combat State
                this.state = 'idle';
                this.stateTimer = 0;
                this.combo = 0;
                this.comboTimer = 0;
            }

            update() {
                // Gravity
                this.vy += GRAVITY;
                this.y += this.vy;

                // Movement vx
                if(this.state !== 'hit') {
                    this.x += this.vx;
                }

                // Ground collision
                if (this.y + this.height >= GROUND_Y) {
                    this.y = GROUND_Y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                    if (this.state === 'jumping') this.state = 'idle';
                } else {
                    this.isGrounded = false;
                }

                // Stage bounds
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

                // Handle combat/state timers
                if (this.stateTimer > 0) {
                    this.stateTimer--;
                    if (this.stateTimer === 0) {
                        this.state = (this.vy !== 0) ? 'jumping' : 'idle';
                    }
                }

                // Combo Timer handling
                if (this.comboTimer > 0) {
                    this.comboTimer--;
                    if (this.comboTimer === 0) {
                        this.combo = 0;
                    }
                }
            }

            jump() {
                if (this.isGrounded && (this.state === 'idle' || this.state === 'moving')) {
                    this.vy = PLAYER_JUMP;
                    this.state = 'jumping';
                    if (this.isPlayer) {
                        document.getElementById('key-jump').classList.add('active');
                    }
                }
            }

            attack(type) {
                if (this.state === 'idle' || this.state === 'moving' || this.state === 'jumping') {
                    this.state = type;
                    this.stateTimer = 15;
                    this.vx = 0;

                    if (this.isPlayer) {
                        const inputKey = type === 'punching' ? 'key-punch' : 'key-kick';
                        document.getElementById(inputKey).classList.add('active');
                    }

                    const other = this.isPlayer ? enemy : player;
                    const attackRange = 35;
                    const reachX = this.facingLeft ? (this.x - attackRange) : (this.x + this.width);

                    if (reachX < other.x + other.width &&
                        reachX + attackRange > other.x &&
                        this.y + this.height/3 < other.y + other.height &&
                        this.y + this.height > other.y + other.height/3) {
                            other.takeDamage(this, type);
                        }
                }
            }

            takeDamage(attacker, attackType) {
                if(this.state === 'dead' || this.state === 'hit') return;

                playHitSound(attackType);

                this.state = 'hit';
                this.stateTimer = 10;
                this.vy = -3;

                const damage = attackType === 'punching' ? 5 : 8;
                this.health -= damage;
                if (this.health <= 0) {
                    this.health = 0;
                    this.state = 'dead';
                } else {
                     this.vx = attacker.facingLeft ? -4 : 4;
                }

                if (attacker.isPlayer) {
                    attacker.combo++;
                    attacker.comboTimer = 60;
                    score += damage * attacker.combo;
                    updateScoreDisplay();
                    vfxHit(this, attacker);
                }

                updateHealthBars();
            }

            draw() {
                ctx.save();
                ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
                if (this.facingLeft) ctx.scale(-1, 1);

                ctx.fillStyle = '#6272a4';
                if (this.state === 'hit') ctx.fillStyle = '#ff5555';
                if (this.state === 'dead') ctx.fillStyle = '#44475a';

                if (this.isPlayer) {
                    ctx.fillStyle = (this.state === 'hit') ? '#ff5555' : '#6272a4';

                    ctx.beginPath(); ctx.ellipse(0, 5, 20, 25, 0, 0, Math.PI * 2); ctx.fill();

                    ctx.fillStyle = (this.state === 'hit') ? '#ffffff' : '#191a21';
                    ctx.beginPath(); ctx.ellipse(10, -5, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(12, -7, 3, 0, Math.PI * 2); ctx.fill();

                    if(this.state === 'punching') {
                        ctx.fillStyle = (this.state === 'hit') ? '#ff5555' : '#6272a4';
                        ctx.beginPath(); ctx.ellipse(25, 5, 10, 8, 0.4, 0, Math.PI * 2); ctx.fill();
                    }
                    if(this.state === 'kicking') {
                        ctx.fillStyle = (this.state === 'hit') ? '#ff5555' : '#6272a4';
                        ctx.beginPath(); ctx.ellipse(22, 18, 12, 10, -0.4, 0, Math.PI * 2); ctx.fill();
                    }

                } else {
                    ctx.fillStyle = (this.state === 'hit') ? '#ff5555' : '#8be9fd';

                    ctx.beginPath(); ctx.ellipse(0, 0, 25, 30, 0.1, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#44475a';
                    ctx.beginPath(); ctx.ellipse(0, -25, 25, 5, 0.1, 0, Math.PI * 2); ctx.fill();

                    ctx.fillStyle = '#191a21';
                    ctx.beginPath(); ctx.ellipse(-10, -5, 6, 8, -0.2, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(10, -5, 6, 8, 0.2, 0, Math.PI * 2); ctx.fill();
                }

                ctx.restore();
            }
        }

        const player = new Fighter(100, GROUND_Y - 70, 50, 70, 'Jimothy', 100, true);
        const enemy = new Fighter(600, GROUND_Y - 70, 60, 70, 'Waste Bin', 100, false);

        function vfxHit(victim, attacker) {
            powText.style.opacity = 1;
            const hitX = victim.x + victim.width/2;
            const hitY = victim.y + victim.height/3;
            powText.style.left = `${hitX - 30}px`;
            powText.style.top = `${hitY - 20}px`;
            powText.style.transform = `scale(1.3) rotate(${Math.random() * 20 - 10}deg)`;

            if(attacker.combo > 1) {
                comboText.textContent = `COMBO x${attacker.combo}`;
                comboText.style.opacity = 1;
                comboText.style.left = `${attacker.x + attacker.width/2 - 50}px`;
                comboText.style.top = `${attacker.y - 30}px`;
            } else {
                 comboText.style.opacity = 0;
            }

            setTimeout(() => {
                powText.style.opacity = 0;
            }, 150);
        }

        function updateHealthBars() {
            const pHealthPercent = (player.health / player.maxHealth) * 100;
            const hFill = document.getElementById('player-health');
            hFill.style.width = `${pHealthPercent}%`;
            const hue = (pHealthPercent / 100) * 135;
            hFill.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;

            const eHealthPercent = (enemy.health / enemy.maxHealth) * 100;
            const eFill = document.getElementById('enemy-health');
            eFill.style.width = `${eHealthPercent}%`;

            document.getElementById('enemy-name').textContent = `WASTE BIN (🗑️) ${eHealthPercent}%`;
            document.getElementById('player-name').textContent = `JIMOTHY (🦝) ${pHealthPercent}%`;
        }

        function updateScoreDisplay() {
            document.getElementById('score-text').textContent = score;
        }

        function drawStage() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#21222c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#44475a'; ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
            ctx.strokeStyle = '#6272a4'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();
        }

        function handleInput() {
            player.vx = 0;

            if (player.state !== 'punching' && player.state !== 'kicking' && player.state !== 'hit' && player.state !== 'dead') {
                if (keys['a'] || keys['ArrowLeft']) {
                    player.vx = -MOVE_SPEED;
                    player.facingLeft = true;
                    if (player.isGrounded) player.state = 'moving';
                } else if (keys['d'] || keys['ArrowRight']) {
                    player.vx = MOVE_SPEED;
                    player.facingLeft = false;
                    if (player.isGrounded) player.state = 'moving';
                } else {
                    if (player.isGrounded) player.state = 'idle';
                }
            }
        }

        function enemyAI() {
            if (enemy.state === 'dead' || enemy.state === 'hit') return;

            const dist = Math.abs(enemy.x - player.x);
            const closeRange = 55;
            enemy.facingLeft = enemy.x > player.x;

            // --- 1. DODGE REACTION LOGIC ---
            if ((player.state === 'punching' || player.state === 'kicking') && dist < 120 && enemy.isGrounded) {
                if (Math.random() < 0.45) { // 45% chance to dodge
                    enemy.jump();
                    enemy.vx = enemy.facingLeft ? 3.5 : -3.5;
                    return;
                }
            }

            // --- 2. BEHAVIOR DECISION TIMER ---
            aiDecisionTimer--;
            if (aiDecisionTimer <= 0) {
                aiDecisionTimer = Math.floor(Math.random() * 45) + 30; // Every 0.5 to 1.25s
                const rand = Math.random();
                if (rand < 0.50) {
                    aiCurrentAction = 'chase';
                } else if (rand < 0.75) {
                    aiCurrentAction = 'retreat';
                } else if (rand < 0.90) {
                    aiCurrentAction = 'wander';
                    aiWanderDirection = Math.random() < 0.5 ? -1 : 1;
                } else {
                    aiCurrentAction = 'idle';
                }

                if (Math.random() < 0.25 && enemy.isGrounded) {
                    enemy.jump();
                }
            }

            // --- 3. MOVEMENT BASED ON ACTION ---
            if (enemy.state === 'idle' || enemy.state === 'moving' || enemy.state === 'jumping') {
                let aiSpeed = 3.5;

                switch (aiCurrentAction) {
                    case 'chase':
                        if (dist > closeRange) {
                            enemy.vx = enemy.facingLeft ? -aiSpeed : aiSpeed;
                            if (enemy.isGrounded) enemy.state = 'moving';
                        } else {
                            enemy.vx = 0;
                        }
                        break;

                    case 'retreat':
                        enemy.vx = enemy.facingLeft ? aiSpeed : -aiSpeed;
                        if (enemy.isGrounded) enemy.state = 'moving';
                        break;

                    case 'wander':
                        enemy.vx = aiWanderDirection * (aiSpeed * 0.7);
                        if (enemy.isGrounded) enemy.state = 'moving';
                        break;

                    case 'idle':
                        enemy.vx = 0;
                        if (enemy.isGrounded) enemy.state = 'idle';
                        break;
                }

                // --- 4. ATTACK SELECTION ---
                if (dist <= closeRange) {
                    if (Math.random() < 0.08) {
                        enemy.vx = 0;
                        enemy.attack(Math.random() < 0.5 ? 'punching' : 'kicking');
                    }
                }
            }
        }

        function updateGame() {
            frameCount++;
            handleInput();
            enemyAI();

            player.update();
            enemy.update();

            drawStage();
            player.draw();
            enemy.draw();

            if (player.health <= 0) {
                endGame('player');
                return;
            } else if (enemy.health <= 0) {
                endGame('enemy');
                return;
            }

            requestAnimationFrame(updateGame);
        }

        function startGame() {
            initAudio();

            score = 0; updateScoreDisplay();
            player.health = player.maxHealth;
            enemy.health = enemy.maxHealth;
            updateHealthBars();

            player.x = 100; player.y = GROUND_Y - player.height; player.state = 'idle'; player.combo = 0;
            enemy.x = 600; enemy.y = GROUND_Y - enemy.height; enemy.state = 'idle';

            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('victoryScreen').classList.add('hidden');

            isRunning = true;
            requestAnimationFrame(updateGame);
        }

        function endGame(loser) {
            isRunning = false;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('jimothy_fighter_high', highScore);
                document.getElementById('high-score-value').textContent = highScore;
            }

            if (loser === 'player') {
                document.getElementById('finalScoreText').textContent = score;
                document.getElementById('gameOverScreen').classList.remove('hidden');
            } else {
                document.getElementById('winScoreText').textContent = score;
                document.getElementById('victoryScreen').classList.remove('hidden');
            }
        }

        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;

            if (isRunning) {
                if (e.key === 'j' || e.key === 'J') player.attack('punching');
                if (e.key === 'k' || e.key === 'K') player.attack('kicking');
                if (e.key === ' ') player.jump();
            } else {
                 if (e.key === ' ' && !document.getElementById('startScreen').classList.contains('hidden')) {
                     startGame();
                 }
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;

            if (e.key === 'j' || e.key === 'J') document.getElementById('key-punch').classList.remove('active');
            if (e.key === 'k' || e.key === 'K') document.getElementById('key-kick').classList.remove('active');
            if (e.key === ' ') document.getElementById('key-jump').classList.remove('active');
        });

        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('restartBtn').addEventListener('click', startGame);
        document.getElementById('winBtn').addEventListener('click', startGame);

        drawStage();
        player.draw();
        enemy.draw();
        updateHealthBars();
  
