// Enemies: four kinds plus elites and a boss, each with its own movement and attack.
// A kind is a row in config; this file turns rows into behaviour.
import { ENEMIES, FIELD } from './config.js';

export function spawnEnemy(state, kind, x, y, elite) {
  const base = ENEMIES[kind];
  const hpScale = 1 + (state.wave - 1) * 0.12 + (state.endless ? state.endlessWaves * 0.15 : 0);
  const e = {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: base.hp * hpScale * (elite ? 3.2 : 1),
    maxHp: base.hp * hpScale * (elite ? 3.2 : 1),
    speed: base.speed * (elite ? 0.9 : 1) * state.rng.range(0.9, 1.1),
    radius: base.radius * (elite ? 1.35 : 1),
    damage: base.damage,
    score: base.score * (elite ? 3 : 1),
    xp: base.xp * (elite ? 4 : 1),
    color: base.color,
    elite: !!elite,
    flash: 0,
    shootTimer: state.rng.range(1, 2.5),
    wobble: state.rng.next() * Math.PI * 2,
    burstTimer: 3,
    summonTimer: 5,
  };
  state.enemies.push(e);
  return e;
}

export function spawnBoss(state) {
  const base = ENEMIES.boss;
  const scale = 1 + (state.wave - 1) * 0.1;
  const b = {
    kind: 'boss',
    x: FIELD.width / 2,
    y: -60,
    vx: 0,
    vy: 0,
    hp: base.hp * scale,
    maxHp: base.hp * scale,
    speed: base.speed,
    radius: base.radius,
    damage: base.damage,
    score: base.score,
    xp: base.xp,
    color: base.color,
    elite: false,
    boss: true,
    flash: 0,
    shootTimer: 2,
    wobble: 0,
    burstTimer: 2.5,
    summonTimer: 6,
  };
  state.enemies.push(b);
  state.boss = b;
  state.audio.boss();
  return b;
}

function edgeSpawn(state) {
  const side = state.rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: state.rng.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: state.rng.range(0, FIELD.width), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: state.rng.range(0, FIELD.height) };
  return { x: FIELD.width + m, y: state.rng.range(0, FIELD.height) };
}

export function spawnWaveEnemies(state, comp) {
  for (const [kind, count] of Object.entries(comp)) {
    if (kind === 'boss') continue;
    for (let i = 0; i < count; i += 1) {
      const p = edgeSpawn(state);
      const elite = state.wave >= 3 && state.rng.next() < 0.07;
      spawnEnemy(state, kind, p.x, p.y, elite);
    }
  }
}

function steer(e, tx, ty, dt) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const len = Math.hypot(dx, dy) || 1;
  e.x += (dx / len) * e.speed * dt;
  e.y += (dy / len) * e.speed * dt;
}

export function updateEnemies(state, dt) {
  const p = state.player;
  for (const e of state.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (e.kind === 'cinder' || e.kind === 'husk') {
      steer(e, p.x, p.y, dt);
    } else if (e.kind === 'wisp') {
      e.wobble += dt * 6;
      const px = -dy / dist;
      const py = dx / dist;
      e.x += ((dx / dist) * e.speed + px * Math.sin(e.wobble) * 90) * dt;
      e.y += ((dy / dist) * e.speed + py * Math.sin(e.wobble) * 90) * dt;
    } else if (e.kind === 'spitter') {
      if (dist > 260) steer(e, p.x, p.y, dt);
      else if (dist < 180) steer(e, p.x + (e.x - p.x) * 2, p.y + (e.y - p.y) * 2, dt);
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && p.alive) {
        e.shootTimer = state.rng.range(1.8, 2.6);
        state.ebullets.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * 170, vy: (dy / dist) * 170,
          damage: e.damage, radius: 6, life: 4,
        });
        state.audio.shoot();
      }
    } else if (e.kind === 'boss') {
      if (e.y < 90) {
        e.y += 70 * dt;
      } else {
        steer(e, p.x, p.y, dt * 0.7);
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = state.rng.range(2.2, 3);
          for (let i = 0; i < 10; i += 1) {
            const a = (i / 10) * Math.PI * 2 + state.rng.next() * 0.4;
            state.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, damage: 14, radius: 7, life: 5 });
          }
          state.shake = Math.min(12, state.shake + 5);
        }
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = 7;
          for (let i = 0; i < 3; i += 1) {
            const pos = edgeSpawn(state);
            spawnEnemy(state, 'cinder', pos.x, pos.y, false);
          }
        }
      }
    }
  }
}
