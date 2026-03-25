# weapons.ts

## Purpose
Weapon definitions for Linebound. Pure data module — no side effects, no DOM access.

## Dependencies
### Imports / Script Dependencies
- None

### Used By
- `level.ts` — WeaponDef, getWeaponDef (for weapon pickups)
- `stickman.ts` — WeaponDef (equipped weapon field)
- `renderer.ts` — weapon.kind, weapon.color, weapon.bladeLength (for drawing)

## Key Components
### WeaponDef (interface)
- `id`, `name`, `kind` (melee/ranged), `grip` (oneHand/twoHand)
- `range` — melee: hit radius in px; ranged: projectile speed in px/s
- `arc` — angular sweep in radians (melee) or spread (ranged)
- `dmg`, `cooldown` (ms), `swingDuration` (ms), `knock`
- `color`, `highlightColor`, `bladeLength`

### Weapons
| ID          | Name        | Kind   | Grip    | Range | Cooldown |
|-------------|-------------|--------|---------|-------|----------|
| sword       | Sword       | melee  | oneHand | 42    | 550 ms   |
| dagger      | Dagger      | melee  | oneHand | 28    | 320 ms   |
| greatsword  | Greatsword  | melee  | twoHand | 64    | 820 ms   |
| bow         | Bow         | ranged | twoHand | 520   | 700 ms   |

### getWeaponDef(id)
- O(1) lookup by weapon id string

### getAllWeapons()
- Returns all registered weapons as an array

## Change History
- **Build 5:** Initial implementation — sword, dagger, greatsword, bow
