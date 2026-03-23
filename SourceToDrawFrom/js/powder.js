// particles.js - unified particle simulation

const PARTICLE_CELL_SIZE = 3;
const POWDER_DEFAULT_CELL_SIZE = PARTICLE_CELL_SIZE;
const PARTICLE_MAX_UPDATE_STEPS = 6;

const PARTICLE_TYPE_EMPTY = 0;
const PARTICLE_TYPE_SAND = 1;
const PARTICLE_TYPE_WATER = 2;
const PARTICLE_TYPE_LAVA = 3;
const PARTICLE_TYPE_WOOD = 4;
const PARTICLE_TYPE_EMBER = 5;
const PARTICLE_TYPE_FIRE = 6;
const PARTICLE_TYPE_STEEL = 7;
const PARTICLE_TYPE_ICE = 8;
const PARTICLE_TYPE_GLOW_PLANT_BLUE = 9;
const PARTICLE_TYPE_GLOW_PLANT_GOLD = 10;

const POWDER_TYPE_WOOD = PARTICLE_TYPE_WOOD;
const POWDER_TYPE_FIRE = PARTICLE_TYPE_FIRE;
const POWDER_TYPE_EMBER = PARTICLE_TYPE_EMBER;
const POWDER_TYPE_STEEL = PARTICLE_TYPE_STEEL;
const POWDER_TYPE_GLOW_PLANT_BLUE = PARTICLE_TYPE_GLOW_PLANT_BLUE;
const POWDER_TYPE_GLOW_PLANT_GOLD = PARTICLE_TYPE_GLOW_PLANT_GOLD;

const PARTICLE_FLAG_SOLID = 1 << 0;
const PARTICLE_FLAG_FLUID = 1 << 1;
const PARTICLE_FLAG_GAS = 1 << 2;
const PARTICLE_FLAG_BURNABLE = 1 << 3;
const PARTICLE_FLAG_METAL = 1 << 4;

const PARTICLE_DEFS = {
  [PARTICLE_TYPE_EMPTY]: { id: 'empty', color: 'rgba(0,0,0,0)', flags: 0, density: 0 },
  [PARTICLE_TYPE_SAND]: { id: 'sand', color: '#d4c089', flags: PARTICLE_FLAG_SOLID, density: 8 },
  [PARTICLE_TYPE_WATER]: { id: 'water', color: 'rgba(74, 156, 220, 0.85)', flags: PARTICLE_FLAG_FLUID, density: 3 },
  [PARTICLE_TYPE_LAVA]: { id: 'lava', color: 'rgba(255, 116, 38, 0.92)', flags: PARTICLE_FLAG_FLUID, density: 6 },
  [PARTICLE_TYPE_WOOD]: { id: 'wood', color: '#caa16a', flags: PARTICLE_FLAG_SOLID | PARTICLE_FLAG_BURNABLE, density: 10 },
  [PARTICLE_TYPE_EMBER]: { id: 'ember', color: '#ff8f3a', flags: PARTICLE_FLAG_SOLID, density: 10 },
  [PARTICLE_TYPE_FIRE]: { id: 'fire', color: '#ff5a1f', flags: PARTICLE_FLAG_GAS, density: 1 },
  [PARTICLE_TYPE_STEEL]: { id: 'steel', color: '#9aa8b6', flags: PARTICLE_FLAG_SOLID | PARTICLE_FLAG_METAL, density: 12 },
  [PARTICLE_TYPE_ICE]: { id: 'ice', color: 'rgba(173, 224, 255, 0.9)', flags: PARTICLE_FLAG_SOLID, density: 9 },
  [PARTICLE_TYPE_GLOW_PLANT_BLUE]: {
    id: 'glowPlantBlue',
    color: '#5ad9ff',
    flags: PARTICLE_FLAG_SOLID | PARTICLE_FLAG_BURNABLE,
    density: 10
  },
  [PARTICLE_TYPE_GLOW_PLANT_GOLD]: {
    id: 'glowPlantGold',
    color: '#ffe066',
    flags: PARTICLE_FLAG_SOLID | PARTICLE_FLAG_BURNABLE,
    density: 10
  }
};

const PARTICLE_FIRE_SPREAD_CHANCE = 0.9;
const PARTICLE_FIRE_PARTICLE_INTERVAL = 0.18;
const PARTICLE_DEFAULT_BURN_DURATION = 0.8;
const PARTICLE_DEFAULT_FIRE_LIFETIME = 1.2;

function resolveParticleField(world){
  if(!world) return null;
  if(world.powder) return world.powder;
  if(world.sand && world.sand.system) return world.sand.system;
  if(world.water && world.water.system) return world.water.system;
  if(world.lava && world.lava.system) return world.lava.system;
  return null;
}

function ensureParticleSystem(world, width, height, cellSize=PARTICLE_CELL_SIZE, offsetX=0){
  const size = Math.max(1, Math.round(cellSize || PARTICLE_CELL_SIZE));
  const cols = Math.max(1, Math.ceil(width / size));
  const rows = Math.max(1, Math.ceil(height / size));
  const total = cols * rows;
  const normalizedOffsetX = offsetX || 0;
  const existing = resolveParticleField(world);
  const matchesExisting = existing
    && existing.cellSize === size
    && existing.cols === cols
    && existing.rows === rows
    && (existing.types?.length || 0) === total
    && (existing.offsetX || 0) === normalizedOffsetX;
  if(matchesExisting){
    existing._justCreated = false;
    return existing;
  }
  const baseConfig = {
    sandColor: '#d4c089',
    sandShade: '#b79a5b',
    sandHighlight: 'rgba(255, 240, 200, 0.6)',
    steelColor: '#9aa8b6',
    woodColor: '#caa16a',
    emberColor: '#ff8f3a',
    fireColor: '#ff5a1f',
    ashColor: 'rgba(60, 30, 10, 0.28)',
    waterColor: 'rgba(74, 156, 220, 0.85)',
    waterShade: 'rgba(24, 52, 92, 0.7)',
    waterHighlight: 'rgba(204, 244, 255, 0.75)',
    lavaColor: 'rgba(255, 116, 38, 0.92)',
    lavaShade: 'rgba(110, 24, 0, 0.86)',
    lavaHighlight: 'rgba(255, 216, 120, 0.78)',
    iceColor: 'rgba(173, 224, 255, 0.9)',
    glowPlantBlueColor: '#5ad9ff',
    glowPlantBlueGlowColor: 'rgba(120, 230, 255, 0.82)',
    glowPlantGoldColor: '#ffe066',
    glowPlantGoldGlowColor: 'rgba(255, 224, 140, 0.82)'
  };
  const system = {
    cellSize: size,
    cols,
    rows,
    types: new Uint8Array(total),
    burnTimers: new Float32Array(total),
    fireTimers: new Float32Array(total),
    variants: new Int8Array(total),
    stepStamp: new Uint32Array(total),
    offsetX: normalizedOffsetX,
    ticker: 0,
    fireAccumulator: 0,
    burnDuration: existing?.burnDuration ?? PARTICLE_DEFAULT_BURN_DURATION,
    fireLifetime: existing?.fireLifetime ?? PARTICLE_DEFAULT_FIRE_LIFETIME,
    heightMaps: {
      sand: new Array(cols).fill(null),
      water: new Array(cols).fill(null),
      lava: new Array(cols).fill(null)
    },
    dirtyColumns: {
      sand: new Set(),
      water: new Set(),
      lava: new Set()
    },
    config: existing?.config ? { ...baseConfig, ...existing.config } : { ...baseConfig }
  };
  system.views = createParticleViews(system);
  system._justCreated = true;
  if(world){
    attachParticleSystem(world, system);
  }
  return system;
}

function createParticleViews(system){
  const common = {
    get cellSize(){ return system.cellSize; },
    set cellSize(value){ system.cellSize = Math.max(1, Math.round(value)); },
    get cols(){ return system.cols; },
    get rows(){ return system.rows; },
    get offsetX(){ return system.offsetX; },
    set offsetX(value){ system.offsetX = value || 0; },
    get ticker(){ return system.ticker; }
  };

  function createView(type){
    const key = type;
    const heightKey = key === 'sand' ? 'sand' : key === 'water' ? 'water' : key === 'lava' ? 'lava' : null;
    return Object.assign({
      system,
      type: key,
      get cells(){ return system.types; },
      get types(){ return system.types; },
      get burnTimers(){ return system.burnTimers; },
      get fireTimers(){ return system.fireTimers; },
      get variants(){ return system.variants; },
      get heightMaps(){ return system.heightMaps; },
      get heights(){ return heightKey ? system.heightMaps[heightKey] : null; },
      get dirtyColumns(){ return heightKey ? system.dirtyColumns[heightKey] : new Set(); },
      set dirtyColumns(value){ if(heightKey) system.dirtyColumns[heightKey] = value instanceof Set ? value : new Set(); }
    }, common);
  }

  return {
    sand: createView('sand'),
    water: createView('water'),
    lava: createView('lava'),
    powder: system
  };
}

function attachParticleSystem(world, system){
  world.powder = system;
  world.sand = system.views.sand;
  world.water = system.views.water;
  world.lava = system.views.lava;
}

function particleIndex(field, col, row){
  if(!field) return -1;
  if(col < 0 || col >= field.cols) return -1;
  if(row < 0 || row >= field.rows) return -1;
  return row * field.cols + col;
}

function particleColumnForX(field, x){
  if(!field) return -1;
  const localX = x - (field.offsetX || 0);
  const col = Math.floor(localX / field.cellSize);
  if(col < 0 || col >= field.cols) return -1;
  return col;
}

function particleRowForY(field, y){
  if(!field) return -1;
  const row = Math.floor(y / field.cellSize);
  if(row < 0) return 0;
  if(row >= field.rows) return field.rows - 1;
  return row;
}

function particleTypeFromName(name){
  if(name === null || name === undefined) return PARTICLE_TYPE_EMPTY;
  const lower = String(name).toLowerCase();
  switch(lower){
    case 'sand': return PARTICLE_TYPE_SAND;
    case 'water': return PARTICLE_TYPE_WATER;
    case 'lava': return PARTICLE_TYPE_LAVA;
    case 'wood': return PARTICLE_TYPE_WOOD;
    case 'glowplant':
    case 'glowplantblue':
    case 'glow-plant':
    case 'glow-plant-blue':
    case 'glow plant':
    case 'glow plant blue':
    case 'blueglowplant':
      return PARTICLE_TYPE_GLOW_PLANT_BLUE;
    case 'glowplantgold':
    case 'glowplantyellow':
    case 'glow-plant-gold':
    case 'glow-plant-yellow':
    case 'glow plant gold':
    case 'glow plant yellow':
    case 'yellowglowplant':
      return PARTICLE_TYPE_GLOW_PLANT_GOLD;
    case 'ember':
    case 'burning': return PARTICLE_TYPE_EMBER;
    case 'fire': return PARTICLE_TYPE_FIRE;
    case 'steel':
    case 'metal': return PARTICLE_TYPE_STEEL;
    case 'ice': return PARTICLE_TYPE_ICE;
    default: return PARTICLE_TYPE_EMPTY;
  }
}

function powderTypeFromName(name){
  const resolved = particleTypeFromName(name);
  if(resolved === PARTICLE_TYPE_EMPTY) return PARTICLE_TYPE_WOOD;
  return resolved;
}

function powderTypeToName(type){
  switch(type){
    case PARTICLE_TYPE_WOOD: return 'wood';
    case PARTICLE_TYPE_FIRE: return 'fire';
    case PARTICLE_TYPE_EMBER: return 'ember';
    case PARTICLE_TYPE_STEEL: return 'steel';
    case PARTICLE_TYPE_GLOW_PLANT_BLUE: return 'glowPlantBlue';
    case PARTICLE_TYPE_GLOW_PLANT_GOLD: return 'glowPlantGold';
    default:
      return PARTICLE_DEFS[type]?.id || 'wood';
  }
}

function isGlowPlantType(type){
  return type === PARTICLE_TYPE_GLOW_PLANT_BLUE || type === PARTICLE_TYPE_GLOW_PLANT_GOLD;
}

function particleTypeFlags(type){
  return PARTICLE_DEFS[type]?.flags || 0;
}

function particleTypeIsSolid(type){
  return (particleTypeFlags(type) & PARTICLE_FLAG_SOLID) !== 0;
}

function particleTypeIsFluid(type){
  return (particleTypeFlags(type) & PARTICLE_FLAG_FLUID) !== 0;
}

function particleTypeIsGas(type){
  return (particleTypeFlags(type) & PARTICLE_FLAG_GAS) !== 0;
}

function particleDensity(type){
  return PARTICLE_DEFS[type]?.density ?? 1;
}

function particleOccupiesBox(world, left, right, top, bottom, options={}){
  const field = resolveParticleField(world);
  if(!field) return false;
  const { types, cols, rows, cellSize, offsetX } = field;
  if(!types || !types.length) return false;
  const epsilon = 1e-4;
  const startCol = Math.max(0, Math.floor((left - offsetX) / cellSize));
  const endCol = Math.min(cols - 1, Math.floor(((right - epsilon) - offsetX) / cellSize));
  if(endCol < startCol) return false;
  const startRow = Math.max(0, Math.floor(top / cellSize));
  const endRow = Math.min(rows - 1, Math.floor((bottom - epsilon) / cellSize));
  if(endRow < startRow) return false;
  const mask = options?.mask || null;
  for(let row=startRow; row<=endRow; row++){
    const rowOffset = row * cols;
    for(let col=startCol; col<=endCol; col++){
      const idx = rowOffset + col;
      const type = types[idx];
      if(type === PARTICLE_TYPE_EMPTY) continue;
      if(mask && !mask.has(type)) continue;
      if(options.solidsOnly && !particleTypeIsSolid(type)) continue;
      const cellLeft = offsetX + col * cellSize;
      const cellRight = cellLeft + cellSize;
      const cellTop = row * cellSize;
      const cellBottom = cellTop + cellSize;
      if(cellRight <= left || cellLeft >= right) continue;
      if(cellBottom <= top || cellTop >= bottom) continue;
      return true;
    }
  }
  return false;
}

function particleCellBlocked(world, field, col, row){
  if(!world || !field) return false;
  if(col < 0 || col >= field.cols) return true;
  if(row < 0) return false;
  if(row >= field.rows) return true;
  const left = field.offsetX + col * field.cellSize;
  const right = left + field.cellSize;
  const top = row * field.cellSize;
  const bottom = top + field.cellSize;
  if(terrainSolidInBox(world, left, right, top, bottom)) return true;
  return false;
}

function particleMarkColumnDirty(field, type, col){
  if(!field || col < 0 || col >= field.cols) return;
  const key = type === PARTICLE_TYPE_LAVA ? 'lava' : type === PARTICLE_TYPE_WATER ? 'water' : 'sand';
  const set = field.dirtyColumns[key];
  if(set) set.add(col);
}

function particleUpdateActiveCount(field, current, next){
  if(!field) return;
  const hasCount = typeof field.activeCount === 'number';
  if(!hasCount) field.activeCount = 0;
  if(current !== PARTICLE_TYPE_EMPTY && next === PARTICLE_TYPE_EMPTY){
    field.activeCount = Math.max(0, field.activeCount - 1);
  }else if(current === PARTICLE_TYPE_EMPTY && next !== PARTICLE_TYPE_EMPTY){
    field.activeCount += 1;
  }
}

function particleUpdateColumnOccupancy(field, idx, current, next){
  if(!field || !field.columnOccupancy) return;
  if(current === next) return;
  const cols = field.cols || 0;
  if(cols <= 0) return;
  const col = idx % cols;
  if(next === PARTICLE_TYPE_EMPTY){
    const currentValue = field.columnOccupancy[col];
    if(currentValue > 0) field.columnOccupancy[col] = currentValue - 1;
  }else if(current === PARTICLE_TYPE_EMPTY){
    field.columnOccupancy[col] += 1;
  }
}

function particleSwap(field, fromIdx, toIdx){
  const temp = field.types[toIdx];
  field.types[toIdx] = field.types[fromIdx];
  field.types[fromIdx] = temp;
  const burnTimers = field.burnTimers;
  if(burnTimers){
    const b = burnTimers[toIdx];
    burnTimers[toIdx] = burnTimers[fromIdx];
    burnTimers[fromIdx] = b;
  }
  const fireTimers = field.fireTimers;
  if(fireTimers){
    const f = fireTimers[toIdx];
    fireTimers[toIdx] = fireTimers[fromIdx];
    fireTimers[fromIdx] = f;
  }
  const variants = field.variants;
  if(variants){
    const v = variants[toIdx];
    variants[toIdx] = variants[fromIdx];
    variants[fromIdx] = v;
  }
}

function particleMove(field, fromIdx, toIdx){
  const fromType = field.types[fromIdx];
  const targetType = field.types[toIdx];
  field.types[toIdx] = fromType;
  field.types[fromIdx] = PARTICLE_TYPE_EMPTY;
  if(field.burnTimers){
    field.burnTimers[toIdx] = field.burnTimers[fromIdx];
    field.burnTimers[fromIdx] = 0;
  }
  if(field.fireTimers){
    field.fireTimers[toIdx] = field.fireTimers[fromIdx];
    field.fireTimers[fromIdx] = 0;
  }
  if(field.variants){
    field.variants[toIdx] = field.variants[fromIdx];
    field.variants[fromIdx] = 0;
  }
  if(typeof field.activeCount === 'number' && targetType !== PARTICLE_TYPE_EMPTY){
    field.activeCount = Math.max(0, field.activeCount - 1);
  }
  if(field.columnOccupancy){
    const cols = field.cols || 0;
    if(cols > 0){
      const fromCol = fromIdx % cols;
      const toCol = toIdx % cols;
      if(fromCol !== toCol){
        if(field.columnOccupancy[fromCol] > 0) field.columnOccupancy[fromCol] -= 1;
        if(targetType === PARTICLE_TYPE_EMPTY){
          field.columnOccupancy[toCol] += 1;
        }
      }else if(targetType !== PARTICLE_TYPE_EMPTY){
        if(field.columnOccupancy[fromCol] > 0) field.columnOccupancy[fromCol] -= 1;
      }
    }
  }
}

function particleSetType(field, idx, type){
  if(idx < 0) return false;
  const current = field.types[idx];
  if(current === type) return false;
  particleUpdateActiveCount(field, current, type);
  particleUpdateColumnOccupancy(field, idx, current, type);
  field.types[idx] = type;
  if(field.burnTimers) field.burnTimers[idx] = 0;
  if(field.fireTimers) field.fireTimers[idx] = 0;
  if(field.variants) field.variants[idx] = 0;
  return true;
}

function particleFillCell(field, col, row, type){
  if(!field) return false;
  const idx = particleIndex(field, col, row);
  if(idx < 0) return false;
  let resolved = type;
  if(typeof resolved === 'string') resolved = particleTypeFromName(resolved);
  if(resolved === PARTICLE_TYPE_EMPTY) return particleClearCell(field, col, row, true);
  const changed = particleSetType(field, idx, resolved);
  if(changed) particleMarkColumnDirty(field, resolved, col);
  return changed;
}

function particleClearCell(field, col, row, force=false){
  if(!field) return false;
  const idx = particleIndex(field, col, row);
  if(idx < 0) return false;
  const type = field.types[idx];
  if(type === PARTICLE_TYPE_EMPTY) return false;
  if(!force && type === PARTICLE_TYPE_STEEL) return false;
  const changed = particleSetType(field, idx, PARTICLE_TYPE_EMPTY);
  if(changed) particleMarkColumnDirty(field, type, col);
  return changed;
}

function particleApplyVariants(field, idx, type){
  if(!field || !field.variants) return;
  if(type === PARTICLE_TYPE_SAND){
    field.variants[idx] = ((Math.random() * 5) | 0) - 2;
  }else{
    field.variants[idx] = 0;
  }
}

function particleTryFall(world, field, col, row, idx){
  const belowRow = row + 1;
  if(belowRow >= field.rows) return false;
  const belowIdx = belowRow * field.cols + col;
  const belowType = field.types[belowIdx];
  if(belowType === PARTICLE_TYPE_EMPTY || particleTypeIsGas(belowType)){
    if(particleCellBlocked(world, field, col, belowRow)) return false;
    particleMove(field, idx, belowIdx);
    particleApplyVariants(field, belowIdx, field.types[belowIdx]);
    particleMarkColumnDirty(field, field.types[belowIdx], col);
    return true;
  }
  if(particleTypeIsFluid(belowType)){
    if(particleDensity(field.types[idx]) > particleDensity(belowType)){
      if(particleCellBlocked(world, field, col, belowRow)) return false;
      particleSwap(field, idx, belowIdx);
      particleApplyVariants(field, belowIdx, field.types[belowIdx]);
      particleMarkColumnDirty(field, field.types[belowIdx], col);
      return true;
    }
  }
  return false;
}

function particleTrySlide(world, field, col, row, idx){
  const belowRow = row + 1;
  const dirs = ((field.ticker + col + row) & 1) === 0 ? [-1, 1] : [1, -1];
  for(const dir of dirs){
    const targetCol = col + dir;
    if(targetCol < 0 || targetCol >= field.cols) continue;
    const targetRow = belowRow;
    if(targetRow >= field.rows) continue;
    const targetIdx = targetRow * field.cols + targetCol;
    const targetType = field.types[targetIdx];
    if(targetType !== PARTICLE_TYPE_EMPTY && !particleTypeIsFluid(targetType)) continue;
    if(particleCellBlocked(world, field, targetCol, targetRow)) continue;
    if(targetType !== PARTICLE_TYPE_EMPTY){
      if(particleDensity(field.types[idx]) <= particleDensity(targetType)) continue;
      particleSwap(field, idx, targetIdx);
    }else{
      particleMove(field, idx, targetIdx);
    }
    particleApplyVariants(field, targetIdx, field.types[targetIdx]);
    particleMarkColumnDirty(field, field.types[targetIdx], targetCol);
    return true;
  }
  return false;
}

function particleUpdateSand(world, field, col, row, idx){
  if(particleTryFall(world, field, col, row, idx)) return true;
  if(particleTrySlide(world, field, col, row, idx)) return true;
  return false;
}

function particleTryFluidFall(world, field, col, row, idx){
  const belowRow = row + 1;
  if(belowRow >= field.rows) return false;
  const belowIdx = belowRow * field.cols + col;
  const belowType = field.types[belowIdx];
  if(belowType === PARTICLE_TYPE_EMPTY || particleTypeIsGas(belowType)){
    if(particleCellBlocked(world, field, col, belowRow)) return false;
    particleMove(field, idx, belowIdx);
    particleMarkColumnDirty(field, field.types[belowIdx], col);
    return true;
  }
  if(particleTypeIsFluid(belowType) && particleDensity(field.types[idx]) > particleDensity(belowType)){
    if(particleCellBlocked(world, field, col, belowRow)) return false;
    particleSwap(field, idx, belowIdx);
    particleMarkColumnDirty(field, field.types[belowIdx], col);
    return true;
  }
  return false;
}

function particleTryFluidDiagonal(world, field, col, row, idx){
  const dirs = ((field.ticker + row + col) & 1) === 0 ? [-1, 1] : [1, -1];
  const belowRow = row + 1;
  for(const dir of dirs){
    const targetCol = col + dir;
    if(targetCol < 0 || targetCol >= field.cols) continue;
    const targetRow = belowRow;
    if(targetRow >= field.rows) continue;
    const targetIdx = targetRow * field.cols + targetCol;
    const targetType = field.types[targetIdx];
    if(targetType !== PARTICLE_TYPE_EMPTY && !particleTypeIsGas(targetType)) continue;
    if(particleCellBlocked(world, field, targetCol, targetRow)) continue;
    particleMove(field, idx, targetIdx);
    particleMarkColumnDirty(field, field.types[targetIdx], targetCol);
    return true;
  }
  return false;
}

function particleTryFluidLateral(world, field, col, row, idx){
  const dirs = ((field.ticker >> 1) & 1) === 0 ? [-1, 1] : [1, -1];
  for(const dir of dirs){
    let targetCol = col + dir;
    let steps = 0;
    while(targetCol >= 0 && targetCol < field.cols && steps < 4){
      const targetIdx = row * field.cols + targetCol;
      const targetType = field.types[targetIdx];
      if(targetType === PARTICLE_TYPE_EMPTY || particleTypeIsGas(targetType)){
        if(particleCellBlocked(world, field, targetCol, row)) break;
        particleMove(field, idx, targetIdx);
        particleMarkColumnDirty(field, field.types[targetIdx], targetCol);
        return true;
      }
      if(particleTypeIsFluid(targetType)){
        targetCol += dir;
        steps++;
        continue;
      }
      break;
    }
  }
  return false;
}

function particleUpdateFluid(world, field, col, row, idx){
  if(particleTryFluidFall(world, field, col, row, idx)) return true;
  if(particleTryFluidDiagonal(world, field, col, row, idx)) return true;
  if(particleTryFluidLateral(world, field, col, row, idx)) return true;
  return false;
}

function particleUpdateFire(world, field, col, row, idx){
  const directions = [
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [0, 1]
  ];
  for(let attempt=0; attempt<directions.length; attempt++){
    const choiceIdx = Math.floor(rand(0, directions.length));
    const [dx, dy] = directions[choiceIdx];
    const targetCol = col + dx;
    const targetRow = row + dy;
    const targetIdx = particleIndex(field, targetCol, targetRow);
    if(targetIdx < 0) continue;
    if(field.types[targetIdx] !== PARTICLE_TYPE_EMPTY && !particleTypeIsGas(field.types[targetIdx])) continue;
    if(dy > 0 && particleCellBlocked(world, field, targetCol, targetRow)) continue;
    particleMove(field, idx, targetIdx);
    return true;
  }
  return false;
}

function particleIgniteCell(field, col, row){
  const idx = particleIndex(field, col, row);
  if(idx < 0) return false;
  const type = field.types[idx];
  if(type === PARTICLE_TYPE_SAND || (particleTypeFlags(type) & PARTICLE_FLAG_BURNABLE)){
    particleSetType(field, idx, PARTICLE_TYPE_EMBER);
    field.burnTimers[idx] = field.burnDuration;
    field.fireTimers[idx] = 0;
    return true;
  }
  if(type === PARTICLE_TYPE_ICE){
    particleSetType(field, idx, PARTICLE_TYPE_WATER);
    field.burnTimers[idx] = 0;
    field.fireTimers[idx] = 0;
    particleMarkColumnDirty(field, PARTICLE_TYPE_WATER, col);
    return true;
  }
  if(type === PARTICLE_TYPE_EMBER){
    field.burnTimers[idx] = Math.max(field.burnTimers[idx], field.burnDuration * 0.5);
    return true;
  }
  return false;
}

function particleIgniteNeighbors(field, col, row){
  const neighborOffsets = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];
  for(const [dx, dy] of neighborOffsets){
    particleIgniteCell(field, col + dx, row + dy);
  }
}

function particleHandleLavaWater(field, col, row, idx){
  const type = field.types[idx];
  if(type !== PARTICLE_TYPE_WATER && type !== PARTICLE_TYPE_LAVA) return;
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  for(const [dx, dy] of dirs){
    const neighborIdx = particleIndex(field, col + dx, row + dy);
    if(neighborIdx < 0) continue;
    const neighborType = field.types[neighborIdx];
    if(type === PARTICLE_TYPE_WATER && neighborType === PARTICLE_TYPE_LAVA){
      particleSetType(field, idx, PARTICLE_TYPE_STEEL);
      particleSetType(field, neighborIdx, PARTICLE_TYPE_STEEL);
      particleMarkColumnDirty(field, PARTICLE_TYPE_STEEL, col);
      particleMarkColumnDirty(field, PARTICLE_TYPE_STEEL, col + dx);
      return;
    }
    if(type === PARTICLE_TYPE_LAVA && neighborType === PARTICLE_TYPE_WATER){
      particleSetType(field, idx, PARTICLE_TYPE_STEEL);
      particleSetType(field, neighborIdx, PARTICLE_TYPE_STEEL);
      particleMarkColumnDirty(field, PARTICLE_TYPE_STEEL, col);
      particleMarkColumnDirty(field, PARTICLE_TYPE_STEEL, col + dx);
      return;
    }
  }
}

function particleHandleFire(world, field, dt){
  const { cols, rows, types, burnTimers, fireTimers } = field;
  const burnDuration = field.burnDuration || PARTICLE_DEFAULT_BURN_DURATION;
  const fireLifetime = field.fireLifetime || PARTICLE_DEFAULT_FIRE_LIFETIME;
  field.fireAccumulator = (field.fireAccumulator || 0) + dt;
  const spawnInterval = Math.max(0.05, PARTICLE_FIRE_PARTICLE_INTERVAL);
  if(!(field.activeCount > 0)){
    if(field.fireAccumulator >= spawnInterval){
      field.fireAccumulator = 0;
    }
    return;
  }
  const columnCounts = field.columnOccupancy;
  for(let col=0; col<cols; col++){
    if(columnCounts && columnCounts[col] === 0) continue;
    for(let row=0; row<rows; row++){
      const idx = row * cols + col;
      const type = types[idx];
      if(type === PARTICLE_TYPE_EMBER){
        burnTimers[idx] = Math.max(0, (burnTimers[idx] || burnDuration) - dt);
        if(Math.random() < PARTICLE_FIRE_SPREAD_CHANCE * dt){
          particleIgniteNeighbors(field, col, row);
        }
        if(burnTimers[idx] <= 0){
          const changed = particleSetType(field, idx, PARTICLE_TYPE_FIRE);
          fireTimers[idx] = fireLifetime;
          if(changed) particleMarkColumnDirty(field, PARTICLE_TYPE_FIRE, col);
        }
      }else if(type === PARTICLE_TYPE_FIRE){
        fireTimers[idx] = Math.max(0, (fireTimers[idx] || fireLifetime) - dt);
        if(Math.random() < PARTICLE_FIRE_SPREAD_CHANCE * dt){
          particleIgniteNeighbors(field, col, row);
        }
        if(fireTimers[idx] <= 0){
          const changed = particleSetType(field, idx, PARTICLE_TYPE_EMPTY);
          fireTimers[idx] = 0;
          if(changed) particleMarkColumnDirty(field, PARTICLE_TYPE_FIRE, col);
        }
      }
    }
  }
  if(field.fireAccumulator >= spawnInterval){
    field.fireAccumulator = 0;
  }
}

function updateParticleSimulation(world, dt){
  if(!world || world.state !== 'level' || dt <= 0) return;
  const field = resolveParticleField(world);
  if(!field || !field.types?.length) return;
  if(typeof field.activeCount !== 'number') field.activeCount = 0;
  if(!(field.activeCount > 0)){
    syncAllParticleHeights(field);
    return;
  }
  const { cols, rows, types, stepStamp, columnOccupancy } = field;
  const steps = clamp(Math.ceil(dt * 60), 1, PARTICLE_MAX_UPDATE_STEPS);
  for(let step=0; step<steps; step++){
    field.ticker = (field.ticker || 0) + 1;
    const stamp = (field.ticker & 0xffffffff) >>> 0;
    for(let col=0; col<cols; col++){
      if(columnOccupancy && columnOccupancy[col] === 0) continue;
      for(let row=rows-1; row>=0; row--){
        const idx = row * cols + col;
        if(stepStamp[idx] === stamp) continue;
        const type = types[idx];
        if(type === PARTICLE_TYPE_EMPTY) continue;
        stepStamp[idx] = stamp;
        if(type === PARTICLE_TYPE_SAND){
          particleUpdateSand(world, field, col, row, idx);
        }else if(type === PARTICLE_TYPE_WATER || type === PARTICLE_TYPE_LAVA){
          particleUpdateFluid(world, field, col, row, idx);
          particleHandleLavaWater(field, col, row, idx);
        }else if(type === PARTICLE_TYPE_FIRE){
          particleUpdateFire(world, field, col, row, idx);
        }
      }
    }
    const stepDt = dt / steps;
    particleHandleFire(world, field, stepDt);
  }
  syncAllParticleHeights(field);
}

function drawParticleSimulation(world, ctx){
  const field = resolveParticleField(world);
  if(!field) return;
  const { cols, rows, cellSize, types, offsetX } = field;
  if(!types || !types.length) return;
  ctx.save();
  for(let row=0; row<rows; row++){
    for(let col=0; col<cols; col++){
      const idx = row * cols + col;
      const type = types[idx];
      if(type === PARTICLE_TYPE_EMPTY) continue;
      let color = PARTICLE_DEFS[type]?.color || '#ffffff';
      if(type === PARTICLE_TYPE_SAND){
        const v = field.variants[idx];
        if(v > 0 && typeof lightenColor === 'function'){
          color = lightenColor(field.config.sandColor, Math.min(0.12, v * 0.035));
        }else if(v < 0 && typeof darkenColor === 'function'){
          color = darkenColor(field.config.sandColor, Math.min(0.12, Math.abs(v) * 0.035));
        }else{
          color = field.config.sandColor;
        }
      }else if(type === PARTICLE_TYPE_WOOD){
        color = field.config.woodColor;
      }else if(type === PARTICLE_TYPE_GLOW_PLANT_BLUE){
        color = field.config.glowPlantBlueColor;
      }else if(type === PARTICLE_TYPE_GLOW_PLANT_GOLD){
        color = field.config.glowPlantGoldColor;
      }else if(type === PARTICLE_TYPE_EMBER){
        color = field.config.emberColor;
      }else if(type === PARTICLE_TYPE_FIRE){
        color = field.config.fireColor;
      }else if(type === PARTICLE_TYPE_STEEL){
        color = field.config.steelColor;
      }else if(type === PARTICLE_TYPE_ICE){
        color = field.config.iceColor;
      }
      ctx.fillStyle = color;
      const left = offsetX + col * cellSize;
      const top = row * cellSize;
      ctx.fillRect(left, top, cellSize, cellSize);
      if(isGlowPlantType(type)){
        const glowKey = type === PARTICLE_TYPE_GLOW_PLANT_BLUE ? 'glowPlantBlueGlowColor' : 'glowPlantGoldGlowColor';
        const glowColor = field.config[glowKey] || color;
        if(typeof colorWithAlpha === 'function'){
          const glowSize = cellSize * 2.4;
          const inset = (glowSize - cellSize) * 0.5;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = colorWithAlpha(glowColor, 0.75);
          ctx.fillRect(left - inset, top - inset, glowSize, glowSize);
          ctx.restore();
        }
      }
      if(type === PARTICLE_TYPE_EMBER && field.config.ashColor){
        ctx.fillStyle = field.config.ashColor;
        ctx.fillRect(left, top + cellSize * 0.6, cellSize, cellSize * 0.4);
      }
    }
  }
  ctx.restore();
}

function syncParticleHeights(field, key){
  if(!field) return;
  const heights = field.heightMaps[key];
  const dirty = field.dirtyColumns[key];
  if(!heights || !dirty || dirty.size === 0) return;
  const cols = field.cols;
  const rows = field.rows;
  const cellSize = field.cellSize;
  for(const col of dirty){
    if(col < 0 || col >= cols) continue;
    let topRow = null;
    for(let row=0; row<rows; row++){
      const idx = row * cols + col;
      const type = field.types[idx];
      if(key === 'sand'){
        if(type === PARTICLE_TYPE_SAND || type === PARTICLE_TYPE_WOOD || type === PARTICLE_TYPE_STEEL
          || type === PARTICLE_TYPE_GLOW_PLANT_BLUE || type === PARTICLE_TYPE_GLOW_PLANT_GOLD){
          topRow = row;
          break;
        }
      }else if(key === 'water'){
        if(type === PARTICLE_TYPE_WATER){
          topRow = row;
          break;
        }
      }else if(key === 'lava'){
        if(type === PARTICLE_TYPE_LAVA){
          topRow = row;
          break;
        }
      }
    }
    heights[col] = topRow === null ? null : topRow * cellSize;
  }
  dirty.clear();
}

function syncAllParticleHeights(field){
  syncParticleHeights(field, 'sand');
  syncParticleHeights(field, 'water');
  syncParticleHeights(field, 'lava');
}

function igniteParticlesAt(world, x, y, radius=18){
  const field = resolveParticleField(world);
  if(!field) return false;
  const colCenter = particleColumnForX(field, x);
  const rowCenter = particleRowForY(field, y);
  if(colCenter < 0 || rowCenter < 0) return false;
  const maxCells = Math.ceil(radius / (field.cellSize || PARTICLE_CELL_SIZE));
  let ignited = false;
  for(let row=rowCenter - maxCells; row<=rowCenter + maxCells; row++){
    for(let col=colCenter - maxCells; col<=colCenter + maxCells; col++){
      const idx = particleIndex(field, col, row);
      if(idx < 0) continue;
      const cellX = field.offsetX + col * field.cellSize + field.cellSize * 0.5;
      const cellY = (row + 0.5) * field.cellSize;
      const dist = Math.hypot(cellX - x, cellY - y);
      if(dist > radius) continue;
      if(particleIgniteCell(field, col, row)) ignited = true;
    }
  }
  return ignited;
}

// Compatibility helpers -----------------------------------------------------

function configureWorldParticles(world, layoutMeta, config, options={}){
  if(!world) return null;
  const defaultTile = (typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' && DEFAULT_LAYOUT_TILE_SIZE > 0)
    ? DEFAULT_LAYOUT_TILE_SIZE
    : 30;
  const tileSize = layoutMeta?.tileSize || defaultTile;
  const cols = layoutMeta?.cols || Math.max(1, Math.round((world.width || 0) / tileSize));
  const width = Math.max(1, cols * tileSize);
  const offsetX = layoutMeta?.offsetX || 0;
  const height = Math.max(1, world.groundY || world.height || 600);
  const existing = resolveParticleField(world);
  const field = ensureParticleSystem(world, width, height, config?.cellSize || PARTICLE_CELL_SIZE, offsetX);
  field.world = world;
  const defaultType = options.defaultType || 'sand';
  const shouldReset = options.reset !== false || field._justCreated;
  const clearTypes = Array.isArray(options.typesToClear) ? new Set(options.typesToClear) : null;
  if(shouldReset){
    field.types.fill(PARTICLE_TYPE_EMPTY);
    if(field.burnTimers) field.burnTimers.fill(0);
    if(field.fireTimers) field.fireTimers.fill(0);
    if(field.variants) field.variants.fill(0);
    if(field.stepStamp) field.stepStamp.fill(0);
  }else if(clearTypes && clearTypes.size){
    for(let i=0; i<field.types.length; i++){
      if(!clearTypes.has(field.types[i])) continue;
      field.types[i] = PARTICLE_TYPE_EMPTY;
      if(field.burnTimers) field.burnTimers[i] = 0;
      if(field.fireTimers) field.fireTimers[i] = 0;
      if(field.variants) field.variants[i] = 0;
    }
  }
  if(shouldReset || (clearTypes && clearTypes.size)){
    for(const key of Object.keys(field.heightMaps)){
      const heights = field.heightMaps[key];
      if(Array.isArray(heights)){
        for(let i=0; i<heights.length; i++) heights[i] = null;
      }
      const dirty = field.dirtyColumns[key];
      if(dirty && typeof dirty.clear === 'function') dirty.clear();
    }
  }
  if(existing && existing !== field && shouldReset){
    field.config = existing.config ? { ...existing.config } : field.config;
  }
  if(config?.sandColor) field.config.sandColor = config.sandColor;
  if(config?.sandShade) field.config.sandShade = config.sandShade;
  if(config?.sandHighlight) field.config.sandHighlight = config.sandHighlight;
  if(config?.waterColor) field.config.waterColor = config.waterColor;
  if(config?.waterShade) field.config.waterShade = config.waterShade;
  if(config?.waterHighlight) field.config.waterHighlight = config.waterHighlight;
  if(config?.lavaColor) field.config.lavaColor = config.lavaColor;
  if(config?.lavaShade) field.config.lavaShade = config.lavaShade;
  if(config?.lavaHighlight) field.config.lavaHighlight = config.lavaHighlight;
  if(config?.woodColor) field.config.woodColor = config.woodColor;
  if(config?.emberColor) field.config.emberColor = config.emberColor;
  if(config?.fireColor) field.config.fireColor = config.fireColor;
  if(config?.ashColor) field.config.ashColor = config.ashColor;
  if(config?.glowPlantBlueColor) field.config.glowPlantBlueColor = config.glowPlantBlueColor;
  if(config?.glowPlantBlueGlowColor) field.config.glowPlantBlueGlowColor = config.glowPlantBlueGlowColor;
  if(config?.glowPlantGoldColor) field.config.glowPlantGoldColor = config.glowPlantGoldColor;
  if(config?.glowPlantGoldGlowColor) field.config.glowPlantGoldGlowColor = config.glowPlantGoldGlowColor;
  if(Array.isArray(config?.particles)){
    for(const entry of config.particles){
      if(!entry) continue;
      const particle = parseLevelParticleSpec(entry, {
        defaultType,
        cellSize: field.cellSize,
        offsetX: field.offsetX || 0,
        columnForX: (x)=>particleColumnForX(field, x),
        rowForY: (y)=>particleRowForY(field, y)
      });
      if(!particle) continue;
      const typeName = particle.type || defaultType;
      if(particleFillCell(field, particle.col, particle.row, typeName)){
        const idx = particleIndex(field, particle.col, particle.row);
        if(idx >= 0) particleApplyVariants(field, idx, field.types[idx]);
      }
    }
  }
  syncAllParticleHeights(field);
  field._justCreated = false;
  return field;
}

function updateSandSimulation(world, dt){
  updateParticleSimulation(world, dt);
}

function updateWaterSimulation(world, dt){
  // unified simulation already handled via updateParticleSimulation
}

function updateLavaSimulation(world, dt){
  // unified simulation already handled via updateParticleSimulation
}

function updatePowderSimulation(world, dt){
  // unified simulation already handled via updateParticleSimulation
}

function drawSandSimulation(world, ctx){
  drawParticleSimulation(world, ctx);
}

function drawWaterSimulation(world, ctx){
  // handled in drawSandSimulation
}

function drawLavaSimulation(world, ctx){
  // handled in drawSandSimulation
}

function drawPowderSimulation(world, ctx){
  // handled in drawSandSimulation
}

function sandOccupiesBox(world, left, right, top, bottom){
  const mask = new Set([PARTICLE_TYPE_SAND, PARTICLE_TYPE_WOOD, PARTICLE_TYPE_STEEL]);
  return particleOccupiesBox(world, left, right, top, bottom, { mask });
}

function waterOccupiesBox(world, left, right, top, bottom){
  const mask = new Set([PARTICLE_TYPE_WATER]);
  return particleOccupiesBox(world, left, right, top, bottom, { mask });
}

function lavaOccupiesBox(world, left, right, top, bottom){
  const mask = new Set([PARTICLE_TYPE_LAVA]);
  return particleOccupiesBox(world, left, right, top, bottom, { mask });
}

function configureWorldPowder(world, layoutMeta, config){
  const existing = resolveParticleField(world);
  const field = configureWorldParticles(world, layoutMeta, config, {
    reset: !existing,
    defaultType: 'wood',
    typesToClear: [
      PARTICLE_TYPE_WOOD,
      PARTICLE_TYPE_EMBER,
      PARTICLE_TYPE_FIRE,
      PARTICLE_TYPE_GLOW_PLANT_BLUE,
      PARTICLE_TYPE_GLOW_PLANT_GOLD
    ]
  });
  if(!field) return;
  const burnDuration = Number.isFinite(config?.burnDuration)
    ? Math.max(0, config.burnDuration)
    : PARTICLE_DEFAULT_BURN_DURATION;
  const fireLifetime = Number.isFinite(config?.fireLifetime)
    ? Math.max(0, config.fireLifetime)
    : PARTICLE_DEFAULT_FIRE_LIFETIME;
  field.burnDuration = burnDuration;
  field.fireLifetime = fireLifetime;
}

function configureWorldSand(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: true,
    defaultType: 'sand'
  });
}

function configureWorldWater(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: false,
    defaultType: 'water',
    typesToClear: [PARTICLE_TYPE_WATER, PARTICLE_TYPE_ICE]
  });
}

function configureWorldLava(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: false,
    defaultType: 'lava',
    typesToClear: [PARTICLE_TYPE_LAVA]
  });
}

function sandColumnForX(field, x){
  return particleColumnForX(field.system || field, x);
}

function sandRowForY(field, y){
  return particleRowForY(field.system || field, y);
}

function waterColumnForX(field, x){
  return particleColumnForX(field.system || field, x);
}

function waterRowForY(field, y){
  return particleRowForY(field.system || field, y);
}

function lavaColumnForX(field, x){
  return particleColumnForX(field.system || field, x);
}

function lavaRowForY(field, y){
  return particleRowForY(field.system || field, y);
}

function markSandColumnDirty(field, col){
  const system = field.system || field;
  particleMarkColumnDirty(system, PARTICLE_TYPE_SAND, col);
}

function markWaterColumnDirty(field, col){
  const system = field.system || field;
  particleMarkColumnDirty(system, PARTICLE_TYPE_WATER, col);
}

function markLavaColumnDirty(field, col){
  const system = field.system || field;
  particleMarkColumnDirty(system, PARTICLE_TYPE_LAVA, col);
}

function syncSandHeights(field){
  const system = field.system || field;
  syncParticleHeights(system, 'sand');
}

function syncWaterHeights(field){
  const system = field.system || field;
  syncParticleHeights(system, 'water');
}

function syncLavaHeights(field){
  const system = field.system || field;
  syncParticleHeights(system, 'lava');
}

function fillSandCell(field, col, row, type){
  const system = field.system || field;
  const resolved = type === undefined ? PARTICLE_TYPE_SAND : type;
  const changed = particleFillCell(system, col, row, resolved);
  if(changed) particleApplyVariants(system, particleIndex(system, col, row), resolved);
  return changed;
}

function fillWaterCell(field, col, row){
  const system = field.system || field;
  return particleFillCell(system, col, row, PARTICLE_TYPE_WATER);
}

function fillLavaCell(field, col, row){
  const system = field.system || field;
  return particleFillCell(system, col, row, PARTICLE_TYPE_LAVA);
}

function clearSandCell(field, col, row, force=false){
  const system = field.system || field;
  return particleClearCell(system, col, row, force);
}

function clearWaterCell(field, col, row){
  const system = field.system || field;
  return particleClearCell(system, col, row, true);
}

function clearLavaCell(field, col, row){
  const system = field.system || field;
  return particleClearCell(system, col, row, true);
}

function sandCellAt(field, col, row){
  const system = field.system || field;
  const idx = particleIndex(system, col, row);
  if(idx < 0) return 0;
  return system.types[idx] === PARTICLE_TYPE_EMPTY ? 0 : 1;
}

function waterCellAt(field, col, row){
  const system = field.system || field;
  const idx = particleIndex(system, col, row);
  if(idx < 0) return 0;
  return system.types[idx] === PARTICLE_TYPE_WATER ? 1 : 0;
}

function lavaCellAt(field, col, row){
  const system = field.system || field;
  const idx = particleIndex(system, col, row);
  if(idx < 0) return 0;
  return system.types[idx] === PARTICLE_TYPE_LAVA ? 1 : 0;
}

function sandCellValue(field, col, row){
  return sandCellAt(field, col, row);
}

function waterCellValue(field, col, row){
  return waterCellAt(field, col, row);
}

function lavaCellValue(field, col, row){
  return lavaCellAt(field, col, row);
}

function particleSampleFluidSurface(field, width, key){
  const system = field.system || field;
  const heights = system.heightMaps[key];
  if(!heights) return null;
  if(width <= 0) return null;
  let top = null;
  let bottom = null;
  for(const height of heights){
    if(height === null || height === undefined) continue;
    const high = height;
    const low = height + system.cellSize;
    if(top === null || high < top) top = high;
    if(bottom === null || low > bottom) bottom = low;
  }
  if(top === null || bottom === null) return null;
  return { top, bottom };
}

function ignitePowderAt(world, x, y, radius, opts){
  return igniteParticlesAt(world, x, y, radius, opts);
}

