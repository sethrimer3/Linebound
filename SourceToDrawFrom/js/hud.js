// hud.js

const MIN_ARMORY_SLOTS = 8;

const WEAPON_ELEMENT_DISPLAY = (()=>{
  const source = (typeof ELEMENT_STYLE_MAP === 'object' && ELEMENT_STYLE_MAP) || null;
  if(source){
    const mapping = {};
    for(const key of Object.keys(source)){
      const entry = source[key] || {};
      const label = entry.label || (key.charAt(0).toUpperCase() + key.slice(1));
      const className = entry.className || `weapon-element-${key}`;
      mapping[key] = { label, className };
    }
    return mapping;
  }
  return {
    physical: { label: 'Physical', className: 'weapon-element-physical' },
    fire: { label: 'Fire', className: 'weapon-element-fire' },
    ice: { label: 'Ice', className: 'weapon-element-ice' },
    light: { label: 'Light', className: 'weapon-element-light' },
    chronometric: { label: 'Chronometric', className: 'weapon-element-chronometric' },
    void: { label: 'Void', className: 'weapon-element-void' },
    explosive: { label: 'Explosive', className: 'weapon-element-explosive' },
    necrotic: { label: 'Necrotic', className: 'weapon-element-necrotic' },
    life: { label: 'Life', className: 'weapon-element-life' }
  };
})();

function ensureGameplaySettings(world){
  if(!world) return null;
  if(!world.ui) world.ui = {};
  if(!world.ui.settings) world.ui.settings = {};
  if(!world.ui.settings.gameplay) world.ui.settings.gameplay = {};
  const gameplay = world.ui.settings.gameplay;
  if(typeof gameplay.selectionMarkerStyle !== 'string' || !gameplay.selectionMarkerStyle.trim()){
    gameplay.selectionMarkerStyle = 'circle';
  }
  if(typeof gameplay.selectionMarkerColor !== 'string' || !gameplay.selectionMarkerColor.trim()){
    gameplay.selectionMarkerColor = '#6bd1ff';
  }
  if(!Number.isFinite(gameplay.selectionMarkerOpacity)){
    gameplay.selectionMarkerOpacity = 85;
  }else{
    gameplay.selectionMarkerOpacity = clamp(Math.round(gameplay.selectionMarkerOpacity), 0, 100);
  }
  if(typeof gameplay.feetClamping !== 'boolean'){
    gameplay.feetClamping = false;
  }
  if(typeof gameplay.unlockAllStages !== 'boolean'){
    gameplay.unlockAllStages = false;
  }
  if(typeof gameplay.showHitboxes !== 'boolean'){
    gameplay.showHitboxes = false;
  }
  if(!Number.isFinite(gameplay.hitboxRigStrength)){
    gameplay.hitboxRigStrength = 100;
  }else{
    gameplay.hitboxRigStrength = clamp(Math.round(gameplay.hitboxRigStrength), 0, 200);
  }
  if(world){
    if(!world.gameplayFlags) world.gameplayFlags = {};
    world.gameplayFlags.feetClamping = !!gameplay.feetClamping;
    world.gameplayFlags.showHitboxes = !!gameplay.showHitboxes;
    if(!world.gameplayFlags.showHitboxes && world.input?.dragging){
      world.input.dragging.dragged = false;
      world.input.dragging = null;
    }
    world.gameplayFlags.hitboxRigStrength = gameplay.hitboxRigStrength;
    if(typeof updateHitboxRigForces === 'function'){
      updateHitboxRigForces(world);
    }
  }
  return gameplay;
}

function ensureSlotTooltipElement(world){
  const existing = world?.ui?.slotTooltipEl;
  if(existing && document.body.contains(existing)) return existing;
  let el = document.getElementById('slotTooltip');
  if(!el){
    el = document.createElement('div');
    el.id = 'slotTooltip';
    el.className = 'inventory-tooltip hidden';
    document.body.appendChild(el);
  }
  if(world?.ui) world.ui.slotTooltipEl = el;
  return el;
}

function placeSlotTooltip(el, pageX, pageY){
  if(!el) return;
  const margin = 18;
  const viewportWidth = window?.innerWidth || document.documentElement?.clientWidth || 0;
  const viewportHeight = window?.innerHeight || document.documentElement?.clientHeight || 0;
  let left = (pageX ?? 0) + margin;
  let top = (pageY ?? 0) + margin;
  const width = el.offsetWidth || 0;
  const height = el.offsetHeight || 0;
  if(viewportWidth && left + width > viewportWidth - 12){
    left = Math.max(12, viewportWidth - width - 12);
  }
  if(viewportHeight && top + height > viewportHeight - 12){
    top = Math.max(12, viewportHeight - height - 12);
  }
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function escapeTooltipHtml(value){
  if(value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatWeaponElementMarkup(rawKey, overrideLabel=null){
  if(rawKey == null) return '';
  const normalized = String(rawKey).trim();
  if(!normalized) return '';
  const lower = normalized.toLowerCase();
  const info = WEAPON_ELEMENT_DISPLAY[lower] || null;
  const labelSource = overrideLabel != null && overrideLabel !== ''
    ? overrideLabel
    : (info?.label || (normalized.charAt(0).toUpperCase() + normalized.slice(1)));
  const safeLabel = escapeTooltipHtml(labelSource);
  const classNames = ['weapon-element'];
  if(info?.className){
    classNames.push(info.className);
  }else if(info){
    classNames.push(`weapon-element-${lower}`);
  }
  const classAttr = classNames.join(' ');
  return `<span class="${classAttr}"><strong>${safeLabel}</strong></span>`;
}

function formatTooltipMarkup(text){
  if(text == null) return '';
  const safe = escapeTooltipHtml(text);
  const withBase = safe.replace(/\{\{weaponBase\|([^}]+)\}\}/g, (_, value)=>{
    const trimmed = String(value || '').trim();
    return `<span class="weapon-base-attack">${trimmed}</span>`;
  });
  const withTotal = withBase.replace(/\{\{weaponTotal\|([^}]+)\}\}/g, (_, value)=>{
    const trimmed = String(value || '').trim();
    return `<span class="weapon-total-attack">${trimmed}</span>`;
  });
  const withElement = withTotal.replace(/\{\{weaponElement\|([^}|]+)(?:\|([^}]+))?\}\}/g, (_, value, label)=>{
    return formatWeaponElementMarkup(value, label);
  });
  const withBold = withElement.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return withBold.replace(/\n/g, '<br>');
}

function formatMultiplierValue(value){
  const num = Number(value);
  if(!Number.isFinite(num)) return '×1';
  const rounded = Math.round(num * 100) / 100;
  if(Math.abs(rounded - Math.round(rounded)) < 0.001){
    return `×${Math.round(rounded)}`;
  }
  return `×${rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function weaponBaseAttackValue(weapon){
  if(!weapon || typeof weapon !== 'object') return null;
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
    if(Number.isFinite(candidate)) return candidate;
  }
  if(weapon.charge){
    if(Number.isFinite(weapon.charge.maxDamage)) return weapon.charge.maxDamage;
    if(Number.isFinite(weapon.charge.minDamage)) return weapon.charge.minDamage;
  }
  if(Array.isArray(weapon.shots)){
    for(const shot of weapon.shots){
      if(!shot || typeof shot !== 'object') continue;
      if(Number.isFinite(shot.damage)) return shot.damage;
      if(Number.isFinite(shot.dmg)) return shot.dmg;
    }
  }
  return null;
}

function formatBaseAttackValue(value){
  const num = Number(value);
  if(!Number.isFinite(num)) return '';
  if(Math.abs(num - Math.round(num)) < 0.001) return `${Math.round(num)}`;
  return num.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
}

function resolveWeaponElement(weapon, baseWeapon){
  const checkList = [];
  if(weapon && typeof weapon === 'object') checkList.push(weapon);
  if(baseWeapon && baseWeapon !== weapon && typeof baseWeapon === 'object') checkList.push(baseWeapon);
  for(const candidate of checkList){
    if(candidate.element) return candidate.element;
    if(candidate.staff && candidate.staff.element) return candidate.staff.element;
    if(candidate.projectileElement) return candidate.projectileElement;
  }
  return 'physical';
}

function showSlotTooltip(world, target, text, pageX, pageY){
  if(!text) return;
  const el = ensureSlotTooltipElement(world);
  const markup = formatTooltipMarkup(text);
  el.innerHTML = markup || '';
  el.classList.remove('hidden');
  el.style.left = '0px';
  el.style.top = '0px';
  placeSlotTooltip(el, pageX, pageY);
  if(world?.ui){
    world.ui.slotTooltipTarget = target || null;
    world.ui.slotTooltipText = text;
  }
}

function hideSlotTooltip(world){
  const el = world?.ui?.slotTooltipEl || document.getElementById('slotTooltip');
  if(!el) return;
  el.classList.add('hidden');
  el.innerHTML = '';
  if(world?.ui){
    world.ui.slotTooltipTarget = null;
    world.ui.slotTooltipText = '';
  }
}

function positionSlotTooltip(world, pageX, pageY){
  const el = world?.ui?.slotTooltipEl || document.getElementById('slotTooltip');
  if(!el || el.classList.contains('hidden')) return;
  placeSlotTooltip(el, pageX, pageY);
}

function toggleHoveredGunFastReload(world){
  if(!world || !world.ui?.inventoryOpen) return false;
  const hover = world.ui.inventoryHoverInfo;
  if(!hover || hover.type !== 'loadout') return false;
  const hoverElement = world.ui.inventoryHoverElement;
  if(hoverElement && !document.body.contains(hoverElement)){
    world.ui.inventoryHoverElement = null;
    world.ui.inventoryHoverInfo = null;
    return false;
  }
  const index = hover.index;
  if(!Number.isInteger(index)) return false;
  if(hover.subslot && hover.subslot !== 'mainHand') return false;
  const loadoutList = Array.isArray(world.profile?.inventory) ? world.profile.inventory : [];
  const rawSlot = loadoutList[index] || null;
  const equipment = rawSlot && (rawSlot.mainHand !== undefined || rawSlot.offHand !== undefined || rawSlot.armor !== undefined)
    ? rawSlot
    : createEquipmentSlot(rawSlot);
  if(rawSlot !== equipment && Array.isArray(world.profile?.inventory)){
    world.profile.inventory[index] = equipment;
  }
  const mainItem = equipment?.mainHand || null;
  if(!mainItem || mainItem.type !== 'weapon') return false;
  const weapon = WEAPONS[mainItem.id];
  if(!weapon || weapon.kind !== 'gun') return false;
  const team = Array.isArray(world.team) ? world.team : [];
  const stick = team[index] || null;
  if(!stick || typeof stick.toggleGunFastReload !== 'function') return false;
  const enabled = stick.toggleGunFastReload(mainItem.id);
  if(world.profile){
    if(!world.profile.fastReloadModes) world.profile.fastReloadModes = {};
    if(enabled){
      world.profile.fastReloadModes[mainItem.id] = true;
    }else{
      delete world.profile.fastReloadModes[mainItem.id];
    }
  }
  if(world.ui){
    world.ui.inventoryHoverElement = null;
    world.ui.inventoryHoverInfo = null;
  }
  renderHUD(world);
  return true;
}

function resolveCheckboxTarget(event, selector){
  if(!event || !selector) return null;
  const target = event.target instanceof Element ? event.target : null;
  if(!target) return null;
  const direct = target.closest(selector);
  if(direct) return direct;
  const label = target.closest('label[for]');
  if(!label) return null;
  const id = label.getAttribute('for');
  if(!id) return null;
  const candidate = document.getElementById(id);
  return candidate && candidate.matches(selector) ? candidate : null;
}

function setHoveredMapDevAction(world, action, element){
  if(!world) return;
  if(!world.ui) world.ui = {};
  if(world.state !== 'map'){
    world.ui.hoveredMapDevAction = null;
    world.ui.hoveredMapDevElement = null;
    return;
  }
  if(action && element && element instanceof Element && document.body.contains(element)){
    world.ui.hoveredMapDevAction = action;
    world.ui.hoveredMapDevElement = element;
  }else{
    world.ui.hoveredMapDevAction = null;
    world.ui.hoveredMapDevElement = null;
  }
}

function performMapDevAction(world, action){
  if(!world || world.state !== 'map' || typeof action !== 'string') return false;
  if(action === 'map-unlock-all'){
    const gameplay = ensureGameplaySettings(world) || {};
    const nextState = !gameplay.unlockAllStages;
    requestAnimationFrame(()=>applyMapUnlockCheckbox(world, nextState));
    return true;
  }
  if(action === 'map-add-all-weapons'){
    grantAllWeaponsToInventory(world);
    if(!world.ui) world.ui = {};
    world.ui.mapAddAllGranted = true;
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  if(action === 'map-clear-inventory'){
    clearAllInventoryItems(world);
    return true;
  }
  if(action === 'map-unlimited-health'){
    const gameplay = ensureGameplaySettings(world) || {};
    const nextState = !gameplay.unlimitedHealth;
    requestAnimationFrame(()=>applyUnlimitedHealthCheckbox(world, nextState));
    return true;
  }
  if(action === 'map-toggle-abilities'){
    const currentlyUnlocked = typeof areAllAbilitiesUnlocked === 'function'
      ? areAllAbilitiesUnlocked(world)
      : false;
    const nextState = !currentlyUnlocked;
    if(typeof setAllAbilitiesUnlocked === 'function'){
      setAllAbilitiesUnlocked(world, nextState);
    }
    if(typeof ensureTeamAbilityState === 'function') ensureTeamAbilityState(world);
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  if(action.startsWith('map-toggle-ability-')){
    const abilityId = action.slice('map-toggle-ability-'.length);
    if(!abilityId) return false;
    if(typeof abilityDefinitionById === 'function' && !abilityDefinitionById(abilityId)) return false;
    if(typeof ensureAbilityUnlocks === 'function') ensureAbilityUnlocks(world);
    const currentlyUnlocked = typeof isAbilityUnlocked === 'function'
      ? isAbilityUnlocked(world, abilityId)
      : false;
    if(typeof setAbilityUnlocked !== 'function') return false;
    setAbilityUnlocked(world, abilityId, !currentlyUnlocked);
    if(typeof ensureTeamAbilityState === 'function') ensureTeamAbilityState(world);
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  if(action === 'map-delete-save'){
    deleteAllPlayerData(world);
    return true;
  }
  if(action === 'map-toggle-tools'){
    if(!world.ui) world.ui = {};
    world.ui.mapToolsVisible = !world.ui.mapToolsVisible;
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  if(action === 'map-level-up'){
    adjustMapStickLevel(world, 1);
    return true;
  }
  if(action === 'map-level-down'){
    adjustMapStickLevel(world, -1);
    return true;
  }
  if(action === 'map-coins-add'){
    adjustMapCoins(world, MAP_DEV_COIN_STEP);
    return true;
  }
  if(action === 'map-coins-remove'){
    adjustMapCoins(world, -MAP_DEV_COIN_STEP);
    return true;
  }
  if(action === 'map-toggle-second-stick'){
    if(typeof setUnlockedTeamSlots !== 'function' || typeof getUnlockedTeamSlots !== 'function') return false;
    const unlocked = getUnlockedTeamSlots(world);
    const next = unlocked >= 2 ? 1 : 2;
    setUnlockedTeamSlots(world, next);
    if(typeof ensureTeamSelection === 'function') ensureTeamSelection(world);
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  if(action === 'map-toggle-third-stick'){
    if(typeof setUnlockedTeamSlots !== 'function' || typeof getUnlockedTeamSlots !== 'function') return false;
    const unlocked = getUnlockedTeamSlots(world);
    const next = unlocked >= 3 ? 2 : 3;
    setUnlockedTeamSlots(world, next);
    if(typeof ensureTeamSelection === 'function') ensureTeamSelection(world);
    if(world.state === 'map') renderHUD(world);
    return true;
  }
  return false;
}

function activateHoveredMapDevAction(world){
  if(!world || world.state !== 'map') return false;
  const ui = world.ui;
  if(!ui || !ui.hoveredMapDevAction) return false;
  let element = ui.hoveredMapDevElement;
  const action = ui.hoveredMapDevAction;
  if(element && (!document.body.contains(element) || !element.matches('button[data-action^="map-"]'))){
    element = null;
  }
  if(!element && action){
    element = document.querySelector(`button[data-action="${action}"]:hover`);
    if(element) ui.hoveredMapDevElement = element;
  }
  if(!element){
    ui.hoveredMapDevAction = null;
    ui.hoveredMapDevElement = null;
    return false;
  }
  return performMapDevAction(world, action);
}

function setHoveredSkillButton(world, element){
  if(!world) return;
  if(!world.ui) world.ui = {};
  const previous = world.ui.hoveredSkillButton;
  if(previous && previous !== element && previous.classList){
    previous.classList.remove('is-hovered');
  }
  if(element && element.tagName === 'BUTTON' && document.body.contains(element)){
    element.classList.add('is-hovered');
    world.ui.hoveredSkillButton = element;
  }else{
    if(!element && previous && previous.classList){
      previous.classList.remove('is-hovered');
    }
    world.ui.hoveredSkillButton = null;
  }
}

function positionSkillKeyHint(world, button, clientX, clientY){
  if(!world || !button) return;
  const pseudoEvent = { clientX, clientY };
  updateKeyHintCursor(world, pseudoEvent, button);
}

function attachSkillButtonInteraction(world, button, onActivate){
  if(!world || !button) return;
  const showHintFromEvent = (event)=>{
    if(!event) return;
    let clientX = null;
    let clientY = null;
    if(typeof event.clientX === 'number' && typeof event.clientY === 'number'){
      clientX = event.clientX;
      clientY = event.clientY;
    }else if(event.touches && event.touches.length){
      clientX = event.touches[0]?.clientX ?? null;
      clientY = event.touches[0]?.clientY ?? null;
    }
    if(clientX == null || clientY == null) return;
    setHoveredSkillButton(world, button);
    positionSkillKeyHint(world, button, clientX, clientY);
  };
  const handlePointerEnter = (event)=>{
    showHintFromEvent(event);
  };
  const handlePointerMove = (event)=>{
    if(world?.ui?.hoveredSkillButton !== button) return;
    showHintFromEvent(event);
  };
  const handlePointerLeave = ()=>{
    if(world?.ui?.hoveredSkillButton !== button) return;
    setHoveredSkillButton(world, null);
    hideKeyHintCursor(world);
  };
  button.addEventListener('pointerenter', handlePointerEnter);
  button.addEventListener('pointermove', handlePointerMove);
  button.addEventListener('pointerleave', handlePointerLeave);
  button.addEventListener('focus', ()=>{
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setHoveredSkillButton(world, button);
    positionSkillKeyHint(world, button, centerX, centerY);
  });
  button.addEventListener('blur', ()=>{
    if(world?.ui?.hoveredSkillButton === button){
      setHoveredSkillButton(world, null);
      hideKeyHintCursor(world);
    }
  });
  button.addEventListener('click', (event)=>{
    event.preventDefault();
    event.stopPropagation();
    if(button.disabled || button.getAttribute('aria-disabled') === 'disabled' || button.classList.contains('disabled')) return;
    if(typeof onActivate === 'function') onActivate(event);
  });
}

function activateHoveredSkillButton(world){
  const button = world?.ui?.hoveredSkillButton;
  if(!button || !document.body.contains(button)){
    if(world?.ui) world.ui.hoveredSkillButton = null;
    return false;
  }
  if(button.disabled || button.getAttribute('aria-disabled') === 'disabled') return false;
  button.click();
  return true;
}

function setHoveredShopButton(world, element){
  if(!world) return;
  if(!world.ui) world.ui = {};
  const previous = world.ui.hoveredShopButton;
  if(previous && previous !== element){
    if(previous.classList) previous.classList.remove('is-hovered');
    const prevCard = previous.closest('.shop-item');
    if(prevCard) prevCard.classList.remove('is-hovered');
  }
  if(element && element.tagName === 'BUTTON' && document.body.contains(element)){
    element.classList.add('is-hovered');
    const card = element.closest('.shop-item');
    if(card) card.classList.add('is-hovered');
    world.ui.hoveredShopButton = element;
  }else{
    if(!element && previous){
      if(previous.classList) previous.classList.remove('is-hovered');
      const prevCard = previous.closest('.shop-item');
      if(prevCard) prevCard.classList.remove('is-hovered');
    }
    world.ui.hoveredShopButton = null;
  }
}

function activateHoveredShopButton(world){
  const button = world?.ui?.hoveredShopButton;
  if(!button || !document.body.contains(button)){
    if(world?.ui) world.ui.hoveredShopButton = null;
    return false;
  }
  if(button.disabled || button.getAttribute('aria-disabled') === 'disabled') return false;
  button.click();
  return true;
}

function ensureKeyHintCursor(world){
  let cursor = document.getElementById('keyHintCursor');
  if(!cursor){
    cursor = document.createElement('div');
    cursor.id = 'keyHintCursor';
    cursor.className = 'key-hint-cursor key-hint-hidden';
    cursor.textContent = 'F';
    document.body.appendChild(cursor);
  }
  if(world){
    if(!world.ui) world.ui = {};
    world.ui.keyHintCursor = cursor;
  }
  return cursor;
}

function updateKeyHintCursor(world, event, element){
  if(!world) return;
  const cursor = ensureKeyHintCursor(world);
  if(!cursor) return;
  const hint = element && element.getAttribute ? element.getAttribute('data-key-hint') : null;
  if(!hint){
    cursor.classList.add('key-hint-hidden');
    return;
  }
  cursor.textContent = hint;
  const offsetX = 18;
  const offsetY = 20;
  const clientX = event?.clientX ?? 0;
  const clientY = event?.clientY ?? 0;
  const x = Math.round(clientX + offsetX);
  const y = Math.round(clientY + offsetY);
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  cursor.classList.remove('key-hint-hidden');
}

function hideKeyHintCursor(world){
  const cursor = world?.ui?.keyHintCursor || document.getElementById('keyHintCursor');
  if(cursor){
    cursor.classList.add('key-hint-hidden');
  }
}

const MAP_DEV_COIN_STEP = 100;

function mapNextXpForLevel(level){
  const baseProfile = typeof createStickProfile === 'function' ? createStickProfile() : { nextXp: 40 };
  let next = Math.max(1, baseProfile.nextXp || 40);
  const targetLevel = Math.max(1, Math.floor(level));
  for(let i = 1; i < targetLevel; i++){
    next = Math.max(1, Math.floor(next * 1.45));
  }
  return next;
}

function adjustMapStickLevel(world, delta){
  if(!world || !delta) return false;
  if(!world.profile) world.profile = {};
  const teamProfiles = ensureTeamProfiles(world.profile.team || []);
  const team = Array.isArray(world.team) ? world.team : [];
  let activeIndex = Number.isFinite(world.teamActiveIndex) ? world.teamActiveIndex : world.profile?.activeIndex;
  if(!Number.isFinite(activeIndex)) activeIndex = 0;
  activeIndex = clamp(activeIndex, 0, Math.max(0, teamProfiles.length - 1));
  const profileEntry = teamProfiles[activeIndex];
  if(!profileEntry) return false;
  const stick = team[activeIndex];
  const skillStep = typeof SKILL_POINTS_PER_LEVEL === 'number' ? SKILL_POINTS_PER_LEVEL : 3;
  const loops = Math.abs(delta);
  const step = delta > 0 ? 1 : -1;
  let changed = false;
  for(let i = 0; i < loops; i++){
    if(step > 0){
      profileEntry.level = (profileEntry.level ?? 1) + 1;
      profileEntry.skillPoints = (profileEntry.skillPoints ?? 0) + skillStep;
      profileEntry.nextXp = Infinity;
      profileEntry.xp = 0;
      if(stick){
        stick.level = (stick.level ?? 1) + 1;
        stick.skillPoints = (stick.skillPoints ?? 0) + skillStep;
        stick.nextXp = profileEntry.nextXp;
        stick.xp = 0;
        if(typeof recomputeStickEquipmentBonuses === 'function'){
          recomputeStickEquipmentBonuses(stick);
        }
      }
      changed = true;
    }else if(step < 0){
      const currentLevel = profileEntry.level ?? 1;
      if(currentLevel <= 1) break;
      profileEntry.level = currentLevel - 1;
      profileEntry.skillPoints = Math.max(0, (profileEntry.skillPoints ?? 0) - skillStep);
      profileEntry.nextXp = Infinity;
      profileEntry.xp = 0;
      if(stick){
        stick.level = Math.max(1, (stick.level ?? 1) - 1);
        stick.skillPoints = Math.max(0, (stick.skillPoints ?? 0) - skillStep);
        stick.nextXp = profileEntry.nextXp;
        stick.xp = 0;
        if(typeof recomputeStickEquipmentBonuses === 'function'){
          recomputeStickEquipmentBonuses(stick);
        }
      }
      changed = true;
    }
  }
  if(!changed) return false;
  const profileMultipliers = typeof skillMultipliersFromAllocations === 'function'
    ? skillMultipliersFromAllocations(profileEntry.skills)
    : { health: 1, attack: 1, defense: 1 };
  const baseMax = Number.isFinite(profileEntry.maxHp) ? profileEntry.maxHp : 0;
  const finalMax = baseMax * (profileMultipliers.health || 1);
  if(Number.isFinite(finalMax) && finalMax > 0){
    profileEntry.hp = Math.min(finalMax, profileEntry.hp ?? finalMax);
  }
  if(stick){
    stick.hp = Math.min(stick.hp ?? stick.maxHp, stick.maxHp);
  }
  teamProfiles[activeIndex] = cloneStickProfile(profileEntry);
  const updatedProfile = teamProfiles[activeIndex];
  world.profile.team = teamProfiles;
  world.profile.level = updatedProfile.level;
  world.profile.xp = updatedProfile.xp;
  world.profile.nextXp = updatedProfile.nextXp;
  if(stick){
    if(typeof updateProfileEntryFromStick === 'function'){
      updateProfileEntryFromStick(world, stick);
    }
  }
  if(world.state === 'map'){
    if(typeof setMapMessage === 'function'){
      setMapMessage(world, `Level adjusted to ${updatedProfile.level}.`);
    }
    renderHUD(world);
  }
  return true;
}

function adjustMapCoins(world, delta){
  if(!world || !delta) return false;
  if(!world.profile) world.profile = {};
  const current = world.coins ?? world.profile.coins ?? 0;
  const next = Math.max(0, current + delta);
  if(next === current) return false;
  world.coins = next;
  world.profile.coins = next;
  if(world.state === 'map'){
    if(typeof setMapMessage === 'function'){
      setMapMessage(world, `Coins adjusted to ${next}.`);
    }
    renderHUD(world);
  }
  return true;
}

function applyMapUnlockCheckbox(world, checkboxOrState){
  if(!world) return;
  const gameplay = ensureGameplaySettings(world);
  const previous = gameplay ? !!gameplay.unlockAllStages : false;
  const enabled = typeof checkboxOrState === 'boolean'
    ? checkboxOrState
    : !!(checkboxOrState && checkboxOrState.checked);
  if(gameplay) gameplay.unlockAllStages = enabled;
  if(enabled === previous) return;
  if(typeof applyMapUnlockOverride === 'function'){
    applyMapUnlockOverride(world, enabled);
  }
  if(typeof setMapMessage === 'function' && world.state === 'map'){
    const message = enabled ? 'Developer unlock active: all stages available.' : 'Developer unlock disabled: progression restored.';
    setMapMessage(world, message);
  }
  if(world.state === 'map'){
    renderHUD(world);
  }
}

function applyUnlimitedHealthCheckbox(world, checkboxOrState){
  if(!world) return;
  const gameplay = ensureGameplaySettings(world);
  const previous = gameplay ? !!gameplay.unlimitedHealth : false;
  const enabled = typeof checkboxOrState === 'boolean'
    ? checkboxOrState
    : !!(checkboxOrState && checkboxOrState.checked);
  if(gameplay) gameplay.unlimitedHealth = enabled;
  if(enabled === previous) return;
  if(enabled){
    if(Array.isArray(world.profile?.team)){
      world.profile.team.forEach(member=>{
        if(member && typeof member === 'object'){
          member.hp = member.maxHp ?? member.hp ?? 0;
        }
      });
    }
    if(Array.isArray(world.team)){
      world.team.forEach(stick=>{
        if(stick && !stick.isEnemy){
          stick.hp = stick.maxHp;
        }
      });
    }
  }
  if(typeof setMapMessage === 'function' && world.state === 'map'){
    const message = enabled ? 'Developer cheat enabled: unlimited health is active.' : 'Developer cheat disabled: standard health restored.';
    setMapMessage(world, message);
  }
  if(world.state === 'map'){
    renderHUD(world);
  }
}

function grantAllWeaponsToInventory(world){
  if(!world || !world.profile) return 0;
  const profile = world.profile;
  const loadout = Array.isArray(profile.inventory) ? profile.inventory : (profile.inventory = []);
  while(loadout.length < TEAM_SIZE) loadout.push(createEquipmentSlot());
  const armory = Array.isArray(profile.armory) ? profile.armory : (profile.armory = []);
  const known = new Set();
  const registerItem = (item)=>{
    if(!item || typeof item !== 'object') return;
    const type = item.type;
    if(type === 'potion'){
      const heal = Number.isFinite(item.heal) ? item.heal : 30;
      known.add(`potion:${heal}`);
      return;
    }
    if(!type || !item.id) return;
    known.add(`${type}:${item.id}`);
  };
  for(const slot of loadout){
    const equipment = slot && (slot.mainHand !== undefined || slot.offHand !== undefined || slot.armor !== undefined) ? slot : createEquipmentSlot(slot);
    registerItem(equipment?.mainHand || null);
    registerItem(equipment?.offHand || null);
    registerItem(equipment?.armor || null);
  }
  for(const slot of armory){
    registerItem(slot);
  }
  const glyphInventory = ensureGlyphInventory(profile);
  const glyphKnown = new Set(glyphInventory.map(entry=>entry.id));
  let glyphAdded = 0;
  const grantGlyph = (glyphId)=>{
    if(!glyphId || glyphKnown.has(glyphId)) return;
    glyphInventory.push({ type: 'glyph', id: glyphId });
    glyphKnown.add(glyphId);
    glyphAdded++;
  };
  let added = 0;
  const addEquipment = (type, id)=>{
    if(!type || !id) return;
    const key = `${type}:${id}`;
    if(known.has(key)) return;
    armory.push({ type, id });
    known.add(key);
    added++;
  };
  if(WEAPONS && typeof WEAPONS === 'object'){
    for(const id of Object.keys(WEAPONS)){
      addEquipment('weapon', id);
    }
  }
  if(typeof OFFHAND_ITEMS === 'object' && OFFHAND_ITEMS){
    for(const id of Object.keys(OFFHAND_ITEMS)){
      addEquipment('offhand', id);
    }
  }
  if(typeof ARMOR_ITEMS === 'object' && ARMOR_ITEMS){
    for(const id of Object.keys(ARMOR_ITEMS)){
      addEquipment('armor', id);
    }
  }
  if(typeof GLYPHS === 'object' && GLYPHS){
    for(const id of Object.keys(GLYPHS)){
      grantGlyph(id);
    }
  }
  if(glyphAdded > 0){
    const sortFn = typeof glyphSortIndex === 'function'
      ? (a, b)=>glyphSortIndex(a.id) - glyphSortIndex(b.id)
      : (a, b)=>String(a.id).localeCompare(String(b.id));
    glyphInventory.sort(sortFn);
  }
  let hudNeedsRender = false;
  if(added > 0){
    profile.armory = normalizeArmory(armory);
    if(Array.isArray(world.profile?.armory)){
      world.profile.armory = profile.armory;
    }
    hudNeedsRender = true;
  }
  if(glyphAdded > 0){
    hudNeedsRender = true;
  }
  if(hudNeedsRender && world.state === 'map'){
    renderHUD(world);
  }
  if(typeof setMapMessage === 'function' && world.state === 'map'){
    const parts = [];
    if(added > 0){
      parts.push(`Added ${added} new item${added === 1 ? '' : 's'} to your armory.`);
    }
    if(glyphAdded > 0){
      parts.push(`Unlocked ${glyphAdded} new glyph${glyphAdded === 1 ? '' : 's'}.`);
    }
    const message = parts.length > 0 ? parts.join(' ') : 'All equipment and glyphs are already stored in your collection.';
    setMapMessage(world, message);
  }
  return added + glyphAdded;
}

function clearAllInventoryItems(world){
  if(!world || !world.profile) return 0;
  const profile = world.profile;
  const armory = Array.isArray(profile.armory) ? profile.armory : (profile.armory = []);
  const removedArmory = armory.length;
  armory.length = 0;
  const glyphInventory = ensureGlyphInventory(profile);
  const removedGlyphs = glyphInventory.length;
  glyphInventory.length = 0;
  const totalRemoved = removedArmory + removedGlyphs;
  if(!world.ui) world.ui = {};
  world.ui.mapAddAllGranted = false;
  if(world.state === 'map'){
    renderHUD(world);
  }
  if(typeof setMapMessage === 'function' && world.state === 'map'){
    const message = totalRemoved > 0
      ? 'Cleared all stored equipment and glyphs from your inventory.'
      : 'Inventory is already empty.';
    setMapMessage(world, message);
  }
  return totalRemoved;
}

function deleteAllPlayerData(world){
  if(!world) return false;
  const deleted = typeof deleteSaveData === 'function' ? deleteSaveData() : false;
  resetWorld(world);
  if(world?.ui) world.ui.mapAddAllGranted = null;
  if(typeof setMapMessage === 'function'){
    const message = deleted
      ? 'All saved progress deleted. Fresh profile created.'
      : 'No existing save data found. Fresh profile created.';
    setMapMessage(world, message);
  }
  renderHUD(world);
  renderSkillPanel(world);
  renderShopPanel(world);
  return deleted;
}

function applyDeveloperCheckbox(world, checkbox){
  if(!world || !checkbox) return;
  const gameplay = ensureGameplaySettings(world);
  const enabled = !!checkbox.checked;
  const previous = gameplay ? !!gameplay.developerMode : false;
  if(gameplay) gameplay.developerMode = enabled;
  if(enabled === previous) return;
  if(typeof setDeveloperMode === 'function'){
    setDeveloperMode(world, enabled);
  }
}

function togglePauseMenu(world, open){
  if(!world) return;
  if(!world.ui) world.ui = {};
  const shouldOpen = typeof open === 'boolean' ? open : !world.ui.menuOpen;
  if(shouldOpen && world.state !== 'level') return;
  const wasOpen = !!world.ui.menuOpen;
  world.ui.menuOpen = shouldOpen;
  const audio = window.audioSystem;
  if(wasOpen !== shouldOpen && audio && typeof audio.playEffect === 'function'){
    audio.playEffect(shouldOpen ? 'menuOpen' : 'menuClose');
  }
  if(shouldOpen){
    world.ui.menuTab = world.ui.menuTab || 'settings';
  }else{
    world.ui.menuTab = 'settings';
  }
  if(!shouldOpen) world.ui.confirmAction = null;
  hideKeyHintCursor(world);
  renderMenuOverlay(world);
  if(!shouldOpen){
    renderHUD(world);
  }
}

function setInventoryOpen(world, open){
  if(!world) return;
  if(!world.ui) world.ui = {};
  const shouldOpen = !!open;
  if(shouldOpen && world.ui.menuOpen){
    togglePauseMenu(world, false);
  }
  const wasOpen = !!world.ui.inventoryOpen;
  if(wasOpen === shouldOpen) return;
  if(!shouldOpen && world.ui.inventoryScrollDrag){
    const panel = world.ui.inventoryScrollDrag.panel;
    if(panel && panel.classList){
      panel.classList.remove('dragging');
    }
    world.ui.inventoryScrollDrag = null;
  }
  world.ui.inventoryOpen = shouldOpen;
  if(!shouldOpen){
    world.ui.inventoryScrollTop = 0;
  }
  const audio = window.audioSystem;
  if(audio && typeof audio.playEffect === 'function'){
    audio.playEffect(shouldOpen ? 'menuOpen' : 'menuClose');
  }
}

function isHubLevel(world){
  return !!(world?.levelState?.def && world.levelState.def.id === 'worldTree');
}

function handleMenuAction(world, action){
  if(!world || !action) return false;
  if(action === 'close-menu'){
    togglePauseMenu(world, false);
    return true;
  }
  if(action === 'request-exit'){
    if(isHubLevel(world)){
      world.ui.confirmAction = null;
      togglePauseMenu(world, false);
      abandonLevel(world, { preserveProgress: true });
      renderHUD(world);
    }else{
      world.ui.confirmAction = 'exit';
      renderMenuOverlay(world);
    }
    return true;
  }
  if(action === 'cancel-confirm'){
    world.ui.confirmAction = null;
    renderMenuOverlay(world);
    return true;
  }
  if(action === 'confirm-exit'){
    world.ui.confirmAction = null;
    togglePauseMenu(world, false);
    abandonLevel(world, { preserveProgress: isHubLevel(world) });
    renderHUD(world);
    return true;
  }
  return false;
}

function openSkillPanel(world, teamIndex=0, pedestal=null){
  if(!world?.ui) return;
  if(!world.ui.skillPanel){
    world.ui.skillPanel = { open:false, teamIndex:0, pedestal:null, renderSignature:null };
  }
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, (Array.isArray(world.team) ? world.team.length : 3));
  idx = clamp(idx, 0, Math.max(0, teamLimit-1));
  world.ui.skillPanel.open = true;
  world.ui.skillPanel.teamIndex = idx;
  world.ui.skillPanel.pedestal = pedestal || null;
  world.ui.skillPanel.renderSignature = null;
  world.ui.inventoryOpen = false;
  if(world.ui.menuOpen) togglePauseMenu(world, false);
  setHoveredSkillButton(world, null);
  hideKeyHintCursor(world);
  renderSkillPanel(world);
}

function closeSkillPanel(world){
  if(!world?.ui?.skillPanel) return;
  if(!world.ui.skillPanel.open) return;
  world.ui.skillPanel.open = false;
  world.ui.skillPanel.pedestal = null;
  world.ui.skillPanel.renderSignature = null;
  setHoveredSkillButton(world, null);
  hideKeyHintCursor(world);
  renderSkillPanel(world);
}

function buildSkillPanelData(world, requestedIndex){
  if(!world) return null;
  const stickTeam = Array.isArray(world.team) ? world.team : [];
  const profileTeam = typeof ensureTeamProfiles === 'function'
    ? ensureTeamProfiles(world.profile?.team || [])
    : (Array.isArray(world.profile?.team) ? world.profile.team : []);
  const teamLimit = typeof TEAM_SIZE === 'number'
    ? TEAM_SIZE
    : Math.max(1, Math.max(stickTeam.length, profileTeam.length, 1));
  let idx = (typeof requestedIndex === 'number' && Number.isFinite(requestedIndex))
    ? requestedIndex
    : parseInt(requestedIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = 0;
  idx = clamp(idx, 0, Math.max(0, teamLimit - 1));
  const stick = stickTeam[idx] || null;
  const profile = profileTeam[idx] || null;
  const stats = stick || profile;
  if(!stats) return null;
  const skillBase = typeof defaultSkillAllocations === 'function'
    ? defaultSkillAllocations()
    : { health:0, attack:0, defense:0 };
  const sourceAlloc = stats.skillAllocations || stats.skills || {};
  const allocations = {
    health: Math.max(0, Math.floor(sourceAlloc.health ?? skillBase.health ?? 0)),
    attack: Math.max(0, Math.floor(sourceAlloc.attack ?? skillBase.attack ?? 0)),
    defense: Math.max(0, Math.floor(sourceAlloc.defense ?? skillBase.defense ?? 0))
  };
  const available = Math.max(0, Math.floor(stats.skillPoints ?? 0));
  const spentTotal = allocations.health + allocations.attack + allocations.defense;
  const currentHealthMult = 1 + allocations.health;
  const currentAttackMult = 1 + allocations.attack;
  const currentDefenseMult = 1 + allocations.defense;
  const optionInfo = [
    { key: 'health', title: 'Fortify Vitality', current: currentHealthMult, spent: allocations.health },
    { key: 'attack', title: 'Sharpen Prowess', current: currentAttackMult, spent: allocations.attack },
    { key: 'defense', title: 'Bolster Guard', current: currentDefenseMult, spent: allocations.defense }
  ];
  const rawName = stick?.label ?? profile?.name ?? `Stick ${idx+1}`;
  const sanitizedName = typeof sanitizeStickName === 'function'
    ? sanitizeStickName(rawName)
    : String(rawName ?? '').trim();
  const displayName = sanitizedName || `Stick ${idx+1}`;
  const maxNameLength = typeof MAX_STICK_NAME_LENGTH === 'number' ? MAX_STICK_NAME_LENGTH : 18;
  const defaultColor = '#f0b35b';
  const colorSource = stick?.bodyColor ?? profile?.bodyColor ?? defaultColor;
  const safeColor = typeof safeHex === 'function' ? safeHex(colorSource) : colorSource;
  const colorValue = safeColor || defaultColor;
  const availableHeadShapes = typeof getAvailableHeadShapes === 'function'
    ? getAvailableHeadShapes()
    : ['square','circle','triangle','pentagon','hexagon','star'];
  const defaultHeadShape = (typeof DEFAULT_HEAD_SHAPE === 'string' && DEFAULT_HEAD_SHAPE) || 'square';
  const rawHeadShape = stick?.headShape ?? profile?.headShape ?? defaultHeadShape;
  let headShape = defaultHeadShape;
  if(typeof sanitizeHeadShape === 'function'){
    headShape = sanitizeHeadShape(rawHeadShape);
  }else{
    const normalized = typeof rawHeadShape === 'string' ? rawHeadShape.trim().toLowerCase() : '';
    headShape = availableHeadShapes.includes(normalized) ? normalized : defaultHeadShape;
  }
  const headShapeOptions = availableHeadShapes.map((shape)=>({
    value: shape,
    label: shape.charAt(0).toUpperCase() + shape.slice(1)
  }));
  const rosterData = profileTeam.map((entry, i)=>{
    const member = stickTeam[i] || null;
    const baseName = member?.label ?? entry?.name ?? `Stick ${i+1}`;
    const cleanName = typeof sanitizeStickName === 'function'
      ? sanitizeStickName(baseName)
      : String(baseName ?? '').trim();
    const finalName = cleanName || `Stick ${i+1}`;
    const rosterAlloc = member?.skillAllocations || entry?.skills || skillBase;
    const rosterAvailableRaw = member ? (member.skillPoints ?? 0) : (entry?.skillPoints ?? 0);
    const rosterAvailable = Math.max(0, Math.floor(rosterAvailableRaw ?? 0));
    const rosterSpent = Math.max(0, Math.floor(rosterAlloc?.health ?? 0))
      + Math.max(0, Math.floor(rosterAlloc?.attack ?? 0))
      + Math.max(0, Math.floor(rosterAlloc?.defense ?? 0));
    const rosterColorSource = member?.bodyColor ?? entry?.bodyColor ?? defaultColor;
    const rosterColor = (typeof safeHex === 'function' ? safeHex(rosterColorSource) : rosterColorSource) || defaultColor;
    const pointsLabel = `${rosterAvailable|0} pt${rosterAvailable === 1 ? '' : 's'}`;
    return {
      index: i,
      name: finalName,
      sanitizedName: cleanName,
      color: rosterColor,
      pointsLabel,
      spent: rosterSpent,
      available: rosterAvailable,
      isActive: i === idx
    };
  });
  const perLevel = typeof SKILL_POINTS_PER_LEVEL === 'number' ? SKILL_POINTS_PER_LEVEL : 1;
  const footerText = perLevel === 1
    ? 'Each level grants 1 skill point to every stick.'
    : `Each level grants ${perLevel} skill points to every stick.`;
  const reallocateDisabled = spentTotal <= 0;
  const signaturePayload = {
    idx,
    available,
    spent: spentTotal,
    allocations,
    displayName,
    sanitizedName,
    colorValue,
    headShape,
    roster: rosterData.map(item=>({
      index: item.index,
      name: item.name,
      color: item.color,
      available: item.available,
      spent: item.spent
    }))
  };
  const signature = JSON.stringify(signaturePayload);
  return {
    idx,
    allocations,
    available,
    spentTotal,
    optionInfo,
    sanitizedName,
    displayName,
    maxNameLength,
    colorValue,
    headShape,
    headShapeOptions,
    rosterData,
    footerText,
    reallocateDisabled,
    signature
  };
}

function refreshSkillPanelSignature(world){
  if(!world?.ui?.skillPanel?.open) return;
  const overlay = document.getElementById('skillOverlay');
  if(!overlay || !overlay.querySelector('.skill-panel')) return;
  const idxRaw = world.ui.skillPanel.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
  const data = buildSkillPanelData(world, idxRaw);
  if(!data) return;
  world.ui.skillPanel.teamIndex = data.idx;
  world.ui.skillPanel.renderSignature = data.signature;
  overlay.dataset.renderSignature = data.signature;
}

function handleSkillOverlayAction(world, overlay, target){
  if(!world || !overlay || !(target instanceof Element)) return false;
  if(target === overlay){
    closeSkillPanel(world);
    return true;
  }
  const actionBtn = target.closest('[data-skill-action]');
  if(actionBtn){
    if(actionBtn.disabled || actionBtn.getAttribute('aria-disabled') === 'disabled') return true;
    const action = actionBtn.getAttribute('data-skill-action');
    if(action === 'close'){
      closeSkillPanel(world);
    }else if(action === 'reallocate'){
      const idxRaw = world.ui?.skillPanel?.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
      const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
      if(resetStickSkills(world, idx)){
        renderHUD(world);
      }else{
        renderSkillPanel(world);
      }
    }
    return true;
  }
  const rosterBtn = target.closest('button[data-skill-team-index]');
  if(rosterBtn){
    const nextIdx = parseInt(rosterBtn.getAttribute('data-skill-team-index') ?? '0', 10);
    if(!Number.isNaN(nextIdx)){
      if(world.ui?.skillPanel) world.ui.skillPanel.teamIndex = nextIdx;
      renderSkillPanel(world);
    }
    return true;
  }
  const upgradeBtn = target.closest('button[data-skill-upgrade]');
  if(upgradeBtn){
    if(upgradeBtn.disabled || upgradeBtn.getAttribute('aria-disabled') === 'disabled' || upgradeBtn.classList.contains('disabled')){
      return true;
    }
    const stat = upgradeBtn.getAttribute('data-skill-upgrade');
    const idxRaw = world.ui?.skillPanel?.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
    const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
    if(spendSkillPoint(world, idx, stat)){
      renderHUD(world);
    }else{
      renderSkillPanel(world);
    }
    return true;
  }
  return false;
}

function renderSkillPanel(world){
  const overlay = document.getElementById('skillOverlay');
  if(!overlay) return;
  const panelState = world?.ui?.skillPanel;
  if(!world || !panelState?.open){
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    delete overlay.dataset.renderSignature;
    setHoveredSkillButton(world, null);
    hideKeyHintCursor(world);
    if(panelState) panelState.renderSignature = null;
    return;
  }
  const data = buildSkillPanelData(world, panelState.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0);
  if(!data){
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    delete overlay.dataset.renderSignature;
    panelState.open = false;
    panelState.renderSignature = null;
    return;
  }
  panelState.teamIndex = data.idx;
  overlay.classList.remove('hidden');
  if(panelState.renderSignature === data.signature
    && overlay.dataset.renderSignature === data.signature
    && overlay.querySelector('.skill-panel')){
    return;
  }
  const escapeHtml = (value)=>String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  setHoveredSkillButton(world, null);
  hideKeyHintCursor(world);
  const detailLabels = {
    health: 'Max HP multiplier',
    attack: 'Attack multiplier',
    defense: 'Defense multiplier'
  };
  const buttonsHtml = data.optionInfo.map(opt=>{
    const disabled = data.available <= 0 ? ' disabled' : '';
    const ariaDisabled = data.available <= 0 ? 'disabled' : '';
    const nextValue = opt.current + 1;
    const detailLabel = detailLabels[opt.key] || 'Multiplier';
    const detail = `${detailLabel}: ×${opt.current} → ×${nextValue}`;
    return `
      <button type="button" class="skill-option${disabled}" data-skill-upgrade="${opt.key}" ${ariaDisabled} data-key-hint="F">
        <div class="skill-option-title">${escapeHtml(opt.title)}</div>
        <div class="skill-option-detail">${escapeHtml(detail)} · Spent: ${opt.spent|0}</div>
      </button>
    `;
  }).join('');
  const headShapeOptionsHtml = data.headShapeOptions.map(opt=>{
    const selected = opt.value === data.headShape ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${selected}>${escapeHtml(opt.label)}</option>`;
  }).join('');
  const rosterHtml = data.rosterData.map(entry=>{
    const activeClass = entry.isActive ? ' is-active' : '';
    return `
      <button type="button" class="skill-roster-button${activeClass}" data-skill-team-index="${entry.index}">
        <span class="skill-roster-color" style="background:${escapeHtml(entry.color)}"></span>
        <span class="skill-roster-name">${escapeHtml(entry.name)}</span>
        <span class="skill-roster-points" title="Spent: ${entry.spent}">${escapeHtml(entry.pointsLabel)}</span>
      </button>
    `;
  }).join('');
  const reallocateDisabled = data.reallocateDisabled;
  overlay.innerHTML = `
    <div class="skill-panel">
      <button type="button" class="skill-close" data-skill-action="close" aria-label="Close skill menu" data-key-hint="F">×</button>
      <div class="skill-mentor">
        <div class="mentor-portrait"></div>
        <div class="mentor-dialog">
          <h2>Arbor Sage</h2>
          <p>The tome hums with power. Spend your skill points to grow stronger.</p>
        </div>
      </div>
      <div class="skill-body">
        <aside class="skill-roster">${rosterHtml}</aside>
        <div class="skill-main">
          <div class="skill-summary">
            <span class="skill-stick">${escapeHtml(data.displayName)}</span>
            <span class="skill-points">Skill Points: ${data.available}</span>
            <span class="skill-spent">Spent: ${data.spentTotal}</span>
          </div>
          <div class="skill-customization">
            <label class="skill-field">
              <span class="skill-field-label">Name</span>
              <input type="text" value="${escapeHtml(data.sanitizedName)}" maxlength="${data.maxNameLength}" data-skill-name>
            </label>
            <label class="skill-field">
              <span class="skill-field-label">Color</span>
              <input type="color" value="${escapeHtml(data.colorValue)}" data-skill-color>
            </label>
            <label class="skill-field">
              <span class="skill-field-label">Head</span>
              <select data-skill-head-shape>${headShapeOptionsHtml}</select>
            </label>
            <button type="button" class="skill-reallocate${reallocateDisabled ? ' disabled' : ''}" data-skill-action="reallocate" ${reallocateDisabled ? 'disabled' : ''}>Reallocate Points</button>
          </div>
          <div class="skill-options">${buttonsHtml}</div>
          <div class="skill-footer">${escapeHtml(data.footerText)}</div>
        </div>
      </div>
    </div>
  `;
  panelState.renderSignature = data.signature;
  overlay.dataset.renderSignature = data.signature;
  bindSkillPanelControls(world, overlay, data.idx);
}

function bindSkillPanelControls(world, overlay, activeIndex){
  if(!world || !overlay) return;
  const panel = overlay.querySelector('.skill-panel');
  if(!panel) return;
  const closeButton = panel.querySelector('button[data-skill-action="close"]');
  attachSkillButtonInteraction(world, closeButton, ()=>closeSkillPanel(world));
  const reallocateButton = panel.querySelector('button[data-skill-action="reallocate"]');
  attachSkillButtonInteraction(world, reallocateButton, ()=>{
    const idxRaw = world.ui?.skillPanel?.teamIndex ?? activeIndex ?? 0;
    const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
    if(resetStickSkills(world, idx)){
      renderHUD(world);
    }else{
      renderSkillPanel(world);
    }
  });
  const rosterButtons = panel.querySelectorAll('button[data-skill-team-index]');
  rosterButtons.forEach((btn)=>{
    const targetIndex = parseInt(btn.getAttribute('data-skill-team-index') ?? '0', 10);
    attachSkillButtonInteraction(world, btn, ()=>{
      if(Number.isNaN(targetIndex)) return;
      if(world.ui?.skillPanel) world.ui.skillPanel.teamIndex = targetIndex;
      renderSkillPanel(world);
    });
  });
  const upgradeButtons = panel.querySelectorAll('button[data-skill-upgrade]');
  upgradeButtons.forEach((btn)=>{
    const stat = btn.getAttribute('data-skill-upgrade');
    attachSkillButtonInteraction(world, btn, ()=>{
      if(!stat) return;
      const idxRaw = world.ui?.skillPanel?.teamIndex ?? activeIndex ?? 0;
      const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
      if(spendSkillPoint(world, idx, stat)){
        renderHUD(world);
      }else{
        renderSkillPanel(world);
      }
    });
  });
  const nameInput = panel.querySelector('input[data-skill-name]');
  if(nameInput){
    nameInput.addEventListener('input', ()=>{
      const idxRaw = world.ui?.skillPanel?.teamIndex ?? activeIndex ?? 0;
      const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
      const value = nameInput.value ?? '';
      renameStick(world, idx, value);
      const sanitized = typeof sanitizeStickName === 'function' ? sanitizeStickName(value) : String(value ?? '').trim();
      if(nameInput.value !== sanitized) nameInput.value = sanitized;
      const fallback = `Stick ${idx+1}`;
      const nameText = sanitized || fallback;
      const summary = panel.querySelector('.skill-summary .skill-stick');
      if(summary) summary.textContent = nameText;
      const rosterName = panel.querySelector(`button[data-skill-team-index="${idx}"] .skill-roster-name`);
      if(rosterName) rosterName.textContent = nameText;
      refreshSkillPanelSignature(world);
    });
    nameInput.addEventListener('focus', ()=>{
      setHoveredSkillButton(world, null);
      hideKeyHintCursor(world);
    });
  }
  const colorInput = panel.querySelector('input[data-skill-color]');
  if(colorInput){
    colorInput.addEventListener('input', ()=>{
      const idxRaw = world.ui?.skillPanel?.teamIndex ?? activeIndex ?? 0;
      const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
      const value = colorInput.value ?? '';
      setStickColor(world, idx, value);
      const rosterColor = panel.querySelector(`button[data-skill-team-index="${idx}"] .skill-roster-color`);
      if(rosterColor){
        const safeColor = typeof safeHex === 'function' ? safeHex(value) : value;
        rosterColor.style.backgroundColor = safeColor || '#f0b35b';
      }
      refreshSkillPanelSignature(world);
    });
    colorInput.addEventListener('focus', ()=>{
      setHoveredSkillButton(world, null);
      hideKeyHintCursor(world);
    });
  }
  const headShapeSelect = panel.querySelector('select[data-skill-head-shape]');
  if(headShapeSelect){
    const updateHeadShape = ()=>{
      const idxRaw = world.ui?.skillPanel?.teamIndex ?? activeIndex ?? 0;
      const idx = Number.isFinite(idxRaw) ? idxRaw : parseInt(idxRaw ?? 0, 10) || 0;
      const value = headShapeSelect.value ?? '';
      setStickHeadShape(world, idx, value);
      refreshSkillPanelSignature(world);
    };
    headShapeSelect.addEventListener('change', updateHeadShape);
    headShapeSelect.addEventListener('input', updateHeadShape);
    headShapeSelect.addEventListener('focus', ()=>{
      setHoveredSkillButton(world, null);
      hideKeyHintCursor(world);
    });
  }
}


function openShopPanel(world, teamIndex=0, vendor=null){
  if(!world?.ui) return;
  if(!world.ui.shopPanel) world.ui.shopPanel = { open:false, vendor:null, teamIndex:0, message:'' };
  let idx = (typeof teamIndex === 'number' && Number.isFinite(teamIndex)) ? teamIndex : parseInt(teamIndex ?? 0, 10);
  if(Number.isNaN(idx)) idx = world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, (Array.isArray(world.team) ? world.team.length : 3));
  idx = clamp(idx, 0, Math.max(0, teamLimit-1));
  world.ui.shopPanel.open = true;
  world.ui.shopPanel.vendor = vendor || null;
  world.ui.shopPanel.teamIndex = idx;
  world.ui.shopPanel.message = '';
  world.ui.inventoryOpen = false;
  if(world.ui){
    world.ui.shopScrollTop = 0;
    world.ui.shopScrollCarry = 0;
  }
  if(world.ui.menuOpen) togglePauseMenu(world, false);
  setHoveredShopButton(world, null);
  hideKeyHintCursor(world);
  renderShopPanel(world);
}

function closeShopPanel(world){
  if(!world?.ui?.shopPanel) return;
  if(!world.ui.shopPanel.open) return;
  world.ui.shopPanel.open = false;
  world.ui.shopPanel.vendor = null;
  world.ui.shopPanel.teamIndex = 0;
  world.ui.shopPanel.message = '';
  if(world.ui){
    world.ui.shopScrollTop = 0;
    world.ui.shopScrollCarry = 0;
  }
  setHoveredShopButton(world, null);
  hideKeyHintCursor(world);
  renderShopPanel(world);
}

function handleShopOverlayAction(world, overlay, target){
  if(!world || !overlay || !(target instanceof Element)) return false;
  if(target === overlay){
    closeShopPanel(world);
    return true;
  }
  const closeBtn = target.closest('[data-shop-action="close"]');
  if(closeBtn){
    closeShopPanel(world);
    return true;
  }
  const teamBtn = target.closest('button[data-shop-team-index]');
  if(teamBtn){
    const idx = parseInt(teamBtn.getAttribute('data-shop-team-index'), 10);
    if(!Number.isNaN(idx) && world.ui?.shopPanel){
      world.ui.shopPanel.teamIndex = idx;
      world.ui.shopPanel.message = '';
      renderShopPanel(world);
    }
    return true;
  }
  const buyBtn = target.closest('button[data-shop-purchase]');
  if(buyBtn){
    if(buyBtn.disabled || buyBtn.getAttribute('aria-disabled') === 'disabled' || buyBtn.classList.contains('disabled')) return true;
    const itemId = buyBtn.getAttribute('data-shop-purchase');
    const idx = world.ui?.shopPanel?.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
    if(typeof purchaseShopItem === 'function'){
      const result = purchaseShopItem(world, idx, itemId);
      if(result && world.ui?.shopPanel){
        world.ui.shopPanel.message = result.message || '';
        if(result.ok){
          renderHUD(world);
        }else{
          renderShopPanel(world);
        }
      }
    }
    return true;
  }
  return false;
}

function renderShopPanel(world){
  const overlay = document.getElementById('shopOverlay');
  if(!overlay) return;
  const panelState = world?.ui?.shopPanel;
  if(!world || !panelState?.open){
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    setHoveredShopButton(world, null);
    hideKeyHintCursor(world);
    return;
  }
  const escapeHtml = (value)=>String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const teamProfiles = ensureTeamProfiles(world.profile?.team || []);
  const teamLimit = typeof TEAM_SIZE === 'number' ? TEAM_SIZE : Math.max(1, teamProfiles.length || (Array.isArray(world.team) ? world.team.length : 3));
  let idx = panelState.teamIndex ?? world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
  idx = parseInt(idx, 10);
  if(Number.isNaN(idx)) idx = 0;
  idx = clamp(idx, 0, Math.max(0, teamLimit-1));
  panelState.teamIndex = idx;
  const selectedProfile = teamProfiles[idx] || null;
  const selectedStick = Array.isArray(world.team) ? world.team[idx] : null;
  const selectedHeld = (selectedStick && selectedStick.heldItem) || selectedProfile?.heldItem || null;
  const coins = world.coins ?? world.profile?.coins ?? 0;
  const vendor = panelState.vendor || {};
  const vendorName = vendor.vendorName || vendor.name || 'Canopy Vendor';
  const vendorText = vendor.description || 'A friendly merchant offers restorative tonics drawn from the World Tree.';
  const catalog = typeof listWorldTreeShopItems === 'function' ? listWorldTreeShopItems(world) : [];
  setHoveredShopButton(world, null);
  hideKeyHintCursor(world);
  const rosterHtml = teamProfiles.map((profile, index)=>{
    const classes = ['shop-team-member'];
    if(index === idx) classes.push('active');
    const stickRef = Array.isArray(world.team) ? world.team[index] : null;
    const held = (stickRef && stickRef.heldItem) || profile?.heldItem || null;
    const healText = held && Number.isFinite(held.heal) ? ` (${held.heal|0} HP)` : '';
    const heldLabel = held ? `${held.name || 'Item'}${healText}` : 'Empty slot';
    return `
      <button type="button" class="${classes.join(' ')}" data-shop-team-index="${index}" data-key-hint="F">
        <span class="shop-team-name">${escapeHtml(profile?.name || `Stick ${index+1}`)}</span>
        <span class="shop-team-item">${escapeHtml(heldLabel)}</span>
      </button>
    `;
  }).join('');
  const itemsHtml = catalog.length ? catalog.map(item=>{
    const price = Math.max(0, Math.round(item.price ?? 0));
    const canAfford = coins >= price;
    const slotFree = !selectedHeld;
    const disabled = !canAfford || !slotFree;
    const disabledAttr = disabled ? ' disabled' : '';
    const healText = Number.isFinite(item.heal) ? `Restores ${item.heal|0} HP` : '';
    let note = '';
    if(!slotFree){
      note = 'Selected stick is already holding an item.';
    }else if(!canAfford){
      note = 'Not enough coins.';
    }
    const noteHtml = note ? `<div class="shop-item-note">${escapeHtml(note)}</div>` : '';
    return `
      <div class="shop-item">
        <div class="shop-item-header">
          <span class="shop-item-name">${escapeHtml(item.name || 'Item')}</span>
          <span class="shop-item-price">${price} coin${price === 1 ? '' : 's'}</span>
        </div>
        <div class="shop-item-body">
          <div class="shop-item-icon" style="background:${escapeHtml(item.color || '#6be36b')}"></div>
          <div class="shop-item-details">
            <div>${escapeHtml(item.description || 'Restorative tonic.')}</div>
            ${healText ? `<div class="shop-item-heal">${escapeHtml(healText)}</div>` : ''}
          </div>
        </div>
        <button type="button" class="shop-buy" data-shop-purchase="${escapeHtml(item.id || '')}"${disabledAttr} data-key-hint="F">Buy for ${price}</button>
        ${noteHtml}
      </div>
    `;
  }).join('') : '<div class="shop-empty">The shop is currently out of stock.</div>';
  const messageHtml = panelState.message ? escapeHtml(panelState.message) : '';
  const heldSummary = selectedHeld ? `${selectedHeld.name || 'Item'} (${Number.isFinite(selectedHeld.heal) ? `${selectedHeld.heal|0} HP` : 'Single-use'})` : 'Empty item slot';
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="shop-panel">
      <button type="button" class="shop-close" data-shop-action="close" aria-label="Close shop" data-key-hint="F">×</button>
      <div class="shop-header">
        <div class="shop-portrait"></div>
        <div>
          <h2 class="shop-title">${escapeHtml(vendorName)}</h2>
          <p class="shop-description">${escapeHtml(vendorText)}</p>
        </div>
      </div>
      <div class="shop-coins">Coins: ${coins|0}</div>
      <div class="shop-team">${rosterHtml}</div>
      <div class="shop-items">${itemsHtml}</div>
      <div class="shop-message">${messageHtml}</div>
      <div class="shop-footer">Selected stick: ${escapeHtml(selectedProfile?.name || `Stick ${idx+1}`)} — ${escapeHtml(heldSummary)}. Press Q during a run to consume your held item.</div>
    </div>
  `;
  const panelEl = overlay.querySelector('.shop-panel');
  if(panelEl){
    const storedScroll = Number.isFinite(world?.ui?.shopScrollTop)
      ? Math.max(0, world.ui.shopScrollTop)
      : 0;
    const maxScroll = Math.max(panelEl.scrollHeight - panelEl.clientHeight, 0);
    const nextScroll = Math.min(storedScroll, maxScroll);
    panelEl.scrollTop = nextScroll;
    if(world?.ui){
      world.ui.shopScrollTop = panelEl.scrollTop || nextScroll || 0;
      world.ui.shopScrollCarry = 0;
    }
  }
}

function resolveTooltipAttackStat(context){
  const ctx = context || {};
  if(Number.isFinite(ctx.attackStat) && ctx.attackStat > 0) return ctx.attackStat;
  const computeFromAllocations = (allocations)=>{
    if(!allocations || typeof allocations !== 'object') return null;
    if(typeof skillMultipliersFromAllocations === 'function'){
      const multipliers = skillMultipliersFromAllocations(allocations);
      if(multipliers && Number.isFinite(multipliers.attack) && multipliers.attack > 0) return multipliers.attack;
    }
    const points = Number(allocations.attack);
    if(Number.isFinite(points)) return 1 + Math.max(0, points);
    return null;
  };
  const resolveStickAttack = (stick)=>{
    if(!stick) return null;
    if(Number.isFinite(stick.attack) && stick.attack > 0) return stick.attack;
    const base = Number.isFinite(stick.attackBase) && stick.attackBase > 0 ? stick.attackBase : 1;
    const equipmentBonus = Number.isFinite(stick.equipmentAttackBonus) ? stick.equipmentAttackBonus : 0;
    const baseWithEquipment = Math.max(0, base + equipmentBonus);
    let mult = null;
    if(typeof computeStickSkillMultipliers === 'function'){
      const multipliers = computeStickSkillMultipliers(stick);
      if(multipliers && Number.isFinite(multipliers.attack) && multipliers.attack > 0) mult = multipliers.attack;
    }
    if(mult == null){
      mult = computeFromAllocations(stick.skillAllocations);
    }
    const multiplier = Number.isFinite(mult) && mult > 0 ? mult : 1;
    const finalValue = baseWithEquipment > 0 ? baseWithEquipment * multiplier : multiplier;
    return finalValue > 0 ? finalValue : 1;
  };
  const stick = ctx.stick;
  if(stick){
    const value = resolveStickAttack(stick);
    if(value != null) return value;
  }
  const profile = ctx.profile;
  if(profile){
    const base = Number.isFinite(profile.attack) && profile.attack > 0
      ? profile.attack
      : (Number.isFinite(profile.attackBase) && profile.attackBase > 0 ? profile.attackBase : 1);
    const equipmentBonus = Number.isFinite(ctx.equipmentAttackBonus) ? ctx.equipmentAttackBonus : 0;
    const baseWithEquipment = Math.max(0, base + equipmentBonus);
    const mult = computeFromAllocations(profile.skillAllocations || profile.skills);
    const multiplier = Number.isFinite(mult) && mult > 0 ? mult : 1;
    const finalValue = baseWithEquipment > 0 ? baseWithEquipment * multiplier : multiplier;
    return Math.max(1, finalValue);
  }
  if(ctx.world){
    const world = ctx.world;
    const idx = Number.isFinite(ctx.index) ? ctx.index : (world.teamActiveIndex ?? world.profile?.activeIndex ?? 0);
    if(Array.isArray(world.team) && world.team[idx]){
      return resolveTooltipAttackStat({ stick: world.team[idx] });
    }
    const profiles = Array.isArray(world.profile?.team) ? world.profile.team : [];
    if(profiles[idx]){
      return resolveTooltipAttackStat({ profile: profiles[idx] });
    }
  }
  return 1;
}

function slotTooltipText(slot, context){
  if(!slot) return '';
  const ctx = context || {};
  const formatMultiplierLabel = (value)=>{
    if(!Number.isFinite(value)) return null;
    const rounded = Math.round(value * 100) / 100;
    const label = rounded.toString();
    return label.includes('.') ? label.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1') : label;
  };
  if(slot.type === 'glyph'){
    const glyph = glyphById(slot.id);
    if(!glyph) return 'Glyph';
    const lines = [`${glyph.name} (${glyph.symbol})`];
    if(glyph.description) lines.push(glyph.description);
    lines.push('Unique attunement — only one exists.');
    lines.push('Drag onto a Glyph weapon to attune it.');
    return lines.join('\n');
  }
  if(slot.mainHand !== undefined || slot.offHand !== undefined || slot.armor !== undefined){
    const parts = [];
    if(slot.mainHand) parts.push(slotTooltipText(slot.mainHand, ctx));
    if(slot.offHand) parts.push(slotTooltipText(slot.offHand, ctx));
    if(slot.armor) parts.push(slotTooltipText(slot.armor, ctx));
    return parts.filter(Boolean).join('\n\n');
  }
  if(slot.type === 'weapon'){
    const weapon = resolveWeaponWithGlyph(slot) || WEAPONS?.[slot.id];
    const baseWeapon = WEAPONS?.[slot.id];
    if(!weapon){
      return 'Weapon';
    }
    const lines = [];
    lines.push(weapon.name || 'Weapon');
    if(weapon.description){
      lines.push(weapon.description);
    }
    const stats = [];
    const elementKey = resolveWeaponElement(weapon, baseWeapon);
    const baseAttackValue = weaponBaseAttackValue(weapon) ?? weaponBaseAttackValue(baseWeapon || weapon);
    if(baseAttackValue != null){
      const attackStat = resolveTooltipAttackStat(ctx);
      const normalizedAttack = Number.isFinite(attackStat) && attackStat > 0 ? attackStat : 1;
      const baseLabel = formatBaseAttackValue(baseAttackValue);
      const totalValue = baseAttackValue * normalizedAttack;
      const totalLabel = formatBaseAttackValue(totalValue);
      stats.push(`Damage: {{weaponBase|${baseLabel}}} ({{weaponTotal|${totalLabel}}})`);
    }
    if(elementKey){
      stats.push(`Element: {{weaponElement|${elementKey}}}`);
    }
    const cooldownValue = (weapon.cooldown ?? weapon.cooldownMs ?? baseWeapon?.cooldown ?? baseWeapon?.cooldownMs);
    if(cooldownValue !== undefined){
      stats.push(`Cooldown: ${cooldownValue}ms`);
    }
    const rangeValue = (weapon.range ?? baseWeapon?.range);
    if(rangeValue !== undefined){
      stats.push(`Range: ${rangeValue}`);
    }
    if(stats.length) lines.push(stats.join(' · '));
    const defenseMultiplier = Number.isFinite(weapon.defenseMultiplier)
      ? weapon.defenseMultiplier
      : Number.isFinite(baseWeapon?.defenseMultiplier)
        ? baseWeapon.defenseMultiplier
        : null;
    const healthMultiplier = Number.isFinite(weapon.healthMultiplier)
      ? weapon.healthMultiplier
      : Number.isFinite(baseWeapon?.healthMultiplier)
        ? baseWeapon.healthMultiplier
        : null;
    if(defenseMultiplier !== null && Math.abs(defenseMultiplier - 1) > 1e-3){
      const formatted = formatMultiplierLabel(defenseMultiplier) || defenseMultiplier;
      lines.push(`Defense Multiplier: ×${formatted}`);
    }
    if(healthMultiplier !== null && Math.abs(healthMultiplier - 1) > 1e-3){
      const formatted = formatMultiplierLabel(healthMultiplier) || healthMultiplier;
      lines.push(`Health Multiplier: ×${formatted}`);
    }
    const grip = weaponGrip(weapon);
    if(grip === 'twoHand'){
      lines.push('Requires both hands.');
    }else if(grip === 'oneHand'){
      lines.push('One-handed weapon.');
    }
    if(weapon.templarianWallShield || baseWeapon?.templarianWallShield){
      lines.push('Bulwark: Redirects allied damage to the wielder while they stand.');
    }
    if(weaponSupportsGlyphSocket(baseWeapon)){
      const glyph = slot.glyph ? glyphById(slot.glyph) : null;
      lines.push('Glyph Socket: 1');
      if(glyph){
        lines.push(`Attuned Glyph: ${glyph.name} (${glyph.symbol})`);
        if(glyph.description) lines.push(glyph.description);
      }else{
        lines.push('Attunement: None. Drag a glyph here from the glyph bar.');
      }
    }
    if(slot.id === 'crumblingClaymore'){
      const config = baseWeapon?.crumbling || {};
      const minStrength = clamp(Number.isFinite(config.minStrength) ? config.minStrength : 0.3, 0, 1);
      const currentStrength = clamp(Number.isFinite(slot.crumblingStrength) ? slot.crumblingStrength : (weapon.crumblingStrength ?? 1), minStrength, 1);
      lines.push(`Potency Remaining: ${Math.round(currentStrength * 100)}%`);
      const decay = Number.isFinite(config.decayPerKill) ? config.decayPerKill : null;
      if(decay){
        lines.push(`Loses ${Math.round(decay * 100)}% per kill (min ${Math.round(minStrength * 100)}%).`);
      }
    }
    if(slot.id === 'auricDagger'){
      const auric = baseWeapon?.auric || {};
      if(Number.isFinite(auric.coinMultiplier)){
        const bonus = Math.round((Math.max(1, auric.coinMultiplier) - 1) * 100);
        lines.push(`Bonus Coin Yield: +${bonus}%`);
      }
      if(Number.isFinite(auric.potionBonus) && auric.potionBonus > 0){
        lines.push(`Potion Drop Chance +${Math.round(auric.potionBonus * 100)}%.`);
      }
      if(Number.isFinite(auric.extraPotionChance) && auric.extraPotionChance > 0){
        lines.push(`Extra Potion Chance: ${Math.round(auric.extraPotionChance * 100)}%.`);
      }
    }
    if(slot.id === 'photostigma'){
      lines.push('On hit: unleashes void lightning and umbral shrapnel bursts.');
    }
    if(weapon.kind === 'gun'){
      const capacity = Math.max(1, weapon.bulletCount || weapon.magazine || weapon.capacity || 6);
      const baseReload = Math.max(0, weapon.reloadMs ?? 2000);
      const fastReload = Math.max(1, weapon.fastReloadMs ?? 500);
      const rushRatio = fastReload > 0 ? Math.max(1, Math.round(baseReload / fastReload)) : 1;
      const rushCost = Math.max(1, Math.ceil((weapon.projectileDamage ?? weapon.dmg ?? 0) / 10));
      const secondsLabel = (ms)=>{
        if(!Number.isFinite(ms)) return '';
        const seconds = ms / 1000;
        if(Math.abs(Math.round(seconds) - seconds) < 0.001) return `${Math.round(seconds)}s`;
        return `${seconds.toFixed(1)}s`;
      };
      lines.push(`Ammo: ${capacity} round${capacity === 1 ? '' : 's'}.`);
      lines.push(`Regenerates 1 round every ${secondsLabel(baseReload)}.`);
      lines.push(`Each rushed reload costs ${rushCost} coin${rushCost === 1 ? '' : 's'}.`);
      lines.push(`**Press Q while hovering to spend coins and reload bullets x${rushRatio} faster.**`);
    }
    return lines.join('\n');
  }
  if(slot.type === 'offhand'){
    const info = OFFHAND_ITEMS?.[slot.id];
    if(!info) return 'Offhand Item';
    const lines = [info.name || 'Offhand'];
    if(info.description) lines.push(info.description);
    if(Number.isFinite(info.attackBonus)) lines.push(`Attack Bonus: +${info.attackBonus}`);
    if(Number.isFinite(info.defenseBonus)) lines.push(`Defense Bonus: +${info.defenseBonus}`);
    if(Number.isFinite(info.block)) lines.push(`Block: +${info.block}`);
    if(Number.isFinite(info.lightRadiusBonus) && info.lightRadiusBonus !== 0){
      const percentRaw = info.lightRadiusBonus * 100;
      const rounded = Math.round(percentRaw);
      const formatted = Math.abs(percentRaw - rounded) < 0.001
        ? `${rounded}`
        : percentRaw.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
      const sign = percentRaw >= 0 ? '+' : '';
      lines.push(`Light Radius Bonus: ${sign}${formatted}% in dark levels.`);
    }
    if(info.kind === 'scoutRemote'){
      lines.push('Press Q to deploy or detonate the scout drone.');
      lines.push('Reusable utility — not consumed on use.');
    }
    if(info.kind === 'drone'){
      const cooldown = Math.max(0, info.cooldownMs ?? 600);
      const seconds = cooldown > 0 ? (cooldown / 1000).toFixed(cooldown >= 1000 ? 0 : 1) : '0';
      const damage = info.projectileDamage ?? 0;
      const range = info.range ?? 0;
      lines.push(`Support drone fires at foes in line-of-sight (Damage: ${damage}, Range: ${range|0}).`);
      lines.push(`Releases a shot roughly every ${seconds.replace(/\.0$/, '')}s when a target is visible.`);
    }else if(info.kind === 'glyphOrbit'){
      const count = Math.max(1, info.glyphCount || 1);
      const damage = info.contactDamage ?? 0;
      const regen = Math.max(0, info.regenMs ?? 1500);
      const seconds = regen > 0 ? (regen / 1000).toFixed(regen >= 1000 ? 0 : 1) : '0';
      const glyphLabel = count === 1 ? 'An orbiting glyph' : `${count} orbiting glyphs`;
      const verb = count === 1 ? 'deals' : 'deal';
      lines.push(`${glyphLabel} ${verb} ${damage} contact damage then disperse.`);
      lines.push(`Each wisp reforms after ~${seconds.replace(/\.0$/, '')}s before striking again.`);
    }
    return lines.join('\n');
  }
  if(slot.type === 'armor'){
    const info = ARMOR_ITEMS?.[slot.id];
    if(!info) return 'Armor';
    const lines = [info.name || 'Armor'];
    if(info.description) lines.push(info.description);
    if(info.element){
      const elementLabel = typeof info.element === 'string' ? info.element.trim() : info.element;
      if(elementLabel){
        lines.push(`Element: {{weaponElement|${elementLabel}}}`);
      }
    }
    const baseDefense = Number.isFinite(info.defenseBonus)
      ? info.defenseBonus
      : (Number.isFinite(info.defense) ? info.defense : 0);
    let extraDefense = 0;
    const invested = Number.isFinite(slot.biofuseInvested) ? slot.biofuseInvested : 0;
    if(info.biofuse){
      const perFeed = Number.isFinite(info.biofuse.defensePerFeed) ? info.biofuse.defensePerFeed : 0;
      if(perFeed !== 0){
        extraDefense = invested * perFeed;
        if(Number.isFinite(info.biofuse.maxDefenseBonus)){
          extraDefense = Math.min(extraDefense, Math.max(0, info.biofuse.maxDefenseBonus - baseDefense));
        }
      }
    }
    const totalDefense = baseDefense + extraDefense;
    if(Number.isFinite(totalDefense) && totalDefense > 0){
      const formatted = totalDefense % 1 === 0 ? totalDefense.toFixed(0) : totalDefense.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      lines.push(`Defense Bonus: +${formatted}`);
    }
    if(info.biofuse){
      const coinCost = Math.max(1, Math.round(info.biofuse.coinCost ?? 5));
      const perFeed = Number.isFinite(info.biofuse.defensePerFeed) ? info.biofuse.defensePerFeed : 0;
      const perLabel = perFeed === 0 ? '0' : (perFeed % 1 === 0 ? perFeed.toFixed(0) : perFeed.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
      lines.push(`Shift+Q feeds ${coinCost} coin${coinCost === 1 ? '' : 's'} for +${perLabel} defense.`);
      lines.push(`Infusions: ${invested}`);
      if(Number.isFinite(info.biofuse.maxDefenseBonus)){
        lines.push(`Caps at +${info.biofuse.maxDefenseBonus} defense.`);
      }
    }
    if(Number.isFinite(info.lifeStealSharePercent) && info.lifeStealSharePercent > 0){
      const sharePercent = Math.round(clamp(info.lifeStealSharePercent, 0, 1) * 100);
      const radius = Math.round(info.lifeStealShareRadius ?? 200);
      lines.push(`Shares ${sharePercent}% lifesteal with allies within ${radius} units.`);
    }
    if(Number.isFinite(info.staffAuraRadiusMultiplier) && info.staffAuraRadiusMultiplier > 1){
      const bonus = Math.round((info.staffAuraRadiusMultiplier - 1) * 100);
      lines.push(`Staff Aura Radius: +${bonus}%`);
    }
    if(info.element && typeof info.element === 'string' && info.element.toLowerCase() === 'light'){
      lines.push('Light Radius Bonus: +100% in dark levels.');
    }
    return lines.join('\n');
  }
  if(slot.type === 'potion'){
    const heal = Number.isFinite(slot.heal) ? slot.heal|0 : 0;
    const lines = [];
    lines.push(slot.name ? String(slot.name) : 'Potion');
    if(heal > 0){
      lines.push(`Restores ${heal} HP`);
    }
    if(slot.description){
      lines.push(String(slot.description));
    }
    lines.push('Single-use consumable.');
    return lines.join('\n');
  }
  if(slot.name) return slot.name;
  if(slot.label) return slot.label;
  return '';
}

function renderHUD(world){
  const hud = document.getElementById('hud');
  const gameplaySettings = ensureGameplaySettings(world) || {};
  renderMenuOverlay(world);
  const profile = world.profile || {};
  if(!world.ui) world.ui = {};
  if(world.state !== 'map' && world.ui.mapToolsVisible){
    world.ui.mapToolsVisible = false;
  }
  if(world.state === 'map' && world.ui.mapAddAllGranted == null){
    world.ui.mapAddAllGranted = true;
    grantAllWeaponsToInventory(world);
  }
  const loadout = Array.isArray(profile.inventory) ? profile.inventory : (profile.inventory = []);
  while(loadout.length < TEAM_SIZE) loadout.push(createEquipmentSlot());
  const armory = Array.isArray(profile.armory) ? profile.armory : (profile.armory = []);
  const glyphInventory = ensureGlyphInventory(profile);
  const unlockedSlots = typeof getUnlockedTeamSlots === 'function'
    ? getUnlockedTeamSlots(world)
    : TEAM_SIZE;
  const normalizedLoadout = loadout.map(entry=>{
    if(entry && (entry.mainHand !== undefined || entry.offHand !== undefined || entry.armor !== undefined)) return entry;
    return createEquipmentSlot(entry);
  });
  const equippedGlyphs = new Set();
  const trackGlyph = (item)=>{
    if(item && item.type === 'weapon' && item.glyph && glyphById(item.glyph)){
      equippedGlyphs.add(item.glyph);
    }
  };
  normalizedLoadout.forEach(slotEntry=>{
    if(!slotEntry) return;
    trackGlyph(slotEntry.mainHand);
    trackGlyph(slotEntry.offHand);
    trackGlyph(slotEntry.armor);
  });
  armory.forEach(trackGlyph);
  let activeIndex = world.teamActiveIndex ?? profile.activeIndex ?? 0;
  activeIndex = clamp(activeIndex, 0, Math.max(0, unlockedSlots - 1));
  const teamProfiles = profile.team || [];
  const team = Array.isArray(world.team) ? world.team : [];
  let displayStick = null;
  if(world.state === 'level'){
    if(world.selected && !world.selected.dead){
      displayStick = world.selected;
    }else if(team.length){
      displayStick = team[activeIndex] || null;
    }
  }
  const stats = displayStick || teamProfiles[activeIndex] || teamProfiles[0] || null;
  if(!stats){
    hud.innerHTML='';
    renderSkillPanel(world);
    renderShopPanel(world);
    return;
  }
  const activeProfile = teamProfiles[activeIndex] || null;
  const activeHeldItem = (displayStick && displayStick.heldItem) || (activeProfile && activeProfile.heldItem) || null;
  const normalizedActive = normalizedLoadout[activeIndex] || createEquipmentSlot();
  const now = typeof nowMs === 'function' ? nowMs() : Date.now();
  const weaponItem = normalizedActive?.mainHand || null;
  const weapon = weaponItem?.type === 'weapon' ? (resolveWeaponWithGlyph(weaponItem) || WEAPONS[weaponItem.id]) : null;
  const offhandItem = normalizedActive?.offHand || null;
  const armorItem = normalizedActive?.armor || null;
  const cdLeft = displayStick ? Math.max(0, (displayStick.weaponCooldownUntil || 0) - now) : 0;
  const stageLabel = world.stageLabel || 'Stage';
  const coins = world.coins ?? 0;
  const xp = stats.xp ?? 0;
  const nextXp = stats.nextXp ?? 0;
  const hp = stats.hp ?? stats.maxHp ?? 0;
  const maxHp = stats.maxHp ?? hp;
  const equipmentBonuses = displayStick ? {
    attack: displayStick.equipmentAttackBonus ?? 0,
    defense: displayStick.equipmentDefenseBonus ?? 0
  } : (typeof computeEquipmentBonusesForSlot === 'function' ? computeEquipmentBonusesForSlot(normalizedActive) : { attack: 0, defense: 0 });
  const attackBase = displayStick ? (displayStick.attackBase ?? displayStick.attack ?? 0) : (stats.attack ?? 0);
  const defenseBase = displayStick ? (displayStick.defenseBase ?? displayStick.defense ?? 0) : (stats.defense ?? 0);
  const skillAllocations = displayStick?.skillAllocations || stats.skillAllocations || stats.skills || (typeof defaultSkillAllocations === 'function' ? defaultSkillAllocations() : { health:0, attack:0, defense:0 });
  const skillMultipliers = typeof skillMultipliersFromAllocations === 'function'
    ? skillMultipliersFromAllocations(skillAllocations)
    : {
        health: 1 + (skillAllocations.health ?? 0),
        attack: 1 + (skillAllocations.attack ?? 0),
        defense: 1 + (skillAllocations.defense ?? 0)
      };
  const attackSkillMult = Number.isFinite(skillMultipliers.attack) ? skillMultipliers.attack : 1;
  const defenseSkillMult = Number.isFinite(skillMultipliers.defense) ? skillMultipliers.defense : 1;
  const attackBaseStat = attackBase > 0 ? attackBase : 1;
  const attackEquipBonus = Number.isFinite(equipmentBonuses.attack) ? equipmentBonuses.attack : 0;
  const defenseBaseForRatio = defenseBase > 0 ? defenseBase : 1;
  const attackTotalMultiplier = (displayStick && Number.isFinite(displayStick.attack) && displayStick.attack > 0)
    ? displayStick.attack
    : Math.max(0, (attackBaseStat + attackEquipBonus) * attackSkillMult);
  const defenseTotalMultiplier = ((defenseBase + (equipmentBonuses.defense ?? 0)) / defenseBaseForRatio) * defenseSkillMult;
  const skillPoints = stats.skillPoints ?? 0;
  const heldItemLabel = (()=>{
    if(!activeHeldItem) return 'Empty';
    const name = activeHeldItem.name || 'Item';
    const heal = Number.isFinite(activeHeldItem.heal) ? `${activeHeldItem.heal|0} HP` : null;
    return heal ? `${name} (${heal})` : name;
  })();
  const inventoryOpen = !!world.ui.inventoryOpen;
  const storedCount = armory.reduce((sum, slot)=>slot ? sum + 1 : sum, 0);
  const badgeText = storedCount > 99 ? '99+' : String(storedCount);
  const canEditLoadout = typeof canModifyLoadout === 'function' ? canModifyLoadout(world) : false;
  const escapeAttr = (value)=>String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const escapeHtml = (value)=>String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
  if(world?.ui?.slotTooltipTarget && !document.body.contains(world.ui.slotTooltipTarget)){
    hideSlotTooltip(world);
  }
  const weaponSpriteMarkup = (item)=>{
    if(!item || item.type !== 'weapon') return '';
    const weaponId = item.id;
    if(!weaponId) return '';
    if(!world.ui.weaponSpriteCache) world.ui.weaponSpriteCache = {};
    const cache = world.ui.weaponSpriteCache;
    const glyphKey = item.glyph ? `${weaponId}:${item.glyph}` : weaponId;
    if(cache[glyphKey]) return cache[glyphKey];
    const weaponDef = resolveWeaponWithGlyph(item) || WEAPONS[weaponId];
    if(!weaponDef) return '';
    const size = 40;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx2d = canvas.getContext('2d');
    if(ctx2d && typeof drawWeaponInventorySprite === 'function'){
      ctx2d.clearRect(0, 0, size, size);
      drawWeaponInventorySprite(ctx2d, weaponId, weaponDef, { size });
      const dataUrl = canvas.toDataURL();
      const markup = `<span class="weapon-mini" style="background-image:url(${dataUrl});"></span>`;
      cache[glyphKey] = markup;
      return markup;
    }
    const fallbackColor = weaponDef.color || '#888';
    const fallback = `<span class="weapon-mini fallback" style="background:${fallbackColor}"></span>`;
    cache[glyphKey] = fallback;
    return fallback;
  };
  const slotIcon = (item)=>{
    if(!item) return '';
    if(item.type === 'weapon'){
      const sprite = weaponSpriteMarkup(item);
      const glyph = item.glyph ? glyphById(item.glyph) : null;
      const badge = glyph ? `<span class="glyph-badge" style="background:${glyph.badgeColor || 'rgba(255,255,255,0.16)'}; color:${glyph.color || '#fff'}">${glyph.symbol}</span>` : '';
      const baseWeapon = WEAPONS[item.id];
      const glyphReady = typeof weaponSupportsGlyphSocket === 'function' && weaponSupportsGlyphSocket(baseWeapon);
      const glyphMarker = glyphReady ? '<span class="glyph-weapon-marker" aria-hidden="true"></span>' : '';
      if(sprite){
        return `<span class="weapon-icon">${glyphMarker}${sprite}${badge}</span>`;
      }
      const weaponDef = resolveWeaponWithGlyph(item) || baseWeapon;
      const fallbackColor = weaponDef?.color || '#888';
      return `<span class="weapon-icon">${glyphMarker}<span class="weapon-mini fallback" style="background:${fallbackColor}"></span>${badge}</span>`;
    }
    let color = '#888';
    if(item.type === 'offhand'){
      const info = OFFHAND_ITEMS?.[item.id];
      if(item.id === 'scoutDroneRemote'){
        const base = info?.color || item.color || '#58d2ff';
        const accent = info?.accentColor || item.accentColor || '#123544';
        return `<span class="sIcon" style="background:${base}; border-radius:6px; position:relative; box-shadow:0 0 0 1px rgba(0,0,0,0.25) inset;"><span style="position:absolute; left:50%; top:50%; width:6px; height:6px; margin:-3px 0 0 -3px; border-radius:50%; background:${accent}; box-shadow:0 0 6px rgba(255,255,255,0.6);"></span></span>`;
      }
      color = info?.color || '#8aa4ff';
    }else if(item.type === 'armor'){
      const info = ARMOR_ITEMS?.[item.id];
      color = info?.color || '#bca98a';
    }else if(item.type === 'potion'){
      color = item.color || '#6be36b';
    }
    return `<span class="sIcon" style="background:${color}"></span>`;
  };
  const abilityState = typeof ensureTeamAbilityState === 'function' ? ensureTeamAbilityState(world) : null;
  const abilityDef = abilityState && typeof teamAbilityById === 'function'
    ? teamAbilityById(abilityState.abilityId)
    : (typeof resolveTeamAbility === 'function' ? resolveTeamAbility(world) : null);
  const abilityUnlocked = abilityDef
    ? (typeof isAbilityUnlocked === 'function' ? isAbilityUnlocked(world, abilityDef.id) : true)
    : false;
  let abilityTooltipText = abilityState && abilityDef && typeof teamAbilityTooltip === 'function'
    ? teamAbilityTooltip(world, abilityState)
    : (abilityDef ? abilityDef.name : null);
  if(abilityDef && !abilityUnlocked && !abilityTooltipText){
    abilityTooltipText = 'Locked — find a skill shrine to attune this ability.';
  }
  const abilityTooltipAttr = abilityTooltipText
    ? ` data-tooltip="${escapeAttr(abilityTooltipText).replace(/\n/g,'&#10;')}"`
    : '';
  const abilityCooldownMs = abilityDef?.cooldownMs ?? 0;
  const abilityCooldownRemaining = (!abilityUnlocked || !abilityState || !abilityDef)
    ? 0
    : (typeof teamAbilityCooldownRemaining === 'function'
      ? teamAbilityCooldownRemaining(world)
      : Math.max(0, (abilityState.cooldownUntil || 0) - now));
  const abilityCooldownRatio = (abilityUnlocked && abilityCooldownMs > 0)
    ? clamp(abilityCooldownRemaining / abilityCooldownMs, 0, 1)
    : 0;
  const abilityClasses = ['slot','ability-slot'];
  if(abilityState?.active) abilityClasses.push('active');
  if(abilityCooldownRatio > 0) abilityClasses.push('cooling');
  if(abilityDef && !abilityUnlocked) abilityClasses.push('locked');
  const abilityIconClass = abilityDef?.iconClass || 'ability-icon-generic';
  const abilityCooldownMarkup = abilityCooldownRatio > 0
    ? `<span class="ability-cooldown" style="height:${Math.round(abilityCooldownRatio * 100)}%;"></span>`
    : '';
  const abilityKeyLabel = abilityDef?.keyHint || 'E';
  const abilitySlotHtml = abilityDef
    ? `<div class="${abilityClasses.join(' ')}" data-slot-type="ability"${abilityTooltipAttr}><span class="ability-icon ${abilityIconClass}">${abilityCooldownMarkup}</span><span class="ability-key">${escapeHtml(abilityKeyLabel)}</span></div>`
    : '';
  const lockIconMarkup = '<span class="slot-lock-icon" aria-hidden="true"></span>';
  const loadoutSlotsHtml = normalizedLoadout.map((equipment,i)=>{
    const slotEquipment = equipment || createEquipmentSlot();
    const slotLocked = i >= unlockedSlots;
    const slotBonuses = (!slotLocked && typeof computeEquipmentBonusesForSlot === 'function')
      ? computeEquipmentBonusesForSlot(slotEquipment)
      : { attack: 0, defense: 0 };
    const mainItem = slotLocked ? null : (slotEquipment.mainHand || null);
    const offItem = slotLocked ? null : (slotEquipment.offHand || null);
    const armorPiece = slotLocked ? null : (slotEquipment.armor || null);
    const containerClasses = ['gear-slot'];
    if(i===activeIndex) containerClasses.push('sel');
    const mainClasses = ['slot','main-hand-slot'];
    const offClasses = ['slot','offhand-slot'];
    const armorClasses = ['slot','armor-slot'];
    const stick = slotLocked ? null : team[i];
    const heldItem = slotLocked ? null : ((stick && stick.heldItem) || (teamProfiles[i]?.heldItem ?? null));
    const tooltipContext = {
      world,
      stick,
      profile: teamProfiles[i] || null,
      index: i,
      equipmentAttackBonus: slotBonuses.attack
    };
    let fastBadge = '';
    if(!slotLocked && mainItem?.type === 'weapon'){
      const weaponDef = WEAPONS[mainItem.id];
      const fastReload = weaponDef?.kind === 'gun' && stick && typeof stick.isGunFastReloadActive === 'function' && stick.isGunFastReloadActive(mainItem.id);
      if(fastReload) fastBadge = '<span class="slot-fast-reload">$</span>';
      if(isTwoHandedWeaponItem(mainItem)){
        mainClasses.push('two-handed-item');
        offClasses.push('offhand-disabled');
      }
    }
    if(!slotLocked && offItem && offItem.type === 'offhand'){
      offClasses.push('offhand-item');
    }
    const tooltipAttrs = (text)=> text ? ` data-tooltip="${escapeAttr(text).replace(/\n/g,'&#10;')}"` : '';
    const lockedTooltipText = slotLocked
      ? (i === 1
        ? 'Locked — recruit the resting Stick on Stage 1-3 to unlock this slot.'
        : 'Locked — recruit the resting Stick on Stage 4-3 to unlock this slot.')
      : '';
    const mainTooltipText = slotLocked
      ? lockedTooltipText
      : (slotTooltipText(mainItem, tooltipContext) || 'Empty Main Hand Slot');
    let offTooltipText;
    if(slotLocked){
      offTooltipText = lockedTooltipText;
    }else{
      offTooltipText = slotTooltipText(offItem, tooltipContext);
      if(!offTooltipText){
        if(isTwoHandedWeaponItem(mainItem)){
          offTooltipText = 'Two-handed weapon equipped.\nOffhand unavailable.';
        }else{
          offTooltipText = 'Empty Offhand Slot';
        }
      }
    }
    const armorTooltipText = slotLocked
      ? lockedTooltipText
      : (slotTooltipText(armorPiece, tooltipContext) || 'Empty Armor Slot');
    const lockAttr = slotLocked ? ' data-locked="true"' : '';
    const mainTooltip = tooltipAttrs(mainTooltipText);
    const offTooltip = tooltipAttrs(offTooltipText);
    const armorTooltip = tooltipAttrs(armorTooltipText);
    const itemClasses = ['slot','item-slot'];
    if(slotLocked){
      containerClasses.push('locked-slot');
      mainClasses.push('slot-locked');
      offClasses.push('slot-locked');
      armorClasses.push('slot-locked');
      itemClasses.push('slot-locked');
    }else if(!heldItem){
      itemClasses.push('empty');
    }
    const itemTooltipText = slotLocked
      ? lockedTooltipText
      : (slotTooltipText(heldItem, tooltipContext) || 'Empty Item Slot');
    const itemTooltip = tooltipAttrs(itemTooltipText);
    const itemContent = slotLocked
      ? lockIconMarkup
      : (heldItem ? slotIcon(heldItem) : '<span class="item-empty">Empty</span>');
    const mainContent = slotLocked ? lockIconMarkup : `${slotIcon(mainItem)}${fastBadge}`;
    const offContent = slotLocked ? lockIconMarkup : slotIcon(offItem);
    const armorContent = slotLocked ? lockIconMarkup : slotIcon(armorPiece);
    return `
      <div class="${containerClasses.join(' ')}">
        <div class="${offClasses.join(' ')}" data-slot-type="loadout" data-slot-index="${i}" data-subslot="offHand"${lockAttr}${offTooltip}>${offContent}</div>
        <div class="${mainClasses.join(' ')}" data-slot-type="loadout" data-slot-index="${i}" data-subslot="mainHand"${lockAttr}${mainTooltip}>${mainContent}</div>
        <div class="${armorClasses.join(' ')}" data-slot-type="loadout" data-slot-index="${i}" data-subslot="armor"${lockAttr}${armorTooltip}>${armorContent}</div>
        <div class="${itemClasses.join(' ')}" data-slot-type="item" data-slot-index="${i}"${lockAttr}${itemTooltip}>${itemContent}</div>
      </div>
    `;
  }).join('');
  const glyphSlotsHtml = GLYPH_ORDER.map(id=>{
    const glyph = glyphById(id);
    const owned = glyphInventory.some(entry=>entry.id === id);
    const equipped = equippedGlyphs.has(id);
    const classes = ['slot','glyph-slot'];
    if(owned) classes.push('glyph-owned');
    else classes.push('glyph-locked');
    if(equipped) classes.push('glyph-equipped');
    const tooltipLines = [];
    if(glyph){
      tooltipLines.push(`${glyph.name} (${glyph.symbol})`);
      if(glyph.description) tooltipLines.push(glyph.description);
      if(owned){
        tooltipLines.push('Drag onto a Glyph weapon to attune it.');
      }else if(equipped){
        tooltipLines.push('Currently socketed on a weapon. Drag that weapon here to reclaim it.');
      }else{
        tooltipLines.push('Not yet acquired.');
      }
    }else{
      tooltipLines.push('Glyph');
    }
    const tooltipAttr = tooltipLines.length ? ` data-tooltip="${escapeAttr(tooltipLines.join('\n')).replace(/\n/g,'&#10;')}"` : '';
    const ownedAttr = owned ? ' data-glyph-owned="true"' : '';
    const equippedAttr = equipped ? ' data-glyph-equipped="true"' : '';
    const symbol = glyph ? glyph.symbol : '—';
    return `<div class="${classes.join(' ')}" data-slot-type="glyph" data-glyph-id="${id}"${ownedAttr}${equippedAttr}${tooltipAttr}><span class="glyph-symbol">${symbol}</span></div>`;
  }).join('');
  const glyphBar = inventoryOpen && GLYPH_ORDER.length ? `
    <div class="glyph-bar">
      <div class="glyph-bar-title">Glyphs</div>
      <div class="glyph-slot-row">${glyphSlotsHtml}</div>
      <div class="glyph-bar-note">Only one of each glyph exists. Drag to socket glyph-ready weapons.</div>
    </div>
  ` : '';
  const toggleClasses = ['slot','inventory-slot'];
  if(inventoryOpen) toggleClasses.push('sel');
  const inventoryBadge = storedCount>0 ? `<span class="slot-badge">${badgeText}</span>` : '';
  const inventoryToggle = `<div class="${toggleClasses.join(' ')}" data-slot-type="inventory-toggle"><span class="inventory-icon"></span>${inventoryBadge}</div>`;
  let inventoryPanel = '';
  if(inventoryOpen){
    const slotCount = Math.max(armory.length + 1, MIN_ARMORY_SLOTS);
    const panelSlots = [];
    const inventoryTooltipContext = {
      world,
      stick: displayStick || team[activeIndex] || null,
      profile: teamProfiles[activeIndex] || null,
      index: activeIndex,
      equipmentAttackBonus: Number.isFinite(equipmentBonuses.attack) ? equipmentBonuses.attack : 0
    };
    for(let i=0;i<slotCount;i++){
      const item = armory[i] || null;
      const tooltipText = slotTooltipText(item, inventoryTooltipContext) || 'Empty Inventory Slot';
      const tooltipAttr = tooltipText ? ` data-tooltip="${escapeAttr(tooltipText).replace(/\n/g,'&#10;')}"` : '';
      const classes = ['slot'];
      if(item?.type === 'weapon' && isTwoHandedWeaponItem(item)) classes.push('two-handed-item');
      if(item?.type === 'offhand') classes.push('offhand-item');
      panelSlots.push(`<div class="${classes.join(' ')}" data-slot-type="armory" data-slot-index="${i}"${tooltipAttr}>${slotIcon(item)}</div>`);
    }
    const emptyMessage = storedCount === 0 ? '<div class="inventory-empty">No stored weapons yet.</div>' : '';
    const note = !canEditLoadout ? '<div class="inventory-note">Inventory changes are currently locked.</div>' : '';
    const statEntries = [
      { label: 'Coins', value: coins },
      { label: 'XP', value: `${xp|0}/${nextXp|0}` },
      { label: 'HP', value: `${hp|0}/${maxHp|0}` },
      { label: 'Attack', value: formatMultiplierValue(attackTotalMultiplier) },
      { label: 'Defense', value: formatMultiplierValue(defenseTotalMultiplier) },
      { label: 'Skill Points', value: `${skillPoints|0}` },
      { label: 'Item', value: escapeHtml(heldItemLabel) }
    ];
    const statsGrid = statEntries.map(entry=>`
      <div class="inventory-stat">
        <span class="stat-icon ${entry.label.toLowerCase().replace(/\s+/g,'-')}"></span>
        <span class="inventory-stat-label">${entry.label}</span>
        <span class="inventory-stat-value">${entry.value}</span>
      </div>
    `).join('');
    const statsSection = `
      <div class="inventory-stats">
        <div class="inventory-stats-title">Stats</div>
        <div class="inventory-stats-grid">${statsGrid}</div>
      </div>
    `;
    let abilitiesSection = '';
    if(typeof abilityIds === 'function' && typeof abilityDefinitionById === 'function'){
      const abilityProfile = world.profile || (world.profile = {});
      const unlocks = typeof ensureAbilityUnlocks === 'function'
        ? ensureAbilityUnlocks(abilityProfile)
        : null;
      const unlockedAbilities = abilityIds()
        .map(id=>{
          const def = abilityDefinitionById(id);
          if(!def) return null;
          if(unlocks){
            if(!unlocks[id]) return null;
          }else if(typeof isAbilityUnlocked === 'function' && !isAbilityUnlocked(world, id)){
            return null;
          }
          return def;
        })
        .filter(Boolean);
      if(unlockedAbilities.length){
        const abilityItems = unlockedAbilities.map(ability=>{
          const iconClass = ability.iconClass || 'ability-icon-generic';
          const name = ability.name ? escapeHtml(ability.name) : escapeHtml(ability.id);
          const description = ability.description
            ? `<div class="inventory-ability-description">${escapeHtml(ability.description)}</div>`
            : '';
          const metaParts = [];
          if(ability.keyHint){
            metaParts.push(`<span class="inventory-ability-key">${escapeHtml(ability.keyHint)}</span>`);
          }
          if(ability.category){
            const categoryLabel = ability.category.charAt(0).toUpperCase() + ability.category.slice(1);
            metaParts.push(`<span class="inventory-ability-category">${escapeHtml(categoryLabel)}</span>`);
          }
          const metaLine = metaParts.length
            ? `<div class="inventory-ability-meta">${metaParts.join('<span class="inventory-ability-sep">&bull;</span>')}</div>`
            : '';
          return `
            <div class="inventory-ability">
              <span class="ability-icon ${iconClass}"></span>
              <div class="inventory-ability-details">
                <div class="inventory-ability-name">${name}</div>
                ${metaLine}
                ${description}
              </div>
            </div>
          `;
        }).join('');
        abilitiesSection = `
          <div class="inventory-abilities">
            <div class="inventory-abilities-title">Abilities</div>
            <div class="inventory-abilities-list">${abilityItems}</div>
          </div>
        `;
      }
    }
    inventoryPanel = `
      <div class="inventory-panel">
        <div class="inventory-panel-title">Inventory</div>
        <div class="inventory-grid">${panelSlots.join('')}</div>
        ${emptyMessage}
        ${note}
        ${glyphBar}
        ${abilitiesSection}
        ${statsSection}
      </div>
    `;
  }
  const unlockAllStages = !!gameplaySettings.unlockAllStages;
  const unlimitedHealth = !!gameplaySettings.unlimitedHealth;
  const mapAddAllGranted = !!world.ui.mapAddAllGranted;
  const allAbilitiesUnlocked = typeof areAllAbilitiesUnlocked === 'function'
    ? areAllAbilitiesUnlocked(world)
    : false;
  const secondStickUnlocked = unlockedSlots >= 2;
  const thirdStickUnlocked = unlockedSlots >= 3;
  const mapToolsVisible = world.state === 'map' && !!world.ui.mapToolsVisible;
  const mapToolsToggle = world.state === 'map' ? `
    <div class="menu-section map-dev-tools-toggle" style="margin-top:16px;">
      <div class="menu-toggle">
        <button type="button" class="menu-button dev-toggle-button ${mapToolsVisible ? 'active' : ''}" data-action="map-toggle-tools" data-key-hint="F">${mapToolsVisible ? 'Hide map tools' : 'Show map tools'}</button>
      </div>
    </div>
  ` : '';
  const abilityToggleControls = (()=>{
    if(typeof abilityIds !== 'function' || typeof abilityDefinitionById !== 'function') return '';
    const ids = abilityIds();
    if(!ids || !ids.length) return '';
    const profile = world.profile || (world.profile = {});
    const unlocks = typeof ensureAbilityUnlocks === 'function' ? ensureAbilityUnlocks(profile) : null;
    const buttons = ids.map(id=>{
      const def = abilityDefinitionById(id);
      if(!def) return '';
      const unlocked = unlocks ? !!unlocks[id] : (typeof isAbilityUnlocked === 'function' ? isAbilityUnlocked(world, id) : false);
      const name = escapeHtml(def.name || id);
      const className = unlocked ? 'menu-button dev-toggle-button active' : 'menu-button dev-toggle-button';
      const action = `map-toggle-ability-${id}`;
      const label = unlocked ? `Lock ${name}` : `Unlock ${name}`;
      return `
        <div class="menu-toggle" style="margin-top:6px;">
          <button type="button" class="${className}" data-action="${escapeAttr(action)}" data-key-hint="F">${label}</button>
        </div>
      `;
    }).filter(Boolean);
    if(!buttons.length) return '';
    return `
      <div class="menu-subsection map-dev-abilities" style="margin-top:10px;">
        <div class="legend map-dev-inline-label" style="font-weight:600;">Ability Unlocks</div>
        ${buttons.join('')}
      </div>
    `;
  })();
  const mapControls = world.state === 'map' && mapToolsVisible ? `
    <div class="menu-section map-dev-tools" style="margin-top:10px;">
      <h3 class="map-dev-title">Map Tools</h3>
      <div class="menu-toggle">
        <button type="button" class="menu-button dev-toggle-button ${unlockAllStages ? 'active' : ''}" data-action="map-unlock-all" data-key-hint="F">Unlock all stages</button>
      </div>
      <div class="menu-toggle" style="margin-top:10px;">
        <button type="button" class="menu-button dev-toggle-button ${mapAddAllGranted ? 'active' : ''}" data-action="map-add-all-weapons" data-key-hint="F">Add all equipment to inventory</button>
      </div>
      <div class="menu-toggle" style="margin-top:6px;">
        <button type="button" class="menu-button dev-toggle-button" data-action="map-clear-inventory" data-key-hint="F">Remove all inventory items</button>
      </div>
      <div class="menu-toggle" style="margin-top:10px;">
        <button type="button" class="menu-button dev-toggle-button ${unlimitedHealth ? 'active' : ''}" data-action="map-unlimited-health" data-key-hint="F">Unlimited health</button>
      </div>
      <div class="menu-toggle" style="margin-top:10px;">
        <button type="button" class="menu-button dev-toggle-button ${secondStickUnlocked ? 'active' : ''}" data-action="map-toggle-second-stick" data-key-hint="F">${secondStickUnlocked ? 'Lock second stick' : 'Unlock second stick'}</button>
      </div>
      <div class="menu-toggle" style="margin-top:6px;">
        <button type="button" class="menu-button dev-toggle-button ${thirdStickUnlocked ? 'active' : ''}" data-action="map-toggle-third-stick" data-key-hint="F">${thirdStickUnlocked ? 'Lock third stick' : 'Unlock third stick'}</button>
      </div>
      <div class="menu-toggle" style="margin-top:10px;">
        <button type="button" class="menu-button dev-toggle-button ${allAbilitiesUnlocked ? 'active' : ''}" data-action="map-toggle-abilities" data-key-hint="F">${allAbilitiesUnlocked ? 'Lock all abilities' : 'Unlock all abilities'}</button>
      </div>
      ${abilityToggleControls}
      <div class="menu-toggle" style="margin-top:10px;">
        <button type="button" class="menu-button dev-toggle-button" data-action="map-delete-save" data-key-hint="F">Delete all player data</button>
      </div>
      <div class="menu-toggle" style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        <span class="map-dev-inline-label" style="font-weight:600;">Level</span>
        <button type="button" class="menu-button dev-toggle-button" data-action="map-level-down" data-key-hint="F">-1 level</button>
        <button type="button" class="menu-button dev-toggle-button" data-action="map-level-up" data-key-hint="F">+1 level</button>
      </div>
      <div class="menu-toggle" style="margin-top:6px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
        <span class="map-dev-inline-label" style="font-weight:600;">Coins</span>
        <button type="button" class="menu-button dev-toggle-button" data-action="map-coins-remove" data-key-hint="F">-${MAP_DEV_COIN_STEP} coins</button>
        <button type="button" class="menu-button dev-toggle-button" data-action="map-coins-add" data-key-hint="F">+${MAP_DEV_COIN_STEP} coins</button>
      </div>
    </div>
  ` : '';
  hud.innerHTML = `
    <div class="row hud-top-row">
      <div class="pill">Stage: ${stageLabel}</div>
      ${world.state==='level' ? '<button type="button" class="menu-button" data-action="open-menu">Menu</button>' : ''}
    </div>
    <div class="row" id="invRow" style="margin-top:8px;">
      ${loadoutSlotsHtml}
      ${abilitySlotHtml}
      ${inventoryToggle}
    </div>
    ${inventoryPanel}
    <div style="margin-top:6px;" class="legend">Equipped: ${weapon? weapon.name : '—'} ${cdLeft>0? '(CD ' + (cdLeft/100|0)+'ms)': ''}</div>
    ${mapToolsToggle}
    ${mapControls}
  `;

  if(inventoryOpen){
    const panelEl = hud.querySelector('.inventory-panel');
    if(panelEl){
      const storedScroll = Number.isFinite(world.ui?.inventoryScrollTop)
        ? Math.max(0, world.ui.inventoryScrollTop)
        : 0;
      const maxScroll = Math.max(panelEl.scrollHeight - panelEl.clientHeight, 0);
      panelEl.scrollTop = Math.min(storedScroll, maxScroll);
      if(world.ui){
        world.ui.inventoryScrollTop = panelEl.scrollTop;
      }
    }
  }

  // One-time event delegation for inventory drag
  if(!world.ui.listenersAttached){
    const ghost = document.getElementById('dragGhost');
    ensureSlotTooltipElement(world);
    function setGhost(item){
      if(!item){ ghost.style.display='none'; return; }
      ghost.style.display='block';
      ghost.textContent = '';
      ghost.style.color = '#fff';
      if(item.type === 'glyph'){
        const glyph = glyphById(item.id);
        ghost.style.background = glyph?.badgeColor || 'rgba(255,255,255,0.18)';
        ghost.style.color = glyph?.color || '#fff';
        ghost.textContent = glyph?.symbol || '¤';
      }else if(item.type==='weapon'){
        const weaponDef = resolveWeaponWithGlyph(item) || WEAPONS[item.id];
        ghost.style.background = weaponDef?.color || '#888';
      }else if(item.type==='potion'){
        ghost.style.background = item.color || '#6be36b';
      }else{
        ghost.style.background = '#888';
      }
    }
    function clearHighlights(){ hud.querySelectorAll('.slot.drop-target').forEach(el=>el.classList.remove('drop-target')); }
    const resolveInventoryPanel = (target)=>{
      if(!(target instanceof Element)) return null;
      const panel = target.closest('.inventory-panel');
      if(panel && hud.contains(panel)) return panel;
      return null;
    };
    const applyInventoryPanelScroll = (panel, delta)=>{
      if(!panel) return false;
      const maxScroll = Math.max(panel.scrollHeight - panel.clientHeight, 0);
      if(maxScroll <= 0) return false;
      const current = panel.scrollTop || 0;
      const next = Math.min(Math.max(current + delta, 0), maxScroll);
      if(next !== current || delta !== 0){
        panel.scrollTop = next;
      }
      if(world?.ui){
        world.ui.inventoryScrollTop = panel.scrollTop || next || 0;
      }
      return next !== current;
    };
    const editableLoadout = ()=>typeof canModifyLoadout === 'function' ? canModifyLoadout(world) : false;
    function slotInfoFromElement(el){
      if(!el) return null;
      const type = el.getAttribute('data-slot-type');
      const locked = el.getAttribute('data-locked') === 'true';
      if(type === 'loadout' || type === 'armory'){
        const index = parseInt(el.getAttribute('data-slot-index'), 10);
        if(Number.isNaN(index)) return null;
        const subslot = el.getAttribute('data-subslot');
        return { type, index, subslot: subslot || null, locked };
      }
      if(type === 'ability'){
        return { type: 'ability', locked };
      }
      if(type === 'glyph'){
        const glyphId = el.getAttribute('data-glyph-id');
        const owned = el.getAttribute('data-glyph-owned') === 'true';
        const equipped = el.getAttribute('data-glyph-equipped') === 'true';
        return { type: 'glyph', glyphId, owned, equipped, locked };
      }
      if(type === 'item'){
        const index = parseInt(el.getAttribute('data-slot-index'), 10);
        if(Number.isNaN(index)) return null;
        return { type: 'item', index, locked };
      }
      if(type === 'inventory-toggle'){
        return { type, locked };
      }
      const legacyIndex = el.getAttribute('data-slot');
      if(legacyIndex != null){
        const index = parseInt(legacyIndex, 10);
        if(!Number.isNaN(index)) return { type: 'loadout', index, subslot: null, locked };
      }
      return null;
    }
    const mapDevButtonFromEvent = (event)=>{
      if(!event || world.state !== 'map') return null;
      const target = event.target instanceof Element ? event.target.closest('button[data-action^="map-"]') : null;
      return target && hud.contains(target) ? target : null;
    };
    hud.addEventListener('mousedown', (e)=>{
      const menuBtn = e.target.closest('.menu-button[data-action="open-menu"]');
      if(menuBtn){
        e.preventDefault();
        e.stopPropagation();
        togglePauseMenu(world, true);
        return;
      }
      const mapButton = mapDevButtonFromEvent(e);
      if(mapButton){
        const action = mapButton.getAttribute('data-action');
        if(action && performMapDevAction(world, action)){
          setHoveredMapDevAction(world, action, mapButton);
          e.preventDefault();
          return;
        }
      }
      if(world.ui.menuOpen) return;
      const targetEl = e.target instanceof Element ? e.target : null;
      if(!targetEl) return;
      const slotEl = targetEl.closest('.slot');
      const panelEl = resolveInventoryPanel(targetEl);
      if(panelEl && e.button === 0 && !slotEl){
        if(panelEl.scrollHeight > panelEl.clientHeight){
          world.ui.inventoryScrollDrag = {
            panel: panelEl,
            lastY: e.clientY
          };
          panelEl.classList.add('dragging');
          hideSlotTooltip(world);
          e.preventDefault();
        }
        return;
      }
      if(!slotEl) return;
      hideSlotTooltip(world);
      const info = slotInfoFromElement(slotEl);
      if(!info) return;
      if(info.locked) return;
      if(info.type === 'inventory-toggle'){
        e.preventDefault();
        e.stopPropagation();
        setInventoryOpen(world, !world.ui.inventoryOpen);
        renderHUD(world);
        return;
      }
      if(info.type === 'ability'){
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if(info.type === 'glyph'){
        if(!info.glyphId) return;
        const inventory = ensureGlyphInventory(world.profile || {});
        const index = inventory.findIndex(entry=>entry.id === info.glyphId);
        if(index === -1) return;
        const glyphItem = cloneGlyphItem({ type: 'glyph', id: info.glyphId });
        if(!glyphItem) return;
        hideSlotTooltip(world);
        world.ui.dragItem = { from: { type: 'glyphInventory', glyphId: info.glyphId, index }, item: glyphItem };
        setGhost(glyphItem);
        world.ui.dragPos = {x:e.clientX, y:e.clientY};
        ghost.style.left = (world.ui.dragPos.x-12)+'px';
        ghost.style.top = (world.ui.dragPos.y-12)+'px';
        e.preventDefault();
        return;
      }
      if(info.type === 'loadout'){
        if(!editableLoadout()) return;
        const loadoutArr = Array.isArray(world.profile?.inventory) ? world.profile.inventory : [];
        const rawSlot = loadoutArr[info.index];
        const slot = rawSlot && (rawSlot.mainHand !== undefined || rawSlot.offHand !== undefined || rawSlot.armor !== undefined) ? rawSlot : createEquipmentSlot(rawSlot);
        if(rawSlot !== slot && Array.isArray(world.profile?.inventory)){
          world.profile.inventory[info.index] = slot;
        }
        const subslot = info.subslot || 'mainHand';
        const item = slot?.[subslot];
        if(!item) return;
        const cloned = cloneEquipmentItem(item);
        if(!cloned) return;
        hideSlotTooltip(world);
        world.ui.dragItem = { from: { type: 'loadout', index: info.index, subslot }, item: cloned };
      }else if(info.type === 'armory'){
        const armoryArr = Array.isArray(world.profile?.armory) ? world.profile.armory : (world.profile.armory = []);
        const item = armoryArr[info.index];
        if(!item) return;
        const cloned = cloneEquipmentItem(item);
        if(!cloned) return;
        hideSlotTooltip(world);
        world.ui.dragItem = { from: { type: 'armory', index: info.index }, item: cloned };
      }else{
        return;
      }
      setGhost(world.ui.dragItem.item);
      world.ui.dragPos = {x:e.clientX, y:e.clientY};
      ghost.style.left = (world.ui.dragPos.x-12)+'px';
      ghost.style.top = (world.ui.dragPos.y-12)+'px';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e)=>{
      const scrollDrag = world.ui.inventoryScrollDrag;
      if(scrollDrag){
        let panel = scrollDrag.panel;
        if(!panel || !hud.contains(panel)){
          panel = hud.querySelector('.inventory-panel');
          scrollDrag.panel = panel;
          if(panel){
            panel.classList.add('dragging');
          }
        }
        if(panel){
          const deltaY = e.clientY - (scrollDrag.lastY ?? e.clientY);
          if(deltaY !== 0){
            applyInventoryPanelScroll(panel, deltaY);
          }
          scrollDrag.lastY = e.clientY;
        }
        if(world.ui.slotTooltipTarget){
          hideSlotTooltip(world);
        }
        e.preventDefault();
      }
      if(world.ui.dragItem){
        world.ui.dragPos = {x:e.clientX, y:e.clientY};
        ghost.style.left = (world.ui.dragPos.x-12)+'px';
        ghost.style.top = (world.ui.dragPos.y-12)+'px';
        clearHighlights();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el && el.closest ? el.closest('.slot') : null;
        const info = slotInfoFromElement(slotEl);
        if(slotEl && hud.contains(slotEl) && info && info.type !== 'inventory-toggle' && !info.locked){
          slotEl.classList.add('drop-target');
        }
        if(world.ui.slotTooltipTarget && (!slotEl || slotEl !== world.ui.slotTooltipTarget)){
          hideSlotTooltip(world);
        }
      }else if(world.ui.slotTooltipTarget){
        positionSlotTooltip(world, e.pageX, e.pageY);
      }
    });
    document.addEventListener('mousedown', (e)=>{
      if(!world?.ui?.inventoryOpen) return;
      const target = e.target instanceof Element ? e.target : null;
      if(!target) return;
      if(!hud) return;
      const panel = hud.querySelector('.inventory-panel');
      const toggle = hud.querySelector('[data-slot-type="inventory-toggle"]');
      const loadoutRow = hud.querySelector('#invRow');
      if(panel && panel.contains(target)) return;
      if(toggle && toggle.contains(target)) return;
      if(loadoutRow && loadoutRow.contains(target)) return;
      if(target.closest('.menu-button')) return;
      setInventoryOpen(world, false);
      renderHUD(world);
    });
    const releaseInventoryScrollDrag = ()=>{
      const drag = world.ui.inventoryScrollDrag;
      if(!drag) return;
      const panel = drag.panel && hud.contains(drag.panel) ? drag.panel : hud.querySelector('.inventory-panel');
      if(panel){
        panel.classList.remove('dragging');
        if(world.ui){
          world.ui.inventoryScrollTop = panel.scrollTop || 0;
        }
      }
      world.ui.inventoryScrollDrag = null;
    };
    const handleInventoryWheel = (e)=>{
      if(!world?.ui?.inventoryOpen) return;
      let panel = resolveInventoryPanel(e.target);
      if(!panel && typeof e.clientX === 'number' && typeof e.clientY === 'number'){
        const hovered = document.elementFromPoint(e.clientX, e.clientY);
        panel = resolveInventoryPanel(hovered);
      }
      if(!panel){
        const hoveredPanel = hud.querySelector('.inventory-panel:hover');
        if(hoveredPanel) panel = hoveredPanel;
      }
      if(!panel) return;
      const deltaMode = typeof e.deltaMode === 'number' ? e.deltaMode : 0;
      const wheelEventCtor = typeof WheelEvent === 'function' ? WheelEvent : null;
      const lineMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_LINE : 1;
      const pageMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_PAGE : 2;
      let delta = e.deltaY || 0;
      if(deltaMode === lineMode){
        delta *= 24;
      }else if(deltaMode === pageMode){
        delta = delta > 0 ? panel.clientHeight : -panel.clientHeight;
      }
      if(!applyInventoryPanelScroll(panel, delta)) return;
      if(world.ui.slotTooltipTarget){
        hideSlotTooltip(world);
      }
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('mouseup', (e)=>{
      if(world.ui.inventoryScrollDrag){
        releaseInventoryScrollDrag();
      }
      if(!world.ui.dragItem) return;
      const drag = world.ui.dragItem;
      world.ui.dragItem = null;
      ghost.style.display='none';
      clearHighlights();
      const loadout = Array.isArray(world.profile?.inventory) ? world.profile.inventory : [];
      const armory = Array.isArray(world.profile?.armory) ? world.profile.armory : (world.profile.armory = []);
      const editable = editableLoadout();
      let loadoutChanged = false;
      let armoryChanged = false;
      const ensureSlot = (index)=>{
        const raw = loadout[index];
        const slot = raw && (raw.mainHand !== undefined || raw.offHand !== undefined || raw.armor !== undefined) ? raw : createEquipmentSlot(raw);
        if(raw !== slot) loadout[index] = slot;
        return slot;
      };
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el && el.closest ? el.closest('.slot') : null;
      const info = slotInfoFromElement(slotEl);
      const profileRef = world.profile || {};
      ensureGlyphInventory(profileRef);
      let draggedEquipment = null;
      let draggedGlyph = null;
      if(drag.item && drag.item.type === 'glyph'){
        draggedGlyph = cloneGlyphItem(drag.item);
      }else{
        draggedEquipment = cloneEquipmentItem(drag.item);
      }
      let handled = false;
      if(info && slotEl && hud.contains(slotEl)){
        if(info.locked){
          handled = true;
        }else if(info.type === 'inventory-toggle'){
          setInventoryOpen(world, !world.ui.inventoryOpen);
          handled = true;
        }else if(info.type === 'glyph'){
          handled = true;
          if(draggedEquipment && draggedEquipment.type === 'weapon' && draggedEquipment.glyph){
            const glyphId = draggedEquipment.glyph;
            if(drag.from.type === 'loadout'){
              const sourceSlot = ensureSlot(drag.from.index);
              const sourceSubslot = drag.from.subslot || 'mainHand';
              const sourceItem = sourceSlot?.[sourceSubslot];
              if(sourceItem && sourceItem.type === 'weapon' && sourceItem.glyph === glyphId){
                const updated = cloneEquipmentItem(sourceItem) || { ...sourceItem };
                updated.glyph = null;
                sourceSlot[sourceSubslot] = updated;
                applyMainHandConstraints(sourceSlot);
                loadoutChanged = true;
              }
            }else if(drag.from.type === 'armory'){
              const idx = drag.from.index;
              if(idx >= 0 && idx < armory.length){
                const sourceItem = armory[idx];
                if(sourceItem && sourceItem.type === 'weapon' && sourceItem.glyph === glyphId){
                  const updated = cloneEquipmentItem(sourceItem) || { ...sourceItem };
                  updated.glyph = null;
                  armory[idx] = updated;
                  armoryChanged = true;
                }
              }
            }
            addGlyphToInventory(profileRef, glyphId);
          }
        }else if(info.type === 'loadout'){
          if(draggedGlyph){
            handled = true;
            if(editable){
              const targetSlot = ensureSlot(info.index);
              const targetSubslot = info.subslot || 'mainHand';
              if(targetSubslot === 'mainHand'){
                const weaponItem = targetSlot?.mainHand;
                if(weaponItem && weaponItem.type === 'weapon' && weaponSupportsGlyphSocket(WEAPONS[weaponItem.id])){
                  const glyphId = draggedGlyph.id;
                  const previousGlyph = weaponItem.glyph || null;
                  if(previousGlyph !== glyphId){
                    if(previousGlyph) addGlyphToInventory(profileRef, previousGlyph);
                    if(drag.from.type === 'glyphInventory') removeGlyphFromInventory(profileRef, glyphId);
                    const updated = cloneEquipmentItem(weaponItem) || { ...weaponItem };
                    updated.glyph = glyphId;
                    targetSlot.mainHand = updated;
                    applyMainHandConstraints(targetSlot);
                    loadoutChanged = true;
                  }
                }
              }
            }
          }else if(draggedEquipment){
            if(editable){
              const targetSlot = ensureSlot(info.index);
              const targetSubslot = info.subslot || 'mainHand';
              if(drag.from.type === 'loadout'){
                const sourceSlot = ensureSlot(drag.from.index);
                const sourceSubslot = drag.from.subslot || 'mainHand';
                if(sourceSubslot === targetSubslot && drag.from.index !== info.index){
                  if(canEquipItemInSubslot(draggedEquipment, targetSubslot, targetSlot)){
                    const existingTarget = targetSlot[targetSubslot] ? cloneEquipmentItem(targetSlot[targetSubslot]) : null;
                    const canReturn = !existingTarget || canEquipItemInSubslot(existingTarget, sourceSubslot, sourceSlot);
                    if(canReturn){
                      targetSlot[targetSubslot] = cloneEquipmentItem(draggedEquipment);
                      applyMainHandConstraints(targetSlot);
                      sourceSlot[sourceSubslot] = existingTarget ? cloneEquipmentItem(existingTarget) : null;
                      applyMainHandConstraints(sourceSlot);
                      loadoutChanged = true;
                    }
                  }
                }
              }else if(drag.from.type === 'armory'){
                if(canEquipItemInSubslot(draggedEquipment, targetSubslot, targetSlot)){
                  const replacement = targetSlot[targetSubslot] ? cloneEquipmentItem(targetSlot[targetSubslot]) : null;
                  targetSlot[targetSubslot] = cloneEquipmentItem(draggedEquipment);
                  applyMainHandConstraints(targetSlot);
                  if(replacement){
                    armory[drag.from.index] = replacement;
                  }else{
                    armory.splice(drag.from.index, 1);
                  }
                  loadoutChanged = true;
                  armoryChanged = true;
                }
              }
            }
          }
        }else if(info.type === 'armory'){
          if(draggedGlyph){
            handled = true;
            const armoryIndex = info.index;
            if(armoryIndex >= 0 && armoryIndex < armory.length){
              const target = armory[armoryIndex];
              if(target && target.type === 'weapon' && weaponSupportsGlyphSocket(WEAPONS[target.id])){
                const glyphId = draggedGlyph.id;
                const previousGlyph = target.glyph || null;
                if(previousGlyph !== glyphId){
                  if(previousGlyph) addGlyphToInventory(profileRef, previousGlyph);
                  if(drag.from.type === 'glyphInventory') removeGlyphFromInventory(profileRef, glyphId);
                  const updated = cloneEquipmentItem(target) || { ...target };
                  updated.glyph = glyphId;
                  armory[armoryIndex] = updated;
                  armoryChanged = true;
                }
              }
            }
          }else if(draggedEquipment){
            if(drag.from.type === 'loadout'){
              if(editable){
                const sourceSlot = ensureSlot(drag.from.index);
                const sourceSubslot = drag.from.subslot || 'mainHand';
                const sourceItem = sourceSlot?.[sourceSubslot];
                if(sourceItem){
                  if(info.index >= armory.length){
                    armory.push(cloneEquipmentItem(sourceItem));
                    sourceSlot[sourceSubslot] = null;
                    applyMainHandConstraints(sourceSlot);
                    loadoutChanged = true;
                    armoryChanged = true;
                  }else{
                    const existing = armory[info.index];
                    if(!existing || canEquipItemInSubslot(existing, sourceSubslot, sourceSlot)){
                      armory[info.index] = cloneEquipmentItem(sourceItem);
                      sourceSlot[sourceSubslot] = existing ? cloneEquipmentItem(existing) : null;
                      applyMainHandConstraints(sourceSlot);
                      loadoutChanged = true;
                      armoryChanged = true;
                    }
                  }
                }
              }
            }else if(drag.from.type === 'armory'){
              const fromIdx = drag.from.index;
              const toIdx = info.index;
              const originalLength = armory.length;
              if(fromIdx >= 0 && fromIdx < originalLength && (toIdx !== fromIdx || toIdx >= originalLength)){
                const [item] = armory.splice(fromIdx, 1);
                if(item){
                  if(toIdx >= originalLength){
                    armory.push(item);
                  }else{
                    let insertIndex = toIdx;
                    if(insertIndex > fromIdx) insertIndex = Math.max(0, insertIndex - 1);
                    insertIndex = clamp(insertIndex, 0, armory.length);
                    armory.splice(insertIndex, 0, item);
                  }
                  armoryChanged = true;
                }
              }
            }
          }
        }
      }else if(editable && draggedEquipment){
        const activeIdx = world.teamActiveIndex ?? world.profile?.activeIndex ?? 0;
        const anchor = world.selected || (Array.isArray(world.team) ? world.team[activeIdx] : null);
        let dropped = false;
        if(anchor){
          dropped = dropItemFromInventory(draggedEquipment, world, anchor);
          if(dropped && draggedEquipment.type === 'weapon' && draggedEquipment.glyph){
            addGlyphToInventory(profileRef, draggedEquipment.glyph);
          }
        }
        if(dropped){
          if(drag.from.type === 'loadout'){
            const sourceSlot = ensureSlot(drag.from.index);
            const sourceSubslot = drag.from.subslot || 'mainHand';
            sourceSlot[sourceSubslot] = null;
            applyMainHandConstraints(sourceSlot);
            loadoutChanged = true;
          }else if(drag.from.type === 'armory'){
            if(drag.from.index >= 0 && drag.from.index < armory.length){
              armory.splice(drag.from.index, 1);
              armoryChanged = true;
            }
          }
        }
      }else if(draggedGlyph){
        handled = true;
      }
      if(armoryChanged){
        world.profile.armory = normalizeArmory(world.profile.armory);
      }
      if(loadoutChanged){
        syncTeamLoadout(world);
      }
      if(loadoutChanged && draggedEquipment?.type === 'weapon' && info && info.type === 'loadout'){
        const audio = window.audioSystem;
        if(audio && typeof audio.playEffect === 'function'){
          audio.playEffect('weaponPickup');
        }
      }
      if(armoryChanged || loadoutChanged || (info && (info.type === 'inventory-toggle' || info.type === 'glyph'))){
        renderHUD(world);
      }
      if(world.ui.slotTooltipTarget){
        hideSlotTooltip(world);
      }
    });
    hud.addEventListener('wheel', handleInventoryWheel, { passive: false });
    document.addEventListener('wheel', (event)=>{
      if(world?.ui?.inventoryScrollDrag) event.preventDefault();
    }, { passive: false });
    window.addEventListener('blur', ()=>{
      if(world.ui.inventoryScrollDrag){
        releaseInventoryScrollDrag();
      }
    });
    hud.addEventListener('mouseover', (e)=>{
      const mapButton = mapDevButtonFromEvent(e);
      if(mapButton){
        setHoveredMapDevAction(world, mapButton.getAttribute('data-action'), mapButton);
      }
      if(world.ui.dragItem) return;
      const slotEl = e.target.closest('.slot');
      if(!slotEl || !hud.contains(slotEl)) return;
      if(world?.ui){
        world.ui.inventoryHoverElement = slotEl;
        world.ui.inventoryHoverInfo = slotInfoFromElement(slotEl);
      }
      const tooltipAttr = slotEl.getAttribute('data-tooltip');
      if(!tooltipAttr) return;
      const text = tooltipAttr.replace(/&#10;/g, '\n');
      showSlotTooltip(world, slotEl, text, e.pageX, e.pageY);
    });
    hud.addEventListener('mouseout', (e)=>{
      if(world.state === 'map'){
        const mapButton = e.target instanceof Element ? e.target.closest('button[data-action^="map-"]') : null;
        const related = e.relatedTarget instanceof Element ? e.relatedTarget.closest('button[data-action^="map-"]') : null;
        if(mapButton && mapButton !== related){
          setHoveredMapDevAction(world, null, null);
        }else if(!related || !hud.contains(related)){
          setHoveredMapDevAction(world, null, null);
        }
      }
      if(!world.ui.slotTooltipTarget) return;
      const current = world.ui.slotTooltipTarget;
      const related = e.relatedTarget;
      const leavingSlot = current.contains(e.target);
      const stayingOnSlot = related && current.contains(related);
      const stayingOnHud = related && hud.contains(related);
      if(leavingSlot && !stayingOnSlot){
        hideSlotTooltip(world);
        if(world.ui){
          world.ui.inventoryHoverElement = null;
          world.ui.inventoryHoverInfo = null;
        }
      }else if(!leavingSlot && !stayingOnHud){
        hideSlotTooltip(world);
        if(world.ui){
          world.ui.inventoryHoverElement = null;
          world.ui.inventoryHoverInfo = null;
        }
      }
    });
    hud.addEventListener('mousemove', (e)=>{
      if(world.state === 'map'){
        const mapButton = mapDevButtonFromEvent(e);
        const action = mapButton ? mapButton.getAttribute('data-action') : null;
        setHoveredMapDevAction(world, action, mapButton);
      }
      if(world.ui.inventoryScrollDrag) return;
      if(world?.ui){
        const slotEl = e.target.closest('.slot');
        if(slotEl && hud.contains(slotEl)){
          world.ui.inventoryHoverElement = slotEl;
          world.ui.inventoryHoverInfo = slotInfoFromElement(slotEl);
        }else if(!slotEl){
          world.ui.inventoryHoverElement = null;
          world.ui.inventoryHoverInfo = null;
        }
      }
      if(world.ui.dragItem) return;
      if(!world.ui.slotTooltipTarget) return;
      if(!hud.contains(world.ui.slotTooltipTarget)) return;
      positionSlotTooltip(world, e.pageX, e.pageY);
    });
    hud.addEventListener('click', (e)=>{
      if(e.defaultPrevented) return;
      const mapButton = mapDevButtonFromEvent(e);
      if(mapButton){
        const action = mapButton.getAttribute('data-action');
        if(action && performMapDevAction(world, action)){
          setHoveredMapDevAction(world, action, mapButton);
          e.preventDefault();
          return;
        }
      }
      if(world.ui.dragItem) return;
      const slotEl = e.target.closest('.slot');
      if(!slotEl) return;
      const info = slotInfoFromElement(slotEl);
      if(!info) return;
      if(info.locked) return;
      if(info.type === 'item'){
        if(world.state === 'level'){
          const team = Array.isArray(world.team) ? world.team : [];
          const stick = team[info.index] || null;
          if(stick && typeof stick.useHeldItem === 'function' && stick.useHeldItem(world)){
            renderHUD(world);
          }
        }
        return;
      }
      if(info.type === 'loadout'){
        selectTeamMember(world, info.index);
        renderHUD(world);
      }
    });
    document.addEventListener('mouseleave', (e)=>{
      if(e.target === document && world.ui.inventoryScrollDrag){
        releaseInventoryScrollDrag();
      }
    });
    window.addEventListener('blur', ()=>{
      if(world.ui.inventoryScrollDrag){
        releaseInventoryScrollDrag();
      }
    });
    hud.addEventListener('change', (e)=>{
      const mapToggle = resolveCheckboxTarget(e, 'input[type="checkbox"][data-action="map-unlock-all"]');
      if(mapToggle){
        applyMapUnlockCheckbox(world, mapToggle);
        return;
      }
      const unlimitedToggle = resolveCheckboxTarget(e, 'input[type="checkbox"][data-action="map-unlimited-health"]');
      if(unlimitedToggle){
        applyUnlimitedHealthCheckbox(world, unlimitedToggle);
        return;
      }
    });
    const overlay = document.getElementById('menuOverlay');
    if(overlay){
      overlay.addEventListener('click', (e)=>{
        const tabButton = e.target.closest('[data-menu-tab]');
        if(tabButton){
          const nextTab = tabButton.getAttribute('data-menu-tab');
          if(nextTab && nextTab !== world.ui.menuTab){
            world.ui.confirmAction = null;
            world.ui.menuTab = nextTab;
            renderMenuOverlay(world);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const devToggleTarget = resolveCheckboxTarget(e, 'input[type="checkbox"][data-action="toggle-developer"]');
        if(devToggleTarget && e.target instanceof Element && (e.target.closest('label[for]') || e.target === devToggleTarget)){
          requestAnimationFrame(()=>applyDeveloperCheckbox(world, devToggleTarget));
          return;
        }
        const devWrapper = e.target instanceof Element ? e.target.closest('[data-dev-toggle]') : null;
        if(devWrapper){
          const checkbox = devWrapper.querySelector('input[type="checkbox"][data-action="toggle-developer"]');
          if(checkbox && !checkbox.disabled){
            checkbox.checked = !checkbox.checked;
            applyDeveloperCheckbox(world, checkbox);
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
        const actionEl = e.target.closest('[data-action]');
        if(!actionEl) return;
        const action = actionEl.getAttribute('data-action');
        if(handleMenuAction(world, action)){
          e.preventDefault();
          e.stopPropagation();
        }
      });
      overlay.addEventListener('input', (e)=>{
        const colorInput = e.target.closest('input[type="color"][data-group][data-key]');
        if(colorInput){
          const group = colorInput.getAttribute('data-group');
          const key = colorInput.getAttribute('data-key');
          if(world.ui.settings[group]){
            world.ui.settings[group][key] = colorInput.value;
          }
          return;
        }
        const slider = e.target.closest('input[type="range"][data-group]');
        if(!slider) return;
        const group = slider.getAttribute('data-group');
        const key = slider.getAttribute('data-key');
        const rawValue = parseInt(slider.value, 10);
        const min = parseInt(slider.getAttribute('min'), 10);
        const max = parseInt(slider.getAttribute('max'), 10);
        const clampMin = Number.isFinite(min) ? min : 0;
        const clampMax = Number.isFinite(max) ? max : 100;
        const value = Number.isFinite(rawValue) ? clamp(rawValue, clampMin, clampMax) : clampMin;
        if(slider.value !== String(value)) slider.value = value;
        if(world.ui.settings[group]){
          world.ui.settings[group][key] = value;
        }
        const audio = window.audioSystem;
        if(group === 'audio' && audio && typeof audio.applySettings === 'function'){
          audio.applySettings(world.ui.settings.audio);
        }else if(group === 'gameplay'){
          ensureGameplaySettings(world);
        }
        const parent = slider.closest('.menu-slider-control');
        const label = parent ? parent.querySelector('.slider-value') : null;
        if(label){
          label.textContent = formatMenuSliderValue(group, key, value);
        }
      });
      overlay.addEventListener('change', (e)=>{
        const devToggle = resolveCheckboxTarget(e, 'input[type="checkbox"][data-action="toggle-developer"]');
        if(devToggle){
          applyDeveloperCheckbox(world, devToggle);
          return;
        }
        const checkbox = resolveCheckboxTarget(e, 'input[type="checkbox"][data-group]');
        if(checkbox){
          const group = checkbox.getAttribute('data-group');
          const key = checkbox.getAttribute('data-key');
          if(world.ui.settings[group]){
            world.ui.settings[group][key] = checkbox.checked;
            if(group === 'gameplay'){
              ensureGameplaySettings(world);
              if(key === 'showHitboxes'){
                renderMenuOverlay(world);
              }
            }
          }
          return;
        }
        const select = e.target.closest('select[data-group][data-key]');
        if(select){
          const group = select.getAttribute('data-group');
          const key = select.getAttribute('data-key');
          if(world.ui.settings[group]){
            world.ui.settings[group][key] = select.value;
            if(group === 'gameplay'){
              ensureGameplaySettings(world);
            }
          }
          return;
        }
        const colorChange = e.target.closest('input[type="color"][data-group][data-key]');
        if(colorChange){
          const group = colorChange.getAttribute('data-group');
          const key = colorChange.getAttribute('data-key');
          if(world.ui.settings[group]){
            world.ui.settings[group][key] = colorChange.value;
            if(group === 'gameplay'){
              ensureGameplaySettings(world);
            }
          }
        }
      });
    }
    const skillOverlay = document.getElementById('skillOverlay');
    if(skillOverlay){
      skillOverlay.addEventListener('pointermove', (event)=>{
        if(event.target === skillOverlay){
          setHoveredSkillButton(world, null);
          hideKeyHintCursor(world);
        }
      });
      skillOverlay.addEventListener('pointerleave', ()=>{
        setHoveredSkillButton(world, null);
        hideKeyHintCursor(world);
      });
      skillOverlay.addEventListener('click', (e)=>{
        if(e.target === skillOverlay){
          e.preventDefault();
          closeSkillPanel(world);
        }
      });
    }
    const shopOverlay = document.getElementById('shopOverlay');
    if(shopOverlay){
      const resolveShopPanel = (target)=>{
        if(!(target instanceof Element)) return null;
        const panel = target.closest('.shop-panel');
        return panel && shopOverlay.contains(panel) ? panel : null;
      };
      const applyShopPanelScroll = (panelEl, delta)=>{
        if(!panelEl) return false;
        const maxScroll = Math.max(panelEl.scrollHeight - panelEl.clientHeight, 0);
        if(maxScroll <= 0) return false;
        if(!world?.ui) return false;
        const current = panelEl.scrollTop || 0;
        let carry = Number.isFinite(world.ui.shopScrollCarry) ? world.ui.shopScrollCarry : 0;
        carry += delta;
        let applied = 0;
        if(Math.abs(carry) >= 1){
          applied = carry > 0 ? Math.floor(carry) : Math.ceil(carry);
        }
        if(applied !== 0){
          const next = Math.min(Math.max(current + applied, 0), maxScroll);
          const actual = next - current;
          if(actual !== 0){
            panelEl.scrollTop = next;
            world.ui.shopScrollTop = panelEl.scrollTop || next || 0;
          }
          carry -= actual;
          if(next <= 0 && carry < 0) carry = 0;
          if(next >= maxScroll && carry > 0) carry = 0;
        }else if(world.ui.shopScrollTop !== (panelEl.scrollTop || 0)){
          world.ui.shopScrollTop = panelEl.scrollTop || 0;
        }
        if(Math.abs(carry) < 0.001) carry = 0;
        world.ui.shopScrollCarry = carry;
        return true;
      };
      const handleShopWheel = (event)=>{
        let panel = resolveShopPanel(event.target);
        if(!panel && typeof event.clientX === 'number' && typeof event.clientY === 'number'){
          const hovered = document.elementFromPoint(event.clientX, event.clientY);
          panel = resolveShopPanel(hovered);
        }
        if(!panel){
          const hoveredPanel = shopOverlay.querySelector('.shop-panel:hover');
          if(hoveredPanel) panel = hoveredPanel;
        }
        if(!panel) return;
        const deltaMode = typeof event.deltaMode === 'number' ? event.deltaMode : 0;
        const wheelEventCtor = typeof WheelEvent === 'function' ? WheelEvent : null;
        const lineMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_LINE : 1;
        const pageMode = wheelEventCtor ? wheelEventCtor.DOM_DELTA_PAGE : 2;
        let delta = event.deltaY || 0;
        if(deltaMode === lineMode){
          delta *= 24;
        }else if(deltaMode === pageMode){
          delta = delta > 0 ? panel.clientHeight : -panel.clientHeight;
        }
        if(!applyShopPanelScroll(panel, delta)) return;
        event.preventDefault();
        event.stopPropagation();
      };
      const updateShopHover = (event)=>{
        const target = event?.target instanceof Element
          ? event.target.closest('button[data-shop-team-index], button[data-shop-purchase], button[data-shop-action]')
          : null;
        if(target && shopOverlay.contains(target)){
          setHoveredShopButton(world, target);
          updateKeyHintCursor(world, event, target);
        }else{
          setHoveredShopButton(world, null);
          hideKeyHintCursor(world);
        }
      };
      shopOverlay.addEventListener('mousemove', updateShopHover);
      shopOverlay.addEventListener('mouseleave', ()=>{
        setHoveredShopButton(world, null);
        hideKeyHintCursor(world);
      });
      shopOverlay.addEventListener('wheel', handleShopWheel, { passive: false });
      shopOverlay.addEventListener('scroll', (event)=>{
        const panel = resolveShopPanel(event.target);
        if(panel && world?.ui){
          world.ui.shopScrollTop = panel.scrollTop || 0;
          world.ui.shopScrollCarry = 0;
        }
      }, true);
      shopOverlay.addEventListener('pointerdown', (e)=>{
        if(e.button != null && e.button !== 0) return;
        const target = e.target instanceof Element ? e.target : null;
        if(!target) return;
        if(handleShopOverlayAction(world, shopOverlay, target)){
          e.preventDefault();
          e.stopPropagation();
        }
      });
      shopOverlay.addEventListener('click', (e)=>{
        if(e.defaultPrevented) return;
        const target = e.target instanceof Element ? e.target : null;
        if(!target) return;
        if(handleShopOverlayAction(world, shopOverlay, target)){
          e.preventDefault();
        }
      });
    }
    world.ui.listenersAttached = true;
  }
  renderSkillPanel(world);
  renderShopPanel(world);
}

function renderMenuOverlay(world){
  const overlay = document.getElementById('menuOverlay');
  if(!overlay) return;
  const escapeAttr = (value)=>String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  if(world.state !== 'level'){
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    delete overlay.dataset.viewSignature;
    world.ui.menuOpen = false;
    world.ui.confirmAction = null;
    return;
  }
  if(!world.ui.menuOpen){
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    delete overlay.dataset.viewSignature;
    return;
  }
  ensureGameplaySettings(world);
  const settings = world.ui.settings || {};
  const audio = settings.audio || {};
  const visual = settings.visual || {};
  const gameplay = settings.gameplay || {};
  const tab = world.ui.menuTab === 'help' ? 'help' : 'settings';
  const audioMaster = clamp(typeof audio.master === 'number' ? audio.master : 50, 0, 100);
  const audioEffects = clamp(typeof audio.effects === 'number' ? audio.effects : 50, 0, 100);
  const bloomValue = clamp(typeof visual.bloom === 'number' ? visual.bloom : 0, 0, 100);
  const graphicsQuality = (visual.graphicsQuality === 'low') ? 'low' : 'high';
  if(settings.audio){
    if(!Number.isFinite(settings.audio.master)) settings.audio.master = audioMaster;
    if(!Number.isFinite(settings.audio.effects)) settings.audio.effects = audioEffects;
    if(!Number.isFinite(settings.audio.music)) settings.audio.music = 50;
  }
  if(settings.visual){
    if(!Number.isFinite(settings.visual.bloom)) settings.visual.bloom = bloomValue;
    if(settings.visual.graphicsQuality !== 'low' && settings.visual.graphicsQuality !== 'high'){
      settings.visual.graphicsQuality = graphicsQuality;
    }
  }
  if(settings.gameplay && typeof settings.gameplay.developerMode !== 'boolean'){
    settings.gameplay.developerMode = false;
  }
  if(settings.gameplay && typeof settings.gameplay.unlockAllStages !== 'boolean'){
    settings.gameplay.unlockAllStages = false;
  }
  if(settings.gameplay && typeof settings.gameplay.unlimitedHealth !== 'boolean'){
    settings.gameplay.unlimitedHealth = false;
  }
  const markerStyle = gameplay.selectionMarkerStyle || 'circle';
  const markerColor = gameplay.selectionMarkerColor || '#6bd1ff';
  const markerOpacity = clamp(typeof gameplay.selectionMarkerOpacity === 'number' ? gameplay.selectionMarkerOpacity : 85, 0, 100);
  const hitboxRigStrength = clamp(typeof gameplay.hitboxRigStrength === 'number' ? gameplay.hitboxRigStrength : 100, 0, 200);
  const devEnabled = !!world.dev?.enabled;
  const canEnableDev = !!world.levelState?.environmentLayout;
  const levelDef = world.levelState?.def || null;
  const hubLevel = !!(levelDef && levelDef.id === 'worldTree');
  const view = (world.ui.confirmAction === 'exit' && !hubLevel) ? 'confirm-exit' : 'menu';
  const signature = JSON.stringify({
    view,
    tab,
    audioMaster,
    audioEffects,
    bloomValue,
    graphicsQuality,
    alwaysShowHp: !!gameplay.alwaysShowHp,
    feetClamping: !!gameplay.feetClamping,
    showHitboxes: !!gameplay.showHitboxes,
    hitboxRigStrength,
    selectionStyle: markerStyle,
    selectionOpacity: markerOpacity,
    selectionColor: markerColor,
    devEnabled,
    canEnableDev,
    levelId: levelDef?.id || null
  });
  overlay.classList.remove('hidden');
  if(overlay.dataset.viewSignature === signature){
    return;
  }
  overlay.dataset.viewSignature = signature;
  if(view === 'confirm-exit'){
    overlay.innerHTML = `
      <div class="menu-panel">
        <div class="menu-header">
          <h2>Leave Level?</h2>
        </div>
        <div class="menu-warning">All items, coins, and experience gained in this run will be lost if you return to the world map.</div>
        <div class="menu-actions">
          <button type="button" class="danger" data-action="confirm-exit">Lose Progress &amp; Leave</button>
          <button type="button" data-action="cancel-confirm">Stay in Level</button>
        </div>
      </div>
    `;
    return;
  }
  const tabsHtml = `
        <div class="menu-tabs">
          <button type="button" class="menu-tab${tab==='settings' ? ' active' : ''}" data-menu-tab="settings">Settings</button>
          <button type="button" class="menu-tab${tab==='help' ? ' active' : ''}" data-menu-tab="help">Help</button>
        </div>
      `;
  let contentHtml = '';
  if(tab === 'help'){
    contentHtml = `
      <div class="menu-section">
        <h3>Controls</h3>
        <ul class="menu-help-list">
          <li><span class="menu-help-label">Move</span> <span class="kbd">A</span>/<span class="kbd">D</span></li>
          <li><span class="menu-help-label">Jump</span> <span class="kbd">W</span> &nbsp; <span class="menu-help-label">Drop</span> <span class="kbd">S</span></li>
          <li><span class="menu-help-label">Attack</span> <span class="kbd">Space</span> or click</li>
          <li><span class="menu-help-label">Switch stick</span> <span class="kbd">1</span>-<span class="kbd">3</span></li>
          <li><span class="menu-help-label">Reset</span> <span class="kbd">R</span></li>
          <li>Drag stick joints with the mouse to reposition limbs.</li>
        </ul>
      </div>
      <div class="menu-section">
        <h3>Tips</h3>
        <p class="menu-help-note">Click the inventory slot to manage stored weapons and drag to swap between sticks at any time.</p>
        <p class="menu-help-note">Visit the World Tree tome to spend skill points earned during your runs.</p>
      </div>
    `;
  }else{
    contentHtml = `
      <div class="menu-section">
        <h3>Audio</h3>
        <div class="menu-slider">
          <span>Master Volume</span>
          <div class="menu-slider-control">
            <input type="range" min="0" max="100" value="${audioMaster}" data-group="audio" data-key="master">
            <span class="slider-value">${formatMenuSliderValue('audio','master', audioMaster)}</span>
          </div>
        </div>
        <div class="menu-slider">
          <span>Effects Volume</span>
          <div class="menu-slider-control">
            <input type="range" min="0" max="100" value="${audioEffects}" data-group="audio" data-key="effects">
            <span class="slider-value">${formatMenuSliderValue('audio','effects', audioEffects)}</span>
          </div>
        </div>
      </div>
      <div class="menu-section">
        <h3>Visual</h3>
        <div class="menu-slider">
          <span>Glow / Bloom</span>
          <div class="menu-slider-control">
            <input type="range" min="0" max="100" value="${bloomValue}" data-group="visual" data-key="bloom">
            <span class="slider-value">${formatMenuSliderValue('visual','bloom', bloomValue)}</span>
          </div>
        </div>
        <div class="menu-field">
          <label for="menuGraphicsQuality">Graphics Quality</label>
          <select id="menuGraphicsQuality" data-group="visual" data-key="graphicsQuality">
            <option value="high" ${graphicsQuality==='high'?'selected':''}>High (Trails Enabled)</option>
            <option value="low" ${graphicsQuality==='low'?'selected':''}>Low (Trails Disabled)</option>
          </select>
        </div>
      </div>
      <div class="menu-section">
        <h3>Gameplay</h3>
        <div class="menu-toggle">
          <input type="checkbox" id="menuAlwaysShowHp" data-group="gameplay" data-key="alwaysShowHp" ${gameplay.alwaysShowHp ? 'checked' : ''}>
          <label for="menuAlwaysShowHp">Show health bars at all times</label>
        </div>
        <div class="menu-toggle" style="margin-top:6px;">
          <input type="checkbox" id="menuFeetClamping" data-group="gameplay" data-key="feetClamping" ${gameplay.feetClamping ? 'checked' : ''}>
          <label for="menuFeetClamping">Turn feet clamping on</label>
        </div>
        <div class="menu-toggle" style="margin-top:6px;">
          <input type="checkbox" id="menuShowHitboxes" data-group="gameplay" data-key="showHitboxes" ${gameplay.showHitboxes ? 'checked' : ''}>
          <label for="menuShowHitboxes">Show/hide hitboxes</label>
        </div>
        <div class="menu-slider" data-hitbox-tuning style="margin-top:6px;${gameplay.showHitboxes ? '' : ' display:none;'}">
          <span>Rig Elasticity &amp; Torque</span>
          <div class="menu-slider-control">
            <input type="range" min="0" max="200" step="5" value="${hitboxRigStrength}" data-group="gameplay" data-key="hitboxRigStrength" ${gameplay.showHitboxes ? '' : 'disabled'}>
            <span class="slider-value">${formatMenuSliderValue('gameplay','hitboxRigStrength', hitboxRigStrength)}</span>
          </div>
        </div>
        <div class="menu-toggle" data-dev-toggle style="margin-top:6px; ${canEnableDev?'':'opacity:0.55;'}">
          <input type="checkbox" id="menuDeveloperToggle" data-action="toggle-developer" ${devEnabled ? 'checked' : ''} ${canEnableDev ? '' : 'disabled'}>
          <label for="menuDeveloperToggle">Developer mode tools ${canEnableDev ? '' : '(stage layout not available)'}</label>
        </div>
        <div class="menu-field">
          <label for="menuSelectionStyle">Selection Marker Style</label>
          <select id="menuSelectionStyle" data-group="gameplay" data-key="selectionMarkerStyle">
            <option value="circle" ${markerStyle==='circle'?'selected':''}>Circle Ring</option>
            <option value="arrow" ${markerStyle==='arrow'?'selected':''}>Arrow Indicator</option>
            <option value="outline" ${markerStyle==='outline'?'selected':''}>Body Outline</option>
          </select>
        </div>
        <div class="menu-field">
          <label for="menuSelectionColor">Selection Marker Color</label>
          <input type="color" id="menuSelectionColor" data-group="gameplay" data-key="selectionMarkerColor" value="${escapeAttr(markerColor)}">
        </div>
        <div class="menu-slider">
          <span>Selection Marker Opacity</span>
          <div class="menu-slider-control">
            <input type="range" min="0" max="100" step="5" value="${markerOpacity}" data-group="gameplay" data-key="selectionMarkerOpacity">
            <span class="slider-value">${formatMenuSliderValue('gameplay','selectionMarkerOpacity', markerOpacity)}</span>
          </div>
        </div>
      </div>
    `;
  }
  const exitButtonClass = hubLevel ? '' : 'danger';
  const exitButtonLabel = hubLevel ? 'Leave Hub' : 'Return to World Map';
  overlay.innerHTML = `
    <div class="menu-panel">
      <div class="menu-header">
        <h2>Pause Menu</h2>
        ${tabsHtml}
      </div>
      ${contentHtml}
      <div class="menu-actions">
        <button type="button" class="${exitButtonClass}" data-action="request-exit">${exitButtonLabel}</button>
        <button type="button" data-action="close-menu">Resume</button>
      </div>
    </div>
  `;
}

function formatMenuSliderValue(group, key, value){
  if(group === 'gameplay' && key === 'hitboxRigStrength'){
    const raw = Number.isFinite(value) ? value : 100;
    const multiplier = clamp(raw, 0, 200) / 100;
    const fixed = multiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    return `${fixed}×`;
  }
  return `${value}%`;
}
