// Rendering: everything the player sees of the world itself (the arena, the warden,
// the enemies, shots, pickups and effects). Screens and HUD live in ui.js.
import { FIELD } from './config.js';

export const VIEW = { width: 1280, height: 720 };

export function computeView() {
  const scale = Math.min(VIEW.width / FIELD.width, VIEW.height / FIELD.height);
  return {
    scale,
    ox: (VIEW.width - FIELD.width * scale) / 2,
    oy: (VIEW.height - FIELD.height * scale) / 2,
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, screen) {
      const view = state.view;
      ctx.save();
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = '#0b0e1a';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.scale, view.scale);
      drawArena(ctx, state);
      drawPickups(ctx, state);
      drawEnemies(ctx, state);
      if (state.player.alive) drawPlayer(ctx, state);
      drawBullets(ctx, state);
      drawParticles(ctx, state);
      drawTexts(ctx, state);
      ctx.restore();
    },
  };
}

function drawArena(ctx, state) {
  ctx.fillStyle = '#12172a';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = 'rgba(125, 140, 255, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= FIELD.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= FIELD.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
    ctx.stroke();
  }
  // Warm glow at the centre: the last ember the warden defends.
  const g = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 10, FIELD.width / 2, FIELD.height / 2, 260);
  g.addColorStop(0, 'rgba(255, 170, 60, 0.20)');
  g.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.strokeStyle = '#2c3a5e';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, FIELD.width - 3, FIELD.height - 3);
  // The ember itself.
  const pulse = 1 + Math.sin(state.time * 3) * 0.12;
  ctx.save();
  ctx.translate(FIELD.width / 2, FIELD.height / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ffaa3c';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickups(ctx, state) {
  for (const pk of state.pickups) {
    const bob = Math.sin(state.time * 5 + pk.x) * 2;
    if (pk.kind === 'ember') {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, pk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(pk.x - 1.5, pk.y + bob - 1.5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pk.kind === 'heart') {
      ctx.fillStyle = '#ff5b7f';
      ctx.beginPath();
      ctx.arc(pk.x - 4, pk.y + bob - 2, 5, 0, Math.PI * 2);
      ctx.arc(pk.x + 4, pk.y + bob - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pk.x - 8, pk.y + bob);
      ctx.lineTo(pk.x, pk.y + bob + 8);
      ctx.lineTo(pk.x + 8, pk.y + bob);
      ctx.fill();
    } else if (pk.kind === 'magnet') {
      ctx.strokeStyle = '#7dd7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 9, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 9, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();
      ctx.fillStyle = '#7dd7ff';
      ctx.fillRect(pk.x - 11, pk.y + bob - 3, 4, 6);
      ctx.fillRect(pk.x + 7, pk.y + bob - 3, 4, 6);
    } else if (pk.kind === 'nova') {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(pk.x + Math.cos(a) * 12, pk.y + bob + Math.sin(a) * 12);
        ctx.lineTo(pk.x + Math.cos(a) * 18, pk.y + bob + Math.sin(a) * 18);
        ctx.stroke();
      }
    }
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    const body = e.flash > 0 ? '#ffffff' : e.color;
    if (e.kind === 'cinder') {
      ctx.rotate(Math.atan2(state.player.y - e.y, state.player.x - e.x));
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'wisp') {
      ctx.rotate(state.time * 2 + e.wobble);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 13);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'spitter') {
      ctx.fillStyle = body;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#0b0e1a';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'husk') {
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(a) * 20;
        const y = Math.sin(a) * 20;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'boss') {
      ctx.fillStyle = body;
      ctx.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 2 === 0 ? 46 : 36;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2b0a12';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(-6, -3, 4, 0, Math.PI * 2);
      ctx.arc(7, -3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.elite) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Health bar for hurt enemies and the boss.
    if ((e.hp < e.maxHp && e.kind !== 'boss') || e.kind === 'boss') {
      const w = e.kind === 'boss' ? 84 : e.radius * 2;
      const y = -e.radius - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-w / 2, y, w, 5);
      ctx.fillStyle = e.kind === 'boss' ? '#ff2e63' : '#7dff6a';
      ctx.fillRect(-w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(state.time * 16) % 2 === 0) ctx.globalAlpha = 0.45;
  // Lantern glow.
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 64);
  g.addColorStop(0, 'rgba(255, 209, 102, 0.35)');
  g.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(p.angle);
  // Gun barrel.
  ctx.fillStyle = '#e8ecf4';
  ctx.fillRect(8, -3, 20, 6);
  ctx.rotate(-p.angle);
  // Body: the warden, a hooded circle with a bright core.
  ctx.fillStyle = '#3f6cff';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  // Dash cooldown ring.
  if (p.dashCd > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / 2.2));
    ctx.stroke();
  }
  ctx.restore();
}

function drawBullets(ctx, state) {
  for (const b of state.bullets) {
    ctx.fillStyle = b.crit ? '#ffcf3f' : '#ffe9a8';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of state.ebullets) {
    ctx.fillStyle = '#ff5b7f';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7e0';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, state) {
  for (const pt of state.parts) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, state) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px system-ui, sans-serif';
  for (const t of state.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
