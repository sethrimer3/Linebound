"use strict";
(() => {
  // src/save.ts
  var SAVE_KEY = "linebound_save";
  var SAVE_VERSION = 1;
  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playerName: "Player",
      completedLevels: []
    };
  }
  function loadSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.version !== "number") return null;
      return parsed;
    } catch {
      console.warn("[save] Failed to parse saved data; starting fresh.");
      return null;
    }
  }
  function persistSave(data) {
    const toWrite = { ...data, timestamp: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toWrite));
  }
  function exportSave() {
    const data = loadSave() ?? createDefaultSave();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `linebound_save_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function importSave(onSuccess, onError) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result;
          if (typeof raw !== "string") throw new Error("Unexpected file content type");
          const parsed = JSON.parse(raw);
          if (typeof parsed.version !== "number") {
            throw new Error("Invalid save file: missing version field");
          }
          persistSave(parsed);
          onSuccess(parsed);
        } catch (err) {
          onError(err instanceof Error ? err.message : "Unknown error reading save file");
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  // src/menu.ts
  var MENU_SCENE_ID = "scene-menu";
  function initMenu(callbacks) {
    const scene = document.getElementById(MENU_SCENE_ID);
    if (!scene) {
      console.error("[menu] Scene element not found:", MENU_SCENE_ID);
      return;
    }
    scene.classList.remove("hidden");
    wireButtons(callbacks);
  }
  function hideMenu() {
    const scene = document.getElementById(MENU_SCENE_ID);
    scene?.classList.add("hidden");
  }
  function wireButtons(callbacks) {
    bindButton("btn-start-game", () => {
      hideMenu();
      callbacks.onStartGame();
    });
    bindButton("btn-settings", () => {
      callbacks.onSettings();
    });
    bindButton("btn-export-save", () => {
      exportSave();
      flashStatus("Save exported!");
    });
    bindButton("btn-import-save", () => {
      importSave(
        (data) => {
          flashStatus(`Save imported (v${data.version})`);
        },
        (msg) => {
          flashStatus(`Import failed: ${msg}`, true);
        }
      );
    });
  }
  function bindButton(id, handler) {
    const btn = document.getElementById(id);
    if (!btn) {
      console.warn("[menu] Button not found:", id);
      return;
    }
    const fresh = btn.cloneNode(true);
    btn.replaceWith(fresh);
    fresh.addEventListener("click", handler);
  }
  function flashStatus(message, isError = false) {
    const statusEl = document.getElementById("menu-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = isError ? "menu-status error" : "menu-status success";
    statusEl.classList.remove("hidden");
    const existingTimer = statusEl._flashTimer;
    if (existingTimer !== void 0) clearTimeout(existingTimer);
    statusEl._flashTimer = window.setTimeout(() => {
      statusEl.classList.add("hidden");
    }, 3e3);
  }

  // src/physics.ts
  var GRAVITY = 1800;
  var AIR_DRAG_PER_SEC = 3.2;
  var GROUND_FRICTION_PER_SEC = 16;
  var GROUND_BOUNCE = 0.02;
  var REST_EPSILON = 0.01;
  var CONSTRAINT_ITERATIONS = 6;
  var Vec2 = class _Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    /** Returns the length of this vector. */
    length() {
      return Math.hypot(this.x, this.y);
    }
    /** Adds another vector in-place. */
    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
    /** Subtracts another vector in-place. */
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }
    /** Scales this vector in-place. */
    scale(s) {
      this.x *= s;
      this.y *= s;
      return this;
    }
    /** Returns a new copy of this vector. */
    clone() {
      return new _Vec2(this.x, this.y);
    }
  };
  var Point = class {
    constructor(x, y) {
      /** Accumulated acceleration this frame (reset each step). */
      this.ax = 0;
      this.ay = 0;
      /** Mass — affects force application (F = ma). */
      this.mass = 1;
      /** True if this point is touching the ground this frame. */
      this.grounded = false;
      /** If true, physics integration is skipped (pinned in place). */
      this.pinned = false;
      /** Descriptive label for debugging (e.g. 'head', 'kneeL'). */
      this.label = "";
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
    }
    /** Computed x-velocity from Verlet positions. */
    get vx() {
      return this.x - this.prevX;
    }
    /** Computed y-velocity from Verlet positions. */
    get vy() {
      return this.y - this.prevY;
    }
    /**
     * Applies a force vector to this point.
     * Converts to acceleration using F = ma.
     */
    addForce(fx, fy) {
      this.ax += fx / this.mass;
      this.ay += fy / this.mass;
    }
    /**
     * Verlet integration step.
     * Updates position using current velocity (implicit) and accumulated
     * acceleration, then applies exponential air drag.
     */
    integrate(dt) {
      if (this.pinned) return;
      let vx = this.x - this.prevX;
      let vy = this.y - this.prevY;
      vx += this.ax * dt * dt;
      vy += this.ay * dt * dt;
      const drag = Math.exp(-AIR_DRAG_PER_SEC * dt);
      vx *= drag;
      vy *= drag;
      this.prevX = this.x;
      this.prevY = this.y;
      this.x += vx;
      this.y += vy;
      this.ax = 0;
      this.ay = 0;
    }
    /**
     * Resolves collision with a horizontal ground plane at the given y.
     * If the point is below groundY, it's pushed up and its velocity is
     * dampened. Sets `grounded = true` on contact.
     */
    collideGround(groundY) {
      if (this.pinned) return;
      if (this.y >= groundY) {
        this.y = groundY;
        const vy = this.y - this.prevY;
        this.prevY = this.y + vy * GROUND_BOUNCE;
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
    collideRect(rx, ry, rw, rh) {
      if (this.pinned) return;
      if (this.x < rx || this.x > rx + rw || this.y < ry || this.y > ry + rh) {
        return;
      }
      const dLeft = this.x - rx;
      const dRight = rx + rw - this.x;
      const dTop = this.y - ry;
      const dBottom = ry + rh - this.y;
      const minD = Math.min(dLeft, dRight, dTop, dBottom);
      if (minD === dTop) {
        this.y = ry;
        const vy = this.y - this.prevY;
        this.prevY = this.y + vy * GROUND_BOUNCE;
        const friction = Math.exp(-GROUND_FRICTION_PER_SEC * (1 / 60));
        const vx = this.x - this.prevX;
        this.prevX = this.x - vx * friction;
        this.grounded = true;
      } else if (minD === dBottom) {
        this.y = ry + rh;
        this.prevY = this.y;
      } else if (minD === dLeft) {
        this.x = rx;
        this.prevX = this.x;
      } else {
        this.x = rx + rw;
        this.prevX = this.x;
      }
    }
    /** Teleports the point instantly (resets velocity to zero). */
    teleport(x, y) {
      this.x = x;
      this.y = y;
      this.prevX = x;
      this.prevY = y;
    }
  };
  var Constraint = class {
    constructor(a, b, rest, stiffness = 1) {
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
    satisfy() {
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
  };
  var ElasticConstraint = class extends Constraint {
    constructor(a, b, rest, stiffness = 1, elasticity = 0.4, damping = 0.2, maxCorrection) {
      super(a, b, rest, stiffness);
      this.elasticity = elasticity;
      this.damping = damping;
      this.maxCorrection = maxCorrection ?? this.rest * 0.5;
    }
    /**
     * Applies both rigid constraint satisfaction and spring-damper forces.
     * The rigid part keeps the skeleton from collapsing; the elastic part
     * lets limbs flex naturally on impact and settle smoothly.
     */
    satisfy() {
      const dx = this.b.x - this.a.x;
      const dy = this.b.y - this.a.y;
      const dist = Math.hypot(dx, dy) || 1e-6;
      const stretch = dist - this.rest;
      const nx = dx / dist;
      const ny = dy / dist;
      const wA = this.a.pinned ? 0 : 1;
      const wB = this.b.pinned ? 0 : 1;
      const total = wA + wB;
      if (total === 0) return;
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
      if (this.damping > 0) {
        const relVx = this.b.x - this.b.prevX - (this.a.x - this.a.prevX);
        const relVy = this.b.y - this.b.prevY - (this.a.y - this.a.prevY);
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
  };
  var World = class {
    constructor() {
      /** All active particles. */
      this.points = [];
      /** All constraints (rigid + elastic). */
      this.constraints = [];
      /** Terrain blocks for collision. */
      this.blocks = [];
      /** Y-coordinate of the infinite ground plane. */
      this.groundY = 600;
      /** Gravity acceleration (px/s²). Override per-world if needed. */
      this.gravity = GRAVITY;
    }
    /**
     * Advances the simulation by `dt` seconds.
     * Order: gravity → integrate → collide → satisfy constraints (iterated).
     */
    step(dt) {
      const safeDt = Math.min(dt, 1 / 30);
      for (const p of this.points) {
        p.grounded = false;
        p.addForce(0, this.gravity * p.mass);
      }
      for (const p of this.points) {
        p.integrate(safeDt);
      }
      for (let i = 0; i < CONSTRAINT_ITERATIONS; i++) {
        for (const c of this.constraints) {
          c.satisfy();
        }
      }
      for (const p of this.points) {
        p.collideGround(this.groundY);
        for (const b of this.blocks) {
          p.collideRect(b.x, b.y, b.w, b.h);
        }
      }
    }
    /** Adds a point to the world and returns it. */
    addPoint(p) {
      this.points.push(p);
      return p;
    }
    /** Adds a constraint to the world and returns it. */
    addConstraint(c) {
      this.constraints.push(c);
      return c;
    }
    /** Removes a point and all constraints referencing it. */
    removePoint(p) {
      this.points = this.points.filter((pt) => pt !== p);
      this.constraints = this.constraints.filter((c) => c.a !== p && c.b !== p);
    }
  };

  // src/stickman.ts
  var SCALE = 1;
  var HEAD_RADIUS = 10 * SCALE;
  var TORSO_LENGTH = 30 * SCALE;
  var UPPER_ARM = 16 * SCALE;
  var LOWER_ARM = 14 * SCALE;
  var UPPER_LEG = 18 * SCALE;
  var LOWER_LEG = 16 * SCALE;
  var EXTREMITY_SIZE = 3 * SCALE;
  var SPINE_STIFFNESS = 1;
  var LIMB_STIFFNESS = 0.85;
  var LIMB_ELASTICITY = 0.35;
  var LIMB_DAMPING = 0.25;
  var CROSS_STIFFNESS = 0.5;
  var CROSS_ELASTICITY = 0.2;
  var CROSS_DAMPING = 0.3;
  var WALK_SPEED = 120 * SCALE;
  var JUMP_IMPULSE = -420 * SCALE;
  var STEP_DISTANCE = 24 * SCALE;
  var GAIT_PERIOD = 0.6;
  var MAX_FALL_SPEED = 600;
  var POSE_LERP = 6;
  var Stickman = class {
    constructor(x, y, isPlayer) {
      /** Direction the stickman faces: 1 = right, -1 = left. */
      this.facing = 1;
      /** Whether the auto-walk is active (stickmen auto-move forward). */
      this.walking = true;
      /** True while the stickman is in the air. */
      this.airborne = false;
      /** Gait timer — drives the walk cycle (0 → GAIT_PERIOD). */
      this.gaitTimer = 0;
      /** Health — for future combat use. */
      this.hp = 100;
      /** Whether this stickman is alive. */
      this.alive = true;
      this.isPlayer = isPlayer;
      this.pelvis = new Point(x, y);
      this.pelvis.label = "pelvis";
      this.neck = new Point(x, y - TORSO_LENGTH);
      this.neck.label = "neck";
      this.head = new Point(x, y - TORSO_LENGTH - HEAD_RADIUS);
      this.head.label = "head";
      this.elbowL = new Point(x - UPPER_ARM * 0.7, y - TORSO_LENGTH + UPPER_ARM * 0.7);
      this.elbowL.label = "elbowL";
      this.elbowR = new Point(x + UPPER_ARM * 0.7, y - TORSO_LENGTH + UPPER_ARM * 0.7);
      this.elbowR.label = "elbowR";
      this.handL = new Point(x - UPPER_ARM * 0.5, y - TORSO_LENGTH + UPPER_ARM + LOWER_ARM * 0.6);
      this.handL.label = "handL";
      this.handR = new Point(x + UPPER_ARM * 0.5, y - TORSO_LENGTH + UPPER_ARM + LOWER_ARM * 0.6);
      this.handR.label = "handR";
      this.kneeL = new Point(x - 6 * SCALE, y + UPPER_LEG * 0.9);
      this.kneeL.label = "kneeL";
      this.kneeR = new Point(x + 6 * SCALE, y + UPPER_LEG * 0.9);
      this.kneeR.label = "kneeR";
      this.footL = new Point(x - 4 * SCALE, y + UPPER_LEG + LOWER_LEG);
      this.footL.label = "footL";
      this.footR = new Point(x + 4 * SCALE, y + UPPER_LEG + LOWER_LEG);
      this.footR.label = "footR";
      this.points = [
        this.head,
        this.neck,
        this.pelvis,
        this.elbowL,
        this.elbowR,
        this.handL,
        this.handR,
        this.kneeL,
        this.kneeR,
        this.footL,
        this.footR
      ];
      this.constraints = [];
    }
    /**
     * Returns true if at least one foot is on the ground.
     */
    get onGround() {
      return this.footL.grounded || this.footR.grounded;
    }
    /**
     * Returns the approximate center-of-mass position.
     */
    get center() {
      return new Vec2(
        (this.neck.x + this.pelvis.x) / 2,
        (this.neck.y + this.pelvis.y) / 2
      );
    }
    /**
     * Updates the stickman each frame: walk cycle, posture targeting, airborne check.
     * Called BEFORE the physics world step so forces/targets are set up.
     */
    update(dt, world) {
      if (!this.alive) return;
      this.airborne = !this.onGround;
      if (this.walking && !this.airborne) {
        this.applyWalk(dt, world);
      }
      this.applyPose(dt);
      this.clampFallSpeed();
    }
    /**
     * Drives the walking gait cycle.
     * Alternates targeting left/right feet forward, letting the physics
     * engine resolve the rest naturally through constraints.
     */
    applyWalk(dt, world) {
      this.gaitTimer += dt;
      if (this.gaitTimer > GAIT_PERIOD) {
        this.gaitTimer -= GAIT_PERIOD;
      }
      const moveX = WALK_SPEED * this.facing * dt;
      this.pelvis.x += moveX * 0.5;
      this.pelvis.prevX += moveX * 0.5;
      this.neck.x += moveX * 0.5;
      this.neck.prevX += moveX * 0.5;
      const phase = this.gaitTimer / GAIT_PERIOD;
      const pelvisX = this.pelvis.x;
      const groundY = world.groundY;
      const footGroundY = this.findFootGround(world);
      if (phase < 0.5) {
        this.targetFoot(
          this.footL,
          this.kneeL,
          pelvisX + STEP_DISTANCE * this.facing,
          footGroundY,
          dt
        );
        this.plantFoot(this.footR, footGroundY, dt);
      } else {
        this.targetFoot(
          this.footR,
          this.kneeR,
          pelvisX + STEP_DISTANCE * this.facing,
          footGroundY,
          dt
        );
        this.plantFoot(this.footL, footGroundY, dt);
      }
    }
    /**
     * Finds the effective ground Y for feet at the stickman's current position.
     * Checks world ground plane and terrain blocks.
     */
    findFootGround(world) {
      let groundY = world.groundY;
      const px = this.pelvis.x;
      const py = this.pelvis.y;
      for (const b of world.blocks) {
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
    targetFoot(foot, knee, targetX, groundY, dt) {
      const lerpFactor = 1 - Math.exp(-POSE_LERP * dt);
      foot.x += (targetX - foot.x) * lerpFactor;
      foot.y += (groundY - foot.y) * lerpFactor;
      foot.prevX += (targetX - foot.prevX) * lerpFactor * 0.5;
      foot.prevY += (groundY - foot.prevY) * lerpFactor * 0.5;
    }
    /**
     * Keeps a planted foot on the ground — prevents sliding.
     */
    plantFoot(foot, groundY, dt) {
      const lerpFactor = 1 - Math.exp(-POSE_LERP * 2 * dt);
      foot.y += (groundY - foot.y) * lerpFactor;
      foot.prevY += (groundY - foot.prevY) * lerpFactor * 0.5;
    }
    /**
     * Gently pulls limbs toward their idle resting pose.
     * This prevents the ragdoll from flopping around endlessly.
     */
    applyPose(dt) {
      const lerpFactor = 1 - Math.exp(-POSE_LERP * 0.5 * dt);
      const cx = this.pelvis.x;
      const ny = this.neck.y;
      this.posePoint(
        this.elbowL,
        cx - UPPER_ARM * 0.5 * this.facing,
        ny + UPPER_ARM * 0.5,
        lerpFactor
      );
      this.posePoint(
        this.elbowR,
        cx + UPPER_ARM * 0.5 * this.facing,
        ny + UPPER_ARM * 0.5,
        lerpFactor
      );
      this.posePoint(
        this.handL,
        cx - LOWER_ARM * 0.3 * this.facing,
        ny + UPPER_ARM + LOWER_ARM * 0.4,
        lerpFactor * 0.5
      );
      this.posePoint(
        this.handR,
        cx + LOWER_ARM * 0.3 * this.facing,
        ny + UPPER_ARM + LOWER_ARM * 0.4,
        lerpFactor * 0.5
      );
    }
    /**
     * Lerps a single point toward a target position.
     * Only adjusts position, not prevPosition — so velocity is gently nudged.
     */
    posePoint(p, tx, ty, lerp) {
      if (p.pinned || p.grounded) return;
      p.x += (tx - p.x) * lerp;
      p.y += (ty - p.y) * lerp;
    }
    /**
     * Clamps the downward velocity of all points to MAX_FALL_SPEED.
     * Prevents the stickman from accelerating infinitely during long falls.
     */
    clampFallSpeed() {
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
    jump() {
      if (!this.onGround || !this.alive) return;
      for (const p of this.points) {
        p.prevY = p.y - JUMP_IMPULSE / 60;
        p.grounded = false;
      }
    }
    /**
     * Reverses the stickman's facing direction.
     */
    turnAround() {
      this.facing = this.facing === 1 ? -1 : 1;
    }
  };
  function createStickman(x, y, world, isPlayer = true) {
    const s = new Stickman(x, y, isPlayer);
    for (const p of s.points) {
      world.addPoint(p);
    }
    addRigid(s, world, s.head, s.neck, SPINE_STIFFNESS);
    addRigid(s, world, s.neck, s.pelvis, SPINE_STIFFNESS);
    addElastic(s, world, s.neck, s.elbowL, LIMB_STIFFNESS);
    addElastic(s, world, s.elbowL, s.handL, LIMB_STIFFNESS);
    addElastic(s, world, s.neck, s.elbowR, LIMB_STIFFNESS);
    addElastic(s, world, s.elbowR, s.handR, LIMB_STIFFNESS);
    addElastic(s, world, s.pelvis, s.kneeL, LIMB_STIFFNESS);
    addElastic(s, world, s.kneeL, s.footL, LIMB_STIFFNESS);
    addElastic(s, world, s.pelvis, s.kneeR, LIMB_STIFFNESS);
    addElastic(s, world, s.kneeR, s.footR, LIMB_STIFFNESS);
    addCross(s, world, s.neck, s.kneeL);
    addCross(s, world, s.neck, s.kneeR);
    addCross(s, world, s.pelvis, s.elbowL);
    addCross(s, world, s.pelvis, s.elbowR);
    addCross(s, world, s.kneeL, s.kneeR);
    addCross(s, world, s.elbowL, s.elbowR);
    addCross(s, world, s.head, s.pelvis);
    return s;
  }
  function addRigid(s, world, a, b, stiffness) {
    const c = new Constraint(a, b, void 0, stiffness);
    s.constraints.push(c);
    world.addConstraint(c);
  }
  function addElastic(s, world, a, b, stiffness) {
    const c = new ElasticConstraint(
      a,
      b,
      void 0,
      stiffness,
      LIMB_ELASTICITY,
      LIMB_DAMPING
    );
    s.constraints.push(c);
    world.addConstraint(c);
  }
  function addCross(s, world, a, b) {
    const c = new ElasticConstraint(
      a,
      b,
      void 0,
      CROSS_STIFFNESS,
      CROSS_ELASTICITY,
      CROSS_DAMPING
    );
    s.constraints.push(c);
    world.addConstraint(c);
  }

  // src/level.ts
  var TILE_SIZE = 40;
  var LEVEL_1_1 = {
    id: "1-1",
    name: "First Steps",
    mapX: 0.2,
    mapY: 0.5,
    unlocked: true,
    requires: [],
    spawnCol: 2,
    spawnRow: 13,
    tiles: [
      // 30-column layout
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............ppppp...........",
      "..............................",
      "..............................",
      "........ppppp.........pppp...",
      "..............................",
      "..............................",
      "...ppppp..........pppp.......",
      "..............................",
      "..............................",
      "..........>...................",
      "##############################"
    ]
  };
  var LEVELS = /* @__PURE__ */ new Map();
  function registerBuiltinLevels() {
    LEVELS.set(LEVEL_1_1.id, LEVEL_1_1);
  }
  registerBuiltinLevels();
  function getLevelDef(id) {
    return LEVELS.get(id);
  }
  function parseLevel(def) {
    const rows = def.tiles.length;
    const cols = def.tiles[0]?.length ?? 0;
    const blocks = [];
    for (let r = 0; r < rows; r++) {
      const row = def.tiles[r] ?? "";
      for (let c = 0; c < cols; c++) {
        const ch = row[c];
        if (ch === "#") {
          blocks.push({
            x: c * TILE_SIZE,
            y: r * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE
          });
        } else if (ch === "p") {
          blocks.push({
            x: c * TILE_SIZE,
            y: r * TILE_SIZE,
            w: TILE_SIZE,
            h: 6
          });
        }
      }
    }
    const width = cols * TILE_SIZE;
    const height = rows * TILE_SIZE;
    return {
      def,
      blocks,
      spawnX: def.spawnCol * TILE_SIZE + TILE_SIZE / 2,
      spawnY: def.spawnRow * TILE_SIZE,
      width,
      height,
      groundY: height
      // Ground at the very bottom of the level
    };
  }
  function buildWorldMap(completedIds) {
    const nodes = [];
    for (const def of LEVELS.values()) {
      const unlocked = def.unlocked || def.requires.every((req) => completedIds.has(req));
      nodes.push({
        id: def.id,
        name: def.name,
        x: def.mapX,
        y: def.mapY,
        unlocked,
        completed: completedIds.has(def.id),
        color: def.color ?? "#e94560"
      });
    }
    return nodes;
  }

  // src/input.ts
  var SWIPE_THRESHOLD = 30;
  var SWIPE_MAX_DURATION = 400;
  var state = {
    jump: false,
    swipeLeft: false,
    swipeRight: false,
    touching: false,
    touchX: 0,
    touchY: 0
  };
  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var keysDown = /* @__PURE__ */ new Set();
  var boundHandlers = [];
  function getInput() {
    return state;
  }
  function resetInput() {
    state.jump = false;
    state.swipeLeft = false;
    state.swipeRight = false;
  }
  function bindInput(canvas2) {
    unbindInput();
    addListener(canvas2, "touchstart", onTouchStart);
    addListener(canvas2, "touchmove", onTouchMove);
    addListener(canvas2, "touchend", onTouchEnd);
    addListener(canvas2, "mousedown", onMouseDown);
    addListener(canvas2, "mousemove", onMouseMove);
    addListener(window, "mouseup", onMouseUp);
    addListener(window, "keydown", onKeyDown);
    addListener(window, "keyup", onKeyUp);
  }
  function unbindInput() {
    for (const h of boundHandlers) {
      h.el.removeEventListener(h.type, h.fn);
    }
    boundHandlers = [];
    keysDown.clear();
  }
  function pollKeyboard() {
    if (keysDown.has("ArrowUp") || keysDown.has("w") || keysDown.has("W") || keysDown.has(" ")) {
      state.jump = true;
    }
    if (keysDown.has("ArrowLeft") || keysDown.has("a") || keysDown.has("A")) {
      state.swipeLeft = true;
    }
    if (keysDown.has("ArrowRight") || keysDown.has("d") || keysDown.has("D")) {
      state.swipeRight = true;
    }
  }
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
    state.touching = true;
    state.touchX = t.clientX;
    state.touchY = t.clientY;
  }
  function onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    if (!t) return;
    state.touchX = t.clientX;
    state.touchY = t.clientY;
  }
  function onTouchEnd(e) {
    e.preventDefault();
    state.touching = false;
    const elapsed = performance.now() - touchStartTime;
    if (elapsed > SWIPE_MAX_DURATION) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dy) > SWIPE_THRESHOLD && dy < 0 && Math.abs(dy) > Math.abs(dx)) {
      state.jump = true;
    } else if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        state.swipeLeft = true;
      } else {
        state.swipeRight = true;
      }
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      state.jump = true;
    }
  }
  function onMouseDown(e) {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchStartTime = performance.now();
    state.touching = true;
    state.touchX = e.clientX;
    state.touchY = e.clientY;
  }
  function onMouseMove(e) {
    if (!state.touching) return;
    state.touchX = e.clientX;
    state.touchY = e.clientY;
  }
  function onMouseUp(e) {
    state.touching = false;
    const elapsed = performance.now() - touchStartTime;
    if (elapsed > SWIPE_MAX_DURATION) return;
    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;
    if (Math.abs(dy) > SWIPE_THRESHOLD && dy < 0 && Math.abs(dy) > Math.abs(dx)) {
      state.jump = true;
    } else if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        state.swipeLeft = true;
      } else {
        state.swipeRight = true;
      }
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      state.jump = true;
    }
  }
  function onKeyDown(e) {
    keysDown.add(e.key);
  }
  function onKeyUp(e) {
    keysDown.delete(e.key);
  }
  function addListener(el, type, fn) {
    el.addEventListener(type, fn, { passive: false });
    boundHandlers.push({ el, type, fn });
  }

  // src/renderer.ts
  var COLORS = {
    bg: "#0d0d1a",
    surface: "#1a1a2e",
    primary: "#e94560",
    primaryDk: "#c73652",
    text: "#e0e0e0",
    muted: "#888888",
    block: "#2a2a4e",
    blockEdge: "#3a3a5e",
    platform: "#4a4a6e",
    ground: "#333355",
    stickman: "#e0e0e0",
    stickmanHead: "#e0e0e0",
    stickmanExtremity: "#cccccc",
    sky: "#0d0d1a",
    mapPath: "#333355",
    mapNodeLocked: "#444444",
    mapNodeUnlocked: "#e94560",
    mapNodeCompleted: "#4caf50"
  };
  var Camera = class {
    constructor() {
      /** Camera center x in world coordinates. */
      this.x = 0;
      /** Camera center y in world coordinates. */
      this.y = 0;
      /** Viewport width in pixels. */
      this.width = 800;
      /** Viewport height in pixels. */
      this.height = 600;
      /** Lerp speed for following — higher = snappier. */
      this.followSpeed = 4;
    }
    /**
     * Smoothly follows a target position.
     */
    follow(targetX, targetY, dt) {
      const lerp = 1 - Math.exp(-this.followSpeed * dt);
      this.x += (targetX - this.x) * lerp;
      this.y += (targetY - this.y) * lerp;
    }
    /**
     * Sets the viewport size (should match canvas dimensions).
     */
    resize(w, h) {
      this.width = w;
      this.height = h;
    }
    /**
     * Converts world x to screen x.
     */
    toScreenX(worldX) {
      return worldX - this.x + this.width / 2;
    }
    /**
     * Converts world y to screen y.
     */
    toScreenY(worldY) {
      return worldY - this.y + this.height / 2;
    }
    /**
     * Applies camera transform to the canvas context.
     * Call before drawing world-space objects; call ctx.restore() after.
     */
    applyTransform(ctx2) {
      ctx2.save();
      ctx2.translate(
        -this.x + this.width / 2,
        -this.y + this.height / 2
      );
    }
  };
  function clearCanvas(ctx2, w, h) {
    ctx2.fillStyle = COLORS.sky;
    ctx2.fillRect(0, 0, w, h);
  }
  function drawGround(ctx2, groundY, levelWidth) {
    ctx2.fillStyle = COLORS.ground;
    ctx2.fillRect(-500, groundY, levelWidth + 1e3, 2e3);
    ctx2.strokeStyle = COLORS.blockEdge;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(-500, groundY);
    ctx2.lineTo(levelWidth + 500, groundY);
    ctx2.stroke();
  }
  function drawBlocks(ctx2, blocks) {
    for (const b of blocks) {
      ctx2.fillStyle = b.h < TILE_SIZE ? COLORS.platform : COLORS.block;
      ctx2.fillRect(b.x, b.y, b.w, b.h);
      ctx2.strokeStyle = COLORS.blockEdge;
      ctx2.lineWidth = 1;
      ctx2.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    }
  }
  function drawStickman(ctx2, s) {
    if (!s.alive) return;
    ctx2.strokeStyle = COLORS.stickman;
    ctx2.lineWidth = 2.5;
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    ctx2.fillStyle = COLORS.stickmanHead;
    ctx2.beginPath();
    ctx2.arc(s.head.x, s.head.y, HEAD_RADIUS, 0, Math.PI * 2);
    ctx2.fill();
    drawLine(ctx2, s.neck.x, s.neck.y, s.pelvis.x, s.pelvis.y);
    drawLine(ctx2, s.neck.x, s.neck.y, s.elbowL.x, s.elbowL.y);
    drawLine(ctx2, s.elbowL.x, s.elbowL.y, s.handL.x, s.handL.y);
    drawLine(ctx2, s.neck.x, s.neck.y, s.elbowR.x, s.elbowR.y);
    drawLine(ctx2, s.elbowR.x, s.elbowR.y, s.handR.x, s.handR.y);
    drawLine(ctx2, s.pelvis.x, s.pelvis.y, s.kneeL.x, s.kneeL.y);
    drawLine(ctx2, s.kneeL.x, s.kneeL.y, s.footL.x, s.footL.y);
    drawLine(ctx2, s.pelvis.x, s.pelvis.y, s.kneeR.x, s.kneeR.y);
    drawLine(ctx2, s.kneeR.x, s.kneeR.y, s.footR.x, s.footR.y);
    ctx2.fillStyle = COLORS.stickmanExtremity;
    drawSquare(ctx2, s.handL.x, s.handL.y, EXTREMITY_SIZE);
    drawSquare(ctx2, s.handR.x, s.handR.y, EXTREMITY_SIZE);
    drawSquare(ctx2, s.footL.x, s.footL.y, EXTREMITY_SIZE);
    drawSquare(ctx2, s.footR.x, s.footR.y, EXTREMITY_SIZE);
    ctx2.fillStyle = COLORS.stickman;
    drawDot(ctx2, s.elbowL.x, s.elbowL.y, 2);
    drawDot(ctx2, s.elbowR.x, s.elbowR.y, 2);
    drawDot(ctx2, s.kneeL.x, s.kneeL.y, 2);
    drawDot(ctx2, s.kneeR.x, s.kneeR.y, 2);
  }
  function drawWorldMap(ctx2, nodes, screenW, screenH, selectedId) {
    ctx2.fillStyle = COLORS.bg;
    ctx2.fillRect(0, 0, screenW, screenH);
    ctx2.fillStyle = COLORS.primary;
    ctx2.font = "bold 32px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "top";
    ctx2.fillText("World Map", screenW / 2, 30);
    if (nodes.length === 0) return;
    const padX = 80;
    const padY = 100;
    const mapW = screenW - padX * 2;
    const mapH = screenH - padY * 2;
    const screenNodes = nodes.map((n) => ({
      ...n,
      sx: padX + n.x * mapW,
      sy: padY + n.y * mapH
    }));
    ctx2.strokeStyle = COLORS.mapPath;
    ctx2.lineWidth = 3;
    ctx2.setLineDash([6, 4]);
    for (let i = 1; i < screenNodes.length; i++) {
      const prev = screenNodes[i - 1];
      const curr = screenNodes[i];
      ctx2.beginPath();
      ctx2.moveTo(prev.sx, prev.sy);
      ctx2.lineTo(curr.sx, curr.sy);
      ctx2.stroke();
    }
    ctx2.setLineDash([]);
    const nodeRadius = 18;
    for (const n of screenNodes) {
      let fillColor = COLORS.mapNodeLocked;
      if (n.completed) fillColor = COLORS.mapNodeCompleted;
      else if (n.unlocked) fillColor = n.color;
      ctx2.fillStyle = fillColor;
      ctx2.beginPath();
      ctx2.arc(n.sx, n.sy, nodeRadius, 0, Math.PI * 2);
      ctx2.fill();
      if (n.id === selectedId) {
        ctx2.strokeStyle = "#ffffff";
        ctx2.lineWidth = 3;
        ctx2.beginPath();
        ctx2.arc(n.sx, n.sy, nodeRadius + 4, 0, Math.PI * 2);
        ctx2.stroke();
      }
      ctx2.strokeStyle = n.unlocked ? "#ffffff44" : "#ffffff22";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(n.sx, n.sy, nodeRadius, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = n.unlocked ? COLORS.text : COLORS.muted;
      ctx2.font = "13px sans-serif";
      ctx2.textAlign = "center";
      ctx2.textBaseline = "top";
      ctx2.fillText(n.name, n.sx, n.sy + nodeRadius + 8);
      ctx2.fillStyle = COLORS.muted;
      ctx2.font = "bold 11px sans-serif";
      ctx2.textBaseline = "bottom";
      ctx2.fillText(n.id, n.sx, n.sy - nodeRadius - 4);
      if (!n.unlocked) {
        ctx2.fillStyle = COLORS.muted;
        ctx2.font = "14px sans-serif";
        ctx2.textAlign = "center";
        ctx2.textBaseline = "middle";
        ctx2.fillText("\u{1F512}", n.sx, n.sy);
      }
    }
    ctx2.fillStyle = COLORS.muted;
    ctx2.font = "14px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "bottom";
    ctx2.fillText(
      "Tap a level to play  \u2022  Swipe up or press Space to start",
      screenW / 2,
      screenH - 20
    );
  }
  function drawLine(ctx2, x1, y1, x2, y2) {
    ctx2.beginPath();
    ctx2.moveTo(x1, y1);
    ctx2.lineTo(x2, y2);
    ctx2.stroke();
  }
  function drawSquare(ctx2, x, y, halfSize) {
    ctx2.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
  }
  function drawDot(ctx2, x, y, r) {
    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, Math.PI * 2);
    ctx2.fill();
  }

  // src/game.ts
  var GAME_SCENE_ID = "scene-game";
  var canvas = null;
  var ctx = null;
  var rafId = null;
  var subState = "map";
  var mapNodes = [];
  var selectedMapId = "1-1";
  var physicsWorld = null;
  var playerStick = null;
  var levelInstance = null;
  var camera = null;
  var onBackCallback = null;
  function initGame(onBack) {
    const scene = document.getElementById(GAME_SCENE_ID);
    if (!scene) {
      console.error("[game] Scene element not found:", GAME_SCENE_ID);
      return;
    }
    scene.classList.remove("hidden");
    canvas = document.getElementById("game-canvas");
    if (!canvas) {
      console.error("[game] Canvas element not found: #game-canvas");
      return;
    }
    ctx = canvas.getContext("2d");
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    bindInput(canvas);
    onBackCallback = onBack;
    const backBtn = document.getElementById("btn-back-to-menu");
    backBtn?.addEventListener("click", handleBack);
    enterMap();
    startRenderLoop();
  }
  function stopGame() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    unbindInput();
    window.removeEventListener("resize", resizeCanvas);
    physicsWorld = null;
    playerStick = null;
    levelInstance = null;
    camera = null;
    const scene = document.getElementById(GAME_SCENE_ID);
    scene?.classList.add("hidden");
  }
  function enterMap() {
    subState = "map";
    physicsWorld = null;
    playerStick = null;
    levelInstance = null;
    const save = loadSave();
    const completed = new Set(save?.completedLevels ?? []);
    mapNodes = buildWorldMap(completed);
    selectedMapId = mapNodes[0]?.id ?? null;
  }
  function enterLevel(levelId) {
    const def = getLevelDef(levelId);
    if (!def) {
      console.warn("[game] Level not found:", levelId);
      return;
    }
    const instance = parseLevel(def);
    levelInstance = instance;
    const world = new World();
    world.groundY = instance.groundY;
    world.blocks = instance.blocks;
    physicsWorld = world;
    playerStick = createStickman(
      instance.spawnX,
      instance.spawnY,
      world,
      true
    );
    camera = new Camera();
    camera.resize(canvas?.width ?? 800, canvas?.height ?? 600);
    camera.x = instance.spawnX;
    camera.y = instance.spawnY - 100;
    subState = "play";
  }
  function handleBack() {
    if (subState === "play") {
      enterMap();
    } else {
      stopGame();
      onBackCallback?.();
    }
  }
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera?.resize(canvas.width, canvas.height);
  }
  function startRenderLoop() {
    let lastTime = performance.now();
    function loop(now) {
      const dt = Math.min((now - lastTime) / 1e3, 1 / 30);
      lastTime = now;
      resetInput();
      pollKeyboard();
      if (subState === "map") {
        updateMap(dt);
        drawMapFrame();
      } else {
        updatePlay(dt);
        drawPlayFrame(dt);
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }
  function updateMap(_dt) {
    const input = getInput();
    if (input.jump && selectedMapId) {
      const node = mapNodes.find((n) => n.id === selectedMapId);
      if (node?.unlocked) {
        enterLevel(selectedMapId);
      }
    }
  }
  function drawMapFrame() {
    if (!ctx || !canvas) return;
    drawWorldMap(ctx, mapNodes, canvas.width, canvas.height, selectedMapId);
  }
  function updatePlay(dt) {
    if (!physicsWorld || !playerStick) return;
    const input = getInput();
    if (input.jump) {
      playerStick.jump();
    }
    if (input.swipeLeft && playerStick.facing === 1) {
      playerStick.turnAround();
    } else if (input.swipeRight && playerStick.facing === -1) {
      playerStick.turnAround();
    }
    playerStick.update(dt, physicsWorld);
    physicsWorld.step(dt);
    if (camera) {
      const center = playerStick.center;
      camera.follow(center.x, center.y - 60, dt);
    }
  }
  function drawPlayFrame(_dt) {
    if (!ctx || !canvas || !camera || !levelInstance || !playerStick) return;
    clearCanvas(ctx, canvas.width, canvas.height);
    camera.applyTransform(ctx);
    drawGround(ctx, levelInstance.groundY, levelInstance.width);
    drawBlocks(ctx, levelInstance.blocks);
    drawStickman(ctx, playerStick);
    ctx.restore();
    ctx.fillStyle = "#888";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `Level ${levelInstance.def.id}: ${levelInstance.def.name}`,
      60,
      12
    );
  }

  // src/main.ts
  var currentState = "menu";
  document.addEventListener("DOMContentLoaded", () => {
    ensureSaveExists();
    transitionTo("menu");
  });
  function transitionTo(next) {
    switch (currentState) {
      case "menu":
        break;
      case "game":
        stopGame();
        break;
      case "settings":
        break;
    }
    currentState = next;
    switch (next) {
      case "menu":
        initMenu({
          onStartGame: () => transitionTo("game"),
          onSettings: () => openSettingsStub()
        });
        break;
      case "game":
        initGame(() => transitionTo("menu"));
        break;
      case "settings":
        break;
    }
  }
  function ensureSaveExists() {
    const existing = loadSave();
    if (!existing) {
      persistSave(createDefaultSave());
    }
  }
  function openSettingsStub() {
    alert("Settings coming soon!");
  }
})();
//# sourceMappingURL=bundle.js.map
