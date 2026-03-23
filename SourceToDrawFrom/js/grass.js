// grass.js

const GRASS_DEFAULT_CELL_SIZE = 6;
const GRASS_DEFAULT_GROWTH_RATE = 0.22; // density per second
const GRASS_DEFAULT_SPREAD_RATE = 0.18; // neighbor contribution per second
const GRASS_DEFAULT_BURN_RATE = 1.4; // density drained per second while burning/submerged
const GRASS_DEFAULT_REGROW_DELAY = 3.6; // seconds after burn before growth resumes
const GRASS_DEFAULT_WIND_SPEED = 1.6;
const GRASS_DEFAULT_WIND_STRENGTH = 8;

const GRASS_PLAYER_INFLUENCE_RADIUS = 120;
const GRASS_PLAYER_SWAY_DECAY = 6;
const GRASS_PLAYER_SWAY_STRENGTH = 10;
const GRASS_PLAYER_SWAY_MAX = 16;
const GRASS_PLAYER_TOUCH_DENSITY = 0.08;
const GRASS_PLAYER_TOUCH_TOLERANCE = 14;
const GRASS_CRITTER_RELEASE_RATE = 0.08; // chance per second when brushed
const GRASS_CRITTER_COOLDOWN_MIN = 6;
const GRASS_CRITTER_COOLDOWN_MAX = 11;

function createGrassField(width, cellSize=GRASS_DEFAULT_CELL_SIZE, offsetX=0, options={}){
  const size = Math.max(1, Math.round(cellSize || GRASS_DEFAULT_CELL_SIZE));
  const cols = Math.max(1, Math.ceil(width / size));
  const maxDensity = Math.max(0.1, Number.isFinite(options.maxDensity) ? options.maxDensity : 1);
  const field = {
    cellSize: size,
    cols,
    offsetX: offsetX || 0,
    density: new Float32Array(cols),
    burnTimers: new Float32Array(cols),
    regrowTimers: new Float32Array(cols),
    groundCache: new Float32Array(cols),
    groundCacheComputed: new Uint8Array(cols),
    groundCacheInitialized: false,
    growthRate: Math.max(0, Number.isFinite(options.growthRate) ? options.growthRate : GRASS_DEFAULT_GROWTH_RATE),
    spreadRate: Math.max(0, Number.isFinite(options.spreadRate) ? options.spreadRate : GRASS_DEFAULT_SPREAD_RATE),
    burnRate: Math.max(0, Number.isFinite(options.burnRate) ? options.burnRate : GRASS_DEFAULT_BURN_RATE),
    regrowDelay: Math.max(0, Number.isFinite(options.regrowDelay) ? options.regrowDelay : GRASS_DEFAULT_REGROW_DELAY),
    maxDensity,
    bladeHeight: Math.max(6, Number.isFinite(options.bladeHeight) ? options.bladeHeight : 26),
    baseColor: options.baseColor || '#2ba45a',
    highlightColor: options.highlightColor || '#5ee885',
    burntColor: options.burntColor || '#4c3f33',
    manualOnly: !!options.manualOnly,
    windSpeed: Number.isFinite(options.windSpeed) ? options.windSpeed : GRASS_DEFAULT_WIND_SPEED,
    windStrength: Number.isFinite(options.windStrength) ? options.windStrength : GRASS_DEFAULT_WIND_STRENGTH,
    seeded: false,
    windPhase: Math.random() * TAU,
    surfaceMask: null,
    allowedColumns: null,
    playerSway: new Float32Array(cols),
    playerSwayDecay: Number.isFinite(options.playerSwayDecay) ? options.playerSwayDecay : GRASS_PLAYER_SWAY_DECAY,
    playerSwayStrength: Number.isFinite(options.playerSwayStrength) ? options.playerSwayStrength : GRASS_PLAYER_SWAY_STRENGTH,
    playerSwayRadius: Number.isFinite(options.playerSwayRadius) ? options.playerSwayRadius : GRASS_PLAYER_INFLUENCE_RADIUS,
    playerSwayMax: Number.isFinite(options.playerSwayMax) ? options.playerSwayMax : GRASS_PLAYER_SWAY_MAX,
    playerTouchTolerance: Number.isFinite(options.playerTouchTolerance) ? options.playerTouchTolerance : GRASS_PLAYER_TOUCH_TOLERANCE,
    critterReleaseRate: Number.isFinite(options.critterReleaseRate) ? options.critterReleaseRate : GRASS_CRITTER_RELEASE_RATE,
    critterCooldownMin: Number.isFinite(options.critterCooldownMin) ? options.critterCooldownMin : GRASS_CRITTER_COOLDOWN_MIN,
    critterCooldownMax: Number.isFinite(options.critterCooldownMax) ? options.critterCooldownMax : GRASS_CRITTER_COOLDOWN_MAX
  };
  return field;
}

function grassColumnForX(field, x){
  if(!field) return -1;
  const localX = x - (field.offsetX || 0);
  const col = Math.floor(localX / field.cellSize);
  if(col < 0 || col >= field.cols) return -1;
  return col;
}

function resolveGrassColumnRange(field, entry, defaultWidthCols){
  if(!field || !entry) return null;
  const fallback = Number.isFinite(defaultWidthCols) && defaultWidthCols > 0 ? Math.round(defaultWidthCols) : 1;
  const offsetX = field.offsetX || 0;
  let startCol = 0;
  if(Number.isFinite(entry.col)){
    startCol = Math.round(entry.col);
  }else if(Number.isFinite(entry.x)){
    startCol = grassColumnForX(field, entry.x);
  }else if(Number.isFinite(entry.center)){
    startCol = grassColumnForX(field, offsetX + entry.center * field.cellSize);
  }
  if(startCol < 0) startCol = 0;
  if(startCol >= field.cols) startCol = field.cols - 1;
  const widthCols = Number.isFinite(entry.cols)
    ? Math.max(1, Math.round(entry.cols))
    : Number.isFinite(entry.width)
      ? Math.max(1, Math.round(entry.width / field.cellSize))
      : Number.isFinite(entry.radius)
        ? Math.max(1, Math.round((entry.radius * 2) / field.cellSize))
        : fallback;
  let endCol = Number.isFinite(entry.endCol)
    ? Math.round(entry.endCol)
    : startCol + widthCols - 1;
  if(endCol < startCol) endCol = startCol;
  if(endCol >= field.cols) endCol = field.cols - 1;
  return [startCol, endCol];
}

function grassColumnAllowed(field, col){
  if(!field) return false;
  if(col < 0 || col >= field.cols) return false;
  const mask = field.surfaceMask;
  if(mask && !mask[col]) return false;
  return true;
}

function applyGrassPatch(field, patch){
  if(!field || !patch) return;
  const range = resolveGrassColumnRange(field, patch, field.cols);
  if(!range) return;
  const [startCol, endCol] = range;
  const desired = clamp(
    patch.clear ? 0 : (Number.isFinite(patch.density) ? patch.density : field.maxDensity),
    0,
    field.maxDensity
  );
  const noise = Number.isFinite(patch.noise) ? Math.max(0, patch.noise) : 0;
  for(let col=startCol; col<=endCol; col++){
    if(!grassColumnAllowed(field, col)) continue;
    const t = (col - startCol) / Math.max(1, endCol - startCol);
    const taper = Number.isFinite(patch.taper)
      ? clamp(1 - Math.abs(t * 2 - 1) * patch.taper, 0, 1)
      : 1;
    const variation = noise ? (Math.random() * 2 - 1) * noise : 0;
    const value = clamp(desired * taper + variation, 0, field.maxDensity);
    field.density[col] = value;
    if(value > 0) field.seeded = true;
  }
}

function scatterGrassSeeds(field, scatter){
  if(!field || !scatter) return;
  const count = Math.max(0, Math.round(scatter.count || 0));
  const density = clamp(Number(scatter.density) || 0.4, 0, field.maxDensity);
  let allowed = field.allowedColumns;
  if(Array.isArray(allowed) && !allowed.length) return;
  const useMask = Array.isArray(allowed);
  for(let i=0; i<count; i++){
    const col = useMask
      ? allowed[Math.floor(Math.random() * allowed.length)]
      : Math.floor(Math.random() * field.cols);
    if(!grassColumnAllowed(field, col)) continue;
    field.density[col] = Math.max(field.density[col], density * (0.6 + Math.random() * 0.4));
    if(field.density[col] > 0) field.seeded = true;
  }
}

function buildGrassSurfaceMask(field, surfaces){
  if(!field) return;
  const entries = Array.isArray(surfaces) ? surfaces : [];
  if(!entries.length){
    field.surfaceMask = null;
    field.allowedColumns = null;
    return;
  }
  const mask = new Uint8Array(field.cols);
  let any = false;
  for(const entry of entries){
    const range = resolveGrassColumnRange(field, entry, 1);
    if(!range) continue;
    const [startCol, endCol] = range;
    for(let col=startCol; col<=endCol; col++){
      mask[col] = 1;
    }
    any = true;
  }
  if(!any){
    field.surfaceMask = null;
    field.allowedColumns = null;
    return;
  }
  field.surfaceMask = mask;
  const allowed = [];
  for(let col=0; col<field.cols; col++){
    if(mask[col]){
      allowed.push(col);
    }else{
      field.density[col] = 0;
      field.burnTimers[col] = 0;
      field.regrowTimers[col] = 0;
    }
  }
  field.allowedColumns = allowed;
  if(!allowed.length) field.seeded = false;
}

function applyGrassBaseDensity(field, density){
  if(!field) return;
  const value = clamp(Number(density) || 0, 0, field.maxDensity || 1);
  if(value <= 0) return;
  let seeded = false;
  for(let col=0; col<field.cols; col++){
    if(!grassColumnAllowed(field, col)) continue;
    field.density[col] = value;
    if(value > 0) seeded = true;
  }
  if(seeded) field.seeded = true;
}

function configureWorldGrass(world, layoutMeta, config){
  if(!world){
    return;
  }
  if(!config){
    world.grass = null;
    return;
  }
  const defaultTile = (typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' && DEFAULT_LAYOUT_TILE_SIZE > 0)
    ? DEFAULT_LAYOUT_TILE_SIZE
    : 30;
  const tileSize = layoutMeta?.tileSize || defaultTile;
  const cols = layoutMeta?.cols || Math.max(1, Math.round((world.width || 0) / tileSize));
  const width = Math.max(1, cols * tileSize);
  const offsetX = layoutMeta?.offsetX || 0;
  const cellSize = Number.isFinite(config.cellSize) && config.cellSize > 0 ? config.cellSize : Math.max(4, tileSize * 0.25);
  const field = createGrassField(width, cellSize, offsetX, config);
  if(Array.isArray(config.surfaces)){
    buildGrassSurfaceMask(field, config.surfaces);
  }else{
    field.surfaceMask = null;
    field.allowedColumns = null;
  }
  applyGrassBaseDensity(field, config.baseDensity);
  if(Array.isArray(config.patches)){
    for(const patch of config.patches){
      applyGrassPatch(field, patch);
    }
  }
  if(Array.isArray(config.clearings)){
    for(const clearing of config.clearings){
      applyGrassPatch(field, { ...clearing, density: 0, clear: true });
    }
  }
  if(config.scatter){
    scatterGrassSeeds(field, config.scatter);
  }
  world.grass = field;
  initializeGrassGroundCache(world, field);
}

function ensureGrassPlayerSway(field){
  if(!field) return null;
  const cols = field.cols || 0;
  if(cols <= 0) return null;
  if(!(field.playerSway instanceof Float32Array) || field.playerSway.length !== cols){
    field.playerSway = new Float32Array(cols);
  }
  return field.playerSway;
}

function applyGrassPlayerInfluence(world, field, dt){
  if(!world || !field || dt <= 0) return;
  const sway = ensureGrassPlayerSway(field);
  if(!sway) return;
  const decay = Number.isFinite(field.playerSwayDecay) ? field.playerSwayDecay : GRASS_PLAYER_SWAY_DECAY;
  if(decay > 0){
    for(let i=0; i<sway.length; i++){
      const value = sway[i];
      if(value > 0){
        sway[i] = Math.max(0, value - decay * dt);
      }else if(value < 0){
        sway[i] = Math.min(0, value + decay * dt);
      }
    }
  }
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  if(!sticks.length) return;
  const offsetX = field.offsetX || 0;
  const cellSize = field.cellSize || GRASS_DEFAULT_CELL_SIZE;
  const radius = Math.max(10, Number.isFinite(field.playerSwayRadius) ? field.playerSwayRadius : GRASS_PLAYER_INFLUENCE_RADIUS);
  const maxSway = Number.isFinite(field.playerSwayMax) ? field.playerSwayMax : GRASS_PLAYER_SWAY_MAX;
  const strength = Number.isFinite(field.playerSwayStrength) ? field.playerSwayStrength : GRASS_PLAYER_SWAY_STRENGTH;
  const tolerance = Number.isFinite(field.playerTouchTolerance) ? field.playerTouchTolerance : GRASS_PLAYER_TOUCH_TOLERANCE;
  const releaseRate = Number.isFinite(field.critterReleaseRate) ? Math.max(0, field.critterReleaseRate) : GRASS_CRITTER_RELEASE_RATE;
  const cooldownMin = Number.isFinite(field.critterCooldownMin) ? Math.max(0, field.critterCooldownMin) : GRASS_CRITTER_COOLDOWN_MIN;
  const cooldownMaxBase = Number.isFinite(field.critterCooldownMax) ? Math.max(0, field.critterCooldownMax) : GRASS_CRITTER_COOLDOWN_MAX;
  const cooldownMax = Math.max(cooldownMin, cooldownMaxBase);
  const densities = field.density || null;
  for(const stick of sticks){
    if(!stick || stick.dead || stick.isEnemy || stick.isSummoned || stick.isNpc) continue;
    const rect = typeof stick.hitboxRect === 'function' ? stick.hitboxRect() : null;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!rect || !center) continue;
    const moveVelocity = Number.isFinite(stick.moveVelocity) ? stick.moveVelocity : 0;
    let pelvisVx = 0;
    if(typeof stick.pelvis === 'function'){
      const pelvis = stick.pelvis();
      if(pelvis && Number.isFinite(pelvis.vx)) pelvisVx = pelvis.vx;
    }
    const vx = Math.abs(moveVelocity) > Math.abs(pelvisVx) ? moveVelocity : pelvisVx;
    const speedMag = Math.abs(vx);
    const dir = speedMag > 2 ? Math.sign(vx) : 0;

    const currentCooldown = Number.isFinite(stick._grassCritterCooldown) ? stick._grassCritterCooldown : 0;
    stick._grassCritterCooldown = Math.max(0, currentCooldown - dt);

    const localLeft = Math.floor((rect.left - offsetX) / cellSize) - 1;
    const localRight = Math.ceil((rect.right - offsetX) / cellSize) + 1;
    let startCol = Math.max(0, localLeft);
    let endCol = Math.min(field.cols - 1, localRight);
    if(endCol < 0 || startCol >= field.cols) continue;
    if(startCol > endCol) continue;

    let touched = false;
    let baseSum = 0;
    let baseCount = 0;
    for(let col=startCol; col<=endCol; col++){
      if(!grassColumnAllowed(field, col)) continue;
      const density = densities ? densities[col] : 0;
      if(density <= GRASS_PLAYER_TOUCH_DENSITY) continue;
      const centerX = offsetX + (col + 0.5) * cellSize;
      const baseY = field.groundCache?.[col] || groundHeightAt(world, centerX, { ignoreSand: true, surface: 'top' });
      if(!Number.isFinite(baseY)) continue;
      if(rect.bottom < baseY - tolerance) continue;
      if(rect.top > baseY + tolerance) continue;
      touched = true;
      baseSum += baseY;
      baseCount++;
      if(dir !== 0 && radius > 0){
        const dist = Math.abs(centerX - center.x);
        if(dist <= radius){
          const falloff = 1 - clamp(dist / radius, 0, 1);
          const moveScale = clamp(speedMag / Math.max(40, Math.abs(stick.moveSpeed || 160)), 0, 1);
          if(moveScale > 0 && falloff > 0){
            const swayValue = (sway[col] || 0) + dir * falloff * moveScale * strength;
            sway[col] = clamp(swayValue, -maxSway, maxSway);
          }
        }
      }
    }

    if(!touched) continue;
    if(stick._grassCritterCooldown > 0) continue;
    if(dir === 0 || speedMag < 15) continue;
    if(releaseRate <= 0) continue;
    if(Math.random() >= releaseRate * dt) continue;
    const baseY = baseCount > 0 ? baseSum / Math.max(1, baseCount) : center.y + tolerance;
    const spawnX = clamp(center.x, offsetX, offsetX + field.cols * cellSize);
    if(Math.random() < 0.5){
      if(typeof spawnGrasshopperFromGrass === 'function'){
        spawnGrasshopperFromGrass(world, spawnX, baseY);
      }
    }else if(typeof spawnGrassAmbientFirefly === 'function'){
      spawnGrassAmbientFirefly(world, spawnX, baseY);
    }
    const cooldown = rand(Math.max(0.5, cooldownMin), Math.max(Math.max(0.5, cooldownMin), cooldownMax));
    stick._grassCritterCooldown = cooldown;
  }
}

function updateGrassSimulation(world, dt){
  if(!world || world.state !== 'level' || dt <= 0) return;
  const field = world.grass;
  if(!field || !field.density?.length) return;
  applyGrassPlayerInfluence(world, field, dt);
  const { density, burnTimers, regrowTimers, cols } = field;
  const cellSize = field.cellSize || GRASS_DEFAULT_CELL_SIZE;
  const offsetX = field.offsetX || 0;
  const maxDensity = field.maxDensity || 1;
  const burnRate = field.burnRate || GRASS_DEFAULT_BURN_RATE;
  const growthRate = field.growthRate || GRASS_DEFAULT_GROWTH_RATE;
  const spreadRate = field.spreadRate || GRASS_DEFAULT_SPREAD_RATE;
  const regrowDelay = field.regrowDelay || GRASS_DEFAULT_REGROW_DELAY;
  const bladeHeight = field.bladeHeight || 20;
  field.windPhase = (field.windPhase || 0) + (field.windSpeed || GRASS_DEFAULT_WIND_SPEED) * dt;
  const sand = world.sand;
  const water = world.water;
  const lava = world.lava;
  const groundCache = field.groundCache;
  const cacheComputed = field.groundCacheComputed;
  const staticGround = !sand && !water && !lava;
  if(staticGround) initializeGrassGroundCache(world, field);
  let anySeeds = false;
  for(let col=0; col<cols; col++){
    if(!grassColumnAllowed(field, col)){
      density[col] = 0;
      burnTimers[col] = 0;
      regrowTimers[col] = 0;
      if(!staticGround){
        const ground = groundHeightAt(world, offsetX + (col + 0.5) * cellSize, { ignoreSand: true, surface: 'top' });
        if(groundCache) groundCache[col] = ground;
        if(cacheComputed) cacheComputed[col] = 1;
      }
      continue;
    }
    const centerX = offsetX + (col + 0.5) * cellSize;
    let baseGround;
    if(staticGround && field.groundCacheInitialized && groundCache && cacheComputed?.[col]){
      baseGround = groundCache[col];
    }else{
      baseGround = groundHeightAt(world, centerX, { ignoreSand: true, surface: 'top' });
      if(groundCache) groundCache[col] = baseGround;
      if(cacheComputed) cacheComputed[col] = 1;
    }
    const sandHeight = (typeof sandSurfaceHeightAt === 'function') ? sandSurfaceHeightAt(world, centerX) : null;
    const actualGround = sandHeight !== null ? Math.min(baseGround, sandHeight) : baseGround;
    if(groundCache) groundCache[col] = actualGround;
    let value = clamp(density[col] || 0, 0, maxDensity);
    let burning = burnTimers[col] || 0;
    let regrow = regrowTimers[col] || 0;
    let submerged = false;
    let scorched = false;
    if(water && typeof waterColumnForX === 'function'){
      const waterCol = waterColumnForX(water, centerX);
      if(waterCol >= 0){
        const h = water.heights?.[waterCol];
        if(h !== null && h !== undefined){
          const surface = h;
          if(surface <= actualGround - 2){
            submerged = true;
          }
        }
      }
    }
    if(lava && typeof lavaColumnForX === 'function'){
      const lavaCol = lavaColumnForX(lava, centerX);
      if(lavaCol >= 0){
        const lavaHeight = lava.heights?.[lavaCol];
        if(lavaHeight !== null && lavaHeight !== undefined){
          if(lavaHeight <= actualGround + 6){
            scorched = true;
          }
        }
      }
    }
    if(burning > 0){
      burning = Math.max(0, burning - dt);
      const drain = burnRate * dt;
      value = Math.max(0, value - drain);
      if(world && typeof spawnFireParticle === 'function' && Math.random() < 0.1 * dt){
        spawnFireParticle(world, centerX + rand(-3, 3), actualGround - bladeHeight * 0.5, clamp(value + 0.4, 0.6, 1.4));
      }
      if(world && typeof spawnSmokeParticle === 'function' && Math.random() < 0.12 * dt){
        spawnSmokeParticle(world, centerX + rand(-6, 6), actualGround - rand(6, 14), clamp(0.4 + value * 0.6, 0.4, 1));
      }
      if(burning <= 0){
        regrow = Math.max(regrow, regrowDelay);
      }
    }else if(regrow > 0){
      regrow = Math.max(0, regrow - dt);
    }else if(field.manualOnly){
      // manual grass stays at configured value until burned or submerged
    }else{
      if(submerged){
        value = Math.max(0, value - burnRate * 0.6 * dt);
      }else if(scorched){
        value = Math.max(0, value - burnRate * 1.2 * dt);
        burning = Math.max(burning, 0.5);
        regrow = Math.max(regrow, regrowDelay);
      }else{
        const neighborLeft = density[Math.max(0, col - 1)] || 0;
        const neighborRight = density[Math.min(cols - 1, col + 1)] || 0;
        const neighborInfluence = (neighborLeft + neighborRight) * 0.5;
        const growth = growthRate * dt + neighborInfluence * spreadRate * dt;
        value = clamp(value + growth, 0, maxDensity);
      }
    }
    density[col] = value;
    burnTimers[col] = burning;
    regrowTimers[col] = regrow;
    if(value > 0.02) anySeeds = true;
  }
  field.seeded = anySeeds;
}

function initializeGrassGroundCache(world, field, options={}){
  if(!world || !field) return;
  if(field.groundCacheInitialized && !options.force) return;
  const groundCache = field.groundCache;
  const cacheComputed = field.groundCacheComputed;
  if(!groundCache || !cacheComputed) return;
  const offsetX = field.offsetX || 0;
  const cellSize = field.cellSize || GRASS_DEFAULT_CELL_SIZE;
  for(let col=0; col<field.cols; col++){
    if(!options.force && cacheComputed[col]) continue;
    const centerX = offsetX + (col + 0.5) * cellSize;
    groundCache[col] = groundHeightAt(world, centerX, { ignoreSand: true, surface: 'top' });
    cacheComputed[col] = 1;
  }
  field.groundCacheInitialized = true;
}

function drawGrassField(world, ctx){
  if(!world || !ctx) return;
  const field = world.grass;
  if(!field || !field.density?.length) return;
  const { density, burnTimers, regrowTimers, cols } = field;
  const offsetX = field.offsetX || 0;
  const cellSize = field.cellSize || GRASS_DEFAULT_CELL_SIZE;
  const baseColor = field.baseColor || '#2ba45a';
  const highlightColor = field.highlightColor || lightenColor(baseColor, 0.2);
  const burntColor = field.burntColor || '#4c3f33';
  const maxDensity = field.maxDensity || 1;
  const bladeHeight = field.bladeHeight || 24;
  const windStrength = field.windStrength || GRASS_DEFAULT_WIND_STRENGTH;
  const swayMax = Number.isFinite(field.playerSwayMax) ? field.playerSwayMax : GRASS_PLAYER_SWAY_MAX;
  const playerSway = ensureGrassPlayerSway(field);
  for(let col=0; col<cols; col++){
    const value = density[col] || 0;
    if(value <= 0.01) continue;
    if(!grassColumnAllowed(field, col)) continue;
    const centerX = offsetX + (col + 0.5) * cellSize;
    const baseY = field.groundCache?.[col] || groundHeightAt(world, centerX, { surface: 'top' });
    const normalized = clamp(value / maxDensity, 0, 1);
    const height = Math.max(4, bladeHeight * (0.3 + normalized * 0.7));
    const baseSway = Math.sin((field.windPhase || 0) + col * 0.34) * windStrength * (0.3 + normalized * 0.7);
    const influence = playerSway ? clamp(playerSway[col] || 0, -swayMax * 1.5, swayMax * 1.5) : 0;
    const sway = baseSway + influence;
    const burn = burnTimers[col] || 0;
    const regrow = regrowTimers[col] || 0;
    const shade = burn > 0 || regrow > 0.1
      ? mixColors(burntColor, baseColor, clamp(normalized, 0, 1))
      : mixColors(baseColor, highlightColor, clamp(normalized * 0.8, 0, 1));
    const highlight = lightenColor(shade, 0.18);
    const baseWidth = Math.max(1, Math.round(cellSize * 0.6 * (0.6 + normalized * 0.4)));
    const segments = Math.max(3, Math.round(height / 5));
    const segmentHeight = Math.max(1, Math.round(height / segments));
    for(let seg=0; seg<segments; seg++){
      const t = (seg + 1) / segments;
      const segOffset = Math.round(sway * t);
      const widthFactor = 0.65 + (1 - seg / (segments + 1)) * 0.35;
      const segWidth = Math.max(1, Math.round(baseWidth * widthFactor));
      const segTop = Math.round(baseY - height * t);
      const segHeight = Math.max(1, Math.round(segmentHeight));
      const left = Math.round(centerX - segWidth * 0.5 + segOffset);
      ctx.fillStyle = shade;
      ctx.fillRect(left, segTop, segWidth, segHeight);
      const highlightWidth = Math.max(1, Math.round(segWidth * 0.35));
      const highlightHeight = Math.max(1, Math.round(segHeight * 0.75));
      const highlightLeft = left + Math.max(0, segWidth - highlightWidth);
      ctx.fillStyle = highlight;
      ctx.fillRect(highlightLeft, segTop, highlightWidth, highlightHeight);
    }
  }
}

function igniteGrassArea(world, x, y, radius=28, opts={}){
  if(!world) return false;
  const field = world.grass;
  if(!field) return false;
  const { density, burnTimers, regrowTimers } = field;
  const offsetX = field.offsetX || 0;
  const cellSize = field.cellSize || GRASS_DEFAULT_CELL_SIZE;
  const cols = field.cols || density.length || 0;
  if(!cols) return false;
  const intensity = clamp(Number(opts.intensity) || 1, 0.2, 3);
  const left = x - radius;
  const right = x + radius;
  let startCol = grassColumnForX(field, left);
  let endCol = grassColumnForX(field, right);
  if(startCol < 0) startCol = 0;
  if(endCol < 0) endCol = cols - 1;
  let ignited = false;
  for(let col=startCol; col<=endCol; col++){
    const centerX = offsetX + (col + 0.5) * cellSize;
    if(!grassColumnAllowed(field, col)) continue;
    if(Math.abs(centerX - x) > radius) continue;
    const baseY = field.groundCache?.[col] || groundHeightAt(world, centerX, { ignoreSand: true, surface: 'top' });
    if(y < baseY - field.bladeHeight * 0.6) continue;
    if(density[col] <= 0.01) continue;
    const duration = 0.8 + intensity * 0.6;
    burnTimers[col] = Math.max(burnTimers[col] || 0, duration);
    regrowTimers[col] = Math.max(regrowTimers[col] || 0, field.regrowDelay || GRASS_DEFAULT_REGROW_DELAY);
    density[col] = Math.max(0, density[col] - intensity * 0.2);
    if(world && typeof spawnFireParticle === 'function' && Math.random() < 0.45 * intensity){
      spawnFireParticle(world, centerX + rand(-4, 4), baseY - field.bladeHeight * 0.4, intensity);
    }
    if(world && typeof spawnSmokeParticle === 'function' && Math.random() < 0.35 * intensity){
      spawnSmokeParticle(world, centerX + rand(-6, 6), baseY - rand(8, 14), intensity * 0.7);
    }
    ignited = true;
  }
  return ignited;
}

function mixColors(colorA, colorB, ratio){
  const t = clamp(Number(ratio) || 0, 0, 1);
  if(typeof mixHex === 'function'){
    const mixed = mixHex(colorA, colorB, t);
    if(mixed) return mixed;
  }
  if(typeof parseHexColor === 'function' && typeof rgbToHex === 'function'){
    const a = parseHexColor(colorA);
    const b = parseHexColor(colorB);
    if(a && b){
      const r = Math.round(a.r + (b.r - a.r) * t);
      const g = Math.round(a.g + (b.g - a.g) * t);
      const bl = Math.round(a.b + (b.b - a.b) * t);
      return rgbToHex({ r, g, b: bl });
    }
  }
  return t < 0.5 ? colorA : colorB;
}
