// equipment.js

const TEAM_SIZE = 3;

const EQUIPMENT_SUBSLOTS = ['mainHand','offHand','armor'];

const GLYPHS = {
  fire: {
    id: 'fire',
    name: 'Pyre Glyph',
    description: 'Brands the weapon with roaring flame, igniting attacks and projectiles.',
    element: 'fire',
    symbol: '火',
    color: '#ff714d',
    badgeColor: 'rgba(255, 113, 77, 0.18)',
    projectileColor: '#ffb48c',
    projectileTrailColor: 'rgba(255, 140, 92, 0.55)',
    ammoColor: '#ffae73'
  },
  ice: {
    id: 'ice',
    name: 'Glacier Glyph',
    description: 'Frost etchings spread across the weapon, chilling anything they touch.',
    element: 'ice',
    symbol: '氷',
    color: '#7be1ff',
    badgeColor: 'rgba(123, 225, 255, 0.2)',
    projectileColor: '#d8f7ff',
    projectileTrailColor: 'rgba(190, 245, 255, 0.65)',
    ammoColor: '#d4f4ff'
  },
  light: {
    id: 'light',
    name: 'Radiance Glyph',
    description: 'Suffuses the weapon with searing light that cuts through shadow.',
    element: 'light',
    symbol: '光',
    color: '#ffe066',
    badgeColor: 'rgba(255, 224, 102, 0.2)',
    projectileColor: '#fff4ba',
    projectileTrailColor: 'rgba(255, 236, 170, 0.6)',
    ammoColor: '#ffe066'
  },
  chronometric: {
    id: 'chronometric',
    name: 'Chronometric Glyph',
    description: 'Threads the weapon through time, lending hits a temporal shimmer.',
    element: 'chronometric',
    symbol: '時',
    color: '#6bd1ff',
    badgeColor: 'rgba(107, 209, 255, 0.18)',
    projectileColor: '#bde8ff',
    projectileTrailColor: 'rgba(134, 224, 255, 0.55)',
    ammoColor: '#9fe0ff'
  },
  void: {
    id: 'void',
    name: 'Umbral Glyph',
    description: 'Pulls in starlight and voidflame, turning strikes into rifts of nothingness.',
    element: 'void',
    symbol: '空',
    color: '#9f7bff',
    badgeColor: 'rgba(159, 123, 255, 0.2)',
    projectileColor: '#c8b4ff',
    projectileTrailColor: 'rgba(168, 138, 255, 0.6)',
    ammoColor: '#c8b4ff'
  },
  explosive: {
    id: 'explosive',
    name: 'Nova Glyph',
    description: 'Imbues the weapon with volatile sigils that crave explosive release.',
    element: 'explosive',
    symbol: '爆',
    color: '#ffcf5a',
    badgeColor: 'rgba(255, 207, 90, 0.2)',
    projectileColor: '#ffe3a6',
    projectileTrailColor: 'rgba(255, 207, 120, 0.6)',
    ammoColor: '#ffd36b'
  },
  necrotic: {
    id: 'necrotic',
    name: 'Decay Glyph',
    description: 'Infuses strikes with clinging rot that continues to erode foes.',
    element: 'necrotic',
    symbol: '腐',
    color: '#7fe6b2',
    badgeColor: 'rgba(127, 230, 178, 0.2)',
    projectileColor: '#c1f6d9',
    projectileTrailColor: 'rgba(140, 240, 190, 0.6)',
    ammoColor: '#9ff2c8'
  },
  life: {
    id: 'life',
    name: 'Verdant Glyph',
    description: 'Channels vibrant growth that lets attacks pulse with living energy.',
    element: 'life',
    symbol: '生',
    color: '#6df29a',
    badgeColor: 'rgba(109, 242, 154, 0.2)',
    projectileColor: '#b7f9cf',
    projectileTrailColor: 'rgba(120, 244, 180, 0.55)',
    ammoColor: '#8ff5bb'
  }
};

const GLYPH_ORDER = ['fire','ice','light','chronometric','void','explosive','necrotic','life'];

function glyphById(id){
  if(!id) return null;
  const key = String(id).trim().toLowerCase();
  if(!key) return null;
  const normalized = key === 'chrono' ? 'chronometric' : key;
  return GLYPHS[normalized] || null;
}

function glyphSortIndex(id){
  const idx = GLYPH_ORDER.indexOf(id);
  return idx === -1 ? GLYPH_ORDER.length : idx;
}

function sanitizeGlyphItem(item){
  if(!item || typeof item !== 'object') return null;
  if(item.type !== 'glyph') return null;
  const glyph = glyphById(item.id);
  if(!glyph) return null;
  return { type: 'glyph', id: glyph.id };
}

function cloneGlyphItem(item){
  const sanitized = sanitizeGlyphItem(item);
  if(!sanitized) return null;
  return { ...sanitized };
}

function normalizeGlyphInventory(list){
  const arr = Array.isArray(list) ? list : [];
  const normalized = [];
  const seen = new Set();
  for(const entry of arr){
    const glyph = sanitizeGlyphItem(entry);
    if(!glyph) continue;
    if(seen.has(glyph.id)) continue;
    seen.add(glyph.id);
    normalized.push(glyph);
  }
  normalized.sort((a,b)=>glyphSortIndex(a.id) - glyphSortIndex(b.id));
  return normalized;
}

function ensureGlyphInventory(profile){
  if(!profile) return [];
  const normalized = normalizeGlyphInventory(profile.glyphInventory);
  profile.glyphInventory = normalized;
  return normalized;
}

function cloneGlyphInventory(list){
  return normalizeGlyphInventory(list);
}

function addGlyphToInventory(profile, glyphId){
  if(!profile) return false;
  const glyph = glyphById(glyphId);
  if(!glyph) return false;
  const inventory = ensureGlyphInventory(profile);
  if(inventory.some(entry=>entry.id === glyph.id)) return false;
  inventory.push({ type: 'glyph', id: glyph.id });
  inventory.sort((a,b)=>glyphSortIndex(a.id) - glyphSortIndex(b.id));
  return true;
}

function removeGlyphFromInventory(profile, glyphId){
  if(!profile) return false;
  const inventory = ensureGlyphInventory(profile);
  const idx = inventory.findIndex(entry=>entry.id === glyphId);
  if(idx === -1) return false;
  inventory.splice(idx, 1);
  return true;
}

function weaponSupportsGlyphSocket(weapon){
  return !!(weapon && weapon.glyphSocket);
}

function applyWeaponItemModifiers(item, weapon, baseDefinition=null){
  if(!item || !weapon) return weapon;
  const reference = baseDefinition || (item.id ? WEAPONS?.[item.id] : null);
  if(reference && reference !== weapon){
    if(reference.photostigma && !weapon.photostigma){
      weapon.photostigma = { ...reference.photostigma };
    }
    if(reference.lightLineExperiment && !weapon.lightLineExperiment){
      weapon.lightLineExperiment = { ...reference.lightLineExperiment };
    }
    if(reference.crumbling && !weapon.crumbling){
      weapon.crumbling = { ...reference.crumbling };
    }
    if(reference.auric && !weapon.auric){
      weapon.auric = { ...reference.auric };
    }
    if(reference.charge && weapon.charge === undefined){
      weapon.charge = { ...reference.charge };
    }
    if(reference.staff && weapon.staff === undefined){
      weapon.staff = { ...reference.staff };
    }
    if(reference.baseDamage !== undefined && weapon.baseDamage === undefined){
      weapon.baseDamage = reference.baseDamage;
    }
    if(reference.baseKnock !== undefined && weapon.baseKnock === undefined){
      weapon.baseKnock = reference.baseKnock;
    }
  }
  if(weapon.baseDamage === undefined){
    const refDamage = reference?.baseDamage ?? reference?.dmg;
    if(Number.isFinite(refDamage)) weapon.baseDamage = refDamage;
  }
  if(weapon.baseKnock === undefined){
    const refKnock = reference?.baseKnock ?? reference?.knock;
    if(Number.isFinite(refKnock)) weapon.baseKnock = refKnock;
  }
  if(item.id === 'crumblingClaymore'){
    const config = weapon.crumbling || reference?.crumbling || {};
    const minStrength = clamp(Number.isFinite(config.minStrength) ? config.minStrength : 0.3, 0, 1);
    const strength = clamp(Number.isFinite(item.crumblingStrength) ? item.crumblingStrength : 1, minStrength, 1);
    weapon.crumblingStrength = strength;
    const baseDamage = Number.isFinite(weapon.baseDamage)
      ? weapon.baseDamage
      : (Number.isFinite(reference?.dmg) ? reference.dmg : weapon.dmg);
    if(Number.isFinite(baseDamage)){
      weapon.baseDamage = baseDamage;
      weapon.dmg = Math.max(1, Math.round(baseDamage * strength));
    }
    const baseKnock = Number.isFinite(weapon.baseKnock)
      ? weapon.baseKnock
      : (Number.isFinite(reference?.knock) ? reference.knock : weapon.knock);
    if(Number.isFinite(baseKnock)){
      const minKnockMultiplier = clamp(Number.isFinite(config.minKnockMultiplier) ? config.minKnockMultiplier : 0.65, 0, 1);
      const normalized = clamp((strength - minStrength) / Math.max(1e-3, 1 - minStrength), 0, 1);
      const knockMultiplier = minKnockMultiplier + (1 - minKnockMultiplier) * normalized;
      weapon.baseKnock = baseKnock;
      weapon.knock = baseKnock * knockMultiplier;
    }
  }
  return weapon;
}

function resolveWeaponWithGlyph(item){
  if(!item || item.type !== 'weapon') return null;
  const base = WEAPONS?.[item.id];
  if(!base) return null;
  const glyphId = item.glyph;
  const glyph = glyphById(glyphId);
  const weapon = { ...base };
  if(base.charge) weapon.charge = { ...base.charge };
  if(base.staff) weapon.staff = { ...base.staff };
  if(base.photostigma) weapon.photostigma = { ...base.photostigma };
  if(base.lightLineExperiment) weapon.lightLineExperiment = { ...base.lightLineExperiment };
  if(base.crumbling) weapon.crumbling = { ...base.crumbling };
  if(base.auric) weapon.auric = { ...base.auric };
  if(base.shield) weapon.shield = { ...base.shield };
  weapon.baseDamage = base.baseDamage ?? base.dmg ?? weapon.baseDamage;
  weapon.baseKnock = base.baseKnock ?? base.knock ?? weapon.baseKnock;
  if(glyph && weaponSupportsGlyphSocket(base)){
    weapon.element = glyph.element || base.element || glyph.id;
    weapon.color = glyph.color || base.color;
    if(glyph.projectileColor) weapon.projectileColor = glyph.projectileColor;
    if(glyph.projectileTrailColor) weapon.projectileTrailColor = glyph.projectileTrailColor;
    if(glyph.ammoColor && weapon.kind === 'gun') weapon.ammoColor = glyph.ammoColor;
    weapon.name = `${base.name} (${glyph.name})`;
    if(base.description){
      weapon.description = base.description;
    }else if(!weapon.description){
      weapon.description = `Attuned to the ${glyph.name}.`;
    }
    weapon.glyphApplied = glyph.id;
    weapon.glyphSymbol = glyph.symbol;
    weapon.glyphColor = glyph.color;
    weapon.glyphBadgeColor = glyph.badgeColor;
  }else{
    weapon.name = base.name;
  }
  applyWeaponItemModifiers(item, weapon, base);
  return weapon;
}

const OFFHAND_ITEMS = {
  scoutDroneRemote: {
    name: 'Scout Drone Remote',
    description: 'Deploys a scout drone that you can control to explore and flip levers.',
    kind: 'scoutRemote',
    slot: 'offHand',
    color: '#58d2ff',
    accentColor: '#123544'
  },
  dagger: {
    name: 'Parrying Dagger',
    description: 'A light secondary blade that encourages aggressive play.',
    kind: 'dagger',
    slot: 'offHand',
    color: '#ff6b6b',
    attackBonus: 0.25,
    trimColor: '#ffd6d6',
    hiltColor: '#2f2320'
  },
  buckler: {
    name: 'Buckler Shield',
    description: 'Compact shield that boosts defense without weighing you down.',
    kind: 'shield',
    slot: 'offHand',
    color: '#6b8cff',
    defenseBonus: 0.6,
    faceColor: '#94adff',
    trimColor: '#2c356d'
  },
  radiantTorch: {
    name: 'Radiant Torch',
    description: 'A hand torch that floods the darkness with Light Line brilliance.',
    kind: 'torch',
    slot: 'offHand',
    color: '#ffce6b',
    accentColor: '#fff4c6',
    bodyColor: '#5b3a1f',
    handleColor: '#6b4626',
    gripColor: '#3d2714',
    flameColor: '#ffd36b',
    glowColor: 'rgba(255, 236, 170, 0.75)',
    lightRadiusBonus: 1
  },
  haloDrone: {
    name: 'Halo Drone',
    description: 'An autonomous drone that trails you and fires at foes with a clear shot.',
    kind: 'drone',
    slot: 'offHand',
    color: '#7bd1ff',
    bodyColor: '#3f4d76',
    accentColor: '#c9f3ff',
    projectileColor: '#e7fbff',
    trailColor: 'rgba(123, 209, 255, 0.5)',
    range: 440,
    cooldownMs: 640,
    projectileDamage: 9,
    projectileSpeed: 860,
    knockback: 90,
    followDistance: 46,
    hoverHeight: 28
  },
  seekerDrone: {
    name: 'Seeker Drone',
    description: 'Deploys a heavy drone that launches heat-seeking missiles at distant foes.',
    kind: 'drone',
    slot: 'offHand',
    color: '#ffb36b',
    bodyColor: '#402f23',
    accentColor: '#ffd9b0',
    projectileColor: '#ffe3c4',
    trailColor: 'rgba(255, 168, 92, 0.55)',
    effectColor: '#ff974a',
    projectileKind: 'droneSeekerMissile',
    range: 560,
    cooldownMs: 1400,
    projectileDamage: 22,
    projectileSpeed: 360,
    projectileRadius: 7.5,
    missileMaxSpeed: 780,
    missileTurnRate: 4.8,
    missileSeekForce: 960,
    missileDrag: 0.06,
    missileBlastRadius: 96,
    missileBlastDamage: 16,
    knockback: 160,
    followDistance: 50,
    hoverHeight: 30
  },
  orbitGlyphs: {
    name: 'Orbit Sigils',
    description: 'Three glyph sparks circle around you, striking foes and reforming over time.',
    kind: 'glyphOrbit',
    slot: 'offHand',
    color: '#d6bcff',
    glyphColor: '#f3edff',
    glyphOutline: '#bfa0ff',
    orbitRadius: 42,
    orbitSpeed: 1.6,
    glyphCount: 3,
    contactDamage: 8,
    knockScale: 0.35,
    regenMs: 1500,
    hitRadius: 14,
    sparkColor: 'rgba(214, 188, 255, 0.85)'
  }
};

const ARMOR_ITEMS = {
  sentinelHarness: {
    name: 'Sentinel Harness',
    description: 'Prototype plating that wraps the torso in gleaming alloy.',
    kind: 'prototype',
    slot: 'armor',
    color: '#8fb9ff',
    primaryColor: '#3b4d73',
    secondaryColor: '#5872a3',
    trimColor: '#d7e3ff',
    defenseBonus: 1.2
  },
  scubaDiverSuit: {
    name: 'Scuba Diver Suit',
    description: 'A sealed rebreather harness that lets a stickman breathe underwater.',
    kind: 'aquatic',
    slot: 'armor',
    color: '#45a4d9',
    primaryColor: '#1d3f5c',
    secondaryColor: '#276b8f',
    trimColor: '#8ff2ff',
    defenseBonus: 0.75,
    preventsDrowning: true
  },
  biofuseArmor: {
    name: 'Biofuse Armor',
    description: 'Reactive plating that drinks coin-fed energy to harden its shell.',
    kind: 'adaptive',
    slot: 'armor',
    color: '#7fe6b2',
    primaryColor: '#1f4d3a',
    secondaryColor: '#2d6a52',
    trimColor: '#b6f5d8',
    defenseBonus: 0.6,
    biofuse: {
      coinCost: 5,
      defensePerFeed: 0.12,
      maxDefenseBonus: 2.4,
      feedbackColor: '#9ff2c8'
    }
  },
  leechConduitVest: {
    name: 'Leech Conduit Vest',
    description: 'Threadbare conduit mesh that funnels siphoned vitality to nearby allies.',
    kind: 'support',
    slot: 'armor',
    color: '#9055b8',
    primaryColor: '#351b4d',
    secondaryColor: '#4e2a72',
    trimColor: '#cf9fff',
    defenseBonus: 0.3,
    lifeStealSharePercent: 0.45,
    lifeStealShareRadius: 220
  },
  staveChannelMantle: {
    name: 'Stave Channel Mantle',
    description: 'Layered vestments that widen stave auras with luminous sigils.',
    kind: 'mystic',
    slot: 'armor',
    color: '#f2d88c',
    primaryColor: '#5b4121',
    secondaryColor: '#795734',
    trimColor: '#fff2c6',
    defenseBonus: 0.5,
    staffAuraRadiusMultiplier: 1.5
  },
  lightLineVestment: {
    name: 'Light Line Vestment',
    description: 'Sun-threaded harness that mirrors the Light Line radiant glow.',
    kind: 'radiant',
    slot: 'armor',
    color: '#ffe066',
    primaryColor: '#fff4c6',
    secondaryColor: '#f9c65a',
    trimColor: '#fffbe6',
    defenseBonus: 0.8,
    element: 'light'
  }
};

function weaponGrip(weapon){
  if(!weapon) return 'oneHand';
  const grip = weapon.grip || weapon.hands || weapon.twoHanded;
  if(grip === 'twoHand' || grip === 'twoHanded' || grip === true) return 'twoHand';
  if(grip === 'oneHand' || grip === 'single' || grip === false) return 'oneHand';
  if(weapon.kind && weapon.kind !== 'melee') return 'twoHand';
  return 'oneHand';
}

function isTwoHandedWeaponItem(item){
  if(!item || item.type !== 'weapon') return false;
  const weapon = WEAPONS?.[item.id];
  return weaponGrip(weapon) === 'twoHand';
}

function sanitizeEquipmentItem(item){
  if(!item || typeof item !== 'object') return null;
  const type = item.type;
  if(type === 'weapon'){
    const id = item.id;
    if(id && WEAPONS && WEAPONS[id]){
      const sanitized = { type: 'weapon', id };
      const glyphId = item.glyph;
      if(glyphId && weaponSupportsGlyphSocket(WEAPONS[id]) && glyphById(glyphId)){
        sanitized.glyph = glyphId;
      }
      return sanitized;
    }
    return null;
  }
  if(type === 'offhand'){
    const id = item.id;
    if(id && OFFHAND_ITEMS && OFFHAND_ITEMS[id]){
      return { type: 'offhand', id };
    }
    return null;
  }
  if(type === 'armor'){
    const id = item.id;
    if(id && ARMOR_ITEMS && ARMOR_ITEMS[id]){
      return { type: 'armor', id };
    }
    return null;
  }
  if(type === 'potion'){
    const heal = Number.isFinite(item.heal) ? item.heal : 30;
    return { type: 'potion', heal };
  }
  return null;
}

function cloneEquipmentItem(item){
  if(!item || typeof item !== 'object') return null;
  const sanitized = sanitizeEquipmentItem(item);
  if(!sanitized) return null;
  const clone = {};
  for(const key of Object.keys(item)){
    clone[key] = item[key];
  }
  clone.type = sanitized.type;
  if(sanitized.id) clone.id = sanitized.id;
  if(sanitized.heal !== undefined) clone.heal = sanitized.heal;
  if(sanitized.glyph) clone.glyph = sanitized.glyph;
  return clone;
}

function createEquipmentSlot(source=null){
  const slot = { mainHand: null, offHand: null, armor: null };
  if(!source || typeof source !== 'object') return slot;
  if(source.mainHand !== undefined || source.offHand !== undefined || source.armor !== undefined){
    const main = source.mainHand !== undefined ? cloneEquipmentItem(source.mainHand) : null;
    const off = source.offHand !== undefined ? cloneEquipmentItem(source.offHand) : null;
    const armor = source.armor !== undefined ? cloneEquipmentItem(source.armor) : null;
    source.mainHand = main;
    source.offHand = off;
    source.armor = armor;
    applyMainHandConstraints(source);
    return source;
  }
  const single = cloneEquipmentItem(source);
  if(single) slot.mainHand = single;
  applyMainHandConstraints(slot);
  return slot;
}

function cloneEquipmentSlot(slot){
  const normalized = createEquipmentSlot(slot);
  const clone = { mainHand: cloneEquipmentItem(normalized?.mainHand), offHand: cloneEquipmentItem(normalized?.offHand), armor: cloneEquipmentItem(normalized?.armor) };
  applyMainHandConstraints(clone);
  return clone;
}

function normalizeEquipmentSlot(slot){
  return createEquipmentSlot(slot);
}

function equipmentSlotHasValue(slot){
  if(!slot) return false;
  if(slot.mainHand || slot.offHand || slot.armor) return true;
  if(slot.type) return true;
  return false;
}

function canEquipItemInSubslot(item, subslot, targetSlot){
  const cleaned = sanitizeEquipmentItem(item);
  if(!cleaned) return false;
  const normalizedTarget = targetSlot ? createEquipmentSlot(targetSlot) : createEquipmentSlot();
  if(subslot === 'mainHand'){
    return cleaned.type === 'weapon';
  }
  if(subslot === 'offHand'){
    if(isTwoHandedWeaponItem(normalizedTarget.mainHand)) return false;
    return cleaned.type === 'offhand';
  }
  if(subslot === 'armor'){
    return cleaned.type === 'armor';
  }
  return false;
}

function applyMainHandConstraints(slot){
  if(!slot) return;
  if(isTwoHandedWeaponItem(slot.mainHand)){
    slot.offHand = null;
  }
}

function defaultInventory(){
  return [
    createEquipmentSlot(),
    createEquipmentSlot(),
    createEquipmentSlot()
  ];
}

function defaultGlyphInventory(){
  return GLYPH_ORDER.map(id=>({ type: 'glyph', id }));
}

function computeLocalSkillMultipliers(skills){
  const base = { health: 0, attack: 0, defense: 0 };
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

function computeStickSkillMultipliers(stick){
  if(typeof skillMultipliersFromAllocations === 'function'){
    return skillMultipliersFromAllocations(stick?.skillAllocations);
  }
  return computeLocalSkillMultipliers(stick?.skillAllocations);
}

function computeEquipmentBonusesForSlot(slot){
  const normalized = createEquipmentSlot(slot);
  let attack = 0;
  let defense = 0;
  let preventsDrowning = false;
  let defenseMultiplier = 1;
  let healthMultiplier = 1;
  let templarianWallShield = false;
  if(normalized.mainHand && normalized.mainHand.type === 'weapon'){
    const weaponInfo = resolveWeaponWithGlyph(normalized.mainHand) || WEAPONS?.[normalized.mainHand.id];
    if(weaponInfo){
      if(Number.isFinite(weaponInfo.defenseBonus)) defense += weaponInfo.defenseBonus;
      if(Number.isFinite(weaponInfo.defenseMultiplier)){
        defenseMultiplier *= Math.max(0, weaponInfo.defenseMultiplier);
      }
      if(Number.isFinite(weaponInfo.healthMultiplier)){
        healthMultiplier *= Math.max(0, weaponInfo.healthMultiplier);
      }
      if(weaponInfo.templarianWallShield) templarianWallShield = true;
    }
  }
  if(normalized.offHand && normalized.offHand.type === 'offhand'){
    const info = OFFHAND_ITEMS?.[normalized.offHand.id];
    if(info){
      if(Number.isFinite(info.attackBonus)) attack += info.attackBonus;
      if(Number.isFinite(info.defenseBonus)) defense += info.defenseBonus;
      if(Number.isFinite(info.block)) defense += info.block;
    }
  }
  if(normalized.armor && normalized.armor.type === 'armor'){
    const info = ARMOR_ITEMS?.[normalized.armor.id];
    if(info){
      const baseDefense = Number.isFinite(info.defenseBonus)
        ? info.defenseBonus
        : (Number.isFinite(info.defense) ? info.defense : 0);
      let extraDefense = 0;
      if(info.biofuse){
        const invested = Number.isFinite(normalized.armor.biofuseInvested)
          ? normalized.armor.biofuseInvested
          : 0;
        const perFeed = Number.isFinite(info.biofuse.defensePerFeed)
          ? info.biofuse.defensePerFeed
          : 0;
        if(invested > 0 && perFeed !== 0){
          const potential = invested * perFeed;
          if(Number.isFinite(info.biofuse.maxDefenseBonus)){
            const cap = Math.max(0, info.biofuse.maxDefenseBonus - baseDefense);
            extraDefense = Math.min(potential, cap);
          }else{
            extraDefense = potential;
          }
        }
      }
      if(Number.isFinite(baseDefense)) defense += baseDefense;
      if(Number.isFinite(extraDefense)) defense += extraDefense;
      if(info.preventsDrowning) preventsDrowning = true;
    }
  }
  return { attack, defense, preventsDrowning, defenseMultiplier, healthMultiplier, templarianWallShield };
}

function recomputeStickEquipmentBonuses(stick){
  if(!stick) return { attack: 0, defense: 0 };
  if(typeof stick.attackBase !== 'number') stick.attackBase = stick.attack ?? 0;
  if(typeof stick.defenseBase !== 'number') stick.defenseBase = stick.defense ?? 0;
  const slot = typeof stick.currentEquipmentSlot === 'function' ? stick.currentEquipmentSlot() : (Array.isArray(stick.inventory) ? stick.inventory[stick.equipIndex|0] : null);
  const bonuses = computeEquipmentBonusesForSlot(slot);
  stick.equipmentAttackBonus = bonuses.attack;
  stick.equipmentDefenseBonus = bonuses.defense;
  const multipliers = computeStickSkillMultipliers(stick);
  const defenseMultiplier = Number.isFinite(bonuses.defenseMultiplier)
    ? Math.max(0, bonuses.defenseMultiplier)
    : 1;
  const healthMultiplier = Number.isFinite(bonuses.healthMultiplier)
    ? Math.max(0, bonuses.healthMultiplier)
    : 1;
  const attackBase = (stick.attackBase ?? 0) + bonuses.attack;
  const defenseBase = (stick.defenseBase ?? 0) + bonuses.defense;
  stick.attack = attackBase * multipliers.attack;
  stick.defense = defenseBase * multipliers.defense * defenseMultiplier;
  const baseMaxHp = Number.isFinite(stick.maxHpBase) ? stick.maxHpBase : (stick.maxHp ?? 0);
  const newMaxHp = baseMaxHp * multipliers.health * healthMultiplier;
  const prevMax = stick.maxHp ?? newMaxHp;
  const prevHp = Number.isFinite(stick.hp) ? stick.hp : newMaxHp;
  const ratio = prevMax > 0 ? clamp(prevHp / prevMax, 0, 1) : 1;
  stick.maxHp = newMaxHp;
  stick.hp = Math.max(0, Math.min(newMaxHp, newMaxHp * ratio));
  stick.templarianWallShieldEquipped = !!bonuses.templarianWallShield && healthMultiplier > 0 && defenseMultiplier >= 0;
  stick.preventsDrowning = !!bonuses.preventsDrowning;
  if(typeof stick.cacheBaseStatsFromCurrent === 'function') stick.cacheBaseStatsFromCurrent({ useRaw: true });
  if(typeof stick._recomputeAuraMultipliers === 'function') stick._recomputeAuraMultipliers();
  return bonuses;
}

(function normalizeOffhandDamage(){
  if(typeof scaleDamageStat !== 'function') return;
  for(const id in OFFHAND_ITEMS){
    const item = OFFHAND_ITEMS[id];
    if(!item || typeof item !== 'object') continue;
    if(Number.isFinite(item.projectileDamage)) item.projectileDamage = scaleDamageStat(item.projectileDamage);
    if(Number.isFinite(item.missileBlastDamage)) item.missileBlastDamage = scaleDamageStat(item.missileBlastDamage);
    if(Number.isFinite(item.contactDamage)) item.contactDamage = scaleDamageStat(item.contactDamage);
  }
})();
