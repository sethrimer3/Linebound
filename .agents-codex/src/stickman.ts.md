# stickman.ts

## Purpose
Defines the Stickman entity — a soft-body ragdoll built from 11 Verlet points and ~17 constraints. Handles walking gait, jumping, and idle posture.

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

### createStickman(x, y, world, isPlayer)
- **Purpose:** Factory that builds a Stickman and registers all points/constraints in the World
- **Returns:** The constructed Stickman

## Implementation Notes
### Soft-body vs Rigidity Balance
- Spine uses stiffness=1.0 (fully rigid) to keep torso upright
- Limbs use stiffness=0.85 with elasticity=0.35 and damping=0.25
- Cross-braces use stiffness=0.5 for loose structural support
- This gives elastic bounce on landing while maintaining walking posture

## Change History
- **Build 3:** Initial implementation — skeleton, walking, jumping
