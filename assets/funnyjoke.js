// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const karaokeDisplay = document.getElementById('karaoke-display');
    const userInput = document.getElementById('userInput');
    const translateBtn = document.getElementById('translateBtn');

    // --- Opposite Dictionary for Hilarious Reversals ---
    const oppositeMap = {
      // Verbs & Actions
      "love": "absolutely despise", "loves": "despises", "loved": "hated",
      "like": "hate", "likes": "hates", "liked": "detested",
      "enjoy": "dread", "enjoyed": "dreaded",
      "dance": "stand completely frozen", "dancing": "aggressively boycotting dance",
      "sing": "screech like a broken toaster", "singing": "screaming silently",
      "eat": "spit out", "eating": "refusing to swallow", "ate": "rejected",
      "run": "crawl backwards", "running": "sloth-crawling",
      "walk": "roll away", "walking": "stumbling downhill",
      "happy": "utterly miserable", "glad": "furious",
      "smile": "frown miserably", "smiled": "glared menacingly",
      "laugh": "sob uncontrollably", "laughing": "crying violently",
      "go": "stay forever", "going": "refusing to leave",
      "want": "reject", "wants": "denies",
      "can": "cannot possibly", "will": "refuses to",
      "is": "is definitely NOT", "are": "are NEVER", "am": "am NOT",

      // Adjectives & Descriptions
      "good": "catastrophic", "great": "terrible", "awesome": "horrific",
      "sweet": "bitter and disgusting", "delicious": "revolting",
      "funny": "tragic", "cute": "terrifying",
      "bright": "pitch black", "sunny": "stormy and miserable",
      "hot": "freezing cold", "warm": "icy",
      "fast": "super slow", "quick": "sluggish",
      "big": "tiny micro-sized", "huge": "microscopic",
      "clean": "covered in trash", "fresh": "rotten",
      "beautiful": "hideous", "pretty": "ugly",
      "smart": "clueless", "clever": "goofy",
      "easy": "impossible", "hard": "effortless",

      // Nouns & Things
      "friend": "mortal enemy", "friends": "sworn enemies",
      "park": "dumpster fire", "garden": "swamp of doom",
      "sun": "blizzard", "day": "darkest night",
      "raccoon": "majestic dragon", "food": "garbage scraps",
      "berry": "stinky shoe", "berries": "rotten trash-cans",
      "yes": "ABSOLUTELY NOT", "no": "100% YES",

      // Emojis
      "😊": "👹", "😃": "👺", "❤️": "💔", "🌸": "🥀", "☀️": "⛈️",
      "🎉": "💩", "🕺": "🗿", "✨": "💥", "👍": "👎"
    };

    function translateToOpposite(text) {
      if (!text.trim()) return "YOU SAID NOTHING SO I WILL SCREAM EVERYTHING! 🦝⚡️";

      let words = text.split(/\s+/);
      let oppositeWords = words.map(w => {
        let cleanWord = w.toLowerCase().replace(/[^a-z0-9😊😃❤️🌸☀️🎉🕺✨👍]/g, "");
        let punctuation = w.replace(/[a-z0-9😊😃❤️🌸☀️🎉🕺✨👍]/gi, "");

        if (oppositeMap[cleanWord]) {
          let converted = oppositeMap[cleanWord].toUpperCase();
          return converted + punctuation;
        }

        // Handle negation defaults
        if (cleanWord === "not" || cleanWord === "don't") return "DEFINITELY";

        return w.toUpperCase();
      });

      return "NO WAY! " + oppositeWords.join(" ") + "!! 🦝💢";
    }

    // --- Audio Synthesizer ---
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
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.12);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.12);
      }

      singAnimalVoice(freq, duration = 0.22) {
        let now = this.ctx.currentTime;
        let osc1 = this.ctx.createOscillator();
        let osc2 = this.ctx.createOscillator();
        let gain = this.ctx.createGain();

        let pitch = freq * 2.1; 
        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(pitch, now);
        osc1.frequency.linearRampToValueAtTime(pitch * 1.15, now + duration);
        osc2.frequency.setValueAtTime(pitch * 1.4, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc1.connect(gain); osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(); osc2.start();
        osc1.stop(now + duration); osc2.stop(now + duration);

        jimothy.dance();
      }

      playPokeSound() {
        this.init();
        let now = this.ctx.currentTime;
        let osc = this.ctx.createOscillator();
        let gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(now + 0.2);
      }

      speakSentence(sentence) {
        this.init();
        clearInterval(this.timer);
        this.isPlaying = true;
        this.step = 0;

        let words = sentence.split(" ");

        this.timer = setInterval(() => {
          this.playKick();

          if (this.step < words.length && !jimothy.isPoked) {
            let freq = 300 + (Math.sin(this.step) * 200 + 200);
            this.singAnimalVoice(freq, 0.2);
            renderKaraoke(words, this.step);
            this.step++;
          } else if (this.step >= words.length) {
            clearInterval(this.timer);
            this.isPlaying = false;
          }
        }, 280);
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

    // --- Jimothy Raccoon Dancer ---
    const jimothy = {
      x: 425, y: 280,
      scaleY: 1, scaleX: 1,
      rotation: 0,
      bounceY: 0,
      armAngle: 0,
      isPoked: false,
      pokedTimer: 0,

      dance() {
        if (this.isPoked) return;
        this.bounceY = -25;
        this.scaleX = Math.random() > 0.5 ? 1.15 : 0.85;
        this.scaleY = 1.2;
        this.rotation = (Math.random() - 0.5) * 0.4;
        this.armAngle = (Math.random() - 0.5) * 1.5;
      },

      poke() {
        this.isPoked = true;
        this.bounceY = -50;
        this.scaleX = 0.7;
        this.scaleY = 1.3;
        this.rotation = (Math.random() - 0.5) * 0.8;
        this.armAngle = Math.PI / 2;
        this.pokedTimer = 30;

        audio.playPokeSound();
        renderKaraoke(["DON'T", "TOUCH", "MY", "OPPOSITE", "BRAIN!!", "🦝💥"], 1);
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
        c.beginPath(); c.ellipse(0, 20, 75, 65, 0, 0, Math.PI * 2); c.fill();

        // Belly
        c.fillStyle = '#f2e9e4';
        c.beginPath(); c.ellipse(0, 30, 48, 40, 0, 0, Math.PI * 2); c.fill();

        // Head
        c.fillStyle = '#9a8c98';
        c.beginPath(); c.ellipse(0, -50, 58, 45, 0, 0, Math.PI * 2); c.fill();

        // Ears
        c.fillStyle = '#4a4e69';
        c.beginPath(); c.arc(-40, -85, 18, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(40, -85, 18, 0, Math.PI * 2); c.fill();

        // Mask
        c.fillStyle = '#22223b';
        c.beginPath();
        c.ellipse(-20, -50, 20, 13, 0.2, 0, Math.PI * 2);
        c.ellipse(20, -50, 20, 13, -0.2, 0, Math.PI * 2);
        c.fill();

        // Sunglasses 🕶️
        c.fillStyle = '#000000';
        c.fillRect(-40, -60, 35, 18);
        c.fillRect(5, -60, 35, 18);
        c.fillRect(-10, -56, 18, 4);
        c.fillStyle = '#ff007f';
        c.fillRect(-35, -58, 25, 3);
        c.fillRect(10, -58, 25, 3);

        // Mouth
        c.fillStyle = '#000000';
        if (this.isPoked) {
          c.beginPath(); c.arc(0, -35, 10, 0, Math.PI * 2); c.fill();
        } else {
          c.beginPath(); c.arc(0, -35, 10, 0, Math.PI); c.fill();
        }

        // Paws / Arms
        c.save();
        c.rotate(this.armAngle);
        c.fillStyle = '#22223b';
        c.beginPath(); c.ellipse(-65, 0, 18, 12, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(65, 0, 18, 12, 0, 0, Math.PI * 2); c.fill();
        c.restore();

        c.restore();
      }
    };

    // Stage Background
    function drawStage() {
      let now = Date.now() * 0.003;

      // Light Beams
      const colors = ['rgba(255, 0, 127, 0.15)', 'rgba(0, 255, 234, 0.15)', 'rgba(255, 230, 0, 0.15)'];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(425, 0);
        ctx.lineTo(80 + i * 170 + Math.sin(now + i) * 50, 440);
        ctx.lineTo(160 + i * 170 + Math.sin(now + i) * 50, 440);
        ctx.closePath();
        ctx.fill();
      }

      // Floor
      let cols = 8, rows = 2;
      let w = 850 / cols, h = 60 / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = (r + c + Math.floor(now * 4)) % 2 === 0 ? '#ff007f' : '#00ffea';
          ctx.globalAlpha = 0.25;
          ctx.fillRect(c * w, 380 + r * h, w - 4, h - 4);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // Touch Event
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const dx = clickX - jimothy.x;
      const dy = clickY - (jimothy.y + jimothy.bounceY - 20);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 90) {
        jimothy.poke();
      }
    });

    // Translate Button Click Handler
    translateBtn.onclick = () => {
      let inputText = userInput.value;
      let oppositeSentence = translateToOpposite(inputText);
      audio.speakSentence(oppositeSentence);
    };

    // Main Animation Loop
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawStage();
      jimothy.update();
      jimothy.draw(ctx);

      requestAnimationFrame(loop);
    }

    loop();
