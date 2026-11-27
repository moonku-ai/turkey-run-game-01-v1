// The simulation: the turkey, the farmer, thrown knives, ovens, haystacks,
// pickups and the exit gate, over three stages. Pure logic — no DOM, no
// sound — so the same code runs in the browser and in Node tests. Fixed step
// 1/60 s; the only randomness comes from the seeded generator.
import {
  LEVELS, STEP, TURKEY, FARMER, KNIFE, SCORE, PAR_SECONDS, LIVES_START,
  KERNELS_MAX, OVEN_HEAT_RATE, OVEN_COOL_RATE,
} from './config.js';
import { createFarmer, stepFarmer, alertFarmer, STATE_CHASE } from './farmer.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_STAGE = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_PICKUP = 32;

export const PHASE_PLAY = 'play';
export const PHASE_CAUGHT = 'caught';
export const PHASE_ESCAPED = 'escaped';

function rectsOverlapCircle(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** Segment (ax,ay)-(bx,by) blocked by any wall? Sampled every 8 px. */
function losBlocked(ax, ay, bx, by, walls) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = ax + ((bx - ax) * i) / steps;
    const y = ay + ((by - ay) * i) / steps;
    for (let j = 0; j < walls.length; j += 1) {
      if (pointInRect(x, y, walls[j])) return true;
    }
  }
  return false;
}

export function createWorld(random) {
  const state = {
    stage: 0,
    score: 0,
    lives: LIVES_START,
    kernels: 2,
    cornGot: 0,
    feathersGot: 0,
    time: 0,
    stageTime: 0,
    phase: PHASE_PLAY,
    alert: 0,
    heat: 0,
    hidden: false,
    hiddenAt: null,
    player: { x: 0, y: 0, angle: 0, stamina: 100, invuln: 0, moving: false, dashing: false },
    farmer: null,
    knives: [],
    decoys: [],
    pickups: [],
    level: LEVELS[0],
    message: '',
    messageTime: 0,
  };

  function loadStage(index) {
    const level = LEVELS[index];
    state.level = level;
    state.stage = index;
    state.stageTime = 0;
    state.alert = 0;
    state.heat = 0;
    state.hidden = false;
    state.hiddenAt = null;
    state.knives = [];
    state.decoys = [];
    state.player.x = level.spawn.x;
    state.player.y = level.spawn.y;
    state.player.angle = -Math.PI / 2;
    state.player.stamina = 100;
    state.player.invuln = 1;
    state.farmer = createFarmer(level.farmerSpawn, level.patrol);
    state.pickups = [];
    for (const c of level.corn) state.pickups.push({ kind: 'corn', x: c.x, y: c.y, taken: false });
    for (const f of level.feathers) state.pickups.push({ kind: 'feather', x: f.x, y: f.y, taken: false });
    for (const h of level.hearts) state.pickups.push({ kind: 'heart', x: h.x, y: h.y, taken: false });
  }

  function slideCircle(x, y, r) {
    const walls = state.level.walls;
    const world = state.level.world;
    let nx = Math.max(r, Math.min(world.w - r, x));
    let ny = Math.max(r, Math.min(world.h - r, y));
    // Try the full move, then each axis alone (wall sliding).
    const blocked = (px, py) => {
      for (let i = 0; i < walls.length; i += 1) {
        if (rectsOverlapCircle(px, py, r, walls[i])) return true;
      }
      return false;
    };
    if (!blocked(nx, ny)) return { x: nx, y: ny };
    if (!blocked(nx, state.player.y)) return { x: nx, y: state.player.y };
    if (!blocked(state.player.x, ny)) return { x: state.player.x, y: ny };
    return { x: state.player.x, y: state.player.y };
  }

  function slideFarmer(x, y, r) {
    const walls = state.level.walls;
    const world = state.level.world;
    const fx = state.farmer.x;
    const fy = state.farmer.y;
    const nx = Math.max(r, Math.min(world.w - r, x));
    const ny = Math.max(r, Math.min(world.h - r, y));
    const blocked = (px, py) => {
      for (let i = 0; i < walls.length; i += 1) {
        if (rectsOverlapCircle(px, py, r, walls[i])) return true;
      }
      return false;
    };
    if (!blocked(nx, ny)) return { x: nx, y: ny };
    if (!blocked(nx, fy)) return { x: nx, y: fy };
    if (!blocked(fx, ny)) return { x: fx, y: ny };
    return { x: fx, y: fy };
  }

  function loseLife(reason) {
    state.lives -= 1;
    state.alert = 0;
    state.heat = 0;
    state.hidden = false;
    state.hiddenAt = null;
    state.knives = [];
    state.decoys = [];
    if (state.lives <= 0) {
      state.phase = PHASE_CAUGHT;
      state.message = reason === 'knife' ? 'A carving knife found you…' : reason === 'oven' ? 'Too hot! The oven got you!' : 'The farmer caught you!';
      return EVENT_HIT | EVENT_OVER;
    }
    state.player.x = state.level.spawn.x;
    state.player.y = state.level.spawn.y;
    state.player.invuln = TURKEY.invulnerable;
    state.player.stamina = 100;
    state.farmer = createFarmer(state.level.farmerSpawn, state.level.patrol);
    state.message = reason === 'knife' ? 'Ouch! A knife! Run!' : 'Caught! One life left — run!';
    state.messageTime = 2.5;
    return EVENT_HIT;
  }

  function distanceToExit() {
    const e = state.level.exit;
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    return Math.hypot(cx - state.player.x, cy - state.player.y) / 50;
  }

  function step(dt, cmd) {
    if (state.phase !== PHASE_PLAY) return 0;
    let events = 0;
    const p = state.player;
    const level = state.level;
    state.time += dt;
    state.stageTime += dt;
    if (state.messageTime > 0) state.messageTime -= dt;
    if (p.invuln > 0) p.invuln -= dt;

    // --- hiding ---
    if (cmd.hide) {
      if (!state.hidden) {
        for (const h of level.haystacks) {
          if (Math.hypot(h.x - p.x, h.y - p.y) < h.r + 24) {
            state.hidden = true;
            state.hiddenAt = h;
            state.message = 'Hidden in the hay… stay still!';
            state.messageTime = 1.6;
            break;
          }
        }
      } else {
        state.hidden = false;
        state.hiddenAt = null;
      }
    }

    // --- movement ---
    const wantDash = cmd.dash && p.stamina > TURKEY.staminaDashMin && (cmd.vx !== 0 || cmd.vy !== 0);
    const speed = wantDash ? TURKEY.dash : TURKEY.walk;
    p.dashing = wantDash;
    p.moving = (cmd.vx !== 0 || cmd.vy !== 0) && !state.hidden;
    if (p.moving) {
      p.angle = Math.atan2(cmd.vy, cmd.vx);
      const moved = slideCircle(p.x + cmd.vx * speed * dt, p.y + cmd.vy * speed * dt, TURKEY.radius);
      p.x = moved.x;
      p.y = moved.y;
    }
    if (wantDash) p.stamina = Math.max(0, p.stamina - TURKEY.staminaDrain * dt);
    else p.stamina = Math.min(100, p.stamina + TURKEY.staminaRegen * dt);

    // --- decoy toss (mouse click) ---
    if (cmd.decoy && state.kernels > 0 && !state.hidden) {
      const tx = Math.max(30, Math.min(level.world.w - 30, cmd.decoy.x));
      const ty = Math.max(30, Math.min(level.world.h - 30, cmd.decoy.y));
      state.kernels -= 1;
      state.decoys.push({ x: tx, y: ty, life: FARMER.decoySeconds });
      alertFarmer(state.farmer, { x: tx, y: ty });
      state.message = 'Corn tossed — the farmer investigates!';
      state.messageTime = 1.6;
    }
    for (let i = state.decoys.length - 1; i >= 0; i -= 1) {
      state.decoys[i].life -= dt;
      if (state.decoys[i].life <= 0) state.decoys.splice(i, 1);
    }

    // --- ovens (kitchen heat) ---
    let inOven = false;
    for (const o of level.ovens) {
      if (rectsOverlapCircle(p.x, p.y, TURKEY.radius, o)) { inOven = true; break; }
    }
    if (inOven && !state.hidden) {
      state.heat = Math.min(100, state.heat + OVEN_HEAT_RATE * dt);
      if (state.heat >= 100) {
        state.heat = 0;
        return events | loseLife('oven');
      }
    } else {
      state.heat = Math.max(0, state.heat - OVEN_COOL_RATE * dt);
    }

    // --- pickups ---
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      const reach = pk.kind === 'corn' ? 30 : 34;
      if (d < reach) {
        pk.taken = true;
        if (pk.kind === 'corn') {
          state.score += SCORE.corn;
          state.cornGot += 1;
          state.kernels = Math.min(KERNELS_MAX, state.kernels + 1);
        } else if (pk.kind === 'feather') {
          state.score += SCORE.feather;
          state.feathersGot += 1;
        } else {
          state.lives = Math.min(5, state.lives + 1);
        }
        events |= EVENT_PICKUP;
      }
    }

    // --- farmer vision + alert ---
    const f = state.farmer;
    const dx = p.x - f.x;
    const dy = p.y - f.y;
    const dist = Math.hypot(dx, dy);
    const toPlayer = Math.atan2(dy, dx);
    let diff = toPlayer - f.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const inCone = dist < FARMER.visionRange && Math.abs(diff) < FARMER.visionHalfAngle;
    const canSee = inCone && !state.hidden && !losBlocked(f.x, f.y, p.x, p.y, level.walls);
    if (canSee) state.alert = Math.min(100, state.alert + FARMER.alertRise * dt);
    else if (state.hidden) state.alert = Math.max(0, state.alert - FARMER.alertFallHidden * dt);
    else state.alert = Math.max(0, state.alert - FARMER.alertFall * dt);

    // --- farmer step ---
    const see = { canSee, distance: dist, angle: toPlayer };
    const result = stepFarmer(f, dt, see, slideFarmer, () => {
      // Knife throw: from the farmer toward the turkey's current spot.
      const a = Math.atan2(p.y - f.y, p.x - f.x);
      state.knives.push({
        x: f.x + Math.cos(a) * 26, y: f.y + Math.sin(a) * 26,
        vx: Math.cos(a) * KNIFE.speed, vy: Math.sin(a) * KNIFE.speed, life: KNIFE.life,
      });
    }, { x: p.x, y: p.y, hidden: state.hidden, invuln: p.invuln });
    if (result === 'spotted') {
      events |= EVENT_SPOTTED;
      state.message = 'SPOTTED! Run!';
      state.messageTime = 1.8;
    } else if (result === 'caught') {
      return events | loseLife('caught');
    }

    // Hidden in a haystack the farmer is searching: he checks it.
    if (state.hidden && state.hiddenAt && f.state === 'search') {
      const hd = Math.hypot(state.hiddenAt.x - f.x, state.hiddenAt.y - f.y);
      if (hd < 60) return events | loseLife('caught');
    }

    // --- knives fly ---
    for (let i = state.knives.length - 1; i >= 0; i -= 1) {
      const k = state.knives[i];
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.life -= dt;
      let dead = k.life <= 0;
      if (!dead) {
        for (const w of level.walls) {
          if (pointInRect(k.x, k.y, w)) { dead = true; break; }
        }
      }
      if (!dead && p.invuln <= 0 && !state.hidden && Math.hypot(k.x - p.x, k.y - p.y) < TURKEY.radius + KNIFE.radius) {
        state.knives.splice(i, 1);
        return events | loseLife('knife');
      }
      if (dead) state.knives.splice(i, 1);
    }

    // --- exit gate ---
    const e = level.exit;
    if (pointInRect(p.x, p.y, e)) {
      const timeBonus = Math.max(0, Math.round((PAR_SECONDS[state.stage] - state.stageTime) * SCORE.timeBonusPerSec));
      state.score += SCORE.stage + timeBonus;
      if (state.stage >= LEVELS.length - 1) {
        state.score += SCORE.escape;
        state.phase = PHASE_ESCAPED;
        state.message = 'ESCAPED! Happy Thanksgiving — somewhere else!';
        return events | EVENT_STAGE | EVENT_ESCAPED;
      }
      loadStage(state.stage + 1);
      state.message = `${LEVELS[state.stage].name} — ${LEVELS[state.stage].sub}`;
      state.messageTime = 3;
      return events | EVENT_STAGE;
    }

    return events;
  }

  function reset() {
    state.stage = 0;
    state.score = 0;
    state.lives = LIVES_START;
    state.kernels = 2;
    state.cornGot = 0;
    state.feathersGot = 0;
    state.time = 0;
    state.phase = PHASE_PLAY;
    state.message = '';
    state.messageTime = 0;
    loadStage(0);
  }

  loadStage(0);

  return {
    state,
    step,
    reset,
    distanceToExit,
    /** Jump to a stage keeping score and lives (used by the ?shot=kitchen scene). */
    jumpToStage(index) {
      loadStage(index);
    },
    /** Small plain snapshot for G.state / tests. */
    snapshot() {
      const s = state;
      return {
        stage: s.stage, stageName: s.level.name, phase: s.phase,
        score: s.score, lives: s.lives, kernels: s.kernels,
        cornGot: s.cornGot, feathersGot: s.feathersGot,
        time: Math.round(s.time * 100) / 100, stageTime: Math.round(s.stageTime * 100) / 100,
        alert: Math.round(s.alert), heat: Math.round(s.heat),
        stamina: Math.round(s.player.stamina), hidden: s.hidden,
        player: { x: Math.round(s.player.x), y: Math.round(s.player.y) },
        farmer: {
          x: Math.round(s.farmer.x), y: Math.round(s.farmer.y),
          state: s.farmer.state, speed: Math.round(s.farmer.speed),
        },
        knives: s.knives.length, decoys: s.decoys.length,
        pickupsLeft: s.pickups.filter((p) => !p.taken).length,
        distanceToExit: Math.round(distanceToExit()),
      };
    },
  };
}
