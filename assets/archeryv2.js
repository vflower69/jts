/*
Here is the upgraded Commercial-Grade Pro Archery 3D code - V2. 
It features moving targets (lateral oscillation), environmental obstacles blocking the path, 
and a visual wind indicator compass/arrow showing both speed and precise blowing direction.

What's Added in this Update:
1. Moving Targets: The target now dynamically oscillates side-to-side (Math.sin), forcing you to track movement and time your release perfectly.
2. Path Obstacles: A solid wooden barrier pillar stands in the shooting lane off-center, penalizing uncalculated shots or poor wind drift management.
3. Directional Wind Indicator Compass: The HUD wind meter now features a rotating vector arrow that points precisely toward the 
exact direction the wind is blowing, paired with speed metrics.
4. Unique Sound Effects: Added distinct impact synthesis tones for hitting ring values versus hitting wooden obstacles.
*/
// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
// --- Game Configuration & State ---
        let scene, camera, renderer, targetGroup, obstacles = [];
        let arrows = [];
        let score = 0, arrowsLeft = 5, totalScore = 0;
        let windSpeed = 0, windAngleRad = 0; // Wind vector angles
        let isAiming = false, power = 0, maxPower = 1.0;
        let gameActive = false;

        let pointerStart = { x: 0, y: 0 };
        let aimOffset = { x: 0, y: 0 };
        const maxAimOffset = 150;

        // --- Audio Synthesizer ---
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
            playHit(type) { // 'bullseye', 'ring', 'obstacle'
                let osc = this.ctx.createOscillator();
                let gain = this.ctx.createGain();
                let duration = 0.3;

                if (type === 'bullseye') {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);
                } else if (type === 'ring') {
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + duration);
                } else { // obstacle thud
                    osc.type = 'sawtooth';
                    duration = 0.15;
                    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + duration);
                }

                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + duration);
            }
        }
        const sound = new SoundEngine();

        // --- Initialize Three.js ---
        function initScene() {
            const container = document.getElementById('canvas-container');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x87ceeb);
            scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

            camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 2, 10);

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Lighting
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const sunLight = new THREE.DirectionalLight(0xfffaed, 0.8);
            sunLight.position.set(20, 40, 20);
            sunLight.castShadow = true;
            scene.add(sunLight);

            // Ground
            const ground = new THREE.Mesh(
                new THREE.PlaneGeometry(200, 200),
                new THREE.MeshStandardMaterial({ color: 0x3b7a57, roughness: 0.9 })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            // Build Environment Assets
            createTarget(0, 2, -60);
            createObstacles();

            window.addEventListener('resize', onWindowResize);
            setupControls();
        }

        // --- Target Building ---
        function createTarget(x, y, z) {
            targetGroup = new THREE.Group();
            targetGroup.position.set(x, y, z);

            const poleMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
            const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), poleMat);
            leftPole.position.set(-1.2, -2.5, 0); leftPole.castShadow = true;
            const rightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), poleMat);
            rightPole.position.set(1.2, -2.5, 0); rightPole.castShadow = true;
            targetGroup.add(leftPole, rightPole);

            const ringColors = [0xffffff, 0x111111, 0x1e90ff, 0xff3333, 0xffcc00];
            const ringRadii = [2.0, 1.6, 1.2, 0.8, 0.4];

            ringRadii.forEach((radius, index) => {
                const ring = new THREE.Mesh(
                    new THREE.CircleGeometry(radius, 32),
                    new THREE.MeshStandardMaterial({ color: ringColors[index], side: THREE.DoubleSide })
                );
                ring.position.z = index * 0.01;
                targetGroup.add(ring);
            });

            scene.add(targetGroup);
        }

        // --- Obstacles Setup (Pillars/Walls in flight path) ---
        function createObstacles() {
            obstacles = [];
            const obsMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }); // Wooden barrier pillar
            
            // Pillar obstructing slightly off-center
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 1.2), obsMat);
            pillar.position.set(-1.5, 2, -35);
            pillar.castShadow = true; pillar.receiveShadow = true;
            scene.add(pillar);
            obstacles.push(pillar);
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
                const shaft = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 1.8),
                    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
                );
                shaft.geometry.rotateX(Math.PI / 2);
                group.add(shaft);

                const tip = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04, 0.2, 8),
                    new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 })
                );
                tip.geometry.rotateX(Math.PI / 2);
                tip.position.z = 0.95;
                group.add(tip);
                return group;
            }

            update(delta) {
                if (!this.active) return;

                // Apply directional wind vectors (X and Z vector components)
                const windXForce = Math.cos(windAngleRad) * windSpeed;
                const windZForce = Math.sin(windAngleRad) * windSpeed;
                this.velocity.x += windXForce * 0.03 * delta * 60;
                this.velocity.z += windZForce * 0.01 * delta * 60;

                // Gravity
                this.velocity.y += this.gravity * delta;
                this.mesh.position.addScaledVector(this.velocity, delta);

                // Flight alignment
                const direction = this.velocity.clone().normalize();
                const matrix = new THREE.Matrix4();
                matrix.lookAt(this.mesh.position, this.mesh.position.clone().add(direction), camera.up);
                this.mesh.quaternion.setFromRotationMatrix(matrix);

                // Check collision with Obstacles
                for (let obs of obstacles) {
                    const box = new THREE.Box3().setFromObject(obs);
                    if (box.containsPoint(this.mesh.position)) {
                        this.active = false;
                        sound.playHit('obstacle');
                        createHitSparks(this.mesh.position, 0x8b5a2b);
                        return;
                    }
                }

                // Check target impact plane (Z = -60)
                if (this.mesh.position.z <= targetGroup.position.z) {
                    this.active = false;
                    checkHit(this.mesh.position);
                }

                if (this.mesh.position.y < -5 || this.mesh.position.z < -80) {
                    this.active = false;
                    scene.remove(this.mesh);
                }
            }
        }

        // --- Hit Logic & Scoring ---
        function checkHit(pos) {
            const dx = pos.x - targetGroup.position.x;
            const dy = pos.y - targetGroup.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let points = 0;
            let hitType = 'ring';

            if (distance <= 0.4) { points = 10; hitType = 'bullseye'; createHitSparks(pos, 0xffcc00); }
            else if (distance <= 0.8) { points = 8; }
            else if (distance <= 1.2) { points = 6; }
            else if (distance <= 1.6) { points = 4; }
            else if (distance <= 2.0) { points = 2; }
            else { points = 0; hitType = 'obstacle'; }

            score += points;
            totalScore += points;
            document.getElementById('score-display').innerText = `SCORE: ${totalScore}`;

            sound.playHit(hitType);

            arrowsLeft--;
            document.getElementById('arrows-display').innerText = `ARROWS: ${arrowsLeft}`;

            setTimeout(() => {
                if (arrowsLeft > 0) resetRound();
                else endGame();
            }, 1200);
        }

        function createHitSparks(pos, colorHex) {
            const particleCount = 20;
            const geo = new THREE.BufferGeometry();
            const positions = [], velocities = [];

            for (let i = 0; i < particleCount; i++) {
                positions.push(pos.x, pos.y, pos.z);
                velocities.push((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
            }
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({ color: colorHex, size: 0.12 }));
            scene.add(particleSystem);

            let time = 0;
            const animateSparks = () => {
                time += 0.04;
                const arr = particleSystem.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    arr[i * 3] += velocities[i * 3] * 0.04;
                    arr[i * 3 + 1] += (velocities[i * 3 + 1] * 0.04) - 0.05;
                    arr[i * 3 + 2] += velocities[i * 3 + 2] * 0.04;
                }
                particleSystem.geometry.attributes.position.needsUpdate = true;
                if (time < 0.8) requestAnimationFrame(animateSparks);
                else scene.remove(particleSystem);
            };
            animateSparks();
        }

        // --- Controls Setup ---
        function setupControls() {
            const startAction = (x, y) => {
                if (!gameActive) return;
                isAiming = true;
                pointerStart.x = x; pointerStart.y = y;
                aimOffset.x = 0; aimOffset.y = 0;
                power = 0.2;
                document.getElementById('power-container').style.display = 'block';
                sound.playDraw();
            };

            const moveAction = (x, y) => {
                if (!isAiming) return;
                aimOffset.x = Math.max(-maxAimOffset, Math.min(maxAimOffset, x - pointerStart.x));
                aimOffset.y = Math.max(-maxAimOffset, Math.min(maxAimOffset, y - pointerStart.y));

                document.getElementById('crosshair').style.transform = `translate(calc(-50% + ${aimOffset.x}px), calc(-50% + ${aimOffset.y}px))`;
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

            window.addEventListener('mousedown', (e) => startAction(e.clientX, e.clientY));
            window.addEventListener('mousemove', (e) => moveAction(e.clientX, e.clientY));
            window.addEventListener('mouseup', endAction);

            window.addEventListener('touchstart', (e) => { if (e.touches.length > 0) startAction(e.touches[0].clientX, e.touches[0].clientY); });
            window.addEventListener('touchmove', (e) => { if (e.touches.length > 0) moveAction(e.touches[0].clientX, e.touches[0].clientY); });
            window.addEventListener('touchend', endAction);
        }

        function shootArrow() {
            sound.playRelease();
            const velocityZ = -45 * power;
            const velocityX = (-aimOffset.x / maxAimOffset) * 4;
            const velocityY = (aimOffset.y / maxAimOffset) * 4 + (power * 2);

            arrows.push(new Arrow(0, 2, 8, velocityX, velocityY, velocityZ));
            camera.position.z += 0.2;
            setTimeout(() => { camera.position.z -= 0.2; }, 150);
        }

        // --- Wind & Match Management ---
        function randomizeWind() {
            windSpeed = +(Math.random() * 3 + 0.5).toFixed(1); // 0.5 to 3.5 m/s
            windAngleRad = Math.random() * Math.PI * 2; // Random direction angle

            // Update UI text and rotational arrow heading direction
            document.getElementById('wind-val').innerText = `${windSpeed} m/s`;
            // Map angle to CSS rotation degrees for the UI arrow indicator
            const deg = (windAngleRad * (180 / Math.PI));
            document.getElementById('wind-arrow').style.transform = `rotate(${deg}deg)`;
        }

        function resetRound() { randomizeWind(); }

        function startGame() {
            totalScore = 0; arrowsLeft = 5;
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
            overlay.querySelector('p').innerText = `Final Score: ${totalScore} points. Excellent mastery of wind and targets!`;
            document.getElementById('start-btn').innerText = "Play Again";
        }

        document.getElementById('start-btn').addEventListener('click', startGame);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        // --- Main Loop ---
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsedTime = clock.getElapsedTime();

            // Moving Target: Oscillate smoothly left and right across the X axis
            if (targetGroup) {
                targetGroup.position.x = Math.sin(elapsedTime * 2.0) * 2.5; 
            }

            for (let i = arrows.length - 1; i >= 0; i--) {
                arrows[i].update(delta);
            }

            renderer.render(scene, camera);
        }

        initScene();
        animate();
