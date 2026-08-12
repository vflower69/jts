    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const ROWS = 9;
    const COLS = 9;
    const DENS_COUNT = 10;

    let board = [];
    let revealedCount = 0;
    let timer = 0;
    let timerInterval = null;
    let gameOver = false;
    let flagsLeft = DENS_COUNT;

    // Custom Cursor tracking
    const cursor = document.getElementById('jimothy-cursor');
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    function initGame() {
      clearInterval(timerInterval);
      timer = 0;
      revealedCount = 0;
      gameOver = false;
      flagsLeft = DENS_COUNT;
      document.getElementById('timer').innerText = '0';
      document.getElementById('den-count').innerText = flagsLeft;

      const gridElement = document.getElementById('grid');
      gridElement.innerHTML = '';
      gridElement.style.gridTemplateColumns = `repeat(${COLS}, 42px)`;

      // Initialize board data structure
      board = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
          isDen: false,
          revealed: false,
          flagged: false,
          neighborDens: 0,
          element: null
        }))
      );

      // Place fox dens randomly
      let placed = 0;
      while (placed < DENS_COUNT) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        if (!board[r][c].isDen) {
          board[r][c].isDen = true;
          placed++;
        }
      }

      // Calculate adjacent fox dens
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c].isDen) {
            board[r][c].neighborDens = countNeighborDens(r, c);
          }
        }
      }

      // Render grid tiles
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = document.createElement('div');
          tile.classList.add('tile');
          tile.addEventListener('click', () => revealTile(r, c));
          tile.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleFlag(r, c);
          });

          board[r][c].element = tile;
          gridElement.appendChild(tile);
        }
      }
    }

    function startTimer() {
      if (!timerInterval && !gameOver) {
        timerInterval = setInterval(() => {
          timer++;
          document.getElementById('timer').innerText = timer;
        }, 1000);
      }
    }

    function countNeighborDens(r, c) {
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          let nr = r + dr;
          let nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            if (board[nr][nc].isDen) count++;
          }
        }
      }
      return count;
    }

    function toggleFlag(r, c) {
      if (gameOver || board[r][c].revealed) return;

      const tile = board[r][c];
      if (tile.flagged) {
        tile.flagged = false;
        tile.element.innerText = '';
        flagsLeft++;
      } else if (flagsLeft > 0) {
        tile.flagged = true;
        tile.element.innerText = '🚩';
        flagsLeft--;
      }
      document.getElementById('den-count').innerText = flagsLeft;
    }

    function revealTile(r, c) {
      if (gameOver || board[r][c].revealed || board[r][c].flagged) return;

      startTimer();
      const tile = board[r][c];
      tile.revealed = true;
      tile.element.classList.add('revealed');

      // Dug up a fox den - GAME OVER!
      if (tile.isDen) {
        tile.element.classList.add('den-exploded');
        tile.element.innerText = '🦊';
        handleGameOver(false);
        return;
      }

      revealedCount++;
      const dens = tile.neighborDens;

      // Assign custom item symbols based on requirements:
      // Berry = Safe (0), Apple Core = 1, Juice Box = 2, Banana Peel = 3
      if (dens === 0) {
        tile.element.innerText = '🫐';
        // Auto reveal surrounding tiles for zero adjacent dens
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            let nr = r + dr;
            let nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              if (!board[nr][nc].revealed) {
                revealTile(nr, nc);
              }
            }
          }
        }
      } else if (dens === 1) {
        tile.element.innerText = '🍎'; // Apple Core
      } else if (dens === 2) {
        tile.element.innerText = '🧃'; // Juice Box
      } else if (dens === 3) {
        tile.element.innerText = '🍌'; // Banana Peel
      } else {
        tile.element.innerText = '⚠️';
      }

      // Check Win Condition
      if (revealedCount === (ROWS * COLS) - DENS_COUNT) {
        handleGameOver(true);
      }
    }

    function handleGameOver(won) {
      gameOver = true;
      clearInterval(timerInterval);
      timerInterval = null;

      // Reveal all dens
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c].isDen) {
            if (!board[r][c].revealed) {
              board[r][c].element.classList.add('revealed');
              board[r][c].element.innerText = '🦊';
            }
          }
        }
      }

      setTimeout(() => {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const msg = document.getElementById('modal-message');

        if (won) {
          title.innerText = '🎉 You Won!';
          msg.innerText = `Jimothy safely uncovered all the berries and snacks in ${timer} seconds without disturbing any foxes!`;
        } else {
          title.innerText = '💥 Game Over!';
          msg.innerText = 'Jimothy dug up a den and got bit by the fox inside!';
        }
        modal.classList.add('active');
      }, 300);
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }

    // Start game on load
    initGame();
  
