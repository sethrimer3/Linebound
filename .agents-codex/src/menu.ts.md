# src/menu.ts

## Purpose
Manages the main menu UI. Exposes `initMenu()` (show + wire buttons) and
`hideMenu()` (hide). Delegates all side-effect actions (Start Game, Settings,
Export Save, Import Save) back to `main.ts` via callbacks.

## Dependencies
### Imports
- `./save` — `exportSave`, `importSave`, `SaveData`

### Used By
- `src/main.ts` — calls `initMenu()` and `hideMenu()`

## Key Components

### `MenuCallbacks` (interface)
```ts
interface MenuCallbacks {
  onStartGame: () => void;
  onSettings: () => void;
}
```
Callbacks provided by `main.ts` for actions that require a state transition.

### `initMenu(callbacks)`
Shows `#scene-menu` and attaches click handlers to all four buttons.
Uses `bindButton()` internally to prevent duplicate listeners if called more
than once (e.g. when returning from gameplay).

### `hideMenu()`
Adds `.hidden` to `#scene-menu`. Called before entering the game scene.

### `bindButton(id, handler)`
Clones the target element to strip any previously attached listeners, replaces
the original, then attaches the new handler. Safe to call on every `initMenu()`.

### `flashStatus(message, isError?)`
Displays a brief status message in `#menu-status`. Auto-hides after 3 seconds.
Uses `textContent` (not `innerHTML`) to prevent XSS.

## Terminology
- **Wire** — attaching event listeners to buttons

## Implementation Notes
### Critical Details
- `flashStatus` uses `textContent` (never `innerHTML`) — safe against XSS even
  if error messages contain special characters.
- The `_flashTimer` property is stored directly on the DOM element to allow
  cancellation of overlapping flash calls.

### Known Issues
- Settings callback currently triggers a stub `alert()` in `main.ts`.

## Future Changes
### Planned
- Settings overlay (replace stub)
- Animated button entrance transitions

## Change History
- **2026-03-23 (build 2):** Created menu module with all four buttons wired.

## Watch Out For
- Re-calling `initMenu()` without going through `bindButton()`'s clone pattern
  would cause duplicate click handlers and trigger each action multiple times.
