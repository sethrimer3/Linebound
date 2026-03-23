// fire.js

const FIRE_PARTICLE_INTERVAL = 0.12;
const FIRE_SMOKE_INTERVAL = 0.32;
const FIRE_DAMAGE_PER_SECOND = 8;
const FIRE_PARTICLE_DAMAGE = 6;
const FIRE_PARTICLE_COOLDOWN = 320;
const FIRE_PARTICLE_RADIUS = 18;
const FIRE_MAX_BURN_TIME = 12;
const FIRE_MAX_INTENSITY = 3;
const FIRE_SPREAD_RATE = 0.22;
const VOID_FLAME_COLOR_STOPS = ['#6c2bff', '#a35fff', '#f7d8ff']; // Outer gradient for voidfire particles.
const VOID_FLAME_CORE_STOPS = ['#caa6ff', '#a974ff', '#7d3bff']; // Core gradient for voidfire particles.

function isFireElement(element){
  return element === 'fire' || element === 'void';
}

function isTargetFlammable(target){
  if(!target) return false;
  if(target.broken || target.remove) return false;
  if(target.flammable === false) return false;
  if(target.flammable) return true;
  return target.material === 'wood';
}

function igniteFlammableProp(world, prop, opts={}){
  if(!world || !isTargetFlammable(prop)) return false;
  const intensity = clamp(Number(opts.intensity) || 1, 0.2, FIRE_MAX_INTENSITY);
  const fire = prop.fireState;
  if(fire){
    fire.intensity = clamp(fire.intensity + intensity * 0.4, 0.2, FIRE_MAX_INTENSITY);
    fire.elapsed = 0;
    return false;
  }
  prop.fireState = {
    intensity,
    elapsed: 0,
    fireTimer: Math.random() * FIRE_PARTICLE_INTERVAL,
    smokeTimer: Math.random() * FIRE_SMOKE_INTERVAL,
    damageBuffer: 0,
    spread: 0
  };
  prop.onFire = true;
  const material = typeof prop.material === 'string' ? prop.material.toLowerCase() : '';
  if(material !== 'wood'){
    spawnFireBurstForProp(world, prop, prop.fireState.intensity);
  }
  return true;
}

function igniteFlammableStructure(world, wall, opts={}){
  if(!world || !isTargetFlammable(wall)) return false;
  const intensity = clamp(Number(opts.intensity) || 1, 0.2, FIRE_MAX_INTENSITY);
  const fire = wall.fireState;
  if(fire){
    fire.intensity = clamp(fire.intensity + intensity * 0.4, 0.2, FIRE_MAX_INTENSITY);
    fire.elapsed = 0;
    return false;
  }
  wall.fireState = {
    intensity,
    elapsed: 0,
    fireTimer: Math.random() * FIRE_PARTICLE_INTERVAL,
    smokeTimer: Math.random() * FIRE_SMOKE_INTERVAL,
    damageBuffer: 0,
    spread: 0
  };
  wall.onFire = true;
  const resolvedMaterial = typeof resolveStructureMaterial === 'function'
    ? resolveStructureMaterial(wall)
    : wall?.material;
  const materialName = typeof resolvedMaterial === 'string'
    ? resolvedMaterial.toLowerCase()
    : (typeof wall.material === 'string' ? wall.material.toLowerCase() : '');
  if(materialName !== 'wood'){
    spawnFireBurstForStructure(world, wall, wall.fireState.intensity);
  }
  return true;
}

function igniteFlammablesAt(world, x, y, radius=22, opts={}){
  if(!world) return false;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  let ignited = false;
  for(const prop of decor){
    if(!isTargetFlammable(prop)) continue;
    const width = prop.width ?? 30;
    const height = prop.height ?? 24;
    const cx = prop.x ?? 0;
    const baseY = prop.baseY ?? prop.y ?? 0;
    const halfW = width * 0.5;
    const top = baseY - height;
    if(x >= cx - halfW - radius && x <= cx + halfW + radius && y >= top - radius && y <= baseY + radius){
      if(igniteFlammableProp(world, prop, opts)) ignited = true;
      else ignited = true;
    }
  }
  const breakables = typeof queryBreakablesInRegion === 'function'
    ? queryBreakablesInRegion(world, x - radius - 16, y - radius - 16, x + radius + 16, y + radius + 16)
    : (Array.isArray(world.breakables) ? world.breakables : []);
  for(const wall of breakables){
    if(!isTargetFlammable(wall)) continue;
    const left = wall.x ?? 0;
    const top = wall.y ?? 0;
    const right = left + (wall.w ?? 0);
    const bottom = top + (wall.h ?? 0);
    if(x >= left - radius && x <= right + radius && y >= top - radius && y <= bottom + radius){
      if(igniteFlammableStructure(world, wall, opts)) ignited = true;
      else ignited = true;
    }
  }
  if(typeof igniteGrassArea === 'function'){
    if(igniteGrassArea(world, x, y, radius * 1.1, opts)) ignited = true;
  }
  if(typeof ignitePowderAt === 'function'){
    if(ignitePowderAt(world, x, y, radius * 0.9, opts)) ignited = true;
  }
  return ignited;
}

function updateFireSystem(world, dt){
  if(!world || dt <= 0) return;
  updateBurningDecor(world, dt);
  updateBurningStructures(world, dt);
  applyFireEnemyAura(world);
}

function updateBurningDecor(world, dt){
  const decor = Array.isArray(world?.decor) ? world.decor : [];
  let prune = false;
  for(const prop of decor){
    if(!prop) continue;
    const shouldPrune = prop.remove || (prop.broken && !prop.persistOnBreak);
    if(shouldPrune){
      if(prop.fireState){
        extinguishFireOnTarget(prop);
      }
      prune = true;
      continue;
    }
    if(!prop.fireState) continue;
    advancePropFire(world, prop, dt);
  }
  if(prune){
    world.decor = decor.filter(prop=>prop && !prop.remove && !(prop.broken && !prop.persistOnBreak));
  }
}

function updateBurningStructures(world, dt){
  const walls = Array.isArray(world?.breakables) ? world.breakables : [];
  for(const wall of walls){
    if(!wall || wall.broken || wall.remove){
      if(wall?.fireState){
        extinguishFireOnTarget(wall);
      }
      continue;
    }
    if(!wall.fireState) continue;
    advanceStructureFire(world, wall, dt);
  }
}

function advancePropFire(world, prop, dt){
  const fire = prop.fireState;
  if(!fire) return;
  fire.elapsed += dt;
  const intensity = clamp(fire.intensity ?? 1, 0.2, FIRE_MAX_INTENSITY);
  const material = typeof prop.material === 'string' ? prop.material.toLowerCase() : '';
  const woodBurn = material === 'wood';
  fire.spread = clamp((fire.spread || 0) + FIRE_SPREAD_RATE * dt * (0.45 + intensity * 0.4), 0, 1);
  if(prop.breakable && typeof prop.health === 'number'){
    prop.health = Math.max(0, prop.health - FIRE_DAMAGE_PER_SECOND * intensity * dt);
    if(prop.health <= 0 && typeof breakDecorProp === 'function'){
      breakDecorProp(world, prop);
      extinguishFireOnTarget(prop);
      return;
    }
  }else if(fire.elapsed > FIRE_MAX_BURN_TIME){
    extinguishFireOnTarget(prop);
    return;
  }
  fire.fireTimer += dt;
  while(fire.fireTimer >= FIRE_PARTICLE_INTERVAL){
    fire.fireTimer -= FIRE_PARTICLE_INTERVAL;
    const spot = randomPointOnProp(prop, fire);
    const bias = computePropFireBias(prop, spot.x);
    const options = { horizontalBias: bias };
    if(woodBurn) options.spawnSmoke = false;
    spawnFireParticle(world, spot.x, spot.y, intensity, options);
  }
  if(!woodBurn){
    fire.smokeTimer += dt;
    if(fire.smokeTimer >= FIRE_SMOKE_INTERVAL){
      fire.smokeTimer -= FIRE_SMOKE_INTERVAL;
      const spot = randomPointAboveProp(prop, fire);
      const bias = computePropFireBias(prop, spot.x);
      spawnSmokeParticle(world, spot.x, spot.y, intensity, { horizontalBias: bias });
    }
  }
}

function advanceStructureFire(world, wall, dt){
  const fire = wall.fireState;
  if(!fire) return;
  fire.elapsed += dt;
  const intensity = clamp(fire.intensity ?? 1, 0.2, FIRE_MAX_INTENSITY);
  const resolvedMaterial = typeof resolveStructureMaterial === 'function'
    ? resolveStructureMaterial(wall)
    : wall?.material;
  const wallMaterial = typeof wall.material === 'string' ? wall.material.toLowerCase() : '';
  const resolvedName = typeof resolvedMaterial === 'string' ? resolvedMaterial.toLowerCase() : wallMaterial;
  const woodBurn = resolvedName === 'wood' || wallMaterial === 'wood';
  fire.spread = clamp((fire.spread || 0) + FIRE_SPREAD_RATE * dt * (0.35 + intensity * 0.35), 0, 1);
  if(typeof wall.health === 'number'){
    const material = typeof resolvedMaterial === 'string' ? resolvedMaterial : (wall?.material || 'dirt');
    let burnRate = FIRE_DAMAGE_PER_SECOND * 0.8;
    if(material === 'wood') burnRate = FIRE_DAMAGE_PER_SECOND * 0.35;
    else if(material === 'stone' || material === 'sandstone') burnRate = FIRE_DAMAGE_PER_SECOND * 0.2;
    wall.health = Math.max(0, wall.health - burnRate * intensity * dt);
    if(wall.health <= 0 && typeof breakBreakableStructure === 'function'){
      breakBreakableStructure(world, wall);
      extinguishFireOnTarget(wall);
      return;
    }
  }else if(fire.elapsed > FIRE_MAX_BURN_TIME){
    extinguishFireOnTarget(wall);
    return;
  }
  fire.fireTimer += dt;
  while(fire.fireTimer >= FIRE_PARTICLE_INTERVAL){
    fire.fireTimer -= FIRE_PARTICLE_INTERVAL;
    const spot = randomPointOnStructure(wall, fire);
    const bias = computeStructureFireBias(wall, spot.x);
    const options = { horizontalBias: bias };
    if(woodBurn) options.spawnSmoke = false;
    spawnFireParticle(world, spot.x, spot.y, intensity, options);
  }
  if(!woodBurn){
    fire.smokeTimer += dt;
    if(fire.smokeTimer >= FIRE_SMOKE_INTERVAL){
      fire.smokeTimer -= FIRE_SMOKE_INTERVAL;
      const spot = randomPointAboveStructure(wall, fire);
      const bias = computeStructureFireBias(wall, spot.x);
      spawnSmokeParticle(world, spot.x, spot.y, intensity, { horizontalBias: bias });
    }
  }
}

function extinguishFireOnTarget(target){
  if(!target) return;
  target.fireState = null;
  target.onFire = false;
}

function randomPointOnProp(prop, fire){
  const width = prop.width ?? 30;
  const height = prop.height ?? 24;
  const cx = prop.x ?? 0;
  const baseY = prop.baseY ?? prop.y ?? 0;
  const spread = clamp(fire?.spread ?? 0, 0, 1);
  const lateralRatio = 0.35 + spread * 0.65;
  const verticalRatio = 0.25 + spread * 0.6;
  const halfWidth = width * 0.5 * lateralRatio;
  const left = cx - halfWidth;
  const depth = Math.max(6, height * verticalRatio);
  return {
    x: left + Math.random() * halfWidth * 2,
    y: baseY - Math.random() * depth
  };
}

function randomPointAboveProp(prop, fire){
  const width = prop.width ?? 30;
  const cx = prop.x ?? 0;
  const baseY = prop.baseY ?? prop.y ?? 0;
  const spread = clamp(fire?.spread ?? 0, 0, 1);
  const lateralRatio = 0.4 + spread * 0.6;
  const halfWidth = width * 0.5 * lateralRatio;
  const left = cx - halfWidth;
  return {
    x: left + Math.random() * halfWidth * 2,
    y: baseY - (prop.height ?? 24) - rand(6, 14) * (0.6 + spread * 0.7)
  };
}

function randomPointOnStructure(wall, fire){
  const left = wall.x ?? 0;
  const top = wall.y ?? 0;
  const width = wall.w ?? 30;
  const height = wall.h ?? 60;
  const spread = clamp(fire?.spread ?? 0, 0, 1);
  const lateralRatio = 0.4 + spread * 0.6;
  const verticalRatio = 0.25 + spread * 0.65;
  const halfWidth = width * 0.5 * lateralRatio;
  const centerX = left + width * 0.5;
  const spanLeft = centerX - halfWidth;
  const depth = Math.max(8, height * verticalRatio);
  const base = top + depth;
  return {
    x: spanLeft + Math.random() * halfWidth * 2,
    y: base - Math.random() * depth
  };
}

function randomPointAboveStructure(wall, fire){
  const left = wall.x ?? 0;
  const width = wall.w ?? 30;
  const top = wall.y ?? 0;
  const spread = clamp(fire?.spread ?? 0, 0, 1);
  const lateralRatio = 0.4 + spread * 0.6;
  const halfWidth = width * 0.5 * lateralRatio;
  const centerX = left + width * 0.5;
  return {
    x: centerX - halfWidth + Math.random() * halfWidth * 2,
    y: top - rand(6, 16) * (0.6 + spread * 0.7)
  };
}

function spawnFireParticle(world, x, y, intensity=1, opts={}){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const scale = clamp(intensity, 0.6, 1.4);
  const horizontalBias = clamp(Number(opts.horizontalBias) || 0, -1, 1);
  const upwardBias = clamp(Number(opts.upwardBias) || 1, 0.4, 1.6);
  const colorStops = Array.isArray(opts.colorStops) ? opts.colorStops.slice() : null;
  const coreStops = Array.isArray(opts.coreStops) ? opts.coreStops.slice() : null;
  const owner = opts.owner || null;
  const damageEnemiesOnly = !!opts.damageEnemiesOnly;
  const damageAlliesOnly = !!opts.damageAlliesOnly;
  const ignoreOwner = !!opts.ignoreOwner;
  const spawnSmoke = opts.spawnSmoke !== undefined ? !!opts.spawnSmoke : true;
  const baseWidth = rand(10, 16) * scale;
  const baseHeight = rand(18, 30) * scale;
  const width = Number.isFinite(opts.width) ? opts.width : baseWidth;
  const height = Number.isFinite(opts.height) ? opts.height : baseHeight;
  const vx = Number.isFinite(opts.vx) ? opts.vx : rand(-26, 26) * scale + horizontalBias * rand(30, 62) * scale;
  const vy = Number.isFinite(opts.vy) ? opts.vy : rand(-140, -80) * scale * upwardBias;
  const baseLife = rand(1000, 5000);
  const maxLife = Number.isFinite(opts.maxLife) ? opts.maxLife : baseLife;
  const gravityScale = Number.isFinite(opts.gravityScale) ? opts.gravityScale : -0.18;
  const opacity = opts.opacity !== undefined ? clamp(opts.opacity, 0, 1.4) : 0.9;
  const damage = Number.isFinite(opts.damage) ? opts.damage : FIRE_PARTICLE_DAMAGE * scale;
  const damageCooldown = Number.isFinite(opts.damageCooldown) ? opts.damageCooldown : FIRE_PARTICLE_COOLDOWN;
  const damageRadius = Number.isFinite(opts.damageRadius) ? opts.damageRadius : FIRE_PARTICLE_RADIUS * scale;
  const element = opts.element || 'fire';
  const particle = {
    type: 'fire',
    style: 'fire',
    x: x + rand(-2, 2),
    y: y + rand(-4, 4),
    vx,
    vy,
    rotation: rand(0, TAU),
    spin: rand(-6, 6),
    width,
    height,
    life: 0,
    maxLife,
    opacity,
    gravityScale,
    damage,
    damageCooldown,
    damageRadius,
    element,
    colorStops,
    coreStops,
    owner,
    damageEnemiesOnly,
    damageAlliesOnly,
    ignoreOwner
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'fire');
  world.particles.push(particle);
  if(spawnSmoke && Math.random() < 0.75){
    spawnSmokeParticle(world, x, y - rand(0, 6), intensity * 0.9, { horizontalBias });
  }
  trimWorldParticles(world);
}

function spawnVoidFlameParticle(world, x, y, intensity=1, opts={}){
  const settings = { ...opts };
  if(!Array.isArray(settings.colorStops)) settings.colorStops = VOID_FLAME_COLOR_STOPS.slice();
  if(!Array.isArray(settings.coreStops)) settings.coreStops = VOID_FLAME_CORE_STOPS.slice();
  if(settings.damageEnemiesOnly === undefined) settings.damageEnemiesOnly = true;
  if(settings.element === undefined) settings.element = 'fire';
  if(settings.spawnSmoke === undefined) settings.spawnSmoke = false;
  spawnFireParticle(world, x, y, intensity, settings);
}

function spawnSmokeParticle(world, x, y, intensity=1, opts={}){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const scale = clamp(intensity, 0.5, 1.6);
  const horizontalBias = clamp(Number(opts.horizontalBias) || 0, -1, 1);
  const baseColor = opts.color || 'rgba(120, 120, 120, 0.55)';
  const baseOpacity = clamp(opts.opacity ?? 0.55, 0.05, 1);
  const vx = Number.isFinite(opts.vx) ? opts.vx : (rand(-16, 16) * scale + horizontalBias * rand(8, 22) * scale);
  const vyMin = Number.isFinite(opts.vyMin) ? opts.vyMin : -84 * scale;
  const vyMax = Number.isFinite(opts.vyMax) ? opts.vyMax : -48 * scale;
  const vy = Number.isFinite(opts.vy) ? opts.vy : rand(Math.min(vyMin, vyMax), Math.max(vyMin, vyMax));
  const maxLife = Number.isFinite(opts.maxLife) ? opts.maxLife : rand(2200, 3200);
  const gravityScale = Number.isFinite(opts.gravityScale) ? opts.gravityScale : -0.4;
  const driftAmplitude = Number.isFinite(opts.driftAmplitude) ? opts.driftAmplitude : rand(12, 22) * scale;
  const driftFrequency = Number.isFinite(opts.driftFrequency) ? opts.driftFrequency : rand(1.4, 2.6);
  const growth = Number.isFinite(opts.growth) ? opts.growth : rand(10, 18) * 0.45;
  const radius = Number.isFinite(opts.radius) ? opts.radius : rand(10, 16) * scale;
  const fadeStart = opts.fadeStart !== undefined ? clamp(opts.fadeStart, 0, 1) : undefined;
  const fadeEnd = opts.fadeEnd !== undefined ? clamp(opts.fadeEnd, 0, 1) : undefined;
  const colorStops = Array.isArray(opts.colorStops) ? opts.colorStops.slice() : null;
  const colorAlpha = Number.isFinite(opts.colorAlpha) ? clamp(opts.colorAlpha, 0, 1) : undefined;
  const smoke = {
    type: 'smoke',
    style: 'smoke',
    x: x + rand(-6, 6),
    y: y + rand(-6, 2),
    vx,
    vy,
    rotation: rand(0, TAU),
    spin: rand(-1, 1) * 0.4,
    radius,
    life: 0,
    maxLife,
    opacity: baseOpacity,
    baseOpacity,
    gravityScale,
    driftAmplitude,
    driftFrequency,
    noise: Math.random() * TAU,
    growth,
    color: baseColor,
    colorStops,
    colorAlpha,
    fadeStart,
    fadeEnd,
    ignoreGround: true
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(smoke, 'smoke');
  world.particles.push(smoke);
  trimWorldParticles(world);
}

function spawnFireBurstForProp(world, prop, intensity, fireState){
  if(!world) return;
  const bursts = Math.max(2, Math.round(3 * intensity));
  for(let i=0;i<bursts;i++){
    const fire = fireState || prop?.fireState;
    const spot = randomPointOnProp(prop, fire);
    const bias = computePropFireBias(prop, spot.x);
    spawnFireParticle(world, spot.x, spot.y, intensity * rand(0.7, 1.1), { horizontalBias: bias });
  }
}

function spawnFireBurstForStructure(world, wall, intensity, fireState){
  if(!world) return;
  const bursts = Math.max(2, Math.round(3 * intensity));
  for(let i=0;i<bursts;i++){
    const fire = fireState || wall?.fireState;
    const spot = randomPointOnStructure(wall, fire);
    const bias = computeStructureFireBias(wall, spot.x);
    spawnFireParticle(world, spot.x, spot.y, intensity * rand(0.7, 1.1), { horizontalBias: bias });
  }
}

function computePropFireBias(prop, x){
  if(!prop) return 0;
  const cx = prop.x ?? 0;
  const width = prop.width ?? 30;
  const half = Math.max(4, width * 0.5);
  return clamp((x - cx) / half, -1, 1);
}

function computeStructureFireBias(wall, x){
  if(!wall) return 0;
  const center = (wall.x ?? 0) + (wall.w ?? 0) * 0.5;
  const half = Math.max(6, (wall.w ?? 12) * 0.5);
  return clamp((x - center) / half, -1, 1);
}

function trimWorldParticles(world, cap=360){
  if(!world || !Array.isArray(world.particles)) return;
  if(world.particles.length > cap){
    world.particles.splice(0, world.particles.length - cap);
  }
}

function applyFireEnemyAura(world){
  const sticks = Array.isArray(world?.sticks) ? world.sticks : [];
  if(!sticks.length) return;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    if(!stick.isEnemy) continue;
    if(stick.element !== 'fire') continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    igniteFlammablesAt(world, center.x, center.y + 6, 34, { intensity: 0.6 });
  }
}
