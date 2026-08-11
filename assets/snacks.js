    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const gridEl = document.getElementById("grid");
    const scoreEl = document.querySelector("#score span");
    const timerEl = document.querySelector("#timer span");
    const levelEl = document.querySelector("#level span");
    const messageEl = document.getElementById("message");
    const startBtn = document.getElementById("start-btn");
    const resetBtn = document.getElementById("reset-btn");

    const GRID_SIZE = 16;
    let score = 0;
    let timeLeft = 30;
    let level = 1;
    let timerId = null;
    let roundIntervalId = null;
    let gameRunning = false;

    function createGrid() {
      gridEl.innerHTML = "";
      for (let i = 0; i < GRID_SIZE; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        const content = document.createElement("div");
        content.className = "cell-content";
        cell.appendChild(content);
        gridEl.appendChild(cell);
      }
    }

    function randomIndices(count) {
      const indices = [];
      while (indices.length < count) {
        const idx = Math.floor(Math.random() * GRID_SIZE);
        if (!indices.includes(idx)) indices.push(idx);
      }
      return indices;
    }

    function renderRound() {
      const cells = Array.from(document.querySelectorAll(".cell"));
      cells.forEach((cell) => {
        cell.classList.remove("jimothy", "trash", "fake");
        cell.firstChild.textContent = "";
        cell.onclick = null;
      });

      const jimothyCount = Math.min(3, 1 + Math.floor(level / 2));
      const trashCount = Math.min(4, 2 + level);
      const fakeCount = Math.min(3, 1 + Math.floor(level / 3));

      const jimothyIndices = randomIndices(jimothyCount);
      const trashIndices = randomIndices(trashCount);
      const fakeIndices = randomIndices(fakeCount);

      jimothyIndices.forEach((idx) => {
        const cell = cells[idx];
        cell.classList.add("jimothy");
        cell.firstChild.textContent = "🦝";
        cell.onclick = () => handleClick("jimothy", cell);
      });

      trashIndices.forEach((idx) => {
        if (jimothyIndices.includes(idx)) return;
        const cell = cells[idx];
        cell.classList.add("trash");
        cell.firstChild.textContent = "🗑️";
        cell.onclick = () => handleClick("trash", cell);
      });

      fakeIndices.forEach((idx) => {
        if (jimothyIndices.includes(idx) || trashIndices.includes(idx)) return;
        const cell = cells[idx];
        cell.classList.add("fake");
        cell.firstChild.textContent = "🦝✨";
        cell.onclick = () => handleClick("fake", cell);
      });

      messageEl.textContent =
        "Find real Jimothy (🦝). Trash (🗑️) and sparkly raccoons (🦝✨) are trouble.";
    }

    function handleClick(type, cell) {
      if (!gameRunning) return;

      if (type === "jimothy") {
        score += 5;
        messageEl.textContent = "Nice! Jimothy approves of your reflexes.";
      } else if (type === "trash") {
        score -= 3;
        messageEl.textContent = "Oof. You clicked trash. Jimothy is judging you.";
      } else if (type === "fake") {
        score -= 6;
        messageEl.textContent =
          "That was a decoy raccoon. Jimothy just learned a new trick.";
      }

      scoreEl.textContent = score;
      cell.onclick = null;
      cell.style.transform = "scale(0.95)";
      setTimeout(() => {
        cell.style.transform = "";
      }, 80);

      if (score >= level * 25) {
        level++;
        levelEl.textContent = level;
        messageEl.textContent =
          "Level up! Jimothy is getting faster. Stay sharp.";
      }
    }

    function startTimer() {
      clearInterval(timerId);
      timerId = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
          endGame();
        }
      }, 1000);
    }

    function startRounds() {
      clearInterval(roundIntervalId);
      const interval = Math.max(600, 1500 - level * 100);
      roundIntervalId = setInterval(renderRound, interval);
      renderRound();
    }

    function startGame() {
      if (gameRunning) return;
      gameRunning = true;
      score = 0;
      timeLeft = 30;
      level = 1;
      scoreEl.textContent = score;
      timerEl.textContent = timeLeft;
      levelEl.textContent = level;
      messageEl.textContent = "Game started! Jimothy is on the move.";
      startTimer();
      startRounds();
    }

    function endGame() {
      gameRunning = false;
      clearInterval(timerId);
      clearInterval(roundIntervalId);
      messageEl.textContent =
        score >= 40
          ? `Game over! Final score: ${score}. Jimothy is mildly impressed.`
          : `Game over! Final score: ${score}. Jimothy suggests more practice.`;
    }

    function resetGame() {
      gameRunning = false;
      clearInterval(timerId);
      clearInterval(roundIntervalId);
      score = 0;
      timeLeft = 30;
      level = 1;
      scoreEl.textContent = score;
      timerEl.textContent = timeLeft;
      levelEl.textContent = level;
      messageEl.textContent = "Game reset. Jimothy is stretching.";
      createGrid();
    }

    startBtn.addEventListener("click", startGame);
    resetBtn.addEventListener("click", resetGame);

    // Initial setup
    createGrid();
  
