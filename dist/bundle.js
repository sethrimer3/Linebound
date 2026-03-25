"use strict";
(() => {
  // src/upgrades.ts
  var BASE_XP = 100;
  var LEVEL_XP_FACTOR = 1.1;
  var BASE_MAX_HP = 100;
  var BASE_ATTACK_MULT = 1;
  var STAT_LEVEL_FACTOR = 1.1;
  var SKILL_POINT_FACTOR = 1.1;
  var SKILL_POINTS_PER_LEVEL = 2;
  function xpForLevel(level) {
    return Math.round(BASE_XP * Math.pow(LEVEL_XP_FACTOR, level - 1));
  }
  function createDefaultStats() {
    return {
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(1),
      skillPoints: 0,
      skills: { health: 0, attack: 0, defense: 0 }
    };
  }
  function computeEffectiveStats(stats) {
    const levelMult = Math.pow(STAT_LEVEL_FACTOR, stats.level - 1);
    return {
      maxHp: Math.round(
        BASE_MAX_HP * levelMult * Math.pow(SKILL_POINT_FACTOR, stats.skills.health)
      ),
      attackMult: parseFloat(
        (BASE_ATTACK_MULT * levelMult * Math.pow(SKILL_POINT_FACTOR, stats.skills.attack)).toFixed(2)
      ),
      // Defense: 2 flat reduction per invested point, also scaled by level
      defense: Math.round(stats.skills.defense * 2 * levelMult)
    };
  }
  function addXp(stats, amount) {
    if (amount <= 0) return 0;
    stats.xp += amount;
    let levelsGained = 0;
    while (stats.xp >= stats.xpToNext) {
      stats.xp -= stats.xpToNext;
      stats.level += 1;
      stats.skillPoints += SKILL_POINTS_PER_LEVEL;
      stats.xpToNext = xpForLevel(stats.level);
      levelsGained += 1;
    }
    return levelsGained;
  }
  function spendSkillPoint(stats, stat) {
    if (stats.skillPoints <= 0) return false;
    stats.skillPoints -= 1;
    stats.skills[stat] += 1;
    return true;
  }
  function resetSkills(stats) {
    const spent = stats.skills.health + stats.skills.attack + stats.skills.defense;
    stats.skills = { health: 0, attack: 0, defense: 0 };
    stats.skillPoints += spent;
  }

  // src/save.ts
  var SAVE_KEY = "linebound_save";
  var SAVE_VERSION = 2;
  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      playerName: "Player",
      completedLevels: [],
      playerStats: createDefaultStats()
    };
  }
  function loadSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.version !== "number") return null;
      if (!parsed.playerStats) {
        parsed.playerStats = createDefaultStats();
      }
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
  var HEAD_BUOYANCY_FORCE = GRAVITY * 1.5;
  var FOOT_EXTRA_FORCE = GRAVITY * 0.6;
  var CROUCH_FORCE = 900;
  var PUNCH_IMPULSE = 320;
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
      /** Currently equipped weapon, or null for unarmed. */
      this.weapon = null;
      /** Cooldown timer in seconds remaining before the next attack is allowed. */
      this.attackCooldown = 0;
      /** True while the player is holding the crouch key. */
      this.crouching = false;
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
      if (this.attackCooldown > 0) {
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      }
      this.airborne = !this.onGround;
      if (this.walking && !this.airborne) {
        this.applyWalk(dt, world);
      }
      this.applyPose(dt);
      this.head.addForce(0, -HEAD_BUOYANCY_FORCE);
      this.footL.addForce(0, FOOT_EXTRA_FORCE);
      this.footR.addForce(0, FOOT_EXTRA_FORCE);
      if (this.crouching) {
        this.applyCrouch();
      }
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
     * Applies crouch forces: pulls the neck downward toward the pelvis
     * and lets the knees bend naturally from the constraint response.
     * Called each frame that `crouching` is true.
     */
    applyCrouch() {
      this.neck.addForce(0, CROUCH_FORCE);
      this.kneeL.addForce(0, CROUCH_FORCE * 0.4);
      this.kneeR.addForce(0, CROUCH_FORCE * 0.4);
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
    /**
     * Equips a weapon (or removes the current one when null is passed).
     * Safe to call mid-game; the renderer will pick up the change on the
     * next frame.
     *
     * @param weapon - The WeaponDef to equip, or null to go unarmed.
     */
    equipWeapon(weapon) {
      this.weapon = weapon;
      this.attackCooldown = 0;
    }
    /**
     * Launches a punch toward a world-space target position.
     * Applies a velocity impulse to the leading hand (and elbow) in the
     * direction from the stickman's center toward the target.
     * The elastic constraints on the arm will pull the hand back naturally.
     *
     * @param targetX - World X of the punch target (e.g. mouse world position)
     * @param targetY - World Y of the punch target
     * @param dt      - Frame delta time in seconds (for frame-rate-independent velocity)
     */
    punch(targetX, targetY, dt) {
      if (!this.alive) return;
      const cx = (this.pelvis.x + this.neck.x) / 2;
      const cy = (this.pelvis.y + this.neck.y) / 2;
      const dx = targetX - cx;
      const dy = targetY - cy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const punchHand = this.facing === 1 ? this.handR : this.handL;
      const punchElbow = this.facing === 1 ? this.elbowR : this.elbowL;
      const v = PUNCH_IMPULSE * dt;
      punchHand.prevX = punchHand.x - nx * v;
      punchHand.prevY = punchHand.y - ny * v;
      punchElbow.prevX = punchElbow.x - nx * v * 0.5;
      punchElbow.prevY = punchElbow.y - ny * v * 0.5;
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

  // src/weapons.ts
  var WEAPON_REGISTRY = {
    // ---- Sword ---------------------------------------------------------------
    // Classic one-handed melee weapon: moderate range, quick cooldown.
    // The baseline starter weapon found in level 1-1.
    sword: {
      id: "sword",
      name: "Sword",
      kind: "melee",
      grip: "oneHand",
      range: 42,
      arc: 1,
      dmg: 2,
      cooldown: 550,
      swingDuration: 220,
      knock: 160,
      color: "#d0d0ff",
      highlightColor: "#ffffff",
      bladeLength: 36
    },
    // ---- Dagger --------------------------------------------------------------
    // Short, fast weapon: half the range of a sword but nearly double the
    // attack rate. Great for quick enemies in tight corridors.
    dagger: {
      id: "dagger",
      name: "Dagger",
      kind: "melee",
      grip: "oneHand",
      range: 28,
      arc: 0.8,
      dmg: 1,
      cooldown: 320,
      swingDuration: 140,
      knock: 90,
      color: "#ffd36b",
      highlightColor: "#fff5cc",
      bladeLength: 22
    },
    // ---- Greatsword ----------------------------------------------------------
    // Slow two-hander with a wide sweeping arc. High damage and knockback
    // but the long cooldown leaves the wielder briefly vulnerable.
    greatsword: {
      id: "greatsword",
      name: "Greatsword",
      kind: "melee",
      grip: "twoHand",
      range: 64,
      arc: 1.2,
      dmg: 4,
      cooldown: 820,
      swingDuration: 320,
      knock: 260,
      color: "#a3d8ff",
      highlightColor: "#dff0ff",
      bladeLength: 56
    },
    // ---- Bow -----------------------------------------------------------------
    // Ranged weapon that fires a projectile in the stickman's facing direction.
    // `range` here represents projectile launch speed (px/s).
    // Wide arc is unused for ranged weapons.
    bow: {
      id: "bow",
      name: "Bow",
      kind: "ranged",
      grip: "twoHand",
      range: 520,
      // projectile speed px/s
      arc: 0.05,
      // slight spread
      dmg: 3,
      cooldown: 700,
      swingDuration: 0,
      // no swing animation for ranged
      knock: 120,
      color: "#8b6914",
      highlightColor: "#c8a84b",
      bladeLength: 28
      // visual arrow length
    }
  };
  function getWeaponDef(id) {
    return WEAPON_REGISTRY[id];
  }

  // src/level.ts
  var TILE_SIZE = 40;
  var LEVEL_1_1 = {
    id: "1-1",
    name: "First Steps",
    mapX: 0.08,
    mapY: 0.28,
    unlocked: true,
    requires: [],
    spawnCol: 2,
    spawnRow: 13,
    xpReward: 80,
    tiles: [
      // 30-column layout — meadow biome
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............................",
      "..............ppppp...........",
      "..............................",
      "..............................",
      "........ppppp.........pppp....",
      "..............................",
      "......@.......................",
      "...ppppp..........pppp........",
      "..............................",
      "..............................",
      "...................>..........",
      "##############################"
    ]
  };
  var LEVEL_1_2 = {
    id: "1-2",
    name: "Stone Bridge",
    mapX: 0.2,
    mapY: 0.52,
    unlocked: false,
    requires: ["1-1"],
    spawnCol: 1,
    spawnRow: 13,
    color: "#7a9abf",
    xpReward: 100,
    tiles: [
      // 36-column layout — stone/grey biome
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "............pppppppp................",
      "....................................",
      "............@.......................",
      "....ppppp..........ppppp............",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "........>...........................",
      "########......####......############"
    ]
  };
  var LEVEL_1_3 = {
    id: "1-3",
    name: "Underground Cave",
    mapX: 0.08,
    mapY: 0.72,
    unlocked: false,
    requires: ["1-2"],
    color: "#5a4a7a",
    spawnCol: 1,
    spawnRow: 14,
    xpReward: 120,
    tiles: [
      // 32-column layout — underground/cave biome
      "################################",
      "################################",
      "################################",
      "#############################..#",
      "######################.......##.",
      "#################..........###..",
      "###########..............####...",
      "#######....................###..",
      "###.........................##..",
      "#....@......................##..",
      "#.......................>....##.",
      "#...........................###.",
      "#.........................#####.",
      "##.....................#######..",
      "##.......................######.",
      "##########################...##.",
      "################################",
      "################################"
    ]
  };
  var LEVEL_2_1 = {
    id: "2-1",
    name: "Grasslands",
    mapX: 0.38,
    mapY: 0.28,
    unlocked: false,
    requires: ["1-3"],
    color: "#4caf50",
    spawnCol: 1,
    spawnRow: 15,
    xpReward: 150,
    tiles: [
      // 50-column layout — bright meadow/grasslands biome
      "..................................................",
      "..................................................",
      "..................................................",
      "..................................................",
      "...........................pppppp.................",
      "..................................................",
      "..................................................",
      ".......pppppp...............................ppppp.",
      "..................................................",
      "..................................................",
      "...ppppp.........ppppp......pppppp................",
      "..................................................",
      ".....@..........W.......................W.........",
      "...ppppp.........ppppp......pppppp................",
      "..................................................",
      "..................................................",
      ".......................................>..........",
      "##################################################"
    ]
  };
  var LEVEL_2_2 = {
    id: "2-2",
    name: "Lava Passage",
    mapX: 0.5,
    mapY: 0.52,
    unlocked: false,
    requires: ["2-1"],
    color: "#e8622a",
    spawnCol: 1,
    spawnRow: 12,
    xpReward: 180,
    tiles: [
      // 40-column layout — volcanic/lava biome
      "........................................",
      "........................................",
      "........................................",
      "..............ppppp.....................",
      "........................................",
      "..........G...................D.........",
      "....ppppp...........pppppp..............",
      "........................................",
      "........................................",
      "........................................",
      "....................pppppp..............",
      "........................................",
      "........................................",
      ".................................>......",
      "################.......#################",
      "################.......#################",
      "################.......#################"
    ]
  };
  var LEVEL_2_3 = {
    id: "2-3",
    name: "Cloud Crossing",
    mapX: 0.38,
    mapY: 0.72,
    unlocked: false,
    requires: ["2-2"],
    color: "#64b5f6",
    spawnCol: 1,
    spawnRow: 13,
    xpReward: 210,
    tiles: [
      // 44-column layout — sky/cloud biome
      "............................................",
      "............................................",
      "............................................",
      "...............ppppppp......................",
      "............................................",
      ".....ppppp........................pppp......",
      "............................................",
      "..............pppppp.........ppppppp........",
      "............................................",
      ".....@..................................W...",
      "....ppppp.......ppppppp.................ppp.",
      "............................................",
      "............................................",
      "............................................",
      "................................>...........",
      "############.....############.....##########",
      "############.....############.....##########",
      "############.....############.....##########"
    ]
  };
  var LEVEL_3_1 = {
    id: "3-1",
    name: "Desert Mesa",
    mapX: 0.68,
    mapY: 0.28,
    unlocked: false,
    requires: ["2-3"],
    color: "#d4a84b",
    spawnCol: 1,
    spawnRow: 12,
    xpReward: 250,
    tiles: [
      // 46-column layout — desert/sandy biome with mesa formations
      "..............................................",
      "..............................................",
      "######..............######..............######",
      "######..............######..............######",
      "######..............######..............######",
      "..............................................",
      "..............................................",
      "......ppppp...................ppppp...........",
      ".........G.....................D..............",
      "....ppppp...........ppppppp...........pppp....",
      "..............................................",
      "..............................................",
      "..............................................",
      "..............................................",
      "........................................>.....",
      "##############################################",
      "##############################################"
    ]
  };
  var LEVEL_3_2 = {
    id: "3-2",
    name: "Sand Drifts",
    mapX: 0.8,
    mapY: 0.52,
    unlocked: false,
    requires: ["3-1"],
    color: "#c19a6b",
    spawnCol: 1,
    spawnRow: 12,
    xpReward: 290,
    tiles: [
      // 48-column layout — sandy desert with dune formations
      "................................................",
      "................................................",
      "...ppppp..........ppppp..........ppppp..........",
      "................................................",
      ".....G.........................D.........W......",
      "...ppppp.......ppppp..........ppppp.........pppp",
      "................................................",
      "................................................",
      "................................................",
      "........pppppp.....................pppppp.......",
      "................................................",
      "................................................",
      "................................................",
      "................................................",
      "........................................>.......",
      "####################.......#####################",
      "####################.......#####################",
      "####################.......#####################"
    ]
  };
  var LEVEL_3_3 = {
    id: "3-3",
    name: "Ancient Sanctum",
    mapX: 0.68,
    mapY: 0.72,
    unlocked: false,
    requires: ["3-2"],
    color: "#ffd700",
    spawnCol: 1,
    spawnRow: 16,
    xpReward: 350,
    tiles: [
      // 52-column layout — ancient temple biome (final level)
      "....................................................",
      "....................................................",
      "......ppppp...........ppppp...........ppppp.........",
      "....................................................",
      "....................................................",
      "..........pppppppp..........pppppppp................",
      "....................................................",
      ".....G.........................D.............G......",
      ".ppppp.....pppppppp.....pppppppp.....ppppppp........",
      "....................................................",
      "....................................................",
      "....................................................",
      "....................................................",
      "..........................pppppppp..................",
      "....................................................",
      "....................................................",
      "....................................................",
      "....................................................",
      "..........................................>.........",
      "##################.......###########################"
    ]
  };
  var LEVELS = /* @__PURE__ */ new Map();
  function registerBuiltinLevels() {
    LEVELS.set(LEVEL_1_1.id, LEVEL_1_1);
    LEVELS.set(LEVEL_1_2.id, LEVEL_1_2);
    LEVELS.set(LEVEL_1_3.id, LEVEL_1_3);
    LEVELS.set(LEVEL_2_1.id, LEVEL_2_1);
    LEVELS.set(LEVEL_2_2.id, LEVEL_2_2);
    LEVELS.set(LEVEL_2_3.id, LEVEL_2_3);
    LEVELS.set(LEVEL_3_1.id, LEVEL_3_1);
    LEVELS.set(LEVEL_3_2.id, LEVEL_3_2);
    LEVELS.set(LEVEL_3_3.id, LEVEL_3_3);
  }
  registerBuiltinLevels();
  function getLevelDef(id) {
    return LEVELS.get(id);
  }
  var WEAPON_TILE_MAP = {
    "@": "sword",
    // Generic weapon pickup — grants a sword
    "S": "sword",
    // Sword pedestal
    "D": "dagger",
    // Dagger pedestal
    "G": "greatsword",
    // Greatsword pedestal
    "W": "bow"
    // Bow pedestal
  };
  function parseLevel(def) {
    const rows = def.tiles.length;
    const cols = def.tiles[0]?.length ?? 0;
    const blocks = [];
    const weaponPickups = [];
    let exitX;
    let exitY;
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
        } else if (ch === ">") {
          exitX = c * TILE_SIZE + TILE_SIZE / 2;
          exitY = r * TILE_SIZE + TILE_SIZE / 2;
        } else if (ch && ch in WEAPON_TILE_MAP) {
          const weaponId = WEAPON_TILE_MAP[ch];
          const weapon = getWeaponDef(weaponId);
          if (weapon) {
            weaponPickups.push({
              x: c * TILE_SIZE + TILE_SIZE / 2,
              y: r * TILE_SIZE + TILE_SIZE / 2,
              weapon,
              collected: false
            });
          }
        }
      }
    }
    const width = cols * TILE_SIZE;
    const height = rows * TILE_SIZE;
    return {
      def,
      blocks,
      weaponPickups,
      spawnX: def.spawnCol * TILE_SIZE + TILE_SIZE / 2,
      spawnY: def.spawnRow * TILE_SIZE,
      width,
      height,
      groundY: height,
      // Ground at the very bottom of the level
      exitX,
      exitY
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
        color: def.color ?? "#e94560",
        // Connections link each node back to its prerequisite levels;
        // used by the renderer to draw path lines on the world map.
        connections: def.requires
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
    touchY: 0,
    crouch: false,
    punch: false,
    mouseX: 0,
    mouseY: 0,
    skill1: false,
    skill2: false,
    skill3: false,
    respec: false
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
    state.punch = false;
    state.crouch = false;
    state.skill1 = false;
    state.skill2 = false;
    state.skill3 = false;
    state.respec = false;
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
    if (keysDown.has("ArrowDown") || keysDown.has("s") || keysDown.has("S")) {
      state.crouch = true;
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
    state.touching = true;
    state.touchX = e.clientX;
    state.touchY = e.clientY;
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.punch = true;
  }
  function onMouseMove(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (state.touching) {
      state.touchX = e.clientX;
      state.touchY = e.clientY;
    }
  }
  function onMouseUp(_e) {
    state.touching = false;
  }
  function onKeyDown(e) {
    keysDown.add(e.key);
    if (e.key === "1") state.skill1 = true;
    if (e.key === "2") state.skill2 = true;
    if (e.key === "3") state.skill3 = true;
    if (e.key === "r" || e.key === "R") state.respec = true;
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
    // Underground blocks — dark earth fill
    block: "#2d1f12",
    blockEdge: "#3d2a18",
    // Surface blocks — slightly lighter brown dirt with grass on top
    blockSurface: "#3a2410",
    blockSurfaceEdge: "#4a3020",
    // Grass strip on exposed block tops
    grass: "#3a8c30",
    grassHighlight: "#52c444",
    // Thin platform color
    platform: "#4a4a6e",
    ground: "#333355",
    stickman: "#e0e0e0",
    stickmanHead: "#e0e0e0",
    stickmanExtremity: "#cccccc",
    sky: "#0d0d1a",
    mapPath: "#333355",
    mapNodeLocked: "#444444",
    mapNodeUnlocked: "#e94560",
    mapNodeCompleted: "#4caf50",
    // Weapon pickup glow
    pickupGlow: "rgba(255, 220, 80, 0.55)",
    pickupIcon: "#ffe066"
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
  function buildOccupiedSet(blocks) {
    const occupied = /* @__PURE__ */ new Set();
    for (const b of blocks) {
      if (b.h >= TILE_SIZE / 2) {
        occupied.add(`${b.x},${b.y}`);
      }
    }
    return occupied;
  }
  function drawBlocks(ctx2, blocks) {
    const occupied = buildOccupiedSet(blocks);
    for (const b of blocks) {
      const isPlatform = b.h < TILE_SIZE / 2;
      if (isPlatform) {
        ctx2.fillStyle = COLORS.platform;
        ctx2.fillRect(b.x, b.y, b.w, b.h);
        ctx2.strokeStyle = COLORS.blockEdge;
        ctx2.lineWidth = 1;
        ctx2.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        continue;
      }
      const aboveKey = `${b.x},${b.y - TILE_SIZE}`;
      const isExposed = !occupied.has(aboveKey);
      ctx2.fillStyle = isExposed ? COLORS.blockSurface : COLORS.block;
      ctx2.fillRect(b.x, b.y, b.w, b.h);
      ctx2.strokeStyle = isExposed ? COLORS.blockSurfaceEdge : COLORS.blockEdge;
      ctx2.lineWidth = 1;
      ctx2.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      if (isExposed) {
        drawGrassTop(ctx2, b.x, b.y, b.w);
      }
    }
  }
  var BLADE_SPACING = 5;
  var BLADE_WIDTH = 2;
  var BLADE_HEIGHT_SHORT = 3;
  var BLADE_HEIGHT_TALL = 5;
  function drawGrassTop(ctx2, bx, by, bw) {
    ctx2.fillStyle = COLORS.grass;
    ctx2.fillRect(bx, by, bw, 3);
    ctx2.fillStyle = COLORS.grassHighlight;
    ctx2.fillRect(bx, by, bw, 2);
    ctx2.fillStyle = COLORS.grass;
    for (let bx2 = bx + 2; bx2 < bx + bw - 2; bx2 += BLADE_SPACING) {
      const bladeH = Math.floor((bx2 - bx) / BLADE_SPACING) % 3 === 0 ? BLADE_HEIGHT_TALL : BLADE_HEIGHT_SHORT;
      ctx2.fillRect(bx2, by - bladeH + 2, BLADE_WIDTH, bladeH);
    }
  }
  function drawWeaponPickups(ctx2, pickups, time) {
    for (const p of pickups) {
      if (p.collected) continue;
      const floatY = p.y - 18 + Math.sin(time * Math.PI) * 3;
      const alpha = 0.35 + 0.2 * Math.sin(time * 2 * Math.PI);
      ctx2.save();
      ctx2.globalAlpha = alpha;
      ctx2.fillStyle = COLORS.pickupGlow;
      ctx2.beginPath();
      ctx2.arc(p.x, floatY, 14, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.restore();
      ctx2.save();
      ctx2.translate(p.x, floatY);
      drawWeaponIcon(ctx2, p.weapon);
      ctx2.restore();
      ctx2.fillStyle = COLORS.pickupIcon;
      ctx2.font = "bold 9px sans-serif";
      ctx2.textAlign = "center";
      ctx2.textBaseline = "top";
      ctx2.fillText(p.weapon.name, p.x, floatY + 14);
    }
  }
  function drawWeaponIcon(ctx2, weapon) {
    const color = weapon.color;
    const len = (weapon.bladeLength ?? 28) * 0.4;
    ctx2.strokeStyle = color;
    ctx2.fillStyle = color;
    ctx2.lineWidth = 2;
    ctx2.lineCap = "round";
    if (weapon.kind === "ranged") {
      ctx2.beginPath();
      ctx2.arc(0, 0, len * 0.8, -Math.PI * 0.6, Math.PI * 0.6);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(0, -len * 0.7);
      ctx2.lineTo(0, len * 0.7);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-len * 0.5, 0);
      ctx2.lineTo(len * 0.6, 0);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(len * 0.6, 0);
      ctx2.lineTo(len * 0.35, -4);
      ctx2.lineTo(len * 0.35, 4);
      ctx2.closePath();
      ctx2.fill();
    } else {
      ctx2.beginPath();
      ctx2.moveTo(0, len * 0.9);
      ctx2.lineTo(0, -len * 0.3);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-2, -len * 0.3);
      ctx2.lineTo(0, -len * 0.9);
      ctx2.lineTo(2, -len * 0.3);
      ctx2.closePath();
      ctx2.fill();
      ctx2.beginPath();
      ctx2.moveTo(-len * 0.5, len * 0.35);
      ctx2.lineTo(len * 0.5, len * 0.35);
      ctx2.stroke();
      ctx2.lineWidth = 3;
      ctx2.strokeStyle = "#7a5a30";
      ctx2.beginPath();
      ctx2.moveTo(0, len * 0.35);
      ctx2.lineTo(0, len * 0.9);
      ctx2.stroke();
    }
  }
  function drawExitMarker(ctx2, x, y, time) {
    const pulse = 0.55 + 0.25 * Math.sin(time * 2 * Math.PI);
    const w = 22;
    const h = 34;
    ctx2.save();
    ctx2.globalAlpha = pulse * 0.4;
    const grad = ctx2.createRadialGradient(x, y - h / 2, 4, x, y - h / 2, 32);
    grad.addColorStop(0, "#4cff96");
    grad.addColorStop(1, "rgba(76, 255, 150, 0)");
    ctx2.fillStyle = grad;
    ctx2.beginPath();
    ctx2.arc(x, y - h / 2, 32, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.restore();
    ctx2.fillStyle = "#5a7a60";
    ctx2.fillRect(x - w / 2 - 4, y - h, 5, h);
    ctx2.fillRect(x + w / 2 - 1, y - h, 5, h);
    ctx2.strokeStyle = "#5a7a60";
    ctx2.lineWidth = 4;
    ctx2.beginPath();
    ctx2.arc(x + 1.5, y - h, w / 2 + 2, Math.PI, 0);
    ctx2.stroke();
    ctx2.save();
    ctx2.globalAlpha = pulse;
    ctx2.fillStyle = "#1e4d2e";
    ctx2.fillRect(x - w / 2, y - h, w, h);
    const innerGrad = ctx2.createLinearGradient(x, y - h, x, y);
    innerGrad.addColorStop(0, "rgba(76, 255, 120, 0.6)");
    innerGrad.addColorStop(1, "rgba(76, 255, 120, 0.05)");
    ctx2.fillStyle = innerGrad;
    ctx2.fillRect(x - w / 2, y - h, w, h);
    ctx2.restore();
    ctx2.fillStyle = "#4cff96";
    ctx2.font = "bold 9px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "bottom";
    ctx2.fillText("EXIT", x, y - h - 4);
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
    if (s.weapon) {
      drawHeldWeapon(ctx2, s);
    }
  }
  function drawHeldWeapon(ctx2, s) {
    const w = s.weapon;
    const hand = s.facing === 1 ? s.handR : s.handL;
    const elbow = s.facing === 1 ? s.elbowR : s.elbowL;
    const bladeLen = w.bladeLength ?? w.range * 0.85;
    const color = w.color;
    const highlight = w.highlightColor ?? "#ffffff";
    ctx2.save();
    ctx2.lineCap = "round";
    if (w.kind === "ranged") {
      const hx = (s.handL.x + s.handR.x) / 2;
      const hy = (s.handL.y + s.handR.y) / 2;
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      const bowRadius = bladeLen * 0.5;
      const bowAngle = 0.7;
      const startAngle = -Math.PI / 2 - bowAngle;
      const endAngle = -Math.PI / 2 + bowAngle;
      ctx2.arc(hx - s.facing * bowRadius * 0.3, hy, bowRadius, startAngle, endAngle);
      ctx2.stroke();
      ctx2.strokeStyle = highlight;
      ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(s.handL.x, s.handL.y);
      ctx2.lineTo(s.handR.x, s.handR.y);
      ctx2.stroke();
    } else {
      const angle = Math.atan2(
        hand.y - elbow.y,
        hand.x - elbow.x
      );
      const tipX = hand.x + Math.cos(angle) * bladeLen;
      const tipY = hand.y + Math.sin(angle) * bladeLen;
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.moveTo(hand.x, hand.y);
      ctx2.lineTo(tipX, tipY);
      ctx2.stroke();
      ctx2.strokeStyle = highlight;
      ctx2.lineWidth = 1;
      ctx2.globalAlpha = 0.55;
      ctx2.beginPath();
      ctx2.moveTo(hand.x + 1, hand.y);
      ctx2.lineTo(tipX + 1, tipY);
      ctx2.stroke();
      ctx2.globalAlpha = 1;
      const guardLen = w.grip === "twoHand" ? 8 : 5;
      const perpX = -Math.sin(angle) * guardLen;
      const perpY = Math.cos(angle) * guardLen;
      ctx2.strokeStyle = "#7a5a30";
      ctx2.lineWidth = 2.5;
      ctx2.beginPath();
      ctx2.moveTo(hand.x - perpX, hand.y - perpY);
      ctx2.lineTo(hand.x + perpX, hand.y + perpY);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  function drawWorldMap(ctx2, nodes, screenW, screenH, selectedId, stats, levelUpMsg) {
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
    const mapW = screenW - padX * 2 - 180;
    const mapH = screenH - padY * 2;
    const nodeById = /* @__PURE__ */ new Map();
    const screenNodes = nodes.map((n) => {
      const sn = {
        ...n,
        sx: padX + n.x * mapW,
        sy: padY + n.y * mapH
      };
      nodeById.set(n.id, { sx: sn.sx, sy: sn.sy });
      return sn;
    });
    ctx2.strokeStyle = COLORS.mapPath;
    ctx2.lineWidth = 3;
    ctx2.setLineDash([6, 4]);
    for (const n of screenNodes) {
      for (const reqId of n.connections) {
        const parent = nodeById.get(reqId);
        if (!parent) continue;
        ctx2.beginPath();
        ctx2.moveTo(parent.sx, parent.sy);
        ctx2.lineTo(n.sx, n.sy);
        ctx2.stroke();
      }
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
    drawStatsPanel(ctx2, stats, screenW, screenH);
    if (levelUpMsg) {
      ctx2.fillStyle = "#ffe066";
      ctx2.font = "bold 22px sans-serif";
      ctx2.textAlign = "center";
      ctx2.textBaseline = "top";
      ctx2.fillText(levelUpMsg, screenW / 2, 80);
    }
    ctx2.fillStyle = COLORS.muted;
    ctx2.font = "14px sans-serif";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "bottom";
    ctx2.fillText(
      "Tap a level to play  \u2022  Space/Enter to start  \u2022  1/2/3: spend skill pts  \u2022  R: reset skills",
      screenW / 2,
      screenH - 20
    );
  }
  function drawStatsPanel(ctx2, stats, screenW, _screenH) {
    const effective = computeEffectiveStats(stats);
    const panelW = 170;
    const panelH = 210;
    const panelX = screenW - panelW - 10;
    const panelY = 10;
    const pad = 10;
    ctx2.fillStyle = "rgba(13, 13, 26, 0.88)";
    ctx2.strokeStyle = "#333355";
    ctx2.lineWidth = 1.5;
    ctx2.beginPath();
    ctx2.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx2.fill();
    ctx2.stroke();
    let y = panelY + pad;
    ctx2.fillStyle = COLORS.primary;
    ctx2.font = "bold 13px sans-serif";
    ctx2.textAlign = "left";
    ctx2.textBaseline = "top";
    ctx2.fillText("Player Stats", panelX + pad, y);
    y += 20;
    ctx2.fillStyle = "#ffe066";
    ctx2.font = "bold 12px sans-serif";
    ctx2.fillText(`Level ${stats.level}`, panelX + pad, y);
    y += 18;
    const barW = panelW - pad * 2;
    const barH = 8;
    const xpRatio = stats.xpToNext > 0 ? Math.min(1, stats.xp / stats.xpToNext) : 0;
    ctx2.fillStyle = "#222244";
    ctx2.fillRect(panelX + pad, y, barW, barH);
    ctx2.fillStyle = "#7b68ee";
    ctx2.fillRect(panelX + pad, y, Math.round(barW * xpRatio), barH);
    ctx2.strokeStyle = "#444466";
    ctx2.lineWidth = 1;
    ctx2.strokeRect(panelX + pad, y, barW, barH);
    y += barH + 4;
    ctx2.fillStyle = COLORS.muted;
    ctx2.font = "10px sans-serif";
    ctx2.fillText(`XP: ${stats.xp} / ${stats.xpToNext}`, panelX + pad, y);
    y += 16;
    ctx2.strokeStyle = "#333355";
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(panelX + pad, y);
    ctx2.lineTo(panelX + panelW - pad, y);
    ctx2.stroke();
    y += 8;
    const statLines = [
      { label: "\u2764 HP", value: `${effective.maxHp}`, pts: stats.skills.health, key: "1" },
      { label: "\u2694 ATK", value: `\xD7${effective.attackMult.toFixed(2)}`, pts: stats.skills.attack, key: "2" },
      { label: "\u{1F6E1} DEF", value: `${effective.defense}`, pts: stats.skills.defense, key: "3" }
    ];
    for (const row of statLines) {
      ctx2.fillStyle = COLORS.text;
      ctx2.font = "12px sans-serif";
      ctx2.textAlign = "left";
      ctx2.fillText(`${row.label}: ${row.value}`, panelX + pad, y);
      ctx2.fillStyle = COLORS.muted;
      ctx2.font = "10px sans-serif";
      ctx2.textAlign = "right";
      ctx2.fillText(`[${row.pts}pts]  [${row.key}]`, panelX + panelW - pad, y + 2);
      y += 18;
    }
    y += 4;
    const hasPoints = stats.skillPoints > 0;
    ctx2.fillStyle = hasPoints ? "#ffe066" : COLORS.muted;
    ctx2.font = hasPoints ? "bold 11px sans-serif" : "11px sans-serif";
    ctx2.textAlign = "left";
    ctx2.fillText(
      hasPoints ? `\u2605 ${stats.skillPoints} skill pts available!` : "No skill points available",
      panelX + pad,
      y
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
  var EXIT_COLLECT_RADIUS = 32;
  var EXIT_COLLECT_RADIUS_SQ = EXIT_COLLECT_RADIUS * EXIT_COLLECT_RADIUS;
  var LEVEL_UP_BANNER_DURATION = 3.5;
  var canvas = null;
  var ctx = null;
  var rafId = null;
  var subState = "map";
  var mapNodes = [];
  var selectedMapId = "1-1";
  var mapBannerText = "";
  var mapBannerTimer = 0;
  var physicsWorld = null;
  var playerStick = null;
  var levelInstance = null;
  var camera = null;
  var gameTime = 0;
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
    gameTime = 0;
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
  function updateMap(dt) {
    const input = getInput();
    if (mapBannerTimer > 0) {
      mapBannerTimer -= dt;
      if (mapBannerTimer <= 0) {
        mapBannerTimer = 0;
        mapBannerText = "";
      }
    }
    if (input.jump && selectedMapId) {
      const node = mapNodes.find((n) => n.id === selectedMapId);
      if (node?.unlocked) {
        enterLevel(selectedMapId);
        return;
      }
    }
    const save = loadSave();
    if (!save) return;
    const stats = save.playerStats;
    let changed = false;
    if (input.skill1 && spendSkillPoint(stats, "health")) {
      changed = true;
      showMapBanner("Invested in \u2764 Health!");
    }
    if (input.skill2 && spendSkillPoint(stats, "attack")) {
      changed = true;
      showMapBanner("Invested in \u2694 Attack!");
    }
    if (input.skill3 && spendSkillPoint(stats, "defense")) {
      changed = true;
      showMapBanner("Invested in \u{1F6E1} Defense!");
    }
    if (input.respec) {
      resetSkills(stats);
      changed = true;
      showMapBanner("Skills reset \u2014 all points refunded.");
    }
    if (changed) {
      save.playerStats = stats;
      persistSave(save);
    }
  }
  function showMapBanner(text) {
    mapBannerText = text;
    mapBannerTimer = LEVEL_UP_BANNER_DURATION;
  }
  function drawMapFrame() {
    if (!ctx || !canvas) return;
    const save = loadSave();
    const stats = save?.playerStats ?? { level: 1, xp: 0, xpToNext: 100, skillPoints: 0, skills: { health: 0, attack: 0, defense: 0 } };
    const banner = mapBannerTimer > 0 ? mapBannerText : void 0;
    drawWorldMap(ctx, mapNodes, canvas.width, canvas.height, selectedMapId, stats, banner);
  }
  var PICKUP_COLLECT_RADIUS = 30;
  var PICKUP_COLLECT_RADIUS_SQ = PICKUP_COLLECT_RADIUS * PICKUP_COLLECT_RADIUS;
  function updatePlay(dt) {
    if (!physicsWorld || !playerStick || !canvas || !camera) return;
    gameTime += dt;
    const input = getInput();
    if (input.jump) {
      playerStick.jump();
    }
    if (input.swipeLeft && playerStick.facing === 1) {
      playerStick.turnAround();
    } else if (input.swipeRight && playerStick.facing === -1) {
      playerStick.turnAround();
    }
    playerStick.crouching = input.crouch;
    if (input.punch) {
      const worldPunchX = input.mouseX + camera.x - canvas.width / 2;
      const worldPunchY = input.mouseY + camera.y - canvas.height / 2;
      playerStick.punch(worldPunchX, worldPunchY, dt);
    }
    playerStick.update(dt, physicsWorld);
    physicsWorld.step(dt);
    const center = playerStick.center;
    camera.follow(center.x, center.y - 60, dt);
    checkWeaponPickups();
    checkExitReached();
  }
  function checkWeaponPickups() {
    if (!levelInstance || !playerStick) return;
    const px = playerStick.pelvis.x;
    const py = playerStick.pelvis.y;
    for (const pickup of levelInstance.weaponPickups) {
      if (pickup.collected) continue;
      const dx = px - pickup.x;
      const dy = py - pickup.y;
      if (dx * dx + dy * dy <= PICKUP_COLLECT_RADIUS_SQ) {
        playerStick.equipWeapon(pickup.weapon);
        pickup.collected = true;
      }
    }
  }
  function checkExitReached() {
    if (!levelInstance || !playerStick) return;
    if (levelInstance.exitX === void 0 || levelInstance.exitY === void 0) return;
    const px = playerStick.pelvis.x;
    const py = playerStick.pelvis.y;
    const dx = px - levelInstance.exitX;
    const dy = py - levelInstance.exitY;
    if (dx * dx + dy * dy > EXIT_COLLECT_RADIUS_SQ) return;
    const levelId = levelInstance.def.id;
    const xpReward = levelInstance.def.xpReward ?? 80;
    const save = loadSave();
    if (!save) return;
    if (!save.completedLevels.includes(levelId)) {
      save.completedLevels.push(levelId);
    }
    const levelsGained = addXp(save.playerStats, xpReward);
    if (levelsGained > 0) {
      const plural = levelsGained > 1 ? "levels" : "level";
      showMapBanner(
        `Level Complete! +${xpReward} XP  \u2022  Level Up! (${levelsGained} ${plural})  \u2022  +${levelsGained * 2} skill pts`
      );
    } else {
      showMapBanner(`Level Complete! +${xpReward} XP`);
    }
    persistSave(save);
    enterMap();
  }
  function drawPlayFrame(_dt) {
    if (!ctx || !canvas || !camera || !levelInstance || !playerStick) return;
    clearCanvas(ctx, canvas.width, canvas.height);
    camera.applyTransform(ctx);
    drawGround(ctx, levelInstance.groundY, levelInstance.width);
    drawBlocks(ctx, levelInstance.blocks);
    if (levelInstance.exitX !== void 0 && levelInstance.exitY !== void 0) {
      drawExitMarker(ctx, levelInstance.exitX, levelInstance.exitY, gameTime);
    }
    drawWeaponPickups(ctx, levelInstance.weaponPickups, gameTime);
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
    if (playerStick.weapon) {
      ctx.fillStyle = "#ffe066";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`\u2694 ${playerStick.weapon.name}`, 60, canvas.height - 20);
    }
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
