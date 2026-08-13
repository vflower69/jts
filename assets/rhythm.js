    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
// --- Advanced Web Audio Synthesizer ---
    class AudioEngine {
      constructor() {
        this.ctx = null;
        this.masterGain = null;
      }

      init() {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.4;
          this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      // Play synth melody hit note
      playNote(freq, type = 'sawtooth', duration = 0.12) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      }

      // Play feedback audio cues
      playHitSound(rating) {
        if (!this.ctx) return;
        if (rating === 'miss') {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, this.ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.15);
        }
      }
    }

    // --- Visual Particle FX Engine ---
    class ParticleEngine {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.resize();
      }

      resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
      }

      explode(x, y, color) {
        for (let i = 0; i < 16; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 6 + 2;
          this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: Math.random() * 0.05 + 0.03,
            color: color,
            size: Math.random() * 4 + 2
          });
        }
      }

      updateAndDraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;

          if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
          }

          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = p.life;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;
      }
    }

    // --- Game Engine Parameters ---
    const KEYS = ['d', 'f', 'j', 'k'];
    const LANE_X = [12.5, 37.5, 62.5, 87.5];
    const LANE_COLORS = ['#00f0ff', '#ff0055', '#00ff66', '#ffbe00'];
    const PITCHES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    const TARGET_Y = 530; // Target hit line location
    const NOTE_SPEED = 0.65; // Scroll speed (px/ms)
    const PRE_SPAWN_TIME = TARGET_Y / NOTE_SPEED;

    // Game state vars
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let health = 100;
    let totalNotes = 0;
    let activeNotes = [];
    let isPlaying = false;
    let startTime = 0;

    let counts = { 300: 0, 100: 0, 50: 0, miss: 0 };

    const audio = new AudioEngine();
    let fx = null;

    // Map Generator: Dense, fast streams designed for high replay value
    function generateBeatmap() {
      const map = [];
      const bpm = 150;
      const beatMs = (60 / bpm) * 1000;
      const totalBeats = 128;

      for (let i = 0; i < totalBeats; i++) {
        const time = i * beatMs + 1200;
        
        // Single note on beat
        const lane = Math.floor(Math.random() * 4);
        map.push({ time, lane });

        // Stream burst patterns (1/2 & 1/4 beats)
        if (i > 16 && i < 112) {
          if (i % 2 === 0) {
            map.push({ time: time + beatMs / 2, lane: (lane + 1) % 4 });
          }
          if (i % 8 >= 4 && i % 2 === 1) {
            map.push({ time: time + beatMs / 4, lane: (lane + 2) % 4 });
          }
        }
      }
      return map.sort((a, b) => a.time - b.time);
    }

    let beatmap = [];

    // --- DOM Elements ---
    const trackArea = document.getElementById('track-area');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const accuracyEl = document.getElementById('accuracy');
    const healthBar = document.getElementById('health-bar');
    const feedbackEl = document.getElementById('feedback');
    const startOverlay = document.getElementById('start-overlay');
    const endOverlay = document.getElementById('end-overlay');

    // --- Initialization ---
    window.addEventListener('load', () => {
      fx = new ParticleEngine(document.getElementById('effects-canvas'));
      updatePBDisplay();
    });

    function updatePBDisplay() {
      const pb = localStorage.getItem('rhythm_pulse_pb') || 0;
      document.getElementById('pb-score').textContent = Number(pb).toLocaleString();
    }

    function startGame() {
      audio.init();
      score = 0;
      combo = 0;
      maxCombo = 0;
      health = 100;
      counts = { 300: 0, 100: 0, 50: 0, miss: 0 };
      activeNotes = [];

      beatmap = generateBeatmap();
      totalNotes = beatmap.length;

      startOverlay.classList.add('hidden');
      endOverlay.classList.add('hidden');

      updateHUD();

      isPlaying = true;
      startTime = performance.now();
      requestAnimationFrame(gameLoop);
    }

    // --- Core Frame Loop ---
    function gameLoop(now) {
      if (!isPlaying) return;

      const elapsed = now - startTime;

      // Spawn scheduled map notes
      while (beatmap.length > 0 && beatmap[0].time - PRE_SPAWN_TIME <= elapsed) {
        const noteData = beatmap.shift();
        createNoteDOM(noteData);
      }

      // Update positions & check misses
      for (let i = activeNotes.length - 1; i >= 0; i--) {
        const note = activeNotes[i];
        const noteTime = note.targetTime - elapsed;
        const yPos = TARGET_Y - (noteTime * NOTE_SPEED);

        note.el.style.top = `${yPos}px`;

        // Out-of-bounds Miss Check
        if (yPos > TARGET_Y + 50) {
          registerHit('miss', note.lane);
          note.el.remove();
          activeNotes.splice(i, 1);
        }
      }

      fx.updateAndDraw();

      // Check Fail state
      if (health <= 0) {
        endGame(false);
        return;
      }

      // Check Clear state
      if (beatmap.length === 0 && activeNotes.length === 0) {
        setTimeout(() => endGame(true), 800);
      } else {
        requestAnimationFrame(gameLoop);
      }
    }

    function createNoteDOM(noteData) {
      const el = document.createElement('div');
      el.className = `note lane-${noteData.lane}`;
      el.style.left = `${LANE_X[noteData.lane]}%`;
      trackArea.appendChild(el);

      activeNotes.push({
        el: el,
        lane: noteData.lane,
        targetTime: noteData.time
      });
    }

    // --- Input & Hit Detection Engine ---
    function handleInput(lane) {
      if (!isPlaying) return;

      const elapsed = performance.now() - startTime;

      let closestIdx = -1;
      let minDiff = Infinity;

      for (let i = 0; i < activeNotes.length; i++) {
        if (activeNotes[i].lane === lane) {
          const diff = Math.abs(activeNotes[i].targetTime - elapsed);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
      }

      // Precise timing windows (osu!-style)
      if (closestIdx !== -1 && minDiff < 140) {
        const note = activeNotes[closestIdx];
        let rating = '50';

        if (minDiff <= 35) rating = '300';
        else if (minDiff <= 80) rating = '100';

        audio.playNote(PITCHES[lane], 'sawtooth', 0.12);

        // Particle burst at hit line
        const hitX = (LANE_X[lane] / 100) * trackArea.clientWidth;
        fx.explode(hitX, TARGET_Y, LANE_COLORS[lane]);

        registerHit(rating, lane);

        note.el.remove();
        activeNotes.splice(closestIdx, 1);
      }
    }

    function registerHit(rating, lane) {
      counts[rating]++;

      if (rating === '300') {
        combo++;
        score += 300 + Math.floor(combo * 1.5);
        health = Math.min(100, health + 3);
      } else if (rating === '100') {
        combo++;
        score += 100 + Math.floor(combo * 0.5);
        health = Math.min(100, health + 1);
      } else if (rating === '50') {
        combo++;
        score += 50;
      } else { // miss
        combo = 0;
        health -= 12;
        audio.playHitSound('miss');
      }

      if (combo > maxCombo) maxCombo = combo;

      showFeedback(rating);
      updateHUD();
    }

    function showFeedback(rating) {
      feedbackEl.textContent = rating === 'miss' ? 'MISS' : rating;
      feedbackEl.className = `${rating} show`;

      clearTimeout(feedbackEl.timeout);
      feedbackEl.timeout = setTimeout(() => {
        feedbackEl.classList.remove('show');
      }, 150);
    }

    function updateHUD() {
      scoreEl.textContent = Math.round(score).toString().padStart(7, '0');
      comboEl.textContent = `${combo}x`;
      healthBar.style.width = `${Math.max(0, health)}%`;

      const totalHits = counts[300] + counts[100] + counts[50] + counts.miss;
      if (totalHits > 0) {
        const acc = ((counts[300] * 300 + counts[100] * 100 + counts[50] * 50) / (totalHits * 300)) * 100;
        accuracyEl.textContent = `${acc.toFixed(2)}%`;
      } else {
        accuracyEl.textContent = `100.00%`;
      }
    }

    function endGame(passed) {
      isPlaying = false;

      const totalHits = counts[300] + counts[100] + counts[50] + counts.miss;
      const acc = totalHits > 0 ? ((counts[300] * 300 + counts[100] * 100 + counts[50] * 50) / (totalHits * 300)) * 100 : 0;

      // Grade Calculation
      let grade = 'F';
      if (passed) {
        if (acc === 100) grade = 'SS';
        else if (acc >= 93) grade = 'S';
        else if (acc >= 85) grade = 'A';
        else grade = 'B';
      }

      // Save High Score
      const pb = localStorage.getItem('rhythm_pulse_pb') || 0;
      if (score > pb) {
        localStorage.setItem('rhythm_pulse_pb', Math.round(score));
        updatePBDisplay();
      }

      const gradeEl = document.getElementById('result-grade');
      gradeEl.textContent = grade;
      gradeEl.className = `grade grade-${grade}`;

      document.getElementById('result-title').textContent = passed ? 'STAGE CLEAR' : 'STAGE FAILED';
      document.getElementById('result-subtitle').textContent = passed ? 'EXCELLENT PERFORMANCE' : 'HEALTH DEPLETED';

      document.getElementById('res-score').textContent = Math.round(score).toLocaleString();
      document.getElementById('res-combo').textContent = `${maxCombo}x`;
      document.getElementById('res-accuracy').textContent = `${acc.toFixed(2)}%`;
      document.getElementById('res-judgements').textContent = `${counts[300]} / ${counts[100]} / ${counts[50]} / ${counts.miss}`;

      endOverlay.classList.remove('hidden');
    }

    // --- Controls & Listeners ---
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const lane = KEYS.indexOf(key);
      if (lane !== -1 && !e.repeat) {
        document.getElementById(`btn-${lane}`).classList.add('active');
        handleInput(lane);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      const lane = KEYS.indexOf(key);
      if (lane !== -1) {
        document.getElementById(`btn-${lane}`).classList.remove('active');
      }
    });

    KEYS.forEach((_, lane) => {
      const btn = document.getElementById(`btn-${lane}`);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add('active');
        handleInput(lane);
      });
      btn.addEventListener('pointerup', () => btn.classList.remove('active'));
      btn.addEventListener('pointerleave', () => btn.classList.remove('active'));
    });

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
