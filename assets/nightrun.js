    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Game state
    let gameActive = true;
    let frameCount = 0;

    // Player (Jimothy) position
    const player = {
      x: 60,
      y: 250,
      radius: 16,
      targetX: 60,
      targetY: 250
    };

    // Vending Machine Target
    const vendingMachine = {
      x: 730,
      y: 210,
      width: 45,
      height: 75
    };

    // Safe Start Zone
    const startZone = {
      x: 0,
      y: 0,
      width: 110,
      height: 500
    };

    // Dark Forest Trees (Obstacles)
    const trees = [
      { x: 160, y: 120, r: 28 },
      { x: 180, y: 380, r: 32 },
      { x: 300, y: 250, r: 35 },
      { x: 420, y: 110, r: 30 },
      { x: 440, y: 400, r: 34 },
      { x: 560, y: 220, r: 38 },
      { x: 670, y: 100, r: 26 },
      { x: 680, y: 390, r: 28 }
    ];

    // Cougars class with limited motion & rotating vision field
    class Cougar {
      constructor(anchorX, anchorY, patrolRadius, baseAngle, sweepRange, sweepSpeed, visionDist, visionFov) {
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.x = anchorX;
        this.y = anchorY;
        this.patrolRadius = patrolRadius; // Limited movement range
        
        // Random wandering movement target inside patrolRadius
        this.targetX = anchorX;
        this.targetY = anchorY;
        this.moveTimer = 0;

        // Vision angle parameters
        this.baseAngle = baseAngle;       // Center angle in radians
        this.sweepRange = sweepRange;     // Sweep offset in radians (e.g. Math.PI / 4)
        this.sweepSpeed = sweepSpeed;     // Speed of rotation
        this.currentAngle = baseAngle;
        
        this.visionDist = visionDist;     // Length of vision cone
        this.visionFov = visionFov;       // Field of view in radians (e.g. 60 deg = Math.PI / 3)
      }

      update() {
        // 1. Limited Random Motion within patrol range
        this.moveTimer--;
        if (this.moveTimer <= 0) {
          // Pick new random point within patrol radius
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * this.patrolRadius;
          this.targetX = this.anchorX + Math.cos(angle) * dist;
          this.targetY = this.anchorY + Math.sin(angle) * dist;
          this.moveTimer = 60 + Math.random() * 90; // Change target every 1-2.5s
        }

        // Smoothly move towards target point
        this.x += (this.targetX - this.x) * 0.03;
        this.y += (this.targetY - this.y) * 0.03;

        // 2. Rotate visual field from side to side at regular intervals
        this.currentAngle = this.baseAngle + Math.sin(frameCount * this.sweepSpeed) * this.sweepRange;
      }

      draw() {
        // Draw Vision Cone (Light beam)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(
          this.x, 
          this.y, 
          this.visionDist, 
          this.currentAngle - this.visionFov / 2, 
          this.currentAngle + this.visionFov / 2
        );
        ctx.closePath();

        // Semi-transparent yellow beam gradient
        const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, this.visionDist);
        grad.addColorStop(0, 'rgba(255, 230, 120, 0.45)');
        grad.addColorStop(1, 'rgba(255, 200, 50, 0.05)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 220, 100, 0.3)';
        ctx.stroke();
        ctx.restore();

        // Draw Cougar Body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.currentAngle);

        // Cougar Body
        ctx.fillStyle = '#c2883f'; // Cougar tawny coat
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5e3e15';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cougar Head
        ctx.beginPath();
        ctx.arc(12, 0, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#d49b4f';
        ctx.fill();
        ctx.stroke();

        // Ears
        ctx.fillStyle = '#4a3212';
        ctx.beginPath();
        ctx.polygon?.([ [10, -9], [15, -12], [15, -6] ]); // Fallback if no polygon path
        ctx.moveTo(10, -8); ctx.lineTo(15, -12); ctx.lineTo(15, -5);
        ctx.moveTo(10, 8);  ctx.lineTo(15, 12);  ctx.lineTo(15, 5);
        ctx.fill();

        // Glowing Eyes
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.arc(15, -3, 2, 0, Math.PI * 2);
        ctx.arc(15, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      checkDetection(px, py) {
        // Distance check
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > this.visionDist) return false;

        // Angle check
        let angleToPlayer = Math.atan2(dy, dx);
        
        // Normalize angle difference to [-PI, PI]
        let angleDiff = angleToPlayer - this.currentAngle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        return Math.abs(angleDiff) <= (this.visionFov / 2);
      }
    }

    // Instantiate Cougars with varied patrol areas and rotation speeds
    const cougars = [
      new Cougar(220, 180, 45, 0, Math.PI / 3, 0.03, 140, Math.PI / 3.5),
      new Cougar(250, 400, 50, -Math.PI / 2, Math.PI / 2.5, 0.025, 150, Math.PI / 3),
      new Cougar(400, 260, 60, Math.PI / 4, Math.PI / 2, 0.035, 145, Math.PI / 3.5),
      new Cougar(520, 120, 40, Math.PI / 2, Math.PI / 3, 0.04, 135, Math.PI / 3),
      new Cougar(580, 360, 50, -Math.PI / 3, Math.PI / 2.2, 0.02, 160, Math.PI / 3.5)
    ];

    // Image/SVG of Jimothy the Raccoon
    // (Short tail, arched back, narrow triangular face, long legs, round body)
    const jimothySvgString = `
      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 15 50 Q 5 48 8 38 Q 12 30 22 42 Z" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/>
        <path d="M 12 44 Q 9 40 14 36" stroke="#2c3e50" stroke-width="3"/>
        <path d="M 17 48 Q 13 45 18 40" stroke="#2c3e50" stroke-width="3"/>
        <path d="M 32 62 L 28 82 L 22 84" stroke="#2c3e50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 58 62 L 58 84 L 52 86" stroke="#2c3e50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M 22 52 C 20 32 45 28 62 42 C 68 48 65 65 52 68 C 35 70 22 65 22 52 Z" fill="#95a5a6" stroke="#2c3e50" stroke-width="3"/>
        <polygon points="58,36 88,46 62,58" fill="#bdc3c7" stroke="#2c3e50" stroke-width="2"/>
        <path d="M 60 40 L 78 44 L 64 52 Z" fill="#2c3e50"/>
        <polygon points="85,45 89,46 86,48" fill="#000000"/>
        <circle cx="68" cy="43" r="2.5" fill="#ffffff"/>
        <circle cx="69" cy="43" r="1" fill="#000000"/>
        <polygon points="56,34 60,22 66,35" fill="#7f8c8d" stroke="#2c3e50" stroke-width="2"/>
      </svg>
    `;

    const jimothyImg = new Image();
    jimothyImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(jimothySvgString);

    // Track mouse on canvas
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      player.targetX = e.clientX - rect.left;
      player.targetY = e.clientY - rect.top;
    });

    function drawForestBackground() {
      // Grass / Dirt background
      ctx.fillStyle = '#141e15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Safe Start Area
      ctx.fillStyle = 'rgba(76, 133, 82, 0.25)';
      ctx.fillRect(startZone.x, startZone.y, startZone.width, startZone.height);
      ctx.strokeStyle = '#4c8552';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(startZone.x, startZone.y, startZone.width, startZone.height);
      ctx.setLineDash([]);

      ctx.fillStyle = '#4c8552';
      ctx.font = '12px sans-serif';
      ctx.fillText('SAFE ZONE', 20, 25);

      // Trees
      trees.forEach(t => {
        // Tree Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(t.x + 5, t.y + 5, t.r, 0, Math.PI * 2);
        ctx.fill();

        // Canopy
        ctx.fillStyle = '#1b2d1d';
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0d170e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner detail
        ctx.fillStyle = '#263d29';
        ctx.beginPath();
        ctx.arc(t.x - 4, t.y - 4, t.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawVendingMachine() {
      const v = vendingMachine;

      // Glow behind vending machine
      const glow = ctx.createRadialGradient(v.x + v.width/2, v.y + v.height/2, 5, v.x + v.width/2, v.y + v.height/2, 60);
      glow.addColorStop(0, 'rgba(80, 200, 255, 0.4)');
      glow.addColorStop(1, 'rgba(80, 200, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(v.x - 30, v.y - 30, v.width + 60, v.height + 60);

      // Main cabinet
      ctx.fillStyle = '#d62828';
      ctx.fillRect(v.x, v.y, v.width, v.height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(v.x, v.y, v.width, v.height);

      // Illuminated Window
      ctx.fillStyle = '#a8ded0';
      ctx.fillRect(v.x + 6, v.y + 8, v.width - 12, 35);

      // Soda Cans inside
      ctx.fillStyle = '#003049';
      ctx.fillRect(v.x + 10, v.y + 14, 8, 10);
      ctx.fillStyle = '#f77f00';
      ctx.fillRect(v.x + 22, v.y + 14, 8, 10);
      ctx.fillStyle = '#2a9d8f';
      ctx.fillRect(v.x + 10, v.y + 28, 8, 10);

      // Coin/Dispense Slot
      ctx.fillStyle = '#111';
      ctx.fillRect(v.x + 8, v.y + 48, v.width - 16, 18);

      // Glowing Label
      ctx.fillStyle = '#eae2b7';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('SNACKS', v.x + 4, v.y - 5);
    }

    function updatePlayer() {
      // Smooth movement towards mouse position
      player.x += (player.targetX - player.x) * 0.15;
      player.y += (player.targetY - player.y) * 0.15;

      // Keep player inside canvas boundary
      player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    }

    function drawPlayer() {
      ctx.save();
      ctx.translate(player.x, player.y);

      // Face direction of movement
      const angle = Math.atan2(player.targetY - player.y, player.targetX - player.x);
      ctx.rotate(angle);

      // Draw Jimothy SVG icon centered
      ctx.drawImage(jimothyImg, -24, -24, 48, 48);
      ctx.restore();
    }

    function checkWinCondition() {
      const v = vendingMachine;
      if (
        player.x >= v.x - player.radius &&
        player.x <= v.x + v.width + player.radius &&
        player.y >= v.y - player.radius &&
        player.y <= v.y + v.height + player.radius
      ) {
        handleGameOver(true);
      }
    }

    function gameLoop() {
      if (!gameActive) return;

      frameCount++;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Environment
      drawForestBackground();
      drawVendingMachine();

      // 2. Update & Draw Cougars
      for (let cougar of cougars) {
        cougar.update();
        cougar.draw();

        // Detection check (Ignore if in Safe Start Zone)
        if (player.x > startZone.width) {
          if (cougar.checkDetection(player.x, player.y)) {
            handleGameOver(false);
            return;
          }
        }
      }

      // 3. Update & Draw Jimothy
      updatePlayer();
      drawPlayer();

      // 4. Check Victory
      checkWinCondition();

      requestAnimationFrame(gameLoop);
    }

    function handleGameOver(won) {
      gameActive = false;
      const modal = document.getElementById('modal');
      const title = document.getElementById('modal-title');
      const msg = document.getElementById('modal-message');

      if (won) {
        title.innerText = '🎉 Midnight Snack Secured!';
        msg.innerText = 'Jimothy successfully snuck past all the cougars and got a refreshing drink from the vending machine!';
      } else {
        title.innerText = '🐾 Spotted!';
        msg.innerText = 'A cougar saw Jimothy moving in the dark! Better try sneaking by again carefully.';
      }

      modal.classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }

    function resetGame() {
      gameActive = true;
      player.x = 60;
      player.y = 250;
      player.targetX = 60;
      player.targetY = 250;
      frameCount = 0;
      requestAnimationFrame(gameLoop);
    }

    // Start game when image is loaded
    jimothyImg.onload = () => {
      resetGame();
    };
