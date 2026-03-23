// stickman/sword.js

const SWORD_VARIANTS = {
  sword: {
    baseBack: -26,
    baseDown: -48,
    targetBack: -22,
    targetDown: -82,
    sheathBackOffset: 4,
    sheathBaseAlong: 0.2,
    sheathHandleForward: 16,
    sheathHandleDown: 6,
    sheathTipBack: 34,
    sheathTipDown: 10,
    sheathKneeInfluence: 0.45,
    sheathKneeBack: 10,
    sheathKneeDown: 6,
    tipMass: 2.2,
    tipFriction: 0,
    restTerrainRadius: 1.6,
    attackTerrainRadius: 0,
    handRestMin: 68,
    elbowRestMin: 56,
    handStiffness: 0.24,
    elbowStiffness: 0.18,
    pullStrength: 0.24,
    pullX: 0.16,
    pullY: 0.2,
    bladeWidth: 4,
    bladeLineMin: 3,
    trailLife: 160,
    trailAlpha: 0.85,
    trailWidthScale: 1.15,
    trailGlow: 16,
    switchGhostLife: 200,
    switchGhostMax: 3,
    switchGhostAlpha: 0.65,
    dragDropMargin: 10,
    dragDropPull: 0.32,
    guardLength: 8,
    guardWidth: 3,
    guardLineMin: 1.4,
    guardColor: null,
    idleLag: { x: 34, y: -46 },
    glowRadius: 6,
    sparkSpeedThreshold: 60,
    sparkCooldown: 60,
    sparkBurstThreshold: 200,
    sparkMinCount: 1,
    sparkBurstCount: 3,
    sparkSide: { min: -70, max: 40 },
    sparkUp: { min: -140, max: -80 },
    sparkBack: { min: 20, max: 60 },
    sparkXOffset: { min: -6, max: 6 },
    sparkYOffset: { min: 1, max: 5 },
    sparkLineWidth: 2.2,
    maxSparks: 32,
    highlightWidth: 1.6,
    highlightOffset: 1.6,
    highlightAlpha: 0.45,
    handleBackLength: 6,
    handleForwardLength: 4,
    handleWidth: 1.8,
    handleColor: '#d6cfc5',
    pommelRadius: 2.2,
    pommelOffset: 0,
    oneWayConstraints: true,
    spinRadius: 1.08,
    spinElbowRadius: 0.92,
    spinLift: 18,
    spinLean: 8,
    spinTipFollow: 1, // How aggressively the blade tip snaps to combo spin arcs (1 locks exactly).
    dragStyle: false,
    spinRadiusClamp: 1.45
  },
  greatsword: {
    baseBack: 92,
    baseDown: 120,
    targetBack: 122,
    targetDown: 138,
    tipMass: 4.6,
    tipFriction: 8.5,
    restTerrainRadius: 3.2,
    attackTerrainRadius: 0,
    handRestMin: 128,
    elbowRestMin: 102,
    handStiffness: 0.21,
    elbowStiffness: 0.16,
    pullStrength: 0.22,
    pullX: 0.11,
    pullY: 0.26,
    bladeWidth: 7,
    bladeLineMin: 4.5,
    trailLife: 200,
    trailAlpha: 0.9,
    trailWidthScale: 1.1,
    guardLength: 16,
    guardWidth: 4.6,
    guardLineMin: 2.2,
    guardColor: '#c7b38a',
    idleLag: { x: -96, y: 48 },
    sheathBackOffset: 10,
    sheathBaseAlong: 0.18,
    sheathHandleForward: 22,
    sheathHandleDown: 12,
    sheathTipBack: 50,
    sheathTipDown: 18,
    sheathKneeInfluence: 0.5,
    sheathKneeBack: 16,
    sheathKneeDown: 12,
    glowRadius: 8,
    sparkSpeedThreshold: 45,
    sparkCooldown: 50,
    sparkBurstThreshold: 170,
    sparkMinCount: 2,
    sparkBurstCount: 5,
    sparkSide: { min: -110, max: 80 },
    sparkUp: { min: -200, max: -120 },
    sparkBack: { min: 60, max: 120 },
    sparkXOffset: { min: -10, max: 10 },
    sparkYOffset: { min: 2, max: 8 },
    sparkLineWidth: 2.8,
    maxSparks: 48,
    highlightWidth: 2.2,
    highlightOffset: 2.4,
    highlightAlpha: 0.35,
    handleBackLength: 12,
    handleForwardLength: 6,
    handleWidth: 2.6,
    handleColor: '#c7b38a',
    pommelRadius: 3.6,
    pommelOffset: 2.6,
    oneWayConstraints: true,
    spinRadius: 1.12,
    spinElbowRadius: 0.88,
    spinLift: 24,
    spinLean: 12,
    spinTipFollow: 0.82, // Lower follow keeps the heavy blade feeling weighty during spins.
    dragStyle: true,
    trailGlow: 22,
    spinRadiusClamp: 1.35,
    switchGhostLife: 240,
    switchGhostMax: 4,
    switchGhostAlpha: 0.55,
    dragDropMargin: 16,
    dragDropPull: 0.38
  }
};

const SWORD_SHEATH_DELAY_MS = 3400;

function swordVariantConfig(name){
  return SWORD_VARIANTS[name] || SWORD_VARIANTS.sword;
}

function swordGripHandForDir(dir, config){
  const facingRight = dir >= 0;
  const frontHand = facingRight ? 'handR' : 'handL';
  // Always keep the blade anchored to the leading hand so the offhand can stay free
  // for shields or other secondary gear during multi-hit swing chains.
  return frontHand;
}

function swordGripElbowForDir(dir, config){
  const hand = swordGripHandForDir(dir, config);
  return hand === 'handL' ? 'elbowL' : 'elbowR';
}

function swordAltHandForDir(dir, config){
  const hand = swordGripHandForDir(dir, config);
  return hand === 'handL' ? 'handR' : 'handL';
}

function swordAltElbowForDir(dir, config){
  const hand = swordAltHandForDir(dir, config);
  return hand === 'handL' ? 'elbowL' : 'elbowR';
}

function swordIdleDirectionForDir(dir, config){
  const forward = dir >= 0 ? 1 : -1;
  return config.dragStyle ? -forward : forward;
}
