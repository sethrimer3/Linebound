// abilities.js

const ABILITY_DEFINITIONS = {
  chainSwing: {
    id: 'chainSwing',
    name: 'Light Line',
    description: 'Unfurl a sunlit tether from the lead hand. A radiant beam lances out to the first solid surface, then condenses into a gleaming lifeline that every stick can swing from.',
    keyHint: 'E',
    iconClass: 'ability-icon-light-line',
    cooldownMs: 1600,
    maxRange: 520,
    minDistance: 64,
    surfaceOffset: 4,
    stiffness: 0.84,
    maxSwingSpeed: 920,
    swingDampingRate: 1.35,
    swingVelocityBlendRate: 16,
    swingRigFollowRate: 9,
    swingAirDragMultiplier: 0,
    swingEnergyLossRate: 0.65,
    swingInputAcceleration: 520,
    swingHorizontalPushAcceleration: 2200,
    swingFootGravityMultiplier: 1.4,
    swingFootFollowMultiplier: 0.55,
    chainLinkLength: 3,
    chainLinkMass: 0.24,
    chainLinkStiffness: 0.94,
    chainLinkAirDragMultiplier: 0.25,
    chainLinkGravityScale: 0.18,
    chainLinkTerrainRadius: 6,
    // Sample the upper surface of blocks so the links rest on top instead of slipping through.
    chainLinkGroundSurface: 'top',
    // Retract the tether a touch more so it stays taut instead of bowing under its own weight.
    chainRestLengthScale: 0.82,
    // Keep the stick's rig slack while swinging so gravity can take over immediately.
    chainSoftMaintainMs: 180,
    chainJointTorqueTarget: 0,
    chainJointTorqueResponsePerSec: 0,
    // Reduce the stick's joint strength while swinging so the rig hangs looser.
    swingRigSlackMultiplier: 0.48,
    maxChainLength: 180,
    // Duration (in ms) to render the initial light beam before settling into the tether.
    beamPhaseMs: 220,
    // Ground friction applied to grounded rig points while the swing is active.
    swingGroundFriction: 1.2,
    releaseGraceMs: 90,
    category: 'active',
    defaultUnlocked: false
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint',
    description: 'Hold Shift to burst forward on land. Moving drains stamina; release to recover before sprinting again.',
    keyHint: 'Shift',
    iconClass: 'ability-icon-sprint',
    category: 'movement',
    defaultUnlocked: false,
    speedMultiplier: 2,
    // Drain the stamina pool to empty in `duration` seconds while sprinting.
    // After sprinting stops, wait `regenDelay` seconds, then refill the pool in `regenDuration` seconds.
    stamina: { duration: 2.6, regenDelay: 0.65, regenDuration: 3.2 }
  },
  swimDash: {
    id: 'swimDash',
    name: 'Power Swim',
    description: 'Hold Shift underwater and press a direction to surge headfirst through the water.',
    keyHint: 'Shift',
    iconClass: 'ability-icon-swim',
    category: 'movement',
    defaultUnlocked: false,
    // Desired swim velocity in units per second.
    swimSpeed: 280,
    // Maximum change in swim velocity per second.
    swimAcceleration: 880
  },
  doubleJump: {
    id: 'doubleJump',
    name: 'Double Jump',
    description: 'Tap jump in midair to launch a second time before landing.',
    keyHint: 'W',
    iconClass: 'ability-icon-double',
    category: 'movement',
    defaultUnlocked: false,
    extraJumps: 1,
    // Scale applied to jump speed when performing the air jump.
    airJumpSpeedScale: 0.9
  },
  grapple: {
    id: 'grapple',
    name: 'Ledge Grapple',
    description: 'Hold jump near a ledge to catch it, hang, and climb when ready.',
    keyHint: 'W',
    iconClass: 'ability-icon-grapple',
    category: 'movement',
    defaultUnlocked: false
  }
};

const TEAM_ABILITIES = {
  chainSwing: ABILITY_DEFINITIONS.chainSwing
};

// Fallback safety limit for the number of physics segments created when
// spawning the shared team chain ability. Large distances can otherwise spawn
// thousands of constraint points and stall the main thread.
const DEFAULT_TEAM_CHAIN_LINK_LIMIT = 180;

function abilityDefinitionById(id){
  if(!id) return null;
  return ABILITY_DEFINITIONS[id] || null;
}

function abilityIds(){
  return Object.keys(ABILITY_DEFINITIONS);
}

function resolveAbilityProfile(target){
  if(!target || typeof target !== 'object') return null;
  if(target.profile && typeof target.profile === 'object') return target.profile;
  if(('profile' in target) || ('state' in target)){
    let profile = target.profile;
    if(!profile || typeof profile !== 'object'){
      profile = typeof createPlayerProfile === 'function'
        ? createPlayerProfile()
        : {};
      target.profile = profile;
    }
    return profile;
  }
  return target;
}

function ensureAbilityUnlocks(target){
  const profile = resolveAbilityProfile(target);
  if(!profile) return {};
  if(!profile.abilities || typeof profile.abilities !== 'object'){
    profile.abilities = {};
  }
  if(!profile.abilities.unlocked || typeof profile.abilities.unlocked !== 'object'){
    profile.abilities.unlocked = {};
  }
  const unlocked = profile.abilities.unlocked;
  for(const id of abilityIds()){
    if(Object.prototype.hasOwnProperty.call(unlocked, id)) continue;
    const def = abilityDefinitionById(id);
    unlocked[id] = !!(def && def.defaultUnlocked);
  }
  return unlocked;
}

function isAbilityUnlocked(target, abilityId){
  if(!abilityId) return false;
  const profile = resolveAbilityProfile(target);
  const unlocked = ensureAbilityUnlocks(profile);
  return !!unlocked?.[abilityId];
}

function setAbilityUnlocked(target, abilityId, value=true){
  if(!abilityId) return false;
  const profile = resolveAbilityProfile(target);
  const unlocked = ensureAbilityUnlocks(profile);
  unlocked[abilityId] = !!value;
  return unlocked[abilityId];
}

function setAllAbilitiesUnlocked(target, value=true){
  const profile = resolveAbilityProfile(target);
  const unlocked = ensureAbilityUnlocks(profile);
  const next = !!value;
  for(const id of abilityIds()){
    unlocked[id] = next;
  }
  return unlocked;
}

function areAllAbilitiesUnlocked(target){
  const profile = resolveAbilityProfile(target);
  const unlocked = ensureAbilityUnlocks(profile);
  for(const id of abilityIds()){
    if(!unlocked[id]) return false;
  }
  return true;
}

function teamAbilityById(id){
  if(!id) return null;
  return TEAM_ABILITIES[id] || null;
}

function defaultTeamAbilityId(){
  return 'chainSwing';
}

function ensureTeamAbilitySelection(profile){
  if(!profile || typeof profile !== 'object') return defaultTeamAbilityId();
  const existing = profile.teamAbilityId;
  if(existing && TEAM_ABILITIES[existing]) return existing;
  const fallback = defaultTeamAbilityId();
  profile.teamAbilityId = fallback;
  return fallback;
}

function ensureTeamAbilityState(world){
  if(!world) return null;
  const profile = world.profile || (world.profile = {});
  ensureAbilityUnlocks(profile);
  const abilityId = ensureTeamAbilitySelection(profile);
  if(!world.teamAbilityState){
    world.teamAbilityState = { abilityId, cooldownUntil: 0, active: null };
  }else{
    world.teamAbilityState.abilityId = abilityId;
    if(typeof world.teamAbilityState.cooldownUntil !== 'number'){
      world.teamAbilityState.cooldownUntil = 0;
    }
    if(world.teamAbilityState.active && !TEAM_ABILITIES[abilityId]){
      world.teamAbilityState.active = null;
    }
  }
  return world.teamAbilityState;
}

function resolveTeamAbility(world){
  const state = ensureTeamAbilityState(world);
  if(!state) return null;
  return teamAbilityById(state.abilityId);
}

function teamAbilityTooltip(world, stateOverride=null){
  const state = stateOverride || ensureTeamAbilityState(world);
  if(!state) return 'Ability';
  const ability = teamAbilityById(state.abilityId);
  if(!ability) return 'Ability';
  const lines = [];
  lines.push(ability.name || 'Ability');
  const unlocked = typeof isAbilityUnlocked === 'function'
    ? isAbilityUnlocked(world, ability.id)
    : true;
  if(ability.description) lines.push(ability.description);
  if(unlocked){
    const keyHint = ability.keyHint || 'E';
    lines.push(`Press ${keyHint} to activate.`);
  }else{
    lines.push('Locked — attune at a skill shrine to wield this ability.');
  }
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const remaining = Math.max(0, (state.cooldownUntil || 0) - now);
  if(state.active){
    lines.push('Chain engaged — release to detach.');
  }else if(remaining > 0){
    const seconds = remaining / 1000;
    const formatted = seconds >= 1 ? seconds.toFixed(1) : seconds.toFixed(2);
    lines.push(`Cooldown: ${formatted.replace(/0+$/, '').replace(/\.$/, '')}s remaining.`);
  }else if(unlocked){
    lines.push('Ready.');
  }
  return lines.join('\n');
}

function teamAbilityCooldownRemaining(world){
  const state = ensureTeamAbilityState(world);
  if(!state) return 0;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  return Math.max(0, (state.cooldownUntil || 0) - now);
}

function teamAbilityRaycast(world, originX, originY, dirX, dirY, ability){
  if(!world || !ability) return null;
  let dx = Number.isFinite(dirX) ? dirX : 0;
  let dy = Number.isFinite(dirY) ? dirY : 0;
  const length = Math.hypot(dx, dy);
  if(!(length > 1e-4)){
    dx = 1;
    dy = -0.1;
  }else{
    dx /= length;
    dy /= length;
  }
  const maxRange = Math.max(ability.maxRange ?? 480, 60);
  const maxDistance = maxRange;
  let solids = [];
  if(typeof gatherStaticPhysicsSolids === 'function'){
    const base = gatherStaticPhysicsSolids(world);
    if(Array.isArray(base) && base.length){
      solids = base.slice();
    }
  }
  if(typeof combinePhysicsSolids === 'function'){
    solids = combinePhysicsSolids(solids, Array.isArray(world.physicsBoxes) ? world.physicsBoxes : [], null);
  }else if(Array.isArray(world.physicsBoxes)){
    for(const box of world.physicsBoxes){
      if(!box) continue;
      const width = box.width ?? box.size ?? 0;
      const height = box.height ?? box.size ?? 0;
      if(!(width > 0 && height > 0)) continue;
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const cx = Number.isFinite(box.x) ? box.x : 0;
      const cy = Number.isFinite(box.y) ? box.y : 0;
      solids.push({ left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH });
    }
  }
  let best = null;
  for(const rect of solids){
    if(!rect) continue;
    const hit = rayIntersectRect(originX, originY, dx, dy, maxDistance, rect);
    if(!hit) continue;
    const minDistance = Math.max(ability.minDistance ?? 0, 32);
    if(hit.distance < minDistance) continue;
    if(!best || hit.distance < best.distance){
      best = hit;
    }
  }
  return best;
}

function rayIntersectRect(ox, oy, dx, dy, maxDistance, rect){
  const left = rect.left ?? rect.x ?? 0;
  const right = rect.right ?? ((rect.w ?? rect.width ?? 0) + left);
  const top = rect.top ?? rect.y ?? 0;
  const bottom = rect.bottom ?? ((rect.h ?? rect.height ?? 0) + top);
  if(!(right > left && bottom > top)) return null;
  const invDx = Math.abs(dx) > 1e-6 ? 1 / dx : null;
  const invDy = Math.abs(dy) > 1e-6 ? 1 / dy : null;
  let tmin = 0;
  let tmax = maxDistance;
  if(invDx === null){
    if(ox <= left || ox >= right) return null;
  }else{
    const tx1 = (left - ox) * invDx;
    const tx2 = (right - ox) * invDx;
    const txMin = Math.min(tx1, tx2);
    const txMax = Math.max(tx1, tx2);
    tmin = Math.max(tmin, txMin);
    tmax = Math.min(tmax, txMax);
  }
  if(invDy === null){
    if(oy <= top || oy >= bottom) return null;
  }else{
    const ty1 = (top - oy) * invDy;
    const ty2 = (bottom - oy) * invDy;
    const tyMin = Math.min(ty1, ty2);
    const tyMax = Math.max(ty1, ty2);
    tmin = Math.max(tmin, tyMin);
    tmax = Math.min(tmax, tyMax);
  }
  if(tmax < 0) return null;
  if(tmin > tmax) return null;
  if(tmin < 0) return null;
  const distance = tmin;
  if(!(distance >= 0 && distance <= maxDistance)) return null;
  const x = ox + dx * distance;
  const y = oy + dy * distance;
  const EPS = 1e-3;
  let normalX = 0;
  let normalY = 0;
  if(Math.abs(x - left) <= EPS) normalX = -1;
  else if(Math.abs(x - right) <= EPS) normalX = 1;
  else if(Math.abs(y - top) <= EPS) normalY = -1;
  else if(Math.abs(y - bottom) <= EPS) normalY = 1;
  else{
    const dLeft = Math.abs(x - left);
    const dRight = Math.abs(x - right);
    const dTop = Math.abs(y - top);
    const dBottom = Math.abs(y - bottom);
    const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
    if(minEdge === dLeft) normalX = -1;
    else if(minEdge === dRight) normalX = 1;
    else if(minEdge === dTop) normalY = -1;
    else normalY = 1;
  }
  return { x, y, distance, normalX, normalY };
}

function tryActivateTeamAbility(world){
  if(!world || world.state !== 'level') return false;
  const state = ensureTeamAbilityState(world);
  const ability = state ? teamAbilityById(state.abilityId) : null;
  if(!state || !ability) return false;
  if(typeof isAbilityUnlocked === 'function' && !isAbilityUnlocked(world, ability.id)) return false;
  if(state.active) return false;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  if(now < (state.cooldownUntil || 0)) return false;
  const stick = world.selected;
  if(!stick || stick.dead) return false;
  const rigPoints = stick.pointsByName || {};
  const handRight = rigPoints.handR || null;
  const handLeft = rigPoints.handL || null;
  if(!handRight && !handLeft) return false;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
  const aim = world.input?.aim || null;
  const facing = stick.dir >= 0 ? 1 : -1;
  let aimDir = facing;
  if(aim){
    const origin = pelvis || handRight || handLeft;
    if(origin){
      const horizontal = aim.x - origin.x;
      if(Math.abs(horizontal) > 4){
        aimDir = horizontal >= 0 ? 1 : -1;
      }
    }
  }
  let handName = aimDir >= 0 ? 'handR' : 'handL';
  let handPoint = handName === 'handR' ? handRight : handLeft;
  if(!handPoint){
    if(handName === 'handR' && handLeft){
      handName = 'handL';
      handPoint = handLeft;
      aimDir = -1;
    }else if(handName === 'handL' && handRight){
      handName = 'handR';
      handPoint = handRight;
      aimDir = 1;
    }else{
      return false;
    }
  }
  const dx = aim ? aim.x - handPoint.x : aimDir;
  const dy = aim ? aim.y - handPoint.y : -0.2;
  let hit = teamAbilityRaycast(world, handPoint.x, handPoint.y, dx, dy, ability);
  if(typeof Point !== 'function' || typeof Dist !== 'function') return false;
  const dirLength = Math.hypot(dx, dy);
  const normX = dirLength > 1e-4 ? dx / dirLength : aimDir;
  const normY = dirLength > 1e-4 ? dy / dirLength : -0.2;
  const maxRange = Math.max(ability.maxRange ?? 480, 60);
  const minDistance = Math.max(Number.isFinite(ability.minDistance) ? ability.minDistance : 0, 32);
  const configuredMaxChainLength = Number.isFinite(ability.maxChainLength)
    ? Math.max(16, ability.maxChainLength)
    : null;
  const maxChainLengthSetting = configuredMaxChainLength !== null
    ? Math.max(configuredMaxChainLength, minDistance)
    : null;
  if(hit && maxChainLengthSetting !== null){
    const hitDistance = Math.max(minDistance, Number.isFinite(hit.distance) ? hit.distance : 0);
    if(hitDistance > maxChainLengthSetting){
      hit = null;
    }
  }
  const offset = ability.surfaceOffset ?? 0;
  let anchorX;
  let anchorY;
  let attached = !!hit;
  if(attached){
    anchorX = hit.x + (hit.normalX || 0) * offset;
    anchorY = hit.y + (hit.normalY || 0) * offset;
  }else{
    const fallbackDistance = maxChainLengthSetting !== null
      ? maxChainLengthSetting
      : Math.max(minDistance, maxRange);
    anchorX = handPoint.x + normX * fallbackDistance;
    anchorY = handPoint.y + normY * fallbackDistance;
  }
  const baseDistance = Math.hypot(handPoint.x - anchorX, handPoint.y - anchorY);
  const floatingAnchor = !attached;
  const distanceForLimit = (!floatingAnchor && hit && Number.isFinite(hit.distance))
    ? Math.max(minDistance, hit.distance)
    : baseDistance;
  const linkTerrainRadiusRaw = Number.isFinite(ability.chainLinkTerrainRadius)
    ? Math.max(0, ability.chainLinkTerrainRadius)
    : null;
  const linkGroundSurfaceRaw = typeof ability.chainLinkGroundSurface === 'string'
    ? ability.chainLinkGroundSurface.toLowerCase()
    : null;
  const effectiveMaxChainLength = floatingAnchor
    ? (maxChainLengthSetting !== null ? Math.max(maxChainLengthSetting, baseDistance) : baseDistance)
    : maxChainLengthSetting;
  if(!floatingAnchor && effectiveMaxChainLength !== null && distanceForLimit > effectiveMaxChainLength){
    return false;
  }
  const anchor = new Point(anchorX, anchorY);
  anchor.owner = stick;
  anchor.rigPart = 'abilityAnchor';
  anchor.poseTargetX = anchorX;
  anchor.poseTargetY = anchorY;
  anchor.prevX = anchorX;
  anchor.prevY = anchorY;
  if(floatingAnchor){
    anchor.dragged = false;
    anchor.mass = Math.max(0.1, ability.chainLinkMass ?? 0.24);
    const gravityScale = Number.isFinite(ability.chainLinkGravityScale)
      ? Math.max(0.4, ability.chainLinkGravityScale)
      : 1;
    anchor.gravityScale = gravityScale;
    anchor.groundFriction = 0;
    anchor.groundFrictionMultiplier = 0;
    anchor.airDragMultiplier = Number.isFinite(ability.chainLinkAirDragMultiplier)
      ? Math.max(0, ability.chainLinkAirDragMultiplier)
      : 0.25;
    if(linkTerrainRadiusRaw !== null){
      anchor.terrainRadius = linkTerrainRadiusRaw;
    }else{
      anchor.terrainRadius = 0;
    }
    if(linkGroundSurfaceRaw){
      anchor.groundSampleSurface = linkGroundSurfaceRaw;
    }
  }else{
    anchor.dragged = true;
    anchor.mass = 0;
    anchor.gravityScale = 0;
    anchor.terrainRadius = 0;
    anchor.groundFriction = 0;
  }
  if(!Array.isArray(world.points)) world.points = [];
  world.points.push(anchor);
  if(!Array.isArray(world.constraints)) world.constraints = [];
  const stiffness = ability.stiffness ?? 0.9;
  const restScaleRaw = floatingAnchor
    ? 1
    : (Number.isFinite(ability.chainRestLengthScale)
      ? clampValue(ability.chainRestLengthScale, 0.1, 1)
      : 1);
  const maxChainLength = effectiveMaxChainLength !== null ? effectiveMaxChainLength : baseDistance;
  const limitedDistance = Math.min(baseDistance, maxChainLength);
  let restLength = limitedDistance * restScaleRaw;
  if(!(restLength > 0)) restLength = limitedDistance;
  restLength = Math.min(restLength, limitedDistance);
  if(!(restLength > 1e-3)){
    restLength = Math.min(limitedDistance, 24);
  }
  const totalLength = restLength;
  const dirX = baseDistance > 1e-3 ? (handPoint.x - anchorX) / baseDistance : 0;
  const dirY = baseDistance > 1e-3 ? (handPoint.y - anchorY) / baseDistance : 0;
  const baseLinkLength = Number.isFinite(ability.chainLinkLength)
    ? Math.max(2, ability.chainLinkLength)
    : totalLength;
  const maxLinks = Number.isFinite(ability.maxChainLinks)
    ? Math.max(0, Math.round(ability.maxChainLinks))
    : 0;
  let linkCount = Number.isFinite(ability.chainLinkCount)
    ? Math.max(0, Math.round(ability.chainLinkCount))
    : 0;
  if(linkCount <= 0){
    if(totalLength > 0){
      linkCount = Math.max(1, Math.round(totalLength / baseLinkLength));
    }else{
      linkCount = 1;
    }
  }
  const fallbackLimit = Math.max(1, Math.round(DEFAULT_TEAM_CHAIN_LINK_LIMIT));
  const linkLimit = maxLinks > 0 ? maxLinks : fallbackLimit;
  if(linkLimit > 0){
    linkCount = Math.min(linkCount, linkLimit);
  }
  const segmentCount = Math.max(0, linkCount);
  const spawnSegmentLength = segmentCount > 0
    ? baseDistance / (segmentCount + 1)
    : baseDistance;
  const restSegmentLength = segmentCount > 0
    ? totalLength / (segmentCount + 1)
    : totalLength;
  const linkMass = Number.isFinite(ability.chainLinkMass)
    ? Math.max(0, ability.chainLinkMass)
    : 0.6;
  const linkGravity = Number.isFinite(ability.chainLinkGravityScale)
    ? ability.chainLinkGravityScale
    : 1;
  const linkDrag = Number.isFinite(ability.chainLinkAirDragMultiplier)
    ? Math.max(0, ability.chainLinkAirDragMultiplier)
    : 1;
  const linkStiffness = Number.isFinite(ability.chainLinkStiffness)
    ? ability.chainLinkStiffness
    : stiffness;
  const chainPoints = [];
  const chainConstraints = [];
  let previousPoint = anchor;
  for(let i=1; i<=segmentCount; i++){
    const px = anchorX + dirX * spawnSegmentLength * i;
    const py = anchorY + dirY * spawnSegmentLength * i;
    const linkPoint = new Point(px, py);
    linkPoint.mass = linkMass;
    linkPoint.gravityScale = linkGravity;
    linkPoint.groundFriction = 0;
    linkPoint.airDragMultiplier = linkDrag;
    linkPoint.groundFrictionMultiplier = 0;
    linkPoint.owner = stick;
    linkPoint.poseTargetX = px;
    linkPoint.poseTargetY = py;
    if(linkTerrainRadiusRaw !== null){
      linkPoint.terrainRadius = linkTerrainRadiusRaw;
    }
    if(linkGroundSurfaceRaw){
      linkPoint.groundSampleSurface = linkGroundSurfaceRaw;
    }
    linkPoint.rigPart = 'abilityChainLink';
    world.points.push(linkPoint);
    const linkConstraint = new Dist(previousPoint, linkPoint, restSegmentLength, linkStiffness, {
      owner: stick,
      abilityId: ability.id,
      limbPullOwner: stick,
      allowReversePull: true
    });
    world.constraints.push(linkConstraint);
    chainPoints.push(linkPoint);
    chainConstraints.push(linkConstraint);
    previousPoint = linkPoint;
  }
  const finalConstraint = new Dist(previousPoint, handPoint, restSegmentLength, linkStiffness, {
    owner: stick,
    abilityId: ability.id,
    limbPullOwner: stick,
    allowReversePull: true
  });
  world.constraints.push(finalConstraint);
  chainConstraints.push(finalConstraint);
  const chain = {
    stick,
    ability,
    handName,
    anchor,
    anchorPos: attached ? { x: anchorX, y: anchorY } : null,
    floatingAnchor,
    constraint: finalConstraint,
    chainPoints,
    chainConstraints,
    createdAt: now,
    restLength,
    releaseGraceStart: 0
  };
  const rigSlackMultiplierRaw = Number.isFinite(ability.swingRigSlackMultiplier)
    ? clampValue(ability.swingRigSlackMultiplier, 0, 1)
    : null;
  if(rigSlackMultiplierRaw !== null && stick && typeof stick.applyHitboxRigStrength === 'function'){
    const previousStrength = Number.isFinite(stick._hitboxRigStrength)
      ? stick._hitboxRigStrength
      : 1;
    const nextStrength = Math.max(0, previousStrength * rigSlackMultiplierRaw);
    chain.hitboxRigRestore = previousStrength;
    stick.applyHitboxRigStrength(nextStrength);
  }
  const beamPhase = Number.isFinite(ability.beamPhaseMs) ? Math.max(0, ability.beamPhaseMs) : 0;
  if(beamPhase > 0){
    chain.beamPhaseMs = beamPhase;
    chain.beamPhaseUntil = now + beamPhase;
  }
  const dragOverride = Number.isFinite(ability.swingAirDragMultiplier)
    ? Math.max(0, ability.swingAirDragMultiplier)
    : null;
  if(dragOverride !== null){
    const rigOverrides = [];
    const seen = new Set();
    const rigPoints = stick.pointsByName || {};
    const addOverride = (point) => {
      if(!point || seen.has(point)) return;
      seen.add(point);
      rigOverrides.push({
        point,
        airDragMultiplier: point.airDragMultiplier,
        groundFrictionMultiplier: point.groundFrictionMultiplier
      });
      point.airDragMultiplier = dragOverride;
    };
    addOverride(pelvis);
    for(const value of Object.values(rigPoints)){
      addOverride(value);
    }
    if(rigOverrides.length > 0){
      chain.rigPointOverrides = rigOverrides;
    }
  }
  if(stick && stick.legs){
    const footGravityMultiplier = Number.isFinite(ability.swingFootGravityMultiplier)
      ? Math.max(0, ability.swingFootGravityMultiplier)
      : null;
    const footFollowMultiplier = Number.isFinite(ability.swingFootFollowMultiplier)
      ? Math.max(0, ability.swingFootFollowMultiplier)
      : null;
    if(footGravityMultiplier !== null || footFollowMultiplier !== null){
      const overrides = [];
      for(const side of ['left', 'right']){
        const leg = stick.legs?.[side];
        const foot = leg?.foot;
        if(!foot) continue;
        const entry = { foot };
        if(footGravityMultiplier !== null){
          const baseGravity = Number.isFinite(foot.gravityScale) ? foot.gravityScale : 1;
          entry.gravityScale = baseGravity;
          foot.gravityScale = baseGravity * footGravityMultiplier;
        }
        if(footFollowMultiplier !== null){
          const baseFollow = Number.isFinite(foot.followStrength)
            ? foot.followStrength
            : (typeof FOOT_FOLLOW_PER_SEC === 'number' ? FOOT_FOLLOW_PER_SEC : 18);
          entry.followStrength = baseFollow;
          foot.followStrength = baseFollow * footFollowMultiplier;
        }
        overrides.push(entry);
      }
      if(overrides.length){
        chain.footOverrides = overrides;
      }
    }
  }
  if(pelvis){
    const dx = pelvis.x - anchorX;
    const dy = pelvis.y - anchorY;
    const dist = Math.hypot(dx, dy);
    if(dist > 1e-3){
      const inv = 1 / dist;
      const tangentX = -dy * inv;
      const tangentY = dx * inv;
      const vx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
      const vy = Number.isFinite(pelvis.vy) ? pelvis.vy : 0;
      chain.tangentSpeed = vx * tangentX + vy * tangentY;
    }else{
      chain.tangentSpeed = 0;
    }
    const gravity = Number.isFinite(GRAVITY) ? GRAVITY : 2000;
    const height = anchorY - pelvis.y;
    const potentialEnergy = gravity * height;
    const tangentialSpeed = Number.isFinite(chain.tangentSpeed) ? chain.tangentSpeed : 0;
    chain.swingEnergy = potentialEnergy + 0.5 * tangentialSpeed * tangentialSpeed;
  }
  const jointTarget = Number.isFinite(ability.chainJointTorqueTarget)
    ? clampValue(ability.chainJointTorqueTarget, 0, 1)
    : 0;
  const jointResponse = Number.isFinite(ability.chainJointTorqueResponsePerSec)
    ? Math.max(0, ability.chainJointTorqueResponsePerSec)
    : null;
  if(stick){
    const restore = {};
    if(Number.isFinite(stick._jointTorqueTarget)) restore.target = stick._jointTorqueTarget;
    if(Number.isFinite(stick._jointTorqueResponsePerSec)) restore.response = stick._jointTorqueResponsePerSec;
    if(Number.isFinite(stick._jointTorqueScale)) restore.scale = stick._jointTorqueScale;
    if(Number.isFinite(stick._armJointTorqueScale)) restore.armScale = stick._armJointTorqueScale;
    if(Object.keys(restore).length > 0){
      chain.jointTorqueRestore = restore;
    }
    stick._jointTorqueTarget = jointTarget;
    if(jointResponse !== null){
      stick._jointTorqueResponsePerSec = jointResponse;
    }
    stick._jointTorqueScale = jointTarget;
    stick._armJointTorqueScale = 0;
    const nowTime = typeof nowMs === 'function' ? nowMs() : Date.now();
    const softMaintain = Number.isFinite(ability.chainSoftMaintainMs)
      ? Math.max(16, ability.chainSoftMaintainMs)
      : 120;
    if(typeof stick.forceSoftFor === 'function'){
      stick.forceSoftFor(softMaintain, nowTime);
    }
  }
  state.active = chain;
  stick.teamAbilityChain = chain;
  stick._chainSwingActive = true;
  if(typeof renderHUD === 'function') renderHUD(world);
  return true;
}

function releaseTeamAbility(world, options={}){
  const state = ensureTeamAbilityState(world);
  if(!state || !state.active) return false;
  const chain = state.active;
  const stick = chain.stick || null;
  const ability = teamAbilityById(state.abilityId);
  state.active = null;
  if(stick && stick.teamAbilityChain === chain){
    delete stick.teamAbilityChain;
  }
  if(stick){
    stick._chainSwingActive = false;
    if(stick.world && stick.world.state === 'level'){
      stick._chainJumpLockActive = true;
    }
  }
  if(chain.tangentSpeed !== undefined) delete chain.tangentSpeed;
  if(chain.swingEnergy !== undefined) delete chain.swingEnergy;
  if(Array.isArray(chain.chainConstraints) && Array.isArray(world?.constraints)){
    for(const constraint of chain.chainConstraints){
      const idx = world.constraints.indexOf(constraint);
      if(idx !== -1) world.constraints.splice(idx, 1);
    }
  }else if(chain.constraint && Array.isArray(world?.constraints)){
    const idx = world.constraints.indexOf(chain.constraint);
    if(idx !== -1) world.constraints.splice(idx, 1);
  }
  if(Array.isArray(chain.chainPoints) && Array.isArray(world?.points)){
    for(const point of chain.chainPoints){
      const idx = world.points.indexOf(point);
      if(idx !== -1) world.points.splice(idx, 1);
    }
  }
  if(chain.anchor && Array.isArray(world?.points)){
    const idx = world.points.indexOf(chain.anchor);
    if(idx !== -1) world.points.splice(idx, 1);
  }
  if(Array.isArray(chain.rigPointOverrides)){
    for(const entry of chain.rigPointOverrides){
      const point = entry?.point;
      if(!point) continue;
      if(entry.airDragMultiplier !== undefined){
        point.airDragMultiplier = entry.airDragMultiplier;
      }
      if(entry.groundFrictionMultiplier !== undefined){
        point.groundFrictionMultiplier = entry.groundFrictionMultiplier;
      }
    }
  }
  if(Array.isArray(chain.footOverrides)){
    for(const entry of chain.footOverrides){
      const foot = entry?.foot;
      if(!foot) continue;
      if(entry.gravityScale !== undefined){
        foot.gravityScale = entry.gravityScale;
      }
      if(entry.followStrength !== undefined){
        foot.followStrength = entry.followStrength;
      }
    }
    chain.footOverrides = null;
  }
  if(stick){
    const restore = chain.jointTorqueRestore || null;
    if(restore){
      if(restore.target !== undefined) stick._jointTorqueTarget = restore.target;
      if(restore.response !== undefined) stick._jointTorqueResponsePerSec = restore.response;
      if(restore.scale !== undefined) stick._jointTorqueScale = restore.scale;
      if(restore.armScale !== undefined){
        stick._armJointTorqueScale = restore.armScale;
      }else if(stick._armJointTorqueScale === 0 || stick._armJointTorqueScale === undefined){
        stick._armJointTorqueScale = 1;
      }
      chain.jointTorqueRestore = null;
    }
    if(chain.hitboxRigRestore !== undefined && typeof stick.applyHitboxRigStrength === 'function'){
      stick.applyHitboxRigStrength(chain.hitboxRigRestore);
      chain.hitboxRigRestore = undefined;
    }
  }
  if(!options.skipCooldown && ability){
    const now = typeof nowMs === 'function' ? nowMs() : Date.now();
    const cd = Math.max(0, ability.cooldownMs ?? 0);
    state.cooldownUntil = now + cd;
  }
  if(typeof renderHUD === 'function') renderHUD(world);
  return true;
}

function clampValue(value, min, max){
  if(typeof clamp === 'function'){
    return clamp(value, min, max);
  }
  if(value < min) return min;
  if(value > max) return max;
  return value;
}

function applyChainSwingMomentum(chain, world, dt){
  if(!chain || !world) return;
  const stick = chain.stick;
  if(!stick || stick.dead) return;
  const ability = chain.ability || teamAbilityById(chain.abilityId) || null;
  const anchor = chain.anchor;
  if(!anchor) return;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
  if(!pelvis) return;
  let stepDt = Number.isFinite(dt) ? dt : 0;
  if(!(stepDt > 0)){
    const last = Number.isFinite(world.lastDt) ? world.lastDt : 0;
    if(last > 0){
      stepDt = last;
    }else if(Number.isFinite(world.lastDtRaw) && world.lastDtRaw > 0){
      stepDt = world.lastDtRaw;
    }else{
      stepDt = 1 / 60;
    }
  }
  if(!(stepDt > 0)) return;
  const dx = pelvis.x - anchor.x;
  const dy = pelvis.y - anchor.y;
  const dist = Math.hypot(dx, dy);
  if(!(dist > 6)) return;
  const inv = 1 / dist;
  const radialX = dx * inv;
  const radialY = dy * inv;
  const tangentX = -radialY;
  const tangentY = radialX;
  const baseVx = Number.isFinite(pelvis.vx) ? pelvis.vx : 0;
  const baseVy = Number.isFinite(pelvis.vy) ? pelvis.vy : 0;
  const currentTangential = baseVx * tangentX + baseVy * tangentY;
  const adoptRate = Math.max(0, Number.isFinite(ability?.swingVelocityBlendRate)
    ? ability.swingVelocityBlendRate
    : 16);
  const adoptBlend = clampValue(stepDt * adoptRate, 0, 1);
  const gravity = Number.isFinite(GRAVITY) ? GRAVITY : 2000;
  const potentialEnergy = gravity * (anchor.y - pelvis.y);
  const currentEnergy = potentialEnergy + 0.5 * currentTangential * currentTangential;
  const energyDropRate = Math.max(0, Number.isFinite(ability?.swingEnergyLossRate)
    ? ability.swingEnergyLossRate
    : 2.5);
  const energyDropBlend = clampValue(stepDt * energyDropRate, 0, 1);
  if(!Number.isFinite(chain.swingEnergy)){
    chain.swingEnergy = Number.isFinite(currentEnergy) ? currentEnergy : 0;
  }else if(Number.isFinite(currentEnergy)){
    if(currentEnergy > chain.swingEnergy){
      chain.swingEnergy = currentEnergy;
    }else if(energyDropBlend > 0){
      chain.swingEnergy += (currentEnergy - chain.swingEnergy) * energyDropBlend;
    }
  }
  if(Number.isFinite(chain.swingEnergy) && chain.swingEnergy < potentialEnergy){
    chain.swingEnergy = potentialEnergy;
  }
  let tangentSpeed = Number.isFinite(chain.tangentSpeed)
    ? chain.tangentSpeed
    : currentTangential;
  tangentSpeed += (currentTangential - tangentSpeed) * adoptBlend;
  const inputAccel = Number.isFinite(ability?.swingInputAcceleration)
    ? Math.max(0, ability.swingInputAcceleration)
    : 0;
  if(inputAccel > 0 && world?.selected === stick && world?.input){
    let axis = 0;
    if(world.input.right) axis += 1;
    if(world.input.left) axis -= 1;
    axis = clampValue(axis, -1, 1);
    if(axis !== 0){
      let tangentSign = Math.sign(tangentX);
      if(tangentSign === 0){
        tangentSign = Math.sign(axis);
        if(tangentSign === 0) tangentSign = 1;
      }
      const horizontalInfluence = Math.max(Math.abs(tangentX), 0.2);
      tangentSpeed += tangentSign * axis * inputAccel * stepDt * horizontalInfluence;
    }
  }
  const tangentialAccel = gravity * radialX;
  tangentSpeed += tangentialAccel * stepDt;
  const availableEnergy = Math.max((Number.isFinite(chain.swingEnergy)
    ? chain.swingEnergy
    : potentialEnergy) - potentialEnergy, 0);
  const targetSpeedMag = Math.sqrt(2 * availableEnergy);
  let speedSign = Math.sign(tangentSpeed);
  if(speedSign === 0){
    speedSign = Math.sign(currentTangential);
    if(speedSign === 0 && Math.abs(tangentialAccel) > 1e-6){
      speedSign = Math.sign(tangentialAccel);
    }
  }
  if(targetSpeedMag <= 1e-4){
    tangentSpeed = 0;
  }else{
    if(speedSign === 0){
      speedSign = 1;
    }
    tangentSpeed = targetSpeedMag * speedSign;
  }
  const maxSpeed = Math.max(0, Number.isFinite(ability?.maxSwingSpeed)
    ? ability.maxSwingSpeed
    : 900);
  if(maxSpeed > 0){
    tangentSpeed = clampValue(tangentSpeed, -maxSpeed, maxSpeed);
    if(Number.isFinite(chain.swingEnergy)){
      const cappedEnergy = potentialEnergy + 0.5 * tangentSpeed * tangentSpeed;
      if(cappedEnergy < chain.swingEnergy){
        chain.swingEnergy = cappedEnergy;
      }
    }
  }
  chain.tangentSpeed = tangentSpeed;
  const desiredVx = tangentX * tangentSpeed;
  const desiredVy = tangentY * tangentSpeed;
  const velocityBlend = clampValue(stepDt * (adoptRate * 0.75 + 4), 0, 1);
  let nextVx = baseVx + (desiredVx - baseVx) * velocityBlend;
  let nextVy = baseVy + (desiredVy - baseVy) * velocityBlend;
  const radialVelocity = nextVx * radialX + nextVy * radialY;
  if(Math.abs(radialVelocity) > 1e-6){
    nextVx -= radialX * radialVelocity;
    nextVy -= radialY * radialVelocity;
  }
  const finalTangential = nextVx * tangentX + nextVy * tangentY;
  chain.tangentSpeed = finalTangential;
  const finalEnergy = potentialEnergy + 0.5 * finalTangential * finalTangential;
  if(Number.isFinite(finalEnergy)){
    if(!Number.isFinite(chain.swingEnergy) || finalEnergy > chain.swingEnergy){
      chain.swingEnergy = finalEnergy;
    }else if(energyDropBlend > 0){
      chain.swingEnergy += (finalEnergy - chain.swingEnergy) * energyDropBlend;
    }
  }
  if(Number.isFinite(chain.swingEnergy) && chain.swingEnergy < potentialEnergy){
    chain.swingEnergy = potentialEnergy;
  }
  pelvis.vx = nextVx;
  pelvis.vy = nextVy;
  stick.moveVelocity = nextVx;
  stick.verticalVelocity = nextVy;
  if(Math.abs(nextVx) > 4){
    const facing = nextVx >= 0 ? 1 : -1;
    stick.dir = facing;
    stick._lastMoveFacing = facing;
  }
  const rigRate = Math.max(0, Number.isFinite(ability?.swingRigFollowRate)
    ? ability.swingRigFollowRate
    : 8);
  const rigBlend = clampValue(stepDt * rigRate, 0, 1);
  if(rigBlend > 0){
    const rigPoints = stick.pointsByName || {};
    const followNames = ['chest','head','handL','handR','elbowL','elbowR','kneeL','kneeR','footL','footR'];
    for(const name of followNames){
      const point = rigPoints[name];
      if(!point || point.dragged) continue;
      const pvx = Number.isFinite(point.vx) ? point.vx : 0;
      const pvy = Number.isFinite(point.vy) ? point.vy : 0;
      point.vx = pvx + (nextVx - pvx) * rigBlend;
      point.vy = pvy + (nextVy - pvy) * rigBlend;
    }
  }
}

function updateTeamAbility(world, dt){
  const state = ensureTeamAbilityState(world);
  if(!state) return;
  const ability = teamAbilityById(state.abilityId);
  if(!ability){
    if(state.active) releaseTeamAbility(world, { skipCooldown: true });
    return;
  }
  if(typeof isAbilityUnlocked === 'function' && !isAbilityUnlocked(world, ability.id)){
    if(state.active) releaseTeamAbility(world, { skipCooldown: true });
    return;
  }
  if(world.state !== 'level'){
    if(state.active) releaseTeamAbility(world, { skipCooldown: true });
    return;
  }
  const chain = state.active;
  if(!chain) return;
  const stick = chain.stick;
  if(!stick || stick.dead || stick.world !== world){
    releaseTeamAbility(world, { skipCooldown: true });
    return;
  }
  const handPoint = stick.pointsByName?.[chain.handName];
  if(!handPoint){
    releaseTeamAbility(world, { skipCooldown: true });
    return;
  }
  if(chain.anchor && chain.anchorPos && !chain.floatingAnchor){
    chain.anchor.x = chain.anchorPos.x;
    chain.anchor.y = chain.anchorPos.y;
    chain.anchor.prevX = chain.anchorPos.x;
    chain.anchor.prevY = chain.anchorPos.y;
  }
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  if(typeof stick.forceSoftFor === 'function'){
    const maintain = Number.isFinite(ability.chainSoftMaintainMs)
      ? Math.max(16, ability.chainSoftMaintainMs)
      : 120;
    stick.forceSoftFor(maintain, now);
  }
  if(Number.isFinite(ability.chainJointTorqueTarget)){
    const desiredTarget = clampValue(ability.chainJointTorqueTarget, 0, 1);
    if(stick._jointTorqueTarget !== desiredTarget){
      stick._jointTorqueTarget = desiredTarget;
    }
    if(Number.isFinite(stick._jointTorqueScale) && Math.abs(stick._jointTorqueScale - desiredTarget) > 1e-3){
      stick._jointTorqueScale = desiredTarget;
    }
  }
  if(Number.isFinite(ability.chainJointTorqueResponsePerSec)){
    const desiredResponse = Math.max(0, ability.chainJointTorqueResponsePerSec);
    if(stick._jointTorqueResponsePerSec !== desiredResponse){
      stick._jointTorqueResponsePerSec = desiredResponse;
    }
  }
  stick._armJointTorqueScale = 0;
  if(world.input && !world.input.ability){
    const grace = Math.max(0, ability.releaseGraceMs ?? 0);
    if(grace <= 0){
      releaseTeamAbility(world);
      return;
    }
    if(!chain.releaseGraceStart){
      chain.releaseGraceStart = now;
    }else if(now - chain.releaseGraceStart >= grace){
      releaseTeamAbility(world);
      return;
    }
  }else{
    chain.releaseGraceStart = 0;
  }
  applyChainSwingMomentum(chain, world, dt);
}

function drawStickAbilityEffects(ctx, stick){
  if(!ctx || !stick) return;
  const chain = stick.teamAbilityChain;
  if(!chain || !chain.anchor) return;
  const hand = stick.pointsByName?.[chain.handName];
  if(!hand) return;
  const anchor = chain.anchor;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  const renderPoints = [hand];
  if(Array.isArray(chain.chainPoints)){
    for(let i = chain.chainPoints.length - 1; i >= 0; i--){
      const point = chain.chainPoints[i];
      if(point) renderPoints.push(point);
    }
  }
  renderPoints.push(anchor);
  const buildPath = () => {
    if(typeof ctx.beginPath === 'function') ctx.beginPath();
    ctx.moveTo(renderPoints[0].x, renderPoints[0].y);
    for(let i=1; i<renderPoints.length; i++){
      const point = renderPoints[i];
      ctx.lineTo(point.x, point.y);
    }
  };
  const beamUntil = Number.isFinite(chain.beamPhaseUntil) ? chain.beamPhaseUntil : 0;
  const beamDuration = Number.isFinite(chain.beamPhaseMs) ? chain.beamPhaseMs : 0;
  const beamActive = beamUntil > now;
  if(beamActive){
    const remaining = Math.max(0, beamUntil - now);
    const progress = beamDuration > 0 ? 1 - remaining / beamDuration : 1;
    ctx.save();
    if(typeof ctx.globalCompositeOperation === 'string') ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, 6.5 * scale);
    if(typeof ctx.shadowColor === 'string') ctx.shadowColor = 'rgba(255, 248, 196, 0.85)';
    if(Number.isFinite(ctx.shadowBlur)) ctx.shadowBlur = Math.max(14, 24 * scale);
    let gradient = null;
    if(typeof ctx.createLinearGradient === 'function'){
      gradient = ctx.createLinearGradient(hand.x, hand.y, anchor.x, anchor.y);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
      gradient.addColorStop(0.35, 'rgba(255, 252, 204, 0.95)');
      gradient.addColorStop(1, 'rgba(255, 225, 128, 0.94)');
    }
    ctx.strokeStyle = gradient || 'rgba(255, 241, 184, 0.94)';
    buildPath();
    ctx.stroke();
    if(Number.isFinite(ctx.shadowBlur)) ctx.shadowBlur = Math.max(6, 12 * scale);
    ctx.lineWidth = Math.max(2.6, 4 * scale);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * progress})`;
    buildPath();
    ctx.stroke();
    ctx.restore();
  }else{
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let gradient = null;
    if(typeof ctx.createLinearGradient === 'function'){
      gradient = ctx.createLinearGradient(hand.x, hand.y, anchor.x, anchor.y);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      gradient.addColorStop(0.4, 'rgba(255, 249, 189, 0.92)');
      gradient.addColorStop(1, 'rgba(255, 222, 120, 0.9)');
    }
    ctx.lineWidth = Math.max(3.2, 4.8 * scale);
    ctx.strokeStyle = gradient || 'rgba(255, 236, 176, 0.92)';
    if(typeof ctx.shadowColor === 'string') ctx.shadowColor = 'rgba(255, 239, 180, 0.75)';
    if(Number.isFinite(ctx.shadowBlur)) ctx.shadowBlur = Math.max(10, 18 * scale);
    buildPath();
    ctx.stroke();
    if(Number.isFinite(ctx.shadowBlur)) ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.6, 2.6 * scale);
    if(typeof ctx.setLineDash === 'function') ctx.setLineDash([7 * scale, 5 * scale]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
    buildPath();
    ctx.stroke();
    if(typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    ctx.restore();
  }
  ctx.save();
  const radius = Math.max(3.8, 4.8 * scale);
  ctx.fillStyle = 'rgba(255, 255, 214, 0.98)';
  if(typeof ctx.shadowColor === 'string') ctx.shadowColor = 'rgba(255, 242, 170, 0.85)';
  if(Number.isFinite(ctx.shadowBlur)) ctx.shadowBlur = Math.max(12, 20 * scale);
  if(typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function'){
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }else{
    ctx.fillRect(anchor.x - radius, anchor.y - radius, radius * 2, radius * 2);
  }
  ctx.restore();
}

const abilityApi = {
  abilityDefinitionById,
  abilityIds,
  ensureAbilityUnlocks,
  isAbilityUnlocked,
  setAbilityUnlocked,
  setAllAbilitiesUnlocked,
  areAllAbilitiesUnlocked,
  teamAbilityById,
  defaultTeamAbilityId,
  ensureTeamAbilityState,
  resolveTeamAbility,
  teamAbilityTooltip,
  teamAbilityCooldownRemaining,
  tryActivateTeamAbility,
  releaseTeamAbility,
  updateTeamAbility,
  drawStickAbilityEffects
};

if(typeof window !== 'undefined'){
  for(const [key, value] of Object.entries(abilityApi)){
    if(typeof window[key] === 'undefined'){
      window[key] = value;
    }
  }
}
