    // Audio Synthesis Engine (Harmonic Pentatonic Scale)
    let audioCtx = null;
    let audioEnabled = true;
    const baseFreqs = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00]; // C Major Pentatonic Scale

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    }

    function playHarmonicTone(freqScale = 1) {
      if (!audioEnabled || !audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const baseNote = baseFreqs[Math.floor(Math.random() * baseFreqs.length)];
      const freq = baseNote * freqScale;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Soft ambient attack and long relaxing decay
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 3.6);
    }

    function toggleAudio() {
      audioEnabled = !audioEnabled;
      const btn = document.getElementById('btnSound');
      const icon = document.getElementById('soundIcon');
      
      if (audioEnabled) {
        btn.classList.add('active');
        icon.innerText = '🔔';
      } else {
        btn.classList.remove('active');
        icon.innerText = '🔇';
      }
    }

    // Canvas Engine & Particle System
    let canvas, ctx;
    let width, height;
    let particles = [];
    let ripples = [];
    let breathPhase = 0; // 0: Inhale, 1: Hold, 2: Exhale, 3: Rest
    let breathCycleProgress = 0;

    class Particle {
      constructor(x, y) {
        this.x = x || Math.random() * width;
        this.y = y || Math.random() * height;
        this.radius = Math.random() * 8 + 4;
        this.baseRadius = this.radius;
        this.color = `hsla(${200 + Math.random() * 40}, 80%, 75%, ${Math.random() * 0.5 + 0.3})`;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.pulse = Math.random() * Math.PI;
      }

      update(breathScale) {
        this.x += this.vx;
        this.y += this.vy;

        // Soft screen bounds bounce
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        this.pulse += 0.02;
        this.radius = this.baseRadius * breathScale + Math.sin(this.pulse) * 1.5;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(165, 243, 252, 0.4)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    class Ripple {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 160 + Math.random() * 60;
        this.alpha = 0.6;
      }

      update() {
        this.radius += 1.2;
        this.alpha -= 0.005;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(165, 243, 252, ${Math.max(0, this.alpha)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function initCanvas() {
      canvas = document.getElementById('meditationCanvas');
      ctx = canvas.getContext('2d');
      resize();

      particles = [];
      for (let i = 0; i < 45; i++) {
        particles.push(new Particle());
      }

      window.addEventListener('resize', resize);
      window.addEventListener('click', handleInteraction);
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function handleInteraction(e) {
      if (e.target.closest('.ui-layer') || e.target.closest('.start-overlay')) return;

      ripples.push(new Ripple(e.clientX, e.clientY));
      particles.push(new Particle(e.clientX, e.clientY));
      if (particles.length > 70) particles.shift();

      playHarmonicTone();
    }

    function clearOrbs() {
      particles = [];
      ripples = [];
      for (let i = 0; i < 30; i++) {
        particles.push(new Particle());
      }
    }

    function beginSession() {
      initAudio();
      document.getElementById('startOverlay').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('startOverlay').style.display = 'none';
      }, 1000);
      playHarmonicTone(0.8);
    }

    // Breathing Cycle Logic (4-7-8 Relaxing Technique)
    const breathPhases = [
      { text: 'Inhale', duration: 4000, scale: 1.8 },
      { text: 'Hold', duration: 4000, scale: 1.8 },
      { text: 'Exhale', duration: 6000, scale: 1.0 },
      { text: 'Rest', duration: 2000, scale: 1.0 }
    ];

    let currentScale = 1;
    let targetScale = 1;

    function updateBreathingCycle() {
      const current = breathPhases[breathPhase];
      document.getElementById('breathText').innerText = current.text;

      targetScale = current.scale;

      if (breathPhase === 0) playHarmonicTone(0.9);
      if (breathPhase === 2) playHarmonicTone(0.7);

      setTimeout(() => {
        breathPhase = (breathPhase + 1) % breathPhases.length;
        updateBreathingCycle();
      }, current.duration);
    }

    // Main Render Loop
    function render() {
      // Gentle canvas backdrop trail
      ctx.fillStyle = 'rgba(10, 14, 26, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Lerp breathing scale smooth transition
      currentScale += (targetScale - currentScale) * 0.015;

      // Draw Center Ambient Glow Orb
      const centerX = width / 2;
      const centerY = height / 2;
      const glowRadius = 120 * currentScale;

      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, glowRadius);
      gradient.addColorStop(0, 'rgba(165, 243, 252, 0.25)');
      gradient.addColorStop(0.5, 'rgba(120, 212, 234, 0.08)');
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Render Particles
      particles.forEach(p => {
        p.update(currentScale);
        p.draw();
      });

      // Render Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.update();
        r.draw();
        if (r.alpha <= 0) ripples.splice(i, 1);
      }

      requestAnimationFrame(render);
    }

    // Initialize
    initCanvas();
    updateBreathingCycle();
    render();
