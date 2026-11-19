// hostname check - only run from jimothytracker.org domain
    if (window.location.hostname !== "jimothytracker.org") {
      document.body.innerHTML = "🦝 Jimothy says: This is stolen from jimothytracker.org!";}

// Below are the codes for the game
(function () {
'use strict';

var W = 960, H = 540, TAU = Math.PI * 2;
var FONT = 'Fredoka, "Trebuchet MS", system-ui, sans-serif';
function $(id) { return document.getElementById(id); }
var canvas = $('scene');
var mainCtx = canvas.getContext('2d');
var ctx = mainCtx;
var bgCanvas = document.createElement('canvas');
var bgCtx = bgCanvas.getContext('2d');
var bgDirty = true;
var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- helpers ---------- */
function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function hash(i) { var s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function fillEllipse(x, y, rx, ry, fill, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
}
function limb(x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function rr(x, y, w, h, r) {
  var rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function tri(a, b, c, d, e, f, fill) {
  ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

/* ---------- cast ---------- */
var PAIRS = [
  { g: { name: 'Marge', skin: '#f0c8a0', hair: '#b9a4d6', style: 'curls', dress: '#d9768b', card: '#3f9c92', sock: '#eadfcd', shoe: '#5a4a52', glasses: true, acc: 'purse', accC: '#8a3f55', top: 140 },
    dog: { name: 'Biscuit', len: 68, h: 32, leg: 15, hr: 17, sn: 14, lw: 9, col: '#e0a05a', col2: '#fff1dc', dark: '#b87a3d', ear: 'point', tail: 'stub' },
    lines: { walk: ['Biscuit, heel!', 'Lovely drizzle today.'], look: ['It is a bush, Biscuit.', 'Is that a second pumpkin?'], caught: ['Biscuit! Not the raccoon!', 'Jimothy?! Again?!'] } },
  { g: { name: 'Dolores', skin: '#e2b48a', hair: '#f1f1f4', style: 'bun', dress: '#6c7fb8', card: '#e8b04a', sock: '#cfc6bd', shoe: '#33303f', glasses: true, acc: 'umbrella', accC: '#e5533d', top: 196 },
    dog: { name: 'Mr. Pickles', len: 106, h: 21, leg: 13, hr: 13, sn: 20, lw: 7, col: '#6a3d28', col2: '#8c5b3e', dark: '#4a2919', ear: 'floppy', tail: 'long' },
    lines: { walk: ['Almost home, Pickles.', 'Nice and damp out.'], look: ['Pickles, do not stare.', 'Just a lumpy cat, dear.'], caught: ['Oh my stars, a raccoon!', 'Pickles, run!'] } },
  { g: { name: 'Bernadette', skin: '#f4d2b4', hair: '#a9a9b5', style: 'bob', dress: '#f2c230', card: '#f2c230', sock: '#6a7088', shoe: '#c23b3b', glasses: false, acc: 'hat', accC: '#f2c230', top: 150 },
    dog: { name: 'Gus', len: 56, h: 34, leg: 17, hr: 19, sn: 7, lw: 9, col: '#dcbc8c', col2: '#dcbc8c', mask: '#4a3a33', dark: '#b99865', ear: 'floppy-small', tail: 'curl' },
    lines: { walk: ['Hurry up, Gus, love.', 'Rain boots, Gus!'], look: ['Gus, that is a doormat.', 'Gus is being dramatic.'], caught: ['Gus! That is no cat!', 'Is that a RACCOON?'] } },
  { g: { name: 'Ruth', skin: '#d9a37a', hair: '#ececf2', style: 'curls', dress: '#4a6fa5', card: '#b9d3ef', sock: '#c9c3d0', shoe: '#2c2a38', glasses: false, acc: 'pearls', accC: '#ffffff', top: 142 },
    dog: { name: 'Duchess', len: 58, h: 36, leg: 30, hr: 15, sn: 19, lw: 5.5, col: '#f7f2f6', col2: '#ffffff', dark: '#d6cdd8', ear: 'poof', tail: 'pom', puffs: true },
    lines: { walk: ['Chin up, Duchess.', 'Posture, darling.'], look: ['Probably a garden gnome.', 'Nothing there, Duchess.'], caught: ['Duchess! Shoo, shoo!', 'The nerve of him!'] } },
  { g: { name: 'Wilma', skin: '#f1c9a5', hair: '#d98b5f', style: 'bun', dress: '#7aa86c', card: '#e8dcc3', sock: '#eadfcd', shoe: '#6b4a38', glasses: true, acc: 'tote', accC: '#c9833f', top: 142 },
    dog: { name: 'Tiny', len: 38, h: 21, leg: 15, hr: 13, sn: 10, lw: 5, col: '#c99a68', col2: '#e8c79d', dark: '#a97a48', ear: 'big', tail: 'whip' },
    lines: { walk: ['Tiny, I am knitting.', 'Purl two, Tiny.'], look: ['Tiny sees everything.', 'Tiny, it is a recycling bin.'], caught: ['Tiny was right again!', 'Well, I never!'] } },
  { g: { name: 'Agnes', skin: '#9a6a49', hair: '#e9e9ef', style: 'curls', dress: '#9b59a6', card: '#e46a5a', sock: '#d9cfe0', shoe: '#3a2f46', glasses: true, acc: 'beanie', accC: '#2f8f83', top: 152 },
    dog: { name: 'Moose', len: 92, h: 56, leg: 32, hr: 25, sn: 20, lw: 13, col: '#9d9daa', col2: '#f2f2f5', dark: '#7e7e8b', ear: 'hairy', tail: 'none', shaggy: true },
    lines: { walk: ['Moose, slow down!', 'Mind the puddles, Moose.'], look: ['Moose, it is a statue.', 'Moose, that is a hedge.'], caught: ['MOOSE. HEEL. HEEL!', 'Is that Jimothy?!'] } }
];
var FAKE_LINES = ['Just a squirrel, dear.', 'Ooh, a leaf!', 'Nothing there, sweetie.'];
var THOUGHTS = ['I am a bush.', 'No raccoon here.', 'Just a lumpy cat.', 'Shh. Statue.', 'I am a pumpkin.', 'Do not blink.', 'Nothing to see.'];

/* ---------- state ---------- */
var STORE_KEY = 'freeze-jimothy-best';
var G = { mode: 'menu', t: 0, score: 0, best: 0, itch: 0, sneezeT: 0, sneezeRecent: 0, shake: 0, hold: false, lastIdx: -1, pair: null, over: null, newBest: false };
var J = { x: 330, y: 392, pose: 'eat', eat: 0, hopT: 0, hopY: 0, thought: '', frozenFor: 0, wasFrozen: false, caughtLine: 'Eep.' };
var inp = { key: false, ptr: false };
var floaters = [];
var rain = [];
for (var i = 0; i < 70; i++) rain.push({ x: Math.random() * W, y: Math.random() * H, v: rand(380, 560), l: rand(9, 16) });
var DOG_Y = 504, GM_Y = 502;

try { var sb = parseInt(window.localStorage.getItem(STORE_KEY), 10); if (sb > 0) G.best = sb; } catch (e) {}
function saveBest() { try { window.localStorage.setItem(STORE_KEY, String(G.best)); } catch (e) {} }

/* ---------- audio ---------- */
var AC = null, muted = false;
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}
function tone(f, d, type, v, slide, delay) {
  var a = AC; if (!a || muted) return;
  var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, f + slide), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v || 0.05, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.03);
}
function sfx(n) {
  if (!AC) return;
  if (n === 'freeze') tone(520, 0.07, 'triangle', 0.05, -140);
  else if (n === 'tell') { tone(660, 0.1, 'square', 0.03, 120); tone(880, 0.1, 'square', 0.03, 120, 0.11); }
  else if (n === 'look') tone(240, 0.3, 'sawtooth', 0.04, -80);
  else if (n === 'pass') { tone(523, 0.12, 'triangle', 0.06); tone(659, 0.12, 'triangle', 0.06, 0, 0.1); tone(784, 0.2, 'triangle', 0.06, 0, 0.2); }
  else if (n === 'caught') { tone(200, 0.14, 'sawtooth', 0.1, -70); tone(210, 0.14, 'sawtooth', 0.1, -70, 0.18); tone(330, 0.6, 'triangle', 0.07, -240, 0.4); }
  else if (n === 'sneeze') tone(1000, 0.2, 'square', 0.05, -700);
}

/* ---------- pairs ---------- */
function tellDuration(n) { return Math.max(0.26, 0.72 - n * 0.035); }
function newPair(calm, first) {
  var idx; do { idx = Math.floor(Math.random() * PAIRS.length); } while (idx === G.lastIdx);
  G.lastIdx = idx;
  var spec = PAIRS[idx], n = G.score;
  var speed = calm ? 90 : Math.min(100 + n * 7, 190) * rand(0.93, 1.07);
  var x = first ? -150 : -(spec.dog.len + 190);
  return { spec: spec, x: x, dogX: x + 62 + spec.dog.len / 2, speed: speed, phase: 0, state: 'walk', timer: 0,
           wait: n === 0 ? 2.0 : rand(1.0, 1.8), tellDur: 0.6, lookDur: 1.2, fake: false, look: 0, tellT: 0,
           unfrozen: 0, bubble: null, calm: calm, hand: { x: 0, y: 0 }, collar: { x: 0, y: 0 }, head: { x: 0, y: 0 }, greeted: false };
}
function setBubble(P, text, secs) { P.bubble = { text: text, until: G.t + secs }; }

function updatePair(dt, frozen) {
  var P = G.pair, n = G.score;
  var sp = P.speed * (P.state === 'look' ? 0.42 : (P.state === 'tell' ? 0.7 : 1));
  P.x += sp * dt;
  P.phase += dt * sp * 0.075;
  P.dogX = P.x + 62 + P.spec.dog.len / 2;
  var tl = (P.state === 'look') ? 1 : 0;
  P.look += clamp(tl - P.look, -dt * 7, dt * 7);
  var tt = (P.state === 'tell' || P.state === 'look') ? 1 : 0;
  P.tellT += clamp(tt - P.tellT, -dt * 6, dt * 6);
  if (!P.greeted && P.dogX > 60) { P.greeted = true; setBubble(P, pick(P.spec.lines.walk), 2.4); }
  if (!P.calm) {
    P.timer += dt;
    if (P.state === 'walk') {
      var visible = P.dogX > 40 && P.dogX < W - 90;
      if (P.timer >= P.wait && visible) {
        P.state = 'tell'; P.timer = 0; P.tellDur = tellDuration(n);
        P.fake = n >= 3 && Math.random() < Math.min(0.12 + (n - 3) * 0.03, 0.35);
        P.lookDur = rand(1.0, Math.min(1.5 + n * 0.08, 2.3));
        sfx('tell');
      }
    } else if (P.state === 'tell') {
      if (P.timer >= P.tellDur) {
        P.timer = 0;
        if (P.fake) { P.state = 'walk'; P.wait = rand(1.0, 1.7); setBubble(P, pick(FAKE_LINES), 1.8); }
        else { P.state = 'look'; P.unfrozen = 0; setBubble(P, pick(P.spec.lines.look), P.lookDur + 0.4); sfx('look'); }
      }
    } else if (P.state === 'look') {
      if (frozen) P.unfrozen = Math.max(0, P.unfrozen - dt * 2); else P.unfrozen += dt;
      if (P.unfrozen > 0.09) { caught(); return; }
      if (P.timer >= P.lookDur) {
        P.state = 'walk'; P.timer = 0;
        P.wait = rand(Math.max(0.9, 1.8 - n * 0.06), Math.max(1.5, 2.8 - n * 0.08));
      }
    }
  }
  if (P.x > W + 60) {
    if (!P.calm) {
      G.score++; el.score.textContent = G.score; sfx('pass'); J.hopT = 0.7;
      floaters.push({ x: J.x + 20, y: J.y - 120, vy: -38, text: '+1 dog!', life: 1.4, max: 1.4 });
    }
    G.pair = newPair(P.calm, false);
  }
}

function caught() {
  if (G.mode !== 'play') return;
  G.mode = 'over';
  G.over = { t: 0, shown: false, cause: G.sneezeRecent > 0 ? 'sneeze' : 'moved', shownAt: 0 };
  G.shake = 0.6; sfx('caught');
  var P = G.pair;
  setBubble(P, pick(P.spec.lines.caught), 99);
  J.caughtLine = pick(['Eep.', 'Oh no.', 'I was a bush!']);
  if (G.score > G.best) { G.best = G.score; saveBest(); G.newBest = true; } else { G.newBest = false; }
  el.best.textContent = G.best;
}

/* ---------- UI ---------- */
var el = { score: $('score'), best: $('best'), light: $('light'), lightText: $('lightText'), itchFill: $('itchFill'), itchWord: $('itchWord'),
  controls: $('controls'), btn: $('freezeBtn'), btnText: $('freezeText'), start: $('startCard'), over: $('overCard'),
  overScore: $('overScore'), overBest: $('overBest'), overMsg: $('overMsg'), overFlavor: $('overFlavor'), newBest: $('newBest'), mute: $('muteBtn') };
var ui = { light: '', frozen: null, itchPct: -1, itchCls: '', alert: '' };
var LIGHT_TEXT = { idle: 'Ready', clear: 'Coast is clear', warn: 'Uh-oh...', freeze: 'FREEZE!', over: 'Busted!' };

function renderUi(frozen) {
  var P = G.pair, s = 'idle';
  if (G.mode === 'play') s = P.state === 'look' ? 'freeze' : (P.state === 'tell' ? 'warn' : 'clear');
  else if (G.mode === 'over') s = 'over';
  if (s !== ui.light) { ui.light = s; el.light.dataset.state = s; el.lightText.textContent = LIGHT_TEXT[s]; }
  if (frozen !== ui.frozen) {
    ui.frozen = frozen;
    el.btn.setAttribute('aria-pressed', frozen ? 'true' : 'false');
    el.btnText.textContent = frozen ? 'Frozen. Do not blink.' : 'Hold to freeze';
  }
  var pct = Math.round(clamp(G.itch, 0, 1) * 100);
  if (pct !== ui.itchPct) {
    ui.itchPct = pct; el.itchFill.style.width = pct + '%';
    var cls = pct > 75 ? 'fill hot' : (pct > 45 ? 'fill warm' : 'fill');
    if (cls !== ui.itchCls) { ui.itchCls = cls; el.itchFill.className = cls; }
    el.itchWord.textContent = pct > 75 ? 'Must scratch' : (pct > 45 ? 'Twitchy' : (pct > 15 ? 'Tingly' : 'Calm'));
  }
  var alert = (G.mode === 'play' && P.state === 'look' && !frozen) ? '1' : '0';
  if (alert !== ui.alert) { ui.alert = alert; el.controls.dataset.alert = alert; }
}

function flavor(score, cause) {
  if (cause === 'sneeze') return 'The itch won. Jimothy sneezed and the dog heard every bit of it.';
  if (score === 0) return 'Jimothy waved at the very first dog. Classic Jimothy.';
  if (score < 3) return 'A fine start for a raccoon with no tail and no plan.';
  if (score < 6) return 'The neighborhood is getting suspicious.';
  if (score < 10) return 'Ballard\'s finest garden statue. Almost.';
  return 'Legendary. Jimothy is basically a lawn ornament now.';
}
function showOver() {
  var P = G.pair, dog = P.spec.dog.name;
  el.overMsg.textContent = G.over.cause === 'sneeze' ? 'Achoo! ' + dog + ' heard that.' : dog + ' spotted Jimothy moving.';
  el.overScore.textContent = G.score;
  el.overBest.textContent = G.best;
  el.overFlavor.textContent = flavor(G.score, G.over.cause);
  el.newBest.hidden = !(G.newBest && G.score > 0);
  el.over.hidden = false;
  G.over.shown = true; G.over.shownAt = G.t;
  try { $('againBtn').focus({ preventScroll: true }); } catch (e) {}
}
function startGame() {
  G.mode = 'play'; G.score = 0; G.itch = 0; G.sneezeT = 0; G.sneezeRecent = 0; G.shake = 0; G.over = null;
  G.pair = newPair(false, true);
  floaters.length = 0; J.hopT = 0;
  inp.key = false; inp.ptr = false;
  el.score.textContent = '0'; el.best.textContent = G.best;
  el.start.hidden = true; el.over.hidden = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function tryStart() {
  ensureAudio();
  if (G.mode === 'play') return;
  if (G.mode === 'over' && (!G.over.shown || G.t - G.over.shownAt < 0.5)) return;
  startGame();
}

/* ---------- input ---------- */
window.addEventListener('keydown', function (e) {
  var k = e.code;
  if (k === 'Space' || k === 'ArrowDown' || k === 'KeyF') {
    e.preventDefault();
    if (e.repeat) return;
    ensureAudio();
    if (G.mode === 'play') { inp.key = true; } else { tryStart(); }
  } else if (k === 'Enter' && G.mode !== 'play') {
    e.preventDefault(); if (!e.repeat) tryStart();
  }
});
window.addEventListener('keyup', function (e) {
  if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyF') { e.preventDefault(); inp.key = false; }
});
function ptrDown(e) {
  if (e.button !== undefined && e.button > 0) return;
  e.preventDefault(); ensureAudio();
  inp.ptr = true;
}
canvas.addEventListener('pointerdown', ptrDown);
el.btn.addEventListener('pointerdown', ptrDown);
el.btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
window.addEventListener('pointerup', function () { inp.ptr = false; });
window.addEventListener('pointercancel', function () { inp.ptr = false; });
window.addEventListener('blur', function () { inp.ptr = false; inp.key = false; });
$('startBtn').addEventListener('click', tryStart);
$('againBtn').addEventListener('click', tryStart);
el.mute.addEventListener('click', function () {
  muted = !muted; el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false'); el.mute.textContent = muted ? 'Sound off' : 'Sound on';
  ensureAudio();
});

/* ---------- update ---------- */
function update(dt) {
  G.t += dt;
  G.hold = inp.key || inp.ptr;
  if (G.sneezeT > 0) G.sneezeT = Math.max(0, G.sneezeT - dt);
  if (G.sneezeRecent > 0) G.sneezeRecent -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.6);
  var frozen = G.mode !== 'over' && G.hold && G.sneezeT <= 0;
  if (frozen && !J.wasFrozen) { J.thought = pick(THOUGHTS); J.frozenFor = 0; sfx('freeze'); }
  if (frozen) J.frozenFor += dt; else J.frozenFor = 0;
  J.wasFrozen = frozen;

  if (G.mode === 'play') {
    if (frozen) {
      G.itch += (0.27 + Math.min(G.score, 12) * 0.012) * dt;
      if (G.itch >= 1) { G.sneezeT = 0.6; G.sneezeRecent = 1.2; G.itch = 0.35; sfx('sneeze'); }
    } else {
      G.itch = Math.max(0, G.itch - 0.65 * dt);
    }
  } else {
    G.itch = Math.max(0, G.itch - dt);
  }

  J.pose = G.mode === 'over' ? 'caught' : (G.sneezeT > 0 ? 'sneeze' : (frozen ? 'frozen' : 'eat'));
  if (J.pose === 'eat') J.eat += dt;
  if (J.hopT > 0) { J.hopT = Math.max(0, J.hopT - dt); J.hopY = Math.abs(Math.sin((0.7 - J.hopT) * 9)) * 13; } else { J.hopY = 0; }

  if (G.mode === 'play' || G.mode === 'menu') updatePair(dt, frozen);
  else if (G.mode === 'over') {
    G.over.t += dt;
    if (!G.over.shown && G.over.t > 1.25) showOver();
  }

  for (var i = floaters.length - 1; i >= 0; i--) {
    var f = floaters[i]; f.life -= dt; f.y += f.vy * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  if (!reduceMotion) {
    for (var r = 0; r < rain.length; r++) {
      var d = rain[r]; d.y += d.v * dt; d.x += d.v * 0.18 * dt;
      if (d.y > H || d.x > W + 20) { d.y = -20; d.x = Math.random() * W - 40; }
    }
  }
  renderUi(frozen);
}

/* ---------- bubbles ---------- */
function bubble(text, tx, ty, o) {
  o = o || {};
  var size = o.size || 15, fill = o.fill || '#fffdf6', ink = o.ink || '#27223a';
  ctx.save();
  ctx.font = '600 ' + size + 'px ' + FONT;
  var w = Math.ceil(ctx.measureText(text).width) + 22, h = size + 16;
  var bx = clamp(tx - w / 2, 6, W - w - 6), by = clamp(ty - h - 12, 6, H - h - 6);
  ctx.fillStyle = fill; ctx.strokeStyle = 'rgba(30,24,50,.6)'; ctx.lineWidth = 2;
  rr(bx, by, w, h, Math.min(14, h / 2)); ctx.fill(); ctx.stroke();
  var tailX = clamp(tx, bx + 14, bx + w - 14);
  ctx.beginPath(); ctx.moveTo(tailX - 6, by + h - 1.5); ctx.lineTo(tx, ty); ctx.lineTo(tailX + 6, by + h - 1.5); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tailX - 6, by + h); ctx.lineTo(tx, ty); ctx.lineTo(tailX + 6, by + h); ctx.stroke();
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
  ctx.restore();
}

/* ---------- background ---------- */
function fir(x, base, h, col) {
  for (var k = 0; k < 4; k++) {
    var top = base - h + k * h * 0.2, bot = base - h * 0.55 + k * h * 0.2 + h * 0.22, hw = h * (0.16 + k * 0.07);
    tri(x, top, x - hw, bot, x + hw, bot, col);
  }
  ctx.fillStyle = '#2b2019'; ctx.fillRect(x - 3, base - 8, 6, 10);
}
function drawBackground() {
  var g = ctx.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, '#1b2145'); g.addColorStop(0.5, '#45467a'); g.addColorStop(0.82, '#b8627a'); g.addColorStop(1, '#f2a15f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  var clouds = [[120, 70, 130, 20], [420, 48, 170, 22], [760, 86, 150, 18], [610, 140, 120, 14], [250, 150, 110, 12], [900, 40, 90, 14]];
  for (var c = 0; c < clouds.length; c++) fillEllipse(clouds[c][0], clouds[c][1], clouds[c][2], clouds[c][3], 'rgba(28,24,60,.45)');
  // Olympics silhouette
  ctx.fillStyle = '#2b2d58'; ctx.beginPath(); ctx.moveTo(0, 310);
  var pts = [[60, 280], [130, 296], [210, 262], [290, 292], [380, 270], [470, 300], [560, 276], [660, 298], [760, 268], [860, 292], [960, 274]];
  for (var p = 0; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
  ctx.lineTo(W, 400); ctx.lineTo(0, 400); ctx.closePath(); ctx.fill();
  // distant houses
  var x = -10, idx = 0;
  while (x < W) {
    var w = 50 + hash(idx) * 50, h = 50 + hash(idx + 40) * 50;
    ctx.fillStyle = '#232846'; ctx.fillRect(x, 384 - h, w, h);
    tri(x - 4, 384 - h, x + w / 2, 384 - h - 26, x + w + 4, 384 - h, '#1c203a');
    for (var wy = 0; wy < 2; wy++) for (var wx = 0; wx < 2; wx++) {
      if (hash(idx * 7 + wy * 3 + wx) > 0.4) { ctx.fillStyle = '#f4c46a'; ctx.fillRect(x + 9 + wx * (w / 2 - 6), 384 - h + 12 + wy * 24, 10, 12); }
    }
    x += w + 8 + hash(idx + 9) * 14; idx++;
  }
  var firs = [[690, 150, '#173325'], [760, 175, '#1a3a2a'], [835, 140, '#173325'], [910, 168, '#1a3a2a'], [18, 130, '#173325']];
  for (var f = 0; f < firs.length; f++) fir(firs[f][0], 396, firs[f][1], firs[f][2]);

  // house
  ctx.fillStyle = '#3d6b73'; ctx.fillRect(30, 122, 570, 262);
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
  for (var ly = 134; ly < 372; ly += 13) { ctx.beginPath(); ctx.moveTo(30, ly); ctx.lineTo(600, ly); ctx.stroke(); }
  tri(14, 150, 315, 48, 616, 150, '#2a2540');
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  for (var sy = 70; sy < 148; sy += 9) { var hw2 = (sy - 48) * 1.5; ctx.beginPath(); ctx.moveTo(315 - hw2, sy); ctx.lineTo(315 + hw2, sy); ctx.stroke(); }
  ctx.fillStyle = '#e7dcc4'; ctx.fillRect(30, 150, 570, 8);
  fillEllipse(315, 114, 16, 14, '#ffd58a'); ctx.strokeStyle = '#e7dcc4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(315, 114, 16, 14, 0, 0, TAU); ctx.stroke();
  // windows
  var wins = [[70, 200], [490, 200]];
  for (var wi = 0; wi < wins.length; wi++) {
    var wxx = wins[wi][0], wyy = wins[wi][1];
    ctx.fillStyle = '#e7dcc4'; ctx.fillRect(wxx - 6, wyy - 6, 92, 102);
    var wg = ctx.createLinearGradient(0, wyy, 0, wyy + 90); wg.addColorStop(0, '#ffd98a'); wg.addColorStop(1, '#f2a65a');
    ctx.fillStyle = wg; ctx.fillRect(wxx, wyy, 80, 90);
    ctx.fillStyle = '#e7dcc4'; ctx.fillRect(wxx + 38, wyy, 4, 90); ctx.fillRect(wxx, wyy + 43, 80, 4);
  }
  // cat in the left window
  fillEllipse(108, 284, 20, 11, '#2a2130'); fillEllipse(124, 270, 9, 9, '#2a2130');
  tri(117, 265, 119, 252, 125, 263, '#2a2130'); tri(125, 263, 131, 252, 133, 267, '#2a2130');
  fillEllipse(122, 270, 1.6, 2.4, '#ffe27a'); fillEllipse(128, 270, 1.6, 2.4, '#ffe27a');
  // porch roof and walls
  tri(190, 262, 330, 205, 470, 262, '#2a2540');
  ctx.fillStyle = '#e7dcc4'; ctx.fillRect(196, 262, 268, 12);
  ctx.fillStyle = '#2f5760'; ctx.fillRect(224, 274, 212, 98);
  ctx.fillStyle = '#7b2f35'; ctx.fillRect(300, 288, 64, 84);
  ctx.fillStyle = '#5f2229'; ctx.fillRect(306, 326, 22, 40); ctx.fillRect(336, 326, 22, 40);
  ctx.fillStyle = '#ffd58a'; ctx.fillRect(310, 296, 44, 24);
  ctx.fillStyle = '#7b2f35'; ctx.fillRect(330, 296, 3, 24);
  fillEllipse(356, 336, 2.6, 2.6, '#f2c230');
  // columns
  ctx.fillStyle = '#e7dcc4';
  ctx.beginPath(); ctx.moveTo(208, 274); ctx.lineTo(222, 274); ctx.lineTo(226, 372); ctx.lineTo(204, 372); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(438, 274); ctx.lineTo(452, 274); ctx.lineTo(456, 372); ctx.lineTo(434, 372); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8b8478'; ctx.fillRect(202, 340, 26, 32); ctx.fillRect(432, 340, 26, 32);
  // foundation and lawn
  ctx.fillStyle = '#5a5660'; ctx.fillRect(30, 372, 570, 12);
  var lg = ctx.createLinearGradient(0, 384, 0, 452); lg.addColorStop(0, '#244d3d'); lg.addColorStop(1, '#3a7355');
  ctx.fillStyle = lg; ctx.fillRect(0, 384, W, 68);
  ctx.strokeStyle = 'rgba(160,220,150,.25)'; ctx.lineWidth = 1.2;
  for (var gi = 0; gi < 140; gi++) { var gx = hash(gi) * W, gy = 388 + hash(gi + 77) * 60; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 2, gy - 6); ctx.stroke(); }
  ctx.fillStyle = '#8a8d9c'; ctx.fillRect(236, 432, 188, 20);
  // deck and steps
  ctx.fillStyle = '#9a6d47'; ctx.fillRect(200, 372, 260, 20);
  ctx.fillStyle = '#b98d5e'; ctx.fillRect(200, 372, 260, 3);
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
  for (var bx2 = 214; bx2 < 460; bx2 += 26) { ctx.beginPath(); ctx.moveTo(bx2, 375); ctx.lineTo(bx2, 392); ctx.stroke(); }
  ctx.fillStyle = '#b98d5e'; ctx.fillRect(232, 392, 196, 20);
  ctx.fillStyle = '#d3a873'; ctx.fillRect(228, 388, 204, 6);
  ctx.fillStyle = '#a67b50'; ctx.fillRect(218, 412, 224, 20);
  ctx.fillStyle = '#c99d68'; ctx.fillRect(214, 408, 232, 6);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(232, 408, 196, 4); ctx.fillRect(218, 428, 224, 4);
  ctx.fillStyle = '#e7dcc4'; ctx.fillRect(198, 330, 12, 62); ctx.fillRect(450, 330, 12, 62);
  fillEllipse(204, 330, 9, 5, '#e7dcc4'); fillEllipse(456, 330, 9, 5, '#e7dcc4');
  // leftover pumpkin
  fillEllipse(258, 377, 16, 14, '#e08a2c', 0.08); fillEllipse(250, 377, 8, 13, '#c96f1c'); fillEllipse(266, 377, 8, 13, '#c96f1c');
  ctx.fillStyle = '#3d5a2a'; ctx.fillRect(256, 361, 4, 6);
  tri(250, 372, 254, 376, 246, 376, '#3b1d0a'); tri(264, 372, 268, 376, 260, 376, '#3b1d0a');
  ctx.strokeStyle = '#3b1d0a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(249, 385); ctx.quadraticCurveTo(258, 380, 267, 385); ctx.stroke();
  // compost bin
  ctx.fillStyle = '#3f8f55'; rr(482, 396, 52, 46, 5); ctx.fill();
  ctx.save(); ctx.translate(480, 396); ctx.rotate(-0.12); ctx.fillStyle = '#2f6e41'; rr(0, -9, 58, 11, 4); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#f2d34a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(522, 398); ctx.quadraticCurveTo(536, 400, 534, 412); ctx.stroke();
  ctx.fillStyle = '#e8f3ea'; ctx.font = '600 9px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('COMPOST', 508, 424);
  fillEllipse(490, 443, 4, 4, '#1c1c24'); fillEllipse(526, 443, 4, 4, '#1c1c24');
  // fern pot
  ctx.fillStyle = '#b5593a'; ctx.beginPath(); ctx.moveTo(158, 410); ctx.lineTo(188, 410); ctx.lineTo(184, 440); ctx.lineTo(162, 440); ctx.closePath(); ctx.fill();
  for (var fi = 0; fi < 7; fi++) { var fa = -2.6 + fi * 0.36; fillEllipse(173 + Math.cos(fa) * 16, 406 + Math.sin(fa) * 14, 13, 4, '#3f9a5a', fa); }
  // sidewalk, curb, street
  var sg = ctx.createLinearGradient(0, 452, 0, 520); sg.addColorStop(0, '#6c7084'); sg.addColorStop(1, '#8b8fa3');
  ctx.fillStyle = sg; ctx.fillRect(0, 452, W, 68);
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2;
  for (var jx = 60; jx < W; jx += 130) { ctx.beginPath(); ctx.moveTo(jx, 452); ctx.lineTo(jx, 520); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0, 456); ctx.lineTo(W, 456); ctx.stroke();
  ctx.fillStyle = '#565a6b'; ctx.fillRect(0, 520, W, 10); ctx.fillStyle = '#6d7185'; ctx.fillRect(0, 520, W, 3);
  ctx.fillStyle = '#23252f'; ctx.fillRect(0, 530, W, 10);
  var lv = ['#d9843b', '#b8561e', '#e6b13c'];
  for (var li = 0; li < 46; li++) { fillEllipse(hash(li + 300) * W, 392 + hash(li + 500) * 124, 3.4, 1.8, lv[li % 3], hash(li) * 3); }
  fillEllipse(620, 496, 16, 46, 'rgba(255,214,140,.16)');
  // street lamp
  ctx.fillStyle = '#252233'; ctx.fillRect(636, 262, 8, 258);
  ctx.strokeStyle = '#252233'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(640, 268); ctx.quadraticCurveTo(626, 256, 606, 262); ctx.stroke();
  fillEllipse(606, 265, 15, 6, '#252233'); fillEllipse(606, 271, 9, 4, '#ffe3a3');
  ctx.fillStyle = '#1e7a4d'; rr(612, 300, 58, 18, 3); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = '600 10px ' + FONT; ctx.textAlign = 'center'; ctx.fillText('NW 58th St', 641, 313);
  var lg2 = ctx.createRadialGradient(606, 272, 4, 606, 272, 150); lg2.addColorStop(0, 'rgba(255,214,140,.5)'); lg2.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = lg2; ctx.fillRect(456, 122, 300, 300);
  // porch light
  ctx.fillStyle = '#2b2630'; rr(256, 292, 12, 18, 3); ctx.fill(); fillEllipse(262, 303, 4, 6, '#ffe3a3');
  var pg = ctx.createRadialGradient(262, 303, 3, 262, 303, 90); pg.addColorStop(0, 'rgba(255,205,110,.6)'); pg.addColorStop(1, 'rgba(255,205,110,0)');
  ctx.fillStyle = pg; ctx.fillRect(172, 213, 180, 180);
}

/* ---------- Jimothy ---------- */
var FUR = '#8f8b99', FUR_D = '#625e70', FUR_L = '#bdb9c7', MASK = '#2b2833', PINK = '#f0a8b8';
function drawSlice(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(0, -9); ctx.lineTo(0, 9); ctx.closePath(); ctx.fillStyle = '#f3c344'; ctx.fill();
  fillEllipse(1, 0, 3.6, 9.5, '#c98a47');
  fillEllipse(12, -1, 3, 3, '#b93a2c'); fillEllipse(17, 3, 2.6, 2.6, '#b93a2c'); fillEllipse(15, -4.5, 2.2, 2.2, '#b93a2c');
  ctx.restore();
}
function drawJimothy() {
  var pose = J.pose, it = G.mode === 'play' ? G.itch : 0, t = G.t;
  var ox = J.x, oy = J.y - J.hopY;
  if (pose === 'frozen' && it > 0.45) ox += (Math.random() - 0.5) * it * 3.4;
  ctx.save(); ctx.translate(ox, oy); ctx.scale(1.1, 1.1 * (pose === 'sneeze' ? 0.93 : 1));
  fillEllipse(0, 3, 50, 6, 'rgba(0,0,0,.28)');
  var a;
  if (pose === 'eat') a = 0.5 - 0.5 * Math.cos(J.eat * 5.2); else if (pose === 'frozen') a = 0.88; else if (pose === 'sneeze') a = 0.2; else a = 0.1;
  var hx = lerp(38, 52, a), hy = lerp(-16, -34, a);
  if (pose === 'caught') { hx = 46; hy = -72; }
  // far limbs (long legs)
  limb(12, -34, 32, -3, 9, FUR_D); fillEllipse(33, -2, 7, 4.2, MASK);
  limb(-22, -16, 14, -4, 11, FUR_D); fillEllipse(19, -3, 7, 4.5, MASK);
  var bob = pose === 'eat' ? Math.sin(t * 6) * 0.8 : (pose === 'frozen' ? Math.sin(t * 2.4) * 0.5 : 0);
  ctx.save(); ctx.translate(0, bob);
  // round body with arched spine
  fillEllipse(-6, -36, 38, 30, FUR);
  fillEllipse(-16, -54, 32, 22, FUR, -0.15);
  fillEllipse(10, -28, 22, 19, FUR_L);
  ctx.strokeStyle = 'rgba(30,26,45,.3)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-44, -44); ctx.quadraticCurveTo(-24, -80, 10, -70); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,26,45,.2)'; ctx.lineWidth = 2;
  for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-36 + k * 11, -62 + Math.abs(k - 2) * 5); ctx.lineTo(-32 + k * 11, -56 + Math.abs(k - 2) * 5); ctx.stroke(); }
  // near hind leg
  fillEllipse(-16, -16, 20, 14, FUR); limb(-6, -9, 22, -3, 11, FUR); fillEllipse(26, -3, 7, 4.6, MASK);
  // head
  ctx.save(); ctx.translate(40, -52);
  var tilt = 0;
  if (pose === 'eat') tilt = Math.sin(J.eat * 5.2) * 0.05;
  else if (pose === 'sneeze') tilt = -0.35 + Math.sin(t * 30) * 0.05;
  else if (pose === 'caught') tilt = 0.15;
  ctx.rotate(tilt);
  var earUp = pose === 'frozen' ? -3 : 0;
  tri(-6, -16 + earUp, 0, -34 + earUp, 12, -20 + earUp, FUR_D);
  tri(-16, -14 + earUp, -14, -34 + earUp, 2, -20 + earUp, FUR);
  tri(-13, -17 + earUp, -12, -29 + earUp, -2, -21 + earUp, PINK);
  ctx.beginPath(); ctx.moveTo(-18, -14); ctx.quadraticCurveTo(0, -24, 22, -8); ctx.quadraticCurveTo(34, -2, 34, 4);
  ctx.quadraticCurveTo(30, 10, 20, 12); ctx.quadraticCurveTo(0, 22, -16, 12); ctx.quadraticCurveTo(-26, 0, -18, -14); ctx.closePath();
  ctx.fillStyle = FUR_L; ctx.fill();
  tri(-18, 4, -32, 12, -14, 15, FUR_L);
  fillEllipse(6, -3, 16, 8, MASK, 0.15);
  fillEllipse(8, -15, 9, 3, '#e6e3ec', 0.25);
  fillEllipse(22, 6, 11, 7, '#ecebf2');
  fillEllipse(32, 2.5, 4.8, 3.6, '#1d1b22'); fillEllipse(31, 1.4, 1.4, 1, '#ffffff');
  // eyes
  var eR = pose === 'frozen' ? 6.6 : (pose === 'caught' ? 7.4 : 5.2);
  if (pose === 'frozen' && it > 0.8) eR *= 1 + Math.sin(t * 40) * 0.08;
  if (pose === 'sneeze') {
    ctx.strokeStyle = '#ecebf2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(12, -4); ctx.lineTo(4, 1); ctx.stroke();
  } else {
    fillEllipse(9, -4, eR, eR * 1.05, '#ffffff');
    var pr = pose === 'frozen' ? 2.4 : (pose === 'caught' ? 1.8 : 2.8);
    fillEllipse(9 + 1.6, -4 + 1, pr, pr, '#15131a'); fillEllipse(9 + 2.2, -4.4, 0.9, 0.9, '#ffffff');
  }
  if (pose === 'frozen') { ctx.strokeStyle = FUR_D; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(3, -13); ctx.lineTo(15, -11); ctx.stroke(); }
  // mouth
  var jaw = pose === 'eat' ? (a > 0.8 ? Math.abs(Math.sin(t * 14)) * 3 : 0) : (pose === 'frozen' ? 2.2 : (pose === 'sneeze' ? 7 : (pose === 'caught' ? 8 : 0)));
  if (jaw > 0.5) { fillEllipse(28, 11 + jaw * 0.3, 5, jaw * 0.8, '#1d1b22'); }
  else { ctx.strokeStyle = '#1d1b22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(24, 10); ctx.quadraticCurveTo(29, 14, 34, 9); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
  var wh = [[28, 5, 48, -1], [29, 7, 50, 6], [28, 9, 47, 13]];
  for (var w = 0; w < wh.length; w++) { ctx.beginPath(); ctx.moveTo(wh[w][0], wh[w][1]); ctx.lineTo(wh[w][2], wh[w][3]); ctx.stroke(); }
  if (it > 0.5 && pose === 'frozen') {
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.quadraticCurveTo(-16, -21, -10, -18); ctx.quadraticCurveTo(-4, -21, -10, -30); ctx.fillStyle = '#7bd3ff'; ctx.fill();
  }
  ctx.restore(); // head
  // front arm and paw
  ctx.strokeStyle = FUR; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(14, -34); ctx.quadraticCurveTo((14 + hx) / 2 - 6, (-34 + hy) / 2 + 12, hx, hy); ctx.stroke();
  fillEllipse(hx, hy, 6.5, 6, MASK);
  if (pose !== 'caught') drawSlice(hx + 3, hy - 2, a > 0.5 ? -0.75 : -0.3);
  ctx.restore(); // body bob
  ctx.restore();

  // bubbles
  if (pose === 'frozen' && J.frozenFor > 0.5 && G.mode === 'play') bubble(J.thought, J.x + 6, J.y - 118, { fill: '#e9f0ff', size: 14 });
  else if (pose === 'sneeze') bubble('ACHOO!', J.x + 20, J.y - 108, { size: 18, fill: '#fff3c4' });
  else if (pose === 'caught') bubble(J.caughtLine, J.x + 6, J.y - 118, { size: 14 });
}

/* ---------- dogs ---------- */
function dogEar(p, tell) {
  var hr = p.hr;
  if (p.ear === 'point') { tri(-hr * 0.5, -hr * 0.6, -hr * 0.7, -hr * 1.75 - tell * 4, hr * 0.25, -hr * 0.85, p.col); tri(-hr * 0.42, -hr * 0.75, -hr * 0.6, -hr * 1.45 - tell * 3, hr * 0.05, -hr * 0.9, PINK); }
  else if (p.ear === 'big') { tri(-hr * 0.3, -hr * 0.5, -hr * 1.1, -hr * 2.2 - tell * 5, hr * 0.55, -hr * 0.8, p.col); tri(-hr * 0.3, -hr * 0.65, -hr * 0.9, -hr * 1.8 - tell * 4, hr * 0.3, -hr * 0.85, PINK); }
  else if (p.ear === 'floppy') { ctx.save(); ctx.translate(-hr * 0.35, -hr * 0.35); ctx.rotate(0.35 - tell * 1.0); fillEllipse(0, hr * 0.7, hr * 0.4, hr * 0.85, p.dark); ctx.restore(); }
  else if (p.ear === 'floppy-small') { ctx.save(); ctx.translate(-hr * 0.3, -hr * 0.4); ctx.rotate(0.2 - tell * 0.8); fillEllipse(0, hr * 0.35, hr * 0.38, hr * 0.55, p.mask); ctx.restore(); }
  else if (p.ear === 'poof') { fillEllipse(-hr * 0.5, hr * 0.25, hr * 0.6, hr * 0.75, p.col); fillEllipse(-hr * 0.1, -hr * 0.95, hr * 0.75, hr * 0.65, p.col); }
  else if (p.ear === 'hairy') { ctx.save(); ctx.translate(-hr * 0.35, -hr * 0.3); ctx.rotate(0.3 - tell * 0.9); fillEllipse(0, hr * 0.8, hr * 0.5, hr * 1.0, p.col2); ctx.restore(); }
}
function dogHeadProfile(p, tell, sx) {
  var hr = p.hr;
  ctx.save(); ctx.scale(Math.max(sx, 0.02), 1);
  dogEar(p, tell);
  fillEllipse(0, 0, hr, hr * 0.95, p.col);
  fillEllipse(hr * 0.5 + p.sn / 2, hr * 0.25, p.sn / 2 + hr * 0.4, hr * 0.45, p.mask || p.col2);
  fillEllipse(hr * 0.5 + p.sn + hr * 0.3, hr * 0.1, hr * 0.2, hr * 0.16, '#241f26');
  fillEllipse(hr * 0.3, -hr * 0.2, hr * 0.15, hr * 0.15, '#241f26'); fillEllipse(hr * 0.34, -hr * 0.26, hr * 0.05, hr * 0.05, '#ffffff');
  ctx.strokeStyle = '#241f26'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hr * 0.5 + p.sn + hr * 0.2, hr * 0.5); ctx.lineTo(hr * 0.3, hr * 0.55); ctx.stroke();
  fillEllipse(hr * 0.5 + p.sn * 0.55, hr * 0.78, hr * 0.14, hr * (0.16 + 0.08 * Math.sin(G.t * 9)), PINK);
  if (p.shaggy) { fillEllipse(hr * 0.35, -hr * 0.45, hr * 0.7, hr * 0.35, p.col2); }
  ctx.restore();
}
function dogHeadFront(p, tell, sx) {
  var hr = p.hr;
  ctx.save(); ctx.scale(Math.max(sx, 0.02), 1);
  if (p.ear === 'point') { tri(-hr * 0.95, -hr * 0.5, -hr * 0.85, -hr * 2.0 - tell * 3, -hr * 0.2, -hr * 0.9, p.col); tri(hr * 0.95, -hr * 0.5, hr * 0.85, -hr * 2.0 - tell * 3, hr * 0.2, -hr * 0.9, p.col); }
  else if (p.ear === 'big') { tri(-hr * 1.0, -hr * 0.4, -hr * 1.5, -hr * 2.2 - tell * 4, -hr * 0.2, -hr * 0.8, p.col); tri(hr * 1.0, -hr * 0.4, hr * 1.5, -hr * 2.2 - tell * 4, hr * 0.2, -hr * 0.8, p.col); }
  else if (p.ear === 'floppy' || p.ear === 'hairy') { var ec = p.ear === 'hairy' ? p.col2 : p.dark; fillEllipse(-hr * 1.0, hr * 0.35, hr * 0.42, hr * 0.95, ec, 0.12); fillEllipse(hr * 1.0, hr * 0.35, hr * 0.42, hr * 0.95, ec, -0.12); }
  else if (p.ear === 'floppy-small') { fillEllipse(-hr * 0.95, -hr * 0.1, hr * 0.38, hr * 0.55, p.mask, 0.3); fillEllipse(hr * 0.95, -hr * 0.1, hr * 0.38, hr * 0.55, p.mask, -0.3); }
  else if (p.ear === 'poof') { fillEllipse(-hr * 1.0, hr * 0.2, hr * 0.6, hr * 0.8, p.col); fillEllipse(hr * 1.0, hr * 0.2, hr * 0.6, hr * 0.8, p.col); fillEllipse(0, -hr * 1.0, hr * 0.8, hr * 0.65, p.col); }
  fillEllipse(0, 0, hr * 1.08, hr, p.col);
  fillEllipse(0, hr * 0.42, hr * 0.6, hr * 0.45, p.mask || p.col2);
  for (var s = -1; s <= 1; s += 2) {
    var ex = s * hr * 0.48, ey = -hr * 0.18;
    fillEllipse(ex, ey, hr * 0.27, hr * 0.27, '#ffffff'); fillEllipse(ex, ey + hr * 0.03, hr * 0.14, hr * 0.14, '#241f26'); fillEllipse(ex + hr * 0.04, ey - hr * 0.04, hr * 0.045, hr * 0.045, '#ffffff');
    ctx.strokeStyle = '#241f26'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ex + s * hr * 0.34, ey - hr * 0.42); ctx.lineTo(ex - s * hr * 0.26, ey - hr * 0.2); ctx.stroke();
  }
  fillEllipse(0, hr * 0.28, hr * 0.2, hr * 0.14, '#241f26');
  ctx.strokeStyle = '#241f26'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(-hr * 0.14, hr * 0.48, hr * 0.14, 0, Math.PI); ctx.arc(hr * 0.14, hr * 0.48, hr * 0.14, 0, Math.PI); ctx.stroke();
  ctx.restore();
}
function drawDog(P) {
  var p = P.spec.dog, x = P.dogX, y = DOG_Y, ph = P.phase, look = P.look, tell = P.tellT;
  var wag = Math.sin(G.t * (look > 0.5 ? 3 : 13)) * (look > 0.5 ? 0.2 : 1);
  ctx.save(); ctx.translate(x, y);
  fillEllipse(0, 2, p.len * 0.6, 5, 'rgba(0,0,0,.25)');
  var bodyCY = -p.leg - p.h / 2 + 3;
  var bob = Math.sin(ph * 2) * 1.1 * (1 - look * 0.6);
  var sw = p.leg * 0.55 * (1 - look * 0.55);
  function leg(hxx, pp, col) {
    var s = Math.sin(pp), c = Math.cos(pp);
    var fx = hxx + s * sw, fy = -Math.max(0, c) * p.leg * 0.22;
    limb(hxx, -p.leg + 5, fx, fy - 2, p.lw, col);
    fillEllipse(fx + 2, fy - 1, p.lw * 0.62, p.lw * 0.45, col);
    if (p.puffs) fillEllipse(fx, fy - 6, p.lw * 1.05, p.lw * 1.05, col);
  }
  leg(p.len / 2 - 10, ph + Math.PI, p.dark); leg(-p.len / 2 + 10, ph, p.dark);
  ctx.lineCap = 'round';
  if (p.tail === 'stub') fillEllipse(-p.len / 2 - 1, bodyCY + bob - p.h * 0.15, 5, 4.5, p.col);
  else if (p.tail === 'long') { ctx.strokeStyle = p.col; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-p.len / 2 + 3, bodyCY + bob - 2); ctx.quadraticCurveTo(-p.len / 2 - 14, bodyCY - 6 + wag * 5, -p.len / 2 - 20, bodyCY - 20 + wag * 6); ctx.stroke(); }
  else if (p.tail === 'curl') { ctx.strokeStyle = p.dark; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(-p.len / 2 + 2, bodyCY + bob - p.h * 0.38, 6, 0.4, TAU - 0.4); ctx.stroke(); }
  else if (p.tail === 'pom') { ctx.strokeStyle = p.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-p.len / 2 + 2, bodyCY + bob - 6); ctx.lineTo(-p.len / 2 - 8, bodyCY - 18); ctx.stroke(); fillEllipse(-p.len / 2 - 10, bodyCY - 24 + wag * 3, 9, 9, p.col); }
  else if (p.tail === 'whip') { ctx.strokeStyle = p.col; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-p.len / 2 + 2, bodyCY + bob - 3); ctx.quadraticCurveTo(-p.len / 2 - 10, bodyCY - 8, -p.len / 2 - 14, bodyCY - 20 + wag * 4); ctx.stroke(); }
  fillEllipse(0, bodyCY + bob, p.len / 2, p.h / 2, p.col);
  fillEllipse(2, bodyCY + bob + p.h * 0.18, p.len * 0.38, p.h * 0.26, p.col2);
  if (p.shaggy) for (var i = -3; i <= 3; i++) fillEllipse(i * p.len / 7, bodyCY + bob + p.h / 2 - 2, 8, 9, p.col);
  if (p.puffs) fillEllipse(p.len / 2 - 4, bodyCY + bob + 2, 12, 13, p.col);
  leg(p.len / 2 - 10, ph, p.col); leg(-p.len / 2 + 10, ph + Math.PI, p.col);
  var hr = p.hr, hx = p.len / 2 + 2, hy = bodyCY + bob - p.h * 0.38 - tell * 4;
  fillEllipse(hx - hr * 0.35, hy + hr * 0.9, hr * 0.85, hr * 1.0, p.col);
  ctx.save(); ctx.translate(hx - hr * 0.25, hy + hr * 0.95); ctx.rotate(0.35); fillEllipse(0, 0, hr * 0.28, hr * 0.8, '#d6453d'); ctx.restore();
  fillEllipse(hx + hr * 0.1, hy + hr * 1.75, 3, 3, '#f2c230');
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-tell * 0.1);
  if (look < 0.5) dogHeadProfile(p, tell, 1 - look * 2); else dogHeadFront(p, tell, (look - 0.5) * 2);
  ctx.restore();
  ctx.restore();
  P.collar.x = x + hx - hr * 0.15; P.collar.y = y + hy + hr * 1.0;
  P.head.x = x + hx; P.head.y = y + hy;
}

/* ---------- grandmas ---------- */
function drawGrandma(P) {
  var g = P.spec.g, x = P.x, y = GM_Y, ph = P.phase;
  var bob = Math.abs(Math.sin(ph)) * 2.2;
  ctx.save(); ctx.translate(x, y);
  fillEllipse(0, 2, 24, 5, 'rgba(0,0,0,.25)');
  function leg(pp) {
    var s = Math.sin(pp), c = Math.cos(pp);
    var fx = -2 + s * 11, fy = -Math.max(0, c) * 5;
    limb(-2, -44 - bob, fx, fy - 3, 5.5, g.sock); fillEllipse(fx + 3, fy - 1.5, 8, 3.8, g.shoe);
  }
  leg(ph + Math.PI); leg(ph);
  ctx.translate(0, -bob);
  if (g.acc === 'umbrella') {
    ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(-10, -150); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-54, -148); ctx.quadraticCurveTo(-10, -212, 34, -148); ctx.quadraticCurveTo(14, -156, -10, -148); ctx.quadraticCurveTo(-30, -156, -54, -148); ctx.closePath();
    ctx.fillStyle = g.accC; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -190); ctx.lineTo(-34, -150); ctx.moveTo(-10, -190); ctx.lineTo(12, -150); ctx.stroke();
  }
  // far arm with bag
  var sway = Math.sin(ph) * 0.15;
  limb(-6, -84, -12, -60, 8, g.card); fillEllipse(-12, -58, 4.4, 4.4, g.skin);
  if (g.acc === 'purse') {
    ctx.save(); ctx.translate(-12, -56); ctx.rotate(sway); ctx.strokeStyle = g.accC; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 4, 7, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = g.accC; rr(-9, 4, 18, 13, 3); ctx.fill(); ctx.restore();
  } else if (g.acc === 'tote') {
    ctx.save(); ctx.translate(-12, -56); ctx.rotate(sway);
    ctx.strokeStyle = '#d9d4c8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-9, -14); ctx.moveTo(3, 6); ctx.lineTo(9, -16); ctx.stroke();
    fillEllipse(-9, -15, 3.4, 3.4, '#e46a5a'); fillEllipse(9, -17, 3.4, 3.4, '#e46a5a');
    ctx.fillStyle = g.accC; rr(-12, 4, 24, 20, 4); ctx.fill(); ctx.restore();
  }
  // dress and cardigan
  ctx.beginPath(); ctx.moveTo(-12, -90); ctx.quadraticCurveTo(-26, -60, -20, -40); ctx.lineTo(18, -40); ctx.quadraticCurveTo(22, -62, 12, -90); ctx.closePath();
  ctx.fillStyle = g.dress; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12, -90); ctx.quadraticCurveTo(-26, -60, -20, -40); ctx.lineTo(-2, -42); ctx.lineTo(0, -88); ctx.closePath();
  ctx.fillStyle = g.card; ctx.fill();
  if (g.acc === 'pearls') for (var pi = 0; pi < 7; pi++) fillEllipse(-4 + pi * 2.8, -89 + Math.sin(pi / 6 * Math.PI) * 4, 1.7, 1.7, '#ffffff');
  // near arm and leash hand
  var hy = -66 + Math.sin(ph) * 2;
  limb(2, -84, 26, hy, 9, g.card); fillEllipse(26, hy, 4.8, 4.8, g.skin);
  P.hand.x = x + 26; P.hand.y = y - bob + hy;
  // head
  if (g.style === 'curls') {
    var cl = [[-6, -112, 10], [-12, -103, 9], [-3, -122, 9], [8, -124, 9], [-14, -113, 8]];
    for (var ci = 0; ci < cl.length; ci++) fillEllipse(cl[ci][0], cl[ci][1], cl[ci][2], cl[ci][2], g.hair);
  } else if (g.style === 'bun') { fillEllipse(-4, -110, 16, 16, g.hair); fillEllipse(-10, -127, 8, 8, g.hair); }
  else { fillEllipse(-2, -104, 18, 19, g.hair); }
  fillEllipse(4, -106, 14, 14.5, g.skin);
  fillEllipse(18, -104, 3, 3, g.skin);
  if (g.style === 'curls') { fillEllipse(8, -119, 6, 6, g.hair); fillEllipse(15, -116, 5.5, 5.5, g.hair); }
  else if (g.style === 'bun') fillEllipse(4, -116, 14, 6, g.hair);
  else fillEllipse(6, -117, 14, 6, g.hair);
  fillEllipse(11, -108, 1.9, 1.9, '#2a2230');
  fillEllipse(9, -101, 3.6, 3.6, 'rgba(255,110,110,.35)');
  ctx.strokeStyle = '#7a3b3b'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(12, -100, 4, 0.2, 2.2); ctx.stroke();
  if (g.glasses) { ctx.strokeStyle = '#3a3340'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(11, -108, 5.4, 0, TAU); ctx.moveTo(5.8, -108); ctx.lineTo(-8, -108); ctx.stroke(); }
  if (g.acc === 'beanie') { fillEllipse(4, -118, 16, 10, g.accC); ctx.fillStyle = '#f2f0e6'; rr(-12, -114, 32, 6, 3); ctx.fill(); fillEllipse(4, -130, 5, 5, '#f2f0e6'); }
  if (g.acc === 'hat') { fillEllipse(4, -115, 21, 5, g.accC); fillEllipse(4, -121, 13, 9, g.accC); }
  ctx.restore();
}
function drawLeash(P) {
  ctx.strokeStyle = '#d6453d'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P.hand.x, P.hand.y); ctx.quadraticCurveTo((P.hand.x + P.collar.x) / 2, Math.max(P.hand.y, P.collar.y) + 12, P.collar.x, P.collar.y); ctx.stroke();
}
function drawGaze(P) {
  var tx = J.x + 14, ty = J.y - 44;
  if (P.state === 'look') {
    var al = 0.22 + Math.sin(G.t * 12) * 0.05;
    ctx.beginPath(); ctx.moveTo(P.head.x, P.head.y); ctx.lineTo(tx - 26, ty - 26); ctx.lineTo(tx + 30, ty + 40); ctx.closePath();
    ctx.fillStyle = 'rgba(255,70,70,' + al.toFixed(3) + ')'; ctx.fill();
  } else if (P.state === 'tell' && !P.fake) {
    ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,200,87,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(P.head.x, P.head.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
  }
}

/* ---------- render ---------- */
function resize() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var cw = Math.max(2, Math.round((canvas.clientWidth || W) * dpr));
  if (canvas.width !== cw) {
    canvas.width = cw; canvas.height = Math.round(cw * H / W);
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height; bgDirty = true;
  }
}
function buildBg() {
  ctx = bgCtx; ctx.setTransform(bgCanvas.width / W, 0, 0, bgCanvas.width / W, 0, 0); ctx.clearRect(0, 0, W, H);
  drawBackground(); ctx = mainCtx; bgDirty = false;
}
function render() {
  resize(); if (bgDirty) buildBg();
  var k = canvas.width / W, P = G.pair;
  var sx = 0, sy = 0;
  if (G.shake > 0 && !reduceMotion) { sx = (Math.random() - 0.5) * G.shake * 14; sy = (Math.random() - 0.5) * G.shake * 14; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgCanvas, sx * k, sy * k);
  ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
  drawJimothy();
  drawGrandma(P); drawDog(P); drawLeash(P);
  drawGaze(P);
  // dog marker
  var hrr = P.spec.dog.hr, mx = P.head.x, my = P.head.y - hrr * 2.4 - 10;
  if (G.mode === 'over') bubble('WOOF!', mx, my, { size: 22, fill: '#ffd0d0' });
  else if (P.state === 'look') bubble('!', mx, my, { size: 22, fill: '#ff8d8d' });
  else if (P.state === 'tell') bubble('?', mx, my, { size: 20, fill: '#ffe08a' });
  // grandma line
  if (P.bubble && (G.t < P.bubble.until)) bubble(P.bubble.text, P.x + 4, GM_Y - P.spec.g.top - 4, { size: 14 });
  // floaters
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (var i = 0; i < floaters.length; i++) {
    var f = floaters[i]; ctx.globalAlpha = clamp(f.life / f.max * 1.6, 0, 1);
    ctx.font = '700 26px ' + FONT; ctx.lineWidth = 5; ctx.strokeStyle = '#2a1c00'; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = '#ffc857'; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  if (!reduceMotion) {
    ctx.strokeStyle = 'rgba(200,215,255,.26)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
    for (var r = 0; r < rain.length; r++) { var d = rain[r]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.3, d.y - d.l); }
    ctx.stroke();
  }
}

/* ---------- boot ---------- */
G.pair = newPair(true, true);
el.best.textContent = G.best;
if (window.ResizeObserver) { new ResizeObserver(function () { resize(); }).observe(canvas); }
window.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { bgDirty = true; });
var last = performance.now();
function frame(now) {
  var dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
