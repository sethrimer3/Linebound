// devtools.js

const DEV_DEFAULT_TILE_SIZE = DEFAULT_LAYOUT_TILE_SIZE || 30;
const DEV_DOOR_WIDTH = LEVEL_DOOR_WIDTH || 18;
const DEV_DOOR_HEIGHT = LEVEL_DOOR_HEIGHT || 28;

const DEV_OBJECT_TYPES = [
  { id: 'crate', type: 'crate', label: 'Crate', defaults: { width: 34, height: 34 } },
  { id: 'platform', type: 'platform', label: 'Platform', defaults: { width: 64, offsetY: -18 } },
  { id: 'spikes', type: 'spikes', label: 'Spikes', defaults: { width: 64, height: 32, offsetY: -6 } },
  { id: 'sprout', type: 'sprout', label: 'Sprout', defaults: { height: 28 } },
  { id: 'tuft', type: 'tuft', label: 'Grass Tuft', defaults: { width: 46, height: 26 } },
  { id: 'torch', type: 'torch', label: 'Torch', defaults: { width: 26, height: 50 } },
  { id: 'glowCrystal', type: 'glowCrystal', label: 'Glow Crystal', defaults: { width: 34, height: 48 } },
  { id: 'spawner', type: 'spawner', label: 'Enemy Spawner', defaults: { width: 44, height: 68, offsetY: -12, color: '#3a2f5a', glowColor: '#9f8cff' } },
  { id: 'waterSpout', type: 'waterSpout', label: 'Water Spout', defaults: { width: 60, height: 46, offsetY: -24, flowWidth: 28, flowHeight: 72 } },
  { id: 'lavaSpout', type: 'lavaSpout', label: 'Lava Spout', defaults: { width: 54, height: 46, offsetY: -24, flowWidth: 28, flowHeight: 72 } },
  { id: 'fireflyJar', type: 'fireflyJar', label: 'Firefly Jar', defaults: { width: 26, height: 42 } },
  { id: 'hangingFireflyJar', type: 'hangingFireflyJar', label: 'Hanging Firefly Jar', defaults: { width: 26, height: 42 } },
  { id: 'chronoFlyJar', type: 'chronoFlyJar', label: 'Chrono Fly Jar', defaults: { width: 26, height: 42 } },
  { id: 'treasureChest', type: 'treasureChest', label: 'Treasure Chest', defaults: { width: 68, height: 48 } },
  { id: 'swordPedestal', type: 'swordPedestal', label: 'Sword Shrine', defaults: { width: 86, height: 100 } },
  { id: 'skillPedestal', type: 'skillPedestal', label: 'Skill Pedestal', defaults: { width: 96, height: 96 } },
  { id: 'shopkeeper', type: 'shopkeeper', label: 'Shopkeeper', defaults: { width: 88, height: 120 } },
  { id: 'lever', type: 'lever', label: 'Lever', defaults: { width: 32, height: 52 } },
  { id: 'punchingBag', type: 'punchingBag', label: 'Punching Bag', defaults: { width: 48, height: 120 } },
  { id: 'togglePlatform', type: 'toggleBlock', label: 'Toggle Platform', defaults: { width: 60, height: 40 } },
  { id: 'toggleBlock', type: 'toggleBlock', label: 'Toggle Block', defaults: { width: 30, height: 30 } },
  { id: 'crumbleWallDirt', type: 'crumbleWall', label: 'Crumble Wall (Dirt)', defaults: { material: 'dirt', offsetY: -16, width: 30, height: 30 } },
  { id: 'crumbleWallWood', type: 'crumbleWall', label: 'Crumble Wall (Wood)', defaults: { material: 'wood', offsetY: -16, flammable: true, width: 30, height: 30 } },
  { id: 'crumbleWallStone', type: 'crumbleWall', label: 'Crumble Wall (Stone)', defaults: { material: 'stone', offsetY: -16, width: 30, height: 30 } },
  { id: 'crumbleWallSandstone', type: 'crumbleWall', label: 'Crumble Wall (Sandstone)', defaults: { material: 'sandstone', offsetY: -16, width: 30, height: 30 } },
  { id: 'crumbleWallSteel', type: 'crumbleWall', label: 'Crumble Wall (Steel)', defaults: { material: 'steel', offsetY: -16, width: 30, height: 30 } },
  { id: 'weakBlockPhysical', type: 'crumbleWall', label: 'Weak Block (Physical)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'physical', material: 'dirt' } },
  { id: 'weakBlockFire', type: 'crumbleWall', label: 'Weak Block (Fire)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'fire', material: 'dirt' } },
  { id: 'weakBlockIce', type: 'crumbleWall', label: 'Weak Block (Ice)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'ice', material: 'dirt' } },
  { id: 'weakBlockLight', type: 'crumbleWall', label: 'Weak Block (Light)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'light', material: 'dirt' } },
  { id: 'weakBlockChronometric', type: 'crumbleWall', label: 'Weak Block (Chronometric)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'chronometric', material: 'dirt' } },
  { id: 'weakBlockWar', type: 'crumbleWall', label: 'Weak Block (War)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'war', material: 'dirt' } },
  { id: 'weakBlockVoid', type: 'crumbleWall', label: 'Weak Block (Void)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'void', material: 'dirt' } },
  { id: 'weakBlockNecrotic', type: 'crumbleWall', label: 'Weak Block (Necrotic)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'necrotic', material: 'dirt' } },
  { id: 'weakBlockLife', type: 'crumbleWall', label: 'Weak Block (Life)', defaults: { width: 30, height: 30, health: 80, requiredDamageKind: 'life', material: 'dirt' } },
  { id: 'chronosphere', type: 'chronosphere', label: 'Chronosphere', defaults: { radius: 150, orbRadius: 15 } },
  { id: 'auricBeacon', type: 'auricBeacon', label: 'Auric Beacon' },
  { id: 'chronoField', type: 'chronoField', label: 'Chrono Field' },
  { id: 'windLift', type: 'windLift', label: 'Wind Lift' },
  { id: 'steamVent', type: 'steamVent', label: 'Steam Vent' },
  { id: 'rainField', type: 'rainField', label: 'Rain Field' },
  { id: 'starField', type: 'starField', label: 'Star Field' },
  { id: 'foregroundShadow', type: 'foregroundShadow', label: 'Foreground Shadow' },
  { id: 'foregroundSunRays', type: 'foregroundSunRays', label: 'Foreground Sun Rays' },
  { id: 'voidPortal', type: 'voidPortal', label: 'Void Portal', defaults: { width: 72, height: 128 } },
  { id: 'voidSymbol', type: 'voidSymbol', label: 'Void Symbol', defaults: { width: 84, height: 84 } },
  { id: 'raft', type: 'raft', label: 'Wooden Raft', defaults: { width: 180, height: 40 } },
  { id: 'boat', type: 'boat', label: 'Boat', defaults: { width: 150, height: 54 } },
  { id: 'worldTreeBranch', type: 'worldTreeBranch', label: 'World Tree Branch', defaults: { width: 720, height: 280, offsetY: -120 } },
  { id: 'canopyLeaves', type: 'canopyLeaves', label: 'Canopy Leaves', defaults: { width: 540, height: 220, offsetY: -220 } },
  { id: 'physicsBox', type: 'physicsBox', label: 'Physics Box', defaults: { width: 50, height: 50 } },
  { id: 'softHexagon', type: 'softHexagon', label: 'Soft Body', defaults: { radius: 60 } }
];

const DEV_TERRAIN_BLOCK_STYLES = [
  { id: 'meadow', label: 'Meadow' },
  { id: 'stage1Meadow', label: 'Stage 1 Meadow' },
  { id: 'world0', label: 'World 0 Blocks' },
  { id: 'world1', label: 'World 1 Blocks' },
  { id: 'world2', label: 'World 2 Blocks' },
  { id: 'world3', label: 'World 3 Blocks' },
  { id: 'world4', label: 'World 4 Blocks' },
  { id: 'world5', label: 'World 5 Blocks' },
  { id: 'world6', label: 'World 6 Blocks' },
  { id: 'world7', label: 'World 7 Blocks' },
  { id: 'world8', label: 'World 8 Blocks' },
  { id: 'world9', label: 'World 9 Blocks' },
  { id: 'world9_alt', label: 'World 9 Cosmic Blocks' },
  { id: 'voidDojo', label: 'Void Dojo Blocks' },
  { id: 'frost', label: 'Frost Blocks' },
  { id: 'cinder', label: 'Cinder Blocks' },
  { id: 'sandstone', label: 'Sandstone Blocks' },
  { id: 'weakBlock:physical', label: 'Weak Block · Physical', weakBlock: 'weakBlockPhysical' },
  { id: 'weakBlock:fire', label: 'Weak Block · Fire', weakBlock: 'weakBlockFire' },
  { id: 'weakBlock:ice', label: 'Weak Block · Ice', weakBlock: 'weakBlockIce' },
  { id: 'weakBlock:light', label: 'Weak Block · Light', weakBlock: 'weakBlockLight' },
  { id: 'weakBlock:chronometric', label: 'Weak Block · Chronometric', weakBlock: 'weakBlockChronometric' },
  { id: 'weakBlock:war', label: 'Weak Block · War', weakBlock: 'weakBlockWar' },
  { id: 'weakBlock:void', label: 'Weak Block · Void', weakBlock: 'weakBlockVoid' },
  { id: 'weakBlock:necrotic', label: 'Weak Block · Necrotic', weakBlock: 'weakBlockNecrotic' },
  { id: 'weakBlock:life', label: 'Weak Block · Life', weakBlock: 'weakBlockLife' }
];

const DEV_ENEMY_TYPES = buildDevEnemyTypes();
const DEV_WEAPON_TYPES = buildDevWeaponTypes();
const DEV_ITEM_TYPES = buildDevItemTypes();
const DEV_DOOR_TYPES = [
  { id: 'entry', label: 'Entry Door' },
  { id: 'exit', label: 'Exit Door' }
];

const DEV_TOOL_LABELS = {
  terrain: 'Terrain',
  objects: 'Objects',
  enemies: 'Enemies',
  weapons: 'Weapons',
  doors: 'Doors',
  sand: 'Sand',
  powder: 'Powder',
  water: 'Water',
  lava: 'Lava',
  grass: 'Grass'
};

const DEV_PARTICLE_BRUSH_STYLES = {
  sand: { fill: 'rgba(244, 214, 146, 0.28)', stroke: '#dcbc6d' },
  powder: { fill: 'rgba(202, 161, 106, 0.26)', stroke: '#b78a53' },
  water: { fill: 'rgba(120, 188, 255, 0.25)', stroke: '#4f9adf' },
  ice: { fill: 'rgba(180, 220, 255, 0.22)', stroke: '#8fc4ff' },
  lava: { fill: 'rgba(255, 140, 80, 0.25)', stroke: '#ff783c' },
  steel: { fill: 'rgba(154, 168, 182, 0.3)', stroke: '#7c8894' }
};

const DEV_DECORATION_FALLBACKS = [
  { id: 'grass', label: 'Grass', tool: 'grass' }
];

function defaultSandScene(){
  return {
    cellSize: 3,
    baseThickness: 24,
    color: '#d4c089',
    shade: '#b79a5b',
    highlight: 'rgba(255, 240, 200, 0.55)',
    hills: [],
    particles: [],
    manualOnly: true
  };
}

function defaultGrassScene(){
  const base = {
    cellSize: 6,
    baseDensity: 0.45,
    maxDensity: 1,
    growthRate: 0.24,
    spreadRate: 0.18,
    burnRate: 1.4,
    regrowDelay: 4,
    bladeHeight: 28,
    baseColor: '#2ba45a',
    highlightColor: '#5ee885',
    burntColor: '#4c3f33',
    windStrength: 8,
    windSpeed: 1.6,
    surfaces: [],
    patches: [],
    clearings: [],
    scatter: null
  };
  return typeof applyDecorationDefinition === 'function'
    ? applyDecorationDefinition(base, 'grass')
    : base;
}

function defaultPowderScene(){
  return {
    cellSize: 3,
    woodColor: '#caa16a',
    emberColor: '#ff8f3a',
    fireColor: '#ff5a1f',
    ashColor: 'rgba(60, 30, 10, 0.28)',
    steelColor: '#9aa8b6',
    glowPlantBlueColor: '#5ad9ff',
    glowPlantBlueGlowColor: 'rgba(120, 230, 255, 0.82)',
    glowPlantGoldColor: '#ffe066',
    glowPlantGoldGlowColor: 'rgba(255, 224, 140, 0.82)',
    burnDuration: 0.8,
    fireLifetime: 1.2,
    particles: []
  };
}

function defaultWaterScene(){
  return {
    cellSize: 3,
    color: 'rgba(88, 188, 242, 0.85)',
    shade: 'rgba(18, 52, 90, 0.78)',
    highlight: 'rgba(220, 252, 255, 0.7)',
    foamColor: 'rgba(255, 255, 255, 0.62)',
    emitters: [],
    particles: []
  };
}

function defaultLavaScene(){
  const defaults = (typeof FLUID_DEFAULTS === 'object' && FLUID_DEFAULTS)
    ? FLUID_DEFAULTS.lava || {}
    : {};
  return {
    cellSize: 3,
    color: defaults.color || 'rgba(255, 116, 38, 0.92)',
    shade: defaults.shade || 'rgba(110, 24, 0, 0.86)',
    highlight: defaults.highlight || 'rgba(255, 216, 120, 0.78)',
    foamColor: defaults.foamColor || 'rgba(255, 170, 80, 0.36)',
    emitters: [],
    particles: []
  };
}

function developerFluidKeys(type){
  if(type === 'sand') return { configKey: 'sandConfig', mapKey: 'sandParticleMap', fieldKey: 'sand', markDirty: markDeveloperSandDirty };
  if(type === 'water') return { configKey: 'waterConfig', mapKey: 'waterParticleMap', fieldKey: 'water', markDirty: markDeveloperWaterDirty };
  if(type === 'lava') return { configKey: 'lavaConfig', mapKey: 'lavaParticleMap', fieldKey: 'lava', markDirty: markDeveloperLavaDirty };
  if(type === 'powder') return { configKey: 'powderConfig', mapKey: 'powderParticleMap', fieldKey: 'powder', markDirty: markDeveloperPowderDirty };
  return null;
}

function devEscapeAttribute(value){
  if(value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildDevEnemyTypes(){
  if(typeof ENEMY_ARCHETYPES !== 'object' || !ENEMY_ARCHETYPES){
    return [
      { id: 'grunt', label: 'Grunt' },
      { id: 'rogue', label: 'Rogue' },
      { id: 'archer', label: 'Archer' },
      { id: 'mage', label: 'Mage' }
    ];
  }
  return Object.keys(ENEMY_ARCHETYPES).map(id=>({ id, label: devFormatLabel(id) }));
}

function buildDevWeaponTypes(){
  let ids = [];
  if(typeof playerWeaponIds === 'function'){
    ids = playerWeaponIds();
  }else if(typeof WEAPONS === 'object' && WEAPONS){
    ids = Object.keys(WEAPONS).filter(id=>!WEAPONS[id]?.enemyOnly);
  }
  if(!Array.isArray(ids) || !ids.length){
    ids = ['sword'];
  }
  return ids.map(id=>({ id, label: WEAPONS?.[id]?.name || devFormatLabel(id) }));
}

function buildDevItemTypes(){
  const entries = [{ value: 'none', label: 'None', type: 'none' }, { value: 'potion', label: 'Potion', type: 'potion' }];
  if(typeof OFFHAND_ITEMS === 'object' && OFFHAND_ITEMS){
    const ids = Object.keys(OFFHAND_ITEMS).sort();
    for(const id of ids){
      const info = OFFHAND_ITEMS[id] || {};
      const label = info.name ? `${info.name} (Offhand)` : `${devFormatLabel(id)} (Offhand)`;
      entries.push({ value: `offhand:${id}`, label, type: 'offhand', itemId: id });
    }
  }
  if(typeof ARMOR_ITEMS === 'object' && ARMOR_ITEMS){
    const ids = Object.keys(ARMOR_ITEMS).sort();
    for(const id of ids){
      const info = ARMOR_ITEMS[id] || {};
      const label = info.name ? `${info.name} (Armor)` : `${devFormatLabel(id)} (Armor)`;
      entries.push({ value: `armor:${id}`, label, type: 'armor', itemId: id });
    }
  }
  return entries;
}

function devFormatLabel(id){
  if(!id || typeof id !== 'string') return '';
  const spaced = id.replace(/([A-Z])/g, ' $1');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function developerEnsureLootObject(obj){
  if(!obj || typeof obj !== 'object') return null;
  if(!obj.loot || typeof obj.loot !== 'object') obj.loot = {};
  return obj.loot;
}

function developerEnsurePotionLoot(obj){
  const loot = developerEnsureLootObject(obj);
  if(!loot) return null;
  if(!loot.item || typeof loot.item !== 'object' || (loot.item.type !== 'potion' && loot.item.kind !== 'potion')){
    loot.item = { type: 'potion', heal: 30 };
  }
  if(!Number.isFinite(loot.item.heal)) loot.item.heal = 30;
  loot.item.type = 'potion';
  return loot.item;
}

function developerSetObjectPath(target, segments, value){
  if(!target || !Array.isArray(segments) || !segments.length) return;
  let ref = target;
  for(let i = 0; i < segments.length - 1; i++){
    const key = segments[i];
    if(Array.isArray(ref)){
      const idx = Number(key);
      if(Number.isNaN(idx) || idx < 0 || idx >= ref.length) return;
      if(ref[idx] === undefined || ref[idx] === null) ref[idx] = {};
      ref = ref[idx];
    }else{
      if(!(key in ref) || ref[key] === null){
        ref[key] = {};
      }
      ref = ref[key];
    }
    if(ref === undefined || ref === null) return;
  }
  const finalKey = segments[segments.length - 1];
  if(Array.isArray(ref)){
    const idx = Number(finalKey);
    if(Number.isNaN(idx) || idx < 0 || idx >= ref.length) return;
    ref[idx] = value;
  }else{
    ref[finalKey] = value;
  }
}

function developerDeleteObjectPath(target, segments){
  if(!target || !Array.isArray(segments) || !segments.length) return;
  let ref = target;
  for(let i = 0; i < segments.length - 1; i++){
    const key = segments[i];
    if(Array.isArray(ref)){
      const idx = Number(key);
      if(Number.isNaN(idx) || idx < 0 || idx >= ref.length) return;
      ref = ref[idx];
    }else{
      if(!(key in ref)) return;
      ref = ref[key];
    }
    if(ref === undefined || ref === null) return;
  }
  const finalKey = segments[segments.length - 1];
  if(Array.isArray(ref)){
    const idx = Number(finalKey);
    if(Number.isNaN(idx) || idx < 0 || idx >= ref.length) return;
    ref[idx] = null;
  }else{
    delete ref[finalKey];
  }
}

function developerCloneValue(value){
  if(Array.isArray(value)) return value.map(developerCloneValue);
  if(value && typeof value === 'object'){
    const clone = {};
    for(const key in value){
      clone[key] = developerCloneValue(value[key]);
    }
    return clone;
  }
  return value;
}

function developerObjectDefaults(entry){
  if(!entry || !entry.defaults) return null;
  const clone = {};
  for(const key in entry.defaults){
    clone[key] = developerCloneValue(entry.defaults[key]);
  }
  return clone;
}

function developerFindObjectTypeEntry(id){
  if(!id){
    return DEV_OBJECT_TYPES[0] || null;
  }
  const byId = DEV_OBJECT_TYPES.find(opt=>opt.id === id);
  if(byId) return byId;
  return DEV_OBJECT_TYPES.find(opt=>opt.type === id) || null;
}

function developerObjectTypeLabel(id){
  const entry = developerFindObjectTypeEntry(id);
  if(entry) return entry.label;
  return devFormatLabel(id) || 'Object';
}

function developerWeaponSelectOptions(selectedId){
  const value = (selectedId || '').toString();
  let html = `<option value=""${value?'':' selected'}>None</option>`;
  for(const opt of DEV_WEAPON_TYPES){
    const selected = opt.id === value ? ' selected' : '';
    html += `<option value="${opt.id}"${selected}>${opt.label}</option>`;
  }
  return html;
}

function developerItemSelectionValue(item){
  if(!item || typeof item !== 'object') return 'none';
  const type = (item.type || item.kind || '').toString().toLowerCase();
  if(type === 'potion') return 'potion';
  const id = item.id ? String(item.id) : '';
  if(!id) return 'custom';
  if(type === 'offhand') return `offhand:${id}`;
  if(type === 'armor') return `armor:${id}`;
  return 'custom';
}

function developerItemSelectOptions(selectedValue){
  const current = selectedValue || 'none';
  let html = '';
  let matched = false;
  for(const opt of DEV_ITEM_TYPES){
    const selected = opt.value === current ? ' selected' : '';
    if(selected) matched = true;
    html += `<option value="${opt.value}"${selected}>${opt.label}</option>`;
  }
  if(current !== 'none' && current !== 'potion' && !matched){
    html += `<option value="custom" selected>Custom Item</option>`;
  }
  return html;
}

function handleDeveloperObjectField(world, element){
  if(!world?.dev?.layout) return;
  const path = element.getAttribute('data-object-field');
  if(!path) return;
  const segments = path.split('.');
  const emptyMode = element.getAttribute('data-empty-mode');
  const rawValue = element.type === 'checkbox' ? element.checked : element.value;
  if(emptyMode === 'delete' && element.type !== 'checkbox'){
    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if(trimmed === ''){
      developerDeleteObjectPath(world.dev.layout, segments);
      markDeveloperLayoutDirty(world);
      world.dev.panelDirty = true;
      return;
    }
  }
  let value;
  if(element.type === 'checkbox'){
    value = !!rawValue;
  }else if(element.type === 'number' || element.type === 'range'){
    value = Number(rawValue);
    if(Number.isNaN(value)) value = 0;
  }else{
    value = rawValue;
  }
  const key = segments[segments.length - 1];
  if(key === 'coins'){
    value = Math.max(0, Math.round(value));
    element.value = value;
  }else if(key === 'coinValue' || key === 'restockCoinValue' || key === 'heal'){
    value = Math.max(1, Math.round(value));
    element.value = value;
  }
  if(key === 'weaponId' || key === 'id' || key === 'name' || key === 'description' || key === 'color' || key === 'itemId'){
    if(typeof value === 'string') value = value.trim();
  }
  if(emptyMode === 'delete' && (value === '' || value === null)){
    developerDeleteObjectPath(world.dev.layout, segments);
  }else{
    developerSetObjectPath(world.dev.layout, segments, value);
  }
  markDeveloperLayoutDirty(world);
  world.dev.panelDirty = true;
}

function handleDeveloperObjectAction(world, element){
  if(!world?.dev?.layout) return;
  const action = element.getAttribute('data-object-action');
  if(!action) return;
  const indexAttr = element.getAttribute('data-object-index');
  const idx = Number(indexAttr);
  if(Number.isNaN(idx)) return;
  const obj = world.dev.layout.objects?.[idx];
  if(!obj) return;
  if(action === 'set-item-type'){
    const value = element.value;
    const loot = developerEnsureLootObject(obj);
    if(value === 'potion'){
      developerEnsurePotionLoot(obj);
    }else if(value === 'none'){
      if(loot) delete loot.item;
    }else if(value && value.startsWith('offhand:')){
      if(loot){
        loot.item = { type: 'offhand', id: value.slice('offhand:'.length) };
      }
    }else if(value && value.startsWith('armor:')){
      if(loot){
        loot.item = { type: 'armor', id: value.slice('armor:'.length) };
      }
    }else{
      if(loot) delete loot.item;
    }
    markDeveloperLayoutDirty(world);
    world.dev.panelDirty = true;
  }
}

function handleDeveloperFluidAction(world, action, indexAttr){
  if(!world?.dev || !action) return;
  const dev = world.dev;
  if(action === 'toggle-sand'){
    if(dev.sandConfig){
      dev.sandConfig = null;
      dev.sandParticleMap = new Map();
    }else{
      dev.sandConfig = defaultSandScene();
      dev.sandParticleMap = new Map();
    }
    markDeveloperSandDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'toggle-powder'){
    if(dev.powderConfig){
      dev.powderConfig = null;
      dev.powderParticleMap = new Map();
    }else{
      dev.powderConfig = defaultPowderScene();
      dev.powderParticleMap = new Map();
    }
    markDeveloperPowderDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'add-sand-hill'){
    if(!dev.sandConfig) dev.sandConfig = defaultSandScene();
    if(!Array.isArray(dev.sandConfig.hills)) dev.sandConfig.hills = [];
    const cols = Math.max(0, dev.cols || (dev.layout?.cols || 0));
    const defaultCell = developerResolveDefaultCell(world);
    const maxCol = Math.max(0, cols - 1);
    const centerCol = defaultCell ? clamp(defaultCell.col, 0, maxCol) : clamp(Math.round(cols * 0.5), 0, maxCol);
    dev.sandConfig.hills.push({ col: centerCol, width: 4, height: 2 });
    markDeveloperSandDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'remove-sand-hill'){
    if(!dev.sandConfig || !Array.isArray(dev.sandConfig.hills)) return;
    const idx = Number(indexAttr);
    if(Number.isNaN(idx) || idx < 0 || idx >= dev.sandConfig.hills.length) return;
    dev.sandConfig.hills.splice(idx, 1);
    markDeveloperSandDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'toggle-water'){
    if(dev.waterConfig){
      dev.waterConfig = null;
      dev.waterParticleMap = new Map();
    }else{
      dev.waterConfig = defaultWaterScene();
      dev.waterParticleMap = new Map();
    }
    markDeveloperWaterDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'toggle-lava'){
    if(dev.lavaConfig){
      dev.lavaConfig = null;
      dev.lavaParticleMap = new Map();
    }else{
      dev.lavaConfig = defaultLavaScene();
      dev.lavaParticleMap = new Map();
    }
    markDeveloperLavaDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'add-water-emitter' || action === 'add-lava-emitter'){
    const scope = action === 'add-water-emitter' ? 'water' : 'lava';
    const configKey = scope === 'water' ? 'waterConfig' : 'lavaConfig';
    const defaultScene = scope === 'water' ? defaultWaterScene : defaultLavaScene;
    if(!dev[configKey]) dev[configKey] = defaultScene();
    if(!Array.isArray(dev[configKey].emitters)) dev[configKey].emitters = [];
    const cols = Math.max(0, dev.cols || (dev.layout?.cols || 0));
    const rows = Math.max(0, dev.rows || (dev.layout?.rows || 0));
    const defaultCell = developerResolveDefaultCell(world);
    const maxCol = Math.max(0, cols - 1);
    const maxRow = Math.max(0, rows - 1);
    const baseCol = defaultCell ? clamp(defaultCell.col, 0, maxCol) : clamp(Math.round(cols * 0.5), 0, maxCol);
    const guessRow = defaultCell ? clamp(defaultCell.row, 0, maxRow) : Math.max(0, rows > 0 ? rows - 1 : 0);
    const surfaceRow = dev.layout ? developerFindSurfaceRow(dev.layout, baseCol, guessRow) : guessRow;
    const defaults = scope === 'water'
      ? { rate: 24 }
      : { rate: 16 };
    dev[configKey].emitters.push({
      col: baseCol,
      row: surfaceRow,
      offsetX: 0,
      offsetY: -24,
      rate: defaults.rate,
      spreadX: 0,
      spreadY: 0,
      jitter: 0
    });
    if(scope === 'water') markDeveloperWaterDirty(world);
    else markDeveloperLavaDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'remove-water-emitter' || action === 'remove-lava-emitter'){
    const scope = action === 'remove-water-emitter' ? 'water' : 'lava';
    const configKey = scope === 'water' ? 'waterConfig' : 'lavaConfig';
    if(!dev[configKey] || !Array.isArray(dev[configKey].emitters)) return;
    const idx = Number(indexAttr);
    if(Number.isNaN(idx) || idx < 0 || idx >= dev[configKey].emitters.length) return;
    dev[configKey].emitters.splice(idx, 1);
    if(scope === 'water') markDeveloperWaterDirty(world);
    else markDeveloperLavaDirty(world);
    dev.panelDirty = true;
  }
}

function handleDeveloperGrassAction(world, action, indexAttr){
  if(!world?.dev || !action) return;
  const dev = world.dev;
  if(action === 'toggle-grass'){
    if(dev.grassConfig){
      dev.grassConfig = null;
      markDeveloperGrassDirty(world);
    }else{
      dev.grassConfig = defaultGrassScene();
      markDeveloperGrassDirty(world);
    }
    dev.panelDirty = true;
    return;
  }
  if(!developerEnsureGrassConfig(world)) return;
  const config = dev.grassConfig;
  if(!config) return;
  if(action === 'add-grass-patch'){
    if(!Array.isArray(config.patches)) config.patches = [];
    const cols = Math.max(0, dev.cols || (dev.layout?.cols || 0));
    const maxCol = Math.max(0, cols - 1);
    const centerCol = clamp(Math.round(cols * 0.5), 0, maxCol);
    config.patches.push({ col: centerCol, cols: 6, density: 0.8, noise: 0.12, taper: 0.35 });
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'remove-grass-patch'){
    if(!Array.isArray(config.patches)) return;
    const idx = Number(indexAttr);
    if(Number.isNaN(idx) || idx < 0 || idx >= config.patches.length) return;
    config.patches.splice(idx, 1);
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'add-grass-surface'){
    config.surfaces = Array.isArray(config.surfaces) ? config.surfaces : [];
    const cols = Math.max(0, dev.cols || (dev.layout?.cols || 0));
    const maxCol = Math.max(0, cols - 1);
    const centerCol = clamp(Math.round(cols * 0.5), 0, maxCol);
    config.surfaces.push({ col: centerCol, cols: 1 });
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'remove-grass-surface'){
    if(!Array.isArray(config.surfaces)) return;
    const idx = Number(indexAttr);
    if(Number.isNaN(idx) || idx < 0 || idx >= config.surfaces.length) return;
    config.surfaces.splice(idx, 1);
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'add-grass-clearing'){
    if(!Array.isArray(config.clearings)) config.clearings = [];
    const cols = Math.max(0, dev.cols || (dev.layout?.cols || 0));
    const maxCol = Math.max(0, cols - 1);
    const centerCol = clamp(Math.round(cols * 0.5), 0, maxCol);
    config.clearings.push({ col: centerCol, cols: 4 });
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'remove-grass-clearing'){
    if(!Array.isArray(config.clearings)) return;
    const idx = Number(indexAttr);
    if(Number.isNaN(idx) || idx < 0 || idx >= config.clearings.length) return;
    config.clearings.splice(idx, 1);
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'enable-grass-scatter'){
    config.scatter = config.scatter || { count: 12, density: 0.55 };
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
    return;
  }
  if(action === 'disable-grass-scatter'){
    config.scatter = null;
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
  }
}

function handleDeveloperParticleSelect(world, selection){
  if(!world?.dev || !selection) return;
  if(selection === 'sand'){
    world.dev.tool = 'sand';
    developerEnsureFluidEditable(world, 'sand');
    world.dev.sandBrushMaterial = 'sand';
    world.dev.panelDirty = true;
    return;
  }
  if(selection === 'sand:steel'){
    world.dev.tool = 'sand';
    developerEnsureFluidEditable(world, 'sand');
    world.dev.sandBrushMaterial = 'steel';
    world.dev.panelDirty = true;
    return;
  }
  if(selection === 'lava'){
    world.dev.tool = 'lava';
    developerEnsureFluidEditable(world, 'lava');
    world.dev.panelDirty = true;
    return;
  }
  if(selection === 'water'){
    world.dev.tool = 'water';
    world.dev.waterBrushStyle = 'water';
    developerEnsureFluidEditable(world, 'water');
    world.dev.panelDirty = true;
    return;
  }
  if(selection.startsWith('water:')){
    const style = selection.split(':')[1] || 'water';
    world.dev.tool = 'water';
    developerEnsureFluidEditable(world, 'water');
    world.dev.waterBrushStyle = style === 'ice' ? 'ice' : 'water';
    world.dev.panelDirty = true;
    return;
  }
  if(selection.startsWith('powder:')){
    const material = selection.split(':')[1] || 'wood';
    world.dev.tool = 'powder';
    developerEnsureFluidEditable(world, 'powder');
    world.dev.powderBrushMaterial = material;
    world.dev.panelDirty = true;
  }
}

function handleDeveloperDecorationSelect(world, selection){
  if(!world?.dev || !selection) return;
  const dev = world.dev;
  const options = developerDecorationPaletteOptions();
  const match = options.find(opt=>opt.id === selection);
  const def = typeof getDecorationDefinition === 'function' ? getDecorationDefinition(selection) : null;
  const tool = def?.tool || match?.tool || selection;
  if(tool){
    dev.tool = tool;
    if(tool === 'grass'){
      developerEnsureGrassConfig(world);
    }
  }
  dev.decorationSelection = selection;
  dev.panelDirty = true;
}

function handleDeveloperFluidField(world, element){
  if(!world?.dev || !element) return;
  const path = element.getAttribute('data-fluid-field');
  if(!path) return;
  const dev = world.dev;
  let scope = null;
  if(path.startsWith('sand')) scope = 'sand';
  else if(path.startsWith('powder')) scope = 'powder';
  else if(path.startsWith('water')) scope = 'water';
  else if(path.startsWith('lava')) scope = 'lava';
  if(!scope) return;
  const configKey = scope === 'sand'
    ? 'sandConfig'
    : scope === 'powder'
      ? 'powderConfig'
      : scope === 'water'
        ? 'waterConfig'
        : 'lavaConfig';
  if(!dev[configKey]){
    if(scope === 'sand') dev[configKey] = defaultSandScene();
    else if(scope === 'powder') dev[configKey] = defaultPowderScene();
    else if(scope === 'water') dev[configKey] = defaultWaterScene();
    else dev[configKey] = defaultLavaScene();
  }
  const config = dev[configKey];
  if(!config) return;
  const segments = path.split('.');
  const lastKey = segments[segments.length - 1];
  let value;
  if(element.type === 'checkbox'){
    value = element.checked;
  }else if(element.type === 'number'){
    value = Number(element.value);
    if(!Number.isFinite(value)) return;
  }else{
    value = element.value;
  }
  if(lastKey === 'cellSize'){
    value = Math.max(1, Math.round(value));
    element.value = value;
  }else if(lastKey === 'baseThickness'){
    value = Math.max(0, value);
    element.value = value;
  }else if(['rate','spreadX','spreadY','jitter'].includes(lastKey)){
    if(lastKey === 'rate') value = Math.max(0, value);
    element.value = value;
  }else if(scope === 'powder' && (lastKey === 'burnDuration' || lastKey === 'fireLifetime')){
    value = Math.max(0.1, value);
    element.value = value;
  }
  if(scope === 'sand' && segments[1] === 'hills' && !Array.isArray(config.hills)) config.hills = [];
  if((scope === 'water' || scope === 'lava') && segments[1] === 'emitters' && !Array.isArray(config.emitters)) config.emitters = [];
  developerSetFluidPath(config, segments.slice(1), value);
  if(scope === 'sand') markDeveloperSandDirty(world);
  else if(scope === 'powder') markDeveloperPowderDirty(world);
  else if(scope === 'water') markDeveloperWaterDirty(world);
  else markDeveloperLavaDirty(world);
  world.dev.panelDirty = true;
}

function handleDeveloperGrassField(world, element){
  if(!world?.dev || !element) return;
  const path = element.getAttribute('data-grass-field');
  if(!path) return;
  if(!developerEnsureGrassConfig(world)) return;
  const config = world.dev.grassConfig;
  if(!config) return;
  let value;
  if(element.type === 'checkbox'){
    value = element.checked;
  }else if(element.type === 'number'){
    value = Number(element.value);
    if(!Number.isFinite(value)) return;
  }else{
    value = element.value;
  }
  const segments = path.split('.');
  const lastKey = segments[segments.length - 1];
  if(lastKey === 'cellSize'){
    value = Math.max(1, Math.round(value));
    element.value = value;
  }else if(lastKey === 'bladeHeight'){
    value = Math.max(4, value);
    element.value = value;
  }else if(lastKey === 'baseDensity' || lastKey === 'maxDensity'){
    value = clamp(value, 0, 1);
    element.value = value;
  }else if(lastKey === 'density' && segments[segments.length - 2] === 'scatter'){
    value = clamp(value, 0, 1);
    element.value = value;
  }else if(lastKey === 'count' && segments[segments.length - 2] === 'scatter'){
    value = Math.max(0, Math.round(value));
    element.value = value;
  }else if(['noise','taper'].includes(lastKey) && segments[segments.length - 2] === 'patches'){
    value = clamp(value, 0, 1);
    element.value = value;
  }else if(lastKey === 'cols'){
    value = Math.max(0, value);
    element.value = value;
  }else if(['growthRate','spreadRate','burnRate','regrowDelay','windStrength','windSpeed'].includes(lastKey)){
    value = Math.max(0, value);
    element.value = value;
  }
  if(segments[0] !== 'grass') segments.unshift('grass');
  developerSetFluidPath(config, segments.slice(1), value);
  markDeveloperGrassDirty(world);
  world.dev.panelDirty = true;
}

function developerSetFluidPath(target, segments, value){
  if(!target || !segments.length) return;
  let obj = target;
  for(let i=0; i<segments.length-1; i++){
    const key = segments[i];
    if(Array.isArray(obj)){
      const idx = Number(key);
      if(Number.isNaN(idx) || idx < 0 || idx >= obj.length) return;
      obj = obj[idx];
    }else{
      if(!(key in obj) || obj[key] === null){
        obj[key] = {};
      }
      obj = obj[key];
    }
    if(obj === undefined || obj === null) return;
  }
  const finalKey = segments[segments.length - 1];
  if(Array.isArray(obj)){
    const idx = Number(finalKey);
    if(Number.isNaN(idx) || idx < 0 || idx >= obj.length) return;
    obj[idx] = value;
  }else{
    obj[finalKey] = value;
  }
}

function developerClampBrushSize(value){
  if(!Number.isFinite(value)) return 1;
  const size = Math.round(value);
  return clamp(size, 1, 120);
}

function developerRoundParticleCoord(value){
  if(!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function developerDecorationPaletteOptions(){
  if(typeof listDecorationDefinitions === 'function'){
    const defs = listDecorationDefinitions();
    if(Array.isArray(defs) && defs.length){
      return defs.map(def=>({
        id: def.id,
        label: def.label || devFormatLabel(def.id),
        tool: def.tool || def.id
      }));
    }
  }
  return DEV_DECORATION_FALLBACKS.map(entry=>({ ...entry }));
}

function developerCaptureFluidParticleMap(world, type){
  const field = type === 'sand'
    ? world?.sand
    : type === 'water'
      ? world?.water
      : type === 'lava'
        ? world?.lava
        : null;
  const map = new Map();
  if(!field || !field.cells) return map;
  const { cells, cols, rows, cellSize, offsetX } = field;
  const manualTypes = new Map();
  if(Array.isArray(field.manualParticles)){
    for(const entry of field.manualParticles){
      if(!entry) continue;
      const col = Number.isFinite(entry.col) ? Math.round(entry.col) : null;
      const row = Number.isFinite(entry.row) ? Math.round(entry.row) : null;
      if(!Number.isInteger(col) || !Number.isInteger(row)) continue;
      const key = `${col},${row}`;
      const entryType = entry.type || type;
      manualTypes.set(key, entryType);
      const manualX = Number.isFinite(entry.x) ? entry.x : offsetX + col * cellSize + cellSize * 0.5;
      const manualY = Number.isFinite(entry.y) ? entry.y : (row + 0.5) * cellSize;
      if(!map.has(key)){
        map.set(key, {
          col,
          row,
          x: developerRoundParticleCoord(manualX),
          y: developerRoundParticleCoord(manualY),
          type: entryType
        });
      }
    }
  }
  for(let row=0; row<rows; row++){
    const rowOffset = row * cols;
    for(let col=0; col<cols; col++){
      if(!cells[rowOffset + col]) continue;
      const x = offsetX + col * cellSize + cellSize * 0.5;
      const y = (row + 0.5) * cellSize;
      const key = `${col},${row}`;
      if(map.has(key)) continue;
      const entryType = manualTypes.get(key) || type;
      map.set(key, { col, row, x: developerRoundParticleCoord(x), y: developerRoundParticleCoord(y), type: entryType });
    }
  }
  return map;
}

function developerBuildFluidParticleMap(world, field, config, type){
  const map = new Map();
  if(!config) return map;
  const entries = Array.isArray(config.particles) ? config.particles : [];
  if(!entries.length) return map;
  const dev = world?.dev;
  const defaultSize = config.cellSize || (type === 'sand' ? SAND_DEFAULT_CELL_SIZE : WATER_DEFAULT_CELL_SIZE);
  const cellSize = field?.cellSize || defaultSize;
  const offsetX = field?.offsetX ?? dev?.offsetX ?? 0;
  const worldHeight = Math.max(1, world?.groundY || world?.height || 600);
  const rows = field?.rows ?? Math.max(1, Math.ceil(worldHeight / cellSize));
  const worldWidth = Math.max(1, world?.width || (dev?.cols || 0) * (dev?.tileSize || cellSize));
  const cols = field?.cols ?? Math.max(1, Math.ceil(worldWidth / cellSize));
  const pseudoField = field || { cellSize, offsetX, rows, cols };
  const columnForX = type === 'sand' ? sandColumnForX : waterColumnForX;
  const rowForY = type === 'sand' ? sandRowForY : waterRowForY;
  for(const entry of entries){
    if(!entry) continue;
    const particle = parseLevelParticleSpec(entry, {
      defaultType: type,
      cellSize,
      offsetX,
      columnForX: (x)=>columnForX(pseudoField, x),
      rowForY: (y)=>rowForY(pseudoField, y)
    });
    if(!particle) continue;
    const col = particle.col;
    const row = particle.row;
    if(col < 0 || row < 0) continue;
    if(field){
      if(col >= field.cols || row >= field.rows) continue;
    }
    const key = `${col},${row}`;
    if(map.has(key)) continue;
    const x = Number.isFinite(particle.x) ? particle.x : offsetX + col * cellSize + cellSize * 0.5;
    const y = Number.isFinite(particle.y) ? particle.y : (row + 0.5) * cellSize;
    const entryType = particle.type || type;
    map.set(key, { col, row, x: developerRoundParticleCoord(x), y: developerRoundParticleCoord(y), type: entryType });
  }
  return map;
}

function developerSyncFluidConfigParticles(world, type){
  const dev = world?.dev;
  if(!dev) return;
  if(type === 'powder'){
    developerSyncPowderConfigParticles(world);
    return;
  }
  const keys = developerFluidKeys(type);
  if(!keys) return;
  const config = dev[keys.configKey];
  if(!config){
    dev[keys.mapKey] = new Map();
    return;
  }
  if(type === 'water' || type === 'lava'){
    const targetSize = WATER_DEFAULT_CELL_SIZE || PARTICLE_CELL_SIZE || 3;
    if(config.cellSize !== targetSize) config.cellSize = targetSize;
  }
  const map = dev[keys.mapKey] instanceof Map ? dev[keys.mapKey] : new Map();
  if(!(dev[keys.mapKey] instanceof Map)) dev[keys.mapKey] = map;
  const field = world[keys.fieldKey];
  const defaultSize = config.cellSize || (type === 'sand' ? SAND_DEFAULT_CELL_SIZE : WATER_DEFAULT_CELL_SIZE);
  const cellSize = field?.cellSize || defaultSize;
  const offsetX = field?.offsetX ?? dev.offsetX ?? 0;
  const particles = [];
  const stringifyOptions = {
    defaultType: type,
    cellSize,
    offsetX,
    decimals: 2,
    epsilon: 0.01
  };
  for(const particle of map.values()){
    const col = Number.isInteger(particle.col) ? particle.col : Math.round(particle.col ?? 0);
    const row = Number.isInteger(particle.row) ? particle.row : Math.round(particle.row ?? 0);
    const x = Number.isFinite(particle.x) ? particle.x : offsetX + col * cellSize + cellSize * 0.5;
    const y = Number.isFinite(particle.y) ? particle.y : (row + 0.5) * cellSize;
    const entryType = particle.type || type;
    const entry = { col, row, x: developerRoundParticleCoord(x), y: developerRoundParticleCoord(y), type: entryType };
    particle.col = entry.col;
    particle.row = entry.row;
    particle.x = entry.x;
    particle.y = entry.y;
    particle.type = entryType;
    const spec = stringifyLevelParticleSpec(entry, stringifyOptions);
    particles.push(spec || { ...entry });
  }
  config.particles = particles;
}

function developerCapturePowderParticleMap(world){
  const field = world?.powder;
  const map = new Map();
  if(!field || !field.types) return map;
  const { types, cols, rows, cellSize, offsetX } = field;
  for(let row=0; row<rows; row++){
    for(let col=0; col<cols; col++){
      const idx = row * cols + col;
      const typeValue = types[idx];
      if(!typeValue) continue;
      const x = offsetX + col * cellSize + cellSize * 0.5;
      const y = (row + 0.5) * cellSize;
      const label = typeof powderTypeToName === 'function'
        ? powderTypeToName(typeValue)
        : (typeValue === POWDER_TYPE_FIRE ? 'fire' : typeValue === POWDER_TYPE_EMBER ? 'ember' : 'wood');
      map.set(`${col},${row}`, {
        col,
        row,
        x: developerRoundParticleCoord(x),
        y: developerRoundParticleCoord(y),
        type: label
      });
    }
  }
  return map;
}

function developerBuildPowderParticleMap(world, field, config){
  const map = new Map();
  if(!config) return map;
  const entries = Array.isArray(config.particles) ? config.particles : [];
  if(!entries.length) return map;
  const dev = world?.dev;
  const defaultSize = config.cellSize || POWDER_DEFAULT_CELL_SIZE;
  const cellSize = field?.cellSize || defaultSize;
  const offsetX = field?.offsetX ?? dev?.offsetX ?? 0;
  const worldHeight = Math.max(1, world?.groundY || world?.height || 600);
  const rows = field?.rows ?? Math.max(1, Math.ceil(worldHeight / cellSize));
  const worldWidth = Math.max(1, world?.width || (dev?.cols || 0) * (dev?.tileSize || cellSize));
  const cols = field?.cols ?? Math.max(1, Math.ceil(worldWidth / cellSize));
  const pseudoField = field || { cellSize, offsetX, rows, cols };
  for(const entry of entries){
    if(!entry) continue;
    const particle = parseLevelParticleSpec(entry, {
      defaultType: 'wood',
      cellSize,
      offsetX,
      columnForX: (x)=>powderColumnForX(pseudoField, x),
      rowForY: (y)=>powderRowForY(pseudoField, y)
    });
    if(!particle) continue;
    const col = particle.col;
    const row = particle.row;
    if(col < 0 || row < 0) continue;
    if(field){
      if(col >= field.cols || row >= field.rows) continue;
    }
    const key = `${col},${row}`;
    if(map.has(key)) continue;
    const typeValue = typeof powderTypeToName === 'function'
      ? powderTypeToName(powderTypeFromName(particle.type))
      : (particle.type || 'wood');
    const x = Number.isFinite(particle.x) ? particle.x : offsetX + col * cellSize + cellSize * 0.5;
    const y = Number.isFinite(particle.y) ? particle.y : (row + 0.5) * cellSize;
    map.set(key, {
      col,
      row,
      x: developerRoundParticleCoord(x),
      y: developerRoundParticleCoord(y),
      type: typeValue
    });
  }
  return map;
}

function developerSyncPowderConfigParticles(world){
  const dev = world?.dev;
  if(!dev) return;
  const config = dev.powderConfig;
  if(!config){
    dev.powderParticleMap = new Map();
    return;
  }
  const map = dev.powderParticleMap instanceof Map ? dev.powderParticleMap : new Map();
  if(!(dev.powderParticleMap instanceof Map)) dev.powderParticleMap = map;
  const field = world?.powder;
  const cellSize = field?.cellSize || config.cellSize || POWDER_DEFAULT_CELL_SIZE;
  const offsetX = field?.offsetX ?? dev.offsetX ?? 0;
  const particles = [];
  const stringifyOptions = {
    defaultType: 'wood',
    cellSize,
    offsetX,
    decimals: 2,
    epsilon: 0.01
  };
  for(const particle of map.values()){
    const col = Number.isInteger(particle.col) ? particle.col : Math.round(particle.col ?? 0);
    const row = Number.isInteger(particle.row) ? particle.row : Math.round(particle.row ?? 0);
    const x = Number.isFinite(particle.x) ? particle.x : offsetX + col * cellSize + cellSize * 0.5;
    const y = Number.isFinite(particle.y) ? particle.y : (row + 0.5) * cellSize;
    const typeName = particle.type || 'wood';
    const entry = {
      col,
      row,
      x: developerRoundParticleCoord(x),
      y: developerRoundParticleCoord(y),
      type: typeName
    };
    particle.col = entry.col;
    particle.row = entry.row;
    particle.x = entry.x;
    particle.y = entry.y;
    particle.type = typeName;
    const spec = stringifyLevelParticleSpec(entry, stringifyOptions);
    particles.push(spec || { ...entry });
  }
  config.particles = particles;
}

function developerEnsureFluidEditable(world, type){
  const dev = world?.dev;
  if(!dev) return false;
  if(type === 'powder'){
    if(!dev.powderConfig){
      dev.powderConfig = defaultPowderScene();
      dev.powderParticleMap = new Map();
      markDeveloperPowderDirty(world);
      dev.panelDirty = true;
    }
    if(!(dev.powderParticleMap instanceof Map)) dev.powderParticleMap = new Map();
    if(!world.powder || world.powder.autoGenerated){
      const layoutMeta = world.levelState?.layoutMeta || null;
      if(layoutMeta) configureWorldPowder(world, layoutMeta, dev.powderConfig);
    }
    const fieldRef = world.powder;
    let captured = false;
    if(dev.powderParticleMap.size === 0){
      if(Array.isArray(dev.powderConfig.particles) && dev.powderConfig.particles.length){
        dev.powderParticleMap = developerBuildPowderParticleMap(world, fieldRef, dev.powderConfig);
      }else if(fieldRef){
        dev.powderParticleMap = developerCapturePowderParticleMap(world);
        captured = dev.powderParticleMap.size > 0;
      }
      developerSyncPowderConfigParticles(world);
    }
    if(captured) markDeveloperPowderDirty(world);
    return !!world.powder;
  }
  const keys = developerFluidKeys(type);
  if(!keys) return false;
  if(!dev[keys.configKey]){
    const defaults = type === 'sand' ? defaultSandScene : type === 'water' ? defaultWaterScene : defaultLavaScene;
    dev[keys.configKey] = defaults();
    dev[keys.mapKey] = new Map();
    keys.markDirty(world);
    dev.panelDirty = true;
  }
  if(!(dev[keys.mapKey] instanceof Map)) dev[keys.mapKey] = new Map();
  if(!world[keys.fieldKey]){
    const layoutMeta = world.levelState?.layoutMeta || null;
    if(layoutMeta){
      if(type === 'sand') configureWorldSand(world, layoutMeta, dev.sandConfig);
      else if(type === 'water') configureWorldWater(world, layoutMeta, dev.waterConfig);
      else if(type === 'lava') configureWorldLava(world, layoutMeta, dev.lavaConfig);
    }
  }
  const fieldRef = world[keys.fieldKey];
  let captured = false;
  if(dev[keys.mapKey].size === 0){
    if(Array.isArray(dev[keys.configKey].particles) && dev[keys.configKey].particles.length){
      dev[keys.mapKey] = developerBuildFluidParticleMap(world, fieldRef, dev[keys.configKey], type);
    }else if(fieldRef){
      dev[keys.mapKey] = developerCaptureFluidParticleMap(world, type);
      captured = dev[keys.mapKey].size > 0;
    }
    developerSyncFluidConfigParticles(world, type);
  }
  if(captured) keys.markDirty(world);
  return !!world[keys.fieldKey];
}

function developerEnsureGrassConfig(world){
  const dev = world?.dev;
  if(!dev) return false;
  if(!dev.grassConfig){
    dev.grassConfig = defaultGrassScene();
    markDeveloperGrassDirty(world);
    dev.panelDirty = true;
  }
  if(!world.grass){
    const layoutMeta = world.levelState?.layoutMeta || null;
    if(layoutMeta) configureWorldGrass(world, layoutMeta, dev.grassConfig);
  }
  return !!world.grass;
}

function developerApplyFluidBrush(world, type, pos, erase){
  if(!developerEnsureFluidEditable(world, type)) return false;
  const dev = world.dev;
  let field = null;
  let mapKey = null;
  let columnForX = null;
  let rowForY = null;
  let fillCell = null;
  let clearCell = null;
  let syncHeights = null;
  let brushSize = developerClampBrushSize(dev.sandBrushSize || 12);
  let sandMaterial = 'sand';
  if(type === 'sand'){
    field = world?.sand;
    mapKey = 'sandParticleMap';
    columnForX = sandColumnForX;
    rowForY = sandRowForY;
    fillCell = fillSandCell;
    clearCell = (f, c, r)=>clearSandCell(f, c, r, true);
    syncHeights = syncSandHeights;
    brushSize = developerClampBrushSize(dev.sandBrushSize || 12);
    sandMaterial = dev.sandBrushMaterial === 'steel' ? 'steel' : 'sand';
  }else if(type === 'powder'){
    field = world?.powder;
    mapKey = 'powderParticleMap';
    columnForX = powderColumnForX;
    rowForY = powderRowForY;
    fillCell = fillPowderCell;
    clearCell = (f, c, r)=>clearPowderCell(f, c, r, true);
    syncHeights = null;
    brushSize = developerClampBrushSize(dev.powderBrushSize || 12);
  }else if(type === 'water'){
    field = world?.water;
    mapKey = 'waterParticleMap';
    columnForX = waterColumnForX;
    rowForY = waterRowForY;
    fillCell = fillWaterCell;
    clearCell = clearWaterCell;
    syncHeights = syncWaterHeights;
    brushSize = developerClampBrushSize(dev.waterBrushSize || 12);
  }else if(type === 'lava'){
    field = world?.lava;
    mapKey = 'lavaParticleMap';
    columnForX = typeof lavaColumnForX === 'function' ? lavaColumnForX : waterColumnForX;
    rowForY = typeof lavaRowForY === 'function' ? lavaRowForY : waterRowForY;
    fillCell = typeof fillLavaCell === 'function' ? fillLavaCell : fillWaterCell;
    clearCell = typeof clearLavaCell === 'function' ? clearLavaCell : clearWaterCell;
    syncHeights = typeof syncLavaHeights === 'function' ? syncLavaHeights : syncWaterHeights;
    brushSize = developerClampBrushSize(dev.lavaBrushSize || 12);
  }
  if(!field) return false;
  let map = dev[mapKey];
  if(!(map instanceof Map)){
    map = new Map();
    dev[mapKey] = map;
  }
  const cellSize = field.cellSize || 1;
  const radius = Math.max(0, Math.floor(Math.max(1, brushSize) / cellSize));
  const centerCol = columnForX(field, pos.x);
  const centerRow = rowForY(field, pos.y);
  if(centerCol < 0 || centerCol >= field.cols || centerRow < 0 || centerRow >= field.rows) return false;
  let changed = false;
  const brushShape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  const powderTypeName = (dev.powderBrushMaterial || 'wood');
  const powderTypeValue = typeof powderTypeFromName === 'function'
    ? powderTypeFromName(powderTypeName)
    : (powderTypeName === 'fire' ? POWDER_TYPE_FIRE : powderTypeName === 'ember' ? POWDER_TYPE_EMBER : POWDER_TYPE_WOOD);
  const fluidEntryType = type === 'water'
    ? (dev.waterBrushStyle === 'ice' ? 'ice' : 'water')
    : type;
  for(let row=centerRow - radius; row<=centerRow + radius; row++){
    if(row < 0 || row >= field.rows) continue;
    for(let col=centerCol - radius; col<=centerCol + radius; col++){
      if(col < 0 || col >= field.cols) continue;
      const dx = col - centerCol;
      const dy = row - centerRow;
      const withinBrush = brushShape === 'square'
        ? (Math.abs(dx) <= radius && Math.abs(dy) <= radius)
        : (dx*dx + dy*dy <= radius * radius);
      if(!withinBrush) continue;
      if(erase){
        const key = `${col},${row}`;
        let erased = false;
        if(type === 'water'){
          const existing = map.get(key);
          if(existing && existing.type === 'ice'){
            map.delete(key);
            erased = true;
            if(Array.isArray(field.manualParticles)){
              const idx = field.manualParticles.findIndex(entry=>{
                if(!entry) return false;
                const entryCol = Number.isFinite(entry.col) ? Math.round(entry.col) : null;
                const entryRow = Number.isFinite(entry.row) ? Math.round(entry.row) : null;
                return entryCol === col && entryRow === row && (entry.type === undefined || entry.type === 'ice');
              });
              if(idx >= 0) field.manualParticles.splice(idx, 1);
            }
          }
        }
        if(clearCell(field, col, row)){
          map.delete(key);
          erased = true;
        }
        if(erased){
          changed = true;
          if(type === 'water' && typeof markWaterColumnDirty === 'function'){
            markWaterColumnDirty(field, col);
          }
        }
      }else{
        if(type === 'powder'){
          if(fillCell(field, col, row, powderTypeValue)){
            const key = `${col},${row}`;
            if(!map.has(key)){
              const x = field.offsetX + col * cellSize + cellSize * 0.5;
              const y = (row + 0.5) * cellSize;
              map.set(key, {
                col,
                row,
                x: developerRoundParticleCoord(x),
                y: developerRoundParticleCoord(y),
                type: powderTypeName
              });
            }else{
              const existing = map.get(key);
              if(existing) existing.type = powderTypeName;
            }
            changed = true;
          }
        }else if(type === 'sand'){
          if(fillCell(field, col, row, sandMaterial)){
            const key = `${col},${row}`;
            if(!map.has(key)){
              const x = field.offsetX + col * field.cellSize + field.cellSize * 0.5;
              const y = (row + 0.5) * field.cellSize;
              map.set(key, { col, row, x: developerRoundParticleCoord(x), y: developerRoundParticleCoord(y), type: sandMaterial });
            }else{
              const existing = map.get(key);
              if(existing) existing.type = sandMaterial;
            }
            changed = true;
          }
        }else{
          const key = `${col},${row}`;
          if(type === 'water' && fluidEntryType === 'ice'){
            const x = field.offsetX + col * field.cellSize + field.cellSize * 0.5;
            const y = (row + 0.5) * field.cellSize;
            const existing = map.get(key);
            const alreadyIce = existing && existing.type === 'ice';
            if(!alreadyIce){
              const success = typeof freezeWaterCell === 'function'
                ? freezeWaterCell(field, col, row)
                : false;
              if(!success) continue;
              map.set(key, {
                col,
                row,
                x: developerRoundParticleCoord(x),
                y: developerRoundParticleCoord(y),
                type: 'ice'
              });
              if(!Array.isArray(field.manualParticles)) field.manualParticles = [];
              const manualEntry = {
                col,
                row,
                x: developerRoundParticleCoord(x),
                y: developerRoundParticleCoord(y),
                type: 'ice'
              };
              const manualIndex = field.manualParticles.findIndex(entry=>{
                if(!entry) return false;
                const entryCol = Number.isFinite(entry.col) ? Math.round(entry.col) : null;
                const entryRow = Number.isFinite(entry.row) ? Math.round(entry.row) : null;
                return entryCol === col && entryRow === row;
              });
              if(manualIndex >= 0) field.manualParticles[manualIndex] = manualEntry;
              else field.manualParticles.push(manualEntry);
              changed = true;
            }
          }else if(fillCell(field, col, row)){
            if(!map.has(key)){
              const x = field.offsetX + col * field.cellSize + field.cellSize * 0.5;
              const y = (row + 0.5) * field.cellSize;
              map.set(key, { col, row, x: developerRoundParticleCoord(x), y: developerRoundParticleCoord(y), type: fluidEntryType });
            }else{
              const existing = map.get(key);
              if(existing) existing.type = fluidEntryType;
            }
            changed = true;
          }
        }
      }
    }
  }
  if(changed){
    if(typeof syncHeights === 'function') syncHeights(field, false);
    developerSyncFluidConfigParticles(world, type);
    if(type === 'sand') markDeveloperSandDirty(world);
    else if(type === 'powder') markDeveloperPowderDirty(world);
    else if(type === 'water') markDeveloperWaterDirty(world);
    else markDeveloperLavaDirty(world);
  }
  return changed;
}

function developerStartFluidBrush(world, type, pos, erase){
  if(!world?.dev) return false;
  if(!developerEnsureFluidEditable(world, type)) return false;
  let field = null;
  if(type === 'sand') field = world?.sand;
  else if(type === 'powder') field = world?.powder;
  else if(type === 'water') field = world?.water;
  else if(type === 'lava') field = world?.lava;
  if(!field) return false;
  developerApplyFluidBrush(world, type, pos, erase);
  world.dev.fluidPainting = { type, erase };
  return true;
}

function developerStopFluidBrush(world){
  if(!world?.dev) return;
  world.dev.fluidPainting = null;
}

function developerCaptureFluidState(world, type, options={}){
  if(!world?.dev) return;
  if(type === 'powder'){
    if(!world.dev.powderConfig) return;
    const map = developerCapturePowderParticleMap(world);
    world.dev.powderParticleMap = map;
    developerSyncPowderConfigParticles(world);
    if(options.skipDirty) return;
    markDeveloperPowderDirty(world);
    return;
  }
  const keys = developerFluidKeys(type);
  if(!keys || !world.dev[keys.configKey]) return;
  if(type === 'sand' && typeof removeSandEmbeddedInTerrain === 'function'){
    if(removeSandEmbeddedInTerrain(world)){
      syncSandHeights(world.sand, false);
    }
  }
  const map = developerCaptureFluidParticleMap(world, type);
  world.dev[keys.mapKey] = map;
  developerSyncFluidConfigParticles(world, type);
  if(options.skipDirty) return;
  keys.markDirty(world);
}

function developerFormatParticleForExport(entry, type, options={}){
  if(!entry) return null;
  const defaultType = options.defaultType ?? (type === 'powder' ? 'wood' : type);
  const cellSize = Number.isFinite(options.cellSize) ? options.cellSize : null;
  const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : 0;
  const normalized = parseLevelParticleSpec(entry, {
    defaultType,
    cellSize,
    offsetX
  });
  if(!normalized) return null;
  const spec = stringifyLevelParticleSpec(normalized, {
    defaultType,
    cellSize,
    offsetX,
    decimals: options.decimals ?? 2,
    epsilon: options.epsilon ?? 0.01
  });
  if(spec) return spec;
  return {
    type: normalized.type || defaultType,
    col: normalized.col,
    row: normalized.row,
    x: developerRoundParticleCoord(Number.isFinite(normalized.x) ? normalized.x : 0),
    y: developerRoundParticleCoord(Number.isFinite(normalized.y) ? normalized.y : 0)
  };
}

function createDeveloperState(){
  const decorationOptions = developerDecorationPaletteOptions();
  const defaultDecoration = decorationOptions.length ? decorationOptions[0].id : 'grass';
  return {
    enabled: false,
    layout: null,
    enemies: [],
    tileSize: DEV_DEFAULT_TILE_SIZE,
    cols: 0,
    rows: 0,
    offsetX: 0,
    hoverCell: null,
    pointerWorld: null,
    tool: 'terrain',
    brush: 'foregroundAdd',
    terrainBrushStyle: 'meadow',
    timeFrozen: false,
    objectType: DEV_OBJECT_TYPES[0]?.id || 'crate',
    enemyKind: DEV_ENEMY_TYPES[0]?.id || 'grunt',
    weaponId: DEV_WEAPON_TYPES[0]?.id || null,
    doorTarget: DEV_DOOR_TYPES[0]?.id || 'entry',
    painting: false,
    paintLayer: 'foreground',
    fluidPainting: null,
    dragging: null,
    objectLockHorizontal: true,
    objectLockVertical: true,
    layoutDirty: false,
    enemiesDirty: false,
    enemyIdCounter: 1,
    objectIdCounter: 1,
    pendingToggleLink: null,
    needsRebuild: false,
    sandDirty: false,
    powderDirty: false,
    waterDirty: false,
    lavaDirty: false,
    panelDirty: true,
    lastExportMessage: '',
    panel: null,
    panelScrollTop: 0,
    panelScrollCarry: 0,
    panelScrollDrag: null,
    sandConfig: null,
    powderConfig: null,
    grassConfig: null,
    decorationSelection: defaultDecoration,
    waterConfig: null,
    lavaConfig: null,
    sandBrushSize: 12,
    powderBrushSize: 12,
    sandBrushMaterial: 'sand',
    grassDirty: false,
    waterBrushSize: 12,
    waterBrushStyle: 'water',
    lavaBrushSize: 12,
    fluidBrushShape: 'circle',
    powderBrushMaterial: 'wood',
    sandParticleMap: new Map(),
    powderParticleMap: new Map(),
    waterParticleMap: new Map(),
    lavaParticleMap: new Map()
  };
}

function setupDeveloperUI(world){
  const panel = document.getElementById('devPanel');
  if(!panel) return;
  world.dev.panel = panel;
  panel.classList.add('hidden');

  const resolveDevPanel = (target)=>{
    if(!(target instanceof Element)) return null;
    const candidate = target.closest('.dev-panel');
    return candidate && panel.contains(candidate) ? candidate : null;
  };

  const applyDevPanelScroll = (panelEl, delta)=>{
    if(!panelEl) return false;
    const maxScroll = Math.max(panelEl.scrollHeight - panelEl.clientHeight, 0);
    if(maxScroll <= 0) return false;
    if(!world?.dev) return false;
    const current = panelEl.scrollTop || 0;
    let carry = Number.isFinite(world.dev.panelScrollCarry) ? world.dev.panelScrollCarry : 0;
    carry += delta;

    if(current <= 0 && carry < 0){
      carry = 0;
    }else if(current >= maxScroll && carry > 0){
      carry = 0;
    }

    let applied = 0;
    if(Math.abs(carry) >= 1){
      applied = carry > 0 ? Math.floor(carry) : Math.ceil(carry);
    }

    if(applied !== 0){
      const next = Math.min(Math.max(current + applied, 0), maxScroll);
      const actual = next - current;
      if(actual !== 0){
        panelEl.scrollTop = next;
        world.dev.panelScrollTop = panelEl.scrollTop || next || 0;
      }
      carry -= actual;
      if(next <= 0 && carry < 0) carry = 0;
      if(next >= maxScroll && carry > 0) carry = 0;
    }else if(world.dev.panelScrollTop !== (panelEl.scrollTop || 0)){
      world.dev.panelScrollTop = panelEl.scrollTop || 0;
    }

    if(Math.abs(carry) < 0.001) carry = 0;
    world.dev.panelScrollCarry = carry;
    return true;
  };

  const releaseDevPanelScrollDrag = ()=>{
    const drag = world?.dev?.panelScrollDrag;
    if(!drag) return;
    let dragPanel = drag.panel && panel.contains(drag.panel) ? drag.panel : panel;
    if(!dragPanel){
      dragPanel = panel;
    }
    if(dragPanel){
      dragPanel.classList.remove('dragging');
      if(world?.dev){
        world.dev.panelScrollTop = dragPanel.scrollTop || 0;
      }
    }
    world.dev.panelScrollDrag = null;
  };

  panel.addEventListener('scroll', ()=>{
    if(world?.dev){
      world.dev.panelScrollTop = panel.scrollTop || 0;
      world.dev.panelScrollCarry = 0;
    }
  });

  const handleDevPanelWheel = (e)=>{
    if(!world?.dev?.enabled) return false;
    let targetPanel = resolveDevPanel(e.target);
    if(!targetPanel && typeof e.clientX === 'number' && typeof e.clientY === 'number'){
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      targetPanel = resolveDevPanel(hovered);
    }
    if(!targetPanel && panel.matches(':hover')){
      targetPanel = panel;
    }
    if(!targetPanel) return false;
    const deltaMode = typeof e.deltaMode === 'number' ? e.deltaMode : 0;
    const wheelEventCtor = typeof WheelEvent === 'function' ? WheelEvent : null;
    const lineMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_LINE : 1;
    const pageMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_PAGE : 2;
    let delta = e.deltaY || 0;
    if(deltaMode === lineMode){
      delta *= 24;
    }else if(deltaMode === pageMode){
      delta = delta > 0 ? targetPanel.clientHeight : -targetPanel.clientHeight;
    }
    if(!applyDevPanelScroll(targetPanel, delta)) return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  };

  panel.addEventListener('wheel', handleDevPanelWheel, { passive: false });
  document.addEventListener('wheel', (event)=>{
    const handled = handleDevPanelWheel(event);
    if(!handled && world?.dev?.panelScrollDrag) event.preventDefault();
  }, { passive: false });

  panel.addEventListener('mousedown', (e)=>{
    if(e.button !== 0) return;
    const target = e.target instanceof Element ? e.target : null;
    if(target && target.closest('button, input, select, textarea, label')) return;
    const activePanel = resolveDevPanel(target) || panel;
    if(activePanel.scrollHeight <= activePanel.clientHeight) return;
    world.dev.panelScrollDrag = { panel: activePanel, lastY: e.clientY };
    activePanel.classList.add('dragging');
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e)=>{
    const drag = world?.dev?.panelScrollDrag;
    if(!drag) return;
    const deltaY = e.clientY - (drag.lastY ?? e.clientY);
    if(deltaY !== 0){
      let dragPanel = drag.panel && panel.contains(drag.panel) ? drag.panel : panel;
      if(!dragPanel){
        dragPanel = panel;
        drag.panel = panel;
      }
      if(dragPanel && !dragPanel.classList.contains('dragging')){
        dragPanel.classList.add('dragging');
      }
      applyDevPanelScroll(dragPanel, deltaY);
    }
    drag.lastY = e.clientY;
    e.preventDefault();
  });

  document.addEventListener('mouseup', ()=>{
    if(world?.dev?.panelScrollDrag){
      releaseDevPanelScrollDrag();
    }
  });

  document.addEventListener('mouseleave', (e)=>{
    if(e.target === document && world?.dev?.panelScrollDrag){
      releaseDevPanelScrollDrag();
    }
  });

  window.addEventListener('blur', ()=>{
    if(world?.dev?.panelScrollDrag){
      releaseDevPanelScrollDrag();
    }
  });

  panel.addEventListener('click', (e)=>{
    const paletteButton = e.target.closest('[data-particle-select]');
    if(paletteButton){
      const selection = paletteButton.getAttribute('data-particle-select');
      handleDeveloperParticleSelect(world, selection);
      e.preventDefault();
      return;
    }
    const decorationButton = e.target.closest('[data-decoration-select]');
    if(decorationButton){
      const selection = decorationButton.getAttribute('data-decoration-select');
      handleDeveloperDecorationSelect(world, selection);
      e.preventDefault();
      return;
    }
    const timeButton = e.target.closest('[data-dev-time]');
    if(timeButton){
      const mode = timeButton.getAttribute('data-dev-time');
      if(mode === 'toggle') world.dev.timeFrozen = !world.dev.timeFrozen;
      else if(mode === 'freeze') world.dev.timeFrozen = true;
      else if(mode === 'resume') world.dev.timeFrozen = false;
      world.dev.panelDirty = true;
      e.preventDefault();
      return;
    }
    const toolButton = e.target.closest('[data-dev-tool]');
    if(toolButton){
      const tool = toolButton.getAttribute('data-dev-tool');
      if(tool){
        world.dev.tool = tool;
        world.dev.panelDirty = true;
      }
      e.preventDefault();
      return;
    }
    const grassActionButton = e.target.closest('[data-grass-action]');
    if(grassActionButton){
      const action = grassActionButton.getAttribute('data-grass-action');
      const indexAttr = grassActionButton.getAttribute('data-grass-index');
      handleDeveloperGrassAction(world, action, indexAttr);
      e.preventDefault();
      return;
    }
    const doorTargetButton = e.target.closest('[data-door-target]');
    if(doorTargetButton){
      const target = doorTargetButton.getAttribute('data-door-target');
      if(target){
        world.dev.doorTarget = target;
        world.dev.panelDirty = true;
      }
      e.preventDefault();
      return;
    }
    const brushButton = e.target.closest('[data-dev-brush]');
    if(brushButton){
      const brush = brushButton.getAttribute('data-dev-brush');
      if(brush){
        world.dev.brush = brush;
        world.dev.panelDirty = true;
      }
      e.preventDefault();
      return;
    }
    const shapeButton = e.target.closest('[data-brush-shape]');
    if(shapeButton){
      const shape = shapeButton.getAttribute('data-shape');
      if(shape){
        world.dev.fluidBrushShape = shape === 'square' ? 'square' : 'circle';
        world.dev.panelDirty = true;
      }
      e.preventDefault();
      return;
    }
    const powderModeButton = e.target.closest('[data-powder-mode]');
    if(powderModeButton){
      const mode = powderModeButton.getAttribute('data-powder-mode');
      if(mode){
        world.dev.powderBrushMaterial = mode;
        world.dev.panelDirty = true;
      }
      e.preventDefault();
      return;
    }
    const fluidButton = e.target.closest('[data-fluid-action]');
    if(fluidButton){
      const action = fluidButton.getAttribute('data-fluid-action');
      if(action){
        handleDeveloperFluidAction(world, action, fluidButton.getAttribute('data-fluid-index'));
      }
      e.preventDefault();
      return;
    }
    const actionButton = e.target.closest('[data-action]');
    if(actionButton){
      const action = actionButton.getAttribute('data-action');
      if(action === 'dev-export'){
        exportDeveloperLayout(world, false);
      }else if(action === 'dev-export-log'){
        exportDeveloperLayout(world, true);
      }else if(action === 'dev-add-col-left'){
        developerAddGridSpace(world, { left: 1 });
      }else if(action === 'dev-add-col-right'){
        developerAddGridSpace(world, { right: 1 });
      }else if(action === 'dev-add-row-top'){
        developerAddGridSpace(world, { top: 1 });
      }else if(action === 'dev-add-row-bottom'){
        developerAddGridSpace(world, { bottom: 1 });
      }else if(action === 'dev-clear-enemies'){
        if(world.dev.enemies.length){
          for(const enemy of world.dev.enemies){
            if(!enemy) continue;
            developerEnsureEnemyId(world, enemy);
            developerRemoveEnemyEntity(world, enemy.devId);
            developerRemoveEnemySpawn(world, enemy.devId);
          }
          world.dev.enemies = [];
          world.dev.enemiesDirty = true;
          world.dev.panelDirty = true;
          if(Array.isArray(world.levelState?.enemyPlacements)){
            world.levelState.enemyPlacements = [];
          }
        }
      }else if(action === 'dev-clear-weapons'){
        if(world.dev.layout?.weapons?.length){
          world.dev.layout.weapons = [];
          markDeveloperLayoutDirty(world);
          world.dev.panelDirty = true;
        }
      }else if(action === 'dev-clear-door'){
        const target = world.dev.doorTarget || 'entry';
        if(target === 'entry'){
          if(world.dev.layout?.entryDoor){
            world.dev.layout.entryDoor = null;
            markDeveloperLayoutDirty(world);
            world.dev.panelDirty = true;
          }
        }else if(target === 'exit'){
          if(world.dev.layout?.exitDoor){
            world.dev.layout.exitDoor = null;
            markDeveloperLayoutDirty(world);
            world.dev.panelDirty = true;
          }
        }
      }
      e.preventDefault();
    }
  });

  panel.addEventListener('change', (e)=>{
    const lockToggle = e.target.closest('input[data-dev-object-lock]');
    if(lockToggle){
      const axis = lockToggle.getAttribute('data-dev-object-lock');
      const checked = !!lockToggle.checked;
      if(axis === 'horizontal') world.dev.objectLockHorizontal = checked;
      else if(axis === 'vertical') world.dev.objectLockVertical = checked;
      world.dev.panelDirty = true;
      return;
    }
    const objectField = e.target.closest('[data-object-field]');
    if(objectField){
      handleDeveloperObjectField(world, objectField);
      return;
    }
    const objectAction = e.target.closest('[data-object-action]');
    if(objectAction){
      handleDeveloperObjectAction(world, objectAction);
      return;
    }
    const select = e.target.closest('select[data-dev-select]');
    if(select){
      const key = select.getAttribute('data-dev-select');
      const value = select.value;
      if(key === 'object'){
        world.dev.objectType = value;
      }else if(key === 'enemy'){
        world.dev.enemyKind = value;
      }else if(key === 'weapon'){
        world.dev.weaponId = value;
      }
      world.dev.panelDirty = true;
      return;
    }
    const blockStyleSelect = e.target.closest('select[data-block-style]');
    if(blockStyleSelect){
      const value = blockStyleSelect.value || 'meadow';
      if(value && value.startsWith('weakBlock:')){
        const entry = DEV_TERRAIN_BLOCK_STYLES.find(opt=>opt.id === value);
        if(entry?.weakBlock){
          world.dev.objectType = entry.weakBlock;
          world.dev.tool = 'objects';
          const levelDef = world.levelState?.def || null;
          const fallback = developerNormalizeTerrainStyle(world.dev.terrainBrushStyle)
            || developerNormalizeTerrainStyle(levelDef?.palette?.terrainStyle)
            || 'meadow';
          blockStyleSelect.value = fallback;
          world.dev.panelDirty = true;
        }
        return;
      }
      const levelDef = world.levelState?.def || null;
      const normalized = developerNormalizeTerrainStyle(value) || 'meadow';
      world.dev.terrainBrushStyle = normalized;
      if(levelDef){
        if(!levelDef.palette) levelDef.palette = {};
        levelDef.palette.terrainStyle = normalized;
      }
      world.dev.panelDirty = true;
      return;
    }
    const blockVariantSelect = e.target.closest('select[data-block-variant]');
    if(blockVariantSelect){
      const value = blockVariantSelect.value === 'alt' ? 'alt' : 'default';
      const levelDef = world.levelState?.def || null;
      if(levelDef){
        if(!levelDef.palette) levelDef.palette = {};
        delete levelDef.palette.blockVariant;
        if(value === 'alt') levelDef.palette.terrainVariant = 'alt';
        else delete levelDef.palette.terrainVariant;
        world.dev.panelDirty = true;
      }
      return;
    }
    const brushInput = e.target.closest('[data-fluid-brush]');
    if(brushInput){
      const scope = brushInput.getAttribute('data-fluid-brush');
      let value = Number(brushInput.value);
      if(Number.isFinite(value)){
        value = developerClampBrushSize(value);
        brushInput.value = value;
        if(scope === 'sand') world.dev.sandBrushSize = value;
        else if(scope === 'powder') world.dev.powderBrushSize = value;
        else if(scope === 'water') world.dev.waterBrushSize = value;
        else if(scope === 'lava') world.dev.lavaBrushSize = value;
        world.dev.panelDirty = true;
      }
      return;
    }
    const fluidField = e.target.closest('[data-fluid-field]');
    if(fluidField){
      handleDeveloperFluidField(world, fluidField);
      return;
    }
    const grassField = e.target.closest('[data-grass-field]');
    if(grassField){
      handleDeveloperGrassField(world, grassField);
      return;
    }
  });

  panel.addEventListener('input', (e)=>{
    const objectField = e.target.closest('[data-object-field]');
    if(objectField){
      handleDeveloperObjectField(world, objectField);
      return;
    }
    const brushInput = e.target.closest('[data-fluid-brush]');
    if(brushInput){
      const scope = brushInput.getAttribute('data-fluid-brush');
      let value = Number(brushInput.value);
      if(Number.isFinite(value)){
        value = developerClampBrushSize(value);
        if(scope === 'sand') world.dev.sandBrushSize = value;
        else if(scope === 'powder') world.dev.powderBrushSize = value;
        else if(scope === 'water') world.dev.waterBrushSize = value;
        else if(scope === 'lava') world.dev.lavaBrushSize = value;
        world.dev.panelDirty = true;
      }
      return;
    }
    const fluidField = e.target.closest('[data-fluid-field]');
    if(fluidField){
      handleDeveloperFluidField(world, fluidField);
      return;
    }
    const grassField = e.target.closest('[data-grass-field]');
    if(grassField){
      handleDeveloperGrassField(world, grassField);
    }
  });
}

function setDeveloperMode(world, enabled){
  if(!world || !world.dev) return;
  const next = !!enabled;
  if(world.dev.enabled === next) return;
  world.dev.enabled = next;
  if(world.dev.panel){
    if(next) world.dev.panel.classList.remove('hidden');
    else world.dev.panel.classList.add('hidden');
    if(!next) world.dev.panel.classList.remove('dragging');
  }
  if(!next) world.dev.fluidPainting = null;
  if(!next) world.dev.timeFrozen = false;
  if(!next) world.dev.pointerWorld = null;
  if(!next) world.dev.panelScrollDrag = null;
  if(!next) world.dev.panelScrollCarry = 0;
  world.dev.panelDirty = true;
  if(next){
    syncDeveloperStateFromWorld(world);
  }
}

function syncDeveloperStateFromWorld(world, compiledMeta){
  if(!world || !world.dev) return;
  const state = world.levelState;
  if(!state || !state.environmentLayout){
    world.dev.layout = null;
    world.dev.enemies = [];
    world.dev.cols = 0;
    world.dev.rows = 0;
    world.dev.tileSize = DEV_DEFAULT_TILE_SIZE;
    world.dev.offsetX = 0;
    world.dev.needsRebuild = false;
    world.dev.panelDirty = true;
    return;
  }
  world.dev.layout = cloneLayoutData(state.environmentLayout);
  world.dev.enemies = cloneEnemyPlacements(state.enemyPlacements || []);
  world.dev.pendingToggleLink = null;
  developerRefreshObjectIdCounter(world.dev);
  developerEnsureEnemyIds(world);
  world.dev.fluidPainting = null;
  world.dev.sandConfig = typeof cloneSandScene === 'function'
    ? cloneSandScene(state.sandScene)
    : (state.sandScene ? JSON.parse(JSON.stringify(state.sandScene)) : null);
  world.dev.powderConfig = typeof clonePowderScene === 'function'
    ? clonePowderScene(state.powderScene)
    : (state.powderScene ? JSON.parse(JSON.stringify(state.powderScene)) : null);
  world.dev.grassConfig = typeof cloneGrassScene === 'function'
    ? cloneGrassScene(state.grassScene)
    : (state.grassScene ? JSON.parse(JSON.stringify(state.grassScene)) : null);
  world.dev.waterConfig = typeof cloneWaterScene === 'function'
    ? cloneWaterScene(state.waterScene)
    : (state.waterScene ? JSON.parse(JSON.stringify(state.waterScene)) : null);
  world.dev.lavaConfig = typeof cloneLavaScene === 'function'
    ? cloneLavaScene(state.lavaScene)
    : (state.lavaScene ? JSON.parse(JSON.stringify(state.lavaScene)) : null);
  world.dev.sandDirty = false;
  world.dev.powderDirty = false;
  world.dev.grassDirty = false;
  world.dev.waterDirty = false;
  world.dev.lavaDirty = false;
  if(world.dev.sandConfig){
    world.dev.sandParticleMap = developerBuildFluidParticleMap(world, world.sand, world.dev.sandConfig, 'sand');
    developerSyncFluidConfigParticles(world, 'sand');
  }else{
    world.dev.sandParticleMap = new Map();
  }
  if(world.dev.powderConfig){
    world.dev.powderParticleMap = developerBuildPowderParticleMap(world, world.powder, world.dev.powderConfig);
    developerSyncPowderConfigParticles(world);
  }else{
    world.dev.powderParticleMap = new Map();
  }
  if(world.dev.grassConfig){
    // Grass currently uses baked data; no particle capture required.
  }
  if(world.dev.waterConfig){
    world.dev.waterParticleMap = developerBuildFluidParticleMap(world, world.water, world.dev.waterConfig, 'water');
    developerSyncFluidConfigParticles(world, 'water');
  }else{
    world.dev.waterParticleMap = new Map();
  }
  if(world.dev.lavaConfig){
    world.dev.lavaParticleMap = developerBuildFluidParticleMap(world, world.lava, world.dev.lavaConfig, 'lava');
    developerSyncFluidConfigParticles(world, 'lava');
  }else{
    world.dev.lavaParticleMap = new Map();
  }
  const paletteStyle = developerNormalizeTerrainStyle(world.levelState?.def?.palette?.terrainStyle);
  if(paletteStyle){
    world.dev.terrainBrushStyle = paletteStyle;
  }else if(!developerNormalizeTerrainStyle(world.dev.terrainBrushStyle)){
    world.dev.terrainBrushStyle = 'meadow';
  }
  if(compiledMeta){
    world.dev.tileSize = compiledMeta.tileSize;
    world.dev.cols = compiledMeta.cols;
    world.dev.rows = compiledMeta.rows;
    world.dev.offsetX = compiledMeta.offsetX;
  }
  if(world.dev.enabled){
    developerExpandLayoutForViewport(world);
  }
  world.dev.needsRebuild = true;
  world.dev.panelDirty = true;
}

function markDeveloperLayoutDirty(world){
  if(!world?.dev) return;
  world.dev.layoutDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperEnemiesDirty(world){
  if(!world?.dev) return;
  world.dev.enemiesDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperSandDirty(world){
  if(!world?.dev) return;
  world.dev.sandDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperPowderDirty(world){
  if(!world?.dev) return;
  world.dev.powderDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperGrassDirty(world){
  if(!world?.dev) return;
  world.dev.grassDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperWaterDirty(world){
  if(!world?.dev) return;
  world.dev.waterDirty = true;
  world.dev.needsRebuild = true;
}

function markDeveloperLavaDirty(world){
  if(!world?.dev) return;
  world.dev.lavaDirty = true;
  world.dev.needsRebuild = true;
}

function commitDeveloperState(world){
  if(!world || !world.dev) return;
  const dev = world.dev;
  if(!(dev.layoutDirty || dev.enemiesDirty || dev.needsRebuild)) return;
  const state = world.levelState;
  if(!state || !state.environmentLayout){
    dev.layoutDirty = false;
    dev.enemiesDirty = false;
    dev.needsRebuild = false;
    return;
  }

  if(dev.layoutDirty){
    state.environmentLayout = cloneLayoutData(dev.layout);
    dev.layout = cloneLayoutData(state.environmentLayout);
  }
  if(dev.enemiesDirty){
    state.enemyPlacements = cloneEnemyPlacements(dev.enemies);
    dev.enemies = cloneEnemyPlacements(state.enemyPlacements);
  }
  developerEnsureEnemyIds(world);

  const compiled = applyLayoutToWorld(world, state.environmentLayout, state.enemyPlacements, world.levelState?.screenIndex);
  world.terrain = compiled.terrain;
  world.decor = compiled.decor;
  world.terrainCells = {
    tileSize: compiled.tileSize,
    offsetX: compiled.offsetX,
    rows: compiled.rows,
    cols: compiled.cols,
    cells: state.environmentLayout.cells,
    background: state.environmentLayout.backgroundCells,
    styles: state.environmentLayout.terrainStyles,
    screenIndex: compiled.screenIndex
  };
  state.enemySpawnPoints = compiled.enemySpawns;
  const layoutMeta = {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    offsetX: compiled.offsetX,
    rows: compiled.rows,
    cols: compiled.cols,
    entryDoor: compiled.entryDoor,
    exitDoor: compiled.exitDoor,
    cameraZones: compiled.cameraZones || [],
    screenIndex: compiled.screenIndex
  };
  state.layoutMeta = layoutMeta;
  state.entryDoor = compiled.entryDoor;
  state.exitDoor = compiled.exitDoor;
  state.layoutWeapons = (compiled.weapons || []).filter(Boolean);
  refreshLayoutWeapons(world);
  syncWorldDoorFromState(world);

  if(dev.sandConfig){
    if(world.sand){
      developerCaptureFluidState(world, 'sand', { skipDirty: true });
    }else{
      developerSyncFluidConfigParticles(world, 'sand');
    }
  }
  if(dev.waterConfig){
    if(world.water){
      developerCaptureFluidState(world, 'water', { skipDirty: true });
    }else{
      developerSyncFluidConfigParticles(world, 'water');
    }
  }
  if(dev.powderConfig){
    if(world.powder){
      developerCaptureFluidState(world, 'powder', { skipDirty: true });
    }else{
      developerSyncPowderConfigParticles(world);
    }
  }
  if(dev.lavaConfig){
    if(world.lava){
      developerCaptureFluidState(world, 'lava', { skipDirty: true });
    }else{
      developerSyncFluidConfigParticles(world, 'lava');
    }
  }

  configureWorldSand(world, layoutMeta, dev.sandConfig);
  configureWorldPowder(world, layoutMeta, dev.powderConfig);
  configureWorldGrass(world, layoutMeta, dev.grassConfig);
  configureWorldWater(world, layoutMeta, dev.waterConfig);
  configureWorldLava(world, layoutMeta, dev.lavaConfig);

  if(dev.sandConfig){
    dev.sandParticleMap = developerBuildFluidParticleMap(world, world.sand, dev.sandConfig, 'sand');
    developerSyncFluidConfigParticles(world, 'sand');
    state.sandScene = typeof cloneSandScene === 'function'
      ? cloneSandScene(dev.sandConfig)
      : JSON.parse(JSON.stringify(dev.sandConfig));
  }else{
    dev.sandParticleMap = new Map();
    state.sandScene = null;
  }

  if(dev.powderConfig){
    dev.powderParticleMap = developerBuildPowderParticleMap(world, world.powder, dev.powderConfig);
    developerSyncPowderConfigParticles(world);
    state.powderScene = typeof clonePowderScene === 'function'
      ? clonePowderScene(dev.powderConfig)
      : JSON.parse(JSON.stringify(dev.powderConfig));
  }else{
    dev.powderParticleMap = new Map();
    state.powderScene = null;
  }

  if(dev.grassConfig){
    state.grassScene = typeof cloneGrassScene === 'function'
      ? cloneGrassScene(dev.grassConfig)
      : JSON.parse(JSON.stringify(dev.grassConfig));
  }else{
    state.grassScene = null;
  }

  if(dev.waterConfig){
    dev.waterParticleMap = developerBuildFluidParticleMap(world, world.water, dev.waterConfig, 'water');
    developerSyncFluidConfigParticles(world, 'water');
    state.waterScene = typeof cloneWaterScene === 'function'
      ? cloneWaterScene(dev.waterConfig)
      : JSON.parse(JSON.stringify(dev.waterConfig));
  }else{
    dev.waterParticleMap = new Map();
    state.waterScene = null;
  }

  if(dev.lavaConfig){
    dev.lavaParticleMap = developerBuildFluidParticleMap(world, world.lava, dev.lavaConfig, 'lava');
    developerSyncFluidConfigParticles(world, 'lava');
    state.lavaScene = typeof cloneLavaScene === 'function'
      ? cloneLavaScene(dev.lavaConfig)
      : JSON.parse(JSON.stringify(dev.lavaConfig));
  }else{
    dev.lavaParticleMap = new Map();
    state.lavaScene = null;
  }

  dev.tileSize = compiled.tileSize;
  dev.cols = compiled.cols;
  dev.rows = compiled.rows;
  dev.offsetX = compiled.offsetX;
  dev.layoutDirty = false;
  dev.enemiesDirty = false;
  dev.needsRebuild = false;
  dev.sandDirty = false;
  dev.powderDirty = false;
  dev.waterDirty = false;
  dev.lavaDirty = false;
  dev.grassDirty = false;
  dev.panelDirty = true;
}

function handleDeveloperResize(world){
  if(!world?.dev) return;
  if(world.levelState?.environmentLayout){
    if(world.dev.enabled){
      developerExpandLayoutForViewport(world);
    }
    world.dev.needsRebuild = true;
  }
}

function developerCellFromPoint(world, pos){
  const dev = world?.dev;
  if(!dev || !dev.layout) return null;
  const meta = world?.levelState?.layoutMeta || null;
  const tileSize = dev.tileSize || meta?.tileSize || DEV_DEFAULT_TILE_SIZE;
  const rows = dev.rows || meta?.rows || dev.layout.rows;
  const cols = dev.cols || meta?.cols || dev.layout.cols;
  const offsetX = (dev.offsetX ?? meta?.offsetX ?? 0) || 0;
  const relX = pos.x - offsetX;
  if(relX < 0 || relX >= cols * tileSize) return null;
  const col = Math.floor(relX / tileSize);
  const relY = world.groundY - pos.y;
  const row = rows - 1 - Math.floor(relY / tileSize);
  if(row < 0 || row >= rows) return null;
  return { col, row };
}

function developerColumnFromPoint(world, pos){
  const dev = world?.dev;
  if(!dev || !dev.layout || !pos) return null;
  const meta = world?.levelState?.layoutMeta || null;
  const tileSize = dev.tileSize || meta?.tileSize || DEV_DEFAULT_TILE_SIZE;
  const cols = dev.cols || meta?.cols || dev.layout.cols || 0;
  if(cols <= 0 || tileSize <= 0) return null;
  const offsetX = dev.offsetX || meta?.offsetX || 0;
  const relX = pos.x - offsetX;
  if(!Number.isFinite(relX)) return null;
  if(relX < 0 || relX >= cols * tileSize) return null;
  return clamp(Math.floor(relX / tileSize), 0, cols - 1);
}

function developerRowFromPoint(world, pos){
  const dev = world?.dev;
  if(!dev || !dev.layout || !pos) return 0;
  const meta = world?.levelState?.layoutMeta || null;
  const tileSize = dev.tileSize || meta?.tileSize || DEV_DEFAULT_TILE_SIZE;
  const rows = dev.rows || meta?.rows || dev.layout.rows || 0;
  if(rows <= 0 || tileSize <= 0) return 0;
  const relY = world.groundY - pos.y;
  let row = rows - 1 - Math.floor(relY / tileSize);
  if(!Number.isFinite(row)) row = rows - 1;
  return clamp(row, 0, rows - 1);
}

function developerFindSurfaceRowBelow(world, layout, col, guessRow){
  if(!world || !layout || !Array.isArray(layout.cells)) return null;
  const rows = layout.rows || layout.cells.length || 0;
  if(rows <= 0) return null;
  const safeCol = clamp(Math.round(col ?? 0), 0, Math.max(0, (layout.cols || (layout.cells[0]?.length ?? 1)) - 1));
  const startRow = clamp(Math.round(guessRow ?? 0), 0, rows - 1);
  const cells = layout.cells;
  let supportRow = null;
  for(let r = startRow; r < rows; r++){
    if(cells[r]?.[safeCol]){
      supportRow = r;
      while(supportRow > 0 && cells[supportRow-1]?.[safeCol]) supportRow--;
      break;
    }
  }
  if(supportRow === null){
    return { placementRow: rows - 1, supportRow: null };
  }
  const placementRow = Math.max(0, supportRow - 1);
  return { placementRow, supportRow };
}

function developerCellFromPlayer(world){
  const dev = world?.dev;
  if(!dev || !dev.layout) return null;
  const stick = world?.selected;
  if(!stick || typeof stick.center !== 'function') return null;
  const center = stick.center();
  if(!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) return null;
  return developerCellFromPoint(world, center);
}

function developerResolveDefaultCell(world){
  const dev = world?.dev;
  if(!dev || !dev.layout) return null;
  if(dev.hoverCell && Number.isInteger(dev.hoverCell.col) && Number.isInteger(dev.hoverCell.row)){
    return { col: dev.hoverCell.col, row: dev.hoverCell.row };
  }
  const playerCell = developerCellFromPlayer(world);
  if(playerCell) return playerCell;
  const meta = world?.levelState?.layoutMeta || null;
  const cols = Math.max(0, dev.cols || meta?.cols || dev.layout.cols || 0);
  const rows = Math.max(0, dev.rows || meta?.rows || dev.layout.rows || 0);
  if(cols <= 0 || rows <= 0) return { col: 0, row: 0 };
  const col = clamp(Math.round(cols * 0.5), 0, Math.max(0, cols - 1));
  const row = clamp(rows - 1, 0, Math.max(0, rows - 1));
  return { col, row };
}

function developerFindSurfaceRow(layout, col, guessRow){
  if(!layout) return null;
  const rows = layout.rows;
  const cells = layout.cells;
  let row = clamp(guessRow, 0, rows - 1);
  for(let r = row; r < rows; r++){
    if(cells[r][col]){
      while(r > 0 && cells[r-1][col]) r--;
      return r;
    }
  }
  for(let r = row - 1; r >= 0; r--){
    if(cells[r][col]){
      while(r > 0 && cells[r-1][col]) r--;
      return r;
    }
  }
  return rows - 1;
}

function developerComputeEnemyOffset(world, col, row, pointer){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout) return { offsetX: 0, offsetY: 0 };
  const tileSize = dev.tileSize || layout.tileSize || DEV_DEFAULT_TILE_SIZE;
  const tileScale = layout.tileScale ?? (layout.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const rows = dev.rows || layout.rows || 0;
  const offsetX = dev.offsetX || 0;
  const safeCol = clamp(Math.round(col ?? 0), 0, Math.max(0, (dev.cols || layout.cols || 1) - 1));
  const safeRow = clamp(Math.round(row ?? 0), 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + safeCol * tileSize;
  const tileTop = world.groundY - (rows - safeRow) * tileSize;
  const centerX = tileLeft + tileSize * 0.5;
  const centerY = tileTop + tileSize * 0.5;
  if(!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)){
    return { offsetX: 0, offsetY: 0 };
  }
  const offsetXUnits = Math.round((pointer.x - centerX) / tileScale);
  const offsetYUnits = Math.round((pointer.y - centerY) / tileScale);
  return { offsetX: offsetXUnits, offsetY: offsetYUnits };
}

function developerEnsureBackgroundCells(layout){
  if(!layout || !Array.isArray(layout.cells)) return;
  const rows = layout.rows || layout.cells.length || 0;
  const cols = layout.cols || (layout.cells[0]?.length || 0);
  if(!Array.isArray(layout.backgroundCells)) layout.backgroundCells = [];
  for(let rowIndex = 0; rowIndex < rows; rowIndex++){
    const sourceRow = Array.isArray(layout.backgroundCells[rowIndex]) ? layout.backgroundCells[rowIndex] : [];
    const normalized = [];
    for(let colIndex = 0; colIndex < cols; colIndex++){
      normalized[colIndex] = !!sourceRow[colIndex];
    }
    layout.backgroundCells[rowIndex] = normalized;
  }
  layout.backgroundCells.length = rows;
}

function developerNormalizeTerrainStyle(value){
  if(typeof normalizeTerrainStyleId === 'function'){
    return normalizeTerrainStyleId(value);
  }
  if(value === undefined || value === null) return null;
  const str = String(value).trim();
  if(!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
  return str;
}

function developerEnsureTerrainStyles(layout){
  if(!layout || !Array.isArray(layout.cells)) return;
  const rows = layout.rows || layout.cells.length || 0;
  const cols = layout.cols || (layout.cells[0]?.length || 0);
  if(!Array.isArray(layout.terrainStyles)) layout.terrainStyles = [];
  for(let rowIndex = 0; rowIndex < rows; rowIndex++){
    const sourceRow = Array.isArray(layout.terrainStyles[rowIndex]) ? layout.terrainStyles[rowIndex] : [];
    const normalized = [];
    for(let colIndex = 0; colIndex < cols; colIndex++){
      normalized[colIndex] = developerNormalizeTerrainStyle(sourceRow[colIndex]);
    }
    layout.terrainStyles[rowIndex] = normalized;
  }
  layout.terrainStyles.length = rows;
}

function developerFluidTileKey(type){
  switch(type){
    case 'sand':
      return 'sandTiles';
    case 'lava':
      return 'lavaTiles';
    default:
      return 'waterTiles';
  }
}

function developerEnsureFluidTiles(layout, type){
  if(!layout) return [];
  const key = developerFluidTileKey(type);
  if(!Array.isArray(layout[key])) layout[key] = [];
  return layout[key];
}

function developerFluidTileWidth(tile){
  return Math.max(1, Math.round(tile?.width ?? tile?.cols ?? 1));
}

function developerFluidTileHeight(tile){
  return Math.max(1, Math.round(tile?.height ?? tile?.rows ?? tile?.depth ?? 1));
}

function developerSetFluidTileWidth(tile, width){
  if(!tile) return;
  if('width' in tile) tile.width = width;
  else if('cols' in tile) tile.cols = width;
  else tile.width = width;
}

function developerSetFluidTileHeight(tile, height){
  if(!tile) return;
  if('height' in tile) tile.height = height;
  else if('rows' in tile) tile.rows = height;
  else if('depth' in tile) tile.depth = height;
  else tile.height = height;
}

function developerClampFluidTile(tile, maxCol, maxRow){
  if(!tile) return;
  const cappedCol = clamp(Math.round(tile.col ?? 0), 0, maxCol);
  const cappedRow = clamp(Math.round(tile.row ?? 0), 0, maxRow);
  let width = developerFluidTileWidth(tile);
  let height = developerFluidTileHeight(tile);
  const maxWidth = Math.max(1, maxCol - cappedCol + 1);
  if(width > maxWidth) width = maxWidth;
  const maxHeight = Math.max(1, cappedRow + 1);
  if(height > maxHeight) height = maxHeight;
  tile.col = cappedCol;
  tile.row = cappedRow;
  developerSetFluidTileWidth(tile, width);
  developerSetFluidTileHeight(tile, height);
}

function developerShiftFluidTiles(layout, type, deltaCol, deltaRow, maxCol, maxRow){
  const tiles = developerEnsureFluidTiles(layout, type);
  if(!tiles.length) return;
  const colShift = Number.isFinite(deltaCol) ? Math.round(deltaCol) : 0;
  const rowShift = Number.isFinite(deltaRow) ? Math.round(deltaRow) : 0;
  for(const tile of tiles){
    if(!tile) continue;
    if(colShift) tile.col = Math.round(tile.col ?? 0) + colShift;
    if(rowShift) tile.row = Math.round(tile.row ?? 0) + rowShift;
    if(Number.isFinite(maxCol) && Number.isFinite(maxRow)){
      developerClampFluidTile(tile, maxCol, maxRow);
    }
  }
  if(Number.isFinite(maxCol) && Number.isFinite(maxRow)){
    for(let i=tiles.length-1; i>=0; i--){
      const tile = tiles[i];
      if(!tile){
        tiles.splice(i, 1);
        continue;
      }
      if(tile.col < 0 || tile.col > maxCol || tile.row < 0 || tile.row > maxRow){
        tiles.splice(i, 1);
      }
    }
  }
}

function developerFluidTileCoversCell(tile, col, row){
  if(!tile) return false;
  const baseCol = Math.round(tile.col ?? 0);
  const baseRow = Math.round(tile.row ?? 0);
  const width = developerFluidTileWidth(tile);
  const height = developerFluidTileHeight(tile);
  const minCol = baseCol;
  const maxCol = baseCol + width - 1;
  const minRow = Math.max(0, baseRow - (height - 1));
  const maxRow = baseRow;
  return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
}

function developerRemoveFluidTiles(layout, type, col, row){
  const tiles = developerEnsureFluidTiles(layout, type);
  let removed = false;
  for(let i=tiles.length-1; i>=0; i--){
    const tile = tiles[i];
    if(developerFluidTileCoversCell(tile, col, row)){
      tiles.splice(i, 1);
      removed = true;
    }
  }
  return removed;
}

function developerApplyFluidTilesToGrid(grid, entries, symbol){
  if(!Array.isArray(grid) || !grid.length) return;
  if(!Array.isArray(entries) || !entries.length) return;
  const rows = grid.length;
  const cols = Array.isArray(grid[0]) ? grid[0].length : 0;
  if(!cols) return;
  for(const tile of entries){
    if(!tile) continue;
    const baseCol = clamp(Math.round(tile.col ?? 0), 0, Math.max(0, cols - 1));
    const baseRow = clamp(Math.round(tile.row ?? 0), 0, Math.max(0, rows - 1));
    const widthTiles = developerFluidTileWidth(tile);
    const heightTiles = developerFluidTileHeight(tile);
    const spanCols = Math.min(widthTiles, Math.max(1, cols - baseCol));
    const spanRows = Math.min(heightTiles, Math.max(1, baseRow + 1));
    for(let dc=0; dc<spanCols; dc++){
      const col = baseCol + dc;
      if(col < 0 || col >= cols) continue;
      for(let dr=0; dr<spanRows; dr++){
        const row = baseRow - dr;
        if(row < 0 || row >= rows) continue;
        grid[row][col] = symbol;
      }
    }
  }
}

function developerNormalizeFluidTilesForExport(entries){
  if(!Array.isArray(entries) || !entries.length) return [];
  const normalized = [];
  for(const tile of entries){
    if(!tile) continue;
    normalized.push({
      col: Math.round(tile.col ?? 0),
      row: Math.round(tile.row ?? 0),
      width: developerFluidTileWidth(tile),
      height: developerFluidTileHeight(tile)
    });
  }
  return normalized;
}

function normalizeDeveloperBrush(brush){
  if(brush === 'add') return 'foregroundAdd';
  if(brush === 'erase') return 'foregroundErase';
  if(typeof brush !== 'string') return 'foregroundAdd';
  return brush;
}

function developerEnsureLayout(world){
  const dev = world?.dev;
  if(!dev || !dev.layout) return false;
  const layout = dev.layout;
  if(!layout.cells || !layout.cells.length) return false;
  developerEnsureBackgroundCells(layout);
  developerEnsureTerrainStyles(layout);
  developerEnsureFluidTiles(layout, 'water');
  developerEnsureFluidTiles(layout, 'sand');
  developerEnsureFluidTiles(layout, 'lava');
  if(!Array.isArray(layout.objects)) layout.objects = [];
  if(!Array.isArray(layout.weapons)) layout.weapons = [];
  if(!Array.isArray(dev.enemies)) dev.enemies = [];
  if(layout.entryDoor === undefined) layout.entryDoor = null;
  if(layout.exitDoor === undefined) layout.exitDoor = null;
  if(!dev.weaponId && DEV_WEAPON_TYPES.length){
    dev.weaponId = DEV_WEAPON_TYPES[0].id;
  }
  return true;
}

function developerExpandLayoutForViewport(world){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout || !Array.isArray(layout.cells)) return;
  developerEnsureBackgroundCells(layout);
  developerEnsureTerrainStyles(layout);
  developerEnsureFluidTiles(layout, 'water');
  developerEnsureFluidTiles(layout, 'sand');
  developerEnsureFluidTiles(layout, 'lava');
  const tileSize = layout.tileSize || DEV_DEFAULT_TILE_SIZE;
  const currentCols = Math.max(0, layout.cols || 0);
  const currentRows = Math.max(0, layout.rows || 0);
  const worldWidth = Math.max(0, Math.floor(world?.width || 0));
  const groundSpan = Math.max(0, Math.floor(world?.groundY || world?.height || 0));
  const targetCols = Math.max(currentCols, Math.ceil(worldWidth / tileSize) || 0);
  const targetRows = Math.max(currentRows, Math.ceil(groundSpan / tileSize) || 0);
  const colsToAdd = targetCols - currentCols;
  const rowsToAdd = targetRows - currentRows;
  if(colsToAdd <= 0 && rowsToAdd <= 0){
    dev.cols = targetCols;
    dev.rows = targetRows;
    dev.offsetX = normalizeDeveloperOffset(world, dev.offsetX, targetCols, tileSize);
    return;
  }
  if(!Array.isArray(layout.objects)) layout.objects = [];
  if(!Array.isArray(layout.weapons)) layout.weapons = [];
  if(!Array.isArray(dev.enemies)) dev.enemies = [];
  let leftCols = 0;
  let rightCols = 0;
  if(colsToAdd > 0){
    const desiredLeft = Math.round(developerViewportOffset(world, currentCols, tileSize) / tileSize);
    leftCols = clamp(desiredLeft, 0, colsToAdd);
    rightCols = colsToAdd - leftCols;
    const newCols = currentCols + colsToAdd;
    const maxCol = Math.max(0, newCols - 1);
    const applyColShift = (item)=>{
      if(item && typeof item.col === 'number'){
        item.col = Math.min(Math.max(0, item.col + leftCols), maxCol);
      }
    };
    if(leftCols > 0){
      for(let rowIndex = 0; rowIndex < layout.cells.length; rowIndex++){
        const row = layout.cells[rowIndex];
        const backgroundRow = layout.backgroundCells?.[rowIndex];
        for(let i=0; i<leftCols; i++){
          row.unshift(false);
          if(backgroundRow) backgroundRow.unshift(false);
        }
      }
      layout.objects.forEach(applyColShift);
      layout.weapons.forEach(applyColShift);
      dev.enemies.forEach(applyColShift);
      if(Array.isArray(layout.cameraZones)) layout.cameraZones.forEach(applyColShift);
      applyColShift(layout.entryDoor);
      applyColShift(layout.exitDoor);
    }
    if(rightCols > 0){
      for(let rowIndex = 0; rowIndex < layout.cells.length; rowIndex++){
        const row = layout.cells[rowIndex];
        const backgroundRow = layout.backgroundCells?.[rowIndex];
        for(let i=0; i<rightCols; i++){
          row.push(false);
          if(backgroundRow) backgroundRow.push(false);
        }
      }
    }
    layout.cols = newCols;
  }
  if(rowsToAdd > 0){
    const template = ()=>Array.from({ length: layout.cols }, ()=>false);
    const backgroundTemplate = ()=>Array.from({ length: layout.cols }, ()=>false);
    for(let i=0; i<rowsToAdd; i++){
      layout.cells.unshift(template());
      if(Array.isArray(layout.backgroundCells)) layout.backgroundCells.unshift(backgroundTemplate());
    }
    const clampMax = Math.max(0, targetRows - 1);
    const shiftRow = (item)=>{
      if(item && typeof item.row === 'number'){
        const nextRow = item.row + rowsToAdd;
        item.row = Math.min(Math.max(0, nextRow), clampMax);
      }
    };
    layout.objects.forEach(shiftRow);
    layout.weapons.forEach(shiftRow);
    dev.enemies.forEach(shiftRow);
    if(Array.isArray(layout.cameraZones)) layout.cameraZones.forEach(shiftRow);
    shiftRow(layout.entryDoor);
    shiftRow(layout.exitDoor);
  }
  layout.rows = targetRows;
  const maxCol = Math.max(0, layout.cols - 1);
  const maxRow = Math.max(0, layout.rows - 1);
  if(leftCols || rowsToAdd || rightCols){
    developerShiftFluidTiles(layout, 'water', leftCols, rowsToAdd, maxCol, maxRow);
    developerShiftFluidTiles(layout, 'sand', leftCols, rowsToAdd, maxCol, maxRow);
    developerShiftFluidTiles(layout, 'lava', leftCols, rowsToAdd, maxCol, maxRow);
  }else{
    developerShiftFluidTiles(layout, 'water', 0, 0, maxCol, maxRow);
    developerShiftFluidTiles(layout, 'sand', 0, 0, maxCol, maxRow);
    developerShiftFluidTiles(layout, 'lava', 0, 0, maxCol, maxRow);
  }
  dev.cols = layout.cols;
  dev.rows = layout.rows;
  dev.offsetX = normalizeDeveloperOffset(world, dev.offsetX, dev.cols, tileSize);
  markDeveloperLayoutDirty(world);
  if(rowsToAdd > 0) markDeveloperEnemiesDirty(world);
  dev.panelDirty = true;
}

function developerAddGridSpace(world, adjustments){
  if(!world?.dev) return;
  const dev = world.dev;
  const layout = dev.layout;
  if(!layout || !Array.isArray(layout.cells)) return;
  developerEnsureBackgroundCells(layout);
  developerEnsureTerrainStyles(layout);
  developerEnsureFluidTiles(layout, 'water');
  developerEnsureFluidTiles(layout, 'sand');
  developerEnsureFluidTiles(layout, 'lava');
  const addLeft = Math.max(0, Math.round(Number(adjustments?.left ?? 0)));
  const addRight = Math.max(0, Math.round(Number(adjustments?.right ?? 0)));
  const addTop = Math.max(0, Math.round(Number(adjustments?.top ?? 0)));
  const addBottom = Math.max(0, Math.round(Number(adjustments?.bottom ?? 0)));
  if(!(addLeft || addRight || addTop || addBottom)) return;
  if(!Array.isArray(layout.objects)) layout.objects = [];
  if(!Array.isArray(layout.weapons)) layout.weapons = [];
  if(!Array.isArray(dev.enemies)) dev.enemies = [];
  if(!Array.isArray(layout.cameraZones)) layout.cameraZones = [];
  const initialCols = layout.cols || (layout.cells[0]?.length ?? 0);
  const initialRows = layout.rows || layout.cells.length || 0;
  const tileSize = dev.tileSize || layout.tileSize || DEV_DEFAULT_TILE_SIZE;

  if(addLeft){
    for(let rowIndex = 0; rowIndex < layout.cells.length; rowIndex++){
      const row = layout.cells[rowIndex];
      const backgroundRow = layout.backgroundCells?.[rowIndex];
      const styleRow = layout.terrainStyles?.[rowIndex];
      for(let i=0; i<addLeft; i++){
        row.unshift(false);
        if(backgroundRow) backgroundRow.unshift(false);
        if(styleRow) styleRow.unshift(null);
      }
    }
  }
  if(addRight){
    for(let rowIndex = 0; rowIndex < layout.cells.length; rowIndex++){
      const row = layout.cells[rowIndex];
      const backgroundRow = layout.backgroundCells?.[rowIndex];
      const styleRow = layout.terrainStyles?.[rowIndex];
      for(let i=0; i<addRight; i++){
        row.push(false);
        if(backgroundRow) backgroundRow.push(false);
        if(styleRow) styleRow.push(null);
      }
    }
  }
  const newCols = Math.max(0, initialCols + addLeft + addRight);
  layout.cols = newCols;
  const maxCol = Math.max(0, newCols - 1);
  const shiftColumns = addLeft > 0;
  const adjustCol = (item, shift)=>{
    if(!item || typeof item.col !== 'number') return;
    let next = Math.round(item.col);
    if(shift) next += addLeft;
    item.col = clamp(next, 0, maxCol);
  };
  const clampColOnly = (item)=>adjustCol(item, false);
  if(shiftColumns){
    layout.objects.forEach(entry=>adjustCol(entry, true));
    layout.weapons.forEach(entry=>adjustCol(entry, true));
    dev.enemies.forEach(entry=>adjustCol(entry, true));
    layout.cameraZones.forEach(entry=>adjustCol(entry, true));
    adjustCol(layout.entryDoor, true);
    adjustCol(layout.exitDoor, true);
  }else{
    layout.objects.forEach(clampColOnly);
    layout.weapons.forEach(clampColOnly);
    dev.enemies.forEach(clampColOnly);
    layout.cameraZones.forEach(clampColOnly);
    clampColOnly(layout.entryDoor);
    clampColOnly(layout.exitDoor);
  }

  const createRow = ()=>Array.from({ length: newCols }, ()=>false);
  const createBackgroundRow = ()=>Array.from({ length: newCols }, ()=>false);
  const createStyleRow = ()=>Array.from({ length: newCols }, ()=>null);
  if(addTop){
    for(let i=0; i<addTop; i++){
      layout.cells.unshift(createRow());
      if(Array.isArray(layout.backgroundCells)) layout.backgroundCells.unshift(createBackgroundRow());
      if(Array.isArray(layout.terrainStyles)) layout.terrainStyles.unshift(createStyleRow());
    }
  }
  if(addBottom){
    for(let i=0; i<addBottom; i++){
      layout.cells.push(createRow());
      if(Array.isArray(layout.backgroundCells)) layout.backgroundCells.push(createBackgroundRow());
      if(Array.isArray(layout.terrainStyles)) layout.terrainStyles.push(createStyleRow());
    }
  }
  const newRows = layout.cells.length;
  layout.rows = newRows;
  const maxRow = Math.max(0, newRows - 1);
  const shiftRows = addTop > 0;
  const adjustRow = (item, shift)=>{
    if(!item || typeof item.row !== 'number') return;
    let next = Math.round(item.row);
    if(shift) next += addTop;
    item.row = clamp(next, 0, maxRow);
  };
  const clampRowOnly = (item)=>adjustRow(item, false);
  if(shiftRows){
    layout.objects.forEach(entry=>adjustRow(entry, true));
    layout.weapons.forEach(entry=>adjustRow(entry, true));
    dev.enemies.forEach(entry=>adjustRow(entry, true));
    layout.cameraZones.forEach(entry=>adjustRow(entry, true));
    adjustRow(layout.entryDoor, true);
    adjustRow(layout.exitDoor, true);
  }else{
    layout.objects.forEach(clampRowOnly);
    layout.weapons.forEach(clampRowOnly);
    dev.enemies.forEach(clampRowOnly);
    layout.cameraZones.forEach(clampRowOnly);
    clampRowOnly(layout.entryDoor);
    clampRowOnly(layout.exitDoor);
  }

  const colShift = shiftColumns ? addLeft : 0;
  const rowShift = shiftRows ? addTop : 0;
  developerShiftFluidTiles(layout, 'water', colShift, rowShift, maxCol, maxRow);
  developerShiftFluidTiles(layout, 'sand', colShift, rowShift, maxCol, maxRow);
  developerShiftFluidTiles(layout, 'lava', colShift, rowShift, maxCol, maxRow);
  dev.cols = newCols;
  dev.rows = newRows;
  dev.offsetX = normalizeDeveloperOffset(world, dev.offsetX, newCols, tileSize);
  markDeveloperLayoutDirty(world);
  if(shiftColumns || shiftRows) markDeveloperEnemiesDirty(world);
  dev.panelDirty = true;
  if(shiftColumns || shiftRows) developerResummonAllEnemies(world);
}

function developerViewportOffset(world, cols, tileSize){
  const width = Math.max(0, Math.floor(world?.width || 0));
  const total = Math.max(0, Math.floor(cols * (tileSize || 0)));
  if(total <= 0) return 0;
  return Math.max(0, Math.floor((width - total) / 2));
}

function normalizeDeveloperOffset(world, offset, cols, tileSize){
  const width = Math.max(0, Math.floor(world?.width || 0));
  const total = Math.max(0, Math.floor(cols * (tileSize || 0)));
  const maxOffset = Math.max(0, width - total);
  if(!Number.isFinite(offset)){
    return developerViewportOffset(world, cols, tileSize);
  }
  return clamp(Math.round(offset), 0, maxOffset);
}

function handleDeveloperPointer(world, phase, event, pos){
  const dev = world?.dev;
  if(!dev || !dev.enabled || world.state !== 'level') return false;
  if(!developerEnsureLayout(world)) return false;
  if(phase === 'leave'){
    dev.pointerWorld = null;
    dev.hoverCell = null;
    developerStopFluidBrush(world);
    dev.painting = false;
    dev.paintLayer = 'foreground';
    return true;
  }
  if((phase === 'move' || phase === 'down' || phase === 'up') && pos){
    dev.pointerWorld = { x: pos.x, y: pos.y };
  }
  const layout = dev.layout;
  if(phase === 'move'){
    dev.hoverCell = developerCellFromPoint(world, pos);
    if(dev.painting && dev.tool === 'terrain' && dev.hoverCell){
      if(dev.paintLayer === 'background') developerPaintBackground(world, dev.hoverCell.col, dev.hoverCell.row, dev.paintValue);
      else if(dev.paintLayer === 'water') developerPaintWaterTile(world, dev.hoverCell.col, dev.hoverCell.row, dev.paintValue);
      else developerPaintTerrain(world, dev.hoverCell.col, dev.hoverCell.row, dev.paintValue);
    }
    if(dev.fluidPainting && dev.fluidPainting.type){
      const fluidType = dev.fluidPainting.type;
      if(fluidType === 'sand' || fluidType === 'water' || fluidType === 'powder' || fluidType === 'lava'){
        developerApplyFluidBrush(world, fluidType, pos, !!dev.fluidPainting.erase);
      }
    }
    if(dev.dragging){
      developerUpdateDrag(world, pos);
    }
    return true;
  }
  if(phase === 'down'){
    if(dev.tool === 'terrain'){
      const cell = developerCellFromPoint(world, pos);
      if(!cell) return true;
      const brush = normalizeDeveloperBrush(dev.brush);
      if(brush === 'waterAdd' || brush === 'waterErase'){
        const defaultAdd = brush === 'waterAdd';
        const value = event.button === 2 ? false : defaultAdd;
        dev.painting = true;
        dev.paintLayer = 'water';
        dev.paintValue = value;
        developerPaintWaterTile(world, cell.col, cell.row, value);
      }else{
        const layer = brush.startsWith('background') ? 'background' : 'foreground';
        const defaultAdd = brush.endsWith('Add');
        const value = event.button === 2 ? false : defaultAdd;
        dev.painting = true;
        dev.paintLayer = layer;
        dev.paintValue = value;
        if(layer === 'background') developerPaintBackground(world, cell.col, cell.row, value);
        else developerPaintTerrain(world, cell.col, cell.row, value);
      }
      return true;
    }
    if(dev.tool === 'sand'){
      const erase = event.button === 2;
      developerStartFluidBrush(world, 'sand', pos, erase);
      return true;
    }
    if(dev.tool === 'powder'){
      const erase = event.button === 2;
      developerStartFluidBrush(world, 'powder', pos, erase);
      return true;
    }
    if(dev.tool === 'water'){
      const erase = event.button === 2;
      developerStartFluidBrush(world, 'water', pos, erase);
      return true;
    }
    if(dev.tool === 'lava'){
      const erase = event.button === 2;
      developerStartFluidBrush(world, 'lava', pos, erase);
      return true;
    }
    if(dev.tool === 'objects'){
      if(developerHandleObjectPointer(world, event, pos, 'down')) return true;
      return true;
    }
    if(dev.tool === 'enemies'){
      if(developerHandleEnemyPointer(world, event, pos, 'down')) return true;
      return true;
    }
    if(dev.tool === 'weapons'){
      if(developerHandleWeaponPointer(world, event, pos, 'down')) return true;
      return true;
    }
    if(dev.tool === 'doors'){
      if(developerHandleDoorPointer(world, event, pos, 'down')) return true;
      return true;
    }
    return true;
  }
  if(phase === 'up'){
    if(dev.tool === 'terrain'){
      dev.painting = false;
      dev.paintLayer = 'foreground';
      return true;
    }
    if(dev.fluidPainting){
      developerStopFluidBrush(world);
    }
    if(dev.tool === 'sand' || dev.tool === 'water' || dev.tool === 'powder' || dev.tool === 'lava'){
      return true;
    }
    if(dev.dragging){
      developerFinishDrag(world);
      return true;
    }
    if(dev.tool === 'objects'){
      developerHandleObjectPointer(world, event, pos, 'up');
      return true;
    }
    if(dev.tool === 'enemies'){
      developerHandleEnemyPointer(world, event, pos, 'up');
      return true;
    }
    if(dev.tool === 'weapons'){
      developerHandleWeaponPointer(world, event, pos, 'up');
      return true;
    }
    if(dev.tool === 'doors'){
      developerHandleDoorPointer(world, event, pos, 'up');
      return true;
    }
    return true;
  }
  return false;
}

function developerPaintTerrain(world, col, row, value){
  const dev = world.dev;
  if(!dev?.layout?.cells) return;
  const layout = dev.layout;
  const rows = layout.rows || layout.cells.length || 0;
  const cols = layout.cols || (layout.cells[0]?.length || 0);
  if(row < 0 || row >= rows || col < 0 || col >= cols) return;
  developerEnsureTerrainStyles(layout);
  const cellsRow = layout.cells[row];
  const stylesRow = layout.terrainStyles?.[row];
  const prevSolid = cellsRow[col];
  const prevStyle = stylesRow ? developerNormalizeTerrainStyle(stylesRow[col]) : null;
  const paletteStyle = developerNormalizeTerrainStyle(world.levelState?.def?.palette?.terrainStyle);
  const brushStyle = developerNormalizeTerrainStyle(dev.terrainBrushStyle) || paletteStyle || 'meadow';
  const nextStyle = value ? brushStyle : null;
  const storeStyle = value && paletteStyle && brushStyle === paletteStyle ? null : nextStyle;
  if(prevSolid === value && prevStyle === (storeStyle ? developerNormalizeTerrainStyle(storeStyle) : null)) return;
  cellsRow[col] = value;
  if(stylesRow) stylesRow[col] = storeStyle;
  if(value){
    if(developerRemoveFluidTiles(layout, 'water', col, row)){
      dev.panelDirty = true;
    }
  }
  markDeveloperLayoutDirty(world);
}

function developerPaintWaterTile(world, col, row, value){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout || !Array.isArray(layout.cells)) return;
  const rows = layout.rows || layout.cells.length || 0;
  const cols = layout.cols || (layout.cells[0]?.length || 0);
  if(row < 0 || row >= rows || col < 0 || col >= cols) return;
  developerEnsureTerrainStyles(layout);
  developerEnsureFluidTiles(layout, 'water');
  let changed = false;
  if(!value){
    changed = developerRemoveFluidTiles(layout, 'water', col, row);
  }else{
    const tiles = developerEnsureFluidTiles(layout, 'water');
    const existing = tiles.some(tile=>developerFluidTileCoversCell(tile, col, row));
    if(!existing){
      tiles.push({ col, row, width: 1, height: 1 });
      if(Array.isArray(layout.cells[row])) layout.cells[row][col] = false;
      if(Array.isArray(layout.terrainStyles?.[row])) layout.terrainStyles[row][col] = null;
      changed = true;
    }
  }
  if(changed){
    markDeveloperLayoutDirty(world);
    dev.panelDirty = true;
  }
}

function developerPaintBackground(world, col, row, value){
  const dev = world.dev;
  if(!dev?.layout?.cells) return;
  const layout = dev.layout;
  developerEnsureBackgroundCells(layout);
  if(row < 0 || row >= layout.rows || col < 0 || col >= layout.cols) return;
  const backgroundRow = layout.backgroundCells?.[row];
  if(!backgroundRow) return;
  if(backgroundRow[col] === value) return;
  backgroundRow[col] = value;
  markDeveloperLayoutDirty(world);
}

function developerHandleObjectPointer(world, event, pos, phase){
  const dev = world.dev;
  const layout = dev.layout;
  if(phase === 'down'){
    const hit = developerHitObject(world, pos);
    if(hit && event.button === 0){
      dev.dragging = {
        kind: 'object',
        item: hit,
        offset: developerComputeDragOffset(world, hit, pos, 'object'),
        startCol: Number.isFinite(hit.col) ? hit.col : null,
        startRow: Number.isFinite(hit.row) ? hit.row : null,
        startOffsetX: Number.isFinite(hit.offsetX) ? hit.offsetX : 0,
        startOffsetY: Number.isFinite(hit.offsetY) ? hit.offsetY : 0,
        moved: false
      };
    }else if(hit && event.button === 2){
      if(dev.pendingToggleLink && dev.pendingToggleLink.object === hit){
        dev.pendingToggleLink = null;
        dev.panelDirty = true;
      }
      if(hit.type === 'toggleBlock'){
        developerUnlinkToggleTarget(world, hit);
      }
      const idx = layout.objects.indexOf(hit);
      if(idx >= 0){
        layout.objects.splice(idx, 1);
        markDeveloperLayoutDirty(world);
        dev.panelDirty = true;
      }
    }else if(event.button === 0){
      if(dev.pendingToggleLink){
        dev.pendingToggleLink = null;
        dev.panelDirty = true;
      }else{
        developerPlaceObject(world, pos);
      }
    }
    return true;
  }
  if(phase === 'up' && dev.dragging && dev.dragging.kind === 'object'){
    const drag = dev.dragging;
    const button = event.button;
    const moved = !!drag.moved;
    const item = drag.item;
    developerFinishDrag(world);
    if(button === 0 && !moved){
      developerHandleToggleLinkSelection(world, item);
    }
    return true;
  }
  return false;
}

function developerHandleEnemyPointer(world, event, pos, phase){
  const dev = world.dev;
  if(phase === 'down'){
    const hit = developerHitEnemy(world, pos);
    if(hit && event.button === 0){
      dev.dragging = { kind: 'enemy', item: hit, offset: developerComputeDragOffset(world, hit, pos, 'enemy') };
    }else if(hit && event.button === 2){
      developerEnsureEnemyId(world, hit);
      developerRemoveEnemyEntity(world, hit.devId);
      developerRemoveEnemySpawn(world, hit.devId);
      const placements = world.levelState?.enemyPlacements;
      if(Array.isArray(placements)){
        const placementIndex = placements.findIndex(entry=>entry && entry.devId === hit.devId);
        if(placementIndex >= 0) placements.splice(placementIndex, 1);
      }
      const idx = dev.enemies.indexOf(hit);
      if(idx >= 0){
        dev.enemies.splice(idx, 1);
        markDeveloperEnemiesDirty(world);
      }
    }else if(event.button === 0){
      developerPlaceEnemy(world, pos);
    }
    return true;
  }
  if(phase === 'up' && dev.dragging && dev.dragging.kind === 'enemy'){
    const dragged = dev.dragging.item;
    developerFinishDrag(world);
    if(dragged) developerSummonEnemy(world, dragged);
    return true;
  }
  return false;
}

function developerHandleWeaponPointer(world, event, pos, phase){
  const dev = world.dev;
  const layout = dev.layout;
  if(phase === 'down'){
    const hit = developerHitWeapon(world, pos);
    if(hit && event.button === 0){
      dev.dragging = { kind: 'weapon', item: hit, offset: developerComputeDragOffset(world, hit, pos, 'weapon') };
    }else if(hit && event.button === 2){
      const idx = layout.weapons.indexOf(hit);
      if(idx >= 0){
        layout.weapons.splice(idx, 1);
        markDeveloperLayoutDirty(world);
      }
    }else if(event.button === 0){
      developerPlaceWeapon(world, pos);
    }
    return true;
  }
  if(phase === 'up' && dev.dragging && dev.dragging.kind === 'weapon'){
    developerFinishDrag(world);
    return true;
  }
  return false;
}

function developerHandleDoorPointer(world, event, pos, phase){
  const dev = world.dev;
  const layout = dev.layout;
  if(phase === 'down'){
    const hit = developerHitDoor(world, pos);
    if(hit && event.button === 0){
      const rect = developerDoorWorldRect(world, hit.item);
      let anchor = null;
      if(rect){
        const centerY = rect.top + rect.height * 0.5;
        anchor = { dx: pos.x - rect.centerX, dy: pos.y - centerY };
      }
      dev.dragging = { kind: 'door', item: hit.item, doorType: hit.doorType, anchor };
    }else if(hit && event.button === 2){
      if(hit.doorType === 'entry' && layout.entryDoor){
        layout.entryDoor = null;
        markDeveloperLayoutDirty(world);
        world.dev.panelDirty = true;
      }else if(hit.doorType === 'exit' && layout.exitDoor){
        layout.exitDoor = null;
        markDeveloperLayoutDirty(world);
        world.dev.panelDirty = true;
      }
    }else if(event.button === 0){
      developerPlaceDoor(world, pos, dev.doorTarget || 'entry');
    }else if(event.button === 2){
      const target = dev.doorTarget || 'entry';
      if(target === 'entry' && layout.entryDoor){
        layout.entryDoor = null;
        markDeveloperLayoutDirty(world);
        world.dev.panelDirty = true;
      }else if(target === 'exit' && layout.exitDoor){
        layout.exitDoor = null;
        markDeveloperLayoutDirty(world);
        world.dev.panelDirty = true;
      }
    }
    return true;
  }
  if(phase === 'up' && dev.dragging && dev.dragging.kind === 'door'){
    developerFinishDrag(world);
    return true;
  }
  return false;
}

function developerComputeDragOffset(world, item, pos, kind){
  if(!item || !pos) return { dx: 0, dy: 0 };
  if(kind === 'object'){
    const center = developerObjectWorldPosition(world, item);
    return { dx: pos.x - center.x, dy: pos.y - center.y };
  }
  if(kind === 'enemy'){
    const center = developerEnemyWorldPosition(world, item);
    return { dx: pos.x - center.x, dy: pos.y - center.y };
  }
  if(kind === 'weapon'){
    const position = developerWeaponWorldPosition(world, item);
    const anchorY = position.baseY ?? position.y;
    return { dx: pos.x - position.x, dy: pos.y - anchorY };
  }
  return { dx: 0, dy: 0 };
}

function developerFinishDrag(world){
  const dev = world.dev;
  dev.dragging = null;
  dev.panelDirty = true;
}

function developerUpdateDrag(world, pos){
  const dev = world.dev;
  const drag = dev.dragging;
  if(!drag) return;
  const layout = dev.layout;
  if(drag.kind === 'door'){
    const cell = developerCellFromPoint(world, pos);
    if(!cell) return;
    const anchor = drag.anchor || { dx: 0, dy: 0 };
    const pointer = { x: pos.x - anchor.dx, y: pos.y - anchor.dy };
    developerAssignDoorPosition(world, drag.item, cell, pointer, drag.doorType);
    markDeveloperLayoutDirty(world);
    world.dev.panelDirty = true;
    return;
  }
  if(drag.kind === 'object'){
    const cell = developerCellFromPoint(world, pos);
    if(!cell) return;
    const anchor = drag.offset || { dx: 0, dy: 0 };
    const pointer = { x: pos.x - anchor.dx, y: pos.y - anchor.dy };
    const placement = developerComputeObjectPlacement(world, pointer);
    if(!placement) return;
    const beforeCol = Number.isFinite(drag.item.col) ? drag.item.col : null;
    const beforeRow = Number.isFinite(drag.item.row) ? drag.item.row : null;
    const beforeOffsetX = Number.isFinite(drag.item.offsetX) ? drag.item.offsetX : 0;
    const beforeOffsetY = Number.isFinite(drag.item.offsetY) ? drag.item.offsetY : 0;
    developerApplyObjectPlacement(world, drag.item, placement, pointer);
    const afterCol = Number.isFinite(drag.item.col) ? drag.item.col : null;
    const afterRow = Number.isFinite(drag.item.row) ? drag.item.row : null;
    const afterOffsetX = Number.isFinite(drag.item.offsetX) ? drag.item.offsetX : 0;
    const afterOffsetY = Number.isFinite(drag.item.offsetY) ? drag.item.offsetY : 0;
    const changed = afterCol !== beforeCol || afterRow !== beforeRow || afterOffsetX !== beforeOffsetX || afterOffsetY !== beforeOffsetY;
    if(changed){
      const startCol = Number.isFinite(drag.startCol) ? drag.startCol : null;
      const startRow = Number.isFinite(drag.startRow) ? drag.startRow : null;
      const startOffsetX = Number.isFinite(drag.startOffsetX) ? drag.startOffsetX : 0;
      const startOffsetY = Number.isFinite(drag.startOffsetY) ? drag.startOffsetY : 0;
      if(
        afterCol !== startCol ||
        afterRow !== startRow ||
        afterOffsetX !== startOffsetX ||
        afterOffsetY !== startOffsetY
      ){
        drag.moved = true;
      }
      markDeveloperLayoutDirty(world);
    }
  }else if(drag.kind === 'enemy'){
    const anchor = drag.offset || { dx: 0, dy: 0 };
    const pointer = { x: pos.x - anchor.dx, y: pos.y - anchor.dy };
    const col = developerColumnFromPoint(world, pointer);
    if(col === null) return;
    const rowGuess = developerRowFromPoint(world, pointer);
    const placement = developerFindSurfaceRowBelow(world, layout, col, rowGuess);
    if(!placement) return;
    const row = placement.placementRow;
    if(row === null || row === undefined) return;
    const offsets = developerComputeEnemyOffset(world, col, row, pointer);
    if(
      drag.item.col === col &&
      drag.item.row === row &&
      (drag.item.offsetX || 0) === offsets.offsetX &&
      (drag.item.offsetY || 0) === offsets.offsetY
    ){
      return;
    }
    developerEnsureEnemyId(world, drag.item);
    drag.item.col = col;
    drag.item.row = row;
    drag.item.offsetX = offsets.offsetX;
    drag.item.offsetY = offsets.offsetY;
    markDeveloperEnemiesDirty(world);
  }else if(drag.kind === 'weapon'){
    const cell = developerCellFromPoint(world, pos);
    if(!cell) return;
    drag.item.col = cell.col;
    let row = developerFindSurfaceRow(layout, cell.col, cell.row);
    if(row === null || row === undefined) return;
    drag.item.row = row;
    drag.item.offsetX = 0;
    drag.item.offsetY = 0;
    markDeveloperLayoutDirty(world);
  }
}

function developerComputeObjectPlacement(world, pos){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout) return null;
  if(!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  const cell = developerCellFromPoint(world, pos);
  if(!cell) return null;
  const rows = dev.rows ?? layout.rows ?? 0;
  const cols = dev.cols ?? layout.cols ?? 0;
  if(rows <= 0 || cols <= 0) return null;
  const tileSize = dev.tileSize || layout.tileSize || DEV_DEFAULT_TILE_SIZE;
  const row = clamp(cell.row, 0, Math.max(0, rows - 1));
  const col = clamp(cell.col, 0, Math.max(0, cols - 1));
  const offsetX = dev.offsetX || 0;
  const tileLeft = offsetX + col * tileSize;
  const tileTop = world.groundY - (rows - row) * tileSize;
  const tileScale = layout.tileScale ?? (layout.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const offsetXUnits = pos.x - (tileLeft + tileSize * 0.5);
  const offsetYUnits = pos.y - (tileTop + tileSize);
  const layoutOffsetX = Math.round(offsetXUnits / tileScale);
  const layoutOffsetY = Math.round(offsetYUnits / tileScale);
  return {
    col,
    row,
    offsetX: layoutOffsetX,
    offsetY: layoutOffsetY,
    tileSize,
    tileScale,
    tileLeft,
    tileTop,
    baseCenterX: tileLeft + tileSize * 0.5,
    baseY: tileTop + tileSize
  };
}

function developerApplyObjectPlacement(world, obj, placement, pointer){
  if(!obj || !placement) return;
  obj.type = obj.type || 'crate';
  obj.col = placement.col;
  obj.row = placement.row;
  const dev = world?.dev;
  const lockHorizontal = !dev || dev.objectLockHorizontal !== false;
  const lockVertical = !dev || dev.objectLockVertical !== false;
  const baseOffsetX = Number.isFinite(obj.offsetX) ? obj.offsetX : 0;
  const baseOffsetY = Number.isFinite(obj.offsetY) ? obj.offsetY : 0;
  obj.offsetX = lockHorizontal ? baseOffsetX : (Number.isFinite(placement.offsetX) ? placement.offsetX : baseOffsetX);
  obj.offsetY = lockVertical ? baseOffsetY : (Number.isFinite(placement.offsetY) ? placement.offsetY : baseOffsetY);
  const tileScale = placement.tileScale || 1;
  if(obj.type === 'spikes'){
    if(obj.width === undefined) obj.width = 64;
    if(obj.height === undefined) obj.height = 32;
    obj.offsetY = Math.round(-6 / tileScale);
    obj.damage = obj.damage ?? 24;
    obj.knock = obj.knock ?? 1.1;
  }
  if(obj.type === 'waterSpout'){
    if(obj.width === undefined) obj.width = 60;
    if(obj.height === undefined) obj.height = 46;
    obj.offsetY = Math.round(-24 / tileScale);
    obj.flowWidth = obj.flowWidth ?? 28;
    obj.flowHeight = obj.flowHeight ?? 72;
    obj.waterColor = obj.waterColor || '#58c9ff';
    obj.glowColor = obj.glowColor || 'rgba(150, 236, 255, 0.7)';
    obj.casingColor = obj.casingColor || '#4a3e2f';
    obj.trimColor = obj.trimColor || '#756650';
    obj.shadowColor = obj.shadowColor || '#2f241a';
  }
  if(obj.type === 'lavaSpout'){
    if(obj.width === undefined) obj.width = 54;
    if(obj.height === undefined) obj.height = 46;
    obj.offsetY = Math.round(-24 / tileScale);
    obj.flowWidth = obj.flowWidth ?? 28;
    obj.flowHeight = obj.flowHeight ?? 72;
    obj.lavaColor = obj.lavaColor || '#ff7b2a';
    obj.glowColor = obj.glowColor || 'rgba(255, 172, 86, 0.82)';
    obj.casingColor = obj.casingColor || '#3d2216';
    obj.trimColor = obj.trimColor || '#5a3320';
    obj.shadowColor = obj.shadowColor || '#2b1209';
  }
  if(obj.type === 'torch'){
    if(obj.width === undefined) obj.width = 26;
    if(obj.height === undefined) obj.height = 50;
    const tileSize = placement.tileSize || DEV_DEFAULT_TILE_SIZE;
    const centerX = placement.baseCenterX;
    const horizontalBias = (pointer?.x ?? centerX) - centerX;
    const wallThreshold = tileSize * 0.24;
    obj.mount = Math.abs(horizontalBias) > wallThreshold ? 'wall' : 'floor';
    obj.facing = horizontalBias < 0 ? 'left' : 'right';
    if(obj.mount === 'wall'){
      const clamped = clamp(horizontalBias, -tileSize * 0.4, tileSize * 0.4);
      obj.offsetX = Math.round(clamped / tileScale);
    }
  }
  if(obj.type === 'treasureChest'){
    if(obj.width === undefined) obj.width = 68;
    if(obj.height === undefined) obj.height = 48;
    const loot = developerEnsureLootObject(obj) || {};
    if(loot.coins === undefined) loot.coins = 8;
    if(loot.coinValue === undefined) loot.coinValue = 1;
  }
  if(obj.type === 'swordPedestal'){
    if(obj.width === undefined) obj.width = 86;
    if(obj.height === undefined) obj.height = 100;
    const loot = developerEnsureLootObject(obj) || {};
    if(!loot.weaponId) loot.weaponId = obj.weaponId || obj.weapon || 'sigilBlade';
  }
}

function developerPlaceObject(world, pos){
  const dev = world.dev;
  const placement = developerComputeObjectPlacement(world, pos);
  if(!placement) return;
  const selection = developerFindObjectTypeEntry(dev.objectType);
  const resolvedType = selection?.type || dev.objectType || 'crate';
  const obj = { type: resolvedType };
  const defaults = developerObjectDefaults(selection);
  if(defaults){
    for(const key in defaults){
      obj[key] = defaults[key];
    }
  }
  developerApplyObjectPlacement(world, obj, placement, pos);
  if(resolvedType === 'toggleBlock'){
    developerEnsureObjectId(world, obj, 'toggle');
  }else if(resolvedType === 'lever'){
    developerEnsureObjectId(world, obj, 'lever');
  }
  dev.layout.objects.push(obj);
  markDeveloperLayoutDirty(world);
}

function developerNormalizeToggleTargets(value){
  if(value === undefined || value === null) return [];
  if(Array.isArray(value)) return value.map(entry=>String(entry));
  return [String(value)];
}

function developerEnsureObjectId(world, obj, prefix='interactive'){
  if(!obj) return null;
  const existing = obj.id;
  if(existing !== undefined && existing !== null && existing !== ''){
    const id = String(existing);
    obj.id = id;
    return id;
  }
  const dev = world?.dev;
  if(!dev) return null;
  if(!Number.isFinite(dev.objectIdCounter) || dev.objectIdCounter < 1){
    dev.objectIdCounter = 1;
  }
  const layout = dev.layout;
  const taken = new Set();
  if(layout && Array.isArray(layout.objects)){
    for(const other of layout.objects){
      if(!other || other === obj) continue;
      if(other.id !== undefined && other.id !== null && other.id !== ''){
        taken.add(String(other.id));
      }
    }
  }
  let candidate = null;
  do{
    candidate = `${prefix}_${dev.objectIdCounter++}`;
  }while(candidate && taken.has(candidate));
  obj.id = candidate;
  dev.panelDirty = true;
  return candidate;
}

function developerRefreshObjectIdCounter(dev){
  if(!dev){
    return;
  }
  if(!Number.isFinite(dev.objectIdCounter) || dev.objectIdCounter < 1){
    dev.objectIdCounter = 1;
  }
  const layout = dev.layout;
  if(!layout || !Array.isArray(layout.objects)) return;
  let maxId = dev.objectIdCounter - 1;
  for(const obj of layout.objects){
    if(!obj || obj.id === undefined || obj.id === null) continue;
    const match = String(obj.id).match(/(\d+)$/);
    if(!match) continue;
    const value = Number(match[1]);
    if(Number.isFinite(value) && value > maxId){
      maxId = value;
    }
  }
  if(maxId >= dev.objectIdCounter){
    dev.objectIdCounter = maxId + 1;
  }
}

function developerToggleLinkCandidate(obj){
  if(!obj || typeof obj !== 'object') return null;
  if(obj.type === 'lever') return { kind: 'lever', object: obj };
  if(obj.type === 'toggleBlock') return { kind: 'toggle', object: obj };
  return null;
}

function developerHandleToggleLinkSelection(world, obj){
  const dev = world?.dev;
  if(!dev || !dev.layout) return false;
  const candidate = developerToggleLinkCandidate(obj);
  if(!candidate){
    if(dev.pendingToggleLink){
      dev.pendingToggleLink = null;
      dev.panelDirty = true;
    }
    return false;
  }
  if(candidate.kind === 'toggle'){
    developerEnsureObjectId(world, candidate.object, 'toggle');
  }else if(candidate.kind === 'lever'){
    developerEnsureObjectId(world, candidate.object, 'lever');
  }
  const pending = dev.pendingToggleLink;
  if(!pending){
    dev.pendingToggleLink = candidate;
    dev.panelDirty = true;
    return true;
  }
  if(pending.object === candidate.object){
    dev.pendingToggleLink = null;
    dev.panelDirty = true;
    return true;
  }
  if(pending.kind === candidate.kind){
    dev.pendingToggleLink = candidate;
    dev.panelDirty = true;
    return true;
  }
  const leverCandidate = pending.kind === 'lever' ? pending : candidate;
  const toggleCandidate = pending.kind === 'toggle' ? pending : candidate;
  const linked = developerLinkLeverToToggle(world, leverCandidate.object, toggleCandidate.object);
  dev.pendingToggleLink = leverCandidate;
  dev.panelDirty = true;
  return linked;
}

function developerLinkLeverToToggle(world, leverObj, blockObj){
  if(!world?.dev?.layout) return false;
  if(!leverObj || leverObj.type !== 'lever') return false;
  if(!blockObj || blockObj.type !== 'toggleBlock') return false;
  const targetId = developerEnsureObjectId(world, blockObj, 'toggle');
  if(!targetId) return false;
  const targets = developerNormalizeToggleTargets(leverObj.targets);
  const id = String(targetId);
  if(targets.includes(id)) return false;
  targets.push(id);
  leverObj.targets = targets;
  markDeveloperLayoutDirty(world);
  return true;
}

function developerUnlinkToggleTarget(world, blockObj){
  const dev = world?.dev;
  if(!dev || !dev.layout || !Array.isArray(dev.layout.objects)) return;
  const targetId = blockObj && blockObj.id !== undefined && blockObj.id !== null
    ? String(blockObj.id)
    : null;
  if(!targetId) return;
  let changed = false;
  for(const obj of dev.layout.objects){
    if(!obj || obj.type !== 'lever') continue;
    const targets = developerNormalizeToggleTargets(obj.targets);
    const next = targets.filter(id=>id !== targetId);
    if(next.length !== targets.length){
      obj.targets = next;
      changed = true;
    }
  }
  if(changed){
    markDeveloperLayoutDirty(world);
    dev.panelDirty = true;
  }
}

function developerEnsureEnemyId(world, enemy){
  if(!world?.dev || !enemy) return null;
  const dev = world.dev;
  if(!Number.isFinite(dev.enemyIdCounter)) dev.enemyIdCounter = 1;
  if(!Number.isFinite(enemy.devId)){
    enemy.devId = dev.enemyIdCounter++;
  }else if(enemy.devId >= dev.enemyIdCounter){
    dev.enemyIdCounter = enemy.devId + 1;
  }
  return enemy.devId;
}

function developerEnsureEnemyIds(world){
  if(!world?.dev) return;
  const dev = world.dev;
  if(!Array.isArray(dev.enemies)) dev.enemies = [];
  if(!Number.isFinite(dev.enemyIdCounter)) dev.enemyIdCounter = 1;
  for(const enemy of dev.enemies){
    if(!enemy) continue;
    developerEnsureEnemyId(world, enemy);
  }
  const placements = world.levelState?.enemyPlacements;
  if(Array.isArray(placements)){
    for(let i = 0; i < placements.length; i++){
      const placement = placements[i];
      if(!placement) continue;
      const enemy = dev.enemies[i];
      if(enemy){
        placement.devId = enemy.devId;
      }else{
        developerEnsureEnemyId(world, placement);
      }
    }
  }
}

function developerFindEnemyEntity(world, devId){
  if(!world || !Number.isFinite(devId)) return null;
  const enemies = Array.isArray(world.enemies) ? world.enemies : [];
  return enemies.find(entry=>entry && entry.devPlacementId === devId) || null;
}

function developerRemoveEnemyEntity(world, devId){
  if(!world || !Number.isFinite(devId)) return;
  const entity = developerFindEnemyEntity(world, devId);
  if(!entity) return;
  if(typeof entity._releaseRigConstraints === 'function') entity._releaseRigConstraints();
  entity.dead = true;
  if(Array.isArray(world.enemies)){
    const idx = world.enemies.indexOf(entity);
    if(idx >= 0) world.enemies.splice(idx, 1);
  }
  if(Array.isArray(world.sticks)){
    const idx = world.sticks.indexOf(entity);
    if(idx >= 0) world.sticks.splice(idx, 1);
  }
  if(Array.isArray(world.points) && Array.isArray(entity.points)){
    for(const point of entity.points){
      const idx = world.points.indexOf(point);
      if(idx >= 0) world.points.splice(idx, 1);
    }
  }
}

function developerRemoveEnemySpawn(world, devId){
  if(!world?.levelState || !Number.isFinite(devId)) return;
  const spawns = world.levelState.enemySpawnPoints;
  if(!Array.isArray(spawns)) return;
  const idx = spawns.findIndex(entry=>entry && entry.devId === devId);
  if(idx >= 0) spawns.splice(idx, 1);
}

function developerSummonEnemy(world, enemy){
  if(!world?.dev || !enemy || world.state !== 'level') return;
  const dev = world.dev;
  const layout = dev.layout;
  if(!layout) return;
  const devId = developerEnsureEnemyId(world, enemy);
  if(!Number.isFinite(devId)) return;
  const tileSize = dev.tileSize || layout.tileSize || DEV_DEFAULT_TILE_SIZE;
  const offsetX = dev.offsetX || 0;
  const statePlacements = world.levelState?.enemyPlacements;
  if(Array.isArray(statePlacements)){
    const offsetXUnits = Number.isFinite(enemy.offsetX) ? enemy.offsetX : 0;
    const offsetYUnits = Number.isFinite(enemy.offsetY) ? enemy.offsetY : 0;
    const placementIndex = statePlacements.findIndex(entry=>entry && entry.devId === devId);
    if(placementIndex >= 0){
      statePlacements[placementIndex].col = enemy.col;
      statePlacements[placementIndex].row = enemy.row;
      statePlacements[placementIndex].offsetX = offsetXUnits;
      statePlacements[placementIndex].offsetY = offsetYUnits;
    }else{
      statePlacements.push({
        kind: enemy.kind,
        col: enemy.col,
        row: enemy.row,
        offsetX: offsetXUnits,
        offsetY: offsetYUnits,
        devId
      });
    }
  }
  const spawn = layoutEnemyToSpawn(enemy, layout, tileSize, offsetX);
  if(!spawn) return;
  spawn.devId = devId;
  developerRemoveEnemyEntity(world, devId);
  const entity = spawnSingleEnemy(world, spawn, spawn.x);
  if(entity){
    entity.devPlacementId = devId;
    if(spawn.offsetY){
      const ground = groundHeightAt(world, spawn.x, { surface: 'top' });
      entity.warpTo(spawn.x, ground - 30 + spawn.offsetY);
    }
  }
  const state = world.levelState;
  if(state){
    if(!Array.isArray(state.enemySpawnPoints)) state.enemySpawnPoints = [];
    const existing = state.enemySpawnPoints.findIndex(entry=>entry && entry.devId === devId);
    if(existing >= 0) state.enemySpawnPoints[existing] = spawn;
    else state.enemySpawnPoints.push(spawn);
  }
}

function developerResummonAllEnemies(world){
  if(!world?.dev || !Array.isArray(world.dev.enemies)) return;
  for(const enemy of world.dev.enemies){
    if(enemy) developerSummonEnemy(world, enemy);
  }
}

function developerPlaceEnemy(world, pos){
  const dev = world.dev;
  if(!pos) return;
  const pointer = { x: pos.x, y: pos.y };
  const col = developerColumnFromPoint(world, pointer);
  if(col === null) return;
  const layout = dev.layout;
  const rowGuess = developerRowFromPoint(world, pointer);
  const placement = developerFindSurfaceRowBelow(world, layout, col, rowGuess);
  if(!placement) return;
  const row = placement.placementRow;
  if(row === null || row === undefined) return;
  const offsets = developerComputeEnemyOffset(world, col, row, pointer);
  const enemy = {
    kind: dev.enemyKind,
    col,
    row,
    offsetX: offsets.offsetX,
    offsetY: offsets.offsetY
  };
  developerEnsureEnemyId(world, enemy);
  dev.enemies.push(enemy);
  const placements = world.levelState?.enemyPlacements;
  if(Array.isArray(placements)){
    placements.push({
      kind: enemy.kind,
      col: enemy.col,
      row: enemy.row,
      offsetX: Number.isFinite(enemy.offsetX) ? enemy.offsetX : 0,
      offsetY: Number.isFinite(enemy.offsetY) ? enemy.offsetY : 0,
      devId: enemy.devId
    });
  }
  markDeveloperEnemiesDirty(world);
  developerSummonEnemy(world, enemy);
}

function developerPlaceWeapon(world, pos){
  const dev = world.dev;
  const id = dev.weaponId;
  if(!id) return;
  const cell = developerCellFromPoint(world, pos);
  if(!cell) return;
  const layout = dev.layout;
  const row = developerFindSurfaceRow(layout, cell.col, cell.row);
  if(row === null || row === undefined) return;
  layout.weapons.push({
    id,
    col: cell.col,
    row,
    offsetX: 0,
    offsetY: 0
  });
  markDeveloperLayoutDirty(world);
}

function developerPlaceDoor(world, pos, target){
  const dev = world.dev;
  const layout = dev.layout;
  const cell = developerCellFromPoint(world, pos);
  if(!cell) return;
  const door = target === 'exit'
    ? (layout.exitDoor || { col: cell.col, row: cell.row, offsetX: 0, offsetY: 0 })
    : (layout.entryDoor || { col: cell.col, row: cell.row, offsetX: 0, offsetY: 0 });
  developerAssignDoorPosition(world, door, cell, pos, target);
  if(target === 'exit') layout.exitDoor = door;
  else layout.entryDoor = door;
  markDeveloperLayoutDirty(world);
  world.dev.panelDirty = true;
}

function developerAssignDoorPosition(world, door, cell, desiredCenter, target){
  if(!world?.dev || !door || !cell) return;
  const dev = world.dev;
  const tileSize = dev.tileSize;
  const rows = dev.rows || dev.layout?.rows || 0;
  const cols = dev.cols || dev.layout?.cols || 0;
  const offsetX = dev.offsetX;
  const clampedCol = clamp(cell.col, 0, Math.max(0, cols - 1));
  const clampedRow = clamp(cell.row, 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + clampedCol * tileSize;
  const tileTop = world.groundY - (rows - clampedRow) * tileSize;
  const doorTarget = target || door?.doorType || door?.target || (door === dev.layout?.exitDoor ? 'exit' : 'entry');
  const centerTargetX = doorTarget === 'entry'
    ? (tileLeft + tileSize * 0.5)
    : desiredCenter?.x ?? (tileLeft + tileSize * 0.5);
  const centerTargetY = desiredCenter?.y ?? (tileTop + DEV_DOOR_HEIGHT * 0.5);
  const maxOffsetX = Math.floor(tileSize * 0.5);
  const maxOffsetY = tileSize * rows;
  door.col = clampedCol;
  door.row = clampedRow;
  door.offsetX = clamp(Math.round(centerTargetX - (tileLeft + tileSize * 0.5)), -maxOffsetX, maxOffsetX);
  const baseY = centerTargetY + DEV_DOOR_HEIGHT * 0.5;
  door.offsetY = clamp(Math.round(baseY - (tileTop + tileSize)), -maxOffsetY, maxOffsetY);
}

function developerHitObject(world, pos){
  const dev = world.dev;
  const layout = dev.layout;
  let best = null;
  let bestDist = 1e9;
  const tileSize = dev.tileSize;
  for(const obj of layout.objects){
    const worldPos = developerObjectWorldPosition(world, obj);
    const d = Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y);
    if(d < tileSize * 0.45 && d < bestDist){
      best = obj;
      bestDist = d;
    }
  }
  return best;
}

function developerHitEnemy(world, pos){
  const dev = world.dev;
  let best = null;
  let bestDist = 1e9;
  const tileSize = dev.tileSize;
  for(const enemy of dev.enemies){
    const worldPos = developerEnemyWorldPosition(world, enemy);
    const d = Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y);
    if(d < tileSize * 0.5 && d < bestDist){
      best = enemy;
      bestDist = d;
    }
  }
  return best;
}

function developerHitWeapon(world, pos){
  const dev = world.dev;
  const layout = dev.layout;
  let best = null;
  let bestDist = 1e9;
  const tileSize = dev.tileSize;
  for(const weapon of layout.weapons){
    const worldPos = developerWeaponWorldPosition(world, weapon);
    const d = Math.hypot(worldPos.x - pos.x, worldPos.y - pos.y);
    if(d < tileSize * 0.5 && d < bestDist){
      best = weapon;
      bestDist = d;
    }
  }
  return best;
}

function developerHitDoor(world, pos){
  const dev = world.dev;
  const layout = dev.layout;
  const entryRect = developerDoorWorldRect(world, layout.entryDoor);
  const exitRect = developerDoorWorldRect(world, layout.exitDoor);
  if(entryRect && developerPointInRect(pos, entryRect)){
    return { doorType: 'entry', item: layout.entryDoor };
  }
  if(exitRect && developerPointInRect(pos, exitRect)){
    return { doorType: 'exit', item: layout.exitDoor };
  }
  let best = null;
  let bestDist = 1e9;
  if(entryRect){
    const cx = entryRect.centerX;
    const cy = entryRect.top + entryRect.height * 0.5;
    const d = Math.hypot(pos.x - cx, pos.y - cy);
    if(d < bestDist && d < DEV_DOOR_HEIGHT){
      best = { doorType: 'entry', item: layout.entryDoor };
      bestDist = d;
    }
  }
  if(exitRect){
    const cx = exitRect.centerX;
    const cy = exitRect.top + exitRect.height * 0.5;
    const d = Math.hypot(pos.x - cx, pos.y - cy);
    if(d < bestDist && d < DEV_DOOR_HEIGHT){
      best = { doorType: 'exit', item: layout.exitDoor };
      bestDist = d;
    }
  }
  return best;
}

function developerObjectWorldPosition(world, obj){
  const dev = world.dev;
  const tileSize = dev.tileSize;
  const offsetX = dev.offsetX;
  const rows = dev.rows;
  const col = clamp(Math.round(obj.col), 0, dev.cols - 1);
  const row = clamp(Math.round(obj.row), 0, rows - 1);
  const left = offsetX + col * tileSize;
  const top = world.groundY - (rows - row) * tileSize;
  const layout = dev.layout;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  return {
    x: left + tileSize * 0.5 + offsetXUnits,
    y: top + tileSize + offsetYUnits
  };
}

function developerEnemyWorldPosition(world, enemy){
  const dev = world.dev;
  const tileSize = dev.tileSize;
  const offsetX = dev.offsetX;
  const rows = dev.rows;
  const col = clamp(Math.round(enemy.col), 0, dev.cols - 1);
  const row = clamp(Math.round(enemy.row), 0, rows - 1);
  const left = offsetX + col * tileSize;
  const top = world.groundY - (rows - row) * tileSize;
  const layout = dev.layout;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  return {
    x: left + tileSize * 0.5 + (enemy.offsetX || 0) * tileScale,
    y: top + tileSize * 0.5 + (enemy.offsetY || 0) * tileScale
  };
}

function developerWeaponWorldPosition(world, weapon){
  const dev = world.dev;
  const tileSize = dev.tileSize;
  const offsetX = dev.offsetX;
  const rows = dev.rows;
  const cols = dev.cols;
  if(!cols || !rows) return { x: world.width * 0.5, y: world.groundY, baseY: world.groundY };
  const col = clamp(Math.round(weapon.col ?? 0), 0, cols - 1);
  const row = clamp(Math.round(weapon.row ?? rows - 1), 0, rows - 1);
  const left = offsetX + col * tileSize;
  const tileTop = world.groundY - (rows - row) * tileSize;
  const layout = dev.layout;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const offsetXUnits = (weapon.offsetX || 0) * tileScale;
  const offsetYUnits = (weapon.offsetY || 0) * tileScale;
  const baseY = tileTop + tileSize + offsetYUnits;
  return {
    x: left + tileSize * 0.5 + offsetXUnits,
    y: baseY - Math.max(12, tileSize * 0.18),
    baseY
  };
}

function developerDoorWorldRect(world, door){
  if(!door) return null;
  const dev = world.dev;
  const tileSize = dev.tileSize;
  const offsetX = dev.offsetX;
  const rows = dev.rows;
  const cols = dev.cols;
  if(!cols || !rows) return null;
  const col = clamp(Math.round(door.col ?? 0), 0, cols - 1);
  const row = clamp(Math.round(door.row ?? rows - 1), 0, rows - 1);
  const centerX = offsetX + col * tileSize + tileSize * 0.5 + (door.offsetX || 0);
  const tileTop = world.groundY - (rows - row) * tileSize;
  const baseY = tileTop + tileSize + (door.offsetY || 0);
  const left = centerX - DEV_DOOR_WIDTH * 0.5;
  const top = baseY - DEV_DOOR_HEIGHT;
  return { left, top, width: DEV_DOOR_WIDTH, height: DEV_DOOR_HEIGHT, centerX, baseY };
}

function developerPointInRect(pos, rect){
  if(!pos || !rect) return false;
  return pos.x >= rect.left && pos.x <= rect.left + rect.width && pos.y >= rect.top && pos.y <= rect.top + rect.height;
}

function developerParticleBrushConfig(world){
  const dev = world?.dev;
  if(!dev || !dev.enabled) return null;
  const pointer = dev.pointerWorld;
  if(!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null;
  let styleKey = dev.tool;
  if(dev.tool === 'water'){
    styleKey = dev.waterBrushStyle === 'ice' ? 'ice' : 'water';
  }else if(dev.tool === 'sand'){
    styleKey = dev.sandBrushMaterial === 'steel' ? 'steel' : 'sand';
  }else if(dev.tool === 'powder'){
    styleKey = dev.powderBrushMaterial === 'steel' ? 'steel' : 'powder';
  }
  const style = DEV_PARTICLE_BRUSH_STYLES[styleKey];
  if(!style) return null;
  let field = null;
  let columnForX = null;
  let rowForY = null;
  let brushSize = 0;
  if(dev.tool === 'sand'){
    field = world?.sand;
    columnForX = sandColumnForX;
    rowForY = sandRowForY;
    brushSize = developerClampBrushSize(dev.sandBrushSize || 12);
  }else if(dev.tool === 'powder'){
    field = world?.powder;
    columnForX = powderColumnForX;
    rowForY = powderRowForY;
    brushSize = developerClampBrushSize(dev.powderBrushSize || 12);
  }else if(dev.tool === 'water'){
    field = world?.water;
    columnForX = waterColumnForX;
    rowForY = waterRowForY;
    brushSize = developerClampBrushSize(dev.waterBrushSize || 12);
  }else if(dev.tool === 'lava'){
    field = world?.lava;
    columnForX = typeof lavaColumnForX === 'function' ? lavaColumnForX : waterColumnForX;
    rowForY = typeof lavaRowForY === 'function' ? lavaRowForY : waterRowForY;
    brushSize = developerClampBrushSize(dev.lavaBrushSize || 12);
  }
  if(!field || !columnForX || !rowForY) return null;
  const centerCol = columnForX(field, pointer.x);
  const centerRow = rowForY(field, pointer.y);
  if(centerCol < 0 || centerCol >= field.cols || centerRow < 0 || centerRow >= field.rows) return null;
  const cellSize = field.cellSize || 1;
  const radius = Math.max(0, Math.floor(Math.max(1, brushSize) / cellSize));
  const shape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  return { field, style, centerCol, centerRow, radius, cellSize, shape };
}

function developerRenderParticleBrushPreview(world, ctx){
  const config = developerParticleBrushConfig(world);
  if(!config) return;
  const { field, style, centerCol, centerRow, radius, cellSize, shape } = config;
  const offsetX = field.offsetX || 0;
  const cells = [];
  for(let row=centerRow - radius; row<=centerRow + radius; row++){
    if(row < 0 || row >= field.rows) continue;
    for(let col=centerCol - radius; col<=centerCol + radius; col++){
      if(col < 0 || col >= field.cols) continue;
      const dx = col - centerCol;
      const dy = row - centerRow;
      const within = shape === 'square'
        ? (Math.abs(dx) <= radius && Math.abs(dy) <= radius)
        : (dx * dx + dy * dy <= radius * radius);
      if(!within) continue;
      cells.push({ col, row });
    }
  }
  if(!cells.length) return;
  ctx.save();
  ctx.fillStyle = style.fill;
  for(const cell of cells){
    const left = offsetX + cell.col * cellSize;
    const top = cell.row * cellSize;
    ctx.fillRect(left, top, cellSize, cellSize);
  }
  if(style.stroke){
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Math.max(1, Math.round(Math.max(1, cellSize) * 0.12));
    const centerX = offsetX + centerCol * cellSize + cellSize * 0.5;
    const centerY = centerRow * cellSize + cellSize * 0.5;
    const extent = Math.max(cellSize * 0.5, (radius + 0.5) * cellSize);
    if(shape === 'square'){
      ctx.strokeRect(centerX - extent, centerY - extent, extent * 2, extent * 2);
    }else{
      ctx.beginPath();
      ctx.arc(centerX, centerY, extent, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderDeveloperObjectEditors(dev){
  const layout = dev.layout;
  if(!layout || !Array.isArray(layout.objects)){
    return '';
  }
  const chests = [];
  const pedestals = [];
  layout.objects.forEach((obj, idx)=>{
    if(!obj || !obj.type) return;
    if(obj.type === 'treasureChest') chests.push(renderDeveloperChestCard(obj, idx));
    else if(obj.type === 'swordPedestal') pedestals.push(renderDeveloperSwordCard(obj, idx));
  });
  if(!chests.length && !pedestals.length){
    return '';
  }
  const sections = [];
  if(chests.length){
    sections.push(chests.join(''));
  }
  if(pedestals.length){
    sections.push(pedestals.join(''));
  }
  return sections.join('');
}

function renderDeveloperChestCard(obj, idx){
  const loot = developerEnsureLootObject(obj) || {};
  if(loot.coins === undefined) loot.coins = 8;
  if(loot.coinValue === undefined) loot.coinValue = 1;
  const lootItem = loot.item || null;
  const itemSelection = developerItemSelectionValue(lootItem);
  const item = itemSelection === 'potion' ? lootItem : null;
  const checkboxId = `chest-known-${idx}`;
  const potionFields = renderDeveloperPotionFields(item, idx);
  const itemSelect = `
    <label>Loot Item
      <select data-object-action="set-item-type" data-object-index="${idx}">
        ${developerItemSelectOptions(itemSelection)}
      </select>
    </label>
  `;
  const weaponOptions = developerWeaponSelectOptions(loot.weaponId);
  return `
    <div class="dev-object-card">
      <div class="dev-object-header">
        <div class="dev-object-heading">Chest ${idx + 1}</div>
        <div class="dev-object-subtle">Grid (${devEscapeAttribute(obj.col ?? '—')}, ${devEscapeAttribute(obj.row ?? '—')})</div>
      </div>
      <div class="tool-row">
        <label>Identifier
          <input type="text" data-object-field="objects.${idx}.id" data-empty-mode="delete" value="${devEscapeAttribute(obj.id ?? '')}">
        </label>
        <label>Coins
          <input type="number" min="0" step="1" data-object-field="objects.${idx}.loot.coins" value="${devEscapeAttribute(loot.coins ?? 0)}">
        </label>
        <label>Coin Value
          <input type="number" min="1" step="1" data-object-field="objects.${idx}.loot.coinValue" value="${devEscapeAttribute(loot.coinValue ?? 1)}">
        </label>
      </div>
      <div class="tool-row">
        <label>Restock Value
          <input type="number" min="1" step="1" data-empty-mode="delete" data-object-field="objects.${idx}.loot.restockCoinValue" value="${devEscapeAttribute(loot.restockCoinValue ?? '')}">
        </label>
        <label>Weapon Reward
          <select data-empty-mode="delete" data-object-field="objects.${idx}.loot.weaponId">
            ${weaponOptions}
          </select>
        </label>
      </div>
      <div class="dev-checkbox">
        <input type="checkbox" id="${checkboxId}" data-object-field="objects.${idx}.loot.requireKnownWeapon" ${loot.requireKnownWeapon ? 'checked' : ''}>
        <label for="${checkboxId}">Require known weapon</label>
      </div>
      <div class="tool-row">
        ${itemSelect}
      </div>
      ${potionFields}
    </div>
  `;
}

function renderDeveloperSwordCard(obj, idx){
  const loot = developerEnsureLootObject(obj) || {};
  if(loot.weaponId === undefined) loot.weaponId = obj.weaponId || obj.weapon || 'sigilBlade';
  const lootItem = loot.item || null;
  const itemSelection = developerItemSelectionValue(lootItem);
  const item = itemSelection === 'potion' ? lootItem : null;
  const checkboxId = `pedestal-known-${idx}`;
  const potionFields = renderDeveloperPotionFields(item, idx);
  const weaponOptions = developerWeaponSelectOptions(loot.weaponId);
  return `
    <div class="dev-object-card">
      <div class="dev-object-header">
        <div class="dev-object-heading">Sword Shrine ${idx + 1}</div>
        <div class="dev-object-subtle">Grid (${devEscapeAttribute(obj.col ?? '—')}, ${devEscapeAttribute(obj.row ?? '—')})</div>
      </div>
      <div class="tool-row">
        <label>Identifier
          <input type="text" data-object-field="objects.${idx}.id" data-empty-mode="delete" value="${devEscapeAttribute(obj.id ?? '')}">
        </label>
        <label>Weapon Reward
          <select data-empty-mode="delete" data-object-field="objects.${idx}.loot.weaponId">
            ${weaponOptions}
          </select>
        </label>
      </div>
      <div class="dev-checkbox">
        <input type="checkbox" id="${checkboxId}" data-object-field="objects.${idx}.loot.requireKnownWeapon" ${loot.requireKnownWeapon ? 'checked' : ''}>
        <label for="${checkboxId}">Require known weapon</label>
      </div>
      <div class="tool-row">
        <label>Bonus Item
          <select data-object-action="set-item-type" data-object-index="${idx}">
            ${developerItemSelectOptions(itemSelection)}
          </select>
        </label>
      </div>
      ${potionFields}
    </div>
  `;
}

function renderDeveloperPotionFields(item, idx){
  if(!item || (item.type !== 'potion' && item.kind !== 'potion')) return '';
  if(item.type !== 'potion') item.type = 'potion';
  const basePath = `objects.${idx}.loot.item`;
  return `
    <div class="tool-row">
      <label>Potion ID
        <input type="text" data-empty-mode="delete" data-object-field="${basePath}.id" value="${devEscapeAttribute(item.id ?? '')}">
      </label>
      <label>Name
        <input type="text" data-empty-mode="delete" data-object-field="${basePath}.name" value="${devEscapeAttribute(item.name ?? '')}">
      </label>
      <label>Heal Amount
        <input type="number" min="1" step="1" data-object-field="${basePath}.heal" value="${devEscapeAttribute(item.heal ?? 30)}">
      </label>
    </div>
    <div class="tool-row">
      <label>Color
        <input type="text" data-empty-mode="delete" data-object-field="${basePath}.color" value="${devEscapeAttribute(item.color ?? '')}">
      </label>
    </div>
    <label class="dev-object-textarea">Description
      <textarea data-empty-mode="delete" data-object-field="${basePath}.description">${devEscapeAttribute(item.description ?? '')}</textarea>
    </label>
  `;
}

function developerObjectLinkAnchor(world, obj){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout || !obj) return null;
  const tileSize = dev.tileSize || layout.tileSize || DEV_DEFAULT_TILE_SIZE;
  const rows = dev.rows || layout.rows || 0;
  const cols = dev.cols || layout.cols || 0;
  const offsetX = dev.offsetX || 0;
  const tileScale = layout.tileScale ?? (layout.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const safeCol = clamp(Math.round(obj.col ?? 0), 0, Math.max(0, cols - 1));
  const safeRow = clamp(Math.round(obj.row ?? 0), 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + safeCol * tileSize;
  const tileTop = world.groundY - (rows - safeRow) * tileSize;
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  const centerX = tileLeft + tileSize * 0.5 + offsetXUnits;
  const baseY = tileTop + tileSize + offsetYUnits;
  if(obj.type === 'lever'){
    const baseHeight = obj.height !== undefined ? obj.height : 58;
    const height = baseHeight * tileScale;
    return { x: centerX, y: baseY - height * 0.6 };
  }
  if(obj.type === 'toggleBlock'){
    const baseHeight = obj.height !== undefined ? obj.height : tileSize;
    const height = baseHeight * tileScale;
    return { x: centerX, y: baseY - height * 0.5 };
  }
  return { x: centerX, y: baseY - tileSize * 0.5 };
}

function developerDrawToggleLink(ctx, from, to){
  if(!ctx || !from || !to) return;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function developerRenderToggleLinks(world, ctx){
  const dev = world?.dev;
  const layout = dev?.layout;
  if(!dev || !layout || !Array.isArray(layout.objects)) return;
  const levers = layout.objects.filter(obj=>obj && obj.type === 'lever');
  if(!levers.length) return;
  const blocksById = new Map();
  const blocksByGroup = new Map();
  for(const obj of layout.objects){
    if(!obj || obj.type !== 'toggleBlock') continue;
    const id = obj.id !== undefined && obj.id !== null && obj.id !== '' ? String(obj.id) : null;
    if(id) blocksById.set(id, obj);
    const groupValue = obj.group ?? obj.groupId;
    if(groupValue !== undefined && groupValue !== null){
      const key = String(groupValue);
      if(!blocksByGroup.has(key)) blocksByGroup.set(key, []);
      blocksByGroup.get(key).push(obj);
    }
  }
  ctx.save();
  ctx.strokeStyle = 'rgba(142, 210, 255, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  for(const lever of levers){
    const origin = developerObjectLinkAnchor(world, lever);
    if(!origin) continue;
    const targetIds = developerNormalizeToggleTargets(lever.targets);
    const groupIds = developerNormalizeToggleTargets(lever.groups);
    const seen = new Set();
    for(const targetId of targetIds){
      const block = blocksById.get(String(targetId));
      if(!block) continue;
      const anchor = developerObjectLinkAnchor(world, block);
      if(!anchor) continue;
      developerDrawToggleLink(ctx, origin, anchor);
      seen.add(block);
    }
    for(const groupId of groupIds){
      const groupBlocks = blocksByGroup.get(String(groupId));
      if(!groupBlocks) continue;
      for(const block of groupBlocks){
        if(seen.has(block)) continue;
        const anchor = developerObjectLinkAnchor(world, block);
        if(!anchor) continue;
        developerDrawToggleLink(ctx, origin, anchor);
      }
    }
  }
  ctx.restore();
  const pending = dev.pendingToggleLink;
  if(pending && pending.object){
    const anchor = developerObjectLinkAnchor(world, pending.object);
    if(anchor){
      ctx.save();
      ctx.strokeStyle = pending.kind === 'lever' ? '#8ed2ff' : '#ffb347';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      const radius = Math.max(10, (dev.tileSize || DEV_DEFAULT_TILE_SIZE) * 0.28);
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function renderDeveloperOverlay(world, ctx){
  if(!world.dev?.enabled) return;
  const dev = world.dev;
  const layout = dev.layout;
  if(!layout || !layout.cells) return;
  const meta = world?.levelState?.layoutMeta || null;
  const tileSize = dev.tileSize || meta?.tileSize || DEV_DEFAULT_TILE_SIZE;
  const rows = dev.rows || meta?.rows || layout.rows;
  const cols = dev.cols || meta?.cols || layout.cols;
  const offsetX = (dev.offsetX ?? meta?.offsetX ?? 0) || 0;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#8ed2ff';
  ctx.lineWidth = 1;
  for(let c=0; c<=cols; c++){
    const x = offsetX + c * tileSize;
    ctx.beginPath();
    ctx.moveTo(x, world.groundY - rows * tileSize);
    ctx.lineTo(x, world.groundY);
    ctx.stroke();
  }
  for(let r=0; r<=rows; r++){
    const y = world.groundY - r * tileSize;
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + cols * tileSize, y);
    ctx.stroke();
  }
  ctx.restore();

  if(dev.hoverCell){
    const col = dev.hoverCell.col;
    const row = dev.hoverCell.row;
    if(col>=0 && col<cols && row>=0 && row<rows){
      const left = offsetX + col * tileSize;
      const top = world.groundY - (rows - row) * tileSize;
      ctx.save();
      ctx.fillStyle = 'rgba(142,210,255,0.18)';
      ctx.fillRect(left, top, tileSize, tileSize);
      ctx.restore();
    }
  }

  const waterTiles = Array.isArray(layout.waterTiles) ? layout.waterTiles : [];
  if(waterTiles.length){
    ctx.save();
    ctx.fillStyle = 'rgba(88,188,242,0.22)';
    ctx.strokeStyle = 'rgba(79,154,223,0.8)';
    ctx.lineWidth = 1;
    for(const tile of waterTiles){
      if(!tile) continue;
      const baseCol = clamp(Math.round(tile.col ?? 0), 0, Math.max(0, cols - 1));
      const baseRow = clamp(Math.round(tile.row ?? 0), 0, Math.max(0, rows - 1));
      const widthTiles = Math.max(1, Math.round(tile.width ?? tile.cols ?? 1));
      const heightTiles = Math.max(1, Math.round(tile.height ?? tile.rows ?? tile.depth ?? 1));
      const spanCols = Math.min(widthTiles, Math.max(1, cols - baseCol));
      const spanRows = Math.min(heightTiles, Math.max(1, baseRow + 1));
      const left = offsetX + baseCol * tileSize;
      const top = world.groundY - (rows - baseRow) * tileSize - (spanRows - 1) * tileSize;
      const width = spanCols * tileSize;
      const height = spanRows * tileSize;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(left, top, width, height);
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(left, top, width, height);
    }
    ctx.restore();
  }

  ctx.save();
  for(const obj of layout.objects){
    const pos = developerObjectWorldPosition(world, obj);
    ctx.fillStyle = 'rgba(255,226,148,0.78)';
    ctx.strokeStyle = '#f2d274';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y - tileSize * 0.12, Math.max(6, tileSize * 0.16), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for(const enemy of dev.enemies){
    const pos = developerEnemyWorldPosition(world, enemy);
    ctx.fillStyle = 'rgba(255,138,138,0.65)';
    ctx.strokeStyle = '#ff8686';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(7, tileSize * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for(const weapon of layout.weapons){
    const pos = developerWeaponWorldPosition(world, weapon);
    ctx.fillStyle = 'rgba(123,200,255,0.55)';
    ctx.strokeStyle = '#7bc8ff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(6, tileSize * 0.14), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const entryRect = developerDoorWorldRect(world, layout.entryDoor);
  if(entryRect){
    ctx.fillStyle = 'rgba(127,228,176,0.22)';
    ctx.strokeStyle = '#7fe4b0';
    ctx.lineWidth = 2;
    ctx.fillRect(entryRect.left, entryRect.top, entryRect.width, entryRect.height);
    ctx.strokeRect(entryRect.left, entryRect.top, entryRect.width, entryRect.height);
  }
  const exitRect = developerDoorWorldRect(world, layout.exitDoor);
  if(exitRect){
    ctx.fillStyle = 'rgba(255,179,71,0.18)';
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.fillRect(exitRect.left, exitRect.top, exitRect.width, exitRect.height);
    ctx.strokeRect(exitRect.left, exitRect.top, exitRect.width, exitRect.height);
  }
  developerRenderToggleLinks(world, ctx);
  developerRenderParticleBrushPreview(world, ctx);
  ctx.restore();
}

function renderDeveloperSandControls(dev){
  const sand = dev.sandConfig;
  if(!sand){
    return `
      <div class="tool-row">
        <button data-fluid-action="toggle-sand">Enable Sand</button>
      </div>
    `;
  }
  const brushSize = developerClampBrushSize(dev.sandBrushSize || 12);
  const shape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  const hills = Array.isArray(sand.hills) ? sand.hills : [];
  const hillRows = hills.map((hill, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-fluid-field="sand.hills.${idx}.col" value="${devEscapeAttribute(hill.col ?? 0)}"></label>
        <label>Width <input type="number" step="0.1" min="0" data-fluid-field="sand.hills.${idx}.width" value="${devEscapeAttribute(hill.width ?? 4)}"></label>
        <label>Height <input type="number" step="0.1" min="0" data-fluid-field="sand.hills.${idx}.height" value="${devEscapeAttribute(hill.height ?? 2)}"></label>
        <button data-fluid-action="remove-sand-hill" data-fluid-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('');
  return `
    <div class="tool-row">
      <button data-fluid-action="toggle-sand">Disable Sand</button>
      <button data-fluid-action="add-sand-hill" style="flex:0 0 auto;">Add Hill</button>
    </div>
    <div class="tool-row">
      <label>Cell Size <input type="number" min="1" step="1" data-fluid-field="sand.cellSize" value="${devEscapeAttribute(sand.cellSize ?? 2)}"></label>
      <label>Base Thickness <input type="number" min="0" step="1" data-fluid-field="sand.baseThickness" value="${devEscapeAttribute(sand.baseThickness ?? 24)}"></label>
    </div>
    <div class="tool-row">
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" data-fluid-field="sand.manualOnly" ${sand.manualOnly ? 'checked' : ''}>
        Manual Painting Only
      </label>
    </div>
    <div class="tool-row">
      <label>Color <input type="text" data-fluid-field="sand.color" value="${devEscapeAttribute(sand.color ?? '')}"></label>
      <label>Shade <input type="text" data-fluid-field="sand.shade" value="${devEscapeAttribute(sand.shade ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Highlight <input type="text" data-fluid-field="sand.highlight" value="${devEscapeAttribute(sand.highlight ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Brush Size (${brushSize}px)
        <input type="range" min="1" max="96" step="1" data-fluid-brush="sand" value="${devEscapeAttribute(brushSize)}">
      </label>
    </div>
    <div class="tool-row">
      <span>Brush Shape</span>
      <div class="dev-button-group">
        <button data-brush-shape="fluid" data-shape="circle" class="${shape==='circle'?'active':''}">Circle</button>
        <button data-brush-shape="fluid" data-shape="square" class="${shape==='square'?'active':''}">Square</button>
      </div>
    </div>
    ${hillRows}
  `;
}

function renderDeveloperWaterControls(dev){
  const water = dev.waterConfig;
  if(!water){
    return `
      <div class="tool-row">
        <button data-fluid-action="toggle-water">Enable Water</button>
      </div>
    `;
  }
  const brushSize = developerClampBrushSize(dev.waterBrushSize || 12);
  const shape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  const emitters = Array.isArray(water.emitters) ? water.emitters : [];
  const emitterRows = emitters.map((emitter, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-fluid-field="water.emitters.${idx}.col" value="${devEscapeAttribute(emitter.col ?? 0)}"></label>
        <label>Row <input type="number" step="0.1" data-fluid-field="water.emitters.${idx}.row" value="${devEscapeAttribute(emitter.row ?? 0)}"></label>
        <label>Offset X <input type="number" step="1" data-fluid-field="water.emitters.${idx}.offsetX" value="${devEscapeAttribute(emitter.offsetX ?? 0)}"></label>
        <label>Offset Y <input type="number" step="1" data-fluid-field="water.emitters.${idx}.offsetY" value="${devEscapeAttribute(emitter.offsetY ?? 0)}"></label>
      </div>
      <div class="tool-row">
        <label>Rate <input type="number" min="0" step="1" data-fluid-field="water.emitters.${idx}.rate" value="${devEscapeAttribute(emitter.rate ?? 24)}"></label>
        <label>Spread X <input type="number" step="1" data-fluid-field="water.emitters.${idx}.spreadX" value="${devEscapeAttribute(emitter.spreadX ?? 0)}"></label>
        <label>Spread Y <input type="number" step="1" data-fluid-field="water.emitters.${idx}.spreadY" value="${devEscapeAttribute(emitter.spreadY ?? 0)}"></label>
        <label>Jitter <input type="number" step="0.1" min="0" data-fluid-field="water.emitters.${idx}.jitter" value="${devEscapeAttribute(emitter.jitter ?? 0)}"></label>
        <button data-fluid-action="remove-water-emitter" data-fluid-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('');
  return `
    <div class="tool-row">
      <button data-fluid-action="toggle-water">Disable Water</button>
      <button data-fluid-action="add-water-emitter" style="flex:0 0 auto;">Add Emitter</button>
    </div>
    <div class="tool-row">
      <label>Cell Size <input type="number" min="1" step="1" data-fluid-field="water.cellSize" value="${devEscapeAttribute(water.cellSize ?? 2)}"></label>
      <label>Color <input type="text" data-fluid-field="water.color" value="${devEscapeAttribute(water.color ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Shade <input type="text" data-fluid-field="water.shade" value="${devEscapeAttribute(water.shade ?? '')}"></label>
      <label>Highlight <input type="text" data-fluid-field="water.highlight" value="${devEscapeAttribute(water.highlight ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Foam <input type="text" data-fluid-field="water.foamColor" value="${devEscapeAttribute(water.foamColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Brush Size (${brushSize}px)
        <input type="range" min="1" max="96" step="1" data-fluid-brush="water" value="${devEscapeAttribute(brushSize)}">
      </label>
    </div>
    <div class="tool-row">
      <span>Brush Shape</span>
      <div class="dev-button-group">
        <button data-brush-shape="fluid" data-shape="circle" class="${shape==='circle'?'active':''}">Circle</button>
        <button data-brush-shape="fluid" data-shape="square" class="${shape==='square'?'active':''}">Square</button>
      </div>
    </div>
    ${emitterRows}
  `;
}

function renderDeveloperPowderControls(dev){
  const powder = dev.powderConfig;
  if(!powder){
    return `
      <div class="tool-row">
        <button data-fluid-action="toggle-powder">Enable Powder</button>
      </div>
    `;
  }
  const brushSize = developerClampBrushSize(dev.powderBrushSize || 12);
  const shape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  const mode = dev.powderBrushMaterial || 'wood';
  return `
    <div class="tool-row">
      <button data-fluid-action="toggle-powder">Disable Powder</button>
    </div>
    <div class="tool-row">
      <label>Cell Size <input type="number" min="1" step="1" data-fluid-field="powder.cellSize" value="${devEscapeAttribute(powder.cellSize ?? 2)}"></label>
      <label>Burn Time <input type="number" min="0.1" step="0.1" data-fluid-field="powder.burnDuration" value="${devEscapeAttribute(powder.burnDuration ?? 2.6)}"></label>
    </div>
    <div class="tool-row">
      <label>Fire Lifetime <input type="number" min="0.1" step="0.1" data-fluid-field="powder.fireLifetime" value="${devEscapeAttribute(powder.fireLifetime ?? 1.8)}"></label>
      <label>Ash Tint <input type="text" data-fluid-field="powder.ashColor" value="${devEscapeAttribute(powder.ashColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Wood Color <input type="text" data-fluid-field="powder.woodColor" value="${devEscapeAttribute(powder.woodColor ?? '')}"></label>
      <label>Ember Color <input type="text" data-fluid-field="powder.emberColor" value="${devEscapeAttribute(powder.emberColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Glow Plant (Blue) <input type="text" data-fluid-field="powder.glowPlantBlueColor" value="${devEscapeAttribute(powder.glowPlantBlueColor ?? '')}"></label>
      <label>Blue Glow <input type="text" data-fluid-field="powder.glowPlantBlueGlowColor" value="${devEscapeAttribute(powder.glowPlantBlueGlowColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Glow Plant (Gold) <input type="text" data-fluid-field="powder.glowPlantGoldColor" value="${devEscapeAttribute(powder.glowPlantGoldColor ?? '')}"></label>
      <label>Gold Glow <input type="text" data-fluid-field="powder.glowPlantGoldGlowColor" value="${devEscapeAttribute(powder.glowPlantGoldGlowColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Fire Color <input type="text" data-fluid-field="powder.fireColor" value="${devEscapeAttribute(powder.fireColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Brush Size (${brushSize}px)
        <input type="range" min="1" max="96" step="1" data-fluid-brush="powder" value="${devEscapeAttribute(brushSize)}">
      </label>
    </div>
    <div class="tool-row">
      <span>Brush Shape</span>
      <div class="dev-button-group">
        <button data-brush-shape="fluid" data-shape="circle" class="${shape==='circle'?'active':''}">Circle</button>
        <button data-brush-shape="fluid" data-shape="square" class="${shape==='square'?'active':''}">Square</button>
      </div>
    </div>
    <div class="tool-row">
      <span>Material</span>
      <div class="dev-button-group">
        <button data-powder-mode="wood" class="${mode==='wood'?'active':''}">Wood</button>
        <button data-powder-mode="glowPlantBlue" class="${mode==='glowPlantBlue'?'active':''}">Glow Plant · Blue</button>
        <button data-powder-mode="glowPlantGold" class="${mode==='glowPlantGold'?'active':''}">Glow Plant · Gold</button>
        <button data-powder-mode="fire" class="${mode==='fire'?'active':''}">Fire</button>
      </div>
    </div>
  `;
}

function renderDeveloperLavaControls(dev){
  const lava = dev.lavaConfig;
  if(!lava){
    return `
      <div class="tool-row">
        <button data-fluid-action="toggle-lava">Enable Lava</button>
      </div>
    `;
  }
  const brushSize = developerClampBrushSize(dev.lavaBrushSize || 12);
  const shape = dev.fluidBrushShape === 'square' ? 'square' : 'circle';
  const emitters = Array.isArray(lava.emitters) ? lava.emitters : [];
  const emitterRows = emitters.map((emitter, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-fluid-field="lava.emitters.${idx}.col" value="${devEscapeAttribute(emitter.col ?? 0)}"></label>
        <label>Row <input type="number" step="0.1" data-fluid-field="lava.emitters.${idx}.row" value="${devEscapeAttribute(emitter.row ?? 0)}"></label>
        <label>Rate <input type="number" step="1" min="0" data-fluid-field="lava.emitters.${idx}.rate" value="${devEscapeAttribute(emitter.rate ?? 16)}"></label>
        <button data-fluid-action="remove-lava-emitter" data-fluid-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('');
  return `
    <div class="tool-row">
      <button data-fluid-action="toggle-lava">Disable Lava</button>
      <button data-fluid-action="add-lava-emitter" style="flex:0 0 auto;">Add Vent</button>
    </div>
    <div class="tool-row">
      <label>Cell Size <input type="number" min="1" step="1" data-fluid-field="lava.cellSize" value="${devEscapeAttribute(lava.cellSize ?? 2)}"></label>
      <label>Color <input type="text" data-fluid-field="lava.color" value="${devEscapeAttribute(lava.color ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Shade <input type="text" data-fluid-field="lava.shade" value="${devEscapeAttribute(lava.shade ?? '')}"></label>
      <label>Highlight <input type="text" data-fluid-field="lava.highlight" value="${devEscapeAttribute(lava.highlight ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Foam <input type="text" data-fluid-field="lava.foamColor" value="${devEscapeAttribute(lava.foamColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Brush Size (${brushSize}px)
        <input type="range" min="1" max="96" step="1" data-fluid-brush="lava" value="${devEscapeAttribute(brushSize)}">
      </label>
    </div>
    <div class="tool-row">
      <span>Brush Shape</span>
      <div class="dev-button-group">
        <button data-brush-shape="fluid" data-shape="circle" class="${shape==='circle'?'active':''}">Circle</button>
        <button data-brush-shape="fluid" data-shape="square" class="${shape==='square'?'active':''}">Square</button>
      </div>
    </div>
    ${emitterRows}
  `;
}

function renderDeveloperGrassControls(dev){
  const grass = dev.grassConfig;
  if(!grass){
    return `
      <div class="tool-row">
        <button data-grass-action="toggle-grass">Enable Grass</button>
      </div>
    `;
  }
  const surfaces = Array.isArray(grass.surfaces) ? grass.surfaces : [];
  const patches = Array.isArray(grass.patches) ? grass.patches : [];
  const clearings = Array.isArray(grass.clearings) ? grass.clearings : [];
  const scatter = grass.scatter || null;
  const surfaceRows = surfaces.length ? surfaces.map((surface, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-grass-field="grass.surfaces.${idx}.col" value="${devEscapeAttribute(surface.col ?? 0)}"></label>
        <label>Width (cols) <input type="number" min="0" step="0.1" data-grass-field="grass.surfaces.${idx}.cols" value="${devEscapeAttribute(surface.cols ?? 1)}"></label>
        <button data-grass-action="remove-grass-surface" data-grass-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('') : '';
  const patchRows = patches.length ? patches.map((patch, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-grass-field="grass.patches.${idx}.col" value="${devEscapeAttribute(patch.col ?? 0)}"></label>
        <label>Width (cols) <input type="number" min="0" step="0.1" data-grass-field="grass.patches.${idx}.cols" value="${devEscapeAttribute(patch.cols ?? 6)}"></label>
        <label>Density <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.patches.${idx}.density" value="${devEscapeAttribute(patch.density ?? 1)}"></label>
        <label>Noise <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.patches.${idx}.noise" value="${devEscapeAttribute(patch.noise ?? 0)}"></label>
        <label>Taper <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.patches.${idx}.taper" value="${devEscapeAttribute(patch.taper ?? 0)}"></label>
        <button data-grass-action="remove-grass-patch" data-grass-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('') : '';
  const clearingRows = clearings.length ? clearings.map((entry, idx)=>`
      <div class="tool-row">
        <label>Col <input type="number" step="0.1" data-grass-field="grass.clearings.${idx}.col" value="${devEscapeAttribute(entry.col ?? 0)}"></label>
        <label>Width (cols) <input type="number" min="0" step="0.1" data-grass-field="grass.clearings.${idx}.cols" value="${devEscapeAttribute(entry.cols ?? 3)}"></label>
        <button data-grass-action="remove-grass-clearing" data-grass-index="${idx}" style="flex:0 0 auto;">Remove</button>
      </div>
    `).join('') : '';
  const scatterRow = scatter ? `
    <div class="tool-row">
      <label>Seed Count <input type="number" min="0" step="1" data-grass-field="grass.scatter.count" value="${devEscapeAttribute(scatter.count ?? 0)}"></label>
      <label>Seed Density <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.scatter.density" value="${devEscapeAttribute(scatter.density ?? 0.4)}"></label>
      <button data-grass-action="disable-grass-scatter" style="flex:0 0 auto;">Remove Scatter</button>
    </div>
  ` : `
    <div class="tool-row">
      <button data-grass-action="enable-grass-scatter">Add Seed Scatter</button>
    </div>
  `;
  return `
    <div class="tool-row">
      <button data-grass-action="toggle-grass">Disable Grass</button>
    </div>
    <div class="tool-row">
      <label>Cell Size <input type="number" min="1" step="1" data-grass-field="grass.cellSize" value="${devEscapeAttribute(grass.cellSize ?? 6)}"></label>
      <label>Blade Height <input type="number" min="4" step="1" data-grass-field="grass.bladeHeight" value="${devEscapeAttribute(grass.bladeHeight ?? 28)}"></label>
    </div>
    <div class="tool-row">
      <label>Base Density <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.baseDensity" value="${devEscapeAttribute(grass.baseDensity ?? 0)}"></label>
      <label>Max Density <input type="number" min="0" max="1" step="0.05" data-grass-field="grass.maxDensity" value="${devEscapeAttribute(grass.maxDensity ?? 1)}"></label>
    </div>
    <div class="tool-row">
      <label>Growth Rate <input type="number" min="0" step="0.01" data-grass-field="grass.growthRate" value="${devEscapeAttribute(grass.growthRate ?? 0.24)}"></label>
      <label>Spread Rate <input type="number" min="0" step="0.01" data-grass-field="grass.spreadRate" value="${devEscapeAttribute(grass.spreadRate ?? 0.18)}"></label>
    </div>
    <div class="tool-row">
      <label>Burn Rate <input type="number" min="0" step="0.05" data-grass-field="grass.burnRate" value="${devEscapeAttribute(grass.burnRate ?? 1.4)}"></label>
      <label>Regrow Delay <input type="number" min="0" step="0.1" data-grass-field="grass.regrowDelay" value="${devEscapeAttribute(grass.regrowDelay ?? 4)}"></label>
    </div>
    <div class="tool-row">
      <label>Wind Strength <input type="number" min="0" step="0.1" data-grass-field="grass.windStrength" value="${devEscapeAttribute(grass.windStrength ?? 8)}"></label>
      <label>Wind Speed <input type="number" min="0" step="0.1" data-grass-field="grass.windSpeed" value="${devEscapeAttribute(grass.windSpeed ?? 1.6)}"></label>
    </div>
    <div class="tool-row">
      <label>Base Color <input type="text" data-grass-field="grass.baseColor" value="${devEscapeAttribute(grass.baseColor ?? '')}"></label>
      <label>Highlight <input type="text" data-grass-field="grass.highlightColor" value="${devEscapeAttribute(grass.highlightColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <label>Burnt Color <input type="text" data-grass-field="grass.burntColor" value="${devEscapeAttribute(grass.burntColor ?? '')}"></label>
    </div>
    <div class="tool-row">
      <button data-grass-action="add-grass-surface" style="flex:0 0 auto;">Add Surface</button>
    </div>
    ${surfaceRows}
    ${scatterRow}
    <div class="tool-row">
      <button data-grass-action="add-grass-patch" style="flex:0 0 auto;">Add Patch</button>
      <button data-grass-action="add-grass-clearing" style="flex:0 0 auto;">Add Clearing</button>
    </div>
    ${patchRows}
    ${clearingRows}
  `;
}

function refreshDeveloperPanel(world){
  const dev = world.dev;
  if(!dev || !dev.panel || !dev.panelDirty) return;
  const panel = dev.panel;
  dev.panelDirty = false;
  dev.brush = normalizeDeveloperBrush(dev.brush);
  if(!dev.enabled){
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }
  panel.classList.remove('hidden');
  panel.classList.remove('dragging');
  const hasLayout = !!(dev.layout && dev.layout.cells);
  const enemyOptions = DEV_ENEMY_TYPES.map(opt=>`<option value="${opt.id}" ${opt.id===dev.enemyKind?'selected':''}>${opt.label}</option>`).join('');
  const objectEntry = developerFindObjectTypeEntry(dev.objectType);
  if(objectEntry && dev.objectType !== objectEntry.id){
    dev.objectType = objectEntry.id;
  }
  const objectSelectValue = objectEntry?.id || dev.objectType || DEV_OBJECT_TYPES[0]?.id || 'crate';
  const objectOptions = DEV_OBJECT_TYPES.map(opt=>`<option value="${opt.id}" ${opt.id===objectSelectValue?'selected':''}>${opt.label}</option>`).join('');
  const weaponOptions = DEV_WEAPON_TYPES.map(opt=>`<option value="${opt.id}" ${opt.id===dev.weaponId?'selected':''}>${opt.label}</option>`).join('');
  const doorButtons = DEV_DOOR_TYPES.map(opt=>`<button data-door-target="${opt.id}" class="${dev.doorTarget===opt.id?'active':''}">${opt.label}</button>`).join('');
  const powderMaterial = dev.powderBrushMaterial || 'wood';
  const sandMaterial = dev.sandBrushMaterial || 'sand';
  const waterStyle = dev.waterBrushStyle || 'water';
  const palette = world.levelState?.def?.palette || null;
  const paletteTerrainStyle = developerNormalizeTerrainStyle(palette?.terrainStyle);
  const brushTerrainStyle = developerNormalizeTerrainStyle(dev.terrainBrushStyle) || paletteTerrainStyle || 'meadow';
  dev.terrainBrushStyle = brushTerrainStyle;
  const blockStyleSelectValue = brushTerrainStyle;
  const blockStyleOptions = DEV_TERRAIN_BLOCK_STYLES.map(opt=>`<option value="${opt.id}" ${opt.id===blockStyleSelectValue?'selected':''}>${opt.label}</option>`).join('');
  const blockVariantRaw = palette?.terrainVariant || palette?.blockVariant || null;
  const blockVariantSelectValue = blockVariantRaw === 'alt' ? 'alt' : 'default';
  const blockStyleControls = blockStyleOptions ? `
    <div class="tool-row">
      <label>Terrain Blocks
        <select data-block-style="level">
          ${blockStyleOptions}
        </select>
      </label>
    </div>
  ` : '';
  const blockVariantControls = `
    <div class="tool-row">
      <label>Block Style
        <select data-block-variant="level">
          <option value="default"${blockVariantSelectValue==='default'?' selected':''}>Default Blocks</option>
          <option value="alt"${blockVariantSelectValue==='alt'?' selected':''}>Alternate Blocks</option>
        </select>
      </label>
    </div>
  `;
  const levelName = world.levelState?.def?.name || 'Sandbox';
  const screen = world.levelState?.def?.screens?.[world.levelState?.screenIndex] || null;
  const subtitle = screen?.name ? `${levelName} · ${screen.name}` : levelName;
  const toolLabel = DEV_TOOL_LABELS[dev.tool] || 'Tools';
  const objectLabel = developerObjectTypeLabel(dev.objectType);
  const enemyLabel = DEV_ENEMY_TYPES.find(opt=>opt.id===dev.enemyKind)?.label || dev.enemyKind || 'Enemy';
  const weaponLabel = DEV_WEAPON_TYPES.find(opt=>opt.id===dev.weaponId)?.label || dev.weaponId || 'Weapon';
  const doorFocus = dev.doorTarget === 'exit' ? 'Exit Door' : 'Entry Door';
  const entryDoor = dev.layout?.entryDoor || null;
  const exitDoor = dev.layout?.exitDoor || null;
  const entryStatus = entryDoor ? 'Placed' : 'Missing';
  const exitStatus = exitDoor ? 'Placed' : 'Missing';
  const entryCoords = entryDoor ? `(${entryDoor.col}, ${entryDoor.row})` : '—';
  const exitCoords = exitDoor ? `(${exitDoor.col}, ${exitDoor.row})` : '—';
  const decorationOptions = developerDecorationPaletteOptions();
  if(decorationOptions.length && !decorationOptions.find(opt=>opt.id===dev.decorationSelection)){
    dev.decorationSelection = decorationOptions[0].id;
  }
  let selectionValue = 'Selection';
  if(dev.tool === 'terrain'){
    const brush = dev.brush || 'foregroundAdd';
    switch(brush){
      case 'foregroundErase':
        selectionValue = 'Erase Blocks';
        break;
      case 'backgroundAdd':
        selectionValue = 'Add Background';
        break;
      case 'backgroundErase':
        selectionValue = 'Erase Background';
        break;
      case 'waterAdd':
        selectionValue = 'Add Water Blocks';
        break;
      case 'waterErase':
        selectionValue = 'Erase Water Blocks';
        break;
      case 'foregroundAdd':
      default:
        selectionValue = 'Add Blocks';
        break;
    }
  }else if(dev.tool === 'objects'){
    if(dev.pendingToggleLink){
      if(dev.pendingToggleLink.kind === 'lever'){
        selectionValue = 'Link Lever';
      }else{
        selectionValue = 'Link Toggle Block';
      }
    }else{
      selectionValue = objectLabel;
    }
  }else if(dev.tool === 'enemies'){
    selectionValue = enemyLabel;
  }else if(dev.tool === 'weapons'){
    selectionValue = weaponLabel;
  }else if(dev.tool === 'doors'){
    selectionValue = doorFocus;
  }else if(dev.tool === 'sand'){
    selectionValue = dev.sandConfig ? 'Sand Enabled' : 'Sand Disabled';
  }else if(dev.tool === 'water'){
    selectionValue = dev.waterConfig ? 'Water Enabled' : 'Water Disabled';
  }else if(dev.tool === 'powder'){
    selectionValue = dev.powderConfig ? 'Powder Enabled' : 'Powder Disabled';
  }else if(dev.tool === 'lava'){
    selectionValue = dev.lavaConfig ? 'Lava Enabled' : 'Lava Disabled';
  }else if(dev.tool === 'grass'){
    selectionValue = dev.grassConfig ? 'Grass Enabled' : 'Grass Disabled';
  }
  const particlePaletteRow = `
    <div class="tool-row dev-particle-palette">
      <span>Particle Palette</span>
      <div class="dev-button-group">
        <button data-particle-select="sand" class="${dev.tool==='sand' && sandMaterial!=='steel'?'active':''}">Sand</button>
        <button data-particle-select="sand:steel" class="${dev.tool==='sand' && sandMaterial==='steel'?'active':''}">Steel</button>
        <button data-particle-select="water" class="${dev.tool==='water' && waterStyle!=='ice'?'active':''}">Water</button>
        <button data-particle-select="water:ice" class="${dev.tool==='water' && waterStyle==='ice'?'active':''}">Ice</button>
        <button data-particle-select="lava" class="${dev.tool==='lava'?'active':''}">Lava</button>
        <button data-particle-select="powder:wood" class="${dev.tool==='powder' && powderMaterial==='wood'?'active':''}">Wood</button>
        <button data-particle-select="powder:glowPlantBlue" class="${dev.tool==='powder' && powderMaterial==='glowPlantBlue'?'active':''}">Glow Plant · Blue</button>
        <button data-particle-select="powder:glowPlantGold" class="${dev.tool==='powder' && powderMaterial==='glowPlantGold'?'active':''}">Glow Plant · Gold</button>
        <button data-particle-select="powder:fire" class="${dev.tool==='powder' && powderMaterial==='fire'?'active':''}">Fire</button>
        <button data-particle-select="powder:steel" class="${dev.tool==='powder' && powderMaterial==='steel'?'active':''}">Steel</button>
      </div>
    </div>
  `;
  const decorationPaletteRow = decorationOptions.length ? `
    <div class="tool-row dev-decoration-palette">
      <span>Decoration Palette</span>
      <div class="dev-button-group">
        ${decorationOptions.map(opt=>`<button data-decoration-select="${opt.id}" class="${dev.decorationSelection===opt.id?'active':''}">${opt.label}</button>`).join('')}
      </div>
    </div>
  ` : '';
  const timeButtonLabel = dev.timeFrozen ? 'Resume Time' : 'Pause Time';
  const previousScroll = Number.isFinite(dev.panelScrollTop) ? Math.max(0, dev.panelScrollTop) : panel.scrollTop || 0;
  panel.innerHTML = `
    <div class="dev-panel-header">
      <div class="dev-panel-title">
        <h2>Developer Tools</h2>
        <div class="dev-panel-subtitle">${subtitle}</div>
      </div>
      <div class="dev-pill">${toolLabel} Tool</div>
    </div>
    <div class="dev-status-grid">
      <div class="dev-status-item">
        <span class="dev-status-label">Grid Size</span>
        <span class="dev-status-value">${hasLayout ? `${dev.cols} × ${dev.rows}` : 'Unavailable'}</span>
        <span class="dev-status-note">${hasLayout ? `${dev.tileSize}px tiles` : 'No editable layout for this screen.'}</span>
      </div>
      <div class="dev-status-item">
        <span class="dev-status-label">Selection</span>
        <span class="dev-status-value">${selectionValue}</span>
      </div>
    </div>
    ${hasLayout ? `
      <div class="tool-row dev-grid-adjust">
        <span class="dev-inline-hint" style="flex:0 0 auto;">Expand Grid</span>
        <div class="dev-button-group">
          <button data-action="dev-add-col-left">Add Column Left</button>
          <button data-action="dev-add-col-right">Add Column Right</button>
          <button data-action="dev-add-row-top">Add Row Above</button>
          <button data-action="dev-add-row-bottom">Add Row Below</button>
        </div>
      </div>
    ` : ''}
    <div class="tool-row">
      <button data-dev-time="toggle">${timeButtonLabel}</button>
    </div>
    ${hasLayout ? `
      <div class="dev-door-status">
        <div class="dev-door-target">
          <span>Active door</span>
          <strong>${doorFocus}</strong>
        </div>
        <div class="dev-door-summary">
          <div>Entry: <strong class="${entryDoor ? 'status-set' : 'status-missing'}">${entryStatus}</strong><span class="dev-status-note">${entryCoords}</span></div>
          <div>Exit: <strong class="${exitDoor ? 'status-set' : 'status-missing'}">${exitStatus}</strong><span class="dev-status-note">${exitCoords}</span></div>
        </div>
      </div>
    ` : ''}
    <div class="dev-toolbar">
      <div class="tool-row">
        <button data-dev-tool="terrain" class="${dev.tool==='terrain'?'active':''}">Terrain</button>
        <button data-dev-tool="objects" class="${dev.tool==='objects'?'active':''}">Objects</button>
        <button data-dev-tool="enemies" class="${dev.tool==='enemies'?'active':''}">Enemies</button>
        <button data-dev-tool="weapons" class="${dev.tool==='weapons'?'active':''}">Weapons</button>
        <button data-dev-tool="doors" class="${dev.tool==='doors'?'active':''}">Doors</button>
        <button data-dev-tool="sand" class="${dev.tool==='sand'?'active':''}">Sand</button>
        <button data-dev-tool="powder" class="${dev.tool==='powder'?'active':''}">Powder</button>
        <button data-dev-tool="water" class="${dev.tool==='water'?'active':''}">Water</button>
        <button data-dev-tool="lava" class="${dev.tool==='lava'?'active':''}">Lava</button>
        <button data-dev-tool="grass" class="${dev.tool==='grass'?'active':''}">Grass</button>
      </div>
      ${particlePaletteRow}
      ${decorationPaletteRow}
        ${dev.tool==='terrain' ? `
          <div class="tool-row">
            <button data-dev-brush="foregroundAdd" class="${dev.brush==='foregroundAdd'?'active':''}">Add Blocks</button>
            <button data-dev-brush="foregroundErase" class="${dev.brush==='foregroundErase'?'active':''}">Erase Blocks</button>
            <button data-dev-brush="backgroundAdd" class="${dev.brush==='backgroundAdd'?'active':''}">Add Background</button>
            <button data-dev-brush="backgroundErase" class="${dev.brush==='backgroundErase'?'active':''}">Erase Background</button>
          </div>
          <div class="tool-row">
            <button data-dev-brush="waterAdd" class="${dev.brush==='waterAdd'?'active':''}">Add Water (~)</button>
            <button data-dev-brush="waterErase" class="${dev.brush==='waterErase'?'active':''}">Erase Water</button>
          </div>
          ${blockStyleControls}
          ${blockVariantControls}
        ` : ''}
      ${dev.tool==='objects' ? `
        <div class="tool-row">
          <select data-dev-select="object">${objectOptions}</select>
        </div>
        <div class="tool-row">
          <div class="dev-checkbox">
            <input type="checkbox" id="dev-lock-objects-x" data-dev-object-lock="horizontal" ${dev.objectLockHorizontal !== false ? 'checked' : ''}>
            <label for="dev-lock-objects-x">Lock X to grid center</label>
          </div>
          <div class="dev-checkbox">
            <input type="checkbox" id="dev-lock-objects-y" data-dev-object-lock="vertical" ${dev.objectLockVertical !== false ? 'checked' : ''}>
            <label for="dev-lock-objects-y">Lock Y to grid center</label>
          </div>
        </div>
        ${renderDeveloperObjectEditors(dev)}
      ` : ''}
      ${dev.tool==='enemies' ? `
        <div class="tool-row">
          <select data-dev-select="enemy">${enemyOptions}</select>
          <button data-action="dev-clear-enemies" style="flex:0 0 auto;">Clear</button>
        </div>
      ` : ''}
      ${dev.tool==='weapons' ? `
        <div class="tool-row">
          <select data-dev-select="weapon">${weaponOptions}</select>
          <button data-action="dev-clear-weapons" style="flex:0 0 auto;">Clear</button>
        </div>
      ` : ''}
      ${dev.tool==='doors' ? `
        <div class="tool-row door-row">
          ${doorButtons}
          <button data-action="dev-clear-door" style="flex:0 0 auto;">Clear</button>
        </div>
      ` : ''}
      ${dev.tool==='sand' ? renderDeveloperSandControls(dev) : ''}
      ${dev.tool==='powder' ? renderDeveloperPowderControls(dev) : ''}
      ${dev.tool==='water' ? renderDeveloperWaterControls(dev) : ''}
      ${dev.tool==='lava' ? renderDeveloperLavaControls(dev) : ''}
      ${dev.tool==='grass' ? renderDeveloperGrassControls(dev) : ''}
      <div class="dev-actions">
        <button data-action="dev-export">Copy Layout</button>
        <button data-action="dev-export-log">Log Layout</button>
      </div>
    </div>
    ${dev.lastExportMessage ? `<div class="dev-message">${dev.lastExportMessage}</div>` : ''}
  `;
  const maxScroll = Math.max(panel.scrollHeight - panel.clientHeight, 0);
  const nextScroll = Math.min(previousScroll, maxScroll);
  panel.scrollTop = nextScroll;
  dev.panelScrollTop = panel.scrollTop || nextScroll || 0;
  dev.panelScrollCarry = 0;
}

function exportDeveloperLayout(world, logOnly){
  if(!world?.dev || !world.dev.layout) return;
  if(world.dev.sandConfig){
    if(world.sand) developerCaptureFluidState(world, 'sand', { skipDirty: true });
    else developerSyncFluidConfigParticles(world, 'sand');
  }
  if(world.dev.powderConfig){
    if(world.powder) developerCaptureFluidState(world, 'powder', { skipDirty: true });
    else developerSyncPowderConfigParticles(world);
  }
  if(world.dev.waterConfig){
    if(world.water) developerCaptureFluidState(world, 'water', { skipDirty: true });
    else developerSyncFluidConfigParticles(world, 'water');
  }
  if(world.dev.lavaConfig){
    if(world.lava) developerCaptureFluidState(world, 'lava', { skipDirty: true });
    else developerSyncFluidConfigParticles(world, 'lava');
  }
  const layout = world.dev.layout;
  developerEnsureBackgroundCells(layout);
  developerEnsureTerrainStyles(layout);
  developerEnsureFluidTiles(layout, 'water');
  developerEnsureFluidTiles(layout, 'sand');
  developerEnsureFluidTiles(layout, 'lava');
  const tileGrid = layout.cells.map(row=>row.map(cell=>cell ? '#' : '.'));
  developerApplyFluidTilesToGrid(tileGrid, layout.waterTiles, '~');
  developerApplyFluidTilesToGrid(tileGrid, layout.sandTiles, '=');
  const tileStrings = tileGrid.map(row=>row.join(''));
  const exportData = {
    tileSize: layout.tileSize || world.dev.tileSize || DEV_DEFAULT_TILE_SIZE,
    cols: layout.cols,
    rows: layout.rows,
    tiles: tileStrings,
    backgroundTiles: layout.backgroundCells
      ? layout.backgroundCells.map(row=>row.map(cell=>cell?'#':'.').join(''))
      : undefined,
    objects: layout.objects.map(obj=>{
      const base = { type: obj.type, col: obj.col, row: obj.row };
      if(obj.offsetX) base.offsetX = obj.offsetX;
      if(obj.offsetY) base.offsetY = obj.offsetY;
      for(const key in obj){
        if(['type','col','row','offsetX','offsetY'].includes(key)) continue;
        base[key] = obj[key];
      }
      return base;
    }),
    enemies: world.dev.enemies.map(enemy=>{
      const base = { kind: enemy.kind, col: enemy.col, row: enemy.row };
      if(enemy.offsetX) base.offsetX = enemy.offsetX;
      if(enemy.offsetY) base.offsetY = enemy.offsetY;
      return base;
    }),
    weapons: layout.weapons.map(weapon=>{
      const base = { id: weapon.id, col: weapon.col, row: weapon.row };
      if(weapon.offsetX) base.offsetX = weapon.offsetX;
      if(weapon.offsetY) base.offsetY = weapon.offsetY;
      return base;
    }),
    entryDoor: layout.entryDoor ? (()=>{
      const base = { col: layout.entryDoor.col, row: layout.entryDoor.row };
      if(layout.entryDoor.offsetX) base.offsetX = layout.entryDoor.offsetX;
      if(layout.entryDoor.offsetY) base.offsetY = layout.entryDoor.offsetY;
      return base;
    })() : null,
    exitDoor: layout.exitDoor ? (()=>{
      const base = { col: layout.exitDoor.col, row: layout.exitDoor.row };
      if(layout.exitDoor.offsetX) base.offsetX = layout.exitDoor.offsetX;
      if(layout.exitDoor.offsetY) base.offsetY = layout.exitDoor.offsetY;
      return base;
    })() : null,
    sandScene: world.dev.sandConfig
      ? (typeof cloneSandScene === 'function' ? cloneSandScene(world.dev.sandConfig) : JSON.parse(JSON.stringify(world.dev.sandConfig)))
      : null,
    powderScene: world.dev.powderConfig
      ? (typeof clonePowderScene === 'function' ? clonePowderScene(world.dev.powderConfig) : JSON.parse(JSON.stringify(world.dev.powderConfig)))
      : null,
    grassScene: world.dev.grassConfig
      ? (typeof cloneGrassScene === 'function' ? cloneGrassScene(world.dev.grassConfig) : JSON.parse(JSON.stringify(world.dev.grassConfig)))
      : null,
    waterScene: world.dev.waterConfig
      ? (typeof cloneWaterScene === 'function' ? cloneWaterScene(world.dev.waterConfig) : JSON.parse(JSON.stringify(world.dev.waterConfig)))
      : null,
    lavaScene: world.dev.lavaConfig
      ? (typeof cloneLavaScene === 'function' ? cloneLavaScene(world.dev.lavaConfig) : JSON.parse(JSON.stringify(world.dev.lavaConfig)))
      : null
  };
  const waterTileSpecs = developerNormalizeFluidTilesForExport(layout.waterTiles);
  if(waterTileSpecs.length) exportData.waterTiles = waterTileSpecs;
  const sandTileSpecs = developerNormalizeFluidTilesForExport(layout.sandTiles);
  if(sandTileSpecs.length) exportData.sandTiles = sandTileSpecs;
  const lavaTileSpecs = developerNormalizeFluidTilesForExport(layout.lavaTiles);
  if(lavaTileSpecs.length) exportData.lavaTiles = lavaTileSpecs;
  if(Array.isArray(layout.terrainStyles)){
    const hasStyles = layout.terrainStyles.some(row=>row.some(style=>developerNormalizeTerrainStyle(style)));
    if(hasStyles){
      exportData.terrainStyles = layout.terrainStyles.map(row=>row.map(style=>developerNormalizeTerrainStyle(style)));
    }
  }
  const devOffsetX = world.dev?.offsetX || 0;
  const sandCellSize = exportData.sandScene?.cellSize || world.sand?.cellSize || SAND_DEFAULT_CELL_SIZE;
  const powderCellSize = exportData.powderScene?.cellSize || world.powder?.cellSize || POWDER_DEFAULT_CELL_SIZE;
  const waterCellSize = exportData.waterScene?.cellSize || world.water?.cellSize || WATER_DEFAULT_CELL_SIZE;
  const lavaCellSize = exportData.lavaScene?.cellSize || world.lava?.cellSize || WATER_DEFAULT_CELL_SIZE;
  const sandParticles = Array.isArray(exportData.sandScene?.particles)
    ? exportData.sandScene.particles.map(entry=>developerFormatParticleForExport(entry, 'sand', { defaultType: 'sand', cellSize: sandCellSize, offsetX: devOffsetX })).filter(Boolean)
    : [];
  const powderParticles = Array.isArray(exportData.powderScene?.particles)
    ? exportData.powderScene.particles.map(entry=>developerFormatParticleForExport(entry, 'powder', { defaultType: 'wood', cellSize: powderCellSize, offsetX: devOffsetX })).filter(Boolean)
    : [];
  const waterParticles = Array.isArray(exportData.waterScene?.particles)
    ? exportData.waterScene.particles.map(entry=>developerFormatParticleForExport(entry, 'water', { defaultType: 'water', cellSize: waterCellSize, offsetX: devOffsetX })).filter(Boolean)
    : [];
  const lavaParticles = Array.isArray(exportData.lavaScene?.particles)
    ? exportData.lavaScene.particles.map(entry=>developerFormatParticleForExport(entry, 'lava', { defaultType: 'lava', cellSize: lavaCellSize, offsetX: devOffsetX })).filter(Boolean)
    : [];
  if(exportData.sandScene) exportData.sandScene.particles = sandParticles;
  if(exportData.powderScene) exportData.powderScene.particles = powderParticles;
  if(exportData.waterScene) exportData.waterScene.particles = waterParticles;
  if(exportData.lavaScene) exportData.lavaScene.particles = lavaParticles;
  const text = JSON.stringify(exportData, null, 2);
  if(logOnly){
    console.log('[DEV] Layout export', text);
    world.dev.lastExportMessage = 'Layout JSON logged to console.';
    world.dev.panelDirty = true;
    return;
  }
  if(navigator?.clipboard?.writeText){
    navigator.clipboard.writeText(text).then(()=>{
      world.dev.lastExportMessage = 'Layout copied to clipboard.';
      world.dev.panelDirty = true;
    }).catch(()=>{
      console.log('[DEV] Layout export', text);
      world.dev.lastExportMessage = 'Copy failed, layout logged to console.';
      world.dev.panelDirty = true;
    });
  }else{
    console.log('[DEV] Layout export', text);
    world.dev.lastExportMessage = 'Clipboard unavailable, layout logged to console.';
    world.dev.panelDirty = true;
  }
}

