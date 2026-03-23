// util.js
const TAU = Math.PI*2;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const rand = (a,b)=>a+Math.random()*(b-a);
const choice = a => a[Math.floor(Math.random()*a.length)];
const nowMs = ()=>performance.now();

const COLOR_PRESERVING_ELEMENTS = new Set(['void','war']);

function normalizeElementKeyLoose(element){
  if(typeof normalizeElementKey === 'function'){
    return normalizeElementKey(element);
  }
  if(element === undefined || element === null) return null;
  const str = String(element).trim().toLowerCase();
  if(!str) return null;
  if(str === 'chrono') return 'chronometric';
  return str;
}

function shouldPreserveElementColor(element){
  const key = normalizeElementKeyLoose(element);
  if(!key) return false;
  return COLOR_PRESERVING_ELEMENTS.has(key);
}

function pushCanvasFilter(ctx, filter){
  if(!ctx || typeof filter !== 'string' || !filter || filter === 'none') return null;
  if(!('filter' in ctx)) return null;
  const prevRaw = ctx.filter;
  const prev = (typeof prevRaw === 'string' && prevRaw.length) ? prevRaw : 'none';
  const normalizedPrev = prev === 'none' ? '' : prev;
  if(normalizedPrev.includes(filter)) return null;
  const next = normalizedPrev ? `${normalizedPrev} ${filter}` : filter;
  ctx.filter = next;
  return ()=>{
    ctx.filter = prevRaw;
  };
}

function stripCanvasFilters(ctx, predicate){
  if(!ctx || typeof predicate !== 'function') return null;
  if(!('filter' in ctx)) return null;
  const prevRaw = ctx.filter;
  if(typeof prevRaw !== 'string') return null;
  const prev = prevRaw.trim();
  if(!prev || prev === 'none') return null;
  const tokens = prev.split(/\s+/).filter(Boolean);
  if(tokens.length === 0) return null;
  const remaining = tokens.filter(token=>!predicate(token));
  if(remaining.length === tokens.length) return null;
  ctx.filter = remaining.length ? remaining.join(' ') : 'none';
  return ()=>{
    ctx.filter = prevRaw;
  };
}

function distance(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }

const BREAKABLE_SPATIAL_CELL_SIZE = 180;
const BREAKABLE_QUERY_HORIZONTAL_PADDING = 160;
const BREAKABLE_QUERY_VERTICAL_PADDING = 960;

function formatNumberFixed(value, decimals=2){
  if(!Number.isFinite(value)) return '0';
  let str = Number(value).toFixed(decimals);
  if(str.indexOf('.') >= 0){
    str = str.replace(/0+$/g, '').replace(/\.$/, '');
  }
  if(str === '-0') str = '0';
  return str;
}

function parseLevelParticleSpec(entry, options={}){
  if(entry === undefined || entry === null) return null;
  const defaultType = options.defaultType ?? null;
  const cellSize = Number.isFinite(options.cellSize) ? options.cellSize : null;
  const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : 0;
  const columnForX = typeof options.columnForX === 'function' ? options.columnForX : null;
  const rowForY = typeof options.rowForY === 'function' ? options.rowForY : null;
  let col = null;
  let row = null;
  let type = defaultType;
  let x = null;
  let y = null;
  if(typeof entry === 'string'){
    let coords = entry;
    let coordPart = null;
    const atIdx = entry.indexOf('@');
    if(atIdx >= 0){
      coordPart = entry.slice(atIdx + 1);
      coords = entry.slice(0, atIdx);
    }
    const colonIdx = coords.indexOf(':');
    if(colonIdx >= 0){
      const prefix = coords.slice(0, colonIdx);
      if(prefix) type = prefix;
      coords = coords.slice(colonIdx + 1);
    }
    const parts = coords.split(',');
    if(parts.length >= 2){
      col = Number(parts[0]);
      row = Number(parts[1]);
    }
    if(coordPart){
      const coordPieces = coordPart.split(',');
      if(coordPieces.length >= 2){
        const parsedX = Number(coordPieces[0]);
        const parsedY = Number(coordPieces[1]);
        if(Number.isFinite(parsedX)) x = parsedX;
        if(Number.isFinite(parsedY)) y = parsedY;
      }
    }
  }else if(Array.isArray(entry)){
    if(entry.length >= 1) col = Number.isFinite(entry[0]) ? Math.round(entry[0]) : Number(entry[0]);
    if(entry.length >= 2) row = Number.isFinite(entry[1]) ? Math.round(entry[1]) : Number(entry[1]);
    if(entry.length >= 3 && entry[2] !== undefined && entry[2] !== null && entry[2] !== '') type = entry[2];
    if(entry.length >= 4 && Number.isFinite(entry[3])) x = entry[3];
    if(entry.length >= 5 && Number.isFinite(entry[4])) y = entry[4];
  }else if(typeof entry === 'object'){
    if(Number.isFinite(entry.col)) col = Math.round(entry.col);
    if(Number.isFinite(entry.row)) row = Math.round(entry.row);
    if(col === null && Number.isFinite(entry.x)){
      col = columnForX ? columnForX(entry.x) : (cellSize ? Math.floor((entry.x - offsetX) / cellSize) : null);
    }
    if(row === null && Number.isFinite(entry.y)){
      row = rowForY ? rowForY(entry.y) : (cellSize ? Math.floor(entry.y / cellSize) : null);
    }
    if(entry.type !== undefined && entry.type !== null && entry.type !== '') type = entry.type;
    if(Number.isFinite(entry.x)) x = entry.x;
    if(Number.isFinite(entry.y)) y = entry.y;
  }else{
    return null;
  }
  if(!Number.isInteger(col) || !Number.isInteger(row)) return null;
  if(x === null && Number.isFinite(cellSize)){
    x = offsetX + col * cellSize + cellSize * 0.5;
  }
  if(y === null && Number.isFinite(cellSize)){
    y = (row + 0.5) * cellSize;
  }
  return { col, row, type, x, y };
}

function stringifyLevelParticleSpec(entry, options={}){
  if(!entry) return null;
  const defaultType = options.defaultType ?? null;
  const cellSize = Number.isFinite(options.cellSize) ? options.cellSize : null;
  const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : 0;
  const decimals = Number.isFinite(options.decimals) ? options.decimals : 2;
  const epsilon = options.epsilon !== undefined ? Math.max(0, options.epsilon) : 1e-3;
  const col = Number.isFinite(entry.col) ? Math.round(entry.col) : null;
  const row = Number.isFinite(entry.row) ? Math.round(entry.row) : null;
  if(!Number.isInteger(col) || !Number.isInteger(row)) return null;
  const resolvedType = entry.type !== undefined && entry.type !== null && entry.type !== ''
    ? entry.type
    : defaultType;
  const prefix = resolvedType && resolvedType !== defaultType ? `${resolvedType}:` : '';
  const base = `${prefix}${col},${row}`;
  const centerX = Number.isFinite(cellSize) ? offsetX + col * cellSize + cellSize * 0.5 : null;
  const centerY = Number.isFinite(cellSize) ? (row + 0.5) * cellSize : null;
  const x = Number.isFinite(entry.x) ? entry.x : centerX;
  const y = Number.isFinite(entry.y) ? entry.y : centerY;
  if(!Number.isFinite(x) || !Number.isFinite(y)) return base;
  if(centerX !== null && centerY !== null){
    if(Math.abs(x - centerX) <= epsilon && Math.abs(y - centerY) <= epsilon){
      return base;
    }
  }
  const formatter = typeof options.formatCoord === 'function'
    ? options.formatCoord
    : (value)=>formatNumberFixed(value, decimals);
  return `${base}@${formatter(x)},${formatter(y)}`;
}

function terrainSolidInBox(world, left, right, top, bottom, options={}){
  if(!world) return false;
  const grid = world.terrainCells;
  const allowTerrainCells = world.blockCollisionEnabled !== false;
  const epsilon = 1e-4;
  if(allowTerrainCells && grid && Array.isArray(grid.cells) && grid.cells.length){
    const tileSize = grid.tileSize || DEFAULT_LAYOUT_TILE_SIZE || 30;
    const offsetX = grid.offsetX || 0;
    const rows = grid.rows || grid.cells.length;
    const cols = grid.cols || (grid.cells[0] ? grid.cells[0].length : 0);
    const referenceY = Number.isFinite(world.groundY)
      ? world.groundY
      : (Number.isFinite(world.height) ? world.height : rows * tileSize);
    const convertRow = (y)=>{
      const distance = referenceY - y;
      const steps = distance / tileSize;
      const row = rows - Math.ceil(steps);
      if(row < 0) return -1;
      if(row >= rows) return rows;
      return row;
    };
    const startColRaw = Math.floor((left - offsetX) / tileSize);
    const endColRaw = Math.floor(((right - epsilon) - offsetX) / tileSize);
    const minCol = Math.max(0, Math.min(startColRaw, endColRaw));
    const maxCol = Math.min(cols - 1, Math.max(startColRaw, endColRaw));
    const topRowRaw = convertRow(top + epsilon);
    const bottomRowRaw = convertRow(bottom - epsilon);
    const minRow = Math.max(0, Math.min(topRowRaw, bottomRowRaw));
    const maxRow = Math.min(rows - 1, Math.max(topRowRaw, bottomRowRaw));
    for(let row=minRow; row<=maxRow; row++){
      if(options.ignoreGroundRow && row >= rows - 1) continue;
      const rowCells = grid.cells[row];
      if(!rowCells) continue;
      const tileTop = referenceY - (rows - row) * tileSize;
      const tileBottom = tileTop + tileSize;
      if(tileBottom <= top || tileTop >= bottom) continue;
      for(let col=minCol; col<=maxCol; col++){
        if(col < 0 || col >= cols) continue;
        if(!rowCells[col]) continue;
        const tileLeft = offsetX + col * tileSize;
        const tileRight = tileLeft + tileSize;
        if(tileRight <= left || tileLeft >= right) continue;
        return true;
      }
    }
    if(!options.ignoreGroundRow && Number.isFinite(referenceY)){
      if(bottom >= referenceY - epsilon) return true;
    }
    return false;
  }
  const sampleX = (left + right) * 0.5;
  const sampleOptions = options.ignoreSand ? { ignoreSand: true } : {};
  sampleOptions.surface = 'top';
  const ground = groundHeightAt(world, sampleX, sampleOptions);
  return bottom >= ground - 0.5;
}

function markBreakablesIndexDirty(world){
  if(!world) return;
  world._breakableSpatialIndex = null;
  world._breakableSpatialFrame = null;
  world._breakableSpatialCount = null;
}

function ensureBreakableSpatialIndex(world){
  if(!world) return null;
  const frameId = Number.isFinite(world._frameCounter) ? world._frameCounter : 0;
  const breakables = Array.isArray(world.breakables) ? world.breakables : [];
  const count = breakables.length;
  if(world._breakableSpatialIndex
    && world._breakableSpatialFrame === frameId
    && world._breakableSpatialCount === count){
    return world._breakableSpatialIndex;
  }
  const cellSizeRaw = Number.isFinite(world.breakableSpatialCellSize)
    ? world.breakableSpatialCellSize
    : BREAKABLE_SPATIAL_CELL_SIZE;
  const cellSize = Math.max(24, cellSizeRaw);
  const grid = new Map();
  for(const wall of breakables){
    if(!wall || wall.broken || wall.remove) continue;
    const width = wall.w ?? wall.width ?? 0;
    const height = wall.h ?? wall.height ?? 0;
    if(!(width > 0 && height > 0)) continue;
    const left = wall.x ?? wall.left ?? 0;
    const top = wall.y ?? wall.top ?? 0;
    const right = left + width;
    const bottom = top + height;
    const minCx = Math.floor(left / cellSize);
    const maxCx = Math.floor(right / cellSize);
    const minCy = Math.floor(top / cellSize);
    const maxCy = Math.floor(bottom / cellSize);
    for(let cy=minCy; cy<=maxCy; cy++){
      for(let cx=minCx; cx<=maxCx; cx++){
        const key = `${cx},${cy}`;
        let bucket = grid.get(key);
        if(!bucket){
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(wall);
      }
    }
  }
  const index = { grid, cellSize };
  world._breakableSpatialIndex = index;
  world._breakableSpatialFrame = frameId;
  world._breakableSpatialCount = count;
  return index;
}

function queryBreakablesInRegion(world, left, top, right, bottom){
  if(!world) return [];
  const minX = Math.min(left, right);
  const maxX = Math.max(left, right);
  const minY = Math.min(top, bottom);
  const maxY = Math.max(top, bottom);
  const index = ensureBreakableSpatialIndex(world);
  const breakables = Array.isArray(world.breakables) ? world.breakables : [];
  if(!index || !(index.grid instanceof Map) || index.grid.size === 0){
    const fallback = [];
    for(const wall of breakables){
      if(!wall || wall.broken || wall.remove) continue;
      const width = wall.w ?? wall.width ?? 0;
      const height = wall.h ?? wall.height ?? 0;
      if(!(width > 0 && height > 0)) continue;
      const baseLeft = wall.x ?? wall.left ?? 0;
      const baseTop = wall.y ?? wall.top ?? 0;
      const baseRight = baseLeft + width;
      const baseBottom = baseTop + height;
      if(baseRight < minX || baseLeft > maxX || baseBottom < minY || baseTop > maxY) continue;
      fallback.push(wall);
    }
    return fallback;
  }
  const cellSize = index.cellSize;
  const minCx = Math.floor(minX / cellSize);
  const maxCx = Math.floor(maxX / cellSize);
  const minCy = Math.floor(minY / cellSize);
  const maxCy = Math.floor(maxY / cellSize);
  const seen = new Set();
  const hits = [];
  for(let cy=minCy; cy<=maxCy; cy++){
    for(let cx=minCx; cx<=maxCx; cx++){
      const bucket = index.grid.get(`${cx},${cy}`);
      if(!bucket || !bucket.length) continue;
      for(const wall of bucket){
        if(!wall || wall.broken || wall.remove) continue;
        if(seen.has(wall)) continue;
        const width = wall.w ?? wall.width ?? 0;
        const height = wall.h ?? wall.height ?? 0;
        if(!(width > 0 && height > 0)) continue;
        const baseLeft = wall.x ?? wall.left ?? 0;
        const baseTop = wall.y ?? wall.top ?? 0;
        const baseRight = baseLeft + width;
        const baseBottom = baseTop + height;
        if(baseRight < minX || baseLeft > maxX || baseBottom < minY || baseTop > maxY) continue;
        seen.add(wall);
        hits.push(wall);
      }
    }
  }
  return hits;
}
