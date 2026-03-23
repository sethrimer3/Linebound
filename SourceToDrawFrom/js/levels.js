// levels.js
//
// Layout Symbol Key (character -> meaning):
// . : Empty air
// # : Solid terrain block
// X : Solid terrain block (alternate glyph)
// c : Crate (breakable)
// t : Grass tuft
// g : Sprout
// p : Platform (180px wide, raised 18px)
// s : Spike hazard (120px wide)
// m : Dirt wall (crumble)
// y : Wood wall (burnable)
// o : Stone wall (explosive)
// a : Sandstone wall (crumble)
// z : Steel wall (unbreakable)
// ! : Enemy spawner
// w : Water spout
// ~ : Water tile (fills water simulation cells)
// = : Sand tile (fills sand simulation cells)
// k : Skill pedestal
// < : Entry door
// > : Exit door
// @ : Weapon pickup (defaults to sword)
// F : Firefly jar (breakable light source)
// H : Hanging firefly jar (breakable light source)
// J : Chrono fly jar (breaks into chronometric stasis swarm)
// L : Torch
// G : Glow crystal
// V : Lava spout
// B : Treasure chest
// S : Sword pedestal
// E : Lever
// T : Toggle platform
// U : Toggle block
// b : Weak block (physical damage only)
// f : Weak block (fire damage only)
// i : Weak block (ice damage only)
// l : Weak block (light damage only)
// q : Weak block (chronometric damage only)
// r : Weak block (war damage only)
// v : Weak block (void damage only)
// n : Weak block (necrotic damage only)
// h : Weak block (life damage only)
// A : Auric beacon
// Q : Chrono field
// W : Wind lift
// D : Steam vent
// R : Rain field
// N : Star field
// Y : Foreground sun rays
// Z : Foreground shadow
// O : Void portal
// M : Void symbol
// I : Raft
// K : Boat
// d : World tree branch
// e : Canopy leaves
// P : Physics box
// x : Soft hexagon
// j : Firefly jar swarm
// ^ : Resting stick
// 1-9 : Enemy spawns – each level defines its own mapping from digits to enemy types

function normalizeTerrainStyleId(style){
  if(style === undefined || style === null) return null;
  if(typeof style === 'string'){
    const trimmed = style.trim();
    if(!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') return null;
    return trimmed;
  }
  const str = String(style);
  if(!str) return null;
  const trimmed = str.trim();
  return trimmed ? trimmed : null;
}

const DEFAULT_LAYOUT_SYMBOLS = {
  '.': { terrain: false },
  '#': { terrain: true },
  'X': { terrain: true },
  c: { object: { type: 'crate', width: 34, height: 28 } },
  t: { object: { type: 'tuft', width: 46, height: 26 } },
  g: { object: { type: 'sprout', height: 28 } },
  p: { object: { type: 'platform', width: 64, offsetY: -18 } },
  s: { object: { type: 'spikes', width: 64, height: 32, offsetY: -6 } },
  m: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30 } },
  y: { object: { type: 'crumbleWall', offsetY: -16, material: 'wood', flammable: true, width: 30, height: 30 } },
  o: { object: { type: 'crumbleWall', offsetY: -16, material: 'stone', flammable: false, width: 30, height: 30 } },
  a: { object: { type: 'crumbleWall', offsetY: -16, material: 'sandstone', flammable: false, width: 30, height: 30 } },
  z: { object: { type: 'crumbleWall', offsetY: -16, material: 'steel', flammable: false, width: 30, height: 30 } },
  '!': { object: { type: 'spawner', offsetY: -12, width: 44, height: 68, color: '#3a2f5a', glowColor: '#9f8cff' } },
  'C': { object: { type: 'chronosphere', radius: 150, orbRadius: 15 } },
  w: { object: { type: 'waterSpout', width: 60, height: 46, offsetY: -24, flowWidth: 28, flowHeight: 72, waterColor: '#58c9ff', glowColor: 'rgba(150, 236, 255, 0.7)', casingColor: '#4a3e2f', trimColor: '#756650', shadowColor: '#2f241a' } },
  '~': { terrain: false, fluid: { type: 'water' } },
  '=': { terrain: false, fluid: { type: 'sand' } },
  k: { object: { type: 'skillPedestal', width: 96, height: 96, offsetX: 0, offsetY: 0, radius: 110 } },
  '<': { door: 'entry', offsetX: 0, offsetY: 0 },
  '>': { door: 'exit', offsetX: 0, offsetY: 0 },
  '@': { weapon: { id: 'sword', offsetX: 0, offsetY: 0 } },
  'F': { object: { type: 'fireflyJar' } },
  'H': { object: { type: 'hangingFireflyJar' } },
  'J': { object: { type: 'chronoFlyJar' } },
  'L': { object: { type: 'torch', width: 26, height: 50 } },
  'G': { object: { type: 'glowCrystal', width: 34, height: 48 } },
  'V': { object: { type: 'lavaSpout', width: 54, height: 46, offsetY: -24, flowWidth: 28, flowHeight: 72 } },
  'B': { object: { type: 'treasureChest', width: 68, height: 48 } },
  'S': { object: { type: 'swordPedestal', width: 86, height: 100 } },
  'E': { object: { type: 'lever', width: 32, height: 52 } },
  'T': { object: { type: 'toggleBlock', width: 60, height: 40 } },
  'U': { object: { type: 'toggleBlock', width: 30, height: 30 } },
  b: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'physical' } },
  f: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'fire' } },
  i: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'ice' } },
  l: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'light' } },
  q: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'chronometric' } },
  r: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'war' } },
  v: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'void' } },
  n: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'necrotic' } },
  h: { object: { type: 'crumbleWall', offsetY: -16, material: 'dirt', width: 30, height: 30, health: 80, requiredDamageKind: 'life' } },
  'A': { object: { type: 'auricBeacon' } },
  'Q': { object: { type: 'chronoField' } },
  'W': { object: { type: 'windLift' } },
  'D': { object: { type: 'steamVent' } },
  'R': { object: { type: 'rainField' } },
  'N': { object: { type: 'starField' } },
  'Y': { object: { type: 'foregroundSunRays' } },
  'Z': { object: { type: 'foregroundShadow' } },
  'O': { object: { type: 'voidPortal', width: 72, height: 128 } },
  'M': { object: { type: 'voidSymbol', width: 84, height: 84 } },
  'I': { object: { type: 'raft', width: 180, height: 40 } },
  'K': { object: { type: 'boat', width: 150, height: 54 } },
  d: { object: { type: 'worldTreeBranch', width: 720, height: 280, offsetY: -120 } },
  e: { object: { type: 'canopyLeaves', width: 540, height: 220, offsetY: -220 } },
  'P': { object: { type: 'physicsBox', width: 50, height: 50 } },
  x: { object: { type: 'softHexagon', radius: 60 } },
  j: { object: { type: 'fireflyJarSwarm', width: 26, height: 42 } },
  '^': { object: { type: 'restingStick', width: 80, height: 96 } }
};

const CRUMBLE_WALL_MATERIAL_DEFAULTS = {
  dirt: { health: 200 },
  wood: { health: 220 },
  stone: { health: 360 },
  sandstone: { health: 340 },
  steel: { health: 9999, unbreakable: true }
};

function cloneSymbolData(value){
  if(Array.isArray(value)) return value.map(cloneSymbolData);
  if(value && typeof value === 'object'){
    const clone = {};
    for(const key in value){
      clone[key] = cloneSymbolData(value[key]);
    }
    return clone;
  }
  return value;
}

function normalizeEnemyNumberSpec(spec){
  if(spec === null || spec === undefined) return null;
  if(typeof spec === 'string'){
    const trimmed = spec.trim();
    if(!trimmed) return null;
    return { kind: trimmed };
  }
  if(typeof spec !== 'object') return null;
  const enemy = cloneSymbolData(spec);
  if(typeof enemy.kind === 'string'){
    enemy.kind = enemy.kind.trim();
  }
  if(!enemy.kind){
    const fallback = typeof enemy.type === 'string' ? enemy.type : enemy.id;
    if(typeof fallback === 'string' && fallback.trim()){
      enemy.kind = fallback.trim();
    }
  }
  if(!enemy.kind || typeof enemy.kind !== 'string' || !enemy.kind.trim()) return null;
  enemy.kind = enemy.kind.trim();
  return enemy;
}

function buildEnemyNumberLegend(source){
  if(!source || typeof source !== 'object') return null;
  const legend = {};
  let hasEntries = false;
  for(const key in source){
    const rawSymbol = (key ?? '').toString().trim();
    if(rawSymbol.length !== 1) continue;
    const code = rawSymbol.charCodeAt(0);
    if(code < 49 || code > 57) continue; // Only support digits 1-9.
    const value = source[key];
    if(value === null){
      legend[rawSymbol] = null;
      hasEntries = true;
      continue;
    }
    const enemy = normalizeEnemyNumberSpec(value);
    if(!enemy) continue;
    legend[rawSymbol] = { enemy };
    hasEntries = true;
  }
  return hasEntries ? legend : null;
}

function layoutEntriesToArray(value){
  if(Array.isArray(value)) return value;
  if(!value || typeof value !== 'object') return [];
  if(typeof value[Symbol.iterator] === 'function'){
    try{
      return Array.from(value);
    }catch(err){
      // Fall back to object traversal if conversion fails.
    }
  }
  const result = [];
  for(const key of Object.keys(value)){
    result.push(value[key]);
  }
  return result;
}

function normalizeToggleIdList(value){
  if(value === undefined || value === null) return [];
  if(Array.isArray(value)) return value.map(entry=>String(entry));
  return [String(value)];
}

function normalizeChestLootItem(item){
  if(!item || typeof item !== 'object') return null;
  const type = (item.type || item.kind || '').toString().toLowerCase();
  if(type === 'potion'){
    const heal = Math.max(1, Math.round(item.heal ?? 30));
    const payload = { type: 'potion', heal };
    if(item.id !== undefined) payload.id = String(item.id);
    if(item.name !== undefined) payload.name = String(item.name);
    if(item.description !== undefined) payload.description = String(item.description);
    if(item.color !== undefined) payload.color = String(item.color);
    return payload;
  }
  if(type === 'offhand'){
    const id = item.id !== undefined ? String(item.id) : null;
    if(!id) return null;
    return { type: 'offhand', id };
  }
  if(type === 'armor'){
    const id = item.id !== undefined ? String(item.id) : null;
    if(!id) return null;
    return { type: 'armor', id };
  }
  return null;
}

function mergeSymbolLegendWithEnemyLegend(symbolLegend, enemyLegend){
  if(!enemyLegend) return symbolLegend || null;
  const legend = symbolLegend ? { ...symbolLegend } : {};
  const assignEntry = (symbol, spec)=>{
    if(!symbol) return;
    if(spec === null){
      delete legend[symbol];
      return;
    }
    if(typeof spec === 'string'){
      legend[symbol] = { enemy: { kind: spec } };
      return;
    }
    if(!spec || typeof spec !== 'object') return;
    const rawKind = spec.kind || spec.type;
    if(typeof rawKind !== 'string' || !rawKind) return;
    const enemy = { kind: rawKind };
    for(const key in spec){
      if(key === 'kind' || key === 'type' || key === 'symbol' || key === 'char' || key === 'id') continue;
      enemy[key] = cloneSymbolData(spec[key]);
    }
    legend[symbol] = { enemy };
  };
  if(Array.isArray(enemyLegend)){
    for(const entry of enemyLegend){
      if(!entry) continue;
      const symbol = entry.symbol || entry.char || entry.id;
      assignEntry(typeof symbol === 'string' ? symbol : null, entry);
    }
  }else if(typeof enemyLegend === 'object'){
    for(const symbol in enemyLegend){
      assignEntry(symbol, enemyLegend[symbol]);
    }
  }
  return legend;
}

function buildLayoutSymbolLegend(extraLegend){
  const legend = {};
  for(const key in DEFAULT_LAYOUT_SYMBOLS){
    legend[key] = cloneSymbolData(DEFAULT_LAYOUT_SYMBOLS[key]);
  }
  if(extraLegend && typeof extraLegend === 'object'){
    for(const key in extraLegend){
      const entry = extraLegend[key];
      if(entry === null){
        delete legend[key];
        continue;
      }
      legend[key] = cloneSymbolData(entry);
    }
  }
  return legend;
}

function createLayoutSymbolObject(definition, col, row){
  if(!definition || typeof definition.type !== 'string') return null;
  const obj = { type: definition.type, col, row };
  for(const key in definition){
    if(key === 'type') continue;
    obj[key] = cloneSymbolData(definition[key]);
  }
  return obj;
}

function createLayoutSymbolEnemy(definition, col, row){
  if(!definition || typeof definition.kind !== 'string') return null;
  const enemy = { kind: definition.kind, col, row, fromSymbol: true };
  for(const key in definition){
    if(key === 'kind') continue;
    enemy[key] = cloneSymbolData(definition[key]);
  }
  return enemy;
}

function createLayoutSymbolWeapon(definition, col, row){
  if(!definition || typeof definition.id !== 'string') return null;
  const weapon = { id: definition.id, col, row };
  for(const key in definition){
    if(key === 'id') continue;
    weapon[key] = cloneSymbolData(definition[key]);
  }
  return weapon;
}

function createLayoutSymbolDoor(definition, col, row){
  if(!definition || typeof definition.door !== 'string') return null;
  return {
    col,
    row,
    offsetX: definition.offsetX || 0,
    offsetY: definition.offsetY || 0
  };
}

function cloneSymbolLegend(legend){
  if(!legend || typeof legend !== 'object') return null;
  const clone = {};
  for(const key in legend){
    clone[key] = cloneSymbolData(legend[key]);
  }
  return clone;
}

function overlayLayoutSymbols(baseLayout, overlays, extraLegend){
  if(!baseLayout) return null;
  const baseTiles = (baseLayout.tiles || []).map(row => (row || '').split(''));
  if(Array.isArray(overlays)){
    for(const entry of overlays){
      if(!entry) continue;
      const symbol = entry.symbol;
      if(typeof symbol !== 'string' || symbol.length === 0) continue;
      const rowIndex = Math.round(entry.row ?? 0);
      const colIndex = Math.round(entry.col ?? 0);
      const row = baseTiles[rowIndex];
      if(!row || colIndex < 0 || colIndex >= row.length) continue;
      row[colIndex] = symbol;
    }
  }
  const tiles = baseTiles.map(chars => chars.join(''));
  const layout = { ...baseLayout, tiles };
  if(baseLayout.symbolLegend || extraLegend){
    const legend = baseLayout.symbolLegend ? cloneSymbolLegend(baseLayout.symbolLegend) : {};
    if(extraLegend && typeof extraLegend === 'object'){
      for(const key in extraLegend){
        const value = extraLegend[key];
        if(value === null){
          delete legend[key];
        }else{
          legend[key] = cloneSymbolData(value);
        }
      }
    }
    if(Object.keys(legend).length){
      layout.symbolLegend = legend;
    }else{
      delete layout.symbolLegend;
    }
  }
  if(layout.objects) delete layout.objects;
  return layout;
}

const BASE_LAYOUT_TILE_SIZE = 64;
const TARGET_LAYOUT_TILE_SIZE = 30;
const LAYOUT_TILE_SCALE = TARGET_LAYOUT_TILE_SIZE / BASE_LAYOUT_TILE_SIZE;
const DEFAULT_LAYOUT_TILE_SIZE = Math.round(BASE_LAYOUT_TILE_SIZE * LAYOUT_TILE_SCALE);
const LEVEL_DOOR_WIDTH = 18;
const LEVEL_DOOR_HEIGHT = 28;

let interactiveIdCounter = 1;
let cameraZoneIdCounter = 1;
let softBodyIdCounter = 1;
let npcIdCounter = 1;

// Each embedded level retains its original JSON filename so bundling tools
// and runtime helpers can infer identifiers and stage codes. Do not remove
// the `file` property even if the level data is inlined below.
const RAW_LEVEL_DATA = [
  { file: "level_0_1.json", data: {
      "id": "worldTree",
      "name": "World Tree",
      "description": "A cozy home base nestled against the massive trunk. Venture across the branches to reach the canopy annex.",
      "map": {
        "x": 0.5,
        "y": 0.5,
        "order": "H",
        "standalone": true
      },
      "playable": true,
      "optional": true,
      "stageNumber": 0,
      "color": "#c58f57",
      "alwaysUnlocked": true,
      "doorLocked": false,
         "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 32,
        "tiles": [
    "..............................###...............................",
    ".............................##.................................",
    "............................###............###.......#..........",
    "................t..g........###........t.###.........#..........",
    "............g.#######g.t...#####g...t..###...........#..........",
    "............#############.g##############............#..........",
    "...........###......####################.............#..........",
    "...........#............#######......................#..........",
    "...........#.........................................#..........",
    "...........#...............................###########..........",
    "..........####.............................##......###..........",
    "..........####.v...........................##......###..........",
    "..........########.........................##..{...###..........",
    "..........########....g............................###..........",
    "..........#################............g...g...g...###..........",
    "..........###################....t.###################..........",
    "..........##########............######################..........",
    "..........########..............................######..........",
    "..........#######..<...............................##...........",
    "...........######..>..g...###..t...........g..k...###...........",
    "............########################################............",
    "..............####################################..............",
    "....................#########################...................",
    "........................##################......................",
    "..........................##############........................",
    "...........................############.........................",
    "...........................############.........................",
    "...........................############.........................",
    "...........................############.........................",
    "...........................############.........................",
    "...........................############.........................",
    "...........................############........................."
  ],
  "backgroundTiles": [
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "..............######............................................",
    "............############........................................",
    "............##############......................................",
    "............##############....................#####.............",
    "..............#############.................#######.............",
    "..............##############..............#########.............",
    "..................############...........##########.............",
    "..................##############........###########.............",
    "...........................########################.............",
    ".............................##############.....................",
    "....................############................................",
    "..................##############################................",
    ".................##################################.............",
    ".................#################################..............",
    "................................................................",
    "................................................................",
    ".........................................####...................",
    "...............##......................#######..................",
    "...............####....................########.................",
    "................######.................##...#####...............",
    ".................######...............##......#####.............",
    "....................#####.............#.........####............",
    ".....................#######......................##............",
    "......................######.......................#............",
    ".......................#####....................................",
    "................................................................"
  ],
        "symbolLegend": {
          "{": {
            "object": {
              "type": "worldTreeBranch",
              "width": 860,
              "height": 320,
              "offsetX": 32,
              "offsetY": -92
            }
          },
          "}": {
            "terrain": true,
            "object": {
              "type": "worldTreeBranch",
              "width": 560,
              "height": 260,
              "offsetX": 60,
              "offsetY": -184
            }
          },
          "[": {
            "object": {
              "type": "canopyLeaves",
              "width": 640,
              "height": 260,
              "offsetY": -264
            }
          },
          "]": {
            "object": {
              "type": "canopyLeaves",
              "width": 420,
              "height": 210,
              "offsetX": -32,
              "offsetY": -234
            }
          },
          "y": {
            "terrain": true,
            "object": {
              "type": "sprout",
              "offsetY": -74,
              "height": 28
            }
          },
          "q": {
            "object": {
              "type": "tuft",
              "offsetY": -78,
              "width": 68,
              "height": 26
            }
          },
          "C": {
            "terrain": true,
            "object": {
              "type": "crate",
              "width": 34,
              "height": 26,
              "offsetY": 0
            }
          },
          "c": {
            "object": {
              "type": "crate",
              "width": 32,
              "height": 26,
              "offsetY": 0
            }
          },
          "k": {
            "object": {
              "type": "skillPedestal",
              "width": 96,
              "height": 144,
              "offsetX": 0,
              "offsetY": 0,
              "radius": 110
            }
          },
          "v": {
            "object": {
              "type": "voidSymbol",
              "id": "worldTreeVoidMark",
              "width": 84,
              "height": 84,
              "offsetX": 0,
              "offsetY": 0,
              "strokeColor": "#c9c4ff",
              "color": "#06060a",
              "accentColor": "#f2f1ff",
              "promptOffsetY": 62,
              "playerPromptOffsetY": 98,
              "interactionHeight": 96,
              "radius": 96
            }
          },
          "V": {
            "object": {
              "type": "voidPortal",
              "id": "worldTreeVoidDoor",
              "offsetX": 0,
              "offsetY": 0,
              "width": 72,
              "height": 128,
              "promptOffsetY": 74,
              "playerPromptOffsetY": 112,
              "radius": 120,
              "interactionHeight": 128,
              "promptColor": "#c9c4ff",
              "ringColor": "#c9c4ff",
              "coreColor": "#05050a",
              "glowColor": "#938cff",
              "sparkColor": "#f5f5ff",
              "targetStageId": "world8VoidDojo"
            }
          }
        },
        "objects": [
          {
            "type": "toggleBlock",
            "id": "canopyBridgeBlock",
            "col": 33,
            "row": 18,
            "width": 64,
            "height": 28,
            "offsetY": -64,
            "active": false,
            "activeWhenOn": true,
            "activeWhenOff": false,
            "group": "canopyBridge",
            "color": "#cfa46b",
            "shadeColor": "rgba(0,0,0,0.4)",
            "highlightColor": "rgba(255,235,200,0.2)"
          },
          {
            "type": "lever",
            "id": "canopyBridgeLever",
            "col": 32,
            "row": 18,
            "offsetX": -6,
            "offsetY": -64,
            "width": 32,
            "height": 52,
            "facing": "right",
            "radius": 86,
            "interactionHeight": 82,
            "groups": [
              "canopyBridge"
            ],
            "startState": false,
            "promptOffsetY": 52,
            "playerPromptOffsetY": 94
          },
          {
            "type": "shopkeeper",
            "id": "canopyVendor",
            "col": 26,
            "row": 18,
            "offsetX": -28,
            "offsetY": -64,
            "width": 88,
            "height": 120,
            "tableWidth": 112,
            "tableHeight": 40,
            "promptOffsetY": 64,
            "playerPromptOffsetY": 96,
            "radius": 120,
            "name": "Canopy Vendor",
            "description": "Sap tonics and curious trinkets."
          },
          {
            "type": "npc",
            "id": "worldTreeGreeter",
            "col": 24,
            "row": 18,
            "offsetX": -12,
            "offsetY": -64,
            "talkRadius": 150,
            "hatOffset": 32,
            "headColor": "#aee6ff",
            "name": "Bran",
            "lines": [
              "Welcome back to the World Tree!",
              "The branches feel lively today."
            ]
          },
          {
            "type": "treasureChest",
            "id": "worldTreePotionChest",
            "col": 23,
            "row": 18,
            "offsetX": 0,
            "offsetY": 0,
            "width": 68,
            "height": 48,
            "promptOffsetY": 54,
            "playerPromptOffsetY": 96,
            "loot": {
              "item": {
                "type": "potion",
                "id": "worldTreeSapFlask",
                "name": "World Tree Sap Flask",
                "description": "A revitalizing draught drawn from the World Tree.",
                "heal": 60,
                "color": "#6be36b"
              },
              "coins": 0
            }
          },
          {
            "type": "punchingBag",
            "col": 37,
            "row": 18,
            "width": 48,
            "height": 120,
            "offsetY": 128,
            "color": "#d86f52",
            "edgeColor": "#4a2d1f",
            "ropeColor": "rgba(218,207,178,0.9)"
          },
          {
            "type": "softHexagon",
            "id": "worldTreeHexagon",
            "col": 20,
            "row": 3,
            "offsetX": 72,
            "offsetY": 124,
            "radius": 48,
            "centerOffsetY": 44,
            "segments": 6,
            "stiffness": 0.42,
            "edgeElasticity": 0.32,
            "damping": 0.22,
            "pointMass": 1.2,
            "centerMass": 1.4,
            "airDrag": 2.8,
            "verticalDrag": 2.2,
            "impulseScale": 52,
            "color": "#d6b37c",
            "edgeColor": "#4a3018",
            "highlightColor": "#f5deb3",
            "shadowOpacity": 0.42
          },
          {
            "type": "physicsBox",
            "col": 20,
            "row": 3,
            "offsetX": 0,
            "offsetY": 128,
            "width": 50,
            "height": 50
          }
        ],
        "cameraZones": [
          {
            "id": "treehouseInterior",
            "type": "building",
            "col": 6,
            "row": 11,
            "width": 12,
            "height": 10,
            "focusOffsetY": -96,
            "enterPadding": 0.5,
            "exitPadding": 1.4
          },
          {
            "id": "canopyAnnexInterior",
            "type": "building",
            "col": 34,
            "row": 7,
            "width": 9,
            "height": 10,
            "focusOffsetX": -40,
            "focusOffsetY": -70,
            "enterPadding": 0.5,
            "exitPadding": 1.3
          }
        ]
      },
      "palette": {
        "skyTop": "#4ac8ff",
        "skyBottom": "#a5e8ff",
        "ground": "#56351e",
        "turf": "#ba945d",
        "doorClosed": "#5d4a38",
        "doorOpen": "#9cc1d9",
        "accent": "#f2d18b",
        "terrainStyle": "world0",
        "blockShade": "rgba(0,0,0,0.38)",
        "blockHighlight": "rgba(255,235,200,0.12)",
        "blockAccent": "#cfa46b"
      },
      "screens": [
        {
          "name": "Canopy Hearth",
          "description": "Your sticks unwind in the treehouse. Open the menu and choose \"Back to Map\" when you are ready to depart."
        }
      ],
      "voidSymbolRoom": {
        "name": "World's Hollow",
        "description": "%he void-marked reflection.",
        "renderFilter": "grayscale(100%)",
        "palette": {
          "skyTop": "#16161b",
          "skyBottom": "#0b0b0f",
          "ground": "#2b2c33",
          "turf": "#3a3b44",
          "doorClosed": "#3d3e45",
          "doorOpen": "#8f94a0",
          "accent": "#d8d9dd",
          "terrainStyle": "world0",
          "blockShade": "rgba(0,0,0,0.6)",
          "blockHighlight": "rgba(255,255,255,0.12)",
          "blockAccent": "#71727b"
        },
        "darkness": {
          "opacity": 0.8,
          "color": "rgba(4,4,8,0.82)",
          "playerLightRadius": 300,
          "playerGlowRadius": 420,
          "playerGlowIntensity": 1.24,
          "playerLightSoftness": 0.48,
          "playerLightIntensity": 1.02,
          "playerGlowColor": "rgba(214, 220, 240, 0.78)"
        },
        "layout": {
        "tileSize": 64,
        "cols": 44,
        "rows": 30,
        "tiles": [
          "...............####......#####...#####......",
          "..........######...........#######..........",
          "......########..............#####...........",
          "..########...................####...........",
          "######........................########......",
          "#####.............................#######...",
          "###................................#########",
          "##...............................###########",
          "####.................................#######",
          "####.v..................................####",
          "########..................................##",
          "########........................####.....###",
          "#################.............########..####",
          "###################......###################",
          "##########............######################",
          "########.............########.........######",
          "#######.......########..................###.",
          ".######.............................V..####.",
          "..#########.....................##########..",
          "....################.....###############....",
          "..........#########################.........",
          "..............##################............",
          "................##############..............",
          ".................############...............",
          ".................############...............",
          ".................############...............",
          ".................############...............",
          ".................############...............",
          ".................############...............",
          ".................############...............",
          ],
          "objects": [
            {
              "type": "rainField",
              "col": 22,
              "row": 4,
              "width": 3072,
              "height": 520,
              "offsetY": -220,
              "density": 260,
              "speed": 900,
              "wind": -140,
              "dropLength": 32,
              "dropThickness": 1.8,
              "splashRadius": 18,
              "splashDuration": 0.28,
              "flashColor": "rgba(238, 242, 255, 0.9)",
              "flashAlpha": 0.95,
              "thunderIntervalMin": 6.5,
              "thunderIntervalMax": 12.5,
              "mistAlpha": 0.08,
              "mistColor": "rgba(12, 14, 22, 0.6)",
              "layer": "foreground"
            }
          ],
          "symbolLegend": {
            "v": {
              "object": {
                "type": "voidSymbol",
                "id": "worldTreeVoidMark",
                "width": 84,
                "height": 84,
                "offsetX": 0,
                "offsetY": 0,
                "strokeColor": "#d4d7de",
                "color": "#050506",
                "accentColor": "#f4f5f7",
                "flipped": true,
                "promptOffsetY": 62,
                "playerPromptOffsetY": 98,
                "interactionHeight": 96,
                "radius": 96,
                "promptColor": "#f0f0f0",
                "theme": "monochrome"
              }
            },
            "V": {
              "object": {
                "type": "voidPortal",
                "id": "worldTreeVoidDoor",
                "offsetX": 0,
                "offsetY": 0,
                "width": 72,
                "height": 128,
                "promptOffsetY": 74,
                "playerPromptOffsetY": 112,
                "radius": 120,
                "interactionHeight": 128,
                "promptColor": "#e0e0e0",
                "ringColor": "#e0e0e0",
                "coreColor": "#050506",
                "glowColor": "#9ca0a8",
                "sparkColor": "#f2f2f2",
                "targetStageId": "world8VoidDojo"
              }
            }
          }
        }
      }
    } },
  { file: "level_0_4.json", data: {
      "id": "canopySentinelTrial",
      "name": "Canopy Sentinel Trial",
      "description": "Face a lone guardian to certify your sticks for branch patrol duty.",
      "map": {
        "x": 0.54,
        "y": 0.62,
        "order": "Trial",
        "standalone": true,
        "parent": "world1Stage3",
        "requires": ["world1Stage3"]
      },
      "playable": true,
      "optional": true,
      "bossStage": true,
      "color": "#b07941",
      "layout": {
        "tileSize": 64,
        "cols": 28,
        "rows": 9,
        "tiles": [
          "############################",
          "##........................##",
          "##........................##",
          "##......p.........p.......##",
          "##........................##",
          "##..............c.........##",
          "##........................##",
          "##<....######....###....>.##",
          "############################"
        ]
      },
      "palette": {
        "skyTop": "#2d170c",
        "skyBottom": "#150b05",
        "ground": "#4f3018",
        "turf": "#a67b45",
        "doorClosed": "#5d4a38",
        "doorOpen": "#a7d4e8",
        "accent": "#f4d99c",
        "terrainStyle": "stage1Meadow",
        "blockShade": "rgba(0,0,0,0.38)",
        "blockHighlight": "rgba(255,235,200,0.12)",
        "blockAccent": "#cfa46b"
      },
      "screens": [
        {
          "name": "Guardian Clearing",
          "description": "The training green falls silent as the canopy sentinel advances.",
          "enemies": [],
          "boss": {
            "name": "Canopy Sentinel",
            "kind": "grunt",
            "hp": 10,
            "weapon": "sword",
            "attack": 5,
            "defense": 2,
            "speedMult": 1.05,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_1_1.json", data: {
      "id": "stage1",
      "name": "Meadow March",
      "description": "Drive the raiders out of the training grounds.",
      "map": {
        "x": 0.5,
        "y": 0.41,
        "branch": "world1",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 1,
      "color": "#46b06d",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 15,
        "tiles": [
          "................................................................",
          ".......................................................g.g......",
          ".....................................................#######....",
        "......................................................#####.....",
        "................1....c..............c..................##.......",
          "...............###..##...t........####......g...................",
          "........t...######......######.....##....#####..................",
          ".....t..########.......#######..........########.c.g............",
          ".<..############...........#####.g..g.........#######.t.gg.>....",
          "####################.........#########.t..........##############",
          "#########################...........########.g........##########",
          "###########################.........############.t....##########",
          "################################################################",
          "################################################################",
          "################################################################"
        ],
        "symbolLegend": {
          "C": {
            "terrain": true,
            "object": {
              "type": "crate",
              "width": 34,
              "height": 28
            }
          },
          "q": {
            "terrain": true,
            "object": {
              "type": "tuft",
              "width": 46,
              "height": 26
            }
          },
          "y": {
            "terrain": true,
            "object": {
              "type": "sprout",
              "height": 28
            }
          },
          "1": {
            "enemy": {
              "kind": "slimeCube"
            }
          }
        },
        "objects": [
          {
            "type": "treasureChest",
            "col": 9,
            "row": 14,
            "offsetY": 0,
            "width": 72,
            "height": 50,
            "loot": {
              "coins": 10,
              "weaponId": "dagger"
            },
            "promptColor": "#f6d66a"
          },
          {
            "type": "foregroundSunRays",
            "col": 10,
            "row": 4,
            "offsetX": -82,
            "offsetY": -68,
            "width": 320,
            "height": 3600,
            "rayCount": 5,
            "rayWidth": 64,
            "spread": 360,
            "opacity": 0.34,
            "blurRadius": 22,
            "parallax": 1.12,
            "parallaxY": 1.05,
            "rotation": -14,
            "color": "#ffe7af",
            "pulseAmount": 0.24,
            "pulseSpeed": 0.8,
            "phase": 0.4,
            "phaseStep": 0.78,
            "waveAmplitude": 36,
            "waveSpeed": 0.28,
            "driftAmplitude": 28,
            "driftSpeed": 0.12,
            "topScale": 0.26,
            "bottomScale": 1.85,
            "gradientFocus": 0.46,
            "fadeBottom": 0.16,
            "blendMode": "screen"
          },
          {
            "type": "foregroundSunRays",
            "col": 30,
            "row": 3,
            "offsetX": -24,
            "offsetY": -54,
            "width": 280,
            "height": 3200,
            "rayCount": 4,
            "rayWidth": 58,
            "spread": 280,
            "opacity": 0.28,
            "blurRadius": 18,
            "parallax": 1.16,
            "parallaxY": 1.08,
            "rotation": -8,
            "color": "#ffe2a4",
            "pulseAmount": 0.18,
            "pulseSpeed": 0.68,
            "phase": 1.2,
            "phaseStep": 0.92,
            "waveAmplitude": 26,
            "waveSpeed": 0.24,
            "driftAmplitude": 20,
            "driftSpeed": 0.1,
            "topScale": 0.32,
            "bottomScale": 1.7,
            "gradientFocus": 0.42,
            "fadeBottom": 0.12,
            "blendMode": "screen"
          },
          {
            "type": "foregroundShadow",
            "col": 8,
            "row": 5,
            "offsetX": -34,
            "offsetY": -46,
            "width": 160,
            "height": 216,
            "blurRadius": 18,
            "opacity": 0.3,
            "parallax": 1.2,
            "parallaxY": 1.08,
            "color": "#141c22"
          },
          {
            "type": "foregroundShadow",
            "col": 38,
            "row": 4,
            "offsetX": 26,
            "offsetY": -58,
            "width": 196,
            "height": 226,
            "blurRadius": 22,
            "opacity": 0.26,
            "parallax": 1.24,
            "parallaxY": 1.1,
            "color": "#10171f"
          }
        ]
      },
      "palette": {
        "skyTop": "#173825",
        "skyBottom": "#0b1a13",
        "ground": "#3c2a1f",
        "turf": "#46b06d",
        "doorClosed": "#2c3d2f",
        "doorOpen": "#76e4ff",
        "accent": "#6bd1ff",
        "terrainStyle": "stage1Meadow",
        "blockShade": "rgba(0,0,0,0.3)",
        "blockHighlight": "rgba(255,255,255,0.1)",
        "blockAccent": "#7cd86a"
      },
      "grassScene": {
        "cellSize": 6,
        "baseDensity": 0.45,
        "growthRate": 0.26,
        "spreadRate": 0.18,
        "burnRate": 1.5,
        "regrowDelay": 4.6,
        "bladeHeight": 32,
        "baseColor": "#267a44",
        "highlightColor": "#5de682",
        "burntColor": "#433526",
        "windStrength": 7.5,
        "surfaces": [
          {
            "col": 2,
            "cols": 14
          },
          {
            "col": 18,
            "cols": 10
          },
          {
            "col": 32,
            "cols": 8
          }
        ],
        "patches": [
          {
            "col": 2,
            "cols": 14,
            "density": 0.85,
            "noise": 0.12
          },
          {
            "col": 18,
            "cols": 10,
            "density": 0.7,
            "noise": 0.1,
            "taper": 0.4
          },
          {
            "col": 32,
            "cols": 8,
            "density": 0.9,
            "noise": 0.15
          }
        ],
        "clearings": [
          {
            "col": 10,
            "cols": 4
          },
          {
            "col": 26,
            "cols": 3
          }
        ],
        "scatter": {
          "count": 12,
          "density": 0.55
        }
      },
      "screens": [
        {
          "name": "Trailhead Clearing",
          "description": "Push back the first wave of scouts.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 15,
              "tiles": [
                "................................................................",
                "......................................................g.g..t....",
                ".....................................................#######....",
                "......................................................#####.....",
                "...............g1....c............t.c..................##.......",
                "...............###..##..g..t.g....####......t...................",
                ".........g..######......######.....##....#####..................",
                "......g.########....2..#######g.........####3###.c..............",
                ".<..##2#########...........#####..t...........#######.g....>....",
                "####################.........#########.g.t........##############",
                "#########################...........########.t........##########",
                "###########################.........############.t....##########",
                "################################################################",
                "################################################################",
                "################################################################"
              ],
            "symbolLegend": {
              "C": {
                "terrain": true,
                "object": {
                  "type": "crate",
                  "width": 34,
                  "height": 28
                }
              },
              "q": {
                "terrain": true,
                "object": {
                  "type": "tuft",
                  "width": 46,
                  "height": 26
                }
              },
                "y": {
                  "terrain": true,
                  "object": {
                    "type": "sprout",
                    "height": 28
                  }
                },
                "1": {
                  "enemy": {
                    "kind": "slimeCube"
                  }
                },
                "2": {
                  "terrain": true,
                  "enemy": {
                    "kind": "grunt"
                  }
                },
                "3": {
                  "terrain": true,
                  "enemy": {
                    "kind": "archer",
                    "offsetX": 12
                  }
                }
            },
            "objects": [
              {
                "type": "foregroundSunRays",
                "col": 10,
                "row": 4,
                "offsetX": -82,
                "offsetY": -68,
                "width": 320,
                "height": 360,
                "rayCount": 5,
                "rayWidth": 64,
                "spread": 360,
                "opacity": 0.34,
                "blurRadius": 22,
                "parallax": 1.12,
                "parallaxY": 1.05,
                "rotation": -14,
                "color": "#ffe7af",
                "pulseAmount": 0.24,
                "pulseSpeed": 0.8,
                "phase": 0.4,
                "phaseStep": 0.78,
                "waveAmplitude": 36,
                "waveSpeed": 0.28,
                "driftAmplitude": 28,
                "driftSpeed": 0.12,
                "topScale": 0.26,
                "bottomScale": 1.85,
                "gradientFocus": 0.46,
                "fadeBottom": 0.16,
                "blendMode": "screen"
              },
              {
                "type": "foregroundSunRays",
                "col": 30,
                "row": 3,
                "offsetX": -24,
                "offsetY": -54,
                "width": 280,
                "height": 320,
                "rayCount": 4,
                "rayWidth": 58,
                "spread": 280,
                "opacity": 0.28,
                "blurRadius": 18,
                "parallax": 1.16,
                "parallaxY": 1.08,
                "rotation": -8,
                "color": "#ffe2a4",
                "pulseAmount": 0.18,
                "pulseSpeed": 0.68,
                "phase": 1.2,
                "phaseStep": 0.92,
                "waveAmplitude": 26,
                "waveSpeed": 0.24,
                "driftAmplitude": 20,
                "driftSpeed": 0.1,
                "topScale": 0.32,
                "bottomScale": 1.7,
                "gradientFocus": 0.42,
                "fadeBottom": 0.12,
                "blendMode": "screen"
              },
              {
                "type": "foregroundShadow",
                "col": 8,
                "row": 5,
                "offsetX": -34,
                "offsetY": -46,
                "width": 160,
                "height": 216,
                "blurRadius": 18,
                "opacity": 0.3,
                "parallax": 1.2,
                "parallaxY": 1.08,
                "color": "#141c22"
              },
              {
                "type": "foregroundShadow",
                "col": 38,
                "row": 4,
                "offsetX": 26,
                "offsetY": -58,
                "width": 196,
                "height": 226,
                "blurRadius": 22,
                "opacity": 0.26,
                "parallax": 1.24,
                "parallaxY": 1.1,
                "color": "#10171f"
              }
            ]
          },
          "enemies": [
            {
              "kind": "grunt",
              "count": 2
            },
            {
              "kind": "archer",
              "count": 1
            }
          ]
        },
        {
          "name": "River Bend",
          "description": "Quick rogues dart between the trees.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 15,
            "tiles": [
              "................................................................",
              "................................................................",
              "................................................................",
              "................................................................",
              "................................................................",
              "................................................................",
              "................................................................",
              "................................................................",
              ".<....g1..g....t...............2.......g.t.....1........g.t..>..",
              "##################t....................####............########.",
              "#####################~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#########.",
              "###########################~~~~~~~~~~~~~~~~~~~~~~~~~~##########.",
              "############################~~~~~~~~~~~~~~~~~~~~~~~~###########.",
              "##############################~~~~~~~~~~~~~~~~~~~~#############.",
              "###############################################################."
            ],
            "symbolLegend": {
              "C": {
                "terrain": true,
                "object": {
                  "type": "crate",
                  "width": 34,
                  "height": 28
                }
              },
              "q": {
                "terrain": true,
                "object": {
                  "type": "tuft",
                  "width": 46,
                  "height": 26
                }
              },
              "y": {
                "terrain": true,
                "object": {
                  "type": "sprout",
                  "height": 28
                }
              },
              "1": {
                "enemy": {
                  "kind": "rogue"
                }
              },
              "2": {
                "enemy": {
                  "kind": "mage"
                }
              },
            },
            "objects": [
              {
                "type": "foregroundSunRays",
                "col": 10,
                "row": 4,
                "offsetX": -82,
                "offsetY": -68,
                "width": 320,
                "height": 360,
                "rayCount": 5,
                "rayWidth": 64,
                "spread": 360,
                "opacity": 0.34,
                "blurRadius": 22,
                "parallax": 1.12,
                "parallaxY": 1.05,
                "rotation": -14,
                "color": "#ffe7af",
                "pulseAmount": 0.24,
                "pulseSpeed": 0.8,
                "phase": 0.4,
                "phaseStep": 0.78,
                "waveAmplitude": 36,
                "waveSpeed": 0.28,
                "driftAmplitude": 28,
                "driftSpeed": 0.12,
                "topScale": 0.26,
                "bottomScale": 1.85,
                "gradientFocus": 0.46,
                "fadeBottom": 0.16,
                "blendMode": "screen"
              },
              {
                "type": "foregroundSunRays",
                "col": 30,
                "row": 3,
                "offsetX": -24,
                "offsetY": -54,
                "width": 280,
                "height": 320,
                "rayCount": 4,
                "rayWidth": 58,
                "spread": 280,
                "opacity": 0.28,
                "blurRadius": 18,
                "parallax": 1.16,
                "parallaxY": 1.08,
                "rotation": -8,
                "color": "#ffe2a4",
                "pulseAmount": 0.18,
                "pulseSpeed": 0.68,
                "phase": 1.2,
                "phaseStep": 0.92,
                "waveAmplitude": 26,
                "waveSpeed": 0.24,
                "driftAmplitude": 20,
                "driftSpeed": 0.1,
                "topScale": 0.32,
                "bottomScale": 1.7,
                "gradientFocus": 0.42,
                "fadeBottom": 0.12,
                "blendMode": "screen"
              },
              {
                "type": "foregroundShadow",
                "col": 8,
                "row": 5,
                "offsetX": -34,
                "offsetY": -46,
                "width": 160,
                "height": 216,
                "blurRadius": 18,
                "opacity": 0.3,
                "parallax": 1.2,
                "parallaxY": 1.08,
                "color": "#141c22"
              },
              {
                "type": "foregroundShadow",
                "col": 38,
                "row": 4,
                "offsetX": 26,
                "offsetY": -58,
                "width": 196,
                "height": 226,
                "blurRadius": 22,
                "opacity": 0.26,
                "parallax": 1.24,
                "parallaxY": 1.1,
                "color": "#10171f"
              }
            ]
          },
          "enemies": [
            {
              "kind": "rogue",
              "count": 2
            },
            {
              "kind": "mage",
              "count": 1
            }
          ]
        },
        {
          "name": "Hilltop Ruins",
          "description": "A captain stands guard over the relics.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 15,
            "tiles": [
              "................................................................",
              "..........................t.t...............g###................",
              ".......................g..####..............#####...............",
              ".............g1.......#########...t..g.g...#######............t.",
              "........t.#####......2......t.....######.....###..........g.###.",
              ".....g##########.........t.###....######t........t.......######.",
              "...#############....t....######...#######......###......########",
              ".<t###########......##..#######.....3..##......###...........>..",
              "################.g..##..#######........##..g.............#######",
              "###########################.............##########.......#######",
              "###############################g.........#########.....t########",
              "#################################.t........#######g....#########",
              "###################################........########..t##########",
              "#####################################......#########.###########",
              "########################################..######################"
            ],
            "symbolLegend": {
              "C": {
                "terrain": true,
                "object": {
                  "type": "crate",
                  "width": 34,
                  "height": 28
                }
              },
              "q": {
                "terrain": true,
                "object": {
                  "type": "tuft",
                  "width": 46,
                  "height": 26
                }
              },
              "y": {
                "terrain": true,
                "object": {
                  "type": "sprout",
                  "height": 28
                }
              },
              "1": {
                "enemy": {
                  "kind": "archer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "mage"
                }
              },
              "3": {
                "enemy": {
                  "kind": "boss",
                  "isBoss": true,
                  "name": "Training Captain",
                  "weapon": "enemyDagger",
                  "hp": 10,
                  "attack": 5,
                  "defense": 2,
                  "speedMult": 1.05
                }
              },
            },
            "objects": [
              {
                "type": "foregroundSunRays",
                "col": 10,
                "row": 4,
                "offsetX": -82,
                "offsetY": -68,
                "width": 320,
                "height": 360,
                "rayCount": 5,
                "rayWidth": 64,
                "spread": 360,
                "opacity": 0.34,
                "blurRadius": 22,
                "parallax": 1.12,
                "parallaxY": 1.05,
                "rotation": -14,
                "color": "#ffe7af",
                "pulseAmount": 0.24,
                "pulseSpeed": 0.8,
                "phase": 0.4,
                "phaseStep": 0.78,
                "waveAmplitude": 36,
                "waveSpeed": 0.28,
                "driftAmplitude": 28,
                "driftSpeed": 0.12,
                "topScale": 0.26,
                "bottomScale": 1.85,
                "gradientFocus": 0.46,
                "fadeBottom": 0.16,
                "blendMode": "screen"
              },
              {
                "type": "foregroundSunRays",
                "col": 30,
                "row": 3,
                "offsetX": -24,
                "offsetY": -54,
                "width": 280,
                "height": 320,
                "rayCount": 4,
                "rayWidth": 58,
                "spread": 280,
                "opacity": 0.28,
                "blurRadius": 18,
                "parallax": 1.16,
                "parallaxY": 1.08,
                "rotation": -8,
                "color": "#ffe2a4",
                "pulseAmount": 0.18,
                "pulseSpeed": 0.68,
                "phase": 1.2,
                "phaseStep": 0.92,
                "waveAmplitude": 26,
                "waveSpeed": 0.24,
                "driftAmplitude": 20,
                "driftSpeed": 0.1,
                "topScale": 0.32,
                "bottomScale": 1.7,
                "gradientFocus": 0.42,
                "fadeBottom": 0.12,
                "blendMode": "screen"
              },
              {
                "type": "foregroundShadow",
                "col": 8,
                "row": 5,
                "offsetX": -34,
                "offsetY": -46,
                "width": 160,
                "height": 216,
                "blurRadius": 18,
                "opacity": 0.3,
                "parallax": 1.2,
                "parallaxY": 1.08,
                "color": "#141c22"
              },
              {
                "type": "foregroundShadow",
                "col": 38,
                "row": 4,
                "offsetX": 26,
                "offsetY": -58,
                "width": 196,
                "height": 226,
                "blurRadius": 22,
                "opacity": 0.26,
                "parallax": 1.24,
                "parallaxY": 1.1,
                "color": "#10171f"
              }
            ]
          },
          "enemies": [
            {
              "kind": "archer",
              "count": 1
            },
            {
              "kind": "mage",
              "count": 1
            }
          ],
          "boss": {
            "name": "Training Captain",
            "kind": "boss",
            "hp": 10,
            "weapon": "enemyDagger",
            "attack": 5,
            "defense": 2,
            "speedMult": 1.05
          }
        }
      ]
    } },
  { file: "level_1_1b.json", data: {
      "id": "world1Stage2",
      "name": "Silvergrove Crossing",
      "description": "Cross the canopy bridges while archer pickets harry from the trees.",
      "map": {
        "x": 0.56,
        "y": 0.44,
        "branch": "world1",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 2,
      "color": "#58c17a",
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 9,
        "tiles": [
          "........................................",
          "......................g.................",
          "...........t..####..####.t..............",
          "...........######......######.t.........",
          ".......t.######..........######.........",
          ".....g########............######.t......",
          "....##########............########g.....",
          ".<###########........g....#########>..g.",
          "########################################"
        ]
      },
      "palette": {
        "skyTop": "#2d3b1c",
        "skyBottom": "#151f0c",
        "ground": "#4a3b1f",
        "turf": "#78c46a",
        "doorClosed": "#3c2f1c",
        "doorOpen": "#9ed9b7",
        "accent": "#cdeba1",
        "terrainStyle": "stage1Meadow",
        "blockShade": "rgba(0,0,0,0.32)",
        "blockHighlight": "rgba(210,255,210,0.14)",
        "blockAccent": "#92d67f"
      },
      "screens": [
        {
          "name": "Canopy Bridges",
          "description": "Leap between rope bridges while Silvergrove archers hold the far ridgeline.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 9,
            "tiles": [
              "................................................",
              ".<...gt..c....1...............2......c.t..1....>",
              "############..........................##########",
              "##########..####..................####..########",
              "#########.......######.......#####.......#######",
              "########..............#######.............######",
              "########..................................######",
              "########..................................######",
              "################################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "archer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "rogue"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "archer",
              "count": 2
            },
            {
              "kind": "rogue",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_1_1c.json", data: {
      "id": "world1Stage3",
      "name": "Thicketway Garrison",
      "description": "Cut through barricaded woodland paths guarded by rogue ambushers.",
      "map": {
        "x": 0.62,
        "y": 0.47,
        "branch": "world1",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 3,
      "color": "#4fa86b",
      "layout": {
        "tileSize": 64,
        "cols": 42,
        "rows": 9,
        "tiles": [
          "..........................................",
          "..........................................",
          "..........................................",
          "..........................................",
          "...................................#......",
          ".....#.............#..............g#t....>",
          ".....#.....#.gt..g.#.gtt.gt.g#..##########",
          ".<...#..g.t###############################",
          "##########################################"
        ],
        "objects": [
          {
            "type": "restingStick",
            "id": "world1_resting_second",
            "col": 8,
            "row": 6,
            "offsetY": -2,
            "width": 80,
            "height": 96,
            "unlockSlot": 2,
            "promptColor": "#9fd4a6",
            "spawnOffsetY": -4
          }
        ],
        "symbolLegend": {
          "c": {
            "terrain": true,
            "object": {
              "type": "crate",
              "width": 34,
              "height": 28
            }
          }
        }
      },
      "palette": {
        "skyTop": "#263015",
        "skyBottom": "#10170a",
        "ground": "#43331b",
        "turf": "#68bb5f",
        "doorClosed": "#352614",
        "doorOpen": "#9fd4a6",
        "accent": "#d4f0b0",
        "terrainStyle": "stage1Meadow",
        "blockShade": "rgba(0,0,0,0.34)",
        "blockHighlight": "rgba(210,255,200,0.16)",
        "blockAccent": "#83c77a"
      },
      "screens": [
        {
          "name": "Garrison Approach",
          "description": "Break through thicket barricades while rogues spring from cover.",
          "layout": {
            "tileSize": 64,
            "cols": 54,
            "rows": 11,
            "tiles": [
              "...###g...g###...........g######t........##.........t.",
              ".g.###...1.###......t...g.#####..t..g...##g......g..##",
              "##......g.#####.g.##########g.t..#########..t....#####",
              "###.t.#######.g.####.##t..#########.....#######.###...",
              "..################....##..g.#####........########.....",
              "...###.....###....2.......####........................",
              ".......................1..##..........#......#tg..>...",
              "......................#.........#..s.g#ts.g.##########",
              "........#.....#.gt..g.#.gtt.gtsg#..###################",
              "<.g.t...#s.g.t########################################",
              "######################################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "rogue"
                }
              },
              "2": {
                "enemy": {
                  "kind": "mage"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "rogue",
              "count": 2
            },
            {
              "kind": "mage",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_1_2.json", data: {
      "id": "stage2",
      "name": "Frostwind Ridge",
      "description": "Ascend the frozen cliffs and shatter the icebound warband.",
      "map": {
        "x": 0.5636,
        "y": 0.4364,
        "branch": "world2",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 5,
      "color": "#63b5ff",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 33,
        "tiles": [
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "...........##...................................................",
    ".........#######................................................",
    ".......##########...............................................",
    "......############..............................................",
    ".....####.....####..............................................",
    ".....##........####.............................................",
    "....###..........####...........................................",
    "....##............###...........................................",
    "....##............###...........................................",
    "....##..........................................................",
    "...###..<.......................................................",
    "...########.....................................................",
    "..#########.....................................................",
    ".#############..................................................",
    "##################..........##########..........................",
    "######################....##############........................",
    "#########################################..#####................",
    "##...##############################################.........>...",
    "........#############################################...########",
    "..........#####################...##############################",
    "............##################......############################",
    "...............#############.........###########################",
    "..................########.............#########################"
  ],
  "backgroundTiles": [
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    ".........#####..................................................",
    ".......########.................................................",
    ".......##########...............................................",
    "......############..............................................",
    "......############..............................................",
    "......###############...........................................",
    "......################..........................................",
    "...........###########..........................................",
    "...........############.........................................",
    "..............##########........................................",
    "..................#######.......................................",
    "......................###.......................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................"
  ],
        "symbolLegend": {
          "P": {
            "terrain": true,
            "object": {
              "type": "platform",
              "width": 64,
              "offsetY": -18
            }
          },
          "S": {
            "terrain": true,
            "object": {
              "type": "spikes",
              "width": 64,
              "height": 32,
              "offsetY": -6
            }
          }
        }
      },
      "palette": {
        "skyTop": "#17324c",
        "skyBottom": "#0c1827",
        "ground": "#2b3c4f",
        "turf": "#63b5ff",
        "doorClosed": "#28405a",
        "doorOpen": "#9be0ff",
        "accent": "#76d0ff",
        "terrainStyle": "world2",
        "blockShade": "rgba(10,15,25,0.45)",
        "blockHighlight": "rgba(190,230,255,0.34)",
        "blockAccent": "#9be0ff"
      },
      "screens": [
        {
          "name": "Iced Approach",
          "description": "Leapfrogging skippers and old raiders guard the path.",
          "enemies": [
            {
              "kind": "iceSkipper",
              "count": 2
            },
            {
              "kind": "grunt",
              "count": 1
            }
          ]
        },
        {
          "name": "Glacial Steps",
          "description": "Archers pepper the ridge while mages freeze the air.",
          "enemies": [
            {
              "kind": "iceSkipper",
              "count": 1
            },
            {
              "kind": "archer",
              "count": 2
            },
            {
              "kind": "mage",
              "count": 1
            }
          ]
        },
        {
          "name": "Summit Bastion",
          "description": "Hold the crest against the warden's guard.",
          "enemies": [
            {
              "kind": "rogue",
              "count": 2
            },
            {
              "kind": "iceSkipper",
              "count": 1
            }
          ],
          "boss": {
            "name": "Glacier Warden",
            "kind": "glacierWarden",
            "hp": 50,
            "weapon": "spear",
            "attack": 25,
            "defense": 10,
            "attackRange": 200,
            "speedMult": 0.9
          }
        }
      ]
    } },
  { file: "level_1_2b.json", data: {
      "id": "world2Stage2",
      "name": "Galecrust Outpost",
      "description": "Assault the wind-scoured ramparts held by frost archers and sentries.",
      "map": {
        "x": 0.62,
        "y": 0.43,
        "branch": "world2",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 6,
      "color": "#74c4ff",
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 9,
        "tiles": [
          "........................................",
          "..............p........p................",
          "...........######....######.............",
          "........######..........######..........",
          "......########..S....S..########........",
          "....##########..........##########......",
          "..############....##....############....",
          ".<############....##....############>...",
          "########################################"
        ],
        "symbolLegend": {
          "S": {
            "terrain": true,
            "object": {
              "type": "spikes",
              "width": 64,
              "height": 32,
              "offsetY": -6
            }
          }
        }
      },
      "palette": {
        "skyTop": "#1a2f46",
        "skyBottom": "#091524",
        "ground": "#264054",
        "turf": "#74c4ff",
        "doorClosed": "#1d3344",
        "doorOpen": "#a6e1ff",
        "accent": "#d3f0ff",
        "terrainStyle": "world2",
        "blockShade": "rgba(0,0,0,0.42)",
        "blockHighlight": "rgba(160,220,255,0.24)",
        "blockAccent": "#8cd0ff"
      },
      "screens": [
        {
          "name": "Windward Ramparts",
          "description": "Scale the ramparts as gale cannons sweep the battlements.",
          "layout": {
            "tileSize": 64,
            "cols": 40,
            "rows": 9,
            "tiles": [
              "........................................",
              "......1.......p........p.1..............",
              "...........######....######.............",
              "........######..........######..........",
              "......########..S...2S..########........",
              "....##########..........##########......",
              "..############....##....############....",
              ".<############....##....############>...",
              "########################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "archer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "iceSkipper"
                }
              }
            }
          }
        }
      ]
    } },
  { file: "level_1_2c.json", data: {
      "id": "world2Stage3",
      "name": "Shatterglass Caverns",
      "description": "Navigate crystal-lined caverns where frozen mirrors fracture incoming spells.",
      "map": {
        "x": 0.68,
        "y": 0.44,
        "branch": "world2",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 7,
      "color": "#6ad3ff",
      "layout": {
        "tileSize": 64,
        "cols": 42,
        "rows": 9,
        "tiles": [
          "..........................................",
          "..............p............p..............",
          "..........######........######............",
          ".......########....cc....########.........",
          "....###########..........###########......",
          "..#############..pp..pp..#############....",
          ".###############..##..##..###############.",
          "<###############..##..##..###############>",
          "##########################################"
        ],
        "objects": [
          {
            "type": "skillPedestal",
            "id": "world2_shrine_grapple",
            "col": 20,
            "row": 6,
            "offsetY": -2,
            "width": 96,
            "height": 144,
            "abilityId": "grapple",
            "pedestalColor": "#4c6178",
            "bookColor": "#d7f0ff",
            "shrineGlowColor": "#aee8ff",
            "promptColor": "#9fdcff"
          }
        ]
      },
      "palette": {
        "skyTop": "#112331",
        "skyBottom": "#050d16",
        "ground": "#203343",
        "turf": "#6ad3ff",
        "doorClosed": "#1a2c3d",
        "doorOpen": "#a2eaff",
        "accent": "#d8fcff",
        "terrainStyle": "world2",
        "blockShade": "rgba(0,0,0,0.44)",
        "blockHighlight": "rgba(170,230,255,0.26)",
        "blockAccent": "#92deff"
      },
      "screens": [
        {
          "name": "Mirror Halls",
          "description": "Break the frost mirrors before they rebound your strikes.",
          "layout": {
            "tileSize": 64,
            "cols": 42,
            "rows": 9,
            "tiles": [
              "............2...............2.............",
              "..............p............p..............",
              "..........######........######............",
              ".......########....c1....########.........",
              "....###########..........###########......",
              "..#############..pp..pp..#############....",
              ".###############..##..##..###############.",
              "<###############..##..##..###############>",
              "##########################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "mage"
                }
              },
              "2": {
                "enemy": {
                  "kind": "iceSkipper"
                }
              }
            }
          }
        }
      ]
    } },
  { file: "level_1_2d.json", data: {
      "id": "world2Stage4",
      "name": "Hoarfrost Bastion",
      "description": "Lay siege to the frozen bastion where the Glacier Warden commands the storm.",
      "map": {
        "x": 0.74,
        "y": 0.46,
        "branch": "world2",
        "branchStep": 4,
        "boss": true
      },
      "playable": true,
      "stageNumber": 8,
      "bossStage": true,
      "color": "#5bbcf7",
      "layout": {
        "tileSize": 64,
        "cols": 44,
        "rows": 10,
        "tiles": [
          "............................................",
          "...............p............p...............",
          "............######........######............",
          ".........##########....p...##########.......",
          "......##############........############....",
          "....################..##..################..",
          "..##################..##..################..",
          ".###################..##..#################.",
          "<###################......#################>",
          "############################################"
        ]
      },
      "palette": {
        "skyTop": "#0c1e2f",
        "skyBottom": "#030b12",
        "ground": "#193242",
        "turf": "#5bbcf7",
        "doorClosed": "#162a36",
        "doorOpen": "#8ad9ff",
        "accent": "#c4f1ff",
        "terrainStyle": "world2",
        "blockShade": "rgba(0,0,0,0.46)",
        "blockHighlight": "rgba(170,230,255,0.3)",
        "blockAccent": "#79d0ff"
      },
      "screens": [
        {
          "name": "Bastion Crown",
          "description": "Withstand the blizzard siege and topple the Glacier Warden.",
          "layout": {
            "tileSize": 64,
            "cols": 44,
            "rows": 10,
            "tiles": [
              "............................................",
              "...........2...p............p.2.............",
              "............######........######............",
              ".........##########....p...##########.......",
              "......##############........############....",
              "....################..##..################..",
              "..##################..##..################..",
              ".###################..##..#################.",
              "<###################......#################>",
              "############################################"
            ],
            "symbolLegend": {
              "2": {
                "enemy": {
                  "kind": "iceSkipper"
                }
              }
            }
          },
          "boss": {
            "name": "Glacier Warden",
            "kind": "glacierWarden",
            "hp": 80,
            "weapon": "spear",
            "attack": 40,
            "defense": 16,
            "attackRange": 280,
            "speedMult": 0.9,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_1_3.json", data: {
      "id": "stage3",
      "name": "Cinder Cavern",
      "description": "Descend into the molten chambers and silence the ember cult.",
      "map": {
        "x": 0.59,
        "y": 0.5,
        "branch": "world3",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 9,
      "color": "#ff7043",
      "layout": {
        "tileSize": 64,
        "cols": 80,
        "rows": 10,
        "tiles": [
          "################################################################################",
          "##########....############......############....############......##############",
          "##.#####........##########......##########........############......############",
          "##<#####............##########..........########..........############.......>..",
          "##########..............########............########p...........################",
          "##############......p.....######....p.........##########........##P#############",
          "######P###########..........######..........m.....######..........##############",
          "######################........######..................######........############",
          "##############S###########..S...########......S...........####S###......########",
          "################################################################################"
        ],
        "symbolLegend": {
          "P": {
            "terrain": true,
            "object": {
              "type": "platform",
              "width": 64,
              "offsetY": -18
            }
          },
          "S": {
            "terrain": true,
            "object": {
              "type": "spikes",
              "width": 64,
              "height": 32,
              "offsetY": -6
            }
          }
        }
      },
      "palette": {
        "skyTop": "#3f1b13",
        "skyBottom": "#160704",
        "ground": "#3a2119",
        "turf": "#ff7043",
        "doorClosed": "#402622",
        "doorOpen": "#ffb347",
        "accent": "#ff9469",
        "terrainStyle": "world3",
        "blockShade": "rgba(0,0,0,0.46)",
        "blockHighlight": "rgba(255,170,110,0.22)",
        "blockAccent": "#ffb347"
      },
      "lavaScene": {
        "cellSize": 3,
        "color": "rgba(255, 122, 44, 0.92)",
        "shade": "rgba(120, 24, 0, 0.9)",
        "highlight": "rgba(255, 216, 140, 0.78)",
        "foamColor": "rgba(255, 170, 80, 0.32)",
        "emitters": [
          {
            "col": 22,
            "row": 4,
            "offsetY": -28,
            "rate": 44,
            "spreadX": 10,
            "spreadY": 6,
            "jitter": 3
          },
          {
            "col": 46,
            "row": 4,
            "offsetY": -28,
            "rate": 44,
            "spreadX": 10,
            "spreadY": 6,
            "jitter": 3
          }
        ]
      },
      "screens": [
        {
          "name": "Ashen Vestibule",
          "description": "Wisps hover between lava plumes.",
          "layout": {
            "tileSize": 64,
            "cols": 80,
            "rows": 10,
            "tiles": [
              "################################################################################",
              "##########....############......############....############......##############",
              "##.#####....1...##########......##########........############......############",
              "##<#####............##########..........########..........############.......>..",
              "##########............v.########............1#v#####p...........################",
              "##############......p.....######....p.........##########........##P#############",
              "######P###########....L.....######..........m.L...######..........##############",
              "######################........######..............2...######........############",
              "##############S###########..S...########......S...........####S###......########",
              "################################################################################"
            ],
            "symbolLegend": {
              "L": {
                "fluid": {
                  "type": "lava",
                  "width": 4,
                  "depth": 2
                }
              },
              "v": {
                "object": {
                  "type": "lavaSpout",
                  "width": 60,
                  "height": 48,
                  "offsetY": -26,
                  "flowWidth": 34,
                  "flowHeight": 96,
                  "lavaColor": "#ff7b2a",
                  "glowColor": "rgba(255, 170, 80, 0.9)",
                  "casingColor": "#3d2216",
                  "trimColor": "#ffad4d",
                  "shadowColor": "#210c06"
                }
              }
            },
            "enemyLegend": {
              "1": "emberWisp",
              "2": "iceSkipper"
            }
          },
          "enemies": [
            {
              "kind": "emberWisp",
              "count": 2
            },
            {
              "kind": "iceSkipper",
              "count": 1
            }
          ]
        },
        {
          "name": "Seething Galleries",
          "description": "Vaulted caverns bend around lava pools guarding the sovereign.",
          "layout": {
            "tileSize": 64,
            "cols": 80,
            "rows": 10,
            "tiles": [
              "################################################################################",
              "##########....###########....#########......###########....###########....######",
              "##.####.....4..#########..######..........##########....####3######....#########",
              "##<####.........########2........########...........##########........#######>##",
              "##########....v....#######....1########....v....######p....######...############",
              "#############..p....######....p...#######....L....######....##P#################",
              "######P###########....L....######....m1.L....######....S###....#################",
              "#####################....######.........######......1..######......#############",
              "##############S######..S..######....S....######....S######..S..#################",
              "################################################################################"
            ],
            "symbolLegend": {
              "L": {
                "fluid": {
                  "type": "lava",
                  "width": 4,
                  "depth": 2
                }
              },
              "v": {
                "object": {
                  "type": "lavaSpout",
                  "width": 60,
                  "height": 48,
                  "offsetY": -26,
                  "flowWidth": 34,
                  "flowHeight": 96,
                  "lavaColor": "#ff7b2a",
                  "glowColor": "rgba(255, 170, 80, 0.9)",
                  "casingColor": "#3d2216",
                  "trimColor": "#ffad4d",
                  "shadowColor": "#210c06"
                }
              }
            },
            "enemyLegend": {
              "1": "boomling",
              "2": "rogue",
              "3": "mage",
              "4": "archer"
            }
          },
          "enemies": [
            {
              "kind": "boomling",
              "count": 3
            },
            {
              "kind": "rogue",
              "count": 1
            },
            {
              "kind": "mage",
              "count": 1
            },
            {
              "kind": "archer",
              "count": 1
            }
          ],
          "boss": {
            "name": "Cinder Sovereign",
            "kind": "cinderKing",
            "hp": 90,
            "weapon": "bomb",
            "attack": 45,
            "defense": 18,
            "attackRange": 640,
            "blastRadius": 170,
            "speedMult": 0.8
          }
        }
      ]
    } },
  { file: "level_1_3b.json", data: {
      "id": "world3Stage2",
      "name": "Emberwind Crucible",
      "description": "Ride bellows drafts through forge balconies patrolled by ember cultists.",
      "map": {
        "x": 0.66,
        "y": 0.52,
        "branch": "world3",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 10,
      "color": "#ff8b4d",
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 9,
        "tiles": [
          "........................................",
          "..............p............p............",
          "...........######......######...........",
          "........##########..pp..##########......",
          ".....############..........############.",
          "....##############..mm..mm..############",
          "..###############..##..##..#############",
          ".<###############..##..##..############>",
          "########################################"
        ]
      },
      "palette": {
        "skyTop": "#3f1b13",
        "skyBottom": "#160804",
        "ground": "#3a2119",
        "turf": "#ff8b4d",
        "doorClosed": "#3c2016",
        "doorOpen": "#ffb680",
        "accent": "#ffd1a1",
        "terrainStyle": "world3",
        "blockShade": "rgba(0,0,0,0.46)",
        "blockHighlight": "rgba(255,180,110,0.22)",
        "blockAccent": "#ffb347"
      },
      "screens": [
        {
          "name": "Forge Balconies",
          "description": "Leap between crucible balconies while bellows drafts lift you skyward.",
          "layout": {
            "tileSize": 64,
            "cols": 40,
            "rows": 9,
            "tiles": [
              "..............1...............1.........",
              "..............p............p............",
              "...........######......######...........",
              "........##########..pp..##########......",
              ".....############...2......############.",
              "....##############..mm..mm..############",
              "..###############..##..##..#############",
              ".<###############..##..##..############>",
              "########################################"
            ],
            "enemyLegend": {
              "1": "emberWisp",
              "2": "boomling"
            }
          },
          "enemies": [
            {
              "kind": "emberWisp",
              "count": 2
            },
            {
              "kind": "boomling",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_1_3c.json", data: {
      "id": "world3Stage3",
      "name": "Magma Conflux",
      "description": "Dash across suspended bridges as magma surges flood the lower decks.",
      "map": {
        "x": 0.72,
        "y": 0.54,
        "branch": "world3",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 11,
      "color": "#ff9e52",
      "layout": {
        "tileSize": 64,
        "cols": 42,
        "rows": 10,
        "tiles": [
          "..........................................",
          "..............p............p..............",
          "..........######........######............",
          ".......##########..pp..##########.........",
          "....##############........##############..",
          "..###############..mm..mm..##############.",
          "..###############..##..##..##############.",
          "<###############.............############>",
          "##########################################",
          "##########################################"
        ],
        "objects": [
          {
            "type": "skillPedestal",
            "id": "world3_shrine_swim",
            "col": 20,
            "row": 6,
            "offsetY": -2,
            "width": 96,
            "height": 144,
            "abilityId": "swimDash",
            "pedestalColor": "#4c3528",
            "bookColor": "#ffe4c4",
            "shrineGlowColor": "#ffba7a",
            "promptColor": "#ffbb80"
          }
        ]
      },
      "palette": {
        "skyTop": "#431f12",
        "skyBottom": "#1a0804",
        "ground": "#402214",
        "turf": "#ff9e52",
        "doorClosed": "#472817",
        "doorOpen": "#ffc07a",
        "accent": "#ffd6a1",
        "terrainStyle": "world3",
        "blockShade": "rgba(0,0,0,0.48)",
        "blockHighlight": "rgba(255,190,120,0.24)",
        "blockAccent": "#ffb568"
      },
      "screens": [
        {
          "name": "Conflux Bridges",
          "description": "Time your crossings as magma geysers pulse beneath each bridge span.",
          "layout": {
            "tileSize": 64,
            "cols": 42,
            "rows": 10,
            "tiles": [
              "....................1.....................",
              "..............p............p..............",
              "..........######........######............",
              ".......##########..pp..##########....2....",
              "....##############..2.....##############..",
              "..###############..mm..mm..##############.",
              "..###############..##..##..##############.",
              "<###############.............############>",
              "##########################################",
              "##########################################"
            ],
            "enemyLegend": {
              "1": "emberWisp",
              "2": "boomling"
            }
          },
          "enemies": [
            {
              "kind": "boomling",
              "count": 2
            },
            {
              "kind": "emberWisp",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_1_3d.json", data: {
      "id": "world3Stage4",
      "name": "Ashen Throne",
      "description": "Confront the Cinder Sovereign atop a magma throne ringed with flame walls.",
      "map": {
        "x": 0.78,
        "y": 0.56,
        "branch": "world3",
        "branchStep": 4,
        "boss": true
      },
      "playable": true,
      "stageNumber": 12,
      "bossStage": true,
      "color": "#ff8245",
      "layout": {
        "tileSize": 64,
        "cols": 44,
        "rows": 10,
        "tiles": [
          "..............1.............................",
          "...............p............p...............",
          "............######........######............",
          ".........##########....p...##########.......",
          "......##############....1...############....",
          "....###############..mm..mm..############...",
          "..###############..##..##..###############..",
          "<###############............###############>",
          "############################################",
          "############################################"
        ],
        "symbolLegend": {
          "1": {
            "enemy": {
              "kind": "emberWisp"
            }
          }
        }
      },
      "palette": {
        "skyTop": "#441b10",
        "skyBottom": "#1c0702",
        "ground": "#3a1a10",
        "turf": "#ff8245",
        "doorClosed": "#3d1d11",
        "doorOpen": "#ffb27a",
        "accent": "#ffd0a3",
        "terrainStyle": "world3",
        "blockShade": "rgba(0,0,0,0.5)",
        "blockHighlight": "rgba(255,190,120,0.26)",
        "blockAccent": "#ffac66"
      },
      "screens": [
        {
          "name": "Throne Crucible",
          "description": "A magma throne rises from the lava sea as the sovereign descends.",
          "layout": {
            "tileSize": 64,
            "cols": 44,
            "rows": 10,
            "tiles": [
              "..............1.............................",
              "...............p............p...............",
              "............######........######............",
              ".........##########....p...##########.......",
              "......##############....1...############....",
              "....###############..mm..mm..############...",
              "..###############..##..##..###############..",
              "<###############............###############>",
              "############################################",
              "############################################"
            ],
            "enemyLegend": {
              "1": "emberWisp"
            }
          },
          "enemies": [
            {
              "kind": "emberWisp",
              "count": 2
            }
          ],
          "boss": {
            "name": "Cinder Sovereign",
            "kind": "cinderKing",
            "hp": 120,
            "weapon": "bomb",
            "attack": 60,
            "defense": 24,
            "attackRange": 360,
            "speedMult": 0.95,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_1_4.json", data: {
      "id": "neonCitadel",
      "name": "Neon Citadel",
      "description": "The sanctum hums with charged silence and a single blazing foe.",
      "map": {
        "x": 0.481,
        "y": 0.401,
        "order": "IV",
        "branch": "setExtra",
        "branchStep": 1,
        "standalone": true,
        "parent": "betweenTimeHall",
        "requires": ["betweenTimeHall"]
      },
      "playable": true,
      "optional": true,
      "stageNumber": 0,
      "color": "#6b5bff",
      "layout": {
        "tileSize": 64,
        "cols": 16,
        "rows": 10,
        "tiles": [
          "................",
          "................",
          ".......##.......",
          "................",
          "..<.p......p.>..",
          "..####......####",
          "..####......####",
          "..####......####",
          "..####..m...####",
          "##S##########S##"
        ],
        "symbolLegend": {
          "S": {
            "terrain": true,
            "object": {
              "type": "spikes",
              "width": 64,
              "height": 32,
              "offsetY": -6
            }
          }
        }
      },
      "bossStage": false,
      "palette": {
        "skyTop": "#05071a",
        "skyBottom": "#0b1128",
        "ground": "#141b3c",
        "turf": "#141b3c",
        "doorClosed": "#1f2a52",
        "doorOpen": "#66f0ff",
        "accent": "#54f0ff",
        "terrainStyle": "world8",
        "blockShade": "rgba(0,0,0,0.78)",
        "blockHighlight": "rgba(120,255,255,0.18)",
        "blockAccent": "#3d4bdc"
      },
      "screens": [
        {
          "name": "Luminous Vault",
          "description": "Darkness recoils around a radiant duelist.",
          "enemies": [],
          "boss": {
            "name": "Radiant Warden",
            "kind": "neonWarden",
            "hp": 10,
            "weapon": "neonBlade",
            "attack": 5,
            "defense": 2,
            "attackRange": 260,
            "behavior": "neonOverlord",
            "renderStyle": "neon",
            "bodyColor": "#06101f",
            "accentColor": "#54f0ff",
            "showWeapon": false,
            "speedMult": 1.12,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_2_1.json", data: {
      "id": "stage5",
      "name": "Verdant Skyways",
      "description": "Suspended gardens and whispering windmills stitch a path across the upper canyons.",
      "map": {
        "x": 0.5,
        "y": 0.32,
        "order": "✿",
        "branch": "world1",
        "branchStep": 4
      },
      "playable": true,
      "stageNumber": 4,
      "bossStage": true,
      "color": "#68e0a3",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 11,
        "tiles": [
          "................................................................",
          "................................................................",
          "........p......p.........................p............p.........",
          "............p..............##.###............p..................",
          ".....................#t#gt#c#......##g##..........g.............",
          "..........#t#t#......######........#t#t#........#t#t#...........",
          "................###....p.....###..p.............................",
          "....###.........#t#..........#t#..........#t#...........#t#.....",
          "....#g#.........#g#..........#g#..........#g#...........#g#.....",
          "#########...#########...###########...##########...#############",
          "################################################################"
        ],
        "symbolLegend": {
          "V": {
            "object": {
              "type": "windLift",
              "width": 72,
              "height": 180,
              "offsetY": -148,
              "forceY": -3200,
              "forceX": 260,
              "coreColor": "#68e0a3",
              "swirlColor": "#b9ffd9",
              "pulseMs": 1800
            }
          }
        }
      },
      "palette": {
        "skyTop": "#2a4156",
        "skyBottom": "#13212d",
        "ground": "#2c4a36",
        "turf": "#68e0a3",
        "doorClosed": "#1f3330",
        "doorOpen": "#7ce9ff",
        "accent": "#ffd17a",
        "terrainStyle": "meadow",
        "blockShade": "rgba(0,0,0,0.32)",
        "blockHighlight": "rgba(255,255,255,0.16)",
        "blockAccent": "#82f0c0"
      },
      "screens": [
        {
          "name": "Windwheel Causeway",
          "description": "Glide beneath irrigated trellises and drifting planters.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 11,
            "tiles": [
              "................................................................",
              "................................................................",
              "........p......p............p............p............p.........",
              "............p..............##.###............p..................",
              "................w....#t#gt#c#......##g##..........g.............",
              "..........#t#t#......######........#t#t#........#t#t#...........",
              "................###.V..p.....###..p.............................",
              "....###.........#t#..........#t#..........#t#...........#t#.....",
              "....#g#.........#g#..........#g#..........#g#...........#g#.....",
              "##<######...#########...###########...##########...########>####",
              "################################################################"
            ],
            "symbolLegend": {
              "V": {
                "object": {
                  "type": "windLift",
                  "width": 72,
                  "height": 180,
                  "offsetY": -148,
                  "forceY": -3200,
                  "forceX": 260,
                  "coreColor": "#68e0a3",
                  "swirlColor": "#b9ffd9",
                  "pulseMs": 1800
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "skyReaver",
              "count": 2
            },
            {
              "kind": "bloomSeer",
              "count": 1
            }
          ]
        },
        {
          "name": "Hanging Orchard",
          "description": "Leap between rotating garden barges.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 11,
            "tiles": [
              "................................................................",
              "................................................................",
              "........p......p.........................p..p.........p.........",
              "............p..............##.###............p..................",
              ".....................#t#gt#c#......##g##.........wg.............",
              "..........#t#t#......######........#t#t#........#t#t#...........",
              "................###....p.....#V#..p.....p.......................",
              "....###.........#t#..........#t#..........#t#...........#t#.....",
              "....#g#.........#g#..........#g#..........#g#...........#g#.....",
              "#########...##<######...###########>..##########...#############",
              "################################################################"
            ],
            "symbolLegend": {
              "V": {
                "object": {
                  "type": "windLift",
                  "width": 72,
                  "height": 180,
                  "offsetY": -148,
                  "forceY": -3200,
                  "forceX": 260,
                  "coreColor": "#68e0a3",
                  "swirlColor": "#b9ffd9",
                  "pulseMs": 1800
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "bloomSeer",
              "count": 2
            },
            {
              "kind": "canopyWisp",
              "count": 2
            }
          ]
        },
        {
          "name": "Skybridge Atrium",
          "description": "Climb the great arbor spans to reach the exit gate.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 11,
            "tiles": [
              "................................................................",
              "................................................................",
              "........p......p.........................p............p.........",
              "............p..............##.###............p..................",
              "...........t.........#t#gt#c#......##g##..........g.............",
              "..........#t#t#......######........#V#t#........#t#t#...........",
              "................###....p.....###..p.............................",
              "....###.........#t#..........#t#..........#t#...........#t#.....",
              "....#g#.........#g#..........#g#..........#g#...........#g#.....",
              "#########...#########...<##########...##########...>############",
              "################################################################"
            ],
            "symbolLegend": {
              "V": {
                "object": {
                  "type": "windLift",
                  "width": 72,
                  "height": 180,
                  "offsetY": -148,
                  "forceY": -3200,
                  "forceX": 260,
                  "coreColor": "#68e0a3",
                  "swirlColor": "#b9ffd9",
                  "pulseMs": 1800
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "skyReaver",
              "count": 2
            },
            {
              "kind": "canopyWisp",
              "count": 2
            },
            {
              "kind": "bloomSeer",
              "count": 1
            }
          ],
          "boss": {
            "name": "Canopy Castellan",
            "kind": "bloomSeer",
            "hp": 40,
            "weapon": "staff",
            "attack": 20,
            "defense": 8,
            "attackRange": 260,
            "speedMult": 1.0,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_2_2.json", data: {
      "id": "stage6",
      "name": "Abyssal Engineworks",
      "description": "Echoing foundries churn beneath the waves where coral and brass machinery intertwine.",
      "map": {
        "x": 0.5636,
        "y": 0.5636,
        "order": "⚙",
        "branch": "world4",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 13,
      "color": "#4fa7ff",
      "layout": {
        "tileSize": 64,
        "cols": 60,
        "rows": 10,
        "tiles": [
          "............................................................",
          "............................................................",
          "..........w.......................##w##.....................",
          ".....................##w####..##...............##w###.......",
          "#......######...##..p.........##.p.......##...p............#",
          "#...........p..w##..........######...p...##.w..............#",
          "#....c........######........######......######.......c.....#",
          "#...#####.....######..........##........######....#####....#",
          "###.#####~~~~...##....~~~~....##...~~~~..##.....~~~####..###",
          "############################################################"
        ],
        "symbolLegend": {
          "O": {
            "object": {
              "type": "steamVent",
              "width": 64,
              "height": 120,
              "offsetY": -96,
              "damage": 18,
              "knock": 1.25,
              "pushY": -2800,
              "cycleMs": 2800,
              "activeMs": 1400,
              "baseColor": "#1b3342",
              "ventColor": "#7fe1ff"
            }
          }
        }
      },
      "palette": {
        "skyTop": "#0a2536",
        "skyBottom": "#04121f",
        "ground": "#1b3342",
        "turf": "#4fa7ff",
        "doorClosed": "#163248",
        "doorOpen": "#7fe1ff",
        "accent": "#52b0ff",
        "terrainStyle": "world4",
        "blockShade": "rgba(0,0,0,0.45)",
        "blockHighlight": "rgba(120,220,255,0.28)",
        "blockAccent": "#66c6ff"
      },
      "enemyNumbers": {
        "1": "anchorBruiser",
        "2": "tideWarden",
        "3": "ventArcanist"
      },
      "screens": [
        {
          "name": "Floodgate Approach",
          "description": "Navigate dripping catwalks between tidal machines.",
          "layout": {
            "tileSize": 64,
            "cols": 60,
            "rows": 10,
            "tiles": [
              "............................................................",
              "............................................................",
              "..........w.......................##w##.....................",
              ".....................##w####..##...............##w###.......",
              "#....1......p..w##..........######1..p...##.w2.............#",
              "#...........p.Ow##......p...######...p...##.w..............#",
              "#....c........######........######......######.......c.....#",
              "#...#####.....######..........##........######....#####....#",
              "###.#####~~~~...##....~~~~....##...~~~~..##.....~~~####..###",
              "##<###########################>#############################"
            ],
            "symbolLegend": {
              "O": {
                "object": {
                  "type": "steamVent",
                  "width": 64,
                  "height": 120,
                  "offsetY": -96,
                  "damage": 18,
                  "knock": 1.25,
                  "pushY": -2800,
                  "cycleMs": 2800,
                  "activeMs": 1400,
                  "baseColor": "#1b3342",
                  "ventColor": "#7fe1ff"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "anchorBruiser",
              "count": 2
            },
            {
              "kind": "tideWarden",
              "count": 1
            }
          ]
        },
        {
          "name": "Pressure Hall",
          "description": "Ride the conduits where pistons churn beneath the surf.",
          "layout": {
            "tileSize": 64,
            "cols": 60,
            "rows": 10,
            "tiles": [
              "............................................................",
              "............................................................",
              "..........w.......................##w##.....................",
              ".....w...............##w####..##...............##w###.......",
              "#......######...##..p.........##.p......O##...p............#",
              "#....1......p..w##..........######3..p...##.w2....3........#",
              "#....c........######........######......######.......c.....#",
              "#...#####.....######..........##........######....##p##....#",
              "###.#####~~~~...##....~~~~....##...~~~~..##.....~~~####..###",
              "##############################<##########################>##"
            ],
            "symbolLegend": {
              "O": {
                "object": {
                  "type": "steamVent",
                  "width": 64,
                  "height": 120,
                  "offsetY": -96,
                  "damage": 18,
                  "knock": 1.25,
                  "pushY": -2800,
                  "cycleMs": 2800,
                  "activeMs": 1400,
                  "baseColor": "#1b3342",
                  "ventColor": "#7fe1ff"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "ventArcanist",
              "count": 2
            },
            {
              "kind": "tideWarden",
              "count": 1
            },
            {
              "kind": "anchorBruiser",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_2_3.json", data: {
      "id": "stage7",
      "name": "Stage VII – Chronoglass Expanse",
      "description": "Mirrored dunes fracture time itself, looping skirmishes through amber hourglasses.",
      "map": {
        "x": 0.41,
        "y": 0.5,
        "order": "⌛",
        "branch": "setExtra",
        "branchStep": 1,
        "standalone": true,
        "parent": "pendulumEngine",
        "requires": ["pendulumEngine"]
      },
      "playable": true,
      "optional": true,
      "color": "#f4b567",
      "layout": {
        "tileSize": 64,
        "cols": 120,
        "rows": 11,
        "tiles": [
          "........................................................................................................................",
          "........................................................................................................................",
          "....................p.......................p.......................p.......................p.......................p...",
          "........................................................................................................................",
          "........p...................p.......................p.......................p.......................p...................",
          "#.................#.......................#.......................#.......................#.......................#....#",
          "#.................#.......................#.......................#.......................#.......................#....#",
          "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
          "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
          "##..###########=====###################=====###################=====###################=====####################======.#",
          "########################################################################################################################"
        ],
        "symbolLegend": {
          "Y": {
            "object": {
              "type": "chronoField",
              "width": 96,
              "height": 132,
              "offsetY": -112,
              "slow": 0.38,
              "drag": 5.6,
              "floatForce": -680,
              "shimmerColor": "#f7c978",
              "accentColor": "#ffd27a"
            }
          }
        }
      },
      "palette": {
        "skyTop": "#3d2414",
        "skyBottom": "#160d06",
        "ground": "#4b341c",
        "turf": "#f4b567",
        "doorClosed": "#4d3824",
        "doorOpen": "#ffe59a",
        "accent": "#ffd27a",
        "terrainStyle": "meadow",
        "blockShade": "rgba(0,0,0,0.38)",
        "blockHighlight": "rgba(255,220,150,0.18)",
        "blockAccent": "#f7c978"
      },
      "screens": [
        {
          "name": "Amber Foothold",
          "description": "Trace the first mirrored dunes and their gentle slopes.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p.........p.........p.......................p.......................p.......................p...................",
              "#...........Y.....#.......................#.......................#.......................#.......................#....#",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##<.###########=====######>############=====###################=====###################=====####################======.#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "mirageLancer",
              "count": 1
            },
            {
              "kind": "echoSlinger",
              "count": 2
            }
          ]
        },
        {
          "name": "Hourglass Crossing",
          "description": "Skirt chrono pillars split by shimmering sandfalls.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p...................p.......................p.......................p.......................p...................",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#.................#.................Y.....#.......................#.......................#.......................#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##..###########=====######<############=====####>##############=====###################=====####################======.#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "chronoglassOracle",
              "count": 2
            },
            {
              "kind": "echoSlinger",
              "count": 1
            }
          ]
        },
        {
          "name": "Resonant Drift",
          "description": "Ride the shifting ridges as echoes trail your steps.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p...................p.......................p.......................p.......................p...................",
              "#.................#.......................#...............Y.......#.......................#.......................#....#",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##..###########=====###################=====####<##############=====##>################=====####################======.#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "mirageLancer",
              "count": 2
            },
            {
              "kind": "chronoglassOracle",
              "count": 1
            }
          ]
        },
        {
          "name": "Gleaming Parade",
          "description": "Leap between glass terraces suspended in the gale.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p...................p.......................p.......................p.......p...............p...................",
              "#.................#.......................#.......................#.........Y.............#.......................#....#",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##..###########=====###################=====###################=====##<################=====>###################======.#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "mirageLancer",
              "count": 1
            },
            {
              "kind": "echoSlinger",
              "count": 2
            },
            {
              "kind": "chronoglassOracle",
              "count": 1
            }
          ]
        },
        {
          "name": "Refraction Causeway",
          "description": "Looping footprints shimmer through mirrored arches.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p...................p.......................p.......................p.......................p...................",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#.................#.......................#.......................#.......................#.......Y...............#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##..###########=====###################=====###################=====###################=====<###################>=====.#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "chronoglassOracle",
              "count": 2
            },
            {
              "kind": "echoSlinger",
              "count": 2
            }
          ]
        },
        {
          "name": "Temporal Verge",
          "description": "The dunes narrow into a final shining ribbon.",
          "layout": {
            "tileSize": 64,
            "cols": 120,
            "rows": 11,
            "tiles": [
              "........................................................................................................................",
              "........................................................................................................................",
              "....................p.......................p.......................p.......................p.......................p...",
              "........................................................................................................................",
              "........p...................p.......................p.......................p.......................p...................",
              "#.................#.......................#.......................#.......................#.................Y.....#....#",
              "#.................#.......................#.......................#.......................#.......................#....#",
              "#...........###...t.g.............###.....t.g.............###.....t.g.............###.....t.g.............###.....t.g..#",
              "#...##t#g##.......#.....####t#g##.........#.....##t#g####.........#.....##t#g####.........#.....##t#g####.........#....#",
              "##..###########=====###################=====###################=====###################=====####################<=====>#",
              "########################################################################################################################"
            ],
            "symbolLegend": {
              "Y": {
                "object": {
                  "type": "chronoField",
                  "width": 96,
                  "height": 132,
                  "offsetY": -112,
                  "slow": 0.38,
                  "drag": 5.6,
                  "floatForce": -680,
                  "shimmerColor": "#f7c978",
                  "accentColor": "#ffd27a"
                }
              }
            }
          },
          "enemies": [
            {
              "kind": "mirageLancer",
              "count": 2
            },
            {
              "kind": "chronoglassOracle",
              "count": 1
            },
            {
              "kind": "echoSlinger",
              "count": 1
            }
          ],
          "boss": {
            "name": "Paradox Herald",
            "kind": "chronoglassOracle",
            "hp": 130,
            "weapon": "chronoglassStaff",
            "attack": 65,
            "defense": 26,
            "behavior": "caster",
            "speedMult": 1.05,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_2_4.json", data: {
      "id": "stage8",
      "name": "Auric Apex Citadel",
      "description": "A gilded storm-fortress crowns the horizon, sheltering a sovereign rival.",
      "map": {
        "x": 0.5,
        "y": 0.68,
        "order": "♛",
        "boss": true,
        "requiresAllComplete": true,
        "branch": "world5",
        "branchStep": 4
      },
      "playable": true,
      "stageNumber": 20,
      "color": "#f1d86a",
      "bossStage": true,
      "requiresAllComplete": true,
      "layout": {
        "tileSize": 64,
        "cols": 56,
        "rows": 11,
        "tiles": [
          "........................................................",
          "........................................................",
          "........................................................",
          "............p....p....................p....p............",
          "..............##..#####.........#####....##.............",
          "........##w...##.........................##.w.##........",
          "........##...w##........########.........#w...##........",
          "........##....##....#####t#gg#t#####.....##...##........",
          "........##..........##t#g######g#t##..........##........",
          "...##################################################...",
          "########################################################"
        ],
        "symbolLegend": {
          "P": {
            "object": {
              "type": "auricBeacon",
              "width": 64,
              "height": 64,
              "offsetY": -64,
              "radius": 140,
              "damage": 42,
              "knock": 1.6,
              "force": 3200,
              "cycleMs": 4200,
              "pulseMs": 950,
              "flareColor": "#ffef9a",
              "emberColor": "#f1d86a"
            }
          }
        }
      },
      "palette": {
        "skyTop": "#2a1109",
        "skyBottom": "#0e0503",
        "ground": "#3a1f12",
        "turf": "#f1d86a",
        "doorClosed": "#3b2a1b",
        "doorOpen": "#ffd76d",
        "accent": "#ffef9a",
        "terrainStyle": "world5",
        "blockShade": "rgba(0,0,0,0.4)",
        "blockHighlight": "rgba(255,230,160,0.2)",
        "blockAccent": "#fbe58a"
      },
      "screens": [
        {
          "name": "Gilded Rostrum",
          "description": "A radiant arena awaits the citadel guardian.",
          "layout": {
            "tileSize": 64,
            "cols": 56,
            "rows": 11,
            "tiles": [
              "........................................................",
              "........................................................",
              "........................................................",
              "............p....p....................p....p............",
              "..............##..#####.....P...#####....##.............",
              "........##w...##.........................##.w.##........",
              "........##...w##........####t###.........#w...##........",
              "........##....##....#####t#gg#t#####.....##...##........",
              "........##..........##t#g######g#t##..........##........",
              "...#<##############################################>#...",
              "########################################################"
            ],
            "symbolLegend": {
              "P": {
                "object": {
                  "type": "auricBeacon",
                  "width": 64,
                  "height": 64,
                  "offsetY": -64,
                  "radius": 140,
                  "damage": 42,
                  "knock": 1.6,
                  "force": 3200,
                  "cycleMs": 4200,
                  "pulseMs": 950,
                  "flareColor": "#ffef9a",
                  "emberColor": "#f1d86a"
                }
              }
            }
          },
          "enemies": [],
          "boss": {
            "name": "Toon Stick",
            "kind": "toonChampion",
            "hp": 200,
            "weapon": "toonBrush",
            "attack": 100,
            "defense": 40,
            "attackRange": 300,
            "behavior": "toonChampion",
            "renderStyle": "toon",
            "bodyColor": "#ffe4ad",
            "accentColor": "#3b2418",
            "showWeapon": false,
            "speedMult": 1.08,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_3_1.json", data: {
      "id": "stage9",
      "name": "Inspire Dunes",
      "description": "Surf the wind-sculpted ridges and crest the flowing dunes.",
      "map": {
        "x": 0.5,
        "y": 0.59,
        "order": "IX",
        "branch": "world5",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 17,
      "color": "#d6a65c",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 10,
        "tiles": [
          "................................................................",
          "....................p......................p....................",
          "..............##..............p........##...............p.......",
          "...a###====####..a###====####...a###====####....a###====####....",
          "..a###======###..a###======###..a###======###..a###======###....",
          "###..######..###..###..######..###..###..######..###..###..#####",
          "###..........###..###..........###..###..........###..###.......",
          "##..====a====..##..====a====..##..====a====..##..====a====..##..",
          "##############################################################..",
          "################################################################"
        ]
      },
      "palette": {
        "skyTop": "#3a2212",
        "skyBottom": "#160c05",
        "ground": "#4f3720",
        "turf": "#d6a65c",
        "doorClosed": "#4a3420",
        "doorOpen": "#ffe3a3",
        "accent": "#f6c978",
        "terrainStyle": "world5",
        "blockShade": "rgba(0,0,0,0.36)",
        "blockHighlight": "rgba(255,235,180,0.16)",
        "blockAccent": "#e4bb6f"
      },
      "sandScene": {
        "cellSize": 3,
        "baseThickness": 22,
        "color": "#d8bc76",
        "shade": "#b48842",
        "highlight": "rgba(255,238,180,0.6)",
        "hills": [
          {
            "col": 4.2,
            "width": 5.8,
            "height": 2.2
          },
          {
            "col": 12.6,
            "width": 6.4,
            "height": 3.1
          },
          {
            "col": 20.8,
            "width": 5.2,
            "height": 2.6
          },
          {
            "col": 28.4,
            "width": 4.6,
            "height": 2.1
          }
        ]
      },
      "screens": [
        {
          "name": "Dunefront Run",
          "description": "Weave across staggered dunes while sandstone sentries emerge.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "................................................................",
              "....................p......................p....................",
              "..............##..............p........##...............p.......",
              "...a###====####..a###====####...a###====####....a###====####....",
              "..a###======###..a###======###..a###======###..a###======###....",
              "###..######..###..###..######..###..###..######..###..###..#####",
              "###..........#1#..###.........2###..###...1......###..###.......",
              "##..====a====..##..====a====..##..====a====..##..====a====..##..",
              "##############################################################..",
              "##<#################>###########################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "sandWanderer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "sandBlock"
                }
              }
            }
          }
        },
        {
          "name": "Crescent Basin",
          "description": "Leap between carved arches that conceal rolling threats.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "................................................................",
              "....................p......................p....................",
              "..............##..............p........##...............p.......",
              "...a###====####..a###====####...a###====####....a###====####....",
              "..a###======###..a###======###..a###======###..aL##======###....",
              "###..#####2..###..###..######..###..###..######..###..###..#####",
              "###...3......###..###..........###..2##..........###..###.......",
              "##..====a====..##..====a====..##..====a====..##..====a====..##..",
              "##############################################################..",
              "####################<###################>#######################"
            ],
            "symbolLegend": {
              "2": {
                "enemy": {
                  "kind": "sandBlock"
                }
              },
              "3": {
                "enemy": {
                  "kind": "baldRoller"
                }
              }
            }
          }
        },
        {
          "name": "Sunspire Approach",
          "description": "Jagged spires funnel the last defenders before the gate.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "................................................................",
              "....................p......................p....................",
              "..............##..............p........##...............p.......",
              "...a###====####..a###====####...a###====####....a###====####....",
              "..a###======###..a###======###..a###======###..a###======###....",
              "###..######..###..###..#####1..###..###..######..###..###..#####",
              "###...3......###..###...1......###..###..........#2#..###.......",
              "##..====a====..##..====a====..##..====a====..##..====a====..##..",
              "##############################################################..",
              "########################################<###################>###"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "sandWanderer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "sandBlock"
                }
              },
              "3": {
                "enemy": {
                  "kind": "baldRoller"
                }
              }
            }
          }
        }
      ]
    } },
  { file: "level_3_1b.json", data: {
      "id": "world5Stage2",
      "name": "Mirage Bazaar",
      "description": "Weave through sand-swept stalls where mirage assassins strike from shimmering veils.",
      "map": {
        "x": 0.56,
        "y": 0.6,
        "branch": "world5",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 18,
      "color": "#d9b46a",
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 9,
        "tiles": [
          "........................................",
          "..............p....p........p...........",
          ".........a###====####====###a...........",
          ".......a###======####======###a.........",
          "...a###..######......######..###a.......",
          "..###==........==##==........==###......",
          ".<###====########..########====###>.....",
          "########################################",
          "########################################"
        ]
      },
      "palette": {
        "skyTop": "#3a2212",
        "skyBottom": "#160c05",
        "ground": "#4f3720",
        "turf": "#d9b46a",
        "doorClosed": "#4a3420",
        "doorOpen": "#ffe3a3",
        "accent": "#f6c978",
        "terrainStyle": "world5",
        "blockShade": "rgba(0,0,0,0.36)",
        "blockHighlight": "rgba(255,235,180,0.16)",
        "blockAccent": "#e4bb6f"
      },
      "screens": [
        {
          "name": "Shifting Stalls",
          "description": "Navigate collapsing stalls while mirages mask hidden blades.",
          "layout": {
            "tileSize": 64,
            "cols": 40,
            "rows": 9,
            "tiles": [
              "........................................",
              "..............p....p........p...........",
              ".........a###====####====###a...........",
              ".......a###======####======###a.........",
              "...a###..######......######..###a.......",
              "..###==1.......==##=2........==###......",
              ".<###====########..########====###>..1..",
              "########################################",
              "########################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "sandWanderer"
                }
              },
              "2": {
                "enemy": {
                  "kind": "sandBlock"
                }
              }
            }
          }
        }
      ]
    } },
  { file: "level_3_1c.json", data: {
      "id": "world5Stage3",
      "name": "Sirocco Causeway",
      "description": "Cross elevated caravan bridges as sirocco gusts hurl debris across the path.",
      "map": {
        "x": 0.62,
        "y": 0.61,
        "branch": "world5",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 19,
      "color": "#d4a95f",
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 9,
        "tiles": [
          "........................................",
          "..............p....p........p...........",
          ".........a###====####====###a...........",
          ".......a###======####======###a.........",
          "...a###..######......######..###a.......",
          "..###==........==##==........==###......",
          "<###====########....########====###>....",
          "########################################",
          "########################################"
        ],
        "objects": [
          {
            "type": "skillPedestal",
            "id": "world5_shrine_chain",
            "col": 19,
            "row": 6,
            "offsetY": -2,
            "width": 96,
            "height": 144,
            "abilityId": "chainSwing",
            "pedestalColor": "#6b5332",
            "bookColor": "#f6e9c6",
            "shrineGlowColor": "#ffe59a",
            "promptColor": "#ffd27a"
          }
        ]
      },
      "palette": {
        "skyTop": "#3a2212",
        "skyBottom": "#160c05",
        "ground": "#4f3720",
        "turf": "#d4a95f",
        "doorClosed": "#4a3420",
        "doorOpen": "#ffe3a3",
        "accent": "#f6c978",
        "terrainStyle": "world5",
        "blockShade": "rgba(0,0,0,0.36)",
        "blockHighlight": "rgba(255,235,180,0.16)",
        "blockAccent": "#e4bb6f"
      },
      "screens": [
        {
          "name": "Wind-scoured Causeway",
          "description": "Brace against crosswinds as rollers barrel along the spans.",
          "layout": {
            "tileSize": 64,
            "cols": 40,
            "rows": 9,
            "tiles": [
              "........................................",
              "..............p....p........p...........",
              ".........a###====####====###a...........",
              ".......a###======####======###a.........",
              "...a###..######......######..###a.......",
              "..###==2.......==##==........==###......",
              "<###====########..3.########====###>....",
              "########################################",
              "########################################"
            ],
            "symbolLegend": {
              "2": {
                "enemy": {
                  "kind": "sandBlock"
                }
              },
              "3": {
                "enemy": {
                  "kind": "baldRoller"
                }
              }
            }
          }
        }
      ]
    } },
  { file: "level_3_2.json", data: {
      "id": "stage10",
      "name": "Tidal Wells",
      "description": "Ancient wells channel tidal surges through glyph-lit aqueduct vaults.",
      "map": {
        "x": 0.6272,
        "y": 0.6272,
        "order": "X",
        "branch": "world4",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 14,
      "color": "#58b4ff",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 10,
        "tiles": [
    '................................................................',
    '...............p...........p.............p...........p..........',
    '................................................................',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~',
    '~~~~~~~~<~~~~~~~~w~~~~###~~~~~~~w~~~~~~~###~~~~~~~w~~~>###~~~~~~',
    '~~~~~~~###############~~~###############~~~#################~~~~',
    '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~~~###',
    '################################################################',
        ]
      },
      "palette": {
        "skyTop": "#0a1c2c",
        "skyBottom": "#040e18",
        "ground": "#123042",
        "turf": "#58b4ff",
        "doorClosed": "#123748",
        "doorOpen": "#8bd0ff",
        "accent": "#3ad7ff",
        "terrainStyle": "world4",
        "blockShade": "rgba(0,0,0,0.46)",
        "blockHighlight": "rgba(120,220,255,0.32)",
        "blockAccent": "#74d3ff"
      },
      "enemyNumbers": {
        "1": "anchorBruiser",
        "2": "tideWarden",
        "3": "ventArcanist",
        "4": "glyphSalmon",
        "5": "glyphGyre"
      },
      "waterScene": {
        "cellSize": 3,
        "color": "rgba(70, 160, 220, 0.9)",
        "shade": "rgba(12, 46, 74, 0.82)",
        "highlight": "rgba(170, 240, 255, 0.65)"
      },
      "screens": [
        {
          "name": "Flooded Antechamber",
          "description": "Swim beneath the first vaults where glyph salmon patrol the beams.",
            "layout": {
              "tileSize": 64,
              "cols": 64,
              "rows": 10,
              "tiles": [
      '..........4.....................4...................1...........',
      '...............p...........p.............p...........p..........',
      '........4...................4...................4.......2.......',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~',
      '~~~~~~~~<~~~~~~~~w~~~~###~~~~~~~w~~~~~~~###~~~~~~~w~~~>###~~~~~~',
      '~~~~~~~###############~~~###############~~~#################~~~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~###~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~~~###',
      '################################################################',
              ],
              "objects": [
                {
                  "type": "rainField",
                  "col": 32,
                  "row": 2,
                  "width": 4096,
                  "height": 760,
                  "offsetY": -220,
                  "density": 220,
                  "dropAlpha": 0.72,
                  "dropColor": "rgba(192, 224, 255, 0.45)",
                  "splashColor": "rgba(198, 236, 255, 0.6)",
                  "dropLength": 28,
                  "dropThickness": 1.2,
                  "splashRadius": 16,
                  "splashDuration": 0.26,
                  "speed": 860,
                  "wind": -30,
                  "mistAlpha": 0.05,
                  "mistColor": "rgba(110, 160, 210, 0.12)",
                  "layer": "foreground"
                }
              ]
            },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 2
            },
            {
              "kind": "anchorBruiser",
              "count": 1
            }
          ]
        },
        {
          "name": "Runic Gallery",
          "description": "Currents twist between the runic pylons and force prolonged dives.",
            "layout": {
              "tileSize": 64,
              "cols": 64,
              "rows": 10,
              "tiles": [
      '........4...............3.......4...............4.......5.......',
      '...............p...........p.............p...........p..........',
      '................................................................',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~',
      '~~~~~~~~<~~~~~~~~w~~~~###~~~~~~~w~~~~~~~###~~~~~~~w~~~>###~~~~~~',
      '~~~~~~~###############~~~###############~~~#################~~~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~###~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~~~###',
      '################################################################',
              ],
              "objects": [
                {
                  "type": "rainField",
                  "col": 32,
                  "row": 2,
                  "width": 4096,
                  "height": 760,
                  "offsetY": -220,
                  "density": 220,
                  "dropAlpha": 0.72,
                  "dropColor": "rgba(192, 224, 255, 0.45)",
                  "splashColor": "rgba(198, 236, 255, 0.6)",
                  "dropLength": 28,
                  "dropThickness": 1.2,
                  "splashRadius": 16,
                  "splashDuration": 0.26,
                  "speed": 860,
                  "wind": -30,
                  "mistAlpha": 0.05,
                  "mistColor": "rgba(110, 160, 210, 0.12)",
                  "layer": "foreground"
                }
              ]
            },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 3
            },
            {
              "kind": "tideWarden",
              "count": 1
            }
          ]
        },
          {
            "name": "Abyssal Gate",
            "description": "Descend through the deepest hall to reach the surfaced exit channel.",
            "layout": {
              "tileSize": 64,
              "cols": 64,
              "rows": 10,
              "tiles": [
      '................................................................',
      '...............p...........p.............p...........p..........',
      '................................................................',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~',
      '~~~~~~~~<~~~~~~~~w~~~~###~~~~~~~w~~~~~~~###~~~~~~~w~~~>###~~~~~~',
      '~~~~~~~###############~~~###############~~~#################~~~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~###~~',
      '~~~~~~~###############################~~~~~~~~~~~~~~~~~~~~~~~###',
      '################################################################',
              ],
              "objects": [
                {
                  "type": "rainField",
                  "col": 32,
                  "row": 2,
                  "width": 4096,
                  "height": 760,
                  "offsetY": -220,
                  "density": 220,
                  "dropAlpha": 0.72,
                  "dropColor": "rgba(192, 224, 255, 0.45)",
                  "splashColor": "rgba(198, 236, 255, 0.6)",
                  "dropLength": 28,
                  "dropThickness": 1.2,
                  "splashRadius": 16,
                  "splashDuration": 0.26,
                  "speed": 860,
                  "wind": -30,
                  "mistAlpha": 0.05,
                  "mistColor": "rgba(110, 160, 210, 0.12)",
                  "layer": "foreground"
                }
              ]
            },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 3
            },
            {
              "kind": "glyphGyre",
              "count": 1
            },
            {
              "kind": "ventArcanist",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_3_3.json", data: {
      "id": "stage11",
      "name": "Twilight Trench",
      "description": "Dive through the twilight trench where glyph beacons flicker.",
      "map": {
        "x": 0.6908,
        "y": 0.6908,
        "order": "XI",
        "branch": "world4",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 15,
      "color": "#4aa9ff",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 12,
        "tiles": [
          "................................................................",
          "................................................................",
          ".............p...............p...............p..................",
          "..........###.............###..............###.............###..",
          "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
          "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
          "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
          "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
          "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
          "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
          "~~~~~~<###############~~~~~~~~~~~~###############>~~~~~~~~~~~~~~",
          "################################################################"
        ],
        "objects": [
          {
            "type": "restingStick",
            "id": "world4_resting_third",
            "col": 30,
            "row": 6,
            "offsetY": -2,
            "width": 80,
            "height": 96,
            "unlockSlot": 3,
            "promptColor": "#7bc8ff",
            "spawnOffsetY": -4
          },
          {
            "type": "rainField",
            "col": 32,
            "row": 2,
            "width": 4096,
            "height": 800,
            "offsetY": -240,
            "density": 220,
            "dropAlpha": 0.72,
            "dropColor": "rgba(192, 224, 255, 0.45)",
            "splashColor": "rgba(198, 236, 255, 0.6)",
            "dropLength": 28,
            "dropThickness": 1.2,
            "splashRadius": 16,
            "splashDuration": 0.26,
            "speed": 860,
            "wind": -30,
            "mistAlpha": 0.05,
            "mistColor": "rgba(110, 160, 210, 0.12)",
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#041a2a",
        "skyBottom": "#020b14",
        "ground": "#123248",
        "turf": "#4aa9ff",
        "doorClosed": "#0f2d40",
        "doorOpen": "#7bc8ff",
        "accent": "#a4ecff",
        "terrainStyle": "world4",
        "blockShade": "rgba(0,0,0,0.5)",
        "blockHighlight": "rgba(160,220,255,0.28)",
        "blockAccent": "#66c7ff"
      },
      "enemyNumbers": {
        "1": "anchorBruiser",
        "2": "tideWarden",
        "3": "ventArcanist",
        "4": "glyphSalmon",
        "5": "glyphGyre"
      },
      "waterScene": {
        "cellSize": 3,
        "color": "rgba(70, 160, 220, 0.92)",
        "shade": "rgba(8, 32, 54, 0.86)",
        "highlight": "rgba(180, 240, 255, 0.6)"
      },
      "screens": [
        {
          "name": "Flooded Causeway",
          "description": "Slip across the submerged causeway guarded by anchor sentries.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 12,
            "tiles": [
              "................................................................",
              "................................................................",
              "........4....p...............p....4..........p......1...........",
              "..........###.............###..............###.............###..",
              "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
              "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
              "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
              "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
              "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
              "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
              "~~~~~~<###############~~~~~~~~~~~~###############>~~~~~~~~~~~~~~",
              "################################################################"
            ],
            "objects": [
              {
                "type": "rainField",
                "col": 32,
                "row": 2,
                "width": 4096,
                "height": 800,
                "offsetY": -240,
                "density": 220,
                "dropAlpha": 0.72,
                "dropColor": "rgba(192, 224, 255, 0.45)",
                "splashColor": "rgba(198, 236, 255, 0.6)",
                "dropLength": 28,
                "dropThickness": 1.2,
                "splashRadius": 16,
                "splashDuration": 0.26,
                "speed": 860,
                "wind": -30,
                "mistAlpha": 0.05,
                "mistColor": "rgba(110, 160, 210, 0.12)",
                "layer": "foreground"
              }
            ]
          },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 2
            },
            {
              "kind": "anchorBruiser",
              "count": 1
            }
          ]
        },
        {
          "name": "Trench Vaults",
          "description": "Navigate the vault chambers while water spouts churn the current.",
            "layout": {
              "tileSize": 64,
              "cols": 64,
              "rows": 12,
              "tiles": [
                "................................................................",
                "................................................................",
                "......4......p...............p4..............p....4.........2...",
                "..........###.............###..............###.............###..",
                "~~~~~~~~~~~~w~~~~~~~~~~~~~~~w~~~~~~~~~~~~~~~w~~~~~~~~~~~~~~~w~~~",
                "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
                "~~~~~~~####~~~~~####~~~~~~~~~~~~####~~~~~####~~~~~~~~~~~~####~~~",
                "~~~~~~~####~~~~~####~~~~~~~~~~~~####~~~~~####~~~~~~~~~~~~####~~~",
                "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
                "~~~~~~~###############~~~~~~~~~~~~###############~~~~~~~~~~~~~~~",
                "~~~~~~<###############~~~~~~~~~~~~###############>~~~~~~~~~~~~~~",
                "################################################################"
              ],
              "objects": [
                {
                  "type": "rainField",
                  "col": 32,
                  "row": 2,
                  "width": 4096,
                  "height": 800,
                  "offsetY": -240,
                  "density": 220,
                  "dropAlpha": 0.72,
                  "dropColor": "rgba(192, 224, 255, 0.45)",
                  "splashColor": "rgba(198, 236, 255, 0.6)",
                  "dropLength": 28,
                  "dropThickness": 1.2,
                  "splashRadius": 16,
                  "splashDuration": 0.26,
                  "speed": 860,
                  "wind": -30,
                  "mistAlpha": 0.05,
                  "mistColor": "rgba(110, 160, 210, 0.12)",
                  "layer": "foreground"
                }
              ]
            },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 3
            },
            {
              "kind": "tideWarden",
              "count": 1
            }
          ]
        }
      ]
    } },
  { file: "level_3_4.json", data: {
      "id": "stage12",
      "name": "Abyssal Crown",
      "description": "Face the leviathan circling the abyssal crown of the glyphworks.",
      "map": {
        "x": 0.7544,
        "y": 0.7544,
        "order": "XII",
        "boss": true,
        "branch": "world4",
        "branchStep": 4,
        "requiresAllComplete": true
      },
      "playable": true,
      "stageNumber": 16,
      "color": "#3a9bff",
      "bossStage": true,
      "requiresAllComplete": true,
      "layout": {
        "tileSize": 64,
        "cols": 72,
        "rows": 12,
        "tiles": [
          "........................................................................",
          "........................................................................",
          "..................p....................p....................p...........",
          "..................p....................p....................p...........",
          "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
          "~~~~~~~~~~~~~~~w~~~~~~~w~~~~~~~~~~~~~~~~~~~~w~~~~~~~w~~~~~~~~~~~~~~~~~~~",
          "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
          "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
          "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
          "~~~~~~~~~~~~~###~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~",
          "~~~~~~~~~~<#################~~~~~~~~~~~~~~~###################>~~~~~~~~~",
          "########################################################################"
        ],
        "objects": [
          {
            "type": "rainField",
            "col": 36,
            "row": 2,
            "width": 4608,
            "height": 880,
            "offsetY": -240,
            "density": 220,
            "dropAlpha": 0.72,
            "dropColor": "rgba(192, 224, 255, 0.45)",
            "splashColor": "rgba(198, 236, 255, 0.6)",
            "dropLength": 28,
            "dropThickness": 1.2,
            "splashRadius": 16,
            "splashDuration": 0.26,
            "speed": 860,
            "wind": -30,
            "mistAlpha": 0.05,
            "mistColor": "rgba(110, 160, 210, 0.12)",
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#021422",
        "skyBottom": "#010810",
        "ground": "#0f2232",
        "turf": "#3a9bff",
        "doorClosed": "#0b1c28",
        "doorOpen": "#6ac2ff",
        "accent": "#9ce6ff",
        "terrainStyle": "world4",
        "blockShade": "rgba(0,0,0,0.52)",
        "blockHighlight": "rgba(150,220,255,0.3)",
        "blockAccent": "#52b5ff"
      },
      "enemyNumbers": {
        "1": "anchorBruiser",
        "2": "tideWarden",
        "3": "ventArcanist",
        "4": "glyphSalmon",
        "5": "glyphGyre"
      },
      "waterScene": {
        "cellSize": 3,
        "color": "rgba(60, 140, 210, 0.94)",
        "shade": "rgba(6, 26, 46, 0.88)",
        "highlight": "rgba(170, 236, 255, 0.62)"
      },
      "screens": [
        {
          "name": "Leviathan's Lair",
          "description": "An illuminated abyss crowns the trench where the leviathan circles.",
          "layout": {
            "tileSize": 64,
            "cols": 72,
            "rows": 12,
            "tiles": [
              "........................................................................",
              "........................................................................",
              "............4.....p...........4........p........4...........p.....5.....",
              "..................p....................p....................p...........",
              "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
              "~~~~~~~~~~~~~~~w~~~~~~~w~~~~~~~~~~~~~~~~~~~~w~~~~~~~w~~~~~~~~~~~~~~~~~~~",
              "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
              "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
              "~~~~~~~#########################~~~~~~~#########################~~~~~~~~",
              "~~~~~~~~~~~~~###~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~~~~~~~~~~~~~###~~~",
              "~~~~~~~~~~<#################~~~~~~~~~~~~~~~###################>~~~~~~~~~",
              "########################################################################"
            ],
            "objects": [
              {
                "type": "rainField",
                "col": 36,
                "row": 2,
                "width": 4608,
                "height": 880,
                "offsetY": -240,
                "density": 220,
                "dropAlpha": 0.72,
                "dropColor": "rgba(192, 224, 255, 0.45)",
                "splashColor": "rgba(198, 236, 255, 0.6)",
                "dropLength": 28,
                "dropThickness": 1.2,
                "splashRadius": 16,
                "splashDuration": 0.26,
                "speed": 860,
                "wind": -30,
                "mistAlpha": 0.05,
                "mistColor": "rgba(110, 160, 210, 0.12)",
                "layer": "foreground"
              }
            ]
          },
          "enemies": [
            {
              "kind": "glyphSalmon",
              "count": 3
            },
            {
              "kind": "glyphGyre",
              "count": 1
            }
          ],
          "boss": {
            "name": "Tidal Leviathan",
            "kind": "glyphGyre",
            "hp": 160,
            "attack": 80,
            "defense": 32,
            "attackRange": 560,
            "behavior": "glyphGyre",
            "speedMult": 0.95,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_4_1.json", data: {
      "id": "stage13",
      "name": "Umbral Reliquary",
      "description": "Brave a pitch-black reliquary lit only by scattered braziers.",
      "map": {
        "x": 0.4364,
        "y": 0.5636,
        "order": "XIII",
        "branch": "world6",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 21,
      "color": "#ff8c42",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 10,
        "tiles": [
          "################################################################",
          "##########....############....############....############....##",
          "########........##########........##########........##########..",
          "######..........########............########..........########..",
          "#####....##....######....##....######....##....######....##...##",
          "###....##....##..............##..............##....##....##..###",
          "###....##....########mmmm########....########mmmm########....###",
          "###....##....########....########....########....########....###",
          "##<.................p..............p..............p..........>.#",
          "################################################################"
        ],
        "objects": [
          {
            "type": "fireflyJar",
            "col": 12,
            "row": 8,
            "offsetY": 0,
            "fireflyCount": 14
          },
          {
            "type": "fireflyJar",
            "col": 22,
            "row": 8,
            "offsetY": 0,
            "fireflyCount": 12
          },
          {
            "type": "fireflyJar",
            "col": 32,
            "row": 8,
            "offsetY": 0,
            "fireflyCount": 16
          },
          {
            "type": "fireflyJar",
            "col": 42,
            "row": 8,
            "offsetY": 0,
            "fireflyCount": 12
          },
          {
            "type": "fireflyJar",
            "col": 52,
            "row": 8,
            "offsetY": 0,
            "fireflyCount": 14
          }
        ]
      },
      "palette": {
        "skyTop": "#08040a",
        "skyBottom": "#020103",
        "ground": "#23141c",
        "turf": "#ff8c42",
        "doorClosed": "#301e2b",
        "doorOpen": "#ffb562",
        "accent": "#ff9f4a",
        "terrainStyle": "world6",
        "blockShade": "rgba(0,0,0,0.68)",
        "blockHighlight": "rgba(255,140,80,0.18)",
        "blockAccent": "#ffb562"
      },
      "darkness": {
        "opacity": 1,
        "color": "#000000"
      },
      "screens": [
        {
          "name": "Smoldering Approach",
          "description": "Skirmish between pools of light while boomlings stalk the dark.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....############....############....############....##",
              "########........##########........##########........##########..",
              "######..........########............########..........########..",
              "#####....##....######....##....######....##....######....##...##",
              "###....##....##...c..........##..............#c....##....##..###",
              "###....##....########mmmm########....########mmmm########....###",
              "###....##....########....########....########....########....###",
              "##<....1............p.....2........p....1.........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "boomling" } },
              "2": { "enemy": { "kind": "emberWisp", "offsetY": -72 } }
            }
          }
        },
        {
          "name": "Braziers Hall",
          "description": "Rogues and mages weave between the braziers' glow.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....############....############....############....##",
              "########........####m#####........##########m.......##########..",
              "######..........########............########..........########..",
              "#####....##....######....##....######....##....######....##...##",
              "###....##....##..............##.p............##....##....##..###",
              "###....##....########mmmm########....########mmmm########....###",
              "###....##....########....########....########....########....###",
              "##<..13.............p......2.......p.....1........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "rogue" } },
              "2": { "enemy": { "kind": "mage" } },
              "3": { "enemy": { "kind": "boomling" } }
            }
          }
        },
        {
          "name": "Shadow Crucible",
          "description": "Hold the chamber as the pyrelord rallies its ember guard.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....############....############....############....##",
              "########........##########........##########........##########..",
              "######..........########m...........####m###..........########..",
              "#####....##....######....##....######....##....######....##...##",
              "###....##....##..............##.m............##....##....##..###",
              "###....##....########mmmm########....########mmmm########....###",
              "###....##....########....########....########....########....###",
              "##<...1.............p.....2........p.....1........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "emberWisp", "offsetY": -72 } },
              "2": { "enemy": { "kind": "mage" } }
            }
          },
          "boss": {
            "name": "Umbral Pyrelord",
            "kind": "cinderKing",
            "hp": 210,
            "weapon": "bomb",
            "attack": 105,
            "defense": 42,
            "attackRange": 660,
            "blastRadius": 190,
            "speedMult": 0.82
          }
        }
      ]
    } },
  { file: "level_4_2.json", data: {
      "id": "stage14",
      "name": "Gloomfall Colonnade",
      "description": "Descend through a gloom-lit colonnade where molten veins cut the floor.",
      "map": {
        "x": 0.3728,
        "y": 0.6272,
        "order": "XIV",
        "branch": "world6",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 22,
      "color": "#ff7a45",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 10,
        "tiles": [
          "################################################################",
          "##########....############....############....############....##",
          "##########....############....############....############....##",
          "######..##....##########....##....##########....##....##########",
          "#####..............##..............##..............##........###",
          "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
          "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
          "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
          "##<...........p.............p.............p.............p....>.#",
          "################################################################"
        ]
      },
      "palette": {
        "skyTop": "#0b050a",
        "skyBottom": "#020103",
        "ground": "#27161e",
        "turf": "#ff7a45",
        "doorClosed": "#2c1a24",
        "doorOpen": "#ffb26b",
        "accent": "#ff9e58",
        "terrainStyle": "world6",
        "blockShade": "rgba(0,0,0,0.7)",
        "blockHighlight": "rgba(255,140,80,0.2)",
        "blockAccent": "#ffb26b"
      },
      "darkness": {
        "opacity": 1,
        "color": "#000000"
      },
      "screens": [
        {
          "name": "Lantern Descent",
          "description": "Boomlings stalk the lantern-lit pillars as you descend.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....############....############....############....##",
              "##########....############....############....############....##",
              "######..##....##########....##....##########....##....##########",
              "#####..............##..............##..............##........###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "##<....1............p.....2........p....1.........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "boomling" } },
              "2": { "enemy": { "kind": "emberWisp", "offsetY": -72 } }
            },
            "objects": [
              { "type": "glowCrystal", "col": 6, "row": 3, "anchorOffsetY": -6, "pulseAmount": 0.34, "sparkleChance": 0.42, "coreColor": "#ff9257", "lightColor": "rgba(255, 188, 120, 0.95)", "glowColor": "rgba(255, 148, 84, 0.82)" },
              { "type": "glowCrystal", "col": 7, "row": 3, "anchorOffsetY": -6, "pulseAmount": 0.26, "pulseSpeed": 1.6, "sparkleChance": 0.36, "coreColor": "#ff8a52", "lightColor": "rgba(255, 182, 118, 0.92)", "glowColor": "rgba(255, 140, 80, 0.82)" },
              { "type": "glowCrystal", "col": 30, "row": 3, "anchorOffsetY": -6, "pulseAmount": 0.3, "pulseSpeed": 1.2, "sparkleInterval": 1.4, "coreColor": "#ff9862", "lightColor": "rgba(255, 196, 134, 0.94)", "glowColor": "rgba(255, 152, 90, 0.82)" },
              { "type": "glowCrystal", "col": 33, "row": 3, "anchorOffsetY": -6, "pulseAmount": 0.28, "pulseSpeed": 1.45, "sparkleChance": 0.38, "coreColor": "#ff9159", "lightColor": "rgba(255, 190, 128, 0.93)", "glowColor": "rgba(255, 148, 84, 0.82)" }
            ]
          }
        },
        {
          "name": "Shrouded Gallery",
          "description": "Molten seams split the gallery while rogues dart between cover.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....############....############....############....##",
              "##########....##########..mm..##########..mm..##########..mm..##",
              "######..##....##########....##....##########....##....##########",
              "#####..............##..............##..............##........###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "###....mm....mm....##....mm....mm....##....mm....mm....##....###",
              "##<...1.............p.....2........p.....1........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "rogue" } },
              "2": { "enemy": { "kind": "mage" } }
            },
            "objects": [
              { "type": "glowCrystal", "col": 21, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.25, "pulseAmount": 0.3, "coreColor": "#ff8e58", "lightColor": "rgba(255, 186, 124, 0.94)", "glowColor": "rgba(255, 142, 84, 0.82)" },
              { "type": "glowCrystal", "col": 34, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.45, "pulseAmount": 0.32, "sparkleInterval": 1.3, "coreColor": "#ff9a63", "lightColor": "rgba(255, 198, 138, 0.94)", "glowColor": "rgba(255, 154, 92, 0.82)" },
              { "type": "glowCrystal", "col": 53, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.2, "pulseAmount": 0.28, "sparkleChance": 0.34, "coreColor": "#ff905a", "lightColor": "rgba(255, 188, 126, 0.93)", "glowColor": "rgba(255, 146, 86, 0.82)" },
              { "type": "glowCrystal", "col": 60, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.6, "pulseAmount": 0.35, "sparkleChance": 0.4, "coreColor": "#ffa26d", "lightColor": "rgba(255, 204, 146, 0.95)", "glowColor": "rgba(255, 160, 98, 0.82)" }
            ]
          }
        }
      ]
    } },
  { file: "level_4_3.json", data: {
      "id": "stage15",
      "name": "Obsidian Warrens",
      "description": "Thread the obsidian warrens where braziers barely hold back the dark.",
      "map": {
        "x": 0.3092,
        "y": 0.6908,
        "order": "XV",
        "branch": "world6",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 23,
      "color": "#ff6d52",
      "layout": {
        "tileSize": 64,
        "cols": 64,
        "rows": 10,
        "tiles": [
          "################################################################",
          "##########....##########....##########....##########....######..",
          "########........########........########........########........",
          "#####..##....########..##....########..##....########..##....###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
          "##<...........p.............p.............p.............p....>.#",
          "################################################################"
        ],
        "objects": [
          {
            "type": "skillPedestal",
            "id": "world6_shrine_double",
            "col": 32,
            "row": 5,
            "offsetY": -4,
            "width": 96,
            "height": 144,
            "abilityId": "doubleJump",
            "pedestalColor": "#3c2734",
            "bookColor": "#f2d4ff",
            "shrineGlowColor": "#c6a2ff",
            "promptColor": "#d4b2ff"
          }
        ]
      },
      "palette": {
        "skyTop": "#09040c",
        "skyBottom": "#020104",
        "ground": "#1f121a",
        "turf": "#ff6d52",
        "doorClosed": "#24161f",
        "doorOpen": "#ffa080",
        "accent": "#ff8d66",
        "terrainStyle": "world6",
        "blockShade": "rgba(0,0,0,0.74)",
        "blockHighlight": "rgba(255,130,90,0.22)",
        "blockAccent": "#ffaf90"
      },
      "darkness": {
        "opacity": 1,
        "color": "#000000"
      },
      "screens": [
        {
          "name": "Flicker Approach",
          "description": "Braziers flare as ember wisps and mages strike from the shadows.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....##########....##########....##########....######..",
              "########........########........########........########........",
              "#####..##....########..##....########..##....########..##....###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "##<...1.............p.....2........p.....1........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "emberWisp", "offsetY": -72 } },
              "2": { "enemy": { "kind": "mage" } }
            },
            "objects": [
              { "type": "glowCrystal", "col": 9, "row": 3, "anchorOffsetY": -6, "pulseSpeed": 1.5, "pulseAmount": 0.36, "sparkleChance": 0.44, "coreColor": "#ff7a56", "lightColor": "rgba(255, 176, 120, 0.94)", "glowColor": "rgba(255, 128, 86, 0.82)" },
              { "type": "glowCrystal", "col": 12, "row": 3, "anchorOffsetY": -6, "pulseSpeed": 1.35, "pulseAmount": 0.3, "sparkleInterval": 1.2, "coreColor": "#ff865f", "lightColor": "rgba(255, 186, 132, 0.94)", "glowColor": "rgba(255, 140, 96, 0.82)" },
              { "type": "glowCrystal", "col": 41, "row": 3, "anchorOffsetY": -6, "pulseSpeed": 1.25, "pulseAmount": 0.32, "sparkleChance": 0.36, "coreColor": "#ff8060", "lightColor": "rgba(255, 182, 130, 0.94)", "glowColor": "rgba(255, 134, 96, 0.82)" },
              { "type": "glowCrystal", "col": 44, "row": 3, "anchorOffsetY": -6, "pulseSpeed": 1.6, "pulseAmount": 0.34, "sparkleChance": 0.4, "coreColor": "#ff8c68", "lightColor": "rgba(255, 194, 140, 0.95)", "glowColor": "rgba(255, 146, 104, 0.82)" }
            ]
          }
        },
        {
          "name": "Obsidian Antechamber",
          "description": "Rogues weave through collapsed pillars while boomlings guard the exits.",
          "layout": {
            "tileSize": 64,
            "cols": 64,
            "rows": 10,
            "tiles": [
              "################################################################",
              "##########....##########....##########....##########....######..",
              "########........########....mm......########....mm......######..",
              "#####..##....########..##....########..##....########..##....###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..###",
              "##<..1..............p.....2........p.....1........p..........>.#",
              "################################################################"
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "rogue" } },
              "2": { "enemy": { "kind": "boomling" } }
            },
            "objects": [
              { "type": "glowCrystal", "col": 21, "row": 3, "anchorOffsetY": -6, "pulseAmount": 0.34, "sparkleChance": 0.38, "coreColor": "#ff7858", "lightColor": "rgba(255, 178, 126, 0.94)", "glowColor": "rgba(255, 130, 90, 0.82)" },
              { "type": "glowCrystal", "col": 22, "row": 3, "anchorOffsetY": -6, "pulseSpeed": 1.4, "pulseAmount": 0.3, "sparkleChance": 0.36, "coreColor": "#ff835f", "lightColor": "rgba(255, 186, 134, 0.94)", "glowColor": "rgba(255, 140, 98, 0.82)" },
              { "type": "glowCrystal", "col": 39, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.3, "pulseAmount": 0.28, "sparkleChance": 0.32, "coreColor": "#ff7f63", "lightColor": "rgba(255, 182, 136, 0.93)", "glowColor": "rgba(255, 134, 100, 0.82)" },
              { "type": "glowCrystal", "col": 48, "row": 4, "anchorOffsetY": -4, "pulseSpeed": 1.55, "pulseAmount": 0.33, "sparkleInterval": 1.25, "coreColor": "#ff8b6c", "lightColor": "rgba(255, 194, 148, 0.95)", "glowColor": "rgba(255, 148, 110, 0.82)" }
            ]
          }
        }
      ]
    } },
  { file: "level_4_4.json", data: {
      "id": "stage16",
      "name": "Midnight Throne",
      "description": "Challenge the dusk regent who reigns above the midnight throne.",
      "map": {
        "x": 0.2456,
        "y": 0.7544,
        "order": "XVI",
        "boss": true,
        "branch": "world6",
        "branchStep": 4,
        "requiresAllComplete": true
      },
      "playable": true,
      "stageNumber": 24,
      "color": "#ff5f70",
      "bossStage": true,
      "requiresAllComplete": true,
      "layout": {
        "tileSize": 64,
        "cols": 72,
        "rows": 12,
        "tiles": [
          "........................................................................",
          "..................p....................p....................p...........",
          "..................p....................p....................p...........",
          "########################################################################",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
          "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
          "~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~",
          "~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~",
          "~~~~~~~~~~<###########~~~~~~~~~~~~~~~###########~~~~~~~~~~~~~~~>~~~~~~~~",
          "########################################################################"
        ]
      },
      "palette": {
        "skyTop": "#050308",
        "skyBottom": "#010105",
        "ground": "#1a0d18",
        "turf": "#ff5f70",
        "doorClosed": "#1f111a",
        "doorOpen": "#ff92b3",
        "accent": "#ffd7a6",
        "terrainStyle": "world6",
        "blockShade": "rgba(0,0,0,0.78)",
        "blockHighlight": "rgba(255,110,150,0.26)",
        "blockAccent": "#ff9fbf"
      },
      "darkness": {
        "opacity": 0.94,
        "color": "rgba(4,3,8,0.94)"
      },
      "screens": [
        {
          "name": "Dusk Regent's Court",
          "description": "The dusk regent commands neon wardens amid the throne's glow.",
          "layout": {
            "tileSize": 64,
            "cols": 72,
            "rows": 12,
            "tiles": [
              "........................................................................",
              "......1...........p.......2............p.......1............p...........",
              "..................p....................p....................p...........",
              "########################################################################",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
              "###..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..mm..##..mm..###",
              "~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~",
              "~~~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~~~###~~~~~~~~~~",
              "~~~~~~~~~~<###########~~~~~~~~~~~~~~~###########~~~~~~~~~~~~~~~>~~~~~~~~",
              "########################################################################"
            ],
            "objects": [
              { "type": "glowCrystal", "col": 15, "row": 4, "anchorOffsetY": -6, "pulseSpeed": 1.5, "pulseAmount": 0.38, "sparkleChance": 0.48, "coreColor": "#ff6c9a", "lightColor": "rgba(255, 174, 200, 0.95)", "glowColor": "rgba(255, 132, 184, 0.82)" },
              { "type": "glowCrystal", "col": 24, "row": 4, "anchorOffsetY": -6, "pulseSpeed": 1.35, "pulseAmount": 0.34, "sparkleInterval": 1.2, "coreColor": "#ff74a4", "lightColor": "rgba(255, 184, 210, 0.95)", "glowColor": "rgba(255, 142, 196, 0.82)" },
              { "type": "glowCrystal", "col": 51, "row": 4, "anchorOffsetY": -6, "pulseSpeed": 1.28, "pulseAmount": 0.32, "sparkleChance": 0.42, "coreColor": "#ff6f97", "lightColor": "rgba(255, 178, 198, 0.94)", "glowColor": "rgba(255, 136, 186, 0.82)" },
              { "type": "glowCrystal", "col": 60, "row": 4, "anchorOffsetY": -6, "pulseSpeed": 1.6, "pulseAmount": 0.36, "sparkleChance": 0.5, "coreColor": "#ff7aad", "lightColor": "rgba(255, 190, 214, 0.95)", "glowColor": "rgba(255, 150, 206, 0.82)" }
            ],
            "symbolLegend": {
              "1": { "enemy": { "kind": "emberWisp", "offsetY": -72 } },
              "2": { "enemy": { "kind": "neonWarden" } }
            }
          },
          "boss": {
            "name": "Dusk Regent",
            "kind": "neonWarden",
            "hp": 240,
            "attack": 120,
            "defense": 48,
            "attackRange": 420,
            "behavior": "neonOverlord",
            "renderStyle": "neon",
            "bodyColor": "#05080f",
            "accentColor": "#66faff",
            "speedMult": 1.08,
            "isBoss": true
          }
        }
      ]
    } },
  { file: "level_5_1.json", data: {
      "id": "betweenTimeHall",
      "name": "Space Between Time",
      "description": "A silent corridor stretched between ages, anchored by a lone pyramid of timeless stone.",
      "map": {
        "x": 0.3728,
        "y": 0.3728,
        "order": "XVII",
        "branch": "world8",
        "branchStep": 1,
        "requiresAllComplete": true
      },
      "playable": true,
      "stageNumber": 29,
      "requiresAllComplete": true,
      "color": "#7c6df2",
      "layout": {
        "tileSize": 64,
        "cols": 96,
        "rows": 12,
        "tiles": [
          "################################################################################################",
          "##............................................................................................##",
          "##..............................................#.............................................##",
          "##............................................##2##...........................................##",
          "##..........................................#########.........................................##",
          "##........................................#############.......................................##",
          "##..............................1.......#################.......1.............................##",
          "##....................................#####################...................................##",
          "##.................................###########################................................##",
          "##..............................#################################.............................##",
          "##<.........................#########################################........................>##",
          "################################################################################################"
        ],
        "symbolLegend": {
          "1": {
            "enemy": {
              "kind": "glyphGyre",
              "offsetY": -90
            }
          },
          "2": {
            "terrain": true,
            "enemy": {
              "kind": "glyphGyre",
              "offsetY": -120
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 48,
            "row": 2,
            "width": 6144,
            "height": 768,
            "offsetY": 576,
            "starCount": 180,
            "parallax": 1.06,
            "parallaxY": 1.02,
            "color": "#7d70d6",
            "colors": [
              "#9d8dff",
              "#b3a8ff",
              "#625ba8"
            ],
            "twinkleAmount": 0.36,
            "twinkleSpeed": 0.42,
            "seed": 3183
          },
          {
            "type": "starField",
            "col": 48,
            "row": 3,
            "width": 6144,
            "height": 400,
            "offsetY": -120,
            "starCount": 110,
            "parallax": 1.18,
            "parallaxY": 1.08,
            "color": "#dcd6ff",
            "colors": [
              "#f2ecff",
              "#bdb5ff"
            ],
            "twinkleAmount": 0.5,
            "twinkleSpeed": 0.88,
            "seed": 5129,
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#04030e",
        "skyBottom": "#120927",
        "ground": "#1c1233",
        "turf": "#1c1233",
        "doorClosed": "#2d2152",
        "doorOpen": "#b8a8ff",
        "accent": "#7c6df2",
        "terrainStyle": "world8",
        "blockShade": "rgba(0,0,0,0.82)",
        "blockHighlight": "rgba(210,190,255,0.14)",
        "blockAccent": "#5b4cc7"
      },
      "screens": [
        {
          "name": "The Space Between Time",
          "description": "Drift through the endless hallway as glyph-born specters orbit the central pyramid.",
          "layout": {
            "tileSize": 64,
            "cols": 96,
            "rows": 12,
            "tiles": [
            "################################################################################################",
            "##............................................................................................##",
            "##..............................................#.............................................##",
            "##............................................##2##...........................................##",
            "##..........................................#########.........................................##",
            "##........................................#############.......................................##",
            "##..............................1.......#################.......1.............................##",
            "##....................................#####################...................................##",
            "##.................................###########################................................##",
            "##..............................#################################.............................##",
            "##<.........................#########################################........................>##",
            "################################################################################################"
          ],
          "symbolLegend": {
            "1": {
              "enemy": {
                "kind": "glyphGyre",
                "offsetY": -90
              }
            },
            "2": {
              "terrain": true,
              "enemy": {
                "kind": "glyphGyre",
                "offsetY": -120
              }
            }
          },
          "objects": [
            {
              "type": "starField",
                "col": 48,
                "row": 2,
                "width": 6144,
                "height": 768,
                "offsetY": 576,
                "starCount": 180,
                "parallax": 1.06,
                "parallaxY": 1.02,
                "color": "#7d70d6",
                "colors": [
                  "#9d8dff",
                  "#b3a8ff",
                  "#625ba8"
                ],
                "twinkleAmount": 0.36,
                "twinkleSpeed": 0.42,
                "seed": 3183
              },
              {
                "type": "starField",
                "col": 48,
                "row": 3,
                "width": 6144,
                "height": 400,
                "offsetY": -120,
                "starCount": 110,
                "parallax": 1.18,
                "parallaxY": 1.08,
                "color": "#dcd6ff",
                "colors": [
                  "#f2ecff",
                  "#bdb5ff"
                ],
                "twinkleAmount": 0.5,
                "twinkleSpeed": 0.88,
                "seed": 5129,
                "layer": "foreground"
              }
            ]
          },
        }
      ]
    } },
  { file: "level_5_2.json", data: {
      "id": "voidSpiralApproach",
      "name": "Spiral of the Lost Stars",
      "description": "Weave along fractured causeways as the void yawns beneath circling constellations.",
      "map": {
        "x": 0.3092,
        "y": 0.3092,
        "order": "XVIII",
        "branch": "world8",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 30,
      "color": "#6955f5",
      "layout": {
        "tileSize": 64,
        "cols": 96,
        "rows": 12,
        "tiles": [
          "################################################################################################",
          "##............................................................................................##",
          "##....................######................##########................######..................##",
          "##.................##########............#######2######............##########.................##",
          "##..............###############........##################........###############..............##",
          "##...........###################1#....######################....1####################.........##",
          "##.........#########################.#########################.#########################......##",
          "##....##########################............########............##########################....##",
          "##....#####################..............##############..............#####################....##",
          "##<....######################............##############............######################....>##",
          "##............................................................................................##",
          "################################################################################################"
        ],
        "symbolLegend": {
          "1": {
            "terrain": true,
            "enemy": {
              "kind": "glyphGyre",
              "offsetY": -80
            }
          },
          "2": {
            "terrain": true,
            "enemy": {
              "kind": "glyphGyre",
              "offsetY": -110
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 48,
            "row": 2,
            "width": 6144,
            "height": 768,
            "offsetY": 576,
            "starCount": 220,
            "parallax": 1.04,
            "parallaxY": 1.01,
            "color": "#5b47c9",
            "colors": [
              "#8a7aff",
              "#433a8c",
              "#2d275b"
            ],
            "twinkleAmount": 0.32,
            "twinkleSpeed": 0.38,
            "seed": 6123
          },
          {
            "type": "starField",
            "col": 48,
            "row": 3,
            "width": 6144,
            "height": 420,
            "offsetY": -120,
            "starCount": 140,
            "parallax": 1.12,
            "parallaxY": 1.05,
            "color": "#c5baff",
            "colors": [
              "#f7f4ff",
              "#a8a0ff"
            ],
            "twinkleAmount": 0.46,
            "twinkleSpeed": 0.82,
            "seed": 1749,
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#050314",
        "skyBottom": "#0e0631",
        "ground": "#140e29",
        "turf": "#140e29",
        "doorClosed": "#241852",
        "doorOpen": "#bdb1ff",
        "accent": "#6955f5",
        "terrainStyle": "world8",
        "blockShade": "rgba(0,0,0,0.84)",
        "blockHighlight": "rgba(165,150,255,0.2)",
        "blockAccent": "#4b3fa7"
      },
      "screens": [
        {
          "name": "Spiral Causeway",
          "description": "A corkscrew of stone drifts through starlit nothingness guarded by glyph sentries.",
          "layout": {
            "tileSize": 64,
            "cols": 96,
            "rows": 12,
            "tiles": [
            "################################################################################################",
            "##............................................................................................##",
            "##....................######................##########................######..................##",
            "##.................##########............#######2######............##########.................##",
            "##..............###############........##################........###############..............##",
            "##...........###################1#....######################....1####################.........##",
            "##.........#########################.#########################.#########################......##",
            "##....##########################............########............##########################....##",
            "##....#####################..............##############..............#####################....##",
            "##<....######################............##############............######################....>##",
            "##............................................................................................##",
            "################################################################################################"
          ],
          "symbolLegend": {
            "1": {
              "terrain": true,
              "enemy": {
                "kind": "glyphGyre",
                "offsetY": -80
              }
            },
            "2": {
              "terrain": true,
              "enemy": {
                "kind": "glyphGyre",
                "offsetY": -110
              }
            }
          },
          "objects": [
            {
              "type": "starField",
                "col": 48,
                "row": 2,
                "width": 6144,
                "height": 768,
                "offsetY": 576,
                "starCount": 220,
                "parallax": 1.04,
                "parallaxY": 1.01,
                "color": "#5b47c9",
                "colors": [
                  "#8a7aff",
                  "#433a8c",
                  "#2d275b"
                ],
                "twinkleAmount": 0.32,
                "twinkleSpeed": 0.38,
                "seed": 6123
              },
              {
                "type": "starField",
                "col": 48,
                "row": 3,
                "width": 6144,
                "height": 420,
                "offsetY": -120,
                "starCount": 140,
                "parallax": 1.12,
                "parallaxY": 1.05,
                "color": "#c5baff",
                "colors": [
                  "#f7f4ff",
                  "#a8a0ff"
                ],
                "twinkleAmount": 0.46,
                "twinkleSpeed": 0.82,
                "seed": 1749,
                "layer": "foreground"
              }
            ]
          },
        }
      ]
    } },
  { file: "level_5_3.json", data: {
      "id": "voidRiftGalleries",
      "name": "Liminal Guile",
      "description": "Navigate mirrored galleries that bend inward toward an imploding gyre of starlight.",
      "map": {
        "x": 0.2456,
        "y": 0.2456,
        "order": "XIX",
        "branch": "world8",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 31,
      "color": "#5a4ae4",
      "layout": {
        "tileSize": 64,
        "cols": 96,
        "rows": 12,
        "tiles": [
          "################################################################################################",
          "##......##############........##############........##############........##############......##",
          "##....########################....############################....########################....##",
          "##...#######################1##..##############################..###1######################...##",
          "##..#########################.....############################.....#########################..##",
          "##.##########################....###############3############....##########################...##",
          "##..####################............####2###############2###............####################..##",
          "##..####################............########################............####################..##",
          "##....############............############............############............############....##",
          "##<...####################............####################............####################...>##",
          "##............................................................................................##",
          "################################################################################################"
        ],
        "symbolLegend": {
          "1": {
            "terrain": true,
            "enemy": {
              "kind": "glyphGyre",
              "offsetY": -90
            }
          },
          "2": {
            "terrain": true,
            "enemy": {
              "kind": "mage"
            }
          },
          "3": {
            "terrain": true,
            "enemy": {
              "kind": "testVoidCaller",
              "name": "Eventide Chronarch",
              "weapon": "testVoidSiphon",
              "hp": 320,
              "attack": 160,
              "defense": 64,
              "attackRange": 720,
              "behavior": "artillery",
              "speedMult": 0.82,
              "blastRadius": 200,
              "pullRadius": 260,
              "pullStrength": 1600,
              "offsetY": -80
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 48,
            "row": 2,
            "width": 6144,
            "height": 768,
            "offsetY": 576,
            "starCount": 260,
            "parallax": 1.02,
            "parallaxY": 1.0,
            "color": "#4636ad",
            "colors": [
              "#725cff",
              "#2e2769",
              "#120d2d"
            ],
            "twinkleAmount": 0.28,
            "twinkleSpeed": 0.34,
            "seed": 3981
          },
          {
            "type": "starField",
            "col": 48,
            "row": 3,
            "width": 6144,
            "height": 768,
            "offsetY": 512,
            "starCount": 170,
            "parallax": 1.1,
            "parallaxY": 1.06,
            "color": "#bfb2ff",
            "colors": [
              "#f5f2ff",
              "#9f94ff"
            ],
            "twinkleAmount": 0.5,
            "twinkleSpeed": 0.78,
            "seed": 2074
          },
          {
            "type": "starField",
            "col": 48,
            "row": 4,
            "width": 6144,
            "height": 380,
            "offsetY": -60,
            "starCount": 90,
            "parallax": 1.18,
            "parallaxY": 1.12,
            "color": "#f8f5ff",
            "colors": [
              "#ffffff",
              "#d9d0ff"
            ],
            "twinkleAmount": 0.62,
            "twinkleSpeed": 1.02,
            "seed": 5091,
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#040111",
        "skyBottom": "#120531",
        "ground": "#161035",
        "turf": "#161035",
        "doorClosed": "#241657",
        "doorOpen": "#c9c0ff",
        "accent": "#5a4ae4",
        "terrainStyle": "world8",
        "blockShade": "rgba(0,0,0,0.86)",
        "blockHighlight": "rgba(150,140,255,0.18)",
        "blockAccent": "#4333b6"
      },
      "screens": [
        {
          "name": "Gyre Galleries",
          "description": "Twin halls curve toward the rift core while void sigils circle overhead.",
          "layout": {
            "tileSize": 64,
            "cols": 96,
            "rows": 12,
          "tiles": [
            "################################################################################################",
            "##......##############........##############........##############........##############......##",
            "##....########################....############################....########################....##",
            "##...#######################1##..##############################..###1######################...##",
            "##..#########################.....############################.....#########################..##",
            "##.##########################....###############3############....##########################...##",
            "##..####################............####2###############2###............####################..##",
            "##..####################............########################............####################..##",
            "##....############............############............############............############....##",
            "##<...####################............####################............####################...>##",
            "##............................................................................................##",
            "################################################################################################"
          ],
          "symbolLegend": {
            "1": {
              "terrain": true,
              "enemy": {
                "kind": "glyphGyre",
                "offsetY": -90
              }
            },
            "2": {
              "terrain": true,
              "enemy": {
                "kind": "mage"
              }
            },
            "3": {
              "terrain": true,
              "enemy": {
                "kind": "testVoidCaller",
                "name": "Eventide Chronarch",
                "weapon": "testVoidSiphon",
                "hp": 320,
                "attack": 160,
                "defense": 64,
                "attackRange": 720,
                "behavior": "artillery",
                "speedMult": 0.82,
                "blastRadius": 200,
                "pullRadius": 260,
                "pullStrength": 1600,
                "offsetY": -80
              }
            }
          },
          "objects": [
            {
              "type": "starField",
                "col": 48,
                "row": 2,
                "width": 6144,
                "height": 768,
                "offsetY": 576,
                "starCount": 260,
                "parallax": 1.02,
                "parallaxY": 1.0,
                "color": "#4636ad",
                "colors": [
                  "#725cff",
                  "#2e2769",
                  "#120d2d"
                ],
                "twinkleAmount": 0.28,
                "twinkleSpeed": 0.34,
                "seed": 3981
              },
              {
                "type": "starField",
                "col": 48,
                "row": 3,
                "width": 6144,
                "height": 768,
                "offsetY": 512,
                "starCount": 170,
                "parallax": 1.1,
                "parallaxY": 1.06,
                "color": "#bfb2ff",
                "colors": [
                  "#f5f2ff",
                  "#9f94ff"
                ],
                "twinkleAmount": 0.5,
                "twinkleSpeed": 0.78,
                "seed": 2074
              },
              {
                "type": "starField",
                "col": 48,
                "row": 4,
                "width": 6144,
                "height": 380,
                "offsetY": -60,
                "starCount": 90,
                "parallax": 1.18,
                "parallaxY": 1.12,
                "color": "#f8f5ff",
                "colors": [
                  "#ffffff",
                  "#d9d0ff"
                ],
                "twinkleAmount": 0.62,
                "twinkleSpeed": 1.02,
                "seed": 5091,
                "layer": "foreground"
              }
            ]
          },
        }
      ]
    } },
  { file: "level_5_4.json", data: {
      "id": "voidParallaxSanctum",
      "name": "Parallax Model",
      "description": "Descend into the heart of the void where concentric terraces collapse toward a singular maw.",
      "map": {
        "x": 0.1818,
        "y": 0.1818,
        "order": "XX",
        "label": "8-4",
        "branch": "world8",
        "branchStep": 4
      },
      "playable": true,
      "bossStage": true,
      "stageNumber": 32,
      "color": "#7a63ff",
      "layout": {
        "tileSize": 64,
        "cols": 96,
        "rows": 11,
        "tiles": [
          "################################################################################################",
          "##..........############..............####################..............############..........##",
          "##.......####################.......########################.......####################.......##",
          "##....######################......############################......######################....##",
          "##...######################......##############################......######################...##",
          "##..######################........############################........######################..##",
          "##...######################......##############################......######################...##",
          "##....######################......############################......######################....##",
          "##.......####################.......########################.......####################.......##",
          "##<.........############..............####################..............############.........>##",
          "################################################################################################"
        ],
        "objects": [
          {
            "type": "starField",
            "col": 48,
            "row": 2,
            "width": 6144,
            "height": 704,
            "offsetY": 512,
            "starCount": 280,
            "parallax": 1.06,
            "parallaxY": 1.02,
            "color": "#4d3cbf",
            "colors": [
              "#7f68ff",
              "#2b225f",
              "#110b2b"
            ],
            "twinkleAmount": 0.34,
            "twinkleSpeed": 0.4,
            "seed": 7259
          },
          {
            "type": "starField",
            "col": 48,
            "row": 3,
            "width": 6144,
            "height": 704,
            "offsetY": 448,
            "starCount": 180,
            "parallax": 1.14,
            "parallaxY": 1.08,
            "color": "#c9beff",
            "colors": [
              "#f6f3ff",
              "#a89cff"
            ],
            "twinkleAmount": 0.56,
            "twinkleSpeed": 0.86,
            "seed": 913
          },
          {
            "type": "starField",
            "col": 48,
            "row": 4,
            "width": 6144,
            "height": 360,
            "offsetY": -40,
            "starCount": 120,
            "parallax": 1.22,
            "parallaxY": 1.16,
            "color": "#fefbff",
            "colors": [
              "#ffffff",
              "#e1d8ff"
            ],
            "twinkleAmount": 0.68,
            "twinkleSpeed": 1.08,
            "seed": 2314,
            "layer": "foreground"
          }
        ]
      },
      "palette": {
        "skyTop": "#02000b",
        "skyBottom": "#120527",
        "ground": "#170c30",
        "turf": "#170c30",
        "doorClosed": "#271856",
        "doorOpen": "#d0c6ff",
        "accent": "#7a63ff",
        "terrainStyle": "world8",
        "blockShade": "rgba(0,0,0,0.88)",
        "blockHighlight": "rgba(160,140,255,0.24)",
        "blockAccent": "#4f3fa4"
      },
      "screens": [
        {
          "name": "Parallax Maw",
          "description": "The void's heart folds space into rings where the chronarch awaits.",
          "layout": {
            "tileSize": 64,
            "cols": 96,
            "rows": 11,
            "tiles": [
              "################################################################################################",
              "##..........############..............####################..............############..........##",
              "##.......####################.......########################.......####################.......##",
              "##....######################......############################......######################....##",
              "##...######################......##############################......######################...##",
              "##..######################........############################........######################..##",
              "##...######################......##############################......######################...##",
              "##....######################......############################......######################....##",
              "##.......####################.......########################.......####################.......##",
              "##<.........############..............####################..............############.........>##",
              "################################################################################################"
            ],
            "objects": [
              {
                "type": "starField",
                "col": 48,
                "row": 2,
                "width": 6144,
                "height": 704,
                "offsetY": 512,
                "starCount": 280,
                "parallax": 1.06,
                "parallaxY": 1.02,
                "color": "#4d3cbf",
                "colors": [
                  "#7f68ff",
                  "#2b225f",
                  "#110b2b"
                ],
                "twinkleAmount": 0.34,
                "twinkleSpeed": 0.4,
                "seed": 7259
              },
              {
                "type": "starField",
                "col": 48,
                "row": 3,
                "width": 6144,
                "height": 704,
                "offsetY": 448,
                "starCount": 180,
                "parallax": 1.14,
                "parallaxY": 1.08,
                "color": "#c9beff",
                "colors": [
                  "#f6f3ff",
                  "#a89cff"
                ],
                "twinkleAmount": 0.56,
                "twinkleSpeed": 0.86,
                "seed": 913
              },
              {
                "type": "starField",
                "col": 48,
                "row": 4,
                "width": 6144,
                "height": 360,
                "offsetY": -40,
                "starCount": 120,
                "parallax": 1.22,
                "parallaxY": 1.16,
                "color": "#fefbff",
                "colors": [
                  "#ffffff",
                  "#e1d8ff"
                ],
                "twinkleAmount": 0.68,
                "twinkleSpeed": 1.08,
                "seed": 2314,
                "layer": "foreground"
              }
            ]
          },
          "enemies": [],
          "boss": {
            "name": "Void Glyph Colossus",
            "kind": "voidGlyphColossus",
            "weapon": "voidHalo",
            "hp": 420,
            "attack": 68,
            "defense": 44,
            "behavior": "voidGlyphOverlord",
            "sizeScale": 2.6,
            "attackRange": 720,
            "preferredRange": 480,
            "voidGlyphHead": true,
            "voidHaloRadius": 72,
            "voidHaloHeightOffset": -6,
            "voidHaloMaxOrbs": 5,
            "voidHaloSpinSpeed": 1.1,
            "voidHaloRegenDelay": 4.2,
            "voidHaloVolleyInterval": 0.55,
            "voidHaloChargeTime": 1.2,
            "voidHaloAttackDowntime": 4.8,
            "voidHaloChargeDecay": 1.8,
            "voidHaloOrbRadius": 18,
            "speedMult": 0.68,
            "isBoss": true,
            "bodyColor": "#1b1026",
            "accentColor": "#a48cff"
          }
        }
      ]
    } },
  { file: "level_5_5.json", data: {
      "id": "world5Stage5",
      "name": "Mirage Apex Dojo",
      "description": "Descend beneath the dunes to duel the mirage master whose scarf trails through unseen wind.",
      "map": {
        "x": 0.5,
        "y": 0.98,
        "order": "◎",
        "branch": "world5",
        "branchStep": 5,
        "boss": true
      },
      "playable": true,
      "bossStage": true,
      "stageNumber": 21,
      "color": "#b65aa8",
      "layout": {
        "tileSize": 64,
        "cols": 56,
        "rows": 22,
        "tiles": [
          "..........................#..#..........................",
          ".........................#....#.........................",
          "........................#......#........................",
          ".......................#........#.......................",
          "......................#..........#......................",
          ".....................#............#.....................",
          "....................#..............#....................",
          "...................#................#...................",
          "..................#..................#..................",
          ".................#....................#.................",
          "................#......................#................",
          "..............L#........................#L..............",
          "..............#..........................#..............",
          ".............#....L..................L....#.............",
          "............#.......G..............G.......#............",
          "...........#................................#...........",
          "..........#...a....a....a....a....a....a.....#..........",
          "########========================================########",
          "##########====================================##########",
          "##########==<==============================>==##########",
          "##########====================================##########",
          "########################################################"
        ]
      },
      "palette": {
        "skyTop": "#06040d",
        "skyBottom": "#130a21",
        "ground": "#21162c",
        "turf": "#5f2b63",
        "doorClosed": "#291d37",
        "doorOpen": "#f2d47a",
        "accent": "#d07bce",
        "terrainStyle": "world5",
        "blockShade": "rgba(18,0,40,0.48)",
        "blockHighlight": "rgba(232,184,244,0.18)",
        "blockAccent": "#a867c7"
      },
      "screens": [
        {
          "name": "Mirage Apex",
          "description": "An immense pyramid chamber where a hidden assassin conjures mirage doubles amid whispering sand.",
          "layout": {
            "tileSize": 64,
            "cols": 56,
            "rows": 22,
            "tiles": [
              "..........................#..#..........................",
              ".........................#....#.........................",
              "........................#......#........................",
              ".......................#........#.......................",
              "......................#..........#......................",
              ".....................#............#.....................",
              "....................#..............#....................",
              "...................#................#...................",
              "..................#..................#..................",
              ".................#....................#.................",
              "................#......................#................",
              "..............L#........................#L..............",
              "..............#..........................#..............",
              ".............#....L..................L....#.............",
              "............#.......G..............G.......#............",
              "...........#................................#...........",
              "..........#...a....a....a....a....a....a.....#..........",
              "########========================================########",
              "##########====================================##########",
              "##########==<==============================>==##########",
              "##########====================================##########",
              "########################################################"
            ]
          },
          "enemies": [],
          "boss": {
            "name": "Akari the Mirage Blade",
            "kind": "mirageAssassin",
            "weapon": "mirageEdge",
            "hp": 560,
            "attack": 118,
            "defense": 66,
            "attackRange": 640,
            "preferredRange": 320,
            "behavior": "mirageAssassin",
            "renderStyle": "pixelated",
            "renderPixelSize": 3,
            "bodyColor": "#1c1e2f",
            "accentColor": "#ff6e93",
            "element": "void",
            "speedMult": 1.18,
            "scarfColor": "#ff3f6d",
            "scarfTrailColor": "#f27aa2",
            "scarfPixelSize": 3,
            "scarfSegments": 16,
            "scarfWaveAmplitude": 7,
            "scarfWaveFrequency": 3,
            "scarfWaveLift": 2.8,
            "scarfWaveLiftFrequency": 1.7,
            "scarfSegmentSpacing": 6.8,
            "scarfDropPerSegment": 0.9,
            "scarfFadeTail": 0.72,
            "scarfAnchorOffsetX": -10,
            "scarfAnchorOffsetY": -6,
            "scarfAnchorBackOffset": 12,
            "scarfWaveTaper": 0.58,
            "scarfSpacingDecay": 0.32,
            "scarfLiftTaper": 0.52,
            "scarfDropTaper": 0.6,
            "slashLength": 520,
            "slashWidth": 32,
            "slashDamage": 90,
            "slashDuration": 220,
            "slashCooldown": 2.4,
            "slashWindup": 0.46,
            "slashRecover": 0.98,
            "slashStickMargin": 15,
            "slashCoreColor": "#fef7ff",
            "slashEdgeColor": "rgba(196, 140, 255, 0.55)",
            "slashGlowColor": "rgba(32, 12, 54, 0.35)",
            "cloneCount": 2,
            "cloneMaxCount": 3,
            "cloneCooldown": 9.2,
            "cloneCooldownJitter": 1.3,
            "cloneSpawnRadius": 220,
            "cloneLifetime": 12,
            "cloneAttackMultiplier": 0.64,
            "cloneDamageMultiplier": 0.58,
            "cloneSlashLength": 360,
            "cloneSlashWidth": 24,
            "cloneSlashDuration": 200,
            "cloneSlashCooldown": 2.6,
            "cloneSlashWindup": 0.36,
            "cloneSlashRecover": 0.64,
            "cloneSlashStickMargin": 12,
            "description": "A mirage ninja whose endless scarf rides unseen gusts, carving straight-line shockwaves and weaving short-lived clones."
          }
        }
      ]
    } },
  { file: "level_monochrome_tree.json", data: {
      "id": "worldTreeReliquary",
      "name": "Reliquary World Tree",
      "description": "A silent monochrome grove carved into the void between realms.",
      "map": {
        "world": "monochrome",
        "x": 0.5,
        "y": 0.5,
        "order": "H",
        "standalone": true
      },
      "playable": true,
      "optional": true,
      "standalone": true,
      "alwaysUnlocked": true,
      "color": "#f0f0f5",
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 40,
        "rows": 20,
        "tiles": [
          "........................................",
          "........................................",
          ".................qqqqqqqqqq.............",
          "...............[###############]........",
          "..............{##############}..........",
          ".............####....y........####......",
          ".............##............q...##.......",
          "............##..................##......",
          "..........{##....................##}....",
          "..############............############..",
          "..############............############..",
          "..############............############..",
          "............##..................##......",
          "............##.........k........##......",
          "............###......k.........###......",
          ".............###..............###.......",
          "..............####..........####........",
          "...............vv#############..........",
          ".................#####V#####............",
          "............<.....#######.....>........."
        ],
        "symbolLegend": {
          "{": {
            "object": {
              "type": "worldTreeBranch",
              "width": 720,
              "height": 280,
              "offsetX": 0,
              "offsetY": -120,
              "color": "#6f6f79"
            }
          },
          "}": {
            "terrain": true,
            "object": {
              "type": "worldTreeBranch",
              "width": 520,
              "height": 220,
              "offsetX": 28,
              "offsetY": -168,
              "color": "#5c5c66"
            }
          },
          "[": {
            "object": {
              "type": "canopyLeaves",
              "width": 540,
              "height": 220,
              "offsetY": -240,
              "color": "#9fa0b2"
            }
          },
          "]": {
            "object": {
              "type": "canopyLeaves",
              "width": 380,
              "height": 200,
              "offsetX": -24,
              "offsetY": -210,
              "color": "#8c8da1"
            }
          },
          "y": {
            "terrain": true,
            "object": {
              "type": "sprout",
              "offsetY": -74,
              "height": 28
            }
          },
          "q": {
            "object": {
              "type": "tuft",
              "offsetY": -78,
              "width": 68,
              "height": 26
            }
          },
          "k": {
            "object": {
              "type": "skillPedestal",
              "width": 96,
              "height": 144,
              "offsetX": 0,
              "offsetY": 0,
              "radius": 110,
              "pedestalColor": "#4c4c58",
              "bookColor": "#f2f2fa"
            }
          },
          "v": {
            "object": {
              "type": "voidSymbol",
              "width": 84,
              "height": 84,
              "offsetX": 0,
              "offsetY": 0,
              "strokeColor": "#e4e3fb",
              "color": "#040406",
              "accentColor": "#f8f8ff"
            }
          },
          "V": {
            "object": {
              "type": "voidPortal",
              "id": "worldTreeReliquaryGate",
              "offsetX": 0,
              "offsetY": 0,
              "width": 72,
              "height": 128,
              "promptOffsetY": 74,
              "playerPromptOffsetY": 112,
              "radius": 120,
              "interactionHeight": 128,
              "promptColor": "#e5e5f9",
              "ringColor": "#e5e5f9",
              "coreColor": "#050509",
              "glowColor": "#b9b9d4",
              "sparkColor": "#f8f8ff",
              "targetStageId": "monochromeVestibule"
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 20,
            "row": 2,
            "width": 2560,
            "height": 1280,
            "offsetY": 1088,
            "starCount": 140,
            "parallax": 1.08,
            "parallaxY": 1.04,
            "color": "#dcdcf0",
            "colors": [
              "#ffffff",
              "#bfbfd6"
            ],
            "twinkleAmount": 0.36,
            "twinkleSpeed": 0.52,
            "seed": 4123
          },
          {
            "type": "fireflyJarSwarm",
            "id": "worldTreeReliquaryFireflies",
            "col": 20,
            "row": 8,
            "width": 160,
            "height": 160,
            "offsetY": -140,
            "fireflyCount": 18,
            "fireflyFlightRadius": 260,
            "fireflySpawnRadius": 120,
            "fireflyLightRadius": 22,
            "fireflySpeed": 80,
            "fireflyPullStrength": 26,
            "fireflyLifetimeMin": 18,
            "fireflyLifetimeMax": 36,
            "fireflyLightColor": "rgba(255, 240, 180, 1)",
            "fireflyGlowColor": "rgba(255, 244, 210, 0.9)"
          }
        ]
      },
      "palette": {
        "skyTop": "#040406",
        "skyBottom": "#090912",
        "ground": "#1a1a25",
        "turf": "#2b2b36",
        "doorClosed": "#1f1f28",
        "doorOpen": "#f2f2ff",
        "accent": "#f0f0f5",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.72)",
        "blockHighlight": "rgba(235,235,255,0.24)",
        "blockAccent": "#e7e7f5"
      },
      "darkness": {
        "opacity": 0.82,
        "color": "rgba(4,4,10,0.82)",
        "playerLightRadius": 320,
        "playerGlowRadius": 440,
        "playerGlowIntensity": 1.32,
        "playerLightSoftness": 0.46,
        "playerLightIntensity": 1.04,
        "playerGlowColor": "rgba(224, 228, 255, 0.76)"
      },
      "screens": [
        {
          "name": "Reliquary Canopy",
          "description": "A quiet platform for respite beneath the voidlit boughs.",
          "layout": {
            "tileSize": 64,
            "cols": 40,
            "rows": 20,
            "tiles": [
              "........................................",
              "........................................",
              ".................qqqqqqqqqq.............",
              "...............[###############]........",
              "..............{##############}..........",
              ".............####....y........####......",
              ".............##............q...##.......",
              "............##..................##......",
              "..........{##....................##}....",
              "..############............############..",
              "..############............############..",
              "..############............############..",
              "............##..................##......",
              "............##.........k........##......",
              "............###......k.........###......",
              ".............###..............###.......",
              "..............####..........####........",
              "...............vv#############..........",
              ".................#####V#####............",
              "............<.....#######.....>........."
            ],
            "symbolLegend": {
              "{": {
                "object": {
                  "type": "worldTreeBranch",
                  "width": 720,
                  "height": 280,
                  "offsetX": 0,
                  "offsetY": -120,
                  "color": "#6f6f79"
                }
              },
              "}": {
                "terrain": true,
                "object": {
                  "type": "worldTreeBranch",
                  "width": 520,
                  "height": 220,
                  "offsetX": 28,
                  "offsetY": -168,
                  "color": "#5c5c66"
                }
              },
              "[": {
                "object": {
                  "type": "canopyLeaves",
                  "width": 540,
                  "height": 220,
                  "offsetY": -240,
                  "color": "#9fa0b2"
                }
              },
              "]": {
                "object": {
                  "type": "canopyLeaves",
                  "width": 380,
                  "height": 200,
                  "offsetX": -24,
                  "offsetY": -210,
                  "color": "#8c8da1"
                }
              },
              "y": {
                "terrain": true,
                "object": {
                  "type": "sprout",
                  "offsetY": -74,
                  "height": 28
                }
              },
              "q": {
                "object": {
                  "type": "tuft",
                  "offsetY": -78,
                  "width": 68,
                  "height": 26
                }
              },
              "k": {
                "object": {
                  "type": "skillPedestal",
                  "width": 96,
                  "height": 144,
                  "offsetX": 0,
                  "offsetY": 0,
                  "radius": 110,
                  "pedestalColor": "#4c4c58",
                  "bookColor": "#f2f2fa"
                }
              },
              "v": {
                "object": {
                  "type": "voidSymbol",
                  "width": 84,
                  "height": 84,
                  "offsetX": 0,
                  "offsetY": 0,
                  "strokeColor": "#e4e3fb",
                  "color": "#040406",
                  "accentColor": "#f8f8ff"
                }
              },
              "V": {
                "object": {
                  "type": "voidPortal",
                  "id": "worldTreeReliquaryGate",
                  "offsetX": 0,
                  "offsetY": 0,
                  "width": 72,
                  "height": 128,
                  "promptOffsetY": 74,
                  "playerPromptOffsetY": 112,
                  "radius": 120,
                  "interactionHeight": 128,
                  "promptColor": "#e5e5f9",
                  "ringColor": "#e5e5f9",
                  "coreColor": "#050509",
                  "glowColor": "#b9b9d4",
                  "sparkColor": "#f8f8ff",
                  "targetStageId": "monochromeVestibule"
                }
              }
            },
            "objects": [
              {
                "type": "rainField",
                "col": 20,
                "row": 2,
                "width": 2560,
                "height": 960,
                "offsetY": -240,
                "density": 260,
                "speed": 900,
                "wind": -140,
                "dropLength": 32,
                "dropThickness": 1.8,
                "splashRadius": 18,
                "splashDuration": 0.28,
                "flashColor": "rgba(238, 242, 255, 0.9)",
                "flashAlpha": 0.95,
                "thunderIntervalMin": 6.5,
                "thunderIntervalMax": 12.5,
                "mistAlpha": 0.08,
                "mistColor": "rgba(10, 10, 18, 0.65)",
                "layer": "foreground"
              },
              {
                "type": "starField",
                "col": 20,
                "row": 2,
                "width": 2560,
                "height": 1280,
                "offsetY": 1088,
                "starCount": 140,
                "parallax": 1.08,
                "parallaxY": 1.04,
                "color": "#dcdcf0",
                "colors": [
                  "#ffffff",
                  "#bfbfd6"
                ],
                "twinkleAmount": 0.36,
                "twinkleSpeed": 0.52,
                "seed": 4123
              },
              {
                "type": "fireflyJarSwarm",
                "id": "worldTreeReliquaryFireflies",
                "col": 20,
                "row": 8,
                "width": 160,
                "height": 160,
                "offsetY": -140,
                "fireflyCount": 18,
                "fireflyFlightRadius": 260,
                "fireflySpawnRadius": 120,
                "fireflyLightRadius": 22,
                "fireflySpeed": 80,
                "fireflyPullStrength": 26,
                "fireflyLifetimeMin": 18,
                "fireflyLifetimeMax": 36,
                "fireflyLightColor": "rgba(255, 240, 180, 1)",
                "fireflyGlowColor": "rgba(255, 244, 210, 0.9)"
              },
              {
                "type": "swordPedestal",
                "id": "reliquaryClaymorePedestal",
                "col": 12,
                "row": 15,
                "offsetY": -72,
                "width": 88,
                "height": 120,
                "promptOffsetY": 60,
                "playerPromptOffsetY": 102,
                "promptColor": "#dcd4ff",
                "loot": {
                  "weaponId": "crumblingClaymore"
                }
              },
              {
                "type": "swordPedestal",
                "id": "reliquaryPhotostigmaPedestal",
                "col": 28,
                "row": 15,
                "offsetY": -72,
                "width": 88,
                "height": 120,
                "promptOffsetY": 60,
                "playerPromptOffsetY": 102,
                "promptColor": "#c6bcff",
                "loot": {
                  "weaponId": "photostigma"
                }
              },
              {
                "type": "treasureChest",
                "id": "reliquaryAuricCache",
                "col": 16,
                "row": 17,
                "offsetY": 0,
                "width": 68,
                "height": 48,
                "promptOffsetY": 54,
                "playerPromptOffsetY": 96,
                "promptColor": "#f6d66a",
                "loot": {
                  "coins": 0,
                  "weaponId": "auricDagger"
                }
              },
              {
                "type": "treasureChest",
                "id": "reliquaryBiofuseCache",
                "col": 20,
                "row": 17,
                "offsetY": 0,
                "width": 68,
                "height": 48,
                "promptOffsetY": 54,
                "playerPromptOffsetY": 96,
                "promptColor": "#7fe6b2",
                "loot": {
                  "coins": 0,
                  "armorId": "biofuseArmor"
                }
              },
              {
                "type": "treasureChest",
                "id": "reliquaryConduitCache",
                "col": 24,
                "row": 17,
                "offsetY": 0,
                "width": 68,
                "height": 48,
                "promptOffsetY": 54,
                "playerPromptOffsetY": 96,
                "promptColor": "#cf9fff",
                "loot": {
                  "coins": 0,
                  "armorId": "leechConduitVest"
                }
              }
            ]
          },
          "enemyPlacements": [],
          "enemies": []
        }
      ]
    } },
  { file: "level_monochrome_vestibule.json", data: {
      "id": "monochromeVestibule",
      "name": "Reliquary Vestibule",
      "description": "Step through the monochrome antechamber guarded by voidbound sentries.",
      "map": {
        "world": "monochrome",
        "x": 0.42,
        "y": 0.52,
        "order": "M1",
        "parent": "worldTreeReliquary",
        "requires": ["worldTreeReliquary"]
      },
      "playable": true,
      "optional": true,
      "color": "#d8d8ef",
      "difficultyMultiplier": 45,
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 48,
        "rows": 12,
        "tiles": [
          "................................................",
          "................................................",
          "...............#####............#####...........",
          "..............######..........######............",
          ".............#######..........#######...........",
          "............########..........########..........",
          "...........#########....##....#########.........",
          "..........###################V#########.........",
          "..........#############################.........",
          "..........#############################.........",
          "..........#############################.........",
          "......<.....##############....#############..>.."
        ],
        "symbolLegend": {
          "V": {
            "object": {
              "type": "voidPortal",
              "id": "monochromeVestibuleGate",
              "offsetX": 0,
              "offsetY": 0,
              "width": 72,
              "height": 128,
              "promptOffsetY": 74,
              "playerPromptOffsetY": 112,
              "radius": 120,
              "interactionHeight": 128,
              "promptColor": "#ededff",
              "ringColor": "#ededff",
              "coreColor": "#040408",
              "glowColor": "#bfc0d8",
              "sparkColor": "#f8f8ff",
              "targetStageId": "world8VoidDojo"
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 24,
            "row": 2,
            "width": 3200,
            "height": 768,
            "offsetY": 576,
            "starCount": 150,
            "parallax": 1.1,
            "parallaxY": 1.05,
            "color": "#e4e4f6",
            "colors": [
              "#ffffff",
              "#c9c9e4"
            ],
            "twinkleAmount": 0.4,
            "twinkleSpeed": 0.6,
            "seed": 2681
          }
        ]
      },
      "palette": {
        "skyTop": "#050507",
        "skyBottom": "#0b0b12",
        "ground": "#11111a",
        "turf": "#1f1f2b",
        "doorClosed": "#1d1d24",
        "doorOpen": "#f0f0ff",
        "accent": "#d8d8ef",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.7)",
        "blockHighlight": "rgba(230,230,255,0.24)",
        "blockAccent": "#ececf9"
      },
      "darkness": {
        "opacity": 0.7,
        "color": "rgba(6,6,12,0.7)"
      },
      "screens": [
        {
          "name": "Vestibule Hall",
          "description": "Voidlight hums between the reliquary sentries.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 12,
            "tiles": [
              "................................................",
              "................................................",
              "...............#####............#####...........",
              "..............######..........######............",
              ".............#######..........#######...........",
              "............########..........########..........",
              "...........#########....##....#########.........",
              "..........###################V#########.........",
              "..........#############################.........",
              "..........#############################.........",
              "..........#############################.........",
              "......<.....##############....#############..>.."
            ],
            "symbolLegend": {
              "V": {
                "object": {
                  "type": "voidPortal",
                  "id": "monochromeVestibuleGate",
                  "offsetX": 0,
                  "offsetY": 0,
                  "width": 72,
                  "height": 128,
                  "promptOffsetY": 74,
                  "playerPromptOffsetY": 112,
                  "radius": 120,
                  "interactionHeight": 128,
                  "promptColor": "#ededff",
                  "ringColor": "#ededff",
                  "coreColor": "#040408",
                  "glowColor": "#bfc0d8",
                  "sparkColor": "#f8f8ff",
                  "targetStageId": "world8VoidDojo"
                }
              }
            },
            "objects": [
              {
                "type": "starField",
                "col": 24,
                "row": 2,
                "width": 3200,
                "height": 768,
                "offsetY": 576,
                "starCount": 150,
                "parallax": 1.1,
                "parallaxY": 1.05,
                "color": "#e4e4f6",
                "colors": [
                  "#ffffff",
                  "#c9c9e4"
                ],
                "twinkleAmount": 0.4,
                "twinkleSpeed": 0.6,
                "seed": 2681
              }
            ]
          },
          "enemyPlacements": [
            { "kind": "realmGuardian", "col": 32, "row": 8 },
            { "kind": "mage", "col": 40, "row": 8 }
          ],
          "enemies": [
            { "kind": "realmGuardian", "count": 1 },
            { "kind": "mage", "count": 1 }
          ]
        }
      ]
    } },
  { file: "level_8_void_secret.json", data: {
      "id": "world8VoidDojo",
      "name": "Monochrome Reliquary",
      "description": "A hidden hallway of black and white stone that hums with void resonance.",
      "map": {
        "world": "monochrome",
        "x": 0.5,
        "y": 0.46,
        "order": "M2",
        "parent": "monochromeVestibule"
      },
      "playable": true,
      "optional": true,
      "standalone": true,
      "difficultyMultiplier": 50,
      "color": "#dcdcff",
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 48,
        "rows": 10,
        "tiles": [
          "................................................",
          "................................................",
          "................................................",
          "................................................",
          "................................................",
          "................................................",
          "................................................",
          "##########################################......",
          "##########################################......",
          "#########################################>......"
        ],
        "objects": [
          {
            "type": "starField",
            "col": 24,
            "row": 2,
            "width": 3072,
            "height": 640,
            "offsetY": 448,
            "starCount": 160,
            "parallax": 1.06,
            "parallaxY": 1.02,
            "color": "#ffffff",
            "colors": [
              "#f5f5ff",
              "#bcbce6",
              "#2f2f48"
            ],
            "twinkleAmount": 0.42,
            "twinkleSpeed": 0.56,
            "seed": 8231
          }
        ]
      },
      "palette": {
        "skyTop": "#050508",
        "skyBottom": "#010103",
        "ground": "#0f0f16",
        "turf": "#13131b",
        "doorClosed": "#1d1d24",
        "doorOpen": "#f3f3ff",
        "accent": "#dcdcff",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.7)",
        "blockHighlight": "rgba(220,220,255,0.25)",
        "blockAccent": "#f5f5f8"
      },
      "darkness": {
        "opacity": 0.82,
        "color": "rgba(2,2,6,0.82)",
        "playerLightRadius": 320,
        "playerGlowRadius": 440,
        "playerGlowIntensity": 1.35,
        "playerLightSoftness": 0.46,
        "playerLightIntensity": 1.05,
        "playerGlowColor": "rgba(224, 228, 255, 0.78)"
      },
      "screens": [
        {
          "name": "Monochrome Approach",
          "description": "Traverse the silent corridor toward the voidbound gate.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 10,
            "tiles": [
              "................................................",
              "................................................",
              "................................................",
              "................................................",
              "................................................",
              "................................................",
              "................................................",
              "##########################################......",
              "##########################################......",
              "#########################################>......"
            ],
            "objects": [
              {
                "type": "rainField",
                "col": 24,
                "row": 2,
                "width": 3072,
                "height": 420,
                "offsetY": -200,
                "density": 260,
                "speed": 900,
                "wind": -140,
                "dropLength": 32,
                "dropThickness": 1.8,
                "splashRadius": 18,
                "splashDuration": 0.28,
                "flashColor": "rgba(238, 242, 255, 0.9)",
                "flashAlpha": 0.95,
                "thunderIntervalMin": 6.5,
                "thunderIntervalMax": 12.5,
                "mistAlpha": 0.08,
                "mistColor": "rgba(10, 10, 18, 0.65)",
                "layer": "foreground"
              },
              {
                "type": "starField",
                "col": 24,
                "row": 2,
                "width": 3072,
                "height": 640,
                "offsetY": 448,
                "starCount": 160,
                "parallax": 1.06,
                "parallaxY": 1.02,
                "color": "#ffffff",
                "colors": [
                  "#f5f5ff",
                  "#bcbce6",
                  "#2f2f48"
                ],
                "twinkleAmount": 0.42,
                "twinkleSpeed": 0.56,
                "seed": 8231
              }
            ]
          },
          "enemyPlacements": [
            { "kind": "realmGuardian", "col": 36, "row": 7 }
          ],
          "enemies": [
            { "kind": "realmGuardian", "count": 1 }
          ]
        }
      ]
    } },
  { file: "level_monochrome_sanctum.json", data: {
      "id": "monochromeSanctum",
      "name": "Reliquary Sanctum",
      "description": "Challenge the innermost chamber where voidlight circuits through silver glyphs.",
      "map": {
        "world": "monochrome",
        "x": 0.62,
        "y": 0.44,
        "order": "M3",
        "parent": "world8VoidDojo",
        "requires": ["world8VoidDojo"]
      },
      "playable": true,
      "optional": true,
      "color": "#e2e2ff",
      "difficultyMultiplier": 58,
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 48,
        "rows": 12,
        "tiles": [
          "................................................",
          "................................................",
          "..................#####.........................",
          ".................#######........................",
          "...........####..#######..####..................",
          "..........#####..#######..#####.................",
          ".........######..####V##..######................",
          "........##########################..............",
          "........##########################..............",
          "......###########....##....###########..........",
          "......###########....##....###########..........",
          "....<.###########....##....###########..>......."
        ],
        "symbolLegend": {
          "V": {
            "object": {
              "type": "voidPortal",
              "id": "monochromeSanctumGate",
              "offsetX": 0,
              "offsetY": 0,
              "width": 72,
              "height": 128,
              "promptOffsetY": 74,
              "playerPromptOffsetY": 112,
              "radius": 120,
              "interactionHeight": 128,
              "promptColor": "#f3f3ff",
              "ringColor": "#f3f3ff",
              "coreColor": "#040408",
              "glowColor": "#c9cae4",
              "sparkColor": "#f8f8ff",
              "targetStageId": "worldTreeReliquary"
            }
          }
        },
        "objects": [
          {
            "type": "starField",
            "col": 24,
            "row": 2,
            "width": 3328,
            "height": 768,
            "offsetY": 576,
            "starCount": 170,
            "parallax": 1.12,
            "parallaxY": 1.07,
            "color": "#efefff",
            "colors": [
              "#ffffff",
              "#d2d2ee"
            ],
            "twinkleAmount": 0.44,
            "twinkleSpeed": 0.64,
            "seed": 3311
          }
        ]
      },
      "palette": {
        "skyTop": "#040407",
        "skyBottom": "#0c0c15",
        "ground": "#14141f",
        "turf": "#21212d",
        "doorClosed": "#1e1e27",
        "doorOpen": "#f5f5ff",
        "accent": "#e2e2ff",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.72)",
        "blockHighlight": "rgba(240,240,255,0.28)",
        "blockAccent": "#f4f4ff"
      },
      "darkness": {
        "opacity": 0.78,
        "color": "rgba(8,8,16,0.78)"
      },
      "screens": [
        {
          "name": "Inner Circuits",
          "description": "Glyph arrays flare as wardens converge on the sanctum core.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 12,
            "tiles": [
              "................................................",
              "................................................",
              "..................#####.........................",
              ".................#######........................",
              "...........####..#######..####..................",
              "..........#####..#######..#####.................",
              ".........######..####V##..######................",
              "........##########################..............",
              "........##########################..............",
              "......###########....##....###########..........",
              "......###########....##....###########..........",
              "....<.###########....##....###########..>......."
            ],
            "symbolLegend": {
              "V": {
                "object": {
                  "type": "voidPortal",
                  "id": "monochromeSanctumGate",
                  "offsetX": 0,
                  "offsetY": 0,
                  "width": 72,
                  "height": 128,
                  "promptOffsetY": 74,
                  "playerPromptOffsetY": 112,
                  "radius": 120,
                  "interactionHeight": 128,
                  "promptColor": "#f3f3ff",
                  "ringColor": "#f3f3ff",
                  "coreColor": "#040408",
                  "glowColor": "#c9cae4",
                  "sparkColor": "#f8f8ff",
                  "targetStageId": "worldTreeReliquary"
                }
              }
            },
            "objects": [
              {
                "type": "starField",
                "col": 24,
                "row": 2,
                "width": 3328,
                "height": 768,
                "offsetY": 576,
                "starCount": 170,
                "parallax": 1.12,
                "parallaxY": 1.07,
                "color": "#efefff",
                "colors": [
                  "#ffffff",
                  "#d2d2ee"
                ],
                "twinkleAmount": 0.44,
                "twinkleSpeed": 0.64,
                "seed": 3311
              }
            ]
          },
          "enemyPlacements": [
            { "kind": "alephGlyph", "col": 30, "row": 5, "offsetY": -150 },
            { "kind": "realmGuardian", "col": 28, "row": 7 },
            { "kind": "tricylicSlasher", "col": 22, "row": 7, "offsetY": -48 },
            { "kind": "rogue", "col": 34, "row": 8 },
            { "kind": "mage", "col": 40, "row": 8 }
          ],
          "enemies": [
            { "kind": "alephGlyph", "count": 1 },
            { "kind": "realmGuardian", "count": 1 },
            { "kind": "tricylicSlasher", "count": 1 },
            { "kind": "rogue", "count": 1 },
            { "kind": "mage", "count": 1 }
          ]
        }
      ]
    } },
  { file: "level_monochrome_cathedral.json", data: {
      "id": "monochromeCathedral",
      "name": "Orbital Cathedral",
      "description": "Survey the vaulted reliquary where voidlight traces concentric rings.",
      "map": {
        "world": "monochrome",
        "x": 0.58,
        "y": 0.52,
        "order": "M4",
        "parent": "monochromeSanctum",
        "requires": ["monochromeSanctum"]
      },
      "playable": true,
      "optional": true,
      "color": "#e6e6ff",
      "difficultyMultiplier": 68,
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 48,
        "rows": 12,
        "tiles": [
          "................................................",
          "................................................",
          ".................########.......................",
          "...............############.....................",
          ".............################...................",
          "..........######################................",
          "....########################################....",
          "....########################################....",
          "....########################################....",
          "....########################################....",
          "....########################################....",
          "...<########################################..>."
        ],
        "objects": [
          {
            "type": "starField",
            "col": 24,
            "row": 2,
            "width": 3072,
            "height": 704,
            "offsetY": 512,
            "starCount": 180,
            "parallax": 1.08,
            "parallaxY": 1.04,
            "color": "#ebebff",
            "colors": [
              "#ffffff",
              "#c9cae8"
            ],
            "twinkleAmount": 0.44,
            "twinkleSpeed": 0.62,
            "seed": 5641
          }
        ]
      },
      "palette": {
        "skyTop": "#06060c",
        "skyBottom": "#0c0c16",
        "ground": "#11111d",
        "turf": "#1d1d2a",
        "doorClosed": "#1f1f28",
        "doorOpen": "#f4f4ff",
        "accent": "#e6e6ff",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.72)",
        "blockHighlight": "rgba(235,235,255,0.28)",
        "blockAccent": "#dedff4"
      },
      "darkness": {
        "opacity": 0.75,
        "color": "rgba(8,8,16,0.75)"
      },
      "screens": [
        {
          "name": "Orbital Gallery",
          "description": "Concentric terraces frame the reliquary core.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 12,
            "tiles": [
              "................................................",
              "................................................",
              ".................########.......................",
              "...............############.....................",
              ".............################...................",
              "..........######################................",
              "....########################################....",
              "....########################################....",
              "....########################################....",
              "....########################################....",
              "....########################################....",
              "...<########################################..>."
            ]
          },
          "enemyPlacements": [
            { "kind": "glyphGyre", "col": 20, "row": 6, "offsetY": -120 },
            { "kind": "glyphGyre", "col": 28, "row": 6, "offsetY": -120 }
          ],
          "enemies": [
            { "kind": "glyphGyre", "count": 2 }
          ]
        }
      ]
    } },
  { file: "level_monochrome_apex.json", data: {
      "id": "monochromeApex",
      "name": "Harmonic Apex",
      "description": "Challenge the ultimate reliquary chamber where twin glyph cores intertwine.",
      "map": {
        "world": "monochrome",
        "x": 0.64,
        "y": 0.58,
        "order": "M5",
        "parent": "monochromeCathedral",
        "requires": ["monochromeCathedral"]
      },
      "playable": true,
      "optional": true,
      "standalone": true,
      "bossStage": true,
      "color": "#f0f0ff",
      "difficultyMultiplier": 80,
      "renderFilter": { "type": "grayscale", "amount": 1 },
      "layout": {
        "tileSize": 64,
        "cols": 48,
        "rows": 12,
        "tiles": [
          "................................................",
          "................................................",
          "..............########........########..........",
          "............############....############........",
          "..........################..################....",
          "........############################............",
          ".......##################################.......",
          ".......##################################.......",
          "........############################............",
          "..........################..################....",
          "............############....############........",
          "....<######################################..>.."
        ],
        "objects": [
          {
            "type": "starField",
            "col": 24,
            "row": 2,
            "width": 3200,
            "height": 768,
            "offsetY": 576,
            "starCount": 200,
            "parallax": 1.12,
            "parallaxY": 1.06,
            "color": "#ffffff",
            "colors": [
              "#ffffff",
              "#dcdcff",
              "#8f90ff"
            ],
            "twinkleAmount": 0.5,
            "twinkleSpeed": 0.74,
            "seed": 7429
          }
        ]
      },
      "palette": {
        "skyTop": "#040409",
        "skyBottom": "#0a0a12",
        "ground": "#101018",
        "turf": "#1a1a24",
        "doorClosed": "#1d1d26",
        "doorOpen": "#f7f7ff",
        "accent": "#f0f0ff",
        "terrainStyle": "world9",
        "blockShade": "rgba(0,0,0,0.74)",
        "blockHighlight": "rgba(240,240,255,0.32)",
        "blockAccent": "#e0e0f8"
      },
      "darkness": {
        "opacity": 0.82,
        "color": "rgba(4,4,10,0.82)",
        "playerLightRadius": 360,
        "playerGlowRadius": 480,
        "playerGlowIntensity": 1.4,
        "playerLightIntensity": 1.1
      },
      "screens": [
        {
          "name": "Twin Singularity",
          "description": "Zeta and Xi spiral around a blinding void focus, unleashing orbiting beams.",
          "layout": {
            "tileSize": 64,
            "cols": 48,
            "rows": 12,
            "tiles": [
              "................................................",
              "................................................",
              "..............########........########..........",
              "............############....############........",
              "..........################..################....",
              "........############################............",
              ".......##################################.......",
              ".......##################################.......",
              "........############################............",
              "..........################..################....",
              "............############....############........",
              "....<######################################..>.."
            ]
          },
          "objects": [
            {
              "type": "starField",
              "col": 24,
              "row": 2,
              "width": 3200,
              "height": 768,
              "offsetY": 576,
              "starCount": 200,
              "parallax": 1.12,
              "parallaxY": 1.06,
              "color": "#ffffff",
              "colors": [
                "#ffffff",
                "#dcdcff",
                "#8f90ff"
              ],
              "twinkleAmount": 0.5,
              "twinkleSpeed": 0.74,
              "seed": 7429
            }
          ],
          "enemyPlacements": [
            { "kind": "zetaGlyph", "col": 22, "row": 6, "offsetY": -120, "isBoss": true, "bossName": "Zeta" },
            { "kind": "xiGlyph", "col": 26, "row": 6, "offsetY": -120, "isBoss": true, "bossName": "Xi" }
          ],
          "enemies": [
            { "kind": "zetaGlyph", "count": 1 },
            { "kind": "xiGlyph", "count": 1 }
          ],
          "boss": {
            "name": "Zeta & Xi, Harmonic Singularity",
            "kind": "zetaGlyph",
            "hp": 640,
            "attack": 148,
            "defense": 83,
            "behavior": "glyphGyre",
            "description": "A bonded pair of glyph cores that revolve around one another, weaving beams and pulses in tandem."
          }
        }
      ]
    } },
  { file: "level_6_1.json", data: {
      "id": "chronometricSanctum",
      "name": "Chronometric Sanctum",
      "description": "Ascend the sanctum shaft where pendulums and bells line the interior tower.",
      "map": {
        "x": 0.32,
        "y": 0.5,
        "order": "XXI",
        "branch": "world7",
        "branchStep": 1
      },
      "playable": true,
      "stageNumber": 25,
      "color": "#d6c278",
      "layout": {
        "tileSize": 64,
        "cols": 32,
        "rows": 36,
        "tiles": [
          "................................",
          "................................",
          "####################.....#######",
          "##..#####......>........###...##",
          "##..####..............####....##",
          "##...####.....................##",
          "##...###......................##",
          "##....#####...####.#####......##",
          "##....#####...####.#####......##",
          "##.....#####....####..........##",
          "##.....#####....####..........##",
          "##.....####............###....##",
          "##.....####............###....##",
          "##................####........##",
          "##............................##",
          "##.......#####................##",
          "##.......#####....####........##",
          "##........#####.....#####.....##",
          "##........#####...............##",
          "##.........#####..............##",
          "##.........#####......####....##",
          "##.................####.......##",
          "##.................####.......##",
          "##.........####..####..####...##",
          "##.........####..####..####...##",
          "##........####..####..####....##",
          "##........####..####..####....##",
          "##.......####..####..####.....##",
          "##.......####..####..####.....##",
          "##......####..####..####......##",
          "##......####..####..####......##",
          "##.....####..####..####.......##",
          "##.....####..####..####.......##",
          "##....####..####..####........##",
          "##....####..####..####........##",
          "##...####..####..####.........##",
          "##<..####..####..####.........##",
          "################################"
        ]
      },
      "palette": {
        "skyTop": "#090513",
        "skyBottom": "#1c1233",
        "ground": "#241a36",
        "turf": "#d6c278",
        "doorClosed": "#3a2b58",
        "doorOpen": "#ffe8b4",
        "accent": "#d6c278",
        "terrainStyle": "world7",
        "blockShade": "rgba(0,0,0,0.78)",
        "blockHighlight": "rgba(255,232,180,0.22)",
        "blockAccent": "#7c6a3a"
      },
      "screens": [
        {
          "name": "Pendulum Wells",
          "description": "Bell-lined platforms sway around the vertical shaft.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##..#####......>......#####...##",
              "##..####..............####....##",
              "##...####............####.....##",
              "##...###.............###......##",
              "##....#####...####.#####......##",
              "##....#####...####.#####......##",
              "##.....#####....####..........##",
              "##.....#####....####..........##",
              "##.....####......####..###....##",
              "##.....####......####..###....##",
              "##......#####..###..####......##",
              "##......#####1.###..####......##",
              "##.......#####....####........##",
              "##.......#####....####........##",
              "##........#####.....#####.....##",
              "##........#####...............##",
              "##.........#####..............##",
              "##.........#####...1..####....##",
              "##..........#####..####.......##",
              "##.........2#####..####.......##",
              "##.........####..####...###...##",
              "##.........####..####...###...##",
              "##........####..####..........##",
              "##........####..####..3......###",
              "##.......####........####.....##",
              "##......3####........####.....##",
              "##............####..####......##",
              "##............####..####......##",
              "##.....####..####..####.......##",
              "##.....####..####..####.2.....##",
              "##....####..####..####........##",
              "##....####..####..####........##",
              "##...####..####..####.........##",
              "##<..####..####..####.........##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "2": {
                "enemy": {
                  "kind": "timeWraith"
                }
              },
              "3": {
                "enemy": {
                  "kind": "echoSlinger"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 9, "row": 18, "offsetY": 0 },
              { "type": "chronosphere", "col": 22, "row": 26, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "chronoglassOracle", "count": 2 },
            { "kind": "echoSlinger", "count": 2 },
            { "kind": "timeWraith", "count": 2 }
          ]
        },
        {
          "name": "Sanctum Bellwalk",
          "description": "Tight catwalks spiral toward the sanctum threshold.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##...#####......>....#####....##",
              "##...####............####.....##",
              "##....####....................##",
              "##....###...1.................##",
              "##......######...######.......##",
              "##......######...######.......##",
              "##.......####..####..#####....##",
              "##.......####..####..#####....##",
              "##........####..####..#####...##",
              "##........####..####..#####...##",
              "##.........####..####..###....##",
              "##.........####..####..###...###",
              "##..........####..####.......###",
              "##..........####..####.......###",
              "##.........####..####..####...##",
              "##........2####..####..####...##",
              "##........####..####..####....##",
              "##........####..####1.####....##",
              "##.......####..####..####.....##",
              "##.......####..####..####.....##",
              "##......####..####..####......##",
              "##.....3####..####..####......##",
              "##.....##########..####.......##",
              "##.....##########..####...2...##",
              "##....####........####........##",
              "##....####........####........##",
              "##...####..####..####..3......##",
              "##...####..####..####.........##",
              "##..####..####..####..........##",
              "##..####..####..####..........##",
              "##.####..####..####..####.....##",
              "##.####..####..####..####.....##",
              "##......####..####..####......##",
              "##<.....####..####..####......##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "2": {
                "enemy": {
                  "kind": "timeWraith"
                }
              },
              "3": {
                "enemy": {
                  "kind": "echoSlinger"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 8, "row": 14, "offsetY": 0 },
              { "type": "chronosphere", "col": 25, "row": 22, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "chronoglassOracle", "count": 2 },
            { "kind": "echoSlinger", "count": 2 },
            { "kind": "timeWraith", "count": 2 }
          ]
        }
      ]
    } },
  { file: "level_6_2.json", data: {
      "id": "pendulumEngine",
      "name": "Pendulum Engine",
      "description": "Ride the gearshaft where suspended counterweights keep the chronometer humming.",
      "map": {
        "x": 0.23,
        "y": 0.5,
        "order": "XXII",
        "branch": "world7",
        "branchStep": 2
      },
      "playable": true,
      "stageNumber": 26,
      "color": "#c3b169",
      "layout": {
        "tileSize": 64,
        "cols": 32,
        "rows": 36,
        "tiles": [

        ]
      },
      "palette": {
        "skyTop": "#0b0618",
        "skyBottom": "#1d132d",
        "ground": "#2a1d38",
        "turf": "#c3b169",
        "doorClosed": "#3a294f",
        "doorOpen": "#f9e28d",
        "accent": "#e1c76a",
        "terrainStyle": "world7",
        "blockShade": "rgba(0,0,0,0.78)",
        "blockHighlight": "rgba(240,214,128,0.2)",
        "blockAccent": "#8a7344"
      },
      "screens": [
        {
          "name": "Gearwind Hoist",
          "description": "Counterweights rise and fall beside narrow staging ledges.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##.####.......##>........####.##",
              "##.###........##.........###..##",
              "##..###......##.........###...##",
              "##..##.......#..........##....##",
              "##....####..########..####....##",
              "##....####..########..####....##",
              "##.....####..##..####..####...##",
              "##.....####..##..####..####...##",
              "##......####..##..####..##....##",
              "##......####..##..####..##....##",
              "##.......####..##..####.......##",
              "##.......####..##..####.......##",
              "##........####..##..###.......##",
              "##........####..##..####......##",
              "##.........####..##...........##",
              "##.........####..##...........##",
              "##..........####..##..####....##",
              "##......1...####..##..####....##",
              "##...........####..##..####...##",
              "##...........####..##.1####...##",
              "##..........###..###..###.....##",
              "##.........2###..###..###.....##",
              "##.........###.......###......##",
              "##.........###.......###......##",
              "##........###..###..###.......##",
              "##........###3.###..###.......##",
              "##.......###..###..###........##",
              "##.......###..###.3###........##",
              "##......###..###..###.........##",
              "##......###..###..###.........##",
              "##.....###..###..###..........##",
              "##.....###..###..###..........##",
              "##.........###..###...........##",
              "##<........###..###...........##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "echoSlinger"
                }
              },
              "2": {
                "enemy": {
                  "kind": "timeWraith"
                }
              },
              "3": {
                "enemy": {
                  "kind": "mirageLancer"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 9, "row": 16, "offsetY": 0 },
              { "type": "chronosphere", "col": 21, "row": 24, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "echoSlinger", "count": 2 },
            { "kind": "mirageLancer", "count": 2 },
            { "kind": "timeWraith", "count": 1 }
          ]
        },
        {
          "name": "Resonant Flight",
          "description": "Ascending vents funnel echoes between opposing mezzanines.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##....#####..###>##..#####....##",
              "##....####...#####...####.....##",
              "##.....####...#####...####....##",
              "##.....###..2.####....###.....##",
              "##.......####..##..####.......##",
              "##.......####..##1.####.......##",
              "##........####..##..####......##",
              "##........####..##..####......##",
              "##.........####..##..####.....##",
              "##.........####..##..####.....##",
              "##..........####..##..##......##",
              "##..........####..##2.##......##",
              "##...........####..##.........##",
              "##...........####..##.........##",
              "##............####..##........##",
              "##...........3####..##........##",
              "##...........####..##..##.....##",
              "##...........####..##..##.....##",
              "##..........####..##..##......##",
              "##..........####..##..##......##",
              "##.........####..##..##.......##",
              "##.........####..##..##.......##",
              "##........####..##..##........##",
              "##........####..##..##........##",
              "##.......####..##..##.........##",
              "##.......####..##..##.........##",
              "##......####..##..##..........##",
              "##......####..##..##....3.....##",
              "##.....####..##..##...........##",
              "##.....####..##..##...........##",
              "##....####..##..##............##",
              "##....####..##..##............##",
              "##<..####..##..##.............##",
              "##<..####..##..##.............##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "glyphGyre"
                }
              },
              "2": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "3": {
                "enemy": {
                  "kind": "timeWraith"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 11, "row": 18, "offsetY": 0 },
              { "type": "chronosphere", "col": 21, "row": 26, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "chronoglassOracle", "count": 2 },
            { "kind": "glyphGyre", "count": 1 },
            { "kind": "timeWraith", "count": 2 }
          ]
        }
      ]
    } },
  { file: "level_6_3.json", data: {
      "id": "gearspireAscent",
      "name": "Gear Spire Ascent",
      "description": "Clamber along the inner spine where gears bite into the tower walls.",
      "map": {
        "x": 0.14,
        "y": 0.5,
        "order": "XXIII",
        "branch": "world7",
        "branchStep": 3
      },
      "playable": true,
      "stageNumber": 27,
      "color": "#b9a45f",
      "layout": {
        "tileSize": 64,
        "cols": 32,
        "rows": 36,
        "tiles": [
              "################################",
              "##....####.......##..#####....##",
              "##....####......>#...####.....##",
              "##.....###...######...####....##",
              "##..........######....###.....##",
              "##..........#......####.......##",
              "##.......####......####.......##",
              "##..........##..##..####......##",
              "##..........##..##..####......##",
              "##.........####..##..####.....##",
              "##...........##..##..####.....##",
              "##...........###..##..##......##",
              "##..........####..##..##......##",
              "##.............##..##.........##",
              "##.............##..##.........##",
              "##............####..##........##",
              "##............####..#.........##",
              "##...........####..##..#########",
              "##...........####..##..#########",
              "##..........####..##..##......##",
              "##..........####..##..##......##",
              "##.........####..##..##.......##",
              "##.........####..##..##.......##",
              "##........####..##..##........##",
              "##........####..##..##........##",
              "##.......####..##..##.........##",
              "##.......####..##..##.........##",
              "##............##..##..........##",
              "##............##..##..........##",
              "###############..##...........##",
              "###############..##...........##",
              "##..............##............##",
              "##..............##............##",
              "##.............##.............##",
              "##<............##.............##",
              "################################"
        ],
        "objects": [
          {
            "type": "skillPedestal",
            "id": "world7_shrine_sprint",
            "col": 16,
            "row": 28,
            "offsetY": -2,
            "width": 96,
            "height": 144,
            "abilityId": "sprint",
            "pedestalColor": "#4f4a2e",
            "bookColor": "#f4f0d0",
            "shrineGlowColor": "#f6e388",
            "promptColor": "#f2d778"
          }
        ]
      },
      "palette": {
        "skyTop": "#080513",
        "skyBottom": "#221739",
        "ground": "#2f213d",
        "turf": "#b9a45f",
        "doorClosed": "#3f2f54",
        "doorOpen": "#f4da8e",
        "accent": "#d8c06a",
        "terrainStyle": "world7",
        "blockShade": "rgba(0,0,0,0.78)",
        "blockHighlight": "rgba(248,220,140,0.18)",
        "blockAccent": "#8d7645"
      },
      "screens": [
        {
          "name": "Timepiece Spine",
          "description": "Layered cogs jut out as you weave between support braces.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##..####...####.>#####..####..##",
              "##.#####...####.........###...##",
              "##...####...###..........###..##",
              "##..#####...###..####....##...##",
              "##....#####..###..#####.......##",
              "##...######..###..####........##",
              "##.....#####..###..#####......##",
              "##....######2.###..####.......##",
              "##......#####..###..#####.....##",
              "##.....######..###..####......##",
              "##.......#####..###..#####....##",
              "##......######1.###..####.....##",
              "##........#####..#########....##",
              "##.......######..########.....##",
              "##.........####...###.........##",
              "##........######..###.......####",
              "##..........####........########",
              "##..........###.........###...##",
              "##........#####..###..#####...##",
              "##.........####..###.3###.....##",
              "##.......#####..###..###......##",
              "##.......3####..###..####.....##",
              "##......#####..###..###.......##",
              "##.......####..###..####......##",
              "##.....#####..###..###........##",
              "##......####..###..####.......##",
              "##....#####..###..###..2......##",
              "##.....####..###..####........##",
              "##...#####..###.4###..........##",
              "##....####..###..####.........##",
              "##..#####..###..###...........##",
              "##...####..###..####..........##",
              "##........###..###............##",
              "##<.......###..###............##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "2": {
                "enemy": {
                  "kind": "timeWraith"
                }
              },
              "3": {
                "enemy": {
                  "kind": "echoSlinger"
                }
              },
              "4": {
                "enemy": {
                  "kind": "mirageLancer"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 11, "row": 18, "offsetY": 0 },
              { "type": "chronosphere", "col": 21, "row": 26, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "chronoglassOracle", "count": 1 },
            { "kind": "echoSlinger", "count": 2 },
            { "kind": "mirageLancer", "count": 1 },
            { "kind": "timeWraith", "count": 2 }
          ]
        },
        {
          "name": "Echo Gallery",
          "description": "Resonant halls curve around a suspended gear heart.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##..........##..........##....##",
              "##.>........##...........#....##",
              "########..........##.....#....##",
              "########..........##....##....##",
              "##....##....##....##.....#....##",
              "##....##....##....##.....#....##",
              "##....##....##....##....##....##",
              "##....##....##...........#....##",
              "##....##....##...........#....##",
              "##....##..........##....##....##",
              "##...........1....##....##....##",
              "##..........##....##....##....##",
              "##....##..........##....##....##",
              "##....##..........##....##....##",
              "##....##....##..........##....##",
              "##....##.2..##..........##....##",
              "##....##................##....##",
              "##.........3ss....##.......3..##",
              "##..........##....##..........##",
              "##.................1....##....##",
              "##....##................##....##",
              "##....##..........##....##....##",
              "##....##....##..........##....##",
              "##....##....##........2.......##",
              "##....##....##................##",
              "##....##....##....##.3........##",
              "##....##....##....##....##....##",
              "##....##..........##..........##",
              "##....##..........##..........##",
              "##............................##",
              "##..........##..........##....##",
              "##....<.....##..........##....##",
              "##....##....##....##....##....##",
              "##ssss##ssss##ssss##ssss##ssss##",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "2": {
                "enemy": {
                  "kind": "glyphGyre"
                }
              },
              "3": {
                "enemy": {
                  "kind": "timeWraith"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 8, "row": 14, "offsetY": 0 },
              { "type": "chronosphere", "col": 16, "row": 22, "offsetY": 0 },
              { "type": "chronosphere", "col": 24, "row": 14, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "chronoglassOracle", "count": 2 },
            { "kind": "glyphGyre", "count": 2 },
            { "kind": "timeWraith", "count": 3 }
          ]
        }
      ]
    } },
  { file: "level_6_4.json", data: {
      "id": "clocktowerCrown",
      "name": "Clocktower Crown",
      "description": "Reach the clock chamber and confront the tower's timekeeping core.",
      "map": {
        "x": 0.05,
        "y": 0.5,
        "order": "XXIV",
        "branch": "world7",
        "branchStep": 4
      },
      "playable": true,
      "stageNumber": 28,
      "color": "#f0d28c",
      "layout": {
        "tileSize": 64,
        "cols": 32,
        "rows": 36,
        "tiles": [
              "#################################",
              "#####...........>..........######",
              "#####......................######",
              "######....................#######",
              "###...........................###",
              "###...........................###",
              "####.........................####",
              "#..............................##",
              "#...............#..............##",
              "##..............#.............###",
              "#...............#..............##",
              "#......#.......###.......#.....##",
              "##......#....#######....#.....###",
              "#........#.####...####.#.......##",
              "#.........###........##........##",
              "##........##.........##.......###",
              "#........##...........##.......##",
              "#........##.....#.....##.......##",
              "##......##.....###.....##.....###",
              "#....#####....#####....#####...##",
              "#.......##.....###.....##......##",
              "##.......##.....#.....##......###",
              "#........##...........##.......##",
              "#.........##.........##........##",
              "##........###.......###.......###",
              "#..........####...####.#.......##",
              "#.........#..#######....#......##",
              "###......#.....###.......#....###",
              "###.....#.......#.............###",
              "####............#............####",
              "#####...........#...........#####",
              "######.....................######",
              "########........<.......#########",
              "#################################",
              "#################################",
              "#################################"
        ]
      },
      "palette": {
        "skyTop": "#120a1c",
        "skyBottom": "#2e1b3a",
        "ground": "#362144",
        "turf": "#f0d28c",
        "doorClosed": "#4a325a",
        "doorOpen": "#ffe9a6",
        "accent": "#ffd77a",
        "terrainStyle": "world7",
        "blockShade": "rgba(0,0,0,0.8)",
        "blockHighlight": "rgba(255,231,160,0.24)",
        "blockAccent": "#8f7142"
      },
      "screens": [
        {
          "name": "Clocktower Vestibule",
          "description": "A final maintenance shaft climbs toward the chamber dome.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "####.........##.....############",
              "####.........##....>############",
              "#####..#####..##..##############",
              "#####..#####..##..##############",
              "##.###..#####..##..#############",
              "##.###..#####..##..#############",
              "##..###..#####..##..############",
              "##..###..#####..##..############",
              "###..###..#####..##..###########",
              "###..###3.#####..##..###########",
              "####..###..#####..##..##########",
              "####..###..#####1.##..##########",
              "#####..###..#####..##...########",
              "#####..###..#####..###..########",
              "######..###..####..###..########",
              "######..###.2####..##..3########",
              "#####..###..####..###..#########",
              "#####..###..####..###..#########",
              "####..###..####..###..##########",
              "####..###..####..###..##########",
              "###..###..####..###..###########",
              "###..###..####..###..###########",
              "##..###..####..###..############",
              "##..###..####..###2.############",
              "##.###..####..###..#############",
              "##.###..####..###..#############",
              "#####..####..###..##############",
              "#####..####..###..##############",
              "##....####..###..###############",
              "##....####..###..###############",
              "##...####..###..################",
              "##...####..###..################",
              "##..####.......#################",
              "##<.####.......#################",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "chronoglassOracle"
                }
              },
              "2": {
                "enemy": {
                  "kind": "timeWraith"
                }
              },
              "3": {
                "enemy": {
                  "kind": "echoSlinger"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 9, "row": 14, "offsetY": 0 },
              { "type": "chronosphere", "col": 23, "row": 22, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "echoSlinger", "count": 2 },
            { "kind": "chronoglassOracle", "count": 1 },
            { "kind": "timeWraith", "count": 2 }
          ]
        },
        {
          "name": "Aeternum Clockface",
          "description": "Fight within the clock chamber beneath the looming mechanism.",
          "layout": {
            "tileSize": 64,
            "cols": 32,
            "rows": 36,
            "tiles": [
              "################################",
              "##..########....>...########..##",
              "##.########..........########.##",
              "##.#####..##........##..#####.##",
              "#######...##........##...#######",
              "######...###......#####...######",
              "######...###........###...######",
              "######....###......###....######",
              "######.....###....###.....######",
              "######......#......#......######",
              "######......#......#......######",
              "######.....###....###.....######",
              "######....###......###....######",
              "######...####.......###...######",
              "######...######....####...######",
              "######....###......###....######",
              "######.....###....###.....######",
              "######......#......#......######",
              "######.....1#......#......######",
              "######.....###....###.....######",
              "######....###......###1...######",
              "######...###.......####...######",
              "######...####....######...######",
              "######....###......###....######",
              "######.....###....###.....######",
              "######......#......#......######",
              "######......#......#......######",
              "######.....###....###.....######",
              "######....###...1..###....######",
              "######...####......####...######",
              "######...######....####...######",
              "######....###......###....######",
              "######.....###....###.....######",
              "######......#..<...#......######",
              "######......#......#......######",
              "################################"
            ],
            "symbolLegend": {
              "1": {
                "enemy": {
                  "kind": "timeWraith"
                }
              }
            },
            "objects": [
              { "type": "chronosphere", "col": 9, "row": 16, "offsetY": 0 },
              { "type": "chronosphere", "col": 16, "row": 24, "offsetY": 0 },
              { "type": "chronosphere", "col": 23, "row": 16, "offsetY": 0 }
            ]
          },
          "enemies": [
            { "kind": "timeWraith", "count": 3 }
          ],
          "boss": {
            "name": "Psi Skywarden",
            "kind": "psiSkyRanger",
            "hp": 320,
            "weapon": "bow",
            "attack": 130,
            "defense": 54,
            "attackRange": 600,
            "preferredRange": 340,
            "behavior": "psiRanger",
            "psiFloatDuration": 1.2,
            "psiFloatHoverForce": 26000,
            "psiFloatHoverDamp": 3600,
            "psiDiveCooldown": 2.2,
            "psiFloatRangeBias": 0.85,
            "headSigil": "psi",
            "headSigilColor": "#f3edff",
            "speedMult": 1.04,
            "element": "light",
            "isBoss": true
          }
        }
      ]
    } },

];

const WORLD_MAP_NODE_OVERRIDES = (() => {
  const root = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof window !== 'undefined'
      ? window
      : (typeof self !== 'undefined'
        ? self
        : null));
  if(root){
    if(!root.WORLD_MAP_NODE_OVERRIDES || typeof root.WORLD_MAP_NODE_OVERRIDES !== 'object'){
      root.WORLD_MAP_NODE_OVERRIDES = Object.create(null);
    }
    return root.WORLD_MAP_NODE_OVERRIDES;
  }
  return Object.create(null);
})();

const WORLD_STAGE_COUNT = 5;

const WORLD_BOSS_STAGE_LAYOUTS = {
  1: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  2: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  3: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  4: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  5: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  6: {
    tileSize: 64,
    cols: 36,
    rows: 22,
    tiles: [
      "####################################",
      "####################################",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##................................##",
      "##.<............................>.##",
      "##................................##",
      "####################################",
      "####################################"
    ]
  },
  7: {
    tileSize: 64,
    cols: 24,
    rows: 10,
    tiles: [
      "########################",
      "#....###..........###..#",
      "#...####........####...#",
      "#..#####......#####....#",
      "#....<..###....###..>..#",
      "#..#####......#####....#",
      "#...####........####...#",
      "#....###..........###..#",
      "#......................#",
      "########################"
    ]
  },
  8: {
    tileSize: 64,
    cols: 24,
    rows: 10,
    tiles: [
      "########################",
      "#...###..........###...#",
      "#....###........###....#",
      "#.....###......###.....#",
      "#......<..####..>......#",
      "#.....###......###.....#",
      "#....###........###....#",
      "#...###..........###...#",
      "#......................#",
      "########################"
    ]
  }
};

const WORLD_BOSS_STAGE_CONFIGS = [
  {
    world: 1,
    id: 'world1Stage5',
    file: 'level_1_5.json',
    name: 'Verdant Castellum',
    description: 'Enter the sealed atrium to challenge the Psi Skywarden.',
    map: { x: 0.62, y: 0.06, order: '◎' },
    screenName: "Castellan's Arena",
    screenDescription: 'The air now crackles with psionic archery trials.',
    boss: {
      name: 'Psi Skywarden',
      kind: 'psiSkyRanger',
      hp: 320,
      weapon: 'bow',
      attack: 130,
      defense: 54,
      attackRange: 600,
      preferredRange: 340,
      behavior: 'psiRanger',
      psiFloatDuration: 1.2,
      psiFloatHoverForce: 26000,
      psiFloatHoverDamp: 3600,
      psiDiveCooldown: 2.2,
      psiFloatRangeBias: 0.85,
      headSigil: 'psi',
      headSigilColor: '#f3edff',
      speedMult: 1.04,
      element: 'light',
      isBoss: true
    }
  },
  {
    world: 2,
    id: 'world2Stage5',
    file: 'level_2_5.json',
    name: 'Glacier Keep',
    description: 'A silent battlement awaits its warden.',
    map: { x: 0.88, y: 0.12, order: '◎' },
    screenName: 'Vacant Battlements',
    screenDescription: 'Frost gathers in the empty arena.',
    boss: {
      name: 'Epsilon Cryowarden',
      kind: 'epsilonCryowarden',
      weapon: 'epsilonFrostSigil',
      hp: 420,
      attack: 98,
      defense: 60,
      attackRange: 640,
      preferredRange: 420,
      behavior: 'epsilonCryomancer',
      headSigil: 'epsilon',
      headSigilColor: '#d9f3ff',
      bodyColor: '#a7d6ff',
      accentColor: '#2c5f85',
      element: 'ice',
      isBoss: true,
      iceVolleySize: 3, // Number of pillars created in each volley.
      iceVolleySpacing: 140, // Horizontal spacing between sequential pillars (pixels).
      iceVolleyInterval: 0.42, // Seconds between pillar spawns inside a volley.
      iceVolleyWarmup: 0.75, // Seconds spent charging before the first pillar appears.
      iceVolleyRecovery: 2.4, // Recovery duration before movement resumes.
      iceVolleyCooldown: 3.2, // Cooldown between full volleys once recovery finishes.
      icePillarDamage: 44, // Damage dealt every tick while a pillar is active.
      icePillarRadius: 58, // Effective radius used to damage/slow intruders.
      icePillarHeight: 150, // Visual height of each pillar sprite (pixels).
      icePillarChargeTime: 0.65, // Seconds pillars spend warning players before striking.
      icePillarDuration: 2100, // Milliseconds each pillar remains after charging.
      icePillarSlowMultiplier: 0.45, // Movement multiplier applied to victims.
      icePillarSlowDuration: 1800, // Milliseconds the slow effect persists.
      description: 'An epsilon-marked cryoknight that carpets the arena with punishing ice pillars.'
    }
  },
  {
    world: 3,
    id: 'world3Stage5',
    file: 'level_3_5.json',
    name: 'Ashen Reliquary',
    description: 'The magma throne room lies vacant for now.',
    map: { x: 0.94, y: 0.4, order: '◎' },
    screenName: 'Dormant Crucible',
    screenDescription: 'Heat shimmers across an expectant arena.'
  },
  {
    world: 4,
    id: 'world4Stage5',
    file: 'level_4_5.json',
    name: 'Tidal Reliquary',
    description: 'Pressure doors seal an unused leviathan dock.',
    map: { x: 0.8811, y: 0.8811, order: '◎' },
    screenName: 'Floodgate Oculus',
    screenDescription: 'Waves lap at the empty chamber walls.'
  },
  {
    world: 5,
    id: 'world5Stage5',
    file: 'level_5_5.json',
    name: 'Phi Sun Reliquary',
    description: 'Descend beneath the dunes to face the luminary guarding the pyramid core.',
    map: { x: 0.5, y: 0.98, order: '◎' },
    screenName: 'Lightless Apex',
    screenDescription: 'Shadowed sandstone walls wait to flare alive with solar wrath.',
    boss: {
      name: 'Phi Sun Hierophant',
      kind: 'phiSunPriest',
      weapon: 'phiSolarSigil',
      hp: 520,
      attack: 112,
      defense: 68,
      attackRange: 720,
      preferredRange: 420,
      behavior: 'phiSunPriest',
      headSigil: 'phi',
      headSigilColor: '#ffe8b0',
      bodyColor: '#f5d180',
      accentColor: '#fff2c1',
      element: 'light',
      speedMult: 1.02,
      vanishDuration: 0.65,
      reappearDuration: 0.45,
      vanishCooldown: 3.6,
      cageCooldown: 8.2,
      cageBlockSize: 36,
      cageHealth: 260,
      teleportRadius: 320,
      burstShots: 5,
      burstInterval: 0.28,
      lightBurstColor: 'rgba(255, 232, 176, 0.9)',
      description: 'A phi-marked luminary that slips through shadow before sealing foes inside radiant sandstone prisons.'
    }
  },
  {
    world: 6,
    id: 'world6Stage5',
    file: 'level_6_5.json',
    name: 'Obsidian Amphitheater',
    description: 'A basalt amphitheater echoes without an opponent.',
    map: { x: 0.1189, y: 0.8811, order: '◎' },
    color: '#ff5f70',
    paletteOverrides: {
      skyTop: '#0b040c',
      skyBottom: '#1a0b18',
      ground: '#2b0f1c',
      turf: '#ff5f70',
      doorClosed: '#2d111b',
      doorOpen: '#ff92b3',
      accent: '#ffd7a6',
      terrainStyle: 'world6',
      blockShade: 'rgba(0,0,0,0.8)',
      blockHighlight: 'rgba(255,110,150,0.26)',
      blockAccent: '#ff9fbf'
    },
    darkness: { opacity: 1, color: '#000000' },
    screenName: 'Harmonic Stage',
    screenDescription: 'Crystalline spires hum over the empty arena.',
    boss: {
      name: 'Theta Harmonic',
      kind: 'thetaHarmonic',
      weapon: 'enemyDagger',
      hp: 560,
      attack: 136,
      defense: 72,
      behavior: 'thetaHarmonic',
      renderStyle: 'thetaHarmonic',
      showWeapon: false,
      element: 'light',
      physicsType: 'nonStick',
      hitboxWidth: 148,
      hitboxHeight: 148,
      hitboxShape: 'ellipse',
      hoverHeight: 0,
      thetaLineCount: 4,
      thetaBaseLineCount: 3,
      thetaMinLineCount: 3,
      thetaMaxLineCount: 10,
      thetaLineRange: 640,
      thetaLineExtendSpeed: 580,
      thetaLineRetractSpeed: 540,
      thetaLineDamageRadius: 34,
      thetaLineDamageInterval: 0.24,
      thetaChargeTime: 1,
      thetaTelegraphTime: 1,
      thetaBeamFlashTime: 0.32,
      thetaBeamDuration: 2.6,
      thetaRecoverTime: 1.45,
      thetaRelocateBias: 0.75,
      thetaLineWidth: 22,
      description: 'A glitching theta sigil that lashes intruders with retracting harmonic filaments of light.'
    }
  },
  {
    world: 7,
    id: 'world7Stage5',
    file: 'level_7_5.json',
    name: 'Chrono Apex',
    description: 'The tower apex primes for its future guardian.',
    map: { x: 0.06, y: 0.4, order: '◎' },
    screenName: 'Temporal Oculus',
    screenDescription: 'Clockwork ticks echo across the silent floor.'
  },
  {
    world: 8,
    id: 'world8Stage5',
    file: 'level_8_5.json',
    name: 'Parallax Nexus',
    description: 'A void chamber awaits the next adversary.',
    map: { x: 0.1189, y: 0.1189, order: '◎' },
    screenName: 'Null Arena',
    screenDescription: 'Gravity wavers in the vacant nexus.'
  }
];

function cloneLayoutTemplate(template){
  return {
    tileSize: template.tileSize,
    cols: template.cols,
    rows: template.rows,
    tiles: template.tiles.slice()
  };
}

function deepClone(value){
  if(value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

(function configureWorldBossStages(){
  const originalEntries = RAW_LEVEL_DATA.slice();
  const stageFourByWorld = new Map();
  const stageFourBossByWorld = new Map();

  for(const entry of originalEntries){
    const data = entry?.data;
    if(!data || typeof data !== 'object') continue;
    const map = data.map;
    if(!map || typeof map.branch !== 'string') continue;
    const match = /^world(\d+)$/.exec(map.branch);
    if(!match) continue;
    const worldIndex = Number(match[1]);
    const branchStep = Number(map.branchStep);
    if(branchStep === 4){
      stageFourByWorld.set(worldIndex, data);
      if(data.bossStage) data.bossStage = false;
      if(map.boss) delete map.boss;
      if(Object.prototype.hasOwnProperty.call(map, 'order')){
        map.order = null;
      }
      if(Array.isArray(data.screens)){
        for(const screen of data.screens){
          if(screen && typeof screen === 'object' && screen.boss){
            if(!stageFourBossByWorld.has(worldIndex)){
              stageFourBossByWorld.set(worldIndex, deepClone(screen.boss));
            }
            delete screen.boss;
          }
        }
      }
    }
  }

  const stageConfigByWorld = new Map();
  for(const config of WORLD_BOSS_STAGE_CONFIGS){
    stageConfigByWorld.set(config.world, config);
  }

  const stageImports = [
    {
      world: 1,
      file: 'level_1_5.json',
      id: 'world1Stage5',
      stageNumber: 5,
      color: '#68e0a3',
      name: 'Verdant Castellum',
      description: 'Enter the sealed atrium to challenge the Psi Skywarden.',
      screenName: "Castellan's Arena",
      screenDescription: 'The air now crackles with psionic archery trials.',
      screens: [
        {
          name: "Castellan's Arena",
          description: 'The air now crackles with psionic archery trials.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 2,
      file: 'level_2_5.json',
      id: 'world2Stage5',
      stageNumber: 10,
      color: '#5bbcf7',
      name: 'Glacier Keep',
      description: 'A silent battlement awaits its warden.',
      screenName: 'Vacant Battlements',
      screenDescription: 'Frost gathers in the empty arena.',
      screens: [
        {
          name: 'Vacant Battlements',
          description: 'Frost gathers in the empty arena.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 3,
      file: 'level_3_5.json',
      id: 'world3Stage5',
      stageNumber: 15,
      color: '#ff8245',
      name: 'Ashen Reliquary',
      description: 'The magma throne room lies vacant for now.',
      screenName: 'Dormant Crucible',
      screenDescription: 'Heat shimmers across an expectant arena.',
      screens: [
        {
          name: 'Dormant Crucible',
          description: 'Heat shimmers across an expectant arena.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 4,
      file: 'level_4_5.json',
      id: 'world4Stage5',
      stageNumber: 20,
      color: '#3a9bff',
      name: 'Tidal Reliquary',
      description: 'Pressure doors seal an unused leviathan dock.',
      screenName: 'Floodgate Oculus',
    screenDescription: 'Waves lap at the empty chamber walls.',
    boss: {
      name: 'Omega Tide Leviathan',
      kind: 'glyphLeviathan',
      weapon: 'enemyDagger',
      hp: 720,
      attack: 128,
      defense: 74,
      attackRange: 720,
      preferredRange: 360,
      behavior: 'glyphLeviathan',
      renderStyle: 'glyphLeviathan',
      showWeapon: false,
      bodyColor: '#101c2a',
      accentColor: '#8bd0ff',
      element: 'water',
      requiresWater: true,
      waterSoft: true,
      swimForce: 4600,
      swimBuoyancy: 6200,
      swimDrag: 3.2,
      swimDamp: 2.8,
      swimDepth: 68,
      salmonLength: 192,
      salmonHeight: 68,
      bubbleShieldHp: 240,
      bubbleShieldRegenDelay: 4.5,
      bubbleShieldRegenRate: 62,
      glyphVolleyCount: 6,
      glyphVolleyInterval: 0.3,
      glyphVolleySpread: 0.18,
      glyphVolleyCooldown: 5.6,
      spikeChargeWindup: 0.8,
      spikeChargeDuration: 1.4,
      spikeChargeForce: 102000,
      spikeChargeCooldown: 6.8,
      spikeBurstProjectiles: 8,
      spikeBurstDamageScale: 1.05,
      description: 'A titanic glyph salmon encased in a regenerating bubble shield that shreds intruders with sigil volleys before ramming them with spinning spike fins.'
    },
    screens: [
        {
          name: 'Floodgate Oculus',
          description: 'Waves lap at the empty chamber walls.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 5,
      file: 'level_5_5.json',
      id: 'world5Stage5',
      stageNumber: 25,
      color: '#f1d86a',
      name: 'Phi Sun Reliquary',
      description: 'Descend beneath the dunes to face the luminary guarding the pyramid core.',
      screenName: 'Lightless Apex',
      screenDescription: 'Shadowed sandstone walls wait to flare alive with solar wrath.',
      screens: [
        {
          name: 'Lightless Apex',
          description: 'Shadowed sandstone walls wait to flare alive with solar wrath.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 6,
      file: 'level_6_5.json',
      id: 'world6Stage5',
      stageNumber: 30,
      color: '#ff5f70',
      name: 'Obsidian Amphitheater',
      description: 'A basalt amphitheater echoes without an opponent.',
      screenName: 'Harmonic Stage',
      screenDescription: 'Crystalline spires hum over the empty arena.',
      screens: [
        {
          name: 'Harmonic Stage',
          description: 'Crystalline spires hum over the empty arena.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 7,
      file: 'level_7_5.json',
      id: 'world7Stage5',
      stageNumber: 35,
      color: '#f0d28c',
      name: 'Chrono Apex',
      description: 'The tower apex primes for its future guardian.',
      screenName: 'Temporal Oculus',
      screenDescription: 'Clockwork ticks echo across the silent floor.',
      screens: [
        {
          name: 'Temporal Oculus',
          description: 'Clockwork ticks echo across the silent floor.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    },
    {
      world: 8,
      file: 'level_8_5.json',
      id: 'world8Stage5',
      stageNumber: 40,
      color: '#7a63ff',
      name: 'Parallax Nexus',
      description: 'A void chamber awaits the next adversary.',
      screenName: 'Null Arena',
      screenDescription: 'Gravity wavers in the vacant nexus.',
      screens: [
        {
          name: 'Null Arena',
          description: 'Gravity wavers in the vacant nexus.',
          layout: {
            tileSize: 64,
            cols: 36,
            rows: 22,
            tiles: [
              "####################################",
              "####################################",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##................................##",
              "##.........................1......##",
              "##................................##",
              "##.<............................>.##",
              "##................................##",
              "####################################",
              "####################################"
            ]
          },
          enemies: []
        }
      ]
    }
  ];

  const stageIdsToReplace = new Set(stageImports.map(stage => stage.id));
  for(let i = RAW_LEVEL_DATA.length - 1; i >= 0; i--){
    const entry = RAW_LEVEL_DATA[i];
    if(entry && entry.data && stageIdsToReplace.has(entry.data.id)){
      RAW_LEVEL_DATA.splice(i, 1);
    }
  }

  for(const stageImport of stageImports){
    const stageConfig = stageConfigByWorld.get(stageImport.world);
    if(!stageConfig) continue;
    const stageFour = stageFourByWorld.get(stageImport.world);

    const stageData = {
      id: stageImport.id ?? stageConfig.id,
      name: stageImport.name ?? stageConfig.name,
      description: stageImport.description ?? stageConfig.description,
      playable: true,
      stageNumber: stageImport.stageNumber ?? stageImport.world * 5,
      bossStage: true
    };

    if(stageImport.color){
      stageData.color = stageImport.color;
    }else if(stageConfig.color){
      stageData.color = stageConfig.color;
    }else if(stageFour && stageFour.color){
      stageData.color = stageFour.color;
    }

    const map = Object.assign(
      {},
      stageConfig.map ? { x: stageConfig.map.x, y: stageConfig.map.y } : {},
      stageImport.map ?? {}
    );
    map.label = map.label ?? `${stageImport.world}-5`;
    map.order = map.order ?? (stageConfig.map && Object.prototype.hasOwnProperty.call(stageConfig.map, 'order') ? stageConfig.map.order : '◎');
    if(map.order == null){
      map.order = '◎';
    }
    map.branch = map.branch ?? `world${stageImport.world}`;
    map.branchStep = 5;
    map.boss = true;
    stageData.map = map;

    const layoutTemplate = stageImport.layout ?? WORLD_BOSS_STAGE_LAYOUTS[stageImport.world] ?? DEFAULT_BOSS_STAGE_LAYOUT_TEMPLATE;
    stageData.layout = cloneLayoutTemplate(layoutTemplate);

    let palette = null;
    if(stageImport.palette){
      palette = deepClone(stageImport.palette);
    }else if(stageFour && stageFour.palette){
      palette = deepClone(stageFour.palette);
    }
    if(stageConfig.paletteOverrides){
      if(!palette) palette = {};
      Object.assign(palette, stageConfig.paletteOverrides);
    }
    if(palette){
      stageData.palette = palette;
    }

    if(stageImport.darkness){
      stageData.darkness = deepClone(stageImport.darkness);
    }else if(stageFour && stageFour.darkness){
      stageData.darkness = deepClone(stageFour.darkness);
    }

    stageData.screenName = stageImport.screenName ?? stageConfig.screenName ?? stageData.name;
    stageData.screenDescription = stageImport.screenDescription ?? stageConfig.screenDescription ?? stageData.description;

    const screens = [];
    if(Array.isArray(stageImport.screens) && stageImport.screens.length > 0){
      for(const screenImport of stageImport.screens){
        const screen = {
          name: screenImport.name ?? stageData.screenName,
          description: screenImport.description ?? stageData.screenDescription,
          layout: screenImport.layout ? cloneLayoutTemplate(screenImport.layout) : cloneLayoutTemplate(stageData.layout),
          enemies: Array.isArray(screenImport.enemies) ? screenImport.enemies.map(deepClone) : []
        };
        if(screenImport.symbolLegend){
          screen.symbolLegend = deepClone(screenImport.symbolLegend);
        }
        if(screenImport.objects){
          screen.objects = deepClone(screenImport.objects);
        }
        screens.push(screen);
      }
    }else{
      screens.push({
        name: stageData.screenName,
        description: stageData.screenDescription,
        layout: cloneLayoutTemplate(stageData.layout),
        enemies: []
      });
    }
    stageData.screens = screens;

    const enemyNumbers = stageImport.enemyNumbers ? deepClone(stageImport.enemyNumbers) : {};
    const bossNumber = stageImport.bossNumber ?? '1';
    let bossData = stageImport.boss ? deepClone(stageImport.boss) : null;
    if(!bossData && stageConfig.boss){
      bossData = deepClone(stageConfig.boss);
    }
    if(!bossData && stageFourBossByWorld.has(stageImport.world)){
      bossData = deepClone(stageFourBossByWorld.get(stageImport.world));
    }
    if(bossData){
      if(!bossData.isBoss) bossData.isBoss = true;
      enemyNumbers[bossNumber] = bossData;
    }
    if(Object.keys(enemyNumbers).length > 0){
      stageData.enemyNumbers = enemyNumbers;
    }

    RAW_LEVEL_DATA.push({
      file: stageImport.file ?? stageConfig.file,
      data: stageData
    });
  }
})();

(function extendWorldMapNodeOverrides(){
  const stage5Overrides = {
    world1Stage5: {
      stageCode: '1-5',
      bossStage: true,
      map: { x: 0.62, y: 0.06, label: '1-5', order: '◎', branch: 'world1', branchStep: 5, boss: true }
    },
    world2Stage5: {
      stageCode: '2-5',
      bossStage: true,
      map: { x: 0.88, y: 0.12, label: '2-5', order: '◎', branch: 'world2', branchStep: 5, boss: true }
    },
    world3Stage5: {
      stageCode: '3-5',
      bossStage: true,
      map: { x: 0.94, y: 0.4, label: '3-5', order: '◎', branch: 'world3', branchStep: 5, boss: true }
    },
    world4Stage5: {
      stageCode: '4-5',
      bossStage: true,
      map: { x: 0.8811, y: 0.8811, label: '4-5', order: '◎', branch: 'world4', branchStep: 5, boss: true }
    },
    world5Stage5: {
      stageCode: '5-5',
      bossStage: true,
      map: { x: 0.5, y: 0.98, label: '5-5', order: '◎', branch: 'world5', branchStep: 5, boss: true }
    },
    world6Stage5: {
      stageCode: '6-5',
      bossStage: true,
      map: { x: 0.1189, y: 0.8811, label: '6-5', order: '◎', branch: 'world6', branchStep: 5, boss: true }
    },
    world7Stage5: {
      stageCode: '7-5',
      bossStage: true,
      map: { x: 0.06, y: 0.4, label: '7-5', order: '◎', branch: 'world7', branchStep: 5, boss: true }
    },
    world8Stage5: {
      stageCode: '8-5',
      bossStage: true,
      map: { x: 0.1189, y: 0.1189, label: '8-5', order: '◎', branch: 'world8', branchStep: 5, boss: true }
    }
  };

  for(const key in stage5Overrides){
    WORLD_MAP_NODE_OVERRIDES[key] = stage5Overrides[key];
  }

  const stage4Ids = ['world2Stage4', 'world3Stage4', 'stage12', 'stage8', 'stage16', 'clocktowerCrown', 'parallaxModel'];
  for(const id of stage4Ids){
    const override = WORLD_MAP_NODE_OVERRIDES[id];
    if(override){
      if(override.bossStage) delete override.bossStage;
      if(override.map && override.map.boss) delete override.map.boss;
      if(override.map && Object.prototype.hasOwnProperty.call(override.map, 'order') && override.map.order === '◎'){
        override.map.order = null;
      }
    }
  }

  const stageCodeOverrides = {
    // World 1 – Verdant Marches arc.
    stage1: { stageCode: '1-1', map: { label: '1-1' } },
    world1Stage2: { stageCode: '1-2', map: { label: '1-2' } },
    world1Stage3: { stageCode: '1-3', map: { label: '1-3' } },
    stage5: { stageCode: '1-4', map: { label: '1-4' } },
    // World 2 – Frostwind Range arc.
    stage2: { stageCode: '2-1', map: { label: '2-1' } },
    world2Stage2: { stageCode: '2-2', map: { label: '2-2' } },
    world2Stage3: { stageCode: '2-3', map: { label: '2-3' } },
    world2Stage4: { stageCode: '2-4', map: { label: '2-4' } },
    // World 3 – Cinder Depths arc.
    stage3: { stageCode: '3-1', map: { label: '3-1' } },
    world3Stage2: { stageCode: '3-2', map: { label: '3-2' } },
    world3Stage3: { stageCode: '3-3', map: { label: '3-3' } },
    world3Stage4: { stageCode: '3-4', map: { label: '3-4' } },
    // World 4 – Abyssal Dominion arc.
    stage6: { stageCode: '4-1', map: { label: '4-1' } },
    stage10: { stageCode: '4-2', map: { label: '4-2' } },
    stage11: { stageCode: '4-3', map: { label: '4-3' } },
    stage12: { stageCode: '4-4', map: { label: '4-4' } },
    // World 5 – Sunscorched Dominion arc.
    stage9: { stageCode: '5-1', map: { label: '5-1' } },
    world5Stage2: { stageCode: '5-2', map: { label: '5-2' } },
    world5Stage3: { stageCode: '5-3', map: { label: '5-3' } },
    stage8: { stageCode: '5-4', map: { label: '5-4' } },
    // World 6 – Obsidian Warrens arc.
    stage13: { stageCode: '6-1', map: { label: '6-1' } },
    stage14: { stageCode: '6-2', map: { label: '6-2' } },
    stage15: { stageCode: '6-3', map: { label: '6-3' } },
    stage16: { stageCode: '6-4', map: { label: '6-4' } },
    // World 7 – Chronotower ascent.
    chronometricSanctum: { stageCode: '7-1', map: { label: '7-1' } },
    pendulumEngine: { stageCode: '7-2', map: { label: '7-2' } },
    gearspireAscent: { stageCode: '7-3', map: { label: '7-3' } },
    clocktowerCrown: { stageCode: '7-4', map: { label: '7-4' } },
    // World 8 – Void frontier.
    betweenTimeHall: { stageCode: '8-1', map: { label: '8-1' } },
    voidSpiralApproach: { stageCode: '8-2', map: { label: '8-2' } },
    voidRiftGalleries: { stageCode: '8-3', map: { label: '8-3' } },
    voidParallaxSanctum: { stageCode: '8-4', map: { label: '8-4' } },
    // Secret stages – mark as special encounters.
    canopySentinelTrial: { stageCode: '1-3-S', map: { label: '1-3-S' } },
    stage7: { stageCode: '7-2-S', map: { label: '7-2-S' } },
    neonCitadel: { stageCode: '8-1-S', map: { label: '8-1-S' } }
  };

  for(const id in stageCodeOverrides){
    if(!Object.prototype.hasOwnProperty.call(stageCodeOverrides, id)) continue;
    const override = stageCodeOverrides[id];
    const existing = WORLD_MAP_NODE_OVERRIDES[id];
    if(existing){
      const merged = { ...existing };
      if(override.stageCode !== undefined){
        merged.stageCode = override.stageCode;
      }
      if(override.map){
        merged.map = { ...(existing.map || {}) };
        for(const key in override.map){
          merged.map[key] = override.map[key];
        }
      }
      WORLD_MAP_NODE_OVERRIDES[id] = merged;
    }else{
      const cloned = { ...override };
      if(override.map){
        cloned.map = { ...override.map };
      }
      WORLD_MAP_NODE_OVERRIDES[id] = cloned;
    }
  }
})();

function roundToPrecision(value, decimals=4){
  if(!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function getWorldMapBranchStepIndex(step, stageCount){
  if(!Number.isFinite(step) || step <= 0) return null;
  const normalized = Math.floor(step);
  if(normalized <= 0) return null;
  return normalized >= stageCount ? normalized + 1 : normalized;
}

function restoreDefaultWorldMapNodePositions(levelDefs){
  if(!Array.isArray(levelDefs) || !levelDefs.length) return;
  const stageCount = Number.isFinite(WORLD_STAGE_COUNT) && WORLD_STAGE_COUNT > 0
    ? Math.floor(WORLD_STAGE_COUNT)
    : 5;
  const centerX = 0.5;
  const centerY = 0.5;
  const branches = new Map();

  for(const def of levelDefs){
    if(!def || typeof def !== 'object') continue;
    const map = def.map;
    if(!map || typeof map !== 'object') continue;
    if(map.standalone || def.standalone) continue;
    const branch = typeof map.branch === 'string' ? map.branch.trim() : '';
    if(!branch || !/^world\d+$/i.test(branch)) continue;
    const rawStep = Number(map.branchStep);
    const stepIndex = getWorldMapBranchStepIndex(rawStep, stageCount);
    if(!stepIndex) continue;
    const key = branch.toLowerCase();
    let bucket = branches.get(key);
    if(!bucket){
      bucket = [];
      branches.set(key, bucket);
    }
    bucket.push({ def, map, rawStep, stepIndex });
  }

  for(const bucket of branches.values()){
    if(!bucket.length) continue;
    let anchor = null;
    for(const entry of bucket){
      if(!anchor
        || entry.stepIndex > anchor.stepIndex
        || (entry.stepIndex === anchor.stepIndex
          && ((entry.map && entry.map.boss) || entry.def?.bossStage))){
        anchor = entry;
      }
    }
    if(!anchor) continue;
    const anchorX = Number(anchor.map?.x);
    const anchorY = Number(anchor.map?.y);
    if(!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) continue;
    const stepIndex = anchor.stepIndex;
    if(!Number.isFinite(stepIndex) || stepIndex <= 0) continue;
    const stepX = (anchorX - centerX) / stepIndex;
    const stepY = (anchorY - centerY) / stepIndex;
    for(const entry of bucket){
      const idx = entry.stepIndex;
      if(!Number.isFinite(idx) || idx <= 0) continue;
      const targetX = centerX + stepX * idx;
      const targetY = centerY + stepY * idx;
      entry.map.x = roundToPrecision(targetX, 4);
      entry.map.y = roundToPrecision(targetY, 4);
    }
  }
}

const LEVEL_DEFS = [];
let levelDefsPromise = null;
let levelDataLoadError = false;
let levelDataInitialized = false;

function cloneLevelData(data){
  if(data == null) return data;
  if(typeof structuredClone === 'function'){
    try{
      return structuredClone(data);
    }catch(err){
      // Fall through to JSON clone if structuredClone fails.
    }
  }
  return JSON.parse(JSON.stringify(data));
}

function isFileProtocol(){
  if(typeof window === 'undefined') return false;
  const location = window.location;
  if(!location || typeof location.protocol !== 'string') return false;
  return location.protocol === 'file:';
}

function tryLoadJsonFromLocalFile(url){
  if(typeof XMLHttpRequest !== 'function' || typeof window === 'undefined'){
    throw new Error('Local file access is not supported in this environment.');
  }
  const absolute = new URL(url, window.location.href).href;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', absolute, false);
  try{
    xhr.responseType = 'text';
  }catch(err){
    // Ignore if the browser does not allow overriding responseType for sync XHR.
  }
  if(typeof xhr.overrideMimeType === 'function'){
    xhr.overrideMimeType('application/json');
  }
  try{
    xhr.send(null);
  }catch(err){
    throw err;
  }
  const success = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
  if(!success){
    throw new Error(`HTTP ${xhr.status || 'unknown'} while reading ${absolute}`);
  }
  const text = xhr.responseText;
  if(!text){
    throw new Error(`Empty response when reading ${absolute}`);
  }
  return JSON.parse(text);
}

function cloneLevelData(data){
  if(data == null) return data;
  if(typeof structuredClone === 'function'){
    try{
      return structuredClone(data);
    }catch(err){
      // Fall through to JSON clone if structuredClone fails.
    }
  }
  return JSON.parse(JSON.stringify(data));
}

function loadBundledLevelDefinitions(){
  if(typeof window === 'undefined') return null;
  const bundle = window.LEVEL_DATA_BUNDLE;
  if(!bundle || typeof bundle !== 'object') return null;
  const loaded = [];
  const missing = [];
  for(const entry of LEVEL_DATA_FILES){
    const bundleKey = entry.file;
    let data = bundle[bundleKey];
    if(!data){
      const inferredId = inferLevelIdFromFile(bundleKey);
      if(inferredId && bundle[inferredId]){
        data = bundle[inferredId];
      }
    }
    if(!data){
      missing.push(bundleKey);
      continue;
    }
    let cloned;
    try{
      cloned = cloneLevelData(data);
    }catch(err){
      console.error(`[Levels] Failed to clone bundled level data for ${bundleKey}`, err);
      continue;
    }
    const prepared = prepareLevelDefinition(cloned, entry);
    if(!prepared){
      console.error(`[Levels] Invalid bundled level data in ${bundleKey}`);
      continue;
    }
    loaded.push(prepared);
  }
  if(!loaded.length){
    return null;
  }
  if(missing.length){
    console.warn(`[Levels] Level bundle missing entries: ${missing.join(', ')}`);
  }
  return loaded;
}

function inferLevelIdFromFile(fileName){
  if(typeof fileName !== 'string') return null;
  return fileName.replace(/\.json$/i, '');
}

function deriveStageCodeFromFile(fileName, def, mapConfig){
  if(mapConfig && typeof mapConfig.label === 'string' && mapConfig.label.trim()){
    return mapConfig.label.trim();
  }
  if(def && typeof def.stageCode === 'string' && def.stageCode.trim()){
    return def.stageCode.trim();
  }
  const match = /^level_(\d+)_(\d+)\.json$/i.exec(fileName);
  if(!match) return null;
  const worldNum = parseInt(match[1], 10);
  const stageNum = parseInt(match[2], 10);
  if(!Number.isFinite(worldNum) || !Number.isFinite(stageNum)) return null;
  if(worldNum <= 0) return null;
  return `${worldNum}-${stageNum}`;
}

function extractWorldNumberFromBranch(mapConfig){
  if(!mapConfig || typeof mapConfig.branch !== 'string') return null;
  const match = mapConfig.branch.match(/world(\d+)/i);
  if(!match) return null;
  const worldNum = parseInt(match[1], 10);
  return Number.isFinite(worldNum) ? worldNum : null;
}

function parseStageCodeNumbers(stageCode){
  if(typeof stageCode !== 'string') return null;
  const match = stageCode.match(/^(\d+)-(\d+)/);
  if(!match) return null;
  const worldNum = parseInt(match[1], 10);
  const stageNum = parseInt(match[2], 10);
  if(!Number.isFinite(worldNum) || !Number.isFinite(stageNum)) return null;
  return { world: worldNum, stage: stageNum };
}

function computeLevelDifficultyMultiplier(def){
  if(!def || typeof def !== 'object') return 1;
  const id = typeof def.id === 'string' ? def.id : '';
  const name = typeof def.name === 'string' ? def.name : '';
  if(id === 'canopySentinelTrial' || /canopy\s+sentinel\s+trial/i.test(name)){
    return 10;
  }
  if(/chrono(?:glass|graph)\s+expanse/i.test(name)){
    return 50;
  }
  const mapConfig = def.map && typeof def.map === 'object' ? def.map : {};
  const branchWorld = extractWorldNumberFromBranch(mapConfig);
  const rawBranchStep = Number(mapConfig.branchStep);
  if(branchWorld && Number.isFinite(rawBranchStep)){
    const stageIndex = Math.max(1, Math.floor(rawBranchStep));
    const stagesPerWorld = WORLD_STAGE_COUNT;
    const base = (branchWorld - 1) * stagesPerWorld + stageIndex;
    if(Number.isFinite(base) && base > 0) return base;
  }
  const stageNumbers = parseStageCodeNumbers(def.stageCode);
  if(stageNumbers){
    const stagesPerWorld = WORLD_STAGE_COUNT;
    const base = (stageNumbers.world - 1) * stagesPerWorld + stageNumbers.stage;
    if(Number.isFinite(base) && base > 0) return base;
  }
  if(Number.isFinite(rawBranchStep) && rawBranchStep > 0){
    return rawBranchStep;
  }
  const stageNumber = Number(def.stageNumber);
  if(Number.isFinite(stageNumber) && stageNumber > 0){
    return stageNumber;
  }
  return 1;
}

function prepareLevelDefinition(data, entry){
  if(!data || typeof data !== 'object' || !entry) return null;
  const def = { ...data };
  def.sourceFile = entry.file;
  if(!def.id){
    const inferredId = inferLevelIdFromFile(entry.file);
    if(inferredId) def.id = inferredId;
  }
  let mapConfig = def.map && typeof def.map === 'object' ? { ...def.map } : null;
  const stageCode = deriveStageCodeFromFile(entry.file, def, mapConfig);
  if(stageCode){
    def.stageCode = stageCode;
    if(mapConfig){
      if(typeof mapConfig.label !== 'string' || !mapConfig.label.trim()){
        mapConfig.label = stageCode;
      }
    }else{
      mapConfig = { label: stageCode };
    }
  }
  const override = def.id ? WORLD_MAP_NODE_OVERRIDES[def.id] : null;
  if(override){
    if(Object.prototype.hasOwnProperty.call(override, 'optional')){
      def.optional = override.optional;
    }
    if(Object.prototype.hasOwnProperty.call(override, 'alwaysUnlocked')){
      def.alwaysUnlocked = override.alwaysUnlocked;
    }
    if(Object.prototype.hasOwnProperty.call(override, 'bossStage')){
      def.bossStage = override.bossStage;
    }
    if(Object.prototype.hasOwnProperty.call(override, 'standalone')){
      def.standalone = override.standalone;
    }
    if(override.stageCode){
      def.stageCode = override.stageCode;
      if(!mapConfig) mapConfig = {};
      if(!override.map || !Object.prototype.hasOwnProperty.call(override.map, 'label')){
        mapConfig.label = override.stageCode;
      }
    }
    if(override.map){
      mapConfig = mapConfig ? { ...mapConfig } : {};
      for(const key in override.map){
        mapConfig[key] = override.map[key];
      }
    }
  }
  if(mapConfig){
    def.map = mapConfig;
  }else{
    delete def.map;
  }
  const difficulty = computeLevelDifficultyMultiplier(def);
  def.difficultyMultiplier = Number.isFinite(difficulty) && difficulty > 0 ? difficulty : 1;
  return def;
}

function initializeLevelDefinitions(){
  if(levelDataInitialized){
    return LEVEL_DEFS;
  }
  LEVEL_DEFS.length = 0;
  for(const entry of RAW_LEVEL_DATA){
    let cloned;
    try{
      cloned = cloneLevelData(entry.data);
    }catch(err){
      console.error(`[Levels] Failed to clone level data for ${entry.file}`, err);
      continue;
    }
    const prepared = prepareLevelDefinition(cloned, entry);
    if(!prepared){
      console.error(`[Levels] Invalid level data in ${entry.file}`);
      continue;
    }
    LEVEL_DEFS.push(prepared);
  }
  restoreDefaultWorldMapNodePositions(LEVEL_DEFS);
  levelDataInitialized = true;
  if(!LEVEL_DEFS.length){
    throw new Error('No level definitions were loaded.');
  }
  return LEVEL_DEFS;
}

function loadLevelDefinitions(){
  if(levelDefsPromise){
    return levelDefsPromise;
  }
  levelDefsPromise = new Promise((resolve, reject)=>{
    try{
      const defs = initializeLevelDefinitions();
      levelDataLoadError = false;
      resolve(defs);
    }catch(err){
      levelDataLoadError = true;
      reject(err);
    }
  });
  return levelDefsPromise;
}

function didLevelDataLoadFail(){
  return levelDataLoadError;
}

const ENEMY_HP_SCALE = 1;
const ENEMY_ATTACK_SCALE = 1;
const ENEMY_DEFENSE_SCALE = 1;

const NON_STICK_ENEMY_KINDS = new Set([
  'sandBlock',
  'sandWanderer',
  'slimeCube',
  'baldRoller',
  'tripodSpinner',
  'glyphGyre',
  'alephGlyph',
  'shinGlyph',
  'realmGuardian',
  'timeWraith',
  'thetaHarmonic'
]);

// --- Enemy Archetype Definitions -------------------------------------------
//
// `ENEMY_ARCHETYPE_DEFS` is the authoritative catalogue of enemy stat blocks
// used by spawning/normalization routines. Keeping the data in one literal
// makes it easy to survey health, attack, defense, and bespoke behavior
// switches without digging into spawn logic. After the literal is declared we
// expose it via the legacy `ENEMY_ARCHETYPES` constant so existing gameplay
// code keeps functioning while new contributors can target the clarified name.
const ENEMY_ARCHETYPE_DEFS = {
  grunt: { weapon: 'enemyDagger', hp: 10, attack: 5, defense: 2, behavior: 'skirmisher', attackRange: 170 },
  rogue: { weapon: 'dagger', hp: 10, attack: 5, defense: 2, behavior: 'striker', speedMult: 1.22, attackRange: 150 },
  archer: { weapon: 'bow', hp: 10, attack: 5, defense: 2, behavior: 'ranger', attackRange: 520, preferredRange: 320 },
  psiSkyRanger: { weapon: 'bow', hp: 320, attack: 120, defense: 52, behavior: 'psiRanger', speedMult: 1.04, isBoss: true, attackRange: 600, preferredRange: 340, leapStrength: 145000, psiFloatDuration: 1.2, psiFloatHoverForce: 26000, psiFloatHoverDamp: 3600, psiDiveCooldown: 2.2, psiFloatRangeBias: 0.85, headSigil: 'psi', headSigilColor: '#f3edff', bodyColor: '#d2d8ff', accentColor: '#5258b4', element: 'light', description: 'psi-marked ranger that vaults skyward, stalls midair, fires a precise arrow, then crashes back to the arena.' },
  epsilonCryowarden: {
    weapon: 'epsilonFrostSigil',
    hp: 420,
    attack: 98,
    defense: 60,
    behavior: 'epsilonCryomancer',
    speedMult: 0.94,
    isBoss: true,
    attackRange: 640,
    preferredRange: 420,
    headSigil: 'epsilon',
    headSigilColor: '#d9f3ff',
    bodyColor: '#a7d6ff',
    accentColor: '#2c5f85',
    element: 'ice',
    iceVolleySize: 3, // Default number of pillars spawned per volley.
    iceVolleySpacing: 140, // Pixel spacing between sequential pillar anchors.
    iceVolleyInterval: 0.42, // Seconds between pillar spawns inside a volley.
    iceVolleyWarmup: 0.75, // Seconds spent warning before firing the first pillar.
    iceVolleyRecovery: 2.4, // Recovery duration after the final pillar resolves.
    iceVolleyCooldown: 3.2, // Additional cooldown before the next volley may begin.
    icePillarDamage: 44, // Damage dealt by each pillar tick while active.
    icePillarRadius: 58, // Radius used to detect and strike intruders.
    icePillarHeight: 150, // Render height of the raised pillar in pixels.
    icePillarChargeTime: 0.65, // Seconds each pillar spends charging before turning lethal.
    icePillarDuration: 2100, // Milliseconds each pillar remains once active.
    icePillarSlowMultiplier: 0.45, // Movement multiplier applied to slowed targets.
    icePillarSlowDuration: 1800, // Slow duration in milliseconds applied per tick.
    description: 'epsilon-sigil cryoknight that locks foes in place by carpeting the arena with erupting ice pillars.'
  },
  phiSunPriest: {
    weapon: 'phiSolarSigil',
    hp: 520,
    attack: 112,
    defense: 68,
    behavior: 'phiSunPriest',
    speedMult: 1.02,
    isBoss: true,
    attackRange: 720,
    preferredRange: 420,
    headSigil: 'phi',
    headSigilColor: '#ffe8b0',
    bodyColor: '#f5d180',
    accentColor: '#fff2c1',
    element: 'light',
    vanishDuration: 0.65,
    reappearDuration: 0.45,
    vanishCooldown: 3.6,
    cageCooldown: 8.2,
    cageBlockSize: 36,
    cageHealth: 260,
    teleportRadius: 320,
    burstShots: 5,
    burstInterval: 0.28,
    lightBurstColor: 'rgba(255, 232, 176, 0.9)',
    description: 'phi-sigil luminary that vanishes into shadow before reappearing in sunfire and sealing foes inside sandstone prisons.'
  },
  mirageAssassin: {
    weapon: 'mirageEdge',
    hp: 560,
    attack: 118,
    defense: 66,
    behavior: 'mirageAssassin',
    speedMult: 1.18,
    isBoss: true,
    attackRange: 640,
    preferredRange: 320,
    renderStyle: 'pixelated',
    renderPixelSize: 3,
    bodyColor: '#1c1e2f',
    accentColor: '#ff6e93',
    element: 'void',
    scarfColor: '#ff3f6d',
    scarfTrailColor: '#f27aa2',
    scarfPixelSize: 3,
    scarfSegments: 16,
    scarfWaveAmplitude: 7,
    scarfWaveFrequency: 3,
    scarfWaveLift: 2.8,
    scarfWaveLiftFrequency: 1.7,
    scarfSegmentSpacing: 6.8,
    scarfDropPerSegment: 0.9,
    scarfFadeTail: 0.72,
    scarfAnchorOffsetX: -10,
    scarfAnchorOffsetY: -6,
    scarfAnchorBackOffset: 12,
    scarfWaveTaper: 0.58,
    scarfSpacingDecay: 0.32,
    scarfLiftTaper: 0.52,
    scarfDropTaper: 0.6,
    slashLength: 520,
    slashWidth: 32,
    slashDamage: 90,
    slashDuration: 220,
    slashCooldown: 2.4,
    slashWindup: 0.46,
    slashRecover: 0.98,
    slashStickMargin: 15,
    slashOffsetX: 20,
    slashOffsetY: 14,
    slashCoreColor: '#fef7ff',
    slashEdgeColor: 'rgba(196, 140, 255, 0.55)',
    slashGlowColor: 'rgba(32, 12, 54, 0.35)',
    cloneCount: 2,
    cloneMaxCount: 3,
    cloneCooldown: 9.2,
    cloneCooldownJitter: 1.3,
    cloneSpawnRadius: 220,
    cloneLifetime: 12,
    cloneAttackMultiplier: 0.64,
    cloneDamageMultiplier: 0.58,
    cloneWindup: 0.52,
    cloneRecover: 0.8,
    cloneSlashLength: 360,
    cloneSlashWidth: 24,
    cloneSlashDuration: 200,
    cloneSlashCooldown: 2.6,
    cloneSlashWindup: 0.36,
    cloneSlashRecover: 0.64,
    cloneSlashStickMargin: 12,
    description: 'mirage-veiled assassin whose scarf trails in unseen wind, carving razor-straight shockwaves and summoning ephemeral doubles.'
  },
  mirageAssassinClone: {
    weapon: 'mirageEdge',
    hp: 1,
    attack: 74,
    defense: 0,
    behavior: 'mirageAssassinClone',
    speedMult: 1.25,
    attackRange: 440,
    preferredRange: 220,
    renderStyle: 'pixelated',
    renderPixelSize: 3,
    bodyColor: '#24263c',
    accentColor: '#ff7d9f',
    element: 'void',
    scarfColor: '#ff4c78',
    scarfTrailColor: '#ff96b2',
    scarfPixelSize: 3,
    scarfSegments: 12,
    scarfWaveAmplitude: 5.2,
    scarfWaveFrequency: 3.2,
    scarfWaveLift: 2.2,
    scarfWaveLiftFrequency: 1.8,
    scarfSegmentSpacing: 6.2,
    scarfDropPerSegment: 0.8,
    scarfFadeTail: 0.82,
    scarfAnchorOffsetX: -8,
    scarfAnchorOffsetY: -5,
    scarfAnchorBackOffset: 10,
    scarfWaveTaper: 0.6,
    scarfSpacingDecay: 0.3,
    scarfLiftTaper: 0.5,
    scarfDropTaper: 0.65,
    slashLength: 320,
    slashWidth: 22,
    slashDamage: 64,
    slashDuration: 200,
    slashCooldown: 2.7,
    slashWindup: 0.36,
    slashRecover: 0.64,
    slashStickMargin: 12,
    cloneLifetime: 9,
    mirageClone: true,
    deadFadeDuration: 220,
    description: 'fragile mirage clone that lashes out with a single razor shock before dissolving in a gust of petals.'
  },
  mage: { weapon: 'wand', hp: 10, attack: 5, defense: 2, behavior: 'caster', attackRange: 460, preferredRange: 300 },
  boss: { weapon: 'enemyDagger', hp: 10, attack: 5, defense: 2, behavior: 'skirmisher', speedMult: 1.08, isBoss: true, attackRange: 200 },
  iceSkipper: { weapon: 'spear', hp: 10, attack: 5, defense: 2, behavior: 'leaper', speedMult: 1.05, attackRange: 160, leapStrength: 150000 },
  glacierWarden: { weapon: 'spear', hp: 10, attack: 5, defense: 2, behavior: 'leaper', speedMult: 0.95, isBoss: true, attackRange: 210, leapStrength: 165000 },
  emberWisp: { weapon: 'firebolt', hp: 10, attack: 5, defense: 2, behavior: 'hoverCaster', hoverHeight: 220, attackRange: 560, preferredRange: 380, speedMult: 0.9, element: 'fire' },
  boomling: { weapon: 'dagger', hp: 10, attack: 5, defense: 2, behavior: 'bomber', speedMult: 1.12, attackRange: 110, deathEffect: 'explode', deathDamage: 34, deathRadius: 130 },
  cinderKing: { weapon: 'bomb', hp: 10, attack: 5, defense: 2, behavior: 'artillery', speedMult: 0.85, isBoss: true, attackRange: 640, preferredRange: 440, blastRadius: 170, element: 'fire' },
  neonWarden: { weapon: 'neonBlade', hp: 10, attack: 5, defense: 2, behavior: 'neonOverlord', speedMult: 1.12, isBoss: true, attackRange: 260, renderStyle: 'neon', showWeapon: false, bodyColor: '#06101f', accentColor: '#54f0ff' },
  baldRoller: { weapon: 'bodySlam', hp: 10, attack: 5, defense: 2, behavior: 'roller', speedMult: 1.05, attackRange: 170, renderStyle: 'roller', showWeapon: false, bodyColor: '#e5d2b8', accentColor: '#d18f42', renderOffsetY: -6, rollRadius: 32, rollBurstForce: 62000, rollCooldown: 2.6, leapStrength: 82000, physicsType: 'nonStick', hitboxWidth: 68, hitboxHeight: 64, hitboxOffsetY: -6 },
  slimeCube: { weapon: 'bodySlam', hp: 10, attack: 5, defense: 2, behavior: 'hopper', speedMult: 0.9, attackRange: 160, renderStyle: 'slime', showWeapon: false, bodyColor: '#69e0ff', accentColor: '#aef4ff', renderOffsetY: -10, slimeWidth: 72, slimeHeight: 48, leapStrength: 155000, physicsType: 'nonStick', hitboxWidth: 72, hitboxHeight: 52, hitboxOffsetY: -10 },
  tripodSpinner: { weapon: 'bodySlam', hp: 10, attack: 5, defense: 2, behavior: 'tripodWalker', speedMult: 1.02, attackRange: 180, renderStyle: 'tripodOrb', showWeapon: false, bodyColor: '#b8e4ff', accentColor: '#3f7ca6', renderOffsetY: -6, tripodRadius: 30, tripodLegLength: 48, tripodLegWidth: 5, tripodSuctionSize: 18, tripodStepForce: 56000, tripodHopStrength: 52000, tripodStepInterval: 0.88, physicsType: 'nonStick', hitboxWidth: 66, hitboxHeight: 84, hitboxOffsetY: -6 },
  glyphSalmon: { weapon: 'bodySlam', hp: 10, attack: 5, defense: 2, behavior: 'glyphSalmon', attackRange: 150, renderStyle: 'glyphSalmon', showWeapon: false, bodyColor: '#101c2a', accentColor: '#8bd0ff', requiresWater: true, waterSoft: true, swimForce: 3600, swimBuoyancy: 5200, swimDrag: 3.4, swimDamp: 2.6, swimDepth: 52, salmonLength: 108, salmonHeight: 38, airDamageDelay: 0.5, airDamageRate: 24, description: 'glitched salmon that flickers with sacred glyphs and must remain submerged.' },
  glyphLeviathan: {
    weapon: 'enemyDagger',
    hp: 720,
    attack: 128,
    defense: 74,
    behavior: 'glyphLeviathan',
    attackRange: 720,
    preferredRange: 360,
    renderStyle: 'glyphLeviathan',
    showWeapon: false,
    bodyColor: '#101c2a',
    accentColor: '#8bd0ff',
    element: 'water',
    requiresWater: true,
    waterSoft: true,
    swimForce: 4600,
    swimBuoyancy: 6200,
    swimDrag: 3.2,
    swimDamp: 2.8,
    swimDepth: 68,
    salmonLength: 192,
    salmonHeight: 68,
    bubbleShieldHp: 240,
    bubbleShieldRegenDelay: 4.5,
    bubbleShieldRegenRate: 62,
    glyphVolleyCount: 6,
    glyphVolleyInterval: 0.3,
    glyphVolleySpread: 0.18,
    glyphVolleyCooldown: 5.6,
    spikeChargeWindup: 0.8,
    spikeChargeDuration: 1.4,
    spikeChargeForce: 102000,
    spikeChargeCooldown: 6.8,
    spikeBurstProjectiles: 8,
    spikeBurstDamageScale: 1.05,
    description: 'leviathan-scale glyph salmon that prowls in a regenerating bubble shield, unleashing sigil volleys before lunging behind spinning spike fins.'
  },
  glyphGyre: { weapon: 'enemyDagger', hp: 1, attack: 40, defense: 20, behavior: 'glyphGyre', attackRange: 720, renderStyle: 'glyphGyre', showWeapon: false, bodyColor: '#0c1321', accentColor: '#8bd0ff', glyphCoreColor: '#f3fbff', hoverHeight: 180, orbRadius: 48, orbDriftSpeed: 72, orbGlyphCount: 9, beamChargeTime: 5, physicsType: 'nonStick', hitboxWidth: 96, hitboxHeight: 96, hitboxOffsetY: 0, hitboxShape: 'ellipse', // seconds of uninterrupted line-of-sight required for the beam to reach full strength
    beamMinWidth: 12, // minimum beam thickness in pixels while tracking a target
    beamMaxWidth: 88, // maximum beam thickness once fully charged
    beamStillnessThreshold: 28, // movement in pixels that counts as breaking the "standing still" check
    beamStillnessDamage: 160, // damage applied when the target remains within the beam without moving through a full charge
    beamCooldown: 2.4, // downtime in seconds after releasing a full-power blast
    description: 'a swirling glyph gyre that lingers overhead and punishes motionless intruders with widening void lances.' },
  alephGlyph: { weapon: 'enemyDagger', hp: 140, attack: 22, defense: 18, behavior: 'alephReliquary', attackRange: 520, preferredRange: 420, renderStyle: 'alephGlyph', showWeapon: false, bodyColor: '#fdfdff', accentColor: '#e9e9ff', hoverHeight: 220, shieldRadius: 140, shinResummonDelay: 6, shinReplenishDelay: 3.4, maxShinCount: 5, summonDelay: 0.6, element: 'void', description: 'monochrome aleph sigil that shelters behind spinning platonic solids until its glyph attendants are banished.' },
  shinGlyph: { weapon: 'enemyDagger', hp: 24, attack: 12, defense: 8, behavior: 'shinReliquary', attackRange: 720, preferredRange: 420, renderStyle: 'shinGlyph', showWeapon: false, bodyColor: '#ffffff', accentColor: '#f0f0ff', hoverHeight: 180, lightningDelay: 1.25, lightningRadius: 86, lightningSpread: 42, lightningCooldown: 3.1, lightningCooldownJitter: 1.0, element: 'light', description: 'summoned shin glyph that orbits its Aleph master and calls slow void lightning onto intruders.' },
  zetaGlyph: {
    weapon: 'enemyDagger',
    hp: 640,
    attack: 142,
    defense: 84,
    behavior: 'glyphGyre',
    attackRange: 720,
    preferredRange: 360,
    renderStyle: 'zetaGlyph',
    showWeapon: false,
    bodyColor: '#f4f4ff',
    accentColor: '#7d8dff',
    element: 'void',
    hoverHeight: 210,
    orbRadius: 56,
    orbGlyphCount: 8,
    orbDriftSpeed: 96,
    orbitalPartnerId: 'xiGlyph',
    orbitalRepositionInterval: 4.2,
    orbitalRepositionRadius: 260,
    beamChargeTime: 3.8,
    beamCooldown: 2.6,
    description: 'voidbound zeta sigil that anchors the twin boss, whipping radiant glyph satellites while steering the shared orbit around Xi.'
  },
  xiGlyph: {
    weapon: 'enemyDagger',
    hp: 640,
    attack: 154,
    defense: 82,
    behavior: 'glyphGyre',
    attackRange: 720,
    preferredRange: 360,
    renderStyle: 'xiGlyph',
    showWeapon: false,
    bodyColor: '#f9f9ff',
    accentColor: '#9aa2ff',
    element: 'light',
    hoverHeight: 210,
    orbRadius: 56,
    orbGlyphCount: 8,
    orbDriftSpeed: 96,
    orbitalPartnerId: 'zetaGlyph',
    orbitalRepositionInterval: 4.2,
    orbitalRepositionRadius: 260,
    pulseVolleyCount: 6,
    pulseVolleyInterval: 0.32,
    description: 'luminous xi sigil that mirrors Zeta, unleashing synchronized pulse volleys as the duo revolve in a devastating gyre.'
  },
  timeWraith: { weapon: 'enemyDagger', hp: 10, attack: 12, defense: 6, behavior: 'timeWraith', speedMult: 0.6, attackRange: 180, renderStyle: 'timeWraith', showWeapon: false, bodyColor: '#1a102b', accentColor: '#f5f7ff', physicsType: 'nonStick', hitboxWidth: 68, hitboxHeight: 68, hitboxShape: 'ellipse', orbRadius: 34, passThroughTerrain: true, ghost: true, description: 'slow temporal wraith that stirs only when chronospheres are breached.' },
  realmGuardian: { weapon: 'enemyDagger', hp: 1, attack: 0, defense: 0, behavior: 'sentinel', renderStyle: 'realmGuardian', showWeapon: false, element: 'void', resistances: ['physical','fire','ice','light','chronometric','explosive','necrotic','life'], renderOffsetY: 15, realmGuardianWidth: 263.5, realmGuardianHeight: 340.5, description: 'towering monochrome guardian that only yields to void-forged strikes.', physicsType: 'nonStick', hitboxWidth: 263.5, hitboxHeight: 340.5, hitboxOffsetY: 15, passThroughTerrain: true, ghost: true },
  tricylicSlasher: { weapon: 'enemyDagger', hp: 32, attack: 14, defense: 6, behavior: 'tricylicSlasher', renderStyle: 'tricylicSlasher', showWeapon: false, element: 'void', description: 'void-cut triangle that accelerates into razor runs when intruders linger in sight.', physicsType: 'nonStick', hitboxWidth: 92, hitboxHeight: 92, hitboxOffsetY: 0, tricylicRadius: 46, flies: true },
  sandBlock: { weapon: 'enemyDagger', hp: 10, attack: 5, defense: 2, behavior: 'hopper', speedMult: 0.78, attackRange: 150, renderStyle: 'sandBlock', showWeapon: false, bodyColor: '#d4c089', accentColor: '#b79a5b', blockWidth: 112, blockHeight: 96, deathEffect: 'sandBurst', leapStrength: 135000, physicsType: 'nonStick', hitboxWidth: 112, hitboxHeight: 96, hitboxOffsetY: 0 },
  sandWanderer: { weapon: 'sandPuff', hp: 10, attack: 5, defense: 2, behavior: 'sandSlinger', speedMult: 0.82, attackRange: 320, preferredRange: 240, renderStyle: 'sandShade', showWeapon: false, bodyColor: '#d9c88c', accentColor: '#b79a5b', deathEffect: 'sandBurst', deathSandCount: 28, deathSandSpreadX: 80, deathSandSpreadY: 48, physicsType: 'nonStick', hitboxWidth: 88, hitboxHeight: 120, hitboxOffsetY: -4 },
  skyReaver: { weapon: 'petalSaber', hp: 10, attack: 5, defense: 2, behavior: 'striker', speedMult: 1.15, attackRange: 200, renderStyle: 'pixel', showWeapon: false, bodyColor: '#68e0a3', accentColor: '#2c4a36' },
  bloomSeer: { weapon: 'seedVolley', hp: 10, attack: 5, defense: 2, behavior: 'caster', speedMult: 0.96, attackRange: 520, preferredRange: 340, renderStyle: 'pixel', showWeapon: false, bodyColor: '#b4f59c', accentColor: '#4a6a4c' },
  canopyWisp: { weapon: 'windSpindle', hp: 10, attack: 5, defense: 2, behavior: 'hoverCaster', speedMult: 0.95, attackRange: 540, preferredRange: 320, hoverHeight: 220, renderStyle: 'pixel', showWeapon: false, bodyColor: '#9be8ff', accentColor: '#2f425e' },
  tideWarden: { weapon: 'pressureLance', hp: 10, attack: 5, defense: 2, behavior: 'artillery', speedMult: 0.92, attackRange: 640, preferredRange: 460, renderStyle: 'pixel', showWeapon: false, bodyColor: '#4fa7ff', accentColor: '#142c40' },
  ventArcanist: { weapon: 'ventMine', hp: 10, attack: 5, defense: 2, behavior: 'caster', speedMult: 0.94, attackRange: 540, preferredRange: 360, renderStyle: 'pixel', showWeapon: false, bodyColor: '#7fe1ff', accentColor: '#1f3948' },
  anchorBruiser: { weapon: 'anchorFlail', hp: 10, attack: 5, defense: 2, behavior: 'skirmisher', speedMult: 0.92, attackRange: 220, renderStyle: 'pixel', showWeapon: false, bodyColor: '#8bd0ff', accentColor: '#264b63' },
  mirageLancer: { weapon: 'mirageGlaive', hp: 10, attack: 5, defense: 2, behavior: 'striker', speedMult: 1.2, attackRange: 210, renderStyle: 'pixel', showWeapon: false, bodyColor: '#f7c978', accentColor: '#3c2a18' },
  chronoglassOracle: { weapon: 'chronoglassStaff', hp: 10, attack: 5, defense: 2, behavior: 'caster', speedMult: 0.98, attackRange: 580, preferredRange: 380, element: 'chronometric', renderStyle: 'pixel', showWeapon: false, bodyColor: '#ffe3b4', accentColor: '#5b3d1f' },
  echoSlinger: { weapon: 'echoRepeater', hp: 10, attack: 5, defense: 2, behavior: 'ranger', speedMult: 1.05, attackRange: 620, preferredRange: 360, renderStyle: 'pixel', showWeapon: false, bodyColor: '#ffd98f', accentColor: '#4b3320' },
  toonChampion: { weapon: 'toonBrush', hp: 10, attack: 5, defense: 2, behavior: 'toonChampion', speedMult: 1.08, attackRange: 300, renderStyle: 'toon', showWeapon: false, bodyColor: '#ffe4ad', accentColor: '#3b2418', isBoss: true },
  voidGlyphColossus: { weapon: 'voidHalo', hp: 420, attack: 68, defense: 44, behavior: 'voidGlyphOverlord', attackRange: 720, preferredRange: 480, speedMult: 0.68, sizeScale: 2.6, isBoss: true, bodyColor: '#1b1026', accentColor: '#a48cff', voidGlyphHead: true, voidHaloRadius: 72, voidHaloHeightOffset: -6, voidHaloMaxOrbs: 5, voidHaloSpinSpeed: 1.1, voidHaloRegenDelay: 4.2, voidHaloVolleyInterval: 0.55, voidHaloChargeTime: 1.2, voidHaloAttackDowntime: 4.8, voidHaloChargeDecay: 1.8, voidHaloOrbRadius: 18, description: 'towering void-marked stick champion that hurls orbiting singularities from the glyph that crowns its head.' },
  thetaHarmonic: { weapon: 'enemyDagger', hp: 560, attack: 136, defense: 72, behavior: 'thetaHarmonic', renderStyle: 'thetaHarmonic', showWeapon: false, element: 'light', physicsType: 'nonStick', hitboxWidth: 148, hitboxHeight: 148, hitboxShape: 'ellipse', hoverHeight: 0, thetaLineCount: 4, thetaBaseLineCount: 3, thetaMinLineCount: 3, thetaMaxLineCount: 10, thetaLineRange: 640, thetaLineExtendSpeed: 580, thetaLineRetractSpeed: 540, thetaLineDamageRadius: 34, thetaLineDamageInterval: 0.24, thetaChargeTime: 1, thetaTelegraphTime: 1, thetaBeamFlashTime: 0.32, thetaBeamDuration: 2.6, thetaRecoverTime: 1.45, thetaRelocateBias: 0.75, thetaLineWidth: 22, description: 'glitching theta core that unfurls harmonic light filaments before retracting to reposition.', isBoss: true },
  testEmberSeer: { weapon: 'testEmberStaff', hp: 10, attack: 5, defense: 2, behavior: 'hoverCaster', hoverHeight: 210, attackRange: 580, preferredRange: 420, speedMult: 0.9, bodyColor: '#ffb296', accentColor: '#ff6a3c', description: 'test ember mage that floats on heat drafts and detonates fire cores from afar.', element: 'fire' },
  testStormChakramite: { weapon: 'testStormChakram', hp: 10, attack: 5, defense: 2, behavior: 'striker', speedMult: 1.18, attackRange: 220, preferredRange: 160, bodyColor: '#9dd8ff', accentColor: '#2f8fff', description: 'test storm skirmisher that lunges forward while slinging energized blades.' },
  testSolarArcanist: { weapon: 'testSolarFusillade', hp: 10, attack: 5, defense: 2, behavior: 'hoverCaster', hoverHeight: 200, attackRange: 560, preferredRange: 360, speedMult: 0.92, bodyColor: '#ffe09a', accentColor: '#ff914d', description: 'test solar channeler that fans searing lances across a wide arc.' },
  testStickLarge: { weapon: 'enemyDagger', hp: 10, attack: 5, defense: 2, behavior: 'skirmisher', sizeScale: 3, description: 'oversized stick combatant used to stress-test rig scaling.' },
  testStickSmall: { weapon: 'enemyDagger', hp: 10, attack: 5, defense: 2, behavior: 'skirmisher', sizeScale: 1/3, description: 'miniature stick combatant used to verify rig scaling at tiny sizes.' },
  testVoidCaller: { weapon: 'testVoidSiphon', hp: 10, attack: 5, defense: 2, behavior: 'artillery', attackRange: 640, preferredRange: 520, speedMult: 0.78, bodyColor: '#c7b2ff', accentColor: '#5b3dff', blastRadius: 160, blastDamage: 30, pullRadius: 220, pullStrength: 1400, description: 'test void warlock that lobs gravity wells to drag intruders out of position.' },
  testChronoMaster: { weapon: 'testChronoLoop', hp: 10, attack: 5, defense: 2, behavior: 'hoverCaster', hoverHeight: 220, attackRange: 600, preferredRange: 420, speedMult: 0.88, element: 'chronometric', bodyColor: '#d5f3ff', accentColor: '#497fbd', description: 'test chronomancer that drifts overhead and releases slowing chronospheres to trap targets.' }
};

// Maintain compatibility with the numerous call sites that expect the table to
// live on `ENEMY_ARCHETYPES`.
const ENEMY_ARCHETYPES = ENEMY_ARCHETYPE_DEFS;

(function normalizeEnemyArchetypes(){
  for(const id in ENEMY_ARCHETYPES){
    const archetype = ENEMY_ARCHETYPES[id];
    if(!archetype || typeof archetype !== 'object') continue;
    if(Number.isFinite(archetype.hp)) archetype.hp = Number((archetype.hp * ENEMY_HP_SCALE).toFixed(2));
    if(Number.isFinite(archetype.attack)) archetype.attack = Number((archetype.attack * ENEMY_ATTACK_SCALE).toFixed(2));
    if(Number.isFinite(archetype.defense)) archetype.defense = Number((archetype.defense * ENEMY_DEFENSE_SCALE).toFixed(2));
  }
})();

function getLevelDefById(id){
  return LEVEL_DEFS.find(def => def.id === id);
}

function spawnLevel(world){
  if(!world.levelState) return;
  const state = world.levelState;
  state.defeat = null;
  const screen = state.def.screens[state.screenIndex];
  const layoutBossPlacement = Array.isArray(state.enemyPlacements)
    ? state.enemyPlacements.find(entry => entry?.isBoss)
    : null;
  const layoutBossName = layoutBossPlacement?.bossName
    || layoutBossPlacement?.name
    || layoutBossPlacement?.label
    || null;
  state.difficultyMultiplier = Number.isFinite(state.def?.difficultyMultiplier)
    ? state.def.difficultyMultiplier
    : 1;
  state.totalScreens = state.def.screens.length;
  state.isFinalScreen = state.screenIndex === state.totalScreens - 1;
  state.screenTitle = screen?.name || `Screen ${state.screenIndex+1}`;
  state.bannerText = state.screenTitle;
  state.bannerSubtext = screen?.description || '';
  if(state.voidDimensionActive && state.def?.voidSymbolRoom){
    const room = state.def.voidSymbolRoom;
    if(room.name) {
      state.screenTitle = room.name;
      state.bannerText = room.name;
    }
    if(room.description !== undefined){
      state.bannerSubtext = room.description || '';
    }
  }
  if(state.isFinalScreen){
    if(screen?.boss?.name){
      state.bannerSubtext = `Boss: ${screen.boss.name}`;
    }else if(layoutBossName){
      state.bannerSubtext = `Boss: ${layoutBossName}`;
    }
  }
  state.bannerTimer = 2.6;
  state.doorAnnounced = false;
  state.encounterStarted = false;
  state.bossRef = null;
  state.bossName = screen?.boss?.name || layoutBossName || null;
  state.bossRewardSpawned = false;
  state.bossRewardClaimed = false;

  world.enemies.length = 0;
  spawnEnemiesForScreen(world, screen, state);
  spawnLevelNpcs(world);

  syncWorldDoorFromState(world);
  if(world.door.locked){
    state.doorAnnounced = true;
  }
  const spawnerConfig = state.def?.spawner;
  if(spawnerConfig){
    state.spawnerTimer = spawnerConfig.initialDelay ?? (spawnerConfig.interval ?? 5);
    world.door.hidden = true;
    world.door.open = false;
    if(!Array.isArray(state.spawnerPoints) || !state.spawnerPoints.length){
      state.spawnerPoints = buildSpawnerPoints(spawnerConfig, state.layoutMeta, world);
    }
    let alive = world.sticks.filter(s=>s.isEnemy && !s.dead).length;
    const rawCap = spawnerConfig.maxAlive;
    const cap = (typeof rawCap === 'number' && Number.isFinite(rawCap)) ? rawCap : Infinity;
    const burst = spawnerConfig.initialBurst ?? 0;
    for(let i=0; i<burst && alive < cap; i++){
      const spawned = spawnEnemyFromSpawner(world, state, spawnerConfig);
      if(spawned) alive++;
      else break;
    }
  }else{
    state.spawnerTimer = 0;
  }
  refreshLayoutWeapons(world);
  spawnConfiguredPickups(world);
}

function spawnEnemiesForScreen(world, screen, state){
  if(!screen) return;
  const placements = Array.isArray(state?.enemySpawnPoints) ? state.enemySpawnPoints : [];
  const placedByKind = {};
  let bossSpawned = false;
  let anyPlaced = false;
  for(const entry of placements){
    if(!entry?.kind) continue;
    const enemy = spawnSingleEnemy(world, entry, entry.x);
    anyPlaced = true;
    placedByKind[entry.kind] = (placedByKind[entry.kind] || 0) + 1;
    if(entry.offsetY){
      const ground = groundHeightAt(world, entry.x, { surface: 'top' });
      enemy.warpTo(entry.x, ground - 30 + entry.offsetY);
    }
    const entryBossName = entry.bossName
      || entry.name
      || entry.label
      || screen?.boss?.name
      || state.bossName
      || null;
    if(entry.isBoss || (screen.boss && entry.kind === screen.boss.kind)){
      state.bossRef = enemy;
      if(entryBossName){
        enemy.label = entryBossName;
        enemy.bossName = entryBossName;
        if(!state.bossName){
          state.bossName = entryBossName;
        }
      }
      bossSpawned = true;
    }
  }

  if(!anyPlaced){
    const left = Math.min(320, world.width * 0.35);
    const right = Math.max(left + 120, world.width - 220);
    for(const entry of screen.enemies || []){
      spawnEnemyGroup(world, entry, left, right);
    }
  }else{
    const left = Math.min(320, world.width * 0.35);
    const right = Math.max(left + 120, world.width - 220);
    for(const entry of screen.enemies || []){
      const need = Math.max(0, (entry.count || 1) - (placedByKind[entry.kind] || 0));
      if(need <= 0) continue;
      for(let i=0; i<need; i++){
        spawnSingleEnemy(world, entry, rand(left, right));
      }
    }
  }

  if(screen.boss && !bossSpawned){
    const right = Math.max(Math.min(world.width - 140, world.width - 80), world.width * 0.65);
    const boss = spawnSingleEnemy(world, { ...screen.boss, isBoss: true }, right);
    if(screen.boss.name){
      boss.label = screen.boss.name;
      boss.bossName = screen.boss.name;
    }
    state.bossRef = boss;
  }
}

function spawnLevelNpcs(world){
  if(!world || !world.levelState) return;
  if(!Array.isArray(world.npcEntities)) world.npcEntities = [];
  const placements = Array.isArray(world.levelState.npcPlacements) ? world.levelState.npcPlacements : [];
  const screenIndex = Number.isInteger(world.levelState.screenIndex) ? world.levelState.screenIndex : null;
  world.npcEntities = [];
  if(!placements.length) return;
  const eligible = placements.filter(entry=>{
    if(!entry) return false;
    if(screenIndex === null) return true;
    if(entry.screenIndex === undefined) return true;
    return entry.screenIndex === screenIndex;
  });
  for(const placement of eligible){
    const npc = spawnNpcFromPlacement(world, placement);
    if(npc) world.npcEntities.push(npc);
  }
}

function spawnNpcFromPlacement(world, placement){
  if(!world || !placement) return null;
  const spawnX = Number.isFinite(placement.x) ? placement.x : 0;
  const offsetY = Number.isFinite(placement.spawnOffsetY) ? placement.spawnOffsetY : -40;
  let ground = typeof groundHeightAt === 'function' ? groundHeightAt(world, spawnX, { surface: 'top' }) : null;
  if(!Number.isFinite(ground)) ground = placement.baseY ?? (Number.isFinite(world.groundY) ? world.groundY : (world.height - 100));
  const spawnY = ground + offsetY;
  const stick = new Stick(spawnX, spawnY, false, world);
  stick.isNpc = true;
  stick.selectable = false;
  stick.showWeapon = false;
  stick.weaponVisible = false;
  stick.weapon = ()=>null;
  stick.weaponSheathed = false;
  stick.invulnerable = true;
  stick.hp = stick.maxHp = 9999;
  stick.moveIntent = 0;
  stick.bodyColor = placement.headColor || '#aee6ff';
  stick.npcHeadColor = placement.headColor || '#aee6ff';
  if(placement.brimColor) stick.npcHatBrimColor = placement.brimColor;
  if(placement.bandColor) stick.npcHatBandColor = placement.bandColor;
  if(placement.hatStrokeColor) stick.npcHatStrokeColor = placement.hatStrokeColor;
  if(placement.headColor) stick.bodyColor = placement.headColor;
  if(placement.facing === 'left') stick.dir = -1;
  else if(placement.facing === 'right') stick.dir = 1;
  if(placement.name) stick.label = placement.name;
  else stick.label = null;
  const dialogLines = Array.isArray(placement.lines) && placement.lines.length
    ? placement.lines.slice()
    : ['...'];
  const dialog = {
    lines: dialogLines,
    currentIndex: 0,
    target: '',
    visible: '',
    charIndex: 0,
    charProgress: 0,
    fade: 0,
    active: false,
    holdTimer: 0,
    revealSpeed: Number.isFinite(placement.revealSpeed) ? placement.revealSpeed : 56,
    holdDuration: Number.isFinite(placement.holdDuration) ? placement.holdDuration : 1.8,
    talkRadius: Number.isFinite(placement.talkRadius) ? placement.talkRadius : 150,
    charSoundCooldown: 35,
    hatOffset: Number.isFinite(placement.hatOffset) ? placement.hatOffset : undefined,
    lastCharSound: 0
  };
  stick.npcDialog = dialog;
  world.sticks.push(stick);
  return { stick, dialog };
}

function spawnEnemyGroup(world, spec, left, right){
  const count = spec.count || 1;
  for(let i=0;i<count;i++){
    spawnSingleEnemy(world, spec, rand(left, right));
  }
}

function spawnSingleEnemy(world, spec, forcedX){
  const archetype = ENEMY_ARCHETYPES[spec.kind] || {};
  const x = forcedX !== undefined ? forcedX : rand(260, Math.max(360, world.width - 220));
  const spawnSurface = typeof spec.spawnSurface === 'string'
    ? spec.spawnSurface
    : (spec.isBoss ? 'bottom' : 'top');
  let ground = groundHeightAt(world, x, { surface: spawnSurface });
  if(!Number.isFinite(ground)){
    ground = groundHeightAt(world, x, { surface: 'top' });
  }
  let spawnY = ground - 30;
  if(Number.isFinite(spec?.offsetY)){
    spawnY += spec.offsetY;
  }
  if(Number.isFinite(spec?.y)){
    spawnY = spec.y;
  }
  const enemy = new Stick(x, spawnY, true, world);
  if(world?.levelState){
    world.levelState.encounterStarted = true;
  }
  const enemyKind = spec.kind || archetype.kind || enemy.enemyKind || null;
  if(enemyKind){
    enemy.enemyKind = enemyKind;
    if(!enemy.kind) enemy.kind = enemyKind;
  }
  if(!enemy.label && typeof spec.name === 'string' && spec.name.trim()){
    enemy.label = spec.name.trim();
  }
  configureEnemyFromSpec(enemy, archetype, spec);
  const stageNumber = world?.levelState?.def?.stageNumber;
  const levelMultiplier = Math.max(1, Number.isFinite(stageNumber) ? stageNumber : 1);
  const baseHp = Number.isFinite(enemy.maxHpBase) ? enemy.maxHpBase : enemy.maxHp;
  if(Number.isFinite(baseHp)){
    enemy.maxHpBase = baseHp;
    enemy.maxHp = baseHp * levelMultiplier;
    enemy.hp = enemy.maxHp;
  }
  const baseAttack = Number.isFinite(enemy.attackBase) ? enemy.attackBase : enemy.attack;
  if(Number.isFinite(baseAttack)){
    enemy.attackBase = baseAttack;
    enemy.attack = baseAttack * levelMultiplier;
  }
  const baseDefense = Number.isFinite(enemy.defenseBase) ? enemy.defenseBase : enemy.defense;
  if(Number.isFinite(baseDefense)){
    enemy.defenseBase = baseDefense;
    enemy.defense = baseDefense * levelMultiplier;
  }
  enemy.statMultiplier = levelMultiplier;
  if(enemy.requiresWater && world.water){
    const field = world.water;
    const defaultCell = (typeof WATER_DEFAULT_CELL_SIZE === 'number' && WATER_DEFAULT_CELL_SIZE > 0)
      ? WATER_DEFAULT_CELL_SIZE
      : 2;
    const cellSize = field.cellSize || defaultCell;
    let bestCol = null;
    let bestDist = Infinity;
    const startX = enemy.pelvis()?.x ?? x;
    for(let col=0; col<field.cols; col++){
      const height = field.heights[col];
      if(height === null || height === undefined) continue;
      const centerX = (field.offsetX || 0) + (col + 0.5) * cellSize;
      const dist = Math.abs(centerX - startX);
      if(dist < bestDist){
        bestDist = dist;
        bestCol = col;
      }
    }
    if(bestCol !== null){
      const surface = field.heights[bestCol];
      if(surface !== null && surface !== undefined){
        const targetX = (field.offsetX || 0) + (bestCol + 0.5) * cellSize;
        const desiredDepth = Math.max(18, enemy.swimDepth || 48);
        const targetSurface = surface + desiredDepth;
        const worldGround = groundHeightAt(world, targetX, { surface: 'top' });
        const clampY = Math.min(worldGround - 24, targetSurface);
        enemy.warpTo(targetX, clampY);
        enemy.homeX = targetX;
        enemy.waterHome = { x: targetX, surface };
      }
    }
  }
  world.sticks.push(enemy);
  world.enemies.push(enemy);
  return enemy;
}

function applyStickSizeScale(stick, scale){
  if(!stick || !Number.isFinite(scale) || scale <= 0) return;
  const baseOffsets = stick._baseRigOffsets || null;
  if(baseOffsets){
    if(!stick.rigOffsets) stick.rigOffsets = {};
    const pelvis = stick.pointsByName ? stick.pointsByName.pelvis : null;
    for(const name of Object.keys(baseOffsets)){
      const base = baseOffsets[name];
      if(!base) continue;
      const scaledX = base.x * scale;
      const scaledY = base.y * scale;
      stick.rigOffsets[name] = { x: scaledX, y: scaledY };
      const point = stick.pointsByName ? stick.pointsByName[name] : null;
      if(point){
        if(pelvis && name !== 'pelvis'){
          const targetX = pelvis.x + scaledX;
          const targetY = pelvis.y + scaledY;
          point.x = targetX;
          point.y = targetY;
          point.prevX = targetX;
          point.prevY = targetY;
        }else if(!pelvis){
          const targetX = scaledX;
          const targetY = scaledY;
          point.x = targetX;
          point.y = targetY;
          point.prevX = targetX;
          point.prevY = targetY;
        }
      }
    }
  }
  if(Array.isArray(stick.rigConstraints) && Array.isArray(RIG_CONFIG?.bones)){
    if(!stick._sizeBaseConstraintMax) stick._sizeBaseConstraintMax = {};
    for(let i = 0; i < stick.rigConstraints.length && i < RIG_CONFIG.bones.length; i++){
      const constraint = stick.rigConstraints[i];
      if(!constraint) continue;
      const bone = RIG_CONFIG.bones[i];
      let aName = null;
      let bName = null;
      if(Array.isArray(bone)){
        [aName, bName] = bone;
      }else if(bone && typeof bone === 'object'){
        aName = bone.a;
        bName = bone.b;
      }
      if(!aName || !bName) continue;
      const baseA = baseOffsets?.[aName];
      const baseB = baseOffsets?.[bName];
      if(!baseA || !baseB) continue;
      const baseRest = Math.hypot(baseA.x - baseB.x, baseA.y - baseB.y);
      if(!Number.isFinite(baseRest)) continue;
      constraint.r = baseRest * scale;
      if(typeof ElasticDist !== 'undefined' && constraint instanceof ElasticDist){
        if(stick._sizeBaseConstraintMax[i] === undefined && Number.isFinite(constraint.maxCorrection)){
          stick._sizeBaseConstraintMax[i] = constraint.maxCorrection;
        }
        const baseMax = stick._sizeBaseConstraintMax[i];
        if(Number.isFinite(baseMax)){
          constraint.maxCorrection = baseMax * scale;
        }
      }
    }
  }
  if(!stick._sizeBaseProps){
    stick._sizeBaseProps = {
      rollRadius: stick.rollRadius,
      slimeWidth: stick.slimeWidth,
      slimeHeight: stick.slimeHeight,
      renderOffsetY: stick.renderOffsetY,
      tripodRadius: stick.tripodRadius,
      tripodLegLength: stick.tripodLegLength,
      tripodLegWidth: stick.tripodLegWidth,
      tripodSuctionSize: stick.tripodSuctionSize,
      blockWidth: stick.blockWidth,
      blockHeight: stick.blockHeight,
      salmonLength: stick.salmonLength,
      salmonHeight: stick.salmonHeight
    };
  }
  const props = stick._sizeBaseProps;
  for(const key of Object.keys(props)){
    const baseValue = props[key];
    if(Number.isFinite(baseValue)){
      stick[key] = baseValue * scale;
    }
  }
  stick.sizeScale = scale;
}

function configureEnemyFromSpec(enemy, base, spec){
  const originalBase = base;
  const kind = spec.kind || originalBase?.kind || enemy.enemyKind || enemy.kind || null;
  const trait = kind && typeof getEnemyTrait === 'function' ? getEnemyTrait(kind) : null;
  base = originalBase && typeof originalBase === 'object' ? Object.assign({}, originalBase) : {};
  if(trait){
    base = Object.assign(base, trait);
  }
  const weaponId = spec.weapon || base.weapon || 'sword';
  enemy.inventory = [ createEquipmentSlot({ mainHand: { type: 'weapon', id: weaponId } }) ];
  enemy.equipIndex = 0;
  const weaponDef = WEAPONS ? WEAPONS[weaponId] : null;
  const element = spec.element || base.element || (weaponDef && weaponDef.element);
  if(element){
    enemy.element = element;
  }else if(enemy.element){
    delete enemy.element;
  }
  if(typeof enemy.setResistances === 'function'){
    const resistances = spec.resistances !== undefined ? spec.resistances : base.resistances;
    enemy.setResistances(resistances ?? []);
  }else if(spec.resistances !== undefined || base.resistances !== undefined){
    const resistances = spec.resistances !== undefined ? spec.resistances : base.resistances;
    if(Array.isArray(resistances)) enemy.resistances = resistances.slice();
    else if(resistances === undefined || resistances === null || resistances === '') enemy.resistances = [];
    else enemy.resistances = [resistances];
  }
  const lavaImmune = spec.lavaImmune ?? base.lavaImmune ?? (element === 'fire');
  enemy.lavaImmune = !!lavaImmune;
  const hp = spec.hp ?? base.hp;
  if(hp){
    enemy.maxHp = hp;
    enemy.hp = hp;
    enemy.maxHpBase = hp;
  }
  const attack = spec.attack ?? base.attack;
  if(attack !== undefined){
    enemy.attack = attack;
    enemy.attackBase = attack;
  }
  const defense = spec.defense ?? base.defense;
  if(defense !== undefined){
    enemy.defense = defense;
    enemy.defenseBase = defense;
  }
  const baseMoveSpeed = firstFiniteNumber(base.moveSpeed);
  if(baseMoveSpeed !== undefined){
    enemy.baseMoveSpeed = baseMoveSpeed;
    enemy.moveSpeed = baseMoveSpeed;
  }
  const baseMoveForce = firstFiniteNumber(base.moveForce);
  if(baseMoveForce !== undefined){
    enemy.baseMoveForce = baseMoveForce;
    enemy.moveForce = baseMoveForce;
  }
  const baseAirMoveForce = firstFiniteNumber(base.airMoveForce);
  if(baseAirMoveForce !== undefined){
    enemy.airMoveForce = baseAirMoveForce;
  }
  const baseMoveDecel = firstFiniteNumber(base.moveDecel);
  if(baseMoveDecel !== undefined){
    enemy.baseMoveDecel = baseMoveDecel;
    enemy.moveDecel = baseMoveDecel;
  }
  const baseJumpSpeed = firstFiniteNumber(base.jumpSpeed);
  if(baseJumpSpeed !== undefined){
    enemy.jumpSpeed = baseJumpSpeed;
  }
  const baseMaxFallSpeed = firstFiniteNumber(base.maxFallSpeed);
  if(baseMaxFallSpeed !== undefined){
    enemy.maxFallSpeed = baseMaxFallSpeed;
  }
  if(base.floats !== undefined) enemy.floats = !!base.floats;
  if(base.flies !== undefined) enemy.flies = !!base.flies;
  if(base.locomotion !== undefined) enemy.locomotion = base.locomotion;
  const behavior = spec.behavior || base.behavior;
  if(behavior) enemy.behavior = behavior;
  const attackRange = spec.attackRange ?? base.attackRange;
  if(attackRange !== undefined) enemy.attackRange = attackRange;
  const preferredRange = spec.preferredRange ?? base.preferredRange;
  if(preferredRange !== undefined) enemy.preferredRange = preferredRange;
  const hoverHeight = spec.hoverHeight ?? base.hoverHeight;
  if(hoverHeight !== undefined) enemy.hoverHeight = hoverHeight;
  const orbRadius = spec.orbRadius ?? base.orbRadius;
  if(orbRadius !== undefined) enemy.orbRadius = orbRadius;
  const orbDriftSpeed = spec.orbDriftSpeed ?? base.orbDriftSpeed;
  if(orbDriftSpeed !== undefined) enemy.orbDriftSpeed = orbDriftSpeed;
  const orbGlyphCount = spec.orbGlyphCount ?? base.orbGlyphCount;
  if(orbGlyphCount !== undefined) enemy.orbGlyphCount = orbGlyphCount;
  const glyphCoreColor = spec.glyphCoreColor ?? base.glyphCoreColor;
  if(glyphCoreColor !== undefined) enemy.glyphCoreColor = glyphCoreColor;
  const beamChargeTime = spec.beamChargeTime ?? base.beamChargeTime;
  if(beamChargeTime !== undefined) enemy.beamChargeTime = beamChargeTime;
  const beamMinWidth = spec.beamMinWidth ?? base.beamMinWidth;
  if(beamMinWidth !== undefined) enemy.beamMinWidth = beamMinWidth;
  const beamMaxWidth = spec.beamMaxWidth ?? base.beamMaxWidth;
  if(beamMaxWidth !== undefined) enemy.beamMaxWidth = beamMaxWidth;
  const beamStillnessThreshold = spec.beamStillnessThreshold ?? base.beamStillnessThreshold;
  if(beamStillnessThreshold !== undefined) enemy.beamStillnessThreshold = beamStillnessThreshold;
  const beamStillnessDamage = spec.beamStillnessDamage ?? base.beamStillnessDamage;
  if(beamStillnessDamage !== undefined) enemy.beamStillnessDamage = beamStillnessDamage;
  const beamCooldown = spec.beamCooldown ?? base.beamCooldown;
  if(beamCooldown !== undefined) enemy.beamCooldown = beamCooldown;
  const leapStrength = spec.leapStrength ?? base.leapStrength;
  if(leapStrength !== undefined) enemy.leapStrength = leapStrength;
  const deathEffect = spec.deathEffect || base.deathEffect;
  if(deathEffect) enemy.deathEffect = deathEffect;
  const deathDamage = spec.deathDamage ?? base.deathDamage;
  if(deathDamage !== undefined) enemy.deathDamage = deathDamage;
  const deathRadius = spec.deathRadius ?? base.deathRadius;
  if(deathRadius !== undefined) enemy.deathRadius = deathRadius;
  const deathSandCount = spec.deathSandCount ?? base.deathSandCount;
  if(deathSandCount !== undefined) enemy.deathSandCount = deathSandCount;
  const deathSandSpreadX = spec.deathSandSpreadX ?? base.deathSandSpreadX;
  if(deathSandSpreadX !== undefined) enemy.deathSandSpreadX = deathSandSpreadX;
  const deathSandSpreadY = spec.deathSandSpreadY ?? base.deathSandSpreadY;
  if(deathSandSpreadY !== undefined) enemy.deathSandSpreadY = deathSandSpreadY;
  const blastRadius = spec.blastRadius ?? base.blastRadius;
  if(blastRadius !== undefined) enemy.blastRadius = blastRadius;
  const blastDamage = spec.blastDamage ?? base.blastDamage;
  if(blastDamage !== undefined) enemy.blastDamage = blastDamage;
  const pullRadius = spec.pullRadius ?? base.pullRadius;
  if(pullRadius !== undefined) enemy.pullRadius = pullRadius;
  const pullStrength = spec.pullStrength ?? base.pullStrength;
  if(pullStrength !== undefined) enemy.pullStrength = pullStrength;
  const voidGlyphHead = spec.voidGlyphHead ?? base.voidGlyphHead;
  if(voidGlyphHead !== undefined) enemy.voidGlyphHead = !!voidGlyphHead;
  const headSigil = spec.headSigil ?? base.headSigil;
  if(headSigil !== undefined) enemy.headSigil = headSigil;
  const headSigilColor = spec.headSigilColor ?? base.headSigilColor;
  if(headSigilColor !== undefined) enemy.headSigilColor = headSigilColor;
  const iceVolleySize = spec.iceVolleySize ?? base.iceVolleySize;
  if(iceVolleySize !== undefined) enemy.iceVolleySize = iceVolleySize;
  const iceVolleySpacing = spec.iceVolleySpacing ?? base.iceVolleySpacing;
  if(iceVolleySpacing !== undefined) enemy.iceVolleySpacing = iceVolleySpacing;
  const iceVolleyInterval = spec.iceVolleyInterval ?? base.iceVolleyInterval;
  if(iceVolleyInterval !== undefined) enemy.iceVolleyInterval = iceVolleyInterval;
  const iceVolleyWarmup = spec.iceVolleyWarmup ?? base.iceVolleyWarmup;
  if(iceVolleyWarmup !== undefined) enemy.iceVolleyWarmup = iceVolleyWarmup;
  const iceVolleyRecovery = spec.iceVolleyRecovery ?? base.iceVolleyRecovery;
  if(iceVolleyRecovery !== undefined) enemy.iceVolleyRecovery = iceVolleyRecovery;
  const iceVolleyCooldown = spec.iceVolleyCooldown ?? base.iceVolleyCooldown;
  if(iceVolleyCooldown !== undefined) enemy.iceVolleyCooldown = iceVolleyCooldown;
  const icePillarDamage = spec.icePillarDamage ?? base.icePillarDamage;
  if(icePillarDamage !== undefined) enemy.icePillarDamage = icePillarDamage;
  const icePillarRadius = spec.icePillarRadius ?? base.icePillarRadius;
  if(icePillarRadius !== undefined) enemy.icePillarRadius = icePillarRadius;
  const icePillarHeight = spec.icePillarHeight ?? base.icePillarHeight;
  if(icePillarHeight !== undefined) enemy.icePillarHeight = icePillarHeight;
  const icePillarChargeTime = spec.icePillarChargeTime ?? base.icePillarChargeTime;
  if(icePillarChargeTime !== undefined) enemy.icePillarChargeTime = icePillarChargeTime;
  const icePillarDuration = spec.icePillarDuration ?? base.icePillarDuration;
  if(icePillarDuration !== undefined) enemy.icePillarDuration = icePillarDuration;
  const icePillarSlowMultiplier = spec.icePillarSlowMultiplier ?? base.icePillarSlowMultiplier;
  if(icePillarSlowMultiplier !== undefined) enemy.icePillarSlowMultiplier = icePillarSlowMultiplier;
  const icePillarSlowDuration = spec.icePillarSlowDuration ?? base.icePillarSlowDuration;
  if(icePillarSlowDuration !== undefined) enemy.icePillarSlowDuration = icePillarSlowDuration;
  const psiFloatDuration = spec.psiFloatDuration ?? base.psiFloatDuration;
  if(psiFloatDuration !== undefined) enemy.psiFloatDuration = psiFloatDuration;
  const psiFloatHoverForce = spec.psiFloatHoverForce ?? base.psiFloatHoverForce;
  if(psiFloatHoverForce !== undefined) enemy.psiFloatHoverForce = psiFloatHoverForce;
  const psiFloatHoverDamp = spec.psiFloatHoverDamp ?? base.psiFloatHoverDamp;
  if(psiFloatHoverDamp !== undefined) enemy.psiFloatHoverDamp = psiFloatHoverDamp;
  const psiDiveCooldown = spec.psiDiveCooldown ?? base.psiDiveCooldown;
  if(psiDiveCooldown !== undefined) enemy.psiDiveCooldown = psiDiveCooldown;
  const psiFloatRangeBias = spec.psiFloatRangeBias ?? base.psiFloatRangeBias;
  if(psiFloatRangeBias !== undefined) enemy.psiFloatRangeBias = psiFloatRangeBias;
  const voidHaloRadius = spec.voidHaloRadius ?? base.voidHaloRadius;
  if(voidHaloRadius !== undefined) enemy.voidHaloRadius = voidHaloRadius;
  const voidHaloHeightOffset = spec.voidHaloHeightOffset ?? base.voidHaloHeightOffset;
  if(voidHaloHeightOffset !== undefined) enemy.voidHaloHeightOffset = voidHaloHeightOffset;
  const voidHaloMaxOrbs = spec.voidHaloMaxOrbs ?? base.voidHaloMaxOrbs;
  if(voidHaloMaxOrbs !== undefined) enemy.voidHaloMaxOrbs = voidHaloMaxOrbs;
  const voidHaloSpinSpeed = spec.voidHaloSpinSpeed ?? base.voidHaloSpinSpeed;
  if(voidHaloSpinSpeed !== undefined) enemy.voidHaloSpinSpeed = voidHaloSpinSpeed;
  const voidHaloRegenDelay = spec.voidHaloRegenDelay ?? base.voidHaloRegenDelay;
  if(voidHaloRegenDelay !== undefined) enemy.voidHaloRegenDelay = voidHaloRegenDelay;
  const voidHaloVolleyInterval = spec.voidHaloVolleyInterval ?? base.voidHaloVolleyInterval;
  if(voidHaloVolleyInterval !== undefined) enemy.voidHaloVolleyInterval = voidHaloVolleyInterval;
  const voidHaloChargeTime = spec.voidHaloChargeTime ?? base.voidHaloChargeTime;
  if(voidHaloChargeTime !== undefined) enemy.voidHaloChargeTime = voidHaloChargeTime;
  const voidHaloAttackDowntime = spec.voidHaloAttackDowntime ?? base.voidHaloAttackDowntime;
  if(voidHaloAttackDowntime !== undefined) enemy.voidHaloAttackDowntime = voidHaloAttackDowntime;
  const voidHaloChargeDecay = spec.voidHaloChargeDecay ?? base.voidHaloChargeDecay;
  if(voidHaloChargeDecay !== undefined) enemy.voidHaloChargeDecay = voidHaloChargeDecay;
  const voidHaloOrbRadius = spec.voidHaloOrbRadius ?? base.voidHaloOrbRadius;
  if(voidHaloOrbRadius !== undefined) enemy.voidHaloOrbRadius = voidHaloOrbRadius;
  const speedMult = spec.speedMult ?? base.speedMult;
  const speedScale = speedMult ?? 1;
  enemy.moveForce = enemy.baseMoveForce * speedScale;
  if(enemy.baseMoveSpeed !== undefined) enemy.moveSpeed = enemy.baseMoveSpeed * speedScale;
  if(enemy.moveForce !== undefined) enemy.baseMoveForce = enemy.moveForce;
  if(enemy.moveSpeed !== undefined) enemy.baseMoveSpeed = enemy.moveSpeed;
  enemy.statusMoveScale = 1;
  enemy.slowUntil = 0;
  enemy.slowMultiplier = 1;
  const renderStyle = spec.renderStyle ?? base.renderStyle;
  if(renderStyle) enemy.renderStyle = renderStyle;
  const renderPixelSize = spec.renderPixelSize ?? base.renderPixelSize;
  if(renderPixelSize !== undefined) enemy.renderPixelSize = renderPixelSize;
  const scarfConfigBase = base.scarfConfig;
  const scarfConfigSpec = spec.scarfConfig;
  const scarfColor = spec.scarfColor ?? base.scarfColor;
  const scarfTrailColor = spec.scarfTrailColor ?? base.scarfTrailColor;
  const scarfPixelSize = spec.scarfPixelSize ?? base.scarfPixelSize;
  const scarfSegments = spec.scarfSegments ?? base.scarfSegments;
  const scarfWaveAmplitude = spec.scarfWaveAmplitude ?? base.scarfWaveAmplitude;
  const scarfWaveFrequency = spec.scarfWaveFrequency ?? base.scarfWaveFrequency;
  const scarfWaveLift = spec.scarfWaveLift ?? base.scarfWaveLift;
  const scarfWaveLiftFrequency = spec.scarfWaveLiftFrequency ?? base.scarfWaveLiftFrequency;
  const scarfSegmentSpacing = spec.scarfSegmentSpacing ?? base.scarfSegmentSpacing;
  const scarfDropPerSegment = spec.scarfDropPerSegment ?? base.scarfDropPerSegment;
  const scarfFadeTail = spec.scarfFadeTail ?? base.scarfFadeTail;
  const scarfAnchorOffsetX = spec.scarfAnchorOffsetX ?? base.scarfAnchorOffsetX;
  const scarfAnchorOffsetY = spec.scarfAnchorOffsetY ?? base.scarfAnchorOffsetY;
  const scarfWaveTaper = spec.scarfWaveTaper ?? base.scarfWaveTaper;
  const scarfSpacingDecay = spec.scarfSpacingDecay ?? base.scarfSpacingDecay;
  const scarfLiftTaper = spec.scarfLiftTaper ?? base.scarfLiftTaper;
  const scarfDropTaper = spec.scarfDropTaper ?? base.scarfDropTaper;
  const scarfAnchorBackOffset = spec.scarfAnchorBackOffset ?? base.scarfAnchorBackOffset;
  const scarfAnchorJoint = spec.scarfAnchorJoint ?? base.scarfAnchorJoint;
  const scarfPixelOnly = spec.scarfPixelOnly ?? base.scarfPixelOnly;
  const scarfWavePhaseOffset = spec.scarfWavePhaseOffset ?? base.scarfWavePhaseOffset;
  if(scarfConfigBase || scarfConfigSpec || scarfColor !== undefined || scarfPixelSize !== undefined){
    const config = Object.assign({}, scarfConfigBase || {}, scarfConfigSpec || {});
    if(scarfColor !== undefined) config.color = scarfColor;
    if(scarfTrailColor !== undefined) config.trailColor = scarfTrailColor;
    if(scarfPixelSize !== undefined) config.pixelSize = scarfPixelSize;
    if(scarfSegments !== undefined) config.segments = scarfSegments;
    if(scarfWaveAmplitude !== undefined) config.waveAmplitude = scarfWaveAmplitude;
    if(scarfWaveFrequency !== undefined) config.waveFrequency = scarfWaveFrequency;
    if(scarfWaveLift !== undefined) config.waveLift = scarfWaveLift;
    if(scarfWaveLiftFrequency !== undefined) config.waveLiftFrequency = scarfWaveLiftFrequency;
    if(scarfSegmentSpacing !== undefined) config.segmentSpacing = scarfSegmentSpacing;
    if(scarfDropPerSegment !== undefined) config.dropPerSegment = scarfDropPerSegment;
    if(scarfFadeTail !== undefined) config.fadeTail = scarfFadeTail;
    if(scarfAnchorOffsetX !== undefined) config.anchorOffsetX = scarfAnchorOffsetX;
    if(scarfAnchorOffsetY !== undefined) config.anchorOffsetY = scarfAnchorOffsetY;
    if(scarfWaveTaper !== undefined) config.waveTaper = scarfWaveTaper;
    if(scarfSpacingDecay !== undefined) config.spacingDecay = scarfSpacingDecay;
    if(scarfLiftTaper !== undefined) config.liftTaper = scarfLiftTaper;
    if(scarfDropTaper !== undefined) config.dropTaper = scarfDropTaper;
    if(scarfAnchorBackOffset !== undefined) config.anchorBackOffset = scarfAnchorBackOffset;
    if(scarfAnchorJoint !== undefined) config.anchorJoint = scarfAnchorJoint;
    if(scarfPixelOnly !== undefined) config.pixelOnly = scarfPixelOnly;
    if(scarfWavePhaseOffset !== undefined) config.wavePhaseOffset = scarfWavePhaseOffset;
    enemy.scarfConfig = Object.keys(config).length ? config : undefined;
  }
  const slashLength = spec.slashLength ?? base.slashLength;
  if(slashLength !== undefined) enemy.slashLength = slashLength;
  const slashWidth = spec.slashWidth ?? base.slashWidth;
  if(slashWidth !== undefined) enemy.slashWidth = slashWidth;
  const slashDamage = spec.slashDamage ?? base.slashDamage;
  if(slashDamage !== undefined) enemy.slashDamage = slashDamage;
  const slashDuration = spec.slashDuration ?? base.slashDuration;
  if(slashDuration !== undefined) enemy.slashDuration = slashDuration;
  const slashCooldown = spec.slashCooldown ?? base.slashCooldown;
  if(slashCooldown !== undefined) enemy.slashCooldown = slashCooldown;
  const slashWindup = spec.slashWindup ?? base.slashWindup;
  if(slashWindup !== undefined) enemy.slashWindup = slashWindup;
  const slashRecover = spec.slashRecover ?? base.slashRecover;
  if(slashRecover !== undefined) enemy.slashRecover = slashRecover;
  const slashStickMargin = spec.slashStickMargin ?? base.slashStickMargin;
  if(slashStickMargin !== undefined) enemy.slashStickMargin = slashStickMargin;
  const slashOffsetX = spec.slashOffsetX ?? base.slashOffsetX;
  if(slashOffsetX !== undefined) enemy.slashOffsetX = slashOffsetX;
  const slashOffsetY = spec.slashOffsetY ?? base.slashOffsetY;
  if(slashOffsetY !== undefined) enemy.slashOffsetY = slashOffsetY;
  const slashCoreColor = spec.slashCoreColor ?? base.slashCoreColor;
  if(slashCoreColor !== undefined) enemy.slashCoreColor = slashCoreColor;
  const slashEdgeColor = spec.slashEdgeColor ?? base.slashEdgeColor;
  if(slashEdgeColor !== undefined) enemy.slashEdgeColor = slashEdgeColor;
  const slashGlowColor = spec.slashGlowColor ?? base.slashGlowColor;
  if(slashGlowColor !== undefined) enemy.slashGlowColor = slashGlowColor;
  const cloneCount = spec.cloneCount ?? base.cloneCount;
  if(cloneCount !== undefined) enemy.cloneCount = cloneCount;
  const cloneMaxCount = spec.cloneMaxCount ?? base.cloneMaxCount;
  if(cloneMaxCount !== undefined) enemy.cloneMaxCount = cloneMaxCount;
  const cloneCooldown = spec.cloneCooldown ?? base.cloneCooldown;
  if(cloneCooldown !== undefined) enemy.cloneCooldown = cloneCooldown;
  const cloneCooldownJitter = spec.cloneCooldownJitter ?? base.cloneCooldownJitter;
  if(cloneCooldownJitter !== undefined) enemy.cloneCooldownJitter = cloneCooldownJitter;
  const cloneSpawnRadius = spec.cloneSpawnRadius ?? base.cloneSpawnRadius;
  if(cloneSpawnRadius !== undefined) enemy.cloneSpawnRadius = cloneSpawnRadius;
  const cloneLifetime = spec.cloneLifetime ?? base.cloneLifetime;
  if(cloneLifetime !== undefined) enemy.cloneLifetime = cloneLifetime;
  const cloneAttackMultiplier = spec.cloneAttackMultiplier ?? base.cloneAttackMultiplier;
  if(cloneAttackMultiplier !== undefined) enemy.cloneAttackMultiplier = cloneAttackMultiplier;
  const cloneDamageMultiplier = spec.cloneDamageMultiplier ?? base.cloneDamageMultiplier;
  if(cloneDamageMultiplier !== undefined) enemy.cloneDamageMultiplier = cloneDamageMultiplier;
  const cloneWindup = spec.cloneWindup ?? base.cloneWindup;
  if(cloneWindup !== undefined) enemy.cloneWindup = cloneWindup;
  const cloneRecover = spec.cloneRecover ?? base.cloneRecover;
  if(cloneRecover !== undefined) enemy.cloneRecover = cloneRecover;
  const cloneSlashLength = spec.cloneSlashLength ?? base.cloneSlashLength;
  if(cloneSlashLength !== undefined) enemy.cloneSlashLength = cloneSlashLength;
  const cloneSlashWidth = spec.cloneSlashWidth ?? base.cloneSlashWidth;
  if(cloneSlashWidth !== undefined) enemy.cloneSlashWidth = cloneSlashWidth;
  const cloneSlashDuration = spec.cloneSlashDuration ?? base.cloneSlashDuration;
  if(cloneSlashDuration !== undefined) enemy.cloneSlashDuration = cloneSlashDuration;
  const cloneSlashCooldown = spec.cloneSlashCooldown ?? base.cloneSlashCooldown;
  if(cloneSlashCooldown !== undefined) enemy.cloneSlashCooldown = cloneSlashCooldown;
  const cloneSlashWindup = spec.cloneSlashWindup ?? base.cloneSlashWindup;
  if(cloneSlashWindup !== undefined) enemy.cloneSlashWindup = cloneSlashWindup;
  const cloneSlashRecover = spec.cloneSlashRecover ?? base.cloneSlashRecover;
  if(cloneSlashRecover !== undefined) enemy.cloneSlashRecover = cloneSlashRecover;
  const cloneSlashStickMargin = spec.cloneSlashStickMargin ?? base.cloneSlashStickMargin;
  if(cloneSlashStickMargin !== undefined) enemy.cloneSlashStickMargin = cloneSlashStickMargin;
  const mirageClone = spec.mirageClone ?? base.mirageClone;
  if(mirageClone !== undefined) enemy.mirageClone = mirageClone;
  if(spec.showWeapon !== undefined || base.showWeapon !== undefined){
    enemy.showWeapon = spec.showWeapon ?? base.showWeapon;
  }
  if(spec.bodyColor || base.bodyColor) enemy.bodyColor = spec.bodyColor || base.bodyColor;
  if(spec.accentColor || base.accentColor) enemy.accentColor = spec.accentColor || base.accentColor;
  const renderOffsetY = spec.renderOffsetY ?? base.renderOffsetY;
  if(renderOffsetY !== undefined) enemy.renderOffsetY = renderOffsetY;
  const specMoveSpeed = firstFiniteNumber(spec.moveSpeed);
  if(specMoveSpeed !== undefined){
    enemy.moveSpeed = specMoveSpeed;
    enemy.baseMoveSpeed = specMoveSpeed;
  }
  const specMoveForce = firstFiniteNumber(spec.moveForce);
  if(specMoveForce !== undefined){
    enemy.moveForce = specMoveForce;
    enemy.baseMoveForce = specMoveForce;
  }
  const specAirMoveForce = firstFiniteNumber(spec.airMoveForce);
  if(specAirMoveForce !== undefined){
    enemy.airMoveForce = specAirMoveForce;
  }
  const specMoveDecel = firstFiniteNumber(spec.moveDecel);
  if(specMoveDecel !== undefined){
    enemy.moveDecel = specMoveDecel;
    enemy.baseMoveDecel = specMoveDecel;
  }
  const specJumpSpeed = firstFiniteNumber(spec.jumpSpeed);
  if(specJumpSpeed !== undefined){
    enemy.jumpSpeed = specJumpSpeed;
  }
  const specMaxFallSpeed = firstFiniteNumber(spec.maxFallSpeed);
  if(specMaxFallSpeed !== undefined){
    enemy.maxFallSpeed = specMaxFallSpeed;
  }
  if(spec.floats !== undefined) enemy.floats = !!spec.floats;
  if(spec.flies !== undefined) enemy.flies = !!spec.flies;
  if(spec.locomotion !== undefined) enemy.locomotion = spec.locomotion;
  const realmGuardianWidth = spec.realmGuardianWidth ?? base.realmGuardianWidth;
  if(realmGuardianWidth !== undefined) enemy.realmGuardianWidth = realmGuardianWidth;
  const realmGuardianHeight = spec.realmGuardianHeight ?? base.realmGuardianHeight;
  if(realmGuardianHeight !== undefined) enemy.realmGuardianHeight = realmGuardianHeight;
  const rollRadius = spec.rollRadius ?? base.rollRadius;
  if(rollRadius !== undefined) enemy.rollRadius = rollRadius;
  const rollBurstForce = spec.rollBurstForce ?? base.rollBurstForce;
  if(rollBurstForce !== undefined) enemy.rollBurstForce = rollBurstForce;
  const rollCooldown = spec.rollCooldown ?? base.rollCooldown;
  if(rollCooldown !== undefined) enemy.rollCooldown = rollCooldown;
  const slimeWidth = spec.slimeWidth ?? base.slimeWidth;
  if(slimeWidth !== undefined) enemy.slimeWidth = slimeWidth;
  const slimeHeight = spec.slimeHeight ?? base.slimeHeight;
  if(slimeHeight !== undefined) enemy.slimeHeight = slimeHeight;
  const sizeScale = spec.sizeScale ?? base.sizeScale;
  if(Number.isFinite(sizeScale) && sizeScale > 0 && Math.abs(sizeScale - 1) > 1e-3){
    applyStickSizeScale(enemy, sizeScale);
  }
  const tripodRadius = spec.tripodRadius ?? base.tripodRadius;
  if(tripodRadius !== undefined) enemy.tripodRadius = tripodRadius;
  const tripodLegLength = spec.tripodLegLength ?? base.tripodLegLength;
  if(tripodLegLength !== undefined) enemy.tripodLegLength = tripodLegLength;
  const tripodLegWidth = spec.tripodLegWidth ?? base.tripodLegWidth;
  if(tripodLegWidth !== undefined) enemy.tripodLegWidth = tripodLegWidth;
  const tripodSuctionSize = spec.tripodSuctionSize ?? base.tripodSuctionSize;
  if(tripodSuctionSize !== undefined) enemy.tripodSuctionSize = tripodSuctionSize;
  const tripodStepForce = spec.tripodStepForce ?? base.tripodStepForce;
  if(tripodStepForce !== undefined) enemy.tripodStepForce = tripodStepForce;
  const tripodHopStrength = spec.tripodHopStrength ?? base.tripodHopStrength;
  if(tripodHopStrength !== undefined) enemy.tripodHopStrength = tripodHopStrength;
  const tripodStepInterval = spec.tripodStepInterval ?? base.tripodStepInterval;
  if(tripodStepInterval !== undefined) enemy.tripodStepInterval = tripodStepInterval;
  const blockWidth = spec.blockWidth ?? base.blockWidth;
  if(blockWidth !== undefined) enemy.blockWidth = blockWidth;
  const blockHeight = spec.blockHeight ?? base.blockHeight;
  if(blockHeight !== undefined) enemy.blockHeight = blockHeight;
  const hitboxWidth = spec.hitboxWidth ?? base.hitboxWidth;
  if(hitboxWidth !== undefined) enemy.hitboxWidth = hitboxWidth;
  const hitboxHeight = spec.hitboxHeight ?? base.hitboxHeight;
  if(hitboxHeight !== undefined) enemy.hitboxHeight = hitboxHeight;
  const hitboxOffsetY = spec.hitboxOffsetY ?? base.hitboxOffsetY;
  if(hitboxOffsetY !== undefined) enemy.hitboxOffsetY = hitboxOffsetY;
  if(spec.passThroughTerrain !== undefined || base.passThroughTerrain !== undefined){
    const pass = spec.passThroughTerrain ?? base.passThroughTerrain;
    enemy.passThroughTerrain = !!pass;
  }
  const ghostLikeValue = spec.ghost !== undefined ? spec.ghost : (base.ghost !== undefined ? base.ghost : enemy.ghostLike);
  if(ghostLikeValue !== undefined){
    enemy.ghostLike = !!ghostLikeValue;
    if(enemy.ghostLike){
      enemy.passThroughTerrain = true;
      enemy.floats = true;
      enemy.flies = true;
    }
  }
  if(spec.requiresWater !== undefined || base.requiresWater !== undefined){
    enemy.requiresWater = spec.requiresWater ?? base.requiresWater;
  }
  if(spec.airDamageDelay !== undefined || base.airDamageDelay !== undefined){
    enemy.airDamageDelay = spec.airDamageDelay ?? base.airDamageDelay;
  }
  if(spec.airDamageRate !== undefined || base.airDamageRate !== undefined){
    enemy.airDamageRate = spec.airDamageRate ?? base.airDamageRate;
  }
  if(spec.waterSoft !== undefined || base.waterSoft !== undefined){
    enemy.waterSoft = spec.waterSoft ?? base.waterSoft;
  }
  if(spec.swimForce !== undefined || base.swimForce !== undefined){
    enemy.swimForce = spec.swimForce ?? base.swimForce;
  }
  if(spec.swimBuoyancy !== undefined || base.swimBuoyancy !== undefined){
    enemy.swimBuoyancy = spec.swimBuoyancy ?? base.swimBuoyancy;
  }
  if(spec.swimDrag !== undefined || base.swimDrag !== undefined){
    enemy.swimDrag = spec.swimDrag ?? base.swimDrag;
  }
  if(spec.swimDamp !== undefined || base.swimDamp !== undefined){
    enemy.swimDamp = spec.swimDamp ?? base.swimDamp;
  }
  if(spec.swimDepth !== undefined || base.swimDepth !== undefined){
    enemy.swimDepth = spec.swimDepth ?? base.swimDepth;
  }
  if(spec.salmonLength !== undefined || base.salmonLength !== undefined){
    enemy.salmonLength = spec.salmonLength ?? base.salmonLength;
  }
  if(spec.salmonHeight !== undefined || base.salmonHeight !== undefined){
    enemy.salmonHeight = spec.salmonHeight ?? base.salmonHeight;
  }
  if(enemy.renderStyle === 'tripodOrb'){
    enemy.tripodRotation = 0;
    enemy.tripodStepPhase = 1;
    enemy.tripodStepTimer = 0;
    if(!enemy.tripodStepDirection){
      enemy.tripodStepDirection = 1;
    }
  }
  applyEnemyHitbox(enemy, base, spec);
  if(enemy.flies){
    const points = Array.isArray(enemy.points) ? enemy.points : [];
    for(const point of points){
      if(!point) continue;
      point.ignoreGround = true;
      point.gravityScale = 0;
    }
  }
  if(enemy.ghostLike){
    const points = Array.isArray(enemy.points) ? enemy.points : [];
    const fallbackCeilingRadius = (()=>{
      const size = firstFinitePositive(
        enemy.hitboxWidth,
        enemy.hitboxHeight,
        enemy.orbRadius ? enemy.orbRadius * 2 : null,
        enemy.bodyRadius ? enemy.bodyRadius * 2 : null
      );
      return size ? Math.max(8, size * 0.25) : 12;
    })();
    for(const point of points){
      if(!point) continue;
      point.ignoreGround = true;
      point.gravityScale = 0;
      point.terrainRadius = 0;
      if(point.rigPart === 'pelvis' || point.rigPart === 'neck'){
        point.ceilingRadius = Math.max(point.ceilingRadius || 0, fallbackCeilingRadius);
      }
    }
  }
  if(enemy.enemyKind === 'timeWraith'){
    enemy.ignoreForDoor = true;
    enemy.freezeExempt = true;
    enemy.timeWraithAwake = false;
  }
  enemy.level = spec.level || enemy.level;
  enemy.isBoss = !!(spec.isBoss || base.isBoss);
  if(enemy.isBoss && !spec.hp && !base.hp){
    enemy.maxHp = 320;
    enemy.hp = enemy.maxHp;
  }
  enemy.dir = -1;
}

function firstFinitePositive(...values){
  for(const value of values){
    if(Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function firstFiniteNumber(...values){
  for(const value of values){
    if(Number.isFinite(value)) return value;
  }
  return undefined;
}

function applyEnemyHitbox(enemy, base, spec){
  if(!enemy || typeof enemy.setRectHitbox !== 'function') return;
  const kind = enemy.enemyKind || enemy.kind || null;
  const archetypeType = base.physicsType || enemy.physicsType || null;
  const explicitType = spec.physicsType || archetypeType;
  const nonStick = explicitType === 'nonStick' || NON_STICK_ENEMY_KINDS.has(kind);
  if(!nonStick) return;
  const width = firstFinitePositive(
    spec.hitboxWidth,
    base.hitboxWidth,
    enemy.hitboxWidth,
    spec.blockWidth,
    base.blockWidth,
    enemy.blockWidth,
    spec.slimeWidth,
    base.slimeWidth,
    enemy.slimeWidth,
    spec.realmGuardianWidth,
    base.realmGuardianWidth,
    enemy.realmGuardianWidth,
    spec.tripodRadius ? spec.tripodRadius * 2 : null,
    base.tripodRadius ? base.tripodRadius * 2 : null,
    enemy.tripodRadius ? enemy.tripodRadius * 2 : null,
    spec.rollRadius ? spec.rollRadius * 2 : null,
    base.rollRadius ? base.rollRadius * 2 : null,
    enemy.rollRadius ? enemy.rollRadius * 2 : null,
    spec.orbRadius ? spec.orbRadius * 2 : null,
    base.orbRadius ? base.orbRadius * 2 : null,
    enemy.orbRadius ? enemy.orbRadius * 2 : null
  );
  const height = firstFinitePositive(
    spec.hitboxHeight,
    base.hitboxHeight,
    enemy.hitboxHeight,
    spec.blockHeight,
    base.blockHeight,
    enemy.blockHeight,
    spec.slimeHeight,
    base.slimeHeight,
    enemy.slimeHeight,
    spec.realmGuardianHeight,
    base.realmGuardianHeight,
    enemy.realmGuardianHeight,
    spec.salmonHeight,
    base.salmonHeight,
    enemy.salmonHeight,
    spec.tripodLegLength ? spec.tripodLegLength + (spec.tripodRadius || 0) : null,
    base.tripodLegLength ? base.tripodLegLength + (base.tripodRadius || 0) : null,
    enemy.tripodLegLength ? enemy.tripodLegLength + (enemy.tripodRadius || 0) : null,
    spec.rollRadius ? spec.rollRadius * 2 : null,
    base.rollRadius ? base.rollRadius * 2 : null,
    enemy.rollRadius ? enemy.rollRadius * 2 : null,
    spec.orbRadius ? spec.orbRadius * 2 : null,
    base.orbRadius ? base.orbRadius * 2 : null,
    enemy.orbRadius ? enemy.orbRadius * 2 : null
  );
  const finalWidth = width || 96;
  const finalHeight = height || 96;
  const centerOffset = Number.isFinite(spec.hitboxOffsetY)
    ? spec.hitboxOffsetY
    : Number.isFinite(base.hitboxOffsetY)
      ? base.hitboxOffsetY
      : Number.isFinite(enemy.hitboxOffsetY)
        ? enemy.hitboxOffsetY
        : (Number.isFinite(enemy.renderOffsetY) ? enemy.renderOffsetY : 0);
  const rawShape = spec.hitboxShape ?? base.hitboxShape ?? enemy.hitboxShape;
  const normalizedShape = typeof rawShape === 'string' ? rawShape.toLowerCase() : null;
  const hitboxOptions = { centerOffsetY: centerOffset };
  if(normalizedShape === 'ellipse' && typeof enemy.setEllipseHitbox === 'function'){
    enemy.setEllipseHitbox(finalWidth, finalHeight, hitboxOptions);
  }else{
    if(normalizedShape) hitboxOptions.shape = normalizedShape;
    enemy.setRectHitbox(finalWidth, finalHeight, hitboxOptions);
  }
  enemy.physicsType = 'nonStick';
}

function ensureWorldTreeWeather(state){
  if(!state) return 'clear';
  const dimensionKey = state.voidDimensionActive ? 'void' : 'surface';
  if(state.worldTreeWeather === undefined || state.worldTreeWeatherDimension !== dimensionKey){
    const roll = Math.random();
    state.worldTreeWeather = roll < 0.05
      ? 'thunder'
      : (roll < 0.25 ? 'rain' : 'clear');
    state.worldTreeWeatherDimension = dimensionKey;
  }
  return state.worldTreeWeather;
}

function createRainFieldForStage(world, state, compiled, overrides={}){
  if(!world || !state || !compiled) return null;
  const meta = state.layoutMeta || {};
  const tileSize = Number.isFinite(compiled.tileSize) ? compiled.tileSize : (DEFAULT_LAYOUT_TILE_SIZE || 30);
  const rows = Number.isFinite(compiled.rows) ? compiled.rows : (meta.rows || 0);
  const cols = Number.isFinite(compiled.cols) ? compiled.cols : (meta.cols || 0);
  const stageWidth = Math.max(20, cols * tileSize);
  const worldWidth = Number.isFinite(world.width) ? world.width : stageWidth;
  const width = overrides.width !== undefined ? overrides.width : Math.max(stageWidth, worldWidth, 600);
  const stageCenter = Number.isFinite(compiled.offsetX)
    ? compiled.offsetX + stageWidth * 0.5
    : worldWidth * 0.5;
  const centerX = overrides.x !== undefined ? overrides.x : stageCenter;
  const floorY = overrides.baseY !== undefined
    ? overrides.baseY
    : (Number.isFinite(meta.floorY)
      ? meta.floorY
      : (Number.isFinite(world.groundY)
        ? world.groundY
        : (Number.isFinite(world.height) ? world.height - 100 : 0)));
  const layoutHeight = rows * tileSize;
  const height = overrides.height !== undefined
    ? overrides.height
    : Math.max(400, layoutHeight > 0 ? layoutHeight : (Number.isFinite(world.height) ? world.height * 0.6 : 600));
  const rainField = {
    type: 'rainField',
    x: centerX,
    baseY: floorY,
    width,
    height,
    layer: overrides.layer || 'foreground',
    density: overrides.density,
    densityVariance: overrides.densityVariance,
    speed: overrides.speed,
    speedVariance: overrides.speedVariance,
    wind: overrides.wind,
    windVariance: overrides.windVariance,
    dropLength: overrides.dropLength,
    dropLengthVariance: overrides.dropLengthVariance,
    dropThickness: overrides.dropThickness,
    dropThicknessVariance: overrides.dropThicknessVariance,
    dropAlpha: overrides.dropAlpha,
    dropColor: overrides.dropColor,
    splashRadius: overrides.splashRadius,
    splashDuration: overrides.splashDuration,
    splashThickness: overrides.splashThickness,
    splashColor: overrides.splashColor,
    flashColor: overrides.flashColor,
    flashAlpha: overrides.flashAlpha,
    flashIntensity: overrides.flashIntensity,
    thunderIntervalMin: overrides.thunderIntervalMin,
    thunderIntervalMax: overrides.thunderIntervalMax,
    mistAlpha: overrides.mistAlpha,
    mistColor: overrides.mistColor,
    overlayColor: overrides.overlayColor,
    overlayAlpha: overrides.overlayAlpha,
    maxDrops: overrides.maxDrops,
    viewMarginX: overrides.viewMarginX,
    viewMarginTop: overrides.viewMarginTop,
    viewMarginBottom: overrides.viewMarginBottom
  };
  if(overrides.followCamera !== undefined) rainField.followCamera = overrides.followCamera;
  for(const key in rainField){
    if(rainField[key] === undefined || rainField[key] === null){
      delete rainField[key];
    }
  }
  return rainField;
}

function applyWorldTreeWeather(world, state, compiled){
  if(!world || !state || !compiled) return;
  if(!state.def || state.def.id !== 'worldTree') return;
  const weather = ensureWorldTreeWeather(state);
  let decor = Array.isArray(world.decor) ? world.decor.slice() : [];
  let paletteOverride = null;
  let rainTemplate = null;
  const screenIndex = Number.isInteger(compiled.screenIndex) ? compiled.screenIndex : null;
  const overrides = buildWorldTreeWeatherOverrides(weather);
  if(overrides){
    const template = createRainFieldForStage(world, state, compiled, overrides);
    const matchIndex = decor.findIndex(prop=>{
      if(!prop || prop.type !== 'rainField') return false;
      if(screenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== screenIndex) return false;
      return true;
    });
    if(matchIndex >= 0){
      const existing = decor[matchIndex];
      if(template) syncWorldTreeWeatherRainField(existing, template);
      if(screenIndex !== null) existing.screenIndex = screenIndex;
      rainTemplate = cloneSymbolData(existing);
    }else if(template){
      if(screenIndex !== null) template.screenIndex = screenIndex;
      decor = [...decor, template];
      rainTemplate = cloneSymbolData(template);
    }
    if(rainTemplate){
      delete rainTemplate.rainFieldState;
      if(screenIndex !== null) rainTemplate.screenIndex = screenIndex;
    }
    if(!state.voidDimensionActive){
      paletteOverride = weather === 'thunder'
        ? { skyTop: '#3b3f47', skyBottom: '#242830' }
        : { skyTop: '#d8dade', skyBottom: '#bdc1c8' };
    }
  }else{
    const filtered = decor.filter(prop=>!(prop && prop.type === 'rainField'));
    if(filtered.length !== decor.length) decor = filtered;
  }
  world.decor = decor;
  state.worldTreeWeatherRainTemplate = rainTemplate || null;
  if(!state.voidDimensionActive){
    if(!overrides) paletteOverride = null;
    state.worldTreeWeatherPalette = paletteOverride || null;
    if(!state.worldTreeRespawnAtmosphere){
      state.paletteOverride = paletteOverride || null;
    }
  }else{
    state.worldTreeWeatherPalette = null;
  }
}

function buildWorldTreeWeatherOverrides(weather){
  if(weather === 'thunder'){
    return {
      density: 240,
      densityVariance: 60,
      speed: 900,
      speedVariance: 160,
      wind: -120,
      windVariance: 140,
      dropLength: 30,
      dropLengthVariance: 10,
      dropThickness: 1.5,
      dropThicknessVariance: 0.45,
      dropAlpha: 0.82,
      dropColor: 'rgba(214, 232, 255, 0.7)',
      splashRadius: 18,
      splashDuration: 0.28,
      splashThickness: 1.15,
      splashColor: 'rgba(214, 236, 255, 0.78)',
      flashColor: 'rgba(238, 242, 255, 0.9)',
      flashAlpha: 0.9,
      flashIntensity: 1,
      thunderIntervalMin: 6.5,
      thunderIntervalMax: 12.5,
      mistAlpha: 0.07,
      mistColor: 'rgba(70, 96, 138, 0.22)',
      viewMarginX: 140,
      viewMarginTop: 50,
      viewMarginBottom: 90
    };
  }
  if(weather === 'rain'){
    return {
      density: 190,
      densityVariance: 45,
      speed: 840,
      speedVariance: 140,
      wind: -40,
      windVariance: 110,
      dropLength: 26,
      dropLengthVariance: 8,
      dropThickness: 1.1,
      dropThicknessVariance: 0.35,
      dropAlpha: 0.78,
      dropColor: 'rgba(204, 222, 255, 0.62)',
      splashRadius: 14,
      splashDuration: 0.24,
      splashThickness: 0.9,
      splashColor: 'rgba(200, 218, 255, 0.7)',
      mistAlpha: 0.04,
      mistColor: 'rgba(90, 120, 160, 0.15)',
      viewMarginX: 120,
      viewMarginTop: 40,
      viewMarginBottom: 80
    };
  }
  return null;
}

const WORLD_TREE_RESPAWN_DECOR_IDS = ['worldTreeRespawnStarsBack', 'worldTreeRespawnStarsFront', 'worldTreeRespawnFireflies'];

function buildWorldTreeRespawnDecorTemplate(world, state, compiled){
  if(!world || !state || !compiled) return null;
  const meta = state.layoutMeta || {};
  const tileSize = Number.isFinite(compiled.tileSize)
    ? compiled.tileSize
    : (Number.isFinite(meta.tileSize) ? meta.tileSize : DEFAULT_LAYOUT_TILE_SIZE || 30);
  const cols = Number.isFinite(compiled.cols)
    ? compiled.cols
    : (Number.isFinite(meta.cols) ? meta.cols : 0);
  const rows = Number.isFinite(compiled.rows)
    ? compiled.rows
    : (Number.isFinite(meta.rows) ? meta.rows : 0);
  const stageWidth = cols > 0 && tileSize > 0 ? cols * tileSize : (world.width || 0);
  const stageHeight = rows > 0 && tileSize > 0 ? rows * tileSize : (world.height || 0);
  const offsetX = Number.isFinite(compiled.offsetX)
    ? compiled.offsetX
    : (Number.isFinite(meta.offsetX) ? meta.offsetX : 0);
  const centerX = stageWidth > 0
    ? offsetX + stageWidth * 0.5
    : ((world.width || 0) * 0.5);
  const floorY = Number.isFinite(meta.floorY)
    ? meta.floorY
    : (Number.isFinite(world.groundY)
      ? world.groundY
      : (Number.isFinite(world.height) ? world.height - 100 : 0));
  const baseWidth = Math.max(stageWidth + 320, (world.width || stageWidth) + 240);
  const baseHeight = Math.max(stageHeight + 240, (world.height || stageHeight) + 160);
  const marginX = Math.max(80, Math.min(240, Math.round(baseWidth * 0.12)));
  const marginTop = 160;
  const marginBottom = 200;
  const backField = {
    type: 'starField',
    id: 'worldTreeRespawnStarsBack',
    x: centerX,
    baseY: floorY,
    width: baseWidth,
    height: baseHeight,
    starCount: 260,
    color: '#9fb8ff',
    colors: ['#4e6aa8', '#9fb8ff', '#d7e4ff'],
    twinkleAmount: 0.34,
    twinkleSpeed: 0.5,
    baseAlpha: 0.92,
    viewMarginX: marginX,
    viewMarginTop: marginTop,
    viewMarginBottom: marginBottom,
    followCamera: true,
    parallax: 1.04,
    parallaxY: 1.02,
    seed: 7011,
    layer: 'background'
  };
  backField.starFieldBaseWidth = baseWidth;
  backField.starFieldBaseHeight = baseHeight;
  backField.stars = buildStarFieldStars(backField.starCount, baseWidth, baseHeight, backField.color, backField.colors, backField.seed || 0);
  const frontField = {
    type: 'starField',
    id: 'worldTreeRespawnStarsFront',
    x: centerX,
    baseY: floorY,
    width: baseWidth,
    height: baseHeight,
    starCount: 160,
    color: '#dce7ff',
    colors: ['#91a8e6', '#dce7ff'],
    twinkleAmount: 0.46,
    twinkleSpeed: 0.82,
    baseAlpha: 0.78,
    viewMarginX: marginX,
    viewMarginTop: marginTop,
    viewMarginBottom: marginBottom,
    followCamera: true,
    parallax: 1.08,
    parallaxY: 1.04,
    seed: 9157,
    layer: 'foreground'
  };
  frontField.starFieldBaseWidth = baseWidth;
  frontField.starFieldBaseHeight = baseHeight;
  frontField.stars = buildStarFieldStars(frontField.starCount, baseWidth, baseHeight, frontField.color, frontField.colors, frontField.seed || 0);
  const fireflySwarm = null;
  const palette = {
    skyTop: '#061225',
    skyBottom: '#020713',
    ground: '#122033',
    turf: '#1a2b3f',
    doorClosed: '#1f2c3e',
    doorOpen: '#94b8ff',
    accent: '#9fb7ff'
  };
  const darkness = {
    opacity: 0.78,
    color: 'rgba(4, 8, 18, 0.86)',
    playerLightRadius: 320,
    playerGlowRadius: 440,
    playerGlowIntensity: 1.28,
    playerLightSoftness: 0.5,
    playerLightIntensity: 1.04,
    playerGlowColor: 'rgba(160, 188, 255, 0.75)'
  };
  return { backField, frontField, fireflySwarm, palette, darkness };
}

function applyWorldTreeRespawnAtmosphere(world, state, compiled){
  if(!world || !state || !compiled) return;
  if(!state.def || state.def.id !== 'worldTree') return;
  const reservedIds = new Set(WORLD_TREE_RESPAWN_DECOR_IDS);
  const baseDecor = Array.isArray(world.decor)
    ? world.decor.filter(prop => !(prop && reservedIds.has(prop.id)))
    : [];
  const shouldApply = !!(state.worldTreeRespawnAtmosphere && !state.voidDimensionActive);
  if(!shouldApply){
    world.decor = baseDecor;
    state.worldTreeRespawnDecorTemplate = null;
    if(!state.voidDimensionActive){
      state.paletteOverride = state.worldTreeWeatherPalette || null;
    }else{
      state.paletteOverride = null;
    }
    return;
  }
  const template = buildWorldTreeRespawnDecorTemplate(world, state, compiled);
  if(!template){
    world.decor = baseDecor;
    return;
  }
  const backField = cloneSymbolData(template.backField);
  const frontField = cloneSymbolData(template.frontField);
  const fireflySwarm = template.fireflySwarm ? cloneSymbolData(template.fireflySwarm) : null;
  const overlayDecor = fireflySwarm ? [backField, frontField, fireflySwarm] : [backField, frontField];
  world.decor = [...overlayDecor, ...baseDecor];
  state.paletteOverride = template.palette;
  state.darkness = cloneDarknessConfig(template.darkness);
  state.worldTreeRespawnDecorTemplate = {
    backField: cloneSymbolData(template.backField),
    frontField: cloneSymbolData(template.frontField)
  };
  if(template.fireflySwarm){
    state.worldTreeRespawnDecorTemplate.fireflySwarm = cloneSymbolData(template.fireflySwarm);
  }
}

function assignWorldTreeRespawnValue(target, key, value){
  if(!target) return;
  if(value === undefined){
    delete target[key];
    return;
  }
  target[key] = cloneSymbolData(value);
}

function syncWorldTreeRespawnStarField(target, template){
  if(!target || !template) return;
  const preserveState = target.starFieldState || null;
  const keys = [
    'type', 'id', 'x', 'baseY', 'width', 'height', 'starCount', 'color', 'colors',
    'twinkleAmount', 'twinkleSpeed', 'baseAlpha', 'viewMarginX', 'viewMarginTop',
    'viewMarginBottom', 'followCamera', 'parallax', 'parallaxY', 'seed', 'layer',
    'starFieldBaseWidth', 'starFieldBaseHeight'
  ];
  for(const key of keys){
    assignWorldTreeRespawnValue(target, key, template[key]);
  }
  if(!Array.isArray(target.stars) || target.stars.length !== (Array.isArray(template.stars) ? template.stars.length : 0)){
    target.stars = Array.isArray(template.stars)
      ? template.stars.map(star => cloneSymbolData(star))
      : [];
  }
  if(preserveState){
    target.starFieldState = preserveState;
    preserveState.bounds = null;
  }
}

function syncWorldTreeRespawnFireflySwarm(target, template){
  if(!target || !template) return;
  const preserveState = target.fireflyState || null;
  const keys = [
    'type', 'id', 'x', 'baseY', 'originOffsetX', 'originOffsetY', 'fireflyCount',
    'fireflyFlightRadius', 'fireflySpawnRadius', 'fireflyLightRadius', 'fireflySpeed',
    'fireflyPullStrength', 'fireflyLifetimeMin', 'fireflyLifetimeMax', 'fireflyLightColor',
    'fireflyGlowColor', 'fireflyRespawnDelay', 'fireflyFlickerSpeedMin',
    'fireflyFlickerSpeedMax', 'radius', 'layer', 'permanentFireflies',
    'suppressJarShardSpawn'
  ];
  for(const key of keys){
    assignWorldTreeRespawnValue(target, key, template[key]);
  }
  target.permanentFireflies = true;
  if(preserveState){
    target.fireflyState = preserveState;
    preserveState.permanent = true;
    if(template.fireflyCount !== undefined){
      preserveState.targetCount = Math.max(4, Math.round(template.fireflyCount));
    }
  }
}

function syncWorldTreeRespawnDecorEntry(target, template){
  if(!target || !template) return;
  if(template.type === 'starField'){
    syncWorldTreeRespawnStarField(target, template);
  }else if(template.type === 'ambientFireflies' || template.type === 'fireflyJarSwarm'){
    syncWorldTreeRespawnFireflySwarm(target, template);
  }
}

function maintainWorldTreeRespawnDecor(world){
  if(!world || !world.levelState) return;
  const state = world.levelState;
  if(!state.worldTreeRespawnAtmosphere || state.voidDimensionActive) return;
  const template = state.worldTreeRespawnDecorTemplate;
  if(!template) return;
  const decorList = Array.isArray(world.decor) ? world.decor : [];
  const reservedIds = new Set(WORLD_TREE_RESPAWN_DECOR_IDS);
  const idMap = new Map();
  for(const prop of decorList){
    if(!prop || !prop.id) continue;
    if(!reservedIds.has(prop.id)) continue;
    idMap.set(prop.id, prop);
  }
  const additions = [];
  const ensureEntry = (id, entryTemplate)=>{
    if(!entryTemplate) return;
    const existing = idMap.get(id);
    if(existing){
      syncWorldTreeRespawnDecorEntry(existing, entryTemplate);
      return;
    }
    additions.push(cloneSymbolData(entryTemplate));
  };
  ensureEntry('worldTreeRespawnStarsBack', template.backField);
  ensureEntry('worldTreeRespawnStarsFront', template.frontField);
  ensureEntry('worldTreeRespawnFireflies', template.fireflySwarm);
  if(additions.length){
    world.decor = [...decorList, ...additions];
  }
}

function assignWorldTreeRainValue(target, key, value){
  if(!target) return;
  if(value === undefined || value === null){
    delete target[key];
    return;
  }
  target[key] = cloneSymbolData(value);
}

function syncWorldTreeWeatherRainField(target, template){
  if(!target || !template) return;
  const preserveState = target.rainFieldState || null;
  const keys = new Set([
    ...Object.keys(template),
    ...Object.keys(target)
  ]);
  keys.delete('rainFieldState');
  for(const key of keys){
    if(key === 'screenIndex'){
      if(template.screenIndex === undefined){
        delete target.screenIndex;
      }else{
        target.screenIndex = template.screenIndex;
      }
      continue;
    }
    assignWorldTreeRainValue(target, key, template[key]);
  }
  if(preserveState){
    target.rainFieldState = preserveState;
  }
}

function maintainWorldTreeWeatherDecor(world){
  if(!world || !world.levelState) return;
  const state = world.levelState;
  if(!state.def || state.def.id !== 'worldTree') return;
  const weather = state.worldTreeWeather;
  if(weather !== 'rain' && weather !== 'thunder'){
    if(state.worldTreeWeatherRainTemplate){
      const decorList = Array.isArray(world.decor) ? world.decor : [];
      const filtered = decorList.filter(prop=>!(prop && prop.type === 'rainField'));
      if(filtered.length !== decorList.length) world.decor = filtered;
    }
    state.worldTreeWeatherRainTemplate = null;
    return;
  }
  const decorList = Array.isArray(world.decor) ? world.decor : [];
  const screenIndex = Number.isInteger(state.screenIndex) ? state.screenIndex : null;
  let template = state.worldTreeWeatherRainTemplate ? cloneSymbolData(state.worldTreeWeatherRainTemplate) : null;
  if(!template){
    const meta = state.layoutMeta || {};
    const compiledMeta = {
      tileSize: meta.tileSize,
      baseTileSize: meta.baseTileSize,
      tileScale: meta.tileScale,
      offsetX: meta.offsetX,
      rows: meta.rows,
      cols: meta.cols,
      screenIndex: meta.screenIndex
    };
    const overrides = buildWorldTreeWeatherOverrides(weather);
    template = overrides ? createRainFieldForStage(world, state, compiledMeta, overrides) : null;
    if(template && Number.isInteger(compiledMeta.screenIndex)){
      template.screenIndex = compiledMeta.screenIndex;
    }
    if(template){
      delete template.rainFieldState;
      state.worldTreeWeatherRainTemplate = cloneSymbolData(template);
    }
  }
  if(!template) return;
  delete template.rainFieldState;
  if(screenIndex !== null) template.screenIndex = screenIndex;
  let rainField = null;
  for(const prop of decorList){
    if(!prop || prop.type !== 'rainField') continue;
    if(screenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== screenIndex) continue;
    rainField = prop;
    break;
  }
  if(rainField){
    syncWorldTreeWeatherRainField(rainField, template);
  }else{
    const entry = cloneSymbolData(template);
    if(entry){
      if(screenIndex !== null) entry.screenIndex = screenIndex;
      world.decor = [...decorList, entry];
    }
  }
}

function ensureMonochromeWorldTreeStorm(world, state, compiled){
  if(!world || !state || !compiled) return;
  if(!state.def || state.def.id !== 'worldTreeReliquary') return;
  if(!Array.isArray(world.decor)) return;
  let hasRainField = false;
  const thunderDefaults = {
    flashColor: 'rgba(238, 242, 255, 0.9)',
    flashAlpha: 0.95,
    flashIntensity: 1,
    thunderIntervalMin: 6.5,
    thunderIntervalMax: 12.5,
    dropAlpha: 0.82,
    mistAlpha: 0.08,
    mistColor: 'rgba(16, 16, 26, 0.45)'
  };
  for(const prop of world.decor){
    if(!prop || prop.type !== 'rainField') continue;
    hasRainField = true;
    if(prop.density === undefined) prop.density = 260;
    if(prop.speed === undefined) prop.speed = 900;
    if(prop.wind === undefined) prop.wind = -140;
    if(prop.dropLength === undefined) prop.dropLength = 32;
    if(prop.dropThickness === undefined) prop.dropThickness = 1.8;
    if(prop.splashRadius === undefined) prop.splashRadius = 18;
    if(prop.splashDuration === undefined) prop.splashDuration = 0.28;
    if(prop.dropAlpha === undefined) prop.dropAlpha = thunderDefaults.dropAlpha;
    if(prop.flashColor === undefined) prop.flashColor = thunderDefaults.flashColor;
    if(prop.flashAlpha === undefined) prop.flashAlpha = thunderDefaults.flashAlpha;
    if(prop.flashIntensity === undefined) prop.flashIntensity = thunderDefaults.flashIntensity;
    if(prop.thunderIntervalMin === undefined) prop.thunderIntervalMin = thunderDefaults.thunderIntervalMin;
    if(prop.thunderIntervalMax === undefined) prop.thunderIntervalMax = thunderDefaults.thunderIntervalMax;
    if(prop.mistAlpha === undefined) prop.mistAlpha = thunderDefaults.mistAlpha;
    if(!prop.mistColor) prop.mistColor = thunderDefaults.mistColor;
  }
  if(!hasRainField){
    const rainField = createRainFieldForStage(world, state, compiled, {
      density: 260,
      speed: 900,
      wind: -140,
      dropLength: 32,
      dropThickness: 1.8,
      dropAlpha: 0.82,
      dropColor: 'rgba(224, 228, 240, 0.68)',
      splashRadius: 18,
      splashDuration: 0.28,
      splashThickness: 1.1,
      splashColor: 'rgba(230, 234, 245, 0.72)',
      flashColor: thunderDefaults.flashColor,
      flashAlpha: thunderDefaults.flashAlpha,
      flashIntensity: thunderDefaults.flashIntensity,
      thunderIntervalMin: thunderDefaults.thunderIntervalMin,
      thunderIntervalMax: thunderDefaults.thunderIntervalMax,
      mistAlpha: thunderDefaults.mistAlpha,
      mistColor: thunderDefaults.mistColor,
      viewMarginX: 140,
      viewMarginTop: 50,
      viewMarginBottom: 90
    });
    if(rainField){
      world.decor = [...world.decor, rainField];
    }
  }
}

function configureLevelScenery(world){
  if(!world) return;
  const state = world.levelState;
  if(!state || !state.def){
    world.terrain = [];
    world.decor = [];
    world.platforms = [];
    world.hazards = [];
    world.chronospheres = [];
    world.breakables = [];
    if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
    world.terrainCells = null;
    world.blockCollisionEnabled = false;
    world.particles = [];
    world.sand = null;
    world.ceilingY = null;
    if(world.dev) syncDeveloperStateFromWorld(world);
    return;
  }
  const def = state.def;
  const screen = def.screens[state.screenIndex] || null;
  const screenChanged = state.lastScreenConfigured !== state.screenIndex;
  const dimensionChanged = state.lastVoidDimensionActive !== state.voidDimensionActive;
  const usingVoidRoom = !!(state.voidDimensionActive && def.voidSymbolRoom);
  const stageEnemyNumbers = def.enemyNumbers || null;
  const screenEnemyNumbers = screen?.enemyNumbers || null;
  const voidEnemyNumbers = def.voidSymbolRoom?.enemyNumbers || null;

  if(screenChanged || dimensionChanged){
    if(usingVoidRoom && def.voidSymbolRoom?.layout){
      state.environmentLayout = parseLayoutDefinition(def.voidSymbolRoom.layout, [stageEnemyNumbers, voidEnemyNumbers]);
    }else if(screen?.layout){
      state.environmentLayout = parseLayoutDefinition(screen.layout, [stageEnemyNumbers, screenEnemyNumbers]);
    }else if(def.layout){
      state.environmentLayout = parseLayoutDefinition(def.layout, stageEnemyNumbers);
    }else{
      state.environmentLayout = null;
    }
  }else if(!state.environmentLayout){
    if(usingVoidRoom && def.voidSymbolRoom?.layout){
      state.environmentLayout = parseLayoutDefinition(def.voidSymbolRoom.layout, [stageEnemyNumbers, voidEnemyNumbers]);
    }else if(screen?.layout){
      state.environmentLayout = parseLayoutDefinition(screen.layout, [stageEnemyNumbers, screenEnemyNumbers]);
    }else if(def.layout){
      state.environmentLayout = parseLayoutDefinition(def.layout, stageEnemyNumbers);
    }
  }

  const activeLayout = state.environmentLayout || null;
  const layoutSymbolEnemies = cloneEnemyPlacements(layoutEntriesToArray(activeLayout?.enemyPlacements));

  if(screenChanged || dimensionChanged){
    const screenEnemies = cloneEnemyPlacements(layoutEntriesToArray(screen?.enemyPlacements));
    state.enemyPlacements = [...layoutSymbolEnemies, ...screenEnemies];
  }else if(layoutSymbolEnemies.length){
    const manualEnemies = (state.enemyPlacements || []).filter(enemy=>!enemy.fromSymbol);
    state.enemyPlacements = [...layoutSymbolEnemies, ...manualEnemies];
  }else if(state.enemyPlacements){
    state.enemyPlacements = (state.enemyPlacements || []).filter(enemy=>!enemy.fromSymbol);
  }else{
    state.enemyPlacements = [];
  }

  const placements = state.enemyPlacements || [];
  const compiled = applyLayoutToWorld(world, activeLayout, placements, state.screenIndex);
  world.terrain = compiled.terrain;
  world.decor = Array.isArray(compiled.decor) ? compiled.decor.slice() : [];
  state.layoutMeta = {
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
  const layoutGroundY = Number.isFinite(world?.groundY)
    ? world.groundY
    : (Number.isFinite(world?.height) ? world.height - 100 : null);
  const layoutTileSize = Number.isFinite(compiled.tileSize) ? compiled.tileSize : null;
  const layoutRows = Number.isFinite(compiled.rows) ? compiled.rows : null;
  let layoutCeilingY = null;
  if(Number.isFinite(layoutGroundY) && Number.isFinite(layoutTileSize) && Number.isFinite(layoutRows) && layoutRows > 0 && layoutTileSize > 0){
    layoutCeilingY = layoutGroundY - layoutRows * layoutTileSize;
  }else if(Number.isFinite(layoutGroundY) && Number.isFinite(world?.height) && world.height > 0){
    layoutCeilingY = layoutGroundY - world.height;
  }
  state.layoutMeta.floorY = Number.isFinite(layoutGroundY) ? layoutGroundY : null;
  state.layoutMeta.ceilingY = Number.isFinite(layoutCeilingY) ? layoutCeilingY : null;
  world.ceilingY = Number.isFinite(state.layoutMeta.ceilingY) ? state.layoutMeta.ceilingY : null;
  state.entryDoor = compiled.entryDoor;
  state.exitDoor = compiled.exitDoor;
  state.cameraZones = compiled.cameraZones || [];
  state.layoutWeapons = (compiled.weapons || []).filter(Boolean);
  state.interactives = compiled.interactives || [];
  state.npcPlacements = compiled.npcs || [];
  const maxTeamSlots = Number.isFinite(TEAM_SIZE) && TEAM_SIZE > 0 ? TEAM_SIZE : 3;
  const unlockedSlots = typeof getUnlockedTeamSlots === 'function'
    ? clamp(Math.round(getUnlockedTeamSlots(world)), 1, maxTeamSlots)
    : maxTeamSlots;
  if(state.interactives.length){
    state.interactives = state.interactives.filter(entry=>{
      if(!entry) return false;
      if(entry.type === 'restingStick'){
        const required = clamp(Math.round(entry.unlockSlot ?? maxTeamSlots), 1, maxTeamSlots);
        return unlockedSlots < required;
      }
      return true;
    });
  }
  if(Array.isArray(world.decor) && world.decor.length){
    world.decor = world.decor.filter(prop=>{
      if(!prop) return false;
      if(prop.type === 'restingStick'){
        const required = clamp(Math.round(prop.unlockSlot ?? maxTeamSlots), 1, maxTeamSlots);
        return unlockedSlots < required;
      }
      return true;
    });
  }

  let openedChests = state.openedChestIds;
  if(!(openedChests instanceof Set)){
    const seeds = Array.isArray(openedChests) ? openedChests : [];
    openedChests = new Set(seeds.map(id=>String(id)));
  }
  state.openedChestIds = openedChests;
  const persistentOpened = new Set((world.profile?.openedChests || []).map(id=>String(id)));
  const persistentDrained = new Set((world.profile?.drainedChests || []).map(id=>String(id)));
  let claimedPedestals = state.claimedPedestalIds;
  if(!(claimedPedestals instanceof Set)){
    const seeds = Array.isArray(claimedPedestals) ? claimedPedestals : [];
    claimedPedestals = new Set(seeds.map(id=>String(id)));
  }
  state.claimedPedestalIds = claimedPedestals;
  const persistentClaimedPedestals = new Set((world.profile?.claimedPedestals || []).map(id=>String(id)));
  if(state.interactives.length && (openedChests.size || persistentOpened.size || persistentDrained.size || claimedPedestals.size || persistentClaimedPedestals.size)){
    for(const entry of state.interactives){
      if(!entry) continue;
      if(entry.type === 'treasureChest'){
        const chestId = entry.id ? String(entry.id) : null;
        if(!chestId) continue;
        if(entry.chestState) entry.chestState.opened = !!entry.chestState.opened;
        if(openedChests.has(chestId)){
          if(entry.chestState){
            entry.chestState.opened = true;
            entry.chestState.goldPresent = false;
            if(entry.chestState.openTime === undefined) entry.chestState.openTime = 0;
          }
          entry.opened = true;
          entry.disabled = true;
          continue;
        }
        if(persistentDrained.has(chestId)){
          if(entry.chestState){
            entry.chestState.opened = true;
            entry.chestState.goldPresent = false;
            if(entry.chestState.openTime === undefined) entry.chestState.openTime = 0;
          }
          entry.opened = true;
          entry.disabled = true;
          openedChests.add(chestId);
          continue;
        }
        if(persistentOpened.has(chestId)){
          if(entry.chestState){
            entry.chestState.opened = true;
            entry.chestState.goldPresent = true;
            if(entry.chestState.openTime === undefined) entry.chestState.openTime = 0;
          }
          entry.opened = true;
          entry.disabled = false;
        }
        continue;
      }
      if(entry.type === 'swordPedestal'){
        const pedestalId = entry.id ? String(entry.id) : null;
        if(!entry.swordState) entry.swordState = {};
        if(!pedestalId) continue;
        if(claimedPedestals.has(pedestalId) || persistentClaimedPedestals.has(pedestalId)){
          entry.swordState.claimed = true;
          if(entry.swordState.openTime === undefined) entry.swordState.openTime = 0;
          entry.opened = true;
          entry.disabled = true;
          claimedPedestals.add(pedestalId);
        }
        continue;
      }
      if(entry.type === 'skillPedestal' && entry.abilityId){
        if(!entry.shrineState) entry.shrineState = {};
        const ability = typeof abilityDefinitionById === 'function'
          ? abilityDefinitionById(entry.abilityId)
          : null;
        if(!ability){
          entry.shrineState.activated = true;
          entry.disabled = true;
          continue;
        }
        if(typeof isAbilityUnlocked === 'function' && isAbilityUnlocked(world, entry.abilityId)){
          entry.shrineState.activated = true;
          entry.disabled = true;
        }
      }
    }
  }
  applyWorldTreeWeather(world, state, compiled);
  applyWorldTreeRespawnAtmosphere(world, state, compiled);
  ensureMonochromeWorldTreeStorm(world, state, compiled);
  world.platforms = compiled.platforms || [];
  world.hazards = compiled.hazards || [];
  world.chronospheres = world.hazards.filter(hazard=>hazard && hazard.type === 'chronosphere');
  world.breakables = compiled.breakables || [];
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  world.toggleBlocks = compiled.toggleBlocks || [];
  world.physicsBoxes = (compiled.physicsBoxes || []).map(box=>({
    ...box,
    vx: 0,
    vy: 0,
    grounded: false
  }));
  world.softBodies = [];
  if(Array.isArray(compiled.softBodies)){
    for(const def of compiled.softBodies){
      const body = spawnSoftBody(world, def);
      if(body) world.softBodies.push(body);
    }
  }
  const blockCollisionSources = [
    screen?.blockCollision,
    screen?.enableBlockCollision,
    activeLayout?.blockCollision,
    compiled.blockCollision,
    def.blockCollision,
    def.enableBlockCollision
  ];
  let blockCollisionResolved = false;
  let blockCollisionSetting = false;
  for(const value of blockCollisionSources){
    if(value === undefined || value === null) continue;
    blockCollisionSetting = value;
    blockCollisionResolved = true;
    break;
  }
  world.blockCollisionEnabled = blockCollisionResolved ? !!blockCollisionSetting : true;
  world.particles = [];
  world.sand = null;
  world.grass = null;
  world.water = null;
  world.waterEmitters = [];
  world.lava = null;
  world.lavaEmitters = [];
  if(activeLayout && compiled.cells){
    world.terrainCells = {
      tileSize: compiled.tileSize,
      offsetX: compiled.offsetX,
      rows: compiled.rows,
      cols: compiled.cols,
      cells: compiled.cells,
      background: compiled.backgroundCells,
      styles: compiled.terrainStyles,
      screenIndex: compiled.screenIndex
    };
    if(Array.isArray(compiled.cells) && state.environmentLayout){
      state.environmentLayout.cells = compiled.cells.map(row=>row.slice());
      state.environmentLayout.screenIndex = compiled.screenIndex;
      if(Array.isArray(compiled.backgroundCells)){
        state.environmentLayout.backgroundCells = compiled.backgroundCells.map(row=>row.slice());
      }else{
        state.environmentLayout.backgroundCells = Array.isArray(state.environmentLayout.backgroundCells)
          ? state.environmentLayout.backgroundCells.map(row=>row.slice())
          : [];
      }
      if(Array.isArray(compiled.terrainStyles)){
        state.environmentLayout.terrainStyles = compiled.terrainStyles.map(row=>row.map(style=>normalizeTerrainStyleId(style)));
      }else{
        state.environmentLayout.terrainStyles = Array.isArray(state.environmentLayout.terrainStyles)
          ? state.environmentLayout.terrainStyles.map(row=>row.map(style=>normalizeTerrainStyleId(style)))
          : [];
      }
    }
  }else{
    world.terrainCells = null;
  }
  const sandScene = screen?.sandScene || def.sandScene || null;
  const sandConfig = cloneSandScene(sandScene) || (compiled.sandRects && compiled.sandRects.length ? { manualOnly: true } : null);
  configureWorldSand(world, {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    cols: compiled.cols,
    rows: compiled.rows,
    offsetX: compiled.offsetX
  }, sandConfig);
  state.sandScene = sandConfig;
  const powderScene = screen?.powderScene || def.powderScene || null;
  const powderConfig = clonePowderScene(powderScene);
  configureWorldPowder(world, {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    cols: compiled.cols,
    rows: compiled.rows,
    offsetX: compiled.offsetX
  }, powderConfig);
  state.powderScene = powderConfig;
  const grassScene = screen?.grassScene || def.grassScene || null;
  const grassConfig = cloneGrassScene(grassScene);
  configureWorldGrass(world, {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    cols: compiled.cols,
    rows: compiled.rows,
    offsetX: compiled.offsetX
  }, grassConfig);
  state.grassScene = grassConfig;
  const waterScene = screen?.waterScene || def.waterScene || null;
  const waterConfig = cloneWaterScene(waterScene) || (compiled.waterRects && compiled.waterRects.length ? {} : null);
  configureWorldWater(world, {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    cols: compiled.cols,
    rows: compiled.rows,
    offsetX: compiled.offsetX
  }, waterConfig);
  state.waterScene = waterConfig;
  const lavaScene = screen?.lavaScene || def.lavaScene || null;
  const lavaConfig = cloneLavaScene(lavaScene) || (compiled.lavaRects && compiled.lavaRects.length ? {} : null);
  configureWorldLava(world, {
    tileSize: compiled.tileSize,
    baseTileSize: compiled.baseTileSize,
    tileScale: compiled.tileScale,
    cols: compiled.cols,
    rows: compiled.rows,
    offsetX: compiled.offsetX
  }, lavaConfig);
  state.lavaScene = lavaConfig;
  const darknessSource = usingVoidRoom && def.voidSymbolRoom && Object.prototype.hasOwnProperty.call(def.voidSymbolRoom, 'darkness')
    ? def.voidSymbolRoom.darkness
    : (screen && Object.prototype.hasOwnProperty.call(screen, 'darkness')
      ? screen.darkness
      : def.darkness);
  const respawnNightActive = !!(state.worldTreeRespawnAtmosphere && !state.voidDimensionActive);
  if(!respawnNightActive){
    state.darkness = cloneDarknessConfig(darknessSource);
  }
  applyLayoutFluidTiles(world, compiled);
  configureWorldGrasshoppers(world, state);
  state.enemySpawnPoints = compiled.enemySpawns;
  state.toggleBlocks = world.toggleBlocks;
  initializeToggleSystems(state.interactives, world.toggleBlocks);
  refreshLayoutWeapons(world);
  if(def.spawner){
    state.spawnerPoints = buildSpawnerPoints(def.spawner, state.layoutMeta, world);
  }else{
    state.spawnerPoints = [];
  }
  state.lastVoidDimensionActive = state.voidDimensionActive;
  state.lastScreenConfigured = state.screenIndex;
  if(world.dev) syncDeveloperStateFromWorld(world, state.layoutMeta);
}

function initializeToggleSystems(interactives, toggleBlocks){
  const blocks = Array.isArray(toggleBlocks) ? toggleBlocks : [];
  for(const block of blocks){
    if(!block) continue;
    block.activeWhenOn = block.activeWhenOn !== undefined ? !!block.activeWhenOn : true;
    block.activeWhenOff = block.activeWhenOff !== undefined ? !!block.activeWhenOff : false;
    block.defaultActive = block.defaultActive !== undefined ? !!block.defaultActive : !!block.active;
    block.active = block.active !== undefined ? !!block.active : block.defaultActive;
    block.visibility = block.active ? 1 : 0;
  }
  const entries = Array.isArray(interactives) ? interactives : [];
  for(const entry of entries){
    if(!entry || entry.type !== 'lever') continue;
    if(!entry.leverState) entry.leverState = { active: true, lastToggle: 0 };
    if(entry.startState !== undefined){
      entry.leverState.active = !!entry.startState;
    }
    entry.leverState.lastToggle = 0;
    entry.targets = normalizeToggleIdList(entry.targets);
    entry.groups = normalizeToggleIdList(entry.groups);
    applyLeverStateToBlocksInit(entry, blocks);
  }
}

function applyLeverStateToBlocksInit(lever, blocks){
  if(!lever || !Array.isArray(blocks) || blocks.length === 0) return;
  const targetIds = new Set(normalizeToggleIdList(lever.targets));
  const targetGroups = new Set(normalizeToggleIdList(lever.groups));
  if(targetIds.size === 0 && targetGroups.size === 0) return;
  const leverOn = lever.leverState ? !!lever.leverState.active : true;
  for(const block of blocks){
    if(!block) continue;
    const matchesId = block.id && targetIds.has(String(block.id));
    const matchesGroup = block.group && targetGroups.has(String(block.group));
    if(!matchesId && !matchesGroup) continue;
    const activeWhenOn = block.activeWhenOn !== undefined ? !!block.activeWhenOn : true;
    const activeWhenOff = block.activeWhenOff !== undefined ? !!block.activeWhenOff : false;
    block.active = leverOn ? activeWhenOn : activeWhenOff;
    block.visibility = block.active ? 1 : 0;
  }
}

function parseLayoutDefinition(def, enemyNumberSources){
  if(!def) return null;
  const fallbackScale = LAYOUT_TILE_SCALE || 1;
  const explicitTileSize = Number(def.tileSize);
  const explicitBaseSize = Number(def.baseTileSize);
  const baseTileSize = Number.isFinite(explicitBaseSize)
    ? explicitBaseSize
    : (Number.isFinite(explicitTileSize) ? explicitTileSize : BASE_LAYOUT_TILE_SIZE);
  let tileSize;
  if(Number.isFinite(explicitTileSize)){
    if(explicitTileSize <= TARGET_LAYOUT_TILE_SIZE){
      tileSize = Math.max(4, Math.round(explicitTileSize));
    }else{
      const overrideScale = Number(def.tileScale);
      const scale = Number.isFinite(overrideScale) ? overrideScale : fallbackScale;
      tileSize = Math.max(4, Math.round(explicitTileSize * scale));
    }
  }else{
    const overrideScale = Number(def.tileScale);
    const scale = Number.isFinite(overrideScale) ? overrideScale : fallbackScale;
    tileSize = Math.max(4, Math.round(baseTileSize * scale));
  }
  const tileScale = baseTileSize > 0 ? tileSize / baseTileSize : 1;
  const baseRows = def.tiles || def.data || [];
  const rows = def.rows || baseRows.length;
  const cols = def.cols || (baseRows[0]?.length || 0);
  const inheritedSources = [];
  if(Array.isArray(enemyNumberSources)){
    for(const source of enemyNumberSources){
      const legend = buildEnemyNumberLegend(source);
      if(legend) inheritedSources.push(legend);
    }
  }else{
    const legend = buildEnemyNumberLegend(enemyNumberSources);
    if(legend) inheritedSources.push(legend);
  }
  const layoutEnemyNumbers = buildEnemyNumberLegend(def.enemyNumbers);
  if(layoutEnemyNumbers) inheritedSources.push(layoutEnemyNumbers);

  let enemyNumberLegend = null;
  if(inheritedSources.length){
    enemyNumberLegend = {};
    for(const legend of inheritedSources){
      for(const key in legend){
        const value = legend[key];
        if(value === null){
          delete enemyNumberLegend[key];
        }else{
          enemyNumberLegend[key] = cloneSymbolData(value);
        }
      }
    }
    if(!Object.keys(enemyNumberLegend).length) enemyNumberLegend = null;
  }

  let mergedSymbolLegend = def.symbolLegend || null;
  if(enemyNumberLegend){
    mergedSymbolLegend = mergedSymbolLegend
      ? { ...enemyNumberLegend, ...mergedSymbolLegend }
      : enemyNumberLegend;
  }

  const legend = buildLayoutSymbolLegend(mergedSymbolLegend);
  const blockCollision = def.blockCollision ?? def.enableBlockCollision ?? null;
  const cells = [];
  const backgroundCells = [];
  const terrainStyles = [];
  const symbolObjects = [];
  const symbolEnemies = [];
  const symbolWeapons = [];
  const symbolWaterTiles = [];
  const symbolSandTiles = [];
  const symbolLavaTiles = [];
  let entryDoorFromSymbols = null;
  let exitDoorFromSymbols = null;
  const backgroundStrings = Array.isArray(def.backgroundTiles)
    ? def.backgroundTiles
    : (Array.isArray(def.background) ? def.background : null);
  const backgroundBoolean = Array.isArray(def.backgroundCells) ? def.backgroundCells : null;

  const rawStyleGrid = Array.isArray(def.terrainStyles)
    ? def.terrainStyles
    : (Array.isArray(def.cellStyles) ? def.cellStyles : null);

  for(let r=0; r<rows; r++){
    const rowStr = (baseRows[r] || '').padEnd(cols, '.');
    const row = [];
    const backgroundRow = [];
    const styleRow = [];
    const backgroundString = typeof backgroundStrings?.[r] === 'string'
      ? backgroundStrings[r].padEnd(cols, '.')
      : null;
    const backgroundBoolRow = Array.isArray(backgroundBoolean?.[r]) ? backgroundBoolean[r] : null;
    const rawStyleRow = Array.isArray(rawStyleGrid?.[r]) ? rawStyleGrid[r] : rawStyleGrid?.[r] || null;
    for(let c=0; c<cols; c++){
      const ch = rowStr[c] || '.';
      const symbolDef = legend[ch] || null;
      let solid = ch === '#' || ch === 'X';
      let background = backgroundBoolRow ? !!backgroundBoolRow[c] : (backgroundString ? (backgroundString[c] === '#' || backgroundString[c] === 'X') : false);
      let style = null;
      if(symbolDef){
        if(symbolDef.terrain !== undefined){
          solid = !!symbolDef.terrain;
        }
        if(symbolDef.background !== undefined){
          background = !!symbolDef.background;
        }
        if(symbolDef.terrainStyle !== undefined){
          style = normalizeTerrainStyleId(symbolDef.terrainStyle);
        }
        if(symbolDef.object){
          const obj = createLayoutSymbolObject(symbolDef.object, c, r);
          if(obj) symbolObjects.push(obj);
        }
        if(symbolDef.enemy){
          const enemy = createLayoutSymbolEnemy(symbolDef.enemy, c, r);
          if(enemy) symbolEnemies.push(enemy);
        }
        if(symbolDef.weapon){
          const weapon = createLayoutSymbolWeapon(symbolDef.weapon, c, r);
          if(weapon) symbolWeapons.push(weapon);
        }
        if(symbolDef.fluid){
          const fluid = symbolDef.fluid;
          const type = (fluid.type || '').toString().toLowerCase();
          const entry = { col: c, row: r };
          if(fluid.width !== undefined) entry.width = fluid.width;
          if(fluid.height !== undefined) entry.height = fluid.height;
          if(fluid.rows !== undefined) entry.rows = fluid.rows;
          if(fluid.cols !== undefined) entry.cols = fluid.cols;
          if(fluid.depth !== undefined) entry.depth = fluid.depth;
          if(type === 'sand') symbolSandTiles.push(entry);
          else if(type === 'lava') symbolLavaTiles.push(entry);
          else symbolWaterTiles.push(entry);
        }
        if(symbolDef.door === 'entry' && !entryDoorFromSymbols){
          const door = createLayoutSymbolDoor(symbolDef, c, r);
          if(door) entryDoorFromSymbols = door;
        }else if(symbolDef.door === 'exit' && !exitDoorFromSymbols){
          const door = createLayoutSymbolDoor(symbolDef, c, r);
          if(door) exitDoorFromSymbols = door;
        }
      }
      if(style === null && rawStyleRow){
        if(Array.isArray(rawStyleRow)){
          style = normalizeTerrainStyleId(rawStyleRow[c]);
        }else if(typeof rawStyleRow === 'string'){
          const styles = rawStyleRow.split(',');
          style = normalizeTerrainStyleId(styles[c]);
        }
      }
      row.push(solid);
      backgroundRow.push(background);
      styleRow.push(style);
    }
    cells.push(row);
    backgroundCells.push(backgroundRow);
    terrainStyles.push(styleRow);
  }
  const objects = [
    ...symbolObjects,
    ...layoutEntriesToArray(def.objects).map(obj=>{
      const clone = { ...obj };
      clone.type = clone.type || clone.id || 'crate';
      clone.col = clone.col ?? clone.x ?? 0;
      clone.row = clone.row ?? clone.y ?? (rows - 1);
      clone.offsetX = clone.offsetX || 0;
      clone.offsetY = clone.offsetY || 0;
      if(clone.x !== undefined) delete clone.x;
      if(clone.y !== undefined) delete clone.y;
      return clone;
    })
  ];
  const weapons = [
    ...symbolWeapons,
    ...layoutEntriesToArray(def.weapons).map(entry=>{
      const weapon = { ...entry };
      weapon.id = weapon.id || weapon.weapon || weapon.type || 'sword';
      weapon.col = weapon.col ?? weapon.x ?? 0;
      weapon.row = weapon.row ?? weapon.y ?? (rows - 1);
      weapon.offsetX = weapon.offsetX || 0;
      weapon.offsetY = weapon.offsetY || 0;
      if(weapon.x !== undefined) delete weapon.x;
      if(weapon.y !== undefined) delete weapon.y;
      return weapon;
    })
  ];
  const enemyPlacements = [
    ...symbolEnemies,
    ...layoutEntriesToArray(def.enemyPlacements || def.enemies).map(entry=>{
      const enemy = { ...entry };
      enemy.kind = enemy.kind || enemy.type || enemy.id || 'grunt';
      enemy.col = enemy.col ?? enemy.x ?? 0;
      enemy.row = enemy.row ?? enemy.y ?? (rows - 1);
      enemy.offsetX = enemy.offsetX || 0;
      enemy.offsetY = enemy.offsetY || 0;
      if(enemy.x !== undefined) delete enemy.x;
      if(enemy.y !== undefined) delete enemy.y;
      return enemy;
    })
  ];
  const cameraZones = layoutEntriesToArray(def.cameraZones).map(zone=>({
    id: zone.id || zone.name || null,
    type: zone.type || 'zone',
    col: zone.col ?? zone.x ?? 0,
    row: zone.row ?? zone.y ?? 0,
    width: zone.width ?? zone.cols ?? cols,
    height: zone.height ?? zone.rows ?? rows,
    focusOffsetX: zone.focusOffsetX || 0,
    focusOffsetY: zone.focusOffsetY || 0,
    enterPadding: zone.enterPadding ?? zone.padding ?? 0,
    exitPadding: zone.exitPadding ?? zone.hysteresis ?? zone.padding ?? 0
  }));
  const entryDoor = def.entryDoor ? {
    col: def.entryDoor.col ?? def.entryDoor.x ?? 0,
    row: def.entryDoor.row ?? def.entryDoor.y ?? (rows - 1),
    offsetX: def.entryDoor.offsetX || 0,
    offsetY: def.entryDoor.offsetY || 0
  } : entryDoorFromSymbols ? { ...entryDoorFromSymbols } : null;
  const exitDoor = def.exitDoor ? {
    col: def.exitDoor.col ?? def.exitDoor.x ?? (cols ? cols - 1 : 0),
    row: def.exitDoor.row ?? def.exitDoor.y ?? (rows - 1),
    offsetX: def.exitDoor.offsetX || 0,
    offsetY: def.exitDoor.offsetY || 0
  } : exitDoorFromSymbols ? { ...exitDoorFromSymbols } : null;
  return {
    tileSize,
    cols,
    rows,
    cells,
    objects,
    weapons,
    cameraZones,
    entryDoor,
    exitDoor,
    baseTileSize,
    tileScale,
    enemyPlacements,
    symbolLegend: legend,
    waterTiles: symbolWaterTiles,
    sandTiles: symbolSandTiles,
    lavaTiles: symbolLavaTiles,
    blockCollision,
    terrainStyles
  };
}

function cloneLayoutData(layout){
  if(!layout) return null;
  const cells = (layout.cells || []).map(row=>row.slice());
  const backgroundCells = (layout.backgroundCells || []).map(row=>row.slice());
  const objects = layoutEntriesToArray(layout.objects).map(obj=>({ ...obj }));
  const weapons = layoutEntriesToArray(layout.weapons).map(weapon=>({ ...weapon }));
  const cameraZones = layoutEntriesToArray(layout.cameraZones).map(zone=>({ ...zone }));
  const entryDoor = layout.entryDoor ? { ...layout.entryDoor } : null;
  const exitDoor = layout.exitDoor ? { ...layout.exitDoor } : null;
  const enemyPlacements = layoutEntriesToArray(layout.enemyPlacements).map(enemy=>({ ...enemy }));
  const symbolLegend = cloneSymbolLegend(layout.symbolLegend);
  const waterTiles = layoutEntriesToArray(layout.waterTiles).map(tile=>({ ...tile }));
  const sandTiles = layoutEntriesToArray(layout.sandTiles).map(tile=>({ ...tile }));
  const lavaTiles = layoutEntriesToArray(layout.lavaTiles).map(tile=>({ ...tile }));
  const terrainStyles = Array.isArray(layout.terrainStyles)
    ? layout.terrainStyles.map(row=>row.map(style=>normalizeTerrainStyleId(style)))
    : [];
  return {
    tileSize: layout.tileSize,
    baseTileSize: layout.baseTileSize,
    tileScale: layout.tileScale,
    cols: layout.cols,
    rows: layout.rows,
    cells,
    backgroundCells,
    objects,
    weapons,
    cameraZones,
    entryDoor,
    exitDoor,
    enemyPlacements,
    symbolLegend,
    waterTiles,
    sandTiles,
    lavaTiles,
    blockCollision: layout.blockCollision ?? null,
    terrainStyles
  };
}

function cloneSceneParticleEntry(entry){
  if(Array.isArray(entry)) return entry.map(item=>cloneSceneParticleEntry(item));
  if(entry && typeof entry === 'object') return { ...entry };
  return entry;
}

function cloneSandScene(scene){
  if(!scene) return null;
  const clone = { ...scene };
  if(Array.isArray(scene.hills)) clone.hills = scene.hills.map(hill=>({ ...hill }));
  if(Array.isArray(scene.particles)) clone.particles = scene.particles.map(particle=>cloneSceneParticleEntry(particle));
  return clone;
}

function clonePowderScene(scene){
  if(!scene) return null;
  const clone = { ...scene };
  if(Array.isArray(scene.particles)) clone.particles = scene.particles.map(particle=>cloneSceneParticleEntry(particle));
  return clone;
}

function cloneGrassScene(scene){
  if(!scene) return null;
  const clone = { ...scene };
  if(Array.isArray(scene.patches)) clone.patches = scene.patches.map(patch=>({ ...patch }));
  if(Array.isArray(scene.clearings)) clone.clearings = scene.clearings.map(entry=>({ ...entry }));
  if(Array.isArray(scene.surfaces)) clone.surfaces = scene.surfaces.map(surface=>({ ...surface }));
  if(scene.scatter) clone.scatter = { ...scene.scatter };
  return clone;
}

function cloneWaterScene(scene){
  if(!scene) return null;
  const clone = { ...scene };
  if(Array.isArray(scene.emitters)) clone.emitters = scene.emitters.map(emitter=>({ ...emitter }));
  if(Array.isArray(scene.particles)) clone.particles = scene.particles.map(particle=>cloneSceneParticleEntry(particle));
  return clone;
}

function cloneLavaScene(scene){
  if(!scene) return null;
  const clone = { ...scene };
  if(Array.isArray(scene.emitters)) clone.emitters = scene.emitters.map(emitter=>({ ...emitter }));
  if(Array.isArray(scene.particles)) clone.particles = scene.particles.map(particle=>cloneSceneParticleEntry(particle));
  return clone;
}

function isWorldOneLevelDef(def){
  if(!def || typeof def !== 'object') return false;
  const map = def.map || {};
  const branch = typeof map.branch === 'string' ? map.branch.toLowerCase() : '';
  if(branch === 'world1') return true;
  const parent = typeof map.parent === 'string' ? map.parent.toLowerCase() : '';
  if(parent.startsWith('world1')) return true;
  if(Array.isArray(map.requires)){
    for(const req of map.requires){
      if(typeof req === 'string' && req.toLowerCase().startsWith('world1')) return true;
    }
  }
  return false;
}

function configureWorldGrasshoppers(world, state){
  if(!world){
    return;
  }
  if(!isWorldOneLevelDef(state?.def)){
    world.grasshoppers = null;
    return;
  }
  const swarm = [];
  const width = Math.max(1, world.width || 0);
  const margin = Math.min(120, Math.max(32, width * 0.08));
  const leftBound = Math.max(12, Math.min(margin, width * 0.5));
  const rightBoundBase = Math.max(leftBound + 4, width - Math.max(12, margin));
  const rightBound = Math.max(rightBoundBase, leftBound + 4);
  const count = Math.max(6, Math.round(width / 220));
  const defaultGround = Number.isFinite(world.groundY)
    ? world.groundY
    : Math.max(0, (world.height || 0) - 100);
  for(let i=0; i<count; i++){
    const x = clamp(rand(leftBound, rightBound), 12, Math.max(12, width - 12));
    const ground = resolveGrasshopperSpawnGround(world, x, defaultGround);
    const hopper = {
      x,
      y: ground - 3,
      vx: 0,
      vy: 0,
      grounded: true,
      hopTimer: rand(0.4, 1.6),
      panicTimer: 0,
      halfSize: 1.5
    };
    swarm.push(hopper);
  }
  world.grasshoppers = swarm;
}

function resolveGrasshopperSpawnGround(world, x, fallback){
  if(typeof groundHeightAt === 'function'){
    const ground = groundHeightAt(world, x, { surface: 'top' });
    if(Number.isFinite(ground)) return ground;
  }
  return fallback;
}

function cloneDarknessConfig(config){
  if(config === undefined || config === null) return null;
  if(typeof config === 'number') return { opacity: config };
  if(typeof config !== 'object') return null;
  const clone = {};
  if(Object.prototype.hasOwnProperty.call(config, 'opacity')) clone.opacity = config.opacity;
  if(Object.prototype.hasOwnProperty.call(config, 'alpha')) clone.alpha = config.alpha;
  if(Object.prototype.hasOwnProperty.call(config, 'intensity')) clone.intensity = config.intensity;
  if(config.color) clone.color = config.color;
  if(config.lightColor) clone.lightColor = config.lightColor;
  if(config.glowColor) clone.glowColor = config.glowColor;
  const numericKeys = [
    'defaultLightRadius',
    'playerLightRadius',
    'lightWeaponRadius',
    'torchLightRadius',
    'fireLightRadius',
    'lightSoftness',
    'lightIntensity',
    'glowIntensity',
    'glowRadius',
    'playerLightSoftness',
    'playerLightIntensity',
    'playerGlowRadius',
    'playerGlowIntensity',
    'torchLightSoftness',
    'torchLightIntensity',
    'torchGlowRadius',
    'torchGlowIntensity',
    'fireLightIntensity',
    'fireGlowIntensity',
    'fireLightSoftness',
    'fireGlowRadius'
  ];
  for(const key of numericKeys){
    if(Object.prototype.hasOwnProperty.call(config, key)) clone[key] = config[key];
  }
  const colorKeys = [
    'playerLightColor',
    'playerGlowColor',
    'torchLightColor',
    'torchGlowColor',
    'fireLightColor',
    'fireGlowColor'
  ];
  for(const key of colorKeys){
    if(config[key]) clone[key] = config[key];
  }
  if(Array.isArray(config.lights)){
    clone.lights = config.lights.map(light => {
      if(!light || typeof light !== 'object') return null;
      return { ...light };
    }).filter(Boolean);
  }
  return Object.keys(clone).length ? clone : null;
}

function cloneEnemyPlacements(list){
  if(!Array.isArray(list)) return [];
  return list.map(entry=>{
    const clone = { ...entry };
    clone.col = clone.col ?? clone.layout?.col ?? 0;
    clone.row = clone.row ?? clone.layout?.row ?? 0;
    clone.offsetX = clone.offsetX || 0;
    clone.offsetY = clone.offsetY || 0;
    if(clone.layout) delete clone.layout;
    return clone;
  });
}

function applyLayoutToWorld(world, layout, enemyPlacements, screenIndex){
  const screenIndexValue = Number.isInteger(screenIndex) ? screenIndex : null;
  const markScreenIndex = (obj)=>{
    if(screenIndexValue === null || !obj || typeof obj !== 'object') return obj;
    obj.screenIndex = screenIndexValue;
    return obj;
  };
  const tileSize = layout?.tileSize || DEFAULT_LAYOUT_TILE_SIZE;
  const baseTileSize = layout?.baseTileSize || BASE_LAYOUT_TILE_SIZE;
  const tileScale = layout?.tileScale ?? (baseTileSize ? tileSize / baseTileSize : 1);
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const worldWidth = Math.max(0, Math.floor(world?.width || 0));
  const displayCols = tileSize > 0 ? Math.max(cols, Math.ceil(worldWidth / tileSize) || 0) : cols;
  const displayWidth = displayCols * tileSize;
  const offsetX = Math.max(0, Math.floor((worldWidth - displayWidth) / 2));
  const groundY = world.groundY || (world.height - 100);
  const sourceCells = layout?.cells || null;
  const cells = sourceCells ? sourceCells.map(row=>row.slice()) : null;
  const sourceBackground = layout?.backgroundCells || null;
  const backgroundCells = sourceBackground ? sourceBackground.map(row=>row.slice()) : null;
  const decor = [];
  const platforms = [];
  const hazards = [];
  const breakables = [];
  const toggleBlocks = [];
  const physicsBoxes = [];
  const softBodies = [];
  const interactives = [];
  const npcs = [];
  const waterRects = layout ? layoutFluidEntriesToRects(layout.waterTiles, layout, tileSize, offsetX, groundY) : [];
  const waterBlocks = typeof generateWaterBlocksFromRects === 'function'
    ? generateWaterBlocksFromRects(waterRects, tileSize)
    : [];
  const sandRects = layout ? layoutFluidEntriesToRects(layout.sandTiles, layout, tileSize, offsetX, groundY) : [];
  const lavaRects = layout ? layoutFluidEntriesToRects(layout.lavaTiles, layout, tileSize, offsetX, groundY) : [];
  const terrainStyles = Array.isArray(layout?.terrainStyles) ? layout.terrainStyles : null;
  const layoutObjects = layoutEntriesToArray(layout?.objects);
  for(const obj of layoutObjects){
    const npc = layoutObjectToNpc(obj, layout, tileSize, offsetX, groundY);
    if(npc){
      npcs.push(markScreenIndex(npc));
      continue;
    }
    const physicsBox = layoutObjectToPhysicsBox(obj, layout, tileSize, offsetX, groundY);
    if(physicsBox){
      physicsBoxes.push(markScreenIndex(physicsBox));
      continue;
    }
    const softBody = layoutObjectToSoftBody(obj, layout, tileSize, offsetX, groundY);
    if(softBody){
      softBodies.push(markScreenIndex(softBody));
      continue;
    }
    const interactive = layoutObjectToInteractive(obj, layout, tileSize, offsetX, groundY);
    if(interactive){
      const marked = markScreenIndex(interactive);
      if(interactive.type === 'platform') platforms.push(marked);
      else if(interactive.type === 'spikes' || interactive.type === 'windLift' || interactive.type === 'steamVent' || interactive.type === 'chronoField' || interactive.type === 'chronosphere' || interactive.type === 'auricBeacon') hazards.push(marked);
      else if(interactive.type === 'crumbleWall') breakables.push(marked);
      else if(interactive.type === 'toggleBlock'){
        toggleBlocks.push(marked);
        if(cells){
          carveTerrainCellsForRect(cells, interactive, {
            tileSize,
            offsetX,
            groundY,
            rows,
            cols
          });
        }
      }
      continue;
    }
    const deco = layoutObjectToDecor(obj, layout, tileSize, offsetX, groundY);
    if(deco){
      decor.push(markScreenIndex(deco));
      if(deco.interaction){
        interactives.push(markScreenIndex({ ...deco.interaction }));
      }
    }
  }
  const terrain = cells ? mergeLayoutCells(cells, tileSize, offsetX, groundY, terrainStyles).map(rect=>markScreenIndex(rect)) : [];
  const enemySpawns = (enemyPlacements || []).map(enemy=>markScreenIndex(layoutEnemyToSpawn(enemy, layout, tileSize, offsetX)));
  const weaponSpawns = layout ? layoutEntriesToArray(layout.weapons).map(entry=>markScreenIndex(layoutWeaponToPickup(entry, layout, tileSize, offsetX, groundY))) : [];
  const cameraZones = layout ? layoutEntriesToArray(layout.cameraZones).map(zone=>markScreenIndex(layoutCameraZoneToWorld(zone, layout, tileSize, offsetX, groundY))).filter(Boolean) : [];
  const entryDoor = markScreenIndex(layoutDoorToWorld(layout?.entryDoor, layout, tileSize, offsetX, groundY));
  const exitDoor = markScreenIndex(layoutDoorToWorld(layout?.exitDoor, layout, tileSize, offsetX, groundY));
  if(screenIndexValue !== null){
    for(const rect of waterRects) markScreenIndex(rect);
    for(const block of waterBlocks) markScreenIndex(block);
    for(const rect of sandRects) markScreenIndex(rect);
    for(const rect of lavaRects) markScreenIndex(rect);
  }
  return {
    terrain,
    decor,
    platforms,
    hazards,
    breakables,
    cells,
    backgroundCells,
    terrainStyles,
    tileSize,
    baseTileSize,
    tileScale,
    offsetX,
    rows,
    cols,
    enemySpawns,
    weapons: weaponSpawns,
    cameraZones,
    entryDoor,
    exitDoor,
    interactives,
    npcs,
    toggleBlocks,
    physicsBoxes,
    softBodies,
    waterRects,
    waterBlocks,
    sandRects,
    lavaRects,
    blockCollision: layout?.blockCollision ?? null,
    screenIndex: screenIndexValue
  };
}

function layoutFluidEntriesToRects(entries, layout, tileSize, offsetX, groundY){
  if(!Array.isArray(entries) || !entries.length) return [];
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const rects = [];
  for(const entry of entries){
    if(!entry) continue;
    const baseCol = clamp(Math.round(entry.col ?? 0), 0, Math.max(0, cols - 1));
    const baseRow = clamp(Math.round(entry.row ?? 0), 0, Math.max(0, rows - 1));
    const rawWidth = Math.max(1, Math.round(entry.width ?? entry.cols ?? 1));
    const rawHeight = Math.max(1, Math.round(entry.height ?? entry.rows ?? entry.depth ?? 1));
    const widthTiles = Math.min(rawWidth, Math.max(1, cols - baseCol));
    const heightTiles = Math.min(rawHeight, Math.max(1, baseRow + 1));
    const left = offsetX + baseCol * tileSize;
    const bottomAlignedTop = groundY - (rows - baseRow) * tileSize;
    const top = bottomAlignedTop - (heightTiles - 1) * tileSize;
    const width = widthTiles * tileSize;
    const height = heightTiles * tileSize;
    rects.push({ left, top, width, height });
  }
  return rects;
}

function fillFluidRects(field, rects, columnForX, rowForY, fillCell){
  if(!field || !Array.isArray(rects) || !rects.length) return false;
  const cellSize = Math.max(1, field.cellSize || 1);
  let changed = false;
  for(const rect of rects){
    if(!rect) continue;
    const left = rect.left ?? 0;
    const top = rect.top ?? 0;
    const width = rect.width ?? 0;
    const height = rect.height ?? 0;
    if(width <= 0 || height <= 0) continue;
    const right = left + width;
    const bottom = top + height;
    let startCol = columnForX(field, left);
    if(startCol < 0) startCol = 0;
    let endCol = columnForX(field, Math.max(left, right - 0.001));
    if(endCol < 0) endCol = field.cols - 1;
    endCol = Math.min(endCol, field.cols - 1);
    let startRow = rowForY(field, top);
    let endRow = rowForY(field, Math.max(top, bottom - 0.001));
    startRow = Math.max(0, startRow);
    endRow = Math.max(0, Math.min(endRow, field.rows - 1));
    if(startCol > endCol || startRow > endRow) continue;
    for(let row=startRow; row<=endRow; row++){
      const centerY = row * cellSize + cellSize * 0.5;
      if(centerY < top - cellSize || centerY > bottom + cellSize) continue;
      for(let col=startCol; col<=endCol; col++){
        const filled = fillCell(field, col, row);
        if(filled) changed = true;
      }
    }
  }
  return changed;
}

function applyLayoutFluidTiles(world, compiled){
  if(!world || !compiled) return;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  const compiledScreenIndex = Number.isInteger(compiled.screenIndex) ? compiled.screenIndex : null;
  if(activeScreenIndex !== null && compiledScreenIndex !== null && activeScreenIndex !== compiledScreenIndex) return;
  if(world.sand && Array.isArray(compiled.sandRects) && compiled.sandRects.length){
    const filled = fillFluidRects(world.sand, compiled.sandRects, sandColumnForX, sandRowForY, fillSandCell);
    if(filled) syncSandHeights(world.sand, true);
  }
  if(world.water && Array.isArray(compiled.waterRects) && compiled.waterRects.length){
    const filled = fillFluidRects(world.water, compiled.waterRects, waterColumnForX, waterRowForY, fillWaterCell);
    if(filled) syncWaterHeights(world.water, true);
  }
  if(Array.isArray(compiled.waterBlocks)){
    world.waterBlocks = compiled.waterBlocks
      .map(block=>block && typeof block === 'object' ? { ...block } : null)
      .filter(Boolean);
  }else{
    world.waterBlocks = [];
  }
  if(world.water){
    world.water.blockRects = Array.isArray(world.waterBlocks) ? world.waterBlocks : [];
  }
  if(world.lava && Array.isArray(compiled.lavaRects) && compiled.lavaRects.length){
    const filled = fillFluidRects(world.lava, compiled.lavaRects, lavaColumnForX, lavaRowForY, fillLavaCell);
    if(filled) syncLavaHeights(world.lava, true);
  }
}

function mergeLayoutCells(cells, tileSize, offsetX, groundY, terrainStyles){
  const rows = cells.length;
  const cols = rows ? cells[0].length : 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const rects = [];
  for(let row=0; row<rows; row++){
    for(let col=0; col<cols; col++){
      if(!cells[row][col] || visited[row][col]) continue;
      const baseStyle = normalizeTerrainStyleId(terrainStyles?.[row]?.[col]);
      let width = 1;
      while(col + width < cols && cells[row][col+width] && !visited[row][col+width]){
        const neighborStyle = normalizeTerrainStyleId(terrainStyles?.[row]?.[col+width]);
        if(neighborStyle !== baseStyle) break;
        width++;
      }
      let height = 1;
      outer: for(let h=1; row + h < rows; h++){
        for(let w=0; w<width; w++){
          if(!cells[row+h][col+w] || visited[row+h][col+w]) break outer;
          const neighborStyle = normalizeTerrainStyleId(terrainStyles?.[row+h]?.[col+w]);
          if(neighborStyle !== baseStyle) break outer;
        }
        height++;
      }
      for(let r=row; r<row+height; r++){
        for(let c=col; c<col+width; c++) visited[r][c] = true;
      }
      const left = offsetX + col * tileSize;
      const top = groundY - (rows - row) * tileSize;
      const rect = { x: left, y: top, w: width * tileSize, h: height * tileSize };
      if(baseStyle) rect.style = baseStyle;
      rects.push(rect);
    }
  }
  return rects;
}

function carveTerrainCellsForRect(cells, rect, options){
  if(!Array.isArray(cells) || !rect || !options) return;
  const tileSize = options.tileSize || DEFAULT_LAYOUT_TILE_SIZE || 30;
  const rows = options.rows || cells.length || 0;
  const cols = options.cols || (cells[0] ? cells[0].length : 0);
  if(tileSize <= 0 || rows <= 0 || cols <= 0) return;
  const offsetX = options.offsetX || 0;
  const groundY = options.groundY || 0;
  const width = rect.w ?? rect.width ?? 0;
  const height = rect.h ?? rect.height ?? 0;
  if(width <= 0 || height <= 0) return;
  const left = rect.x ?? rect.left ?? 0;
  const top = rect.y ?? rect.top ?? 0;
  const right = left + width;
  const bottom = top + height;
  const epsilon = 1e-4;
  const startColRaw = Math.floor((left - offsetX + epsilon) / tileSize);
  const endColRaw = Math.floor(((right - epsilon) - offsetX) / tileSize);
  if(Number.isNaN(startColRaw) || Number.isNaN(endColRaw)) return;
  const minCol = Math.max(0, Math.min(startColRaw, endColRaw));
  const maxCol = Math.min(cols - 1, Math.max(startColRaw, endColRaw));
  if(maxCol < minCol) return;
  const convertRow = (y)=>{
    const distance = groundY - y;
    const steps = distance / tileSize;
    return rows - Math.ceil(steps);
  };
  const startRowRaw = convertRow(top + epsilon);
  const endRowRaw = convertRow(bottom - epsilon);
  const minRow = Math.max(0, Math.min(startRowRaw, endRowRaw));
  const maxRow = Math.min(rows - 1, Math.max(startRowRaw, endRowRaw));
  if(maxRow < minRow) return;
  for(let row=minRow; row<=maxRow; row++){
    const rowCells = cells[row];
    if(!rowCells) continue;
    for(let col=minCol; col<=maxCol; col++){
      if(col < 0 || col >= rowCells.length) continue;
      rowCells[col] = 0;
    }
  }
}

function starFieldNoise(seed){
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function starFieldRandom(base, index, variant){
  const seed = base + index * 9187 + variant * 337;
  return starFieldNoise(seed);
}

function buildStarFieldStars(count, width, height, baseColor, palette, seedBase){
  const stars = [];
  const total = Math.max(1, Math.round(count));
  const paletteList = Array.isArray(palette) && palette.length ? palette.slice() : null;
  for(let i=0; i<total; i++){
    const rx = starFieldRandom(seedBase, i + 1, 1);
    const ry = starFieldRandom(seedBase, i + 1, 2);
    const rSize = starFieldRandom(seedBase, i + 1, 3);
    const rAlpha = starFieldRandom(seedBase, i + 1, 4);
    const rPhase = starFieldRandom(seedBase, i + 1, 5);
    const sparkleRoll = starFieldRandom(seedBase, i + 1, 7);
    const glowRoll = starFieldRandom(seedBase, i + 1, 8);
    const baseSize = Math.max(1, Math.round(1 + rSize * 3));
    const alpha = clamp(0.35 + rAlpha * 0.65, 0.1, 1);
    const colorIndex = paletteList ? Math.floor(starFieldRandom(seedBase, i + 1, 6) * paletteList.length) : -1;
    const color = paletteList ? paletteList[clamp(colorIndex, 0, paletteList.length - 1)] : baseColor;
    const shape = sparkleRoll > 0.82 ? 'spark' : (sparkleRoll > 0.42 ? 'round' : 'square');
    const glow = clamp(0.35 + glowRoll * 0.65, 0, 1);
    stars.push({
      nx: (rx - 0.5),
      ny: ry,
      size: baseSize,
      baseSize,
      alpha,
      color,
      phase: rPhase * TAU,
      shape,
      glow
    });
  }
  return stars;
}

function layoutObjectToPhysicsBox(obj, layout, tileSize, offsetX, groundY){
  if(!obj || (obj.type || '') !== 'physicsBox') return null;
  const rows = layout.rows || 0;
  const cols = layout.cols || 0;
  const col = clamp(Math.round(obj.col ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(obj.row ?? 0), 0, Math.max(0, rows - 1));
  const left = offsetX + col * tileSize;
  const top = groundY - (rows - row) * tileSize;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const width = Math.max(4, (obj.width !== undefined ? obj.width : 20) * tileScale);
  const height = Math.max(4, (obj.height !== undefined ? obj.height : 20) * tileScale);
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  const centerX = left + tileSize * 0.5 + offsetXUnits;
  const baseY = top + tileSize + offsetYUnits;
  return {
    type: 'physicsBox',
    x: centerX,
    y: baseY - height * 0.5,
    width,
    height,
    mass: obj.mass !== undefined ? obj.mass : 1,
    friction: obj.friction !== undefined ? obj.friction : null
  };
}

function layoutObjectToSoftBody(obj, layout, tileSize, offsetX, groundY){
  if(!obj) return null;
  const rawType = (obj.type || '').toString();
  if(rawType !== 'softHexagon' && rawType !== 'softBodyHexagon' && rawType !== 'softBody') return null;
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const col = clamp(Math.round(obj.col ?? obj.x ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(obj.row ?? obj.y ?? rows - 1), 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + col * tileSize;
  const tileTop = groundY - (rows - row) * tileSize;
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const baseYOffset = obj.offsetY !== undefined ? obj.offsetY : tileSize;
  const baseY = tileTop + baseYOffset * tileScale;
  const baseRadius = obj.radius !== undefined ? obj.radius : Math.max(tileSize * 0.6, 36);
  const radius = Math.max(6, baseRadius * tileScale);
  const centerOffsetRaw = obj.centerOffsetY !== undefined ? obj.centerOffsetY : baseRadius;
  const centerY = baseY - centerOffsetRaw * tileScale;
  const centerX = tileLeft + tileSize * 0.5 + offsetXUnits;
  const segments = obj.segments !== undefined ? Math.max(3, Math.round(obj.segments)) : 6;
  const id = obj.id || `softBody_${softBodyIdCounter++}`;
  const rotation = obj.rotation !== undefined ? obj.rotation : 0;
  const def = {
    type: 'softHexagon',
    id,
    centerX,
    centerY,
    radius,
    segmentCount: segments,
    rotation,
    pointMass: obj.pointMass,
    centerMass: obj.centerMass,
    stiffness: obj.stiffness,
    edgeElasticity: obj.edgeElasticity !== undefined ? obj.edgeElasticity : obj.elasticity,
    damping: obj.damping,
    groundFriction: obj.groundFriction,
    terrainRadius: obj.terrainRadius !== undefined ? obj.terrainRadius * tileScale : undefined,
    airDrag: obj.airDrag,
    verticalDrag: obj.verticalDrag,
    color: obj.color,
    edgeColor: obj.edgeColor,
    highlightColor: obj.highlightColor,
    impactDuration: obj.impactDuration,
    impulseScale: obj.impulseScale !== undefined ? obj.impulseScale * tileScale : undefined,
    shadowRadius: obj.shadowRadius !== undefined ? obj.shadowRadius * tileScale : undefined,
    shadowOpacity: obj.shadowOpacity
  };
  return def;
}

function layoutObjectToDecor(obj, layout, tileSize, offsetX, groundY){
  const rows = layout.rows;
  const col = clamp(Math.round(obj.col), 0, layout.cols - 1);
  const row = clamp(Math.round(obj.row), 0, rows - 1);
  const left = offsetX + col * tileSize;
  const top = groundY - (rows - row) * tileSize;
  const type = obj.type || 'crate';
  if(type === 'physicsBox') return null;
  if(['platform','spikes','crumbleWall'].includes(type)) return null;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  const baseY = top + tileSize + offsetYUnits;
  const decor = {
    type,
    x: left + tileSize * 0.5 + offsetXUnits,
    baseY,
    width: obj.width !== undefined ? obj.width * tileScale : undefined,
    height: obj.height !== undefined ? obj.height * tileScale : undefined
  };
  if(obj.id) decor.id = obj.id;
  if(obj.layer) decor.layer = obj.layer;
  if(obj.color) decor.color = obj.color;
  if(obj.glowColor || obj.glow) decor.glowColor = obj.glowColor || obj.glow;
  if(type === 'crate'){
    const defaultSize = 34;
    const maintainAspect = obj.keepAspect !== false;
    const widthUnits = obj.width !== undefined ? obj.width : defaultSize;
    let heightUnits = obj.height !== undefined ? obj.height : widthUnits;
    if(maintainAspect){
      const tolerance = Math.max(1, Math.abs(widthUnits) * 0.05);
      if(Math.abs(heightUnits - widthUnits) > tolerance){
        heightUnits = widthUnits;
      }
    }
    const width = widthUnits * tileScale;
    const height = heightUnits * tileScale;
    decor.width = width;
    decor.height = height;
    if(obj.keepAspect === false) decor.keepAspect = false;
    decor.health = obj.health ?? 40;
    decor.breakable = true;
    decor.broken = false;
    decor.material = obj.material || 'wood';
    decor.floats = obj.floats !== undefined ? !!obj.floats : true;
    const floatDepth = obj.floatDepth !== undefined ? obj.floatDepth * tileScale : Math.max(4, height * 0.2);
    decor.floatDepth = floatDepth;
    decor.bobAmplitude = obj.bobAmplitude !== undefined ? obj.bobAmplitude * tileScale : Math.max(2, floatDepth * 0.4);
    if(obj.floatTolerance !== undefined) decor.floatTolerance = obj.floatTolerance * tileScale;
    if(obj.floatLerpSpeed !== undefined) decor.floatLerpSpeed = obj.floatLerpSpeed;
    if(obj.flammable !== undefined){
      decor.flammable = !!obj.flammable;
    }else if(decor.material === 'wood'){
      decor.flammable = true;
    }
  }
  if(type === 'fireflyJar' || type === 'hangingFireflyJar'){
    const baseWidth = obj.width !== undefined ? obj.width : 26;
    const baseHeight = obj.height !== undefined ? obj.height : 42;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    decor.breakable = true;
    decor.health = obj.health ?? 18;
    decor.material = 'glass';
    decor.persistOnBreak = true;
    decor.fireflyCount = obj.fireflyCount ?? 10;
    decor.fireflyLightRadius = obj.fireflyLightRadius ?? 15;
    if(obj.fireflyLifetimeMin !== undefined) decor.fireflyLifetimeMin = obj.fireflyLifetimeMin;
    if(obj.fireflyLifetimeMax !== undefined) decor.fireflyLifetimeMax = obj.fireflyLifetimeMax;
    if(obj.fireflyFlightRadius !== undefined) decor.fireflyFlightRadius = obj.fireflyFlightRadius * tileScale;
    if(obj.fireflySpeed !== undefined) decor.fireflySpeed = obj.fireflySpeed;
    if(obj.fireflyPullStrength !== undefined) decor.fireflyPullStrength = obj.fireflyPullStrength;
    if(obj.glassColor) decor.glassColor = obj.glassColor;
    if(obj.glassStroke) decor.glassStroke = obj.glassStroke;
    if(obj.rimColor) decor.rimColor = obj.rimColor;
    if(obj.glowFill) decor.glowFill = obj.glowFill;
    if(obj.fireflyLightColor) decor.fireflyLightColor = obj.fireflyLightColor;
    if(obj.fireflyGlowColor) decor.fireflyGlowColor = obj.fireflyGlowColor;
    if(obj.permanentFireflies !== undefined) decor.permanentFireflies = !!obj.permanentFireflies;
    if(obj.hangerColor) decor.hangerColor = obj.hangerColor;
  }
  if(type === 'fireflyJarSwarm'){
    const baseWidth = obj.width !== undefined ? obj.width : 26;
    const baseHeight = obj.height !== undefined ? obj.height : 42;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    decor.fireflyCount = obj.fireflyCount ?? 18;
    const flightRadiusUnits = obj.fireflyFlightRadius !== undefined
      ? obj.fireflyFlightRadius
      : (obj.flightRadius !== undefined ? obj.flightRadius : 220);
    const spawnRadiusUnits = obj.fireflySpawnRadius !== undefined
      ? obj.fireflySpawnRadius
      : (obj.spawnRadius !== undefined ? obj.spawnRadius : Math.max(60, flightRadiusUnits * 0.5));
    decor.fireflyFlightRadius = Math.max(60, flightRadiusUnits * tileScale);
    decor.fireflySpawnRadius = Math.max(0, spawnRadiusUnits * tileScale);
    decor.fireflyLightRadius = obj.fireflyLightRadius ?? 18;
    if(obj.fireflySpeed !== undefined) decor.fireflySpeed = obj.fireflySpeed;
    if(obj.fireflyPullStrength !== undefined) decor.fireflyPullStrength = obj.fireflyPullStrength;
    if(obj.fireflyLifetimeMin !== undefined) decor.fireflyLifetimeMin = obj.fireflyLifetimeMin;
    if(obj.fireflyLifetimeMax !== undefined) decor.fireflyLifetimeMax = obj.fireflyLifetimeMax;
    if(obj.fireflyLightColor) decor.fireflyLightColor = obj.fireflyLightColor;
    if(obj.fireflyGlowColor) decor.fireflyGlowColor = obj.fireflyGlowColor;
    if(obj.fireflyHalfSize !== undefined) decor.fireflyHalfSize = obj.fireflyHalfSize;
    decor.permanentFireflies = true;
    decor.suppressJarShardSpawn = obj.suppressJarShardSpawn !== undefined
      ? !!obj.suppressJarShardSpawn
      : true;
  }
  if(type === 'ambientFireflies'){
    const baseWidth = obj.width !== undefined ? obj.width : 160;
    const baseHeight = obj.height !== undefined ? obj.height : 160;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    const flightRadiusUnits = obj.flightRadius !== undefined
      ? obj.flightRadius
      : Math.max(baseWidth, baseHeight) * 1.3;
    const spawnRadiusUnits = obj.spawnRadius !== undefined
      ? obj.spawnRadius
      : flightRadiusUnits * 0.5;
    decor.fireflyCount = obj.fireflyCount ?? 16;
    decor.fireflyLightRadius = obj.fireflyLightRadius ?? 22;
    decor.fireflyFlightRadius = Math.max(60, flightRadiusUnits * tileScale);
    decor.fireflySpawnRadius = Math.max(30, spawnRadiusUnits * tileScale);
    decor.radius = decor.fireflyFlightRadius;
    if(obj.fireflySpeed !== undefined) decor.fireflySpeed = obj.fireflySpeed;
    if(obj.fireflyPullStrength !== undefined) decor.fireflyPullStrength = obj.fireflyPullStrength;
    if(obj.fireflyLifetimeMin !== undefined) decor.fireflyLifetimeMin = obj.fireflyLifetimeMin;
    if(obj.fireflyLifetimeMax !== undefined) decor.fireflyLifetimeMax = obj.fireflyLifetimeMax;
    if(obj.fireflyLightColor) decor.fireflyLightColor = obj.fireflyLightColor;
    if(obj.fireflyGlowColor) decor.fireflyGlowColor = obj.fireflyGlowColor;
    if(obj.fireflyRespawnDelay !== undefined) decor.fireflyRespawnDelay = obj.fireflyRespawnDelay;
    if(obj.fireflyFlickerSpeedMin !== undefined) decor.fireflyFlickerSpeedMin = obj.fireflyFlickerSpeedMin;
    if(obj.fireflyFlickerSpeedMax !== undefined) decor.fireflyFlickerSpeedMax = obj.fireflyFlickerSpeedMax;
    if(obj.originOffsetX !== undefined) decor.originOffsetX = obj.originOffsetX * tileScale;
    if(obj.originOffsetY !== undefined) decor.originOffsetY = obj.originOffsetY * tileScale;
    if(obj.fireflyHalfSize !== undefined) decor.fireflyHalfSize = obj.fireflyHalfSize;
    decor.permanentFireflies = true;
  }
  if(type === 'treasureChest'){
    const baseWidth = obj.width !== undefined ? obj.width : 68;
    const baseHeight = obj.height !== undefined ? obj.height : 48;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    const chestState = { opened: !!obj.opened };
    if(chestState.opened) chestState.openTime = 0;
    decor.chestState = chestState;
    if(obj.trimColor) decor.trimColor = obj.trimColor;
    if(obj.goldColor) decor.goldColor = obj.goldColor;
    const interactionId = obj.id || `treasureChest_${interactiveIdCounter++}`;
    const promptOffset = (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.8) * tileScale;
    const playerPromptOffset = (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale;
    const radius = (obj.radius !== undefined ? obj.radius : Math.max(70, baseWidth * 0.9)) * tileScale;
    const interactionHeight = (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale;
    const loot = {};
    if(obj.loot && typeof obj.loot === 'object'){
      if(obj.loot.coins !== undefined) loot.coins = obj.loot.coins;
      if(obj.loot.coinValue !== undefined) loot.coinValue = obj.loot.coinValue;
      if(obj.loot.weaponId || obj.loot.weapon) loot.weaponId = obj.loot.weaponId || obj.loot.weapon;
      if(obj.loot.requireKnownWeapon !== undefined) loot.requireKnownWeapon = !!obj.loot.requireKnownWeapon;
      const lootItem = normalizeChestLootItem(obj.loot.item);
      if(lootItem) loot.item = lootItem;
    }
    if(loot.coins === undefined && obj.coins !== undefined) loot.coins = obj.coins;
    if(loot.coinValue === undefined && obj.coinValue !== undefined) loot.coinValue = obj.coinValue;
    if(!loot.weaponId && (obj.weaponId || obj.weapon)) loot.weaponId = obj.weaponId || obj.weapon;
    if(loot.requireKnownWeapon === undefined && obj.requireKnownWeapon !== undefined){
      loot.requireKnownWeapon = !!obj.requireKnownWeapon;
    }
    if(!loot.item){
      const fallbackItem = normalizeChestLootItem(obj.item);
      if(fallbackItem) loot.item = fallbackItem;
    }
    decor.loot = loot;
    decor.interaction = {
      type: 'treasureChest',
      id: interactionId,
      x: decor.x,
      y: decor.baseY - height * 0.5,
      radius,
      height: interactionHeight,
      promptOffsetY: promptOffset,
      playerPromptOffsetY: playerPromptOffset,
      promptAnchor: obj.promptAnchor || 'object',
      promptColor: obj.promptColor || '#f6d66a',
      chestState,
      loot
    };
  }
  if(type === 'glowCrystal'){
    const baseWidth = obj.width !== undefined ? obj.width : 34;
    const baseHeight = obj.height !== undefined ? obj.height : 48;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    const cells = Array.isArray(layout?.cells) ? layout.cells : null;
    const rowCells = Array.isArray(cells?.[row]) ? cells[row] : null;
    const hasLeftSolid = !!(rowCells && col > 0 && rowCells[col - 1]);
    const hasRightSolid = !!(rowCells && col < rowCells.length - 1 && rowCells[col + 1]);
    const aboveRow = row > 0 && Array.isArray(cells?.[row - 1]) ? cells[row - 1] : null;
    const belowRow = row < rows - 1 && Array.isArray(cells?.[row + 1]) ? cells[row + 1] : null;
    const hasTopSolid = !!(aboveRow && aboveRow[col]);
    const hasBottomSolid = !!(belowRow && belowRow[col]);
    let anchorRaw = (obj.anchor || obj.attach || obj.mount || 'auto').toString().toLowerCase();
    if(anchorRaw !== 'left' && anchorRaw !== 'right' && anchorRaw !== 'floor' && anchorRaw !== 'ceiling'){
      anchorRaw = 'auto';
    }
    let facing = null;
    if(obj.facing !== undefined || obj.face !== undefined){
      const faceRaw = (obj.facing ?? obj.face ?? 'right').toString().toLowerCase();
      facing = faceRaw === 'left' ? -1 : 1;
    }
    let anchor = anchorRaw;
    if(anchor === 'auto' || anchor === 'wall'){
      if(hasLeftSolid && !hasRightSolid){
        anchor = 'left';
        if(facing === null) facing = 1;
      }else if(hasRightSolid && !hasLeftSolid){
        anchor = 'right';
        if(facing === null) facing = -1;
      }else if(hasLeftSolid && hasRightSolid){
        anchor = facing === -1 ? 'right' : 'left';
        if(facing === null) facing = 1;
      }else if(hasTopSolid && !hasBottomSolid){
        anchor = 'ceiling';
      }else if(hasBottomSolid && !hasTopSolid){
        anchor = 'floor';
      }else{
        anchor = 'left';
        if(facing === null) facing = 1;
      }
    }else if(anchor === 'left'){
      if(facing === null) facing = 1;
    }else if(anchor === 'right'){
      if(facing === null) facing = -1;
    }else if(facing === null){
      facing = 1;
    }
    const gapUnits = obj.wallOffset !== undefined ? obj.wallOffset : baseWidth * 0.08;
    const wallGap = gapUnits * tileScale;
    const anchorOffsetUnits = obj.anchorOffsetY !== undefined
      ? obj.anchorOffsetY
      : (obj.wallOffsetY !== undefined ? obj.wallOffsetY : 0);
    const anchorOffset = anchorOffsetUnits * tileScale;
    if(anchor === 'left'){
      decor.x = left + wallGap + width * 0.5 + offsetXUnits;
    }else if(anchor === 'right'){
      decor.x = left + tileSize - wallGap - width * 0.5 + offsetXUnits;
    }
    if(anchor === 'left' || anchor === 'right'){
      const centerY = top + tileSize * 0.5 + anchorOffset;
      decor.baseY = centerY + height * 0.5;
    }else if(anchor === 'ceiling'){
      const attachY = top + anchorOffset;
      decor.baseY = attachY + height;
    }else if(anchor === 'floor'){
      decor.baseY = baseY + anchorOffset;
    }
    decor.anchor = anchor;
    decor.mount = anchor;
    decor.facing = facing ?? 1;
    decor.wallGap = wallGap;
    const baseIntensity = obj.lightBaseIntensity ?? obj.lightIntensity ?? 0.9;
    decor.lightBaseIntensity = baseIntensity;
    decor.lightIntensity = baseIntensity;
    if(obj.lightRadius !== undefined) decor.lightRadius = obj.lightRadius * tileScale;
    else decor.lightRadius = Math.max(width * 4.5, tileSize * 3.2);
    if(obj.lightSoftness !== undefined) decor.lightSoftness = obj.lightSoftness;
    if(obj.glowRadius !== undefined) decor.glowRadius = obj.glowRadius * tileScale;
    else decor.glowRadius = Math.max(width * 2.6, decor.lightRadius * 0.9);
    if(obj.glowIntensity !== undefined) decor.glowIntensity = obj.glowIntensity;
    if(obj.pulseSpeed !== undefined) decor.pulseSpeed = obj.pulseSpeed;
    if(obj.pulseAmount !== undefined) decor.pulseAmount = obj.pulseAmount;
    if(obj.twinkleSpeed !== undefined) decor.twinkleSpeed = obj.twinkleSpeed;
    if(obj.sparkleInterval !== undefined) decor.sparkleInterval = obj.sparkleInterval;
    if(obj.sparkleChance !== undefined) decor.sparkleChance = obj.sparkleChance;
    decor.coreColor = obj.coreColor || obj.color || '#ff9f6f';
    decor.rimColor = obj.rimColor || '#ffd7a8';
    decor.shardColor = obj.shardColor || '#d96c42';
    decor.mountColor = obj.mountColor || '#2b1520';
    decor.lightColor = obj.lightColor || 'rgba(255, 210, 160, 0.92)';
    if(obj.glowColor) decor.glowColor = obj.glowColor;
    else if(!decor.glowColor) decor.glowColor = 'rgba(255, 150, 96, 0.82)';
    if(obj.seed !== undefined) decor.seed = obj.seed;
    else decor.seed = row * 92821 + col * 68917;
  }
  if(type === 'swordPedestal'){
    const baseWidth = obj.width !== undefined ? obj.width : 86;
    const baseHeight = obj.height !== undefined ? obj.height : 100;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.stoneColor = obj.stoneColor || obj.color || '#696d7d';
    if(obj.accentColor) decor.accentColor = obj.accentColor;
    if(obj.trimColor) decor.trimColor = obj.trimColor;
    const swordState = { claimed: !!obj.claimed };
    if(swordState.claimed) swordState.openTime = 0;
    decor.swordState = swordState;
    const interactionId = obj.id || `swordPedestal_${interactiveIdCounter++}`;
    const promptOffset = (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.75) * tileScale;
    const playerPromptOffset = (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale;
    const radius = (obj.radius !== undefined ? obj.radius : Math.max(80, baseWidth * 0.9)) * tileScale;
    const interactionHeight = (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale;
    const loot = {};
    if(obj.loot && typeof obj.loot === 'object'){
      if(obj.loot.weaponId || obj.loot.weapon) loot.weaponId = obj.loot.weaponId || obj.loot.weapon;
      if(obj.loot.requireKnownWeapon !== undefined) loot.requireKnownWeapon = !!obj.loot.requireKnownWeapon;
      const lootItem = normalizeChestLootItem(obj.loot.item);
      if(lootItem) loot.item = lootItem;
    }
    if(!loot.weaponId && (obj.weaponId || obj.weapon)) loot.weaponId = obj.weaponId || obj.weapon;
    if(loot.requireKnownWeapon === undefined && obj.requireKnownWeapon !== undefined){
      loot.requireKnownWeapon = !!obj.requireKnownWeapon;
    }
    if(!loot.item){
      const fallbackItem = normalizeChestLootItem(obj.item);
      if(fallbackItem) loot.item = fallbackItem;
    }
    decor.loot = loot;
    decor.interaction = {
      type: 'swordPedestal',
      id: interactionId,
      x: decor.x,
      y: decor.baseY - height * 0.5,
      radius,
      height: interactionHeight,
      promptOffsetY: promptOffset,
      playerPromptOffsetY: playerPromptOffset,
      promptAnchor: obj.promptAnchor || 'object',
      promptColor: obj.promptColor || '#d6e4ff',
      swordState,
      loot
    };
  }
  if(type === 'voidPortal'){
    const baseWidth = obj.width !== undefined ? obj.width : 72;
    const baseHeight = obj.height !== undefined ? obj.height : 120;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.ringColor = obj.ringColor || obj.color || '#c9c4ff';
    if(obj.glowColor) decor.glowColor = obj.glowColor;
    if(obj.coreColor) decor.coreColor = obj.coreColor;
    if(obj.sparkColor) decor.sparkColor = obj.sparkColor;
    if(obj.phase !== undefined) decor.phase = obj.phase;
    if(obj.seed !== undefined) decor.seed = obj.seed;
    const interactionId = obj.id || `voidPortal_${interactiveIdCounter++}`;
    const promptOffset = (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.72) * tileScale;
    const playerPromptOffset = (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 108) * tileScale;
    const radius = (obj.radius !== undefined ? obj.radius : Math.max(80, baseWidth)) * tileScale;
    const interactionHeight = (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale;
    const interaction = {
      type: 'voidPortal',
      id: interactionId,
      x: decor.x,
      y: decor.baseY - height * 0.5,
      radius,
      height: interactionHeight,
      promptOffsetY: promptOffset,
      playerPromptOffsetY: playerPromptOffset,
      promptColor: obj.promptColor || '#c9c4ff',
      targetStageId: obj.targetStageId || obj.targetStage || obj.stageId || null
    };
    if(obj.requireFacing) interaction.requireFacing = obj.requireFacing;
    decor.interaction = interaction;
  }
  if(type === 'voidSymbol'){
    const baseWidth = obj.width !== undefined ? obj.width : 68;
    const baseHeight = obj.height !== undefined ? obj.height : 68;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    if(obj.color) decor.fillColor = obj.color;
    if(obj.strokeColor) decor.strokeColor = obj.strokeColor;
    if(obj.accentColor) decor.accentColor = obj.accentColor;
    if(obj.flipped !== undefined) decor.flipped = !!obj.flipped;
    if(obj.theme) decor.theme = obj.theme;
    if(obj.id) decor.id = obj.id;
    const interactionId = obj.id || `voidSymbol_${interactiveIdCounter++}`;
    const promptOffset = (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.6) * tileScale;
    const playerPromptOffset = (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale;
    const radius = (obj.radius !== undefined ? obj.radius : Math.max(baseWidth * 0.6, 60)) * tileScale;
    const interactionHeight = (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale;
    const promptColor = obj.promptColor || obj.strokeColor || '#c9c4ff';
    decor.interaction = {
      type: 'voidSymbol',
      id: interactionId,
      x: decor.x,
      y: decor.baseY - decor.height * 0.5,
      baseY: decor.baseY,
      radius,
      height: interactionHeight,
      promptOffsetY: promptOffset,
      playerPromptOffsetY: playerPromptOffset,
      promptAnchor: obj.promptAnchor || 'object',
      promptColor
    };
  }
  if(type === 'raft'){
    const baseWidth = obj.width !== undefined ? obj.width : 180;
    const baseHeight = obj.height !== undefined ? obj.height : 40;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.material = obj.material || 'wood';
    decor.floats = obj.floats !== undefined ? !!obj.floats : true;
    const floatDepth = obj.floatDepth !== undefined ? obj.floatDepth * tileScale : Math.max(8, height * 0.2);
    decor.floatDepth = floatDepth;
    decor.bobAmplitude = obj.bobAmplitude !== undefined ? obj.bobAmplitude * tileScale : Math.max(3, floatDepth * 0.6);
    if(obj.floatTolerance !== undefined) decor.floatTolerance = obj.floatTolerance * tileScale;
    if(obj.floatLerpSpeed !== undefined) decor.floatLerpSpeed = obj.floatLerpSpeed;
    if(obj.ropeColor) decor.ropeColor = obj.ropeColor;
  }
  if(type === 'boat'){
    const baseWidth = obj.width !== undefined ? obj.width : 150;
    const baseHeight = obj.height !== undefined ? obj.height : 54;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.material = obj.material || 'wood';
    decor.floats = obj.floats !== undefined ? !!obj.floats : true;
    const floatDepth = obj.floatDepth !== undefined ? obj.floatDepth * tileScale : Math.max(10, height * 0.25);
    decor.floatDepth = floatDepth;
    decor.bobAmplitude = obj.bobAmplitude !== undefined ? obj.bobAmplitude * tileScale : Math.max(3, floatDepth * 0.7);
    if(obj.floatTolerance !== undefined) decor.floatTolerance = obj.floatTolerance * tileScale;
    if(obj.floatLerpSpeed !== undefined) decor.floatLerpSpeed = obj.floatLerpSpeed;
  }
  if(type === 'rainField'){
    const baseWidth = obj.width !== undefined ? obj.width : tileSize * layout.cols;
    const baseHeight = obj.height !== undefined ? obj.height : Math.max(tileSize * 2, tileSize * layout.rows * 0.6);
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.layer = obj.layer === 'foreground' ? 'foreground' : 'background';
    if(obj.parallax !== undefined) decor.parallax = obj.parallax;
    if(obj.parallaxY !== undefined) decor.parallaxY = obj.parallaxY;
    if(obj.density !== undefined) decor.density = obj.density;
    if(obj.densityVariance !== undefined) decor.densityVariance = obj.densityVariance;
    if(obj.speed !== undefined) decor.speed = obj.speed * tileScale;
    if(obj.speedVariance !== undefined) decor.speedVariance = obj.speedVariance * tileScale;
    if(obj.wind !== undefined) decor.wind = obj.wind * tileScale;
    if(obj.windVariance !== undefined) decor.windVariance = obj.windVariance * tileScale;
    if(obj.dropLength !== undefined) decor.dropLength = obj.dropLength * tileScale;
    if(obj.dropLengthVariance !== undefined) decor.dropLengthVariance = obj.dropLengthVariance * tileScale;
    if(obj.dropThickness !== undefined) decor.dropThickness = obj.dropThickness * tileScale;
    if(obj.dropThicknessVariance !== undefined) decor.dropThicknessVariance = obj.dropThicknessVariance * tileScale;
    if(obj.dropAlpha !== undefined) decor.dropAlpha = obj.dropAlpha;
    if(obj.dropColor) decor.dropColor = obj.dropColor;
    if(obj.splashRadius !== undefined) decor.splashRadius = obj.splashRadius * tileScale;
    if(obj.splashDuration !== undefined) decor.splashDuration = obj.splashDuration;
    if(obj.splashThickness !== undefined) decor.splashThickness = obj.splashThickness * tileScale;
    if(obj.splashColor) decor.splashColor = obj.splashColor;
    if(obj.maxDrops !== undefined) decor.maxDrops = obj.maxDrops;
    if(obj.flashColor) decor.flashColor = obj.flashColor;
    if(obj.flashAlpha !== undefined) decor.flashAlpha = obj.flashAlpha;
    if(obj.flashIntensity !== undefined) decor.flashIntensity = obj.flashIntensity;
    if(obj.thunderIntervalMin !== undefined) decor.thunderIntervalMin = obj.thunderIntervalMin;
    if(obj.thunderIntervalMax !== undefined) decor.thunderIntervalMax = obj.thunderIntervalMax;
    if(obj.mistAlpha !== undefined) decor.mistAlpha = obj.mistAlpha;
    if(obj.mistColor) decor.mistColor = obj.mistColor;
    if(obj.overlayColor) decor.overlayColor = obj.overlayColor;
    return decor;
  }
  if(type === 'starField'){
    const baseWidth = obj.width !== undefined ? obj.width : tileSize * layout.cols;
    const baseHeight = obj.height !== undefined ? obj.height : Math.max(tileSize * 2, tileSize * layout.rows * 0.4);
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.layer = obj.layer === 'foreground' ? 'foreground' : 'background';
    decor.parallax = obj.parallax !== undefined ? obj.parallax : (decor.layer === 'foreground' ? 1.16 : 1.06);
    decor.parallaxY = obj.parallaxY !== undefined ? obj.parallaxY : decor.parallax;
    decor.baseAlpha = obj.opacity !== undefined ? clamp(obj.opacity, 0, 1) : 1;
    decor.twinkleAmount = obj.twinkleAmount !== undefined ? clamp(obj.twinkleAmount, 0, 1) : 0.4;
    decor.twinkleSpeed = obj.twinkleSpeed !== undefined ? Math.max(0, obj.twinkleSpeed) : 0.6;
    const count = Math.max(1, Math.round(obj.starCount || obj.count || 80));
    const palette = Array.isArray(obj.colors) && obj.colors.length ? obj.colors.slice() : null;
    const baseColor = obj.color || '#ffffff';
    const seedBase = (obj.seed !== undefined ? Number(obj.seed) : 0) + row * 92821 + col * 68917;
    decor.starFieldBaseWidth = width;
    decor.starFieldBaseHeight = height;
    decor.stars = buildStarFieldStars(count, width, height, baseColor, palette, seedBase);
    decor.color = baseColor;
    return decor;
  }
  if(type === 'foregroundShadow'){
    const baseWidth = obj.width !== undefined ? obj.width : 200;
    const baseHeight = obj.height !== undefined ? obj.height : 180;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    decor.opacity = obj.opacity !== undefined ? obj.opacity : 0.3;
    const blur = obj.blurRadius !== undefined ? obj.blurRadius : Math.max(baseWidth, baseHeight) * 0.08;
    decor.blurRadius = blur * tileScale;
    decor.parallax = obj.parallax !== undefined ? obj.parallax : 1.18;
    decor.parallaxY = obj.parallaxY !== undefined ? obj.parallaxY : decor.parallax;
    if(obj.rotation !== undefined) decor.rotation = obj.rotation;
    if(obj.cornerRadius !== undefined) decor.cornerRadius = obj.cornerRadius * tileScale;
    if(obj.shape) decor.shape = obj.shape;
    decor.color = obj.color || '#0f0f12';
    decor.layer = 'foreground';
    return decor;
  }
  if(type === 'foregroundSunRays'){
    const baseWidth = obj.width !== undefined ? obj.width : 240;
    const baseHeight = obj.height !== undefined ? obj.height : 320;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.layer = 'foreground';
    decor.opacity = obj.opacity !== undefined ? obj.opacity : 0.32;
    const blur = obj.blurRadius !== undefined ? obj.blurRadius : Math.max(baseWidth, baseHeight) * 0.06;
    decor.blurRadius = blur * tileScale;
    decor.parallax = obj.parallax !== undefined ? obj.parallax : 1.12;
    decor.parallaxY = obj.parallaxY !== undefined ? obj.parallaxY : decor.parallax;
    if(obj.rayCount !== undefined) decor.rayCount = obj.rayCount;
    if(obj.rayWidth !== undefined) decor.rayWidth = obj.rayWidth * tileScale;
    if(obj.spread !== undefined) decor.spread = obj.spread * tileScale;
    if(obj.topScale !== undefined) decor.topScale = obj.topScale;
    if(obj.bottomScale !== undefined) decor.bottomScale = obj.bottomScale;
    if(obj.gradientFocus !== undefined) decor.gradientFocus = obj.gradientFocus;
    if(obj.fadeTop !== undefined) decor.fadeTop = obj.fadeTop;
    if(obj.fadeBottom !== undefined) decor.fadeBottom = obj.fadeBottom;
    if(obj.pulseAmount !== undefined) decor.pulseAmount = obj.pulseAmount;
    if(obj.pulseSpeed !== undefined) decor.pulseSpeed = obj.pulseSpeed;
    if(obj.phase !== undefined) decor.phase = obj.phase;
    if(obj.phaseStep !== undefined) decor.phaseStep = obj.phaseStep;
    if(obj.waveAmplitude !== undefined) decor.waveAmplitude = obj.waveAmplitude * tileScale;
    if(obj.waveSpeed !== undefined) decor.waveSpeed = obj.waveSpeed;
    if(obj.driftAmplitude !== undefined) decor.driftAmplitude = obj.driftAmplitude * tileScale;
    if(obj.driftSpeed !== undefined) decor.driftSpeed = obj.driftSpeed;
    if(obj.rotation !== undefined) decor.rotation = obj.rotation;
    decor.blendMode = obj.blendMode || 'screen';
    decor.color = obj.color || '#ffe6a8';
    return decor;
  }
  if(obj.flammable !== undefined && decor.flammable === undefined){
    decor.flammable = !!obj.flammable;
  }
  if(obj.material && !decor.material){
    decor.material = obj.material;
  }
  if(type === 'restingStick'){
    const baseWidth = obj.width !== undefined ? obj.width : 80;
    const baseHeight = obj.height !== undefined ? obj.height : 96;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    const maxSlots = Number.isFinite(TEAM_SIZE) && TEAM_SIZE > 0 ? TEAM_SIZE : 3;
    const rawSlot = obj.unlockSlot ?? obj.slot ?? obj.unlocksSlot ?? 2;
    const unlockSlot = clamp(Math.round(rawSlot), 1, maxSlots);
    decor.unlockSlot = unlockSlot;
    const promptColor = obj.promptColor || '#9fd4a6';
    const spawnOffsetX = (obj.spawnOffsetX || 0) * tileScale;
    const spawnOffsetY = (obj.spawnOffsetY || 0) * tileScale;
    const interaction = {
      type: 'restingStick',
      id: obj.id || `restingStick_${interactiveIdCounter++}`,
      x: decor.x,
      y: (decor.baseY ?? baseY) - height * 0.5,
      radius: (obj.radius !== undefined ? obj.radius : Math.max(70, baseWidth * 0.7)) * tileScale,
      height: (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale,
      promptOffsetY: (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.6) * tileScale,
      playerPromptOffsetY: (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale,
      promptAnchor: obj.promptAnchor || 'object',
      promptColor,
      unlockSlot,
      spawnX: decor.x + spawnOffsetX,
      spawnY: (decor.baseY ?? baseY) + spawnOffsetY
    };
    decor.interaction = interaction;
    return decor;
  }
  if(type === 'skillPedestal'){
    const baseWidth = obj.width !== undefined ? obj.width : 92;
    const baseHeight = obj.height !== undefined ? obj.height : 88;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    const alignOffset = obj.baseOffset !== undefined
      ? obj.baseOffset * tileScale
      : Math.round(Math.max(0, tileScale * 2));
    decor.baseY = (decor.baseY ?? baseY) + alignOffset;
    decor.width = width;
    decor.height = height;
    decor.bookColor = obj.bookColor || '#f7f0d4';
    decor.pedestalColor = obj.pedestalColor || '#5c4530';
    const abilityRaw = obj.abilityId !== undefined ? obj.abilityId : (obj.ability !== undefined ? obj.ability : obj.skillId);
    const abilityId = abilityRaw !== undefined && abilityRaw !== null ? String(abilityRaw).trim() : null;
    const shrineState = abilityId ? { activated: !!obj.activated } : null;
    if(shrineState) decor.shrineState = shrineState;
    if(abilityId) decor.shrineAbilityId = abilityId;
    if(obj.shrineGlowColor) decor.shrineGlowColor = obj.shrineGlowColor;
    const promptColor = obj.promptColor || (abilityId ? '#9fe0ff' : null);
    const interaction = {
      type: 'skillPedestal',
      x: decor.x,
      y: decor.baseY - height * 0.5,
      radius: (obj.radius !== undefined ? obj.radius : Math.max(70, baseWidth * 0.6)) * tileScale,
      height: (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale,
      promptOffsetY: (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.7) * tileScale,
      playerPromptOffsetY: (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale,
      promptAnchor: obj.promptAnchor || 'object'
    };
    if(promptColor) interaction.promptColor = promptColor;
    if(abilityId){
      interaction.abilityId = abilityId;
      interaction.shrineState = shrineState;
      interaction.canInteract = (stick, entry)=>{
        if(!stick || !entry) return false;
        if(entry.shrineState?.activated) return false;
        const worldRef = stick.world || null;
        if(!worldRef) return false;
        if(typeof abilityDefinitionById === 'function' && !abilityDefinitionById(abilityId)) return false;
        if(typeof isAbilityUnlocked === 'function' && isAbilityUnlocked(worldRef, abilityId)) return false;
        return true;
      };
      const interactionId = obj.id || `skillShrine_${abilityId}_${interactiveIdCounter++}`;
      interaction.id = interactionId;
    }else if(obj.id){
      interaction.id = obj.id;
    }
    decor.interaction = interaction;
  }
  if(type === 'shopkeeper'){
    const baseWidth = obj.width !== undefined ? obj.width : 88;
    const baseHeight = obj.height !== undefined ? obj.height : 120;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    decor.width = width;
    decor.height = height;
    decor.tableWidth = (obj.tableWidth !== undefined ? obj.tableWidth : baseWidth * 1.2) * tileScale;
    decor.tableHeight = (obj.tableHeight !== undefined ? obj.tableHeight : Math.max(28, baseHeight * 0.32)) * tileScale;
    decor.tableColor = obj.tableColor || '#4e3621';
    if(obj.tableHighlight) decor.tableHighlight = obj.tableHighlight;
    if(obj.tableShadow) decor.tableShadow = obj.tableShadow;
    decor.robeColor = obj.robeColor || '#6b89c9';
    decor.accentColor = obj.accentColor || '#f2d7bb';
    decor.bottleColor = obj.bottleColor || '#6be36b';
    const interactionId = obj.id || `shopkeeper_${interactiveIdCounter++}`;
    decor.interaction = {
      type: 'shopkeeper',
      id: interactionId,
      vendorName: obj.name || obj.vendorName || 'Canopy Vendor',
      description: obj.description || obj.vendorDescription || null,
      x: decor.x,
      y: decor.baseY - height * 0.5,
      radius: (obj.radius !== undefined ? obj.radius : Math.max(80, baseWidth * 0.8)) * tileScale,
      height: (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale,
      promptOffsetY: (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.7) * tileScale,
      playerPromptOffsetY: (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale,
      promptAnchor: obj.promptAnchor || 'object',
      promptColor: obj.promptColor || '#9fb4f0'
    };
  }
  if(type === 'lever'){
    const baseWidth = obj.width !== undefined ? obj.width : 36;
    const baseHeight = obj.height !== undefined ? obj.height : 58;
    const width = baseWidth * tileScale;
    const height = baseHeight * tileScale;
    const facingRaw = (obj.facing || obj.face || 'right').toString().toLowerCase();
    const face = facingRaw === 'left' ? -1 : 1;
    const startState = obj.startState !== undefined ? !!obj.startState && obj.startState !== 'off' : true;
    const leverState = { active: startState, lastToggle: 0 };
    const baseThickness = (obj.baseThickness !== undefined ? obj.baseThickness : Math.max(12, baseHeight * 0.35)) * tileScale;
    const handleLength = (obj.handleLength !== undefined ? obj.handleLength : baseHeight * 0.7) * tileScale;
    const handleWidth = (obj.handleWidth !== undefined ? obj.handleWidth : Math.max(6, width * 0.22)) * tileScale;
    const pivotRadius = (obj.pivotRadius !== undefined ? obj.pivotRadius : Math.max(6, width * 0.22)) * tileScale;
    decor.width = width;
    decor.height = height;
    decor.face = face;
    decor.baseThickness = baseThickness;
    decor.handleLength = handleLength;
    decor.handleWidth = handleWidth;
    decor.pivotRadius = pivotRadius;
    decor.baseColor = obj.baseColor || '#4a3b2a';
    decor.handleColor = obj.handleColor || '#f2d18b';
    decor.highlightColor = obj.highlightColor || '#ffe9b0';
    decor.shadowColor = obj.shadowColor || 'rgba(0,0,0,0.45)';
    decor.leverState = leverState;
    const promptOffset = (obj.promptOffsetY !== undefined ? obj.promptOffsetY : baseHeight * 0.6) * tileScale;
    const playerPromptOffset = (obj.playerPromptOffsetY !== undefined ? obj.playerPromptOffsetY : 96) * tileScale;
    const interactionId = obj.id || `interactive_${interactiveIdCounter++}`;
    const targets = normalizeToggleIdList(obj.targets || obj.target || obj.targetId || obj.targetIds);
    const groups = normalizeToggleIdList(obj.groups || obj.groupId || obj.group);
    decor.interaction = {
      type: 'lever',
      id: interactionId,
      x: decor.x + (obj.interactOffsetX || 0) * tileScale,
      y: decor.baseY - height * 0.5 + (obj.interactOffsetY || 0) * tileScale,
      radius: (obj.radius !== undefined ? obj.radius : Math.max(70, baseWidth * 0.65)) * tileScale,
      height: (obj.interactionHeight !== undefined ? obj.interactionHeight : baseHeight) * tileScale,
      requireFacing: obj.requireFacing !== undefined ? !!obj.requireFacing : true,
      facing: face < 0 ? 'left' : 'right',
      promptOffsetY: promptOffset,
      playerPromptOffsetY: playerPromptOffset,
      promptAnchor: obj.promptAnchor || 'object',
      leverState,
      startState,
      targets,
      groups,
      cooldownMs: obj.cooldownMs !== undefined ? Math.max(0, obj.cooldownMs) : 220,
      mode: obj.mode || 'toggle'
    };
  }
  if(type === 'punchingBag'){
    const baseWidth = obj.width !== undefined ? obj.width : 48;
    const baseHeight = obj.height !== undefined ? obj.height : 120;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    decor.color = obj.color || '#d86f52';
    decor.edgeColor = obj.edgeColor || '#4a2d1f';
    decor.ropeColor = obj.ropeColor || 'rgba(218,207,178,0.9)';
    decor.defense = obj.defense ?? 0;
    decor.damageHistory = [];
    decor.totalDamage = 0;
    decor.lastDamage = 0;
    decor.swing = null;
  }
  if(type === 'waterSpout'){
    const width = (obj.width !== undefined ? obj.width : 52) * tileScale;
    const height = (obj.height !== undefined ? obj.height : 44) * tileScale;
    decor.width = width;
    decor.height = height;
    if(obj.casingColor) decor.casingColor = obj.casingColor;
    if(obj.trimColor) decor.trimColor = obj.trimColor;
    if(obj.shadowColor) decor.shadowColor = obj.shadowColor;
    if(obj.waterColor || obj.streamColor) decor.waterColor = obj.waterColor || obj.streamColor;
    if(obj.flowWidth !== undefined) decor.flowWidth = obj.flowWidth * tileScale;
    if(obj.flowHeight !== undefined) decor.flowHeight = obj.flowHeight * tileScale;
    if(obj.nozzleWidth !== undefined) decor.nozzleWidth = obj.nozzleWidth * tileScale;
    if(obj.nozzleHeight !== undefined) decor.nozzleHeight = obj.nozzleHeight * tileScale;
  }
  if(type === 'lavaSpout'){
    const width = (obj.width !== undefined ? obj.width : 52) * tileScale;
    const height = (obj.height !== undefined ? obj.height : 46) * tileScale;
    decor.width = width;
    decor.height = height;
    if(obj.casingColor) decor.casingColor = obj.casingColor;
    if(obj.trimColor) decor.trimColor = obj.trimColor;
    if(obj.shadowColor) decor.shadowColor = obj.shadowColor;
    if(obj.lavaColor || obj.streamColor) decor.lavaColor = obj.lavaColor || obj.streamColor;
    if(obj.glowColor) decor.glowColor = obj.glowColor;
    if(obj.flowWidth !== undefined) decor.flowWidth = obj.flowWidth * tileScale;
    if(obj.flowHeight !== undefined) decor.flowHeight = obj.flowHeight * tileScale;
    if(obj.nozzleWidth !== undefined) decor.nozzleWidth = obj.nozzleWidth * tileScale;
    if(obj.nozzleHeight !== undefined) decor.nozzleHeight = obj.nozzleHeight * tileScale;
  }
  if(type === 'sprout'){
    const baseHeight = obj.height !== undefined ? obj.height : 28;
    decor.height = baseHeight * tileScale;
  }
  if(type === 'tuft'){
    const baseWidth = obj.width !== undefined ? obj.width : 46;
    const baseHeight = obj.height !== undefined ? obj.height : 26;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
  }
  if(type === 'torch'){
    const baseWidth = obj.width !== undefined ? obj.width : 26;
    const baseHeight = obj.height !== undefined ? obj.height : 50;
    decor.width = baseWidth * tileScale;
    decor.height = baseHeight * tileScale;
    const mountRaw = (obj.mount || obj.anchor || 'floor').toString().toLowerCase();
    decor.mount = mountRaw === 'wall' ? 'wall' : 'floor';
    const facingRaw = (obj.facing || obj.face || 'right').toString().toLowerCase();
    decor.facing = facingRaw === 'left' ? -1 : 1;
    if(decor.mount === 'wall' && obj.offsetY === undefined){
      decor.baseY -= baseHeight * tileScale * 0.35;
    }
    decor.woodColor = obj.woodColor || '#7a5332';
    decor.metalColor = obj.metalColor || '#b3a288';
    decor.flameColor = obj.flameColor || '#ffb347';
    decor.emitInterval = obj.emitInterval !== undefined ? Math.max(0.06, obj.emitInterval) : 0.18;
    decor.emitIntensity = obj.emitIntensity !== undefined ? Math.max(0.2, obj.emitIntensity) : 1;
    decor.flammable = false;
    decor.emitTimer = Math.random() * decor.emitInterval;
    decor.flamePhase = Math.random() * TAU;
  }
  return decor;
}

function normalizeNpcDialogLines(raw){
  if(raw === null || raw === undefined) return [];
  if(Array.isArray(raw)){
    const lines = [];
    for(const entry of raw){
      if(entry === null || entry === undefined) continue;
      const str = String(entry).trim();
      if(str) lines.push(str);
    }
    return lines;
  }
  if(typeof raw === 'object'){
    if(Array.isArray(raw.lines)) return normalizeNpcDialogLines(raw.lines);
    if(typeof raw.text === 'string') return normalizeNpcDialogLines(raw.text);
  }
  const text = String(raw);
  if(!text) return [];
  return text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line.length);
}

function layoutObjectToNpc(obj, layout, tileSize, offsetX, groundY){
  if(!obj || obj.type !== 'npc') return null;
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const col = clamp(Math.round(obj.col ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(obj.row ?? rows - 1), 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + col * tileSize;
  const tileTop = groundY - (rows - row) * tileSize;
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  const centerX = tileLeft + tileSize * 0.5 + offsetXUnits;
  const baseY = tileTop + tileSize + offsetYUnits;
  const id = obj.id || `npc_${npcIdCounter++}`;
  const lines = normalizeNpcDialogLines(obj.lines ?? obj.dialog ?? obj.text ?? obj.speech);
  const talkRadiusRaw = obj.talkRadius ?? obj.radius;
  const talkRadius = Number.isFinite(talkRadiusRaw) ? Math.max(30, talkRadiusRaw * tileScale) : 150;
  const spawnOffsetRaw = obj.spawnOffsetY ?? obj.heightOffset ?? obj.yOffset;
  const spawnOffsetY = Number.isFinite(spawnOffsetRaw) ? spawnOffsetRaw * tileScale : -40;
  const facingRaw = (obj.facing || obj.face || '').toString().toLowerCase();
  const facing = facingRaw === 'left' ? 'left' : (facingRaw === 'right' ? 'right' : null);
  const hatOffset = obj.hatOffset !== undefined ? obj.hatOffset * tileScale : null;
  return {
    type: 'npc',
    id,
    name: obj.name || obj.label || null,
    x: centerX,
    baseY,
    offsetX: offsetXUnits,
    offsetY: offsetYUnits,
    talkRadius,
    spawnOffsetY,
    facing,
    hatOffset,
    lines,
    revealSpeed: Number.isFinite(obj.revealSpeed) ? obj.revealSpeed : undefined,
    holdDuration: Number.isFinite(obj.holdDuration) ? obj.holdDuration : (Number.isFinite(obj.lineDuration) ? obj.lineDuration : (Number.isFinite(obj.pause) ? obj.pause : undefined)),
    headColor: obj.headColor || obj.strokeColor || null,
    bandColor: obj.bandColor || null,
    brimColor: obj.brimColor || null,
    hatStrokeColor: obj.hatStrokeColor || null
  };
}

function layoutObjectToInteractive(obj, layout, tileSize, offsetX, groundY){
  const type = obj.type;
  if(!['platform', 'spikes', 'crumbleWall', 'toggleBlock', 'windLift', 'steamVent', 'chronoField', 'chronosphere', 'auricBeacon'].includes(type)) return null;
  const rows = layout.rows || 0;
  const cols = layout.cols || 0;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const col = clamp(Math.round(obj.col ?? obj.x ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(obj.row ?? obj.y ?? rows - 1), 0, Math.max(0, rows - 1));
  const tileLeft = offsetX + col * tileSize;
  const tileTop = groundY - (rows - row) * tileSize;
  const offsetXUnits = (obj.offsetX || 0) * tileScale;
  const offsetYUnits = (obj.offsetY || 0) * tileScale;
  const centerX = tileLeft + tileSize * 0.5 + offsetXUnits;
  const baseY = tileTop + tileSize + offsetYUnits;
  const id = obj.id || `interactive_${interactiveIdCounter++}`;
  if(type === 'platform'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : Math.max(6, tileSize * 0.18));
    return {
      type: 'platform',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height
    };
  }
  if(type === 'spikes'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : Math.max(12, tileSize * 0.5));
    return {
      type: 'spikes',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      damage: obj.damage ?? 24,
      knock: obj.knock ?? 1.1
    };
  }
  if(type === 'windLift'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : tileSize * 2.2);
    return {
      type: 'windLift',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      forceX: obj.forceX ?? 0,
      forceY: obj.forceY ?? -2400,
      coreColor: obj.coreColor,
      swirlColor: obj.swirlColor,
      pulseMs: obj.pulseMs ?? 1600
    };
  }
  if(type === 'steamVent'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : tileSize * 1.6);
    const cycleSec = Math.max(0, (obj.cycleMs ?? 2600) / 1000);
    const activeSec = Math.max(0, Math.min(cycleSec || 1, (obj.activeMs ?? 1200) / 1000));
    return {
      type: 'steamVent',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      damage: obj.damage ?? 16,
      knock: obj.knock ?? 1.2,
      pushX: obj.pushX ?? 0,
      pushY: obj.pushY ?? -2400,
      cycle: cycleSec,
      activeDuration: activeSec,
      baseColor: obj.baseColor,
      ventColor: obj.ventColor,
      time: 0,
      pulse: 0
    };
  }
  if(type === 'chronoField'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize * 1.4);
    const height = (obj.height !== undefined ? obj.height * tileScale : tileSize * 1.9);
    return {
      type: 'chronoField',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      slow: obj.slow ?? 0.4,
      drag: obj.drag ?? 6,
      floatForce: obj.floatForce ?? -640,
      shimmerColor: obj.shimmerColor,
      accentColor: obj.accentColor,
      phase: 0,
      pulse: 0
    };
  }
  if(type === 'chronosphere'){
    const baseRadius = (obj.radius !== undefined ? obj.radius * tileScale : 150 * tileScale);
    const radius = baseRadius * 2;
    const orbRadius = (obj.orbRadius !== undefined ? obj.orbRadius * tileScale : 15);
    const floatOffset = (obj.floatOffset !== undefined ? obj.floatOffset * tileScale : tileSize * 0.7);
    const floatAmplitude = (obj.floatAmplitude !== undefined ? obj.floatAmplitude * tileScale : tileSize * 0.35);
    return {
      type: 'chronosphere',
      id,
      centerX,
      centerY: baseY - floatOffset,
      radius,
      orbRadius,
      floatAmplitude,
      pulse: 0,
      phase: Math.random() * TAU,
      floatPhase: Math.random() * TAU,
      invertIdle: obj.invertIdle !== undefined ? !!obj.invertIdle : true,
      accentColor: obj.accentColor,
      glowColor: obj.glowColor,
      freezeExempt: obj.freezeExempt === true
    };
  }
  if(type === 'auricBeacon'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : tileSize);
    const radius = (obj.radius !== undefined ? obj.radius * tileScale : Math.max(width, height) * 0.9);
    const cycle = Math.max(0, (obj.cycleMs ?? 3800) / 1000);
    const pulse = Math.max(0.2, Math.min(cycle || 1, (obj.pulseMs ?? 900) / 1000));
    return {
      type: 'auricBeacon',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      centerX: centerX,
      centerY: baseY - height * 0.5,
      radius,
      damage: obj.damage ?? 36,
      knock: obj.knock ?? 1.4,
      force: obj.force ?? 2800,
      cycle,
      pulseDuration: pulse,
      flareColor: obj.flareColor,
      emberColor: obj.emberColor,
      time: 0,
      pulseStrength: 0,
      active: false
    };
  }
  if(type === 'crumbleWall'){
    const width = (obj.width !== undefined ? obj.width * tileScale : 30);
    const height = (obj.height !== undefined ? obj.height * tileScale : 30);
    const material = (obj.material || 'dirt').toString().toLowerCase();
    const defaults = CRUMBLE_WALL_MATERIAL_DEFAULTS[material] || CRUMBLE_WALL_MATERIAL_DEFAULTS.dirt;
    const health = obj.health ?? defaults.health ?? 240;
    const interactive = {
      type: 'crumbleWall',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      health,
      maxHealth: Number.isFinite(health) ? health : defaults.health,
      material,
      shake: 0,
      crumbleTimer: 0
    };
    if(defaults && defaults.unbreakable){
      interactive.unbreakable = true;
    }
    if(material === 'wood') interactive.requiredDamageKind = 'fire';
    else if(material === 'stone' || material === 'sandstone') interactive.requiredDamageKind = 'explosive';
    if(obj.requiredDamageKind) interactive.requiredDamageKind = obj.requiredDamageKind;
    if(obj.flammable !== undefined){
      interactive.flammable = !!obj.flammable;
    }else{
      interactive.flammable = material === 'wood';
    }
    return interactive;
  }
  if(type === 'toggleBlock'){
    const width = (obj.width !== undefined ? obj.width * tileScale : tileSize);
    const height = (obj.height !== undefined ? obj.height * tileScale : tileSize);
    const active = obj.active !== undefined ? !!obj.active : true;
    const interactive = {
      type: 'toggleBlock',
      id,
      x: centerX - width * 0.5,
      y: baseY - height,
      w: width,
      h: height,
      group: obj.group || obj.groupId || null,
      active,
      defaultActive: active,
      activeWhenOn: obj.activeWhenOn !== undefined ? !!obj.activeWhenOn : true,
      activeWhenOff: obj.activeWhenOff !== undefined ? !!obj.activeWhenOff : false,
      color: obj.color || null,
      shadeColor: obj.shadeColor || null,
      highlightColor: obj.highlightColor || null,
      backgroundColor: obj.backgroundColor || null,
      fadeColor: obj.fadeColor || null,
      visibility: active ? 1 : 0
    };
    if(obj.promptOffsetY !== undefined) interactive.promptOffsetY = obj.promptOffsetY * tileScale;
    if(obj.playerPromptOffsetY !== undefined) interactive.playerPromptOffsetY = obj.playerPromptOffsetY * tileScale;
    return interactive;
  }
  return null;
}

function layoutCameraZoneToWorld(zone, layout, tileSize, offsetX, groundY){
  if(!zone || !layout) return null;
  const rows = layout.rows || 0;
  const rawCol = Number(zone.col ?? zone.x ?? 0);
  const rawRow = Number(zone.row ?? zone.y ?? 0);
  const cols = layout.cols || 0;
  const col = clamp(rawCol, 0, Math.max(0, cols));
  const row = clamp(rawRow, 0, Math.max(0, rows));
  const widthTiles = Math.max(0, Number(zone.width ?? zone.cols ?? layout.cols ?? 0));
  const heightTiles = Math.max(0, Number(zone.height ?? zone.rows ?? rows));
  const left = offsetX + col * tileSize;
  const top = groundY - (rows - row) * tileSize;
  const width = widthTiles * tileSize;
  const height = heightTiles * tileSize;
  const id = zone.id || zone.name || `cameraZone_${cameraZoneIdCounter++}`;
  const rawType = zone.type || 'zone';
  const type = typeof rawType === 'string' ? rawType.toLowerCase() : 'zone';
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const focusX = left + width * 0.5 + (zone.focusOffsetX || 0) * tileScale;
  const focusY = top + height * 0.5 + (zone.focusOffsetY || 0) * tileScale;
  const enterPadding = (zone.enterPadding ?? 0) * tileSize;
  const exitPadding = (zone.exitPadding ?? 0) * tileSize;
  return {
    id,
    type,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    focusX,
    focusY,
    enterPadding,
    exitPadding
  };
}

function layoutEnemyToSpawn(enemy, layout, tileSize, offsetX){
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const col = clamp(Math.round(enemy.col ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(enemy.row ?? rows - 1), 0, Math.max(0, rows - 1));
  const offsetXWorld = (enemy.offsetX || 0) * tileScale;
  const offsetYWorld = (enemy.offsetY || 0) * tileScale;
  const centerX = offsetX + col * tileSize + tileSize * 0.5 + offsetXWorld;
  const { col: _c, row: _r, offsetX: _ox, offsetY: _oy, ...rest } = enemy;
  return {
    ...rest,
    kind: enemy.kind,
    x: centerX,
    offsetX: offsetXWorld,
    offsetY: offsetYWorld,
    layout: { col, row }
  };
}

function layoutWeaponToPickup(entry, layout, tileSize, offsetX, groundY){
  if(!entry) return null;
  const id = entry.id;
  if(!id) return null;
  const rows = layout?.rows || 0;
  const cols = layout?.cols || 0;
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const col = clamp(Math.round(entry.col ?? 0), 0, Math.max(0, cols - 1));
  const row = clamp(Math.round(entry.row ?? rows - 1), 0, Math.max(0, rows - 1));
  const left = offsetX + col * tileSize;
  const tileTop = groundY - (rows - row) * tileSize;
  const offsetXWorld = (entry.offsetX || 0) * tileScale;
  const offsetYWorld = (entry.offsetY || 0) * tileScale;
  const baseY = tileTop + tileSize + offsetYWorld;
  const centerX = left + tileSize * 0.5 + offsetXWorld;
  return {
    id,
    col,
    row,
    offsetX: offsetXWorld,
    offsetY: offsetYWorld,
    x: centerX,
    baseY,
    layout: { col, row }
  };
}

function layoutDoorOpenRow(layout, col, row){
  if(!layout || !Array.isArray(layout.cells)) return row;
  const rows = layout.rows || layout.cells.length || 0;
  if(rows <= 0) return row;
  const safeRow = clamp(Math.round(row ?? rows - 1), 0, Math.max(0, rows - 1));
  const safeCol = clamp(Math.round(col ?? 0), 0, Math.max(0, (layout.cols || (layout.cells[0]?.length ?? 1)) - 1));
  const cells = layout.cells;
  const isSolid = (r)=>!!(cells[r]?.[safeCol]);
  if(!isSolid(safeRow)) return safeRow;
  for(let r=safeRow-1; r>=0; r--){
    if(!isSolid(r)) return r;
  }
  return safeRow;
}

function layoutDoorToWorld(spec, layout, tileSize, offsetX, groundY){
  if(!spec || !layout) return null;
  const rows = layout.rows || 0;
  const cols = layout.cols || 0;
  const col = clamp(Math.round(spec.col ?? 0), 0, Math.max(0, cols - 1));
  const baseRow = clamp(Math.round(spec.row ?? rows - 1), 0, Math.max(0, rows - 1));
  const row = layoutDoorOpenRow(layout, col, baseRow);
  const tileScale = layout?.tileScale ?? (layout?.baseTileSize ? tileSize / layout.baseTileSize : 1);
  const centerX = offsetX + col * tileSize + tileSize * 0.5 + (spec.offsetX || 0) * tileScale;
  const tileTop = groundY - (rows - row) * tileSize;
  const baseY = tileTop + tileSize + (spec.offsetY || 0) * tileScale;
  const left = centerX - LEVEL_DOOR_WIDTH * 0.5;
  const top = baseY - LEVEL_DOOR_HEIGHT;
  return {
    col,
    row,
    offsetX: (spec.offsetX || 0) * tileScale,
    offsetY: (spec.offsetY || 0) * tileScale,
    x: left,
    y: top,
    w: LEVEL_DOOR_WIDTH,
    h: LEVEL_DOOR_HEIGHT,
    centerX,
    baseY,
    layout: { col, row }
  };
}

function refreshLayoutWeapons(world){
  if(!world) return;
  const state = world.levelState;
  if(!state) return;
  if(!Array.isArray(world.items)) world.items = [];
  const placements = Array.isArray(state.layoutWeapons) ? state.layoutWeapons.filter(Boolean) : [];
  if(placements.length === 0){
    world.items = world.items.filter(item=>!item.layoutSpawn);
    return;
  }
  world.items = world.items.filter(item=>!item.layoutSpawn);
  for(const placement of placements){
    const id = placement.id;
    if(!id || !WEAPONS[id] || WEAPONS[id].enemyOnly) continue;
    const x = placement.x ?? (world.width * 0.5);
    const baseY = placement.baseY ?? groundHeightAt(world, x, { surface: 'top' });
    const y = (placement.y !== undefined) ? placement.y : baseY - 30;
    world.items.push({ type: 'weapon', id, x, y, picked: false, layoutSpawn: true });
  }
}

function syncWorldDoorFromState(world){
  if(!world) return;
  const state = world.levelState;
  if(!state) return;
  if(!world.door){
    world.door = { x: 0, y: 0, w: LEVEL_DOOR_WIDTH, h: LEVEL_DOOR_HEIGHT, open: false, hidden: true, locked: false };
  }
  const door = world.door;
  const spec = state.exitDoor;
  door.w = spec?.w || LEVEL_DOOR_WIDTH;
  door.h = spec?.h || LEVEL_DOOR_HEIGHT;
  if(spec){
    door.x = spec.x;
    door.y = spec.y;
  }else{
    door.x = world.width - 80;
    const center = door.x + door.w * 0.5;
    const base = groundHeightAt(world, center, { surface: 'top' });
    door.y = base - door.h;
  }
  door.open = false;
  door.locked = !!(state.isFinalScreen && state.def?.doorLocked);
  if(door.locked){
    door.open = false;
  }
  if(state.def?.spawner){
    door.hidden = true;
    door.open = false;
  }else if(!state.isFinalScreen){
    door.hidden = !spec;
  }else{
    door.hidden = false;
  }
}

function buildSpawnerPoints(config, meta, world){
  const points = [];
  if(!config || !world) return points;
  const cols = meta?.cols || 0;
  const tileSize = meta?.tileSize || DEFAULT_LAYOUT_TILE_SIZE;
  const tileScale = meta?.tileScale ?? (meta?.baseTileSize ? tileSize / meta.baseTileSize : 1);
  const levelWidth = cols ? cols * tileSize : world.width;
  const offsetX = meta?.offsetX ?? Math.max(0, Math.floor((world.width - levelWidth) / 2));
  if(Array.isArray(config.points)){
    for(const entry of config.points){
      if(!entry) continue;
      if(entry.col !== undefined && cols){
        const col = clamp(Math.round(entry.col), 0, Math.max(0, cols - 1));
        const x = offsetX + col * tileSize + tileSize * 0.5 + (entry.offsetX || 0) * tileScale;
        points.push({ x });
      }else if(entry.x !== undefined){
        points.push({ x: entry.x + (entry.offsetX || 0) * tileScale });
      }
    }
  }
  if(points.length === 0){
    const fallback = offsetX + (levelWidth || world.width) * 0.65;
    points.push({ x: fallback });
  }
  return points.map(pt=>{
    const x = pt.x;
    const y = groundHeightAt(world, x, { surface: 'top' });
    return { x, y };
  });
}

function weightedChoice(entries){
  if(!Array.isArray(entries) || !entries.length) return null;
  let total = 0;
  for(const entry of entries){
    const weight = Math.max(0, entry?.weight ?? 1);
    total += weight;
  }
  if(total <= 0) return null;
  let r = Math.random() * total;
  for(const entry of entries){
    const weight = Math.max(0, entry?.weight ?? 1);
    r -= weight;
    if(r <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function resolveEnemyLevel(world){
  const state = world?.levelState;
  if(!state) return 1;
  const multiplier = Number.isFinite(state.def?.difficultyMultiplier)
    ? state.def.difficultyMultiplier
    : 1;
  return Math.max(0.1, multiplier);
}

function spawnEnemyFromSpawner(world, state, config){
  if(!world || !state || !config) return null;
  const entry = weightedChoice(config.kinds || []);
  if(!entry) return null;
  if(!Array.isArray(state.spawnerPoints) || !state.spawnerPoints.length){
    state.spawnerPoints = buildSpawnerPoints(config, state.layoutMeta, world);
  }
  if(!state.spawnerPoints.length) return null;
  const anchor = choice(state.spawnerPoints);
  const jitter = config.spawnJitter ?? 0;
  const baseX = anchor?.x ?? world.width * 0.6;
  const spawnX = baseX + (jitter ? rand(-jitter, jitter) : 0);
  const spec = { ...entry };
  if(spec.weight !== undefined) delete spec.weight;
  return spawnSingleEnemy(world, spec, spawnX);
}

function spawnConfiguredPickups(world){
  const state = world?.levelState;
  const def = state?.def;
  if(!def || !def.weaponPickups) return;
  let pickups = def.weaponPickups;
  if(pickups === 'all'){
    const list = typeof playerWeaponIds === 'function' ? playerWeaponIds() : Object.keys(WEAPONS);
    pickups = list.slice();
  }
  if(!Array.isArray(pickups) || !pickups.length) return;
  const meta = state.layoutMeta;
  const spacing = def.weaponPickupSpacing || 90;
  const jitter = def.weaponPickupJitter || 0;
  const tileSize = meta?.tileSize || DEFAULT_LAYOUT_TILE_SIZE;
  const cols = meta?.cols || 0;
  const levelWidth = cols ? cols * tileSize : world.width;
  const offsetX = meta?.offsetX ?? Math.max(0, Math.floor((world.width - levelWidth) / 2));
  const totalSpan = spacing * (pickups.length - 1);
  const minStart = offsetX + tileSize * 0.6;
  const maxStart = offsetX + Math.max(tileSize * 0.6, levelWidth - tileSize * 0.6 - totalSpan);
  const baseStart = offsetX + (levelWidth - totalSpan) * 0.5;
  const startX = clamp(baseStart, minStart, maxStart);
  for(let i=0;i<pickups.length;i++){
    const id = pickups[i];
    const weapon = WEAPONS[id];
    if(!weapon || weapon.enemyOnly) continue;
    const x = startX + spacing * i;
    const px = jitter ? x + rand(-jitter, jitter) : x;
    const ground = groundHeightAt(world, px, { surface: 'top' });
    world.items.push({ type: 'weapon', id, x: px, y: ground - 30, picked: false });
  }
}

function updateLevelSpawner(world, dt){
  const state = world?.levelState;
  const config = state?.def?.spawner;
  if(!config) return;
  if(!Array.isArray(state.spawnerPoints) || !state.spawnerPoints.length){
    state.spawnerPoints = buildSpawnerPoints(config, state.layoutMeta, world);
  }
  state.spawnerTimer = (state.spawnerTimer ?? config.interval ?? 5) - dt;
  let alive = world.sticks.filter(s=>s.isEnemy && !s.dead).length;
  const maxAlive = config.maxAlive ?? 5;
  const minAlive = config.minAlive ?? 0;
  while(alive < minAlive && alive < maxAlive){
    const spawned = spawnEnemyFromSpawner(world, state, config);
    if(!spawned) break;
    alive++;
  }
  if(alive >= maxAlive){
    state.spawnerTimer = Math.max(state.spawnerTimer, 0.2);
    return;
  }
  if(state.spawnerTimer <= 0){
    const spawned = spawnEnemyFromSpawner(world, state, config);
    state.spawnerTimer = config.interval ?? 5;
    if(spawned) alive++;
  }
}

