# enemies.ts

## Purpose
Defines simple enemy entities for Linebound. Currently contains the Slime enemy — a Terraria-style blob that periodically jumps toward the player using plain Euler integration (no Verlet skeleton).

## Dependencies
### Imports / Script Dependencies
- None (self-contained module; no imports from other game files)

### Used By
- `game.ts` — imports `Slime`, `createSlime` to spawn and update enemies each frame
- `renderer.ts` — imports `Slime`, `SLIME_RADIUS` for drawing

## Key Components

### Slime (class)
- **State:** `x`, `y`, `vx`, `vy`, `grounded`, `jumpTimer`, `hp`, `alive`, `squish`
- **Physics:** plain Euler integration; gravity applied every frame; terminal velocity clamp
- **Aggro range:** slime only jumps when the player is within `SLIME_AGGRO_RANGE` (600 px)
- **Jump AI:** when grounded and timer expires, applies upward + player-directed impulse then resets timer
- **Ground collision:** `resolveGround(groundY)` — clamps above ground plane, bleeds horizontal velocity on landing, sets `squish`
- **Block collision:** `resolveBlocks(blocks)` — top-surface only; resolves downward penetration into block tops
- **Squish animation:** `squish` property set proportional to impact `vy`; lerps back to 0 at 4 units/s

### createSlime(x, y)
- Factory function; offsets spawn y upward by `SLIME_RADIUS` so the slime rests on the tile surface
- Randomises `jumpTimer` to stagger multiple slimes

## Constants
| Name | Value | Purpose |
|------|-------|---------|
| SLIME_GRAVITY | 1800 px/s² | Downward acceleration |
| SLIME_MAX_FALL_SPEED | 600 px/s | Terminal velocity |
| SLIME_JUMP_VY | -480 px/s | Upward jump impulse |
| SLIME_JUMP_VX | 150 px/s | Horizontal jump speed toward player |
| SLIME_JUMP_INTERVAL | 2.2 s | Time between jumps |
| SLIME_RADIUS | 14 px | Hitbox radius (also controls drawing size) |
| SLIME_AGGRO_RANGE | 600 px | Max horizontal distance at which slime tracks player |

## Terminology
- **squish:** A 0–1 deformation value applied each landing. 0 = no squish (circle). 1 = maximum squish (very wide, very flat).

## Implementation Notes
### No Verlet Physics
Slimes intentionally avoid the Verlet system used for stickmen. They use simple Euler (`x += vx * dt`) for predictable, easy-to-tune behaviour.

### Block Collision — Top Only
Only top-surface block collisions are resolved. Slimes will clip through block sides and bottoms, which is acceptable for the current design.

### Future Expansion
- `hp` and `alive` fields are ready for combat (when the player can attack enemies)
- Subclassing or a variant factory can create differently-sized or faster slimes
- Side/wall collision and knockback can be added to resolveBlocks when needed

## Watch Out For
- `createSlime(x, y)` expects `y` to be the **ground surface** (tile bottom), not the slime's centre.
  The constructor receives `y - SLIME_RADIUS` to position the centre correctly.
- Block collision only checks top-surface; slimes falling through the side of a narrow block is a known limitation.
- Multiple slimes are staggered via random `jumpTimer` initialisation to avoid synchronised jumping.

## Change History
- **Build 7:** Initial implementation — Slime class, createSlime factory, Euler physics, periodic jump AI
