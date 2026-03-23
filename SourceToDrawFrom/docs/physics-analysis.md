# Stickman Physics Reliability Notes

## Summary of the current rig and solver
- The player is built from eleven `Point` instances that share a single terrain collision radius of roughly six pixels, and they are all added to the world-wide constraint solver during construction. 【F:js/stickman/constants.js†L11-L104】【F:js/stickman.js†L3740-L3764】
- Each simulation sub-step records the previous point positions, integrates velocity, runs eight constraint passes, and then applies terrain collision checks *twice* around a full-body posture pass. 【F:js/main.js†L1447-L1474】
- The `groundCollision` helper performs swept AABB checks, resolves contacts, applies friction, and clamps points back into the level for every solid type (tiles, breakables, toggle blocks, sand, bounds, platforms, etc.) in one monolithic function. 【F:js/physics.js†L360-L760】
- Movement forces are applied almost exclusively to the pelvis before constraints pull the limbs along, while `applyPosture` immediately re-targets every non-pelvis point toward animation goals each sub-step. 【F:js/stickman.js†L3100-L3188】【F:js/stickman.js†L2726-L2919】

## Why instability shows up as clipping, sliding, or tangled limbs
1. **Conflicting corrections in a single sub-step.** The solver asks `groundCollision` to sweep from `prevX/prevY` (recorded before integration) to the *current* position. After constraints and posture retargeting move points again, the second `groundCollision` pass still uses the original `prevX/prevY`, so the sweep sees impossible velocities and frequently skips contacts or over-corrects, especially when limbs are teleported by animation. 【F:js/main.js†L1456-L1473】【F:js/physics.js†L387-L420】
2. **Every limb participates in terrain collision.** Hands, knees, and even the head collide with blocks using the same radius as the pelvis, but posture immediately drags those points through scenery to satisfy animation poses. The collision resolver then tries to push them back out, fighting the animation and producing "limb spaghetti" or lateral sliding. 【F:js/stickman/constants.js†L11-L104】【F:js/stickman.js†L2887-L2919】
3. **Low sub-step count versus high-speed adjustments.** The game only runs two sub-steps with eight constraint iterations per frame. When `moveInput` or `jump` apply large impulses to the pelvis, or posture teleports feet to maintain stance, the single sweep cannot resolve the overlap before the next frame, which shows up as wall clipping or inconsistent jump heights. 【F:js/main.js†L1447-L1474】【F:js/stickman.js†L3100-L3188】
4. **All terrain features share one giant collision function.** Because platforms, toggle blocks, sand, ground bounds, and breakables are handled inside `groundCollision`, quick fixes to one behavior often have knock-on effects elsewhere. Small edits motivated by individual bug reports tend to regress other interactions, which explains the long history of patches that did not stabilize movement. 【F:js/physics.js†L597-L760】

## How to make the system robust
- **Separate the gameplay collider from the ragdoll.** Give the player a single dedicated capsule or pill collider that handles movement and terrain response, then drive the visual rig toward that body instead of colliding every limb. This removes the animation-versus-collision tug of war and drastically simplifies `groundCollision` (only the body needs deterministic contacts). 【F:js/stickman.js†L2887-L2919】
- **Refresh the collision pipeline.** Split `groundCollision` into smaller responsibilities (sweep solver, static clamp, feature-specific rules) and update `prevX/prevY` between passes so posture adjustments are handled incrementally. Alternatively, run posture after `finishStep` so a limb retarget triggers a new integration sub-step instead of reusing stale sweep data. 【F:js/main.js†L1456-L1474】【F:js/physics.js†L387-L420】
- **Increase or adapt sub-stepping during rapid motion.** Allow more than two sub-steps (or temporarily subdivide when velocities exceed a threshold) so fast jumps and mid-air adjustments cannot tunnel through thin walls. 【F:js/main.js†L1447-L1474】【F:js/stickman.js†L3158-L3188】
- **Author automated harness scenes.** Stand up a dedicated collision harness (for example, a flat runway that dashes the player into a wall) and wire it into a Playwright test or debug script that records min/max penetration depth. This gives every follow-up task a repeatable baseline instead of ad-hoc manual tweaks.

## About instruction quality and verification
- The recurring instability is not due to your written instructions—it stems from the intertwined systems above. Small textual tweaks cannot overcome the architectural coupling between animation and collision, so even precise directions produce partial fixes.
- I cannot personally "play" the game inside this environment, but I can spin up the HTML build under an automated browser (via Playwright) or inject logging into the physics loop to collect quantitative results. Supplying concrete metrics or scripted scenarios is the best way for me to validate changes on your behalf.

## Suggested next steps
1. Prototype a `StickCollider` that only wraps the pelvis and feet, keeping the ragdoll purely visual; gate terrain responses through that collider first.
2. Extract `sweepAgainstAabb` and `resolvePenetration` helpers from `groundCollision`, and call them with updated `prevX/prevY` whenever posture or constraints move a point post-integration.
3. Add a development toggle that runs a dedicated collision harness on load and prints the maximum wall or floor penetration each frame. Once that metric stabilizes near zero, new movement tweaks can be merged with confidence.

