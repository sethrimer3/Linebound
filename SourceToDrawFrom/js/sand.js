// sand.js - compatibility layer for unified particle simulation
const SAND_DEFAULT_CELL_SIZE = 3;

function createSandField(width, height, cellSize, offsetX, options){
  const world = { width, height };
  return ensureParticleSystem(world, width, height, cellSize, offsetX, options);
}

function configureWorldSand(world, layoutMeta, config){
  configureWorldParticles(world, layoutMeta, config, {
    reset: true,
    defaultType: 'sand'
  });
}

function sandOccupiesBox(world, left, right, top, bottom){
  return particleOccupiesBox(world, left, right, top, bottom, {
    mask: new Set([
      PARTICLE_TYPE_SAND,
      PARTICLE_TYPE_WOOD,
      PARTICLE_TYPE_STEEL,
      PARTICLE_TYPE_GLOW_PLANT_BLUE,
      PARTICLE_TYPE_GLOW_PLANT_GOLD
    ])
  });
}



function sandColumnForX(field, x){
  return particleColumnForX(field.system || field, x);
}

function sandRowForY(field, y){
  return particleRowForY(field.system || field, y);
}

function sandSurfaceHeightAt(world, x){
  if(!world) return null;
  const field = world.sand || world.powder;
  const system = field?.system || field;
  if(!system) return null;
  const heights = system.heightMaps ? system.heightMaps.sand : null;
  if(!Array.isArray(heights) || !heights.length) return null;
  const targetField = field?.system ? field : system;
  const col = sandColumnForX(targetField, x);
  if(col < 0 || col >= heights.length) return null;
  const height = heights[col];
  if(height === null || height === undefined) return null;
  return height;
}

function fillSandCell(field, col, row, type){
  return particleFillCell(field.system || field, col, row, type === undefined ? PARTICLE_TYPE_SAND : type);
}

function clearSandCell(field, col, row, force){
  return particleClearCell(field.system || field, col, row, force);
}

function sandCellValue(field, col, row){
  return sandCellAt(field, col, row);
}

function sandCellAt(field, col, row){
  const system = field.system || field;
  const idx = particleIndex(system, col, row);
  if(idx < 0) return 0;
  const type = system.types[idx];
  return (type === PARTICLE_TYPE_SAND
    || type === PARTICLE_TYPE_WOOD
    || type === PARTICLE_TYPE_STEEL
    || type === PARTICLE_TYPE_GLOW_PLANT_BLUE
    || type === PARTICLE_TYPE_GLOW_PLANT_GOLD) ? 1 : 0;
}

function markSandColumnDirty(field, col){
  particleMarkColumnDirty(field.system || field, PARTICLE_TYPE_SAND, col);
}

function syncSandHeights(field){
  syncParticleHeights(field.system || field, 'sand');
}

function drawSandSimulationImmediate(world, ctx){
  drawParticleSimulation(world, ctx);
}

function sandDisplaceWater(){
  return false;
}

function sandDisplaceLava(){
  return false;
}

function sandVariantColor(){
  return '#d4c089';
}

function sandFlowLeftFirst(){
  return Math.random() < 0.5;
}

function sandApplyBaseThickness(){
  return;
}

function sandCellIndex(field, col, row){
  return particleIndex(field.system || field, col, row);
}

