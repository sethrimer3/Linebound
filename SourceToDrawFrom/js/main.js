// main.js

const ITERATIONS = 8;
const SUB_STEPS = 2;
const DEFAULT_MAX_PHYSICS_STEP = 1 / 120;
const DOOR_INTERACT_RADIUS = 45;
const CHEST_LOOT_PICKUP_DELAY_MS = 2000;
const DEFEAT_OVERLAY_SETTINGS = {
  messageDuration: 1.6,
  fadeOutDuration: 1.2,
  blackoutHoldDuration: 0.45,
  fadeInDuration: 1.05,
  targetStageId: 'worldTree'
};

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const SAVE_STORAGE_KEY = 'stick_rpg_save_v1';
const SAVE_DIRECTORY = 'saves';
const SAVE_FILE_NAME = 'savegame.json';

const SOFT_CURSOR_BASE_JOINTS = [
  { x: 0, y: 0, radius: 3.8, stiffness: 28, flow: 0.05, wave: 0 },
  { x: -2, y: 22, radius: 2.6, stiffness: 20, flow: 0.07, wave: 1.1 },
  { x: 5, y: 18, radius: 2.4, stiffness: 18, flow: 0.09, wave: 1.2 },
  { x: 10, y: 26, radius: 2.2, stiffness: 16, flow: 0.12, wave: 1.2 },
  { x: 17, y: 22, radius: 2.1, stiffness: 16, flow: 0.12, wave: 1.1 },
  { x: 12, y: 14, radius: 2.2, stiffness: 18, flow: 0.09, wave: 1.0 },
  { x: 20, y: 12, radius: 2.0, stiffness: 20, flow: 0.08, wave: 1.0 },
  { x: 9, y: 3, radius: 2.3, stiffness: 24, flow: 0.06, wave: 0.9 }
];

const CURSOR_SWIRL_PARTICLE_COUNT = 12;
const CURSOR_SWIRL_BASE_RADIUS = 6;
const CURSOR_SWIRL_RADIUS_VARIANCE = 6;
const CURSOR_SWIRL_SPEED_MIN = 2.4;
const CURSOR_SWIRL_SPEED_MAX = 4.2;
const CURSOR_SWIRL_SIZE_MIN = 1.8;
const CURSOR_SWIRL_SIZE_MAX = 3.6;

let world = null;
let last = 0;

function startGame(){
  world = createWorld();
  const audio = window.audioSystem;
  if(audio && typeof audio.applySettings === 'function'){
    audio.applySettings(world.ui?.settings?.audio || {});
  }
  if(audio && typeof audio.prepareUnlock === 'function'){
    audio.prepareUnlock();
  }
  configureCanvas(world, canvas, ctx);
  attachInputHandlers(world, canvas);
  setupDeveloperUI(world);
  resetWorld(world);
  last = nowMs();
  requestAnimationFrame(frame);
}

function initializeAndStart(){
  const initPromises = [];
  if(typeof loadLevelDefinitions === 'function'){
    initPromises.push(loadLevelDefinitions().catch(err=>{
      console.error('[Init] Level data failed to load', err);
      throw err;
    }));
  }
  if(typeof initializeParticleRegistry === 'function'){
    initPromises.push(initializeParticleRegistry().catch(err=>{
      console.error('[Particles] Registry initialization failed', err);
      return null;
    }));
  }
  if(typeof initializeDecorationRegistry === 'function'){
    initPromises.push(initializeDecorationRegistry().catch(err=>{
      console.error('[Decorations] Registry initialization failed', err);
      return null;
    }));
  }
  if(initPromises.length){
    Promise.all(initPromises).then(startGame).catch(err=>{
      console.error('[Init] Failed to initialize game', err);
    });
  }else{
    startGame();
  }
}

function frame(tms){
  if(!world){
    requestAnimationFrame(frame);
    return;
  }
  const elapsed = (tms - last) / 1000;
  const dt = Math.min(1/30, Math.max(0, elapsed));
  last = tms;
  updateWorld(world, dt);
  renderWorld(world, ctx);
  requestAnimationFrame(frame);
}

initializeAndStart();

function createWorld(){
  return {
    width:0, height:0, groundY:0,
    terrain:[], decor:[], terrainCells:null,
    ceilingY: null,
    blockCollisionEnabled:true,
    platforms:[], hazards:[], breakables:[], toggleBlocks:[],
    points:[], constraints:[], sticks:[], projectiles:[], items:[], particles:[], physicsBoxes:[], softBodies:[],
    npcEntities: [],
    grasshoppers:[],
    grassFireflies:[],
    summons:[], soulOrbs:[],
    sand:null,
    powder:null,
    grass:null,
    water:null,
    lava:null,
    enemies:[], door:{x:0,y:0,w:36,h:56,open:false,hidden:true},
    coins:0,
    level:1,
    input: input, selected:null,
    state:'map',
    paused:false,
    map:null,
    profile:null,
    levelState:null,
    stageLabel:'World Map',
    camera: createCameraState(),
    maxPhysicsStep: DEFAULT_MAX_PHYSICS_STEP,
    ui:{
      dragItem:null,
      dragPos:null,
      inventoryScrollDrag:null,
      listenersAttached:false,
      menuOpen:false,
      menuTab:'settings',
      inventoryOpen:false,
      confirmAction:null,
      skillPanel:{ open:false, teamIndex:0, pedestal:null },
      shopPanel:{ open:false, vendor:null, teamIndex:0, message:'' },
      settings:{
        audio:{ master:50, music:50, effects:50 },
        visual:{ bloom:0, graphicsQuality:'high' },
        gameplay:{ alwaysShowHp:false, developerMode:false, unlockAllStages:false, feetClamping:false, showHitboxes:false, hitboxRigStrength:100 }
      }
    },
    gameplayFlags:{ feetClamping:false, showHitboxes:false, hitboxRigStrength:100, hitboxRigMultiplier:1 },
    dev: createDeveloperState(),
    waterEmitters:[],
    lavaEmitters:[],
    focusedInteractable: null,
    focusedDoor: null,
    interactionPrompt: null,
    cursor: createCursorState(),
    teamAbilityState: { abilityId: null, cooldownUntil: 0, active: null },
    hoverStick: null,
    scoutDrone: { active:false, entity:null, operator:null, operatorIndex:null },
    defeatOverlay: null
  };
}

function createCameraState(){
  return {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    damping: 8,
    followOffsetY: -90,
    activeZoneId: null,
    initialized: false,
    bounds: { left: 0, right: 0, top: 0, bottom: 0 }
  };
}

function createCursorState(){
  const state = {
    screenX: 0,
    screenY: 0,
    targetScreenX: 0,
    targetScreenY: 0,
    worldX: 0,
    worldY: 0,
    targetWorldX: 0,
    targetWorldY: 0,
    velocityX: 0,
    velocityY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    followStrength: 26,
    visible: false,
    alpha: 0,
    mode: 'soft',
    modeTime: 0,
    modeColor: '#ffffff',
    baseSoftJoints: SOFT_CURSOR_BASE_JOINTS.map(j=>({ ...j })),
    softJoints: SOFT_CURSOR_BASE_JOINTS.map(j=>({ x: 0, y: 0, radius: j.radius, phase: Math.random()*TAU })),
    swirlParticles: [],
    swordTrail: [],
    scopePulse: 0,
    heading: -Math.PI/4,
    initialized: false
  };
  resetSoftCursorJoints(state);
  return state;
}

function resetSoftCursorJoints(cursor){
  if(!cursor || !Array.isArray(cursor.softJoints)) return;
  const joints = cursor.softJoints;
  for(let i=0;i<joints.length;i++){
    const base = cursor.baseSoftJoints?.[i];
    const joint = joints[i];
    if(!joint || !base) continue;
    joint.x = cursor.screenX + base.x;
    joint.y = cursor.screenY + base.y;
    joint.phase = Math.random()*TAU;
  }
}

function screenToWorld(world, pos){
  if(!world || !pos) return { x: 0, y: 0 };
  const camera = ensureCamera(world);
  const camX = Number.isFinite(camera?.x) ? camera.x : (world.width || 0) * 0.5;
  const camY = Number.isFinite(camera?.y) ? camera.y : (world.height || 0) * 0.5;
  const halfW = (world.width || 0) * 0.5;
  const halfH = (world.height || 0) * 0.5;
  return {
    x: pos.x + camX - halfW,
    y: pos.y + camY - halfH
  };
}

function updateCursorTarget(world, screenPos, worldPos){
  if(!world) return;
  const cursor = world.cursor || (world.cursor = createCursorState());
  if(screenPos){
    cursor.targetScreenX = screenPos.x;
    cursor.targetScreenY = screenPos.y;
  }
  if(worldPos){
    cursor.targetWorldX = worldPos.x;
    cursor.targetWorldY = worldPos.y;
    if(world.state === 'level'){
      world.hoverStick = findStickUnderPointer(world, worldPos);
    }
  }
  if(world.state !== 'level' && world.hoverStick){
    world.hoverStick = null;
  }
  cursor.visible = true;
}

function findStickUnderPointer(world, worldPos){
  if(!world || world.state !== 'level' || !worldPos) return null;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const hoverRadius = Math.max(60, 96 * STICK_SCALE);
  let closest = null;
  let closestDist = Infinity;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    if(!stick.label && !stick.isEnemy) continue;
    if(typeof stick.center !== 'function') continue;
    const center = stick.center();
    if(!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)) continue;
    const dist = distance(worldPos.x, worldPos.y, center.x, center.y);
    if(dist > hoverRadius) continue;
    if(dist < closestDist){
      closest = stick;
      closestDist = dist;
    }
  }
  return closest;
}

function updateCursorState(world, dt){
  if(!world) return;
  const cursor = world.cursor || (world.cursor = createCursorState());
  const safeDt = Math.max(dt, 1/120);
  const targetScreenX = Number.isFinite(cursor.targetScreenX) ? cursor.targetScreenX : cursor.screenX;
  const targetScreenY = Number.isFinite(cursor.targetScreenY) ? cursor.targetScreenY : cursor.screenY;
  const targetWorldX = Number.isFinite(cursor.targetWorldX) ? cursor.targetWorldX : cursor.worldX;
  const targetWorldY = Number.isFinite(cursor.targetWorldY) ? cursor.targetWorldY : cursor.worldY;
  if(!cursor.initialized){
    cursor.screenX = targetScreenX;
    cursor.screenY = targetScreenY;
    cursor.worldX = targetWorldX;
    cursor.worldY = targetWorldY;
    cursor.lastScreenX = targetScreenX;
    cursor.lastScreenY = targetScreenY;
    cursor.initialized = true;
    resetSoftCursorJoints(cursor);
  }
  const follow = 1 - Math.exp(-(cursor.followStrength || 24) * dt);
  cursor.screenX += (targetScreenX - cursor.screenX) * follow;
  cursor.screenY += (targetScreenY - cursor.screenY) * follow;
  cursor.worldX += (targetWorldX - cursor.worldX) * follow;
  cursor.worldY += (targetWorldY - cursor.worldY) * follow;
  const prevX = cursor.lastScreenX;
  const prevY = cursor.lastScreenY;
  cursor.lastScreenX = cursor.screenX;
  cursor.lastScreenY = cursor.screenY;
  cursor.velocityX = (cursor.screenX - prevX) / safeDt;
  cursor.velocityY = (cursor.screenY - prevY) / safeDt;
  const appearance = determineCursorAppearance(world);
  if(cursor.mode !== appearance.mode){
    cursor.mode = appearance.mode;
    cursor.modeTime = 0;
    resetCursorModeState(cursor);
  }else{
    cursor.modeTime += dt;
  }
  cursor.modeColor = appearance.color;
  const targetAlpha = cursor.visible ? 1 : 0;
  const alphaStep = 1 - Math.exp(-12 * dt);
  cursor.alpha += (targetAlpha - cursor.alpha) * alphaStep;
  cursor.alpha = clamp(cursor.alpha, 0, 1);
  switch(cursor.mode){
    case 'scope':
      updateScopeCursor(cursor, dt);
      break;
    case 'swirl':
      updateSwirlCursor(cursor, dt);
      break;
    case 'sword':
      updateSwordCursor(world, cursor, dt);
      break;
    default:
      updateSoftCursor(cursor, dt);
      break;
  }
  if(world.state === 'level'){
    if(cursor.visible){
      world.hoverStick = findStickUnderPointer(world, { x: cursor.worldX, y: cursor.worldY });
    }else if(world.hoverStick){
      world.hoverStick = null;
    }
  }else if(world.hoverStick){
    world.hoverStick = null;
  }
}

function resetCursorModeState(cursor){
  if(!cursor) return;
  if(cursor.mode === 'soft'){
    resetSoftCursorJoints(cursor);
  }else if(cursor.mode === 'swirl'){
    cursor.swirlParticles = [];
  }else if(cursor.mode === 'sword'){
    cursor.swordTrail = [];
  }
}

function determineCursorAppearance(world){
  const fallback = { mode: 'soft', color: '#ffffff' };
  if(!world || world.state !== 'level') return fallback;
  const ui = world.ui || {};
  if(ui.menuOpen || ui.inventoryOpen || ui.dragItem || ui.skillPanel?.open || ui.shopPanel?.open) return fallback;
  const player = world.selected;
  if(!player || player.dead || typeof player.weapon !== 'function') return fallback;
  const weapon = player.weapon();
  if(!weapon) return fallback;
  const id = typeof player.currentWeaponId === 'function' ? player.currentWeaponId() : null;
  if(weapon.kind === 'gun'){
    const color = weapon.scopeColor || weapon.projectileColor || weapon.color || '#ffffff';
    return { mode: 'scope', color };
  }
  if(weapon.kind === 'staff' || weapon.kind === 'spirit'){
    const color = weapon.staff?.beamColor || weapon.orbColor || weapon.projectileColor || weapon.color || '#ffffff';
    return { mode: 'swirl', color };
  }
  if(weapon.kind === 'melee' && weaponIsSword(id, weapon)){
    const color = weapon.color || '#ffffff';
    return { mode: 'sword', color };
  }
  return fallback;
}

function weaponIsSword(id, weapon){
  const match = /sword|blade|saber/i;
  if(id && match.test(id)) return true;
  const name = weapon?.name || '';
  return match.test(name);
}

function updateSoftCursor(cursor, dt){
  if(!cursor || !Array.isArray(cursor.softJoints)) return;
  const speed = Math.min(640, Math.hypot(cursor.velocityX || 0, cursor.velocityY || 0));
  for(let i=0;i<cursor.softJoints.length;i++){
    const joint = cursor.softJoints[i];
    const base = cursor.baseSoftJoints?.[i];
    if(!joint || !base) continue;
    joint.phase = (joint.phase || 0) + dt * (base.wave || 2.2);
    const wobbleStrength = (speed / 480) * (base.wave || 2.2);
    const flow = base.flow || 0;
    const targetX = cursor.screenX + base.x - (cursor.velocityX || 0) * flow * 0.04;
    const targetY = cursor.screenY + base.y - (cursor.velocityY || 0) * flow * 0.04;
    const wobbleX = Math.cos(joint.phase) * wobbleStrength;
    const wobbleY = Math.sin(joint.phase) * wobbleStrength * 0.5;
    const stiffness = base.stiffness || 12;
    const t = 1 - Math.exp(-stiffness * dt);
    joint.x += (targetX + wobbleX - joint.x) * t;
    joint.y += (targetY + wobbleY - joint.y) * t;
  }
}

function updateScopeCursor(cursor, dt){
  if(!cursor) return;
  cursor.scopePulse = (cursor.scopePulse || 0) + dt * 3.8;
  updateSoftCursor(cursor, dt * 0.35);
}

function ensureSwirlParticles(cursor){
  if(!cursor) return;
  if(!Array.isArray(cursor.swirlParticles)) cursor.swirlParticles = [];
  if(cursor.swirlParticles.length >= CURSOR_SWIRL_PARTICLE_COUNT) return;
  while(cursor.swirlParticles.length < CURSOR_SWIRL_PARTICLE_COUNT){
    cursor.swirlParticles.push({
      angle: Math.random() * TAU,
      baseRadius: CURSOR_SWIRL_BASE_RADIUS + Math.random() * CURSOR_SWIRL_RADIUS_VARIANCE,
      speed: CURSOR_SWIRL_SPEED_MIN + Math.random() * (CURSOR_SWIRL_SPEED_MAX - CURSOR_SWIRL_SPEED_MIN),
      size: CURSOR_SWIRL_SIZE_MIN + Math.random() * (CURSOR_SWIRL_SIZE_MAX - CURSOR_SWIRL_SIZE_MIN),
      offset: Math.random() * TAU,
      wobble: 0
    });
  }
}

function updateSwirlCursor(cursor, dt){
  ensureSwirlParticles(cursor);
  const particles = cursor.swirlParticles;
  const speed = Math.min(720, Math.hypot(cursor.velocityX || 0, cursor.velocityY || 0));
  const drift = speed * 0.012;
  for(const particle of particles){
    particle.angle = (particle.angle + particle.speed * dt) % TAU;
    const wobbleTarget = (Math.sin(cursor.modeTime * 6 + particle.offset) + 1) * 0.5;
    particle.wobble += (wobbleTarget - particle.wobble) * (1 - Math.exp(-6 * dt));
    const radius = particle.baseRadius + particle.wobble * 6 + drift;
    const targetX = cursor.screenX + Math.cos(particle.angle) * radius;
    const targetY = cursor.screenY + Math.sin(particle.angle) * radius;
    if(!Number.isFinite(particle.x) || !Number.isFinite(particle.y)){
      particle.x = targetX;
      particle.y = targetY;
    }else{
      const smoothing = 1 - Math.exp(-18 * dt);
      particle.x += (targetX - particle.x) * smoothing;
      particle.y += (targetY - particle.y) * smoothing;
    }
  }
}

function shortestAngleDifference(a, b){
  let diff = (b - a) % TAU;
  if(diff > Math.PI) diff -= TAU;
  if(diff < -Math.PI) diff += TAU;
  return diff;
}

function updateSwordCursor(world, cursor, dt){
  if(!cursor) return;
  const speed = Math.hypot(cursor.velocityX || 0, cursor.velocityY || 0);
  let targetHeading = null;
  if(world && world.state === 'level'){
    const team = Array.isArray(world.team) ? world.team : [];
    let activeIndex = Number.isFinite(world.teamActiveIndex) ? world.teamActiveIndex : world.profile?.activeIndex;
    if(!Number.isFinite(activeIndex)) activeIndex = 0;
    activeIndex = clamp(activeIndex, 0, Math.max(0, team.length - 1));
    const player = world.selected || team[activeIndex] || null;
    let origin = null;
    if(player){
      if(typeof player.center === 'function') origin = player.center();
      else if(player.pointsByName?.pelvis){
        const pelvis = player.pointsByName.pelvis;
        origin = { x: pelvis.x, y: pelvis.y };
      }
    }
    if(origin && Number.isFinite(origin.x) && Number.isFinite(origin.y)){
      const dx = cursor.worldX - origin.x;
      const dy = cursor.worldY - origin.y;
      if(dx || dy){
        targetHeading = Math.atan2(dy, dx);
      }
    }
  }
  if(targetHeading === null || !Number.isFinite(targetHeading)){
    targetHeading = Math.atan2(cursor.velocityY || 0, cursor.velocityX || 0);
    if(!Number.isFinite(targetHeading)){
      targetHeading = cursor.heading ?? -Math.PI / 4;
    }
  }
  if(!Number.isFinite(cursor.heading)) cursor.heading = targetHeading;
  const diff = shortestAngleDifference(cursor.heading, targetHeading);
  cursor.heading += diff * (1 - Math.exp(-16 * dt));
  if(!Array.isArray(cursor.swordTrail)) cursor.swordTrail = [];
  cursor.swordTrail.push({
    x: cursor.screenX,
    y: cursor.screenY,
    angle: cursor.heading,
    life: 0,
    speed: speed
  });
  const lifeStep = dt;
  for(let i=cursor.swordTrail.length-1;i>=0;i--){
    const entry = cursor.swordTrail[i];
    entry.life += lifeStep;
    if(entry.life > 0.35) cursor.swordTrail.splice(i,1);
  }
  updateSoftCursor(cursor, dt * 0.2);
}

function drawGameCursor(world, ctx){
  const cursor = world?.cursor;
  if(!cursor || cursor.alpha <= 0.01) return;
  ctx.save();
  switch(cursor.mode){
    case 'scope':
      drawScopeCursor(ctx, cursor);
      break;
    case 'swirl':
      drawSwirlCursor(ctx, cursor);
      break;
    case 'sword':
      drawSwordCursor(ctx, cursor);
      break;
    default:
      drawSoftCursor(ctx, cursor);
      break;
  }
  ctx.restore();
}

function drawSoftCursor(ctx, cursor){
  const joints = cursor.softJoints || [];
  if(joints.length === 0) return;
  const alpha = cursor.alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(joints[0].x, joints[0].y);
  for(let i=1;i<joints.length;i++) ctx.lineTo(joints[i].x, joints[i].y);
  ctx.closePath();
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(17,23,35,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1.5;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = 'rgba(24,32,46,0.5)';
  ctx.stroke();
  const tip = joints[0];
  if(tip){
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(tip.x + 1.2, tip.y + 1.2, 1.9, 0, TAU);
    ctx.fill();
  }
}

function drawScopeCursor(ctx, cursor){
  const alpha = cursor.alpha;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2;
  ctx.strokeStyle = cursor.modeColor || '#ffffff';
  const pulse = (Math.sin(cursor.scopePulse || 0) + 1) * 0.5;
  const radius = 12 + pulse * 3;
  ctx.beginPath();
  ctx.arc(cursor.screenX, cursor.screenY, radius + 2, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  const inner = 4 + pulse * 1.2;
  ctx.beginPath();
  ctx.arc(cursor.screenX, cursor.screenY, inner, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cursor.screenX - radius - 6, cursor.screenY);
  ctx.lineTo(cursor.screenX - inner - 3, cursor.screenY);
  ctx.moveTo(cursor.screenX + radius + 6, cursor.screenY);
  ctx.lineTo(cursor.screenX + inner + 3, cursor.screenY);
  ctx.moveTo(cursor.screenX, cursor.screenY - radius - 6);
  ctx.lineTo(cursor.screenX, cursor.screenY - inner - 3);
  ctx.moveTo(cursor.screenX, cursor.screenY + radius + 6);
  ctx.lineTo(cursor.screenX, cursor.screenY + inner + 3);
  ctx.stroke();
  ctx.fillStyle = cursor.modeColor || '#ffffff';
  ctx.globalAlpha = alpha * 0.25;
  ctx.beginPath();
  ctx.arc(cursor.screenX, cursor.screenY, inner + 1.5, 0, TAU);
  ctx.fill();
}

function drawSwirlCursor(ctx, cursor){
  const alpha = cursor.alpha;
  const particles = cursor.swirlParticles || [];
  ctx.globalAlpha = alpha * 0.85;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = cursor.modeColor || '#ffffff';
  for(const particle of particles){
    if(!Number.isFinite(particle.x) || !Number.isFinite(particle.y)) continue;
    const size = particle.size + Math.sin(cursor.modeTime * 6 + particle.offset) * 0.4;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(1.4, size), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = alpha * 0.45;
  ctx.beginPath();
  const coreRadius = 5 + Math.min(10, Math.hypot(cursor.velocityX || 0, cursor.velocityY || 0) * 0.015);
  ctx.arc(cursor.screenX, cursor.screenY, coreRadius, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawSwordCursor(ctx, cursor){
  const alpha = cursor.alpha;
  const color = cursor.modeColor || '#ffffff';
  const trail = cursor.swordTrail || [];
  ctx.globalCompositeOperation = 'lighter';
  for(const entry of trail){
    const lifeT = clamp(entry.life / 0.35, 0, 1);
    const entryAlpha = (1 - lifeT) * 0.45 * alpha;
    if(entryAlpha <= 0.001) continue;
    ctx.save();
    ctx.globalAlpha = entryAlpha;
    ctx.translate(entry.x, entry.y);
    ctx.rotate(entry.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(18 + entry.speed * 0.006, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.translate(cursor.screenX, cursor.screenY);
  ctx.rotate(cursor.heading || -Math.PI/4);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(4, -3.5);
  ctx.lineTo(22, 0);
  ctx.lineTo(4, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.85;
  ctx.beginPath();
  ctx.arc(-8, 0, 3.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-2, -4);
  ctx.lineTo(-2, 4);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function configureCanvas(world, canvas, ctx){
  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(innerWidth*dpr);
    canvas.height = Math.floor(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    canvas.style.width='100%';
    canvas.style.height='100%';
    world.width = innerWidth;
    world.height = innerHeight;
    world.groundY = world.height-100;
    handleDeveloperResize(world);
  }
  addEventListener('resize', resize, {passive:true});
  resize();
}

function attachInputHandlers(world, canvas){
  const canvasPos = (e)=>{
    const r=canvas.getBoundingClientRect();
    return {x:e.clientX-r.left, y:e.clientY-r.top};
  };

  const audio = window.audioSystem;
  if(audio && typeof audio.prepareUnlock === 'function'){
    audio.prepareUnlock();
  }

  canvas.addEventListener('mousemove', e=>{
    const screenPos = canvasPos(e);
    const worldPos = screenToWorld(world, screenPos);
    updateCursorTarget(world, screenPos, worldPos);
    if(handleDeveloperPointer(world, 'move', e, worldPos)) return;
    if(world.state === 'map'){
      if(world.map){
        world.map.pointer = screenPos;
        if(world.map.dragging) updateMapDrag(world, screenPos);
        world.map.pointerMap = screenToMapCoords(world, screenPos);
        const prevHover = world.map.hoverId;
        const hover = findMapNodeAt(world, screenPos);
        const hoverId = hover ? hover.id : null;
        if(prevHover !== hoverId){
          world.map.hoverId = hoverId;
          if(hoverId && audio && typeof audio.playEffect === 'function'){
            audio.playEffect('mapHover');
          }
        }else{
          world.map.hoverId = hoverId;
        }
      }
    }else{
      world.input.aim = { x: worldPos.x, y: worldPos.y };
      if(world.input.dragging){
        const p = world.input.dragging;
        p.x = worldPos.x;
        p.y = worldPos.y;
        p.prevX = p.x;
        p.prevY = p.y;
        p.vx = 0;
        p.vy = 0;
        p.ax = 0;
        p.ay = 0;
      }
    }
  });

  canvas.addEventListener('mouseenter', e=>{
    const screenPos = canvasPos(e);
    const worldPos = screenToWorld(world, screenPos);
    updateCursorTarget(world, screenPos, worldPos);
    if(world.state === 'map'){
      if(world.map){
        world.map.pointer = screenPos;
        world.map.pointerMap = screenToMapCoords(world, screenPos);
      }
    }else{
      world.input.aim = { x: worldPos.x, y: worldPos.y };
    }
  });

  canvas.addEventListener('mouseleave', e=>{
    handleDeveloperPointer(world, 'leave', e, null);
    if(world.dev) world.dev.pointerWorld = null;
    if(world.cursor) world.cursor.visible = false;
    world.hoverStick = null;
    if(world.state === 'map' && world.map){
      cancelMapDrag(world);
      world.map.pointer = null;
      world.map.pointerMap = null;
      world.map.hoverId = null;
    }
  });

  canvas.addEventListener('mousedown', e=>{
    const screenPos = canvasPos(e);
    const worldPos = screenToWorld(world, screenPos);
    if(isDefeatOverlayActive(world)){
      e.preventDefault();
      return;
    }
    if(handleDeveloperPointer(world, 'down', e, worldPos)) return;
    if(world.state === 'level' && world.levelState?.defeat?.active){
      e.preventDefault();
      return;
    }
    if(e.button === 2){
      e.preventDefault();
      if(world.state === 'level' && !world.ui?.dragItem){
        const offhandUsed = tryUseManualOffhand(world);
        if(offhandUsed){
          if(typeof renderHUD === 'function') renderHUD(world);
        }else{
          const used = triggerWeaponSpecial(world);
          if(used && typeof renderHUD === 'function'){
            renderHUD(world);
          }
        }
      }
      return;
    }
    if(world.state === 'map'){
      if(world.map){
        world.map.pointer = screenPos;
        world.map.pointerMap = screenToMapCoords(world, screenPos);
        beginMapDrag(world, screenPos, e);
      }
      return;
    }
    if(world.ui.dragItem) return;
    if(!world.selected || world.selected.dead || world.selected.selectable === false){
      selectNearestFriendly(world, worldPos);
    }
    const dragged = grabNearbyJoint(world, worldPos);
    if(e.button === 0 && !dragged && world.selected) world.selected.tryAttack(worldPos.x, worldPos.y);
  });

  addEventListener('mouseup', (e)=>{
    const screenPos = canvasPos(e);
    const worldPos = screenToWorld(world, screenPos);
    if(isDefeatOverlayActive(world)){
      e.preventDefault();
      return;
    }
    if(handleDeveloperPointer(world, 'up', e, worldPos)){
      if(world.input.dragging){ world.input.dragging.dragged=false; world.input.dragging=null; }
      return;
    }
    if(world.state === 'map'){
      if(world.map){
        world.map.pointer = screenPos;
        world.map.pointerMap = screenToMapCoords(world, screenPos);
        const dragged = endMapDrag(world, e.button);
        if(!dragged){
          handleMapClick(world, screenPos);
        }
      }
      return;
    }
    if(world.input.dragging){ world.input.dragging.dragged=false; world.input.dragging=null; }
    if(world.state === 'level' && world.selected && !world.ui?.dragItem){
      world.selected.releaseAttack(worldPos.x, worldPos.y);
    }
  });

  canvas.addEventListener('wheel', e=>{
    if(isDefeatOverlayActive(world)){
      e.preventDefault();
      return;
    }
    if(world.state !== 'map') return;
    if(!world.map) return;
    const screenPos = canvasPos(e);
    adjustMapZoom(world, screenPos, e.deltaY || 0);
    world.map.pointer = screenPos;
    world.map.pointerMap = screenToMapCoords(world, screenPos);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e)=>{
    e.preventDefault();
    e.stopPropagation();
  });

  addEventListener('keydown', e=>handleKey(world, e, true));
  addEventListener('keyup', e=>handleKey(world, e, false));
}

function triggerWeaponSpecial(world){
  if(!world || world.state !== 'level') return false;
  const stick = world.selected;
  if(!stick || stick.dead) return false;
  if(typeof stick.weapon !== 'function') return false;
  const weapon = stick.weapon();
  if(!weapon || typeof weapon.kind !== 'string') return false;
  if(weapon.kind === 'summoner' && typeof stick.trySummonerRelease === 'function'){
    return !!stick.trySummonerRelease(world);
  }
  if(weapon.kind === 'gun' && typeof stick.toggleGunFastReload === 'function'){
    const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
    const prev = typeof stick.isGunFastReloadActive === 'function'
      ? stick.isGunFastReloadActive(weaponId)
      : null;
    const result = stick.toggleGunFastReload(weaponId);
    const next = typeof stick.isGunFastReloadActive === 'function'
      ? stick.isGunFastReloadActive(weaponId)
      : null;
    const changed = prev !== next;
    if(typeof result === 'boolean') return changed || result;
    return changed;
  }
  if(typeof stick.activateWeaponSpecial === 'function'){
    return !!stick.activateWeaponSpecial(world);
  }
  return false;
}

function tryUseManualOffhand(world){
  if(!world || world.state !== 'level') return false;
  if(world.scoutDrone?.active){
    if(typeof deactivateScoutDrone === 'function'){
      return !!deactivateScoutDrone(world, { explode: true });
    }
    return false;
  }
  const stick = world.selected;
  if(!stick || stick.dead || typeof stick.offhandItem !== 'function') return false;
  const offhand = stick.offhandItem();
  if(!offhand || offhand.type !== 'offhand') return false;
  const info = OFFHAND_ITEMS?.[offhand.id];
  if(!info) return false;
  if(info.kind === 'scoutRemote' && typeof tryUseScoutRemote === 'function'){
    return !!tryUseScoutRemote(world, stick);
  }
  return false;
}

function tryFeedBiofuseArmor(world, stick){
  if(!world || !stick) return false;
  if(typeof stick.armorItem !== 'function') return false;
  const armorItem = stick.armorItem();
  if(!armorItem || armorItem.type !== 'armor' || armorItem.id !== 'biofuseArmor') return false;
  const info = ARMOR_ITEMS?.[armorItem.id];
  if(!info || !info.biofuse) return false;
  const coinCost = Math.max(1, Math.round(info.biofuse.coinCost ?? 5));
  if(world.coins < coinCost){
    if(typeof spawnDamageNumber === 'function'){
      spawnDamageNumber(world, stick, 0, {
        text: 'Need Coins',
        color: '#ffd36b',
        strokeColor: 'rgba(30, 24, 12, 0.75)',
        maxLife: 420
      });
    }
    return false;
  }
  const perFeed = Number.isFinite(info.biofuse.defensePerFeed) ? info.biofuse.defensePerFeed : 0;
  if(perFeed === 0) return false;
  const baseDefense = Number.isFinite(info.defenseBonus)
    ? info.defenseBonus
    : (Number.isFinite(info.defense) ? info.defense : 0);
  const maxDefenseBonus = Number.isFinite(info.biofuse.maxDefenseBonus) ? info.biofuse.maxDefenseBonus : null;
  const invested = Number.isFinite(armorItem.biofuseInvested) ? armorItem.biofuseInvested : 0;
  const currentExtra = Math.min(invested * perFeed, maxDefenseBonus != null ? Math.max(0, maxDefenseBonus - baseDefense) : Infinity);
  const nextInvested = invested + 1;
  const potentialExtra = nextInvested * perFeed;
  const extraCap = maxDefenseBonus != null ? Math.max(0, maxDefenseBonus - baseDefense) : Infinity;
  if(potentialExtra <= currentExtra + 1e-6 && maxDefenseBonus != null){
    if(typeof spawnDamageNumber === 'function'){
      spawnDamageNumber(world, stick, 0, {
        text: 'At Capacity',
        color: info.biofuse?.feedbackColor || '#9ff2c8',
        strokeColor: 'rgba(16, 36, 28, 0.6)',
        maxLife: 440
      });
    }
    return false;
  }
  const nextExtra = Math.min(potentialExtra, extraCap);
  const delta = Math.max(0, nextExtra - currentExtra);
  world.coins = Math.max(0, world.coins - coinCost);
  armorItem.biofuseInvested = nextInvested;
  if(typeof recomputeStickEquipmentBonuses === 'function'){
    recomputeStickEquipmentBonuses(stick);
  }
  if(typeof updateProfileEntryFromStick === 'function'){
    updateProfileEntryFromStick(world, stick);
  }
  if(typeof spawnDamageNumber === 'function'){
    const gainLabel = delta > 0
      ? `+${(delta >= 1 ? delta.toFixed(0) : delta.toFixed(2)).replace(/0+$/, '').replace(/\.$/, '')} DEF`
      : 'Infused';
    spawnDamageNumber(world, stick, 0, {
      text: gainLabel,
      color: info.biofuse?.feedbackColor || '#9ff2c8',
      strokeColor: 'rgba(16, 36, 28, 0.6)',
      maxLife: 560
    });
  }
  if(typeof renderHUD === 'function'){
    renderHUD(world);
  }
  return true;
}

function handleKey(world, e, isDown){
  const k=e.key.toLowerCase();
  const code = (e.code || '').toLowerCase();
  if(isDefeatOverlayActive(world)){
    e.preventDefault();
    return;
  }
  if(world.ui?.shopPanel?.open){
    if(k === 'f'){
      if(isDown && !e.repeat && typeof activateHoveredShopButton === 'function' && activateHoveredShopButton(world)){
        e.preventDefault();
      }
      return;
    }
    if(isDown && (k === 'escape' || k === 'enter')){
      if(typeof closeShopPanel === 'function') closeShopPanel(world);
    }
    e.preventDefault();
    return;
  }
  if(world.ui?.skillPanel?.open){
    const targetEl = e.target instanceof Element ? e.target : null;
    const isEditableTarget = targetEl
      && targetEl.closest('.skill-panel')
      && (targetEl.matches('input, textarea, select') || targetEl.isContentEditable);
    if(isEditableTarget){
      if(isDown && k === 'escape'){
        if(typeof closeSkillPanel === 'function') closeSkillPanel(world);
        e.preventDefault();
      }
      return;
    }
    if(k === 'f'){
      if(isDown && !e.repeat && typeof activateHoveredSkillButton === 'function' && activateHoveredSkillButton(world)){
        e.preventDefault();
      }
      return;
    }
    if(isDown && (k === 'escape' || k === 'enter' || k === ' ')){
      if(typeof closeSkillPanel === 'function') closeSkillPanel(world);
    }
    e.preventDefault();
    return;
  }
  if(['arrowleft','arrowright','arrowup',' '].includes(k)) e.preventDefault();
  if(world.state==='level' && world.levelState?.defeat?.active){
    e.preventDefault();
    return;
  }
  if(k==='r' && isDown){
    resetWorld(world);
    return;
  }
  if(k==='escape'){
    if(isDown && world.state === 'level'){
      togglePauseMenu(world, !world.ui.menuOpen);
    }
    e.preventDefault();
    return;
  }
  if(k==='f' && world.state === 'map'){
    if(isDown && !e.repeat){
      if(tryToggleWorldMap(world)){
        e.preventDefault();
        return;
      }
      if(typeof activateHoveredMapDevAction === 'function' && activateHoveredMapDevAction(world)){
        e.preventDefault();
      }
    }
    return;
  }
  if(world.state!=='level') return;
  const set = (key, value)=>{ if(isDown) world.input[key]=value; else world.input[key]=false; };
  if(k==='shift'){
    set('sprint', isDown);
    return;
  }
  if(k==='a'||k==='arrowleft') set('left', isDown);
  if(k==='d'||k==='arrowright') set('right', isDown);
  if(k==='w'||k==='arrowup'){
    set('up', isDown);
    if(isDown && world.selected) world.selected.jump();
    if(!isDown && world.selected && typeof world.selected.onJumpRelease === 'function'){
      world.selected.onJumpRelease();
    }
  }
  if(k==='s'||k==='arrowdown'){
    set('down', isDown);
    if(world.selected && typeof world.selected.setCrouching === 'function'){
      world.selected.setCrouching(isDown);
    }
    if(isDown && world.selected && typeof world.selected.requestPlatformDrop === 'function'){
      world.selected.requestPlatformDrop();
    }
  }
  if(k===' '){
    set('attack', isDown);
    if(world.selected){
      if(isDown){
        world.selected.tryAttack(world.input.aim?.x, world.input.aim?.y);
      }else{
        world.selected.releaseAttack(world.input.aim?.x, world.input.aim?.y);
      }
    }
  }
  if(k==='f'){
    set('interact', isDown);
    if(isDown) attemptInteract(world);
  }
  if(k==='q'){
    if(isDown && world.state === 'level'){
      const stick = world.selected;
      if(e.shiftKey && stick && tryFeedBiofuseArmor(world, stick)){
        e.preventDefault();
        return;
      }
      if(world.scoutDrone?.active){
        deactivateScoutDrone(world, { explode: true });
        if(typeof renderHUD === 'function') renderHUD(world);
        e.preventDefault();
        return;
      }
      if(stick){
        let handled = false;
        if(typeof stick.hasScoutRemote === 'function' && stick.hasScoutRemote()){
          handled = tryUseScoutRemote(world, stick);
          if(handled && typeof renderHUD === 'function'){
            renderHUD(world);
          }
        }
        if(!handled && typeof stick.useHeldItem === 'function'){
          const used = stick.useHeldItem(world);
          if(used && typeof renderHUD === 'function'){
            renderHUD(world);
          }
        }
      }
    }
    e.preventDefault();
    return;
  }
  if(k==='e'){
    set('ability', isDown);
    if(isDown){
      if(typeof tryActivateTeamAbility === 'function'){
        tryActivateTeamAbility(world);
      }
    }else{
      if(typeof releaseTeamAbility === 'function'){
        releaseTeamAbility(world);
      }
    }
    e.preventDefault();
    return;
  }
  if(k==='i' && isDown){
    if(typeof setInventoryOpen === 'function'){
      setInventoryOpen(world, !world.ui?.inventoryOpen);
    }else if(world.ui){
      world.ui.inventoryOpen = !world.ui.inventoryOpen;
    }
    e.preventDefault();
    return;
  }
  if(isDown){
    let digitIndex = null;
    if(['1','2','3'].includes(k)){
      digitIndex = parseInt(k, 10) - 1;
    }else if(code.startsWith('digit') || code.startsWith('numpad')){
      const digit = parseInt(code.replace(/[^0-9]/g, ''), 10);
      if(digit >= 1 && digit <= 3){
        digitIndex = digit - 1;
      }
    }
    if(digitIndex !== null){
      if(world.scoutDrone?.active){
        deactivateScoutDrone(world, { explode: true });
      }
      selectTeamMember(world, digitIndex);
    }
  }
}

function attemptInteract(world){
  if(!world || world.state !== 'level') return;
  const stick = world.selected;
  if(!stick || stick.dead) return;
  if(world.ui?.skillPanel?.open || world.ui?.shopPanel?.open) return;
  updateActiveInteractable(world);
  const entry = world.focusedInteractable;
  let handled = false;
  if(entry){
    handled = !!interactWithEntry(world, entry, stick);
  }
  if(!handled && !stick.isScoutDrone){
    handled = tryInteractWithDoor(world, stick);
  }
}

function updateActiveInteractable(world){
  if(!world || world.state !== 'level'){
    world.focusedInteractable = null;
    world.focusedDoor = null;
    world.interactionPrompt = null;
    return;
  }
  const stick = world.selected;
  if(!stick || stick.dead || world.ui?.skillPanel?.open || world.ui?.shopPanel?.open){
    world.focusedInteractable = null;
    world.focusedDoor = null;
    world.interactionPrompt = null;
    return;
  }
  const entry = findInteractableForStick(world, stick);
  const doorFocus = stick.isScoutDrone ? null : findDoorInteraction(world, stick);
  world.focusedInteractable = entry || null;
  world.focusedDoor = doorFocus ? doorFocus.door : null;
  if(entry){
    world.interactionPrompt = buildInteractionPrompt(world, stick, entry);
  }else if(doorFocus){
    world.interactionPrompt = buildDoorInteractionPrompt(world, stick, doorFocus);
  }else{
    world.interactionPrompt = null;
  }
}

function findInteractableForStick(world, stick){
  const interactives = world.levelState?.interactives;
  if(!Array.isArray(interactives) || interactives.length === 0) return null;
  const center = stick.center();
  let best = null;
  let bestScore = Infinity;
  for(const entry of interactives){
    if(!entry || entry.disabled) continue;
    if(stick.isScoutDrone && entry.type !== 'lever') continue;
    if(!canStickInteractWithEntry(stick, entry)) continue;
    const dx = center.x - (entry.x ?? center.x);
    const dy = center.y - (entry.y ?? center.y);
    const score = Math.abs(dx) + Math.abs(dy) * 0.45;
    if(score < bestScore){
      bestScore = score;
      best = entry;
    }
  }
  return best;
}

function canStickInteractWithEntry(stick, entry){
  if(!stick || stick.dead || !entry) return false;
  if(stick.isScoutDrone && entry.type !== 'lever') return false;
  const center = stick.center();
  const ex = entry.x ?? center.x;
  const ey = entry.y ?? center.y;
  const radius = entry.radius ?? 70;
  const height = entry.height ?? 80;
  if(Math.abs(center.x - ex) > radius) return false;
  if(Math.abs(center.y - ey) > height) return false;
  if(entry.requireFacing){
    const facing = stick.dir >= 0 ? 1 : -1;
    const tolerance = entry.facingTolerance ?? Math.min(radius * 0.5, 42);
    if(entry.facing === 'left'){
      if(facing >= 0) return false;
      if(center.x < ex - tolerance) return false;
    }else if(entry.facing === 'right'){
      if(facing < 0) return false;
      if(center.x > ex + tolerance) return false;
    }else{
      const dir = Math.sign(ex - center.x);
      if(dir !== 0 && dir !== facing && Math.abs(center.x - ex) > tolerance) return false;
    }
  }
  if(typeof entry.canInteract === 'function' && !entry.canInteract(stick, entry)) return false;
  return true;
}

function buildInteractionPrompt(world, stick, entry){
  const playerCenter = stick.center();
  const palette = currentLevelPalette(world);
  const accent = entry.promptColor || palette.accent || '#f2d18b';
  const anchorX = entry.promptAnchor === 'player' ? playerCenter.x : (entry.promptX ?? entry.x ?? playerCenter.x);
  const anchorY = entry.promptAnchor === 'player' ? playerCenter.y : (entry.promptY ?? entry.y ?? playerCenter.y);
  const promptOffset = entry.promptOffsetY !== undefined ? entry.promptOffsetY : 72;
  const playerOffset = entry.playerPromptOffsetY !== undefined ? entry.playerPromptOffsetY : 92;
  const phaseOffset = (entry.id ? entry.id.length * 137 : 0) % 1000;
  return {
    entryId: entry.id || entry.type,
    accent,
    object: { x: anchorX, y: anchorY - promptOffset },
    player: { x: playerCenter.x, y: playerCenter.y - playerOffset },
    phaseOffset
  };
}

function normalizeInteractiveIdList(value){
  if(value === undefined || value === null) return [];
  if(Array.isArray(value)) return value.map(v=>String(v));
  return [String(value)];
}

function interactWithEntry(world, entry, stick){
  if(!entry) return false;
  if(entry.type === 'skillPedestal'){
    return interactWithSkillPedestal(world, stick, entry);
  }
  if(entry.type === 'shopkeeper'){
    return interactWithShopkeeper(world, stick, entry);
  }
  if(entry.type === 'swordPedestal'){
    return interactWithSwordPedestal(world, stick, entry);
  }
  if(entry.type === 'treasureChest'){
    return interactWithTreasureChest(world, stick, entry);
  }
  if(entry.type === 'voidPortal'){
    return interactWithVoidPortal(world, stick, entry);
  }
  if(entry.type === 'voidSymbol'){
    return interactWithVoidSymbol(world, stick, entry);
  }
  if(entry.type === 'restingStick'){
    return interactWithRestingStick(world, stick, entry);
  }
  if(entry.type === 'lever'){
    return interactWithLever(world, entry);
  }
  if(typeof entry.onInteract === 'function'){
    return !!entry.onInteract(world, stick, entry);
  }
  return false;
}

function interactWithSkillPedestal(world, stick, entry){
  if(!world || !stick) return false;
  if(world.ui?.skillPanel?.open || world.ui?.shopPanel?.open) return false;
  const abilityId = entry?.abilityId || entry?.skillId || null;
  if(abilityId){
    return interactWithSkillShrine(world, stick, entry, abilityId);
  }
  const team = Array.isArray(world.team) ? world.team : [];
  let teamIndex = typeof stick.teamIndex === 'number' ? stick.teamIndex : team.indexOf(stick);
  if(!Number.isInteger(teamIndex) || teamIndex < 0){
    teamIndex = world.teamActiveIndex ?? 0;
  }
  if(typeof openSkillPanel === 'function'){
    openSkillPanel(world, teamIndex, entry);
    return true;
  }
  return false;
}

function interactWithRestingStick(world, stick, entry){
  if(!world || !entry) return false;
  const targetSlot = clampTeamSlotCount(entry.unlockSlot ?? 2);
  const currentSlots = getUnlockedTeamSlots(world);
  if(currentSlots >= targetSlot) return false;
  if(!world.profile){
    world.profile = createPlayerProfile();
  }
  const teamProfiles = ensureTeamProfiles(world.profile.team || []);
  world.profile.team = teamProfiles;
  const targetIndex = Math.max(0, targetSlot - 1);
  if(targetIndex >= teamProfiles.length) return false;
  const profile = teamProfiles[targetIndex];
  const multipliers = skillMultipliersFromAllocations(profile.skills || defaultSkillAllocations());
  const baseMaxHp = Number.isFinite(profile.maxHp) ? profile.maxHp : 50;
  const maxHp = Number.isFinite(multipliers.health) ? baseMaxHp * multipliers.health : baseMaxHp;
  profile.maxHp = baseMaxHp;
  profile.hp = Number.isFinite(maxHp) ? Math.max(1, maxHp) : Math.max(1, baseMaxHp);
  const unlocked = setUnlockedTeamSlots(world, targetSlot);
  if(world.state === 'level'){
    const spawnX = Number.isFinite(entry.spawnX)
      ? entry.spawnX
      : (Number.isFinite(entry.x) ? entry.x : (stick && typeof stick.center === 'function' ? stick.center().x : world.width * 0.5));
    let spawnGround = typeof groundHeightAt === 'function'
      ? groundHeightAt(world, spawnX, { surface: 'top' })
      : null;
    if(!Number.isFinite(spawnGround)){
      spawnGround = world.groundY ?? (Number.isFinite(world.height) ? world.height - 100 : 0);
    }
    const spawnY = Number.isFinite(entry.spawnY)
      ? entry.spawnY
      : (Number.isFinite(spawnGround) ? spawnGround - 40 : (stick && typeof stick.center === 'function' ? stick.center().y : 0));
    const recruit = new Stick(spawnX, spawnY, false, world);
    recruit.teamIndex = targetIndex;
    applyStickProfileToStick(recruit, profile);
    world.sticks.push(recruit);
    world.team.splice(Math.min(targetIndex, world.team.length), 0, recruit);
    for(let i=0;i<world.team.length;i++){
      const member = world.team[i];
      if(member) member.teamIndex = i;
    }
    syncTeamLoadout(world);
    if(world.profile){
      world.profile.team = ensureTeamProfiles(world.profile.team);
      world.profile.inventory = normalizeLoadout(world.profile.inventory);
    }
    if(Array.isArray(world.levelState?.interactives)){
      world.levelState.interactives = world.levelState.interactives.filter(item=>item && item !== entry);
    }
    if(Array.isArray(world.decor)){
      const entryId = entry.id ? String(entry.id) : null;
      for(const prop of world.decor){
        if(!prop || prop.type !== 'restingStick') continue;
        const propId = prop.interaction?.id ? String(prop.interaction.id) : (prop.id ? String(prop.id) : null);
        if(entryId ? propId === entryId : prop.interaction === entry){
          prop.remove = true;
        }
      }
      world.decor = world.decor.filter(prop=>prop && !prop.remove);
    }
    if(world.levelState){
      world.levelState.bannerText = 'Ally recruited!';
      world.levelState.bannerSubtext = 'Press Tab to swap between sticks.';
      world.levelState.bannerTimer = 3.6;
    }
    if(world.selected && typeof world.selected === 'object' && !world.selected.dead){
      world.teamActiveIndex = clamp(world.team.indexOf(world.selected), 0, Math.max(0, world.team.length - 1));
    }
  }else{
    world.teamActiveIndex = clamp(world.teamActiveIndex ?? world.profile?.activeIndex ?? 0, 0, Math.max(0, unlocked - 1));
    if(world.profile){
      world.profile.activeIndex = clamp(world.profile.activeIndex ?? 0, 0, Math.max(0, unlocked - 1));
    }
  }
  entry.disabled = true;
  entry.recruited = true;
  if(typeof renderHUD === 'function') renderHUD(world);
  return true;
}

function interactWithSkillShrine(world, stick, entry, abilityId){
  if(!world || !stick || !entry || !abilityId) return false;
  const normalizedId = String(abilityId).trim();
  if(!normalizedId) return false;
  entry.abilityId = normalizedId;
  const state = entry.shrineState || (entry.shrineState = {});
  syncSkillShrineStateReference(world, entry, state);
  if(entry.disabled || state.activated) return false;
  const ability = typeof abilityDefinitionById === 'function'
    ? abilityDefinitionById(normalizedId)
    : null;
  if(!ability){
    state.activated = true;
    entry.disabled = true;
    syncSkillShrineStateReference(world, entry, state);
    return false;
  }
  if(typeof isAbilityUnlocked === 'function' && isAbilityUnlocked(world, normalizedId)){
    state.activated = true;
    entry.disabled = true;
    syncSkillShrineStateReference(world, entry, state);
    return false;
  }
  let unlocked = true;
  if(typeof setAbilityUnlocked === 'function'){
    unlocked = setAbilityUnlocked(world, normalizedId, true);
  }
  if(typeof ensureAbilityUnlocks === 'function') ensureAbilityUnlocks(world);
  if(typeof ensureTeamAbilityState === 'function'){
    const teamState = ensureTeamAbilityState(world);
    if(teamState){
      if(typeof teamAbilityById === 'function' && teamAbilityById(normalizedId)){
        teamState.abilityId = normalizedId;
        teamState.cooldownUntil = 0;
      }else if(!teamState.active){
        teamState.cooldownUntil = teamState.cooldownUntil || 0;
      }
      if(teamState.active && typeof releaseTeamAbility === 'function'){
        releaseTeamAbility(world, { skipCooldown: true });
      }
    }
  }
  state.activated = true;
  state.unlockedAt = typeof nowMs === 'function' ? nowMs() : Date.now();
  entry.disabled = true;
  syncSkillShrineStateReference(world, entry, state);
  if(unlocked && typeof spawnDamageNumber === 'function'){
    const centerX = entry.x ?? stick.center().x;
    const entryHeight = entry.height ?? 96;
    const anchorY = (entry.y ?? stick.center().y) - Math.max(40, entryHeight * 0.45);
    spawnDamageNumber(world, stick, 0, {
      text: `${ability.name || ability.id || normalizedId} Unlocked`,
      color: entry.promptColor || '#9fe0ff',
      anchor: { x: centerX, y: anchorY },
      lift: 110,
      vy: -70,
      jitter: 6,
      maxLife: 720
    });
  }
  if(typeof renderHUD === 'function') renderHUD(world);
  return unlocked;
}

function interactWithShopkeeper(world, stick, entry){
  if(!world || !stick) return false;
  if(world.ui?.shopPanel?.open || world.ui?.skillPanel?.open) return false;
  const team = Array.isArray(world.team) ? world.team : [];
  let teamIndex = typeof stick.teamIndex === 'number' ? stick.teamIndex : team.indexOf(stick);
  if(!Number.isInteger(teamIndex) || teamIndex < 0){
    teamIndex = world.teamActiveIndex ?? 0;
  }
  if(typeof openShopPanel === 'function'){
    openShopPanel(world, teamIndex, entry);
    return true;
  }
  return false;
}

function syncChestStateReference(world, entry, state){
  if(!world || !state || !entry) return;
  const decorList = Array.isArray(world.decor) ? world.decor : [];
  const chestId = entry.id ? String(entry.id) : null;
  for(const prop of decorList){
    if(!prop || prop.type !== 'treasureChest') continue;
    if(prop.chestState === state) return;
    const interaction = prop.interaction;
    if(interaction){
      if(interaction.chestState === state){
        prop.chestState = state;
        return;
      }
      const propId = interaction.id ? String(interaction.id) : null;
      if(chestId && propId === chestId){
        interaction.chestState = state;
        prop.chestState = state;
        return;
      }
      if(!chestId){
        const ix = interaction.x ?? prop.x ?? 0;
        const iy = interaction.y ?? (prop.baseY !== undefined && prop.height !== undefined ? prop.baseY - prop.height * 0.5 : prop.y ?? 0);
        const ex = entry.x ?? ix;
        const ey = entry.y ?? iy;
        const nearX = Math.abs(ex - ix) < 16;
        const nearY = Math.abs(ey - iy) < 24;
        if(nearX && nearY){
          interaction.chestState = state;
          prop.chestState = state;
          return;
        }
      }
    }
  }
}

function syncSkillShrineStateReference(world, entry, state){
  if(!world || !state || !entry) return;
  const decorList = Array.isArray(world.decor) ? world.decor : [];
  const shrineId = entry.id ? String(entry.id) : null;
  for(const prop of decorList){
    if(!prop || prop.type !== 'skillPedestal') continue;
    if(prop.shrineState === state) return;
    const interaction = prop.interaction;
    if(!interaction) continue;
    if(interaction.shrineState === state){
      prop.shrineState = state;
      if(prop.shrineAbilityId === undefined && interaction.abilityId) prop.shrineAbilityId = interaction.abilityId;
      return;
    }
    const propId = interaction.id ? String(interaction.id) : null;
    if(shrineId && propId === shrineId){
      interaction.shrineState = state;
      prop.shrineState = state;
      if(prop.shrineAbilityId === undefined && interaction.abilityId) prop.shrineAbilityId = interaction.abilityId;
      return;
    }
    if(!shrineId){
      const ix = interaction.x ?? prop.x ?? 0;
      const iy = interaction.y ?? (prop.baseY !== undefined && prop.height !== undefined ? prop.baseY - prop.height * 0.5 : prop.y ?? 0);
      const ex = entry.x ?? ix;
      const ey = entry.y ?? iy;
      const nearX = Math.abs(ex - ix) < 16;
      const nearY = Math.abs(ey - iy) < 24;
      if(nearX && nearY){
        interaction.shrineState = state;
        prop.shrineState = state;
        if(prop.shrineAbilityId === undefined && interaction.abilityId) prop.shrineAbilityId = interaction.abilityId;
        return;
      }
    }
  }
}

function interactWithTreasureChest(world, stick, entry){
  if(!world || !stick || !entry) return false;
  const state = entry.chestState || (entry.chestState = {});
  syncChestStateReference(world, entry, state);
  state.goldPresent = !!state.goldPresent;
  if(entry.disabled && !state.goldPresent) return false;
  if(!Array.isArray(world.items)) world.items = [];
  const now = nowMs();
  state.openTime = now;
  const chestId = entry.id ? String(entry.id) : null;
  const levelState = world.levelState;
  const originX = entry.x ?? stick.center().x;
  const originY = entry.y ?? stick.center().y;
  const chestHeight = entry.height ?? 48;
  const chestTop = originY - chestHeight;
  const launchOffset = Math.max(6, chestHeight * 0.12);
  const launchY = chestTop - launchOffset;
  const itemLift = Math.max(4, chestHeight * 0.1);
  const pickupAvailableAt = now + CHEST_LOOT_PICKUP_DELAY_MS;
  const coinVyMin = -240;
  const coinVyMax = -180;
  const itemVyMin = -260;
  const itemVyMax = -200;
  const loot = entry.loot || {};
  const baseCoinValue = Math.max(1, Math.round(loot.coinValue ?? entry.coinValue ?? 1));
  const restockCoinValue = Math.max(1, Math.round(loot.restockCoinValue ?? entry.restockCoinValue ?? baseCoinValue));
  const ensureOpenedSet = ()=>{
    if(!levelState) return;
    let opened = levelState.openedChestIds;
    if(!(opened instanceof Set)){
      const seed = Array.isArray(opened) ? opened.map(id=>String(id)) : [];
      opened = new Set(seed);
    }
    if(chestId) opened.add(chestId);
    levelState.openedChestIds = opened;
  };
  const ensureDrainedSet = ()=>{
    if(!levelState) return;
    let drained = levelState.drainedChestIds;
    if(!(drained instanceof Set)){
      const seed = Array.isArray(drained) ? drained.map(id=>String(id)) : [];
      drained = new Set(seed);
    }
    if(chestId) drained.add(chestId);
    levelState.drainedChestIds = drained;
  };
  const spawnCoin = (value)=>{
    world.items.push({
      type: 'coin',
      x: originX + rand(-22, 22),
      y: launchY,
      picked: false,
      amt: value,
      vx: rand(-220, 220),
      vy: rand(coinVyMin, coinVyMax),
      pickupAvailableAt
    });
  };
  if(state.goldPresent){
    state.goldPresent = false;
    state.opened = true;
    entry.opened = true;
    entry.disabled = true;
    const restockCoins = Math.max(1, Math.floor(rand(1, 4)));
    for(let i=0; i<restockCoins; i++){
      spawnCoin(restockCoinValue);
    }
    ensureDrainedSet();
    ensureOpenedSet();
    return true;
  }
  if(state.opened) return false;
  state.opened = true;
  state.goldPresent = false;
  entry.opened = true;
  entry.disabled = true;
  ensureOpenedSet();
  const coinCount = Math.max(0, Math.round(loot.coins ?? entry.coins ?? 8));
  for(let i=0; i<coinCount; i++){
    spawnCoin(baseCoinValue);
  }
  const weaponId = loot.weaponId || loot.weapon || entry.weaponId || entry.weapon || null;
  const weaponKnown = typeof WEAPONS === 'object' && WEAPONS !== null ? WEAPONS[weaponId] : true;
  if(weaponId && (!loot.requireKnownWeapon || weaponKnown)){
    world.items.push({
      type: 'weapon',
      id: weaponId,
      x: originX + rand(-12, 12),
      y: launchY - itemLift,
      picked: false,
      vx: rand(-160, 160),
      vy: rand(itemVyMin, itemVyMax),
      pickupAvailableAt
    });
  }
  const armorId = loot.armorId || entry.armorId || null;
  const armorKnown = typeof ARMOR_ITEMS === 'object' && ARMOR_ITEMS !== null ? ARMOR_ITEMS[armorId] : null;
  if(armorId && armorKnown){
    world.items.push({
      type: 'armor',
      id: armorId,
      x: originX + rand(-12, 12),
      y: launchY - itemLift,
      picked: false,
      vx: rand(-160, 160),
      vy: rand(itemVyMin, itemVyMax),
      pickupAvailableAt
    });
  }
  const lootItem = loot.item || entry.item;
  if(lootItem){
    spawnChestLootItem(world, lootItem, {
      originX,
      launchY,
      chestHeight,
      itemLift,
      itemVyMin,
      itemVyMax,
      pickupAvailableAt
    });
  }
  return true;
}

function interactWithVoidPortal(world, stick, entry){
  if(!world || !entry) return false;
  const target = entry.targetStageId || entry.targetStage || entry.target || entry.stageId;
  if(!target) return false;
  if(typeof syncProfileFromWorld === 'function'){
    syncProfileFromWorld(world);
  }
  enterLevel(world, target);
  return true;
}

function cloneEntryDoorSpec(door){
  if(!door) return null;
  const doorWidth = typeof LEVEL_DOOR_WIDTH === 'number' ? LEVEL_DOOR_WIDTH : 18;
  const doorHeight = typeof LEVEL_DOOR_HEIGHT === 'number' ? LEVEL_DOOR_HEIGHT : 28;
  const width = Number.isFinite(door.w) ? door.w : doorWidth;
  const height = Number.isFinite(door.h) ? door.h : doorHeight;
  const x = Number.isFinite(door.x) ? door.x : (Number.isFinite(door.centerX) ? door.centerX - width * 0.5 : 0);
  const y = Number.isFinite(door.y) ? door.y : (Number.isFinite(door.baseY) ? door.baseY - height : 0);
  const centerX = Number.isFinite(door.centerX) ? door.centerX : x + width * 0.5;
  const baseY = Number.isFinite(door.baseY) ? door.baseY : y + height;
  const clone = { x, y, w: width, h: height, centerX, baseY };
  if(door.layout && typeof door.layout === 'object') clone.layout = { ...door.layout };
  return clone;
}

function entryDoorFromInteraction(entry){
  if(!entry) return null;
  const doorWidth = typeof LEVEL_DOOR_WIDTH === 'number' ? LEVEL_DOOR_WIDTH : 18;
  const doorHeight = typeof LEVEL_DOOR_HEIGHT === 'number' ? LEVEL_DOOR_HEIGHT : 28;
  const width = Number.isFinite(entry.doorWidth) ? entry.doorWidth : doorWidth;
  const height = Number.isFinite(entry.doorHeight) ? entry.doorHeight : doorHeight;
  const centerX = Number.isFinite(entry.x) ? entry.x : 0;
  const halfHeight = (Number.isFinite(entry.height) ? entry.height : height) * 0.5;
  const centerY = Number.isFinite(entry.y)
    ? entry.y
    : (Number.isFinite(entry.baseY) ? entry.baseY - halfHeight : 0);
  const baseY = centerY + halfHeight;
  return {
    x: centerX - width * 0.5,
    y: baseY - height,
    w: width,
    h: height,
    centerX,
    baseY
  };
}

function resolveLayoutFloorY(meta, world){
  if(meta && Number.isFinite(meta.floorY)) return meta.floorY;
  if(world && Number.isFinite(world.groundY)) return world.groundY;
  if(world && Number.isFinite(world.height)) return world.height - 100;
  return 0;
}

function cloneVoidLayoutMeta(meta, world){
  if(!meta || typeof meta !== 'object') return null;
  const tileSize = Number.isFinite(meta.tileSize) ? meta.tileSize : null;
  const cols = Number.isFinite(meta.cols) ? meta.cols : null;
  const rows = Number.isFinite(meta.rows) ? meta.rows : null;
  if(!(tileSize > 0 && cols > 0 && rows > 0)) return null;
  return {
    tileSize,
    cols,
    rows,
    offsetX: Number.isFinite(meta.offsetX) ? meta.offsetX : 0,
    floorY: resolveLayoutFloorY(meta, world)
  };
}

function computeLayoutMetaFromDefinition(layoutDef, world){
  if(!layoutDef || typeof layoutDef !== 'object') return null;
  const baseTileSize = Number.isFinite(layoutDef.tileSize) ? layoutDef.tileSize : BASE_LAYOUT_TILE_SIZE;
  const tileScale = typeof LAYOUT_TILE_SCALE === 'number' ? LAYOUT_TILE_SCALE : 1;
  const tileSize = Math.max(4, Math.round(baseTileSize * tileScale));
  const rows = Number.isFinite(layoutDef.rows)
    ? layoutDef.rows
    : (Array.isArray(layoutDef.tiles) ? layoutDef.tiles.length : 0);
  let cols = Number.isFinite(layoutDef.cols) ? layoutDef.cols : 0;
  if(cols <= 0 && Array.isArray(layoutDef.tiles) && layoutDef.tiles.length){
    const first = layoutDef.tiles[0];
    cols = typeof first === 'string' ? first.length : 0;
  }
  if(!(tileSize > 0 && cols > 0 && rows > 0)) return null;
  const worldWidth = Math.max(0, Math.floor(world?.width || 0));
  const displayCols = tileSize > 0 ? Math.max(cols, Math.ceil(worldWidth / tileSize) || 0) : cols;
  const displayWidth = displayCols * tileSize;
  const offsetX = Math.max(0, Math.floor((worldWidth - displayWidth) / 2));
  return {
    tileSize,
    cols,
    rows,
    offsetX,
    floorY: resolveLayoutFloorY(null, world)
  };
}

function layoutAnchorFromWorld(meta, world, x, y){
  if(!meta || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const tileSize = Number.isFinite(meta.tileSize) ? meta.tileSize : null;
  const cols = Number.isFinite(meta.cols) ? meta.cols : null;
  const rows = Number.isFinite(meta.rows) ? meta.rows : null;
  if(!(tileSize > 0 && cols > 0 && rows > 0)) return null;
  const offsetX = Number.isFinite(meta.offsetX) ? meta.offsetX : 0;
  const floorY = resolveLayoutFloorY(meta, world);
  const localX = (x - offsetX) / tileSize;
  let col = Math.round(localX - 0.5);
  col = clamp(col, 0, cols - 1);
  const colCenter = offsetX + (col + 0.5) * tileSize;
  const colOffset = clamp((x - colCenter) / tileSize, -0.49, 0.49);
  const localY = (floorY - y) / tileSize;
  let row = Math.round((rows - 0.5) - localY);
  row = clamp(row, 0, rows - 1);
  const rowCenter = floorY - (rows - row - 0.5) * tileSize;
  const rowOffset = clamp((y - rowCenter) / tileSize, -0.49, 0.49);
  return { col, row, colOffset, rowOffset };
}

function entryDoorFromTeleportAnchor(anchor, targetMeta, world){
  if(!anchor || !targetMeta) return null;
  const tileSize = Number.isFinite(targetMeta.tileSize) ? targetMeta.tileSize : null;
  const cols = Number.isFinite(targetMeta.cols) ? targetMeta.cols : null;
  const rows = Number.isFinite(targetMeta.rows) ? targetMeta.rows : null;
  if(!(tileSize > 0 && cols > 0 && rows > 0)) return null;
  const offsetX = Number.isFinite(targetMeta.offsetX) ? targetMeta.offsetX : 0;
  const floorY = resolveLayoutFloorY(targetMeta, world);
  const col = clamp(anchor.col, 0, cols - 1);
  const row = clamp(anchor.row, 0, rows - 1);
  const offsetXUnits = clamp(anchor.colOffset ?? 0, -0.49, 0.49) * tileSize;
  const offsetYUnits = clamp(anchor.rowOffset ?? 0, -0.49, 0.49) * tileSize;
  const centerX = offsetX + (col + 0.5) * tileSize + offsetXUnits;
  const centerY = floorY - (rows - row - 0.5) * tileSize + offsetYUnits;
  const doorWidth = typeof LEVEL_DOOR_WIDTH === 'number' ? LEVEL_DOOR_WIDTH : 18;
  const doorHeight = typeof LEVEL_DOOR_HEIGHT === 'number' ? LEVEL_DOOR_HEIGHT : 28;
  return {
    centerX,
    baseY: centerY + 40,
    x: centerX - doorWidth * 0.5,
    y: centerY + 40 - doorHeight,
    w: doorWidth,
    h: doorHeight
  };
}

function interactWithVoidSymbol(world, stick, entry){
  if(!world || !entry) return false;
  const state = world.levelState;
  const def = state?.def;
  if(!state || !def || !def.voidSymbolRoom) return false;
  if(typeof syncProfileFromWorld === 'function'){
    syncProfileFromWorld(world);
  }
  const snapshot = captureTeamSnapshot(world);
  const togglingToVoid = !state.voidDimensionActive;
  const doorSpec = cloneEntryDoorSpec(entryDoorFromInteraction(entry));
  const originMeta = cloneVoidLayoutMeta(state.layoutMeta, world);
  const anchorPoint = stick && typeof stick.center === 'function' ? stick.center() : null;
  const anchor = anchorPoint && originMeta
    ? layoutAnchorFromWorld(originMeta, world, anchorPoint.x, anchorPoint.y)
    : null;
  let teleportDoor = null;
  if(anchor){
    if(togglingToVoid){
      const targetMeta = computeLayoutMetaFromDefinition(def.voidSymbolRoom.layout, world);
      if(originMeta) state._voidReturnMeta = originMeta;
      teleportDoor = entryDoorFromTeleportAnchor(anchor, targetMeta, world);
    }else{
      const targetMeta = state._voidReturnMeta || null;
      teleportDoor = entryDoorFromTeleportAnchor(anchor, targetMeta, world);
    }
  }else if(togglingToVoid && originMeta){
    state._voidReturnMeta = originMeta;
  }
  if(togglingToVoid){
    state.voidDimensionActive = true;
    state.voidSymbolHomeDoor = doorSpec ? cloneEntryDoorSpec(doorSpec) : null;
    state.entryDoor = teleportDoor || (doorSpec ? cloneEntryDoorSpec(doorSpec) : null);
  }else{
    state.voidDimensionActive = false;
    const homeDoor = state.voidSymbolHomeDoor || doorSpec;
    state.entryDoor = teleportDoor || (homeDoor ? cloneEntryDoorSpec(homeDoor) : null);
    state._voidReturnMeta = null;
  }
  state.lastScreenConfigured = null;
  rebuildLevelScene(world, snapshot);
  spawnLevel(world);
  refreshStageLabel(world);
  return true;
}

function interactWithSwordPedestal(world, stick, entry){
  if(!world || !stick || !entry) return false;
  const state = entry.swordState || (entry.swordState = {});
  if(entry.disabled || state.claimed) return false;
  if(!Array.isArray(world.items)) world.items = [];
  const now = nowMs();
  state.openTime = now;
  state.claimed = true;
  entry.opened = true;
  entry.disabled = true;
  const pedestalId = entry.id ? String(entry.id) : null;
  const levelState = world.levelState;
  const ensureClaimedSet = ()=>{
    if(!levelState) return;
    let claimed = levelState.claimedPedestalIds;
    if(!(claimed instanceof Set)){
      const seed = Array.isArray(claimed) ? claimed.map(id=>String(id)) : [];
      claimed = new Set(seed);
    }
    if(pedestalId) claimed.add(pedestalId);
    levelState.claimedPedestalIds = claimed;
  };
  ensureClaimedSet();
  const originX = entry.x ?? stick.center().x;
  const originY = entry.y ?? stick.center().y;
  const pedestalHeight = entry.height ?? 96;
  const pedestalTop = originY - pedestalHeight;
  const lift = Math.max(8, pedestalHeight * 0.22);
  const launchY = pedestalTop - lift;
  const pickupAvailableAt = now + CHEST_LOOT_PICKUP_DELAY_MS;
  const loot = entry.loot || {};
  const itemVyMin = -260;
  const itemVyMax = -200;
  const weaponId = loot.weaponId || loot.weapon || entry.weaponId || entry.weapon || 'sigilBlade';
  const weaponKnown = typeof WEAPONS === 'object' && WEAPONS !== null ? WEAPONS[weaponId] : true;
  if(weaponId && (!loot.requireKnownWeapon || weaponKnown)){
    world.items.push({
      type: 'weapon',
      id: weaponId,
      x: originX + rand(-10, 10),
      y: launchY,
      picked: false,
      vx: rand(-120, 120),
      vy: rand(itemVyMin, itemVyMax),
      pickupAvailableAt
    });
  }
  const armorId = loot.armorId || entry.armorId || null;
  const armorKnown = typeof ARMOR_ITEMS === 'object' && ARMOR_ITEMS !== null ? ARMOR_ITEMS[armorId] : null;
  if(armorId && armorKnown){
    world.items.push({
      type: 'armor',
      id: armorId,
      x: originX + rand(-10, 10),
      y: launchY,
      picked: false,
      vx: rand(-120, 120),
      vy: rand(itemVyMin, itemVyMax),
      pickupAvailableAt
    });
  }
  const lootItem = loot.item || entry.item;
  if(lootItem){
    spawnChestLootItem(world, lootItem, {
      originX,
      launchY,
      chestHeight: pedestalHeight,
      itemLift: lift,
      itemVyMin,
      itemVyMax,
      pickupAvailableAt
    });
  }
  return true;
}

function spawnChestLootItem(world, loot, context){
  if(!world || !loot || !context) return false;
  const type = (loot.type || loot.kind || '').toString().toLowerCase();
  if(type === 'potion'){
    const heal = Math.max(1, Math.round(loot.heal ?? 30));
    const lift = Number.isFinite(context.itemLift)
      ? context.itemLift
      : Math.max(6, context.chestHeight * 0.15);
    const vyMin = Number.isFinite(context.itemVyMin) ? context.itemVyMin : -480;
    const vyMax = Number.isFinite(context.itemVyMax) ? context.itemVyMax : -320;
    const drop = {
      type: 'potion',
      heal,
      picked: false,
      x: context.originX + rand(-12, 12),
      y: context.launchY - lift,
      vx: rand(-160, 160),
      vy: rand(vyMin, vyMax),
      pickupAvailableAt: context.pickupAvailableAt
    };
    if(loot.id !== undefined) drop.id = String(loot.id);
    if(loot.name !== undefined) drop.name = String(loot.name);
    if(loot.description !== undefined) drop.description = String(loot.description);
    if(loot.color !== undefined) drop.color = String(loot.color);
    world.items.push(drop);
    return true;
  }
  if(type === 'armor' || type === 'offhand'){
    const id = loot.id ? String(loot.id) : null;
    if(!id) return false;
    const lift = Number.isFinite(context.itemLift)
      ? context.itemLift
      : Math.max(6, context.chestHeight * 0.15);
    const vyMin = Number.isFinite(context.itemVyMin) ? context.itemVyMin : -480;
    const vyMax = Number.isFinite(context.itemVyMax) ? context.itemVyMax : -320;
    const drop = {
      type,
      id,
      picked: false,
      x: context.originX + rand(-12, 12),
      y: context.launchY - lift,
      vx: rand(-160, 160),
      vy: rand(vyMin, vyMax),
      pickupAvailableAt: context.pickupAvailableAt
    };
    world.items.push(drop);
    return true;
  }
  return false;
}

function interactWithLever(world, entry){
  if(!world || !entry) return false;
  const state = entry.leverState || (entry.leverState = { active: true, lastToggle: 0 });
  const now = nowMs();
  const cooldown = entry.cooldownMs ?? 220;
  if(state.lastToggle && now < state.lastToggle + cooldown) return false;
  state.lastToggle = now;
  state.active = !state.active;
  applyLeverStateToBlocks(world, entry);
  if(entry.leverState){
    entry.leverState.lastToggle = now;
  }
  return true;
}

function applyLeverStateToBlocks(world, leverEntry){
  const blocks = Array.isArray(world.toggleBlocks) ? world.toggleBlocks : [];
  if(blocks.length === 0) return;
  const targetIds = new Set(normalizeInteractiveIdList(leverEntry.targets));
  const targetGroups = new Set(normalizeInteractiveIdList(leverEntry.groups));
  const leverOn = leverEntry.leverState ? !!leverEntry.leverState.active : true;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const block of blocks){
    if(!block) continue;
    if(activeScreenIndex !== null && block.screenIndex !== undefined && block.screenIndex !== activeScreenIndex) continue;
    const matchesId = block.id && targetIds.has(String(block.id));
    const matchesGroup = block.group && targetGroups.has(String(block.group));
    if(!matchesId && !matchesGroup) continue;
    const onState = block.activeWhenOn !== undefined ? !!block.activeWhenOn : true;
    const offState = block.activeWhenOff !== undefined ? !!block.activeWhenOff : false;
    const desired = leverOn ? onState : offState;
    if(block.active !== desired){
      block.active = desired;
    }
  }
}

function activeToggleBlockSolids(world){
  if(!world || world.blockCollisionEnabled === false) return [];
  const blocks = Array.isArray(world.toggleBlocks) ? world.toggleBlocks : [];
  const solids = [];
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const block of blocks){
    if(!block || !block.active) continue;
    if(activeScreenIndex !== null && block.screenIndex !== undefined && block.screenIndex !== activeScreenIndex) continue;
    const width = block.w ?? block.width ?? 0;
    const height = block.h ?? block.height ?? 0;
    if(width <= 0 || height <= 0) continue;
    const x = block.x ?? block.left ?? 0;
    const y = block.y ?? block.top ?? 0;
    solids.push({
      x,
      y,
      w: width,
      h: height,
      id: block.id,
      group: block.group,
      blocks: block.blocks || null
    });
  }
  return solids;
}

function selectNearestFriendly(world, m){
  let best=null, bestD=1e9;
  for(const s of world.sticks){
    if(s.isEnemy) continue;
    if(s.selectable === false) continue;
    const d=distance(s.center().x,s.center().y,m.x,m.y);
    if(d<bestD && d<80){ best=s; bestD=d; }
  }
  if(best){
    const team = Array.isArray(world.team) ? world.team : [];
    const idx = team.indexOf(best);
    if(idx >= 0){
      selectTeamMember(world, idx);
    }else{
      world.selected = best;
    }
  }
}

function grabNearbyJoint(world, m){
  if(!world?.gameplayFlags?.showHitboxes) return null;
  let hit=null, bestp=1e9;
  for(const p of world.points){
    const owner = p.owner;
    if(!owner) continue;
    const isStick = (typeof Stick !== 'undefined' && owner instanceof Stick);
    const resemblesStick = owner && typeof owner === 'object' && owner.pointsByName && owner.rigConstraints;
    if(!isStick && !resemblesStick) continue;
    const d=distance(p.x,p.y,m.x,m.y);
    if(d<bestp && d<26){ hit=p; bestp=d; }
  }
  if(hit){ world.input.dragging=hit; hit.dragged=true; }
  return hit;
}

function resetWorld(world){
  if(typeof releaseTeamAbility === 'function') releaseTeamAbility(world, { skipCooldown: true });
  if(world.teamAbilityState){
    world.teamAbilityState.abilityId = null;
    world.teamAbilityState.cooldownUntil = 0;
    world.teamAbilityState.active = null;
  }else{
    world.teamAbilityState = { abilityId: null, cooldownUntil: 0, active: null };
  }
  deactivateScoutDrone(world, { explode: false });
  world.points = [];
  world.constraints = [];
  world.sticks = [];
  world.team = [];
  world.items = [];
  world.projectiles = [];
  world.particles = [];
  world.physicsBoxes = [];
  world.softBodies = [];
  world.grasshoppers = [];
  world.grassFireflies = [];
  world.sand = null;
  world.powder = null;
  world.grass = null;
  world.water = null;
  world.waterBlocks = [];
  world.lava = null;
  world.enemies = [];
  world.terrain = [];
  world.decor = [];
  world.platforms = [];
  world.hazards = [];
  world.chronospheres = [];
  world.breakables = [];
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  world.toggleBlocks = [];
  world.terrainCells = null;
  world.waterEmitters = [];
  world.lavaEmitters = [];
  world.coins = 0;
  world.level = 1;
  world.selected = null;
  world.teamActiveIndex = 0;
  world.state = 'map';
  world.levelState = null;
  world.camera = createCameraState();
  world.profile = createPlayerProfile();
  world.maps = createWorldMapSet();
  world.activeMapId = WORLD_MAP_ID_SURFACE;
  world.map = world.maps?.[world.activeMapId] || buildWorldMap();
  world.unlockedMapIds = new Set([WORLD_MAP_ID_SURFACE]);
  if(typeof didLevelDataLoadFail === 'function' && didLevelDataLoadFail() && world.map){
    world.map.message = 'Level data failed to load. Please reload the page or run the game from a web server.';
    world.map.messageTimer = 6;
  }
  loadSavedProgress(world);
  if(typeof ensureTeamAbilityState === 'function') ensureTeamAbilityState(world);
  restoreAllMapUnlocks(world);
  applyMapUnlockOverride(world, world.ui?.settings?.gameplay?.unlockAllStages);
  world.door = { x: 0, y: 0, w: 36, h: 56, open: false, hidden: true, locked: false };
  world.stageLabel = 'World Map';
  world.cursor = createCursorState();
  if(world.cursor) world.cursor.visible = false;
  world.hoverStick = null;
  world.input.dragging = null;
  world.input.aim = null;
  world.ui.dragItem = null;
  world.ui.menuOpen = false;
  world.ui.menuTab = 'settings';
  world.ui.inventoryOpen = false;
  world.ui.confirmAction = null;
  if(typeof ensureGameplaySettings === 'function'){
    ensureGameplaySettings(world);
  }
  world.focusedInteractable = null;
  world.focusedDoor = null;
  world.interactionPrompt = null;
  if(world.ui){
    world.ui.inventoryHoverElement = null;
    world.ui.inventoryHoverInfo = null;
  }
  if(world.ui.skillPanel){
    world.ui.skillPanel.open = false;
    world.ui.skillPanel.teamIndex = 0;
    world.ui.skillPanel.pedestal = null;
  }
  if(world.ui.shopPanel){
    world.ui.shopPanel.open = false;
    world.ui.shopPanel.vendor = null;
    world.ui.shopPanel.teamIndex = 0;
    world.ui.shopPanel.message = '';
  }
  if(world.dev){
    world.dev.layout = null;
    world.dev.enemies = [];
    world.dev.layoutDirty = false;
    world.dev.enemiesDirty = false;
    world.dev.needsRebuild = false;
    world.dev.hoverCell = null;
    if(world.dev.panel){
      world.dev.panel.classList.add('hidden');
    }
    world.dev.enabled = false;
    world.dev.panelDirty = true;
  }
  world.scoutDrone = { active: false, entity: null, operator: null, operatorIndex: null, lastDeactivate: 0 };
  world.defeatOverlay = null;
}

function ensureCamera(world){
  if(!world.camera) world.camera = createCameraState();
  return world.camera;
}

function resetCameraForLevel(world){
  if(!world) return;
  const camera = ensureCamera(world);
  camera.activeZoneId = null;
  camera.initialized = false;
  const target = computeCameraTarget(world, camera, { activeZoneId: null, useActivePadding: false });
  const clamped = clampCameraToBounds(world, target.targetX, target.targetY, target.bounds);
  camera.bounds = target.bounds;
  camera.x = clamped.x;
  camera.y = clamped.y;
  camera.targetX = clamped.x;
  camera.targetY = clamped.y;
  camera.activeZoneId = target.zoneId || null;
  camera.initialized = true;
}

function updateCamera(world, dt){
  const camera = ensureCamera(world);
  camera.viewportWidth = world.width;
  camera.viewportHeight = world.height;
  const result = computeCameraTarget(world, camera);
  const clampedTarget = clampCameraToBounds(world, result.targetX, result.targetY, result.bounds);
  camera.bounds = result.bounds;
  camera.targetX = clampedTarget.x;
  camera.targetY = clampedTarget.y;
  if(!camera.initialized){
    camera.x = clampedTarget.x;
    camera.y = clampedTarget.y;
    camera.initialized = true;
  }else{
    const smoothing = dt > 0 ? 1 - Math.exp(-camera.damping * dt) : 1;
    camera.x += (clampedTarget.x - camera.x) * smoothing;
    camera.y += (clampedTarget.y - camera.y) * smoothing;
  }
  const clampedPosition = clampCameraToBounds(world, camera.x, camera.y, result.bounds);
  camera.x = clampedPosition.x;
  camera.y = clampedPosition.y;
  camera.activeZoneId = result.zoneId || null;
}

function computeCameraTarget(world, camera, options){
  const bounds = getActiveLevelBounds(world);
  if(world.state !== 'level' || !world.levelState){
    return {
      targetX: world.width * 0.5,
      targetY: world.height * 0.5,
      zoneId: null,
      bounds
    };
  }
  const useActivePadding = options?.useActivePadding ?? true;
  const activeZoneId = options?.activeZoneId ?? camera.activeZoneId ?? null;
  const meta = world.levelState.layoutMeta || {};
  const zones = Array.isArray(meta.cameraZones) ? meta.cameraZones : [];
  const selected = world.selected;
  const point = selected && typeof selected.center === 'function' ? selected.center() : null;
  let zoneId = null;
  let targetX = (bounds.left + bounds.right) * 0.5;
  let targetY = (bounds.top + bounds.bottom) * 0.5;
  const zone = pickActiveCameraZone(point, zones, activeZoneId, useActivePadding);
  if(zone){
    zoneId = zone.id;
    targetX = zone.focusX;
    targetY = zone.focusY;
  }else if(point){
    targetX = point.x;
    targetY = point.y + (camera.followOffsetY || 0);
  }
  return { targetX, targetY, zoneId, bounds };
}

function pickActiveCameraZone(point, zones, activeZoneId, useActivePadding){
  if(!point || !Array.isArray(zones) || zones.length === 0) return null;
  if(activeZoneId){
    const active = zones.find(zone=>zone && zone.id === activeZoneId);
    if(active){
      const padding = useActivePadding ? (active.exitPadding || 0) : (active.enterPadding || 0);
      if(pointInCameraZone(active, point, padding)) return active;
    }
  }
  let fallback = null;
  for(const zone of zones){
    if(!zone) continue;
    const padding = zone.enterPadding || 0;
    if(!pointInCameraZone(zone, point, padding)) continue;
    const type = (zone.type || '').toLowerCase();
    if(type === 'building') return zone;
    if(!fallback) fallback = zone;
  }
  return fallback;
}

function pointInCameraZone(zone, point, padding){
  if(!zone || !point) return false;
  const pad = padding || 0;
  return point.x >= zone.left - pad && point.x <= zone.right + pad && point.y >= zone.top - pad && point.y <= zone.bottom + pad;
}

function getActiveLevelBounds(world){
  if(world && world.levelState && world.levelState.layoutMeta){
    const meta = world.levelState.layoutMeta;
    const tileSize = meta.tileSize || 0;
    const left = meta.offsetX || 0;
    const right = left + (meta.cols || 0) * tileSize;
    const bottom = world.groundY;
    const top = bottom - (meta.rows || 0) * tileSize;
    return { left, right, top, bottom };
  }
  return { left: 0, right: world.width, top: 0, bottom: world.height };
}

function clampCameraToBounds(world, x, y, bounds){
  if(!bounds){
    return { x, y };
  }
  const halfW = world.width * 0.5;
  const halfH = world.height * 0.5;
  let left = bounds.left;
  let right = bounds.right;
  let top = bounds.top;
  const bottom = bounds.bottom;
  const viewHeight = Number.isFinite(world.height) ? world.height : 0;
  if(viewHeight > 0 && Number.isFinite(bottom) && Number.isFinite(top)){
    const span = bottom - top;
    if(!Number.isFinite(span) || span < viewHeight){
      top = bottom - viewHeight;
    }
  }
  const viewWidth = Number.isFinite(world.width) ? world.width : 0;
  if(viewWidth > 0 && Number.isFinite(right) && Number.isFinite(left)){
    const span = right - left;
    if(!Number.isFinite(span) || span < viewWidth){
      const mid = (left + right) * 0.5;
      left = mid - viewWidth * 0.5;
      right = mid + viewWidth * 0.5;
    }
  }
  let minX = left + halfW;
  let maxX = right - halfW;
  if(minX > maxX){
    const midX = (left + right) * 0.5;
    minX = midX;
    maxX = midX;
  }
  let minY = top + halfH;
  let maxY = bottom - halfH;
  if(minY > maxY){
    const midY = (top + bottom) * 0.5;
    minY = midY;
    maxY = midY;
  }
  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY)
  };
}

function applyCameraTransform(world, ctx){
  const camera = ensureCamera(world);
  const offsetX = Math.round(world.width * 0.5 - camera.x);
  const offsetY = Math.round(world.height * 0.5 - camera.y);
  ctx.translate(offsetX, offsetY);
}

function resolveWorldTimeSlowFactor(world){
  if(!world) return 1;
  const state = world.timeSlowState;
  if(!state) return 1;
  const now = nowMs();
  if(state.owner && state.owner.dead){
    world.timeSlowState = null;
    if(typeof renderHUD === 'function') renderHUD(world);
    return 1;
  }
  if(!state.until || now >= state.until){
    world.timeSlowState = null;
    if(typeof renderHUD === 'function') renderHUD(world);
    return 1;
  }
  const factor = clamp(state.factor ?? 1, 0.05, 1);
  return factor;
}

function updateWorld(world, dt){
  if(world){
    world._frameCounter = (world._frameCounter || 0) + 1;
  }
  const rawDt = dt;
  if(world){
    world.lastDtRaw = rawDt;
  }
  const slowFactor = resolveWorldTimeSlowFactor(world);
  dt = rawDt * slowFactor;
  if(world){
    world._timeSlowFactor = slowFactor;
  }
  world.lastDt = dt;
  updateCursorState(world, dt);
  world.subSteps = SUB_STEPS;
  const dev = world.dev;
  if(dev && (dev.enabled || dev.layoutDirty || dev.enemiesDirty || dev.needsRebuild)){
    commitDeveloperState(world);
  }

  ensureTeamSelection(world);
  if(typeof ensureTeamAbilityState === 'function') ensureTeamAbilityState(world);
  updateDefeatOverlay(world, dt);

  if(world.state !== 'level'){
    updateScoutDrone(world, dt);
  }

  if(world.state === 'map'){
    updateWorldMap(world, dt);
    if(typeof updateTeamAbility === 'function') updateTeamAbility(world, dt);
    updateCamera(world, dt);
    return;
  }

  const devFrozen = dev && dev.enabled && dev.timeFrozen;
  const paused = isWorldMenuPaused(world) || devFrozen;
  world.paused = paused;
  if(world.levelState){
    if(world.levelState.elapsedTime === undefined) world.levelState.elapsedTime = 0;
    if(!paused) world.levelState.elapsedTime += dt;
  }
  if(paused){
    updateCamera(world, dt);
    return;
  }

  if(world.selected && !world.selected.dead){
    applyPlayerMovement(world);
  }
  updateActiveInteractable(world);
  updateFollowerBehavior(world, dt);
  updateWaterEmitters(world, dt);
  updateLavaEmitters(world, dt);
  updateWaterSimulation(world, dt);
  updateLavaSimulation(world, dt);
  resolveWaterLavaInteractions(world);
  updateSandSimulation(world, dt);
  updatePowderSimulation(world, dt);
  updateGrassSimulation(world, dt);
  updateGrasshoppers(world, dt);
  updateGrassFireflies(world, dt);
  updatePhysicsBoxes(world, dt);
  updateScoutDrone(world, dt);
  updateSoftBodies(world, dt);
  updateTorchDecor(world, dt);
  updateGlowCrystalDecor(world, dt);
  updateChronoFlyJars(world, dt);
  updateFireflyJars(world, dt);
  updateRainFields(world, dt);
  updateFloatingDecor(world, dt);
  maintainWorldTreeRespawnDecor(world);
  maintainWorldTreeWeatherDecor(world);
  updateChronosphereState(world, dt);
  updateFireSystem(world, dt);
  if(typeof updateSummonedUnits === 'function') updateSummonedUnits(world, dt);
  if(typeof updateTeamAbility === 'function') updateTeamAbility(world, dt);
  if(typeof updateTimeBladeEchoes === 'function') updateTimeBladeEchoes(world);
  applyChronosphereFreeze(world);
  stepPhysics(world, dt);
  restoreChronosphereFreeze(world);
  if(Array.isArray(world.sticks)){
    for(const stick of world.sticks){
      if(stick && typeof stick.updateFluidState === 'function') stick.updateFluidState(dt);
    }
  }
  updateInteractiveObjects(world, dt);
  const chronoState = world._chronosphereState;
  const frozenEnemies = chronoState?.frozenEnemies || null;
  for(const st of world.sticks){
    if(!st) continue;
    if(st.isEnemy && frozenEnemies && frozenEnemies.has(st)) continue;
    if(st.isEnemy && st.chronoFrozen) continue;
    st.ai(dt);
  }
  updateItemPhysics(world, dt);
  for(const st of world.sticks){
    if(!st || st.isEnemy || st.isSummoned || st.isNpc) continue;
    checkPickups(st, world);
  }
  if(typeof finalizeSummonedUnits === 'function') finalizeSummonedUnits(world, dt);
  if(typeof updateSoulOrbs === 'function') updateSoulOrbs(world, dt);
  updateProjectiles(dt, world);
  updateParticles(world, dt);
  updateNpcDialogues(world, dt);
  updateDoorState(world);
  handleLevelFlow(world, dt);
  checkLevelDefeat(world);
  updateCamera(world, dt);
}

function isWorldMenuPaused(world){
  if(!world || world.state !== 'level') return false;
  if(world.ui?.menuOpen) return true;
  if(world.ui?.skillPanel?.open || world.ui?.shopPanel?.open) return true;
  return false;
}

function applyPlayerMovement(world){
  const axis = (world.input.right?1:0) + (world.input.left?-1:0);
  world.selected.moveInput(axis);
}

function gatherStaticPhysicsSolids(world){
  const solids = [];
  const terrain = Array.isArray(world?.terrain) ? world.terrain : [];
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const tile of terrain){
    if(!tile) continue;
    if(activeScreenIndex !== null && tile.screenIndex !== undefined && tile.screenIndex !== activeScreenIndex) continue;
    const width = tile.w ?? tile.width ?? 0;
    const height = tile.h ?? tile.height ?? 0;
    if(!(width > 0 && height > 0)) continue;
    const left = tile.x ?? tile.left ?? 0;
    const top = tile.y ?? tile.top ?? 0;
    solids.push({ left, right: left + width, top, bottom: top + height });
  }
  const breakables = Array.isArray(world?.breakables) ? world.breakables : [];
  for(const wall of breakables){
    if(!wall || wall.broken) continue;
    if(activeScreenIndex !== null && wall.screenIndex !== undefined && wall.screenIndex !== activeScreenIndex) continue;
    const width = wall.w ?? wall.width ?? 0;
    const height = wall.h ?? wall.height ?? 0;
    if(!(width > 0 && height > 0)) continue;
    const left = wall.x ?? wall.left ?? 0;
    const top = wall.y ?? wall.top ?? 0;
    solids.push({ left, right: left + width, top, bottom: top + height });
  }
  const toggleSolids = typeof activeToggleBlockSolids === 'function' ? activeToggleBlockSolids(world) : [];
  for(const block of toggleSolids){
    if(!block) continue;
    const width = block.w ?? block.width ?? 0;
    const height = block.h ?? block.height ?? 0;
    if(!(width > 0 && height > 0)) continue;
    const left = block.x ?? block.left ?? 0;
    const top = block.y ?? block.top ?? 0;
    solids.push({ left, right: left + width, top, bottom: top + height });
  }
  const groundY = Number.isFinite(world?.groundY) ? world.groundY : (Number.isFinite(world?.height) ? world.height - 100 : 0);
  const worldWidth = Number.isFinite(world?.width) ? world.width : 2400;
  solids.push({ left: -worldWidth, right: worldWidth * 2, top: groundY, bottom: groundY + 480 });
  return solids;
}

function combinePhysicsSolids(staticSolids, boxes, current){
  const solids = staticSolids.slice();
  if(Array.isArray(boxes)){
    for(const other of boxes){
      if(!other || other === current) continue;
      const width = other.width ?? other.size ?? 0;
      const height = other.height ?? other.size ?? 0;
      if(!(width > 0 && height > 0)) continue;
      const halfW = width * 0.5;
      const halfH = height * 0.5;
      const centerX = Number.isFinite(other.x) ? other.x : 0;
      const centerY = Number.isFinite(other.y) ? other.y : 0;
      solids.push({ left: centerX - halfW, right: centerX + halfW, top: centerY - halfH, bottom: centerY + halfH });
    }
  }
  return solids;
}

function updatePhysicsBoxes(world, dt){
  if(!world || dt <= 0) return;
  const boxes = Array.isArray(world.physicsBoxes) ? world.physicsBoxes : [];
  if(boxes.length === 0) return;
  const gravity = Number.isFinite(GRAVITY) ? GRAVITY : 2000;
  const staticSolids = gatherStaticPhysicsSolids(world);
  const worldWidth = Number.isFinite(world?.width) ? world.width : null;
  for(const box of boxes){
    if(!box) continue;
    const width = box.width ?? box.size ?? 0;
    const height = box.height ?? box.size ?? 0;
    if(!(width > 0 && height > 0)) continue;
    if(!Number.isFinite(box.x)) box.x = 0;
    if(!Number.isFinite(box.y)) box.y = 0;
    if(!Number.isFinite(box.vx)) box.vx = 0;
    if(!Number.isFinite(box.vy)) box.vy = 0;
    const mass = Number.isFinite(box.mass) && box.mass > 0 ? box.mass : 1;
    const halfW = width * 0.5;
    const halfH = height * 0.5;
    box.vy += gravity * dt;
    let nextX = box.x + box.vx * dt;
    let nextY = box.y + box.vy * dt;
    let vx = box.vx;
    let vy = box.vy;
    let grounded = false;
    const epsilon = 0.01;
    const solids = combinePhysicsSolids(staticSolids, boxes, box);
    const horizontal = nextX - box.x;
    if(horizontal > 0){
      const right = nextX + halfW;
      const top = box.y - halfH;
      const bottom = box.y + halfH;
      for(const rect of solids){
        if(!rect) continue;
        if(bottom <= rect.top || top >= rect.bottom) continue;
        if(right > rect.left && box.x + halfW <= rect.left){
          nextX = Math.min(nextX, rect.left - halfW - epsilon);
          vx = 0;
        }
      }
    }else if(horizontal < 0){
      const left = nextX - halfW;
      const top = box.y - halfH;
      const bottom = box.y + halfH;
      for(const rect of solids){
        if(!rect) continue;
        if(bottom <= rect.top || top >= rect.bottom) continue;
        if(left < rect.right && box.x - halfW >= rect.right){
          nextX = Math.max(nextX, rect.right + halfW + epsilon);
          vx = 0;
        }
      }
    }
    if(worldWidth !== null){
      const minX = halfW;
      const maxX = Math.max(minX, worldWidth - halfW);
      if(nextX < minX){
        nextX = minX;
        vx = Math.max(0, vx);
      }else if(nextX > maxX){
        nextX = maxX;
        vx = Math.min(0, vx);
      }
    }
    const vertical = nextY - box.y;
    if(vertical > 0){
      const left = nextX - halfW;
      const right = nextX + halfW;
      const bottom = nextY + halfH;
      for(const rect of solids){
        if(!rect) continue;
        if(right <= rect.left || left >= rect.right) continue;
        if(bottom > rect.top && box.y + halfH <= rect.top){
          nextY = Math.min(nextY, rect.top - halfH - epsilon);
          vy = 0;
          grounded = true;
        }
      }
    }else if(vertical < 0){
      const left = nextX - halfW;
      const right = nextX + halfW;
      const top = nextY - halfH;
      for(const rect of solids){
        if(!rect) continue;
        if(right <= rect.left || left >= rect.right) continue;
        if(top < rect.bottom && box.y - halfH >= rect.bottom){
          nextY = Math.max(nextY, rect.bottom + halfH + epsilon);
          if(vy < 0) vy = 0;
        }
      }
    }
    box.x = nextX;
    box.y = nextY;
    const drag = Math.exp(-3 * dt / mass);
    box.vx = vx * drag;
    if(Math.abs(box.vx) < 2) box.vx = 0;
    box.vy = vy;
    box.grounded = grounded;
    if(grounded){
      const friction = Math.exp(-20 * dt / mass);
      box.vx *= friction;
      if(Math.abs(box.vy) < 1) box.vy = 0;
    }
  }
}

function updateSoftBodies(world, dt){
  if(!world) return;
  const bodies = Array.isArray(world.softBodies) ? world.softBodies : [];
  if(!bodies.length) return;
  const step = Math.max(0, dt || 0);
  for(const body of bodies){
    if(!body) continue;
    if(step > 0){
      const dragX = Math.exp(-Math.max(0, body.airDrag ?? 2.6) * step);
      const dragY = Math.exp(-Math.max(0, body.verticalDrag ?? body.airDrag ?? 2.6) * step);
      if(Array.isArray(body.points)){
        for(const point of body.points){
          if(!point) continue;
          point.vx *= dragX;
          point.vy *= dragY;
        }
      }
    }
    if(body.impactTimer){
      body.impactTimer = Math.max(0, body.impactTimer - step);
    }
  }
}

function spawnSoftBody(world, def){
  if(!world || !def) return null;
  const segments = Math.max(3, Math.round(def.segmentCount ?? def.segments ?? 6));
  const radius = Math.max(6, def.radius ?? 42);
  const centerX = Number.isFinite(def.centerX) ? def.centerX : 0;
  const centerY = Number.isFinite(def.centerY) ? def.centerY : 0;
  const rotation = (def.rotation || 0) * Math.PI / 180;
  const stiffness = clamp(def.stiffness !== undefined ? def.stiffness : 0.4, 0.02, 2);
  const elasticity = def.edgeElasticity !== undefined ? def.edgeElasticity : (def.elasticity !== undefined ? def.elasticity : 0.32);
  const damping = Math.max(0, def.damping !== undefined ? def.damping : 0.2);
  const pointMass = Math.max(0.05, def.pointMass !== undefined ? def.pointMass : 1.1);
  const centerMass = Math.max(0.05, def.centerMass !== undefined ? def.centerMass : pointMass * 1.15);
  const groundFriction = def.groundFriction !== undefined ? def.groundFriction : GROUND_FRICTION_PER_SEC;
  const terrainRadius = Math.max(4, def.terrainRadius !== undefined ? def.terrainRadius : radius * 0.4);
  const airDrag = Math.max(0, def.airDrag !== undefined ? def.airDrag : 2.8);
  const verticalDrag = Math.max(0, def.verticalDrag !== undefined ? def.verticalDrag : airDrag * 0.75);
  const highlightColor = def.highlightColor || (def.color ? lightenColor(def.color, 0.22) : '#f4d7aa');
  const edgeColor = def.edgeColor || '#4a2d1f';
  const fillColor = def.color || '#cfa46b';
  const impactDuration = Math.max(0.12, def.impactDuration !== undefined ? def.impactDuration : 0.42);
  const impulseScale = def.impulseScale !== undefined ? def.impulseScale : radius * 1.1;
  const shadowRadius = def.shadowRadius !== undefined ? def.shadowRadius : radius * 0.92;
  const shadowOpacity = clamp(def.shadowOpacity !== undefined ? def.shadowOpacity : 0.32, 0, 1);
  const body = {
    type: def.type || 'softHexagon',
    id: def.id || null,
    radius,
    segments,
    rotation,
    color: fillColor,
    edgeColor,
    highlightColor,
    impulseScale,
    airDrag,
    verticalDrag,
    impactDuration,
    shadowRadius,
    shadowOpacity,
    outerPoints: [],
    points: [],
    constraints: [],
    centerPoint: null,
    impactTimer: 0,
    lastImpactAt: 0
  };
  const angleStep = TAU / segments;
  for(let i=0; i<segments; i++){
    const angle = rotation + angleStep * i;
    const px = centerX + Math.cos(angle) * radius;
    const py = centerY + Math.sin(angle) * radius;
    const point = new Point(px, py);
    point.mass = pointMass;
    point.groundFriction = groundFriction;
    point.terrainRadius = terrainRadius;
    point.owner = body;
    point.poseTargetX = px;
    point.poseTargetY = py;
    world.points.push(point);
    body.points.push(point);
    body.outerPoints.push(point);
  }
  const centerPoint = new Point(centerX, centerY);
  centerPoint.mass = centerMass;
  centerPoint.groundFriction = groundFriction;
  centerPoint.terrainRadius = Math.max(terrainRadius * 0.6, 4);
  centerPoint.owner = body;
  world.points.push(centerPoint);
  body.points.push(centerPoint);
  body.centerPoint = centerPoint;
  const edgeRest = 2 * radius * Math.sin(Math.PI / segments);
  for(let i=0; i<segments; i++){
    const a = body.outerPoints[i];
    const b = body.outerPoints[(i + 1) % segments];
    const edgeConstraint = new ElasticDist(a, b, edgeRest, stiffness, {
      elasticity,
      damping,
      maxCorrectionRatio: 0.85
    });
    world.constraints.push(edgeConstraint);
    body.constraints.push(edgeConstraint);
    const spoke = new ElasticDist(a, centerPoint, radius, stiffness, {
      elasticity: elasticity * 0.85,
      damping,
      maxCorrectionRatio: 0.65
    });
    world.constraints.push(spoke);
    body.constraints.push(spoke);
    if(segments > 4){
      const c = body.outerPoints[(i + 2) % segments];
      const diagRest = 2 * radius * Math.sin(2 * Math.PI / segments);
      const diag = new ElasticDist(a, c, diagRest, stiffness * 0.82, {
        elasticity: elasticity * 0.6,
        damping: damping * 0.8,
        maxCorrectionRatio: 0.9
      });
      world.constraints.push(diag);
      body.constraints.push(diag);
    }
  }
  return body;
}

function softBodyCenter(body){
  if(!body) return { x: 0, y: 0 };
  if(body.centerPoint) return { x: body.centerPoint.x, y: body.centerPoint.y };
  const points = Array.isArray(body.outerPoints) ? body.outerPoints : body.points;
  if(!Array.isArray(points) || points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for(const point of points){
    if(!point) continue;
    sumX += point.x;
    sumY += point.y;
  }
  const inv = 1 / points.length;
  return { x: sumX * inv, y: sumY * inv };
}

function softBodyBottom(body){
  if(!body) return 0;
  let bottom = -Infinity;
  const points = Array.isArray(body.outerPoints) ? body.outerPoints : body.points;
  if(Array.isArray(points)){
    for(const point of points){
      if(point && point.y > bottom) bottom = point.y;
    }
  }
  if(body.centerPoint && body.centerPoint.y > bottom) bottom = body.centerPoint.y;
  return Number.isFinite(bottom) ? bottom : 0;
}

function drawSoftBodies(ctx, world){
  if(!ctx || !world) return;
  const bodies = Array.isArray(world.softBodies) ? world.softBodies : [];
  if(!bodies.length) return;
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 0.375;
  for(const body of bodies){
    const points = Array.isArray(body?.outerPoints) ? body.outerPoints : null;
    if(!points || points.length < 3) continue;
    const center = softBodyCenter(body);
    const bottom = softBodyBottom(body);
    const shadowRadius = Math.max(4, body.shadowRadius ?? body.radius * 0.9);
    if(body.shadowOpacity > 0){
      const shadowY = bottom + Math.max(4, body.radius * 0.15);
      ctx.save();
      ctx.globalAlpha = clamp(body.shadowOpacity, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(center.x, shadowY, shadowRadius, shadowRadius * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for(let i=1; i<points.length; i++){
      const point = points[i];
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    const impactRatio = body.impactTimer && body.impactDuration
      ? clamp(body.impactTimer / body.impactDuration, 0, 1)
      : 0;
    const fillColor = impactRatio > 0
      ? lightenColor(body.color, impactRatio * 0.4)
      : body.color;
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeStyle = body.edgeColor || darkenColor(fillColor, 0.4);
    ctx.stroke();
    ctx.clip();
    const highlight = body.highlightColor || lightenColor(fillColor, 0.18);
    const gradient = ctx.createLinearGradient(center.x, center.y - body.radius, center.x, center.y + body.radius);
    gradient.addColorStop(0, colorWithAlpha(highlight, 0.9));
    gradient.addColorStop(0.5, colorWithAlpha(fillColor, 0.35));
    gradient.addColorStop(1, colorWithAlpha(fillColor, 0.1));
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = gradient;
    ctx.fillRect(center.x - body.radius, center.y - body.radius, body.radius * 2, body.radius * 2);
    ctx.restore();
    if(impactRatio > 0){
      ctx.save();
      ctx.globalAlpha = clamp(impactRatio * 0.6, 0, 0.6);
      ctx.lineWidth = Math.max(3, 4 * scale);
      ctx.strokeStyle = colorWithAlpha(highlight, 0.9);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for(let i=1; i<points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }
}

function updateTorchDecor(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  if(typeof spawnFireParticle !== 'function') return;
  for(const prop of decor){
    if(!prop || prop.type !== 'torch') continue;
    const width = prop.width ?? 26;
    const height = prop.height ?? 50;
    const interval = Math.max(0.05, Number(prop.emitInterval) || 0.18);
    prop.emitTimer = (prop.emitTimer || 0) + dt;
    prop.flamePhase = (prop.flamePhase || Math.random() * TAU) + dt * 2.6;
    const baseIntensity = clamp(Number(prop.emitIntensity) || 1, 0.4, 1.8);
    const flicker = 0.78 + Math.sin(prop.flamePhase) * 0.22;
    prop.currentFlame = clamp(baseIntensity * flicker, 0.3, 2.2);
    const anchor = torchFlameAnchor(prop, width, height);
    const spawnX = anchor.x;
    const spawnY = anchor.y - height * 0.12;
    const bias = prop.mount === 'wall' ? (prop.facing < 0 ? -0.45 : 0.45) : 0;
    while(prop.emitTimer >= interval){
      prop.emitTimer -= interval;
      spawnFireParticle(world, spawnX, spawnY, prop.currentFlame, {
        horizontalBias: bias,
        upwardBias: 1.05
      });
    }
    if(prop.emitTimer > interval){
      prop.emitTimer = interval * 0.5;
    }
  }
}

function ensureGlowCrystalState(prop){
  if(!prop) return null;
  if(!prop.crystalState){
    const seed = Number(prop.seed ?? (prop.x ?? 0) * 31.7 + (prop.baseY ?? 0) * 11.3);
    const sparkleInterval = Math.max(0.3, Number(prop.sparkleInterval) || 1.6);
    prop.crystalState = {
      seed,
      phase: randomRange(0, TAU),
      twinkle: randomRange(0, TAU),
      intensity: clamp(Number(prop.lightBaseIntensity ?? prop.lightIntensity) || 0.9, 0.2, 2.2),
      sparkleTimer: randomRange(0, sparkleInterval),
      sparkles: []
    };
  }
  return prop.crystalState;
}

function updateGlowCrystalDecor(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  for(const prop of decor){
    if(!prop || prop.type !== 'glowCrystal') continue;
    const state = ensureGlowCrystalState(prop);
    if(!state) continue;
    const base = clamp(Number(prop.lightBaseIntensity ?? prop.lightIntensity) || 0.9, 0.2, 2.2);
    const pulseSpeed = clamp(Number(prop.pulseSpeed) || 1.4, 0.05, 10);
    const pulseAmount = clamp(Number(prop.pulseAmount) ?? 0.28, 0, 1.2);
    const twinkleSpeed = clamp(Number(prop.twinkleSpeed) || 0.8, 0.05, 12);
    const sparkleInterval = Math.max(0.3, Number(prop.sparkleInterval) || 1.6);
    const sparkleChance = clamp(Number(prop.sparkleChance) ?? 0.32, 0, 1);
    state.phase = (state.phase || 0) + dt * pulseSpeed;
    state.twinkle = (state.twinkle || 0) + dt * twinkleSpeed;
    const flicker = Math.sin(state.phase) * pulseAmount;
    const ripple = Math.sin(state.twinkle * 1.7 + (state.seed || 0) * 0.17) * pulseAmount * 0.45;
    state.intensity = clamp(base + flicker + ripple, 0.2, 2.6);
    state.sparkleTimer = (state.sparkleTimer || 0) + dt;
    if(Array.isArray(state.sparkles)){
      for(let i=state.sparkles.length - 1; i>=0; i--){
        const sparkle = state.sparkles[i];
        if(!sparkle) continue;
        sparkle.age += dt;
        if(sparkle.age >= sparkle.life){
          state.sparkles.splice(i, 1);
        }
      }
    }
    while(state.sparkleTimer >= sparkleInterval){
      state.sparkleTimer -= sparkleInterval;
      if(Math.random() <= sparkleChance){
        const sparkleLife = randomRange(0.18, 0.42);
        if(!Array.isArray(state.sparkles)) state.sparkles = [];
        state.sparkles.push({
          age: 0,
          life: sparkleLife,
          x: randomRange(-0.25, 0.25),
          y: randomRange(-0.38, 0.22)
        });
      }
    }
  }
}

const FIREFLY_JAR_REFERENCE_SIZE = 30;
const FIREFLY_JAR_CENTER_SPAN = 7;
const FIREFLY_JAR_FIREFLY_HALF_SIZE = 1.5; // firefly preview squares are 3x3px
const CHRONO_FLY_JAR_PREVIEW_HALF_SIZE = FIREFLY_JAR_FIREFLY_HALF_SIZE;
const CHRONO_FLY_JAR_DEFAULT_TRIGGER_RADIUS = 150;
const CHRONO_FLY_JAR_DEFAULT_SWARM_LIFETIME = 12;
const CHRONO_FLY_JAR_DEFAULT_COOLDOWN_MS = 900;
const CHRONO_FLY_JAR_DEFAULT_FREEZE_MS = 5000;

function getFireflyJarMetrics(prop){
  const width = Math.max(8, prop?.width ?? FIREFLY_JAR_REFERENCE_SIZE);
  const height = Math.max(8, prop?.height ?? FIREFLY_JAR_REFERENCE_SIZE);
  const baseY = prop?.baseY ?? prop?.y ?? 0;
  const originX = prop?.x ?? 0;
  const top = baseY - height;
  const scale = Math.min(width, height) / FIREFLY_JAR_REFERENCE_SIZE;
  const previewHalfExtent = Math.max(0,
    (FIREFLY_JAR_CENTER_SPAN * 0.5 - FIREFLY_JAR_FIREFLY_HALF_SIZE) * scale);
  return {
    width,
    height,
    baseY,
    top,
    originX,
    originY: top + height * 0.5,
    previewHalfExtent
  };
}

function syncFireflyJarStateGeometry(state, metrics){
  if(!state || !metrics) return;
  state.originX = metrics.originX;
  state.originY = metrics.originY;
  state.previewClamp = metrics.previewHalfExtent;
  state.fireflyHalfSize = FIREFLY_JAR_FIREFLY_HALF_SIZE;
}

function clampFireflyJarPreviewEntries(state){
  if(!state || !Array.isArray(state.preview)) return;
  const clampRadius = Math.max(0, state.previewClamp ?? 0);
  for(const preview of state.preview){
    if(!preview) continue;
    const radius = Math.max(0, preview.radius ?? 0);
    preview.radius = clampRadius > 0 ? Math.min(radius, clampRadius) : 0;
    if(clampRadius > 0){
      const offset = preview.heightOffset ?? 0;
      preview.heightOffset = Math.max(-clampRadius, Math.min(clampRadius, offset));
    }else{
      preview.heightOffset = 0;
    }
  }
}

function ensureFireflyJarState(prop, metrics){
  if(!prop) return null;
  const dims = metrics || getFireflyJarMetrics(prop);
  if(prop.fireflyState){
    const existing = prop.fireflyState;
    syncFireflyJarStateGeometry(existing, dims);
    clampFireflyJarPreviewEntries(existing);
    return existing;
  }
  const state = {
    preview: [],
    fireflies: [],
    released: false,
    originX: dims.originX,
    originY: dims.originY,
    lightRadius: Math.max(8, prop.fireflyLightRadius ?? 15),
    flightRadius: Math.max(80, prop.fireflyFlightRadius ?? 220),
    pullStrength: prop.fireflyPullStrength ?? 24,
    maxSpeed: Math.max(40, prop.fireflySpeed ?? 90),
    lifetimeMin: Math.max(5, prop.fireflyLifetimeMin ?? 15),
    lifetimeMax: Math.max(6, prop.fireflyLifetimeMax ?? 30),
    previewClamp: dims.previewHalfExtent,
    fireflyHalfSize: FIREFLY_JAR_FIREFLY_HALF_SIZE
  };
  const maxPreviewRadius = dims.previewHalfExtent;
  const count = Math.max(4, Math.round(prop.fireflyCount ?? 10));
  for(let i=0;i<count;i++){
    const radius = maxPreviewRadius > 0
      ? rand(maxPreviewRadius * 0.35, maxPreviewRadius)
      : 0;
    const maxHeightOffset = Math.max(0, maxPreviewRadius - radius * 0.5);
    state.preview.push({
      angle: rand(0, TAU),
      speed: rand(0.4, 1.1),
      radius,
      heightOffset: maxHeightOffset > 0
        ? rand(-maxHeightOffset, maxHeightOffset)
        : 0
    });
  }
  clampFireflyJarPreviewEntries(state);
  prop.fireflyState = state;
  return state;
}

function releaseFireflyJarFireflies(world, prop, state){
  if(!prop || !state || state.released) return;
  state.released = true;
  const metrics = getFireflyJarMetrics(prop);
  state.originX = metrics.originX;
  state.originY = metrics.originY;
  const lightColor = prop.fireflyLightColor || 'rgba(255, 240, 180, 1)';
  const glowColor = prop.fireflyGlowColor || 'rgba(255, 244, 210, 0.9)';
  const count = Math.max(4, Math.round(prop.fireflyCount ?? 10));
  const minLife = state.lifetimeMin;
  const maxLife = Math.max(minLife, state.lifetimeMax);
  const originX = state.originX;
  const originY = state.originY;
  const maxSpeed = state.maxSpeed;
  const spawnClamp = Math.max(0, state.previewClamp ?? metrics.previewHalfExtent ?? 0);
  const fireflies = [];
  for(let i=0;i<count;i++){
    const angle = rand(0, TAU);
    const speed = rand(maxSpeed * 0.35, maxSpeed * 0.85);
    fireflies.push({
      x: originX + (spawnClamp > 0 ? rand(-spawnClamp, spawnClamp) : 0),
      y: originY + (spawnClamp > 0 ? rand(-spawnClamp, spawnClamp) : 0),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: rand(minLife, maxLife),
      radius: state.lightRadius,
      lightColor,
      glowColor,
      flicker: rand(0, TAU),
      flickerSpeed: rand(2.6, 4.6)
    });
  }
  state.fireflies = fireflies;
  state.preview = [];
  if(typeof spawnFireflyJarShards === 'function' && !state.shardsSpawned){
    spawnFireflyJarShards(world, prop);
    state.shardsSpawned = true;
  }
}

function ensureAmbientFireflySwarmState(prop){
  if(!prop) return null;
  if(prop.fireflyState && prop.fireflyState.kind === 'ambient'){
    const existing = prop.fireflyState;
    existing.fireflyHalfSize = prop.fireflyHalfSize !== undefined
      ? Math.max(1, prop.fireflyHalfSize)
      : (existing.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE);
    existing.permanent = true;
    return existing;
  }
  const originX = Number.isFinite(prop.x)
    ? prop.x
    : (Number.isFinite(prop.centerX) ? prop.centerX : 0);
  const baseY = Number.isFinite(prop.baseY)
    ? prop.baseY
    : (Number.isFinite(prop.y) ? prop.y : 0);
  const lightRadius = Math.max(8, prop.fireflyLightRadius ?? 22);
  const flightRadius = Math.max(60, prop.fireflyFlightRadius ?? 240);
  const spawnRadius = Math.max(30, prop.fireflySpawnRadius ?? Math.min(flightRadius * 0.5, 200));
  const lifetimeMin = Math.max(5, prop.fireflyLifetimeMin ?? 40);
  const lifetimeMax = Math.max(lifetimeMin, prop.fireflyLifetimeMax ?? lifetimeMin + 40);
  const state = {
    kind: 'ambient',
    fireflies: [],
    originX,
    originY: baseY + (prop.originOffsetY ?? 0),
    originOffsetX: prop.originOffsetX ?? 0,
    originOffsetY: prop.originOffsetY ?? 0,
    fireflyHalfSize: prop.fireflyHalfSize !== undefined
      ? Math.max(1, prop.fireflyHalfSize)
      : FIREFLY_JAR_FIREFLY_HALF_SIZE,
    lightRadius,
    flightRadius,
    spawnRadius,
    pullStrength: prop.fireflyPullStrength ?? 24,
    maxSpeed: Math.max(40, prop.fireflySpeed ?? 90),
    lifetimeMin,
    lifetimeMax,
    lightColor: prop.fireflyLightColor || 'rgba(240, 248, 220, 0.95)',
    glowColor: prop.fireflyGlowColor || 'rgba(180, 220, 255, 0.72)',
    flickerSpeedMin: Math.max(0.5, prop.fireflyFlickerSpeedMin ?? 2.2),
    flickerSpeedMax: Math.max(prop.fireflyFlickerSpeedMin ?? 2.2, prop.fireflyFlickerSpeedMax ?? 4.6),
    permanent: true,
    respawnDelay: Math.max(0, prop.fireflyRespawnDelay ?? 4),
    targetCount: Math.max(4, Math.round(prop.fireflyCount ?? 18))
  };
  prop.fireflyState = state;
  spawnAmbientFireflies(prop, state);
  return state;
}

function spawnAmbientFireflies(prop, state){
  if(!state) return;
  const count = Math.max(4, Math.round(prop.fireflyCount ?? state.targetCount ?? 12));
  const lightColor = prop.fireflyLightColor || state.lightColor || 'rgba(240, 248, 220, 0.95)';
  const glowColor = prop.fireflyGlowColor || state.glowColor || 'rgba(180, 220, 255, 0.72)';
  const minLife = Math.max(5, prop.fireflyLifetimeMin ?? state.lifetimeMin ?? 40);
  const maxLife = Math.max(minLife, prop.fireflyLifetimeMax ?? state.lifetimeMax ?? minLife + 40);
  const spawnRadius = Math.max(0, prop.fireflySpawnRadius ?? state.spawnRadius ?? state.flightRadius * 0.5);
  const originX = state.originX;
  const originY = state.originY;
  const maxSpeed = Math.max(40, state.maxSpeed || 90);
  const lightRadius = Math.max(6, prop.fireflyLightRadius ?? state.lightRadius ?? 18);
  const flickerMin = state.flickerSpeedMin ?? 2.2;
  const flickerMax = state.flickerSpeedMax ?? 4.6;
  const fireflies = [];
  for(let i=0;i<count;i++){
    const angle = rand(0, TAU);
    const radius = spawnRadius > 0 ? rand(0, spawnRadius) : 0;
    const height = spawnRadius > 0 ? rand(-spawnRadius * 0.35, spawnRadius * 0.35) : 0;
    const speed = rand(maxSpeed * 0.25, maxSpeed * 0.75);
    fireflies.push({
      x: originX + Math.cos(angle) * radius,
      y: originY + Math.sin(angle) * radius * 0.5 + height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0, maxLife * 0.4),
      maxLife: rand(minLife, maxLife),
      radius: lightRadius,
      lightColor,
      glowColor,
      flicker: rand(0, TAU),
      flickerSpeed: rand(flickerMin, flickerMax)
    });
  }
  state.fireflies = fireflies;
}

function updateFireflyPreview(state, dt){
  if(!state || !Array.isArray(state.preview)) return;
  for(const preview of state.preview){
    if(!preview) continue;
    preview.angle = (preview.angle || 0) + dt * (preview.speed ?? 0.8) * 2.4;
  }
  clampFireflyJarPreviewEntries(state);
}

function updateFireflySwarm(world, prop, state, dt){
  if(!state || !Array.isArray(state.fireflies) || !state.fireflies.length) return;
  const next = [];
  const maxSpeed = Math.max(40, state.maxSpeed || 90);
  const pull = Math.max(0, state.pullStrength || 24);
  const flightRadius = Math.max(60, state.flightRadius || 220);
  const halfSize = Math.max(1, state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE);
  const worldWidth = world?.width ?? 0;
  const permanent = !!state.permanent || !!prop?.permanentFireflies;
  for(const fly of state.fireflies){
    if(!fly) continue;
    fly.life += dt;
    if(!permanent && fly.life >= fly.maxLife){
      continue;
    }
    if(permanent && fly.life >= fly.maxLife){
      fly.life = 0;
      fly.maxLife = Math.max(state.lifetimeMax || fly.maxLife || 60, state.lifetimeMin || 30);
    }
    fly.flicker = (fly.flicker || 0) + (fly.flickerSpeed || 3.2) * dt;
    let vx = fly.vx ?? 0;
    let vy = fly.vy ?? 0;
    const toCenterX = state.originX - fly.x;
    const toCenterY = state.originY - fly.y;
    const distCenter = Math.hypot(toCenterX, toCenterY) || 1;
    vx += (toCenterX / distCenter) * pull * dt;
    vy += (toCenterY / distCenter) * pull * dt;
    const jitterAngle = rand(-Math.PI, Math.PI) * 0.08;
    const jitterSpeed = maxSpeed * 0.12 * dt;
    vx += Math.cos(jitterAngle) * jitterSpeed;
    vy += Math.sin(jitterAngle) * jitterSpeed;
    let speed = Math.hypot(vx, vy);
    if(speed > maxSpeed){
      const scale = maxSpeed / speed;
      vx *= scale;
      vy *= scale;
      speed = maxSpeed;
    }
    let nextX = fly.x + vx * dt;
    let nextY = fly.y + vy * dt;
    const ground = typeof groundHeightAt === 'function'
      ? groundHeightAt(world, nextX, { surface: 'top' })
      : world?.groundY;
    if(Number.isFinite(ground) && nextY > ground - 4){
      nextY = ground - 6;
      vy = Math.min(vy, -Math.abs(vy) - 30);
    }
    if(nextY < 32){
      nextY = 32;
      vy = Math.abs(vy);
    }
    if(worldWidth > 0){
      if(nextX < 24){
        nextX = 24;
        vx = Math.abs(vx);
      }else if(nextX > worldWidth - 24){
        nextX = worldWidth - 24;
        vx = -Math.abs(vx);
      }
    }
    if(typeof terrainSolidInBox === 'function'
      && terrainSolidInBox(world, nextX - halfSize, nextX + halfSize, nextY - halfSize, nextY + halfSize, { ignoreSand: true })){
      vx = -vx * 0.4;
      vy = -vy * 0.4 - 30;
      nextX = fly.x + vx * dt;
      nextY = fly.y + vy * dt;
    }
    const dist = Math.hypot(nextX - state.originX, nextY - state.originY);
    if(dist > flightRadius){
      const dirX = (nextX - state.originX) / (dist || 1);
      const dirY = (nextY - state.originY) / (dist || 1);
      nextX = state.originX + dirX * flightRadius * 0.92;
      nextY = state.originY + dirY * flightRadius * 0.92;
      vx -= dirX * maxSpeed * 0.35;
      vy -= dirY * maxSpeed * 0.35;
    }
    fly.x = nextX;
    fly.y = nextY;
    fly.vx = vx;
    fly.vy = vy;
    next.push(fly);
  }
  state.fireflies = next;
}

function updateFireflyJars(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  let prune = false;
  for(const prop of decor){
    if(!prop) continue;
    const isFireflyJar = prop.type === 'fireflyJar' || prop.type === 'hangingFireflyJar';
    if(prop.type === 'ambientFireflies'){
      const state = ensureAmbientFireflySwarmState(prop);
      if(!state) continue;
      const baseX = Number.isFinite(prop.x)
        ? prop.x
        : (Number.isFinite(prop.centerX) ? prop.centerX : state.originX ?? 0);
      const baseY = Number.isFinite(prop.baseY)
        ? prop.baseY
        : (Number.isFinite(prop.y) ? prop.y : state.originY ?? 0);
      const offsetX = prop.originOffsetX ?? state.originOffsetX ?? 0;
      const offsetY = prop.originOffsetY ?? state.originOffsetY ?? 0;
      state.originOffsetX = offsetX;
      state.originOffsetY = offsetY;
      state.originX = baseX + offsetX;
      state.originY = baseY + offsetY;
      state.fireflyHalfSize = prop.fireflyHalfSize !== undefined
        ? Math.max(1, prop.fireflyHalfSize)
        : (state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE);
      state.lightRadius = Math.max(8, prop.fireflyLightRadius ?? state.lightRadius ?? 22);
      state.flightRadius = Math.max(60, prop.fireflyFlightRadius ?? state.flightRadius ?? 240);
      state.spawnRadius = Math.max(0, prop.fireflySpawnRadius ?? state.spawnRadius ?? state.flightRadius * 0.5);
      if(state.spawnRadius > state.flightRadius) state.spawnRadius = state.flightRadius;
      state.pullStrength = prop.fireflyPullStrength ?? state.pullStrength ?? 24;
      state.maxSpeed = Math.max(40, prop.fireflySpeed ?? state.maxSpeed ?? 90);
      state.lifetimeMin = Math.max(5, prop.fireflyLifetimeMin ?? state.lifetimeMin ?? 40);
      state.lifetimeMax = Math.max(state.lifetimeMin, prop.fireflyLifetimeMax ?? state.lifetimeMax ?? state.lifetimeMin + 40);
      state.targetCount = Math.max(4, Math.round(prop.fireflyCount ?? state.targetCount ?? 18));
      if(prop.fireflyLightColor) state.lightColor = prop.fireflyLightColor;
      if(prop.fireflyGlowColor) state.glowColor = prop.fireflyGlowColor;
      if(prop.fireflyFlickerSpeedMin !== undefined) state.flickerSpeedMin = Math.max(0.5, prop.fireflyFlickerSpeedMin);
      if(prop.fireflyFlickerSpeedMax !== undefined) state.flickerSpeedMax = Math.max(state.flickerSpeedMin ?? 0.5, prop.fireflyFlickerSpeedMax);
      state.respawnDelay = Math.max(0, prop.fireflyRespawnDelay ?? state.respawnDelay ?? 0);
      state.permanent = true;
      if(!state.fireflies.length){
        state.respawnTimer = (state.respawnTimer || 0) + dt;
        if(state.respawnTimer >= state.respawnDelay){
          spawnAmbientFireflies(prop, state);
          state.respawnTimer = 0;
        }
      }else{
        state.respawnTimer = 0;
      }
      updateFireflySwarm(world, prop, state, dt);
      continue;
    }
    if(prop.type === 'fireflyJarSwarm'){
      const metrics = getFireflyJarMetrics(prop);
      const state = ensureFireflyJarState(prop, metrics);
      if(!state) continue;
      syncFireflyJarStateGeometry(state, metrics);
      state.permanent = true;
      if(prop.suppressJarShardSpawn) state.shardsSpawned = true;
      if(!state.released || !Array.isArray(state.fireflies) || !state.fireflies.length){
        releaseFireflyJarFireflies(world, prop, state);
      }
      updateFireflySwarm(world, prop, state, dt);
      continue;
    }
    if(!isFireflyJar) continue;
    const metrics = getFireflyJarMetrics(prop);
    const state = ensureFireflyJarState(prop, metrics);
    if(!state) continue;
    syncFireflyJarStateGeometry(state, metrics);
    state.permanent = !!prop.permanentFireflies;
    if(prop.broken){
      if(!state.released) releaseFireflyJarFireflies(world, prop, state);
      updateFireflySwarm(world, prop, state, dt);
      if(state.fireflies.length === 0){
        prop.remove = true;
        prune = true;
      }
    }else{
      updateFireflyPreview(state, dt);
    }
  }
  if(prune){
    world.decor = decor.filter(prop=>prop && !prop.remove);
  }
}

function getChronoFlyJarMetrics(prop){
  return getFireflyJarMetrics(prop);
}

function syncChronoFlyJarStateGeometry(state, metrics){
  if(!state || !metrics) return;
  state.originX = metrics.originX;
  state.originY = metrics.originY;
  state.previewClamp = metrics.previewHalfExtent;
  state.flyHalfSize = CHRONO_FLY_JAR_PREVIEW_HALF_SIZE;
}

function ensureChronoFlyPreviewAnimationDefaults(entries){
  if(!Array.isArray(entries)) return;
  for(const entry of entries){
    if(!entry) continue;
    if(!Number.isFinite(entry.framePhase)) entry.framePhase = rand(0, CHRONO_FLY_JAR_FRAME_COUNT);
    if(!Number.isFinite(entry.frameSpeed)) entry.frameSpeed = rand(8, 13);
  }
}

function ensureChronoFlySwarmAnimationDefaults(entries){
  if(!Array.isArray(entries)) return;
  for(const entry of entries){
    if(!entry) continue;
    if(!Number.isFinite(entry.framePhase)) entry.framePhase = rand(0, CHRONO_FLY_JAR_FRAME_COUNT);
    if(!Number.isFinite(entry.frameSpeed)) entry.frameSpeed = rand(7, 11);
  }
}

function ensureChronoFlyJarState(prop, metrics){
  if(!prop) return null;
  const dims = metrics || getChronoFlyJarMetrics(prop);
  if(prop.chronoFlyState){
    const existing = prop.chronoFlyState;
    syncChronoFlyJarStateGeometry(existing, dims);
    clampFireflyJarPreviewEntries(existing);
    ensureChronoFlyPreviewAnimationDefaults(existing.preview);
    ensureChronoFlySwarmAnimationDefaults(existing.flies);
    return existing;
  }
  const state = {
    preview: [],
    flies: [],
    released: false,
    originX: dims.originX,
    originY: dims.originY,
    previewClamp: dims.previewHalfExtent,
    flyHalfSize: CHRONO_FLY_JAR_PREVIEW_HALF_SIZE,
    swarmRadius: Math.max(60, prop.swarmRadius ?? Math.min(dims.width, dims.height) * 3.2),
    freezeDurationMs: Math.max(500, prop.freezeDurationMs ?? CHRONO_FLY_JAR_DEFAULT_FREEZE_MS),
    contactCooldownMs: Math.max(200, prop.contactCooldownMs ?? CHRONO_FLY_JAR_DEFAULT_COOLDOWN_MS),
    swarmLifetime: Math.max(2, prop.swarmLifetime ?? CHRONO_FLY_JAR_DEFAULT_SWARM_LIFETIME),
    contactRadius: Math.max(48, prop.contactRadius ?? Math.min(dims.width, dims.height) * 2.2),
    lightRadius: Math.max(10, prop.flyLightRadius ?? 18),
    lightColor: prop.flyLightColor || 'rgba(142, 220, 255, 0.95)',
    glowColor: prop.flyGlowColor || 'rgba(120, 210, 255, 0.75)'
  };
  const maxPreviewRadius = dims.previewHalfExtent;
  const count = Math.max(4, Math.round(prop.flyCount ?? 14));
  for(let i=0;i<count;i++){
    const radius = maxPreviewRadius > 0
      ? rand(maxPreviewRadius * 0.35, maxPreviewRadius)
      : 0;
    const maxHeightOffset = Math.max(0, maxPreviewRadius - radius * 0.5);
    state.preview.push({
      angle: rand(0, TAU),
      speed: rand(0.5, 1.2),
      radius,
      heightOffset: maxHeightOffset > 0
        ? rand(-maxHeightOffset, maxHeightOffset)
        : 0,
      framePhase: rand(0, CHRONO_FLY_JAR_FRAME_COUNT),
      frameSpeed: rand(8, 13)
    });
  }
  clampFireflyJarPreviewEntries(state);
  prop.chronoFlyState = state;
  return state;
}

function updateChronoFlyJarPreview(state, dt){
  if(!state || !Array.isArray(state.preview)) return;
  ensureChronoFlyPreviewAnimationDefaults(state.preview);
  for(const preview of state.preview){
    if(!preview) continue;
    preview.angle = (preview.angle || 0) + dt * (preview.speed ?? 0.8) * 2.2;
    const animSpeed = Number.isFinite(preview.frameSpeed) ? preview.frameSpeed : 10;
    preview.framePhase = (preview.framePhase || 0) + dt * animSpeed;
  }
  clampFireflyJarPreviewEntries(state);
}

function shouldChronoFlyJarShatter(world, prop, state){
  if(!world || !prop || !state) return false;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  if(!sticks.length) return false;
  const trigger = Math.max(24, prop.triggerRadius ?? CHRONO_FLY_JAR_DEFAULT_TRIGGER_RADIUS);
  const centerX = state.originX ?? prop.x ?? 0;
  const centerY = state.originY ?? prop.y ?? 0;
  for(const stick of sticks){
    if(!stick || stick.dead || stick.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    if(Math.hypot(center.x - centerX, center.y - centerY) <= trigger){
      return true;
    }
  }
  return false;
}

function spawnChronoFlyJarShards(world, prop){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const metrics = getChronoFlyJarMetrics(prop);
  const width = metrics.width;
  const height = metrics.height;
  const cx = metrics.originX;
  const top = metrics.top;
  const count = Math.max(10, Math.round(rand(14, 22)));
  for(let i=0;i<count;i++){
    const shardColor = typeof choice === 'function'
      ? choice(['rgba(150,220,255,0.9)','rgba(128,206,255,0.85)','rgba(180,236,255,0.92)'])
      : 'rgba(150,220,255,0.9)';
    const shard = {
      type: 'shard',
      style: 'shard',
      x: cx + rand(-width * 0.45, width * 0.45),
      y: top + rand(height * 0.2, height * 0.95),
      vx: rand(-260, 260),
      vy: rand(-520, -220),
      rotation: rand(0, TAU),
      spin: rand(-6, 6),
      width: rand(2.2, 4.4),
      height: rand(2, 3.6),
      life: 0,
      maxLife: rand(520, 760),
      alpha: 1,
      color: shardColor
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'glassShard');
    world.particles.push(shard);
  }
  const glowCount = Math.max(6, Math.round(count * 0.35));
  for(let i=0;i<glowCount;i++){
    const glow = {
      type: 'ember',
      style: 'ember',
      x: cx + rand(-width * 0.3, width * 0.3),
      y: top + rand(0, height * 0.4),
      vx: rand(-120, 120),
      vy: rand(-260, -80),
      width: rand(3, 6),
      height: rand(3, 6),
      life: 0,
      maxLife: rand(420, 620),
      alpha: 1,
      color: 'rgba(140, 220, 255, 0.95)'
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(glow, 'ember');
    world.particles.push(glow);
  }
  const limit = 260;
  if(world.particles.length > limit){
    world.particles.splice(0, world.particles.length - limit);
  }
}

function releaseChronoFlySwarm(world, prop, state){
  if(!state || state.released) return;
  state.released = true;
  const metrics = getChronoFlyJarMetrics(prop);
  syncChronoFlyJarStateGeometry(state, metrics);
  const radius = Math.max(48, state.swarmRadius ?? Math.min(metrics.width, metrics.height) * 3.4);
  state.swarmRadius = radius;
  const count = Math.max(6, Math.round(prop.flyCount ?? 14));
  const flies = [];
  for(let i=0;i<count;i++){
    flies.push({
      angle: rand(0, TAU),
      orbit: rand(0.35, 1),
      speed: rand(0.8, 1.6),
      heightPhase: rand(0, TAU),
      flicker: rand(0, TAU),
      flickerSpeed: rand(2.2, 3.6),
      x: state.originX,
      y: state.originY,
      framePhase: rand(0, CHRONO_FLY_JAR_FRAME_COUNT),
      frameSpeed: rand(7, 11)
    });
  }
  state.flies = flies;
  state.cooldowns = new Map();
  state.elapsed = 0;
  state.remainingLife = Number.isFinite(state.swarmLifetime) ? state.swarmLifetime : null;
  state.centerX = state.originX;
  state.centerY = state.originY;
  state.finished = false;
  spawnChronoFlyJarShards(world, prop);
  state.shardsSpawned = true;
  if(!prop.persistOnBreak) prop.persistOnBreak = true;
  if(!Array.isArray(world.hazards)) world.hazards = [];
  const hazard = {
    type: 'chronoFlySwarm',
    element: 'chronometric',
    centerX: state.centerX,
    centerY: state.centerY,
    radius,
    swarmState: state,
    pulse: 0,
    screenIndex: prop.screenIndex
  };
  world.hazards.push(hazard);
  state.hazard = hazard;
}

function updateChronoFlySwarm(world, prop, state, dt){
  if(!state || !Array.isArray(state.flies) || !state.flies.length) return;
  if(state.remainingLife !== null && state.remainingLife !== undefined){
    state.remainingLife -= dt;
    if(state.remainingLife <= 0){
      state.remainingLife = 0;
      state.flies = [];
      state.finished = true;
      if(state.hazard){
        state.hazard.remove = true;
        state.hazard = null;
      }
      return;
    }
  }
  state.elapsed = (state.elapsed || 0) + dt;
  const centerX = state.originX;
  const centerY = state.originY;
  const radius = Math.max(40, state.swarmRadius || 120);
  const wobble = radius * 0.22;
  ensureChronoFlySwarmAnimationDefaults(state.flies);
  for(const fly of state.flies){
    if(!fly) continue;
    const speed = Math.max(0.2, fly.speed ?? 1);
    fly.angle = (fly.angle || 0) + dt * speed * 2.6;
    fly.heightPhase = (fly.heightPhase || 0) + dt * 1.4;
    const orbit = clamp(fly.orbit ?? 0.6, 0.2, 1.1);
    const flyRadius = radius * orbit;
    const wobbleY = Math.sin(fly.heightPhase) * wobble;
    fly.x = centerX + Math.cos(fly.angle) * flyRadius;
    fly.y = centerY + Math.sin(fly.angle) * flyRadius * 0.55 + wobbleY;
    fly.flicker = (fly.flicker || 0) + (fly.flickerSpeed || 3) * dt;
    const animSpeed = Number.isFinite(fly.frameSpeed) ? fly.frameSpeed : 9;
    fly.framePhase = (fly.framePhase || 0) + dt * animSpeed;
  }
  state.centerX = centerX;
  state.centerY = centerY;
  if(state.hazard){
    state.hazard.centerX = centerX;
    state.hazard.centerY = centerY;
    state.hazard.radius = radius;
  }
}

function shatterChronoFlyJar(world, prop){
  if(!prop) return;
  if(!prop.broken) prop.broken = true;
  const state = ensureChronoFlyJarState(prop);
  if(!state) return;
  releaseChronoFlySwarm(world, prop, state);
}

function updateChronoFlyJars(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  let prune = false;
  for(const prop of decor){
    if(!prop || prop.type !== 'chronoFlyJar') continue;
    const metrics = getChronoFlyJarMetrics(prop);
    const state = ensureChronoFlyJarState(prop, metrics);
    if(!state) continue;
    syncChronoFlyJarStateGeometry(state, metrics);
    if(prop.broken){
      if(!state.released) releaseChronoFlySwarm(world, prop, state);
      updateChronoFlySwarm(world, prop, state, dt);
      if(state.finished){
        prop.remove = true;
        prune = true;
      }
    }else{
      updateChronoFlyJarPreview(state, dt);
      if(shouldChronoFlyJarShatter(world, prop, state)){
        shatterChronoFlyJar(world, prop);
      }
    }
  }
  if(prune){
    world.decor = decor.filter(prop=>prop && !prop.remove);
  }
}

const GRASSHOPPER_HALF_SIZE = 1.5;
const GRASSHOPPER_ALERT_RADIUS = 120;
const GRASSHOPPER_IDLE_HOP_MIN = 1.1;
const GRASSHOPPER_IDLE_HOP_MAX = 2.6;
const GRASSHOPPER_GRAVITY = 780;
const GRASSHOPPER_GRASS_LIFETIME_MIN = 10;
const GRASSHOPPER_GRASS_LIFETIME_MAX = 15;

const GRASS_FIREFLY_HALF_SIZE = 1.5;
const GRASS_FIREFLY_LIFETIME_MIN = 10;
const GRASS_FIREFLY_LIFETIME_MAX = 15;
const GRASS_FIREFLY_JITTER_MIN = 22;
const GRASS_FIREFLY_JITTER_MAX = 36;
const GRASS_FIREFLY_FLOAT_MIN = 16;
const GRASS_FIREFLY_FLOAT_MAX = 28;
const GRASS_FIREFLY_SPEED_MIN = 26;
const GRASS_FIREFLY_SPEED_MAX = 46;

function spawnGrasshopperFromGrass(world, x, baseY){
  if(!world || !Number.isFinite(x)) return null;
  const swarm = Array.isArray(world.grasshoppers) ? world.grasshoppers : (world.grasshoppers = []);
  const width = Math.max(0, world.width || 0);
  const minX = 12;
  const maxX = width > 0 ? Math.max(minX, width - 12) : x;
  const spawnX = clamp(x, minX, maxX);
  const groundFallback = Number.isFinite(world.groundY)
    ? world.groundY
    : Math.max(0, (world.height || 0) - 100);
  const ground = Number.isFinite(baseY)
    ? baseY
    : resolveGrasshopperGround(world, spawnX, groundFallback);
  const hopper = {
    x: spawnX,
    y: (ground || groundFallback) - 3,
    vx: rand(-40, 40),
    vy: rand(-90, -30),
    grounded: false,
    hopTimer: rand(GRASSHOPPER_IDLE_HOP_MIN, GRASSHOPPER_IDLE_HOP_MAX),
    panicTimer: 0,
    halfSize: GRASSHOPPER_HALF_SIZE,
    life: 0,
    maxLife: rand(GRASSHOPPER_GRASS_LIFETIME_MIN, GRASSHOPPER_GRASS_LIFETIME_MAX)
  };
  swarm.push(hopper);
  return hopper;
}

function spawnGrassAmbientFirefly(world, x, baseY){
  if(!world || !Number.isFinite(x)) return null;
  const swarm = Array.isArray(world.grassFireflies) ? world.grassFireflies : (world.grassFireflies = []);
  const width = Math.max(0, world.width || 0);
  const minX = 12;
  const maxX = width > 0 ? Math.max(minX, width - 12) : x;
  const spawnX = clamp(x, minX, maxX);
  const groundFallback = Number.isFinite(world.groundY)
    ? world.groundY
    : Math.max(0, (world.height || 0) - 100);
  const ground = Number.isFinite(baseY)
    ? baseY
    : resolveGrasshopperGround(world, spawnX, groundFallback);
  const anchorY = (ground || groundFallback) - rand(28, 46);
  const fly = {
    x: spawnX + rand(-6, 6),
    y: anchorY + rand(-8, 8),
    vx: rand(-18, 18),
    vy: rand(-22, -2),
    anchorX: spawnX,
    anchorY,
    radius: rand(40, 70),
    jitter: rand(GRASS_FIREFLY_JITTER_MIN, GRASS_FIREFLY_JITTER_MAX),
    floatStrength: rand(GRASS_FIREFLY_FLOAT_MIN, GRASS_FIREFLY_FLOAT_MAX),
    maxSpeed: rand(GRASS_FIREFLY_SPEED_MIN, GRASS_FIREFLY_SPEED_MAX),
    life: 0,
    maxLife: rand(GRASS_FIREFLY_LIFETIME_MIN, GRASS_FIREFLY_LIFETIME_MAX),
    flicker: rand(0, TAU),
    flickerSpeed: rand(1.8, 3.6),
    size: rand(2.2, 3.6)
  };
  swarm.push(fly);
  return fly;
}

function updateGrasshoppers(world, dt){
  if(!world || dt <= 0) return;
  const swarm = Array.isArray(world.grasshoppers) ? world.grasshoppers : null;
  if(!swarm || !swarm.length) return;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const groundFallback = Number.isFinite(world.groundY)
    ? world.groundY
    : Math.max(0, (world.height || 0) - 100);
  const leftBound = 24;
  const rightBound = Math.max(leftBound, (world.width || 0) - 24);
  const next = [];
  for(const hopper of swarm){
    if(!hopper) continue;
    const limitedLife = Number.isFinite(hopper.maxLife) && hopper.maxLife > 0;
    if(limitedLife){
      hopper.life = (hopper.life || 0) + dt;
      if(hopper.life >= hopper.maxLife){
        continue;
      }
    }
    hopper.hopTimer = Math.max(0, (hopper.hopTimer ?? GRASSHOPPER_IDLE_HOP_MIN) - dt);
    hopper.panicTimer = Math.max(0, (hopper.panicTimer ?? 0) - dt);
    const threat = findNearestGrasshopperThreat(sticks, hopper);
    if(threat && hopper.grounded && hopper.panicTimer <= 0){
      triggerGrasshopperHop(hopper, { awayFrom: threat, panic: true });
      hopper.panicTimer = 0.4;
    }else if(hopper.grounded && hopper.hopTimer <= 0){
      triggerGrasshopperHop(hopper);
    }
    hopper.vx = hopper.vx ?? 0;
    hopper.vy = (hopper.vy ?? 0) + GRASSHOPPER_GRAVITY * dt;
    hopper.x += hopper.vx * dt;
    hopper.y += hopper.vy * dt;
    if(hopper.x < leftBound){
      hopper.x = leftBound;
      hopper.vx = Math.abs(hopper.vx) * 0.6;
    }else if(hopper.x > rightBound){
      hopper.x = rightBound;
      hopper.vx = -Math.abs(hopper.vx) * 0.6;
    }
    const ground = resolveGrasshopperGround(world, hopper.x, groundFallback);
    const footY = ground - GRASSHOPPER_HALF_SIZE * 2;
    if(hopper.y >= footY){
      hopper.y = footY;
      if(hopper.vy > 0) hopper.vy = 0;
      hopper.grounded = true;
      hopper.vx *= Math.max(0, 1 - dt * 6);
    }else{
      hopper.grounded = false;
    }
    next.push(hopper);
  }
  world.grasshoppers = next;
}

function findNearestGrasshopperThreat(sticks, hopper){
  if(!Array.isArray(sticks) || !hopper) return null;
  let nearest = null;
  let bestDist = GRASSHOPPER_ALERT_RADIUS;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    if(typeof stick.center !== 'function') continue;
    const center = stick.center();
    if(!center) continue;
    const dx = center.x - hopper.x;
    const dy = center.y - hopper.y;
    const dist = Math.hypot(dx, dy);
    if(dist < bestDist){
      bestDist = dist;
      nearest = center;
    }
  }
  return nearest;
}

function triggerGrasshopperHop(hopper, options={}){
  if(!hopper) return;
  const panic = !!options.panic;
  const awayFrom = options.awayFrom || null;
  const minStrength = panic ? 220 : 160;
  const maxStrength = panic ? 300 : 220;
  hopper.vy = -rand(minStrength, maxStrength);
  let dir = 0;
  if(awayFrom){
    dir = Math.sign(hopper.x - awayFrom.x);
    if(dir === 0) dir = Math.random() < 0.5 ? -1 : 1;
  }else{
    dir = Math.random() < 0.5 ? -1 : 1;
  }
  const speed = panic ? rand(100, 150) : rand(60, 110);
  hopper.vx = clamp(dir * speed, -160, 160);
  hopper.hopTimer = rand(GRASSHOPPER_IDLE_HOP_MIN, GRASSHOPPER_IDLE_HOP_MAX);
  hopper.grounded = false;
}

function resolveGrasshopperGround(world, x, fallback){
  if(typeof groundHeightAt === 'function'){
    const height = groundHeightAt(world, x, { surface: 'top' });
    if(Number.isFinite(height)) return height;
  }
  return fallback;
}

function drawGrasshoppers(world, ctx){
  if(!world || !ctx) return;
  const swarm = Array.isArray(world.grasshoppers) ? world.grasshoppers : null;
  if(!swarm || !swarm.length) return;
  const defaultGround = Number.isFinite(world.groundY)
    ? world.groundY
    : Math.max(0, (world.height || 0) - 100);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for(const hopper of swarm){
    if(!hopper) continue;
    const half = hopper.halfSize ?? GRASSHOPPER_HALF_SIZE;
    const ground = resolveGrasshopperGround(world, hopper.x, defaultGround);
    const shadowY = Math.min(ground - half * 0.2, hopper.y + half + 1);
    ctx.fillRect(Math.round(hopper.x - half), Math.round(shadowY), Math.ceil(half * 2), 1);
  }
  ctx.fillStyle = '#2ecf6b';
  for(const hopper of swarm){
    if(!hopper) continue;
    const half = hopper.halfSize ?? GRASSHOPPER_HALF_SIZE;
    const size = Math.max(2, Math.round(half * 2));
    const left = Math.round(hopper.x - half);
    const top = Math.round(hopper.y - half);
    ctx.fillRect(left, top, size, size);
  }
  ctx.restore();
}

function updateGrassFireflies(world, dt){
  if(!world || dt <= 0) return;
  const swarm = Array.isArray(world.grassFireflies) ? world.grassFireflies : null;
  if(!swarm || !swarm.length) return;
  const next = [];
  const worldWidth = Math.max(0, world.width || 0);
  for(const fly of swarm){
    if(!fly) continue;
    const limitedLife = Number.isFinite(fly.maxLife) && fly.maxLife > 0;
    if(limitedLife){
      fly.life = (fly.life || 0) + dt;
      if(fly.life >= fly.maxLife){
        continue;
      }
    }
    const jitter = Number.isFinite(fly.jitter) ? fly.jitter : 28;
    const maxSpeed = Math.max(10, Number.isFinite(fly.maxSpeed) ? fly.maxSpeed : 36);
    const floatStrength = Number.isFinite(fly.floatStrength) ? fly.floatStrength : 22;
    let vx = Number.isFinite(fly.vx) ? fly.vx : 0;
    let vy = Number.isFinite(fly.vy) ? fly.vy : 0;
    const jitterAngle = rand(-Math.PI, Math.PI);
    vx += Math.cos(jitterAngle) * jitter * dt;
    vy += Math.sin(jitterAngle) * jitter * dt;
    vy -= floatStrength * dt;
    const speed = Math.hypot(vx, vy);
    if(speed > maxSpeed){
      const scale = maxSpeed / speed;
      vx *= scale;
      vy *= scale;
    }
    let nextX = (fly.x ?? 0) + vx * dt;
    let nextY = (fly.y ?? 0) + vy * dt;
    const anchorX = Number.isFinite(fly.anchorX) ? fly.anchorX : (fly.x ?? nextX);
    const anchorY = Number.isFinite(fly.anchorY) ? fly.anchorY : (fly.y ?? nextY) - 20;
    const radius = Math.max(20, Number.isFinite(fly.radius) ? fly.radius : 60);
    const dx = nextX - anchorX;
    const dy = nextY - anchorY;
    const dist = Math.hypot(dx, dy);
    if(dist > radius){
      const clampRadius = radius * 0.9;
      const normX = dx / (dist || 1);
      const normY = dy / (dist || 1);
      nextX = anchorX + normX * clampRadius;
      nextY = anchorY + normY * clampRadius;
      vx -= normX * maxSpeed * 0.35;
      vy -= normY * maxSpeed * 0.35;
    }
    const ground = typeof groundHeightAt === 'function'
      ? groundHeightAt(world, nextX, { surface: 'top' })
      : world.groundY;
    if(Number.isFinite(ground) && nextY > ground - 10){
      nextY = ground - 10;
      vy = Math.min(vy, -Math.abs(vy) * 0.5);
    }
    if(nextY < 24){
      nextY = 24;
      vy = Math.abs(vy);
    }
    if(worldWidth > 0){
      if(nextX < 12){
        nextX = 12;
        vx = Math.abs(vx);
      }else if(nextX > worldWidth - 12){
        nextX = worldWidth - 12;
        vx = -Math.abs(vx);
      }
    }
    fly.x = nextX;
    fly.y = nextY;
    fly.vx = vx;
    fly.vy = vy;
    fly.flicker = (fly.flicker || 0) + (fly.flickerSpeed || 2.6) * dt;
    next.push(fly);
  }
  world.grassFireflies = next;
}

function drawGrassFireflies(world, ctx){
  if(!world || !ctx) return;
  const swarm = Array.isArray(world.grassFireflies) ? world.grassFireflies : null;
  if(!swarm || !swarm.length) return;
  ctx.save();
  for(const fly of swarm){
    if(!fly) continue;
    const size = Math.max(2, Math.round(fly.size || (GRASS_FIREFLY_HALF_SIZE * 2)));
    const glowSize = size + 2;
    const alpha = clamp(0.35 + Math.sin(fly.flicker || 0) * 0.3, 0.2, 0.95);
    const glowLeft = Math.round((fly.x || 0) - glowSize * 0.5);
    const glowTop = Math.round((fly.y || 0) - glowSize * 0.5);
    ctx.fillStyle = `rgba(255, 240, 180, ${alpha * 0.5})`;
    ctx.fillRect(glowLeft, glowTop, glowSize, glowSize);
    const coreLeft = Math.round((fly.x || 0) - size * 0.5);
    const coreTop = Math.round((fly.y || 0) - size * 0.5);
    ctx.fillStyle = `rgba(255, 244, 210, ${alpha})`;
    ctx.fillRect(coreLeft, coreTop, size, size);
  }
  ctx.restore();
}

function randomRange(min, max){
  const a = Number.isFinite(min) ? min : 0;
  const b = Number.isFinite(max) ? max : a;
  if(b <= a) return a;
  if(typeof rand === 'function') return rand(a, b);
  return a + Math.random() * (b - a);
}

function ensureRainFieldState(prop){
  if(!prop) return null;
  if(!prop.rainFieldState){
    prop.rainFieldState = {
      drops: [],
      splashes: [],
      spawnAccumulator: 0,
      thunderTimer: null,
      flash: 0,
      flashStages: null
    };
  }
  return prop.rainFieldState;
}

function resolveRainFieldBounds(world, prop, camera, cachedView){
  if(!prop){
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      width: 0,
      height: 0
    };
  }
  const widthRaw = Number(prop.width);
  const heightRaw = Number(prop.height);
  const fallbackWidth = Math.max(10, Number.isFinite(widthRaw) ? widthRaw : 200);
  const fallbackHeight = Math.max(10, Number.isFinite(heightRaw) ? heightRaw : 200);
  const centerXRaw = Number(prop.x);
  const baseYRaw = Number(prop.baseY ?? prop.y);
  const centerX = Number.isFinite(centerXRaw) ? centerXRaw : 0;
  const baseY = Number.isFinite(baseYRaw) ? baseYRaw : 0;
  let left = centerX - fallbackWidth * 0.5;
  let right = centerX + fallbackWidth * 0.5;
  let top = baseY - fallbackHeight;
  let bottom = baseY;
  const view = prop.followCamera === false
    ? null
    : (cachedView || worldViewRect(world, camera, 0));
  if(view){
    const marginXRaw = prop.viewMarginX ?? prop.viewMargin;
    const marginTopRaw = prop.viewMarginTop ?? prop.viewMarginY;
    const marginBottomRaw = prop.viewMarginBottom ?? prop.viewMarginY;
    const marginXValue = Number(marginXRaw);
    const marginTopValue = Number(marginTopRaw);
    const marginBottomValue = Number(marginBottomRaw);
    const marginX = Number.isFinite(marginXValue) ? marginXValue : 80;
    const marginTop = Number.isFinite(marginTopValue) ? marginTopValue : 40;
    const marginBottom = Number.isFinite(marginBottomValue) ? marginBottomValue : 60;
    left = view.left - Math.max(0, marginX);
    right = view.right + Math.max(0, marginX);
    top = view.top - Math.max(0, marginTop);
    bottom = view.bottom + Math.max(0, marginBottom);
  }
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return { left, right, top, bottom, width, height };
}

function ensureStarFieldState(prop){
  if(!prop) return null;
  if(!prop.starFieldState){
    prop.starFieldState = { bounds: null };
  }
  return prop.starFieldState;
}

function resolveStarFieldBounds(world, prop, camera, cachedView){
  if(!prop) return null;
  const widthRaw = Number(prop.width);
  const heightRaw = Number(prop.height);
  const fallbackWidth = Math.max(4, Number.isFinite(widthRaw) ? widthRaw : 200);
  const fallbackHeight = Math.max(4, Number.isFinite(heightRaw) ? heightRaw : 200);
  const centerXRaw = Number(prop.x ?? prop.centerX);
  let centerX = Number.isFinite(centerXRaw) ? centerXRaw : ((world?.width || 0) * 0.5);
  const baseYRaw = Number(prop.baseY ?? prop.y);
  let baseY = Number.isFinite(baseYRaw) ? baseYRaw : (Number(world?.groundY) || (Number(world?.height) ? world.height - 100 : 0));
  let width = fallbackWidth;
  let height = fallbackHeight;
  let top = baseY - height;
  const view = prop.followCamera === false ? null : (cachedView || worldViewRect(world, camera, 0));
  if(view){
    const viewWidth = Math.max(0, view.right - view.left);
    const viewHeight = Math.max(0, view.bottom - view.top);
    const marginXRaw = prop.viewMarginX ?? prop.viewMargin;
    const marginTopRaw = prop.viewMarginTop ?? prop.viewMarginY;
    const marginBottomRaw = prop.viewMarginBottom ?? prop.viewMarginY;
    const marginX = Number.isFinite(Number(marginXRaw)) ? Number(marginXRaw) : 0;
    const marginTop = Number.isFinite(Number(marginTopRaw)) ? Number(marginTopRaw) : 0;
    const marginBottom = Number.isFinite(Number(marginBottomRaw)) ? Number(marginBottomRaw) : 0;
    const desiredWidth = viewWidth + marginX * 2;
    if(desiredWidth > width){
      width = desiredWidth;
      centerX = view.left + viewWidth * 0.5;
    }
    const desiredHeight = viewHeight + marginTop + marginBottom;
    if(desiredHeight > height){
      height = desiredHeight;
    }
    const bottomTarget = view.bottom + marginBottom;
    if(bottomTarget > baseY){
      baseY = bottomTarget;
    }
    top = baseY - height;
    const topTarget = view.top - marginTop;
    if(top > topTarget){
      baseY = topTarget + height;
      top = baseY - height;
    }
  }
  const left = centerX - width * 0.5;
  return {
    left,
    right: left + width,
    top,
    bottom: baseY,
    width,
    height,
    centerX,
    baseY
  };
}

function updateRainFields(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  const step = Math.min(Math.max(dt, 0), 0.5);
  const camera = ensureCamera(world);
  const viewRect = worldViewRect(world, camera, 0);
  let flashAlphaMax = 0;
  let flashColorMax = null;
  for(const prop of decor){
    if(!prop || prop.type !== 'rainField') continue;
    if(activeScreenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== activeScreenIndex) continue;
    const state = ensureRainFieldState(prop);
    if(!state) continue;
    const bounds = resolveRainFieldBounds(world, prop, camera, viewRect);
    const width = Math.max(20, bounds.width || 0);
    const height = Math.max(20, bounds.height || 0);
    const left = Number.isFinite(bounds.left) ? bounds.left : 0;
    const top = Number.isFinite(bounds.top) ? bounds.top : 0;
    const right = Number.isFinite(bounds.right) ? bounds.right : left + width;
    const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top + height;
    state.bounds = { left, right, top, bottom, width, height };
    const spawnBase = Number(prop.density);
    const spawnRate = Math.max(0, Number.isFinite(spawnBase) ? spawnBase : width * 0.22);
    const densityVariance = Number(prop.densityVariance) || 0;
    const spawnVariance = densityVariance ? randomRange(-densityVariance, densityVariance) : 0;
    state.spawnAccumulator = (state.spawnAccumulator || 0) + Math.max(0, spawnRate + spawnVariance) * step;
    if(!Array.isArray(state.drops)) state.drops = [];
    if(!Array.isArray(state.splashes)) state.splashes = [];
    const drops = state.drops;
    const splashes = state.splashes;
    const maxDrops = Math.max(25, Math.round(Number(prop.maxDrops) || width * 0.4));
    const baseSpeed = Math.max(60, Number(prop.speed) || 820);
    const speedVariance = Math.max(0, Number(prop.speedVariance) || baseSpeed * 0.2);
    const baseWind = Number(prop.wind) || 0;
    const windVariance = Math.max(0, Number(prop.windVariance) || 90);
    const baseLength = Math.max(6, Number(prop.dropLength) || 26);
    const lengthVariance = Math.max(0, Number(prop.dropLengthVariance) || baseLength * 0.35);
    const baseThickness = Math.max(0.3, Number(prop.dropThickness) || 1.4);
    const thicknessVariance = Math.max(0, Number(prop.dropThicknessVariance) || baseThickness * 0.45);
    const dropAlpha = clamp(Number.isFinite(prop.dropAlpha) ? prop.dropAlpha : 0.88, 0, 1.2);
    while(state.spawnAccumulator >= 1 && drops.length < maxDrops){
      state.spawnAccumulator -= 1;
      const vx = baseWind + (windVariance ? randomRange(-windVariance, windVariance) : 0);
      const vy = baseSpeed + (speedVariance ? randomRange(-speedVariance, speedVariance) : 0);
      const length = baseLength + (lengthVariance ? randomRange(-lengthVariance, lengthVariance) : 0);
      const thickness = baseThickness + (thicknessVariance ? randomRange(-thicknessVariance, thicknessVariance) : 0);
      const spawnX = left + Math.random() * width;
      const spawnY = top - Math.random() * Math.min(height * 0.08, 18);
      drops.push({
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        length: Math.max(4, length),
        thickness: Math.max(0.25, thickness),
        alpha: clamp(dropAlpha * (0.7 + Math.random() * 0.3), 0, 1.1)
      });
    }
    const survivors = [];
    const splashRadius = Math.max(6, Number(prop.splashRadius) || 16);
    const splashDuration = Math.max(0.12, Number(prop.splashDuration) || 0.26);
    const splashThickness = Math.max(0.4, Number(prop.splashThickness) || 1.1);
    const maxSplashes = Math.max(10, Math.round(Number(prop.maxSplashes) || width * 0.2));
    for(const drop of drops){
      const prevX = drop.x;
      const prevY = drop.y;
      const nextX = prevX + drop.vx * step;
      const nextY = prevY + drop.vy * step;
      const thickness = drop.thickness ?? baseThickness;
      const impact = resolveRainDropTerrainImpact(
        world,
        prevX,
        prevY,
        nextX,
        nextY,
        thickness
      );
      let resolvedImpact = impact;
      if(!resolvedImpact){
        resolvedImpact = resolveRainDropFluidImpact(world, prevX, prevY, nextX, nextY, thickness);
      }
      if(resolvedImpact){
        if(splashes.length < maxSplashes){
          splashes.push({
            x: resolvedImpact.x,
            y: resolvedImpact.y,
            life: 0,
            maxLife: splashDuration,
            radius: splashRadius * (0.75 + Math.random() * 0.45),
            thickness: splashThickness,
            alpha: drop.alpha ?? dropAlpha
          });
        }
        continue;
      }
      if(nextY >= bottom){
        if(typeof terrainSolidInBox === 'function'){
          const margin = Math.max(2, (drop.thickness ?? baseThickness) * 2.2);
          const blockHit = terrainSolidInBox(
            world,
            nextX - margin,
            nextX + margin,
            bottom - margin,
            bottom + margin,
            { ignoreSand: true }
          );
          if(blockHit && splashes.length < maxSplashes){
            splashes.push({
              x: nextX,
              y: bottom,
              life: 0,
              maxLife: splashDuration,
              radius: splashRadius * (0.75 + Math.random() * 0.45),
              thickness: splashThickness,
              alpha: drop.alpha ?? dropAlpha
            });
          }
        }
        continue;
      }
      drop.x = nextX;
      drop.y = nextY;
      if(drop.x < left - width * 0.2 || drop.x > right + width * 0.2) continue;
      survivors.push(drop);
    }
    state.drops = survivors;
    const nextSplashes = [];
    for(const splash of splashes){
      splash.life = (splash.life || 0) + step;
      if(splash.life < splash.maxLife){
        nextSplashes.push(splash);
      }
    }
    state.splashes = nextSplashes;
    const minInterval = Math.max(2, Number(prop.thunderIntervalMin) || 6.5);
    const maxInterval = Math.max(minInterval + 0.5, Number(prop.thunderIntervalMax) || 12);
    if(state.thunderTimer === null || state.thunderTimer === undefined){
      state.thunderTimer = randomRange(minInterval, maxInterval);
    }else{
      state.thunderTimer -= step;
    }
    if(state.flashStages && state.flashStages.length){
      const stage = state.flashStages[0];
      stage.duration -= step;
      state.flash = clamp(stage.intensity, 0, 2);
      if(stage.duration <= 0){
        state.flashStages.shift();
      }
    }else if(state.flash){
      state.flash = Math.max(0, state.flash - step * 1.5);
    }
    if(state.flashStages && !state.flashStages.length){
      state.flashStages = null;
    }
    if(state.thunderTimer !== null && state.thunderTimer <= 0){
      state.thunderTimer = randomRange(minInterval, maxInterval);
      const flashIntensity = clamp(Number(prop.flashIntensity) || 1, 0, 2);
      state.flashStages = [
        { intensity: Math.min(1, 0.95 * flashIntensity), duration: 0.14 },
        { intensity: 0, duration: 0.07 },
        { intensity: Math.min(1, 0.68 * flashIntensity), duration: 0.18 },
        { intensity: Math.min(1, 0.28 * flashIntensity), duration: 0.24 },
        { intensity: 0, duration: 0.22 }
      ];
    }
    const flashAmount = clamp(state.flash || 0, 0, 2);
    const flashAlpha = clamp(
      (prop.flashAlpha !== undefined ? prop.flashAlpha : 0.9) * flashAmount,
      0,
      1.2
    );
    if(flashAlpha > flashAlphaMax){
      flashAlphaMax = flashAlpha;
      flashColorMax = prop.flashColor || 'rgba(238, 242, 255, 0.85)';
    }
  }
  if(world.levelState){
    if(flashAlphaMax > 0){
      world.levelState.rainFlash = {
        alpha: Math.min(flashAlphaMax, 1),
        color: flashColorMax
      };
    }else if(world.levelState.rainFlash){
      world.levelState.rainFlash = null;
    }
  }
}

function resolveRainDropTerrainImpact(world, prevX, prevY, nextX, nextY, thickness){
  if(!world || typeof terrainSolidInBox !== 'function') return null;
  const dx = nextX - prevX;
  const dy = nextY - prevY;
  const distance = Math.hypot(dx, dy);
  if(distance <= 0){
    return terrainSolidInBoxSample(world, nextX, nextY, thickness);
  }
  const gridSize = Math.max(4, world?.terrainCells?.tileSize ? world.terrainCells.tileSize * 0.35 : 12);
  const steps = Math.max(1, Math.ceil(distance / gridSize));
  for(let i=1;i<=steps;i++){
    const t = i / steps;
    const sampleX = prevX + dx * t;
    const sampleY = prevY + dy * t;
    const impact = terrainSolidInBoxSample(world, sampleX, sampleY, thickness);
    if(impact) return impact;
  }
  return null;
}

function resolveRainDropFluidImpact(world, prevX, prevY, nextX, nextY, thickness){
  if(!world) return null;
  const fluids = [];
  if(world.water && typeof waterOccupiesBox === 'function'){
    fluids.push({
      field: world.water,
      occupies: (left, right, top, bottom)=>waterOccupiesBox(world, left, right, top, bottom)
    });
  }
  if(world.lava && typeof lavaOccupiesBox === 'function'){
    fluids.push({
      field: world.lava,
      occupies: (left, right, top, bottom)=>lavaOccupiesBox(world, left, right, top, bottom)
    });
  }
  if(!fluids.length) return null;
  const dx = nextX - prevX;
  const dy = nextY - prevY;
  const distance = Math.hypot(dx, dy);
  const smallestCell = fluids.reduce((min, fluid)=>{
    const size = Math.max(2, fluid?.field?.cellSize || 6);
    return size < min ? size : min;
  }, Infinity);
  const stepSize = Number.isFinite(smallestCell) ? Math.max(3, smallestCell * 0.6) : 6;
  const steps = Math.max(1, Math.ceil(distance / stepSize));
  const radius = Math.max(1.5, (Number(thickness) || 0.6) * 1.1);
  for(let i=1;i<=steps;i++){
    const t = steps === 1 ? 1 : (i / steps);
    const sampleX = prevX + dx * t;
    const sampleY = prevY + dy * t;
    for(const fluid of fluids){
      if(!fluid || typeof fluid.occupies !== 'function') continue;
      if(!fluid.occupies(sampleX - radius, sampleX + radius, sampleY - radius, sampleY + radius)) continue;
      return {
        x: sampleX,
        y: rainFieldFluidSurface(fluid.field, sampleX, sampleY)
      };
    }
  }
  return null;
}

function rainFieldFluidSurface(field, sampleX, fallbackY){
  if(!field) return fallbackY;
  let surfaceY = fallbackY;
  if(Array.isArray(field.blockRects) && field.blockRects.length && typeof waterBlockSurfaceAt === 'function'){
    const blockSurface = waterBlockSurfaceAt(field.blockRects, sampleX);
    if(Number.isFinite(blockSurface)) surfaceY = blockSurface;
  }
  if(typeof waterColumnForX === 'function' && Array.isArray(field.heights)){
    const col = waterColumnForX(field, sampleX);
    if(col >= 0 && col < field.heights.length){
      const height = field.heights[col];
      if(Number.isFinite(height)) surfaceY = height;
    }
  }
  const cellSize = Math.max(2, field.cellSize || 6);
  return surfaceY + Math.max(0.6, Math.min(cellSize * 0.25, 4));
}

function terrainSolidInBoxSample(world, x, y, thickness){
  if(typeof terrainSolidInBox !== 'function') return null;
  const radius = Math.max(1.5, (Number(thickness) || 0.6) * 1.1);
  const margin = Math.max(1, radius);
  const options = { ignoreSand: true };
  if(!terrainSolidInBox(world, x - margin, x + margin, y - margin, y + margin, options)) return null;
  let top = y;
  const ascent = Math.max(0.75, margin * 0.6);
  for(let i=0;i<6;i++){
    const testY = top - ascent;
    if(!terrainSolidInBox(world, x - margin, x + margin, testY - margin, testY + margin, options)){
      top = testY + ascent * 0.5;
      break;
    }
    top = testY;
  }
  return { x, y: top };
}

function spawnFireflyJarShards(world, prop){
  if(!world) return;
  if(!world.particles) world.particles = [];
  const metrics = getFireflyJarMetrics(prop);
  const width = metrics.width;
  const height = metrics.height;
  const baseY = metrics.baseY;
  const cx = metrics.originX;
  const top = metrics.top;
  const count = Math.max(10, Math.round(rand(14, 22)));
  for(let i=0;i<count;i++){
    const shardColor = typeof choice === 'function'
      ? choice(['rgba(200,230,255,0.85)','rgba(170,210,255,0.75)','rgba(210,240,255,0.9)'])
      : 'rgba(200,230,255,0.85)';
    const shard = {
      type: 'shard',
      style: 'shard',
      x: cx + rand(-width * 0.45, width * 0.45),
      y: top + rand(height * 0.2, height * 0.95),
      vx: rand(-260, 260),
      vy: rand(-520, -220),
      rotation: rand(0, TAU),
      spin: rand(-6, 6),
      width: rand(2.2, 4.4),
      height: rand(2, 3.6),
      life: 0,
      maxLife: rand(520, 760),
      alpha: 1,
      color: shardColor
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(shard, 'glassShard');
    world.particles.push(shard);
  }
  const glowCount = Math.max(6, Math.round(count * 0.35));
  for(let i=0;i<glowCount;i++){
    const glow = {
      type: 'ember',
      style: 'ember',
      x: cx + rand(-width * 0.3, width * 0.3),
      y: top + rand(0, height * 0.4),
      vx: rand(-120, 120),
      vy: rand(-260, -80),
      width: rand(3, 6),
      height: rand(3, 6),
      life: 0,
      maxLife: rand(420, 620),
      alpha: 1,
      color: 'rgba(255, 238, 170, 0.9)'
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(glow, 'ember');
    world.particles.push(glow);
  }
  const limit = 260;
  if(world.particles.length > limit){
    world.particles.splice(0, world.particles.length - limit);
  }
}

function shatterFireflyJar(world, prop){
  if(!prop) return;
  const state = ensureFireflyJarState(prop);
  if(prop.persistOnBreak !== true) prop.persistOnBreak = true;
  releaseFireflyJarFireflies(world, prop, state);
}

function shouldDecorFloat(prop){
  if(!prop || prop.broken || prop.remove) return false;
  if(prop.floats === false) return false;
  if(prop.floats === true) return true;
  if(prop.floatDepth !== undefined) return true;
  if(typeof prop.material === 'string' && prop.material.toLowerCase() === 'wood' && prop.breakable){
    return true;
  }
  return false;
}

function resolveDecorBaseY(prop){
  if(prop.baseY !== undefined) return prop.baseY;
  if(prop.y !== undefined) return prop.y;
  return 0;
}

function setDecorBaseY(prop, value){
  if(prop.baseY !== undefined){
    prop.baseY = value;
  }else{
    prop.y = value;
  }
}

function sampleFluidSurface(field, x, width=0){
  if(!field || !Array.isArray(field.heights)) return null;
  const positions = [x];
  if(width > 0){
    const offset = Math.max(field.cellSize || 1, width * 0.35);
    positions.push(x - offset, x + offset);
  }
  const samples = [];
  for(const px of positions){
    const col = typeof waterColumnForX === 'function' ? waterColumnForX(field, px) : -1;
    if(col < 0 || col >= field.heights.length) continue;
    const height = field.heights[col];
    if(height === null || height === undefined) continue;
    samples.push(height);
  }
  if(!samples.length) return null;
  const total = samples.reduce((sum, value)=>sum + value, 0);
  return total / samples.length;
}

function updateFloatingDecor(world, dt){
  if(!world || dt <= 0) return;
  const decor = Array.isArray(world.decor) ? world.decor : [];
  if(!decor.length) return;
  const water = world.water;
  for(const prop of decor){
    if(!shouldDecorFloat(prop)) continue;
    const baseY = resolveDecorBaseY(prop);
    if(!prop.floatState){
      prop.floatState = {
        restY: baseY,
        phase: Math.random() * TAU,
        speed: 0.6 + Math.random() * 0.6
      };
    }
    const state = prop.floatState;
    const restY = state.restY !== undefined ? state.restY : baseY;
    const speed = prop.bobSpeed !== undefined ? prop.bobSpeed : state.speed || 0.8;
    state.phase = (state.phase || 0) + dt * speed;
    const depth = prop.floatDepth !== undefined ? prop.floatDepth : Math.max(6, (prop.height || 24) * 0.25);
    const amplitude = prop.bobAmplitude !== undefined ? prop.bobAmplitude : Math.max(2, depth * 0.4);
    const surface = sampleFluidSurface(water, prop.x ?? 0, prop.width ?? 0);
    const tolerance = prop.floatTolerance !== undefined ? prop.floatTolerance : Math.max(8, (prop.height || 24) * 0.35);
    if(surface !== null && restY >= surface - tolerance){
      const bob = Math.sin(state.phase) * amplitude;
      const target = surface + depth + bob;
      const lerp = clamp(1 - Math.exp(-dt * (prop.floatLerpSpeed || 6)), 0, 1);
      const next = baseY + (target - baseY) * lerp;
      setDecorBaseY(prop, next);
      state.active = true;
    }else{
      const dryBob = amplitude * 0.2;
      const bob = Math.sin(state.phase) * dryBob;
      const target = restY + bob;
      const lerp = clamp(1 - Math.exp(-dt * 3), 0, 1);
      const next = baseY + (target - baseY) * lerp;
      setDecorBaseY(prop, next);
      state.active = false;
    }
  }
}

function stepPhysics(world, dt){
  if(!world || !Array.isArray(world.points) || !world.points.length) return;
  const clampedDt = Math.max(0, dt || 0);
  const baseGravity = Number.isFinite(GRAVITY) ? GRAVITY : 2600;
  const headLiftGravity = Number.isFinite(world?.headLiftGravity)
    ? Math.max(0, world.headLiftGravity)
    : 0;
  const maxHeadRiseSpeed = Number.isFinite(world?.headMaxRiseSpeed)
    ? Math.max(0, world.headMaxRiseSpeed)
    : 900;
  const headRestOffset = ((RIG_CONFIG?.offsets?.head?.y ?? 0) - (RIG_CONFIG?.offsets?.pelvis?.y ?? 0)) || 0;
  const headMinOffset = Number.isFinite(world?.headMinOffset)
    ? world.headMinOffset
    : headRestOffset - 4 * STICK_SCALE;
  const constraints = Array.isArray(world.constraints) ? world.constraints : [];
  const iterationsRaw = world.constraintIterations ?? 2;
  const constraintIterations = Number.isFinite(iterationsRaw) ? Math.max(1, Math.round(iterationsRaw)) : 2;
  const substepsRaw = world.physicsSubsteps;
  let substeps = Number.isFinite(substepsRaw) ? Math.max(1, Math.round(substepsRaw)) : 1;
  const maxStepRaw = world.maxPhysicsStep;
  const maxStep = Number.isFinite(maxStepRaw) && maxStepRaw > 0 ? maxStepRaw : DEFAULT_MAX_PHYSICS_STEP;
  if(maxStep > 0 && clampedDt > 0){
    const adaptive = Math.ceil(clampedDt / maxStep);
    if(adaptive > substeps) substeps = adaptive;
  }
  if(clampedDt <= 0){
    for(const p of world.points){
      if(!p) continue;
      p.beginStep();
      p.finishStep(0);
      p.grounded = false;
      p.preGroundContact = false;
    }
    return;
  }
  const stepDt = clampedDt / substeps;
  for(let step = 0; step < substeps; step++){
    for(const p of world.points){
      if(!p) continue;
      p.beginStep();
      p.platformId = null;
    }
    for(const p of world.points){
      if(!p) continue;
      const mass = Number.isFinite(p.mass) ? p.mass : 1;
      const rigPart = p.rigPart || null;
      if(rigPart === 'head'){
        if(headLiftGravity > 0 && mass !== 0){
          p.addForce(0, -headLiftGravity * mass);
        }
      }else{
        const gravityScale = p.gravityScale !== undefined ? p.gravityScale : 1;
        if(gravityScale !== 0 && mass !== 0){
          p.addForce(0, baseGravity * gravityScale * mass);
        }
      }
      p.integrate(stepDt);
      if(rigPart === 'head'){
        if(maxHeadRiseSpeed > 0 && p.vy < -maxHeadRiseSpeed){
          p.vy = -maxHeadRiseSpeed;
          p.y = p.prevY + p.vy * stepDt;
        }
        p._headLiftVy = p.vy;
      }
    }
    if(constraints.length && constraintIterations > 0){
      for(let i = 0; i < constraintIterations; i++){
        for(const constraint of constraints){
          if(constraint && typeof constraint.satisfy === 'function'){
            constraint.satisfy();
          }
        }
      }
    }
    for(const p of world.points){
      if(!p) continue;
      ceilingCollision(p, world, stepDt);
      if(p.rigPart === 'head'){
        const ownerPelvis = p.owner?.pointsByName?.pelvis;
        if(ownerPelvis){
          const limitY = ownerPelvis.y + headMinOffset;
          if(p.y > limitY){
            p.y = limitY;
            p.prevY = limitY;
            if(p.vy > 0) p.vy = 0;
          }
        }
        p.grounded = false;
        p.preGroundContact = false;
        continue;
      }
      groundCollision(p, world, stepDt);
    }
    for(const p of world.points){
      if(!p) continue;
      p.finishStep(stepDt);
      if(p.rigPart === 'head'){
        p._headLiftVy = p.vy;
        p.grounded = false;
        p.preGroundContact = false;
      }
    }
  }
  if(Array.isArray(world.sticks)){
    for(const stick of world.sticks){
      if(stick && typeof stick.applyPosture === 'function'){
        stick.applyPosture();
      }
    }
  }
}

function updateInteractiveObjects(world, dt){
  updateCrumbleWallState(world, dt);
  updateHazards(world, dt);
  updateToggleBlocks(world, dt);
}

function updateCrumbleWallState(world, dt){
  const walls = Array.isArray(world.breakables) ? world.breakables : [];
  if(!walls.length) return;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const wall of walls){
    if(!wall) continue;
    if(activeScreenIndex !== null && wall.screenIndex !== undefined && wall.screenIndex !== activeScreenIndex) continue;
    if(wall.shake){
      wall.shake = Math.max(0, wall.shake - dt * 4.2);
    }
    if(wall.crumbleTimer){
      wall.crumbleTimer = Math.max(0, wall.crumbleTimer - dt);
    }
  }
  world.breakables = walls.filter(wall=>wall && !wall.remove);
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
}

function updateHazards(world, dt){
  const hazards = Array.isArray(world.hazards) ? world.hazards : [];
  if(!hazards.length) return;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  let prune = false;
  for(const hazard of hazards){
    if(!hazard) continue;
    if(activeScreenIndex !== null && hazard.screenIndex !== undefined && hazard.screenIndex !== activeScreenIndex) continue;
    switch(hazard.type){
      case 'spikes':
        applySpikeHazard(hazard, sticks);
        break;
      case 'windLift':
        applyWindLiftHazard(hazard, sticks, dt);
        break;
      case 'steamVent':
        updateSteamVentHazard(hazard, sticks, dt);
        break;
      case 'chronoField':
        updateChronoFieldHazard(hazard, sticks, dt);
        break;
      case 'chronoFlySwarm':
        updateChronoFlySwarmHazard(world, hazard, sticks, dt);
        break;
      case 'auricBeacon':
        updateAuricBeaconHazard(hazard, sticks, dt);
        break;
    }
    if(hazard && hazard.remove) prune = true;
  }
  if(prune){
    world.hazards = hazards.filter(entry=>entry && !entry.remove);
  }
}

function applySpikeHazard(hazard, sticks){
  if(!hazard || hazard.type !== 'spikes') return;
  const left = hazard.x ?? 0;
  const top = hazard.y ?? 0;
  const width = hazard.w ?? 60;
  const height = hazard.h ?? 28;
  const right = left + width;
  const bottom = top + height;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    const kneeL = stick.pointsByName?.kneeL;
    const kneeR = stick.pointsByName?.kneeR;
    const points = [pelvis, kneeL, kneeR].filter(Boolean);
    let contact = false;
    for(const point of points){
      if(point.x >= left && point.x <= right && point.y >= top && point.y <= bottom){
        contact = true;
        break;
      }
    }
    if(!contact) continue;
    const pushDir = ((pelvis?.x ?? (left + width / 2)) < left + width / 2) ? -1 : 1;
    const knock = hazard.knock ?? 0.8;
    const damage = hazard.damage ?? 22;
    stick.takeDamage(damage, pushDir * knock, 0.6, null, {
      element: hazard.element || 'physical'
    });
    if(pelvis){
      pelvis.addForce(pushDir * 4200, -1800);
    }
  }
}

function applyWindLiftHazard(hazard, sticks, dt){
  if(!hazard || hazard.type !== 'windLift') return;
  const left = hazard.x ?? 0;
  const top = hazard.y ?? 0;
  const width = hazard.w ?? 60;
  const height = hazard.h ?? 140;
  const right = left + width;
  const bottom = top + height;
  const forceX = hazard.forceX ?? 0;
  const forceY = hazard.forceY ?? -2400;
  let contacted = false;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    const kneeL = stick.pointsByName?.kneeL;
    const kneeR = stick.pointsByName?.kneeR;
    const points = [pelvis, kneeL, kneeR].filter(Boolean);
    let inside = false;
    for(const point of points){
      if(point.x >= left && point.x <= right && point.y >= top && point.y <= bottom){
        inside = true;
        break;
      }
    }
    if(!inside) continue;
    contacted = true;
    if(pelvis){
      pelvis.addForce(forceX * 1.2, forceY);
    }
    for(const point of points){
      point.addForce(forceX * 0.6, forceY * 0.6);
    }
  }
  const pulseTarget = contacted ? 1 : 0;
  const rate = contacted ? 3.4 : 2.1;
  const smoothing = dt > 0 ? Math.min(1, rate * dt) : 1;
  const current = hazard.pulse ?? 0;
  hazard.pulse = current + (pulseTarget - current) * smoothing;
  if(!Number.isFinite(hazard.pulse)) hazard.pulse = pulseTarget;
  if(contacted) hazard.lastContact = nowMs();
}

function updateSteamVentHazard(hazard, sticks, dt){
  if(!hazard || hazard.type !== 'steamVent') return;
  const cycle = Math.max(0, hazard.cycle ?? 0);
  if(!Number.isFinite(hazard.time)) hazard.time = 0;
  hazard.time += dt;
  if(cycle > 0){
    while(hazard.time >= cycle) hazard.time -= cycle;
  }else{
    hazard.time = 0;
  }
  const activeDuration = Math.min(cycle || hazard.activeDuration || 0, hazard.activeDuration ?? cycle);
  const wasActive = !!hazard.active;
  const active = cycle <= 0 ? true : hazard.time <= activeDuration;
  hazard.active = active;
  const pulseTarget = active ? 1 : 0;
  const smoothing = dt > 0 ? Math.min(1, 6 * dt) : 1;
  const current = hazard.pulse ?? 0;
  hazard.pulse = current + (pulseTarget - current) * smoothing;
  if(!Number.isFinite(hazard.pulse)) hazard.pulse = pulseTarget;
  if(!active) return;
  const left = hazard.x ?? 0;
  const top = hazard.y ?? 0;
  const width = hazard.w ?? 60;
  const height = hazard.h ?? 120;
  const right = left + width;
  const bottom = top + height;
  const damage = Math.max(0, hazard.damage ?? 16);
  const pushX = hazard.pushX ?? 0;
  const pushY = hazard.pushY ?? -2400;
  const knock = hazard.knock ?? 1.2;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : null;
    const kneeL = stick.pointsByName?.kneeL;
    const kneeR = stick.pointsByName?.kneeR;
    const points = [pelvis, kneeL, kneeR].filter(Boolean);
    let inside = false;
    for(const point of points){
      if(point.x >= left && point.x <= right && point.y >= top && point.y <= bottom){
        inside = true;
        break;
      }
    }
    if(!inside) continue;
    if(pelvis){
      pelvis.addForce(pushX * 0.8, pushY);
    }
    stick.takeDamage(damage * dt, Math.sign(pushX || 0) * knock, pushY < 0 ? -knock * 0.5 : knock * 0.5, null, {
      element: hazard.element || 'physical'
    });
  }
}

function updateChronoFieldHazard(hazard, sticks, dt){
  if(!hazard || hazard.type !== 'chronoField') return;
  const left = hazard.x ?? 0;
  const top = hazard.y ?? 0;
  const width = hazard.w ?? 80;
  const height = hazard.h ?? 120;
  const right = left + width;
  const bottom = top + height;
  const slow = clamp(hazard.slow ?? 0.4, 0.05, 1);
  const drag = Math.max(0, hazard.drag ?? 6);
  const floatForce = hazard.floatForce ?? -640;
  hazard.phase = (hazard.phase ?? 0) + dt;
  let touched = false;
  const damping = dt > 0 ? Math.exp(-drag * dt) : 1;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const points = Array.isArray(stick.points) ? stick.points : [];
    let inside = false;
    for(const point of points){
      if(point.x >= left && point.x <= right && point.y >= top && point.y <= bottom){
        inside = true;
        point.vx *= damping;
        point.vy *= damping * slow;
        if(floatForce) point.addForce(0, floatForce);
      }
    }
    if(inside){
      touched = true;
    }
  }
  const pulseTarget = touched ? 1 : 0;
  const rate = touched ? 4 : 1.6;
  const smoothing = dt > 0 ? Math.min(1, rate * dt) : 1;
  const current = hazard.pulse ?? 0;
  hazard.pulse = current + (pulseTarget - current) * smoothing;
  if(!Number.isFinite(hazard.pulse)) hazard.pulse = pulseTarget;
}

function updateChronoFlySwarmHazard(world, hazard, sticks, dt){
  if(!hazard || hazard.type !== 'chronoFlySwarm') return;
  const state = hazard.swarmState;
  if(!state){
    hazard.remove = true;
    return;
  }
  const now = nowMs();
  if(!state.cooldowns) state.cooldowns = new Map();
  for(const [target, until] of state.cooldowns.entries()){
    if(!target || !Number.isFinite(until) || until <= now){
      state.cooldowns.delete(target);
    }
  }
  const centerX = state.centerX ?? state.originX ?? hazard.centerX ?? ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = state.centerY ?? state.originY ?? hazard.centerY ?? ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5);
  const radius = Math.max(32, state.swarmRadius ?? hazard.radius ?? 120);
  hazard.centerX = centerX;
  hazard.centerY = centerY;
  hazard.radius = radius;
  const contactRadius = Math.max(24, state.contactRadius ?? radius);
  let contact = false;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    if(Math.hypot(center.x - centerX, center.y - centerY) > contactRadius) continue;
    contact = true;
    if(stick.resistsElement && stick.resistsElement('chronometric')) continue;
    if(state.cooldowns.has(stick)) continue;
    const applied = typeof stick.applyChronoStasis === 'function'
      ? stick.applyChronoStasis(state.freezeDurationMs ?? CHRONO_FLY_JAR_DEFAULT_FREEZE_MS, { source: hazard })
      : false;
    if(applied){
      state.cooldowns.set(stick, now + (state.contactCooldownMs ?? CHRONO_FLY_JAR_DEFAULT_COOLDOWN_MS));
    }
  }
  const pulseTarget = contact ? 1 : 0.25;
  const smoothing = dt > 0 ? Math.min(1, (contact ? 6 : 2.4) * dt) : 1;
  const current = Number.isFinite(hazard.pulse) ? hazard.pulse : 0;
  hazard.pulse = current + (pulseTarget - current) * smoothing;
  if(!Number.isFinite(hazard.pulse)) hazard.pulse = pulseTarget;
  state.recentContact = contact;
  if(state.finished || state.remainingLife === 0){
    hazard.remove = true;
  }
}

function updateAuricBeaconHazard(hazard, sticks, dt){
  if(!hazard || hazard.type !== 'auricBeacon') return;
  const cycle = Math.max(0, hazard.cycle ?? 0);
  if(!Number.isFinite(hazard.time)) hazard.time = 0;
  hazard.time += dt;
  if(cycle > 0){
    while(hazard.time >= cycle) hazard.time -= cycle;
  }else{
    hazard.time = 0;
  }
  const pulseDuration = Math.min(cycle || hazard.pulseDuration || 0, hazard.pulseDuration ?? cycle);
  const wasActive = !!hazard.active;
  const active = cycle <= 0 ? true : hazard.time <= pulseDuration;
  hazard.active = active;
  if(active && !wasActive){
    triggerAuricBeaconPulse(hazard, sticks);
  }
  const pulseTarget = active ? 1 : 0;
  const rate = active ? 6.4 : 2.8;
  const smoothing = dt > 0 ? Math.min(1, rate * dt) : 1;
  const current = hazard.pulseStrength ?? 0;
  hazard.pulseStrength = current + (pulseTarget - current) * smoothing;
  if(!Number.isFinite(hazard.pulseStrength)) hazard.pulseStrength = pulseTarget;
  if(active){
    applyAuricBeaconForces(hazard, sticks);
  }
}

function ensureChronosphereState(world){
  if(!world) return null;
  let state = world._chronosphereState;
  if(!state){
    state = {
      spheres: [],
      insideAny: false,
      frozenEnemies: new Set(),
      frozenPointRestores: [],
      playerChronoFrozen: false
    };
    world._chronosphereState = state;
  }
  return state;
}

function activeChronospheres(world){
  const hazards = Array.isArray(world?.chronospheres) ? world.chronospheres : [];
  const activeScreenIndex = Number.isInteger(world?.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  if(activeScreenIndex === null) return hazards.filter(Boolean);
  return hazards.filter(hazard=>hazard && (hazard.screenIndex === undefined || hazard.screenIndex === activeScreenIndex));
}

function updateChronosphereState(world, dt){
  if(!world) return;
  const state = ensureChronosphereState(world);
  const spheres = activeChronospheres(world);
  state.spheres = spheres;
  state.insideAny = false;
  state.frozenEnemies = new Set();
  state.frozenPointRestores = [];
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const players = sticks.filter(stick=>stick && !stick.isEnemy && !stick.dead);
  const frozenPlayerActive = players.some(player=>{
    if(!player) return false;
    if(typeof player.isChronoFrozen === 'function') return player.isChronoFrozen();
    return !!player.chronoFrozen;
  });
  state.playerChronoFrozen = frozenPlayerActive;
  if(spheres.length === 0){
    if(sticks.length){
      for(const stick of sticks){
        if(stick && stick.enemyKind === 'timeWraith') stick.timeWraithAwake = frozenPlayerActive;
      }
    }
    return;
  }
  const selected = world.selected;
  const playerCenter = selected && typeof selected.center === 'function' ? selected.center() : null;
  for(const sphere of spheres){
    if(!sphere) continue;
    const radius = Math.max(24, Number(sphere.radius) || 300);
    sphere.radius = radius;
    const centerX = Number.isFinite(sphere.centerX)
      ? sphere.centerX
      : ((sphere.x ?? 0) + (sphere.w ?? 0) * 0.5);
    const centerY = Number.isFinite(sphere.centerY)
      ? sphere.centerY
      : ((sphere.y ?? 0) + (sphere.h ?? 0) * 0.5);
    sphere.centerX = centerX;
    sphere.centerY = centerY;
    const floatPhase = (sphere.floatPhase ?? 0) + (dt > 0 ? dt * 0.65 : 0);
    sphere.floatPhase = floatPhase;
    const floatAmplitude = Number.isFinite(sphere.floatAmplitude) ? sphere.floatAmplitude : 0;
    sphere.renderY = centerY + Math.sin(floatPhase) * floatAmplitude;
    const phase = (sphere.phase ?? 0) + (dt > 0 ? dt * 0.45 : 0);
    sphere.phase = phase;
    const targetPulse = playerCenter && distance(playerCenter.x, playerCenter.y, centerX, sphere.renderY) <= radius ? 1 : 0;
    if(targetPulse > 0) state.insideAny = true;
    const currentPulse = Number.isFinite(sphere.pulse) ? sphere.pulse : 0;
    const smoothing = dt > 0 ? Math.min(1, (targetPulse > 0 ? 4.2 : 2) * dt) : 1;
    sphere.pulse = currentPulse + (targetPulse - currentPulse) * smoothing;
    if(!Number.isFinite(sphere.pulse)) sphere.pulse = targetPulse;
    sphere.playerInside = targetPulse > 0;
  }
  const shouldAwaken = state.insideAny || frozenPlayerActive;
  if(sticks.length){
    for(const stick of sticks){
      if(stick && stick.enemyKind === 'timeWraith') stick.timeWraithAwake = shouldAwaken;
    }
  }
  if(!state.insideAny){
    return;
  }
  const frozen = new Set();
  if(sticks.length){
    for(const stick of sticks){
      if(!stick || !stick.isEnemy || stick.dead) continue;
      if(stick.enemyKind === 'timeWraith') continue;
      if(stick.freezeExempt) continue;
      const center = typeof stick.center === 'function' ? stick.center() : null;
      if(!center) continue;
      let inside = false;
      for(const sphere of spheres){
        if(!sphere) continue;
        const dx = center.x - sphere.centerX;
        const dy = center.y - sphere.renderY;
        if(Math.hypot(dx, dy) <= sphere.radius){
          inside = true;
          break;
        }
      }
      if(!inside){
        frozen.add(stick);
      }
    }
  }
  state.frozenEnemies = frozen;
}

function applyChronosphereFreeze(world){
  const state = world?._chronosphereState;
  if(!state || !state.insideAny) return;
  const frozen = state.frozenEnemies;
  if(!frozen || frozen.size === 0) return;
  const restores = [];
  for(const stick of frozen){
    if(!stick) continue;
    const points = Array.isArray(stick.points) ? stick.points : [];
    for(const point of points){
      if(!point) continue;
      restores.push({ point, dragged: point.dragged });
      point.dragged = true;
      point.vx = 0;
      point.vy = 0;
      point.ax = 0;
      point.ay = 0;
    }
  }
  state.frozenPointRestores = restores;
}

function restoreChronosphereFreeze(world){
  const state = world?._chronosphereState;
  const restores = state?.frozenPointRestores;
  if(!Array.isArray(restores) || restores.length === 0) return;
  for(const entry of restores){
    if(!entry || !entry.point) continue;
    entry.point.dragged = !!entry.dragged;
  }
  state.frozenPointRestores = [];
}

function invertCircleArea(ctx, x, y, radius){
  if(!ctx || !Number.isFinite(x) || !Number.isFinite(y) || !(radius > 0)) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - radius - 2, y - radius - 2, radius * 2 + 4, radius * 2 + 4);
  ctx.restore();
}

function applyChronosphereVisualFilter(world, ctx){
  if(!world || !ctx) return;
  const state = world._chronosphereState;
  const spheres = Array.isArray(state?.spheres) && state.spheres.length ? state.spheres : activeChronospheres(world);
  if(!Array.isArray(spheres) || spheres.length === 0) return;
  const camera = ensureCamera(world);
  const offsetX = Math.round(world.width * 0.5 - camera.x);
  const offsetY = Math.round(world.height * 0.5 - camera.y);
  const insideAny = !!(state && state.insideAny);
  if(insideAny){
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();
  }
  for(const sphere of spheres){
    if(!sphere) continue;
    if(!insideAny && sphere.invertIdle === false) continue;
    const radius = Math.max(24, Number(sphere.radius) || 300);
    const x = (Number.isFinite(sphere.centerX) ? sphere.centerX : 0) + offsetX;
    const yBase = Number.isFinite(sphere.renderY) ? sphere.renderY : (Number.isFinite(sphere.centerY) ? sphere.centerY : 0);
    const y = yBase + offsetY;
    invertCircleArea(ctx, x, y, radius);
  }
}

function triggerAuricBeaconPulse(hazard, sticks){
  const centerX = hazard.centerX ?? ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = hazard.centerY ?? ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5);
  const radius = Math.max(10, hazard.radius ?? Math.max(hazard.w ?? 0, hazard.h ?? 0));
  const damage = hazard.damage ?? 36;
  const knock = hazard.knock ?? 1.4;
  const force = hazard.force ?? 2800;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : stick.pointsByName?.pelvis;
    if(!pelvis) continue;
    const dx = pelvis.x - centerX;
    const dy = pelvis.y - centerY;
    const dist = Math.hypot(dx, dy) || 1;
    if(dist > radius) continue;
    const dirX = dx / dist;
    const dirY = dy / dist;
    stick.takeDamage(damage, dirX * knock, dirY * knock, null, {
      element: hazard.element || 'light'
    });
    pelvis.addForce(dirX * force, dirY * force);
  }
  hazard.lastPulse = nowMs();
}

function applyAuricBeaconForces(hazard, sticks){
  const centerX = hazard.centerX ?? ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = hazard.centerY ?? ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5);
  const radius = Math.max(10, hazard.radius ?? Math.max(hazard.w ?? 0, hazard.h ?? 0));
  const force = hazard.force ?? 2800;
  for(const stick of sticks){
    if(!stick || stick.dead) continue;
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : stick.pointsByName?.pelvis;
    if(!pelvis) continue;
    const dx = pelvis.x - centerX;
    const dy = pelvis.y - centerY;
    const dist = Math.hypot(dx, dy) || 1;
    if(dist > radius) continue;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const falloff = 1 - clamp(dist / radius, 0, 1);
    pelvis.addForce(dirX * force * falloff, dirY * force * falloff);
  }
}

function updateToggleBlocks(world, dt){
  const blocks = Array.isArray(world.toggleBlocks) ? world.toggleBlocks : [];
  if(!blocks.length) return;
  const smoothing = dt > 0 ? 1 - Math.exp(-6 * dt) : 1;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const block of blocks){
    if(!block) continue;
    if(activeScreenIndex !== null && block.screenIndex !== undefined && block.screenIndex !== activeScreenIndex) continue;
    const target = block.active ? 1 : 0;
    const current = block.visibility !== undefined ? block.visibility : target;
    block.visibility = current + (target - current) * smoothing;
    if(!Number.isFinite(block.visibility)) block.visibility = target;
  }
}

function updateDoorState(world){
  const door = world?.door || null;
  if(world.state!=='level' || !door || door.hidden){
    if(door) door.open = false;
    return;
  }
  if(door.locked){
    door.open = false;
    return;
  }
  const aliveEnemies = world.sticks.filter(s=>s.isEnemy && !s.dead && !s.ignoreForDoor);
  const wasOpen = !!door.open;
  const shouldOpen = aliveEnemies.length===0;
  const audio = window.audioSystem;
  if(shouldOpen && !wasOpen && audio && typeof audio.playEffect === 'function'){
    audio.playEffect('exitDoorOpen');
  }
  door.open = shouldOpen;
}

function isStickNearDoor(stick, door, radius=DOOR_INTERACT_RADIUS){
  if(!stick || !door) return false;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return false;
  const closestX = clamp(center.x, door.x, door.x + door.w);
  const closestY = clamp(center.y, door.y, door.y + door.h);
  const dx = center.x - closestX;
  const dy = center.y - closestY;
  const dist = Math.hypot(dx, dy);
  return dist <= radius;
}

function findDoorInteraction(world, stick){
  if(!world || !stick) return null;
  const door = world.door;
  if(!door || door.hidden || door.locked || !door.open) return null;
  if(!isStickNearDoor(stick, door, DOOR_INTERACT_RADIUS)) return null;
  const anchorX = door.x + door.w * 0.5;
  const anchorY = Math.max(door.y - 28, 32);
  return { door, anchorX, anchorY };
}

function buildDoorInteractionPrompt(world, stick, info){
  if(!world || !stick || !info || !info.door) return null;
  const playerCenter = typeof stick.center === 'function' ? stick.center() : null;
  if(!playerCenter) return null;
  const palette = currentLevelPalette(world);
  const accent = palette.doorOpen || palette.accent || '#f2d18b';
  const phaseOffset = ((info.door.id || 'door').length * 137) % 1000;
  return {
    entryId: 'door',
    accent,
    object: { x: info.anchorX, y: info.anchorY },
    player: { x: playerCenter.x, y: playerCenter.y - 92 },
    phaseOffset
  };
}

function tryInteractWithDoor(world, stick){
  if(!world || world.state !== 'level') return false;
  if(stick?.isScoutDrone) return false;
  const door = world.focusedDoor || world.door;
  if(!door || door.hidden || door.locked || !door.open) return false;
  if(!isStickNearDoor(stick, door, DOOR_INTERACT_RADIUS)) return false;
  return enterDoor(world, stick);
}

function enterDoor(world, stick){
  if(!world || world.state !== 'level') return false;
  const state = world.levelState;
  if(!state) return false;
  const door = world.door;
  if(!door || door.hidden || door.locked || !door.open) return false;
  const player = stick || world.selected;
  if(!player || player.dead || player.isScoutDrone) return false;
  if(!isStickNearDoor(player, door, DOOR_INTERACT_RADIUS)) return false;
  if(state.isFinalScreen){
    completeLevel(world);
  }else{
    const snapshot = captureTeamSnapshot(world);
    advanceLevelScreen(world, snapshot);
  }
  return true;
}

function renderWorld(world, ctx){
  ctx.clearRect(0,0,world.width,world.height);
  if(world.state==='map'){
    renderWorldMap(world, ctx);
    drawGameCursor(world, ctx);
    renderHUD(world);
    return;
  }
  const stageFilter = resolveLevelRenderFilter(world);
  const filterCss = stageFilter?.css;
  const allowCanvasFilter = shouldUseCanvasFilter(world, stageFilter);
  let restoreFilter = null;
  let filterApplied = false;
  let fallbackOverlay = stageFilter?.overlay || null;
  if(allowCanvasFilter && filterCss && 'filter' in ctx){
    restoreFilter = ctx.filter;
    ctx.filter = filterCss;
    filterApplied = true;
    fallbackOverlay = null;
  }
  renderLevelBackdrop(world, ctx);
  applyRainThunderFlash(world, ctx);
  ctx.save();
  applyCameraTransform(world, ctx);
  drawStarFieldDecor(world, ctx);
  renderGround(world, ctx);
  drawInteractiveObjects(world, ctx);
  drawDecor(world, ctx);
  drawGrasshoppers(world, ctx);
  drawGrassFireflies(world, ctx);
  drawPhysicsBoxes(ctx, world);
  drawSoftBodies(ctx, world);
  drawParticles(world, ctx, 'default');
  renderDoor(world, ctx);
  drawItems(ctx, world);
  drawProjectiles(ctx, world);
  drawScoutDrone(world, ctx);
  if(typeof drawSummons === 'function') drawSummons(ctx, world);
  drawBowTrajectoryPreview(world, ctx);
  for(const st of world.sticks) st.draw(ctx);
  drawNpcDialogues(world, ctx);
  if(typeof drawSoulOrbs === 'function') drawSoulOrbs(ctx, world);
  drawForegroundDecor(world, ctx);
  drawSelectionRing(world, ctx);
  drawInteractionPrompt(world, ctx);
  renderDeveloperOverlay(world, ctx);
  drawParticles(world, ctx, 'overlay');
  ctx.restore();
  applyChronosphereVisualFilter(world, ctx);
  applyLevelDarknessOverlay(world, ctx);
  applyBlueBloomOverlay(world, ctx);
  drawBossHealthOverlay(world, ctx);
  renderScreenBanner(world, ctx);
  if(filterApplied && 'filter' in ctx){
    ctx.filter = restoreFilter || 'none';
    filterApplied = false;
  }
  if(!filterApplied && fallbackOverlay){
    applyRenderFilterOverlay(world, ctx, fallbackOverlay);
  }
  drawGameCursor(world, ctx);
  renderHUD(world);
  drawDefeatOverlay(world, ctx);
  refreshDeveloperPanel(world);
}

function updateNpcDialogues(world, dt){
  if(!world || !Array.isArray(world.npcEntities) || !world.npcEntities.length) return;
  const player = world.selected;
  const playerCenter = player && !player.dead && typeof player.center === 'function' ? player.center() : null;
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  for(const entry of world.npcEntities){
    if(!entry) continue;
    const stick = entry.stick;
    const dialog = entry.dialog;
    if(!stick || stick.dead || !dialog) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    const talkRadius = Number.isFinite(dialog.talkRadius) ? dialog.talkRadius : 150;
    let speaking = false;
    if(playerCenter && center){
      const dx = playerCenter.x - center.x;
      const dy = playerCenter.y - center.y;
      const dist = Math.hypot(dx, dy);
      if(dist <= talkRadius){
        speaking = true;
        stick.dir = dx >= 0 ? 1 : -1;
      }
    }
    const lines = Array.isArray(dialog.lines) ? dialog.lines : [];
    if(!lines.length){
      dialog.fade = Math.max(0, (dialog.fade || 0) - dt * 6);
      dialog.visible = '';
      continue;
    }
    if(speaking){
      if(!dialog.active){
        dialog.active = true;
        dialog.currentIndex = Number.isInteger(dialog.currentIndex) ? dialog.currentIndex : 0;
        if(dialog.currentIndex < 0 || dialog.currentIndex >= lines.length){
          dialog.currentIndex = 0;
        }
        dialog.target = lines[dialog.currentIndex] || '';
        dialog.charProgress = 0;
        dialog.charIndex = 0;
        dialog.visible = '';
        dialog.holdTimer = 0;
      }
      dialog.fade = Math.min(1, (dialog.fade || 0) + dt * 4);
      const target = dialog.target || '';
      const revealSpeed = Number.isFinite(dialog.revealSpeed) ? dialog.revealSpeed : 48;
      dialog.charProgress = Math.min(target.length, (dialog.charProgress || 0) + revealSpeed * dt);
      const newCount = Math.min(target.length, Math.floor(dialog.charProgress + 1e-6));
      if(newCount > (dialog.charIndex || 0)){
        const char = target[newCount - 1];
        if(char && !/\s/.test(char)){
          const cooldown = Number.isFinite(dialog.charSoundCooldown) ? dialog.charSoundCooldown : 35;
          if(!dialog.lastCharSound || now - dialog.lastCharSound >= cooldown){
            const audio = window.audioSystem;
            if(audio && typeof audio.playEffect === 'function'){
              audio.playEffect('npcBabble', {});
            }
            dialog.lastCharSound = now;
          }
        }
        dialog.charIndex = newCount;
        dialog.visible = target.slice(0, newCount);
      }
      if((dialog.charIndex || 0) >= target.length){
        dialog.visible = target;
        dialog.holdTimer = (dialog.holdTimer || 0) + dt;
        const holdDuration = Number.isFinite(dialog.holdDuration) ? dialog.holdDuration : 1.8;
        if(lines.length > 1 && dialog.holdTimer >= holdDuration){
          dialog.currentIndex = (dialog.currentIndex + 1) % lines.length;
          dialog.target = lines[dialog.currentIndex] || '';
          dialog.charIndex = 0;
          dialog.charProgress = 0;
          dialog.visible = '';
          dialog.holdTimer = 0;
        }
      }
    }else{
      dialog.active = false;
      dialog.holdTimer = 0;
      dialog.fade = Math.max(0, (dialog.fade || 0) - dt * 6);
      if(dialog.fade <= 0.01){
        dialog.visible = '';
        dialog.charIndex = 0;
        dialog.charProgress = 0;
      }
    }
  }
}

function drawNpcDialogues(world, ctx){
  if(!ctx || !world || !Array.isArray(world.npcEntities) || !world.npcEntities.length) return;
  for(const entry of world.npcEntities){
    if(!entry) continue;
    const stick = entry.stick;
    const dialog = entry.dialog;
    if(!stick || !dialog) continue;
    const visible = dialog.visible || '';
    const fade = dialog.fade || 0;
    if(!visible || fade <= 0) continue;
    const head = stick.pointsByName?.head;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!head && !center) continue;
    const anchorX = head?.x ?? center.x;
    const anchorY = head?.y ?? center.y;
    if(!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) continue;
    ctx.save();
    ctx.globalAlpha *= clamp(fade, 0, 1);
    const font = '12px "Press Start 2P","Silkscreen","VT323","Courier New",monospace';
    ctx.font = font;
    const lineHeight = 14;
    const maxWidth = 180;
    const lines = wrapNpcDialogText(ctx, visible, maxWidth);
    if(!lines.length){
      ctx.restore();
      continue;
    }
    let textWidth = 0;
    for(const line of lines){
      const metrics = ctx.measureText(line);
      textWidth = Math.max(textWidth, metrics.width);
    }
    const paddingX = 8;
    const paddingY = 6;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = lines.length * lineHeight + paddingY * 2;
    const hatOffset = Number.isFinite(dialog.hatOffset) ? dialog.hatOffset : 26;
    const top = anchorY - hatOffset - boxHeight;
    const left = anchorX - boxWidth * 0.5;
    const pointerWidth = 14;
    const pointerHeight = 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 2;
    if(typeof ctx.roundRect === 'function'){
      ctx.beginPath();
      ctx.roundRect(left, top, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();
    }else{
      ctx.fillRect(left, top, boxWidth, boxHeight);
      ctx.strokeRect(left, top, boxWidth, boxHeight);
    }
    const pointerTop = top + boxHeight;
    ctx.beginPath();
    ctx.moveTo(anchorX, pointerTop + pointerHeight);
    ctx.lineTo(anchorX - pointerWidth * 0.5, pointerTop);
    ctx.lineTo(anchorX + pointerWidth * 0.5, pointerTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for(let i=0;i<lines.length;i++){
      const line = lines[i];
      ctx.fillText(line, left + paddingX, top + paddingY + lineHeight * (i + 0.8));
    }
    ctx.restore();
  }
}

function wrapNpcDialogText(ctx, text, maxWidth){
  const lines = [];
  if(!text) return lines;
  const segments = String(text).split(/\r?\n/);
  for(let s=0; s<segments.length; s++){
    const segment = segments[s];
    const words = segment.split(/\s+/).filter(Boolean);
    let current = '';
    for(const word of words){
      const tentative = current ? `${current} ${word}` : word;
      if(ctx.measureText(tentative).width <= maxWidth || !current){
        current = tentative;
      }else{
        if(current) lines.push(current);
        current = word;
      }
    }
    if(current) lines.push(current);
    if(words.length === 0 && segment.trim().length === 0){
      lines.push('');
    }
  }
  return lines;
}

function applyRainThunderFlash(world, ctx){
  if(!world || !ctx) return;
  const flash = world.levelState?.rainFlash;
  if(!flash) return;
  const alpha = clamp(Number(flash.alpha), 0, 1);
  if(alpha <= 0) return;
  const color = typeof flash.color === 'string' && flash.color
    ? flash.color
    : 'rgba(238, 242, 255, 0.85)';
  const prevComposite = ctx.globalCompositeOperation;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.restore();
  ctx.globalCompositeOperation = prevComposite;
}

function createTerrainImage(src){
  if(typeof Image !== 'function') return null;
  const img = new Image();
  try{
    img.decoding = 'async';
  }catch(err){
    // Older browsers may not support decoding hints; ignore.
  }
  img.loaded = false;
  img.addEventListener('load', ()=>{ img.loaded = true; });
  img.addEventListener('error', ()=>{ img.error = true; });
  img.src = src;
  return img;
}

function isTerrainImageReady(img){
  if(!img || img.error) return false;
  if(img.loaded) return true;
  return !!(img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
}

const STAGE1_MEADOW_TOP_IMAGE = createTerrainImage('sprites/level/stage_1_block_top.png');
const STAGE1_MEADOW_BODY_IMAGE = createTerrainImage('sprites/level/stage_1_block.png');

function createWorldBlockSpriteSet(worldId, variantSuffix=''){
  const id = String(worldId);
  const suffix = variantSuffix ? `_${variantSuffix}` : '';
  const basePath = `sprites/level/world_${id}/world_${id}_block`;
  return {
    base: createTerrainImage(`${basePath}${suffix}.png`),
    edge: createTerrainImage(`${basePath}_edge${suffix}.png`),
    corner: createTerrainImage(`${basePath}_corner${suffix}.png`),
    vertex: createTerrainImage(`${basePath}_vertex${suffix}.png`),
    end: createTerrainImage(`${basePath}_end${suffix}.png`),
    single: createTerrainImage(`${basePath}_single${suffix}.png`)
  };
}

const WORLD0_BLOCK_SPRITES = createWorldBlockSpriteSet(0);
const WORLD1_BLOCK_SPRITES = createWorldBlockSpriteSet(1);
const WORLD2_BLOCK_SPRITES = createWorldBlockSpriteSet(2);
const WORLD3_BLOCK_SPRITES = createWorldBlockSpriteSet(3);
const WORLD4_BLOCK_SPRITES = createWorldBlockSpriteSet(4);
const WORLD5_BLOCK_SPRITES = createWorldBlockSpriteSet(5);
const WORLD6_BLOCK_SPRITES = createWorldBlockSpriteSet(6);
const WORLD7_BLOCK_SPRITES = createWorldBlockSpriteSet(7);
const WORLD8_BLOCK_SPRITES = createWorldBlockSpriteSet(8);
const WORLD9_BLOCK_SPRITES = createWorldBlockSpriteSet(9);
const WORLD9_BLOCK_ALT_SPRITES = createWorldBlockSpriteSet(9, 'alt');
const TREASURE_CHEST_CLOSED_IMAGE = createTerrainImage('sprites/Objects/treasure_chest_closed.png');
const TREASURE_CHEST_OPEN_IMAGE = createTerrainImage('sprites/Objects/treasure_chest_open.png');
const TREASURE_CHEST_OPEN_WITH_GOLD_IMAGE = createTerrainImage('sprites/objects/treasure_chest_open_with_gold.png');
const SKILL_TOMB_IMAGE = createTerrainImage('sprites/level/world_0/skill_tomb_big.png');
const CRATE_IMAGE = createTerrainImage('sprites/objects/crate.png');
const FIREFLY_JAR_IMAGE = createTerrainImage('sprites/objects/firefly_jar.png');
const HANGING_FIREFLY_JAR_IMAGE = createTerrainImage('sprites/objects/CONCEPTS/firefly_jar.png');
const CHRONO_FLY_JAR_IMAGE = createTerrainImage('sprites/objects/chronofly_jar.png');
const CHRONO_FLY_JAR_FRAMES_IMAGE = createTerrainImage('sprites/objects/chronofly_jar_frames.png');
const RESTING_STICK_IMAGE_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAABACAYAAAB7jnWuAAABB0lEQVR4nO2XzQnCQBCFV7GAHBSCDalgCTmkgJSTAnLYEgS1IRH0kA70tJdAsu+NG5bge8fN/HyZnZkQ5yRJkv5dK6vj49l/hmf7sqDjrVMlnzpPChBLwkJQAGhwBgIGYN8MtTf1QEoJYDkA7JJB7akKoEEZWPoKYsHZSpl6YCyJ5VsgZRd9Z1XdRHe879r5piC1BCAAuFuR7h8KmYbsFRCAAAQgAAFsWIfXu4/a7LYFHC97BQRA94Bzzt0v/jT27HCurrMB+K4dTRwU4Kq6gUCY/4IjYRt0ixmgPWBJDvkhANbkkH/2KRDAIgCio/SLP1oBK0SyPQBvNtaeWsUh6NRKZkGl7PoCZ2tIXFD5UagAAAAASUVORK5CYII=';
const RESTING_STICK_IMAGE = createTerrainImage(RESTING_STICK_IMAGE_SRC);
const SANDSTONE_CRUMBLE_TILE_IMAGE = createTerrainImage('sprites/level/world_all/sandstone_block.png');
const BREAKABLE_BLOCK_ELEMENT_SPRITES = {
  physical: createTerrainImage('sprites/level/world_all/breakable_block_physical.png'),
  fire: createTerrainImage('sprites/level/world_all/breakable_block_fire.png'),
  ice: createTerrainImage('sprites/level/world_all/breakable_block_ice.png'),
  light: createTerrainImage('sprites/level/world_all/breakable_block_light.png'),
  chronometric: createTerrainImage('sprites/level/world_all/breakable_block_chronometric.png'),
  void: createTerrainImage('sprites/level/world_all/breakable_block_void.png'),
  necrotic: createTerrainImage('sprites/level/world_all/breakable_block_nectrotic.png'),
  life: createTerrainImage('sprites/level/world_all/breakable_block_life.png')
};
const BREAKABLE_BLOCK_CRACK_SPRITES = [
  null,
  createTerrainImage('sprites/level/world_all/block_crack_1.png'),
  createTerrainImage('sprites/level/world_all/block_crack_2.png'),
  createTerrainImage('sprites/level/world_all/block_crack_3.png'),
  createTerrainImage('sprites/level/world_all/block_crack_4.png'),
  createTerrainImage('sprites/level/world_all/block_crack_5.png')
];
const CHRONO_FLY_JAR_FRAME_SIZE = 20;
const CHRONO_FLY_JAR_FRAME_COUNT = 7;
const CHRONO_FLY_JAR_EFFECT_OFFSET_Y = 9;
const SPRITE_TERRAIN_STYLE_MAP = {
  world0: WORLD0_BLOCK_SPRITES,
  world1: WORLD1_BLOCK_SPRITES,
  world2: WORLD2_BLOCK_SPRITES,
  world3: WORLD3_BLOCK_SPRITES,
  world4: WORLD4_BLOCK_SPRITES,
  world5: WORLD5_BLOCK_SPRITES,
  world6: WORLD6_BLOCK_SPRITES,
  world7: WORLD7_BLOCK_SPRITES,
  world8: WORLD8_BLOCK_SPRITES,
  world9: WORLD9_BLOCK_SPRITES,
  world9_alt: WORLD9_BLOCK_ALT_SPRITES
};
const WORLD_MAP_BACKGROUND_IMAGE = createTerrainImage('sprites/world_map.jpg');
const WORLD_MAP_MONOCHROME_BACKGROUND_IMAGE = createTerrainImage('sprites/monochrome_world_map.jpg');
const WORLD_MAP_ID_SURFACE = 'surface';
const WORLD_MAP_ID_MONOCHROME = 'monochrome';
const CHRONOSPHERE_IMAGE = createTerrainImage('sprites/objects/chronosphere.png');

const MEADOW_TOP_SPRITE = [
  'HHHHHHHH',
  'HGGGGGGH',
  'GGGGGGGG',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const MEADOW_BODY_SPRITE = [
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'BSSSSSSB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const FROST_TOP_SPRITE = [
  'IIIIIIII',
  'IHHHHHHI',
  'HHHHHHHH',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const FROST_BODY_SPRITE = [
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'BSSSSSSB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const SANDSTONE_TOP_SPRITE = [
  'HHHHHHHH',
  'HAAAAAAH',
  'AAAAAAAH',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const SANDSTONE_BODY_SPRITE = [
  'BBBBBBBB',
  'BASSSSAB',
  'BBBBBBBB',
  'BSSSSSSB',
  'BBBBBBBB',
  'BSSASSSB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const VOID_DOJO_TOP_SPRITE = [
  'KKKKKKKK',
  'KHHHHHHK',
  'HHHHHHHH',
  'BBBBBBBB',
  'BWWWWWWB',
  'BBBBBBBB',
  'WWWWWWWW',
  'DDDDDDDD'
];

const VOID_DOJO_BODY_SPRITE = [
  'BBBBBBBB',
  'BWWWWWWB',
  'BBBBBBBB',
  'BWWWWWWB',
  'BBBBBBBB',
  'BWWWWWWB',
  'WWWWWWWW',
  'DDDDDDDD'
];

const CINDER_TOP_SPRITE = [
  'HHHHHHHH',
  'HEEEEEEH',
  'EEEEEEEE',
  'BBBBBBBB',
  'BSCCCCSB',
  'BCCCCCCB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const CINDER_BODY_SPRITE = [
  'BBBBBBBB',
  'BSCCCCSB',
  'BCCCCCCB',
  'BSCCCCSB',
  'BCCCCCCB',
  'BSSSSSSB',
  'SSSSSSSS',
  'DDDDDDDD'
];

const TORCH_FLOOR_SPRITE = [
  '..HHHH..',
  '.HMMMMH.',
  '.HMMMMH.',
  '..HLWS..',
  '..HLWS..',
  '..HLWS..',
  '..HLWS..',
  '.HLWWSS.',
  '.HLWWSS.',
  'HLWWWSSS',
  'HSSSSSSS',
  '.HSSSSS.',
  '..HMMH..',
  '..HMMH..'
];

const PLATFORM_PIXEL_SPRITE = [
  'T'.repeat(14),
  'T' + 'A'.repeat(12) + 'T',
  'T' + 'A'.repeat(12) + 'T',
  'T' + 'B'.repeat(12) + 'T',
  'T' + 'B'.repeat(12) + 'T',
  'T' + 'B'.repeat(12) + 'T',
  'T' + 'S'.repeat(12) + 'T',
  'T'.repeat(14)
];

const SPIKE_PIXEL_SPRITE = [
  '..C..C..C..',
  '.CCC.CCC.CC',
  'CCCCCCCCCCC',
  'CCCCCCCCCCC',
  'BBBBBBBBBBB',
  'BBBBBBBBBBB',
  'SSSSSSSSSSS',
  'SSSSSSSSSSS'
];

const CRUMBLE_WALL_SPRITE = [
  'T'.repeat(8),
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(3) + 'B' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(3) + 'B' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(3) + 'B' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'D'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'S'.repeat(6) + 'T',
  'T'.repeat(8)
];

const WOOD_WALL_SPRITE = [
  'T'.repeat(8),
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'G' + 'B'.repeat(3) + 'G' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'K' + 'B'.repeat(2) + 'K' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'G' + 'B'.repeat(3) + 'G' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'K' + 'B'.repeat(2) + 'K' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'G' + 'B'.repeat(3) + 'G' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'K' + 'B'.repeat(2) + 'K' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'S'.repeat(6) + 'T',
  'T'.repeat(8)
];

const STONE_WALL_SPRITE = [
  'T'.repeat(8),
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'R'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'S' + 'B'.repeat(3) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'R'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'S' + 'B'.repeat(3) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'R'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'S' + 'B'.repeat(3) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'S'.repeat(6) + 'T',
  'T'.repeat(8)
];

const SANDSTONE_WALL_SPRITE = [
  'T'.repeat(8),
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'L' + 'B'.repeat(3) + 'L' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'R'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'S' + 'B'.repeat(3) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'L' + 'B'.repeat(3) + 'L' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'R'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'S' + 'B'.repeat(3) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'S'.repeat(6) + 'T',
  'T'.repeat(8)
];

const STEEL_WALL_SPRITE = [
  'T'.repeat(8),
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'H'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B'.repeat(2) + 'R' + 'B'.repeat(2) + 'R' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'H'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B'.repeat(2) + 'R' + 'B'.repeat(2) + 'R' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B' + 'H'.repeat(2) + 'B'.repeat(2) + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'B'.repeat(2) + 'R' + 'B'.repeat(2) + 'R' + 'T',
  'T' + 'B'.repeat(6) + 'T',
  'T' + 'S'.repeat(6) + 'T',
  'T'.repeat(8)
];

const CRATE_PIXEL_SPRITE = [
  'T'.repeat(12),
  'T' + 'B'.repeat(10) + 'T',
  'T' + 'B' + 'H'.repeat(8) + 'BT',
  'T' + 'B' + 'H' + 'B'.repeat(6) + 'HT',
  'T' + 'B'.repeat(10) + 'T',
  'T' + 'B' + 'H' + 'B'.repeat(6) + 'HT',
  'T' + 'B' + 'H'.repeat(8) + 'BT',
  'T' + 'B'.repeat(10) + 'T',
  'T'.repeat(12)
];

const RAFT_PIXEL_SPRITE = [
  '..FFFFFFFFFF..',
  '.FPPPPPPPPPPF.',
  'FPPHHPPHHPPPPF',
  'FPPPPPPPPPPPPF',
  'FRRRSSSSSSRRRF',
  'FPPPPPPPPPPPPF',
  'FPPHHPPHHPPPPF',
  '.FPPPPPPPPPPF.',
  '..FFFFFFFFFF..'
];

const BOAT_PIXEL_SPRITE = [
  '.....FFFF.....',
  '....FPRRPF....',
  '...FPRRRRPF...',
  '..FPRRRRRRPF..',
  '.FPRRRRRRRRPF.',
  'FSPPPPPPPPPPSF',
  '.FRRRRRRRRRRF.',
  '..FRRRRRRRRF..',
  '...FBBBBBBF...',
  '....FBBBBF....'
];

const SPROUT_PIXEL_SPRITE = [
  '....L..',
  '...LLL.',
  '..LLGL.',
  '...GG..',
  '...GG..',
  '...GG..',
  '..GGGG.',
  '.GG..G.',
  '.GG..G.',
  '..GGGG.',
  '..GGGG.',
  '...GG..'
];

const TUFT_PIXEL_SPRITE = [
  '..LLL.....',
  '.LGGGL....',
  'LGGGGGGL..',
  'LGGGGGGGL.',
  'LGGGGGGGL.',
  '.LGGGGL...',
  '..LGGL....',
  '..LLL.....'
];

const TREE_BRANCH_SPRITE = [
  '.'.repeat(32),
  '.'.repeat(12) + 'H'.repeat(8) + '.'.repeat(12),
  '.'.repeat(10) + 'H'.repeat(12) + '.'.repeat(10),
  '.'.repeat(8) + 'H'.repeat(16) + '.'.repeat(8),
  '.'.repeat(6) + 'H'.repeat(20) + '.'.repeat(6),
  '.'.repeat(4) + 'B'.repeat(24) + '.'.repeat(4),
  '.'.repeat(2) + 'B'.repeat(28) + '.'.repeat(2),
  'B'.repeat(32),
  'B'.repeat(32),
  'B'.repeat(32),
  'B'.repeat(32),
  'S'.repeat(32),
  'D'.repeat(32),
  '.'.repeat(32),
  '.'.repeat(32),
  '.'.repeat(32)
];

const CANOPY_PIXEL_SPRITE = [
  '.'.repeat(4) + 'H'.repeat(24) + '.'.repeat(4),
  '.'.repeat(2) + 'H'.repeat(4) + 'G'.repeat(20) + 'H'.repeat(4) + '.'.repeat(2),
  'H'.repeat(4) + 'G'.repeat(24) + 'H'.repeat(4),
  'H'.repeat(2) + 'G'.repeat(28) + 'H'.repeat(2),
  'H'.repeat(2) + 'G'.repeat(28) + 'H'.repeat(2),
  'H'.repeat(2) + 'G'.repeat(28) + 'H'.repeat(2),
  'H'.repeat(2) + 'G'.repeat(28) + 'H'.repeat(2),
  'H'.repeat(2) + 'G'.repeat(28) + 'H'.repeat(2),
  '.'.repeat(2) + 'H'.repeat(4) + 'G'.repeat(20) + 'H'.repeat(4) + '.'.repeat(2),
  '.'.repeat(4) + 'H'.repeat(24) + '.'.repeat(4),
  '.'.repeat(5) + 'S'.repeat(22) + '.'.repeat(5),
  '.'.repeat(6) + 'S'.repeat(20) + '.'.repeat(6),
  '.'.repeat(7) + 'S'.repeat(18) + '.'.repeat(7),
  '.'.repeat(8) + 'D'.repeat(16) + '.'.repeat(8),
  '.'.repeat(8) + 'D'.repeat(16) + '.'.repeat(8),
  '.'.repeat(8) + 'D'.repeat(16) + '.'.repeat(8)
];

const SKILL_PEDESTAL_SPRITE = [
  '.'.repeat(8) + 'B'.repeat(8) + '.'.repeat(8),
  '.'.repeat(6) + 'B'.repeat(12) + '.'.repeat(6),
  '.'.repeat(6) + 'B'.repeat(12) + '.'.repeat(6),
  '.'.repeat(4) + 'B'.repeat(16) + '.'.repeat(4),
  '.'.repeat(4) + 'H'.repeat(16) + '.'.repeat(4),
  '.'.repeat(4) + 'H'.repeat(16) + '.'.repeat(4),
  '.'.repeat(4) + 'B'.repeat(16) + '.'.repeat(4),
  '.'.repeat(4) + 'B'.repeat(16) + '.'.repeat(4),
  '.'.repeat(4) + 'P'.repeat(16) + '.'.repeat(4),
  '.'.repeat(6) + 'P'.repeat(12) + '.'.repeat(6),
  '.'.repeat(6) + 'P'.repeat(12) + '.'.repeat(6),
  '.'.repeat(8) + 'P'.repeat(8) + '.'.repeat(8),
  '.'.repeat(8) + 'P'.repeat(8) + '.'.repeat(8),
  '.'.repeat(8) + 'S'.repeat(8) + '.'.repeat(8),
  '.'.repeat(8) + 'S'.repeat(8) + '.'.repeat(8),
  '.'.repeat(8) + 'D'.repeat(8) + '.'.repeat(8)
];

const SPAWNER_PIXEL_SPRITE = [
  '.'.repeat(4) + 'B'.repeat(8) + '.'.repeat(4),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'H'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'H'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(4) + 'S'.repeat(8) + '.'.repeat(4),
  '.'.repeat(4) + 'S'.repeat(8) + '.'.repeat(4),
  '.'.repeat(4) + 'D'.repeat(8) + '.'.repeat(4)
];

const WATER_SPOUT_SPRITE = [
  '.'.repeat(4) + 'B'.repeat(8) + '.'.repeat(4),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'H'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'H'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'W'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'W'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'W'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'W'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'G'.repeat(10) + '.'.repeat(3),
  '.'.repeat(3) + 'B'.repeat(10) + '.'.repeat(3),
  '.'.repeat(4) + 'S'.repeat(8) + '.'.repeat(4),
  '.'.repeat(4) + 'S'.repeat(8) + '.'.repeat(4),
  '.'.repeat(4) + 'D'.repeat(8) + '.'.repeat(4)
];

function drawPixelPattern(ctx, sprite, palette, left, top, width, height){
  if(!ctx || !Array.isArray(sprite) || !sprite.length) return;
  const w = sprite[0]?.length || 1;
  const h = sprite.length;
  ctx.save();
  ctx.translate(left, top);
  if(w > 0 && h > 0){
    ctx.scale(width / w, height / h);
  }
  drawPixelSprite(ctx, sprite, palette);
  ctx.restore();
}

function renderGround(world, ctx){
  const palette = currentLevelPalette(world);
  const groundColor = palette.ground || '#6b4d2f';
  const turfColor = palette.turf || '#2da160';
  const style = palette.terrainStyle || 'meadow';
  const showHitboxes = !!(world?.gameplayFlags?.showHitboxes);
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  const bounds = getActiveLevelBounds(world);
  const margin = 160;
  let left = (bounds.left ?? 0) - margin;
  let right = (bounds.right ?? world.width) + margin;
  if(right - left < world.width){
    const mid = ((bounds.left ?? 0) + (bounds.right ?? world.width)) * 0.5;
    left = mid - world.width * 0.5;
    right = mid + world.width * 0.5;
  }
  const width = right - left;
  ctx.fillStyle = groundColor;
  ctx.fillRect(left, world.groundY, width, world.height - world.groundY + margin);
  ctx.fillStyle = turfColor;
  ctx.fillRect(left, world.groundY-6, width, 6);
  drawSandSimulation(world, ctx);
  drawPowderSimulation(world, ctx);
  drawLavaSimulation(world, ctx);
  drawWaterSimulation(world, ctx);
  drawWaterBlocks(world, ctx);
  const grid = world.terrainCells;
  let drewGrid = false;
  if(grid && grid.cells){
    const gridScreenIndex = Number.isInteger(grid.screenIndex) ? grid.screenIndex : null;
    if(activeScreenIndex === null || gridScreenIndex === null || gridScreenIndex === activeScreenIndex){
      drewGrid = true;
      const cells = grid.cells;
      const tileSize = grid.tileSize || DEFAULT_LAYOUT_TILE_SIZE || 30;
      const rows = grid.rows || cells.length;
      const cols = grid.cols || (cells[0]?.length || 0);
      const offsetX = grid.offsetX || 0;
      const camera = ensureCamera(world);
      const halfViewWidth = (typeof world.width === 'number' && isFinite(world.width)) ? world.width * 0.5 : 0;
      const halfViewHeight = (typeof world.height === 'number' && isFinite(world.height)) ? world.height * 0.5 : 0;
      const viewMargin = tileSize * 1.5;
      let viewBounds = null;
      let rowStart = 0;
      let rowEnd = rows;
      let colStart = 0;
      let colEnd = cols;
      if(tileSize > 0 && rows > 0 && cols > 0){
        viewBounds = {
          left: (camera.x ?? 0) - halfViewWidth - viewMargin,
          right: (camera.x ?? 0) + halfViewWidth + viewMargin,
          top: (camera.y ?? 0) - halfViewHeight - viewMargin,
          bottom: (camera.y ?? 0) + halfViewHeight + viewMargin
        };
        const firstRowTop = world.groundY - rows * tileSize;
        rowStart = Math.floor((viewBounds.top - firstRowTop) / tileSize) - 1;
        rowEnd = Math.ceil((viewBounds.bottom - firstRowTop) / tileSize) + 1;
        colStart = Math.floor((viewBounds.left - offsetX) / tileSize) - 1;
        colEnd = Math.ceil((viewBounds.right - offsetX) / tileSize) + 1;
        if(rowEnd < 0 || colEnd < 0 || rowStart > rows || colStart > cols){
          rowStart = 0;
          rowEnd = 0;
          colStart = 0;
          colEnd = 0;
        }else{
          rowStart = Math.max(0, Math.min(rows, rowStart));
          rowEnd = Math.max(rowStart, Math.min(rows, rowEnd));
          colStart = Math.max(0, Math.min(cols, colStart));
          colEnd = Math.max(colStart, Math.min(cols, colEnd));
        }
      }
      const backgroundCells = Array.isArray(grid.background) ? grid.background : null;
      const styleGrid = Array.isArray(grid.styles) ? grid.styles : null;
      const backgroundSolid = (r,c)=>{
        if(!backgroundCells) return false;
        if(r<0 || c<0) return false;
        if(r>=backgroundCells.length) return false;
        const row = backgroundCells[r];
        if(!row) return false;
        if(c>=row.length) return false;
        return !!row[c];
      };
      const cellSolid = (r,c)=>{
        if(r<0 || c<0 || r>=rows || c>=cols) return false;
        return !!cells[r][c];
      };
      if(backgroundCells){
        for(let row=rowStart; row<rowEnd; row++){
          const rowArray = backgroundCells[row];
          if(!rowArray) continue;
          const rowTop = world.groundY - (rows - row) * tileSize;
          const rowBottom = rowTop + tileSize;
          if(viewBounds && (rowBottom < viewBounds.top || rowTop > viewBounds.bottom)) continue;
          for(let col=colStart; col<colEnd; col++){
            if(!backgroundSolid(row, col)) continue;
            const left = offsetX + col * tileSize;
            const right = left + tileSize;
            if(viewBounds && (right < viewBounds.left || left > viewBounds.right)) continue;
            const top = rowTop;
            const neighbors = {
              leftOpen: !backgroundSolid(row, col-1),
              rightOpen: !backgroundSolid(row, col+1),
              aboveOpen: !backgroundSolid(row-1, col),
              belowOpen: !backgroundSolid(row+1, col),
              aboveLeftOpen: !backgroundSolid(row-1, col-1),
              aboveRightOpen: !backgroundSolid(row-1, col+1),
              belowLeftOpen: !backgroundSolid(row+1, col-1),
              belowRightOpen: !backgroundSolid(row+1, col+1)
            };
            drawTerrainBlock(ctx, style, palette, left, top, tileSize, neighbors, row, col);
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(left - 0.5, top - 0.5, tileSize + 1, tileSize + 1);
            ctx.restore();
          }
        }
      }
      for(let row=rowStart; row<rowEnd; row++){
        const rowTop = world.groundY - (rows - row) * tileSize;
        const rowBottom = rowTop + tileSize;
        if(viewBounds && (rowBottom < viewBounds.top || rowTop > viewBounds.bottom)) continue;
        for(let col=colStart; col<colEnd; col++){
          if(!cells[row][col]) continue;
          const left = offsetX + col * tileSize;
          const right = left + tileSize;
          if(viewBounds && (right < viewBounds.left || left > viewBounds.right)) continue;
          const top = rowTop;
          const neighbors = {
            leftOpen: !cellSolid(row, col-1),
            rightOpen: !cellSolid(row, col+1),
            aboveOpen: !cellSolid(row-1, col),
            belowOpen: !cellSolid(row+1, col),
            aboveLeftOpen: !cellSolid(row-1, col-1),
            aboveRightOpen: !cellSolid(row-1, col+1),
            belowLeftOpen: !cellSolid(row+1, col-1),
            belowRightOpen: !cellSolid(row+1, col+1)
          };
          const cellStyleRaw = styleGrid?.[row]?.[col];
          const resolvedStyle = typeof normalizeTerrainStyleId === 'function'
            ? (normalizeTerrainStyleId(cellStyleRaw) || style)
            : (cellStyleRaw || style);
          drawTerrainBlock(ctx, resolvedStyle, palette, left, top, tileSize, neighbors, row, col);
          if(showHitboxes){
            drawHitboxOutline(ctx, left, top, tileSize, tileSize, {
              strokeStyle: palette.blockHitboxColor || '#ffe066',
              lineWidth: Math.max(1.5, tileSize * 0.08),
              alpha: 0.65
            });
          }
        }
      }
    }
  }
  if(!drewGrid){
    const tiles = world.terrain || [];
    for(const tile of tiles){
      if(!tile) continue;
      if(activeScreenIndex !== null && tile.screenIndex !== undefined && tile.screenIndex !== activeScreenIndex) continue;
      drawTerrainRect(ctx, style, palette, tile, showHitboxes);
    }
  }
  drawGrassField(world, ctx);
}

  function drawTerrainBlock(ctx, style, palette, left, top, tileSize, neighbors, row, col){
    if(style === 'stage1Meadow'){
      drawStage1MeadowBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
      return;
    }
    const variant = (palette && (palette.terrainVariant || palette.blockVariant)) || null;
    const styleKey = variant ? `${style}_${variant}` : style;
    const spriteSet = SPRITE_TERRAIN_STYLE_MAP[styleKey] || SPRITE_TERRAIN_STYLE_MAP[style];
  if(spriteSet && drawSpriteTerrainBlock(ctx, spriteSet, left, top, tileSize, neighbors)){
    return;
  }
  if(style === 'sandstone'){
    drawSandstoneBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
    return;
  }
  if(style === 'voidDojo'){
    drawVoidDojoBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
    return;
  }
  if(style === 'frost'){
    drawFrostBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
    return;
  }
  if(style === 'cinder'){
    drawCinderBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
    return;
  }
  drawClassicMeadowBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
}

function drawStage1MeadowBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  if(drawSpriteTerrainBlock(ctx, WORLD1_BLOCK_SPRITES, left, top, tileSize, neighbors)) return;
  const sprite = neighbors.aboveOpen ? STAGE1_MEADOW_TOP_IMAGE : STAGE1_MEADOW_BODY_IMAGE;
  if(sprite && sprite.complete && sprite.naturalWidth > 0 && sprite.naturalHeight > 0){
    ctx.drawImage(sprite, left, top, tileSize, tileSize);
    return;
  }
  drawClassicMeadowBlock(ctx, palette, left, top, tileSize, neighbors, row, col);
}

function drawSpriteTerrainBlock(ctx, spriteSet, left, top, tileSize, neighbors){
  if(!spriteSet) return false;
  const singleBlock = isSingleTerrainBlock(neighbors);
  const baseReady = isTerrainImageReady(spriteSet.base);
  if(singleBlock && spriteSet.single && isTerrainImageReady(spriteSet.single)){
    if(baseReady) ctx.drawImage(spriteSet.base, left, top, tileSize, tileSize);
    drawTerrainSpriteLayer(ctx, spriteSet.single, left, top, tileSize, 0);
    return true;
  }
  const endDirection = singleBlock ? null : getTerrainBlockEndDirection(neighbors);
  if(endDirection && spriteSet.end && isTerrainImageReady(spriteSet.end)){
    if(baseReady) ctx.drawImage(spriteSet.base, left, top, tileSize, tileSize);
    drawTerrainSpriteLayer(ctx, spriteSet.end, left, top, tileSize, rotationForTerrainBlockEnd(endDirection));
    return true;
  }
  if(!baseReady) return false;
  ctx.drawImage(spriteSet.base, left, top, tileSize, tileSize);
  if(singleBlock || endDirection) return true;
  const cornerReady = spriteSet.corner && isTerrainImageReady(spriteSet.corner);
  if(spriteSet.edge && isTerrainImageReady(spriteSet.edge)){
    const skipTop = cornerReady && neighbors.aboveOpen && (neighbors.leftOpen || neighbors.rightOpen);
    const skipRight = cornerReady && neighbors.rightOpen && (neighbors.aboveOpen || neighbors.belowOpen);
    const skipBottom = cornerReady && neighbors.belowOpen && (neighbors.leftOpen || neighbors.rightOpen);
    const skipLeft = cornerReady && neighbors.leftOpen && (neighbors.aboveOpen || neighbors.belowOpen);
    if(neighbors.aboveOpen && !skipTop) drawTerrainSpriteLayer(ctx, spriteSet.edge, left, top, tileSize, 0);
    if(neighbors.rightOpen && !skipRight) drawTerrainSpriteLayer(ctx, spriteSet.edge, left, top, tileSize, Math.PI * 0.5);
    if(neighbors.belowOpen && !skipBottom) drawTerrainSpriteLayer(ctx, spriteSet.edge, left, top, tileSize, Math.PI);
    if(neighbors.leftOpen && !skipLeft) drawTerrainSpriteLayer(ctx, spriteSet.edge, left, top, tileSize, Math.PI * 1.5);
  }
  if(cornerReady){
    if(neighbors.aboveOpen && neighbors.rightOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.corner, left, top, tileSize, 0);
    }
    if(neighbors.rightOpen && neighbors.belowOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.corner, left, top, tileSize, Math.PI * 0.5);
    }
    if(neighbors.belowOpen && neighbors.leftOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.corner, left, top, tileSize, Math.PI);
    }
    if(neighbors.leftOpen && neighbors.aboveOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.corner, left, top, tileSize, Math.PI * 1.5);
    }
  }
  if(spriteSet.vertex && isTerrainImageReady(spriteSet.vertex)){
    if(!neighbors.aboveOpen && !neighbors.rightOpen && neighbors.aboveRightOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.vertex, left, top, tileSize, 0);
    }
    if(!neighbors.rightOpen && !neighbors.belowOpen && neighbors.belowRightOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.vertex, left, top, tileSize, Math.PI * 0.5);
    }
    if(!neighbors.belowOpen && !neighbors.leftOpen && neighbors.belowLeftOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.vertex, left, top, tileSize, Math.PI);
    }
    if(!neighbors.leftOpen && !neighbors.aboveOpen && neighbors.aboveLeftOpen){
      drawTerrainSpriteLayer(ctx, spriteSet.vertex, left, top, tileSize, Math.PI * 1.5);
    }
  }
  return true;
}

function drawTerrainSpriteLayer(ctx, image, left, top, tileSize, rotation){
  if(!ctx || !image) return;
  ctx.save();
  ctx.translate(left + tileSize * 0.5, top + tileSize * 0.5);
  if(rotation) ctx.rotate(rotation);
  ctx.drawImage(image, -tileSize * 0.5, -tileSize * 0.5, tileSize, tileSize);
  ctx.restore();
}

function isSingleTerrainBlock(neighbors){
  if(!neighbors) return false;
  return neighbors.leftOpen && neighbors.rightOpen && neighbors.aboveOpen && neighbors.belowOpen;
}

function getTerrainBlockEndDirection(neighbors){
  if(!neighbors) return null;
  const { leftOpen, rightOpen, aboveOpen, belowOpen } = neighbors;
  if(!leftOpen && rightOpen && aboveOpen && belowOpen) return 'left';
  if(!rightOpen && leftOpen && aboveOpen && belowOpen) return 'right';
  if(!aboveOpen && leftOpen && rightOpen && belowOpen) return 'up';
  if(!belowOpen && leftOpen && rightOpen && aboveOpen) return 'down';
  return null;
}

function rotationForTerrainBlockEnd(direction){
  switch(direction){
    case 'up': return Math.PI * 0.5;
    case 'right': return Math.PI;
    case 'down': return Math.PI * 1.5;
    case 'left':
    default:
      return 0;
  }
}

function drawClassicMeadowBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  const base = palette.ground || '#3c2a1f';
  const turf = palette.turf || '#46b06d';
  const highlight = ensureOpaqueColor(palette.blockHighlight) || lightenColor(turf, 0.28);
  const shade = ensureOpaqueColor(palette.blockShade) || darkenColor(base, 0.22);
  const deep = darkenColor(base, 0.38);
  const sprite = neighbors.aboveOpen ? MEADOW_TOP_SPRITE : MEADOW_BODY_SPRITE;
  const colors = { H: highlight, G: turf, B: base, S: shade, D: deep };
  drawPixelPattern(ctx, sprite, colors, left, top, tileSize, tileSize);
  if(neighbors.leftOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left - Math.max(2, tileSize * 0.08), top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.rightOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left + tileSize, top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.aboveOpen){
    const sproutNoise = terrainCellNoise(row, col);
    if(sproutNoise > 0.72){
      const sproutWidth = Math.max(2, Math.round(tileSize * 0.12));
      const sproutHeight = Math.max(6, Math.round(tileSize * 0.35));
      const sproutLeft = Math.round(left + tileSize * (0.2 + sproutNoise * 0.5));
      ctx.fillStyle = lightenColor(turf, 0.12);
      ctx.fillRect(sproutLeft, Math.round(top - sproutHeight), sproutWidth, sproutHeight);
    }
  }
}

function drawFrostBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  const base = palette.ground || '#2b3c4f';
  const highlight = ensureOpaqueColor(palette.blockHighlight) || lightenColor(base, 0.42);
  const accent = palette.blockAccent || palette.turf || '#9be0ff';
  const shade = ensureOpaqueColor(palette.blockShade) || darkenColor(base, 0.24);
  const deep = darkenColor(base, 0.4);
  const sprite = neighbors.aboveOpen ? FROST_TOP_SPRITE : FROST_BODY_SPRITE;
  const colors = { I: lightenColor(highlight, 0.25), H: highlight, B: base, S: shade, D: deep };
  drawPixelPattern(ctx, sprite, colors, left, top, tileSize, tileSize);
  if(neighbors.leftOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left - Math.max(2, tileSize * 0.08), top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.rightOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left + tileSize, top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.aboveOpen){
    const sparkleCount = Math.max(1, Math.round(tileSize / 28));
    ctx.fillStyle = accent;
    for(let i=0;i<sparkleCount;i++){
      const noise = terrainCellNoise(row, col, i);
      const sx = Math.round(left + tileSize * (0.2 + noise * 0.6));
      const sy = Math.round(top - tileSize * (0.12 + (noise * 0.18)));
      ctx.fillRect(sx, sy, Math.max(2, tileSize * 0.08), Math.max(2, tileSize * 0.08));
    }
  }
}

function drawVoidDojoBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  const base = palette.ground || '#101018';
  const accent = palette.blockAccent || '#f5f5f5';
  const highlight = ensureOpaqueColor(palette.blockHighlight) || lightenColor(base, 0.32);
  const stripe = lightenColor(base, 0.18);
  const deep = ensureOpaqueColor(palette.blockShade) || darkenColor(base, 0.42);
  const sprite = neighbors.aboveOpen ? VOID_DOJO_TOP_SPRITE : VOID_DOJO_BODY_SPRITE;
  const colors = { K: lightenColor(accent, 0.05), H: accent, B: base, W: stripe, D: deep };
  drawPixelPattern(ctx, sprite, colors, left, top, tileSize, tileSize);
  if(neighbors.leftOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left - Math.max(2, tileSize * 0.08), top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.rightOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left + tileSize, top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.aboveOpen){
    const noise = terrainCellNoise(row, col);
    if(noise > 0.58){
      const glyphWidth = Math.max(2, tileSize * 0.08);
      const glyphHeight = Math.max(6, tileSize * 0.32);
      const gx = Math.round(left + tileSize * (0.18 + noise * 0.6));
      const gy = Math.round(top - glyphHeight * 0.6);
      ctx.fillStyle = colorWithAlpha(accent, 0.75);
      ctx.fillRect(gx, gy, glyphWidth, glyphHeight);
    }
  }
}

function drawCinderBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  const base = palette.ground || '#3a2119';
  const ember = palette.turf || '#ff7043';
  const accent = palette.blockAccent || '#ffb347';
  const shade = ensureOpaqueColor(palette.blockShade) || darkenColor(base, 0.3);
  const deep = darkenColor(base, 0.45);
  const highlight = ensureOpaqueColor(palette.blockHighlight) || lightenColor(ember, 0.26);
  const sprite = neighbors.aboveOpen ? CINDER_TOP_SPRITE : CINDER_BODY_SPRITE;
  const colors = { H: highlight, E: ember, B: base, S: shade, D: deep, C: accent };
  drawPixelPattern(ctx, sprite, colors, left, top, tileSize, tileSize);
  if(neighbors.leftOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left - Math.max(2, tileSize * 0.08), top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.rightOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left + tileSize, top, Math.max(2, tileSize * 0.08), tileSize);
  }
  const emberNoise = terrainCellNoise(row, col, 3);
  if(emberNoise > 0.62){
    const flickerWidth = Math.max(2, Math.round(tileSize * 0.14));
    const flickerHeight = Math.max(4, Math.round(tileSize * 0.32));
    const fx = Math.round(left + tileSize * (0.2 + emberNoise * 0.6));
    const fy = Math.round(top + tileSize * 0.2);
    ctx.fillStyle = accent;
    ctx.fillRect(fx, fy, flickerWidth, flickerHeight);
    ctx.fillStyle = highlight;
    ctx.fillRect(fx + 1, fy + 1, Math.max(1, flickerWidth - 2), Math.max(1, flickerHeight - 2));
  }
}

function drawSandstoneBlock(ctx, palette, left, top, tileSize, neighbors, row, col){
  const base = palette.ground || '#caa16a';
  const accent = palette.blockAccent || '#e1c27a';
  const highlight = ensureOpaqueColor(palette.blockHighlight) || lightenColor(base, 0.24);
  const shade = ensureOpaqueColor(palette.blockShade) || darkenColor(base, 0.2);
  const deep = darkenColor(base, 0.35);
  const sprite = neighbors.aboveOpen ? SANDSTONE_TOP_SPRITE : SANDSTONE_BODY_SPRITE;
  const colors = { H: highlight, A: accent, B: base, S: shade, D: deep };
  drawPixelPattern(ctx, sprite, colors, left, top, tileSize, tileSize);
  if(neighbors.leftOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left - Math.max(2, tileSize * 0.08), top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.rightOpen){
    ctx.fillStyle = deep;
    ctx.fillRect(left + tileSize, top, Math.max(2, tileSize * 0.08), tileSize);
  }
  if(neighbors.aboveOpen){
    const noise = terrainCellNoise(row, col);
    if(noise > 0.62){
      const chipWidth = Math.max(2, Math.round(tileSize * 0.12));
      const chipHeight = Math.max(4, Math.round(tileSize * 0.28));
      const chipLeft = Math.round(left + tileSize * (0.18 + noise * 0.5));
      const chipTop = Math.round(top - chipHeight * 0.6);
      ctx.fillStyle = accent;
      ctx.fillRect(chipLeft, chipTop, chipWidth, chipHeight);
    }
  }
}

function drawTerrainRect(ctx, style, palette, tile, showHitboxes=false){
  const baseSize = typeof DEFAULT_LAYOUT_TILE_SIZE === 'number' && DEFAULT_LAYOUT_TILE_SIZE > 0 ? DEFAULT_LAYOUT_TILE_SIZE : 30;
  const width = tile.w ?? tile.width ?? 0;
  const height = tile.h ?? tile.height ?? 0;
  const left = tile.x ?? tile.left ?? 0;
  const top = tile.y ?? tile.top ?? 0;
  const tileStyleRaw = tile?.style;
  const rectStyle = typeof normalizeTerrainStyleId === 'function'
    ? (normalizeTerrainStyleId(tileStyleRaw) || style)
    : (tileStyleRaw || style);
  const tileSize = Math.min(width, height, baseSize);
  if(tileSize <= 0){
    ctx.fillStyle = palette.ground || '#6b4d2f';
    ctx.fillRect(left, top, width, height);
    if(showHitboxes){
      drawHitboxOutline(ctx, left, top, width, height, {
        strokeStyle: palette.blockHitboxColor || '#ffe066',
        lineWidth: Math.max(1.5, Math.min(width, height) * 0.08),
        alpha: 0.65
      });
    }
    return;
  }
  const stepsX = Math.max(1, Math.round(width / tileSize));
  const stepsY = Math.max(1, Math.round(height / tileSize));
  for(let sy=0; sy<stepsY; sy++){
    for(let sx=0; sx<stepsX; sx++){
      const blockLeft = left + sx * tileSize;
      const blockTop = top + sy * tileSize;
      const blockNeighbors = {
        leftOpen: sx === 0,
        rightOpen: sx === stepsX - 1,
        aboveOpen: sy === 0,
        belowOpen: sy === stepsY - 1,
        aboveLeftOpen: sy === 0 && sx === 0,
        aboveRightOpen: sy === 0 && sx === stepsX - 1,
        belowLeftOpen: sy === stepsY - 1 && sx === 0,
        belowRightOpen: sy === stepsY - 1 && sx === stepsX - 1
      };
      drawTerrainBlock(ctx, rectStyle, palette, blockLeft, blockTop, tileSize, blockNeighbors, sy, sx);
    }
  }
  if(showHitboxes && width > 0 && height > 0){
    drawHitboxOutline(ctx, left, top, width, height, {
      strokeStyle: palette.blockHitboxColor || '#ffe066',
      lineWidth: Math.max(1.5, Math.min(width, height) * 0.06),
      alpha: 0.65
    });
  }
}

function drawInteractiveObjects(world, ctx){
  if(!world) return;
  const palette = currentLevelPalette(world);
  drawToggleBlocks(world, ctx, palette);
  drawPlatformObjects(world, ctx, palette);
  drawHazardObjects(world, ctx);
  drawCrumbleWalls(world, ctx, palette);
}

function drawHitboxOutline(ctx, left, top, width, height, options={}){
  if(!ctx || !(width > 0 && height > 0)) return;
  const strokeStyle = options.strokeStyle || '#ffe066';
  const lineWidth = options.lineWidth !== undefined ? options.lineWidth : 2;
  const alpha = options.alpha !== undefined ? options.alpha : 0.6;
  const dash = Array.isArray(options.dash) ? options.dash : null;
  const inset = options.inset || 0;
  const renderLeft = left + inset;
  const renderTop = top + inset;
  const renderWidth = Math.max(0, width - inset * 2);
  const renderHeight = Math.max(0, height - inset * 2);
  if(!(renderWidth > 0 && renderHeight > 0)) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  if(dash) ctx.setLineDash(dash);
  ctx.strokeRect(renderLeft + 0.5, renderTop + 0.5, Math.max(0, renderWidth - 1), Math.max(0, renderHeight - 1));
  ctx.restore();
}

function toggleBlockHasContact(world, block, points){
  if(!world || !block) return false;
  const width = block.w ?? block.width ?? 0;
  const height = block.h ?? block.height ?? 0;
  if(!(width > 0 && height > 0)) return false;
  const left = block.x ?? block.left ?? 0;
  const top = block.y ?? block.top ?? 0;
  const right = left + width;
  const contactPoints = Array.isArray(points) ? points : (Array.isArray(world.points) ? world.points : []);
  if(!contactPoints.length) return false;
  const baseSlack = Math.max(3, height * 0.1);
  for(const point of contactPoints){
    if(!point) continue;
    const px = Number.isFinite(point.x) ? point.x : null;
    const py = Number.isFinite(point.y) ? point.y : null;
    if(px === null || py === null) continue;
    const radius = Math.max(0, point.terrainRadius ?? point.radius ?? 0);
    if(!(radius > 0)) continue;
    const bottom = py + radius;
    const topEdge = py - radius;
    const blockBottom = top + height;
    const verticalSlack = Math.max(baseSlack, radius * 0.55);
    const contactTop = top - verticalSlack;
    const insideBlock = px >= left && px <= right && py >= top && py <= blockBottom;
    if(insideBlock) return true;
    const horizontalMargin = Math.max(2, radius * 0.4);
    const nearHorizontal = px >= left - horizontalMargin && px <= right + horizontalMargin;
    const touchesTop = bottom >= contactTop && bottom <= top + verticalSlack;
    if(nearHorizontal && touchesTop && (point.grounded || point.preGroundContact)) return true;
    if(nearHorizontal && topEdge <= blockBottom + verticalSlack && topEdge >= blockBottom - verticalSlack){
      return true;
    }
    const vy = Number.isFinite(point.vy) ? point.vy : 0;
    if(nearHorizontal && touchesTop && vy >= -40) return true;
    const closestX = clamp(px, left, right);
    const closestY = clamp(py, top, blockBottom);
    const dx = px - closestX;
    const dy = py - closestY;
    const contactRadius = radius + Math.max(1.5, radius * 0.25);
    if(dx * dx + dy * dy <= contactRadius * contactRadius) return true;
  }
  return false;
}

function drawToggleBlocks(world, ctx, palette){
  const blocks = Array.isArray(world.toggleBlocks) ? world.toggleBlocks : [];
  if(!blocks.length) return;
  const accent = palette.blockAccent || '#6bd1ff';
  const shade = palette.blockShade || 'rgba(0,0,0,0.35)';
  const highlight = palette.blockHighlight || 'rgba(255,255,255,0.15)';
  const fadeColor = 'rgba(255,255,255,0.1)';
  const contactPoints = Array.isArray(world.points) ? world.points : [];
  const contactColor = '#3c8dff';
  const showHitboxes = !!(world?.gameplayFlags?.showHitboxes);
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const block of blocks){
    if(!block) continue;
    if(activeScreenIndex !== null && block.screenIndex !== undefined && block.screenIndex !== activeScreenIndex) continue;
    const x = block.x ?? 0;
    const y = block.y ?? 0;
    const width = block.w ?? 0;
    const height = block.h ?? 0;
    const visibility = clamp(block.visibility ?? (block.active ? 1 : 0), 0, 1);
    const baseColor = block.color || accent;
    const blockShade = block.shadeColor || shade;
    const blockHighlight = block.highlightColor || highlight;
    const backColor = block.backgroundColor || fadeColor;
    ctx.save();
    ctx.globalAlpha = block.active ? 1 : Math.max(0.28, visibility * 0.55);
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
    const shadowHeight = Math.max(6, height * 0.32);
    ctx.save();
    ctx.globalAlpha = block.active ? 0.85 : Math.max(0.22, visibility * 0.4);
    ctx.fillStyle = blockShade;
    ctx.fillRect(x, y + height - shadowHeight, width, shadowHeight);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = block.active ? 0.8 : Math.max(0.18, visibility * 0.3);
    ctx.fillStyle = blockHighlight;
    ctx.fillRect(x, y, width, Math.max(4, height * 0.18));
    ctx.restore();
    if(!block.active){
      ctx.save();
      ctx.globalAlpha = Math.max(0.14, visibility * 0.3);
      ctx.fillStyle = block.fadeColor || backColor;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    ctx.restore();
    if(showHitboxes && width > 0 && height > 0){
      const hitboxAlpha = block.active ? 0.9 : Math.max(0.4, visibility * 0.65);
      const hasContact = toggleBlockHasContact(world, block, contactPoints);
      drawHitboxOutline(ctx, x, y, width, height, {
        strokeStyle: hasContact ? contactColor : (block.hitboxColor || (block.active ? '#2cffec' : '#ff71aa')),
        lineWidth: Math.max(1.5, Math.min(width, height) * 0.04),
        alpha: hitboxAlpha,
        dash: block.active ? null : [6, 6]
      });
    }
  }
}

function drawPlatformObjects(world, ctx, palette){
  const platforms = Array.isArray(world.platforms) ? world.platforms : [];
  if(!platforms.length) return;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const platform of platforms){
    if(!platform) continue;
    if(activeScreenIndex !== null && platform.screenIndex !== undefined && platform.screenIndex !== activeScreenIndex) continue;
    const x = platform.x ?? 0;
    const y = platform.y ?? 0;
    const width = platform.w ?? 60;
    const height = platform.h ?? 5;
    const accent = palette.accent || '#6bd1ff';
    const topHeight = Math.max(3, height * 0.4);
    const totalHeight = height + topHeight;
    const top = y - topHeight;
    const base = '#1b2436';
    const shade = '#0f141f';
    const accentShade = darkenColor(accent, 0.3);
    const paletteMap = { T: accentShade, A: accent, B: base, S: shade };
    drawPixelPattern(ctx, PLATFORM_PIXEL_SPRITE, paletteMap, x, top, width, totalHeight);
    const shadowHeight = Math.max(2, Math.round(height * 0.4));
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, y + height, width, shadowHeight);
  }
}

function drawHazardObjects(world, ctx){
  const hazards = Array.isArray(world.hazards) ? world.hazards : [];
  if(!hazards.length) return;
  const now = nowMs();
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const hazard of hazards){
    if(!hazard) continue;
    if(activeScreenIndex !== null && hazard.screenIndex !== undefined && hazard.screenIndex !== activeScreenIndex) continue;
    switch(hazard.type){
      case 'spikes':
        drawSpikeHazardSprite(ctx, hazard, now);
        break;
      case 'windLift':
        drawWindLiftHazard(ctx, hazard, now);
        break;
      case 'steamVent':
        drawSteamVentHazard(ctx, hazard, now);
        break;
      case 'chronoField':
        drawChronoFieldHazard(ctx, hazard, now);
        break;
      case 'chronosphere':
        drawChronosphereHazard(ctx, hazard, now);
        break;
      case 'auricBeacon':
        drawAuricBeaconHazard(ctx, hazard, now);
        break;
      case 'chronoFlySwarm':
        drawChronoFlySwarmHazard(ctx, hazard, now);
        break;
    }
  }
}

function drawSpikeHazardSprite(ctx, hazard, now){
  const x = hazard.x ?? 0;
  const y = hazard.y ?? 0;
  const width = hazard.w ?? 30;
  const height = hazard.h ?? 14;
  const pulse = 0.6 + Math.sin(now / 160) * 0.2;
  const spikeBase = '#ff5266';
  const spikeHighlight = lightenColor(spikeBase, 0.25 + pulse * 0.15);
  const spikeBody = darkenColor(spikeBase, 0.18);
  const spikeShadow = darkenColor(spikeBase, 0.38);
  const paletteMap = { C: spikeHighlight, B: spikeBody, S: spikeShadow };
  drawPixelPattern(ctx, SPIKE_PIXEL_SPRITE, paletteMap, x, y, width, height);
}

function drawWindLiftHazard(ctx, hazard, now){
  const x = hazard.x ?? 0;
  const y = hazard.y ?? 0;
  const width = hazard.w ?? 48;
  const height = hazard.h ?? 140;
  const base = hazard.coreColor || '#68e0a3';
  const swirl = hazard.swirlColor || lightenColor(base, 0.35);
  const pulse = clamp(hazard.pulse ?? 0, 0, 1);
  ctx.save();
  const bodyGradient = ctx.createLinearGradient(x, y + height, x, y);
  bodyGradient.addColorStop(0, darkenColor(base, 0.4));
  bodyGradient.addColorStop(0.35, base);
  bodyGradient.addColorStop(1, lightenColor(swirl, 0.3 + pulse * 0.2));
  ctx.globalAlpha = 0.28 + pulse * 0.32;
  ctx.fillStyle = bodyGradient;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 0.6 + pulse * 0.25;
  ctx.strokeStyle = lightenColor(swirl, 0.2 + pulse * 0.1);
  ctx.lineWidth = Math.max(1.5, width * 0.08);
  const waveCount = 3;
  for(let i=0;i<waveCount;i++){
    const offset = (now / 360 + i * 0.42) % 1;
    const waveY = y + height * (1 - offset);
    ctx.beginPath();
    ctx.moveTo(x + width * 0.1, waveY);
    ctx.bezierCurveTo(
      x + width * 0.25,
      waveY - height * 0.18,
      x + width * 0.75,
      waveY + height * 0.18,
      x + width * 0.9,
      waveY
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawSteamVentHazard(ctx, hazard, now){
  const x = hazard.x ?? 0;
  const y = hazard.y ?? 0;
  const width = hazard.w ?? 60;
  const height = hazard.h ?? 120;
  const baseHeight = Math.max(12, height * 0.3);
  const casing = hazard.baseColor || '#1b3342';
  const ventColor = hazard.ventColor || '#7fe1ff';
  ctx.save();
  ctx.fillStyle = darkenColor(casing, 0.15);
  ctx.fillRect(x, y + height - baseHeight, width, baseHeight);
  ctx.fillStyle = casing;
  ctx.fillRect(x + width * 0.06, y + height - baseHeight - 6, width * 0.88, 6);
  if(hazard.active){
    const plumeHeight = height - baseHeight + 18;
    const sway = Math.sin(now / 340) * width * 0.12;
    ctx.globalAlpha = 0.55 + clamp(hazard.pulse ?? 0, 0, 1) * 0.35;
    const plumeGradient = ctx.createLinearGradient(x, y + height - baseHeight, x, y - plumeHeight * 0.25);
    plumeGradient.addColorStop(0, lightenColor(ventColor, 0.05));
    plumeGradient.addColorStop(1, lightenColor(ventColor, 0.5));
    ctx.fillStyle = plumeGradient;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.18, y + height - baseHeight);
    ctx.quadraticCurveTo(x + width * 0.5 + sway, y - plumeHeight * 0.4, x + width * 0.82, y + height - baseHeight);
    ctx.lineTo(x + width * 0.72, y + height - baseHeight);
    ctx.quadraticCurveTo(x + width * 0.5 + sway * 0.7, y - plumeHeight * 0.55, x + width * 0.28, y + height - baseHeight);
    ctx.closePath();
    ctx.fill();
  }else{
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = lightenColor(casing, 0.4);
    ctx.fillRect(x + width * 0.25, y + height - baseHeight - 10, width * 0.5, 6);
  }
  ctx.restore();
}

function drawChronosphereHazard(ctx, hazard, now){
  const centerX = Number.isFinite(hazard.centerX) ? hazard.centerX : ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = Number.isFinite(hazard.renderY) ? hazard.renderY : (Number.isFinite(hazard.centerY) ? hazard.centerY : ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5));
  const radius = Math.max(24, hazard.radius ?? 300);
  const baseOrbRadius = Number.isFinite(hazard.orbRadius) ? hazard.orbRadius : 15;
  const orbRadius = Math.max(12, baseOrbRadius);
  const pulse = clamp(hazard.pulse ?? 0, 0, 1);
  const accent = hazard.accentColor || '#ffe0a6';
  const glow = hazard.glowColor || '#f6f9ff';
  const orbitAlpha = hazard.playerInside ? 0.45 + pulse * 0.32 : 0.22 + pulse * 0.24;
  ctx.save();
  ctx.globalAlpha = orbitAlpha;
  const aura = ctx.createRadialGradient(centerX, centerY, radius * 0.35, centerX, centerY, radius);
  aura.addColorStop(0, 'rgba(255,255,255,0.24)');
  aura.addColorStop(0.65, 'rgba(255,255,255,0.08)');
  aura.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.32 + pulse * 0.28;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, radius * 0.045);
  ctx.setLineDash([radius * 0.22, radius * 0.12]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
  const bob = Math.sin((hazard.phase ?? 0) + now * 0.0015);
  const bobSource = hazard.floatAmplitude !== undefined
    ? Math.abs(hazard.floatAmplitude) * 0.4
    : orbRadius * 0.35;
  const orbY = centerY + bob * Math.max(4, bobSource);
  const spriteReady = isTerrainImageReady(CHRONOSPHERE_IMAGE);
  const spriteSize = Math.max(orbRadius * 2, 30);
  if(spriteReady){
    ctx.save();
    ctx.globalAlpha = 0.9 + pulse * 0.08;
    ctx.drawImage(
      CHRONOSPHERE_IMAGE,
      centerX - spriteSize * 0.5,
      orbY - spriteSize * 0.5,
      spriteSize,
      spriteSize
    );
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28 + pulse * 0.24;
    const glowGradient = ctx.createRadialGradient(centerX, orbY, spriteSize * 0.2, centerX, orbY, spriteSize * 0.7);
    glowGradient.addColorStop(0, accent);
    glowGradient.addColorStop(0.6, glow);
    glowGradient.addColorStop(1, 'rgba(10, 8, 22, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, orbY, orbRadius * 1.05, 0, TAU);
    ctx.fill();
    ctx.restore();
  }else{
    ctx.save();
    ctx.globalAlpha = 0.82 + pulse * 0.15;
    const orbGradient = ctx.createRadialGradient(centerX, orbY, orbRadius * 0.35, centerX, orbY, orbRadius);
    orbGradient.addColorStop(0, glow);
    orbGradient.addColorStop(0.5, accent);
    orbGradient.addColorStop(1, 'rgba(10, 8, 22, 0.85)');
    ctx.fillStyle = orbGradient;
    ctx.beginPath();
    ctx.arc(centerX, orbY, orbRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.5 + pulse * 0.35;
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(1.6, orbRadius * 0.22);
  ctx.beginPath();
  ctx.arc(centerX, orbY, orbRadius * (1 + pulse * 0.28), 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawChronoFieldHazard(ctx, hazard, now){
  const x = hazard.x ?? 0;
  const y = hazard.y ?? 0;
  const width = hazard.w ?? 96;
  const height = hazard.h ?? 128;
  const shimmer = hazard.shimmerColor || '#f7c978';
  const accent = hazard.accentColor || '#ffd27a';
  const pulse = clamp(hazard.pulse ?? 0, 0, 1);
  ctx.save();
  const restoreFilter = typeof pushCanvasFilter === 'function'
    ? pushCanvasFilter(ctx, 'invert(1)')
    : null;
  ctx.globalAlpha = 0.2 + pulse * 0.25;
  ctx.fillStyle = shimmer;
  ctx.fillRect(x, y, width, height);
  const streakAlpha = 0.22 + pulse * 0.2;
  ctx.globalAlpha = streakAlpha;
  ctx.fillStyle = lightenColor(accent, 0.2);
  const shift = (hazard.phase ?? 0) * 80 + now * 0.015;
  const streakHeight = Math.max(8, height * 0.12);
  for(let i=0;i<4;i++){
    const offset = ((shift + i * 90) % height);
    ctx.fillRect(x, y + offset, width, streakHeight);
  }
  ctx.globalAlpha = 0.4 + pulse * 0.3;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.strokeRect(x, y, width, height);
  if(restoreFilter) restoreFilter();
  ctx.restore();
}

function drawChronoFlySwarmHazard(ctx, hazard, now){
  const centerX = hazard.centerX ?? ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = hazard.centerY ?? ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5);
  const radius = Math.max(40, hazard.radius ?? Math.max(hazard.w ?? 0, hazard.h ?? 0));
  const pulse = clamp(hazard.pulse ?? 0, 0, 1);
  const framesReady = isTerrainImageReady(CHRONO_FLY_JAR_FRAMES_IMAGE);
  const frameSize = CHRONO_FLY_JAR_FRAME_SIZE;
  const frameCount = framesReady
    ? Math.max(1, Math.floor((CHRONO_FLY_JAR_FRAMES_IMAGE.width || 0) / frameSize))
    : 0;
  ctx.save();
  const restoreFilter = typeof pushCanvasFilter === 'function'
    ? pushCanvasFilter(ctx, 'invert(1)')
    : null;
  const aura = ctx.createRadialGradient(centerX, centerY, radius * 0.25, centerX, centerY, radius);
  aura.addColorStop(0, 'rgba(160, 230, 255, 0.45)');
  aura.addColorStop(0.65, 'rgba(150, 220, 255, 0.18)');
  aura.addColorStop(1, 'rgba(120, 200, 255, 0)');
  ctx.globalAlpha = 0.22 + pulse * 0.32;
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.6 + pulse * 0.3;
  ctx.strokeStyle = hazard.ringColor || '#8dd9ff';
  ctx.lineWidth = Math.max(2, radius * 0.06);
  ctx.setLineDash([radius * 0.18, radius * 0.12]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * (0.85 + pulse * 0.08), 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.75 + pulse * 0.2;
  ctx.strokeStyle = hazard.glowColor || '#d0f1ff';
  ctx.lineWidth = Math.max(1.4, radius * 0.04);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.55, 0, TAU);
  ctx.stroke();
  if(restoreFilter) restoreFilter();
  const swarmState = hazard.swarmState;
  if(swarmState && Array.isArray(swarmState.flies) && swarmState.flies.length){
    const swarmHalf = swarmState.flyHalfSize ?? CHRONO_FLY_JAR_PREVIEW_HALF_SIZE;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(const fly of swarmState.flies){
      if(!fly) continue;
      const alpha = clamp(0.55 + Math.sin(fly.flicker || 0) * 0.25, 0.2, 1);
      ctx.globalAlpha = alpha;
      const px = fly.x ?? centerX;
      const py = fly.y ?? centerY;
      if(frameCount > 0){
        const phase = Number.isFinite(fly.framePhase) ? fly.framePhase : 0;
        const frame = Math.abs(Math.floor(phase)) % frameCount;
        const sx = frame * frameSize;
        ctx.drawImage(
          CHRONO_FLY_JAR_FRAMES_IMAGE,
          sx,
          0,
          frameSize,
          frameSize,
          px - swarmHalf,
          py - swarmHalf,
          swarmHalf * 2,
          swarmHalf * 2
        );
      }else{
        ctx.fillStyle = 'rgba(120, 218, 255, 0.95)';
        ctx.fillRect(px - swarmHalf, py - swarmHalf, swarmHalf * 2, swarmHalf * 2);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawAuricBeaconHazard(ctx, hazard, now){
  const centerX = hazard.centerX ?? ((hazard.x ?? 0) + (hazard.w ?? 0) * 0.5);
  const centerY = hazard.centerY ?? ((hazard.y ?? 0) + (hazard.h ?? 0) * 0.5);
  const radius = Math.max(24, hazard.radius ?? Math.max(hazard.w ?? 0, hazard.h ?? 0));
  const pulse = clamp(hazard.pulseStrength ?? 0, 0, 1);
  const ember = hazard.emberColor || '#f1d86a';
  const flare = hazard.flareColor || lightenColor(ember, 0.35);
  ctx.save();
  const ring = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
  ring.addColorStop(0, flare);
  ring.addColorStop(0.6, lightenColor(ember, 0.1));
  ring.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.18 + pulse * 0.32;
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.7 + pulse * 0.25;
  const coreRadius = Math.max(12, radius * 0.2 + pulse * 12);
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, radius * 0.08);
  ctx.strokeStyle = flare;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(centerX, centerY, coreRadius * (1 + pulse * 0.4), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCrumbleWalls(world, ctx, palette){
  const walls = Array.isArray(world.breakables) ? world.breakables : [];
  if(!walls.length) return;
  const accent = palette.accent || '#6bd1ff';
  const baseColors = {
    wood: '#8f5e32',
    stone: '#aeb6c1',
    sandstone: '#d8c489',
    steel: '#9aa8b6',
    dirt: '#7b5a39'
  };
  const now = nowMs();
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  const crackStages = typeof BREAKABLE_MAX_CRACK_LEVEL === 'number' ? BREAKABLE_MAX_CRACK_LEVEL : 5;
  const drawSprite = (image, x, y, width, height)=>{
    if(!image || !isTerrainImageReady(image)) return false;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    if(typeof prevSmoothing === 'boolean') ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, width, height);
    if(typeof prevSmoothing === 'boolean') ctx.imageSmoothingEnabled = prevSmoothing;
    return true;
  };
  const resolveRequiredSprite = (wall)=>{
    if(!wall) return null;
    const required = wall.requiredDamageKind;
    if(!required) return null;
    const list = Array.isArray(required) ? required : [required];
    for(const entry of list){
      if(!entry) continue;
      const key = entry.toString().toLowerCase();
      if(key === 'necrotic') return BREAKABLE_BLOCK_ELEMENT_SPRITES.necrotic || null;
      if(key === 'war' && BREAKABLE_BLOCK_ELEMENT_SPRITES.physical) return BREAKABLE_BLOCK_ELEMENT_SPRITES.physical;
      if(BREAKABLE_BLOCK_ELEMENT_SPRITES[key]) return BREAKABLE_BLOCK_ELEMENT_SPRITES[key];
    }
    return null;
  };
  for(const wall of walls){
    if(!wall || wall.broken) continue;
    if(activeScreenIndex !== null && wall.screenIndex !== undefined && wall.screenIndex !== activeScreenIndex) continue;
    const width = Math.max(1, wall.w ?? 30);
    const height = Math.max(1, wall.h ?? 30);
    const shake = (wall.shake || 0) > 0 ? Math.sin(now * 22) * wall.shake * 4 : 0;
    const x = (wall.x ?? 0) + shake;
    const y = wall.y ?? 0;
    const maxHealth = Number.isFinite(wall.maxHealth) ? Math.max(0, wall.maxHealth) : null;
    const health = Number.isFinite(wall.health) ? Math.max(0, wall.health) : null;
    const damageRatio = maxHealth && maxHealth > 0 && health !== null
      ? 1 - clamp(health / maxHealth, 0, 1)
      : 0;
    const material = typeof resolveStructureMaterial === 'function' ? resolveStructureMaterial(wall) : (wall.material || 'dirt');
    const baseColor = baseColors[material] || baseColors.dirt;
    const strokeColor = darkenColor(baseColor, 0.38);
    const damageColor = lightenColor(baseColor, 0.25);
    const elementSprite = resolveRequiredSprite(wall);
    const materialSprite = material === 'sandstone' ? SANDSTONE_CRUMBLE_TILE_IMAGE : null;
    const baseSprite = elementSprite || materialSprite;
    const spriteDrawn = drawSprite(baseSprite, x, y, width, height);
    let tinted = false;
    if(!spriteDrawn){
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, width, height);
      const strokeWidth = Math.max(2, Math.min(width, height) * 0.12);
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(x + strokeWidth * 0.5, y + strokeWidth * 0.5, Math.max(0, width - strokeWidth), Math.max(0, height - strokeWidth));
      if(damageRatio > 0){
        ctx.save();
        ctx.globalAlpha = clamp(0.2 + damageRatio * 0.45, 0, 0.7);
        ctx.fillStyle = damageColor;
        ctx.fillRect(x, y, width, height);
        ctx.restore();
        tinted = true;
      }
    }
    let crackLevel = Number.isFinite(wall.crackLevel) ? wall.crackLevel : NaN;
    if(!Number.isFinite(crackLevel) && damageRatio > 0){
      crackLevel = Math.ceil(damageRatio * crackStages);
    }
    if(!Number.isFinite(crackLevel)) crackLevel = 0;
    crackLevel = clamp(Math.round(crackLevel), 0, crackStages);
    if(wall.crackLevel !== crackLevel) wall.crackLevel = crackLevel;
    let crackDrawn = false;
    if(crackLevel > 0){
      const crackSprite = BREAKABLE_BLOCK_CRACK_SPRITES[crackLevel] || null;
      crackDrawn = drawSprite(crackSprite, x, y, width, height);
      if(!crackDrawn && !spriteDrawn && damageRatio > 0 && !tinted){
        ctx.save();
        ctx.globalAlpha = clamp(0.22 + damageRatio * 0.48, 0, 0.75);
        ctx.fillStyle = damageColor;
        ctx.fillRect(x, y, width, height);
        ctx.restore();
        tinted = true;
      }
    }else if(spriteDrawn && damageRatio > 0){
      ctx.save();
      ctx.globalAlpha = clamp(0.18 + damageRatio * 0.32, 0, 0.45);
      ctx.fillStyle = 'rgba(255,255,255,1)';
      ctx.fillRect(x, y, width, height);
      ctx.restore();
      tinted = true;
    }
    if(world?.gameplayFlags?.showHitboxes){
      drawHitboxOutline(ctx, x, y, width, height, {
        strokeStyle: wall.hitboxColor || accent,
        lineWidth: Math.max(2, Math.min(width, height) * 0.12),
        alpha: 0.75
      });
    }
  }
}

function terrainCellNoise(row, col, variant=0){
  const seed = (row + 1) * 928371 + (col + 1) * 689287 + variant * 4217;
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function worldViewRect(world, camera, margin=0){
  if(!world) return null;
  const width = Number.isFinite(world?.width) ? world.width : null;
  const height = Number.isFinite(world?.height) ? world.height : null;
  if(!(width && height)) return null;
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const cam = camera || ensureCamera(world);
  const cx = Number.isFinite(cam?.x) ? cam.x : halfWidth;
  const cy = Number.isFinite(cam?.y) ? cam.y : halfHeight;
  return {
    left: cx - halfWidth - margin,
    right: cx + halfWidth + margin,
    top: cy - halfHeight - margin,
    bottom: cy + halfHeight + margin
  };
}

function rectsOverlap(a, b){
  if(!a || !b) return true;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function computeDecorBounds(prop, world, camera){
  if(!prop) return null;
  if(prop.type === 'starField'){
    const starState = prop.starFieldState;
    if(starState && starState.bounds){
      const bounds = starState.bounds;
      const width = Number.isFinite(bounds.width) ? bounds.width : (Number(prop.width) || 0);
      const height = Number.isFinite(bounds.height) ? bounds.height : (Number(prop.height) || 0);
      const left = Number.isFinite(bounds.left)
        ? bounds.left
        : ((Number(prop.x ?? prop.centerX) || 0) - width * 0.5);
      const top = Number.isFinite(bounds.top)
        ? bounds.top
        : ((Number(prop.baseY ?? prop.y) || 0) - height);
      const right = Number.isFinite(bounds.right) ? bounds.right : left + width;
      const bottom = Number.isFinite(bounds.bottom) ? bounds.bottom : top + height;
      return { left, right, top, bottom };
    }
  }
  let width = Number(prop.width);
  let height = Number(prop.height);
  let baseY = Number.isFinite(prop.baseY) ? prop.baseY : (Number.isFinite(prop.y) ? prop.y : null);
  let centerX = Number.isFinite(prop.x) ? prop.x : (Number.isFinite(prop.centerX) ? prop.centerX : null);
  if(Number.isFinite(width) && Number.isFinite(height) && Number.isFinite(centerX) && Number.isFinite(baseY)){
    const rotation = (Number(prop.rotation) || 0) * Math.PI / 180;
    if(rotation){
      const half = width * 0.5;
      const top = -height;
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const corners = [
        { x: -half, y: 0 },
        { x: half, y: 0 },
        { x: -half, y: top },
        { x: half, y: top }
      ];
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for(const corner of corners){
        const rx = corner.x * cos - corner.y * sin;
        const ry = corner.x * sin + corner.y * cos;
        if(rx < minX) minX = rx;
        if(rx > maxX) maxX = rx;
        if(ry < minY) minY = ry;
        if(ry > maxY) maxY = ry;
      }
      return {
        left: centerX + minX,
        right: centerX + maxX,
        top: baseY + minY,
        bottom: baseY + maxY
      };
    }
    const half = width * 0.5;
    return {
      left: centerX - half,
      right: centerX + half,
      top: baseY - height,
      bottom: baseY
    };
  }
  const radius = Number(prop.radius);
  if(Number.isFinite(radius) && Number.isFinite(centerX)){
    const cy = Number.isFinite(baseY) ? baseY - radius * 0.5 : (Number.isFinite(prop.y) ? prop.y : 0);
    return {
      left: centerX - radius,
      right: centerX + radius,
      top: cy - radius,
      bottom: cy + radius
    };
  }
  return null;
}

function drawDecor(world, ctx){
  if(!world.decor || !world.decor.length) return;
  const camera = ensureCamera(world);
  const view = worldViewRect(world, camera, 240);
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const prop of world.decor){
    if(!prop) continue;
    if(prop.hidden) continue;
    if(activeScreenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== activeScreenIndex) continue;
    if(prop.layer === 'foreground') continue;
    if(view){
      const bounds = computeDecorBounds(prop, world, camera);
      if(bounds && !rectsOverlap(bounds, view)) continue;
    }
    if(prop.type === 'raft') drawDecorRaft(ctx, prop);
    else if(prop.type === 'boat') drawDecorBoat(ctx, prop);
    else if(prop.type === 'crate') drawDecorCrate(ctx, prop);
    else if(prop.type === 'treasureChest') drawDecorTreasureChest(ctx, prop);
    else if(prop.type === 'swordPedestal') drawDecorSwordPedestal(ctx, prop);
    else if(prop.type === 'restingStick') drawDecorRestingStick(ctx, prop);
    else if(prop.type === 'sprout') drawDecorSprout(ctx, prop);
    else if(prop.type === 'tuft') drawDecorTuft(ctx, prop);
    else if(prop.type === 'torch') drawDecorTorch(ctx, prop);
    else if(prop.type === 'glowCrystal') drawDecorGlowCrystal(ctx, prop);
    else if(prop.type === 'ambientFireflies') drawDecorAmbientFireflies(ctx, prop);
    else if(prop.type === 'fireflyJarSwarm') drawDecorFireflyJarSwarm(ctx, prop);
    else if(prop.type === 'fireflyJar' || prop.type === 'hangingFireflyJar') drawDecorFireflyJar(ctx, prop);
    else if(prop.type === 'chronoFlyJar') drawDecorChronoFlyJar(ctx, prop);
    else if(prop.type === 'worldTreeBranch') drawDecorWorldTreeBranch(ctx, prop);
    else if(prop.type === 'canopyLeaves') drawDecorCanopyLeaves(ctx, prop);
    else if(prop.type === 'skillPedestal') drawDecorSkillPedestal(ctx, prop);
    else if(prop.type === 'shopkeeper') drawDecorShopkeeper(ctx, prop);
    else if(prop.type === 'lever') drawDecorLever(ctx, prop);
    else if(prop.type === 'spawner') drawDecorSpawner(ctx, prop);
    else if(prop.type === 'punchingBag') drawDecorPunchingBag(ctx, prop);
    else if(prop.type === 'waterSpout') drawDecorWaterSpout(ctx, prop);
    else if(prop.type === 'lavaSpout') drawDecorLavaSpout(ctx, prop);
    else if(prop.type === 'voidPortal') drawDecorVoidPortal(ctx, prop, world);
    else if(prop.type === 'voidSymbol') drawDecorVoidSymbol(ctx, prop, world);
    else if(prop.type === 'rainField') drawDecorRainField(ctx, prop, world, camera);
  }
}

function drawPhysicsBoxes(ctx, world){
  if(!world || !Array.isArray(world.physicsBoxes) || !world.physicsBoxes.length) return;
  ctx.save();
  const baseFill = '#9fb4f0';
  const baseStroke = '#30415a';
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 0.375;
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  ctx.fillStyle = baseFill;
  ctx.strokeStyle = baseStroke;
  ctx.lineWidth = Math.max(1, 2 * scale);
  for(const box of world.physicsBoxes){
    if(!box) continue;
    if(activeScreenIndex !== null && box.screenIndex !== undefined && box.screenIndex !== activeScreenIndex) continue;
    if(box.hidden) continue;
    const width = box.width ?? box.size ?? 0;
    const height = box.height ?? box.size ?? 0;
    if(!(width > 0 && height > 0)) continue;
    const centerX = Number.isFinite(box.x) ? box.x : 0;
    const centerY = Number.isFinite(box.y) ? box.y : 0;
    const left = centerX - width * 0.5;
    const top = centerY - height * 0.5;
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);
  }
  ctx.restore();
}

function drawForegroundDecor(world, ctx){
  if(!world.decor || !world.decor.length) return;
  const camera = ensureCamera(world);
  const view = worldViewRect(world, camera, 260);
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const prop of world.decor){
    if(!prop || prop.layer !== 'foreground') continue;
    if(activeScreenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== activeScreenIndex) continue;
    if(view){
      const bounds = computeDecorBounds(prop, world, camera);
      if(bounds && !rectsOverlap(bounds, view)) continue;
    }
    if(prop.type === 'foregroundShadow') drawDecorForegroundShadow(ctx, prop, world, camera);
    else if(prop.type === 'foregroundSunRays') drawDecorForegroundSunRays(ctx, prop, world, camera);
    else if(prop.type === 'rainField') drawDecorRainField(ctx, prop, world, camera);
  }
}

function drawStarFieldDecor(world, ctx){
  if(!world || !Array.isArray(world.decor) || !world.decor.length) return;
  const camera = ensureCamera(world);
  const view = worldViewRect(world, camera, 240);
  const activeScreenIndex = Number.isInteger(world.levelState?.screenIndex) ? world.levelState.screenIndex : null;
  for(const prop of world.decor){
    if(!prop || prop.type !== 'starField') continue;
    if(activeScreenIndex !== null && prop.screenIndex !== undefined && prop.screenIndex !== activeScreenIndex) continue;
    if(view){
      const bounds = computeDecorBounds(prop, world, camera);
      if(bounds && !rectsOverlap(bounds, view)) continue;
    }
    drawDecorStarField(ctx, prop, world, camera);
  }
}

function drawDecorForegroundShadow(ctx, prop, world, camera){
  if(!prop || !world) return;
  const width = Math.max(4, prop.width ?? 200);
  const height = Math.max(4, prop.height ?? Math.round(width * 0.75));
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const opacity = clamp(prop.opacity ?? 0.28, 0, 1);
  if(opacity <= 0) return;

  const fillColor = ensureOpaqueColor(prop.color || '#0f1116');
  const blurRadius = Math.max(0, prop.blurRadius ?? Math.max(width, height) * 0.08);
  const offsetX = 0;
  const offsetY = 0;
  const rotation = (prop.rotation || 0) * Math.PI / 180;
  const shape = typeof prop.shape === 'string' ? prop.shape.toLowerCase() : 'ellipse';
  const cornerRadius = prop.cornerRadius !== undefined ? Math.max(0, prop.cornerRadius) : Math.min(width, height) * 0.25;

  ctx.save();
  ctx.translate(centerX + offsetX, baseY + offsetY);
  if(rotation) ctx.rotate(rotation);

  const prevFilter = typeof ctx.filter === 'string' ? ctx.filter : 'none';
  ctx.filter = blurRadius > 0 ? `blur(${blurRadius}px)` : prevFilter;
  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = opacity;
  ctx.fillStyle = fillColor;

  if(shape === 'rect' || shape === 'rectangle'){
    ctx.fillRect(-width * 0.5, -height, width, height);
  }else if(shape === 'rounded' || shape === 'roundedrect' || shape === 'roundedrectangle'){
    const halfWidth = width * 0.5;
    const topY = -height;
    const bottomY = 0;
    const maxRadius = Math.min(halfWidth, height * 0.5);
    const radius = Math.min(cornerRadius, maxRadius);
    ctx.beginPath();
    ctx.moveTo(-halfWidth + radius, bottomY);
    ctx.lineTo(halfWidth - radius, bottomY);
    ctx.quadraticCurveTo(halfWidth, bottomY, halfWidth, bottomY - radius);
    ctx.lineTo(halfWidth, topY + radius);
    ctx.quadraticCurveTo(halfWidth, topY, halfWidth - radius, topY);
    ctx.lineTo(-halfWidth + radius, topY);
    ctx.quadraticCurveTo(-halfWidth, topY, -halfWidth, topY + radius);
    ctx.lineTo(-halfWidth, bottomY - radius);
    ctx.quadraticCurveTo(-halfWidth, bottomY, -halfWidth + radius, bottomY);
    ctx.closePath();
    ctx.fill();
  }else{
    ctx.beginPath();
    ctx.ellipse(0, -height * 0.5, width * 0.5, height * 0.5, 0, 0, TAU);
    ctx.fill();
  }

  ctx.globalCompositeOperation = prevComposite;
  ctx.filter = prevFilter;
  ctx.restore();
}

function drawDecorForegroundSunRays(ctx, prop, world, camera){
  if(!prop || !world) return;
  const width = Math.max(20, prop.width ?? 240);
  const height = Math.max(20, prop.height ?? 320);
  const centerX = prop.x ?? 0;
  const baseY = prop.baseY ?? prop.y ?? 0;
  const offsetX = 0;
  const offsetY = 0;
  const rotation = (prop.rotation || 0) * Math.PI / 180;
  const baseColor = ensureOpaqueColor(prop.color || '#ffe6a8');
  const rayCount = Math.max(1, Math.round(prop.rayCount ?? 5));
  const spread = Math.max(width * 0.5, prop.spread ?? width * 1.1);
  const rayWidth = Math.max(6, prop.rayWidth ?? spread / Math.max(1, rayCount) * 0.6);
  const topScale = clamp(prop.topScale !== undefined ? prop.topScale : 0.28, 0.05, 1);
  const bottomScale = Math.max(prop.bottomScale !== undefined ? prop.bottomScale : 1.7, 0.6);
  const gradientFocus = clamp(prop.gradientFocus !== undefined ? prop.gradientFocus : 0.46, 0, 1);
  const fadeTop = clamp(prop.fadeTop !== undefined ? prop.fadeTop : 0, 0, 1);
  const fadeBottom = clamp(prop.fadeBottom !== undefined ? prop.fadeBottom : 0.08, 0, 1);
  const blur = Math.max(0, prop.blurRadius ?? Math.max(width, height) * 0.05);
  const blendMode = prop.blendMode || 'screen';
  const baseAlpha = clamp(prop.opacity ?? 0.32, 0, 1);
  const pulseAmount = clamp(prop.pulseAmount ?? 0.18, 0, 1);
  const pulseSpeed = Math.max(0, prop.pulseSpeed ?? 0.7);
  const phaseStep = prop.phaseStep ?? 0.8;
  const phaseBase = prop.phase ?? 0;
  const waveAmplitude = prop.waveAmplitude ?? spread * 0.08;
  const waveSpeed = Math.max(0, prop.waveSpeed ?? 0.28);
  const driftAmplitude = prop.driftAmplitude ?? spread * 0.12;
  const driftSpeed = Math.max(0, prop.driftSpeed ?? 0.1);
  const time = world.levelState?.elapsedTime ?? 0;

  const prevComposite = ctx.globalCompositeOperation;
  const prevFilter = typeof ctx.filter === 'string' ? ctx.filter : 'none';
  const prevAlpha = ctx.globalAlpha;

  ctx.save();
  ctx.translate(centerX + offsetX, baseY + offsetY);
  if(rotation) ctx.rotate(rotation);
  ctx.globalCompositeOperation = blendMode;
  if(blur > 0) ctx.filter = `blur(${blur}px)`;

  for(let i=0; i<rayCount; i++){
    const normalized = rayCount === 1 ? 0 : (i / (rayCount - 1)) - 0.5;
    const phase = phaseBase + i * phaseStep;
    const waveOffset = waveAmplitude ? Math.sin(time * waveSpeed + phase) * waveAmplitude : 0;
    const driftOffset = driftAmplitude ? Math.sin(time * driftSpeed + phase * 0.67) * driftAmplitude : 0;
    const center = normalized * spread + waveOffset + driftOffset;
    const topWidth = Math.max(2, rayWidth * topScale);
    const bottomWidth = Math.max(topWidth + 2, rayWidth * bottomScale);
    const gradient = ctx.createLinearGradient(0, -height, 0, 0);
    gradient.addColorStop(0, colorWithAlpha(baseColor, fadeTop));
    gradient.addColorStop(gradientFocus, colorWithAlpha(baseColor, 1));
    gradient.addColorStop(1, colorWithAlpha(baseColor, fadeBottom));
    ctx.fillStyle = gradient;
    const alpha = pulseAmount ? baseAlpha * (1 + Math.sin(time * pulseSpeed + phase) * pulseAmount) : baseAlpha;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.beginPath();
    ctx.moveTo(center - topWidth * 0.5, -height);
    ctx.lineTo(center + topWidth * 0.5, -height);
    ctx.lineTo(center + bottomWidth * 0.5, 0);
    ctx.lineTo(center - bottomWidth * 0.5, 0);
    ctx.closePath();
    ctx.fill();
  }

  ctx.filter = prevFilter;
  ctx.globalCompositeOperation = prevComposite;
  ctx.globalAlpha = prevAlpha;
  ctx.restore();
}

function drawDecorStarField(ctx, prop, world, camera){
  if(!prop || !world) return;
  const fallbackWidth = Math.max(4, Number(prop.width) || 200);
  const fallbackHeight = Math.max(4, Number(prop.height) || 200);
  let width = fallbackWidth;
  let height = fallbackHeight;
  let centerX = Number.isFinite(prop.x) ? prop.x : (Number.isFinite(prop.centerX) ? prop.centerX : 0);
  let baseY = Number.isFinite(prop.baseY ?? prop.y) ? (prop.baseY ?? prop.y) : 0;
  const state = ensureStarFieldState(prop);
  const bounds = resolveStarFieldBounds(world, prop, camera, null);
  if(bounds){
    width = Math.max(4, Number.isFinite(bounds.width) ? bounds.width : width);
    height = Math.max(4, Number.isFinite(bounds.height) ? bounds.height : height);
    if(Number.isFinite(bounds.centerX)) centerX = bounds.centerX;
    if(Number.isFinite(bounds.baseY)) baseY = bounds.baseY;
    if(state) state.bounds = bounds;
  }else if(state){
    state.bounds = null;
  }
  const top = baseY - height;
  const stars = Array.isArray(prop.stars) ? prop.stars : [];
  const baseAlpha = clamp(prop.baseAlpha ?? 1, 0, 1);
  const twinkleAmount = clamp(prop.twinkleAmount ?? 0, 0, 1);
  const twinkleSpeed = prop.twinkleSpeed !== undefined ? Math.max(0, prop.twinkleSpeed) : 0.6;
  const time = world.levelState?.elapsedTime ?? 0;
  const baseWidth = Number(prop.starFieldBaseWidth) || fallbackWidth;
  const baseHeight = Number(prop.starFieldBaseHeight) || fallbackHeight;
  const scaleX = baseWidth > 0 ? width / baseWidth : 1;
  const scaleY = baseHeight > 0 ? height / baseHeight : 1;
  const sizeScale = Math.max(0.25, Math.sqrt(Math.max(scaleX, 0) * Math.max(scaleY, 0)) || 1);

  const parallaxXRaw = Number(prop.parallax);
  const parallaxYRaw = Number(prop.parallaxY);
  const parallaxX = Number.isFinite(parallaxXRaw) && parallaxXRaw !== 0 ? Math.abs(parallaxXRaw) : 1;
  const parallaxY = Number.isFinite(parallaxYRaw) && parallaxYRaw !== 0 ? Math.abs(parallaxYRaw) : parallaxX;
  const anchorCenterX = centerX;
  const anchorCenterY = top + height * 0.5;
  const activeCamera = camera || ensureCamera(world);
  let translateX = centerX;
  let translateY = top;
  if(activeCamera && prop.followCamera !== false){
    const cameraX = Number.isFinite(activeCamera.x) ? activeCamera.x : anchorCenterX;
    const cameraY = Number.isFinite(activeCamera.y) ? activeCamera.y : anchorCenterY;
    const followX = 1 / parallaxX;
    const followY = 1 / parallaxY;
    translateX += (anchorCenterX - cameraX) * (1 - followX);
    translateY += (anchorCenterY - cameraY) * (1 - followY);
  }

  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 1;
  for(const star of stars){
    if(!star) continue;
    const base = clamp(star.alpha ?? 1, 0, 1);
    if(base <= 0) continue;
    const starColor = star.color || prop.color || '#ffffff';
    let x;
    if(star.nx !== undefined){
      x = star.nx * width;
    }else if(baseWidth > 0){
      x = (star.x ?? 0) * scaleX;
    }else{
      x = star.x ?? 0;
    }
    let y;
    if(star.ny !== undefined){
      y = star.ny * height;
    }else if(baseHeight > 0){
      y = (star.y ?? 0) * scaleY;
    }else{
      y = star.y ?? 0;
    }
    let alpha = base * baseAlpha;
    if(twinkleAmount > 0){
      const phase = star.phase ?? 0;
      const wave = (Math.sin(time * twinkleSpeed + phase) + 1) * 0.5;
      const blend = (1 - twinkleAmount) + wave * twinkleAmount;
      alpha *= clamp(blend, 0, 1);
    }
    if(alpha <= 0) continue;
    const baseSize = Math.max(1, star.baseSize ?? star.size ?? 1);
    const size = Math.max(1, baseSize * sizeScale);
    const half = size * 0.5;
    const glowAmount = clamp(star.glow ?? 0, 0, 1);
    if(glowAmount > 0){
      const glowSize = Math.max(size * (1.6 + glowAmount * 1.6), size + 2);
      ctx.globalAlpha = alpha * 0.35 * (0.6 + glowAmount * 0.8);
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.ellipse(x, y, glowSize * 0.5, glowSize * 0.5, 0, 0, TAU);
      ctx.fill();
    }
    const shape = typeof star.shape === 'string' ? star.shape : 'round';
    if(shape === 'spark'){
      const sparkHalf = Math.max(half, size * 0.8);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = starColor;
      ctx.lineWidth = Math.max(1, size * 0.32);
      ctx.beginPath();
      ctx.moveTo(x - sparkHalf, y);
      ctx.lineTo(x + sparkHalf, y);
      ctx.moveTo(x, y - sparkHalf);
      ctx.lineTo(x, y + sparkHalf);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.65;
      ctx.beginPath();
      ctx.moveTo(x - sparkHalf * 0.7, y - sparkHalf * 0.7);
      ctx.lineTo(x + sparkHalf * 0.7, y + sparkHalf * 0.7);
      ctx.moveTo(x - sparkHalf * 0.7, y + sparkHalf * 0.7);
      ctx.lineTo(x + sparkHalf * 0.7, y - sparkHalf * 0.7);
      ctx.stroke();
    }else if(shape === 'square'){
      ctx.globalAlpha = alpha;
      ctx.fillStyle = starColor;
      ctx.fillRect(x - half, y - half, size, size);
    }else{
      ctx.globalAlpha = alpha;
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.ellipse(x, y, half, half, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawDecorRainField(ctx, prop, world, camera){
  if(!ctx || !prop) return;
  const defaultWidth = Math.max(10, prop.width ?? 200);
  const defaultHeight = Math.max(10, prop.height ?? 200);
  const defaultCenterX = prop.x ?? 0;
  const defaultBaseY = prop.baseY ?? prop.y ?? 0;
  let width = defaultWidth;
  let height = defaultHeight;
  let left = defaultCenterX - defaultWidth * 0.5;
  let top = defaultBaseY - defaultHeight;
  const state = ensureRainFieldState(prop);
  const bounds = state?.bounds || resolveRainFieldBounds(world, prop, camera);
  if(bounds){
    if(Number.isFinite(bounds.width)) width = Math.max(10, bounds.width);
    if(Number.isFinite(bounds.height)) height = Math.max(10, bounds.height);
    if(Number.isFinite(bounds.left)) left = bounds.left;
    if(Number.isFinite(bounds.top)) top = bounds.top;
  }

  ctx.save();
  ctx.globalAlpha = 1;

  if(typeof prop.overlayColor === 'string'){
    const overlayAlpha = clamp(Number(prop.overlayAlpha ?? 0.12), 0, 1);
    if(overlayAlpha > 0){
      ctx.globalAlpha = overlayAlpha;
      ctx.fillStyle = prop.overlayColor;
      ctx.fillRect(left, top, width, height);
      ctx.globalAlpha = 1;
    }
  }

  const defaultThickness = Math.max(0.4, Number(prop.dropThickness) || 1.4);
  const baseAlpha = clamp(Number.isFinite(prop.dropAlpha) ? prop.dropAlpha : 0.88, 0, 1.2);
  const dropColor = prop.dropColor || 'rgba(220, 224, 255, 0.7)';

  if(state && Array.isArray(state.drops) && state.drops.length){
    ctx.strokeStyle = dropColor;
    ctx.lineCap = 'round';
    for(const drop of state.drops){
      const alpha = clamp(drop.alpha ?? baseAlpha, 0, 1.2);
      if(alpha <= 0) continue;
      const vx = Number(drop.vx) || 0;
      const vy = Number(drop.vy) || 0;
      const speed = Math.hypot(vx, vy) || 1;
      const tailX = (vx / speed) * drop.length;
      const tailY = (vy / speed) * drop.length;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.lineWidth = Math.max(0.25, drop.thickness ?? defaultThickness);
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - tailX, drop.y - tailY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if(state && Array.isArray(state.splashes) && state.splashes.length){
    const splashColor = prop.splashColor || 'rgba(214, 226, 255, 0.75)';
    ctx.strokeStyle = splashColor;
    for(const splash of state.splashes){
      const maxLife = splash.maxLife || 0.001;
      const progress = clamp(maxLife > 0 ? (splash.life || 0) / maxLife : 0, 0, 1);
      const alpha = clamp((splash.alpha ?? baseAlpha) * (1 - progress), 0, 1);
      if(alpha <= 0) continue;
      const radius = Math.max(4, splash.radius ?? 14) * (0.85 + progress * 0.4);
      const thickness = Math.max(0.3, (splash.thickness ?? defaultThickness) * (1 - progress * 0.5));
      ctx.globalAlpha = alpha;
      ctx.lineWidth = thickness;
      ctx.beginPath();
      ctx.ellipse(splash.x, splash.y + 1, radius, radius * 0.32, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const mistAlpha = clamp(Number(prop.mistAlpha) || 0, 0, 1);
  if(mistAlpha > 0){
    ctx.globalAlpha = mistAlpha;
    ctx.fillStyle = prop.mistColor || 'rgba(12, 12, 18, 0.6)';
    ctx.fillRect(left, top, width, height);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawDecorCrate(ctx, prop){
  if(prop.broken) return;
  const spriteReady = isTerrainImageReady(CRATE_IMAGE);
  const naturalWidth = spriteReady ? (CRATE_IMAGE.naturalWidth || CRATE_IMAGE.width || 0) : 0;
  const naturalHeight = spriteReady ? (CRATE_IMAGE.naturalHeight || CRATE_IMAGE.height || 0) : 0;
  const naturalAspect = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 1;
  const maintainAspect = prop.keepAspect !== false;
  const sizeFallback = naturalWidth > 0 ? naturalWidth : 34;
  const widthInput = Number(prop.width);
  const heightInput = Number(prop.height);
  let width = Number.isFinite(widthInput) ? widthInput : null;
  let height = Number.isFinite(heightInput) ? heightInput : null;
  if(width === null && height !== null && naturalAspect > 0){
    width = height * naturalAspect;
  }
  if(width === null || width <= 0){
    width = sizeFallback;
  }
  const expectedHeight = naturalAspect > 0 ? width / naturalAspect : width;
  if(height === null || height <= 0){
    height = maintainAspect ? expectedHeight : (naturalHeight > 0 ? naturalHeight : width);
  }else if(maintainAspect){
    const tolerance = Math.max(1, expectedHeight * 0.05);
    if(Math.abs(height - expectedHeight) > tolerance){
      height = expectedHeight;
    }
  }
  if(!Number.isFinite(height) || height <= 0){
    height = width;
  }
  const baseY = prop.baseY ?? prop.y ?? 0;
  const left = (prop.x ?? 0) - width/2;
  const top = baseY - height;
  const wood = prop.color || '#7a5332';
  if(spriteReady){
    ctx.drawImage(CRATE_IMAGE, left, top, width, height);
    if(prop.color){
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = wood;
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    }
  }else{
    const highlight = lightenColor(wood, 0.24);
    const frame = darkenColor(wood, 0.45);
    const plank = darkenColor(wood, 0.12);
    drawPixelPattern(ctx, CRATE_PIXEL_SPRITE, { T: frame, B: plank, H: highlight }, left, top, width, height);
  }
  const shadowHeight = Math.max(2, Math.round(height * 0.2));
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(left, baseY - Math.round(shadowHeight * 0.4), width, shadowHeight);
}

function drawDecorRestingStick(ctx, prop){
  const width = Math.max(36, Number(prop.width) || 80);
  const height = Math.max(42, Number(prop.height) || 96);
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const left = centerX - width * 0.5;
  const top = baseY - height;
  const spriteReady = isTerrainImageReady(RESTING_STICK_IMAGE);
  if(spriteReady){
    ctx.drawImage(RESTING_STICK_IMAGE, left, top, width, height);
    if(prop.color){
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = prop.color;
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    }
  }else{
    ctx.fillStyle = prop.color || '#5c606c';
    ctx.fillRect(left + width * 0.25, top + height * 0.45, width * 0.5, height * 0.25);
    ctx.beginPath();
    ctx.arc(centerX, top + height * 0.35, height * 0.12, 0, TAU);
    ctx.fillStyle = '#e6e8f0';
    ctx.fill();
  }
  const shadowWidth = width * 0.6;
  const shadowHeight = Math.max(6, height * 0.16);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(centerX, baseY - shadowHeight * 0.25, shadowWidth * 0.5, shadowHeight * 0.5, 0, 0, TAU);
  ctx.fill();
}

function drawDecorTreasureChest(ctx, prop){
  const width = Math.max(26, prop.width ?? 68);
  const height = Math.max(24, prop.height ?? 48);
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const left = centerX - width * 0.5;
  const top = baseY - height;
  const bodyHeight = height * 0.6;
  const lidHeight = height - bodyHeight;
  const baseTop = baseY - bodyHeight;
  const bodyColor = prop.color || '#b07941';
  const highlightColor = lightenColor(bodyColor, 0.28);
  const shadowColor = darkenColor(bodyColor, 0.45);
  const trimColor = prop.trimColor || '#e8d38b';
  const lockColor = darkenColor(trimColor, 0.35);
  const goldColor = prop.goldColor || '#f6d66a';
  const strapWidth = Math.max(6, width * 0.18);
  const state = prop.chestState || {};
  const now = nowMs();
  const openTime = state.openTime || now;
  const goldVisible = !!state.goldPresent;
  const chestOpened = state.opened || goldVisible;
  const openProgress = chestOpened ? clamp((now - openTime) / 520, 0, 1) : 0;
  const eased = chestOpened ? Math.pow(openProgress, 0.75) : 0;
  const lidAngle = -Math.PI * 0.55 * eased;
  const lidLift = lidHeight * 0.3 * eased;
  const shadowWidth = width * 0.88;
  const shadowHeight = Math.max(3, bodyHeight * 0.25);
  const sparkleSeed = Math.abs(Math.floor(centerX * 13.37 + baseY * 7.91));
  const sparklePeriod = 2800;
  const sparkleWindow = 880;
  const sparkleTime = (now + (sparkleSeed % sparklePeriod) + sparklePeriod) % sparklePeriod;
  const showClosedSparkle = !state.opened && sparkleTime < sparkleWindow;
  const sparkleProgress = showClosedSparkle ? (sparkleTime / sparkleWindow) : 0;
  const sparkleAlpha = showClosedSparkle ? clamp(1 - sparkleProgress * 0.65, 0, 1) : 0;
  const sparklePulse = Math.sin((now + sparkleSeed) * 0.01);
  const strapVisibility = chestOpened ? Math.max(0, 1 - eased * 1.3) : 1;
  const treasureAlpha = goldVisible ? 1 : (state.opened ? Math.max(0, 1 - eased) : 0);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(centerX - shadowWidth * 0.5, baseY - shadowHeight * 0.35, shadowWidth, shadowHeight);
  const closedSpriteReady = isTerrainImageReady(TREASURE_CHEST_CLOSED_IMAGE);
  const openSpriteReady = isTerrainImageReady(TREASURE_CHEST_OPEN_IMAGE);
  const goldSprite = isTerrainImageReady(TREASURE_CHEST_OPEN_WITH_GOLD_IMAGE)
    ? TREASURE_CHEST_OPEN_WITH_GOLD_IMAGE
    : null;
  if(closedSpriteReady && openSpriteReady){
    const closedAlpha = chestOpened ? Math.max(0, 1 - eased) : 1;
    const openAlpha = chestOpened ? eased : 0;
    if(closedAlpha > 0){
      ctx.save();
      ctx.globalAlpha = closedAlpha;
      ctx.drawImage(TREASURE_CHEST_CLOSED_IMAGE, left, top, width, height);
      ctx.restore();
    }
    if(openAlpha > 0){
      const baseAlpha = openAlpha * Math.max(0, 1 - treasureAlpha);
      if(baseAlpha > 0){
        ctx.save();
        ctx.globalAlpha = baseAlpha;
        ctx.drawImage(TREASURE_CHEST_OPEN_IMAGE, left, top, width, height);
        ctx.restore();
      }
      const goldAlpha = openAlpha * Math.min(1, treasureAlpha);
      if(goldAlpha > 0 && goldSprite){
        ctx.save();
        ctx.globalAlpha = goldAlpha;
        ctx.drawImage(goldSprite, left, top, width, height);
        ctx.restore();
      }
    }
    if(showClosedSparkle && closedAlpha > 0){
      const sparkleWidth = Math.max(6, width * 0.18);
      const sparkleHeight = Math.max(10, height * 0.44);
      const sparkleLeft = centerX - sparkleWidth * 0.5;
      const sparkleTop = top + height * 0.2;
      ctx.save();
      ctx.globalAlpha = sparkleAlpha * closedAlpha;
      const gradient = ctx.createLinearGradient(sparkleLeft, sparkleTop, sparkleLeft + sparkleWidth, sparkleTop + sparkleHeight);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.85)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(sparkleLeft, sparkleTop, sparkleWidth, sparkleHeight);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = bodyColor;
  ctx.fillRect(left, baseTop, width, bodyHeight);
  ctx.fillStyle = highlightColor;
  ctx.fillRect(left, baseTop + bodyHeight * 0.08, width, bodyHeight * 0.18);
  ctx.fillStyle = shadowColor;
  ctx.fillRect(left, baseTop + bodyHeight * 0.58, width, bodyHeight * 0.42);
  ctx.strokeStyle = darkenColor(bodyColor, 0.5);
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.strokeRect(left, baseTop, width, bodyHeight);
  ctx.fillStyle = trimColor;
  ctx.fillRect(left, baseTop + bodyHeight * 0.3, width, Math.max(3, bodyHeight * 0.14));
  if(strapVisibility > 0){
    ctx.save();
    ctx.globalAlpha = strapVisibility;
    ctx.fillRect(centerX - strapWidth * 0.5, baseTop, strapWidth, bodyHeight);
    ctx.fillStyle = lockColor;
    const lockHeight = Math.max(8, bodyHeight * 0.42);
    const lockWidth = Math.max(6, strapWidth * 0.45);
    ctx.fillRect(centerX - lockWidth * 0.5, baseTop + bodyHeight * 0.2, lockWidth, lockHeight);
    ctx.fillStyle = lightenColor(lockColor, 0.26);
    ctx.fillRect(centerX - lockWidth * 0.18, baseTop + bodyHeight * 0.34, lockWidth * 0.36, lockHeight * 0.4);
    ctx.restore();
  }

  if(chestOpened && eased > 0){
    const cavityLeft = left + width * 0.12;
    const cavityTop = baseTop + Math.max(3, bodyHeight * 0.18);
    const cavityWidth = width - width * 0.24;
    const cavityHeight = Math.max(6, bodyHeight * 0.58);
    ctx.save();
    ctx.globalAlpha = eased;
    ctx.fillStyle = darkenColor(bodyColor, 0.52);
    ctx.fillRect(cavityLeft, cavityTop, cavityWidth, cavityHeight);
    ctx.fillStyle = lightenColor(trimColor, 0.18);
    ctx.fillRect(cavityLeft, cavityTop, cavityWidth, Math.max(3, cavityHeight * 0.22));
    ctx.strokeStyle = darkenColor(trimColor, 0.15);
    ctx.lineWidth = Math.max(1.5, width * 0.035);
    ctx.strokeRect(cavityLeft, cavityTop, cavityWidth, cavityHeight);
    ctx.restore();
  }
  if(treasureAlpha > 0){
    const goldHeight = Math.max(6, bodyHeight * 0.48 * Math.max(eased, 0.2));
    const goldTop = baseTop + Math.max(4, bodyHeight * 0.18);
    const goldWidth = width - width * 0.16;
    ctx.save();
    ctx.globalAlpha = treasureAlpha;
    ctx.fillStyle = goldColor;
    ctx.fillRect(left + width * 0.08, goldTop, goldWidth, goldHeight);
    ctx.fillStyle = lightenColor(goldColor, 0.25);
    const sparkleCount = 4;
    for(let i=0; i<sparkleCount; i++){
      const sparkleX = left + width * (0.18 + (i + 1) / (sparkleCount + 1) * 0.64);
      const sparkleY = goldTop + goldHeight * (0.3 + 0.2 * Math.sin(now * 0.005 + i * 1.7));
      const sparkleHeight = Math.max(2, goldHeight * 0.25);
      ctx.fillRect(sparkleX, sparkleY, 2, sparkleHeight);
    }
    ctx.restore();
  }
  if(showClosedSparkle){
    const baseSparkleSize = Math.max(3, width * 0.08);
    const sparkleSize = baseSparkleSize * (1 + sparklePulse * 0.25);
    const sparkleGlow = sparkleSize * 1.6;
    const sparkleX = centerX + Math.sin((now + sparkleSeed) * 0.006) * width * 0.28;
    const sparkleY = baseTop - lidHeight * 0.25 - Math.cos((now + sparkleSeed) * 0.004) * lidHeight * 0.2;
    const sparkleStroke = Math.max(1.5, sparkleSize * 0.38);
    ctx.save();
    ctx.globalAlpha = sparkleAlpha * 0.6;
    ctx.fillStyle = lightenColor(trimColor, 0.52);
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleGlow * 0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = sparkleAlpha;
    ctx.strokeStyle = lightenColor(trimColor, 0.32);
    ctx.lineWidth = sparkleStroke;
    ctx.beginPath();
    ctx.moveTo(sparkleX - sparkleSize, sparkleY);
    ctx.lineTo(sparkleX + sparkleSize, sparkleY);
    ctx.moveTo(sparkleX, sparkleY - sparkleSize);
    ctx.lineTo(sparkleX, sparkleY + sparkleSize);
    ctx.stroke();
    ctx.save();
    ctx.translate(sparkleX, sparkleY);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-sparkleSize * 0.9, 0);
    ctx.lineTo(sparkleSize * 0.9, 0);
    ctx.moveTo(0, -sparkleSize * 0.9);
    ctx.lineTo(0, sparkleSize * 0.9);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = lightenColor(trimColor, 0.48);
    const coreSize = sparkleStroke * 0.8;
    ctx.fillRect(sparkleX - coreSize * 0.5, sparkleY - coreSize * 0.5, coreSize, coreSize);
    ctx.restore();
  }
  ctx.translate(centerX, baseTop);
  ctx.rotate(lidAngle);
  ctx.translate(0, -lidHeight - lidLift);
  ctx.fillStyle = state.opened ? darkenColor(bodyColor, 0.24) : darkenColor(bodyColor, 0.12);
  ctx.fillRect(-width * 0.5, 0, width, lidHeight);
  ctx.fillStyle = highlightColor;
  ctx.fillRect(-width * 0.5, 0, width, lidHeight * 0.3);
  ctx.fillStyle = trimColor;
  ctx.fillRect(-width * 0.5, lidHeight * 0.38, width, Math.max(3, lidHeight * 0.16));
  if(strapVisibility > 0){
    ctx.save();
    ctx.globalAlpha = strapVisibility;
    ctx.fillRect(-strapWidth * 0.5, 0, strapWidth, lidHeight);
    ctx.fillStyle = lockColor;
    const latchHeight = Math.max(6, lidHeight * 0.4);
    ctx.fillRect(-strapWidth * 0.18, lidHeight * 0.32, strapWidth * 0.36, latchHeight);
    ctx.restore();
  }
  ctx.restore();
}

function drawDecorSwordPedestal(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 86;
  const height = prop.height ?? 100;
  const left = x - width * 0.5;
  const pedestalColor = prop.stoneColor || '#696d7d';
  const pedestalHighlight = lightenColor(pedestalColor, 0.28);
  const pedestalShadow = darkenColor(pedestalColor, 0.28);
  const pedestalDeep = darkenColor(pedestalColor, 0.42);
  const accentColor = prop.accentColor || '#b6c4d6';
  const trimColor = prop.trimColor || lightenColor(pedestalColor, 0.18);
  const state = prop.swordState || {};
  const now = nowMs();
  const claimed = !!state.claimed;
  const openTime = state.openTime ?? 0;
  const fade = claimed ? clamp((now - openTime) / 360, 0, 1) : 0;
  const swordAlpha = 1 - fade;
  const platformHeight = Math.max(12, height * 0.18);
  const columnHeight = height - platformHeight * 1.6;
  const columnWidth = Math.max(26, width * 0.4);
  const baseWidth = Math.max(columnWidth * 1.4, width * 0.66);
  const baseHeight = Math.max(16, height * 0.22);
  const platformY = baseY - platformHeight;
  const columnTop = platformY - columnHeight;
  const baseTop = baseY - baseHeight;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x - baseWidth * 0.55, baseY - baseHeight * 0.25, baseWidth * 1.1, baseHeight * 0.35);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = pedestalDeep;
  ctx.fillRect(x - baseWidth * 0.5, baseTop, baseWidth, baseHeight);
  ctx.fillStyle = pedestalShadow;
  ctx.fillRect(x - baseWidth * 0.5, baseTop, baseWidth, baseHeight * 0.6);
  ctx.fillStyle = pedestalHighlight;
  ctx.fillRect(x - baseWidth * 0.5, baseTop, baseWidth, baseHeight * 0.25);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x - baseWidth * 0.5, baseTop + baseHeight * 0.32, baseWidth, Math.max(3, baseHeight * 0.18));
  ctx.restore();

  ctx.save();
  ctx.fillStyle = pedestalShadow;
  ctx.fillRect(x - columnWidth * 0.5, columnTop, columnWidth, columnHeight);
  ctx.fillStyle = pedestalColor;
  ctx.fillRect(x - columnWidth * 0.5, columnTop, columnWidth, columnHeight * 0.85);
  ctx.fillStyle = pedestalHighlight;
  ctx.fillRect(x - columnWidth * 0.5, columnTop, columnWidth, columnHeight * 0.22);
  ctx.fillStyle = trimColor;
  ctx.fillRect(x - columnWidth * 0.5, columnTop + columnHeight * 0.28, columnWidth, Math.max(3, columnHeight * 0.12));
  ctx.restore();

  ctx.save();
  ctx.fillStyle = pedestalShadow;
  ctx.fillRect(left, platformY, width, platformHeight * 0.75);
  ctx.fillStyle = pedestalColor;
  ctx.fillRect(left, platformY, width, platformHeight * 0.5);
  ctx.fillStyle = pedestalHighlight;
  ctx.fillRect(left, platformY, width, platformHeight * 0.28);
  ctx.strokeStyle = pedestalDeep;
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.strokeRect(left, platformY, width, platformHeight * 0.75);
  ctx.restore();

  if(swordAlpha > 0){
    const bladeHeight = Math.max(36, height * 0.58);
    const bladeWidth = Math.max(6, width * 0.08);
    const hiltWidth = Math.max(26, width * 0.38);
    const hiltThickness = Math.max(6, bladeWidth * 0.9);
    const pommelRadius = Math.max(4, bladeWidth * 0.9);
    const gripHeight = Math.max(16, bladeHeight * 0.18);
    const bladeTop = columnTop - bladeHeight * 0.55;
    ctx.save();
    ctx.globalAlpha = swordAlpha;
    ctx.fillStyle = lightenColor(accentColor, 0.3);
    ctx.beginPath();
    ctx.moveTo(x, bladeTop);
    ctx.lineTo(x + bladeWidth * 0.5, columnTop);
    ctx.lineTo(x - bladeWidth * 0.5, columnTop);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accentColor;
    ctx.fillRect(x - bladeWidth * 0.5, columnTop - bladeHeight * 0.55, bladeWidth, bladeHeight * 0.55);
    ctx.fillStyle = darkenColor(accentColor, 0.22);
    ctx.fillRect(x - bladeWidth * 0.5, columnTop - bladeHeight * 0.24, bladeWidth, bladeHeight * 0.08);
    ctx.fillStyle = pedestalHighlight;
    ctx.fillRect(x - hiltWidth * 0.5, columnTop, hiltWidth, hiltThickness);
    ctx.fillStyle = pedestalShadow;
    ctx.fillRect(x - bladeWidth * 0.6, columnTop + hiltThickness, bladeWidth * 1.2, gripHeight);
    ctx.fillStyle = pedestalHighlight;
    ctx.fillRect(x - bladeWidth * 0.45, columnTop + hiltThickness, bladeWidth * 0.9, gripHeight * 0.72);
    ctx.fillStyle = lightenColor(pedestalColor, 0.4);
    ctx.beginPath();
    ctx.arc(x, columnTop + hiltThickness + gripHeight + pommelRadius * 0.6, pommelRadius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if(!claimed){
    const sparkleSeed = prop.id ? prop.id.length * 137 : 0;
    const sparklePulse = Math.sin((now + sparkleSeed) * 0.004);
    const sparkleAlpha = clamp(0.45 + sparklePulse * 0.35, 0, 1);
    const sparkleSize = Math.max(6, width * 0.14) * (1 + sparklePulse * 0.18);
    const sparkleX = x + Math.sin((now + sparkleSeed) * 0.0026) * width * 0.22;
    const sparkleY = columnTop - sparkleSize * 0.6;
    ctx.save();
    ctx.globalAlpha = sparkleAlpha;
    ctx.strokeStyle = lightenColor(trimColor, 0.42);
    ctx.lineWidth = Math.max(1.8, sparkleSize * 0.24);
    ctx.beginPath();
    ctx.moveTo(sparkleX - sparkleSize, sparkleY);
    ctx.lineTo(sparkleX + sparkleSize, sparkleY);
    ctx.moveTo(sparkleX, sparkleY - sparkleSize);
    ctx.lineTo(sparkleX, sparkleY + sparkleSize);
    ctx.stroke();
    ctx.fillStyle = lightenColor(trimColor, 0.52);
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleSize * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
function drawDecorRaft(ctx, prop){
  if(prop.broken) return;
  const width = prop.width ?? 168;
  const height = prop.height ?? Math.max(32, Math.round(width * 0.22));
  const baseY = prop.baseY ?? prop.y ?? 0;
  const left = (prop.x ?? 0) - width * 0.5;
  const top = baseY - height;
  const wood = prop.color || '#8a6138';
  const frame = darkenColor(wood, 0.48);
  const plank = darkenColor(wood, 0.18);
  const highlight = lightenColor(wood, 0.28);
  const shadow = darkenColor(wood, 0.32);
  const rope = prop.ropeColor || lightenColor(wood, 0.42);
  drawPixelPattern(ctx, RAFT_PIXEL_SPRITE, { F: frame, P: plank, H: highlight, S: shadow, R: rope }, left, top, width, height);
  const shadowWidth = width * 0.84;
  const shadowHeight = Math.max(2, Math.round(height * 0.18));
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect((prop.x ?? 0) - shadowWidth * 0.5, baseY - shadowHeight * 0.35, shadowWidth, shadowHeight);
  ctx.restore();
}

function drawDecorBoat(ctx, prop){
  if(prop.broken) return;
  const width = prop.width ?? 156;
  const height = prop.height ?? Math.max(48, Math.round(width * 0.36));
  const baseY = prop.baseY ?? prop.y ?? 0;
  const left = (prop.x ?? 0) - width * 0.5;
  const top = baseY - height;
  const hull = prop.color || '#7a4b28';
  const edge = darkenColor(hull, 0.48);
  const rim = lightenColor(hull, 0.32);
  const planks = lightenColor(hull, 0.16);
  const seat = darkenColor(hull, 0.22);
  const keel = darkenColor(hull, 0.38);
  const palette = { F: edge, P: rim, R: planks, S: seat, B: keel };
  drawPixelPattern(ctx, BOAT_PIXEL_SPRITE, palette, left, top, width, height);
  const shadowWidth = width * 0.7;
  const shadowHeight = Math.max(2, Math.round(height * 0.22));
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
  ctx.fillRect((prop.x ?? 0) - shadowWidth * 0.5, baseY - shadowHeight * 0.25, shadowWidth, shadowHeight);
  ctx.restore();
}

function drawDecorSprout(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const height = prop.height ?? 28;
  const width = prop.width ?? Math.max(16, Math.round(height * 0.6));
  const left = x - width * 0.5;
  const top = baseY - height;
  const leaf = prop.color || '#4a9b58';
  const highlight = lightenColor(leaf, 0.28);
  drawPixelPattern(ctx, SPROUT_PIXEL_SPRITE, { L: highlight, G: leaf }, left, top, width, height);
}

function drawDecorTuft(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 46;
  const height = prop.height ?? 26;
  const half = width/2;
  const left = x - half;
  const top = baseY - height;
  const leaf = prop.color || '#2f7d4a';
  const highlight = lightenColor(leaf, 0.26);
  drawPixelPattern(ctx, TUFT_PIXEL_SPRITE, { L: highlight, G: leaf }, left, top, width, height);
}

function drawDecorTorch(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 26;
  const height = prop.height ?? 50;
  const left = x - width * 0.5;
  const top = baseY - height;
  const mount = prop.mount === 'wall' ? 'wall' : 'floor';
  const facing = prop.facing < 0 ? -1 : 1;
  const wood = prop.woodColor || '#7a5332';
  const woodHighlight = lightenColor(wood, 0.28);
  const woodShadow = darkenColor(wood, 0.3);
  const metal = prop.metalColor || '#b3a288';
  const metalHighlight = lightenColor(metal, 0.34);
  const metalShadow = darkenColor(metal, 0.32);
  if(mount === 'wall'){
    drawTorchWallBracket(ctx, prop, width, height, facing, metal, metalHighlight, metalShadow);
  }
  const palette = { H: metalHighlight, M: metal, L: woodHighlight, W: wood, S: woodShadow };
  drawPixelPattern(ctx, TORCH_FLOOR_SPRITE, palette, left, top, width, height);
  if(mount === 'floor'){
    const shadowWidth = width * 0.78;
    const shadowHeight = Math.max(2, Math.round(height * 0.12));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x - shadowWidth * 0.5, baseY - shadowHeight * 0.3, shadowWidth, shadowHeight);
    ctx.restore();
  }
  drawTorchFlame(ctx, prop, width, height);
}

function drawDecorGlowCrystal(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = Math.max(6, prop.width ?? 34);
  const height = Math.max(8, prop.height ?? 48);
  const anchorRaw = (prop.anchor || prop.mount || 'left').toString().toLowerCase();
  const anchor = anchorRaw === 'right' || anchorRaw === 'floor' || anchorRaw === 'ceiling'
    ? anchorRaw
    : 'left';
  const facing = prop.facing < 0 ? -1 : 1;
  const wallGap = prop.wallGap ?? width * 0.08;
  const state = prop.crystalState || null;
  const baseIntensity = prop.lightBaseIntensity ?? prop.lightIntensity ?? 1;
  const intensity = clamp(state?.intensity ?? baseIntensity ?? 1, 0.2, 2.8);
  const glowColor = prop.glowColor || 'rgba(255, 150, 96, 0.82)';
  const lightColor = prop.lightColor || 'rgba(255, 210, 160, 0.92)';
  const coreColor = prop.coreColor || '#ff9f6f';
  const rimColor = prop.rimColor || lightenColor(coreColor, 0.32);
  const shardColor = prop.shardColor || darkenColor(coreColor, 0.42);
  const mountColor = prop.mountColor || '#2b1520';
  const mountHighlight = lightenColor(mountColor, 0.26);
  const mountShadow = darkenColor(mountColor, 0.32);
  const sparkles = Array.isArray(state?.sparkles) ? state.sparkles : null;
  const rotation = (Number(prop.rotation) || 0) * Math.PI / 180;

  const supportY = -height * 0.48;
  const supportHeight = Math.max(4, height * 0.14);
  const supportWidth = Math.max(6, width * 0.32);
  const glowCenterY = -height * 0.55;

  ctx.save();
  ctx.translate(x, baseY);
  if(rotation) ctx.rotate(rotation);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.28 * intensity;
  const glowRadius = Math.max(width, height) * 0.9;
  const radial = ctx.createRadialGradient(0, glowCenterY, glowRadius * 0.2, 0, glowCenterY, glowRadius);
  radial.addColorStop(0, colorWithAlpha(glowColor, 0.95));
  radial.addColorStop(1, colorWithAlpha(glowColor, 0));
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(0, glowCenterY, glowRadius, 0, TAU);
  ctx.fill();
  ctx.restore();

  if(anchor === 'left' || anchor === 'right'){
    const dir = anchor === 'right' ? 1 : -1;
    const startX = dir * width * 0.5;
    const bracketWidth = supportWidth + wallGap * 0.6;
    ctx.save();
    ctx.fillStyle = mountShadow;
    ctx.beginPath();
    ctx.moveTo(startX, supportY - supportHeight * 0.5);
    ctx.lineTo(startX + dir * bracketWidth, supportY - supportHeight * 0.2);
    ctx.lineTo(startX + dir * bracketWidth, supportY + supportHeight * 0.2);
    ctx.lineTo(startX, supportY + supportHeight * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mountHighlight;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(startX + dir * bracketWidth * 0.18, supportY - supportHeight * 0.32);
    ctx.lineTo(startX + dir * bracketWidth, supportY - supportHeight * 0.08);
    ctx.lineTo(startX + dir * bracketWidth, supportY + supportHeight * 0.08);
    ctx.lineTo(startX + dir * bracketWidth * 0.18, supportY + supportHeight * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const armLength = Math.max(width * 0.32, supportWidth * 0.8);
    const armThickness = Math.max(2, width * 0.08);
    const rectX = dir > 0 ? startX : startX - armLength;
    ctx.save();
    ctx.fillStyle = colorWithAlpha(mountHighlight, 0.65);
    ctx.fillRect(rectX, supportY - armThickness * 0.5, armLength, armThickness);
    ctx.restore();
  }else if(anchor === 'floor'){
    const baseHeight = Math.max(3, height * 0.12);
    ctx.save();
    ctx.fillStyle = mountShadow;
    ctx.fillRect(-width * 0.25, -baseHeight, width * 0.5, baseHeight);
    ctx.fillStyle = mountHighlight;
    ctx.fillRect(-width * 0.25, -baseHeight, width * 0.18, baseHeight);
    ctx.restore();
  }else if(anchor === 'ceiling'){
    const capHeight = Math.max(3, height * 0.12);
    ctx.save();
    ctx.fillStyle = mountShadow;
    ctx.fillRect(-width * 0.22, -height, width * 0.44, capHeight);
    ctx.fillStyle = mountHighlight;
    ctx.fillRect(-width * 0.22, -height, width * 0.16, capHeight);
    ctx.restore();
  }

  ctx.save();
  ctx.scale(facing, 1);
  const topY = -height;
  const bottomY = 0;
  const midY = topY * 0.42;
  const lowerMidY = -height * 0.18;
  const halfW = width * 0.36;
  const gradient = ctx.createLinearGradient(0, topY, 0, bottomY);
  gradient.addColorStop(0, lightenColor(coreColor, 0.3));
  gradient.addColorStop(0.55, coreColor);
  gradient.addColorStop(1, shardColor);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.8, lowerMidY);
  ctx.lineTo(-halfW * 0.45, midY);
  ctx.lineTo(0, topY);
  ctx.lineTo(halfW * 0.45, midY);
  ctx.lineTo(halfW * 0.8, lowerMidY);
  ctx.lineTo(halfW * 0.55, bottomY);
  ctx.lineTo(-halfW * 0.55, bottomY);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = Math.max(1.5, width * 0.06);
  ctx.strokeStyle = colorWithAlpha(rimColor, 0.9);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, width * 0.03);
  ctx.strokeStyle = colorWithAlpha(lightenColor(rimColor, 0.15), 0.6 + 0.2 * intensity);
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.35, midY * 0.6);
  ctx.lineTo(0, topY);
  ctx.lineTo(halfW * 0.18, midY * 0.2);
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.25 * intensity;
  ctx.fillStyle = colorWithAlpha(lightColor, 0.9);
  ctx.beginPath();
  ctx.moveTo(-halfW * 0.22, -height * 0.32);
  ctx.lineTo(-halfW * 0.05, -height * 0.66);
  ctx.lineTo(halfW * 0.08, -height * 0.48);
  ctx.closePath();
  ctx.fill();

  if(sparkles && sparkles.length){
    for(const sparkle of sparkles){
      if(!sparkle) continue;
      const ratio = clamp(sparkle.age / sparkle.life, 0, 1);
      const sparkleAlpha = (1 - Math.abs(0.5 - ratio) * 2) * 0.85;
      ctx.save();
      ctx.translate(sparkle.x * width * 0.5, -height * 0.45 + sparkle.y * height * 0.5);
      const sparkleWidth = width * 0.12;
      const sparkleHeight = height * 0.26;
      ctx.globalAlpha = sparkleAlpha;
      ctx.fillStyle = colorWithAlpha(lightColor, 0.9);
      ctx.beginPath();
      ctx.moveTo(0, -sparkleHeight * 0.5);
      ctx.lineTo(sparkleWidth * 0.5, 0);
      ctx.lineTo(0, sparkleHeight * 0.5);
      ctx.lineTo(-sparkleWidth * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.18 * intensity;
  ctx.fillStyle = colorWithAlpha(glowColor, 0.9);
  ctx.beginPath();
  ctx.ellipse(0, glowCenterY, width * 0.7, height * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawDecorAmbientFireflies(ctx, prop){
  const state = ensureAmbientFireflySwarmState(prop);
  if(!state) return;
  const fireflies = Array.isArray(state.fireflies) ? state.fireflies : [];
  if(!fireflies.length) return;
  const half = Math.max(1, state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const firefly of fireflies){
    if(!firefly) continue;
    const alpha = clamp(0.55 + Math.sin(firefly.flicker || 0) * 0.25, 0.25, 1);
    const lightColor = firefly.lightColor || state.lightColor || 'rgba(240, 248, 220, 0.95)';
    const glowColor = firefly.glowColor || state.glowColor || lightColor;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lightColor;
    ctx.fillRect(firefly.x - half, firefly.y - half, half * 2, half * 2);
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = colorWithAlpha(glowColor, 0.8);
    const glowHalf = half * 2.6;
    ctx.fillRect(firefly.x - glowHalf, firefly.y - glowHalf, glowHalf * 2, glowHalf * 2);
  }
  ctx.restore();
}

function drawDecorFireflyJarSwarm(ctx, prop){
  const metrics = getFireflyJarMetrics(prop);
  const state = ensureFireflyJarState(prop, metrics);
  if(!state || !state.released) return;
  const fireflies = Array.isArray(state.fireflies) ? state.fireflies : [];
  if(!fireflies.length) return;
  const half = Math.max(1, state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const firefly of fireflies){
    if(!firefly) continue;
    const alpha = clamp(0.55 + Math.sin(firefly.flicker || 0) * 0.25, 0.25, 1);
    const lightColor = firefly.lightColor || state.lightColor || 'rgba(255, 240, 180, 1)';
    const glowColor = firefly.glowColor || state.glowColor || 'rgba(255, 244, 210, 0.9)';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lightColor;
    ctx.fillRect(firefly.x - half, firefly.y - half, half * 2, half * 2);
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = colorWithAlpha(glowColor, 0.82);
    const glowHalf = half * 2.6;
    ctx.fillRect(firefly.x - glowHalf, firefly.y - glowHalf, glowHalf * 2, glowHalf * 2);
  }
  ctx.restore();
}

function drawDecorFireflyJar(ctx, prop){
  const metrics = getFireflyJarMetrics(prop);
  const state = ensureFireflyJarState(prop, metrics);
  const baseY = metrics.baseY;
  const x = metrics.originX;
  const width = metrics.width;
  const height = metrics.height;
  const left = x - width * 0.5;
  const top = metrics.top;
  const neckHeight = height * 0.2;
  const bodyTop = top + neckHeight;
  const bodyBottom = baseY - 4;
  const bodyInset = width * 0.12;
  const bodyLeft = left + bodyInset;
  const bodyRight = left + width - bodyInset;
  const corner = Math.max(3, width * 0.18);
  const glassFill = prop.glassColor || 'rgba(190, 234, 255, 0.3)';
  const glassStroke = prop.glassStroke || 'rgba(110, 150, 185, 0.85)';
  const rimColor = prop.rimColor || 'rgba(140, 170, 200, 0.85)';
  const interiorGlow = prop.glowFill || 'rgba(255, 238, 200, 0.22)';
  const isHanging = prop.type === 'hangingFireflyJar';
  const sprite = isHanging ? HANGING_FIREFLY_JAR_IMAGE : FIREFLY_JAR_IMAGE;
  const spriteReady = !prop.broken && isTerrainImageReady(sprite);

  ctx.save();
  if(!prop.broken){
    if(spriteReady){
      ctx.drawImage(sprite, left, top, width, height);
      const glowWidth = Math.max(1, bodyRight - bodyLeft - 4);
      const glowHeight = Math.max(1, bodyBottom - bodyTop - 8);
      if(glowWidth > 0 && glowHeight > 0){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = interiorGlow;
        ctx.fillRect(bodyLeft + 2, bodyTop + 4, glowWidth, glowHeight);
        ctx.restore();
      }
    }else{
      if(isHanging){
        const hangerWidth = Math.max(2, width * 0.12);
        const hangerHeight = Math.max(4, height * 0.22);
        const hangerLeft = x - hangerWidth * 0.5;
        const hangerTop = top - hangerHeight * 0.6;
        ctx.fillStyle = prop.hangerColor || 'rgba(110, 85, 60, 0.9)';
        ctx.fillRect(hangerLeft, hangerTop, hangerWidth, hangerHeight);
      }
      ctx.lineWidth = Math.max(1.2, width * 0.07);
      ctx.strokeStyle = glassStroke;
      ctx.fillStyle = glassFill;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(bodyLeft, bodyTop);
      ctx.lineTo(bodyRight, bodyTop);
      ctx.quadraticCurveTo(bodyRight + corner * 0.25, bodyTop + corner * 0.8, bodyRight - corner * 0.2, bodyBottom);
      ctx.lineTo(bodyLeft + corner * 0.2, bodyBottom);
      ctx.quadraticCurveTo(bodyLeft - corner * 0.25, bodyTop + corner * 0.8, bodyLeft, bodyTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = interiorGlow;
      ctx.fillRect(bodyLeft + 2, bodyTop + 4, Math.max(1, bodyRight - bodyLeft - 4), Math.max(1, bodyBottom - bodyTop - 8));
      ctx.restore();
      const neckWidth = width * 0.6;
      const neckLeft = x - neckWidth * 0.5;
      const neckRight = x + neckWidth * 0.5;
      const neckBottom = top + neckHeight * 0.65;
      ctx.lineWidth = Math.max(1, width * 0.05);
      ctx.strokeStyle = glassStroke;
      ctx.fillStyle = glassFill;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(neckLeft, neckBottom);
      ctx.lineTo(neckRight, neckBottom);
      ctx.quadraticCurveTo(neckRight, top + neckHeight * 0.35, x, top + neckHeight * 0.2);
      ctx.quadraticCurveTo(neckLeft, top + neckHeight * 0.35, neckLeft, neckBottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      const rimWidth = neckWidth + width * 0.1;
      const rimLeft = x - rimWidth * 0.5;
      const rimHeight = Math.max(3, height * 0.08);
      ctx.fillStyle = rimColor;
      ctx.fillRect(rimLeft, top - rimHeight * 0.2, rimWidth, rimHeight);
    }
  }else{
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = glassFill;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.36, baseY - 4);
    ctx.lineTo(x - width * 0.16, baseY - height * 0.34);
    ctx.lineTo(x - width * 0.02, baseY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + width * 0.38, baseY - 4);
    ctx.lineTo(x + width * 0.12, baseY - height * 0.36);
    ctx.lineTo(x + width * 0.02, baseY - 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const shadowWidth = width * 0.9;
  const shadowHeight = Math.max(3, height * 0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x - shadowWidth * 0.5, baseY - shadowHeight * 0.5, shadowWidth, shadowHeight * 0.6);
  ctx.restore();
  if(state){
    const previewHalf = state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE;
    if(!prop.broken && Array.isArray(state.preview) && state.preview.length){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 236, 150, 0.9)';
      const clampRadius = Math.max(0, state.previewClamp ?? 0);
      for(const firefly of state.preview){
        if(!firefly) continue;
        const angle = firefly.angle || 0;
        const radius = Math.min(clampRadius, Math.max(0, firefly.radius ?? 0));
        const offsetBase = firefly.heightOffset ?? 0;
        const offsetX = clampRadius > 0
          ? Math.max(-clampRadius, Math.min(clampRadius, Math.cos(angle) * radius))
          : 0;
        const rawOffsetY = offsetBase + Math.sin(angle) * (radius * 0.5);
        const offsetY = clampRadius > 0
          ? Math.max(-clampRadius, Math.min(clampRadius, rawOffsetY))
          : 0;
        const px = state.originX + offsetX;
        const py = state.originY + offsetY;
        const alpha = clamp(0.45 + Math.sin(angle * 2) * 0.3, 0.2, 1);
        ctx.globalAlpha = alpha;
        ctx.fillRect(px - previewHalf, py - previewHalf, previewHalf * 2, previewHalf * 2);
      }
      ctx.restore();
    }
    if(prop.broken && Array.isArray(state.fireflies) && state.fireflies.length){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255, 236, 150, 0.95)';
      const swarmHalf = state.fireflyHalfSize ?? FIREFLY_JAR_FIREFLY_HALF_SIZE;
      for(const firefly of state.fireflies){
        if(!firefly) continue;
        const alpha = clamp(0.55 + Math.sin(firefly.flicker || 0) * 0.25, 0.25, 1);
        ctx.globalAlpha = alpha;
        ctx.fillRect(firefly.x - swarmHalf, firefly.y - swarmHalf, swarmHalf * 2, swarmHalf * 2);
      }
      ctx.restore();
    }
  }
}

function drawDecorChronoFlyJar(ctx, prop){
  const metrics = getChronoFlyJarMetrics(prop);
  const state = ensureChronoFlyJarState(prop, metrics);
  const baseY = metrics.baseY;
  const x = metrics.originX;
  const width = metrics.width;
  const height = metrics.height;
  const left = x - width * 0.5;
  const top = metrics.top;
  const neckHeight = height * 0.2;
  const bodyTop = top + neckHeight;
  const bodyBottom = baseY - 4;
  const bodyInset = width * 0.12;
  const bodyLeft = left + bodyInset;
  const bodyRight = left + width - bodyInset;
  const corner = Math.max(3, width * 0.18);
  const glassFill = prop.glassColor || 'rgba(120, 190, 255, 0.28)';
  const glassStroke = prop.glassStroke || 'rgba(70, 130, 200, 0.85)';
  const rimColor = prop.rimColor || 'rgba(160, 220, 255, 0.9)';
  const interiorGlow = prop.glowFill || 'rgba(130, 210, 255, 0.24)';
  const spriteReady = !prop.broken && isTerrainImageReady(CHRONO_FLY_JAR_IMAGE);
  const framesReady = isTerrainImageReady(CHRONO_FLY_JAR_FRAMES_IMAGE);
  const frameSize = CHRONO_FLY_JAR_FRAME_SIZE;
  const frameCount = framesReady
    ? Math.max(1, Math.floor((CHRONO_FLY_JAR_FRAMES_IMAGE.width || 0) / frameSize))
    : 0;

  ctx.save();
  if(!prop.broken){
    if(spriteReady){
      ctx.drawImage(CHRONO_FLY_JAR_IMAGE, left, top, width, height);
      const glowWidth = Math.max(1, bodyRight - bodyLeft - 4);
      const glowHeight = Math.max(1, bodyBottom - bodyTop - 8);
      if(glowWidth > 0 && glowHeight > 0){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = interiorGlow;
        ctx.fillRect(bodyLeft + 2, bodyTop + 4, glowWidth, glowHeight);
        ctx.restore();
      }
    }else{
      ctx.lineWidth = Math.max(1.2, width * 0.07);
      ctx.strokeStyle = glassStroke;
      ctx.fillStyle = glassFill;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(bodyLeft, bodyTop);
      ctx.lineTo(bodyRight, bodyTop);
      ctx.quadraticCurveTo(bodyRight + corner * 0.25, bodyTop + corner * 0.8, bodyRight - corner * 0.2, bodyBottom);
      ctx.lineTo(bodyLeft + corner * 0.2, bodyBottom);
      ctx.quadraticCurveTo(bodyLeft - corner * 0.25, bodyTop + corner * 0.8, bodyLeft, bodyTop);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = interiorGlow;
      ctx.fillRect(bodyLeft + 2, bodyTop + 4, Math.max(1, bodyRight - bodyLeft - 4), Math.max(1, bodyBottom - bodyTop - 8));
      ctx.restore();
      const neckWidth = width * 0.6;
      const neckLeft = x - neckWidth * 0.5;
      const neckRight = x + neckWidth * 0.5;
      const neckBottom = top + neckHeight * 0.65;
      ctx.lineWidth = Math.max(1, width * 0.05);
      ctx.strokeStyle = glassStroke;
      ctx.fillStyle = glassFill;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(neckLeft, neckBottom);
      ctx.lineTo(neckRight, neckBottom);
      ctx.quadraticCurveTo(neckRight, top + neckHeight * 0.35, x, top + neckHeight * 0.2);
      ctx.quadraticCurveTo(neckLeft, top + neckHeight * 0.35, neckLeft, neckBottom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      const rimWidth = neckWidth + width * 0.1;
      const rimLeft = x - rimWidth * 0.5;
      const rimHeight = Math.max(3, height * 0.08);
      ctx.fillStyle = rimColor;
      ctx.fillRect(rimLeft, top - rimHeight * 0.2, rimWidth, rimHeight);
    }
  }else{
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = glassFill;
    ctx.beginPath();
    ctx.moveTo(x - width * 0.34, baseY - 4);
    ctx.lineTo(x - width * 0.14, baseY - height * 0.32);
    ctx.lineTo(x - width * 0.02, baseY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + width * 0.36, baseY - 4);
    ctx.lineTo(x + width * 0.1, baseY - height * 0.34);
    ctx.lineTo(x + width * 0.02, baseY - 3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const shadowWidth = width * 0.9;
  const shadowHeight = Math.max(3, height * 0.14);
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.fillRect(x - shadowWidth * 0.5, baseY - shadowHeight * 0.5, shadowWidth, shadowHeight * 0.6);
  ctx.restore();

  if(state){
    const previewHalf = state.flyHalfSize ?? CHRONO_FLY_JAR_PREVIEW_HALF_SIZE;
    if(!prop.broken && Array.isArray(state.preview) && state.preview.length){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const clampRadius = Math.max(0, state.previewClamp ?? 0);
      for(const firefly of state.preview){
        if(!firefly) continue;
        const angle = firefly.angle || 0;
        const radius = Math.min(clampRadius, Math.max(0, firefly.radius ?? 0));
        const offsetBase = firefly.heightOffset ?? 0;
        const offsetX = clampRadius > 0
          ? Math.max(-clampRadius, Math.min(clampRadius, Math.cos(angle) * radius))
          : 0;
        const rawOffsetY = offsetBase + Math.sin(angle) * (radius * 0.5);
        const offsetY = clampRadius > 0
          ? Math.max(-clampRadius, Math.min(clampRadius, rawOffsetY))
          : 0;
        const px = state.originX + offsetX;
        const py = state.originY + offsetY + CHRONO_FLY_JAR_EFFECT_OFFSET_Y;
        const alpha = clamp(0.45 + Math.sin(angle * 2.3) * 0.3, 0.2, 1);
        ctx.globalAlpha = alpha;
        if(frameCount > 0){
          const phase = Number.isFinite(firefly.framePhase) ? firefly.framePhase : 0;
          const frame = Math.abs(Math.floor(phase)) % frameCount;
          const sx = frame * frameSize;
          ctx.drawImage(
            CHRONO_FLY_JAR_FRAMES_IMAGE,
            sx,
            0,
            frameSize,
            frameSize,
            px - previewHalf,
            py - previewHalf,
            previewHalf * 2,
            previewHalf * 2
          );
        }else{
          ctx.fillStyle = 'rgba(140, 222, 255, 0.9)';
          ctx.fillRect(px - previewHalf, py - previewHalf, previewHalf * 2, previewHalf * 2);
        }
      }
      ctx.restore();
    }
    if(prop.broken && Array.isArray(state.flies) && state.flies.length){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const swarmHalf = state.flyHalfSize ?? CHRONO_FLY_JAR_PREVIEW_HALF_SIZE;
      for(const fly of state.flies){
        if(!fly) continue;
        const alpha = clamp(0.55 + Math.sin(fly.flicker || 0) * 0.25, 0.25, 1);
        ctx.globalAlpha = alpha;
        const px = fly.x ?? state.originX;
        const py = (fly.y ?? state.originY) + CHRONO_FLY_JAR_EFFECT_OFFSET_Y;
        if(frameCount > 0){
          const phase = Number.isFinite(fly.framePhase) ? fly.framePhase : 0;
          const frame = Math.abs(Math.floor(phase)) % frameCount;
          const sx = frame * frameSize;
          ctx.drawImage(
            CHRONO_FLY_JAR_FRAMES_IMAGE,
            sx,
            0,
            frameSize,
            frameSize,
            px - swarmHalf,
            py - swarmHalf,
            swarmHalf * 2,
            swarmHalf * 2
          );
        }else{
          ctx.fillStyle = 'rgba(90, 200, 255, 0.95)';
          ctx.fillRect(px - swarmHalf, py - swarmHalf, swarmHalf * 2, swarmHalf * 2);
        }
      }
      ctx.restore();
    }
  }
}

function drawDecorVoidPortal(ctx, prop, world){
  if(!ctx || !prop) return;
  const width = Math.max(32, prop.width ?? 88);
  const height = Math.max(48, prop.height ?? width * 1.35);
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const top = baseY - height;
  const elapsed = world?.levelState?.elapsedTime ?? 0;
  const phase = prop.phase ?? 0;
  const time = elapsed + phase * 1000;
  const spin = time * 0.0023;
  const pulse = 0.5 + Math.sin(time * 0.0041) * 0.5;
  const ringColor = prop.ringColor || '#c9c4ff';
  const glowColor = prop.glowColor || ringColor;
  const innerColor = prop.coreColor || '#040406';
  const sparkColor = prop.sparkColor || '#ffffff';
  const seed = Math.abs(Math.floor((prop.seed ?? 0) + centerX * 37.17 + baseY * 19.53));
  const randomAt = (idx)=>{
    const x = Math.sin(seed + idx * 193.975) * 43758.5453;
    return x - Math.floor(x);
  };

  ctx.save();
  ctx.translate(centerX, top + height * 0.5);
  const radiusX = width * 0.5;
  const radiusY = height * 0.5;

  const gradient = ctx.createRadialGradient(0, 0, Math.max(6, radiusX * 0.18), 0, 0, Math.max(radiusX, radiusY));
  gradient.addColorStop(0, colorWithAlpha(innerColor, 0.92));
  gradient.addColorStop(0.55, colorWithAlpha(innerColor, 0.45));
  gradient.addColorStop(1, colorWithAlpha(innerColor, 0));
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.5 + pulse * 0.35;
  ctx.shadowColor = colorWithAlpha(glowColor, 0.85);
  ctx.shadowBlur = Math.max(radiusX, radiusY) * (0.4 + pulse * 0.35);
  ctx.strokeStyle = colorWithAlpha(glowColor, 0.2 + pulse * 0.25);
  ctx.lineWidth = Math.max(2, radiusX * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX * 0.94, radiusY * 0.94, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = colorWithAlpha(ringColor, 0.75);
  ctx.lineWidth = Math.max(3, radiusX * 0.12);
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, TAU);
  ctx.stroke();

  const swirlCount = 3;
  for(let i=0; i<swirlCount; i++){
    const angle = spin + i * (TAU / swirlCount);
    const opacity = 0.32 + 0.28 * Math.sin(time * 0.0021 + i * 1.7);
    const stroke = colorWithAlpha(ringColor, clamp(opacity, 0.12, 0.6));
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, radiusX * 0.05);
    ctx.ellipse(0, 0, radiusX * (0.35 + i * 0.22), radiusY * (0.22 + i * 0.18), 0, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  const sparkCount = 7;
  for(let i=0; i<sparkCount; i++){
    const angle = randomAt(i) * TAU;
    const radius = radiusX * (0.28 + randomAt(i + 10) * 0.58);
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius * 0.62;
    const size = Math.max(2, radiusX * 0.07 * (0.6 + randomAt(i + 20)));
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + time * 0.0015);
    ctx.fillStyle = colorWithAlpha(sparkColor, 0.35 + randomAt(i + 30) * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  const shadowWidth = Math.max(width * 0.9, 48);
  const shadowHeight = Math.max(6, height * 0.16);
  ctx.save();
  ctx.globalAlpha = 0.4 + pulse * 0.2;
  ctx.fillStyle = colorWithAlpha(glowColor, 0.45);
  ctx.filter = 'blur(6px)';
  ctx.fillRect(centerX - shadowWidth * 0.5, baseY - shadowHeight * 0.4, shadowWidth, shadowHeight);
  ctx.restore();
}

function drawDecorVoidSymbol(ctx, prop){
  if(!ctx || !prop) return;
  const width = Math.max(20, prop.width ?? 72);
  const height = Math.max(20, prop.height ?? width * 1.05);
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const top = baseY - height;
  const frameColor = prop.strokeColor || '#c9c4ff';
  const fillColor = prop.fillColor || '#06060a';
  const accentColor = prop.accentColor || '#f2f1ff';
  const theme = prop.theme || null;
  const flipped = !!prop.flipped;

  ctx.save();
  ctx.translate(centerX, top + height * 0.5);
  if(flipped) ctx.scale(1, -1);
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  ctx.save();
  ctx.globalAlpha = theme === 'monochrome' ? 0.24 : 0.3;
  ctx.shadowColor = colorWithAlpha(frameColor, 0.8);
  ctx.shadowBlur = Math.max(width, height) * 0.35;
  ctx.beginPath();
  ctx.rect(-halfW, -halfH, width, height);
  ctx.strokeStyle = colorWithAlpha(frameColor, 0.2);
  ctx.lineWidth = Math.max(2, width * 0.06);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = colorWithAlpha(fillColor, 0.9);
  ctx.fillRect(-halfW, -halfH, width, height);
  ctx.strokeStyle = colorWithAlpha(frameColor, 0.85);
  ctx.lineWidth = Math.max(2, width * 0.06);
  ctx.strokeRect(-halfW, -halfH, width, height);

  const bandHeight = Math.max(4, height * 0.16);
  const bandAlpha = theme === 'monochrome' ? 0.18 : 0.25;
  ctx.fillStyle = colorWithAlpha(frameColor, bandAlpha);
  ctx.fillRect(-halfW, -bandHeight * 0.5, width, bandHeight);

  const accentStroke = theme === 'monochrome' ? 0.82 : 0.9;
  ctx.strokeStyle = colorWithAlpha(accentColor, accentStroke);
  ctx.lineWidth = Math.max(1.5, width * 0.045);
  ctx.beginPath();
  ctx.arc(0, -halfH * 0.18, width * 0.18, 0, TAU);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, halfH * 0.55);
  ctx.lineTo(-width * 0.24, 0);
  ctx.lineTo(width * 0.24, 0);
  ctx.closePath();
  ctx.stroke();
  const triangleFill = theme === 'monochrome' ? 0.12 : 0.18;
  ctx.fillStyle = colorWithAlpha(accentColor, triangleFill);
  ctx.fill();

  const runeCount = 4;
  for(let i=0; i<runeCount; i++){
    const t = i / runeCount;
    const rx = -halfW + width * (0.18 + t * 0.64);
    const ry = -halfH * 0.6;
    const runeBase = theme === 'monochrome' ? 0.22 : 0.32;
    const runeSwing = theme === 'monochrome' ? 0.14 : 0.18;
    ctx.fillStyle = colorWithAlpha(accentColor, runeBase + runeSwing * Math.sin((i + 1) * 1.7));
    ctx.fillRect(rx - width * 0.015, ry, width * 0.03, height * 0.14);
  }

  ctx.restore();

  const shadowWidth = Math.max(width * 0.8, 28);
  const shadowHeight = Math.max(4, height * 0.12);
  ctx.save();
  ctx.globalAlpha = theme === 'monochrome' ? 0.26 : 0.32;
  ctx.fillStyle = theme === 'monochrome' ? 'rgba(12,12,16,0.55)' : 'rgba(6,6,10,0.6)';
  ctx.filter = 'blur(4px)';
  ctx.fillRect(centerX - shadowWidth * 0.5, baseY - shadowHeight * 0.35, shadowWidth, shadowHeight);
  ctx.restore();
}

function drawTorchWallBracket(ctx, prop, width, height, facing, metal, highlight, shadow){
  const x = prop.x ?? 0;
  const baseY = prop.baseY ?? prop.y ?? 0;
  const bracketWidth = width * 0.9;
  const bracketHeight = height * 0.42;
  const pivotY = baseY - height * 0.45;
  const bracketLeft = facing < 0
    ? x - width * 0.5 - bracketWidth * 0.9
    : x + width * 0.5 - bracketWidth * 0.1;
  const bracketTop = pivotY - bracketHeight * 0.5;
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.fillRect(bracketLeft, bracketTop, bracketWidth, bracketHeight);
  ctx.fillStyle = highlight;
  const stripWidth = Math.max(2, Math.round(bracketWidth * 0.18));
  const stripX = facing < 0 ? bracketLeft + bracketWidth - stripWidth : bracketLeft;
  ctx.fillRect(stripX, bracketTop + bracketHeight * 0.15, stripWidth, bracketHeight * 0.7);
  ctx.restore();
  const armLength = width * 0.92;
  const armThickness = Math.max(2, Math.round(width * 0.22));
  const armX = facing < 0 ? x - width * 0.5 - armLength : x + width * 0.5;
  const armY = baseY - height * 0.3;
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.fillRect(armX, armY - armThickness * 0.5, armLength, armThickness);
  ctx.fillStyle = highlight;
  const highlightWidth = Math.max(1, Math.round(armThickness * 0.35));
  const highlightX = facing < 0 ? armX + armLength - highlightWidth : armX;
  ctx.fillRect(highlightX, armY - armThickness * 0.5, highlightWidth, armThickness);
  ctx.restore();
}

function drawTorchFlame(ctx, prop, width, height){
  const anchor = torchFlameAnchor(prop, width, height);
  const intensity = clamp(prop.currentFlame ?? prop.emitIntensity ?? 1, 0.4, 1.8);
  const flameHeight = Math.max(height * 0.58 * intensity, 24 * intensity);
  const flameBottom = anchor.y;
  const flameTop = flameBottom - flameHeight;
  drawTorchGlow(ctx, anchor, flameTop, flameHeight, intensity);
}

function drawTorchGlow(ctx, anchor, flameTop, flameHeight, intensity){
  const scale = clamp(intensity, 0.4, 1.8);
  const radius = Math.max(anchor.height * 0.9, 36) * scale;
  const centerY = flameTop + flameHeight * 0.45;
  ctx.save();
  ctx.globalAlpha = 0.42 * clamp(scale, 0.6, 1.5);
  const gradient = ctx.createRadialGradient(anchor.x, centerY, Math.max(2, radius * 0.18), anchor.x, centerY, radius);
  gradient.addColorStop(0, 'rgba(255,236,180,0.75)');
  gradient.addColorStop(0.4, 'rgba(255,182,72,0.35)');
  gradient.addColorStop(1, 'rgba(255,120,32,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(anchor.x, centerY, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function torchFlameAnchor(prop, width, height){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const top = baseY - height;
  const mount = prop.mount === 'wall' ? 'wall' : 'floor';
  const facing = prop.facing < 0 ? -1 : 1;
  const offsetX = mount === 'wall' ? facing * width * 0.08 : 0;
  return {
    x: (prop.x ?? 0) + offsetX,
    y: top + height * 0.22,
    height
  };
}

function drawDecorWorldTreeBranch(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 720;
  const thickness = prop.height ?? 240;
  const left = x - width * 0.5;
  const top = baseY - thickness;
  const barkBase = prop.color || '#6f4a30';
  const barkLight = lightenColor(barkBase, 0.26);
  const barkShade = darkenColor(barkBase, 0.22);
  const barkDeep = darkenColor(barkBase, 0.4);
  drawPixelPattern(ctx, TREE_BRANCH_SPRITE, { H: barkLight, B: barkBase, S: barkShade, D: barkDeep }, left, top, width, thickness);
}

function drawDecorCanopyLeaves(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 460;
  const height = prop.height ?? 200;
  const left = x - width * 0.5;
  const top = baseY - height;
  const canopyBase = prop.color || '#4da86a';
  const canopyHighlight = lightenColor(canopyBase, 0.34);
  const canopyShade = darkenColor(canopyBase, 0.26);
  const canopyDeep = darkenColor(canopyBase, 0.42);
  drawPixelPattern(ctx, CANOPY_PIXEL_SPRITE, { H: canopyHighlight, G: canopyBase, S: canopyShade, D: canopyDeep }, left, top, width, height);
}

function drawDecorSkillPedestal(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const centerX = prop.x ?? 0;
  const shrineState = prop.shrineState || null;
  const shrineAbility = prop.shrineAbilityId || null;
  const activated = !!(shrineAbility && shrineState && shrineState.activated);
  const ready = !!(shrineAbility && !activated);
  const basePedestal = prop.pedestalColor || '#5c4530';
  const baseBook = prop.bookColor || '#f7f0d4';
  const pedestalColor = ready
    ? lightenColor(basePedestal, 0.12)
    : (activated ? darkenColor(basePedestal, 0.22) : basePedestal);
  const pedestalHighlight = lightenColor(pedestalColor, ready ? 0.34 : 0.22);
  const pedestalShade = darkenColor(pedestalColor, activated ? 0.18 : 0.28);
  const pedestalDeep = darkenColor(pedestalColor, activated ? 0.32 : 0.45);
  const bookColor = ready
    ? lightenColor(baseBook, 0.24)
    : (activated ? darkenColor(baseBook, 0.28) : baseBook);
  const spriteReady = isTerrainImageReady(SKILL_TOMB_IMAGE);
  const naturalWidth = spriteReady ? (SKILL_TOMB_IMAGE.naturalWidth || SKILL_TOMB_IMAGE.width || 0) : 0;
  const naturalHeight = spriteReady ? (SKILL_TOMB_IMAGE.naturalHeight || SKILL_TOMB_IMAGE.height || 0) : 0;
  const naturalAspect = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : 0;
  const maintainAspect = prop.keepAspect !== false;
  let width = Number(prop.width);
  if(!Number.isFinite(width) || width <= 0){
    width = spriteReady && naturalWidth > 0 ? naturalWidth : 96;
  }
  let height = Number(prop.height);
  if(spriteReady && maintainAspect && naturalAspect > 0){
    const expectedHeight = width / naturalAspect;
    if(!Number.isFinite(height) || height <= 0){
      height = expectedHeight;
    }else{
      const tolerance = Math.max(1, expectedHeight * 0.05);
      if(Math.abs(height - expectedHeight) > tolerance){
        height = expectedHeight;
      }
    }
  }
  if(!Number.isFinite(height) || height <= 0){
    height = spriteReady && naturalHeight > 0 ? naturalHeight : width;
  }
  const left = centerX - width * 0.5;
  const top = baseY - height;
  if(ready){
    ctx.save();
    const glowColor = prop.shrineGlowColor || bookColor;
    const innerRadius = Math.max(24, width * 0.3);
    const outerRadius = Math.max(width * 1.05, innerRadius + 32);
    const gradient = ctx.createRadialGradient(centerX, top + height * 0.25, innerRadius * 0.4, centerX, top + height * 0.25, outerRadius);
    gradient.addColorStop(0, colorWithAlpha(glowColor, 0.55));
    gradient.addColorStop(1, colorWithAlpha(glowColor, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.fillRect(left - width * 0.5, top - height * 0.7, width * 2, height * 1.7);
    ctx.restore();
  }
  if(spriteReady){
    ctx.drawImage(SKILL_TOMB_IMAGE, left, top, width, height);
    if(prop.pedestalColor){
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = pedestalColor;
      ctx.fillRect(left, top + height * 0.44, width, height * 0.56);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = ready ? 'screen' : 'lighter';
    ctx.fillStyle = colorWithAlpha(bookColor, ready ? 0.4 : 0.22);
    ctx.fillRect(left + width * 0.18, top + height * 0.12, width * 0.64, height * 0.32);
    ctx.restore();
    if(activated){
      ctx.save();
      ctx.fillStyle = colorWithAlpha('#0b101a', 0.22);
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    }
  }else{
    drawPixelPattern(ctx, SKILL_PEDESTAL_SPRITE, {
      B: pedestalColor,
      H: pedestalHighlight,
      P: bookColor,
      S: pedestalShade,
      D: pedestalDeep
    }, left, top, width, height);
    if(activated){
      ctx.save();
      ctx.fillStyle = colorWithAlpha('#0b101a', 0.22);
      ctx.fillRect(left, top, width, height);
      ctx.restore();
    }
  }
  const shadowWidth = width * 0.7;
  const shadowHeight = Math.max(8, height * 0.18);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(centerX, baseY - shadowHeight * 0.35, shadowWidth * 0.5, shadowHeight * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDecorShopkeeper(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 88;
  const height = prop.height ?? 120;
  const tableWidth = prop.tableWidth ?? width * 1.2;
  const tableHeight = prop.tableHeight ?? Math.max(32, height * 0.32);
  const tableColor = prop.tableColor || '#4e3621';
  const tableHighlight = prop.tableHighlight || lightenColor(tableColor, 0.22);
  const tableShadow = prop.tableShadow || darkenColor(tableColor, 0.18);
  const top = baseY - tableHeight;
  const left = x - tableWidth * 0.5;
  ctx.save();
  ctx.fillStyle = tableShadow;
  ctx.fillRect(left, baseY - 6, tableWidth, 6);
  ctx.fillStyle = tableColor;
  ctx.fillRect(left, top, tableWidth, tableHeight);
  ctx.fillStyle = tableHighlight;
  ctx.fillRect(left, top, tableWidth, Math.max(4, tableHeight * 0.22));
  ctx.restore();
  const robeColor = prop.robeColor || '#6b89c9';
  const accentColor = prop.accentColor || '#f2d7bb';
  const headRadius = Math.max(10, width * 0.18);
  const headY = top - headRadius - Math.max(4, height * 0.12);
  const bodyTop = top - Math.max(8, height * 0.12);
  const robeBottom = top;
  ctx.save();
  ctx.fillStyle = robeColor;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.18, robeBottom);
  ctx.lineTo(x - width * 0.1, bodyTop);
  ctx.lineTo(x + width * 0.1, bodyTop);
  ctx.lineTo(x + width * 0.18, robeBottom);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(x, headY, headRadius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = darkenColor(accentColor, 0.3);
  ctx.lineWidth = Math.max(2, width * 0.04);
  ctx.beginPath();
  ctx.moveTo(x - width * 0.12, headY + headRadius * 0.4);
  ctx.lineTo(x - width * 0.2, top - tableHeight * 0.25);
  ctx.moveTo(x + width * 0.12, headY + headRadius * 0.4);
  ctx.lineTo(x + width * 0.2, top - tableHeight * 0.25);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  const bottleColor = prop.bottleColor || '#6be36b';
  const bottleX = x - tableWidth * 0.24;
  const bottleY = top + tableHeight * 0.58;
  ctx.fillStyle = bottleColor;
  ctx.beginPath();
  ctx.ellipse(bottleX, bottleY, 6, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = lightenColor(bottleColor, 0.4);
  ctx.fillRect(bottleX - 4, bottleY - 12, 8, 4);
  ctx.restore();
}
function drawDecorLever(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 32;
  const height = prop.height ?? 52;
  const left = x - width * 0.5;
  const top = baseY - height;
  const baseColor = prop.baseColor || '#4a3b2a';
  const shadow = prop.shadowColor || 'rgba(0,0,0,0.5)';
  const highlight = prop.highlightColor || lightenColor(baseColor, 0.32);
  const handleColor = prop.handleColor || '#f2d18b';
  const face = prop.face ?? 1;
  const baseThickness = prop.baseThickness ?? Math.max(12, height * 0.38);
  const handleLength = prop.handleLength ?? height * 0.7;
  const handleWidth = prop.handleWidth ?? Math.max(6, width * 0.22);
  const pivotRadius = prop.pivotRadius ?? Math.max(6, width * 0.2);
  const state = prop.leverState ? !!prop.leverState.active : true;
  const angle = (state ? 0.55 : -0.55) * (face < 0 ? -1 : 1);
  const pivotX = x + (face < 0 ? -width * 0.18 : width * 0.18);
  const pivotY = top + baseThickness;
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.fillRect(left, top + height - Math.max(6, height * 0.2), width, Math.max(6, height * 0.2));
  ctx.restore();
  ctx.save();
  ctx.fillStyle = baseColor;
  ctx.fillRect(left, top, width, height);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = highlight;
  ctx.fillRect(left, top, width, Math.max(4, height * 0.18));
  ctx.restore();
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  ctx.fillStyle = handleColor;
  ctx.fillRect(-handleWidth * 0.5, -handleLength, handleWidth, handleLength);
  ctx.fillStyle = shadow;
  ctx.fillRect(-handleWidth * 0.5, -handleLength, handleWidth, Math.max(3, handleLength * 0.18));
  ctx.restore();
  ctx.save();
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, pivotRadius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = shadow;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawDecorPunchingBag(ctx, prop){
  const now = nowMs();
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 48;
  const height = prop.height ?? 120;
  const halfW = width * 0.5;
  const top = baseY - height;
  let swingX = 0;
  if(prop.swing){
    const duration = prop.swing.duration ?? 620;
    const elapsed = now - (prop.swing.start || 0);
    if(elapsed <= duration){
      const phase = clamp(elapsed / duration, 0, 1);
      swingX = Math.sin(phase * Math.PI) * (prop.swing.amplitude ?? 0) * (prop.swing.direction ?? 1);
    }else{
      prop.swing = null;
    }
  }
  const offsetX = swingX;
  ctx.save();
  ctx.lineCap = 'round';
  const ropeColor = prop.ropeColor || 'rgba(218,207,178,0.9)';
  ctx.strokeStyle = ropeColor;
  ctx.lineWidth = Math.max(2, 4 * STICK_SCALE);
  ctx.beginPath();
  ctx.moveTo(x + offsetX, top - 26);
  ctx.lineTo(x + offsetX, top);
  ctx.stroke();
  const bodyColor = prop.color || '#d86f52';
  const edgeColor = prop.edgeColor || '#4a2d1f';
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = Math.max(2, 3 * STICK_SCALE);
  ctx.beginPath();
  ctx.moveTo(x + offsetX - halfW, top + halfW);
  ctx.quadraticCurveTo(x + offsetX, top, x + offsetX + halfW, top + halfW);
  ctx.lineTo(x + offsetX + halfW, baseY - halfW);
  ctx.quadraticCurveTo(x + offsetX, baseY, x + offsetX - halfW, baseY - halfW);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(x + offsetX - halfW * 0.45, top + halfW);
  ctx.lineTo(x + offsetX - halfW * 0.18, top + halfW * 0.6);
  ctx.lineTo(x + offsetX - halfW * 0.18, baseY - halfW * 0.8);
  ctx.lineTo(x + offsetX - halfW * 0.45, baseY - halfW);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign = 'center';
  const displayDamage = prop.lastDamage && now - (prop.lastDamageTime || 0) < 1000 ? prop.lastDamage : null;
  if(displayDamage){
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.font = `${Math.max(14, 18 * STICK_SCALE)}px "Arial"`;
    ctx.fillText(displayDamage, x + offsetX, top + height * 0.55);
  }else if(prop.totalDamage){
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `${Math.max(12, 16 * STICK_SCALE)}px "Arial"`;
    ctx.fillText(prop.totalDamage, x + offsetX, top + height * 0.6);
  }
  if(Array.isArray(prop.damageHistory)){
    for(let i=prop.damageHistory.length-1;i>=0;i--){
      const entry = prop.damageHistory[i];
      if(!entry) continue;
      const age = (now - entry.time) / 1000;
      if(age > 1.8){
        prop.damageHistory.splice(i, 1);
        continue;
      }
      const alpha = clamp(1 - age / 1.8, 0, 1);
      const rise = age * 36;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.max(12, 16 * STICK_SCALE)}px "Arial"`;
      ctx.fillText(entry.value, x + offsetX, top - 20 - rise);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawDecorSpawner(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 44;
  const height = prop.height ?? 68;
  const left = x - width/2;
  const top = baseY - height;
  const color = prop.color || '#3a2f5a';
  const glowBase = prop.glowColor || '#9f8cff';
  const now = nowMs();
  const pulse = 0.6 + Math.sin(now / 320) * 0.2;
  const glow = lightenColor(glowBase, 0.2 + pulse * 0.2);
  const shade = darkenColor(color, 0.28);
  const deep = darkenColor(color, 0.42);
  drawPixelPattern(ctx, SPAWNER_PIXEL_SPRITE, { B: color, H: lightenColor(color, 0.2), G: glow, S: shade, D: deep }, left, top, width, height);
}


function drawDecorWaterSpout(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 54;
  const height = prop.height ?? 44;
  const left = x - width * 0.5;
  const top = baseY - height;
  const casing = prop.casingColor || '#5a4b3a';
  const trim = prop.trimColor || lightenColor(casing, 0.24);
  const shadow = prop.shadowColor || darkenColor(casing, 0.28);
  const water = prop.waterColor || '#55c8ff';
  const spray = prop.glowColor || prop.sprayColor || '#8ce2ff';
  const now = nowMs();
  const pulse = 0.55 + Math.sin(now / 260) * 0.18;
  const waterColor = lightenColor(water, pulse * 0.3);
  const sprayColor = lightenColor(spray, 0.2);
  const deep = darkenColor(casing, 0.42);
  drawPixelPattern(ctx, WATER_SPOUT_SPRITE, {
    B: casing,
    H: trim,
    W: waterColor,
    G: sprayColor,
    S: shadow,
    D: deep
  }, left, top, width, height);
  const flowWidth = prop.flowWidth ?? Math.max(18, width * 0.38);
  const flowHeight = prop.flowHeight ?? Math.max(32, height * 1.05);
  const nozzleTop = top + height * 0.5;
  const flowLeft = x - flowWidth * 0.5;
  ctx.fillStyle = sprayColor;
  ctx.globalAlpha = clamp(0.2 + pulse * 0.5, 0.2, 0.9);
  ctx.fillRect(flowLeft, nozzleTop + height * 0.28, flowWidth, flowHeight);
  ctx.globalAlpha = 1;
}


function drawDecorLavaSpout(ctx, prop){
  const baseY = prop.baseY ?? prop.y ?? 0;
  const x = prop.x ?? 0;
  const width = prop.width ?? 54;
  const height = prop.height ?? 46;
  const left = x - width * 0.5;
  const top = baseY - height;
  const casing = prop.casingColor || '#3d2216';
  const trim = prop.trimColor || lightenColor(casing, 0.3);
  const shadow = prop.shadowColor || darkenColor(casing, 0.36);
  const lava = prop.lavaColor || '#ff7b2a';
  const glow = prop.glowColor || 'rgba(255, 172, 86, 0.82)';
  const now = nowMs();
  const pulse = 0.62 + Math.sin(now / 220) * 0.24;
  const lavaColor = lightenColor ? lightenColor(lava, pulse * 0.32) : lava;
  const glowColor = lightenColor ? lightenColor(glow, 0.18) : glow;
  const deep = darkenColor(casing, 0.48);
  drawPixelPattern(ctx, WATER_SPOUT_SPRITE, {
    B: casing,
    H: trim,
    W: lavaColor,
    G: glowColor,
    S: shadow,
    D: deep
  }, left, top, width, height);
  const flowWidth = prop.flowWidth ?? Math.max(18, width * 0.4);
  const flowHeight = prop.flowHeight ?? Math.max(38, height * 1.2);
  const nozzleTop = top + height * 0.48;
  const flowLeft = x - flowWidth * 0.5;
  ctx.fillStyle = glowColor;
  ctx.globalAlpha = clamp(0.4 + pulse * 0.45, 0.35, 0.95);
  ctx.fillRect(flowLeft, nozzleTop + height * 0.22, flowWidth, flowHeight);
  ctx.globalAlpha = 1;
}


const DEFAULT_FIRE_COLOR_STOPS = ['#ff2f1a', '#ff7a1f', '#ffd447'];
const DEFAULT_FIRE_CORE_STOPS = ['#ff9b3c', '#ffc44a', '#fff4a0'];

function particleCollisionDimensions(particle){
  if(!particle) return { width: 0, height: 0, radius: 0 };
  const def = typeof getParticleDefinitionFor === 'function'
    ? getParticleDefinitionFor(particle)
    : null;
  const fallbackWidth = def?.defaults?.collisionWidth ?? def?.defaults?.width ?? 12;
  const fallbackHeight = def?.defaults?.collisionHeight ?? def?.defaults?.height ?? fallbackWidth;
  const width = Number.isFinite(particle.collisionWidth)
    ? Math.max(1, particle.collisionWidth)
    : Number.isFinite(particle.width)
      ? Math.max(1, particle.width)
      : Number.isFinite(particle.radius)
        ? Math.max(1, particle.radius * 2)
        : Math.max(1, fallbackWidth);
  const height = Number.isFinite(particle.collisionHeight)
    ? Math.max(1, particle.collisionHeight)
    : Number.isFinite(particle.height)
      ? Math.max(1, particle.height)
      : Number.isFinite(particle.radius)
        ? Math.max(1, particle.radius * 2)
        : Math.max(1, fallbackHeight);
  const radiusFallback = def?.defaults?.collisionRadius ?? Math.max(fallbackWidth, fallbackHeight) * 0.5;
  const radius = Number.isFinite(particle.collisionRadius)
    ? Math.max(1, particle.collisionRadius)
    : Number.isFinite(particle.radius)
      ? Math.max(1, particle.radius)
      : Math.max(1, radiusFallback);
  return { width, height, radius };
}

function particleShouldCollide(particle){
  if(!particle) return false;
  if(particle.noTerrainCollision) return false;
  if(particle.ignoreTerrain) return false;
  const def = typeof getParticleDefinitionFor === 'function'
    ? getParticleDefinitionFor(particle)
    : null;
  if(def?.defaults?.noTerrainCollision) return false;
  if(def?.defaults?.collides === false) return false;
  if(particle.collides !== undefined) return !!particle.collides;
  if(def?.defaults?.collides !== undefined) return !!def.defaults.collides;
  return true;
}

const ICE_CELL_VALUE = typeof PARTICLE_TYPE_ICE === 'number' ? PARTICLE_TYPE_ICE : 8;

function fluidRangeForBox(field, left, right, top, bottom){
  const system = field?.system || field;
  if(!system) return null;
  const cols = Number.isFinite(system.cols) ? system.cols : 0;
  const rows = Number.isFinite(system.rows) ? system.rows : 0;
  if(cols <= 0 || rows <= 0) return null;
  const cellSize = Number.isFinite(system.cellSize) && system.cellSize > 0
    ? system.cellSize
    : (typeof PARTICLE_CELL_SIZE === 'number' && PARTICLE_CELL_SIZE > 0 ? PARTICLE_CELL_SIZE : 3);
  if(cellSize <= 0) return null;
  const offsetX = Number.isFinite(system.offsetX) ? system.offsetX : 0;
  const epsilon = 1e-4;
  const startCol = Math.max(0, Math.floor(((left ?? 0) - offsetX) / cellSize));
  const endCol = Math.min(cols - 1, Math.floor((((right ?? left ?? 0) - epsilon) - offsetX) / cellSize));
  if(endCol < startCol) return null;
  const startRow = Math.max(0, Math.floor(((top ?? 0)) / cellSize));
  const endRow = Math.min(rows - 1, Math.floor((((bottom ?? top ?? 0) - epsilon)) / cellSize));
  if(endRow < startRow) return null;
  return { startCol, endCol, startRow, endRow };
}

function iceOccupiesBox(world, left, right, top, bottom){
  if(!world?.water) return false;
  const field = world.water;
  const { cells } = field;
  if(!cells || !cells.length) return false;
  const range = fluidRangeForBox(field, left, right, top, bottom);
  if(!range) return false;
  const { startCol, endCol, startRow, endRow } = range;
  for(let row=startRow; row<=endRow; row++){
    const rowOffset = row * field.cols;
    for(let col=startCol; col<=endCol; col++){
      const idx = rowOffset + col;
      if(cells[idx] === ICE_CELL_VALUE) return true;
    }
  }
  return false;
}

function particleWorldOverlap(world, particle, x, y, options={}){
  if(!world || !particleShouldCollide(particle)) return false;
  const dims = particleCollisionDimensions(particle);
  if(dims.width <= 0 || dims.height <= 0) return false;
  const halfW = dims.width * 0.5;
  const halfH = dims.height * 0.5;
  const left = (x ?? particle.x ?? 0) - halfW;
  const right = left + dims.width;
  const top = (y ?? particle.y ?? 0) - halfH;
  const bottom = top + dims.height;
  if(typeof terrainSolidInBox === 'function' && terrainSolidInBox(world, left, right, top, bottom)) return true;
  if(typeof sandOccupiesBox === 'function' && sandOccupiesBox(world, left, right, top, bottom)) return true;
  if(typeof powderOccupiesBox === 'function' && powderOccupiesBox(world, left, right, top, bottom, { solidsOnly: true })) return true;
  if(typeof waterOccupiesBox === 'function' && waterOccupiesBox(world, left, right, top, bottom)) return true;
  if(typeof lavaOccupiesBox === 'function' && lavaOccupiesBox(world, left, right, top, bottom)) return true;
  if(iceOccupiesBox(world, left, right, top, bottom)) return true;
  return false;
}

function resolveParticleWorldCollisions(world, particle, prevX, prevY){
  if(!particleShouldCollide(particle)) return;
  const exclude = particle;
  const blockedX = particleWorldOverlap(world, particle, particle.x, prevY, { exclude });
  const blockedY = particleWorldOverlap(world, particle, prevX, particle.y, { exclude });
  let collided = false;
  if(blockedX){
    particle.x = prevX;
    particle.vx = 0;
    collided = true;
  }
  if(blockedY){
    particle.y = prevY;
    particle.vy = 0;
    collided = true;
  }
  if(particleWorldOverlap(world, particle, particle.x, particle.y, { exclude })){
    if(!blockedX){
      particle.x = prevX;
      particle.vx = 0;
    }
    if(!blockedY){
      particle.y = prevY;
      particle.vy = 0;
    }
    if(particleWorldOverlap(world, particle, particle.x, particle.y, { exclude })){
      particle.x = prevX;
      particle.y = prevY;
      particle.vx = 0;
      particle.vy = 0;
    }
    collided = true;
  }
  if(collided) particle.resting = true;
}

function particleIsPhysical(particle){
  if(!particle) return false;
  const def = typeof getParticleDefinitionFor === 'function'
    ? getParticleDefinitionFor(particle)
    : null;
  if(def?.defaults?.solid !== undefined) return !!def.defaults.solid;
  if(def?.defaults?.collides) return true;
  if(particle.solid) return true;
  if(particle.style === 'fire') return true;
  return false;
}

function resolveParticlePairCollisions(world, particles){
  if(!Array.isArray(particles)) return;
  const count = particles.length;
  for(let i=0; i<count; i++){
    const a = particles[i];
    if(!particleIsPhysical(a)) continue;
    for(let j=i+1; j<count; j++){
      const b = particles[j];
      if(!particleIsPhysical(b)) continue;
      const ax = a.x || 0;
      const ay = a.y || 0;
      const bx = b.x || 0;
      const by = b.y || 0;
      let dx = bx - ax;
      let dy = by - ay;
      let dist = Math.hypot(dx, dy);
      const dimsA = particleCollisionDimensions(a);
      const dimsB = particleCollisionDimensions(b);
      const minDist = dimsA.radius + dimsB.radius;
      if(minDist <= 0) continue;
      if(dist === 0){
        const angle = Math.random() * TAU;
        dx = Math.cos(angle) * 0.5;
        dy = Math.sin(angle) * 0.5;
        dist = Math.hypot(dx, dy) || 1;
      }
      if(dist < minDist){
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const adjust = overlap * 0.5;
        a.x = ax - nx * adjust;
        a.y = ay - ny * adjust;
        b.x = bx + nx * adjust;
        b.y = by + ny * adjust;
        a.resting = true;
        b.resting = true;
        const avx = a.vx || 0;
        const avy = a.vy || 0;
        const bvx = b.vx || 0;
        const bvy = b.vy || 0;
        const relVx = bvx - avx;
        const relVy = bvy - avy;
        const impact = relVx * nx + relVy * ny;
        if(impact > 0){
          const impulse = impact * 0.4;
          a.vx = avx + nx * impulse;
          a.vy = avy + ny * impulse;
          b.vx = bvx - nx * impulse;
          b.vy = bvy - ny * impulse;
        }
        resolveParticleWorldCollisions(world, a, a.x, a.y);
        resolveParticleWorldCollisions(world, b, b.x, b.y);
      }
    }
  }
}

function sampleColorStops(stops, t){
  if(!Array.isArray(stops) || !stops.length) return null;
  if(stops.length === 1) return stops[0];
  const scaled = clamp(t, 0, 1) * (stops.length - 1);
  const index = Math.max(0, Math.floor(scaled));
  const nextIndex = Math.min(stops.length - 1, index + 1);
  const frac = clamp(scaled - index, 0, 1);
  const startHex = safeHex(stops[index]);
  const endHex = safeHex(stops[nextIndex]);
  const start = startHex || stops[index];
  const end = endHex || stops[nextIndex];
  if(start && end && start.startsWith('#') && end.startsWith('#')){
    return mixHex(start, end, frac);
  }
  return frac < 0.5 ? (start || end) : (end || start);
}

function updateParticles(world, dt){
  if(!world || !world.particles || !world.particles.length) return;
  const fireSources = [];
  const baseFireRadius = typeof FIRE_PARTICLE_RADIUS === 'number' ? FIRE_PARTICLE_RADIUS : 18;
  for(const source of world.particles){
    if(!source) continue;
    const isFierySource = source.style === 'fire'
      || (typeof isFireElement === 'function' ? isFireElement(source.element) : source.element === 'fire');
    if(isFierySource){
      let radius = baseFireRadius;
      if(Number.isFinite(source.damageRadius)) radius = Math.max(radius, source.damageRadius);
      const size = Math.max(source.width || 0, source.height || 0, source.radius || 0);
      if(size > 0) radius = Math.max(radius, size * 0.5);
      fireSources.push({ x: source.x || 0, y: source.y || 0, radius });
    }
  }
  const survivors = [];
  const gravity = GRAVITY * 0.9;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  for(const p of world.particles){
    const def = typeof getParticleDefinitionFor === 'function'
      ? getParticleDefinitionFor(p)
      : null;
    if(def?.defaults){
      const defaults = def.defaults;
      if(p.maxLife === undefined && defaults.maxLife !== undefined) p.maxLife = defaults.maxLife;
      if(p.gravityScale === undefined && defaults.gravityScale !== undefined) p.gravityScale = defaults.gravityScale;
      if(p.affectedByGravity === undefined && defaults.affectedByGravity !== undefined) p.affectedByGravity = defaults.affectedByGravity;
      if(p.collides === undefined && defaults.collides !== undefined) p.collides = defaults.collides;
      if(p.solid === undefined && defaults.solid !== undefined) p.solid = defaults.solid;
      if(p.damage === undefined && defaults.damage !== undefined) p.damage = defaults.damage;
      if(p.damageRadius === undefined && defaults.damageRadius !== undefined) p.damageRadius = defaults.damageRadius;
      if(p.damageCooldown === undefined && defaults.damageCooldown !== undefined) p.damageCooldown = defaults.damageCooldown;
      if(p.damageOnContact === undefined && defaults.damageOnContact !== undefined) p.damageOnContact = defaults.damageOnContact;
    }
    const prevX = p.x || 0;
    const prevY = p.y || 0;
    p.life = (p.life || 0) + dt * 1000;
    const maxLife = Number.isFinite(p.maxLife) ? p.maxLife : (def?.defaults?.maxLife ?? 900);
    if(p.life > maxLife + 500) continue;
    if(p.style === 'iceTrail'){
      p.resting = true;
      p.vx = 0;
      p.vy = 0;
      p.spin = 0;
      if(p.baseOpacity !== undefined) p.opacity = p.baseOpacity;
      const owner = p.owner || null;
      const ownerTeam = owner ? !!owner.isEnemy : null;
      const radius = Number.isFinite(p.slowRadius)
        ? Math.max(1, p.slowRadius)
        : Math.max(p.width || p.height || 0, 6);
      if(radius > 0 && sticks.length){
        const multiplier = Number.isFinite(p.slowMultiplier)
          ? clamp(p.slowMultiplier, 0.1, 1)
          : ICE_TRAIL_DEFAULT_SLOW;
        const duration = Number.isFinite(p.slowDurationMs)
          ? Math.max(0, p.slowDurationMs)
          : ICE_TRAIL_DEFAULT_SLOW_DURATION;
        const cooldown = Number.isFinite(p.slowCooldown)
          ? Math.max(0, p.slowCooldown)
          : ICE_TRAIL_CONTACT_COOLDOWN;
        if(!p.slowMap) p.slowMap = new Map();
        const now = nowMs();
        for(const stick of sticks){
          if(!stick || stick.dead) continue;
          if(ownerTeam !== null){
            if(stick.isEnemy === ownerTeam) continue;
          }else if(!stick.isEnemy){
            continue;
          }
          if(typeof stick.resistsElement === 'function' && stick.resistsElement('ice')) continue;
          const center = typeof stick.center === 'function' ? stick.center() : null;
          if(!center) continue;
          const dx = center.x - (p.x || 0);
          const dy = center.y - (p.y || 0);
          if(Math.hypot(dx, dy) > radius) continue;
          const last = p.slowMap.get(stick) || 0;
          if(now - last < cooldown) continue;
          if(typeof stick.applySlow === 'function'){
            stick.applySlow(multiplier, duration);
            p.slowMap.set(stick, now);
          }
        }
      }
    }
    const gravityEnabled = p.affectedByGravity !== undefined
      ? p.affectedByGravity
      : def?.defaults?.affectedByGravity !== undefined
        ? def.defaults.affectedByGravity
        : true;
    if(!p.resting){
      const defaultScale = def?.defaults?.gravityScale;
      const gravityScale = p.gravityScale !== undefined ? p.gravityScale
        : defaultScale !== undefined ? defaultScale : 1;
      if(gravityEnabled && gravityScale !== 0){
        p.vy = (p.vy || 0) + gravity * gravityScale * dt;
      }
    }else{
      const friction = Math.exp(-8 * dt);
      p.vx = (p.vx || 0) * friction;
      p.spin = (p.spin || 0) * friction;
    }
    const lifeRatio = maxLife > 0 ? clamp((p.life || 0) / maxLife, 0, 1) : 1;
    if(p.style === 'ultimateLightLine'){
      p.resting = true;
      p.vx = 0;
      p.vy = 0;
      p.spin = 0;
      const lines = Array.isArray(p.lines) ? p.lines : [];
      const dtSeconds = typeof world.lastDt === 'number' && world.lastDt > 0 ? world.lastDt : dt;
      const nowTime = typeof nowMs === 'function' ? nowMs() : Date.now();
      if(typeof spawnPendingUltimateLightLineBranches === 'function'){
        spawnPendingUltimateLightLineBranches(p, world, nowTime);
      }
      for(const line of lines){
        if(!line) continue;
        if(line.pendingSoftbody){
          if(!Number.isFinite(line.softbodyEnableAt)){
            const delay = Number.isFinite(line.softbodyDelayMs) ? Math.max(0, line.softbodyDelayMs) : 0;
            line.softbodyEnableAt = (Number.isFinite(nowTime) ? nowTime : (typeof nowMs === 'function' ? nowMs() : Date.now())) + delay;
          }
          if(Number.isFinite(line.softbodyEnableAt) && nowTime >= line.softbodyEnableAt){
            if(typeof enableLightLineSoftbody === 'function'){
              enableLightLineSoftbody(line);
            }else{
              line.pendingSoftbody = false;
              line.softbodyEnabled = true;
            }
          }
        }
        const duration = Math.max(0.05, Number.isFinite(line.hangDuration) ? line.hangDuration : (p.hangDuration ?? 420) / 1000);
        if(line.hanging && !line.attached){
          line.hangTime = (line.hangTime || 0) + dtSeconds;
          const progress = clamp(line.hangTime / duration, 0, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const length = Number.isFinite(line.length)
            ? line.length
            : Math.hypot((line.tip?.x ?? line.start.x) - line.start.x, (line.tip?.y ?? line.start.y) - line.start.y);
          const angle = line.initialAngle + (line.targetAngle - line.initialAngle) * eased;
          line.tip.x = line.start.x + Math.cos(angle) * length;
          line.tip.y = line.start.y + Math.sin(angle) * length;
        }
        if(line.softbodyEnabled && typeof updateThetaLineSoftbody === 'function'){
          updateThetaLineSoftbody(line, line.start, line.tip, dtSeconds);
        }
      }
      const fadeStartRatio = clamp(p.fadeStart ?? 0.25, 0, 1);
      const fadeEndRatio = Math.max(fadeStartRatio + 0.05, clamp(p.fadeEnd ?? 1, 0, 1));
      const fadeProgress = clamp((lifeRatio - fadeStartRatio) / Math.max(0.001, fadeEndRatio - fadeStartRatio), 0, 1);
      p.opacity = clamp(1 - fadeProgress, 0, 1);
      p.alpha = p.opacity;
    }
    if(p.style === 'smoke'){
      const t = (p.life || 0) / 1000;
      const amp = p.driftAmplitude ?? 0;
      const freq = p.driftFrequency ?? 0;
      if(amp && freq){
        const noise = p.noise ?? 0;
        p.vx = Math.sin(t * freq + noise) * amp;
      }
      if(p.colorStops){
        const sampled = sampleColorStops(p.colorStops, lifeRatio);
        if(sampled){
          const alpha = clamp(p.colorAlpha ?? (p.baseOpacity ?? 0.75), 0, 1);
          p.color = sampled.startsWith('#') ? colorWithAlpha(sampled, alpha) : sampled;
        }
      }
      if(p.fadeStart !== undefined){
        const fadeStart = clamp(p.fadeStart, 0, 1);
        const fadeEnd = clamp(p.fadeEnd !== undefined ? p.fadeEnd : 1, fadeStart, 1);
        if(lifeRatio >= fadeStart){
          const fadeT = fadeEnd > fadeStart ? (lifeRatio - fadeStart) / (fadeEnd - fadeStart) : 1;
          const baseOpacity = p.baseOpacity ?? 1;
          p.opacity = clamp(baseOpacity * (1 - fadeT), 0, baseOpacity);
        }else{
          p.opacity = p.baseOpacity ?? p.opacity ?? 1;
        }
      }else if(p.baseOpacity !== undefined){
        p.opacity = p.baseOpacity;
      }
    }
    if(p.style === 'sparkle'){
      const baseOpacity = clamp(p.baseOpacity ?? 1, 0, 1.4);
      const fadeStart = clamp(p.fadeStart ?? 0.3, 0, 1);
      const fadeEnd = clamp(p.fadeEnd ?? 1, fadeStart, 1);
      let opacity = baseOpacity;
      if(lifeRatio >= fadeStart){
        const denom = Math.max(0.0001, fadeEnd - fadeStart);
        const fadeRatio = clamp((lifeRatio - fadeStart) / denom, 0, 1);
        opacity = baseOpacity * (1 - fadeRatio);
      }
      const twinkleSpeed = Number.isFinite(p.twinkleSpeed) ? p.twinkleSpeed : 8;
      const twinkleAmp = Number.isFinite(p.twinkleAmplitude) ? clamp(p.twinkleAmplitude, 0, 1.2) : 0.3;
      if(twinkleSpeed !== 0 && twinkleAmp > 0){
        const offset = Number.isFinite(p.twinkleOffset) ? p.twinkleOffset : 0;
        const t = (p.life || 0) / 1000 * twinkleSpeed + offset;
        const pulse = (Math.sin(t) + 1) * 0.5;
        const modifier = clamp(1 - twinkleAmp * 0.5 + pulse * twinkleAmp, 0, 1.4);
        opacity *= modifier;
      }
      p.opacity = opacity;
    }
    if(p.style === 'bubble'){
      const baseOpacity = p.baseOpacity ?? (p.baseOpacity = p.opacity ?? 0.85);
      const fadeStartRatio = p.fadeStart !== undefined ? clamp(p.fadeStart, 0, 1) : 0.6;
      const fadeDurationRatio = p.fadeDuration !== undefined ? Math.max(0.01, p.fadeDuration) : 0.35;
      const maxLife = p.maxLife ?? 900;
      const life = p.life || 0;
      const fadeStart = fadeStartRatio * maxLife;
      if(life >= fadeStart){
        const fadeEnd = fadeStart + fadeDurationRatio * maxLife;
        const denom = Math.max(1, fadeEnd - fadeStart);
        const ratio = clamp((life - fadeStart) / denom, 0, 1);
        p.opacity = clamp(baseOpacity * (1 - ratio), 0, baseOpacity);
      }else{
        p.opacity = baseOpacity;
      }
      const damp = p.driftDamp ?? 2.4;
      if(damp > 0){
        const factor = Math.exp(-damp * dt);
        p.vx = (p.vx || 0) * factor;
      }
      const rise = p.riseAccel ?? 0;
      if(rise !== 0){
        p.vy = (p.vy || 0) - rise * dt;
      }
    }
    if(p.style === 'text'){
      const lift = p.lift ?? 0;
      if(lift){
        p.vy = (p.vy || 0) - lift * dt;
      }
      p.vx = (p.vx || 0) * Math.exp(-4.2 * dt);
      const maxLife = p.maxLife ?? 600;
      const life = p.life || 0;
      const fadeStartRatio = clamp(p.fadeStart ?? 0.45, 0, 1);
      if(life >= maxLife * fadeStartRatio){
        const fadeLength = Math.max(1, maxLife * (1 - fadeStartRatio));
        const fadeProgress = clamp((life - maxLife * fadeStartRatio) / fadeLength, 0, 1);
        p.opacity = clamp(1 - fadeProgress, 0, 1);
      }else{
        p.opacity = 1;
      }
    }
    if(p.style === 'voidLightning'){
      const maxLifeLightning = Number.isFinite(p.maxLife) ? p.maxLife : 240;
      const fade = clamp((p.life || 0) / Math.max(1, maxLifeLightning), 0, 1);
      p.alpha = clamp(1 - fade, 0, 1);
      const jitter = Number.isFinite(p.jitter) ? p.jitter : 1.6;
      if(Array.isArray(p.points)){
        for(const point of p.points){
          if(!point) continue;
          point.x += (Math.random() - 0.5) * jitter;
          point.y += (Math.random() - 0.5) * jitter;
        }
      }
    }
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || 0) * dt;
    p.rotation = (p.rotation || 0) + (p.spin || 0) * dt;
    if(typeof p.growth === 'number'){
      p.radius = (p.radius || 0) + p.growth * dt;
    }
    const ground = groundHeightAt(world, p.x, { surface: 'top' });
    if(!p.ignoreGround && p.y >= ground){
      p.y = ground;
      if((p.vy || 0) > 140){
        p.vy = -(p.vy || 0) * 0.24;
        p.vx *= 0.65;
        p.spin *= 0.65;
      }else{
        p.vy = 0;
        p.resting = true;
      }
    }
    resolveParticleWorldCollisions(world, p, prevX, prevY);
    const dealsDamage = p.damageOnContact !== undefined
      ? p.damageOnContact
      : def?.defaults?.damageOnContact !== undefined
        ? def.defaults.damageOnContact
        : !!p.damage;
    if(dealsDamage && p.damage && sticks.length){
      const defaultRadius = def?.defaults?.damageRadius ?? Math.max(p.width || p.height || 0, p.radius || 0, 12) * 0.5;
      const radius = Number.isFinite(p.damageRadius) ? p.damageRadius : defaultRadius;
      const cooldownDefault = def?.defaults?.damageCooldown ?? 260;
      const cooldown = Number.isFinite(p.damageCooldown) ? p.damageCooldown : cooldownDefault;
      if(radius > 0){
        if(!p.hitMap) p.hitMap = new Map();
        const now = nowMs();
        const owner = p.owner || null;
        const ownerTeam = owner ? !!owner.isEnemy : null;
        const enemiesOnly = !!p.damageEnemiesOnly;
        const alliesOnly = !!p.damageAlliesOnly;
        const ignoreOwner = !!p.ignoreOwner;
        for(const stick of sticks){
          if(!stick || stick.dead) continue;
          if(owner){
            if(ignoreOwner && stick === owner) continue;
            if(enemiesOnly && ownerTeam !== null && stick.isEnemy === ownerTeam) continue;
            if(alliesOnly && ownerTeam !== null && stick.isEnemy !== ownerTeam) continue;
          }
          const center = typeof stick.center === 'function' ? stick.center() : null;
          if(!center) continue;
          const dx = center.x - p.x;
          const dy = center.y - p.y;
          if(Math.hypot(dx, dy) > radius) continue;
          const lastHit = p.hitMap.get(stick) || 0;
          if(now - lastHit < cooldown) continue;
          stick.takeDamage(p.damage, 0, 0.1, owner, {
            element: p.element || def?.defaults?.element || (owner && owner.element) || 'physical'
          });
          p.hitMap.set(stick, now);
        }
      }
    }
    if(p.style === 'fire'){
      const outerStops = Array.isArray(p.colorStops) && p.colorStops.length ? p.colorStops : DEFAULT_FIRE_COLOR_STOPS;
      const coreStops = Array.isArray(p.coreStops) && p.coreStops.length ? p.coreStops : DEFAULT_FIRE_CORE_STOPS;
      const outer = sampleColorStops(outerStops, lifeRatio);
      const inner = sampleColorStops(coreStops, lifeRatio);
      if(outer){
        p.color = outer.startsWith('#') ? colorWithAlpha(outer, 0.9) : outer;
      }
      if(inner){
        p.coreColor = inner.startsWith('#') ? colorWithAlpha(inner, 0.9) : inner;
      }
    }
    let alpha = 1;
    if(p.life > maxLife){
      alpha = clamp(1 - (p.life - maxLife) / 400, 0, 1);
      if(alpha <= 0) continue;
    }
    if(p.opacity !== undefined){
      alpha *= clamp(p.opacity, 0, 1.4);
      if(alpha <= 0) continue;
    }
    p.alpha = alpha;
    survivors.push(p);
  }
  resolveParticlePairCollisions(world, survivors);
  world.particles = survivors;
}

function drawParticles(world, ctx, targetLayer=null){
  if(!world || !world.particles || !world.particles.length) return;
  for(const p of world.particles){
    const particleLayer = p.layer || 'default';
    if(targetLayer === 'overlay'){
      if(particleLayer !== 'overlay') continue;
    }else if(targetLayer === 'default'){
      if(particleLayer === 'overlay') continue;
    }else if(targetLayer && particleLayer !== targetLayer){
      continue;
    }
    const alpha = clamp(p.alpha ?? 1, 0, 1);
    if(alpha <= 0) continue;
    ctx.save();
    if(p.disableFilters && 'filter' in ctx){
      ctx.filter = 'none';
    }
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation || 0);
    ctx.globalAlpha = alpha;
    if(p.style === 'ring'){
      const radius = Math.max(4, p.radius || 12);
      ctx.lineWidth = p.thickness ?? 2;
      ctx.strokeStyle = p.color || '#7de9ff';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.stroke();
    }else if(p.style === 'ember'){
      const width = p.width ?? 12;
      const height = p.height ?? 22;
      const gradient = ctx.createLinearGradient(0, -height, 0, 0);
      gradient.addColorStop(0, p.color || '#ff6a3c');
      gradient.addColorStop(1, 'rgba(255, 240, 210, 0.65)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.quadraticCurveTo(width * 0.45, -height * 0.2, width * 0.35, 0);
      ctx.quadraticCurveTo(0, -height * 0.25, -width * 0.35, 0);
      ctx.quadraticCurveTo(-width * 0.45, -height * 0.2, 0, -height);
      ctx.fill();
    }else if(p.style === 'sparkle'){
      const size = Math.max(3, p.size || 8);
      const glowRadius = Number.isFinite(p.glowRadius)
        ? Math.max(0, p.glowRadius)
        : size * 1.6;
      const color = p.color || '#ffffff';
      const glowColor = p.glowColor
        || (typeof colorWithAlpha === 'function' ? colorWithAlpha(color, 0.45) : color);
      if(glowRadius > 0){
        ctx.save();
        const glowAlpha = Number.isFinite(p.glowAlpha) ? clamp(p.glowAlpha, 0, 1.2) : 0.55;
        ctx.globalAlpha = alpha * glowAlpha;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      const lineWidth = p.lineWidth ?? Math.max(1.4, size * 0.32);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(size, 0);
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();
      const secondaryScale = Number.isFinite(p.secondaryScale) ? p.secondaryScale : 0.72;
      if(secondaryScale > 0){
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.lineWidth = p.secondaryLineWidth ?? Math.max(1.2, lineWidth * 0.75);
        ctx.beginPath();
        ctx.moveTo(-size * secondaryScale, 0);
        ctx.lineTo(size * secondaryScale, 0);
        ctx.moveTo(0, -size * secondaryScale);
        ctx.lineTo(0, size * secondaryScale);
        ctx.stroke();
        ctx.restore();
      }
      if(p.coreSize !== 0){
        const coreSize = Number.isFinite(p.coreSize) ? Math.max(0, p.coreSize)
          : Math.max(1.2, lineWidth * 0.7);
        if(coreSize > 0){
          ctx.fillStyle = p.coreColor || color;
          ctx.fillRect(-coreSize * 0.5, -coreSize * 0.5, coreSize, coreSize);
        }
      }
    }else if(p.style === 'ultimateLightLine'){
      const lines = Array.isArray(p.lines) ? p.lines : [];
      const offsetX = p.x || 0;
      const offsetY = p.y || 0;
      const drawLinePath = line => {
        const points = Array.isArray(line?.softbody?.points) ? line.softbody.points : null;
        if(points && points.length >= 2){
          ctx.moveTo(points[0].x - offsetX, points[0].y - offsetY);
          for(let i = 1; i < points.length; i++){
            const pt = points[i];
            ctx.lineTo(pt.x - offsetX, pt.y - offsetY);
          }
        }else if(line?.start && line?.tip){
          ctx.moveTo(line.start.x - offsetX, line.start.y - offsetY);
          ctx.lineTo(line.tip.x - offsetX, line.tip.y - offsetY);
        }
      };
      for(const line of lines){
        if(!line) continue;
        const lineOpacity = clamp((line.opacity ?? 1) * alpha, 0, 1);
        if(lineOpacity <= 0) continue;
        const baseWidth = Math.max(2, line.width ?? 12);
        const glowColor = line.glowColor || p.glowColor || 'rgba(255, 216, 255, 0.7)';
        const coreColor = line.coreColor || p.coreColor || '#ffffff';
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        if(glowColor){
          ctx.globalAlpha = lineOpacity * 0.65;
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = baseWidth * 1.6;
          ctx.beginPath();
          drawLinePath(line);
          ctx.stroke();
        }
        ctx.globalAlpha = lineOpacity;
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = baseWidth;
        ctx.beginPath();
        drawLinePath(line);
        ctx.stroke();
        ctx.restore();
        if(line.tip){
          ctx.save();
          ctx.globalAlpha = lineOpacity;
          const tipGlow = glowColor || coreColor;
          ctx.fillStyle = tipGlow;
          ctx.shadowColor = tipGlow;
          ctx.shadowBlur = Math.max(6, baseWidth * 1.2);
          ctx.beginPath();
          ctx.arc(line.tip.x - offsetX, line.tip.y - offsetY, Math.max(3, baseWidth * 0.35), 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    }else if(p.style === 'fire'){
      const width = p.width ?? 16;
      const height = p.height ?? 30;
      const gradient = ctx.createLinearGradient(0, -height, 0, height * 0.6);
      gradient.addColorStop(0, p.coreColor || 'rgba(255, 240, 200, 0.9)');
      gradient.addColorStop(0.35, p.color || '#ff933c');
      gradient.addColorStop(1, 'rgba(255, 120, 60, 0.2)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, -height);
      ctx.quadraticCurveTo(width * 0.5, -height * 0.35, width * 0.25, height * 0.45);
      ctx.quadraticCurveTo(0, height * 0.6, -width * 0.25, height * 0.45);
      ctx.quadraticCurveTo(-width * 0.5, -height * 0.35, 0, -height);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = p.coreColor || '#ffd36b';
      ctx.lineWidth = Math.max(1.2, width * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.78);
      ctx.quadraticCurveTo(width * 0.25, -height * 0.25, width * 0.12, height * 0.3);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }else if(p.style === 'smoke'){
      const radius = Math.max(6, p.radius || 12);
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(255,255,255,0.18)');
      gradient.addColorStop(1, p.color || 'rgba(90,90,90,0.75)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.15, radius, 0, 0, TAU);
      ctx.fill();
    }else if(p.style === 'iceTrail'){
      const width = Math.max(6, p.width || ICE_TRAIL_DEFAULT_WIDTH || 0);
      const height = Math.max(6, p.height || ICE_TRAIL_DEFAULT_HEIGHT || 0);
      ctx.fillStyle = p.color || 'rgba(172, 222, 255, 0.9)';
      ctx.fillRect(-width * 0.5, -height * 0.5, width, height);
      if(p.highlightColor){
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.highlightColor;
        ctx.fillRect(-width * 0.35, -height * 0.35, width * 0.7, height * 0.3);
        ctx.globalAlpha = alpha;
      }
      ctx.strokeStyle = p.edgeColor || 'rgba(120, 178, 220, 0.78)';
      ctx.lineWidth = Math.max(1.2, Math.min(width, height) * 0.18);
      ctx.strokeRect(-width * 0.5, -height * 0.5, width, height);
    }else if(p.style === 'bubble'){
      const radius = Math.max(1.8, p.radius || 3);
      ctx.fillStyle = p.fillColor || 'rgba(170, 210, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.borderColor || 'rgba(200, 236, 255, 0.9)';
      ctx.lineWidth = Math.max(0.9, radius * 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = p.highlightColor || 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = Math.max(0.5, radius * 0.2);
      ctx.beginPath();
      ctx.arc(-radius * 0.4, -radius * 0.4, radius * 0.45, -Math.PI * 0.1, Math.PI * 0.7);
      ctx.stroke();
    }else if(p.style === 'text'){
      ctx.rotate(-(p.rotation || 0));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = p.font || '600 18px system-ui, sans-serif';
      if(p.strokeColor){
        ctx.strokeStyle = p.strokeColor;
        ctx.lineWidth = p.strokeWidth ?? 2;
        ctx.strokeText(p.text || '', 0, 0);
      }
      ctx.fillStyle = p.color || '#ffffff';
      ctx.fillText(p.text || '', 0, 0);
    }else if(p.style === 'voidLightning'){
      const points = Array.isArray(p.points) ? p.points : null;
      if(points && points.length){
        ctx.globalCompositeOperation = 'lighter';
        if(p.glow){
          ctx.shadowBlur = p.glow;
          ctx.shadowColor = p.color || '#d8ccff';
        }
        ctx.strokeStyle = p.color || '#d8ccff';
        const width = p.width ?? 2;
        ctx.lineWidth = width * 1.6;
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for(const point of points){
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for(const point of points){
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        if(p.glow){
          ctx.shadowBlur = 0;
        }
      }
    }else if(p.style === 'weaponDrop'){
      const length = Math.max(18, p.length || 28);
      const thickness = Math.max(2, p.thickness || 4);
      if(p.resting){
        ctx.translate(0, -thickness/2);
      }
      ctx.fillStyle = p.color || '#d6cfc5';
      ctx.fillRect(-length/2, -thickness/2, length, thickness);
      if(p.edgeColor){
        ctx.strokeStyle = p.edgeColor;
        ctx.lineWidth = Math.max(1, thickness * 0.5);
        ctx.beginPath();
        ctx.moveTo(-length/2, -thickness/2);
        ctx.lineTo(length/2, -thickness/2);
        ctx.moveTo(-length/2, thickness/2);
        ctx.lineTo(length/2, thickness/2);
        ctx.stroke();
      }
    }else if(p.style === 'sandPuff'){
      const radius = Math.max(8, p.radius || 14);
      const rotation = p.rotation || 0;
      ctx.rotate(rotation);
      const gradient = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
      gradient.addColorStop(0, 'rgba(255, 240, 200, 0.6)');
      gradient.addColorStop(1, p.color || '#d4c089');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.2, radius, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = p.rimColor || '#b79a5b';
      ctx.lineWidth = Math.max(1.6, radius * 0.18);
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.05, radius * 0.85, 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }else{
      const width = p.width ?? 10;
      const height = p.height ?? 3;
      ctx.fillStyle = p.color || '#b57b45';
      ctx.fillRect(-width/2, -height, width, height);
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = 'rgba(255,220,180,0.35)';
      ctx.fillRect(-width/2, -height, width, height*0.4);
    }
    ctx.restore();
  }
}

function renderDoor(world, ctx){
  if(world.state!=='level') return;
  const d=world.door;
  if(!d || d.hidden) return;
  const palette = currentLevelPalette(world);
  const levelState = world.levelState || {};
  const leadsToWorldMap = !!levelState.isFinalScreen;
  if(d.open && !d.locked){
    const now = nowMs();
    const centerX = d.x + d.w * 0.5;
    const maxHeight = Math.min(260, Math.max(40, d.y));
    const heightScale = leadsToWorldMap ? 1 : 0.55;
    const targetHeight = Math.max(16, maxHeight * heightScale);
    const beamTop = Math.max(0, d.y - targetHeight);
    const beamHeight = d.y - beamTop;
    const shimmer = 0.5 + 0.25 * Math.sin(now / 420);
    const pulse = 0.55 + 0.25 * Math.sin(now / 260);
    const baseWidth = leadsToWorldMap ? Math.max(36, d.w * 1.55) : Math.max(20, d.w * 0.9);
    const innerWidth = baseWidth * ((leadsToWorldMap ? 0.52 : 0.38) + (leadsToWorldMap ? 0.18 : 0.14) * shimmer);
    const beaconBase = leadsToWorldMap ? (palette.doorBeaconWorldMap || '#f5d26a') : (palette.doorBeaconRoom || '#ffffff');
    const beaconAccent = typeof lightenColor === 'function' ? lightenColor(beaconBase, leadsToWorldMap ? 0.22 : 0.1) : beaconBase;
    const beaconHighlight = typeof lightenColor === 'function' ? lightenColor(beaconBase, leadsToWorldMap ? 0.38 : 0.24) : beaconBase;
    const outerMidStop = leadsToWorldMap ? 0.38 : 0.52;
    const innerMidStop = leadsToWorldMap ? 0.32 : 0.46;
    const outerMidAlpha = Math.min(0.5, (leadsToWorldMap ? 0.3 : 0.22) + 0.18 * pulse);
    const outerBaseAlpha = Math.min(0.5, (leadsToWorldMap ? 0.44 : 0.32) + 0.18 * pulse);
    const innerMidAlpha = Math.min(0.5, (leadsToWorldMap ? 0.36 : 0.3) + 0.22 * shimmer);
    const innerBaseAlpha = Math.min(0.5, (leadsToWorldMap ? 0.5 : 0.4) + 0.16 * pulse);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const outerGradient = ctx.createLinearGradient(centerX, beamTop, centerX, d.y);
    outerGradient.addColorStop(0, colorWithAlpha(beaconBase, 0));
    outerGradient.addColorStop(outerMidStop, colorWithAlpha(beaconBase, outerMidAlpha));
    outerGradient.addColorStop(1, colorWithAlpha(beaconAccent, outerBaseAlpha));
    ctx.fillStyle = outerGradient;
    ctx.fillRect(centerX - baseWidth * 0.5, beamTop, baseWidth, beamHeight);
    const innerGradient = ctx.createLinearGradient(centerX, beamTop, centerX, d.y);
    innerGradient.addColorStop(0, colorWithAlpha(beaconAccent, 0));
    innerGradient.addColorStop(innerMidStop, colorWithAlpha(beaconAccent, innerMidAlpha));
    innerGradient.addColorStop(1, colorWithAlpha(beaconHighlight, innerBaseAlpha));
    ctx.fillStyle = innerGradient;
    ctx.fillRect(centerX - innerWidth * 0.5, beamTop, innerWidth, beamHeight);
    ctx.restore();
  }
  const closedColor = palette.doorClosed || '#35425e';
  ctx.fillStyle = d.open ? (palette.doorOpen || '#7ad8f7') : closedColor;
  ctx.fillRect(d.x,d.y,d.w,d.h);
  ctx.strokeStyle='#0a0c12';
  ctx.strokeRect(d.x,d.y,d.w,d.h);
  const accent = palette.accent || '#aab2c3';
  if(d.locked){
    const lockWidth = Math.min(16, d.w * 0.65);
    const lockHeight = Math.min(18, d.h * 0.45);
    const lockX = d.x + d.w * 0.5 - lockWidth / 2;
    const lockY = d.y + d.h * 0.45;
    ctx.fillStyle = accent;
    ctx.fillRect(lockX, lockY, lockWidth, lockHeight);
    ctx.strokeStyle = '#0a0c12';
    ctx.lineWidth = 2;
    ctx.strokeRect(lockX, lockY, lockWidth, lockHeight);
    ctx.beginPath();
    const shackleRadius = lockWidth * 0.45;
    const shackleX = d.x + d.w * 0.5;
    ctx.arc(shackleX, lockY, shackleRadius, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = '12px system-ui';
    ctx.fillText('Locked', d.x-54, d.y+16);
  }
}

function drawBowTrajectoryPreview(world, ctx){
  if(!world || !ctx) return;
  const stick = world.selected;
  if(!stick || stick.dead || typeof stick.weapon !== 'function') return;
  const weapon = stick.weapon();
  if(!weapon || weapon.kind !== 'bow') return;
  const now = nowMs();
  const charging = !!stick.bowCharging;
  const releasing = !!(stick.bowChargeReleaseUntil && now < stick.bowChargeReleaseUntil);
  if(!charging && !releasing) return;
  if(typeof stick.center !== 'function') return;
  const origin = stick.center();
  if(!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) return;
  const aim = world.input?.aim || stick.bowChargeAim || { x: origin.x + (stick.dir >= 0 ? 220 : -220), y: origin.y - 20 };
  const dx = aim.x - origin.x;
  const dy = aim.y - origin.y;
  if(Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  const charge = weapon.charge || {};
  const maxMs = Math.max(200, charge.maxMs || 900);
  const minMs = Math.max(0, charge.minMs || 0);
  let hold = 0;
  if(charging){
    hold = Math.max(0, now - (stick.bowChargeStart || now));
  }else if(releasing){
    hold = Math.max(0, (stick.bowLastChargeRatio || 0) * maxMs);
  }else{
    hold = Math.max(0, (stick.bowLastChargeRatio || 0) * maxMs);
  }
  const ratio = maxMs > 0 ? clamp(hold / maxMs, 0, 1) : 0;
  const effectiveRatio = minMs > 0 ? clamp((hold - minMs) / Math.max(1, maxMs - minMs), 0, 1) : ratio;
  const baseSpeed = charge.minSpeed ?? weapon.speed ?? 360;
  const maxSpeed = charge.maxSpeed ?? Math.max(baseSpeed, (weapon.speed ?? baseSpeed) * 1.6);
  const speed = lerp(baseSpeed, maxSpeed, effectiveRatio);
  if(speed <= 0) return;
  const gravityEnabled = weapon.gravity !== undefined ? weapon.gravity : true;
  const g = gravityEnabled ? 1400 : 0;
  const start = { x: origin.x, y: origin.y - 6 };
  const angle = Math.atan2(dy, dx);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const ttlMs = weapon.ttl ?? 2000;
  const maxTime = Math.min(2.6, Math.max(0.3, ttlMs / 1000));
  const step = 0.06;
  const points = [];
  for(let t=0;t<=maxTime;t+=step){
    const x = start.x + vx * t;
    const y = start.y + vy * t + 0.5 * g * t * t;
    if(!Number.isFinite(x) || !Number.isFinite(y)) break;
    points.push({ x, y });
    if(y > world.height + 120) break;
    const terrainFn = typeof terrainSolidInBox === 'function' ? terrainSolidInBox : null;
    if(terrainFn && terrainFn(world, x - 6, x + 6, y - 6, y + 6, { ignoreSand: true })) break;
  }
  if(points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = weapon.projectileColor || weapon.color || 'rgba(180, 220, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.9;
  const tip = points[points.length - 1];
  ctx.fillStyle = weapon.projectileColor || '#ffffff';
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSelectionRing(world, ctx){
  const stick = world?.selected;
  if(!stick || stick.dead) return;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!center) return;
  const palette = currentLevelPalette(world);
  const gameplay = world?.ui?.settings?.gameplay || {};
  const rawStyle = typeof gameplay.selectionMarkerStyle === 'string' ? gameplay.selectionMarkerStyle.trim().toLowerCase() : '';
  const style = rawStyle === 'arrow' || rawStyle === 'outline' ? rawStyle : 'circle';
  const preferredColor = typeof gameplay.selectionMarkerColor === 'string' && gameplay.selectionMarkerColor.trim()
    ? gameplay.selectionMarkerColor.trim()
    : (palette.accent || '#6bd1ff');
  const opacityValue = Number.isFinite(gameplay.selectionMarkerOpacity) ? gameplay.selectionMarkerOpacity : 30;
  const alpha = clamp(opacityValue / 100, 0, 1);
  if(alpha <= 0) return;
  if(style === 'arrow'){
    drawSelectionArrow(ctx, stick, preferredColor, alpha);
  }else if(style === 'outline'){
    drawSelectionOutline(ctx, stick, preferredColor, alpha);
  }else{
    drawSelectionCircle(ctx, stick, center, preferredColor, alpha);
  }
}

function drawSelectionCircle(ctx, stick, center, color, alpha){
  if(!ctx || !center) return;
  ctx.save();
  const radius = Math.max(60, 96 * STICK_SCALE);
  const stroke = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, alpha) : color;
  const shadow = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, Math.min(1, alpha * 0.75)) : color;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, 3.5 * STICK_SCALE);
  ctx.shadowBlur = 14;
  ctx.shadowColor = shadow;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawSelectionArrow(ctx, stick, color, alpha){
  if(!ctx || !stick) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const head = stick.pointsByName?.head || null;
  const center = typeof stick.center === 'function' ? stick.center() : null;
  if(!head && !center) return;
  const anchorX = head ? head.x : center.x;
  let anchorY = head ? head.y + offsetY : center.y - 36 * STICK_SCALE;
  anchorY -= 20;
  const height = Math.max(26, 56 * STICK_SCALE);
  const halfWidth = Math.max(14, 34 * STICK_SCALE);
  const tipY = anchorY + height;
  ctx.save();
  const fill = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, Math.min(1, alpha * 0.85)) : color;
  const stroke = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, alpha) : color;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(2, 3 * STICK_SCALE);
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 12;
  ctx.shadowColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, Math.min(1, alpha * 0.7)) : color;
  ctx.beginPath();
  ctx.moveTo(anchorX, tipY);
  ctx.lineTo(anchorX - halfWidth, anchorY);
  ctx.lineTo(anchorX + halfWidth, anchorY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSelectionOutline(ctx, stick, color, alpha){
  if(!ctx || !stick) return;
  const offsetY = stick.renderOffsetY ?? 0;
  const segments = [
    ['kneeL', 'pelvis'],
    ['kneeR', 'pelvis'],
    ['pelvis', 'neck'],
    ['handL', 'elbowL', 'neck'],
    ['handR', 'elbowR', 'neck']
  ];
  ctx.save();
  const stroke = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, alpha) : color;
  ctx.strokeStyle = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, 8 * STICK_SCALE);
  ctx.shadowBlur = 16;
  ctx.shadowColor = typeof colorWithAlpha === 'function' ? colorWithAlpha(color, Math.min(1, alpha * 0.75)) : color;
  for(const segment of segments){
    const first = stick.pointsByName?.[segment[0]];
    if(!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y + offsetY);
    for(let i = 1; i < segment.length; i++){
      const point = stick.pointsByName?.[segment[i]];
      if(!point) continue;
      ctx.lineTo(point.x, point.y + offsetY);
    }
    ctx.stroke();
  }
  const pelvis = stick.pointsByName?.pelvis;
  const neck = stick.pointsByName?.neck;
  if(pelvis && neck){
    const scale = STICK_SCALE;
    const chestTop = neck.y + offsetY + 6 * scale;
    const waistY = pelvis.y + offsetY - 4 * scale;
    const hemY = pelvis.y + offsetY + 16 * scale;
    const shoulderWidth = 36 * scale;
    const waistWidth = 26 * scale;
    const hemWidth = 30 * scale;
    const chestHeight = Math.max(28 * scale, (pelvis.y - neck.y) * 0.72);
    ctx.beginPath();
    ctx.moveTo(neck.x - shoulderWidth * 0.55, chestTop);
    ctx.lineTo(neck.x + shoulderWidth * 0.55, chestTop);
    ctx.lineTo(pelvis.x + waistWidth * 0.62, waistY);
    ctx.lineTo(pelvis.x + hemWidth * 0.48, hemY);
    ctx.lineTo(pelvis.x - hemWidth * 0.48, hemY);
    ctx.lineTo(pelvis.x - waistWidth * 0.62, waistY);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function drawInteractionPrompt(world, ctx){
  const prompt = world?.interactionPrompt;
  if(!prompt) return;
  const palette = currentLevelPalette(world);
  const accent = prompt.accent || palette.accent || '#f2d18b';
  const now = nowMs();
  if(prompt.object){
    const bob = Math.sin((now + prompt.phaseOffset) / 260) * 6;
    drawPromptIcon(ctx, prompt.object.x, prompt.object.y + bob, accent);
  }
  if(prompt.player){
    const bob = Math.sin((now + prompt.phaseOffset + 140) / 260) * 6;
    drawPromptIcon(ctx, prompt.player.x, prompt.player.y + bob, accent);
  }
}

function drawPromptIcon(ctx, x, y, accent){
  const radius = 14;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(8, 12, 20, 0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, radius + 4, 0, TAU);
  ctx.fill();
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
  gradient.addColorStop(0, lightenColor(accent, 0.3));
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0b111c';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', 0, 0);
  ctx.restore();
}

function drawBossHealthOverlay(world, ctx){
  const state = world.levelState;
  if(!state || !state.bossRef || state.bossRef.dead) return;
  const boss = state.bossRef;
  const maxHp = boss.maxHp || 1;
  const ratio = clamp(boss.hp / maxHp, 0, 1);
  const width = Math.min(world.width - 140, 520);
  const height = 24;
  const x = (world.width - width) / 2;
  const y = 34;
  const palette = currentLevelPalette(world);
  const accent = palette.accent || '#6bd1ff';
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 20, 0.82)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  const innerPadding = 4;
  const barX = x + innerPadding;
  const barY = y + innerPadding;
  const barWidth = width - innerPadding * 2;
  const barHeight = height - innerPadding * 2;
  const fillWidth = barWidth * ratio;
  const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  gradient.addColorStop(0, '#ff3f7c');
  gradient.addColorStop(1, '#ff7ad9');
  ctx.fillStyle = gradient;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
  ctx.fillStyle = 'rgba(28, 10, 18, 0.7)';
  ctx.fillRect(barX + fillWidth, barY, barWidth - fillWidth, barHeight);
  ctx.fillStyle = '#f3f7ff';
  ctx.font = '18px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const name = state.bossName || boss.label || boss.bossName || 'Boss';
  ctx.fillText(`${name} — ${Math.max(0, boss.hp|0)}/${maxHp|0}`, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

function renderLevelBackdrop(world, ctx){
  const palette = currentLevelPalette(world);
  const top = palette.skyTop || palette.sky || '#101b2c';
  const bottom = palette.skyBottom || palette.sky || '#05080f';
  const gradient = ctx.createLinearGradient(0,0,0,world.height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0,0,world.width,world.height);
}

function applyLevelDarknessOverlay(world, ctx){
  if(!world || !ctx) return;
  if(world?.dev?.enabled) return;
  const state = world.levelState;
  const configSource = state?.darkness;
  if(!configSource) return;
  const config = typeof configSource === 'number' ? { opacity: configSource } : configSource;
  const opacityRaw = config.opacity ?? config.alpha ?? config.intensity ?? 0.85;
  const opacity = clamp(Number(opacityRaw), 0, 1);
  if(opacity <= 0) return;
  const tint = normalizeColorWithAlpha(config.color, '#000000');
  const staticLights = Array.isArray(config.lights) ? config.lights.filter(Boolean) : [];
  const dynamicLights = gatherDynamicDarknessLights(world, config);
  const combinedLights = staticLights.concat(dynamicLights);
  const resolvedLights = resolveDarknessLights(world, state, config, combinedLights);
  const lightsForRender = projectDarknessLights(world, resolvedLights);
  const buffer = ensureLevelOverlayBuffer(world, 'darkness', world.width, world.height);
  if(!buffer || !buffer.ctx) return;
  const maskCtx = buffer.ctx;
  maskCtx.save();
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.globalAlpha = 1;
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.clearRect(0, 0, buffer.canvas.width, buffer.canvas.height);
  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(0, 0, buffer.canvas.width, buffer.canvas.height);
  const tintAlpha = clamp(tint.alpha, 0, 1);
  if(tintAlpha > 0){
    maskCtx.globalCompositeOperation = 'source-atop';
    maskCtx.globalAlpha = tintAlpha;
    maskCtx.fillStyle = tint.color;
    maskCtx.fillRect(0, 0, buffer.canvas.width, buffer.canvas.height);
  }
  maskCtx.globalCompositeOperation = 'destination-out';
  maskCtx.globalAlpha = 1;
  if(lightsForRender.length){
    for(const light of lightsForRender){
      const cutout = clamp(Number(light?.cutout ?? 1), 0, 1);
      if(cutout <= 0) continue;
      const intensityValue = Number(light?.intensity);
      if(Number.isFinite(intensityValue) && intensityValue <= 0) continue;
      const removalAlpha = cutout;
      const radius = Math.max(0, Number(light?.radius) || 0);
      if(radius <= 0) continue;
      const softnessValue = Number(light?.softness);
      const configSoftness = Number(config.lightSoftness);
      const softness = Number.isFinite(softnessValue)
        ? clamp(softnessValue, 0, 1)
        : (Number.isFinite(configSoftness) ? clamp(configSoftness, 0, 1) : 0.65);
      const fadeStart = radius > 0 ? Math.max(0, Math.min(radius, radius * (1 - softness))) : 0;
      const gradient = maskCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
      const solidColor = `rgba(0, 0, 0, ${removalAlpha})`;
      gradient.addColorStop(0, solidColor);
      if(fadeStart > 0 && fadeStart < radius){
        const holdStop = Math.max(0, Math.min(1, fadeStart / radius));
        gradient.addColorStop(holdStop, solidColor);
      }
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      maskCtx.fillStyle = gradient;
      maskCtx.beginPath();
      maskCtx.arc(light.x, light.y, radius, 0, TAU);
      maskCtx.fill();
    }
  }
  maskCtx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = opacity;
  ctx.drawImage(buffer.canvas, 0, 0);
  ctx.restore();
  if(lightsForRender.length){
    const torchGlowLights = lightsForRender.filter(light => light && light.kind === 'torch');
    if(torchGlowLights.length){
      const coreScale = 0.55;
      const haloScale = 0.45;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      for(const light of torchGlowLights){
        const radius = Math.max(0, Number(light?.radius) || 0);
        if(radius <= 0) continue;
        const softnessValue = Number(light?.softness);
        const configSoftness = Number(config.lightSoftness);
        const softness = Number.isFinite(softnessValue)
          ? clamp(softnessValue, 0, 1)
          : (Number.isFinite(configSoftness) ? clamp(configSoftness, 0, 1) : 0.65);
        const glowIntensityValue = Number(light?.glowIntensity);
        const configGlowIntensity = Number(
          typeof light?.kind === 'string' ? config?.[`${light.kind}GlowIntensity`] : config?.glowIntensity
        );
        const glowIntensity = Number.isFinite(glowIntensityValue)
          ? Math.max(0, glowIntensityValue)
          : (Number.isFinite(configGlowIntensity) ? Math.max(0, configGlowIntensity) : 1);
        const baseColor = typeof light?.color === 'string' && light.color
          ? light.color
          : (typeof config?.[`${light?.kind}LightColor`] === 'string' && config?.[`${light?.kind}LightColor`]
            ? config?.[`${light?.kind}LightColor`]
            : (typeof config.lightColor === 'string' && config.lightColor ? config.lightColor : '#ffe8c0'));
        const glowColor = typeof light?.glowColor === 'string' && light.glowColor
          ? light.glowColor
          : (typeof config?.[`${light?.kind}GlowColor`] === 'string' && config?.[`${light?.kind}GlowColor`]
            ? config?.[`${light?.kind}GlowColor`]
            : (typeof config.glowColor === 'string' && config.glowColor ? config.glowColor : baseColor));
        const glowRadiusValue = Number(light?.glowRadius);
        let glowRadius = Number.isFinite(glowRadiusValue) && glowRadiusValue > 0
          ? Math.max(glowRadiusValue, radius)
          : null;
        if(!glowRadius){
          const configGlowRadius = Number(
            typeof light?.kind === 'string' ? config?.[`${light.kind}GlowRadius`] : config?.glowRadius
          );
          glowRadius = Number.isFinite(configGlowRadius) && configGlowRadius > 0
            ? Math.max(configGlowRadius, radius)
            : Math.max(radius + 36, radius * (1 + softness * 0.8));
        }
        if(glowRadius <= 0) continue;
        const coreAlpha = Math.min(glowIntensity, 1.1) * coreScale;
        const haloAlpha = Math.min(glowIntensity * 0.6, 0.85) * haloScale;
        const centerColor = scaleColorAlpha(baseColor, coreAlpha)
          || scaleColorAlpha('#ffe8c0', Math.min(glowIntensity, 1) * coreScale);
        const midColor = scaleColorAlpha(glowColor, haloAlpha)
          || scaleColorAlpha('#ffba82', Math.min(glowIntensity * 0.45, 0.7) * haloScale);
        if(!centerColor && !midColor) continue;
        const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, glowRadius);
        if(centerColor){
          gradient.addColorStop(0, centerColor);
          const innerStop = Math.max(0, Math.min(1, (radius * 0.35) / glowRadius));
          if(innerStop > 0) gradient.addColorStop(innerStop, centerColor);
        }
        if(midColor){
          const midStopBase = Math.max(0, Math.min(1, radius / glowRadius));
          const midStop = centerColor ? Math.max(Math.min(1, midStopBase), 0.25) : Math.max(0.2, midStopBase);
          gradient.addColorStop(Math.min(1, Math.max(centerColor ? midStop * 0.95 : midStop, 0.2)), midColor);
        }
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(light.x, light.y, glowRadius, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function projectDarknessLights(world, lights){
  if(!world || !Array.isArray(lights) || !lights.length) return [];
  const camera = ensureCamera(world);
  const offsetX = Math.round(world.width * 0.5 - camera.x);
  const offsetY = Math.round(world.height * 0.5 - camera.y);
  if(offsetX === 0 && offsetY === 0){
    return lights.filter(light=>light && Number.isFinite(light.x) && Number.isFinite(light.y));
  }
  const projected = [];
  for(const light of lights){
    if(!light) continue;
    if(light.screenSpace){
      projected.push(light);
      continue;
    }
    const x = Number(light.x) + offsetX;
    const y = Number(light.y) + offsetY;
    if(!Number.isFinite(x) || !Number.isFinite(y)) continue;
    projected.push({ ...light, x, y });
  }
  return projected;
}

function ensureLevelOverlayBuffer(world, key, width, height){
  if(!world || typeof document !== 'object' || !document || typeof document.createElement !== 'function') return null;
  const targetWidth = Math.max(1, Math.ceil(Number(width) || 0));
  const targetHeight = Math.max(1, Math.ceil(Number(height) || 0));
  if(targetWidth <= 0 || targetHeight <= 0) return null;
  if(!world._overlayBuffers) world._overlayBuffers = {};
  let buffer = world._overlayBuffers[key];
  if(!buffer){
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    buffer = ctx ? { canvas, ctx } : null;
    world._overlayBuffers[key] = buffer;
  }else if(buffer.canvas.width !== targetWidth || buffer.canvas.height !== targetHeight){
    buffer.canvas.width = targetWidth;
    buffer.canvas.height = targetHeight;
    buffer.ctx = buffer.canvas.getContext('2d');
  }
  return buffer;
}

function resolveDarknessLightPosition(light, world, meta, groundY){
  if(!light || !world) return null;
  const tileSize = Number(meta?.tileSize) || DEFAULT_LAYOUT_TILE_SIZE || 30;
  const tileScale = Number(meta?.tileScale) || 1;
  const offsetX = Number(meta?.offsetX) || 0;
  const rows = Number(meta?.rows) || 0;
  const baseGround = Number.isFinite(groundY) ? groundY : (world.groundY || (world.height - 100));
  let x = Number(light.x);
  if(!Number.isFinite(x)){
    const colValue = Number(light.col);
    if(Number.isFinite(colValue)){
      x = offsetX + (colValue + 0.5) * tileSize;
      const offsetUnits = Number(light.offsetX);
      if(Number.isFinite(offsetUnits)) x += offsetUnits * tileScale;
    }else if(Number.isFinite(light.centerX)){
      x = Number(light.centerX);
    }else{
      x = world.width * 0.5;
    }
  }
  let y = Number(light.y);
  if(!Number.isFinite(y)){
    const rowValue = Number(light.row);
    if(Number.isFinite(rowValue) && rows > 0){
      const clampedRow = clamp(rowValue, 0, rows - 1);
      const top = baseGround - (rows - clampedRow) * tileSize;
      y = top + tileSize * 0.5;
      const offsetUnits = Number(light.offsetY);
      if(Number.isFinite(offsetUnits)) y += offsetUnits * tileScale;
    }else if(Number.isFinite(light.centerY)){
      y = Number(light.centerY);
    }else{
      y = baseGround - tileSize;
    }
  }
  return { x, y };
}

function resolveDarknessLights(world, state, config, lights){
  if(!world || !Array.isArray(lights) || !lights.length) return [];
  const meta = state?.layoutMeta || {};
  const groundY = world.groundY || (world.height - 100);
  const resolved = [];
  for(const entry of lights){
    const light = resolveSingleDarknessLight(world, config, entry, meta, groundY);
    if(light) resolved.push(light);
  }
  return resolved;
}

function resolveSingleDarknessLight(world, config, entry, meta, groundY){
  if(!entry) return null;
  const screenSpace = entry.screenSpace === true;
  const kind = typeof entry.kind === 'string' ? entry.kind : null;
  const pickNumber = (...values)=>{
    for(const value of values){
      if(value === undefined || value === null) continue;
      const num = Number(value);
      if(Number.isFinite(num)) return num;
    }
    return undefined;
  };
  const pickString = (...values)=>{
    for(const value of values){
      if(typeof value === 'string' && value) return value;
    }
    return null;
  };
  let pos;
  if(screenSpace){
    pos = { x: Number(entry.x), y: Number(entry.y) };
  }else if(entry.worldSpace){
    pos = { x: Number(entry.x), y: Number(entry.y) };
  }else{
    pos = resolveDarknessLightPosition(entry, world, meta, groundY);
  }
  if(!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  const rawRadius = Number(entry.radius ?? entry.lightRadius ?? config.defaultLightRadius);
  const radius = Math.max(4, Number.isFinite(rawRadius) ? rawRadius : 220);
  let softness = pickNumber(entry.softness, entry.feather, config?.[`${kind}LightSoftness`], config?.lightSoftness);
  softness = softness === undefined ? 0.65 : clamp(softness, 0, 1);
  let intensity = pickNumber(entry.intensity, config?.[`${kind}LightIntensity`], config?.lightIntensity);
  intensity = intensity === undefined ? 1 : Math.max(0, intensity);
  let cutoutRaw = entry.cutout ?? entry.cut;
  let cutout;
  if(cutoutRaw === undefined){
    cutout = intensity > 0 ? 1 : 0;
  }else{
    cutout = clamp(Number(cutoutRaw), 0, 1);
  }
  let glowIntensity = pickNumber(entry.glowIntensity, config?.[`${kind}GlowIntensity`], config?.glowIntensity);
  glowIntensity = glowIntensity === undefined ? intensity : Math.max(0, glowIntensity);
  const color = pickString(entry.color, config?.[`${kind}LightColor`], config?.lightColor);
  const glowColor = pickString(entry.glowColor, config?.[`${kind}GlowColor`], config?.glowColor, color);
  let glowRadius = pickNumber(entry.glowRadius, config?.[`${kind}GlowRadius`], config?.glowRadius);
  if(Number.isFinite(glowRadius) && glowRadius > 0){
    glowRadius = Math.max(glowRadius, radius);
  }else{
    glowRadius = Math.max(radius + 36, radius * (1 + softness * 0.8));
  }
  return {
    x: pos.x,
    y: pos.y,
    radius,
    cutout,
    screenSpace,
    softness,
    intensity,
    glowIntensity,
    color,
    glowColor,
    glowRadius,
    kind,
    worldSpace: entry.worldSpace === true
  };
}
function gatherDynamicDarknessLights(world, config){
  if(!world) return [];
  const lights = [];
  const team = Array.isArray(world.team)
    ? world.team
    : (Array.isArray(world.sticks) ? world.sticks.filter(st=>st && !st.isEnemy) : []);
  const playerRadiusFull = Math.max(90, Number(config.playerLightRadius) || 200);
  const playerRadiusBase = Math.max(72, Math.round(playerRadiusFull * 0.4));
  const lightWeaponRadius = Math.max(playerRadiusFull, Number(config.lightWeaponRadius) || Math.round(playerRadiusFull * 1.75));
  const toFinite = value=>{
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };
  const playerSoftness = toFinite(config.playerLightSoftness);
  const playerIntensity = toFinite(config.playerLightIntensity);
  const playerGlowRadius = toFinite(config.playerGlowRadius);
  const playerGlowIntensity = toFinite(config.playerGlowIntensity);
  const playerColor = typeof config.playerLightColor === 'string' ? config.playerLightColor : null;
  const playerGlowColor = typeof config.playerGlowColor === 'string' ? config.playerGlowColor : null;
  for(const stick of team){
    if(!stick || stick.dead || stick.isEnemy) continue;
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(!center) continue;
    const offsetY = stick.renderOffsetY ?? 0;
    const sourceY = center.y - 18 + offsetY * 0.15;
    const weapon = typeof stick.weapon === 'function' ? stick.weapon() : null;
    const weaponId = typeof stick.currentWeaponId === 'function' ? stick.currentWeaponId() : null;
    const slot = typeof stick.currentEquipmentSlot === 'function' ? stick.currentEquipmentSlot() : null;
    const armorItem = slot?.armor || null;
    const offhandItem = slot?.offHand || null;
    const offhandInfo = offhandItem && offhandItem.type === 'offhand' ? OFFHAND_ITEMS?.[offhandItem.id] : null;
    const armorInfo = armorItem && armorItem.type === 'armor' ? ARMOR_ITEMS?.[armorItem.id] : null;
    const hasLightGlyph = stickArmorHasLightGlyph(armorItem);
    let radius = playerRadiusBase;
    if(weapon){
      radius = resolveWeaponLightRadius(weapon, weaponId, {
        lightWeaponRadius,
        playerRadiusBase,
        playerRadiusBaseFull: playerRadiusFull,
        config
      });
    }
    if(hasLightGlyph){
      radius = Math.max(radius, playerRadiusFull);
    }
    const baseRadiusBeforeBonus = radius;
    let additiveStacks = 0;
    const weaponElement = typeof weapon?.element === 'string'
      ? weapon.element
      : (typeof weapon?.staff?.element === 'string' ? weapon.staff.element : null);
    if(weaponElement && weaponElement.toLowerCase() === 'light'){
      additiveStacks += 1;
    }
    if(armorInfo && typeof armorInfo.element === 'string' && armorInfo.element.toLowerCase() === 'light'){
      additiveStacks += 1;
    }
    const offhandBonus = Number(offhandInfo?.lightRadiusBonus);
    if(Number.isFinite(offhandBonus) && offhandBonus !== 0){
      additiveStacks += offhandBonus;
    }
    if(additiveStacks !== 0){
      const multiplier = 1 + additiveStacks;
      if(multiplier > 0){
        radius = Math.max(0, baseRadiusBeforeBonus) * multiplier;
      }
    }
    const entry = {
      x: center.x,
      y: sourceY,
      radius,
      cutout: 1,
      worldSpace: true,
      kind: 'player'
    };
    if(playerSoftness !== undefined) entry.softness = playerSoftness;
    if(playerIntensity !== undefined) entry.intensity = playerIntensity;
    if(playerGlowRadius !== undefined) entry.glowRadius = playerGlowRadius;
    if(playerGlowIntensity !== undefined) entry.glowIntensity = playerGlowIntensity;
    if(playerColor) entry.color = playerColor;
    if(playerGlowColor) entry.glowColor = playerGlowColor;
    lights.push(entry);
  }
  const enemies = Array.isArray(world.sticks) ? world.sticks.filter(st=>st && st.isEnemy && !st.dead) : [];
  for(const enemy of enemies){
    if(!enemy) continue;
    const renderStyle = enemy.renderStyle || enemy.enemyKind || enemy.behavior;
    const thetaAligned = renderStyle === 'thetaHarmonic'
      || enemy.enemyKind === 'thetaHarmonic'
      || enemy.behavior === 'thetaHarmonic';
    if(!thetaAligned) continue;
    const state = enemy._thetaState || null;
    if(!state || !Array.isArray(state.lines) || !state.lines.length) continue;
    const center = typeof enemy.center === 'function' ? enemy.center() : null;
    const offsetY = enemy.renderOffsetY ?? 0;
    let addedCoreLight = false;
    for(const line of state.lines){
      if(!line) continue;
      const opacity = clamp(Number(line.opacity ?? 0), 0, 1);
      if(opacity <= 0.01) continue;
      const start = line.start || center;
      const tip = line.tip || line.anchor || null;
      if(!start && !tip) continue;
      const width = Math.max(4, Number(line.width) || 12);
      const mode = line.mode || 'chain';
      const stage = mode === 'telegraph' ? 'telegraph' : (mode === 'beam' ? 'beam' : 'chain');
      const baseRadius = Math.max(24, width * (stage === 'beam' ? 3.2 : stage === 'telegraph' ? 2 : 2.6));
      const intensityBase = stage === 'beam' ? 1.2 : stage === 'telegraph' ? 0.55 : 0.85;
      const glowScale = stage === 'beam' ? 3.6 : stage === 'telegraph' ? 2.4 : 3.1;
      const softness = stage === 'beam' ? 0.5 : stage === 'telegraph' ? 0.72 : 0.6;
      const glowColor = typeof line.glowColor === 'string' ? line.glowColor : 'rgba(255, 200, 255, 0.9)';
      const coreColor = typeof line.coreColor === 'string' ? line.coreColor : glowColor;
      const samples = [];
      if(Array.isArray(line.softbody?.points) && line.softbody.points.length >= 2){
        const points = line.softbody.points;
        const step = Math.max(1, Math.floor(points.length / 5));
        for(let i = 0; i < points.length; i += step){
          const point = points[i];
          if(!point) continue;
          samples.push({ x: point.x, y: point.y + offsetY });
        }
        const lastPoint = points[points.length - 1];
        if(lastPoint) samples.push({ x: lastPoint.x, y: lastPoint.y + offsetY });
      }else{
        if(start){
          const sx = start.x;
          const sy = (start.y ?? 0) + offsetY;
          if(Number.isFinite(sx) && Number.isFinite(sy)) samples.push({ x: sx, y: sy });
        }
        if(start && tip){
          const midX = (start.x + tip.x) * 0.5;
          const midY = ((start.y ?? 0) + (tip.y ?? 0)) * 0.5 + offsetY;
          if(Number.isFinite(midX) && Number.isFinite(midY)) samples.push({ x: midX, y: midY });
        }
        if(tip){
          const tx = tip.x;
          const ty = (tip.y ?? 0) + offsetY;
          if(Number.isFinite(tx) && Number.isFinite(ty)) samples.push({ x: tx, y: ty });
        }
      }
      if(tip){
        const tx = tip.x;
        const ty = (tip.y ?? 0) + offsetY;
        if(Number.isFinite(tx) && Number.isFinite(ty)) samples.push({ x: tx, y: ty });
      }
      const used = new Set();
      for(const sample of samples){
        if(!sample) continue;
        const px = sample.x;
        const py = sample.y;
        if(!Number.isFinite(px) || !Number.isFinite(py)) continue;
        const key = `${Math.round(px)}:${Math.round(py)}`;
        if(used.has(key)) continue;
        used.add(key);
        lights.push({
          x: px,
          y: py,
          radius: baseRadius,
          cutout: 1,
          intensity: clamp(opacity * intensityBase, 0.2, stage === 'beam' ? 1.45 : 1.05),
          softness,
          glowRadius: baseRadius * glowScale,
          glowIntensity: clamp(0.4 + opacity * (stage === 'beam' ? 0.55 : 0.35), 0.2, 1.3),
          color: coreColor,
          glowColor,
          worldSpace: true,
          kind: 'thetaLine'
        });
      }
      if(!addedCoreLight && center){
        const coreRadius = Math.max(baseRadius * 1.2, (enemy.hitboxWidth || 140) * 0.8);
        const coreGlowRadius = Math.max(coreRadius * 2.6, (enemy.hitboxWidth || 140) * 1.6);
        lights.push({
          x: center.x,
          y: center.y + offsetY,
          radius: coreRadius,
          cutout: 1,
          intensity: clamp((state.charge ?? 0.6) * 0.8 + 0.4, 0.4, 1.2),
          softness: 0.55,
          glowRadius: coreGlowRadius,
          glowIntensity: clamp(0.45 + (state.charge ?? 0) * 0.5, 0.3, 1.25),
          color: coreColor,
          glowColor,
          worldSpace: true,
          kind: 'thetaCore'
        });
        addedCoreLight = true;
      }
    }
  }
  const decor = Array.isArray(world.decor) ? world.decor : [];
  const torchSoftnessDefault = toFinite(config.torchLightSoftness);
  const torchIntensityDefault = toFinite(config.torchLightIntensity);
  const torchGlowRadiusDefault = toFinite(config.torchGlowRadius);
  const torchGlowIntensityDefault = toFinite(config.torchGlowIntensity);
  const torchColorDefault = typeof config.torchLightColor === 'string' ? config.torchLightColor : null;
  const torchGlowColorDefault = typeof config.torchGlowColor === 'string' ? config.torchGlowColor : null;
  const fireSoftnessDefault = toFinite(config.fireLightSoftness);
  const fireIntensityDefault = toFinite(config.fireLightIntensity);
  const fireGlowRadiusDefault = toFinite(config.fireGlowRadius);
  const fireGlowIntensityDefault = toFinite(config.fireGlowIntensity);
  const fireColorDefault = typeof config.fireLightColor === 'string' ? config.fireLightColor : null;
  const fireGlowColorDefault = typeof config.fireGlowColor === 'string' ? config.fireGlowColor : null;
  for(const prop of decor){
    if(!prop) continue;
    if(prop.type === 'torch' && !prop.broken){
      const width = prop.width ?? 26;
      const height = prop.height ?? 50;
      const anchor = typeof torchFlameAnchor === 'function' ? torchFlameAnchor(prop, width, height) : null;
      if(!anchor) continue;
      const baseRadiusRaw = Math.max(90, Number(prop.lightRadius) || Number(config.torchLightRadius) || 220);
      const baseRadius = Math.max(72, baseRadiusRaw * 0.75);
      const entry = {
        x: anchor.x,
        y: anchor.y - height * 0.15,
        radius: baseRadius,
        cutout: clamp(Number(prop.lightCutout) || 1, 0, 1),
        worldSpace: true,
        kind: 'torch'
      };
      const softnessValue = toFinite(prop.lightSoftness);
      const intensityValue = toFinite(prop.emitIntensity);
      const glowRadiusValue = toFinite(prop.glowRadius);
      const glowIntensityValue = toFinite(prop.glowIntensity);
      if(softnessValue !== undefined) entry.softness = softnessValue;
      else if(torchSoftnessDefault !== undefined) entry.softness = torchSoftnessDefault;
      if(intensityValue !== undefined) entry.intensity = intensityValue;
      else if(torchIntensityDefault !== undefined) entry.intensity = torchIntensityDefault;
      if(glowRadiusValue !== undefined) entry.glowRadius = glowRadiusValue;
      else if(torchGlowRadiusDefault !== undefined) entry.glowRadius = torchGlowRadiusDefault;
      if(glowIntensityValue !== undefined) entry.glowIntensity = glowIntensityValue;
      else if(torchGlowIntensityDefault !== undefined) entry.glowIntensity = torchGlowIntensityDefault;
      const torchColor = typeof prop.lightColor === 'string' ? prop.lightColor : torchColorDefault;
      if(torchColor) entry.color = torchColor;
      const torchGlowColor = typeof prop.glowColor === 'string' ? prop.glowColor : torchGlowColorDefault;
      if(torchGlowColor) entry.glowColor = torchGlowColor;
      if(entry.intensity === undefined) entry.intensity = 0.85;
      if(!entry.color) entry.color = 'rgba(255, 228, 188, 1)';
      if(!entry.glowColor) entry.glowColor = 'rgba(255, 244, 220, 0.95)';
      if(entry.glowIntensity === undefined) entry.glowIntensity = 0.6;
      lights.push(entry);
    }
    if(prop.type === 'glowCrystal'){
      const state = ensureGlowCrystalState(prop);
      const width = Math.max(6, prop.width ?? 34);
      const height = Math.max(8, prop.height ?? 48);
      const cx = prop.x ?? 0;
      const baseY = prop.baseY ?? prop.y ?? 0;
      const centerY = baseY - height * 0.5;
      const baseRadius = Number(prop.lightRadius) || Math.max(width * 4.5, 150);
      const entry = {
        x: cx,
        y: centerY,
        radius: baseRadius,
        cutout: 1,
        worldSpace: true,
        kind: 'crystal'
      };
      const softness = prop.lightSoftness;
      const baseIntensity = prop.lightBaseIntensity ?? prop.lightIntensity ?? 0.9;
      const glowRadiusValue = prop.glowRadius;
      const glowIntensityValue = prop.glowIntensity;
      if(softness !== undefined) entry.softness = softness;
      else entry.softness = 0.76;
      const intensity = clamp((state?.intensity ?? baseIntensity ?? 1), 0.2, 2.6);
      entry.intensity = intensity;
      if(glowRadiusValue !== undefined) entry.glowRadius = glowRadiusValue;
      else entry.glowRadius = baseRadius * 1.8;
      if(glowIntensityValue !== undefined) entry.glowIntensity = glowIntensityValue;
      else entry.glowIntensity = 0.62;
      entry.color = prop.lightColor || 'rgba(255, 206, 150, 0.95)';
      entry.glowColor = prop.glowColor || 'rgba(255, 150, 96, 0.82)';
      lights.push(entry);
    }
    if(prop.fireState && !prop.broken){
      const fireRadius = computeFireLightRadius(prop.fireState, Number(config.fireLightRadius) || 160);
      const width = prop.width ?? 30;
      const height = prop.height ?? 24;
      const cx = prop.x ?? 0;
      const baseY = prop.baseY ?? prop.y ?? 0;
      const centerY = baseY - height * 0.5;
      const entry = {
        x: cx,
        y: centerY,
        radius: fireRadius,
        cutout: 1,
        worldSpace: true,
        kind: 'fire'
      };
      const fireIntensity = toFinite(prop.fireState?.intensity);
      if(fireSoftnessDefault !== undefined) entry.softness = fireSoftnessDefault;
      if(fireIntensity !== undefined) entry.intensity = fireIntensity;
      else if(fireIntensityDefault !== undefined) entry.intensity = fireIntensityDefault;
      if(fireGlowRadiusDefault !== undefined) entry.glowRadius = fireGlowRadiusDefault;
      if(fireGlowIntensityDefault !== undefined) entry.glowIntensity = fireGlowIntensityDefault;
      const fireColor = typeof prop.fireState?.color === 'string' ? prop.fireState.color : fireColorDefault;
      if(fireColor) entry.color = fireColor;
      const fireGlowColor = typeof prop.fireState?.glowColor === 'string' ? prop.fireState.glowColor : fireGlowColorDefault;
      if(fireGlowColor) entry.glowColor = fireGlowColor;
      lights.push(entry);
    }
    if((prop.type === 'fireflyJar' || prop.type === 'hangingFireflyJar' || prop.type === 'ambientFireflies' || prop.type === 'fireflyJarSwarm') && prop.fireflyState && Array.isArray(prop.fireflyState.fireflies)){
      const state = prop.fireflyState;
      const permanent = !!state.permanent || prop.type === 'ambientFireflies' || !!prop.permanentFireflies;
      for(const firefly of state.fireflies){
        if(!firefly) continue;
        if(!permanent && firefly.life >= firefly.maxLife) continue;
        const radius = Math.max(6, firefly.radius || state.lightRadius || 15);
        lights.push({
          x: firefly.x,
          y: firefly.y,
          radius,
          cutout: 1,
          worldSpace: true,
          kind: 'firefly',
          intensity: 0.75,
          softness: 0.82,
          glowIntensity: 0.6,
          glowRadius: radius * 2,
          color: firefly.lightColor || state.lightColor || 'rgba(255, 240, 180, 1)',
          glowColor: firefly.glowColor || state.glowColor || 'rgba(255, 244, 210, 0.9)'
        });
      }
    }
    if(prop.type === 'chronoFlyJar' && prop.chronoFlyState && Array.isArray(prop.chronoFlyState.flies)){
      const state = prop.chronoFlyState;
      const lightRadius = Math.max(6, state.lightRadius || 18);
      const color = state.lightColor || 'rgba(142, 220, 255, 0.95)';
      const glow = state.glowColor || 'rgba(120, 210, 255, 0.75)';
      for(const fly of state.flies){
        if(!fly) continue;
        const px = fly.x ?? state.originX;
        const py = fly.y ?? state.originY;
        lights.push({
          x: px,
          y: py,
          radius: lightRadius,
          cutout: 1,
          worldSpace: true,
          kind: 'chronoFly',
          intensity: 0.78,
          softness: 0.78,
          glowIntensity: 0.62,
          glowRadius: lightRadius * 2.2,
          color,
          glowColor: glow
        });
      }
    }
  }
  const breakables = Array.isArray(world.breakables) ? world.breakables : [];
  for(const wall of breakables){
    if(!wall || !wall.fireState || wall.broken) continue;
    const fireRadius = computeFireLightRadius(wall.fireState, Number(config.fireLightRadius) || 160);
    const left = wall.x ?? 0;
    const top = wall.y ?? 0;
    const width = wall.w ?? 0;
    const height = wall.h ?? 0;
    const entry = {
      x: left + width * 0.5,
      y: top + height * 0.5,
      radius: fireRadius,
      cutout: 1,
      worldSpace: true,
      kind: 'fire'
    };
    const fireIntensity = toFinite(wall.fireState?.intensity);
    if(fireSoftnessDefault !== undefined) entry.softness = fireSoftnessDefault;
    if(fireIntensity !== undefined) entry.intensity = fireIntensity;
    else if(fireIntensityDefault !== undefined) entry.intensity = fireIntensityDefault;
    if(fireGlowRadiusDefault !== undefined) entry.glowRadius = fireGlowRadiusDefault;
    if(fireGlowIntensityDefault !== undefined) entry.glowIntensity = fireGlowIntensityDefault;
    if(fireColorDefault) entry.color = fireColorDefault;
    if(fireGlowColorDefault) entry.glowColor = fireGlowColorDefault;
    lights.push(entry);
  }
  const powderField = world.powder;
  if(powderField && powderField.types && powderField.types.length){
    const { types, cols, cellSize } = powderField;
    const rows = powderField.rows || Math.max(1, Math.ceil((world.groundY || world.height || 0) / (cellSize || 1)));
    const powderOffsetX = powderField.offsetX || 0;
    const glowInfoList = [
      { type: PARTICLE_TYPE_GLOW_PLANT_BLUE, colorKey: 'glowPlantBlueColor', glowKey: 'glowPlantBlueGlowColor' },
      { type: PARTICLE_TYPE_GLOW_PLANT_GOLD, colorKey: 'glowPlantGoldColor', glowKey: 'glowPlantGoldGlowColor' }
    ];
    const glowTypeMap = new Map(glowInfoList.map(entry=>[entry.type, entry]));
    let glowCount = 0;
    for(let i=0; i<types.length; i++){
      if(glowTypeMap.has(types[i])) glowCount++;
    }
    if(glowCount){
      const maxLights = 80;
      const stride = Math.max(1, Math.floor(glowCount / maxLights));
      const ticker = powderField.ticker || 0;
      const offset = stride > 1 ? ticker % stride : 0;
      let seen = 0;
      let added = 0;
      for(let idx=0; idx<types.length; idx++){
        const type = types[idx];
        const info = glowTypeMap.get(type);
        if(!info) continue;
        if(stride > 1){
          if(((seen + offset) % stride) !== 0){
            seen++;
            continue;
          }
        }
        seen++;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        if(row < 0 || row >= rows) continue;
        const x = powderOffsetX + col * cellSize + cellSize * 0.5;
        const y = row * cellSize + cellSize * 0.5;
        const configRef = powderField.config || {};
        const baseColor = configRef[info.colorKey] || (PARTICLE_DEFS?.[type]?.color) || '#5ad9ff';
        const glowColor = configRef[info.glowKey] || baseColor;
        const baseRadius = Math.max(12, cellSize * 6);
        const flicker = 0.7 + 0.3 * Math.sin(ticker * 0.12 + idx * 0.35);
        lights.push({
          x,
          y,
          radius: baseRadius,
          cutout: 1,
          worldSpace: true,
          kind: 'glowPlant',
          intensity: 0.45 + 0.25 * flicker,
          softness: 0.88,
          glowIntensity: 0.5 + 0.3 * flicker,
          glowRadius: baseRadius * 1.8,
          color: baseColor,
          glowColor
        });
        added++;
        if(added >= maxLights) break;
      }
    }
  }
  return lights;
}

function resolveWeaponLightRadius(weapon, weaponId, context){
  const base = context.playerRadiusBase ?? context.playerRadiusBaseFull ?? 0;
  if(!weapon) return base;
  const baseFull = Math.max(base, context.playerRadiusBaseFull ?? base);
  let radius = base;
  const promote = value=>{
    const num = Number(value);
    if(Number.isFinite(num) && num > 0){
      radius = Math.max(radius, num, baseFull);
      return true;
    }
    return false;
  };
  if(promote(weapon.lightRadius)) return radius;
  if(promote(weapon.lightEmitterRadius)) return radius;
  const special = weapon.charge?.special;
  if(promote(special?.lightRadius)) return radius;
  const id = typeof weaponId === 'string' ? weaponId : (typeof weapon.id === 'string' ? weapon.id : null);
  if(id && /refraction|sun|radiant|halo|lumen/i.test(id)){
    radius = Math.max(radius, context.lightWeaponRadius ?? baseFull);
    return radius;
  }
  return radius;
}

function computeFireLightRadius(fireState, baseRadius){
  const intensity = clamp(Number(fireState?.intensity) || 1, 0.2, 3);
  const scale = Math.sqrt(intensity);
  return Math.max(80, baseRadius * scale);
}

function stickArmorHasLightGlyph(armor){
  if(!armor || typeof armor !== 'object') return false;
  if(armor.lightGlyph === true) return true;
  const glyphFields = [armor.glyph, armor.glyphId, armor.attunedGlyph];
  for(const value of glyphFields){
    if(typeof value === 'string' && value.toLowerCase() === 'light') return true;
  }
  if(Array.isArray(armor.glyphs)){
    for(const entry of armor.glyphs){
      if(typeof entry === 'string' && entry.toLowerCase() === 'light') return true;
      if(entry && typeof entry.id === 'string' && entry.id.toLowerCase() === 'light') return true;
    }
  }
  return false;
}

const DEFAULT_LEVEL_PALETTE = {
  skyTop: '#101b2c',
  skyBottom: '#05080f',
  ground: '#6b4d2f',
  turf: '#2da160',
  doorClosed: '#35425e',
  doorOpen: '#7ad8f7',
  accent: '#6bd1ff',
  terrainStyle: 'meadow',
  blockShade: 'rgba(0,0,0,0.3)',
  blockHighlight: 'rgba(255,255,255,0.08)',
  blockAccent: '#7cd86a'
};

function currentLevelPalette(world){
  const state = world?.levelState;
  if(!state) return DEFAULT_LEVEL_PALETTE;
  if(state.voidDimensionActive && state.def?.voidSymbolRoom?.palette){
    const base = state.def.voidSymbolRoom.palette;
    const override = state.voidPaletteOverride;
    return override ? { ...base, ...override } : base;
  }
  const base = state.def?.palette || DEFAULT_LEVEL_PALETTE;
  const override = state.paletteOverride;
  return override ? { ...base, ...override } : base;
}

function currentLevelRenderFilter(world){
  const state = world?.levelState;
  if(!state) return null;
  const def = state.def || null;
  if(state.voidDimensionActive && def?.voidSymbolRoom && Object.prototype.hasOwnProperty.call(def.voidSymbolRoom, 'renderFilter')){
    return def.voidSymbolRoom.renderFilter;
  }
  const screens = Array.isArray(def?.screens) ? def.screens : null;
  const screen = (screens && state.screenIndex >= 0 && state.screenIndex < screens.length)
    ? screens[state.screenIndex]
    : null;
  if(screen && screen.renderFilter !== undefined){
    return screen.renderFilter;
  }
  return def?.renderFilter ?? null;
}

function normalizeRenderFilterConfig(filter){
  if(filter === undefined || filter === null) return null;

  const normalizeRatio = value => {
    if(value === undefined || value === null) return null;
    if(typeof value === 'string'){
      const trimmed = value.trim();
      if(!trimmed) return null;
      if(trimmed.endsWith('%')){
        const num = Number(trimmed.slice(0, -1));
        if(Number.isFinite(num)) return clamp(num / 100, 0, 1);
        return null;
      }
      const num = Number(trimmed);
      if(Number.isFinite(num)) return clamp(num > 1 ? (num > 100 ? num / 100 : num) : num, 0, 1);
      return null;
    }
    if(typeof value === 'number' && Number.isFinite(value)){
      return clamp(value > 1 ? (value > 100 ? value / 100 : value) : value, 0, 1);
    }
    return null;
  };

  const buildGrayscaleConfig = ratio => {
    const amount = normalizeRatio(ratio);
    if(!(amount > 0)) return null;
    const percent = Math.round(amount * 100);
    return {
      type: 'grayscale',
      amount,
      css: `grayscale(${percent}%)`,
      overlay: {
        type: 'desaturate',
        amount,
        color: '#808080',
        blendMode: 'color',
        fallbackColor: 'rgba(18,18,28,1)'
      }
    };
  };

  const parseCssString = value => {
    if(!value) return null;
    const trimmed = value.trim();
    if(!trimmed) return null;
    const match = trimmed.match(/grayscale\s*\(\s*([0-9.]+)(%?)\s*\)/i);
    if(match){
      let ratio = Number(match[1]);
      if(Number.isFinite(ratio)){
        if(match[2] === '%') ratio = ratio / 100;
        const config = buildGrayscaleConfig(ratio);
        if(config){
          return { ...config, css: trimmed };
        }
      }
    }
    return { css: trimmed };
  };

  if(typeof filter === 'string'){
    return parseCssString(filter);
  }
  if(typeof filter === 'number'){
    return buildGrayscaleConfig(filter);
  }
  if(typeof filter !== 'object') return null;

  if(typeof filter.css === 'string' && filter.css.trim()){
    const parsed = parseCssString(filter.css);
    if(parsed) return parsed;
  }
  if(typeof filter.filter === 'string' && filter.filter.trim()){
    const parsed = parseCssString(filter.filter);
    if(parsed) return parsed;
  }
  const kind = typeof filter.type === 'string'
    ? filter.type.trim().toLowerCase()
    : (typeof filter.kind === 'string' ? filter.kind.trim().toLowerCase() : '');
  if(kind === 'grayscale' || kind === 'mono' || kind === 'monochrome'){
    let raw = filter.amount;
    if(raw === undefined) raw = filter.value;
    if(raw === undefined) raw = filter.intensity;
    if(raw === undefined) raw = filter.ratio;
    if(raw === undefined) raw = 1;
    const config = buildGrayscaleConfig(raw);
    if(config) return config;
    return null;
  }
  return null;
}

function resolveLevelRenderFilter(world){
  const filter = currentLevelRenderFilter(world);
  return normalizeRenderFilterConfig(filter);
}

function shouldUseCanvasFilter(world, filterConfig){
  if(!filterConfig || !filterConfig.css) return false;
  const visual = world?.ui?.settings?.visual || {};
  const preference = typeof visual.levelFilterMode === 'string'
    ? visual.levelFilterMode.trim().toLowerCase()
    : null;
  if(preference === 'disabled' || preference === 'off') return false;
  if(preference === 'canvas') return true;
  if(visual.graphicsQuality === 'low') return false;
  if(filterConfig.type === 'grayscale'){ // grayscale filters are expensive on some GPUs
    return preference === 'grayscale-canvas';
  }
  return true;
}

function applyRenderFilterOverlay(world, ctx, overlay){
  if(!overlay || !ctx) return;
  const width = world?.width || ctx.canvas?.width || 0;
  const height = world?.height || ctx.canvas?.height || 0;
  if(!(width > 0 && height > 0)) return;
  const amount = clamp(Number(overlay.amount) || 0, 0, 1);
  if(!(amount > 0)) return;
  const color = overlay.color || '#808080';
  const blendMode = overlay.blendMode || (overlay.type === 'desaturate' ? 'color' : 'source-over');
  const fallbackColor = overlay.fallbackColor || 'rgba(20,20,28,1)';
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = blendMode;
  if(ctx.globalCompositeOperation !== blendMode){
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.max(0.18, amount * 0.5);
    ctx.fillStyle = fallbackColor;
  }else{
    ctx.fillStyle = color;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function defaultSkillAllocations(){
  return { health: 0, attack: 0, defense: 0 };
}

function skillMultipliersFromAllocations(skills){
  const base = defaultSkillAllocations();
  if(skills && typeof skills === 'object'){
    if(Number.isFinite(skills.health)) base.health = Math.max(0, skills.health);
    if(Number.isFinite(skills.attack)) base.attack = Math.max(0, skills.attack);
    if(Number.isFinite(skills.defense)) base.defense = Math.max(0, skills.defense);
  }
  return {
    health: 1 + base.health,
    attack: 1 + base.attack,
    defense: 1 + base.defense
  };
}

function cloneSkillAllocations(skills){
  const base = defaultSkillAllocations();
  if(!skills || typeof skills !== 'object') return base;
  if(Number.isFinite(skills.health)) base.health = Math.max(0, skills.health|0);
  if(Number.isFinite(skills.attack)) base.attack = Math.max(0, skills.attack|0);
  if(Number.isFinite(skills.defense)) base.defense = Math.max(0, skills.defense|0);
  return base;
}

const HEAD_SHAPE_OPTIONS = Object.freeze(['square','circle','triangle','pentagon','hexagon','star']);
const DEFAULT_HEAD_SHAPE = 'square';
const MAX_STICK_NAME_LENGTH = 18;

function getAvailableHeadShapes(){
  return Array.from(HEAD_SHAPE_OPTIONS);
}

function sanitizeHeadShape(shape){
  const value = typeof shape === 'string' ? shape.trim().toLowerCase() : '';
  if(HEAD_SHAPE_OPTIONS.includes(value)) return value;
  return DEFAULT_HEAD_SHAPE;
}

function createStickProfile(name){
  const cleanedName = sanitizeStickName(name);
  return {
    name: cleanedName || null,
    level: 1,
    xp: 0,
    nextXp: Infinity,
    maxHp: 50,
    hp: 50,
    attack: 1,
    defense: 1,
    skillPoints: 0,
    skills: defaultSkillAllocations(),
    heldItem: null,
    bodyColor: null,
    headShape: DEFAULT_HEAD_SHAPE
  };
}

function sanitizeStickName(name){
  if(typeof name !== 'string') return '';
  const compact = name.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return compact.slice(0, MAX_STICK_NAME_LENGTH);
}

function cloneStickProfile(data){
  const profile = createStickProfile(data?.name);
  if(!data) return profile;
  profile.name = sanitizeStickName(data.name) || profile.name;
  profile.level = data.level ?? profile.level;
  profile.xp = data.xp ?? profile.xp;
  profile.nextXp = data.nextXp ?? profile.nextXp;
  profile.maxHp = data.maxHp ?? profile.maxHp;
  profile.attack = data.attack ?? profile.attack;
  profile.defense = data.defense ?? profile.defense;
  profile.skillPoints = Math.max(0, data.skillPoints ?? profile.skillPoints ?? 0);
  profile.skills = cloneSkillAllocations(data.skills);
  const multipliers = skillMultipliersFromAllocations(profile.skills);
  const finalMaxHp = profile.maxHp * multipliers.health;
  const hp = data.hp ?? finalMaxHp;
  profile.hp = clamp(hp, 1, finalMaxHp);
  const heldSource = data.heldItem;
  if(heldSource && typeof heldSource === 'object' && heldSource.type === 'scoutDroneRemote'){
    profile.heldItem = null;
    profile.legacyScoutDroneRemote = true;
  }else{
    profile.heldItem = typeof cloneCarriedItem === 'function' ? cloneCarriedItem(heldSource) : null;
  }
  if(data.bodyColor === null){
    profile.bodyColor = null;
  }else if(data.bodyColor !== undefined){
    const safeColor = safeHex(data.bodyColor);
    if(safeColor) profile.bodyColor = safeColor;
  }
  profile.headShape = sanitizeHeadShape(data.headShape);
  return profile;
}

function ensureTeamProfiles(list){
  const arr = Array.isArray(list) ? list.map(cloneStickProfile) : [];
  while(arr.length < TEAM_SIZE) arr.push(cloneStickProfile());
  if(arr.length > TEAM_SIZE) arr.length = TEAM_SIZE;
  return arr;
}

function cloneInventorySlot(slot){
  return cloneEquipmentSlot(slot);
}

function normalizeLoadout(inv){
  const arr = Array.isArray(inv) ? inv.map(createEquipmentSlot) : [];
  while(arr.length < TEAM_SIZE) arr.push(createEquipmentSlot());
  if(arr.length > TEAM_SIZE) arr.length = TEAM_SIZE;
  return arr;
}

function normalizeArmory(list){
  if(!Array.isArray(list)) return [];
  const cleaned = [];
  for(const entry of list){
    const item = cloneEquipmentItem(entry);
    if(item) cleaned.push(item);
  }
  return cleaned;
}

function cloneArmory(list){
  return normalizeArmory(list);
}

function cloneFastReloadModes(modes){
  if(!modes || typeof modes !== 'object') return {};
  const cloned = {};
  for(const key of Object.keys(modes)){
    if(modes[key]) cloned[key] = true;
  }
  return cloned;
}

function clampTeamSlotCount(value){
  const maxSlots = Number.isFinite(TEAM_SIZE) && TEAM_SIZE > 0 ? TEAM_SIZE : 3;
  if(!Number.isFinite(value)) return maxSlots;
  return clamp(Math.round(value), 1, maxSlots);
}

function getUnlockedTeamSlots(world){
  if(world && world.profile && Number.isFinite(world.profile.teamSlotsUnlocked)){
    return clampTeamSlotCount(world.profile.teamSlotsUnlocked);
  }
  if(world && world.levelState && world.levelState.entrySnapshot && Number.isFinite(world.levelState.entrySnapshot.teamSlotsUnlocked)){
    return clampTeamSlotCount(world.levelState.entrySnapshot.teamSlotsUnlocked);
  }
  return clampTeamSlotCount(TEAM_SIZE);
}

function setUnlockedTeamSlots(world, slots){
  const clamped = clampTeamSlotCount(slots);
  if(world?.profile){
    world.profile.teamSlotsUnlocked = clamped;
    world.profile.activeIndex = clamp(world.profile.activeIndex ?? 0, 0, Math.max(0, clamped - 1));
    world.profile.team = ensureTeamProfiles(world.profile.team);
    world.profile.inventory = normalizeLoadout(world.profile.inventory);
    world.profile.armory = normalizeArmory(world.profile.armory);
  }
  if(world?.levelState?.entrySnapshot){
    world.levelState.entrySnapshot.teamSlotsUnlocked = clamped;
    world.levelState.entrySnapshot.activeIndex = clamp(world.levelState.entrySnapshot.activeIndex ?? 0, 0, Math.max(0, clamped - 1));
    world.levelState.entrySnapshot.team = ensureTeamProfiles(world.levelState.entrySnapshot.team);
  }
  if(world){
    world.teamActiveIndex = clamp(world.teamActiveIndex ?? 0, 0, Math.max(0, clamped - 1));
  }
  return clamped;
}

function cloneTeamSnapshot(snapshot){
  const team = ensureTeamProfiles(snapshot?.team || []);
  const loadout = normalizeLoadout(snapshot?.loadout || []);
  const armory = normalizeArmory(snapshot?.armory || []);
  const unlockedSlots = clampTeamSlotCount(snapshot?.teamSlotsUnlocked ?? TEAM_SIZE);
  const activeIndex = clamp(snapshot?.activeIndex ?? 0, 0, Math.max(0, unlockedSlots - 1));
  const coins = snapshot?.coins ?? 0;
  const fastReloadModes = cloneFastReloadModes(snapshot?.fastReloadModes);
  const glyphSource = snapshot && Object.prototype.hasOwnProperty.call(snapshot, 'glyphInventory')
    ? snapshot.glyphInventory
    : defaultGlyphInventory();
  const glyphInventory = cloneGlyphInventory(glyphSource || []);
  const ensureChronoBladeStored = ()=>{
    const hasEquipped = loadout.some(slot=>slot?.mainHand && slot.mainHand.type === 'weapon' && slot.mainHand.id === 'chronoBlade');
    if(hasEquipped) return;
    if(armory.some(entry=>entry && entry.type === 'weapon' && entry.id === 'chronoBlade')) return;
    armory.push({ type: 'weapon', id: 'chronoBlade' });
  };
  const ensureRemoteStored = ()=>{
    if(armory.some(entry=>entry && entry.type === 'offhand' && entry.id === 'scoutDroneRemote')) return;
    armory.push({ type: 'offhand', id: 'scoutDroneRemote' });
  };
  for(let i=0;i<team.length && i<loadout.length;i++){
    const profile = team[i];
    const slot = createEquipmentSlot(loadout[i]);
    loadout[i] = slot;
    let needsRemote = false;
    if(profile){
      if(profile.legacyScoutDroneRemote){
        needsRemote = true;
        delete profile.legacyScoutDroneRemote;
      }
      if(profile.heldItem && profile.heldItem.type === 'scoutDroneRemote'){
        profile.heldItem = null;
        needsRemote = true;
      }
    }
    if(needsRemote){
      if(!slot.offHand || slot.offHand.type !== 'offhand'){
        slot.offHand = { type: 'offhand', id: 'scoutDroneRemote' };
      }else if(slot.offHand.id !== 'scoutDroneRemote'){
        ensureRemoteStored();
      }
    }
  }
  ensureChronoBladeStored();
  return { team, loadout, armory, activeIndex, coins, fastReloadModes, glyphInventory, teamSlotsUnlocked: unlockedSlots };
}

function applyTeamSnapshotToProfile(world, snapshot){
  if(!world?.profile) return;
  const restored = cloneTeamSnapshot(snapshot);
  world.profile.team = restored.team;
  world.profile.inventory = restored.loadout;
  world.profile.armory = restored.armory;
  world.profile.activeIndex = restored.activeIndex;
  world.profile.teamSlotsUnlocked = clampTeamSlotCount(restored.teamSlotsUnlocked ?? TEAM_SIZE);
  world.profile.coins = restored.coins ?? world.profile.coins ?? 0;
  world.profile.fastReloadModes = restored.fastReloadModes || {};
  world.profile.glyphInventory = cloneGlyphInventory(restored.glyphInventory || []);
}

function profileToTeamSnapshot(profile){
  if(!profile) return cloneTeamSnapshot(null);
  return cloneTeamSnapshot({
    team: profile.team,
    loadout: profile.inventory,
    armory: profile.armory,
    activeIndex: profile.activeIndex,
    coins: profile.coins,
    fastReloadModes: profile.fastReloadModes,
    glyphInventory: profile.glyphInventory,
    teamSlotsUnlocked: profile.teamSlotsUnlocked
  });
}

function normalizeMapRequirements(value){
  if(!value) return [];
  if(Array.isArray(value)){
    return value.map(v=>String(v ?? '').trim()).filter(Boolean);
  }
  if(typeof value === 'string'){
    return value.split(',').map(part=>part.trim()).filter(Boolean);
  }
  return [];
}

function normalizeMapWorldId(value){
  if(typeof value === 'string'){
    const trimmed = value.trim().toLowerCase();
    if(trimmed) return trimmed;
  }
  return WORLD_MAP_ID_SURFACE;
}

function buildWorldMap(options){
  const worldId = normalizeMapWorldId(options?.worldId);
  const theme = options?.theme || (worldId === WORLD_MAP_ID_MONOCHROME ? 'monochrome' : 'surface');
  const title = options?.title
    || (worldId === WORLD_MAP_ID_MONOCHROME ? 'Monochrome Atlas' : 'World Map');
  const subtitle = options?.subtitle
    || (worldId === WORLD_MAP_ID_MONOCHROME
      ? 'Hover the Reliquary Tree and press F to return to the canopy.'
      : 'Click a stage to deploy. Defeat earlier stages to unlock more.');
  const visibleDefs = LEVEL_DEFS.filter(def=>{
    const mapConfig = def.map || {};
    const mapWorld = normalizeMapWorldId(mapConfig.world);
    if(mapWorld !== worldId) return false;
    return !mapConfig.hidden;
  });
  let firstMainlineIndex = -1;
  for(let i=0;i<visibleDefs.length;i++){
    const def = visibleDefs[i];
    const mapConfig = def.map || {};
    const standalone = !!(mapConfig.standalone || def.standalone);
    const optional = !!(def.optional || mapConfig.optional);
    const requiresAll = !!(def.requiresAllComplete || mapConfig.requiresAllComplete);
    const playable = !!(def.playable && def.screens && def.screens.length);
    if(playable && !optional && !standalone && !requiresAll){
      firstMainlineIndex = i;
      break;
    }
  }
  let mainlineCounter = 0;
  const nodes = [];
  let visibleIndex = 0;
  for(const def of LEVEL_DEFS){
    const mapConfig = def.map || {};
    const mapWorld = normalizeMapWorldId(mapConfig.world);
    if(mapWorld !== worldId) continue;
    const standalone = !!(mapConfig.standalone || def.standalone);
    const optional = !!(def.optional || mapConfig.optional);
    const requiresAll = !!(def.requiresAllComplete || mapConfig.requiresAllComplete);
    const bossStage = !!(def.bossStage || mapConfig.boss);
    const playable = !!(def.playable && def.screens && def.screens.length);
    const mapLabel = def.map && typeof def.map.label === 'string' && def.map.label.trim()
      ? def.map.label.trim()
      : (typeof def.stageCode === 'string' && def.stageCode.trim() ? def.stageCode.trim() : null);
    const isMainline = playable && !optional && !standalone && !requiresAll;
    const requiresStages = normalizeMapRequirements(mapConfig.requires || mapConfig.requiresStages || def.requiresStages || def.unlockRequires);
    const hasRequirements = requiresStages.length > 0;
    if(isMainline) mainlineCounter++;
    let order = mapConfig.order ?? def.mapOrder;
    if(order == null){
      if(isMainline){
        order = mainlineCounter;
      }else if(bossStage){
        order = 'Ω';
      }else{
        order = visibleIndex + 1;
      }
    }
    const autoUnlock = !hasRequirements && !!(def.alwaysUnlocked || standalone || visibleIndex===firstMainlineIndex);
    const initiallyUnlocked = autoUnlock && (!requiresAll || visibleIndex===firstMainlineIndex);
    const difficulty = Number.isFinite(def.difficultyMultiplier) ? def.difficultyMultiplier : 1;
    nodes.push({
      id: def.id,
      name: def.name,
      description: def.description || '',
      playable,
      x: mapConfig.x ?? (0.2 + 0.3*visibleIndex),
      y: mapConfig.y ?? 0.5,
      unlocked: initiallyUnlocked,
      savedUnlocked: initiallyUnlocked,
      completed: false,
      order,
      color: def.color || '#3a4255',
      standalone,
      autoUnlock,
      requiresAllComplete: requiresAll,
      optional,
      boss: bossStage,
      branch: mapConfig.branch || null,
      branchStep: Number.isFinite(Number(mapConfig.branchStep)) ? Number(mapConfig.branchStep) : null,
      parent: typeof mapConfig.parent === 'string' && mapConfig.parent.trim() ? mapConfig.parent.trim() : null,
      label: mapLabel,
      requiresStages,
      difficultyMultiplier: difficulty
    });
    visibleIndex++;
  }
  return {
    id: worldId,
    worldId,
    nodes,
    theme,
    title,
    subtitle,
    hoverId: null,
    pointer: null,
    pointerMap: null,
    message: '',
    messageTimer: 0,
    unlockOverride: false,
    centerX: 0.5,
    centerY: 0.5,
    targetCenterX: 0.5,
    targetCenterY: 0.5,
    zoom: 1,
    targetZoom: 1,
    minZoom: 0.7,
    maxZoom: 1.8,
    panDamping: 12,
    zoomDamping: 10,
    dragging: false,
    dragActive: false,
    dragButton: 0,
    dragStart: null,
    dragLast: null
  };
}

function createWorldMapSet(){
  const surface = buildWorldMap({ worldId: WORLD_MAP_ID_SURFACE });
  const monochrome = buildWorldMap({ worldId: WORLD_MAP_ID_MONOCHROME, theme: 'monochrome' });
  return {
    [WORLD_MAP_ID_SURFACE]: surface,
    [WORLD_MAP_ID_MONOCHROME]: monochrome
  };
}

function getAllMaps(world){
  const maps = [];
  if(world?.maps && typeof world.maps === 'object'){
    for(const key of Object.keys(world.maps)){
      const map = world.maps[key];
      if(map) maps.push(map);
    }
  }else if(world?.map){
    maps.push(world.map);
  }
  return maps;
}

function ensureUnlockedMapSet(world){
  if(!world) return;
  if(!(world.unlockedMapIds instanceof Set)){
    const unlocked = Array.isArray(world.unlockedMapIds)
      ? world.unlockedMapIds
      : [];
    world.unlockedMapIds = new Set(unlocked);
  }
  world.unlockedMapIds.add(WORLD_MAP_ID_SURFACE);
}

function hasWorldMapUnlocked(world, mapId){
  if(!world) return false;
  ensureUnlockedMapSet(world);
  const id = normalizeMapWorldId(mapId);
  return world.unlockedMapIds.has(id);
}

function unlockWorldMap(world, mapId){
  if(!world) return false;
  const id = normalizeMapWorldId(mapId);
  ensureUnlockedMapSet(world);
  if(world.unlockedMapIds.has(id)) return false;
  world.unlockedMapIds.add(id);
  return true;
}

function switchWorldMap(world, mapId){
  if(!world?.maps) return false;
  const id = normalizeMapWorldId(mapId);
  if(!hasWorldMapUnlocked(world, id)) return false;
  const target = world.maps[id];
  if(!target || world.map === target) return false;
  world.activeMapId = id;
  world.map = target;
  if(world.map){
    world.map.hoverId = null;
    world.map.pointer = null;
    world.map.pointerMap = null;
    world.map.message = '';
    world.map.messageTimer = 0;
    clampMapView(world.map, world);
  }
  restoreDefaultMapUnlocks(world, target);
  if(world.state === 'map') updateWorldMap(world, 0);
  return true;
}

function restoreAllMapUnlocks(world){
  for(const map of getAllMaps(world)){
    restoreDefaultMapUnlocks(world, map);
  }
}

function isStageCompleted(world, stageId){
  if(!stageId) return false;
  for(const map of getAllMaps(world)){
    const node = map?.nodes?.find(n=>n && n.id === stageId);
    if(node?.completed) return true;
  }
  return false;
}

function applySavedMapState(map, savedState){
  if(!map?.nodes || !savedState?.nodes) return;
  for(const savedNode of savedState.nodes){
    const node = map.nodes.find(n=>n && n.id === savedNode.id);
    if(!node) continue;
    if(savedNode.completed){
      node.completed = true;
      node.savedUnlocked = true;
    }
    if(savedNode.unlocked){
      node.savedUnlocked = true;
      node.unlocked = true;
    }
  }
}

function collectMapNodesForSave(map){
  if(!map?.nodes) return [];
  return map.nodes.map(node=>({
    id: node.id,
    completed: !!node.completed,
    unlocked: !!(node.savedUnlocked ?? node.unlocked)
  }));
}

function createPlayerProfile(){
  const defaults = ensureTeamProfiles([
    { ...createStickProfile('Vanguard') },
    { ...createStickProfile('Striker') },
    { ...createStickProfile('Arcanist') }
  ]);
  const loadout = cloneInventory(defaultInventory());
  if(loadout.length > 0){
    loadout[0] = createEquipmentSlot({
      mainHand: { type: 'weapon', id: 'sigilBlade' },
      offHand: { type: 'offhand', id: 'scoutDroneRemote' }
    });
  }
  const startingArmory = cloneArmory([
    { type: 'weapon', id: 'chronoBlade' }
  ]);
  const profile = {
    team: defaults,
    teamSlotsUnlocked: 1,
    activeIndex: 0,
    inventory: loadout,
    armory: startingArmory,
    coins: 0,
    fastReloadModes: {},
    glyphInventory: cloneGlyphInventory(defaultGlyphInventory()),
    openedChests: [],
    drainedChests: [],
    claimedPedestals: []
  };
  if(typeof ensureAbilityUnlocks === 'function'){
    ensureAbilityUnlocks(profile);
  }
  return profile;
}

function cloneInventory(inv){
  if(!inv) inv = defaultInventory();
  return normalizeLoadout(inv);
}

function applyStickProfileToStick(stick, profile){
  if(!stick || !profile) return;
  stick.label = profile.name || stick.label || null;
  stick.level = profile.level ?? stick.level;
  stick.xp = profile.xp ?? stick.xp;
  stick.nextXp = profile.nextXp ?? stick.nextXp;
  const baseMaxHp = Number.isFinite(profile.maxHp) ? profile.maxHp : (Number.isFinite(stick.maxHpBase) ? stick.maxHpBase : stick.maxHp);
  const savedHp = profile.hp ?? baseMaxHp;
  stick.maxHpBase = baseMaxHp;
  stick.maxHp = baseMaxHp;
  stick.hp = savedHp;
  stick.attackBase = profile.attack ?? stick.attackBase ?? stick.attack ?? 0;
  stick.defenseBase = profile.defense ?? stick.defenseBase ?? stick.defense ?? 0;
  stick.attack = stick.attackBase;
  stick.defense = stick.defenseBase;
  stick.equipmentAttackBonus = 0;
  stick.equipmentDefenseBonus = 0;
  stick.skillPoints = Math.max(0, profile.skillPoints ?? stick.skillPoints ?? 0);
  stick.skillAllocations = cloneSkillAllocations(profile.skills || stick.skillAllocations);
  let heldItem = profile.heldItem;
  if(heldItem && heldItem.type === 'scoutDroneRemote') heldItem = null;
  stick.heldItem = typeof cloneCarriedItem === 'function' ? cloneCarriedItem(heldItem) : null;
  if(profile.bodyColor === null){
    stick.bodyColor = null;
  }else if(profile.bodyColor !== undefined){
    const safeColor = safeHex(profile.bodyColor);
    if(safeColor) stick.bodyColor = safeColor;
  }
  stick.headShape = sanitizeHeadShape(profile.headShape);
  if(typeof recomputeStickEquipmentBonuses === 'function'){
    recomputeStickEquipmentBonuses(stick);
  }
  if(Number.isFinite(savedHp)){
    stick.hp = clamp(savedHp, 1, stick.maxHp);
  }else{
    stick.hp = clamp(stick.hp, 1, stick.maxHp);
  }
}

function stickToProfile(stick){
  if(!stick) return cloneStickProfile();
  const multipliers = skillMultipliersFromAllocations(stick.skillAllocations || defaultSkillAllocations());
  const baseMaxHp = Number.isFinite(stick.maxHpBase)
    ? stick.maxHpBase
    : (multipliers.health > 0 ? (stick.maxHp ?? 0) / multipliers.health : (stick.maxHp ?? 0));
  const baseAttack = Number.isFinite(stick.attackBase)
    ? stick.attackBase
    : (multipliers.attack > 0 ? (stick.attack ?? 0) / multipliers.attack : (stick.attack ?? 0));
  const baseDefense = Number.isFinite(stick.defenseBase)
    ? stick.defenseBase
    : (multipliers.defense > 0 ? (stick.defense ?? 0) / multipliers.defense : (stick.defense ?? 0));
  let heldItem = stick.heldItem;
  if(heldItem && heldItem.type === 'scoutDroneRemote') heldItem = null;
  return cloneStickProfile({
    name: stick.label,
    level: stick.level,
    xp: stick.xp,
    nextXp: stick.nextXp,
    maxHp: baseMaxHp,
    hp: Math.max(1, Math.min(stick.hp, stick.maxHp)),
    attack: baseAttack,
    defense: baseDefense,
    skillPoints: stick.skillPoints ?? 0,
    skills: stick.skillAllocations || defaultSkillAllocations(),
    bodyColor: stick.bodyColor || null,
    headShape: sanitizeHeadShape(stick.headShape),
    heldItem: typeof cloneCarriedItem === 'function' ? cloneCarriedItem(heldItem) : null
  });
}

function updateProfileEntryFromStick(world, stick){
  if(!world?.profile || !stick) return;
  const teamList = ensureTeamProfiles(world.profile.team);
  let teamIndex = typeof stick.teamIndex === 'number' ? stick.teamIndex : (Array.isArray(world.team) ? world.team.indexOf(stick) : -1);
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length || (Array.isArray(world.team) ? world.team.length : 3));
  if(!Number.isInteger(teamIndex) || teamIndex < 0){
    teamIndex = clamp(world.teamActiveIndex ?? world.profile.activeIndex ?? 0, 0, Math.max(0, teamLimit-1));
  }else{
    teamIndex = clamp(teamIndex, 0, Math.max(0, teamLimit-1));
  }
  teamList[teamIndex] = stickToProfile(stick);
  world.profile.team = teamList;
}

function spendSkillPoint(world, teamIndex, stat){
  if(!world || !stat) return false;
  const validStats = ['health', 'attack', 'defense'];
  const key = String(stat).toLowerCase();
  if(!validStats.includes(key)) return false;
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, (Array.isArray(world.team) ? world.team.length : 3));
  idx = clamp(idx, 0, Math.max(0, teamLimit-1));
  const teamList = ensureTeamProfiles(world.profile?.team || []);
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx];
  const availablePoints = stick ? (stick.skillPoints ?? 0) : (profile?.skillPoints ?? 0);
  if(availablePoints <= 0) return false;
  if(stick){
    if(!stick.skillAllocations) stick.skillAllocations = defaultSkillAllocations();
    stick.skillPoints = Math.max(0, (stick.skillPoints ?? 0) - 1);
    stick.skillAllocations[key] = (stick.skillAllocations[key] ?? 0) + 1;
    if(typeof recomputeStickEquipmentBonuses === 'function'){
      recomputeStickEquipmentBonuses(stick);
    }
  }
  if(profile){
    profile.skillPoints = Math.max(0, (profile.skillPoints ?? 0) - 1);
    profile.skills = cloneSkillAllocations(profile.skills);
    profile.skills[key] = (profile.skills[key] ?? 0) + 1;
  }
  if(world.profile){
    world.profile.team = teamList;
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }
  return true;
}

function resetStickSkills(world, teamIndex){
  if(!world || !world.profile) return false;
  const teamList = ensureTeamProfiles(world.profile.team || []);
  if(!teamList.length) return false;
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length);
  idx = clamp(idx, 0, Math.max(0, teamLimit - 1));
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx] || null;
  const allocationSource = stick?.skillAllocations || profile?.skills || defaultSkillAllocations();
  const refund = Object.values(allocationSource).reduce((sum, value)=>sum + Math.max(0, Math.floor(value ?? 0)), 0);
  if(refund <= 0 && !stick && !profile) return false;
  if(stick){
    stick.skillPoints = Math.max(0, (stick.skillPoints ?? 0) + refund);
    stick.skillAllocations = defaultSkillAllocations();
    if(typeof recomputeStickEquipmentBonuses === 'function'){
      recomputeStickEquipmentBonuses(stick);
    }
  }
  if(profile){
    profile.skillPoints = Math.max(0, (profile.skillPoints ?? 0) + refund);
    profile.skills = defaultSkillAllocations();
  }
  if(world.profile){
    world.profile.team = teamList;
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }else if(profile && world.profile){
    teamList[idx] = cloneStickProfile(profile);
    world.profile.team = teamList;
  }
  return refund > 0;
}

function renameStick(world, teamIndex, name){
  if(!world || !world.profile) return false;
  const teamList = ensureTeamProfiles(world.profile.team || []);
  if(!teamList.length) return false;
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length);
  idx = clamp(idx, 0, Math.max(0, teamLimit - 1));
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx] || null;
  const cleaned = sanitizeStickName(name);
  const finalName = cleaned.length ? cleaned : null;
  if(stick) stick.label = finalName;
  if(profile) profile.name = finalName;
  if(world.profile){
    world.profile.team = teamList;
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }
  return true;
}

function setStickColor(world, teamIndex, color){
  if(!world || !world.profile) return false;
  const teamList = ensureTeamProfiles(world.profile.team || []);
  if(!teamList.length) return false;
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length);
  idx = clamp(idx, 0, Math.max(0, teamLimit - 1));
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx] || null;
  let finalColor = null;
  if(typeof color === 'string' && color.trim()){
    const safeColor = safeHex(color);
    if(safeColor) finalColor = safeColor;
  }
  if(stick) stick.bodyColor = finalColor;
  if(profile) profile.bodyColor = finalColor;
  if(world.profile){
    world.profile.team = teamList;
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }
  return true;
}

function setStickHeadShape(world, teamIndex, shape){
  if(!world || !world.profile) return false;
  const teamList = ensureTeamProfiles(world.profile.team || []);
  if(!teamList.length) return false;
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length);
  idx = clamp(idx, 0, Math.max(0, teamLimit - 1));
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx] || null;
  const sanitized = sanitizeHeadShape(shape);
  if(stick) stick.headShape = sanitized;
  if(profile) profile.headShape = sanitized;
  if(world.profile){
    world.profile.team = teamList;
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }
  return true;
}

function awardBossLevelReward(world, stick){
  if(!world) return false;
  const state = world.levelState;
  if(!state || !state.isFinalScreen || state.bossRewardClaimed) return false;
  state.bossRewardClaimed = true;
  const award = typeof SKILL_POINTS_PER_LEVEL === 'number' ? SKILL_POINTS_PER_LEVEL : 1;
  let changed = false;
  const teamList = ensureTeamProfiles(world.profile?.team || []);
  const teamSticks = Array.isArray(world.team) ? world.team : [];
  if(stick){
    stick.level = (stick.level ?? 1) + 1;
    if(teamSticks.indexOf(stick) === -1){
      stick.skillPoints = (stick.skillPoints ?? 0) + award;
    }
    changed = true;
  }
  for(let i = 0; i < teamList.length; i++){
    const member = teamSticks[i] || null;
    if(member){
      member.skillPoints = (member.skillPoints ?? 0) + award;
    }
    let entry = teamList[i];
    if(entry){
      entry.skillPoints = (entry.skillPoints ?? 0) + award;
      if(member === stick){
        entry.level = (entry.level ?? 1) + 1;
        entry.xp = 0;
        entry.nextXp = Infinity;
      }
      teamList[i] = cloneStickProfile(entry);
      changed = true;
    }
  }
  let idx = (typeof stick?.teamIndex === 'number') ? stick.teamIndex : teamSticks.indexOf(stick);
  if(!Number.isInteger(idx) || idx < 0){
    const active = world.profile?.activeIndex ?? 0;
    idx = clamp(active, 0, Math.max(0, teamList.length - 1));
  }else{
    idx = clamp(idx, 0, Math.max(0, teamList.length - 1));
  }
  if(world.profile){
    world.profile.team = teamList;
    const activeEntry = teamList[idx] || null;
    if(activeEntry){
      world.profile.level = activeEntry.level ?? world.profile.level;
      world.profile.skillPoints = activeEntry.skillPoints ?? world.profile.skillPoints;
      world.profile.xp = 0;
      world.profile.nextXp = Infinity;
    }
  }
  if(stick){
    updateProfileEntryFromStick(world, stick);
  }
  if(changed){
    state.bannerText = 'World Tree blessing acquired!';
    state.bannerSubtext = 'Each stick gained a skill point. Visit the World Tree to spend them.';
    state.bannerTimer = 3.6;
  }
  return changed;
}

const WORLD_TREE_SHOP_ITEMS = [
  {
    id: 'sap-flask',
    name: 'Sap Flask',
    price: 20,
    heal: 40,
    description: 'A sweet sap blend harvested from the World Tree. Single-use heal.',
    color: '#6be36b'
  },
  {
    id: 'amber-tonic',
    name: 'Amber Tonic',
    price: 45,
    heal: 80,
    description: 'Concentrated amber resin that restores a large burst of vitality.',
    color: '#f0b54a'
  }
];

function listWorldTreeShopItems(world){
  return WORLD_TREE_SHOP_ITEMS.map(item=>({
    id: item.id,
    name: item.name,
    price: item.price,
    heal: item.heal,
    description: item.description,
    color: item.color
  }));
}

function purchaseShopItem(world, teamIndex, itemId){
  if(!world) return { ok: false, reason: 'world', message: 'No world state available.' };
  const item = WORLD_TREE_SHOP_ITEMS.find(entry=>entry.id === itemId);
  if(!item) return { ok: false, reason: 'missing', message: 'That item is not available.' };
  const price = Math.max(0, Math.round(item.price ?? 0));
  const coins = world.coins ?? world.profile?.coins ?? 0;
  if(coins < price){
    return { ok: false, reason: 'coins', message: 'Not enough coins.' };
  }
  let idx = Number.isFinite(teamIndex) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
  const teamList = ensureTeamProfiles(world.profile?.team || []);
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamList.length || (Array.isArray(world.team) ? world.team.length : 3));
  idx = clamp(idx, 0, Math.max(0, teamLimit-1));
  const stick = Array.isArray(world.team) ? world.team[idx] : null;
  const profile = teamList[idx];
  const currentHeld = (stick && stick.heldItem) || (profile && profile.heldItem);
  const stickName = profile?.name || stick?.label || `Stick ${idx+1}`;
  if(currentHeld){
    return { ok: false, reason: 'full', message: `${stickName} is already holding an item.` };
  }
  const potionFactory = typeof createPotionItem === 'function' ? createPotionItem : null;
  const carried = potionFactory ? potionFactory(item) : (typeof cloneCarriedItem === 'function' ? cloneCarriedItem(item) : null);
  const payload = carried || {
    type: 'potion',
    id: item.id,
    name: item.name,
    heal: item.heal,
    description: item.description,
    color: item.color
  };
  if(stick) stick.heldItem = typeof cloneCarriedItem === 'function' ? cloneCarriedItem(payload) : payload;
  if(profile) profile.heldItem = typeof cloneCarriedItem === 'function' ? cloneCarriedItem(payload) : payload;
  world.coins = Math.max(0, coins - price);
  if(world.profile){
    world.profile.coins = world.coins;
    world.profile.team = teamList;
  }
  if(stick) updateProfileEntryFromStick(world, stick);
  const message = `${stickName} received ${item.name}!`;
  const audio = window.audioSystem;
  if(audio && typeof audio.playEffect === 'function'){
    audio.playEffect('potionPickup');
  }
  return { ok: true, item: payload, message, price };
}

function syncTeamLoadout(world){
  if(!world) return;
  if(world.profile){
    world.profile.inventory = normalizeLoadout(world.profile.inventory);
    world.profile.armory = normalizeArmory(world.profile.armory);
    ensureGlyphInventory(world.profile);
  }
  const loadout = world.profile?.inventory || normalizeLoadout(defaultInventory());
  const team = Array.isArray(world.team) ? world.team : [];
  for(let i=0;i<team.length;i++){
    const stick = team[i];
    if(!stick) continue;
    stick.inventory = [ cloneInventorySlot(loadout[i]) ];
    stick.equipIndex = 0;
    const mainItem = loadout[i]?.mainHand || loadout[i];
    const weaponId = mainItem?.type === 'weapon' ? mainItem.id : null;
    if(weaponId){
      const fastModes = world.profile?.fastReloadModes;
      if(stick.isEnemy !== true){
        if(!stick.gunFastReload) stick.gunFastReload = {};
        stick.gunFastReload[weaponId] = !!(fastModes && fastModes[weaponId]);
      }
    }
    if(typeof stick.refreshWeaponRig === 'function'){
      stick.refreshWeaponRig();
    }
    if(typeof recomputeStickEquipmentBonuses === 'function'){
      recomputeStickEquipmentBonuses(stick);
    }
    updateProfileEntryFromStick(world, stick);
  }
}

function captureTeamSnapshot(world){
  if(!world) return cloneTeamSnapshot(null);
  const snapshot = {
    team: ensureTeamProfiles(world.team?.map(stickToProfile) || world.profile?.team || []),
    loadout: normalizeLoadout(world.profile?.inventory || defaultInventory()),
    armory: normalizeArmory(world.profile?.armory || []),
    activeIndex: clamp(world.teamActiveIndex ?? world.profile?.activeIndex ?? 0, 0, Math.max(0, getUnlockedTeamSlots(world) - 1)),
    coins: world.coins ?? 0,
    fastReloadModes: cloneFastReloadModes(world.profile?.fastReloadModes),
    glyphInventory: cloneGlyphInventory(world.profile?.glyphInventory || []),
    teamSlotsUnlocked: getUnlockedTeamSlots(world)
  };
  return snapshot;
}

function selectTeamMember(world, index){
  if(!world) return;
  const team = Array.isArray(world.team) ? world.team : [];
  if(team.length === 0){
    const clamped = clamp(index ?? world.profile?.activeIndex ?? 0, 0, Math.max(0, getUnlockedTeamSlots(world) - 1));
    if(world.profile){
      world.profile.activeIndex = clamped;
    }
    world.teamActiveIndex = clamped;
    return;
  }
  const clamped = clamp(index ?? 0, 0, team.length-1);
  let candidate = team[clamped];
  if(!candidate || candidate.dead){
    candidate = team.find(member=>member && !member.dead);
    if(!candidate) return;
  }
  const previous = world.selected;
  if(candidate && previous && !previous.isScoutDrone && candidate !== previous && typeof candidate.warpTo === 'function'){
    const anchor = typeof previous.center === 'function' ? previous.center() : null;
    if(anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)){
      candidate.warpTo(anchor.x, anchor.y);
    }
  }
  world.selected = candidate;
  world.teamActiveIndex = team.indexOf(candidate);
  if(world.profile){
    world.profile.activeIndex = world.teamActiveIndex;
  }
}

function ensureTeamSelection(world){
  if(!world) return;
  const team = Array.isArray(world.team) ? world.team : [];
  if(team.length === 0){
    if(world.profile && typeof world.profile.activeIndex !== 'number'){
      world.profile.activeIndex = 0;
    }
    return;
  }
  if(!world.selected || world.selected.dead){
    selectTeamMember(world, world.teamActiveIndex ?? world.profile?.activeIndex ?? 0);
  }else{
    const idx = team.indexOf(world.selected);
    if(idx >= 0){
      world.teamActiveIndex = idx;
      if(world.profile) world.profile.activeIndex = idx;
    }
  }
}

function ensureScoutDroneState(world){
  if(!world) return null;
  if(!world.scoutDrone || typeof world.scoutDrone !== 'object'){
    world.scoutDrone = { active: false, entity: null, operator: null, operatorIndex: null, lastDeactivate: 0 };
  }else{
    if(world.scoutDrone.active !== true && world.scoutDrone.active !== false) world.scoutDrone.active = false;
    if(!Object.prototype.hasOwnProperty.call(world.scoutDrone, 'lastDeactivate')){
      world.scoutDrone.lastDeactivate = 0;
    }
  }
  return world.scoutDrone;
}

function tryUseScoutRemote(world, stick){
  if(!world || world.state !== 'level') return false;
  if(!stick || typeof stick.hasScoutRemote !== 'function' || !stick.hasScoutRemote()) return false;
  const state = ensureScoutDroneState(world);
  if(!state || state.active) return false;
  const now = nowMs();
  const cooldownMs = 280;
  if(state.lastDeactivate && now - state.lastDeactivate < cooldownMs) return false;
  if(typeof activateScoutDrone === 'function'){
    return !!activateScoutDrone(world, stick);
  }
  return false;
}

function createScoutDroneEntity(world, operator, x, y){
  if(!world || !Array.isArray(world.physicsBoxes)) return null;
  const box = {
    width: 26,
    height: 16,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    vx: 0,
    vy: 0,
    mass: 0.55,
    hidden: true,
    kind: 'scoutDrone',
    grounded: false
  };
  world.physicsBoxes.push(box);
  const operatorJumpSpeed = Number.isFinite(operator?.jumpSpeed) ? operator.jumpSpeed : null;
  const fallbackJump = (typeof STICK_JUMP_SPEED === 'number' && typeof PLAYER_JUMP_SPEED_SCALE === 'number')
    ? STICK_JUMP_SPEED * PLAYER_JUMP_SPEED_SCALE
    : 240;
  const jumpStrength = Math.max(48, (operatorJumpSpeed || fallbackJump) / 3);
  const drone = {
    world,
    owner: operator || null,
    box,
    dir: operator && operator.dir < 0 ? -1 : 1,
    speed: 220,
    maxFallSpeed: 640,
    jumpStrength,
    isScoutDrone: true,
    type: 'scoutDrone',
    renderOffsetY: 0,
    _jumpGraceUntil: 0,
    dead: false,
    walkPhase: 0,
    moveInput(axis){
      const value = clamp(Number.isFinite(axis) ? axis : 0, -1, 1);
      box.vx = value * this.speed;
      if(value !== 0) this.dir = value > 0 ? 1 : -1;
    },
    jump(){
      const strength = Number.isFinite(this.jumpStrength) ? this.jumpStrength : jumpStrength;
      if(!(strength > 0)) return;
      const now = nowMs();
      const grounded = !!box.grounded;
      const graceReady = Number.isFinite(this._jumpGraceUntil) && now <= this._jumpGraceUntil;
      if(!grounded && !graceReady) return;
      box.vy = -strength;
      box.grounded = false;
      this._jumpGraceUntil = 0;
    },
    onJumpRelease(){},
    setCrouching(){},
    requestPlatformDrop(){},
    tryAttack(){ return false; },
    releaseAttack(){},
    useHeldItem(){ return false; },
    center(){
      return { x: box.x || 0, y: box.y || 0 };
    },
    pelvis(){
      return { x: box.x || 0, y: box.y || 0 };
    },
    update(dt){
      const delta = Math.abs(box.vx || 0) * Math.max(0, dt || 0) * 0.09;
      this.walkPhase = (this.walkPhase + delta) % TAU;
      const now = nowMs();
      if(box.grounded){
        this._jumpGraceUntil = now + 110;
      }
      const maxFall = this.maxFallSpeed || 0;
      if(maxFall > 0 && box.vy > maxFall) box.vy = maxFall;
      if(!Number.isFinite(box.x)) box.x = 0;
      if(!Number.isFinite(box.y)) box.y = 0;
    },
    destroy(options={}){
      if(this.dead) return;
      this.dead = true;
      const list = Array.isArray(world.physicsBoxes) ? world.physicsBoxes : null;
      if(list){
        const idx = list.indexOf(box);
        if(idx >= 0) list.splice(idx, 1);
      }
      if(options.explode){
        spawnScoutDroneBurst(world, box.x || 0, box.y || 0);
      }
    }
  };
  box.owner = drone;
  return drone;
}

function spawnScoutDroneBurst(world, x, y){
  if(!world) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  world.particles.push({
    x,
    y,
    style: 'ring',
    radius: 14,
    thickness: 2,
    color: 'rgba(130, 228, 255, 0.95)',
    alpha: 1,
    life: 0,
    maxLife: 420
  });
  const count = 6;
  for(let i=0;i<count;i++){
    const angle = (i / count) * TAU;
    const speed = 80 + Math.random() * 70;
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      style: 'bubble',
      radius: 3.2,
      fillColor: 'rgba(150, 238, 255, 0.5)',
      borderColor: 'rgba(210, 252, 255, 0.85)',
      opacity: 0.95,
      fadeStart: 0.5,
      fadeDuration: 0.45,
      driftDamp: 3.6,
      riseAccel: 140,
      life: 0,
      maxLife: 520
    });
  }
}

function activateScoutDrone(world, operator){
  if(!world || world.state !== 'level') return false;
  if(!operator || operator.dead) return false;
  const state = ensureScoutDroneState(world);
  if(state?.active) return false;
  const center = typeof operator.center === 'function' ? operator.center() : null;
  if(!center) return false;
  const dir = operator.dir >= 0 ? 1 : -1;
  let spawnX = center.x + dir * 32;
  let spawnY = center.y;
  if(typeof groundHeightAt === 'function'){
    const ground = groundHeightAt(world, spawnX, { surface: 'top' });
    if(Number.isFinite(ground)){
      spawnY = Math.min(spawnY, ground - 10);
    }
  }
  const entity = createScoutDroneEntity(world, operator, spawnX, spawnY);
  if(!entity) return false;
  const team = Array.isArray(world.team) ? world.team : [];
  let operatorIndex = Number.isInteger(operator.teamIndex) ? operator.teamIndex : team.indexOf(operator);
  if(!Number.isInteger(operatorIndex) || operatorIndex < 0){
    operatorIndex = clamp(world.teamActiveIndex ?? world.profile?.activeIndex ?? 0, 0, Math.max(0, team.length - 1));
  }
  state.active = true;
  state.entity = entity;
  state.operator = operator;
  state.operatorIndex = operatorIndex;
  entity.dir = dir;
  world.selected = entity;
  if(typeof operator.moveInput === 'function') operator.moveInput(0);
  if(typeof operator.setCrouching === 'function') operator.setCrouching(false);
  if(typeof operator.releaseAttack === 'function') operator.releaseAttack(world.input.aim?.x, world.input.aim?.y);
  world.focusedInteractable = null;
  world.focusedDoor = null;
  world.interactionPrompt = null;
  return true;
}

function deactivateScoutDrone(world, options={}){
  if(!world) return false;
  const state = ensureScoutDroneState(world);
  if(!state?.active) return false;
  const drone = state.entity;
  if(drone && typeof drone.destroy === 'function'){
    drone.destroy({ explode: !!options.explode });
  }
  const operator = state.operator;
  let operatorIndex = state.operatorIndex;
  state.active = false;
  state.entity = null;
  state.operator = null;
  state.operatorIndex = null;
  state.lastDeactivate = nowMs();
  if(operator && !operator.dead){
    const team = Array.isArray(world.team) ? world.team : [];
    if(!Number.isInteger(operatorIndex) || operatorIndex < 0) operatorIndex = team.indexOf(operator);
    if(!Number.isInteger(operatorIndex) || operatorIndex < 0){
      operatorIndex = world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
    }
    operatorIndex = clamp(operatorIndex, 0, Math.max(0, team.length - 1));
    world.selected = operator;
    world.teamActiveIndex = operatorIndex;
    if(world.profile) world.profile.activeIndex = operatorIndex;
  }else{
    world.selected = null;
    ensureTeamSelection(world);
  }
  return true;
}

function updateScoutDrone(world, dt){
  if(!world) return;
  const state = world.scoutDrone;
  if(!state || !state.active){
    return;
  }
  if(world.state !== 'level'){
    deactivateScoutDrone(world, { explode: false });
    return;
  }
  const operator = state.operator;
  const drone = state.entity;
  if(!drone || drone.dead || !operator || operator.dead){
    deactivateScoutDrone(world, { explode: false });
    return;
  }
  if(typeof drone.update === 'function') drone.update(dt);
}

function drawScoutDrone(world, ctx){
  if(!world || !ctx) return;
  const state = world.scoutDrone;
  if(!state || !state.active) return;
  const drone = state.entity;
  if(!drone || drone.dead) return;
  const center = typeof drone.center === 'function' ? drone.center() : null;
  if(!center) return;
  ctx.save();
  ctx.translate(center.x, center.y);
  const dir = drone.dir >= 0 ? 1 : -1;
  const phase = drone.walkPhase || 0;
  ctx.strokeStyle = '#18262d';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for(let i=0;i<4;i++){
    const side = i < 2 ? -1 : 1;
    const stride = i % 2 === 0 ? -1 : 1;
    const swing = Math.sin(phase + i * 0.9) * 0.55;
    const baseX = side * 6;
    const baseY = 1;
    const midX = baseX + stride * dir * 6 + swing * 3;
    const midY = baseY + 4 + Math.abs(Math.sin(phase * 1.3 + i)) * 2;
    const tipX = midX + stride * dir * 7;
    const tipY = midY + 6 + Math.max(0, -swing) * 4;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(midX, midY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }
  ctx.fillStyle = '#1f3943';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#66dcff';
  ctx.beginPath();
  ctx.arc(dir * 3.4, -1.8, 2.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(102, 220, 255, 0.35)';
  ctx.beginPath();
  ctx.arc(dir * 3.4, -1.8, 4.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function updateFollowerBehavior(world, dt){
  if(!world || !Array.isArray(world.team)) return;
  const leader = world.selected;
  if(!leader || leader.dead) return;
  if(leader.isScoutDrone) return;
  const followers = world.team.filter(stick=>stick && stick!==leader && !stick.dead);
  if(followers.length===0) return;
  const origin = leader.center();
  const facing = leader.dir >= 0 ? 1 : -1;
  const tileSize = world.levelState?.layoutMeta?.tileSize || DEFAULT_LAYOUT_TILE_SIZE || 30;
  const maxDistance = Math.max(320, tileSize * 10);
  const enemies = world.sticks.filter(s=>s.isEnemy && !s.dead);
  followers.forEach((ally, idx)=>{
    const desiredX = origin.x - facing * (70 + idx * 55);
    const allyCenter = ally.center();
    const distToLeader = distance(allyCenter.x, allyCenter.y, origin.x, origin.y);
    if(distToLeader > maxDistance){
      ally.warpTo(desiredX, origin.y);
      ally.moveInput(0);
      ally.moveIntent = 0;
      return;
    }
    const dx = desiredX - allyCenter.x;
    const moveAxis = Math.abs(dx) > 12 ? clamp(dx / 80, -1, 1) : 0;
    ally.moveInput(moveAxis);
    const dy = origin.y - allyCenter.y;
    if(dy < -32){
      ally.jump();
    }
    const weapon = ally.weapon();
    if(!weapon) return;
    let target = null;
    let bestDist = weapon.range ? weapon.range + 60 : 200;
    for(const enemy of enemies){
      const enemyCenter = enemy.center();
      const dist = distance(allyCenter.x, allyCenter.y, enemyCenter.x, enemyCenter.y);
      if(dist < bestDist){
        bestDist = dist;
        target = enemy;
      }
    }
    if(target){
      const tc = target.center();
      ally.tryAttack(tc.x, tc.y);
    }
  });
}

function syncProfileFromWorld(world){
  if(!world?.profile) return;
  const snapshot = captureTeamSnapshot(world);
  world.profile.team = snapshot.team;
  world.profile.inventory = snapshot.loadout;
  world.profile.armory = snapshot.armory;
  world.profile.activeIndex = snapshot.activeIndex;
  world.profile.teamSlotsUnlocked = clampTeamSlotCount(snapshot.teamSlotsUnlocked ?? getUnlockedTeamSlots(world));
  world.profile.coins = snapshot.coins;
  world.profile.fastReloadModes = snapshot.fastReloadModes;
}

function spawnWorldTreeNightFireflies(world){
  if(!world?.levelState) return;
  const state = world.levelState;
  if(!state.worldTreeRespawnAtmosphere) return;
  if(!state.def || state.def.id !== 'worldTree') return;
  if(!Array.isArray(world.team) || !world.team.length) return;
  if(!Array.isArray(world.decor)) world.decor = [];
  const additions = [];
  for(const stick of world.team){
    if(!stick || typeof stick.center !== 'function') continue;
    const center = stick.center();
    if(!center) continue;
    const counter = state.worldTreeSpawnFireflyIdCounter = (state.worldTreeSpawnFireflyIdCounter ?? 0) + 1;
    const baseY = center.y + FIREFLY_JAR_REFERENCE_SIZE * 0.5;
    additions.push({
      type: 'fireflyJarSwarm',
      id: `worldTreeSpawnFireflies_${counter}`,
      x: center.x,
      baseY,
      fireflyCount: 5,
      fireflyLightRadius: 18,
      fireflyFlightRadius: 140,
      fireflySpawnRadius: 60,
      fireflySpeed: 90,
      fireflyPullStrength: 24,
      fireflyLifetimeMin: 15,
      fireflyLifetimeMax: 30,
      fireflyLightColor: 'rgba(255, 240, 180, 1)',
      fireflyGlowColor: 'rgba(255, 244, 210, 0.9)',
      fireflyHalfSize: FIREFLY_JAR_FIREFLY_HALF_SIZE,
      layer: 'foreground',
      suppressJarShardSpawn: true,
      permanentFireflies: true
    });
  }
  if(additions.length){
    world.decor.push(...additions);
  }
}

function rebuildLevelScene(world, snapshot){
  world.points = [];
  world.constraints = [];
  world.sticks = [];
  world.npcEntities = [];
  world.items = [];
  world.projectiles = [];
  world.particles = [];
  world.physicsBoxes = [];
  world.grass = null;
  world.enemies = [];
  world.terrain = [];
  world.decor = [];
  world.platforms = [];
  world.hazards = [];
  world.breakables = [];
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  world.toggleBlocks = [];
  world.terrainCells = null;
  world.team = [];
  world.ui.menuOpen = false;
  world.ui.confirmAction = null;
  world.focusedInteractable = null;
  world.focusedDoor = null;
  world.interactionPrompt = null;
  configureLevelScenery(world);
  const entryDoor = world.levelState?.entryDoor;
  let spawnX = Math.min(180, world.width * 0.2);
  let spawnGround = groundHeightAt(world, spawnX, { surface: 'top' });
  if(entryDoor){
    spawnX = entryDoor.centerX ?? (entryDoor.x + entryDoor.w * 0.5);
    const baseY = entryDoor.baseY ?? groundHeightAt(world, spawnX, { surface: 'top' });
    spawnGround = baseY;
  }
  const baseSnapshot = snapshot ? cloneTeamSnapshot(snapshot) : profileToTeamSnapshot(world.profile);
  const teamProfiles = ensureTeamProfiles(baseSnapshot.team || []);
  baseSnapshot.team = teamProfiles;
  const unlockedSlots = clampTeamSlotCount(baseSnapshot.teamSlotsUnlocked ?? world.profile?.teamSlotsUnlocked ?? TEAM_SIZE);
  let teamSize = Array.isArray(teamProfiles) ? Math.min(teamProfiles.length, unlockedSlots) : 0;
  if(teamSize <= 0){
    const fallbackSize = Number.isFinite(TEAM_SIZE) && TEAM_SIZE > 0 ? TEAM_SIZE : 3;
    for(let i=0; i<fallbackSize; i++){
      teamProfiles.push(cloneStickProfile());
    }
    teamSize = Math.min(teamProfiles.length, unlockedSlots);
    if(teamSize <= 0) teamSize = Math.max(1, fallbackSize);
  }
  const alignLoadoutToTeam = (source)=>{
    const slots = Array.isArray(source) ? source.map(createEquipmentSlot) : [];
    while(slots.length < teamSize) slots.push(createEquipmentSlot());
    if(slots.length > teamSize) slots.length = teamSize;
    return slots;
  };
  baseSnapshot.loadout = alignLoadoutToTeam(baseSnapshot.loadout);
  baseSnapshot.teamSlotsUnlocked = unlockedSlots;
  const activeIndex = clamp(baseSnapshot.activeIndex ?? 0, 0, Math.max(0, teamSize - 1));
  baseSnapshot.activeIndex = activeIndex;
  const healOnSpawn = !!world.levelState?.healTeamOnSpawn;
  if(healOnSpawn){
    for(const profile of baseSnapshot.team){
      if(!profile) continue;
      const multipliers = skillMultipliersFromAllocations(profile.skills || defaultSkillAllocations());
      const base = Number.isFinite(profile.maxHp) ? profile.maxHp : profile.hp;
      const max = Number.isFinite(base) ? base * multipliers.health : profile.hp;
      if(Number.isFinite(max)) profile.hp = max;
    }
  }
  if(world.levelState?.def?.grantAllWeapons){
    const available = typeof playerWeaponIds === 'function' ? playerWeaponIds() : Object.keys(WEAPONS);
    const usable = available.filter(id=>WEAPONS[id] && !WEAPONS[id].enemyOnly);
    const loadout = usable.slice(0, teamSize);
    baseSnapshot.loadout = normalizeLoadout(loadout.map(id=>createEquipmentSlot({ mainHand: { type: 'weapon', id } })));
    baseSnapshot.armory = normalizeArmory(usable.map(id=>({ type: 'weapon', id })));
  }
  baseSnapshot.loadout = alignLoadoutToTeam(baseSnapshot.loadout);
  if(world.profile){
    world.profile.team = teamProfiles.map(cloneStickProfile);
    world.profile.inventory = alignLoadoutToTeam(baseSnapshot.loadout);
    world.profile.armory = normalizeArmory(baseSnapshot.armory || world.profile.armory);
    world.profile.activeIndex = activeIndex;
    world.profile.teamSlotsUnlocked = unlockedSlots;
    world.profile.fastReloadModes = cloneFastReloadModes(baseSnapshot.fastReloadModes);
  }
  for(let i=0;i<teamSize;i++){
    const stick = new Stick(spawnX + i * 34, spawnGround - 40, false, world);
    stick.teamIndex = i;
    applyStickProfileToStick(stick, teamProfiles[i]);
    world.sticks.push(stick);
    world.team.push(stick);
  }
  spawnWorldTreeNightFireflies(world);
  syncTeamLoadout(world);
  selectTeamMember(world, activeIndex);
  world.input.dragging = null;
  world.input.left = false;
  world.input.right = false;
  world.input.up = false;
  world.input.aim = null;
  world.coins = baseSnapshot.coins ?? world.profile?.coins ?? 0;
  resetCameraForLevel(world);
  if(world.levelState) world.levelState.healTeamOnSpawn = false;
}

function cloneLegForceConfig(config){
  if(!config) return null;
  const clone = {};
  if(Object.prototype.hasOwnProperty.call(config, 'firstJointOutward')){
    const value = config.firstJointOutward;
    if(Number.isFinite(value)) clone.firstJointOutward = value;
  }
  if(Object.prototype.hasOwnProperty.call(config, 'reactionScale')){
    const value = config.reactionScale;
    if(Number.isFinite(value)) clone.reactionScale = value;
  }
  return Object.keys(clone).length ? clone : null;
}

function legForceConfigsMatch(a, b){
  if(!a || !b) return false;
  const firstA = Number.isFinite(a.firstJointOutward) ? a.firstJointOutward : 0;
  const firstB = Number.isFinite(b.firstJointOutward) ? b.firstJointOutward : 0;
  const reactionA = Number.isFinite(a.reactionScale) ? a.reactionScale : 0;
  const reactionB = Number.isFinite(b.reactionScale) ? b.reactionScale : 0;
  return Math.abs(firstA - firstB) < 1e-3 && Math.abs(reactionA - reactionB) < 1e-3;
}

function applyLegForceSnapshot(snapshot){
  if(!snapshot || typeof updateLegForceConfig !== 'function') return;
  const patch = {};
  if(Object.prototype.hasOwnProperty.call(snapshot, 'firstJointOutward')){
    patch.firstJointOutward = snapshot.firstJointOutward;
  }
  if(Object.prototype.hasOwnProperty.call(snapshot, 'reactionScale')){
    patch.reactionScale = snapshot.reactionScale;
  }
  if(Object.keys(patch).length === 0) return;
  updateLegForceConfig(patch);
}

function applyLevelLegForcePreset(world, presetId){
  if(!world || !world.levelState || !presetId) return;
  if(presetId === 'standing'){
    if(typeof applyLegForcePreset !== 'function' || typeof getStandingLegForcePreset !== 'function') return;
    const snapshot = cloneLegForceConfig(typeof getLegForceConfig === 'function' ? getLegForceConfig() : null);
    const presetSource = getStandingLegForcePreset();
    if(!presetSource || typeof presetSource !== 'object') return;
    const preset = cloneLegForceConfig(presetSource);
    if(snapshot && preset){
      world.levelState.legForceAutoApplied = { snapshot, preset };
    }else if(snapshot){
      world.levelState.legForceAutoApplied = { snapshot, preset: null };
    }else{
      world.levelState.legForceAutoApplied = null;
    }
    applyLegForcePreset(presetSource);
  }else if(presetId === 'limp' || presetId === 'default'){
    if(typeof resetLegForceConfig === 'function') resetLegForceConfig();
    world.levelState.legForceAutoApplied = null;
  }
}

function restoreLevelLegForce(world){
  if(!world || !world.levelState || !world.levelState.legForceAutoApplied) return;
  const auto = world.levelState.legForceAutoApplied;
  world.levelState.legForceAutoApplied = null;
  if(!auto || !auto.snapshot) return;
  const current = cloneLegForceConfig(typeof getLegForceConfig === 'function' ? getLegForceConfig() : null);
  if(!auto.preset || (current && legForceConfigsMatch(current, auto.preset))){
    applyLegForceSnapshot(auto.snapshot);
  }
}

function enterLevel(world, stageId){
  const def = getLevelDefById(stageId);
  if(!def || !(def.playable && def.screens && def.screens.length)){
    setMapMessage(world, 'That stage is not ready yet.');
    return;
  }
  deactivateScoutDrone(world, { explode: false });
  world.scoutDrone = { active: false, entity: null, operator: null, operatorIndex: null, lastDeactivate: 0 };
  world.state = 'level';
  world.levelState = {
    def,
    screenIndex: 0,
    totalScreens: def.screens.length,
    screenTitle: '',
    bannerText: '',
    bannerSubtext: '',
    bannerTimer: 0,
    elapsedTime: 0,
    isFinalScreen: false,
    doorAnnounced: false,
    encounterStarted: false,
    healTeamOnSpawn: true,
    bossRef: null,
    bossName: null,
    environmentLayout: null,
    enemyPlacements: [],
    enemySpawnPoints: [],
    layoutMeta: null,
    lastScreenConfigured: null,
    spawnerTimer: 0,
    spawnerPoints: [],
    defeat: null,
    interactives: [],
    openedChestIds: new Set(),
    drainedChestIds: new Set(),
    claimedPedestalIds: new Set(),
    toggleBlocks: [],
    sandScene: null,
    powderScene: null,
    grassScene: null,
    waterScene: null,
    lavaScene: null,
    voidDimensionActive: false,
    lastVoidDimensionActive: false,
    voidSymbolHomeDoor: null
  };
  const respawnAtmosphere = stageId === 'worldTree' && world.pendingWorldTreeRespawnAtmosphere;
  world.levelState.worldTreeRespawnAtmosphere = !!respawnAtmosphere;
  world.pendingWorldTreeRespawnAtmosphere = false;
  const levelIndex = LEVEL_DEFS.indexOf(def);
  const stageNumber = typeof def.stageNumber === 'number' ? def.stageNumber : (levelIndex >= 0 ? levelIndex + 1 : 1);
  world.level = stageNumber;
  const profileSnapshot = profileToTeamSnapshot(world.profile);
  if(world.levelState){
    world.levelState.entrySnapshot = cloneTeamSnapshot(profileSnapshot);
  }
  rebuildLevelScene(world, profileSnapshot);
  spawnLevel(world);
  refreshStageLabel(world);
  if(world.map){
    world.map.hoverId = null;
    world.map.message = '';
    world.map.messageTimer = 0;
  }
  if(def.legForcePreset){
    applyLevelLegForcePreset(world, def.legForcePreset);
  }else if(world.levelState){
    world.levelState.legForceAutoApplied = null;
  }
}

function advanceLevelScreen(world, snapshot){
  const state = world.levelState;
  if(!state) return;
  if(state.screenIndex >= state.totalScreens-1) return;
  state.screenIndex++;
  state.elapsedTime = 0;
  rebuildLevelScene(world, snapshot);
  spawnLevel(world);
  refreshStageLabel(world);
}

function refreshStageLabel(world){
  if(world.state==='level' && world.levelState){
    const state = world.levelState;
    const total = state.totalScreens || 1;
    const def = state.def || {};
    if(state.voidDimensionActive && def.voidSymbolRoom){
      const altName = def.voidSymbolRoom.name;
      const stageBase = altName ? `Stage ?/? – ${altName}` : 'Stage ?/?';
      world.stageLabel = `${stageBase} — Screen ?/?`;
      return;
    }
    const stageName = String(def.name || 'Stage');
    const stageNumber = typeof def.stageNumber === 'number' ? def.stageNumber : null;
    const defId = typeof def.id === 'string' ? def.id : null;
    let prefixed = stageNumber !== null && !/^\s*Stage\b/i.test(stageName)
      ? `Stage ${stageNumber} – ${stageName}`
      : stageName;
    if(defId === 'world8VoidDojo'){
      prefixed = 'Stage ?/?';
    }
    if(total>1){
      world.stageLabel = `${prefixed} — Screen ${state.screenIndex+1}/${total}`;
    }else{
      world.stageLabel = prefixed;
    }
  }else{
    world.stageLabel = 'World Map';
  }
}

function handleLevelFlow(world, dt){
  const state = world.levelState;
  if(!state) return;
  if(state.defeat?.active){
    state.bannerTimer = 0;
    state.bannerText = '';
    state.bannerSubtext = '';
    return;
  }
  if(state.bannerTimer>0){
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  }
  if(state.def?.spawner){
    updateLevelSpawner(world, dt);
    return;
  }
  const aliveEnemies = world.sticks.filter(s=>s.isEnemy && !s.dead);
  if(aliveEnemies.length===0){
    if(state.isFinalScreen){
      if(!state.doorAnnounced){
        if(state.encounterStarted){
          state.doorAnnounced = true;
          state.bannerText = 'Boss defeated!';
          state.bannerSubtext = 'Enter the exit door to return to the world map.';
          state.bannerTimer = 3.4;
        }
      }
    }else if(!state.doorAnnounced){
      state.doorAnnounced = true;
      state.bannerText = `${state.screenTitle} Cleared`;
      state.bannerSubtext = 'Enter the door to reach the next screen.';
      state.bannerTimer = 3.4;
    }
  }else{
    state.doorAnnounced = false;
    state.encounterStarted = true;
  }
}

function checkLevelDefeat(world){
  if(!world || world.state !== 'level') return;
  const state = world.levelState;
  if(!state || state.defeat?.active) return;
  const anyAlliesAlive = world.sticks.some(stick=>{
    if(!stick || stick.dead) return false;
    if(stick.isEnemy) return false;
    if(stick.isSummoned) return false;
    if(stick.isNpc) return false;
    return true;
  });
  if(anyAlliesAlive) return;
  triggerLevelDefeat(world);
}

function createDefeatOverlayState(){
  const settings = DEFEAT_OVERLAY_SETTINGS || {};
  return {
    active: true,
    phase: 'message',
    phaseElapsed: 0,
    fade: 0,
    textVisible: true,
    respawned: false,
    text: 'YOU LOSE',
    messageDuration: settings.messageDuration ?? 1.6,
    fadeOutDuration: settings.fadeOutDuration ?? 1.2,
    blackoutHoldDuration: settings.blackoutHoldDuration ?? 0.45,
    fadeInDuration: settings.fadeInDuration ?? 1,
    targetStageId: settings.targetStageId || 'worldTree'
  };
}

function isDefeatOverlayActive(world){
  return !!(world && world.defeatOverlay && world.defeatOverlay.active);
}

function triggerLevelDefeat(world){
  const state = world.levelState;
  if(!state) return;
  deactivateScoutDrone(world, { explode: false });
  const overlay = createDefeatOverlayState();
  state.defeat = { active: true, triggeredAt: nowMs(), exiting: false, overlay };
  state.bannerText = '';
  state.bannerSubtext = '';
  state.bannerTimer = 0;
  if(world.input){
    world.input.left = false;
    world.input.right = false;
    world.input.up = false;
    if(world.input.dragging){
      world.input.dragging.dragged = false;
      world.input.dragging = null;
    }
  }
  world.selected = null;
  world.defeatOverlay = overlay;
  if(world.cursor) world.cursor.visible = false;
}

function updateDefeatOverlay(world, dt){
  if(!world) return;
  const state = world.levelState;
  if(state?.defeat?.active && state.defeat.overlay && state.defeat.overlay !== world.defeatOverlay){
    world.defeatOverlay = state.defeat.overlay;
  }
  const overlay = world.defeatOverlay;
  if(!overlay || !overlay.active){
    return;
  }
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  overlay.phase = overlay.phase || 'message';
  overlay.phaseElapsed = (overlay.phaseElapsed ?? 0) + step;
  if(world.cursor) world.cursor.visible = false;
  switch(overlay.phase){
    case 'message':{
      if(overlay.phaseElapsed >= (overlay.messageDuration ?? 0)){
        overlay.phase = 'fadeOut';
        overlay.phaseElapsed = 0;
      }
      break;
    }
    case 'fadeOut':{
      const duration = Math.max(0.001, overlay.fadeOutDuration ?? 0.8);
      overlay.fade = clamp(overlay.phaseElapsed / duration, 0, 1);
      if(overlay.fade >= 1){
        overlay.fade = 1;
        overlay.textVisible = false;
        overlay.phase = 'black';
        overlay.phaseElapsed = 0;
      }
      break;
    }
    case 'black':{
      if(!overlay.respawned){
        respawnTeamAtWorldTree(world, overlay);
        overlay.respawned = true;
        overlay.phaseElapsed = 0;
      }
      if(overlay.phaseElapsed >= (overlay.blackoutHoldDuration ?? 0)){
        overlay.phase = 'fadeIn';
        overlay.phaseElapsed = 0;
      }
      break;
    }
    case 'fadeIn':{
      const duration = Math.max(0.001, overlay.fadeInDuration ?? 0.8);
      overlay.fade = clamp(1 - overlay.phaseElapsed / duration, 0, 1);
      if(overlay.fade <= 0){
        overlay.fade = 0;
        overlay.active = false;
        if(world.levelState?.defeat) world.levelState.defeat = null;
        world.defeatOverlay = null;
      }
      break;
    }
    default:{
      overlay.phase = 'message';
      overlay.phaseElapsed = 0;
      break;
    }
  }
}

function respawnTeamAtWorldTree(world, overlay){
  if(!world) return;
  const targetStageId = overlay?.targetStageId || DEFEAT_OVERLAY_SETTINGS?.targetStageId || 'worldTree';
  const state = world.levelState;
  const entrySnapshot = state?.entrySnapshot ? state.entrySnapshot : null;
  if(targetStageId === 'worldTree'){
    world.pendingWorldTreeRespawnAtmosphere = true;
  }
  if(state){
    state.defeat = state.defeat || {};
    state.defeat.exiting = true;
    abandonLevel(world);
  }
  if(entrySnapshot){
    applyTeamSnapshotToProfile(world, entrySnapshot);
    world.coins = world.profile?.coins ?? world.coins;
  }
  if(targetStageId){
    enterLevel(world, targetStageId);
  }
}

function acknowledgeLevelDefeat(world){
  const state = world.levelState;
  if(!state?.defeat?.active || state.defeat.exiting) return;
  state.defeat.exiting = true;
  abandonLevel(world);
}

function abandonLevel(world, options){
  if(!world || world.state !== 'level') return;
  deactivateScoutDrone(world, { explode: false });
  restoreLevelLegForce(world);
  const levelId = world.levelState?.def?.id || null;
  const preserveProgress = !!(options && options.preserveProgress);
  const hubLevel = levelId === 'worldTree';
  const keepProgress = preserveProgress || hubLevel;
  const entry = world.levelState?.entrySnapshot;
  if(entry && world.profile && !keepProgress){
    applyTeamSnapshotToProfile(world, entry);
  }else if(keepProgress){
    syncProfileFromWorld(world);
    commitDrainedChests(world);
    commitOpenedChests(world);
    commitClaimedPedestals(world);
  }
  world.coins = world.profile?.coins ?? world.coins;
  world.state = 'map';
  world.levelState = null;
  world.selected = null;
  world.teamActiveIndex = world.profile?.activeIndex ?? 0;
  world.points = [];
  world.constraints = [];
  world.sticks = [];
  world.team = [];
  world.items = [];
  world.projectiles = [];
  world.particles = [];
  world.physicsBoxes = [];
  world.ceilingY = null;
  world.sand = null;
  world.powder = null;
  world.grass = null;
  world.water = null;
  world.waterBlocks = [];
  world.waterEmitters = [];
  world.lava = null;
  world.lavaEmitters = [];
  world.enemies = [];
  world.terrain = [];
  world.decor = [];
  world.platforms = [];
  world.hazards = [];
  world.breakables = [];
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  world.toggleBlocks = [];
  world.door = { x: 0, y: 0, w: 36, h: 56, open: false, hidden: true, locked: false };
  world.ui.menuOpen = false;
  world.ui.confirmAction = null;
  world.focusedInteractable = null;
  world.focusedDoor = null;
  world.interactionPrompt = null;
  if(world.ui.skillPanel){
    world.ui.skillPanel.open = false;
    world.ui.skillPanel.pedestal = null;
  }
  if(world.ui.shopPanel){
    world.ui.shopPanel.open = false;
    world.ui.shopPanel.vendor = null;
    world.ui.shopPanel.message = '';
  }
  refreshStageLabel(world);
  world.scoutDrone = { active: false, entity: null, operator: null, operatorIndex: null, lastDeactivate: 0 };
}

function commitOpenedChests(world){
  if(!world?.levelState || !world.profile) return;
  let opened = world.levelState.openedChestIds;
  if(opened instanceof Set){
    opened = Array.from(opened.values());
  }else if(!Array.isArray(opened)){
    opened = [];
  }
  if(!opened.length) return;
  const normalized = opened.map(id=>String(id)).filter(id=>id);
  if(!normalized.length) return;
  const existing = Array.isArray(world.profile.openedChests)
    ? world.profile.openedChests.map(id=>String(id))
    : [];
  const combined = new Set(existing);
  for(const id of normalized){
    combined.add(id);
  }
  world.profile.openedChests = Array.from(combined);
}

function commitClaimedPedestals(world){
  if(!world?.levelState || !world.profile) return;
  let claimed = world.levelState.claimedPedestalIds;
  if(claimed instanceof Set){
    claimed = Array.from(claimed.values());
  }else if(!Array.isArray(claimed)){
    claimed = [];
  }
  if(!claimed.length) return;
  const normalized = claimed.map(id=>String(id)).filter(id=>id);
  if(!normalized.length) return;
  const existing = Array.isArray(world.profile.claimedPedestals)
    ? world.profile.claimedPedestals.map(id=>String(id))
    : [];
  const combined = new Set(existing);
  for(const id of normalized){
    combined.add(id);
  }
  world.profile.claimedPedestals = Array.from(combined);
}

function commitDrainedChests(world){
  if(!world?.levelState || !world.profile) return;
  let drained = world.levelState.drainedChestIds;
  if(drained instanceof Set){
    drained = Array.from(drained.values());
  }else if(!Array.isArray(drained)){
    drained = [];
  }
  if(!drained.length) return;
  const normalized = drained.map(id=>String(id)).filter(id=>id);
  if(!normalized.length) return;
  const existing = Array.isArray(world.profile.drainedChests)
    ? world.profile.drainedChests.map(id=>String(id))
    : [];
  const combined = new Set(existing);
  for(const id of normalized){
    combined.add(id);
  }
  world.profile.drainedChests = Array.from(combined);
}

function completeLevel(world){
  deactivateScoutDrone(world, { explode: false });
  syncProfileFromWorld(world);
  if(world.levelState){
    markStageComplete(world, world.levelState.def.id);
  }
  commitDrainedChests(world);
  commitOpenedChests(world);
  commitClaimedPedestals(world);
  restoreLevelLegForce(world);
  world.state = 'map';
  world.levelState = null;
  world.selected = null;
  world.teamActiveIndex = world.profile?.activeIndex ?? 0;
  world.points = [];
  world.constraints = [];
  world.sticks = [];
  world.team = [];
  world.items = [];
  world.projectiles = [];
  world.particles = [];
  world.physicsBoxes = [];
  world.sand = null;
  world.powder = null;
  world.grass = null;
  world.water = null;
  world.waterBlocks = [];
  world.waterEmitters = [];
  world.lava = null;
  world.lavaEmitters = [];
  world.enemies = [];
  world.terrain = [];
  world.decor = [];
  world.platforms = [];
  world.hazards = [];
  world.breakables = [];
  if(typeof markBreakablesIndexDirty === 'function') markBreakablesIndexDirty(world);
  world.toggleBlocks = [];
  world.door = { x: 0, y: 0, w: 36, h: 56, open: false, hidden: true, locked: false };
  world.coins = world.profile?.coins ?? world.coins;
  world.ui.menuOpen = false;
  world.ui.confirmAction = null;
  world.focusedInteractable = null;
  world.focusedDoor = null;
  world.interactionPrompt = null;
  if(world.ui.skillPanel){
    world.ui.skillPanel.open = false;
    world.ui.skillPanel.pedestal = null;
  }
  if(world.ui.shopPanel){
    world.ui.shopPanel.open = false;
    world.ui.shopPanel.vendor = null;
    world.ui.shopPanel.message = '';
  }
  refreshStageLabel(world);
  autoSaveProgress(world);
  world.scoutDrone = { active: false, entity: null, operator: null, operatorIndex: null, lastDeactivate: 0 };
}

function markStageComplete(world, stageId){
  if(!world) return;
  for(const map of getAllMaps(world)){
    if(!map?.nodes) continue;
    const node = map.nodes.find(n=>n && n.id === stageId);
    if(!node) continue;
    node.completed = true;
    node.unlocked = true;
    node.savedUnlocked = true;
  }
  if(stageId === 'world8VoidDojo'){
    const unlocked = unlockWorldMap(world, WORLD_MAP_ID_MONOCHROME);
    if(unlocked && world.state === 'map'){
      setMapMessage(world, 'The World Tree reveals a monochrome realm.');
    }
  }else if(isStageCompleted(world, 'world8VoidDojo')){
    unlockWorldMap(world, WORLD_MAP_ID_MONOCHROME);
  }
  restoreAllMapUnlocks(world);
}

function updateWorldMap(world, dt){
  if(!world.map) return;
  const nodes = Array.isArray(world.map.nodes) ? world.map.nodes : [];
  const overrideEnabled = !!world.map.unlockOverride;
  clampMapView(world.map, world);
  if(overrideEnabled){
    for(const node of nodes){
      if(node) node.unlocked = true;
    }
  }else{
    const requiredCleared = nodes.filter(node=>node && node.playable && !node.optional && !node.requiresAllComplete)
      .every(node=>node.completed);
    const completedSet = new Set();
    for(const node of nodes){
      if(node?.completed && node.id) completedSet.add(node.id);
    }
    for(const node of nodes){
      if(node?.requiresAllComplete){
        const unlocked = requiredCleared && mapNodeRequirementsMet(node, completedSet);
        node.unlocked = unlocked;
        if(unlocked) node.savedUnlocked = true;
      }
    }
  }
  if(world.map.messageTimer>0){
    world.map.messageTimer = Math.max(0, world.map.messageTimer - dt);
    if(world.map.messageTimer===0) world.map.message = '';
  }
  if(dt > 0){
    const panDamping = Math.max(1, Number(world.map.panDamping) || 12);
    const zoomDamping = Math.max(1, Number(world.map.zoomDamping) || 10);
    const panLerp = clamp(1 - Math.exp(-dt * panDamping), 0, 1);
    const zoomLerp = clamp(1 - Math.exp(-dt * zoomDamping), 0, 1);
    world.map.centerX += (world.map.targetCenterX - world.map.centerX) * panLerp;
    world.map.centerY += (world.map.targetCenterY - world.map.centerY) * panLerp;
    world.map.zoom += (world.map.targetZoom - world.map.zoom) * zoomLerp;
  }else{
    world.map.centerX = world.map.targetCenterX;
    world.map.centerY = world.map.targetCenterY;
    world.map.zoom = world.map.targetZoom;
  }
  clampMapView(world.map, world);
}

// Unlock override is used by the map developer checkbox to expose every stage locally.
function applyMapUnlockOverride(world, enabled){
  if(!world) return;
  const next = !!enabled;
  for(const map of getAllMaps(world)){
    if(!map) continue;
    map.unlockOverride = next;
    const nodes = Array.isArray(map.nodes) ? map.nodes : [];
    if(next){
      for(const node of nodes){
        if(node) node.unlocked = true;
      }
    }else{
      restoreDefaultMapUnlocks(world, map);
    }
  }
  if(world.state === 'map'){
    updateWorldMap(world, 0);
  }
}

function mapNodeRequirementsMet(node, completedSet){
  if(!node || !Array.isArray(node.requiresStages) || node.requiresStages.length === 0) return true;
  for(const req of node.requiresStages){
    if(!completedSet.has(req)) return false;
  }
  return true;
}

function restoreDefaultMapUnlocks(world, targetMap){
  const map = targetMap || world?.map;
  if(!map?.nodes) return;
  const nodes = map.nodes;
  const completedSet = new Set();
  for(const node of nodes){
    if(node?.completed && node.id) completedSet.add(node.id);
  }
  const requiredCleared = nodes.filter(node=>node && node.playable && !node.optional && !node.requiresAllComplete)
    .every(node=>node.completed);
  for(const node of nodes){
    if(!node) continue;
    const requirementsMet = mapNodeRequirementsMet(node, completedSet);
    const baseUnlocked = !!node.savedUnlocked || !!node.autoUnlock || !!node.completed;
    node.unlocked = baseUnlocked && requirementsMet;
    if(node.completed) node.savedUnlocked = true;
  }
  for(let i=0; i<nodes.length; i++){
    const node = nodes[i];
    if(!node || !node.completed) continue;
    for(let next=i+1; next<nodes.length; next++){
      const candidate = nodes[next];
      if(!candidate) break;
      if(mapNodeRequirementsMet(candidate, completedSet)){
        candidate.unlocked = true;
        candidate.savedUnlocked = true;
      }
      if(!candidate.standalone) break;
    }
  }
  for(const node of nodes){
    if(!node?.requiresAllComplete) continue;
    const requirementsMet = mapNodeRequirementsMet(node, completedSet);
    const unlocked = requiredCleared && requirementsMet;
    node.unlocked = unlocked;
    if(unlocked) node.savedUnlocked = true;
  }
}

function handleMapClick(world, m){
  if(!world.map) return;
  cancelMapDrag(world);
  const node = findMapNodeAt(world, m);
  if(!node){
    world.map.hoverId = null;
    return;
  }
  const audio = window.audioSystem;
  if(audio && typeof audio.playEffect === 'function'){
    audio.playEffect('mapClick');
  }
  world.map.hoverId = node.id;
  if(node.requiresAllComplete && !node.unlocked){
    setMapMessage(world, 'Defeat every other stage to confront this foe.');
    return;
  }
  if(!node.unlocked){
    setMapMessage(world, 'Defeat earlier stages to unlock this one.');
    return;
  }
  if(!node.playable){
    setMapMessage(world, 'This stage is still under construction.');
    return;
  }
  enterLevel(world, node.id);
}

function clampMapView(map, world){
  if(!map || !world) return;
  const minZoom = Math.max(0.4, Number(map.minZoom) || 0.4);
  const maxZoom = Math.max(minZoom, Number(map.maxZoom) || minZoom);
  map.minZoom = minZoom;
  map.maxZoom = maxZoom;
  const safeTargetZoom = clamp(Number(map.targetZoom) || 1, minZoom, maxZoom);
  const safeZoom = clamp(Number(map.zoom) || safeTargetZoom, minZoom, maxZoom);
  const clampCenter = (value, zoom)=>{
    const halfSpan = 0.5 / zoom;
    if(halfSpan >= 0.5) return 0.5;
    return clamp(Number.isFinite(value) ? value : 0.5, halfSpan, 1 - halfSpan);
  };
  map.targetZoom = safeTargetZoom;
  map.zoom = safeZoom;
  map.targetCenterX = clampCenter(map.targetCenterX ?? map.centerX ?? 0.5, safeTargetZoom);
  map.targetCenterY = clampCenter(map.targetCenterY ?? map.centerY ?? 0.5, safeTargetZoom);
  map.centerX = clampCenter(map.centerX ?? map.targetCenterX ?? 0.5, safeZoom);
  map.centerY = clampCenter(map.centerY ?? map.targetCenterY ?? 0.5, safeZoom);
}

function mapBaseDimensions(world){
  const width = Math.max(1, Math.round(world?.width || canvas?.width || innerWidth || 1));
  const height = Math.max(1, Math.round(world?.height || canvas?.height || innerHeight || 1));
  return { width, height };
}

function mapProject(world, nx, ny){
  if(!world?.map) return { x: 0, y: 0 };
  const map = world.map;
  const { width, height } = mapBaseDimensions(world);
  const zoom = map.zoom || 1;
  const centerX = Number.isFinite(map.centerX) ? map.centerX : 0.5;
  const centerY = Number.isFinite(map.centerY) ? map.centerY : 0.5;
  return {
    x: (nx - centerX) * zoom * width + width * 0.5,
    y: (ny - centerY) * zoom * height + height * 0.5
  };
}

function mapNodeScreenPosition(world, node){
  if(!world?.map || !node) return null;
  return mapProject(world, Number(node.x) || 0, Number(node.y) || 0);
}

function screenToMapCoords(world, pos){
  if(!world?.map || !pos) return null;
  const map = world.map;
  const { width, height } = mapBaseDimensions(world);
  const zoom = map.zoom || 1;
  const centerX = Number.isFinite(map.centerX) ? map.centerX : 0.5;
  const centerY = Number.isFinite(map.centerY) ? map.centerY : 0.5;
  const nx = ((pos.x - width * 0.5) / (zoom * width)) + centerX;
  const ny = ((pos.y - height * 0.5) / (zoom * height)) + centerY;
  return { x: nx, y: ny };
}

function beginMapDrag(world, screenPos, event){
  if(!world?.map || !screenPos) return;
  const map = world.map;
  map.dragging = true;
  map.dragActive = false;
  map.dragButton = event?.button ?? 0;
  map.dragStart = { x: screenPos.x, y: screenPos.y };
  map.dragLast = { x: screenPos.x, y: screenPos.y };
}

function updateMapDrag(world, screenPos){
  if(!world?.map || !screenPos || !world.map.dragging) return;
  const map = world.map;
  const start = map.dragStart || screenPos;
  const dxTotal = screenPos.x - start.x;
  const dyTotal = screenPos.y - start.y;
  const threshold = Number.isFinite(map.dragThreshold) ? map.dragThreshold : 6;
  if(!map.dragActive){
    if(Math.hypot(dxTotal, dyTotal) >= threshold){
      map.dragActive = true;
    }
  }
  const last = map.dragLast || start;
  map.dragLast = { x: screenPos.x, y: screenPos.y };
  if(!map.dragActive) return;
  const { width, height } = mapBaseDimensions(world);
  if(width <= 0 || height <= 0) return;
  const zoom = map.zoom || 1;
  const normDx = (screenPos.x - last.x) / (zoom * width);
  const normDy = (screenPos.y - last.y) / (zoom * height);
  map.targetCenterX = (map.targetCenterX ?? map.centerX ?? 0.5) - normDx;
  map.targetCenterY = (map.targetCenterY ?? map.centerY ?? 0.5) - normDy;
  map.centerX = (map.centerX ?? map.targetCenterX ?? 0.5) - normDx;
  map.centerY = (map.centerY ?? map.targetCenterY ?? 0.5) - normDy;
  clampMapView(map, world);
}

function endMapDrag(world, button){
  if(!world?.map || !world.map.dragging) return false;
  const map = world.map;
  if(button !== undefined && button !== map.dragButton) return false;
  const wasActive = !!map.dragActive;
  map.dragging = false;
  map.dragActive = false;
  map.dragStart = null;
  map.dragLast = null;
  return wasActive;
}

function cancelMapDrag(world){
  if(!world?.map) return;
  world.map.dragging = false;
  world.map.dragActive = false;
  world.map.dragStart = null;
  world.map.dragLast = null;
}

function adjustMapZoom(world, focus, deltaY){
  if(!world?.map) return;
  const map = world.map;
  const { width, height } = mapBaseDimensions(world);
  const pointer = focus || { x: width * 0.5, y: height * 0.5 };
  const pointerX = clamp(pointer.x, 0, width);
  const pointerY = clamp(pointer.y, 0, height);
  const minZoom = Math.max(0.4, Number(map.minZoom) || 0.4);
  const maxZoom = Math.max(minZoom, Number(map.maxZoom) || minZoom);
  const currentZoom = clamp(Number(map.zoom) || 1, minZoom, maxZoom);
  const currentCenterX = Number.isFinite(map.centerX) ? map.centerX : 0.5;
  const currentCenterY = Number.isFinite(map.centerY) ? map.centerY : 0.5;
  const normalizedX = ((pointerX - width * 0.5) / (currentZoom * width)) + currentCenterX;
  const normalizedY = ((pointerY - height * 0.5) / (currentZoom * height)) + currentCenterY;
  const rawStep = Math.exp(-deltaY * 0.0012);
  const step = clamp(rawStep, 0.5, 2);
  const nextZoom = clamp((Number(map.targetZoom) || currentZoom) * step, minZoom, maxZoom);
  map.targetZoom = nextZoom;
  map.zoom = nextZoom;
  const nextCenterX = normalizedX - (pointerX - width * 0.5) / (nextZoom * width);
  const nextCenterY = normalizedY - (pointerY - height * 0.5) / (nextZoom * height);
  map.targetCenterX = nextCenterX;
  map.targetCenterY = nextCenterY;
  map.centerX = nextCenterX;
  map.centerY = nextCenterY;
  clampMapView(map, world);
}

function findMapNodeAt(world, pos){
  if(!world.map) return null;
  const nodes = Array.isArray(world.map.nodes) ? world.map.nodes : [];
  const zoom = world.map.zoom || 1;
  for(const node of nodes){
    if(!node) continue;
    const screen = mapNodeScreenPosition(world, node);
    if(!screen) continue;
    const hover = world.map.hoverId === node.id;
    const radius = (hover ? 36 : 30) * zoom;
    const hitRadius = radius + 4 * zoom;
    if(Math.hypot(pos.x - screen.x, pos.y - screen.y) <= hitRadius){
      return node;
    }
  }
  return null;
}

function setMapMessage(world, text){
  if(!world.map) return;
  world.map.message = text;
  world.map.messageTimer = 2.6;
}

function tryToggleWorldMap(world){
  if(!world?.map) return false;
  const hoverId = world.map.hoverId;
  if(!hoverId) return false;
  if(hoverId === 'worldTree'){
    if(hasWorldMapUnlocked(world, WORLD_MAP_ID_MONOCHROME)){
      const switched = switchWorldMap(world, WORLD_MAP_ID_MONOCHROME);
      if(switched){
        setMapMessage(world, 'A monochrome realm unfolds beyond the World Tree.');
      }
      return switched;
    }
    setMapMessage(world, 'Defeat the Monochrome Reliquary to commune deeper.');
    return true;
  }
  if(hoverId === 'worldTreeReliquary'){
    const switched = switchWorldMap(world, WORLD_MAP_ID_SURFACE);
    if(switched){
      setMapMessage(world, 'You return to the familiar canopy.');
    }
    return switched;
  }
  return false;
}

function renderWorldMap(world, ctx){
  const map = world.map;
  const theme = map?.theme || 'surface';
  const backgroundImage = theme === 'monochrome'
    ? WORLD_MAP_MONOCHROME_BACKGROUND_IMAGE
    : WORLD_MAP_BACKGROUND_IMAGE;
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  if(theme === 'monochrome'){
    gradient.addColorStop(0, '#161625');
    gradient.addColorStop(1, '#05050b');
    ctx.fillStyle = '#03030a';
  }else{
    gradient.addColorStop(0, '#142038');
    gradient.addColorStop(1, '#090e18');
    ctx.fillStyle = '#0b1323';
  }
  ctx.fillRect(0, 0, world.width, world.height);
  if(backgroundImage && isTerrainImageReady(backgroundImage)){
    const scale = Math.max(world.width / backgroundImage.width, world.height / backgroundImage.height);
    const drawWidth = backgroundImage.width * scale;
    const drawHeight = backgroundImage.height * scale;
    const drawX = (world.width - drawWidth) * 0.5;
    const drawY = (world.height - drawHeight) * 0.5;
    ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
    ctx.save();
    ctx.globalAlpha = theme === 'monochrome' ? 0.38 : 0.45;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);
    ctx.restore();
  }else{
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);
  }

  if(!map) return;
  const nodes = map.nodes;
  const zoom = map.zoom || 1;
  const linkWidth = clamp(4 * zoom, 2, 6);
  const linkColor = theme === 'monochrome' ? 'rgba(210, 210, 228, 0.42)' : 'rgba(77, 112, 156, 0.45)';
  const nodeInteriorColor = theme === 'monochrome' ? '#07070c' : '#0a1629';
  const nodeNameColor = theme === 'monochrome' ? '#dad9f5' : '#c8d6f8';
  const bossRingColor = theme === 'monochrome' ? '#f4f4ff' : '#ff4f7d';
  const titleText = map.title || (theme === 'monochrome' ? 'Monochrome Atlas' : 'World Map');
  const subtitleText = map.subtitle || (theme === 'monochrome'
    ? 'Hover the Reliquary Tree and press F to return to the canopy.'
    : 'Click a stage to deploy. Defeat earlier stages to unlock more.');
  const titleColor = theme === 'monochrome' ? '#f5f5ff' : '#f1f5ff';
  const subtitleColor = theme === 'monochrome' ? '#b9b9cc' : '#8da3d7';
  const messageFill = theme === 'monochrome' ? 'rgba(6, 6, 12, 0.88)' : 'rgba(9, 16, 28, 0.82)';
  const messageStroke = theme === 'monochrome' ? 'rgba(210, 210, 230, 0.45)' : 'rgba(107, 209, 255, 0.55)';
  const messageText = theme === 'monochrome' ? '#f0f0ff' : '#e7efff';
  const worldTreePortalActive = map?.worldId === WORLD_MAP_ID_SURFACE
    && hasWorldMapUnlocked(world, WORLD_MAP_ID_MONOCHROME);
  const reliquaryPortalActive = map?.worldId === WORLD_MAP_ID_MONOCHROME
    && hasWorldMapUnlocked(world, WORLD_MAP_ID_SURFACE);
  const segments = [];
  const nodeOrder = new Map();
  const nodeById = new Map();
  for(let i=0;i<nodes.length;i++){
    const node = nodes[i];
    if(node){
      nodeOrder.set(node, i);
      if(node.id) nodeById.set(node.id, node);
    }
  }
  const segmentKeys = new Set();
  const pushSegment = (fromNode, toNode)=>{
    if(!fromNode || !toNode || fromNode === toNode) return;
    const key = (fromNode.id && toNode.id) ? `${fromNode.id}->${toNode.id}` : null;
    if(key && segmentKeys.has(key)) return;
    const fromPos = mapNodeScreenPosition(world, fromNode);
    const toPos = mapNodeScreenPosition(world, toNode);
    if(!fromPos || !toPos) return;
    segments.push([fromPos.x, fromPos.y, toPos.x, toPos.y]);
    if(key) segmentKeys.add(key);
  };
  const treeNode = nodes.find(n=>n && n.id === 'worldTree');
  const branchGroups = new Map();
  for(const node of nodes){
    if(!node || node.standalone || !node.branch) continue;
    if(!branchGroups.has(node.branch)) branchGroups.set(node.branch, []);
    branchGroups.get(node.branch).push(node);
  }
  for(const branchNodes of branchGroups.values()){
    const sorted = branchNodes.slice().sort((a, b)=>{
      const aStep = Number.isFinite(a.branchStep) ? a.branchStep : Number.POSITIVE_INFINITY;
      const bStep = Number.isFinite(b.branchStep) ? b.branchStep : Number.POSITIVE_INFINITY;
      if(aStep !== bStep) return aStep - bStep;
      const aIndex = nodeOrder.get(a) ?? 0;
      const bIndex = nodeOrder.get(b) ?? 0;
      return aIndex - bIndex;
    });
    if(treeNode && sorted.length){
      pushSegment(treeNode, sorted[0]);
    }
    for(let i=0;i<sorted.length-1;i++){
      pushSegment(sorted[i], sorted[i+1]);
    }
  }
  for(let i=0;i<nodes.length-1;i++){
    const a = nodes[i];
    const b = nodes[i+1];
    if(!a || !b || a.standalone || b.standalone) continue;
    if(a.branch || b.branch) continue;
    pushSegment(a, b);
  }
  for(const node of nodes){
    if(!node || !node.parent) continue;
    const parent = nodeById.get(node.parent);
    if(parent) pushSegment(parent, node);
  }
  if(segments.length){
    ctx.strokeStyle = linkColor;
    ctx.lineWidth = linkWidth;
    ctx.beginPath();
    for(const [x1, y1, x2, y2] of segments){
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  const time = nowMs();
  const labelScale = clamp(zoom, 0.75, 1.6);
  const orderFontSize = Math.round(16 * labelScale);
  const nameFontSize = Math.round(14 * labelScale);
  for(const node of nodes){
    const pos = mapNodeScreenPosition(world, node);
    if(!pos) continue;
    const px = pos.x;
    const py = pos.y;
    const hover = world.map.hoverId === node.id;
    const radius = (hover ? 36 : 30) * zoom;
    if((node.id === 'worldTree' && worldTreePortalActive)
      || (node.id === 'worldTreeReliquary' && reliquaryPortalActive)){
      drawWorldTreeVoidSwirl(ctx, px, py, radius, zoom, time, theme);
    }
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, TAU);
    const baseColor = safeHex(node.color) || '#3a4255';
    let fill = baseColor;
    if(node.completed) fill = lightenColor(baseColor, 0.4);
    else if(node.playable && node.unlocked) fill = baseColor;
    else if(node.unlocked) fill = lightenColor(baseColor, 0.15);
    else fill = darkenColor(baseColor, 0.5);
    ctx.fillStyle = fill;
    ctx.strokeStyle = darkenColor(baseColor, 0.6);
    ctx.lineWidth = clamp(4 * zoom, 2, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = nodeInteriorColor;
    ctx.font = `${orderFontSize}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelText = (node.label && String(node.label)) || (node.order != null ? String(node.order) : '');
    if(labelText){
      ctx.fillText(labelText, px, py + 1);
    }
    if(node.completed){
      ctx.save();
      ctx.fillStyle = nodeInteriorColor;
      const checkFontSize = Math.max(12, Math.round(orderFontSize * 0.8));
      ctx.font = `${checkFontSize}px system-ui`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const offset = Math.max(4, 6 * zoom);
      ctx.fillText('✓', px + radius - offset, py - radius + offset);
      ctx.restore();
    }
    ctx.fillStyle = nodeNameColor;
    ctx.font = `${nameFontSize}px system-ui`;
    ctx.textBaseline = 'top';
    ctx.fillText(node.name, px, py + radius + 12 * labelScale);
    if(node.boss){
      const pulse = 1 + Math.sin(time / 220) * 0.18;
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(time / 260) * 0.2;
      ctx.strokeStyle = bossRingColor;
      ctx.lineWidth = clamp(5 * zoom, 2.5, 8);
      ctx.beginPath();
      ctx.arc(px, py, radius + (14 * pulse * zoom), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  if(theme !== 'monochrome') applyBlueBloomOverlay(world, ctx);

  ctx.fillStyle = titleColor;
  ctx.font = '28px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, world.width/2, 60);
  if(subtitleText){
    ctx.font = '16px system-ui';
    ctx.fillStyle = subtitleColor;
    ctx.fillText(subtitleText, world.width/2, 92);
  }

  if(world.map.hoverId){
    const node = world.map.nodes.find(n=>n.id===world.map.hoverId);
    if(node) drawMapTooltip(ctx, world, node);
  }

  if(world.map.messageTimer>0 && world.map.message){
    ctx.save();
    const alpha = clamp(world.map.messageTimer/2.6, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = messageFill;
    const boxWidth = Math.min(world.width-80, 360);
    const boxX = (world.width - boxWidth)/2;
    const boxY = world.height - 90;
    ctx.fillRect(boxX, boxY, boxWidth, 54);
    ctx.strokeStyle = messageStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, 54);
    ctx.fillStyle = messageText;
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(world.map.message, world.width/2, boxY + 27);
    ctx.restore();
  }
}

function drawWorldTreeVoidSwirl(ctx, x, y, radius, zoom, time, theme){
  if(!ctx) return;
  const swirlRadius = radius + Math.max(18, 24 * zoom);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  const baseAlpha = theme === 'monochrome' ? 0.55 : 0.78;
  const swirlColor = theme === 'monochrome' ? 'rgba(210, 210, 228, 0.5)' : 'rgba(159, 123, 255, 0.6)';
  const accentColor = theme === 'monochrome' ? 'rgba(238, 238, 255, 0.4)' : 'rgba(206, 190, 255, 0.42)';
  const phase = time / 900;
  for(let i=0;i<3;i++){
    const angle = phase + i * (TAU / 3);
    const arcRadius = swirlRadius * (0.72 + 0.08 * Math.sin(time / 650 + i));
    ctx.globalAlpha = baseAlpha - i * 0.18;
    ctx.strokeStyle = swirlColor;
    ctx.lineWidth = Math.max(2.4, 3.1 * zoom);
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, angle, angle + Math.PI * 0.9, false);
    ctx.stroke();
  }
  ctx.globalAlpha = baseAlpha * 0.82;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(2, 2.6 * zoom);
  ctx.beginPath();
  ctx.arc(0, 0, swirlRadius * 0.58, -phase * 1.15, -phase * 1.15 + Math.PI * 0.95, true);
  ctx.stroke();
  ctx.globalAlpha = baseAlpha * 0.42;
  const glow = ctx.createRadialGradient(0, 0, radius * 0.55, 0, 0, swirlRadius);
  glow.addColorStop(0, 'rgba(40, 20, 70, 0)');
  glow.addColorStop(0.6, theme === 'monochrome' ? 'rgba(180, 180, 210, 0.24)' : 'rgba(136, 116, 220, 0.3)');
  glow.addColorStop(1, 'rgba(40, 24, 70, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, swirlRadius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function applyBlueBloomOverlay(world, ctx){
  if(!world || !ctx) return;
  const visual = world.ui?.settings?.visual;
  const bloom = visual ? clamp(typeof visual.bloom === 'number' ? visual.bloom : 0, 0, 100) : 0;
  if(bloom <= 0) return;
  const intensity = bloom / 100;
  const width = world.width || ctx.canvas.width || 0;
  const height = world.height || ctx.canvas.height || 0;
  if(width <= 0 || height <= 0) return;
  const maxRadius = Math.sqrt(width * width + height * height);
  const centerX = width * 0.5;
  const centerY = height * 0.42;
  const innerRadius = Math.max(60, maxRadius * 0.18);
  const outerRadius = Math.max(innerRadius + 80, maxRadius);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bloomGradient = ctx.createRadialGradient(centerX, centerY, innerRadius * 0.35, centerX, centerY, outerRadius);
  bloomGradient.addColorStop(0, `rgba(108, 182, 255, ${0.36 * intensity})`);
  bloomGradient.addColorStop(0.5, `rgba(68, 138, 255, ${0.24 * intensity})`);
  bloomGradient.addColorStop(1, 'rgba(18, 32, 64, 0)');
  ctx.fillStyle = bloomGradient;
  ctx.fillRect(0, 0, width, height);
  const verticalGlow = ctx.createLinearGradient(0, 0, 0, height);
  verticalGlow.addColorStop(0, `rgba(40, 86, 186, ${0.18 * intensity})`);
  verticalGlow.addColorStop(0.65, `rgba(22, 52, 126, ${0.12 * intensity})`);
  verticalGlow.addColorStop(1, 'rgba(12, 26, 70, 0)');
  ctx.fillStyle = verticalGlow;
  ctx.fillRect(0, 0, width, height);
  const edgeGlow = ctx.createLinearGradient(0, 0, width, 0);
  edgeGlow.addColorStop(0, `rgba(32, 74, 176, ${0.14 * intensity})`);
  edgeGlow.addColorStop(0.5, 'rgba(14, 30, 70, 0)');
  edgeGlow.addColorStop(1, `rgba(32, 74, 176, ${0.14 * intensity})`);
  ctx.fillStyle = edgeGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function safeHex(hex){
  const rgb = parseHexColor(hex);
  return rgb ? rgbToHex(rgb) : null;
}

function parseColorWithAlpha(color){
  if(!color || typeof color !== 'string') return null;
  const trimmed = color.trim();
  if(!trimmed) return null;
  const hex = safeHex(trimmed);
  if(hex) return { color: hex, alpha: 1 };
  const match = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if(!match) return null;
  const parts = match[1].split(',').map(part=>part.trim()).filter(Boolean);
  if(parts.length < 3) return null;
  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  if([r, g, b].some(value=>Number.isNaN(value))) return null;
  let alpha = 1;
  if(parts.length > 3){
    const rawAlpha = Number(parts[3]);
    if(Number.isFinite(rawAlpha)) alpha = clamp(rawAlpha, 0, 1);
  }
  return { color: rgbToHex({ r, g, b }), alpha };
}

function normalizeColorWithAlpha(color, fallback){
  const parsed = parseColorWithAlpha(color);
  if(parsed) return parsed;
  const fallbackParsed = parseColorWithAlpha(fallback);
  if(fallbackParsed) return fallbackParsed;
  return { color: '#000000', alpha: 1 };
}

function ensureOpaqueColor(color){
  if(!color) return color;
  const safe = safeHex(color);
  if(safe) return safe;
  if(typeof color !== 'string') return color;
  const match = color.trim().match(/^rgba?\(([^)]+)\)$/i);
  if(!match) return color;
  const parts = match[1].split(',').slice(0, 3).map(v=>parseFloat(v.trim()));
  if(parts.length < 3 || parts.some(v=>Number.isNaN(v))) return color;
  return rgbToHex({ r: parts[0], g: parts[1], b: parts[2] });
}

function lightenColor(hex, amount){
  const safe = safeHex(hex);
  if(!safe) return hex;
  return mixHex(safe, '#ffffff', clamp(amount, 0, 1));
}

function darkenColor(hex, amount){
  const safe = safeHex(hex);
  if(!safe) return hex;
  return mixHex(safe, '#000000', clamp(amount, 0, 1));
}

function colorWithAlpha(hex, alpha){
  const rgb = parseHexColor(hex);
  const clamped = clamp(alpha, 0, 1);
  if(!rgb) return `rgba(255, 255, 255, ${clamped})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamped})`;
}

function scaleColorAlpha(color, scale){
  if(!color) return null;
  const factor = Number(scale);
  if(!Number.isFinite(factor)) return null;
  if(typeof color !== 'string') return null;
  const trimmed = color.trim();
  const rgbaMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if(rgbaMatch){
    const parts = rgbaMatch[1].split(',').map(part=>part.trim());
    if(parts.length < 3) return null;
    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);
    if([r, g, b].some(v=>Number.isNaN(v))) return null;
    const baseAlphaRaw = parts.length > 3 ? Number(parts[3]) : 1;
    const baseAlpha = Number.isFinite(baseAlphaRaw) ? baseAlphaRaw : 1;
    const finalAlpha = Math.max(0, Math.min(1, baseAlpha * factor));
    const toChannel = value=>Math.max(0, Math.min(255, Math.round(value)));
    return `rgba(${toChannel(r)}, ${toChannel(g)}, ${toChannel(b)}, ${finalAlpha})`;
  }
  const safe = ensureOpaqueColor(color);
  if(!safe) return null;
  const clamped = Math.max(0, Math.min(1, factor));
  return colorWithAlpha(safe, clamped);
}

function parseHexColor(hex){
  if(typeof hex !== 'string') return null;
  const clean = hex.trim().replace('#','');
  if(clean.length===3){
    const r = clean[0]+clean[0];
    const g = clean[1]+clean[1];
    const b = clean[2]+clean[2];
    return parseHexColor(r+g+b);
  }
  if(clean.length!==6) return null;
  const num = parseInt(clean, 16);
  if(Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(rgb){
  const toChannel = v=>Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0');
  return `#${toChannel(rgb.r)}${toChannel(rgb.g)}${toChannel(rgb.b)}`;
}

function mixHex(a, b, t){
  const ca = parseHexColor(a);
  const cb = parseHexColor(b);
  if(!ca || !cb) return ca ? rgbToHex(ca) : (cb ? rgbToHex(cb) : a);
  const mix = {
    r: lerp(ca.r, cb.r, t),
    g: lerp(ca.g, cb.g, t),
    b: lerp(ca.b, cb.b, t)
  };
  return rgbToHex(mix);
}

function formatDifficultyMultiplier(value){
  const num = Number(value);
  if(!Number.isFinite(num) || num <= 0) return '×1';
  const rounded = Math.round(num * 100) / 100;
  if(Math.abs(rounded - Math.round(rounded)) < 0.001){
    return `×${Math.round(rounded)}`;
  }
  return `×${rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function drawMapTooltip(ctx, world, node){
  if(!world.map?.pointer) return;
  const pos = world.map.pointer;
  ctx.save();
  ctx.font = '14px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = [node.name];
  if(node.description){
    const difficultyText = Number.isFinite(node.difficultyMultiplier)
      ? formatDifficultyMultiplier(node.difficultyMultiplier)
      : null;
    if(difficultyText){
      lines.push(`${node.description} (Difficulty ${difficultyText})`);
    }else{
      lines.push(node.description);
    }
  }else if(Number.isFinite(node.difficultyMultiplier)){
    lines.push(`Difficulty ${formatDifficultyMultiplier(node.difficultyMultiplier)}`);
  }
  const worldTreePortalReady = node.id === 'worldTree'
    && hasWorldMapUnlocked(world, WORLD_MAP_ID_MONOCHROME);
  if(worldTreePortalReady){
    lines.push('Press F to enter the Monochrome Realm.');
  }else{
    const status = node.playable && node.unlocked ? 'Click to enter' : (node.unlocked ? 'Coming soon' : 'Locked');
    lines.push(status);
  }
  const width = Math.max(...lines.map(line=>ctx.measureText(line).width)) + 18;
  const height = lines.length * 18 + 12;
  let x = pos.x + 18;
  let y = pos.y - height - 12;
  if(x + width > world.width) x = world.width - width - 20;
  if(y < 20) y = pos.y + 18;
  ctx.fillStyle = 'rgba(9, 16, 28, 0.85)';
  ctx.strokeStyle = 'rgba(107, 209, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = '#eef6ff';
  let ty = y + 6;
  for(const line of lines){
    ctx.fillText(line, x + 9, ty);
    ty += 18;
  }
  ctx.restore();
}

function renderScreenBanner(world, ctx){
  const state = world.levelState;
  if(!state || state.bannerTimer<=0) return;
  const alpha = clamp(Math.min(1, state.bannerTimer/1.1), 0, 1);
  ctx.save();
  ctx.globalAlpha = Math.pow(alpha, 0.9);
  const centerX = world.width/2;
  const centerY = world.height*0.18;
  const width = Math.min(world.width-120, 460);
  ctx.fillStyle = 'rgba(9, 15, 26, 0.75)';
  ctx.fillRect(centerX-width/2, centerY-38, width, 76);
  ctx.strokeStyle = 'rgba(107, 209, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(centerX-width/2, centerY-38, width, 76);
  ctx.fillStyle = '#f1f5ff';
  ctx.font = '24px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.bannerText, centerX, centerY-8);
  if(state.bannerSubtext){
    ctx.fillStyle = '#9fb4f0';
    ctx.font = '16px system-ui';
    ctx.fillText(state.bannerSubtext, centerX, centerY+18);
  }
  ctx.restore();
}

function drawDefeatOverlay(world, ctx){
  const overlay = world?.defeatOverlay;
  if(!overlay || !overlay.active) return;
  ctx.save();
  const fade = clamp(overlay.fade ?? 0, 0, 1);
  if(fade > 0){
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, world.width, world.height);
  }
  if(overlay.textVisible){
    const text = overlay.text || 'YOU LOSE';
    const fontSize = Math.round(Math.min(world.width * 0.14, world.height * 0.18, 132));
    const outline = Math.max(4, Math.round(fontSize / 9));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px "Press Start 2P", "Silkscreen", "VT323", "Courier New", monospace`;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    if(typeof prevSmoothing === 'boolean') ctx.imageSmoothingEnabled = false;
    ctx.lineWidth = outline;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.fillStyle = '#ff3b3b';
    const centerX = world.width * 0.5;
    const centerY = world.height * 0.5;
    ctx.strokeText(text, centerX, centerY);
    ctx.fillText(text, centerX, centerY);
    if(typeof prevSmoothing === 'boolean') ctx.imageSmoothingEnabled = prevSmoothing;
  }
  ctx.restore();
}

function loadSavedProgress(world){
  const data = readSaveData();
  ensureUnlockedMapSet(world);
  if(!data){
    world.profile.coins = world.profile.coins ?? 0;
    world.coins = world.profile.coins;
    const surfaceMap = world.maps?.[WORLD_MAP_ID_SURFACE] || world.map;
    if(surfaceMap?.nodes?.length){
      surfaceMap.nodes[0].unlocked = true;
    }
    world.activeMapId = surfaceMap?.worldId || WORLD_MAP_ID_SURFACE;
    world.map = surfaceMap || world.map;
    return;
  }

  if(data.profile){
    const saved = data.profile;
    if(Array.isArray(saved.team)){
      world.profile.team = ensureTeamProfiles(saved.team);
    }else{
      const legacy = cloneStickProfile(saved);
      world.profile.team = ensureTeamProfiles([legacy]);
    }
    world.profile.inventory = cloneInventory(saved.inventory || world.profile.inventory);
    world.profile.armory = cloneArmory(saved.armory || world.profile.armory);
    world.profile.teamSlotsUnlocked = clampTeamSlotCount(saved.teamSlotsUnlocked ?? TEAM_SIZE);
    const activeIndex = saved.activeIndex ?? saved.equipIndex ?? world.profile.activeIndex ?? 0;
    world.profile.activeIndex = clamp(activeIndex, 0, Math.max(0, world.profile.teamSlotsUnlocked - 1));
    world.profile.coins = saved.coins ?? world.profile.coins ?? 0;
    if(Array.isArray(saved.openedChests)){
      world.profile.openedChests = saved.openedChests.map(id=>String(id));
    }else if(!Array.isArray(world.profile.openedChests)){
      world.profile.openedChests = [];
    }
    if(Array.isArray(saved.drainedChests)){
      world.profile.drainedChests = saved.drainedChests.map(id=>String(id));
    }else if(!Array.isArray(world.profile.drainedChests)){
      world.profile.drainedChests = [];
    }
    if(Array.isArray(saved.claimedPedestals)){
      world.profile.claimedPedestals = saved.claimedPedestals.map(id=>String(id));
    }else if(!Array.isArray(world.profile.claimedPedestals)){
      world.profile.claimedPedestals = [];
    }
  }

  if(Array.isArray(data.mapAccess)){
    const unlocked = data.mapAccess
      .map(entry=>normalizeMapWorldId(entry))
      .filter(Boolean);
    world.unlockedMapIds = new Set(unlocked);
    ensureUnlockedMapSet(world);
  }

  if(data.maps && typeof data.maps === 'object'){
    for(const key of Object.keys(data.maps)){
      const id = normalizeMapWorldId(key);
      const targetMap = world.maps?.[id];
      if(targetMap) applySavedMapState(targetMap, data.maps[key]);
    }
  }

  const surfaceMap = world.maps?.[WORLD_MAP_ID_SURFACE] || world.map;
  if(surfaceMap && data.map?.nodes){
    applySavedMapState(surfaceMap, data.map);
  }

  if(typeof data.activeMapId === 'string'){
    const desired = normalizeMapWorldId(data.activeMapId);
    if(hasWorldMapUnlocked(world, desired) && world.maps?.[desired]){
      world.activeMapId = desired;
    }
  }
  ensureUnlockedMapSet(world);
  if(isStageCompleted(world, 'world8VoidDojo')){
    unlockWorldMap(world, WORLD_MAP_ID_MONOCHROME);
  }
  if(world.maps?.[world.activeMapId]){
    world.map = world.maps[world.activeMapId];
  }else if(world.maps?.[WORLD_MAP_ID_SURFACE]){
    world.activeMapId = WORLD_MAP_ID_SURFACE;
    world.map = world.maps[WORLD_MAP_ID_SURFACE];
  }

  restoreAllMapUnlocks(world);

  world.coins = world.profile.coins ?? 0;
  world.teamActiveIndex = world.profile.activeIndex ?? 0;
}

function autoSaveProgress(world){
  const payload = captureSavePayload(world);
  const stored = writeSaveData(payload);
  if(world.map){
    if(stored){
      setMapMessage(world, `Progress saved to ${SAVE_DIRECTORY}/${SAVE_FILE_NAME}.`);
    }else{
      setMapMessage(world, 'Unable to save progress!');
    }
  }
  return stored;
}

function captureSavePayload(world){
  const profile = world.profile ? {
    team: ensureTeamProfiles(world.profile.team),
    activeIndex: clamp(world.profile.activeIndex ?? 0, 0, Math.max(0, getUnlockedTeamSlots(world) - 1)),
    inventory: cloneInventory(world.profile.inventory),
    armory: cloneArmory(world.profile.armory),
    coins: world.profile.coins ?? 0,
    glyphInventory: cloneGlyphInventory(world.profile.glyphInventory),
    openedChests: Array.isArray(world.profile.openedChests)
      ? world.profile.openedChests.map(id=>String(id))
      : [],
    drainedChests: Array.isArray(world.profile.drainedChests)
      ? world.profile.drainedChests.map(id=>String(id))
      : [],
    claimedPedestals: Array.isArray(world.profile.claimedPedestals)
      ? world.profile.claimedPedestals.map(id=>String(id))
      : [],
    teamSlotsUnlocked: getUnlockedTeamSlots(world)
  } : null;
  ensureUnlockedMapSet(world);
  const activeMapId = normalizeMapWorldId(world.activeMapId);
  const surfaceMap = world.maps?.[WORLD_MAP_ID_SURFACE] || world.map;
  const mapNodes = collectMapNodesForSave(surfaceMap);
  const maps = {};
  for(const map of getAllMaps(world)){
    if(!map) continue;
    const id = normalizeMapWorldId(map.worldId || map.id);
    maps[id] = { nodes: collectMapNodesForSave(map) };
  }
  const unlockedMaps = Array.from(world.unlockedMapIds || []).map(id=>normalizeMapWorldId(id));
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    profile,
    map: { nodes: mapNodes },
    maps,
    mapAccess: unlockedMaps,
    activeMapId
  };
}

function writeSaveData(data){
  if(!data) return false;
  const serialized = JSON.stringify(data, null, 2);
  let stored = false;

  try{
    if(typeof localStorage !== 'undefined'){
      localStorage.setItem(SAVE_STORAGE_KEY, serialized);
      stored = true;
    }
  }catch(err){
    console.warn('Local storage save failed:', err);
  }

  const persistWithFs = (fs, path)=>{
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    const dir = path.join(cwd, SAVE_DIRECTORY);
    if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, SAVE_FILE_NAME);
    fs.writeFileSync(filePath, serialized, 'utf8');
  };

  try{
    if(typeof window !== 'undefined' && typeof window.require === 'function'){
      const fs = window.require('fs');
      const path = window.require('path');
      persistWithFs(fs, path);
      stored = true;
    }
  }catch(err){
    console.warn('File save via window.require failed:', err);
  }

  try{
    if(typeof window === 'undefined' && typeof require === 'function'){
      const fs = require('fs');
      const path = require('path');
      persistWithFs(fs, path);
      stored = true;
    }
  }catch(err){
    console.warn('File save via Node require failed:', err);
  }

  return stored;
}

function readSaveData(){
  let raw = null;
  try{
    if(typeof localStorage !== 'undefined'){
      raw = localStorage.getItem(SAVE_STORAGE_KEY);
    }
  }catch(err){
    console.warn('Local storage load failed:', err);
  }

  const tryReadWithFs = (fs, path)=>{
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    const filePath = path.join(cwd, SAVE_DIRECTORY, SAVE_FILE_NAME);
    if(fs.existsSync(filePath)){
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  };

  if(!raw){
    try{
      if(typeof window !== 'undefined' && typeof window.require === 'function'){
        const fs = window.require('fs');
        const path = window.require('path');
        raw = tryReadWithFs(fs, path);
      }
    }catch(err){
      console.warn('File load via window.require failed:', err);
    }
  }

  if(!raw){
    try{
      if(typeof window === 'undefined' && typeof require === 'function'){
        const fs = require('fs');
        const path = require('path');
        raw = tryReadWithFs(fs, path);
      }
    }catch(err){
      console.warn('File load via Node require failed:', err);
    }
  }

  if(!raw) return null;
  try{
    return JSON.parse(raw);
  }catch(err){
    console.warn('Failed to parse save data:', err);
    return null;
  }
}

function deleteSaveData(){
  let removed = false;
  try{
    if(typeof localStorage !== 'undefined'){
      if(localStorage.getItem(SAVE_STORAGE_KEY) !== null){
        localStorage.removeItem(SAVE_STORAGE_KEY);
        removed = true;
      }
    }
  }catch(err){
    console.warn('Local storage delete failed:', err);
  }

  const removeWithFs = (fs, path)=>{
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.';
    const filePath = path.join(cwd, SAVE_DIRECTORY, SAVE_FILE_NAME);
    if(fs.existsSync(filePath)){
      try{
        fs.unlinkSync(filePath);
        return true;
      }catch(err){
        console.warn('File delete failed:', err);
      }
    }
    return false;
  };

  try{
    if(typeof window !== 'undefined' && typeof window.require === 'function'){
      const fs = window.require('fs');
      const path = window.require('path');
      if(removeWithFs(fs, path)) removed = true;
    }
  }catch(err){
    console.warn('File delete via window.require failed:', err);
  }

  try{
    if(typeof window === 'undefined' && typeof require === 'function'){
      const fs = require('fs');
      const path = require('path');
      if(removeWithFs(fs, path)) removed = true;
    }
  }catch(err){
    console.warn('File delete via Node require failed:', err);
  }

  return removed;
}
