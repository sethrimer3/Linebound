# game.ts

## Purpose
Main game scene. Orchestrates world map (level select) and gameplay sub-states.

## Dependencies
### Imports / Script Dependencies
- `main.ts` — GameState type
- `physics.ts` — World
- `stickman.ts` — Stickman, createStickman
- `level.ts` — parseLevel, getLevelDef, buildWorldMap, LevelInstance, MapNode
- `input.ts` — bindInput, unbindInput, resetInput, getInput, pollKeyboard
- `renderer.ts` — Camera, clearCanvas, drawGround, drawBlocks, drawStickman, drawWorldMap, drawWeaponPickups
- `save.ts` — loadSave, persistSave

### Used By
- `main.ts` — calls initGame, stopGame

## Key Components
### Sub-states
- `'map'` — world map level-select screen
- `'play'` — live gameplay with physics

### Weapon Pickup Collection (checkWeaponPickups)
- Called each frame in updatePlay
- Checks player pelvis distance against each uncollected pickup
- On collection: calls stickman.equipWeapon() and marks pickup.collected = true
- Collection radius: 30 world pixels

### HUD
- Level name in top-left
- Equipped weapon name in bottom-left (gold, only when weapon is held)

### gameTime
- Accumulated seconds since level entry; passed to drawWeaponPickups for float/glow animation

## Change History
- **Build 3:** Initial implementation — map/play sub-states, input, camera, render loop
- **Build 5:** Added drawWeaponPickups import; added gameTime tracking; added checkWeaponPickups(); added weapon HUD display
