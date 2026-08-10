    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    const meterFill = document.getElementById('meterFill');
    const scoreVal = document.getElementById('scoreVal');
    const speechBubble = document.getElementById('speech-bubble');

    let giggles = 0;
    let tickleMeter = 0;
    let particles = [];
    let floatingTexts = [];

    // Sound Synthesizer
    class TickleAudio {
      constructor() { this.ctx = null; }
      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        }
      }
      playGigglySqueak(pitchModifier = 1) {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'sine';
        let now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(400 * pitchModifier, now);
        osc.frequency.exponentialRampToValueAtTime(900 * pitchModifier, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(600 * pitchModifier, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.22);
      }
      playPop() {
        if (!this.ctx) return;
        let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
        osc.type = 'triangle';
        let now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.09);
      }
    }
    const audio = new TickleAudio();

    // Jimothy Raccoon Character State
    const jimothy = {
      x: 425, y: 320,
      scaleX: 1, scaleY: 1,
      rotation: 0,
      eyeState: 'happy', // happy, winking, dizzy, tickled
      earTwitch: 0,
      tailWag: 0,
      blush: 0,
      wiggleSpeed: 0,
      currentAction: 'idle',

      react(part) {
        audio.init();
        giggles += 5;
        tickleMeter = Math.min(100, tickleMeter + 12);
        scoreVal.textContent = giggles;
        meterFill.style.width = tickleMeter + '%';

        this.blush = 1;

        if (part === 'ears') {
          this.earTwitch = 15;
          this.eyeState = 'winking';
          audio.playGigglySqueak(1.4);
          showBubble("Eeeek! Not my ears! 🦝👂");
          spawnParticles(this.x, this.y - 120, '✨', 5);
        } else if (part === 'belly') {
          this.scaleX = 1.25; this.scaleY = 0.8;
          this.wiggleSpeed = 0.4;
          this.eyeState = 'tickled';
          audio.playGigglySqueak(1.0);
          showBubble("Belly tickles! TEE-HEE-HEE! 💖");
          spawnParticles(this.x, this.y, '💖', 6);
        } else if (part === 'paws') {
          this.rotation = (Math.random() - 0.5) * 0.4;
          this.eyeState = 'happy';
          audio.playPop();
          showBubble("Silly toe beans! 🐾✨");
          spawnParticles(this.x, this.y + 80, '🫐', 4);
        } else if (part === 'tail') {
          this.tailWag = 25;
          this.eyeState = 'dizzy';
          audio.playGigglySqueak(0.8);
          showBubble("Whoa! My fluffy tail! 🌀");
          spawnParticles(this.x + 100, this.y + 40, '⭐', 5);
        }
      },

      update() {
        // Elastic body bounce spring effect
        this.scaleX += (1 - this.scaleX) * 0.12;
        this.scaleY += (1 - this.scaleY) * 0.12;
        this.rotation += (0 - this.rotation) * 0.1;
        this.blush *= 0.95;

        if (this.earTwitch > 0) this.earTwitch--;
        if (this.tailWag > 0) this.tailWag--;
      },

      draw(c) {
        c.save();
        c.translate(this.x, this.y);
        c.scale(this.scaleX, this.scaleY);
        c.rotate(this.rotation);

        // Tail
        c.save();
        let tailAngle = Math.sin(Date.now() * 0.01) * 0.2 + (this.tailWag ? Math.sin(Date.now() * 0.05) * 0.8 : 0);
        c.translate(70, 40);
        c.rotate(tailAngle);
        c.fillStyle = '#4a4e69';
        c.beginPath();
        c.ellipse(40, -10, 45, 22, 0.3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#22223b';
        c.fillRect(30, -28, 12, 38);
        c.fillRect(55, -20, 12, 32);
        c.restore();

        // Feet / Paws
        c.fillStyle = '#22223b';
        c.beginPath();
        c.ellipse(-45, 95, 20, 12, 0, 0, Math.PI * 2);
        c.ellipse(45, 95, 20, 12, 0, 0, Math.PI * 2);
        c.fill();

        // Main Body (Round & Huggable)
        c.fillStyle = '#7a8288';
        c.beginPath();
        c.ellipse(0, 20, 95, 85, 0, 0, Math.PI * 2);
        c.fill();

        // Soft Belly
        c.fillStyle = '#f2e9e4';
        c.beginPath();
        c.ellipse(0, 30, 65, 55, 0, 0, Math.PI * 2);
        c.fill();

        // Head
        c.fillStyle = '#9a8c98';
        c.beginPath();
        c.ellipse(0, -65, 75, 60, 0, 0, Math.PI * 2);
        c.fill();

        // Ears
        let earL = Math.sin(this.earTwitch) * 0.2;
        let earR = -Math.sin(this.earTwitch) * 0.2;

        c.save();
        c.translate(-50, -110); c.rotate(earL);
        c.fillStyle = '#4a4e69';
        c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffcad4';
        c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill();
        c.restore();

        c.save();
        c.translate(50, -110); c.rotate(earR);
        c.fillStyle = '#4a4e69';
        c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffcad4';
        c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill();
        c.restore();

        // Raccoon Mask
        c.fillStyle = '#22223b';
        c.beginPath();
        c.ellipse(-28, -65, 28, 18, 0.2, 0, Math.PI * 2);
        c.ellipse(28, -65, 28, 18, -0.2, 0, Math.PI * 2);
        c.fill();

        // Eyes
        c.fillStyle = '#ffffff';
        if (this.eyeState === 'happy') {
          c.beginPath(); c.arc(-26, -67, 8, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(26, -67, 8, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#000000';
          c.beginPath(); c.arc(-24, -67, 4, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(28, -67, 4, 0, Math.PI * 2); c.fill();
        } else if (this.eyeState === 'winking') {
          c.beginPath(); c.arc(-26, -67, 8, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#000'; c.beginPath(); c.arc(-24, -67, 4, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#fff'; c.lineWidth = 3;
          c.beginPath(); c.arc(26, -67, 8, 0.1, Math.PI); c.stroke();
        } else {
          c.strokeStyle = '#fff'; c.lineWidth = 4;
          c.beginPath(); c.arc(-26, -67, 7, 0, Math.PI * 2); c.stroke();
          c.beginPath(); c.arc(26, -67, 7, 0, Math.PI * 2); c.stroke();
        }

        // Cute Nose
        c.fillStyle = '#000000';
        c.beginPath();
        c.ellipse(0, -52, 7, 5, 0, 0, Math.PI * 2);
        c.fill();

        // Cheerful Blush
        if (this.blush > 0.05) {
          c.fillStyle = `rgba(255, 107, 107, ${this.blush * 0.6})`;
          c.beginPath(); c.arc(-42, -50, 12, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(42, -50, 12, 0, Math.PI * 2); c.fill();
        }

        c.restore();
      }
    };

    // Speech Bubble Helper
    let bubbleTimeout;
    function showBubble(text) {
      speechBubble.textContent = text;
      speechBubble.style.transform = 'translateX(-50%) scale(1)';
      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        speechBubble.style.transform = 'translateX(-50%) scale(0)';
      }, 1400);
    }

    // Particle Burst Effects
    function spawnParticles(x, y, emoji, count) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 5 - 2,
          emoji,
          size: 20 + Math.random() * 12,
          life: 40
        });
      }
    }

    // Interactive Hit Region Detection
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let dx = mx - jimothy.x;
      let dy = my - jimothy.y;

      // Ears Zone
      if (Math.hypot(mx - (jimothy.x - 50), my - (jimothy.y - 110)) < 35 ||
          Math.hypot(mx - (jimothy.x + 50), my - (jimothy.y - 110)) < 35) {
        jimothy.react('ears');
      }
      // Belly Zone
      else if (Math.hypot(dx, dy - 20) < 65) {
        jimothy.react('belly');
      }
      // Paws Zone
      else if (Math.hypot(mx - (jimothy.x - 45), my - (jimothy.y + 95)) < 30 ||
               Math.hypot(mx - (jimothy.x + 45), my - (jimothy.y + 95)) < 30) {
        jimothy.react('paws');
      }
      // Tail Zone
      else if (Math.hypot(mx - (jimothy.x + 110), my - (jimothy.y + 30)) < 45) {
        jimothy.react('tail');
      }
    });

    // Main Game Render Loop
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Decaying Tickle-O-Meter
      if (tickleMeter > 0) {
        tickleMeter -= 0.08;
        meterFill.style.width = tickleMeter + '%';
      }

      jimothy.update();
      jimothy.draw(ctx);

      // Render Floating Emoji Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.font = `${p.size}px sans-serif`;
        ctx.globalAlpha = Math.max(0, p.life / 40);
        ctx.fillText(p.emoji, p.x, p.y);
        ctx.globalAlpha = 1.0;

        if (p.life <= 0) particles.splice(i, 1);
      }

      requestAnimationFrame(loop);
    }

    loop();
document.getElementById("backToGames").addEventListener("click", () => {
  window.location.href = "../games.html";
});

