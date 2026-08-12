  // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Element references
    const distVal = document.getElementById('distVal');
    const berryVal = document.getElementById('berryVal');
    const staminaBar = document.getElementById('staminaBar');
    const startOverlay = document.getElementById('startOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const winOverlay = document.getElementById('winOverlay');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const winBtn = document.getElementById('winBtn');

    // Engine Constants
    const VIEW_W = 900;
    const VIEW_H = 500;
    const GRAVITY = 0.55;
    const TARGET_DIST = 1000;

    // Game State Variables
    let isRunning = false;
    let cameraX = 0;
    let distanceCovered = 0;
    let berriesCollected = 0;
    let screenShake = 0;
    let hitStopFrames = 0;
    let keys = {};

    // --- Particle System ---
    let particles = [];
    class Particle {
      constructor(x, y, vx, vy, color, size, life) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.size = size; this.life = life; this.maxLife = life;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
      }
      draw(c) {
        c.save();
        c.globalAlpha = Math.max(0, this.life / this.maxLife);
        c.fillStyle = this.color;
        c.beginPath();
        c.arc(this.x - cameraX, this.y, this.size, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    function emitParticles(x, y, count, color) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 4 + 1;
        particles.push(new Particle(
          x, y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd - 1,
          color,
          Math.random() * 3 + 2,
          25 + Math.random() * 15
        ));
      }
    }

    // --- Player Physics & State ---
    const jimothy = {
      x: 100, y: 200,
      w: 42, h: 32,
      vx: 0, vy: 0,
      speed: 5.5,
      jumpsLeft: 2,
      isGrounded: false,
      isDashing: false,
      dashTimer: 0,
      dashCd: 0,
      stamina: 100,
      facing: 1, // 1: right, -1: left

      reset() {
        this.x = 100; this.y = 200;
        this.vx = 0; this.vy = 0;
        this.jumpsLeft = 2;
        this.isGrounded = false;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCd = 0;
        this.stamina = 100;
        this.facing = 1;
      },

      dash() {
        if (this.dashCd <= 0 && this.stamina >= 25) {
          this.isDashing = true;
          this.dashTimer = 12;
          this.dashCd = 45;
          this.stamina -= 25;
          this.vy = 0;
          screenShake = 6;
          emitParticles(this.x + this.w/2, this.y + this.h/2, 12, '#ff79c6');
        }
      },

      update() {
        // Cooldowns & Stamina regeneration
        if (this.dashCd > 0) this.dashCd--;
        if (this.stamina < 100 && !this.isDashing) {
          this.stamina = Math.min(100, this.stamina + 0.35);
        }

        // Dashing Movement
        if (this.isDashing) {
          this.vx = this.facing * 14;
          this.vy = 0;
          this.dashTimer--;
          if (this.dashTimer <= 0) this.isDashing = false;
        } else {
          // Horizontal Input
          if (keys['KeyD'] || keys['ArrowRight']) {
            this.vx = this.speed;
            this.facing = 1;
          } else if (keys['KeyA'] || keys['ArrowLeft']) {
            this.vx = -this.speed;
            this.facing = -1;
          } else {
            this.vx *= 0.7; // friction
          }

          // Gravity
          this.vy += GRAVITY;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Prevent moving behind camera start
        if (this.x < cameraX) this.x = cameraX;
      },

      draw(c) {
        c.save();
        c.translate(this.x - cameraX + this.w/2, this.y + this.h/2);
        if (this.facing === -1) c.scale(-1, 1);

        // Dash trail effect
        if (this.isDashing) {
          c.shadowBlur = 15;
          c.shadowColor = '#ff79c6';
        }

        // Torso
        c.fillStyle = '#6272a4';
        c.beginPath();
        c.ellipse(0, 0, 18, 13, 0, 0, Math.PI * 2);
        c.fill();

        // Raccoon Mask
        c.fillStyle = '#191a21';
        c.beginPath();
        c.ellipse(6, -2, 9, 5, 0, 0, Math.PI * 2);
        c.fill();

        // Eye
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(7, -3, 2, 0, Math.PI * 2);
        c.fill();

        // Tail
        c.fillStyle = '#44475a';
        c.beginPath();
        c.ellipse(-18, 4, 10, 5, 0.2, 0, Math.PI * 2);
        c.fill();

        c.restore();
      }
    };

    // --- World Generator (Procedural Discovery Park Terrain) ---
    let platforms = [];
    let berries = [];
    let crows = [];

    function generateChunk(startX, endX) {
      let x = startX;
      while (x < endX) {
        let w = 180 + Math.random() * 200;
        let y = 300 + Math.random() * 120;

        platforms.push({ x, y, w, h: 200 });

        // Spawn Berries on platform
        if (Math.random() < 0.6) {
          berries.push({
            x: x + w / 2 + (Math.random() * 60 - 30),
            y: y - 35,
            r: 8,
            collected: false
          });
        }

        // Spawn Crows (Flying hazards)
        if (x > 400 && Math.random() < 0.45) {
          crows.push({
            x: x + w / 2,
            y: y - 90 - Math.random() * 80,
            baseY: y - 90 - Math.random() * 80,
            phase: Math.random() * Math.PI * 2,
            w: 26, h: 18
          });
        }

        x += w + (70 + Math.random() * 80); // Gap between platforms
      }
    }

    // Initialize initial map
    generateChunk(0, 3000);

    // --- Game Logic & Collision ---
    function checkCollisions() {
      // Platform Collision
      jimothy.isGrounded = false;
      for (let p of platforms) {
        if (
          jimothy.x + jimothy.w > p.x &&
          jimothy.x < p.x + p.w &&
          jimothy.y + jimothy.h >= p.y &&
          jimothy.y + jimothy.h <= p.y + 20 &&
          jimothy.vy >= 0
        ) {
          jimothy.y = p.y - jimothy.h;
          jimothy.vy = 0;
          jimothy.isGrounded = true;
          jimothy.jumpsLeft = 2;
        }
      }

      // Pitfall check
      if (jimothy.y > VIEW_H + 100) {
        triggerGameOver("Jimothy slipped down the muddy Puget Sound bluff!");
      }

      // Berry Collection
      for (let b of berries) {
        if (!b.collected) {
          let dist = Math.hypot((jimothy.x + jimothy.w/2) - b.x, (jimothy.y + jimothy.h/2) - b.y);
          if (dist < b.r + 18) {
            b.collected = true;
            berriesCollected++;
            jimothy.stamina = Math.min(100, jimothy.stamina + 20);
            emitParticles(b.x, b.y, 8, '#ffb86c');
          }
        }
      }

      // Crow Hazards
      for (let c of crows) {
        c.phase += 0.05;
        c.y = c.baseY + Math.sin(c.phase) * 20;

        let hit = (
          jimothy.x < c.x + c.w &&
          jimothy.x + jimothy.w > c.x &&
          jimothy.y < c.y + c.h &&
          jimothy.y + jimothy.h > c.y
        );

        if (hit) {
          if (jimothy.isDashing) {
            // Defeat crow when dashing!
            c.x = -999;
            screenShake = 10;
            hitStopFrames = 4;
            emitParticles(c.x, c.y, 14, '#ff5555');
          } else {
            triggerGameOver("Attacked by a territorial Discovery Park crow!");
          }
        }
      }
    }

    // --- Render Loop ---
    function render() {
      ctx.save();

      // Screen Shake
      if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.85;
      }

      // 1. Parallax Canopy & Puget Sound Sky
      let bgGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      bgGrad.addColorStop(0, '#0d131d');
      bgGrad.addColorStop(1, '#1a2636');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // Distance Puget Sound Mountains
      ctx.fillStyle = '#141e2b';
      for (let i = 0; i < 5; i++) {
        let x = (i * 300) - (cameraX * 0.15) % 300;
        ctx.beginPath();
        ctx.moveTo(x, VIEW_H);
        ctx.lineTo(x + 150, 220);
        ctx.lineTo(x + 300, VIEW_H);
        ctx.fill();
      }

      // 2. Platforms (Forest Moss & Earth)
      for (let p of platforms) {
        if (p.x + p.w < cameraX || p.x > cameraX + VIEW_W) continue;

        // Earth Body
        ctx.fillStyle = '#282a36';
        ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);

        // Lush Moss Canopy Top
        ctx.fillStyle = '#50fa7b';
        ctx.fillRect(p.x - cameraX, p.y, p.w, 8);
      }

      // 3. Collectibles & Hazards
      // Berries
      for (let b of berries) {
        if (b.collected || b.x < cameraX || b.x > cameraX + VIEW_W) continue;
        ctx.fillStyle = '#ffb86c';
        ctx.beginPath();
        ctx.arc(b.x - cameraX, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crows
      for (let c of crows) {
        if (c.x < cameraX || c.x > cameraX + VIEW_W) continue;
        ctx.fillStyle = '#ff5555';
        ctx.font = '20px sans-serif';
        ctx.fillText('🐦‍⬛', c.x - cameraX, c.y + 14);
      }

      // 4. Particles
      for (let p of particles) p.draw(ctx);

      // 5. Player
      jimothy.draw(ctx);

      // 6. Goal Flag: West Point Lighthouse
      let goalX = TARGET_DIST * 3;
      if (goalX > cameraX && goalX < cameraX + VIEW_W) {
        ctx.fillStyle = '#f1fa8c';
        ctx.font = '36px sans-serif';
        ctx.fillText('🚨 LIGHTHOUSE', goalX - cameraX, 260);
      }

      ctx.restore();
    }

    // --- Main Loop ---
    function loop() {
      if (!isRunning) return;

      // Hit-stop impact pause effect
      if (hitStopFrames > 0) {
        hitStopFrames--;
        requestAnimationFrame(loop);
        return;
      }

      // Update state
      jimothy.update();

      // Camera Follows Player Smoothly
      cameraX += (jimothy.x - cameraX - 180) * 0.08;

      // Distance Progression
      distanceCovered = Math.min(TARGET_DIST, Math.floor(jimothy.x / 3));
      distVal.textContent = `${distanceCovered}m`;
      berryVal.textContent = berriesCollected;
      staminaBar.style.width = `${jimothy.stamina}%`;

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
      }

      checkCollisions();

      // Win Condition
      if (distanceCovered >= TARGET_DIST) {
        triggerWin();
        return;
      }

      render();
      requestAnimationFrame(loop);
    }

    // --- Controls ---
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;

      if (!isRunning) return;

      if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')) {
        e.preventDefault();
        if (jimothy.jumpsLeft > 0) {
          jimothy.vy = -11;
          jimothy.jumpsLeft--;
          emitParticles(jimothy.x + jimothy.w/2, jimothy.y + jimothy.h, 6, '#8be9fd');
        }
      }

      if (e.code === 'ShiftLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        jimothy.dash();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
    });

    // --- Game Triggers ---
    function startGame() {
      isRunning = true;
      cameraX = 0;
      distanceCovered = 0;
      berriesCollected = 0;
      particles = [];
      
      jimothy.reset();

      startOverlay.classList.add('hidden');
      gameOverOverlay.classList.add('hidden');
      winOverlay.classList.add('hidden');

      requestAnimationFrame(loop);
    }

    function triggerGameOver(reason) {
      isRunning = false;
      document.getElementById('failReason').textContent = reason;
      gameOverOverlay.classList.remove('hidden');
    }

    function triggerWin() {
      isRunning = false;
      document.getElementById('winStats').textContent = `Berries Gathered: ${berriesCollected} | Puget Sound Hero Status: CONFIRMED!`;
      winOverlay.classList.remove('hidden');
    }

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    winBtn.addEventListener('click', startGame);

    // Render Initial Static Screen
    render();
  
