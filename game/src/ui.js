// Screens and HUD: everything drawn over the world — title, pause, level-up cards,
// game over and victory, plus the bars and numbers that tell the player how they stand.
import { FIELD } from './config.js';
import { VIEW } from './render.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const W = VIEW.width;
const H = VIEW.height;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2c3a5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawHUD(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Health.
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('HP', 20, 30);
  bar(ctx, 55, 18, 210, 16, p.hp / p.maxHp, p.hp > 30 ? '#7dff6a' : '#ff5b7f', 'rgba(0,0,0,0.6)');
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 275, 31);
  // Experience.
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`LV ${state.level}`, 20, 58);
  bar(ctx, 55, 46, 210, 10, state.xp / state.xpNext, '#ffb347', 'rgba(0,0,0,0.6)');
  // Wave, score, kills on the right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`WAVE ${state.wave}`, W - 20, 32);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`SCORE ${state.score}`, W - 20, 56);
  ctx.fillText(`KILLS ${state.kills}`, W - 20, 78);
  ctx.textAlign = 'left';
  // Dash pip.
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(p.dashCd <= 0 ? 'DASH READY  [Shift]' : 'DASH …', 20, H - 18);
  // Boss bar.
  if (state.boss) {
    const b = state.boss;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8fa3';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('CINDERLORD', W / 2, 30);
    bar(ctx, W / 2 - 220, 38, 440, 12, b.hp / b.maxHp, '#ff2e63', 'rgba(0,0,0,0.6)');
    ctx.textAlign = 'left';
  }
  // Wave banner.
  if (state.waveState === 'banner') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(state.wave % 5 === 0 && state.boss ? `WAVE ${state.wave} — THE CINDERLORD` : `WAVE ${state.wave}`, W / 2, H / 2 - 60);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Hold the ember. Survive.', W / 2, H / 2 - 28);
    ctx.textAlign = 'left';
  } else if (state.waveState === 'clear') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dff6a';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText('WAVE CLEAR', W / 2, H / 2 - 60);
    ctx.textAlign = 'left';
  }
}

export function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(5, 7, 16, 0.72)';
  ctx.fillRect(0, 0, W, H);
  const pulse = 1 + Math.sin(state.time * 2.4) * 0.03;
  ctx.save();
  ctx.translate(W / 2, 190);
  ctx.scale(pulse, pulse);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('EMBERFALL', 0, 0);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Defend the last ember. Survive the cinders.', W / 2, 240);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = '#9fb0d0';
  ctx.fillText('WASD / Arrows — move      Mouse — aim      Hold Click / Space — fire', W / 2, 300);
  ctx.fillText('Shift / Right-click — dash      P — pause      M — mute', W / 2, 328);
  ctx.fillText('Collect embers to level up. Beat the Cinderlord on wave 10 to win.', W / 2, 356);
  if (best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText(`BEST  ${best}`, W / 2, 408);
  }
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Click or press Space to start', W / 2, 470);
  }
  ctx.textAlign = 'left';
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 7, 16, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#9fb0d0';
  ctx.fillText('Press P or click to resume', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}

export function levelUpLayout() {
  const cw = 250;
  const ch = 170;
  const gap = 26;
  const total = cw * 3 + gap * 2;
  const x0 = (W - total) / 2;
  const y0 = 250;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (cw + gap), y: y0, w: cw, h: ch }));
}

export function drawLevelUp(ctx, state, choices) {
  ctx.fillStyle = 'rgba(5, 7, 16, 0.66)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${state.level}`, W / 2, 150);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Choose an upgrade — click a card or press 1, 2, 3', W / 2, 190);
  const rects = levelUpLayout();
  choices.forEach((u, i) => {
    const r = rects[i];
    panel(ctx, r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 21px system-ui, sans-serif';
    ctx.fillText(u.name, r.x + r.w / 2, r.y + 48);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(u.desc, r.x + r.w / 2, r.y + 86);
    ctx.fillStyle = '#9fb0d0';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, r.y + 130);
  });
  ctx.textAlign = 'left';
}

function statsLines(state) {
  return [
    `SCORE  ${state.score}`,
    `WAVE  ${state.wave}`,
    `KILLS  ${state.kills}`,
    `LEVEL  ${state.level}`,
    `BEST  ${state.best}`,
  ];
}

export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(20, 4, 10, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5b7f';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('THE EMBER FALLS', W / 2, 190);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '20px system-ui, sans-serif';
  statsLines(state).forEach((line, i) => ctx.fillText(line, W / 2, 250 + i * 34));
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('Press Space or click to play again', W / 2, 470);
  }
  ctx.textAlign = 'left';
}

export function drawVictory(ctx, state) {
  ctx.fillStyle = 'rgba(6, 16, 10, 0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('THE EMBER ENDURES', W / 2, 180);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The Cinderlord is ash. Dawn returns to the valley.', W / 2, 224);
  statsLines(state).forEach((line, i) => ctx.fillText(line, W / 2, 270 + i * 34));
  const blink = Math.floor(state.time * 2) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('C — continue endless     Space — play again', W / 2, 480);
  }
  ctx.textAlign = 'left';
}
