// The farmer: patrols his waypoints, gets suspicious at a noise or a decoy,
// chases the turkey he can see, searches where he last saw it, and corners it
// against walls. He throws a carving knife while chasing. All movement is
// steering toward a target with wall sliding; the world supplies the collision
// and line-of-sight helpers.
import { FARMER } from './config.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';

export function createFarmer(spawn, patrol) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: 0,
    state: STATE_PATROL,
    patrolIndex: 0,
    patrol,
    target: null,
    lastSeen: null,
    stateTime: 0,
    knifeTimer: 0,
    windup: 0,
    speed: 0,
  };
}

/** Angle from (ax, ay) toward (bx, by). */
function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest signed turn from `from` toward `to`. */
function turnToward(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Step the farmer one fixed step. `see` is {canSee, distance, angle} for the
 * turkey this step; `move` slides a circle and returns the new position;
 * `onKnife` is called when a throw starts (the world spawns the knife).
 * Returns 'caught' when the farmer reaches the turkey, else null.
 */
export function stepFarmer(farmer, dt, see, move, onKnife, turkey) {
  farmer.stateTime += dt;
  const wasChasing = farmer.state === STATE_CHASE;

  if (see.canSee && !turkey.hidden) {
    farmer.lastSeen = { x: turkey.x, y: turkey.y };
    if (farmer.state !== STATE_CHASE) {
      farmer.state = STATE_CHASE;
      farmer.stateTime = 0;
      farmer.windup = 0;
    }
  } else if (farmer.state === STATE_CHASE) {
    farmer.state = STATE_SEARCH;
    farmer.stateTime = 0;
  }

  let speed = FARMER.patrol;
  let dest = null;

  if (farmer.state === STATE_PATROL) {
    dest = farmer.patrol[farmer.patrolIndex];
    if (Math.hypot(dest.x - farmer.x, dest.y - farmer.y) < 24) {
      farmer.patrolIndex = (farmer.patrolIndex + 1) % farmer.patrol.length;
      dest = farmer.patrol[farmer.patrolIndex];
    }
  } else if (farmer.state === STATE_SUSPICIOUS) {
    speed = FARMER.suspicious;
    dest = farmer.target;
    if (farmer.stateTime > FARMER.suspiciousSeconds || (dest && Math.hypot(dest.x - farmer.x, dest.y - farmer.y) < 30)) {
      farmer.state = STATE_PATROL;
      farmer.stateTime = 0;
    }
  } else if (farmer.state === STATE_CHASE) {
    speed = FARMER.chase;
    dest = { x: turkey.x, y: turkey.y };
    farmer.knifeTimer -= dt;
    if (farmer.windup > 0) {
      farmer.windup -= dt;
      speed = FARMER.patrol * 0.4;
      if (farmer.windup <= 0) onKnife();
    } else if (see.distance > 180 && see.distance < FARMER.knifeRange && farmer.knifeTimer <= 0) {
      farmer.windup = FARMER.knifeWindup;
      farmer.knifeTimer = FARMER.knifeCooldown;
    }
  } else if (farmer.state === STATE_SEARCH) {
    speed = FARMER.suspicious;
    dest = farmer.lastSeen;
    if (farmer.stateTime > FARMER.searchSeconds) {
      farmer.state = STATE_PATROL;
      farmer.stateTime = 0;
      farmer.lastSeen = null;
    } else if (dest && Math.hypot(dest.x - farmer.x, dest.y - farmer.y) < 30) {
      // Reached the last-seen spot and found nothing: look around, then give up.
      farmer.stateTime = Math.max(farmer.stateTime, FARMER.searchSeconds - 1.2);
    }
  }

  if (dest) {
    const want = angleTo(farmer.x, farmer.y, dest.x, dest.y);
    const turn = turnToward(farmer.angle, want);
    const maxTurn = (farmer.state === STATE_CHASE ? 7 : 4.5) * dt;
    farmer.angle += Math.max(-maxTurn, Math.min(maxTurn, turn));
    const step = speed * dt;
    const nx = farmer.x + Math.cos(farmer.angle) * step;
    const ny = farmer.y + Math.sin(farmer.angle) * step;
    const moved = move(nx, ny, FARMER.radius);
    farmer.x = moved.x;
    farmer.y = moved.y;
    farmer.speed = speed;
  } else {
    farmer.speed = 0;
  }

  if (!wasChasing && farmer.state === STATE_CHASE) return 'spotted';
  const d = Math.hypot(turkey.x - farmer.x, turkey.y - farmer.y);
  if (d < 30 && !turkey.hidden && turkey.invuln <= 0) return 'caught';
  return null;
}

/** Send the farmer to investigate a point (a decoy landing or a noise). */
export function alertFarmer(farmer, point) {
  if (farmer.state === STATE_CHASE) return;
  farmer.state = STATE_SUSPICIOUS;
  farmer.stateTime = 0;
  farmer.target = { x: point.x, y: point.y };
}
