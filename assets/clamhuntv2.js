// hostname check - only run from jimothytracker.org domain
if (window.location.hostname !== "jimothytracker.org") {
  document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
let score = 0;
let round = 1;
let highScore = 0;
let clamIndex = 0;
let rockPositions = [0, 1, 2]; // Tracks which rock slot is where
let isShuffling = false;
let canPick = false;

const slots = [
    { x: 20, y: 50 },
    { x: 50, y: 50 },
    { x: 80, y: 50 }
];

function updatePositions() {
    for (let i = 0; i < 3; i++) {
        const slotIdx = rockPositions[i];
        const rock = document.getElementById(`rock${i}`);
        const item = document.getElementById(`item${i}`);
        
        rock.style.left = `${slots[slotIdx].x}%`;
        rock.style.top = `${slots[slotIdx].y}%`;
        
        item.style.left = `${slots[slotIdx].x}%`;
        item.style.top = `${slots[slotIdx].y}%`;
    }
}

function startGame() {
    score = 0;
    round = 1;
    document.getElementById('score').innerText = score;
    document.getElementById('round').innerText = round;
    document.getElementById('startModal').classList.add('hidden');
    startRound();
}

function startRound() {
    canPick = false;
    isShuffling = false;
    document.getElementById('message').innerText = "Watch closely where the Clam is!";

    // Assign Clam to random rock, Crabs to others
    clamIndex = Math.floor(Math.random() * 3);
    for (let i = 0; i < 3; i++) {
        document.getElementById(`item${i}`).innerText = (i === clamIndex) ? '🦪' : '🦀';
        document.getElementById(`rock${i}`).classList.add('raised');
    }

    rockPositions = [0, 1, 2];
    updatePositions();

    // Hide items and start shuffle after reveal
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            document.getElementById(`rock${i}`).classList.remove('raised');
        }
        setTimeout(shuffleRocks, 800);
    }, 1800);
}

function shuffleRocks() {
    isShuffling = true;
    document.getElementById('message').innerText = "Shuffling...";

    let shufflesLeft = 8 + (round * 2); // Faster & longer each round
    let speed = Math.max(180, 450 - (round * 30));

    let interval = setInterval(() => {
        // Swap two random rock positions
        let a = Math.floor(Math.random() * 3);
        let b = (a + 1 + Math.floor(Math.random() * 2)) % 3;

        let temp = rockPositions[a];
        rockPositions[a] = rockPositions[b];
        rockPositions[b] = temp;

        updatePositions();
        shufflesLeft--;

        if (shufflesLeft <= 0) {
            clearInterval(interval);
            isShuffling = false;
            canPick = true;
            document.getElementById('message').innerText = "Which rock is hiding the Clam?";
        }
    }, speed);
}

function selectRock(index) {
    if (!canPick || isShuffling) return;
    canPick = false;

    // Lift chosen rock
    document.getElementById(`rock${index}`).classList.add('raised');

    if (index === clamIndex) {
        score += 10;
        if (score > highScore) highScore = score;
        document.getElementById('score').innerText = score;
        document.getElementById('highscore').innerText = highScore;
        document.getElementById('message').innerText = "🎉 You found the Clam! Jimothy is happy!";
        
        setTimeout(() => {
            round++;
            document.getElementById('round').innerText = round;
            startRound();
        }, 1800);
    } else {
        document.getElementById('message').innerText = "🦀 Ouch! A Crab pinched Jimothy! Game Over.";
        setTimeout(() => {
            document.getElementById('startModal').classList.remove('hidden');
        }, 2000);
    }
}
