// Juice: sparks, embers and floating text. Particles are cosmetic only: they never
// change the rules, so a bad frame can drop them without changing the game.
export function burst(state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = state.rng.next() * Math.PI * 2;
    const sp = state.rng.range(speed * 0.3, speed);
    state.parts.push({
      x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: state.rng.range(0.25, 0.6), max: 0.6,
      size: state.rng.range(2, 5), color,
    });
  }
}

export function floatText(state, x, y, text, color) {
  state.texts.push({ x, y, text, color, life: 0.9, max: 0.9 });
}

export function updateParticles(state, dt) {
  for (const pt of state.parts) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  state.parts = state.parts.filter((pt) => pt.life > 0);
  for (const t of state.texts) {
    t.y -= 42 * dt;
    t.life -= dt;
  }
  state.texts = state.texts.filter((t) => t.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);
}
