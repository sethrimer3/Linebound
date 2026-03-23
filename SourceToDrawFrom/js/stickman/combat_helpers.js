// stickman/combat_helpers.js

function lerpPoint(a, b, t){
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function comboRelativeTargets(anim, progress, offsetsOverride){
  if(!anim) return null;
  const offsets = offsetsOverride || RIG_CONFIG.offsets || {};
  const backHand = offsets[anim.hand];
  const backElbow = offsets[anim.elbow];
  const frontHand = offsets[anim.altHand];
  const frontElbow = offsets[anim.altElbow];
  const head = offsets.head || { x: 0, y: -60 };
  const neck = offsets.neck || { x: 0, y: -48 };
  const pelvis = offsets.pelvis || { x: 0, y: 0 };
  const facing = anim.facing >= 0 ? 1 : -1;
  const baseAngle = facing >= 0 ? 0 : Math.PI;
  const aimAngle = Number.isFinite(anim.aimAngle) ? anim.aimAngle : baseAngle;
  const angleOffset = aimAngle - baseAngle;
  const rotateOut = angleOffset !== 0
    ? (vec)=>vec ? rotatePoint(vec, angleOffset) : null
    : (vec)=>vec ? { x: vec.x, y: vec.y } : null;
  const t = clamp(progress, 0, 1);
  const startHand = anim.startHand || backHand;
  const startElbow = anim.startElbow || backElbow;
  if(!backHand || !backElbow || !frontHand || !frontElbow) return null;

  if(anim.step === 1){
    const launchHand = startHand || backHand;
    const finishHand = {
      x: frontHand.x + facing * 22,
      y: frontHand.y - 4
    };
    const launchElbow = startElbow || backElbow;
    const finishElbow = {
      x: frontElbow.x + facing * 12,
      y: frontElbow.y - 2
    };
    const snapProgress = easeOutCubic(Math.min(1, t / 0.28));
    return {
      hand: rotateOut(lerpPoint(launchHand, finishHand, snapProgress)),
      elbow: rotateOut(lerpPoint(launchElbow, finishElbow, snapProgress))
    };
  }

  const spins = Math.max(1, anim.spinCount || 1);
  const spinDir = anim.spinDir ?? (facing >= 0 ? -1 : 1);
  const spinRadius = anim.spinRadius ?? 1.06;
  const spinElbowRadius = anim.spinElbowRadius ?? 0.9;
  const spinLift = anim.spinLift ?? 18;
  const spinLean = anim.spinLean ?? 8;
  const handBase = startHand || backHand;
  const elbowBase = startElbow || backElbow;
  if(!handBase || !elbowBase) return null;

  const angle = spinDir * TAU * spins * t;
  const handPos = rotateRelativePoint(handBase, angle, spinRadius);
  const elbowPos = rotateRelativePoint(elbowBase, angle, spinElbowRadius);
  const liftPhase = Math.sin(Math.PI * t * spins);
  const lift = liftPhase * spinLift;
  const lean = Math.cos(Math.PI * t) * spinLean * facing;

  return {
    hand: rotateOut({
      x: handPos.x + lean,
      y: handPos.y - lift
    }),
    elbow: rotateOut({
      x: elbowPos.x + lean * 0.35,
      y: elbowPos.y - lift * 0.6
    })
  };
}

function rotateRelativePoint(vec, angle, radiusScale=1){
  if(!vec) return null;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedX = vec.x * cos - vec.y * sin;
  const rotatedY = vec.x * sin + vec.y * cos;
  if(radiusScale !== 1){
    const baseLen = Math.hypot(vec.x, vec.y) || 1;
    const targetLen = baseLen * radiusScale;
    const currentLen = Math.hypot(rotatedX, rotatedY) || 1;
    const scale = targetLen / currentLen;
    return { x: rotatedX * scale, y: rotatedY * scale };
  }
  return { x: rotatedX, y: rotatedY };
}

function raycastEnvironment(origin, dir, maxDist, rectangles){
  if(!origin || !dir || !Array.isArray(rectangles) || rectangles.length === 0) return null;
  let best = null;
  for(const rect of rectangles){
    if(!rect) continue;
    const hit = raycastRectAgainstBox(origin, dir, maxDist, rect);
    if(!hit || hit.distance < 0.001) continue;
    if(!best || hit.distance < best.distance){
      best = { ...hit, rect };
    }
  }
  return best;
}

function raycastRectAgainstBox(origin, dir, maxDist, rect){
  const { left, right, top, bottom } = rect;
  const candidates = [];
  if(Math.abs(dir.x) > 1e-6){
    const tLeft = (left - origin.x) / dir.x;
    if(tLeft >= 0 && tLeft <= maxDist){
      const y = origin.y + dir.y * tLeft;
      if(y >= top && y <= bottom) candidates.push({ distance: tLeft, point: { x: left, y }, normal: { x: -1, y: 0 } });
    }
    const tRight = (right - origin.x) / dir.x;
    if(tRight >= 0 && tRight <= maxDist){
      const y = origin.y + dir.y * tRight;
      if(y >= top && y <= bottom) candidates.push({ distance: tRight, point: { x: right, y }, normal: { x: 1, y: 0 } });
    }
  }else if(origin.x >= left && origin.x <= right){
    // Parallel to vertical faces; handle horizontal edges only.
  }
  if(Math.abs(dir.y) > 1e-6){
    const tTop = (top - origin.y) / dir.y;
    if(tTop >= 0 && tTop <= maxDist){
      const x = origin.x + dir.x * tTop;
      if(x >= left && x <= right) candidates.push({ distance: tTop, point: { x, y: top }, normal: { x: 0, y: -1 } });
    }
    const tBottom = (bottom - origin.y) / dir.y;
    if(tBottom >= 0 && tBottom <= maxDist){
      const x = origin.x + dir.x * tBottom;
      if(x >= left && x <= right) candidates.push({ distance: tBottom, point: { x, y: bottom }, normal: { x: 0, y: 1 } });
    }
  }else if(origin.y >= top && origin.y <= bottom){
    // Parallel to horizontal faces.
  }
  if(!candidates.length) return null;
  candidates.sort((a, b)=>a.distance - b.distance);
  const hit = candidates[0];
  if(hit.distance < 0 || hit.distance > maxDist) return null;
  return hit;
}

function reflectVector(dir, normal){
  if(!dir || !normal) return null;
  const nLen = Math.hypot(normal.x, normal.y) || 1;
  const nx = normal.x / nLen;
  const ny = normal.y / nLen;
  const dot = dir.x * nx + dir.y * ny;
  const rx = dir.x - 2 * dot * nx;
  const ry = dir.y - 2 * dot * ny;
  const rLen = Math.hypot(rx, ry) || 1;
  return { x: rx / rLen, y: ry / rLen };
}

function closestPointOnSegments(point, segments){
  if(!point || !Array.isArray(segments) || segments.length === 0) return null;
  let best = null;
  for(let i=0;i<segments.length;i++){
    const seg = segments[i];
    if(!seg || !seg.start || !seg.end) continue;
    const res = closestPointOnSegment(point.x, point.y, seg.start.x, seg.start.y, seg.end.x, seg.end.y);
    if(!res) continue;
    if(!best || res.distance < best.distance){
      best = { ...res, segmentIndex: i, direction: seg.end.x - seg.start.x };
    }
  }
  return best;
}

function closestPointOnSegment(px, py, ax, ay, bx, by){
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if(lenSq <= 0.0001){
    const dist = Math.hypot(px - ax, py - ay);
    return { point: { x: ax, y: ay }, distance: dist, t: 0 };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const sx = ax + dx * t;
  const sy = ay + dy * t;
  const distance = Math.hypot(px - sx, py - sy);
  return { point: { x: sx, y: sy }, distance, t };
}

