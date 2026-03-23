# src/main.ts

## Purpose
Top-level entry point for Linebound. Bootstrapped on `DOMContentLoaded`.
Owns the top-level state machine that coordinates transitions between the
main menu and game scenes.

## Dependencies
### Imports
- `./menu` — `initMenu`, `hideMenu`
- `./game` — `initGame`, `stopGame`
- `./save` — `loadSave`, `createDefaultSave`, `persistSave`

### Used By
- `dist/bundle.js` (esbuild entry point)

## Key Components

### `GameState` (exported type)
```ts
export type GameState = 'menu' | 'game' | 'settings';
```
Union of all valid application states. Exported so `game.ts` can re-export it
without creating a circular import.

### `transitionTo(next: GameState)`
Central state machine. Tears down the current state before initialising the
next one. Always use this function for scene changes — never hide/show scenes
directly from other modules.

### `ensureSaveExists()`
Guarantees a localStorage save slot exists on startup. Prevents null-checks
throughout the rest of the codebase.

### `openSettingsStub()`
Temporary `alert()` placeholder until a proper settings overlay is built.
Has a `// TODO` comment marking it for replacement.

## Terminology
- **State machine** — the simple switch-based coordinator in `transitionTo()`
- **Scene** — a full-viewport UI layer (menu, game, settings)

## Implementation Notes
### Critical Details
- `currentState` is module-level (effectively a singleton). Never manipulate it
  directly outside `transitionTo()`.
- The initial state is `'menu'`; `transitionTo('menu')` is called in `DOMContentLoaded`.

### Known Issues
- Settings state is a stub — `openSettingsStub()` shows an `alert()`.

## Future Changes
### Planned
- Replace `openSettingsStub()` with a real settings overlay
- Add a `'loading'` state for async asset loading

## Change History
- **2026-03-23 (build 2):** Created initial state machine with menu ↔ game transitions.

## Watch Out For
- Circular imports: `game.ts` re-exports `GameState` to avoid importing from
  `main.ts` (which is the bundle entry point).
