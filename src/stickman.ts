/**
 * stickman.ts
 * Defines the Stickman entity — a soft-body ragdoll character built from
 * Verlet points and constraints.
 *
 * Anatomy:
 *   head ─── (circle)
 *     │
 *   neck
 *     │
 *   torso ── single line segment (neck → pelvis)
 *     │
 *   pelvis
 *   ╱    ╲
 *  Arms    Legs
 *
 * Each limb has TWO segments and a joint in the middle:
 *   Arm:  neck → elbow → hand   (hand = small square)
 *   Leg:  pelvis → knee → foot  (foot = small square)
 *
 * Elastic constraints on the limbs give soft-body flex on impact while
 * rigid constraints on the spine (neck↔pelvis) keep the character upright.
 * Walking is driven by a simple gait cycle that targets foot positions,
 * with the physics engine smoothing everything out naturally.
 */

import {
  Point,
  Constraint,
  ElasticConstraint,
  World,
  Vec2,
  GRAVITY,
} from './physics';

// ---------------------------------------------------------------------------
// Constants — skeleton dimensions & tuning
// ---------------------------------------------------------------------------

/** Overall scale factor for the stickman. Adjust to change character size. */
const SCALE = 1.0;

/** Head radius in pixels. */
export const HEAD_RADIUS = 10 * SCALE;

/** Length of neck-to-pelvis torso segment. */
const TORSO_LENGTH = 30 * SCALE;

/** Length of upper arm (neck → elbow). */
const UPPER_ARM = 16 * SCALE;

/** Length of lower arm (elbow → hand). */
const LOWER_ARM = 14 * SCALE;

/** Length of upper leg (pelvis → knee). */
const UPPER_LEG = 18 * SCALE;

/** Length of lower leg (knee → foot). */
const LOWER_LEG = 16 * SCALE;

/** Size of hand/foot square (half-width). */
export const EXTREMITY_SIZE = 3 * SCALE;

/** Stiffness for spine constraints (fully rigid). */
const SPINE_STIFFNESS = 1.0;

/** Stiffness for limb constraints (slightly flexible for soft-body feel). */
const LIMB_STIFFNESS = 0.85;

/** Elasticity for limb spring constraints (snappy return). */
const LIMB_ELASTICITY = 0.35;

/** Damping for limb spring constraints (reduce oscillation). */
const LIMB_DAMPING = 0.25;

/** Stiffness for structural cross-constraints (keep shape). */
const CROSS_STIFFNESS = 0.5;

/** Cross-constraint elasticity. */
const CROSS_ELASTICITY = 0.2;

/** Cross-constraint damping. */
const CROSS_DAMPING = 0.3;

/** How fast the stickman walks (px/s). */
const WALK_SPEED = 120 * SCALE;

/** Jump impulse applied to all points. */
const JUMP_IMPULSE = -420 * SCALE;

/** How far ahead the leading foot targets during a step. */
const STEP_DISTANCE = 24 * SCALE;

/** Gait cycle duration in seconds (full left-right-left stride). */
const GAIT_PERIOD = 0.6;

/** Maximum fall speed (terminal velocity, px/s). */
const MAX_FALL_SPEED = 600;

/** Pose-target lerp speed — how fast limbs return to idle posture. */
const POSE_LERP = 6.0;

// ---------------------------------------------------------------------------
// Stickman class
// ---------------------------------------------------------------------------

/** Facing direction of the stickman. */
export type Facing = 1 | -1;

/**
 * A Stickman character built from physics points and constraints.
 * Construct one via `createStickman()` which wires everything into the World.
 */
export class Stickman {
  // -- Skeleton points --
  head: Point;
  neck: Point;
  pelvis: Point;
  elbowL: Point;
  elbowR: Point;
  handL: Point;
  handR: Point;
  kneeL: Point;
  kneeR: Point;
  footL: Point;
  footR: Point;

  /** All points belonging to this stickman (for iteration). */
  points: Point[];

  /** All constraints belonging to this stickman. */
  constraints: (Constraint | ElasticConstraint)[];

  /** Direction the stickman faces: 1 = right, -1 = left. */
  facing: Facing = 1;

  /** Whether the auto-walk is active (stickmen auto-move forward). */
  walking = true;

  /** True while the stickman is in the air. */
  airborne = false;

  /** Gait timer — drives the walk cycle (0 → GAIT_PERIOD). */
  gaitTimer = 0;

  /** Whether the stickman is player-controlled. */
  isPlayer: boolean;

  /** Health — for future combat use. */
  hp = 100;

  /** Whether this stickman is alive. */
  alive = true;

  constructor(x: number, y: number, isPlayer: boolean) {
    this.isPlayer = isPlayer;

    // ------------------------------------------------------------------
    // Build skeleton points relative to spawn position.
    // Origin (x, y) is the pelvis; everything is offset from there.
    // ------------------------------------------------------------------
    this.pelvis = new Point(x, y);
    this.pelvis.label = 'pelvis';

    this.neck = new Point(x, y - TORSO_LENGTH);
    this.neck.label = 'neck';

    this.head = new Point(x, y - TORSO_LENGTH - HEAD_RADIUS);
    this.head.label = 'head';

    // Arms — idle pose: elbows slightly out, hands at hip level
    this.elbowL = new Point(x - UPPER_ARM * 0.7, y - TORSO_LENGTH + UPPER_ARM * 0.7);
    this.elbowL.label = 'elbowL';
    this.elbowR = new Point(x + UPPER_ARM * 0.7, y - TORSO_LENGTH + UPPER_ARM * 0.7);
    this.elbowR.label = 'elbowR';

    this.handL = new Point(x - UPPER_ARM * 0.5, y - TORSO_LENGTH + UPPER_ARM + LOWER_ARM * 0.6);
    this.handL.label = 'handL';
    this.handR = new Point(x + UPPER_ARM * 0.5, y - TORSO_LENGTH + UPPER_ARM + LOWER_ARM * 0.6);
    this.handR.label = 'handR';

    // Legs — idle pose: knees slightly bent outward, feet on ground
    this.kneeL = new Point(x - 6 * SCALE, y + UPPER_LEG * 0.9);
    this.kneeL.label = 'kneeL';
    this.kneeR = new Point(x + 6 * SCALE, y + UPPER_LEG * 0.9);
    this.kneeR.label = 'kneeR';

    this.footL = new Point(x - 4 * SCALE, y + UPPER_LEG + LOWER_LEG);
    this.footL.label = 'footL';
    this.footR = new Point(x + 4 * SCALE, y + UPPER_LEG + LOWER_LEG);
    this.footR.label = 'footR';

    this.points = [
      this.head, this.neck, this.pelvis,
      this.elbowL, this.elbowR, this.handL, this.handR,
      this.kneeL, this.kneeR, this.footL, this.footR,
    ];

    this.constraints = [];
  }

  /**
   * Returns true if at least one foot is on the ground.
   */
  get onGround(): boolean {
    return this.footL.grounded || this.footR.grounded;
  }

  /**
   * Returns the approximate center-of-mass position.
   */
  get center(): Vec2 {
    return new Vec2(
      (this.neck.x + this.pelvis.x) / 2,
      (this.neck.y + this.pelvis.y) / 2,
    );
  }

  /**
   * Updates the stickman each frame: walk cycle, posture targeting, airborne check.
   * Called BEFORE the physics world step so forces/targets are set up.
   */
  update(dt: number, world: World): void {
    if (!this.alive) return;

    this.airborne = !this.onGround;

    // Apply walk movement
    if (this.walking && !this.airborne) {
      this.applyWalk(dt, world);
    }

    // Apply posture correction — gentle spring-like pull toward idle pose
    this.applyPose(dt);

    // Clamp maximum fall speed on all points
    this.clampFallSpeed();
  }

  /**
   * Drives the walking gait cycle.
   * Alternates targeting left/right feet forward, letting the physics
   * engine resolve the rest naturally through constraints.
   */
  private applyWalk(dt: number, world: World): void {
    this.gaitTimer += dt;
    if (this.gaitTimer > GAIT_PERIOD) {
      this.gaitTimer -= GAIT_PERIOD;
    }

    const moveX = WALK_SPEED * this.facing * dt;

    // Move pelvis forward (the "engine" that drives walking)
    this.pelvis.x += moveX * 0.5;
    this.pelvis.prevX += moveX * 0.5;
    this.neck.x += moveX * 0.5;
    this.neck.prevX += moveX * 0.5;

    // Gait phase: first half = left foot leads, second half = right
    const phase = this.gaitTimer / GAIT_PERIOD;
    const pelvisX = this.pelvis.x;
    const groundY = world.groundY;

    // Find effective ground for feet — check terrain blocks
    const footGroundY = this.findFootGround(world);

    if (phase < 0.5) {
      // Left foot steps forward, right foot plants
      this.targetFoot(this.footL, this.kneeL,
        pelvisX + STEP_DISTANCE * this.facing,
        footGroundY, dt);
      this.plantFoot(this.footR, footGroundY, dt);
    } else {
      // Right foot steps forward, left foot plants
      this.targetFoot(this.footR, this.kneeR,
        pelvisX + STEP_DISTANCE * this.facing,
        footGroundY, dt);
      this.plantFoot(this.footL, footGroundY, dt);
    }
  }

  /**
   * Finds the effective ground Y for feet at the stickman's current position.
   * Checks world ground plane and terrain blocks.
   */
  private findFootGround(world: World): number {
    let groundY = world.groundY;

    // Check terrain blocks beneath the pelvis for closer ground
    const px = this.pelvis.x;
    const py = this.pelvis.y;
    for (const b of world.blocks) {
      // Block is beneath us and we're horizontally within it
      if (px >= b.x && px <= b.x + b.w && b.y > py && b.y < groundY) {
        groundY = b.y;
      }
    }

    return groundY;
  }

  /**
   * Moves a foot toward a target x position on the ground.
   * Uses a lerp to smoothly animate the step.
   */
  private targetFoot(
    foot: Point, knee: Point,
    targetX: number, groundY: number, dt: number,
  ): void {
    const lerpFactor = 1 - Math.exp(-POSE_LERP * dt);
    foot.x += (targetX - foot.x) * lerpFactor;
    foot.y += (groundY - foot.y) * lerpFactor;
    foot.prevX += (targetX - foot.prevX) * lerpFactor * 0.5;
    foot.prevY += (groundY - foot.prevY) * lerpFactor * 0.5;
  }

  /**
   * Keeps a planted foot on the ground — prevents sliding.
   */
  private plantFoot(foot: Point, groundY: number, dt: number): void {
    const lerpFactor = 1 - Math.exp(-POSE_LERP * 2 * dt);
    foot.y += (groundY - foot.y) * lerpFactor;
    foot.prevY += (groundY - foot.prevY) * lerpFactor * 0.5;
  }

  /**
   * Gently pulls limbs toward their idle resting pose.
   * This prevents the ragdoll from flopping around endlessly.
   */
  private applyPose(dt: number): void {
    const lerpFactor = 1 - Math.exp(-POSE_LERP * 0.5 * dt);
    const cx = this.pelvis.x;
    const ny = this.neck.y;

    // Arms: elbows at ~45° from neck, hands hanging beside torso
    this.posePoint(this.elbowL,
      cx - UPPER_ARM * 0.5 * this.facing, ny + UPPER_ARM * 0.5, lerpFactor);
    this.posePoint(this.elbowR,
      cx + UPPER_ARM * 0.5 * this.facing, ny + UPPER_ARM * 0.5, lerpFactor);
    this.posePoint(this.handL,
      cx - LOWER_ARM * 0.3 * this.facing,
      ny + UPPER_ARM + LOWER_ARM * 0.4, lerpFactor * 0.5);
    this.posePoint(this.handR,
      cx + LOWER_ARM * 0.3 * this.facing,
      ny + UPPER_ARM + LOWER_ARM * 0.4, lerpFactor * 0.5);
  }

  /**
   * Lerps a single point toward a target position.
   * Only adjusts position, not prevPosition — so velocity is gently nudged.
   */
  private posePoint(p: Point, tx: number, ty: number, lerp: number): void {
    if (p.pinned || p.grounded) return;
    p.x += (tx - p.x) * lerp;
    p.y += (ty - p.y) * lerp;
  }

  /**
   * Clamps the downward velocity of all points to MAX_FALL_SPEED.
   * Prevents the stickman from accelerating infinitely during long falls.
   */
  private clampFallSpeed(): void {
    for (const p of this.points) {
      const vy = p.y - p.prevY;
      if (vy > MAX_FALL_SPEED / 60) {
        p.prevY = p.y - MAX_FALL_SPEED / 60;
      }
    }
  }

  /**
   * Makes the stickman jump by applying an upward impulse to all points.
   * Only works when at least one foot is grounded.
   */
  jump(): void {
    if (!this.onGround || !this.alive) return;

    for (const p of this.points) {
      p.prevY = p.y - JUMP_IMPULSE / 60;
      p.grounded = false;
    }
  }

  /**
   * Reverses the stickman's facing direction.
   */
  turnAround(): void {
    this.facing = (this.facing === 1 ? -1 : 1) as Facing;
  }
}

// ---------------------------------------------------------------------------
// Factory — creates a fully-wired Stickman in a World
// ---------------------------------------------------------------------------

/**
 * Creates a new Stickman at position (x, y) and registers all its points
 * and constraints in the given physics World.
 *
 * @param x       - Spawn x (pelvis position)
 * @param y       - Spawn y (pelvis position — feet will be below this)
 * @param world   - The physics world to add the stickman to
 * @param isPlayer - Whether this is the player-controlled stickman
 * @returns The constructed Stickman
 */
export function createStickman(
  x: number, y: number, world: World, isPlayer = true,
): Stickman {
  const s = new Stickman(x, y, isPlayer);

  // Register all points in the world
  for (const p of s.points) {
    world.addPoint(p);
  }

  // ------------------------------------------------------------------
  // Build constraints
  // ------------------------------------------------------------------

  // Spine (rigid) — keeps the torso stiff
  addRigid(s, world, s.head, s.neck, SPINE_STIFFNESS);
  addRigid(s, world, s.neck, s.pelvis, SPINE_STIFFNESS);

  // Left arm (elastic) — soft-body flex
  addElastic(s, world, s.neck, s.elbowL, LIMB_STIFFNESS);
  addElastic(s, world, s.elbowL, s.handL, LIMB_STIFFNESS);

  // Right arm (elastic)
  addElastic(s, world, s.neck, s.elbowR, LIMB_STIFFNESS);
  addElastic(s, world, s.elbowR, s.handR, LIMB_STIFFNESS);

  // Left leg (elastic)
  addElastic(s, world, s.pelvis, s.kneeL, LIMB_STIFFNESS);
  addElastic(s, world, s.kneeL, s.footL, LIMB_STIFFNESS);

  // Right leg (elastic)
  addElastic(s, world, s.pelvis, s.kneeR, LIMB_STIFFNESS);
  addElastic(s, world, s.kneeR, s.footR, LIMB_STIFFNESS);

  // Cross-constraints — structural bracing to prevent collapse
  addCross(s, world, s.neck, s.kneeL);       // Torso to left knee
  addCross(s, world, s.neck, s.kneeR);       // Torso to right knee
  addCross(s, world, s.pelvis, s.elbowL);    // Pelvis to left elbow
  addCross(s, world, s.pelvis, s.elbowR);    // Pelvis to right elbow
  addCross(s, world, s.kneeL, s.kneeR);      // Knee-to-knee spread
  addCross(s, world, s.elbowL, s.elbowR);    // Elbow-to-elbow spread
  addCross(s, world, s.head, s.pelvis);       // Head-to-pelvis (uprightness)

  return s;
}

/**
 * Helper: adds a rigid Constraint between two points and registers it.
 */
function addRigid(
  s: Stickman, world: World, a: Point, b: Point, stiffness: number,
): void {
  const c = new Constraint(a, b, undefined, stiffness);
  s.constraints.push(c);
  world.addConstraint(c);
}

/**
 * Helper: adds an ElasticConstraint between two points and registers it.
 */
function addElastic(
  s: Stickman, world: World, a: Point, b: Point, stiffness: number,
): void {
  const c = new ElasticConstraint(
    a, b, undefined, stiffness, LIMB_ELASTICITY, LIMB_DAMPING,
  );
  s.constraints.push(c);
  world.addConstraint(c);
}

/**
 * Helper: adds a softer cross-brace ElasticConstraint for structural integrity.
 */
function addCross(
  s: Stickman, world: World, a: Point, b: Point,
): void {
  const c = new ElasticConstraint(
    a, b, undefined, CROSS_STIFFNESS, CROSS_ELASTICITY, CROSS_DAMPING,
  );
  s.constraints.push(c);
  world.addConstraint(c);
}
