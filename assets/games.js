/* ---------------------------------------------------------
   Anti-theft check
--------------------------------------------------------- */
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";
}

/* ---------------------------------------------------------
   Element references
--------------------------------------------------------- */
const runner = document.getElementById("runner");
const cards = document.querySelectorAll(".card");
const surprise = document.getElementById("surprise");
const scoresList = document.getElementById("scores");

/* ---------------------------------------------------------
   Sound Effects
--------------------------------------------------------- */

// Tiny silent WAV placeholders (you can replace with real files)
const hoverSound = new Audio("/assets/sounds/hover.wav");
const clickSound = new Audio("/assets/sounds/click.wav");
const bootSound = new Audio("/assets/sounds/boot.wav");
const announcer = new Audio("/assets/sounds/announcer.wav");

// Volume tuning
hoverSound.volume = 0.4;
clickSound.volume = 0.5;
bootSound.volume = 0.6;
announcer.volume = 0.7;

/* ---------------------------------------------------------
   Boot-up sound (CRT power-on)
--------------------------------------------------------- */
window.addEventListener("load", () => {
  try {
    bootSound.currentTime = 0;
    bootSound.play();

    // Announcer plays after boot-up
    setTimeout(() => {
      announcer.currentTime = 0;
      announcer.play();
    }, 900);
  } catch (e) {
    console.warn("Audio playback blocked by browser:", e);
  }
});

/* ---------------------------------------------------------
   Runner movement + hover sound
--------------------------------------------------------- */
/*
cards.forEach(card => {
  card.addEventListener("mouseenter", () => {
    const rect = card.getBoundingClientRect();

    // Center runner above card
    runner.style.left = rect.left + rect.width / 2 + "px";
    runner.style.top = rect.top - 40 + "px";

    // Play hover sound
    hoverSound.currentTime = 0;
    hoverSound.play();
  });

  // Click sound
  card.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play();
  });
});
*/
/* ---------------------------------------------------------
   Runner movement + hover sound (with scroll offset + pulse)
--------------------------------------------------------- */
cards.forEach(card => {
  card.addEventListener("mouseenter", () => {
    const rect = card.getBoundingClientRect();

    // Center runner above card (with scroll offset)
    runner.style.left = rect.left + rect.width / 2 + window.scrollX + "px";
    runner.style.top = rect.top - 40 + window.scrollY + "px";

    // Trigger CRT pulse animation
    runner.classList.remove("pulse");
    void runner.offsetWidth; // Force reflow so animation restarts
    runner.classList.add("pulse");

    // Play hover sound
    hoverSound.currentTime = 0;
    hoverSound.play();
  });

  // Click sound
  card.addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play();
  });
});


/* ---------------------------------------------------------
   Surprise Me button
--------------------------------------------------------- */
surprise.addEventListener("click", () => {
  clickSound.currentTime = 0;
  clickSound.play();

  const randomCard = cards[Math.floor(Math.random() * cards.length)];
  window.location.href = randomCard.dataset.link;
});

/* ---------------------------------------------------------
   Leaderboard loading
--------------------------------------------------------- */
const savedScores = JSON.parse(localStorage.getItem("jimothyScores") || "[]");

savedScores.forEach(score => {
  const li = document.createElement("li");
  li.textContent = score;
  scoresList.appendChild(li);
});
