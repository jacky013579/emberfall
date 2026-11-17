// Projectiles: the player's lantern shots and the enemies' orbs.
// Motion here; hits are resolved in world.js, which sees both sides.
import { FIELD } from './config.js';

export function updateBullets(state, dt) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.bullets = state.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < FIELD.width + 20 && b.y > -20 && b.y < FIELD.height + 20);
  for (const b of state.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }
  state.ebullets = state.ebullets.filter((b) => b.life > 0 && b.x > -30 && b.x < FIELD.width + 30 && b.y > -30 && b.y < FIELD.height + 30);
}
