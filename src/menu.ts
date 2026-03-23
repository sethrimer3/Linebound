/**
 * menu.ts
 * Renders and manages the main menu UI.
 * Exposes an initMenu() function that wires up all menu buttons
 * and delegates actions (Start Game, Settings, Export Save, Import Save)
 * back to main.ts via callbacks.
 */

import { exportSave, importSave, type SaveData } from './save';

/** Callbacks passed in from main.ts for each menu action */
export interface MenuCallbacks {
  onStartGame: () => void;
  onSettings: () => void;
}

/** ID of the main menu scene container element */
const MENU_SCENE_ID = 'scene-menu';

/**
 * Initialises the main menu: shows the menu scene and attaches
 * all button event listeners. Call this once when the game first loads
 * or whenever transitioning back from gameplay.
 *
 * @param callbacks - Handlers for Start Game and Settings actions.
 */
export function initMenu(callbacks: MenuCallbacks): void {
  const scene = document.getElementById(MENU_SCENE_ID);
  if (!scene) {
    console.error('[menu] Scene element not found:', MENU_SCENE_ID);
    return;
  }

  // Ensure the menu is visible (it may have been hidden during gameplay)
  scene.classList.remove('hidden');

  wireButtons(callbacks);
}

/**
 * Hides the main menu scene.
 * Called when transitioning away from the menu (e.g. starting the game).
 */
export function hideMenu(): void {
  const scene = document.getElementById(MENU_SCENE_ID);
  scene?.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Attaches click handlers to all four main menu buttons.
 * Each handler is idempotent — re-calling wireButtons replaces listeners.
 */
function wireButtons(callbacks: MenuCallbacks): void {
  bindButton('btn-start-game', () => {
    hideMenu();
    callbacks.onStartGame();
  });

  bindButton('btn-settings', () => {
    callbacks.onSettings();
  });

  bindButton('btn-export-save', () => {
    exportSave();
    flashStatus('Save exported!');
  });

  bindButton('btn-import-save', () => {
    importSave(
      (data: SaveData) => {
        flashStatus(`Save imported (v${data.version})`);
      },
      (msg: string) => {
        flashStatus(`Import failed: ${msg}`, true);
      },
    );
  });
}

/**
 * Binds a single-use click handler to a button element by ID.
 * Uses removeEventListener + addEventListener to prevent duplicate handlers
 * if initMenu is called more than once.
 *
 * @param id      - The element id of the button
 * @param handler - The function to call on click
 */
function bindButton(id: string, handler: () => void): void {
  const btn = document.getElementById(id);
  if (!btn) {
    console.warn('[menu] Button not found:', id);
    return;
  }

  // Clone the node to strip any previously attached listeners, then replace
  const fresh = btn.cloneNode(true) as HTMLElement;
  btn.replaceWith(fresh);
  fresh.addEventListener('click', handler);
}

/**
 * Briefly shows a status message below the menu buttons.
 * The message fades out automatically after a short delay.
 *
 * @param message - The text to display
 * @param isError - When true, styles the message as an error (red)
 */
function flashStatus(message: string, isError = false): void {
  const statusEl = document.getElementById('menu-status');
  if (!statusEl) return;

  // Sanitize the message before inserting into the DOM to prevent XSS
  statusEl.textContent = message;
  statusEl.className = isError ? 'menu-status error' : 'menu-status success';
  statusEl.classList.remove('hidden');

  // Clear any existing timeout so rapid clicks don't stack
  const existingTimer = (statusEl as HTMLElement & { _flashTimer?: number })._flashTimer;
  if (existingTimer !== undefined) clearTimeout(existingTimer);

  // Hide the message after 3 seconds
  (statusEl as HTMLElement & { _flashTimer?: number })._flashTimer = window.setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 3000);
}
