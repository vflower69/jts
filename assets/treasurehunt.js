class SoundFX {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    playStep() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }
    playDig() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
    playChime() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.4);
    }
}

const sfx = new SoundFX();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 16;
const TILE_SIZE = 40;

const player = { x: 1, y: 1, dir: 'S' };
let map = []; // 16x16 grid
let fog = []; // 16x16 fog grid
let secrets = [];
let collectedRunes = [false, false, false, false];
let hasVaultKey = false;
let hasCrown = false;
let gameState = 'MENU';

const RUNE_SYMBOLS = ['🔥', '🌊', '🌪️', '🌱'];
let currentPuzzleRotations = [0, 0, 0, 0];
const targetPuzzleSolution = [2, 0, 3, 1]; // Correct sequence required

function log(msg, type = '') {
    const box = document.getElementById('log-box');
    const div = document.createElement('div');
    div.className = 'log-entry';
    if (type === 'highlight') div.innerHTML = `<span class="log-highlight">${msg}</span>`;
    else if (type === 'gold') div.innerHTML = `<span class="log-gold">${msg}</span>`;
    else div.innerText = msg;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function initMap() {
    map = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0));
    fog = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(true));

    // Generate terrain: 0=Grass, 1=Water/Shore, 2=Forest, 3=Mountains
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (r === 0 || c === 0 || r === GRID_SIZE - 1 || c === GRID_SIZE - 1) {
                map[r][c] = 1; // Shoreline border
            } else if ((r > 3 && r < 7 && c > 8 && c < 12) || (r > 10 && c < 5)) {
                map[r][c] = 2; // Dense Forest
            } else if (r > 8 && r < 12 && c > 8 && c < 12) {
                map[r][c] = 3; // Mountain Ridge
            } else {
                map[r][c] = 0; // Open Meadow
            }
        }
    }

    // Place Secrets & Landmarks
    secrets = [
        { x: 3, y: 4, type: 'OBELISK', runeIdx: 0, clue: "Rune I rests where the southern trees whisper (Coord: [12, 3]).", found: false },
        { x: 12, y: 3, type: 'CACHE', runeIdx: 0, found: false },
        
        { x: 14, y: 10, type: 'OBELISK', runeIdx: 1, clue: "Rune II lies buried beneath the western mountain shade (Coord: [7, 10]).", found: false },
        { x: 7, y: 10, type: 'CACHE', runeIdx: 1, found: false },

        { x: 2, y: 13, type: 'OBELISK', runeIdx: 2, clue: "Rune III is hidden near the north-eastern coast (Coord: [13, 13]).", found: false },
        { x: 13, y: 13, type: 'CACHE', runeIdx: 2, found: false },

        { x: 6, y: 2, type: 'OBELISK', runeIdx: 3, clue: "Rune IV sits inside the central forest hollow (Coord: [5, 6]).", found: false },
        { x: 5, y: 6, type: 'CACHE', runeIdx: 3, found: false },

        { x: 10, y: 14, type: 'KEY_CHEST', found: false },
        { x: 8, y: 8, type: 'VAULT', found: false }
    ];

    clearFog(player.x, player.y);
}

function clearFog(px, py) {
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const nr = py + dr, nc = px + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                fog[nr][nc] = false;
            }
        }
    }
}

function updateSonar() {
    let minDist = 999;
    secrets.forEach(s => {
        if (!s.found) {
            const d = Math.hypot(s.x - player.x, s.y - player.y);
            if (d < minDist) minDist = d;
        }
    });

    const signal = document.getElementById('sonar-signal');
    const text = document.getElementById('sonar-text');

    if (minDist <= 1.5) {
        signal.style.background = '#ff0055';
        signal.style.boxShadow = '0 0 12px #ff0055';
        text.innerText = 'SIGNAL: HOT';
    } else if (minDist <= 4) {
        signal.style.background = '#d4af37';
        signal.style.boxShadow = '0 0 8px #d4af37';
        text.innerText = 'SIGNAL: WARM';
    } else {
        signal.style.background = '#484f58';
        signal.style.boxShadow = '0 0 4px #484f58';
        text.innerText = 'SIGNAL: COLD';
    }
}

function checkTileInteraction() {
    const sec = secrets.find(s => s.x === player.x && s.y === player.y && !s.found);
    if (!sec) return;

    if (sec.type === 'OBELISK') {
        sfx.playChime();
        sec.found = true;
        log(`[OBELISK DISCOVERED] Deciphering Ancient Inscription...`, 'highlight');
        log(`> "${sec.clue}"`, 'gold');
    } else if (sec.type === 'VAULT') {
        openVaultModal();
    }
}

function digCurrentTile() {
    sfx.playDig();
    const sec = secrets.find(s => s.x === player.x && s.y === player.y && !s.found);
    
    if (sec && sec.type === 'CACHE') {
        sfx.playChime();
        sec.found = true;
        collectedRunes[sec.runeIdx] = true;
        document.getElementById(`slot-rune${sec.runeIdx + 1}`).classList.add('active');
        document.getElementById(`slot-rune${sec.runeIdx + 1}`).innerHTML = `<span>${RUNE_SYMBOLS[sec.runeIdx]}</span>Rune ${sec.runeIdx + 1}`;
        log(`[EXCAVATION SUCCESS] Unearthing Rune ${sec.runeIdx + 1}: ${RUNE_SYMBOLS[sec.runeIdx]}!`, 'gold');
    } else if (sec && sec.type === 'KEY_CHEST') {
        sfx.playChime();
        sec.found = true;
        hasVaultKey = true;
        document.getElementById('slot-key').classList.add('active');
        log(`[TREASURE CHEST] You excavated the ancient Vault Key 🗝️!`, 'gold');
    } else {
        log(`Excavated tile [${player.x}, ${player.y}]... Nothing but dirt.`);
    }
}

function openVaultModal() {
    if (!hasVaultKey) {
        log(`[SUNKEN VAULT] The massive stone door is locked. A keyhole in the shape of a crest is visible.`, 'highlight');
        return;
    }
    const missingRunes = collectedRunes.filter(r => !r).length;
    if (missingRunes > 0) {
        log(`[SUNKEN VAULT] You need all 4 Elemental Runes to align the door mechanism. (${missingRunes} missing)`, 'highlight');
        return;
    }

    gameState = 'PUZZLE';
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modal-title').innerText = "SUNKEN VAULT";
    document.getElementById('modal-desc').innerText = "Align the 4 Elemental Runes based on the clues gathered across the island.";
    document.getElementById('puzzle-container').style.display = 'flex';
    document.getElementById('modalBtn').style.display = 'none';
}

function rotateRune(idx) {
    currentPuzzleRotations[idx] = (currentPuzzleRotations[idx] + 1) % 4;
    document.getElementById(`rw${idx}`).innerText = RUNE_SYMBOLS[currentPuzzleRotations[idx]];
    sfx.playStep();
}

function checkVaultPuzzle() {
    let match = true;
    for (let i = 0; i < 4; i++) {
        if (currentPuzzleRotations[i] !== targetPuzzleSolution[i]) match = false;
    }

    if (match) {
        sfx.playChime();
        hasCrown = true;
        document.getElementById('slot-crown').classList.add('active');
        document.getElementById('puzzle-container').style.display = 'none';
        document.getElementById('modal-title').innerText = "THE ASTRAL CROWN CLAIMED!";
        document.getElementById('modal-desc').innerText = "Congratulations! You have unlocked the Sunken Vault and extracted the legendary Astral Crown! Island mastery achieved.";
        document.getElementById('modalBtn').style.display = 'inline-block';
        document.getElementById('modalBtn').innerText = 'Play Again';
        gameState = 'VICTORY';
    } else {
        log("[VAULT MECHANISM] The runes glow red and reset. Incorrect sequence!", 'highlight');
    }
}

function movePlayer(dx, dy) {
    if (gameState !== 'PLAYING') return;

    const nx = player.x + dx;
    const ny = player.y + dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (map[ny][nx] !== 1) { // Not deep water
            player.x = nx;
            player.y = ny;
            clearFog(nx, ny);
            sfx.playStep();
            updateSonar();
            checkTileInteraction();
        }
    }
}

window.addEventListener('keydown', e => {
    if (gameState !== 'PLAYING') return;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') movePlayer(0, -1);
    if (e.code === 'KeyS' || e.code === 'ArrowDown') movePlayer(0, 1);
    if (e.code === 'KeyA' || e.code === 'ArrowLeft') movePlayer(-1, 0);
    if (e.code === 'KeyD' || e.code === 'ArrowRight') movePlayer(1, 0);
    if (e.code === 'Space' || e.code === 'KeyE') digCurrentTile();
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Map Tiles
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const x = c * TILE_SIZE;
            const y = r * TILE_SIZE;

            if (fog[r][c]) {
                ctx.fillStyle = '#080a0f';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                continue;
            }

            const t = map[r][c];
            if (t === 0) ctx.fillStyle = '#1e3a1e'; // Meadow
            else if (t === 1) ctx.fillStyle = '#0d2b45'; // Shoreline
            else if (t === 2) ctx.fillStyle = '#0b2912'; // Forest
            else if (t === 3) ctx.fillStyle = '#3a3a46'; // Mountain
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    }

    // Draw Secrets (if revealed/unfogged)
    secrets.forEach(s => {
        if (!fog[s.y][s.x]) {
            const x = s.x * TILE_SIZE + TILE_SIZE / 2;
            const y = s.y * TILE_SIZE + TILE_SIZE / 2;

            if (s.type === 'OBELISK') {
                ctx.fillStyle = s.found ? '#8b949e' : '#d4af37';
                ctx.fillRect(x - 8, y - 12, 16, 24);
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px sans-serif';
                ctx.fillText('🗿', x - 6, y + 4);
            } else if (s.type === 'VAULT') {
                ctx.fillStyle = '#aa7c11';
                ctx.fillRect(x - 14, y - 14, 28, 28);
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px sans-serif';
                ctx.fillText('🏛️', x - 9, y + 5);
            } else if (s.found && s.type === 'CACHE') {
                ctx.fillStyle = '#58a6ff';
                ctx.font = '12px sans-serif';
                ctx.fillText('✨', x - 6, y + 4);
            }
        }
    });

    // Draw Player
    const px = player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = player.y * TILE_SIZE + TILE_SIZE / 2;

    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#58a6ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    requestAnimationFrame(draw);
}

function startOrResumeGame() {
    if (gameState === 'VICTORY') {
        collectedRunes = [false, false, false, false];
        hasVaultKey = false;
        hasCrown = false;
        player.x = 1; player.y = 1;
        document.querySelectorAll('.inv-slot').forEach((el, idx) => {
            if (idx >= 3) el.classList.remove('active');
        });
        document.getElementById('log-box').innerHTML = '';
        initMap();
    }
    gameState = 'PLAYING';
    document.getElementById('modal').style.display = 'none';
    log("Expedition started. Use WASD / Arrows to explore, SPACE / E to dig suspicious locations.");
    updateSonar();
}

initMap();
draw();
