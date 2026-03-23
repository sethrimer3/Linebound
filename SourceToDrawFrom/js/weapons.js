// weapons.js
function scaleDamageStat(value){
  if(!Number.isFinite(value) || value <= 0) return 0;
  return Number(value);
}

const damageScaleScope = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this);
if(damageScaleScope && typeof damageScaleScope.scaleDamageStat !== 'function'){
  damageScaleScope.scaleDamageStat = scaleDamageStat;
}
// --- Weapon Definitions ----------------------------------------------------
//
// Each weapon entry captures the gameplay configuration for that archetype.
// The table is intentionally data-only so designers can quickly scan ranges,
// cooldowns, and special behaviors without digging through behavior code.
//
// To keep legacy references working, the table is also exposed as `WEAPONS`
// immediately after its declaration. Prefer referencing `WEAPON_DEFS` when
// adding new gear so the intent is clear.
const WEAPON_DEFS = {
  sword: { name:'Sword', kind:'melee', range:42, arc:1.0, dmg: 2, cooldown:550, knock:160, color:'#d0f', grip:'oneHand' },
  greatsword: { name:'Greatsword', kind:'melee', range:64, arc:1.2, dmg: 2, cooldown:820, swingDuration:320, knock:260, color:'#a3d8ff', grip:'twoHand' },
  templarianWallShield: {
    name: 'Templarian Wall Shield',
    description: 'A bulwark kite shield that interposes itself between allies and harm.',
    kind: 'shield',
    grip: 'twoHand',
    range: 32,
    arc: 0,
    dmg: 0,
    cooldown: 520,
    knock: 0,
    color: '#b3212b',
    highlightColor: '#f5d7d9',
    defenseMultiplier: 2,
    healthMultiplier: 10,
    templarianWallShield: true,
    partyDamageRedirect: true,
    shield: {
      faceColor: '#b3212b',
      trimColor: '#5a1014',
      crossColor: '#d6d6d6'
    }
  },
  sigilBlade: {
    name: 'Sigil Blade',
    description: 'A tempered blade forged to channel any glyph that is socketed into it.',
    kind: 'melee',
    grip: 'oneHand',
    range: 50,
    arc: 1.05,
    dmg: 2,
    cooldown: 600,
    swingDuration: 260,
    knock: 190,
    color: '#dfe3f5',
    glyphSocket: true
  },
  neonBlade: { name:'Neon Blade', kind:'melee', range:68, arc:1.1, dmg: 2, cooldown:640, swingDuration:260, knock:280, color:'#54f0ff', enemyOnly:true },
  voidFlameBlade: {
    name: 'Void Flame Blade',
    description: 'A blade that vents voidfire from its tip, scorching only foes in its path.',
    kind: 'melee',
    grip: 'oneHand',
    range: 66,
    arc: 1.12,
    dmg: 2,
    cooldown: 660,
    swingDuration: 260,
    knock: 250,
    color: '#b884ff',
    element: 'void',
    tipVoidFlame: true, // Enables voidfire emission from the blade tip after swings.
    voidFlameParticleCount: 7, // Number of voidfire particles spawned per attack.
    voidFlameSpread: 0.28, // Angular spread (radians) for the emitted voidfire stream.
    voidFlameIntensity: 1.05, // Intensity multiplier applied to voidfire particles.
    voidFlameSpeed: 320, // Base speed for voidfire particles.
    voidFlameSpeedVariance: 120, // Random speed variance applied to each particle.
    voidFlameOffset: 10, // Distance from the tip to emit voidfire particles.
    voidFlameGravity: -0.1 // Gravity scale applied to voidfire particles.
  },
  epochEdge: {
    name: 'Epoch Edge',
    description: 'A temporal blade whose delayed echo rewinds to strike again moments later.',
    kind: 'melee',
    grip: 'twoHand',
    range: 62,
    arc: 1.08,
    dmg: 3,
    cooldown: 640,
    swingDuration: 260,
    knock: 210,
    color: '#cfe7ff',
    highlightColor: '#f5fbff',
    timeBlade: {
      trailDelayMs: 3000, // Time the afterimage lags behind the live blade.
      trailLifeMs: 900, // Duration the delayed trail remains visible once revealed.
      trailColor: '#ffffff', // Color used for the difference-composited trail.
      trailWidthScale: 1.25, // Width multiplier for the delayed trail rendering.
      trailMaxPoints: 96, // Cap on stored trail points for the delayed echo.
      echoDelayMs: 3000, // Delay before the temporal echo repeats the swing.
      echoElement: 'chronometric', // Element applied to the delayed strike.
      echoDamageMultiplier: 1, // Multiplier applied to the delayed strike damage.
      echoRangeMultiplier: 1, // Multiplier applied to the delayed strike reach.
      echoKnockMultiplier: 1, // Multiplier applied to the delayed strike knockback.
      specialDurationMs: 3000, // Duration of the time-slowing special.
      specialCooldownMs: 15000, // Recharge time for the temporal slowdown.
      specialSlowFactor: 0.5, // Global time scale applied during the special.
      outlineColor: 'rgba(180, 220, 255, 0.55)', // Accent outline drawn atop the inverted blade.
      outlineWidthScale: 0.55, // Width scaling applied to the accent outline.
      outlineAlpha: 0.55 // Alpha for the accent outline stroke.
    }
  },
  chronoBlade: {
    name: 'Chrono Blade',
    description: 'A chronometric blade that stores each slash as an echo to rewind through foes.',
    kind: 'melee',
    grip: 'twoHand',
    range: 60,
    arc: 1.07,
    dmg: 3,
    cooldown: 620,
    swingDuration: 250,
    knock: 220,
    color: '#9fe0ff',
    highlightColor: '#e9f7ff',
    element: 'chronometric',
    timeBlade: {
      trailDelayMs: 3000, // Delay before the afterimage separates from the live blade.
      trailLifeMs: 720, // Lifetime of the trailing echo before it dissipates.
      trailColor: '#ffffff', // Color tint used for the echo trail rendering.
      trailWidthScale: 1.15, // Width multiplier applied to the trail stroke.
      trailMaxPoints: 84, // Max segments stored for the temporal trail.
      echoDelayMs: 3000, // Delay before the stored slash replays as an echo hit.
      echoElement: 'chronometric', // Element applied to the echo strike.
      echoDamageMultiplier: 0.95, // Damage scaling applied to the echo strike.
      echoRangeMultiplier: 1.05, // Reach multiplier for the delayed echo.
      echoKnockMultiplier: 1.1, // Knockback multiplier for the echo.
      specialDurationMs: 2400, // Duration of the chrono slow special ability.
      specialCooldownMs: 12000, // Cooldown between chrono slow activations.
      specialSlowFactor: 0.6, // Time scale applied while the special is active.
      outlineColor: 'rgba(159, 224, 255, 0.65)', // Accent outline drawn on the inverted blade.
      outlineWidthScale: 0.5, // Scale factor applied to the accent outline width.
      outlineAlpha: 0.65 // Alpha applied to the accent outline stroke.
    }
  },
  crumblingClaymore: {
    name: 'Crumbling Claymore',
    description: 'An enormous greatsword whose overwhelming force erodes with every foe felled.',
    kind: 'melee',
    grip: 'twoHand',
    range: 80,
    arc: 1.32,
    dmg: 5,
    cooldown: 920,
    swingDuration: 360,
    knock: 360,
    color: '#dcd4ff',
    highlightColor: '#f5f1ff',
    sheathDelayMs: 4200,
    crumbling: {
      decayPerKill: 0.12,
      minStrength: 0.35,
      minKnockMultiplier: 0.65
    }
  },
  auricDagger: {
    name: 'Auric Dagger',
    description: 'A gilded blade that coaxes bountiful spoils from vanquished foes.',
    kind: 'melee',
    grip: 'oneHand',
    range: 34,
    arc: 0.8,
    dmg: 2,
    cooldown: 480,
    swingDuration: 210,
    knock: 140,
    color: '#ffd36b',
    highlightColor: '#fff1b8',
    element: 'light',
    auric: {
      coinMultiplier: 1.75,
      bonusCoinRange: [2, 4],
      potionBonus: 0.25,
      extraPotionChance: 0.15
    }
  },
  photostigma: {
    name: 'The Photostigma',
    description: 'A singular void greatsword that crackles with lightning and erupts into umbral shrapnel on impact.',
    kind: 'melee',
    grip: 'twoHand',
    range: 78,
    arc: 1.26,
    dmg: 4,
    cooldown: 780,
    swingDuration: 320,
    knock: 320,
    color: '#b59bff',
    highlightColor: '#f2e7ff',
    element: 'void',
    slashSparkCount: 20,
    photostigma: {
      lightningCount: 3,
      lightningLength: 46,
      lightningLife: 260,
      lightningNoise: 6,
      lightningGlow: 20,
      shrapnelCount: 5,
      shrapnelSpeed: 720,
      shrapnelDamage: 3,
      shrapnelSpread: 0.9,
      shrapnelTtl: 900,
      shrapnelRadius: 4,
      shrapnelTrailColor: 'rgba(188, 160, 255, 0.55)',
      shrapnelFadeRate: 0.0026
    }
  },
  prismaticTether: {
    name: 'Prismatic Tether',
    description: 'Experimental lightline harness that blooms into radiant chains once it latches onto terrain.',
    kind: 'melee',
    grip: 'oneHand',
    range: 32,
    arc: 0.65,
    dmg: 2,
    cooldown: 780,
    swingDuration: 280,
    knock: 120,
    color: '#ffe6ff',
    experimental: true,
    lightLineExperiment: {
      primaryLength: 300, // Distance in pixels for the initial light line reach before branching.
      branchLength: 150, // Length of the first set of branching chains emitted from the anchor point.
      subBranchLength: 90, // Length of the secondary chains spawned from attached first branches.
      branchCount: 3, // Number of chains emitted from the first anchor point.
      subBranchCount: 2, // Chains emitted from each attached first branch.
      primaryWidth: 8, // Visual stroke width used for the initial tether.
      branchWidth: 5, // Width applied to the first generation of chains.
      subBranchWidth: 3, // Width for the terminal chain segments.
      damageRadius: 36, // Radius around each segment that is checked for damage against enemies.
      branchDamageMultiplier: 0.75, // Multiplier applied to weapon damage for first-generation chains.
      subBranchDamageMultiplier: 0.55, // Multiplier applied to weapon damage for second-generation chains.
      maxLifeMs: 720, // Lifetime of the rendered tether effect in milliseconds.
      hangDurationMs: 420, // Duration used when easing unattached chains into a downward droop.
      glowColor: 'rgba(80, 186, 255, 0.9)', // Glow color used for the tether rendering.
      coreColor: '#7fe1ff' // Core stroke color for the tether rendering.
    }
  },
  enemyDagger: { name:'Dagger', kind:'melee', range:30, arc:0.55, dmg: 2, cooldown:620, knock:140, color:'#f88', enemyStyle:'flopStab', flopDuration:1000, yankVelocity:520, yankLift:180 },
  epsilonFrostSigil: {
    name: 'Epsilon Frost Sigil',
    description: 'A resonant sigil that seeds glacial pillars across the battlefield.',
    kind: 'staff',
    dmg: 0,
    cooldown: 900,
    color: '#d9f3ff',
    enemyOnly: true,
    showWeapon: false,
    staff: {
      range: 360,
      minChargeToFire: 0,
      cooldown: 0
    }
  },
  necromancerZombieClaws: {
    name: 'Graveclaw Talons',
    description: 'Hastily lashed claws that rake with necrotic spite.',
    kind: 'melee',
    grip: 'oneHand',
    range: 34,
    arc: 0.85,
    dmg: 1,
    cooldown: 520,
    swingDuration: 220,
    knock: 110,
    color: '#88d3b1',
    highlightColor: '#c6f7de',
    element: 'necrotic',
    enemyOnly: true
  },
  pyreBoxingGloves: {
    name: 'Pyre Boxing Gloves',
    description: 'Charred gauntlets that vent a searing wave of flame with every punch.',
    kind: 'melee',
    grip: 'dual',
    dmg: 4,
    cooldown: 360,
    swingDuration: 210,
    knock: 180,
    color: '#ff8a45',
    highlightColor: '#ffd3a8',
    element: 'fire',
    boxingGlove: {
      // Configures punch behavior and visuals while these gloves are equipped.
      range: 58, // Base punch range before the rangeMultiplier is applied.
      rangeMultiplier: 0.72, // Multiplier passed to the melee swing to tune reach.
      arc: 1.05,
      knock: 200,
      cooldown: 340,
      duration: 220,
      damage: 16,
      damageMultiplier: 1.1,
      trailColor: '#ffbe73',
      trailAlpha: 0.82,
      trailWidth: 9,
      handRadius: 9,
      handColor: '#ff8a45',
      handHighlightColor: '#ffd9aa',
      handOutlineColor: 'rgba(90, 28, 0, 0.55)',
      auraRadius: 20,
      fireWave: {
        projectile: 'pyreWave',
        speed: 520,
        ttl: 440,
        damage: 14,
        damageMultiplier: 1,
        startRadius: 16,
        hitRadius: 18,
        growth: 180, // Units per second to expand the wave radius.
        maxRadius: 96,
        waveWidth: 48,
        waveWidthStart: 22,
        waveWidthGrowth: 160,
        waveLengthScale: 1.45,
        fadeRate: 1.4,
        color: '#ff9b50',
        edgeColor: 'rgba(255, 210, 160, 0.85)',
        igniteRadius: 42,
        offset: 18,
        ignoreTerrainCollision: true
      }
    }
  },
  singularityKnuckles: {
    name: 'Singularity Knuckles',
    description: 'Void-forged knuckles that cradle miniature black holes around each jab.',
    kind: 'melee',
    grip: 'dual',
    dmg: 6,
    cooldown: 380,
    swingDuration: 230,
    knock: 220,
    color: '#8b6dff',
    highlightColor: '#d7cbff',
    element: 'void',
    boxingGlove: {
      range: 62,
      rangeMultiplier: 0.78,
      arc: 1.12,
      knock: 240,
      cooldown: 360,
      duration: 240,
      damage: 24,
      damageMultiplier: 1.2,
      trailColor: '#c2b4ff',
      trailAlpha: 0.85,
      trailWidth: 10,
      handRadius: 9,
      handColor: '#8b6dff',
      handHighlightColor: '#d7cbff',
      handOutlineColor: 'rgba(24, 16, 48, 0.6)',
      handGlowColor: 'rgba(164, 140, 255, 0.32)',
      voidOrbit: {
        radius: 20, // Orbit radius for the swirling singularities.
        orbRadius: 6,
        count: 3,
        spin: 3.8,
        ringColor: 'rgba(168, 148, 255, 0.75)',
        orbColor: 'rgba(164, 140, 255, 0.88)',
        coreColor: 'rgba(12, 8, 24, 0.92)'
      },
      voidPunch: {
        radius: 36,
        damage: 12,
        pullRadius: 140,
        pullStrength: 1600,
        duration: 640,
        tickInterval: 0.22,
        fadeDuration: 360,
        offset: 22
      }
    }
  },
  bow: {
    name: 'Ranger Bow',
    description: 'A dependable bow that rewards a steady draw with a concussive arrow.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'arrow',
    dmg: 2,
    speed: 420,
    gravity: true,
    cooldown: 820,
    color: '#6bd1ff',
    projectileColor: '#f0fbff',
    knock: 140,
    charge: {
      minMs: 200,
      maxMs: 950,
      minSpeed: 360,
      maxSpeed: 900,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 140,
      maxKnock: 280,
      ttlBonus: 620,
      barColor: 'rgba(107, 209, 255, 0.8)',
      special: { type: 'burst', radius: 64, damage:  2, trailColor: 'rgba(150,220,255,0.7)' }
    }
  },
  emberBow: {
    name: 'Ember Bow',
    description: 'Ignites arrows at full draw, searing targets and nearby foes.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'arrow',
    dmg: 2,
    speed: 440,
    gravity: true,
    cooldown: 840,
    color: '#ff875c',
    projectileColor: '#ffe6c6',
    element: 'fire',
    knock: 150,
    charge: {
      minMs: 220,
      maxMs: 1020,
      minSpeed: 360,
      maxSpeed: 940,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 150,
      maxKnock: 300,
      ttlBonus: 700,
      barColor: 'rgba(255, 135, 92, 0.82)',
      special: { type: 'ignite', radius: 72, igniteDamage: 2, trailColor: 'rgba(255,180,120,0.65)' }
    }
  },
  frostBow: {
    name: 'Frost Bow',
    description: 'Freezes the string at full draw, chilling targets on impact.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'arrow',
    dmg: 2,
    speed: 420,
    gravity: true,
    cooldown: 830,
    color: '#7be1ff',
    projectileColor: '#e4fbff',
    element: 'ice',
    knock: 140,
    charge: {
      minMs: 200,
      maxMs: 980,
      minSpeed: 340,
      maxSpeed: 880,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 130,
      maxKnock: 260,
      ttlBonus: 600,
      barColor: 'rgba(123, 225, 255, 0.8)',
      special: { type: 'slow', slowMultiplier: 0.45, slowDuration: 2000, trailColor: 'rgba(190,245,255,0.8)' }
    }
  },
  tempestBow: {
    name: 'Tempest Bow',
    description: 'Channels a storm burst that splits into a volley when fully charged.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'arrow',
    dmg: 2,
    speed: 430,
    gravity: true,
    cooldown: 860,
    color: '#c5a9ff',
    projectileColor: '#f2e9ff',
    knock: 130,
    charge: {
      minMs: 220,
      maxMs: 1050,
      minSpeed: 360,
      maxSpeed: 900,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 130,
      maxKnock: 260,
      ttlBonus: 660,
      barColor: 'rgba(197, 169, 255, 0.78)',
      special: { type: 'volley', count: 2, spread: 0.12, trailColor: 'rgba(197,169,255,0.6)' }
    }
  },
  glyphChakram: {
    name: 'Glyph Chakram',
    description: 'A balanced returning blade that can hold a glyph sigil at its heart.',
    kind: 'throw',
    projectile: 'chakram',
    dmg: 2,
    speed: 640,
    gravity: false,
    cooldown: 560,
    color: '#d9e4f4',
    spin: true,
    knock: 140,
    glyphSocket: true,
    ttl: 2200,
    projectileMaxBounces: 2,
    projectileBounce: 0.8
  },
  glyphCarbine: {
    name: 'Glyph Carbine',
    description: 'A configurable sigil frame whose shots inherit the etched glyph.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'bullet',
    dmg: 2,
    projectileDamage: 2,
    speed: 780,
    gravity: false,
    cooldown: 360,
    color: '#dee3f7',
    projectileColor: '#f5f7ff',
    projectileTrailColor: 'rgba(210, 220, 255, 0.5)',
    knock: 110,
    bulletCount: 10,
    reloadMs: 1700,
    fastReloadMs: 480,
    ttl: 1200,
    projectileRadius: 4.5,
    glyphSocket: true,
    ammoColor: '#d4daf4'
  },
  glyphLongbow: {
    name: 'Glyph Longbow',
    description: 'Arc-lined limbs translate any socketed glyph into resonant arrows.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'arrow',
    dmg: 2,
    speed: 430,
    gravity: true,
    cooldown: 800,
    color: '#d7e6ff',
    projectileColor: '#f0f6ff',
    knock: 150,
    glyphSocket: true,
    charge: {
      minMs: 200,
      maxMs: 960,
      minSpeed: 360,
      maxSpeed: 940,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 150,
      maxKnock: 300,
      ttlBonus: 680,
      barColor: 'rgba(215, 230, 255, 0.82)',
      special: { type: 'burst', radius: 58, damage:  2, trailColor: 'rgba(210,225,255,0.65)' }
    }
  },
  soulbinderPrimer: {
    name: 'Soulbinder Primer',
    description: 'A slender tome that calls meek wisps and hoards fallen souls for potent familiars.',
    kind: 'summoner',
    grip: 'twoHand',
    color: '#cbb6ff',
    bookTrimColor: '#f8efff',
    bookPageColor: '#fdf8ff',
    bookRuneColor: '#8b7bd6',
    cooldown: 760,
    castDuration: 360,
    summonRadius: 18,
    summonDamage: 2,
    summonColor: '#b7f5ff',
    soulColor: '#dfc9ff',
    guardianColor: '#f6baff',
    guardianBaseDamage: 2,
    guardianRadius: 32,
    soulRange: 280,
    maxSouls: 6,
    empowerCooldown: 3600,
    maxActiveSummons: 3
  },
  quillAviary: {
    name: 'Quill Aviary',
    description: 'Sketches quick ink birds that peck foes apart while its pages flutter with stray feathers.',
    kind: 'summoner',
    grip: 'twoHand',
    color: '#ffe2c4',
    bookTrimColor: '#fff6e8',
    bookPageColor: '#fffdf6',
    bookRuneColor: '#d47932',
    cooldown: 540,
    castDuration: 300,
    summonForm: 'bird',
    summonRadius: 14,
    summonDamage: 2,
    summonCharges: 5,
    summonLifetime: 16000,
    summonSpeed: 600,
    summonClimbLift: 760,
    summonJumpStrength: 1020,
    summonKnockScale: 0.55,
    summonHitBurstScale: 0.5,
    summonAimAssistRadius: 190,
    soulColor: '#ffe3c9',
    guardianColor: '#ffd4b3',
    guardianBaseDamage: 2,
    guardianRadius: 30,
    maxSouls: 5,
    empowerCooldown: 3600,
    birdLineColor: '#fff6ea',
    birdAccentColor: '#ffc67a',
    maxActiveSummons: 4
  },
  apiaryLexicon: {
    name: 'Apiary Lexicon',
    description: 'Unfurls buzzing bee spirits that hound foes like a living swarm straight from a hive.',
    kind: 'summoner',
    grip: 'twoHand',
    color: '#ffe07a',
    bookTrimColor: '#fff6c8',
    bookPageColor: '#fffbe6',
    bookRuneColor: '#d79b1a',
    cooldown: 520,
    castDuration: 280,
    summonForm: 'bee',
    summonRadius: 10,
    summonDamage: 2,
    summonCharges: 4,
    summonLifetime: 16000,
    summonSpeed: 680,
    summonMaxSpeed: 840,
    summonTurnRate: 11,
    summonSeekForce: 1760,
    summonDrag: 0.18,
    summonBounce: 0.8,
    soulColor: '#ffeaa0',
    guardianColor: '#ffe17c',
    guardianBaseDamage: 2,
    guardianRadius: 28,
    maxSouls: 6,
    empowerCooldown: 3600,
    maxActiveSummons: 20
  },
  silkboundLexicon: {
    name: 'Silkbound Lexicon',
    description: 'A stitched folio that slips out nimble spiderlings woven from gentle soul-silk.',
    kind: 'summoner',
    grip: 'twoHand',
    color: '#d2f6ec',
    element: 'necrotic',
    bookTrimColor: '#f2fff9',
    bookPageColor: '#ffffff',
    bookRuneColor: '#3f6e5c',
    cooldown: 620,
    castDuration: 320,
    summonForm: 'spider',
    summonRadius: 16,
    summonDamage: 2,
    summonLifetime: 18000,
    summonSpeed: 420,
    summonClimbLift: 700,
    summonJumpStrength: 940,
    summonKnockScale: 0.9,
    summonHitBurstScale: 0.65,
    summonCharges: 4,
    summonColor: '#c8f7e8',
    summonAccentColor: '#8fd6c2', // Accent fill for spider familiar bodies.
    spiderLegColor: '#3f5a52', // Stroke color applied to spider familiar legs.
    spiderEyeColor: '#f3fffb', // Eye highlight color for spider familiars.
    soulColor: '#d3f1eb',
    guardianColor: '#c5f1e6',
    guardianBaseDamage: 2,
    guardianRadius: 30,
    maxSouls: 5,
    empowerCooldown: 3600,
    maxActiveSummons: 3
  },
  silkspinnerCarbine: {
    name: 'Silkspinner Carbine',
    description: 'Launches bound spiderlings that scuttle forward until they bite into the first foe they meet.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'spiderCrawler',
    dmg: 2,
    speed: 280,
    gravity: false,
    cooldown: 780,
    color: '#c9f7eb',
    element: 'necrotic',
    projectileColor: '#c9f7eb',
    knock: 90,
    bulletCount: 4,
    reloadMs: 2100,
    fastReloadMs: 780,
    ammoColor: '#bdece0',
    summonRadius: 16,
    summonDamage: 2,
    summonLifetime: 18000,
    summonSpeed: 380,
    summonClimbLift: 700,
    summonJumpStrength: 920,
    summonColor: '#c8f7e8',
    summonAccentColor: '#8fd6c2',
    spiderLegColor: '#3f5a52',
    spiderEyeColor: '#f3fffb',
    summonHitBurstScale: 0.65,
    spiderLaunchSpeed: 240,
    spiderLaunchLift: 160,
    spiderMarchForce: 360,
    spiderMarchHopForce: 600,
    spiderMarchLift: 720
  },
  glyphConduit: {
    name: 'Glyph Conduit',
    description: 'A staff lattice ready to channel whatever glyph sigil is socketed.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#e0d9ff',
    glyphSocket: true,
    staff: {
      range: 380,
      maxCharge: 1,
      minChargeToFire: 0.1,
      regenPerSecond: 0.36,
      drainPerSecond: 0.52,
      damagePerSecond: 2,
      beamColor: '#ede7ff',
      beamGlow: 'rgba(220, 210, 255, 0.55)',
      beamWidth: 11,
      beamRadius: 15,
      gemColor: '#f4efff',
      shaftLength: 58,
      shaftWidth: 5.2,
      barColor: 'rgba(208, 200, 255, 0.78)',
      particleInterval: 90,
      stopOnObjects: true,
      bounces: 0
    }
  },
  glyphSpear: {
    name: 'Glyph Spear',
    description: 'A balanced spear whose socketed glyph alters the tip’s resonance.',
    kind: 'melee',
    grip: 'twoHand',
    range: 62,
    arc: 1.05,
    dmg: 2,
    cooldown: 640,
    swingDuration: 260,
    knock: 230,
    color: '#d0e7ff',
    glyphSocket: true
  },
  glyphPartisan: {
    name: 'Glyph Partisan',
    description: 'Heavy polearm with etched flanges that echo the slotted glyph.',
    kind: 'melee',
    grip: 'twoHand',
    range: 68,
    arc: 1.18,
    dmg: 2,
    cooldown: 760,
    swingDuration: 300,
    knock: 260,
    color: '#ccdff5',
    glyphSocket: true,
    slashWaveCount: 1,
    slashWaveDamage: 2,
    slashWaveSpeed: 700,
    slashWaveTtl: 520,
    slashWaveFade: 0.9,
    slashWaveColor: 'rgba(210, 226, 250, 0.85)',
    slashWaveProjectile: 'bolt'
  },
  glyphSpiritCrown: {
    name: 'Glyph Spirit Crown',
    description: 'Summons spectral sigils that weave glyph energy into orbiting wisps.',
    kind: 'spirit',
    projectile: 'spiritOrb',
    dmg: 2,
    speed: 780,
    gravity: false,
    cooldown: 0,
    color: '#d5f1ff',
    orbColor: '#f0fbff',
    orbTrailColor: 'rgba(205, 235, 255, 0.65)',
    orbitRadius: 34,
    orbitSpeed: 1,
    orbCount: 3,
    orbRegenMs: 1400,
    orbRadius: 8,
    glyphSocket: true,
    knock: 120
  },
  refractionRecurve: {
    name: 'Refraction Recurve',
    description: 'Condenses captured light into a razor beam that widens as the draw deepens.',
    kind: 'bow',
    grip: 'twoHand',
    projectile: 'refractionBeam',
    dmg: 2,
    speed: 860,
    gravity: false,
    cooldown: 960,
    color: '#fff4b8',
    element: 'light',
    lightEmitterRadius: 420,
    projectileColor: '#fffbe6',
    knock: 160,
    charge: {
      minMs: 0,
      maxMs: 20000,
      minSpeed: 600,
      maxSpeed: 820,
      minDamage: 2,
      maxDamage: 2,
      minKnock: 140,
      maxKnock: 320,
      ttlBonus: 0,
      barColor: 'rgba(255, 246, 196, 0.85)',
      special: {
        type: 'refractionBeam',
        minWidth: 8,
        maxWidth: 44,
        minLength: 220,
        ttl: 220,
        originOffset: 28,
        coreColor: 'rgba(255, 255, 240, 0.95)',
        edgeColor: 'rgba(255, 236, 180, 0.55)',
        glowColor: 'rgba(255, 255, 200, 0.3)'
      }
    }
  },
  emberPistol: {
    name: 'Ember Pistol',
    description: 'Launches incendiary rounds that erupt into brief firebursts on impact.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'fireBullet',
    dmg: 2,
    projectileDamage: 2,
    speed: 760,
    gravity: false,
    cooldown: 420,
    color: '#ff8a4b',
    projectileColor: '#ffd9b0',
    projectileTrailColor: 'rgba(255, 184, 120, 0.55)',
    knock: 140,
    bulletCount: 6,
    reloadMs: 2000,
    fastReloadMs: 500,
    ttl: 1300,
    projectileRadius: 5,
    igniteRadius: 42,
    ammoColor: '#ffbe73',
    element: 'fire'
  },
  glyphRepeater: {
    name: 'Glyph Repeater',
    description: 'A precision frame awaiting glyph etching. Its neutral rounds inherit the glyph’s affinity.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'bullet',
    dmg: 2,
    projectileDamage: 2,
    speed: 780,
    gravity: false,
    cooldown: 420,
    color: '#d4d9e6',
    projectileColor: '#f5f6fb',
    knock: 120,
    bulletCount: 8,
    reloadMs: 1900,
    fastReloadMs: 520,
    ttl: 1400,
    projectileRadius: 5,
    glyphSocket: true,
    ammoColor: '#d9def0'
  },
  apiaryBlaster: {
    name: 'Apiary Blaster',
    description: 'Hives twin bee drones with every shot that harry foes and ricochet off terrain.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'beeDrone',
    dmg: 2,
    projectileDamage: 2,
    speed: 720,
    gravity: false,
    cooldown: 520,
    color: '#ffe16d',
    projectileColor: '#fff6b8',
    knock: 90,
    bulletCount: 6,
    reloadMs: 2000,
    fastReloadMs: 500,
    ttl: 5000,
    burstCount: 2,
    spread: 0.18,
    projectileRadius: 3,
    projectileMaxSpeed: 840,
    projectileTurnRate: 11,
    projectileBounce: 0.8,
    projectileHoming: true,
    projectileSeekForce: 1760,
    projectileDrag: 0.18,
    ammoColor: '#ffeaa0'
  },
  sanguineRepeater: {
    name: 'Sanguine Repeater',
    description: 'Experimental rounds siphon vitality, returning a trickle of health on every hit.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'siphonBullet',
    dmg: 2,
    projectileDamage: 2,
    speed: 700,
    gravity: false,
    cooldown: 460,
    color: '#c867ff',
    projectileColor: '#f4d3ff',
    projectileTrailColor: 'rgba(214, 120, 255, 0.55)',
    element: 'life',
    knock: 120,
    bulletCount: 6,
    reloadMs: 2000,
    fastReloadMs: 500,
    ttl: 1400,
    projectileRadius: 5,
    ammoColor: '#dba3ff',
    lifeStealPercent: 0.02
  },
  sniperRifle: {
    name: 'Sniper Rifle',
    description: 'A precision rifle that rewards perfect center hits with devastating power.',
    kind: 'gun',
    grip: 'twoHand',
    projectile: 'sniperRound',
    range: 96,
    dmg: 2,
    projectileDamage: 2,
    speed: 1260,
    gravity: false,
    cooldown: 1200,
    color: '#9fb6ff',
    projectileColor: '#f7fbff',
    projectileTrailColor: 'rgba(255, 110, 110, 0.42)',
    projectileTipColor: '#ff5c5c',
    projectileLength: 28,
    knock: 220,
    bulletCount: 2,
    reloadMs: 16000,
    fastReloadMs: 16000,
    ttl: 2800,
    projectileRadius: 4,
    ammoColor: '#eff2ff',
    scopeColor: '#ffe066',
    gunPose: {
      baseLift: -26,
      gripForward: 24,
      gripPerp: -8,
      gripElbowBack: 12,
      gripElbowPerp: -6,
      supportForward: 58,
      supportPerp: -4,
      supportLift: -4,
      supportElbowBack: 18,
      supportElbowPerp: -2,
      holdMs: 520
    }
  },
  wand:  { name:'Wand', kind:'magic', projectile:'bolt', dmg: 2, speed:720, gravity:false, cooldown:700, color:'#ffd36b', knock:90, grip:'oneHand' },
  emberStaff: {
    name: 'Ember Staff',
    description: 'Channels a blazing beam from its ruby focus that sears anything in its path.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#ff6c47',
    element: 'fire',
    staff: {
      range: 360,
      maxCharge: 1,
      minChargeToFire: 0.15,
      regenPerSecond: 0.3,
      drainPerSecond: 0.55,
      damagePerSecond: 2,
      beamColor: '#ff8054',
      beamGlow: 'rgba(255, 130, 76, 0.55)',
      beamWidth: 12,
      beamRadius: 16,
      gemColor: '#ffbb7c',
      shaftLength: 58,
      shaftWidth: 5.5,
      barColor: 'rgba(255, 138, 92, 0.82)',
      particleInterval: 80,
      stopOnObjects: true,
      bounces: 0,
      element: 'fire'
    }
  },
  prismStaff: {
    name: 'Prism Staff',
    description: 'Bends arcane light into a piercing beam that ricochets once off solid walls.',
    kind: 'staff',
    color: '#b28cff',
    element: 'light',
    staff: {
      range: 420,
      maxCharge: 1,
      minChargeToFire: 0.12,
      regenPerSecond: 0.34,
      drainPerSecond: 0.5,
      damagePerSecond: 2,
      beamColor: '#d1a9ff',
      beamGlow: 'rgba(193, 150, 255, 0.6)',
      beamWidth: 10,
      beamRadius: 14,
      gemColor: '#d9bcff',
      shaftLength: 60,
      shaftWidth: 5,
      barColor: 'rgba(209, 169, 255, 0.78)',
      particleInterval: 110,
      stopOnObjects: true,
      bounces: 1,
      element: 'light'
    }
  },
  warChantStaff: {
    name: 'War Chant Stave',
    description: 'Resonates with a martial hymn that emboldens nearby allies with empowered strikes.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#ff5c4d',
    element: 'physical',
    staff: {
      maxCharge: 1,
      minChargeToFire: 0.1,
      regenPerSecond: 0.32,
      drainPerSecond: 0.52,
      gemColor: '#ffb6aa',
      beamGlow: 'rgba(255, 108, 96, 0.58)',
      shaftLength: 58,
      shaftWidth: 5.1,
      barColor: 'rgba(255, 108, 96, 0.72)',
      aura: {
        radius: 220,
        color: 'rgba(255, 96, 88, 0.2)',
        swirlColor: 'rgba(255, 150, 140, 0.6)',
        attackMultiplier: 1.5,
        target: 'allies',
        includeSelf: true,
        swirlSpeed: 0.85,
        persistMs: 260
      }
    }
  },
  bulwarkStaff: {
    name: 'Bulwark Stave',
    description: 'Projects a tranquil ward that steels allies against incoming blows.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#4da4ff',
    element: 'water',
    staff: {
      maxCharge: 1,
      minChargeToFire: 0.1,
      regenPerSecond: 0.34,
      drainPerSecond: 0.52,
      gemColor: '#a8d8ff',
      beamGlow: 'rgba(96, 168, 255, 0.55)',
      shaftLength: 59,
      shaftWidth: 5,
      barColor: 'rgba(96, 168, 255, 0.72)',
      aura: {
        radius: 220,
        color: 'rgba(96, 168, 255, 0.22)',
        swirlColor: 'rgba(160, 210, 255, 0.6)',
        defenseMultiplier: 1.5,
        target: 'allies',
        includeSelf: true,
        swirlSpeed: 0.75,
        persistMs: 260
      }
    }
  },
  aegisStaff: {
    name: 'Aegis Stave',
    description: 'Condenses a shimmering ward that intercepts hostile projectiles for nearby allies.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#5fb7ff',
    element: 'water',
    staff: {
      maxCharge: 1,
      minChargeToFire: 0.12,
      regenPerSecond: 0.32,
      drainPerSecond: 0.55,
      gemColor: '#bfe7ff',
      beamGlow: 'rgba(115, 190, 255, 0.58)',
      shaftLength: 58,
      shaftWidth: 5,
      barColor: 'rgba(115, 190, 255, 0.74)',
      aura: {
        radius: 110,
        color: 'rgba(115, 190, 255, 0.24)',
        swirlColor: 'rgba(180, 230, 255, 0.65)',
        target: 'allies',
        includeSelf: true,
        swirlSpeed: 0.82,
        persistMs: 260,
        projectileShield: {
          maxHpFactor: 2,
          regenPercent: 0.05,
          color: 'rgba(160, 220, 255, 0.35)',
          outlineColor: 'rgba(70, 130, 190, 0.82)',
          hitColor: 'rgba(220, 245, 255, 0.9)',
          minRadius: 44
        }
      }
    }
  },
  verdantStaff: {
    name: 'Verdant Stave',
    description: 'Bathes allies in renewing light that doubles their vitality for as long as it is upheld.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#4cd17a',
    element: 'earth',
    staff: {
      maxCharge: 1,
      minChargeToFire: 0.12,
      regenPerSecond: 0.3,
      drainPerSecond: 0.5,
      gemColor: '#9cf0b9',
      beamGlow: 'rgba(92, 214, 136, 0.55)',
      shaftLength: 60,
      shaftWidth: 5.2,
      barColor: 'rgba(92, 214, 136, 0.7)',
      aura: {
        radius: 230,
        color: 'rgba(92, 214, 136, 0.2)',
        swirlColor: 'rgba(160, 236, 190, 0.55)',
        healthMultiplier: 2,
        target: 'allies',
        includeSelf: true,
        swirlSpeed: 0.68,
        persistMs: 260
      }
    }
  },
  gravebindStaff: {
    name: 'Gravebind Stave',
    description: 'Suffuses the battlefield with necrotic whispers that bend fallen foes into fleeting thralls.',
    kind: 'staff',
    grip: 'twoHand',
    color: '#7d5cff',
    element: 'necrotic',
    staff: {
      maxCharge: 1,
      minChargeToFire: 0.1,
      regenPerSecond: 0.28,
      drainPerSecond: 0.54,
      gemColor: '#c7b8ff',
      beamGlow: 'rgba(140, 104, 255, 0.6)',
      shaftLength: 60,
      shaftWidth: 5,
      barColor: 'rgba(140, 104, 255, 0.72)',
      aura: {
        radius: 240,
        color: 'rgba(140, 104, 255, 0.22)',
        swirlColor: 'rgba(136, 255, 196, 0.6)',
        target: 'enemies',
        includeSelf: false,
        swirlSpeed: 0.78,
        persistMs: 260,
        raiseOnDeath: {
          lifetimeMs: 15000,
          damageMultiplier: 1,
          defenseMultiplier: 1,
          healthMultiplier: 1,
          scale: 0.7
        }
      }
    }
  },
  spiritBand: {
    name: 'Spirit Band',
    description: 'Summons spectral spheres that orbit above you and launch on command.',
    kind: 'spirit',
    projectile: 'spiritOrb',
    dmg: 2,
    speed: 780,
    gravity: false,
    cooldown: 0,
    color: '#bfe8ff',
    orbColor: '#dff7ff',
    orbTrailColor: 'rgba(191, 232, 255, 0.6)',
    orbitRadius: 34,
    orbitSpeed: 0.9,
    orbRegenMs: 1500,
    orbRadius: 8.5,
    knock: 120
  },
  spiritBloom: {
    name: 'Spirit Bloom',
    description: 'Nurtured motes erupt into pollen clouds that slow any foe they brush against.',
    kind: 'spirit',
    projectile: 'spiritOrb',
    dmg: 2,
    speed: 760,
    gravity: false,
    cooldown: 0,
    color: '#d8ffd0',
    orbColor: '#f2ffe8',
    orbTrailColor: 'rgba(210, 255, 210, 0.6)',
    orbitRadius: 36,
    orbitSpeed: 1.05,
    orbCount: 3,
    orbRegenMs: 1500,
    orbRadius: 8.5,
    knock: 110,
    blastRadius: 110,
    blastDamage: 2,
    projectileOnExpire: spawnSpiritBloomCloud
  },
  tempestHalo: {
    name: 'Tempest Halo',
    description: 'A swirling corona of wisps that crash down in gusting shockwaves.',
    kind: 'spirit',
    projectile: 'spiritOrb',
    dmg: 2,
    speed: 800,
    gravity: false,
    cooldown: 0,
    color: '#bfeaff',
    orbColor: '#e5fbff',
    orbTrailColor: 'rgba(191, 240, 255, 0.6)',
    orbitRadius: 38,
    orbitSpeed: 1.1,
    orbCount: 5,
    orbRegenMs: 1700,
    orbRadius: 9,
    knock: 130,
    blastRadius: 120,
    blastDamage: 2,
    projectileOnExpire: spawnTempestHaloBurst,
    projectileBounce: 0.82
  },
  dagger:{ name:'Dagger', kind:'throw', projectile:'knife', dmg: 2, speed:650, gravity:true, cooldown:500, color:'#f66', spin:true, knock:120 },
  spear: {
    name:'Spear',
    kind:'melee',
    range:54,
    arc:0.9,
    dmg: 2,
    cooldown:640,
    knock:220,
    color:'#7ac7ff',
    poseStyle: 'spear',
    spearPose: {
      baseLift: -18,
      frontForward: 64,
      backForward: 34,
      frontPerp: -9,
      backPerp: 7,
      frontElbowBack: 28,
      backElbowBack: 20,
      frontElbowPerp: 8,
      backElbowPerp: 6,
      elbowLift: -12,
      restBlend: 0.7,
      elbowBlend: 0.68,
      thrustForward: 22,
      thrustBack: 12
    },
    thrustDuration: 220,
    thrustArc: 0.55,
    thrustRangeMultiplier: 1.22,
    thrustDamageMultiplier: 1.05,
    thrustKnockMultiplier: 1.08
  },
  firebolt:{ name:'Firebolt', kind:'magic', projectile:'ember', dmg: 2, speed:780, gravity:false, cooldown:720, color:'#ff784f', knock:100, element:'fire' },
  bomb:  { name:'Bomb', kind:'throw', projectile:'bomb', dmg: 2, speed:420, gravity:true, cooldown:1200, color:'#ffb347', element:'explosive', spin:true, blastRadius:140, blastDamage: 2, ttl:2600 },
  bodySlam: { name:'Body Slam', kind:'melee', range:48, arc:1.1, dmg: 2, cooldown:760, knock:240, color:'#f2c56d', enemyOnly:true },
  sandPuff: {
    name: 'Sand Puff',
    description: 'Compressed dune sand launched in playful clumps that crumble into the terrain.',
    kind: 'magic',
    projectile: 'sandClump',
    dmg: 2,
    projectileDamage: 2,
    projectileHarmless: true,
    projectileSandPayload: { count: 8, spreadX: 28, spreadY: 20 },
    speed: 360,
    gravity: true,
    cooldown: 920,
    color: '#d4c089',
    projectileFadeRate: 0.18,
    enemyOnly: true
  },
  petalSaber: {
    name: 'Petal Saber',
    description: 'Verdant blade that cleaves in sweeping arcs, scattering pollen bursts on impact.',
    kind: 'melee',
    range: 58,
    arc: 1.15,
    dmg: 2,
    cooldown: 720,
    swingDuration: 260,
    knock: 230,
    color: '#8df2b8',
    slashWaveCount: 2,
    slashWaveSpread: 0.28,
    slashWaveDamage: 2,
    slashWaveSpeed: 780,
    slashWaveTtl: 660,
    slashWaveFade: 0.9,
    slashWaveColor: '#bfffd4',
    slashWaveProjectile: 'petalArc',
    slashWaveOnExpire: spawnPetalSaberAftershock,
    enemyOnly: true
  },
  seedVolley: {
    name: 'Seed Volley',
    description: 'Launches seed pods that bloom into slowing pollen clouds on detonation.',
    kind: 'magic',
    projectile: 'seedPod',
    dmg: 2,
    projectileDamage: 2,
    speed: 420,
    gravity: true,
    cooldown: 920,
    color: '#b4f59c',
    burstCount: 3,
    spread: 0.26,
    projectileOnExpire: spawnSeedVolleyPollen,
    enemyOnly: true
  },
  windSpindle: {
    name: 'Wind Spindle',
    description: 'Spins concentrated gust orbs that shove intruders off the skyways.',
    kind: 'magic',
    projectile: 'gustOrb',
    dmg: 2,
    projectileDamage: 2,
    speed: 520,
    gravity: false,
    cooldown: 780,
    color: '#9be8ff',
    projectileTrailColor: 'rgba(155, 232, 255, 0.55)',
    driftAmplitude: 22,
    driftFrequency: 2.6,
    projectilePushRadius: 140,
    projectilePushForce: 1400,
    projectileOnExpire: spawnWindSpindleBurst,
    enemyOnly: true
  },
  pressureLance: {
    name: 'Pressure Lance',
    description: 'Fires piercing torrents that erupt into upward geysers on contact.',
    kind: 'magic',
    projectile: 'pressureBolt',
    dmg: 2,
    projectileDamage: 2,
    speed: 620,
    gravity: false,
    cooldown: 820,
    color: '#6ecbff',
    burstCount: 2,
    spread: 0.12,
    projectilePushRadius: 110,
    projectilePushForce: 900,
    projectileLiftRadius: 120,
    projectileLiftForce: 1600,
    projectileOnExpire: spawnPressureLanceBurst,
    enemyOnly: true
  },
  ventMine: {
    name: 'Vent Mine',
    description: 'Drops simmering pressure cores that burst into scalding steam vents.',
    kind: 'magic',
    projectile: 'steamMine',
    dmg: 2,
    projectileDamage: 2,
    speed: 220,
    gravity: true,
    cooldown: 1100,
    color: '#7fe1ff',
    element: 'explosive',
    ttl: 3600,
    blastRadius: 140,
    blastDamage: 2,
    projectileOnExpire: spawnVentMineBurst,
    enemyOnly: true
  },
  anchorFlail: {
    name: 'Anchor Flail',
    description: 'Weighted chain that sweeps wide and shreds foes with cascading bubbles.',
    kind: 'melee',
    range: 66,
    arc: 1.28,
    dmg: 2,
    cooldown: 820,
    swingDuration: 300,
    knock: 260,
    color: '#8bd0ff',
    slashWaveCount: 2,
    slashWaveSpread: 0.2,
    slashWaveDamage: 2,
    slashWaveSpeed: 740,
    slashWaveTtl: 600,
    slashWaveFade: 0.88,
    slashWaveColor: '#c4f1ff',
    slashWaveProjectile: 'bubbleSaw',
    slashWaveOnExpire: spawnAnchorFlailFoam,
    enemyOnly: true
  },
  chronoglassStaff: {
    name: 'Chronoglass Staff',
    description: 'Shatters mirrored shards that fracture time around their impact.',
    kind: 'magic',
    projectile: 'chronoglassShard',
    dmg: 2,
    projectileDamage: 2,
    speed: 640,
    gravity: false,
    cooldown: 860,
    color: '#ffd27a',
    element: 'chronometric',
    burstCount: 2,
    spread: 0.18,
    projectileOnExpire: spawnChronoglassField,
    slowMultiplier: 0.6,
    slowDuration: 2200,
    enemyOnly: true
  },
  mirageGlaive: {
    name: 'Mirage Glaive',
    description: 'Sweeping polearm that leaves echo crescents which rebound through foes.',
    kind: 'melee',
    range: 64,
    arc: 1.22,
    dmg: 2,
    cooldown: 760,
    swingDuration: 280,
    knock: 240,
    color: '#f7c978',
    element: 'chronometric',
    slashWaveCount: 3,
    slashWaveSpread: 0.22,
    slashWaveDamage: 2,
    slashWaveSpeed: 760,
    slashWaveTtl: 640,
    slashWaveFade: 0.92,
    slashWaveColor: '#ffe3b4',
    slashWaveProjectile: 'chronoglassShard',
    slashWaveOnExpire: spawnChronoglassField,
    enemyOnly: true
  },
  echoRepeater: {
    name: 'Echo Repeater',
    description: 'Hurls mirrored discs that ricochet back to their caster.',
    kind: 'throw',
    projectile: 'echoDisc',
    dmg: 2,
    projectileDamage: 2,
    speed: 600,
    gravity: false,
    cooldown: 780,
    color: '#ffd98f',
    element: 'chronometric',
    spin: true,
    projectileReturnSpeed: 660,
    projectileOnExpire: spawnEchoDiscReturn,
    enemyOnly: true
  },
  toonBrush: {
    name: 'Toon Brush',
    description: 'Animated paintbrush that whips ink swaths and splashes cartoon shockwaves.',
    kind: 'melee',
    range: 60,
    arc: 1.18,
    dmg: 2,
    cooldown: 680,
    swingDuration: 260,
    knock: 250,
    color: '#ffb36b',
    slashWaveCount: 3,
    slashWaveSpread: 0.26,
    slashWaveDamage: 2,
    slashWaveSpeed: 820,
    slashWaveTtl: 640,
    slashWaveFade: 0.88,
    slashWaveColor: '#ffdca6',
    slashWaveProjectile: 'inkSwipe',
    slashWaveOnExpire: spawnInkSlashSplash,
    enemyOnly: true
  },
  testEmberStaff: {
    name: 'test Ember Staff',
    description: 'Prototype focus that hurls crackling fire cores which erupt in a short-radius blast.',
    kind: 'magic',
    projectile: 'ember',
    dmg: 2,
    speed: 720,
    gravity: false,
    cooldown: 780,
    color: '#ff6a3c',
    knock: 120,
    ttl: 2600,
    blastRadius: 110,
    blastDamage: 2,
    element: 'fire'
  },
  testStormChakram: {
    name: 'test Storm Chakram',
    description: 'Experimental returning blade that sails in an energized arc and batters targets mid-flight.',
    kind: 'throw',
    projectile: 'chakram',
    dmg: 2,
    speed: 660,
    gravity: false,
    cooldown: 540,
    color: '#6bd7ff',
    spin: true,
    knock: 150,
    ttl: 2400,
    projectileMaxBounces: 3,
    projectileBounce: 0.78
  },
  testEmberBlade: {
    name: 'test Ember Blade',
    description: 'Prototype flame greatblade that cleaves forward and sheds searing waves of heat.',
    kind: 'melee',
    range: 60,
    arc: 1.2,
    dmg: 2,
    cooldown: 680,
    swingDuration: 260,
    knock: 240,
    color: '#ff5a36',
    slashWaveCount: 2,
    slashWaveSpread: 0.24,
    slashWaveSpeed: 820,
    slashWaveDamage: 2,
    slashWaveTtl: 620,
    slashWaveFade: 1.15,
    slashWaveColor: '#ffb36b',
    slashSparkCount: 18,
    element: 'fire'
  },
  testSolarFusillade: {
    name: 'test Solar Fusillade',
    description: 'Prototype sunstaff that bursts three radiant lances in a wide spray to punish clustered foes.',
    kind: 'magic',
    projectile: 'sunlance',
    dmg: 2,
    speed: 820,
    gravity: false,
    cooldown: 840,
    color: '#ffd36b',
    element: 'light',
    knock: 110,
    ttl: 2200,
    burstCount: 3,
    spread: 0.26
  },
  phiSolarSigil: {
    name: 'Phi Solar Sigil',
    description: 'An ancient sigil that floods the arena with radiant lances and blinding light.',
    kind: 'magic',
    projectile: 'sunlance',
    dmg: 32,
    speed: 880,
    gravity: false,
    cooldown: 320,
    color: '#ffdba3',
    element: 'light',
    knock: 140,
    ttl: 2000,
    burstCount: 5,
    spread: 0.22,
    enemyOnly: true,
    showWeapon: false,
    lightEmitterRadius: 520
  },
  mirageEdge: {
    name: 'Mirage Edge',
    description: 'A mirage-honed dagger that unleashes razor-straight shockwaves with each swipe.',
    kind: 'magic',
    projectile: 'mirageSlash',
    dmg: 52,
    speed: 0,
    gravity: false,
    cooldown: 340,
    color: '#f5f0ff',
    element: 'void',
    knock: 180,
    ttl: 220,
    enemyOnly: true,
    showWeapon: false,
    beamCoreColor: '#fef7ff',
    beamEdgeColor: 'rgba(196, 140, 255, 0.45)',
    beamGlowColor: 'rgba(48, 16, 72, 0.35)'
  },
  voidHalo: {
    name: 'Void Halo',
    description: 'A glyphic halo that spins miniature singularities before launching them at intruders.',
    kind: 'magic',
    projectile: 'voidGlyphOrb',
    dmg: 28,
    speed: 520,
    gravity: false,
    cooldown: 420,
    color: '#a48cff',
    element: 'void',
    knock: 80,
    ttl: 3600,
    projectileRadius: 10,
    projectileHarmless: true,
    projectileIgnoreTerrain: true,
    projectileIgnoreStickCollision: true,
    projectileLockTarget: true,
    projectileTargetRadius: 36,
    projectileTrailColor: 'rgba(164, 140, 255, 0.45)',
    projectileTrailAlpha: 0.68,
    projectileHaloSpin: 4.2,
    projectileSingularity: {
      duration: 3600,
      radius: 56,
      damage: 32,
      pullRadius: 260,
      pullStrength: 2400,
      tickInterval: 0.32,
      fadeDuration: 720,
      color: '#a48cff'
    }
  },
  testVoidSiphon: {
    name: 'test Void Siphon',
    description: 'Massive void core that drifts forward, tugging nearby enemies before its implosive detonation.',
    kind: 'magic',
    projectile: 'voidOrb',
    dmg: 2,
    speed: 440,
    gravity: false,
    cooldown: 920,
    color: '#b28cff',
    element: 'void',
    knock: 80,
    ttl: 3200,
    blastRadius: 140,
    blastDamage: 2,
    pullRadius: 220,
    pullStrength: 1800
  },
  testChronoLoop: {
    name: 'test Chrono Loop',
    description: 'Temporal focus that releases lingering chronospheres which slow targets caught in their wake.',
    kind: 'magic',
    projectile: 'chronoOrb',
    dmg: 2,
    speed: 540,
    gravity: false,
    cooldown: 880,
    color: '#7de9ff',
    element: 'chronometric',
    knock: 70,
    ttl: 3400,
    slowMultiplier: 0.45,
    slowDuration: 2600,
    driftAmplitude: 28,
    driftFrequency: 2.4,
    projectileColor: '#aef4ff',
    projectileTrailColor: 'rgba(125, 233, 255, 0.45)'
  }
};

// Backwards compatibility alias. Existing systems (HUD, Stick, dev tools,
// etc.) still read from `WEAPONS`, so we mirror the same object reference here.
const WEAPONS = WEAPON_DEFS;

function shouldScaleWeaponDamageKey(key){
  if(!key) return false;
  if(key === 'dmg') return true;
  const lower = key.toLowerCase();
  if(lower === 'lifeStealPercent' || lower.endsWith('percent')) return false;
  if(lower.includes('damage')) return true;
  return false;
}

function normalizeWeaponDamageEntry(entry){
  if(!entry || typeof entry !== 'object') return;
  for(const key of Object.keys(entry)){
    const value = entry[key];
    if(typeof value === 'number'){
      if(shouldScaleWeaponDamageKey(key)) entry[key] = scaleDamageStat(value);
    }else if(value && typeof value === 'object'){
      normalizeWeaponDamageEntry(value);
    }
  }
}

(function normalizeWeaponCatalog(){
  for(const id in WEAPONS){
    if(!Object.prototype.hasOwnProperty.call(WEAPONS, id)) continue;
    normalizeWeaponDamageEntry(WEAPONS[id]);
  }
})();

function spawnPetalSaberAftershock(world, projectile){
  if(typeof triggerPollenCloud !== 'function') return;
  triggerPollenCloud(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 110,
    slow: 0.58,
    duration: 2200,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    color: '#c8ffae'
  });
}

function spawnSeedVolleyPollen(world, projectile){
  if(typeof triggerPollenCloud !== 'function') return;
  triggerPollenCloud(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 120,
    slow: 0.55,
    duration: 2600,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    color: '#d8ffb8'
  });
}

function spawnWindSpindleBurst(world, projectile){
  if(typeof triggerGustBurst !== 'function') return;
  triggerGustBurst(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: projectile?.pushRadius || 150,
    force: 1800,
    color: 'rgba(170, 242, 255, 0.7)'
  });
}

function spawnPressureLanceBurst(world, projectile){
  if(typeof triggerPressureBurst !== 'function') return;
  triggerPressureBurst(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 130,
    lift: 2200,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    color: '#8de4ff'
  });
}

function spawnVentMineBurst(world, projectile){
  if(typeof triggerSteamBurst !== 'function') return;
  triggerSteamBurst(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: projectile?.blastRadius || 150,
    damage: projectile?.blastDamage ?? (typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2),
    slow: 0.65,
    duration: 2000,
    color: 'rgba(180, 242, 255, 0.75)'
  });
}

function spawnAnchorFlailFoam(world, projectile){
  if(typeof triggerSteamBurst !== 'function') return;
  triggerSteamBurst(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 110,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    slow: 0.75,
    duration: 1600,
    color: 'rgba(190, 244, 255, 0.6)'
  });
}

function spawnChronoglassField(world, projectile){
  if(typeof triggerChronoField !== 'function') return;
  triggerChronoField(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 140,
    slow: 0.5,
    duration: 2800,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    color: '#ffe1a4'
  });
}

function spawnSpiritBloomCloud(world, projectile){
  if(typeof triggerPollenCloud !== 'function') return;
  triggerPollenCloud(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: projectile?.blastRadius || 110,
    slow: 0.58,
    duration: 2200,
    damage: projectile?.blastDamage ?? projectile?.dmg ?? (typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2),
    color: 'rgba(208, 255, 210, 0.6)'
  });
}

function spawnTempestHaloBurst(world, projectile){
  if(typeof triggerPressureBurst !== 'function') return;
  triggerPressureBurst(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: projectile?.blastRadius || 120,
    lift: 2400,
    damage: projectile?.blastDamage ?? projectile?.dmg ?? 2,
    element: projectile?.element,
    color: 'rgba(190, 238, 255, 0.72)'
  });
}

function spawnEchoDiscReturn(world, projectile){
  if(!world || !projectile || projectile.returning) return;
  if(typeof shootProjectile !== 'function') return;
  const owner = projectile.owner;
  if(!owner || owner.dead) return;
  const center = typeof owner.center === 'function' ? owner.center() : null;
  if(!center) return;
  const angle = Math.atan2(center.y - projectile.y, center.x - projectile.x);
  const weapon = WEAPONS.echoRepeater;
  shootProjectile(owner, weapon, 'echoDisc', {
    angle,
    speed: projectile.returnSpeed || weapon.projectileReturnSpeed || weapon.speed,
    gravity: false,
    damage: projectile.dmg,
    spin: true,
    returning: true,
    color: projectile.color,
    trailColor: projectile.trailColor
  }, world);
}

function spawnInkSlashSplash(world, projectile){
  if(typeof triggerInkSplash !== 'function') return;
  triggerInkSplash(world, projectile?.x || 0, projectile?.y || 0, {
    owner: projectile?.owner,
    radius: 130,
    damage: typeof scaleDamageStat === 'function' ? scaleDamageStat(2) : 2,
    slow: 0.6,
    duration: 2200,
    color: '#ffd9a8'
  });
}

function playerWeaponIds(){
  return Object.keys(WEAPONS).filter(id=>!WEAPONS[id]?.enemyOnly);
}
