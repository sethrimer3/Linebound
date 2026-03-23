# src/game.ts

## Purpose
Main game scene. Orchestrates world-map (level select) and gameplay sub-states.
Runs the RAF loop, handles input, steps physics, and delegates rendering.

## Dependencies
### Imports
- `./main` — `GameState` type (re-exported to avoid circular imports)
- `./physics` — `World`
- `./stickman` — `Stickman`, `createStickman`
- `./level` — `parseLevel`, `getLevelDef`, `buildWorldMap`, `LevelInstance`, `MapNode`
- `./input` — `bindInput`, `unbindInput`, `resetInput`, `getInput`, `pollKeyboard`
- `./renderer` — `Camera`, `clearCanvas`, `drawGround`, `drawBlocks`, `drawStickman`, `drawWorldMap`
- `./save` — `loadSave`, `persistSave`

### Used By
- `src/main.ts` — `initGame`, `stopGame`

## Key Components

### `initGame(onBack)`
Shows `#scene-game`, grabs `<canvas>`, starts render loop, binds input and back button.

### `stopGame()`
Cancels RAF loop, unbinds input, removes resize listener, hides `#scene-game`.

### `updatePlay(dt)` (Build 4 update)
- Handles jump, direction turn, crouch, and punch from `InputState`
- Crouch: sets `playerStick.crouching = input.crouch` each frame
- Punch: converts mouse client coords to world coords via camera, calls `playerStick.punch(worldX, worldY)`
- Camera coord formula: `worldX = mouseX + camera.x - canvas.width / 2`

## Terminology
- **RAF** — `requestAnimationFrame`
- **dt** — delta time in seconds between frames
- **world-space** — coordinates in the physics simulation
- **screen-space** — canvas pixel coordinates

## Implementation Notes
- `canvas` and `ctx` are module-level nullables; all operations guard against null
- Camera follows stickman center, offset -60px upward so the stickman is in lower half
- Mouse coords are in client/canvas space (canvas fills viewport); use camera offset to convert

## Change History
- **Build 2:** Created stub game scene with RAF loop and placeholder rendering.
- **Build 3:** Full gameplay — physics world, stickman, terrain, camera, level loading.
- **Build 4:** Added crouch and punch input handling in `updatePlay()`.

## Watch Out For
- Never allocate objects inside the RAF hot path — pre-allocate vectors and reuse them.
- Always cancel the RAF loop in `stopGame()` — missing this causes multiple loops after re-entry.
- `canvas` / `camera` null checks: `updatePlay` now has an early return guard for both.
