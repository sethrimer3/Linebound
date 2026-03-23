/**
 * main.ts
 * Entry point for Linebound.
 * Manages the top-level game state machine and coordinates transitions
 * between the main menu and gameplay scenes.
 *
 * State flow:
 *   menu ──(Start Game)──► game
 *   game ──(Back to Menu)──► menu
 *   menu ──(Settings)──► settings  (future — stub for now)
 */

import { initMenu, hideMenu } from './menu';
import { initGame, stopGame } from './game';
import { loadSave, createDefaultSave, persistSave } from './save';

/** All top-level states the application can be in. */
export type GameState = 'menu' | 'game' | 'settings';

/** Current application state — starts on the main menu. */
let currentState: GameState = 'menu';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Bootstraps the application once the DOM is fully loaded.
 * Ensures a save slot exists and renders the initial state (main menu).
 */
document.addEventListener('DOMContentLoaded', () => {
  ensureSaveExists();
  transitionTo('menu');
});

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * Transitions the application to the given state.
 * Tears down the current state before setting up the new one.
 *
 * @param next - The state to move to
 */
function transitionTo(next: GameState): void {
  // Tear down the current state
  switch (currentState) {
    case 'menu':
      // Menu hides itself when navigating away via its own callbacks
      break;
    case 'game':
      stopGame();
      break;
    case 'settings':
      // Future: tear down settings overlay
      break;
  }

  currentState = next;

  // Set up the new state
  switch (next) {
    case 'menu':
      initMenu({
        onStartGame: () => transitionTo('game'),
        onSettings: () => openSettingsStub(),
      });
      break;

    case 'game':
      initGame(() => transitionTo('menu'));
      break;

    case 'settings':
      // Settings handled as a stub overlay for now
      break;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensures at least a default save record exists in localStorage.
 * This avoids a null-check everywhere else in the codebase.
 */
function ensureSaveExists(): void {
  const existing = loadSave();
  if (!existing) {
    persistSave(createDefaultSave());
  }
}

/**
 * Temporary stub for the settings screen.
 * Displays a browser alert until a proper settings UI is built.
 * Replace this with a real settings overlay in a future iteration.
 */
function openSettingsStub(): void {
  // TODO: replace with a proper settings overlay
  alert('Settings coming soon!');
}
