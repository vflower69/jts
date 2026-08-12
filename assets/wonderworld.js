    // Navigation Tabs
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.left-section .view-pane').forEach(pane => pane.classList.remove('active'));
      
      event.currentTarget.classList.add('active');
      document.getElementById(`${tabId}-view`).classList.add('active');
    }

    // Pet Selection
    let activePet = '🐶';
    function selectPet(emoji, el) {
      document.querySelectorAll('.pet-card').forEach(card => card.classList.remove('selected'));
      el.classList.add('selected');
      activePet = emoji;
    }

    /* --- GAME LOGIC --- */
    let canvas, ctx;
    let isPlaying = false;
    let stars = 0;
    let items = [];
    let player = { x: 150, y: 360, width: 60, height: 60 };

    function initCanvas() {
      canvas = document.getElementById('gameCanvas');
      ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;

      player.y = canvas.height - 70;

      // Mouse / Touch Controls
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.x = e.clientX - rect.left - player.width / 2;
      });

      canvas.addEventListener('touchmove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.x = e.touches[0].clientX - rect.left - player.width / 2;
      });
    }

    function startGame() {
      document.getElementById('startOverlay').style.display = 'none';
      if (!canvas) initCanvas();

      isPlaying = true;
      items = [];
      stars = 0;
      document.getElementById('starCount').innerText = stars;
      gameLoop();
    }

    function gameLoop() {
      if (!isPlaying) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Pet
      ctx.font = '50px sans-serif';
      ctx.fillText(activePet, player.x, player.y + 45);

      // Spawn Falling Items
      if (Math.random() < 0.05) {
        const isGood = Math.random() > 0.25;
        items.push({
          x: Math.random() * (canvas.width - 40),
          y: -40,
          speed: 2 + Math.random() * 3,
          emoji: isGood ? (Math.random() > 0.5 ? '⭐' : '🎈') : '☁️',
          isGood: isGood
        });
      }

      // Update and Draw Items
      for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.y += item.speed;

        ctx.font = '32px sans-serif';
        ctx.fillText(item.emoji, item.x, item.y);

        // Catch Collision Detection
        if (
          item.y >= player.y - 10 &&
          item.y <= player.y + player.height &&
          item.x >= player.x - 20 &&
          item.x <= player.x + player.width
        ) {
          if (item.isGood) {
            stars += 10;
            document.getElementById('starCount').innerText = stars;
          } else {
            stars = Math.max(0, stars - 5);
            document.getElementById('starCount').innerText = stars;
          }
          items.splice(i, 1);
          continue;
        }

        // Remove offscreen
        if (item.y > canvas.height + 40) {
          items.splice(i, 1);
        }
      }

      requestAnimationFrame(gameLoop);
    }

    window.addEventListener('resize', () => {
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        player.y = canvas.height - 70;
      }
    });
