// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}
 // Below are the codes for the game
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const karaokeDisplay = document.getElementById('karaoke-display');
    const startBtn = document.getElementById('startBtn');

    // --- Funny Animal Voice & Beat Synthesizer ---
    class DiscoAudio {
      constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.step = 0;
        this.timer = null;
      }

      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        }
      }

      playKick() {
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        let now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.15);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.15);
      }

      playHiHat() {
        let now = this.ctx.currentTime;
        let bufferSize = this.ctx.sampleRate * 0.04;
        let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        let noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        let gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(gain); gain.connect(this.ctx.destination);
        noise.start();
      }

      // Squeaky funny animal vocal synth
      singAnimalVoice(freq, duration = 0.22) {
        let now = this.ctx.currentTime;

        // Dual pitched square waves for hilarious chipmunk/animal sound
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        let gain = this.ctx.createGain();

        // High pitched goofy frequencies
        let pitch = freq * 2.2; 
        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(pitch, now);
        osc1.frequency.linearRampToValueAtTime(pitch * 1.15, now + duration);

        osc2.frequency.setValueAtTime(pitch * 1.5, now); // funny harmonic chirp

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(); osc2.start();
        osc1.stop(now + duration); osc2.stop(now + duration);

        jimothy.dance();
      }

      // Funky squeak sound when poked
      playPokeSound() {
        this.init();
        let now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.25);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.25);
      }

      startMusic() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.step = 0;

        // Full Song with Karaoke Timings
        const songData = [
          { line: ["I'M", "JIMOTHY", "THE", "RACCOON!"], pitch: [300, 350, 400, 480] },
          { line: ["LOOK", "AT", "MY", "DISCO", "MOVES!"], pitch: [400, 450, 500, 550, 600] },
          { line: ["SNIFFING", "FLOWERS", "IN", "THE", "PARK!"], pitch: [320, 380, 420, 460, 520] },
          { line: ["SNEEZING", "LOUDLY", "AFTER", "DARK!", "🤧"], pitch: [500, 550, 600, 650, 700] },
          { line: ["GROOVY", "BEANS", "AND", "FUNKY", "FEET!"], pitch: [350, 420, 480, 520, 580] },
          { line: ["SQUEAKY", "SQUEAK", "UPON", "THE", "BEAT!"], pitch: [600, 650, 550, 600, 750] }
        ];

        let flatSequence = [];
        songData.forEach(item => {
          item.line.forEach((word, idx) => {
            flatSequence.push({
              word: word,
              fullLine: item.line,
              wordIndex: idx,
              pitch: item.pitch[idx] || 400
            });
          });
        });

        this.timer = setInterval(() => {
          this.playKick();
          if (this.step % 2 === 1) this.playHiHat();

          if (!jimothy.isPoked) {
            let note = flatSequence[this.step % flatSequence.length];
            this.singAnimalVoice(note.pitch, 0.25);
            renderKaraoke(note.fullLine, note.wordIndex);
          }

          this.step++;
        }, 340);
      }

      stopMusic() {
        this.isPlaying = false;
        clearInterval(this.timer);
      }
    }

    const audio = new DiscoAudio();

    // Karaoke Renderer
    function renderKaraoke(wordsArray, activeIdx) {
      karaokeDisplay.innerHTML = '';
      wordsArray.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'k-word' + (i === activeIdx ? ' active' : '');
        span.textContent = word;
        karaokeDisplay.appendChild(span);
      });
    }

    // Touch Reactions
    const touchPhrases = [
      ["HEY!", "DON'T", "TOUCH", "ME!"],
      ["WHY", "ARE", "YOU", "TOUCHING", "ME?!"],
      ["THAT", "TICKLES!", "TEE-HEE!"],
      ["WATCH", "THE", "DISCO", "FUR!"]
    ];

    // --- Jimothy Raccoon Dancer ---
    const jimothy = {
      x: 425, y: 340,
      scaleY: 1, scaleX: 1,
      rotation: 0,
      bounceY: 0,
      armAngle: 0,
      isPoked: false,
      pokedTimer: 0,

      dance() {
        if (this.isPoked) return;
        this.bounceY = -30;
        this.scaleX = Math.random() > 0.5 ? 1.15 : 0.85;
        this.scaleY = 1.2;
        this.rotation = (Math.random() - 0.5) * 0.5;
        this.armAngle = (Math.random() - 0.5) * 1.5;
      },

      poke() {
        this.isPoked = true;
        this.bounceY = -60;
        this.scaleX = 0.7;
        this.scaleY = 1.4;
        this.rotation = (Math.random() - 0.5) * 0.8;
        this.armAngle = Math.PI / 2;
        this.pokedTimer = 35;

        audio.playPokeSound();
        const phrase = touchPhrases[Math.floor(Math.random() * touchPhrases.length)];
        renderKaraoke(phrase, 1);
      },

      update() {
        this.bounceY *= 0.8;
        this.scaleX += (1 - this.scaleX) * 0.15;
        this.scaleY += (1 - this.scaleY) * 0.15;
        this.rotation += (0 - this.rotation) * 0.15;

        if (this.isPoked) {
          this.pokedTimer--;
          if (this.pokedTimer <= 0) {
            this.isPoked = false;
          }
        }
      },

      draw(c) {
        c.save();
        c.translate(this.x, this.y + this.bounceY);
        c.scale(this.scaleX, this.scaleY);
        c.rotate(this.rotation);

        // Body
        c.fillStyle = '#7a8288';
        c.beginPath(); c.ellipse(0, 20, 85, 75, 0, 0, Math.PI * 2); c.fill();

        // Belly
        c.fillStyle = '#f2e9e4';
        c.beginPath(); c.ellipse(0, 30, 55, 45, 0, 0, Math.PI * 2); c.fill();

        // Head
        c.fillStyle = '#9a8c98';
        c.beginPath(); c.ellipse(0, -60, 65, 50, 0, 0, Math.PI * 2); c.fill();

        // Ears
        c.fillStyle = '#4a4e69';
        c.beginPath(); c.arc(-45, -100, 20, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(45, -100, 20, 0, Math.PI * 2); c.fill();

        // Mask
        c.fillStyle = '#22223b';
        c.beginPath();
        c.ellipse(-24, -60, 24, 15, 0.2, 0, Math.PI * 2);
        c.ellipse(24, -60, 24, 15, -0.2, 0, Math.PI * 2);
        c.fill();

        // Cool Sunglasses 🕶️
        c.fillStyle = '#000000';
        c.fillRect(-45, -72, 40, 22);
        c.fillRect(5, -72, 40, 22);
        c.fillRect(-10, -68, 20, 5);
        c.fillStyle = '#ff007f';
        c.fillRect(-40, -70, 30, 4);
        c.fillRect(10, -70, 30, 4);

        // Mouth
        c.fillStyle = '#000000';
        if (this.isPoked) {
          c.beginPath(); c.arc(0, -42, 12, 0, Math.PI * 2); c.fill();
        } else {
          c.beginPath(); c.arc(0, -42, 12, 0, Math.PI); c.fill();
        }

        // Paws / Arms
        c.save();
        c.rotate(this.armAngle);
        c.fillStyle = '#22223b';
        c.beginPath(); c.ellipse(-75, 0, 22, 14, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(75, 0, 22, 14, 0, 0, Math.PI * 2); c.fill();
        c.restore();

        c.restore();
      }
    };

    // Stage Lighting & Disco Ball
    function drawDiscoStage() {
      let now = Date.now() * 0.003;

      // Beams
      const colors = ['rgba(255, 0, 127, 0.2)', 'rgba(0, 255, 234, 0.2)', 'rgba(255, 230, 0, 0.2)'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(425, 0);
        ctx.lineTo(100 + i * 160 + Math.sin(now + i) * 60, 550);
        ctx.lineTo(180 + i * 160 + Math.sin(now + i) * 60, 550);
        ctx.closePath();
        ctx.fill();
      }

      // Floor
      let cols = 8, rows = 3;
      let w = 850 / cols, h = 100 / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c + Math.floor(now * 4)) % 2 === 0 ? '#ff007f' : '#00ftea';
          ctx.globalAlpha = 0.3;
          ctx.fillRect(c * w, 450 + r * h, w - 4, h - 4);
          ctx.globalAlpha = 1.0;
        }
      }

      // Disco Ball
      ctx.save();
      ctx.translate(425, 40);
      ctx.strokeStyle = '#aaa';
      ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 0); ctx.stroke();

      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath(); ctx.arc(0, 20, 30, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        let gx = Math.sin(now * 2 + i) * 16;
        let gy = Math.cos(now * 3 + i) * 16 + 20;
        ctx.fillRect(gx, gy, 4, 4);
      }
      ctx.restore();
    }

    // Touch Event
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const dx = clickX - jimothy.x;
      const dy = clickY - (jimothy.y + jimothy.bounceY - 20);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 110) {
        jimothy.poke();
      }
    });

    // Toggle Music
    startBtn.onclick = () => {
      if (!audio.isPlaying) {
        audio.startMusic();
        startBtn.textContent = "🛑 STOP DISCO";
      } else {
        audio.stopMusic();
        startBtn.textContent = "🪩 START DISCO SONG!";
      }
    };

    // Main Loop
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawDiscoStage();
      jimothy.update();
      jimothy.draw(ctx);

      requestAnimationFrame(loop);
    }

    loop();
