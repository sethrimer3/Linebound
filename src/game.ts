/**
 * game.ts
 * Stub for the main game scene. Currently shows a placeholder canvas screen
 * until the game loop and world are implemented in a future iteration.
 */

import { GameState } from './main';

/** Identifier string for the game scene element */
const GAME_SCENE_ID = 'scene-game';

/** Canvas element used for rendering the game world */
let canvas: HTMLCanvasElement | null = null;

/** 2D rendering context for the canvas */
let ctx: CanvasRenderingContext2D | null = null;

/** ID of the running requestAnimationFrame loop, used to cancel it on exit */
let rafId: number | null = null;

/**
 * Initialises the game scene: grabs the canvas, sizes it, and starts
 * the stub render loop.
 *
 * @param onBack - Called when the player presses the "Back to Menu" button,
 *                 so main.ts can transition back to the menu state.
 */
export function initGame(onBack: () => void): void {
  const scene = document.getElementById(GAME_SCENE_ID);
  if (!scene) {
    console.error('[game] Scene element not found:', GAME_SCENE_ID);
    return;
  }

  // Show the game scene
  scene.classList.remove('hidden');

  canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('[game] Canvas element not found: #game-canvas');
    return;
  }

  ctx = canvas.getContext('2d');
  resizeCanvas();

  // Resize canvas whenever the window resizes
  window.addEventListener('resize', resizeCanvas);

  // Wire up the back button
  const backBtn = document.getElementById('btn-back-to-menu');
  backBtn?.addEventListener('click', () => {
    stopGame();
    onBack();
  });

  startRenderLoop();
}

/**
 * Tears down the game scene: cancels the render loop and hides the scene.
 * Called when transitioning back to the main menu.
 */
export function stopGame(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  window.removeEventListener('resize', resizeCanvas);

  const scene = document.getElementById(GAME_SCENE_ID);
  scene?.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resizes the canvas to fill the viewport.
 * Called on init and whenever the window resizes.
 */
function resizeCanvas(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * Starts the stub render loop.
 * Draws a placeholder message until real gameplay is implemented.
 */
function startRenderLoop(): void {
  let lastTime = performance.now();

  function loop(now: number): void {
    const dt = (now - lastTime) / 1000; // seconds since last frame
    lastTime = now;

    drawFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
}

/**
 * Renders a single frame.
 * Currently draws a dark background + placeholder text.
 * Replace/extend this with real game rendering.
 *
 * @param _dt - Delta time in seconds (unused in the stub)
 */
function drawFrame(_dt: number): void {
  if (!ctx || !canvas) return;

  // Clear to a dark background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Placeholder centred text
  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game coming soon…', canvas.width / 2, canvas.height / 2);

  // Dim subtitle
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('(Use "Back to Menu" to return)', canvas.width / 2, canvas.height / 2 + 44);
}

// Re-export the GameState type so other modules can refer to it without
// importing from main.ts directly (avoids circular dependencies).
export type { GameState };
