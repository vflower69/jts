    // hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

    // Below are the codes for the game
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // UI elements
        const overlay = document.getElementById('overlay');
        const overlayTitle = document.getElementById('overlay-title');
        const overlayDesc = document.getElementById('overlay-desc');
        const startBtn = document.getElementById('start-btn');
        const scoreDisplay = document.getElementById('score-display');
        const roundDisplay = document.getElementById('round-display');
        const highScoreDisplay = document.getElementById('high-score-display');
        const statusMessage = document.getElementById('status-message');
        const timerContainer = document.getElementById('timer-bar-container');
        const timerBar = document.getElementById('timer-bar');

        // Game State Variables
        let gameState = 'START'; // START, PEEK, SHUFFLING, PICK, RESULT, GAMEOVER
        let score = 0;
        let round = 1;
        let highScore = localStorage.getItem('jimothy_high_score') || 0;
        highScoreDisplay.textContent = `High Score: ${highScore}`;

        let rocks = [];
        let clamIndex = 0;
        let shuffleStartTime = 0;
        const SHUFFLE_DURATION = 15000; // 15 seconds
        let shuffleSwaps = [];
        let jimothyState = 'IDLE'; // IDLE, HAPPY, PINCHED
        let selectedRock = null;

        // Rock Class
        class Rock {
            constructor(id, x, y, hasClam) {
                this.id = id;
                this.x = x;
                this.y = y;
                this.targetX = x;
                this.targetY = y;
                this.radiusX = 45;
                this.radiusY = 30;
                this.hasClam = hasClam; // true = clam, false = crab
                this.liftAmount = 0; // 0 (down) to 1 (fully raised)
                this.targetLift = 0;
            }

            update() {
                // Smooth position animation
                this.x += (this.targetX - this.x) * 0.2;
                this.y += (this.targetY - this.y) * 0.2;

                // Smooth lift animation
                this.liftAmount += (this.targetLift - this.liftAmount) * 0.15;
            }

            draw() {
                const curY = this.y - this.liftAmount * 60;

                // Draw hidden content underneath first
                if (this.liftAmount > 0.05) {
                    if (this.hasClam) {
                        drawClam(this.x, this.y + 5);
                    } else {
                        drawCrab(this.x, this.y + 5);
                    }
                }

                // Draw Rock Shadow
                ctx.beginPath();
                ctx.ellipse(this.x, this.y + 15, this.radiusX * 0.9, this.radiusY * 0.5, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fill();

                // Draw Rock Base Body
                ctx.beginPath();
                ctx.ellipse(this.x, curY, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
                const grad = ctx.createLinearGradient(this.x - 20, curY - 20, this.x + 20, curY + 20);
                grad.addColorStop(0, '#a6a6a6');
                grad.addColorStop(0.7, '#737373');
                grad.addColorStop(1, '#4d4d4d');
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#333333';
                ctx.stroke();

                // Rock texture highlights
                ctx.beginPath();
                ctx.ellipse(this.x - 12, curY - 10, 12, 6, -Math.PI / 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fill();
            }

            containsPoint(px, py) {
                const dx = px - this.x;
                const dy = py - (this.y - this.liftAmount * 60);
                return (dx * dx) / (this.radiusX * this.radiusX) + (dy * dy) / (this.radiusY * this.radiusY) <= 1;
            }
        }

        // Draw Jimothy the Raccoon
        function drawJimothy(x, y, state) {
            ctx.save();
            ctx.translate(x, y);

            // 1. Short bushy ringed tail
            ctx.save();
            ctx.rotate(-0.4);
            ctx.beginPath();
            ctx.ellipse(-75, 25, 22, 12, 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#5a5a5a';
            ctx.fill();
            ctx.strokeStyle = '#2b2b2b';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Tail Rings
            ctx.fillStyle = '#2b2b2b';
            ctx.fillRect(-85, 18, 8, 14);
            ctx.fillRect(-70, 20, 8, 14);
            ctx.restore();

            // 2. Long limbs (Hind legs)
            ctx.fillStyle = '#3a3a3a';
            ctx.beginPath();
            ctx.ellipse(-35, 65, 12, 28, 0.3, 0, Math.PI * 2);
            ctx.fill();

            // 3. Round Body & Arched Back
            ctx.beginPath();
            ctx.ellipse(0, 20, 55, 48, -0.15, 0, Math.PI * 2);
            const bodyGrad = ctx.createRadialGradient(-10, 10, 10, 0, 20, 60);
            bodyGrad.addColorStop(0, '#999999');
            bodyGrad.addColorStop(0.8, '#666666');
            bodyGrad.addColorStop(1, '#444444');
            ctx.fillStyle = bodyGrad;
            ctx.fill();
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 3.5;
            ctx.stroke();

            // Cute Light Tummy
            ctx.beginPath();
            ctx.ellipse(15, 28, 30, 28, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#e6e6e6';
            ctx.fill();

            // 4. Long limbs (Front arms)
            if (state === 'HAPPY') {
                // Arms raised celebrating
                ctx.beginPath();
                ctx.ellipse(25, -20, 9, 32, -0.6, 0, Math.PI * 2);
                ctx.ellipse(50, -10, 9, 30, 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#3a3a3a';
                ctx.fill();
            } else if (state === 'PINCHED') {
                // Arms reacting to pinch
                ctx.beginPath();
                ctx.ellipse(35, 15, 9, 28, -1.2, 0, Math.PI * 2);
                ctx.fillStyle = '#3a3a3a';
                ctx.fill();
            } else {
                // Arms resting forward
                ctx.beginPath();
                ctx.ellipse(38, 45, 9, 30, 0.8, 0, Math.PI * 2);
                ctx.fillStyle = '#3a3a3a';
                ctx.fill();
            }

            // 5. Head (Narrow triangular face)
            ctx.save();
            ctx.translate(25, -25);

            // Ears
            ctx.beginPath();
            ctx.ellipse(-18, -35, 12, 18, -0.3, 0, Math.PI * 2);
            ctx.ellipse(12, -37, 12, 18, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#444';
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-18, -35, 6, 10, -0.3, 0, Math.PI * 2);
            ctx.ellipse(12, -37, 6, 10, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcccc';
            ctx.fill();

            // Head Base Structure (Triangular tapering down to snout)
            ctx.beginPath();
            ctx.moveTo(-35, -20);
            ctx.quadraticCurveTo(0, -45, 35, -20);
            ctx.quadraticCurveTo(25, 20, 0, 32); // Narrow triangular snout point
            ctx.quadraticCurveTo(-25, 20, -35, -20);
            ctx.fillStyle = '#777777';
            ctx.fill();
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 3;
            ctx.stroke();

            // White Face Fur Cheeks
            ctx.beginPath();
            ctx.moveTo(-32, -5);
            ctx.quadraticCurveTo(0, 5, 32, -5);
            ctx.quadraticCurveTo(20, 25, 0, 31);
            ctx.quadraticCurveTo(-20, 25, -32, -5);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Iconic Dark Mask around eyes
            ctx.beginPath();
            ctx.ellipse(-15, -6, 14, 10, 0.2, 0, Math.PI * 2);
            ctx.ellipse(15, -6, 14, 10, -0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#222222';
            ctx.fill();

            // Nose
            ctx.beginPath();
            ctx.ellipse(0, 24, 7, 5, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#111111';
            ctx.fill();

            // Eyes
            if (state === 'PINCHED') {
                // X X eyes
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                // Left X
                ctx.beginPath(); ctx.moveTo(-20, -11); ctx.lineTo(-10, -1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-10, -11); ctx.lineTo(-20, -1); ctx.stroke();
                // Right X
                ctx.beginPath(); ctx.moveTo(10, -11); ctx.lineTo(20, -1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(20, -11); ctx.lineTo(10, -1); ctx.stroke();
            } else if (state === 'HAPPY') {
                // Happy ^ ^ eyes
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3.5;
                ctx.beginPath(); ctx.arc(-15, -4, 7, Math.PI, 0); ctx.stroke();
                ctx.beginPath(); ctx.arc(15, -4, 7, Math.PI, 0); ctx.stroke();
            } else {
                // Cute Big Shiny Eyes
                ctx.beginPath();
                ctx.arc(-15, -6, 6.5, 0, Math.PI * 2);
                ctx.arc(15, -6, 6.5, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();

                // Eye Highlights
                ctx.beginPath();
                ctx.arc(-17, -8, 2.5, 0, Math.PI * 2);
                ctx.arc(13, -8, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }

            ctx.restore();
            ctx.restore();
        }

        // Draw Clam
        function drawClam(x, y) {
            ctx.save();
            ctx.translate(x, y);

            // Shell Base
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ffb6c1';
            ctx.fill();
            ctx.strokeStyle = '#c71585';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Shell ridges
            ctx.beginPath();
            ctx.moveTo(-12, -2); ctx.lineTo(0, 10);
            ctx.moveTo(-5, -6); ctx.lineTo(0, 10);
            ctx.moveTo(5, -6); ctx.lineTo(0, 10);
            ctx.moveTo(12, -2); ctx.lineTo(0, 10);
            ctx.strokeStyle = 'rgba(199, 21, 133, 0.5)';
            ctx.stroke();

            // Shiny Pearl inside
            ctx.beginPath();
            ctx.arc(0, -2, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#e6e6fa';
            ctx.stroke();

            ctx.restore();
        }

        // Draw Crab
        function drawCrab(x, y) {
            ctx.save();
            ctx.translate(x, y);

            // Crab Legs
            ctx.strokeStyle = '#cc1100';
            ctx.lineWidth = 3;
            for (let i = -1; i <= 1; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * 10, 0); ctx.lineTo(i * 22, -6); ctx.lineTo(i * 26, 8);
                ctx.moveTo(i * 10, 4); ctx.lineTo(i * 24, 6); ctx.lineTo(i * 28, 18);
                ctx.stroke();
            }

            // Body
            ctx.beginPath();
            ctx.ellipse(0, 2, 16, 12, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#e62e00';
            ctx.fill();
            ctx.strokeStyle = '#990000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Claws/Pinchers
            ctx.beginPath();
            ctx.arc(-18, -12, 8, 0, Math.PI * 2);
            ctx.arc(18, -12, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4d4d';
            ctx.fill();
            ctx.stroke();

            // Eyes
            ctx.beginPath();
            ctx.arc(-6, -10, 3, 0, Math.PI * 2);
            ctx.arc(6, -10, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();

            ctx.restore();
        }

        // Init Round Setup
        function initRound() {
            // Round 1: 3 rocks (1 clam, 2 crabs)
            // Round N: 1 clam + (1 + N) crabs = (2 + N) total rocks
            const totalRocks = 2 + round;
            rocks = [];

            // Calculate layout positions in horizontal row(s)
            const startY = 460;
            const spacing = Math.min(130, 800 / totalRocks);
            const startX = 450 - ((totalRocks - 1) * spacing) / 2;

            clamIndex = Math.floor(Math.random() * totalRocks);

            for (let i = 0; i < totalRocks; i++) {
                const posX = startX + i * spacing;
                const rock = new Rock(i, posX, startY, i === clamIndex);
                rocks.push(rock);
            }

            // Start Peek Phase
            gameState = 'PEEK';
            statusMessage.textContent = "Memorize where the Clam is!";
            timerContainer.style.display = 'none';
            jimothyState = 'IDLE';

            // Lift all rocks to show contents
            rocks.forEach(r => r.targetLift = 1);

            setTimeout(() => {
                // Lower rocks before shuffling
                rocks.forEach(r => r.targetLift = 0);
                setTimeout(() => {
                    startShufflePhase();
                }, 800);
            }, 2500);
        }

        function startShufflePhase() {
            gameState = 'SHUFFLING';
            statusMessage.textContent = "Shuffling! Keep your eye on the clam!";
            timerContainer.style.display = 'block';
            shuffleStartTime = Date.now();
            triggerNextSwap();
        }

        function triggerNextSwap() {
            if (gameState !== 'SHUFFLING') return;

            const elapsed = Date.now() - shuffleStartTime;
            if (elapsed >= SHUFFLE_DURATION) {
                // Shuffle complete!
                gameState = 'PICK';
                statusMessage.textContent = "Which rock is hiding the Clam?";
                timerContainer.style.display = 'none';
                return;
            }

            // Pick two random distinct rocks to swap target positions
            const idx1 = Math.floor(Math.random() * rocks.length);
            let idx2 = Math.floor(Math.random() * rocks.length);
            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * rocks.length);
            }

            // Swap target X coordinates
            const tempX = rocks[idx1].targetX;
            rocks[idx1].targetX = rocks[idx2].targetX;
            rocks[idx2].targetX = tempX;

            // Fast swap interval based on round intensity
            const swapDelay = Math.max(180, 380 - round * 20);
            setTimeout(triggerNextSwap, swapDelay);
        }

        function handleRockClick(rock) {
            if (gameState !== 'PICK') return;

            gameState = 'RESULT';
            selectedRock = rock;
            rock.targetLift = 1;

            if (rock.hasClam) {
                // Correct!
                jimothyState = 'HAPPY';
                score++;
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('jimothy_high_score', highScore);
                    highScoreDisplay.textContent = `High Score: ${highScore}`;
                }
                scoreDisplay.textContent = `Score: ${score}`;
                statusMessage.textContent = "Yum! Jimothy gets to eat the clam! 🦪";

                setTimeout(() => {
                    round++;
                    roundDisplay.textContent = `Round ${round}`;
                    initRound();
                }, 2500);
            } else {
                // Pinched! Game Over
                jimothyState = 'PINCHED';
                statusMessage.textContent = "Ouch! Jimothy got pinched by a crab! 🦀";

                setTimeout(() => {
                    // Reveal all rocks
                    rocks.forEach(r => r.targetLift = 1);
                }, 500);

                setTimeout(() => {
                    endGame();
                }, 3000);
            }
        }

        function startGame() {
            overlay.style.display = 'none';
            score = 0;
            round = 1;
            scoreDisplay.textContent = `Score: ${score}`;
            roundDisplay.textContent = `Round ${round}`;
            initRound();
        }

        function endGame() {
            gameState = 'GAMEOVER';
            overlayTitle.textContent = "Game Over!";
            overlayDesc.innerHTML = `Jimothy's clam hunt ended.<br><br><b>Final Score:</b> ${score}<br><b>High Score:</b> ${highScore}`;
            startBtn.textContent = "Play Again";
            overlay.style.display = 'flex';
        }

        // Canvas Interaction
        canvas.addEventListener('click', (e) => {
            if (gameState !== 'PICK') return;

            const rect = canvas.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
            const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

            for (let rock of rocks) {
                if (rock.containsPoint(clickX, clickY)) {
                    handleRockClick(rock);
                    break;
                }
            }
        });

        // Main Render Loop
        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update & Draw Timer Bar in Shuffling phase
            if (gameState === 'SHUFFLING') {
                const elapsed = Date.now() - shuffleStartTime;
                const remaining = Math.max(0, 1 - elapsed / SHUFFLE_DURATION);
                timerBar.style.width = `${remaining * 100}%`;
            }

            // Draw Jimothy at the top center
            drawJimothy(450, 180, jimothyState);

            // Update & Draw Rocks
            rocks.forEach(rock => {
                rock.update();
                rock.draw();
            });

            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    
