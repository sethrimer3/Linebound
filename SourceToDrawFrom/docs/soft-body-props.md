# Soft Body Props Guide

This guide covers how the World Tree training hexagon is authored and how other stages can reuse the soft-body system.

## Runtime pipeline overview
- Layout compilation converts any `softHexagon` object into a soft-body definition via `layoutObjectToSoftBody`. The resulting entries are emitted in the compiled layout payload alongside physics boxes and decor.【F:js/levels.js†L8868-L8941】
- When a screen is configured, the compiled soft-body definitions are passed to `spawnSoftBody`, which creates the underlying `Point` instances, `ElasticDist` constraints, and rendering metadata before storing the body in `world.softBodies`.【F:js/levels.js†L8350-L8412】【F:js/main.js†L1772-L1897】
- The main update loop applies drag to each soft-body point through `updateSoftBodies`, then lets the standard physics step resolve collisions with terrain, walls, and moving platforms. Rendering happens after decor and before particles in `renderWorld` by calling `drawSoftBodies`.【F:js/main.js†L1526-L1559】【F:js/main.js†L1903-L2042】【F:js/main.js†L2575-L2609】

## Authoring a soft-body hexagon in a layout
1. Open the target level layout (for example, the World Tree canopy screen) and add an object entry with `"type": "softHexagon"`. You can specify `col`, `row`, and pixel offsets to position the body relative to the tile grid.【F:js/levels.js†L400-L445】
2. Tune mass and responsiveness by adjusting `pointMass`, `centerMass`, `stiffness`, `edgeElasticity`, and `damping`. These values map directly onto the `Point` and `ElasticDist` configuration inside `spawnSoftBody`. Higher stiffness resists deformation while higher damping settles wobble faster.【F:js/levels.js†L400-L445】【F:js/main.js†L1772-L1870】
3. Set interaction feel with `impulseScale`, `airDrag`, and `verticalDrag`. Melee and projectile hits forward their damage through `applySoftBodyImpulse`, which scales the applied velocity by these fields before updating the body’s impact highlight timer.【F:js/levels.js†L400-L445】【F:js/stickman/combat.js†L382-L431】
4. Customize visuals via `color`, `edgeColor`, `highlightColor`, and optional `shadowRadius`/`shadowOpacity`. The renderer uses these fields to draw a soft highlight, outline, and contact shadow each frame.【F:js/levels.js†L400-L445】【F:js/main.js†L1903-L2042】

## Player interaction hooks
- Melee attacks call `damageBreakableProps`, which now also detects nearby soft bodies and forwards impulses based on the attacker’s direction or strike arc.【F:js/stickman/combat.js†L190-L327】
- Projectile resolution similarly checks `projectileHitsSoftBody` and applies a velocity impulse using the projectile’s travel vector before consuming the projectile.【F:js/projectiles.js†L580-L709】
- Each soft body stores the last impact metadata (`lastHitSource`, `lastHitElement`, `lastHitDamage`), allowing future features such as elemental reactions or UI prompts to inspect recent interactions.【F:js/stickman/combat.js†L382-L431】

Use the canopy hexagon as a template: duplicate its object entry, tweak the mass/stiffness parameters for the desired bounce, and the system will automatically integrate the body into physics, collision, and combat responses when the screen loads.
