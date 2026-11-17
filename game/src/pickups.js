// Pickups: ember shards (experience), hearts, magnets and novas.
// They drift toward the player once close, and the magnet pulls them all in.
import { FIELD } from './config.js';

export function dropEmber(state, x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    const a = state.rng.next() * Math.PI * 2;
    const d = state.rng.range(6, 26);
    state.pickups.push({
      kind: 'ember', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, value: 1, radius: 6, life: 25,
    });
  }
}

export function dropBonus(state, x, y) {
  const roll = state.rng.next();
  const kind = roll < 0.5 ? 'heart' : roll < 0.75 ? 'magnet' : 'nova';
  state.pickups.push({ kind, x, y, vx: 0, vy: 0, value: 0, radius: 11, life: 12 });
}

export function updatePickups(state, dt) {
  const p = state.player;
  for (const pk of state.pickups) {
    pk.life -= dt;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = pk.kind === 'ember' ? p.magnet : 90;
    if (p.alive && dist < pull) {
      const speed = pk.kind === 'ember' ? 420 : 200;
      pk.vx = (dx / dist) * speed;
      pk.vy = (dy / dist) * speed;
    } else {
      pk.vx *= 0.9;
      pk.vy *= 0.9;
    }
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;
    pk.x = Math.max(10, Math.min(FIELD.width - 10, pk.x));
    pk.y = Math.max(10, Math.min(FIELD.height - 10, pk.y));
  }
  state.pickups = state.pickups.filter((pk) => pk.life > 0);
}
