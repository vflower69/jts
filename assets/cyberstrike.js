    // Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.left-section .view-pane').forEach(pane => pane.classList.remove('active'));
      
      event.currentTarget.classList.add('active');
      document.getElementById(`${tabId}-view`).classList.add('active');
    }

    // Game Core State
    let canvas, ctx;
    let isPlaying = false;
    let credits = 100;
    let wave = 1;

    let player = {
      x: 0,
      y: 0,
      radius: 16,
      hp: 100,
      maxHp: 100,
      speed: 4,
      angle: 0
    };

    let Upgrades = {
      fireRate: { lvl: 1, cost: 50 },
      damage: { lvl: 1, cost: 75 },
      shield: { lvl: 1, cost: 100 }
    };

    let bullets = [];
    let enemies = [];
    let particles = [];
    let keys = {};
    let mouse = { x: 0, y: 0 };
    let lastShootTime = 0;

    function initCanvas() {
      canvas = document.getElementById('arenaCanvas');
      ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;

      player.x = canvas.width / 2;
      player.y = canvas.height / 2;

      // Event Listeners
      window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
      window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
      
      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });

      canvas.addEventListener('mousedown', () => {
        if (isPlaying) shoot();
      });
    }

    function startGame() {
      document.getElementById('startOverlay').style.display = 'none';
      if (!canvas) initCanvas();
      
      isPlaying = true;
      enemies = [];
      bullets = [];
      particles = [];
      player.hp = player.maxHp;
      
      updateUI();
      gameLoop();
      spawnEnemies();
    }

    function shoot() {
      const now = Date.now();
      const fireInterval = Math.max(100, 300 - Upgrades.fireRate.lvl * 35);
      
      if (now - lastShootTime < fireInterval) return;
      lastShootTime = now;

      const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      bullets.push({
        x: player.x + Math.cos(angle) * player.radius,
        y: player.y + Math.sin(angle) * player.radius,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        damage: 20 * (1 + Upgrades.damage.lvl * 0.15)
      });
    }

    function spawnEnemies() {
      if (!isPlaying) return;
      
      if (enemies.length < 5 + wave * 2) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(canvas.width, canvas.height) / 2 + 50;
        enemies.push({
          x: player.x + Math.cos(angle) * dist,
          y: player.y + Math.sin(angle) * dist,
          radius: 12,
          speed: 1.5 + Math.random() * 1.5,
          hp: 30 + wave * 10
        });
      }

      setTimeout(spawnEnemies, Math.max(800, 2000 - wave * 100));
    }

    function buyUpgrade(type) {
      const up = Upgrades[type];
      if (credits >= up.cost) {
        credits -= up.cost;
        up.lvl++;
        up.cost = Math.floor(up.cost * 1.5);

        if (type === 'shield') {
          player.maxHp += 20;
          player.hp = player.maxHp;
        }

        updateUI();
      }
    }

    function updateUI() {
      document.getElementById('creditsCount').innerText = credits;
      document.getElementById('btnFireRate').innerText = `${Upgrades.fireRate.cost} ⚡`;
      document.getElementById('btnDamage').innerText = `${Upgrades.damage.cost} ⚡`;
      document.getElementById('btnShield').innerText = `${Upgrades.shield.cost} ⚡`;

      document.getElementById('btnFireRate').disabled = credits < Upgrades.fireRate.cost;
      document.getElementById('btnDamage').disabled = credits < Upgrades.damage.cost;
      document.getElementById('btnShield').disabled = credits < Upgrades.shield.cost;
    }

    function gameLoop() {
      if (!isPlaying) return;

      // 1. Movement Logic
      if (keys['w'] || keys['arrowup']) player.y = Math.max(player.radius, player.y - player.speed);
      if (keys['s'] || keys['arrowdown']) player.y = Math.min(canvas.height - player.radius, player.y + player.speed);
      if (keys['a'] || keys['arrowleft']) player.x = Math.max(player.radius, player.x - player.speed);
      if (keys['d'] || keys['arrowright']) player.x = Math.min(canvas.width - player.radius, player.x + player.speed);

      // 2. Clear Screen & Grid
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // 3. Draw Player
      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      
      // Cyber Player Shape
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Cannon Pointer
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(0, -4, player.radius + 8, 8);
      ctx.restore();

      // Health Bar HUD above player
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(player.x - 20, player.y - 28, 40, 5);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(player.x - 20, player.y - 28, (player.hp / player.maxHp) * 40, 5);

      // 4. Bullets Logic
      for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
          bullets.splice(i, 1);
        }
      }

      // 5. Enemies Logic
      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // Draw Rogue AI Drone
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bullet Hit Check
        for (let j = bullets.length - 1; j >= 0; j--) {
          let b = bullets[j];
          let dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.radius + 4) {
            e.hp -= b.damage;
            bullets.splice(j, 1);

            if (e.hp <= 0) {
              credits += 15;
              updateUI();
              enemies.splice(i, 1);
              break;
            }
          }
        }

        // Player Collision
        let pDist = Math.hypot(player.x - e.x, player.y - e.y);
        if (pDist < player.radius + e.radius) {
          player.hp -= 0.5;
          if (player.hp <= 0) {
            isPlaying = false;
            document.getElementById('startOverlay').style.display = 'flex';
            document.querySelector('.overlay-title').innerText = 'SYSTEM OVERRIDE';
          }
        }
      }

      requestAnimationFrame(gameLoop);
    }

    // Auto-init on resize
    window.addEventListener('resize', () => {
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    });
