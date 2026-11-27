// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught and escaped.
//
// ?seed=N fixes the random pattern. ?shot=start|play|kitchen|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady (and window.__shotState) for a screenshot.
// Debug hooks: G.step(n) advances the simulation n fixed steps and returns the
// snapshot; G.state() returns the snapshot; G.auto(seconds) runs the autopilot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_STAGE, EVENT_ESCAPED, EVENT_SPOTTED, EVENT_PICKUP, PHASE_PLAY } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_HIDE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, seed);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      window.__shotState = world.state.phase;
      window.__shotScore = world.state.score;
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let hideNext = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Escape the farm — reach the forest gate.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.caught();
    announce(won ? `Escaped! Score ${world.state.score}.` : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function cameraOf() {
    return renderer.camera(world.state);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_HIDE) hideNext = true;
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    const click = input.takeClick();
    if (click && screen === SCREEN_PLAY) {
      const cam = cameraOf();
      const scale = canvas.width / canvas.getBoundingClientRect().width;
      const cmd = { vx: 0, vy: 0, dash: false, hide: false, decoy: { x: cam.x + click.x * scale, y: cam.y + click.y * scale } };
      world.step(0, cmd);
    }
  }

  function step() {
    const vec = input.vector();
    const hide = hideNext;
    hideNext = false;
    const events = world.step(STEP, { vx: vec.x, vy: vec.y, dash: input.dashing(), hide, decoy: null });
    if (events & EVENT_SPOTTED) audio.alarm();
    if (events & EVENT_HIT) audio.hit();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_STAGE) audio.stageClear();
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Debug hooks for playtesting: G.step(n) advances n fixed steps, G.state() snapshots.
  window.G = {
    state: () => world.snapshot(),
    step(n) {
      const count = n || 1;
      for (let i = 0; i < count; i += 1) {
        world.step(STEP, { vx: 0, vy: 0, dash: false, hide: false, decoy: null });
      }
      return world.snapshot();
    },
    start() {
      startGame();
      return world.snapshot();
    },
    /** Playtest helpers: place the turkey / farmer directly. */
    teleport(x, y) {
      world.state.player.x = x;
      world.state.player.y = y;
      return world.snapshot();
    },
    placeFarmer(x, y, angle) {
      world.state.farmer.x = x;
      world.state.farmer.y = y;
      world.state.farmer.angle = angle;
      return world.snapshot();
    },
  };

  announce('Turkey Trot. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
