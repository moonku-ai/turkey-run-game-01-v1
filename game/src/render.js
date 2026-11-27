// Canvas rendering: the farm, the barn, the kitchen, the turkey, the farmer
// with his vision cone, the HUD (score, lives, stamina, alert, distance,
// minimap) and the title / pause / caught / escaped screens. All art is drawn
// from code — no image files. The camera follows the turkey.
import { VIEW, PALETTE, FONT, FARMER, TURKEY, KNIFE } from './config.js';
import { createRandom } from './random.js';
import { STATE_CHASE } from './farmer.js';
import { PHASE_CAUGHT, PHASE_ESCAPED, PHASE_PLAY } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const decorRandom = createRandom((seed || 1) * 7919 + 13);
  // Deterministic decoration: grass tufts, pumpkins and flowers per stage.
  const decor = [];
  for (let i = 0; i < 260; i += 1) {
    decor.push({
      x: decorRandom() * 2400, y: decorRandom() * 1500,
      kind: decorRandom() < 0.72 ? 'tuft' : decorRandom() < 0.6 ? 'pumpkin' : 'flower',
      s: 0.7 + decorRandom() * 0.7, a: decorRandom() * Math.PI * 2,
    });
  }

  function camera(state) {
    const w = state.level.world;
    return {
      x: clamp(state.player.x - VIEW.width / 2, 0, Math.max(0, w.w - VIEW.width)),
      y: clamp(state.player.y - VIEW.height / 2, 0, Math.max(0, w.h - VIEW.height)),
    };
  }

  function drawGround(state, cam) {
    const level = state.level;
    const stage = state.stage;
    ctx.fillStyle = stage === 2 ? PALETTE.kitchenFloor : stage === 1 ? '#7d5a38' : PALETTE.grass;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Ground texture: soft patches.
    for (let i = 0; i < 90; i += 1) {
      const d = decor[i % decor.length];
      const x = d.x - cam.x;
      const y = d.y - cam.y;
      if (x < -40 || x > VIEW.width + 40 || y < -40 || y > VIEW.height + 40) continue;
      ctx.fillStyle = stage === 2 ? PALETTE.kitchenTile : stage === 1 ? '#8a6a44' : (i % 3 === 0 ? PALETTE.grassLight : PALETTE.grassDark);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 26 * d.s, 18 * d.s, d.a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (stage === 2) {
      // Kitchen checker tiles.
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      const ox = -((cam.x % 96) + 96) % 96;
      const oy = -((cam.y % 96) + 96) % 96;
      for (let x = ox; x < VIEW.width; x += 96) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VIEW.height); ctx.stroke();
      }
      for (let y = oy; y < VIEW.height; y += 96) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW.width, y); ctx.stroke();
      }
    } else {
      // Dirt path from spawn toward the exit.
      ctx.strokeStyle = PALETTE.dirt;
      ctx.lineWidth = 64;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(level.spawn.x - cam.x, level.spawn.y - cam.y);
      ctx.lineTo(level.exit.x + 60 - cam.x, level.exit.y + 45 - cam.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Pumpkins and flowers.
      for (const d of decor) {
        const x = d.x - cam.x;
        const y = d.y - cam.y;
        if (x < -30 || x > VIEW.width + 30 || y < -30 || y > VIEW.height + 30) continue;
        if (d.kind === 'pumpkin') {
          ctx.fillStyle = '#e07b2e';
          ctx.beginPath(); ctx.ellipse(x, y, 12 * d.s, 10 * d.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5d7d33';
          ctx.fillRect(x - 1, y - 12 * d.s, 3, 5);
        } else if (d.kind === 'flower') {
          ctx.fillStyle = '#e8a33c';
          ctx.beginPath(); ctx.arc(x, y, 3.5 * d.s, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = stage === 1 ? '#9a7a4c' : PALETTE.grassDark;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 5, y); ctx.lineTo(x - 2, y - 8 * d.s);
          ctx.moveTo(x + 5, y); ctx.lineTo(x + 2, y - 8 * d.s);
          ctx.moveTo(x, y); ctx.lineTo(x, y - 9 * d.s);
          ctx.stroke();
        }
      }
    }
  }

  function drawWalls(state, cam) {
    const level = state.level;
    for (const w of level.walls) {
      const x = w.x - cam.x;
      const y = w.y - cam.y;
      if (x > VIEW.width || y > VIEW.height || x + w.w < 0 || y + w.h < 0) continue;
      const border = w.y === 0 || w.y + w.h >= level.world.h || w.x === 0 || w.x + w.w >= level.world.w;
      if (state.stage === 2) {
        ctx.fillStyle = PALETTE.kitchenWall;
      } else if (border) {
        ctx.fillStyle = PALETTE.fence;
      } else {
        ctx.fillStyle = state.stage === 1 ? PALETTE.barnWood : PALETTE.fenceDark;
      }
      ctx.fillRect(x, y, w.w, w.h);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, y + w.h - 6, w.w, 6);
      if (border && state.stage !== 2) {
        // Fence posts.
        ctx.fillStyle = PALETTE.fenceDark;
        const step = 64;
        for (let px = x + 8; px < x + w.w - 8; px += step) {
          if (w.h > w.w) ctx.fillRect(x + 4, px - y + y, 0, 0);
          ctx.fillRect(Math.min(px, x + w.w - 12), y + 2, 8, Math.min(w.h - 4, 18));
        }
      }
    }
  }

  function drawHaystacks(state, cam) {
    for (const h of state.level.haystacks) {
      const x = h.x - cam.x;
      const y = h.y - cam.y;
      if (x < -90 || x > VIEW.width + 90 || y < -90 || y > VIEW.height + 90) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x, y + 8, h.r, h.r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PALETTE.hay;
      ctx.beginPath(); ctx.ellipse(x, y, h.r, h.r * 0.72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.hayDark;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * h.r * 0.32, y - h.r * 0.6);
        ctx.quadraticCurveTo(x + i * h.r * 0.4, y, x + i * h.r * 0.3, y + h.r * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HAY — press E to hide', x, y + h.r * 0.72 + 16);
    }
  }

  function drawOvens(state, cam) {
    for (const o of state.level.ovens) {
      const x = o.x - cam.x;
      const y = o.y - cam.y;
      if (x > VIEW.width || y > VIEW.height || x + o.w < 0 || y + o.h < 0) continue;
      ctx.fillStyle = PALETTE.oven;
      ctx.fillRect(x, y, o.w, o.h);
      ctx.fillStyle = '#22222a';
      ctx.fillRect(x + 14, y + 16, o.w - 28, o.h - 40);
      // Hot glow, pulsing with the heat of the room.
      const pulse = 0.55 + 0.35 * Math.sin(state.time * 5 + o.x);
      ctx.fillStyle = `rgba(255, 122, 38, ${pulse})`;
      ctx.fillRect(x + 20, y + 22, o.w - 40, o.h - 52);
      ctx.fillStyle = PALETTE.ovenHot;
      ctx.font = `700 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HOT OVEN!', x + o.w / 2, y + o.h - 8);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText('stay clear', x + o.w / 2, y + o.h + 16);
    }
  }

  function drawExit(state, cam) {
    const e = state.level.exit;
    const x = e.x - cam.x;
    const y = e.y - cam.y;
    const pulse = 0.7 + 0.3 * Math.sin(state.time * 3);
    ctx.fillStyle = `rgba(123, 201, 111, ${0.35 * pulse})`;
    ctx.fillRect(x - 8, y - 8, e.w + 16, e.h + 16);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(x, y, e.w, e.h);
    ctx.strokeStyle = PALETTE.exitDark;
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, e.w, e.h);
    ctx.fillStyle = '#1d3a17';
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(e.label, x + e.w / 2, y + e.h / 2 + 5);
    // Bouncing arrow above the gate.
    const ay = y - 14 - Math.sin(state.time * 4) * 5;
    ctx.fillStyle = PALETTE.exit;
    ctx.beginPath();
    ctx.moveTo(x + e.w / 2, ay + 12); ctx.lineTo(x + e.w / 2 - 10, ay - 2); ctx.lineTo(x + e.w / 2 + 10, ay - 2);
    ctx.closePath(); ctx.fill();
  }

  function drawPickups(state, cam) {
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      const x = pk.x - cam.x;
      const y = pk.y - cam.y;
      if (x < -30 || x > VIEW.width + 30 || y < -30 || y > VIEW.height + 30) continue;
      const bob = Math.sin(state.time * 3 + pk.x) * 3;
      if (pk.kind === 'corn') {
        ctx.fillStyle = PALETTE.corn;
        ctx.beginPath(); ctx.ellipse(x, y + bob, 9, 13, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b98f35';
        ctx.fillRect(x - 2, y + bob + 10, 4, 6);
      } else if (pk.kind === 'feather') {
        ctx.fillStyle = PALETTE.feather;
        ctx.beginPath(); ctx.ellipse(x, y + bob, 7, 16, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c9b98f';
        ctx.beginPath(); ctx.moveTo(x - 4, y + bob + 10); ctx.lineTo(x + 4, y + bob - 12); ctx.stroke();
      } else {
        ctx.fillStyle = PALETTE.heart;
        ctx.beginPath(); ctx.arc(x - 6, y + bob, 7, 0, Math.PI * 2); ctx.arc(x + 6, y + bob, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 13, y + bob + 2); ctx.lineTo(x + 13, y + bob + 2); ctx.lineTo(x, y + bob + 15); ctx.closePath(); ctx.fill();
      }
    }
    for (const d of state.decoys) {
      const x = d.x - cam.x;
      const y = d.y - cam.y;
      ctx.fillStyle = PALETTE.corn;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PALETTE.corn;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 13 + Math.sin(state.time * 6) * 3, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawTurkey(state, cam) {
    const p = state.player;
    if (state.hidden) return; // tucked inside the haystack
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    const blink = p.invuln > 0 && Math.floor(state.time * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;
    const a = p.angle;
    const walkPhase = state.time * 14;
    const legSwing = p.moving ? Math.sin(walkPhase) * 5 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    // Tail fan.
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillStyle = PALETTE.turkeyTail[i + 2];
      ctx.save();
      ctx.rotate(i * 0.42);
      ctx.beginPath(); ctx.ellipse(0, -26, 9, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Legs.
    ctx.strokeStyle = PALETTE.leg;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-6 + legSwing, 16); ctx.moveTo(6, 8); ctx.lineTo(6 - legSwing, 16); ctx.stroke();
    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath(); ctx.ellipse(0, 6, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Wing.
    ctx.fillStyle = '#a06a35';
    ctx.beginPath(); ctx.ellipse(-11, 2, 6, 11, 0.5, 0, Math.PI * 2); ctx.fill();
    // Head.
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI * 2); ctx.fill();
    // Beak + wattle.
    ctx.fillStyle = PALETTE.beak;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(9, -19); ctx.lineTo(0, -16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PALETTE.wattle;
    ctx.beginPath(); ctx.ellipse(2, -13, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Eye.
    ctx.fillStyle = '#1d1712';
    ctx.beginPath(); ctx.arc(3, -21, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFarmer(state, cam) {
    const f = state.farmer;
    const x = f.x - cam.x;
    const y = f.y - cam.y;
    // Vision cone.
    const chasing = f.state === STATE_CHASE;
    ctx.fillStyle = chasing ? PALETTE.coneAlert : PALETTE.coneCalm;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, FARMER.visionRange, f.angle - FARMER.visionHalfAngle, f.angle + FARMER.visionHalfAngle);
    ctx.closePath(); ctx.fill();
    const walkPhase = state.time * 10;
    const legSwing = f.speed > 10 ? Math.sin(walkPhase) * 5 : 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(f.angle + Math.PI / 2);
    // Legs.
    ctx.strokeStyle = '#2c2c34';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-7, 8); ctx.lineTo(-7 + legSwing, 17); ctx.moveTo(7, 8); ctx.lineTo(7 - legSwing, 17); ctx.stroke();
    // Overalls body.
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 19, 0, 0, Math.PI * 2); ctx.fill();
    // Shirt arms.
    ctx.fillStyle = PALETTE.farmerShirt;
    ctx.beginPath(); ctx.ellipse(-15, -2, 6, 12, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(15, -2, 6, 12, -0.4, 0, Math.PI * 2); ctx.fill();
    // Head + straw hat.
    ctx.fillStyle = PALETTE.farmerSkin;
    ctx.beginPath(); ctx.arc(0, -21, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.beginPath(); ctx.ellipse(0, -24, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -27, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Windup flash: he is about to throw a knife.
    if (f.windup > 0) {
      ctx.fillStyle = '#ff5a4b';
      ctx.beginPath(); ctx.arc(0, -38, 6 + Math.sin(state.time * 30) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // State label.
    ctx.fillStyle = chasing ? PALETTE.danger : PALETTE.text;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'center';
    const label = f.state === 'patrol' ? 'FARMER — patrolling' : f.state === 'suspicious' ? 'FARMER — suspicious…' : f.state === 'search' ? 'FARMER — searching!' : 'FARMER — CHASING!';
    ctx.fillText(label, x, y - 52);
  }

  function drawKnives(state, cam) {
    for (const k of state.knives) {
      const x = k.x - cam.x;
      const y = k.y - cam.y;
      const a = Math.atan2(k.vy, k.vx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = PALETTE.knife;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = PALETTE.knifeHandle;
      ctx.fillRect(-12, -3, 9, 6);
      ctx.restore();
    }
  }

  function bar(x, y, w, h, frac, fill, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * clamp(frac, 0, 1)), h - 4);
    if (label) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 6, y + h - 5);
    }
  }

  function drawHUD(state, best) {
    const level = state.level;
    // Top panel.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, VIEW.width, 64);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(VIEW.width, 64); ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 26px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${state.score}`, 18, 30);
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`${level.name} — Stage ${state.stage + 1} of 3`, 18, 52);
    // Lives.
    ctx.textAlign = 'left';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('LIVES', 330, 30);
    for (let i = 0; i < state.lives; i += 1) {
      const hx = 395 + i * 26;
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath(); ctx.arc(hx - 5, 24, 6, 0, Math.PI * 2); ctx.arc(hx + 5, 24, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 11, 26); ctx.lineTo(hx + 11, 26); ctx.lineTo(hx, 36); ctx.closePath(); ctx.fill();
    }
    // Distance to exit.
    const dist = Math.round(Math.hypot(level.exit.x + 60 - state.player.x, level.exit.y + 45 - state.player.y) / 50);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText(`EXIT ${dist} m`, 560, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(`corn ${state.cornGot}   kernels ${state.kernels} (click to toss)`, 560, 52);
    // Timer + best.
    const t = Math.floor(state.time);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`TIME ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}   BEST ${best}`, VIEW.width - 18, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText('WASD move · Shift dash · E hide · click toss corn · P pause', VIEW.width - 18, 52);
    ctx.textAlign = 'left';

    // Alert meter (top centre).
    const ax = VIEW.width / 2 - 130;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(ax - 4, 74, 268, 26);
    ctx.fillStyle = state.alert > 66 ? PALETTE.danger : state.alert > 33 ? PALETTE.warn : '#4a7a3d';
    ctx.fillRect(ax, 78, 260 * clamp(state.alert / 100, 0, 1), 18);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ax - 4, 74, 268, 26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.alert > 66 ? 'FARMER ALERT — RUN!' : state.alert > 5 ? 'FARMER SUSPICIOUS…' : 'FARMER UNAWARE', VIEW.width / 2, 92);
    ctx.textAlign = 'left';

    // Stamina + heat (bottom left).
    bar(18, VIEW.height - 52, 220, 18, state.player.stamina / 100, '#7bc96f', 'DASH');
    if (state.heat > 1) bar(18, VIEW.height - 28, 220, 18, state.heat / 100, '#ff7a26', 'OVEN HEAT!');
    if (state.hidden) {
      ctx.fillStyle = PALETTE.good;
      ctx.font = `800 16px ${FONT}`;
      ctx.fillText('HIDDEN IN THE HAY — press E to slip out', 18, VIEW.height - 66);
    }

    // Objective banner.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(18, 110, 430, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`GOAL: reach the ${level.exit.label} — dodge knives, mind the ovens`, 28, 130);

    // Message flash (below the GOAL banner so the two never overlap).
    if (state.messageTime > 0 && state.message) {
      ctx.font = `800 22px ${FONT}`;
      ctx.textAlign = 'center';
      const w = ctx.measureText(state.message).width + 36;
      ctx.fillStyle = PALETTE.panel;
      ctx.fillRect(VIEW.width / 2 - w / 2, 200, w, 40);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.strokeRect(VIEW.width / 2 - w / 2, 200, w, 40);
      ctx.fillStyle = PALETTE.warn;
      ctx.fillText(state.message, VIEW.width / 2, 227);
      ctx.textAlign = 'left';
    }

    drawMinimap(state);
  }

  function drawMinimap(state) {
    const level = state.level;
    const mw = 230;
    const mh = Math.round((mw * level.world.h) / level.world.w);
    const mx = VIEW.width - mw - 18;
    const my = VIEW.height - mh - 36;
    const sx = mw / level.world.w;
    const sy = mh / level.world.h;
    ctx.fillStyle = 'rgba(24, 18, 12, 0.85)';
    ctx.fillRect(mx - 6, my - 6, mw + 12, mh + 26);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mx - 6, my - 6, mw + 12, mh + 26);
    ctx.fillStyle = state.stage === 2 ? '#5a4a3a' : '#4a6428';
    ctx.fillRect(mx, my, mw, mh);
    for (const w of level.walls) {
      ctx.fillStyle = '#2c2118';
      ctx.fillRect(mx + w.x * sx, my + w.y * sy, Math.max(2, w.w * sx), Math.max(2, w.h * sy));
    }
    for (const o of level.ovens) {
      ctx.fillStyle = '#ff7a26';
      ctx.fillRect(mx + o.x * sx, my + o.y * sy, Math.max(3, o.w * sx), Math.max(3, o.h * sy));
    }
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(mx + level.exit.x * sx, my + level.exit.y * sy, 10, 8);
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      ctx.fillStyle = pk.kind === 'corn' ? PALETTE.corn : pk.kind === 'feather' ? '#fff' : PALETTE.heart;
      ctx.fillRect(mx + pk.x * sx - 1, my + pk.y * sy - 1, 3, 3);
    }
    ctx.fillStyle = '#ff5a4b';
    ctx.beginPath(); ctx.arc(mx + state.farmer.x * sx, my + state.farmer.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('MAP — green exit · red farmer · white you', mx, my + mh + 15);
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(16, 12, 8, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(title, VIEW.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 21px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, VIEW.width / 2, 300 + i * 32);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    const cam = camera(state);
    drawGround(state, cam);
    drawExit(state, cam);
    drawHaystacks(state, cam);
    drawOvens(state, cam);
    drawWalls(state, cam);
    drawPickups(state, cam);
    drawKnives(state, cam);
    drawFarmer(state, cam);
    drawTurkey(state, cam);
    if (screen === SCREEN_TITLE) {
      overlay('TURKEY TROT', [
        'The Great Thanksgiving Escape',
        'Thanksgiving is coming — and you are the main course.',
        'Slip past the farmer, dodge his carving knives, mind the ovens,',
        'and reach the forest gate. Hide in the hay. Toss corn to distract him.',
        '',
        'WASD / arrows — move      Shift — dash      E — hide in hay      Click — toss corn',
        '',
        'Press Enter or click to start',
      ], '#f2c94c');
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Best score: ${best}`, VIEW.width / 2, 560);
      ctx.textAlign = 'left';
      return;
    }
    drawHUD(state, best);
    if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Take a breath, turkey.', 'Press P or Enter to keep running.'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      overlay('CAUGHT!', [
        state.message || 'The farmer caught you!',
        `Score ${state.score}   ·   Best ${best}`,
        '',
        'Press Enter or click to try again',
      ], PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      overlay('ESCAPED!', [
        'You made it to the forest — no Thanksgiving dinner today!',
        `Score ${state.score}   ·   Best ${best}`,
        '',
        'Press Enter or click to run again',
      ], PALETTE.good);
    }
  }

  return { draw, camera };
}
