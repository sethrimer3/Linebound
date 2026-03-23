# level.ts

## Purpose
Level definitions and world-map system. Defines levels as tile grids and provides parsing into physics blocks.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Block type

### Used By
- `game.ts` — loads levels, builds world map
- `renderer.ts` — uses TILE_SIZE, MapNode, LevelInstance for drawing

## Key Components
### LevelDef
- Tile grid definition with spawn point, map position, unlock requirements

### parseLevel(def)
- Converts tile characters to Block objects for physics collision
- '#' = solid block, 'p' = thin platform

### buildWorldMap(completedIds)
- Generates MapNode array from registered levels and completion state

## Levels
- **1-1 "First Steps"** — flat ground with platforms, intro to movement

## Change History
- **Build 3:** Initial implementation — Level 1-1, tile parsing, world map
