// Keyboard and pointer input. Held keys give a steering vector; one-shot presses
// (confirm, pause, hide, dash-start) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. A
// mouse click is a decoy toss aimed at the click's world position (converted by
// the loop through the camera).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_HIDE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const DASH = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const HIDE = new Set(['KeyE']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || DASH.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (HIDE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_HIDE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  function axis(neg, pos) {
    return (pos ? 1 : 0) - (neg ? 1 : 0);
  }

  return {
    /** Normalised steering vector {x, y} from the held movement keys. */
    vector() {
      const x = axis(held.has('ArrowLeft') || held.has('KeyA'), held.has('ArrowRight') || held.has('KeyD'));
      const y = axis(held.has('ArrowUp') || held.has('KeyW'), held.has('ArrowDown') || held.has('KeyS'));
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    dashing() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click's canvas position since the last call, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
