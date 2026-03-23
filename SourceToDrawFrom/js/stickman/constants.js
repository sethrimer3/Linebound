// stickman/constants.js

function scaleOffsets(base, scale){
  const out={};
  for(const name of Object.keys(base)){
    out[name] = { x: base[name].x * scale, y: base[name].y * scale };
  }
  return out;
}

const STICK_SCALE = 0.375;
const STICK_TERRAIN_RADIUS = 5.5;
const STICK_JUMP_SURFACE_SAMPLE_DISTANCE = 28 * STICK_SCALE;
const STICK_JUMP_SURFACE_FAR_SAMPLE = 80 * STICK_SCALE;
const STICK_JUMP_SURFACE_MAX_SLOPE = 0.55; // ~29 degrees
const STICK_WALL_VERTICAL_BUFFER = 16 * STICK_SCALE; // ignore floor/ceiling contacts when clamping horizontal motion
const CEILING_CLAMP_CORE_PARTS = new Set(['head', 'neck', 'pelvis']);

const UNDERWATER_DAMAGE_DELAY = 3;
const UNDERWATER_DAMAGE_PER_SEC = 10;
const UNDERWATER_BUBBLE_INTERVAL_MIN = 0.18;
const UNDERWATER_BUBBLE_INTERVAL_MAX = 0.36;
const UNDERWATER_HEAD_SAMPLE_OFFSET = 12 * STICK_SCALE;
const LAVA_DAMAGE_DELAY = 0;
const LAVA_DAMAGE_PER_SEC = 180;

const BASE_RIG_OFFSETS = {

  head:   { x:  0,  y: -58 },
  neck:   { x:  0,  y: -40 },
  pelvis: { x:  0,  y:   0 },
  elbowL: { x: -15.0849, y: -24.9151 },
  elbowR: { x:  15.0849, y: -24.9151 },
  handL:  { x: -25.7516, y: -6.4398 },
  handR:  { x:  25.7516, y: -6.4398 },
  kneeL:  { x: -18.8562, y:  18.8562 },
  kneeR:  { x:  18.8562, y:  18.8562 }
};


const RIG_DEFAULT_ELASTICITY = 0.02;
const RIG_DEFAULT_DAMPING = 0.01;
const RIG_DEFAULT_MAX_CORRECTION_RATIO = 0.1;

const HEAD_BONE_ELASTICITY = RIG_DEFAULT_ELASTICITY * 2.5;
const HEAD_BONE_DAMPING = RIG_DEFAULT_DAMPING * 2;
const HEAD_BONE_MAX_CORRECTION_RATIO = RIG_DEFAULT_MAX_CORRECTION_RATIO * 1.5;


const ARM_BONE_STIFFNESS = 0.72;
const ARM_CROSS_STIFFNESS = 0.7;
const ARM_POSE_FOLLOW = 0.72;
const ARM_POSE_SETTLE = 0.7;
const ARM_BONE_ELASTICITY = RIG_DEFAULT_ELASTICITY * 3.2;
const ARM_BONE_DAMPING = RIG_DEFAULT_DAMPING * 2.8;
const ARM_BONE_MAX_CORRECTION_RATIO = RIG_DEFAULT_MAX_CORRECTION_RATIO * 1.4;
const ARM_SHOULDER_TARGET_STIFFNESS = 1.6;
const ARM_ELBOW_TARGET_STIFFNESS = 1.35;
const ARM_BONE_CONSTRAINT_OPTIONS = {
  elastic: true,
  elasticity: ARM_BONE_ELASTICITY,
  damping: ARM_BONE_DAMPING,
  maxCorrectionRatio: ARM_BONE_MAX_CORRECTION_RATIO
};
const LEG_BONE_STIFFNESS = 1;
const LEG_BONE_ELASTICITY = RIG_DEFAULT_ELASTICITY;
const LEG_BONE_DAMPING = RIG_DEFAULT_DAMPING;
const LEG_BONE_MAX_CORRECTION_RATIO = RIG_DEFAULT_MAX_CORRECTION_RATIO;
const LEG_HIP_OFFSET = 6 * STICK_SCALE;
const LEG_FREE_FOLLOW_PER_SEC = 28;
const LEG_STUCK_FOLLOW_PER_SEC = 42;
const LEG_KNEE_FOLLOW_PER_SEC = 36;
const LEG_RELEASE_MULTIPLIER = 1.75;
const LEG_STICK_THRESHOLD = 0.18;
const LEG_NATURAL_BEND = 0.16;
const LEG_OUTWARD_OFFSET = 18 * STICK_SCALE;
const LEG_STEP_FORWARD_RATIO = 0.42;
const LEG_STEP_FLOOR_OFFSET = 4;
const FOOT_RADIUS = 12 * STICK_SCALE;
const HAND_COLLISION_RADIUS = Math.max(FOOT_RADIUS * 0.85, 3.25);
const FOOT_FOLLOW_PER_SEC = 18;
const FOOT_MAX_FALL_SPEED = 2200;
const FOOT_GROUND_EPSILON = 0.6;
const FOOT_CLAMP_MAX_GROUND_DISTANCE = 3; // px threshold to snap a clamped foot to the ground
const EXTREMITY_CUBE_SIZE = 5;

const COMBO_WINDOW_MS = 1000;

const SKILL_POINTS_PER_LEVEL = 1;

const ARM_POINTS = new Set(['elbowL','elbowR','handL','handR']);
const LIMB_POINTS = new Set([
  'elbowL','elbowR','handL','handR','kneeL','kneeR'
]);
const LIMB_PULL_PRIORITY = {
  elbowL: 1,
  elbowR: 1,
  handL: 2,
  handR: 2
};
const COLLIDING_RIG_POINTS = new Set(['head','handL','handR']);
const COLLIDING_RIG_POINT_RADII = {
  head: STICK_TERRAIN_RADIUS,
  handL: HAND_COLLISION_RADIUS,
  handR: HAND_COLLISION_RADIUS
};
const CORE_BONE_STIFFNESS = 1;

function isHighGraphicsEnabled(world){
  const quality = world?.ui?.settings?.visual?.graphicsQuality;
  return quality !== 'low';
}

const DEG_TO_RAD = Math.PI / 180;

const RIG_CONFIG = {
  names: ['head','neck','pelvis','elbowL','elbowR','handL','handR','kneeL','kneeR'],

  offsets: scaleOffsets(BASE_RIG_OFFSETS, STICK_SCALE),
  bones:[
    ['head','neck', CORE_BONE_STIFFNESS, {
      elastic: true,
      elasticity: HEAD_BONE_ELASTICITY,
      damping: HEAD_BONE_DAMPING,
      maxCorrectionRatio: HEAD_BONE_MAX_CORRECTION_RATIO
    }],
    ['neck','pelvis', CORE_BONE_STIFFNESS],
    ['neck','elbowL', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['neck','elbowR', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['elbowL','handL', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['elbowR','handR', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['neck','handL', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['neck','handR', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['pelvis','elbowL', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['pelvis','elbowR', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['pelvis','handL', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['pelvis','handR', ARM_BONE_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['elbowL','elbowR', ARM_CROSS_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['handL','handR', ARM_CROSS_STIFFNESS, ARM_BONE_CONSTRAINT_OPTIONS],
    ['pelvis','kneeL', LEG_BONE_STIFFNESS, {
      elastic: true,
      elasticity: LEG_BONE_ELASTICITY,
      damping: LEG_BONE_DAMPING,
      maxCorrectionRatio: LEG_BONE_MAX_CORRECTION_RATIO
    }],
    ['pelvis','kneeR', LEG_BONE_STIFFNESS, {
      elastic: true,
      elasticity: LEG_BONE_ELASTICITY,
      damping: LEG_BONE_DAMPING,
      maxCorrectionRatio: LEG_BONE_MAX_CORRECTION_RATIO
    }],
    ['kneeL','kneeR', LEG_BONE_STIFFNESS, {
      elastic: true,
      elasticity: LEG_BONE_ELASTICITY * 0.6,
      damping: LEG_BONE_DAMPING,
      maxCorrectionRatio: LEG_BONE_MAX_CORRECTION_RATIO
    }]
  ],

  lines:[
    ['pelvis','kneeL'],
    ['pelvis','kneeR'],
    ['handL','elbowL','neck','elbowR','handR'],
    ['head','neck']
  ],
};

const RIG_JOINT_TARGETS = [
  // Shoulders
  { point: 'elbowL', anchor: 'neck', targetDeg: 45, stiffness: ARM_SHOULDER_TARGET_STIFFNESS },
  { point: 'elbowR', anchor: 'neck', targetDeg: -45, stiffness: ARM_SHOULDER_TARGET_STIFFNESS },
  // Elbows
  { point: 'handL', anchor: 'elbowL', targetDeg: 30, stiffness: ARM_ELBOW_TARGET_STIFFNESS },
  { point: 'handR', anchor: 'elbowR', targetDeg: -30, stiffness: ARM_ELBOW_TARGET_STIFFNESS },
  // Hips
  { point: 'kneeL', anchor: 'pelvis', targetDeg: 45, stiffness: 3 },
  { point: 'kneeR', anchor: 'pelvis', targetDeg: -45, stiffness: 3 }
];

const RIG_JOINT_TARGET_MAP = (()=>{
  const offsets = RIG_CONFIG.offsets || {};
  const map = {};
  for(const entry of RIG_JOINT_TARGETS){
    const anchor = offsets[entry.anchor] || { x: 0, y: 0 };
    const point = offsets[entry.point] || { x: 0, y: 0 };
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    const defaultRad = entry.targetDeg * DEG_TO_RAD;
    map[entry.point] = {
      ...entry,
      restLength: Math.hypot(dx, dy) || 0,
      targetRad: defaultRad,
      defaultTargetDeg: entry.targetDeg,
      defaultTargetRad: defaultRad
    };
  }
  return map;
})();

const LEG_BASE_TARGETS = (()=>{
  const offsets = RIG_CONFIG.offsets || {};
  const pelvis = offsets.pelvis || { x: 0, y: 0 };
  return {
    left: {
      knee: {
        x: (offsets.kneeL?.x ?? -14 * STICK_SCALE) - pelvis.x,
        y: (offsets.kneeL?.y ?? 28 * STICK_SCALE) - pelvis.y
      },
      foot: {
        x: (offsets.kneeL?.x ?? -14 * STICK_SCALE) - pelvis.x,
        y: (offsets.kneeL?.y ?? 28 * STICK_SCALE) - pelvis.y + 28 * STICK_SCALE
      }
    },
    right: {
      knee: {
        x: (offsets.kneeR?.x ?? 14 * STICK_SCALE) - pelvis.x,
        y: (offsets.kneeR?.y ?? 28 * STICK_SCALE) - pelvis.y
      },
      foot: {
        x: (offsets.kneeR?.x ?? 14 * STICK_SCALE) - pelvis.x,
        y: (offsets.kneeR?.y ?? 28 * STICK_SCALE) - pelvis.y + 28 * STICK_SCALE
      }
    }
  };
})();

function cloneOffset(point){
  if(!point) return { x: 0, y: 0 };
  return { x: point.x, y: point.y };
}

function rotatePoint(point, angle){
  if(!point) return null;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

function buildLeg(side, hipOffsetX, rest, baseX, baseY){
  const hipOffset = { x: hipOffsetX, y: 0 };
  const restKnee = cloneOffset(rest?.knee);
  const outward = LEG_OUTWARD_OFFSET * (side === 'left' ? -1 : 1);
  restKnee.x += outward * 0.4;
  const baseRestKnee = { x: restKnee.x, y: restKnee.y };
  const knee = { x: baseX + restKnee.x, y: baseY + restKnee.y };
  const rawLength = Math.hypot(restKnee.x - hipOffset.x, restKnee.y - hipOffset.y);
  const restLength = Math.max(rawLength, 1e-3);
  const restFoot = cloneOffset(rest?.foot);
  if(!restFoot){
    const defaultYOffset = restLength * 0.85;
    restFoot = { x: restKnee.x, y: restKnee.y + defaultYOffset };
  }
  const baseRestFoot = { x: restFoot.x, y: restFoot.y };
  const footX = baseX + restFoot.x;
  const footY = baseY + restFoot.y;
  const footRadius = Math.max(FOOT_RADIUS, 2);
  return {
    side,
    hipOffset,
    restKneeOffset: restKnee,
    restFootOffset: restFoot,
    baseRestKneeOffset: baseRestKnee,
    baseRestFootOffset: baseRestFoot,
    knee,
    restLength,
    stepForward: restLength * LEG_STEP_FORWARD_RATIO,
    releaseDistance: restLength * LEG_RELEASE_MULTIPLIER,
    stuckPos: { x: knee.x, y: knee.y },
    foot: {
      x: footX,
      y: footY,
      prevX: footX,
      prevY: footY,
      vx: 0,
      vy: 0,
      radius: footRadius,
      terrainRadius: footRadius,
      grounded: false,
      preGroundContact: false,
      jumpReadyUntil: 0,
      gravityScale: 1,
      followStrength: FOOT_FOLLOW_PER_SEC,
      maxFallSpeed: FOOT_MAX_FALL_SPEED
    }
  };
}

function createLegRig(x, y){
  return {
    left: buildLeg('left', -LEG_HIP_OFFSET, LEG_BASE_TARGETS.left, x, y),
    right: buildLeg('right', LEG_HIP_OFFSET, LEG_BASE_TARGETS.right, x, y)
  };
}
