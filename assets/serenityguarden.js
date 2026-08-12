    /* Audio Synthesis Engine (Web Audio API - No external files required) */
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    }

    function playTone(freq, duration = 0.4, type = 'sine', gainVal = 0.15) {
      if (!soundEnabled) return;
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    }

    function playCardSound() {
      // Gentle soft bell tone (Pentatonic Freq)
      playTone(523.25, 0.3, 'sine', 0.1); // C5
    }

    function playMatchSound() {
      // Pleasant harmony chord (C Major / Gentle Chime)
      setTimeout(() => playTone(523.25, 0.6, 'sine', 0.12), 0);   // C5
      setTimeout(() => playTone(659.25, 0.6, 'sine', 0.12), 120); // E5
      setTimeout(() => playTone(783.99, 0.8, 'sine', 0.15), 240); // G5
    }

    function playVictorySound() {
      // Soft ambient victory arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((note, index) => {
        setTimeout(() => playTone(note, 0.8, 'sine', 0.15), index * 180);
      });
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      const soundIcon = document.getElementById('soundIcon');
      const soundLabel = document.getElementById('soundLabel');
      
      if (soundEnabled) {
        soundIcon.innerText = '🎵';
        soundLabel.innerText = 'Sound: On';
        playCardSound();
      } else {
        soundIcon.innerText = '🔇';
        soundLabel.innerText = 'Sound: Off';
      }
    }

    function toggleFontSize() {
      document.body.classList.toggle('large-text');
      const fontLabel = document.getElementById('fontLabel');
      fontLabel.innerText = document.body.classList.contains('large-text') ? 'Text: Normal' : 'Text: Larger';
    }

    /* Game Logic State */
    const natureItems = [
      { emoji: '🌸', name: 'Blossom' },
      { emoji: '🦋', name: 'Butterfly' },
      { emoji: '🌻', name: 'Sunflower' },
      { emoji: '🕊️', name: 'Dove' },
      { emoji: '🍃', name: 'Leaf' },
      { emoji: '🫐', name: 'Berry' }
    ];

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let turns = 0;
    let isBusy = false;

    function createDeck() {
      // Duplicate for pairs
      const deck = [...natureItems, ...natureItems];
      // Shuffle cleanly
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    function renderBoard() {
      const grid = document.getElementById('cardsGrid');
      grid.innerHTML = '';
      const deck = createDeck();

      document.getElementById('totalPairsCount').innerText = natureItems.length;
      document.getElementById('pairsCount').innerText = '0';
      document.getElementById('turnsCount').innerText = '0';

      matchedPairs = 0;
      turns = 0;
      flippedCards = [];
      cards = [];

      deck.forEach((item, index) => {
        const cardBtn = document.createElement('button');
        cardBtn.className = 'card';
        cardBtn.setAttribute('role', 'gridcell');
        cardBtn.setAttribute('aria-label', `Card ${index + 1}`);
        cardBtn.dataset.index = index;
        cardBtn.dataset.name = item.name;

        cardBtn.innerHTML = `
          <div class="card-face card-back"></div>
          <div class="card-face card-front">
            <span class="card-emoji">${item.emoji}</span>
            <span class="card-label">${item.name}</span>
          </div>
        `;

        cardBtn.addEventListener('click', () => handleCardClick(cardBtn));
        grid.appendChild(cardBtn);
        cards.push(cardBtn);
      });
    }

    function handleCardClick(card) {
      if (isBusy || card.classList.contains('flipped') || card.classList.contains('matched')) {
        return;
      }

      playCardSound();
      card.classList.add('flipped');
      card.setAttribute('aria-label', `${card.dataset.name}`);
      flippedCards.push(card);

      if (flippedCards.length === 2) {
        turns++;
        document.getElementById('turnsCount').innerText = turns;
        checkMatch();
      }
    }

    function checkMatch() {
      isBusy = true;
      const [card1, card2] = flippedCards;

      if (card1.dataset.name === card2.dataset.name) {
        setTimeout(() => {
          card1.classList.add('matched');
          card2.classList.add('matched');
          playMatchSound();
          matchedPairs++;
          document.getElementById('pairsCount').innerText = matchedPairs;
          flippedCards = [];
          isBusy = false;

          if (matchedPairs === natureItems.length) {
            setTimeout(showVictory, 500);
          }
        }, 400);
      } else {
        setTimeout(() => {
          card1.classList.remove('flipped');
          card2.classList.remove('flipped');
          card1.setAttribute('aria-label', `Card ${parseInt(card1.dataset.index) + 1}`);
          card2.setAttribute('aria-label', `Card ${parseInt(card2.dataset.index) + 1}`);
          flippedCards = [];
          isBusy = false;
        }, 1200);
      }
    }

    function hintPair() {
      if (isBusy || matchedPairs === natureItems.length) return;

      const unMatched = cards.filter(c => !c.classList.contains('matched') && !c.classList.contains('flipped'));
      if (unMatched.length < 2) return;

      // Find first pair match in unMatched
      let matchPair = [];
      for (let i = 0; i < unMatched.length; i++) {
        for (let j = i + 1; j < unMatched.length; j++) {
          if (unMatched[i].dataset.name === unMatched[j].dataset.name) {
            matchPair = [unMatched[i], unMatched[j]];
            break;
          }
        }
        if (matchPair.length > 0) break;
      }

      if (matchPair.length === 2) {
        matchPair.forEach(c => c.style.boxShadow = '0 0 20px #d4a373');
        playTone(440, 0.4, 'sine', 0.1);
        setTimeout(() => {
          matchPair.forEach(c => c.style.boxShadow = '');
        }, 1000);
      }
    }

    function showVictory() {
      playVictorySound();
      document.getElementById('finalTurns').innerText = turns;
      document.getElementById('victoryModal').classList.add('active');
    }

    function closeVictoryModal() {
      document.getElementById('victoryModal').classList.remove('active');
      resetGame();
    }

    function resetGame() {
      renderBoard();
    }

    // Initialize Game Board on Load
    renderBoard();
