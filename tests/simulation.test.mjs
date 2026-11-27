// Node tests for the Turkey Trot simulation (no browser needed): determinism,
// the autopilot finishing a stage, hiding, oven heat and the farmer's chase.
// Run: node --test tests/simulation.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { createWorld, EVENT_STAGE, EVENT_ESCAPED, EVENT_OVER } from '../game/src/world.js';
import { STEP } from '../game/src/config.js';
import { stageShot } from '../game/src/shots.js';

// The same steering the screenshot scenes use, re-implemented small here so the
// test does not depend on the shot file's internals.
function towardExit(state) {
  const p = state.player;
  const e = state.level.exit;
  const dx = e.x + e.w / 2 - p.x;
  const dy = e.y + e.h / 2 - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { vx: dx / len, vy: dy / len, dash: false, hide: false, decoy: null };
}

test('determinism: same seed + same inputs give the same snapshot', () => {
  const run = () => {
    const world = createWorld(createRandom(7));
    for (let i = 0; i < 600; i += 1) world.step(STEP, towardExit(world.state));
    return JSON.stringify(world.snapshot());
  };
  assert.equal(run(), run());
});

test('autopilot finishes stage 1 within 4 minutes of play', () => {
  const world = createWorld(createRandom(7));
  let events = 0;
  for (let i = 0; i < 240 / STEP; i += 1) {
    events |= world.step(STEP, towardExit(world.state));
    if (world.state.stage >= 1 || world.state.phase !== 'play') break;
  }
  assert.ok(world.state.stage >= 1, `still stage ${world.state.stage}, phase ${world.state.phase}, score ${world.state.score}`);
});

test('hiding: E next to a haystack hides the turkey', () => {
  const world = createWorld(createRandom(3));
  const hay = world.state.level.haystacks[0];
  world.state.player.x = hay.x;
  world.state.player.y = hay.y;
  world.step(STEP, { vx: 0, vy: 0, dash: false, hide: true, decoy: null });
  assert.equal(world.state.hidden, true);
  // While hidden the farmer cannot spot the turkey even at close range.
  world.state.farmer.x = hay.x + 100;
  world.state.farmer.y = hay.y;
  world.state.farmer.angle = Math.atan2(hay.y - world.state.farmer.y, hay.x - world.state.farmer.x);
  const before = world.state.alert;
  for (let i = 0; i < 60; i += 1) world.step(STEP, { vx: 0, vy: 0, dash: false, hide: false, decoy: null });
  assert.ok(world.state.alert <= before, `alert rose while hidden: ${before} -> ${world.state.alert}`);
});

test('farmer chases when the turkey is in his vision cone', () => {
  const world = createWorld(createRandom(3));
  const f = world.state.farmer;
  const p = world.state.player;
  f.x = p.x + 150;
  f.y = p.y;
  f.angle = Math.PI; // facing the turkey
  let everChased = false;
  for (let i = 0; i < 30; i += 1) {
    world.step(STEP, { vx: 0, vy: 0, dash: false, hide: false, decoy: null });
    if (world.state.farmer.state === 'chase') everChased = true;
    if (world.state.phase !== 'play') break; // caught the standing turkey: chase happened first
  }
  assert.ok(everChased, `farmer never chased, state ${world.state.farmer.state}`);
  assert.ok(world.state.alert > 0, `alert ${world.state.alert}`);
});

test('oven heat: standing in an oven costs a life', () => {
  const world = createWorld(createRandom(3));
  world.jumpToStage(2);
  const oven = world.state.level.ovens[0];
  world.state.player.x = oven.x + oven.w / 2;
  world.state.player.y = oven.y + oven.h / 2;
  const lives = world.state.lives;
  let lost = false;
  for (let i = 0; i < 600; i += 1) {
    world.step(STEP, { vx: 0, vy: 0, dash: false, hide: false, decoy: null });
    if (world.state.lives < lives) { lost = true; break; }
    if (world.state.phase !== 'play') break;
  }
  assert.ok(lost, `no life lost in oven, heat ${world.state.heat}`);
});

test('shot scenes: start stages the title, play stages a live run', () => {
  const world = createWorld(createRandom(7));
  const start = stageShot('start', world);
  assert.equal(start.screen, 'title');
  const play = stageShot('play', world);
  assert.ok(['play', 'over'].includes(play.screen), `play scene screen ${play.screen}`);
});
