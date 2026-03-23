// physics.js

const GRAVITY = 2000;
const AIR_DRAG_PER_SEC = 3.6;
const GROUND_FRICTION_PER_SEC = 18;
const BLOCKLESS_GROUND_FRICTION_PER_SEC = 36; // Additional friction for blockless test arenas.
const CEILING_FRICTION_PER_SEC = 64;
const CEILING_SLIDE_DAMP = 0.18; // Additional tangential damping for ceiling collisions.
const GROUND_BOUNCE = 0.02;
const REST_SPEED_EPSILON = 1e-2;
const TERRAIN_COLLISION_RADIUS = 6;
const TERRAIN_TILE_PADDING = 0;

class Point{
  constructor(x,y){
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.mass = 1;
    this.dragged = false;
    this.owner = null;
    this.grounded = false;
    this.preGroundContact = false;
    this.groundFriction = GROUND_FRICTION_PER_SEC;
    this.airDragMultiplier = 1;
    this.groundFrictionMultiplier = 1;
    this.poseTargetX = x;
    this.poseTargetY = y;
    this.terrainRadius = TERRAIN_COLLISION_RADIUS;
    this.platformId = null;
    this.gravityScale = 1;
    this.lastWallDir = 0;
  }
  updatePoseTarget(targetX, targetY, follow=1){
    if(follow <= 0) return;
    const amount = follow >= 1 ? 1 : follow;
    this.poseTargetX += (targetX - this.poseTargetX) * amount;
    this.poseTargetY += (targetY - this.poseTargetY) * amount;
  }
  settlePose(weight=1){
    if(weight <= 0) return;
    const amount = weight >= 1 ? 1 : weight;
    const nextX = this.x + (this.poseTargetX - this.x) * amount;
    const nextY = this.y + (this.poseTargetY - this.y) * amount;
    const dx = nextX - this.x;
    const dy = nextY - this.y;
    if(dx === 0 && dy === 0) return;
    this.x = nextX;
    this.y = nextY;
    this.prevX += dx;
    this.prevY += dy;
  }
  beginStep(){
    this.prevX = this.x;
    this.prevY = this.y;
    this.grounded = false;
    this.preGroundContact = false;
    this.platformId = null;
  }
  addForce(fx, fy){
    if(this.dragged) return;
    const mass = Number.isFinite(this.mass) ? this.mass : 1;
    if(mass === 0) return;
    const invMass = 1 / mass;
    if(Number.isFinite(fx)) this.ax += fx * invMass;
    if(Number.isFinite(fy)) this.ay += fy * invMass;
  }
  integrate(dt){
    const stepDt = Math.max(0, dt || 0);
    if(this.dragged || !Number.isFinite(stepDt) || stepDt === 0){
      this.ax = 0;
      this.ay = 0;
      if(this.dragged){
        this.vx = 0;
        this.vy = 0;
      }
      return;
    }
    const mass = Number.isFinite(this.mass) ? this.mass : 1;
    if(mass === 0){
      this.ax = 0;
      this.ay = 0;
      return;
    }
    const dragMultiplier = Number.isFinite(this.airDragMultiplier)
      ? Math.max(0, this.airDragMultiplier)
      : 1;
    const drag = Math.exp(-AIR_DRAG_PER_SEC * dragMultiplier * stepDt);
    const oldX = this.x;
    const oldY = this.y;
    let vx = Number.isFinite(this.vx) ? this.vx : 0;
    let vy = Number.isFinite(this.vy) ? this.vy : 0;
    vx = (vx + this.ax * stepDt) * drag;
    vy = (vy + this.ay * stepDt) * drag;
    this.x += vx * stepDt;
    this.y += vy * stepDt;
    this.prevX = oldX;
    this.prevY = oldY;
    this.vx = vx;
    this.vy = vy;
    this.ax = 0;
    this.ay = 0;
  }
  finishStep(dt){
    const stepDt = Math.max(0, dt || 0);
    if(stepDt > 0){
      const invDt = 1 / stepDt;
      this.vx = (this.x - this.prevX) * invDt;
      this.vy = (this.y - this.prevY) * invDt;
      if(this.grounded){
        if(this.vy > 0) this.vy = 0;
        const frictionMultiplier = Number.isFinite(this.groundFrictionMultiplier)
          ? Math.max(0, this.groundFrictionMultiplier)
          : 1;
        const baseFriction = Number.isFinite(this.groundFriction)
          ? this.groundFriction
          : GROUND_FRICTION_PER_SEC;
        const friction = baseFriction * frictionMultiplier;
        const decay = Math.exp(-Math.max(0, friction) * stepDt);
        this.vx *= decay;
      }
    }else{
      this.vx = 0;
      this.vy = 0;
    }
    this.prevX = this.x;
    this.prevY = this.y;
    this.poseTargetX = this.x;
    this.poseTargetY = this.y;
    this.ax = 0;
    this.ay = 0;
  }
  teleport(x,y){
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.ay = 0;
    this.grounded = false;
    this.preGroundContact = false;
    this.poseTargetX = x;
    this.poseTargetY = y;
    this.lastWallDir = 0;
  }
}

class Dist{
  constructor(a,b,rest,stiff=1.0, options=null){
    this.a = a;
    this.b = b;
    this.r = rest;
    this.s = stiff;
    this.options = options || null;
  }
  weightFor(point){
    if(!point) return 0;
    if(point.dragged) return 0;
    return 1;
  }
  satisfy(){
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const base = ((dist - this.r) / dist) * this.s;
    const weightA = this.weightFor(this.a);
    const weightB = this.weightFor(this.b);
    const total = weightA + weightB;
    if(total <= 0) return;
    const scale = base / total;
    if(weightA > 0){
      this.a.x += dx * scale * weightA;
      this.a.y += dy * scale * weightA;
    }
    if(weightB > 0){
      this.b.x -= dx * scale * weightB;
      this.b.y -= dy * scale * weightB;
    }
  }
}

function constraintAllowsReversePull(constraint){
  if(!constraint) return false;
  try{
    if(typeof constraint.allowReversePull === 'function' && constraint.allowReversePull(constraint)){
      return true;
    }
  }catch(err){/* noop */}
  const opts = constraint.options || null;
  if(opts){
    if(typeof opts.allowReversePull === 'function'){
      try{
        if(opts.allowReversePull(constraint)) return true;
      }catch(err){/* noop */}
    }else if(opts.allowReversePull){
      return true;
    }
    const optOwner = opts.limbPullOwner || opts.owner || null;
    if(optOwner && typeof optOwner.allowsLimbPull === 'function'){
      try{
        if(optOwner.allowsLimbPull(constraint)) return true;
      }catch(err){/* noop */}
    }
  }
  let owner = null;
  if(constraint.limbPullOwner) owner = constraint.limbPullOwner;
  if(!owner && constraint.a && constraint.a.owner) owner = constraint.a.owner;
  if(!owner && constraint.b && constraint.b.owner) owner = constraint.b.owner;
  if(owner && typeof owner.allowsLimbPull === 'function'){
    try{
      if(owner.allowsLimbPull(constraint)) return true;
    }catch(err){/* noop */}
  }
  return false;
}

class OneWayDist extends Dist{
  constructor(a,b,rest,stiff=1.0, options=null){
    super(a,b,rest,stiff,options);
  }
  _allowsReversePull(){
    return constraintAllowsReversePull(this);
  }
  satisfy(){
    if(this._allowsReversePull()){
      return super.satisfy();
    }
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const diff = ((dist - this.r) / dist) * this.s;
    const weightB = this.weightFor(this.b);
    if(weightB <= 0) return;
    this.b.x -= dx * diff * weightB;
    this.b.y -= dy * diff * weightB;
  }
}

class ElasticDist extends Dist{
  constructor(a,b,rest,stiff=1.0, options=null){
    super(a,b,rest,stiff,options);
    const opts = (options && typeof options === 'object') ? options : {};
    const elasticity = Number.isFinite(opts.elasticity) ? Math.max(0, opts.elasticity) : 0.4;
    const damping = Number.isFinite(opts.damping) ? Math.max(0, opts.damping) : 0.18;
    const ratio = Number.isFinite(opts.maxCorrectionRatio) ? Math.max(0, opts.maxCorrectionRatio) : null;
    const absolute = Number.isFinite(opts.maxCorrection) ? Math.max(0, opts.maxCorrection) : null;
    this.elasticity = elasticity;
    this.damping = damping;
    if(absolute !== null){
      this.maxCorrection = absolute;
    }else if(ratio !== null){
      this.maxCorrection = this.r * ratio;
    }else{
      this.maxCorrection = this.r * 0.5;
    }
  }
  satisfy(){
    const weightA = this.weightFor(this.a);
    const weightB = this.weightFor(this.b);
    const total = weightA + weightB;
    if(total <= 0) return;
    super.satisfy();
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const stretch = dist - this.r;
    if(!Number.isFinite(stretch) || Math.abs(stretch) <= 1e-4) return;
    const inv = 1 / dist;
    const dirX = dx * inv;
    const dirY = dy * inv;
    const elasticity = this.elasticity;
    if(elasticity > 0){
      let correction = stretch * elasticity;
      const limit = this.maxCorrection;
      if(Number.isFinite(limit) && limit >= 0){
        if(correction > limit) correction = limit;
        else if(correction < -limit) correction = -limit;
      }
      const scale = correction / total;
      if(weightA > 0){
        this.a.x += dirX * scale * weightA;
        this.a.y += dirY * scale * weightA;
      }
      if(weightB > 0){
        this.b.x -= dirX * scale * weightB;
        this.b.y -= dirY * scale * weightB;
      }
    }
    const damping = this.damping;
    if(damping > 0){
      const velAX = this.a.x - this.a.prevX;
      const velAY = this.a.y - this.a.prevY;
      const velBX = this.b.x - this.b.prevX;
      const velBY = this.b.y - this.b.prevY;
      const relative = (velBX - velAX) * dirX + (velBY - velAY) * dirY;
      if(Math.abs(relative) > 1e-4){
        const impulse = relative * damping / total;
        if(weightA > 0){
          this.a.prevX += dirX * impulse * weightA;
          this.a.prevY += dirY * impulse * weightA;
        }
        if(weightB > 0){
          this.b.prevX -= dirX * impulse * weightB;
          this.b.prevY -= dirY * impulse * weightB;
        }
      }
    }
  }
}

class OneWayElasticDist extends ElasticDist{
  constructor(a,b,rest,stiff=1.0, options=null){
    super(a,b,rest,stiff,options);
  }
  _allowsReversePull(){
    return constraintAllowsReversePull(this);
  }
  satisfy(){
    if(this._allowsReversePull()){
      return super.satisfy();
    }
    const weightB = this.weightFor(this.b);
    if(weightB <= 0) return;
    const rawDx = this.b.x - this.a.x;
    const rawDy = this.b.y - this.a.y;
    const rawDist = Math.hypot(rawDx, rawDy) || 1e-6;
    const base = ((rawDist - this.r) / rawDist) * this.s;
    if(weightB > 0){
      this.b.x -= rawDx * base * weightB;
      this.b.y -= rawDy * base * weightB;
    }
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const stretch = dist - this.r;
    if(!Number.isFinite(stretch) || Math.abs(stretch) <= 1e-4) return;
    const inv = 1 / dist;
    const dirX = dx * inv;
    const dirY = dy * inv;
    const elasticity = this.elasticity;
    if(elasticity > 0 && weightB > 0){
      let correction = stretch * elasticity;
      const limit = this.maxCorrection;
      if(Number.isFinite(limit) && limit >= 0){
        if(correction > limit) correction = limit;
        else if(correction < -limit) correction = -limit;
      }
      this.b.x -= dirX * correction * weightB;
      this.b.y -= dirY * correction * weightB;
    }
    const damping = this.damping;
    if(damping > 0 && weightB > 0){
      const velAX = this.a.x - this.a.prevX;
      const velAY = this.a.y - this.a.prevY;
      const velBX = this.b.x - this.b.prevX;
      const velBY = this.b.y - this.b.prevY;
      const relative = (velBX - velAX) * dirX + (velBY - velAY) * dirY;
      if(Math.abs(relative) > 1e-4){
        const impulse = relative * damping;
        this.b.prevX -= dirX * impulse * weightB;
        this.b.prevY -= dirY * impulse * weightB;
      }
    }
  }
}

function terrainTiles(world){
  if(!world) return [];
  if(world.blockCollisionEnabled === false) return [];
  return Array.isArray(world.terrain) ? world.terrain : [];
}

function groundHeightAt(world, x, options){
  if(!world) return 0;
  const opts = (options && typeof options === 'object') ? options : {};
  const surfaceModeRaw = typeof opts.surface === 'string'
    ? opts.surface
    : (typeof opts.sample === 'string' ? opts.sample : (typeof opts.mode === 'string' ? opts.mode : null));
  const surfaceMode = surfaceModeRaw ? surfaceModeRaw.toLowerCase() : 'top';
  const preferBottom = surfaceMode === 'bottom' || surfaceMode === 'floor' || surfaceMode === 'ground';
  const preferHigherSurface = surfaceMode === 'top' || surfaceMode === 'ceiling' || surfaceMode === 'upper';
  const resolveCandidate = (topValue, bottomValue)=>{
    const bottom = bottomValue !== undefined && bottomValue !== null ? bottomValue : topValue;
    return preferBottom ? bottom : topValue;
  };
  const fallbackGround = Number.isFinite(world.groundY) ? world.groundY : 0;
  let height = preferHigherSurface ? -Infinity : Infinity;
  const allowTerrainCells = world.blockCollisionEnabled !== false;
  const grid = allowTerrainCells ? world.terrainCells : null;
  const tiles = terrainTiles(world);
  const referenceY = Number.isFinite(opts.referenceY) ? opts.referenceY : null;
  const referencePadding = Number.isFinite(opts.referencePadding) ? opts.referencePadding : 0;
  const velocityY = Number.isFinite(opts.velocityY) ? opts.velocityY : null;
  const maxStepUp = Number.isFinite(opts.maxStepUp) ? Math.max(0, opts.maxStepUp) : null;
  // Clamp candidates that would require stepping up taller ledges than the feet
  // are allowed to climb in a single frame. This prevents side contacts with
  // blocks from instantly reprojecting the stick high into the air.
  let gridSurfaceFound = false;
  const considerHeight = (topCandidate, bottomCandidate, source)=>{
    const candidate = resolveCandidate(topCandidate, bottomCandidate);
    if(candidate === null || candidate === undefined) return;
    if(referenceY !== null){
      const paddingRaw = Number.isFinite(referencePadding) ? referencePadding : 0;
      const padding = Math.max(0, paddingRaw);
      const tolerance = Math.max(0.75, Math.abs(paddingRaw) * 0.35);
      if(maxStepUp !== null){
        const climb = referenceY - candidate;
        const allowance = maxStepUp + tolerance;
        if(climb > allowance){
          return;
        }
      }
      const belowSurface = referenceY > candidate + padding + tolerance;
      const falling = velocityY !== null && velocityY > 1e-4;
      if(belowSurface && !falling){
        return;
      }
    }
    if(!Number.isFinite(candidate)) return;
    let used = false;
    if(preferHigherSurface){
      if(candidate > height){
        height = candidate;
        used = true;
      }
    }else if(candidate < height){
      height = candidate;
      used = true;
    }
    if(used && source === 'grid') gridSurfaceFound = true;
  };
  if(allowTerrainCells && grid && Array.isArray(grid.cells) && grid.cells.length){
    const tileSize = grid.tileSize || DEFAULT_LAYOUT_TILE_SIZE || 30;
    const offsetX = grid.offsetX || 0;
    const rows = grid.rows || grid.cells.length;
    const cols = grid.cols || (grid.cells[0] ? grid.cells[0].length : 0);
    if(tileSize > 0 && rows > 0 && cols > 0){
      const baseGround = Number.isFinite(world.groundY)
        ? world.groundY
        : rows * tileSize;
      const epsilon = 1e-4;
      const rawCol = Math.floor((x - offsetX) / tileSize);
      const candidateCols = [];
      const pushCol = (colIndex)=>{
        if(colIndex < 0 || colIndex >= cols) return;
        if(candidateCols.includes(colIndex)) return;
        const tileLeft = offsetX + colIndex * tileSize;
        const tileRight = tileLeft + tileSize;
        if(x >= tileLeft - epsilon && x <= tileRight + epsilon){
          candidateCols.push(colIndex);
        }
      };
      pushCol(rawCol);
      pushCol(rawCol - 1);
      pushCol(rawCol + 1);
      if(!candidateCols.length){
        const clampCol = Math.max(0, Math.min(cols - 1, rawCol));
        const tileLeft = offsetX + clampCol * tileSize;
        const tileRight = tileLeft + tileSize;
        if(x >= tileLeft - epsilon && x <= tileRight + epsilon){
          candidateCols.push(clampCol);
        }
      }
      for(const colIndex of candidateCols){
        for(let row=0; row<rows; row++){
          const rowCells = grid.cells[row];
          if(!rowCells || !rowCells[colIndex]) continue;
          const top = baseGround - (rows - row) * tileSize;
          const surfaceBottom = top + tileSize;
          considerHeight(top, surfaceBottom, 'grid');
          break;
        }
      }
    }
  }
  const padding = Number.isFinite(TERRAIN_TILE_PADDING) ? TERRAIN_TILE_PADDING : 0;
  const includeRectTop = (rect)=>{
    if(!rect) return;
    const width = rect.w ?? rect.width ?? (rect.right !== undefined && rect.left !== undefined ? rect.right - rect.left : 0);
    const height = rect.h ?? rect.height ?? (rect.bottom !== undefined && rect.top !== undefined ? rect.bottom - rect.top : 0);
    if(!(width > 0 && height > 0)) return;
    const baseLeft = rect.x ?? rect.left ?? 0;
    const baseTop = rect.y ?? rect.top ?? 0;
    const rectLeft = baseLeft - padding;
    const rectRight = rectLeft + width + padding * 2;
    if(x < rectLeft || x > rectRight) return;
    const baseBottomRaw = rect.bottom ?? ((rect.y ?? baseTop) + height);
    const baseBottom = baseBottomRaw ?? (baseTop + height);
    const rectTop = baseTop;
    const rectBottom = baseBottom + padding;
    if(referenceY !== null && rectBottom < referenceY - referencePadding) return;
    considerHeight(rectTop, baseBottom);
  };
  if(!gridSurfaceFound){
    for(const tile of tiles){
      includeRectTop(tile);
    }
  }
  const horizontalPad = Number.isFinite(BREAKABLE_QUERY_HORIZONTAL_PADDING)
    ? BREAKABLE_QUERY_HORIZONTAL_PADDING
    : 160;
  const verticalPad = Number.isFinite(BREAKABLE_QUERY_VERTICAL_PADDING)
    ? BREAKABLE_QUERY_VERTICAL_PADDING
    : 960;
  const sampleBaseline = referenceY !== null
    ? referenceY
    : Number.isFinite(world.groundY)
      ? world.groundY
      : 0;
  const queryTop = sampleBaseline - verticalPad;
  const queryBottom = sampleBaseline + verticalPad;
  const breakables = typeof queryBreakablesInRegion === 'function'
    ? queryBreakablesInRegion(world, x - horizontalPad, queryTop, x + horizontalPad, queryBottom)
    : (Array.isArray(world.breakables) ? world.breakables : []);
  for(const wall of breakables){
    if(!wall || wall.broken) continue;
    includeRectTop(wall);
  }
  const toggleSolids = typeof activeToggleBlockSolids === 'function'
    ? activeToggleBlockSolids(world)
    : [];
  if(Array.isArray(toggleSolids)){
    for(const solid of toggleSolids){
      if(!solid) continue;
      includeRectTop(solid);
    }
  }
  const ignoreSand = !!(opts.ignoreSand);
  if(!ignoreSand){
    const sandHeight = sandSurfaceHeightAt(world, x);
    if(sandHeight !== null){
      considerHeight(sandHeight, sandHeight);
    }
  }
  if(!Number.isFinite(height)){
    return fallbackGround;
  }
  return height;
}

function ceilingCollision(p, world, dt=0){
  if(!p) return false;
  p.ceilingContact = false;
  if(p.isSwordTip || p.ignoreCeiling) return false;
  const ceiling = Number.isFinite(world?.ceilingY) ? world.ceilingY : null;
  if(ceiling === null) return false;
  const radiusRaw = Number.isFinite(p.ceilingRadius)
    ? p.ceilingRadius
    : Number.isFinite(p.terrainRadius)
      ? p.terrainRadius
      : 0;
  const radius = Math.max(0, radiusRaw);
  if(radius <= 0) return false;
  const prevX = Number.isFinite(p.prevX) ? p.prevX : p.x;
  const prevY = Number.isFinite(p.prevY) ? p.prevY : p.y;
  const limit = ceiling + radius;
  if(p.y <= limit){
    const travelX = p.x - prevX;
    const travelY = p.y - prevY;
    let snappedX = p.x;
    if(prevY > limit && travelY < -1e-6){
      const rawT = (limit - prevY) / travelY;
      const clampedT = rawT <= 0 ? 0 : (rawT >= 1 ? 1 : rawT);
      snappedX = prevX + travelX * clampedT;
    }
    p.x = snappedX;
    p.y = limit;
    if(p.vy < 0) p.vy = 0;
    if(Number.isFinite(dt) && dt > 0){
      const frictionDecay = Math.exp(-Math.max(0, CEILING_FRICTION_PER_SEC) * dt);
      if(Number.isFinite(frictionDecay) && frictionDecay < 1){
        p.vx *= frictionDecay;
      }
    }
    if(!Number.isFinite(p.prevY) || p.prevY < p.y){
      p.prevY = p.y;
    }
    if(!Number.isFinite(p.prevX)){
      p.prevX = p.x;
    }
    p.ceilingContact = true;
    return true;
  }
  return false;
}

function groundCollision(p, world, dt=0){
  if(!p) return false;
  p.wallContact = false;
  p.wallContactDir = 0;
  if(p.lastWallDir) p.lastWallDir = 0;
  p.platformId = null;
  if(p.isSwordTip || p.ignoreGround){
    p.grounded = false;
    p.preGroundContact = false;
    return false;
  }
  const radiusRaw = Number.isFinite(p.terrainRadius) ? p.terrainRadius : 0;
  const radius = Math.max(0, radiusRaw);
  if(radius <= 0){
    p.grounded = false;
    p.preGroundContact = false;
    return false;
  }
  const prevX = Number.isFinite(p.prevX) ? p.prevX : p.x;
  const prevY = Number.isFinite(p.prevY) ? p.prevY : p.y;
  const velocityY = Number.isFinite(p.vy) ? p.vy : ((p.y - prevY) / (dt || 1));
  const stepUpLimit = Number.isFinite(p.maxStepUp) ? Math.max(0, p.maxStepUp) : radius * 2;
  const sampleSurfaceRaw = typeof p.groundSampleSurface === 'string'
    ? p.groundSampleSurface
    : (typeof p.groundSampleMode === 'string' ? p.groundSampleMode : null);
  const sampleSurface = sampleSurfaceRaw ? sampleSurfaceRaw.toLowerCase() : 'bottom';
  const groundSampleOptions = {
    referenceY: prevY,
    referencePadding: radius,
    velocityY,
    maxStepUp: stepUpLimit,
    surface: sampleSurface
  };
  const ground = groundHeightAt(world, p.x, groundSampleOptions);
  const floor = ground - radius;
  const tolerance = Math.max(0.75, radius * 0.25);
  p.grounded = false;
  p.preGroundContact = false;
  if(p.y >= floor){
    const nextX = p.x;
    const nextY = p.y;
    const travelX = nextX - prevX;
    const travelY = nextY - prevY;
    let snappedX = nextX;
    let contactY = nextY;
    let snapFloor = floor;
    if(prevY < floor && travelY > 1e-6){
      const rawT = (floor - prevY) / travelY;
      const clampedT = rawT <= 0 ? 0 : (rawT >= 1 ? 1 : rawT);
      snappedX = prevX + travelX * clampedT;
      contactY = prevY + travelY * clampedT;
      const adjustedGround = groundHeightAt(world, snappedX, {
        referenceY: contactY,
        referencePadding: radius,
        velocityY,
        maxStepUp: stepUpLimit,
        surface: sampleSurface
      });
      if(Number.isFinite(adjustedGround)){
        snapFloor = adjustedGround - radius;
      }
    }
    if(contactY > snapFloor) contactY = snapFloor;
    p.x = snappedX;
    p.y = snapFloor;
    if(p.vy > 0) p.vy = 0;
    if(!Number.isFinite(p.prevY) || p.prevY > p.y){
      p.prevY = p.y;
    }
    if(!Number.isFinite(p.prevX)){
      p.prevX = p.x;
    }
    p.grounded = true;
    p.preGroundContact = true;
    return true;
  }
  if(p.y >= floor - tolerance && velocityY >= -60){
    p.preGroundContact = true;
  }
  return false;
}
