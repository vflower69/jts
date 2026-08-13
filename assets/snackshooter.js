    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const nextBubbleEl = document.getElementById('next-bubble');
    const modalEl = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');

    // Snack definitions
    const SNACKS = [
      { id: 'berries', label: 'Berries', emoji: '🫐', color: '#8b5cf6' },
      { id: 'bars', label: 'Snack Bar', emoji: '🍫', color: '#d97706' },
      { id: 'pizza', label: 'Pizza Slice', emoji: '🍕', color: '#ef4444' },
      { id: 'pb_cup', label: 'PB Cup', emoji: '🥜', color: '#78350f' },
      { id: 'juice', label: 'Apple Juice', emoji: '🧃', color: '#22c55e' },
      { id: 'banana', label: 'Banana', emoji: '🍌', color: '#eab308' }
    ];

    // Grid config
    const BUBBLE_RADIUS = 20;
    const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // ~34.64
    const COLS = 11;
    const ROWS = 14;
    const CANNON_Y = canvas.height - 40;

    let grid = [];
    let score = 0;
    let gameOver = false;
    let currentSnack = null;
    let nextSnack = null;
    let projectile = null;
    let mousePos = { x: canvas.width / 2, y: 0 };

    // Initialize/Reset Game
    function init() {
      score = 0;
      gameOver = false;
      scoreEl.innerText = score;
      modalEl.classList.remove('active');

      // Build grid array
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

      // Fill initial top 5 rows
      for (let r = 0; r < 5; r++) {
        const colsInRow = getColsInRow(r);
        for (let c = 0; c < colsInRow; c++) {
          grid[r][c] = getRandomSnack();
        }
      }

      currentSnack = getRandomSnack();
      nextSnack = getRandomSnack();
      updateNextPreview();
      
      requestAnimationFrame(gameLoop);
    }

    function getColsInRow(r) {
      return (r % 2 === 1) ? COLS - 1 : COLS;
    }

    function getRandomSnack() {
      return SNACKS[Math.floor(Math.random() * SNACKS.length)];
    }

    function updateNextPreview() {
      nextBubbleEl.innerText = nextSnack.emoji;
      nextBubbleEl.style.backgroundColor = nextSnack.color;
    }

    // Convert Grid Coordinate to Screen Pixel Coordinate
    function getBubbleCenter(r, c) {
      const isOdd = r % 2 === 1;
      const xOffset = isOdd ? BUBBLE_RADIUS * 2 : BUBBLE_RADIUS;
      const x = xOffset + c * (BUBBLE_RADIUS * 2);
      const y = BUBBLE_RADIUS + r * ROW_HEIGHT;
      return { x, y };
    }

    // Convert Screen Position to Grid Coordinate
    function getGridCoord(x, y) {
      const r = Math.round((y - BUBBLE_RADIUS) / ROW_HEIGHT);
      const row = Math.max(0, Math.min(ROWS - 1, r));
      const isOdd = row % 2 === 1;
      const xOffset = isOdd ? BUBBLE_RADIUS * 2 : BUBBLE_RADIUS;
      const col = Math.round((x - xOffset) / (BUBBLE_RADIUS * 2));
      const colsInRow = getColsInRow(row);
      const clampedCol = Math.max(0, Math.min(colsInRow - 1, col));
      return { r: row, c: clampedCol };
    }

    // Fire current snack
    function shoot() {
      if (projectile || gameOver) return;

      const angle = Math.atan2(mousePos.y - CANNON_Y, mousePos.x - (canvas.width / 2));
      // Clamp angle so it doesn't shoot backwards/downwards
      if (angle > -0.15 || angle < -Math.PI + 0.15) return;

      const speed = 14;
      projectile = {
        x: canvas.width / 2,
        y: CANNON_Y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        snack: currentSnack
      };

      currentSnack = nextSnack;
      nextSnack = getRandomSnack();
      updateNextPreview();
    }

    // Physics & Game Loop
    function update() {
      if (projectile) {
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;

        // Bounce off side walls
        if (projectile.x - BUBBLE_RADIUS <= 0) {
          projectile.x = BUBBLE_RADIUS;
          projectile.vx *= -1;
        } else if (projectile.x + BUBBLE_RADIUS >= canvas.width) {
          projectile.x = canvas.width - BUBBLE_RADIUS;
          projectile.vx *= -1;
        }

        // Collision with top wall
        if (projectile.y - BUBBLE_RADIUS <= 0) {
          snapProjectileToGrid();
          return;
        }

        // Collision with existing grid bubbles
        for (let r = 0; r < ROWS; r++) {
          const colsInRow = getColsInRow(r);
          for (let c = 0; c < colsInRow; c++) {
            if (grid[r][c]) {
              const bCenter = getBubbleCenter(r, c);
              const dist = Math.hypot(projectile.x - bCenter.x, projectile.y - bCenter.y);
              if (dist < BUBBLE_RADIUS * 1.85) {
                snapProjectileToGrid();
                return;
              }
            }
          }
        }
      }
    }

    function snapProjectileToGrid() {
      const coord = getGridCoord(projectile.x, projectile.y);
      let targetR = coord.r;
      let targetC = coord.c;

      // If spot is occupied, find nearest empty neighbor
      if (grid[targetR][targetC]) {
        const neighbors = getEmptyNeighbors(targetR, targetC);
        if (neighbors.length > 0) {
          // pick closest neighbor to projectile
          neighbors.sort((a, b) => {
            const pA = getBubbleCenter(a.r, a.c);
            const pB = getBubbleCenter(b.r, b.c);
            const dA = Math.hypot(projectile.x - pA.x, projectile.y - pA.y);
            const dB = Math.hypot(projectile.x - pB.x, projectile.y - pB.y);
            return dA - dB;
          });
          targetR = neighbors[0].r;
          targetC = neighbors[0].c;
        }
      }

      grid[targetR][targetC] = projectile.snack;
      projectile = null;

      // Check matches
      const matches = findMatches(targetR, targetC, grid[targetR][targetC].id);
      if (matches.length >= 3) {
        // Remove matched snacks
        matches.forEach(m => grid[m.r][m.c] = null);
        score += matches.length * 10;
        
        // Remove floating disconnected islands
        const removedFloating = removeFloatingSnacks();
        score += removedFloating * 20;

        scoreEl.innerText = score;
        checkWinCondition();
      }

      // Check lose condition
      if (checkGameOverCondition()) {
        endGame(false);
      }
    }

    // Get adjacent grid coordinates
    function getNeighbors(r, c) {
      const isOdd = r % 2 === 1;
      const offsets = isOdd
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];

      const result = [];
      offsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS) {
          if (nc >= 0 && nc < getColsInRow(nr)) {
            result.push({ r: nr, c: nc });
          }
        }
      });
      return result;
    }

    function getEmptyNeighbors(r, c) {
      return getNeighbors(r, c).filter(n => grid[n.r][n.c] === null);
    }

    // Match 3 Flood Fill (BFS)
    function findMatches(startR, startC, snackId) {
      const matches = [];
      const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      const queue = [{ r: startR, c: startC }];
      visited[startR][startC] = true;

      while (queue.length > 0) {
        const curr = queue.shift();
        matches.push(curr);

        getNeighbors(curr.r, curr.c).forEach(n => {
          if (!visited[n.r][n.c] && grid[n.r][n.c] && grid[n.r][n.c].id === snackId) {
            visited[n.r][n.c] = true;
            queue.push(n);
          }
        });
      }

      return matches;
    }

    // Drop clusters not anchored to ceiling
    function removeFloatingSnacks() {
      const connected = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      const queue = [];

      // Seed queue with top row
      for (let c = 0; c < getColsInRow(0); c++) {
        if (grid[0][c]) {
          connected[0][c] = true;
          queue.push({ r: 0, c });
        }
      }

      // BFS to find all connected snacks
      while (queue.length > 0) {
        const curr = queue.shift();
        getNeighbors(curr.r, curr.c).forEach(n => {
          if (grid[n.r][n.c] && !connected[n.r][n.c]) {
            connected[n.r][n.c] = true;
            queue.push(n);
          }
        });
      }

      // Clear non-connected
      let count = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < getColsInRow(r); c++) {
          if (grid[r][c] && !connected[r][c]) {
            grid[r][c] = null;
            count++;
          }
        }
      }
      return count;
    }

    function checkWinCondition() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < getColsInRow(r); c++) {
          if (grid[r][c]) return false;
        }
      }
      endGame(true);
      return true;
    }

    function checkGameOverCondition() {
      const lastRow = ROWS - 1;
      for (let c = 0; c < getColsInRow(lastRow); c++) {
        if (grid[lastRow][c]) return true;
      }
      return false;
    }

    function endGame(isWin) {
      gameOver = true;
      modalTitle.innerText = isWin ? "Victory! 🎉" : "Game Over! 🦝";
      modalDesc.innerText = isWin 
        ? `Jimothy gobbled all the snacks! Final Score: ${score}` 
        : `Snacks piled up too high! Final Score: ${score}`;
      modalEl.classList.add('active');
    }

    // Render loop
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid Snacks
      for (let r = 0; r < ROWS; r++) {
        const colsInRow = getColsInRow(r);
        for (let c = 0; c < colsInRow; c++) {
          const snack = grid[r][c];
          if (snack) {
            const center = getBubbleCenter(r, c);
            drawSnackBubble(center.x, center.y, snack);
          }
        }
      }

      // Draw Launcher Trajectory Line
      if (!projectile && !gameOver) {
        const angle = Math.atan2(mousePos.y - CANNON_Y, mousePos.x - (canvas.width / 2));
        if (angle <= -0.15 && angle >= -Math.PI + 0.15) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.moveTo(canvas.width / 2, CANNON_Y);
          ctx.lineTo(
            (canvas.width / 2) + Math.cos(angle) * 120,
            CANNON_Y + Math.sin(angle) * 120
          );
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Active Projectile
      if (projectile) {
        drawSnackBubble(projectile.x, projectile.y, projectile.snack);
      }

      // Draw Shooter Base & Current Snack
      drawShooter();
    }

    function drawSnackBubble(x, y, snack) {
      ctx.save();
      
      // Outer bubble circle
      ctx.beginPath();
      ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
      ctx.fillStyle = snack.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();

      // Highlight sheen
      ctx.beginPath();
      ctx.arc(x - BUBBLE_RADIUS / 3, y - BUBBLE_RADIUS / 3, BUBBLE_RADIUS / 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fill();

      // Snack Emoji
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(snack.emoji, x, y + 1);

      ctx.restore();
    }

    function drawShooter() {
      const startX = canvas.width / 2;

      // Shooter pedestal
      ctx.save();
      ctx.beginPath();
      ctx.arc(startX, CANNON_Y, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#64748b';
      ctx.stroke();

      // Loaded Snack
      if (currentSnack && !projectile) {
        drawSnackBubble(startX, CANNON_Y, currentSnack);
      }

      ctx.restore();
    }

    function gameLoop() {
      update();
      draw();
      if (!gameOver) {
        requestAnimationFrame(gameLoop);
      }
    }

    function resetGame() {
      init();
    }

    // Event Listeners
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.x = e.clientX - rect.left;
      mousePos.y = e.clientY - rect.top;
    });

    canvas.addEventListener('click', () => {
      shoot();
    });

    // Start game
    init();
