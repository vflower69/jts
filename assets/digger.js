/*
Game Features & Mechanics
Classic Digger Gameplay: Tunnel through dirt blocks to open pathways, collect trash snacks, and clear the screen to advance.
Dynamic Hazards:
Bear Traps (⚠️): Hidden in dirt tiles; step on one and you lose a life.
Volatile Bombs (💣): Touch them and they explode on impact.
Coyotes (🐺): Roam through cleared tunnels. They use pathfinding to pursue Jimothy whenever open pathways connect.
Proportional Scaling & Controls: Responsive canvas scaling with integrated touch-button controls for smartphones and tablets, plus full keyboard binding (WASD / Arrow Keys) for desktop and laptop play.
*/
/**
 * Audio Synthesizer Module (Web Audio API)
 * Generates elegant arcade sound effects natively without external files.
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
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
}

/**
 * Game Core Engine
 */
const GRID_SIZE = 12;
const TILE_EMPTY = 0;
const TILE_DIRT = 1;
const TILE_FOOD = 2;
const TILE_TRAP = 3;
const TILE_BOMB = 4;

const FOOD_ITEMS = ['🍕', '🍔', '🍩', '🍎', '🍉', '🍗'];

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.grid = [];
        this.tileSize = 50;

        this.player = { x: 0, y: 0 };
        this.coyotes = [];

        this.foodRemaining = 0;
        this.isGameOver = false;
        this.isGameRunning = false;

        this.inputDir = { x: 0, y: 0 };
        this.lastMoveTime = 0;
        this.moveInterval = 160; // ms per move step

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.sound.init();
            if (this.isGameOver) {
                this.score = 0;
                this.level = 1;
                this.lives = 3;
            }
            this.startLevel();
            document.getElementById('overlay').style.display = 'none';
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

        // Touch Control Bindings
        const bindTouch = (id, dir) => {
            const btn = document.getElementById(id);
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.sound.init();
                if (this.isGameRunning) this.inputDir = dir;
            });
        };

        bindTouch('btn-up', { x: 0, y: -1 });
        bindTouch('btn-down', { x: 0, y: 1 });
        bindTouch('btn-left', { x: -1, y: 0 });
        bindTouch('btn-right', { x: 1, y: 0 });
    }

    startLevel() {
        this.isGameRunning = true;
        this.isGameOver = false;
        this.tileSize = this.canvas.width / GRID_SIZE;
        this.foodRemaining = 0;
        this.inputDir = { x: 0, y: 0 };

        // Generate Grid
        this.grid = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            const row = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                if (x === 0 && y === 0) {
                    row.push(TILE_EMPTY); // Spawn point
                    continue;
                }

                const rand = Math.random();
                if (rand < 0.15) {
                    row.push(TILE_FOOD);
                    this.foodRemaining++;
                } else if (rand < 0.20 + Math.min(this.level * 0.02, 0.10)) {
                    row.push(TILE_TRAP);
                } else if (rand < 0.25 + Math.min(this.level * 0.02, 0.10)) {
                    row.push(TILE_BOMB);
                } else {
                    row.push(TILE_DIRT);
                }
            }
            this.grid.push(row);
        }

        // Reset Player Position
        this.player = { x: 0, y: 0 };

        // Generate Coyotes based on level difficulty
        this.coyotes = [];
        const coyoteCount = Math.min(1 + Math.floor(this.level / 2), 4);
        for (let i = 0; i < coyoteCount; i++) {
            this.coyotes.push({
                x: GRID_SIZE - 1 - i,
                y: GRID_SIZE - 1,
                lastMove: 0
            });
            this.grid[GRID_SIZE - 1][GRID_SIZE - 1 - i] = TILE_EMPTY;
        }

        this.updateUI();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    updateUI() {
        document.getElementById('score-val').textContent = this.score;
        document.getElementById('level-val').textContent = this.level;
        document.getElementById('lives-val').textContent = '🦝'.repeat(Math.max(0, this.lives));
    }

    gameLoop(timestamp) {
        if (!this.isGameRunning) return;

        if (timestamp - this.lastMoveTime > this.moveInterval) {
            this.updatePlayer();
            this.updateCoyotes(timestamp);
            this.lastMoveTime = timestamp;
        }

        this.render();

        if (this.isGameRunning) {
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    updatePlayer() {
        if (this.inputDir.x === 0 && this.inputDir.y === 0) return;

        const newX = this.player.x + this.inputDir.x;
        const newY = this.player.y + this.inputDir.y;

        // Boundary Check
        if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return;

        this.player.x = newX;
        this.player.y = newY;
        const currentTile = this.grid[newY][newX];

        if (currentTile === TILE_DIRT) {
            this.grid[newY][newX] = TILE_EMPTY;
            this.sound.playDig();
        } else if (currentTile === TILE_FOOD) {
            this.grid[newY][newX] = TILE_EMPTY;
            this.score += 100;
            this.foodRemaining--;
            this.sound.playEat();

            if (this.foodRemaining <= 0) {
                this.sound.playWin();
                this.level++;
                this.startLevel();
                return;
            }
        } else if (currentTile === TILE_TRAP) {
            this.handlePlayerHit('Trapped in a bear trap!');
            return;
        } else if (currentTile === TILE_BOMB) {
            this.sound.playExplode();
            this.handlePlayerHit('Blown up by trash bomb!');
            return;
        }

        // Reset input after executing move step
        this.inputDir = { x: 0, y: 0 };

        this.checkCoyoteCollisions();
    }

    updateCoyotes(timestamp) {
        // Coyotes move slightly slower than player on early levels
        const coyoteSpeedDelay = Math.max(220 - this.level * 15, 120);

        this.coyotes.forEach(coyote => {
            if (timestamp - coyote.lastMove < coyoteSpeedDelay) return;
            coyote.lastMove = timestamp;

            // Simple AI: Head toward player through excavated dirt or empty space
            const possibleMoves = [
                { x: coyote.x + 1, y: coyote.y },
                { x: coyote.x - 1, y: coyote.y },
                { x: coyote.x, y: coyote.y + 1 },
                { x: coyote.x, y: coyote.y - 1 }
            ].filter(pos => 
                pos.x >= 0 && pos.x < GRID_SIZE &&
                pos.y >= 0 && pos.y < GRID_SIZE &&
                this.grid[pos.y][pos.x] === TILE_EMPTY // Coyotes can only move in dug tunnels
            );

            if (possibleMoves.length > 0) {
                // Pick move closest to player
                possibleMoves.sort((a, b) => {
                    const distA = Math.hypot(a.x - this.player.x, a.y - this.player.y);
                    const distB = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                    return distA - distB;
                });
                coyote.x = possibleMoves[0].x;
                coyote.y = possibleMoves[0].y;
            }
        });

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
            this.showOverlay('GAME OVER', `${reason} Score: ${this.score}`);
        } else {
            // Respawn player at top-left safely
            this.player = { x: 0, y: 0 };
            this.grid[0][0] = TILE_EMPTY;
        }
    }

    showOverlay(title, msg) {
        const overlay = document.getElementById('overlay');
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-msg').textContent = msg;
        document.getElementById('start-btn').textContent = this.isGameOver ? 'RETRY' : 'NEXT LEVEL';
        overlay.style.display = 'flex';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Grid
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
                    // Empty Tunnel
                    this.ctx.fillStyle = '#1c1e24';
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }

                // Render Objects
                this.ctx.font = `${this.tileSize * 0.6}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';

                const centerX = px + this.tileSize / 2;
                const centerY = py + this.tileSize / 2;

                if (cell === TILE_FOOD) {
                    const foodIcon = FOOD_ITEMS[(x + y) % FOOD_ITEMS.length];
                    this.ctx.fillText(foodIcon, centerX, centerY);
                } else if (cell === TILE_TRAP) {
                    this.ctx.fillText('⚠️', centerX, centerY);
                } else if (cell === TILE_BOMB) {
                    this.ctx.fillText('💣', centerX, centerY);
                }
            }
        }

        // Render Coyotes
        this.ctx.font = `${this.tileSize * 0.7}px sans-serif`;
        this.coyotes.forEach(coyote => {
            this.ctx.fillText('🐺', coyote.x * this.tileSize + this.tileSize / 2, coyote.y * this.tileSize + this.tileSize / 2);
        });

        // Render Player (Jimothy the Raccoon)
        this.ctx.fillText('🦝', this.player.x * this.tileSize + this.tileSize / 2, this.player.y * this.tileSize + this.tileSize / 2);
    }
}

// Start Game Setup
window.onload = () => {
    new Game();
};
