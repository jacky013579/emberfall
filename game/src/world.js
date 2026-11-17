// The world: one state, one fixed step, and the rules that join the parts.
// Player, enemies, bullets and pickups each own their motion; this file owns the
// wave flow, the collisions between them, and the events the loop reacts to.
import { FIELD, STEP, WAVE_CLEAR_BONUS, WAVES } from './config.js';
import { createPlayer, gainXp, hurtPlayer, updatePlayer, xpForLevel } from './player.js';
import { spawnBoss, spawnEnemy, updateEnemies } from './enemies.js';
import { updateBullets } from './bullets.js';
import { dropBonus, dropEmber, updatePickups } from './pickups.js';
import { burst, floatText, updateParticles } from './particles.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_LEVELUP = 4;
export const EVENT_VICTORY = 8;
export const EVENT_WAVE = 16;

export function createWorld(rng, audio) {
  return {
    rng,
    audio,
    time: 0,
    wave: 0,
    waveState: 'banner',
    waveTimer: 2.2,
    score: 0,
    kills: 0,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    pendingLevels: 0,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    ebullets: [],
    pickups: [],
    parts: [],
    texts: [],
    shake: 0,
    hitStop: 0,
    boss: null,
    victory: false,
    endless: false,
    endlessWaves: 0,
    best: 0,
    view: { scale: 1, ox: 0, oy: 0 },
    lastStepAt: 0,
    spawnComp: {},
    spawnLeft: 0,
    spawnTimer: 0,
  };
}

export function resetWorld(state) {
  const best = state.best;
  const view = state.view;
  const fresh = createWorld(state.rng, state.audio);
  fresh.best = best;
  fresh.view = view;
  Object.assign(state, fresh);
}

function waveComp(wave) {
  if (wave <= WAVES.length) return WAVES[wave - 1];
  const n = wave - WAVES.length;
  return {
    cinder: 18 + n * 2,
    wisp: 12 + n,
    spitter: 8 + n,
    husk: 5 + Math.floor(n / 2),
    ...(wave % 5 === 0 ? { boss: 1 } : {}),
  };
}

function edgePoint(state) {
  const side = state.rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: state.rng.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: state.rng.range(0, FIELD.width), y: FIELD.height + m };
  if (side === 2) return { x: -m, y: state.rng.range(0, FIELD.height) };
  return { x: FIELD.width + m, y: state.rng.range(0, FIELD.height) };
}

function startWave(state) {
  state.wave += 1;
  state.waveState = 'banner';
  state.waveTimer = 2.2;
  const comp = waveComp(state.wave);
  state.spawnComp = comp;
  state.spawnLeft = Object.entries(comp).reduce((sum, [k, v]) => (k === 'boss' ? sum : sum + v), 0);
  state.spawnTimer = 0;
  if (comp.boss) spawnBoss(state);
}

function trickleSpawn(state, dt) {
  if (state.spawnLeft <= 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = 0.35;
  const kinds = Object.keys(state.spawnComp).filter((k) => k !== 'boss');
  const kind = kinds[state.rng.int(0, kinds.length - 1)];
  const p = edgePoint(state);
  const elite = state.wave >= 3 && state.rng.next() < 0.07;
  spawnEnemy(state, kind, p.x, p.y, elite);
  state.spawnLeft -= 1;
}

function killEnemy(state, e, index) {
  state.enemies.splice(index, 1);
  state.kills += 1;
  state.score += e.score;
  state.hitStop = Math.max(state.hitStop, 0.03);
  burst(state, e.x, e.y, e.color, e.boss ? 46 : 14, e.boss ? 320 : 200);
  floatText(state, e.x, e.y - 10, `+${e.score}`, '#ffd166');
  dropEmber(state, e.x, e.y, e.xp);
  if (state.rng.next() < 0.06) dropBonus(state, e.x, e.y);
  state.audio.explode();
  if (e.boss) {
    state.boss = null;
    state.shake = 16;
    if (state.wave === 10 && !state.endless) {
      state.victory = true;
      return EVENT_VICTORY;
    }
  }
  return EVENT_NONE;
}

function resolveBulletHits(state) {
  let events = EVENT_NONE;
  for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
    const b = state.bullets[bi];
    let consumed = false;
    for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
      const e = state.enemies[ei];
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      if (dx * dx + dy * dy > (e.radius + b.radius) * (e.radius + b.radius)) continue;
      e.hp -= b.damage;
      e.flash = 0.12;
      burst(state, b.x, b.y, '#ffe9a8', 3, 120);
      floatText(state, e.x, e.y - e.radius - 6, String(b.damage), b.crit ? '#ffcf3f' : '#ffffff');
      state.audio.hit();
      if (e.hp <= 0) events |= killEnemy(state, e, ei);
      if (b.pierce > 0) b.pierce -= 1;
      else consumed = true;
      break;
    }
    if (consumed) state.bullets.splice(bi, 1);
  }
  return events;
}

function resolveTouches(state) {
  const p = state.player;
  if (!p.alive) return EVENT_NONE;
  let events = EVENT_NONE;
  for (const e of state.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < e.radius + 14) {
      if (hurtPlayer(state, e.damage)) return EVENT_OVER;
      e.x -= (dx / dist) * 30;
      e.y -= (dy / dist) * 30;
      events |= EVENT_HIT;
    }
  }
  for (let i = state.ebullets.length - 1; i >= 0; i -= 1) {
    const b = state.ebullets[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    if (dx * dx + dy * dy < (14 + b.radius) * (14 + b.radius)) {
      state.ebullets.splice(i, 1);
      if (hurtPlayer(state, b.damage)) return EVENT_OVER;
      events |= EVENT_HIT;
    }
  }
  return events;
}

function resolvePickups(state) {
  const p = state.player;
  if (!p.alive) return;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pk = state.pickups[i];
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    if (dx * dx + dy * dy > 26 * 26) continue;
    state.pickups.splice(i, 1);
    if (pk.kind === 'ember') {
      gainXp(state, pk.value);
      state.audio.pickup();
    } else if (pk.kind === 'heart') {
      p.hp = Math.min(p.maxHp, p.hp + 30);
      floatText(state, p.x, p.y - 22, '+30', '#7dff6a');
      state.audio.pickup();
    } else if (pk.kind === 'magnet') {
      for (const other of state.pickups) {
        if (other.kind === 'ember') {
          other.x = p.x;
          other.y = p.y;
        }
      }
      floatText(state, p.x, p.y - 22, 'MAGNET', '#7dd7ff');
      state.audio.pickup();
    } else if (pk.kind === 'nova') {
      for (let ei = state.enemies.length - 1; ei >= 0; ei -= 1) {
        const e = state.enemies[ei];
        e.hp -= 150;
        if (e.hp <= 0) killEnemy(state, e, ei);
      }
      burst(state, p.x, p.y, '#ffd166', 40, 420);
      state.shake = 14;
      state.audio.explode();
    }
  }
}

// One fixed step of the live game. `actions` is the frame's one-shot input bitmask.
// demo=true steps the title backdrop: the world drifts, nothing can hurt the player.
export function stepWorld(state, input, actions, demo) {
  const dt = STEP;
  state.time += dt;
  if (state.hitStop > 0) {
    state.hitStop -= dt;
    updateParticles(state, dt);
    return EVENT_NONE;
  }
  let events = EVENT_NONE;

  if (state.waveState === 'banner') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) state.waveState = 'fighting';
  } else if (state.waveState === 'fighting') {
    trickleSpawn(state, dt);
  }

  if (!demo) updatePlayer(state, input, actions, dt);
  updateEnemies(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);
  updateParticles(state, dt);

  if (demo) return EVENT_NONE;

  events |= resolveBulletHits(state);
  if (state.victory) return events | EVENT_VICTORY;
  events |= resolveTouches(state);
  if (!state.player.alive) return events | EVENT_OVER;
  resolvePickups(state);
  if (state.pendingLevels > 0) return events | EVENT_LEVELUP;

  if (state.waveState === 'fighting' && state.spawnLeft <= 0 && state.enemies.length === 0 && !state.boss) {
    state.waveState = 'clear';
    state.waveTimer = 1.6;
    state.score += WAVE_CLEAR_BONUS;
    floatText(state, FIELD.width / 2, FIELD.height / 2 - 40, `WAVE CLEAR  +${WAVE_CLEAR_BONUS}`, '#ffd166');
    events |= EVENT_WAVE;
  } else if (state.waveState === 'clear') {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      if (state.wave >= 10) {
        state.endless = true;
        state.endlessWaves += 1;
      }
      startWave(state);
    }
  }
  return events;
}

export { startWave };
