// stickman/render.js

const REALM_GUARDIAN_SPRITE_PATH = 'sprites/enemies/realm_guardian.png';
let _realmGuardianImage = null;

function loadSpriteImage(src){
  if(typeof Image !== 'function') return null;
  const img = new Image();
  try{
    img.decoding = 'async';
  }catch(err){
    // Older browsers may not support decoding hints; ignore failures.
  }
  img.loaded = false;
  img.addEventListener('load', ()=>{ img.loaded = true; });
  img.addEventListener('error', ()=>{ img.error = true; });
  img.src = src;
  return img;
}

function realmGuardianImage(){
  if(_realmGuardianImage === null){
    _realmGuardianImage = loadSpriteImage(REALM_GUARDIAN_SPRITE_PATH);
  }
  return _realmGuardianImage;
}

function isSpriteImageReady(img){
  if(!img || img.error) return false;
  if(img.loaded) return true;
  return !!(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

function drawStickLimbs(ctx, stick){
  const limbWidth = Math.max(1, 3*STICK_SCALE);
  ctx.lineWidth=limbWidth; ctx.lineCap='round';
  ctx.strokeStyle = stick.isEnemy ? '#ffc3c3' : '#ffffff';
  const pelvisPoint = stick.pointsByName.pelvis;
  const legs = stick.legs || null;
  const neckPoint = stick.pointsByName.neck;
  const elbowL = stick.pointsByName.elbowL;
  const elbowR = stick.pointsByName.elbowR;
  const handL = stick.pointsByName.handL;
  const handR = stick.pointsByName.handR;
  let leftLegChain = null;
  let rightLegChain = null;
  let leftArmChain = null;
  let rightArmChain = null;
  if(pelvisPoint && legs){
    if(legs.left){
      const chain = [pelvisPoint];
      if(legs.left.knee) chain.push(legs.left.knee);
      if(legs.left.foot) chain.push(legs.left.foot);
      leftLegChain = chain;
    }
    if(legs.right){
      const chain = [pelvisPoint];
      if(legs.right.knee) chain.push(legs.right.knee);
      if(legs.right.foot) chain.push(legs.right.foot);
      rightLegChain = chain;
    }
  }
  if(pelvisPoint && (!leftLegChain || !rightLegChain)){
    if(!leftLegChain && stick.pointsByName.kneeL){
      leftLegChain = [pelvisPoint, stick.pointsByName.kneeL];
    }
    if(!rightLegChain && stick.pointsByName.kneeR){
      rightLegChain = [pelvisPoint, stick.pointsByName.kneeR];
    }
  }
  if(neckPoint){
    if(elbowL && handL){
      leftArmChain = [neckPoint, elbowL, handL];
    }
    if(elbowR && handR){
      rightArmChain = [neckPoint, elbowR, handR];
    }
  }
  const forward = stick.dir >= 0 ? 1 : -1;
  let legBack = null;
  let legFront = null;
  if(leftLegChain && rightLegChain && pelvisPoint){
    const leftFootX = leftLegChain[leftLegChain.length - 1].x;
    const rightFootX = rightLegChain[rightLegChain.length - 1].x;
    const leftLead = ((leftFootX - pelvisPoint.x) * forward) >= ((rightFootX - pelvisPoint.x) * forward);
    if(leftLead){
      legFront = leftLegChain;
      legBack = rightLegChain;
    }else{
      legFront = rightLegChain;
      legBack = leftLegChain;
    }
  }else{
    legBack = leftLegChain;
    legFront = rightLegChain;
  }
  let armBack = null;
  let armFront = null;
  if(leftArmChain && rightArmChain && neckPoint){
    const leftHandX = leftArmChain[leftArmChain.length - 1].x;
    const rightHandX = rightArmChain[rightArmChain.length - 1].x;
    const leftLead = ((leftHandX - neckPoint.x) * forward) >= ((rightHandX - neckPoint.x) * forward);
    if(leftLead){
      armFront = leftArmChain;
      armBack = rightArmChain;
    }else{
      armFront = rightArmChain;
      armBack = leftArmChain;
    }
  }else{
    armBack = leftArmChain;
    armFront = rightArmChain;
  }
  const torsoChain = pelvisPoint && neckPoint ? [pelvisPoint, neckPoint] : null;
  const segments = [];
  if(legBack && legBack.length >= 2) segments.push({ type: 'coords', points: legBack, order: 0 });
  if(torsoChain && torsoChain.length >= 2) segments.push({ type: 'coords', points: torsoChain, order: 1 });
  if(armBack && armBack.length >= 2) segments.push({ type: 'coords', points: armBack, order: 2 });
  if(legFront && legFront.length >= 2) segments.push({ type: 'coords', points: legFront, order: 3 });
  if(armFront && armFront.length >= 2) segments.push({ type: 'coords', points: armFront, order: 4 });
  segments.sort((a, b)=> (a.order ?? 0) - (b.order ?? 0));
  for(const seg of segments){
    if(seg.type === 'coords'){
      const pts = seg.points.filter(Boolean);
      if(pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }
  drawStickExtremities(ctx, stick);
}

function drawStickExtremities(ctx, stick){
  if(!ctx || !stick) return;
  const size = EXTREMITY_CUBE_SIZE;
  if(size <= 0) return;
  const half = size * 0.5;
  const fill = '#ffffff';
  ctx.fillStyle = fill;
  const drawHandCube = (hand, elbow)=>{
    if(!hand) return;
    ctx.save();
    ctx.translate(hand.x, hand.y);
    if(elbow){
      const angle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
      ctx.rotate(angle);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(-half, -half, size, size);
    ctx.restore();
  };
  const handL = stick.pointsByName?.handL;
  const elbowL = stick.pointsByName?.elbowL;
  const handR = stick.pointsByName?.handR;
  const elbowR = stick.pointsByName?.elbowR;
  drawHandCube(handL, elbowL);
  drawHandCube(handR, elbowR);
  const legL = stick.legs?.left;
  const legR = stick.legs?.right;
  const drawFootCube = (foot, knee)=>{
    if(!foot) return;
    ctx.save();
    ctx.translate(foot.x, foot.y);
    if(knee){
      const angle = Math.atan2(foot.y - knee.y, foot.x - knee.x);
      ctx.rotate(angle);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(-half, -half, size, size);
    ctx.restore();
  };
  drawFootCube(legL?.foot, legL?.knee);
  drawFootCube(legR?.foot, legR?.knee);
}

function drawStickCollisionDebug(ctx, stick){
  if(!ctx || !stick) return;
  const world = stick.world || null;
  if(!world?.gameplayFlags?.showHitboxes) return;
  const hitboxWidth = Number.isFinite(stick.hitboxWidth) ? stick.hitboxWidth : null;
  const hitboxHeight = Number.isFinite(stick.hitboxHeight) ? stick.hitboxHeight : null;
  if(hitboxWidth && hitboxHeight){
    const center = typeof stick.center === 'function' ? stick.center() : null;
    const cx = Number.isFinite(center?.x) ? center.x : null;
    const cy = Number.isFinite(center?.y) ? center.y : null;
    if(cx !== null && cy !== null){
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255, 210, 0, 0.85)';
      ctx.fillStyle = 'rgba(255, 210, 0, 0.12)';
      ctx.beginPath();
      if(stick.hitboxShape === 'ellipse' && typeof ctx.ellipse === 'function'){
        ctx.ellipse(cx, cy, hitboxWidth * 0.5, hitboxHeight * 0.5, 0, 0, Math.PI * 2);
      }else{
        ctx.rect(cx - hitboxWidth * 0.5, cy - hitboxHeight * 0.5, hitboxWidth, hitboxHeight);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  const colliders = [];
  if(Array.isArray(stick.points)){
    for(const point of stick.points){
      if(!point) continue;
      const radius = Number.isFinite(point.terrainRadius) ? point.terrainRadius : 0;
      if(radius <= 0) continue;
      const x = Number.isFinite(point.x) ? point.x : null;
      const y = Number.isFinite(point.y) ? point.y : null;
      if(x === null || y === null) continue;
      colliders.push({ x, y, radius, point });
    }
  }
  const legs = stick.legs || null;
  const leftFootPoint = legs?.left?.foot || null;
  const rightFootPoint = legs?.right?.foot || null;
  const footContactCache = new Map();
  const isFootPoint = (point)=> point && (point === leftFootPoint || point === rightFootPoint);
  const footTouchingGround = (foot)=>{
    if(!foot) return false;
    if(footContactCache.has(foot)) return footContactCache.get(foot);
    let touching = false;
    if(typeof stick._isFootTouchingGround === 'function'){
      touching = !!stick._isFootTouchingGround(foot);
    }
    footContactCache.set(foot, touching);
    return touching;
  };
  if(legs){
    for(const side of ['left','right']){
      const foot = legs[side]?.foot || null;
      if(!foot) continue;
      const radius = Number.isFinite(foot.radius) ? foot.radius : (Number.isFinite(foot.terrainRadius) ? foot.terrainRadius : 0);
      if(radius <= 0) continue;
      const x = Number.isFinite(foot.x) ? foot.x : null;
      const y = Number.isFinite(foot.y) ? foot.y : null;
      if(x === null || y === null) continue;
      colliders.push({ x, y, radius, point: foot });
    }
  }
  let weaponDebug = Array.isArray(stick._debugWeaponHitboxes) ? stick._debugWeaponHitboxes : [];
  if(weaponDebug.length){
    const survivors = [];
    const now = nowMs();
    for(const entry of weaponDebug){
      if(!entry) continue;
      if(entry.expires !== undefined && now > entry.expires) continue;
      if(!(entry.range > 0)) continue;
      survivors.push(entry);
    }
    if(survivors.length !== weaponDebug.length) stick._debugWeaponHitboxes = survivors;
    weaponDebug = survivors;
  }
  if(!colliders.length && !weaponDebug.length) return;
  if(colliders.length){
    ctx.save();
    ctx.lineWidth = 1.2;
    const solidRects = typeof stick._solidRectangles === 'function' ? stick._solidRectangles() : [];
    const contactStroke = 'rgba(60, 141, 255, 0.95)';
    const defaultStroke = 'rgba(255, 64, 64, 0.9)';
    const hasContact = (collider)=>{
      const src = collider.point || null;
      const isFoot = isFootPoint(src);
      if(src){
        if(src.grounded || src.wallContact || src.platformId !== null) return true;
        if(isFoot){
          if(footTouchingGround(src)) return true;
        }else if(src.preGroundContact){
          return true;
        }
      }
      if(!solidRects.length) return false;
      const cx = collider.x;
      const cy = collider.y;
      const radius = collider.radius;
      const slack = Math.max(1.5, radius * 0.25);
      for(const rect of solidRects){
        if(!rect) continue;
        const left = rect.left ?? rect.x ?? 0;
        const right = rect.right ?? (rect.w !== undefined ? left + rect.w : (rect.width !== undefined ? left + rect.width : left));
        const top = rect.top ?? rect.y ?? 0;
        const bottom = rect.bottom ?? (rect.h !== undefined ? top + rect.h : (rect.height !== undefined ? top + rect.height : top));
        if(!(right > left && bottom > top)) continue;
        const nearestX = clamp(cx, left, right);
        const nearestY = clamp(cy, top, bottom);
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        const contactRadius = radius + slack;
        if(dx * dx + dy * dy <= contactRadius * contactRadius) return true;
        if(cx >= left && cx <= right && cy >= top && cy <= bottom) return true;
      }
      return false;
    };
    for(const collider of colliders){
      ctx.strokeStyle = hasContact(collider) ? contactStroke : defaultStroke;
      ctx.beginPath();
      ctx.arc(collider.x, collider.y, collider.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  if(weaponDebug.length){
    ctx.save();
    const friendlyColor = 'rgba(44, 207, 255, 0.9)';
    const enemyColor = 'rgba(255, 112, 170, 0.9)';
    for(const entry of weaponDebug){
      const range = Math.max(0, entry.range || 0);
      if(!(range > 0)) continue;
      const arc = entry.fullArc ? TAU : clamp(entry.arc ?? Math.PI, 0, TAU);
      const color = entry.friendly ? friendlyColor : enemyColor;
      const lineWidth = Math.max(1.4, Math.min(4.5, range * 0.04));
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      if(arc >= TAU - 1e-3){
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(entry.x, entry.y, range, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }else{
        const halfArc = arc * 0.5;
        const baseAngle = Number.isFinite(entry.angle) ? entry.angle : (entry.friendly ? 0 : Math.PI);
        const startAngle = baseAngle - halfArc;
        const endAngle = baseAngle + halfArc;
        ctx.beginPath();
        ctx.moveTo(entry.x, entry.y);
        ctx.lineTo(entry.x + Math.cos(startAngle) * range, entry.y + Math.sin(startAngle) * range);
        ctx.arc(entry.x, entry.y, range, startAngle, endAngle);
        ctx.lineTo(entry.x, entry.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(entry.x, entry.y, Math.max(2, Math.min(4, range * 0.05)), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

const HEAD_SHAPE_RENDER_LIST = ['square','circle','triangle','pentagon','hexagon','star'];

function normalizeHeadShapeForRender(shape){
  const fallback = (typeof DEFAULT_HEAD_SHAPE === 'string' && DEFAULT_HEAD_SHAPE) || 'square';
  const value = typeof shape === 'string' ? shape.trim().toLowerCase() : '';
  if(HEAD_SHAPE_RENDER_LIST.includes(value)) return value;
  if(typeof sanitizeHeadShape === 'function') return sanitizeHeadShape(shape);
  return fallback;
}

function traceRegularPolygon(ctx, sides, cx, cy, radius, rotation){
  if(sides < 3) return;
  const angleStep = TAU / sides;
  const start = rotation ?? -Math.PI / 2;
  ctx.moveTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius);
  for(let i = 1; i < sides; i++){
    const angle = start + angleStep * i;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
}

function traceStar(ctx, points, cx, cy, outerRadius, innerRadius, rotation){
  if(points < 2) return;
  const start = rotation ?? -Math.PI / 2;
  const step = Math.PI / points;
  ctx.moveTo(cx + Math.cos(start) * outerRadius, cy + Math.sin(start) * outerRadius);
  for(let i = 1; i < points * 2; i++){
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = start + step * i;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
}

function drawVoidGlyphHeadOverlay(ctx, stick){
  if(!ctx || !stick || !stick.voidGlyphHead) return;
  const head = stick.pointsByName?.head;
  if(!head) return;
  const halo = stick.voidHaloState || null;
  const offsetY = stick.voidHaloHeightOffset ?? 0;
  const centerX = head.x;
  const centerY = head.y + offsetY;
  const baseRadius = Math.max(18, halo?.radius ?? stick.voidHaloRadius ?? 60);
  const charge = clamp(halo?.charge ?? 0, 0, 1);
  ctx.save();
  const glowRadius = baseRadius * 1.45;
  const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, glowRadius);
  gradient.addColorStop(0, `rgba(34, 20, 60, ${0.65 + charge * 0.15})`);
  gradient.addColorStop(0.65, 'rgba(28, 16, 48, 0.35)');
  gradient.addColorStop(1, 'rgba(18, 10, 32, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, glowRadius, 0, TAU);
  ctx.fill();

  ctx.lineWidth = Math.max(2.4, 3.4 + charge * 4.2);
  ctx.strokeStyle = `rgba(168, 148, 255, ${0.55 + charge * 0.35})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius, 0, TAU);
  ctx.stroke();

  ctx.lineWidth = Math.max(1.2, 1.6 + charge * 2.1);
  ctx.strokeStyle = `rgba(36, 20, 66, ${0.6 + charge * 0.25})`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * 0.46, 0, TAU);
  ctx.stroke();

  const now = nowMs();
  const rotation = halo?.rotation ?? 0;
  const regen = Math.max(0.12, halo?.regenDelay ?? stick.voidHaloRegenDelay ?? 4);
  const spinBonus = halo?.volleying ? 1.35 : 1;
  const orbitRadius = baseRadius;
  const orbs = Array.isArray(halo?.orbs) ? halo.orbs : [];
  for(const orb of orbs){
    if(!orb) continue;
    const offset = orb.angleOffset ?? 0;
    const angle = rotation + offset;
    const readiness = clamp(1 - Math.max(0, orb.cooldown ?? 0) / regen, 0, 1);
    const visibility = clamp(readiness * 0.85 + 0.1, 0, 1);
    const orbRadius = Math.max(6, (stick.voidHaloOrbRadius ?? (baseRadius * 0.22)) * (0.45 + readiness * 0.55));
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    ctx.save();
    ctx.translate(x, y);
    const spin = (now / 260) * spinBonus + angle;
    ctx.rotate(spin);
    const alpha = 0.28 + visibility * 0.6;
    ctx.fillStyle = `rgba(8, 4, 18, ${0.85 + 0.1 * readiness})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, orbRadius, orbRadius, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.2, orbRadius * 0.42);
    ctx.strokeStyle = `rgba(184, 170, 255, ${0.4 + readiness * 0.45})`;
    ctx.beginPath();
    ctx.arc(0, 0, orbRadius * 0.72, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = orbRadius * 0.28;
    ctx.strokeStyle = `rgba(124, 108, 220, ${0.3 + readiness * 0.55})`;
    ctx.beginPath();
    ctx.moveTo(-orbRadius * 0.85, 0);
    ctx.lineTo(orbRadius * 0.85, 0);
    ctx.stroke();
    if(orb.launchFlash > 0){
      const flash = clamp(orb.launchFlash / 0.32, 0, 1);
      ctx.globalAlpha = flash;
      ctx.lineWidth = orbRadius * 0.55;
      ctx.strokeStyle = 'rgba(216, 200, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -orbRadius * 0.6);
      ctx.lineTo(0, orbRadius * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawStickHead(ctx, stick){
  const h=stick.pointsByName.head;
  const playerStroke = stick.bodyColor || '#f0b35b';
  const friendlyStroke = stick.npcHeadColor || playerStroke;
  const stroke = stick.isEnemy ? (stick.isBoss ? '#ffb347' : '#ff6a6a') : friendlyStroke;
  const headSize = 24 * STICK_SCALE;
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, 2.2 * STICK_SCALE + 1);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const shape = normalizeHeadShapeForRender(stick.headShape);
  const baseRadius = headSize / 2;
  const shapeScale = shape === 'square' ? 1 : 1.3;
  const radius = baseRadius * shapeScale;
  const centerX = h.x;
  const centerY = h.y - (radius - baseRadius);
  const headRender = { centerX, centerY, baseRadius, radius, shape };
  switch(shape){
    case 'circle':
      ctx.arc(centerX, centerY, radius, 0, TAU);
      break;
    case 'triangle':
      traceRegularPolygon(ctx, 3, centerX, centerY, radius, -Math.PI / 2);
      break;
    case 'pentagon':
      traceRegularPolygon(ctx, 5, centerX, centerY, radius, -Math.PI / 2);
      break;
    case 'hexagon':
      traceRegularPolygon(ctx, 6, centerX, centerY, radius, Math.PI / 2);
      break;
    case 'star':
      traceStar(ctx, 5, centerX, centerY, radius, radius * 0.48, -Math.PI / 2);
      break;
    case 'square':
    default:
      ctx.rect(centerX - baseRadius, centerY - baseRadius, headSize, headSize);
      break;
  }
  ctx.stroke();
  ctx.restore();
  if(stick.isNpc){
    drawNpcStrawHat(ctx, stick, headRender);
  }
  drawStickHeadSigil(ctx, stick, headRender);
  if(stick.voidGlyphHead){
    drawVoidGlyphHeadOverlay(ctx, stick);
  }
  drawSummonerSummonSlots(ctx, stick);
}

function drawNpcStrawHat(ctx, stick, headInfo){
  if(!ctx || !stick || !headInfo) return;
  const centerX = headInfo.centerX;
  const centerY = headInfo.centerY;
  const radius = headInfo.radius;
  if(!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(radius)) return;
  const brimWidth = radius * 1.7;
  const brimHeight = Math.max(radius * 0.4, 4);
  const brimY = centerY - radius - brimHeight * 0.25;
  const crownHeight = radius * 0.9;
  const crownWidth = radius * 0.95;
  const crownTop = brimY - crownHeight;
  const bandHeight = Math.max(2, radius * 0.22);
  const bandY = crownTop + crownHeight * 0.45;
  ctx.save();
  ctx.fillStyle = stick.npcHatBrimColor || '#e1c170';
  ctx.strokeStyle = stick.npcHatStrokeColor || '#ba8b3c';
  ctx.lineWidth = Math.max(1, radius * 0.16);
  if(typeof ctx.ellipse === 'function'){
    ctx.beginPath();
    ctx.ellipse(centerX, brimY, brimWidth, brimHeight, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }else{
    ctx.beginPath();
    ctx.moveTo(centerX - brimWidth, brimY);
    ctx.lineTo(centerX + brimWidth, brimY);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(centerX - crownWidth, brimY - 1);
  ctx.lineTo(centerX - crownWidth * 0.55, crownTop + crownHeight * 0.15);
  ctx.lineTo(centerX + crownWidth * 0.55, crownTop + crownHeight * 0.15);
  ctx.lineTo(centerX + crownWidth, brimY - 1);
  ctx.closePath();
  ctx.fillStyle = stick.npcHatCrownColor || '#f5d98b';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = stick.npcHatBandColor || '#8f4d1c';
  ctx.fillRect(centerX - crownWidth * 0.55, bandY, crownWidth * 1.1, bandHeight);
  ctx.restore();
}

function drawStickHeadSigil(ctx, stick, headInfo){
  if(!ctx || !stick || !headInfo) return;
  const raw = typeof stick.headSigil === 'string' ? stick.headSigil.trim().toLowerCase() : '';
  if(!raw) return;
  switch(raw){
    case 'psi':
      drawPsiHeadSigil(ctx, stick, headInfo);
      break;
    case 'epsilon':
      drawEpsilonHeadSigil(ctx, stick, headInfo);
      break;
    case 'phi':
      drawPhiHeadSigil(ctx, stick, headInfo);
      break;
    default:
      break;
  }
}

function drawPsiHeadSigil(ctx, stick, headInfo){
  const { centerX, centerY, radius } = headInfo;
  if(!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(radius)) return;
  const scale = Math.max(6, radius * 0.85);
  const color = stick.headSigilColor || stick.accentColor || '#f6f2ff';
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, radius * 0.26);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const topY = -scale * 0.6;
  const bottomY = scale * 0.8;
  const armX = scale * 0.55;
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(0, bottomY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-armX, topY);
  ctx.lineTo(armX, topY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-armX, topY);
  ctx.quadraticCurveTo(-armX * 0.9, topY + scale * 0.55, -armX * 0.35, bottomY * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(armX, topY);
  ctx.quadraticCurveTo(armX * 0.9, topY + scale * 0.55, armX * 0.35, bottomY * 0.3);
  ctx.stroke();
  ctx.restore();
}

function drawEpsilonHeadSigil(ctx, stick, headInfo){
  const { centerX, centerY, radius } = headInfo;
  if(!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(radius)) return;
  const scale = Math.max(6, radius * 0.9);
  const color = stick.headSigilColor || stick.accentColor || '#d9f3ff';
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.6, radius * 0.28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const top = -scale * 0.6;
  const bottom = scale * 0.65;
  const curl = scale * 0.7;
  ctx.beginPath();
  ctx.moveTo(curl * 0.35, top);
  ctx.lineTo(-curl * 0.55, top);
  ctx.quadraticCurveTo(-curl, -scale * 0.1, -curl * 0.2, 0);
  ctx.quadraticCurveTo(-curl, scale * 0.35, -curl * 0.15, bottom);
  ctx.lineTo(curl * 0.45, bottom);
  ctx.stroke();
  ctx.restore();
}

function drawPhiHeadSigil(ctx, stick, headInfo){
  const { centerX, centerY, radius } = headInfo;
  if(!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(radius)) return;
  const scale = Math.max(6, radius * 0.82);
  const color = stick.headSigilColor || stick.accentColor || '#ffe8b0';
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.6, radius * 0.26);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ringRadius = scale * 0.55;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, TAU);
  ctx.stroke();
  const verticalExtent = scale * 0.95;
  ctx.beginPath();
  ctx.moveTo(0, -verticalExtent);
  ctx.lineTo(0, verticalExtent);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-ringRadius * 0.85, 0);
  ctx.lineTo(ringRadius * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}

function drawSummonerSummonSlots(ctx, stick){
  if(!ctx || !stick) return;
  if(stick.isEnemy) return;
  if(typeof stick.weapon !== 'function') return;
  const weapon = stick.weapon();
  if(!weapon || weapon.kind !== 'summoner') return;
  const state = stick.summonerState || null;
  const limitRaw = state?.maxActiveSummons ?? weapon.maxActiveSummons ?? 3;
  const maxSlots = Math.max(1, Math.round(limitRaw || 1));
  if(!(maxSlots > 0)) return;
  const head = stick.pointsByName?.head;
  if(!head) return;
  const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
  const slotRadius = Math.max(2.2, 4.2 * scale);
  const spacing = slotRadius * 2.6;
  const totalWidth = spacing * (maxSlots - 1);
  const baseX = head.x - totalWidth * 0.5;
  const baseY = head.y - (slotRadius * 3.2 + 20 * scale);
  if(state && typeof syncSummonerSlots === 'function'){
    syncSummonerSlots(state, maxSlots);
  }
  const slots = Array.isArray(state?.summonSlots) ? state.summonSlots : [];
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  for(let i=0;i<maxSlots;i++){
    const x = baseX + spacing * i;
    const slot = slots[i] || null;
    const summon = slot && slot.summon && !slot.summon._destroyed ? slot.summon : null;
    const onCooldown = !summon && slot && slot.cooldownUntil && now < slot.cooldownUntil;
    ctx.save();
    ctx.lineWidth = Math.max(0.6, 1.1 * scale);
    ctx.strokeStyle = summon
      ? 'rgba(248, 236, 255, 0.95)'
      : (onCooldown ? 'rgba(220, 96, 110, 0.8)' : 'rgba(210, 210, 235, 0.55)');
    ctx.fillStyle = summon
      ? 'rgba(226, 206, 255, 0.85)'
      : (onCooldown ? 'rgba(36, 16, 22, 0.78)' : 'rgba(18, 20, 30, 0.55)');
    ctx.beginPath();
    ctx.ellipse(x, baseY, slotRadius, slotRadius, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if(onCooldown){
      ctx.fillStyle = 'rgba(255, 72, 72, 0.92)';
      ctx.beginPath();
      ctx.ellipse(x, baseY, slotRadius * 0.45, slotRadius * 0.45, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawStickArmor(ctx, stick){
  if(!stick || typeof stick.armorItem !== 'function') return;
  const armorItem = stick.armorItem();
  if(!armorItem || armorItem.type !== 'armor') return;
  const armorInfo = ARMOR_ITEMS?.[armorItem.id];
  if(!armorInfo) return;
  const neck = stick.pointsByName.neck;
  const pelvis = stick.pointsByName.pelvis;
  if(!neck || !pelvis) return;
  const scale = STICK_SCALE;
  const chestTop = neck.y + 6 * scale;
  const waistY = pelvis.y - 4 * scale;
  const hemY = pelvis.y + 16 * scale;
  const shoulderWidth = 36 * scale;
  const waistWidth = 26 * scale;
  const hemWidth = 30 * scale;
  const chestHeight = Math.max(28 * scale, (pelvis.y - neck.y) * 0.72);
  const primary = armorInfo.primaryColor || armorInfo.color || '#4a5c7d';
  const secondary = armorInfo.secondaryColor || (typeof lightenColor === 'function' ? lightenColor(primary, 0.18) : primary);
  const trim = armorInfo.trimColor || '#d7e3ff';
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = primary;
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(1.2, 2.4 * scale);
  ctx.beginPath();
  ctx.moveTo(neck.x - shoulderWidth * 0.55, chestTop);
  ctx.lineTo(neck.x + shoulderWidth * 0.55, chestTop);
  ctx.lineTo(pelvis.x + waistWidth * 0.62, waistY);
  ctx.lineTo(pelvis.x + hemWidth * 0.48, hemY);
  ctx.lineTo(pelvis.x - hemWidth * 0.48, hemY);
  ctx.lineTo(pelvis.x - waistWidth * 0.62, waistY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(neck.x - shoulderWidth * 0.35, chestTop + chestHeight * 0.2);
  ctx.lineTo(neck.x + shoulderWidth * 0.35, chestTop + chestHeight * 0.2);
  ctx.lineTo(pelvis.x + waistWidth * 0.34, waistY + chestHeight * 0.22);
  ctx.lineTo(pelvis.x, waistY + chestHeight * 0.44);
  ctx.lineTo(pelvis.x - waistWidth * 0.34, waistY + chestHeight * 0.22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = trim;
  const beltHeight = Math.max(3.2, 6.2 * scale);
  ctx.fillRect(pelvis.x - hemWidth * 0.5, waistY + chestHeight * 0.28, hemWidth, beltHeight);

  const shoulderRadius = 12 * scale;
  const shoulderOffset = 24 * scale;
  ctx.fillStyle = primary;
  ctx.strokeStyle = trim;
  ctx.beginPath();
  ctx.ellipse(neck.x - shoulderOffset, neck.y + 8 * scale, shoulderRadius * 0.85, shoulderRadius, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(neck.x + shoulderOffset, neck.y + 8 * scale, shoulderRadius * 0.85, shoulderRadius, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  const highlight = typeof lightenColor === 'function' ? lightenColor(trim, 0.2) : trim;
  ctx.strokeStyle = highlight;
  ctx.lineWidth = Math.max(0.9, 1.6 * scale);
  ctx.beginPath();
  ctx.moveTo(neck.x, chestTop + chestHeight * 0.16);
  ctx.lineTo(neck.x, waistY + chestHeight * 0.4);
  ctx.stroke();
  ctx.restore();
}

function drawStickAuraRecipientGlow(ctx, stick){
  if(!ctx || !stick) return;
  const visuals = (stick._auraVisuals instanceof Map) ? stick._auraVisuals : null;
  if(!visuals || visuals.size === 0) return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const tau = (typeof TAU === 'number') ? TAU : Math.PI * 2;
  const offsetY = stick.renderOffsetY ?? 0;
  const radiusHint = stick.bodyRadius
    || (Number.isFinite(stick.hitboxWidth) ? Math.max(stick.hitboxWidth, stick.hitboxHeight || stick.hitboxWidth) * 0.5 : 0);
  const baseRadius = Math.max(18, radiusHint || 28);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const visual of visuals.values()){
    if(!visual) continue;
    const color = visual.color || '#ffffff';
    const intensity = Number.isFinite(visual.intensity) ? Math.max(0, visual.intensity) : 1;
    if(intensity <= 0) continue;
    const outerRadius = baseRadius * (1.05 + intensity * 0.18);
    const innerRadius = outerRadius * 0.45;
    const gradient = ctx.createRadialGradient(
      center.x,
      center.y + offsetY,
      innerRadius,
      center.x,
      center.y + offsetY,
      outerRadius
    );
    if(typeof colorWithAlpha === 'function'){
      gradient.addColorStop(0, colorWithAlpha(color, Math.min(0.58, 0.28 + intensity * 0.18)));
      gradient.addColorStop(1, colorWithAlpha(color, 0));
    }else{
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.globalAlpha = Math.min(0.55, 0.18 + intensity * 0.22);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center.x, center.y + offsetY, outerRadius, 0, tau);
    ctx.fill();
  }
  ctx.restore();
}

function drawStickProjectileShield(ctx, stick){
  if(!ctx || !stick) return;
  const shields = (stick.projectileShields instanceof Map) ? stick.projectileShields : null;
  if(!shields || shields.size === 0) return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  let active = null;
  for(const entry of shields.values()){
    if(!entry || !(entry.maxHp > 0)) continue;
    const ratio = entry.maxHp > 0 ? clamp((entry.hp ?? 0) / entry.maxHp, 0, 1) : 0;
    const effective = !entry.broken || ratio > 0;
    if(!effective) continue;
    if(!active || ratio > active.ratio){
      active = { entry, ratio };
    }
  }
  if(!active) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const baseRadius = Math.max(active.entry.minRadius ?? 0, (stick.bodyRadius || 32) * 1.6);
  const hitPulse = clamp(active.entry.hitPulse || 0, 0, 1);
  const growth = 1 + active.ratio * 0.18 + hitPulse * 0.22;
  const radius = baseRadius * growth;
  const innerRadius = radius * 0.48;
  const color = active.entry.color || 'rgba(160, 220, 255, 0.35)';
  const outline = active.entry.outlineColor || 'rgba(70, 130, 190, 0.82)';
  const highlight = active.entry.hitColor || 'rgba(220, 245, 255, 0.9)';
  ctx.save();
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y + offsetY,
    innerRadius,
    center.x,
    center.y + offsetY,
    radius
  );
  if(typeof colorWithAlpha === 'function'){
    gradient.addColorStop(0, colorWithAlpha(color, Math.min(0.7, 0.35 + active.ratio * 0.2 + hitPulse * 0.2)));
    gradient.addColorStop(0.55, colorWithAlpha(color, Math.min(0.45, 0.22 + active.ratio * 0.18)));
    gradient.addColorStop(1, colorWithAlpha(color, 0));
  }else{
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
  }
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.strokeStyle = outline;
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY, radius, 0, TAU);
  ctx.stroke();
  if(hitPulse > 0.01){
    ctx.globalAlpha = clamp(0.3 + hitPulse * 0.45, 0, 1);
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.strokeStyle = highlight;
    ctx.beginPath();
    ctx.arc(center.x, center.y + offsetY, radius * (1 + hitPulse * 0.12), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStickOffhand(ctx, stick){
  if(!stick || typeof stick.offhandItem !== 'function') return;
  const offhand = stick.offhandItem();
  if(!offhand || offhand.type !== 'offhand') return;
  const info = OFFHAND_ITEMS?.[offhand.id];
  if(!info) return;
  if(info.kind === 'drone'){
    drawStickHalfSlotDrone(ctx, stick, info);
    return;
  }
  if(info.kind === 'glyphOrbit'){
    drawStickHalfSlotGlyphs(ctx, stick, info);
    return;
  }
  const facingRight = stick.dir >= 0;
  const handName = facingRight ? 'handL' : 'handR';
  const elbowName = facingRight ? 'elbowL' : 'elbowR';
  const hand = stick.pointsByName[handName];
  const elbow = stick.pointsByName[elbowName];
  if(!hand || !elbow) return;
  const angle = Math.atan2(hand.y - elbow.y, hand.x - elbow.x);
  ctx.save();
  if(info.kind === 'shield'){
    const radius = 18 * STICK_SCALE;
    const offsetX = (facingRight ? 1 : -1) * radius * 0.68;
    const offsetY = -radius * 0.18;
    ctx.translate(hand.x + offsetX, hand.y + offsetY);
    ctx.rotate(angle);
    const face = info.faceColor || info.color || '#6b8cff';
    const trim = info.trimColor || '#27315a';
    const highlight = typeof lightenColor === 'function' ? lightenColor(face, 0.28) : face;
    ctx.fillStyle = face;
    ctx.strokeStyle = trim;
    ctx.lineWidth = Math.max(1.4, 2.4 * STICK_SCALE);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.85, radius, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(0.9, 1.6 * STICK_SCALE);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.5, radius * 0.6, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.26, radius * 0.3, 0, 0, TAU);
    ctx.fill();
  }else if(info.kind === 'torch'){
    const handleColor = info.handleColor || info.bodyColor || '#5b3a1f';
    const gripColor = info.gripColor || '#3d2714';
    const metalColor = info.accentColor || '#f5e7c6';
    const flameColor = info.flameColor || info.color || '#ffce6b';
    const glowColor = info.glowColor || 'rgba(255, 236, 170, 0.75)';
    const handleLength = 32 * STICK_SCALE;
    const handleWidth = 4.6 * STICK_SCALE;
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle - Math.PI/2);

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(0, -handleLength * 0.8, handleLength * 0.45, handleLength * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = handleColor;
    ctx.beginPath();
    ctx.moveTo(-handleWidth * 0.6, handleLength * 0.45);
    ctx.lineTo(handleWidth * 0.6, handleLength * 0.45);
    ctx.lineTo(handleWidth * 0.85, -handleLength * 0.35);
    ctx.lineTo(-handleWidth * 0.85, -handleLength * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = gripColor;
    ctx.beginPath();
    ctx.moveTo(-handleWidth * 0.75, -handleLength * 0.2);
    ctx.lineTo(handleWidth * 0.75, -handleLength * 0.2);
    ctx.lineTo(handleWidth * 0.65, -handleLength * 0.4);
    ctx.lineTo(-handleWidth * 0.65, -handleLength * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = metalColor;
    ctx.beginPath();
    ctx.ellipse(0, -handleLength * 0.42, handleWidth * 1.1, handleWidth * 0.75, 0, 0, TAU);
    ctx.fill();

    const gradient = ctx.createRadialGradient(0, -handleLength * 0.85, handleWidth * 0.3, 0, -handleLength * 0.85, handleLength * 0.9);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.55, flameColor);
    gradient.addColorStop(1, 'rgba(255, 180, 64, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -handleLength * 1.05);
    ctx.quadraticCurveTo(handleWidth * 1.2, -handleLength * 0.5, 0, -handleLength * 0.1);
    ctx.quadraticCurveTo(-handleWidth * 1.2, -handleLength * 0.5, 0, -handleLength * 1.05);
    ctx.fill();
  }else{
    ctx.translate(hand.x, hand.y);
    ctx.rotate(angle - Math.PI/2);
    const bladeLength = 28 * STICK_SCALE;
    const bladeWidth = 5 * STICK_SCALE;
    const bladeColor = info.color || '#ff6b6b';
    const edgeColor = info.trimColor || '#ffd6d6';
    const hiltColor = info.hiltColor || '#2f2320';
    ctx.fillStyle = bladeColor;
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = Math.max(1, 1.4 * STICK_SCALE);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bladeWidth * 0.5, -bladeLength * 0.6);
    ctx.lineTo(0, -bladeLength);
    ctx.lineTo(-bladeWidth * 0.5, -bladeLength * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const guardHeight = Math.max(1.6, 3 * STICK_SCALE);
    ctx.fillStyle = hiltColor;
    ctx.fillRect(-bladeWidth * 1.3, -bladeLength * 0.56, bladeWidth * 2.6, guardHeight);
    ctx.strokeStyle = hiltColor;
    ctx.lineWidth = Math.max(1, 1.2 * STICK_SCALE);
    ctx.beginPath();
    ctx.moveTo(0, -bladeLength * 0.56 + guardHeight);
    ctx.lineTo(0, bladeLength * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, bladeLength * 0.24, bladeWidth * 0.45, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawStickHalfSlotDrone(ctx, stick, info){
  const state = stick.halfSlotState;
  const drone = state?.drone;
  if(!drone) return;
  const angle = Number.isFinite(drone.aimAngle) ? drone.aimAngle : (stick.dir >= 0 ? 0 : Math.PI);
  const scale = Math.max(2.6, 4.2 * STICK_SCALE);
  ctx.save();
  ctx.translate(drone.x, drone.y);
  ctx.rotate(angle);
  const thruster = info.trailColor || 'rgba(123, 209, 255, 0.35)';
  ctx.fillStyle = thruster;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(-scale * 1.6, 0);
  ctx.quadraticCurveTo(-scale * 2.4, -scale * 0.6, -scale * 2.6, 0);
  ctx.quadraticCurveTo(-scale * 2.4, scale * 0.6, -scale * 1.6, 0);
  ctx.fill();
  ctx.globalAlpha = 1;
  const body = info.bodyColor || info.color || '#7bd1ff';
  const accent = info.accentColor || info.projectileColor || '#e7fbff';
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 1.2, scale * 0.86, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, 1.1 * STICK_SCALE);
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 1.2, scale * 0.86, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(scale * 0.58, 0, scale * 0.52, scale * 0.38, 0, 0, TAU);
  ctx.fill();
  if(drone.flash && drone.flash > 0){
    const pulse = clamp(drone.flash, 0, 1);
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.fillStyle = info.projectileColor || '#f5fdff';
    ctx.beginPath();
    ctx.arc(scale * 1.05, 0, scale * (0.28 + pulse * 0.22), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawStickHalfSlotGlyphs(ctx, stick, info){
  const state = stick.halfSlotState;
  const glyphs = state?.glyphs;
  if(!Array.isArray(glyphs) || glyphs.length === 0) return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  ctx.save();
  if(center && info.orbitRadius){
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = info.trailColor || 'rgba(214, 188, 255, 0.35)';
    ctx.lineWidth = Math.max(0.8, 1.1 * STICK_SCALE);
    ctx.beginPath();
    ctx.arc(center.x, center.y, info.orbitRadius, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const glowColor = info.color || 'rgba(214, 188, 255, 0.6)';
  const glyphFill = info.glyphColor || glowColor;
  const glyphOutline = info.glyphOutline || glyphFill;
  const baseRadius = Math.max(5, (info.glyphRadius ?? 6) * STICK_SCALE);
  for(const glyph of glyphs){
    if(!glyph) continue;
    const ratio = clamp(glyph.formRatio ?? (glyph.ready ? 1 : 0), 0, 1);
    const alpha = glyph.ready ? 0.95 : clamp(0.24 + ratio * 0.7, 0.24, 0.85);
    const radius = baseRadius * (0.6 + ratio * 0.65);
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(glyph.x, glyph.y, radius * 1.4, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glyphFill;
    ctx.beginPath();
    ctx.arc(glyph.x, glyph.y, radius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = glyphOutline;
    ctx.lineWidth = Math.max(0.9, 1.3 * STICK_SCALE);
    ctx.beginPath();
    ctx.arc(glyph.x, glyph.y, radius, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawStickTemplarianWallShield(ctx, stick, weapon){
  if(!ctx || !stick || !weapon) return;
  const points = stick.pointsByName || {};
  const left = points.handL;
  const right = points.handR;
  if(!left || !right) return;
  const centerX = (left.x + right.x) * 0.5;
  const centerY = (left.y + right.y) * 0.5;
  const angle = Math.atan2(right.y - left.y, right.x - left.x);
  const scale = typeof STICK_SCALE === 'number' && STICK_SCALE > 0 ? STICK_SCALE : 1;
  const shieldConfig = weapon.shield || {};
  const faceColor = shieldConfig.faceColor || weapon.color || '#b3212b';
  const trimColor = shieldConfig.trimColor || weapon.highlightColor || '#5a1014';
  const crossColor = shieldConfig.crossColor || '#d6d6d6';
  const highlightColor = shieldConfig.highlightColor || weapon.highlightColor || 'rgba(255, 255, 255, 0.35)';
  const height = Math.max(48, (weapon.shieldHeight ?? 70) * scale);
  const width = Math.max(26, (weapon.shieldWidth ?? 46) * scale);
  const topY = -height * 0.55;
  const upperSideY = -height * 0.12;
  const bottomY = height * 0.62;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  const facing = stick.dir >= 0 ? 1 : -1;
  ctx.scale(facing, 1);
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(width * 0.52, upperSideY);
  ctx.lineTo(0, bottomY);
  ctx.lineTo(-width * 0.52, upperSideY);
  ctx.closePath();
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const crossWidth = Math.max(6, width * 0.22);
  const crossHeight = Math.max(6, height * 0.16);
  const crossTop = topY + height * 0.24;
  ctx.fillStyle = crossColor;
  ctx.fillRect(-crossWidth * 0.5, crossTop, crossWidth, height * 0.58);
  ctx.fillRect(-width * 0.46, crossTop + height * 0.26, width * 0.92, crossHeight);
  ctx.restore();
  ctx.lineWidth = Math.max(2, width * 0.08);
  ctx.strokeStyle = trimColor;
  ctx.stroke();
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = Math.max(1.2, width * 0.05);
  ctx.strokeStyle = highlightColor;
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.lineTo(width * 0.52, upperSideY);
  ctx.lineTo(0, bottomY);
  ctx.lineTo(-width * 0.52, upperSideY);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawStickWeaponTrail(ctx, stick){
  const w = stick.weapon();
  if(!w){
    drawPunchTrails(ctx, stick);
    return;
  }
  if(w.boxingGlove){
    drawBoxingGloveHands(ctx, stick, w);
    return;
  }
  const restoreFilters = [];
  if(typeof shouldPreserveElementColor === 'function'
    && shouldPreserveElementColor(w.element)
    && typeof stripCanvasFilters === 'function'){
    const disable = stripCanvasFilters(ctx, token=>typeof token === 'string' && token.toLowerCase().startsWith('grayscale'));
    if(typeof disable === 'function') restoreFilters.push(disable);
  }
  if(w.element === 'chronometric' && typeof pushCanvasFilter === 'function'){
    const restoreChrono = pushCanvasFilter(ctx, 'invert(1)');
    if(typeof restoreChrono === 'function') restoreFilters.push(restoreChrono);
  }
  try{
    const rig = stick.weaponRig;
    const weaponDrawn = stick.weaponVisible && stick.weaponHand;
    const now = nowMs();
    if(w.kind === 'spirit'){
      drawSpiritWeaponOrbit(ctx, stick, w);
      return;
    }
    if(rig && rig.type === 'sword'){
      if(stick.weaponSheathed){
        drawSheathedSword(ctx, stick, w, rig);
      }else{
        drawSwordRig(ctx, stick, w, rig);
      }
      return;
    }
    if(w.kind === 'bow'){
      const drawing = typeof stick.isBowDrawingActive === 'function' ? stick.isBowDrawingActive(now) : false;
      if(drawing){
        drawBowRig(ctx, stick, w);
      }else{
        drawBowIdle(ctx, stick, w);
      }
      return;
    }
    if(w.kind === 'staff'){
      drawStaffWeapon(ctx, stick, w);
      return;
    }
    if(w.kind === 'summoner'){
      drawSummonerBookWeapon(ctx, stick, w);
      return;
    }
    if(w.kind === 'gun'){
      const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
      if(weaponDrawn || !stick.isEnemy){
        drawGunWeapon(ctx, stick, w, weaponId);
      }
      return;
    }
    if(weaponDrawn){
      if(w.kind === 'shield' || w.templarianWallShield){
        drawStickTemplarianWallShield(ctx, stick, w);
        return;
      }
      const hand = stick.pointsByName[stick.weaponHand];
      if(!hand) return;
      const elbowName = stick.weaponHand === 'handL' ? 'elbowL' : 'elbowR';
      const elbow = stick.pointsByName[elbowName];
      const reach = (w.range ?? 42) * (stick.weaponReachMultiplier ?? 1) * 1.1;
      let dirX = 0;
      let dirY = -1;
      if(hand && elbow){
        const dx = hand.x - elbow.x;
        const dy = hand.y - elbow.y;
        const len = Math.hypot(dx, dy) || 1;
        dirX = dx / len;
        dirY = dy / len;
      }
      const tipX = hand.x + dirX * reach;
      const tipY = hand.y + dirY * reach;
      ctx.strokeStyle = w.color;
      ctx.lineWidth = Math.max(2, 3 * STICK_SCALE);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      return;
    }
    const L = stick.pointsByName.handL;
    const R = stick.pointsByName.handR;
    if(!L || !R) return;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = Math.max(1, 2.5 * STICK_SCALE);
    ctx.beginPath();
    ctx.moveTo(L.x, L.y);
    ctx.lineTo(R.x, R.y);
    ctx.stroke();
  }finally{
    for(let i=restoreFilters.length - 1; i >= 0; i--){
      const fn = restoreFilters[i];
      if(typeof fn === 'function') fn();
    }
  }
}

function drawGlovePyreAura(ctx, stick, glove, weapon){
  if(!ctx || !stick || !glove) return;
  const fire = glove.fireWave || {};
  const scale = typeof STICK_SCALE === 'number' && STICK_SCALE > 0 ? STICK_SCALE : 1;
  const auraBase = glove.auraRadius !== undefined
    ? glove.auraRadius
    : (Number.isFinite(fire.maxRadius) ? fire.maxRadius * 0.22 : 18);
  const baseRadius = Math.max(10, auraBase * scale);
  const color = fire.color || weapon?.color || '#ff8a45';
  const highlight = fire.edgeColor || 'rgba(255, 220, 180, 0.8)';
  const now = nowMs();
  for(const handName of ['handL','handR']){
    const point = stick.pointsByName?.[handName];
    if(!point) continue;
    ctx.save();
    const gradient = ctx.createRadialGradient(point.x, point.y, baseRadius * 0.28, point.x, point.y, baseRadius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, baseRadius, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1.4, baseRadius * 0.18);
    const sweep = Math.PI * 0.9;
    const offset = now / 280 + (handName === 'handL' ? 0 : Math.PI * 0.5);
    ctx.beginPath();
    ctx.arc(point.x, point.y, baseRadius * 0.72, offset, offset + sweep, false);
    ctx.stroke();
    ctx.restore();
  }
}

function drawGloveVoidOrbit(ctx, stick, glove){
  if(!ctx || !stick || !glove) return;
  const state = stick.gloveState;
  const config = glove.voidOrbit || {};
  const scale = typeof STICK_SCALE === 'number' && STICK_SCALE > 0 ? STICK_SCALE : 1;
  const orbitRadius = Math.max(8, (config.radius ?? 20) * scale);
  const orbRadius = Math.max(3, (config.orbRadius ?? 6) * scale);
  const orbiters = Math.max(1, Math.round(config.count ?? 3));
  const ringWidth = Math.max(1.2, (config.ringWidth ?? (orbitRadius * 0.18)));
  const ringColor = config.ringColor || 'rgba(168, 148, 255, 0.75)';
  const orbColor = config.orbColor || 'rgba(164, 140, 255, 0.88)';
  const coreColor = config.coreColor || 'rgba(12, 8, 24, 0.92)';
  const now = nowMs();
  const tau = Math.PI * 2;
  for(const handName of ['handL','handR']){
    const point = stick.pointsByName?.[handName];
    if(!point) continue;
    const info = state?.hands?.[handName];
    let rotation = Number.isFinite(info?.angle)
      ? info.angle
      : (now / 1000) * (config.spin ?? 3.8);
    ctx.save();
    ctx.globalAlpha = config.ringAlpha ?? 0.65;
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = ringColor;
    ctx.beginPath();
    ctx.arc(point.x, point.y, orbitRadius * 0.85, 0, tau);
    ctx.stroke();
    ctx.restore();
    for(let i=0;i<orbiters;i++){
      const angle = rotation + (tau / orbiters) * i;
      const ox = point.x + Math.cos(angle) * orbitRadius;
      const oy = point.y + Math.sin(angle) * orbitRadius;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(angle * 1.1);
      const gradient = ctx.createRadialGradient(0, 0, orbRadius * 0.25, 0, 0, orbRadius);
      gradient.addColorStop(0, coreColor);
      gradient.addColorStop(1, orbColor);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, orbRadius, orbRadius * 0.78, 0, 0, tau);
      ctx.fill();
      ctx.lineWidth = Math.max(1, orbRadius * 0.35);
      ctx.strokeStyle = orbColor;
      ctx.beginPath();
      ctx.arc(0, 0, orbRadius * 0.7, 0, tau);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawBoxingGloveHands(ctx, stick, weapon){
  if(!ctx || !stick || !weapon) return;
  const glove = weapon.boxingGlove || {};
  if(glove.fireWave){
    drawGlovePyreAura(ctx, stick, glove, weapon);
  }
  drawPunchTrails(ctx, stick);
  const scale = typeof STICK_SCALE === 'number' && STICK_SCALE > 0 ? STICK_SCALE : 1;
  const baseColor = glove.handColor || weapon.color || '#ff8a45';
  const highlight = glove.handHighlightColor || weapon.highlightColor || '#ffe4c7';
  const outline = glove.handOutlineColor || 'rgba(0, 0, 0, 0.45)';
  for(const handName of ['handL','handR']){
    const point = stick.pointsByName?.[handName];
    if(!point) continue;
    ctx.save();
    ctx.translate(point.x, point.y);
    const radius = Math.max(6, (glove.handRadius ?? 9) * scale);
    const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(1, baseColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, radius * 0.28);
    ctx.strokeStyle = outline;
    ctx.stroke();
    if(glove.handGlowColor){
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = glove.handGlowColor;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.32, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  if(glove.voidOrbit){
    drawGloveVoidOrbit(ctx, stick, glove);
  }
}

function drawPunchTrails(ctx, stick){
  if(!ctx || !stick) return;
  if(!isHighGraphicsEnabled(stick.world)) return;
  const state = stick.punchState;
  if(!state || !state.hands) return;
  const now = nowMs();
  const weapon = typeof stick.weapon === 'function' ? stick.weapon() : null;
  const glove = weapon?.boxingGlove || null;
  const color = glove?.trailColor || stick.accentColor || stick.bodyColor || '#f4f7ff';
  const baseWidth = Math.max(2.2, (glove?.trailWidth ?? 8) * STICK_SCALE);
  const baseAlpha = glove?.trailAlpha ?? 0.75;
  for(const handName of ['handL','handR']){
    const info = state.hands[handName];
    if(!info || !info.forward) continue;
    const trail = info.trail;
    if(!Array.isArray(trail) || trail.length < 2) continue;
    const life = info.trailLife ?? 180;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    for(let i=1;i<trail.length;i++){
      const prev = trail[i - 1];
      const curr = trail[i];
      const age = now - curr.time;
      const prevAge = now - prev.time;
      if(age > life && prevAge > life) continue;
      const alpha = Math.max(0, 1 - age / life);
      const prevAlpha = Math.max(0, 1 - prevAge / life);
      const segmentAlpha = Math.max(alpha, prevAlpha) * baseAlpha;
      if(segmentAlpha <= 0) continue;
      ctx.globalAlpha = segmentAlpha * 0.55;
      ctx.lineWidth = baseWidth * 1.6;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      ctx.globalAlpha = segmentAlpha;
      ctx.lineWidth = baseWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGunWeapon(ctx, stick, weapon, weaponId){
  if(!ctx || !stick || !weapon) return;
  const handName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const hand = stick.pointsByName?.[handName];
  if(!hand) return;
  let aimTarget = null;
  if(stick.world && stick.world.selected === stick && stick.world.input?.aim){
    aimTarget = { x: stick.world.input.aim.x, y: stick.world.input.aim.y };
  }else if(stick.lastGunAim){
    aimTarget = { x: stick.lastGunAim.x, y: stick.lastGunAim.y };
  }
  if(!aimTarget){
    aimTarget = { x: hand.x + (stick.dir >= 0 ? 160 : -160), y: hand.y - 12 };
  }
  const angle = Math.atan2(aimTarget.y - hand.y, aimTarget.x - hand.x);
  const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle);
  drawGunSpriteById(ctx, weapon, weaponId, scale);
  ctx.restore();
}

function drawGunSpriteById(ctx, weapon, weaponId, scale){
  switch(weaponId){
    case 'emberPistol':
      drawEmberPistolSprite(ctx, weapon, scale);
      break;
    case 'apiaryBlaster':
      drawApiaryBlasterSprite(ctx, weapon, scale);
      break;
    case 'sanguineRepeater':
      drawSanguineRepeaterSprite(ctx, weapon, scale);
      break;
    case 'sniperRifle':
      drawSniperRifleSprite(ctx, weapon, scale);
      break;
    default:
      drawGenericGunSprite(ctx, weapon, scale);
      break;
  }
}

function drawWeaponInventorySprite(ctx, weaponId, weapon, opts={}){
  if(!ctx || !weapon) return;
  const size = opts.size ?? 40;
  const originX = opts.originX ?? size * 0.28;
  const originY = opts.originY ?? size * 0.74;
  const rotation = opts.rotation ?? Math.PI / 4;
  const unitScale = opts.scale ?? (size / 40);
  const spriteScale = opts.spriteScale ?? Math.max(0.6, unitScale * 0.9);
  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(rotation);
  switch(weapon.kind){
    case 'gun':
      drawGunSpriteById(ctx, weapon, weaponId, spriteScale);
      break;
    case 'bow':
      renderBowIdleSprite(ctx, weapon, { x: 0, y: 0 }, { x: 1, y: 0 }, {
        limbLength: 28 * unitScale,
        gripOffset: 3 * unitScale,
        lineScale: Math.max(0.28, spriteScale * 0.6),
        stringOffset: 1.4 * unitScale,
        stringRelax: 0.6 * unitScale,
        gripLength: 12 * unitScale,
        curvePull: 5 * unitScale,
        gripWidth: Math.max(1.6, 3.2 * spriteScale)
      });
      break;
    case 'melee':
      drawMeleeInventorySprite(ctx, weapon, unitScale);
      break;
    case 'staff':
      drawStaffInventorySpriteIcon(ctx, weapon, unitScale);
      break;
    case 'spirit':
      drawSpiritInventorySprite(ctx, weapon, unitScale);
      break;
    case 'summoner':
      drawSummonerBookSprite(ctx, weapon, unitScale);
      break;
    default:
      drawGenericInventorySprite(ctx, weapon, unitScale);
      break;
  }
  ctx.restore();
}

function drawSummonerBookWeapon(ctx, stick, weapon){
  const handName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const hand = stick.pointsByName[handName];
  if(!hand) return;
  const elbowName = handName === 'handR' ? 'elbowR' : 'elbowL';
  const elbow = stick.pointsByName[elbowName];
  const angle = elbow ? Math.atan2(hand.y - elbow.y, hand.x - elbow.x) : (stick.dir >= 0 ? -Math.PI / 2 : -Math.PI / 2);
  const scale = (typeof STICK_SCALE === 'number' && STICK_SCALE > 0) ? STICK_SCALE : 1;
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(angle - Math.PI / 2);
  drawSummonerBookShape(ctx, weapon, scale);
  ctx.restore();
}

function drawSummonerBookSprite(ctx, weapon, scale){
  ctx.save();
  ctx.rotate(-Math.PI / 6);
  drawSummonerBookShape(ctx, weapon, scale * 1.1);
  ctx.restore();
}

function drawSummonerBookShape(ctx, weapon, scale){
  const width = 18 * scale;
  const height = 24 * scale;
  const cover = weapon.color || '#cbb6ff';
  const trim = weapon.bookTrimColor || '#f8efff';
  const pages = weapon.bookPageColor || '#fdf8ff';
  const rune = weapon.bookRuneColor || '#8b7bd6';
  ctx.fillStyle = cover;
  ctx.fillRect(-width * 0.5, -height, width, height);
  ctx.fillStyle = trim;
  ctx.fillRect(-width * 0.5, -height, width, height * 0.22);
  ctx.fillStyle = pages;
  ctx.fillRect(-width * 0.46, -height * 0.82, width * 0.92, height * 0.68);
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(0.8, 1.4 * scale);
  ctx.strokeRect(-width * 0.5, -height, width, height);
  ctx.strokeStyle = rune;
  ctx.lineWidth = Math.max(0.6, 1.1 * scale);
  ctx.beginPath();
  ctx.moveTo(-width * 0.22, -height * 0.7);
  ctx.lineTo(width * 0.2, -height * 0.34);
  ctx.moveTo(width * 0.14, -height * 0.74);
  ctx.lineTo(-width * 0.18, -height * 0.3);
  ctx.stroke();
  ctx.fillStyle = trim;
  ctx.fillRect(-width * 0.06, -height, width * 0.12, height);
  ctx.fillStyle = cover;
  ctx.fillRect(-width * 0.5, -height * 0.08, width, height * 0.08);
}

function drawMeleeInventorySprite(ctx, weapon, scale){
  const bladeLength = 28 * scale;
  const bladeWidth = 5 * scale;
  const tipLength = 6 * scale;
  const color = weapon.color || '#cfcfd2';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-bladeWidth * 0.4, 0);
  ctx.lineTo(bladeLength, -bladeWidth * 0.45);
  ctx.lineTo(bladeLength + tipLength, 0);
  ctx.lineTo(bladeLength, bladeWidth * 0.45);
  ctx.closePath();
  ctx.fill();
  if(typeof lightenColor === 'function'){
    ctx.strokeStyle = lightenColor(color, 0.18);
  }else{
    ctx.strokeStyle = '#f4f4f4';
  }
  ctx.lineWidth = Math.max(0.8, 1.2 * scale);
  ctx.stroke();
  const guardColor = weapon.guardColor
    || (typeof darkenColor === 'function' ? darkenColor(color, 0.25) : '#2f2320');
  ctx.strokeStyle = guardColor;
  ctx.lineWidth = Math.max(2, 3.2 * scale);
  ctx.beginPath();
  ctx.moveTo(-bladeWidth * 0.9, -bladeWidth * 0.6);
  ctx.lineTo(-bladeWidth * 0.9, bladeWidth * 0.6);
  ctx.stroke();
  ctx.fillStyle = guardColor;
  ctx.fillRect(-bladeWidth * 0.5, -bladeWidth * 0.3, bladeWidth * 0.6, bladeWidth * 1.2);
}

function drawStaffInventorySpriteIcon(ctx, weapon, scale){
  const shaftLength = 34 * scale;
  const shaftWidth = Math.max(2, 3 * scale);
  const color = weapon.color || '#d6cfc5';
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = shaftWidth;
  ctx.beginPath();
  ctx.moveTo(-shaftLength * 0.3, 0);
  ctx.lineTo(shaftLength * 0.7, 0);
  ctx.stroke();
  const gemRadius = Math.max(3, 4.2 * scale);
  const gemColor = weapon.staff?.gemColor
    || (typeof lightenColor === 'function' ? lightenColor(color, 0.25) : '#ffd36b');
  ctx.fillStyle = gemColor;
  ctx.beginPath();
  ctx.arc(shaftLength * 0.7, 0, gemRadius, 0, TAU);
  ctx.fill();
  const glowColor = weapon.staff?.beamGlow || weapon.staff?.beamColor || gemColor;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  ctx.beginPath();
  ctx.arc(shaftLength * 0.7, 0, gemRadius * 1.6, 0, TAU);
  ctx.stroke();
}

function drawSpiritInventorySprite(ctx, weapon, scale){
  const radius = Math.max(4, 5 * scale);
  const baseColor = weapon.orbColor || weapon.projectileColor || weapon.color || '#dff7ff';
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  const haloColor = weapon.orbTrailColor || weapon.projectileTrailColor || 'rgba(191,232,255,0.5)';
  ctx.strokeStyle = haloColor;
  ctx.lineWidth = Math.max(1.2, 2 * scale);
  ctx.beginPath();
  ctx.arc(-radius * 1.5, radius * 1.1, radius * 1.9, 0, TAU);
  ctx.stroke();
  if(typeof lightenColor === 'function'){
    ctx.fillStyle = lightenColor(baseColor, 0.18);
    ctx.beginPath();
    ctx.arc(-radius * 0.35, -radius * 0.45, radius * 0.6, 0, TAU);
    ctx.fill();
  }
}

function drawGenericInventorySprite(ctx, weapon, scale){
  const length = 30 * scale;
  const color = weapon.color || '#cfcfd2';
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-length * 0.4, 0);
  ctx.lineTo(length * 0.6, 0);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(length * 0.6, 0, Math.max(2.6, 3.4 * scale), 0, TAU);
  ctx.fill();
}

function drawHexagonPath(ctx, cx, cy, r){
  ctx.beginPath();
  for(let i = 0; i < 6; i++){
    const theta = Math.PI / 3 * i + Math.PI / 6;
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    if(i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawEmberPistolSprite(ctx, weapon, scale){
  const body = '#3b2a24';
  const grip = '#2b1c17';
  const accent = weapon.color || '#ff8a4b';
  const glow = weapon.projectileColor || '#ffd9b0';
  ctx.fillStyle = grip;
  ctx.fillRect(-3.8 * scale, -0.8 * scale, 4.8 * scale, 9 * scale);
  ctx.fillStyle = body;
  ctx.fillRect(-8 * scale, -3 * scale, 18 * scale, 6 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(4 * scale, -3.2 * scale, 9 * scale, 3.4 * scale);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(11.5 * scale, 0, 3.2 * scale, 1.7 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lightenColor ? lightenColor(accent, 0.18) : '#ffb77d';
  ctx.fillRect(-6.6 * scale, -2.2 * scale, 3.4 * scale, 1.6 * scale);
  ctx.strokeStyle = '#1b120e';
  ctx.lineWidth = Math.max(0.8, 1.2 * scale);
  ctx.strokeRect(-8 * scale, -3 * scale, 18 * scale, 6 * scale);
  ctx.strokeRect(-3.8 * scale, -0.8 * scale, 4.8 * scale, 9 * scale);
}

function drawApiaryBlasterSprite(ctx, weapon, scale){
  const body = '#5c4022';
  const trim = '#372411';
  const honey = weapon.color || '#ffe16d';
  const glow = weapon.projectileColor || '#fff6b8';
  ctx.fillStyle = trim;
  ctx.fillRect(-13 * scale, -2.4 * scale, 6 * scale, 4.8 * scale);
  ctx.fillStyle = body;
  ctx.fillRect(-10 * scale, -3 * scale, 22 * scale, 6 * scale);
  ctx.fillStyle = honey;
  ctx.strokeStyle = trim;
  ctx.lineWidth = Math.max(0.7, 0.9 * scale);
  drawHexagonPath(ctx, -2.5 * scale, 0, 2.4 * scale);
  ctx.fill();
  ctx.stroke();
  drawHexagonPath(ctx, 1.5 * scale, -1.8 * scale, 2.1 * scale);
  ctx.fill();
  ctx.stroke();
  drawHexagonPath(ctx, 1.5 * scale, 1.8 * scale, 2.1 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = glow;
  ctx.fillRect(9 * scale, -1.4 * scale, 7 * scale, 2.8 * scale);
  ctx.strokeRect(-10 * scale, -3 * scale, 22 * scale, 6 * scale);
  ctx.strokeRect(9 * scale, -1.4 * scale, 7 * scale, 2.8 * scale);
}

function drawSanguineRepeaterSprite(ctx, weapon, scale){
  const accent = weapon.color || '#c867ff';
  const energy = weapon.projectileColor || '#f4d3ff';
  const trim = '#2b0f33';
  ctx.fillStyle = trim;
  ctx.fillRect(-18 * scale, -2 * scale, 6 * scale, 4 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(-12 * scale, -2.2 * scale, 28 * scale, 4.4 * scale);
  ctx.fillStyle = energy;
  ctx.beginPath();
  ctx.ellipse(0, 0, 6 * scale, 2.1 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2f1537';
  ctx.fillRect(-4 * scale, 1.4 * scale, 4 * scale, 7.2 * scale);
  ctx.fillStyle = weapon.projectileTrailColor || '#dba3ff';
  ctx.fillRect(14 * scale, -1 * scale, 6 * scale, 2 * scale);
  ctx.strokeStyle = '#3b1045';
  ctx.lineWidth = Math.max(0.9, 1.2 * scale);
  ctx.strokeRect(-12 * scale, -2.2 * scale, 28 * scale, 4.4 * scale);
}

function drawSniperRifleSprite(ctx, weapon, scale){
  const body = '#1c2b42';
  const stock = '#121c2d';
  const barrel = '#bcd0ff';
  const scope = weapon.scopeColor || '#ffe066';
  ctx.fillStyle = stock;
  ctx.fillRect(-28 * scale, -2.4 * scale, 12 * scale, 4.8 * scale);
  ctx.fillStyle = body;
  ctx.fillRect(-18 * scale, -2.6 * scale, 44 * scale, 5.2 * scale);
  ctx.fillStyle = barrel;
  ctx.fillRect(20 * scale, -1.2 * scale, 20 * scale, 2.4 * scale);
  ctx.fillStyle = scope;
  ctx.beginPath();
  ctx.ellipse(4 * scale, -4.2 * scale, 7 * scale, 2.3 * scale, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0f1724';
  ctx.beginPath();
  ctx.moveTo(-24 * scale, 2.6 * scale);
  ctx.lineTo(-10 * scale, 2.6 * scale);
  ctx.lineTo(-4 * scale, 6.6 * scale);
  ctx.lineTo(-18 * scale, 6.6 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0b1320';
  ctx.lineWidth = Math.max(1, 1.3 * scale);
  ctx.strokeRect(-18 * scale, -2.6 * scale, 44 * scale, 5.2 * scale);
  ctx.strokeRect(20 * scale, -1.2 * scale, 20 * scale, 2.4 * scale);
}

function drawGenericGunSprite(ctx, weapon, scale){
  const body = '#2b2b2f';
  const accent = weapon?.color || '#cfcfd2';
  ctx.fillStyle = body;
  ctx.fillRect(-8 * scale, -2 * scale, 18 * scale, 4 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(6 * scale, -1 * scale, 8 * scale, 2 * scale);
  ctx.strokeStyle = '#16161a';
  ctx.lineWidth = Math.max(0.8, 1.1 * scale);
  ctx.strokeRect(-8 * scale, -2 * scale, 18 * scale, 4 * scale);
}

function drawSpiritWeaponOrbit(ctx, stick, weapon){
  if(!stick || !weapon) return;
  const state = stick.spiritState;
  if(!state || !Array.isArray(state.orbs) || state.orbs.length === 0) return;
  const center = (typeof stick._spiritOrbitCenter === 'function') ? stick._spiritOrbitCenter() : null;
  if(!center) return;
  const radius = state.radius ?? weapon.orbitRadius ?? 32;
  const haloColor = weapon.orbTrailColor || weapon.projectileTrailColor || 'rgba(191,232,255,0.4)';
  const baseColor = weapon.orbColor || weapon.projectileColor || weapon.color || '#dff7ff';
  const outlineColor = weapon.color || '#bfe8ff';
  const orbRadius = weapon.orbRadius ?? 8;
  ctx.save();
  ctx.strokeStyle = haloColor;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
  const regenMs = Math.max(120, state.regenMs || weapon.orbRegenMs || 1500);
  for(let i=0;i<state.orbs.length;i++){
    const orb = state.orbs[i];
    if(!orb) continue;
    const angle = (state.rotation || 0) + (orb.slotAngle || 0);
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    const remaining = Math.max(0, orb.regenRemaining ?? 0);
    const ready = !!orb.ready;
    const ratio = ready ? 1 : clamp(1 - remaining / regenMs, 0, 1);
    const alpha = ready ? 1 : clamp(0.25 + ratio * 0.75, 0.25, 0.9);
    const size = orbRadius * clamp(0.42 + ratio * 0.6, 0.42, 1.05);
    ctx.save();
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = haloColor;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPixelStick(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const dir = stick.dir >= 0 ? 1 : -1;
  const baseColor = stick.bodyColor || '#74d9ff';
  const outline = stick.accentColor || '#1b1f32';
  const scale = Math.max(2, 4 * STICK_SCALE);
  ctx.save();
  ctx.translate(pelvis.x, pelvis.y + offsetY - 10 * scale);
  ctx.scale(dir, 1);
  ctx.fillStyle = outline;
  ctx.fillRect(-7*scale-1, -58*scale-1, 14*scale+2, 14*scale+2);
  ctx.fillRect(-6*scale-1, -44*scale-1, 12*scale+2, 26*scale+2);
  ctx.fillRect(-10*scale-1, -18*scale-1, 8*scale+2, 26*scale+2);
  ctx.fillRect(2*scale-1, -18*scale-1, 8*scale+2, 26*scale+2);
  ctx.fillRect(-6*scale-1, 6*scale-1, 5*scale+2, 22*scale+2);
  ctx.fillRect(1*scale-1, 6*scale-1, 5*scale+2, 22*scale+2);
  ctx.fillStyle = baseColor;
  ctx.fillRect(-7*scale, -58*scale, 14*scale, 14*scale);
  ctx.fillRect(-6*scale, -44*scale, 12*scale, 26*scale);
  ctx.fillRect(-10*scale, -18*scale, 8*scale, 26*scale);
  ctx.fillRect(2*scale, -18*scale, 8*scale, 26*scale);
  ctx.fillRect(-6*scale, 6*scale, 5*scale, 22*scale);
  ctx.fillRect(1*scale, 6*scale, 5*scale, 22*scale);
  ctx.fillStyle = '#0c101e';
  ctx.fillRect(-4*scale, -54*scale, 3*scale, 3*scale);
  ctx.fillRect(1*scale, -54*scale, 3*scale, 3*scale);
  ctx.fillStyle = '#ffd36b';
  ctx.fillRect(-2*scale, -36*scale, 4*scale, 8*scale);
  ctx.restore();
}

const PIXELATED_STICK_BUFFER = {
  canvas: null,
  ctx: null,
  width: 0,
  height: 0
};

function acquirePixelatedStickBuffer(width, height){
  if(!(width > 0 && height > 0)) return null;
  if(typeof document === 'undefined') return null;
  if(!PIXELATED_STICK_BUFFER.canvas){
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    PIXELATED_STICK_BUFFER.canvas = canvas;
    PIXELATED_STICK_BUFFER.ctx = context;
  }
  const canvas = PIXELATED_STICK_BUFFER.canvas;
  const context = PIXELATED_STICK_BUFFER.ctx;
  if(!canvas || !context) return null;
  if(canvas.width !== width || canvas.height !== height){
    canvas.width = width;
    canvas.height = height;
  }
  if('imageSmoothingEnabled' in context){
    context.imageSmoothingEnabled = false;
  }
  return PIXELATED_STICK_BUFFER;
}

function computeStickPixelBounds(stick, margin){
  if(!stick) return null;
  const points = Array.isArray(stick.points) ? stick.points : null;
  if(!points || !points.length) return null;
  const pad = Number.isFinite(margin) ? Math.max(0, margin) : 28;
  const offsetY = stick.renderOffsetY ?? 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const addPoint = (x, y)=>{
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;
    if(x < minX) minX = x;
    if(y < minY) minY = y;
    if(x > maxX) maxX = x;
    if(y > maxY) maxY = y;
  };
  for(const point of points){
    if(!point) continue;
    addPoint(point.x, point.y);
    if(offsetY){
      addPoint(point.x, point.y + offsetY);
    }
  }
  if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)){
    return null;
  }
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function drawPixelatedRigStick(ctx, stick, options){
  if(!ctx || !stick) return;
  const bounds = computeStickPixelBounds(stick, options?.margin ?? 32);
  if(!bounds){
    drawStickLimbs(ctx, stick);
    drawStickArmor(ctx, stick);
    drawStickPixelScarf(ctx, stick);
    drawStickHead(ctx, stick);
    if(stick.showWeapon !== false){
      drawStickWeaponTrail(ctx, stick);
    }
    drawStickOffhand(ctx, stick);
    return;
  }
  const pixelSizeRaw = options?.pixelSize ?? stick.renderPixelSize ?? stick.pixelRenderSize ?? null;
  const scale = typeof STICK_SCALE === 'number' && STICK_SCALE > 0 ? STICK_SCALE : 1;
  const pixelSize = Number.isFinite(pixelSizeRaw) && pixelSizeRaw > 0
    ? pixelSizeRaw
    : Math.max(2, 3.6 * scale);
  const width = Math.max(1, Math.ceil(bounds.width / pixelSize));
  const height = Math.max(1, Math.ceil(bounds.height / pixelSize));
  const buffer = acquirePixelatedStickBuffer(width, height);
  if(!buffer){
    drawStickLimbs(ctx, stick);
    drawStickArmor(ctx, stick);
    drawStickPixelScarf(ctx, stick);
    drawStickHead(ctx, stick);
    if(stick.showWeapon !== false){
      drawStickWeaponTrail(ctx, stick);
    }
    drawStickOffhand(ctx, stick);
    return;
  }
  const offCanvas = buffer.canvas;
  const offCtx = buffer.ctx;
  offCtx.setTransform(1, 0, 0, 1, 0, 0);
  offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
  offCtx.globalAlpha = 1;
  offCtx.globalCompositeOperation = 'source-over';
  if('filter' in offCtx){
    offCtx.filter = 'none';
  }
  offCtx.save();
  offCtx.setTransform(1 / pixelSize, 0, 0, 1 / pixelSize, -bounds.minX / pixelSize, -bounds.minY / pixelSize);
  const showWeapon = stick.showWeapon !== false;
  let sheathedSwordDrawn = false;
  if(showWeapon && stick.weaponSheathed){
    const rig = stick.weaponRig;
    const weapon = typeof stick.weapon === 'function' ? stick.weapon() : null;
    if(rig && rig.type === 'sword' && weapon){
      drawSheathedSword(offCtx, stick, weapon, rig);
      sheathedSwordDrawn = true;
    }
  }
  drawStickLimbs(offCtx, stick);
  drawStickArmor(offCtx, stick);
  drawStickPixelScarf(offCtx, stick);
  drawStickHead(offCtx, stick);
  if(showWeapon && !sheathedSwordDrawn){
    drawStickWeaponTrail(offCtx, stick);
  }
  drawStickOffhand(offCtx, stick);
  offCtx.restore();
  const prevSmoothing = typeof ctx.imageSmoothingEnabled === 'boolean' ? ctx.imageSmoothingEnabled : undefined;
  if('imageSmoothingEnabled' in ctx){
    ctx.imageSmoothingEnabled = false;
  }
  const drawX = Math.round(bounds.minX);
  const drawY = Math.round(bounds.minY);
  ctx.drawImage(offCanvas, drawX, drawY, offCanvas.width * pixelSize, offCanvas.height * pixelSize);
  if(prevSmoothing !== undefined){
    ctx.imageSmoothingEnabled = prevSmoothing;
  }
}

function drawStickPixelScarf(ctx, stick){
  if(!ctx || !stick) return;
  const config = stick.scarfConfig;
  if(!config) return;
  const renderStyle = stick.renderStyle || 'stick';
  const pixelOnly = config.pixelOnly !== undefined ? !!config.pixelOnly : true;
  if(pixelOnly && renderStyle !== 'pixelated' && renderStyle !== 'pixel'){ return; }
  const points = stick.pointsByName || {};
  const anchorName = typeof config.anchorJoint === 'string'
    ? config.anchorJoint
    : (typeof config.anchorPoint === 'string' ? config.anchorPoint : null);
  let anchorPoint = anchorName && points[anchorName] ? points[anchorName] : null;
  if(!anchorPoint) anchorPoint = points.neck || points.chest || points.head || null;
  if(!anchorPoint && typeof stick.center === 'function'){
    anchorPoint = stick.center();
  }
  if(!anchorPoint) return;
  const pixelSize = Math.max(1, Math.round(config.pixelSize ?? stick.renderPixelSize ?? stick.pixelRenderSize ?? 3));
  const segments = Math.max(4, Math.round(config.segments ?? 14));
  const spacingBase = Number.isFinite(config.segmentSpacing) ? config.segmentSpacing : pixelSize * 2.6;
  const amplitude = Number.isFinite(config.waveAmplitude) ? config.waveAmplitude : 6;
  const liftAmount = Number.isFinite(config.waveLift) ? config.waveLift : amplitude * 0.3;
  const waveFreq = Number.isFinite(config.waveFrequency) ? config.waveFrequency : 2.6;
  const liftFreq = Number.isFinite(config.waveLiftFrequency) ? config.waveLiftFrequency : 1.4;
  const dropPerSegment = Number.isFinite(config.dropPerSegment) ? config.dropPerSegment : pixelSize * 0.35;
  const fadeTail = Number.isFinite(config.fadeTail) ? config.fadeTail : 0.7;
  const waveTaper = clamp(Number.isFinite(config.waveTaper) ? config.waveTaper : 0.65, 0, 1.4);
  const spacingDecay = clamp(Number.isFinite(config.spacingDecay) ? config.spacingDecay : 0.28, 0, 0.95);
  const liftTaper = clamp(Number.isFinite(config.liftTaper) ? config.liftTaper : 0.45, 0, 1.2);
  const dropTaper = clamp(Number.isFinite(config.dropTaper) ? config.dropTaper : 0.4, 0, 1.2);
  const baseColor = config.color || '#f24a6e';
  const trailColor = config.trailColor || baseColor;
  const dir = stick.dir >= 0 ? 1 : -1;
  const flowDir = -dir;
  const timer = Number.isFinite(stick.specialTimer) ? stick.specialTimer : 0;
  const backOffset = Number.isFinite(config.anchorBackOffset) ? config.anchorBackOffset : pixelSize * 1.6;
  const anchorOffsetX = config.anchorOffsetX ?? (-dir * backOffset);
  const anchorX = anchorPoint.x + anchorOffsetX;
  const anchorY = anchorPoint.y + (config.anchorOffsetY ?? -4);
  ctx.save();
  for(let i=0;i<segments;i++){
    const progress = (i + 1) / segments;
    const taper = clamp(1 - waveTaper * progress, 0.18, 1);
    const localAmplitude = amplitude * taper;
    const liftScale = clamp(1 - liftTaper * progress, -1, 1);
    const localSpacing = Math.max(pixelSize, spacingBase * (1 - spacingDecay * progress));
    const dropScale = clamp(1 - dropTaper * progress, 0.2, 1);
    const sway = localAmplitude * Math.sin(timer * waveFreq + progress * 2.3 + (config.wavePhaseOffset || 0));
    const lift = liftAmount * liftScale * Math.sin(timer * liftFreq + progress * 3.1);
    const px = anchorX + flowDir * localSpacing * (i + 1) + sway;
    const py = anchorY + lift + dropPerSegment * dropScale * i;
    const snappedX = Math.round(px / pixelSize) * pixelSize;
    const snappedY = Math.round(py / pixelSize) * pixelSize;
    const alpha = clamp(1 - progress * fadeTail, 0.28, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = trailColor;
    ctx.fillRect(snappedX, snappedY, pixelSize, pixelSize);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = baseColor;
  const collarWidth = Math.max(pixelSize * 2, Math.round(config.collarWidth ?? pixelSize * 2));
  const collarX = Math.round(anchorX / pixelSize) * pixelSize - Math.round(collarWidth * 0.5);
  const collarY = Math.round((anchorY - pixelSize) / pixelSize) * pixelSize;
  ctx.fillRect(collarX, collarY, collarWidth, pixelSize * 2);
  ctx.restore();
}

function drawToonStick(ctx, stick){
  const pelvis = stick.pelvis();
  const neck = stick.pointsByName?.neck;
  const head = stick.pointsByName?.head;
  const offsetY = stick.renderOffsetY ?? 0;
  if(!pelvis || !neck) return;
  const baseColor = stick.bodyColor || '#ffe0a8';
  const accent = stick.accentColor || '#2b1d11';
  const highlight = 'rgba(255,255,255,0.35)';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(8, 12 * STICK_SCALE);
  const limbSets = [
    ['pelvis','kneeL'],
    ['pelvis','kneeR'],
    ['neck','elbowL','handL'],
    ['neck','elbowR','handR']
  ];
  for(const seg of limbSets){
    ctx.beginPath();
    const start = stick.pointsByName[seg[0]];
    if(!start) continue;
    ctx.moveTo(start.x, start.y + offsetY);
    for(let i=1;i<seg.length;i++){
      const p = stick.pointsByName[seg[i]];
      if(!p) continue;
      ctx.lineTo(p.x, p.y + offsetY);
    }
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(12, 18 * STICK_SCALE);
  ctx.beginPath();
  ctx.moveTo(pelvis.x, pelvis.y + offsetY);
  ctx.lineTo(neck.x, neck.y + offsetY);
  ctx.stroke();
  if(head){
    const radius = Math.max(16, 26 * STICK_SCALE);
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(head.x, head.y + offsetY, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1c1424';
    ctx.beginPath();
    ctx.arc(head.x - radius*0.3, head.y + offsetY - radius*0.1, radius*0.2, 0, TAU);
    ctx.arc(head.x + radius*0.3, head.y + offsetY - radius*0.1, radius*0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.arc(head.x - radius*0.15, head.y + offsetY - radius*0.55, radius*0.22, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawOutlineStick(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const glow = stick.accentColor || '#54f0ff';
  const base = stick.bodyColor || '#152438';
  const lines = [
    ['kneeL','pelvis'],
    ['pelvis','kneeR'],
    ['handL','elbowL','neck','elbowR','handR']
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(3, 6 * STICK_SCALE);
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  for(const seg of lines){
    const start = stick.pointsByName[seg[0]];
    if(!start) continue;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y + offsetY);
    for(let i=1;i<seg.length;i++){
      const p = stick.pointsByName[seg[i]];
      if(!p) continue;
      ctx.lineTo(p.x, p.y + offsetY);
    }
    ctx.stroke();
  }
  const head = stick.pointsByName?.head;
  if(head){
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(head.x, head.y + offsetY, 18 * STICK_SCALE, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(head.x, head.y + offsetY, 28 * STICK_SCALE, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function formatEnemyKindName(kind){
  if(!kind) return 'Enemy';
  const spaced = kind
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if(!spaced) return 'Enemy';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatEnemyStatValue(value){
  if(!Number.isFinite(value)) return '—';
  const absValue = Math.abs(value);
  if(absValue >= 1000){
    const scaled = value / 1000;
    const formatted = scaled.toFixed(1);
    return `${formatted}k`;
  }
  const roundedInt = Math.round(value);
  const closeToInt = Math.abs(value - roundedInt) < 0.01;
  const raw = closeToInt ? `${roundedInt}` : (Math.round(value * 10) / 10).toFixed(1);
  return raw.replace(/0+$/, '').replace(/\.$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function baseWeaponDamageEstimate(weapon){
  if(!weapon || typeof weapon !== 'object') return 0;
  const prioritized = [
    weapon.baseDamage,
    weapon.dmg,
    weapon.projectileDamage,
    weapon.contactDamage,
    weapon.summonDamage,
    weapon.guardianBaseDamage,
    weapon.damage
  ];
  for(const candidate of prioritized){
    if(Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  if(weapon.charge){
    if(Number.isFinite(weapon.charge.maxDamage) && weapon.charge.maxDamage > 0) return weapon.charge.maxDamage;
    if(Number.isFinite(weapon.charge.minDamage) && weapon.charge.minDamage > 0) return weapon.charge.minDamage;
  }
  if(Array.isArray(weapon.shots)){
    for(const shot of weapon.shots){
      if(!shot || typeof shot !== 'object') continue;
      if(Number.isFinite(shot.damage) && shot.damage > 0) return shot.damage;
      if(Number.isFinite(shot.dmg) && shot.dmg > 0) return shot.dmg;
    }
  }
  return 0;
}

function resolveStickWeaponElement(attacker, weapon){
  if(weapon && typeof weapon === 'object'){
    if(weapon.element) return weapon.element;
    if(weapon.staff && weapon.staff.element) return weapon.staff.element;
    if(weapon.projectileElement) return weapon.projectileElement;
  }
  if(attacker && attacker.element) return attacker.element;
  return 'physical';
}

function estimateAttackOutcome(attacker, target){
  if(!attacker || !target || typeof computeDamage !== 'function') return null;
  const weapon = typeof attacker.weapon === 'function' ? attacker.weapon() : null;
  let baseDamage = baseWeaponDamageEstimate(weapon);
  if(!Number.isFinite(baseDamage) || baseDamage <= 0) baseDamage = 1;
  const element = resolveStickWeaponElement(attacker, weapon);
  const resisted = typeof target.resistsElement === 'function' ? target.resistsElement(element) : false;
  const finalDamage = resisted ? 0 : computeDamage(attacker, target, baseDamage);
  return { baseDamage, finalDamage, element, resisted };
}

function stickResistancesList(stick){
  if(stick && typeof stick.resistanceList === 'function') return stick.resistanceList();
  if(stick && Array.isArray(stick.resistances)) return stick.resistances.slice();
  return [];
}

function drawStickLabel(ctx, stick){
  if(!ctx || !stick) return;
  const world = stick.world || null;
  const hovered = !!(world && world.hoverStick === stick);
  const showStats = hovered && stick.isEnemy && !stick.dead;
  const hasLabel = typeof stick.label === 'string' && stick.label.trim().length;
  if(!showStats && !hasLabel) return;
  const head = stick.pointsByName?.head;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
  const offsetY = stick.renderOffsetY ?? 0;
  const x = head ? head.x : pelvis?.x;
  let y = head ? head.y + offsetY - 40 * STICK_SCALE : pelvis ? pelvis.y + offsetY - 80 * STICK_SCALE : null;
  if(x === undefined || y === null) return;
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  if(showStats){
    const fontSize = Math.max(12, 16 * scale);
    const baseFont = `${fontSize}px "Arial"`;
    const boldFont = `bold ${fontSize}px "Arial"`;
    const lines = [];
    const name = hasLabel ? stick.label : formatEnemyKindName(stick.enemyKind || stick.kind || '');
    if(name) lines.push({ text: name, color: '#f4f3ff', font: boldFont });
    const currentHp = Number.isFinite(stick.hp) ? stick.hp : 0;
    const maxHp = Number.isFinite(stick.maxHp) ? stick.maxHp : (Number.isFinite(stick.maxHpBase) ? stick.maxHpBase : currentHp);
    lines.push({ text: `HP: ${formatEnemyStatValue(currentHp)} / ${formatEnemyStatValue(maxHp)}`, color: '#c7d8ff', font: baseFont });
    const attackValue = Number.isFinite(stick.attack) ? stick.attack : (Number.isFinite(stick.attackBase) ? stick.attackBase : null);
    const attackLine = { text: `ATK: ${formatEnemyStatValue(attackValue)}`, color: '#c7d8ff', font: baseFont };
    const defenseValue = Number.isFinite(stick.defense) ? stick.defense : (Number.isFinite(stick.defenseBase) ? stick.defenseBase : null);
    const defenseLine = { text: `DEF: ${formatEnemyStatValue(defenseValue)}`, color: '#c7d8ff', font: baseFont };
    lines.push(attackLine, defenseLine);

    const resistances = stickResistancesList(stick);
    if(resistances.length){
      const labels = resistances.map(key=>{
        if(typeof resolveElementLabel === 'function') return resolveElementLabel(key);
        const normalized = String(key || '').trim();
        return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown';
      }).join(', ');
      lines.push({ text: `Resist: ${labels}`, color: '#e3e7ff', font: baseFont });
    }

    const viewer = world?.selected && !world.selected.dead ? world.selected : null;
    if(viewer && viewer !== stick){
      const attackEval = estimateAttackOutcome(viewer, stick);
      const defenseTooHigh = attackEval && attackEval.baseDamage > 0 && !attackEval.resisted && attackEval.finalDamage <= 0;
      if(defenseTooHigh){
        defenseLine.font = boldFont;
        defenseLine.color = '#ff6b6b';
      }
      const enemyAttackEval = estimateAttackOutcome(stick, viewer);
      const attackCannotHarmPlayer = enemyAttackEval
        ? (enemyAttackEval.baseDamage <= 0 || enemyAttackEval.finalDamage <= 0)
        : (Number.isFinite(stick.attack) ? stick.attack <= 0 : false);
      if(attackCannotHarmPlayer){
        attackLine.font = boldFont;
        attackLine.color = '#7cc4ff';
      }
    }else if(Number.isFinite(stick.attack) && stick.attack <= 0){
      attackLine.font = boldFont;
      attackLine.color = '#7cc4ff';
    }

    ctx.save();
    ctx.font = baseFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lineHeight = Math.max(fontSize * 0.9, 16 * scale);
    const paddingX = Math.max(6, 8 * scale);
    const paddingY = Math.max(4, 6 * scale);
    let width = 0;
    for(const line of lines){
      ctx.font = line.font || baseFont;
      const metrics = ctx.measureText(line.text);
      width = Math.max(width, metrics.width);
    }
    const boxWidth = width + paddingX * 2;
    const boxHeight = lineHeight * lines.length + paddingY * 2;
    const rectX = x - boxWidth / 2;
    const rectY = y - boxHeight;
    ctx.fillStyle = 'rgba(9, 16, 28, 0.78)';
    ctx.strokeStyle = 'rgba(107, 209, 255, 0.5)';
    ctx.lineWidth = Math.max(1, 1.2 * scale);
    ctx.fillRect(rectX, rectY, boxWidth, boxHeight);
    ctx.strokeRect(rectX, rectY, boxWidth, boxHeight);
    let ty = rectY + paddingY;
    for(const line of lines){
      ctx.font = line.font || baseFont;
      ctx.fillStyle = line.color || '#c7d8ff';
      ctx.fillText(line.text, x, ty);
      ty += lineHeight;
    }
    ctx.restore();
    return;
  }
  if(!hasLabel) return;
  ctx.save();
  ctx.font = `${Math.max(12, 16 * scale)}px "Arial"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 4;
  const textAlpha = hovered ? 0.75 : 0.25;
  const strokeAlpha = hovered ? 0.6 : 0.18;
  ctx.strokeStyle = `rgba(12, 14, 22, ${strokeAlpha})`;
  ctx.fillStyle = `rgba(244, 243, 255, ${textAlpha})`;
  ctx.strokeText(stick.label, x, y);
  ctx.fillText(stick.label, x, y);
  ctx.restore();
}

function drawRollerEnemy(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const radius = Math.max(20, stick.rollRadius || 30);
  const offsetY = stick.renderOffsetY ?? 0;
  const centerX = pelvis.x;
  const centerY = pelvis.y + offsetY - radius * 0.18;
  const baseColor = stick.bodyColor || '#e3d7c7';
  const accent = stick.accentColor || '#d99540';
  const highlight = lightenColor(baseColor, 0.32);
  const shade = darkenColor(baseColor, 0.28);
  const strap = darkenColor(accent, 0.16);
  const sprite = [
    '....1111....',
    '...12AA21...',
    '..12A33A21..',
    '.12AA333AA21.',
    '.12AA333AA21.',
    '..12A33A21..',
    '...12AA21...',
    '....1111....'
  ];
  const palette = {
    '1': highlight,
    '2': baseColor,
    '3': shade,
    'A': strap
  };
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(stick.rollPhase || 0);
  const scale = (radius * 2) / sprite[0].length;
  ctx.scale(scale, scale);
  ctx.translate(-sprite[0].length / 2, -sprite.length / 2);
  drawPixelSprite(ctx, sprite, palette);
  ctx.restore();

  const face = [
    '............',
    '............',
    '..44....44..',
    '..44....44..',
    '...5....5...',
    '............',
    '............',
    '............'
  ];
  const facePalette = {
    '4': '#1c1916',
    '5': lightenColor(accent, 0.48)
  };
  ctx.save();
  ctx.translate(centerX, centerY);
  const faceScale = (radius * 2) / face[0].length;
  ctx.scale(faceScale, faceScale);
  ctx.translate(-face[0].length / 2, -face.length / 2);
  drawPixelSprite(ctx, face, facePalette);
  ctx.restore();

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(stick.rollPhase || 0);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, radius * 0.18);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.68, 0);
  ctx.lineTo(radius * 0.68, 0);
  ctx.stroke();
  ctx.restore();
}

function drawSandShadeEnemy(ctx, stick){
  if(!stick) return;
  const center = stick.center();
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const width = Math.max(70, (stick.blockWidth || 86) * 0.9);
  const height = Math.max(82, (stick.blockHeight || 96) * 1.05);
  const baseColor = stick.bodyColor || '#d9c88c';
  const accent = stick.accentColor || '#b79a5b';
  const highlight = lightenColor(baseColor, 0.24);
  const shade = darkenColor(baseColor, 0.25);
  const aura = lightenColor(accent, 0.36);
  const sprite = [
    '.....11.....',
    '....1221....',
    '...122221...',
    '..12233221..',
    '.1223333321.',
    '.1223444321.',
    '..12A44A21..',
    '.12AA55AA21.',
    '.12A2332A21.',
    '..1A2222A1..',
    '...122221...',
    '..122..221..',
    '.12......21.',
    '.1........1.'
  ];
  const palette = {
    '1': highlight,
    '2': baseColor,
    '3': shade,
    '4': lightenColor(accent, 0.3),
    '5': '#2f2416',
    'A': accent
  };
  const phase = stick.sandGlowPhase ?? (stick.sandGlowPhase = Math.random() * TAU);
  const sway = Math.sin(nowMs() / 520 + phase) * 6;
  const float = Math.sin(nowMs() / 480 + phase * 1.4) * 4;
  const left = center.x + sway - width * 0.5;
  const top = center.y + offsetY - height * 0.7 + float;

  ctx.save();
  ctx.shadowColor = aura;
  ctx.shadowBlur = 18;
  ctx.globalAlpha = 0.32;
  ctx.beginPath();
  ctx.ellipse(center.x + sway, top + height * 0.42, width * 0.52, height * 0.36, 0, 0, TAU);
  ctx.fillStyle = 'rgba(255, 248, 212, 0.16)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(left, top);
  const scaleX = width / sprite[0].length;
  const scaleY = height / sprite.length;
  ctx.scale(scaleX, scaleY);
  drawPixelSprite(ctx, sprite, palette);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = aura;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center.x + sway, top + height * 0.3, Math.max(width * 0.38, 18), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawTimeWraithEnemy(ctx, stick){
  if(!stick) return;
  const center = stick.center();
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const state = stick._timeWraithRenderState || (stick._timeWraithRenderState = {});
  if(!Number.isFinite(state.seed)) state.seed = Math.random() * TAU;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const baseRadius = Math.max(26, stick.orbRadius || 38);
  const auraRadius = baseRadius * 1.6;
  const accent = stick.accentColor || '#f5f7ff';
  const base = stick.bodyColor || '#1a102b';
  const awake = !!stick.timeWraithAwake;
  const count = state.count && state.count >= 3 && state.count <= 6 ? state.count : (state.count = Math.floor(3 + Math.random() * 4));
  if(!Array.isArray(state.orbits) || state.orbits.length !== count){
    state.orbits = [];
    for(let i=0;i<count;i++){
      state.orbits.push({
        offset: baseRadius * (0.65 + Math.random() * 0.45),
        size: baseRadius * (0.18 + Math.random() * 0.12),
        phase: Math.random() * TAU
      });
    }
  }
  const orbits = state.orbits;
  ctx.save();
  ctx.globalAlpha = awake ? 0.42 : 0.28;
  const aura = ctx.createRadialGradient(center.x, center.y + offsetY, baseRadius * 0.35, center.x, center.y + offsetY, auraRadius);
  aura.addColorStop(0, awake ? 'rgba(245,247,255,0.32)' : 'rgba(245,247,255,0.22)');
  aura.addColorStop(0.6, 'rgba(52,40,84,0.18)');
  aura.addColorStop(1, 'rgba(10,8,22,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY, auraRadius, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY, baseRadius * 0.6, 0, TAU);
  ctx.fill();
  ctx.restore();

  const angularSpeed = awake ? 0.0026 : 0.0012;
  for(let i=0;i<count;i++){
    const orbit = orbits[i];
    if(!orbit) continue;
    const angle = state.seed + orbit.phase + (i * TAU) / count + now * angularSpeed;
    const radius = orbit.offset;
    const size = orbit.size;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + offsetY + Math.sin(angle) * radius;
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.2, size * 0.4);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = awake ? 0.55 : 0.32;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, baseRadius * 0.18);
  ctx.setLineDash([baseRadius * 0.38, baseRadius * 0.26]);
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY, baseRadius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawSandBlockEnemy(ctx, stick){
  if(!stick) return;
  const center = stick.center();
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const width = Math.max(60, stick.blockWidth || 96);
  const height = Math.max(56, stick.blockHeight || 92);
  const baseColor = stick.bodyColor || '#d4c089';
  const accent = stick.accentColor || '#b79a5b';
  const outline = darkenColor(baseColor, 0.45);
  const highlight = lightenColor(baseColor, 0.32);
  const shade = darkenColor(baseColor, 0.22);
  const accentLight = lightenColor(accent, 0.36);
  const faceColor = '#2f2418';
  const sprite = [
    'CCCCCCCCCCCC',
    'C611111116C',
    'C12BB22BB21C',
    'C12B3333B21C',
    'C12B3333B21C',
    'C12BB22BB21C',
    'C1222222221C',
    'C1333333331C',
    'C1445555441C',
    'CCCCCCCCCCCC'
  ];
  const palette = {
    'C': outline,
    '1': highlight,
    '2': baseColor,
    '3': shade,
    'B': accent,
    '4': faceColor,
    '5': accentLight,
    '6': 'rgba(255,255,255,0.75)'
  };
  const left = center.x - width * 0.5;
  const top = center.y + offsetY - height * 0.6;
  ctx.save();
  ctx.translate(left, top);
  const scaleX = width / sprite[0].length;
  const scaleY = height / sprite.length;
  ctx.scale(scaleX, scaleY);
  drawPixelSprite(ctx, sprite, palette);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(left, top + height - height * 0.22, width, height * 0.18);
  ctx.fillStyle = lightenColor(highlight, 0.2);
  ctx.fillRect(left + width * 0.14, top + height * 0.18, width * 0.18, height * 0.08);
  ctx.restore();
}

function drawNeonStick(ctx, stick){
  const pelvis = stick.pelvis();
  const neck = stick.pointsByName?.neck;
  const head = stick.pointsByName?.head;
  if(!pelvis || !neck || !head) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const glow = stick.accentColor || '#54f0ff';
  const base = stick.bodyColor || '#06101f';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 22;
  const limbSets = [
    ['pelvis','kneeL'],
    ['pelvis','kneeR'],
    ['neck','elbowL','handL'],
    ['neck','elbowR','handR']
  ];
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(4, 7 * STICK_SCALE);
  for(const seg of limbSets){
    const start = stick.pointsByName[seg[0]];
    if(!start) continue;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y + offsetY);
    for(let i=1;i<seg.length;i++){
      const point = stick.pointsByName[seg[i]];
      if(!point) continue;
      ctx.lineTo(point.x, point.y + offsetY);
    }
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(10, 16 * STICK_SCALE);
  ctx.beginPath();
  ctx.moveTo(pelvis.x, pelvis.y + offsetY);
  ctx.lineTo(neck.x, neck.y + offsetY);
  ctx.stroke();

  ctx.shadowBlur = 28;
  const radius = Math.max(18, 26 * STICK_SCALE);
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.arc(head.x, head.y + offsetY, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(head.x, head.y + offsetY, radius + 10, 0, TAU);
  ctx.strokeStyle = glow;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawAlephGlyphEnemy(ctx, stick){
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const state = stick._alephState || {};
  const offsetY = stick.renderOffsetY ?? 0;
  const bodyColor = stick.bodyColor || '#ffffff';
  const accent = stick.accentColor || '#f0f0ff';
  const pulse = clamp(state.shieldPulse ?? 0, 0, 1);
  const shieldRadius = Math.max(100, state.shieldRadius || stick.shieldRadius || 140);
  const glowRadius = Math.max(60, shieldRadius * 0.75);
  ctx.save();
  const glowGradient = ctx.createRadialGradient(
    center.x,
    center.y + offsetY - 20,
    glowRadius * 0.35,
    center.x,
    center.y + offsetY - 20,
    glowRadius
  );
  glowGradient.addColorStop(0, `rgba(255,255,255,${0.18 + pulse * 0.25})`);
  glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y + offsetY - 20, glowRadius, 0, TAU);
  ctx.fill();
  ctx.restore();

  const solids = Array.isArray(state.solids) ? state.solids : [];
  const shieldAlpha = state.shieldActive ? 0.85 : 0.35 + pulse * 0.45;
  for(const solid of solids){
    if(!solid) continue;
    const angle = solid.angle ?? 0;
    const orbitShift = solid.orbitShift ?? 0;
    const radius = shieldRadius + orbitShift;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + offsetY + Math.sin(angle) * radius * 0.45;
    const size = Math.max(16, solid.size ?? (shieldRadius * 0.2));
    const spin = solid.spin ?? 1;
    const alpha = clamp(shieldAlpha * (solid.alpha ?? 1), 0, 1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((state.time || 0) * spin + angle * 0.5);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.4, size * 0.16);
    ctx.strokeStyle = accent;
    ctx.fillStyle = 'rgba(12, 12, 24, 0.45)';
    ctx.beginPath();
    if(solid.kind === 'triangle') traceRegularPolygon(ctx, 3, 0, 0, size, -Math.PI / 2);
    else if(solid.kind === 'square') traceRegularPolygon(ctx, 4, 0, 0, size, Math.PI / 4);
    else if(solid.kind === 'pentagon') traceRegularPolygon(ctx, 5, 0, 0, size, -Math.PI / 2);
    else if(solid.kind === 'hexagon') traceRegularPolygon(ctx, 6, 0, 0, size, 0);
    else traceStar(ctx, 5, 0, 0, size, size * 0.45, -Math.PI / 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(center.x, center.y + offsetY - 18);
  const scale = Math.max(1.1, (stick.sizeScale || 1) * 1.2);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-18, -40);
  ctx.lineTo(-2, -6);
  ctx.lineTo(-24, 44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, -46);
  ctx.lineTo(2, -8);
  ctx.lineTo(26, 42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 6);
  ctx.lineTo(26, -12);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(12, 12, 20, 0.45)';
  const shadowRadius = Math.max(22, shieldRadius * 0.25);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + offsetY + 40, shadowRadius, shadowRadius * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShinGlyphEnemy(ctx, stick){
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const bodyColor = stick.bodyColor || '#ffffff';
  const accent = stick.accentColor || '#f0f0ff';
  const state = stick._shinState || {};
  ctx.save();
  ctx.translate(center.x, center.y + offsetY - 12);
  const scale = Math.max(0.9, (stick.sizeScale || 1) * 0.92);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(-16, -34);
  ctx.lineTo(-6, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.lineTo(-6, -4);
  ctx.lineTo(6, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, -34);
  ctx.lineTo(8, 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, -8);
  ctx.lineTo(20, -22);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(center.x, center.y + offsetY);
  const progress = state.pendingStrike && state.pendingStrike.total
    ? clamp(1 - state.pendingStrike.timer / state.pendingStrike.total, 0, 1)
    : 0;
  const ringRadius = 24 + progress * 8;
  ctx.globalAlpha = 0.4 + progress * 0.5;
  ctx.lineWidth = 2.4;
  const arcColor = colorWithAlpha ? colorWithAlpha(accent, 0.8) : accent;
  ctx.strokeStyle = arcColor;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.25 + progress * 0.35;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 0.6, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawGlyphGyreEnemy(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const state = stick._glyphGyreState || {};
  if(typeof state.seed !== 'number') state.seed = Math.random() * TAU;
  const baseColor = stick.bodyColor || '#0c1321';
  const accent = stick.accentColor || '#8bd0ff';
  const coreColor = stick.glyphCoreColor || '#f3fbff';
  const origin = state.beamOrigin || { x: pelvis.x, y: pelvis.y + (stick.renderOffsetY ?? 0) };
  const originX = origin.x;
  const originY = origin.y;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const beamProgress = clamp(state.beamIntensity ?? state.beamProgress ?? 0, 0, 1);
  const easedBeam = beamProgress * beamProgress * (3 - 2 * beamProgress);
  const beamWidth = Math.max(stick.beamMinWidth || 12, state.beamWidth || 0);
  const orbRadius = Math.max(28, stick.orbRadius || 48);
  const glyphCount = Math.max(3, stick.orbGlyphCount || 9);
  const driftSpeed = Math.max(10, stick.orbDriftSpeed || 72);
  const glyphSymbols = state._glyphSymbols || (state._glyphSymbols = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','✶','✷','✸','✺','✻']);
  if(!Array.isArray(state.glyphOrbits)){
    state.glyphOrbits = [];
  }
  while(state.glyphOrbits.length < glyphCount){
    const idx = state.glyphOrbits.length;
    state.glyphOrbits.push({
      glyph: glyphSymbols[idx % glyphSymbols.length],
      radius: 0.45 + Math.random() * 0.55,
      speed: 0.45 + Math.random() * 0.9,
      phase: Math.random() * TAU
    });
  }
  if(state.glyphOrbits.length > glyphCount){
    state.glyphOrbits.length = glyphCount;
  }
  const glyphOrbits = state.glyphOrbits;
  const timeScale = driftSpeed / 96;

  if(state.beamTarget && (beamProgress > 0.02 || state.beamActive)){
    const startX = originX;
    const startY = originY;
    const endX = state.beamTarget.x;
    const endY = state.beamTarget.y;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    const brightAccent = colorWithAlpha ? colorWithAlpha(accent, 0.9) : accent;
    gradient.addColorStop(0, brightAccent);
    gradient.addColorStop(0.45, colorWithAlpha ? colorWithAlpha(coreColor, 0.95) : coreColor);
    gradient.addColorStop(1, colorWithAlpha ? colorWithAlpha(baseColor, 0.4) : baseColor);
    ctx.globalAlpha = clamp(0.28 + easedBeam * 0.58, 0.18, 0.94);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = beamWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = clamp(0.22 + easedBeam * 0.45, 0.18, 0.78);
    ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(coreColor, 0.9) : coreColor;
    ctx.lineWidth = Math.max(beamWidth * 0.52, 6);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  if(state.beamTarget && state.beamActive){
    ctx.save();
    ctx.globalAlpha = clamp(0.24 + easedBeam * 0.5, 0.18, 0.82);
    ctx.lineWidth = 2.2 + easedBeam * 2.8;
    ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(accent, 0.85) : accent;
    ctx.beginPath();
    ctx.arc(state.beamTarget.x, state.beamTarget.y, 14 + easedBeam * 28, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(state.beamTarget.x, state.beamTarget.y, 6 + easedBeam * 14, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(originX, originY);
  const idleTilt = Math.sin((now / 760) + (state.seed || 0)) * 0.08;
  ctx.rotate(idleTilt);
  const outerRadius = orbRadius;
  const innerRadius = outerRadius * 0.58;
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = colorWithAlpha ? colorWithAlpha(baseColor, 0.92) : baseColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, outerRadius * 0.95, outerRadius * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(8, 4, 20, 0.92)';
  ctx.beginPath();
  ctx.ellipse(0, 0, innerRadius * 0.92, innerRadius * 0.72, 0, 0, TAU);
  ctx.fill();

  for(const orbit of glyphOrbits){
    const speed = orbit.speed || 0.6;
    const angle = orbit.phase + (now / 1000) * speed * timeScale;
    const radius = outerRadius * orbit.radius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;
    const size = Math.max(16, outerRadius * 0.18 * (1 + easedBeam * 0.6));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    const glyphAlpha = clamp(0.36 + easedBeam * 0.48, 0.3, 0.92);
    ctx.globalAlpha = glyphAlpha;
    ctx.fillStyle = colorWithAlpha ? colorWithAlpha(accent, glyphAlpha) : accent;
    ctx.font = `${Math.round(size)}px 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(orbit.glyph, 0, 0);
    ctx.restore();
  }

  ctx.globalAlpha = clamp(0.24 + easedBeam * 0.3, 0.2, 0.7);
  ctx.lineWidth = 4.2 + easedBeam * 3.4;
  ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(accent, 0.58 + easedBeam * 0.3) : accent;
  const ringAngle = (now / 1000) * (driftSpeed / 48);
  ctx.beginPath();
  ctx.ellipse(0, 0, outerRadius * 1.12, outerRadius * 0.8, ringAngle, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = clamp(0.16 + easedBeam * 0.28, 0.14, 0.55);
  ctx.lineWidth = 2.4 + easedBeam * 2.4;
  ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(coreColor, 0.8) : coreColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, innerRadius * 0.9, innerRadius * 0.68, -ringAngle * 1.3, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = clamp(0.48 + easedBeam * 0.4, 0.4, 0.95);
  ctx.fillStyle = colorWithAlpha ? colorWithAlpha(coreColor, 0.9) : coreColor;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius * (0.6 + easedBeam * 0.25), 0, TAU);
  ctx.fill();
  if(beamProgress > 0.4){
    ctx.globalAlpha = clamp(0.25 + easedBeam * 0.35, 0.2, 0.65);
    ctx.strokeStyle = colorWithAlpha ? colorWithAlpha('#ffffff', 0.8) : '#ffffff';
    ctx.lineWidth = 1.8 + easedBeam * 2;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius * (0.68 + easedBeam * 0.2), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawGlyphOrbBoss(ctx, stick, config){
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const state = stick._glyphGyreState || {};
  const origin = state.beamOrigin || { x: center.x, y: center.y + offsetY };
  const originX = origin.x;
  const originY = origin.y;
  const baseColor = config.baseColor || '#0c1321';
  const accent = config.accentColor || '#8bd0ff';
  const fillColor = config.fillColor || baseColor;
  const outlineColor = config.outlineColor || accent;
  const symbol = config.symbol || '?';
  const symbolColor = config.symbolColor || '#ffffff';
  const symbolOutline = config.symbolOutline || null;
  const glowColor = config.glowColor || accent;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const orbRadius = Math.max(32, stick.orbRadius || config.orbRadius || 56);
  const beamProgress = clamp(state.beamIntensity ?? state.beamProgress ?? 0, 0, 1);
  const easedBeam = beamProgress * beamProgress * (3 - 2 * beamProgress);
  const beamWidth = Math.max(stick.beamMinWidth || 12, state.beamWidth || 0);

  if(state.beamTarget && (beamProgress > 0.02 || state.beamActive)){
    const startX = originX;
    const startY = originY;
    const endX = state.beamTarget.x;
    const endY = state.beamTarget.y;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    const brightAccent = colorWithAlpha ? colorWithAlpha(glowColor, 0.9) : glowColor;
    gradient.addColorStop(0, brightAccent);
    gradient.addColorStop(0.55, colorWithAlpha ? colorWithAlpha(fillColor, 0.9) : fillColor);
    gradient.addColorStop(1, colorWithAlpha ? colorWithAlpha(baseColor, 0.45) : baseColor);
    ctx.globalAlpha = clamp(0.26 + easedBeam * 0.6, 0.16, 0.92);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = beamWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.globalAlpha = clamp(0.2 + easedBeam * 0.5, 0.14, 0.78);
    ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(fillColor, 0.95) : fillColor;
    ctx.lineWidth = Math.max(beamWidth * 0.55, 6);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  if(state.beamTarget && state.beamActive){
    ctx.save();
    ctx.globalAlpha = clamp(0.24 + easedBeam * 0.52, 0.18, 0.84);
    ctx.lineWidth = 2.4 + easedBeam * 3;
    ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(glowColor, 0.85) : glowColor;
    ctx.beginPath();
    ctx.arc(state.beamTarget.x, state.beamTarget.y, 14 + easedBeam * 28, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(state.beamTarget.x, state.beamTarget.y, 6 + easedBeam * 16, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.3 + easedBeam * 0.18;
  ctx.fillStyle = 'rgba(12, 12, 24, 0.5)';
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + offsetY + orbRadius * 0.75, orbRadius * 0.95, orbRadius * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(originX, originY);
  const idleTilt = Math.sin((now / 780) + (state.seed || 0)) * 0.06;
  ctx.rotate(idleTilt);

  const glowRadius = orbRadius * (1.6 + easedBeam * 0.35);
  ctx.save();
  ctx.globalAlpha = 0.35 + easedBeam * 0.35;
  ctx.fillStyle = colorWithAlpha ? colorWithAlpha(glowColor, 0.25) : glowColor;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55 + easedBeam * 0.25;
  ctx.lineWidth = Math.max(2.4, orbRadius * 0.08);
  ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(glowColor, 0.8) : glowColor;
  const arcRadius = orbRadius * (1.3 + easedBeam * 0.2);
  const arcCount = config.arcCount || Math.max(5, Math.round((stick.orbGlyphCount || 8) * 0.75));
  const timeShift = (now / 1200) + (state.seed || 0);
  for(let i = 0; i < arcCount; i++){
    const arcSpan = 0.7 + (i % 3) * 0.18;
    const offset = timeShift * (0.6 + i * 0.05) + i * (TAU / arcCount);
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, offset, offset + arcSpan);
    ctx.stroke();
  }
  ctx.restore();

  const gradient = ctx.createRadialGradient(0, -orbRadius * 0.45, orbRadius * 0.3, 0, 0, orbRadius);
  gradient.addColorStop(0, colorWithAlpha ? colorWithAlpha(fillColor, 0.96) : fillColor);
  gradient.addColorStop(1, colorWithAlpha ? colorWithAlpha(baseColor, 0.95) : baseColor);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, orbRadius, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 0.92;
  ctx.lineWidth = Math.max(3, orbRadius * 0.12);
  ctx.strokeStyle = outlineColor;
  ctx.beginPath();
  ctx.arc(0, 0, orbRadius, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = colorWithAlpha ? colorWithAlpha('#ffffff', 0.6) : '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-orbRadius * 0.35, -orbRadius * 0.32, orbRadius * 0.38, orbRadius * 0.58, -0.7, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = 1;
  const fontSize = Math.max(24, orbRadius * 1.3);
  ctx.fillStyle = symbolColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${fontSize}px "Noto Serif", "Georgia", serif`;
  const symbolY = orbRadius * 0.05;
  if(symbolOutline){
    ctx.lineWidth = Math.max(1.2, fontSize * 0.08);
    ctx.strokeStyle = symbolOutline;
    if(typeof ctx.strokeText === 'function') ctx.strokeText(symbol, 0, symbolY);
  }
  ctx.fillText(symbol, 0, symbolY);

  ctx.restore();
}

function drawZetaGlyphBoss(ctx, stick){
  drawGlyphOrbBoss(ctx, stick, {
    baseColor: stick.bodyColor || '#dfe3ff',
    accentColor: stick.accentColor || '#7d8dff',
    fillColor: '#ffffff',
    outlineColor: colorWithAlpha ? colorWithAlpha('#151530', 0.85) : '#151530',
    glowColor: stick.accentColor || '#7d8dff',
    symbol: 'Ζ',
    symbolColor: '#151515',
    symbolOutline: colorWithAlpha ? colorWithAlpha('#7d8dff', 0.4) : '#7d8dff'
  });
}

function drawXiGlyphBoss(ctx, stick){
  drawGlyphOrbBoss(ctx, stick, {
    baseColor: stick.bodyColor || '#08080d',
    accentColor: stick.accentColor || '#9aa2ff',
    fillColor: '#0a0a12',
    outlineColor: colorWithAlpha ? colorWithAlpha('#f6f6ff', 0.85) : '#f6f6ff',
    glowColor: stick.accentColor || '#9aa2ff',
    symbol: 'Ξ',
    symbolColor: '#f4f6ff',
    symbolOutline: colorWithAlpha ? colorWithAlpha('#0a0a12', 0.45) : '#0a0a12'
  });
}

function drawThetaHarmonicBoss(ctx, stick){
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const state = stick._thetaState || {};
  const baseX = center.x;
  const baseY = center.y + offsetY;
  const lines = Array.isArray(state.lines) ? state.lines : [];
  if(lines.length){
    ctx.save();
    ctx.lineCap = 'round';
    for(const line of lines){
      if(!line) continue;
      const opacity = clamp(line.opacity ?? 0.85, 0, 1);
      if(opacity <= 0) continue;
      const startX = line.start ? line.start.x : baseX;
      const startY = (line.start ? line.start.y : center.y) + offsetY;
      const tipPoint = line.tip || line.anchor;
      if(!tipPoint) continue;
      const tipX = tipPoint.x;
      const tipY = tipPoint.y + offsetY;
      const width = Math.max(6, line.width ?? 20);
      const mode = line.mode || 'chain';
      const softPoints = mode === 'chain'
        ? (Array.isArray(line.softbody?.points) && line.softbody.points.length >= 2 ? line.softbody.points : null)
        : null;
      const strokeLinePath = ()=>{
        ctx.beginPath();
        if(softPoints){
          const firstPoint = softPoints[0];
          ctx.moveTo(firstPoint.x, firstPoint.y + offsetY);
          for(let i = 1; i < softPoints.length; i++){
            const point = softPoints[i];
            ctx.lineTo(point.x, point.y + offsetY);
          }
        }else{
          ctx.moveTo(startX, startY);
          ctx.lineTo(tipX, tipY);
        }
        ctx.stroke();
      };
      if(mode === 'telegraph'){
        ctx.save();
        ctx.globalAlpha = opacity * 0.65;
        const glowColor = line.glowColor || 'rgba(255, 188, 255, 0.45)';
        ctx.strokeStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = Math.max(6, width * 0.9);
        ctx.lineWidth = Math.max(2, width * 0.45);
        if(typeof ctx.setLineDash === 'function') ctx.setLineDash([12, 10]);
        strokeLinePath();
        if(typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
        ctx.restore();
      }else if(mode === 'beam'){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = opacity * 0.55;
        const glowColor = line.glowColor || 'rgba(255, 188, 255, 0.9)';
        ctx.strokeStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = Math.max(14, width * 1.35);
        ctx.lineWidth = Math.max(8, width * 0.9);
        strokeLinePath();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = line.coreColor || '#ff9df5';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = Math.max(10, width * 0.9);
        ctx.lineWidth = Math.max(3, width * 0.48);
        strokeLinePath();
        ctx.restore();
      }else{
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = opacity * 0.35;
        const glowColor = line.glowColor || 'rgba(255, 140, 232, 0.85)';
        ctx.strokeStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = Math.max(10, width * 1.1);
        ctx.lineWidth = Math.max(6, width * 0.75);
        strokeLinePath();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = line.coreColor || '#ff8de5';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = Math.max(8, width * 0.75);
        ctx.lineWidth = Math.max(2.4, width * 0.38);
        strokeLinePath();
        if(typeof ctx.setLineDash === 'function'){
          ctx.globalAlpha = opacity * 0.6;
          ctx.setLineDash([Math.max(6, width * 0.6), Math.max(4, width * 0.4)]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = Math.max(1.2, width * 0.22);
          strokeLinePath();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      ctx.save();
      const anchorAlpha = mode === 'telegraph' ? opacity * 0.35 : opacity * 0.6;
      ctx.globalAlpha = anchorAlpha;
      const anchorGlow = line.anchorGlow || 'rgba(255, 205, 255, 0.4)';
      ctx.fillStyle = anchorGlow;
      ctx.shadowColor = anchorGlow;
      ctx.shadowBlur = Math.max(8, width * 0.65);
      ctx.beginPath();
      ctx.arc(tipX, tipY, Math.max(4, width * (mode === 'telegraph' ? 0.18 : 0.25)), 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.translate(baseX, baseY);
  const baseRadius = Math.max(48, (stick.hitboxWidth || 140) * 0.32);
  const charge = clamp(state.charge ?? 0, 0, 1);
  const time = state.time ?? 0;
  const flicker = 1 + Math.sin(time * 5.1 + (state.glitch || 0)) * 0.05;
  const radius = baseRadius * (0.95 + charge * 0.18) * flicker;
  const glowRadius = radius * 1.55;
  const glowGradient = ctx.createRadialGradient(0, 0, radius * 0.18, 0, 0, glowRadius);
  glowGradient.addColorStop(0, 'rgba(255, 206, 148, 0.95)');
  glowGradient.addColorStop(0.48, 'rgba(255, 122, 226, 0.75)');
  glowGradient.addColorStop(1, 'rgba(68, 12, 54, 0.05)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, TAU);
  ctx.fill();
  const coreGradient = ctx.createRadialGradient(0, 0, radius * 0.12, 0, 0, radius);
  coreGradient.addColorStop(0, 'rgba(255, 244, 255, 0.96)');
  coreGradient.addColorStop(0.55, 'rgba(255, 152, 238, 0.82)');
  coreGradient.addColorStop(1, 'rgba(36, 8, 28, 0.82)');
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glitch = state.glitch || 0;
  ctx.lineWidth = Math.max(2.6, radius * 0.12);
  ctx.strokeStyle = 'rgba(255, 200, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (0.85 + Math.sin(glitch) * 0.05), radius * (0.7 + Math.cos(glitch * 1.4) * 0.04), glitch * 0.4, 0, TAU);
  ctx.stroke();
  ctx.restore();
  ctx.lineWidth = Math.max(4, radius * 0.18);
  ctx.strokeStyle = '#ffeefe';
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.58, radius * 0.74, 0, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = Math.max(3, radius * 0.14);
  ctx.beginPath();
  ctx.moveTo(-radius * 0.52, 0);
  ctx.lineTo(radius * 0.52, 0);
  ctx.stroke();
  ctx.globalAlpha = 0.32 + charge * 0.35;
  ctx.lineWidth = Math.max(1.6, radius * 0.08);
  ctx.strokeStyle = 'rgba(255, 168, 236, 0.9)';
  ctx.beginPath();
  ctx.moveTo(-radius * 0.4, -radius * 0.26);
  ctx.lineTo(radius * 0.4, -radius * 0.26);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGlyphSalmonEnemy(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const baseLength = 96;
  const baseHeight = 34;
  const length = stick.salmonLength || baseLength;
  const height = stick.salmonHeight || baseHeight;
  const facing = stick.dir >= 0 ? 1 : -1;
  const offsetY = (stick.renderOffsetY ?? 0) - 10;
  const cx = pelvis.x;
  const cy = pelvis.y + offsetY;
  const baseColor = stick.bodyColor || '#101c2a';
  const accent = stick.accentColor || '#8bd0ff';
  const outline = darkenColor ? darkenColor(baseColor, 0.4) : baseColor;
  const inner = lightenColor ? lightenColor(baseColor, 0.28) : baseColor;
  const now = nowMs();
  const velocity = pelvis.vx || 0;
  const sway = Math.sin(now / 220 + (velocity * 0.012) + (stick.glitchSeed || 0)) * 0.12;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);
  ctx.rotate(sway * 0.18);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = 'rgba(8, 12, 18, 1)';
  ctx.beginPath();
  ctx.ellipse(0, height * 0.86, length * 0.42, height * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  const bodyGradient = ctx.createLinearGradient(-length * 0.45, 0, length * 0.45, 0);
  const shimmer = 0.5 + 0.5 * Math.sin(now / 340 + (stick.glitchSeed || 0));
  bodyGradient.addColorStop(0, colorWithAlpha ? colorWithAlpha(accent, 0.18 + shimmer * 0.24) : accent);
  bodyGradient.addColorStop(0.4, inner);
  bodyGradient.addColorStop(0.9, lightenColor ? lightenColor(accent, 0.16) : accent);

  const halfLen = length * 0.5;
  const halfHeight = height * 0.5;

  ctx.beginPath();
  ctx.moveTo(-halfLen, 0);
  ctx.quadraticCurveTo(0, -height * 0.92, halfLen * 0.88, 0);
  ctx.quadraticCurveTo(0, height * 0.92, -halfLen, 0);
  ctx.closePath();
  ctx.fillStyle = bodyGradient;
  ctx.globalAlpha = 0.96;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = outline;
  ctx.stroke();

  const tailGradient = ctx.createLinearGradient(length * 0.26, 0, length * 0.66, 0);
  tailGradient.addColorStop(0, colorWithAlpha ? colorWithAlpha(accent, 0.48) : accent);
  tailGradient.addColorStop(1, colorWithAlpha ? colorWithAlpha(accent, 0.18) : accent);
  const tailSway = Math.sin(now / 140 + (stick.glitchSeed || 0) * 1.7) * height * 0.24;
  ctx.beginPath();
  ctx.moveTo(length * 0.26, 0);
  ctx.quadraticCurveTo(length * 0.56, tailSway, length * 0.68, height * 0.62);
  ctx.lineTo(length * 0.72, 0);
  ctx.lineTo(length * 0.68, -height * 0.62);
  ctx.quadraticCurveTo(length * 0.56, -tailSway, length * 0.26, 0);
  ctx.closePath();
  ctx.fillStyle = tailGradient;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-length * 0.28, -halfHeight * 0.8, height * 0.12, height * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(-length * 0.25, -halfHeight * 0.74, height * 0.06, height * 0.06, 0, 0, TAU);
  ctx.fill();

  const glyph = 'ΙΧΘΥΣ';
  ctx.save();
  ctx.font = `${Math.round(height * 0.9)}px 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for(let i=0; i<3; i++){
    const phase = now / 130 + (stick.glitchSeed || 0) * (i + 1.6);
    const jitterX = Math.sin(phase * (1.5 + i * 0.18)) * (2.4 + i * 1.1);
    const jitterY = Math.cos(phase * (1.3 + i * 0.22)) * (1.6 + i * 0.6);
    const alpha = clamp(0.7 - i * 0.2, 0.15, 0.8);
    ctx.fillStyle = colorWithAlpha ? colorWithAlpha(accent, alpha) : accent;
    ctx.shadowBlur = i === 0 ? 12 : 0;
    ctx.shadowColor = colorWithAlpha ? colorWithAlpha(accent, 0.8) : accent;
    ctx.fillText(glyph, length * 0.04 + jitterX, jitterY);
  }
  ctx.restore();

  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = colorWithAlpha ? colorWithAlpha(accent, 0.32) : accent;
  for(let i=0; i<4; i++){
    const gPhase = now / 90 + i * 0.9 + (stick.glitchSeed || 0);
    const offset = Math.sin(gPhase) * height * 0.45;
    const span = length * (0.28 + Math.sin(gPhase * 1.7) * 0.12);
    ctx.beginPath();
    ctx.moveTo(-span * 0.5, offset);
    ctx.lineTo(span * 0.5, offset + Math.sin(gPhase * 2.3) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawGlyphLeviathanBoss(ctx, stick){
  drawGlyphSalmonEnemy(ctx, stick);
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const state = stick._leviathanState || {};
  const offsetY = (stick.renderOffsetY ?? 0) - 10;
  const cx = pelvis.x;
  const cy = pelvis.y + offsetY;
  const length = stick.salmonLength || 192;
  const radius = Math.max(length * 0.55, 86);
  const ratio = clamp(state.shieldRatio ?? 0, 0, 1);
  const pulse = state.bubblePulse ?? 0;
  const time = state.time ?? ((typeof nowMs === 'function' ? nowMs() : Date.now()) / 1000);
  ctx.save();
  ctx.translate(cx, cy);
  const oscillation = Math.sin(time * 0.8 + pulse * 2) * 0.08;
  const glowRadius = radius * (1.1 + oscillation);
  const glow = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, glowRadius);
  glow.addColorStop(0, `rgba(139, 208, 255, ${0.12 + 0.22 * ratio})`);
  glow.addColorStop(1, 'rgba(139, 208, 255, 0)');
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.72 + 0.25 * ratio;
  ctx.lineWidth = Math.max(5, radius * 0.12);
  ctx.strokeStyle = `rgba(139, 208, 255, ${0.65 + 0.2 * ratio})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.38 + 0.45 * ratio;
  ctx.lineWidth = Math.max(3, radius * 0.08);
  ctx.strokeStyle = 'rgba(238, 252, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(-radius * 0.2, -radius * 0.3, radius * (0.62 + ratio * 0.08), 0, TAU);
  ctx.stroke();
  if(ratio < 0.35){
    ctx.globalAlpha = clamp(0.45 - ratio, 0, 0.35);
    ctx.strokeStyle = 'rgba(24, 42, 66, 0.75)';
    ctx.lineWidth = Math.max(2, radius * 0.05);
    ctx.beginPath();
    const cracks = 5;
    for(let i=0; i<cracks; i++){
      const angle = (TAU * i) / cracks + time * 0.5;
      const inner = radius * 0.45;
      const outer = radius * (0.9 + ratio * 0.1);
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawTricylicSlasher(ctx, stick){
  if(!ctx || !stick) return;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : stick.pointsByName?.pelvis;
  if(!pelvis) return;
  const center = typeof stick.center === 'function' ? stick.center() : { x: pelvis.x, y: pelvis.y };
  const offsetY = stick.renderOffsetY ?? 0;
  const radius = Number.isFinite(stick.tricylicRadius) ? stick.tricylicRadius : 46;
  const outlineWidth = Math.max(2.4, radius * 0.18);
  const fillColor = '#050506';
  const outlineColor = '#fefefe';
  const state = stick._tricylicState || {};
  const spin = Number.isFinite(state.spinPhase) ? state.spinPhase : 0;
  const highlight = clamp(Number.isFinite(state.highlight) ? state.highlight : 0, 0, 1);
  const trail = Array.isArray(state.trail) ? state.trail : null;

  if(trail && trail.length >= 2){
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for(let i=1; i<trail.length; i++){
      const prev = trail[i-1];
      const curr = trail[i];
      if(!prev || !curr) continue;
      const alpha = clamp(1 - (curr.life || 0) / 0.4, 0, 1);
      if(alpha <= 0) continue;
      const width = Math.max(1.6, radius * 0.14 * (0.6 + 0.4 * alpha));
      ctx.strokeStyle = `rgba(255,255,255,${0.68 * alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(center.x, center.y + offsetY);
  ctx.rotate(spin);

  const vertexAngles = [0, TAU / 3, (TAU / 3) * 2];
  ctx.beginPath();
  for(let i=0;i<vertexAngles.length;i++){
    const angle = vertexAngles[i];
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if(i === 0){
      ctx.moveTo(x, y);
    }else{
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = outlineColor;
  ctx.shadowBlur = Math.max(8, radius * 0.22 * (0.4 + highlight));
  ctx.shadowColor = `rgba(255,255,255,${0.55 + 0.35 * highlight})`;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = clamp(0.16 + highlight * 0.32, 0.16, 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const highlightScales = [
    { radial: 0.62, tangential: 1 },
    { radial: 0.54, tangential: 0.82 },
    { radial: 0.54, tangential: 0.82 }
  ];
  ctx.beginPath();
  for(let i=0;i<vertexAngles.length;i++){
    const angle = vertexAngles[i];
    const config = highlightScales[i] || highlightScales[0];
    const radial = config.radial ?? 0.6;
    const tangential = config.tangential ?? 1;
    const x = Math.cos(angle) * radius * radial;
    const y = Math.sin(angle) * radius * radial * tangential;
    if(i === 0){
      ctx.moveTo(x, y);
    }else{
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.lineWidth = Math.max(1.4, radius * 0.08);
  ctx.strokeStyle = `rgba(255,255,255,${0.22 + highlight * 0.24})`;
  for(let i=0; i<3; i++){
    const angle = i * (TAU / 3);
    const inner = radius * 0.18;
    const outer = radius * (0.74 + highlight * 0.08);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  if(highlight > 0){
    ctx.globalAlpha = 0.25 + highlight * 0.3;
    ctx.lineWidth = Math.max(1.2, radius * 0.12);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (1.05 + 0.28 * highlight), radius * (0.78 + 0.22 * highlight), 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawRealmGuardian(ctx, stick){
  if(!ctx || !stick) return;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : stick.pointsByName?.pelvis;
  if(!pelvis) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const baseX = pelvis.x;
  const baseY = pelvis.y + offsetY;
  const image = realmGuardianImage();
  const spriteReady = isSpriteImageReady(image);
  const width = Number.isFinite(stick.realmGuardianWidth)
    ? stick.realmGuardianWidth
    : (spriteReady ? image.naturalWidth : 60);
  const height = Number.isFinite(stick.realmGuardianHeight)
    ? stick.realmGuardianHeight
    : (spriteReady ? image.naturalHeight : 300);
  const halfWidth = width * 0.5;

  if(spriteReady){
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(
      baseX,
      baseY + Math.max(8, height * 0.018),
      Math.max(20, halfWidth * 0.38),
      Math.max(12, height * 0.05),
      0,
      0,
      TAU
    );
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.drawImage(image, baseX - halfWidth, baseY - height, width, height);
    ctx.restore();
    return;
  }

  const topY = baseY - height;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const wavePhase = now / 360 + (stick.id || 0) * 0.12;
  const swirlPhase = now / 520 + (stick.id || 0) * 0.08;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 10, halfWidth * 0.85, halfWidth * 0.35, 0, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = 0.94;
  const bodyGradient = ctx.createLinearGradient(baseX, topY, baseX, baseY);
  bodyGradient.addColorStop(0, '#f7f7fb');
  bodyGradient.addColorStop(0.2, '#121217');
  bodyGradient.addColorStop(0.45, '#fdfdff');
  bodyGradient.addColorStop(0.7, '#0a0a0f');
  bodyGradient.addColorStop(1, '#f0f0f7');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  const outerSegments = 14;
  ctx.moveTo(baseX - halfWidth, baseY);
  for(let i=1;i<=outerSegments;i++){
    const t = i / outerSegments;
    const y = baseY - height * t;
    const sway = Math.sin(wavePhase + t * Math.PI * 3.8) * halfWidth * 0.38;
    ctx.lineTo(baseX - halfWidth - sway, y);
  }
  for(let i=outerSegments;i>=0;i--){
    const t = i / outerSegments;
    const y = baseY - height * t;
    const sway = Math.sin(wavePhase + t * Math.PI * 3.8 + Math.PI * 0.6) * halfWidth * 0.38;
    ctx.lineTo(baseX + halfWidth + sway, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(2.4, width * 0.045);
  ctx.strokeStyle = 'rgba(245, 245, 255, 0.55)';
  ctx.stroke();

  const innerWidth = width * 0.56;
  const innerHalf = innerWidth * 0.5;
  const innerHeight = height * 0.94;
  const innerGradient = ctx.createLinearGradient(baseX, topY, baseX, baseY);
  innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  innerGradient.addColorStop(0.5, 'rgba(38, 38, 46, 0.72)');
  innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.68)');
  ctx.fillStyle = innerGradient;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  const innerSegments = 18;
  ctx.moveTo(baseX - innerHalf, baseY);
  for(let i=1;i<=innerSegments;i++){
    const t = i / innerSegments;
    const y = baseY - innerHeight * t;
    const sway = Math.sin(swirlPhase + t * Math.PI * 6.4) * innerHalf * 0.72;
    ctx.lineTo(baseX - innerHalf - sway, y);
  }
  for(let i=innerSegments;i>=0;i--){
    const t = i / innerSegments;
    const y = baseY - innerHeight * t;
    const sway = Math.sin(swirlPhase + t * Math.PI * 6.4 + Math.PI * 0.85) * innerHalf * 0.72;
    ctx.lineTo(baseX + innerHalf + sway, y);
  }
  ctx.closePath();
  ctx.fill();

  const beamCount = 4;
  for(let i=0;i<beamCount;i++){
    const offset = ((swirlPhase * 0.35) + i / beamCount) % 1;
    const y = baseY - height * (0.15 + offset * 0.7);
    const spread = innerHalf * (0.45 + offset * 0.35);
    const strength = 0.25 + 0.35 * (1 - offset);
    ctx.globalAlpha = strength;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.4 * (1 - offset)})`;
    ctx.lineWidth = Math.max(1.6, width * 0.02);
    ctx.beginPath();
    ctx.moveTo(baseX - spread, y);
    ctx.lineTo(baseX + spread, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSlimeEnemy(ctx, stick){
  const pelvis = stick.pelvis();
  if(!pelvis) return;
  const baseWidth = Math.max(40, stick.slimeWidth || 60);
  const baseHeight = Math.max(28, stick.slimeHeight || 42);
  const squish = clamp(stick.slimeSquish || 1, 0.6, 1.45);
  const width = baseWidth * (1 + (1.15 - squish) * 0.35);
  const height = baseHeight * squish;
  const offsetY = stick.renderOffsetY ?? 0;
  const baseY = pelvis.y + offsetY;
  const top = baseY - height;
  const left = pelvis.x - width * 0.5;
  ctx.save();
  ctx.fillStyle = 'rgba(16,24,32,0.22)';
  ctx.beginPath();
  ctx.ellipse(pelvis.x, baseY - 4, width * 0.42, Math.max(6, height * 0.16), 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  const bodyColor = stick.bodyColor || '#69e0ff';
  const accent = stick.accentColor || '#aef4ff';
  const highlight = lightenColor(bodyColor, 0.4);
  const shade = darkenColor(bodyColor, 0.22);
  const core = darkenColor(accent, 0.18);
  const sprite = [
    '....1111....',
    '...122221...',
    '..12233221..',
    '.1223333321.',
    '.1223444321.',
    '.1234444431.',
    '..12E44E21..',
    '...1F55F1...',
    '....1111....'
  ];
  const palette = {
    '1': highlight,
    '2': bodyColor,
    '3': shade,
    '4': core,
    '5': accent,
    'E': '#162026',
    'F': 'rgba(255,255,255,0.75)'
  };
  ctx.save();
  ctx.translate(left, top);
  const scaleX = width / sprite[0].length;
  const scaleY = height / sprite.length;
  ctx.scale(scaleX, scaleY);
  drawPixelSprite(ctx, sprite, palette);
  ctx.restore();
}

function drawPixelSprite(ctx, pattern, palette, pixelSize=1){
  if(!ctx || !Array.isArray(pattern) || !pattern.length) return;
  const hasSmoothing = 'imageSmoothingEnabled' in ctx;
  const prevSmoothing = hasSmoothing ? ctx.imageSmoothingEnabled : null;
  if(hasSmoothing) ctx.imageSmoothingEnabled = false;
  let lastColor = null;
  for(let row=0; row<pattern.length; row++){
    const line = pattern[row];
    for(let col=0; col<line.length; col++){
      const key = line[col];
      if(!key || key === '.') continue;
      const color = palette[key];
      if(!color) continue;
      if(color !== lastColor){
        ctx.fillStyle = color;
        lastColor = color;
      }
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }
  if(hasSmoothing) ctx.imageSmoothingEnabled = prevSmoothing;
}

function computeSwordSheathPose(stick, config){
  if(!stick || !config) return null;
  const pelvis = stick.pointsByName?.pelvis;
  const neck = stick.pointsByName?.neck;
  if(!pelvis || !neck) return null;
  const forward = stick.dir >= 0 ? 1 : -1;
  const spineDx = pelvis.x - neck.x;
  const spineDy = pelvis.y - neck.y;
  const spineLen = Math.hypot(spineDx, spineDy) || 1;
  const spineDirX = spineDx / spineLen;
  const spineDirY = spineDy / spineLen;
  let lateralX = spineDirY;
  let lateralY = -spineDirX;
  if(lateralX === 0 && lateralY === 0){
    lateralX = forward;
    lateralY = 0;
  }
  const lateralLen = Math.hypot(lateralX, lateralY) || 1;
  lateralX /= lateralLen;
  lateralY /= lateralLen;
  const frontDirX = lateralX * forward;
  const frontDirY = lateralY * forward;
  const backDirX = -frontDirX;
  const backDirY = -frontDirY;
  const baseOffsetRatio = clamp(config.sheathBaseAlong ?? 0.18, -0.5, 1.5);
  const baseOffset = spineLen * baseOffsetRatio;
  const baseForward = config.sheathHandleForward ?? 14;
  const baseDown = config.sheathHandleDown ?? 0;
  const baseBack = config.sheathBackOffset ?? (spineLen * 0.06);
  const baseX = neck.x
    + spineDirX * (baseOffset + baseDown)
    + frontDirX * baseForward
    + backDirX * baseBack;
  const baseY = neck.y
    + spineDirY * (baseOffset + baseDown)
    + frontDirY * baseForward
    + backDirY * baseBack;

  const tipAlongRatio = config.sheathTipAlong ?? 1.28;
  const tipDown = config.sheathTipDown ?? 0;
  const tipBack = config.sheathTipBack ?? (spineLen * 0.55);
  let tipX = baseX
    + spineDirX * (spineLen * (tipAlongRatio - baseOffsetRatio) + tipDown)
    + backDirX * tipBack;
  let tipY = baseY
    + spineDirY * (spineLen * (tipAlongRatio - baseOffsetRatio) + tipDown)
    + backDirY * tipBack;

  const kneeName = forward >= 0 ? 'kneeL' : 'kneeR';
  const knee = stick.pointsByName?.[kneeName];
  const kneeInfluence = clamp(config.sheathKneeInfluence ?? 0.4, 0, 1);
  if(knee && kneeInfluence > 0){
    const kneeBack = config.sheathKneeBack ?? 8;
    const kneeDown = config.sheathKneeDown ?? 0;
    const kneeTargetX = knee.x + backDirX * kneeBack;
    const kneeTargetY = knee.y + backDirY * kneeBack + kneeDown;
    tipX = tipX * (1 - kneeInfluence) + kneeTargetX * kneeInfluence;
    tipY = tipY * (1 - kneeInfluence) + kneeTargetY * kneeInfluence;
  }

  const world = stick.world;
  const groundClearance = config.sheathGroundClearance ?? 6;
  if(world && typeof groundHeightAt === 'function'){
    const referenceY = Math.max(baseY, pelvis.y);
    const ground = groundHeightAt(world, tipX, {
      referenceY,
      referencePadding: groundClearance,
      ignoreSand: true,
      surface: 'top'
    });
    if(isFinite(ground) && tipY > ground - groundClearance){
      tipY = ground - groundClearance;
    }
  }

  return {
    base: { x: baseX, y: baseY },
    tip: { x: tipX, y: tipY }
  };
}

function drawSheathedSword(ctx, stick, weapon, rig){
  if(!ctx || !stick || !weapon || !rig) return;
  const config = swordVariantConfig(rig.variant);
  const pose = stick.weaponSheathPose || computeSwordSheathPose(stick, config);
  if(!pose) return;
  const base = pose.base;
  const tip = pose.tip;
  if(!base || !tip) return;
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;
  const nx = -dirY;
  const ny = dirX;
  ctx.save();
  const prevComposite = ctx.globalCompositeOperation;
  if(prevComposite !== 'source-over'){
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.lineCap = 'round';
  const bladeWidth = Math.max(config.bladeLineMin ?? 3, (config.bladeWidth ?? 4) * STICK_SCALE);
  ctx.strokeStyle = weapon.color;
  ctx.lineWidth = bladeWidth;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  const guardLen = (config.guardLength ?? 8) * STICK_SCALE * 0.9;
  if(guardLen > 0){
    const guardWidth = Math.max(config.guardLineMin ?? 1.4, (config.guardWidth ?? 3) * STICK_SCALE * 0.85);
    ctx.strokeStyle = config.guardColor || weapon.color;
    ctx.lineWidth = guardWidth;
    ctx.beginPath();
    ctx.moveTo(base.x + nx * guardLen, base.y + ny * guardLen);
    ctx.lineTo(base.x - nx * guardLen, base.y - ny * guardLen);
    ctx.stroke();
  }
  const handleLength = (config.handleBackLength ?? 12) * STICK_SCALE;
  if(handleLength > 0){
    ctx.strokeStyle = config.handleColor || '#d6cfc5';
    ctx.lineWidth = Math.max(1, (config.handleWidth ?? 2) * STICK_SCALE);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(base.x - dirX * handleLength, base.y - dirY * handleLength);
    ctx.stroke();
  }
  if(config.highlightWidth){
    const alpha = clamp((config.highlightAlpha ?? 0.35) * 0.6, 0, 1);
    if(alpha > 0){
      const offset = (config.highlightOffset ?? 0) * 0.6;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = Math.max(1, config.highlightWidth * STICK_SCALE * 0.7);
      ctx.beginPath();
      ctx.moveTo(base.x + nx * offset, base.y + ny * offset);
      ctx.lineTo(tip.x + nx * offset, tip.y + ny * offset);
      ctx.stroke();
    }
  }
  if(ctx.globalCompositeOperation !== prevComposite){
    ctx.globalCompositeOperation = prevComposite;
  }
  ctx.restore();
}

function drawSwordRig(ctx, stick, weapon, rig){
  const hand = stick.pointsByName[rig.handName];
  const tip = rig.tip;
  if(!hand || !tip) return;
  const config = swordVariantConfig(rig.variant);
  const now = nowMs();
  const allowTrail = isHighGraphicsEnabled(stick.world);

  const dx = tip.x - hand.x;
  const dy = tip.y - hand.y;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;
  const nx = -dirY;
  const ny = dirX;

  const bladeWidth = Math.max(config.bladeLineMin ?? 3, (config.bladeWidth ?? 4) * STICK_SCALE);
  const timeBlade = weapon?.timeBlade || null;
  const isTimeBlade = !!timeBlade;
  const ghosts = rig.handSwitchGhosts && rig.handSwitchGhosts.length ? rig.handSwitchGhosts : null;
  if(ghosts){
    const ghostLife = rig.switchGhostLife ?? config.switchGhostLife ?? 200;
    const ghostAlpha = clamp(rig.switchGhostAlpha ?? config.switchGhostAlpha ?? 0.6, 0, 1);
    const glow = Math.max(0, rig.trailGlow ?? config.trailGlow ?? 0);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = weapon.color;
    if(glow > 0){
      ctx.shadowBlur = glow;
      ctx.shadowColor = weapon.color;
    }
    for(const ghost of ghosts){
      const age = now - ghost.time;
      if(age >= ghostLife) continue;
      const fade = 1 - clamp(age / ghostLife, 0, 1);
      const alpha = ghostAlpha * fade;
      if(alpha <= 0) continue;
      if(ghost.oldTip && ghost.newTip){
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(bladeWidth * 0.8, 2);
        ctx.beginPath();
        ctx.moveTo(ghost.oldTip.x, ghost.oldTip.y);
        ctx.lineTo(ghost.newTip.x, ghost.newTip.y);
        ctx.stroke();
      }
      if(ghost.oldHand && ghost.oldTip){
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = bladeWidth;
        ctx.beginPath();
        ctx.moveTo(ghost.oldHand.x, ghost.oldHand.y);
        ctx.lineTo(ghost.oldTip.x, ghost.oldTip.y);
        ctx.stroke();
      }
      if(ghost.newHand && ghost.newTip){
        ctx.globalAlpha = alpha * 0.45;
        ctx.lineWidth = bladeWidth * 0.9;
        ctx.beginPath();
        ctx.moveTo(ghost.newHand.x, ghost.newHand.y);
        ctx.lineTo(ghost.newTip.x, ghost.newTip.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const timeBladeTrail = isTimeBlade && allowTrail && rig.timeBladeTrail && rig.timeBladeTrail.length > 1
    ? rig.timeBladeTrail
    : null;
  if(timeBladeTrail){
    const trailLife = rig.timeBladeTrailLife ?? timeBlade?.trailLifeMs ?? 900;
    const baseAlpha = clamp(timeBlade?.trailAlpha ?? 0.85, 0, 1);
    const delay = Math.max(0, rig.timeBladeTrailDelay ?? timeBlade?.trailDelayMs ?? timeBlade?.echoDelayMs ?? 3000);
    const widthScale = rig.timeBladeTrailWidthScale ?? timeBlade?.trailWidthScale ?? 1.25;
    const trailWidth = Math.max(1, bladeWidth * widthScale);
    const color = rig.timeBladeTrailColor || timeBlade?.trailColor || '#ffffff';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'difference';
    ctx.strokeStyle = color;
    for(let i=1;i<timeBladeTrail.length;i++){
      const prev = timeBladeTrail[i - 1];
      const curr = timeBladeTrail[i];
      const age = now - curr.time;
      const prevAge = now - prev.time;
      if(age < delay || prevAge < delay) continue;
      const lifeAge = age - delay;
      const prevLifeAge = prevAge - delay;
      if(lifeAge > trailLife && prevLifeAge > trailLife) continue;
      const alpha = Math.max(0, 1 - lifeAge / trailLife);
      const prevAlpha = Math.max(0, 1 - prevLifeAge / trailLife);
      const segmentAlpha = Math.max(alpha, prevAlpha) * baseAlpha;
      if(segmentAlpha <= 0) continue;
      ctx.globalAlpha = segmentAlpha * 0.5;
      ctx.lineWidth = trailWidth * 1.45;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      ctx.globalAlpha = segmentAlpha;
      ctx.lineWidth = trailWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const trailPoints = !isTimeBlade && allowTrail && rig.trail && rig.trail.length > 1 ? rig.trail : null;
  if(trailPoints){
    const trailLife = rig.trailLife ?? config.trailLife ?? 160;
    const baseAlpha = clamp(rig.trailAlpha ?? config.trailAlpha ?? 0.6, 0, 1);
    const widthScale = rig.trailWidthScale ?? config.trailWidthScale ?? 0.78;
    const trailWidth = Math.max(1, bladeWidth * widthScale);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = weapon.color;
    const glow = Math.max(0, rig.trailGlow ?? config.trailGlow ?? 0);
    if(glow > 0){
      ctx.shadowBlur = glow;
      ctx.shadowColor = weapon.color;
    }
    for(let i=1;i<trailPoints.length;i++){
      const prev = trailPoints[i - 1];
      const curr = trailPoints[i];
      const age = now - curr.time;
      const prevAge = now - prev.time;
      const alpha = Math.max(0, 1 - age / trailLife);
      const prevAlpha = Math.max(0, 1 - prevAge / trailLife);
      const segmentAlpha = Math.max(alpha, prevAlpha) * baseAlpha;
      if(segmentAlpha <= 0) continue;
      const softWidth = trailWidth * 1.6;
      ctx.globalAlpha = segmentAlpha * 0.5;
      ctx.lineWidth = softWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
      ctx.globalAlpha = segmentAlpha;
      ctx.lineWidth = trailWidth;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  const handleBack = (config.handleBackLength ?? 0) * STICK_SCALE;
  const handleForward = (config.handleForwardLength ?? 0) * STICK_SCALE;
  if(handleBack > 0 || handleForward > 0){
    ctx.strokeStyle = config.handleColor || '#d6cfc5';
    ctx.lineWidth = Math.max(1, (config.handleWidth ?? 2) * STICK_SCALE);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hand.x - dirX * handleBack, hand.y - dirY * handleBack);
    ctx.lineTo(hand.x + dirX * handleForward, hand.y + dirY * handleForward);
    ctx.stroke();
  }

  if(isTimeBlade){
    const strokeColor = timeBlade?.bladeColor || '#ffffff';
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = bladeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();
    const outlineColor = timeBlade?.outlineColor || weapon.color;
    if(outlineColor){
      const outlineAlpha = clamp(timeBlade?.outlineAlpha ?? 0.55, 0, 1);
      const outlineScale = timeBlade?.outlineWidthScale ?? 0.6;
      ctx.save();
      ctx.globalAlpha = outlineAlpha;
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = Math.max(1, bladeWidth * outlineScale);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.restore();
    }
  }else{
    ctx.strokeStyle = weapon.color;
    ctx.lineWidth = bladeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }

  if(!isTimeBlade && config.highlightWidth){
    const offset = (config.highlightOffset ?? 0) * STICK_SCALE;
    const alpha = clamp(config.highlightAlpha ?? 0.4, 0, 1);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = Math.max(1, config.highlightWidth * STICK_SCALE);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hand.x + nx * offset, hand.y + ny * offset);
    ctx.lineTo(tip.x + nx * offset, tip.y + ny * offset);
    ctx.stroke();
  }

  const guardLen = (config.guardLength ?? 8) * STICK_SCALE;
  const guardWidth = Math.max(config.guardLineMin ?? 1.4, (config.guardWidth ?? 3) * STICK_SCALE);
  ctx.strokeStyle = config.guardColor || weapon.color;
  ctx.lineWidth = guardWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hand.x + nx * guardLen, hand.y + ny * guardLen);
  ctx.lineTo(hand.x - nx * guardLen, hand.y - ny * guardLen);
  ctx.stroke();

  if(config.pommelRadius){
    const pommelBack = ((config.handleBackLength ?? 0) + (config.pommelOffset ?? 0)) * STICK_SCALE;
    const px = hand.x - dirX * pommelBack;
    const py = hand.y - dirY * pommelBack;
    ctx.fillStyle = config.handleColor || weapon.color;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.5, config.pommelRadius * STICK_SCALE), 0, TAU);
    ctx.fill();
  }

  if(rig.scraping){
    const glowSize = Math.max(3, (config.glowRadius ?? 6) * STICK_SCALE);
    const grad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, glowSize);
    grad.addColorStop(0, 'rgba(255,230,160,0.7)');
    grad.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, glowSize, 0, TAU);
    ctx.fill();
  }

  if(rig.sparks && rig.sparks.length){
    const sparkWidth = Math.max(1, (config.sparkLineWidth ?? 2.2) * STICK_SCALE);
    for(const spark of rig.sparks){
      const t = clamp(spark.life / spark.maxLife, 0, 1);
      const alpha = 1 - t;
      ctx.strokeStyle = `rgba(255, ${Math.round(200 + 40*(1-t))}, ${Math.round(120 + 80*(1-t))}, ${alpha})`;
      ctx.lineWidth = sparkWidth;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x + spark.vx * 0.04, spark.y + spark.vy * 0.04);
      ctx.stroke();
    }
  }
}

function drawBowRig(ctx, stick, weapon){
  const frontHandName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const backHandName = frontHandName === 'handR' ? 'handL' : 'handR';
  const front = stick.pointsByName[frontHandName];
  const back = stick.pointsByName[backHandName];
  if(!front || !back) return;
  const charge = clamp(stick.bowCharging ? stick.bowChargeRatio : stick.bowLastChargeRatio, 0, 1);
  const dx = front.x - back.x;
  const dy = front.y - back.y;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;
  const perpX = -dirY;
  const perpY = dirX;
  const limbLength = Math.max(48, 78 * STICK_SCALE);
  const halfLimb = limbLength * 0.5;
  const gripOffset = 4;
  const centerX = front.x - dirX * gripOffset;
  const centerY = front.y - dirY * gripOffset;
  const top = { x: centerX + perpX * halfLimb, y: centerY + perpY * halfLimb };
  const bottom = { x: centerX - perpX * halfLimb, y: centerY - perpY * halfLimb };
  const curvePull = 8 + charge * 6;
  const controlX = centerX + dirX * curvePull;
  const controlY = centerY + dirY * curvePull;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, 6 * STICK_SCALE);
  ctx.strokeStyle = weapon.color || '#cfcfd2';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(controlX, controlY, bottom.x, bottom.y);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.4, 2.6 * STICK_SCALE);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  const stringOffset = 2;
  const topString = { x: top.x - dirX * stringOffset, y: top.y - dirY * stringOffset };
  const bottomString = { x: bottom.x - dirX * stringOffset, y: bottom.y - dirY * stringOffset };
  ctx.beginPath();
  ctx.moveTo(topString.x, topString.y);
  ctx.lineTo(back.x, back.y);
  ctx.lineTo(bottomString.x, bottomString.y);
  ctx.stroke();
  const arrowBase = 20;
  const arrowStretch = 8 + charge * 8;
  const arrowTipX = front.x + dirX * (arrowBase + arrowStretch);
  const arrowTipY = front.y + dirY * (arrowBase + arrowStretch);
  ctx.strokeStyle = weapon.projectileColor || weapon.color || '#fff';
  ctx.lineWidth = Math.max(1.6, 2.4 * STICK_SCALE);
  ctx.beginPath();
  ctx.moveTo(back.x, back.y);
  ctx.lineTo(arrowTipX, arrowTipY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(back.x, back.y);
  ctx.lineTo(back.x - dirX * 6 + perpX * 5, back.y - dirY * 6 + perpY * 5);
  ctx.moveTo(back.x, back.y);
  ctx.lineTo(back.x - dirX * 6 - perpX * 5, back.y - dirY * 6 - perpY * 5);
  ctx.stroke();
  const now = nowMs();
  const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
  if(weaponId === 'refractionRecurve' && stick.bowCharging){
    const swirlRadius = 6 + charge * 16;
    const particleCount = Math.max(6, Math.round(lerp(6, 18, charge)));
    const baseAngle = Math.atan2(dirY, dirX);
    const focusOffset = 6 + charge * 10;
    const focusX = arrowTipX + Math.cos(baseAngle) * focusOffset;
    const focusY = arrowTipY + Math.sin(baseAngle) * focusOffset;
    const time = now * 0.0024;
    ctx.save();
    for(let i=0;i<particleCount;i++){
      const wave = time + i * 0.37;
      const ring = swirlRadius * (0.35 + 0.65 * Math.abs(Math.sin(wave * 1.8 + i)));
      const theta = wave * 4.2 + i * 1.6;
      const px = focusX + Math.cos(theta) * ring * 0.6;
      const py = focusY + Math.sin(theta) * ring * 0.6;
      const flicker = 0.55 + 0.45 * Math.sin(wave * 2.6 + i * 0.8);
      const size = Math.max(0.8, 1 + charge * 1.8 * flicker);
      const alpha = clamp(0.25 + charge * 0.55 * Math.abs(Math.sin(wave * 2.1 + i * 0.5)), 0.2, 0.85);
      ctx.fillStyle = `rgba(255, ${Math.round(242 + 10 * flicker)}, ${Math.round(210 + 40 * charge)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, TAU);
      ctx.fill();
    }
    const glowRadius = swirlRadius * 1.1;
    const glow = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, glowRadius);
    glow.addColorStop(0, `rgba(255,255,220,${0.4 + charge * 0.4})`);
    glow.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(focusX, focusY, glowRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const showBar = stick.isBowDrawingActive(now) || (stick.bowLastChargeRatio > 0 && stick.bowChargeReleaseUntil && now < stick.bowChargeReleaseUntil + 180);
  if(showBar){
    const barWidth = Math.max(40, 56 * STICK_SCALE);
    const barHeight = Math.max(3, 6 * STICK_SCALE);
    const midX = (front.x + back.x) * 0.5;
    const midY = (front.y + back.y) * 0.5;
    const barOffset = 32;
    const barAnchorX = midX - perpX * barOffset;
    const barAnchorY = midY - perpY * barOffset;
    ctx.save();
    ctx.translate(barAnchorX, barAnchorY);
    const barAngle = Math.atan2(dirY, dirX);
    ctx.rotate(barAngle);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-barWidth * 0.5, -barHeight - 6, barWidth, barHeight);
    const displayRatio = stick.bowCharging ? stick.bowChargeRatio : (stick.bowChargeReleaseUntil && now < stick.bowChargeReleaseUntil ? stick.bowLastChargeRatio : 0);
    ctx.fillStyle = weapon.charge?.barColor || 'rgba(255,255,255,0.82)';
    ctx.fillRect(-barWidth * 0.5, -barHeight - 6, barWidth * clamp(displayRatio, 0, 1), barHeight);
    ctx.restore();
  }
  ctx.restore();
}

function renderBowIdleSprite(ctx, weapon, origin, dir, opts={}){
  if(!ctx || !weapon || !origin || !dir) return;
  const lineScale = opts.lineScale ?? STICK_SCALE;
  const limbLength = opts.limbLength ?? 48;
  const halfLimb = limbLength * 0.5;
  const gripOffset = opts.gripOffset ?? 4;
  const curvePull = opts.curvePull ?? 8;
  const stringOffset = opts.stringOffset ?? 2;
  const stringRelax = opts.stringRelax ?? 2;
  const gripLength = opts.gripLength ?? 10;
  const dirX = dir.x;
  const dirY = dir.y;
  const perpX = -dirY;
  const perpY = dirX;
  const centerX = origin.x - dirX * gripOffset;
  const centerY = origin.y - dirY * gripOffset;
  const top = { x: centerX + perpX * halfLimb, y: centerY + perpY * halfLimb };
  const bottom = { x: centerX - perpX * halfLimb, y: centerY - perpY * halfLimb };
  const controlX = centerX + dirX * curvePull;
  const controlY = centerY + dirY * curvePull;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = opts.limbWidth ?? Math.max(3, 6 * lineScale);
  ctx.strokeStyle = weapon.color || '#cfcfd2';
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.quadraticCurveTo(controlX, controlY, bottom.x, bottom.y);
  ctx.stroke();
  ctx.lineWidth = opts.stringWidth ?? Math.max(1.4, 2.6 * lineScale);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  const topString = { x: top.x - dirX * stringOffset, y: top.y - dirY * stringOffset };
  const bottomString = { x: bottom.x - dirX * stringOffset, y: bottom.y - dirY * stringOffset };
  const gripPoint = { x: centerX - dirX * stringRelax, y: centerY - dirY * stringRelax };
  ctx.beginPath();
  ctx.moveTo(topString.x, topString.y);
  ctx.lineTo(gripPoint.x, gripPoint.y);
  ctx.lineTo(bottomString.x, bottomString.y);
  ctx.stroke();
  ctx.lineWidth = opts.gripWidth ?? Math.max(2.4, 4 * lineScale);
  ctx.strokeStyle = opts.gripColor || 'rgba(30, 32, 38, 0.42)';
  ctx.beginPath();
  ctx.moveTo(centerX + perpX * (gripLength * 0.5), centerY + perpY * (gripLength * 0.5));
  ctx.lineTo(centerX - perpX * (gripLength * 0.5), centerY - perpY * (gripLength * 0.5));
  ctx.stroke();
  ctx.restore();
}

function drawBowIdle(ctx, stick, weapon){
  if(!ctx || !stick || !weapon) return;
  const frontHandName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const hand = stick.pointsByName?.[frontHandName];
  if(!hand) return;
  let aimTarget = null;
  if(stick.world && stick.world.selected === stick && stick.world.input?.aim){
    aimTarget = { x: stick.world.input.aim.x, y: stick.world.input.aim.y };
  }else if(stick.lastBowAim){
    aimTarget = { x: stick.lastBowAim.x, y: stick.lastBowAim.y };
  }
  if(!aimTarget){
    const defaultDir = stick.dir >= 0 ? 1 : -1;
    aimTarget = { x: hand.x + defaultDir * 160, y: hand.y - 20 };
  }
  const dx = aimTarget.x - hand.x;
  const dy = aimTarget.y - hand.y;
  const len = Math.hypot(dx, dy) || 1;
  const dirX = dx / len;
  const dirY = dy / len;
  stick.lastBowAim = { x: aimTarget.x, y: aimTarget.y };
  renderBowIdleSprite(ctx, weapon, hand, { x: dirX, y: dirY }, {
    limbLength: Math.max(48, 78 * STICK_SCALE),
    lineScale: STICK_SCALE,
    stringRelax: 2,
    gripLength: 12,
    curvePull: 6
  });
}

function drawStaffWeapon(ctx, stick, weapon){
  if(!ctx || !stick || !weapon) return;
  const state = stick.staffState || null;
  const frontHandName = stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL');
  const hand = stick.pointsByName[frontHandName];
  if(!hand) return;
  const elbowName = frontHandName === 'handL' ? 'elbowL' : 'elbowR';
  const elbow = stick.pointsByName[elbowName];
  let dirX = 0;
  let dirY = -1;
  if(state && Array.isArray(state.beamSegments) && state.beamSegments.length){
    const seg = state.beamSegments[0];
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.hypot(dx, dy) || 1;
    dirX = dx / len;
    dirY = dy / len;
  }else if(elbow){
    const dx = hand.x - elbow.x;
    const dy = hand.y - elbow.y;
    const len = Math.hypot(dx, dy) || 1;
    dirX = dx / len;
    dirY = dy / len;
  }else{
    dirX = stick.dir >= 0 ? 1 : -1;
    dirY = -0.15;
  }
  const shaftLength = weapon.staff?.shaftLength ?? 56;
  const gripOffset = weapon.staff?.gripOffset ?? 14;
  const baseX = hand.x - dirX * gripOffset;
  const baseY = hand.y - dirY * gripOffset;
  const tipX = hand.x + dirX * shaftLength;
  const tipY = hand.y + dirY * shaftLength;
  if(state) state.tipPosition = { x: tipX, y: tipY };
  ctx.save();
  ctx.lineCap = 'round';
  const shaftWidth = weapon.staff?.shaftWidth ?? Math.max(3, 5 * STICK_SCALE);
  ctx.strokeStyle = weapon.color || '#d6cfc5';
  ctx.lineWidth = shaftWidth;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const highlight = weapon.staff?.shaftHighlight || lightenColor(ctx.strokeStyle, 0.18);
  ctx.strokeStyle = highlight;
  ctx.lineWidth = Math.max(1.1, shaftWidth * 0.45);
  ctx.beginPath();
  ctx.moveTo(hand.x - dirX * gripOffset * 0.35, hand.y - dirY * gripOffset * 0.35);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const gemRadius = weapon.staff?.gemRadius ?? Math.max(4, 6 * STICK_SCALE);
  const gemColor = weapon.staff?.gemColor || lightenColor(weapon.color || '#ffd36b', 0.25);
  ctx.fillStyle = gemColor;
  const glow = weapon.staff?.beamGlow || weapon.staff?.beamColor || gemColor;
  ctx.shadowColor = glow;
  ctx.shadowBlur = gemRadius * 0.9;
  ctx.beginPath();
  ctx.arc(tipX, tipY, gemRadius, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = lightenColor(gemColor, 0.3);
  ctx.lineWidth = Math.max(1, gemRadius * 0.45);
  ctx.beginPath();
  ctx.arc(tipX, tipY, gemRadius * 0.7, 0, TAU);
  ctx.stroke();
  ctx.restore();
  drawStaffAura(ctx, stick, weapon);
  drawStaffBeam(ctx, stick, weapon);
}

function drawStaffAura(ctx, stick, weapon){
  if(!ctx || !stick || !weapon) return;
  const state = stick.staffState || null;
  if(!state) return;
  const tau = (typeof TAU === 'number') ? TAU : Math.PI * 2;
  const auraConfig = weapon.staff?.aura || null;
  const fallbackRadius = auraConfig?.radius || weapon.staff?.range || 0;
  const center = state.auraCenter || state.tipPosition || (typeof stick.center === 'function' ? stick.center() : null);
  const radius = (state.auraRadius && state.auraRadius > 0) ? state.auraRadius : fallbackRadius;
  if(!center || !(radius > 0)) return;
  const souls = Math.max(0, Math.round(state.soulCount || 0));
  const baseColor = state.auraColor || weapon.color || (auraConfig?.color) || '#ffffff';
  const fillBase = typeof colorWithAlpha === 'function' ? colorWithAlpha(baseColor, 0.07) : baseColor;
  const borderColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(baseColor, 0.22) : baseColor;
  const pulse = Math.max(0, state.auraPulseStrength || 0);
  ctx.save();
  ctx.globalAlpha = Math.min(0.75, 0.45 + pulse * 0.25);
  ctx.fillStyle = fillBase;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, tau);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = Math.max(1, radius * 0.018);
  ctx.strokeStyle = borderColor;
  ctx.shadowColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(baseColor, 0.18 + pulse * 0.2) : baseColor;
  ctx.shadowBlur = Math.max(6, radius * 0.12);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, tau);
  ctx.stroke();
  ctx.shadowBlur = 0;
  const orbitCenter = (state.soulControlActive && state.soulControlPoint)
    ? state.soulControlPoint
    : center;
  if(souls > 0){
    const orbit = radius * 0.55;
    const phase = state.soulOrbitPhase || 0;
    const soulColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(baseColor, 0.5) : baseColor;
    const sparkColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(baseColor, 0.75) : baseColor;
    const soulRadius = Math.max(3, radius * 0.08);
    ctx.fillStyle = soulColor;
    for(let i=0;i<souls;i++){
      const angle = phase + tau * (i / souls);
      const offsetY = Math.sin(angle) * orbit * 0.15;
      const x = orbitCenter.x + Math.cos(angle) * orbit;
      const y = orbitCenter.y + Math.sin(angle) * (orbit * 0.8) + offsetY;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, soulRadius * 0.45, 0, tau);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = sparkColor;
      ctx.beginPath();
      ctx.arc(x, y, soulRadius * 0.25, 0, tau);
      ctx.fill();
      ctx.fillStyle = soulColor;
    }
  }
  if(state.soulControlActive && state.soulControlPoint){
    const origin = state.auraCenter
      || stick.pointsByName?.[stick.weaponHand || (stick.dir >= 0 ? 'handR' : 'handL')]
      || center;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1.6, radius * 0.03);
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(state.soulControlPoint.x, state.soulControlPoint.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.arc(state.soulControlPoint.x, state.soulControlPoint.y, Math.max(4, radius * 0.12), 0, tau);
    ctx.fill();
  }
  ctx.restore();
}

function drawStaffBeam(ctx, stick, weapon){
  const state = stick?.staffState;
  if(!ctx || !weapon || !state || !state.firing) return;
  if(state.auraActive && weapon.staff?.aura) return;
  if(!Array.isArray(state.beamSegments) || state.beamSegments.length === 0) return;
  const beamColor = weapon.staff?.beamColor || weapon.color || '#ffd36b';
  const glowColor = weapon.staff?.beamGlow || beamColor;
  const width = weapon.staff?.beamWidth ?? Math.max(6, 10 * STICK_SCALE);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = width;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = width * 0.85;
  for(const seg of state.beamSegments){
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = width * 0.4;
  ctx.strokeStyle = beamColor;
  ctx.lineWidth = width * 0.55;
  for(const seg of state.beamSegments){
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = beamColor;
  if(Array.isArray(state.contactPoints)){
    for(const hit of state.contactPoints){
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, width * 0.25, 0, TAU);
      ctx.fill();
    }
  }
  if(state.hitPoint){
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(state.hitPoint.x, state.hitPoint.y, width * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawStickHealthBar(ctx, stick){
  if(!ctx || !stick) return;
  if(stick.dead) return;
  if(stick.isNpc) return;
  if(stick.isBoss) return;
  const world = stick.world;
  const gameplay = world?.ui?.settings?.gameplay;
  const alwaysShow = !!gameplay?.alwaysShowHp;
  const missingHp = stick.hp < stick.maxHp;
  const now = nowMs();
  const timedReveal = (stick.showHealthUntil || 0) > now;
  const isSelected = !!(world && world.selected === stick);
  if(!alwaysShow && !missingHp && !timedReveal && !isSelected){
    return;
  }
  const c = stick.center();
  const barWidth = Math.max(24, 56 * STICK_SCALE);
  const barHeight = Math.max(3, 6 * STICK_SCALE);
  const halfBar = barWidth / 2;
  const head = stick.pointsByName?.head;
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  const defaultTop = c.y - 52 * scale - 10;
  const headRadius = 12 * scale;
  const barTop = head ? (head.y - headRadius - 10) : defaultTop;
  ctx.fillStyle = '#111';
  ctx.fillRect(c.x - halfBar, barTop, barWidth, barHeight);
  const barColor = stick.isEnemy ? (stick.isBoss ? '#ffb347' : '#ff6464') : '#6be36b';
  ctx.fillStyle = barColor;
  const ratio = stick.maxHp > 0 ? clamp(stick.hp / stick.maxHp, 0, 1) : 0;
  ctx.fillRect(c.x - halfBar, barTop, barWidth * ratio, barHeight);

  const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
  const weapon = weaponId ? WEAPONS[weaponId] : null;
  if(weapon && weapon.kind === 'staff'){
    const state = stick.staffState;
    const maxCharge = state?.maxCharge ?? 1;
    const chargeRatio = maxCharge > 0 ? clamp((state?.charge ?? 0) / maxCharge, 0, 1) : 0;
    const staffBarWidth = Math.max(36, 58 * STICK_SCALE);
    const staffBarHeight = Math.max(2.5, 4 * STICK_SCALE);
    const staffY = barTop - staffBarHeight - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(c.x - staffBarWidth / 2, staffY, staffBarWidth, staffBarHeight);
    ctx.fillStyle = weapon.staff?.barColor || weapon.staff?.beamColor || weapon.color || '#ffd36b';
    ctx.fillRect(c.x - staffBarWidth / 2, staffY, staffBarWidth * chargeRatio, staffBarHeight);
    ctx.strokeStyle = 'rgba(12,12,18,0.28)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(c.x - staffBarWidth / 2, staffY, staffBarWidth, staffBarHeight);
  }
  if(weapon && weapon.kind === 'gun' && typeof stick.gunAmmoState === 'function'){
    const state = stick.gunAmmoState(weaponId);
    const bullets = state?.bullets;
    if(Array.isArray(bullets) && bullets.length){
      const count = bullets.length;
      const ammoColor = weapon.ammoColor || weapon.projectileColor || weapon.color || '#f5f5f5';
      const bulletHeight = Math.max(3, barHeight - 1);
      const spacing = Math.max(2.5, Math.min(8, barWidth / Math.max(4, count * 1.8)));
      const bulletWidth = Math.max(4, Math.min(12, (barWidth - spacing * (count - 1)) / count));
      const totalWidth = bulletWidth * count + spacing * (count - 1);
      const startX = c.x - totalWidth / 2;
      const bulletY = barTop - bulletHeight - 4;
      ctx.save();
      for(let i=0;i<count;i++){
        const slot = bullets[i];
        const ready = !!slot?.ready;
        const duration = Math.max(1, slot?.reloadDuration ?? state?.reloadMs ?? weapon.reloadMs ?? 1);
        const remaining = slot?.regenRemaining ?? 0;
        const progress = ready ? 1 : clamp(1 - remaining / duration, 0, 1);
        const alpha = ready ? 0.9 : 0.2 + 0.6 * progress;
        const x = startX + i * (bulletWidth + spacing);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ammoColor;
        ctx.fillRect(x, bulletY, bulletWidth, bulletHeight);
        ctx.globalAlpha = Math.min(alpha + 0.1, 1);
        ctx.strokeStyle = ready ? 'rgba(255, 214, 72, 0.9)' : 'rgba(12, 12, 18, 0.55)';
        ctx.lineWidth = ready ? 1.1 : 1;
        ctx.strokeRect(x, bulletY, bulletWidth, bulletHeight);
      }
      ctx.restore();
    }
  }
}

function drawStickSprintBar(ctx, stick){
  if(!ctx || !stick) return;
  if(stick.isNpc) return;
  if(stick.isEnemy) return;
  const world = stick.world;
  if(!world || world.selected !== stick) return;
  if(typeof stick._abilityUnlocked === 'function' && !stick._abilityUnlocked('sprint')) return;
  const alpha = clamp(stick._sprintBarAlpha ?? 0, 0, 1);
  if(alpha <= 0.01) return;
  const energy = clamp(stick.sprintEnergy ?? 0, 0, 1);
  const anchor = typeof stick._footAnchor === 'function' ? stick._footAnchor() : null;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
  const fallbackX = center?.x ?? pelvis?.x ?? 0;
  const fallbackY = pelvis?.y ?? center?.y ?? 0;
  const baseX = Number.isFinite(anchor?.x) ? anchor.x : fallbackX;
  const baseY = Number.isFinite(anchor?.y) ? anchor.y : (fallbackY + 10);
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  const padding = Math.max(4, 7 * scale);
  let barY = baseY + padding;
  if(world && typeof groundHeightAt === 'function'){
    const ground = groundHeightAt(world, baseX, { surface: 'top', ignoreSand: false });
    if(Number.isFinite(ground) && barY < ground + 3){
      barY = ground + 3;
    }
  }
  const barWidth = Math.max(34, 56 * scale);
  const barHeight = Math.max(3, 4 * scale);
  const halfWidth = barWidth * 0.5;
  const accent = stick.accentColor || stick.bodyColor || '#7dd3ff';
  const fillColor = typeof colorWithAlpha === 'function'
    ? colorWithAlpha(accent, 0.85)
    : accent;
  const backColor = 'rgba(12, 16, 22, 0.75)';
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = backColor;
  ctx.fillRect(baseX - halfWidth, barY, barWidth, barHeight);
  ctx.fillStyle = fillColor;
  ctx.fillRect(baseX - halfWidth, barY, barWidth * energy, barHeight);
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(baseX - halfWidth, barY, barWidth * energy, barHeight * 0.35);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(0.8, barHeight * 0.3);
  ctx.strokeStyle = 'rgba(10, 12, 18, 0.82)';
  ctx.strokeRect(baseX - halfWidth, barY, barWidth, barHeight);
  ctx.lineWidth = Math.max(0.6, barHeight * 0.2);
  ctx.strokeStyle = typeof colorWithAlpha === 'function'
    ? colorWithAlpha(accent, 0.65)
    : accent;
  ctx.strokeRect(baseX - halfWidth, barY, barWidth, barHeight);
  ctx.restore();
}
