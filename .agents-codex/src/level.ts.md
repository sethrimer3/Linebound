# level.ts

## Purpose
Level definitions and world-map system. Defines levels as tile grids and provides parsing into physics blocks and weapon pickups.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Block type
- `weapons.ts` — WeaponDef, getWeaponDef

### Used By
- `game.ts` — loads levels, builds world map, consumes weapon pickups
- `renderer.ts` — uses TILE_SIZE, MapNode, LevelInstance, WeaponPickup for drawing

## Key Components
### LevelDef
- Tile grid definition with spawn point, map position, unlock requirements

### WeaponPickup
- World-space position + weapon reference; `collected` flag hides it once picked up

### parseLevel(def)
- Converts tile characters to Block objects and WeaponPickup array
- '#' = solid block, 'p' = thin platform
- '@'/'S'/'D'/'G'/'W' = weapon pedestals → sword / sword / dagger / greatsword / bow

### buildWorldMap(completedIds)
- Generates MapNode array from registered levels and completion state

## Levels
- **1-1 "First Steps"** — flat meadow with platforms; sword pickup; intro to movement
- **1-2 "Stone Bridge"** — gaps in ground, bridge-style platforming; dagger reward
- **1-3 "Underground Cave"** — enclosed cave corridors; greatsword deep inside
- **2-1 "Grasslands"** — wide open level with rolling platforms; bow pedestals

## Tile Legend
```
. = air
# = solid terrain block
p = thin platform (6 px tall, passable sides)
< = entry door (spawn)
> = exit door (goal)
@ = generic weapon pickup (sword)
S = sword pedestal
D = dagger pedestal
G = greatsword pedestal
W = bow pedestal
```

## Change History
- **Build 3:** Initial implementation — Level 1-1, tile parsing, world map
- **Build 5:** Added WeaponPickup type and WEAPON_TILE_MAP; added levels 1-2, 1-3, 2-1; updated parseLevel to extract pickups
