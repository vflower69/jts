    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreText = document.getElementById('scoreText');
    const highScoreText = document.getElementById('highScoreText');
    const finalScoreText = document.getElementById('finalScoreText');
    const startOverlay = document.getElementById('startOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    // Game Variables
    let isRunning = false;
    let score = 0;
    let highScore = localStorage.getItem('jimothy_highscore') || 0;
    highScoreText.textContent = highScore;

    let gameSpeed = 5;
    const gravity = 0.6;
    let frameCount = 0;

    // Raccoon (Jimothy) Object
    const jimothy = {
      x: 80,
      y: 0,
      width: 44,
      height: 38,
      velocityY: 0,
      jumpForce: -11,
      groundY: 320,
      jumpsLeft: 2,
      isGrounded: false,

      reset() {
        this.y = this.groundY;
        this.velocityY = 0;
        this.jumpsLeft = 2;
        this.isGrounded = true;
      },

      jump() {
        if (this.jumpsLeft > 0) {
          this.velocityY = this.jumpForce;
          this.jumpsLeft--;
          this.isGrounded = false;
        }
      },

      update() {
        this.velocityY += gravity;
        this.y += this.velocityY;

        if (this.y >= this.groundY) {
          this.y = this.groundY;
          this.velocityY = 0;
          this.isGrounded = true;
          this.jumpsLeft = 2;
        }
      },

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Body
        ctx.fillStyle = '#6272a4';
        ctx.beginPath();
        ctx.ellipse(22, 22, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#44475a';
        ctx.beginPath();
        ctx.moveTo(8, 10); ctx.lineTo(14, 0); ctx.lineTo(20, 10); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(28, 10); ctx.lineTo(34, 0); ctx.lineTo(40, 10); ctx.fill();

        // Raccoon Mask
        ctx.fillStyle = '#282a36';
        ctx.beginPath();
        ctx.ellipse(32, 18, 10, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(34, 17, 3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#f8f8f2';
        ctx.beginPath();
        ctx.arc(38, 22, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tail (Striped)
        ctx.fillStyle = '#44475a';
        ctx.beginPath();
        ctx.ellipse(2, 26, 12, 6, -0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8f8f2';
        ctx.fillRect(2, 24, 3, 5);
        ctx.fillRect(8, 22, 3, 6);

        ctx.restore();
      }
    };

    // Arrays for dynamic elements
    let obstacles = [];
    let collectibles = [];

    class Obstacle {
      constructor() {
        this.width = 30 + Math.random() * 15;
        this.height = 35 + Math.random() * 25;
        this.x = canvas.width + 20;
        this.y = jimothy.groundY + 38 - this.height;
      }

      update() {
        this.x -= gameSpeed;
      }

      draw() {
        // Recycling bin / obstacle look
        ctx.fillStyle = '#8be9fd';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = '#50fa7b';
        ctx.font = '12px sans-serif';
        ctx.fillText('♻', this.x + (this.width/2) - 5, this.y + (this.height/2) + 4);
      }
    }

    class Collectible {
      constructor() {
        this.x = canvas.width + 20;
        this.y = jimothy.groundY - 30 - Math.random() * 80;
        this.radius = 10;
        this.collected = false;
      }

      update() {
        this.x -= gameSpeed;
      }

      draw() {
        if (this.collected) return;
        ctx.fillStyle = '#ff79c6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#50fa7b';
        ctx.beginPath();
        ctx.arc(this.x + 2, this.y - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function spawnElements() {
      if (frameCount % Math.max(40, Math.floor(120 - gameSpeed * 5)) === 0) {
        if (Math.random() < 0.7) {
          obstacles.push(new Obstacle());
        }
      }

      if (frameCount % 90 === 0) {
        if (Math.random() < 0.6) {
          collectibles.push(new Collectible());
        }
      }
    }

    function checkCollisions() {
      // Check Obstacles
      for (let obs of obstacles) {
        if (
          jimothy.x < obs.x + obs.width &&
          jimothy.x + jimothy.width > obs.x &&
          jimothy.y < obs.y + obs.height &&
          jimothy.y + jimothy.height > obs.y
        ) {
          endGame();
        }
      }

      // Check Collectibles
      for (let item of collectibles) {
        if (!item.collected) {
          let dist = Math.hypot(
            (jimothy.x + jimothy.width/2) - item.x,
            (jimothy.y + jimothy.height/2) - item.y
          );
          if (dist < item.radius + 18) {
            item.collected = true;
            score += 50;
            scoreText.textContent = score;
          }
        }
      }
    }

    function drawGround() {
      ctx.fillStyle = '#44475a';
      ctx.fillRect(0, jimothy.groundY + 38, canvas.width, canvas.height - (jimothy.groundY + 38));

      ctx.strokeStyle = '#6272a4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, jimothy.groundY + 38);
      ctx.lineTo(canvas.width, jimothy.groundY + 38);
      ctx.stroke();
    }

    function gameLoop() {
      if (!isRunning) return;

      frameCount++;
      gameSpeed = 5 + Math.floor(score / 200) * 0.5;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawGround();

      jimothy.update();
      jimothy.draw();

      spawnElements();

      // Update & Draw Obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();
        if (obstacles[i].x + obstacles[i].width < 0) {
          obstacles.splice(i, 1);
          score += 10;
          scoreText.textContent = score;
        }
      }

      // Update & Draw Collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        collectibles[i].update();
        collectibles[i].draw();
        if (collectibles[i].x + collectibles[i].radius < 0) {
          collectibles.splice(i, 1);
        }
      }

      checkCollisions();

      requestAnimationFrame(gameLoop);
    }

    function startGame() {
      score = 0;
      gameSpeed = 5;
      frameCount = 0;
      obstacles = [];
      collectibles = [];
      scoreText.textContent = score;

      jimothy.reset();
      isRunning = true;

      startOverlay.classList.add('hidden');
      gameOverOverlay.classList.add('hidden');

      requestAnimationFrame(gameLoop);
    }

    function endGame() {
      isRunning = false;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('jimothy_highscore', highScore);
        highScoreText.textContent = highScore;
      }

      finalScoreText.textContent = `Score: ${score} | High Score: ${highScore}`;
      gameOverOverlay.classList.remove('hidden');
    }

    // Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (isRunning) {
          jimothy.jump();
        } else if (!startOverlay.classList.contains('hidden')) {
          startGame();
        } else if (!gameOverOverlay.classList.contains('hidden')) {
          startGame();
        }
      }
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Initial render
    drawGround();
    jimothy.reset();
    jimothy.draw();
  
