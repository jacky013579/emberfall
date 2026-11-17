// Keyboard and mouse, read once per frame. Movement keys, aim from the pointer,
// and one-shot actions (confirm, pause, dash, mute) that the loop consumes.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let firing = false;
  let mouseX = 0;
  let mouseY = 0;

  function toGame(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') actions |= ACTION_DASH;
    if (e.code === 'KeyM') actions |= ACTION_MUTE;
    if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
      actions |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    mouseX = p.x;
    mouseY = p.y;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toGame(e);
    mouseX = p.x;
    mouseY = p.y;
    if (e.button === 0) firing = true;
    if (e.button === 2) actions |= ACTION_DASH;
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 0) firing = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    keys.clear();
    firing = false;
  });

  return {
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const d = MOVE_KEYS[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },
    aim() {
      return { x: mouseX, y: mouseY };
    },
    isFiring() {
      return firing || keys.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    choiceKey() {
      if (keys.has('Digit1')) return 0;
      if (keys.has('Digit2')) return 1;
      if (keys.has('Digit3')) return 2;
      return -1;
    },
  };
}
