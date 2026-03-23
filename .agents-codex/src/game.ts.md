# src/game.ts

## Purpose
Stub game scene. Initialises a full-viewport `<canvas>`, runs a minimal render
loop that shows a placeholder message, and handles the "Back to Menu" button.
Replace/extend the render loop with real game logic as development progresses.

## Dependencies
### Imports
- `./main` — `GameState` type (re-exported to avoid circular imports)

### Used By
- `src/main.ts` — `initGame`, `stopGame`

## Key Components

### `initGame(onBack)`
Shows `#scene-game`, grabs the `<canvas>`, starts the render loop, and wires
the "Back to Menu" button to call `stopGame()` then `onBack()`.

### `stopGame()`
Cancels the `requestAnimationFrame` loop, removes the resize listener, and
hides `#scene-game`. Called by `main.ts` when transitioning back to the menu.

### `resizeCanvas()`
Sets `canvas.width` / `canvas.height` to `window.innerWidth` / `window.innerHeight`.
Called on init and on every `window resize` event.

### `startRenderLoop()`
Starts a `requestAnimationFrame` loop. Passes delta time (`dt` in seconds) to
`drawFrame()`. Stores the RAF id in `rafId` so it can be cancelled.

### `drawFrame(_dt)`
Clears the canvas with a dark background and draws placeholder text. The `_dt`
parameter is intentionally unused in this stub — prefix with `_` to suppress
the TypeScript unused-parameter warning.

## Terminology
- **RAF** — `requestAnimationFrame`
- **dt** — delta time in seconds between frames (for physics/animation)

## Implementation Notes
### Critical Details
- `canvas` and `ctx` are module-level nullables. All operations guard against
  `null` before use.
- `window.removeEventListener('resize', resizeCanvas)` in `stopGame()` prevents
  memory leaks when returning to the menu multiple times.

### Known Issues
- No actual game logic yet — just a placeholder canvas.

## Future Changes
### Planned
- Physics update loop using `dt`
- Stickman rendering and movement
- Swipe/touch input handling (will live in `src/input.ts`)
- Terrain and collision

## Change History
- **2026-03-23 (build 2):** Created stub game scene with RAF loop and placeholder rendering.

## Watch Out For
- Never allocate objects inside `drawFrame()` / `startRenderLoop()` hot path.
  Pre-allocate vectors and reuse them.
- Always cancel the RAF loop in `stopGame()` — missing this will cause multiple
  loops running in parallel after re-entering the game scene.
