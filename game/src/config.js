// Emberfall: tuning and constants. One place for every number the game balances on,
// so a tweak here retunes the whole game without touching the rules.
export const STEP = 1 / 60;
export const FIELD = { width: 960, height: 600 };
export const BEST_KEY = 'emberfall.best';
export const WAVE_CLEAR_BONUS = 150;
export const BOSS_WAVES = [5, 10];

export const PLAYER = {
  radius: 14,
  speed: 240,
  maxHp: 100,
  fireInterval: 0.22,
  bulletSpeed: 560,
  bulletDamage: 22,
  bulletRadius: 5,
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 2.2,
  pickupRadius: 70,
  xpNextBase: 30,
};

export const ENEMIES = {
  cinder: { hp: 30, speed: 150, radius: 13, damage: 10, score: 50, xp: 1, color: '#ff7a3c' },
  wisp: { hp: 18, speed: 215, radius: 10, damage: 8, score: 70, xp: 1, color: '#c792ff' },
  spitter: { hp: 42, speed: 95, radius: 14, damage: 12, score: 90, xp: 2, color: '#7dff6a' },
  husk: { hp: 120, speed: 62, radius: 20, damage: 18, score: 140, xp: 3, color: '#8a97a8' },
  boss: { hp: 1400, speed: 58, radius: 42, damage: 25, score: 1500, xp: 20, color: '#ff2e63' },
};

export const WAVES = [
  { cinder: 6 },
  { cinder: 8, wisp: 3 },
  { cinder: 10, wisp: 5, spitter: 2 },
  { cinder: 12, wisp: 6, spitter: 4, husk: 2 },
  { boss: 1, cinder: 6 },
  { cinder: 14, wisp: 8, spitter: 6, husk: 3 },
  { cinder: 16, wisp: 10, spitter: 6, husk: 4 },
  { cinder: 18, wisp: 12, spitter: 8, husk: 5 },
  { cinder: 20, wisp: 14, spitter: 10, husk: 6 },
  { boss: 1, cinder: 10, wisp: 8 },
];
