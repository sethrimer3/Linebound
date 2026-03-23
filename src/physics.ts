/**
 * physics.ts
 * Verlet-integration physics engine for Linebound.
 *
 * Core concepts:
 *   • **Point** — a particle with position, previous position, and acceleration.
 *     Velocity is implicit (current − previous). Verlet integration is stable
 *     and trivially supports constraints.
 *   • **Constraint** — maintains a relationship (usually a rest distance)
 *     between two Points. Solved iteratively each frame.
 *   • **ElasticConstraint** — spring-damper variant of a distance constraint;
 *     gives soft-body flex while damping oscillation.
 *
 * The engine is intentionally simple: no spatial hashing, no broadphase.
 * Linebound levels are small enough that brute-force suffices for now.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gravitational acceleration (px/s²), applied every frame. */
export const GRAVITY = 1800;

/** Exponential air-drag coefficient per second. Higher = more drag. */
const AIR_DRAG_PER_SEC = 3.2;

/** Exponential ground-friction coefficient per second. */
const GROUND_FRICTION_PER_SEC = 16;

/** Tiny bounce factor when a point hits the ground. */
const GROUND_BOUNCE = 0.02;

/** Speeds below this are snapped to zero to prevent micro-jitter. */
const REST_EPSILON = 0.01;

/** How many constraint-solving iterations per physics step. */
export const CONSTRAINT_ITERATIONS = 6;

// ---------------------------------------------------------------------------
// Vec2 — lightweight reusable 2-component vector
// ---------------------------------------------------------------------------

/** Simple 2D vector used throughout the physics system. */
export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  /** Returns the length of this vector. */
  length(): number {
    return Math.hypot(this.x, this.y);
  }

  /** Adds another vector in-place. */
  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Subtracts another vector in-place. */
  sub(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** Scales this vector in-place. */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** Returns a new copy of this vector. */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}

// ---------------------------------------------------------------------------
// Point — Verlet particle
// ---------------------------------------------------------------------------

/**
 * A single particle in the Verlet simulation.
 * Position history encodes velocity implicitly: v ≈ (pos − prev) / dt.
 */
export class Point {
  /** Current x position. */
  x: number;
  /** Current y position. */
  y: number;
  /** Previous-frame x position (used for Verlet velocity). */
  prevX: number;
  /** Previous-frame y position. */
  prevY: number;
  /** Accumulated acceleration this frame (reset each step). */
  ax = 0;
  ay = 0;
  /** Mass — affects force application (F = ma). */
  mass = 1;
  /** True if this point is touching the ground this frame. */
  grounded = false;
  /** If true, physics integration is skipped (pinned in place). */
  pinned = false;
  /** Descriptive label for debugging (e.g. 'head', 'kneeL'). */
  label = '';

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }

  /** Computed x-velocity from Verlet positions. */
  get vx(): number {
    return this.x - this.prevX;
  }

  /** Computed y-velocity from Verlet positions. */
  get vy(): number {
    return this.y - this.prevY;
  }

  /**
   * Applies a force vector to this point.
   * Converts to acceleration using F = ma.
   */
  addForce(fx: number, fy: number): void {
    this.ax += fx / this.mass;
    this.ay += fy / this.mass;
  }

  /**
   * Verlet integration step.
   * Updates position using current velocity (implicit) and accumulated
   * acceleration, then applies exponential air drag.
   */
  integrate(dt: number): void {
    if (this.pinned) return;

    // Velocity from Verlet (pos - prevPos)
    let vx = this.x - this.prevX;
    let vy = this.y - this.prevY;

    // Apply accumulated acceleration
    vx += this.ax * dt * dt;
    vy += this.ay * dt * dt;

    // Exponential air drag
    const drag = Math.exp(-AIR_DRAG_PER_SEC * dt);
    vx *= drag;
    vy *= drag;

    // Store previous and update current position
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += vx;
    this.y += vy;

    // Reset acceleration for next frame
    this.ax = 0;
    this.ay = 0;
  }

  /**
   * Resolves collision with a horizontal ground plane at the given y.
   * If the point is below groundY, it's pushed up and its velocity is
   * dampened. Sets `grounded = true` on contact.
   */
  collideGround(groundY: number): void {
    if (this.pinned) return;

    if (this.y >= groundY) {
      this.y = groundY;
      // Compute vertical velocity and apply bounce + friction
      const vy = this.y - this.prevY;
      this.prevY = this.y + vy * GROUND_BOUNCE;

      // Ground friction: reduce horizontal velocity
      const friction = Math.exp(-GROUND_FRICTION_PER_SEC * (1 / 60));
      const vx = this.x - this.prevX;
      this.prevX = this.x - vx * friction;

      this.grounded = true;
    }
  }

  /**
   * Resolves collision with a rectangle (AABB).
   * Pushes the point out of the rectangle along the shallowest axis.
   */
  collideRect(rx: number, ry: number, rw: number, rh: number): void {
    if (this.pinned) return;

    // Check if point is inside the rect
    if (this.x < rx || this.x > rx + rw || this.y < ry || this.y > ry + rh) {
      return;
    }

    // Find shallowest penetration axis
    const dLeft = this.x - rx;
    const dRight = (rx + rw) - this.x;
    const dTop = this.y - ry;
    const dBottom = (ry + rh) - this.y;
    const minD = Math.min(dLeft, dRight, dTop, dBottom);

    if (minD === dTop) {
      // Push out top — ground collision
      this.y = ry;
      const vy = this.y - this.prevY;
      this.prevY = this.y + vy * GROUND_BOUNCE;
      const friction = Math.exp(-GROUND_FRICTION_PER_SEC * (1 / 60));
      const vx = this.x - this.prevX;
      this.prevX = this.x - vx * friction;
      this.grounded = true;
    } else if (minD === dBottom) {
      // Push out bottom — ceiling
      this.y = ry + rh;
      this.prevY = this.y;
    } else if (minD === dLeft) {
      // Push out left
      this.x = rx;
      this.prevX = this.x;
    } else {
      // Push out right
      this.x = rx + rw;
      this.prevX = this.x;
    }
  }

  /** Teleports the point instantly (resets velocity to zero). */
  teleport(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
  }
}

// ---------------------------------------------------------------------------
// Constraint (rigid distance)
// ---------------------------------------------------------------------------

/**
 * Maintains a fixed rest distance between two Points.
 * Stiffness controls how strongly the constraint is enforced (0–1).
 */
export class Constraint {
  /** Point A. */
  a: Point;
  /** Point B. */
  b: Point;
  /** Rest (target) distance. */
  rest: number;
  /** Stiffness factor (0 = limp, 1 = fully rigid). */
  stiffness: number;

  constructor(a: Point, b: Point, rest?: number, stiffness = 1.0) {
    this.a = a;
    this.b = b;
    this.rest = rest ?? Math.hypot(b.x - a.x, b.y - a.y);
    this.stiffness = stiffness;
  }

  /**
   * Pushes/pulls the two points toward the rest distance.
   * Weight is split evenly (both points move equally), unless one
   * is pinned (only the free point moves).
   */
  satisfy(): void {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const diff = (dist - this.rest) / dist * this.stiffness;

    const wA = this.a.pinned ? 0 : 1;
    const wB = this.b.pinned ? 0 : 1;
    const total = wA + wB;
    if (total === 0) return;

    const cx = dx * diff / total;
    const cy = dy * diff / total;

    if (wA) {
      this.a.x += cx * wA;
      this.a.y += cy * wA;
    }
    if (wB) {
      this.b.x -= cx * wB;
      this.b.y -= cy * wB;
    }
  }
}

// ---------------------------------------------------------------------------
// ElasticConstraint (spring + damper)
// ---------------------------------------------------------------------------

/**
 * A soft distance constraint with spring-like elasticity and velocity damping.
 * Provides the "soft body" feel while still converging to rest distance.
 *
 * The constraint first applies a rigid correction (like Constraint), then adds
 * a spring force proportional to stretch and a damping impulse opposing
 * relative velocity along the constraint axis.
 */
export class ElasticConstraint extends Constraint {
  /** Spring coefficient — higher means snappier return to rest. */
  elasticity: number;
  /** Damping factor — higher means less oscillation. */
  damping: number;
  /** Maximum position correction per satisfy() call. */
  maxCorrection: number;

  constructor(
    a: Point,
    b: Point,
    rest?: number,
    stiffness = 1.0,
    elasticity = 0.4,
    damping = 0.2,
    maxCorrection?: number,
  ) {
    super(a, b, rest, stiffness);
    this.elasticity = elasticity;
    this.damping = damping;
    this.maxCorrection = maxCorrection ?? (this.rest * 0.5);
  }

  /**
   * Applies both rigid constraint satisfaction and spring-damper forces.
   * The rigid part keeps the skeleton from collapsing; the elastic part
   * lets limbs flex naturally on impact and settle smoothly.
   */
  override satisfy(): void {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const stretch = dist - this.rest;

    // Direction unit vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Weights for pinned-point handling
    const wA = this.a.pinned ? 0 : 1;
    const wB = this.b.pinned ? 0 : 1;
    const total = wA + wB;
    if (total === 0) return;

    // Rigid correction (clamped for stability)
    let correction = stretch * this.stiffness;
    if (Math.abs(correction) > this.maxCorrection) {
      correction = Math.sign(correction) * this.maxCorrection;
    }
    const halfCorr = correction / total;
    if (wA) {
      this.a.x += nx * halfCorr * wA;
      this.a.y += ny * halfCorr * wA;
    }
    if (wB) {
      this.b.x -= nx * halfCorr * wB;
      this.b.y -= ny * halfCorr * wB;
    }

    // Spring force: pull toward rest proportionally to stretch
    if (this.elasticity > 0) {
      let springCorr = stretch * this.elasticity;
      if (Math.abs(springCorr) > this.maxCorrection) {
        springCorr = Math.sign(springCorr) * this.maxCorrection;
      }
      const halfSpring = springCorr / total;
      if (wA) {
        this.a.x += nx * halfSpring * wA;
        this.a.y += ny * halfSpring * wA;
      }
      if (wB) {
        this.b.x -= nx * halfSpring * wB;
        this.b.y -= ny * halfSpring * wB;
      }
    }

    // Damping: oppose relative velocity along the constraint axis
    if (this.damping > 0) {
      const relVx = (this.b.x - this.b.prevX) - (this.a.x - this.a.prevX);
      const relVy = (this.b.y - this.b.prevY) - (this.a.y - this.a.prevY);

      // Project relative velocity onto constraint direction
      const relDot = relVx * nx + relVy * ny;
      if (Math.abs(relDot) > REST_EPSILON) {
        const impulse = relDot * this.damping / total;
        if (wA) {
          this.a.prevX -= nx * impulse * wA;
          this.a.prevY -= ny * impulse * wA;
        }
        if (wB) {
          this.b.prevX += nx * impulse * wB;
          this.b.prevY += ny * impulse * wB;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// World — collects points, constraints, and runs the simulation
// ---------------------------------------------------------------------------

/** A rectangular solid block in the world used for terrain collision. */
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The physics world. Holds all simulation state and steps the simulation.
 * Call `step(dt)` each frame to advance physics.
 */
export class World {
  /** All active particles. */
  points: Point[] = [];
  /** All constraints (rigid + elastic). */
  constraints: (Constraint | ElasticConstraint)[] = [];
  /** Terrain blocks for collision. */
  blocks: Block[] = [];
  /** Y-coordinate of the infinite ground plane. */
  groundY = 600;
  /** Gravity acceleration (px/s²). Override per-world if needed. */
  gravity = GRAVITY;

  /**
   * Advances the simulation by `dt` seconds.
   * Order: gravity → integrate → collide → satisfy constraints (iterated).
   */
  step(dt: number): void {
    // Clamp dt to prevent explosion on tab-switch / long pause
    const safeDt = Math.min(dt, 1 / 30);

    // 1. Apply gravity to every point
    for (const p of this.points) {
      p.grounded = false;
      p.addForce(0, this.gravity * p.mass);
    }

    // 2. Verlet integration
    for (const p of this.points) {
      p.integrate(safeDt);
    }

    // 3. Satisfy constraints (multiple iterations for stability)
    for (let i = 0; i < CONSTRAINT_ITERATIONS; i++) {
      for (const c of this.constraints) {
        c.satisfy();
      }
    }

    // 4. Collision detection — ground plane + blocks
    for (const p of this.points) {
      p.collideGround(this.groundY);
      for (const b of this.blocks) {
        p.collideRect(b.x, b.y, b.w, b.h);
      }
    }
  }

  /** Adds a point to the world and returns it. */
  addPoint(p: Point): Point {
    this.points.push(p);
    return p;
  }

  /** Adds a constraint to the world and returns it. */
  addConstraint<T extends Constraint>(c: T): T {
    this.constraints.push(c);
    return c;
  }

  /** Removes a point and all constraints referencing it. */
  removePoint(p: Point): void {
    this.points = this.points.filter(pt => pt !== p);
    this.constraints = this.constraints.filter(c => c.a !== p && c.b !== p);
  }
}
