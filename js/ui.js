import * as THREE from 'three';
import { THREADS } from './threads.js';
import {
  scene, camera, renderer, stage, lookTarget,
  loadNode, normalize, prepEmerge, setEmerge, settleEmerge, goFlat, goWarm, setThreadMood,
  aimLights
} from './scene.js';

// which material we're inside; opens on bronze — ?thread=terracotta overrides
let currentThread = 'bronze';
{
  const t = new URLSearchParams(location.search).get('thread');
  if (THREADS[t]) currentThread = t;
}
let NODES = THREADS[currentThread].nodes;
setThreadMood(THREADS[currentThread].mood);

/* ============================================================
   Overlay text
   ============================================================ */

const $prompt = document.getElementById('prompt');
// "touch it" alone: the container fades the whole block, this line carries the
// breathing pulse so the instruction beneath it stays at a steady brightness
const $promptLead = $prompt.querySelector('.prompt-lead');

// Stop both prompt tweens and re-baseline the lead. The breathing yoyo repeats
// forever, so killing only the container would leave it running against a
// hidden element and hand the next closeup a half-faded "touch it".
function killPrompt() {
  gsap.killTweensOf($prompt);
  gsap.killTweensOf($promptLead);
  gsap.set($promptLead, { opacity: 1 });
}
const $card = document.getElementById('card');
const $label = $card.querySelector('.label');
const $text = $card.querySelector('.text');
const $beats = $card.querySelector('.beats');
const $cue = document.getElementById('cue');
const $navBack = document.getElementById('nav-back');
const $navHome = document.getElementById('nav-home');
const $end = document.getElementById('end');
const $fault = document.getElementById('fault');

// A model that never arrives would otherwise leave a black screen and a state
// machine stuck in `animating` — say so instead, since the usual cause (file://)
// has a one-line fix.
function showFault(err) {
  console.error('PATINA load failure', err);
  $fault.style.display = 'flex';
}

// one dash per beat of the current node, so the reader can see how much of
// this piece's commentary is left before the surface changes
const beatEls = [];
function buildBeatRail(i) {
  $beats.innerHTML = '';
  beatEls.length = 0;
  NODES[i].beats.forEach(() => {
    const d = document.createElement('span');
    d.className = 'beat-dash';
    $beats.appendChild(d);
    beatEls.push(d);
  });
}

function markBeat(b) {
  beatEls.forEach((d, k) => d.classList.toggle('is-active', k === b));
}

// arriving at a node: label, rail and the beat we land on, all rising together
function showCard(i, b = 0) {
  $label.textContent = NODES[i].label;
  $text.textContent = NODES[i].beats[b];
  buildBeatRail(i);
  markBeat(b);
  gsap.killTweensOf($text);
  gsap.set($text, { opacity: 1, y: 0 });
  gsap.fromTo($card, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.8, ease: 'power2.out' });
  showCue(i, b);
}

// moving between beats of the SAME node: only the passage changes, so the
// placard stays put and just swaps its text — the camera never moves here
function showBeat(i, b) {
  markBeat(b);
  gsap.killTweensOf($text);
  gsap.to($text, {
    opacity: 0, y: -8, duration: 0.34, ease: 'power2.in',
    onComplete: () => {
      $text.textContent = NODES[i].beats[b];
      gsap.fromTo($text, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.62, ease: 'power2.out' });
    }
  });
}

// the scroll hint, and what it's hinting at: mid-node it means "more to read",
// on the last beat it means "the surface is about to change"
function showCue(i, b) {
  const last = b === NODES[i].beats.length - 1;
  if (last && i === NODES.length - 1) { gsap.killTweensOf($cue); gsap.to($cue, { opacity: 0, duration: 0.6 }); return; }
  $cue.querySelector('.cue-label').textContent = last ? 'keep scrolling' : 'scroll';
  gsap.killTweensOf($cue);
  gsap.to($cue, { opacity: 0.9, duration: 1.4, delay: 2.4, ease: 'power1.out' });
  gsap.to($cue, { opacity: 0.45, duration: 1.6, delay: 4.0, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

function hideCard() {
  gsap.killTweensOf($cue);
  gsap.to([$card, $cue], { opacity: 0, duration: 0.9, ease: 'power1.in' });
}

// the back step is offered on any revealed node past the first, and at the end
function updateNav() {
  const showBack = (state === 'revealed' || state === 'end') && idx > 0;
  gsap.to($navBack, { opacity: showBack ? 0.7 : 0, duration: 0.6, ease: 'power1.out' });
  $navBack.style.pointerEvents = showBack ? 'auto' : 'none';
  // the way home is offered on every screen past the picker — including the
  // closeup you land on after choosing a thread, but never on the picker itself
  // or on the opening closeup, which has nothing to go back to yet
  const showHome = state === 'revealed' || state === 'end' ||
                   (state === 'closeup' && readyToReveal);
  gsap.to($navHome, { opacity: showHome ? 0.7 : 0, duration: 0.6, ease: 'power1.out' });
  $navHome.style.pointerEvents = showHome ? 'auto' : 'none';
  updateGrabCursor();
}

// The closing screen belongs to the end of the last node's READING, not to its
// arrival — landing on the final piece only puts its first passage on screen,
// and offering "replay" over unread text ends the thread early.
let endShown = false;

function showEnd() {
  if (endShown) return;
  endShown = true;
  $end.style.pointerEvents = 'auto';
  gsap.fromTo($end, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.6, delay: 1.2, ease: 'power2.out' });
}

function hideEnd() {
  $end.style.pointerEvents = 'none';
  if (!endShown) return;
  endShown = false;
  gsap.to($end, { opacity: 0, duration: 0.6, ease: 'power1.in' });
}

// on the last node, the closing screen tracks the last beat both ways
function syncEnd() {
  if (idx === NODES.length - 1 && read.beat === beatCount() - 1) showEnd();
  else hideEnd();
}

/* ============================================================
   State machine: closeup → reveal → (advance ×4) → end
   ============================================================ */

let state = 'loading';      // loading | closeup | animating | revealed | end
let idx = 0;
let current = null;
// the very first closeup touch goes to the material picker, not straight into
// the story — once a thread's been chosen from there, later closeup touches reveal
let readyToReveal = false;
// the slow sign of life every piece keeps between gestures
const breath = { t: 0 };
// The opening closeup drifts, it does not spin. A constant idle rotation of
// ~1°/s is invisible for ten seconds and fatal for two minutes: the piece turns
// far enough to bring its own silhouette into frame and the void behind it
// shows. Anyone who leaves the title up while they read must still be looking
// at full-bleed surface, so the closeup wanders inside a fixed arc instead.
const closeupDrift = { t: 0, amp: 0.085, speed: 0.055 };

/* ============================================================
   Reading by scroll
   Scrolling is the primary action. Within a node the wheel walks the
   commentary from beat to beat and turns the piece as it goes — the reader
   is rotating the object by reading it. Scrolling off the END of the last
   beat is what fires the push-in / swap / pull-out into the next node, so the
   transition still costs a deliberate gesture rather than arriving on its own.
   ============================================================ */

const SCROLL_PER_BEAT = 620;   // px of wheel travel to cross one beat
const BEAT_HYST = 0.07;        // deadband (in beats) so jitter on a boundary can't flicker the text
// How far the piece turns per BEAT — per click, arrow press, or 620px of wheel.
// Measured per beat rather than per node so a six-beat thread and a two-beat one
// feel the same in the hand; the arc across a whole node is this × beatCount().
const DEG = Math.PI / 180;
// ONE NODE IS ONE FULL TURN. Reading a piece all the way through walks it through
// exactly 360°, so nothing is only ever seen from the front — the back of the
// Charioteer, the reverse of the Ghiberti panel and the far side of the Amazon
// all come round on the way. The per-beat step falls out of the beat count:
// a two-beat node steps 180° per gesture, a three-beat node 120°, a six-beat
// node 60°. Longer nodes turn in finer increments rather than turning further.
const FULL_TURN = 360 * DEG;
function spinPerBeat(i = idx) { return FULL_TURN / beatCount(i); }
const TOUCH_SCROLL = 2.4;      // px of scroll per px of vertical finger travel
const SWIPE_PER_BEAT = 150;    // px of accumulated swipe (after TOUCH_SCROLL) that steps a beat

const read = {
  p: 0,        // 0→1 across the current node's beats, driven straight off the wheel
  smooth: 0,   // eased follower; drives rotation, so the turn has weight
  anchor: 0,   // the progress the piece arrived at — every piece reveals front-on
  beat: 0
};

function beatCount(i = idx) { return NODES[i].beats.length; }

// How far the piece has been turned by reading, as opposed to by hand. Measured
// from the anchor, so a node entered backwards still arrives face-front and
// then turns the other way as the reader keeps scrolling up through it.
// read.smooth/anchor already run 0→1 across the WHOLE node, so one full turn is
// simply the span itself — no beat-count scaling, and no slab exception. Slabs
// (`sway`) do pass edge-on twice on the way round; that is the cost of showing
// every face, and they land front-on again at the end of the node. `sway` still
// deepens the idle breath, it just no longer narrows the reading arc.
function scrollSpin() {
  return (read.smooth - read.anchor) * FULL_TURN;
}

// park progress at the middle of a beat: used when arriving at a node backwards,
// and when a click or key jumps a whole beat rather than scrolling into it
function beatCentre(b, i = idx) { return (b + 0.5) / beatCount(i); }

// Entering forward starts at the top of the first beat; entering backwards
// lands mid-way through the last one, leaving runway before a downward scroll
// carries the reader back out again.
function resetRead(i, atEnd = false) {
  read.beat = atEnd ? beatCount(i) - 1 : 0;
  read.p = atEnd ? beatCentre(read.beat, i) : 0;
  read.smooth = read.anchor = read.p;
}

// Map raw progress onto a beat with a deadband on either side of the boundary,
// so a trackpad hovering exactly on a threshold doesn't crossfade repeatedly.
function syncBeat() {
  const n = beatCount();
  const x = read.p * n;
  let b = read.beat;
  while (b < n - 1 && x >= b + 1 + BEAT_HYST) b++;
  while (b > 0 && x < b - BEAT_HYST) b--;
  if (b !== read.beat) {
    read.beat = b;
    showBeat(idx, b);
    showCue(idx, b);
    syncEnd();
  }
}

// Pixel-metered reading: `dy` px of travel moves the reader proportionally.
// NOTHING IN THE LIVE INPUT PATH CALLS THIS ANY MORE — wheel, keys and swipe all
// go through stepScroll() so that one gesture is exactly one beat. It survives
// as the `?debug` hook's scrubber (`addScroll(620)` = one beat's worth) because
// sub-beat positions are useful when tuning rotation, and as the definition of
// SCROLL_PER_BEAT that `read.p` is still expressed in.
function addScroll(dy) {
  if (!dy) return;
  // before the story starts, a downward scroll is just "go on": it opens the
  // picker, or (once a material is chosen) reveals the first piece
  if (state === 'closeup') {
    if (dy > 0) readyToReveal ? reveal() : goToSelect();
    return;
  }
  if (state !== 'revealed' && state !== 'end') return;

  // the hint has done its job the moment they scroll
  gsap.killTweensOf($cue);
  gsap.to($cue, { opacity: 0, duration: 0.5, ease: 'power1.in' });

  read.p += dy / (SCROLL_PER_BEAT * beatCount());

  if (read.p >= 1) {
    read.p = 1;
    if (idx < NODES.length - 1) { advance(); return; }
  } else if (read.p < 0) {
    read.p = 0;
    // scrolling back off the top of a node returns to the END of the previous
    // one, the way reading backwards through anything else does
    if (idx > 0) { goBack(); return; }
  }
  syncBeat();
}

/* One gesture, one beat.
   A trackpad reports a flick as a burst of dozens of wheel events whose total
   delta depends on how hard it was thrown, so metering the reading by pixels
   (`addScroll`) made the flick's VELOCITY decide whether the reader crossed one
   beat or three. Counting gestures instead of pixels is what makes it
   predictable: a burst of wheel events with no gap longer than GESTURE_GAP is
   ONE gesture and moves exactly one beat, however far it travelled.

   Trackpad momentum keeps firing events for up to a second after the finger
   lifts; because every one of those refreshes `lastEvent`, the whole coasting
   tail stays inside the same gesture and cannot smuggle in extra beats. */
const WHEEL_TRIGGER = 8;    // px of accumulated delta before a gesture counts at all
const GESTURE_GAP = 160;    // ms of quiet that ends a gesture, momentum tail included
const REPEAT_MS = 420;      // a held, continuous scroll keeps stepping at this cadence
const SUSTAIN_RATIO = 0.7;  // a repeat needs ≥70% of the gesture's peak delta: momentum decays below it

const wheelGate = { accum: 0, dir: 0, lastEvent: 0, lastStep: 0, peak: 0, locked: false };

function wheelStep(dy) {
  if (!dy) return;
  const now = performance.now();
  const dir = Math.sign(dy);
  const mag = Math.abs(dy);
  // a gap in the stream ends the previous gesture; so does reversing direction,
  // so the reader can always turn straight back without waiting one out
  if (now - wheelGate.lastEvent > GESTURE_GAP || dir !== wheelGate.dir) {
    wheelGate.locked = false;
    wheelGate.accum = 0;
    wheelGate.peak = 0;
    wheelGate.dir = dir;
  }
  wheelGate.lastEvent = now;
  wheelGate.peak = Math.max(wheelGate.peak, mag);
  if (wheelGate.locked) {
    // A held scroll should keep advancing rather than sit dead, but a coasting
    // trackpad must not. Both are just wheel events after the first beat, and
    // time alone can't separate them: a hard flick's momentum tail outlasts any
    // cadence you pick, which is what made one flick jump two passages. What
    // does separate them is MAGNITUDE — momentum decays by definition, while a
    // finger still pushing holds near the gesture's peak. So a repeat needs
    // both the cadence AND a delta that hasn't decayed.
    if (now - wheelGate.lastStep < REPEAT_MS) return;
    if (mag < wheelGate.peak * SUSTAIN_RATIO) return;   // coasting, not pushing
    wheelGate.locked = false;
    wheelGate.accum = 0;
    wheelGate.peak = mag;   // re-baseline, so a slow decay can't creep past the test
  }
  wheelGate.accum += dy;
  if (Math.abs(wheelGate.accum) < WHEEL_TRIGGER) return;
  wheelGate.locked = true;
  wheelGate.lastStep = now;
  wheelGate.accum = 0;
  stepScroll(dir);
}

// one gesture's worth of "go on", whatever produced it: before the story starts
// it opens the picker or reveals the first piece, inside it steps one beat
function stepScroll(dir) {
  if (state === 'closeup') {
    if (dir > 0) readyToReveal ? reveal() : goToSelect();
    return;
  }
  if (state !== 'revealed' && state !== 'end') return;
  // the hint has done its job the moment they scroll
  gsap.killTweensOf($cue);
  gsap.to($cue, { opacity: 0, duration: 0.5, ease: 'power1.in' });
  stepBeat(dir);
}

// discrete step, for the click fallback and the arrow keys: one whole beat,
// then off the end of the node into the transition
function stepBeat(dir) {
  if (state !== 'revealed' && state !== 'end') return;
  const target = read.beat + dir;
  if (target >= beatCount()) { if (idx < NODES.length - 1) advance(); return; }
  if (target < 0) { if (idx > 0) goBack(); return; }
  read.p = beatCentre(target);
  syncBeat();
}

// Where the camera aims for a given node. The marble thread spans a 6cm grave
// figurine and a 12-ton enthroned colossus, so a single shared look target
// (node 0's) aims below centre on the tall pieces and cuts their heads off.
// Nodes without an explicit lookY keep the old behaviour: node 0's height.
function nodeLookY(n) {
  return n.lookY ?? (NODES[0].closeup?.lookY ?? NODES[0].height * 0.95);
}

function cameraTo(dist, duration, lookY = lookTarget.y, ease = 'power2.inOut') {
  gsap.to(lookTarget, { y: lookY, duration, ease });
  return gsap.to(camera.position, {
    x: 0, y: lookY + 0.35, z: dist,
    duration, ease
  });
}

// pressed against node 0's surface: full-bleed grain, no lens shift, slow drift.
// a thread's opening node can override the exact press-in point via `closeup`.
function setCloseupCamera() {
  const n = NODES[0];
  const c = n.closeup || {};
  lookTarget.set(0, c.lookY ?? n.height * 0.95, 0);
  camera.position.set(c.x ?? 0.05, c.y ?? n.height * 0.98, c.z ?? 0.34);
  viewShift.v = 0;
  applyViewOffset();
  closeupDrift.t = 0;
}

// Let the render loop breathe between preloads. Each loadNode ends in warmUp(),
// a synchronous compile + shadow + render pass; running those back to back over
// several multi-megapixel scans saturates the main thread hard enough that rAF
// stops entirely and the opening dolly never advances past its first frame.
function idleGap(timeout = 900) {
  return new Promise(res => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => res(), { timeout });
    else setTimeout(res, 150);
  });
}

function preloadThread(threadKey) {
  if (new URLSearchParams(location.search).has('solo')) return;
  (async () => {
    for (let i = 1; i < THREADS[threadKey].nodes.length; i++) {
      await idleGap();
      await loadNode(threadKey, i).catch(() => {});
    }
    // then the opening piece of every OTHER thread, so switching material from
    // the picker doesn't sit on a cold download with the scrim already fading
    for (const key of Object.keys(THREADS)) {
      if (key === threadKey) continue;
      await idleGap();
      await loadNode(key, 0).catch(() => {});
    }
  })();
}

async function start() {
  try {
    current = await loadNode(currentThread, 0);
  } catch (e) {
    showFault(e);
    return;
  }
  current.rotation.y = NODES[0].faceY || 0;
  stage.add(current);

  setCloseupCamera();
  setActiveTick(0);

  preloadThread(currentThread);
  const canvas = document.getElementById('scene');
  canvas.addEventListener('webglcontextlost', e => console.error('WEBGL CONTEXT LOST', e));
  if (new URLSearchParams(location.search).has('debug')) {
    // live-tuning hook: poke camera/model from the console
    window.__patina = {
      camera, lookTarget, viewShift, applyViewOffset, scene, stage, THREADS,
      THREE, normalize,
      // jump straight to a node while tuning framing, instead of sitting
      // through the auto-advance chain (?node=N) with its 4s dwell per step
      goToNode, reveal, loadNode, renderer, settleEmerge, goFlat, goWarm,
      // drive the reading by hand: addScroll(620) is one beat's worth of wheel
      read, addScroll, stepBeat, spin,
      // the reading rotation in radians, so the per-beat swing can be measured
      // rather than eyeballed. frame() does NOT run this — it only parks the
      // camera — so with rAF frozen (occluded window) reading current.rotation.y
      // gives a stale number and this is the only honest way to check the arc.
      scrollSpin, FULL_TURN, spinPerBeat,
      // Render one node's settled frame synchronously. rAF is throttled to zero
      // whenever this window is occluded, which stalls every GSAP tween mid-move
      // and makes screenshots useless for judging framing; this bypasses the
      // render loop entirely so a screenshot always shows the real composition.
      async frame(i) {
        const n = NODES[i];
        const pivot = await loadNode(currentThread, i);
        stage.clear();
        stage.add(pivot);
        settleEmerge(pivot);
        pivot.rotation.y = n.faceY || 0;
        current = pivot;
        idx = i;
        resetRead(i);
        spin.user = 0;
        spin.vel = 0;
        lookTarget.set(0, nodeLookY(n), 0);
        camera.position.set(0, lookTarget.y + 0.35, n.dist);
        viewShift.v = 1;
        applyViewOffset();
        camera.lookAt(lookTarget);
        aimLights();
        n.flat ? goFlat(0) : goWarm(0);
        renderer.render(scene, camera);
        showCard(i, 0);
        setActiveTick(i);
        $glow.style.left = tlPos(i) + '%';
        gsap.set($timeline, { opacity: 1 });
        return { i, dist: n.dist, height: n.height, camY: +camera.position.y.toFixed(2) };
      },
      get NODES() { return NODES; },
      get idx() { return idx; },
      get state() { return state; },
      get current() { return current; }
    };
    const box = new THREE.Box3().setFromObject(current);
    console.log('DBG box min', JSON.stringify(box.min), 'max', JSON.stringify(box.max));
    setInterval(() => {
      console.log('DBG cam', JSON.stringify(camera.position), 'state', state,
        'calls', renderer.info.render.calls, 'tris', renderer.info.render.triangles);
    }, 1500);
  }

  // dev hook: ?reveal skips the touch, ?node=N jumps ahead (for tuning framing)
  const params = new URLSearchParams(location.search);
  if (params.has('reveal') || params.has('node')) {
    state = 'closeup';
    readyToReveal = true;
    reveal();
    const n = parseInt(params.get('node') || '0', 10);
    for (let k = 0; k < n; k++) {
      await new Promise(r => setTimeout(r, 4000));
      await advance();
    }
    return;
  }

  beginCloseup({ withTitle: true });
}

// pressed against the clay; the title (first visit only) and the touch prompt
// surface out of the texture rather than living on their own screen
function beginCloseup({ withTitle }) {
  state = 'closeup';
  updateNav();
  if (withTitle) {
    gsap.to('#title-overlay h1', { opacity: 1, duration: 2.8, delay: 0.9, ease: 'power2.out' });
    gsap.to('#title-overlay .tagline', { opacity: 0.85, duration: 2.4, delay: 2.2, ease: 'power2.out' });
  }
  const pd = withTitle ? 3.8 : 0.8;
  // the block fades in whole and then STAYS up; only "touch it" breathes, so the
  // "click or scroll" instruction under it never dims out of readability
  gsap.to($prompt, { opacity: 1, duration: 2.4, delay: pd, ease: 'power1.out' });
  gsap.to($promptLead, { opacity: 0.4, duration: 2.0, delay: pd + 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

/* ============================================================
   Timeline — communicates "we are moving through time"
   ============================================================ */

const $timeline = document.getElementById('timeline');
const $glow = document.getElementById('tl-glow');
const tickEls = [];

// evenly spread the n ticks between 10% and 90% of the width
function tlPos(i) {
  const n = NODES.length;
  return n > 1 ? 10 + (80 / (n - 1)) * i : 50;
}

function buildTimeline() {
  const wrap = document.getElementById('tl-ticks');
  wrap.innerHTML = '';
  tickEls.length = 0;
  NODES.forEach((node, i) => {
    const t = document.createElement('div');
    t.className = 'tl-tick';
    t.style.left = tlPos(i) + '%';
    t.innerHTML = `<span class="tl-dot"></span><span class="tl-date">${node.era}</span>`;
    wrap.appendChild(t);
    tickEls.push(t);
  });
  $glow.style.left = tlPos(0) + '%';
}

function setActiveTick(i) {
  tickEls.forEach((t, k) => t.classList.toggle('is-active', k === i));
}

// glow slides from the current tick to `to` over `dur`, lighting it on arrival
function moveGlow(to, dur) {
  gsap.to($glow, {
    left: tlPos(to) + '%',
    duration: dur,
    ease: 'power2.inOut',
    onComplete: () => setActiveTick(to)
  });
}

function showTimeline() {
  gsap.to($timeline, { opacity: 1, duration: 1.6, ease: 'power2.out' });
}

buildTimeline();

/* ============================================================
   Landing: pressed-in closeup → texture selection → enter thread
   ============================================================ */

const $landing = document.getElementById('landing');
const $landingSelect = document.getElementById('landing-select');

// the first touch on the opening closeup doesn't reveal — it surfaces the
// material picker over the (still-visible, blurred) clay. A scrim, not a wall.
function goToSelect() {
  if (state !== 'closeup') return;
  state = 'landing';
  updateNav();
  killPrompt();
  gsap.to($prompt, { opacity: 0, duration: 0.6 });
  gsap.to('#title-overlay h1, #title-overlay .tagline', {
    opacity: 0, y: -14, duration: 1.0, ease: 'power2.in', overwrite: 'auto'
  });
  $landing.style.display = 'flex';
  $landingSelect.style.display = 'flex';
  gsap.set($landingSelect, { opacity: 1 });
  gsap.set('.swatch', { opacity: 1, y: 0 });
  gsap.fromTo($landing, { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 0.3, ease: 'power2.out' });
}

// texture selection is reachable from the opening touch AND the end screen.
// Picking the material we're already in just fades back to its closeup;
// picking the other thread swaps the clay behind the scrim first.
async function enterThread(key) {
  if (state !== 'landing') return;

  if (key !== currentThread) {
    state = 'loading';   // swallow clicks while the new thread's first piece loads
    const prevThread = currentThread;
    currentThread = key;
    NODES = THREADS[key].nodes;
    setThreadMood(THREADS[key].mood);   // marble's museum is a cooler one

    const prev = current;
    let first;
    try {
      first = await loadNode(currentThread, 0);
    } catch (e) {
      // stay on the picker with the old thread intact instead of stranding the
      // scrim over a scene that never changed
      console.error('PATINA could not open thread', key, e);
      currentThread = prevThread;
      NODES = THREADS[prevThread].nodes;
      setThreadMood(THREADS[prevThread].mood);
      state = 'landing';
      return;
    }
    if (prev && prev !== first) { stage.remove(prev); settleEmerge(prev); }
    settleEmerge(first);
    if (current !== first) stage.add(first);
    current = first;
    current.rotation.y = NODES[0].faceY || 0;
    idx = 0;
    resetRead(0);
    spin.user = 0;
    spin.vel = 0;
    goWarm(0);
    setCloseupCamera();
    buildTimeline();
    setActiveTick(0);
    preloadThread(key);
    state = 'landing';
  }

  gsap.to($landing, {
    opacity: 0, duration: 1.4, ease: 'power2.inOut',
    onComplete: () => {
      $landing.style.display = 'none';
      readyToReveal = true;   // the picker's job is done — next closeup touch reveals
      beginCloseup({ withTitle: false });
    }
  });
}

document.getElementById('swatch-terracotta').addEventListener('click', () => enterThread('terracotta'));
document.getElementById('swatch-marble').addEventListener('click', () => enterThread('marble'));
document.getElementById('swatch-bronze').addEventListener('click', () => enterThread('bronze'));

function reveal() {
  state = 'animating';
  killPrompt();
  gsap.to($prompt, { opacity: 0, duration: 0.8 });
  // overwrite kills the opening fade-ins if they're still running — otherwise
  // a long fade-in outlives this fade-out and pulls the title back up
  gsap.to('#title-overlay h1, #title-overlay .tagline', { opacity: 0, y: -14, duration: 1.2, ease: 'power2.in', overwrite: 'auto' });
  showTimeline();
  resetRead(0);
  spin.user = 0;
  spin.vel = 0;
  // the lens shift eases in with the dolly: texture slides from full-bleed
  // into the right two-thirds as the placard arrives on the left
  gsap.to(viewShift, { v: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: applyViewOffset });
  cameraTo(NODES[0].dist, 2.6, nodeLookY(NODES[0])).then(() => {
    state = 'revealed';
    showCard(0, read.beat);
    updateNav();
  });
}

const advance = () => goToNode(idx + 1);
const goBack  = () => goToNode(idx - 1);

// One reversible transition for both directions. Continuous clay: instead of
// cutting between forms, the camera presses right up against the surface — it
// goes abstract, like the opening — and the form is swapped under cover of that
// proximity and a dip to black, then the camera pulls back out to reveal the
// target piece. One clay dissolving and re-forming into the next (or previous).
async function goToNode(targetIdx) {
  if (state === 'animating') return;
  if (targetIdx < 0 || targetIdx > NODES.length - 1 || targetIdx === idx) return;

  const prevIdx = idx;
  state = 'animating';
  hideCard();
  hideEnd();
  updateNav();

  let next;
  try {
    next = await loadNode(currentThread, targetIdx);
  } catch (e) {
    // the piece never arrived: hand the screen back rather than freezing in
    // `animating`, which would swallow every later click
    console.error('PATINA could not load node', targetIdx, e);
    state = idx === NODES.length - 1 ? 'end' : 'revealed';
    // pin progress back inside the node we never left, or the next scroll would
    // fire straight off its edge again
    read.p = beatCentre(read.beat);
    read.anchor = read.smooth = read.p;
    showCard(idx, read.beat);
    updateNav();
    return;
  }
  const nextNode = NODES[targetIdx];
  const prev = current;

  prepEmerge(next);
  next.rotation.y = nextNode.faceY || 0;   // always reveal front-on, so it reads immediately

  const pushDur = 1.5;   // dolly in, pressing against the clay
  const pullDur = 2.2;   // dolly back out to frame the target form
  const nearZ = 0.5;     // how close we press in (matches the opening closeup)

  const tl = gsap.timeline();

  // Phase A — push in while the current form dims to black
  tl.to(camera.position, {
    x: 0, y: lookTarget.y + 0.05, z: nearZ,
    duration: pushDur, ease: 'power2.in'
  }, 0);
  const dim = { v: 1 };
  tl.to(dim, {
    v: 0, duration: pushDur, ease: 'power2.in',
    onUpdate: () => setEmerge(prev, dim.v)
  }, 0);

  // Apex — swap the form while pressed in and dark
  tl.add(() => {
    stage.add(next);
    stage.remove(prev);
    settleEmerge(prev);
    current = next;
    idx = targetIdx;
    // the swap is the one moment the reading position can jump without being
    // seen — we're pressed in and dark, so the piece's turn resets here too
    resetRead(targetIdx, targetIdx < prevIdx);
    spin.user = 0;
    spin.vel = 0;
    // fluorescent only on the final node; restore the museum when leaving it
    if (nextNode.flat) goFlat();
    else if (NODES[prevIdx].flat) goWarm();
  });

  // Phase B — pull back out while the target form brightens from black.
  // The aim point travels with the dolly so each piece arrives centred.
  const lookY = nodeLookY(nextNode);
  tl.to(camera.position, {
    x: 0, y: lookY + 0.35, z: nextNode.dist,
    duration: pullDur, ease: 'power2.out'
  });
  tl.to(lookTarget, { y: lookY, duration: pullDur, ease: 'power2.out' }, '<');
  const bri = { v: 0 };
  tl.to(bri, {
    v: 1, duration: pullDur, ease: 'power2.out',
    onUpdate: () => setEmerge(next, bri.v)
  }, '<');

  // the timeline glow slides across the whole move, in lockstep
  tl.to($glow, {
    left: tlPos(targetIdx) + '%', duration: pushDur + pullDur, ease: 'power2.inOut',
    onComplete: () => setActiveTick(targetIdx)
  }, 0);

  await tl.then();

  settleEmerge(next);
  showCard(targetIdx, read.beat);
  state = targetIdx === NODES.length - 1 ? 'end' : 'revealed';
  syncEnd();   // only if we also landed on the final node's LAST beat
  updateNav();
}

// Replay: dip to black, reset to node 0, and start over from the opening closeup.
async function replay() {
  if (state === 'animating') return;
  state = 'animating';
  hideEnd();
  hideCard();
  updateNav();

  const prev = current;
  const first = await loadNode(currentThread, 0);
  prepEmerge(first);

  const tl = gsap.timeline();
  const dim = { v: 1 };
  tl.to(dim, { v: 0, duration: 1.0, ease: 'power2.in', onUpdate: () => setEmerge(prev, dim.v) }, 0);
  tl.add(() => {
    stage.remove(prev);
    settleEmerge(prev);
    stage.add(first);
    current = first;
    current.rotation.y = NODES[0].faceY || 0;
    idx = 0;
    resetRead(0);
    spin.user = 0;
    spin.vel = 0;
    goWarm(1.2);
    setCloseupCamera();
    setActiveTick(0);
    $glow.style.left = tlPos(0) + '%';
  });
  const bri = { v: 0 };
  tl.to(bri, { v: 1, duration: 1.2, ease: 'power2.out', onUpdate: () => setEmerge(first, bri.v) });
  await tl.then();
  settleEmerge(first);

  state = 'closeup';
  updateNav();
  gsap.set($prompt, { opacity: 0 });
  gsap.set($promptLead, { opacity: 1 });
  gsap.to($prompt, { opacity: 1, duration: 1.6, ease: 'power1.out' });
  gsap.to($promptLead, { opacity: 0.4, duration: 2.0, delay: 2.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
}

// Choose another texture: reset the scene behind the landing, return to select.
async function chooseTexture() {
  if (state === 'animating') return;
  hideEnd();
  hideCard();
  killPrompt();
  gsap.set($prompt, { opacity: 0 });
  updateNav();
  gsap.to($timeline, { opacity: 0, duration: 0.6 });

  const prev = current;
  const first = await loadNode(currentThread, 0);
  if (prev && prev !== first) { stage.remove(prev); settleEmerge(prev); }
  settleEmerge(first);
  if (current !== first) stage.add(first);
  current = first;
  current.rotation.y = NODES[0].faceY || 0;
  idx = 0;
  resetRead(0);
  spin.user = 0;
  spin.vel = 0;
  goWarm(0);
  setCloseupCamera();
  setActiveTick(0);
  $glow.style.left = tlPos(0) + '%';

  // bring the landing back at the texture-select stage
  $landing.style.display = 'flex';
  $landingSelect.style.display = 'flex';
  gsap.set($landingSelect, { opacity: 1 });
  gsap.set('.swatch', { opacity: 1, y: 0 });
  state = 'landing';
  updateNav();
  gsap.fromTo($landing, { opacity: 0 }, { opacity: 1, duration: 1.0, ease: 'power2.out' });
}

/* ---- input: the wheel is the main instrument -------------------------- */

// deltaMode 0 is pixels, 1 is lines, 2 is pages — a mouse notch and a trackpad
// glide arrive in different units and both have to end up as the same scroll
function wheelPixels(e) {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) return;   // pinch-zoom, not a scroll
  // gesture-metered, NOT pixel-metered: see wheelStep. One flick = one beat,
  // no matter how hard it was thrown.
  wheelStep(wheelPixels(e));
}, { passive: true });

// Click still works, but it now means "next passage" rather than "next piece":
// with the commentary broken into beats, jumping a whole node on one click
// would skip most of what's written.
window.addEventListener('click', () => {
  // a drag that spun the model shouldn't also count as a "proceed" click
  if (drag.consumedClick) { drag.consumedClick = false; return; }
  if (state === 'closeup') {
    if (readyToReveal) reveal();
    else goToSelect();
  }
  else if (state === 'revealed' || state === 'end') stepBeat(1);
});

// Keyboard: every key that moves the reading moves it exactly one beat, the
// same as one wheel gesture or one swipe. Useful for recording, where reaching
// for the mouse drags the cursor across the frame.
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const onPanel = document.activeElement && document.activeElement.closest('#landing, #end');
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
    // let the picker's swatches keep their own Space/Enter activation
    if (onPanel) return;
    e.preventDefault();
    if (state === 'closeup') readyToReveal ? reveal() : goToSelect();
    else stepBeat(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    stepBeat(-1);
  } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    if (onPanel) return;
    e.preventDefault();
    stepScroll(1);   // one key press, one beat — same contract as one wheel gesture
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    if (onPanel) return;
    e.preventDefault();
    stepScroll(-1);
  }
});

// the nav/end controls handle their own clicks and must not also advance
$navBack.addEventListener('click', (e) => { e.stopPropagation(); goBack(); });
$navHome.addEventListener('click', (e) => { e.stopPropagation(); chooseTexture(); });
document.getElementById('end-replay').addEventListener('click', (e) => { e.stopPropagation(); replay(); });
document.getElementById('end-choose').addEventListener('click', (e) => { e.stopPropagation(); chooseTexture(); });

/* ============================================================
   Grab to spin — the hand's turn, laid on top of the scroll's.
   Scrolling turns the piece as the commentary advances; dragging turns it
   independently, and the two add. `spin.user` holds the hand's contribution so
   a drag never fights the reading position.

   On touch there is no wheel, so the same gesture has to serve both: the first
   few pixels decide whether it's a horizontal spin or a vertical scroll, and
   the gesture keeps that role until release.
   ============================================================ */

const DRAG_SENS = 0.0085;     // radians of spin per pixel dragged
const DRAG_THRESHOLD = 6;     // px of movement before it counts as a drag
const drag = {
  active: false, mode: 'spin', lastX: 0, lastY: 0,
  totalDx: 0, totalDy: 0, consumedClick: false
};
// the hand's own rotation, and the inertia left over when it lets go
const spin = { user: 0, vel: 0 };

function canGrab() {
  return (state === 'revealed' || state === 'end') && !!current;
}

// don't start a spin when the press begins on the back / end controls
function pressOnUI(target) {
  return !!(target.closest && target.closest('#nav-back, #nav-home, #end, #landing'));
}

window.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || pressOnUI(e.target)) return;
  const touch = e.pointerType === 'touch';
  // a finger may be reaching for the scroll even on the opening closeup, where
  // there is nothing yet to spin
  if (!canGrab() && !(touch && state === 'closeup')) return;
  drag.active = true;
  drag.mode = touch ? 'undecided' : 'spin';
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  drag.totalDx = 0;
  drag.totalDy = 0;
  drag.scrollAccum = 0;
  drag.stepped = false;
  spin.vel = 0;
  if (!touch) document.body.style.cursor = 'grabbing';
});

window.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  const dx = e.clientX - drag.lastX;
  const dy = e.clientY - drag.lastY;
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
  drag.totalDx += Math.abs(dx);
  drag.totalDy += Math.abs(dy);

  if (drag.mode === 'undecided') {
    if (drag.totalDx + drag.totalDy < DRAG_THRESHOLD) return;
    drag.mode = drag.totalDy > drag.totalDx ? 'scroll' : 'spin';
  }

  if (drag.mode === 'scroll') {
    // one swipe, one beat — the same contract the wheel gets. Accumulating the
    // drag and stepping once when it crosses SWIPE_PER_BEAT keeps a long flick
    // from skipping passages; drag.stepped is cleared on release, so reading on
    // is a second swipe rather than a longer one.
    drag.scrollAccum += -dy * TOUCH_SCROLL;
    if (!drag.stepped && Math.abs(drag.scrollAccum) >= SWIPE_PER_BEAT) {
      drag.stepped = true;
      stepScroll(Math.sign(drag.scrollAccum));
    }
  } else if (canGrab()) {
    const delta = dx * DRAG_SENS;
    spin.user += delta;
    spin.vel = Math.max(-0.3, Math.min(0.3, delta));   // last motion seeds release inertia
  }
});

function endDrag() {
  if (!drag.active) return;
  drag.active = false;
  // a real drag suppresses the click that the browser fires on release
  if (drag.totalDx + drag.totalDy > DRAG_THRESHOLD) drag.consumedClick = true;
  else spin.vel = 0;
  document.body.style.cursor = '';
  updateGrabCursor();
}

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// hint that the model is grabbable whenever it's interactive and idle
function updateGrabCursor() {
  document.body.style.cursor = canGrab() ? 'grab' : 'pointer';
}

/* ============================================================
   Loop
   ============================================================ */

const clock = new THREE.Clock();

function tick() {
  requestAnimationFrame(tick);
  const dt = clock.getDelta();

  // release inertia: the hand's spin keeps going a moment, then friction takes it
  if (!drag.active && Math.abs(spin.vel) > 0.00005) {
    spin.user += spin.vel;
    spin.vel *= 0.95;
  } else if (!drag.active) {
    spin.vel = 0;
  }

  // the reading position chases the wheel rather than snapping to it, which is
  // what makes a flick of the trackpad read as pushing a heavy object round
  read.smooth += (read.p - read.smooth) * Math.min(1, dt * 5.5);
  breath.t += dt;

  if (current) {
    if (state === 'closeup' || state === 'landing') {
      // bounded wander: the surface stays full-bleed however long the title holds
      closeupDrift.t += dt;
      current.rotation.y = (NODES[0].faceY || 0) +
        Math.sin(closeupDrift.t * closeupDrift.speed) * closeupDrift.amp + spin.user;
    } else {
      // reading: the scroll turns the piece, the hand adds to it, and a slow
      // breath keeps it from going dead still between gestures
      const n = NODES[idx];
      const amp = n && n.sway ? 0.055 : 0.022;
      current.rotation.y = (n ? n.faceY || 0 : 0) + scrollSpin() + spin.user +
        Math.sin(breath.t * 0.22) * amp;
    }
  }

  camera.lookAt(lookTarget);
  aimLights();          // lookTarget.y tweens per node; the spot cones follow it
  renderer.render(scene, camera);
}

// off-axis lens shift: pushes the model into the right two-thirds on desktop,
// leaving room for the left placard. centered on phones (panel is a bottom sheet).
// viewShift eases 0→1 during the first reveal so the opening closeup is
// full-bleed texture with no compositional bias.
const viewShift = { v: 1 };
function applyViewOffset() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w > 760 && viewShift.v > 0.001) camera.setViewOffset(w, h, -w * 0.16 * viewShift.v, 0, w, h);
  else camera.clearViewOffset();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyViewOffset();
  // a window dragged onto a second display can change DPR mid-session
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Tells the bootstrap guard in index.html that the module graph survived —
// scene.js built a renderer and this file evaluated. Without it the guard
// can't tell "still downloading" from "died before it could report".
window.__patinaBooted = true;

tick();
start();
