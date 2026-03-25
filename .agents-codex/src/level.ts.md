# level.ts

## Purpose
Level definitions and world-map system. Defines levels as tile grids and provides parsing into physics blocks, weapon pickups, and the exit tile position. Also builds the world-map node list used by the renderer.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Block type
- `weapons.ts` — WeaponDef, getWeaponDef

### Used By
- `game.ts` — loads levels, builds world map, consumes weapon pickups, checks exit
- `renderer.ts` — uses TILE_SIZE, MapNode, LevelInstance, WeaponPickup for drawing

## Key Components

### LevelDef
- Tile grid definition with spawn point, map position, unlock requirements, and `xpReward`
- `xpReward` — XP awarded when the player completes the level (reaches the exit)

### LevelInstance
- Parsed level ready for gameplay: blocks, pickups, spawnX/Y, exitX/Y, dimensions
- `exitX` / `exitY` — world-space centre of the '>' exit tile (undefined if absent)

### WeaponPickup
- World-space position + weapon reference; `collected` flag hides it once picked up

### MapNode
- World-map node: id, name, normalised position, unlock/complete state, color
- `connections: string[]` — prerequisite level IDs; used by the renderer to draw paths

### parseLevel(def)
- Converts tile characters to Block objects, WeaponPickup array, and exit position
- '#' = solid block, 'p' = thin platform (6 px tall)
- '@'/'S'/'D'/'G'/'W' = weapon pedestals → sword / sword / dagger / greatsword / bow
- '>' = exit tile — position recorded as `exitX`, `exitY` on the instance

### buildWorldMap(completedIds)
- Generates MapNode array from registered levels and completion state
- Sets `connections` from each level's `requires` array for correct path drawing

## Levels

### World 1 — Tutorial / Forest (green-purple tones)
- **1-1 "First Steps"** — flat meadow with platforms; sword pickup; intro to movement (80 XP)
- **1-2 "Stone Bridge"** — gaps in ground, bridge-style platforming; dagger reward (100 XP)
- **1-3 "Underground Cave"** — enclosed cave corridors; greatsword deep inside (120 XP)

### World 2 — Grasslands / Volcanic (green-orange tones)
- **2-1 "Grasslands"** — wide open level with rolling platforms; bow pedestals (150 XP)
- **2-2 "Lava Passage"** — volcanic ground gap requiring timed jump; greatsword + dagger (180 XP)
- **2-3 "Cloud Crossing"** — sky level with two ground gaps; scattered platforms (210 XP)

### World 3 — Desert / Ancient (sandy-gold tones)
- **3-1 "Desert Mesa"** — desert with three raised mesa blocks forcing detours (250 XP)
- **3-2 "Sand Drifts"** — rolling dunes with ground gap; multi-tier platforms (290 XP)
- **3-3 "Ancient Sanctum"** — long final level with two chasms and complex platform tiers (350 XP)

## World Map Layout
Levels are arranged in a zigzag pattern across the screen:
```
World 1 (left)   World 2 (mid-left)  World 3 (right)
1-1 (0.08,0.28)  2-1 (0.38,0.28)    3-1 (0.68,0.28)
1-2 (0.20,0.52)  2-2 (0.50,0.52)    3-2 (0.80,0.52)
1-3 (0.08,0.72)  2-3 (0.38,0.72)    3-3 (0.68,0.72)
```
Each level connects to the next in the linear chain: 1-1→1-2→1-3→2-1→2-2→2-3→3-1→3-2→3-3

## Tile Legend
```
. = air
# = solid terrain block
p = thin platform (6 px tall, passable sides)
< = entry door (spawn — decorative only, spawn is set via spawnCol/spawnRow)
> = exit door (goal — parsed to exitX/exitY in LevelInstance)
@ = generic weapon pickup (sword)
S = sword pedestal
D = dagger pedestal
G = greatsword pedestal
W = bow pedestal
```

## Change History
- **2026-03-25:** Added 5 new levels (2-2, 2-3, 3-1, 3-2, 3-3); added `xpReward` to LevelDef;
  added `exitX/exitY` to LevelInstance; added `connections` to MapNode; updated all map positions
  for a clean zigzag world-map layout; updated `buildWorldMap` to populate `connections`.

- **Build 3:** Initial implementation — Level 1-1, tile parsing, world map
- **Build 5:** Added WeaponPickup type and WEAPON_TILE_MAP; added levels 1-2, 1-3, 2-1; updated parseLevel to extract pickups
