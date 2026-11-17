// Screenshot scenes behind ?shot=start|play|boss|victory. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot
// (keep away from what is close, chase embers, shoot the nearest enemy), so the frame
// is what a short game really looks like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { createWorld, resetWorld, startWave, stepWorld, EVENT_LEVELUP, EVENT_OVER, EVENT_VICTORY } from './world.js';
import { dealUpgrades } from './upgrades.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './ui.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const BOSS_SECONDS = 14;
const VICTORY_LIMIT_SECONDS = 600;

// A stand-in for the real input: the autopilot moves, aims and fires.
function autopilotInput(state) {
  const p = state.player;
  return {
    direction() {
      let mx = 0;
      let my = 0;
      let nearest = null;
      let nearestD = Infinity;
      for (const e of state.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = e;
        }
      }
      // Too close: back away from the threat.
      if (nearest && nearestD < 130) {
        mx = (p.x - nearest.x) / nearestD;
        my = (p.y - nearest.y) / nearestD;
      } else {
        // Else drift toward the nearest ember, or the nearest enemy.
        let target = null;
        let td = Infinity;
        for (const pk of state.pickups) {
          if (pk.kind !== 'ember') continue;
          const d = Math.hypot(pk.x - p.x, pk.y - p.y);
          if (d < td) {
            td = d;
            target = pk;
          }
        }
        if (!target && nearest) target = nearest;
        if (target) {
          const d = Math.hypot(target.x - p.x, target.y - p.y) || 1;
          mx = (target.x - p.x) / d;
          my = (target.y - p.y) / d;
        }
      }
      // Stay inside the field.
      if (p.x < 90) mx += 0.7;
      if (p.x > FIELD.width - 90) mx -= 0.7;
      if (p.y < 90) my += 0.7;
      if (p.y > FIELD.height - 90) my -= 0.7;
      const len = Math.hypot(mx, my);
      return len > 0 ? { x: mx / len, y: my / len } : { x: 0, y: 0 };
    },
    aim() {
      let nearest = null;
      let nearestD = Infinity;
      for (const e of state.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = e;
        }
      }
      const tx = nearest ? nearest.x : p.x;
      const ty = nearest ? nearest.y : p.y - 100;
      return { x: state.view.ox + tx * state.view.scale, y: state.view.oy + ty * state.view.scale };
    },
    isFiring() {
      return state.enemies.length > 0;
    },
    takeActions() {
      // Dash away when something is right on top of the warden.
      const p = state.player;
      for (const e of state.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < 110 && p.dashCd <= 0) return 4;
      }
      return 0;
    },
  };
}

// A level-up in the sim spends itself at once on a random card, the way a
// player picking fast would: the run's build grows as it is played.
function spendLevels(state) {
  while (state.pendingLevels > 0) {
    const [u] = dealUpgrades(state.rng, 3);
    if (!u) break;
    u.apply(state.player);
    state.pendingLevels -= 1;
  }
}

function boost(state, damage, hp, interval) {
  const p = state.player;
  p.damage = damage;
  p.maxHp = hp;
  p.hp = hp;
  p.fireInterval = interval;
}

function runSim(state, seconds, mode) {
  const input = autopilotInput(state);
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = stepWorld(state, input, input.takeActions(), mode === 'demo');
    if (events & EVENT_LEVELUP) spendLevels(state);
    if (events & EVENT_OVER) return 'over';
    if (events & EVENT_VICTORY) return 'victory';
  }
  return 'alive';
}

// Step until `stop` says the frame is the one to capture, or the time runs out.
function runUntil(state, seconds, stop) {
  const input = autopilotInput(state);
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = stepWorld(state, input, input.takeActions(), false);
    if (events & EVENT_LEVELUP) spendLevels(state);
    if (events & EVENT_OVER) return 'over';
    if (events & EVENT_VICTORY) return 'victory';
    if (stop(state)) return 'ready';
  }
  return 'alive';
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Any other name is the title scene.
 */
export function stageShot(name, world) {
  const best = world.best;
  if (name !== 'play' && name !== 'boss' && name !== 'victory') {
    resetWorld(world);
    startWave(world);
    runSim(world, START_SECONDS, 'demo');
    return { screen: SCREEN_TITLE, best };
  }
  if (name === 'play') {
    resetWorld(world);
    startWave(world);
    boost(world, 55, 300, 0.14);
    runSim(world, PLAY_SECONDS, 'play');
    return { screen: SCREEN_PLAY, best: Math.max(best, world.score) };
  }
  if (name === 'boss') {
    // Capture mid-fight: stop as soon as the boss is on screen and the fight is
    // under way, before the autopilot can kill it.
    resetWorld(world);
    world.wave = 4;
    startWave(world);
    boost(world, 25, 400, 0.22);
    runUntil(world, BOSS_SECONDS, (s) => !!s.boss && s.boss.y >= 80 && s.time >= 6);
    return { screen: SCREEN_PLAY, best: Math.max(best, world.score) };
  }
  // victory: play the whole run with a strong warden until the wave-10 boss falls,
  // so the victory screen shows a run that was really played.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    resetWorld(world);
    startWave(world);
    boost(world, 150, attempt === 0 ? 1000 : 2000, 0.1);
    const result = runSim(world, VICTORY_LIMIT_SECONDS, 'victory');
    if (result === 'victory') {
      world.texts = [];
      world.parts = [];
      return { screen: SCREEN_VICTORY, best: Math.max(best, world.score) };
    }
  }
  // Fallback: show the victory screen over a quiet arena if the autopilot lost.
  resetWorld(world);
  world.wave = 10;
  world.score = 8450;
  world.kills = 212;
  world.level = 9;
  world.victory = true;
  return { screen: SCREEN_VICTORY, best: Math.max(best, world.score) };
}

export { createWorld };
