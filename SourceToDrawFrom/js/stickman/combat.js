// stickman/combat.js

function spawnArcaneSpark(world, x, y, color, ring=false){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  if(ring){
    const particle = {
      type: 'ring',
      style: 'ring',
      x,
      y,
      rotation: 0,
      spin: 0,
      radius: rand(10, 18),
      thickness: rand(2, 3.4),
      color: color || '#d6b6ff',
      life: 0,
      maxLife: 320,
      opacity: 0.85
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'ring');
    world.particles.push(particle);
  }else{
    const particle = {
      type: 'ember',
      style: 'ember',
      x,
      y,
      vx: rand(-40, 40),
      vy: rand(-60, -20),
      rotation: rand(0, TAU),
      spin: rand(-3, 3) * 0.4,
      width: rand(8, 12),
      height: rand(16, 26),
      color: color || '#d6b6ff',
      life: 0,
      maxLife: 420,
      opacity: 0.95,
      gravityScale: -0.15
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'ember');
    world.particles.push(particle);
  }
  trimWorldParticles(world);
}




function easeInOutCubic(t){
  const clamped = clamp(t, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

function easeOutCubic(t){
  const clamped = clamp(t, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function recordWeaponHitboxDebug(attacker, center, range, attackDirX, attackDirY, arc, options={}){
  if(!attacker || !center) return;
  const world = attacker.world || null;
  if(!world?.gameplayFlags?.showHitboxes) return;
  const resolvedRange = Math.max(0, Number(range) || 0);
  if(!(resolvedRange > 0)) return;
  let resolvedArc = Number.isFinite(arc) ? clamp(arc, 0, TAU) : Math.PI;
  let fullArc = !!options.fullArc;
  if(resolvedArc >= TAU - 1e-3){
    fullArc = true;
    resolvedArc = TAU;
  }
  if(fullArc) resolvedArc = TAU;
  const defaultDir = attacker.dir >= 0 ? 0 : Math.PI;
  const baseAngle = Number.isFinite(options.angle)
    ? options.angle
    : (Number.isFinite(attackDirX) || Number.isFinite(attackDirY))
      ? Math.atan2(attackDirY || 0, attackDirX || 1)
      : defaultDir;
  const duration = Math.max(60, Number.isFinite(options.duration) ? options.duration : 320);
  if(!Array.isArray(attacker._debugWeaponHitboxes)) attacker._debugWeaponHitboxes = [];
  attacker._debugWeaponHitboxes.push({
    x: center.x,
    y: center.y,
    range: resolvedRange,
    arc: resolvedArc,
    angle: baseAngle,
    fullArc,
    friendly: !attacker.isEnemy,
    expires: nowMs() + duration
  });
}

function attackMelee(attacker, w, world, opts={}){
  const overrideCenter = opts.centerOverride;
  const src = overrideCenter && Number.isFinite(overrideCenter.x) && Number.isFinite(overrideCenter.y)
    ? { x: overrideCenter.x, y: overrideCenter.y }
    : attacker.center();
  const audio = window.audioSystem;
  const baseRange = Number.isFinite(opts.baseRange) ? opts.baseRange : (w.range ?? 42);
  const range = baseRange * (opts.rangeMultiplier ?? 1);
  const baseKnockValue = Number.isFinite(opts.baseKnock) ? opts.baseKnock : (w.knock ?? 160);
  const knockBase = (opts.knockOverride !== undefined)
    ? opts.knockOverride
    : baseKnockValue * (opts.knockMultiplier ?? 1);
  const baseDamageValue = Number.isFinite(opts.baseDamage) ? opts.baseDamage : (w.dmg ?? 0);
  let dmgBase = baseDamageValue * (opts.damageMultiplier ?? 1);
  if(opts.damageOverride !== undefined){
    dmgBase = opts.damageOverride;
  }
  dmgBase = Math.max(1, Math.round(dmgBase));
  const facing = opts.direction ?? attacker.dir;
  const fullArc = !!opts.fullArc;
  const weaponElement = opts.elementOverride ?? w.element;
  const defaultAngle = facing >= 0 ? 0 : Math.PI;
  const aimAngle = Number.isFinite(opts.aimAngle) ? opts.aimAngle : defaultAngle;
  const attackDirX = Math.cos(aimAngle);
  const attackDirY = Math.sin(aimAngle);
  const arc = Number.isFinite(opts.arc) ? clamp(opts.arc, 0, TAU) : Math.PI;
  const arcThreshold = Math.cos(Math.min(TAU, Math.max(0, arc)) * 0.5);
  const requiresArcCheck = !fullArc && arc < TAU - 1e-6;
  const withinArc = (dx, dy) => {
    if(!requiresArcCheck) return true;
    const dist = Math.hypot(dx, dy);
    if(dist <= 1e-3) return true;
    const nx = dx / dist;
    const ny = dy / dist;
    return nx * attackDirX + ny * attackDirY >= arcThreshold;
  };
  const swingDuration = Number.isFinite(opts.debugDuration)
    ? opts.debugDuration
    : Number.isFinite(w?.swingDuration)
      ? w.swingDuration
      : Number.isFinite(w?.thrustDuration)
        ? w.thrustDuration
        : 320;
  recordWeaponHitboxDebug(attacker, src, range, attackDirX, attackDirY, arc, {
    fullArc,
    duration: swingDuration,
    angle: aimAngle
  });
  let hitStick = false;
  const stickHits = [];
  for(const s of world.sticks){
    if(s===attacker || s.dead) continue;
    if(attacker && s.isEnemy === attacker.isEnemy) continue;
    const center = s.center();
    const dx = center.x - src.x;
    const dy = center.y - src.y;
    const dist = typeof s.distanceToPoint === 'function'
      ? s.distanceToPoint(src.x, src.y)
      : Math.hypot(dx, dy);
    if(dist < range && withinArc(dx, dy)){
      const kx = dx > 0 ? 1 : -1;
      const knock = knockBase;
      s.takeDamage(dmgBase, kx*knock/160, 0.3, attacker, {
        element: weaponElement || (attacker && attacker.element) || 'physical'
      });
      hitStick = true;
      stickHits.push({ target: s, center });
      if(attacker && !attacker.isEnemy) attacker.addXp(6);
    }
  }
  const attackDir = { x: attackDirX, y: attackDirY };
  if(stickHits.length){
    triggerMeleeHitEffects(attacker, w, world, stickHits, { aimAngle, attackDir });
  }
  const hitProps = damageBreakableProps(world, src, range, facing, fullArc, dmgBase, weaponElement, attacker, attackDir, arc);
  const hitStructures = damageBreakableStructures(world, src, range, facing, fullArc, dmgBase, weaponElement, attackDir, arc);
  triggerWeaponAftershock(attacker, w, world, { ...opts, aimAngle });
  if((hitStick || hitProps || hitStructures) && attacker && !attacker.isEnemy && audio && typeof audio.playEffect === 'function'){
    audio.playEffect('swordHit');
  }
}

function triggerMeleeHitEffects(attacker, weapon, world, hits, opts={}){
  if(!attacker || !weapon || !world) return;
  if(!Array.isArray(hits) || hits.length === 0) return;
  if(weapon.photostigma){
    spawnPhotostigmaHitEffects(attacker, weapon, world, hits, opts);
  }
}

function spawnPhotostigmaHitEffects(attacker, weapon, world, hits, opts={}){
  if(!Array.isArray(hits) || hits.length === 0) return;
  const config = weapon.photostigma || {};
  for(const entry of hits){
    if(!entry) continue;
    const center = entry.center || (entry.target && typeof entry.target.center === 'function' ? entry.target.center() : null);
    if(!center) continue;
    spawnPhotostigmaLightning(world, center.x, center.y, config);
    const burstCount = Math.max(0, Math.round(config.shrapnelCount ?? 0));
    if(burstCount > 0){
      spawnPhotostigmaShrapnel(attacker, weapon, world, center, config, opts);
    }
  }
}

function spawnPhotostigmaLightning(world, x, y, config={}){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const count = Math.max(1, Math.round(config.lightningCount || 1));
  const length = config.lightningLength ?? 46;
  const life = config.lightningLife ?? 240;
  const baseNoise = config.lightningNoise ?? 6;
  const segments = Math.max(2, Math.round(config.lightningSegments ?? 4));
  for(let i=0;i<count;i++){
    const points = [];
    const baseAngle = typeof rand === 'function' ? rand(0, TAU) : Math.random() * TAU;
    for(let s=1;s<=segments;s++){
      const ratio = s / segments;
      const radius = length * ratio;
      const angleOffset = typeof rand === 'function' ? rand(-0.3, 0.3) : (Math.random() - 0.5) * 0.6;
      const noise = typeof rand === 'function' ? rand(-baseNoise, baseNoise) : (Math.random() - 0.5) * baseNoise * 2;
      const angle = baseAngle + angleOffset;
      const px = Math.cos(angle) * radius + noise * 0.25;
      const py = Math.sin(angle) * radius + noise;
      points.push({ x: px, y: py });
    }
    world.particles.push({
      type: 'voidLightning',
      style: 'voidLightning',
      x: x + (typeof rand === 'function' ? rand(-3, 3) : (Math.random() - 0.5) * 6),
      y: y + (typeof rand === 'function' ? rand(-3, 3) : (Math.random() - 0.5) * 6),
      points,
      alpha: 1,
      life: 0,
      maxLife: life,
      width: config.lightningWidth ?? 2.2,
      color: config.lightningColor || 'rgba(190, 176, 255, 0.95)',
      glow: config.lightningGlow ?? 18,
      jitter: config.lightningNoise ?? 1.6
    });
  }
  if(typeof trimWorldParticles === 'function') trimWorldParticles(world, 420);
}

function spawnPhotostigmaShrapnel(attacker, weapon, world, origin, config={}, opts={}){
  if(typeof shootProjectile !== 'function' || !world) return;
  const count = Math.max(1, Math.round(config.shrapnelCount || 1));
  const speed = config.shrapnelSpeed ?? 720;
  const damageBase = config.shrapnelDamage ?? Math.max(1, Math.round((weapon.baseDamage ?? weapon.dmg ?? 2) * 0.6));
  const ttl = config.shrapnelTtl ?? 900;
  const spread = Number.isFinite(config.shrapnelSpread) ? Math.max(0, config.shrapnelSpread) : TAU;
  const baseAngle = Number.isFinite(opts?.aimAngle) ? opts.aimAngle : (attacker?.dir >= 0 ? 0 : Math.PI);
  for(let i=0;i<count;i++){
    let angle;
    if(spread >= TAU - 1e-3){
      angle = typeof rand === 'function' ? rand(0, TAU) : Math.random() * TAU;
    }else{
      const offset = typeof rand === 'function' ? rand(-spread * 0.5, spread * 0.5) : (Math.random() - 0.5) * spread;
      angle = baseAngle + offset;
    }
    const originPoint = {
      x: origin.x + (typeof rand === 'function' ? rand(-4, 4) : (Math.random() - 0.5) * 8),
      y: origin.y + (typeof rand === 'function' ? rand(-4, 4) : (Math.random() - 0.5) * 8)
    };
    const projectileOpts = {
      origin: originPoint,
      angle,
      speed,
      gravity: false,
      damage: damageBase,
      ttl,
      color: config.shrapnelColor || weapon.color || '#c6b3ff',
      trailColor: config.shrapnelTrailColor || 'rgba(188, 160, 255, 0.55)',
      fadeRate: config.shrapnelFadeRate ?? 0.0026,
      radius: config.shrapnelRadius ?? 4,
      element: weapon.element || 'void',
      alpha: 1
    };
    shootProjectile(attacker, weapon, 'voidShrapnel', projectileOpts, world);
  }
}

function triggerWeaponAftershock(attacker, weapon, world, opts={}){
  if(!attacker || !weapon || !world) return;
  if(weapon.slashWaveCount){
    const aimAngle = Number.isFinite(opts.aimAngle) ? opts.aimAngle : attacker?.lastAttackAim?.angle;
    const payload = Number.isFinite(aimAngle) ? { ...opts, aimAngle } : opts;
    spawnEmberBladeAftershock(attacker, weapon, world, payload);
  }
  if(weapon.lightLineExperiment){
    const aimAngle = Number.isFinite(opts.aimAngle) ? opts.aimAngle : attacker?.lastAttackAim?.angle;
    const payload = Number.isFinite(aimAngle) ? { ...opts, aimAngle } : opts;
    spawnUltimateLightLine(attacker, weapon, world, payload);
  }
}

function spawnEmberBladeAftershock(attacker, weapon, world, options){
  const count = Math.max(1, Math.round(weapon.slashWaveCount || 0));
  if(count <= 0) return;
  const spread = weapon.slashWaveSpread ?? 0;
  const aimAngle = Number.isFinite(options?.aimAngle) ? options.aimAngle : (attacker?.dir >= 0 ? 0 : Math.PI);
  const baseAngle = aimAngle;
  const totalSpread = spread * (count - 1);
  const startAngle = baseAngle - totalSpread * 0.5;
  const damage = weapon.slashWaveDamage ?? Math.max(6, Math.round((weapon.dmg ?? 10) * 0.65));
  const ttl = weapon.slashWaveTtl ?? 520;
  const fade = weapon.slashWaveFade ?? 1;
  const speed = weapon.slashWaveSpeed ?? 780;
  const projectileKind = weapon.slashWaveProjectile || 'emberWave';
  const waveColor = weapon.slashWaveColor || weapon.color;
  const onExpire = typeof weapon.slashWaveOnExpire === 'function' ? weapon.slashWaveOnExpire : null;
  for(let i=0;i<count;i++){
    const angle = count > 1 ? startAngle + spread * i : baseAngle;
    const projectileOpts = {
      speed,
      gravity: false,
      angle,
      ttl,
      damage,
      color: waveColor,
      alpha: 1,
      fadeRate: fade,
      blastRadius: weapon.slashWaveBlastRadius,
      blastDamage: weapon.slashWaveBlastDamage,
      element: weapon.element,
      igniteRadius: weapon.slashWaveIgniteRadius
    };
    if(onExpire) projectileOpts.onExpire = onExpire;
    if(weapon.slashWavePushRadius !== undefined) projectileOpts.pushRadius = weapon.slashWavePushRadius;
    if(weapon.slashWavePushForce !== undefined) projectileOpts.pushForce = weapon.slashWavePushForce;
    shootProjectile(attacker, weapon, projectileKind, projectileOpts, world);
  }
  spawnEmberBladeSparks(attacker, weapon, world, aimAngle);
}

function distancePointToSegmentFast(px, py, ax, ay, bx, by){
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if(lenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const sx = ax + dx * t;
  const sy = ay + dy * t;
  return Math.hypot(px - sx, py - sy);
}

function createLightLineSegment(start, tip, options={}){
  const sx = Number.isFinite(start?.x) ? start.x : 0;
  const sy = Number.isFinite(start?.y) ? start.y : 0;
  const tx = Number.isFinite(tip?.x) ? tip.x : sx;
  const ty = Number.isFinite(tip?.y) ? tip.y : sy;
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.hypot(dx, dy);
  const initialAngle = Math.atan2(dy, dx);
  const shouldSoftbody = !!options.softbody;
  const deferSoftbody = !!options.deferSoftbody;
  const hangRequested = !!options.hang;
  const line = {
    start: { x: sx, y: sy },
    tip: { x: tx, y: ty },
    width: options.width ?? 12,
    glowColor: options.glowColor || 'rgba(255, 216, 255, 0.75)',
    coreColor: options.coreColor || '#ffffff',
    opacity: options.opacity ?? 1,
    attached: !!options.attached,
    hanging: shouldSoftbody && !deferSoftbody && hangRequested,
    pendingHang: shouldSoftbody && deferSoftbody && hangRequested,
    softbodyEnabled: shouldSoftbody && !deferSoftbody,
    pendingSoftbody: shouldSoftbody && deferSoftbody,
    softbodyDelayMs: Number.isFinite(options.softbodyDelayMs) ? Math.max(0, options.softbodyDelayMs) : 0,
    softbodyEnableAt: Number.isFinite(options.softbodyEnableAt) ? options.softbodyEnableAt : null,
    beamPhase: shouldSoftbody && deferSoftbody,
    length,
    initialAngle,
    targetAngle: options.targetAngle ?? Math.PI / 2,
    hangDuration: options.hangDuration ?? 0.4,
    hangTime: 0
  };
  if(line.softbodyEnabled && typeof initializeThetaLineSoftbody === 'function'){
    initializeThetaLineSoftbody(line, line.start, line.tip);
  }
  return line;
}

function enableLightLineSoftbody(line){
  if(!line || line.softbodyEnabled) return;
  line.softbodyEnabled = true;
  line.pendingSoftbody = false;
  line.softbodyEnableAt = null;
  line.beamPhase = false;
  line.hangTime = 0;
  if(line.pendingHang){
    line.hanging = true;
    line.pendingHang = false;
  }
  if(typeof initializeThetaLineSoftbody === 'function'){
    initializeThetaLineSoftbody(line, line.start, line.tip);
  }
}

function applyUltimateLightLineDamage(attacker, world, start, tip, damage, radius, element){
  if(!world || !Array.isArray(world.sticks)) return;
  const sx = Number.isFinite(start?.x) ? start.x : null;
  const sy = Number.isFinite(start?.y) ? start.y : null;
  const tx = Number.isFinite(tip?.x) ? tip.x : null;
  const ty = Number.isFinite(tip?.y) ? tip.y : null;
  if(sx === null || sy === null || tx === null || ty === null) return;
  const effectiveRadius = Math.max(4, radius || 24);
  for(const stick of world.sticks){
    if(!stick || stick.dead) continue;
    if(attacker && stick === attacker) continue;
    if(attacker && stick.isEnemy === attacker.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dist = typeof stick.distanceToSegment === 'function'
      ? stick.distanceToSegment(sx, sy, tx, ty)
      : distancePointToSegmentFast(center.x, center.y, sx, sy, tx, ty);
    if(dist > effectiveRadius) continue;
    const dealt = Math.max(1, Math.round(damage));
    stick.takeDamage(dealt, 0, 0.15, attacker, { element: element || 'light' });
  }
}

function sampleHemisphereDirection(reference, spread=Math.PI / 2, fallback=null){
  const hasReference = reference && (Math.abs(reference.x) > 1e-4 || Math.abs(reference.y) > 1e-4);
  const baseVector = hasReference
    ? reference
    : (fallback && (Math.abs(fallback.x) > 1e-4 || Math.abs(fallback.y) > 1e-4))
      ? fallback
      : { x: 1, y: 0 };
  const baseAngle = Math.atan2(baseVector.y, baseVector.x);
  const maxOffset = Math.min(Math.PI / 2, Math.max(0, spread ?? Math.PI / 2));
  for(let attempt=0; attempt<6; attempt++){
    const offset = typeof rand === 'function'
      ? rand(-maxOffset, maxOffset)
      : (Math.random() - 0.5) * 2 * maxOffset;
    const angle = baseAngle + offset;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    if(!hasReference) return dir;
    const dot = dir.x * reference.x + dir.y * reference.y;
    if(dot >= -1e-4) return dir;
  }
  const len = Math.hypot(baseVector.x, baseVector.y) || 1;
  return { x: baseVector.x / len, y: baseVector.y / len };
}

function spawnPendingUltimateLightLineBranches(particle, world, now=typeof nowMs === 'function' ? nowMs() : Date.now()){
  if(!particle || !world) return;
  const pending = particle.pendingBranches;
  if(!pending || pending.triggered) return;
  const currentTime = Number.isFinite(now) ? now : (typeof nowMs === 'function' ? nowMs() : Date.now());
  if(currentTime < pending.triggerAt) return;
  pending.triggered = true;
  const owner = particle.owner || null;
  const element = particle.element || 'light';
  const lines = Array.isArray(particle.lines) ? particle.lines : [];
  const primaryLine = particle.primaryLine || (lines.length ? lines[0] : null);
  const anchorPoint = pending.anchor
    ? { x: pending.anchor.x, y: pending.anchor.y }
    : (primaryLine?.tip ? { x: primaryLine.tip.x, y: primaryLine.tip.y } : null);
  if(!anchorPoint) return;
  const normal = pending.normal && (Math.abs(pending.normal.x) > 1e-4 || Math.abs(pending.normal.y) > 1e-4)
    ? { x: pending.normal.x, y: pending.normal.y }
    : null;
  const rects = Array.isArray(pending.rectangles)
    ? pending.rectangles
    : (Array.isArray(particle.branchRectangles) ? particle.branchRectangles : []);
  const branchCount = Math.max(0, pending.branchCount || 0);
  const branchLength = Math.max(6, pending.branchLength || 0);
  const branchWidth = pending.branchWidth;
  const branchDamage = Math.max(0, pending.branchDamage || 0);
  const branchRadius = Math.max(0, pending.branchDamageRadius ?? particle.damageRadius ?? 24);
  const branchLines = [];
  for(let i=0;i<branchCount;i++){
    const dir = sampleHemisphereDirection(normal, pending.branchSpread, pending.fallbackDirection || normal);
    let tip = {
      x: anchorPoint.x + dir.x * branchLength,
      y: anchorPoint.y + dir.y * branchLength
    };
    let attached = false;
    let hitNormal = null;
    if(typeof raycastEnvironment === 'function' && Array.isArray(rects) && rects.length){
      const hit = raycastEnvironment(anchorPoint, dir, branchLength, rects);
      if(hit && hit.point){
        attached = true;
        hitNormal = hit.normal ? { x: hit.normal.x, y: hit.normal.y } : null;
        tip = {
          x: hit.point.x - (hit.normal?.x || 0) * 2,
          y: hit.point.y - (hit.normal?.y || 0) * 2
        };
      }
    }
    const branchLine = createLightLineSegment(anchorPoint, tip, {
      width: branchWidth,
      glowColor: particle.glowColor,
      coreColor: particle.coreColor,
      softbody: true,
      deferSoftbody: true,
      softbodyDelayMs: pending.branchSoftbodyDelayMs ?? 0,
      attached,
      hang: !attached,
      hangDuration: (particle.hangDuration ?? pending.hangDurationMs ?? 420) / 1000
    });
    if(branchLine.pendingSoftbody){
      const delay = Number.isFinite(branchLine.softbodyDelayMs) ? branchLine.softbodyDelayMs : 0;
      branchLine.softbodyEnableAt = currentTime + delay;
    }
    branchLine.branchDirection = { x: dir.x, y: dir.y };
    branchLine.attachmentNormal = hitNormal;
    lines.push(branchLine);
    branchLines.push({ line: branchLine, dir, attached, hitNormal });
    if(branchDamage > 0){
      applyUltimateLightLineDamage(owner, world, branchLine.start, branchLine.tip, branchDamage, branchRadius, element);
    }
  }
  const subCount = Math.max(0, pending.subBranchCount || 0);
  if(subCount > 0){
    const subLength = Math.max(4, pending.subBranchLength || 0);
    const subWidth = pending.subBranchWidth;
    const subDamage = Math.max(0, pending.subBranchDamage || 0);
    const subRadius = Math.max(0, pending.subBranchDamageRadius ?? branchRadius);
    const subDelay = pending.subSoftbodyDelayMs ?? 0;
    for(const entry of branchLines){
      if(!entry || !entry.attached) continue;
      const start = entry.line?.tip;
      if(!start) continue;
      const reference = entry.hitNormal || entry.dir;
      for(let i=0;i<subCount;i++){
        const dir = sampleHemisphereDirection(reference, pending.subBranchSpread, entry.dir);
        let tip = {
          x: start.x + dir.x * subLength,
          y: start.y + dir.y * subLength
        };
        let attached = false;
        if(typeof raycastEnvironment === 'function' && Array.isArray(rects) && rects.length){
          const hit = raycastEnvironment(start, dir, subLength, rects);
          if(hit && hit.point){
            attached = true;
            tip = {
              x: hit.point.x - (hit.normal?.x || 0) * 2,
              y: hit.point.y - (hit.normal?.y || 0) * 2
            };
          }
        }
        const subLine = createLightLineSegment(start, tip, {
          width: subWidth,
          glowColor: particle.glowColor,
          coreColor: particle.coreColor,
          softbody: true,
          deferSoftbody: true,
          softbodyDelayMs: subDelay,
          attached,
          hang: !attached,
          hangDuration: (particle.hangDuration ?? pending.hangDurationMs ?? 420) / 1000
        });
        if(subLine.pendingSoftbody){
          const delay = Number.isFinite(subLine.softbodyDelayMs) ? subLine.softbodyDelayMs : 0;
          subLine.softbodyEnableAt = currentTime + delay;
        }
        lines.push(subLine);
        if(subDamage > 0){
          applyUltimateLightLineDamage(owner, world, subLine.start, subLine.tip, subDamage, subRadius, element);
        }
      }
    }
  }
  particle.pendingBranches = null;
}

function spawnUltimateLightLine(attacker, weapon, world, opts={}){
  if(!attacker || !weapon || !world) return;
  const config = weapon.lightLineExperiment || {};
  const origin = opts.centerOverride
    ? { x: opts.centerOverride.x, y: opts.centerOverride.y }
    : (typeof attacker.center === 'function' ? attacker.center() : null);
  if(!origin) return;
  const aimAngle = Number.isFinite(opts.aimAngle) ? opts.aimAngle : (attacker.dir >= 0 ? 0 : Math.PI);
  const dir = { x: Math.cos(aimAngle), y: Math.sin(aimAngle) };
  const primaryLength = Math.max(20, config.primaryLength ?? 300);
  const branchLength = Math.max(10, config.branchLength ?? 150);
  const subBranchLength = Math.max(6, config.subBranchLength ?? 90);
  const branchCount = Math.max(0, Math.round(config.branchCount ?? 3));
  const subBranchCount = Math.max(0, Math.round(config.subBranchCount ?? 2));
  const damageRadius = Math.max(6, config.damageRadius ?? 36);
  const baseDamage = Math.max(4, Number.isFinite(weapon.baseDamage) ? weapon.baseDamage : weapon.dmg ?? 6);
  const attackStat = Number.isFinite(attacker.attack) ? attacker.attack : baseDamage;
  const primaryDamage = Math.max(6, Math.round(attackStat * 1.2));
  const branchDamage = Math.max(4, Math.round(primaryDamage * (config.branchDamageMultiplier ?? 0.75)));
  const subBranchDamage = Math.max(3, Math.round(primaryDamage * (config.subBranchDamageMultiplier ?? 0.55)));
  const rects = typeof thetaLineCollisionRectangles === 'function'
    ? thetaLineCollisionRectangles(attacker, origin, primaryLength + branchLength + subBranchLength)
    : (typeof attacker._solidRectangles === 'function' ? attacker._solidRectangles() : []);
  let primaryTip = {
    x: origin.x + dir.x * primaryLength,
    y: origin.y + dir.y * primaryLength
  };
  let hitNormal = null;
  if(typeof raycastEnvironment === 'function' && Array.isArray(rects) && rects.length){
    const hit = raycastEnvironment(origin, dir, primaryLength, rects);
    if(hit && hit.point){
      primaryTip = {
        x: hit.point.x - (hit.normal?.x || 0) * 2,
        y: hit.point.y - (hit.normal?.y || 0) * 2
      };
      if(hit.normal){
        hitNormal = { x: hit.normal.x, y: hit.normal.y };
      }
    }
  }
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const lines = [];
  const primaryAttached = !!hitNormal;
  const primaryLine = createLightLineSegment(origin, primaryTip, {
    width: config.primaryWidth ?? 18,
    glowColor: config.glowColor,
    coreColor: config.coreColor,
    softbody: true,
    deferSoftbody: true,
    softbodyDelayMs: config.primarySoftbodyDelayMs ?? 0,
    attached: primaryAttached,
    hang: !primaryAttached,
    hangDuration: (config.hangDurationMs ?? 420) / 1000
  });
  if(primaryLine.pendingSoftbody){
    const delay = Number.isFinite(primaryLine.softbodyDelayMs) ? primaryLine.softbodyDelayMs : 0;
    primaryLine.softbodyEnableAt = (Number.isFinite(now) ? now : (typeof nowMs === 'function' ? nowMs() : Date.now())) + delay;
  }
  lines.push(primaryLine);
  const element = weapon.element || attacker.element || 'light';
  applyUltimateLightLineDamage(attacker, world, primaryLine.start, primaryLine.tip, primaryDamage, damageRadius, element);
  const branchDelayMs = Number.isFinite(config.branchDelayMs) ? Math.max(0, config.branchDelayMs) : 500;
  const branchWidth = config.branchWidth ?? Math.max(6, (config.primaryWidth ?? 18) * 0.7);
  const subBranchWidth = config.subBranchWidth ?? Math.max(4, (branchWidth) * 0.7);
  const pendingBranches = primaryAttached && branchCount > 0
    ? {
        triggerAt: (Number.isFinite(now) ? now : (typeof nowMs === 'function' ? nowMs() : Date.now())) + branchDelayMs,
        branchCount,
        branchLength,
        branchWidth,
        branchDamage,
        branchDamageRadius: damageRadius * 0.8,
        branchSpread: config.branchSpread ?? Math.PI / 2,
        normal: hitNormal,
        rectangles: rects,
        anchor: { x: primaryTip.x, y: primaryTip.y },
        hangDurationMs: config.hangDurationMs ?? 420,
        branchSoftbodyDelayMs: config.branchSoftbodyDelayMs ?? 0,
        subBranchCount,
        subBranchLength,
        subBranchWidth,
        subBranchDamage,
        subBranchDamageRadius: damageRadius * 0.65,
        subBranchSpread: config.subBranchSpread ?? Math.PI / 2,
        subSoftbodyDelayMs: config.subBranchSoftbodyDelayMs ?? 0
      }
    : null;

  if(!Array.isArray(world.particles)) world.particles = [];
  world.particles.push({
    style: 'ultimateLightLine',
    x: 0,
    y: 0,
    life: 0,
    maxLife: Math.max(120, config.maxLifeMs ?? 720),
    opacity: 1,
    lines,
    glowColor: config.glowColor || 'rgba(255, 216, 255, 0.85)',
    coreColor: config.coreColor || '#ffffff',
    hangDuration: Math.max(120, config.hangDurationMs ?? 420),
    owner: attacker,
    element,
    damageRadius,
    primaryLine,
    branchRectangles: rects,
    pendingBranches
  });
  if(typeof trimWorldParticles === 'function') trimWorldParticles(world, 520);
}

function spawnEmberBladeSparks(attacker, weapon, world, aimAngle=null){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const origin = attacker?.center ? attacker.center() : { x: 0, y: 0 };
  const forward = Number.isFinite(aimAngle) ? (Math.cos(aimAngle) >= 0 ? 1 : -1) : (attacker?.dir >= 0 ? 1 : -1);
  const count = Math.max(4, Math.round(weapon.slashSparkCount ?? 14));
  for(let i=0;i<count;i++){
    const particle = {
      type: 'ember',
      style: 'ember',
      x: origin.x + rand(-18, 18),
      y: origin.y - rand(8, 26),
      vx: forward * rand(180, 320) + rand(-60, 60),
      vy: rand(-320, -140),
      rotation: rand(0, TAU),
      spin: rand(-6, 6),
      width: rand(8, 14),
      height: rand(18, 28),
      life: 0,
      maxLife: rand(360, 560),
      color: weapon.slashWaveColor || weapon.color,
      alpha: 1
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'ember');
    world.particles.push(particle);
  }
  const maxParticles = 260;
  if(world.particles.length > maxParticles){
    world.particles.splice(0, world.particles.length - maxParticles);
  }
}

function damageBreakableProps(world, src, range, facing, fullArc, damage, element, attacker, attackDir=null, arc=Math.PI){
  if(!world) return false;
  const hasDecor = Array.isArray(world.decor) && world.decor.length > 0;
  const hasSoftBodies = Array.isArray(world.softBodies) && world.softBodies.length > 0;
  if(!hasDecor && !hasSoftBodies) return false;
  const hits = [];
  const bagHits = [];
  const softHits = [];
  const useAttackDir = !!attackDir;
  const requiresArcCheck = useAttackDir && arc < TAU - 1e-6;
  const arcThreshold = requiresArcCheck ? Math.cos(Math.min(TAU, Math.max(0, arc)) * 0.5) : -1;
  const withinArc = (dx, dy) => {
    if(!requiresArcCheck) return true;
    const dist = Math.hypot(dx, dy);
    if(dist <= 1e-3) return true;
    const nx = dx / dist;
    const ny = dy / dist;
    return nx * attackDir.x + ny * attackDir.y >= arcThreshold;
  };
  if(hasDecor){
    for(const prop of world.decor){
      if(!prop || prop.broken) continue;
      if(prop.type === 'punchingBag'){
        const width = prop.width ?? 48;
        const height = prop.height ?? 120;
        const halfW = width * 0.5;
        const halfH = height * 0.5;
        const cx = prop.x ?? 0;
        const baseY = prop.baseY ?? prop.y ?? 0;
        const cy = baseY - halfH;
        const reach = range + Math.max(halfW, halfH);
        const dist = distance(src.x, src.y, cx, cy);
        if(dist > reach) continue;
        if(useAttackDir){
          if(!withinArc(cx - src.x, cy - src.y)) continue;
        }else if(!fullArc){
          if(facing > 0 && cx < src.x - halfW) continue;
          if(facing < 0 && cx > src.x + halfW) continue;
        }
        bagHits.push({ prop, direction: facing });
        continue;
      }
      const isFireflyJar = prop.type === 'fireflyJar' || prop.type === 'hangingFireflyJar';
      const isChronoFlyJar = prop.type === 'chronoFlyJar';
      if(!isFireflyJar && !isChronoFlyJar && (prop.type !== 'crate' || !prop.breakable)) continue;
      const width = prop.width ?? 34;
      const height = prop.height ?? 28;
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const cx = prop.x ?? 0;
      const baseY = prop.baseY ?? prop.y ?? 0;
      const cy = baseY - halfH;
      const reach = range + Math.max(halfW, halfH);
      const dist = distance(src.x, src.y, cx, cy);
      if(dist > reach) continue;
      if(useAttackDir){
        if(!withinArc(cx - src.x, cy - src.y)) continue;
      }else if(!fullArc){
        if(facing > 0 && cx < src.x - halfW) continue;
        if(facing < 0 && cx > src.x + halfW) continue;
      }
      hits.push(prop);
    }
  }
  if(hasSoftBodies){
    for(const body of world.softBodies){
      if(!body) continue;
      const center = typeof softBodyCenter === 'function'
        ? softBodyCenter(body)
        : (body.centerPoint ? { x: body.centerPoint.x, y: body.centerPoint.y } : null);
      if(!center) continue;
      const bodyRadius = Math.max(20, body.radius || 0);
      const reach = range + bodyRadius;
      const dx = center.x - src.x;
      const dy = center.y - src.y;
      const dist = Math.hypot(dx, dy);
      if(dist > reach) continue;
      if(useAttackDir){
        if(!withinArc(dx, dy)) continue;
      }else if(!fullArc){
        if(facing > 0 && center.x < src.x - bodyRadius) continue;
        if(facing < 0 && center.x > src.x + bodyRadius) continue;
      }
      softHits.push(body);
    }
  }
  if(bagHits.length && typeof registerPunchingBagHit === 'function'){
    for(const entry of bagHits){
      registerPunchingBagHit(world, entry.prop, attacker, damage, {
        direction: entry.direction,
        source: 'melee',
        element
      });
    }
  }
  if(softHits.length && typeof applySoftBodyImpulse === 'function'){
    for(const body of softHits){
      applySoftBodyImpulse(world, body, {
        origin: src,
        direction: facing,
        attackDir,
        damage,
        source: 'melee',
        element
      });
    }
  }
  if(!hits.length){
    return bagHits.length > 0 || softHits.length > 0;
  }
  const broken = [];
  for(const prop of hits){
    prop.health = (prop.health ?? 30) - damage;
    if(prop.health <= 0){
      breakDecorProp(world, prop);
      if(!prop.persistOnBreak) broken.push(prop);
    }
    if(typeof isFireElement === 'function' && isFireElement(element) && typeof igniteFlammableProp === 'function'){
      igniteFlammableProp(world, prop, { intensity: 1 });
    }
  }
  if(broken.length){
    world.decor = world.decor.filter(prop=>!broken.includes(prop));
  }
  return hits.length > 0 || bagHits.length > 0 || softHits.length > 0;
}

function damageBreakableStructures(world, src, range, facing, fullArc, damage, element, attackDir=null, arc=Math.PI){
  if(!world || !Array.isArray(world.breakables) || !world.breakables.length) return false;
  const hits = [];
  const useAttackDir = !!attackDir;
  const requiresArcCheck = useAttackDir && arc < TAU - 1e-6;
  const arcThreshold = requiresArcCheck ? Math.cos(Math.min(TAU, Math.max(0, arc)) * 0.5) : -1;
  const withinArc = (dx, dy) => {
    if(!requiresArcCheck) return true;
    const dist = Math.hypot(dx, dy);
    if(dist <= 1e-3) return true;
    const nx = dx / dist;
    const ny = dy / dist;
    return nx * attackDir.x + ny * attackDir.y >= arcThreshold;
  };
  for(const wall of world.breakables){
    if(!wall || wall.broken) continue;
    const cx = (wall.x ?? 0) + (wall.w ?? 0) * 0.5;
    const cy = (wall.y ?? 0) + (wall.h ?? 0) * 0.5;
    const reach = range + Math.max(wall.w ?? 0, wall.h ?? 0) * 0.5;
    const dist = distance(src.x, src.y, cx, cy);
    if(dist > reach) continue;
    if(useAttackDir){
      if(!withinArc(cx - src.x, cy - src.y)) continue;
    }else if(!fullArc){
      if(facing > 0 && cx < src.x - (wall.w ?? 0) * 0.4) continue;
      if(facing < 0 && cx > src.x + (wall.w ?? 0) * 0.4) continue;
    }
    hits.push(wall);
  }
  if(!hits.length) return false;
  let impacted = false;
  for(const wall of hits){
    const result = applyDamageToBreakableStructure(world, wall, damage, { element, damageKind: inferStructureDamageKind({ element }) });
    if(result.applied || result.blocked) impacted = true;
    if(typeof isFireElement === 'function' && isFireElement(element) && typeof igniteFlammableStructure === 'function'){
      igniteFlammableStructure(world, wall, { intensity: 1 });
    }
  }
  return impacted;
}

function registerPunchingBagHit(world, bag, attacker, baseDamage, opts={}){
  if(!bag) return;
  const now = nowMs();
  const defense = bag.defense ?? 0;
  let damage = Math.max(0, Math.round(baseDamage));
  if(typeof computeDamage === 'function' && attacker){
    damage = computeDamage(attacker, { defense }, baseDamage);
  }
  bag.totalDamage = (bag.totalDamage || 0) + damage;
  bag.lastDamage = damage;
  bag.lastDamageTime = now;
  bag.lastHitDirection = Math.sign(opts.direction ?? (attacker?.dir ?? 1)) || 1;
  if(opts.chargeRatio !== undefined) bag.lastChargeRatio = opts.chargeRatio;
  bag.lastHitSource = opts.source || 'melee';
  bag.lastHitElement = opts.element || null;
  bag.damageHistory = bag.damageHistory || [];
  bag.damageHistory.push({ value: damage, time: now });
  const maxEntries = 8;
  if(bag.damageHistory.length > maxEntries){
    bag.damageHistory.splice(0, bag.damageHistory.length - maxEntries);
  }
  const amplitude = Math.min(14, 4 + damage * 0.12);
  const direction = Math.sign(opts.direction ?? (attacker?.dir ?? 1)) || 1;
  bag.swing = { amplitude, direction, start: now, duration: 620 };
}

function applySoftBodyImpulse(world, body, opts={}){
  if(!world || !body) return;
  const points = Array.isArray(body.outerPoints) ? body.outerPoints : body.points;
  if(!Array.isArray(points) || !points.length) return;
  const origin = opts.origin || { x: body.centerPoint?.x ?? 0, y: body.centerPoint?.y ?? 0 };
  let target = body.centerPoint || points[0];
  let best = Infinity;
  for(const point of points){
    if(!point) continue;
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if(dist < best){
      best = dist;
      target = point;
    }
  }
  const attackVec = opts.attackDir || null;
  let dirX = attackVec ? attackVec.x : Math.sign(opts.direction ?? 1) || 1;
  let dirY = attackVec ? attackVec.y : -0.25;
  const len = Math.hypot(dirX, dirY) || 1;
  dirX /= len;
  dirY /= len;
  const impulseScale = body.impulseScale !== undefined ? body.impulseScale : Math.max(18, (body.radius || 36) * 0.8);
  const magnitude = Math.max(0, opts.impulse !== undefined ? opts.impulse : (opts.damage !== undefined ? opts.damage * impulseScale * 0.6 : impulseScale));
  const mass = Math.max(0.05, target?.mass || 1);
  const deltaVx = dirX * magnitude / mass;
  const deltaVy = dirY * magnitude / mass;
  const dt = Math.max(1 / 240, Math.min(1 / 30, world?.lastDt || 1 / 60));
  target.vx = (target.vx || 0) + deltaVx;
  target.vy = (target.vy || 0) + deltaVy;
  target.prevX = target.x - target.vx * dt;
  target.prevY = target.y - target.vy * dt;
  if(body.centerPoint && body.centerPoint !== target){
    const centerMass = Math.max(0.05, body.centerPoint.mass || 1);
    const centerImpulse = magnitude * 0.35 / centerMass;
    body.centerPoint.vx = (body.centerPoint.vx || 0) + dirX * centerImpulse;
    body.centerPoint.vy = (body.centerPoint.vy || 0) + dirY * centerImpulse;
    body.centerPoint.prevX = body.centerPoint.x - body.centerPoint.vx * dt;
    body.centerPoint.prevY = body.centerPoint.y - body.centerPoint.vy * dt;
  }
  body.impactDuration = body.impactDuration || 0.42;
  body.impactTimer = Math.max(body.impactTimer || 0, body.impactDuration);
  body.lastImpactAt = typeof nowMs === 'function' ? nowMs() : Date.now();
  body.lastHitSource = opts.source || 'melee';
  body.lastHitElement = opts.element || null;
  body.lastHitDirection = { x: dirX, y: dirY };
  body.lastHitDamage = opts.damage;
}

function breakBreakableStructure(world, wall){
  if(!wall || wall.broken || wall.unbreakable) return;
  wall.broken = true;
  wall.remove = true;
  const material = typeof resolveStructureMaterial === 'function' ? resolveStructureMaterial(wall) : (wall?.material || 'dirt');
  if(material === 'sandstone' && wall.lastDamageKind === 'explosive' && typeof spawnSandBurst === 'function'){
    const width = wall?.w ?? 32;
    const height = wall?.h ?? 60;
    const centerX = (wall?.x ?? 0) + width * 0.5;
    const centerY = (wall?.y ?? 0) + height * 0.5;
    const count = Math.max(18, Math.round((width * height) / 14));
    const spreadX = Math.max(32, width * 0.9);
    const spreadY = Math.max(20, height * 0.7);
    spawnSandBurst(world, centerX, centerY, count, spreadX, spreadY);
  }
  spawnCrumbleFragments(world, wall);
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
}

function spawnCrumbleFragments(world, wall){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const material = typeof resolveStructureMaterial === 'function' ? resolveStructureMaterial(wall) : (wall?.material || 'dirt');
  const width = wall?.w ?? 32;
  const height = wall?.h ?? 60;
  const left = wall?.x ?? 0;
  const top = wall?.y ?? 0;
  const count = Math.max(10, Math.round(width / 4));
  const lastDamageKind = wall?.lastDamageKind || null;
  if(material === 'sandstone' && lastDamageKind === 'explosive'){
    if(typeof spawnSandPuffParticles === 'function'){
      const centerX = left + width * 0.5;
      const centerY = top + height * 0.5;
      spawnSandPuffParticles(world, centerX, centerY, '#d8c489', '#b99a58');
    }
    return;
  }
  let primary = '#8a6b3e';
  let secondary = '#4f3a22';
  if(material === 'wood'){
    primary = '#c28a4a';
    secondary = '#6c4322';
  }else if(material === 'stone'){
    primary = '#cfd7e2';
    secondary = '#7f8896';
  }else if(material === 'sandstone'){
    primary = '#d8c489';
    secondary = '#b99a58';
  }
  for(let i=0;i<count;i++){
    const px = left + rand(0, width);
    const py = top + rand(0, height);
    const shardWidth = (material === 'stone' || material === 'sandstone') ? rand(8, 14) : rand(10, 18);
    const shardHeight = material === 'wood' ? rand(18, 30) : rand(16, 26);
    const velX = (material === 'stone' || material === 'sandstone') ? rand(-320, 320) : rand(-240, 240);
    const velY = (material === 'stone' || material === 'sandstone') ? rand(-680, -340) : rand(-620, -260);
    const shard = {
      type: 'ember',
      style: 'ember',
      x: px,
      y: py,
      vx: velX,
      vy: velY,
      rotation: rand(0, TAU),
      spin: rand(-4, 4),
      width: shardWidth,
      height: shardHeight,
      life: 0,
      maxLife: rand(420, 620),
      color: primary,
      alpha: 1
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'ember');
    world.particles.push(shard);
    if(i % 3 === 0){
      const ember = {
        type: 'ember',
        style: 'ember',
        x: px + rand(-6, 6),
        y: py + rand(-6, 6),
        vx: velX * 0.6,
        vy: velY * 0.6,
        rotation: rand(0, TAU),
        spin: rand(-3, 3),
        width: shardWidth * 0.7,
        height: shardHeight * 0.7,
        life: 0,
        maxLife: rand(360, 540),
        color: secondary,
        alpha: 1
      };
      if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ember, 'ember');
      world.particles.push(ember);
    }
    if(material !== 'steel' && i % 4 === 0){
      let dustColor = 'rgba(94, 72, 44, 0.42)';
      if(material === 'stone') dustColor = 'rgba(170, 182, 198, 0.4)';
      else if(material === 'sandstone') dustColor = 'rgba(217, 200, 136, 0.42)';
      const dust = {
        type: 'smoke',
        style: 'smoke',
        x: px + rand(-8, 8),
        y: py + rand(-8, 8),
        vx: rand(-60, 60),
        vy: rand(-120, -40),
        radius: rand(10, 18),
        color: dustColor,
        life: 0,
        maxLife: rand(520, 720),
        alpha: 1,
        driftAmplitude: rand(6, 14),
        driftFrequency: rand(1.6, 2.6)
      };
      if(typeof applyParticleDefinition === 'function') applyParticleDefinition(dust, 'smoke');
      world.particles.push(dust);
    }
  }
}

function breakDecorProp(world, prop){
  if(!prop || prop.broken) return;
  prop.broken = true;
  if(prop.type === 'fireflyJar' || prop.type === 'hangingFireflyJar'){
    if(typeof shatterFireflyJar === 'function') shatterFireflyJar(world, prop);
    return;
  }
  if(prop.type === 'chronoFlyJar'){
    if(typeof shatterChronoFlyJar === 'function') shatterChronoFlyJar(world, prop);
    return;
  }
  spawnCrateSplinters(world, prop);
}

function spawnCrateSplinters(world, prop){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const count = Math.max(10, Math.round(rand(12, 20)));
  const width = prop.width ?? 34;
  const height = prop.height ?? 28;
  const cx = prop.x ?? 0;
  const baseY = prop.baseY ?? prop.y ?? 0;
  const top = baseY - height;
  for(let i=0;i<count;i++){
    const px = cx + rand(-width*0.4, width*0.4);
    const py = top + rand(height*0.1, height*0.9);
    const splinter = {
      type: 'splinter',
      style: 'splinter',
      x: px,
      y: py,
      vx: rand(-220, 220),
      vy: rand(-520, -220),
      rotation: rand(0, TAU),
      spin: rand(-9, 9),
      width: rand(6, 14),
      height: rand(2.2, 4.2),
      life: 0,
      maxLife: rand(700, 1100),
      alpha: 1,
      resting: false,
      color: choice(['#9a6a3b','#b57b45','#c48a55'])
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(splinter, 'splinter');
    world.particles.push(splinter);
  }
  const maxParticles = 220;
  if(world.particles.length > maxParticles){
    world.particles.splice(0, world.particles.length - maxParticles);
  }
}

function triggerDeathEffect(stick){
  if(stick.deathEffect === 'explode' && stick.world){
    const center = stick.center();
    const radius = stick.deathRadius || 120;
    const dmg = stick.deathDamage || 28;
    triggerExplosion(stick.world, stick, center.x, center.y, radius, dmg);
    return;
  }
  if(stick.deathEffect === 'sandBurst' && stick.world){
    const center = stick.center();
    const defaultSpread = Math.max(30, (stick.blockWidth || 90) * 0.6);
    const count = Math.max(8, Math.round(stick.deathSandCount ?? 60));
    const spreadX = stick.deathSandSpreadX ?? defaultSpread;
    const spreadY = stick.deathSandSpreadY ?? (defaultSpread * 0.5);
    spawnSandBurst(stick.world, center.x, center.y, count, spreadX, spreadY);
  }
}

function computeDamage(attacker, target, base){
  const attackStat = Math.max(0, attacker?.attack ?? 0);
  const baseAmount = Math.max(0, base) * attackStat;
  const defenseStat = Math.max(0, target?.defense ?? 0);
  const mitigation = defenseStat > 0 ? Math.random() * defenseStat : 0;
  const total = baseAmount - mitigation;
  return Math.max(0, total);
}

function updateTimeBladeEchoes(world){
  if(!world) return;
  const list = Array.isArray(world.timeBladeEchoes) ? world.timeBladeEchoes : null;
  if(!list || !list.length) return;
  const now = nowMs();
  for(let i=list.length - 1; i>=0; i--){
    const entry = list[i];
    if(!entry){
      list.splice(i, 1);
      continue;
    }
    if(entry.triggerAt && now < entry.triggerAt) continue;
    list.splice(i, 1);
    const stick = entry.stick;
    if(!stick || stick.dead || stick.world !== world) continue;
    const config = entry.config || {};
    const weaponSnapshot = entry.weapon || {};
    const baseOptions = entry.options || {};
    const opts = { ...baseOptions };
    const element = config.echoElement || 'chronometric';
    const echoWeapon = { ...weaponSnapshot };
    if(echoWeapon.timeBlade) delete echoWeapon.timeBlade;
    if(!Number.isFinite(echoWeapon.range)) echoWeapon.range = opts.baseRange ?? weaponSnapshot.range ?? 42;
    if(!Number.isFinite(echoWeapon.dmg)) echoWeapon.dmg = opts.baseDamage ?? weaponSnapshot.dmg ?? 1;
    if(!Number.isFinite(echoWeapon.knock)) echoWeapon.knock = opts.baseKnock ?? weaponSnapshot.knock ?? 160;
    echoWeapon.element = element;
    const damageMultiplier = (opts.damageMultiplier ?? 1) * (config.echoDamageMultiplier ?? 1);
    const rangeMultiplier = (opts.rangeMultiplier ?? 1) * (config.echoRangeMultiplier ?? 1);
    const knockMultiplier = (opts.knockMultiplier ?? 1) * (config.echoKnockMultiplier ?? 1);
    opts.damageMultiplier = damageMultiplier;
    opts.rangeMultiplier = rangeMultiplier;
    opts.knockMultiplier = knockMultiplier;
    opts.elementOverride = element;
    attackMelee(stick, echoWeapon, world, opts);
  }
}

