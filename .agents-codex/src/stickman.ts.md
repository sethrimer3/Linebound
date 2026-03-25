# stickman.ts

## Purpose
Defines the Stickman entity — a soft-body ragdoll character built from Verlet points and constraints.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Point, Constraint, ElasticConstraint, World, Vec2, GRAVITY
- `weapons.ts` — WeaponDef (for the equipped weapon field)

### Used By
- `game.ts` — creates and updates the player stickman
- `renderer.ts` — reads skeleton points, weapon, and facing for rendering

## Key Components
### Stickman (class)
- Skeleton: head, neck, pelvis, elbowL/R, handL/R, kneeL/R, footL/R
- `facing: Facing` — 1 = right, -1 = left
- `weapon: WeaponDef | null` — currently equipped weapon (null = unarmed)
- `attackCooldown: number` — seconds until next attack is allowed
- `equipWeapon(weapon)` — sets weapon and resets cooldown
- `jump()`, `turnAround()`, `punch()`, `update()`, `crouching`

### createStickman(x, y, world, isPlayer)
- Factory: builds skeleton, registers points/constraints in World

## Change History
- **Build 3:** Initial implementation — ragdoll physics, walk cycle, jump, punch, crouch
- **Build 5:** Added `weapon`, `attackCooldown` fields; added `equipWeapon()` method; added cooldown tick in `update()`
