    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
const GRID_SIZE = 8;
    const NUM_FOXES = 10;

    const EMOJIS = {
      0: '🫐',
      1: '🍎',
      2: '🧃',
      3: '🍌',
      4: '⚠️',
      5: '⚠️',
      6: '⚠️',
      7: '⚠️',
      8: '⚠️',
      fox: '🦊',
      flag: '🚩'
    };

    let board = [];
    let revealedCount = 0;
    let flagsCount = 0;
    let gameOver = false;
    let timer = 0;
    let timerInterval = null;
    let firstClick = true;

    const gridEl = document.getElementById('grid');
    const densLeftEl = document.getElementById('dens-left');
    const timerEl = document.getElementById('timer');
    const statusEl = document.getElementById('status');
    const resetBtn = document.getElementById('reset-btn');

    function initGame() {
      clearInterval(timerInterval);
      timer = 0;
      timerEl.textContent = '0';
      gameOver = false;
      firstClick = true;
      revealedCount = 0;
      flagsCount = 0;
      densLeftEl.textContent = NUM_FOXES;
      statusEl.innerHTML = 'Tap to dig! Long-press or right-click to flag 🚩.';
      gridEl.innerHTML = '';

      board = Array.from({ length: GRID_SIZE }, () =>
        Array.from({ length: GRID_SIZE }, () => ({
          hasFox: false,
          revealed: false,
          flagged: false,
          count: 0,
          element: null
        }))
      );

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cellEl = document.createElement('div');
          cellEl.classList.add('cell');
          board[r][c].element = cellEl;

          // Touch events for tap vs long press
          let pressTimer = null;

          const startPress = (e) => {
            if (gameOver) return;
            pressTimer = setTimeout(() => {
              toggleFlag(r, c);
              pressTimer = null;
            }, 400);
          };

          const cancelPress = () => {
            if (pressTimer) {
              clearTimeout(pressTimer);
              pressTimer = null;
            }
          };

          cellEl.addEventListener('touchstart', startPress, { passive: true });
          cellEl.addEventListener('touchend', (e) => {
            if (pressTimer) {
              cancelPress();
              clickCell(r, c);
            }
          });
          cellEl.addEventListener('touchmove', cancelPress, { passive: true });

          // Mouse events (Desktop support)
          cellEl.addEventListener('click', () => clickCell(r, c));
          cellEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleFlag(r, c);
          });

          gridEl.appendChild(cellEl);
        }
      }
    }

    function placeFoxes(safeR, safeC) {
      let placed = 0;
      while (placed < NUM_FOXES) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);

        if (!board[r][c].hasFox && !(r === safeR && c === safeC)) {
          board[r][c].hasFox = true;
          placed++;
        }
      }

      // Calculate neighbor counts
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (board[r][c].hasFox) continue;
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                if (board[nr][nc].hasFox) count++;
              }
            }
          }
          board[r][c].count = count;
        }
      }
    }

    function startTimer() {
      timerInterval = setInterval(() => {
        timer++;
        timerEl.textContent = timer;
      }, 1000);
    }

    function clickCell(r, c) {
      if (gameOver) return;
      const cell = board[r][c];

      if (cell.flagged || cell.revealed) return;

      if (firstClick) {
        firstClick = false;
        placeFoxes(r, c);
        startTimer();
      }

      if (cell.hasFox) {
        // Hit a fox
        triggerGameOver(false, cell);
        return;
      }

      revealCell(r, c);

      // Check win condition
      if (revealedCount === GRID_SIZE * GRID_SIZE - NUM_FOXES) {
        triggerGameOver(true);
      }
    }

    function revealCell(r, c) {
      const cell = board[r][c];
      if (cell.revealed || cell.flagged) return;

      cell.revealed = true;
      cell.element.classList.add('revealed');
      cell.element.textContent = EMOJIS[cell.count];
      revealedCount++;

      // Auto-expand empty areas (0 neighboring foxes)
      if (cell.count === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (!board[nr][nc].revealed) {
                revealCell(nr, nc);
              }
            }
          }
        }
      }
    }

    function toggleFlag(r, c) {
      if (gameOver || firstClick) return;
      const cell = board[r][c];
      if (cell.revealed) return;

      if (cell.flagged) {
        cell.flagged = false;
        cell.element.textContent = '';
        flagsCount--;
      } else {
        cell.flagged = true;
        cell.element.textContent = EMOJIS.flag;
        flagsCount++;
      }

      densLeftEl.textContent = Math.max(0, NUM_FOXES - flagsCount);
    }

    function triggerGameOver(win, hitCell = null) {
      gameOver = true;
      clearInterval(timerInterval);

      if (win) {
        statusEl.innerHTML = '<strong>🎉 Victory!</strong><br>Jimothy safely cleared the fox den area!';
      } else {
        if (hitCell) {
          hitCell.element.classList.add('fox');
        }
        statusEl.innerHTML = '<strong>💥 Game Over!</strong><br>Jimothy dug up a den and got bit by the fox! 🦊';

        // Reveal all foxes
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c].hasFox) {
              board[r][c].element.textContent = EMOJIS.fox;
            }
          }
        }
      }
    }

    resetBtn.addEventListener('click', initGame);

    // Start initial game
    initGame();
