// projectiles.js

function resolveStructureMaterial(wall){
  if(!wall || !wall.material) return 'dirt';
  return wall.material.toString().toLowerCase();
}

function inferStructureDamageKind(opts={}){
  if(opts.damageKind) return opts.damageKind;
  if(typeof isFireElement === 'function' && isFireElement(opts.element)) return 'fire';
  if(opts.explosive) return 'explosive';
  const projectile = opts.projectile;
  if(projectile){
    if(projectile.damageKind) return projectile.damageKind;
    if(typeof isFireElement === 'function' && isFireElement(projectile.element)) return 'fire';
    if(projectile.blastRadius || projectile.blastDamage || projectile.kind === 'bomb') return 'explosive';
  }
  return 'physical';
}

function structureAllowsDamageKind(wall, material, damageKind){
  if(wall?.unbreakable) return false;
  const required = wall?.requiredDamageKind;
  if(required){
    const list = Array.isArray(required) ? required : [required];
    return list.includes(damageKind);
  }
  if(material === 'steel') return false;
  if(material === 'wood') return damageKind === 'fire';
  if(material === 'stone' || material === 'sandstone') return damageKind === 'explosive';
  return true;
}

const BREAKABLE_MAX_CRACK_LEVEL = 5;

let sandstonePrisonIdCounter = 1;

function matchesRequiredDamageKind(wall, damageKind){
  if(!wall || !damageKind) return false;
  const required = wall.requiredDamageKind;
  if(!required) return false;
  const list = Array.isArray(required) ? required : [required];
  const normalized = damageKind.toString().toLowerCase();
  return list.some(entry=>entry && entry.toString().toLowerCase() === normalized);
}

function updateBreakableCrackProgress(wall, damageKind){
  if(!wall) return;
  if(matchesRequiredDamageKind(wall, damageKind)){
    const prevHits = Math.max(0, Number.isFinite(wall.crackHits) ? wall.crackHits : 0);
    const nextHits = Math.min(BREAKABLE_MAX_CRACK_LEVEL, prevHits + 1);
    wall.crackHits = nextHits;
    if(Number.isFinite(wall.maxHealth) && wall.maxHealth > 0){
      const remaining = Math.max(0, BREAKABLE_MAX_CRACK_LEVEL - nextHits);
      const forcedHealth = wall.maxHealth * (remaining / BREAKABLE_MAX_CRACK_LEVEL);
      if(!Number.isFinite(wall.health) || wall.health > forcedHealth) wall.health = forcedHealth;
    }
    const existingLevel = Number.isFinite(wall.crackLevel) ? wall.crackLevel : 0;
    wall.crackLevel = Math.max(existingLevel, nextHits);
    if(nextHits >= BREAKABLE_MAX_CRACK_LEVEL && !wall.unbreakable){
      wall.health = 0;
    }
  }
  if(Number.isFinite(wall.maxHealth) && wall.maxHealth > 0 && Number.isFinite(wall.health)){
    const ratio = 1 - clamp(wall.health / wall.maxHealth, 0, 1);
    const computed = clamp(Math.ceil(ratio * BREAKABLE_MAX_CRACK_LEVEL), 0, BREAKABLE_MAX_CRACK_LEVEL);
    const existingLevel = Number.isFinite(wall.crackLevel) ? wall.crackLevel : 0;
    wall.crackLevel = Math.max(existingLevel, computed);
  }else if(Number.isFinite(wall.crackHits) && !Number.isFinite(wall.crackLevel)){
    wall.crackLevel = clamp(Math.round(wall.crackHits), 0, BREAKABLE_MAX_CRACK_LEVEL);
  }else if(!Number.isFinite(wall.crackLevel)){
    wall.crackLevel = 0;
  }
}

function isHighGraphicsEnabled(world){
  const quality = world?.ui?.settings?.visual?.graphicsQuality;
  return quality !== 'low';
}

function shareLifeStealWithAllies(owner, totalHeal, world){
  if(!owner || !world) return;
  if(typeof owner.armorItem !== 'function') return;
  const armorItem = owner.armorItem();
  if(!armorItem || armorItem.type !== 'armor') return;
  const armorInfo = ARMOR_ITEMS?.[armorItem.id];
  if(!armorInfo) return;
  const percent = Number.isFinite(armorInfo.lifeStealSharePercent)
    ? clamp(armorInfo.lifeStealSharePercent, 0, 1)
    : 0;
  if(percent <= 0) return;
  const shareAmount = totalHeal * percent;
  if(!(shareAmount > 0)) return;
  const ownerCenter = typeof owner.center === 'function' ? owner.center() : null;
  if(!ownerCenter) return;
  const radius = Number.isFinite(armorInfo.lifeStealShareRadius)
    ? Math.max(0, armorInfo.lifeStealShareRadius)
    : 200;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const recipients = [];
  for(const stick of sticks){
    if(!stick || stick === owner || stick.dead) continue;
    if(stick.isEnemy !== owner.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    if(Math.hypot(center.x - ownerCenter.x, center.y - ownerCenter.y) <= radius){
      recipients.push(stick);
    }
  }
  if(!recipients.length) return;
  const healEach = shareAmount / recipients.length;
  if(!(healEach > 0)) return;
  for(const ally of recipients){
    if(typeof ally.heal === 'function') ally.heal(healEach);
    if(typeof spawnLifeStealNumber === 'function') spawnLifeStealNumber(world, ally, healEach);
  }
}

function applyDamageToBreakableStructure(world, wall, rawDamage, opts={}){
  if(!wall || wall.broken) return { applied: false, blocked: false, broken: false };
  const material = resolveStructureMaterial(wall);
  const damageKind = inferStructureDamageKind(opts);
  const allowed = structureAllowsDamageKind(wall, material, damageKind);
  if(!allowed){
    if(opts.applyBlockedShake !== false){
      const blockShake = material === 'steel' ? 0.22 : 0.18;
      wall.shake = Math.max(wall.shake ?? 0, blockShake);
      wall.crumbleTimer = Math.max(wall.crumbleTimer ?? 0, 0.18);
    }
    return { applied: false, blocked: true, broken: false, material, damageKind };
  }
  let damage = Math.max(0, Number(rawDamage) || 0);
  if(allowed){
    wall.lastDamageKind = damageKind;
  }
  if(material === 'wood' && damageKind === 'fire'){
    const scale = opts.fireDamageScale ?? 0.22;
    damage *= scale;
  }
  if((material === 'stone' || material === 'sandstone') && damageKind === 'explosive'){
    const scale = opts.explosiveDamageScale ?? 1;
    damage *= scale;
  }
  const applied = damage > 0 || (material === 'wood' && damageKind === 'fire');
  if(applied){
    const shake = (material === 'stone' || material === 'sandstone') ? 0.32 : material === 'wood' ? 0.28 : 0.35;
    wall.shake = Math.max(wall.shake ?? 0, shake);
    const crumble = (material === 'stone' || material === 'sandstone') ? 0.36 : 0.4;
    wall.crumbleTimer = Math.max(wall.crumbleTimer ?? 0, crumble);
  }
  if(damage > 0){
    wall.health = Math.max(0, (wall.health ?? 0) - damage);
  }
  if(allowed){
    updateBreakableCrackProgress(wall, damageKind);
  }
  let broken = false;
  if(!wall.unbreakable && typeof wall.health === 'number' && wall.health <= 0){
    breakBreakableStructure(world, wall);
    broken = true;
  }
  return { applied, blocked: false, broken, damage, material, damageKind };
}

function damageBreakablesInRadius(world, x, y, radius, damage, opts={}){
  if(!world || !Array.isArray(world.breakables) || radius <= 0) return false;
  let hit = false;
  const padding = Math.max(18, radius * 0.2);
  const walls = typeof queryBreakablesInRegion === 'function'
    ? queryBreakablesInRegion(world, x - radius - padding, y - radius - padding, x + radius + padding, y + radius + padding)
    : world.breakables;
  const damageKind = opts.damageKind || inferStructureDamageKind({ ...opts, explosive: opts.explosive });
  for(const wall of walls){
    if(!wall || wall.broken) continue;
    const cx = (wall.x ?? 0) + (wall.w ?? 0) * 0.5;
    const cy = (wall.y ?? 0) + (wall.h ?? 0) * 0.5;
    const extent = Math.hypot((wall.w ?? 0) * 0.5, (wall.h ?? 0) * 0.5);
    const dx = cx - x;
    const dy = cy - y;
    const dist = Math.hypot(dx, dy);
    if(dist > radius + extent) continue;
    const falloff = clamp(1 - dist / Math.max(1, radius + extent * 0.6), 0, 1);
    if(falloff <= 0) continue;
    const result = applyDamageToBreakableStructure(world, wall, (damage ?? 0) * falloff, { damageKind, element: opts.element, explosive: opts.explosive });
    if(result.applied || result.blocked) hit = true;
    if(typeof isFireElement === 'function' && isFireElement(opts.element) && typeof igniteFlammableStructure === 'function'){
      igniteFlammableStructure(world, wall, { intensity: Math.max(0.5, falloff) });
    }
  }
  return hit;
}

function expandProjectileCollisionRect(list, rect, type){
  if(!Array.isArray(list) || !rect) return;
  if(rect.blocksProjectiles === false) return;
  const padding = Number.isFinite(TERRAIN_TILE_PADDING) ? TERRAIN_TILE_PADDING : 0;
  const width = rect.w ?? rect.width ?? (rect.right !== undefined && rect.left !== undefined ? rect.right - rect.left : 0);
  const height = rect.h ?? rect.height ?? (rect.bottom !== undefined && rect.top !== undefined ? rect.bottom - rect.top : 0);
  if(!(width > 0 && height > 0)) return;
  const baseLeft = rect.x ?? rect.left ?? 0;
  const baseTop = rect.y ?? rect.top ?? 0;
  const left = baseLeft - padding;
  const right = left + width + padding * 2;
  const top = baseTop - padding;
  const bottom = top + height + padding * 2;
  list.push({ left, right, top, bottom, type, source: rect });
}

function gatherStaticProjectileCollisionRects(world){
  if(!world) return [];
  const rects = [];
  const tiles = typeof terrainTiles === 'function'
    ? terrainTiles(world)
    : (Array.isArray(world.terrain) ? world.terrain : []);
  for(const tile of tiles){
    expandProjectileCollisionRect(rects, tile, 'terrain');
  }
  const toggleSolids = typeof activeToggleBlockSolids === 'function'
    ? activeToggleBlockSolids(world)
    : [];
  if(Array.isArray(toggleSolids)){
    for(const solid of toggleSolids){
      expandProjectileCollisionRect(rects, solid, 'toggle');
    }
  }
  return rects;
}

function gatherBreakableCollisionRects(world, left, top, right, bottom){
  if(!world) return [];
  const queryLeft = Math.min(left, right);
  const queryRight = Math.max(left, right);
  const queryTop = Math.min(top, bottom);
  const queryBottom = Math.max(top, bottom);
  const walls = typeof queryBreakablesInRegion === 'function'
    ? queryBreakablesInRegion(world, queryLeft, queryTop, queryRight, queryBottom)
    : (Array.isArray(world.breakables) ? world.breakables : []);
  if(!Array.isArray(walls) || !walls.length) return [];
  const rects = [];
  for(const wall of walls){
    if(!wall || wall.broken) continue;
    expandProjectileCollisionRect(rects, wall, 'breakable');
  }
  return rects;
}

function distancePointToSegment(px, py, ax, ay, bx, by){
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if(abLenSq <= 1e-6) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / abLenSq, 0, 1);
  const sx = ax + abx * t;
  const sy = ay + aby * t;
  return Math.hypot(px - sx, py - sy);
}

function resolveRefractionBeamHits(world, projectile, opts={}){
  if(!world || !projectile || projectile.beamResolved) return;
  const startX = projectile.originX ?? projectile.x;
  const startY = projectile.originY ?? projectile.y;
  const length = projectile.length ?? 0;
  const angle = projectile.angle ?? 0;
  const endX = projectile.endX ?? (startX + Math.cos(angle) * length);
  const endY = projectile.endY ?? (startY + Math.sin(angle) * length);
  projectile.endX = endX;
  projectile.endY = endY;
  const width = Math.max(0, projectile.beamWidth ?? opts.beamWidth ?? 12);
  const halfWidth = width * 0.5;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const knockScale = projectile.knockback !== undefined ? projectile.knockback : 0.6;
  const horizontalKnock = dirX * knockScale;
  const verticalKnock = dirY * knockScale * 0.45;
  const owner = projectile.owner || null;
  const ratio = clamp(projectile.chargeRatio ?? 0, 0, 1);
  const xpPerHit = opts.xpPerHit ?? Math.round(8 + 10 * ratio);
  const stickMargin = opts.stickMargin ?? 14;
  for(const stick of world.sticks){
    if(!stick || stick.dead || stick === owner) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dist = typeof stick.distanceToSegment === 'function'
      ? stick.distanceToSegment(startX, startY, endX, endY)
      : distancePointToSegment(center.x, center.y, startX, startY, endX, endY);
    if(dist > halfWidth + stickMargin) continue;
    stick.takeDamage(projectile.dmg, horizontalKnock, verticalKnock, owner, {
      element: projectile.element || (owner && owner.element) || 'physical',
      projectile
    });
    if(owner && !owner.isEnemy && typeof owner.addXp === 'function'){
      owner.addXp(xpPerHit);
    }
  }
  if(projectile.dmg > 0){
    const steps = Math.max(2, Math.round((projectile.length ?? 0) / 60));
    const radius = Math.max(halfWidth, 18);
    for(let i=0;i<=steps;i++){
      const t = steps === 0 ? 0 : i / steps;
      const sampleX = startX + (endX - startX) * t;
      const sampleY = startY + (endY - startY) * t;
      damageBreakablesInRadius(world, sampleX, sampleY, radius, projectile.dmg, { projectile, damageKind: 'energy' });
    }
  }
  projectile.beamResolved = true;
}

function resolveMirageSlashHits(world, projectile){
  if(!world || !projectile) return;
  const startX = projectile.originX ?? projectile.x;
  const startY = projectile.originY ?? projectile.y;
  const angle = projectile.angle ?? 0;
  const length = Math.max(0, projectile.length ?? 0);
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;
  projectile.endX = endX;
  projectile.endY = endY;
  const width = Math.max(4, projectile.beamWidth ?? 24);
  const halfWidth = width * 0.5;
  const stickMargin = Number.isFinite(projectile.stickMargin) ? projectile.stickMargin : 14;
  if(!projectile.hitTargets) projectile.hitTargets = new Set();
  const owner = projectile.owner || null;
  const knockScale = projectile.knockback !== undefined ? projectile.knockback : 0.6;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  for(const stick of world.sticks){
    if(!stick || stick.dead || stick === owner) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    if(projectile.hitTargets.has(stick)) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dist = typeof stick.distanceToSegment === 'function'
      ? stick.distanceToSegment(startX, startY, endX, endY)
      : distancePointToSegment(center.x, center.y, startX, startY, endX, endY);
    if(dist > halfWidth + stickMargin) continue;
    stick.takeDamage(projectile.dmg, dirX * knockScale, dirY * knockScale * 0.4, owner, {
      element: projectile.element || (owner && owner.element) || 'physical',
      projectile
    });
    projectile.hitTargets.add(stick);
    if(owner && !owner.isEnemy && typeof owner.addXp === 'function'){
      owner.addXp(projectile.xpPerHit ?? 10);
    }
  }
  if(projectile.dmg > 0){
    const steps = Math.max(2, Math.round(length / 70));
    const radius = projectile.breakableRadius !== undefined
      ? Math.max(0, projectile.breakableRadius)
      : Math.max(halfWidth + Math.max(0, stickMargin) * 0.55, 18);
    for(let i=0;i<=steps;i++){
      const t = steps === 0 ? 0 : i / steps;
      const sampleX = startX + (endX - startX) * t;
      const sampleY = startY + (endY - startY) * t;
      damageBreakablesInRadius(world, sampleX, sampleY, radius, projectile.dmg, {
        projectile,
        damageKind: 'slash'
      });
    }
  }
}

function updateMirageSlashProjectile(projectile, world, dt, now){
  if(!projectile) return;
  projectile.vx = 0;
  projectile.vy = 0;
  if(projectile.fadeWithLife !== false){
    const ttl = Math.max(1, projectile.ttl ?? 220);
    const life = now - (projectile.born || 0);
    const ratio = clamp(life / ttl, 0, 1);
    projectile.alpha = clamp(1 - ratio, 0, 1);
    projectile.slashProgress = ratio;
  }else{
    const ttl = Math.max(1, projectile.ttl ?? 220);
    const life = now - (projectile.born || 0);
    projectile.slashProgress = clamp(life / ttl, 0, 1);
  }
  resolveMirageSlashHits(world, projectile);
}

function spawnSpiderCrawlerSummon(owner, weapon, world, origin, angle, opts={}){
  if(typeof spawnSummonerSpider !== 'function') return null;
  if(!owner || owner.dead || !world) return null;
  const marchDir = owner.dir >= 0 ? 1 : -1;
  const spawnOffset = Number.isFinite(opts.spawnOffset)
    ? opts.spawnOffset
    : Number.isFinite(weapon?.spiderSpawnOffset)
      ? weapon.spiderSpawnOffset
      : 22;
  const spawnX = Number.isFinite(opts.spawnX)
    ? opts.spawnX
    : origin.x + Math.cos(angle) * spawnOffset;
  const spawnY = Number.isFinite(opts.spawnY)
    ? opts.spawnY
    : origin.y + Math.sin(angle) * spawnOffset;
  const summonOpts = {
    spawnX,
    spawnY,
    disableInitialTarget: true,
    autoMarchDir: marchDir,
    forwardOnly: true,
    ignoreSummonerAim: true,
    marchForce: weapon?.spiderMarchForce,
    marchHopForce: weapon?.spiderMarchHopForce,
    marchLift: weapon?.spiderMarchLift
  };
  const spider = spawnSummonerSpider(owner, weapon, summonOpts);
  if(!spider) return null;
  const launchSpeed = Number.isFinite(opts.launchSpeed)
    ? opts.launchSpeed
    : Number.isFinite(weapon?.spiderLaunchSpeed)
      ? weapon.spiderLaunchSpeed
      : 0;
  const launchLift = Number.isFinite(opts.launchLift)
    ? opts.launchLift
    : Number.isFinite(weapon?.spiderLaunchLift)
      ? weapon.spiderLaunchLift
      : 0;
  if(launchSpeed || launchLift){
    const vx = Math.cos(angle) * launchSpeed;
    const vy = Math.sin(angle) * launchSpeed - launchLift;
    for(const point of spider.points || []){
      if(!point) continue;
      if(launchSpeed) point.vx += vx;
      if(launchLift) point.vy += vy;
    }
  }
  if(Number.isFinite(weapon?.spiderMarchForce) && spider.marchForce === undefined){
    spider.marchForce = weapon.spiderMarchForce;
  }
  if(Number.isFinite(weapon?.spiderMarchHopForce) && spider.marchHopForce === undefined){
    spider.marchHopForce = weapon.spiderMarchHopForce;
  }
  if(Number.isFinite(weapon?.spiderMarchLift) && spider.marchLift === undefined){
    spider.marchLift = weapon.spiderMarchLift;
  }
  if(spider.marchForce === undefined){
    spider.marchForce = spider.speed || 400;
  }
  if(spider.marchHopForce === undefined){
    spider.marchHopForce = spider.jumpStrength || 0;
  }
  if(spider.marchLift === undefined){
    spider.marchLift = spider.climbLift;
  }
  spider.autoMarchDir = marchDir;
  spider.forwardOnly = true;
  spider.ignoreSummonerAim = true;
  spider.lockedTarget = null;
  spider.target = null;
  return spider;
}

function shootProjectile(owner, w, kind, opts={}, world){
  const c = owner.center();
  const dir = owner.dir;
  let speed = opts.speed ?? w?.speed ?? 600;
  const grav = opts.gravity ?? false;
  const origin = opts.origin || { x: c.x, y: c.y - 6 };
  const target = opts.target ?? ((owner===world.selected && world.input.aim) ? world.input.aim : {x:origin.x + dir*200, y:origin.y});
  let ang = Math.atan2(target.y - origin.y, target.x - origin.x);
  if(typeof opts.angle === 'number') ang = opts.angle;
  if(typeof opts.angleOffset === 'number') ang += opts.angleOffset;
  const kindName = typeof kind === 'string' ? kind : '';
  const lowerKind = kindName.toLowerCase();
  const audio = window.audioSystem;
  if(lowerKind && lowerKind !== 'beedrone' && (lowerKind.includes('bullet') || lowerKind.includes('round'))){
    speed *= 2;
  }
  if(kind === 'spiderCrawler'){
    const spider = spawnSpiderCrawlerSummon(owner, w, world, origin, ang, opts);
    if(spider && owner && !owner.isEnemy && audio && typeof audio.playEffect === 'function'){
      audio.playEffect('projectileFire');
    }
    return spider;
  }
  const color = opts.color || w?.color;
  const damage = typeof opts.damage === 'number' ? opts.damage : (w?.dmg ?? 0);
  const projectile = {
    kind,
    x:origin.x,
    y:origin.y,
    vx:Math.cos(ang)*speed,
    vy:Math.sin(ang)*speed,
    gravity:!!grav,
    owner,
    dmg:damage,
    spin:!!opts.spin,
    ttl: opts.ttl ?? 2000,
    born:nowMs(),
    color,
    alpha: opts.alpha !== undefined ? opts.alpha : 1,
    element: opts.element || w?.element
  };
  if(opts.ignoreTerrainCollision) projectile.ignoreTerrainCollision = true;
  if(opts.ignoreStickCollision) projectile.ignoreStickCollision = true;
  if(opts.knock !== undefined){
    projectile.knockback = opts.knock / 160;
  }else if(w && w.knock !== undefined){
    projectile.knockback = w.knock / 160;
  }
  if(opts.verticalKnock !== undefined){
    projectile.verticalKnock = opts.verticalKnock;
  }
  if(opts.chargeRatio !== undefined) projectile.chargeRatio = opts.chargeRatio;
  if(opts.fullCharge !== undefined) projectile.fullCharge = !!opts.fullCharge;
  if(opts.blastRadius) projectile.blastRadius = opts.blastRadius;
  if(opts.blastDamage) projectile.blastDamage = opts.blastDamage;
  if(opts.pullRadius) projectile.pullRadius = opts.pullRadius;
  if(opts.pullStrength) projectile.pullStrength = opts.pullStrength;
  if(opts.slowMultiplier !== undefined) projectile.slowMultiplier = opts.slowMultiplier;
  if(opts.slowDuration !== undefined) projectile.slowDuration = opts.slowDuration;
  if(opts.driftAmplitude !== undefined) projectile.driftAmplitude = opts.driftAmplitude;
  if(opts.driftFrequency !== undefined) projectile.driftFrequency = opts.driftFrequency;
  if(opts.fadeRate !== undefined) projectile.fadeRate = opts.fadeRate;
  if(opts.trailColor) projectile.trailColor = opts.trailColor;
  if(opts.harmless) projectile.harmless = true;
  if(opts.sandPayload) projectile.sandPayload = opts.sandPayload;
  if(opts.igniteRadius !== undefined) projectile.igniteRadius = opts.igniteRadius;
  if(typeof opts.onExpire === 'function') projectile.onExpire = opts.onExpire;
  if(opts.pushRadius !== undefined) projectile.pushRadius = opts.pushRadius;
  if(opts.pushForce !== undefined) projectile.pushForce = opts.pushForce;
  if(opts.liftRadius !== undefined) projectile.liftRadius = opts.liftRadius;
  if(opts.liftForce !== undefined) projectile.liftForce = opts.liftForce;
  if(opts.returning !== undefined) projectile.returning = !!opts.returning;
  if(opts.returnSpeed !== undefined) projectile.returnSpeed = opts.returnSpeed;
  if(opts.effectColor) projectile.effectColor = opts.effectColor;
  if(opts.tipColor) projectile.tipColor = opts.tipColor;
  if(opts.accentColor) projectile.accentColor = opts.accentColor;
  if(opts.length !== undefined) projectile.length = opts.length;
  if(opts.radius !== undefined) projectile.radius = opts.radius;
  if(opts.hitRadius !== undefined) projectile.hitRadius = opts.hitRadius;
  if(opts.waveGrowth !== undefined) projectile.waveGrowth = opts.waveGrowth;
  if(opts.waveMaxRadius !== undefined) projectile.waveMaxRadius = opts.waveMaxRadius;
  if(opts.waveWidth !== undefined) projectile.waveWidth = opts.waveWidth;
  if(opts.waveWidthStart !== undefined) projectile.waveWidthStart = opts.waveWidthStart;
  if(opts.waveWidthGrowth !== undefined) projectile.waveWidthGrowth = opts.waveWidthGrowth;
  if(opts.waveLengthScale !== undefined) projectile.waveLengthScale = opts.waveLengthScale;
  if(opts.waveFadeRate !== undefined) projectile.waveFadeRate = opts.waveFadeRate;
  if(opts.edgeColor) projectile.edgeColor = opts.edgeColor;
  if(opts.waveWidthStart !== undefined) projectile.waveWidthCurrent = opts.waveWidthStart;
  if(opts.maxSpeed !== undefined) projectile.maxSpeed = opts.maxSpeed;
  if(opts.turnRate !== undefined) projectile.turnRate = opts.turnRate;
  if(opts.bounce !== undefined) projectile.bounce = opts.bounce;
  if(opts.maxBounces !== undefined) projectile.maxBounces = opts.maxBounces;
  if(opts.maxTerrainBounces !== undefined) projectile.maxTerrainBounces = opts.maxTerrainBounces;
  if(opts.homing !== undefined) projectile.homing = !!opts.homing;
  if(opts.seekForce !== undefined) projectile.seekForce = opts.seekForce;
  if(opts.drag !== undefined) projectile.drag = opts.drag;
  if(opts.lifeStealPercent !== undefined) projectile.lifeStealPercent = opts.lifeStealPercent;
  if(projectile.lifeStealPercent === undefined && w?.lifeStealPercent !== undefined){
    projectile.lifeStealPercent = w.lifeStealPercent;
  }
  if(opts.lockedTarget) projectile.lockedTarget = opts.lockedTarget;
  if(opts.beamWidth !== undefined) projectile.beamWidth = opts.beamWidth;
  if(opts.beamCoreColor) projectile.beamCoreColor = opts.beamCoreColor;
  if(opts.beamEdgeColor) projectile.beamEdgeColor = opts.beamEdgeColor;
  if(opts.beamGlowColor) projectile.beamGlowColor = opts.beamGlowColor;
  if(opts.targetRadius !== undefined) projectile.targetRadius = opts.targetRadius;
  if(opts.haloSpin !== undefined) projectile.haloSpin = opts.haloSpin;
  if(opts.haloRadius !== undefined) projectile.haloRadius = opts.haloRadius;
  if(opts.trailAlpha !== undefined) projectile.trailAlpha = opts.trailAlpha;
  if(opts.singularityConfig){
    projectile.singularityConfig = { ...opts.singularityConfig };
  }
  if(opts.singularityDamage !== undefined) projectile.singularityDamage = opts.singularityDamage;
  if(opts.singularityRadius !== undefined) projectile.singularityRadius = opts.singularityRadius;
  if(opts.singularityPullRadius !== undefined) projectile.singularityPullRadius = opts.singularityPullRadius;
  if(opts.singularityPullStrength !== undefined) projectile.singularityPullStrength = opts.singularityPullStrength;
  if(opts.singularityTickInterval !== undefined) projectile.singularityTickInterval = opts.singularityTickInterval;
  if(opts.singularityFadeDuration !== undefined) projectile.singularityFadeDuration = opts.singularityFadeDuration;
  if(opts.singularityColor) projectile.singularityColor = opts.singularityColor;
  projectile.angle = ang;
  projectile.target = target;
  projectile.trail = [];
  projectile.trailLife = opts.trailLife ?? 220;
  projectile.trailMax = opts.trailMax ?? 20;
  if(kind === 'mirageSlash'){
    projectile.vx = 0;
    projectile.vy = 0;
    projectile.gravity = false;
    projectile.ignoreTerrainCollision = true;
    projectile.ignoreStickCollision = true;
    projectile.originX = origin.x;
    projectile.originY = origin.y;
    projectile.length = Math.max(0, opts.length ?? w?.slashLength ?? w?.projectileLength ?? 360);
    projectile.beamWidth = Math.max(4, opts.beamWidth ?? w?.beamWidth ?? 24);
    projectile.angle = ang;
    if(opts.damage !== undefined) projectile.dmg = opts.damage;
    projectile.hitOnce = opts.hitOnce !== undefined ? !!opts.hitOnce : true;
    projectile.hitTargets = new Set();
    projectile.stickMargin = opts.stickMargin !== undefined ? opts.stickMargin : 14;
    if(opts.xpPerHit !== undefined) projectile.xpPerHit = opts.xpPerHit;
    projectile.beamCoreColor = opts.coreColor || w?.beamCoreColor || projectile.color;
    projectile.beamEdgeColor = opts.edgeColor || w?.beamEdgeColor || 'rgba(200, 180, 255, 0.45)';
    projectile.beamGlowColor = opts.glowColor || w?.beamGlowColor || 'rgba(32, 12, 54, 0.32)';
    projectile.fadeWithLife = opts.fadeWithLife !== undefined ? !!opts.fadeWithLife : true;
    projectile.trailLife = 0;
    projectile.trailMax = 0;
  }
  if(kind === 'refractionBeam'){
    projectile.vx = 0;
    projectile.vy = 0;
    projectile.gravity = false;
    projectile.originX = origin.x;
    projectile.originY = origin.y;
    projectile.trailLife = 0;
    projectile.trailMax = 0;
    projectile.endX = projectile.originX + Math.cos(projectile.angle) * (projectile.length ?? 0);
    projectile.endY = projectile.originY + Math.sin(projectile.angle) * (projectile.length ?? 0);
  }
  world.projectiles.push(projectile);
  if(kind === 'refractionBeam'){
    resolveRefractionBeamHits(world, projectile, opts);
  }
  if(owner && !owner.isEnemy && audio && typeof audio.playEffect === 'function'){
    audio.playEffect('projectileFire');
  }
  return projectile;
}

function spawnVoidSingularity(world, owner, x, y, opts={}){
  if(!world) return null;
  const now = nowMs();
  const radius = Math.max(24, opts.radius ?? 56);
  const projectile = {
    kind: 'voidSingularity',
    x,
    y,
    vx: 0,
    vy: 0,
    gravity: false,
    owner,
    dmg: opts.damage ?? 32,
    radius,
    pullRadius: opts.pullRadius ?? 260,
    pullStrength: opts.pullStrength ?? 2400,
    ttl: opts.duration ?? 3200,
    born: now,
    alpha: 1,
    color: opts.color || '#a48cff',
    ignoreTerrainCollision: true,
    ignoreStickCollision: true,
    tickInterval: Math.max(0.1, opts.tickInterval ?? 0.32),
    tickTimer: Math.max(0.1, opts.tickInterval ?? 0.32),
    fadeDuration: Math.max(1, opts.fadeDuration ?? 720),
    haloRotation: Math.random() * TAU,
    haloSpin: opts.haloSpin ?? 2.6,
    damageRadius: Math.max(12, opts.damageRadius ?? radius * 0.55)
  };
  world.projectiles.push(projectile);
  return projectile;
}

function spawnVoidSingularityFromOrb(world, projectile){
  if(!world || !projectile) return null;
  const config = projectile.singularityConfig ? { ...projectile.singularityConfig } : {};
  if(projectile.singularityDamage !== undefined) config.damage = projectile.singularityDamage;
  if(projectile.singularityRadius !== undefined) config.radius = projectile.singularityRadius;
  if(projectile.singularityPullRadius !== undefined) config.pullRadius = projectile.singularityPullRadius;
  if(projectile.singularityPullStrength !== undefined) config.pullStrength = projectile.singularityPullStrength;
  if(projectile.singularityTickInterval !== undefined) config.tickInterval = projectile.singularityTickInterval;
  if(projectile.singularityFadeDuration !== undefined) config.fadeDuration = projectile.singularityFadeDuration;
  if(projectile.singularityColor) config.color = projectile.singularityColor;
  if(projectile.singularityDuration !== undefined && config.duration === undefined) config.duration = projectile.singularityDuration;
  config.damageRadius = config.damageRadius ?? projectile.damageRadius;
  config.haloSpin = config.haloSpin ?? projectile.haloSpin;
  return spawnVoidSingularity(world, projectile.owner, projectile.x, projectile.y, config);
}

function spawnIceShardBurst(world, x, y, color, opts={}){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const count = Math.max(1, Math.round(opts.count ?? 9));
  const speed = opts.speed ?? 150;
  const spread = opts.spread ?? Math.PI * 0.4;
  const angleOffset = opts.upward ? -Math.PI * 0.5 : -Math.PI * 0.35;
  for(let i=0;i<count;i++){
    const ang = angleOffset + rand(-spread * 0.5, spread * 0.5);
    const magnitude = rand(speed * 0.6, speed * 1.1);
    const shard = {
      type: 'grain',
      style: 'grain',
      x: x + rand(-8, 8),
      y: y + rand(-6, 4),
      vx: Math.cos(ang) * magnitude,
      vy: Math.sin(ang) * magnitude - (opts.upward ? 40 : 20),
      rotation: rand(0, TAU),
      spin: rand(-3.2, 3.2),
      width: rand(4, 7),
      height: rand(10, 18),
      life: 0,
      maxLife: rand(360, 540),
      color: color || '#d9f3ff',
      alpha: 1
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'grain');
    world.particles.push(shard);
  }
  const cap = Math.max(120, opts.cap ?? 360);
  if(world.particles.length > cap){
    world.particles.splice(0, world.particles.length - cap);
  }
}

function spawnSandstonePrison(world, centerX, centerY, opts={}){
  if(!world) return [];
  if(!Number.isFinite(centerX) || !Number.isFinite(centerY)) return [];
  if(!Array.isArray(world.breakables)) world.breakables = [];
  const ring = Math.max(2, Math.round(opts.ring ?? 2));
  const blockSize = Math.max(20, opts.blockSize ?? 30);
  const health = Math.max(40, opts.health ?? 240);
  const requiredKinds = opts.requiredDamageKind
    ? (Array.isArray(opts.requiredDamageKind) ? opts.requiredDamageKind.slice() : [opts.requiredDamageKind])
    : ['physical', 'fire', 'ice', 'light', 'chronometric', 'war', 'void', 'necrotic', 'life', 'explosive'];
  const screenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  const radius = (ring + 0.5) * blockSize;
  if(opts.removeExisting !== false){
    for(const wall of world.breakables){
      if(!wall || !wall.phiPrison) continue;
      const wx = wall.x + (wall.w ?? 0) * 0.5;
      const wy = wall.y + (wall.h ?? 0) * 0.5;
      if(Math.abs(wx - centerX) <= radius && Math.abs(wy - centerY) <= radius){
        wall.remove = true;
      }
    }
    world.breakables = world.breakables.filter(entry=>entry && !entry.remove);
  }
  const additions = [];
  for(let gy=-ring; gy<=ring; gy++){
    for(let gx=-ring; gx<=ring; gx++){
      const onEdge = Math.abs(gx) === ring || Math.abs(gy) === ring;
      if(!onEdge) continue;
      const blockCenterX = centerX + gx * blockSize;
      const blockCenterY = centerY + gy * blockSize;
      const wall = {
        type: 'crumbleWall',
        id: `phiPrison_${sandstonePrisonIdCounter++}`,
        x: blockCenterX - blockSize * 0.5,
        y: blockCenterY - blockSize * 0.5,
        w: blockSize,
        h: blockSize,
        health,
        maxHealth: health,
        material: 'sandstone',
        shake: 0,
        crumbleTimer: 0,
        flammable: false,
        phiPrison: true,
        screenIndex
      };
      wall.requiredDamageKind = requiredKinds.slice();
      world.breakables.push(wall);
      additions.push(wall);
    }
  }
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  if(additions.length && typeof spawnSandPuffParticles === 'function'){
    spawnSandPuffParticles(world, centerX, centerY, '#d9c88c', '#b48a46');
  }
  return additions;
}

function spawnIcePillar(world, owner, x, opts={}){
  if(!world) return null;
  const referenceY = Number.isFinite(opts.referenceY) ? opts.referenceY : (owner && typeof owner.center === 'function' ? owner.center().y : (world.height ?? 0) - 40);
  const ground = typeof groundHeightAt === 'function' ? groundHeightAt(world, x, { referenceY, surface: 'top' }) : referenceY;
  const baseY = Number.isFinite(ground) ? ground : referenceY;
  const height = Math.max(60, opts.height ?? 150);
  const radius = Math.max(24, opts.radius ?? 56);
  const projectile = {
    kind: 'icePillar',
    x,
    y: baseY,
    vx: 0,
    vy: 0,
    gravity: false,
    owner: owner || null,
    dmg: opts.damage ?? 40,
    tickDamage: opts.damage ?? 40,
    radius,
    effectRadius: Math.max(24, opts.effectRadius ?? radius),
    pillarHeight: height,
    ttl: Math.max(600, opts.duration ?? 2100),
    born: nowMs(),
    alpha: 0,
    element: 'ice',
    ignoreTerrainCollision: true,
    ignoreStickCollision: true,
    chargeTime: Math.max(0, opts.chargeTime ?? 0.65),
    chargeRemaining: Math.max(0, opts.chargeTime ?? 0.65),
    tickInterval: Math.max(0.05, opts.tickInterval ?? 0.28),
    slowMultiplier: opts.slowMultiplier,
    slowDuration: opts.slowDuration,
    telegraphColor: opts.telegraphColor || '#9fdcff',
    pillarColor: opts.pillarColor || '#d9f3ff',
    shatterColor: opts.shatterColor || '#cdefff',
    effectCenterY: baseY - height * 0.5
  };
  world.projectiles.push(projectile);
  spawnIceShardBurst(world, projectile.x, projectile.y, projectile.telegraphColor, { upward: true, count: opts.telegraphCount ?? 10, speed: 180 });
  if(typeof spawnTemporalRipple === 'function'){
    spawnTemporalRipple(world, projectile.x, projectile.effectCenterY, projectile.telegraphColor);
  }
  return projectile;
}

function collapseIcePillar(world, projectile){
  if(!world || !projectile) return;
  const burstY = projectile.effectCenterY !== undefined ? projectile.effectCenterY : (projectile.y - (projectile.pillarHeight ?? 0) * 0.5);
  spawnIceShardBurst(world, projectile.x, burstY, projectile.shatterColor || projectile.pillarColor || '#d9f3ff', { upward: false, count: 14, speed: 200, cap: 420 });
}

function updateIcePillarProjectile(projectile, world, dt){
  if(!projectile) return;
  projectile.vx = 0;
  projectile.vy = 0;
  const chargeRemaining = projectile.chargeRemaining ?? 0;
  if(chargeRemaining > 0){
    projectile.chargeRemaining = Math.max(0, chargeRemaining - dt);
    const base = projectile.chargeTime ?? chargeRemaining;
    const ratio = base > 0 ? clamp(1 - projectile.chargeRemaining / base, 0, 1) : 1;
    projectile.alpha = clamp(ratio, 0.12, 1);
    projectile.telegraphTimer = (projectile.telegraphTimer || 0) + dt;
    if(projectile.telegraphTimer >= 0.18){
      projectile.telegraphTimer = 0;
      spawnIceShardBurst(world, projectile.x, projectile.y, projectile.telegraphColor, { upward: true, count: 4, speed: 140, cap: 340 });
    }
    return;
  }
  projectile.alpha = 1;
  projectile.telegraphTimer = 0;
  const interval = Math.max(0.05, projectile.tickInterval ?? 0.28);
  projectile.tickTimer = (projectile.tickTimer ?? interval) - dt;
  while(projectile.tickTimer <= 0){
    projectile.tickTimer += interval;
    const centerY = projectile.effectCenterY !== undefined ? projectile.effectCenterY : (projectile.y - (projectile.pillarHeight ?? 0) * 0.5);
    const radius = projectile.effectRadius ?? projectile.radius ?? 52;
    affectSticksInRadius(world, projectile.x, centerY, radius, projectile.owner, (stick)=>{
      if(!stick || typeof stick.takeDamage !== 'function') return;
      stick.takeDamage(projectile.tickDamage ?? projectile.dmg ?? 0, 0, 0.3, projectile.owner, {
        element: projectile.element || (projectile.owner && projectile.owner.element) || 'ice',
        projectile
      });
      if(projectile.slowMultiplier !== undefined && typeof stick.applySlow === 'function'){
        stick.applySlow(projectile.slowMultiplier, projectile.slowDuration ?? 1800);
      }
    });
    spawnIceShardBurst(world, projectile.x, centerY, projectile.pillarColor || '#d9f3ff', { upward: false, count: 6, speed: 160, cap: 420 });
  }
}

function finalizeProjectile(world, projectiles, index, reason, context){
  if(index < 0 || index >= projectiles.length) return;
  const projectile = projectiles[index];
  if(!projectile) return;
  if(projectile.sandPayload && typeof spawnSandBurst === 'function'){
    const payload = projectile.sandPayload;
    const count = Math.max(1, Math.round(payload.count ?? 8));
    const spreadX = payload.spreadX ?? 24;
    const spreadY = payload.spreadY ?? 18;
    spawnSandBurst(world, projectile.x, projectile.y, count, spreadX, spreadY);
  }
  if(projectile.kind === 'fireBullet'){
    spawnFireBulletImpact(world, projectile.x, projectile.y, projectile.color);
  }
  if(projectile.kind === 'beeDrone'){
    spawnBeeDisperse(world, projectile.x, projectile.y, projectile.color);
  }
  if(projectile.kind === 'droneSeekerMissile'){
    triggerHeatSeekerExplosion(world, projectile, context || {});
  }
  if(projectile.kind === 'sniperRound'){
    spawnSniperImpact(world, projectile.x, projectile.y, projectile.tipColor || projectile.color);
  }
  if(projectile.kind === 'sandClump'){
    spawnSandPuffParticles(world, projectile.x, projectile.y, projectile.color, projectile.trailColor);
  }
  if(typeof projectile.onExpire === 'function'){
    try {
      projectile.onExpire(world, projectile, reason, context);
    } catch(err){
      console.error('projectile expire handler error', err);
    }
  }
  projectiles.splice(index, 1);
}

function updateProjectiles(dt, world){
  const g = 1400;
  const now = nowMs();
  const bounds = typeof getActiveLevelBounds === 'function' ? getActiveLevelBounds(world) : null;
  const margin = 80;
  let leftLimit = -margin;
  let rightLimit = (world?.width ?? 0) + margin;
  if(bounds){
    if(Number.isFinite(bounds.left)) leftLimit = bounds.left - margin;
    if(Number.isFinite(bounds.right)) rightLimit = bounds.right + margin;
  }
  if(rightLimit < leftLimit){
    const mid = (leftLimit + rightLimit) * 0.5;
    leftLimit = mid;
    rightLimit = mid;
  }
  const staticCollisionRects = gatherStaticProjectileCollisionRects(world);
  for(let i=world.projectiles.length-1;i>=0;i--){
    const p = world.projectiles[i];
    const prevX = p.x;
    const prevY = p.y;
    if(p.kind === 'beeDrone'){
      updateBeeProjectileVelocity(p, world, dt);
    }
    if(p.kind === 'droneSeekerMissile'){
      updateHeatSeekerMissile(p, world, dt);
    }
    if(p.kind === 'icePillar'){
      updateIcePillarProjectile(p, world, dt);
    }else if(p.kind === 'mirageSlash'){
      updateMirageSlashProjectile(p, world, dt, now);
    }
    if(p.gravity) p.vy += g*dt;
    p.x += p.vx*dt; p.y += p.vy*dt;
    updateProjectileTrailState(p, world, now, prevX, prevY);
    if(p.kind === 'psiFloatArrow'){
      updatePsiFloatArrow(p, dt);
    }else if(p.kind === 'arrow'){
      p.angle = Math.atan2(p.vy, p.vx);
    }else if(p.kind === 'sniperRound'){
      p.angle = Math.atan2(p.vy, p.vx);
    }else if(p.kind === 'voidShrapnel'){
      p.angle = Math.atan2(p.vy, p.vx);
    }
    if(p.kind === 'beeDrone'){
      handleBeeProjectileBounce(p, world, staticCollisionRects, prevX, prevY);
    }
    if(p.driftAmplitude){
      const t = (now - p.born) / 1000;
      const freq = p.driftFrequency ?? 2.6;
      p.y += Math.sin(t * freq) * p.driftAmplitude * dt;
    }
    if(p.kind === 'pyreWave'){
      if(p.waveGrowth){
        const maxRadius = p.waveMaxRadius ?? 0;
        const current = Math.max(0, p.radius ?? 0);
        const growth = Math.max(0, p.waveGrowth) * dt;
        const next = maxRadius > 0 ? Math.min(maxRadius, current + growth) : current + growth;
        if(next > current) p.radius = next;
      }
      if(p.waveWidth !== undefined){
        if(p.waveWidthCurrent === undefined){
          const startWidth = p.waveWidthStart !== undefined ? p.waveWidthStart : p.waveWidth * 0.6;
          p.waveWidthCurrent = startWidth;
        }
        const limit = p.waveWidth;
        if(limit !== undefined){
          const growth = p.waveWidthGrowth !== undefined ? p.waveWidthGrowth : (p.waveGrowth || 0);
          if(growth){
            const nextWidth = Math.min(limit, p.waveWidthCurrent + Math.max(0, growth) * dt);
            p.waveWidthCurrent = nextWidth;
          }
        }
      }
      if(p.waveFadeRate !== undefined && p.fadeRate === undefined){
        p.alpha = (p.alpha ?? 1) - p.waveFadeRate * dt;
        if(p.alpha <= 0){
          world.projectiles.splice(i, 1);
          continue;
        }
      }
    }
    if(p.pushRadius && p.pushForce && typeof affectSticksInRadius === 'function'){
      const len = Math.hypot(p.vx, p.vy) || 1;
      const dirX = len ? (p.vx / len) : 0;
      const dirY = len ? (p.vy / len) : 0;
      affectSticksInRadius(world, p.x, p.y, p.pushRadius, p.owner, (stick, dist)=>{
        const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
        if(!pelvis) return;
        const falloff = clamp(1 - dist / p.pushRadius, 0, 1);
        const force = p.pushForce * falloff * dt;
        pelvis.addForce(dirX * force, dirY * force * 0.6);
      });
    }
    if(p.liftRadius && p.liftForce && typeof affectSticksInRadius === 'function'){
      affectSticksInRadius(world, p.x, p.y, p.liftRadius, p.owner, (stick, dist)=>{
        const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
        if(!pelvis) return;
        const falloff = clamp(1 - dist / p.liftRadius, 0, 1);
        const force = p.liftForce * falloff * dt;
        pelvis.addForce(0, -force);
      });
    }
    if(typeof p.fadeRate === 'number'){
      p.alpha = (p.alpha ?? 1) - p.fadeRate * dt;
      if(p.alpha <= 0){ world.projectiles.splice(i,1); continue; }
    }
    if(typeof isFireElement === 'function' && isFireElement(p.element) && typeof igniteFlammablesAt === 'function'){
      igniteFlammablesAt(world, p.x, p.y, p.igniteRadius ?? 24, { intensity: 1 });
    }
    if(p.pullRadius && p.pullStrength){
      for(const s of world.sticks){
        if(s.dead || s===p.owner) continue;
        if(p.owner && s.isEnemy === p.owner.isEnemy) continue;
        const pelvis = typeof s.pelvis === 'function' ? s.pelvis() : null;
        if(!pelvis) continue;
        const dx = pelvis.x - p.x;
        const dy = pelvis.y - p.y;
        const dist = Math.hypot(dx, dy);
        if(dist <= 0 || dist > p.pullRadius) continue;
        const strength = p.pullStrength * (1 - dist / p.pullRadius);
        const forceX = (dx / dist) * strength;
        const forceY = (dy / dist) * strength;
        pelvis.addForce(forceX, forceY);
      }
    }
    if(p.kind === 'voidGlyphOrb'){
      p.haloPhase = (p.haloPhase ?? 0) + (p.haloSpin ?? 4.2) * dt;
      let targetPoint = null;
      if(p.lockedTarget && !p.lockedTarget.dead){
        const center = typeof p.lockedTarget.center === 'function' ? p.lockedTarget.center() : null;
        if(center) targetPoint = center;
      }
      if(!targetPoint && p.target){
        targetPoint = p.target;
      }
      if(targetPoint){
        const threshold = Math.max(16, p.targetRadius ?? 32);
        if(distance(p.x, p.y, targetPoint.x, targetPoint.y) <= threshold){
          spawnVoidSingularityFromOrb(world, p);
          finalizeProjectile(world, world.projectiles, i, 'detonate', targetPoint);
          continue;
        }
      }
    }
    if(p.kind === 'voidSingularity'){
      p.vx = 0;
      p.vy = 0;
      p.haloRotation = (p.haloRotation ?? 0) + (p.haloSpin ?? 2.6) * dt;
      const interval = Math.max(0.1, p.tickInterval ?? 0.32);
      p.tickTimer = (p.tickTimer ?? interval) - dt;
      while(p.tickTimer <= 0){
        p.tickTimer += interval;
        const damageRadius = Math.max(12, p.damageRadius ?? (p.radius ?? 48) * 0.55);
        for(const s of world.sticks){
          if(!s || s.dead || s === p.owner) continue;
          if(p.owner && s.isEnemy === p.owner.isEnemy) continue;
          const center = typeof s.center === 'function' ? s.center() : null;
          if(!center) continue;
          if(distance(center.x, center.y, p.x, p.y) <= damageRadius){
            s.takeDamage(p.dmg, 0, 0, p.owner, {
              element: p.element || (p.owner && p.owner.element) || 'physical',
              projectile: p
            });
            if(p.owner && !p.owner.isEnemy) p.owner.addXp(10);
          }
        }
      }
      const fadeDuration = Math.max(1, p.fadeDuration ?? 720);
      if(Number.isFinite(p.ttl)){
        const timeAlive = now - p.born;
        const timeLeft = p.ttl - timeAlive;
        if(timeLeft <= fadeDuration){
          p.alpha = clamp(timeLeft / fadeDuration, 0, 1);
        }
      }
    }
    const radius = p.radius ?? 0;
    const sampleY = p.y + radius;
    const ground = groundHeightAt(world, p.x, { referenceY: sampleY, surface: 'top' });
    const belowGround = sampleY > ground;
    const outOfBounds = ((p.x < leftLimit) || (p.x > rightLimit)) || (!p.ignoreTerrainCollision && belowGround);
    const expired = (now - p.born > p.ttl);
    if(expired){
      if(p.kind === 'voidGlyphOrb'){
        spawnVoidSingularityFromOrb(world, p);
      }
      if(p.kind === 'icePillar'){
        collapseIcePillar(world, p);
      }
      finalizeProjectile(world, world.projectiles, i, 'terrain');
      continue;
    }
    if(p.kind === 'beeDrone'){
      if(outOfBounds){
        finalizeProjectile(world, world.projectiles, i, 'terrain');
        continue;
      }
      }else if(p.kind === 'chakram'){
        const bounceOutcome = handleChakramWorldBounce(p, world, ground, prevX, prevY);
        if(bounceOutcome && bounceOutcome.finalize){
          finalizeProjectile(world, world.projectiles, i, 'terrain', bounceOutcome);
          continue;
        }
      }else if(p.kind === 'psiFloatArrow'){
        const bounceOutcome = handleChakramWorldBounce(p, world, ground, prevX, prevY);
        if(bounceOutcome && bounceOutcome.finalize){
          finalizeProjectile(world, world.projectiles, i, 'terrain', bounceOutcome);
          continue;
        }
      }else if(outOfBounds){
        if(p.kind === 'voidGlyphOrb'){
          spawnVoidSingularityFromOrb(world, p);
        }
        finalizeProjectile(world, world.projectiles, i, 'terrain');
      continue;
    }
    for(const s of world.sticks){
      if(s.dead || s===p.owner) continue;
      if(p.owner && s.isEnemy === p.owner.isEnemy) continue;
      if(p.ignoreStickCollision) continue;
      const c = typeof s.center === 'function' ? s.center() : null;
      if(!c) continue;
      const distToStick = typeof s.distanceToPoint === 'function'
        ? s.distanceToPoint(p.x, p.y)
        : distance(p.x, p.y, c.x, c.y);
      const baseHitRadius = Number.isFinite(p.hitRadius) ? Math.max(0, p.hitRadius) : 22;
      const projectileRadius = Number.isFinite(p.radius)
        ? Math.max(baseHitRadius, Math.max(0, p.radius))
        : baseHitRadius;
      if(distToStick <= projectileRadius){
        if(!p.harmless){
          let knockScale = p.knockback !== undefined ? p.knockback : 0.6;
          let damage = p.dmg;
          if(p.kind === 'sniperRound'){
            const impact = resolveSniperHit(world, p, s);
            damage = impact.damage;
            knockScale *= impact.knockMultiplier;
          }
          const verticalKnock = p.verticalKnock !== undefined ? p.verticalKnock : (p.kind === 'arrow' ? 0 : 0.2);
          s.takeDamage(damage, Math.sign(p.vx) * knockScale, verticalKnock, p.owner, {
            element: p.element || (p.owner && p.owner.element) || 'physical',
            projectile: p
          });
          if(p.slowMultiplier !== undefined && typeof s.applySlow === 'function'){
            s.applySlow(p.slowMultiplier, p.slowDuration ?? 1200);
            const hitCenter = c;
            spawnTemporalRipple(world, hitCenter.x, hitCenter.y, p.trailColor || p.color);
          }
          if(p.owner && !p.owner.isEnemy) p.owner.addXp(8);
          if(p.lifeStealPercent && p.owner && typeof p.owner.heal === 'function' && !p.owner.dead){
            const maxHp = p.owner.maxHp ?? 0;
            if(maxHp > 0){
              const healAmount = maxHp * p.lifeStealPercent;
              if(healAmount > 0){
                const prevHp = Number.isFinite(p.owner.hp) ? p.owner.hp : null;
                p.owner.heal(healAmount);
                let actualHeal = healAmount;
                if(prevHp !== null && Number.isFinite(p.owner.hp)){
                  actualHeal = Math.max(0, p.owner.hp - prevHp);
                }
                const displayHeal = actualHeal > 0 ? actualHeal : healAmount;
                if(!p.owner.isEnemy){
                  spawnLifeStealNumber(world, p.owner, displayHeal);
                }
                shareLifeStealWithAllies(p.owner, displayHeal, world);
              }
            }
          }
        }
        finalizeProjectile(world, world.projectiles, i, 'hitStick', s);
        break;
      }
    }
    if(!world.projectiles[i]) continue;
    let consumed = false;
    if(world.projectiles[i] && !p.ignoreStickCollision){
      const bag = projectileHitsPunchingBag(world, p);
      if(bag){
        const direction = Math.sign(p.vx) || (p.owner?.dir ?? 1);
        if(typeof registerPunchingBagHit === 'function'){
          registerPunchingBagHit(world, bag, p.owner, p.dmg, {
            direction,
            source: 'projectile',
            element: p.element,
            chargeRatio: p.chargeRatio
          });
        }
        finalizeProjectile(world, world.projectiles, i, 'bag', bag);
        consumed = true;
      }
      if(!consumed && !p.ignoreStickCollision){
        const body = projectileHitsSoftBody(world, p);
        if(body){
          if(typeof applySoftBodyImpulse === 'function'){
            const speed = Math.hypot(p.vx || 0, p.vy || 0);
            const attackDir = speed > 0 ? { x: (p.vx || 0) / speed, y: (p.vy || 0) / speed } : null;
            applySoftBodyImpulse(world, body, {
              origin: { x: p.x, y: p.y },
              direction: Math.sign(p.vx) || (p.owner?.dir ?? 1),
              attackDir,
              damage: p.dmg,
              source: 'projectile',
              element: p.element
            });
          }
          finalizeProjectile(world, world.projectiles, i, 'softBody', body);
          consumed = true;
        }
      }
    }
    if(consumed || !world.projectiles[i]) continue;
    if(p.kind !== 'beeDrone' && !p.ignoreTerrainCollision){
      const radius = Math.max(0, Number.isFinite(p.radius) ? p.radius : 0);
      let handledCollision = false;
      const horizontalPad = Number.isFinite(BREAKABLE_QUERY_HORIZONTAL_PADDING)
        ? BREAKABLE_QUERY_HORIZONTAL_PADDING
        : 160;
      const verticalPad = Number.isFinite(BREAKABLE_QUERY_VERTICAL_PADDING)
        ? BREAKABLE_QUERY_VERTICAL_PADDING
        : 960;
      const minX = Math.min(prevX, p.x) - radius - horizontalPad;
      const maxX = Math.max(prevX, p.x) + radius + horizontalPad;
      const minY = Math.min(prevY, p.y) - radius - verticalPad;
      const maxY = Math.max(prevY, p.y) + radius + verticalPad;
      const breakableRects = gatherBreakableCollisionRects(world, minX, minY, maxX, maxY);
      const rectLists = breakableRects.length ? [staticCollisionRects, breakableRects] : [staticCollisionRects];
      outer: for(const list of rectLists){
        if(!Array.isArray(list) || !list.length) continue;
        for(const rect of list){
          if(!rect) continue;
          if(rect.type === 'breakable'){
            const wallRect = rect.source;
            if(!wallRect || wallRect.broken) continue;
          }
          const left = rect.left ?? 0;
          const right = rect.right ?? left;
          const top = rect.top ?? 0;
          const bottom = rect.bottom ?? top;
          if(p.x + radius < left || p.x - radius > right || p.y + radius < top || p.y - radius > bottom){
            continue;
          }
          if(rect.type === 'breakable'){
            const wall = rect.source;
            if(p.kind === 'chakram' || p.kind === 'psiFloatArrow'){
              const bounceOutcome = handleChakramBreakableBounce(p, world, wall, prevX, prevY);
              if(bounceOutcome){
                handledCollision = true;
                if(bounceOutcome.finalize){
                  finalizeProjectile(world, world.projectiles, i, 'hitWall', wall);
                  consumed = true;
                }
                break outer;
              }
              continue;
            }
            const result = applyDamageToBreakableStructure(world, wall, p.dmg ?? 0, { projectile: p, element: p.element });
            if(typeof isFireElement === 'function' && isFireElement(p.element) && typeof igniteFlammableStructure === 'function'){
              igniteFlammableStructure(world, wall, { intensity: 1 });
            }
            if(result.applied || result.blocked){
              finalizeProjectile(world, world.projectiles, i, 'hitWall', wall);
              consumed = true;
              handledCollision = true;
              break outer;
            }
            continue;
          }
          if(p.kind === 'chakram' || p.kind === 'psiFloatArrow'){
            continue;
          }
          finalizeProjectile(world, world.projectiles, i, 'terrain', rect.source || null);
          consumed = true;
          handledCollision = true;
          break outer;
        }
      }
      if(consumed) continue;
      if(handledCollision) continue;
    }
  }
}

function projectileHitsPunchingBag(world, projectile){
  if(!world || !Array.isArray(world.decor)) return null;
  for(const prop of world.decor){
    if(!prop || prop.type !== 'punchingBag') continue;
    const width = prop.width ?? 48;
    const height = prop.height ?? 120;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    const cx = prop.x ?? 0;
    const baseY = prop.baseY ?? prop.y ?? 0;
    const cy = baseY - halfH;
    if(projectile.x >= cx - halfW && projectile.x <= cx + halfW && projectile.y >= cy - halfH && projectile.y <= cy + halfH){
      return prop;
    }
  }
  return null;
}

function projectileHitsSoftBody(world, projectile){
  if(!world || !Array.isArray(world.softBodies)) return null;
  const projectileRadius = Math.max(0, projectile.radius || 3);
  for(const body of world.softBodies){
    if(!body) continue;
    const center = typeof softBodyCenter === 'function'
      ? softBodyCenter(body)
      : (body.centerPoint ? { x: body.centerPoint.x, y: body.centerPoint.y } : null);
    if(!center) continue;
    const bodyRadius = Math.max(18, body.radius || 0);
    const total = bodyRadius + projectileRadius;
    const dx = projectile.x - center.x;
    const dy = projectile.y - center.y;
    if(dx * dx + dy * dy <= total * total){
      return body;
    }
  }
  return null;
}

function updateProjectileTrailState(projectile, world, now, prevX, prevY){
  if(!projectile) return;
  const showTrails = isHighGraphicsEnabled(world);
  if(!showTrails){
    if(Array.isArray(projectile.trail)) projectile.trail.length = 0;
    return;
  }
  if(!Array.isArray(projectile.trail)) projectile.trail = [];
  const last = projectile.trail[projectile.trail.length - 1];
  const dx = projectile.x - prevX;
  const dy = projectile.y - prevY;
  const dist = Math.hypot(dx, dy);
  if(!last || dist > 0.5 || now - last.time > 20){
    projectile.trail.push({ x: projectile.x, y: projectile.y, time: now });
  }
  const life = projectile.trailLife ?? 220;
  while(projectile.trail.length && now - projectile.trail[0].time > life){
    projectile.trail.shift();
  }
  const max = projectile.trailMax ?? 20;
  if(projectile.trail.length > max){
    projectile.trail.splice(0, projectile.trail.length - max);
  }
}

function drawProjectileTrail(ctx, projectile, now, showTrails){
  if(!showTrails) return;
  const trail = projectile?.trail;
  if(!Array.isArray(trail) || trail.length < 2) return;
  const life = projectile.trailLife ?? 220;
  const baseAlpha = clamp(projectile.trailAlpha ?? 0.75, 0, 1);
  const color = projectile.trailColor || projectile.color || '#ffffff';
  const width = Math.max(1.2, (projectile.radius ?? 3) * 0.6);
  const preserveColor = typeof shouldPreserveElementColor === 'function'
    && shouldPreserveElementColor(projectile?.element);
  const restoreStage = (preserveColor && typeof stripCanvasFilters === 'function')
    ? stripCanvasFilters(ctx, token=>typeof token === 'string' && token.toLowerCase().startsWith('grayscale'))
    : null;
  ctx.save();
  let restoreFilter = null;
  if(projectile?.element === 'chronometric'){
    restoreFilter = typeof pushCanvasFilter === 'function'
      ? pushCanvasFilter(ctx, 'invert(1)')
      : null;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  for(let i=1;i<trail.length;i++){
    const prev = trail[i - 1];
    const curr = trail[i];
    const age = now - curr.time;
    const prevAge = now - prev.time;
    const alpha = Math.max(0, 1 - age / life);
    const prevAlpha = Math.max(0, 1 - prevAge / life);
    const segmentAlpha = Math.max(alpha, prevAlpha) * baseAlpha;
    if(segmentAlpha <= 0) continue;
    ctx.globalAlpha = segmentAlpha * 0.6;
    ctx.lineWidth = width * 1.8;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    ctx.globalAlpha = segmentAlpha;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }
  if(restoreFilter) restoreFilter();
  ctx.restore();
  if(typeof restoreStage === 'function') restoreStage();
}

function drawProjectileHitbox(ctx, projectile){
  if(!ctx || !projectile) return;
  const owner = projectile.owner || null;
  const friendly = owner ? !owner.isEnemy : false;
  const baseColor = friendly ? 'rgba(44, 207, 255, 0.85)' : 'rgba(255, 112, 170, 0.85)';
  if(projectile.kind === 'mirageSlash'){
    const startX = Number.isFinite(projectile.originX) ? projectile.originX : projectile.x;
    const startY = Number.isFinite(projectile.originY) ? projectile.originY : projectile.y;
    const angle = Number.isFinite(projectile.angle) ? projectile.angle : 0;
    const length = Number.isFinite(projectile.length) ? projectile.length : 0;
    const endX = Number.isFinite(projectile.endX) ? projectile.endX : (startX + Math.cos(angle) * length);
    const endY = Number.isFinite(projectile.endY) ? projectile.endY : (startY + Math.sin(angle) * length);
    const width = Math.max(1.5, projectile.beamWidth ?? 18);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if(projectile.kind === 'refractionBeam'){
    const startX = Number.isFinite(projectile.originX) ? projectile.originX : projectile.x;
    const startY = Number.isFinite(projectile.originY) ? projectile.originY : projectile.y;
    const angle = Number.isFinite(projectile.angle) ? projectile.angle : 0;
    const length = Number.isFinite(projectile.length) ? projectile.length : 0;
    const endX = Number.isFinite(projectile.endX) ? projectile.endX : (startX + Math.cos(angle) * length);
    const endY = Number.isFinite(projectile.endY) ? projectile.endY : (startY + Math.sin(angle) * length);
    const width = Math.max(1.5, projectile.beamWidth ?? 12);
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const cx = Number.isFinite(projectile.x) ? projectile.x : 0;
  const cy = Number.isFinite(projectile.y) ? projectile.y : 0;
  const baseHitRadius = Number.isFinite(projectile.hitRadius) ? Math.max(0, projectile.hitRadius) : 22;
  let radius = Number.isFinite(projectile.radius) ? Math.max(baseHitRadius, Math.max(0, projectile.radius)) : baseHitRadius;
  if(Number.isFinite(projectile.damageRadius)){
    radius = Math.max(radius, Math.max(0, projectile.damageRadius));
  }
  const rings = [];
  if(Number.isFinite(projectile.blastRadius) && projectile.blastRadius > radius){
    rings.push({ radius: projectile.blastRadius, alpha: 0.35, dash: [7, 6] });
  }
  if(Number.isFinite(projectile.pullRadius) && projectile.pullRadius > radius){
    rings.push({ radius: projectile.pullRadius, alpha: 0.28, dash: [4, 6] });
  }
  if(Number.isFinite(projectile.igniteRadius) && projectile.igniteRadius > radius){
    rings.push({ radius: projectile.igniteRadius, alpha: 0.24, dash: [3, 6] });
  }
  if(radius > 0){
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = Math.max(1.6, Math.min(6, radius * 0.08));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if(rings.length){
    ctx.save();
    ctx.strokeStyle = baseColor;
    for(const ring of rings){
      if(!ring || !(ring.radius > 0)) continue;
      ctx.globalAlpha = ring.alpha ?? 0.28;
      ctx.lineWidth = Math.max(1.2, Math.min(4, ring.radius * 0.05));
      if(Array.isArray(ring.dash)) ctx.setLineDash(ring.dash);
      ctx.beginPath();
      ctx.arc(cx, cy, ring.radius, 0, TAU);
      ctx.stroke();
      if(Array.isArray(ring.dash)) ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

function drawProjectiles(ctx, world){
  const showTrails = isHighGraphicsEnabled(world);
  const showHitboxes = !!(world?.gameplayFlags?.showHitboxes);
  const now = nowMs();
  for(const p of world.projectiles){
    drawProjectileTrail(ctx, p, now, showTrails);
    const preserveColor = typeof shouldPreserveElementColor === 'function'
      && shouldPreserveElementColor(p?.element);
    const restoreStage = (preserveColor && typeof stripCanvasFilters === 'function')
      ? stripCanvasFilters(ctx, token=>typeof token === 'string' && token.toLowerCase().startsWith('grayscale'))
      : null;
    ctx.save();
    let restoreFilter = null;
    if(p?.element === 'chronometric'){
      restoreFilter = typeof pushCanvasFilter === 'function'
        ? pushCanvasFilter(ctx, 'invert(1)')
        : null;
    }
    ctx.lineCap='round';
    const alpha = clamp(p.alpha ?? 1, 0, 1);
    ctx.globalAlpha = alpha;
    if(p.kind==='arrow'){
      const angle = p.angle ?? Math.atan2(p.vy, p.vx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const shaft = 10;
      const head = 6;
      const tail = 4;
      ctx.lineWidth = Math.max(1.6, 2.2);
      ctx.strokeStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.moveTo(p.x - cos * shaft, p.y - sin * shaft);
      ctx.lineTo(p.x + cos * (shaft + head), p.y + sin * (shaft + head));
      ctx.stroke();
      ctx.fillStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.moveTo(p.x + cos * (shaft + head), p.y + sin * (shaft + head));
      ctx.lineTo(p.x + cos * (shaft + head) - sin * 4, p.y + sin * (shaft + head) + cos * 4);
      ctx.lineTo(p.x + cos * (shaft + head) + sin * 4, p.y + sin * (shaft + head) - cos * 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.trailColor || 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.moveTo(p.x - cos * shaft, p.y - sin * shaft);
      ctx.lineTo(p.x - cos * shaft + sin * tail, p.y - sin * shaft - cos * tail);
      ctx.moveTo(p.x - cos * shaft, p.y - sin * shaft);
      ctx.lineTo(p.x - cos * shaft - sin * tail, p.y - sin * shaft + cos * tail);
      ctx.stroke();
    }else if(p.kind==='mirageSlash'){
      const startX = p.originX ?? p.x;
      const startY = p.originY ?? p.y;
      const angle = p.angle ?? 0;
      const length = Math.max(0, p.length ?? 0);
      const endX = p.endX ?? (startX + Math.cos(angle) * length);
      const endY = p.endY ?? (startY + Math.sin(angle) * length);
      const width = Math.max(3, p.beamWidth ?? 24);
      const coreColor = p.beamCoreColor || p.color || '#fef7ff';
      const edgeColor = p.beamEdgeColor || 'rgba(196, 180, 255, 0.45)';
      const glowColor = p.beamGlowColor || 'rgba(32, 12, 54, 0.32)';
      const progress = clamp(p.slashProgress ?? 0, 0, 1);
      const fadeAlpha = 0.6 + (1 - progress) * 0.4;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * fadeAlpha;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = width * 1.45;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, edgeColor);
      gradient.addColorStop(Math.min(0.75, 0.35 + progress * 0.25), coreColor);
      gradient.addColorStop(1, edgeColor);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = coreColor;
      ctx.globalAlpha = Math.min(1, alpha * 0.85);
      ctx.lineWidth = Math.max(2, width * 0.38);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, alpha * 0.9);
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(startX, startY, Math.max(2.2, width * 0.28), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, alpha * 0.8);
      ctx.beginPath();
      ctx.arc(endX, endY, Math.max(2.8, width * 0.34), 0, TAU);
      ctx.fill();
      ctx.restore();
    }else if(p.kind==='refractionBeam'){
      const startX = p.originX ?? p.x;
      const startY = p.originY ?? p.y;
      const angle = p.angle ?? 0;
      const length = p.length ?? 0;
      const endX = p.endX ?? (startX + Math.cos(angle) * length);
      const endY = p.endY ?? (startY + Math.sin(angle) * length);
      const width = Math.max(2, p.beamWidth ?? 12);
      const coreColor = p.beamCoreColor || p.color || '#fffbea';
      const edgeColor = p.beamEdgeColor || 'rgba(255, 236, 180, 0.55)';
      const glowColor = p.beamGlowColor || 'rgba(255, 255, 210, 0.28)';
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = width * 1.6;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, edgeColor);
      gradient.addColorStop(0.55, coreColor);
      gradient.addColorStop(1, edgeColor);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = width * 0.45;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.fillStyle = coreColor;
      ctx.globalAlpha = Math.min(1, alpha * 0.95);
      ctx.beginPath();
      ctx.arc(startX, startY, Math.max(1.8, width * 0.32), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, alpha * 0.7);
      ctx.beginPath();
      ctx.arc(endX, endY, Math.max(2.4, width * 0.42), 0, TAU);
      ctx.fill();
      ctx.restore();
    }else if(p.kind==='sniperRound'){
      const angle = p.angle ?? Math.atan2(p.vy, p.vx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const length = Math.max(20, p.length ?? 28);
      const half = length * 0.5;
      const bodyWidth = Math.max(1.6, (p.radius ?? 3.2) * 0.8);
      const tipLength = Math.max(5, length * 0.26);
      const tail = Math.max(4, length * 0.22);
      const startX = p.x - cos * half;
      const startY = p.y - sin * half;
      const endX = p.x + cos * half;
      const endY = p.y + sin * half;
      ctx.strokeStyle = p.trailColor || 'rgba(255,255,255,0.35)';
      ctx.lineWidth = bodyWidth * 0.5;
      ctx.beginPath();
      ctx.moveTo(startX - cos * tail, startY - sin * tail);
      ctx.lineTo(startX, startY);
      ctx.stroke();
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, p.trailColor || 'rgba(255,255,255,0.28)');
      gradient.addColorStop(0.55, p.color || '#f7fbff');
      gradient.addColorStop(1, p.tipColor || '#ff5c5c');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = bodyWidth;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.fillStyle = p.tipColor || '#ff5c5c';
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - cos * tipLength + sin * bodyWidth * 0.6, endY - sin * tipLength - cos * bodyWidth * 0.6);
      ctx.lineTo(endX - cos * tipLength - sin * bodyWidth * 0.6, endY - sin * tipLength + cos * bodyWidth * 0.6);
      ctx.closePath();
      ctx.fill();
    }else if(p.kind==='fireBullet'){
      const radius = Math.max(3.5, p.radius ?? 5);
      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
      gradient.addColorStop(0, p.color || '#ffd8a4');
      gradient.addColorStop(1, 'rgba(255, 120, 60, 0.4)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fill();
      const angle = Math.atan2(p.vy, p.vx);
      ctx.strokeStyle = p.color || '#ffb067';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.65, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.trailColor || 'rgba(255, 200, 140, 0.65)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(angle) * radius * 1.4, p.y - Math.sin(angle) * radius * 1.4);
      ctx.lineTo(p.x - Math.cos(angle) * radius * 2.4, p.y - Math.sin(angle) * radius * 2.4);
      ctx.stroke();
    }else if(p.kind==='siphonBullet'){
      const radius = Math.max(3.5, p.radius ?? 5);
      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, radius);
      gradient.addColorStop(0, p.color || '#f1ccff');
      gradient.addColorStop(1, 'rgba(200, 100, 255, 0.35)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fill();
      const angle = Math.atan2(p.vy, p.vx);
      ctx.strokeStyle = p.color || '#dba3ff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.58, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.trailColor || 'rgba(214, 120, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(angle) * radius * 1.2, p.y - Math.sin(angle) * radius * 1.2);
      ctx.lineTo(p.x - Math.cos(angle) * radius * 2.1, p.y - Math.sin(angle) * radius * 2.1);
      ctx.stroke();
    }else if(p.kind==='bolt'){
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.moveTo(p.x-4, p.y-4);
      ctx.lineTo(p.x+4,p.y+4);
      ctx.moveTo(p.x-4,p.y+4);
      ctx.lineTo(p.x+4,p.y-4);
      ctx.stroke();
    }else if(p.kind==='voidShrapnel'){
      const angle = p.angle ?? Math.atan2(p.vy, p.vx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const radius = Math.max(3, p.radius ?? 4);
      const tail = radius * 2.2;
      const head = radius * 0.8;
      const perpX = -sin;
      const perpY = cos;
      ctx.fillStyle = p.color || '#c6b3ff';
      ctx.beginPath();
      ctx.moveTo(p.x + cos * head, p.y + sin * head);
      ctx.lineTo(p.x - cos * tail + perpX * radius * 0.6, p.y - sin * tail + perpY * radius * 0.6);
      ctx.lineTo(p.x - cos * tail - perpX * radius * 0.6, p.y - sin * tail - perpY * radius * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.trailColor || 'rgba(150, 120, 220, 0.75)';
      ctx.lineWidth = Math.max(1.2, radius * 0.45);
      ctx.beginPath();
      ctx.moveTo(p.x - cos * tail * 0.4 + perpX * radius * 0.25, p.y - sin * tail * 0.4 + perpY * radius * 0.25);
      ctx.lineTo(p.x - cos * tail * 0.9 - perpX * radius * 0.25, p.y - sin * tail * 0.9 - perpY * radius * 0.25);
      ctx.stroke();
    }else if(p.kind==='chakram'){
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.moveTo(p.x + 7, p.y);
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.moveTo(p.x + 4, p.y);
      ctx.arc(p.x,p.y, 4, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='beeDrone'){
      const angle = Math.atan2(p.vy, p.vx);
      const scale = Math.max(0.5, (p.radius ?? 3) / 3);
      const bodySize = 3 * scale;
      const half = bodySize * 0.5;
      const flap = Math.sin((now - (p.born || 0)) / 80);
      const wingLength = bodySize * (0.9 + Math.abs(flap) * 0.45);
      const wingHeight = bodySize * (0.6 + Math.abs(flap) * 0.25);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = p.color || '#ffd866';
      ctx.fillRect(-half, -half, bodySize, bodySize);
      const stripeColor = p.stripeColor || '#3b2a24';
      ctx.fillStyle = stripeColor;
      const stripeWidth = Math.max(0.6, bodySize * 0.4);
      ctx.fillRect(-stripeWidth * 0.5, -half, stripeWidth, bodySize);
      ctx.fillRect(half - stripeWidth * 0.9, -half * 0.7, stripeWidth * 0.9, bodySize * 0.7);
      const wingColor = p.wingColor || 'rgba(255, 255, 255, 0.75)';
      ctx.fillStyle = wingColor;
      ctx.globalAlpha = Math.min(1, alpha * 0.9);
      ctx.beginPath();
      ctx.ellipse(-half - wingLength * 0.25, -wingHeight * 0.5, wingLength * 0.5, wingHeight * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-half - wingLength * 0.25, wingHeight * 0.5, wingLength * 0.5, wingHeight * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha;
      const tipColor = p.tipColor || '#2f1f1a';
      ctx.strokeStyle = tipColor;
      ctx.lineWidth = Math.max(0.6, bodySize * 0.45);
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half + bodySize * 0.45, 0);
      ctx.stroke();
    }else if(p.kind==='droneSeekerMissile'){
      const angle = Math.atan2(p.vy, p.vx);
      const length = Math.max(22, p.length ?? 28);
      const bodyRadius = Math.max(4, (p.radius ?? 7));
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha * 0.75;
      ctx.fillStyle = p.trailColor || 'rgba(255, 176, 116, 0.65)';
      ctx.beginPath();
      ctx.moveTo(-length * 0.55, 0);
      ctx.quadraticCurveTo(-length * 0.85, -bodyRadius * 0.9, -length * 0.65, 0);
      ctx.quadraticCurveTo(-length * 0.85, bodyRadius * 0.9, -length * 0.55, 0);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color || '#ffe1be';
      ctx.fillRect(-length * 0.32, -bodyRadius * 0.55, length * 0.64, bodyRadius * 1.1);
      ctx.fillStyle = p.accentColor || '#584231';
      ctx.fillRect(-length * 0.44, -bodyRadius * 0.7, length * 0.18, bodyRadius * 1.4);
      ctx.fillStyle = p.color || '#ffe1be';
      ctx.beginPath();
      ctx.arc(length * 0.16, 0, bodyRadius * 0.85, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.fill();
      ctx.fillStyle = p.tipColor || '#ff9d52';
      ctx.beginPath();
      ctx.moveTo(length * 0.52, 0);
      ctx.lineTo(length * 0.15, bodyRadius * 0.78);
      ctx.lineTo(length * 0.15, -bodyRadius * 0.78);
      ctx.closePath();
      ctx.fill();
    }else if(p.kind==='sunlance'){
      const angle = p.angle ?? 0;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      ctx.fillStyle = p.color || '#ffd36b';
      ctx.beginPath();
      ctx.moveTo(p.x - dx*6 + dy*3, p.y - dy*6 - dx*3);
      ctx.lineTo(p.x + dx*12, p.y + dy*12);
      ctx.lineTo(p.x - dx*6 - dy*3, p.y - dy*6 + dx*3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff6d0';
      ctx.lineWidth = 2;
      ctx.stroke();
    }else if(p.kind==='voidOrb'){
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = p.color || '#b28cff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6.5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140, 255, 240, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='voidGlyphOrb'){
      const phase = p.haloPhase ?? 0;
      const radius = Math.max(6, p.radius ?? 10);
      ctx.translate(p.x, p.y);
      ctx.rotate(phase);
      const coreRadius = radius * 0.6;
      ctx.fillStyle = 'rgba(14, 8, 24, 0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = p.color || '#a48cff';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.stroke();
      const orbitRadius = radius * 1.8;
      const orbiters = 3;
      for(let n=0;n<orbiters;n++){
        const angle = (TAU / orbiters) * n;
        const ox = Math.cos(angle) * orbitRadius;
        const oy = Math.sin(angle) * orbitRadius;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(phase * 1.2 + angle);
        const orbRadius = radius * 0.38;
        ctx.fillStyle = 'rgba(6, 3, 12, 0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 0, orbRadius, orbRadius * 0.8, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(188, 176, 255, 0.7)';
        ctx.lineWidth = Math.max(1.1, orbRadius * 0.45);
        ctx.beginPath();
        ctx.arc(0, 0, orbRadius * 0.7, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }else if(p.kind==='voidSingularity'){
      const radius = Math.max(24, p.radius ?? 56);
      ctx.translate(p.x, p.y);
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(12, 8, 24, 0.95)');
      gradient.addColorStop(0.6, 'rgba(12, 8, 24, 0.7)');
      gradient.addColorStop(1, 'rgba(12, 8, 24, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(2.6, radius * 0.14);
      ctx.strokeStyle = p.color || '#a48cff';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.82, 0, TAU);
      ctx.stroke();
      const rotation = p.haloRotation ?? 0;
      const orbiters = 4;
      for(let n=0;n<orbiters;n++){
        const angle = rotation + (TAU / orbiters) * n;
        const ox = Math.cos(angle) * radius * 0.68;
        const oy = Math.sin(angle) * radius * 0.68;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(angle * 1.2);
        const orbRadius = radius * 0.26;
        ctx.fillStyle = 'rgba(8, 4, 16, 0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 0, orbRadius, orbRadius * 0.7, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(188, 176, 255, 0.65)';
        ctx.lineWidth = orbRadius * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, orbRadius * 0.6, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }else if(p.kind==='spiritOrb'){
      const radius = 7.5;
      const glowRadius = radius * 2.2;
      const gradient = ctx.createRadialGradient(p.x, p.y, radius * 0.2, p.x, p.y, glowRadius);
      gradient.addColorStop(0, p.color || '#bfe8ff');
      gradient.addColorStop(0.55, 'rgba(191, 232, 255, 0.65)');
      gradient.addColorStop(1, 'rgba(191, 232, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowRadius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8f8ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 0.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.color || '#bfe8ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='pyreWave'){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle ?? 0);
      const lengthScale = p.waveLengthScale ?? 1.6;
      const radius = Math.max(18, p.radius ?? 18);
      const length = Math.max(36, radius * lengthScale);
      const widthTarget = p.waveWidth !== undefined ? p.waveWidth : radius * 0.9;
      const width = Math.max(16, p.waveWidthCurrent !== undefined ? p.waveWidthCurrent : widthTarget);
      const halfWidth = width * 0.5;
      const gradient = ctx.createLinearGradient(-length * 0.4, 0, length * 0.85, 0);
      gradient.addColorStop(0, 'rgba(255, 120, 70, 0)');
      gradient.addColorStop(0.35, p.color || '#ffb36b');
      gradient.addColorStop(1, 'rgba(255, 210, 150, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-length * 0.35, -halfWidth * 0.9);
      ctx.quadraticCurveTo(length * 0.45, -halfWidth, length * 0.9, -2);
      ctx.quadraticCurveTo(length * 0.45, halfWidth, -length * 0.35, halfWidth * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = Math.max(2, halfWidth * 0.32);
      ctx.strokeStyle = p.edgeColor || 'rgba(255, 210, 160, 0.85)';
      ctx.stroke();
      ctx.globalAlpha = Math.min(1, (p.alpha ?? 1) * 0.75);
      ctx.lineWidth = Math.max(1.2, halfWidth * 0.22);
      ctx.strokeStyle = 'rgba(255, 235, 200, 0.45)';
      ctx.beginPath();
      ctx.moveTo(-length * 0.1, -halfWidth * 0.45);
      ctx.lineTo(length * 0.72, 0);
      ctx.lineTo(-length * 0.1, halfWidth * 0.45);
      ctx.stroke();
      ctx.restore();
    }else if(p.kind==='emberWave'){
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle ?? 0);
      const length = 36;
      const width = 22;
      const gradient = ctx.createLinearGradient(-length*0.6, 0, length*0.9, 0);
      gradient.addColorStop(0, 'rgba(255, 120, 60, 0.2)');
      gradient.addColorStop(1, (p.color || '#ffb36b'));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-length*0.4, 0);
      ctx.quadraticCurveTo(length*0.05, -width*0.7, length*0.9, -1.5);
      ctx.quadraticCurveTo(length*0.05, width*0.7, -length*0.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = p.color || '#ffb36b';
      ctx.stroke();
    }else if(p.kind==='chronoOrb'){
      ctx.translate(p.x, p.y);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = p.color || '#7de9ff';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.trailColor || 'rgba(125, 233, 255, 0.4)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0, TAU);
      ctx.stroke();
      const spin = ((nowMs() - p.born) / 240) % TAU;
      ctx.rotate(spin);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.strokeStyle = p.trailColor || '#bff4ff';
      ctx.stroke();
    }else if(p.kind==='neonShard'){
      ctx.shadowColor = p.color || '#54f0ff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = p.color || '#54f0ff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(p.x - 9, p.y);
      ctx.lineTo(p.x + 9, p.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }else if(p.kind==='sandClump'){
      ctx.translate(p.x, p.y);
      const radius = 6;
      const angle = (nowMs() - p.born) / 320;
      ctx.rotate(angle);
      ctx.fillStyle = p.color || '#d4c089';
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.2, radius * 0.9, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.trailColor || '#b79a5b';
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-radius * 0.2, -radius * 0.3, radius * 0.65, radius * 0.35, 0, 0, TAU);
      ctx.fill();
    }else if(p.kind==='petalArc'){
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle ?? 0);
      const length = 34;
      const width = 18;
      const gradient = ctx.createLinearGradient(-length * 0.4, 0, length * 0.6, 0);
      gradient.addColorStop(0, 'rgba(120, 210, 150, 0.4)');
      gradient.addColorStop(1, p.color || '#bfffd4');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-length * 0.4, 0);
      ctx.quadraticCurveTo(length * 0.1, -width * 0.8, length * 0.6, -2);
      ctx.quadraticCurveTo(length * 0.1, width * 0.8, -length * 0.4, 0);
      ctx.fill();
      ctx.strokeStyle = '#7bdca0';
      ctx.lineWidth = 2;
      ctx.stroke();
    }else if(p.kind==='seedPod'){
      ctx.translate(p.x, p.y);
      const radius = 7;
      ctx.rotate((nowMs() - p.born) / 420);
      ctx.fillStyle = p.color || '#b4f59c';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.1, radius * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7ac47c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.7, radius * 0.5, 0, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='gustOrb'){
      ctx.translate(p.x, p.y);
      const radius = 8;
      const spin = (nowMs() - p.born) / 260;
      ctx.rotate(spin);
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, p.color || '#9be8ff');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.trailColor || 'rgba(150, 230, 255, 0.8)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.25, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='pressureBolt'){
      const angle = p.angle ?? Math.atan2(p.vy, p.vx);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      ctx.strokeStyle = p.color || '#6ecbff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - dx * 10, p.y - dy * 10);
      ctx.lineTo(p.x + dx * 16, p.y + dy * 16);
      ctx.stroke();
      ctx.strokeStyle = '#c6f3ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - dx * 6 + dy * 2, p.y - dy * 6 - dx * 2);
      ctx.lineTo(p.x + dx * 12, p.y + dy * 12);
      ctx.stroke();
    }else if(p.kind==='steamMine'){
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color || '#7fe1ff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#17405e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = 'rgba(180, 242, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(0, -4, 4, 0, TAU);
      ctx.fill();
    }else if(p.kind==='bubbleSaw'){
      ctx.translate(p.x, p.y);
      ctx.rotate((nowMs() - p.born) / 320);
      ctx.strokeStyle = p.color || '#c4f1ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#8bd0ff';
      ctx.beginPath();
      for(let i=0;i<6;i++){
        const ang = (TAU * i) / 6;
        ctx.moveTo(Math.cos(ang) * 6.5, Math.sin(ang) * 6.5);
        ctx.lineTo(Math.cos(ang) * 11, Math.sin(ang) * 11);
      }
      ctx.stroke();
    }else if(p.kind==='chronoglassShard'){
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle ?? 0);
      ctx.fillStyle = p.color || '#ffd27a';
      ctx.beginPath();
      ctx.moveTo(-6, -2);
      ctx.lineTo(10, 0);
      ctx.lineTo(-6, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffecb8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }else if(p.kind==='echoDisc'){
      ctx.translate(p.x, p.y);
      const spin = (nowMs() - p.born) / 240;
      ctx.rotate(spin);
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = p.color || '#ffd98f';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.trailColor || '#ffecca';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.stroke();
    }else if(p.kind==='inkSwipe'){
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle ?? 0);
      const length = 40;
      const width = 20;
      const gradient = ctx.createLinearGradient(-length * 0.5, 0, length * 0.8, 0);
      gradient.addColorStop(0, 'rgba(120, 72, 36, 0.2)');
      gradient.addColorStop(1, p.color || '#ffdca6');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-length * 0.45, 0);
      ctx.quadraticCurveTo(length * 0.05, -width * 0.7, length * 0.85, -2);
      ctx.quadraticCurveTo(length * 0.05, width * 0.7, -length * 0.45, 0);
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = p.color || '#ffdca6';
      ctx.stroke();
    }else if(p.kind==='inkDrop'){
      ctx.translate(p.x, p.y);
      const height = 14;
      ctx.fillStyle = p.color || '#ffb36b';
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.quadraticCurveTo(6, -height * 0.3, 0, height * 0.6);
      ctx.quadraticCurveTo(-6, -height * 0.3, 0, -height);
      ctx.fill();
      ctx.strokeStyle = '#ffdca6';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }else if(p.kind==='icePillar'){
      ctx.save();
      ctx.translate(p.x, p.y);
      const height = Math.max(60, p.pillarHeight ?? 150);
      const width = Math.max(20, (p.radius ?? 56) * 0.9);
      const alpha = clamp(p.alpha ?? 1, 0, 1);
      const gradient = ctx.createLinearGradient(0, -height, 0, 0);
      gradient.addColorStop(0, 'rgba(217, 243, 255, 0)');
      gradient.addColorStop(0.18, p.pillarColor || '#d9f3ff');
      gradient.addColorStop(1, p.pillarColor || '#d9f3ff');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-width * 0.55, 0);
      ctx.lineTo(-width * 0.9, -height * 0.95);
      ctx.quadraticCurveTo(0, -height * 1.05, width * 0.9, -height * 0.95);
      ctx.lineTo(width * 0.55, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.telegraphColor || '#9fdcff';
      ctx.lineWidth = Math.max(2, width * 0.08);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(-width * 0.18, -height * 0.92, width * 0.36, height * 0.85);
      ctx.restore();
    }else{
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.moveTo(p.x-5, p.y);
      ctx.lineTo(p.x+5, p.y);
      ctx.stroke();
    }
    if(restoreFilter) restoreFilter();
    ctx.restore();
    if(typeof restoreStage === 'function') restoreStage();
    if(showHitboxes){
      drawProjectileHitbox(ctx, p);
    }
  }
}

function spawnSandPuffParticles(world, x, y, baseColor, rimColor){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const count = 6 + Math.floor(Math.random() * 3);
  for(let i=0;i<count;i++){
    const puff = {
      type: 'sandPuff',
      style: 'sandPuff',
      x: x + rand(-8, 8),
      y: y + rand(-6, 6),
      vx: rand(-90, 90),
      vy: rand(-220, -140),
      rotation: rand(0, TAU),
      spin: rand(-2.4, 2.4),
      radius: rand(10, 18),
      life: 0,
      maxLife: rand(520, 760),
      color: baseColor || '#d4c089',
      rimColor: rimColor || '#b79a5b',
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(puff, 'sandPuff');
    world.particles.push(puff);
  }
  const grains = 10;
  for(let g=0; g<grains; g++){
    const grain = {
      type: 'grain',
      style: 'grain',
      x: x + rand(-12, 12),
      y: y + rand(-10, 4),
      vx: rand(-70, 70),
      vy: rand(-160, -80),
      rotation: rand(0, TAU),
      spin: rand(-6, 6),
      width: rand(4, 7),
      height: rand(2, 3),
      maxLife: rand(720, 940),
      color: '#b79a5b'
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(grain, 'grain');
    world.particles.push(grain);
  }
}

function spawnFireBulletImpact(world, x, y, color){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const hue = color || '#ff9a56';
  for(let i=0;i<6;i++){
    const ember = {
      type: 'fire',
      style: 'fire',
      x: x + rand(-4, 4),
      y: y + rand(-6, 2),
      vx: rand(-140, 140),
      vy: rand(-220, -80),
      width: rand(8, 14),
      height: rand(14, 22),
      color: hue,
      coreColor: 'rgba(255, 240, 210, 0.9)',
      life: 0,
      maxLife: rand(360, 560),
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ember, 'fire');
    world.particles.push(ember);
  }
  const smoke = {
    type: 'smoke',
    style: 'smoke',
    x: x + rand(-6, 6),
    y: y + rand(-4, 2),
    vx: rand(-40, 40),
    vy: rand(-60, -10),
    radius: rand(10, 16),
    color: 'rgba(70, 60, 50, 0.45)',
    life: 0,
    maxLife: rand(520, 720)
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(smoke, 'smoke');
  world.particles.push(smoke);
}

function spawnBeeDisperse(world, x, y, color){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const tint = color || '#ffeaa0';
  for(let i=0;i<4;i++){
    const ring = {
      type: 'ring',
      style: 'ring',
      x,
      y,
      radius: rand(6, 10),
      growth: rand(26, 40),
      thickness: 1.2,
      life: 0,
      maxLife: rand(240, 360),
      color: 'rgba(255, 234, 150, 0.7)',
      alpha: 1,
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
    world.particles.push(ring);
  }
  for(let i=0;i<6;i++){
    const cloud = {
      type: 'smoke',
      style: 'smoke',
      x: x + rand(-8, 8),
      y: y + rand(-8, 8),
      vx: rand(-90, 90),
      vy: rand(-50, 60),
      radius: rand(6, 10),
      color: 'rgba(255, 238, 170, 0.4)',
      life: 0,
      maxLife: rand(320, 520)
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(cloud, 'smoke');
    world.particles.push(cloud);
  }
}

function findBeeTarget(projectile, world){
  if(!world || !Array.isArray(world.sticks)) return null;
  const owner = projectile.owner;
  let nearest = null;
  let bestDist = Infinity;
  for(const stick of world.sticks){
    if(!stick || stick.dead) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dx = center.x - projectile.x;
    const dy = center.y - projectile.y;
    const dist = Math.hypot(dx, dy);
    if(dist < bestDist){
      bestDist = dist;
      nearest = stick;
    }
  }
  return nearest;
}

function updateBeeProjectileVelocity(projectile, world, dt){
  const target = findBeeTarget(projectile, world);
  const maxSpeed = projectile.maxSpeed ?? 420;
  const turnRate = projectile.turnRate ?? 6;
  const seekForce = projectile.seekForce ?? 820;
  if(target){
    const center = typeof target.center === 'function' ? target.center() : null;
    if(center){
      const dx = center.x - projectile.x;
      const dy = center.y - projectile.y;
      const dist = Math.hypot(dx, dy) || 1;
      const desiredVx = (dx / dist) * maxSpeed;
      const desiredVy = (dy / dist) * maxSpeed;
      const factor = clamp(turnRate * dt, 0, 1);
      projectile.vx += (desiredVx - projectile.vx) * factor;
      projectile.vy += (desiredVy - projectile.vy) * factor;
      if(dist > 0){
        const accel = seekForce * dt;
        projectile.vx += (dx / dist) * accel * 0.2;
        projectile.vy += (dy / dist) * accel * 0.2;
      }
    }
  }else{
    const drag = clamp(1 - (projectile.drag ?? 0.16) * dt, 0.6, 1);
    projectile.vx *= drag;
    projectile.vy *= drag;
  }
  const speed = Math.hypot(projectile.vx, projectile.vy);
  if(speed > maxSpeed && maxSpeed > 0){
    const scale = maxSpeed / speed;
    projectile.vx *= scale;
    projectile.vy *= scale;
  }
  projectile.angle = Math.atan2(projectile.vy, projectile.vx);
  projectile.beeTarget = target;
}

function updatePsiFloatArrow(projectile, dt){
  if(!projectile || !(dt > 0)) return;
  const curveRate = Number.isFinite(projectile.curveRate) ? projectile.curveRate : 0;
  const curveDir = Number.isFinite(projectile.curveDir) ? projectile.curveDir : (projectile.curveDir === 0 ? 0 : 1);
  if(curveRate && curveDir){
    const rotation = clamp(curveRate * curveDir * dt, -Math.PI, Math.PI);
    if(rotation !== 0){
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const vx = projectile.vx;
      const vy = projectile.vy;
      projectile.vx = vx * cos - vy * sin;
      projectile.vy = vx * sin + vy * cos;
    }
  }
  const desiredSpeed = Number.isFinite(projectile.desiredSpeed) ? projectile.desiredSpeed : null;
  if(desiredSpeed && desiredSpeed > 0){
    const currentSpeed = Math.hypot(projectile.vx, projectile.vy);
    const adjustRate = Math.max(0, projectile.speedAdjust ?? 5.4);
    if(currentSpeed > 0){
      const lerp = clamp(adjustRate * dt, 0, 1);
      const nextSpeed = currentSpeed + (desiredSpeed - currentSpeed) * lerp;
      const scale = nextSpeed / currentSpeed;
      projectile.vx *= scale;
      projectile.vy *= scale;
    }else{
      const angle = projectile.angle ?? 0;
      projectile.vx = Math.cos(angle) * desiredSpeed;
      projectile.vy = Math.sin(angle) * desiredSpeed;
    }
  }
  if(Number.isFinite(projectile.drag) && projectile.drag > 0){
    const dragScale = clamp(1 - projectile.drag * dt, 0.2, 1);
    projectile.vx *= dragScale;
    projectile.vy *= dragScale;
  }
  projectile.angle = Math.atan2(projectile.vy, projectile.vx);
}

function spawnHeatSeekerTrail(world, projectile){
  if(!world || !projectile) return;
  if(!world.particles) world.particles = [];
  const angle = projectile.angle ?? Math.atan2(projectile.vy || 0, projectile.vx || 1);
  const backOffset = (projectile.radius ?? 8) + 4;
  const baseX = (projectile.x || 0) - Math.cos(angle) * backOffset;
  const baseY = (projectile.y || 0) - Math.sin(angle) * backOffset;
  const flame = {
    type: 'fire',
    style: 'fire',
    x: baseX + rand(-3, 3),
    y: baseY + rand(-3, 3),
    vx: rand(-60, 60),
    vy: rand(-180, -80),
    width: rand(10, 16),
    height: rand(16, 24),
    color: projectile.effectColor || projectile.trailColor || '#ffb36b',
    coreColor: 'rgba(255, 240, 210, 0.92)',
    life: 0,
    maxLife: rand(280, 460),
    ignoreGround: true
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(flame, 'fire');
  world.particles.push(flame);
  const smoke = {
    type: 'smoke',
    style: 'smoke',
    x: baseX + rand(-4, 4),
    y: baseY + rand(-4, 4),
    vx: rand(-40, 40),
    vy: rand(-60, -20),
    radius: rand(10, 16),
    color: 'rgba(110, 102, 94, 0.42)',
    life: 0,
    maxLife: rand(480, 660)
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(smoke, 'smoke');
  world.particles.push(smoke);
}

function updateHeatSeekerMissile(projectile, world, dt){
  if(!projectile || !world) return;
  let target = projectile.lockedTarget;
  if(target && target.dead){
    target = null;
    projectile.lockedTarget = null;
  }
  if(!target){
    target = findBeeTarget(projectile, world);
    if(target) projectile.lockedTarget = target;
  }
  const center = target && typeof target.center === 'function' ? target.center() : null;
  const maxSpeed = projectile.maxSpeed ?? 760;
  const seekForce = projectile.seekForce ?? 920;
  const turnRate = projectile.turnRate ?? 5;
  const drag = projectile.drag ?? 0.05;
  if(center){
    const dx = center.x - projectile.x;
    const dy = center.y - projectile.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desiredVx = (dx / dist) * maxSpeed;
    const desiredVy = (dy / dist) * maxSpeed;
    const factor = clamp(turnRate * dt, 0, 1);
    projectile.vx += (desiredVx - projectile.vx) * factor;
    projectile.vy += (desiredVy - projectile.vy) * factor;
    const accel = seekForce * dt;
    projectile.vx += (dx / dist) * accel * 0.5;
    projectile.vy += (dy / dist) * accel * 0.5;
  }else{
    const dragScale = clamp(1 - drag * dt, 0.6, 1);
    projectile.vx *= dragScale;
    projectile.vy *= dragScale;
  }
  const speed = Math.hypot(projectile.vx, projectile.vy);
  if(speed > maxSpeed && maxSpeed > 0){
    const scale = maxSpeed / speed;
    projectile.vx *= scale;
    projectile.vy *= scale;
  }
  projectile.angle = Math.atan2(projectile.vy, projectile.vx);
  projectile.smokeTimer = (projectile.smokeTimer || 0) + dt * 1000;
  const interval = projectile.smokeInterval ?? 80;
  if(projectile.smokeTimer >= interval){
    projectile.smokeTimer = 0;
    spawnHeatSeekerTrail(world, projectile);
  }
}

function handleBeeProjectileBounce(projectile, world, staticRects=[], _prevX, _prevY){
  if(!world || !projectile) return;
  const bounce = projectile.bounce ?? 0.78;
  const radius = Math.max(0, projectile.radius ?? 3);
  const sampleY = projectile.y + radius;
  const ground = groundHeightAt(world, projectile.x, { referenceY: sampleY, surface: 'top' });
  if(sampleY > ground){
    projectile.y = Math.max(ground - radius, ground - radius);
    if(projectile.vy > 0) projectile.vy = -Math.abs(projectile.vy) * bounce;
    projectile.vx *= 0.9;
  }
  const ceiling = world.ceilingY;
  if(Number.isFinite(ceiling) && projectile.y - radius < ceiling){
    projectile.y = ceiling + radius;
    if(projectile.vy < 0) projectile.vy = Math.abs(projectile.vy) * bounce;
  }
  if(projectile.x - radius < 0){
    projectile.x = radius;
    projectile.vx = Math.abs(projectile.vx) * bounce;
  }else if(projectile.x + radius > world.width){
    projectile.x = Math.max(world.width - radius, radius);
    projectile.vx = -Math.abs(projectile.vx) * bounce;
  }
  const applyRectBounce = (left, right, top, bottom)=>{
    if(right <= left || bottom <= top) return false;
    if(projectile.x + radius <= left || projectile.x - radius >= right || projectile.y + radius <= top || projectile.y - radius >= bottom){
      return false;
    }
    const overlapLeft = (projectile.x + radius) - left;
    const overlapRight = right - (projectile.x - radius);
    const overlapTop = (projectile.y + radius) - top;
    const overlapBottom = bottom - (projectile.y - radius);
    if(overlapLeft <= 0 || overlapRight <= 0 || overlapTop <= 0 || overlapBottom <= 0) return false;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if(minOverlap === overlapLeft){
      projectile.x = left - radius;
      projectile.vx = -Math.abs(projectile.vx) * bounce;
    }else if(minOverlap === overlapRight){
      projectile.x = right + radius;
      projectile.vx = Math.abs(projectile.vx) * bounce;
    }else if(minOverlap === overlapTop){
      projectile.y = top - radius;
      projectile.vy = -Math.abs(projectile.vy) * bounce;
    }else{
      projectile.y = bottom + radius;
      projectile.vy = Math.abs(projectile.vy) * bounce;
    }
    projectile.vx *= 0.92;
    projectile.vy *= 0.92;
    return true;
  };
  const rects = Array.isArray(staticRects) ? staticRects : [];
  for(const rect of rects){
    if(!rect) continue;
    const left = rect.left ?? rect.x ?? 0;
    const right = rect.right ?? (left + (rect.width ?? rect.w ?? 0));
    const top = rect.top ?? rect.y ?? 0;
    const bottom = rect.bottom ?? (top + (rect.height ?? rect.h ?? 0));
    if(applyRectBounce(left, right, top, bottom)){
      break;
    }
  }
  const walls = Array.isArray(world.breakables) ? world.breakables : [];
  for(const wall of walls){
    if(!wall || wall.broken) continue;
    const left = wall.x ?? 0;
    const right = left + (wall.w ?? 0);
    const top = wall.y ?? 0;
    const bottom = top + (wall.h ?? 0);
    if(applyRectBounce(left, right, top, bottom)){
      break;
    }
  }
  projectile.angle = Math.atan2(projectile.vy, projectile.vx);
}

function processChakramBounce(world, projectile, axis, context={}){
  if(!world || !projectile) return null;
  const radius = projectile.radius ?? 7;
  const bounceCount = (projectile.terrainBounceCount ?? 0) + 1;
  const maxBounces = Math.max(1, projectile.maxBounces ?? projectile.maxTerrainBounces ?? 3);
  const willFinalize = bounceCount >= maxBounces;
  projectile.terrainBounceCount = bounceCount;
  const surface = context.surface;
  if(!willFinalize && typeof projectile.onExpire === 'function'){
    try {
      projectile.onExpire(world, projectile, 'terrain', {
        ...context,
        bounce: true,
        bounceCount,
        maxBounces
      });
    } catch(err){
      console.error('chakram bounce handler error', err);
    }
  }
  if(willFinalize){
    if(axis === 'floor'){
      projectile.y = Math.min(projectile.y, (context.surfaceY ?? projectile.y));
    }else if(axis === 'ceiling'){
      projectile.y = Math.max(projectile.y, (context.surfaceY ?? projectile.y));
    }else if(axis === 'left'){
      projectile.x = Math.max(projectile.x, (context.surfaceX ?? projectile.x));
    }else if(axis === 'right'){
      projectile.x = Math.min(projectile.x, (context.surfaceX ?? projectile.x));
    }
    return { finalize: true, bounceCount, maxBounces, surface };
  }
  const bounce = projectile.bounce ?? 0.78;
  if(axis === 'floor'){
    if(projectile.vy >= 0){
      projectile.vy = -Math.abs(projectile.vy) * bounce;
    }else{
      projectile.vy = -projectile.vy * bounce;
    }
    const surfaceY = context.surfaceY ?? (projectile.y + radius);
    projectile.y = Math.min(surfaceY - radius, surfaceY - radius * 0.98);
    projectile.vx *= context.friction ?? 0.92;
  }else if(axis === 'ceiling'){
    if(projectile.vy <= 0){
      projectile.vy = Math.abs(projectile.vy) * bounce;
    }else{
      projectile.vy = -projectile.vy * bounce;
    }
    const surfaceY = context.surfaceY ?? (projectile.y - radius);
    projectile.y = Math.max(surfaceY + radius, surfaceY + radius * 0.98);
  }else if(axis === 'left'){
    if(projectile.vx <= 0){
      projectile.vx = Math.abs(projectile.vx) * bounce;
    }else{
      projectile.vx = -projectile.vx * bounce;
    }
    const surfaceX = context.surfaceX ?? 0;
    projectile.x = Math.max(surfaceX + radius, surfaceX + radius * 0.98);
  }else if(axis === 'right'){
    if(projectile.vx >= 0){
      projectile.vx = -Math.abs(projectile.vx) * bounce;
    }else{
      projectile.vx = -projectile.vx * bounce;
    }
    const surfaceX = context.surfaceX ?? (projectile.x + radius);
    projectile.x = Math.min(surfaceX - radius, surfaceX - radius * 0.98);
  }
  projectile.angle = Math.atan2(projectile.vy, projectile.vx);
  return { finalize: false, bounceCount, maxBounces, surface };
}

function handleChakramWorldBounce(projectile, world, ground, prevX, prevY){
  if(!world || !projectile) return null;
  const radius = projectile.radius ?? 7;
  if(Number.isFinite(ground) && projectile.y + radius >= ground && (projectile.vy >= 0 || (prevY + radius) < ground)){
    projectile.y = Math.min(projectile.y, ground - radius);
    return processChakramBounce(world, projectile, 'floor', {
      surface: 'ground',
      surfaceY: ground
    });
  }
  const ceiling = world.ceilingY;
  if(Number.isFinite(ceiling) && projectile.y - radius <= ceiling && (projectile.vy <= 0 || (prevY - radius) > ceiling)){
    projectile.y = Math.max(projectile.y, ceiling + radius);
    return processChakramBounce(world, projectile, 'ceiling', {
      surface: 'ceiling',
      surfaceY: ceiling
    });
  }
  if(projectile.x - radius <= 0 && (projectile.vx <= 0 || (prevX - radius) > 0)){
    projectile.x = Math.max(projectile.x, radius);
    return processChakramBounce(world, projectile, 'left', {
      surface: 'leftWall',
      surfaceX: 0
    });
  }
  const width = world.width ?? 0;
  if(width > 0 && projectile.x + radius >= width && (projectile.vx >= 0 || (prevX + radius) < width)){
    projectile.x = Math.min(projectile.x, Math.max(width - radius, radius));
    return processChakramBounce(world, projectile, 'right', {
      surface: 'rightWall',
      surfaceX: width
    });
  }
  const tiles = typeof terrainTiles === 'function'
    ? terrainTiles(world)
    : (Array.isArray(world.terrain) ? world.terrain : []);
  if(Array.isArray(tiles) && tiles.length){
    for(const tile of tiles){
      if(!tile) continue;
      const tileWidth = tile.w ?? tile.width ?? 0;
      const tileHeight = tile.h ?? tile.height ?? 0;
      if(!(tileWidth > 0 && tileHeight > 0)) continue;
      const tileLeft = tile.x ?? tile.left ?? 0;
      const tileTop = tile.y ?? tile.top ?? 0;
      const tileRight = tileLeft + tileWidth;
      const tileBottom = tileTop + tileHeight;
      const expandedLeft = tileLeft - radius;
      const expandedRight = tileRight + radius;
      const expandedTop = tileTop - radius;
      const expandedBottom = tileBottom + radius;
      const insideX = projectile.x > expandedLeft && projectile.x < expandedRight;
      const insideY = projectile.y > expandedTop && projectile.y < expandedBottom;
      if(!insideX || !insideY) continue;
      const prevRight = prevX + radius;
      const prevLeft = prevX - radius;
      const prevTop = prevY - radius;
      const prevBottom = prevY + radius;
      const currRight = projectile.x + radius;
      const currLeft = projectile.x - radius;
      const currTop = projectile.y - radius;
      const currBottom = projectile.y + radius;
      let axis = null;
      if(prevBottom <= tileTop && currBottom >= tileTop){
        axis = 'floor';
        projectile.y = Math.min(projectile.y, tileTop - radius);
      }else if(prevTop >= tileBottom && currTop <= tileBottom){
        axis = 'ceiling';
        projectile.y = Math.max(projectile.y, tileBottom + radius);
      }else if(prevRight <= tileLeft && currRight >= tileLeft){
        axis = 'left';
        projectile.x = Math.max(projectile.x, tileLeft - radius);
      }else if(prevLeft >= tileRight && currLeft <= tileRight){
        axis = 'right';
        projectile.x = Math.min(projectile.x, tileRight + radius);
      }else{
        const overlapLeft = Math.abs(projectile.x - expandedLeft);
        const overlapRight = Math.abs(expandedRight - projectile.x);
        const overlapTop = Math.abs(projectile.y - expandedTop);
        const overlapBottom = Math.abs(expandedBottom - projectile.y);
        let minOverlap = overlapLeft;
        axis = 'left';
        if(overlapRight < minOverlap){ axis = 'right'; minOverlap = overlapRight; }
        if(overlapTop < minOverlap){ axis = 'ceiling'; minOverlap = overlapTop; }
        if(overlapBottom < minOverlap){ axis = 'floor'; minOverlap = overlapBottom; }
        if(axis === 'left'){
          projectile.x = Math.max(projectile.x, tileLeft - radius);
        }else if(axis === 'right'){
          projectile.x = Math.min(projectile.x, tileRight + radius);
        }else if(axis === 'ceiling'){
          projectile.y = Math.max(projectile.y, tileBottom + radius);
        }else{
          projectile.y = Math.min(projectile.y, tileTop - radius);
        }
      }
      const context = { surface: 'terrain', tile };
      if(axis === 'floor') context.surfaceY = tileTop;
      if(axis === 'ceiling') context.surfaceY = tileBottom;
      if(axis === 'left') context.surfaceX = tileLeft;
      if(axis === 'right') context.surfaceX = tileRight;
      const outcome = processChakramBounce(world, projectile, axis, context);
      if(outcome) return outcome;
    }
  }
  return null;
}

function handleChakramBreakableBounce(projectile, world, wall, prevX, prevY){
  if(!world || !projectile || !wall) return null;
  const radius = projectile.radius ?? 7;
  const wallX = wall.x ?? 0;
  const wallY = wall.y ?? 0;
  const wallW = wall.w ?? 0;
  const wallH = wall.h ?? 0;
  const left = wallX - radius;
  const right = wallX + wallW + radius;
  const top = wallY - radius;
  const bottom = wallY + wallH + radius;
  if(projectile.x < left || projectile.x > right || projectile.y < top || projectile.y > bottom){
    return null;
  }
  const result = applyDamageToBreakableStructure(world, wall, projectile.dmg ?? 0, { projectile, element: projectile.element });
  if(typeof isFireElement === 'function' && isFireElement(projectile.element) && typeof igniteFlammableStructure === 'function'){
    igniteFlammableStructure(world, wall, { intensity: 1 });
  }
  const cameFromLeft = (prevX + radius) <= wallX && (projectile.x + radius) >= wallX;
  const cameFromRight = (prevX - radius) >= wallX + wallW && (projectile.x - radius) <= wallX + wallW;
  const cameFromTop = (prevY + radius) <= wallY && (projectile.y + radius) >= wallY;
  const cameFromBottom = (prevY - radius) >= wallY + wallH && (projectile.y - radius) <= wallY + wallH;
  let axis = 'left';
  if(cameFromLeft){
    axis = 'left';
    projectile.x = left;
  }else if(cameFromRight){
    axis = 'right';
    projectile.x = right;
  }else if(cameFromTop){
    axis = 'ceiling';
    projectile.y = top;
  }else if(cameFromBottom){
    axis = 'floor';
    projectile.y = bottom;
  }else{
    const overlapLeft = Math.abs(projectile.x - left);
    const overlapRight = Math.abs(right - projectile.x);
    const overlapTop = Math.abs(projectile.y - top);
    const overlapBottom = Math.abs(bottom - projectile.y);
    let minOverlap = overlapLeft;
    axis = 'left';
    if(overlapRight < minOverlap){ axis = 'right'; minOverlap = overlapRight; }
    if(overlapTop < minOverlap){ axis = 'ceiling'; minOverlap = overlapTop; }
    if(overlapBottom < minOverlap){ axis = 'floor'; minOverlap = overlapBottom; }
    if(axis === 'left'){
      projectile.x = left;
    }else if(axis === 'right'){
      projectile.x = right;
    }else if(axis === 'ceiling'){
      projectile.y = top;
    }else{
      projectile.y = bottom;
    }
  }
  const context = { surface: 'wall', wall };
  if(axis === 'left') context.surfaceX = wallX;
  if(axis === 'right') context.surfaceX = wallX + wallW;
  if(axis === 'ceiling') context.surfaceY = wallY;
  if(axis === 'floor') context.surfaceY = wallY + wallH;
  const outcome = processChakramBounce(world, projectile, axis, context);
  if(outcome && result && (result.applied || result.blocked)){
    outcome.hitWall = true;
  }
  return outcome;
}

function spawnTemporalRipple(world, x, y, color){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const rings = 3;
  for(let i=0;i<rings;i++){
    const ring = {
      type: 'ring',
      style: 'ring',
      x,
      y,
      radius: 12 + i * 6,
      growth: 28,
      thickness: 1.6 + i * 0.4,
      life: 0,
      maxLife: 520 + i * 60,
      color: color || 'rgba(125, 233, 255, 0.8)',
      alpha: 1,
      resting: true,
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
    world.particles.push(ring);
  }
  for(let i=0;i<6;i++){
    const ang = (TAU * i) / 6;
    const shard = {
      type: 'grain',
      style: 'grain',
      x: x + Math.cos(ang) * rand(4, 16),
      y: y + Math.sin(ang) * rand(4, 16),
      vx: Math.cos(ang) * rand(60, 120),
      vy: Math.sin(ang) * rand(20, 80) - 40,
      rotation: rand(0, TAU),
      spin: rand(-3, 3),
      width: rand(6, 10),
      height: rand(2, 4),
      life: 0,
      maxLife: rand(280, 460),
      color: color || '#aef4ff',
      alpha: 1
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'grain');
    world.particles.push(shard);
  }
  const maxParticles = 260;
  if(world.particles.length > maxParticles){
    world.particles.splice(0, world.particles.length - maxParticles);
  }
}

function affectSticksInRadius(world, x, y, radius, owner, handler){
  if(!world || typeof handler !== 'function') return;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    if(owner && stick.isEnemy === owner.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const dx = center.x - x;
    const dy = center.y - y;
    const dist = Math.hypot(dx, dy);
    if(dist > radius) continue;
    handler(stick, dist, dx, dy);
  }
}

function triggerPollenCloud(world, x, y, opts={}){
  if(!world) return;
  const radius = opts.radius ?? 120;
  const slow = opts.slow ?? 0.6;
  const duration = opts.duration ?? 2400;
  const damage = opts.damage ?? 0;
  const owner = opts.owner || null;
  affectSticksInRadius(world, x, y, radius, owner, (stick)=>{
    if(damage > 0 && typeof stick.takeDamage === 'function'){
      stick.takeDamage(damage, 0, 0.1, owner, {
        element: opts.element || (owner && owner.element) || 'physical'
      });
    }
    if(typeof stick.applySlow === 'function'){
      stick.applySlow(slow, duration);
    }
  });
  if(!world.particles) world.particles = [];
  for(let i=0;i<8;i++){
    const puff = {
      type: 'smoke',
      style: 'smoke',
      x: x + rand(-radius * 0.2, radius * 0.2),
      y: y + rand(-radius * 0.2, radius * 0.2),
      vx: rand(-40, 40),
      vy: rand(-60, 10),
      radius: rand(18, 26),
      color: opts.color || 'rgba(190, 255, 180, 0.55)',
      life: 0,
      maxLife: rand(640, 820),
      driftAmplitude: rand(12, 22),
      driftFrequency: rand(2.4, 3.2)
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(puff, 'smoke');
    world.particles.push(puff);
  }
}

function triggerGustBurst(world, x, y, opts={}){
  if(!world) return;
  const radius = opts.radius ?? 150;
  const force = opts.force ?? 1600;
  const owner = opts.owner || null;
  affectSticksInRadius(world, x, y, radius, owner, (stick, dist, dx, dy)=>{
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    if(!pelvis) return;
    const len = Math.hypot(dx, dy) || 1;
    const falloff = clamp(1 - dist / radius, 0, 1);
    const strength = force * falloff;
    pelvis.addForce((dx / len) * strength, (dy / len) * strength * 0.4);
  });
  if(!world.particles) world.particles = [];
  const gust = {
    type: 'ring',
    style: 'ring',
    x,
    y,
    radius: radius * 0.45,
    growth: radius * 0.9,
    thickness: 2.4,
    life: 0,
    maxLife: 420,
    color: opts.color || 'rgba(170, 242, 255, 0.7)',
    alpha: 1,
    ignoreGround: true
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(gust, 'ring');
  world.particles.push(gust);
}

function triggerPressureBurst(world, x, y, opts={}){
  if(!world) return;
  const radius = opts.radius ?? 140;
  const lift = opts.lift ?? 2000;
  const damage = opts.damage ?? 0;
  const owner = opts.owner || null;
  affectSticksInRadius(world, x, y, radius, owner, (stick, dist)=>{
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    const falloff = clamp(1 - dist / radius, 0, 1);
    if(pelvis){
      pelvis.addForce(0, -lift * falloff);
    }
    if(damage > 0 && typeof stick.takeDamage === 'function'){
      stick.takeDamage(damage, 0, 0.1, owner, {
        element: opts.element || (owner && owner.element) || 'physical'
      });
    }
  });
  if(damage > 0){
    damageBreakablesInRadius(world, x, y, radius, damage, { damageKind: opts.damageKind || 'explosive', element: opts.element, explosive: true });
  }
  triggerGustBurst(world, x, y, { owner, radius: radius * 0.8, force: lift * 0.6, color: opts.color || 'rgba(140, 226, 255, 0.6)' });
}

function triggerSteamBurst(world, x, y, opts={}){
  if(!world) return;
  triggerPressureBurst(world, x, y, opts);
  const owner = opts.owner || null;
  const radius = opts.radius ?? 140;
  const slow = opts.slow ?? 0.7;
  const duration = opts.duration ?? 2000;
  affectSticksInRadius(world, x, y, radius, owner, (stick)=>{
    if(typeof stick.applySlow === 'function'){
      stick.applySlow(slow, duration);
    }
  });
}

function spawnHeatSeekerExplosionParticles(world, x, y, color, radius){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const ring = {
    type: 'ring',
    style: 'ring',
    x,
    y,
    radius: Math.max(12, radius * 0.35),
    growth: Math.max(28, radius * 0.9),
    thickness: 2.6,
    life: 0,
    maxLife: 420,
    color: color && typeof colorWithAlpha === 'function' ? colorWithAlpha(color, 0.65) : (color || 'rgba(255, 190, 120, 0.65)'),
    alpha: 1,
    ignoreGround: true
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
  world.particles.push(ring);
  for(let i=0; i<6; i++){
    const ember = {
      type: 'fire',
      style: 'fire',
      x: x + rand(-radius * 0.2, radius * 0.2),
      y: y + rand(-radius * 0.2, radius * 0.2),
      vx: rand(-220, 220),
      vy: rand(-320, -80),
      width: rand(12, 18),
      height: rand(18, 26),
      color: color || '#ffb36b',
      coreColor: 'rgba(255, 236, 210, 0.92)',
      life: 0,
      maxLife: rand(320, 520),
      ignoreGround: true
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ember, 'fire');
    world.particles.push(ember);
  }
  for(let i=0; i<5; i++){
    const smoke = {
      type: 'smoke',
      style: 'smoke',
      x: x + rand(-radius * 0.25, radius * 0.25),
      y: y + rand(-radius * 0.25, radius * 0.25),
      vx: rand(-100, 100),
      vy: rand(-120, -20),
      radius: rand(radius * 0.18, radius * 0.28),
      color: 'rgba(120, 110, 100, 0.42)',
      life: 0,
      maxLife: rand(520, 760)
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(smoke, 'smoke');
    world.particles.push(smoke);
  }
}

function triggerHeatSeekerExplosion(world, projectile, context={}){
  if(!world || !projectile) return;
  const x = projectile.x ?? 0;
  const y = projectile.y ?? 0;
  const radius = Math.max(24, context.blastRadius ?? projectile.blastRadius ?? 96);
  const baseDamage = context.blastDamage ?? projectile.blastDamage ?? projectile.dmg ?? 16;
  const owner = projectile.owner || null;
  spawnHeatSeekerExplosionParticles(world, x, y, projectile.effectColor || projectile.color, radius);
  affectSticksInRadius(world, x, y, radius, owner, (stick, dist, dx, dy)=>{
    const falloff = clamp(1 - dist / radius, 0, 1);
    if(falloff <= 0) return;
    const damage = baseDamage * (0.55 + falloff * 0.45);
    if(typeof stick.takeDamage === 'function'){
      const knockBase = (projectile.knockback !== undefined ? projectile.knockback : 160) / 160;
      const horizontal = (dx === 0 ? 0 : Math.sign(dx)) * knockBase * falloff;
      const vertical = 0.25 * falloff;
      stick.takeDamage(damage, horizontal, vertical, owner, {
        element: projectile.element || (owner && owner.element) || 'physical',
        projectile
      });
    }
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    if(pelvis){
      const len = Math.max(1, Math.hypot(dx, dy));
      const force = (context.blastForce ?? 2200) * falloff;
      pelvis.addForce((dx / len) * force, (dy / len) * force * 0.45);
    }
  });
  damageBreakablesInRadius(world, x, y, radius, baseDamage, { damageKind: 'explosive', element: projectile.element, explosive: true });
}

function triggerChronoField(world, x, y, opts={}){
  if(!world) return;
  const radius = opts.radius ?? 140;
  const slow = opts.slow ?? 0.5;
  const duration = opts.duration ?? 2800;
  const damage = opts.damage ?? 0;
  const owner = opts.owner || null;
  affectSticksInRadius(world, x, y, radius, owner, (stick)=>{
    if(damage > 0 && typeof stick.takeDamage === 'function'){
      stick.takeDamage(damage, 0, 0.1, owner, {
        element: opts.element || 'chronometric'
      });
    }
    if(typeof stick.applySlow === 'function'){
      stick.applySlow(slow, duration);
    }
  });
  spawnTemporalRipple(world, x, y, opts.color || 'rgba(255, 225, 164, 0.9)');
}

function triggerInkSplash(world, x, y, opts={}){
  if(!world) return;
  const radius = opts.radius ?? 130;
  const damage = opts.damage ?? 18;
  const slow = opts.slow ?? 0.6;
  const duration = opts.duration ?? 2400;
  const owner = opts.owner || null;
  affectSticksInRadius(world, x, y, radius, owner, (stick)=>{
    if(typeof stick.takeDamage === 'function'){
      stick.takeDamage(damage, 0, 0.1, owner, {
        element: opts.element || (owner && owner.element) || 'physical'
      });
    }
    if(typeof stick.applySlow === 'function'){
      stick.applySlow(slow, duration);
    }
  });
  if(!world.particles) world.particles = [];
  const splashRing = {
    type: 'ring',
    style: 'ring',
    x,
    y,
    radius: radius * 0.4,
    growth: radius * 0.7,
    thickness: 2.6,
    life: 0,
    maxLife: 460,
    color: opts.color || 'rgba(255, 217, 168, 0.85)',
    alpha: 1,
    ignoreGround: true
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(splashRing, 'ring');
  world.particles.push(splashRing);
  for(let i=0;i<8;i++){
    const vapor = {
      type: 'smoke',
      style: 'smoke',
      x: x + rand(-radius * 0.2, radius * 0.2),
      y: y + rand(-radius * 0.2, radius * 0.2),
      vx: rand(-70, 70),
      vy: rand(-110, 20),
      radius: rand(16, 24),
      color: opts.color || 'rgba(255, 205, 150, 0.55)',
      life: 0,
      maxLife: rand(520, 720)
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(vapor, 'smoke');
    world.particles.push(vapor);
  }
}


function resolveSniperHit(world, projectile, stick){
  const baseDamage = projectile?.dmg ?? 0;
  if(!stick){
    return { damage: baseDamage, multiplier: 1, knockMultiplier: 1 };
  }
  const bounds = approximateStickBounds(stick);
  const vx = projectile?.vx ?? 0;
  const vy = projectile?.vy ?? 0;
  const horizontal = Math.abs(vx) >= Math.abs(vy);
  const offset = horizontal ? Math.abs(projectile.y - bounds.centerY) : Math.abs(projectile.x - bounds.centerX);
  const halfExtent = horizontal ? Math.max(bounds.height * 0.5, 22) : Math.max(bounds.width * 0.5, 16);
  const normalized = halfExtent > 0 ? clamp(offset / halfExtent, 0, 1) : 1;
  const closeness = 1 - normalized;
  const multiplier = clamp(1 + closeness * 4, 1, 5);
  const damage = Math.max(1, Math.round(baseDamage * multiplier));
  spawnSniperMultiplierText(world, projectile.x, projectile.y, multiplier);
  const knockMultiplier = 0.9 + closeness * 0.4;
  return { damage, multiplier, knockMultiplier };
}

function approximateStickBounds(stick){
  const points = Array.isArray(stick?.points) ? stick.points : [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for(const point of points){
    if(!point) continue;
    if(point.isSwordTip) continue;
    if(point.x < minX) minX = point.x;
    if(point.x > maxX) maxX = point.x;
    if(point.y < minY) minY = point.y;
    if(point.y > maxY) maxY = point.y;
  }
  if(minX === Infinity){
    const center = typeof stick.center === 'function' ? stick.center() : { x: stick?.pelvis?.x ?? 0, y: stick?.pelvis?.y ?? 0 };
    const width = Math.max(24, stick?.blockWidth ?? 36);
    const height = Math.max(48, stick?.blockHeight ?? 96);
    return { width, height, centerX: center.x, centerY: center.y };
  }
  const width = Math.max(24, maxX - minX);
  const height = Math.max(48, maxY - minY);
  return { width, height, centerX: (minX + maxX) * 0.5, centerY: (minY + maxY) * 0.5 };
}

function sniperMultiplierColor(multiplier){
  const ratio = clamp((multiplier - 1) / 4, 0, 1);
  if(typeof mixHex === 'function'){
    if(ratio <= 0.5){
      return mixHex('#ffffff', '#ffe066', ratio / 0.5);
    }
    return mixHex('#ffe066', '#ff4d4d', (ratio - 0.5) / 0.5);
  }
  if(ratio <= 0.5) return '#ffe066';
  return '#ff4d4d';
}

function formatSniperMultiplier(multiplier){
  const rounded = Math.round(multiplier);
  if(Math.abs(multiplier - rounded) < 0.05){
    return `x${rounded}`;
  }
  return `x${multiplier.toFixed(1)}`;
}

function spawnSniperMultiplierText(world, x, y, multiplier){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const color = sniperMultiplierColor(multiplier);
  const fontSize = Math.round(16 + Math.min(6, (multiplier - 1) * 2.2));
  const lift = 40 + Math.max(0, (multiplier - 1) * 18);
  const vy = -(30 + Math.max(0, (multiplier - 1) * 12));
  const textParticle = {
    type: 'text',
    style: 'text',
    x,
    y,
    vx: 0,
    vy,
    lift,
    gravityScale: 0,
    text: formatSniperMultiplier(multiplier),
    color,
    strokeColor: 'rgba(12,12,18,0.62)',
    font: `600 ${fontSize}px system-ui, sans-serif`,
    life: 0,
    maxLife: 760,
    fadeStart: 0.45,
    opacity: 1
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(textParticle, 'text');
  world.particles.push(textParticle);
  const limit = 360;
  if(world.particles.length > limit){
    world.particles.splice(0, world.particles.length - limit);
  }
}

function formatLifeStealAmount(amount){
  if(!Number.isFinite(amount) || amount <= 0) return null;
  if(amount >= 10) return Math.round(amount).toString();
  if(amount >= 1) return amount.toFixed(1).replace(/\.0$/, '');
  if(amount >= 0.1) return amount.toFixed(1).replace(/\.0$/, '');
  const precise = amount.toFixed(2);
  const trimmed = precise.replace(/0+$/, '').replace(/\.$/, '');
  return trimmed || '0.1';
}

function spawnLifeStealNumber(world, stick, amount){
  const textValue = formatLifeStealAmount(amount);
  if(!world || !stick || !textValue) return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const head = stick.pointsByName?.head;
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  const headRadius = 12 * scale;
  let baseY = center.y - 52 * scale;
  if(head){
    baseY = head.y - headRadius;
  }
  const vx = typeof rand === 'function' ? rand(-20, 20) : 0;
  const healText = {
    type: 'text',
    style: 'text',
    x: center.x,
    y: baseY - 10,
    vx,
    vy: -40,
    lift: 120,
    gravityScale: 0,
    text: `+${textValue}`,
    color: '#6df28c',
    strokeColor: 'rgba(10, 32, 18, 0.55)',
    strokeWidth: 2,
    font: '600 16px system-ui, sans-serif',
    life: 0,
    maxLife: 720,
    fadeStart: 0.5,
    opacity: 1
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(healText, 'text');
  world.particles.push(healText);
  const limit = 360;
  if(world.particles.length > limit){
    world.particles.splice(0, world.particles.length - limit);
  }
}

function spawnSniperImpact(world, x, y, baseColor){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const color = baseColor || '#ffe3e3';
  const ringColor = (typeof colorWithAlpha === 'function') ? colorWithAlpha(color, 0.9) : color;
  const ring = {
    type: 'ring',
    style: 'ring',
    x,
    y,
    radius: 12,
    thickness: 2.4,
    color: ringColor,
    life: 0,
    maxLife: 360,
    ignoreGround: true,
    alpha: 1
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(ring, 'ring');
  world.particles.push(ring);
  const plume = {
    type: 'smoke',
    style: 'smoke',
    x,
    y,
    vx: rand(-40, 40),
    vy: rand(-120, -40),
    radius: rand(10, 18),
    color: 'rgba(255, 210, 210, 0.45)',
    life: 0,
    maxLife: rand(360, 520),
    gravityScale: 0
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(plume, 'smoke');
  world.particles.push(plume);
}

