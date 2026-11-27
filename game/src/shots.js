// The screenshot scenes behind ?shot=start|play|kitchen|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// a simple autopilot (head for the exit, dash away when chased, hide when the
// farmer is close and a haystack is near, keep clear of knives and ovens), so
// the frame is what a real game looks like and the same seed always gives the
// same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_ESCAPED, EVENT_STAGE, PHASE_PLAY } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 9;
const KITCHEN_SECONDS = 6;
const END_LIMIT_SECONDS = 900;

/**
 * Stage a chase for the screenshot: put the farmer 240 px from the turkey,
 * already chasing with a knife ready, then let the sim run briefly so a knife
 * may be mid-flight. The frame then shows the chase, the vision cone and the
 * HUD — the game's core — instead of an empty field.
 */
function stageChase(world) {
  const state = world.state;
  const p = state.player;
  const f = state.farmer;
  const e = state.level.exit;
  // Behind the turkey, away from the exit, so the chase drives toward the goal.
  const away = Math.atan2(p.y - (e.y + e.h / 2), p.x - (e.x + e.w / 2));
  f.x = p.x + Math.cos(away) * 240;
  f.y = p.y + Math.sin(away) * 240;
  f.x = Math.max(60, Math.min(state.level.world.w - 60, f.x));
  f.y = Math.max(60, Math.min(state.level.world.h - 60, f.y));
  f.angle = Math.atan2(p.y - f.y, p.x - f.x);
  f.state = 'chase';
  f.stateTime = 0;
  f.knifeTimer = 0;
  f.windup = 0;
  state.alert = 100;
  runSteps(world, 0.8, autopilot);
}

/** Steer toward a point, with a small perpendicular dodge when a knife is near. */
function autopilot(state, world) {
  const p = state.player;
  const f = state.farmer;
  const exit = state.level.exit;
  const tx = exit.x + exit.w / 2;
  const ty = exit.y + exit.h / 2;
  let dx = tx - p.x;
  let dy = ty - p.y;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;

  // Dodge the nearest flying knife: step sideways from its path.
  let dash = false;
  for (const k of state.knives) {
    const kx = k.x - p.x;
    const ky = k.y - p.y;
    const kd = Math.hypot(kx, ky);
    if (kd < 130) {
      const along = (kx * k.vx + ky * k.vy) / (kd * 430 + 1);
      if (along > 0.4) {
        const px = -k.vy / 430;
        const py = k.vx / 430;
        dx = px;
        dy = py;
        dash = true;
      }
    }
  }
  // Flee when the farmer is chasing and close.
  const fd = Math.hypot(f.x - p.x, f.y - p.y);
  if (f.state === 'chase' && fd < 260) {
    const fx = (p.x - f.x) / (fd || 1);
    const fy = (p.y - f.y) / (fd || 1);
    // Blend fleeing with progress toward the exit so the run still advances.
    dx = fx * 0.75 + dx * 0.45;
    dy = fy * 0.75 + dy * 0.45;
    dash = p.stamina > 30;
  }
  // Avoid ovens: push away from any oven centre within 130 px.
  for (const o of state.level.ovens) {
    const ox = o.x + o.w / 2;
    const oy = o.y + o.h / 2;
    const od = Math.hypot(ox - p.x, oy - p.y);
    if (od < 150) {
      dx += ((p.x - ox) / (od || 1)) * 0.9;
      dy += ((p.y - oy) / (od || 1)) * 0.9;
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  // Hide when the farmer is near, not yet chasing, and a haystack is close.
  let hide = false;
  if (f.state !== 'chase' && fd < 170 && !state.hidden) {
    for (const h of state.level.haystacks) {
      if (Math.hypot(h.x - p.x, h.y - p.y) < h.r + 24) { hide = true; break; }
    }
  }
  // While hidden, wait until the farmer wanders off.
  if (state.hidden) {
    if (fd > 320 || state.alert < 10) hide = true; // toggle out
    return { vx: 0, vy: 0, dash: false, hide, decoy: null };
  }
  return { vx: dx / len, vy: dy / len, dash, hide, decoy: null };
}

function runSteps(world, seconds, pilot) {
  let events = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    events |= world.step(STEP, pilot(world.state, world));
    if (world.state.phase !== PHASE_PLAY) break;
  }
  return events;
}

/** The screen matching the world's phase: escaped is a win, never "caught". */
function screenFor(world) {
  if (world.state.phase === 'escaped') return SCREEN_WIN;
  if (world.state.phase === 'caught') return SCREEN_OVER;
  return SCREEN_PLAY;
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * score to show. 'end' plays all three stages with the autopilot until the
 * turkey escapes (or the limit is hit, in which case it shows the play screen
 * of wherever it got to — the screenshot script retries seeds).
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    runSteps(world, START_SECONDS, () => ({ vx: 0, vy: 0, dash: false, hide: false, decoy: null }));
    return { screen: SCREEN_TITLE, best: 0, escaped: false };
  }
  if (name === 'play') {
    runSteps(world, PLAY_SECONDS, autopilot);
    if (world.state.phase === PHASE_PLAY) stageChase(world);
    return { screen: screenFor(world), best: world.state.score, escaped: false };
  }
  if (name === 'kitchen') {
    // Jump straight to stage 3, then play it with the autopilot.
    world.jumpToStage(2);
    runSteps(world, KITCHEN_SECONDS, autopilot);
    if (world.state.phase === PHASE_PLAY) stageChase(world);
    return { screen: screenFor(world), best: world.state.score, escaped: false };
  }
  // end: play to escape.
  runSteps(world, END_LIMIT_SECONDS, autopilot);
  const escaped = world.state.phase === 'escaped';
  return {
    screen: escaped ? SCREEN_WIN : world.state.phase === 'caught' ? SCREEN_OVER : SCREEN_PLAY,
    best: world.state.score,
    escaped,
  };
}
