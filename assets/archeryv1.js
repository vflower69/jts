/*
Here is a complete, single-file HTML5 commercial-grade 3D archery game - V1. 
It features a realistic 3D perspective via Three.js, wind mechanics, a scoring ring target, smooth arrow physics, 
particle explosions upon hitting the bullseye, and full support for both keyboard/mouse and touch screens (drag to aim, release to shoot).

Game Features Included:
1. Interactive Aim & Power Control: Click/Tap and drag anywhere on screen to pull back the bowstring, 
manage tension via the power gauge, and align your crosshairs.
2. Dynamic Environmental Wind: A shifting crosswind metric changes each round, requiring you to compensate your aim horizontally.
3. Immersive Web Audio Synthesizer: Features dynamic bow-stretching tension tones, crisp arrow-release snaps, 
and acoustic target-impact thuds with high-pitch chimes for bullseyes.
4. Particle Effects: Golden particle explosions burst when you strike dead-center in the 10-ring.
5. Responsive Cross-Platform Controls: Fully optimized for desktop browsers (mouse drag) and mobile/tablet devices (touch drag).
*/
// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
        // --- Game Configuration & State ---
        let scene, camera, renderer, targetMesh, targetGroup;
        let arrows = [], activeArrow = null;
        let score = 0, arrowsLeft = 5, totalScore = 0;
        let windSpeed = 0, windAngle = 0;
        let isAiming = false, power = 0, maxPower = 1.0, powerChargeSpeed = 1.5;
        let gameActive = false;

        // Aiming Control vectors
        let pointerStart = { x: 0, y: 0 };
        let aimOffset = { x: 0, y: 0 };
        const maxAimOffset = 150; // pixels max pull back/sway

        // --- Audio Synthesizer (Web Audio API) ---
        class SoundEngine {
            constructor() {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            playDraw() {
                if (this.ctx.state === 'suspended') this.ctx.resume();
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.4);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.4);
            }
            playRelease() {
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.15);
            }
            playHit(bullseye = false) {
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                osc.type = bullseye ? 'sine' : 'square';
                let startFreq = bullseye ? 800 : 250;
                osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.3);
            }
        }
        const sound = new SoundEngine();

        // --- Initialize Three.js Environment ---
        function initScene() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb); // Sky blue
            scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 2, 10);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const sunLight = new THREE.DirectionalLight(0xfffaed, 0.8);
            sunLight.position.set(20, 40, 20);
            sunLight.castShadow = true;
            scene.add(sunLight);

            // Environment / Ground
            const groundGeo = new THREE.PlaneGeometry(200, 200);
            const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b7a57, roughness: 0.9 });
            const ground = new THREE.Mesh(groundGeo, groundMat);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            // Create Archery Target at distance (Z = -60)
            createTarget(0, 2, -60);

            window.addEventListener('resize', onWindowResize);
            setupControls();
        }

        // --- Target Building ---
        function createTarget(x, y, z) {
            targetGroup = new THREE.Group();
            targetGroup.position.set(x, y, z);

            // Stand Poles
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
            const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), poleMat);
            leftPole.position.set(-1.2, -2.5, 0); leftPole.castShadow = true;
            const rightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), poleMat);
            rightPole.position.set(1.2, -2.5, 0); rightPole.castShadow = true;
            targetGroup.add(leftPole, rightPole);

            // Target Face (Concentric Rings: Gold, Red, Blue, Black, White)
            const ringColors = [0xffffff, 0x111111, 0x1e90ff, 0xff3333, 0xffcc00];
            const ringRadii = [2.0, 1.6, 1.2, 0.8, 0.4];

            ringRadii.forEach((radius, index) => {
                const geo = new THREE.CircleGeometry(radius, 32);
                const mat = new THREE.MeshStandardMaterial({ color: ringColors[index], side: THREE.DoubleSide });
                const ring = new THREE.Mesh(geo, mat);
                ring.position.z = index * 0.01; // prevent z-fighting
                targetGroup.add(ring);
            });

            scene.add(targetGroup);
        }

        // --- Arrow Class ---
        class Arrow {
            constructor(startX, startY, startZ, velocityX, velocityY, velocityZ) {
                this.mesh = this.createArrowMesh();
                this.mesh.position.set(startX, startY, startZ);
                scene.add(this.mesh);

                this.velocity = new THREE.Vector3(velocityX, velocityY, velocityZ);
                this.active = true;
                this.gravity = -9.8;
            }

            createArrowMesh() {
                const group = new THREE.Group();
                // Shaft
                const shaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8);
                shaftGeo.rotateX(Math.PI / 2);
                const shaftMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });
                const shaft = new THREE.Mesh(shaftGeo, shaftMat);
                group.add(shaft);

                // Tip
                const tipGeo = new THREE.ConeGeometry(0.04, 0.2, 8);
                tipGeo.rotateX(Math.PI / 2);
                const tipMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
                const tip = new THREE.Mesh(tipGeo, tipMat);
                tip.position.z = 0.95;
                group.add(tip);
                return group;
            }

            update(delta) {
                if (!this.active) return;

                // Apply wind force on X and Z
                this.velocity.x += windSpeed * 0.02 * delta * 60;

                // Apply gravity
                this.velocity.y += this.gravity * delta;

                // Move arrow position
                this.mesh.position.addScaledVector(this.velocity, delta);

                // Align arrow rotation with flight trajectory
                const direction = this.velocity.clone().normalize();
                const matrix = new THREE.Matrix4();
                matrix.lookAt(this.mesh.position, this.mesh.position.clone().add(direction), camera.up);
                this.mesh.quaternion.setFromRotationMatrix(matrix);

                // Check collision with target plane (Z = -60)
                if (this.mesh.position.z <= targetGroup.position.z) {
                    this.active = false;
                    checkHit(this.mesh.position);
                }

                // Despawn if out of bounds
                if (this.mesh.position.y < -5 || this.mesh.position.z < -80) {
                    this.active = false;
                    scene.remove(this.mesh);
                }
            }
        }

        // --- Scoring & Hit Detection ---
        function checkHit(pos) {
            const dx = pos.x - targetGroup.position.x;
            const dy = pos.y - targetGroup.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let points = 0;
            let isBullseye = false;

            if (distance <= 0.4) { points = 10; isBullseye = true; }
            else if (distance <= 0.8) { points = 8; }
            else if (distance <= 1.2) { points = 6; }
            else if (distance <= 1.6) { points = 4; }
            else if (distance <= 2.0) { points = 2; }
            else { points = 0; }

            score += points;
            totalScore += points;
            document.getElementById('score-display').innerText = `SCORE: ${totalScore}`;

            sound.playHit(isBullseye);
            if (isBullseye) createBullseyeParticles(pos);

            // Next round or end game
            arrowsLeft--;
            document.getElementById('arrows-display').innerText = `ARROWS: ${arrowsLeft}`;

            setTimeout(() => {
                if (arrowsLeft > 0) {
                    resetRound();
                } else {
                    endGame();
                }
            }, 1200);
        }

        // --- Particle FX for Bullseye ---
        function createBullseyeParticles(pos) {
            const particleCount = 30;
            const geo = new THREE.BufferGeometry();
            const positions = [];
            const velocities = [];

            for (let i = 0; i < particleCount; i++) {
                positions.push(pos.x, pos.y, pos.z);
                velocities.push(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 5
                );
            }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0xffcc00, size: 0.15 });
            const particleSystem = new THREE.Points(geo, mat);
            scene.add(particleSystem);

            let time = 0;
            const animateParticles = () => {
                time += 0.03;
                const posArr = particleSystem.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    posArr[i * 3] += velocities[i * 3] * 0.03;
                    posArr[i * 3 + 1] += velocities[i * 3 + 1] * 0.03 - 0.05; // gravity
                    posArr[i * 3 + 2] += velocities[i * 3 + 2] * 0.03;
                }
                particleSystem.geometry.attributes.position.needsUpdate = true;
                if (time < 1.0) {
                    requestAnimationFrame(animateParticles);
                } else {
                    scene.remove(particleSystem);
                }
            };
            animateParticles();
        }

        // --- Control Handling (Mouse & Touch) ---
        function setupControls() {
            const startAction = (x, y) => {
                if (!gameActive) return;
                isAiming = true;
                pointerStart.x = x;
                pointerStart.y = y;
                aimOffset.x = 0;
                aimOffset.y = 0;
                power = 0.2;
                document.getElementById('power-container').style.display = 'block';
                sound.playDraw();
            };

            const moveAction = (x, y) => {
                if (!isAiming) return;
                aimOffset.x = (x - pointerStart.x);
                aimOffset.y = (y - pointerStart.y);

                // Clamp crosshair sway
                aimOffset.x = Math.max(-maxAimOffset, Math.min(maxAimOffset, aimOffset.x));
                aimOffset.y = Math.max(-maxAimOffset, Math.min(maxAimOffset, aimOffset.y));

                const ch = document.getElementById('crosshair');
                ch.style.transform = `translate(calc(-50% + ${aimOffset.x}px), calc(-50% + ${aimOffset.y}px))`;

                // Power builds up over time or pull distance
                power = Math.min(maxPower, power + 0.015);
                document.getElementById('power-bar').style.width = (power * 100) + '%';
            };

            const endAction = () => {
                if (!isAiming) return;
                isAiming = false;
                document.getElementById('power-container').style.display = 'none';
                document.getElementById('crosshair').style.transform = 'translate(-50%, -50%)';

                shootArrow();
            };

            // Mouse Events
            window.addEventListener('mousedown', (e) => startAction(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => moveAction(e.clientX, e.clientY));
            window.addEventListener('mouseup', endAction);

            // Touch Events
            window.addEventListener('touchstart', (e) => {
                if (e.touches.length > 0) startAction(e.touches[0].clientX, e.touches[0].clientY);
            });
            window.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) moveAction(e.touches[0].clientX, e.touches[0].clientY);
            });
            window.addEventListener('touchend', endAction);
        }

        // --- Shoot Mechanics ---
        function shootArrow() {
            sound.playRelease();

            // Calculate trajectory vectors based on aim offset and power
            const velocityZ = -45 * power;
            const velocityX = (-aimOffset.x / maxAimOffset) * 4;
            const velocityY = (aimOffset.y / maxAimOffset) * 4 + (power * 2);

            const newArrow = new Arrow(0, 2, 8, velocityX, velocityY, velocityZ);
            arrows.push(newArrow);

            // Slight camera recoil effect
            camera.position.z += 0.2;
            setTimeout(() => { camera.position.z -= 0.2; }, 150);
        }

        // --- Match Flow ---
        function randomizeWind() {
            windSpeed = (Math.random() * 4 - 2).toFixed(1); // -2.0 to +2.0 m/s
            document.getElementById('wind-display').innerText = `WIND: ${windSpeed} m/s`;
        }

        function resetRound() {
            randomizeWind();
        }

        function startGame() {
            totalScore = 0;
            arrowsLeft = 5;
            document.getElementById('score-display').innerText = `SCORE: 0`;
            document.getElementById('arrows-display').innerText = `ARROWS: 5`;
            document.getElementById('message-overlay').style.display = 'none';
            gameActive = true;
            randomizeWind();
        }

        function endGame() {
            gameActive = false;
            const overlay = document.getElementById('message-overlay');
            overlay.style.display = 'flex';
            overlay.querySelector('h1').innerText = "Match Complete!";
            overlay.querySelector('p').innerText = `Final Score: ${totalScore} points. Outstanding marksmanship! Play again to beat your record.`;
            document.getElementById('start-btn').innerText = "Play Again";
        }

        document.getElementById('start-btn').addEventListener('click', startGame);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // --- Main Game Loop ---
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();

            // Subtle target idle sway
            if (targetGroup) {
                targetGroup.position.x = Math.sin(clock.getElapsedTime() * 1.5) * 0.1;
            }

            // Update all active arrows
            for (let i = arrows.length - 1; i >= 0; i--) {
                arrows[i].update(delta);
            }

            renderer.render(scene, camera);
        }

        // Initialize and run
        initScene();
        animate();
