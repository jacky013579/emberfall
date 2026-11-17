// The warden: movement, dash, the lantern gun, damage and experience.
// The world owns the state; this file owns how the player inside it behaves.
import { FIELD, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    projectiles: 1,
    pierce: 0,
    bulletSpeed: PLAYER.bulletSpeed,
    crit: 0.05,
    magnet: PLAYER.pickupRadius,
    fireTimer: 0,
    dashTimer: 0,
    dashCd: 0,
    dashX: 0,
    dashY: 0,
    invuln: 0,
    alive: true,
  };
}

export function xpForLevel(level) {
  return Math.round(PLAYER.xpNextBase * Math.pow(1.28, level - 1));
}

function fire(state) {
  const p = state.player;
  const base = p.angle - 0.09 * (p.projectiles - 1);
  for (let i = 0; i < p.projectiles; i += 1) {
    const a = base + i * 0.18;
    const crit = state.rng.next() < p.crit;
    state.bullets.push({
      x: p.x + Math.cos(a) * 20,
      y: p.y + Math.sin(a) * 20,
      vx: Math.cos(a) * p.bulletSpeed,
      vy: Math.sin(a) * p.bulletSpeed,
      damage: Math.round(p.damage * (crit ? 2 : 1)),
      crit,
      pierce: p.pierce,
      radius: PLAYER.bulletRadius,
      life: 1.1,
    });
  }
  state.audio.shoot();
  state.parts.push({ x: p.x + Math.cos(p.angle) * 22, y: p.y + Math.sin(p.angle) * 22, vx: Math.cos(p.angle) * 60, vy: Math.sin(p.angle) * 60, life: 0.12, max: 0.12, size: 7, color: '#ffd166' });
}

export function updatePlayer(state, input, actions, dt) {
  const p = state.player;
  if (!p.alive) return;
  p.invuln = Math.max(0, p.invuln - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);

  const aim = input.aim();
  const scale = state.view.scale;
  const wx = (aim.x - state.view.ox) / scale;
  const wy = (aim.y - state.view.oy) / scale;
  p.angle = Math.atan2(wy - p.y, wx - p.x);

  const dir = input.direction();
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
  } else {
    p.x += dir.x * p.speed * dt;
    p.y += dir.y * p.speed * dt;
    if ((dir.x !== 0 || dir.y !== 0) && state.time - (state.lastStepAt || 0) > 0.28) {
      state.lastStepAt = state.time;
      state.parts.push({ x: p.x, y: p.y + 10, vx: -dir.x * 20, vy: 12, life: 0.3, max: 0.3, size: 4, color: '#5a6b7d' });
    }
  }
  p.x = Math.max(20, Math.min(FIELD.width - 20, p.x));
  p.y = Math.max(20, Math.min(FIELD.height - 20, p.y));

  if (actions & 4) {
    if (p.dashCd <= 0 && (dir.x !== 0 || dir.y !== 0)) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCd = PLAYER.dashCooldown;
      p.dashX = dir.x;
      p.dashY = dir.y;
      p.invuln = Math.max(p.invuln, 0.22);
      state.audio.dash();
    }
  }

  p.fireTimer -= dt;
  if (input.isFiring() && p.fireTimer <= 0) {
    fire(state);
    p.fireTimer = p.fireInterval;
  }
}

export function hurtPlayer(state, damage) {
  const p = state.player;
  if (!p.alive || p.invuln > 0 || p.dashTimer > 0) return false;
  p.hp -= damage;
  p.invuln = 0.6;
  state.shake = Math.min(14, state.shake + 7);
  state.audio.hurt();
  state.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 26, color: '#ff3355' });
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    state.audio.explode();
    for (let i = 0; i < 40; i += 1) {
      const a = state.rng.next() * Math.PI * 2;
      const sp = state.rng.range(40, 260);
      state.parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: state.rng.range(0.4, 0.9), max: 0.9, size: state.rng.range(3, 7), color: i % 3 === 0 ? '#ffd166' : '#ff7a3c' });
    }
    return true;
  }
  return false;
}

export function gainXp(state, amount) {
  state.xp += amount;
  while (state.xp >= state.xpNext) {
    state.xp -= state.xpNext;
    state.level += 1;
    state.xpNext = xpForLevel(state.level);
    state.pendingLevels += 1;
  }
}
