    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
/* Audio Synthesizer */
    class AudioEngine {
      constructor() { this.ctx = null; }
      init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      playBounce(isNet = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isNet ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isNet ? 180 : 480, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(isNet ? 90 : 220, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
      }
      playHit(power = 0.5) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320 + power * 400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4 + power * 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
      }
      playScore(isWin) {
        if (!this.ctx) return;
        const notes = isWin ? [523, 659, 783] : [300, 240, 180];
        notes.forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.1 + 0.2);
          osc.connect(gain); gain.connect(this.ctx.destination);
          osc.start(this.ctx.currentTime + i * 0.1);
          osc.stop(this.ctx.currentTime + i * 0.1 + 0.2);
        });
      }
    }

    const audio = new AudioEngine();

    /* Canvas Setup */
    const canvas = document.getElementById('stage');
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Table World Settings
    const TABLE = { w: 120, l: 240, h: 48, netH: 14 };
    const camera = { x: 0, y: -85, z: -210, fov: 320 };

    function project(x, y, z) {
      const cz = z - camera.z;
      if (cz <= 1) return { x: 0, y: 0, scale: 0 };
      const scale = camera.fov / cz;
      const px = width / 2 + (x - camera.x) * scale;
      const py = height / 2 - (y - camera.y) * scale;
      return { x: px, y: py, scale: scale };
    }

    /* Game State Variables */
    let gameState = 'MENU';
    let playerScore = 0;
    let cpuScore = 0;
    let server = 'PLAYER';

    const ball = {
      x: 0, y: 20, z: -100,
      vx: 0, vy: 0, vz: 0,
      radius: 2.5,
      bounced: false,
      lastHitBy: null
    };

    const playerPaddle = {
      x: 0, y: 20, z: -105,
      targetX: 0, targetY: 20,
      w: 22, h: 26,
      force: 0,
      charging: false,
      hitCooldown: 0
    };

    const cpuPaddle = {
      x: 0, y: 20, z: 105,
      w: 22, h: 26,
      speed: 1.8
    };

    /* Key Listeners */
    const keys = {};
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (e.code === 'Space') {
        if (gameState === 'SERVE' && server === 'PLAYER') {
          playerServe();
        } else if (gameState === 'PLAYING') {
          playerPaddle.charging = true;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        playerPaddle.charging = false;
      }
      keys[e.code] = false;
    });

    /* Mouse & Pointer Movement */
    window.addEventListener('mousemove', (e) => {
      if (gameState !== 'PLAYING' && gameState !== 'SERVE') return;
      const normX = (e.clientX / width) * 2 - 1;
      const normY = -(e.clientY / height) * 2 + 1;
      playerPaddle.targetX = normX * 85;
      playerPaddle.targetY = Math.max(5, Math.min(65, normY * 60 + 20));
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (gameState === 'SERVE' && server === 'PLAYER') {
          playerServe();
        } else if (gameState === 'PLAYING') {
          playerPaddle.charging = true;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      playerPaddle.charging = false;
    });

    /* Touch Control Mapping */
    if ('ontouchstart' in window) {
      document.getElementById('touchOverlay').style.display = 'block';
      const pBtn = document.getElementById('tb-power');
      pBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState === 'SERVE' && server === 'PLAYER') {
          playerServe();
        } else {
          playerPaddle.charging = true;
        }
      });
      pBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        playerPaddle.charging = false;
      });

      document.querySelectorAll('.dpad-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          keys['KeyW'] = keys['KeyA'] = keys['KeyD'] = keys['KeyZ'] = false;
          btn.classList.add('active');
          const id = btn.id.replace('tb-', '');
          if (id.includes('W')) keys['KeyW'] = true;
          if (id.includes('A')) keys['KeyA'] = true;
          if (id.includes('D')) keys['KeyD'] = true;
          if (id.includes('Z')) keys['KeyZ'] = true;
        });
      });
    }

    /* Hit Direction Helper */
    function getHitDirection() {
      const w = keys['KeyW'] || keys['ArrowUp'];
      const a = keys['KeyA'];
      const d = keys['KeyD'];
      const z = keys['KeyZ'] || keys['KeyS'] || keys['ArrowDown'];

      let dirX = 0, dirY = 0;
      if (a) dirX = -1;
      if (d) dirX = 1;
      if (w) dirY = 1;
      if (z) dirY = -1;

      let code = 'NONE';
      if (w && a) code = 'AW';
      else if (w && d) code = 'WD';
      else if (z && a) code = 'AZ';
      else if (z && d) code = 'ZD';
      else if (w) code = 'W';
      else if (z) code = 'Z';
      else if (a) code = 'A';
      else if (d) code = 'D';

      document.querySelectorAll('.dir-cell').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById(`d-${code}`);
      if (activeEl) activeEl.classList.add('active');
      document.getElementById('dirText').innerText = `Hit Dir: ${code === 'NONE' ? 'Center' : code}`;

      return { dirX, dirY };
    }

    /* Match Functions */
    function startGame() {
      audio.init();
      document.getElementById('menuOverlay').style.display = 'none';
      playerScore = 0;
      cpuScore = 0;
      updateScoreUI();
      server = 'PLAYER';
      resetServe();
    }

    function resetServe() {
      gameState = 'SERVE';
      ball.vx = 0; ball.vy = 0; ball.vz = 0;
      ball.bounced = false;

      if (server === 'PLAYER') {
        showStatus('YOUR SERVE (PRESS SPACE / CLICK)');
        ball.z = -95;
        ball.x = playerPaddle.x;
        ball.y = playerPaddle.y;
      } else {
        showStatus('CPU SERVING');
        ball.z = 95;
        ball.x = cpuPaddle.x;
        ball.y = cpuPaddle.y;
        setTimeout(cpuServe, 1200);
      }
    }

    function playerServe() {
      if (gameState !== 'SERVE' || server !== 'PLAYER') return;
      gameState = 'PLAYING';
      const { dirX, dirY } = getHitDirection();
      const p = Math.max(0.4, playerPaddle.force);

      ball.vx = dirX * 1.8 + (playerPaddle.x * 0.02);
      ball.vy = 3.8 + dirY * 1.2 + p * 2;
      ball.vz = 5.2 + p * 3;
      ball.lastHitBy = 'PLAYER';
      audio.playHit(p);
      playerPaddle.force = 0;
      playerPaddle.hitCooldown = 15;
    }

    function cpuServe() {
      if (gameState !== 'SERVE' || server !== 'CPU') return;
      gameState = 'PLAYING';
      ball.vx = (Math.random() - 0.5) * 1.6;
      ball.vy = 3.6 + Math.random();
      ball.vz = -5.2;
      ball.lastHitBy = 'CPU';
      audio.playHit(0.5);
    }

    /* Auto Collision Detection for Player */
    function checkPlayerHit() {
      if (playerPaddle.hitCooldown > 0) {
        playerPaddle.hitCooldown--;
        return;
      }

      // Proximity check: Ball approaching player paddle
      if (ball.vz < 0 && ball.z < -80 && ball.z > -118) {
        const dx = Math.abs(ball.x - playerPaddle.x);
        const dy = Math.abs(ball.y - playerPaddle.y);

        if (dx < playerPaddle.w / 1.4 && dy < playerPaddle.h / 1.4) {
          const { dirX, dirY } = getHitDirection();
          const p = playerPaddle.force;

          ball.vx = dirX * 2.4 + (ball.x - playerPaddle.x) * 0.12;
          ball.vy = 2.8 + dirY * 1.8 + p * 2.5;
          ball.vz = Math.abs(ball.vz) * 0.95 + 1.2 + p * 3;
          ball.bounced = false;
          ball.lastHitBy = 'PLAYER';
          playerPaddle.hitCooldown = 18;

          audio.playHit(0.3 + p * 0.7);
          playerPaddle.force = 0;
        }
      }
    }

    /* CPU AI logic */
    function updateCPU() {
      const targetX = ball.x;
      const targetY = Math.max(12, ball.y);
      cpuPaddle.x += (targetX - cpuPaddle.x) * 0.1 * cpuPaddle.speed;
      cpuPaddle.y += (targetY - cpuPaddle.y) * 0.1 * cpuPaddle.speed;

      if (gameState === 'PLAYING' && ball.vz > 0 && ball.z > 80 && ball.z < 112) {
        const dx = Math.abs(ball.x - cpuPaddle.x);
        const dy = Math.abs(ball.y - cpuPaddle.y);

        if (dx < cpuPaddle.w / 1.4 && dy < cpuPaddle.h / 1.4) {
          const targetCornerX = (Math.random() - 0.5) * 100;
          ball.vx = (targetCornerX - ball.x) * 0.035;
          ball.vy = 3.2 + Math.random() * 2;
          ball.vz = -(Math.abs(ball.vz) * 0.95 + 1.2);
          ball.bounced = false;
          ball.lastHitBy = 'CPU';
          audio.playHit(0.6);
        }
      }
    }

    /* Game Physics Loop */
    function updatePhysics() {
      // Force bar update
      if (playerPaddle.charging) {
        playerPaddle.force = Math.min(1, playerPaddle.force + 0.04);
      } else {
        playerPaddle.force = Math.max(0, playerPaddle.force - 0.06);
      }

      document.getElementById('powerBar').style.width = `${Math.round(playerPaddle.force * 100)}%`;
      document.getElementById('powerText').innerText = `${Math.round(playerPaddle.force * 100)}%`;

      // Arrow Movement
      if (keys['ArrowLeft']) playerPaddle.targetX -= 3;
      if (keys['ArrowRight']) playerPaddle.targetX += 3;
      if (keys['ArrowUp']) playerPaddle.targetY += 3;
      if (keys['ArrowDown']) playerPaddle.targetY -= 3;

      playerPaddle.x += (playerPaddle.targetX - playerPaddle.x) * 0.3;
      playerPaddle.y += (playerPaddle.targetY - playerPaddle.y) * 0.3;
      playerPaddle.x = Math.max(-80, Math.min(80, playerPaddle.x));
      playerPaddle.y = Math.max(5, Math.min(65, playerPaddle.y));

      if (gameState === 'SERVE') {
        if (server === 'PLAYER') {
          ball.x = playerPaddle.x;
          ball.y = playerPaddle.y + 2;
          ball.z = playerPaddle.z + 8;
        } else {
          ball.x = cpuPaddle.x;
          ball.y = cpuPaddle.y + 2;
          ball.z = cpuPaddle.z - 8;
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      // Ball Trajectory
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.z += ball.vz;
      ball.vy -= 0.16; // Gravity

      // Table Bounce
      if (ball.y <= 0 && Math.abs(ball.x) <= TABLE.w / 2 && Math.abs(ball.z) <= TABLE.l / 2) {
        ball.y = 0;
        ball.vy = -ball.vy * 0.84;
        audio.playBounce(false);

        if (ball.bounced) {
          awardPoint(ball.lastHitBy === 'PLAYER' ? 'PLAYER' : 'CPU', 'Double Bounce');
        } else {
          ball.bounced = true;
        }
      }

      // Net Collision
      if (Math.abs(ball.z) < 4 && ball.y < TABLE.netH) {
        ball.vz = -ball.vz * 0.4;
        ball.vy = 1;
        audio.playBounce(true);
      }

      // Out of Bounds Detection
      if (Math.abs(ball.z) > TABLE.l / 2 + 35 || ball.y < -35) {
        if (!ball.bounced) {
          awardPoint(ball.lastHitBy === 'PLAYER' ? 'CPU' : 'PLAYER', 'Out of Bounds');
        } else {
          awardPoint(ball.z > 0 ? 'PLAYER' : 'CPU', 'Point Scored');
        }
      }

      checkPlayerHit();
      updateCPU();
    }

    function awardPoint(winner, reason) {
      if (gameState !== 'PLAYING') return;
      gameState = 'SCORED';

      if (winner === 'PLAYER') {
        playerScore++;
        audio.playScore(true);
        showStatus(`POINT PLAYER! (${reason})`);
      } else {
        cpuScore++;
        audio.playScore(false);
        showStatus(`POINT CPU! (${reason})`);
      }

      updateScoreUI();

      if ((playerScore + cpuScore) % 2 === 0) {
        server = server === 'PLAYER' ? 'CPU' : 'PLAYER';
      }

      setTimeout(() => {
        if (playerScore >= 11 || cpuScore >= 11) {
          endGame();
        } else {
          resetServe();
        }
      }, 1800);
    }

    function updateScoreUI() {
      document.getElementById('playerScore').innerText = playerScore;
      document.getElementById('cpuScore').innerText = cpuScore;
    }

    function showStatus(msg) {
      const el = document.getElementById('statusToast');
      el.innerText = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1600);
    }

    function endGame() {
      gameState = 'GAMEOVER';
      const winner = playerScore >= 11 ? 'PLAYER' : 'CPU';
      const menu = document.getElementById('menuOverlay');
      menu.querySelector('.game-title').innerText = `${winner} WINS!`;
      menu.querySelector('.game-subtitle').innerText = `Final Score: ${playerScore} - ${cpuScore}`;
      menu.style.display = 'flex';
    }

    /* 3D Render Loop */
    function render() {
      ctx.clearRect(0, 0, width, height);

      const tW = TABLE.w / 2;
      const tL = TABLE.l / 2;

      const p1 = project(-tW, 0, -tL);
      const p2 = project(tW, 0, -tL);
      const p3 = project(tW, 0, tL);
      const p4 = project(-tW, 0, tL);

      // Table Surface
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fillStyle = '#0f52ba';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Center Line
      const c1 = project(0, 0, -tL);
      const c2 = project(0, 0, tL);
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.stroke();

      // Net
      const n1 = project(-tW - 4, 0, 0);
      const n2 = project(tW + 4, 0, 0);
      const n3 = project(tW + 4, TABLE.netH, 0);
      const n4 = project(-tW - 4, TABLE.netH, 0);

      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
      ctx.lineTo(n3.x, n3.y); ctx.lineTo(n4.x, n4.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // CPU Paddle
      drawPaddle(cpuPaddle, '#ff6b00');

      // Ball Shadow
      const bShadow = project(ball.x, 0, ball.z);
      ctx.beginPath();
      ctx.ellipse(bShadow.x, bShadow.y, Math.max(1, 8 * bShadow.scale), Math.max(1, 4 * bShadow.scale), 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      // Ball
      const bProj = project(ball.x, ball.y, ball.z);
      ctx.beginPath();
      ctx.arc(bProj.x, bProj.y, Math.max(2, ball.radius * bProj.scale), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Player Paddle
      drawPaddle(playerPaddle, '#00f0ff');
    }

    function drawPaddle(paddle, color) {
      const proj = project(paddle.x, paddle.y, paddle.z);
      const pW = paddle.w * proj.scale;
      const pH = paddle.h * proj.scale;

      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Handle
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-pW * 0.15, pH * 0.4, pW * 0.3, pH * 0.5);

      // Paddle Surface
      ctx.beginPath();
      ctx.ellipse(0, 0, pW / 2, pH / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.restore();
    }

    /* Main Execution Loop */
    function gameLoop() {
      updatePhysics();
      render();
      requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
  
