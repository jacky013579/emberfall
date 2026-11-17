// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, level-up, game over
// and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|boss|victory (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, resetWorld, startWave, stepWorld, EVENT_LEVELUP, EVENT_OVER, EVENT_VICTORY, EVENT_WAVE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { computeView, createRenderer, VIEW } from './render.js';
import { SCREEN_LEVELUP, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY, drawGameOver, drawHUD, drawLevelUp, drawPaused, drawTitle, drawVictory, levelUpLayout } from './ui.js';
import { dealUpgrades } from './upgrades.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const audio = createAudio();
const world = createWorld(createRandom(seed), audio);
world.view = computeView();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    if (scene.screen === SCREEN_TITLE) drawTitle(canvas.getContext('2d'), world, scene.best);
    else if (scene.screen === SCREEN_PLAY) drawHUD(canvas.getContext('2d'), world);
    else if (scene.screen === SCREEN_VICTORY) drawVictory(canvas.getContext('2d'), world);
    else if (scene.screen === SCREEN_OVER) drawGameOver(canvas.getContext('2d'), world);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let choices = [];
  let accumulator = 0;
  let last = performance.now();
  let click = null;
  // The title backdrop is a live world: enemies drift in around the ember.
  startWave(world);
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  });

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.startMusic();
    resetWorld(world);
    world.best = best;
    startWave(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Defend the ember.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.stopMusic();
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    world.best = best;
    announce(`Game over. Score ${world.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_VICTORY;
    audio.victory();
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    world.best = best;
    announce(`Victory. Score ${world.score}.`);
  }

  function openLevelUp() {
    choices = dealUpgrades(world.rng, 3);
    screen = SCREEN_LEVELUP;
    audio.levelUp();
    announce(`Level ${world.level}. Choose an upgrade.`);
  }

  function pickUpgrade(index) {
    const u = choices[index];
    if (!u) return;
    u.apply(world.player);
    world.pendingLevels -= 1;
    if (world.pendingLevels > 0) {
      choices = dealUpgrades(world.rng, 3);
    } else {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function handleClick() {
    if (!click) return;
    const c = click;
    click = null;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_LEVELUP) {
      const rects = levelUpLayout();
      for (let i = 0; i < rects.length; i += 1) {
        const r = rects[i];
        if (c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h) {
          pickUpgrade(i);
          return;
        }
      }
    }
    if (screen === SCREEN_VICTORY) {
      startGame();
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      audio.unlock();
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === SCREEN_OVER && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (screen === SCREEN_VICTORY && (actions & ACTION_CONFIRM)) {
      startGame();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      stepWorld(world, input, 0, true);
      return;
    }
    const events = stepWorld(world, input, lastActions, false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_VICTORY) winGame();
    else if (events & EVENT_LEVELUP) openLevelUp();
    else if (events & EVENT_WAVE) announce(`Wave ${world.wave} clear.`);
  }

  let lastActions = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    lastActions = input.takeActions();
    handleActions(lastActions);
    handleClick();
    if (screen === SCREEN_LEVELUP) {
      const k = input.choiceKey();
      if (k >= 0) pickUpgrade(k);
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen);
    const ctx = canvas.getContext('2d');
    if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
    else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHUD(ctx, world);
    if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_LEVELUP) drawLevelUp(ctx, world, choices);
    else if (screen === SCREEN_OVER) drawGameOver(ctx, world);
    else if (screen === SCREEN_VICTORY) drawVictory(ctx, world);
  }

  // 'C' continues endless after a victory; handled here, not in input.js.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && screen === SCREEN_VICTORY) {
      world.endless = true;
      world.victory = false;
      startWave(world);
      screen = SCREEN_PLAY;
      announce('Endless mode. The cinders keep coming.');
    }
  });

  // Leaving the tab pauses a running game rather than letting enemies close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
