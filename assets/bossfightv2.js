// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
    const jimothy = document.getElementById("jimothy");
    const boss = document.getElementById("boss");
    const bossHP = document.getElementById("hpValue");

    let jimothyX = window.innerWidth / 2;
    let keys = {};

    // --- Web Audio Synthesizer SFX ---
    let audioCtx = null;

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    }

    function playShootSFX() {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "square";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }

    function playHitSFX() {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.18);
      
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    }

    function playVictorySFX() {
      initAudio();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const startTime = audioCtx.currentTime + (i * 0.1);
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    }

    // Position Jimothy initially
    updateJimothyPosition();

    // --- 1. Jimothy Movement Controls ---
    window.addEventListener("keydown", (e) => {
      keys[e.key] = true;

      // Shoot with Space or Up Arrow
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shootStar();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.key] = false;
    });

    function updateJimothyPosition() {
      const speed = 8;
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        jimothyX = Math.max(50, jimothyX - speed);
      }
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        jimothyX = Math.min(window.innerWidth - 50, jimothyX + speed);
      }

      jimothy.style.left = jimothyX + "px";
      requestAnimationFrame(updateJimothyPosition);
    }

    // --- 2. Shooting Mechanism & Dodge Detection ---
    function shootStar() {
      playShootSFX();

      const b = document.createElement("div");
      b.className = "blast";
      b.textContent = "✨";

      b.style.left = jimothyX + "px";
      b.style.top = jimothy.offsetTop + "px";

      document.body.appendChild(b);

      // Boss dodge chance when shot is aligned
      triggerBossDodge(jimothyX);

      // Check collision with boss while blast is moving
      const checkHit = setInterval(() => {
        const blastRect = b.getBoundingClientRect();
        const bossRect = boss.getBoundingClientRect();

        if (
          blastRect.left < bossRect.right &&
          blastRect.right > bossRect.left &&
          blastRect.top < bossRect.bottom &&
          blastRect.bottom > bossRect.top
        ) {
          clearInterval(checkHit);
          b.remove();
          takeDamage();
        }
      }, 30);

      setTimeout(() => {
        clearInterval(checkHit);
        b.remove();
      }, 800);
    }

    jimothy.addEventListener("click", shootStar);

    function takeDamage() {
      playHitSFX();
      let currentHP = parseInt(bossHP.textContent, 10) - 1;
      bossHP.textContent = currentHP;

      // Visual flinch effect for boss
      boss.style.transform = "translateX(-50%) scale(0.85)";
      setTimeout(() => boss.style.transform = "translateX(-50%) scale(1)", 100);

      if (currentHP <= 0) {
        playVictorySFX();
        setTimeout(() => {
          alert("Jimothy defeated the Mega Trash Titan!");

          const scores = JSON.parse(localStorage.getItem("jimothyScores") || "[]");
          scores.push("Boss defeated at " + new Date().toLocaleString());
          localStorage.setItem("jimothyScores", JSON.stringify(scores));

          window.location.href = "../games.html";
        }, 500);
      }
    }

    // --- 3. Dynamic Boss AI (Chasing, Jumping & Dodging) ---
    let bossX = window.innerWidth / 2;
    let bossY = 40;
    let bossVy = 0;
    const gravity = 0.6;
    const baseFloorY = 40;

    let aiMode = "chase"; // Modes: 'chase', 'wander', 'retreat'
    let aiTimer = 0;
    let wanderDir = 1;

    function triggerBossDodge(playerX) {
      // 40% Chance to react and dodge when Jimothy shoots
      if (Math.abs(bossX - playerX) < 150 && Math.random() < 0.40) {
        if (bossY <= baseFloorY + 10) {
          bossVy = -16; // High jump dodge
        }
        bossX += playerX < bossX ? 80 : -80; // Side dodge step
      }
    }

    function updateBossAI() {
      // Periodic Behavior Switch
      aiTimer--;
      if (aiTimer <= 0) {
        aiTimer = Math.floor(Math.random() * 40) + 20; // Switch every ~0.5 to 1s
        const rand = Math.random();
        if (rand < 0.55) {
          aiMode = "chase";
        } else if (rand < 0.80) {
          aiMode = "wander";
          wanderDir = Math.random() < 0.5 ? -1 : 1;
        } else {
          aiMode = "retreat";
        }

        // Random Jump Trigger
        if (Math.random() < 0.35 && bossY <= baseFloorY + 5) {
          bossVy = -(Math.random() * 10 + 10);
        }
      }

      // Physics / Vertical Movement (Jump & Gravity)
      bossVy += gravity;
      bossY += bossVy;

      if (bossY < baseFloorY) {
        bossY = baseFloorY;
        bossVy = 0;
      }

      // Cap maximum vertical height
      const maxJumpHeight = window.innerHeight * 0.4;
      if (bossY > maxJumpHeight) {
        bossY = maxJumpHeight;
        bossVy = 0;
      }

      // Horizontal AI Movement
      let moveSpeed = 6;
      if (aiMode === "chase") {
        if (bossX < jimothyX - 20) bossX += moveSpeed;
        else if (bossX > jimothyX + 20) bossX -= moveSpeed;
      } else if (aiMode === "retreat") {
        if (bossX < jimothyX) bossX -= moveSpeed;
        else bossX += moveSpeed;
      } else if (aiMode === "wander") {
        bossX += wanderDir * (moveSpeed * 0.8);
      }

      // Screen Boundaries
      const padding = 80;
      if (bossX < padding) bossX = padding;
      if (bossX > window.innerWidth - padding) bossX = window.innerWidth - padding;

      // Render Boss Position
      boss.style.left = bossX + "px";
      boss.style.top = bossY + "px";

      requestAnimationFrame(updateBossAI);
    }

    updateBossAI();
