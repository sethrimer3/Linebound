// stickman.js

const STICK_JUMP_GRAVITY = 500;
const STICK_JUMP_SPEED = 300;
const STICK_MAX_FALL_SPEED = 800;
const STICK_GROUND_TOLERANCE = 0;
const STICK_JUMP_HOVER_ALLOWANCE = 15;
const STICK_JUMP_PROXIMITY_GRACE_MS = 120;

const STICK_CORPSE_FADE_DELAY_MS = 1200;
const STICK_CORPSE_FADE_DURATION_MS = 2200;
const STICK_CORPSE_CONSTRAINT_STIFFNESS_MULTIPLIER = 1;
const STICK_CORPSE_CONSTRAINT_MIN_STIFFNESS = 0.92;
const STICK_CORPSE_CONSTRAINT_MAX_STIFFNESS = 1.05;
const STICK_CORPSE_CONSTRAINT_ELASTICITY_MULTIPLIER = 0.35;
const STICK_CORPSE_CONSTRAINT_DAMPING_MULTIPLIER = 0.5;
const STICK_CORPSE_LEG_CONSTRAINT_STIFFNESS = 1.08;
const STICK_CORPSE_LEG_MIN_CORRECTION_RATIO = 1.05;
const STICK_JOINT_TORQUE_RESPONSE_PER_SEC = 14;
const STICK_CORPSE_JOINT_TORQUE_DECAY_PER_SEC = 18;
const STICK_CORPSE_LENGTH_LOCK_POINTS = new Set(['kneeL','kneeR']);
const STICK_BASE_MOVE_SPEED = 420;
const PLAYER_MOVE_SPEED_SCALE = 0.5;
const ENEMY_MOVE_SPEED_SCALE = 0.3;
const PLAYER_JUMP_SPEED_SCALE = 0.72;
const ENEMY_JUMP_SPEED_SCALE = 1;

const STICK_WALL_QUERY_PADDING = 220;

function rectFromCenter(width, height, centerX, centerY){
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  return {
    left: centerX - halfW,
    right: centerX + halfW,
    top: centerY - halfH,
    bottom: centerY + halfH
  };
}

function clampPointToRect(px, py, rect){
  const clampedX = Math.max(rect.left, Math.min(rect.right, px));
  const clampedY = Math.max(rect.top, Math.min(rect.bottom, py));
  return { x: clampedX, y: clampedY };
}

function distancePointToRect(px, py, rect){
  const dx = Math.max(rect.left - px, 0, px - rect.right);
  const dy = Math.max(rect.top - py, 0, py - rect.bottom);
  return Math.hypot(dx, dy);
}

function orientation(ax, ay, bx, by, cx, cy){
  return (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
}

function onSegment(ax, ay, bx, by, cx, cy){
  return cx >= Math.min(ax, bx) - 1e-6
    && cx <= Math.max(ax, bx) + 1e-6
    && cy >= Math.min(ay, by) - 1e-6
    && cy <= Math.max(ay, by) + 1e-6;
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy){
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);
  if(o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return true;
  if(o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return true;
  if(o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return true;
  if(o4 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function distanceRectToSegment(rect, ax, ay, bx, by){
  const corners = [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom }
  ];
  const edges = [
    [rect.left, rect.top, rect.right, rect.top],
    [rect.right, rect.top, rect.right, rect.bottom],
    [rect.right, rect.bottom, rect.left, rect.bottom],
    [rect.left, rect.bottom, rect.left, rect.top]
  ];
  for(const [ex1, ey1, ex2, ey2] of edges){
    if(segmentsIntersect(ax, ay, bx, by, ex1, ey1, ex2, ey2)){
      return 0;
    }
  }
  let best = distancePointToRect(ax, ay, rect);
  const endDist = distancePointToRect(bx, by, rect);
  if(endDist < best) best = endDist;
  for(const corner of corners){
    const dist = distancePointToSegmentRaw(corner.x, corner.y, ax, ay, bx, by);
    if(dist < best) best = dist;
  }
  return best;
}

function distancePointToSegmentRaw(px, py, ax, ay, bx, by){
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if(lenSq <= 1e-8) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const sx = ax + abx * t;
  const sy = ay + aby * t;
  return Math.hypot(px - sx, py - sy);
}

function distancePointToEllipse(px, py, centerX, centerY, radiusX, radiusY){
  const rx = Math.max(0, radiusX);
  const ry = Math.max(0, radiusY);
  if(!(rx > 0 && ry > 0)){
    const rect = rectFromCenter(rx * 2, ry * 2, centerX, centerY);
    return distancePointToRect(px, py, rect);
  }
  const dx = px - centerX;
  const dy = py - centerY;
  const nx = dx / rx;
  const ny = dy / ry;
  const length = Math.hypot(nx, ny);
  if(!(length > 0)) return 0;
  if(length <= 1) return 0;
  const scale = 1 / length;
  const ex = centerX + dx * scale;
  const ey = centerY + dy * scale;
  return Math.hypot(px - ex, py - ey);
}

function segmentIntersectsEllipse(cx, cy, rx, ry, ax, ay, bx, by){
  if(!(rx > 0 && ry > 0)) return false;
  const dx = bx - ax;
  const dy = by - ay;
  const ox = ax - cx;
  const oy = ay - cy;
  const invRxSq = 1 / (rx * rx);
  const invRySq = 1 / (ry * ry);
  const A = dx * dx * invRxSq + dy * dy * invRySq;
  const B = 2 * (dx * ox * invRxSq + dy * oy * invRySq);
  const C = ox * ox * invRxSq + oy * oy * invRySq - 1;
  if(Math.abs(A) <= 1e-12){
    if(Math.abs(B) <= 1e-12) return C <= 0;
    const t = -C / B;
    return t >= 0 && t <= 1;
  }
  const discriminant = B * B - 4 * A * C;
  if(discriminant < 0) return false;
  const sqrtDisc = Math.sqrt(discriminant);
  const invDen = 1 / (2 * A);
  const t1 = (-B - sqrtDisc) * invDen;
  const t2 = (-B + sqrtDisc) * invDen;
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

function distanceEllipseToSegment(cx, cy, rx, ry, ax, ay, bx, by){
  if(!(rx > 0 && ry > 0)){
    const rect = rectFromCenter(rx * 2, ry * 2, cx, cy);
    return distanceRectToSegment(rect, ax, ay, bx, by);
  }
  if(segmentIntersectsEllipse(cx, cy, rx, ry, ax, ay, bx, by)) return 0;
  const dx = bx - ax;
  const dy = by - ay;
  if(Math.abs(dx) <= 1e-8 && Math.abs(dy) <= 1e-8){
    return distancePointToEllipse(ax, ay, cx, cy, rx, ry);
  }
  const sample = (t)=>{
    const sx = ax + dx * t;
    const sy = ay + dy * t;
    return distancePointToEllipse(sx, sy, cx, cy, rx, ry);
  };
  let left = 0;
  let right = 1;
  let best = Math.min(sample(left), sample(right));
  for(let i=0;i<24;i++){
    const m1 = left + (right - left) / 3;
    const m2 = right - (right - left) / 3;
    const f1 = sample(m1);
    const f2 = sample(m2);
    if(f1 < best) best = f1;
    if(f2 < best) best = f2;
    if(f1 > f2){
      left = m1;
    }else{
      right = m2;
    }
  }
  return best;
}

function normalizeElementKey(element){
  if(element === undefined || element === null) return null;
  const str = String(element).trim().toLowerCase();
  if(!str) return null;
  if(str === 'chrono') return 'chronometric';
  return str;
}

function findTemplarianWallGuardian(world, exclude=null){
  if(!world || !Array.isArray(world.sticks)) return null;
  for(const candidate of world.sticks){
    if(!candidate || candidate === exclude) continue;
    if(candidate.dead || candidate.isEnemy) continue;
    if(!candidate.templarianWallShieldEquipped) continue;
    const hp = Number.isFinite(candidate.hp) ? candidate.hp : 0;
    if(hp <= 0) continue;
    return candidate;
  }
  return null;
}

class Stick{
  constructor(x,y,isEnemy=false, worldRef=null){
    this.isEnemy = isEnemy;
    this.isBoss = false;
    this.dir = 1;
    this._lastMoveFacing = 1;
    const baseSpeed = STICK_BASE_MOVE_SPEED * (isEnemy ? ENEMY_MOVE_SPEED_SCALE : PLAYER_MOVE_SPEED_SCALE);
    this.moveSpeed = baseSpeed;

    this.moveForce = this.moveSpeed * 25;

    this.airMoveForce = this.moveForce * 0.65;
    this.moveDecel = this.moveSpeed * 6;
    this.baseMoveForce = this.moveForce;
    this.baseMoveSpeed = this.moveSpeed;
    this.baseMoveDecel = this.moveDecel;
    this.statusMoveScale = 1;
    this.slowUntil = 0;
    this.slowMultiplier = 1;
    this.necroticState = null;
    this.auraSources = new Map();
    this._auraAttackMultiplier = 1;
    this._auraDefenseMultiplier = 1;
    this._auraHealthMultiplier = 1;
    this._baseAttackComputed = this.attack;
    this._baseDefenseComputed = this.defense;
    this._baseMaxHpComputed = this.maxHp;
    this.necromancerMarks = null;
    this.projectileShields = null;

    this.hp = 50; this.maxHp=50; this.dead=false;
    this.maxHpBase = this.maxHp;
    this.level=1; this.xp=0; this.nextXp=Infinity;
    this.attackBase = 1;
    this.attack = this.attackBase;
    this.defenseBase = 1;
    this.defense = this.defenseBase;
    this.equipmentAttackBonus = 0;
    this.equipmentDefenseBonus = 0;
    this.skillPoints = 0;
    this.skillAllocations = { health: 0, attack: 0, defense: 0 };
    this.heldItem = null;

    this.inventory = defaultInventory();
    this.equipIndex = 0;
    this.weaponCooldownUntil = 0;
    this.weaponVisible = false;
    this.weaponHand = null;
    this.weaponSwingUntil = 0;
    this.weaponTerrainIgnoreUntil = 0;
    this.weaponLastActiveTime = 0;
    this.weaponSheathed = false;
    this.weaponSheathPose = null;
    this.weaponSheathGrabStart = 0;
    this.weaponSheathGrabUntil = 0;
    this.weaponSheathGrabHand = null;
    this.templarianWallShieldEquipped = false;
    this.lastAttackAim = null;
    this._debugWeaponHitboxes = [];
    this._timeBladeState = null;
    this.bowCharging = false;
    this.bowChargeStart = 0;
    this.bowChargeRatio = 0;
    this.bowChargeWeaponId = null;
    this.bowChargeAim = { x, y };
    this.bowChargeReleaseUntil = 0;
    this.bowLastChargeRatio = 0;
    this.renderStyle = 'stick';
    this.showWeapon = true;
    this.bodyColor = null;
    this.accentColor = null;
    this.renderAlpha = 1;
    this.element = 'physical';
    this.headShape = 'square';
    this.voidGlyphHead = false;
    this.voidHaloState = null;
    this.voidHaloRadius = undefined;
    this.voidHaloHeightOffset = 0;
    this.voidHaloMaxOrbs = undefined;
    this.voidHaloSpinSpeed = undefined;
    this.voidHaloRegenDelay = undefined;
    this.voidHaloVolleyInterval = undefined;
    this.voidHaloChargeTime = undefined;
    this.voidHaloAttackDowntime = undefined;
    this.voidHaloChargeDecay = undefined;
    this.voidHaloOrbRadius = undefined;
    this.renderOffsetY = 0;
    this.hitboxWidth = null;
    this.hitboxHeight = null;
    this.hitboxCenterOffsetY = null;
    this.hitboxShape = null;
    this.bodyRadius = 32;
    this.label = null;
    this.selectable = true;
    this.invulnerable = false;
    this.resistances = [];
    this.resistanceSet = null;
    this.chronoFrozenUntil = 0;
    this.chronoInvertedUntil = 0;
    this.chronoVulnerableUntil = 0;
    this.chronoFrozen = false;
    this._chronoStasisState = null;
    this._chronoStasisSource = null;
    this.rollRadius = 22.5;
    this.rollPhase = 0;
    this.ignorePlatformsUntil = 0;
    this.lastPlatformContactAt = 0;
    this.currentPlatform = null;
    this.nextPlatformDropAllow = 0;
    this.teamIndex = null;
    this.slimeWidth = 45;
    this.slimeHeight = 31.5;
    this.slimeSquish = 1;
    this.softMode = false;
    this.forcedSoftUntil = 0;
    this.isGrounded = false;
    this.wasGrounded = false;
    this._resolvingBlockPenetration = false;
    this.prevVerticalSpeed = 0;
    this.moveIntent = 0;
    this.moveVelocity = 0;
    this.crouchIntent = 0;
    this.crouchAmount = 0;
    this.isCrouching = false;
    this.crouchBodyOffset = 0;
    this._groundedFootCount = 0;
    this._footClampState = null;
    this._legElasticConstraints = null;
    this._hitboxRigStrength = 1;
    this._jointTorqueScale = 1;
    this._jointTorqueTarget = 1;
    this._jointTorqueResponsePerSec = STICK_JOINT_TORQUE_RESPONSE_PER_SEC;
    this._armJointTorqueScale = 1;
    this._jointTargetOverrides = null;

    this.aggro=false; this.thinkUntil=0; this.target=null; this.wanderDir=0;
    this.wanderTimer = 0;
    this.iframesUntil = 0;
    this.groundTime = 0;
    this.airTime = 0;
    this.prevPelvisX = x;
    this.specialTimer = 0;
    this.stateTimer = 0;
    this.behavior = 'skirmisher';
    this.attackRange = 200;
    this.preferredRange = 160;
    this.hoverHeight = 0;
    const baseJumpSpeed = STICK_JUMP_SPEED * (isEnemy ? ENEMY_JUMP_SPEED_SCALE : PLAYER_JUMP_SPEED_SCALE);
    this.jumpSpeed = baseJumpSpeed;
    this.jumpLocked = false;
    this.verticalVelocity = 0;
    this.maxFallSpeed = STICK_MAX_FALL_SPEED;
    this.leapStrength = 84000;
    this.blastRadius = 0;
    this.blastDamage = 0;
    this.pullRadius = 0;
    this.pullStrength = 0;
    this.ledgeGrab = null;
    this.ledgeGrabCooldownUntil = 0;
    this.lastGrappleReleaseFromUpAt = 0;
    this._grappleHoldActive = false;
    this._grappleHoldFromGround = false;
    this._grappleHoldArmed = false;
    this._chainSwingActive = false;
    this._ledgeClimbTransition = null;
    this.sprintEnergy = 1;
    this.sprintRegenDelayTimer = 0;
    this.isSprinting = false;
    this._sprintEffectCooldown = 0;
    this._sprintBarAlpha = 0;
    this._sprintBarHold = 0;
    this.swimBoostActive = false;
    this.airJumpsRemaining = 0;
    this.homeX = x;
    this.deathEffect = null;
    this.deathDamage = 0;
    this.deathRadius = 0;
    this.deadAt = 0;
    this.deadFadeDelay = STICK_CORPSE_FADE_DELAY_MS;
    this.deadFadeDuration = STICK_CORPSE_FADE_DURATION_MS;

    this.requiresWater = false;
    this.airDamageDelay = 1;
    this.airDamageRate = 0;
    this._airDamagePool = 0;
    this.outOfWaterTime = 0;
    this.waterSoft = false;
    this.swimForce = 0;
    this.swimBuoyancy = 0;
    this.swimDrag = 0;
    this.swimDamp = 0;
    this.swimDepth = 42;
    this.salmonLength = 96;
    this.salmonHeight = 34;
    this.glitchSeed = Math.random() * TAU;
    this.waterHome = null;
    this.swimWanderTimer = 0;
    this.swimWanderDir = 1;
    this.preventsDrowning = false;

    this.world = worldRef;
    this.showHealthUntil = 0;
    this._lastDamageNumberAt = 0;
    this.isUnderwater = false;
    this.underwaterTime = 0;
    this._drownDamagePool = 0;
    this._bubbleTimer = 0;
    this.feetUnderwater = false;
    this.isInLava = false;
    this.lavaTime = 0;
    this._lavaDamagePool = 0;
    this.lavaImmune = false;
    this._pendingProjectileOrigin = null;

    this.pointsByName={};
    this.points=[];
    this.rigConstraints=[];
    this._corpseConstraintsSoftened = false;
    this.rigOffsets = this._createRigOffsets();
    this._baseRigOffsets = {};
    if(this.rigOffsets){
      for(const name of Object.keys(this.rigOffsets)){
        const offset = this.rigOffsets[name];
        this._baseRigOffsets[name] = offset ? { x: offset.x, y: offset.y } : { x: 0, y: 0 };
      }
    }
    this.armLag = {
      elbowL:{x:0,y:0},
      elbowR:{x:0,y:0},
      handL:{x:0,y:0},
      handR:{x:0,y:0}
    };
    this.armLagOutput = {
      elbowL:{x:0,y:0},
      elbowR:{x:0,y:0},
      handL:{x:0,y:0},
      handR:{x:0,y:0}
    };
    this.armSwingPhase = Math.random() * TAU;
    this.comboStep = 0;
    this.comboQueuedStep = 0;
    this.comboWindowStart = 0;
    this.comboWindowUntil = 0;
    this.comboAnim = null;
    this.attackLockUntil = 0;
    this.backflipActive = false;
    this.backflipUntil = 0;
    this.backflipLandingTime = 0;
    this.weaponReachMultiplier = 1;
    this.weaponRig = null;
    this.spiritState = null;
    this.gunStates = {};
    this.gunFastReload = {};
    this.lastGunAim = null;
    this.lastBowAim = null;
    this.lastSpearAim = null;
    this.staffState = null;
    this.punchState = null;
    this.gloveState = null;
    this._lastPunchHand = null;
    this.summonerState = null;
    this.halfSlotState = null;
    this.lastCeilingClampAt = 0;
    this._lastSafePelvis = { x, y };
    this._buildRig(x,y,worldRef);
    let initialRigStrength = 1;
    if(worldRef && worldRef.gameplayFlags){
      const flags = worldRef.gameplayFlags;
      const rawStrength = Number.isFinite(flags.hitboxRigStrength)
        ? clamp(Math.round(flags.hitboxRigStrength), 0, 200)
        : 100;
      flags.hitboxRigStrength = rawStrength;
      if(flags.showHitboxes){
        initialRigStrength = rawStrength / 100;
      }
    }
    this.applyHitboxRigStrength(initialRigStrength);
    this.legs = createLegRig(x, y);
    this.refreshWeaponRig();
    this._ensureSpiritWeaponState(true);
    this._syncSummonerStateOnEquip(true);
    this._syncGunStateOnEquip();
    this._syncHalfSlotState(true);
    this.spearThrust = null;
    this.cacheBaseStatsFromCurrent({ useRaw: true });
  }

  pelvis(){ return this.pointsByName.pelvis; }
  center(){
    const p=this.pelvis();
    if(!p) return { x: 0, y: 0 };
    const offsetY = this.hitboxCenterOffsetY !== null && this.hitboxCenterOffsetY !== undefined
      ? this.hitboxCenterOffsetY
      : -15*STICK_SCALE;
    return { x: p.x, y: p.y + offsetY };
  }
  _abilityDefinition(id){
    if(typeof abilityDefinitionById === 'function'){
      return abilityDefinitionById(id);
    }
    return null;
  }
  _abilityUnlocked(id){
    if(this.isEnemy) return true;
    if(!id) return false;
    if(typeof isAbilityUnlocked === 'function'){
      return isAbilityUnlocked(this.world, id);
    }
    const unlocked = this.world?.profile?.abilities?.unlocked;
    return !!(unlocked && unlocked[id]);
  }
  _maxAirJumps(){
    if(!this._abilityUnlocked('doubleJump')) return 0;
    const def = this._abilityDefinition('doubleJump');
    const extra = Number.isFinite(def?.extraJumps) ? def.extraJumps : 1;
    return Math.max(0, Math.round(extra));
  }
  setRectHitbox(width, height, options={}){
    const resolvedWidth = Number.isFinite(width) && width > 0 ? width : null;
    const resolvedHeight = Number.isFinite(height) && height > 0 ? height : null;
    if(!resolvedWidth || !resolvedHeight) return;
    const opts = options && typeof options === 'object' ? options : {};
    const centerOffsetY = Number.isFinite(opts.centerOffsetY)
      ? opts.centerOffsetY
      : (this.renderOffsetY || 0);
    const shapeOption = typeof opts.shape === 'string' ? opts.shape.toLowerCase() : null;
    const normalizedShape = shapeOption === 'ellipse' ? 'ellipse' : 'rect';
    this.hitboxWidth = resolvedWidth;
    this.hitboxHeight = resolvedHeight;
    this.hitboxCenterOffsetY = centerOffsetY;
    this.hitboxShape = normalizedShape;
    this.bodyRadius = Math.max(resolvedWidth, resolvedHeight) * 0.5;
  }
  setEllipseHitbox(width, height, options={}){
    const opts = Object.assign({}, options, { shape: 'ellipse' });
    this.setRectHitbox(width, height, opts);
  }
  hitboxRect(){
    const center = this.center();
    if(this.hitboxWidth && this.hitboxHeight){
      return rectFromCenter(this.hitboxWidth, this.hitboxHeight, center.x, center.y);
    }
    const radius = this.bodyRadius || 32;
    return rectFromCenter(radius * 2, radius * 2, center.x, center.y);
  }
  distanceToPoint(x, y){
    if(this.hitboxWidth && this.hitboxHeight && this.hitboxShape === 'ellipse'){
      const center = this.center();
      return distancePointToEllipse(x, y, center.x, center.y, this.hitboxWidth * 0.5, this.hitboxHeight * 0.5);
    }
    const rect = this.hitboxRect();
    return distancePointToRect(x, y, rect);
  }
  distanceToSegment(ax, ay, bx, by){
    if(this.hitboxWidth && this.hitboxHeight && this.hitboxShape === 'ellipse'){
      const center = this.center();
      return distanceEllipseToSegment(center.x, center.y, this.hitboxWidth * 0.5, this.hitboxHeight * 0.5, ax, ay, bx, by);
    }
    const rect = this.hitboxRect();
    return distanceRectToSegment(rect, ax, ay, bx, by);
  }
  allowsLimbPull(){
    if(this._ledgeClimbTransition) return true;
    if(this._grappleHoldActive) return true;
    if(this._grappleHoldArmed) return true;
    if(this._chainSwingActive) return true;
    if(this.teamAbilityChain && this.teamAbilityChain.ability?.id === 'chainSwing') return true;
    return false;
  }
  weapon(){
    const slot=this.currentWeaponSlot();
    if(!slot || slot.type!=='weapon') return null;
    return resolveWeaponWithGlyph(slot) || WEAPONS[slot.id];
  }
  currentEquipmentSlot(){
    if(!Array.isArray(this.inventory)) return null;
    const raw = this.inventory[this.equipIndex] || null;
    if(!raw){
      const normalized = createEquipmentSlot();
      this.inventory[this.equipIndex] = normalized;
      return normalized;
    }
    if(raw.mainHand !== undefined || raw.offHand !== undefined || raw.armor !== undefined){
      return raw;
    }
    const normalized = createEquipmentSlot(raw);
    this.inventory[this.equipIndex] = normalized;
    return normalized;
  }
  currentWeaponSlot(){
    const slot = this.currentEquipmentSlot();
    if(!slot) return null;
    if(slot.mainHand) return slot.mainHand;
    if(slot.type) return slot;
    return null;
  }
  offhandItem(){
    const slot = this.currentEquipmentSlot();
    return slot?.offHand || null;
  }
  hasScoutRemote(){
    const offhand = this.offhandItem();
    return !!(offhand && offhand.type === 'offhand' && offhand.id === 'scoutDroneRemote');
  }
  armorItem(){
    const slot = this.currentEquipmentSlot();
    return slot?.armor || null;
  }
  currentWeaponId(){
    const slot = this.currentWeaponSlot();
    return slot?.id || null;
  }
  equipSlot(i){
    if(this.equipIndex !== i){
      this.equipIndex = i;
    }else{
      this.equipIndex = i;
    }
    this.resetCombo(true);
    this.weaponCooldownUntil = 0;
    this.weaponVisible = false;
    this.weaponHand = null;
    this.weaponSwingUntil = 0;
    this.weaponTerrainIgnoreUntil = 0;
    this.weaponLastActiveTime = 0;
    this.weaponSheathed = false;
    this.weaponSheathPose = null;
    this.refreshWeaponRig();
    this.cancelBowCharge();
    this._ensureSpiritWeaponState(true);
    this._syncSummonerStateOnEquip(true);
    this._syncGunStateOnEquip();
    this._syncHalfSlotState(true);
    this._ensureStaffState(true);
    this._ensurePunchState(true);
    this.gloveState = null;
    this._lastPunchHand = null;
    this._stopStaffBeam();
    this.lastGunAim = null;
    this.lastBowAim = null;
  }

  refreshWeaponRig(now){
    return StickWeaponRig.refreshWeaponRig.call(this, now);
  }

  _updateWeaponRig(now){
    return StickWeaponRig._updateWeaponRig.call(this, now);
  }

  _rigInfoForWeapon(weaponId){
    return StickWeaponRig._rigInfoForWeapon.call(this, weaponId);
  }

  _initSwordRig(variant='sword'){
    return StickWeaponRig._initSwordRig.call(this, variant);
  }

  _rebuildSwordConstraints(){
    return StickWeaponRig._rebuildSwordConstraints.call(this);
  }

  _detachSwordConstraints(){
    return StickWeaponRig._detachSwordConstraints.call(this);
  }

  _ensureSwordConstraintsAttached(){
    return StickWeaponRig._ensureSwordConstraintsAttached.call(this);
  }

  _removeWeaponRig(){
    return StickWeaponRig._removeWeaponRig.call(this);
  }

  _updateSwordRigState(now){
    return StickWeaponRig._updateSwordRigState.call(this, now);
  }

  _applySwordComboPose(now){
    return StickWeaponRig._applySwordComboPose.call(this, now);
  }

  _extendWeaponTerrainIgnore(until){
    if(!until || until <= 0) return;
    if(!this.weaponTerrainIgnoreUntil || until > this.weaponTerrainIgnoreUntil){
      this.weaponTerrainIgnoreUntil = until;
    }
  }

  enforceCeilingClearance(area){
    if(!area) return;
    const bottom = area.bottom;
    if(bottom == null) return;
    const targetPoint = area.point || null;
    let clampSource = targetPoint && targetPoint.rigPart || null;
    if(!clampSource && targetPoint && this.pointsByName){
      for(const [name, value] of Object.entries(this.pointsByName)){
        if(value === targetPoint){
          clampSource = name;
          break;
        }
      }
    }
    if(clampSource && !CEILING_CLAMP_CORE_PARTS.has(clampSource)){
      return;
    }
    this.lastCeilingClampAt = nowMs();
    const contactLeft = area.contactLeft ?? area.left ?? -Infinity;
    const contactRight = area.contactRight ?? area.right ?? Infinity;
    for(const point of this.points){
      if(!point || point === targetPoint) continue;
      if(point.isSwordTip) continue;
      const radius = Math.max(0, point.terrainRadius ?? STICK_TERRAIN_RADIUS);
      const withinX = point.x >= contactLeft - radius && point.x <= contactRight + radius;
      if(!withinX) continue;
      const limit = bottom + radius;
      if(point.y < limit){
        point.y = limit;
        if(point.prevY < limit) point.prevY = limit;
        if(point.vy < 0) point.vy = 0;
      }
    }
    if(targetPoint && targetPoint.prevY < targetPoint.y){
      targetPoint.prevY = targetPoint.y;
    }
  }

  forceSoftFor(durationMs, now=nowMs()){
    if(!durationMs || durationMs <= 0) return;
    const until = now + durationMs;
    if(!this.forcedSoftUntil || until > this.forcedSoftUntil){
      this.forcedSoftUntil = until;
    }
  }

  _enemyFlopStabAttack(weapon, now){
    return StickWeaponState._enemyFlopStabAttack.call(this, weapon, now);
  }

  updateWeaponState(now){
    return StickWeaponState.updateWeaponState.call(this, now);
  }

  _beginWeaponSheathGrab(now){
    return StickWeaponState._beginWeaponSheathGrab.call(this, now);
  }

  _endWeaponSheathGrab(){
    return StickWeaponState._endWeaponSheathGrab.call(this);
  }

  _prepareSwordForUnsheathe(){
    return StickWeaponState._prepareSwordForUnsheathe.call(this);
  }

  _ensureSpiritWeaponState(forceReset=false){
    return StickWeaponState._ensureSpiritWeaponState.call(this, forceReset);
  }

  _ensureSummonerState(forceReset=false){
    return StickWeaponState._ensureSummonerState.call(this, forceReset);
  }

  _syncSummonerStateOnEquip(forceReset=false){
    return StickWeaponState._syncSummonerStateOnEquip.call(this, forceReset);
  }

  _dismissSummonerOrbs(consuming=false){
    return StickWeaponState._dismissSummonerOrbs.call(this, consuming);
  }

  _ensureStaffState(forceReset=false){
    return StickWeaponState._ensureStaffState.call(this, forceReset);
  }

  _ensurePunchState(forceReset=false){
    return StickWeaponState._ensurePunchState.call(this, forceReset);
  }

  _stopStaffBeam(){
    return StickWeaponState._stopStaffBeam.call(this);
  }

  _handleStaffAttack(now, aimX, aimY){
    return StickWeaponState._handleStaffAttack.call(this, now, aimX, aimY);
  }

  _updateStaffBeam(now, dt){
    return StickWeaponState._updateStaffBeam.call(this, now, dt);
  }

  _updateStaffAura(state, weapon, config, dt, now){
    return StickWeaponState._updateStaffAura.call(this, state, weapon, config, dt, now);
  }

  _applyStaffImpactToGeometry(hit, weapon, dt){
    return StickWeaponState._applyStaffImpactToGeometry.call(this, hit, weapon, dt);
  }

  _applyStaffBeamDamage(state, weapon, segments, dt, now){
    return StickWeaponState._applyStaffBeamDamage.call(this, state, weapon, segments, dt, now);
  }

  updateStaffState(dt){
    const weapon = this.weapon();
    const state = this._ensureStaffState(false);
    if(!weapon || weapon.kind !== 'staff' || !state){
      if(state && (!weapon || weapon.kind !== 'staff')){
        this._stopStaffBeam();
        this.staffState = null;
      }
      return;
    }
    const now = nowMs();
    const config = weapon.staff || {};
    const regen = Math.max(0, config.regenPerSecond ?? 0.35);
    const drain = Math.max(0, config.drainPerSecond ?? 0.6);
    const maxCharge = state.maxCharge ?? 1;
    if(state.firing){
      if(this.world && this.world.selected === this && this.world.input?.aim){
        state.lastAim = { x: this.world.input.aim.x, y: this.world.input.aim.y };
      }
      const loss = drain * dt;
      if(Number.isFinite(loss) && loss > 0){
        state.charge = Math.max(0, state.charge - loss);
      }
      this._updateStaffBeam(now, dt);
      const auraActive = !!config.aura && !!state.auraActive;
      const hasBeam = Array.isArray(state.beamSegments) && state.beamSegments.length > 0;
      if(state.charge <= 0 || (!auraActive && !hasBeam)){
        if(state.charge <= 0){
          StickWeaponState._releaseStaffSouls.call(this, 'exhaust');
        }
        this._stopStaffBeam();
      }else{
        this.weaponVisible = true;
        this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
        this.weaponSwingUntil = Math.max(this.weaponSwingUntil || 0, now + 100);
      }
    }else{
      const gain = regen * dt;
      if(Number.isFinite(gain) && gain > 0){
        state.charge = Math.min(maxCharge, state.charge + gain);
      }
      state.beamSegments = [];
      state.hitPoint = null;
      state.contactPoints = null;
      if(config.aura){
        StickWeaponState._clearStaffAura.call(this, state);
      }
      StickWeaponState._updateStaffSoulControl.call(this, state, weapon, config, dt, now);
    }
    state.charge = clamp(state.charge, 0, maxCharge);
    state.lastUpdate = now;
  }

  _consumeSpiritOrb(){
    return StickWeaponState._consumeSpiritOrb.call(this);
  }

  _spiritOrbitCenter(){
    return StickWeaponState._spiritOrbitCenter.call(this);
  }

  _spiritOrbPosition(index){
    return StickWeaponState._spiritOrbPosition.call(this, index);
  }

  _baseGunReloadMs(weapon){
    return StickWeaponState._baseGunReloadMs.call(this, weapon);
  }

  _fastGunReloadMs(weapon){
    return StickWeaponState._fastGunReloadMs.call(this, weapon);
  }

  _desiredGunReloadMs(weaponId, weaponRef=null){
    return StickWeaponState._desiredGunReloadMs.call(this, weaponId, weaponRef);
  }

  _gunFastReloadCost(weapon){
    return StickWeaponState._gunFastReloadCost.call(this, weapon);
  }

  _spendReloadCoins(amount){
    return StickWeaponState._spendReloadCoins.call(this, amount);
  }

  isGunFastReloadActive(weaponId=null){
    const id = weaponId || this.currentWeaponId();
    if(!id) return false;
    return !!(this.gunFastReload && this.gunFastReload[id]);
  }

  toggleGunFastReload(weaponId=null){
    if(this.isEnemy) return false;
    const id = weaponId || this.currentWeaponId();
    if(!id) return false;
    const weapon = WEAPONS[id];
    if(!weapon || weapon.kind !== 'gun') return false;
    if(!this.gunFastReload) this.gunFastReload = {};
    const next = !this.gunFastReload[id];
    this.gunFastReload[id] = next;
    const state = this._ensureGunState(id);
    if(state){
      const baseReload = this._baseGunReloadMs(weapon);
      const fastReload = this._fastGunReloadMs(weapon);
      state.reloadMs = baseReload;
      state.baseReloadMs = baseReload;
      state.fastReloadMs = fastReload;
      if(Array.isArray(state.bullets)){
        for(const slot of state.bullets){
          if(!slot) continue;
          if(slot.ready){
            slot.reloadDuration = next ? fastReload : baseReload;
            slot.fastReloadActive = false;
            slot.fastReloadCost = 0;
          }
        }
      }
    }
    if(this.world?.profile){
      if(!this.world.profile.fastReloadModes) this.world.profile.fastReloadModes = {};
      if(next){
        this.world.profile.fastReloadModes[id] = true;
      }else{
        delete this.world.profile.fastReloadModes[id];
      }
    }
    return next;
  }

  _syncGunStateOnEquip(){
    return StickWeaponState._syncGunStateOnEquip.call(this);
  }

  _ensureGunState(weaponId, forceReset=false){
    return StickWeaponState._ensureGunState.call(this, weaponId, forceReset);
  }

  gunAmmoState(weaponId=null){
    const id = weaponId || this.currentWeaponId();
    if(!id) return null;
    return this._ensureGunState(id);
  }

  _consumeGunRound(weapon, now){
    return StickWeaponState._consumeGunRound.call(this, weapon, now);
  }

  updateGunState(dt){
    const weaponId = this.currentWeaponId();
    const weapon = weaponId ? WEAPONS[weaponId] : null;
    if(!weapon || weapon.kind !== 'gun') return;
    const state = this._ensureGunState(weaponId);
    if(!state || !Array.isArray(state.bullets) || !state.bullets.length) return;
    const step = (dt && dt > 0) ? dt : (this.world?.lastDt && this.world.lastDt > 0 ? this.world.lastDt : 0);
    if(step <= 0) return;
    const msStep = step * 1000;
    const baseReload = this._baseGunReloadMs(weapon);
    const fastReload = this._fastGunReloadMs(weapon);
    state.reloadMs = baseReload;
    state.baseReloadMs = baseReload;
    state.fastReloadMs = fastReload;
    for(const slot of state.bullets){
      if(!slot || slot.ready) continue;
      const duration = slot.reloadDuration ?? (slot.fastReloadActive ? fastReload : baseReload);
      const remaining = (slot.regenRemaining ?? duration) - msStep;
      if(remaining <= 0){
        slot.ready = true;
        slot.regenRemaining = 0;
        slot.fastReloadActive = false;
        slot.fastReloadCost = 0;
        slot.reloadDuration = this._desiredGunReloadMs(weaponId, weapon);
      }else{
        slot.regenRemaining = remaining;
      }
    }
  }

  updateSpiritWeaponState(dt){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'spirit'){
      if(this.spiritState){
        this.spiritState = null;
      }
      return;
    }
    const state = this._ensureSpiritWeaponState(false);
    if(!state) return;
    const step = (dt && dt > 0) ? dt : (this.world?.lastDt && this.world.lastDt > 0 ? this.world.lastDt : 0);
    const speed = Math.max(0, weapon.orbitSpeed ?? 0.8);
    state.rotation = (state.rotation || 0) + speed * step;
    if(state.rotation > TAU || state.rotation < -TAU){
      state.rotation = state.rotation % TAU;
    }
    const regenMs = Math.max(120, weapon.orbRegenMs ?? state.regenMs ?? 1500);
    state.regenMs = regenMs;
    const msStep = Math.max(0, step) * 1000;
    for(const orb of state.orbs){
      if(!orb || orb.ready) continue;
      const remaining = (orb.regenRemaining ?? regenMs) - msStep;
      if(remaining <= 0){
        orb.ready = true;
        orb.regenRemaining = 0;
      }else{
        orb.regenRemaining = remaining;
      }
    }
  }

  _syncHalfSlotState(forceReset=false){
    return StickWeaponState._syncHalfSlotState.call(this, forceReset);
  }

  updateHalfSlotState(dt){
    if(this.dead){
      if(this.halfSlotState) this.halfSlotState = null;
      return;
    }
    const offhand = this.offhandItem();
    const info = offhand && offhand.type === 'offhand' ? OFFHAND_ITEMS?.[offhand.id] : null;
    if(!info || !info.kind){
      if(this.halfSlotState) this.halfSlotState = null;
      return;
    }
    const step = (dt && dt > 0) ? dt : (this.world?.lastDt && this.world.lastDt > 0 ? this.world.lastDt : 0);
    if(!(step > 0)) return;
    const state = this._syncHalfSlotState(false);
    if(!state) return;
    if(state.kind === 'drone'){
      this._updateHalfSlotDrone(state, info, step);
    }else if(state.kind === 'glyphOrbit'){
      this._updateHalfSlotGlyphOrbit(state, info, step);
    }
  }

  _updateHalfSlotDrone(state, info, step){
    return StickWeaponState._updateHalfSlotDrone.call(this, state, info, step);
  }

  _updateHalfSlotGlyphOrbit(state, info, step){
    return StickWeaponState._updateHalfSlotGlyphOrbit.call(this, state, info, step);
  }

  _spawnHalfSlotSpark(x, y, color, size=4){
    return StickWeaponState._spawnHalfSlotSpark.call(this, x, y, color, size);
  }

  _hasHalfSlotLineOfSight(origin, target, margin=8, distanceHint=null){
    return StickWeaponState._hasHalfSlotLineOfSight.call(this, origin, target, margin, distanceHint);
  }

  _lerpAngle(current, target, factor){
    return StickWeaponState._lerpAngle.call(this, current, target, factor);
  }

  _updateStatusEffects(now){
    let slowScale = 1;
    let chronoActive = false;
    if(this.slowUntil && now < this.slowUntil){
      const strength = this.slowMultiplier ?? 1;
      slowScale = Math.min(slowScale, strength);
    }else if(this.slowUntil && now >= this.slowUntil){
      this.slowUntil = 0;
      this.slowMultiplier = 1;
    }
    if(this.chronoFrozenUntil){
      if(now < this.chronoFrozenUntil){
        chronoActive = true;
        slowScale = Math.min(slowScale, 0.0001);
        if(this.iframesUntil && this.iframesUntil > now) this.iframesUntil = now;
      }else{
        this.chronoFrozenUntil = 0;
      }
    }
    if(this.chronoInvertedUntil && now >= this.chronoInvertedUntil){
      this.chronoInvertedUntil = 0;
    }
    if(this.chronoVulnerableUntil && now >= this.chronoVulnerableUntil){
      this.chronoVulnerableUntil = 0;
    }
    if(slowScale !== this.statusMoveScale){
      this.statusMoveScale = slowScale;
      if(this.baseMoveSpeed !== undefined){
        this.moveSpeed = this.baseMoveSpeed * slowScale;
      }
      if(this.baseMoveForce !== undefined){
        this.moveForce = this.baseMoveForce * slowScale;
      }
    }
    const necrotic = this.necroticState;
    if(necrotic){
      const expired = Number.isFinite(necrotic.expires) ? now >= necrotic.expires : false;
      const outOfTicks = Number.isFinite(necrotic.remainingTicks) ? necrotic.remainingTicks <= 0 : false;
      if(this.dead || expired || outOfTicks){
        this.necroticState = null;
      }else if(this.hp > 0){
        const interval = Math.max(120, Number.isFinite(necrotic.interval) ? necrotic.interval : 600);
        const nextTick = Number.isFinite(necrotic.nextTick) ? necrotic.nextTick : now + interval;
        if(now >= nextTick){
          const damage = Math.max(0, Number.isFinite(necrotic.damagePerTick) ? necrotic.damagePerTick : 0);
          if(damage > 0 && !this.invulnerable){
            const info = { element: 'necrotic', fromStatus: true };
            if(necrotic.ignoreResistances) info.ignoreResistances = true;
            this.takeDamage(damage, 0, 0, necrotic.source || null, info);
          }
          if(this.necroticState === necrotic){
            if(Number.isFinite(necrotic.remainingTicks)){
              necrotic.remainingTicks = Math.max(0, necrotic.remainingTicks - 1);
            }
            necrotic.nextTick = now + interval;
            if(Number.isFinite(necrotic.remainingTicks) && necrotic.remainingTicks <= 0){
              this.necroticState = null;
            }
          }
        }
      }
    }
    this.pruneAuraSources(now);
    this.pruneAuraVisuals(now);
    this.pruneProjectileShields(now);
    this._applyChronoStasisState(chronoActive);
  }

  cacheBaseStatsFromCurrent(opts={}){
    const useRaw = !!opts.useRaw;
    const attack = Number.isFinite(this.attack) ? this.attack : (this.attackBase ?? 0);
    const defense = Number.isFinite(this.defense) ? this.defense : (this.defenseBase ?? 0);
    const maxHp = Number.isFinite(this.maxHp) ? this.maxHp : (this.maxHpBase ?? 0);
    const attackDiv = useRaw ? 1 : ((this._auraAttackMultiplier && this._auraAttackMultiplier > 0) ? this._auraAttackMultiplier : 1);
    const defenseDiv = useRaw ? 1 : ((this._auraDefenseMultiplier && this._auraDefenseMultiplier > 0) ? this._auraDefenseMultiplier : 1);
    const healthDiv = useRaw ? 1 : ((this._auraHealthMultiplier && this._auraHealthMultiplier > 0) ? this._auraHealthMultiplier : 1);
    this._baseAttackComputed = attack / (attackDiv || 1);
    this._baseDefenseComputed = defense / (defenseDiv || 1);
    this._baseMaxHpComputed = maxHp / (healthDiv || 1);
  }

  _applyAuraStatScaling(){
    const baseAttack = Number.isFinite(this._baseAttackComputed) ? this._baseAttackComputed : (this.attackBase ?? 0);
    const baseDefense = Number.isFinite(this._baseDefenseComputed) ? this._baseDefenseComputed : (this.defenseBase ?? 0);
    const baseMaxHp = Number.isFinite(this._baseMaxHpComputed) ? this._baseMaxHpComputed : (this.maxHpBase ?? this.maxHp ?? 0);
    const prevMax = Number.isFinite(this.maxHp) ? this.maxHp : baseMaxHp;
    const prevHp = Number.isFinite(this.hp) ? this.hp : prevMax;
    const ratio = prevMax > 0 ? clamp(prevHp / prevMax, 0, 1) : 1;
    const nextMax = baseMaxHp * this._auraHealthMultiplier;
    this.attack = baseAttack * this._auraAttackMultiplier;
    this.defense = baseDefense * this._auraDefenseMultiplier;
    this.maxHp = nextMax;
    this.hp = Math.max(0, Math.min(nextMax, nextMax * ratio));
  }

  _recomputeAuraMultipliers(){
    let attack = 1;
    let defense = 1;
    let health = 1;
    if(this.auraSources instanceof Map){
      for(const entry of this.auraSources.values()){
        if(!entry) continue;
        const atk = Number.isFinite(entry.attack) && entry.attack > 0 ? entry.attack : 1;
        const def = Number.isFinite(entry.defense) && entry.defense > 0 ? entry.defense : 1;
        const hp = Number.isFinite(entry.health) && entry.health > 0 ? entry.health : 1;
        attack *= atk;
        defense *= def;
        health *= hp;
      }
    }
    this._auraAttackMultiplier = attack;
    this._auraDefenseMultiplier = defense;
    this._auraHealthMultiplier = health;
    this._applyAuraStatScaling();
  }

  applyAuraSource(sourceId, multipliers, now, ttlMs=240){
    if(!sourceId || !multipliers) return;
    if(!(this.auraSources instanceof Map)) this.auraSources = new Map();
    const attack = Number.isFinite(multipliers.attack) && multipliers.attack > 0 ? multipliers.attack : 1;
    const defense = Number.isFinite(multipliers.defense) && multipliers.defense > 0 ? multipliers.defense : 1;
    const health = Number.isFinite(multipliers.health) && multipliers.health > 0 ? multipliers.health : 1;
    const entry = this.auraSources.get(sourceId) || {};
    entry.attack = attack;
    entry.defense = defense;
    entry.health = health;
    entry.updatedAt = Number.isFinite(now) ? now : nowMs();
    entry.ttl = Math.max(30, Number.isFinite(ttlMs) ? ttlMs : 240);
    this.auraSources.set(sourceId, entry);
    this._recomputeAuraMultipliers();
  }

  clearAuraSource(sourceId){
    if(!sourceId || !(this.auraSources instanceof Map) || !this.auraSources.has(sourceId)) return;
    this.auraSources.delete(sourceId);
    this._recomputeAuraMultipliers();
    this.clearAuraVisual(sourceId);
  }

  pruneAuraSources(now){
    if(!(this.auraSources instanceof Map) || this.auraSources.size === 0) return;
    const current = Number.isFinite(now) ? now : nowMs();
    let changed = false;
    for(const [key, entry] of this.auraSources.entries()){
      const ttl = Number.isFinite(entry?.ttl) ? entry.ttl : 0;
      const updated = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : 0;
      if(ttl > 0 && current - updated > ttl){
        this.auraSources.delete(key);
        this.clearAuraVisual(key);
        changed = true;
      }
    }
    if(changed){
      this._recomputeAuraMultipliers();
    }
  }

  applyProjectileShield(sourceId, options={}){
    if(!sourceId) return;
    const config = options.config || {};
    const now = Number.isFinite(options.now) ? options.now : nowMs();
    const ttl = Math.max(60, Number.isFinite(options.ttl) ? options.ttl : 240);
    const owner = options.owner || null;
    const ownerMax = owner && Number.isFinite(owner.maxHp)
      ? owner.maxHp
      : (owner && Number.isFinite(owner.hp) ? owner.hp : 0);
    const baseMax = Number.isFinite(config.baseMaxHp) ? Math.max(0, config.baseMaxHp) : 0;
    const factor = Number.isFinite(config.maxHpFactor) ? Math.max(0, config.maxHpFactor) : 1;
    const maxHp = Math.max(0, (ownerMax > 0 ? ownerMax : baseMax) * factor);
    if(!(maxHp > 0)) return;
    if(!(this.projectileShields instanceof Map)) this.projectileShields = new Map();
    const existing = this.projectileShields.get(sourceId) || null;
    const regenPercent = Number.isFinite(config.regenPercent) ? Math.max(0, config.regenPercent) : 0.05;
    let entry = existing || { hp: maxHp, maxHp, broken: false, hitPulse: 0 };
    const prevMax = Number.isFinite(entry.maxHp) ? entry.maxHp : 0;
    entry.maxHp = maxHp;
    if(!existing){
      entry.hp = maxHp;
      entry.broken = false;
    }else if(prevMax > 0 && prevMax !== maxHp){
      const ratio = clamp(prevMax > 0 ? (entry.hp ?? prevMax) / prevMax : 1, 0, 1);
      entry.hp = maxHp * ratio;
    }else if(!Number.isFinite(entry.hp)){
      entry.hp = maxHp;
    }
    entry.regenPercent = regenPercent;
    entry.updatedAt = now;
    entry.ttl = ttl;
    if(config.color) entry.color = config.color;
    if(config.outlineColor) entry.outlineColor = config.outlineColor;
    if(config.hitColor) entry.hitColor = config.hitColor;
    if(config.textColor) entry.textColor = config.textColor;
    if(Number.isFinite(config.minRadius)) entry.minRadius = Math.max(0, config.minRadius);
    if(entry.hp > entry.maxHp) entry.hp = entry.maxHp;
    if(entry.hp <= 0){
      entry.hp = 0;
      entry.broken = true;
    }
    this.projectileShields.set(sourceId, entry);
  }

  clearProjectileShield(sourceId){
    if(!sourceId || !(this.projectileShields instanceof Map)) return;
    if(this.projectileShields.delete(sourceId) && this.projectileShields.size === 0){
      this.projectileShields = null;
    }
  }

  pruneProjectileShields(now){
    if(!(this.projectileShields instanceof Map) || this.projectileShields.size === 0) return;
    const current = Number.isFinite(now) ? now : nowMs();
    let changed = false;
    for(const [key, entry] of this.projectileShields.entries()){
      const ttl = Number.isFinite(entry?.ttl) ? entry.ttl : 0;
      const updated = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : 0;
      if(ttl > 0 && current - updated > ttl){
        this.projectileShields.delete(key);
        changed = true;
        continue;
      }
      if(!entry || !(entry.maxHp > 0)){
        this.projectileShields.delete(key);
        changed = true;
      }
    }
    if(changed && this.projectileShields.size === 0){
      this.projectileShields = null;
    }
  }

  _updateProjectileShields(dt, now){
    if(!(this.projectileShields instanceof Map) || this.projectileShields.size === 0) return;
    const step = Math.max(0, Number(dt) || 0);
    for(const [key, entry] of this.projectileShields.entries()){
      if(!entry) continue;
      const maxHp = Math.max(0, Number(entry.maxHp) || 0);
      if(!(maxHp > 0)) continue;
      const regenPercent = Math.max(0, Number(entry.regenPercent) || 0);
      if(step > 0 && regenPercent > 0){
        const regen = maxHp * regenPercent * step;
        const nextHp = Math.min(maxHp, Math.max(0, (entry.hp ?? maxHp) + regen));
        entry.hp = nextHp;
        if(entry.broken && nextHp >= maxHp - 1e-4){
          entry.hp = maxHp;
          entry.broken = false;
        }
      }else if(!Number.isFinite(entry.hp)){
        entry.hp = maxHp;
      }
      if(entry.hp <= 0 && !entry.broken){
        entry.hp = 0;
        entry.broken = true;
      }
      if(entry.hitPulse){
        entry.hitPulse = Math.max(0, entry.hitPulse - step * 2.6);
      }
    }
  }

  absorbProjectileHit(projectile, incomingDamage, context={}){
    if(!(this.projectileShields instanceof Map) || this.projectileShields.size === 0) return null;
    const now = nowMs();
    this.pruneProjectileShields(now);
    if(!(this.projectileShields instanceof Map) || this.projectileShields.size === 0) return null;
    let bestKey = null;
    let bestEntry = null;
    for(const [key, entry] of this.projectileShields.entries()){
      if(!entry || entry.broken) continue;
      if(!(entry.maxHp > 0) || !(entry.hp > 0)) continue;
      if(!bestEntry || entry.hp > bestEntry.hp){
        bestEntry = entry;
        bestKey = key;
      }
    }
    if(!bestEntry || bestKey === null) return null;
    const damage = Math.max(0, Number(incomingDamage) || 0);
    if(!(damage > 0)){
      bestEntry.hitPulse = Math.min(1, (bestEntry.hitPulse || 0) + 0.5);
      return { absorbed: true, remainingDamage: 0 };
    }
    const currentHp = Number.isFinite(bestEntry.hp) ? bestEntry.hp : bestEntry.maxHp;
    const remaining = Math.max(0, currentHp - damage);
    const leftover = Math.max(0, damage - currentHp);
    bestEntry.hp = remaining;
    if(bestEntry.hp <= 0){
      bestEntry.hp = 0;
      bestEntry.broken = true;
      bestEntry.brokenAt = now;
    }
    bestEntry.hitPulse = Math.min(1, (bestEntry.hitPulse || 0) + 0.75);
    this.projectileShields.set(bestKey, bestEntry);
    if(leftover <= 0){
      return { absorbed: true, remainingDamage: 0 };
    }
    return { absorbed: true, remainingDamage: leftover };
  }

  addAuraVisual(sourceId, visual={}){
    if(!sourceId || !visual) return;
    if(!(this._auraVisuals instanceof Map)) this._auraVisuals = new Map();
    const entry = this._auraVisuals.get(sourceId) || {};
    if(visual.color) entry.color = visual.color;
    if(visual.kind) entry.kind = visual.kind;
    const intensityRaw = Number.isFinite(visual.intensity) ? visual.intensity : null;
    const nextIntensity = intensityRaw !== null ? Math.max(0, intensityRaw) : (entry.intensity ?? 1);
    entry.intensity = nextIntensity;
    const nowTime = Number.isFinite(visual.updatedAt) ? visual.updatedAt : nowMs();
    entry.updatedAt = nowTime;
    entry.ttl = Math.max(30, Number.isFinite(visual.ttl) ? visual.ttl : 240);
    this._auraVisuals.set(sourceId, entry);
  }

  clearAuraVisual(sourceId){
    if(!sourceId || !(this._auraVisuals instanceof Map)) return;
    this._auraVisuals.delete(sourceId);
    if(this._auraVisuals.size === 0) this._auraVisuals = null;
  }

  pruneAuraVisuals(now){
    if(!(this._auraVisuals instanceof Map) || this._auraVisuals.size === 0) return;
    const current = Number.isFinite(now) ? now : nowMs();
    for(const [key, entry] of this._auraVisuals.entries()){
      const ttl = Number.isFinite(entry?.ttl) ? entry.ttl : 0;
      const updated = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : 0;
      if(ttl > 0 && current - updated > ttl){
        this._auraVisuals.delete(key);
      }
    }
    if(this._auraVisuals.size === 0) this._auraVisuals = null;
  }

  resetCombo(resetWeapon=false){
    this.comboStep = 0;
    this.comboQueuedStep = 0;
    this.comboWindowStart = 0;
    this.comboWindowUntil = 0;
    this.comboAnim = null;
    this.attackLockUntil = 0;
    this.backflipActive = false;
    this.backflipUntil = 0;
    this.backflipLandingTime = 0;
    this.weaponReachMultiplier = 1;
    if(resetWeapon){
      this.weaponVisible = false;
      this.weaponHand = null;
      this.weaponSwingUntil = 0;
      this.cancelBowCharge();
    }
  }

  updateComboState(now){
    if(this.comboQueuedStep > 0 && now >= this.attackLockUntil){
      const next = this.comboQueuedStep;
      this.comboQueuedStep = 0;
      this.beginComboAttack(next, now);
    }
    if(this.comboAnim && now >= this.comboAnim.end){
      this.comboAnim = null;
      if(!this.backflipActive){
        this.weaponVisible = false;
        this.weaponHand = null;
        this.weaponReachMultiplier = 1;
      }
    }
    if(this.comboStep > 0 && now > this.comboWindowUntil && now >= this.weaponCooldownUntil && !this.comboQueuedStep && !this.backflipActive){
      this.comboStep = 0;
      this.comboWindowStart = 0;
      this.comboWindowUntil = 0;
      this.comboQueuedStep = 0;
      this.comboAnim = null;
      this.weaponVisible = false;
      this.weaponHand = null;
      this.weaponReachMultiplier = 1;
      this.weaponSwingUntil = 0;
    }
    if(this.backflipActive){
      this.softMode = true;
      if(this.isGrounded && now >= this.backflipLandingTime){
        this.backflipActive = false;
        this.softMode = false;
        this.comboStep = 0;
        this.comboWindowStart = 0;
        this.comboWindowUntil = 0;
        this.comboQueuedStep = 0;
        this.weaponVisible = false;
        this.weaponHand = null;
        this.weaponReachMultiplier = 1;
        this.weaponSwingUntil = 0;
      }
    }
  }

  queueComboStep(step, now){
    if(step <= this.comboStep) return;
    if(now >= this.attackLockUntil){
      this.comboQueuedStep = 0;
      this.beginComboAttack(step, now);
    }else{
      this.comboQueuedStep = step;
    }
  }

  updatePunchState(now){
    const state = this._ensurePunchState(false);
    if(!state || !state.hands) return;
    const world = this.world;
    const highGraphics = isHighGraphicsEnabled(world);
    for(const handName of ['handL','handR']){
      const info = state.hands[handName];
      if(!info) continue;
      if(info.activeUntil && now < info.activeUntil){
        info.active = true;
        info.punching = true;
        if(highGraphics && info.forward){
          if(!Array.isArray(info.trail)) info.trail = [];
          const point = this.pointsByName[handName];
          if(point){
            const last = info.trail[info.trail.length - 1];
            if(!last || now - last.time > 18){
              info.trail.push({ x: point.x, y: point.y, time: now });
            }
          }
          const life = info.trailLife ?? 180;
          while(info.trail.length && now - info.trail[0].time > life){
            info.trail.shift();
          }
          const max = info.trailMax ?? 14;
          if(info.trail.length > max){
            info.trail.splice(0, info.trail.length - max);
          }
        }else if(Array.isArray(info.trail)){
          info.trail.length = 0;
        }
      }else{
        info.active = false;
        info.punching = false;
        info.forward = false;
        if(Array.isArray(info.trail)){
          const life = info.trailLife ?? 180;
          while(info.trail.length && now - info.trail[0].time > life){
            info.trail.shift();
          }
        }
        if(info.activeUntil && now >= info.activeUntil){
          info.activeUntil = 0;
        }
      }
    }
  }

  updateBoxingGloveState(now, dt){
    const weapon = this.weapon();
    const glove = weapon?.boxingGlove || null;
    if(!glove){
      if(this.gloveState){
        this.gloveState = null;
      }
      return;
    }
    const weaponId = this.currentWeaponId();
    let state = this.gloveState;
    const tau = Math.PI * 2;
    if(!state || state.weaponId !== weaponId || !state.hands){
      state = {
        weaponId,
        lastUpdate: now,
        hands: {
          handL: { angle: Math.random() * tau },
          handR: { angle: Math.random() * tau }
        }
      };
      this.gloveState = state;
    }
    if(!state.hands.handL) state.hands.handL = { angle: Math.random() * tau };
    if(!state.hands.handR) state.hands.handR = { angle: Math.random() * tau };
    const elapsed = dt && dt > 0
      ? dt
      : (state.lastUpdate ? Math.max(0, (now - state.lastUpdate) / 1000) : 0);
    state.lastUpdate = now;
    const orbit = glove.voidOrbit || null;
    if(orbit){
      const spin = Number.isFinite(orbit.spin) ? orbit.spin : 3.8;
      for(const handName of ['handL','handR']){
        const info = state.hands[handName];
        if(!info) continue;
        let angle = Number.isFinite(info.angle) ? info.angle : Math.random() * tau;
        angle += spin * elapsed;
        angle %= tau;
        if(angle < 0) angle += tau;
        info.angle = angle;
      }
    }
  }

  punchArmOverrides(now){
    const state = this.punchState;
    if(!state || !state.hands) return null;
    const pelvis = this.pelvis();
    if(!pelvis) return null;
    const overrides = {};
    for(const handName of ['handL','handR']){
      const info = state.hands[handName];
      if(!info || !info.activeUntil || now > info.activeUntil) continue;
      const duration = info.duration || 200;
      const elapsed = now - (info.start || now);
      const progress = clamp(duration > 0 ? elapsed / duration : 1, 0, 1);
      const eased = easeOutCubic ? easeOutCubic(progress) : progress;
      const baseOffset = (this.rigOffsets?.[handName])
        || (RIG_CONFIG.offsets?.[handName])
        || { x: 0, y: 0 };
      const angle = info.angle ?? (this.dir >= 0 ? 0 : Math.PI);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      const normalX = -dirY;
      const normalY = dirX;
      const reach = 120 * STICK_SCALE;
      const extend = reach * (0.45 + 0.55 * eased);
      const handX = pelvis.x + baseOffset.x + dirX * extend;
      const handY = pelvis.y + baseOffset.y + dirY * extend * 0.7 - 6 * STICK_SCALE;
      overrides[handName] = { x: handX, y: handY };
      const elbowName = handName === 'handL' ? 'elbowL' : 'elbowR';
      const elbowBase = (this.rigOffsets?.[elbowName])
        || (RIG_CONFIG.offsets?.[elbowName])
        || { x: 0, y: 0 };
      const elbowReach = reach * 0.55;
      const elbowSide = handName === 'handL' ? -1 : 1;
      const lateral = 36 * STICK_SCALE * elbowSide;
      const elbowX = pelvis.x + elbowBase.x + dirX * elbowReach - normalX * lateral;
      const elbowY = pelvis.y + elbowBase.y + dirY * elbowReach * 0.6 - normalY * lateral * 0.25;
      overrides[elbowName] = { x: elbowX, y: elbowY };
    }
    return Object.keys(overrides).length ? overrides : null;
  }

  performPunch(now, aimX, aimY, angle, weapon=null){
    if(this.dead) return;
    const state = this._ensurePunchState(false);
    const hands = state?.hands;
    if(!hands) return;
    const world = this.world;
    if(!world) return;
    const glove = weapon?.boxingGlove || null;
    this.resetCombo(true);
    const forwardHand = this.dir >= 0 ? 'handR' : 'handL';
    const backHand = this.dir >= 0 ? 'handL' : 'handR';
    let hand = forwardHand;
    if(this._lastPunchHand === hand) hand = backHand;
    if(hand !== forwardHand && hand !== backHand) hand = forwardHand;
    this._lastPunchHand = hand;
    const info = hands[hand];
    if(info){
      const duration = glove?.duration ?? 240;
      info.start = now;
      info.duration = duration;
      info.activeUntil = now + duration;
      info.angle = angle;
      info.forward = true;
      info.punching = true;
      if(glove?.trailLife !== undefined) info.trailLife = glove.trailLife;
      if(glove?.trailMax !== undefined) info.trailMax = glove.trailMax;
      if(Array.isArray(info.trail)) info.trail.length = 0;
      const otherHand = hand === 'handL' ? 'handR' : 'handL';
      const otherInfo = hands[otherHand];
      if(otherInfo){
        otherInfo.punching = false;
        otherInfo.forward = false;
      }
    }
    this.weaponVisible = false;
    this.weaponHand = null;
    this.weaponSwingUntil = 0;
    const cooldown = glove?.cooldown ?? 320;
    const lockDuration = glove?.lockDuration ?? 140;
    this.weaponCooldownUntil = now + cooldown;
    this.attackLockUntil = now + lockDuration;
    const baseStatDamage = Math.max(1, Math.round(this.attackBase ?? this.attack ?? 10));
    const baseWeaponDamage = Number.isFinite(weapon?.dmg) ? weapon.dmg : 0;
    const damageBase = glove?.damage !== undefined ? glove.damage : baseStatDamage + baseWeaponDamage;
    const damage = Math.max(1, Math.round(damageBase * (glove?.damageMultiplier ?? 1)));
    const punchRange = glove?.range ?? 54;
    const punchArc = glove?.arc ?? 0.9;
    const punchKnock = glove?.knock ?? 140;
    const rangeMultiplier = glove?.rangeMultiplier ?? 0.6;
    const element = glove?.element || weapon?.element || this.element;
    const punchWeapon = { range: punchRange, arc: punchArc, dmg: damage, knock: punchKnock, kind: 'melee', element };
    attackMelee(this, punchWeapon, world, { direction: this.dir, aimAngle: angle, arc: punchArc, rangeMultiplier });
    const handPoint = this.pointsByName[hand];
    const elbowName = hand === 'handL' ? 'elbowL' : 'elbowR';
    const elbowPoint = this.pointsByName[elbowName];
    if(glove?.fireWave && typeof shootProjectile === 'function'){
      const fw = glove.fireWave;
      const basePoint = handPoint || this.center();
      if(basePoint){
        const offset = fw.offset ?? 16;
        const origin = {
          x: basePoint.x + Math.cos(angle) * offset,
          y: basePoint.y + Math.sin(angle) * offset
        };
        const waveDamageBase = fw.damage !== undefined ? fw.damage : damage;
        const waveDamage = Math.max(1, Math.round(waveDamageBase * (fw.damageMultiplier ?? 1)));
        const projectileOpts = {
          origin,
          angle,
          speed: fw.speed ?? 520,
          ttl: fw.ttl ?? 440,
          damage: waveDamage,
          element: fw.element || 'fire',
          color: fw.color || weapon?.color,
          fadeRate: fw.fadeRate ?? 1.4,
          ignoreTerrainCollision: fw.ignoreTerrainCollision !== false
        };
        if(fw.edgeColor) projectileOpts.edgeColor = fw.edgeColor;
        if(fw.hitRadius !== undefined) projectileOpts.hitRadius = fw.hitRadius;
        if(fw.startRadius !== undefined) projectileOpts.radius = fw.startRadius;
        else if(fw.radius !== undefined) projectileOpts.radius = fw.radius;
        if(fw.growth !== undefined) projectileOpts.waveGrowth = fw.growth;
        if(fw.maxRadius !== undefined) projectileOpts.waveMaxRadius = fw.maxRadius;
        if(fw.waveWidth !== undefined) projectileOpts.waveWidth = fw.waveWidth;
        if(fw.waveWidthStart !== undefined) projectileOpts.waveWidthStart = fw.waveWidthStart;
        if(fw.waveWidthGrowth !== undefined) projectileOpts.waveWidthGrowth = fw.waveWidthGrowth;
        if(fw.waveLengthScale !== undefined) projectileOpts.waveLengthScale = fw.waveLengthScale;
        if(fw.alpha !== undefined) projectileOpts.alpha = fw.alpha;
        if(fw.igniteRadius !== undefined) projectileOpts.igniteRadius = fw.igniteRadius;
        shootProjectile(this, weapon || punchWeapon, fw.projectile || 'pyreWave', projectileOpts, world);
      }
    }
    if(glove?.voidPunch && typeof spawnVoidSingularity === 'function'){
      const vp = glove.voidPunch;
      const basePoint = handPoint || this.center();
      if(basePoint){
        const offset = vp.offset ?? 18;
        const originX = basePoint.x + Math.cos(angle) * offset;
        const originY = basePoint.y + Math.sin(angle) * offset;
        const singularityDamageBase = vp.damage !== undefined ? vp.damage : damage;
        const singularityDamage = Math.max(1, Math.round(singularityDamageBase * (vp.damageMultiplier ?? 1)));
        spawnVoidSingularity(world, this, originX, originY, {
          radius: vp.radius ?? 32,
          damage: singularityDamage,
          pullRadius: vp.pullRadius ?? 0,
          pullStrength: vp.pullStrength ?? 0,
          duration: vp.duration ?? 640,
          tickInterval: vp.tickInterval ?? 0.24,
          fadeDuration: vp.fadeDuration ?? 360,
          color: vp.color || weapon?.color || '#a48cff'
        });
      }
    }
    const dampen = glove?.handDampen ?? 0.6;
    if(handPoint){
      // Dampen any residual arm velocity so the punch animation doesn't inject
      // momentum into the whole rig and launch the stickman forward.
      handPoint.vx *= dampen;
      handPoint.vy *= dampen;
    }
    if(elbowPoint){
      elbowPoint.vx *= dampen;
      elbowPoint.vy *= dampen;
    }
  }

  activateWeaponSpecial(world){
    const weapon = this.weapon();
    if(!weapon) return false;
    if(weapon.timeBlade){
      return this._activateTimeBladeSpecial(world, weapon);
    }
    return false;
  }

  _ensureTimeBladeState(){
    if(!this._timeBladeState || typeof this._timeBladeState !== 'object'){
      this._timeBladeState = { cooldownUntil: 0, activeUntil: 0 };
    }
    return this._timeBladeState;
  }

  _activateTimeBladeSpecial(world, weapon){
    if(!world || !weapon || !weapon.timeBlade) return false;
    const state = this._ensureTimeBladeState();
    const now = nowMs();
    if(state.cooldownUntil && now < state.cooldownUntil) return false;
    const config = weapon.timeBlade;
    const duration = Math.max(100, config.specialDurationMs ?? 3000);
    const cooldown = Math.max(duration, config.specialCooldownMs ?? 15000);
    const factor = clamp(config.specialSlowFactor ?? 0.5, 0.05, 1);
    const existing = world.timeSlowState;
    if(existing && existing.until && now < existing.until && existing.owner && existing.owner !== this){
      return false;
    }
    world.timeSlowState = {
      owner: this,
      factor,
      until: now + duration,
      startedAt: now
    };
    state.cooldownUntil = now + cooldown;
    state.activeUntil = now + duration;
    this.weaponLastActiveTime = now;
    if(typeof renderHUD === 'function') renderHUD(world);
    return true;
  }

  _scheduleTimeBladeEcho(now, weapon, swingOpts){
    if(!weapon || !weapon.timeBlade) return;
    const world = this.world;
    if(!world) return;
    const config = weapon.timeBlade;
    const delay = Math.max(0, config.echoDelayMs ?? config.trailDelayMs ?? 3000);
    if(!(delay > 0)) return;
    const baseRange = Number.isFinite(swingOpts.baseRange) ? swingOpts.baseRange : (weapon.range ?? 42);
    const baseDamage = Number.isFinite(swingOpts.baseDamage) ? swingOpts.baseDamage : (weapon.dmg ?? 0);
    const baseKnock = Number.isFinite(swingOpts.baseKnock) ? swingOpts.baseKnock : (weapon.knock ?? 160);
    const entry = {
      stick: this,
      triggerAt: now + delay,
      weapon: {
        range: baseRange,
        dmg: baseDamage,
        knock: baseKnock,
        arc: weapon.arc,
        color: weapon.color,
        highlightColor: weapon.highlightColor
      },
      options: {
        damageMultiplier: swingOpts.damageMultiplier,
        rangeMultiplier: swingOpts.rangeMultiplier,
        knockMultiplier: swingOpts.knockMultiplier,
        fullArc: swingOpts.fullArc,
        aimAngle: swingOpts.aimAngle,
        arc: swingOpts.arc,
        direction: swingOpts.direction,
        centerOverride: swingOpts.centerOverride,
        baseRange,
        baseDamage,
        baseKnock
      },
      config
    };
    if(!Array.isArray(world.timeBladeEchoes)) world.timeBladeEchoes = [];
    world.timeBladeEchoes.push(entry);
  }

  trySummonerRelease(world){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'summoner') return false;
    const state = this._ensureSummonerState(false);
    if(!state) return false;
    const now = nowMs();
    if(state.specialCooldownUntil && now < state.specialCooldownUntil) return false;
    const souls = Math.floor(state.soulCount || 0);
    if(!(souls > 0)) return false;
    if(typeof spawnSummonerGuardian !== 'function') return false;
    const summon = spawnSummonerGuardian(this, souls, weapon, { world, aim: world?.input?.aim });
    if(!summon) return false;
    state.soulCount = 0;
    state.specialCooldownUntil = now + Math.max(weapon.empowerCooldown ?? 3200, 400);
    this._dismissSummonerOrbs(true);
    this.weaponVisible = true;
    this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    this.weaponSwingUntil = now + Math.max(weapon.castDuration ?? 360, 220);
    this.weaponCooldownUntil = now + Math.max(weapon.empowerCooldown ?? 3200, 800);
    this.weaponLastActiveTime = now;
    return true;
  }

  beginComboAttack(step, now){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'melee') return;
    const swingBase = weapon.swingDuration ?? 220;
    const cooldown = weapon.cooldown ?? 420;
    const weaponId = this.currentWeaponId();
    const rigInfo = this._rigInfoForWeapon(weaponId);
    const swordConfig = rigInfo?.type === 'sword' ? swordVariantConfig(rigInfo.variant) : null;
    const storedAim = this.lastAttackAim;
    const center = this.center();
    const attackCenter = center ? { x: center.x, y: center.y } : null;
    const origin = center || {
      x: this.pointsByName?.pelvis?.x ?? 0,
      y: this.pointsByName?.pelvis?.y ?? 0
    };
    const aimAngle = Number.isFinite(storedAim?.angle) ? storedAim.angle : null;
    if(aimAngle !== null){
      this.dir = Math.cos(aimAngle) >= 0 ? 1 : -1;
    }
    const baseFacingAngle = this.dir >= 0 ? 0 : Math.PI;
    const effectiveAimAngle = aimAngle !== null ? aimAngle : baseFacingAngle;
    const attackDirection = this.dir;
    const defaultAimDist = weapon.range ? weapon.range * 2.4 : 160;
    const aimPointX = Number.isFinite(storedAim?.x)
      ? storedAim.x
      : (origin.x + Math.cos(effectiveAimAngle) * defaultAimDist);
    const aimPointY = Number.isFinite(storedAim?.y)
      ? storedAim.y
      : (origin.y + Math.sin(effectiveAimAngle) * defaultAimDist);
    const angleOffset = effectiveAimAngle - baseFacingAngle;
    const swingHand = swordConfig ? swordGripHandForDir(this.dir, swordConfig) : (this.dir >= 0 ? 'handL' : 'handR');
    const swingElbow = swordConfig ? swordGripElbowForDir(this.dir, swordConfig) : (swingHand === 'handL' ? 'elbowL' : 'elbowR');
    const altHand = swordConfig ? swordAltHandForDir(this.dir, swordConfig) : (swingHand === 'handL' ? 'handR' : 'handL');
    const altElbow = swordConfig ? swordAltElbowForDir(this.dir, swordConfig) : (altHand === 'handL' ? 'elbowL' : 'elbowR');
    let duration = swingBase * 1.24;
    let damageMultiplier = 1.1;
    let rangeMultiplier = 1.05;
    let knockMultiplier = 1;
    let fullArc = false;
    if(step === 1){
      duration = swingBase * 1.24;
      damageMultiplier = 1.12;
      rangeMultiplier = 1.05;
    }else if(step === 2){
      duration = swingBase * 1.58;
      damageMultiplier = 1.45;
      rangeMultiplier = 1.18;
      knockMultiplier = 1.18;
      fullArc = true;
    }else if(step === 3){
      duration = swingBase * 2.24;
      damageMultiplier = 2.05;
      rangeMultiplier = 1.32;
      knockMultiplier = 1.32;
      fullArc = true;
    }
    const pelvis = this.pelvis();
    const handPoint = this.pointsByName[swingHand];
    const elbowPoint = this.pointsByName[swingElbow];
    let startHand = null;
    let startElbow = null;
    if(pelvis && handPoint){
      const rel = { x: handPoint.x - pelvis.x, y: handPoint.y - pelvis.y };
      startHand = angleOffset !== 0 ? rotatePoint(rel, -angleOffset) : rel;
    }
    if(pelvis && elbowPoint){
      const rel = { x: elbowPoint.x - pelvis.x, y: elbowPoint.y - pelvis.y };
      startElbow = angleOffset !== 0 ? rotatePoint(rel, -angleOffset) : rel;
    }
    const facingRight = this.dir >= 0;
    let spinDir = facingRight ? -1 : 1;
    if(step === 2){
      spinDir = facingRight ? 1 : -1;
    }else if(step === 3){
      spinDir = facingRight ? -1 : 1;
    }
    const spinCount = step === 3 ? 2 : (step === 2 ? 1 : 0);
    const spinRadius = swordConfig?.spinRadius ?? 1.06;
    const spinElbowRadius = swordConfig?.spinElbowRadius ?? 0.9;
    const spinLift = swordConfig?.spinLift ?? 18;
    const spinLean = swordConfig?.spinLean ?? 8;
    this.weaponVisible = true;
    this.weaponHand = swingHand;
    this.weaponReachMultiplier = rangeMultiplier;
    this.weaponSwingUntil = now + duration;
    this._extendWeaponTerrainIgnore(now + duration + 1000);
    this.comboAnim = {
      step,
      start: now,
      end: now + duration,
      hand: swingHand,
      elbow: swingElbow,
      facing: this.dir,
      aimAngle: effectiveAimAngle,
      altHand,
      altElbow,
      startHand,
      startElbow,
      spinDir,
      spinCount,
      spinRadius,
      spinElbowRadius,
      spinLift,
      spinLean,
      aimX: aimPointX,
      aimY: aimPointY
    };
    if(this.weaponRig && this.weaponRig.type === 'sword'){
      this.weaponRig.comboSpinState = null;
    }
    const lockFactor = step === 3 ? 1 : 0.8;
    this.attackLockUntil = now + duration * lockFactor;
    this.comboStep = step;
    if(step === 1){
      this.comboWindowStart = now;
      this.comboWindowUntil = now + COMBO_WINDOW_MS;
    }else if(step === 2){
      this.comboWindowStart = now + cooldown;
      this.comboWindowUntil = this.comboWindowStart + COMBO_WINDOW_MS;
    }else{
      this.comboWindowStart = 0;
      this.comboWindowUntil = 0;
    }
    this.weaponCooldownUntil = now + (step === 3 ? cooldown * 1.45 : cooldown);
    this.comboQueuedStep = 0;
    const arc = fullArc ? TAU : Math.PI;
    const swingOptions = {
      damageMultiplier,
      rangeMultiplier,
      knockMultiplier,
      fullArc,
      aimAngle: effectiveAimAngle,
      arc,
      direction: attackDirection,
      centerOverride: attackCenter,
      baseRange: weapon.range,
      baseDamage: weapon.dmg,
      baseKnock: weapon.knock
    };
    attackMelee(this, weapon, this.world, swingOptions);
    this._scheduleTimeBladeEcho(now, weapon, swingOptions);
  }

  releaseAttack(tx, ty){
    const weapon = this.weapon();
    if(!weapon) return;
    if(weapon.kind === 'staff'){
      if(this.staffState){
        StickWeaponState._releaseStaffSouls.call(this, 'release');
      }
      if(this.staffState?.firing) this._stopStaffBeam();
      return;
    }
    if(weapon.kind === 'bow' && !this.isEnemy){
      if(!this.bowCharging) return;
      this.finishBowCharge(nowMs(), tx, ty);
    }
  }

  startBowCharge(now, tx, ty){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'bow') return;
    this.bowCharging = true;
    this.bowChargeStart = now;
    this.bowChargeWeaponId = this.currentWeaponId();
    const origin = this.center();
    const aimX = tx ?? (origin.x + this.dir * 220);
    const aimY = ty ?? origin.y;
    const dir = Math.sign(aimX - origin.x) || this.dir;
    this.dir = dir >= 0 ? 1 : -1;
    this.bowChargeAim = { x: aimX, y: aimY };
    this.weaponVisible = true;
    this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    this.weaponSwingUntil = now + 1400;
    this.weaponReachMultiplier = 1;
    this.bowChargeRatio = 0;
    this.bowLastChargeRatio = 0;
  }

  finishBowCharge(now, tx, ty){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'bow' || !this.bowCharging){
      this.cancelBowCharge();
      return;
    }
    const charge = weapon.charge || {};
    const maxMs = Math.max(200, charge.maxMs || 900);
    const minMs = Math.max(0, charge.minMs || 0);
    const hold = now - this.bowChargeStart;
    const ratio = clamp(hold / maxMs, 0, 1);
    const origin = this.center();
    const aimX = tx ?? this.bowChargeAim?.x ?? (origin.x + this.dir * 240);
    const aimY = ty ?? this.bowChargeAim?.y ?? origin.y;
    const dir = Math.sign(aimX - origin.x) || this.dir;
    this.dir = dir >= 0 ? 1 : -1;
    const effectiveRatio = minMs > 0 ? clamp((hold - minMs) / Math.max(1, maxMs - minMs), 0, 1) : ratio;
    const baseSpeed = charge.minSpeed ?? weapon.speed ?? 360;
    const maxSpeed = charge.maxSpeed ?? Math.max(baseSpeed, (weapon.speed ?? baseSpeed) * 1.6);
    const speed = lerp(baseSpeed, maxSpeed, effectiveRatio);
    const baseDamage = charge.minDamage ?? weapon.dmg ?? 10;
    const maxDamage = charge.maxDamage ?? Math.max(baseDamage, (weapon.dmg ?? baseDamage) * 1.8);
    const damage = Math.max(1, Math.round(lerp(baseDamage, maxDamage, effectiveRatio)));
    const baseKnock = charge.minKnock ?? weapon.knock ?? 140;
    const maxKnock = charge.maxKnock ?? Math.max(baseKnock, (weapon.knock ?? baseKnock) * 1.6);
    const knock = lerp(baseKnock, maxKnock, effectiveRatio);
    const ttlBase = weapon.ttl ?? 2000;
    const ttlBonus = charge.ttlBonus ?? 0;
    const ttl = ttlBase + ttlBonus * effectiveRatio;
    const angle = Math.atan2(aimY - origin.y, aimX - origin.x);
    const opts = {
      speed,
      gravity: weapon.gravity !== undefined ? weapon.gravity : true,
      angle,
      damage,
      knock,
      ttl,
      color: weapon.projectileColor || weapon.color,
      chargeRatio: ratio,
      fullCharge: ratio >= 0.99
    };
    if(weapon.projectileAlpha !== undefined) opts.alpha = weapon.projectileAlpha;
    if(weapon.projectileFadeRate !== undefined) opts.fadeRate = weapon.projectileFadeRate;
    if(weapon.projectileTrailColor) opts.trailColor = weapon.projectileTrailColor;
    if(weapon.projectileSandPayload){
      opts.sandPayload = { ...weapon.projectileSandPayload };
    }
    if(typeof weapon.projectileOnExpire === 'function') opts.onExpire = weapon.projectileOnExpire;
    if(weapon.projectilePushRadius !== undefined) opts.pushRadius = weapon.projectilePushRadius;
    if(weapon.projectilePushForce !== undefined) opts.pushForce = weapon.projectilePushForce;
    if(weapon.projectileLiftRadius !== undefined) opts.liftRadius = weapon.projectileLiftRadius;
    if(weapon.projectileLiftForce !== undefined) opts.liftForce = weapon.projectileLiftForce;
    if(weapon.projectileReturnSpeed !== undefined) opts.returnSpeed = weapon.projectileReturnSpeed;
    const special = charge.special || null;
    if(special){
      if(special.type === 'refractionBeam'){
        const frontHandName = this.weaponHand || (this.dir >= 0 ? 'handR' : 'handL');
        const frontHand = this.pointsByName?.[frontHandName];
        let beamOrigin = null;
        if(frontHand){
          const tipOffset = special.originOffset ?? 26;
          beamOrigin = {
            x: frontHand.x + Math.cos(angle) * tipOffset,
            y: frontHand.y + Math.sin(angle) * tipOffset
          };
        }
        if(beamOrigin) opts.origin = beamOrigin;
        const spawnPoint = opts.origin || { x: origin.x, y: origin.y - 6 };
        const worldWidth = Number.isFinite(this.world?.width) ? this.world.width : 960;
        const worldHeight = Number.isFinite(this.world?.height) ? this.world.height : 540;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const epsilon = 1e-4;
        const distances = [];
        if(Math.abs(cos) > epsilon){
          const tx = cos > 0 ? (worldWidth - spawnPoint.x) / cos : (0 - spawnPoint.x) / cos;
          if(Number.isFinite(tx) && tx > 0) distances.push(tx);
        }
        if(Math.abs(sin) > epsilon){
          const ty = sin > 0 ? (worldHeight - spawnPoint.y) / sin : (0 - spawnPoint.y) / sin;
          if(Number.isFinite(ty) && ty > 0) distances.push(ty);
        }
        const fallbackLength = Math.hypot(worldWidth, worldHeight);
        let beamLength = distances.length ? Math.min(...distances) : fallbackLength;
        if(!Number.isFinite(beamLength) || beamLength <= 0) beamLength = fallbackLength;
        const minLength = special.minLength ?? 220;
        beamLength = Math.max(minLength, Math.min(fallbackLength, beamLength * 1.02));
        const baseWidth = special.minWidth ?? 8;
        const maxWidth = special.maxWidth ?? baseWidth;
        const widthRatio = clamp(effectiveRatio, 0, 1);
        const beamWidth = lerp(baseWidth, maxWidth, widthRatio);
        opts.speed = 0;
        opts.gravity = false;
        opts.ttl = special.ttl ?? 200;
        opts.length = beamLength;
        opts.beamWidth = beamWidth;
        opts.harmless = true;
        opts.color = special.coreColor || opts.color;
        if(special.coreColor) opts.beamCoreColor = special.coreColor;
        if(special.edgeColor) opts.beamEdgeColor = special.edgeColor;
        if(special.glowColor) opts.beamGlowColor = special.glowColor;
        if(special.trailColor) opts.trailColor = special.trailColor;
        if(special.alpha !== undefined) opts.alpha = special.alpha;
      }else if(opts.fullCharge){
        if(special.trailColor) opts.trailColor = special.trailColor;
        if(special.type === 'burst'){
          opts.blastRadius = special.radius ?? 60;
          opts.blastDamage = special.damage ?? Math.round(damage * 0.6);
        }else if(special.type === 'ignite'){
          opts.element = 'fire';
          opts.igniteRadius = special.radius ?? 70;
          if(special.igniteDamage !== undefined){
            opts.blastRadius = Math.max(opts.blastRadius ?? 0, special.radius ?? 0);
            opts.blastDamage = special.igniteDamage;
          }
        }else if(special.type === 'slow'){
          opts.slowMultiplier = special.slowMultiplier ?? 0.5;
          opts.slowDuration = special.slowDuration ?? 1800;
        }
      }
    }
    const projectileKind = weapon.projectile || 'arrow';
    shootProjectile(this, weapon, projectileKind, opts, this.world);
    if(opts.fullCharge && special && special.type === 'volley'){
      const extraCount = Math.max(1, Math.round(special.count ?? 2));
      const spread = special.spread ?? 0.12;
      for(let n=0;n<extraCount;n++){
        const side = n % 2 === 0 ? 1 : -1;
        const step = Math.floor(n / 2) + 1;
        const offset = spread * step * side;
        const volleyOpts = { ...opts, angle: angle + offset };
        shootProjectile(this, weapon, projectileKind, volleyOpts, this.world);
      }
    }
    this.bowLastChargeRatio = ratio;
    this.cancelBowCharge();
    this.weaponCooldownUntil = Math.max(this.weaponCooldownUntil || 0, now + (weapon.cooldown ?? 820));
    this.weaponVisible = true;
    this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    this.weaponSwingUntil = now + 280;
    this.bowChargeReleaseUntil = now + 320;
  }

  cancelBowCharge(){
    this.bowCharging = false;
    this.bowChargeStart = 0;
    this.bowChargeWeaponId = null;
    this.bowChargeRatio = 0;
  }

  updateBowChargeState(now){
    if(this.isEnemy){
      if(this.bowCharging) this.cancelBowCharge();
      this.bowChargeReleaseUntil = 0;
      this.bowLastChargeRatio = 0;
      return;
    }
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'bow'){
      if(this.bowCharging) this.cancelBowCharge();
      if(this.bowChargeReleaseUntil && now >= this.bowChargeReleaseUntil){
        this.bowChargeReleaseUntil = 0;
        this.bowLastChargeRatio = 0;
      }
      return;
    }
    if(this.bowCharging){
      if(this.currentWeaponId() !== this.bowChargeWeaponId){
        this.cancelBowCharge();
        return;
      }
      const charge = weapon.charge || {};
      const maxMs = Math.max(200, charge.maxMs || 900);
      const hold = now - this.bowChargeStart;
      this.bowChargeRatio = clamp(hold / maxMs, 0, 1);
      if(this.world && this.world.selected === this && this.world.input?.aim){
        const aim = this.world.input.aim;
        this.bowChargeAim = { x: aim.x, y: aim.y };
        const origin = this.center();
        const dir = Math.sign(aim.x - origin.x) || this.dir;
        this.dir = dir >= 0 ? 1 : -1;
      }
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponSwingUntil = Math.max(this.weaponSwingUntil || 0, now + 80);
    }else if(this.bowChargeReleaseUntil && now >= this.bowChargeReleaseUntil){
      this.bowChargeReleaseUntil = 0;
      this.bowLastChargeRatio = 0;
      if(!this.comboAnim && !this.backflipActive){
        if(weapon && weapon.kind === 'bow'){
          this.weaponVisible = true;
          this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
        }else{
          this.weaponVisible = false;
          this.weaponHand = null;
        }
      }
    }
  }

  bowArmOverrides(now){
    if(!this.isBowDrawingActive(now)) return null;
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'bow') return null;
    const pelvis = this.pelvis();
    const origin = this.center();
    if(!pelvis || !origin) return null;
    const frontHand = this.weaponHand || (this.dir >= 0 ? 'handR' : 'handL');
    const backHand = frontHand === 'handR' ? 'handL' : 'handR';
    const frontElbow = frontHand === 'handR' ? 'elbowR' : 'elbowL';
    const backElbow = backHand === 'handR' ? 'elbowR' : 'elbowL';
    let aimTarget = null;
    if(this.world && this.world.selected === this && this.world.input?.aim){
      aimTarget = { x: this.world.input.aim.x, y: this.world.input.aim.y };
    }else if(this.bowChargeAim){
      aimTarget = { x: this.bowChargeAim.x, y: this.bowChargeAim.y };
    }
    if(!aimTarget){
      aimTarget = { x: origin.x + this.dir * 200, y: origin.y - 16 };
    }
    let dirX = aimTarget.x - origin.x;
    let dirY = aimTarget.y - origin.y;
    if(!Number.isFinite(dirX) || !Number.isFinite(dirY) || (Math.abs(dirX) + Math.abs(dirY)) < 0.001){
      dirX = this.dir >= 0 ? 1 : -1;
      dirY = -0.15;
    }
    const inv = 1 / (Math.hypot(dirX, dirY) || 1);
    dirX *= inv;
    dirY *= inv;
    const perpX = -dirY;
    const perpY = dirX;
    const draw = clamp(this.bowCharging ? this.bowChargeRatio : this.bowLastChargeRatio, 0, 1);
    const frontDistance = 42 + draw * 8;
    const backDistance = 20 + draw * 40;
    const frontSide = -10 - draw * 2;
    const backSide = 8;
    const frontLift = -30 - draw * 6;
    const backLift = -26 - draw * 6;
    const overrides = {};
    overrides[frontHand] = {
      x: pelvis.x + dirX * frontDistance + perpX * frontSide,
      y: pelvis.y + dirY * frontDistance + perpY * frontSide + frontLift
    };
    overrides[frontElbow] = {
      x: pelvis.x + dirX * (frontDistance * 0.55) + perpX * (frontSide * 0.6),
      y: pelvis.y + dirY * (frontDistance * 0.55) + perpY * (frontSide * 0.6) + frontLift - 10 - draw * 6
    };
    overrides[backHand] = {
      x: pelvis.x - dirX * backDistance + perpX * backSide,
      y: pelvis.y - dirY * backDistance + perpY * backSide + backLift
    };
    overrides[backElbow] = {
      x: pelvis.x - dirX * (backDistance * 0.55 + 10) + perpX * (backSide * 0.5),
      y: pelvis.y - dirY * (backDistance * 0.55 + 10) + perpY * (backSide * 0.5) + backLift - 12 - draw * 6
    };
    return overrides;
  }

  gunArmOverrides(now){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'gun' || !weapon.gunPose){
      if(this.lastGunAim && (!weapon || weapon.kind !== 'gun')){
        this.lastGunAim = null;
      }
      return null;
    }
    if(!this.weaponVisible || !this.weaponHand){
      if(!this.weaponVisible) this.lastGunAim = null;
      return null;
    }
    const pelvis = this.pelvis();
    if(!pelvis) return null;
    const origin = this.center();
    if(!origin) return null;
    let aimTarget = null;
    if(this.world){
      if(this.world.selected === this && this.world.input?.aim){
        aimTarget = { x: this.world.input.aim.x, y: this.world.input.aim.y };
      }
    }
    if(!aimTarget && this.lastGunAim){
      aimTarget = { x: this.lastGunAim.x, y: this.lastGunAim.y };
    }
    if(!aimTarget){
      aimTarget = { x: origin.x + this.dir * 200, y: origin.y - 16 };
    }
    this.lastGunAim = { x: aimTarget.x, y: aimTarget.y };
    let dirX = aimTarget.x - origin.x;
    let dirY = aimTarget.y - origin.y;
    const len = Math.hypot(dirX, dirY);
    if(!(len > 0.0001)){
      dirX = this.dir;
      dirY = -0.18;
    }
    const inv = 1 / (Math.hypot(dirX, dirY) || 1);
    dirX *= inv;
    dirY *= inv;
    const perpX = -dirY;
    const perpY = dirX;
    const pose = weapon.gunPose || {};
    const baseLift = pose.baseLift ?? -18;
    const gripForward = pose.gripForward ?? 22;
    const gripPerp = pose.gripPerp ?? -6;
    const gripElbowBack = pose.gripElbowBack ?? 10;
    const gripElbowPerp = pose.gripElbowPerp ?? -4;
    const supportForward = pose.supportForward ?? 48;
    const supportPerp = pose.supportPerp ?? -3;
    const supportLift = pose.supportLift ?? -2;
    const supportElbowBack = pose.supportElbowBack ?? 16;
    const supportElbowPerp = pose.supportElbowPerp ?? -2;
    const gripX = pelvis.x + dirX * gripForward + perpX * gripPerp;
    const gripY = pelvis.y + baseLift + dirY * gripForward + perpY * gripPerp;
    const supportX = pelvis.x + dirX * supportForward + perpX * supportPerp;
    const supportY = pelvis.y + baseLift + supportLift + dirY * supportForward + perpY * supportPerp;
    const gripElbowX = pelvis.x + dirX * Math.max(0, gripForward - gripElbowBack) + perpX * (gripPerp - gripElbowPerp);
    const gripElbowY = pelvis.y + baseLift + dirY * Math.max(0, gripForward - gripElbowBack) + perpY * (gripPerp - gripElbowPerp);
    const supportElbowX = pelvis.x + dirX * Math.max(0, supportForward - supportElbowBack) + perpX * (supportPerp - supportElbowPerp);
    const supportElbowY = pelvis.y + baseLift + supportLift * 0.5 + dirY * Math.max(0, supportForward - supportElbowBack) + perpY * (supportPerp - supportElbowPerp);
    const triggerHand = this.weaponHand;
    const supportHand = triggerHand === 'handR' ? 'handL' : 'handR';
    const triggerElbow = triggerHand === 'handR' ? 'elbowR' : 'elbowL';
    const supportElbow = supportHand === 'handR' ? 'elbowR' : 'elbowL';
    const overrides = {};
    overrides[triggerHand] = { x: gripX, y: gripY };
    overrides[triggerElbow] = { x: gripElbowX, y: gripElbowY };
    overrides[supportHand] = { x: supportX, y: supportY };
    overrides[supportElbow] = { x: supportElbowX, y: supportElbowY };
    return overrides;
  }

  spearArmOverrides(now){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'melee' || weapon.poseStyle !== 'spear'){
      if(this.lastSpearAim) this.lastSpearAim = null;
      if(this.spearThrust) this.spearThrust = null;
      return null;
    }
    if(!this.weaponVisible){
      return null;
    }
    const pelvis = this.pelvis();
    const origin = this.center();
    if(!pelvis || !origin) return null;
    const world = this.world;
    let aimTarget = null;
    if(world){
      if(world.selected === this && world.input?.aim){
        aimTarget = { x: world.input.aim.x, y: world.input.aim.y };
      }else if(this.isEnemy && this.target && !this.target.dead && typeof this.target.center === 'function'){
        const targetCenter = this.target.center();
        if(targetCenter) aimTarget = targetCenter;
      }
    }
    if(!aimTarget && this.lastAttackAim){
      aimTarget = { x: this.lastAttackAim.x, y: this.lastAttackAim.y };
    }
    if(!aimTarget && this.lastSpearAim){
      aimTarget = { x: this.lastSpearAim.x, y: this.lastSpearAim.y };
    }
    if(!aimTarget){
      aimTarget = { x: origin.x + this.dir * 200, y: origin.y - 16 };
    }
    this.lastSpearAim = { x: aimTarget.x, y: aimTarget.y };
    let dirX = aimTarget.x - origin.x;
    let dirY = aimTarget.y - origin.y;
    if(!Number.isFinite(dirX) || !Number.isFinite(dirY) || (Math.abs(dirX) + Math.abs(dirY)) < 0.001){
      dirX = this.dir >= 0 ? 1 : -1;
      dirY = -0.12;
    }
    const inv = 1 / (Math.hypot(dirX, dirY) || 1);
    dirX *= inv;
    dirY *= inv;
    const perpX = -dirY;
    const perpY = dirX;
    const pose = weapon.spearPose || {};
    const baseLift = pose.baseLift ?? -18;
    let frontForward = pose.frontForward ?? Math.max(42, (weapon.range ?? 54) * 1.05);
    let backForward = pose.backForward ?? Math.max(28, (weapon.range ?? 54) * 0.6);
    const frontPerp = pose.frontPerp ?? -8;
    const backPerp = pose.backPerp ?? 6;
    const frontElbowBack = pose.frontElbowBack ?? 26;
    const backElbowBack = pose.backElbowBack ?? 20;
    const frontElbowPerp = pose.frontElbowPerp ?? 6;
    const backElbowPerp = pose.backElbowPerp ?? 4;
    const elbowLift = pose.elbowLift ?? -10;
    const restBlend = clamp(pose.restBlend ?? 0.7, 0, 1);
    const elbowBlend = clamp(pose.elbowBlend ?? restBlend, 0, 1);
    let thrustRatio = 0;
    const thrust = this.spearThrust;
    if(thrust){
      if(now >= thrust.end){
        this.spearThrust = null;
      }else if(thrust.end > thrust.start){
        const duration = thrust.end - thrust.start;
        const progress = clamp((now - thrust.start) / duration, 0, 1);
        thrustRatio = progress < 0.5
          ? progress / 0.5
          : (1 - (progress - 0.5) / 0.5);
      }
    }
    if(!this.spearThrust && Math.abs(this.weaponReachMultiplier - 1) > 1e-3){
      this.weaponReachMultiplier = 1;
    }
    const thrustForward = (pose.thrustForward ?? 18) * thrustRatio;
    const baseBackThrust = pose.thrustBack ?? Math.max(0, (pose.thrustForward ?? 18) * 0.5);
    const thrustBack = baseBackThrust * thrustRatio;
    frontForward += thrustForward;
    backForward += thrustBack;
    const facing = this.dir >= 0 ? 1 : -1;
    const frontHand = this.weaponHand || (facing >= 0 ? 'handR' : 'handL');
    const backHand = frontHand === 'handR' ? 'handL' : 'handR';
    const frontElbowName = frontHand === 'handR' ? 'elbowR' : 'elbowL';
    const backElbowName = backHand === 'handR' ? 'elbowR' : 'elbowL';
    const baseX = pelvis.x;
    const baseY = pelvis.y + baseLift;
    const frontTargetX = baseX + dirX * frontForward + perpX * frontPerp;
    const frontTargetY = baseY + dirY * frontForward + perpY * frontPerp;
    const backTargetX = baseX + dirX * backForward + perpX * backPerp;
    const backTargetY = baseY + dirY * backForward + perpY * backPerp;
    const frontElbowForward = Math.max(0, frontForward - frontElbowBack);
    const backElbowForward = Math.max(0, backForward - backElbowBack);
    const frontElbowTargetX = baseX + dirX * frontElbowForward + perpX * (frontPerp - frontElbowPerp);
    const frontElbowTargetY = baseY + elbowLift + dirY * frontElbowForward + perpY * (frontPerp - frontElbowPerp);
    const backElbowTargetX = baseX + dirX * backElbowForward + perpX * (backPerp - backElbowPerp);
    const backElbowTargetY = baseY + elbowLift + dirY * backElbowForward + perpY * (backPerp - backElbowPerp);
    const restOffsets = this._baseRigOffsets || {};
    const mix = (name, targetX, targetY, blend)=>{
      const rest = restOffsets[name];
      const weight = clamp(blend ?? restBlend, 0, 1);
      let restX = pelvis.x;
      let restY = pelvis.y;
      if(rest){
        restX += rest.x;
        restY += rest.y;
      }
      let x = restX + (targetX - restX) * weight;
      let y = restY + (targetY - restY) * weight;
      const lag = this.armLagOutput?.[name];
      if(lag){
        x += lag.x;
        y += lag.y;
      }
      return { x, y };
    };
    const overrides = {};
    overrides[frontHand] = mix(frontHand, frontTargetX, frontTargetY, restBlend);
    overrides[backHand] = mix(backHand, backTargetX, backTargetY, restBlend);
    overrides[frontElbowName] = mix(frontElbowName, frontElbowTargetX, frontElbowTargetY, elbowBlend);
    overrides[backElbowName] = mix(backElbowName, backElbowTargetX, backElbowTargetY, elbowBlend);
    return overrides;
  }

  summonerArmOverrides(now){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'summoner') return null;
    // Previously the summoner book forced both arms into a hovering pose with
    // animated sway. The rigid target positions conflicted with physics when
    // characters were moving or colliding, which caused the ragdoll solver to
    // over-correct and launch stickmen into the air. To keep the pose stable,
    // let the default arm dynamics handle the summoner stance so the arms can
    // hang naturally while the book is equipped.
    return null;
  }

  ledgeGrabArmOverrides(){
    const state = this.ledgeGrab;
    if(!state) return null;
    const pelvis = this.pelvis();
    if(!pelvis) return null;
    const anchorX = Number.isFinite(state.anchorX) ? state.anchorX : pelvis.x;
    const anchorY = Number.isFinite(state.anchorY) ? state.anchorY : pelvis.y;
    const dir = state.dir || 0;
    if(dir === 0) return null;
    const frontHand = dir > 0 ? 'handR' : 'handL';
    const backHand = dir > 0 ? 'handL' : 'handR';
    const frontElbow = dir > 0 ? 'elbowR' : 'elbowL';
    const backElbow = dir > 0 ? 'elbowL' : 'elbowR';
    const reach = 10;
    const offset = 8;
    const drop = 16;
    const overrides = {};
    overrides[frontHand] = { x: anchorX, y: anchorY };
    overrides[backHand] = { x: anchorX - dir * offset, y: anchorY + drop * 0.4 };
    overrides[frontElbow] = { x: anchorX - dir * reach, y: anchorY + drop };
    overrides[backElbow] = { x: anchorX - dir * (offset + reach * 0.5), y: anchorY + drop + 6 };
    return overrides;
  }

  isBowDrawingActive(now=nowMs()){
    if(this.isEnemy) return false;
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'bow') return false;
    if(this.bowCharging) return true;
    return !!(this.bowChargeReleaseUntil && now < this.bowChargeReleaseUntil);
  }

  applyBackflipImpulse(){
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const dir = this.dir >= 0 ? 1 : -1;
    pelvis.vy = Math.min(pelvis.vy, -620);
    pelvis.vx -= dir * 140;
    const stored = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    this.moveVelocity = stored - dir * 140;
    const angular = dir >= 0 ? -6 : 6;
    for(const p of this.points){
      if(p === pelvis) continue;
      const relX = p.x - pelvis.x;
      const relY = p.y - pelvis.y;
      p.vx += -relY * angular * 0.08;
      p.vy += relX * angular * 0.08;
    }
  }

  updateArmDynamics(pelvis, dt){
    if(!pelvis) return;
    if(!this.isEnemy){
      for(const name of ARM_POINTS){
        const state = this.armLag[name];
        if(state){
          state.x = 0;
          state.y = 0;
        }
        const output = this.armLagOutput[name];
        if(output){
          output.x = 0;
          output.y = 0;
        }
      }
      return;
    }
    const storedVx = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    const pointVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
    const vx = Math.abs(pointVx) > Math.abs(storedVx) ? pointVx : storedVx;
    const vy = pelvis.vy || 0;
    const speedRatio = clamp(Math.abs(vx) / Math.max(1, this.moveSpeed), 0, 1.4);
    this.armSwingPhase += dt * (0.6 + speedRatio * 3.2);
    const sinPhase = Math.sin(this.armSwingPhase);
    const cosPhase = Math.cos(this.armSwingPhase);
    for(const name of ARM_POINTS){
      const state = this.armLag[name];
      if(!state) continue;
      const follow = name.startsWith('hand') ? 1 : 0.65;
      const targetX = -vx * 0.05 * follow;
      const targetY = (-vy * 0.04 + Math.abs(vx) * 0.025) * follow;
      const lerpRate = clamp(dt * 6.5, 0, 1);
      state.x += (targetX - state.x) * lerpRate;
      state.y += (targetY - state.y) * lerpRate;
      if(Math.abs(vx) < 18 && Math.abs(vy) < 18 && Math.abs(this.moveIntent) < 0.08){
        state.x *= (1 - clamp(dt * 4.2, 0, 0.35));
        state.y *= (1 - clamp(dt * 4.6, 0, 0.4));
      }
      const swing = (name.endsWith('L') ? sinPhase : -sinPhase) * 12 * speedRatio * follow;
      const bob = (name.endsWith('L') ? cosPhase : -cosPhase) * 5 * speedRatio * follow;
      this.armLagOutput[name].x = state.x + swing;
      this.armLagOutput[name].y = state.y + bob;
    }
  }

  sheathArmOverrides(now){
    const until = this.weaponSheathGrabUntil || 0;
    if(!(until > now)){
      if(this.weaponSheathGrabUntil){
        this.weaponSheathGrabUntil = 0;
        this.weaponSheathGrabStart = 0;
        this.weaponSheathGrabHand = null;
      }
      return null;
    }
    const rig = this.weaponRig;
    if(!rig || rig.type !== 'sword') return null;
    const handName = this.weaponSheathGrabHand || (this.dir >= 0 ? 'handR' : 'handL');
    if(!handName) return null;
    const config = swordVariantConfig(rig.variant);
    const pose = this.weaponSheathPose || computeSwordSheathPose(this, config);
    const base = pose?.base;
    if(!base) return null;
    const start = this.weaponSheathGrabStart || (until - 1);
    const duration = Math.max(1, until - start);
    const progress = clamp((now - start) / duration, 0, 1);
    let weight = 1;
    if(progress > 0.75){
      const tail = (progress - 0.75) / 0.25;
      weight = clamp(1 - tail, 0, 1);
    }
    if(weight <= 0) return null;
    const hand = this.pointsByName[handName];
    let targetX = base.x;
    let targetY = base.y;
    if(weight < 1 && hand){
      targetX = base.x * weight + hand.x * (1 - weight);
      targetY = base.y * weight + hand.y * (1 - weight);
    }
    return { [handName]: { x: targetX, y: targetY } };
  }

  comboArmOverrides(now){
    if(!this.comboAnim) return null;
    const anim = this.comboAnim;
    const duration = Math.max(1, anim.end - anim.start);
    const progress = clamp((now - anim.start) / duration, 0, 1);
    if(progress >= 1) return null;
    const pelvis = this.pelvis();
    if(!pelvis) return null;
    const rel = comboRelativeTargets(anim, progress, this.rigOffsets);
    if(!rel) return null;
    const out = {};
    if(rel.hand){
      out[anim.hand] = { x: pelvis.x + rel.hand.x, y: pelvis.y + rel.hand.y };
    }
    if(rel.elbow){
      out[anim.elbow] = { x: pelvis.x + rel.elbow.x, y: pelvis.y + rel.elbow.y };
    }
    return out;
  }

  warpTo(x, y){
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const dx = x - pelvis.x;
    const dy = y - pelvis.y;
    this._translatePoints(dx, dy);
    this.prevPelvisX = x;
    this.homeX = x;
    this.moveVelocity = 0;
    pelvis.vx = 0;
  }

  _translatePoints(dx, dy, options){
    const moveX = Number.isFinite(dx) ? dx : 0;
    let moveY = Number.isFinite(dy) ? dy : 0;
    const world = this.world;
    let ceilingAdjusted = false;
    if(moveY < 0 && world){
      const ceiling = Number.isFinite(world.ceilingY) ? world.ceilingY : null;
      if(ceiling !== null && Array.isArray(this.points) && this.points.length){
        let pushDown = 0;
        for(const point of this.points){
          if(!point) continue;
          const radius = Math.max(0, point.terrainRadius ?? point.radius ?? STICK_TERRAIN_RADIUS);
          const targetY = point.y + moveY;
          const limit = ceiling + radius;
          if(targetY < limit){
            const push = limit - targetY;
            if(push > pushDown) pushDown = push;
          }
        }
        if(pushDown > 0){
          moveY += pushDown;
          ceilingAdjusted = true;
        }
      }
    }
    if((moveX === 0 && moveY === 0) || !Array.isArray(this.points) || this.points.length === 0){
      return { dx: 0, dy: 0 };
    }
    for(const point of this.points){
      if(!point) continue;
      const nextX = point.x + moveX;
      const nextY = point.y + moveY;
      point.teleport(nextX, nextY);
    }
    this._shiftLegs(moveX, moveY);
    const pelvis = this.pelvis();
    if(pelvis){
      this.prevPelvisX = pelvis.x;
    }
    if(ceilingAdjusted){
      this.lastCeilingClampAt = nowMs();
    }
    if(options && options.skipResolve){
      return { dx: moveX, dy: moveY };
    }
    const correction = this._resolveBlockPenetration();
    const extraX = correction && Number.isFinite(correction.dx) ? correction.dx : 0;
    const extraY = correction && Number.isFinite(correction.dy) ? correction.dy : 0;
    return { dx: moveX + extraX, dy: moveY + extraY };
  }

  _resolveBlockPenetration(){
    if(this._resolvingBlockPenetration) return { dx: 0, dy: 0 };
    const world = this.world;
    if(!world || world.blockCollisionEnabled === false) return { dx: 0, dy: 0 };
    const pelvis = this.pelvis();
    if(!pelvis) return { dx: 0, dy: 0 };
    const rects = this._solidRectangles();
    if(!Array.isArray(rects) || rects.length === 0) return { dx: 0, dy: 0 };
    const offsets = this._gatherCollisionOffsets();
    if(!Array.isArray(offsets) || offsets.length === 0) return { dx: 0, dy: 0 };
    this._resolvingBlockPenetration = true;
    const epsilon = 0.01;
    const maxIterations = 8;
    let totalDx = 0;
    let totalDy = 0;
    try {
      for(let iter=0; iter<maxIterations; iter++){
        let adjusted = false;
        outer: for(const rect of rects){
          if(!rect) continue;
          const left = rect.left ?? rect.x ?? 0;
          const right = rect.right ?? ((rect.x ?? 0) + (rect.w ?? 0));
          const top = rect.top ?? rect.y ?? 0;
          const bottom = rect.bottom ?? ((rect.y ?? 0) + (rect.h ?? 0));
          if(!(right > left && bottom > top)) continue;
          for(const offset of offsets){
            if(!offset) continue;
            const radius = Math.max(0, Number.isFinite(offset.radius) ? offset.radius : STICK_TERRAIN_RADIUS);
            const offsetX = Number.isFinite(offset.dx) ? offset.dx : 0;
            const offsetY = Number.isFinite(offset.dy) ? offset.dy : 0;
            const pointX = pelvis.x + offsetX;
            const pointY = pelvis.y + offsetY;
            const minX = left - radius;
            const maxX = right + radius;
            const minY = top - radius;
            const maxY = bottom + radius;
            if(pointX <= minX || pointX >= maxX || pointY <= minY || pointY >= maxY){
              continue;
            }
            const distLeft = pointX - minX;
            const distRight = maxX - pointX;
            const distTop = pointY - minY;
            const distBottom = maxY - pointY;
            let pushX = 0;
            let pushY = 0;
            const minDist = Math.min(distLeft, distRight, distTop, distBottom);
            if(minDist === distLeft){
              pushX = -(distLeft + epsilon);
            }else if(minDist === distRight){
              pushX = distRight + epsilon;
            }else if(minDist === distTop){
              pushY = -(distTop + epsilon);
            }else{
              pushY = distBottom + epsilon;
            }
            if(pushX !== 0 || pushY !== 0){
              this._translatePoints(pushX, pushY, { skipResolve: true });
              totalDx += pushX;
              totalDy += pushY;
              if(rect.kind === 'physicsBox' && rect.box){
                this._applyPhysicsBoxImpulse(rect.box, pushX, pushY);
              }
              adjusted = true;
            }
            break outer;
          }
        }
        if(!adjusted) break;
      }
    } finally {
      this._resolvingBlockPenetration = false;
    }
    return { dx: totalDx, dy: totalDy };
  }

  _applyPhysicsBoxImpulse(box, pushX, pushY){
    if(!box || (!pushX && !pushY)) return;
    if(!Number.isFinite(box.vx)) box.vx = 0;
    if(!Number.isFinite(box.vy)) box.vy = 0;
    const mass = Number.isFinite(box.mass) && box.mass > 0 ? box.mass : 1;
    const impulseScale = 24 / mass;
    if(pushX){
      const impulseX = -pushX * impulseScale;
      box.vx += impulseX;
      box.x += -pushX * 0.25;
    }
    if(pushY){
      const impulseY = -pushY * impulseScale;
      box.vy += impulseY;
      box.y += -pushY * 0.25;
      if(pushY < 0) box.grounded = false;
    }
  }

  _shiftLegs(dx, dy){
    if(!this.legs) return;
    for(const side of ['left','right']){
      const leg = this.legs[side];
      if(!leg) continue;
      if(leg.knee){ leg.knee.x += dx; leg.knee.y += dy; }
      if(leg.stuckPos){ leg.stuckPos.x += dx; leg.stuckPos.y += dy; }
      if(leg.foot){
        leg.foot.x += dx;
        leg.foot.y += dy;
        if(Number.isFinite(leg.foot.prevX)) leg.foot.prevX += dx;
        if(Number.isFinite(leg.foot.prevY)) leg.foot.prevY += dy;
      }
    }
  }

  _gatherCollisionOffsets(){
    const pelvis = this.pelvis();
    if(!pelvis) return [];
    if(this.hitboxWidth && this.hitboxHeight){
      if(this.hitboxShape === 'ellipse'){
        return this._ellipseCollisionOffsets(pelvis);
      }
      return this._rectCollisionOffsets(pelvis);
    }
    const offsets = [];
    for(const point of this.points){
      if(!point) continue;
      if(point.isSwordTip) continue;
      const radius = Math.max(0, point.terrainRadius ?? STICK_TERRAIN_RADIUS);
      offsets.push({
        dx: point.x - pelvis.x,
        dy: point.y - pelvis.y,
        radius
      });
    }
    if(this.legs){
      for(const side of ['left','right']){
        const leg = this.legs[side];
        const foot = leg?.foot;
        if(!foot) continue;
        const radius = Math.max(0, foot.radius ?? STICK_TERRAIN_RADIUS);
        offsets.push({
          dx: foot.x - pelvis.x,
          dy: foot.y - pelvis.y,
          radius
        });
      }
    }
    return offsets;
  }

  _rectCollisionOffsets(pelvis){
    const center = this.center();
    const baseX = center.x - pelvis.x;
    const baseY = center.y - pelvis.y;
    const halfW = this.hitboxWidth * 0.5;
    const halfH = this.hitboxHeight * 0.5;
    const radius = Math.max(6, Math.min(halfW, halfH) * 0.45);
    const samples = [
      { dx: baseX, dy: baseY },
      { dx: baseX, dy: baseY - halfH },
      { dx: baseX, dy: baseY + halfH },
      { dx: baseX - halfW, dy: baseY },
      { dx: baseX + halfW, dy: baseY },
      { dx: baseX - halfW, dy: baseY - halfH },
      { dx: baseX + halfW, dy: baseY - halfH },
      { dx: baseX - halfW, dy: baseY + halfH },
      { dx: baseX + halfW, dy: baseY + halfH }
    ];
    return samples.map(sample=>({ dx: sample.dx, dy: sample.dy, radius }));
  }

  _ellipseCollisionOffsets(pelvis){
    const center = this.center();
    const baseX = center.x - pelvis.x;
    const baseY = center.y - pelvis.y;
    const halfW = this.hitboxWidth * 0.5;
    const halfH = this.hitboxHeight * 0.5;
    const radius = Math.max(6, Math.min(halfW, halfH) * 0.45);
    const angles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const samples = [{ dx: baseX, dy: baseY }];
    for(const angle of angles){
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      samples.push({
        dx: baseX + cos * halfW,
        dy: baseY + sin * halfH
      });
    }
    return samples.map(sample=>({ dx: sample.dx, dy: sample.dy, radius }));
  }

  _solidRectangles(){
    const world = this.world;
    const rects = [];
    if(!world) return rects;
    if(this.passThroughTerrain) return rects;
    const pelvis = this.pelvis();
    const offsets = this._gatherCollisionOffsets();
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    if(pelvis){
      minX = Math.min(minX, pelvis.x);
      maxX = Math.max(maxX, pelvis.x);
      minY = Math.min(minY, pelvis.y);
      maxY = Math.max(maxY, pelvis.y);
    }
    if(Array.isArray(offsets) && offsets.length && pelvis){
      for(const offset of offsets){
        if(!offset) continue;
        const px = pelvis.x + offset.dx;
        const py = pelvis.y + offset.dy;
        const radius = Math.max(0, offset.radius ?? 0);
        if(px - radius < minX) minX = px - radius;
        if(px + radius > maxX) maxX = px + radius;
        if(py - radius < minY) minY = py - radius;
        if(py + radius > maxY) maxY = py + radius;
      }
    }
    if(!Number.isFinite(minX) || !Number.isFinite(maxX)){
      const fallbackX = pelvis ? pelvis.x : 0;
      minX = fallbackX;
      maxX = fallbackX;
    }
    if(!Number.isFinite(minY) || !Number.isFinite(maxY)){
      const fallbackY = pelvis ? pelvis.y : 0;
      minY = fallbackY;
      maxY = fallbackY;
    }
    const paddingBase = Number.isFinite(this.wallQueryPadding)
      ? this.wallQueryPadding
      : STICK_WALL_QUERY_PADDING;
    const padding = Math.max(0, paddingBase);
    const queryLeft = minX - padding;
    const queryRight = maxX + padding;
    const queryTop = minY - padding;
    const queryBottom = maxY + padding;
    if(typeof terrainTiles === 'function'){
      for(const tile of terrainTiles(world)){
        if(!tile) continue;
        const left = (tile.x ?? 0) - TERRAIN_TILE_PADDING;
        const right = (tile.x ?? 0) + (tile.w ?? 0) + TERRAIN_TILE_PADDING;
        const top = (tile.y ?? 0) - TERRAIN_TILE_PADDING;
        const bottom = (tile.y ?? 0) + (tile.h ?? 0) + TERRAIN_TILE_PADDING;
        rects.push({ left, right, top, bottom, kind: 'terrain' });
      }
    }
    const walls = typeof queryBreakablesInRegion === 'function'
      ? queryBreakablesInRegion(world, queryLeft, queryTop, queryRight, queryBottom)
      : (Array.isArray(world?.breakables) ? world.breakables : []);
    for(const wall of walls){
      if(!wall || wall.broken) continue;
      const left = (wall.x ?? 0) - TERRAIN_TILE_PADDING;
      const right = (wall.x ?? 0) + (wall.w ?? 0) + TERRAIN_TILE_PADDING;
      const top = (wall.y ?? 0) - TERRAIN_TILE_PADDING;
      const bottom = (wall.y ?? 0) + (wall.h ?? 0) + TERRAIN_TILE_PADDING;
      rects.push({ left, right, top, bottom, wall, kind: 'breakable' });
    }
    const toggleSolids = typeof activeToggleBlockSolids === 'function' ? activeToggleBlockSolids(world) : [];
    for(const solid of toggleSolids){
      if(!solid) continue;
      const left = (solid.x ?? 0) - TERRAIN_TILE_PADDING;
      const right = (solid.x ?? 0) + (solid.w ?? 0) + TERRAIN_TILE_PADDING;
      const top = (solid.y ?? 0) - TERRAIN_TILE_PADDING;
      const bottom = (solid.y ?? 0) + (solid.h ?? 0) + TERRAIN_TILE_PADDING;
      rects.push({ left, right, top, bottom, blocks: solid.blocks, kind: 'toggle' });
    }
    const physicsBoxes = Array.isArray(world.physicsBoxes) ? world.physicsBoxes : [];
    for(const box of physicsBoxes){
      if(!box) continue;
      const width = box.width ?? box.size ?? 0;
      const height = box.height ?? box.size ?? 0;
      if(!(width > 0 && height > 0)) continue;
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const centerX = Number.isFinite(box.x) ? box.x : 0;
      const centerY = Number.isFinite(box.y) ? box.y : 0;
      const left = centerX - halfW - TERRAIN_TILE_PADDING;
      const right = centerX + halfW + TERRAIN_TILE_PADDING;
      const top = centerY - halfH - TERRAIN_TILE_PADDING;
      const bottom = centerY + halfH + TERRAIN_TILE_PADDING;
      rects.push({ left, right, top, bottom, box, kind: 'physicsBox' });
    }
    return rects;
  }

  _decorRectangles(){
    const world = this.world;
    const rects = [];
    if(!world) return rects;
    if(this.passThroughTerrain) return rects;
    const decor = Array.isArray(world.decor) ? world.decor : [];
    for(const prop of decor){
      if(!prop || prop.broken || prop.remove) continue;
      const width = prop.width ?? 34;
      const height = prop.height ?? 28;
      const halfW = width * 0.5;
      const baseY = prop.baseY ?? prop.y ?? 0;
      const left = (prop.x ?? 0) - halfW;
      const right = left + width;
      const bottom = baseY;
      const top = bottom - height;
      rects.push({ left, right, top, bottom, prop, kind: 'decor' });
    }
    return rects;
  }

  _pointGrounded(point){
    if(!point) return false;
    return !!(point.grounded || point.preGroundContact);
  }

  _markGrappleHoldGrounded(){
    this._grappleHoldFromGround = true;
    if(this._grappleHoldActive){
      this._grappleHoldArmed = false;
    }
  }

  _hasAnyGroundContact(){
    const pelvis = this.pelvis();
    if(this._pointGrounded(pelvis)) return true;
    const legs = this.legs;
    const leftFoot = legs?.left?.foot;
    const rightFoot = legs?.right?.foot;
    if(this._pointGrounded(leftFoot) || this._pointGrounded(rightFoot)) return true;
    if(leftFoot?.jumpGrounded || rightFoot?.jumpGrounded) return true;
    return false;
  }

  _updateCrouchState(dt){
    const baseDt = dt > 0 ? dt : (this.world?.lastDt && this.world.lastDt > 0 ? this.world.lastDt : (1/60));
    const target = clamp(this.crouchIntent ?? 0, 0, 1);
    const current = Number.isFinite(this.crouchAmount) ? this.crouchAmount : 0;
    const speed = clamp(baseDt * 12, 0, 1);
    const next = current + (target - current) * speed;
    const crouch = clamp(next, 0, 1);
    this.crouchAmount = crouch;
    const statusScale = Number.isFinite(this.statusMoveScale) ? this.statusMoveScale : 1;
    const crouchScale = clamp(1 - crouch * 0.6, 0.25, 1);
    const totalScale = statusScale * crouchScale;
    this.moveSpeed = this.baseMoveSpeed * totalScale;
    this.moveForce = this.baseMoveForce * totalScale;
    this.airMoveForce = this.moveForce * 0.65;
    this.moveDecel = this.baseMoveDecel * crouchScale;
    this.isCrouching = crouch > 0.01;
    this._applyCrouchPose(crouch);
  }

  _applyCrouchPose(amount){
    const crouch = clamp(amount ?? 0, 0, 1);
    this.crouchBodyOffset = crouch;
    if(this.legs){
      for(const side of ['left','right']){
        const leg = this.legs[side];
        if(!leg) continue;
        const baseKnee = leg.baseRestKneeOffset || leg.restKneeOffset || { x: 0, y: 0 };
        const baseFoot = leg.baseRestFootOffset || leg.restFootOffset || { x: 0, y: 0 };
        const sign = side === 'left' ? -1 : 1;
        const kneeForward = 6;
        const kneeLift = 18;
        const footSpread = 8;
        leg.restKneeOffset.x = baseKnee.x + sign * kneeForward * crouch;
        leg.restKneeOffset.y = baseKnee.y - kneeLift * crouch;
        leg.restFootOffset.x = baseFoot.x + sign * footSpread * crouch;
        leg.restFootOffset.y = baseFoot.y;
        const hipOffset = leg.hipOffset || { x: 0, y: 0 };
        const dx = leg.restKneeOffset.x - hipOffset.x;
        const dy = leg.restKneeOffset.y - hipOffset.y;
        const restLength = Math.max(Math.hypot(dx, dy), 1e-3);
        leg.restLength = restLength;
        leg.stepForward = restLength * LEG_STEP_FORWARD_RATIO;
        leg.releaseDistance = restLength * LEG_RELEASE_MULTIPLIER;
      }
    }
  }

  _updateLegs(dt){
    if(!this.legs) return;
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const leftKneePoint = this.pointsByName.kneeL;
    const rightKneePoint = this.pointsByName.kneeR;
    for(const side of ['left','right']){
      const leg = this.legs[side];
      if(!leg) continue;
      const kneePoint = side === 'left' ? leftKneePoint : rightKneePoint;
      const restKneeX = pelvis.x + leg.restKneeOffset.x;
      const restKneeY = pelvis.y + leg.restKneeOffset.y;
      if(kneePoint){
        leg.knee.x = kneePoint.x;
        leg.knee.y = kneePoint.y;
        leg.stuckPos.x = kneePoint.x;
        leg.stuckPos.y = kneePoint.y;
      }else{
        leg.knee.x = restKneeX;
        leg.knee.y = restKneeY;
        leg.stuckPos.x = restKneeX;
        leg.stuckPos.y = restKneeY;
      }
      const foot = leg.foot;
      if(foot){
        const restFoot = leg.restFootOffset || leg.restKneeOffset;
        const restKneeOffsetY = leg.restKneeOffset?.y ?? 0;
        const restFootOffsetY = restFoot?.y ?? 0;
        const kneeToFootOffset = restFootOffsetY - restKneeOffsetY;
        const baseX = pelvis.x + (restFoot?.x ?? 0);
        const baseY = pelvis.y + restFootOffsetY;
        const targetKneeX = kneePoint ? kneePoint.x : baseX;
        const targetKneeY = kneePoint ? kneePoint.y : (pelvis.y + restKneeOffsetY);
        foot.targetX = targetKneeX;
        foot.targetY = targetKneeY + kneeToFootOffset;
        foot.prevX = Number.isFinite(foot.prevX) ? foot.prevX : foot.x;
        foot.prevY = Number.isFinite(foot.prevY) ? foot.prevY : foot.y;
        if(!Number.isFinite(foot.x)) foot.x = baseX;
        if(!Number.isFinite(foot.y)) foot.y = baseY;
      }
    }
  }

  _sampleGroundHeight(point, x, options={}){
    const world = this.world;
    if(!world || typeof groundHeightAt !== 'function') return null;
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = Number.isFinite(options.tolerance)
      ? options.tolerance
      : STICK_GROUND_TOLERANCE * scale;
    const ignoreCeilings = options && options.ignoreCeilings === false ? false : true;
    const pointRef = point || null;
    const radius = Math.max(0, pointRef?.terrainRadius ?? pointRef?.radius ?? STICK_TERRAIN_RADIUS);
    const referenceY = options.referenceY !== undefined
      ? options.referenceY
      : (pointRef ? pointRef.y + radius : null);
    const referencePadding = options.referencePadding !== undefined
      ? options.referencePadding
      : tolerance + radius;
    const velocityY = options.velocityY !== undefined
      ? options.velocityY
      : (Number.isFinite(pointRef?.vy) ? pointRef.vy : this.verticalVelocity);
    const anchorY = options.anchorY !== undefined
      ? options.anchorY
      : (pointRef ? pointRef.y : (Number.isFinite(referenceY) ? referenceY - radius : null));
    const ceilingHoldDistance = Number.isFinite(options.ceilingHoldDistance)
      ? Math.max(0, options.ceilingHoldDistance)
      : null;
    const holdRange = ceilingHoldDistance !== null
      ? ceilingHoldDistance
      : Math.max(
        tolerance + radius * 1.5,
        radius * 2.4,
        12
      );
    const horizontalHoldDistance = Number.isFinite(options.ceilingHoldHorizontal)
      ? Math.max(0, options.ceilingHoldHorizontal)
      : Math.max(radius * 2, 10);
    const sampleOptions = { surface: 'top' };
    if(referenceY !== undefined) sampleOptions.referenceY = referenceY;
    if(referencePadding !== undefined) sampleOptions.referencePadding = referencePadding;
    if(velocityY !== undefined) sampleOptions.velocityY = velocityY;
    if(options && typeof options === 'object'){
      for(const key of Object.keys(options)){
        if(key === 'tolerance' || key === 'anchorY' || key === 'referenceY' || key === 'referencePadding' || key === 'velocityY' || key === 'ceilingHoldDistance' || key === 'ceilingHoldHorizontal') continue;
        sampleOptions[key] = options[key];
      }
    }
    if(options && typeof options === 'object' && Object.prototype.hasOwnProperty.call(options, 'surface')){
      sampleOptions.surface = options.surface;
    }
    let sample = groundHeightAt(world, x, sampleOptions);
    if(!Number.isFinite(sample)){
      if(pointRef && Number.isFinite(pointRef._lastGroundSampleY) && Number.isFinite(anchorY)){
        const releaseRange = holdRange * 1.2;
        const fallingFast = Number.isFinite(velocityY) && velocityY > Math.max(60, radius * 18);
        if(anchorY > pointRef._lastGroundSampleY + releaseRange || fallingFast){
          pointRef._lastGroundSampleY = null;
          pointRef._lastGroundSampleX = null;
        }
      }
      return sample;
    }
    if(ignoreCeilings && Number.isFinite(anchorY)){
      const ceilingMargin = Math.max(
        tolerance + radius * 0.2,
        radius * 0.35,
        1.5
      );
      if(sample <= anchorY - ceilingMargin){
        let fallback = null;
        if(pointRef){
          const lastY = Number.isFinite(pointRef._lastGroundSampleY) ? pointRef._lastGroundSampleY : null;
          const lastX = Number.isFinite(pointRef._lastGroundSampleX) ? pointRef._lastGroundSampleX : null;
          const verticalOk = lastY !== null && Math.abs(anchorY - lastY) <= holdRange;
          const horizontalOk = lastX === null || Math.abs(x - lastX) <= horizontalHoldDistance;
          const fallingFast = Number.isFinite(velocityY) && velocityY > Math.max(48, radius * 16);
          if(verticalOk && horizontalOk && !fallingFast){
            fallback = lastY;
          }
        }
        if(fallback === null || fallback === undefined){
          if(pointRef && Number.isFinite(pointRef._lastGroundSampleY)){
            const releaseRange = holdRange * 1.2;
            const fallingFast = Number.isFinite(velocityY) && velocityY > Math.max(60, radius * 18);
            if(anchorY > pointRef._lastGroundSampleY + releaseRange || fallingFast){
              pointRef._lastGroundSampleY = null;
              pointRef._lastGroundSampleX = null;
            }
          }
          return null;
        }
        sample = fallback;
      }
    }
    if(pointRef && Number.isFinite(sample)){
      pointRef._lastGroundSampleY = sample;
      pointRef._lastGroundSampleX = x;
    }
    return sample;
  }

  _legElasticConstraintEntries(){
    if(this._legElasticConstraints && Array.isArray(this._legElasticConstraints)){
      return this._legElasticConstraints;
    }
    const entries = [];
    if(Array.isArray(this.rigConstraints)){
      for(const constraint of this.rigConstraints){
        if(!constraint) continue;
        const partA = constraint.a?.rigPart;
        const partB = constraint.b?.rigPart;
        if(!partA || !partB) continue;
        const isLeftUpper = (partA === 'pelvis' && partB === 'kneeL') || (partA === 'kneeL' && partB === 'pelvis');
        const isRightUpper = (partA === 'pelvis' && partB === 'kneeR') || (partA === 'kneeR' && partB === 'pelvis');
        const isBridge = (partA === 'kneeL' && partB === 'kneeR') || (partA === 'kneeR' && partB === 'kneeL');
        if(!(isLeftUpper || isRightUpper || isBridge)) continue;
        if(constraint.elasticity === undefined) continue;
        const baseElasticity = Number.isFinite(constraint._baseElasticity)
          ? constraint._baseElasticity
          : (Number.isFinite(constraint.elasticity) ? constraint.elasticity : 0);
        const strength = Number.isFinite(this._hitboxRigStrength) ? this._hitboxRigStrength : 1;
        entries.push({
          constraint,
          baseElasticity: baseElasticity * strength,
          originalBaseElasticity: baseElasticity,
          baseDamping: Number.isFinite(constraint.damping) ? constraint.damping : 0,
          baseMaxCorrection: constraint.maxCorrection
        });
      }
    }
    this._legElasticConstraints = entries;
    return entries;
  }

  _updateJointTorqueState(dt){
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const targetRaw = Number.isFinite(this._jointTorqueTarget) ? this._jointTorqueTarget : 1;
    const target = clamp(targetRaw, 0, 1);
    let current = Number.isFinite(this._jointTorqueScale) ? this._jointTorqueScale : target;
    if(step <= 0){
      this._jointTorqueScale = target;
      return;
    }
    const response = Number.isFinite(this._jointTorqueResponsePerSec)
      ? Math.max(0, this._jointTorqueResponsePerSec)
      : 0;
    if(response <= 0){
      this._jointTorqueScale = target;
      return;
    }
    const diff = target - current;
    if(Math.abs(diff) <= 1e-6){
      this._jointTorqueScale = target;
      return;
    }
    const lerp = 1 - Math.exp(-response * step);
    const next = current + diff * lerp;
    this._jointTorqueScale = clamp(next, 0, 1);
  }

  applyHitboxRigStrength(multiplier){
    const prevStrength = Number.isFinite(this._hitboxRigStrength) ? this._hitboxRigStrength : 1;
    const strength = Number.isFinite(multiplier) ? Math.max(0, multiplier) : 1;
    this._hitboxRigStrength = strength;
    if(Array.isArray(this.rigConstraints)){
      for(const constraint of this.rigConstraints){
        if(!constraint) continue;
        if(constraint._baseElasticity !== undefined && constraint.elasticity !== undefined){
          const baseElasticity = Number.isFinite(constraint._baseElasticity) ? constraint._baseElasticity : 0;
          constraint.elasticity = baseElasticity * strength;
        }
      }
    }
    if(this._legElasticConstraints && Array.isArray(this._legElasticConstraints)){
      const prevValid = Number.isFinite(prevStrength) && prevStrength > 0 ? prevStrength : null;
      for(const entry of this._legElasticConstraints){
        if(!entry || !entry.constraint) continue;
        if(entry.originalBaseElasticity === undefined){
          let original = Number.isFinite(entry.constraint._baseElasticity)
            ? entry.constraint._baseElasticity
            : null;
          if(original === null){
            if(prevValid && Number.isFinite(entry.baseElasticity)){
              const candidate = entry.baseElasticity / prevValid;
              if(Number.isFinite(candidate)) original = candidate;
            }else if(Number.isFinite(entry.baseElasticity)){
              original = entry.baseElasticity;
            }
          }
          entry.originalBaseElasticity = Number.isFinite(original) ? original : 0;
        }
        const original = Number.isFinite(entry.originalBaseElasticity) ? entry.originalBaseElasticity : 0;
        entry.baseElasticity = original * strength;
      }
    }
  }

  _applyLegClampElasticity(clampState){
    const entries = this._legElasticConstraintEntries();
    if(!entries || !entries.length) return;
    const left = clampState?.left;
    const right = clampState?.right;
    const leftActive = left && (left.locked || left.stepping);
    const rightActive = right && (right.locked || right.stepping);
    const clampsEngaged = !!(clampState && clampState.active && (leftActive || rightActive));
    const elasticityBoost = 3.4;
    const dampingBoost = 3.2;
    const minElasticity = 0.08;
    const minDamping = 0.03;
    const desiredCorrectionRatio = 0.22;
    for(const entry of entries){
      const constraint = entry.constraint;
      if(!constraint) continue;
      const baseElasticity = entry.baseElasticity ?? 0;
      const baseDamping = entry.baseDamping ?? 0;
      const baseMax = entry.baseMaxCorrection;
      if(clampsEngaged){
        const boostedElasticity = Math.max(baseElasticity * elasticityBoost, baseElasticity + 0.06, minElasticity);
        const boostedDamping = Math.max(baseDamping * dampingBoost, baseDamping + 0.02, minDamping);
        constraint.elasticity = boostedElasticity;
        constraint.damping = boostedDamping;
        if(Number.isFinite(constraint.r)){
          const desiredMax = constraint.r * desiredCorrectionRatio;
          if(Number.isFinite(desiredMax)){
            if(Number.isFinite(baseMax)){
              constraint.maxCorrection = Math.max(baseMax, desiredMax);
            }else{
              constraint.maxCorrection = desiredMax;
            }
          }
        }
      }else{
        constraint.elasticity = baseElasticity;
        constraint.damping = baseDamping;
        if(baseMax !== undefined){
          constraint.maxCorrection = baseMax;
        }
      }
    }
  }

  _updateFeetPhysics(dt){
    if(!this.legs) return;
    const legs = this.legs;
    const world = this.world;
    const clampFeet = !!(world && world.gameplayFlags && world.gameplayFlags.feetClamping);
    const clampState = this._updateFootClampTargets(dt, clampFeet);
    this._applyLegClampElasticity(clampState);
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    const pelvis = this.pelvis();
    const hanging = !!this.ledgeGrab;
    const hangState = this.ledgeGrab;
    const hangTargetY = hangState && Number.isFinite(hangState.hangY) ? hangState.hangY + 18 : null;
    for(const side of ['left','right']){
      const leg = legs[side];
      if(!leg) continue;
      const foot = leg.foot;
      if(!foot) continue;
      let followStrength = Number.isFinite(foot.followStrength) ? Math.max(0, foot.followStrength) : FOOT_FOLLOW_PER_SEC;
      let targetX = Number.isFinite(foot.targetX)
        ? foot.targetX
        : foot.x;
      let targetY = Number.isFinite(foot.targetY)
        ? foot.targetY
        : foot.y;
      if(hanging && pelvis){
        const leg = legs ? legs[side] : null;
        const hangTarget = this._resolveHangFootTarget(leg, pelvis, hangState, side);
        if(hangTarget){
          targetX = hangTarget.x;
          targetY = hangTarget.y;
        }else{
          const sway = side === 'left' ? -8 : 8;
          targetX = pelvis.x + sway;
          targetY = hangTargetY !== null ? hangTargetY : pelvis.y + 42;
        }
        followStrength = Math.min(followStrength, 3);
      }
      if(dt > 0 && followStrength > 0){
        const lerpAmount = clamp(dt * followStrength, 0, 1);
        foot.x += (targetX - foot.x) * lerpAmount;
        foot.y += (targetY - foot.y) * lerpAmount;
      }else{
        foot.x = targetX;
        foot.y = targetY;
      }
      let grounded = false;
      let nearGround = false;
      const footClampInfo = clampState ? clampState[side] : null;
      const footStepping = !!(footClampInfo && footClampInfo.stepping);
      if(!hanging && world && typeof groundHeightAt === 'function'){
        const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
        let bottomY = foot.y + radius;
        let surface = this._sampleGroundHeight(foot, foot.x, {
          tolerance,
          referenceY: bottomY,
          referencePadding: tolerance + radius,
          velocityY: foot.vy,
          anchorY: foot.y
        });
        const supportY = Number.isFinite(foot.jumpSurfaceY) ? foot.jumpSurfaceY : null;
        if(Number.isFinite(supportY)){
          const minSupport = foot.y - Math.max(tolerance + radius * 0.35, radius * 0.5, 6);
          if(supportY >= minSupport){
            if(!Number.isFinite(surface)
              || Math.abs(bottomY - supportY) <= Math.abs(bottomY - surface)
              || bottomY <= supportY + tolerance){
              surface = supportY;
            }
          }
        }
        if(Number.isFinite(surface)){
          const desiredY = surface - radius;
          if(bottomY > surface){
            foot.y = desiredY;
            bottomY = desiredY + radius;
            nearGround = true;
            grounded = true;
          }else if(clampFeet && !footStepping){
            const gap = surface - bottomY;
            const clampSnapDistance = Math.max(
              tolerance * 0.5,
              radius * 0.35,
              6
            );
            if(gap >= -FOOT_GROUND_EPSILON && gap <= clampSnapDistance){
              foot.y = desiredY;
              bottomY = desiredY + radius;
              nearGround = true;
              grounded = bottomY >= surface - FOOT_GROUND_EPSILON;
            }
          }else if(bottomY >= surface - FOOT_GROUND_EPSILON){
            grounded = true;
          }
          if(!grounded && bottomY >= surface - tolerance){
            nearGround = true;
          }
        }
      }
      foot.prevX = foot.x;
      foot.prevY = foot.y;
      foot.vx = 0;
      foot.vy = 0;
      if(hanging){
        foot.grounded = false;
        foot.preGroundContact = false;
        foot.jumpGrounded = false;
        foot.jumpReadyUntil = 0;
      }else{
        if(footStepping){
          grounded = false;
          nearGround = false;
        }
        if(!grounded && !nearGround){
          nearGround = this._isFootTouchingGround(foot);
        }
        foot.grounded = grounded;
        foot.preGroundContact = grounded || nearGround || !!foot.jumpGrounded;
      }
    }
    this._applyFootClampPose(clampState);
    this._applyFootClampBodyBalance(clampState, dt);
  }

  _applyFootClampPose(clampState){
    if(!clampState || !clampState.active) return;
    const legs = this.legs;
    if(!legs) return;
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const leftKneePoint = this.pointsByName.kneeL;
    const rightKneePoint = this.pointsByName.kneeR;
    for(const side of ['left','right']){
      const info = clampState[side];
      if(!info || !info.locked || info.stepping) continue;
      const leg = legs[side];
      const foot = leg?.foot;
      if(!leg || !foot) continue;
      const kneePoint = side === 'left' ? leftKneePoint : rightKneePoint;
      if(!kneePoint) continue;
      const baseKneeOffset = leg.baseRestKneeOffset || leg.restKneeOffset;
      const baseFootOffset = leg.baseRestFootOffset || leg.restFootOffset;
      if(!baseKneeOffset || !baseFootOffset) continue;
      const hipOffset = leg.hipOffset || { x: 0, y: 0 };
      const hipX = pelvis.x + hipOffset.x;
      const hipY = pelvis.y + hipOffset.y;
      const footX = foot.x;
      const footY = foot.y;
      if(!Number.isFinite(footX) || !Number.isFinite(footY)) continue;
      const upperLen = Math.max(Math.hypot(baseKneeOffset.x - hipOffset.x, baseKneeOffset.y - hipOffset.y), 1e-3);
      const lowerLen = Math.max(Math.hypot(baseFootOffset.x - baseKneeOffset.x, baseFootOffset.y - baseKneeOffset.y), 1e-3);
      let dx = footX - hipX;
      let dy = footY - hipY;
      let dist = Math.hypot(dx, dy);
      const maxReach = upperLen + lowerLen;
      const minReach = Math.max(Math.abs(upperLen - lowerLen), 1e-3);
      if(!(dist > 1e-5)){
        dist = minReach;
        dx = minReach;
        dy = 0;
      }
      if(dist > maxReach){
        const scale = maxReach / dist;
        dx *= scale;
        dy *= scale;
        dist = maxReach;
      }else if(dist < minReach){
        const scale = minReach / dist;
        dx *= scale;
        dy *= scale;
        dist = minReach;
      }
      const dirX = dx / dist;
      const dirY = dy / dist;
      const cosHip = clamp((dist * dist + upperLen * upperLen - lowerLen * lowerLen) / (2 * upperLen * dist), -1, 1);
      const hipAngle = Math.acos(cosHip);
      const sinHip = Math.sin(hipAngle);
      const perpX = -dirY;
      const perpY = dirX;
      const restFootVecX = baseFootOffset.x - hipOffset.x;
      const restFootVecY = baseFootOffset.y - hipOffset.y;
      const restKneeVecX = baseKneeOffset.x - hipOffset.x;
      const restKneeVecY = baseKneeOffset.y - hipOffset.y;
      const restCross = restFootVecX * restKneeVecY - restFootVecY * restKneeVecX;
      const bendSign = restCross >= 0 ? 1 : -1;
      const kneeX = hipX + dirX * (cosHip * upperLen) + perpX * (bendSign * sinHip * upperLen);
      const kneeY = hipY + dirY * (cosHip * upperLen) + perpY * (bendSign * sinHip * upperLen);
      kneePoint.x = kneeX;
      kneePoint.y = kneeY;
      kneePoint.prevX = kneeX;
      kneePoint.prevY = kneeY;
      kneePoint.vx = 0;
      kneePoint.vy = 0;
      kneePoint.poseTargetX = kneeX;
      kneePoint.poseTargetY = kneeY;
      leg.knee.x = kneeX;
      leg.knee.y = kneeY;
      leg.stuckPos.x = kneeX;
      leg.stuckPos.y = kneeY;
      foot.targetX = footX;
      foot.targetY = footY;
    }
  }

  _applyFootClampBodyBalance(clampState, dt){
    if(!clampState || !clampState.active) return;
    const legs = this.legs;
    if(!legs) return;
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const leftFoot = legs.left?.foot;
    const rightFoot = legs.right?.foot;
    const leftX = leftFoot && Number.isFinite(leftFoot.x) ? leftFoot.x : null;
    const rightX = rightFoot && Number.isFinite(rightFoot.x) ? rightFoot.x : null;
    if(leftX === null && rightX === null) return;
    let targetX;
    if(leftX !== null && rightX !== null){
      targetX = (leftX + rightX) * 0.5;
    }else{
      targetX = leftX !== null ? leftX : rightX;
    }
    if(!Number.isFinite(targetX)) return;
    const followRate = 18;
    const blend = dt && dt > 0 ? clamp(dt * followRate, 0, 1) : 1;
    const nextX = pelvis.x + (targetX - pelvis.x) * blend;
    const shift = nextX - pelvis.x;
    if(Math.abs(shift) < 1e-4) return;
    pelvis.x = nextX;
    if(Number.isFinite(pelvis.prevX)){
      pelvis.prevX += shift;
    }else{
      pelvis.prevX = pelvis.x;
    }
    if(Number.isFinite(pelvis.targetX)){
      pelvis.targetX += shift;
    }
    if(Number.isFinite(pelvis.poseTargetX)){
      pelvis.poseTargetX += shift;
    }
    const spineNames = ['spine','chest','neck','head'];
    if(this.pointsByName){
      for(const name of spineNames){
        const point = this.pointsByName[name];
        if(!point || point.dragged) continue;
        point.x += shift;
        if(Number.isFinite(point.prevX)){
          point.prevX += shift;
        }else{
          point.prevX = point.x;
        }
        if(Number.isFinite(point.poseTargetX)){
          point.poseTargetX += shift;
        }
        if(Number.isFinite(point.targetX)){
          point.targetX += shift;
        }
      }
    }
  }

  _ensureFootClampState(){
    if(!this._footClampState){
      this._footClampState = {
        active: false,
        wasGrounded: false,
        lastMoveDir: 0,
        steppingSide: null,
        stepCooldown: 0,
        left: this._createFootClampFootState(),
        right: this._createFootClampFootState()
      };
    }
    return this._footClampState;
  }

  _createFootClampFootState(){
    return {
      locked: false,
      stepping: false,
      x: null,
      y: null,
      startX: 0,
      startY: 0,
      goalX: 0,
      goalY: 0,
      lift: 0,
      progress: 0,
      duration: 0
    };
  }

  _resetFootClampState(state, grounded){
    if(!state) return;
    state.active = false;
    state.wasGrounded = grounded;
    state.lastMoveDir = 0;
    state.steppingSide = null;
    state.stepCooldown = 0;
    for(const side of ['left','right']){
      const info = state[side];
      if(!info) continue;
      info.locked = false;
      info.stepping = false;
      info.x = null;
      info.y = null;
      info.startX = 0;
      info.startY = 0;
      info.goalX = 0;
      info.goalY = 0;
      info.lift = 0;
      info.progress = 0;
      info.duration = 0;
    }
  }

  _initializeFootClampState(state, tolerance){
    if(!state) return;
    const legs = this.legs;
    if(!legs) return;
    const world = this.world;
    const pelvis = this.pelvis();
    if(!world || !pelvis || typeof groundHeightAt !== 'function') return;
    const sampleFootGround = (foot, x)=>{
      if(!foot) return null;
      const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
      return this._sampleGroundHeight(foot, x, {
        tolerance,
        referenceY: foot.y + radius,
        referencePadding: tolerance + radius,
        velocityY: this.verticalVelocity,
        anchorY: foot.y
      });
    };
    for(const side of ['left','right']){
      const leg = legs[side];
      if(!leg) continue;
      const foot = leg.foot;
      const info = state[side];
      if(!foot || !info) continue;
      const lockX = foot.x;
      const ground = sampleFootGround(foot, lockX);
      const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
      const lockY = Number.isFinite(ground) ? ground - radius : foot.y;
      info.locked = true;
      info.stepping = false;
      info.x = lockX;
      info.y = lockY;
      info.startX = lockX;
      info.startY = lockY;
      info.goalX = lockX;
      info.goalY = lockY;
      info.lift = Math.max(radius * 0.55, 6);
      info.progress = 0;
      info.duration = 0;
      foot.targetX = lockX;
      foot.targetY = lockY;
    }
    state.active = true;
    state.steppingSide = null;
    state.stepCooldown = 0;
    state.lastMoveDir = this._lastMoveFacing || this.dir || 1;
    state.wasGrounded = true;
  }

  _resolveFootClampMotion(){
    const pelvis = this.pelvis();
    const pelvisVx = pelvis && Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
    const storedMove = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    const moveIntent = Number.isFinite(this.moveIntent) ? this.moveIntent : 0;
    const baseSpeed = Number.isFinite(this.moveSpeed) ? this.moveSpeed : this.baseMoveSpeed;
    let axis = 0;
    if(Math.abs(moveIntent) > 0.2){
      axis = moveIntent * baseSpeed;
    }else if(Math.abs(storedMove) > Math.abs(pelvisVx)){
      axis = storedMove;
    }else{
      axis = pelvisVx;
    }
    let dir = 0;
    if(Math.abs(axis) > 1){
      dir = axis > 0 ? 1 : -1;
    }
    return {
      dir,
      speed: Math.abs(axis),
      axis
    };
  }

  _beginFootClampStep(state, side, moveDir, moveSpeed, tolerance){
    if(!state || !side) return false;
    const legs = this.legs;
    if(!legs) return false;
    const leg = legs[side];
    if(!leg) return false;
    const foot = leg.foot;
    if(!foot) return false;
    const info = state[side];
    if(!info) return false;
    const world = this.world;
    const pelvis = this.pelvis();
    if(!world || !pelvis || typeof groundHeightAt !== 'function') return false;
    const rest = leg.restFootOffset || leg.restKneeOffset || { x: 0, y: 0 };
    const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
    const forward = (leg.stepForward || 0) * moveDir;
    const targetX = pelvis.x + rest.x + forward;
    const referenceY = pelvis.y + (rest?.y ?? 0) + radius;
    const ground = this._sampleGroundHeight(foot, targetX, {
      tolerance,
      referenceY,
      referencePadding: tolerance + radius,
      velocityY: this.verticalVelocity,
      anchorY: pelvis.y + (rest?.y ?? 0),
      ignoreCeilings: false
    });
    const targetY = Number.isFinite(ground) ? ground - radius : (pelvis.y + (rest?.y ?? 0));
    info.locked = false;
    info.stepping = true;
    info.startX = Number.isFinite(foot.x) ? foot.x : targetX;
    info.startY = Number.isFinite(foot.y) ? foot.y : targetY;
    info.goalX = targetX;
    info.goalY = targetY;
    info.progress = 0;
    const distance = Math.hypot(info.goalX - info.startX, info.goalY - info.startY);
    const lift = Math.max(radius * 0.55, Math.min(distance * 0.45, radius * 1.4), 6);
    info.lift = lift;
    const duration = clamp(0.36 - Math.min(moveSpeed / 900, 0.2), 0.18, 0.42);
    info.duration = duration;
    state.steppingSide = side;
    state.stepCooldown = Math.max(state.stepCooldown || 0, duration * 0.35);
    return true;
  }

  _finalizeFootClampStep(state, side, tolerance){
    if(!state || !side) return;
    const legs = this.legs;
    if(!legs) return;
    const leg = legs[side];
    if(!leg) return;
    const foot = leg.foot;
    if(!foot) return;
    const info = state[side];
    if(!info) return;
    const world = this.world;
    if(world && typeof groundHeightAt === 'function'){
      const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
      const ground = this._sampleGroundHeight(foot, info.goalX, {
        tolerance,
        referenceY: info.goalY + radius,
        referencePadding: tolerance + radius,
        velocityY: this.verticalVelocity,
        anchorY: foot.y
      });
      if(Number.isFinite(ground)){
        info.goalY = ground - radius;
      }
    }
    info.locked = true;
    info.stepping = false;
    info.progress = info.duration;
    info.x = info.goalX;
    info.y = info.goalY;
    info.startX = info.goalX;
    info.startY = info.goalY;
    foot.targetX = info.goalX;
    foot.targetY = info.goalY;
    state.steppingSide = null;
  }

  _updateFootClampTargets(dt, clampFeet){
    if(!this.legs) return null;
    const state = this._ensureFootClampState();
    const world = this.world;
    const pelvis = this.pelvis();
    const legs = this.legs;
    const leftFoot = legs.left?.foot;
    const rightFoot = legs.right?.foot;
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    const groundedFootCount = Number.isFinite(this._groundedFootCount) ? this._groundedFootCount : 0;
    const leftGrounded = !!(leftFoot && (leftFoot.grounded || leftFoot.preGroundContact));
    const rightGrounded = !!(rightFoot && (rightFoot.grounded || rightFoot.preGroundContact));
    const pelvisGrounded = this._pointGrounded(pelvis);
    const currentlyGrounded = pelvisGrounded || leftGrounded || rightGrounded || groundedFootCount > 0;
    const eligible = clampFeet
      && !this.dead
      && !this.ledgeGrab
      && !!world
      && typeof groundHeightAt === 'function'
      && currentlyGrounded;

    if(!eligible){
      this._resetFootClampState(state, currentlyGrounded);
      return state;
    }

    const stepDt = dt && dt > 0 ? dt : (this.world?.lastDt && this.world.lastDt > 0 ? this.world.lastDt : 0);
    if(!state.active || !state.wasGrounded){
      this._initializeFootClampState(state, tolerance);
    }
    if(stepDt > 0){
      state.stepCooldown = Math.max(0, (state.stepCooldown || 0) - stepDt);
    }
    state.active = true;
    state.wasGrounded = true;

    const motion = this._resolveFootClampMotion();
    const moveDir = motion.dir;
    const moveSpeed = motion.speed;
    if(moveDir !== 0 && state.lastMoveDir && moveDir !== state.lastMoveDir){
      state.steppingSide = null;
      state.stepCooldown = 0;
    }
    if(moveDir !== 0){
      state.lastMoveDir = moveDir;
    }

    const sides = ['left','right'];
    const moveActive = moveDir !== 0 && moveSpeed > 8;

    const maintainLock = (side)=>{
      const leg = legs[side];
      if(!leg) return;
      const foot = leg.foot;
      const info = state[side];
      if(!foot || !info) return;
      const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
      if(info.stepping){
        const duration = Math.max(info.duration || 0, 1e-3);
        const progress = Math.min(duration, info.progress + (stepDt > 0 ? stepDt : duration));
        info.progress = progress;
        const t = duration > 0 ? clamp(progress / duration, 0, 1) : 1;
        const eased = t * t * (3 - 2 * t);
        const arc = Math.sin(Math.min(1, t) * Math.PI) * (info.lift || 0);
        const targetX = info.startX + (info.goalX - info.startX) * eased;
        const baseY = info.goalY;
        const targetY = baseY - arc;
        foot.targetX = targetX;
        foot.targetY = targetY;
        if(t >= 0.999){
          this._finalizeFootClampStep(state, side, tolerance);
        }
        return;
      }
      const releaseLock = ()=>{
        info.locked = false;
        info.x = null;
        info.y = null;
        const fallbackX = Number.isFinite(foot.x) ? foot.x : (pelvis ? pelvis.x : 0);
        const fallbackY = Number.isFinite(foot.y) ? foot.y : (pelvis ? pelvis.y : 0);
        info.startX = fallbackX;
        info.startY = fallbackY;
        info.goalX = fallbackX;
        info.goalY = fallbackY;
        foot.targetX = fallbackX;
        foot.targetY = fallbackY;
      };
      if(info.locked && info.x !== null && info.y !== null && pelvis){
        const hipOffset = leg.hipOffset || { x: 0, y: 0 };
        const baseKneeOffset = leg.baseRestKneeOffset || leg.restKneeOffset;
        const baseFootOffset = leg.baseRestFootOffset || leg.restFootOffset;
        if(baseKneeOffset && baseFootOffset){
          const upperLen = Math.max(Math.hypot(baseKneeOffset.x - hipOffset.x, baseKneeOffset.y - hipOffset.y), 1e-3);
          const lowerLen = Math.max(Math.hypot(baseFootOffset.x - baseKneeOffset.x, baseFootOffset.y - baseKneeOffset.y), 1e-3);
          const maxReach = upperLen + lowerLen;
          const hipX = pelvis.x + hipOffset.x;
          const hipY = pelvis.y + hipOffset.y;
          const footX = Number.isFinite(info.x) ? info.x : foot.x;
          const footY = Number.isFinite(info.y) ? info.y : foot.y;
          if(Number.isFinite(footX) && Number.isFinite(footY)){
            const dist = Math.hypot(footX - hipX, footY - hipY);
            const margin = Math.max(radius * 0.35, 4);
            if(dist > maxReach + margin){
              releaseLock();
              return;
            }
          }
        }
      }
      const clampThreshold = Math.max(
        FOOT_CLAMP_MAX_GROUND_DISTANCE,
        tolerance + FOOT_GROUND_EPSILON
      );
      if(!info.locked || info.x === null || info.y === null){
        const baseX = Number.isFinite(foot.x) ? foot.x : (pelvis ? pelvis.x : 0);
        const baseY = Number.isFinite(foot.y) ? foot.y : (pelvis ? pelvis.y : 0);
        const ground = this._sampleGroundHeight(foot, baseX, {
          tolerance,
          referenceY: baseY + radius,
          referencePadding: tolerance + radius,
          velocityY: this.verticalVelocity,
          anchorY: baseY
        });
        if(!Number.isFinite(ground)){
          releaseLock();
          return;
        }
        const candidateY = ground - radius;
        const distanceToGround = Math.abs(baseY - candidateY);
        if(distanceToGround > clampThreshold){
          releaseLock();
          return;
        }
        info.locked = true;
        info.x = baseX;
        info.y = candidateY;
        info.startX = baseX;
        info.startY = candidateY;
        info.goalX = baseX;
        info.goalY = candidateY;
      }
      let desiredX = info.x;
      if(!moveActive){
        const rest = leg.restFootOffset || leg.restKneeOffset || { x: 0, y: 0 };
        const baseX = pelvis ? pelvis.x + rest.x : desiredX;
        const blend = stepDt > 0 ? clamp(stepDt * 6, 0, 1) : 1;
        desiredX = Number.isFinite(desiredX)
          ? desiredX + (baseX - desiredX) * blend
          : baseX;
      }
      const anchorY = Number.isFinite(info.y) ? info.y : foot.y;
      const ground = this._sampleGroundHeight(foot, desiredX, {
        tolerance,
        referenceY: anchorY + radius,
        referencePadding: tolerance + radius,
        velocityY: this.verticalVelocity,
        anchorY
      });
      if(!Number.isFinite(ground)){
        releaseLock();
        return;
      }
      const desiredY = ground - radius;
      const referenceY = Number.isFinite(foot.y)
        ? foot.y
        : (Number.isFinite(anchorY) ? anchorY : desiredY);
      if(Math.abs(referenceY - desiredY) > clampThreshold){
        releaseLock();
        return;
      }
      info.x = desiredX;
      info.y = desiredY;
      info.startX = desiredX;
      info.startY = desiredY;
      info.goalX = desiredX;
      info.goalY = desiredY;
      foot.targetX = desiredX;
      foot.targetY = desiredY;
    };

    for(const side of sides){
      maintainLock(side);
    }

    if(moveActive){
      const trailing = ()=>{
        let chosen = null;
        let bestLag = 0;
        for(const side of sides){
          const info = state[side];
          const leg = legs[side];
          if(!info || !leg) continue;
          if(info.stepping) return null;
          if(!info.locked || info.x === null) continue;
          const lag = moveDir > 0
            ? (pelvis.x - info.x)
            : (info.x - pelvis.x);
          const threshold = Math.max(leg.stepForward || 0, leg.restLength || 0, 14);
          if(lag > threshold * 0.65 && lag > bestLag){
            bestLag = lag;
            chosen = side;
          }
        }
        return chosen;
      };
      const stepSide = (!state.steppingSide || !state[state.steppingSide]?.stepping)
        ? trailing()
        : null;
      if(stepSide && (state.stepCooldown || 0) <= 0){
        if(this._beginFootClampStep(state, stepSide, moveDir, moveSpeed, tolerance)){
          state.steppingSide = stepSide;
        }
      }
    }

    return state;
  }

  _resolveHangFootTarget(leg, pelvis, hangState, side){
    if(!leg || !pelvis) return null;
    const baseOffset = leg.baseRestFootOffset || leg.restFootOffset;
    const hipOffset = leg.hipOffset || { x: 0, y: 0 };
    if(!baseOffset) return null;
    const restX = baseOffset.x - hipOffset.x;
    const restY = baseOffset.y - hipOffset.y;
    const length = Math.hypot(restX, restY);
    if(!(length > 1e-3)) return null;
    const swaySign = side === 'left' ? -1 : 1;
    const angleOffset = swaySign * 0.12;
    const dir = Number.isFinite(hangState?.dir) ? Math.sign(hangState.dir) || 1 : (this.dir || 1);
    const forwardBias = -dir * 0.08;
    const hangAngle = Math.PI * 0.5 + angleOffset + forwardBias;
    const dropX = Math.cos(hangAngle) * length;
    const dropY = Math.sin(hangAngle) * length;
    const hipX = pelvis.x + hipOffset.x;
    const hipY = pelvis.y + hipOffset.y;
    return {
      x: hipX + dropX,
      y: hipY + dropY
    };
  }

  _enforceHangLegLengths(){
    if(!this.ledgeGrab) return;
    if(!this.pointsByName) return;
    const pelvis = this.pointsByName.pelvis;
    if(!pelvis) return;
    const legs = this.legs || null;
    const baseJointTargets = (typeof RIG_JOINT_TARGET_MAP !== 'undefined') ? RIG_JOINT_TARGET_MAP : null;
    const hangState = this.ledgeGrab;
    const applyLeg = (side)=>{
      const kneeName = side === 'left' ? 'kneeL' : 'kneeR';
      const kneePoint = this.pointsByName[kneeName];
      if(!kneePoint) return;
      const jointConfig = this._jointTargetConfig(kneeName, baseJointTargets);
      const anchorName = jointConfig?.anchor || 'pelvis';
      const anchor = this.pointsByName[anchorName] || pelvis;
      if(!anchor) return;
      const leg = legs ? legs[side] : null;
      const hipOffset = leg?.hipOffset || { x: 0, y: 0 };
      const baseKneeOffset = leg?.baseRestKneeOffset || leg?.restKneeOffset;
      const baseFootOffset = leg?.baseRestFootOffset || leg?.restFootOffset;
      if(!baseKneeOffset || !baseFootOffset){
        const restLength = jointConfig?.restLength;
        if(restLength > 0){
          const dx = kneePoint.x - anchor.x;
          const dy = kneePoint.y - anchor.y;
          const length = Math.hypot(dx, dy);
          if(length > restLength){
            const scale = restLength / length;
            const clampX = anchor.x + dx * scale;
            const clampY = anchor.y + dy * scale;
            kneePoint.x = clampX;
            kneePoint.y = clampY;
            kneePoint.prevX = clampX;
            kneePoint.prevY = clampY;
            kneePoint.vx = 0;
            kneePoint.vy = 0;
          }
        }
        return;
      }
      const hipX = pelvis.x + hipOffset.x;
      const hipY = pelvis.y + hipOffset.y;
      const baseFootVecX = baseFootOffset.x - hipOffset.x;
      const baseFootVecY = baseFootOffset.y - hipOffset.y;
      let baseFootLen = Math.hypot(baseFootVecX, baseFootVecY);
      if(!(baseFootLen > 1e-3)) return;
      let footTarget = this._resolveHangFootTarget(leg, pelvis, hangState, side);
      if(!footTarget){
        footTarget = {
          x: hipX + baseFootVecX,
          y: hipY + baseFootVecY
        };
      }
      let targetFootVecX = footTarget.x - hipX;
      let targetFootVecY = footTarget.y - hipY;
      let targetFootLen = Math.hypot(targetFootVecX, targetFootVecY);
      if(!(targetFootLen > 1e-3)){
        targetFootVecX = baseFootVecX;
        targetFootVecY = baseFootVecY;
        targetFootLen = baseFootLen;
        footTarget = {
          x: hipX + targetFootVecX,
          y: hipY + targetFootVecY
        };
      }
      if(Math.abs(targetFootLen - baseFootLen) > 1e-3){
        const scale = baseFootLen / targetFootLen;
        targetFootVecX *= scale;
        targetFootVecY *= scale;
        targetFootLen = baseFootLen;
        footTarget = {
          x: hipX + targetFootVecX,
          y: hipY + targetFootVecY
        };
      }
      const baseUx = baseFootVecX / baseFootLen;
      const baseUy = baseFootVecY / baseFootLen;
      const targetUx = targetFootVecX / targetFootLen;
      const targetUy = targetFootVecY / targetFootLen;
      const cos = Math.min(1, Math.max(-1, baseUx * targetUx + baseUy * targetUy));
      const sin = baseUx * targetUy - baseUy * targetUx;
      const baseKneeVecX = baseKneeOffset.x - hipOffset.x;
      const baseKneeVecY = baseKneeOffset.y - hipOffset.y;
      const kneeTargetX = hipX + (baseKneeVecX * cos - baseKneeVecY * sin);
      const kneeTargetY = hipY + (baseKneeVecX * sin + baseKneeVecY * cos);
      kneePoint.x = kneeTargetX;
      kneePoint.y = kneeTargetY;
      kneePoint.prevX = kneeTargetX;
      kneePoint.prevY = kneeTargetY;
      kneePoint.vx = 0;
      kneePoint.vy = 0;
      kneePoint.poseTargetX = kneeTargetX;
      kneePoint.poseTargetY = kneeTargetY;
      if(leg){
        if(leg.knee){
          leg.knee.x = kneeTargetX;
          leg.knee.y = kneeTargetY;
        }
        if(leg.stuckPos){
          leg.stuckPos.x = kneeTargetX;
          leg.stuckPos.y = kneeTargetY;
        }
      }
      const restLength = jointConfig?.restLength || Math.hypot(baseKneeVecX, baseKneeVecY);
      if(restLength > 0){
        const dx = kneePoint.x - anchor.x;
        const dy = kneePoint.y - anchor.y;
        const length = Math.hypot(dx, dy);
        if(length > restLength){
          const scale = restLength / length;
          const clampX = anchor.x + dx * scale;
          const clampY = anchor.y + dy * scale;
          kneePoint.x = clampX;
          kneePoint.y = clampY;
          kneePoint.prevX = clampX;
          kneePoint.prevY = clampY;
          if(leg){
            if(leg.knee){
              leg.knee.x = clampX;
              leg.knee.y = clampY;
            }
            if(leg.stuckPos){
              leg.stuckPos.x = clampX;
              leg.stuckPos.y = clampY;
            }
          }
        }
      }
      const foot = leg?.foot;
      if(foot){
        foot.x = footTarget.x;
        foot.y = footTarget.y;
        foot.prevX = footTarget.x;
        foot.prevY = footTarget.y;
        foot.vx = 0;
        foot.vy = 0;
        foot.targetX = footTarget.x;
        foot.targetY = footTarget.y;
        foot.grounded = false;
        foot.preGroundContact = false;
        foot.jumpGrounded = false;
        foot.jumpReadyUntil = 0;
      }
    };
    applyLeg('left');
    applyLeg('right');
  }

  _footSupportSurface(point, options={}){
    if(!point) return null;
    const rects = this._solidRectangles();
    if(!Array.isArray(rects) || !rects.length) return null;
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = Number.isFinite(options.tolerance)
      ? Math.max(0, options.tolerance)
      : Math.max(0, STICK_GROUND_TOLERANCE * scale);
    const radius = Math.max(0, point.terrainRadius ?? point.radius ?? STICK_TERRAIN_RADIUS);
    const bottomY = Number.isFinite(point.y) ? point.y + radius : null;
    if(bottomY === null) return null;
    const baseContact = Math.max(
      tolerance,
      FOOT_GROUND_EPSILON,
      radius * 0.35,
      scale * 1.5
    );
    const contactAllowance = Number.isFinite(options.contactAllowance)
      ? Math.max(0, options.contactAllowance)
      : baseContact;
    const penetrationAllowance = Number.isFinite(options.penetrationAllowance)
      ? Math.max(0, options.penetrationAllowance)
      : Math.max(contactAllowance, tolerance + radius * 0.85, scale * 3.2);
    const maxDistance = Number.isFinite(options.maxDistance)
      ? Math.max(contactAllowance, options.maxDistance)
      : contactAllowance + Math.max(radius * 0.75, scale * 3.8, 4.2);
    const horizontalSlack = Number.isFinite(options.horizontalSlack)
      ? Math.max(0, options.horizontalSlack)
      : Math.max(radius * 1.35, scale * 7.5, 7);
    let best = null;
    for(const rect of rects){
      if(!rect) continue;
      const left = rect.left ?? rect.x ?? 0;
      const right = rect.right ?? ((rect.x ?? 0) + (rect.w ?? rect.width ?? 0));
      const top = rect.top ?? rect.y ?? 0;
      const bottom = rect.bottom ?? ((rect.y ?? 0) + (rect.h ?? rect.height ?? 0));
      if(!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(top) || !Number.isFinite(bottom)) continue;
      if(!(right > left && bottom > top)) continue;
      const horizontalGap = Math.max(
        0,
        left - (point.x + radius),
        (point.x - radius) - right
      );
      if(horizontalGap > horizontalSlack) continue;
      const separation = top - bottomY;
      if(separation > maxDistance) continue;
      if(separation < -penetrationAllowance) continue;
      const absSeparation = Math.abs(separation);
      if(best){
        if(absSeparation > best.absSeparation + 1e-4) continue;
        if(absSeparation >= best.absSeparation - 1e-4){
          if(horizontalGap > best.horizontalGap + 1e-4) continue;
          if(horizontalGap >= best.horizontalGap - 1e-4 && separation > best.separation + 1e-4) continue;
        }
      }
      best = {
        surfaceY: top,
        separation,
        absSeparation,
        horizontalGap,
        rect
      };
    }
    return best;
  }

  _isFootTouchingGround(foot){
    if(!foot) return false;
    const world = this.world;
    if(!world || typeof groundHeightAt !== 'function') return false;
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
    const bottomY = foot.y + radius;
    const contactAllowance = Math.max(
      tolerance,
      FOOT_GROUND_EPSILON,
      radius * 0.35,
      scale * 1.5
    );
    const support = this._footSupportSurface(foot, {
      tolerance,
      contactAllowance,
      maxDistance: contactAllowance + Math.max(radius * 0.75, scale * 3.8, 4.2),
      penetrationAllowance: Math.max(contactAllowance, tolerance + radius * 0.85, scale * 3.2),
      horizontalSlack: Math.max(radius * 1.35, scale * 7.5, 7)
    });
    if(support && Number.isFinite(support.surfaceY)){
      const penetrationAllowance = Math.max(contactAllowance, tolerance + radius * 0.85, scale * 3.2);
      if(support.separation <= contactAllowance && support.separation >= -penetrationAllowance){
        return true;
      }
    }
    let sample = this._sampleGroundHeight(foot, foot.x, {
      tolerance,
      referenceY: bottomY,
      referencePadding: tolerance + radius,
      velocityY: foot.vy,
      anchorY: foot.y
    });
    const supportY = Number.isFinite(foot.jumpSurfaceY) ? foot.jumpSurfaceY : null;
    if(Number.isFinite(support?.surfaceY)){
      if(!Number.isFinite(sample) || Math.abs(bottomY - support.surfaceY) <= Math.abs(bottomY - sample)){
        sample = support.surfaceY;
      }
    }
    if(Number.isFinite(supportY)){
      if(!Number.isFinite(sample) || Math.abs(bottomY - supportY) < Math.abs(bottomY - sample)){
        sample = supportY;
      }
    }
    if(!Number.isFinite(sample)) return false;
    return Math.abs(bottomY - sample) <= contactAllowance;
  }

  _footCanTriggerJump(foot){
    if(!foot) return false;
    const grounded = this._pointGrounded(foot);
    const jumpGrounded = !!foot.jumpGrounded;
    if(grounded || jumpGrounded) return true;

    if(this._isFootTouchingGround(foot)) return true;

    const world = this.world;
    if(!world || typeof groundHeightAt !== 'function') return false;

    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    const radius = Math.max(0, foot.terrainRadius ?? foot.radius ?? STICK_TERRAIN_RADIUS);
    const bottomY = foot.y + radius;
    const now = nowMs();
    const readyUntil = Number.isFinite(foot.jumpReadyUntil) ? foot.jumpReadyUntil : 0;
    let hoverAllowance = Math.max(tolerance, radius * 0.75);
    if(typeof STICK_JUMP_HOVER_ALLOWANCE === 'number' && STICK_JUMP_HOVER_ALLOWANCE > 0){
      hoverAllowance = Math.max(hoverAllowance, scale * STICK_JUMP_HOVER_ALLOWANCE);
    }
    const maxHover = Math.max(scale * 5, radius * 0.6, FOOT_GROUND_EPSILON * 2);
    if(!(hoverAllowance > 0)){
      hoverAllowance = maxHover;
    }else if(hoverAllowance > maxHover){
      hoverAllowance = maxHover;
    }
    const contactAllowance = Math.max(
      tolerance,
      FOOT_GROUND_EPSILON,
      radius * 0.35,
      scale * 1.5
    );
    const supportInfo = this._footSupportSurface(foot, {
      tolerance,
      contactAllowance,
      maxDistance: Math.max(contactAllowance, hoverAllowance + contactAllowance),
      penetrationAllowance: Math.max(contactAllowance, tolerance + radius * 0.85, scale * 3.2),
      horizontalSlack: Math.max(radius * 1.4, scale * 8, 8)
    });
    let supportY = Number.isFinite(foot.jumpSurfaceY) ? foot.jumpSurfaceY : null;
    if(Number.isFinite(supportInfo?.surfaceY)){
      if(supportY === null || Math.abs(bottomY - supportInfo.surfaceY) <= Math.abs(bottomY - supportY)){
        supportY = supportInfo.surfaceY;
      }
    }
    if(supportY !== null && readyUntil && now <= readyUntil){
      const holdAllowance = hoverAllowance + contactAllowance * 0.5;
      if(Math.abs(supportY - bottomY) <= holdAllowance){
        return true;
      }
    }
    let surface = this._sampleGroundHeight(foot, foot.x, {
      tolerance,
      referenceY: bottomY,
      referencePadding: tolerance + radius + hoverAllowance,
      velocityY: foot.vy,
      anchorY: foot.y
    });
    if(Number.isFinite(supportInfo?.surfaceY)){
      const preferSupport = !Number.isFinite(surface)
        || Math.abs(bottomY - supportInfo.surfaceY) <= Math.abs(bottomY - surface) + contactAllowance * 0.35;
      if(preferSupport){
        surface = supportInfo.surfaceY;
      }
    }
    if(supportInfo && Math.abs(supportInfo.separation) <= hoverAllowance + contactAllowance){
      return true;
    }
    if(Number.isFinite(surface)){
      if(bottomY >= surface - hoverAllowance && bottomY <= surface + contactAllowance){
        return true;
      }
    }

    return this._isPointOnJumpableSurface(foot);
  }

  _isPointOnJumpableSurface(point){
    if(!point) return false;
    point.jumpSurfaceY = null;
    const world = this.world;
    if(!world || typeof groundHeightAt !== 'function') return false;
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    const radiusRaw = point.terrainRadius ?? point.radius ?? STICK_TERRAIN_RADIUS;
    const radius = Math.max(0, radiusRaw);
    const x = Number.isFinite(point.x) ? point.x : 0;
    const y = Number.isFinite(point.y) ? point.y : 0;
    const vy = Number.isFinite(point.vy) ? point.vy : 0;
    const bottomY = y + radius;
    const hoverAllowance = Math.max(
      tolerance,
      scale * STICK_JUMP_HOVER_ALLOWANCE,
      radius * 0.75
    );
    const supportAllowance = Math.max(tolerance, radius * 0.5, hoverAllowance);
    const alignmentTolerance = Math.max(tolerance * 1.2, supportAllowance, hoverAllowance);
    const sampleOptions = {
      tolerance,
      referenceY: bottomY,
      referencePadding: tolerance + radius,
      velocityY: vy,
      maxStepUp: Math.max(radius * 1.25, tolerance * 3),
      anchorY: y
    };
    let ground = this._sampleGroundHeight(point, x, sampleOptions);
    const baseGround = Number.isFinite(world.groundY) ? world.groundY : null;

    let supported = false;
    let alignedSupport = false;
    let supportTop = null;
    const supportInfo = this._footSupportSurface(point, {
      tolerance,
      contactAllowance: supportAllowance,
      maxDistance: supportAllowance,
      penetrationAllowance: Math.max(supportAllowance, tolerance + radius * 0.85, scale * 3.2),
      horizontalSlack: Math.max(radius * 1.3, scale * 8, 8)
    });
    if(supportInfo && Number.isFinite(supportInfo.surfaceY)){
      supported = true;
      if(supportTop === null || Math.abs(bottomY - supportInfo.surfaceY) < Math.abs(bottomY - supportTop)){
        supportTop = supportInfo.surfaceY;
      }
      if(!Number.isFinite(ground) || Math.abs(supportInfo.surfaceY - ground) <= alignmentTolerance){
        alignedSupport = true;
      }
      if(!Number.isFinite(ground) || Math.abs(bottomY - supportInfo.surfaceY) <= Math.abs(bottomY - ground)){
        ground = supportInfo.surfaceY;
      }
    }
    const considerSupport = (left, right, top, bottom)=>{
      if(!(right > left && bottom > top)) return;
      if(x + radius <= left || x - radius >= right) return;
      if(bottomY < top - hoverAllowance) return;
      if(bottomY > top + supportAllowance) return;
      supported = true;
      if(supportTop === null || Math.abs(bottomY - top) < Math.abs(bottomY - supportTop)){
        supportTop = top;
      }
      if(Number.isFinite(ground) && Math.abs(top - ground) <= alignmentTolerance){
        alignedSupport = true;
      }
    };

    const rects = this._solidRectangles();
    if(Array.isArray(rects)){
      for(const rect of rects){
        if(!rect) continue;
        const left = rect.left ?? rect.x ?? 0;
        const right = rect.right ?? ((rect.x ?? 0) + (rect.w ?? 0));
        const top = rect.top ?? rect.y ?? 0;
        const bottom = rect.bottom ?? ((rect.y ?? 0) + (rect.h ?? 0));
        considerSupport(left, right, top, bottom);
      }
    }
    const platforms = Array.isArray(world.platforms) ? world.platforms : [];
    for(const platform of platforms){
      if(!platform) continue;
      const left = platform.x ?? 0;
      const width = platform.w ?? 0;
      if(width <= 0) continue;
      const top = platform.y ?? 0;
      const bottom = top + Math.max(platform.h ?? 0, 1);
      considerSupport(left, left + width, top, bottom);
    }

    if(supportTop !== null){
      if(!Number.isFinite(ground) || bottomY < ground - hoverAllowance || bottomY > ground + supportAllowance){
        ground = supportTop;
        alignedSupport = true;
      }
    }

    if(Number.isFinite(baseGround) && Number.isFinite(ground) && ground <= baseGround + tolerance){
      if(bottomY >= ground - hoverAllowance && bottomY <= ground + supportAllowance){
        return true;
      }
    }

    if(!Number.isFinite(ground)) return false;
    if(bottomY < ground - hoverAllowance) return false;
    if(bottomY > ground + supportAllowance) return false;

    const distances = [
      Math.max(STICK_JUMP_SURFACE_SAMPLE_DISTANCE, radius * 0.75),
      Math.max(STICK_JUMP_SURFACE_FAR_SAMPLE, radius * 2)
    ];
    let gentle = alignedSupport;
    let sampled = false;
    if(!gentle){
      for(const distance of distances){
        if(gentle) break;
        for(const dir of [-1, 1]){
          const sampleX = x + dir * distance;
          const neighbor = this._sampleGroundHeight(point, sampleX, sampleOptions);
          if(!Number.isFinite(neighbor)) continue;
          sampled = true;
          const rise = Math.abs(neighbor - ground);
          const slope = distance > 1e-4 ? rise / distance : 0;
          if(slope <= STICK_JUMP_SURFACE_MAX_SLOPE){
            gentle = true;
            break;
          }
        }
      }
    }
    if(!sampled && supported){
      gentle = true;
    }

    const jumpable = supported ? gentle : (gentle && sampled);
    if(jumpable && Number.isFinite(ground)){
      point.jumpSurfaceY = ground;
    }
    return jumpable;
  }

  _groundContactPoints(){
    const contacts = [];
    const pelvis = this.pointsByName?.pelvis;
    if(pelvis) contacts.push(pelvis);
    const kneeL = this.pointsByName?.kneeL;
    if(kneeL) contacts.push(kneeL);
    const kneeR = this.pointsByName?.kneeR;
    if(kneeR) contacts.push(kneeR);
    const leftFoot = this.legs?.left?.foot;
    if(leftFoot) contacts.push(leftFoot);
    const rightFoot = this.legs?.right?.foot;
    if(rightFoot) contacts.push(rightFoot);
    return contacts;
  }

  _releaseLedgeGrab(now=nowMs(), options={}){
    if(!this.ledgeGrab) return;
    const recordRelease = !!options.recordRelease;
    if(recordRelease){
      this.lastGrappleReleaseFromUpAt = now;
    }else{
      this.lastGrappleReleaseFromUpAt = 0;
    }
    this.ledgeGrab = null;
    const skipCooldown = !!options.skipCooldown;
    if(skipCooldown) return;
    const cooldown = Number.isFinite(options.cooldownMs) ? Math.max(0, options.cooldownMs) : 220;
    this.ledgeGrabCooldownUntil = Math.max(this.ledgeGrabCooldownUntil || 0, now + cooldown);
  }

  _refreshLedgeGrabAnchor(state){
    if(!state) return false;
    const world = this.world;
    const solids = this._ledgeGrabSolids();
    if(!Array.isArray(solids) || !solids.length) return false;
    const targetId = state.blockId !== undefined && state.blockId !== null ? String(state.blockId) : null;
    const targetGroup = state.blockGroup !== undefined && state.blockGroup !== null ? String(state.blockGroup) : null;
    const tolerance = 0.5;
    for(const block of solids){
      if(!block) continue;
      const left = block.x ?? 0;
      const width = block.w ?? 0;
      const top = block.y ?? 0;
      const right = left + width;
      const id = block.id !== undefined && block.id !== null ? String(block.id) : null;
      const group = block.group !== undefined && block.group !== null ? String(block.group) : null;
      const idMatch = targetId !== null && id !== null && id === targetId;
      const groupMatch = targetGroup !== null && group !== null && group === targetGroup;
      const positionMatch = Math.abs(left - (state.blockLeft ?? left)) <= tolerance
        && Math.abs(right - (state.blockRight ?? right)) <= tolerance
        && Math.abs(top - (state.blockTop ?? top)) <= tolerance;
      if(!idMatch && !groupMatch && !positionMatch) continue;
      state.blockLeft = left;
      state.blockRight = right;
      state.blockTop = top;
      state.anchorX = state.corner === 'right' ? right : left;
      state.anchorY = top;
      const outside = Number.isFinite(state.outsideOffset) ? state.outsideOffset : 16;
      const depth = Number.isFinite(state.hangDepth) ? state.hangDepth : 28;
      state.hangX = state.corner === 'right' ? right + outside : left - outside;
      state.hangY = top + depth;
      return true;
    }
    return false;
  }

  _ledgeGrabSolids(){
    const world = this.world;
    if(!world || world.blockCollisionEnabled === false) return [];
    const solids = [];
    const terrain = typeof terrainTiles === 'function'
      ? terrainTiles(world)
      : (Array.isArray(world?.terrain) ? world.terrain : []);
    for(const tile of terrain){
      if(!tile) continue;
      const width = tile.w ?? tile.width ?? 0;
      const height = tile.h ?? tile.height ?? 0;
      if(width <= 0 || height <= 0) continue;
      const x = tile.x ?? tile.left ?? 0;
      const y = tile.y ?? tile.top ?? 0;
      solids.push({
        x,
        y,
        w: width,
        h: height,
        id: tile.id !== undefined && tile.id !== null ? String(tile.id) : null,
        group: tile.group !== undefined && tile.group !== null ? String(tile.group) : null
      });
    }
    return solids;
  }

  _ledgeReferenceTileSize(){
    const worldSize = this.world?.levelState?.layoutMeta?.tileSize;
    if(Number.isFinite(worldSize) && worldSize > 0) return worldSize;
    if(typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' && DEFAULT_LAYOUT_TILE_SIZE > 0){
      return DEFAULT_LAYOUT_TILE_SIZE;
    }
    if(typeof BASE_LAYOUT_TILE_SIZE === 'number' && BASE_LAYOUT_TILE_SIZE > 0){
      return BASE_LAYOUT_TILE_SIZE;
    }
    return 30;
  }

  _ledgeCornerDropHeight(block, corner){
    if(!block || !corner) return null;
    const height = Number(block.h ?? block.height ?? 0);
    if(!Number.isFinite(height) || height <= 0) return null;
    const top = Number(block.y ?? block.top ?? 0);
    const left = Number(block.x ?? block.left ?? 0);
    const width = Number(block.w ?? block.width ?? 0);
    const right = left + width;
    const tileSize = this._ledgeReferenceTileSize();
    const offset = Math.max(6, tileSize * 0.3);
    const sampleX = corner.corner === 'left' ? left - offset : right + offset;
    const world = this.world;
    if(world && typeof groundHeightAt === 'function'){
      const groundY = groundHeightAt(world, sampleX, { surface: 'top' });
      if(Number.isFinite(groundY)){
        const drop = groundY - top;
        if(drop > 0) return drop;
      }
    }
    return null;
  }

  _ledgeCornerHasSupportBelow(block, corner, solids){
    if(!block || !corner || !Array.isArray(solids)) return false;
    const height = Number(block.h ?? block.height ?? 0);
    if(!Number.isFinite(height) || height <= 0) return false;
    const left = Number(block.x ?? block.left ?? 0);
    const width = Number(block.w ?? block.width ?? 0);
    const right = left + width;
    const bottom = (Number(block.y ?? block.top ?? 0)) + height;
    const tileSize = this._ledgeReferenceTileSize();
    const tolerance = Math.max(2, tileSize * 0.2);
    const cornerX = corner.corner === 'left' ? left : right;
    for(const other of solids){
      if(!other || other === block) continue;
      const otherHeight = Number(other.h ?? other.height ?? 0);
      if(!Number.isFinite(otherHeight) || otherHeight <= 0) continue;
      const otherLeft = Number(other.x ?? other.left ?? 0);
      const otherWidth = Number(other.w ?? other.width ?? 0);
      const otherRight = otherLeft + otherWidth;
      if(cornerX < otherLeft - tolerance) continue;
      if(cornerX > otherRight + tolerance) continue;
      const otherTop = Number(other.y ?? other.top ?? 0);
      if(Math.abs(otherTop - bottom) <= tolerance){
        return true;
      }
    }
    return false;
  }

  _ledgeGrabMinHeight(){
    // Historically we required ledges to be at least three tiles tall before they
    // were considered valid grappling targets. This caused inconsistencies on
    // handcrafted maps that relied on shorter ledges, so we now accept any solid
    // regardless of height.
    return 0;
  }

  _applyLedgeHangPose(){
    const state = this.ledgeGrab;
    if(!state) return false;
    const pelvis = this.pelvis();
    if(!pelvis) return false;
    const targetX = Number.isFinite(state.hangX) ? state.hangX : pelvis.x;
    const targetY = Number.isFinite(state.hangY) ? state.hangY : pelvis.y;
    const dx = targetX - pelvis.x;
    const dy = targetY - pelvis.y;
    if(Math.abs(dx) > 1e-3 || Math.abs(dy) > 1e-3){
      this._translatePoints(dx, dy);
    }
    pelvis.vx = 0;
    pelvis.vy = 0;
    this.moveVelocity = 0;
    this.verticalVelocity = 0;
    pelvis.grounded = false;
    pelvis.preGroundContact = false;
    if(this.legs){
      for(const side of ['left','right']){
        const foot = this.legs[side]?.foot;
        if(!foot) continue;
        foot.grounded = false;
        foot.preGroundContact = false;
        foot.jumpGrounded = false;
        foot.jumpReadyUntil = 0;
      }
    }
    return true;
  }

  _performLedgeClimb(now=nowMs()){
    const state = this.ledgeGrab;
    if(!state) return false;
    const pelvis = this.pelvis();
    if(!pelvis) return false;
    const left = state.blockLeft ?? state.anchorX ?? pelvis.x;
    const right = state.blockRight ?? left;
    const top = state.blockTop ?? state.anchorY ?? pelvis.y;
    const width = Math.max(0, right - left);
    const inset = Math.min(24, Math.max(12, width * 0.25));
    const climbX = state.dir > 0 ? left + inset : right - inset;
    const climbY = top - 34;
    const duration = 280;
    const lift = 12;
    this._ledgeClimbTransition = {
      startTime: now,
      duration,
      from: { x: pelvis.x, y: pelvis.y },
      to: { x: climbX, y: climbY },
      lift
    };
    this.moveIntent = 0;
    this.moveVelocity = 0;
    this.verticalVelocity = 0;
    this.jumpLocked = true;
    this.isGrounded = false;
    this._releaseLedgeGrab(now, { cooldownMs: 260 + duration });
    return true;
  }

  _updateLedgeClimbTransition(now=nowMs()){
    const state = this._ledgeClimbTransition;
    if(!state) return;
    const pelvis = this.pelvis();
    if(!pelvis){
      this._ledgeClimbTransition = null;
      this.jumpLocked = false;
      return;
    }
    const duration = Math.max(1, Number(state.duration) || 1);
    const startTime = Number.isFinite(state.startTime) ? state.startTime : now;
    const t = clamp((now - startTime) / duration, 0, 1);
    const easeOut = 1 - Math.pow(1 - t, 2);
    const targetX = state.from.x + (state.to.x - state.from.x) * easeOut;
    const linearY = state.from.y + (state.to.y - state.from.y) * t;
    const lift = Number.isFinite(state.lift) ? state.lift : 12;
    const arc = Math.sin(t * Math.PI) * lift;
    const targetY = linearY - arc;
    const dx = targetX - pelvis.x;
    const dy = targetY - pelvis.y;
    if(Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4){
      this._translatePoints(dx, dy);
    }
    this.moveIntent = 0;
    this.moveVelocity = 0;
    this.verticalVelocity = 0;
    this.isGrounded = false;
    if(t >= 1){
      this._ledgeClimbTransition = null;
      this.jumpLocked = false;
    }
  }

  _updateLedgeGrabState(now=nowMs(), dt=0){
    if(this.isEnemy){
      if(this.ledgeGrab) this._releaseLedgeGrab(now, { skipCooldown: true });
      return;
    }
    const world = this.world;
    if(!world) return;
    if(this._ledgeClimbTransition){
      if(this.ledgeGrab) this._releaseLedgeGrab(now, { skipCooldown: true });
      return;
    }
    const selected = world.selected === this;
    const input = selected ? world.input : null;
    const upHeld = !!(input && input.up);
    const state = this.ledgeGrab;
    if(state){
      if(!upHeld){
        this._releaseLedgeGrab(now, { recordRelease: true });
        return;
      }
      if(!this._refreshLedgeGrabAnchor(state)){
        this._releaseLedgeGrab(now);
        return;
      }
      this.dir = state.dir;
      this._lastMoveFacing = state.dir;
      this.moveIntent = 0;
      this.moveVelocity = 0;
      this.verticalVelocity = 0;
      this.jumpLocked = true;
      this.isGrounded = false;
      this._applyLedgeHangPose();
      const axis = input ? ((input.right ? 1 : 0) + (input.left ? -1 : 0)) : 0;
      const axisDir = axis !== 0 ? Math.sign(axis) : 0;
      const stateDir = Number.isFinite(state.dir) ? Math.sign(state.dir) || 0 : 0;
      if(axisDir !== 0 && stateDir !== 0 && axisDir === -stateDir){
        this._releaseLedgeGrab(now);
        return;
      }
      if(axisDir !== 0 && axisDir === stateDir){
        this._performLedgeClimb(now);
      }
      return;
    }
    if(!selected || !upHeld) return;
    if(!this._canAttemptLedgeGrab()) return;
    if(now < (this.ledgeGrabCooldownUntil || 0)) return;
    const pelvis = this.pelvis();
    if(!pelvis) return;
    if(pelvis.grounded || this.isGrounded || (this._groundedFootCount && this._groundedFootCount > 0)) return;
    const solids = this._ledgeGrabSolids();
    if(!Array.isArray(solids) || !solids.length) return;
    const hands = [
      { name: 'handL', point: this.pointsByName.handL },
      { name: 'handR', point: this.pointsByName.handR }
    ];
    const detectionRadius = 20;
    const verticalAllowance = 20;
    const minHeight = this._ledgeGrabMinHeight();
    const tileSize = this._ledgeReferenceTileSize();
    const shortHeightThreshold = tileSize * 1.25;
    const shortDropThreshold = tileSize * 1.1;
    for(const block of solids){
      if(!block) continue;
      const width = block.w ?? 0;
      const height = block.h ?? 0;
      if(width <= 0 || height <= 0) continue;
      if(height < minHeight) continue;
      const left = block.x ?? 0;
      const top = block.y ?? 0;
      const right = left + width;
      if(pelvis.y < top - 12) continue;
      const corners = [
        { corner: 'left', x: left, y: top, dir: 1 },
        { corner: 'right', x: right, y: top, dir: -1 }
      ];
      for(const corner of corners){
        if(height <= shortHeightThreshold){
          const supported = this._ledgeCornerHasSupportBelow(block, corner, solids);
          const dropHeight = this._ledgeCornerDropHeight(block, corner);
          if(supported || (Number.isFinite(dropHeight) && dropHeight <= shortDropThreshold)){
            continue;
          }
        }
        if(corner.corner === 'left' && pelvis.x > left - 4) continue;
        if(corner.corner === 'right' && pelvis.x < right + 4) continue;
        for(const hand of hands){
          const point = hand.point;
          if(!point) continue;
          const dx = point.x - corner.x;
          const dy = point.y - corner.y;
          if(Math.abs(dy) > verticalAllowance) continue;
          const dist = Math.hypot(dx, dy);
          if(!(dist <= detectionRadius)) continue;
          if(corner.corner === 'left' && point.x > left + 8) continue;
          if(corner.corner === 'right' && point.x < right - 8) continue;
          const outsideOffset = 16;
          const hangDepth = Math.max(24, Math.min(40, height * 0.6));
          this.ledgeGrab = {
            corner: corner.corner,
            dir: corner.dir,
            anchorX: corner.x,
            anchorY: corner.y,
            blockLeft: left,
            blockRight: right,
            blockTop: top,
            blockId: block.id !== undefined && block.id !== null ? String(block.id) : null,
            blockGroup: block.group !== undefined && block.group !== null ? String(block.group) : null,
            outsideOffset,
            hangDepth,
            hangX: corner.corner === 'left' ? left - outsideOffset : right + outsideOffset,
            hangY: top + hangDepth
          };
          this.lastGrappleReleaseFromUpAt = 0;
          this.dir = corner.dir;
          this._lastMoveFacing = corner.dir;
          this.moveIntent = 0;
          this.moveVelocity = 0;
          this.verticalVelocity = 0;
          this.jumpLocked = true;
          this.isGrounded = false;
          this._applyLedgeHangPose();
          return;
        }
      }
    }
  }

  _refreshGroundContacts(){
    const world = this.world;
    const points = this._groundContactPoints();
    const leftFoot = this.legs?.left?.foot;
    const rightFoot = this.legs?.right?.foot;
    const now = nowMs();
    const proximityGraceMs = Number.isFinite(STICK_JUMP_PROXIMITY_GRACE_MS)
      ? Math.max(0, STICK_JUMP_PROXIMITY_GRACE_MS)
      : 0;
    if(!points.length){
      this._groundedFootCount = 0;
      return false;
    }
    if(!world || typeof groundHeightAt !== 'function'){
      for(const point of points){
        point.grounded = false;
        point.preGroundContact = false;
        if(point === leftFoot || point === rightFoot){
          point.jumpGrounded = false;
          point.jumpReadyUntil = 0;
          point.jumpSurfaceY = null;
        }
      }
      this._groundedFootCount = 0;
      return false;
    }
    const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
    const tolerance = STICK_GROUND_TOLERANCE * scale;
    let maxPenetration = 0;
    let maxFootPenetration = 0;
    for(const point of points){
      const radius = Math.max(0, point.terrainRadius ?? point.radius ?? STICK_TERRAIN_RADIUS);
      const bottomY = point.y + radius;
      const ground = this._sampleGroundHeight(point, point.x, {
        tolerance,
        referenceY: bottomY,
        referencePadding: tolerance + radius,
        velocityY: this.verticalVelocity,
        anchorY: point.y
      });
      if(Number.isFinite(ground)){
        const penetration = bottomY - ground;
        if(penetration > maxPenetration){
          maxPenetration = penetration;
        }
        const isFoot = point === leftFoot || point === rightFoot;
        if(isFoot && penetration > maxFootPenetration){
          maxFootPenetration = penetration;
        }
      }
      if(point === leftFoot || point === rightFoot){
        point.jumpGrounded = false;
        point.jumpReadyUntil = 0;
      }
    }
    if(maxPenetration > 0){
      const lift = maxFootPenetration > 0 ? maxFootPenetration : maxPenetration;
      this._translatePoints(0, -lift);
    }
    let groundedFeet = 0;
    let firmContact = false;
    for(const point of points){
      const radius = Math.max(0, point.terrainRadius ?? point.radius ?? STICK_TERRAIN_RADIUS);
      const bottomY = point.y + radius;
      let ground = this._sampleGroundHeight(point, point.x, {
        tolerance,
        referenceY: bottomY,
        referencePadding: tolerance + radius,
        velocityY: this.verticalVelocity,
        anchorY: point.y
      });
      const isFoot = point === leftFoot || point === rightFoot;
      let contactThreshold = tolerance;
      let footHoverAllowance = null;
      if(isFoot){
        footHoverAllowance = Math.max(tolerance, radius * 0.75);
        if(typeof STICK_JUMP_HOVER_ALLOWANCE === 'number' && STICK_JUMP_HOVER_ALLOWANCE > 0){
          footHoverAllowance = Math.max(footHoverAllowance, scale * STICK_JUMP_HOVER_ALLOWANCE);
        }
        const maxHover = Math.max(scale * 5, radius * 0.6, FOOT_GROUND_EPSILON * 2);
        if(!(footHoverAllowance > 0)){
          footHoverAllowance = maxHover;
        }else if(footHoverAllowance > maxHover){
          footHoverAllowance = maxHover;
        }
        contactThreshold = Math.max(
          tolerance,
          FOOT_GROUND_EPSILON,
          radius * 0.35,
          scale * 1.5
        );
      }
      if(isFoot){
        this._isPointOnJumpableSurface(point);
        const surfaceY = Number.isFinite(point.jumpSurfaceY) ? point.jumpSurfaceY : null;
        if(surfaceY !== null){
          const minSurface = point.y - Math.max(tolerance + radius * 0.35, radius * 0.5, 6);
          if(surfaceY >= minSurface){
            if(!Number.isFinite(ground)
              || bottomY >= surfaceY - contactThreshold
              || Math.abs(bottomY - surfaceY) <= Math.abs(bottomY - ground)){
              ground = surfaceY;
            }
          }
        }
      }
      let supportY = null;
      if(isFoot){
        const storedSupport = Number.isFinite(point.jumpSurfaceY) ? point.jumpSurfaceY : null;
        if(Number.isFinite(ground)){
          if(storedSupport === null || Math.abs(bottomY - ground) <= Math.abs(bottomY - storedSupport)){
            supportY = ground;
          }else{
            supportY = storedSupport;
          }
        }else{
          supportY = storedSupport;
        }
      }
      let onGround = Number.isFinite(ground) && bottomY >= ground - contactThreshold;
      let canJumpFromPoint = onGround;
      if(isFoot){
        const prevReadyUntil = Number.isFinite(point.jumpReadyUntil) ? point.jumpReadyUntil : 0;
        const holdActive = prevReadyUntil && now <= prevReadyUntil;
        const supportGap = supportY !== null ? Math.abs(supportY - bottomY) : Infinity;
        const withinStoredSupport = supportY !== null
          && footHoverAllowance !== null
          && bottomY >= supportY - footHoverAllowance
          && bottomY <= supportY + contactThreshold;
        if(!canJumpFromPoint && withinStoredSupport){
          canJumpFromPoint = true;
        }
        if(!canJumpFromPoint && supportY !== null && footHoverAllowance !== null){
          const holdAllowance = footHoverAllowance + (holdActive ? contactThreshold * 0.5 : 0);
          if(supportGap <= holdAllowance){
            canJumpFromPoint = true;
          }
        }
        let touchFallback = false;
        if(!canJumpFromPoint){
          touchFallback = this._isFootTouchingGround(point);
          if(touchFallback){
            canJumpFromPoint = true;
          }
        }
        const withinHover = supportY !== null && footHoverAllowance !== null && supportGap <= footHoverAllowance;
        const directSupport = onGround || withinStoredSupport || withinHover || touchFallback;
        if(canJumpFromPoint){
          point.jumpGrounded = true;
          if(directSupport){
            point.jumpReadyUntil = proximityGraceMs > 0 ? now + proximityGraceMs : now;
          }else if(!holdActive && proximityGraceMs > 0){
            point.jumpReadyUntil = now + proximityGraceMs;
          }
          if(Number.isFinite(ground)){
            if(!Number.isFinite(point.jumpSurfaceY) || directSupport || Math.abs(bottomY - ground) <= Math.abs(bottomY - point.jumpSurfaceY)){
              point.jumpSurfaceY = ground;
            }
          }
          groundedFeet++;
        }else{
          point.jumpGrounded = false;
          if(!holdActive){
            point.jumpReadyUntil = 0;
            if(supportY !== null && footHoverAllowance !== null){
              const clearAbove = bottomY < supportY - footHoverAllowance * 1.5;
              const clearBelow = bottomY > supportY + contactThreshold * 1.5;
              if(clearAbove || clearBelow){
                point.jumpSurfaceY = null;
              }
            }else if(!Number.isFinite(ground)){
              point.jumpSurfaceY = null;
            }
          }
        }
      }
      point.grounded = onGround;
      point.preGroundContact = onGround || (isFoot && point.jumpGrounded);
      if(onGround){
        const surfaceY = Number.isFinite(point.jumpSurfaceY) ? point.jumpSurfaceY : ground;
        const compare = Number.isFinite(surfaceY) ? surfaceY : ground;
        const epsilon = isFoot
          ? Math.max(FOOT_GROUND_EPSILON, tolerance * 0.35)
          : Math.max(contactThreshold * 0.35, tolerance * 0.5);
        if(Number.isFinite(compare) && bottomY >= compare - epsilon){
          firmContact = true;
        }
      }
    }
    this._groundedFootCount = groundedFeet;
    return firmContact;
  }

  _updateVerticalMotion(dt){
    const pelvis = this.pelvis();
    if(!pelvis){
      return;
    }
    if(this.flies){
      this._refreshGroundContacts();
      this.verticalVelocity = 0;
      pelvis.vy = 0;
      return;
    }
    if(this.ledgeGrab){
      this._applyLedgeHangPose();
      this._refreshGroundContacts();
      pelvis.vy = 0;
      return;
    }
    if(!(dt > 0)){
      this._refreshGroundContacts();
      pelvis.vy = Number.isFinite(this.verticalVelocity) ? this.verticalVelocity : 0;
      return;
    }
    const gravity = STICK_JUMP_GRAVITY;
    const maxFall = Number.isFinite(this.maxFallSpeed) ? this.maxFallSpeed : STICK_MAX_FALL_SPEED;
    let vy = Number.isFinite(this.verticalVelocity) ? this.verticalVelocity : 0;
    const grounded = this.isGrounded || this._pointGrounded(pelvis);
    if(grounded && vy >= 0){
      vy = 0;
    }else{
      vy += gravity * dt;
      if(maxFall > 0 && vy > maxFall){
        vy = maxFall;
      }
    }
    const dy = vy * dt;
    let appliedDy = 0;
    if(dy !== 0){
      const translation = this._translatePoints(0, dy);
      appliedDy = translation && Number.isFinite(translation.dy) ? translation.dy : dy;
    }
    const landed = this._refreshGroundContacts();
    if(landed){
      vy = 0;
    }else if(dt > 0){
      const resolvedVy = appliedDy / dt;
      if(Number.isFinite(resolvedVy)){
        vy = resolvedVy;
      }
    }
    if(Math.abs(vy) < 1e-3) vy = 0;
    this.verticalVelocity = vy;
    pelvis.vy = vy;
  }

  _resolveJumpGravity(baseValue){
    if(Number.isFinite(baseValue) && baseValue >= 0) return baseValue;
    const custom = this.world && Number.isFinite(this.world.stickGravity) ? this.world.stickGravity : null;
    if(Number.isFinite(custom) && custom >= 0) return custom;
    return STICK_JUMP_GRAVITY;
  }

  _resolveJumpMaxFall(baseValue){
    if(Number.isFinite(baseValue) && baseValue >= 0) return baseValue;
    const custom = this.world && Number.isFinite(this.world.stickMaxFallSpeed) ? this.world.stickMaxFallSpeed : null;
    if(Number.isFinite(custom) && custom >= 0) return custom;
    return STICK_MAX_FALL_SPEED;
  }

  _beginAirJump(state){
    if(!state) return;
    const gravity = this._resolveJumpGravity(state.gravity);
    const maxFall = this._resolveJumpMaxFall(state.maxFallSpeed);
    const velocity = Number.isFinite(state.velocity) ? state.velocity : -this.jumpSpeed;
    const basePose = state.base
      || (typeof this._captureJumpBasePose === 'function'
        ? this._captureJumpBasePose()
        : null);
    this._airJumpState = {
      base: basePose,
      bodyOffset: Number.isFinite(state.offset) ? state.offset : 0,
      velocity,
      gravity,
      maxFall
    };
    this._spawnDoubleJumpBurst(state);
  }

  _ensureWorldParticleBuffer(){
    const world = this.world;
    if(!world) return null;
    if(!Array.isArray(world.particles)) world.particles = [];
    return world.particles;
  }

  _limitWorldParticles(limit=260){
    const world = this.world;
    if(!world || !Array.isArray(world.particles)) return;
    const max = Math.max(0, limit);
    if(world.particles.length > max){
      world.particles.splice(0, world.particles.length - max);
    }
  }

  _footAnchor(){
    const left = this.legs?.left?.foot;
    const right = this.legs?.right?.foot;
    const feet = [];
    const pushFoot = (foot)=>{
      if(!foot) return;
      if(!Number.isFinite(foot.x) || !Number.isFinite(foot.y)) return;
      const radius = Math.max(0, foot.radius ?? STICK_TERRAIN_RADIUS ?? 0);
      feet.push({ point: foot, x: foot.x, y: foot.y, radius });
    };
    pushFoot(left);
    pushFoot(right);
    if(!feet.length) return null;
    let avgX = 0;
    let maxY = -Infinity;
    let lead = feet[0];
    for(const foot of feet){
      avgX += foot.x;
      const contactY = foot.y + foot.radius;
      if(contactY > maxY){
        maxY = contactY;
        lead = foot;
      }
    }
    avgX /= feet.length;
    return { x: avgX, y: maxY, feet, leadFoot: lead };
  }

  _spawnDoubleJumpBurst(state){
    if(this.isEnemy) return;
    const world = this.world;
    if(world && world.selected && world.selected !== this) return;
    const particles = this._ensureWorldParticleBuffer();
    if(!particles) return;
    const anchor = this._footAnchor();
    const center = typeof this.center === 'function' ? this.center() : null;
    const pelvis = typeof this.pelvis === 'function' ? this.pelvis() : null;
    const fallbackX = center?.x ?? pelvis?.x ?? 0;
    const fallbackY = pelvis?.y ?? center?.y ?? 0;
    const baseX = Number.isFinite(anchor?.x) ? anchor.x : fallbackX;
    const baseY = Number.isFinite(anchor?.y) ? anchor.y : (fallbackY + 12);
    const accent = this.accentColor || this.bodyColor || '#7dd3ff';
    const alphaColor = typeof colorWithAlpha === 'function'
      ? colorWithAlpha(accent, 0.85)
      : accent;
    const faintColor = typeof colorWithAlpha === 'function'
      ? colorWithAlpha(accent, 0.35)
      : accent;
    const ring = {
      type: 'ring',
      style: 'ring',
      x: baseX,
      y: baseY,
      radius: 10,
      growth: 160,
      thickness: 2.6,
      life: 0,
      maxLife: 460,
      color: alphaColor,
      alpha: 0.9,
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
    particles.push(ring);
    for(let i=0;i<8;i++){
      const angle = (TAU * i) / 8;
      const dist = rand(4, 18);
      const shard = {
        type: 'grain',
        style: 'grain',
        x: baseX + Math.cos(angle) * dist,
        y: baseY - rand(2, 18),
        vx: Math.cos(angle) * rand(90, 180),
        vy: Math.sin(angle) * rand(-140, -20) - rand(20, 80),
        rotation: rand(0, TAU),
        spin: rand(-6, 6),
        width: rand(6, 11),
        height: rand(2, 4),
        life: 0,
        maxLife: rand(280, 420),
        color: alphaColor,
        alpha: 1,
        ignoreGround: true
      };
      if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'grain');
      particles.push(shard);
    }
    for(let i=0;i<5;i++){
      const puff = {
        type: 'smoke',
        style: 'smoke',
        x: baseX + rand(-10, 10),
        y: baseY + rand(-6, 4),
        vx: rand(-45, 45),
        vy: rand(-160, -60),
        radius: rand(12, 18),
        color: faintColor,
        life: 0,
        maxLife: rand(360, 520),
        driftAmplitude: rand(14, 22),
        driftFrequency: rand(2.4, 3.4),
        baseOpacity: 0.7,
        fadeStart: 0.15,
        fadeEnd: 0.85,
        ignoreGround: true
      };
      if(typeof applyParticleDefinition === 'function') applyParticleDefinition(puff, 'smoke');
      particles.push(puff);
    }
    this._limitWorldParticles(300);
  }

  _spawnSprintBurst(opts={}){
    if(this.isEnemy) return;
    if(this.isUnderwater || this.feetUnderwater) return;
    const particles = this._ensureWorldParticleBuffer();
    if(!particles) return;
    const anchor = this._footAnchor();
    const center = typeof this.center === 'function' ? this.center() : null;
    const pelvis = typeof this.pelvis === 'function' ? this.pelvis() : null;
    const fallbackX = center?.x ?? pelvis?.x ?? 0;
    const fallbackY = pelvis?.y ?? center?.y ?? 0;
    const baseX = Number.isFinite(anchor?.x) ? anchor.x : fallbackX;
    const baseY = Number.isFinite(anchor?.y) ? anchor.y : (fallbackY + 12);
    const facing = this.moveIntent !== 0 ? Math.sign(this.moveIntent) : (this._lastMoveFacing || this.dir || 1);
    const accent = this.accentColor || this.bodyColor || '#7de0ff';
    const boldColor = typeof colorWithAlpha === 'function'
      ? colorWithAlpha(accent, 0.9)
      : accent;
    const trailColor = typeof colorWithAlpha === 'function'
      ? colorWithAlpha(accent, 0.55)
      : accent;
    const streakCount = opts?.end ? 3 : 5;
    for(let i=0;i<streakCount;i++){
      const speed = rand(180, 320);
      const streak = {
        type: 'grain',
        style: 'grain',
        x: baseX - facing * rand(4, 14),
        y: baseY - rand(6, 14),
        vx: -facing * speed + rand(-40, 40),
        vy: rand(-120, -30),
        rotation: rand(-0.4, 0.4),
        spin: rand(-8, 8),
        width: rand(10, 18),
        height: rand(3, 5),
        life: 0,
        maxLife: rand(240, 360),
        color: boldColor,
        alpha: 0.95,
        ignoreGround: true
      };
      if(typeof applyParticleDefinition === 'function') applyParticleDefinition(streak, 'grain');
      particles.push(streak);
    }
    const ring = {
      type: 'ring',
      style: 'ring',
      x: baseX,
      y: baseY,
      radius: opts?.end ? 12 : 8,
      growth: opts?.end ? 110 : 140,
      thickness: opts?.end ? 1.8 : 2.2,
      life: 0,
      maxLife: opts?.end ? 320 : 380,
      color: trailColor,
      alpha: opts?.end ? 0.6 : 0.85,
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
    particles.push(ring);
    this._limitWorldParticles(300);
  }

  _emitSprintDust(dt, moveMagnitude){
    if(this.isEnemy) return;
    if(this.isUnderwater || this.feetUnderwater) return;
    const particles = this._ensureWorldParticleBuffer();
    if(!particles) return;
    if(this._sprintEffectCooldown > 0){
      this._sprintEffectCooldown = Math.max(0, this._sprintEffectCooldown - dt);
      if(this._sprintEffectCooldown > 0) return;
    }
    const anchor = this._footAnchor();
    const center = typeof this.center === 'function' ? this.center() : null;
    const pelvis = typeof this.pelvis === 'function' ? this.pelvis() : null;
    const fallbackX = center?.x ?? pelvis?.x ?? 0;
    const fallbackY = pelvis?.y ?? center?.y ?? 0;
    const baseX = Number.isFinite(anchor?.x) ? anchor.x : fallbackX;
    const baseY = Number.isFinite(anchor?.y) ? anchor.y : (fallbackY + 10);
    const accent = this.accentColor || this.bodyColor || '#7dd3ff';
    const sparkleColor = typeof lightenColor === 'function'
      ? lightenColor(accent, 0.35)
      : accent;
    const glowColor = typeof colorWithAlpha === 'function'
      ? colorWithAlpha(accent, 0.45)
      : accent;
    const facing = this.moveIntent !== 0 ? Math.sign(this.moveIntent) : (this._lastMoveFacing || this.dir || 1);
    const footList = anchor?.feet ?? [];
    const puffs = footList.length ? footList : [{ x: baseX, y: baseY, radius: 6 }];
    const rateScale = clamp(moveMagnitude, 0.2, 1.3);
    for(const foot of puffs){
      const originX = foot.x + rand(-6, 6);
      const originY = (foot.y + foot.radius) ?? baseY;
      const sparkleCount = Math.max(2, Math.round(3 * rateScale + Math.random() * 2));
      for(let i=0;i<sparkleCount;i++){
        const size = rand(6, 12);
        const sparkle = {
          type: 'sparkle',
          style: 'sparkle',
          x: originX + rand(-6, 6),
          y: originY - rand(2, 10),
          vx: -facing * rand(200, 300) + rand(-80, 80),
          vy: rand(-160, -60),
          rotation: rand(0, TAU),
          spin: rand(-6, 6),
          size,
          secondaryScale: rand(0.55, 0.82),
          lineWidth: rand(1.4, 2.2),
          coreSize: rand(1.6, 3.2),
          color: sparkleColor,
          coreColor: typeof lightenColor === 'function' ? lightenColor(sparkleColor, 0.25) : accent,
          glowColor,
          glowRadius: size * rand(1.4, 1.9),
          glowAlpha: rand(0.45, 0.68),
          life: 0,
          maxLife: rand(220, 360),
          baseOpacity: rand(0.75, 1),
          fadeStart: 0.25,
          fadeEnd: 0.95,
          twinkleSpeed: rand(6, 11),
          twinkleOffset: rand(0, Math.PI * 2),
          twinkleAmplitude: rand(0.25, 0.45),
          ignoreGround: true
        };
        if(typeof applyParticleDefinition === 'function') applyParticleDefinition(sparkle, 'sparkle');
        particles.push(sparkle);
      }
    }
    const cooldownBase = 0.05;
    this._sprintEffectCooldown = cooldownBase / rateScale;
    this._limitWorldParticles(300);
  }

  _updateAirJumpState(dt){
    const state = this._airJumpState;
    if(!state) return;
    const clampedDt = dt > 0 ? dt : 0;
    if(clampedDt > 0){
      state.velocity += state.gravity * clampedDt;
      if(Number.isFinite(state.maxFall) && state.maxFall >= 0 && state.velocity > state.maxFall){
        state.velocity = state.maxFall;
      }
      state.bodyOffset += state.velocity * clampedDt;
    }
    const applyJumpPose = typeof this._applyJumpPose === 'function'
      ? this._applyJumpPose.bind(this)
      : null;
    if(!applyJumpPose){
      if(state.bodyOffset >= 0){
        this._airJumpState = null;
      }
      return;
    }
    if(state.bodyOffset >= 0){
      applyJumpPose(0, { airborne: false, base: state.base });
      this._airJumpState = null;
      return;
    }
    applyJumpPose(state.bodyOffset, { airborne: true, base: state.base });
  }

  applyPosture(){
    const pelvis = this.pelvis();
    if(!pelvis) return;
    if(!this.legs){
      this.legs = createLegRig(pelvis.x, pelvis.y);
    }
    const prevGrounded = !!this.wasGrounded;
    const previousAirTime = this.airTime ?? 0;
    const prevVerticalSpeed = this.prevVerticalSpeed ?? 0;

    const now = nowMs();
    const baseDt = this.world?.lastDt;
    const dt = (baseDt && baseDt > 0) ? baseDt : (1/60);
    this._updateJointTorqueState(dt);

    if(this.dead){
      this.softMode = true;
      this._removeWeaponRig();
      this._releaseLedgeGrab(now, { skipCooldown: true });
      this.gloveState = null;
      return;
    }

    this._updateStatusEffects(now);
    this._updateProjectileShields(dt, now);
    this.updateWeaponState(now);
    this._updateWeaponRig(now);
    const world = this.world;
    const kneeL = this.pointsByName.kneeL;
    const kneeR = this.pointsByName.kneeR;

    this._updateLedgeClimbTransition(now);
    this._updateLedgeGrabState(now, dt);
    this._updateVerticalMotion(dt);
    this._updateCrouchState(dt);
    this._updateLegs(dt);
    this._updateFeetPhysics(dt);
    this._enforceHangLegLengths();
    const leftFoot = this.legs?.left?.foot;
    const rightFoot = this.legs?.right?.foot;
    const leftFootContact = !!(leftFoot && leftFoot.grounded);
    const rightFootContact = !!(rightFoot && rightFoot.grounded);
    const leftFootJumpReady = !!(leftFoot && leftFoot.jumpGrounded);
    const rightFootJumpReady = !!(rightFoot && rightFoot.jumpGrounded);
    const leftGrounded = (!!kneeL && !!kneeL.grounded) || leftFootContact;
    const rightGrounded = (!!kneeR && !!kneeR.grounded) || rightFootContact;
    const grounded = (!!pelvis && !!pelvis.grounded) || leftGrounded || rightGrounded;
    const jumpEligible = grounded || leftFootJumpReady || rightFootJumpReady;

    if(leftFootContact || rightFootContact){
      this._markGrappleHoldGrounded();
    }

    if(grounded){
      this.groundTime = Math.min(this.groundTime + 1, 80);
      this.airTime = 0;
      if(this._chainJumpLockActive) this._chainJumpLockActive = false;
      if(this.groundTime > 1) this.jumpLocked = false;
    }else{
      this.airTime = Math.min(this.airTime + 1, 80);
      if(jumpEligible){
        this.groundTime = Math.min(this.groundTime + 1, 6);
        if(this.groundTime > 1) this.jumpLocked = false;
      }else{
        this.groundTime = 0;
      }
    }

    if(this._chainJumpLockActive && (grounded || (jumpEligible && this.groundTime >= 2))){
      this._chainJumpLockActive = false;
    }

    const landed = grounded && !prevGrounded;
    this.isGrounded = grounded;

    const maxAirJumps = this._maxAirJumps();
    if(maxAirJumps <= 0){
      this.airJumpsRemaining = 0;
    }else if(grounded){
      this.airJumpsRemaining = maxAirJumps;
    }else if(this.airJumpsRemaining > maxAirJumps){
      this.airJumpsRemaining = maxAirJumps;
    }

    const frictionFallback = (typeof GROUND_FRICTION_PER_SEC === 'number')
      ? GROUND_FRICTION_PER_SEC
      : 18;
    const blocklessFriction = (typeof BLOCKLESS_GROUND_FRICTION_PER_SEC === 'number')
      ? BLOCKLESS_GROUND_FRICTION_PER_SEC
      : frictionFallback;
    const defaultGroundFriction = (world && world.blockCollisionEnabled === false)
      ? blocklessFriction
      : frictionFallback;
    const airborneFriction = Math.max(defaultGroundFriction * 0.6, 6);
    const groundedFriction = defaultGroundFriction;
    const chainState = this.teamAbilityChain || null;
    const chainAbilityId = chainState?.ability?.id || chainState?.abilityId || null;
    let chainAbility = chainState?.ability || null;
    if(!chainAbility && chainAbilityId && typeof teamAbilityById === 'function'){
      chainAbility = teamAbilityById(chainAbilityId) || null;
    }
    const chainSwinging = !!(this._chainSwingActive && chainAbilityId === 'chainSwing');
    const chainSoftMaintain = Number.isFinite(chainAbility?.chainSoftMaintainMs)
      ? Math.max(16, chainAbility.chainSoftMaintainMs)
      : 120;
    if(chainSwinging){
      this.forceSoftFor(chainSoftMaintain, now);
    }
    const chainSlackArms = chainSwinging
      && chainState
      && chainState.anchor
      && !chainState.floatingAnchor;
    const chainFrictionOverride = (chainSwinging && Number.isFinite(chainAbility?.swingGroundFriction))
      ? Math.max(0, chainAbility.swingGroundFriction)
      : null;
    const resolvedPelvisFriction = chainFrictionOverride !== null
      ? chainFrictionOverride
      : (grounded ? groundedFriction : airborneFriction);
    pelvis.groundFriction = resolvedPelvisFriction;
    if(kneeL){
      const leftFriction = chainFrictionOverride !== null
        ? chainFrictionOverride
        : (leftGrounded ? groundedFriction : airborneFriction);
      kneeL.groundFriction = leftFriction;
    }
    if(kneeR){
      const rightFriction = chainFrictionOverride !== null
        ? chainFrictionOverride
        : (rightGrounded ? groundedFriction : airborneFriction);
      kneeR.groundFriction = rightFriction;
    }

    const storedMoveVx = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    const pelvisVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
    const vx = Math.abs(pelvisVx) > Math.abs(storedMoveVx) ? pelvisVx : storedMoveVx;
    if(Math.abs(vx) > 6){
      this._lastMoveFacing = vx >= 0 ? 1 : -1;
    }else if(Math.abs(this.moveIntent) > 0.4){
      this._lastMoveFacing = this.moveIntent >= 0 ? 1 : -1;
    }

    let desiredDir = this.dir;
    const selected = world && world.selected === this;
    if(selected && world?.input?.aim){
      const aimX = world.input.aim.x;
      if(Number.isFinite(aimX)){
        const dx = aimX - pelvis.x;
        if(Math.abs(dx) > 4){
          desiredDir = dx >= 0 ? 1 : -1;
          this._lastMoveFacing = desiredDir;
        }
      }
    }else{
      let targetDir = null;
      const target = this.target;
      if(target && !target.dead){
        const targetCenter = typeof target.center === 'function' ? target.center() : null;
        if(targetCenter){
          const dx = targetCenter.x - pelvis.x;
          if(Math.abs(dx) > 4){
            targetDir = dx >= 0 ? 1 : -1;
          }
        }
      }
      if(targetDir !== null){
        desiredDir = targetDir;
        this._lastMoveFacing = desiredDir;
      }else if(this._lastMoveFacing){
        desiredDir = this._lastMoveFacing;
      }
    }
    if(desiredDir !== this.dir){
      this.dir = desiredDir >= 0 ? 1 : -1;
    }

    if(this.prevPelvisX === undefined) this.prevPelvisX = pelvis.x;
    this.prevPelvisX = pelvis.x;

    const verticalSpeed = pelvis.vy || 0;

    const forcedSoft = now < (this.forcedSoftUntil || 0);
    if(!forcedSoft && this.forcedSoftUntil && now >= this.forcedSoftUntil){
      this.forcedSoftUntil = 0;
    }

    if(this.backflipActive || chainSwinging){
      this.softMode = true;
    }else if(forcedSoft){
      this.softMode = true;
    }else if(grounded){
      this.softMode = false;
    }else{
      this.softMode = false;
    }

    if(!jumpEligible){
      this.jumpLocked = true;
    }

    if(landed && !this.isEnemy){
      const descent = Math.max(0, prevVerticalSpeed);
      const airborneFrames = previousAirTime;
      const shouldPlay = airborneFrames > 2 || descent > 160;
      const audio = window.audioSystem;
      if(shouldPlay && audio && typeof audio.playEffect === 'function'){
        const strength = clamp(descent / 900, 0.18, 1.1);
        audio.playEffect('land', { strength });
      }
    }

    this.updateComboState(now);

    const ceilingClampActive = this.lastCeilingClampAt && now - this.lastCeilingClampAt < 180;
    if(pelvis && !ceilingClampActive){
      this._lastSafePelvis = { x: pelvis.x, y: pelvis.y };
    }

    if(this.softMode){
      return;
    }

    this.updateArmDynamics(pelvis, dt);
    this.updateBowChargeState(now);
    this.updatePunchState(now);
    this.updateBoxingGloveState(now, dt);
    let ledgeOverride = this.ledgeGrabArmOverrides();
    let sheathOverride = this.sheathArmOverrides(now);
    let comboOverride = this.comboArmOverrides(now);
    let punchOverride = this.punchArmOverrides(now);
    let bowOverride = this.bowArmOverrides(now);
    let gunOverride = this.gunArmOverrides(now);
    let spearOverride = this.spearArmOverrides(now);
    let summonerOverride = this.summonerArmOverrides(now);
    if(chainSlackArms){
      ledgeOverride = null;
      sheathOverride = null;
      comboOverride = null;
      punchOverride = null;
      bowOverride = null;
      gunOverride = null;
      spearOverride = null;
      summonerOverride = null;
    }
    const spineUnit = this._rigSpineUnitVector();
    const baseJointTargets = (typeof RIG_JOINT_TARGET_MAP !== 'undefined') ? RIG_JOINT_TARGET_MAP : null;
    const hitboxRigStrength = Number.isFinite(this._hitboxRigStrength) ? this._hitboxRigStrength : 1;
    const jointTorqueScale = clamp(Number.isFinite(this._jointTorqueScale) ? this._jointTorqueScale : 1, 0, 1);
    const armJointTorqueScale = clamp(Number.isFinite(this._armJointTorqueScale) ? this._armJointTorqueScale : 1, 0, 1);

    for(const name of RIG_CONFIG.names){
      if(name === 'pelvis') continue;
      const point = this.pointsByName[name];
      if(!point) continue;
      if(point.dragged){
        point.poseTargetX = point.x;
        point.poseTargetY = point.y;
        continue;
      }
      const isArm = ARM_POINTS.has(name);
      const override = (ledgeOverride && ledgeOverride[name])
        || (sheathOverride && sheathOverride[name])
        || (comboOverride && comboOverride[name])
        || (punchOverride && punchOverride[name])
        || (bowOverride && bowOverride[name])
        || (gunOverride && gunOverride[name])
        || (spearOverride && spearOverride[name])
        || (summonerOverride && summonerOverride[name])
        || null;
      if(!override && !this.isEnemy && isArm){
        point.poseTargetX = point.x;
        point.poseTargetY = point.y;
        continue;
      }
      let targetX;
      let targetY;
      if(override){
        targetX = override.x;
        targetY = override.y;
      }else{
        const jointConfig = spineUnit ? this._jointTargetConfig(name, baseJointTargets) : null;
        if(jointConfig){
          const anchor = this.pointsByName[jointConfig.anchor];
          if(anchor){
            const dx = point.x - anchor.x;
            const dy = point.y - anchor.y;
            let length = Math.hypot(dx, dy);
            const preserveLegPose = this.ledgeGrab && (name === 'kneeL' || name === 'kneeR');
            if(preserveLegPose && jointConfig.restLength){
              length = jointConfig.restLength;
            }else if(!(length > 1e-3)){
              length = jointConfig.restLength || length;
            }
            if(length > 0){
              const inv = 1 / length;
              const ux = dx * inv;
              const uy = dy * inv;
              const dot = spineUnit.x * ux + spineUnit.y * uy;
              const cross = spineUnit.x * uy - spineUnit.y * ux;
              const currentAngle = Math.atan2(cross, dot);
              const targetAngle = this._resolveJointTargetAngle(jointConfig);
              const hasTarget = Number.isFinite(targetAngle);
              let nextAngle = currentAngle;
              const baseStiffness = Number.isFinite(jointConfig.stiffness)
                ? Math.max(0, jointConfig.stiffness)
                : 0;
              const stiffnessScale = isArm ? armJointTorqueScale : jointTorqueScale;
              const stiffness = baseStiffness * hitboxRigStrength * stiffnessScale;
              if(preserveLegPose && hasTarget){
                nextAngle = targetAngle;
              }else if(stiffness > 0 && hasTarget && Number.isFinite(dt) && dt > 0){
                const error = this._normalizeRadians(currentAngle - targetAngle);
                const maxStep = stiffness * dt;
                const correction = clamp(error, -maxStep, maxStep);
                nextAngle = currentAngle - correction;
              }else if(stiffness > 0 && hasTarget){
                nextAngle = targetAngle;
              }
              const orient = this._rotateVector(spineUnit, nextAngle);
              if(orient){
                targetX = anchor.x + orient.x * length;
                targetY = anchor.y + orient.y * length;
              }
            }
          }
        }
      }
      const crouch = this.crouchBodyOffset || 0;
      if(crouch > 0 && targetX !== undefined && targetY !== undefined){
        if(name === 'head'){
          targetY += 24 * crouch;
        }else if(name === 'neck'){
          targetY += 18 * crouch;
        }else if(name === 'kneeL' || name === 'kneeR'){
          const sign = name === 'kneeL' ? -1 : 1;
          targetX += sign * 6 * crouch;
          targetY -= 18 * crouch;
        }else if(name === 'handL' || name === 'handR'){
          const sign = name === 'handL' ? -1 : 1;
          targetX += sign * 6 * crouch;
          targetY += 12 * crouch;
        }else if(name === 'elbowL' || name === 'elbowR'){
          const sign = name === 'elbowL' ? -1 : 1;
          targetX += sign * 4 * crouch;
          targetY += 10 * crouch;
        }
      }
      if(targetX === undefined || targetY === undefined){
        point.poseTargetX = point.x;
        point.poseTargetY = point.y;
        continue;
      }
      const followWeight = override ? 1 : (isArm ? ARM_POSE_FOLLOW : 1);
      const settleWeight = override ? 1 : (isArm ? ARM_POSE_SETTLE : 1);
      point.updatePoseTarget(targetX, targetY, followWeight);
      point.settlePose(settleWeight);
    }
    this._applySwordComboPose(now);
    this.wasGrounded = grounded;
    this.prevVerticalSpeed = verticalSpeed;
  }

  updateFluidState(dt){
    const world = this.world;
    const step = (dt && dt > 0) ? dt : (world?.lastDt && world.lastDt > 0 ? world.lastDt : 0);
    if(!world){
      this.isUnderwater = false;
      this.underwaterTime = 0;
      this._drownDamagePool = 0;
      this._bubbleTimer = 0;
      this.isInLava = false;
      this.lavaTime = 0;
      this._lavaDamagePool = 0;
      return;
    }
    const wasUnderwater = !!this.isUnderwater;
    const wasInLava = !!this.isInLava;
    let waterSubmerged = false;
    let lavaSubmerged = false;
    const head = this.pointsByName?.head;
    if(!this.dead && head){
      const sampleX = head.x;
      const sampleY = head.y - (UNDERWATER_HEAD_SAMPLE_OFFSET || 0);
      const checkFluid = (field, columnForXFn, rowForYFn, blocks)=>{
        if(Array.isArray(blocks) && blocks.length){
          let range = null;
          if(typeof waterBlockColumnRange === 'function'){
            range = waterBlockColumnRange(blocks, sampleX);
          }
          if(range){
            return sampleY >= range.top && sampleY <= range.bottom;
          }
        }
        if(!field || typeof columnForXFn !== 'function' || typeof rowForYFn !== 'function') return false;
        const col = columnForXFn(field, sampleX);
        if(col < 0) return false;
        let submerged = false;
        const row = rowForYFn(field, sampleY);
        if(row >= 0){
          const idx = row * field.cols + col;
          if(idx >= 0 && idx < field.cells.length){
            submerged = !!field.cells[idx];
          }
        }
        if(!submerged && Array.isArray(field.heights)){
          const height = field.heights[col];
          if(height !== null && height !== undefined){
            submerged = sampleY >= height;
          }
        }
        return submerged;
      };
      waterSubmerged = checkFluid(world.water, waterColumnForX, waterRowForY, world.waterBlocks);
      lavaSubmerged = checkFluid(world.lava, lavaColumnForX, lavaRowForY);
    }
    const processWater = waterSubmerged && !lavaSubmerged;
    const now = nowMs();
    if(processWater){
      this.isUnderwater = true;
      this.underwaterTime = (this.underwaterTime || 0) + step;
      if(!this.isEnemy){
        this._bubbleTimer = (this._bubbleTimer || 0) - step;
        if(this._bubbleTimer <= 0){
          this.spawnUnderwaterBubble();
          this._bubbleTimer = rand(UNDERWATER_BUBBLE_INTERVAL_MIN, UNDERWATER_BUBBLE_INTERVAL_MAX);
        }
        const delay = this.underwaterDamageDelay ?? UNDERWATER_DAMAGE_DELAY;
        if(!this.preventsDrowning && this.underwaterTime >= delay){
          const rate = Math.max(0, this.underwaterDamageRate ?? UNDERWATER_DAMAGE_PER_SEC);
          this._drownDamagePool = (this._drownDamagePool || 0) + rate * step;
          const damage = Math.floor(this._drownDamagePool);
          if(damage >= 1){
            this.takeDamage(damage, 0, 0.05, { attack: 0, ignoreDefense: true, type: 'drowning' }, {
              element: 'environment',
              ignoreResistances: true
            });
            this._drownDamagePool -= damage;
          }
        }else{
          this._drownDamagePool = 0;
        }
      }
      if(this.waterSoft){
        const extend = now + 220;
        this.forcedSoftUntil = Math.max(this.forcedSoftUntil || 0, extend);
      }
      if(this.requiresWater){
        this.outOfWaterTime = 0;
        this._airDamagePool = 0;
      }
    }else{
      this.isUnderwater = false;
      this.underwaterTime = 0;
      this._drownDamagePool = 0;
      if(!this.isEnemy && wasUnderwater){
        this._bubbleTimer = rand(UNDERWATER_BUBBLE_INTERVAL_MIN, UNDERWATER_BUBBLE_INTERVAL_MAX);
      }
      if(this.requiresWater){
        this.outOfWaterTime = (this.outOfWaterTime || 0) + step;
        const delay = Math.max(0, this.airDamageDelay ?? 0.6);
        if(this.outOfWaterTime >= delay){
          const rate = Math.max(0, this.airDamageRate ?? 0);
          if(rate > 0){
            this._airDamagePool = (this._airDamagePool || 0) + rate * step;
            const damage = Math.floor(this._airDamagePool);
            if(damage >= 1){
              this.takeDamage(damage, 0, 0.12, { attack: 0, ignoreDefense: true, type: 'airExposure' }, {
                element: 'environment',
                ignoreResistances: true
              });
              this._airDamagePool -= damage;
            }
          }
        }
      }else{
        this.outOfWaterTime = 0;
        this._airDamagePool = 0;
      }
    }
    if(processWater && this.swimDrag){
      const damp = clamp(step * this.swimDrag, 0, 0.45);
      if(damp > 0){
        for(const point of this.points){
          if(!point) continue;
          point.vx *= (1 - damp);
          point.vy *= (1 - damp * 0.7);
        }
      }
    }
    if(lavaSubmerged){
      this.isInLava = true;
      this.lavaTime = (this.lavaTime || 0) + step;
      const immune = this.lavaImmune || this.element === 'fire';
      const delay = this.lavaDamageDelay ?? LAVA_DAMAGE_DELAY;
      if(!immune && this.lavaTime >= delay){
        const rate = Math.max(0, this.lavaDamageRate ?? LAVA_DAMAGE_PER_SEC);
        this._lavaDamagePool = (this._lavaDamagePool || 0) + rate * step;
        const damage = Math.floor(this._lavaDamagePool);
        if(damage >= 1){
          this.takeDamage(damage, 0, 0.12, { attack: 0, ignoreDefense: true, type: 'lava' }, {
            element: 'environment',
            ignoreResistances: true
          });
          this._lavaDamagePool -= damage;
        }
      }else{
        this._lavaDamagePool = 0;
      }
    }else{
      this.isInLava = false;
      this.lavaTime = 0;
      this._lavaDamagePool = 0;
      if(wasInLava && !this.isEnemy){
        this._bubbleTimer = rand(UNDERWATER_BUBBLE_INTERVAL_MIN, UNDERWATER_BUBBLE_INTERVAL_MAX);
      }
    }
    const leftFoot = this.legs?.left?.foot;
    const rightFoot = this.legs?.right?.foot;
    const feetUnderwater = this._isFootUnderwater(leftFoot) || this._isFootUnderwater(rightFoot);
    this.feetUnderwater = feetUnderwater;
    this.updateStaffState(step);
    this.updateSpiritWeaponState(step);
    this.updateGunState(step);
    this.updateHalfSlotState(step);
  }

  _jointTargetConfig(name, baseMap){
    if(!name) return null;
    const overrides = this._jointTargetOverrides;
    if(overrides && overrides[name]) return overrides[name];
    const map = baseMap !== undefined ? baseMap : ((typeof RIG_JOINT_TARGET_MAP !== 'undefined') ? RIG_JOINT_TARGET_MAP : null);
    if(!map) return null;
    return map[name] || null;
  }

  getJointTargetConfig(name){
    return this._jointTargetConfig(name);
  }

  _resolveJointTargetValue(source, jointConfig){
    if(source === undefined || source === null) return null;
    let value = source;
    if(typeof value === 'function'){
      try{
        value = value.call(this, this, jointConfig);
      }catch(err){
        const jointName = jointConfig?.point || jointConfig?.name || 'joint';
        console.error(`Failed to evaluate joint target for ${jointName}`, err);
        return null;
      }
    }
    if(Number.isFinite(value)) return value;
    return null;
  }

  _resolveJointTargetAngle(jointConfig){
    if(!jointConfig) return null;
    const radScale = (typeof DEG_TO_RAD === 'number' && Number.isFinite(DEG_TO_RAD) && DEG_TO_RAD !== 0)
      ? DEG_TO_RAD
      : (Math.PI / 180);
    const degValue = this._resolveJointTargetValue(jointConfig.targetDeg, jointConfig);
    if(degValue !== null) return degValue * radScale;
    const radValue = this._resolveJointTargetValue(jointConfig.targetRad, jointConfig);
    if(radValue !== null) return radValue;
    if(Number.isFinite(jointConfig.defaultTargetDeg)) return jointConfig.defaultTargetDeg * radScale;
    if(Number.isFinite(jointConfig.defaultTargetRad)) return jointConfig.defaultTargetRad;
    return null;
  }

  setJointTargetDegrees(name, degrees, options){
    if(typeof name !== 'string') return false;
    const key = name.trim();
    if(!key) return false;
    const baseMap = (typeof RIG_JOINT_TARGET_MAP !== 'undefined') ? RIG_JOINT_TARGET_MAP : null;
    if(!baseMap) return false;
    const overrides = this._jointTargetOverrides || (this._jointTargetOverrides = {});
    const base = overrides[key] || baseMap[key];
    if(!base) return false;
    if(!Number.isFinite(degrees)){
      delete overrides[key];
      if(!Object.keys(overrides).length) this._jointTargetOverrides = null;
      return true;
    }
    const radScale = (typeof DEG_TO_RAD === 'number' && Number.isFinite(DEG_TO_RAD) && DEG_TO_RAD !== 0)
      ? DEG_TO_RAD
      : (Math.PI / 180);
    const next = { ...base };
    next.targetDeg = degrees;
    next.targetRad = degrees * radScale;
    if(options){
      if(typeof options.anchor === 'string' && options.anchor.trim()) next.anchor = options.anchor.trim();
      if(options.stiffness !== undefined && Number.isFinite(options.stiffness)) next.stiffness = options.stiffness;
      if(options.restLength !== undefined && Number.isFinite(options.restLength)) next.restLength = options.restLength;
    }
    overrides[key] = next;
    return true;
  }

  setJointTargetRadians(name, radians, options){
    const radScale = (typeof DEG_TO_RAD === 'number' && Number.isFinite(DEG_TO_RAD) && DEG_TO_RAD !== 0)
      ? DEG_TO_RAD
      : (Math.PI / 180);
    if(!Number.isFinite(radians)) return this.setJointTargetDegrees(name, radians, options);
    const degrees = radians / radScale;
    return this.setJointTargetDegrees(name, degrees, options);
  }

  clearJointTargetOverride(name){
    const overrides = this._jointTargetOverrides;
    if(!overrides) return;
    if(name){
      if(typeof name === 'string'){
        const key = name.trim();
        if(key && overrides[key]){
          delete overrides[key];
          if(!Object.keys(overrides).length) this._jointTargetOverrides = null;
        }
      }
      return;
    }
    this._jointTargetOverrides = null;
  }

  _rigSpineVector(){
    const neck = this.pointsByName?.neck;
    const pelvis = this.pointsByName?.pelvis;
    if(!neck || !pelvis) return null;
    return {
      x: pelvis.x - neck.x,
      y: pelvis.y - neck.y
    };
  }

  _rigSpineUnitVector(){
    const vector = this._rigSpineVector();
    if(!vector) return null;
    const length = Math.hypot(vector.x, vector.y);
    if(!(length > 1e-6)) return null;
    const inv = 1 / length;
    return {
      x: vector.x * inv,
      y: vector.y * inv
    };
  }

  _rotateVector(base, angle){
    if(!base) return null;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: base.x * cos - base.y * sin,
      y: base.x * sin + base.y * cos
    };
  }

  _normalizeRadians(angle){
    if(!Number.isFinite(angle)) return 0;
    let value = angle % TAU;
    if(value > Math.PI) value -= TAU;
    if(value < -Math.PI) value += TAU;
    return value;
  }

  spawnUnderwaterBubble(options){
    if(this.isEnemy) return;
    const world = this.world;
    const head = this.pointsByName?.head;
    if(!world || !head) return;
    const particles = world.particles || (world.particles = []);
    const opts = options || {};
    const sampleRange = (min, max, fallbackMin, fallbackMax)=>{
      const a = Number.isFinite(min) ? min : fallbackMin;
      const b = Number.isFinite(max) ? max : fallbackMax;
      if(a === undefined && b === undefined) return fallbackMin;
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      return low === high ? low : rand(low, high);
    };
    const radius = sampleRange(opts.radiusMin, opts.radiusMax, 2.1, 3.6);
    const offsetX = sampleRange(opts.offsetXMin, opts.offsetXMax, -6, 6);
    const offsetY = sampleRange(opts.offsetYMin, opts.offsetYMax, 2, 6);
    const vx = sampleRange(opts.vxMin, opts.vxMax, -14, 14);
    const vy = sampleRange(opts.vyMin, opts.vyMax, -52, -28);
    const riseAccel = sampleRange(opts.riseAccelMin, opts.riseAccelMax, 14, 24);
    const maxLife = sampleRange(opts.maxLifeMin, opts.maxLifeMax, 620, 940);
    const driftDamp = sampleRange(opts.driftDampMin, opts.driftDampMax, 1.6, 2.8);
    const gravityScale = opts.gravityScale !== undefined ? opts.gravityScale : 0;
    const ignoreGround = opts.ignoreGround !== undefined ? opts.ignoreGround : true;
    const opacity = opts.opacity !== undefined ? opts.opacity : 0.85;
    const baseOpacity = opts.baseOpacity !== undefined ? opts.baseOpacity : opacity;
    const bubble = {
      type: opts.type || 'bubble',
      style: opts.style || 'bubble',
      x: head.x + offsetX,
      y: head.y - (UNDERWATER_HEAD_SAMPLE_OFFSET || 0) - offsetY,
      vx,
      vy,
      riseAccel,
      radius,
      life: 0,
      maxLife,
      gravityScale,
      ignoreGround,
      opacity,
      baseOpacity,
      driftDamp,
      fillColor: opts.fillColor || 'rgba(170, 210, 255, 0.25)',
      borderColor: opts.borderColor || 'rgba(200, 236, 255, 0.9)',
      highlightColor: opts.highlightColor || 'rgba(255, 255, 255, 0.55)',
      fadeStart: opts.fadeStart !== undefined ? opts.fadeStart : 0.55,
      fadeDuration: opts.fadeDuration !== undefined ? opts.fadeDuration : 0.45
    };
    if(typeof applyParticleDefinition === 'function'){
      const definitionId = opts.definitionId || 'bubble';
      applyParticleDefinition(bubble, definitionId);
    }
    if(opts.fillColor) bubble.fillColor = opts.fillColor;
    if(opts.borderColor) bubble.borderColor = opts.borderColor;
    if(opts.highlightColor) bubble.highlightColor = opts.highlightColor;
    if(opts.opacity !== undefined) bubble.opacity = opts.opacity;
    if(opts.baseOpacity !== undefined) bubble.baseOpacity = opts.baseOpacity;
    particles.push(bubble);
    const limit = 260;
    if(particles.length > limit){
      particles.splice(0, particles.length - limit);
    }
  }

  _isFootUnderwater(foot){
    if(!foot || !this.world) return false;
    const water = this.world.water;
    const blocks = Array.isArray(this.world.waterBlocks) && this.world.waterBlocks.length
      ? this.world.waterBlocks
      : null;
    if(!blocks && (!water || !water.cells || !Number.isFinite(water.cols) || !Number.isFinite(water.cellSize))) return false;
    if(!blocks && typeof waterColumnForX !== 'function') return false;
    const cells = water?.cells;
    const x = foot.x;
    const y = foot.y;
    if(!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const radius = Math.max(0, foot.radius ?? STICK_TERRAIN_RADIUS);
    const bottom = y + radius;
    if(blocks && typeof waterBlockColumnRange === 'function'){
      const blockRange = waterBlockColumnRange(blocks, x, radius);
      if(blockRange){
        return bottom >= blockRange.top - 0.25 && bottom <= blockRange.bottom + 0.25;
      }
    }
    if(!water || typeof waterColumnForX !== 'function') return false;
    const col = waterColumnForX(water, x);
    if(col < 0) return false;
    let surface = null;
    if(Array.isArray(water.heights) && col < water.heights.length){
      const height = water.heights[col];
      if(height !== null && height !== undefined) surface = height;
    }
    if(surface === null || surface === undefined){
      if(typeof waterRowForY === 'function'){
        const row = waterRowForY(water, bottom);
        if(row >= 0){
          const idx = row * water.cols + col;
          if(idx >= 0 && idx < cells.length && cells[idx]){
            if(typeof waterCellBounds === 'function'){
              const bounds = waterCellBounds(water, col, row);
              surface = bounds ? bounds.top : row * water.cellSize;
            }else{
              surface = row * water.cellSize;
            }
          }
        }
      }
    }
    if(surface === null || surface === undefined) return false;
    return bottom >= surface - 0.25;
  }

  spawnPotionBubbles(color){
    if(this.isEnemy) return;
    const baseColor = color || '#6be36b';
    const safeColor = typeof ensureOpaqueColor === 'function'
      ? ensureOpaqueColor(baseColor)
      : baseColor;
    let fillColor = null;
    let borderColor = null;
    let highlightColor = null;
    if(typeof colorWithAlpha === 'function'){
      const fillHex = typeof lightenColor === 'function' && safeColor
        ? lightenColor(safeColor, 0.35)
        : safeColor;
      const borderHex = typeof lightenColor === 'function' && safeColor
        ? lightenColor(safeColor, 0.18)
        : safeColor;
      const highlightHex = typeof lightenColor === 'function' && safeColor
        ? lightenColor(safeColor, 0.55)
        : safeColor;
      if(fillHex) fillColor = colorWithAlpha(fillHex, 0.24);
      if(borderHex) borderColor = colorWithAlpha(borderHex, 0.82);
      if(highlightHex) highlightColor = colorWithAlpha(highlightHex, 0.6);
    }
    const count = 2 + Math.floor(rand(0, 2));
    for(let i=0; i<count; i++){
      this.spawnUnderwaterBubble({
        fillColor: fillColor || 'rgba(170, 210, 255, 0.25)',
        borderColor: borderColor || 'rgba(200, 236, 255, 0.9)',
        highlightColor: highlightColor || 'rgba(255, 255, 255, 0.55)',
        opacity: 0.9,
        baseOpacity: 0.9,
        vyMin: -60,
        vyMax: -34,
        riseAccelMin: 18,
        riseAccelMax: 28,
        driftDampMin: 1.3,
        driftDampMax: 2.4
      });
    }
  }

  _timeSlowCompensation(){
    const world = this.world;
    if(!world) return 1;
    const state = world.timeSlowState;
    if(!state) return 1;
    if(state.owner && state.owner !== this) return 1;
    const factor = clamp(state.factor ?? 1, 0.05, 1);
    if(factor >= 1) return 1;
    return 1 / factor;
  }

  moveInput(ax){
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const world = this.world;
    const rawDt = world?.lastDtRaw && world.lastDtRaw > 0
      ? world.lastDtRaw
      : (world?.lastDt && world.lastDt > 0 ? world.lastDt : (1/60));
    const simDt = world?.lastDt && world.lastDt > 0 ? world.lastDt : rawDt;
    if(!(simDt > 0)) return;
    const controlDt = simDt * this._timeSlowCompensation();
    if(!(controlDt > 0)) return;
    const dt = controlDt;
    if(this.isChronoFrozen()){
      this.moveIntent = 0;
      this.moveVelocity = 0;
      pelvis.vx = 0;
      return;
    }

    if(this._chainSwingActive && this.teamAbilityChain && this.teamAbilityChain.ability?.id === 'chainSwing'){
      this.moveIntent = 0;
      const ability = this.teamAbilityChain.ability || null;
      let nextVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
      if(world && world.input && dt > 0){
        let axis = 0;
        if(world.input.right) axis += 1;
        if(world.input.left) axis -= 1;
        if(typeof clamp === 'function'){
          axis = clamp(axis, -1, 1);
        }else{
          axis = Math.max(-1, Math.min(1, axis));
        }
        const pushAccel = Number.isFinite(ability?.swingHorizontalPushAcceleration)
          ? Math.max(0, ability.swingHorizontalPushAcceleration)
          : 0;
        if(pushAccel > 0 && axis !== 0){
          const push = pushAccel * axis * dt;
          nextVx += push;
          const facing = axis > 0 ? 1 : -1;
          this.dir = facing;
          this._lastMoveFacing = facing;
        }
      }
      pelvis.vx = nextVx;
      this.moveVelocity = nextVx;
      this.verticalVelocity = Number.isFinite(pelvis.vy) ? pelvis.vy : this.verticalVelocity;
      this.isSprinting = false;
      this.swimBoostActive = false;
      return;
    }

    const rawInput = Number.isFinite(ax) ? ax : 0;
    const magnitude = Math.abs(rawInput);
    const direction = magnitude > 0 ? Math.sign(rawInput) : 0;
    const clampedDir = clamp(direction, -1, 1);
    const strength = clamp(magnitude, 0, 1);

    this.moveIntent = clampedDir * strength;

    if(direction !== 0){
      const facing = direction > 0 ? 1 : -1;
      this.dir = facing;
      this._lastMoveFacing = facing;
    }

    const inputState = this.world?.input || {};
    const underwater = !!(this.isUnderwater || this.feetUnderwater);
    const sprintDef = this._abilityDefinition('sprint');
    const staminaCfg = sprintDef?.stamina || null;
    const duration = Number.isFinite(staminaCfg?.duration) ? Math.max(0.1, staminaCfg.duration) : 2.6;
    const regenDuration = Number.isFinite(staminaCfg?.regenDuration) ? Math.max(0.1, staminaCfg.regenDuration) : 3.2;
    const regenDelay = Number.isFinite(staminaCfg?.regenDelay) ? Math.max(0, staminaCfg.regenDelay) : 0.65;
    const drainRate = 1 / duration;
    const regenRate = 1 / regenDuration;
    if(!Number.isFinite(this.sprintEnergy)) this.sprintEnergy = 1;
    if(!Number.isFinite(this.sprintRegenDelayTimer)) this.sprintRegenDelayTimer = 0;
    if(this.sprintRegenDelayTimer > 0 && dt > 0){
      this.sprintRegenDelayTimer = Math.max(0, this.sprintRegenDelayTimer - dt);
    }
    const sprintUnlocked = this._abilityUnlocked('sprint');
    const groundFrames = Number.isFinite(this.groundTime) ? this.groundTime : 0;
    const sprintNearGround = !!this.isGrounded || groundFrames > 0;
    const prevSprint = !!this.isSprinting;
    let sprintActive = false;
    this.isSprinting = false;
    this.swimBoostActive = false;
    if(!sprintUnlocked){
      this.sprintEnergy = 1;
      this.sprintRegenDelayTimer = 0;
    }
    const moveMagnitude = Math.abs(this.moveIntent);
    const sprintInput = (this.world?.selected === this) && !!inputState.sprint;
    const canSprint = sprintUnlocked
      && sprintInput
      && !underwater
      && !this.isCrouching
      && moveMagnitude > 0.05
      && sprintNearGround;
    if(canSprint && this.sprintEnergy > 0){
      sprintActive = true;
      this.sprintEnergy = clamp(this.sprintEnergy - drainRate * dt, 0, 1);
      if(this.sprintEnergy <= 0){
        sprintActive = false;
        this.sprintRegenDelayTimer = Math.max(this.sprintRegenDelayTimer, regenDelay);
      }
    }else if(canSprint && this.sprintEnergy <= 0){
      this.sprintRegenDelayTimer = Math.max(this.sprintRegenDelayTimer, regenDelay);
    }
    if(prevSprint && !sprintActive){
      this.sprintRegenDelayTimer = Math.max(this.sprintRegenDelayTimer, regenDelay);
    }
    if(!sprintActive && this.sprintRegenDelayTimer <= 0 && this.sprintEnergy < 1){
      this.sprintEnergy = clamp(this.sprintEnergy + regenRate * dt, 0, 1);
    }
    if(!sprintUnlocked){
      sprintActive = false;
    }
    this.isSprinting = sprintActive;

    if(!Number.isFinite(this._sprintEffectCooldown)) this._sprintEffectCooldown = 0;
    if(!Number.isFinite(this._sprintBarAlpha)) this._sprintBarAlpha = 0;
    if(!Number.isFinite(this._sprintBarHold)) this._sprintBarHold = 0;
    if(!sprintUnlocked){
      this._sprintEffectCooldown = 0;
      this._sprintBarHold = 0;
      this._sprintBarAlpha = 0;
    }else{
      if(prevSprint !== sprintActive){
        if(sprintActive){
          this._spawnSprintBurst({ start: true });
          this._sprintBarHold = Math.max(this._sprintBarHold, 0.25);
        }else{
          this._spawnSprintBurst({ end: true });
          this._sprintBarHold = Math.max(this._sprintBarHold, 0.4);
        }
      }
      if(sprintActive && dt > 0){
        this._sprintBarHold = Math.max(this._sprintBarHold, 0.2);
        this._emitSprintDust(dt, moveMagnitude);
      }else if(this._sprintBarHold > 0 && dt > 0){
        this._sprintBarHold = Math.max(0, this._sprintBarHold - dt);
      }
      if(!sprintActive && dt > 0 && this._sprintEffectCooldown > 0){
        this._sprintEffectCooldown = Math.max(0, this._sprintEffectCooldown - dt);
      }
      const showingBar = sprintActive || this._sprintBarHold > 0;
      const targetAlpha = showingBar ? 1 : 0;
      const diff = targetAlpha - this._sprintBarAlpha;
      if(Math.abs(diff) > 1e-3 && dt > 0){
        const fadeRate = diff > 0 ? 6 : 3.5;
        const step = fadeRate * dt;
        if(Math.abs(diff) <= step){
          this._sprintBarAlpha = targetAlpha;
        }else{
          this._sprintBarAlpha += Math.sign(diff) * step;
        }
      }
      this._sprintBarAlpha = clamp(this._sprintBarAlpha, 0, 1);
    }

    const swimUnlocked = this._abilityUnlocked('swimDash');
    let swimApplied = false;
    if(swimUnlocked && underwater && sprintInput){
      const swimX = (inputState.right ? 1 : 0) + (inputState.left ? -1 : 0);
      const swimY = (inputState.down ? 1 : 0) + (inputState.up ? -1 : 0);
      const swimMagnitude = Math.hypot(swimX, swimY);
      if(swimMagnitude > 0){
        const swimDef = this._abilityDefinition('swimDash');
        const swimSpeed = Number.isFinite(swimDef?.swimSpeed)
          ? Math.max(20, swimDef.swimSpeed)
          : Math.max(20, this.baseMoveSpeed * 1.25);
        const swimAccel = Number.isFinite(swimDef?.swimAcceleration)
          ? Math.max(0, swimDef.swimAcceleration)
          : swimSpeed * 3.5;
        const nx = swimX / swimMagnitude;
        const ny = swimY / swimMagnitude;
        const desiredVx = nx * swimSpeed;
        const desiredVy = ny * swimSpeed;
        const currentVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
        const currentVy = Number.isFinite(pelvis.vy) ? pelvis.vy : 0;
        const maxDelta = swimAccel * dt;
        const nextVx = currentVx + clamp(desiredVx - currentVx, -maxDelta, maxDelta);
        const nextVy = currentVy + clamp(desiredVy - currentVy, -maxDelta, maxDelta);
        pelvis.vx = nextVx;
        pelvis.vy = nextVy;
        this.verticalVelocity = nextVy;
        this.moveVelocity = nextVx;
        this.moveIntent = nx * Math.min(1, swimMagnitude);
        if(Math.abs(nx) > 1e-3){
          const facing = nx > 0 ? 1 : -1;
          this.dir = facing;
          this._lastMoveFacing = facing;
        }
        this.swimBoostActive = true;
        swimApplied = true;
        this.isSprinting = false;
      }
    }
    if(swimApplied){
      return;
    }

    const speedMultiplier = this.isSprinting
      ? Math.max(1, sprintDef?.speedMultiplier ?? 2)
      : 1;
    const accelMultiplier = this.isSprinting
      ? Math.max(1, sprintDef?.accelerationMultiplier ?? speedMultiplier)
      : 1;

    let velocity = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    const targetSpeed = this.moveSpeed * this.moveIntent * speedMultiplier;
    if(this.moveIntent !== 0){
      const grounded = pelvis.grounded || this.isGrounded;
      const accelPerSec = grounded ? this.moveForce : this.airMoveForce;
      const maxDelta = Math.max(0, accelPerSec) * controlDt;
      if(maxDelta <= 0){
        velocity = targetSpeed;
      }else if(targetSpeed > velocity){
        velocity = Math.min(targetSpeed, velocity + maxDelta);
      }else if(targetSpeed < velocity){
        velocity = Math.max(targetSpeed, velocity - maxDelta);
      }
    }else{
      const decel = Math.max(0, this.moveDecel) * controlDt;
      if(decel <= 0){
        velocity = 0;
      }else if(Math.abs(velocity) <= decel){
        velocity = 0;
      }else{
        velocity -= Math.sign(velocity) * decel;
      }
    }

    const moveDelta = velocity * controlDt;
    const limitedDelta = this._limitMoveDeltaIntoWall(pelvis, moveDelta);
    let appliedDelta = 0;
    if(limitedDelta !== 0){
      const translation = this._translatePoints(limitedDelta, 0);
      appliedDelta = translation && Number.isFinite(translation.dx) ? translation.dx : limitedDelta;
    }
    let appliedVelocity = simDt > 0 ? appliedDelta / simDt : 0;
    if(Math.abs(appliedVelocity) < 1e-4) appliedVelocity = 0;
    this.moveVelocity = appliedVelocity;
    pelvis.vx = appliedVelocity;
  }

  _jumpHorizontalIntent(){
    const world = this.world;
    if(world && world.selected === this && world.input){
      const input = world.input;
      const rawDir = (input.right ? 1 : 0) + (input.left ? -1 : 0);
      if(rawDir !== 0){
        return rawDir > 0 ? 1 : -1;
      }
    }
    const intent = Number.isFinite(this.moveIntent) ? this.moveIntent : 0;
    if(Math.abs(intent) > 0.25){
      return intent > 0 ? 1 : -1;
    }
    const velocity = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
    if(Math.abs(velocity) > 12){
      return velocity > 0 ? 1 : -1;
    }
    return 0;
  }

  setCrouching(active){
    const desired = active ? 1 : 0;
    this.isCrouching = !!active;
    this.crouchIntent = desired;
  }

  _registerJumpPress(){
    if(!this.world || this.world.selected !== this) return;
    if(!this._abilityUnlocked('grapple')){
      this._grappleHoldActive = false;
      this._grappleHoldArmed = false;
      this._grappleHoldFromGround = false;
      return;
    }
    if(this._grappleHoldActive) return;
    const grounded = this._hasAnyGroundContact();
    this._grappleHoldActive = true;
    this._grappleHoldFromGround = grounded;
    this._grappleHoldArmed = !grounded;
  }

  _canAttemptLedgeGrab(){
    if(!this.world || this.world.selected !== this) return true;
    if(!this._abilityUnlocked('grapple')) return false;
    return !!(this._grappleHoldActive && this._grappleHoldArmed);
  }

  jump(){
    const pelvis = this.pelvis();
    if(!pelvis) return;
    const now = nowMs();
    this._registerJumpPress();
    const doubleJumpUnlocked = this._abilityUnlocked('doubleJump');
    const doubleJumpDef = doubleJumpUnlocked ? this._abilityDefinition('doubleJump') : null;
    const maxAirJumps = doubleJumpUnlocked ? this._maxAirJumps() : 0;
    const canAirJump = doubleJumpUnlocked && this.airJumpsRemaining > 0;
    const releaseAt = Number.isFinite(this.lastGrappleReleaseFromUpAt)
      ? this.lastGrappleReleaseFromUpAt
      : 0;
    const windowMs = 250;
    let grappleHop = false;
    if(releaseAt > 0){
      if(now - releaseAt <= windowMs){
        grappleHop = true;
      }else if(now - releaseAt > windowMs){
        this.lastGrappleReleaseFromUpAt = 0;
      }
    }
    if(this.jumpLocked && !grappleHop && !canAirJump) return;
    if(this._chainJumpLockActive && !grappleHop && !canAirJump) return;
    const vy = Number.isFinite(this.verticalVelocity) ? this.verticalVelocity : 0;
    const leftFoot = this.legs?.left?.foot;
    const rightFoot = this.legs?.right?.foot;
    const proximityReady = this._footCanTriggerJump(leftFoot) || this._footCanTriggerJump(rightFoot);
    if(!grappleHop && vy > 1e-3 && !proximityReady && !canAirJump) return;
    let usingAirJump = false;
    if(!grappleHop && !proximityReady){
      if(canAirJump){
        usingAirJump = true;
      }else{
        return;
      }
    }
    let baseJumpSpeed = Number.isFinite(this.jumpSpeed) ? this.jumpSpeed : STICK_JUMP_SPEED;
    if(this.feetUnderwater){
      baseJumpSpeed *= 0.5;
    }
    let resolvedJumpSpeed = grappleHop ? baseJumpSpeed * 0.75 : baseJumpSpeed;
    if(usingAirJump){
      const airJumpScale = Number.isFinite(doubleJumpDef?.airJumpSpeedScale)
        ? clamp(doubleJumpDef.airJumpSpeedScale, 0.2, 2)
        : 1;
      resolvedJumpSpeed *= airJumpScale;
    }
    const compensation = this._timeSlowCompensation();
    const jumpSpeed = resolvedJumpSpeed * compensation;
    if(!(jumpSpeed > 0)) return;
    if(grappleHop){
      const cooldown = 500;
      const until = now + cooldown;
      this.ledgeGrabCooldownUntil = Math.max(this.ledgeGrabCooldownUntil || 0, until);
    }
    this.lastGrappleReleaseFromUpAt = 0;
    const horizontalIntent = this._jumpHorizontalIntent();
    this.verticalVelocity = -jumpSpeed;
    pelvis.vy = this.verticalVelocity;
    if(horizontalIntent !== 0){
      const baseSpeed = Math.max(0, this.moveSpeed) * compensation;
      const targetSpeed = baseSpeed * (horizontalIntent > 0 ? 1 : -1);
      const currentVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
      const desiredVx = horizontalIntent > 0
        ? Math.max(targetSpeed, currentVx)
        : Math.min(targetSpeed, currentVx);
      this.moveVelocity = desiredVx;
      pelvis.vx = desiredVx;
    }
    if(usingAirJump){
      this.airJumpsRemaining = Math.max(0, this.airJumpsRemaining - 1);
      this._beginAirJump({ velocity: -jumpSpeed });
    }else if(doubleJumpUnlocked){
      this.airJumpsRemaining = maxAirJumps;
      this._airJumpState = null;
    }
    this.isGrounded = false;
    this.jumpLocked = true;
    this.groundTime = 0;
    this.airTime = 0;
  }

  onJumpRelease(){
    if(!this.world || this.world.selected !== this) return;
    if(!this._grappleHoldActive) return;
    this._grappleHoldActive = false;
    this._grappleHoldArmed = false;
    this._grappleHoldFromGround = false;
  }

  requestPlatformDrop(){
    const now = nowMs();
    const recentContact = (this.currentPlatform && (now - (this.lastPlatformContactAt || 0) < 220))
      || (now - (this.lastPlatformContactAt || 0) < 160);
    if(!recentContact) return;
    if(now < (this.nextPlatformDropAllow || 0)) return;
    this.ignorePlatformsUntil = now + 420;
    this.nextPlatformDropAllow = now + 360;
    this.currentPlatform = null;
    this.lastPlatformContactAt = now;
    const dropDistance = 12;
    const pelvis = this.pelvis();
    const points = [this.pointsByName.kneeL, this.pointsByName.kneeR, pelvis].filter(Boolean);
    for(const point of points){
      point.y += dropDistance;
      point.prevY += dropDistance;
      point.grounded = false;
      point.preGroundContact = false;
    }
  }

  // Clamp horizontal translation so we stop just before colliding with nearby walls.
  _limitMoveDeltaIntoWall(point, moveDelta){
    if(!point) return moveDelta;
    if(!Number.isFinite(moveDelta)) return moveDelta;
    const world = this.world;
    let limited = moveDelta;
    const offsets = this._gatherCollisionOffsets();
    if(world && world.blockCollisionEnabled !== false && moveDelta !== 0){
      const rects = this._solidRectangles();
      if(Array.isArray(rects) && rects.length && Array.isArray(offsets) && offsets.length){
        const direction = Math.sign(moveDelta);
        if(direction !== 0){
          const pelvisX = point.x;
          const pelvisY = point.y;
          const epsilon = 0.01;
          const baseWallBuffer = typeof STICK_WALL_VERTICAL_BUFFER === 'number' ? STICK_WALL_VERTICAL_BUFFER : 0;
          for(const rect of rects){
            if(!rect) continue;
            const left = rect.left ?? rect.x ?? 0;
            const right = rect.right ?? ((rect.x ?? 0) + (rect.w ?? 0));
            const top = rect.top ?? rect.y ?? 0;
            const bottom = rect.bottom ?? ((rect.y ?? 0) + (rect.h ?? 0));
            if(!(right > left && bottom > top)) continue;
            for(const offset of offsets){
              if(!offset) continue;
              const radius = offset.radius ?? 0;
              const pointY = pelvisY + offset.dy;
              const verticalAllowance = Math.max(baseWallBuffer, Math.min(radius, baseWallBuffer > 0 ? baseWallBuffer * 1.5 : radius));
              if(pointY <= top + verticalAllowance) continue;
              if(pointY >= bottom - verticalAllowance) continue;
              const minY = pointY - radius;
              const maxY = pointY + radius;
              if(maxY <= top || minY >= bottom) continue;
              const pointX = pelvisX + offset.dx;
              const startLeft = pointX - radius;
              const startRight = pointX + radius;
              const overlapsHoriz = (startLeft < right) && (startRight > left);
              if(direction > 0){
                if(overlapsHoriz && startRight > right){
                  limited = Math.min(limited, 0);
                  continue;
                }
                if(startRight <= left){
                  const dist = left - startRight - epsilon;
                  if(dist < limited){
                    limited = Math.max(0, dist);
                  }
                }
              }else{
                if(overlapsHoriz && startLeft < left){
                  limited = Math.max(limited, 0);
                  continue;
                }
                if(startLeft >= right){
                  const dist = right - startLeft + epsilon;
                  if(dist > limited){
                    limited = Math.min(0, dist);
                  }
                }
              }
            }
          }
        }
      }
    }
    return this._limitMoveDeltaToBounds(point, limited, offsets);
  }

  _limitMoveDeltaToBounds(point, moveDelta, offsets){
    if(!point) return moveDelta;
    if(!Number.isFinite(moveDelta)) return moveDelta;
    const world = this.world;
    if(!world) return moveDelta;
    if(typeof getActiveLevelBounds !== 'function') return moveDelta;
    const bounds = getActiveLevelBounds(world);
    if(!bounds) return moveDelta;
    const hasLeft = Number.isFinite(bounds.left);
    const hasRight = Number.isFinite(bounds.right);
    if(!hasLeft && !hasRight) return moveDelta;
    const pelvisX = point.x;
    const fallbackRadius = Math.max(0, point.terrainRadius ?? STICK_TERRAIN_RADIUS);
    const offsetList = (Array.isArray(offsets) && offsets.length)
      ? offsets
      : [{ dx: 0, radius: fallbackRadius }];
    let minDelta = -Infinity;
    let maxDelta = Infinity;
    for(const offset of offsetList){
      if(!offset) continue;
      const radius = Math.max(0, offset.radius ?? fallbackRadius);
      const baseX = pelvisX + (offset.dx ?? 0);
      if(hasLeft){
        const candidate = (bounds.left + radius) - baseX;
        if(candidate > minDelta) minDelta = candidate;
      }
      if(hasRight){
        const candidate = (bounds.right - radius) - baseX;
        if(candidate < maxDelta) maxDelta = candidate;
      }
    }
    if(minDelta > maxDelta){
      const mid = (minDelta + maxDelta) * 0.5;
      minDelta = mid;
      maxDelta = mid;
    }
    return clamp(moveDelta, minDelta, maxDelta);
  }

  tryAttack(tx,ty){
    const now = nowMs();
    this.updateWeaponState(now);
    const pendingOrigin = this._pendingProjectileOrigin;
    this._pendingProjectileOrigin = null;
    const origin = pendingOrigin ? { x: pendingOrigin.x, y: pendingOrigin.y } : this.center();
    const aimX = tx ?? (origin.x + this.dir * 120);
    const aimY = ty ?? origin.y;
    const dirX = Math.sign(aimX - origin.x) || this.dir;
    this.dir = dirX >= 0 ? 1 : -1;
    const baseAngle = Math.atan2(aimY - origin.y, aimX - origin.x);
    this.lastAttackAim = { x: aimX, y: aimY, angle: baseAngle };
    const weapon = this.weapon();
    this.updateComboState(now);
    const gloveEquipped = !!(weapon && weapon.boxingGlove);
    if(!weapon || gloveEquipped){
      if(now < (this.weaponCooldownUntil || 0)) return;
      this.performPunch(now, aimX, aimY, baseAngle, gloveEquipped ? weapon : null);
      return;
    }
    if(weapon.kind === 'shield'){
      if(now < (this.weaponCooldownUntil || 0)) return;
      this.resetCombo(false);
      const braceDuration = Math.max(220, weapon.braceDuration ?? weapon.swingDuration ?? 320);
      const cooldown = weapon.cooldown ?? braceDuration + 200;
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponSwingUntil = now + braceDuration;
      this.weaponLastActiveTime = now;
      this.weaponCooldownUntil = now + cooldown;
      this.weaponReachMultiplier = 1;
      this._extendWeaponTerrainIgnore(now + braceDuration + 300);
      return;
    }
    const isSpear = weapon.kind === 'melee' && weapon.poseStyle === 'spear';
    const burstCount = weapon.burstCount || 1;
    const spread = weapon.spread || 0;
    const blastRadius = this.blastRadius ?? weapon.blastRadius;
    const blastDamage = this.blastDamage ?? weapon.blastDamage;
    const pullRadius = this.pullRadius ?? weapon.pullRadius;
    const pullStrength = this.pullStrength ?? weapon.pullStrength;
    const fireProjectileBurst = () => {
      if(!weapon.projectile) return false;
      if(weapon.kind === 'gun'){
        const consumed = this._consumeGunRound(weapon, now);
        if(!consumed) return false;
        if(Math.random() < 0.25){
          return false;
        }
      }
      const shots = Math.max(1, burstCount);
      const totalSpread = spread * (shots - 1);
      const startAngle = baseAngle - totalSpread * 0.5;
      let firedAny = false;
      let preparedPose = false;
      for(let i=0;i<shots;i++){
        const angle = shots > 1 ? startAngle + spread * i : baseAngle;
        const target = { x: origin.x + Math.cos(angle) * 240, y: origin.y + Math.sin(angle) * 240 };
        const projectileOpts = {
          speed: weapon.speed,
          gravity: weapon.gravity,
          spin: weapon.spin,
          origin,
          target,
          ttl: weapon.ttl,
          blastRadius,
          blastDamage,
          angle,
          pullRadius,
          pullStrength
        };
        if(weapon.kind === 'gun'){
          if(!preparedPose){
            this.weaponVisible = true;
            this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
            const hold = weapon.gunPose?.holdMs ?? 380;
            this.weaponSwingUntil = now + hold;
            this.weaponReachMultiplier = 1;
            preparedPose = true;
          }
          this.lastGunAim = { x: target.x, y: target.y };
        }
        if(weapon.projectileColor) projectileOpts.color = weapon.projectileColor;
        if(weapon.projectileDamage !== undefined) projectileOpts.damage = weapon.projectileDamage;
        if(weapon.projectileAlpha !== undefined) projectileOpts.alpha = weapon.projectileAlpha;
        if(weapon.projectileFadeRate !== undefined) projectileOpts.fadeRate = weapon.projectileFadeRate;
        if(weapon.projectileTrailColor) projectileOpts.trailColor = weapon.projectileTrailColor;
        if(weapon.projectileTipColor) projectileOpts.tipColor = weapon.projectileTipColor;
        if(weapon.projectileLength !== undefined) projectileOpts.length = weapon.projectileLength;
        if(weapon.projectileHarmless) projectileOpts.harmless = true;
        if(weapon.projectileSandPayload){
          projectileOpts.sandPayload = { ...weapon.projectileSandPayload };
        }
        if(typeof weapon.projectileOnExpire === 'function'){
          projectileOpts.onExpire = weapon.projectileOnExpire;
        }
        if(weapon.projectilePushRadius !== undefined) projectileOpts.pushRadius = weapon.projectilePushRadius;
        if(weapon.projectilePushForce !== undefined) projectileOpts.pushForce = weapon.projectilePushForce;
        if(weapon.projectileLiftRadius !== undefined) projectileOpts.liftRadius = weapon.projectileLiftRadius;
        if(weapon.projectileLiftForce !== undefined) projectileOpts.liftForce = weapon.projectileLiftForce;
        if(weapon.projectileReturnSpeed !== undefined) projectileOpts.returnSpeed = weapon.projectileReturnSpeed;
        if(weapon.slowMultiplier !== undefined) projectileOpts.slowMultiplier = weapon.slowMultiplier;
        if(weapon.slowDuration !== undefined) projectileOpts.slowDuration = weapon.slowDuration;
        if(weapon.driftAmplitude !== undefined) projectileOpts.driftAmplitude = weapon.driftAmplitude;
        if(weapon.driftFrequency !== undefined) projectileOpts.driftFrequency = weapon.driftFrequency;
        if(weapon.projectileRadius !== undefined) projectileOpts.radius = weapon.projectileRadius;
        if(weapon.projectileMaxSpeed !== undefined) projectileOpts.maxSpeed = weapon.projectileMaxSpeed;
        if(weapon.projectileTurnRate !== undefined) projectileOpts.turnRate = weapon.projectileTurnRate;
        if(weapon.projectileBounce !== undefined) projectileOpts.bounce = weapon.projectileBounce;
        if(weapon.projectileMaxBounces !== undefined) projectileOpts.maxBounces = weapon.projectileMaxBounces;
        if(weapon.projectileMaxTerrainBounces !== undefined) projectileOpts.maxTerrainBounces = weapon.projectileMaxTerrainBounces;
        if(weapon.projectileHoming !== undefined) projectileOpts.homing = weapon.projectileHoming;
        if(weapon.projectileSeekForce !== undefined) projectileOpts.seekForce = weapon.projectileSeekForce;
        if(weapon.projectileDrag !== undefined) projectileOpts.drag = weapon.projectileDrag;
        if(weapon.projectileIgnoreTerrain) projectileOpts.ignoreTerrainCollision = true;
        if(weapon.projectileIgnoreStickCollision) projectileOpts.ignoreStickCollision = true;
        if(weapon.projectileLockTarget && this.target && !this.target.dead) projectileOpts.lockedTarget = this.target;
        if(weapon.projectileTargetRadius !== undefined) projectileOpts.targetRadius = weapon.projectileTargetRadius;
        if(weapon.projectileHaloSpin !== undefined) projectileOpts.haloSpin = weapon.projectileHaloSpin;
        if(weapon.projectileHaloRadius !== undefined) projectileOpts.haloRadius = weapon.projectileHaloRadius;
        if(weapon.projectileTrailAlpha !== undefined) projectileOpts.trailAlpha = weapon.projectileTrailAlpha;
        if(weapon.projectileSingularity) projectileOpts.singularityConfig = weapon.projectileSingularity;
        if(weapon.igniteRadius !== undefined) projectileOpts.igniteRadius = weapon.igniteRadius;
        if(weapon.lifeStealPercent !== undefined) projectileOpts.lifeStealPercent = weapon.lifeStealPercent;
        shootProjectile(this, weapon, weapon.projectile, projectileOpts, this.world);
        firedAny = true;
      }
      return firedAny;
    };
    this.updateComboState(now);

    if(isSpear && !this.isEnemy){
      if(now < this.weaponCooldownUntil) return;
      this.resetCombo(false);
      const thrustDuration = Math.max(120, weapon.thrustDuration ?? 220);
      const cooldown = weapon.cooldown ?? 640;
      const rangeMultiplier = weapon.thrustRangeMultiplier ?? 1.15;
      const damageMultiplier = weapon.thrustDamageMultiplier ?? 1;
      const knockMultiplier = weapon.thrustKnockMultiplier ?? 1.05;
      const arc = weapon.thrustArc ?? 0.5;
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponSwingUntil = now + thrustDuration;
      this.weaponLastActiveTime = now;
      this.weaponCooldownUntil = now + cooldown;
      this.weaponReachMultiplier = rangeMultiplier;
      this.attackLockUntil = now + thrustDuration * 0.7;
      this.spearThrust = { start: now, end: now + thrustDuration };
      this._extendWeaponTerrainIgnore(now + thrustDuration + 600);
      attackMelee(this, weapon, this.world, {
        arc,
        damageMultiplier,
        knockMultiplier,
        rangeMultiplier,
        aimAngle: baseAngle,
        direction: this.dir
      });
      const frontHandName = this.weaponHand;
      const backHandName = frontHandName === 'handR' ? 'handL' : 'handR';
      const damp = (point)=>{
        if(point){
          point.vx *= 0.5;
          point.vy *= 0.5;
        }
      };
      damp(this.pointsByName[frontHandName]);
      damp(this.pointsByName[frontHandName === 'handR' ? 'elbowR' : 'elbowL']);
      damp(this.pointsByName[backHandName]);
      damp(this.pointsByName[backHandName === 'handR' ? 'elbowR' : 'elbowL']);
      return;
    }

    if(this.isEnemy){
      if(now < this.weaponCooldownUntil) return;
      const cooldown = weapon.cooldown ?? 420;
      this.weaponCooldownUntil = now + cooldown;
      let fired = true;
      if(weapon.kind === 'melee'){
        if(isSpear){
          const thrustDuration = Math.max(120, weapon.thrustDuration ?? 220);
          const rangeMultiplier = weapon.thrustRangeMultiplier ?? 1.15;
          const damageMultiplier = weapon.thrustDamageMultiplier ?? 1;
          const knockMultiplier = weapon.thrustKnockMultiplier ?? 1.05;
          const arc = weapon.thrustArc ?? 0.5;
          this.weaponVisible = true;
          this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
          this.weaponSwingUntil = now + thrustDuration;
          this.weaponLastActiveTime = now;
          this.weaponReachMultiplier = rangeMultiplier;
          this.spearThrust = { start: now, end: now + thrustDuration };
          this._extendWeaponTerrainIgnore(now + thrustDuration + 600);
          attackMelee(this, weapon, this.world, {
            arc,
            damageMultiplier,
            knockMultiplier,
            rangeMultiplier,
            aimAngle: baseAngle,
            direction: this.dir
          });
        }else if(weapon.enemyStyle === 'flopStab'){
          this._enemyFlopStabAttack(weapon, now);
        }else{
          this.weaponVisible = true;
          this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
          const swingDuration = weapon.swingDuration ?? 220;
          this.weaponSwingUntil = now + swingDuration;
          this._extendWeaponTerrainIgnore(now + swingDuration + 1000);
          this.weaponReachMultiplier = 1;
          attackMelee(this, weapon, this.world);
        }
      }else if(weapon.kind === 'spirit'){
        const consumed = this._consumeSpiritOrb();
        if(!consumed){
          fired = false;
        }else{
          const spawn = this._spiritOrbPosition(consumed.index) || this._spiritOrbitCenter() || { x: origin.x, y: origin.y - 18 };
          const angle = Math.atan2(aimY - spawn.y, aimX - spawn.x);
          const target = { x: spawn.x + Math.cos(angle) * 240, y: spawn.y + Math.sin(angle) * 240 };
          const projectileOpts = {
            speed: weapon.speed,
            gravity: weapon.gravity,
            spin: weapon.spin,
            origin: spawn,
            angle,
            target,
            ttl: weapon.ttl,
            blastRadius,
            blastDamage,
            pullRadius,
            pullStrength
          };
          if(weapon.projectileColor || weapon.orbColor) projectileOpts.color = weapon.projectileColor || weapon.orbColor;
          if(weapon.projectileDamage !== undefined) projectileOpts.damage = weapon.projectileDamage;
          if(weapon.projectileAlpha !== undefined) projectileOpts.alpha = weapon.projectileAlpha;
          if(weapon.projectileFadeRate !== undefined) projectileOpts.fadeRate = weapon.projectileFadeRate;
          if(weapon.orbTrailColor || weapon.projectileTrailColor) projectileOpts.trailColor = weapon.orbTrailColor || weapon.projectileTrailColor;
          if(weapon.projectileHarmless) projectileOpts.harmless = true;
          if(weapon.projectileSandPayload){
            projectileOpts.sandPayload = { ...weapon.projectileSandPayload };
          }
          if(typeof weapon.projectileOnExpire === 'function'){
            projectileOpts.onExpire = weapon.projectileOnExpire;
          }
          if(weapon.projectilePushRadius !== undefined) projectileOpts.pushRadius = weapon.projectilePushRadius;
          if(weapon.projectilePushForce !== undefined) projectileOpts.pushForce = weapon.projectilePushForce;
          if(weapon.projectileLiftRadius !== undefined) projectileOpts.liftRadius = weapon.projectileLiftRadius;
          if(weapon.projectileLiftForce !== undefined) projectileOpts.liftForce = weapon.projectileLiftForce;
          if(weapon.projectileReturnSpeed !== undefined) projectileOpts.returnSpeed = weapon.projectileReturnSpeed;
          if(weapon.slowMultiplier !== undefined) projectileOpts.slowMultiplier = weapon.slowMultiplier;
          if(weapon.slowDuration !== undefined) projectileOpts.slowDuration = weapon.slowDuration;
          if(weapon.driftAmplitude !== undefined) projectileOpts.driftAmplitude = weapon.driftAmplitude;
          if(weapon.driftFrequency !== undefined) projectileOpts.driftFrequency = weapon.driftFrequency;
          if(weapon.projectileRadius !== undefined) projectileOpts.radius = weapon.projectileRadius;
          if(weapon.projectileMaxSpeed !== undefined) projectileOpts.maxSpeed = weapon.projectileMaxSpeed;
          if(weapon.projectileTurnRate !== undefined) projectileOpts.turnRate = weapon.projectileTurnRate;
          if(weapon.projectileBounce !== undefined) projectileOpts.bounce = weapon.projectileBounce;
          if(weapon.projectileHoming !== undefined) projectileOpts.homing = weapon.projectileHoming;
          if(weapon.projectileSeekForce !== undefined) projectileOpts.seekForce = weapon.projectileSeekForce;
          if(weapon.projectileDrag !== undefined) projectileOpts.drag = weapon.projectileDrag;
          if(weapon.igniteRadius !== undefined) projectileOpts.igniteRadius = weapon.igniteRadius;
          shootProjectile(this, weapon, weapon.projectile, projectileOpts, this.world);
        }
      }else if(weapon.projectile){
        fired = fireProjectileBurst();
      }
      if(!fired){
        this.weaponCooldownUntil = now + Math.min(cooldown, 220);
      }
      return;
    }

    if(weapon.kind === 'summoner'){
      const state = this._ensureSummonerState(false);
      if(typeof summonerHasCapacity === 'function' && !summonerHasCapacity(this, weapon)) return;
      if(typeof spawnSummonerWisp !== 'function') return;
      const spawned = spawnSummonerWisp(this, weapon, { world: this.world, aimX, aimY });
      if(!spawned) return;
      const castDuration = Math.max(weapon.castDuration ?? 360, 200);
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponSwingUntil = now + castDuration;
      this.weaponLastActiveTime = now;
      this.weaponCooldownUntil = now;
      return;
    }

    if(weapon.kind === 'spirit'){
      const consumed = this._consumeSpiritOrb();
      if(!consumed) return;
      const spawn = this._spiritOrbPosition(consumed.index) || this._spiritOrbitCenter() || { x: origin.x, y: origin.y - 18 };
      const angle = Math.atan2(aimY - spawn.y, aimX - spawn.x);
      const target = { x: spawn.x + Math.cos(angle) * 240, y: spawn.y + Math.sin(angle) * 240 };
      const projectileOpts = {
        speed: weapon.speed,
        gravity: weapon.gravity,
        spin: weapon.spin,
        origin: spawn,
        angle,
        target,
        ttl: weapon.ttl,
        blastRadius,
        blastDamage,
        pullRadius,
        pullStrength
      };
      if(weapon.projectileColor || weapon.orbColor) projectileOpts.color = weapon.projectileColor || weapon.orbColor;
      if(weapon.projectileDamage !== undefined) projectileOpts.damage = weapon.projectileDamage;
      if(weapon.projectileAlpha !== undefined) projectileOpts.alpha = weapon.projectileAlpha;
      if(weapon.projectileFadeRate !== undefined) projectileOpts.fadeRate = weapon.projectileFadeRate;
      if(weapon.orbTrailColor || weapon.projectileTrailColor) projectileOpts.trailColor = weapon.orbTrailColor || weapon.projectileTrailColor;
      if(weapon.projectileHarmless) projectileOpts.harmless = true;
      if(weapon.projectileSandPayload){
        projectileOpts.sandPayload = { ...weapon.projectileSandPayload };
      }
      if(typeof weapon.projectileOnExpire === 'function'){
        projectileOpts.onExpire = weapon.projectileOnExpire;
      }
      if(weapon.projectilePushRadius !== undefined) projectileOpts.pushRadius = weapon.projectilePushRadius;
      if(weapon.projectilePushForce !== undefined) projectileOpts.pushForce = weapon.projectilePushForce;
      if(weapon.projectileLiftRadius !== undefined) projectileOpts.liftRadius = weapon.projectileLiftRadius;
      if(weapon.projectileLiftForce !== undefined) projectileOpts.liftForce = weapon.projectileLiftForce;
      if(weapon.projectileReturnSpeed !== undefined) projectileOpts.returnSpeed = weapon.projectileReturnSpeed;
      if(weapon.slowMultiplier !== undefined) projectileOpts.slowMultiplier = weapon.slowMultiplier;
      if(weapon.slowDuration !== undefined) projectileOpts.slowDuration = weapon.slowDuration;
      if(weapon.driftAmplitude !== undefined) projectileOpts.driftAmplitude = weapon.driftAmplitude;
      if(weapon.driftFrequency !== undefined) projectileOpts.driftFrequency = weapon.driftFrequency;
      if(weapon.projectileRadius !== undefined) projectileOpts.radius = weapon.projectileRadius;
      if(weapon.projectileMaxSpeed !== undefined) projectileOpts.maxSpeed = weapon.projectileMaxSpeed;
      if(weapon.projectileTurnRate !== undefined) projectileOpts.turnRate = weapon.projectileTurnRate;
      if(weapon.projectileBounce !== undefined) projectileOpts.bounce = weapon.projectileBounce;
      if(weapon.projectileMaxBounces !== undefined) projectileOpts.maxBounces = weapon.projectileMaxBounces;
      if(weapon.projectileMaxTerrainBounces !== undefined) projectileOpts.maxTerrainBounces = weapon.projectileMaxTerrainBounces;
      if(weapon.projectileHoming !== undefined) projectileOpts.homing = weapon.projectileHoming;
      if(weapon.projectileSeekForce !== undefined) projectileOpts.seekForce = weapon.projectileSeekForce;
      if(weapon.projectileDrag !== undefined) projectileOpts.drag = weapon.projectileDrag;
      if(weapon.projectileIgnoreTerrain) projectileOpts.ignoreTerrainCollision = true;
      if(weapon.projectileIgnoreStickCollision) projectileOpts.ignoreStickCollision = true;
      if(weapon.projectileLockTarget && this.target && !this.target.dead) projectileOpts.lockedTarget = this.target;
      if(weapon.projectileTargetRadius !== undefined) projectileOpts.targetRadius = weapon.projectileTargetRadius;
      if(weapon.projectileHaloSpin !== undefined) projectileOpts.haloSpin = weapon.projectileHaloSpin;
      if(weapon.projectileHaloRadius !== undefined) projectileOpts.haloRadius = weapon.projectileHaloRadius;
      if(weapon.projectileTrailAlpha !== undefined) projectileOpts.trailAlpha = weapon.projectileTrailAlpha;
      if(weapon.projectileSingularity) projectileOpts.singularityConfig = weapon.projectileSingularity;
      this.weaponCooldownUntil = now;
      this.resetCombo(true);
      shootProjectile(this, weapon, weapon.projectile, projectileOpts, this.world);
      return;
    }

    if(weapon.kind === 'staff'){
      this._handleStaffAttack(now, aimX, aimY);
      return;
    }

    if(weapon.kind !== 'melee'){
      const isGun = weapon.kind === 'gun';
      if(weapon.kind === 'bow' && !this.isEnemy){
        if(this.bowCharging) return;
        if(now < this.weaponCooldownUntil) return;
        this.weaponCooldownUntil = now + (weapon.cooldown ?? 820);
        this.resetCombo(true);
        this.startBowCharge(now, aimX, aimY);
        return;
      }
      if(!isGun && now < this.weaponCooldownUntil) return;
      if(isGun) this.weaponCooldownUntil = now;
      const cooldown = weapon.cooldown ?? 420;
      this.resetCombo(true);
      let fired = true;
      if(weapon.projectile){
        fired = fireProjectileBurst();
      }
      const retryDelay = Math.min(cooldown, 220);
      if(isGun){
        this.weaponCooldownUntil = now;
      }else{
        this.weaponCooldownUntil = now + (fired ? cooldown : retryDelay);
      }
      return;
    }

    if(this.comboStep === 0){
      if(now < this.weaponCooldownUntil) return;
      this.beginComboAttack(1, now);
      return;
    }

    if(this.comboStep === 1){
      if(now > this.comboWindowUntil){
        if(now >= this.weaponCooldownUntil){
          this.resetCombo(false);
          this.beginComboAttack(1, now);
        }
        return;
      }
      if(now < this.comboWindowStart) return;
      this.queueComboStep(2, now);
      return;
    }

    if(this.comboStep === 2){
      if(now > this.comboWindowUntil){
        if(now >= this.weaponCooldownUntil){
          this.resetCombo(false);
          this.beginComboAttack(1, now);
        }
        return;
      }
      if(now < this.comboWindowStart) return;
      this.queueComboStep(3, now);
      return;
    }

    if(this.comboStep >= 3){
      return;
    }
  }

  applySlow(multiplier=0.6, durationMs=1200){
    const now = nowMs();
    const clamped = clamp(multiplier, 0.1, 1);
    if(this.slowUntil && now < this.slowUntil){
      this.slowMultiplier = Math.min(this.slowMultiplier, clamped);
      this.slowUntil = Math.max(this.slowUntil, now + durationMs);
    }else{
      this.slowMultiplier = clamped;
      this.slowUntil = now + durationMs;
    }
  }

  applyChronoStasis(durationMs=5000, options={}){
    if(this.resistsElement && this.resistsElement('chronometric')) return false;
    const now = nowMs();
    const duration = Math.max(100, Number.isFinite(durationMs) ? durationMs : 5000);
    const until = now + duration;
    if(!this._chronoStasisState || !this._chronoStasisState.active){
      this._activateChronoStasisState();
    }
    if(!(this.chronoFrozenUntil && this.chronoFrozenUntil > until)) this.chronoFrozenUntil = until;
    if(!(this.chronoInvertedUntil && this.chronoInvertedUntil > until)) this.chronoInvertedUntil = until;
    if(!(this.chronoVulnerableUntil && this.chronoVulnerableUntil > until)) this.chronoVulnerableUntil = until;
    if(options && options.source) this._chronoStasisSource = options.source;
    this._applyChronoStasisState(true);
    return true;
  }

  isChronoFrozen(now=nowMs()){
    return !!(this.chronoFrozenUntil && now < this.chronoFrozenUntil);
  }

  isChronoInverted(now=nowMs()){
    return !!(this.chronoInvertedUntil && now < this.chronoInvertedUntil);
  }

  isChronoVulnerable(now=nowMs()){
    return !!(this.chronoVulnerableUntil && now < this.chronoVulnerableUntil);
  }

  _activateChronoStasisState(){
    const points = Array.isArray(this.points) ? this.points : [];
    const restores = [];
    for(const point of points){
      if(!point) continue;
      restores.push({ point, dragged: point.dragged });
      point.dragged = true;
      point.vx = 0;
      point.vy = 0;
      point.ax = 0;
      point.ay = 0;
    }
    this._chronoStasisState = { active: true, restores };
    this.chronoFrozen = true;
  }

  _maintainChronoStasisState(){
    const state = this._chronoStasisState;
    if(!state || !state.active) return;
    const restores = Array.isArray(state.restores) ? state.restores : [];
    for(const entry of restores){
      if(!entry || !entry.point) continue;
      const point = entry.point;
      point.dragged = true;
      point.vx = 0;
      point.vy = 0;
      point.ax = 0;
      point.ay = 0;
    }
    this.moveIntent = 0;
    this.moveVelocity = 0;
    this.verticalVelocity = 0;
    const pelvis = this.pelvis ? this.pelvis() : null;
    if(pelvis){
      pelvis.vx = 0;
      pelvis.vy = 0;
      pelvis.ax = 0;
      pelvis.ay = 0;
    }
  }

  _releaseChronoStasisState(){
    const state = this._chronoStasisState;
    if(!state) return;
    const restores = Array.isArray(state.restores) ? state.restores : [];
    for(const entry of restores){
      if(!entry || !entry.point) continue;
      entry.point.dragged = !!entry.dragged;
    }
    this._chronoStasisState = { active: false, restores: [] };
    this.chronoFrozen = false;
  }

  _applyChronoStasisState(active){
    if(active){
      if(!this._chronoStasisState || !this._chronoStasisState.active){
        this._activateChronoStasisState();
      }
      this._maintainChronoStasisState();
      this.chronoFrozen = true;
    }else if(this._chronoStasisState && this._chronoStasisState.active){
      this._releaseChronoStasisState();
    }else{
      this.chronoFrozen = false;
    }
  }

  applyNecroticAffliction(baseDamage, options={}){
    const now = nowMs();
    const durationMs = Math.max(600, Number.isFinite(options.durationMs) ? options.durationMs : 3600);
    const intervalMs = Math.max(200, Number.isFinite(options.intervalMs) ? options.intervalMs : 600);
    const ticks = Math.max(1, Math.ceil(durationMs / intervalMs));
    const ratio = Number.isFinite(options.damageRatio) ? clamp(options.damageRatio, 0.05, 1) : 0.35;
    const base = Math.max(0, Number.isFinite(baseDamage) ? baseDamage : 0);
    const total = Math.max(1, Math.round(Math.max(base, 1) * ratio));
    const damagePerTick = Math.max(1, Math.round(total / ticks));
    const state = this.necroticState && typeof this.necroticState === 'object'
      ? this.necroticState
      : {};
    state.source = options.source || state.source || null;
    state.interval = intervalMs;
    state.nextTick = now + intervalMs;
    state.expires = now + durationMs;
    state.damagePerTick = Math.max(damagePerTick, Number.isFinite(state.damagePerTick) ? state.damagePerTick : 0);
    state.remainingTicks = ticks;
    state.ignoreResistances = !!options.ignoreResistances;
    this.necroticState = state;
  }

  die(source=null){
    if(this.dead) return;
    this.chronoFrozenUntil = 0;
    this.chronoInvertedUntil = 0;
    this.chronoVulnerableUntil = 0;
    this._jointTorqueResponsePerSec = STICK_CORPSE_JOINT_TORQUE_DECAY_PER_SEC;
    this._jointTorqueTarget = 0;
    this._jointTorqueScale = 0;
    this._armJointTorqueScale = 0;
    if(this._chronoStasisState && this._chronoStasisState.active){
      this._releaseChronoStasisState();
    }
    this.necroticState = null;
    if(this.necromancerMarks instanceof Map && this.necromancerMarks.size > 0){
      const marks = Array.from(this.necromancerMarks.values());
      this.necromancerMarks.clear();
      for(const mark of marks){
        if(!mark) continue;
        const owner = mark.owner;
        if(!owner || owner.dead || owner.world !== this.world) continue;
        if(typeof spawnNecromancerZombie === 'function'){
          const center = typeof this.center === 'function' ? this.center() : null;
          const pelvis = typeof this.pelvis === 'function' ? this.pelvis() : null;
          const spawnX = center ? center.x : (pelvis?.x ?? 0);
          const spawnY = center ? center.y : (pelvis?.y ?? 0);
          spawnNecromancerZombie(owner, { x: spawnX, y: spawnY, config: mark.config || null });
        }
      }
    }
    this.necromancerMarks = null;
    this.projectileShields = null;
    if(this.deathEffect) triggerDeathEffect(this);
    this.dead = true;
    this.deadAt = nowMs();
    this.deadFadeDelay = STICK_CORPSE_FADE_DELAY_MS;
    this.deadFadeDuration = STICK_CORPSE_FADE_DURATION_MS;
    this.hp = 0;
    this.comboAnim = null;
    this.weaponVisible = false;
    this.weaponHand = null;
    this.weaponSwingUntil = 0;
    this.attackLockUntil = 0;
    this.selectable = false;
    this.invulnerable = true;
    this.showWeapon = false;
    this.halfSlotState = null;
    if(Array.isArray(this.points)){
      for(const p of this.points){
        p.dragged = false;
        p.poseTargetX = p.x;
        p.poseTargetY = p.y;
      }
    }
    this._dropWeaponOnDeath();
    this._softenRigConstraintsForCorpse();
    if(this.isEnemy && this.world){
      if(typeof notifySummonerSoulHarvest === 'function'){
        notifySummonerSoulHarvest(this, source);
      }
      if(typeof notifyStaffSoulHarvest === 'function'){
        notifyStaffSoulHarvest(this, source);
      }
      spawnLoot(this, this.world, source);
      applyEquipmentKillEffects(source, this);
      if(this.isBoss && this.world.levelState?.isFinalScreen && typeof spawnBossRewardDrop === 'function'){
        spawnBossRewardDrop(this.world, this);
      }
    }
  }

  _softenRigConstraintsForCorpse(){
    if(this._corpseConstraintsSoftened) return;
    const constraints = Array.isArray(this.rigConstraints) ? this.rigConstraints : null;
    if(!constraints || !constraints.length){
      this._corpseConstraintsSoftened = true;
      return;
    }
    this._corpseConstraintsSoftened = true;
    for(const constraint of constraints){
      if(!constraint) continue;
      const partA = constraint.a && constraint.a.rigPart;
      const partB = constraint.b && constraint.b.rigPart;
      const legConstraint = !!(
        (partA && STICK_CORPSE_LENGTH_LOCK_POINTS.has(partA))
        || (partB && STICK_CORPSE_LENGTH_LOCK_POINTS.has(partB))
      );
      constraint._corpseLegConstraint = legConstraint;
      if(Number.isFinite(constraint.s)){
        if(constraint._corpseBaseStiffness === undefined){
          constraint._corpseBaseStiffness = constraint.s;
        }
        const base = Number.isFinite(constraint._corpseBaseStiffness)
          ? constraint._corpseBaseStiffness
          : constraint.s;
        if(Number.isFinite(base)){
          let target = base;
          if(legConstraint){
            const legStiffness = Number.isFinite(STICK_CORPSE_LEG_CONSTRAINT_STIFFNESS)
              ? STICK_CORPSE_LEG_CONSTRAINT_STIFFNESS
              : base;
            if(target < legStiffness) target = legStiffness;
          }else{
            if(Number.isFinite(STICK_CORPSE_CONSTRAINT_STIFFNESS_MULTIPLIER)){
              target = base * STICK_CORPSE_CONSTRAINT_STIFFNESS_MULTIPLIER;
            }
            if(Number.isFinite(STICK_CORPSE_CONSTRAINT_MIN_STIFFNESS)){
              const minStiff = Math.min(base, STICK_CORPSE_CONSTRAINT_MIN_STIFFNESS);
              if(target < minStiff) target = minStiff;
            }
            if(Number.isFinite(STICK_CORPSE_CONSTRAINT_MAX_STIFFNESS)){
              const maxStiff = Math.min(base, STICK_CORPSE_CONSTRAINT_MAX_STIFFNESS);
              if(target > maxStiff) target = maxStiff;
            }
          }
          if(!Number.isFinite(target)) target = base;
          constraint.s = target;
        }
      }
      if(typeof ElasticDist !== 'undefined' && constraint instanceof ElasticDist){
        if(constraint._corpseBaseElasticity === undefined){
          constraint._corpseBaseElasticity = constraint.elasticity;
        }
        if(constraint._corpseBaseDamping === undefined){
          constraint._corpseBaseDamping = constraint.damping;
        }
        if(Number.isFinite(constraint._corpseBaseElasticity)){
          const baseElasticity = constraint._corpseBaseElasticity;
          let nextElasticity = baseElasticity;
          if(Number.isFinite(STICK_CORPSE_CONSTRAINT_ELASTICITY_MULTIPLIER)){
            nextElasticity = baseElasticity * STICK_CORPSE_CONSTRAINT_ELASTICITY_MULTIPLIER;
          }
          if(nextElasticity > baseElasticity) nextElasticity = baseElasticity;
          constraint.elasticity = Math.max(0, nextElasticity);
        }
        if(Number.isFinite(constraint._corpseBaseDamping)){
          const baseDamping = constraint._corpseBaseDamping;
          let nextDamping = baseDamping;
          if(Number.isFinite(STICK_CORPSE_CONSTRAINT_DAMPING_MULTIPLIER)){
            nextDamping = baseDamping * STICK_CORPSE_CONSTRAINT_DAMPING_MULTIPLIER;
          }
          if(nextDamping > baseDamping) nextDamping = baseDamping;
          constraint.damping = Math.max(0, nextDamping);
        }
        if(constraint._corpseLegConstraint && Number.isFinite(constraint.maxCorrection)){
          const minLegCorrection = Number.isFinite(STICK_CORPSE_LEG_MIN_CORRECTION_RATIO)
            ? constraint.r * STICK_CORPSE_LEG_MIN_CORRECTION_RATIO
            : constraint.maxCorrection;
          if(Number.isFinite(minLegCorrection) && constraint.maxCorrection < minLegCorrection){
            constraint.maxCorrection = minLegCorrection;
          }
        }
      }
      if(typeof OneWayDist !== 'undefined' && constraint instanceof OneWayDist){
        constraint.allowReversePull = true;
        const opts = constraint.options;
        if(opts && typeof opts === 'object'){
          opts.allowReversePull = true;
        }else{
          constraint.options = { allowReversePull: true };
        }
      }
    }
  }

  _releaseRigConstraints(){
    if(!this.world || !Array.isArray(this.rigConstraints)) return;
    for(const constraint of this.rigConstraints){
      const idx = this.world.constraints.indexOf(constraint);
      if(idx >= 0) this.world.constraints.splice(idx, 1);
    }
    this.rigConstraints.length = 0;
  }

  _dropWeaponOnDeath(){
    if(this.isEnemy){
      this._removeWeaponRig();
      return;
    }
    const world = this.world;
    if(!world){
      this._removeWeaponRig();
      return;
    }
    const weaponId = this.currentWeaponId();
    const weapon = weaponId ? WEAPONS[weaponId] : null;
    const handName = this.weaponHand || (this.dir >= 0 ? 'handR' : 'handL');
    const hand = this.pointsByName[handName] || this.pointsByName.handR || this.pointsByName.handL;
    const elbowName = handName === 'handL' ? 'elbowL' : 'elbowR';
    const elbow = this.pointsByName[elbowName];
    const origin = hand ? { x: hand.x, y: hand.y } : this.center();
    const angle = (hand && elbow) ? Math.atan2(hand.y - elbow.y, hand.x - elbow.x) : (this.dir >= 0 ? 0 : Math.PI);
    this._removeWeaponRig();
    if(!weapon || !world){
      return;
    }
    if(!world.particles) world.particles = [];
    const drop = {
      type: 'weaponDrop',
      style: 'weaponDrop',
      x: origin.x,
      y: origin.y,
      vx: rand(-180, 180),
      vy: rand(-420, -240),
      rotation: angle,
      spin: rand(-6, 6),
      length: (weapon.range ?? 42) * 0.9,
      thickness: Math.max(3, (weapon.bladeWidth ?? 6) * 0.35),
      color: weapon.color || '#f0f0f0',
      edgeColor: weapon.highlightColor || '#f5f1ee',
      maxLife: Infinity
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(drop, 'weaponDrop');
    world.particles.push(drop);
  }

  setResistances(values){
    let list = [];
    if(Array.isArray(values)){
      list = values;
    }else if(values && typeof values !== 'string' && typeof values[Symbol.iterator] === 'function'){
      list = Array.from(values);
    }else if(values !== undefined && values !== null && values !== ''){
      list = [values];
    }
    const normalized = [];
    const seen = new Set();
    for(const entry of list){
      const key = normalizeElementKey(entry);
      if(!key || seen.has(key)) continue;
      normalized.push(key);
      seen.add(key);
    }
    this.resistances = normalized;
    this.resistanceSet = normalized.length ? seen : null;
    return this.resistances;
  }

  resistanceList(){
    return Array.isArray(this.resistances) ? this.resistances.slice() : [];
  }

  resistsElement(element){
    const key = normalizeElementKey(element);
    if(!key) return false;
    const set = this.resistanceSet;
    if(set && set.has(key)) return true;
    if(Array.isArray(this.resistances)){
      for(const entry of this.resistances){
        if(normalizeElementKey(entry) === key) return true;
      }
    }
    return false;
  }

  takeDamage(amount, knockX=0, knockY=0, source=null, damageInfo=null){
    if(this.dead) return;
    const t = nowMs();
    const chronoVulnerable = this.isChronoVulnerable ? this.isChronoVulnerable(t) : false;
    if(this.invulnerable && !chronoVulnerable) return;
    const info = (damageInfo && typeof damageInfo === 'object') ? damageInfo : {};
    let base = Number.isFinite(amount) ? amount : 0;
    const safeKnockX = Number.isFinite(knockX) ? knockX : 0;
    const safeKnockY = Number.isFinite(knockY) ? knockY : 0;
    const fromStatus = !!info.fromStatus;
    if(!info.templarianRedirect && !this.isEnemy && base > 0){
      const guardian = findTemplarianWallGuardian(this.world, this);
      if(guardian){
        const redirectInfo = { ...info, templarianRedirect: true, templarianRedirectSource: this };
        guardian.takeDamage(amount, safeKnockX, safeKnockY, source, redirectInfo);
        return;
      }
    }
    if(!fromStatus){
      if(chronoVulnerable && this.iframesUntil && this.iframesUntil > t) this.iframesUntil = t;
      if(!chronoVulnerable && t < this.iframesUntil) return;
      this.iframesUntil = t + 180;
    }
    if(info.projectile && base > 0 && typeof this.absorbProjectileHit === 'function'){
      const absorption = this.absorbProjectileHit(info.projectile, base, { source, info });
      if(absorption && absorption.absorbed){
        const remaining = Math.max(0, Number.isFinite(absorption.remainingDamage)
          ? absorption.remainingDamage
          : 0);
        if(remaining <= 0){
          return;
        }
        base = remaining;
        amount = remaining;
      }
    }
    let element = info.element;
    if(!element && info.projectile && typeof info.projectile.element === 'string'){
      element = info.projectile.element;
    }
    if(!element && source){
      if(typeof source.element === 'string'){ element = source.element; }
      else if(source.projectile && typeof source.projectile.element === 'string'){ element = source.projectile.element; }
      else if(typeof source.weapon === 'function'){
        const w = source.weapon();
        if(w){
          element = w.element || w.projectileElement || (w.staff && w.staff.element) || element;
        }
      }
    }
    const elementKey = normalizeElementKey(element) || 'physical';
    if(this.isEnemy && this.enemyKind === 'timeWraith'){
      const allowed = elementKey === 'chronometric' || elementKey === 'void';
      if(!allowed) return;
    }
    const world = this.world;
    const unlimited = !!(world?.ui?.settings?.gameplay?.unlimitedHealth);
    const ignoreDamage = unlimited && !this.isEnemy;
    const ignoreResist = chronoVulnerable || !!info.ignoreResistances;
    let final;
    const resistedHit = !ignoreDamage && !ignoreResist && base > 0 && this.resistsElement(elementKey);
    if(resistedHit){
      final = 0;
    }else if(source){
      final = computeDamage(source, this, base);
    }else{
      const defenseRoll = this.defense > 0 ? Math.random() * this.defense : 0;
      final = base - defenseRoll;
    }
    final = Number.isFinite(final) ? Math.max(0, final) : 0;
    const defenseStat = Math.max(0, Number.isFinite(this.defense) ? this.defense : 0);
    const attackerAttack = source && Number.isFinite(source.attack) ? Math.max(0, source.attack) : null;
    const blockedHit = !ignoreDamage
      && !resistedHit
      && base > 0
      && final <= 0
      && defenseStat > 0
      && (!source || !source.ignoreDefense)
      && (attackerAttack === null || attackerAttack > 0);
    if(ignoreDamage){
      const fallbackHp = Number.isFinite(this.hp) ? this.hp : 0;
      const fullHp = Number.isFinite(this.maxHp) ? this.maxHp : fallbackHp;
      this.hp = fullHp;
    }else{
      const currentHp = Number.isFinite(this.hp) ? this.hp : (Number.isFinite(this.maxHp) ? this.maxHp : 0);
      this.hp = Math.max(0, currentHp - final);
    }
    this.showHealthUntil = Math.max(this.showHealthUntil || 0, t + 2000);
    const audio = window.audioSystem;
    if(!ignoreDamage && !this.isEnemy && final > 0 && audio && typeof audio.playEffect === 'function'){
      const maxHpValue = Number.isFinite(this.maxHp) ? this.maxHp : Math.max(1, Number.isFinite(this.hp) ? this.hp : 1);
      const strength = clamp(final / Math.max(1, maxHpValue), 0.2, 1.2);
      audio.playEffect('playerHit', { strength });
    }
    if(!ignoreDamage && world && typeof spawnDamageNumber === 'function'){
      const elapsed = t - (this._lastDamageNumberAt || 0);
      const ready = elapsed >= DAMAGE_NUMBER_COOLDOWN_MS || final >= 0.4 || blockedHit || resistedHit;
      if(ready){
        if(resistedHit){
          const color = typeof resolveElementColor === 'function'
            ? resolveElementColor(elementKey)
            : '#f0f0f0';
          spawnDamageNumber(world, this, 0, {
            text: 'Resist!',
            color,
            strokeColor: 'rgba(8, 12, 18, 0.72)',
            disableFilters: true
          });
          this._lastDamageNumberAt = t;
        }else if(blockedHit){
          spawnDamageNumber(world, this, 0, {
            text: 'blocked',
            color: '#6ecbff',
            strokeColor: '#ffffff',
            strokeWidth: 3,
            layer: 'overlay'
          });
          this._lastDamageNumberAt = t;
        }else if(final > 0){
          if(this.isEnemy){
            const attackerIsPlayer = source && typeof source.weapon === 'function' && source.isEnemy === false;
            if(attackerIsPlayer){
              const color = resolveDamageNumberColor(source);
              spawnDamageNumber(world, this, final, { color, source });
              this._lastDamageNumberAt = t;
            }
          }else{
            spawnDamageNumber(world, this, final, { color: '#f25f5c', prefix: '-' });
            this._lastDamageNumberAt = t;
          }
        }
      }
    }
    const inflicted = !ignoreDamage && final > 0;
    if(inflicted && !fromStatus){
      if(elementKey === 'ice' && this.isEnemy){
        const slowMultiplier = Number.isFinite(info.slowMultiplier)
          ? clamp(info.slowMultiplier, 0.1, 1)
          : 0.6;
        const slowDuration = Number.isFinite(info.slowDurationMs)
          ? Math.max(0, info.slowDurationMs)
          : 2400;
        if(slowDuration > 0) this.applySlow(slowMultiplier, slowDuration);
      }
      if(elementKey === 'necrotic' && this.hp > 0 && typeof this.applyNecroticAffliction === 'function'){
        const dotBase = Number.isFinite(info.necroticBaseDamage) ? info.necroticBaseDamage : final;
        this.applyNecroticAffliction(dotBase, {
          source,
          durationMs: Number.isFinite(info.necroticDurationMs) ? info.necroticDurationMs : undefined,
          intervalMs: Number.isFinite(info.necroticIntervalMs) ? info.necroticIntervalMs : undefined,
          damageRatio: Number.isFinite(info.necroticDamageRatio) ? info.necroticDamageRatio : undefined,
          ignoreResistances: !!info.necroticIgnoreResist
        });
      }
    }
    if(inflicted && this.mirageClone && this.hp > 0){
      this.hp = 0;
      this.die(source);
      return;
    }
    const p=this.pelvis(); if(p) p.addForce(safeKnockX*1200, -Math.abs(safeKnockY)*700);
    if(!ignoreDamage && this.hp<=0){
      this.necroticState = null;
      this.die(source);
    }
  }

  heal(v){
    this.hp = clamp(this.hp + v, 0, this.maxHp);
    if(v > 0){
      this.showHealthUntil = Math.max(this.showHealthUntil || 0, nowMs() + 1200);
    }
  }

  useHeldItem(world){
    if(!this.heldItem) return false;
    const cloneFn = typeof cloneCarriedItem === 'function' ? cloneCarriedItem : (value)=>value;
    const item = cloneFn(this.heldItem);
    if(!item) return false;
    if(item.type === 'potion'){
      const healAmount = Math.max(1, Math.round(item.heal ?? 0));
      this.heldItem = null;
      if(healAmount > 0) this.heal(healAmount);
      const audio = window.audioSystem;
      if(audio && typeof audio.playEffect === 'function'){
        audio.playEffect('potionPickup');
      }
      this.spawnPotionBubbles(item.color);
      if(world && typeof updateProfileEntryFromStick === 'function'){
        updateProfileEntryFromStick(world, this);
      }
      return true;
    }
    return false;
  }

  addXp(v){
    this.xp += v;
    let leveled = false;
    while(this.xp >= this.nextXp){
      this.xp -= this.nextXp;
      this.level++;
      this.maxHp += 12;
      this.hp = this.maxHp;
      this.nextXp = Math.floor(this.nextXp*1.45);
      this.skillPoints = (this.skillPoints ?? 0) + SKILL_POINTS_PER_LEVEL;
      leveled = true;
    }
    if(leveled && this.world){
      const audio = window.audioSystem;
      if(audio && typeof audio.playEffect === 'function'){
        audio.playEffect('levelUp');
      }
      updateProfileEntryFromStick(this.world, this);
    }
  }

  ai(dt){
    if(!this.isEnemy || this.dead) return;
    const behavior = ENEMY_BEHAVIORS[this.behavior] || ENEMY_BEHAVIORS.skirmisher;
    behavior(this, dt);
  }

  corpseFadeAlpha(){
    if(!this.dead) return 1;
    if(!this.isEnemy) return 1;
    const deathTime = Number.isFinite(this.deadAt) ? this.deadAt : 0;
    if(!deathTime) return 1;
    const now = nowMs();
    const elapsed = now - deathTime;
    if(elapsed < 0) return 1;
    const delay = Number.isFinite(this.deadFadeDelay) ? Math.max(0, this.deadFadeDelay) : STICK_CORPSE_FADE_DELAY_MS;
    const duration = Number.isFinite(this.deadFadeDuration) ? Math.max(1, this.deadFadeDuration) : STICK_CORPSE_FADE_DURATION_MS;
    if(elapsed <= delay) return 1;
    if(elapsed >= delay + duration) return 0;
    const t = (elapsed - delay) / duration;
    return clamp(1 - t, 0, 1);
  }

  draw(ctx){
    const baseAlpha = clamp(typeof this.renderAlpha === 'number' ? this.renderAlpha : 1, 0, 1);
    const corpseAlpha = (this.dead && this.isEnemy) ? this.corpseFadeAlpha() : 1;
    const combinedAlpha = clamp(baseAlpha * (corpseAlpha ?? 1), 0, 1);
    if(combinedAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= combinedAlpha;
    let restoreAlpha = ()=>ctx.restore();
    let restoreFilter = null;
    const invertActive = (this.element === 'chronometric') || this.isChronoInverted();
    if(invertActive){
      restoreFilter = typeof pushCanvasFilter === 'function'
        ? pushCanvasFilter(ctx, 'invert(1)')
        : null;
    }
    try{
      drawStickAuraRecipientGlow(ctx, this);
      drawStickProjectileShield(ctx, this);
      if(this.renderStyle === 'roller'){
        drawRollerEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'slime'){
        drawSlimeEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'sandBlock'){
        drawSandBlockEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'sandShade'){
        drawSandShadeEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'timeWraith'){
        drawTimeWraithEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'alephGlyph'){
        drawAlephGlyphEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'shinGlyph'){
        drawShinGlyphEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'glyphGyre'){
        drawGlyphGyreEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'zetaGlyph'){
        drawZetaGlyphBoss(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'xiGlyph'){
        drawXiGlyphBoss(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'thetaHarmonic'){
        drawThetaHarmonicBoss(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'glyphLeviathan'){
        drawGlyphLeviathanBoss(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'glyphSalmon'){
        drawGlyphSalmonEnemy(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'tricylicSlasher'){
        drawTricylicSlasher(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'realmGuardian'){
        drawRealmGuardian(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'pixel'){
        drawPixelStick(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'pixelated'){
        drawPixelatedRigStick(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'toon'){
        drawToonStick(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'neon'){
        drawNeonStick(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      if(this.renderStyle === 'outline'){
        drawOutlineStick(ctx, this);
        drawStickHealthBar(ctx, this);
        drawStickLabel(ctx, this);
        drawStickSprintBar(ctx, this);
        drawStickCollisionDebug(ctx, this);
        return;
      }
      const showWeapon = this.showWeapon !== false;
      let sheathedSwordDrawn = false;
      if(showWeapon && this.weaponSheathed){
        const rig = this.weaponRig;
        const weapon = typeof this.weapon === 'function' ? this.weapon() : null;
        if(rig && rig.type === 'sword' && weapon){
          drawSheathedSword(ctx, this, weapon, rig);
          sheathedSwordDrawn = true;
        }
      }
      if(typeof drawStickAbilityEffects === 'function'){
        drawStickAbilityEffects(ctx, this);
      }
      drawStickLimbs(ctx, this);
      drawStickArmor(ctx, this);
      drawStickPixelScarf(ctx, this);
      drawStickHead(ctx, this);
      if(showWeapon && !sheathedSwordDrawn){
        drawStickWeaponTrail(ctx, this);
      }
      drawStickOffhand(ctx, this);
      drawStickHealthBar(ctx, this);
      drawStickLabel(ctx, this);
      drawStickSprintBar(ctx, this);
      drawStickCollisionDebug(ctx, this);
    }finally{
      if(restoreFilter) restoreFilter();
      if(restoreAlpha) restoreAlpha();
    }
  }

  _createRigOffsets(){
    const baseOffsets = (typeof RIG_CONFIG !== 'undefined' && RIG_CONFIG?.offsets)
      ? RIG_CONFIG.offsets
      : null;
    const offsets = {};
    if(Array.isArray(RIG_CONFIG?.names)){
      for(const name of RIG_CONFIG.names){
        const source = baseOffsets?.[name];
        offsets[name] = source ? { x: source.x, y: source.y } : { x: 0, y: 0 };
      }
    }
    return offsets;
  }

  rigOffset(name){
    if(!name) return null;
    if(this.rigOffsets && this.rigOffsets[name]) return this.rigOffsets[name];
    if(typeof RIG_CONFIG !== 'undefined' && RIG_CONFIG?.offsets?.[name]){
      return RIG_CONFIG.offsets[name];
    }
    return null;
  }

  _buildRig(x,y,worldRef){
    this._legElasticConstraints = null;
    const offsets = this.rigOffsets || (RIG_CONFIG?.offsets || {});
    for(const name of RIG_CONFIG.names){
      const off=offsets[name] || { x: 0, y: 0 };
      const p=new Point(x+off.x,y+off.y);
      p.owner=this;
      p.rigPart = name;
      if(typeof COLLIDING_RIG_POINT_RADII !== 'undefined' && COLLIDING_RIG_POINT_RADII[name] !== undefined){
        p.terrainRadius = COLLIDING_RIG_POINT_RADII[name];
      }else if(typeof COLLIDING_RIG_POINTS !== 'undefined' && COLLIDING_RIG_POINTS.has(name)){
        p.terrainRadius = STICK_TERRAIN_RADIUS;
      }else{
        p.terrainRadius = 0;
      }
      this.pointsByName[name]=p;
      this.points.push(p);
      if(worldRef) worldRef.points.push(p);
    }
    if(worldRef){
      const defaultElasticity = typeof RIG_DEFAULT_ELASTICITY === 'number'
        ? Math.max(0, RIG_DEFAULT_ELASTICITY)
        : 0;
      const defaultDamping = typeof RIG_DEFAULT_DAMPING === 'number'
        ? Math.max(0, RIG_DEFAULT_DAMPING)
        : 0;
      const defaultMaxRatioRaw = typeof RIG_DEFAULT_MAX_CORRECTION_RATIO === 'number'
        ? Math.max(0, RIG_DEFAULT_MAX_CORRECTION_RATIO)
        : null;
      const defaultMaxRatio = Number.isFinite(defaultMaxRatioRaw) ? defaultMaxRatioRaw : null;
      for(const bone of RIG_CONFIG.bones){
        let a;
        let b;
        let stiff;
        let options = null;
        if(Array.isArray(bone)){
          [a, b, stiff, options] = bone;
        }else if(bone && typeof bone === 'object'){
          a = bone.a;
          b = bone.b;
          stiff = bone.stiffness ?? bone.stiff ?? RIG_CONFIG.stiffness;
          options = bone.options || null;
        }
        const A=this.pointsByName[a], B=this.pointsByName[b];
        if(!A || !B) continue;
        const rest=Math.hypot(A.x-B.x,A.y-B.y);
        const stiffness = stiff ?? RIG_CONFIG.stiffness;
        const armA = ARM_POINTS.has(a);
        const armB = ARM_POINTS.has(b);
        const priorityMap = (typeof LIMB_PULL_PRIORITY !== 'undefined') ? LIMB_PULL_PRIORITY : null;
        const priorityA = priorityMap ? priorityMap[a] : undefined;
        const priorityB = priorityMap ? priorityMap[b] : undefined;
        const directionalArm = armB
          && priorityA !== undefined
          && priorityB !== undefined
          && priorityA < priorityB;
        const canUseOneWay = typeof OneWayDist === 'function';
        const useOneWay = canUseOneWay && armB && ((!armA) || directionalArm);
        const hasOptions = options && typeof options === 'object';
        let constraintOpts = hasOptions ? { ...options } : null;
        const canUseElastic = typeof ElasticDist === 'function';
        const explicitDisableElastic = !!(constraintOpts && constraintOpts.elastic === false);
        const explicitElastic = !!(constraintOpts && (
          constraintOpts.elastic === true ||
          constraintOpts.elasticity !== undefined ||
          constraintOpts.damping !== undefined ||
          constraintOpts.maxCorrection !== undefined ||
          constraintOpts.maxCorrectionRatio !== undefined
        ));
        let wantsElastic = canUseElastic && explicitElastic && !explicitDisableElastic;
        if(!wantsElastic && canUseElastic && !explicitDisableElastic){
          const hasDefaultElasticity = (defaultElasticity > 0)
            || (defaultDamping > 0)
            || (defaultMaxRatio !== null);
          if(hasDefaultElasticity){
            wantsElastic = true;
            if(!constraintOpts) constraintOpts = {};
            if(constraintOpts.elastic === undefined) constraintOpts.elastic = true;
            if(constraintOpts.elasticity === undefined && defaultElasticity > 0){
              constraintOpts.elasticity = defaultElasticity;
            }
            if(constraintOpts.damping === undefined && defaultDamping > 0){
              constraintOpts.damping = defaultDamping;
            }
            if(constraintOpts.maxCorrection === undefined && constraintOpts.maxCorrectionRatio === undefined && defaultMaxRatio !== null){
              constraintOpts.maxCorrectionRatio = defaultMaxRatio;
            }
          }
        }
        let ConstraintCtor = Dist;
        if(wantsElastic){
          if(!constraintOpts) constraintOpts = {};
          if(constraintOpts.elastic === undefined) constraintOpts.elastic = true;
          if(constraintOpts.elasticity === undefined && defaultElasticity > 0){
            constraintOpts.elasticity = defaultElasticity;
          }
          if(constraintOpts.damping === undefined && defaultDamping > 0){
            constraintOpts.damping = defaultDamping;
          }
          if(useOneWay && typeof OneWayElasticDist === 'function'){
            constraintOpts.oneWay = true;
            ConstraintCtor = OneWayElasticDist;
          }else{
            ConstraintCtor = ElasticDist;
          }
        }else if(useOneWay){
          ConstraintCtor = OneWayDist;
        }
        const constraint = new ConstraintCtor(A,B,rest,stiffness,constraintOpts);
        if(useOneWay && constraint){
          constraint.limbPullOwner = this;
        }
        if(constraint && constraint.elasticity !== undefined){
          const baseElasticity = Number.isFinite(constraint.elasticity)
            ? constraint.elasticity
            : 0;
          constraint._baseElasticity = baseElasticity;
        }
        worldRef.constraints.push(constraint);
        this.rigConstraints.push(constraint);
      }
    }
  }
}

function updateHitboxRigForces(world){
  if(!world) return;
  if(!world.gameplayFlags) world.gameplayFlags = {};
  const rawStrength = Number.isFinite(world.gameplayFlags.hitboxRigStrength)
    ? clamp(Math.round(world.gameplayFlags.hitboxRigStrength), 0, 200)
    : 100;
  world.gameplayFlags.hitboxRigStrength = rawStrength;
  const multiplier = world.gameplayFlags.showHitboxes ? rawStrength / 100 : 1;
  world.gameplayFlags.hitboxRigMultiplier = multiplier;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  for(const stick of sticks){
    if(!stick || typeof stick.applyHitboxRigStrength !== 'function') continue;
    stick.applyHitboxRigStrength(multiplier);
  }
}

function applyEquipmentKillEffects(killer, victim){
  if(!killer || !victim) return;
  if(typeof killer.currentWeaponSlot !== 'function') return;
  if(killer.dead) return;
  const slot = killer.currentWeaponSlot();
  if(!slot || slot.type !== 'weapon') return;
  if(slot.id === 'crumblingClaymore'){
    const world = killer.world || victim.world || null;
    applyCrumblingClaymoreDecay(killer, slot, world);
  }
}

function applyCrumblingClaymoreDecay(killer, slot, world){
  if(!slot) return;
  const config = WEAPONS?.crumblingClaymore?.crumbling || {};
  const decay = Number.isFinite(config.decayPerKill) ? config.decayPerKill : 0.1;
  if(!(decay > 0)) return;
  const minStrength = clamp(Number.isFinite(config.minStrength) ? config.minStrength : 0.3, 0, 1);
  const previous = Number.isFinite(slot.crumblingStrength) ? slot.crumblingStrength : 1;
  if(previous <= minStrength + 1e-4) return;
  const next = Math.max(minStrength, previous - decay);
  if(Math.abs(next - previous) < 1e-6) return;
  slot.crumblingStrength = Number(next.toFixed(3));
  const resolvedWorld = killer?.world || world || null;
  if(resolvedWorld && !killer?.isEnemy && typeof spawnDamageNumber === 'function'){
    const potency = Math.round(next * 100);
    spawnDamageNumber(resolvedWorld, killer, 0, {
      text: `Potency ${potency}%`,
      color: '#f5d7a7',
      strokeColor: 'rgba(36, 26, 18, 0.7)',
      maxLife: 520
    });
  }
  if(resolvedWorld && !killer?.isEnemy && typeof renderHUD === 'function'){
    renderHUD(resolvedWorld);
  }
  if(resolvedWorld && killer && typeof updateProfileEntryFromStick === 'function' && killer.world === resolvedWorld){
    updateProfileEntryFromStick(resolvedWorld, killer);
  }
}

if(typeof globalThis !== 'undefined'){
  globalThis.Stick = Stick;
  globalThis.updateHitboxRigForces = updateHitboxRigForces;
}

