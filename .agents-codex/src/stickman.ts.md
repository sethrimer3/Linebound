# stickman.ts

## Purpose
Defines the Stickman entity — a soft-body ragdoll built from 11 Verlet points and ~17 constraints. Handles walking gait, jumping, crouching, punching, and idle posture.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Point, Constraint, ElasticConstraint, World, Vec2, GRAVITY

### Used By
- `game.ts` — creates and updates player stickman
- `renderer.ts` — draws stickman skeleton

## Key Components
### Stickman (class)
- **Anatomy:** head, neck, pelvis, elbowL/R, handL/R, kneeL/R, footL/R
- **Spine:** rigid constraints (neck↔pelvis, head↔neck)
- **Limbs:** elastic constraints (2 segments per limb with joint)
- **Cross-braces:** soft elastic constraints for structural integrity
- **Walking:** gait timer alternates left/right foot stepping
- **Jumping:** upward impulse applied to all points
- **Crouching:** `crouching` boolean; pulls neck + knees downward each frame while held
- **Punching:** `punch(targetX, targetY)` applies a velocity impulse to the leading hand toward the target

### createStickman(x, y, world, isPlayer)
- **Purpose:** Factory that builds a Stickman and registers all points/constraints in the World
- **Returns:** The constructed Stickman

## Implementation Notes
### Soft-body vs Rigidity Balance
- Spine uses stiffness=1.0 (fully rigid) to keep torso upright
- Limbs use stiffness=0.85 with elasticity=0.35 and damping=0.25
- Cross-braces use stiffness=0.5 for loose structural support
- This gives elastic bounce on landing while maintaining walking posture

### Head Buoyancy & Foot Attraction (Build 4)
- `HEAD_BUOYANCY_FORCE = GRAVITY * 1.5` applied upward to head every frame
  (net effect: head experiences ~0.5g upward, keeps it at the top of the skeleton)
- `FOOT_EXTRA_FORCE = GRAVITY * 0.6` applied downward to both feet every frame
  (net effect: feet experience 1.6g downward, stays grounded)
- Both forces are added via `addForce()` in `update()`, which runs before `world.step()`

### Crouch (Build 4)
- `crouching` flag set externally by `game.ts` based on S/ArrowDown input
- `applyCrouch()` adds a downward force to neck (CROUCH_FORCE=900) and knees (40%)
- Constraints compress the torso visually while crouching

### Punch (Build 4)
- `punch(targetX, targetY)` calculates direction from torso centre to target
- Sets `prevX/Y` of the leading hand (and elbow at 0.5×) to inject Verlet velocity
- Elastic arm constraints pull the hand back naturally after the punch

## Change History
- **Build 3:** Initial implementation — skeleton, walking, jumping
- **Build 4:** Added head buoyancy, foot ground attraction, crouching, and punch toward target
