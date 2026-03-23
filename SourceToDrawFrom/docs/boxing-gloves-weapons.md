# Boxing Glove Weapons

Two dual-wield boxing glove weapons provide distinct melee playstyles. Both rely on the enhanced punch handling added to `Stick` but configure different visuals and on-hit effects via their `boxingGlove` payload in `WEAPON_DEFS`.

## Pyre Boxing Gloves

* **Weapon id:** `pyreBoxingGloves`
* **Theme:** Fire
* **Punch feel:** Faster cooldown, moderate knockback, aggressive trail visuals.
* **Special:** Triggers a `pyreWave` projectile from each punch. The wave grows as it travels, deals fire damage, and ignores terrain collisions to guarantee coverage.
* **Visuals:** Renders a fiery aura around each fist alongside ember-colored punch trails.

## Singularity Knuckles

* **Weapon id:** `singularityKnuckles`
* **Theme:** Void
* **Punch feel:** Slightly slower but heavier-hitting jabs with strong knockback.
* **Special:** Spawns void singularities at the end of each punch that deal damage over time while pulling nearby targets inward.
* **Visuals:** Constant orbiting mini singularities around each fist plus void-tinted glove glows.

## Implementation Notes

* The glove behavior is configured in `js/weapons.js` and executed in the new glove-specific update/render routines inside `js/stickman.js` and `js/stickman/render.js`.
* The expanding fire wave projectile is defined in `js/projectiles.js` under the `pyreWave` kind, which handles radius growth and ember visuals.
* `Stick.updateBoxingGloveState` keeps glove orbit timers, punch trails, and on-hit effects synchronized with the animation timeline.
