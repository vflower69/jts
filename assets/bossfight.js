// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
    const jimothy = document.getElementById("jimothy");
    const boss = document.getElementById("boss");
    const bossHP = document.getElementById("hpValue");

    let jimothyX = window.innerWidth / 2;
    let keys = {};

    // Position Jimothy initially
    updateJimothyPosition();

    // --- 1. Jimothy Movement Controls ---
    window.addEventListener("keydown", (e) => {
      keys[e.key] = true;

      // Shoot with Space or Up Arrow
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shootStar();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys[e.key] = false;
    });

    function updateJimothyPosition() {
      const speed = 8;
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        jimothyX = Math.max(50, jimothyX - speed);
      }
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        jimothyX = Math.min(window.innerWidth - 50, jimothyX + speed);
      }

      jimothy.style.left = jimothyX + "px";
      requestAnimationFrame(updateJimothyPosition);
    }

    // --- 2. Shooting Mechanism ---
    jimothy.addEventListener("click", shootStar);

    function shootStar() {
      const b = document.createElement("div");
      b.className = "blast";
      b.textContent = "✨";

      b.style.left = jimothyX + "px";
      b.style.top = jimothy.offsetTop + "px";

      document.body.appendChild(b);

      // Check collision with boss while blast is moving
      const checkHit = setInterval(() => {
        const blastRect = b.getBoundingClientRect();
        const bossRect = boss.getBoundingClientRect();

        if (
          blastRect.left < bossRect.right &&
          blastRect.right > bossRect.left &&
          blastRect.top < bossRect.bottom &&
          blastRect.bottom > bossRect.top
        ) {
          clearInterval(checkHit);
          b.remove();
          takeDamage();
        }
      }, 30);

      setTimeout(() => {
        clearInterval(checkHit);
        b.remove();
      }, 800);
    }

    function takeDamage() {
      let currentHP = parseInt(bossHP.textContent, 10) - 1;
      bossHP.textContent = currentHP;

      // Visual flinch effect for boss
      boss.style.transform = "translateX(-50%) scale(0.85)";
      setTimeout(() => boss.style.transform = "translateX(-50%) scale(1)", 100);

      if (currentHP <= 0) {
        setTimeout(() => {
          alert("Jimothy defeated the Mega Trash Titan!");

          const scores = JSON.parse(localStorage.getItem("jimothyScores") || "[]");
          scores.push("Boss defeated at " + new Date().toLocaleString());
          localStorage.setItem("jimothyScores", JSON.stringify(scores));

          window.location.href = "../games.html";
        }, 100);
      }
    }

    // --- 3. Boss Random Horizontal Movement ---
    function moveBossRandomly() {
      const padding = 100;
      const minX = padding;
      const maxX = window.innerWidth - padding;
      const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

      boss.style.left = randomX + "px";

      // Pick a random interval between 400ms and 1200ms for unpredictability
      const randomDelay = Math.floor(Math.random() * 800) + 400;
      setTimeout(moveBossRandomly, randomDelay);
    }

    moveBossRandomly();
