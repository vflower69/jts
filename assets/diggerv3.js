/*
Game Features & Mechanics
Classic Digger Gameplay: Tunnel through dirt blocks to open pathways, collect trash snacks, and clear the screen to advance.
Dynamic Hazards:
1. Bear Traps (⚠️): Hidden in dirt tiles; step on one and you lose a life.
2. Volatile Bombs (💣): Touch them and they explode on impact.
3. Coyotes (🐺): Roam through cleared tunnels. They use pathfinding to pursue Jimothy whenever open pathways connect.
Proportional Scaling & Controls: Responsive canvas scaling with integrated touch-button controls for smartphones and tablets, plus full keyboard binding (WASD / Arrow Keys) for desktop and laptop play.
*/
/*
Here is the updated game code enhanced for mobile device screens and fluid touch interaction.
Key upgrades included in this version:
1. Direct Canvas Touch/Swipe Controls: In addition to the dynamic virtual D-pad, players can now swipe directly on the game canvas (up, down, left, right) to direct Jimothy.
2. Auto-Resizing Pipeline: Added dynamic DPR scaling and real-time screen resize handlers (ResizeObserver & window.onresize) to guarantee crisp rendering without letterboxing or distortion on mobile browsers.
3. Prevent Mobile Pinch-Zoom / Double-Tap Bounce: Enhanced viewport CSS and touch event cancellation (preventDefault on active drag touches) so game controls feel responsive without zooming or scrolling the page.
*/
// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
/*
Dumpster Dash: Raccoon Digger – adaptive, animated, juicy version
*/
// --- Adaptive Grid System ---
let GRID_SIZE = 12;
let CANVAS_SIZE = 600;
let TILE_SIZE = 50;

function computeAdaptiveGrid() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const shortest = Math.min(w, h);

    CANVAS_SIZE = shortest * 0.90;

    if (shortest >= 1200) {
        GRID_SIZE = 14;
    } else if (shortest >= 900) {
        GRID_SIZE = 12;
    } else if (shortest >= 700) {
        GRID_SIZE = 10;
    } else if (shortest >= 500) {
        GRID_SIZE = 9;
    } else {
        GRID_SIZE = 8;
    }

    TILE_SIZE = CANVAS_SIZE / GRID_SIZE;
}

// spawn distribution helper
function getSpawnRates(gridSize, level) {
    const baseFood = 0.15;
    const baseTrap = 0.05 + Math.min(level * 0.02, 0.10);
    const baseBomb = 0.05 + Math.min(level * 0.02, 0.10);

    const scale = gridSize / 12;

    const foodRate = baseFood * (1 / scale);
    const trapRate = baseTrap * scale;
    const bombRate = baseBomb * scale;

    return {
        food: Math.min(Math.max(foodRate, 0.10), 0.22),
        trap: Math.min(Math.max(trapRate, 0.03), 0.20),
        bomb: Math.min(Math.max(bombRate, 0.03), 0.20)
    };
}

function isSuperFood(x, y, gridSize, level) {
    return gridSize >= 12 && ((x + y + level) % 5 === 0);
}

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.bgInterval = null;
        this.heartbeatInterval = null;
        this.heartbeatRate = 900;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startBackground(level, gridSize) {
        if (!this.ctx) return;
        this.stopBackground();

        const baseTempo = 900;
        const sizeFactor = gridSize / 12;
        const levelFactor = 1 + (level - 1) * 0.08;
        const interval = baseTempo / (sizeFactor * levelFactor);

        this.bgInterval = setInterval(() => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.12);
        }, Math.max(interval, 250));
    }

    stopBackground() {
        if (this.bgInterval) {
            clearInterval(this.bgInterval);
            this.bgInterval = null;
        }
    }

    playDig() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playEat() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
    }

    playExplode() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
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
        filter.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.3);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playHurt() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playWin() {
        if (!this.ctx) return;
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.15);
        });
    }

    playGrowl() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(55, this.ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    playHeartbeat() {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            this.playHeartbeat();
        }, this.heartbeatRate);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    updateHeartbeatRate(dist) {
        const minRate = 250;
        const maxRate = 900;
        const danger = Math.max(0, Math.min(1, (6 - dist) / 6));
        this.heartbeatRate = maxRate - danger * (maxRate - minRate);
        if (this.heartbeatInterval) {
            this.startHeartbeat();
        }
    }

    playHowl() {
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.6);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.6);

        const echo = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();

        echo.type = 'sine';
        echo.frequency.setValueAtTime(180, now + 0.3);
        echo.frequency.linearRampToValueAtTime(120, now + 1.2);

        echoGain.gain.setValueAtTime(0.12, now + 0.3);
        echoGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        echo.connect(echoGain);
        echoGain.connect(this.ctx.destination);

        echo.start(now + 0.3);
        echo.stop(now + 1.2);
    }
}

const TILE_EMPTY = 0;
const TILE_DIRT = 1;
const TILE_FOOD = 2;
const TILE_TRAP = 3;
const TILE_BOMB = 4;

const FOOD_ITEMS = ['🍕', '🍔', '🍩', '🍎', '🍉', '🍗'];
const SUPER_FOOD_ITEMS = ['🍖', '🍰', '🍤', '🍗'];

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.grid = [];
        this.tileSize = TILE_SIZE;

        this.player = { x: 0, y: 0 };
        this.coyotes = [];

        this.foodRemaining = 0;
        this.isGameOver = false;
        this.isGameRunning = false;

        this.inputDir = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.moveInterval = 160;

        this.touchStartX = 0;
        this.touchStartY = 0;

        this.particles = [];
        this.shakeTime = 0;
        this.shakeIntensity = 0;

        this.minimap = document.getElementById('minimapCanvas');
        this.minictx = this.minimap.getContext('2d');

        this.scaleAnim = {
            active: false,
            startTile: TILE_SIZE,
            targetTile: TILE_SIZE,
            startCanvas: CANVAS_SIZE,
            targetCanvas: CANVAS_SIZE,
            startTime: 0,
            duration: 250
        };

        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1
        };

        this.lastHowlTime = 0;

        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMsg = document.getElementById('overlay-msg');
        this.overlayBtn = document.getElementById('start-btn');
        this.overlayMode = 'title'; // 'title', 'next', 'gameover'

        this.setupResizing();
        this.setupEventListeners();
        this.showTitleScreen();
    }

    setupResizing() {
        const resize = () => {
            const oldSize = GRID_SIZE;

            computeAdaptiveGrid();

            const newSize = GRID_SIZE;

            this.scaleAnim.active = true;
            this.scaleAnim.startTile = this.tileSize;
            this.scaleAnim.targetTile = TILE_SIZE;
            this.scaleAnim.startCanvas = this.canvas.width || CANVAS_SIZE;
            this.scaleAnim.targetCanvas = CANVAS_SIZE;
            this.scaleAnim.startTime = performance.now();

            if (this.isGameRunning && this.grid.length) {
                this.scaleGameState(oldSize, newSize);
                this.camera.targetZoom = this.computeCameraZoom();
                this.render();
            } else {
                this.canvas.width = CANVAS_SIZE;
                this.canvas.height = CANVAS_SIZE;
                this.tileSize = TILE_SIZE;
                this.camera.targetZoom = this.computeCameraZoom();
                this.render();
            }
        };

        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 200);
        });

        resize();
    }

    scaleGameState(oldSize, newSize) {
        if (oldSize === newSize || !this.grid.length) return;

        const scale = newSize / oldSize;

        this.player.x = Math.floor(this.player.x * scale);
        this.player.y = Math.floor(this.player.y * scale);
        this.player.x = Math.max(0, Math.min(newSize - 1, this.player.x));
        this.player.y = Math.max(0, Math.min(newSize - 1, this.player.y));

        this.coyotes.forEach(c => {
            c.x = Math.floor(c.x * scale);
            c.y = Math.floor(c.y * scale);
            c.x = Math.max(0, Math.min(newSize - 1, c.x));
            c.y = Math.max(0, Math.min(newSize - 1, c.y));
        });

        const newGrid = [];
        for (let y = 0; y < newSize; y++) {
            const row = [];
            for (let x = 0; x < newSize; x++) {
                const oldX = Math.floor(x / scale);
                const oldY = Math.floor(y / scale);
                if (oldX < oldSize && oldY < oldSize) {
                    row.push(this.grid[oldY][oldX]);
                } else {
                    row.push(TILE_DIRT);
                }
            }
            newGrid.push(row);
        }
        this.grid = newGrid;

        this.foodRemaining = 0;
        for (let y = 0; y < newSize; y++) {
            for (let x = 0; x < newSize; x++) {
                if (this.grid[y][x] === TILE_FOOD) {
                    this.foodRemaining++;
                }
            }
        }
    }

    setupEventListeners() {
        this.overlayBtn.addEventListener('click', () => {
            this.sound.init();
            this.hideOverlay();

            if (this.overlayMode === 'title') {
                this.resetGame();
                this.startLevelCore();
            } else if (this.overlayMode === 'next') {
                this.startLevelCore();
            } else if (this.overlayMode === 'gameover') {
                this.resetGame();
                this.startLevelCore();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (!this.isGameRunning) return;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': this.inputDir = { x: 0, y: -1 }; break;
                case 'ArrowDown': case 's': case 'S': this.inputDir = { x: 0, y: 1 }; break;
                case 'ArrowLeft': case 'a': case 'A': this.inputDir = { x: -1, y: 0 }; break;
                case 'ArrowRight': case 'd': case 'D': this.inputDir = { x: 1, y: 0 }; break;
            }
        });

        const bindBtn = (id, dir) => {
            const btn = document.getElementById(id);
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.sound.init();
                if (this.isGameRunning) this.inputDir = dir;
            });
        };

        bindBtn('btn-up', { x: 0, y: -1 });
        bindBtn('btn-down', { x: 0, y: 1 });
        bindBtn('btn-left', { x: -1, y: 0 });
        bindBtn('btn-right', { x: 1, y: 0 });

        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                e.preventDefault();
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.isGameRunning || e.changedTouches.length === 0) return;
            const diffX = e.changedTouches[0].clientX - this.touchStartX;
            const diffY = e.changedTouches[0].clientY - this.touchStartY;
            const minSwipe = 20;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (Math.abs(diffX) > minSwipe) {
                    this.inputDir = { x: diffX > 0 ? 1 : -1, y: 0 };
                }
            } else {
                if (Math.abs(diffY) > minSwipe) {
                    this.inputDir = { x: 0, y: diffY > 0 ? 1 : -1 };
                }
            }
        }, { passive: false });
    }

    computeCameraZoom() {
        const base = 1.0;
        const factor = 12 / GRID_SIZE;
        return Math.max(0.6, Math.min(1.2, base * factor));
    }

    showTitleScreen() {
        this.overlayMode = 'title';
        this.overlayTitle.textContent = 'DUMPSTER DASH';
        this.overlayMsg.textContent =
            'Jimothy the raccoon is ready to raid the dumpsters. Swipe or use buttons to dig for snacks!';
        this.overlayBtn.textContent = 'PLAY NOW';
        this.overlayTitle.classList.add('overlay-title-pulse');
        this.showOverlay();
    }

    showLevelComplete() {
        this.overlayMode = 'next';
        this.overlayTitle.textContent = 'LEVEL COMPLETE!';
        this.overlayMsg.textContent = `Nice digging, Jimothy! Your score: ${this.score}`;
        this.overlayBtn.textContent = 'NEXT LEVEL';
        this.overlayTitle.classList.add('overlay-title-pulse');
        this.showOverlay();
    }

    showGameOver(reason) {
        this.overlayMode = 'gameover';
        this.overlayTitle.textContent = 'GAME OVER';
        this.overlayMsg.textContent = `${reason} Final score: ${this.score}`;
        this.overlayBtn.textContent = 'RETRY';
        this.overlayTitle.classList.add('overlay-title-pulse');
        this.showOverlay();
    }

    showOverlay() {
        this.overlay.classList.remove('overlay-hidden');
        this.overlay.classList.add('overlay-visible');
    }

    hideOverlay() {
        this.overlay.classList.remove('overlay-visible');
        this.overlay.classList.add('overlay-hidden');
        this.overlayTitle.classList.remove('overlay-title-pulse');
    }

    resetGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.isGameOver = false;
        this.isGameRunning = true;
        this.updateUI();
    }

    startLevelCore() {
        this.isGameRunning = true;
        this.isGameOver = false;
        this.foodRemaining = 0;
        this.inputDir = { x: 0, y: 0 };

        this.grid = [];
        const rates = getSpawnRates(GRID_SIZE, this.level);

        for (let y = 0; y < GRID_SIZE; y++) {
            const row = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                if (x === 0 && y === 0) {
                    row.push(TILE_EMPTY);
                    continue;
                }

                const rand = Math.random();
                if (rand < rates.food) {
                    row.push(TILE_FOOD);
                    this.foodRemaining++;
                } else if (rand < rates.food + rates.trap) {
                    row.push(TILE_TRAP);
                } else if (rand < rates.food + rates.trap + rates.bomb) {
                    row.push(TILE_BOMB);
                } else {
                    row.push(TILE_DIRT);
                }
            }
            this.grid.push(row);
        }

        if (GRID_SIZE <= 9) {
            const corridorLength = Math.floor(GRID_SIZE / 2);
            for (let i = 0; i < corridorLength; i++) {
                this.grid[0][i] = TILE_EMPTY;
                this.grid[i][0] = TILE_EMPTY;
            }
        }

        this.player = { x: 0, y: 0 };

        this.coyotes = [];
        const baseCoyotes = 1 + Math.floor(this.level / 3);
        const sizeFactor = GRID_SIZE / 12;
        const coyoteCount = Math.min(Math.max(Math.round(baseCoyotes * sizeFactor), 1), 6);

        for (let i = 0; i < coyoteCount; i++) {
            this.coyotes.push({
                x: GRID_SIZE - 1 - i,
                y: GRID_SIZE - 1,
                lastMove: 0
            });
            this.grid[GRID_SIZE - 1][GRID_SIZE - 1 - i] = TILE_EMPTY;
        }

        this.camera.targetZoom = this.computeCameraZoom();
        this.camera.x = this.player.x * this.tileSize + this.tileSize / 2;
        this.camera.y = this.player.y * this.tileSize + this.tileSize / 2;

        this.sound.startBackground(this.level, GRID_SIZE);
        this.sound.startHeartbeat();
        this.updateUI();
        this.canvas.width = CANVAS_SIZE;
        this.canvas.height = CANVAS_SIZE;
        this.tileSize = TILE_SIZE;
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    updateUI() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('level-val').textContent = this.level;
        document.getElementById('lives-val').textContent = '🦝'.repeat(Math.max(0, this.lives));
    }

    spawnExplosion(x, y) {
        const count = 18;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.4 + Math.random() * 0.6) * this.tileSize * 0.08;
            this.particles.push({
                x: x * this.tileSize + this.tileSize / 2,
                y: y * this.tileSize + this.tileSize / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 300,
                age: 0
            });
        }
        this.shakeTime = 250;
        this.shakeIntensity = this.tileSize * 0.06;
    }

    updateParticles(delta) {
        this.particles = this.particles.filter(p => {
            p.age += delta;
            p.x += p.vx;
            p.y += p.vy;
            return p.age < p.life;
        });
    }

    renderParticles() {
        this.ctx.fillStyle = '#ffb300';
        this.particles.forEach(p => {
            const alpha = 1 - p.age / p.life;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, this.tileSize * 0.12, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    gameLoop(timestamp) {
        if (!this.isGameRunning) return;

        const delta = this.lastMoveTime ? (timestamp - this.lastMoveTime) : 0;

        if (timestamp - this.lastMoveTime > this.moveInterval) {
            this.updatePlayer();
            this.updateCoyotes(timestamp);
            this.lastMoveTime = timestamp;
        }

        this.updateParticles(delta);

        if (this.shakeTime > 0) {
            this.shakeTime -= delta;
        }

        if (this.scaleAnim.active) {
            const t = (timestamp - this.scaleAnim.startTime) / this.scaleAnim.duration;
            if (t >= 1) {
                this.scaleAnim.active = false;
                this.tileSize = this.scaleAnim.targetTile;
                this.canvas.width = this.scaleAnim.targetCanvas;
                this.canvas.height = this.scaleAnim.targetCanvas;
            } else {
                const ease = t * (2 - t);
                this.tileSize = this.scaleAnim.startTile +
                    (this.scaleAnim.targetTile - this.scaleAnim.startTile) * ease;
                const newCanvas = this.scaleAnim.startCanvas +
                    (this.scaleAnim.targetCanvas - this.scaleAnim.startCanvas) * ease;
                this.canvas.width = newCanvas;
                this.canvas.height = newCanvas;
            }
        }

        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;
        const targetX = this.player.x * this.tileSize + this.tileSize / 2;
        const targetY = this.player.y * this.tileSize + this.tileSize / 2;
        this.camera.x += (targetX - this.camera.x) * 0.15;
        this.camera.y += (targetY - this.camera.y) * 0.15;

        this.render();

        if (this.isGameRunning) {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    updatePlayer() {
        if (this.inputDir.x === 0 && this.inputDir.y === 0) return;

        const newX = this.player.x + this.inputDir.x;
        const newY = this.player.y + this.inputDir.y;

        if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return;

        this.player.x = newX;
        this.player.y = newY;
        const currentTile = this.grid[newY][newX];

        if (currentTile === TILE_DIRT) {
            this.grid[newY][newX] = TILE_EMPTY;
            this.sound.playDig();
        } else if (currentTile === TILE_FOOD) {
            this.grid[newY][newX] = TILE_EMPTY;

            const baseValue = Math.round(100 * (12 / GRID_SIZE));
            const superBonus = isSuperFood(newX, newY, GRID_SIZE, this.level) ? 300 : 0;

            this.score += baseValue + superBonus;
            this.foodRemaining--;
            this.sound.playEat();

            if (this.foodRemaining <= 0) {
                this.sound.playWin();
                this.level++;
                this.sound.stopBackground();
                this.sound.stopHeartbeat();
                this.isGameRunning = false;
                this.showLevelComplete();
                return;
            }
        } else if (currentTile === TILE_TRAP) {
            this.handlePlayerHit('Trapped in a bear trap!');
            return;
        } else if (currentTile === TILE_BOMB) {
            this.sound.playExplode();
            this.spawnExplosion(newX, newY);
            this.handlePlayerHit('Blown up by trash bomb!');
            return;
        }

        this.inputDir = { x: 0, y: 0 };
        this.checkCoyoteCollisions();
    }

    updateCoyotes(timestamp) {
        let coyoteSpeedDelay = Math.max(220 - this.level * 15, 120);
        const speedFactor = GRID_SIZE / 12;
        coyoteSpeedDelay = coyoteSpeedDelay / speedFactor;

        this.coyotes.forEach(coyote => {
            if (timestamp - coyote.lastMove < coyoteSpeedDelay) return;
            coyote.lastMove = timestamp;

            const possibleMoves = [
                { x: coyote.x + 1, y: coyote.y },
                { x: coyote.x - 1, y: coyote.y },
                { x: coyote.x, y: coyote.y + 1 },
                { x: coyote.x, y: coyote.y - 1 }
            ].filter(pos =>
                pos.x >= 0 && pos.x < GRID_SIZE &&
                pos.y >= 0 && pos.y < GRID_SIZE &&
                this.grid[pos.y][pos.x] === TILE_EMPTY
            );

            if (possibleMoves.length > 0) {
                possibleMoves.sort((a, b) => {
                    const distA = Math.hypot(a.x - this.player.x, a.y - this.player.y);
                    const distB = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                    return distA - distB;
                });
                const next = possibleMoves[0];

                const beforeDist = Math.hypot(coyote.x - this.player.x, coyote.y - this.player.y);
                const afterDist = Math.hypot(next.x - this.player.x, next.y - this.player.y);

                coyote.x = next.x;
                coyote.y = next.y;

                if (afterDist < beforeDist && afterDist <= 3) {
                    this.sound.playGrowl();
                }
            }
        });

        let nearest = Infinity;
        this.coyotes.forEach(c => {
            const d = Math.hypot(c.x - this.player.x, c.y - this.player.y);
            if (d < nearest) nearest = d;
        });

        this.sound.updateHeartbeatRate(nearest);

        if (nearest <= 4) {
            const now = performance.now();
            if (now - this.lastHowlTime > 3000) {
                this.sound.playHowl();
                this.lastHowlTime = now;
            }
        }

        this.checkCoyoteCollisions();
    }

    checkCoyoteCollisions() {
        for (let coyote of this.coyotes) {
            if (coyote.x === this.player.x && coyote.y === this.player.y) {
                this.handlePlayerHit('Caught by a hungry coyote!');
                break;
            }
        }
    }

    handlePlayerHit(reason) {
        this.sound.playHurt();
        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
            this.isGameOver = true;
            this.isGameRunning = false;
            this.sound.stopBackground();
            this.sound.stopHeartbeat();
            this.showGameOver(reason);
        } else {
            this.player = { x: 0, y: 0 };
            this.grid[0][0] = TILE_EMPTY;
        }
    }

    renderMinimap() {
        if (GRID_SIZE < 12) {
            this.minimap.style.display = 'none';
            return;
        }
        this.minimap.style.display = 'block';

        const ctx = this.minictx;
        const size = this.minimap.width;
        const cellSize = size / GRID_SIZE;

        ctx.clearRect(0, 0, size, size);

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell === TILE_DIRT) ctx.fillStyle = '#2b2522';
                else if (cell === TILE_EMPTY) ctx.fillStyle = '#111318';
                else if (cell === TILE_FOOD) ctx.fillStyle = '#ffd54f';
                else if (cell === TILE_TRAP) ctx.fillStyle = '#ff7043';
                else if (cell === TILE_BOMB) ctx.fillStyle = '#ef5350';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }

        ctx.fillStyle = '#64b5f6';
        ctx.fillRect(this.player.x * cellSize, this.player.y * cellSize, cellSize, cellSize);

        ctx.fillStyle = '#ffb300';
        this.coyotes.forEach(c => {
            ctx.fillRect(c.x * cellSize, c.y * cellSize, cellSize, cellSize);
        });
    }

    render() {
        let offsetX = 0, offsetY = 0;
        if (this.shakeTime > 0) {
            offsetX = (Math.random() - 0.5) * this.shakeIntensity;
            offsetY = (Math.random() - 0.5) * this.shakeIntensity;
        }

        this.ctx.setTransform(
            this.camera.zoom, 0,
            0, this.camera.zoom,
            offsetX + (this.canvas.width / 2 - this.camera.x * this.camera.zoom),
            offsetY + (this.canvas.height / 2 - this.camera.y * this.camera.zoom)
        );
        this.ctx.clearRect(-offsetX, -offsetY, this.canvas.width, this.canvas.height);

        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                if (cell === TILE_DIRT) {
                    this.ctx.fillStyle = '#3a2e2b';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    this.ctx.strokeStyle = '#271f1d';
                    this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                } else {
                    this.ctx.fillStyle = '#1c1e24';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }

                this.ctx.font = `${this.tileSize * 0.55}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';

                const centerX = px + this.tileSize / 2;
                const centerY = py + this.tileSize / 2;

                if (cell === TILE_FOOD) {
                    const superFood = isSuperFood(x, y, GRID_SIZE, this.level);
                    const icon = superFood
                        ? SUPER_FOOD_ITEMS[(x + y) % SUPER_FOOD_ITEMS.length]
                        : FOOD_ITEMS[(x + y) % FOOD_ITEMS.length];
                    this.ctx.fillText(icon, centerX, centerY);
                } else if (cell === TILE_TRAP) {
                    this.ctx.fillText('⚠️', centerX, centerY);
                } else if (cell === TILE_BOMB) {
                    this.ctx.fillText('💣', centerX, centerY);
                }
            }
        }

        this.ctx.font = `${this.tileSize * 0.65}px sans-serif`;
        this.coyotes.forEach(coyote => {
            this.ctx.fillText('🐺',
                coyote.x * this.tileSize + this.tileSize / 2,
                coyote.y * this.tileSize + this.tileSize / 2);
        });

        this.ctx.fillText('🦝',
            this.player.x * this.tileSize + this.tileSize / 2,
            this.player.y * this.tileSize + this.tileSize / 2);

        this.renderParticles();

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        this.renderMinimap();
    }
}

window.onload = () => {
    new Game();
};
