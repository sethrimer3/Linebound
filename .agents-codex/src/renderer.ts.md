# renderer.ts

## Purpose
Canvas 2D rendering for terrain, stickman, world map, and camera management.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Block type
- `stickman.ts` — Stickman, HEAD_RADIUS, EXTREMITY_SIZE
- `level.ts` — LevelInstance, MapNode, TILE_SIZE

### Used By
- `game.ts` — calls drawing functions each frame

## Key Components
### Camera (class)
- Smooth follow with lerp, world↔screen coordinate conversion

### Drawing Functions
- clearCanvas, drawGround, drawBlocks, drawStickman, drawWorldMap

### Stickman Rendering
- Head = filled circle
- Spine = line (neck→pelvis)
- Each limb = two line segments with joint dot
- Hands/feet = small filled squares

## Change History
- **Build 3:** Initial implementation — full stickman rendering, world map, camera
