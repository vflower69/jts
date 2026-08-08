 <script>
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}
  </script>
  <script>
    const runner = document.getElementById("runner");
    const cards = document.querySelectorAll(".card");
    const surprise = document.getElementById("surprise");
    const scoresList = document.getElementById("scores");

    const hoverSound = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    const announcer = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");

    // Play announcer once on load
    announcer.play();

    // Jimothy runs to hovered card + sound
    cards.forEach(card => {
      card.addEventListener("mouseenter", () => {
        const rect = card.getBoundingClientRect();
        runner.style.left = rect.left + rect.width / 2 + "px";
        runner.style.top = rect.top - 40 + "px";
        hoverSound.currentTime = 0;
        hoverSound.play();
      });
    });

    // Surprise Me button
    surprise.addEventListener("click", () => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      window.location.href = randomCard.dataset.link;
    });

    // Load leaderboard from localStorage (used by bossfight, etc.)
    const savedScores = JSON.parse(localStorage.getItem("jimothyScores") || "[]");
    savedScores.forEach(score => {
      const li = document.createElement("li");
      li.textContent = score;
      scoresList.appendChild(li);
    });
  </script>
