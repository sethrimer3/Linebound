# physics.ts

## Purpose
Verlet-integration physics engine. Provides Point (particle), Constraint (rigid distance), ElasticConstraint (spring-damper), Vec2, and World (simulation container).

## Dependencies
### Imports / Script Dependencies
- None (standalone module)

### Used By
- `stickman.ts` — builds skeleton from Points and Constraints
- `game.ts` — creates and steps the World each frame
- `level.ts` — uses Block type for terrain
- `renderer.ts` — uses Block type for drawing

## Key Components
### Point
- **Purpose:** Verlet particle with implicit velocity (pos − prevPos)
- **Key methods:** integrate(dt), addForce(fx,fy), collideGround(y), collideRect(...)
- **Notes:** `pinned` flag skips integration; `grounded` set by collision

### Constraint
- **Purpose:** Rigid distance constraint between two Points
- **Key methods:** satisfy() — pushes/pulls toward rest distance

### ElasticConstraint
- **Purpose:** Spring-damper variant; gives soft-body flex with oscillation damping
- **Parameters:** elasticity (spring coefficient), damping (velocity damping), maxCorrection

### World
- **Purpose:** Container for points, constraints, blocks; runs simulation via step(dt)
- **Notes:** CONSTRAINT_ITERATIONS=6 per step; dt clamped to 1/30s

## Implementation Notes
- Verlet integration: position-based, velocity implicit
- Constraint solving is iterative (Gauss-Seidel style)
- Collision is brute-force point-vs-rect; sufficient for small levels

## Change History
- **Build 3:** Initial implementation — Point, Constraint, ElasticConstraint, World
