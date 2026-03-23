// water.js - compatibility layer for unified particle simulation

const WATER_DEFAULT_CELL_SIZE = 3;

function buildFluidEmitters(world, config, type){
  if(!world) return [];
  const field = type === 'water' ? world?.water : world?.lava;
  const system = field?.system || field;
  if(!system) return [];
  const entries = Array.isArray(config?.emitters) ? config.emitters : [];
  if(!entries.length) return [];
  const baseCellSize = Number.isFinite(config?.cellSize)
    ? Math.max(1, Math.round(config.cellSize))
    : (system.cellSize || PARTICLE_CELL_SIZE || 3);
  const maxCol = Math.max(0, (system.cols || 0) - 1);
  const maxRow = Math.max(0, (system.rows || 0) - 1);
  const emitters = [];
  for(const entry of entries){
    if(!entry) continue;
    const baseCol = clamp(Math.round(Number(entry.col) || 0), 0, maxCol);
    const baseRow = clamp(Math.round(Number(entry.row) || 0), 0, maxRow);
    const offsetX = Number(entry.offsetX) || 0;
    const offsetY = Number(entry.offsetY) || 0;
    const colOffset = Math.round(offsetX / baseCellSize);
    const rowOffset = Math.round(offsetY / baseCellSize);
    const col = clamp(baseCol + colOffset, 0, maxCol);
    const row = clamp(baseRow + rowOffset, 0, maxRow);
    const spreadCols = Math.max(0, Math.round(Math.abs(Number(entry.spreadX) || 0) / baseCellSize));
    const spreadRows = Math.max(0, Math.round(Math.abs(Number(entry.spreadY) || 0) / baseCellSize));
    const jitter = Math.max(0, Math.round(Math.abs(Number(entry.jitter) || 0) / baseCellSize));
    const defaultRate = type === 'lava' ? 16 : 24;
    const rate = Math.max(0, Number(entry.rate) || defaultRate);
    emitters.push({
      type: entry.type || type,
      col,
      row,
      spreadCols,
      spreadRows,
      jitter,
      rate,
      accumulator: 0,
      maxCol,
      maxRow
    });
  }
  return emitters;
}

function configureFluidEmitters(world, config, type){
  const emitters = buildFluidEmitters(world, config, type);
  if(type === 'water'){
    world.waterEmitters = emitters;
  }else{
    world.lavaEmitters = emitters;
  }
}

function updateFluidEmitters(world, dt, type){
  if(!world) return;
  const emitters = type === 'water' ? world?.waterEmitters : world?.lavaEmitters;
  if(!Array.isArray(emitters) || emitters.length === 0) return;
  const field = type === 'water' ? world?.water : world?.lava;
  const system = field?.system || field;
  if(!system) return;
  const maxCol = Math.max(0, (system.cols || 0) - 1);
  const maxRow = Math.max(0, (system.rows || 0) - 1);
  for(const emitter of emitters){
    if(!emitter || emitter.rate <= 0) continue;
    emitter.accumulator = (emitter.accumulator || 0) + emitter.rate * dt;
    const anchorCol = clamp(emitter.col ?? 0, 0, maxCol);
    const anchorRow = clamp(emitter.row ?? 0, 0, maxRow);
    const spreadCols = emitter.spreadCols || 0;
    const spreadRows = emitter.spreadRows || 0;
    const jitter = emitter.jitter || 0;
    while(emitter.accumulator >= 1){
      emitter.accumulator -= 1;
      const colOffset = spreadCols > 0 ? Math.floor(rand(-spreadCols, spreadCols + 1)) : 0;
      const rowOffset = spreadRows > 0 ? Math.floor(rand(-spreadRows, spreadRows + 1)) : 0;
      let targetCol = clamp(anchorCol + colOffset, 0, maxCol);
      let targetRow = clamp(anchorRow + rowOffset, 0, maxRow);
      if(jitter > 0){
        targetRow = clamp(targetRow + Math.floor(rand(-jitter, jitter + 1)), 0, maxRow);
      }
      particleFillCell(system, targetCol, targetRow, emitter.type || type);
    }
  }
}

function updateWaterEmitters(world, dt){
  updateFluidEmitters(world, dt, 'water');
}

function updateLavaEmitters(world, dt){
  updateFluidEmitters(world, dt, 'lava');
}

function createWaterField(width, height, cellSize, offsetX, options){
  const world = { width, height };
  return ensureParticleSystem(world, width, height, cellSize, offsetX, options);
}

function createLavaField(width, height, cellSize, offsetX, options){
  const world = { width, height };
  return ensureParticleSystem(world, width, height, cellSize, offsetX, options);
}

function configureWorldWater(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: false,
    defaultType: 'water',
    typesToClear: [PARTICLE_TYPE_WATER, PARTICLE_TYPE_ICE]
  });
  if(world){
    configureFluidEmitters(world, config, 'water');
  }
}

function configureWorldLava(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: false,
    defaultType: 'lava',
    typesToClear: [PARTICLE_TYPE_LAVA]
  });
  if(world){
    configureFluidEmitters(world, config, 'lava');
  }
}

function waterOccupiesBox(world, left, right, top, bottom){
  return particleOccupiesBox(world, left, right, top, bottom, { mask: new Set([PARTICLE_TYPE_WATER]) });
}

function lavaOccupiesBox(world, left, right, top, bottom){
  return particleOccupiesBox(world, left, right, top, bottom, { mask: new Set([PARTICLE_TYPE_LAVA]) });
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

function fillWaterCell(field, col, row){
  return particleFillCell(field.system || field, col, row, PARTICLE_TYPE_WATER);
}

function fillLavaCell(field, col, row){
  return particleFillCell(field.system || field, col, row, PARTICLE_TYPE_LAVA);
}

function clearWaterCell(field, col, row){
  return particleClearCell(field.system || field, col, row, true);
}

function clearLavaCell(field, col, row){
  return particleClearCell(field.system || field, col, row, true);
}

function markWaterColumnDirty(field, col){
  particleMarkColumnDirty(field.system || field, PARTICLE_TYPE_WATER, col);
}

function markLavaColumnDirty(field, col){
  particleMarkColumnDirty(field.system || field, PARTICLE_TYPE_LAVA, col);
}

function syncWaterHeights(field){
  syncParticleHeights(field.system || field, 'water');
}

function syncLavaHeights(field){
  syncParticleHeights(field.system || field, 'lava');
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

function waterCellValue(field, col, row){
  return waterCellAt(field, col, row);
}

function lavaCellValue(field, col, row){
  return lavaCellAt(field, col, row);
}

function waterBlockSurfaceAt(){
  return null;
}

function generateWaterBlocksFromRects(){
  return [];
}

function developerBuildFluidParticleMap(){
  return new Map();
}

function developerCaptureFluidState(){
  return null;
}

function drawWaterBlocks(){
  // Water blocks are not rendered when using the unified particle field yet.
}

function resolveWaterLavaInteractions(){
  // Unified particle simulation handles mixing implicitly for now.
}


