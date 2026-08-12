/*
Key Game Features & Design Architecture
Aesthetic Glassmorphism UI: Built with modern CSS design tokens, soft pastel gradients, responsive grid layouts, and micro-interactions tuned for high engagement.
Interactive Dressing & Glam Studio: Layered SVG character system allowing instant preview of hairstyles, Y2K/Academia outfits, accessories, and customizable makeup shades.
Campus Style Rush Mini-Game: Built-in HTML5 Canvas game with real-time collision detection, reward currency drops (Gems), and interactive cursor controls.
Campus Life Mood Board: Interactive workspace for daily goals and study beats.
*/
// Game Data & Assets
    const wardrobeData = {
      hair: [
        { id: 'h1', name: 'Pastel Waves', icon: '💇‍♀️', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M68 60 C50 20, 150 20, 132 60 C150 100, 140 160, 135 180 C125 150, 130 90, 125 70 C100 40, 75 70, 75 70 C70 100, 75 150, 65 180 C60 160, 50 100, 68 60 Z" fill="#ec4899"/></svg>' },
        { id: 'h2', name: 'Cute Space Buns', icon: '👩‍🎤', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><circle cx="68" cy="40" r="18" fill="#8b5cf6"/><circle cx="132" cy="40" r="18" fill="#8b5cf6"/><path d="M70 50 Q100 35 130 50 Q100 65 70 50" fill="#8b5cf6"/></svg>' },
        { id: 'h3', name: 'Sleek Bob', icon: '💁‍♀️', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M68 50 Q100 30 132 50 L138 105 Q125 110 120 95 L120 70 Q100 50 80 70 L80 95 Q75 110 62 105 Z" fill="#1e293b"/></svg>' }
      ],
      outfit: [
        { id: 'o1', name: 'Y2K Prep Set', icon: '👗', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M82 118 L118 118 L125 150 L75 150 Z" fill="#f43f5e"/><path d="M72 152 L128 152 L135 195 L65 195 Z" fill="#3b82f6"/></svg>' },
        { id: 'o2', name: 'Academia Blazer', icon: '🧥', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M75 118 L125 118 L130 185 L70 185 Z" fill="#78350f"/><path d="M92 118 L100 140 L108 118 Z" fill="#ffffff"/></svg>' },
        { id: 'o3', name: 'Streetwear Hoodie', icon: '👚', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M70 115 Q100 105 130 115 L135 185 L65 185 Z" fill="#10b981"/></svg>' }
      ],
      acc: [
        { id: 'a1', name: 'Star Clip', icon: '⭐', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><polygon points="125,42 128,50 136,50 130,55 132,63 125,58 118,63 120,55 114,50 122,50" fill="#f59e0b"/></svg>' },
        { id: 'a2', name: 'Cat Headphones', icon: '🎧', svg: '<svg viewBox="0 0 200 300" width="200" height="300"><path d="M65 65 Q100 30 135 65" stroke="#ec4899" stroke-width="6" fill="none"/><rect x="58" y="60" width="12" height="24" rx="4" fill="#ec4899"/><rect x="130" y="60" width="12" height="24" rx="4" fill="#ec4899"/></svg>' }
      ],
      makeup: [
        { id: 'm1', name: 'Gloss Lip', icon: '💄', color: '#f43f5e' },
        { id: 'm2', name: 'Soft Coral', icon: '💋', color: '#fb923c' },
        { id: 'm3', name: 'Berry Plum', icon: '✨', color: '#a855f7' }
      ]
    };

    let activeCategory = 'hair';
    let currentStyle = { hair: null, outfit: null, acc: null, makeup: null };

    // Navigation Switcher
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.view-pane').forEach(pane => pane.classList.remove('active'));

      event.currentTarget.classList.add('active');
      document.getElementById(`${tabId}-view`).classList.add('active');

      if (tabId === 'minigame') {
        initGameCanvas();
      }
    }

    // Wardrobe Category Filter
    function filterCategory(cat, element) {
      document.querySelectorAll('.cat-chip').forEach(chip => chip.classList.remove('active'));
      element.classList.add('active');
      activeCategory = cat;
      renderOptions();
    }

    // Render Customization Options Grid
    function renderOptions() {
      const grid = document.getElementById('optionsGrid');
      grid.innerHTML = '';

      const items = wardrobeData[activeCategory] || [];
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = `item-card ${currentStyle[activeCategory] === item.id ? 'selected' : ''}`;
        card.onclick = () => selectItem(activeCategory, item);
        
        card.innerHTML = `
          <div class="item-preview">${item.icon}</div>
          <div class="item-name">${item.name}</div>
        `;
        grid.appendChild(card);
      });
    }

    // Select and Apply Item to Character
    function selectItem(category, item) {
      currentStyle[category] = item.id;
      
      if (category === 'makeup') {
        document.getElementById('avatar-lips').setAttribute('fill', item.color);
      } else {
        const layer = document.getElementById(`layer-${category}`);
        layer.innerHTML = item.svg || '';
      }

      renderOptions();
    }

    /* --- MINI-GAME LOGIC (Canvas Style Rush) --- */
    let canvas, ctx;
    let gameLoopReq;
    let score = 0;
    let isPlaying = false;
    let player = { x: 150, y: 380, width: 60, height: 20 };
    let items = [];

    function initGameCanvas() {
      canvas = document.getElementById('gameCanvas');
      ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;

      // Mouse / Touch Move Control
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        player.x = e.clientX - rect.left - player.width / 2;
      });
    }

    function startGame() {
      document.getElementById('gameOverlay').style.display = 'none';
      score = 0;
      document.getElementById('gameScore').innerText = score;
      items = [];
      isPlaying = true;
      gameLoop();
    }

    function gameLoop() {
      if (!isPlaying) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Player Paddle
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.width, player.height, 10);
      ctx.fill();

      // Spawn Falling Items
      if (Math.random() < 0.04) {
        items.push({
          x: Math.random() * (canvas.width - 30),
          y: -30,
          speed: 2 + Math.random() * 3,
          type: Math.random() > 0.3 ? 'good' : 'bad',
          emoji: Math.random() > 0.3 ? '💎' : '📚'
        });
      }

      // Update & Draw Items
      for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i];
        it.y += it.speed;

        ctx.font = '24px sans-serif';
        ctx.fillText(it.emoji, it.x, it.y);

        // Collision Check
        if (
          it.y >= player.y - 10 &&
          it.y <= player.y + player.height &&
          it.x >= player.x - 10 &&
          it.x <= player.x + player.width
        ) {
          if (it.type === 'good') {
            score += 10;
            document.getElementById('gemCount').innerText = parseInt(document.getElementById('gemCount').innerText) + 5;
          } else {
            score = Math.max(0, score - 15);
          }
          document.getElementById('gameScore').innerText = score;
          items.splice(i, 1);
          continue;
        }

        // Remove Offscreen
        if (it.y > canvas.height + 40) {
          items.splice(i, 1);
        }
      }

      gameLoopReq = requestAnimationFrame(gameLoop);
    }

    // Initialize Initial View
    renderOptions();
