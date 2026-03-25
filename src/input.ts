/**
 * input.ts
 * Handles touch / swipe / keyboard input for Linebound.
 *
 * Input model:
 *   • Stickmen auto-move forward. The player's job is to *steer*.
 *   • A quick tap or upward swipe → jump.
 *   • A horizontal swipe → change facing direction (turn around).
 *   • Keyboard fallback: Arrow keys / WASD for desktop testing.
 *
 * All input is normalised into an InputState object that the game loop
 * reads each frame.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalised input state consumed by the game loop each frame. */
export interface InputState {
  /** True during the frame the player requested a jump. */
  jump: boolean;
  /** True during the frame the player swiped left. */
  swipeLeft: boolean;
  /** True during the frame the player swiped right. */
  swipeRight: boolean;
  /** True while any touch/click is held down. */
  touching: boolean;
  /** Current touch/mouse X in canvas coordinates. */
  touchX: number;
  /** Current touch/mouse Y in canvas coordinates. */
  touchY: number;
  /** True while the crouch key (S / ArrowDown) is held. */
  crouch: boolean;
  /**
   * True during the frame a punch was requested (mouse click).
   * Use `mouseX` / `mouseY` for the target direction.
   */
  punch: boolean;
  /** Latest mouse cursor X in client (canvas) coordinates — always updated. */
  mouseX: number;
  /** Latest mouse cursor Y in client (canvas) coordinates — always updated. */
  mouseY: number;
  /**
   * True during the frame the player pressed '1' — spend a skill point on health.
   * Only active on the world map.
   */
  skill1: boolean;
  /**
   * True during the frame the player pressed '2' — spend a skill point on attack.
   * Only active on the world map.
   */
  skill2: boolean;
  /**
   * True during the frame the player pressed '3' — spend a skill point on defense.
   * Only active on the world map.
   */
  skill3: boolean;
  /**
   * True during the frame the player pressed 'R' — respec (reset skill points).
   * Only active on the world map.
   */
  respec: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum swipe distance (px) to register as a deliberate swipe. */
const SWIPE_THRESHOLD = 30;

/** Maximum swipe duration (ms) — longer gestures are drags, not swipes. */
const SWIPE_MAX_DURATION = 400;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** The current frame's input — reset each frame by `resetInput()`. */
const state: InputState = {
  jump: false,
  swipeLeft: false,
  swipeRight: false,
  touching: false,
  touchX: 0,
  touchY: 0,
  crouch: false,
  punch: false,
  mouseX: 0,
  mouseY: 0,
  skill1: false,
  skill2: false,
  skill3: false,
  respec: false,
};

/** Touch tracking for swipe detection. */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

/** Keyboard key states (held down). */
const keysDown = new Set<string>();

/** Bound handler references so we can remove them later. */
let boundHandlers: { el: EventTarget; type: string; fn: EventListener }[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current input state for this frame.
 * The game loop should call this once per frame.
 */
export function getInput(): InputState {
  return state;
}

/**
 * Resets per-frame input flags (jump, swipe, punch, skill keys) but keeps held-state (touching, crouch).
 * Call at the START of each frame, before reading input.
 */
export function resetInput(): void {
  state.jump = false;
  state.swipeLeft = false;
  state.swipeRight = false;
  state.punch = false;
  // Note: `crouch` is a held state — it is re-set each frame by pollKeyboard()
  state.crouch = false;
  // Skill keys are per-frame pulses
  state.skill1 = false;
  state.skill2 = false;
  state.skill3 = false;
  state.respec = false;
}

/**
 * Binds all input event listeners to the given canvas element.
 * Call once when the game scene initialises.
 */
export function bindInput(canvas: HTMLCanvasElement): void {
  unbindInput(); // Prevent duplicate bindings

  // Touch events (primary input for mobile)
  addListener(canvas, 'touchstart', onTouchStart as EventListener);
  addListener(canvas, 'touchmove', onTouchMove as EventListener);
  addListener(canvas, 'touchend', onTouchEnd as EventListener);

  // Mouse events (fallback for desktop)
  addListener(canvas, 'mousedown', onMouseDown as EventListener);
  addListener(canvas, 'mousemove', onMouseMove as EventListener);
  addListener(window, 'mouseup', onMouseUp as EventListener);

  // Keyboard events (WASD / Arrow keys for desktop testing)
  addListener(window, 'keydown', onKeyDown as EventListener);
  addListener(window, 'keyup', onKeyUp as EventListener);
}

/**
 * Removes all bound input event listeners.
 * Call when leaving the game scene.
 */
export function unbindInput(): void {
  for (const h of boundHandlers) {
    h.el.removeEventListener(h.type, h.fn);
  }
  boundHandlers = [];
  keysDown.clear();
}

/**
 * Checks keyboard state and writes to the InputState.
 * Call once per frame after resetInput() and before reading state.
 */
export function pollKeyboard(): void {
  if (keysDown.has('ArrowUp') || keysDown.has('w') || keysDown.has('W') ||
      keysDown.has(' ')) {
    state.jump = true;
  }
  if (keysDown.has('ArrowLeft') || keysDown.has('a') || keysDown.has('A')) {
    state.swipeLeft = true;
  }
  if (keysDown.has('ArrowRight') || keysDown.has('d') || keysDown.has('D')) {
    state.swipeRight = true;
  }
  // Crouch: S or ArrowDown — held state, true while key is down
  if (keysDown.has('ArrowDown') || keysDown.has('s') || keysDown.has('S')) {
    state.crouch = true;
  }
  // Note: skill1/2/3 and respec are set in onKeyDown as one-shot pulses
}

// ---------------------------------------------------------------------------
// Internals — event handlers
// ---------------------------------------------------------------------------

/** Touch start: record starting position for swipe detection. */
function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchStartTime = performance.now();
  state.touching = true;
  state.touchX = t.clientX;
  state.touchY = t.clientY;
}

/** Touch move: update position. */
function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const t = e.touches[0];
  if (!t) return;
  state.touchX = t.clientX;
  state.touchY = t.clientY;
}

/** Touch end: evaluate swipe gesture. */
function onTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  state.touching = false;

  const elapsed = performance.now() - touchStartTime;
  if (elapsed > SWIPE_MAX_DURATION) return; // Too slow — not a swipe

  const t = e.changedTouches[0];
  if (!t) return;
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dy) > SWIPE_THRESHOLD && dy < 0 && Math.abs(dy) > Math.abs(dx)) {
    // Upward swipe → jump
    state.jump = true;
  } else if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) {
      state.swipeLeft = true;
    } else {
      state.swipeRight = true;
    }
  } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    // Tap (very little movement) → also jump
    state.jump = true;
  }
}

/** Mouse down: fire a punch toward the current mouse position. */
function onMouseDown(e: MouseEvent): void {
  state.touching = true;
  state.touchX = e.clientX;
  state.touchY = e.clientY;
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  // Mouse click fires a punch toward the cursor position
  state.punch = true;
}

/** Mouse move: always track the cursor position, even when not clicking. */
function onMouseMove(e: MouseEvent): void {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  if (state.touching) {
    state.touchX = e.clientX;
    state.touchY = e.clientY;
  }
}

/** Mouse up: clear the touching state. Swipe gestures are handled for touch;
 * for mouse, the punch already fired on mousedown. */
function onMouseUp(_e: MouseEvent): void {
  state.touching = false;
}

/** Key down: track pressed key and fire one-shot skill pulses. */
function onKeyDown(e: KeyboardEvent): void {
  keysDown.add(e.key);
  // One-shot skill keys — fire on the frame the key is first pressed
  if (e.key === '1') state.skill1 = true;
  if (e.key === '2') state.skill2 = true;
  if (e.key === '3') state.skill3 = true;
  if (e.key === 'r' || e.key === 'R') state.respec = true;
}

/** Key up: release tracked key. */
function onKeyUp(e: KeyboardEvent): void {
  keysDown.delete(e.key);
}

/**
 * Adds a listener and remembers it so we can clean up later.
 */
function addListener(el: EventTarget, type: string, fn: EventListener): void {
  el.addEventListener(type, fn, { passive: false });
  boundHandlers.push({ el, type, fn });
}
