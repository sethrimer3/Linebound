// summons.js

const SUMMONER_SOUL_PICKUP_RADIUS = 260;
const SUMMONER_MAX_SOULS_DEFAULT = 10;
const SUMMONER_SOUL_FLOAT_HEIGHT = 58;
const SUMMON_SIZE_SCALE = 0.2;
const SUMMONER_DEFAULT_ACTIVE_LIMIT = 3;
const SUMMONER_HIT_COOLDOWN_MS = 10000;
const SUMMONER_SOUL_PARTICLE_RADIUS = 3;
const SUMMON_PATH_MAX_DISTANCE = 720;
const SUMMON_PATH_RECALC_DELAY = 0.45;
const SUMMON_PATH_MAX_STEPS = 24;
const SUMMON_PATH_MAX_EXPLORED = 240;
const SUMMON_DIRECT_SAMPLES = 14;
const SUMMON_PATH_DIRS = [
  { row: 1, col: 0 },
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: -1 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
  { row: -1, col: 1 },
  { row: -1, col: -1 }
];
const SUMMON_WISP_CONFIG = {
  radius: 18,
  mass: 0.7,
  jointStiffness: 0.22,
  crossStiffness: 0.14,
  speed: 520,
  climbLift: 560,
  jumpStrength: 860,
  kamikazeDamage: 16,
  knockScale: 0.8,
  lifetimeMs: 12000,
  color: '#c9f1ff'
};
const SUMMON_GUARDIAN_CONFIG = {
  baseRadius: 28,
  mass: 0.9,
  jointStiffness: 0.26,
  crossStiffness: 0.18,
  speed: 420,
  climbLift: 680,
  jumpStrength: 980,
  baseDamage: 26,
  knockScale: 1.2,
  lifetimeMs: 20000,
  impactCharges: 6,
  color: '#efd0ff'
};
const SUMMON_SCRIBBLE_BIRD_CONFIG = {
  radius: 14,
  mass: 0.62,
  jointStiffness: 0.24,
  crossStiffness: 0.18,
  speed: 380,
  maxSpeed: 440,
  turnRate: 9.5,
  seekForce: 1020,
  drag: 0.24,
  flapBoost: 340,
  liftBoost: 120,
  peckDamage: 12,
  knockScale: 0.65,
  lifetimeMs: 15000,
  maxCharges: 5,
  lineColor: '#fdf7ff',
  accentColor: '#b9eaff',
  hitBurstScale: 0.55
};
const SUMMON_BEE_SWARM_CONFIG = {
  radius: 10,
  mass: 0.48,
  jointStiffness: 0.28,
  crossStiffness: 0.2,
  speed: 380,
  maxSpeed: 460,
  turnRate: 10,
  seekForce: 980,
  drag: 0.2,
  bounce: 0.82,
  stingDamage: 10,
  knockScale: 0.55,
  lifetimeMs: 16000,
  maxCharges: 4,
  bodyColor: '#ffd866',
  stripeColor: '#3b2a24',
  wingColor: 'rgba(255, 255, 255, 0.75)',
  tipColor: '#2f1f1a'
};
const SUMMON_SPIDER_CONFIG = {
  radius: 16,
  mass: 0.78,
  jointStiffness: 0.26,
  crossStiffness: 0.2,
  speed: 380,
  climbLift: 660,
  jumpStrength: 900,
  biteDamage: 16,
  knockScale: 0.9,
  lifetimeMs: 18000,
  maxCharges: 4,
  hitBurstScale: 0.65,
  legCount: 4,
  legLength: 32,
  legStiffness: 0.32,
  legSplay: 0.62,
  footRadius: 7,
  footFriction: 46,
  color: '#d1f1e4',
  accentColor: '#8fcdb9',
  legColor: '#3c5b50',
  eyeColor: '#f5fffb'
};

function summonerAimTarget(owner, aimPoint, tolerance){
  if(!owner || !owner.world) return null;
  const world = owner.world;
  if(owner.isEnemy) return null;
  if(world.selected && world.selected !== owner) return null;
  if(!aimPoint || !Number.isFinite(aimPoint.x) || !Number.isFinite(aimPoint.y)) return null;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const range = Math.max(40, Number.isFinite(tolerance) ? tolerance : 160);
  let best = null;
  let bestDist = Infinity;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dx = center.x - aimPoint.x;
    const dy = center.y - aimPoint.y;
    const dist = Math.hypot(dx, dy);
    if(dist > range) continue;
    if(dist < bestDist){
      best = stick;
      bestDist = dist;
    }
  }
  return best;
}

function summonAimPointFromOpts(owner, opts){
  if(!opts) opts = {};
  if(Number.isFinite(opts.aimX) && Number.isFinite(opts.aimY)){
    return { x: opts.aimX, y: opts.aimY };
  }
  if(opts.aim && Number.isFinite(opts.aim.x) && Number.isFinite(opts.aim.y)){
    return { x: opts.aim.x, y: opts.aim.y };
  }
  const worldAim = owner?.world?.input?.aim;
  if(worldAim && Number.isFinite(worldAim.x) && Number.isFinite(worldAim.y)){
    return { x: worldAim.x, y: worldAim.y };
  }
  return null;
}

function applySummonInitialTarget(summon, owner, opts){
  if(!summon || !owner) return;
  const aimPoint = summonAimPointFromOpts(owner, opts);
  if(!aimPoint) return;
  const weapon = typeof owner.weapon === 'function' ? owner.weapon() : null;
  const tolerance = weapon && weapon.summonAimAssistRadius !== undefined
    ? weapon.summonAimAssistRadius
    : null;
  const target = summonerAimTarget(owner, aimPoint, tolerance);
  if(target){
    summon.lockedTarget = target;
    summon.target = target;
  }
}

function ensureSummonCollections(world){
  if(!world) return;
  if(!Array.isArray(world.summons)) world.summons = [];
  if(!Array.isArray(world.soulOrbs)) world.soulOrbs = [];
}

function resolveSummonerStateTarget(stick){
  if(!stick) return null;
  if(typeof stick._ensureSummonerState === 'function') return stick._ensureSummonerState();
  return stick.summonerState || null;
}

function resolveSummonerLimit(state, weapon){
  const weaponLimit = weapon && weapon.maxActiveSummons !== undefined
    ? weapon.maxActiveSummons
    : (state?.maxActiveSummons);
  const fallback = Number.isFinite(weaponLimit) ? weaponLimit : SUMMONER_DEFAULT_ACTIVE_LIMIT;
  return Math.max(1, Math.round(fallback || 1));
}

function syncSummonerSlots(state, limit){
  if(!state) return [];
  const effectiveLimit = Math.max(1, Math.round(limit || state.maxActiveSummons || SUMMONER_DEFAULT_ACTIVE_LIMIT));
  if(!Array.isArray(state.summonSlots)) state.summonSlots = [];
  if(state.summonSlots.length > effectiveLimit) state.summonSlots.length = effectiveLimit;
  for(let i=0;i<effectiveLimit;i++){
    const slot = state.summonSlots[i];
    if(!slot){
      state.summonSlots[i] = { summon: null, cooldownUntil: 0 };
      continue;
    }
    if(slot.summon && slot.summon._destroyed){
      slot.summon = null;
    }
    if(!Number.isFinite(slot.cooldownUntil)) slot.cooldownUntil = 0;
  }
  for(let i=state.summonSlots.length;i<effectiveLimit;i++){
    state.summonSlots[i] = { summon: null, cooldownUntil: 0 };
  }
  return state.summonSlots;
}

function cleanupSummonerActiveList(state){
  if(!state) return 0;
  if(!Array.isArray(state.activeSummons)){
    state.activeSummons = [];
    return 0;
  }
  const filtered = state.activeSummons.filter(entry => entry && !entry._destroyed);
  state.activeSummons = filtered;
  if(Array.isArray(state.summonSlots)){
    for(const slot of state.summonSlots){
      if(!slot) continue;
      if(slot.summon && slot.summon._destroyed){
        slot.summon = null;
      }
    }
  }
  return filtered.length;
}

function summonerHasCapacity(stick, weapon){
  const state = resolveSummonerStateTarget(stick);
  if(!state) return true;
  const limit = resolveSummonerLimit(state, weapon);
  state.maxActiveSummons = limit;
  cleanupSummonerActiveList(state);
  const slots = syncSummonerSlots(state, limit);
  const now = nowMs();
  for(const slot of slots){
    if(!slot) continue;
    if(slot.summon) continue;
    if(slot.cooldownUntil && now < slot.cooldownUntil) continue;
    return true;
  }
  return false;
}

function trackSummonForOwner(summon, weapon){
  const owner = summon?.owner;
  if(!owner) return;
  const state = resolveSummonerStateTarget(owner);
  if(!state) return;
  const limit = resolveSummonerLimit(state, weapon || (typeof owner.weapon === 'function' ? owner.weapon() : null));
  state.maxActiveSummons = limit;
  if(!Array.isArray(state.activeSummons)) state.activeSummons = [];
  if(state.activeSummons.indexOf(summon) === -1) state.activeSummons.push(summon);
  const slots = syncSummonerSlots(state, limit);
  const now = nowMs();
  let assigned = false;
  for(let i=0;i<slots.length;i++){
    const slot = slots[i];
    if(!slot) continue;
    if(slot.summon && slot.summon !== summon){
      if(slot.summon._destroyed){
        slot.summon = null;
      }else{
        continue;
      }
    }
    if(slot.summon === summon){
      summon._summonerSlotIndex = i;
      assigned = true;
      break;
    }
    if(slot.cooldownUntil && now < slot.cooldownUntil) continue;
    if(slot.summon) continue;
    slot.summon = summon;
    slot.cooldownUntil = 0;
    summon._summonerSlotIndex = i;
    assigned = true;
    break;
  }
  if(!assigned){
    summon._summonerSlotIndex = -1;
  }
}

function releaseSummonerSlot(summon){
  if(!summon) return;
  const owner = summon.owner;
  if(!owner || !owner.summonerState) return;
  const state = owner.summonerState;
  if(!Array.isArray(state.activeSummons)){
    state.activeSummons = [];
  }else{
    state.activeSummons = state.activeSummons.filter(entry => entry && entry !== summon && !entry._destroyed);
  }
  const slots = Array.isArray(state.summonSlots) ? state.summonSlots : null;
  const now = nowMs();
  if(slots){
    for(let i=0;i<slots.length;i++){
      const slot = slots[i];
      if(!slot) continue;
      if(slot.summon === summon){
        slot.summon = null;
        if(summon._registeredHit){
          slot.cooldownUntil = now + SUMMONER_HIT_COOLDOWN_MS;
        }
      }else if(slot.summon && slot.summon._destroyed){
        slot.summon = null;
      }
    }
  }
  summon._summonerSlotIndex = -1;
}

function createSummonPoint(x, y, summon, opts={}){
  const point = new Point(x, y);
  point.owner = summon;
  point.mass = opts.mass ?? 0.8;
  point.terrainRadius = opts.terrainRadius ?? 8;
  point.groundFriction = opts.groundFriction ?? 32;
  point.maxStepUp = opts.maxStepUp ?? 28;
  point.ignoreTerrain = !!opts.ignoreTerrain;
  point.gravityScale = opts.gravityScale ?? 1;
  point.restTerrainRadius = opts.restTerrainRadius ?? point.terrainRadius;
  point.attackTerrainRadius = opts.attackTerrainRadius ?? point.terrainRadius;
  return point;
}

function attachSummonConstraint(world, summon, a, b, rest, stiffness){
  if(!world || !a || !b) return null;
  const constraint = new Dist(a, b, rest, stiffness);
  summon.constraints.push(constraint);
  world.constraints.push(constraint);
  return constraint;
}

function registerSummon(world, summon){
  if(!world || !summon) return null;
  const owner = summon.owner || null;
  const weapon = owner && typeof owner.weapon === 'function' ? owner.weapon() : null;
  if(owner && weapon && weapon.kind === 'summoner' && !summonerHasCapacity(owner, weapon)){
    destroySummon(world, summon);
    return null;
  }
  ensureSummonCollections(world);
  world.summons.push(summon);
  summon._registeredHit = false;
  summon._summonerSlotIndex = -1;
  if(owner && weapon && weapon.kind === 'summoner'){
    trackSummonForOwner(summon, weapon);
  }
  return summon;
}

function spawnSummonerWisp(owner, weapon, opts={}){
  if(!owner || owner.dead) return null;
  const world = owner.world;
  if(!world) return null;
  ensureSummonCollections(world);
  const form = weapon?.summonForm || weapon?.summonVariant || 'orb';
  if(form === 'bird' || form === 'scribbleBird'){
    return spawnSummonerScribbleBird(owner, weapon, opts);
  }
  if(form === 'bee' || form === 'beeDrone' || form === 'beeSwarm'){
    return spawnSummonerBeeSwarm(owner, weapon, opts);
  }
  if(form === 'spider'){
    return spawnSummonerSpider(owner, weapon, opts);
  }
  const config = { ...SUMMON_WISP_CONFIG };
  if(weapon && weapon.summonColor) config.color = weapon.summonColor;
  if(weapon && weapon.summonDamage !== undefined) config.kamikazeDamage = weapon.summonDamage;
  if(weapon && weapon.summonRadius !== undefined){
    config.radius = weapon.summonRadius;
  }
  const spawnHand = owner.weaponHand || (owner.dir >= 0 ? 'handR' : 'handL');
  const hand = owner.pointsByName?.[spawnHand];
  const origin = owner.center();
  const spawnX = hand ? hand.x : origin.x + owner.dir * 24;
  const spawnY = hand ? hand.y - 6 : origin.y - 12;
  const summon = buildSoftbodySummon(world, owner, {
    radius: config.radius,
    mass: config.mass,
    jointStiffness: config.jointStiffness,
    crossStiffness: config.crossStiffness,
    color: config.color,
    lifetimeMs: config.lifetimeMs,
    kamikazeDamage: config.kamikazeDamage,
    knockScale: config.knockScale,
    maxCharges: 1,
    pointCount: weapon?.summonSides !== undefined
      ? Math.max(3, Math.round(weapon.summonSides))
      : 8,
    pathfindRange: weapon?.summonPathRange
  }, spawnX, spawnY);
  if(!summon) return null;
  summon.speed = config.speed;
  summon.climbLift = config.climbLift;
  summon.jumpStrength = config.jumpStrength;
  summon.explodeOnImpact = true;
  summon.rolling = true;
  summon.rollStrength = weapon?.summonRollStrength !== undefined
    ? weapon.summonRollStrength
    : 0.55;
  applySummonInitialTarget(summon, owner, opts);
  if(!registerSummon(world, summon)) return null;
  return summon;
}

function spawnSummonerGuardian(owner, soulCount, weapon, opts={}){
  if(!owner || owner.dead || !Number.isFinite(soulCount) || soulCount <= 0) return null;
  const world = owner.world;
  if(!world) return null;
  ensureSummonCollections(world);
  const config = { ...SUMMON_GUARDIAN_CONFIG };
  if(weapon && weapon.guardianColor) config.color = weapon.guardianColor;
  if(weapon && weapon.guardianRadius !== undefined){
    config.baseRadius = weapon.guardianRadius;
  }
  if(weapon && weapon.guardianBaseDamage !== undefined){
    config.baseDamage = weapon.guardianBaseDamage;
  }
  const soulLimit = weapon && weapon.maxSouls !== undefined ? weapon.maxSouls : SUMMONER_MAX_SOULS_DEFAULT;
  const cappedSouls = clamp(Math.round(soulCount), 1, soulLimit);
  const baseRadius = config.baseRadius ?? SUMMON_GUARDIAN_CONFIG.baseRadius;
  const baseDamage = config.baseDamage ?? SUMMON_GUARDIAN_CONFIG.baseDamage;
  const scale = Math.pow(1.5, cappedSouls);
  const radius = baseRadius * scale;
  const damage = baseDamage * scale;
  const charges = Math.max(2, Math.round((config.impactCharges ?? SUMMON_GUARDIAN_CONFIG.impactCharges) + cappedSouls * 0.5));
  const spawnHand = owner.weaponHand || (owner.dir >= 0 ? 'handR' : 'handL');
  const hand = owner.pointsByName?.[spawnHand];
  const origin = owner.center();
  const spawnX = hand ? hand.x : origin.x + owner.dir * 18;
  const spawnY = hand ? hand.y - 8 : origin.y - 18;
  const summon = buildSoftbodySummon(world, owner, {
    radius,
    mass: config.mass,
    jointStiffness: config.jointStiffness,
    crossStiffness: config.crossStiffness,
    color: config.color,
    lifetimeMs: config.lifetimeMs,
    kamikazeDamage: damage,
    knockScale: config.knockScale,
    maxCharges: charges
  }, spawnX, spawnY);
  if(!summon) return null;
  const speedBase = config.speed !== undefined ? config.speed : SUMMON_GUARDIAN_CONFIG.speed;
  const climbBase = config.climbLift !== undefined ? config.climbLift : SUMMON_GUARDIAN_CONFIG.climbLift;
  const jumpBase = config.jumpStrength !== undefined ? config.jumpStrength : SUMMON_GUARDIAN_CONFIG.jumpStrength;
  const speedScale = 1 + cappedSouls * 0.08;
  const powerScale = 1 + cappedSouls * 0.05;
  summon.speed = speedBase * speedScale;
  summon.climbLift = climbBase * powerScale;
  summon.jumpStrength = jumpBase * powerScale;
  summon.explodeOnImpact = false;
  summon.guardian = true;
  summon.multiHit = true;
  applySummonInitialTarget(summon, owner, opts);
  if(!registerSummon(world, summon)) return null;
  return summon;
}

function spawnSummonerScribbleBird(owner, weapon, opts={}){
  if(!owner || owner.dead) return null;
  const world = owner.world;
  if(!world) return null;
  ensureSummonCollections(world);
  const config = { ...SUMMON_SCRIBBLE_BIRD_CONFIG };
  if(weapon && weapon.summonRadius !== undefined) config.radius = weapon.summonRadius;
  if(weapon && weapon.summonDamage !== undefined) config.peckDamage = weapon.summonDamage;
  if(weapon && weapon.summonLifetime !== undefined) config.lifetimeMs = weapon.summonLifetime;
  if(weapon && weapon.summonCharges !== undefined) config.maxCharges = Math.max(1, Math.round(weapon.summonCharges));
  if(weapon && weapon.summonSpeed !== undefined) config.speed = weapon.summonSpeed;
  if(weapon && weapon.summonColor) config.accentColor = weapon.summonColor;
  if(weapon && weapon.birdLineColor) config.lineColor = weapon.birdLineColor;
  if(weapon && weapon.birdAccentColor) config.accentColor = weapon.birdAccentColor;
  if(weapon && weapon.summonKnockScale !== undefined) config.knockScale = weapon.summonKnockScale;
  if(weapon && weapon.summonMaxSpeed !== undefined) config.maxSpeed = weapon.summonMaxSpeed;
  if(weapon && weapon.summonTurnRate !== undefined) config.turnRate = weapon.summonTurnRate;
  if(weapon && weapon.summonSeekForce !== undefined) config.seekForce = weapon.summonSeekForce;
  if(weapon && weapon.summonDrag !== undefined) config.drag = weapon.summonDrag;
  if(weapon && weapon.summonFlapBoost !== undefined) config.flapBoost = weapon.summonFlapBoost;
  if(weapon && weapon.summonLiftBoost !== undefined) config.liftBoost = weapon.summonLiftBoost;
  if(weapon && weapon.summonHitBurstScale !== undefined) config.hitBurstScale = weapon.summonHitBurstScale;
  const spawnHand = owner.weaponHand || (owner.dir >= 0 ? 'handR' : 'handL');
  const hand = owner.pointsByName?.[spawnHand];
  const origin = owner.center();
  const defaultX = hand ? hand.x : origin.x + owner.dir * 20;
  const defaultY = hand ? hand.y - 10 : origin.y - 16;
  const spawnX = Number.isFinite(opts.spawnX) ? opts.spawnX : defaultX;
  const spawnY = Number.isFinite(opts.spawnY) ? opts.spawnY : defaultY;
  const summon = buildSoftbodySummon(world, owner, {
    radius: config.radius,
    mass: config.mass,
    jointStiffness: config.jointStiffness,
    crossStiffness: config.crossStiffness,
    color: config.accentColor || '#cfeeff',
    lifetimeMs: config.lifetimeMs,
    kamikazeDamage: config.peckDamage,
    knockScale: config.knockScale,
    maxCharges: config.maxCharges,
    explodeOnImpact: false
  }, spawnX, spawnY);
  if(!summon) return null;
  summon.speed = config.speed;
  summon.maxSpeed = config.maxSpeed !== undefined ? config.maxSpeed : config.speed;
  summon.turnRate = config.turnRate;
  summon.seekForce = config.seekForce;
  summon.drag = config.drag;
  summon.flapBoost = config.flapBoost;
  summon.liftBoost = config.liftBoost;
  summon.explodeOnImpact = false;
  summon.multiHit = true;
  summon.shape = 'scribbleBird';
  summon.lineColor = config.lineColor;
  summon.accentColor = config.accentColor;
  summon.hitBurstScale = config.hitBurstScale;
  summon.flapPhase = Math.random() * TAU;
  summon.vx = 0;
  summon.vy = 0;
  summon.facing = owner?.dir >= 0 ? 1 : -1;
  for(const point of summon.points){
    if(!point) continue;
    point.gravityScale = 0;
    point.groundFriction = Math.min(point.groundFriction || 0, 2);
  }
  if(!opts.disableInitialTarget){
    applySummonInitialTarget(summon, owner, opts);
  }
  if(!registerSummon(world, summon)) return null;
  return summon;
}

function spawnSummonerBeeSwarm(owner, weapon, opts={}){
  if(!owner || owner.dead) return null;
  const world = owner.world;
  if(!world) return null;
  ensureSummonCollections(world);
  const config = { ...SUMMON_BEE_SWARM_CONFIG };
  if(weapon && weapon.summonRadius !== undefined) config.radius = weapon.summonRadius;
  if(weapon && weapon.summonDamage !== undefined) config.stingDamage = weapon.summonDamage;
  if(weapon && weapon.summonLifetime !== undefined) config.lifetimeMs = weapon.summonLifetime;
  if(weapon && weapon.summonCharges !== undefined) config.maxCharges = Math.max(1, Math.round(weapon.summonCharges));
  if(weapon && weapon.summonSpeed !== undefined) config.speed = weapon.summonSpeed;
  if(weapon && weapon.summonMaxSpeed !== undefined) config.maxSpeed = weapon.summonMaxSpeed;
  if(weapon && weapon.summonTurnRate !== undefined) config.turnRate = weapon.summonTurnRate;
  if(weapon && weapon.summonSeekForce !== undefined) config.seekForce = weapon.summonSeekForce;
  if(weapon && weapon.summonDrag !== undefined) config.drag = weapon.summonDrag;
  if(weapon && weapon.summonBounce !== undefined) config.bounce = weapon.summonBounce;
  if(weapon && weapon.summonColor) config.bodyColor = weapon.summonColor;
  if(weapon && weapon.summonStripeColor) config.stripeColor = weapon.summonStripeColor;
  if(weapon && weapon.summonWingColor) config.wingColor = weapon.summonWingColor;
  if(weapon && weapon.summonTipColor) config.tipColor = weapon.summonTipColor;
  const spawnHand = owner.weaponHand || (owner.dir >= 0 ? 'handR' : 'handL');
  const hand = owner.pointsByName?.[spawnHand];
  const origin = owner.center();
  const defaultX = hand ? hand.x : origin.x + owner.dir * 20;
  const defaultY = hand ? hand.y - 6 : origin.y - 12;
  const spawnX = Number.isFinite(opts.spawnX) ? opts.spawnX : defaultX;
  const spawnY = Number.isFinite(opts.spawnY) ? opts.spawnY : defaultY;
  const summon = buildSoftbodySummon(world, owner, {
    radius: config.radius,
    mass: config.mass,
    jointStiffness: config.jointStiffness,
    crossStiffness: config.crossStiffness,
    color: config.bodyColor || '#ffd866',
    lifetimeMs: config.lifetimeMs,
    kamikazeDamage: config.stingDamage,
    knockScale: config.knockScale,
    maxCharges: config.maxCharges,
    explodeOnImpact: false
  }, spawnX, spawnY);
  if(!summon) return null;
  summon.speed = config.speed;
  summon.maxSpeed = config.maxSpeed !== undefined ? config.maxSpeed : config.speed;
  summon.turnRate = config.turnRate;
  summon.seekForce = config.seekForce;
  summon.drag = config.drag;
  summon.bounce = config.bounce;
  summon.explodeOnImpact = false;
  summon.multiHit = true;
  summon.shape = 'beeDrone';
  summon.bodyColor = config.bodyColor;
  summon.stripeColor = config.stripeColor;
  summon.wingColor = config.wingColor;
  summon.tipColor = config.tipColor;
  summon.vx = owner?.dir >= 0 ? config.speed * 0.35 : -config.speed * 0.35;
  summon.vy = -40;
  summon.facing = owner?.dir >= 0 ? 1 : -1;
  summon.wingPhase = Math.random() * TAU;
  for(const point of summon.points){
    if(!point) continue;
    point.gravityScale = 0;
    point.groundFriction = Math.min(point.groundFriction || 0, 2);
  }
  if(!opts.disableInitialTarget){
    applySummonInitialTarget(summon, owner, opts);
  }
  if(!registerSummon(world, summon)) return null;
  return summon;
}

function spawnSummonerSpider(owner, weapon, opts={}){
  if(!owner || owner.dead) return null;
  const world = owner.world;
  if(!world) return null;
  ensureSummonCollections(world);
  const config = { ...SUMMON_SPIDER_CONFIG };
  if(weapon && weapon.summonRadius !== undefined) config.radius = weapon.summonRadius;
  if(weapon && weapon.summonDamage !== undefined) config.biteDamage = weapon.summonDamage;
  if(weapon && weapon.summonLifetime !== undefined) config.lifetimeMs = weapon.summonLifetime;
  if(weapon && weapon.summonSpeed !== undefined) config.speed = weapon.summonSpeed;
  if(weapon && weapon.summonClimbLift !== undefined) config.climbLift = weapon.summonClimbLift;
  if(weapon && weapon.summonJumpStrength !== undefined) config.jumpStrength = weapon.summonJumpStrength;
  if(weapon && weapon.summonKnockScale !== undefined) config.knockScale = weapon.summonKnockScale;
  if(weapon && weapon.summonHitBurstScale !== undefined) config.hitBurstScale = weapon.summonHitBurstScale;
  if(weapon && weapon.summonCharges !== undefined) config.maxCharges = weapon.summonCharges;
  if(weapon && weapon.summonColor) config.color = weapon.summonColor;
  if(weapon && weapon.summonAccentColor) config.accentColor = weapon.summonAccentColor;
  if(weapon && weapon.spiderLegColor) config.legColor = weapon.spiderLegColor;
  if(weapon && weapon.spiderEyeColor) config.eyeColor = weapon.spiderEyeColor;
  const spawnHand = owner.weaponHand || (owner.dir >= 0 ? 'handR' : 'handL');
  const hand = owner.pointsByName?.[spawnHand];
  const origin = owner.center();
  const defaultX = hand ? hand.x : origin.x + owner.dir * 18;
  const defaultY = hand ? hand.y - 8 : origin.y - 12;
  const spawnX = Number.isFinite(opts.spawnX) ? opts.spawnX : defaultX;
  const spawnY = Number.isFinite(opts.spawnY) ? opts.spawnY : defaultY;
  const summon = buildSoftbodySummon(world, owner, {
    radius: config.radius,
    mass: config.mass,
    jointStiffness: config.jointStiffness,
    crossStiffness: config.crossStiffness,
    color: config.color,
    lifetimeMs: config.lifetimeMs,
    kamikazeDamage: config.biteDamage,
    knockScale: config.knockScale,
    maxCharges: config.maxCharges,
    explodeOnImpact: false
  }, spawnX, spawnY);
  if(!summon) return null;
  summon.speed = config.speed;
  summon.climbLift = config.climbLift;
  summon.jumpStrength = config.jumpStrength;
  summon.multiHit = true;
  summon.shape = 'spider';
  summon.accentColor = config.accentColor;
  summon.legColor = config.legColor;
  summon.hitBurstScale = config.hitBurstScale;
  summon.maxCharges = Math.max(1, config.maxCharges || summon.maxCharges || 1);
  summon.charges = Math.max(1, summon.maxCharges);
  summon.legs = [];
  const legs = Math.max(2, Math.round(config.legCount || 4));
  const center = computeSummonCenter(summon);
  for(let i=0;i<legs;i++){
    const anchorIndex = Math.round(((i + 0.5) / legs) * (summon.outer.length || 1)) % (summon.outer.length || 1);
    const anchor = summon.outer[anchorIndex];
    if(!anchor) continue;
    const radialAngle = Math.atan2(anchor.y - center.y, anchor.x - center.x);
    const downAngle = Math.PI / 2;
    const blend = clamp(config.legSplay ?? 0.6, 0, 1);
    const baseAngle = lerpAngle(radialAngle, downAngle, blend);
    const variation = (i % 2 === 0 ? -1 : 1) * 0.18;
    const side = anchor.x >= center.x ? 1 : -1;
    const leg = createSpiderLeg(world, summon, anchor, baseAngle + variation * side, {
      legLength: config.legLength,
      legStiffness: config.legStiffness,
      footRadius: config.footRadius,
      footFriction: config.footFriction
    });
    if(leg) summon.legs.push(leg);
  }
  if(!opts.disableInitialTarget){
    applySummonInitialTarget(summon, owner, opts);
  }else{
    summon.lockedTarget = null;
    summon.target = null;
  }
  if(!registerSummon(world, summon)) return null;
  if(opts.autoMarchDir !== undefined){
    summon.autoMarchDir = opts.autoMarchDir >= 0 ? 1 : -1;
  }
  if(opts.forwardOnly) summon.forwardOnly = true;
  if(opts.ignoreSummonerAim) summon.ignoreSummonerAim = true;
  if(opts.marchForce !== undefined) summon.marchForce = opts.marchForce;
  if(opts.marchHopForce !== undefined) summon.marchHopForce = opts.marchHopForce;
  if(opts.marchLift !== undefined) summon.marchLift = opts.marchLift;
  if(Number.isFinite(opts.launchVelocityX) || Number.isFinite(opts.launchVelocityY)){
    const vx = Number.isFinite(opts.launchVelocityX) ? opts.launchVelocityX : 0;
    const vy = Number.isFinite(opts.launchVelocityY) ? opts.launchVelocityY : 0;
    for(const point of summon.points || []){
      if(!point) continue;
      if(vx) point.vx += vx;
      if(vy) point.vy += vy;
    }
  }
  return summon;
}

function spawnNecromancerZombie(owner, opts={}){
  if(!owner || !owner.world) return null;
  const world = owner.world;
  const now = nowMs();
  const baseCenter = typeof owner.center === 'function' ? owner.center() : null;
  const spawnX = Number.isFinite(opts.x) ? opts.x : (baseCenter ? baseCenter.x : 0);
  const spawnY = Number.isFinite(opts.y) ? opts.y : (baseCenter ? baseCenter.y : 0);
  const enemyAlignment = !!owner.isEnemy;
  const zombie = new Stick(spawnX, spawnY, enemyAlignment, world);
  zombie.label = zombie.label || 'Thrall';
  zombie.renderStyle = zombie.renderStyle || 'stick';
  zombie.bodyColor = zombie.bodyColor || '#d8d8d8';
  zombie.accentColor = zombie.accentColor || '#6f9b7d';
  zombie.element = 'necrotic';
  zombie.isEnemy = enemyAlignment;
  zombie.isSummoned = true;
  zombie.summoner = owner;
  zombie.selectable = false;
  const config = opts.config || {};
  const damageScale = Number.isFinite(config.damageMultiplier) ? Math.max(0.1, config.damageMultiplier) : 1;
  const defenseScale = Number.isFinite(config.defenseMultiplier) ? Math.max(0.1, config.defenseMultiplier) : 1;
  const healthScale = Number.isFinite(config.healthMultiplier) ? Math.max(0.1, config.healthMultiplier) : 1;
  zombie.attackBase = 1.1 * damageScale;
  zombie.attack = zombie.attackBase;
  zombie.defenseBase = 0.6 * defenseScale;
  zombie.defense = zombie.defenseBase;
  zombie.maxHpBase = 20 * healthScale;
  zombie.maxHp = zombie.maxHpBase;
  zombie.hp = zombie.maxHp;
  zombie.baseMoveSpeed = zombie.moveSpeed = Math.max(320, zombie.moveSpeed * 0.85);
  zombie.baseMoveForce = zombie.moveForce = zombie.moveSpeed * 25;
  zombie.baseMoveDecel = zombie.moveDecel = zombie.moveSpeed * 6;
  zombie.airMoveForce = zombie.moveForce * 0.65;
  zombie.behavior = 'skirmisher';
  zombie.target = null;
  zombie.weaponVisible = true;
  zombie.deadFadeDelay = 200;
  zombie.deadFadeDuration = 600;
  zombie.necroExpiresAt = now + Math.max(1000, Number.isFinite(config.lifetimeMs) ? config.lifetimeMs : 15000);
  const weaponSlot = createEquipmentSlot({ mainHand: { type: 'weapon', id: 'necromancerZombieClaws' } });
  zombie.inventory = [weaponSlot];
  zombie.equipIndex = 0;
  zombie.refreshWeaponRig();
  if(typeof applyStickSizeScale === 'function'){
    const scale = Number.isFinite(config.scale) ? Math.max(0.35, config.scale) : 0.7;
    applyStickSizeScale(zombie, scale);
  }
  if(typeof recomputeStickEquipmentBonuses === 'function'){
    recomputeStickEquipmentBonuses(zombie);
  }
  zombie.cacheBaseStatsFromCurrent({ useRaw: true });
  zombie._recomputeAuraMultipliers();
  zombie.ai = function(){
    if(this.dead) return;
    const nowTime = nowMs();
    if(this.necroExpiresAt && nowTime >= this.necroExpiresAt){
      this.die({ type: 'despawn' });
      return;
    }
    const worldRef = this.world;
    if(!worldRef) return;
    const center = typeof this.center === 'function' ? this.center() : null;
    if(!center) return;
    const sticks = Array.isArray(worldRef.sticks) ? worldRef.sticks : [];
    let target = this.target;
    if(!target || target.dead || target.world !== worldRef || target.isEnemy === this.isEnemy){
      target = null;
      let bestDist = Infinity;
      for(const candidate of sticks){
        if(!candidate || candidate.dead || candidate.isEnemy === this.isEnemy) continue;
        const candCenter = typeof candidate.center === 'function' ? candidate.center() : null;
        if(!candCenter) continue;
        const dist = Math.hypot(candCenter.x - center.x, candCenter.y - center.y);
        if(dist < bestDist){
          bestDist = dist;
          target = candidate;
        }
      }
      this.target = target;
    }
    if(target){
      const tc = target.center();
      const dx = tc.x - center.x;
      const dy = tc.y - center.y;
      const moveAxis = Math.abs(dx) > 10 ? clamp(dx / 120, -1, 1) : 0;
      this.moveInput(moveAxis);
      if(dy < -40 && this.isGrounded){
        this.jump();
      }
      const weapon = this.weapon();
      const range = weapon?.range ?? 36;
      if(Math.hypot(dx, dy) <= range + 14){
        this.tryAttack(tc.x, tc.y);
      }
    }else{
      this.moveInput(0);
    }
  };
  world.sticks.push(zombie);
  return zombie;
}

function buildSoftbodySummon(world, owner, spec, x, y){
  if(!world || !owner) return null;
  const sizeScale = (typeof SUMMON_SIZE_SCALE === 'number' && SUMMON_SIZE_SCALE > 0)
    ? SUMMON_SIZE_SCALE
    : 1;
  const rawRadius = Math.max(4, spec.radius || 16);
  const radius = Math.max(3, rawRadius * sizeScale);
  const massScale = Math.max(0.04, sizeScale * sizeScale);
  const pointCount = Math.max(3, Math.round(spec.pointCount || 6));
  const summon = {
    type: 'summonOrb',
    owner,
    world,
    radius,
    color: spec.color || '#d9f5ff',
    points: [],
    constraints: [],
    born: nowMs(),
    lifetimeMs: Math.max(1000, spec.lifetimeMs || 10000),
    kamikazeDamage: Math.max(1, spec.kamikazeDamage || 12),
    knockScale: spec.knockScale ?? 1,
    maxCharges: Math.max(1, spec.maxCharges || 1),
    charges: Math.max(1, spec.maxCharges || 1),
    speed: spec.speed || 400,
    climbLift: spec.climbLift || 560,
    jumpStrength: spec.jumpStrength || 800,
    explodeOnImpact: spec.explodeOnImpact !== false,
    sizeScale,
    pathfindRange: Number.isFinite(spec.pathfindRange) ? spec.pathfindRange : SUMMON_PATH_MAX_DISTANCE,
    navPath: null,
    navPathIndex: 0,
    navPathTarget: null,
    _pathCooldown: 0
  };
  const outer = [];
  for(let i=0;i<pointCount;i++){
    const angle = (i / pointCount) * TAU;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    const point = createSummonPoint(px, py, summon, {
      mass: Math.max(0.02, (spec.mass ?? 0.8) * massScale),
      terrainRadius: radius * 0.55,
      groundFriction: spec.outerGroundFriction ?? 34,
      maxStepUp: spec.outerMaxStepUp ?? (radius * 0.9)
    });
    outer.push(point);
    summon.points.push(point);
    world.points.push(point);
  }
  const core = createSummonPoint(x, y, summon, {
    mass: Math.max(0.02, (spec.mass ?? 0.8) * 0.6 * massScale),
    terrainRadius: radius * 0.3,
    groundFriction: spec.coreGroundFriction ?? 24,
    maxStepUp: radius * 0.6
  });
  core.ignoreTerrain = true;
  core.terrainRadius = radius * 0.18;
  summon.points.push(core);
  world.points.push(core);
  const jointRest = radius * 1.05;
  const crossRest = radius * 1.6;
  for(let i=0;i<outer.length;i++){
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    attachSummonConstraint(world, summon, a, b, jointRest, spec.jointStiffness ?? 0.2);
    const cross = outer[(i + 2) % outer.length];
    attachSummonConstraint(world, summon, a, cross, crossRest, spec.crossStiffness ?? 0.16);
    attachSummonConstraint(world, summon, a, core, radius * 0.88, (spec.jointStiffness ?? 0.2) * 0.8);
  }
  summon.core = core;
  summon.outer = outer;
  summon.jumpCooldown = 0;
  summon.target = null;
  summon.spin = Math.random() * TAU;
  summon.fade = 0;
  summon._lastCenter = { x, y };
  summon.climbStall = 0;
  summon.hitTargets = typeof Set === 'function' ? new Set() : [];
  return summon;
}

function summonDirectPathClear(summon, from, to){
  if(!summon || !from || !to) return true;
  const world = summon.world;
  if(!world || typeof terrainSolidInBox !== 'function') return true;
  const radius = Math.max(6, (summon.radius || 16) * 0.85);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if(dist <= 1) return true;
  const samples = Math.max(2, Math.min(SUMMON_DIRECT_SAMPLES, Math.ceil(dist / Math.max(12, radius * 0.65))));
  for(let i=1;i<=samples;i++){
    const t = i / samples;
    const sampleX = from.x + dx * t;
    const sampleY = from.y + dy * t;
    const blocked = terrainSolidInBox(
      world,
      sampleX - radius,
      sampleX + radius,
      sampleY - radius,
      sampleY + radius,
      { ignoreGroundRow: true }
    );
    if(blocked) return false;
  }
  return true;
}

function summonWorldCell(world, x, y){
  if(!world) return null;
  const grid = world.terrainCells;
  if(!grid || !Array.isArray(grid.cells) || !grid.cells.length) return null;
  const tileSize = grid.tileSize || (typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' ? DEFAULT_LAYOUT_TILE_SIZE : 30);
  const offsetX = grid.offsetX || 0;
  const rows = grid.rows || grid.cells.length;
  const cols = grid.cols || (grid.cells[0] ? grid.cells[0].length : 0);
  const referenceY = Number.isFinite(world.groundY)
    ? world.groundY
    : (Number.isFinite(world.height) ? world.height : rows * tileSize);
  const col = Math.floor((x - offsetX) / tileSize);
  if(col < 0 || col >= cols) return null;
  const distance = referenceY - y;
  const steps = distance / tileSize;
  const rowRaw = rows - Math.ceil(steps);
  const row = Math.max(0, Math.min(rows - 1, rowRaw));
  if(row < 0 || row >= rows) return null;
  if(!Array.isArray(grid.cells[row])) return null;
  return { row, col };
}

function summonCellPassable(world, row, col){
  if(!world) return false;
  const grid = world.terrainCells;
  if(!grid || !Array.isArray(grid.cells) || !grid.cells.length) return false;
  const rows = grid.rows || grid.cells.length;
  const cols = grid.cols || (grid.cells[0] ? grid.cells[0].length : 0);
  if(row < 0 || row >= rows || col < 0 || col >= cols) return false;
  const rowCells = grid.cells[row];
  if(!rowCells) return false;
  return !rowCells[col];
}

function summonCellCenter(world, row, col){
  if(!world) return null;
  const grid = world.terrainCells;
  if(!grid || !Array.isArray(grid.cells) || !grid.cells.length) return null;
  const tileSize = grid.tileSize || (typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' ? DEFAULT_LAYOUT_TILE_SIZE : 30);
  const offsetX = grid.offsetX || 0;
  const rows = grid.rows || grid.cells.length;
  const referenceY = Number.isFinite(world.groundY)
    ? world.groundY
    : (Number.isFinite(world.height) ? world.height : rows * tileSize);
  const x = offsetX + (col + 0.5) * tileSize;
  const top = referenceY - (rows - row) * tileSize;
  const y = top + tileSize * 0.5;
  return { x, y };
}

function summonCellNavigable(world, row, col, radius){
  if(!summonCellPassable(world, row, col)) return false;
  const center = summonCellCenter(world, row, col);
  if(!center) return false;
  if(typeof terrainSolidInBox !== 'function') return true;
  const clearance = Math.max(radius, (world?.terrainCells?.tileSize || 30) * 0.6);
  const blocked = terrainSolidInBox(
    world,
    center.x - clearance,
    center.x + clearance,
    center.y - clearance,
    center.y + clearance,
    { ignoreGroundRow: true }
  );
  return !blocked;
}

function summonReconstructPath(parents, goalKey, startKey, world, summon, origin){
  if(!parents || !goalKey || !world || !summon) return null;
  const nodes = [];
  let cursor = goalKey;
  while(cursor && cursor !== startKey){
    const pieces = cursor.split(':');
    if(pieces.length !== 2) break;
    const row = parseInt(pieces[0], 10);
    const col = parseInt(pieces[1], 10);
    if(Number.isNaN(row) || Number.isNaN(col)) break;
    nodes.push({ row, col });
    cursor = parents.get(cursor);
  }
  nodes.reverse();
  if(nodes.length === 0) return null;
  const coords = nodes.map(node => summonCellCenter(world, node.row, node.col)).filter(Boolean);
  if(!coords.length) return null;
  const smoothed = [];
  let anchor = origin;
  let index = 0;
  while(index < coords.length){
    let farthest = coords[index];
    let farthestIndex = index;
    for(let i=index;i<coords.length;i++){
      const candidate = coords[i];
      if(!candidate) break;
      if(summonDirectPathClear(summon, anchor, candidate)){
        farthest = candidate;
        farthestIndex = i;
      }else{
        break;
      }
    }
    if(!farthest) break;
    smoothed.push(farthest);
    anchor = farthest;
    index = farthestIndex + 1;
  }
  if(smoothed.length > SUMMON_PATH_MAX_STEPS) return null;
  return smoothed;
}

function summonComputeSimplePath(summon, from, to){
  if(!summon || !from || !to) return null;
  const world = summon.world;
  if(!world) return null;
  const grid = world.terrainCells;
  if(!grid || !Array.isArray(grid.cells) || !grid.cells.length) return null;
  const radius = Math.max(6, summon.radius || 16);
  const maxDistance = Number.isFinite(summon.pathfindRange) ? summon.pathfindRange : SUMMON_PATH_MAX_DISTANCE;
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if(dist > maxDistance) return null;
  const startCell = summonWorldCell(world, from.x, from.y);
  const goalCell = summonWorldCell(world, to.x, to.y);
  if(!startCell || !goalCell) return null;
  const rows = grid.rows || grid.cells.length;
  const cols = grid.cols || (grid.cells[0] ? grid.cells[0].length : 0);
  const startKey = `${startCell.row}:${startCell.col}`;
  const goalKey = `${goalCell.row}:${goalCell.col}`;
  const queue = [startCell];
  const visited = new Set([startKey]);
  const parents = new Map();
  let explored = 0;
  while(queue.length && explored < SUMMON_PATH_MAX_EXPLORED){
    const current = queue.shift();
    explored++;
    const currentKey = `${current.row}:${current.col}`;
    if(currentKey === goalKey){
      return summonReconstructPath(parents, currentKey, startKey, world, summon, from);
    }
    for(const dir of SUMMON_PATH_DIRS){
      const nr = current.row + dir.row;
      const nc = current.col + dir.col;
      if(nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if(dir.row !== 0 && dir.col !== 0){
        if(!summonCellPassable(world, current.row + dir.row, current.col)) continue;
        if(!summonCellPassable(world, current.row, current.col + dir.col)) continue;
      }
      const key = `${nr}:${nc}`;
      if(visited.has(key)) continue;
      if(!summonCellNavigable(world, nr, nc, radius)) continue;
      visited.add(key);
      parents.set(key, currentKey);
      queue.push({ row: nr, col: nc });
    }
  }
  return null;
}

function summonResolvePathDestination(summon, center, targetCenter, step){
  if(!summon || !center || !targetCenter) return null;
  const maxDistance = Number.isFinite(summon.pathfindRange) ? summon.pathfindRange : SUMMON_PATH_MAX_DISTANCE;
  const separation = Math.hypot(targetCenter.x - center.x, targetCenter.y - center.y);
  if(separation > maxDistance) return null;
  if(!Number.isFinite(summon._pathCooldown)) summon._pathCooldown = 0;
  summon._pathCooldown = Math.max(0, summon._pathCooldown - step);
  if(summonDirectPathClear(summon, center, targetCenter)){
    summon.navPath = null;
    summon.navPathTarget = null;
    return null;
  }
  const tracked = summon.navPathTarget;
  const drift = tracked ? Math.hypot(targetCenter.x - tracked.x, targetCenter.y - tracked.y) : Infinity;
  if(!Array.isArray(summon.navPath) || summon.navPath.length === 0 || drift > Math.max(16, (summon.radius || 16) * 0.8) || summon._pathCooldown <= 0){
    const path = summonComputeSimplePath(summon, center, targetCenter);
    if(path && path.length){
      summon.navPath = path;
      summon.navPathIndex = 0;
      summon.navPathTarget = { x: targetCenter.x, y: targetCenter.y };
      summon._pathCooldown = SUMMON_PATH_RECALC_DELAY;
    }else{
      if(summon._pathCooldown <= 0){
        summon._pathCooldown = SUMMON_PATH_RECALC_DELAY;
      }
      return null;
    }
  }
  const path = summon.navPath;
  if(!Array.isArray(path) || path.length === 0) return null;
  let index = Number.isFinite(summon.navPathIndex) ? summon.navPathIndex : 0;
  index = Math.max(0, Math.min(index, path.length - 1));
  const tolerance = Math.max((summon.radius || 16) * 0.6, 12);
  while(index < path.length && Math.hypot(center.x - path[index].x, center.y - path[index].y) <= tolerance){
    index++;
  }
  if(index >= path.length){
    summon.navPath = null;
    return null;
  }
  summon.navPathIndex = index;
  return path[index];
}

function createSpiderLeg(world, summon, anchor, angle, spec={}){
  if(!world || !summon || !anchor) return null;
  const totalLength = Math.max(12, spec.legLength || (summon.radius * 1.8));
  const thighLength = totalLength * 0.42;
  const shinLength = totalLength * 0.34;
  const tarsusLength = Math.max(6, totalLength - thighLength - shinLength);
  const legStiff = spec.legStiffness ?? 0.32;
  const side = anchor.x >= (summon.core?.x || anchor.x) ? 1 : -1;
  const hipX = anchor.x + Math.cos(angle) * thighLength * 0.8;
  const hipY = anchor.y + Math.sin(angle) * thighLength * 0.8;
  const hip = createSummonPoint(hipX, hipY, summon, {
    mass: (summon.radius || 16) * 0.05,
    terrainRadius: (summon.radius || 16) * 0.32,
    groundFriction: 18,
    maxStepUp: Math.max(12, (summon.radius || 16) * 0.6)
  });
  const kneeAngle = angle + side * 0.32;
  const kneeX = hip.x + Math.cos(kneeAngle) * shinLength;
  const kneeY = hip.y + Math.sin(kneeAngle) * shinLength;
  const knee = createSummonPoint(kneeX, kneeY, summon, {
    mass: (summon.radius || 16) * 0.04,
    terrainRadius: (summon.radius || 16) * 0.26,
    groundFriction: 18,
    maxStepUp: Math.max(10, (summon.radius || 16) * 0.5)
  });
  const footAngle = angle + side * 0.18;
  const footX = knee.x + Math.cos(footAngle) * tarsusLength;
  const footY = knee.y + Math.sin(footAngle) * tarsusLength;
  const footRadius = spec.footRadius ?? Math.max(5, (summon.radius || 16) * 0.32);
  const foot = createSummonPoint(footX, footY, summon, {
    mass: (summon.radius || 16) * 0.035,
    terrainRadius: footRadius,
    groundFriction: spec.footFriction ?? 48,
    maxStepUp: Math.max(8, footRadius * 1.4)
  });
  foot.gravityScale = 1.1;
  summon.points.push(hip, knee, foot);
  world.points.push(hip, knee, foot);
  attachSummonConstraint(world, summon, anchor, hip, thighLength, legStiff);
  attachSummonConstraint(world, summon, hip, knee, shinLength, legStiff * 0.92);
  attachSummonConstraint(world, summon, knee, foot, tarsusLength, legStiff * 0.9);
  attachSummonConstraint(world, summon, anchor, knee, thighLength + shinLength * 0.8, legStiff * 0.6);
  attachSummonConstraint(world, summon, hip, foot, shinLength + tarsusLength, legStiff * 0.5);
  if(summon.core){
    const coreDist = Math.hypot(summon.core.x - foot.x, summon.core.y - foot.y);
    attachSummonConstraint(world, summon, summon.core, foot, coreDist, legStiff * 0.42);
  }
  return {
    anchor,
    hip,
    knee,
    foot,
    side,
    baseAngle: angle,
    thighRest: thighLength,
    shinRest: shinLength,
    tarsusRest: tarsusLength
  };
}

function animateSpiderLegs(summon, step, movementSpeed){
  if(!summon || !Array.isArray(summon.legs) || summon.legs.length === 0) return;
  const legs = summon.legs.filter(Boolean);
  if(!legs.length) return;
  const speed = Number.isFinite(movementSpeed) ? Math.max(0, movementSpeed) : 0;
  const baseRate = 4 + Math.min(8, speed / Math.max(1, summon.speed || 1) * 6);
  summon.legPhase = (summon.legPhase || 0) + baseRate * step;
  const amplitude = Math.max(4, (summon.radius || 16) * 0.3);
  let index = 0;
  for(const leg of legs){
    if(!leg || !leg.hip || !leg.knee || !leg.foot || !leg.anchor) continue;
    const side = leg.side || 1;
    const phase = summon.legPhase + index * Math.PI * 0.5;
    const sway = Math.cos(phase) * amplitude * 0.45 * side;
    const lift = Math.sin(phase) * amplitude;
    const hipTargetX = leg.anchor.x + Math.cos(leg.baseAngle) * leg.thighRest * 0.85 + sway;
    const hipTargetY = leg.anchor.y + Math.sin(leg.baseAngle) * leg.thighRest * 0.85 - lift * 0.2;
    if(typeof leg.hip.updatePoseTarget === 'function') leg.hip.updatePoseTarget(hipTargetX, hipTargetY, 0.9);
    if(typeof leg.hip.settlePose === 'function') leg.hip.settlePose(0.5);
    const kneeAngle = leg.baseAngle + side * 0.32;
    const kneeTargetX = hipTargetX + Math.cos(kneeAngle) * leg.shinRest + sway * 0.15;
    const kneeTargetY = hipTargetY + Math.sin(kneeAngle) * leg.shinRest - lift * 0.25;
    if(typeof leg.knee.updatePoseTarget === 'function') leg.knee.updatePoseTarget(kneeTargetX, kneeTargetY, 0.85);
    if(typeof leg.knee.settlePose === 'function') leg.knee.settlePose(0.5);
    const footAngle = leg.baseAngle + side * 0.18;
    const footTargetX = kneeTargetX + Math.cos(footAngle) * leg.tarsusRest + sway * 0.4;
    const footTargetY = kneeTargetY + Math.sin(footAngle) * leg.tarsusRest + Math.max(0, lift * 0.6);
    if(typeof leg.foot.updatePoseTarget === 'function') leg.foot.updatePoseTarget(footTargetX, footTargetY, 0.9);
    if(typeof leg.foot.settlePose === 'function') leg.foot.settlePose(0.45);
    index++;
  }
}

function computeSummonCenter(summon){
  if(!summon) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for(const p of summon.outer || []){
    if(!p) continue;
    sumX += p.x;
    sumY += p.y;
    count++;
  }
  if(count <= 0 && summon.core){
    return { x: summon.core.x, y: summon.core.y };
  }
  if(count <= 0) return { x: 0, y: 0 };
  return { x: sumX / count, y: sumY / count };
}

function summonCollisionRadius(summon){
  if(!summon) return 0;
  const base = Number.isFinite(summon.radius) ? summon.radius : 16;
  return Math.max(4, base * 0.85);
}

function shiftSummonPoints(summon, dx, dy){
  if(!summon) return;
  const offsetX = Number.isFinite(dx) ? dx : 0;
  const offsetY = Number.isFinite(dy) ? dy : 0;
  if(offsetX === 0 && offsetY === 0) return;
  for(const point of summon.points || []){
    if(!point) continue;
    point.x += offsetX;
    point.y += offsetY;
    if(Number.isFinite(point.prevX)) point.prevX += offsetX;
    if(Number.isFinite(point.prevY)) point.prevY += offsetY;
  }
}

function summonFindAxisClearPosition(world, start, end, fixed, radius, options, axis){
  let low = 0;
  let high = 1;
  let safe = start;
  for(let i=0;i<6;i++){
    const mid = (low + high) * 0.5;
    const candidate = start + (end - start) * mid;
    const left = axis === 'x' ? candidate - radius : fixed - radius;
    const right = axis === 'x' ? candidate + radius : fixed + radius;
    const top = axis === 'y' ? candidate - radius : fixed - radius;
    const bottom = axis === 'y' ? candidate + radius : fixed + radius;
    const blocked = terrainSolidInBox(world, left, right, top, bottom, options);
    if(blocked){
      high = mid;
    }else{
      safe = candidate;
      low = mid;
    }
  }
  return safe;
}

function clampSummonVelocityAgainstTerrain(summon, center, step){
  if(!summon || !center || !summon.world || step <= 0) return;
  if(typeof terrainSolidInBox !== 'function') return;
  const world = summon.world;
  const radius = summonCollisionRadius(summon);
  if(radius <= 0) return;
  const options = { ignoreGroundRow: true };
  let vx = Number.isFinite(summon.vx) ? summon.vx : 0;
  let vy = Number.isFinite(summon.vy) ? summon.vy : 0;
  if(vx){
    const nextX = center.x + vx * step;
    const blocked = terrainSolidInBox(world, nextX - radius, nextX + radius, center.y - radius, center.y + radius, options);
    if(blocked){
      const safeX = summonFindAxisClearPosition(world, center.x, nextX, center.y, radius, options, 'x');
      const delta = safeX - center.x;
      vx = delta / step;
      if(Math.sign(vx) !== Math.sign(delta) || Math.abs(delta) < 1e-3) vx = 0;
      summon.vx = vx;
    }
  }
  if(vy){
    const nextY = center.y + vy * step;
    const blocked = terrainSolidInBox(world, center.x - radius, center.x + radius, nextY - radius, nextY + radius, options);
    if(blocked){
      const safeY = summonFindAxisClearPosition(world, center.y, nextY, center.x, radius, options, 'y');
      const delta = safeY - center.y;
      let newVy = delta / step;
      if(Math.abs(delta) < 1e-3){
        newVy = 0;
      }else if(Math.sign(newVy) !== Math.sign(delta)){
        newVy = 0;
      }
      const bounce = Number.isFinite(summon.bounce) ? Math.max(0, summon.bounce) : 0.35;
      if(vy > 0 && delta < 0) newVy = -Math.abs(vy) * bounce;
      if(vy < 0 && delta > 0) newVy = Math.abs(vy) * bounce;
      summon.vy = newVy;
      vy = newVy;
    }
  }
}

function summonProbeDirection(world, center, radius, dir, stepSize, options){
  const maxDistance = Math.max(radius * 2, stepSize * 6);
  let distance = 0;
  while(distance <= maxDistance){
    distance += stepSize * 0.5;
    const testX = center.x + dir.x * distance;
    const testY = center.y + dir.y * distance;
    const blocked = terrainSolidInBox(world, testX - radius, testX + radius, testY - radius, testY + radius, options);
    if(!blocked){
      return { dx: dir.x * distance, dy: dir.y * distance, distance };
    }
  }
  return null;
}

function resolveSummonTerrainPenetration(summon, center){
  if(!summon || !center || !summon.world) return center;
  if(typeof terrainSolidInBox !== 'function') return center;
  const world = summon.world;
  const radius = summonCollisionRadius(summon);
  if(radius <= 0) return center;
  const options = { ignoreGroundRow: true };
  const blocked = terrainSolidInBox(world, center.x - radius, center.x + radius, center.y - radius, center.y + radius, options);
  if(!blocked) return center;
  const tileSize = world.terrainCells?.tileSize || 30;
  const directions = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 }
  ];
  let best = null;
  for(const dir of directions){
    const result = summonProbeDirection(world, center, radius, dir, tileSize, options);
    if(!result) continue;
    if(!best || result.distance < best.distance){
      best = result;
    }
  }
  if(best){
    shiftSummonPoints(summon, best.dx, best.dy);
    if(Math.abs(best.dx) > 1e-3) summon.vx = 0;
    if(Math.abs(best.dy) > 1e-3) summon.vy = 0;
    return { x: center.x + best.dx, y: center.y + best.dy };
  }
  return center;
}

function findSummonTarget(summon){
  const world = summon?.world;
  if(!world) return null;
  const owner = summon.owner;
  if(summon.lockedTarget && summon.lockedTarget.dead) summon.lockedTarget = null;
  const ignoreAim = !!summon.ignoreSummonerAim;
  const weapon = typeof owner?.weapon === 'function' ? owner.weapon() : null;
  const tolerance = (!ignoreAim && weapon && weapon.summonAimAssistRadius !== undefined)
    ? weapon.summonAimAssistRadius
    : null;
  const aimPoint = (!ignoreAim && owner)
    ? summonAimPointFromOpts(owner, { aim: world.input?.aim })
    : null;
  if(aimPoint && summon.lockedTarget && owner && world.selected === owner){
    const lockedCenter = typeof summon.lockedTarget.center === 'function' ? summon.lockedTarget.center() : null;
    if(lockedCenter){
      const releaseRadius = Math.max(60, (tolerance || 160) * 0.9);
      const dx = lockedCenter.x - aimPoint.x;
      const dy = lockedCenter.y - aimPoint.y;
      if(Math.hypot(dx, dy) > releaseRadius){
        summon.lockedTarget = null;
      }
    }
  }
  const aimed = aimPoint ? summonerAimTarget(owner, aimPoint, tolerance) : null;
  if(aimed){
    summon.lockedTarget = aimed;
    return aimed;
  }
  if(summon.lockedTarget && !summon.lockedTarget.dead){
    return summon.lockedTarget;
  }
  const center = computeSummonCenter(summon);
  const forwardOnly = !!summon.forwardOnly;
  const marchDir = forwardOnly
    ? (summon.autoMarchDir !== undefined ? (summon.autoMarchDir >= 0 ? 1 : -1) : (owner?.dir >= 0 ? 1 : -1))
    : 0;
  const forwardSlack = Number.isFinite(summon.forwardSlack)
    ? summon.forwardSlack
    : (summon.radius || 16);
  let best = null;
  let bestDist = Infinity;
  for(const stick of world.sticks){
    if(!stick || stick.dead) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    const point = typeof stick.center === 'function' ? stick.center() : null;
    if(!point) continue;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    if(forwardOnly && marchDir){
      const ahead = dx * marchDir;
      if(ahead < -Math.max(12, forwardSlack)) continue;
    }
    const dist = Math.hypot(dx, dy);
    if(dist < bestDist){
      bestDist = dist;
      best = stick;
    }
  }
  return best;
}

function updateScribbleBirdFlight(summon, step, center){
  if(!summon) return;
  const world = summon.world;
  const owner = summon.owner;
  const targetCenter = typeof summon.target?.center === 'function'
    ? summon.target.center()
    : null;
  let destination = targetCenter;
  if(!destination && owner && typeof owner.center === 'function'){
    const anchor = owner.center();
    if(anchor){
      const orbit = summon.flapPhase || 0;
      destination = {
        x: anchor.x + Math.cos(orbit * 0.7) * 48,
        y: anchor.y - 46 + Math.sin(orbit * 0.9) * 12
      };
    }
  }
  const maxSpeed = summon.maxSpeed !== undefined ? summon.maxSpeed : summon.speed || 560;
  const turnRate = summon.turnRate !== undefined ? summon.turnRate : 9;
  const seekForce = summon.seekForce !== undefined ? summon.seekForce : 1400;
  const drag = summon.drag !== undefined ? summon.drag : 0.22;
  if(!Number.isFinite(summon.vx)) summon.vx = 0;
  if(!Number.isFinite(summon.vy)) summon.vy = 0;
  if(destination){
    const dx = destination.x - center.x;
    const dy = destination.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desiredVx = (dx / dist) * maxSpeed;
    const desiredVy = (dy / dist) * maxSpeed;
    const factor = clamp(turnRate * step, 0, 1);
    summon.vx += (desiredVx - summon.vx) * factor;
    summon.vy += (desiredVy - summon.vy) * factor;
    if(dist > 0){
      const accel = seekForce * step;
      summon.vx += (dx / dist) * accel * 0.28;
      summon.vy += (dy / dist) * accel * 0.28;
    }
    summon.facing = dx >= 0 ? 1 : -1;
  }else{
    const decay = clamp(1 - drag * step, 0.55, 1);
    summon.vx *= decay;
    summon.vy *= decay;
  }
  const flap = Math.sin(summon.flapPhase || 0);
  if(flap < -0.05){
    const hasVelocity = Number.isFinite(summon.vx) && Number.isFinite(summon.vy)
      && (Math.abs(summon.vx) > 1 || Math.abs(summon.vy) > 1);
    const fallbackAngle = destination
      ? Math.atan2(destination.y - center.y, destination.x - center.x)
      : 0;
    const angle = hasVelocity
      ? Math.atan2(summon.vy, summon.vx)
      : fallbackAngle;
    const boost = (summon.flapBoost !== undefined ? summon.flapBoost : 260) * (-flap) * step;
    if(Number.isFinite(angle)){
      summon.vx += Math.cos(angle) * boost;
      summon.vy += Math.sin(angle) * boost;
    }
    const lift = summon.liftBoost !== undefined ? summon.liftBoost : 80;
    summon.vy -= Math.abs(flap) * lift * step;
  }
  const speed = Math.hypot(summon.vx, summon.vy);
  if(speed > maxSpeed && maxSpeed > 0){
    const scale = maxSpeed / speed;
    summon.vx *= scale;
    summon.vy *= scale;
  }
  if(world && typeof groundHeightAt === 'function'){
    const radius = summon.radius || 16;
    const sampleY = center.y + radius * 0.8;
    const ground = groundHeightAt(world, center.x, { referenceY: sampleY, surface: 'top' });
    if(sampleY > ground){
      const offset = sampleY - ground;
      for(const point of summon.points){
        if(!point) continue;
        point.y -= offset;
        point.prevY -= offset;
        if(point.vy > 0) point.vy = Math.min(point.vy, 0);
      }
      if(summon.vy > 0) summon.vy = Math.min(summon.vy, 0);
    }
  }
  const collisionCenter = computeSummonCenter(summon);
  clampSummonVelocityAgainstTerrain(summon, collisionCenter, step);
  const blend = clamp(step * 9, 0, 1);
  for(const point of summon.points){
    if(!point) continue;
    point.gravityScale = 0;
    point.vx += (summon.vx - point.vx) * blend;
    point.vy += (summon.vy - point.vy) * blend;
    point.addForce((summon.vx - point.vx) * 120, (summon.vy - point.vy) * 120);
  }
}

function updateBeeSummonFlight(summon, step, center){
  if(!summon) return;
  const world = summon.world;
  const owner = summon.owner;
  const targetCenter = typeof summon.target?.center === 'function'
    ? summon.target.center()
    : null;
  let destination = targetCenter;
  if(!destination && owner && typeof owner.center === 'function'){
    destination = owner.center();
  }
  const maxSpeed = summon.maxSpeed !== undefined ? summon.maxSpeed : summon.speed || 680;
  const turnRate = summon.turnRate !== undefined ? summon.turnRate : 10;
  const seekForce = summon.seekForce !== undefined ? summon.seekForce : 1600;
  const drag = summon.drag !== undefined ? summon.drag : 0.2;
  if(!Number.isFinite(summon.vx)) summon.vx = 0;
  if(!Number.isFinite(summon.vy)) summon.vy = 0;
  if(destination){
    const dx = destination.x - center.x;
    const dy = destination.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desiredVx = (dx / dist) * maxSpeed;
    const desiredVy = (dy / dist) * maxSpeed;
    const factor = clamp(turnRate * step, 0, 1);
    summon.vx += (desiredVx - summon.vx) * factor;
    summon.vy += (desiredVy - summon.vy) * factor;
    if(dist > 0){
      const accel = seekForce * step;
      summon.vx += (dx / dist) * accel * 0.3;
      summon.vy += (dy / dist) * accel * 0.3;
    }
  }else{
    const decay = clamp(1 - drag * step, 0.5, 1);
    summon.vx *= decay;
    summon.vy *= decay;
  }
  const speed = Math.hypot(summon.vx, summon.vy);
  if(speed > maxSpeed && maxSpeed > 0){
    const scale = maxSpeed / speed;
    summon.vx *= scale;
    summon.vy *= scale;
  }
  summon.facing = summon.vx >= 0 ? 1 : -1;
  summon.wingPhase = (summon.wingPhase || 0) + step * 18;
  if(world && typeof groundHeightAt === 'function'){
    const radius = summon.radius || 10;
    const sampleY = center.y + radius * 0.9;
    const ground = groundHeightAt(world, center.x, { referenceY: sampleY, surface: 'top' });
    if(sampleY > ground){
      const offset = sampleY - ground;
      for(const point of summon.points){
        if(!point) continue;
        point.y -= offset;
        point.prevY -= offset;
        point.vy = Math.min(point.vy, 0);
      }
      summon.vy = -Math.abs(summon.vy) * (summon.bounce !== undefined ? summon.bounce : 0.78);
      summon.vx *= 0.9;
    }
    const ceiling = world?.ceilingY;
    if(Number.isFinite(ceiling) && center.y - radius < ceiling){
      const offset = ceiling - (center.y - radius);
      for(const point of summon.points){
        if(!point) continue;
        point.y += offset;
        point.prevY += offset;
        point.vy = Math.max(point.vy, 0);
      }
      summon.vy = Math.abs(summon.vy) * (summon.bounce !== undefined ? summon.bounce : 0.78);
    }
  }
  const collisionCenter = computeSummonCenter(summon);
  clampSummonVelocityAgainstTerrain(summon, collisionCenter, step);
  const blend = clamp(step * 11, 0, 1);
  for(const point of summon.points){
    if(!point) continue;
    point.gravityScale = 0;
    point.vx += (summon.vx - point.vx) * blend;
    point.vy += (summon.vy - point.vy) * blend;
    point.addForce((summon.vx - point.vx) * 140, (summon.vy - point.vy) * 140);
  }
}

function updateSummonedUnits(world, dt){
  ensureSummonCollections(world);
  if(!Array.isArray(world.summons) || world.summons.length === 0) return;
  const step = Math.max(0, dt || 0);
  for(const summon of world.summons){
    if(!summon) continue;
    summon.jumpCooldown = Math.max(0, summon.jumpCooldown - step);
    if(!summon.owner || summon.owner.dead){
      summon.fade = Math.min(1, summon.fade + step * 2.4);
      continue;
    }
    summon.target = findSummonTarget(summon) || summon.target || null;
    const center = computeSummonCenter(summon);
    const prevCenter = summon._lastCenter || center;
    if(summon.shape === 'scribbleBird'){
      updateScribbleBirdFlight(summon, step, center);
      summon.flapPhase = (summon.flapPhase || 0) + step * 8.5;
      summon._lastCenter = center;
      continue;
    }
    if(summon.shape === 'beeDrone'){
      updateBeeSummonFlight(summon, step, center);
      summon._lastCenter = center;
      continue;
    }
    const outerPoints = summon.outer || [];
    const legList = Array.isArray(summon.legs) ? summon.legs.filter(Boolean) : null;
    const locomotionPoints = legList
      ? outerPoints.concat(legList.map(leg => leg && leg.hip).filter(Boolean))
      : outerPoints;
    const contactPoints = legList
      ? outerPoints.concat(legList.map(leg => leg && leg.foot).filter(Boolean))
      : outerPoints;
    const hasMarch = summon.autoMarchDir !== undefined && summon.autoMarchDir !== null;
    const marchDir = hasMarch ? (summon.autoMarchDir >= 0 ? 1 : -1) : 0;
    if(!summon.climbStall) summon.climbStall = 0;
    else summon.climbStall = Math.max(0, summon.climbStall - step * 0.55);
    if(summon.target && summon.target.dead) summon.target = null;
    if(!summon.target){
      if(hasMarch){
        const marchForce = Number.isFinite(summon.marchForce) ? summon.marchForce : (summon.speed || 400);
        for(const point of locomotionPoints){
          if(!point) continue;
          point.addForce(marchDir * marchForce, 0);
        }
        const grounded = contactPoints.some(p=>p && p.grounded);
        const horizontalProgress = Math.abs(center.x - prevCenter.x);
        const stallThreshold = Math.max(4, (summon.radius || 16) * 0.35);
        const huggingWall = contactPoints.some(p=>p && !p.grounded && p.preGroundContact);
        const needsHop = horizontalProgress < stallThreshold || huggingWall;
        if(grounded && needsHop && summon.jumpCooldown <= 0 && Number.isFinite(summon.marchHopForce) && summon.marchHopForce > 0){
          const hop = summon.marchHopForce;
          for(const point of contactPoints){
            if(!point) continue;
            point.vy = Math.min(point.vy, -hop * 0.32);
            point.addForce(marchDir * marchForce * 0.18, -hop);
          }
          const hopCooldown = Number.isFinite(summon.marchHopCooldown) ? summon.marchHopCooldown : 0.32;
          summon.jumpCooldown = Math.max(0.22, Math.min(0.5, hopCooldown));
        }else if(!grounded){
          const lift = Number.isFinite(summon.marchLift) ? summon.marchLift : summon.climbLift;
          if(Number.isFinite(lift) && lift > 0){
            for(const point of locomotionPoints){
              if(!point) continue;
              point.addForce(0, -lift * 0.4);
            }
          }
        }
        summon._lastCenter = center;
        continue;
      }else{
        for(const p of summon.points){
          if(!p) continue;
          p.addForce((summon.owner.dir >= 0 ? 1 : -1) * 20, -120 * step);
        }
        summon._lastCenter = center;
        continue;
      }
    }
    const targetCenter = typeof summon.target.center === 'function' ? summon.target.center() : null;
    if(!targetCenter) continue;
    const pathDestination = summonResolvePathDestination(summon, center, targetCenter, step);
    const moveTarget = pathDestination || targetCenter;
    const dx = moveTarget.x - center.x;
    const dy = moveTarget.y - center.y;
    const actualDx = targetCenter.x - center.x;
    const actualDy = targetCenter.y - center.y;
    const horizontalDir = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const desiredSpeed = summon.speed || 420;
    const radius = summon.radius || 16;
    const verticalChase = actualDy < -Math.max(12, radius * 0.45);
    const horizontalSeparation = Math.abs(actualDx);
    const horizontalProgress = Math.abs(center.x - prevCenter.x);
    const verticalProgress = Math.max(0, prevCenter.y - center.y);
    if(verticalChase && horizontalSeparation < radius * 2 && verticalProgress < Math.max(2, radius * 0.25) && horizontalProgress < Math.max(4, radius * 0.35)){
      summon.climbStall = Math.min(1.2, (summon.climbStall || 0) + step * 1.4);
    }
    for(const point of locomotionPoints){
      if(!point) continue;
      point.addForce(horizontalDir * desiredSpeed * 0.9, 0);
    }
    const anyGrounded = contactPoints.some(p=>p && p.grounded);
    const huggingWall = contactPoints.some(p=>p && !p.grounded && p.preGroundContact);
    const closeHorizontal = horizontalSeparation < radius * 1.4;
    const needsClimbAssist = verticalChase && (huggingWall || (summon.climbStall || 0) > 0.25);
    if(summon.rolling && horizontalDir && anyGrounded){
      const rollStrength = Number.isFinite(summon.rollStrength) ? summon.rollStrength : 0.5;
      const torque = horizontalDir * rollStrength * desiredSpeed;
      for(const point of outerPoints){
        if(!point) continue;
        const offsetX = point.x - center.x;
        const offsetY = point.y - center.y;
        point.addForce(-offsetY * torque * 0.02, offsetX * torque * 0.02);
      }
    }
    if((anyGrounded || (huggingWall && needsClimbAssist)) && summon.jumpCooldown <= 0){
      if(verticalChase || closeHorizontal || (summon.climbStall || 0) > 0.45){
        const lift = summon.jumpStrength || 860;
        for(const point of contactPoints){
          if(!point) continue;
          point.vy = Math.min(point.vy, -lift * 0.35);
          point.addForce(horizontalDir * desiredSpeed * 0.2, -lift);
        }
        summon.jumpCooldown = 0.36;
        summon.climbStall = Math.max(0, (summon.climbStall || 0) - 0.2);
      }
    }
    if(!anyGrounded && dy < -40){
      for(const point of locomotionPoints){
        if(!point) continue;
        point.addForce(0, -(summon.climbLift || 640) * 0.6);
      }
    }
    if(!anyGrounded && needsClimbAssist){
      const lift = summon.climbLift || 640;
      for(const point of locomotionPoints){
        if(!point) continue;
        point.vy = Math.min(point.vy, -lift * 0.25);
        point.addForce(horizontalDir * desiredSpeed * 0.35, -lift);
      }
    }
    if(summon.shape === 'scribbleBird'){
      summon.flapPhase = (summon.flapPhase || 0) + step * 8;
    }
    if(summon.shape === 'spider'){
      const travel = Math.hypot(center.x - prevCenter.x, center.y - prevCenter.y);
      const velocity = step > 0 ? travel / step : 0;
      animateSpiderLegs(summon, step, velocity);
    }
    summon.spin += step * 4;
    summon._lastCenter = center;
  }
}

function finalizeSummonedUnits(world, dt){
  ensureSummonCollections(world);
  if(!Array.isArray(world.summons) || world.summons.length === 0) return;
  const now = nowMs();
  for(let i=world.summons.length-1;i>=0;i--){
    const summon = world.summons[i];
    if(!summon) continue;
    const lifetime = now - (summon.born || now);
    if(lifetime >= summon.lifetimeMs){
      destroySummon(world, summon);
      continue;
    }
    if(!summon.owner || summon.owner.dead){
      summon.fade = Math.min(1, summon.fade + dt * 2.2);
      if(summon.fade >= 1){
        destroySummon(world, summon);
      }
      continue;
    }
    let center = computeSummonCenter(summon);
    center = resolveSummonTerrainPenetration(summon, center);
    let collided = false;
    for(const stick of world.sticks){
      if(!stick || stick.dead) continue;
      if(stick === summon.owner) continue;
      if(summon.owner && stick.isEnemy === summon.owner.isEnemy) continue;
      const targetCenter = typeof stick.center === 'function' ? stick.center() : null;
      if(!targetCenter) continue;
      const dx = targetCenter.x - center.x;
      const dy = targetCenter.y - center.y;
      const dist = Math.hypot(dx, dy);
      const reach = summon.radius + 26;
      if(dist > reach) continue;
      stick.takeDamage(summon.kamikazeDamage, Math.sign(dx) * (summon.knockScale || 1), -0.8, summon.owner, {
        element: summon.element || (summon.owner && summon.owner.element) || 'physical'
      });
      summon._registeredHit = true;
      collided = true;
      if(!summon.hitTargets){
        summon.hitTargets = typeof Set === 'function' ? new Set() : [];
      }
      const record = summon.hitTargets;
      let firstTimeHit = false;
      if(record && typeof record.has === 'function' && typeof record.add === 'function'){
        firstTimeHit = !record.has(stick);
        if(firstTimeHit) record.add(stick);
      }else if(Array.isArray(record)){
        firstTimeHit = record.indexOf(stick) === -1;
        if(firstTimeHit) record.push(stick);
      }else{
        summon.hitTargets = [stick];
        firstTimeHit = true;
      }
      if(firstTimeHit && summon.owner && !summon.owner.isEnemy && typeof summon.owner.addXp === 'function'){
        summon.owner.addXp(6);
      }
      const canMultiHit = !!summon.guardian || !!summon.multiHit;
      if(canMultiHit){
        summon.charges = Math.max(0, (summon.charges ?? 1) - 1);
        if(summon.charges <= 0){
          break;
        }
      }else{
        break;
      }
    }
    if(collided){
      const destroy = summon.explodeOnImpact
        || (!summon.guardian && !summon.multiHit)
        || (summon.charges ?? 0) <= 0;
      const burstRadius = summon.radius * (summon.hitBurstScale || (destroy ? 1 : 0.8));
      if(destroy){
        spawnSummonBurst(world, center.x, center.y, summon.color || '#d9f5ff', burstRadius);
        destroySummon(world, summon);
        continue;
      }else{
        spawnSummonBurst(world, center.x, center.y, summon.color || '#d9f5ff', burstRadius);
      }
    }
  }
}

function spawnSummonBurst(world, x, y, color, radius){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const count = 8;
  for(let i=0;i<count;i++){
    const angle = (i / count) * TAU;
    const speed = rand ? rand(140, 320) : 200;
    const particle = {
      type: 'soulSpark',
      style: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rand ? rand(320, 520) : 420,
      color: color || 'rgba(210,235,255,0.85)',
      radius: radius ? radius * 0.2 : 6,
      gravityScale: 0.2
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'spark');
    world.particles.push(particle);
  }
}

function destroySummon(world, summon){
  if(!world || !summon) return;
  if(summon._destroyed) return;
  summon._destroyed = true;
  const owner = summon.owner || null;
  if(Array.isArray(summon.constraints)){
    for(const constraint of summon.constraints){
      const idx = world.constraints.indexOf(constraint);
      if(idx >= 0) world.constraints.splice(idx, 1);
    }
  }
  if(Array.isArray(summon.points)){
    for(const point of summon.points){
      const idx = world.points.indexOf(point);
      if(idx >= 0) world.points.splice(idx, 1);
    }
  }
  const index = world.summons.indexOf(summon);
  if(index >= 0) world.summons.splice(index, 1);
  releaseSummonerSlot(summon);
  summon.owner = null;
  summon.world = null;
  if(owner && owner.summonerState){
    owner.summonerState = resolveSummonerStateTarget(owner);
  }
}

function notifySummonerSoulHarvest(victim, source){
  if(!victim || !victim.world) return;
  const world = victim.world;
  ensureSummonCollections(world);
  const center = typeof victim.center === 'function' ? victim.center() : { x: victim.pointsByName?.pelvis?.x || 0, y: victim.pointsByName?.pelvis?.y || 0 };
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const now = nowMs();
  for(const stick of sticks){
    if(!stick || stick.dead || stick.isEnemy) continue;
    const weapon = typeof stick.weapon === 'function' ? stick.weapon() : null;
    if(!weapon || weapon.kind !== 'summoner') continue;
    if(typeof stick._ensureSummonerState === 'function') stick._ensureSummonerState();
    const pos = typeof stick.center === 'function' ? stick.center() : null;
    if(!pos) continue;
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const dist = Math.hypot(dx, dy);
    const radius = weapon.soulRange ?? SUMMONER_SOUL_PICKUP_RADIUS;
    if(dist > radius) continue;
    const orb = {
      x: center.x + (rand ? rand(-12, 12) : 0),
      y: center.y + (rand ? rand(-12, 12) : 0),
      vx: rand ? rand(-30, 30) : 0,
      vy: rand ? rand(-60, -30) : -48,
      born: now,
      phase: 'rise',
      delay: 0.18,
      target: stick,
      color: weapon.soulColor || '#dcd0ff',
      value: 1,
      alpha: 0.6
    };
    world.soulOrbs.push(orb);
  }
}

function updateSoulOrbs(world, dt){
  ensureSummonCollections(world);
  if(!Array.isArray(world.soulOrbs) || world.soulOrbs.length === 0) return;
  const step = Math.max(0, dt || 0);
  const now = nowMs();
  for(let i=world.soulOrbs.length-1;i>=0;i--){
    const orb = world.soulOrbs[i];
    const target = orb?.target;
    const targetWeapon = target && typeof target.weapon === 'function' ? target.weapon() : null;
    const validTarget = target && !target.dead && targetWeapon && targetWeapon.kind === 'summoner';
    if(!validTarget){
      if(orb.phase !== 'fade'){ orb.phase = 'fade'; orb.fadeStart = now; }
    }
    if(orb.phase === 'rise'){
      orb.y += orb.vy * step;
      orb.x += orb.vx * step;
      orb.alpha = clamp((now - orb.born) / 320, 0.2, 0.9);
      orb.delay -= step;
      if(orb.delay <= 0){
        orb.phase = 'seek';
      }
    }else if(orb.phase === 'seek'){
      if(!validTarget){
        orb.phase = 'fade';
      }else{
        const anchor = summonerOrbAnchor(target);
        const dx = anchor.x - orb.x;
        const dy = anchor.y - orb.y;
        const dist = Math.hypot(dx, dy);
        const speed = 360;
        if(dist < 14){
          bindSoulOrbToSummoner(orb, target);
        }else{
          const stepDist = Math.min(dist, speed * step);
          if(dist > 0){
            const inv = stepDist / dist;
            orb.x += dx * inv;
            orb.y += dy * inv;
          }
          orb.alpha = clamp(orb.alpha + step * 1.6, 0, 1);
        }
      }
    }else if(orb.phase === 'float'){
      if(!validTarget){
        orb.phase = 'fade';
      }else{
        updateBoundSoulOrb(orb, target, step);
      }
    }else if(orb.phase === 'consume'){
      const duration = orb.consumeDuration || 0.4;
      const progress = clamp((now - (orb.consumeStart || now)) / duration, 0, 1);
      orb.alpha = clamp(1 - progress, 0, 1);
      orb.scale = 1 - progress * 0.6;
      if(progress >= 1){
        removeSoulOrb(world, orb);
        continue;
      }
    }else if(orb.phase === 'fade'){
      const elapsed = (now - (orb.fadeStart || now)) / 420;
      const progress = clamp(elapsed, 0, 1);
      orb.alpha = clamp(1 - progress, 0, 1);
      orb.y -= 12 * step;
      if(progress >= 1){
        removeSoulOrb(world, orb);
        continue;
      }
    }
  }
}

function summonerBookAnchor(stick){
  if(!stick || typeof stick.weapon !== 'function') return null;
  const weapon = stick.weapon();
  if(!weapon || weapon.kind !== 'summoner') return null;
  const handName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const hand = stick.pointsByName?.[handName];
  if(!hand) return null;
  const elbowName = handName === 'handR' ? 'elbowR' : 'elbowL';
  const elbow = stick.pointsByName?.[elbowName];
  const angle = elbow ? Math.atan2(hand.y - elbow.y, hand.x - elbow.x) : (stick.dir >= 0 ? -Math.PI / 2 : -Math.PI / 2);
  const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
  const bookHeight = 24 * scale;
  const forwardOffset = ((weapon.bookForward ?? 28) * 0.12) * scale;
  const upX = Math.cos(angle - Math.PI / 2);
  const upY = Math.sin(angle - Math.PI / 2);
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  return {
    x: hand.x + upX * (-bookHeight * 0.5) + forwardX * forwardOffset,
    y: hand.y + upY * (-bookHeight * 0.5) + forwardY * forwardOffset
  };
}

function summonerOrbAnchor(stick){
  const anchor = summonerBookAnchor(stick);
  if(anchor) return anchor;
  const head = stick?.pointsByName?.head;
  if(head){
    return { x: head.x, y: head.y - (SUMMONER_SOUL_FLOAT_HEIGHT * 0.6) };
  }
  const center = typeof stick.center === 'function' ? stick.center() : { x: 0, y: 0 };
  return { x: center.x, y: center.y - SUMMONER_SOUL_FLOAT_HEIGHT };
}

function bindSoulOrbToSummoner(orb, stick){
  const state = typeof stick._ensureSummonerState === 'function'
    ? stick._ensureSummonerState()
    : (stick.summonerState || null);
  if(!state) return;
  orb.phase = 'float';
  orb.target = stick;
  orb.alpha = 1;
  orb.scale = 0.7;
  if(!Array.isArray(state.boundOrbs)) state.boundOrbs = [];
  state.boundOrbs.push(orb);
  const weapon = typeof stick.weapon === 'function' ? stick.weapon() : null;
  const maxSouls = weapon && weapon.maxSouls !== undefined ? weapon.maxSouls : SUMMONER_MAX_SOULS_DEFAULT;
  state.soulCount = clamp((state.soulCount || 0) + (orb.value || 1), 0, maxSouls);
}

function updateBoundSoulOrb(orb, stick, dt){
  const state = stick?.summonerState || null;
  if(state){
    state.orbitPhase = (state.orbitPhase || 0) + dt * 2.4;
  }
  const orbs = state?.boundOrbs || [];
  const index = Math.max(0, orbs.indexOf(orb));
  const anchor = summonerOrbAnchor(stick);
  const orbitPhase = state?.orbitPhase || 0;
  const baseAngle = orbitPhase + index * 0.9;
  const ringRadius = 8 + index * 2.6;
  const vertical = 4 + index * 1.8;
  const sway = Math.sin(orbitPhase * 2.1 + index) * (1 + index * 0.2);
  orb.x = anchor.x + Math.cos(baseAngle) * ringRadius + Math.cos(orbitPhase * 3 + index * 1.3) * 0.8;
  orb.y = anchor.y + Math.sin(baseAngle) * vertical - index * 1.4 + sway * 0.3;
  orb.scale = 0.6 + Math.sin(orbitPhase * 1.4 + index) * 0.1;
  orb.alpha = 0.9;
}

function removeSoulOrb(world, orb){
  if(!world || !orb) return;
  const idx = world.soulOrbs.indexOf(orb);
  if(idx >= 0) world.soulOrbs.splice(idx, 1);
  const stick = orb.target;
  if(stick && stick.summonerState && Array.isArray(stick.summonerState.boundOrbs)){
    const arr = stick.summonerState.boundOrbs;
    const index = arr.indexOf(orb);
    if(index >= 0) arr.splice(index, 1);
    const value = Number.isFinite(orb?.value) ? orb.value : 1;
    if(stick.summonerState.soulCount !== undefined){
      stick.summonerState.soulCount = Math.max(0, (stick.summonerState.soulCount || 0) - value);
    }
  }
}

function drawSummons(ctx, world){
  if(!ctx || !world) return;
  ensureSummonCollections(world);
  const summons = Array.isArray(world.summons) ? world.summons : [];
  for(const summon of summons){
    if(!summon) continue;
    const center = computeSummonCenter(summon);
    const radius = summon.radius || 16;
    const alpha = clamp(1 - (summon.fade || 0), 0, 1);
    if(alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';
    if(summon.shape === 'scribbleBird'){
      drawScribbleBirdSummon(ctx, summon, center, radius, alpha);
    }else if(summon.shape === 'beeDrone'){
      drawBeeSummon(ctx, summon, center, radius, alpha);
    }else if(summon.shape === 'spider'){
      drawSpiderSummon(ctx, summon, center, radius, alpha);
    }else{
      const gradient = ctx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius);
      const outerColor = summon.color || '#d9f5ff';
      const innerColor = typeof lightenColor === 'function' ? lightenColor(outerColor, 0.25) : '#ffffff';
      gradient.addColorStop(0, `${hexToRgba(innerColor, 0.95)}`);
      gradient.addColorStop(1, `${hexToRgba(outerColor, 0.18)}`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radius, radius, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawSoulOrbs(ctx, world){
  if(!ctx || !world) return;
  ensureSummonCollections(world);
  const orbs = Array.isArray(world.soulOrbs) ? world.soulOrbs : [];
  for(const orb of orbs){
    if(!orb) continue;
    const alpha = clamp(orb.alpha ?? 1, 0, 1);
    if(alpha <= 0.01) continue;
    const scale = orb.scale ?? 1;
    const baseRadius = SUMMONER_SOUL_PARTICLE_RADIUS || 3;
    const radius = Math.max(1.2, baseRadius * scale);
    ctx.save();
    ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(orb.x, orb.y, radius * 0.1, orb.x, orb.y, radius);
    const base = orb.color || '#dcd0ff';
    gradient.addColorStop(0, `${hexToRgba(base, 0.9)}`);
    gradient.addColorStop(1, `${hexToRgba(base, 0.25)}`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(orb.x, orb.y, radius, radius * 1.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function hexToRgba(hex, alpha){
  if(!hex) return `rgba(220,220,255,${alpha ?? 1})`;
  const normalized = typeof safeHex === 'function' ? safeHex(hex) || hex : hex;
  const m = normalized.replace('#', '');
  if(m.length === 3){
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    return `rgba(${r},${g},${b},${alpha ?? 1})`;
  }
  if(m.length >= 6){
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha ?? 1})`;
  }
  return `rgba(220,220,255,${alpha ?? 1})`;
}

function drawScribbleBirdSummon(ctx, summon, center, radius, alpha){
  if(!ctx || !summon || !center) return;
  const flap = Math.sin(summon.flapPhase || 0);
  const scale = Math.max(0.5, radius / 3);
  const span = 5 * scale;
  const height = 4 * scale;
  const maxCharges = Math.max(1, summon.maxCharges || 1);
  const remaining = clamp((summon.charges ?? maxCharges) / maxCharges, 0, 1);
  const stroke = summon.lineColor || '#ffffff';
  const accentBase = summon.accentColor || summon.color || '#cfeeff';
  const accent = typeof lightenColor === 'function'
    ? lightenColor(accentBase, -0.05 + remaining * 0.12)
    : accentBase;
  const lineWidth = Math.max(1.1, radius * (0.18 + remaining * 0.12));
  const facing = (summon.facing ?? 1) >= 0 ? 1 : -1;
  const maxLeanSpeed = Math.max(60, summon.maxSpeed || summon.speed || 600);
  const lean = clamp((summon.vx || 0) / maxLeanSpeed, -0.35, 0.35);
  const baseY = height * (0.5 + flap * 0.05);
  const outerPeakY = -height * (0.55 + flap * 0.28);
  const innerPeakY = -height * (0.5 + flap * 0.22);
  const middleDipY = height * (0.12 - flap * 0.18);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(facing, 1);
  ctx.rotate(lean);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.moveTo(-span * 0.5, baseY);
  ctx.lineTo(-span * 0.25, outerPeakY);
  ctx.lineTo(0, middleDipY);
  ctx.lineTo(span * 0.25, innerPeakY);
  ctx.lineTo(span * 0.5, baseY);
  ctx.stroke();
  if(accent){
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(0.75, lineWidth * 0.55);
    ctx.beginPath();
    const accentDip = height * (0.05 - flap * 0.12);
    ctx.moveTo(-span * 0.2, -height * 0.1);
    ctx.lineTo(0, accentDip);
    ctx.lineTo(span * 0.2, -height * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeeSummon(ctx, summon, center, radius, alpha){
  if(!ctx || !summon || !center) return;
  const angle = Math.atan2(summon.vy || 0, summon.vx || 0);
  const scale = Math.max(0.5, radius / 3);
  const bodySize = 3 * scale;
  const half = bodySize * 0.5;
  const wingPhase = Math.sin(summon.wingPhase || 0);
  const wingLength = bodySize * (0.9 + Math.abs(wingPhase) * 0.45);
  const wingHeight = bodySize * (0.6 + Math.abs(wingPhase) * 0.25);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = summon.bodyColor || '#ffd866';
  ctx.fillRect(-half, -half, bodySize, bodySize);
  const stripe = summon.stripeColor || '#3b2a24';
  ctx.fillStyle = stripe;
  const stripeWidth = Math.max(0.6, bodySize * 0.4);
  ctx.fillRect(-stripeWidth * 0.5, -half, stripeWidth, bodySize);
  ctx.fillRect(half - stripeWidth * 0.9, -half * 0.7, stripeWidth * 0.9, bodySize * 0.7);
  const wingColor = summon.wingColor || 'rgba(255, 255, 255, 0.75)';
  ctx.fillStyle = wingColor;
  ctx.globalAlpha = Math.min(1, alpha * 0.9);
  ctx.beginPath();
  ctx.ellipse(-half - wingLength * 0.25, -wingHeight * 0.5, wingLength * 0.5, wingHeight * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-half - wingLength * 0.25, wingHeight * 0.5, wingLength * 0.5, wingHeight * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha;
  const tip = summon.tipColor || '#2f1f1a';
  ctx.strokeStyle = tip;
  ctx.lineWidth = Math.max(0.6, bodySize * 0.45);
  ctx.beginPath();
  ctx.moveTo(half, 0);
  ctx.lineTo(half + bodySize * 0.45, 0);
  ctx.stroke();
  ctx.restore();
}

function drawSpiderSummon(ctx, summon, center, radius, alpha){
  if(!ctx || !summon || !center) return;
  const legs = Array.isArray(summon.legs) ? summon.legs : [];
  const legColor = summon.legColor || '#3c5b50';
  const accent = summon.accentColor || summon.color || '#d1f1e4';
  ctx.save();
  ctx.lineWidth = Math.max(1.1, radius * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hexToRgba(legColor, Math.min(1, alpha * 0.9));
  for(const leg of legs){
    if(!leg || !leg.anchor || !leg.hip || !leg.knee || !leg.foot) continue;
    ctx.beginPath();
    ctx.moveTo(leg.anchor.x, leg.anchor.y);
    ctx.lineTo(leg.hip.x, leg.hip.y);
    ctx.lineTo(leg.knee.x, leg.knee.y);
    ctx.lineTo(leg.foot.x, leg.foot.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(leg.knee.x, leg.knee.y);
    ctx.lineTo(leg.foot.x, leg.foot.y);
    ctx.stroke();
    ctx.fillStyle = hexToRgba(accent, Math.min(1, alpha * 0.85));
    ctx.beginPath();
    const toeRadius = Math.max(1.2, radius * 0.18);
    ctx.ellipse(leg.foot.x, leg.foot.y, toeRadius, toeRadius * 0.8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  const outerColor = summon.color || '#d1f1e4';
  const innerColor = typeof lightenColor === 'function' ? lightenColor(outerColor, 0.18) : '#ffffff';
  const accentColor = accent || outerColor;
  const gradient = ctx.createRadialGradient(center.x, center.y, radius * 0.25, center.x, center.y, radius);
  gradient.addColorStop(0, `${hexToRgba(innerColor, Math.min(1, alpha * 0.95))}`);
  gradient.addColorStop(1, `${hexToRgba(outerColor, Math.min(1, alpha * 0.28))}`);
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, radius * 1.05, radius * 0.92, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = hexToRgba(accentColor, Math.min(1, alpha * 0.6));
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + radius * 0.12, radius * 0.7, radius * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function lerpAngle(a, b, t){
  let start = Number.isFinite(a) ? a : 0;
  let end = Number.isFinite(b) ? b : 0;
  const amount = clamp(t ?? 0, 0, 1);
  let diff = end - start;
  while(diff < -Math.PI) diff += TAU;
  while(diff > Math.PI) diff -= TAU;
  return start + diff * amount;
}

