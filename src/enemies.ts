/**
 * enemies.ts
 * Simple enemy entities for Linebound.
 *
 * This module defines the Slime enemy — a simple blob creature that
 * periodically jumps toward the player, inspired by Terraria slimes.
 *
 * Design philosophy:
 *   • No skeletal / Verlet structure — just (x, y, vx, vy) state.
 *   • A single circular hitbox makes collision detection trivial.
 *   • Smooth movement comes from simple Euler integration + gravity.
 *   • Periodic jump AI: the slime waits on the ground, then leaps
 *     toward the player every few seconds.
 */

// ---------------------------------------------------------------------------
// Constants — slime tuning
// ---------------------------------------------------------------------------

/** Gravitational acceleration applied to slimes each frame (px/s²). */
const SLIME_GRAVITY = 1800;

/** Maximum fall speed for slimes (px/s) — terminal velocity. */
const SLIME_MAX_FALL_SPEED = 600;

/** Upward velocity impulse applied when the slime jumps (px/s). */
const SLIME_JUMP_VY = -480;

/**
 * Horizontal speed applied toward the player when jumping (px/s).
 * Capped so the slime cannot teleport.
 */
const SLIME_JUMP_VX = 150;

/** How long the slime waits on the ground before jumping again (seconds). */
const SLIME_JUMP_INTERVAL = 2.2;

/** Slime hitbox radius in pixels. Used for collision and drawing. */
export const SLIME_RADIUS = 14;

/** Slime HP — future combat will use this. */
const SLIME_DEFAULT_HP = 30;

/**
 * Horizontal distance within which a slime will start tracking the player.
 * Outside this range the slime stays still.
 */
const SLIME_AGGRO_RANGE = 600;

/**
 * Multiplier converting landing impact velocity to squish amount.
 * Divides by the (negative) jump impulse to normalise, then multiplies by
 * this scale so a full-height jump produces a squish of ~1.
 */
const SQUISH_IMPACT_SCALE = 1.2;

// ---------------------------------------------------------------------------
// Slime class
// ---------------------------------------------------------------------------

/**
 * A simple slime enemy.
 *
 * State machine:
 *   • On ground + jump timer ≤ 0 → jump toward player, reset timer
 *   • In air → apply gravity, move horizontally, check ground collision
 *   • Dead → skip all updates
 *
 * The slime has no Verlet physics — it uses plain Euler integration.
 * Terrain collision is limited to the ground plane and block tops.
 */
export class Slime {
  /** World x position (centre of hitbox). */
  x: number;
  /** World y position (centre of hitbox). */
  y: number;
  /** Horizontal velocity in px/s. */
  vx = 0;
  /** Vertical velocity in px/s. */
  vy = 0;
  /** Whether the slime is resting on the ground this frame. */
  grounded = false;
  /** Remaining seconds before the slime jumps again. */
  jumpTimer: number;
  /** Current HP. */
  hp: number;
  /** Whether this slime is alive. Dead slimes are skipped and removed. */
  alive = true;
  /**
   * Squish factor (0 = no squish, 1 = fully squished).
   * Driven by vertical speed: high downward speed → squishes on land.
   */
  squish = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.hp = SLIME_DEFAULT_HP;
    // Stagger the initial jump timer so multiple slimes don't jump in sync
    this.jumpTimer = Math.random() * SLIME_JUMP_INTERVAL;
  }

  /**
   * Returns the hitbox radius (constant for now, but exposed as a getter
   * so it can be overridden by subclasses in the future).
   */
  get radius(): number {
    return SLIME_RADIUS;
  }

  /**
   * Updates the slime each frame.
   *
   * Steps:
   *   1. Apply gravity to vy.
   *   2. Clamp vy to terminal velocity.
   *   3. Integrate position (Euler).
   *   4. Resolve collisions against ground plane and terrain blocks.
   *   5. If grounded, tick the jump timer; jump when it expires.
   *   6. Animate the squish parameter.
   *
   * @param dt        - Delta time in seconds
   * @param groundY   - Y-coordinate of the infinite ground plane
   * @param blocks    - Terrain blocks for top-surface collision
   * @param playerX   - Player's world X (for jump direction)
   * @param playerY   - Player's world Y (used for aggro range calculation)
   */
  update(
    dt: number,
    groundY: number,
    blocks: Array<{ x: number; y: number; w: number; h: number }>,
    playerX: number,
    playerY: number,
  ): void {
    if (!this.alive) return;

    // 1. Apply gravity
    this.vy += SLIME_GRAVITY * dt;

    // 2. Clamp vertical speed to terminal velocity
    if (this.vy > SLIME_MAX_FALL_SPEED) {
      this.vy = SLIME_MAX_FALL_SPEED;
    }

    // 3. Euler integration
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 4. Resolve ground collisions (ground plane + block tops)
    this.grounded = false;
    this.resolveGround(groundY);
    this.resolveBlocks(blocks);

    // 5. Jump AI (only fires when player is within aggro range)
    const distToPlayer = Math.abs(playerX - this.x);
    if (distToPlayer <= SLIME_AGGRO_RANGE) {
      if (this.grounded) {
        this.jumpTimer -= dt;
        if (this.jumpTimer <= 0) {
          this.jump(playerX);
        }
      }
    }

    // 6. Animate squish: lerp squish toward 0 over time (smooth recovery)
    this.squish = Math.max(0, this.squish - dt * 4);
  }

  /**
   * Resolves collision with the infinite ground plane.
   * Clamps the slime above the plane and stops downward velocity.
   *
   * @param groundY - Y coordinate of the ground surface
   */
  private resolveGround(groundY: number): void {
    const bottom = this.y + this.radius;
    if (bottom >= groundY) {
      // Measure impact speed before clamping (for squish animation)
      const impactVy = this.vy;
      this.y = groundY - this.radius;
      this.vy = 0;
      this.vx *= 0.7; // Ground friction — bleed horizontal speed on landing
      this.grounded = true;

      // Squish proportionally to impact speed
      if (impactVy > 100) {
        this.squish = Math.min(1, impactVy / SLIME_JUMP_VY * -SQUISH_IMPACT_SCALE);
      }
    }
  }

  /**
   * Resolves collision with terrain blocks, pushing the slime above any
   * block top it lands on. Only top-surface collision is handled (no
   * side/bottom collision needed for basic slime gameplay).
   *
   * @param blocks - Terrain block array from the level instance
   */
  private resolveBlocks(
    blocks: Array<{ x: number; y: number; w: number; h: number }>,
  ): void {
    for (const b of blocks) {
      // Only check blocks the slime is horizontally overlapping
      if (this.x + this.radius < b.x || this.x - this.radius > b.x + b.w) {
        continue;
      }
      // Only resolve top-surface collision (slime falls onto block)
      const bottom = this.y + this.radius;
      if (bottom >= b.y && bottom <= b.y + b.h + 4 && this.vy >= 0) {
        const impactVy = this.vy;
        this.y = b.y - this.radius;
        this.vy = 0;
        this.vx *= 0.7;
        this.grounded = true;
        if (impactVy > 100) {
          this.squish = Math.min(1, impactVy / SLIME_JUMP_VY * -SQUISH_IMPACT_SCALE);
        }
      }
    }
  }

  /**
   * Launches the slime toward the player.
   * Applies an upward impulse and a horizontal push in the player's direction.
   * Resets the jump timer.
   *
   * @param playerX - World X of the player (used to determine jump direction)
   */
  private jump(playerX: number): void {
    this.vy = SLIME_JUMP_VY;
    // Jump horizontally toward the player (capped at SLIME_JUMP_VX)
    const dir = Math.sign(playerX - this.x) || 1;
    this.vx = dir * SLIME_JUMP_VX;
    this.jumpTimer = SLIME_JUMP_INTERVAL;
    this.grounded = false;
  }
}

// ---------------------------------------------------------------------------
// Spawn helper
// ---------------------------------------------------------------------------

/**
 * Creates a new Slime at the given world position.
 * The spawn Y is placed so the slime rests on the ground at that tile.
 *
 * @param x - World x (tile centre)
 * @param y - World y (tile bottom — slime will sit above this point)
 * @returns A new Slime instance
 */
export function createSlime(x: number, y: number): Slime {
  // Offset upward by radius so the slime's bottom sits at y
  return new Slime(x, y - SLIME_RADIUS);
}
