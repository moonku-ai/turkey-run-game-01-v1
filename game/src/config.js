// Every tuning number, colour and level layout in one place. The view is a fixed
// 1280x720 logical area; the camera follows the turkey across a larger world, so no
// rule below depends on the screen size.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const TILE = 48;

export const TURKEY = {
  radius: 16,
  walk: 215,
  dash: 355,
  staminaMax: 100,
  staminaDrain: 42,
  staminaRegen: 24,
  staminaDashMin: 12,
  invulnerable: 1.6,
  catchRadius: 30,
};

export const FARMER = {
  radius: 18,
  patrol: 118,
  suspicious: 165,
  chase: 248,
  visionRange: 330,
  visionHalfAngle: 0.62,
  alertRise: 46,
  alertFall: 26,
  alertFallHidden: 65,
  searchSeconds: 4.5,
  suspiciousSeconds: 1.6,
  knifeRange: 430,
  knifeCooldown: 2.3,
  knifeWindup: 0.38,
  knifeSpeed: 430,
  decoySeconds: 3.5,
};

export const KNIFE = { speed: 430, radius: 9, life: 2.2 };

export const SCORE = { corn: 10, feather: 50, stage: 100, escape: 200, timeBonusPerSec: 2 };
export const PAR_SECONDS = [75, 85, 95];
export const LIVES_START = 3;
export const KERNELS_MAX = 5;
export const OVEN_HEAT_RATE = 55;
export const OVEN_COOL_RATE = 40;

export const PALETTE = {
  // Autumn farmyard at dusk.
  grass: '#6f8f3e', grassDark: '#5d7d33', grassLight: '#84a34c',
  dirt: '#a9804f', dirtDark: '#8f6c40',
  fence: '#7a5230', fenceDark: '#5f3f24',
  barnWood: '#8a5a33', barnWoodDark: '#6e4525', barnRoof: '#a33d2e',
  hay: '#d9b45b', hayDark: '#b98f35',
  kitchenFloor: '#c9b8a3', kitchenTile: '#b7a58d', kitchenWall: '#7d6a58',
  oven: '#3a3a40', ovenGlow: '#ff7a26', ovenHot: '#ffb347',
  water: '#4a7fa5',
  turkeyBody: '#8a5a2e', turkeyDark: '#6b4423', turkeyTail: ['#b5651d', '#d2691e', '#e8a33c', '#a0522d', '#c97b2d'],
  turkeyHead: '#d97b6c', wattle: '#e5534b', beak: '#f2c94c', leg: '#e8a33c',
  farmerShirt: '#4a6fa5', farmerOveralls: '#3d5a80', farmerHat: '#d9b45b', farmerSkin: '#e8b88a',
  knife: '#d7dde6', knifeHandle: '#5a3a22',
  corn: '#f2c94c', feather: '#f2e6c9', heart: '#e5534b',
  exit: '#7bc96f', exitDark: '#4e9b41',
  panel: 'rgba(24, 18, 12, 0.82)', panelEdge: '#d9b45b',
  text: '#fdf6e3', muted: '#cbb98f', danger: '#ff5a4b', warn: '#ffb347', good: '#7bc96f',
  coneCalm: 'rgba(242, 201, 76, 0.16)', coneAlert: 'rgba(255, 90, 75, 0.22)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const BEST_KEY = 'turkey-trot.best';

/**
 * One level: a world rectangle, wall rectangles, haystacks (hiding spots),
 * oven rectangles (kitchen only), corn/feather/heart pickups, the farmer's
 * patrol waypoints, the turkey spawn and the exit gate.
 * Coordinates are world pixels; walls are {x, y, w, h}.
 */
export const LEVELS = [
  {
    name: 'Farmyard',
    sub: 'Stage 1 of 3 — slip past the farmer',
    world: { w: 2400, h: 1500 },
    spawn: { x: 160, y: 1330 },
    exit: { x: 2240, y: 120, w: 120, h: 90, label: 'FOREST GATE' },
    walls: [
      { x: 0, y: 0, w: 2400, h: 40 }, { x: 0, y: 1460, w: 2400, h: 40 },
      { x: 0, y: 0, w: 40, h: 1500 }, { x: 2360, y: 0, w: 40, h: 1500 },
      { x: 420, y: 300, w: 320, h: 60 }, { x: 980, y: 180, w: 60, h: 320 },
      { x: 1500, y: 640, w: 340, h: 60 }, { x: 700, y: 900, w: 60, h: 300 },
      { x: 1250, y: 1050, w: 380, h: 60 }, { x: 1900, y: 300, w: 60, h: 300 },
      { x: 420, y: 1150, w: 260, h: 56 },
    ],
    haystacks: [
      { x: 300, y: 700, r: 52 }, { x: 1150, y: 420, r: 52 }, { x: 1750, y: 1050, r: 56 },
      { x: 2050, y: 800, r: 48 }, { x: 620, y: 250, r: 46 },
    ],
    ovens: [],
    corn: [
      { x: 320, y: 1150 }, { x: 560, y: 620 }, { x: 880, y: 320 }, { x: 1120, y: 760 },
      { x: 1450, y: 300 }, { x: 1700, y: 900 }, { x: 1980, y: 560 }, { x: 2150, y: 1300 },
      { x: 760, y: 1330 }, { x: 1350, y: 1250 }, { x: 420, y: 480 }, { x: 2050, y: 1150 },
    ],
    feathers: [{ x: 1680, y: 420 }, { x: 900, y: 1250 }],
    hearts: [{ x: 2250, y: 750 }],
    patrol: [
      { x: 500, y: 500 }, { x: 1200, y: 350 }, { x: 1900, y: 550 },
      { x: 1600, y: 1150 }, { x: 900, y: 1150 }, { x: 500, y: 950 },
    ],
    farmerSpawn: { x: 1200, y: 350 },
  },
  {
    name: 'The Barn',
    sub: 'Stage 2 of 3 — through the barn, stay out of sight',
    world: { w: 2200, h: 1400 },
    spawn: { x: 140, y: 1240 },
    exit: { x: 1990, y: 110, w: 120, h: 90, label: 'KITCHEN DOOR' },
    walls: [
      { x: 0, y: 0, w: 2200, h: 40 }, { x: 0, y: 1360, w: 2200, h: 40 },
      { x: 0, y: 0, w: 40, h: 1400 }, { x: 2160, y: 0, w: 40, h: 1400 },
      { x: 380, y: 260, w: 60, h: 420 }, { x: 800, y: 700, w: 420, h: 60 },
      { x: 1350, y: 250, w: 60, h: 380 }, { x: 950, y: 1050, w: 60, h: 220 },
      { x: 1650, y: 800, w: 360, h: 60 }, { x: 600, y: 1000, w: 300, h: 56 },
    ],
    haystacks: [
      { x: 260, y: 500, r: 56 }, { x: 700, y: 480, r: 52 }, { x: 1150, y: 900, r: 56 },
      { x: 1500, y: 1150, r: 52 }, { x: 1900, y: 500, r: 50 }, { x: 480, y: 1150, r: 48 },
    ],
    ovens: [],
    corn: [
      { x: 300, y: 900 }, { x: 620, y: 300 }, { x: 1000, y: 500 }, { x: 1250, y: 1250 },
      { x: 1550, y: 450 }, { x: 1850, y: 1050 }, { x: 2050, y: 300 }, { x: 850, y: 1250 },
      { x: 1500, y: 700 }, { x: 420, y: 700 },
    ],
    feathers: [{ x: 1050, y: 850 }, { x: 1950, y: 1200 }],
    hearts: [{ x: 200, y: 200 }],
    patrol: [
      { x: 500, y: 350 }, { x: 1100, y: 400 }, { x: 1750, y: 350 },
      { x: 1900, y: 950 }, { x: 1100, y: 1150 }, { x: 550, y: 950 },
    ],
    farmerSpawn: { x: 1100, y: 400 },
  },
  {
    name: 'The Kitchen',
    sub: 'Stage 3 of 3 — past the ovens to freedom',
    world: { w: 2200, h: 1400 },
    spawn: { x: 140, y: 1240 },
    exit: { x: 1990, y: 110, w: 120, h: 90, label: 'BACK DOOR — FREEDOM' },
    walls: [
      { x: 0, y: 0, w: 2200, h: 40 }, { x: 0, y: 1360, w: 2200, h: 40 },
      { x: 0, y: 0, w: 40, h: 1400 }, { x: 2160, y: 0, w: 40, h: 1400 },
      { x: 480, y: 300, w: 420, h: 56 }, { x: 1300, y: 220, w: 56, h: 340 },
      { x: 700, y: 850, w: 56, h: 320 }, { x: 1500, y: 950, w: 400, h: 56 },
      { x: 1000, y: 550, w: 300, h: 56 },
    ],
    haystacks: [
      { x: 300, y: 600, r: 50 }, { x: 1150, y: 1050, r: 52 }, { x: 1850, y: 700, r: 50 },
    ],
    ovens: [
      { x: 950, y: 300, w: 220, h: 110 }, { x: 1650, y: 350, w: 220, h: 110 },
      { x: 450, y: 1000, w: 220, h: 110 }, { x: 1250, y: 1150, w: 220, h: 110 },
    ],
    corn: [
      { x: 320, y: 950 }, { x: 700, y: 500 }, { x: 1100, y: 350 }, { x: 1500, y: 600 },
      { x: 1900, y: 1050 }, { x: 850, y: 1250 }, { x: 1750, y: 200 }, { x: 1150, y: 750 },
      { x: 500, y: 700 }, { x: 2050, y: 450 },
    ],
    feathers: [{ x: 1350, y: 800 }, { x: 600, y: 1200 }],
    hearts: [{ x: 2050, y: 1250 }],
    patrol: [
      { x: 600, y: 450 }, { x: 1250, y: 400 }, { x: 1850, y: 550 },
      { x: 1600, y: 1150 }, { x: 800, y: 1150 }, { x: 450, y: 750 },
    ],
    farmerSpawn: { x: 1250, y: 400 },
  },
];
