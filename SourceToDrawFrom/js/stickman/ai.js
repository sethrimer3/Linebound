// stickman/ai.js

function selectTargetFor(stick, detectRange=480, dropRange=720){
  const world = stick.world;
  if(!world) return null;
  const center = stick.center();
  if(stick.target){
    if(stick.target.dead){
      stick.target = null;
      stick.aggro = false;
    }else{
      const tc = stick.target.center();
      const dist = distance(center.x, center.y, tc.x, tc.y);
      if(dist > dropRange){
        stick.target = null;
        stick.aggro = false;
      }
    }
  }
  if(!stick.target){
    let best=null; let bestDist=detectRange;
    for(const other of world.sticks){
      if(other.isEnemy || other.dead) continue;
      const oc = other.center();
      const dist = distance(center.x, center.y, oc.x, oc.y);
      if(dist < bestDist){
        best = other;
        bestDist = dist;
      }
    }
    if(best){
      stick.target = best;
      stick.aggro = true;
    }
  }
  if(!stick.target){
    stick.aggro = false;
    return null;
  }
  const tc = stick.target.center();
  stick.dir = tc.x >= center.x ? 1 : -1;
  return stick.target;
}

function updateWander(stick, dt, speed=0.3){
  stick.wanderTimer -= dt;
  if(stick.wanderTimer <= 0){
    stick.wanderTimer = 0.9 + Math.random()*1.4;
    const dir = Math.sign(rand(-1,1));
    stick.wanderDir = dir === 0 ? (Math.random()<0.5?-1:1) : dir;
  }
  stick.moveInput((stick.wanderDir || 1) * speed);
}

function approachHome(stick, speed=0.2){
  const home = stick.homeX ?? stick.center().x;
  const dx = home - stick.center().x;
  if(Math.abs(dx) > 8){
    stick.moveInput(Math.sign(dx) * speed);
  }else{
    stick.moveInput(0);
  }
}

function maintainHoverHeight(stick){
  if(!stick.hoverHeight || !stick.world) return;
  const p = stick.pelvis();
  let surface = groundHeightAt(stick.world, p.x, { surface: 'top' });
  if(Number.isFinite(surface)){
    stick._lastHoverSurface = surface;
  }else if(Number.isFinite(stick._lastHoverSurface)){
    surface = stick._lastHoverSurface;
  }else{
    surface = p.y + stick.hoverHeight;
  }
  const targetY = surface - stick.hoverHeight;
  const vy = p.vy;
  const error = targetY - p.y;
  p.addForce(0, error * 26000 - vy * 2800);
}

function spawnPsiFloatArrowVolley(stick){
  if(!stick || typeof shootProjectile !== 'function') return false;
  const world = stick.world;
  if(!world) return false;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return false;
  const baseDamage = Math.max(6, Math.round(stick.attack ?? stick.attackBase ?? 12));
  const speed = Math.max(120, stick.psiVolleySpeed ?? 220);
  const originY = center.y - 18;
  const element = stick.element || 'light';
  const color = '#f1f2ff';
  const accent = '#a1adff';
  const volley = [
    { angle: 0, curveDir: 1, curveRate: 0.85 },
    { angle: Math.PI * 0.5, curveDir: -1, curveRate: 0.72 },
    { angle: Math.PI, curveDir: -1, curveRate: 0.85 },
    { angle: -Math.PI * 0.5, curveDir: 1, curveRate: 0.72 }
  ];
  let spawned = false;
  for(const entry of volley){
    if(!entry) continue;
    const projectile = shootProjectile(stick, { speed, dmg: baseDamage, color, element }, 'psiFloatArrow', {
      angle: entry.angle,
      speed,
      damage: baseDamage,
      element,
      ttl: Number.POSITIVE_INFINITY,
      radius: 6,
      hitRadius: 18,
      verticalKnock: 0,
      color,
      accentColor: accent,
      trailColor: 'rgba(159, 173, 255, 0.35)',
      trailLife: 360,
      trailAlpha: 0.85,
      bounce: 0.9,
      maxBounces: Infinity,
      origin: { x: center.x, y: originY }
    }, world);
    if(projectile){
      projectile.curveRate = entry.curveRate ?? 0.85;
      projectile.curveDir = entry.curveDir ?? 1;
      projectile.desiredSpeed = speed;
      projectile.speedAdjust = 6;
      projectile.drag = projectile.drag ?? 0.035;
      projectile.trailAlpha = projectile.trailAlpha ?? 0.85;
      projectile.psiVolley = true;
      spawned = true;
    }
  }
  return spawned;
}

function randomRange(min, max){
  if(typeof rand === 'function') return rand(min, max);
  return min + Math.random() * (max - min);
}

function ensureLeviathanState(stick){
  if(!stick) return null;
  let state = stick._leviathanState;
  if(!state){
    const maxShield = Math.max(0, Number.isFinite(stick.bubbleShieldHp) ? stick.bubbleShieldHp : 0);
    state = {
      shieldMax: maxShield,
      shieldHp: maxShield,
      shieldRatio: maxShield > 0 ? 1 : 0,
      regenDelay: Math.max(0, Number.isFinite(stick.bubbleShieldRegenDelay) ? stick.bubbleShieldRegenDelay : 4.5),
      regenRate: Math.max(0, Number.isFinite(stick.bubbleShieldRegenRate) ? stick.bubbleShieldRegenRate : 60),
      glyphTimer: 0,
      spikeTimer: 0,
      phase: 'stalk',
      time: 0,
      bubblePulse: 0
    };
    if(Number.isFinite(stick.maxHp)) state.baseMaxHp = stick.maxHp;
    stick._leviathanState = state;
  }
  if(state.baseMaxHp === undefined && Number.isFinite(stick.maxHp)){
    state.baseMaxHp = stick.maxHp;
  }
  return state;
}

function updateLeviathanShield(stick, state, dt){
  if(!stick || !state) return;
  const maxHp = Number.isFinite(stick.maxHp) ? stick.maxHp : (state.baseMaxHp ?? stick.hp ?? 0);
  if(state.baseMaxHp === undefined && Number.isFinite(maxHp)){
    state.baseMaxHp = maxHp;
  }
  const hp = Number.isFinite(stick.hp) ? stick.hp : 0;
  if(state.lastHp === undefined) state.lastHp = hp;
  if(hp < state.lastHp && state.shieldHp > 0){
    const loss = state.lastHp - hp;
    const absorb = Math.min(loss, state.shieldHp);
    state.shieldHp = Math.max(0, state.shieldHp - absorb);
    const cap = Number.isFinite(state.baseMaxHp) ? state.baseMaxHp : maxHp;
    if(absorb > 0){
      const healed = hp + absorb;
      stick.hp = cap ? Math.min(cap, healed) : healed;
      if(state.shieldHp <= 0){
        state.shieldDownTimer = state.regenDelay;
        state.shieldBroken = true;
      }
    }
    if(loss > absorb && !state.shieldBroken){
      state.shieldDownTimer = state.regenDelay;
      state.shieldBroken = true;
    }
  }
  state.lastHp = Number.isFinite(stick.hp) ? stick.hp : hp;
  if(state.shieldHp < state.shieldMax){
    if(state.shieldHp <= 0){
      state.shieldDownTimer = Math.max(0, (state.shieldDownTimer ?? state.regenDelay) - dt);
      if(state.shieldDownTimer <= 0){
        state.shieldHp = Math.min(state.shieldMax, state.shieldHp + state.regenRate * dt);
        if(state.shieldHp > 0) state.shieldBroken = false;
      }
    }else if(state.regenRate > 0){
      state.shieldHp = Math.min(state.shieldMax, state.shieldHp + state.regenRate * 0.15 * dt);
    }
  }
  state.shieldActive = state.shieldHp > 0.5;
  state.bubblePulse = state.shieldActive
    ? Math.min(1, (state.bubblePulse || 0) + dt * 1.4)
    : Math.max(0, (state.bubblePulse || 0) - dt * 1.8);
  state.shieldRatio = state.shieldMax > 0 ? clamp(state.shieldHp / state.shieldMax, 0, 1) : 0;
}

function leviathanFireGlyphCluster(stick, target){
  if(!stick || !stick.world || typeof shootProjectile !== 'function') return false;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return false;
  const aim = target && typeof target.center === 'function' ? target.center() : null;
  const baseAngle = aim
    ? Math.atan2(aim.y - center.y, aim.x - center.x)
    : (stick.dir >= 0 ? 0 : Math.PI);
  const spread = Number.isFinite(stick.glyphVolleySpread) ? stick.glyphVolleySpread : 0.18;
  const speed = Math.max(320, Number.isFinite(stick.glyphVolleySpeed) ? stick.glyphVolleySpeed : 720);
  const damage = Math.max(12, Math.round((stick.attack || 110) * 0.85));
  const element = stick.element || 'water';
  const offsets = [-spread, 0, spread];
  let fired = false;
  for(const offset of offsets){
    const opts = {
      angle: baseAngle + offset,
      speed,
      damage,
      ttl: 2400,
      radius: 12,
      hitRadius: 28,
      color: '#8bd0ff',
      trailColor: 'rgba(139, 208, 255, 0.4)',
      trailLife: 360,
      trailMax: 18
    };
    const projectile = shootProjectile(stick, { speed, dmg: damage, color: '#8bd0ff', element }, 'neonShard', opts, stick.world);
    if(projectile){
      projectile.ignoreTerrainCollision = !!projectile.ignoreTerrainCollision;
      projectile.trailAlpha = projectile.trailAlpha ?? 0.9;
      fired = true;
    }
  }
  return fired;
}

function leviathanSpawnSpikeBurst(stick){
  if(!stick || !stick.world || typeof shootProjectile !== 'function') return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const count = Math.max(4, Math.round(Number.isFinite(stick.spikeBurstProjectiles) ? stick.spikeBurstProjectiles : 8));
  const damage = Math.max(16, Math.round((stick.attack || 120) * (Number.isFinite(stick.spikeBurstDamageScale) ? stick.spikeBurstDamageScale : 1)));
  const element = stick.element || 'water';
  for(let i=0;i<count;i++){
    const angle = (TAU * i) / count;
    const opts = {
      angle,
      speed: 0,
      damage,
      ttl: 900,
      radius: 14,
      hitRadius: 34,
      color: '#8bd0ff',
      ignoreTerrainCollision: true
    };
    const projectile = shootProjectile(stick, { speed: 0, dmg: damage, color: '#8bd0ff', element }, 'bubbleSaw', opts, stick.world);
    if(projectile){
      projectile.vx = Math.cos(angle) * 260;
      projectile.vy = Math.sin(angle) * 160;
      projectile.drag = projectile.drag ?? 0.08;
      projectile.knockback = (projectile.knockback ?? 0) + 0.35;
    }
  }
}

function distancePointToSegment(px, py, ax, ay, bx, by){
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if(lenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  if(t < 0) t = 0;
  else if(t > 1) t = 1;
  const sx = ax + abx * t;
  const sy = ay + aby * t;
  return Math.hypot(px - sx, py - sy);
}

function thetaLineCollisionRectangles(stick, center, rangeHint){
  if(!stick || typeof stick._solidRectangles !== 'function') return null;
  const fallbackRange = Math.max(220, Number.isFinite(rangeHint) ? rangeHint : 0);
  const originalPadding = stick.wallQueryPadding;
  const basePadding = Number.isFinite(originalPadding) ? originalPadding : 0;
  const expandedPadding = Math.max(basePadding, fallbackRange + 160);
  let changed = false;
  if(originalPadding === undefined || originalPadding !== expandedPadding){
    stick.wallQueryPadding = expandedPadding;
    changed = true;
  }
  let rects = null;
  try{
    rects = stick._solidRectangles();
  }finally{
    if(changed){
      if(originalPadding === undefined){
        delete stick.wallQueryPadding;
      }else{
        stick.wallQueryPadding = originalPadding;
      }
    }
  }
  return rects;
}

function resetThetaLineSoftbody(line){
  if(!line) return;
  if(line.softbody) line.softbody = null;
}

function initializeThetaLineSoftbody(line, start, tip){
  if(!line || !start || !tip) return;
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  const length = Math.hypot(dx, dy);
  if(!(length > 4)){ 
    resetThetaLineSoftbody(line);
    return;
  }
  const segments = Math.max(4, Math.round(length / 48));
  const points = [];
  const count = Math.max(1, segments);
  for(let i = 0; i <= count; i++){
    const t = count > 0 ? i / count : 0;
    const px = start.x + dx * t;
    const py = start.y + dy * t;
    points.push({ x: px, y: py, prevX: px, prevY: py });
  }
  const segmentLength = count > 0 ? length / count : length;
  line.softbody = {
    points,
    segmentLength: Math.max(6, segmentLength),
    segmentCount: count,
    gravity: 1200,
    damping: 0.9,
    iterations: 5,
    lastLength: length
  };
}

function updateThetaLineSoftbody(line, start, tip, dt){
  if(!line || !start || !tip) return;
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  const length = Math.hypot(dx, dy);
  if(!(length > 4)){ 
    resetThetaLineSoftbody(line);
    return;
  }
  if(!line.softbody || !Array.isArray(line.softbody.points) || line.softbody.points.length < 2){
    initializeThetaLineSoftbody(line, start, tip);
  }
  const body = line.softbody;
  if(!body || !Array.isArray(body.points) || body.points.length < 2){
    return;
  }
  const targetSegments = Math.max(4, Math.round(length / Math.max(32, body.segmentLength || 32)));
  if(targetSegments !== body.segmentCount){
    initializeThetaLineSoftbody(line, start, tip);
  }
  const updatedBody = line.softbody;
  if(!updatedBody || !Array.isArray(updatedBody.points) || updatedBody.points.length < 2){
    return;
  }
  const points = updatedBody.points;
  const segmentCount = points.length - 1;
  const desiredLength = segmentCount > 0 ? length / segmentCount : length;
  updatedBody.segmentLength = Math.max(6, desiredLength);
  updatedBody.segmentCount = segmentCount;
  updatedBody.lastLength = length;
  const stepDt = dt > 0 ? Math.min(Math.max(dt, 1/240), 1/30) : 1/60;
  const dtSq = stepDt * stepDt;
  const gravity = Number.isFinite(updatedBody.gravity) ? updatedBody.gravity : 1200;
  const damping = Number.isFinite(updatedBody.damping) ? clamp(updatedBody.damping, 0.75, 0.98) : 0.9;
  const first = points[0];
  const last = points[points.length - 1];
  first.x = start.x;
  first.y = start.y;
  first.prevX = start.x;
  first.prevY = start.y;
  last.x = tip.x;
  last.y = tip.y;
  last.prevX = tip.x;
  last.prevY = tip.y;
  for(let i = 1; i < points.length - 1; i++){
    const p = points[i];
    const prevX = Number.isFinite(p.prevX) ? p.prevX : p.x;
    const prevY = Number.isFinite(p.prevY) ? p.prevY : p.y;
    const velX = (p.x - prevX) * damping;
    const velY = (p.y - prevY) * damping;
    const nextX = p.x + velX;
    const nextY = p.y + velY + gravity * dtSq;
    p.prevX = p.x;
    p.prevY = p.y;
    p.x = nextX;
    p.y = nextY;
  }
  const iterations = Number.isFinite(updatedBody.iterations) ? Math.max(1, Math.round(updatedBody.iterations)) : 4;
  for(let iter = 0; iter < iterations; iter++){
    for(let i = 0; i < points.length - 1; i++){
      const a = points[i];
      const b = points[i + 1];
      const dxSeg = b.x - a.x;
      const dySeg = b.y - a.y;
      const dist = Math.hypot(dxSeg, dySeg) || 1;
      const diff = (dist - updatedBody.segmentLength) / dist;
      if(i === 0){
        b.x -= dxSeg * diff;
        b.y -= dySeg * diff;
      }else if(i + 1 === points.length - 1){
        a.x += dxSeg * diff;
        a.y += dySeg * diff;
      }else{
        const offsetX = dxSeg * diff * 0.5;
        const offsetY = dySeg * diff * 0.5;
        a.x += offsetX;
        a.y += offsetY;
        b.x -= offsetX;
        b.y -= offsetY;
      }
    }
    first.x = start.x;
    first.y = start.y;
    last.x = tip.x;
    last.y = tip.y;
  }
}

const THETA_CHAIN_MAX_LENGTH = 990;

function updateThetaLineGeometry(line, center, rects){
  if(!line || !center) return;
  let anchorX;
  let anchorY;
  if(line.dynamicAnchor){
    const baseAngle = Number.isFinite(line.baseAngle)
      ? line.baseAngle
      : Math.atan2((line.anchor?.y ?? center.y) - center.y, (line.anchor?.x ?? center.x) - center.x);
    const radius = Number.isFinite(line.anchorRadius)
      ? Math.max(0, line.anchorRadius)
      : Math.hypot((line.anchor?.x ?? center.x) - center.x, (line.anchor?.y ?? center.y) - center.y);
    const twist = line.twistAngle || 0;
    const totalAngle = baseAngle + twist;
    anchorX = center.x + Math.cos(totalAngle) * radius;
    anchorY = center.y + Math.sin(totalAngle) * radius;
    line.anchor = { x: anchorX, y: anchorY };
    if(!Number.isFinite(line.anchorRadius)) line.anchorRadius = radius;
  }else{
    const anchor = line.anchor || center;
    anchorX = anchor.x;
    anchorY = anchor.y;
    if(!Number.isFinite(line.anchorRadius)){
      line.anchorRadius = Math.hypot(anchorX - center.x, anchorY - center.y);
    }
  }
  let dx = anchorX - center.x;
  let dy = anchorY - center.y;
  let dist = Math.hypot(dx, dy);
  if(!(dist > 1e-6)){
    dist = 1;
    dx = 1;
    dy = 0;
  }
  const maxAllowed = Math.min(THETA_CHAIN_MAX_LENGTH, Math.max(0, line.maxLength ?? dist));
  const intended = Math.max(0, line.length ?? dist);
  const clamped = Math.max(0, Math.min(maxAllowed, intended));
  const maintainAttachment = line.mode === 'chain' || line.mode === 'beam';
  if(!maintainAttachment){
    line.attachedDistance = null;
    line.attachedPoint = null;
    line.attachedNormal = null;
    line.attachedSurface = null;
  }
  let finalLength = clamped;
  let tipPoint = null;
  let hitNormal = null;
  let hitSurface = null;
  if(typeof raycastEnvironment === 'function' && Array.isArray(rects) && rects.length){
    const dir = { x: dx / dist, y: dy / dist };
    const rayDistance = Math.max(clamped, maxAllowed);
    const hit = raycastEnvironment(center, dir, rayDistance, rects);
    if(hit && Number.isFinite(hit.distance)){
      const safeDistance = Math.max(0, Math.min(maxAllowed, hit.distance - 2));
      const candidateTip = hit.point
        ? {
          x: hit.point.x - (hit.normal?.x || 0) * 2,
          y: hit.point.y - (hit.normal?.y || 0) * 2
        }
        : {
          x: center.x + dir.x * safeDistance,
          y: center.y + dir.y * safeDistance
        };
      if(maintainAttachment){
        line.attachedDistance = safeDistance;
        line.attachedPoint = candidateTip;
        line.attachedNormal = hit.normal ? { x: hit.normal.x, y: hit.normal.y } : null;
        line.attachedSurface = hit.rect || null;
      }else{
        finalLength = Math.min(finalLength, safeDistance);
        tipPoint = candidateTip;
        if(hit.normal){
          hitNormal = { x: hit.normal.x, y: hit.normal.y };
        }
        if(hit.rect){
          hitSurface = hit.rect;
        }
      }
    }else if(maintainAttachment){
      line.attachedDistance = null;
      line.attachedPoint = null;
      line.attachedNormal = null;
      line.attachedSurface = null;
    }
  }
  if(maintainAttachment && Number.isFinite(line.attachedDistance)){
    finalLength = Math.min(maxAllowed, Math.max(0, line.attachedDistance));
    if(line.attachedPoint){
      tipPoint = { x: line.attachedPoint.x, y: line.attachedPoint.y };
    }
    if(line.attachedNormal){
      hitNormal = { x: line.attachedNormal.x, y: line.attachedNormal.y };
    }
    if(line.attachedSurface){
      hitSurface = line.attachedSurface;
    }
  }else{
    finalLength = Math.max(0, Math.min(maxAllowed, finalLength));
  }
  const ratio = dist > 0 ? Math.min(1, finalLength / dist) : 0;
  const start = { x: center.x, y: center.y };
  const fallbackTip = {
    x: center.x + dx * ratio,
    y: center.y + dy * ratio
  };
  line.start = start;
  line.tip = tipPoint || fallbackTip;
  line.direction = {
    x: dist > 0 ? dx / dist : 0,
    y: dist > 0 ? dy / dist : 0
  };
  line.anchorDistance = dist;
  line.currentDistance = finalLength;
  line.distanceToAnchor = maintainAttachment && Number.isFinite(line.attachedDistance)
    ? line.attachedDistance
    : finalLength;
  line.length = clamped;
  line.hitNormal = hitNormal;
  line.hitSurface = hitSurface;
}

function applyThetaLineDamage(stick, line){
  if(!stick || !line || !line.start || !line.tip) return;
  if(line.damageActive === false) return;
  const world = stick.world;
  if(!world || !Array.isArray(world.sticks)) return;
  const radius = Math.max(6, line.damageRadius ?? 24);
  const interval = Math.max(0.05, line.damageInterval ?? 0.2);
  if(!line.hitMap) line.hitMap = new Map();
  const now = nowMs();
  for(const target of world.sticks){
    if(!target || target.dead || target.isEnemy) continue;
    const center = typeof target.center === 'function' ? target.center() : null;
    if(!center) continue;
    const dist = distancePointToSegment(center.x, center.y, line.start.x, line.start.y, line.tip.x, line.tip.y);
    if(dist > radius) continue;
    const lastHit = line.hitMap.get(target) || 0;
    if(now - lastHit < interval * 1000) continue;
    const baseDamage = Math.max(8, stick.attack || 8);
    target.takeDamage(baseDamage, 0, 0, stick, { element: 'light' });
    line.hitMap.set(target, now);
  }
}

function thetaHarmonicBehavior(stick, dt){
  if(!stick || !(dt > 0)) return;
  const world = stick.world;
  if(!world) return;
  stick.moveInput(0);
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
  const state = stick._thetaState || (stick._thetaState = {
    phase: 'idle',
    timer: 0,
    duration: 0,
    cooldown: 1.5,
    charge: 0,
    lines: [],
    glitch: Math.random() * TAU,
    phaseElapsed: 0,
    beamTimer: 0,
    chainElapsed: 0,
    twistAngle: 0,
    twistDir: Math.random() < 0.5 ? -1 : 1,
    lineConfigDirty: false,
    currentLineCount: 0
  });
  state.glitch = (state.glitch || 0) + dt;
  state.time = (state.time || 0) + dt;
  state.cooldown = Math.max(0, (state.cooldown || 0) - dt);
  state.phaseElapsed = (state.phaseElapsed || 0) + dt;

  const detectRange = Math.max(Number.isFinite(stick.attackRange) ? stick.attackRange : 680, 600);
  const dropRange = detectRange + 260;
  const target = selectTargetFor(stick, detectRange, dropRange);
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(target && center){
    const tc = target.center();
    if(tc){
      stick.dir = tc.x >= center.x ? 1 : -1;
      state.lastTargetAngle = Math.atan2(tc.y - center.y, tc.x - center.x);
    }
  }

  const maxHp = Number.isFinite(stick.maxHp) ? stick.maxHp : 0;
  const currentHp = Number.isFinite(stick.hp) ? stick.hp : maxHp;
  const healthRatio = maxHp > 0 ? clamp(currentHp / maxHp, 0, 1) : 1;
  const twistIntensity = clamp(1 - healthRatio, 0, 1);

  const baseCooldown = Math.max(1.6, stick.thetaCycleCooldown ?? 3.2);
  const telegraphTime = Math.max(0.2, stick.thetaTelegraphTime ?? stick.thetaChargeTime ?? 1);
  const chargeTime = telegraphTime;
  const beamFlashTime = Math.max(0.12, stick.thetaBeamFlashTime ?? 0.28);
  const chainDuration = Math.max(0.9, stick.thetaBeamDuration ?? 2.6);
  const beamStageDuration = beamFlashTime + chainDuration;
  const retractTime = Math.max(0.6, stick.thetaRetractTime ?? 1.2);
  const recoverTime = Math.max(0.6, stick.thetaRecoverTime ?? 1.45);
  const baseLineSeed = Number.isFinite(stick.thetaBaseLineCount) ? stick.thetaBaseLineCount : 3;
  const minLineSetting = Number.isFinite(stick.thetaMinLineCount) ? stick.thetaMinLineCount : baseLineSeed;
  const configuredLineCount = Number.isFinite(stick.thetaLineCount) ? stick.thetaLineCount : minLineSetting;
  const baseLineCount = Math.max(3, Math.round(Math.min(minLineSetting, baseLineSeed, configuredLineCount)));
  const maxLineSetting = Number.isFinite(stick.thetaMaxLineCount) ? stick.thetaMaxLineCount : Math.max(configuredLineCount, 10);
  const maxLineCount = Math.max(baseLineCount, Math.round(maxLineSetting));
  const lineBlend = clamp(healthRatio, 0, 1);
  const desiredLineCount = Math.round(maxLineCount - (maxLineCount - baseLineCount) * lineBlend);
  const lineCount = Math.max(2, desiredLineCount);
  const lineRange = Math.max(220, stick.thetaLineRange ?? 640);
  const extendSpeed = Math.max(140, stick.thetaLineExtendSpeed ?? 580);
  const retractSpeed = Math.max(140, stick.thetaLineRetractSpeed ?? 540);
  const damageRadius = Math.max(12, stick.thetaLineDamageRadius ?? 34);
  const damageInterval = Math.max(0.08, stick.thetaLineDamageInterval ?? 0.24);
  const lineWidth = Math.max(6, stick.thetaLineWidth ?? 22);
  const chainPullForce = Math.max(16000, stick.thetaChainPullForce ?? 36000);
  const chaosRetargetMin = Math.max(0.18, stick.thetaChainRetargetMin ?? 0.32);
  const chaosRetargetMax = Math.max(chaosRetargetMin, stick.thetaChainRetargetMax ?? 0.78);

  if(state.currentLineCount !== lineCount){
    state.currentLineCount = lineCount;
    state.lineConfigDirty = true;
  }

  const maxTwist = TAU * twistIntensity;
  let twistDir = state.twistDir || (Math.random() < 0.5 ? -1 : 1);
  let twistAngle = state.twistAngle || 0;
  if(maxTwist <= 1e-3){
    twistAngle = 0;
  }else{
    const twistSpeed = 0.4 + 2.6 * twistIntensity;
    twistAngle += twistDir * twistSpeed * dt;
    if(twistAngle > maxTwist){
      twistAngle = maxTwist;
      twistDir = -1;
    }else if(twistAngle < -maxTwist){
      twistAngle = -maxTwist;
      twistDir = 1;
    }
  }
  state.twistAngle = clamp(twistAngle, -maxTwist, maxTwist);
  state.twistDir = twistDir;

  const setPhase = (name, duration)=>{
    state.phase = name;
    state.timer = duration;
    state.duration = duration;
    state.phaseElapsed = 0;
    if(name !== 'beam'){
      state.beamTimer = 0;
    }
  };

  const ensureLines = rects=>{
    if(!center) return;
    if(!Array.isArray(state.lines)) state.lines = [];
    if(state.lineConfigDirty){
      state.lines = [];
      state.lineConfigDirty = false;
    }
    if(state.lines.length) return;
    const collisionRects = rects || thetaLineCollisionRectangles(stick, center, lineRange);
    const baseAngle = Number.isFinite(state.lastTargetAngle)
      ? state.lastTargetAngle
      : Math.random() * TAU;
    const spread = Math.PI / Math.max(3, lineCount);
    const lines = [];
    const fallbackRange = Math.max(220, lineRange);
    const worldWidth = Number.isFinite(world.width) ? world.width : fallbackRange * 2;
    const worldHeight = Number.isFinite(world.height) ? world.height : fallbackRange * 2;
    const maxReach = Math.max(fallbackRange, Math.hypot(worldWidth, worldHeight));
    for(let i = 0; i < lineCount; i++){
      let angle;
      if(i === 0){
        angle = baseAngle;
      }else{
        const step = Math.ceil(i / 2);
        const offset = spread * step;
        angle = baseAngle + (i % 2 === 0 ? -offset : offset);
      }
      angle += randomRange(-0.18, 0.18);
      let reach = maxReach * (0.45 + Math.random() * 0.55);
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);
      let anchorX = center.x + dirX * reach;
      let anchorY = center.y + dirY * reach;
      if(world){
        const minX = 0;
        const maxX = Math.max(minX, worldWidth);
        anchorX = clamp(anchorX, minX, maxX);
        if(typeof groundHeightAt === 'function'){
          const ground = groundHeightAt(world, anchorX, { surface: 'top' });
          if(Number.isFinite(ground) && dirY > 0){
            const floorBuffer = Math.max(18, (stick.hitboxHeight || 120) * 0.2);
            const floorLimit = ground + floorBuffer;
            if(anchorY < floorLimit) anchorY = floorLimit;
          }
        }
        if(typeof world.ceilingY === 'number' && dirY < 0){
          const ceilingBuffer = Math.max(18, (stick.hitboxHeight || 120) * 0.2);
          const ceilingLimit = world.ceilingY - ceilingBuffer;
          if(anchorY > ceilingLimit) anchorY = ceilingLimit;
        }
      }
      const dx = anchorX - center.x;
      const dy = anchorY - center.y;
      let dist = Math.hypot(dx, dy);
      if(!(dist > 0)){
        dist = reach;
        anchorX = center.x + Math.cos(angle) * dist;
        anchorY = center.y + Math.sin(angle) * dist;
      }
      const maxLength = Math.min(THETA_CHAIN_MAX_LENGTH, Math.max(180, dist, fallbackRange));
      const beamSpeed = Math.max(extendSpeed, maxLength / Math.max(beamFlashTime, 0.2));
      lines.push({
        angle: normalizeRadians(angle),
        baseAngle: normalizeRadians(angle),
        anchorRadius: dist,
        anchor: { x: anchorX, y: anchorY },
        dynamicAnchor: true,
        maxLength,
        length: 0,
        extendSpeed,
        beamExtendSpeed: beamSpeed,
        retractSpeed,
        damageRadius,
        damageInterval,
        width: lineWidth,
        opacity: 0,
        hitMap: new Map(),
        mode: 'telegraph',
        damageActive: false,
        chaosTimer: 0,
        chainTargetLength: maxLength,
        chainPullStrength: chainPullForce,
        primary: i === 0
      });
    }
    state.lines = lines;
    state.primaryLine = lines.find(line => line.primary) || lines[0] || null;
    if(Array.isArray(state.lines)){
      for(const line of state.lines){
        if(!line) continue;
        line.twistAngle = state.twistAngle || 0;
        updateThetaLineGeometry(line, center, collisionRects);
      }
    }
  };

  const phase = state.phase || 'idle';

  if(phase === 'idle'){
    state.charge = Math.max(0, (state.charge || 0) - dt * 1.5);
    if(target && state.cooldown <= 0 && center){
      state.lines = [];
      state.primaryLine = null;
      setPhase('charge', chargeTime);
      state.charge = 0;
      return;
    }
    if(!target){
      approachHome(stick, 0.12);
    }
    return;
  }

  if(phase === 'charge'){
    state.timer = Math.max(0, (state.timer ?? chargeTime) - dt);
    const duration = state.duration || chargeTime;
    const progress = duration > 0 ? clamp(1 - state.timer / Math.max(0.001, duration), 0, 1) : 1;
    state.charge = progress;
    const rects = thetaLineCollisionRectangles(stick, center, lineRange);
    ensureLines(rects);
    if(center && Array.isArray(state.lines)){
      const eased = progress * progress;
      for(const line of state.lines){
        if(!line) continue;
        line.mode = 'telegraph';
        line.damageActive = false;
        line.width = lineWidth * 0.75;
        line.length = line.maxLength;
        line.dynamicAnchor = true;
        line.twistAngle = state.twistAngle || 0;
        updateThetaLineGeometry(line, center, rects);
        resetThetaLineSoftbody(line);
        line.opacity = clamp(0.18 + eased * 0.6, 0, 0.78);
        line.glowColor = 'rgba(255, 168, 255, 0.35)';
        line.coreColor = '#ffd6ff';
        line.anchorGlow = 'rgba(255, 188, 255, 0.25)';
      }
    }
    if(state.timer <= 0){
      ensureLines(rects);
      setPhase('beam', beamStageDuration);
      state.charge = 1;
      state.beamTimer = beamFlashTime;
      state.chainElapsed = 0;
      if(Array.isArray(state.lines)){
        for(const line of state.lines){
          if(!line) continue;
          line.mode = 'beam';
          line.damageActive = true;
          line.length = 0;
          line.opacity = 0;
          line.chainTargetLength = line.maxLength;
          line.chaosTimer = 0;
          resetThetaLineSoftbody(line);
          if(line.hitMap && typeof line.hitMap.clear === 'function') line.hitMap.clear();
        }
      }
      return;
    }
    return;
  }

  if(phase === 'beam'){
    state.timer = Math.max(0, (state.timer ?? beamStageDuration) - dt);
    const previousBeam = Number.isFinite(state.beamTimer) ? state.beamTimer : 0;
    const nextBeam = Math.max(0, previousBeam - dt);
    const beamActive = nextBeam > 0;
    const chainJustActivated = previousBeam > 0 && nextBeam <= 0;
    state.beamTimer = nextBeam;
    const rects = thetaLineCollisionRectangles(stick, center, lineRange);
    ensureLines(rects);
    if(center && Array.isArray(state.lines)){
      for(const line of state.lines){
        if(!line) continue;
        line.dynamicAnchor = true;
        line.twistAngle = state.twistAngle || 0;
        line.damageRadius = damageRadius;
        line.damageInterval = damageInterval;
        line.width = lineWidth;
        if(beamActive){
          if(line.mode !== 'beam'){
            line.mode = 'beam';
            line.damageActive = true;
          }
          const speed = line.beamExtendSpeed ?? extendSpeed;
          line.length = Math.min(line.maxLength, line.length + speed * dt);
          updateThetaLineGeometry(line, center, rects);
          resetThetaLineSoftbody(line);
          line.opacity = Math.min(1, (line.opacity || 0) + dt * 6);
          line.glowColor = 'rgba(255, 188, 255, 0.9)';
          line.coreColor = '#ff9df5';
          line.anchorGlow = 'rgba(255, 202, 255, 0.6)';
          applyThetaLineDamage(stick, line);
        }else{
          if(line.mode !== 'chain'){
            line.mode = 'chain';
            line.damageActive = true;
            line.chaosTimer = 0;
            line.chainTargetLength = line.maxLength;
            if(line.hitMap && typeof line.hitMap.clear === 'function') line.hitMap.clear();
          }
          line.chaosTimer = Math.max(0, (line.chaosTimer || 0) - dt);
          updateThetaLineGeometry(line, center, rects);
          const dist = line.distanceToAnchor || line.currentDistance || line.maxLength || 0;
          if(line.chaosTimer <= 0 || !Number.isFinite(line.chainTargetLength)){
            const shorten = Math.random() < 0.6;
            const ratio = shorten
              ? randomRange(0.45, 0.82)
              : randomRange(0.9, 1.05);
            const desired = clamp(dist * ratio, 0, line.maxLength);
            line.chainTargetLength = desired;
            const delta = Math.abs(dist - desired);
            const baseSpeed = Math.max(extendSpeed, delta / Math.max(0.2, chaosRetargetMin));
            line.chaosSpeed = randomRange(baseSpeed * 0.6, baseSpeed * 1.1);
            line.chaosTimer = randomRange(chaosRetargetMin, chaosRetargetMax);
          }
          const targetLen = Number.isFinite(line.chainTargetLength) ? line.chainTargetLength : dist;
          const speed = Math.max(0, line.chaosSpeed || extendSpeed);
          if(line.length < targetLen){
            line.length = Math.min(targetLen, line.length + speed * dt);
          }else if(line.length > targetLen){
            line.length = Math.max(targetLen, line.length - speed * dt);
          }
          updateThetaLineGeometry(line, center, rects);
          line.opacity = clamp(line.opacity ?? 0.9, 0.5, 1);
          line.glowColor = 'rgba(255, 172, 240, 0.7)';
          line.coreColor = '#ff8de5';
          line.anchorGlow = 'rgba(255, 205, 255, 0.5)';
          applyThetaLineDamage(stick, line);
          if(line.start && line.tip){
            updateThetaLineSoftbody(line, line.start, line.tip, dt);
          }
          if(pelvis){
            const distNow = line.distanceToAnchor || line.currentDistance || dist;
            const targetLenNow = Number.isFinite(line.chainTargetLength) ? line.chainTargetLength : distNow;
            if(distNow > 0 && targetLenNow < distNow){
              const tension = clamp((distNow - targetLenNow) / Math.max(60, distNow), 0, 1);
              const pull = (line.chainPullStrength ?? chainPullForce) * tension;
              const dirX = line.direction?.x ?? ((line.anchor.x - center.x) / distNow);
              const dirY = line.direction?.y ?? ((line.anchor.y - center.y) / distNow);
              pelvis.addForce(dirX * pull, dirY * pull);
            }
          }
        }
      }
    }
    if(chainJustActivated){
      if(Array.isArray(state.lines)){
        for(const line of state.lines){
          if(line && line.hitMap && typeof line.hitMap.clear === 'function'){
            line.hitMap.clear();
          }
        }
      }
    }
    if(!beamActive){
      state.chainElapsed = (state.chainElapsed || 0) + dt;
    }
    if(state.timer <= 0){
      setPhase('retract', retractTime);
      state.moveOrigin = null;
      state.moveTarget = null;
      if(Array.isArray(state.lines)){
        for(const line of state.lines){
          if(!line) continue;
          line.mode = 'retract';
          resetThetaLineSoftbody(line);
        }
      }
      return;
    }
    return;
  }

  if(phase === 'retract'){
    state.timer = Math.max(0, (state.timer ?? retractTime) - dt);
    const updatedCenter = typeof stick.center === 'function' ? stick.center() : null;
    const rects = thetaLineCollisionRectangles(stick, updatedCenter || center, lineRange);
    if(updatedCenter && Array.isArray(state.lines)){
      for(const line of state.lines){
        if(!line) continue;
        line.damageActive = false;
        line.retractSpeed = retractSpeed;
        line.length = Math.max(0, line.length - line.retractSpeed * dt);
        line.dynamicAnchor = true;
        line.twistAngle = state.twistAngle || 0;
        updateThetaLineGeometry(line, updatedCenter, rects);
        resetThetaLineSoftbody(line);
        line.opacity = Math.max(0, (line.opacity || 0) - dt * 3.2);
      }
    }
    if(state.timer <= 0){
      state.lines = [];
      state.primaryLine = null;
      state.moveOrigin = null;
      state.moveTarget = null;
      state.chainElapsed = 0;
      state.charge = Math.max(0, state.charge * 0.35);
      setPhase('recover', recoverTime);
      state.cooldown = baseCooldown;
      return;
    }
    return;
  }

  if(phase === 'recover'){
    state.timer = Math.max(0, (state.timer ?? recoverTime) - dt);
    state.charge = Math.max(0, (state.charge || 0) - dt * 1.2);
    if(state.timer <= 0){
      setPhase('idle', 0);
      state.lines = [];
      state.primaryLine = null;
      state.moveOrigin = null;
      state.moveTarget = null;
    }
  }
}

function normalizeRadians(angle){
  if(!Number.isFinite(angle)) return 0;
  let a = angle % TAU;
  if(a < 0) a += TAU;
  return a;
}

function shortestAngleDiff(from, to){
  if(!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  let diff = (to - from) % TAU;
  if(diff > Math.PI) diff -= TAU;
  if(diff < -Math.PI) diff += TAU;
  return diff;
}

function ensureVoidHaloState(stick){
  if(!stick) return null;
  let halo = stick.voidHaloState;
  const maxOrbs = Math.max(1, Math.round(stick.voidHaloMaxOrbs ?? halo?.maxOrbs ?? 4));
  if(!halo){
    halo = {
      rotation: Math.random() * TAU,
      regenDelay: Math.max(0.4, stick.voidHaloRegenDelay ?? 4),
      spinSpeed: stick.voidHaloSpinSpeed ?? 0.85,
      radius: Math.max(24, stick.voidHaloRadius ?? 60),
      maxOrbs,
      orbs: []
    };
    stick.voidHaloState = halo;
  }
  halo.maxOrbs = maxOrbs;
  halo.regenDelay = Math.max(0.4, stick.voidHaloRegenDelay ?? halo.regenDelay ?? 4);
  halo.spinSpeed = stick.voidHaloSpinSpeed ?? halo.spinSpeed ?? 0.85;
  halo.radius = Math.max(24, stick.voidHaloRadius ?? halo.radius ?? 60);
  if(!Array.isArray(halo.orbs)) halo.orbs = [];
  while(halo.orbs.length < halo.maxOrbs){
    halo.orbs.push({ cooldown: 0, launchFlash: 0, angleOffset: 0 });
  }
  if(halo.orbs.length > halo.maxOrbs){
    halo.orbs.length = halo.maxOrbs;
  }
  const step = TAU / halo.maxOrbs;
  for(let i=0;i<halo.orbs.length;i++){
    const orb = halo.orbs[i];
    if(!orb){
      halo.orbs[i] = { cooldown: 0, launchFlash: 0, angleOffset: step * i };
      continue;
    }
    orb.angleOffset = step * i;
    if(orb.cooldown === undefined) orb.cooldown = 0;
    if(orb.launchFlash === undefined) orb.launchFlash = 0;
  }
  if(halo.charge === undefined) halo.charge = 0;
  return halo;
}

function updateVoidHaloState(stick, dt){
  const halo = ensureVoidHaloState(stick);
  if(!halo) return null;
  halo.rotation = (halo.rotation ?? 0) + (halo.spinSpeed ?? 0.85) * dt;
  for(const orb of halo.orbs){
    if(!orb) continue;
    if(orb.cooldown > 0) orb.cooldown = Math.max(0, orb.cooldown - dt);
    if(orb.launchFlash > 0) orb.launchFlash = Math.max(0, orb.launchFlash - dt);
  }
  return halo;
}

function voidHaloReadyCount(stick){
  const halo = stick?.voidHaloState;
  if(!halo || !Array.isArray(halo.orbs)) return 0;
  let ready = 0;
  for(const orb of halo.orbs){
    if(orb && (orb.cooldown ?? 0) <= 0) ready++;
  }
  return ready;
}

function voidHaloCenter(stick){
  if(!stick) return null;
  const head = stick.pointsByName?.head;
  if(!head) return null;
  const offsetY = stick.voidHaloHeightOffset ?? 0;
  return { x: head.x, y: head.y + offsetY };
}

function voidHaloOrbPosition(stick, orb){
  const halo = ensureVoidHaloState(stick);
  const center = voidHaloCenter(stick) || stick.center();
  const angle = (halo?.rotation ?? 0) + (orb?.angleOffset ?? 0);
  const radius = halo?.radius ?? stick.voidHaloRadius ?? 60;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function spawnShinTelegraph(stick, x, y, radius, duration){
  if(!stick || !stick.world) return null;
  const world = stick.world;
  if(!Array.isArray(world.particles)) world.particles = [];
  const particle = {
    style: 'bubble',
    type: 'shinTelegraph',
    x,
    y,
    radius: Math.max(30, radius || 80),
    life: 0,
    maxLife: Math.max(0.2, duration || 1.2),
    color: 'rgba(240, 240, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    highlightColor: 'rgba(255, 255, 255, 0.35)',
    fadeStart: 0.4,
    fadeEnd: 0.9,
    lift: 0,
    ignoreGround: true
  };
  world.particles.push(particle);
  if(typeof trimWorldParticles === 'function') trimWorldParticles(world, 480);
  return particle;
}

function spawnShinLightning(stick, targetX, targetY){
  if(!stick || !stick.world) return;
  const world = stick.world;
  if(!Array.isArray(world.particles)) world.particles = [];
  const x = Number.isFinite(targetX) ? targetX : (stick.center()?.x ?? 0);
  const ground = groundHeightAt(world, x, { surface: 'top' });
  const baseY = Number.isFinite(targetY) ? Math.min(targetY, ground - 8) : Math.min(stick.center()?.y ?? ground - 8, ground - 8);
  const baseLength = Math.max(180, stick.lightningLength || 300);
  const segments = Math.max(4, Math.round(stick.lightningSegments || 6));
  const spread = Number.isFinite(stick.lightningSpread) ? stick.lightningSpread : 42;
  const points = [];
  for(let i = 1; i <= segments; i++){
    const ratio = i / segments;
    const offsetX = randomRange(-spread, spread);
    const offsetY = -baseLength * ratio;
    points.push({ x: offsetX, y: offsetY });
  }
  const damageScale = Number.isFinite(stick.lightningDamageScale) ? stick.lightningDamageScale : 1.6;
  const baseAttack = Math.max(10, stick.attack || 10);
  const damage = Math.max(8, Math.round(baseAttack * damageScale));
  world.particles.push({
    type: 'voidLightning',
    style: 'voidLightning',
    x,
    y: baseY,
    points,
    life: 0,
    maxLife: Number.isFinite(stick.lightningLife) ? stick.lightningLife : 360,
    width: stick.lightningWidth || 3,
    color: 'rgba(248, 248, 255, 0.95)',
    glow: stick.lightningGlow || 32,
    jitter: stick.lightningJitter || 0.9,
    damage,
    damageRadius: Number.isFinite(stick.lightningRadius) ? stick.lightningRadius : 90,
    damageCooldown: 200,
    damageEnemiesOnly: true,
    ignoreOwner: true,
    owner: stick,
    element: stick.element || 'light'
  });
  if(typeof trimWorldParticles === 'function') trimWorldParticles(world, 480);
}

function consumeVoidHaloOrb(stick){
  const halo = ensureVoidHaloState(stick);
  if(!halo) return null;
  const regen = Math.max(0.4, halo.regenDelay ?? 4);
  for(const orb of halo.orbs){
    if(!orb || (orb.cooldown ?? 0) > 0) continue;
    const origin = voidHaloOrbPosition(stick, orb);
    orb.cooldown = regen;
    orb.launchFlash = 0.32;
    return { orb, origin };
  }
  return null;
}

function spawnMirageSlash(stick, options={}){
  if(!stick || stick.dead) return null;
  const world = stick.world;
  if(!world || typeof shootProjectile !== 'function') return null;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return null;
  const direction = options.direction !== undefined ? Math.sign(options.direction) || 1 : (stick.dir >= 0 ? 1 : -1);
  const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
  const weapon = weaponId && typeof WEAPONS === 'object' ? WEAPONS[weaponId] : null;
  const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : (Number.isFinite(stick.slashOffsetX) ? stick.slashOffsetX : 18);
  const offsetY = Number.isFinite(options.offsetY) ? options.offsetY : (Number.isFinite(stick.slashOffsetY) ? stick.slashOffsetY : 12);
  const originX = center.x + offsetX * direction;
  const originY = center.y - offsetY;
  const length = Number.isFinite(options.length) ? options.length : (Number.isFinite(stick.slashLength) ? stick.slashLength : (weapon?.slashLength ?? 420));
  const width = Number.isFinite(options.width) ? options.width : (Number.isFinite(stick.slashWidth) ? stick.slashWidth : 30);
  const ttl = Number.isFinite(options.ttl) ? options.ttl : (Number.isFinite(stick.slashDuration) ? stick.slashDuration : (weapon?.ttl ?? 220));
  const damage = Number.isFinite(options.damage) ? options.damage : (Number.isFinite(stick.slashDamage) ? stick.slashDamage : (stick.attack ?? weapon?.dmg ?? 40));
  const stickMargin = Number.isFinite(options.stickMargin) ? options.stickMargin : (Number.isFinite(stick.slashStickMargin) ? stick.slashStickMargin : 12);
  const xpPerHit = Number.isFinite(options.xpPerHit) ? options.xpPerHit : 12;
  const coreColor = options.coreColor || stick.slashCoreColor || weapon?.beamCoreColor;
  const edgeColor = options.edgeColor || stick.slashEdgeColor || weapon?.beamEdgeColor;
  const glowColor = options.glowColor || stick.slashGlowColor || weapon?.beamGlowColor;
  const projectileOpts = {
    origin: { x: originX, y: originY },
    angle: direction >= 0 ? 0 : Math.PI,
    length,
    beamWidth: width,
    damage,
    ttl,
    stickMargin,
    xpPerHit,
    coreColor,
    edgeColor,
    glowColor
  };
  if(options.hitOnce !== undefined) projectileOpts.hitOnce = options.hitOnce;
  const baseWeapon = weapon || { dmg: damage, element: stick.element, beamCoreColor: coreColor, beamEdgeColor: edgeColor, beamGlowColor: glowColor };
  return shootProjectile(stick, baseWeapon, 'mirageSlash', projectileOpts, world);
}

function spawnMirageAssassinClones(stick, options={}){
  if(!stick || stick.dead) return [];
  const world = stick.world;
  if(!world || typeof spawnSingleEnemy !== 'function') return [];
  const requestedCount = Math.max(1, Math.round(options.count ?? stick.cloneCount ?? 3));
  const maxCount = Number.isFinite(options.maxCount)
    ? Math.max(0, Math.round(options.maxCount))
    : requestedCount;
  const count = Math.min(requestedCount, maxCount);
  if(count <= 0) return [];
  const radius = Math.max(40, options.radius ?? stick.cloneSpawnRadius ?? 220);
  const lifetime = Math.max(1, options.lifetime ?? stick.cloneLifetime ?? 12);
  const attackMultiplier = Number.isFinite(options.attackMultiplier) ? options.attackMultiplier : (Number.isFinite(stick.cloneAttackMultiplier) ? stick.cloneAttackMultiplier : 0.7);
  const damageMultiplier = Number.isFinite(options.damageMultiplier) ? options.damageMultiplier : (Number.isFinite(stick.cloneDamageMultiplier) ? stick.cloneDamageMultiplier : 0.7);
  const anchor = options.anchor
    || (typeof stick.target === 'object' && stick.target && typeof stick.target.center === 'function' ? stick.target.center() : null)
    || (typeof stick.center === 'function' ? stick.center() : null);
  if(!anchor) return [];
  const originCenter = typeof stick.center === 'function' ? stick.center() : null;
  const bounds = typeof getActiveLevelBounds === 'function' ? getActiveLevelBounds(world) : null;
  const clones = [];
  const halfWidth = Number.isFinite(options.spawnHalfWidth) ? options.spawnHalfWidth : 18;
  const halfHeight = Number.isFinite(options.spawnHalfHeight) ? options.spawnHalfHeight : 56;
  const pad = Number.isFinite(TERRAIN_TILE_PADDING) ? TERRAIN_TILE_PADDING : 0;
  const tiles = typeof terrainTiles === 'function' ? terrainTiles(world) : [];
  const overlapsTerrain = (x, y)=>{
    if(!Array.isArray(tiles) || !tiles.length) return false;
    const rect = { left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y };
    for(const tile of tiles){
      if(!tile) continue;
      const left = (tile.x ?? 0) - pad;
      const right = left + (tile.w ?? 0) + pad * 2;
      const top = (tile.y ?? 0) - pad;
      const bottom = top + (tile.h ?? 0) + pad * 2;
      if(rect.right <= left || rect.left >= right || rect.bottom <= top || rect.top >= bottom) continue;
      return true;
    }
    return false;
  };
  const tooCloseToExisting = (x)=>{
    for(const clone of clones){
      if(!clone) continue;
      if(Math.abs((clone.homeX ?? clone.x ?? 0) - x) < halfWidth * 1.2) return true;
    }
    return false;
  };
  const baseAngle = Number.isFinite(options.baseAngle)
    ? options.baseAngle
    : (()=>{
        if(options.anchor && typeof options.anchorAngle === 'number') return options.anchorAngle;
        if(anchor && originCenter){
          return Math.atan2(anchor.y - originCenter.y, anchor.x - originCenter.x);
        }
        return stick.dir >= 0 ? Math.PI : 0;
      })();
  const spread = count > 1 ? (TAU / count) : TAU;
  const jitterRange = Number.isFinite(options.angleJitter) ? options.angleJitter : 0.45;
  for(let i=0;i<count;i++){
    let attempts = 0;
    let placed = false;
    while(attempts < 6 && !placed){
      attempts++;
      const jitter = typeof rand === 'function' ? rand(-jitterRange, jitterRange) : (Math.random() - 0.5) * 2 * jitterRange;
      const angle = baseAngle + spread * i + jitter;
      let spawnX = anchor.x + Math.cos(angle) * radius;
      if(bounds){
        const margin = 42;
        if(Number.isFinite(bounds.left)) spawnX = Math.max(bounds.left + margin, spawnX);
        if(Number.isFinite(bounds.right)) spawnX = Math.min(bounds.right - margin, spawnX);
      }
      if(tooCloseToExisting(spawnX)) continue;
      const ground = typeof groundHeightAt === 'function'
        ? groundHeightAt(world, spawnX, { surface: 'top', referenceY: anchor.y })
        : anchor.y;
      const spawnY = Number.isFinite(ground) ? ground - 30 : anchor.y;
      if(overlapsTerrain(spawnX, spawnY)) continue;
      const spawnSpec = {
        kind: 'mirageAssassinClone',
        weapon: 'mirageEdge',
        attack: Math.round((stick.attack ?? 80) * attackMultiplier),
        slashDamage: Math.round((stick.slashDamage ?? stick.attack ?? 80) * damageMultiplier),
        slashLength: stick.cloneSlashLength ?? stick.slashLength,
        slashWidth: stick.cloneSlashWidth ?? stick.slashWidth,
        slashDuration: stick.cloneSlashDuration ?? stick.slashDuration,
        slashCooldown: stick.cloneSlashCooldown ?? stick.slashCooldown,
        slashWindup: stick.cloneSlashWindup ?? stick.slashWindup,
        slashRecover: stick.cloneSlashRecover ?? stick.slashRecover,
        cloneLifetime: lifetime,
        mirageClone: true,
        offsetY: 0,
        y: spawnY
      };
      const clone = spawnSingleEnemy(world, spawnSpec, spawnX);
      if(clone){
        clone.homeX = spawnX;
        if(Number.isFinite(spawnY)) clone.homeY = spawnY;
        clone.mirageMaster = stick;
        clones.push(clone);
        placed = true;
      }
    }
  }
  return clones;
}

const ENEMY_BEHAVIORS = {
  skirmisher(stick, dt){
    const target = selectTargetFor(stick, 440, 720);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      stick.moveInput(Math.sign(dx));
      if(Math.abs(dx) <= (stick.attackRange || 160)){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      updateWander(stick, dt, 0.25);
    }
  },
  sentinel(stick){
    if(stick){
      selectTargetFor(stick, 520, 720);
      stick.moveInput(0);
    }
  },
  tricylicSlasher(stick, dt){
    if(!stick || !(dt > 0)) return;
    const pelvis = stick.pelvis();
    if(!pelvis) return;
    const center = typeof stick.center === 'function' ? stick.center() : { x: pelvis.x, y: pelvis.y };
    if(!center) return;
    const baseSpin = Number.isFinite(stick.tricylicBaseSpin) ? stick.tricylicBaseSpin : 2.8;
    const maxSpin = Number.isFinite(stick.tricylicMaxSpin) ? stick.tricylicMaxSpin : 18;
    const spinAccel = Number.isFinite(stick.tricylicSpinAccel) ? stick.tricylicSpinAccel : 6.8;
    const spinDecay = Number.isFinite(stick.tricylicSpinDecay) ? stick.tricylicSpinDecay : 4.2;
    const chargeThreshold = Number.isFinite(stick.tricylicChargeTime) ? stick.tricylicChargeTime : 5;
    const dashSpeed = Number.isFinite(stick.tricylicDashSpeed) ? stick.tricylicDashSpeed : 880;
    const dashDuration = Number.isFinite(stick.tricylicDashDuration) ? stick.tricylicDashDuration : 0.55;
    const dashCooldown = Number.isFinite(stick.tricylicDashCooldown) ? stick.tricylicDashCooldown : 2.6;
    const windupTime = Number.isFinite(stick.tricylicWindup) ? stick.tricylicWindup : 0.58;
    const relaxRate = Number.isFinite(stick.tricylicRelaxRate) ? stick.tricylicRelaxRate : 1.35;
    const detectRange = Math.max(520, Number.isFinite(stick.attackRange) ? stick.attackRange : 720);
    const dropRange = detectRange + 280;
    const state = stick._tricylicState || (stick._tricylicState = {
      spinPhase: Math.random() * TAU,
      spinSpeed: baseSpin,
      minSpin: baseSpin,
      maxSpin,
      charge: 0,
      dashPhase: 'idle',
      dashCooldown: 0,
      trail: [],
      trailDistance: 0,
      highlight: 0
    });
    state.minSpin = Number.isFinite(state.minSpin) ? state.minSpin : baseSpin;
    state.maxSpin = Number.isFinite(state.maxSpin) ? state.maxSpin : maxSpin;
    state.spinSpeed = Number.isFinite(state.spinSpeed) ? state.spinSpeed : baseSpin;
    state.highlight = Math.max(0, (state.highlight || 0) - dt * 1.6);
    state.dashCooldown = Math.max(0, (state.dashCooldown || 0) - dt);
    if(!Array.isArray(state.trail)) state.trail = [];
    for(const entry of state.trail){
      if(!entry) continue;
      entry.life = (entry.life || 0) + dt;
    }
    state.trail = state.trail.filter(entry => entry && entry.life <= 0.4);
    stick.moveInput(0);

    const target = selectTargetFor(stick, detectRange, dropRange);
    let los = false;
    let dashDir = null;
    if(target){
      const tc = target.center();
      if(tc){
        const dx = tc.x - center.x;
        const dy = tc.y - center.y;
        const dist = Math.hypot(dx, dy);
        if(dist > 0 && dist <= detectRange){
          if(!raycastEnvironment || dist <= 4){
            los = true;
          }else{
            const dir = { x: dx / dist, y: dy / dist };
            const rects = stick._solidRectangles();
            const hit = raycastEnvironment(center, dir, dist, rects);
            los = !hit;
          }
          if(los){
            dashDir = { x: dx / dist, y: dy / dist };
            state.lastLosDir = dashDir;
          }
        }
        stick.dir = tc.x >= center.x ? 1 : -1;
      }
    }
    if(!dashDir && state.lastLosDir){
      dashDir = { x: state.lastLosDir.x, y: state.lastLosDir.y };
    }
    if(!dashDir && state.dashDir){
      dashDir = { x: state.dashDir.x, y: state.dashDir.y };
    }

    const advanceTrail = (position, distance)=>{
      if(!position) return;
      state.trailDistance = (state.trailDistance || 0) + (distance || 0);
      if(state.trail.length === 0){
        state.trail.push({ x: position.x, y: position.y, life: 0 });
        state.trailDistance = 0;
        return;
      }
      const spacing = 6;
      while(state.trailDistance >= spacing){
        state.trail.push({ x: position.x, y: position.y, life: 0 });
        state.trailDistance -= spacing;
      }
    };

    if(Array.isArray(stick.points) && state.dashPhase !== 'dash'){
      for(const point of stick.points){
        if(!point) continue;
        point.vx = 0;
        point.vy = 0;
      }
    }

    if(state.dashPhase === 'dash'){
      if(!dashDir){
        state.dashPhase = 'recover';
        state.recoverTimer = 0.7;
      }else{
        const travel = Math.max(0, dashSpeed * dt);
        let desired = travel;
        if(raycastEnvironment && desired > 0){
          const rects = stick._solidRectangles();
          const hit = raycastEnvironment(center, dashDir, desired + 12, rects);
          if(hit && Number.isFinite(hit.distance)){
            desired = Math.max(0, Math.min(desired, hit.distance - 8));
            if(desired <= 0){
              state.dashPhase = 'recover';
              state.recoverTimer = 0.7;
            }
          }
        }
        if(desired > 0){
          const translation = stick._translatePoints(dashDir.x * desired, dashDir.y * desired);
          const movedX = Number.isFinite(translation?.dx) ? translation.dx : dashDir.x * desired;
          const movedY = Number.isFinite(translation?.dy) ? translation.dy : dashDir.y * desired;
          const moved = Math.hypot(movedX, movedY);
          const newCenter = typeof stick.center === 'function' ? stick.center() : { x: pelvis.x, y: pelvis.y };
          advanceTrail(newCenter, moved);
          stick.tryAttack(newCenter.x + dashDir.x * 24, newCenter.y + dashDir.y * 24);
        }
        state.dashTimer = (state.dashTimer || dashDuration) - dt;
        state.highlight = 1;
        state.spinPhase += state.spinSpeed * dt;
        if(state.dashTimer <= 0){
          state.dashPhase = 'recover';
          state.recoverTimer = 0.75;
          state.dashCooldown = Math.max(state.dashCooldown, dashCooldown);
          state.charge = 0;
        }
      }
      return;
    }

    if(state.dashPhase === 'windup'){
      if(dashDir){
        const targetAngle = Math.atan2(dashDir.y, dashDir.x);
        const current = normalizeRadians(state.spinPhase);
        const diff = shortestAngleDiff(current, targetAngle);
        const alignRate = Math.max(state.spinSpeed, 10);
        state.spinPhase += clamp(diff, -alignRate * dt, alignRate * dt);
      }
      state.spinSpeed = Math.min(maxSpin, state.spinSpeed + spinAccel * dt * 1.4);
      state.windupTimer = (state.windupTimer || windupTime) - dt;
      state.highlight = Math.max(state.highlight, 0.8);
      state.spinPhase += state.spinSpeed * dt;
      if(state.windupTimer <= 0){
        state.dashPhase = 'dash';
        state.dashTimer = dashDuration;
        state.trail.length = 0;
        state.trailDistance = 0;
        advanceTrail(typeof stick.center === 'function' ? stick.center() : center, 0);
      }
      return;
    }

    if(state.dashPhase === 'recover'){
      state.recoverTimer = (state.recoverTimer || 0.7) - dt;
      state.spinSpeed = Math.max(state.minSpin, state.spinSpeed - spinDecay * dt * 0.6);
      state.spinPhase += state.spinSpeed * dt;
      if(state.recoverTimer <= 0){
        state.dashPhase = 'idle';
      }
      return;
    }

    if(los){
      state.spinSpeed = Math.min(maxSpin, state.spinSpeed + spinAccel * dt);
      state.charge = Math.min(chargeThreshold, (state.charge || 0) + dt);
      state.highlight = Math.max(state.highlight, Math.min(0.85, state.spinSpeed / maxSpin));
    }else{
      state.spinSpeed = Math.max(state.minSpin, state.spinSpeed - spinDecay * dt);
      state.charge = Math.max(0, (state.charge || 0) - dt * relaxRate);
    }
    state.spinPhase += state.spinSpeed * dt;
    if(los && state.charge >= chargeThreshold && state.dashCooldown <= 0 && dashDir){
      state.dashPhase = 'windup';
      state.windupTimer = windupTime;
      state.dashDir = dashDir;
      state.highlight = 0.9;
      state.charge = chargeThreshold * 0.35;
    }
  },
  striker(stick, dt){
    const target = selectTargetFor(stick, 520, 780);
    stick.specialTimer = Math.max(0, stick.specialTimer - dt);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist > (stick.attackRange || 180)){
        const burst = stick.specialTimer <= 0 && stick.pelvis().grounded;
        const mult = burst ? 1.6 : 1.1;
        stick.moveInput(Math.sign(dx) * mult);
        if(burst){ stick.specialTimer = 1.4; }
      }else{
        stick.moveInput(Math.sign(dx) * 0.6);
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      updateWander(stick, dt, 0.45);
    }
  },
  ranger(stick, dt){
    const target = selectTargetFor(stick, 560, 780);
    const pref = stick.preferredRange || 320;
    const range = stick.attackRange || 480;
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist < pref * 0.75){
        stick.moveInput(-Math.sign(dx) * 0.6);
      }else if(dist > pref * 1.2){
        stick.moveInput(Math.sign(dx) * 0.45);
      }else{
        stick.moveInput(0);
      }
      if(dist <= range){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      approachHome(stick, 0.18);
    }
  },
  psiRanger(stick, dt){
    if(!stick || !(dt > 0)) return;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    if(!pelvis){
      ENEMY_BEHAVIORS.ranger(stick, dt);
      return;
    }
    const state = stick._psiRangerState || (stick._psiRangerState = {
      phase: 'ground',
      cooldown: 0,
      recover: 0,
      floatTimer: 0,
      floatY: null,
      shotFired: false,
      volleyFired: false,
      jumpDir: 0
    });
    state.cooldown = Math.max(0, (state.cooldown || 0) - dt);
    state.recover = Math.max(0, (state.recover || 0) - dt);
    const target = selectTargetFor(stick, 620, 860);
    const pref = stick.preferredRange || 340;
    const range = stick.attackRange || 560;
    const floatDuration = Number.isFinite(stick.psiFloatDuration) ? stick.psiFloatDuration : 1.1;
    const hoverForce = Number.isFinite(stick.psiFloatHoverForce) ? stick.psiFloatHoverForce : 24000;
    const hoverDamp = Number.isFinite(stick.psiFloatHoverDamp) ? stick.psiFloatHoverDamp : 3400;
    const cooldownDuration = Number.isFinite(stick.psiDiveCooldown) ? stick.psiDiveCooldown : 1.9;
    const rangeBias = Number.isFinite(stick.psiFloatRangeBias) ? stick.psiFloatRangeBias : 0.85;
    const groundMove = ()=>{
      if(target){
        const tc = target.center();
        const dx = tc.x - stick.center().x;
        const dist = Math.abs(dx);
        if(dist < pref * 0.75){
          stick.moveInput(-Math.sign(dx) * 0.6);
        }else if(dist > pref * 1.15){
          stick.moveInput(Math.sign(dx) * 0.5);
        }else{
          stick.moveInput(0);
        }
      }else{
        approachHome(stick, 0.2);
      }
    };
    const advanceToFloat = ()=>{
      state.phase = 'float';
      state.floatTimer = floatDuration;
      state.floatY = pelvis.y;
      state.shotFired = false;
      state.volleyFired = false;
      if(stick.isBoss){
        state.volleyFired = spawnPsiFloatArrowVolley(stick);
      }
    };
    switch(state.phase){
      case 'ground':
      default:
        state.phase = 'ground';
        groundMove();
        if(target && pelvis.grounded && state.cooldown <= 0){
          const tc = target.center();
          if(tc){
            const dx = tc.x - stick.center().x;
            const dist = Math.abs(dx);
            const minRange = pref * rangeBias;
            if(dist >= minRange && dist <= range * 1.2){
              const dir = Math.sign(dx) || stick.dir || 1;
              const runForce = stick.moveForce || 4200;
              pelvis.addForce(dir * runForce * 0.6, 0);
              const leap = stick.leapStrength || 120000;
              pelvis.addForce(0, -leap);
              stick.groundTime = 0;
              stick.airTime = 0;
              state.phase = 'ascend';
              state.floatTimer = floatDuration;
              state.floatY = pelvis.y;
              state.shotFired = false;
              state.volleyFired = false;
              state.jumpDir = dir;
            }
          }
        }
        break;
      case 'ascend':
        if(target){
          const tc = target.center();
          if(tc){
            const dx = tc.x - stick.center().x;
            const drift = clamp(dx / 260, -1, 1);
            stick.moveInput(drift * 0.4);
          }
        }else{
          stick.moveInput(state.jumpDir * 0.2);
        }
        state.floatY = Math.min(state.floatY ?? pelvis.y, pelvis.y);
        if(pelvis.vy >= -80){
          advanceToFloat();
        }
        break;
      case 'float':
        if(state.floatY === null) state.floatY = pelvis.y;
        const targetY = state.floatY;
        const vy = pelvis.vy || 0;
        const error = targetY - pelvis.y;
        pelvis.addForce(0, error * hoverForce - vy * hoverDamp);
        if(stick.isBoss && !state.volleyFired){
          state.volleyFired = spawnPsiFloatArrowVolley(stick);
        }
        if(target){
          const tc = target.center();
          if(tc){
            const dx = tc.x - stick.center().x;
            const dist = Math.abs(dx);
            const drift = clamp(dx / 300, -1, 1);
            stick.moveInput(drift * 0.38);
            if(!state.shotFired && dist <= range * 1.05){
              stick.tryAttack(tc.x, tc.y);
              state.shotFired = true;
              state.floatTimer = Math.min(state.floatTimer, floatDuration * 0.45);
            }
          }else{
            stick.moveInput(0);
          }
        }else{
          stick.moveInput(0);
        }
        state.floatTimer = Math.max(0, (state.floatTimer || floatDuration) - dt);
        if(state.floatTimer <= 0){
          state.phase = 'descend';
        }
        break;
      case 'descend':
        if(target){
          const tc = target.center();
          if(tc){
            const dx = tc.x - stick.center().x;
            stick.moveInput(Math.sign(dx) * 0.3);
          }
        }else{
          stick.moveInput(state.jumpDir * 0.2);
        }
        if(pelvis.grounded){
          state.phase = 'recover';
          state.recover = Math.max(state.recover, 0.5);
          state.cooldown = cooldownDuration;
          state.floatY = null;
          state.shotFired = false;
        }
        break;
      case 'recover':
        groundMove();
        if(state.recover <= 0){
          state.phase = 'ground';
        }
        break;
    }
  },
  epsilonCryomancer(stick, dt){
    if(!stick || !(dt > 0)) return;
    const world = stick.world;
    const detect = Math.max(560, Number.isFinite(stick.attackRange) ? stick.attackRange : 640);
    const drop = detect + 320;
    const target = selectTargetFor(stick, detect, drop);
    const pref = Number.isFinite(stick.preferredRange) ? stick.preferredRange : 420;
    const range = Number.isFinite(stick.attackRange) ? stick.attackRange : 640;
    const volleySize = Math.max(1, Math.round(stick.iceVolleySize ?? 3));
    const spacing = Number.isFinite(stick.iceVolleySpacing) ? stick.iceVolleySpacing : 140;
    const interval = Math.max(0.1, stick.iceVolleyInterval ?? 0.42);
    const warmup = Math.max(0, stick.iceVolleyWarmup ?? 0.75);
    const recovery = Math.max(0.2, stick.iceVolleyRecovery ?? 2.4);
    const cooldown = Math.max(0.2, stick.iceVolleyCooldown ?? 3.2);
    const chargeTime = Math.max(0, stick.icePillarChargeTime ?? 0.65);
    const pillarDamage = Number.isFinite(stick.icePillarDamage) ? stick.icePillarDamage : (stick.attack || 40);
    const pillarRadius = Number.isFinite(stick.icePillarRadius) ? stick.icePillarRadius : 56;
    const pillarHeight = Number.isFinite(stick.icePillarHeight) ? stick.icePillarHeight : 150;
    const pillarDuration = Math.max(600, stick.icePillarDuration ?? 2100);
    const slowMultiplier = stick.icePillarSlowMultiplier ?? 0.45;
    const slowDuration = stick.icePillarSlowDuration ?? 1800;
    const tickInterval = Math.max(0.08, stick.icePillarTickInterval ?? 0.28);
    if(!stick.bossState){
      stick.bossState = { phase: 'stalk', cooldown, timer: 0, volleyTimer: 0, shots: 0, positions: null, anchor: null };
    }
    const state = stick.bossState;
    state.cooldown = Math.max(0, (state.cooldown ?? 0) - dt);
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    stick.weaponVisible = false;
    if(!target){
      state.phase = 'stalk';
      state.positions = null;
      state.anchor = null;
      if(state.cooldown < cooldown * 0.5) state.cooldown = Math.max(state.cooldown, cooldown * 0.25);
      approachHome(stick, 0.18);
      return;
    }
    const tc = target.center();
    if(!tc){
      approachHome(stick, 0.18);
      return;
    }
    const sc = stick.center();
    const dx = tc.x - sc.x;
    const dist = Math.abs(dx);
    stick.dir = dx >= 0 ? 1 : -1;
    const bounds = typeof getActiveLevelBounds === 'function' ? getActiveLevelBounds(world) : null;
    const leftLimit = bounds && Number.isFinite(bounds.left) ? bounds.left + pillarRadius * 0.65 : -Infinity;
    const rightLimit = bounds && Number.isFinite(bounds.right) ? bounds.right - pillarRadius * 0.65 : Infinity;
    const computePositions = (anchorX)=>{
      const anchor = Number.isFinite(anchorX) ? anchorX : tc.x;
      const positions = [];
      const half = (volleySize - 1) / 2;
      for(let i=0;i<volleySize;i++){
        let px = anchor + (i - half) * spacing;
        if(Number.isFinite(leftLimit)) px = Math.max(leftLimit, px);
        if(Number.isFinite(rightLimit)) px = Math.min(rightLimit, px);
        positions.push(px);
      }
      return positions;
    };
    switch(state.phase){
      case 'stalk':
      default:
        state.phase = 'stalk';
        if(dist < pref * 0.75){
          stick.moveInput(-Math.sign(dx) * 0.6);
        }else if(dist > pref * 1.2){
          stick.moveInput(Math.sign(dx) * 0.5);
        }else{
          const strafe = Math.sin(stick.specialTimer * 1.6);
          stick.moveInput(strafe * 0.32);
        }
        if(dist <= range && state.cooldown <= 0){
          state.phase = 'windup';
          state.timer = warmup;
          state.shots = volleySize;
          state.anchor = tc.x;
          state.positions = computePositions(state.anchor);
          state.volleyTimer = 0;
        }
        break;
      case 'windup':
        stick.moveInput(0);
        state.timer = Math.max(0, (state.timer ?? warmup) - dt);
        state.anchor = state.anchor !== null && state.anchor !== undefined
          ? state.anchor + (tc.x - state.anchor) * 0.18
          : tc.x;
        state.positions = computePositions(state.anchor);
        if(state.timer <= 0){
          state.phase = 'volley';
          state.volleyTimer = 0;
        }
        break;
      case 'volley':
        stick.moveInput(0);
        state.volleyTimer = (state.volleyTimer || 0) - dt;
        if(state.shots > 0 && state.volleyTimer <= 0){
          const spawnIndex = Math.min(state.positions ? state.positions.length - 1 : 0, (volleySize - state.shots));
          const pillarX = state.positions && state.positions.length ? state.positions[spawnIndex] : tc.x;
          if(typeof spawnIcePillar === 'function'){
            spawnIcePillar(world, stick, pillarX, {
              damage: pillarDamage,
              radius: pillarRadius,
              height: pillarHeight,
              chargeTime,
              duration: pillarDuration,
              slowMultiplier,
              slowDuration,
              tickInterval,
              telegraphColor: '#9fdcff',
              pillarColor: '#d9f3ff'
            });
          }
          state.shots -= 1;
          state.volleyTimer = interval;
        }
        if(state.shots <= 0 && state.volleyTimer <= 0){
          state.phase = 'recover';
          state.timer = recovery;
          state.cooldown = cooldown;
          state.positions = null;
          state.anchor = null;
        }
        break;
      case 'recover':
        const recoverStrafe = Math.sin(stick.specialTimer * 1.2);
        stick.moveInput(recoverStrafe * 0.24);
        state.timer = Math.max(0, (state.timer ?? recovery) - dt);
        if(state.timer <= 0){
          state.phase = 'stalk';
        }
        break;
    }
  },
  phiSunPriest(stick, dt){
    if(!stick || !(dt > 0)) return;
    const world = stick.world;
    const detect = Math.max(640, Number.isFinite(stick.attackRange) ? stick.attackRange : 720);
    const drop = detect + 360;
    const target = selectTargetFor(stick, detect, drop);
    const pref = Number.isFinite(stick.preferredRange) ? stick.preferredRange : 420;
    const range = Number.isFinite(stick.attackRange) ? stick.attackRange : 720;
    const vanishDuration = Math.max(0.2, stick.vanishDuration ?? 0.65);
    const reappearDuration = Math.max(0.12, stick.reappearDuration ?? 0.45);
    const vanishCooldown = Math.max(1, stick.vanishCooldown ?? 3.6);
    const cageCooldown = Math.max(2.4, stick.cageCooldown ?? 8.2);
    const cageBlockSize = Math.max(24, stick.cageBlockSize ?? 36);
    const cageHealth = Math.max(80, stick.cageHealth ?? 260);
    const teleportRadius = Math.max(160, stick.teleportRadius ?? 320);
    const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
    const weapon = weaponId && typeof WEAPONS === 'object' ? WEAPONS[weaponId] : null;
    const defaultBurst = weapon && Number.isFinite(weapon.burstCount) ? weapon.burstCount : 4;
    const burstShots = Math.max(3, Math.round(stick.burstShots ?? defaultBurst ?? 4));
    const burstInterval = Math.max(0.1, stick.burstInterval ?? 0.28);
    const lightColor = stick.lightBurstColor || 'rgba(255, 232, 176, 0.9)';
    if(!stick.bossState){
      stick.bossState = {
        phase: 'stalk',
        cooldown: vanishCooldown,
        vanishTimer: 0,
        reappearTimer: 0,
        barrageTimer: 0,
        shotsRemaining: 0,
        cageTimer: 0,
        teleportTarget: null,
        cageReady: true
      };
    }
    const state = stick.bossState;
    state.cooldown = Math.max(0, (state.cooldown ?? 0) - dt);
    state.cageTimer = Math.max(0, (state.cageTimer ?? 0) - dt);
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    const sc = typeof stick.center === 'function' ? stick.center() : null;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    const computeTeleportTarget = ()=>{
      const anchor = target && typeof target.center === 'function' ? target.center() : sc;
      if(!anchor){
        if(pelvis) return { x: pelvis.x, y: pelvis.y };
        return null;
      }
      let direction = 0;
      if(sc && target){
        direction = sc.x >= anchor.x ? 1 : -1;
        if(Math.abs(sc.x - anchor.x) < 60) direction = (Math.random() < 0.5 ? -1 : 1);
      }else{
        direction = Math.random() < 0.5 ? -1 : 1;
      }
      const distance = teleportRadius * (0.75 + Math.random() * 0.35);
      let x = anchor.x + direction * distance;
      const bounds = typeof getActiveLevelBounds === 'function' ? getActiveLevelBounds(world) : null;
      if(bounds){
        const margin = 48;
        if(Number.isFinite(bounds.left)) x = Math.max(bounds.left + margin, x);
        if(Number.isFinite(bounds.right)) x = Math.min(bounds.right - margin, x);
      }
      let ground = typeof groundHeightAt === 'function' ? groundHeightAt(world, x, { surface: 'top', referenceY: anchor.y }) : null;
      if(!Number.isFinite(ground) && pelvis) ground = pelvis.y;
      const y = Number.isFinite(ground) ? ground - 40 : (pelvis ? pelvis.y : anchor.y);
      return { x, y };
    };
    let alpha = 1;
    switch(state.phase){
      case 'stalk':
      default:
        alpha = 1;
        if(!target){
          stick.weaponVisible = true;
          stick.invulnerable = false;
          approachHome(stick, 0.22);
          break;
        }
        if(sc){
          const tc = target.center();
          if(tc){
            const dx = tc.x - sc.x;
            const dist = Math.abs(dx);
            stick.dir = dx >= 0 ? 1 : -1;
            if(dist < pref * 0.85){
              stick.moveInput(-Math.sign(dx) * 0.6);
            }else if(dist > pref * 1.25){
              stick.moveInput(Math.sign(dx) * 0.5);
            }else{
              const strafe = Math.sin(stick.specialTimer * 2.6);
              stick.moveInput(strafe * 0.32);
            }
            if(dist <= range && state.cooldown <= 0){
              state.phase = 'vanish';
              state.vanishTimer = vanishDuration;
              state.teleportTarget = computeTeleportTarget();
              state.reappearTimer = reappearDuration;
              state.shotsRemaining = burstShots;
              state.barrageTimer = 0;
              state.cageReady = state.cageTimer <= 0;
              if(typeof spawnTemporalRipple === 'function'){
                spawnTemporalRipple(world, sc.x, sc.y, lightColor);
              }
            }
          }else{
            stick.moveInput(0);
          }
        }
        stick.weaponVisible = true;
        stick.invulnerable = false;
        break;
      case 'vanish':
        stick.weaponVisible = false;
        stick.invulnerable = true;
        stick.moveInput(0);
        state.vanishTimer = Math.max(0, (state.vanishTimer ?? vanishDuration) - dt);
        alpha = vanishDuration > 0 ? clamp(state.vanishTimer / vanishDuration, 0, 1) : 0;
        if(state.vanishTimer <= 0){
          const dest = state.teleportTarget;
          if(dest){
            stick.warpTo(dest.x, dest.y);
            const postPelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
            if(postPelvis) postPelvis.vy = 0;
            if(typeof spawnTemporalRipple === 'function'){
              spawnTemporalRipple(world, dest.x, dest.y, lightColor);
            }
          }
          state.phase = 'reappear';
          state.reappearTimer = reappearDuration;
        }
        break;
      case 'reappear':
        stick.weaponVisible = false;
        stick.invulnerable = true;
        stick.moveInput(0);
        state.reappearTimer = Math.max(0, (state.reappearTimer ?? reappearDuration) - dt);
        alpha = reappearDuration > 0 ? clamp(1 - state.reappearTimer / reappearDuration, 0, 1) : 1;
        if(state.reappearTimer <= 0){
          alpha = 1;
          if(state.cageReady && target){
            state.phase = 'cage';
          }else{
            state.phase = 'barrage';
          }
        }
        break;
      case 'cage':
        alpha = 1;
        stick.weaponVisible = true;
        stick.invulnerable = false;
        stick.moveInput(0);
        if(target){
          const tc = target.center();
          const targetPelvis = typeof target.pelvis === 'function' ? target.pelvis() : null;
          const cageCenterY = targetPelvis ? targetPelvis.y - cageBlockSize * 0.5 : (tc ? tc.y : (sc ? sc.y : 0));
          if(typeof spawnSandstonePrison === 'function' && tc){
            spawnSandstonePrison(world, tc.x, cageCenterY, {
              blockSize: cageBlockSize,
              health: cageHealth,
              requiredDamageKind: ['physical', 'fire', 'ice', 'light', 'chronometric', 'war', 'void', 'necrotic', 'life', 'explosive']
            });
            if(typeof spawnTemporalRipple === 'function'){
              spawnTemporalRipple(world, tc.x, cageCenterY, lightColor);
            }
          }
        }
        state.cageReady = false;
        state.cageTimer = cageCooldown;
        state.phase = 'barrage';
        break;
      case 'barrage':
        alpha = 1;
        stick.weaponVisible = true;
        stick.invulnerable = false;
        if(!target){
          state.phase = 'recover';
          state.timer = 1.1;
          stick.moveInput(0);
          break;
        }
        if(sc){
          const tc = target.center();
          if(tc){
            const dx = tc.x - sc.x;
            stick.dir = dx >= 0 ? 1 : -1;
          }
        }
        const strafe = Math.sin(stick.specialTimer * 3.1);
        stick.moveInput(strafe * 0.32);
        state.barrageTimer = (state.barrageTimer || 0) - dt;
        const targetCenter = target.center();
        if(state.shotsRemaining > 0 && state.barrageTimer <= 0 && targetCenter){
          stick.tryAttack(targetCenter.x, targetCenter.y - 20);
          if(typeof spawnTemporalRipple === 'function' && sc){
            spawnTemporalRipple(world, sc.x, sc.y - 20, lightColor);
          }
          state.shotsRemaining -= 1;
          state.barrageTimer = burstInterval;
        }
        if(state.shotsRemaining <= 0){
          state.phase = 'recover';
          state.timer = 1.2;
        }
        break;
      case 'recover':
        alpha = 1;
        stick.weaponVisible = true;
        stick.invulnerable = false;
        state.timer = Math.max(0, (state.timer ?? 1.2) - dt);
        const recoverStrafe = Math.sin(stick.specialTimer * 2.4);
        stick.moveInput(recoverStrafe * 0.28);
        if(state.timer <= 0){
          state.phase = 'stalk';
          state.cooldown = vanishCooldown;
        }
        break;
    }
    stick.renderAlpha = clamp(alpha, 0, 1);
    if(state.phase !== 'vanish' && state.phase !== 'reappear'){
      stick.renderAlpha = 1;
    }
    stick.invulnerable = state.phase === 'vanish' || state.phase === 'reappear';
    if(!target && state.phase !== 'vanish' && state.phase !== 'reappear'){
      approachHome(stick, 0.2);
    }
  },
  mirageAssassin(stick, dt){
    if(!stick || !(dt > 0)) return;
    const world = stick.world;
    const detect = Math.max(560, Number.isFinite(stick.attackRange) ? stick.attackRange : 600);
    const drop = detect + 360;
    const target = selectTargetFor(stick, detect, drop);
    const pref = Number.isFinite(stick.preferredRange) ? stick.preferredRange : 320;
    const slashCooldownBase = Math.max(0.6, stick.slashCooldown ?? 2.4);
    const slashWindup = Math.max(0.18, stick.slashWindup ?? 0.55);
    const slashRecover = Math.max(0.2, stick.slashRecover ?? 1.05);
    const cloneCooldownBase = Math.max(4, stick.cloneCooldown ?? 9.5);
    const cloneCooldownJitter = Number.isFinite(stick.cloneCooldownJitter) ? stick.cloneCooldownJitter : 1.4;
    const maxClones = Math.max(0, Math.round(stick.cloneMaxCount ?? 4));
    const cloneCount = Math.max(1, Math.round(stick.cloneCount ?? 3));
    const cloneRadius = Math.max(60, stick.cloneSpawnRadius ?? 220);
    const cloneLifetime = Math.max(1, stick.cloneLifetime ?? 12);
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    stick.weaponVisible = false;
    if(!stick.bossState){
      stick.bossState = {
        phase: 'stalk',
        slashCooldown: slashCooldownBase * 0.5,
        cloneCooldown: cloneCooldownBase * 0.6,
        timer: 0,
        slashDir: 1,
        clones: []
      };
    }
    const state = stick.bossState;
    state.slashCooldown = Math.max(0, (state.slashCooldown ?? 0) - dt);
    state.cloneCooldown = Math.max(0, (state.cloneCooldown ?? 0) - dt);
    if(Array.isArray(state.clones)){
      state.clones = state.clones.filter(entry => entry && !entry.dead);
    }else{
      state.clones = [];
    }
    const clonesAlive = state.clones.length;
    if(!target){
      stick.moveInput(0);
      approachHome(stick, 0.2);
      if(state.phase !== 'stalk') state.phase = 'stalk';
      return;
    }
    const sc = typeof stick.center === 'function' ? stick.center() : null;
    const tc = typeof target.center === 'function' ? target.center() : null;
    if(!sc || !tc){
      stick.moveInput(0);
      return;
    }
    const dx = tc.x - sc.x;
    const dist = Math.abs(dx);
    stick.dir = dx >= 0 ? 1 : -1;
    switch(state.phase){
      case 'summon':
        stick.moveInput(0);
        state.timer = Math.max(0, (state.timer ?? 0) - dt);
        if(state.timer <= 0){
          const clones = spawnMirageAssassinClones(stick, {
            count: cloneCount,
            maxCount: Math.max(0, maxClones - clonesAlive),
            radius: cloneRadius,
            lifetime: cloneLifetime,
            attackMultiplier: stick.cloneAttackMultiplier,
            damageMultiplier: stick.cloneDamageMultiplier
          });
          if(Array.isArray(clones) && clones.length){
            state.clones.push(...clones);
          }
          const jitter = cloneCooldownJitter
            ? (typeof rand === 'function'
              ? rand(-cloneCooldownJitter, cloneCooldownJitter)
              : (Math.random() - 0.5) * 2 * cloneCooldownJitter)
            : 0;
          state.cloneCooldown = cloneCooldownBase + jitter;
          state.phase = 'recover';
          state.timer = Math.max(0.4, stick.cloneRecover ?? 0.8);
        }
        break;
      case 'windup':
        stick.moveInput(0);
        state.timer = Math.max(0, (state.timer ?? slashWindup) - dt);
        if(state.timer <= 0){
          spawnMirageSlash(stick, {
            direction: state.slashDir,
            length: stick.slashLength,
            width: stick.slashWidth,
            damage: stick.slashDamage,
            ttl: stick.slashDuration,
            stickMargin: stick.slashStickMargin,
            xpPerHit: 18
          });
          state.phase = 'recover';
          state.timer = slashRecover;
          state.slashCooldown = slashCooldownBase;
        }
        break;
      case 'recover':
        {
          const strafe = Math.sin(stick.specialTimer * 2.8);
          stick.moveInput(strafe * 0.3);
          state.timer = Math.max(0, (state.timer ?? 0.6) - dt);
          if(state.timer <= 0){
            state.phase = 'stalk';
          }
        }
        break;
      case 'stalk':
      default:
        if(dist < pref * 0.75){
          stick.moveInput(-Math.sign(dx) * 0.65);
        }else if(dist > pref * 1.25){
          stick.moveInput(Math.sign(dx) * 0.55);
        }else{
          const strafe = Math.sin(stick.specialTimer * 3.2);
          stick.moveInput(strafe * 0.36);
        }
        if(clonesAlive < maxClones && state.cloneCooldown <= 0){
          state.phase = 'summon';
          state.timer = Math.max(0.35, stick.cloneWindup ?? 0.65);
        }else if(dist <= detect && state.slashCooldown <= 0){
          state.phase = 'windup';
          state.timer = slashWindup;
          state.slashDir = dx >= 0 ? 1 : -1;
        }
        break;
    }
  },
  mirageAssassinClone(stick, dt){
    if(!stick || !(dt > 0)) return;
    const world = stick.world;
    const detect = Math.max(480, Number.isFinite(stick.attackRange) ? stick.attackRange : 420);
    const drop = detect + 240;
    const target = selectTargetFor(stick, detect, drop);
    const pref = Number.isFinite(stick.preferredRange) ? stick.preferredRange : 220;
    const slashCooldownBase = Math.max(0.6, stick.slashCooldown ?? 2.2);
    const slashWindup = Math.max(0.12, stick.slashWindup ?? 0.4);
    const slashRecover = Math.max(0.18, stick.slashRecover ?? 0.6);
    if(!stick.cloneState){
      const initialCooldown = typeof rand === 'function'
        ? rand(0.1, slashCooldownBase * 0.6)
        : Math.random() * slashCooldownBase * 0.6;
      stick.cloneState = {
        phase: 'stalk',
        timer: 0,
        slashCooldown: initialCooldown,
        slashDir: stick.dir >= 0 ? 1 : -1,
        lifetime: Math.max(0, stick.cloneLifetime ?? 10)
      };
    }
    const state = stick.cloneState;
    state.slashCooldown = Math.max(0, (state.slashCooldown ?? 0) - dt);
    if(Number.isFinite(state.lifetime)){
      state.lifetime -= dt;
      if(state.lifetime <= 0){
        stick.hp = 0;
        stick.die(null);
        return;
      }
    }
    stick.weaponVisible = false;
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    if(!target){
      stick.moveInput(0);
      approachHome(stick, 0.28);
      return;
    }
    const sc = typeof stick.center === 'function' ? stick.center() : null;
    const tc = typeof target.center === 'function' ? target.center() : null;
    if(!sc || !tc){
      stick.moveInput(0);
      return;
    }
    const dx = tc.x - sc.x;
    const dist = Math.abs(dx);
    stick.dir = dx >= 0 ? 1 : -1;
    switch(state.phase){
      case 'windup':
        stick.moveInput(0);
        state.timer = Math.max(0, (state.timer ?? slashWindup) - dt);
        if(state.timer <= 0){
          spawnMirageSlash(stick, {
            direction: state.slashDir,
            length: stick.slashLength,
            width: stick.slashWidth,
            damage: stick.slashDamage ?? stick.attack,
            ttl: stick.slashDuration,
            stickMargin: stick.slashStickMargin,
            xpPerHit: 6
          });
          state.phase = 'recover';
          state.timer = slashRecover;
          state.slashCooldown = slashCooldownBase;
        }
        break;
      case 'recover':
        {
          const strafe = Math.sin(stick.specialTimer * 4.1);
          stick.moveInput(strafe * 0.44);
          state.timer = Math.max(0, (state.timer ?? slashRecover) - dt);
          if(state.timer <= 0){
            state.phase = 'stalk';
          }
        }
        break;
      case 'stalk':
      default:
        if(dist < pref * 0.7){
          stick.moveInput(-Math.sign(dx) * 0.8);
        }else if(dist > pref * 1.2){
          stick.moveInput(Math.sign(dx) * 0.65);
        }else{
          const strafe = Math.sin(stick.specialTimer * 3.8);
          stick.moveInput(strafe * 0.48);
        }
        if(dist <= detect && state.slashCooldown <= 0){
          state.phase = 'windup';
          state.timer = slashWindup;
          state.slashDir = dx >= 0 ? 1 : -1;
        }
        break;
    }
  },
  caster(stick, dt){
    const target = selectTargetFor(stick, 520, 760);
    const pref = stick.preferredRange || 300;
    const range = stick.attackRange || 440;
    stick.specialTimer += dt;
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist < pref * 0.8){
        stick.moveInput(-Math.sign(dx) * 0.7);
      }else if(dist > pref * 1.25){
        stick.moveInput(Math.sign(dx) * 0.5);
      }else{
        const strafe = Math.sin(stick.specialTimer * 2.6);
        stick.moveInput(strafe * 0.35);
      }
      if(dist <= range){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      approachHome(stick, 0.2);
    }
  },
  leaper(stick, dt){
    const target = selectTargetFor(stick, 500, 780);
    const pelvis = stick.pelvis();
    stick.specialTimer = Math.max(0, stick.specialTimer - dt);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist > (stick.attackRange || 150)){
        stick.moveInput(Math.sign(dx));
        if(pelvis.grounded && stick.specialTimer <= 0){
          pelvis.addForce(Math.sign(dx) * stick.moveForce * 1.2, 0);
          pelvis.addForce(0, -stick.leapStrength);
          stick.groundTime = 0;
          stick.airTime = 0;
          stick.specialTimer = 1.6;
        }
      }else{
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      updateWander(stick, dt, 0.35);
    }
  },
  hoverCaster(stick, dt){
    maintainHoverHeight(stick);
    const target = selectTargetFor(stick, 560, 820);
    const pref = stick.preferredRange || 360;
    const range = stick.attackRange || 520;
    stick.specialTimer += dt;
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist < pref * 0.85){
        stick.moveInput(-Math.sign(dx) * 0.6);
      }else if(dist > pref * 1.35){
        stick.moveInput(Math.sign(dx) * 0.55);
      }else{
        const strafe = Math.sin(stick.specialTimer * 3.2);
        stick.moveInput(strafe * 0.4);
      }
      if(dist <= range){
        stick.tryAttack(tc.x, tc.y - 20);
      }
    }else{
      stick.moveInput(0);
    }
  },
  timeWraith(stick, dt){
    const world = stick.world;
    const chrono = world?._chronosphereState;
    const sticks = Array.isArray(world?.sticks) ? world.sticks : [];
    const spheres = Array.isArray(chrono?.spheres) ? chrono.spheres : [];
    const points = Array.isArray(stick.points) ? stick.points : [];
    const settle = ()=>{
      for(const point of points){
        if(!point) continue;
        point.vx = 0;
        point.vy = 0;
        point.ax = 0;
        point.ay = 0;
        point.prevX = point.x;
        point.prevY = point.y;
      }
    };
    const isTargetFrozen = target=>{
      if(!target) return false;
      if(typeof target.isChronoFrozen === 'function') return target.isChronoFrozen();
      return !!target.chronoFrozen;
    };
    const targetInsideChronosphere = target=>{
      if(!target || !spheres.length) return false;
      const center = typeof target.center === 'function' ? target.center() : null;
      if(!center) return false;
      for(const sphere of spheres){
        if(!sphere) continue;
        const radius = Math.max(24, Number(sphere.radius) || 0);
        const cx = Number.isFinite(sphere.centerX)
          ? sphere.centerX
          : ((sphere.x ?? 0) + (sphere.w ?? 0) * 0.5);
        const cy = Number.isFinite(sphere.renderY)
          ? sphere.renderY
          : (Number.isFinite(sphere.centerY) ? sphere.centerY : ((sphere.y ?? 0) + (sphere.h ?? 0) * 0.5));
        if(Math.hypot(center.x - cx, center.y - cy) <= radius) return true;
      }
      return false;
    };
    const isEligibleTarget = target=>{
      if(!target || target.isEnemy || target.dead) return false;
      if(isTargetFrozen(target)) return true;
      return targetInsideChronosphere(target);
    };
    const active = sticks.some(isEligibleTarget);
    if(!active){
      stick.moveInput(0);
      settle();
      return;
    }
    const center = stick.center();
    if(!center) return;
    const detectRange = 960;
    const dropRange = 1400;
    const validateTarget = candidate=>{
      if(!candidate) return false;
      if(candidate.dead) return false;
      if(!isEligibleTarget(candidate)) return false;
      const c = typeof candidate.center === 'function' ? candidate.center() : null;
      if(!c) return false;
      const dist = Math.hypot(c.x - center.x, c.y - center.y);
      if(!(dist <= dropRange)) return false;
      return true;
    };
    let target = stick.target;
    if(!validateTarget(target)){
      stick.target = null;
      stick.aggro = false;
      target = null;
    }
    if(!target){
      let best = null;
      let bestDist = detectRange;
      for(const candidate of sticks){
        if(!isEligibleTarget(candidate)) continue;
        const c = typeof candidate.center === 'function' ? candidate.center() : null;
        if(!c) continue;
        const dist = Math.hypot(c.x - center.x, c.y - center.y);
        if(dist < bestDist){
          best = candidate;
          bestDist = dist;
        }
      }
      if(best){
        stick.target = best;
        stick.aggro = true;
        target = best;
      }
    }
    if(!target){
      stick.moveInput(0);
      settle();
      return;
    }
    const tc = target.center();
    if(!tc) return;
    const dx = tc.x - center.x;
    const dy = tc.y - center.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = stick.timeWraithSpeed || stick.moveSpeed || 80;
    const desiredVx = dx / dist * speed;
    const desiredVy = dy / dist * speed;
    const follow = dt > 0 ? Math.min(1, (stick.timeWraithTurnRate || 4.5) * dt) : 1;
    for(const point of points){
      if(!point) continue;
      point.vx += (desiredVx - (point.vx || 0)) * follow;
      point.vy += (desiredVy - (point.vy || 0)) * follow;
    }
    stick.dir = dx >= 0 ? 1 : -1;
    if(dist <= (stick.attackRange || 160)){
      stick.tryAttack(tc.x, tc.y);
    }
  },
  bomber(stick, dt){
    const target = selectTargetFor(stick, 480, 760);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      stick.moveInput(Math.sign(dx) * 1.15);
      if(dist <= (stick.attackRange || 120)){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      updateWander(stick, dt, 0.5);
    }
  },
  roller(stick, dt){
    const target = selectTargetFor(stick, 620, 860);
    const pelvis = stick.pelvis();
    if(pelvis){
      const radius = Math.max(18, stick.rollRadius || 30);
      const vx = pelvis.vx || 0;
      stick.rollPhase = (stick.rollPhase || 0) + (vx / radius) * dt;
      if(stick.rollPhase > TAU || stick.rollPhase < -TAU){
        stick.rollPhase = stick.rollPhase % TAU;
      }
    }
    stick.specialTimer = Math.max(0, stick.specialTimer - dt);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dir = Math.sign(dx) || 0;
      const dist = Math.abs(dx);
      const range = stick.attackRange || 160;
      const burstForce = stick.rollBurstForce ?? (stick.moveForce * 1.4);
      if(pelvis && pelvis.grounded && stick.specialTimer <= 0 && dist <= range * 1.25){
        pelvis.addForce(dir * burstForce, 0);
        const leap = stick.leapStrength ?? 72000;
        if(leap > 0) pelvis.addForce(0, -leap * 0.45);
        stick.specialTimer = stick.rollCooldown ?? 2.4;
      }
      stick.moveInput(dir * (dist > range ? 0.85 : 0.4));
      if(dist <= range * 1.15){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      updateWander(stick, dt, 0.4);
    }
  },
  hopper(stick, dt){
    const pelvis = stick.pelvis();
    if(pelvis){
      const grounded = pelvis.grounded;
      const targetSquish = grounded ? 1.25 : 0.85;
      stick.slimeSquish = lerp(stick.slimeSquish || 1, targetSquish, clamp(6 * dt, 0, 1));
    }
    stick.specialTimer = Math.max(0, stick.specialTimer - dt);
    const target = selectTargetFor(stick, 560, 820);
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dir = Math.sign(dx) || 0;
      const dist = Math.abs(dx);
      if(pelvis){
        if(pelvis.grounded && stick.specialTimer <= 0){
          pelvis.addForce(dir * stick.moveForce * 0.9, 0);
          const strength = stick.leapStrength ?? 140000;
          pelvis.addForce(0, -strength);
          stick.specialTimer = 1.3;
        }else if(!pelvis.grounded){
          const drift = clamp(dx / 220, -1.2, 1.2);
          pelvis.addForce(drift * stick.moveForce * 0.08, 0);
        }
      }
      stick.moveInput(dir * 0.25);
      if(dist <= (stick.attackRange || 150)){
        stick.tryAttack(tc.x, tc.y);
      }
    }else{
      if(pelvis && pelvis.grounded && stick.specialTimer <= 0){
        pelvis.addForce(rand(-1,1) * stick.moveForce * 0.35, 0);
        const strength = stick.leapStrength ?? 120000;
        pelvis.addForce(0, -strength * 0.7);
        stick.specialTimer = 1.5;
      }
      updateWander(stick, dt, 0.3);
    }
  },
  glyphSalmon(stick, dt){
    const world = stick.world;
    const pelvis = stick.pelvis();
    const water = world?.water;
    stick.moveInput(0);
    if(!world || !pelvis || !water){
      updateWander(stick, dt, 0.1);
      return;
    }
    const defaultCell = (typeof WATER_DEFAULT_CELL_SIZE === 'number' && WATER_DEFAULT_CELL_SIZE > 0)
      ? WATER_DEFAULT_CELL_SIZE
      : 2;
    const cellSize = water.cellSize || defaultCell;
    let surface = null;
    let column = waterColumnForX ? waterColumnForX(water, pelvis.x) : -1;
    if(column >= 0 && column < water.cols){
      surface = water.heights[column];
    }
    if(surface === null || surface === undefined){
      let bestSurface = null;
      let bestDist = Infinity;
      for(let col=0; col<water.cols; col++){
        const height = water.heights[col];
        if(height === null || height === undefined) continue;
        const centerX = (water.offsetX || 0) + (col + 0.5) * cellSize;
        const dist = Math.abs(centerX - pelvis.x);
        if(dist < bestDist){
          bestDist = dist;
          bestSurface = height;
          column = col;
        }
      }
      if(bestSurface !== null){
        surface = bestSurface;
      }
    }
    if(surface === null || surface === undefined){
      const gravity = Number.isFinite(GRAVITY) ? GRAVITY : 2600;
      pelvis.addForce(0, gravity * dt * 1200);
      pelvis.vx *= (1 - clamp(dt * 3.2, 0, 0.8));
      return;
    }
    const homeX = (water.offsetX || 0) + (column + 0.5) * cellSize;
    if(!stick.waterHome || !Number.isFinite(stick.waterHome.x)){
      stick.waterHome = { x: homeX, surface };
    }else{
      stick.waterHome.surface = surface;
    }
    const defaultDepth = Math.max(24, stick.swimDepth || 48);
    let desiredY = surface + defaultDepth;
    const target = selectTargetFor(stick, 620, 920);
    if(target){
      const tc = target.center();
      if(tc){
        const aimDepth = target.isUnderwater ? clamp(tc.y - surface, defaultDepth * 0.45, defaultDepth * 1.6) : defaultDepth;
        desiredY = surface + aimDepth;
      }
    }else if(stick.waterHome){
      desiredY = stick.waterHome.surface + defaultDepth;
    }
    const depthError = desiredY - pelvis.y;
    const buoyancy = Math.max(0, stick.swimBuoyancy || 0);
    if(buoyancy > 0 && Number.isFinite(depthError)){
      const normalized = clamp(depthError / Math.max(24, defaultDepth * 1.4), -1, 1);
      pelvis.addForce(0, normalized * buoyancy);
    }
    const damp = Math.max(0, stick.swimDamp || 0);
    if(damp > 0){
      const damping = clamp(dt * damp, 0, 0.6);
      pelvis.vx *= (1 - damping * 0.35);
      pelvis.vy *= (1 - damping * 0.25);
      for(const point of stick.points){
        if(!point || point === pelvis) continue;
        point.vx += (pelvis.vx - point.vx) * damping * 0.4;
        point.vy += (pelvis.vy - point.vy) * damping * 0.3;
      }
    }
    let swimDir = 0;
    if(target){
      const tc = target.center();
      if(tc){
        const dx = tc.x - stick.center().x;
        swimDir = clamp(dx / 220, -1, 1);
        if(Math.abs(dx) <= (stick.attackRange || 160)){
          stick.tryAttack(tc.x, tc.y);
        }
      }
    }
    if(swimDir === 0 && stick.waterHome){
      const dx = stick.waterHome.x - pelvis.x;
      if(Math.abs(dx) > 12){
        swimDir = clamp(dx / 180, -1, 1);
      }else{
        stick.swimWanderTimer = (stick.swimWanderTimer || 0) - dt;
        if(stick.swimWanderTimer <= 0){
          stick.swimWanderTimer = rand(1.2, 2.8);
          stick.swimWanderDir = rand(-1, 1) >= 0 ? 1 : -1;
        }
        swimDir = stick.swimWanderDir || 0;
      }
    }
    const swimForce = Math.max(0, stick.swimForce || 0);
    if(swimForce > 0 && swimDir !== 0){
      pelvis.addForce(swimDir * swimForce, 0);
    }
    const drag = clamp(dt * (stick.swimDrag || 0), 0, 0.45);
    if(drag > 0){
      pelvis.vx *= (1 - drag * 0.35);
      for(const point of stick.points){
        if(!point || point === pelvis) continue;
        point.vx *= (1 - drag * 0.4);
        point.vy *= (1 - drag * 0.25);
      }
    }
    if(swimDir !== 0){
      stick.dir = swimDir >= 0 ? 1 : -1;
    }
  },
  glyphLeviathan(stick, dt){
    if(!stick || !(dt > 0)){ return; }
    const world = stick.world;
    const pelvis = stick.pelvis();
    if(!world || !pelvis){
      ENEMY_BEHAVIORS.glyphSalmon(stick, dt);
      return;
    }
    const state = ensureLeviathanState(stick);
    state.time = (state.time || 0) + dt;
    updateLeviathanShield(stick, state, dt);
    state.glyphTimer = Math.max(0, (state.glyphTimer || 0) - dt);
    state.spikeTimer = Math.max(0, (state.spikeTimer || 0) - dt);
    const detectRange = Math.max(640, Number.isFinite(stick.attackRange) ? stick.attackRange : 720);
    const dropRange = detectRange + 360;
    const target = selectTargetFor(stick, detectRange, dropRange);
    const water = world.water;
    const defaultDepth = Math.max(36, stick.swimDepth || 64);
    const defaultCell = (typeof WATER_DEFAULT_CELL_SIZE === 'number' && WATER_DEFAULT_CELL_SIZE > 0)
      ? WATER_DEFAULT_CELL_SIZE
      : 2;
    let surface = null;
    let column = -1;
    if(water){
      const cellSize = water.cellSize || defaultCell;
      column = typeof waterColumnForX === 'function' ? waterColumnForX(water, pelvis.x) : -1;
      if(column >= 0 && column < water.cols){
        surface = water.heights[column];
      }
      if(surface === null || surface === undefined){
        let bestSurface = null;
        let bestDist = Infinity;
        for(let col=0; col<water.cols; col++){
          const height = water.heights[col];
          if(height === null || height === undefined) continue;
          const centerX = (water.offsetX || 0) + (col + 0.5) * cellSize;
          const dist = Math.abs(centerX - pelvis.x);
          if(dist < bestDist){
            bestDist = dist;
            bestSurface = height;
            column = col;
          }
        }
        if(bestSurface !== null && bestSurface !== undefined){
          surface = bestSurface;
        }
      }
      if(surface !== null && surface !== undefined){
        const homeX = (water.offsetX || 0) + (Math.max(0, column) + 0.5) * (water.cellSize || defaultCell);
        if(!state.waterHome){
          state.waterHome = { x: homeX, surface };
        }else{
          state.waterHome.x = homeX;
          state.waterHome.surface = surface;
        }
      }
    }
    if(surface === null || surface === undefined){
      surface = state.waterHome?.surface;
      if(surface === null || surface === undefined){
        surface = pelvis.y - defaultDepth;
      }
    }
    const center = typeof stick.center === 'function' ? stick.center() : null;
    let desiredDepth = defaultDepth;
    if(target && typeof target.center === 'function'){
      const tc = target.center();
      if(tc){
        const depth = tc.y - surface;
        desiredDepth = clamp(depth, defaultDepth * 0.5, defaultDepth * 1.8);
      }
    }else if(state.waterHome){
      desiredDepth = defaultDepth;
    }
    let desiredY = surface + desiredDepth;
    if((state.phase === 'chargePrep' || state.phase === 'spikeCharge') && target){
      const tc = target.center?.();
      if(tc) desiredY = tc.y;
    }
    const depthError = desiredY - pelvis.y;
    const buoyancy = Math.max(0, stick.swimBuoyancy || 0);
    if(buoyancy > 0 && Number.isFinite(depthError)){
      const normalized = clamp(depthError / Math.max(24, defaultDepth * 1.6), -1, 1);
      pelvis.addForce(0, normalized * buoyancy);
    }
    const damp = Math.max(0, stick.swimDamp || 0);
    if(damp > 0){
      const damping = clamp(dt * damp, 0, 0.6);
      pelvis.vx *= (1 - damping * 0.35);
      pelvis.vy *= (1 - damping * 0.25);
      for(const point of stick.points){
        if(!point || point === pelvis) continue;
        point.vx += (pelvis.vx - point.vx) * damping * 0.4;
        point.vy += (pelvis.vy - point.vy) * damping * 0.3;
      }
    }
    let swimDir = 0;
    const pref = Number.isFinite(stick.preferredRange) ? stick.preferredRange : 360;
    switch(state.phase){
      case 'glyphVolley':
        swimDir = 0;
        state.volleyWindup = Math.max(0, (state.volleyWindup ?? 0) - dt);
        if(state.volleyWindup <= 0){
          state.volleyInterval = Math.max(0, (state.volleyInterval ?? 0) - dt);
          if(state.volleyInterval <= 0){
            if(leviathanFireGlyphCluster(stick, target)){
              state.volleyShots = (state.volleyShots || 0) + 1;
            }
            state.volleyInterval = Math.max(0.12, Number.isFinite(stick.glyphVolleyInterval) ? stick.glyphVolleyInterval : 0.3);
          }
          const maxShots = Math.max(1, Math.round(Number.isFinite(stick.glyphVolleyCount) ? stick.glyphVolleyCount : 6));
          if((state.volleyShots || 0) >= maxShots){
            state.phase = 'recover';
            state.recoverTimer = Math.max(0.8, Number.isFinite(stick.glyphVolleyRecover) ? stick.glyphVolleyRecover : 1.4);
            state.glyphTimer = Math.max(state.glyphTimer, Number.isFinite(stick.glyphVolleyCooldown) ? stick.glyphVolleyCooldown : 5.6);
          }
        }
        break;
      case 'chargePrep':
        swimDir = 0;
        state.chargeWindup = Math.max(0, (state.chargeWindup ?? 0) - dt);
        if(target && center){
          const tc = target.center();
          if(tc){
            const dx = tc.x - center.x;
            stick.dir = dx >= 0 ? 1 : -1;
            state.chargeDir = Math.sign(dx) || (state.chargeDir || stick.dir || 1);
          }
        }
        if(state.chargeWindup <= 0){
          state.phase = 'spikeCharge';
          state.chargeTimer = Math.max(0.4, state.chargeDuration ?? Math.max(0.6, Number.isFinite(stick.spikeChargeDuration) ? stick.spikeChargeDuration : 1.4));
          state.spikeBurstDone = false;
        }
        break;
      case 'spikeCharge':
        {
          const dir = state.chargeDir || stick.dir || 1;
          swimDir = dir;
          if(!state.spikeBurstDone){
            leviathanSpawnSpikeBurst(stick);
            state.spikeBurstDone = true;
          }
          const force = Math.max(1200, Number.isFinite(state.chargeForce) ? state.chargeForce : (Number.isFinite(stick.spikeChargeForce) ? stick.spikeChargeForce : 102000));
          pelvis.addForce(dir * force, 0);
          const speedCap = Math.max(420, Number.isFinite(stick.spikeChargeSpeed) ? stick.spikeChargeSpeed : 880);
          pelvis.vx = clamp(pelvis.vx, -speedCap, speedCap);
          if(target && target.center){
            const tc = target.center();
            if(tc) stick.tryAttack(tc.x, tc.y);
          }else{
            stick.tryAttack(pelvis.x + dir * 80, pelvis.y);
          }
          state.chargeTimer = Math.max(0, (state.chargeTimer ?? 0) - dt);
          if(state.chargeTimer <= 0){
            state.phase = 'recover';
            state.recoverTimer = Math.max(0.8, Number.isFinite(stick.spikeRecover) ? stick.spikeRecover : 1.2);
          }
        }
        break;
      case 'recover':
        swimDir = Math.sin(state.time * 0.8) * 0.35;
        state.recoverTimer = Math.max(0, (state.recoverTimer ?? 0) - dt);
        if(state.recoverTimer <= 0){
          state.phase = 'stalk';
        }
        break;
      case 'stalk':
      default:
        state.phase = 'stalk';
        state.volleyShots = 0;
        state.volleyWindup = 0;
        if(target && center){
          const tc = target.center();
          if(tc){
            const dx = tc.x - center.x;
            stick.dir = dx >= 0 ? 1 : -1;
            if(Math.abs(dx) > pref * 1.25){
              swimDir = clamp(dx / 260, -1, 1);
            }else if(Math.abs(dx) < pref * 0.75){
              swimDir = -Math.sign(dx) * 0.7;
            }else{
              swimDir = Math.sin(state.time * 0.9) * 0.45;
            }
            if(state.glyphTimer <= 0){
              state.phase = 'glyphVolley';
              state.volleyWindup = Math.max(0.4, Number.isFinite(stick.glyphVolleyWindup) ? stick.glyphVolleyWindup : 1.1);
              state.volleyInterval = Math.max(0.12, Number.isFinite(stick.glyphVolleyInterval) ? stick.glyphVolleyInterval : 0.3);
              state.volleyShots = 0;
              break;
            }
            if(state.spikeTimer <= 0){
              state.phase = 'chargePrep';
              state.chargeWindup = Math.max(0.4, Number.isFinite(stick.spikeChargeWindup) ? stick.spikeChargeWindup : 0.8);
              state.chargeDir = Math.sign(dx) || stick.dir || 1;
              state.chargeDuration = Math.max(0.6, Number.isFinite(stick.spikeChargeDuration) ? stick.spikeChargeDuration : 1.4);
              state.chargeForce = Number.isFinite(stick.spikeChargeForce) ? stick.spikeChargeForce : 102000;
              state.spikeTimer = Math.max(state.spikeTimer, Number.isFinite(stick.spikeChargeCooldown) ? stick.spikeChargeCooldown : 6.8);
              break;
            }
          }
        }else if(state.waterHome){
          const dx = state.waterHome.x - pelvis.x;
          if(Math.abs(dx) > 12){
            swimDir = clamp(dx / 220, -1, 1);
          }else{
            state.driftTimer = (state.driftTimer || 0) - dt;
            if(state.driftTimer <= 0){
              state.driftTimer = rand(1.2, 2.6);
              state.driftDir = rand(-1, 1) >= 0 ? 1 : -1;
            }
            swimDir = state.driftDir || 0;
          }
        }else{
          swimDir = Math.sin(state.time * 0.7) * 0.4;
        }
        break;
    }
    const swimForce = Math.max(0, stick.swimForce || 0);
    if(swimForce > 0 && Number.isFinite(swimDir) && Math.abs(swimDir) > 0.01){
      pelvis.addForce(clamp(swimDir, -1, 1) * swimForce, 0);
    }
    const drag = clamp(dt * (stick.swimDrag || 0), 0, 0.45);
    if(drag > 0){
      pelvis.vx *= (1 - drag * 0.35);
      for(const point of stick.points){
        if(!point || point === pelvis) continue;
        point.vx *= (1 - drag * 0.4);
        point.vy *= (1 - drag * 0.25);
      }
    }
    if(Number.isFinite(swimDir) && Math.abs(swimDir) > 0.02){
      stick.dir = swimDir >= 0 ? 1 : -1;
    }
  },
  glyphGyre(stick, dt){
    maintainHoverHeight(stick);
    const pelvis = stick.pelvis();
    if(!pelvis){
      updateWander(stick, dt, 0.12);
      return;
    }
    const state = stick._glyphGyreState || (stick._glyphGyreState = {
      beamProgress: 0,
      beamWidth: Math.max(4, stick.beamMinWidth || 12),
      lastTargetPos: null,
      stationaryTime: 0,
      cooldown: 0,
      seed: Math.random() * TAU
    });
    state.cooldown = Math.max(0, (state.cooldown || 0) - dt);
    const now = typeof nowMs === 'function' ? nowMs() : Date.now();
    const detectRange = Math.max(600, stick.attackRange || 720);
    const dropRange = detectRange + 260;
    const target = selectTargetFor(stick, detectRange, dropRange);
    const originX = pelvis.x;
    const originY = pelvis.y + (stick.renderOffsetY ?? 0);
    state.beamOrigin = { x: originX, y: originY };
    const chargeTime = Math.max(0.1, stick.beamChargeTime || 5);
    const minWidth = Math.max(4, stick.beamMinWidth || 12);
    const maxWidth = Math.max(minWidth, stick.beamMaxWidth || (minWidth + 60));
    const stillnessThreshold = Math.max(6, stick.beamStillnessThreshold || 28);
    const cooldown = Math.max(0, stick.beamCooldown || 0);
    let beamActive = false;
    if(target){
      const tc = target.center();
      const dx = tc.x - originX;
      const dy = tc.y - originY;
      const dist = Math.hypot(dx, dy);
      const inRange = dist <= detectRange;
      let hasLos = false;
      if(inRange){
        if(!raycastEnvironment || dist <= 1){
          hasLos = true;
        }else{
          const dir = { x: dx / dist, y: dy / dist };
          const rects = stick._solidRectangles();
          const hit = raycastEnvironment(state.beamOrigin, dir, dist, rects);
          hasLos = !hit;
        }
      }
      const preferred = detectRange * 0.82;
      if(!hasLos){
        const pushDir = Math.sign(dx) || (stick.dir || 1);
        stick.moveInput(pushDir * 0.52);
      }else if(dist < preferred * 0.7){
        stick.moveInput(-Math.sign(dx) * 0.42);
      }else if(dist > preferred){
        stick.moveInput(Math.sign(dx) * 0.36);
      }else{
        const strafe = Math.sin((now / 420) + state.seed) * 0.34;
        stick.moveInput(strafe);
      }
      if(hasLos && state.cooldown <= 0){
        beamActive = true;
        state.beamTarget = { x: tc.x, y: tc.y };
        state.beamProgress = clamp(state.beamProgress + dt / chargeTime, 0, 1);
        const t = clamp(state.beamProgress, 0, 1);
        const eased = t * t * (3 - 2 * t);
        state.beamWidth = minWidth + (maxWidth - minWidth) * eased;
        if(!state.lastTargetPos){
          state.lastTargetPos = { x: tc.x, y: tc.y };
          state.stationaryTime = 0;
        }else{
          const moved = Math.hypot(tc.x - state.lastTargetPos.x, tc.y - state.lastTargetPos.y);
          if(moved > stillnessThreshold){
            state.stationaryTime = 0;
          }else{
            state.stationaryTime += dt;
          }
          state.lastTargetPos = { x: tc.x, y: tc.y };
        }
        if(state.beamProgress >= 0.999 && state.stationaryTime >= chargeTime - 0.1){
          const damage = Math.max(1, stick.beamStillnessDamage || Math.max(60, stick.attack * 4));
          target.takeDamage(damage, 0, 0, stick, {
            element: stick.element || 'physical'
          });
          state.cooldown = cooldown;
          state.beamProgress = 0;
          state.stationaryTime = 0;
          state.lastTargetPos = { x: tc.x, y: tc.y };
        }
      }else{
        state.stationaryTime = 0;
        state.lastTargetPos = null;
        if(state.beamProgress > 0){
          state.beamProgress = Math.max(0, state.beamProgress - dt * 0.85);
          const t = clamp(state.beamProgress, 0, 1);
          const eased = t * t * (3 - 2 * t);
          state.beamWidth = minWidth + (maxWidth - minWidth) * eased;
        }else{
          state.beamWidth = minWidth;
          state.beamTarget = null;
        }
      }
    }else{
      const drift = Math.sin((now / 620) + state.seed) * 0.32;
      stick.moveInput(drift);
      state.stationaryTime = 0;
      state.lastTargetPos = null;
      state.beamTarget = null;
      if(state.beamProgress > 0){
        state.beamProgress = Math.max(0, state.beamProgress - dt * 0.75);
        const t = clamp(state.beamProgress, 0, 1);
        const eased = t * t * (3 - 2 * t);
        state.beamWidth = minWidth + (maxWidth - minWidth) * eased;
      }else{
        state.beamWidth = minWidth;
      }
    }
    if(state.cooldown > 0 && !beamActive){
      if(state.beamProgress > 0){
        state.beamProgress = Math.max(0, state.beamProgress - dt * 1.2);
        const t = clamp(state.beamProgress, 0, 1);
        const eased = t * t * (3 - 2 * t);
        state.beamWidth = minWidth + (maxWidth - minWidth) * eased;
      }else{
        state.beamWidth = minWidth;
      }
    }
    state.beamActive = beamActive;
    state.beamIntensity = clamp(state.beamProgress, 0, 1);
  },
  sandSlinger(stick, dt){
    const target = selectTargetFor(stick, 520, 820);
    const swaySeed = stick.sandGlowPhase ?? (stick.sandGlowPhase = Math.random() * TAU);
    const pref = stick.preferredRange || 260;
    const range = stick.attackRange || 320;
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist > pref * 1.2){
        stick.moveInput(Math.sign(dx) * 0.42);
      }else if(dist < pref * 0.65){
        stick.moveInput(-Math.sign(dx) * 0.36);
      }else{
        const sway = Math.sin((stick.specialTimer || 0) * 2.4 + swaySeed) * 0.28;
        stick.moveInput(sway);
      }
      if(dist <= range){
        const aimX = tc.x + rand(-22, 22);
        const aimY = tc.y - 18 + rand(-12, 12);
        stick.tryAttack(aimX, aimY);
      }
    }else{
      updateWander(stick, dt, 0.22);
      if(stick.specialTimer > 2.4){
        const origin = stick.center();
        const aimX = origin.x + rand(-140, 140);
        const aimY = origin.y - rand(24, 64);
        stick.tryAttack(aimX, aimY);
        stick.specialTimer = 0.6;
      }
    }
    if(stick.specialTimer > 6){
      stick.specialTimer -= 6;
    }
  },
  artillery(stick, dt){
    const target = selectTargetFor(stick, 640, 900);
    const pref = stick.preferredRange || 420;
    const range = stick.attackRange || 600;
    if(target){
      const tc = target.center();
      const dx = tc.x - stick.center().x;
      const dist = Math.abs(dx);
      if(dist < pref * 0.7){
        stick.moveInput(-Math.sign(dx) * 0.6);
      }else if(dist > pref * 1.3){
        stick.moveInput(Math.sign(dx) * 0.4);
      }else{
        stick.moveInput(0);
      }
      if(dist <= range){
        stick.tryAttack(tc.x, tc.y - 16);
      }
    }else{
      approachHome(stick, 0.18);
    }
  },
  neonOverlord(stick, dt){
    const target = selectTargetFor(stick, 680, 960);
    if(!stick.bossState){
      stick.bossState = { action: 'chase', timer: 2.4 };
    }
    const state = stick.bossState;
    state.timer = (state.timer ?? 0) - dt;
    if(state.action === 'chase'){
      if(target){
        const tc = target.center();
        const dx = tc.x - stick.center().x;
        const dist = Math.abs(dx);
        const dir = Math.sign(dx) || 0;
        if(dist > (stick.attackRange || 220)){
          stick.moveInput(dir * 1.1);
        }else{
          stick.moveInput(dir * 0.45);
          stick.tryAttack(tc.x, tc.y);
        }
      }else{
        updateWander(stick, dt, 0.5);
      }
      if(state.timer <= 0){
        if(Math.random() < 0.5){
          state.action = 'dash';
          state.phase = 'charge';
          state.charge = 0;
          state.timer = 0.55;
        }else{
          state.action = 'barrage';
          state.phase = 'cast';
          state.shots = 0;
          state.cooldown = 0.25;
          state.timer = 3.1;
        }
      }
      return;
    }
    if(state.action === 'dash'){
      const pelvis = stick.pelvis();
      if(state.phase === 'charge'){
        stick.moveInput(0);
        state.charge = (state.charge || 0) + dt;
        if(state.charge >= 0.5){
          state.phase = 'burst';
        }
        return;
      }
      if(state.phase === 'burst'){
        if(target && pelvis){
          const tc = target.center();
          const dashDir = Math.sign(tc.x - pelvis.x) || stick.dir || 1;
          pelvis.addForce(dashDir * stick.moveForce * 18, -stick.moveForce * 3);
          stick.tryAttack(tc.x, tc.y);
        }
        state.phase = 'recover';
        state.timer = 0.6;
        return;
      }
      if(state.phase === 'recover'){
        stick.moveInput(0);
        state.timer -= dt;
        if(state.timer <= 0){
          state.action = 'chase';
          state.timer = 2.6;
          state.phase = null;
        }
        return;
      }
      state.action = 'chase';
      state.timer = 2.4;
      return;
    }
    if(state.action === 'barrage'){
      stick.moveInput(0);
      if(target){
        const tc = target.center();
        stick.dir = tc.x >= stick.center().x ? 1 : -1;
        state.cooldown = (state.cooldown ?? 0.2) - dt;
        if(state.cooldown <= 0 && state.shots < 3){
          const origin = stick.center();
          const baseAngle = Math.atan2(tc.y - origin.y, tc.x - origin.x);
          const offsets = [-0.22, -0.08, 0, 0.08, 0.22];
          for(const offset of offsets){
            shootProjectile(stick, { speed: 860, dmg: 22, color: '#54f0ff' }, 'neonShard', {
              angle: baseAngle + offset,
              damage: 22,
              ttl: 2000,
              fadeRate: 0.45
            }, stick.world);
          }
          state.shots++;
          state.cooldown = 0.55;
        }
      }
    if(state.timer <= 0 || state.shots >= 3){
      state.action = 'chase';
      state.timer = 2.2;
    }
    return;
  }
  state.action = 'chase';
  state.timer = 2.4;
  },
  toonChampion(stick, dt){
    const target = selectTargetFor(stick, 760, 980);
    if(!stick.bossState){
      stick.bossState = { action: 'taunt', timer: 1.6 };
    }
    const state = stick.bossState;
    state.timer = (state.timer ?? 0) - dt;
    if(state.action === 'taunt'){
      stick.moveInput(0);
      if(state.timer <= 0){
        state.action = 'inkVolley';
        state.cooldown = 0.4;
        state.volley = 0;
        state.timer = 4.2;
      }
      return;
    }
    if(state.action === 'inkVolley'){
      stick.moveInput(0);
      if(target){
        const tc = target.center();
        stick.dir = tc.x >= stick.center().x ? 1 : -1;
        state.cooldown = (state.cooldown ?? 0.3) - dt;
        if(state.cooldown <= 0){
          const origin = stick.center();
          const baseAngle = Math.atan2(tc.y - origin.y, tc.x - origin.x);
          const offsets = [-0.32, -0.14, 0, 0.14, 0.32];
          const weapon = WEAPONS?.toonBrush || null;
          for(const offset of offsets){
            const angle = baseAngle + offset;
            const opts = {
              angle,
              speed: 560,
              gravity: true,
              ttl: 2400,
              damage: 20,
              color: '#ffb36b'
            };
            if(typeof spawnInkSlashSplash === 'function'){
              opts.onExpire = spawnInkSlashSplash;
            }
            shootProjectile(stick, weapon, 'inkDrop', opts, stick.world);
          }
          state.cooldown = 0.6;
          state.volley = (state.volley || 0) + 1;
        }
      }
      if(state.timer <= 0 || (state.volley || 0) >= 3){
        state.action = 'dash';
        state.phase = 'windup';
        state.timer = 0.8;
        state.lunges = 0;
      }
      return;
    }
    if(state.action === 'dash'){
      const pelvis = stick.pelvis();
      if(state.phase === 'windup'){
        stick.moveInput(0);
        if(state.timer <= 0){
          state.phase = 'lunge';
          state.timer = 0.2;
        }
        return;
      }
      if(state.phase === 'lunge'){
        if(target && pelvis){
          const tc = target.center();
          const dir = Math.sign(tc.x - pelvis.x) || stick.dir || 1;
          pelvis.addForce(dir * stick.moveForce * 22, -stick.moveForce * 3.6);
          stick.tryAttack(tc.x, tc.y);
          state.dir = dir;
        }
        state.phase = 'rebound';
        state.timer = 0.4;
        state.lunges = (state.lunges || 0) + 1;
        return;
      }
      if(state.phase === 'rebound'){
        stick.moveInput(0);
        if(state.timer <= 0){
          if((state.lunges || 0) < 2){
            state.phase = 'windup';
            state.timer = 0.55;
          }else{
            state.phase = 'recover';
            state.timer = 0.7;
          }
        }
        return;
      }
      if(state.phase === 'recover'){
        stick.moveInput(0);
        if(state.timer <= 0){
          state.action = 'rain';
          state.phase = 'leap';
          state.timer = 0.6;
          state.cooldown = 0.4;
        }
        return;
      }
      state.action = 'inkVolley';
      state.timer = 3.6;
      state.cooldown = 0.5;
      state.volley = 0;
      return;
    }
    if(state.action === 'rain'){
      const pelvis = stick.pelvis();
      if(state.phase === 'leap'){
        if(pelvis){
          const dir = state.dir || (stick.dir || 1);
          pelvis.addForce(dir * stick.moveForce * 6, -stick.moveForce * 12);
        }
        state.phase = 'barrage';
        state.timer = 3.1;
        state.cooldown = 0.35;
      }else if(state.phase === 'barrage'){
        stick.moveInput(0);
        if(state.timer <= 0){
          state.action = 'inkVolley';
          state.timer = 3.4;
          state.cooldown = 0.45;
          state.volley = 0;
          return;
        }
        state.cooldown -= dt;
        const weapon = WEAPONS?.toonBrush || null;
        if(state.cooldown <= 0){
          const origin = stick.center();
          const volleys = 4;
          for(let i=0;i<volleys;i++){
            const targetCenter = target ? target.center() : null;
            const aimX = (targetCenter ? targetCenter.x : origin.x) + rand(-160, 160);
            const aimY = (targetCenter ? targetCenter.y : origin.y + 120) + rand(-40, 40);
            const angle = Math.atan2(aimY - origin.y, aimX - origin.x);
            const opts = {
              angle,
              speed: 520,
              gravity: true,
              ttl: 2600,
              damage: 18,
              color: '#ffb36b'
            };
            if(typeof spawnInkSlashSplash === 'function'){
              opts.onExpire = spawnInkSlashSplash;
            }
            shootProjectile(stick, weapon, 'inkDrop', opts, stick.world);
          }
          state.cooldown = 0.5;
        }
      }
      return;
    }
    state.action = 'inkVolley';
    state.timer = 3;
    state.cooldown = 0.5;
    state.volley = 0;
  },
  thetaHarmonic: thetaHarmonicBehavior,
  voidGlyphOverlord(stick, dt){
    const detect = (stick.attackRange || 640) + 200;
    const drop = detect + 240;
    const target = selectTargetFor(stick, detect, drop);
    const halo = updateVoidHaloState(stick, dt);
    if(!stick.bossState){
      stick.bossState = { action: 'stalk', cooldown: 2.6, timer: 0, volleyDelay: 0, shots: 0 };
    }
    const state = stick.bossState;
    const pref = stick.preferredRange || 420;
    const range = stick.attackRange || 640;
    const chargeTime = Math.max(0.4, stick.voidHaloChargeTime ?? 1.2);
    const volleyInterval = Math.max(0.24, stick.voidHaloVolleyInterval ?? 0.55);
    const downtime = Math.max(chargeTime, stick.voidHaloAttackDowntime ?? 4.4);
    const chargeDecay = Math.max(0.6, stick.voidHaloChargeDecay ?? 1.6);
    stick.specialTimer = (stick.specialTimer || 0) + dt;
    if(target){
      const tc = target.center();
      const sc = stick.center();
      const dx = tc.x - sc.x;
      const dist = Math.abs(dx);
      const dir = Math.sign(dx) || 1;
      if(state.action === 'stalk'){
        if(dist > pref * 1.25){
          stick.moveInput(dir * 0.6);
        }else if(dist < pref * 0.7){
          stick.moveInput(-dir * 0.5);
        }else{
          const strafe = Math.sin(stick.specialTimer * 1.8);
          stick.moveInput(strafe * 0.35);
        }
        state.cooldown = Math.max(0, (state.cooldown ?? 0) - dt);
        if(state.cooldown <= 0 && dist <= range && voidHaloReadyCount(stick) >= 2){
          state.action = 'charge';
          state.timer = chargeTime;
          state.cooldown = downtime;
          if(halo) halo.charge = 0;
        }
      }else if(state.action === 'charge'){
        stick.moveInput(0);
        state.timer = (state.timer ?? chargeTime) - dt;
        if(halo) halo.charge = clamp(1 - state.timer / chargeTime, 0, 1);
        if(state.timer <= 0){
          state.action = 'volley';
          state.timer = Math.max(1.6, volleyInterval * (halo?.maxOrbs ?? 4) + 0.9);
          state.volleyDelay = 0.12;
          state.shots = 0;
        }
      }else if(state.action === 'volley'){
        stick.moveInput(0);
        state.timer = (state.timer ?? 0) - dt;
        state.volleyDelay = (state.volleyDelay ?? 0) - dt;
        if(halo) halo.volleying = true;
        if(state.volleyDelay <= 0 && dist <= range){
          const launch = consumeVoidHaloOrb(stick);
          if(launch){
            stick._pendingProjectileOrigin = launch.origin;
            stick.weaponCooldownUntil = 0;
            stick.tryAttack(tc.x, tc.y);
            state.shots = (state.shots || 0) + 1;
            state.volleyDelay = volleyInterval;
          }else if(voidHaloReadyCount(stick) === 0){
            state.timer = Math.min(state.timer, 0.35);
          }else{
            state.volleyDelay = Math.min(state.volleyDelay, 0.1);
          }
        }
        const maxShots = halo?.maxOrbs ?? 4;
        if(state.timer <= 0 || (state.shots ?? 0) >= maxShots || ((state.shots ?? 0) > 0 && voidHaloReadyCount(stick) === 0)){
          state.action = 'recover';
          state.timer = 1.4;
          if(halo) halo.volleying = false;
        }
      }else if(state.action === 'recover'){
        stick.moveInput(0);
        state.timer = (state.timer ?? 0) - dt;
        if(state.timer <= 0){
          state.action = 'stalk';
        }
      }else{
        state.action = 'stalk';
      }
    }else{
      stick.moveInput(0);
      state.action = 'stalk';
      state.cooldown = Math.max(0, (state.cooldown ?? 0) - dt);
      approachHome(stick, 0.16);
      if(halo) halo.volleying = false;
    }
    if(halo){
      if(state.action !== 'charge'){
        halo.charge = Math.max(0, (halo.charge ?? 0) - chargeDecay * dt);
      }
      halo.charging = state.action === 'charge';
      halo.volleying = state.action === 'volley';
    }
  },
  alephReliquary(stick, dt){
    maintainHoverHeight(stick);
    const world = stick.world;
    const pelvis = stick.pelvis();
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!world || !pelvis || !center) return;
    const state = stick._alephState || (stick._alephState = {
      time: 0,
      minions: [],
      summonWarmup: 0,
      waveSpawned: false,
      shieldPulse: 0,
      solids: null
    });
    const maxMinions = Math.max(1, Math.round(stick.maxShinCount || 5));
    const resummonDelay = Math.max(2.5, Number.isFinite(stick.shinResummonDelay) ? stick.shinResummonDelay : 6);
    const replenishDelay = Math.max(0.8, Number.isFinite(stick.shinReplenishDelay) ? stick.shinReplenishDelay : 3.4);
    const summonDelay = Math.max(0, Number.isFinite(stick.summonDelay) ? stick.summonDelay : 0);
    state.time += dt;
    if(!Array.isArray(state.minions)) state.minions = [];
    const alive = [];
    for(const minion of state.minions){
      if(minion && !minion.dead && minion.world === world){
        alive.push(minion);
      }else if(minion && minion.summoner === stick){
        minion.summoner = null;
      }
    }
    state.minions = alive;
    const shieldRadius = state.shieldRadius = Math.max(100, Number.isFinite(stick.shieldRadius) ? stick.shieldRadius : 140);
    if(!state.solids){
      state.solids = [
        { kind: 'triangle', angle: 0, speed: 1.1, size: shieldRadius * 0.18, spin: 1.6, alpha: 0.92, orbitShift: 12 },
        { kind: 'square', angle: TAU * 0.2, speed: -0.9, size: shieldRadius * 0.2, spin: -1.4, alpha: 0.82, orbitShift: -10 },
        { kind: 'pentagon', angle: TAU * 0.4, speed: 1.05, size: shieldRadius * 0.22, spin: 1.2, alpha: 0.9, orbitShift: 16 },
        { kind: 'hexagon', angle: TAU * 0.6, speed: -0.8, size: shieldRadius * 0.18, spin: -1.3, alpha: 0.78, orbitShift: -14 },
        { kind: 'star', angle: TAU * 0.8, speed: 1.25, size: shieldRadius * 0.24, spin: 1.5, alpha: 0.95, orbitShift: 6 }
      ];
    }
    for(const solid of state.solids){
      if(!solid) continue;
      solid.angle = (solid.angle || 0) + (solid.speed || 0) * dt;
    }
    const spawnMinion = angle=>{
      if(typeof spawnSingleEnemy !== 'function') return null;
      const spawnAngle = Number.isFinite(angle) ? angle : randomRange(0, TAU);
      const orbitRadius = shieldRadius * 0.65;
      const spawnX = center.x + Math.cos(spawnAngle) * orbitRadius;
      const spawnY = center.y - 100 + Math.sin(spawnAngle) * orbitRadius * 0.3;
      const minion = spawnSingleEnemy(world, { kind: 'shinGlyph', y: spawnY }, spawnX);
      if(minion){
        minion.summoner = stick;
        const mState = minion._shinState || (minion._shinState = {});
        mState.orbitAngle = spawnAngle;
        mState.orbitSeed = spawnAngle;
        minion.orbitRadius = orbitRadius;
        minion.orbitHeight = 120;
        state.minions.push(minion);
      }
      return minion;
    };
    if(!state.initialized){
      state.initialized = true;
      state.summonWarmup = summonDelay;
      state.resummonTimer = resummonDelay;
      state.replenishTimer = replenishDelay;
    }
    if(!state.waveSpawned){
      state.summonWarmup = Math.max(0, (state.summonWarmup ?? 0) - dt);
      if(state.summonWarmup <= 0){
        for(let i=0; i<maxMinions; i++){
          const angle = (TAU / maxMinions) * i;
          spawnMinion(angle);
        }
        state.waveSpawned = true;
        state.resummonTimer = resummonDelay;
        state.replenishTimer = replenishDelay;
      }
    }else if(alive.length === 0){
      state.resummonTimer = Math.max(0, (state.resummonTimer ?? resummonDelay) - dt);
      if(state.resummonTimer <= 0){
        for(let i=0; i<maxMinions; i++){
          const angle = (TAU / maxMinions) * i + state.time * 0.3;
          spawnMinion(angle);
        }
        state.resummonTimer = resummonDelay;
        state.replenishTimer = replenishDelay;
      }
    }else if(alive.length < maxMinions){
      state.replenishTimer = Math.max(0, (state.replenishTimer ?? replenishDelay) - dt);
      if(state.replenishTimer <= 0){
        spawnMinion(state.time);
        state.replenishTimer = replenishDelay;
      }
      state.resummonTimer = resummonDelay;
    }else{
      state.resummonTimer = resummonDelay;
      state.replenishTimer = replenishDelay;
    }
    const shieldActive = state.minions.length > 0;
    stick.invulnerable = shieldActive;
    state.shieldActive = shieldActive;
    state.shieldPulse = shieldActive
      ? Math.min(1, (state.shieldPulse || 0) + dt * 1.4)
      : Math.max(0, (state.shieldPulse || 0) - dt * 1.6);
    const target = selectTargetFor(stick, 960, 1400);
    if(target){
      const tc = target.center();
      if(tc){
        const dx = tc.x - center.x;
        const pref = stick.preferredRange || 420;
        if(Math.abs(dx) > pref * 1.35){
          stick.moveInput(Math.sign(dx) * 0.3);
        }else if(Math.abs(dx) < pref * 0.75){
          stick.moveInput(-Math.sign(dx) * 0.32);
        }else{
          stick.moveInput(Math.sin(state.time * 0.6) * 0.24);
        }
      }
    }else{
      updateWander(stick, dt, 0.16);
    }
  },
  shinReliquary(stick, dt){
    maintainHoverHeight(stick);
    const world = stick.world;
    const pelvis = stick.pelvis();
    if(!world || !pelvis) return;
    stick.moveInput(0);
    const state = stick._shinState || (stick._shinState = { time: 0 });
    state.time += dt;
    let summoner = stick.summoner || null;
    if(summoner && (summoner.dead || summoner.world !== world)){
      summoner = null;
      stick.summoner = null;
    }
    const center = summoner && typeof summoner.center === 'function' ? summoner.center() : null;
    const orbitRadius = Number.isFinite(stick.orbitRadius)
      ? stick.orbitRadius
      : summoner
        ? (Number.isFinite(summoner.shieldRadius) ? summoner.shieldRadius : 140) * 0.65
        : 140;
    if(state.orbitAngle === undefined){
      state.orbitAngle = Number.isFinite(state.orbitSeed) ? state.orbitSeed : randomRange(0, TAU);
    }
    if(state.orbitSpeed === undefined){
      state.orbitSpeed = randomRange(0.6, 0.9);
    }
    if(state.orbitDirection === undefined){
      state.orbitDirection = randomRange(-1, 1) >= 0 ? 1 : -1;
    }
    const orbitHeight = Number.isFinite(stick.orbitHeight) ? stick.orbitHeight : 120;
    state.orbitAngle += state.orbitSpeed * state.orbitDirection * dt;
    let desiredX = pelvis.x;
    let desiredY = pelvis.y - orbitHeight;
    if(center){
      desiredX = center.x + Math.cos(state.orbitAngle) * orbitRadius;
      desiredY = center.y - orbitHeight + Math.sin(state.orbitAngle) * orbitRadius * 0.28;
    }
    const stiffness = 4200;
    pelvis.addForce((desiredX - pelvis.x) * stiffness * dt, (desiredY - pelvis.y) * stiffness * dt);
    const damp = clamp(dt * 3.2, 0, 0.6);
    pelvis.vx *= 1 - damp;
    pelvis.vy *= 1 - damp * 0.6;
    stick.dir = desiredX >= pelvis.x ? 1 : -1;
    const delay = Math.max(0.6, Number.isFinite(stick.lightningDelay) ? stick.lightningDelay : 1.25);
    const baseCooldown = Number.isFinite(stick.lightningCooldown) ? stick.lightningCooldown : 3.2;
    const cooldownJitter = Number.isFinite(stick.lightningCooldownJitter) ? stick.lightningCooldownJitter : 1.2;
    if(state.pendingStrike){
      state.pendingStrike.timer -= dt;
      if(state.pendingStrike.timer <= 0){
        spawnShinLightning(stick, state.pendingStrike.x, state.pendingStrike.y);
        if(state.pendingStrike.telegraph){
          state.pendingStrike.telegraph.maxLife = Math.min(state.pendingStrike.telegraph.maxLife || delay, 0.1);
        }
        const cooldownRoll = randomRange(baseCooldown - cooldownJitter * 0.5, baseCooldown + cooldownJitter * 0.5);
        state.attackCooldown = Math.max(delay * 0.8, cooldownRoll);
        state.pendingStrike = null;
      }
    }else{
      state.attackCooldown = Math.max(0, (state.attackCooldown || 0) - dt);
      if(state.attackCooldown <= 0){
        const target = selectTargetFor(stick, 860, 1280);
        const tc = target && typeof target.center === 'function' ? target.center() : null;
        if(tc){
          const telegraph = spawnShinTelegraph(stick, tc.x, tc.y, stick.lightningRadius || 86, delay);
          state.pendingStrike = { x: tc.x, y: tc.y, timer: delay, total: delay, telegraph };
          state.attackCooldown = delay + 0.2;
        }else{
          state.attackCooldown = 0.4;
        }
      }
    }
    if(!summoner){
      stick.moveInput(Math.sin(state.time * 1.2) * 0.18);
    }
  }
};

