// stickman/weapon_state.js

const StickWeaponState = {
  _enemyFlopStabAttack(weapon, now){
    const flopDuration = weapon.flopDuration ?? 1000;
    this.weaponVisible = true;
    this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    this.weaponSwingUntil = now + flopDuration;
    this._extendWeaponTerrainIgnore(now + flopDuration + 1000);
    this.weaponReachMultiplier = 1;
    this.forceSoftFor(flopDuration, now);
    if(!this.weaponCooldownUntil || this.weaponCooldownUntil < now + flopDuration){
      this.weaponCooldownUntil = now + flopDuration;
    }
    attackMelee(this, weapon, this.world);
    const forward = this.dir >= 0 ? 1 : -1;
    const yankVelocity = weapon.yankVelocity ?? 480;
    const yankLift = weapon.yankLift ?? 160;
    const hand = this.pointsByName[this.weaponHand];
    const pelvis = this.pointsByName.pelvis;
    if(hand){
      hand.vx += forward * yankVelocity;
      hand.vy -= yankLift * 0.35;
    }
    if(pelvis){
      pelvis.vx += forward * yankVelocity * 0.4;
      pelvis.vy -= yankLift * 0.1;
      const stored = Number.isFinite(this.moveVelocity) ? this.moveVelocity : 0;
      this.moveVelocity = stored + forward * yankVelocity * 0.4;
    }
    const bodyBoost = yankVelocity * 0.2;
    for(const point of this.points){
      if(point === hand || point === pelvis) continue;
      point.vx += forward * bodyBoost;
    }
  },
  updateWeaponState(now){
    const weapon = this.weapon();
    const shieldEquipped = !!(weapon && weapon.kind === 'shield');
    const staffEquipped = !!(weapon && weapon.kind === 'staff');
    const summonerEquipped = !!(weapon && weapon.kind === 'summoner');
    if(summonerEquipped){
      this._ensureSummonerState(false);
    }
    const rig = this.weaponRig;
    const swordEquipped = !!(rig && rig.type === 'sword' && weapon && weapon.kind === 'melee');
    const spearEquipped = !!(weapon && weapon.kind === 'melee' && weapon.poseStyle === 'spear');
    if(!spearEquipped){
      if(this.lastSpearAim) this.lastSpearAim = null;
      if(this.spearThrust) this.spearThrust = null;
    }
    if(!weapon || weapon.kind !== 'gun'){
      if(this.lastGunAim) this.lastGunAim = null;
    }
    if(!weapon || weapon.kind !== 'bow'){
      if(this.lastBowAim) this.lastBowAim = null;
    }
    if(!this.weaponLastActiveTime) this.weaponLastActiveTime = now;
    if(this.weaponVisible && this.weaponHand){
      this.weaponLastActiveTime = now;
      if(this.weaponSheathed){
        this.weaponSheathed = false;
        this.weaponSheathPose = null;
        this._prepareSwordForUnsheathe();
        this._endWeaponSheathGrab();
      }
    }
    if(swordEquipped){
      const delay = weapon && weapon.sheathDelayMs !== undefined
        ? Math.max(0, weapon.sheathDelayMs)
        : SWORD_SHEATH_DELAY_MS;
      const idleMs = now - (this.weaponLastActiveTime || now);
      if(idleMs >= delay){
        if(!this.weaponSheathed){
          this.weaponSheathed = true;
          this._beginWeaponSheathGrab(now);
        }
      }else if(this.weaponSheathed){
        this.weaponSheathed = false;
        this.weaponSheathPose = null;
        this._prepareSwordForUnsheathe();
        this._endWeaponSheathGrab();
      }
    }else if(this.weaponSheathed){
      this.weaponSheathed = false;
      this.weaponSheathPose = null;
      this._endWeaponSheathGrab();
    }
    if(this.comboAnim){
      const swingEnd = this.comboAnim.end;
      this.weaponSwingUntil = swingEnd;
      this._extendWeaponTerrainIgnore(swingEnd + 1000);
    }
    if(this.weaponSwingUntil > 0 && now >= this.weaponSwingUntil){
      this.weaponSwingUntil = 0;
      if(!this.comboAnim && !this.backflipActive && !this.isBowDrawingActive(now) && !staffEquipped && !spearEquipped){
        this.weaponVisible = false;
        this.weaponHand = null;
        this.weaponReachMultiplier = 1;
        this.lastGunAim = null;
      }
    }
    if(staffEquipped){
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    }
    if(spearEquipped){
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      if(!this.spearThrust && Math.abs(this.weaponReachMultiplier - 1) > 1e-3){
        this.weaponReachMultiplier = 1;
      }
    }
    if(summonerEquipped){
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponReachMultiplier = 1;
    }
    if(shieldEquipped){
      this.weaponVisible = true;
      this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
      this.weaponReachMultiplier = 1;
    }
    if(weapon && (weapon.kind === 'gun' || weapon.kind === 'bow')){
      const defaultHand = this.dir >= 0 ? 'handR' : 'handL';
      if(weapon.kind === 'bow'){
        if(!this.isBowDrawingActive(now)){
          this.weaponVisible = true;
          this.weaponHand = defaultHand;
        }
      }else{
        this.weaponVisible = true;
        this.weaponHand = this.weaponHand || defaultHand;
      }
    }
  },
  _beginWeaponSheathGrab(now){
    const start = Number.isFinite(now) ? now : nowMs();
    const duration = 220;
    this.weaponSheathGrabStart = start;
    this.weaponSheathGrabUntil = start + duration;
    this.weaponSheathGrabHand = this.dir >= 0 ? 'handR' : 'handL';
  },
  _endWeaponSheathGrab(){
    this.weaponSheathGrabStart = 0;
    this.weaponSheathGrabUntil = 0;
    this.weaponSheathGrabHand = null;
  },
  _prepareSwordForUnsheathe(){
    const rig = this.weaponRig;
    if(!rig || rig.type !== 'sword') return;
    this._endWeaponSheathGrab();
    const tip = rig.tip;
    if(!tip) return;
    const handName = rig.handName || (this.dir >= 0 ? 'handR' : 'handL');
    const hand = this.pointsByName[handName];
    const elbowName = handName === 'handL' ? 'elbowL' : 'elbowR';
    const elbow = this.pointsByName[elbowName];
    if(hand && elbow){
      const dx = hand.x - elbow.x;
      const dy = hand.y - elbow.y;
      const len = Math.hypot(dx, dy) || 1;
      const reach = Math.max(rig.handRestLength || 86, Math.hypot(dx, dy));
      tip.teleport(hand.x + (dx / len) * reach, hand.y + (dy / len) * reach);
    }
    tip.vx = 0;
    tip.vy = 0;
    tip.poseTargetX = tip.x;
    tip.poseTargetY = tip.y;
    if(Array.isArray(rig.trail)) rig.trail.length = 0;
  },
  _ensureSpiritWeaponState(forceReset=false){
    const weaponId = this.currentWeaponId();
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'spirit'){
      if(forceReset || this.spiritState){
        this.spiritState = null;
      }
      return null;
    }
    const count = Math.max(1, Math.round(weapon.orbCount || 1));
    const regenMs = Math.max(120, weapon.orbRegenMs || 1500);
    const radius = weapon.orbitRadius ?? 32;
    let state = this.spiritState;
    if(forceReset || !state || state.weaponId !== weaponId || !Array.isArray(state.orbs) || state.orbs.length !== count){
      state = {
        weaponId,
        rotation: 0,
        regenMs,
        radius,
        nextIndex: 0,
        orbs: []
      };
      for(let i=0;i<count;i++){
        state.orbs.push({ slotAngle: (TAU / count) * i, ready: true, regenRemaining: 0 });
      }
      this.spiritState = state;
      return state;
    }
    state.regenMs = regenMs;
    state.radius = radius;
    return state;
  },
  _ensureSummonerState(forceReset=false){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'summoner'){
      if(this.summonerState){
        this._dismissSummonerOrbs();
        this.summonerState = null;
      }
      return null;
    }
    const weaponId = this.currentWeaponId();
    const previousState = forceReset ? null : this.summonerState;
    const maxSouls = weapon.maxSouls !== undefined ? weapon.maxSouls : (typeof SUMMONER_MAX_SOULS_DEFAULT !== 'undefined' ? SUMMONER_MAX_SOULS_DEFAULT : 6);
    const previousSouls = previousState ? clamp(previousState.soulCount || 0, 0, maxSouls) : 0;
    const prevPhase = previousState?.orbitPhase || 0;
    const boundOrbs = (!forceReset && Array.isArray(previousState?.boundOrbs))
      ? previousState.boundOrbs.filter(orb=>orb && orb.target === this)
      : [];
    const specialCooldown = previousState?.specialCooldownUntil || 0;
    const previousActive = (!forceReset && Array.isArray(previousState?.activeSummons))
      ? previousState.activeSummons.filter(summon => summon && !summon._destroyed)
      : [];
    const capacityRaw = weapon.maxActiveSummons !== undefined ? weapon.maxActiveSummons : 3;
    const maxActiveSummons = Math.max(1, Math.round(capacityRaw || 1));
    const previousSlots = (!forceReset && Array.isArray(previousState?.summonSlots))
      ? previousState.summonSlots.slice(0, maxActiveSummons)
      : [];
    const slots = [];
    for(let i=0;i<maxActiveSummons;i++){
      const prevSlot = previousSlots[i] || null;
      const summonRef = prevSlot && prevSlot.summon && !prevSlot.summon._destroyed ? prevSlot.summon : null;
      if(summonRef) summonRef._summonerSlotIndex = i;
      slots.push({
        summon: summonRef,
        cooldownUntil: prevSlot && Number.isFinite(prevSlot.cooldownUntil) ? prevSlot.cooldownUntil : 0
      });
    }
    const uniqueActive = [];
    for(const entry of previousActive){
      if(!entry || entry._destroyed) continue;
      if(uniqueActive.indexOf(entry) === -1) uniqueActive.push(entry);
    }
    for(const slot of slots){
      const summonRef = slot?.summon;
      if(summonRef && !summonRef._destroyed && uniqueActive.indexOf(summonRef) === -1){
        uniqueActive.push(summonRef);
      }
    }
    this.summonerState = {
      weaponId,
      soulCount: previousSouls,
      specialCooldownUntil: specialCooldown,
      boundOrbs,
      orbitPhase: prevPhase,
      activeSummons: uniqueActive,
      maxActiveSummons,
      summonSlots: slots
    };
    if(typeof syncSummonerSlots === 'function'){
      syncSummonerSlots(this.summonerState, maxActiveSummons);
    }
    return this.summonerState;
  },
  _syncSummonerStateOnEquip(forceReset=false){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'summoner'){
      if(this.summonerState){
        this._dismissSummonerOrbs();
        this.summonerState = null;
      }
      return;
    }
    this._ensureSummonerState(forceReset);
  },
  _dismissSummonerOrbs(consuming=false){
    if(!this.summonerState || !Array.isArray(this.summonerState.boundOrbs)) return;
    const now = nowMs();
    for(const orb of this.summonerState.boundOrbs){
      if(!orb) continue;
      if(consuming){
        orb.phase = 'consume';
        orb.consumeStart = now;
        orb.consumeDuration = orb.consumeDuration || 0.42;
      }else{
        orb.phase = 'fade';
        orb.fadeStart = now;
      }
      orb.target = null;
    }
    this.summonerState.boundOrbs.length = 0;
  },
  _ensureStaffState(forceReset=false){
    const weaponId = this.currentWeaponId();
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'staff'){
      if(forceReset || (this.staffState && (this.staffState.weaponId || this.staffState.firing))){
        this._stopStaffBeam();
        this.staffState = null;
      }
      return null;
    }
    const config = weapon.staff || {};
    const maxCharge = Math.max(0.1, config.maxCharge ?? 1);
    let state = this.staffState;
    if(forceReset || !state || state.weaponId !== weaponId){
      state = {
        weaponId,
        charge: clamp(config.initialCharge ?? maxCharge, 0, maxCharge),
        maxCharge,
        firing: false,
        beamSegments: [],
        damageBuffer: new Map(),
        particleTimers: new Map(),
        bounceRemaining: Math.max(0, Math.round(config.bounces ?? 0)),
        lastAim: null,
        hitPoint: null,
        contactPoints: null,
        lastUpdate: nowMs(),
        lastImpactParticle: 0,
        auraPhase: 0,
        auraActive: false,
        auraCenter: null,
        auraRadius: 0,
        auraColor: null,
        auraSwirlColor: null,
        auraSourceId: Symbol('staffAura'),
        auraRecipients: new Set(),
        auraVisualTargets: new Set(),
        necroMarkedEnemies: new Set(),
        soulCount: 0,
        soulControlActive: false,
        soulControlPoint: null,
        soulReleaseHandled: true,
        soulOrbitPhase: 0,
        soulPulseUntil: 0,
        soulBurstPulseUntil: 0,
        tipPosition: null,
        auraPulseStrength: 0
      };
      this.staffState = state;
      return state;
    }
    state.maxCharge = maxCharge;
    if(!(state.damageBuffer instanceof Map)) state.damageBuffer = new Map();
    if(!(state.particleTimers instanceof Map)) state.particleTimers = new Map();
    if(!(state.auraRecipients instanceof Set)) state.auraRecipients = new Set();
    if(!(state.auraVisualTargets instanceof Set)) state.auraVisualTargets = new Set();
    if(!(state.necroMarkedEnemies instanceof Set)) state.necroMarkedEnemies = new Set();
    if(!state.auraSourceId) state.auraSourceId = Symbol('staffAura');
    if(!Number.isFinite(state.soulCount)) state.soulCount = 0;
    state.soulCount = clamp(state.soulCount, 0, 10);
    if(typeof state.soulControlActive !== 'boolean') state.soulControlActive = false;
    if(!state.soulControlPoint) state.soulControlPoint = null;
    if(typeof state.soulReleaseHandled !== 'boolean') state.soulReleaseHandled = true;
    if(!Number.isFinite(state.soulOrbitPhase)) state.soulOrbitPhase = 0;
    if(!Number.isFinite(state.soulPulseUntil)) state.soulPulseUntil = 0;
    if(!Number.isFinite(state.soulBurstPulseUntil)) state.soulBurstPulseUntil = 0;
    if(!state.tipPosition) state.tipPosition = null;
    if(!Number.isFinite(state.auraPulseStrength)) state.auraPulseStrength = 0;
    return state;
  },
  _ensurePunchState(forceReset=false){
    if(forceReset || !this.punchState || !this.punchState.hands){
      this.punchState = {
        hands: {
          handL: { trail: [], trailLife: 180, trailMax: 14, activeUntil: 0, start: 0, duration: 0, angle: 0, punching: false },
          handR: { trail: [], trailLife: 180, trailMax: 14, activeUntil: 0, start: 0, duration: 0, angle: 0, punching: false }
        }
      };
    }
    return this.punchState;
  },
  _stopStaffBeam(){
    if(!this.staffState) return;
    StickWeaponState._releaseStaffSouls.call(this, 'cancel');
    this.staffState.firing = false;
    this.staffState.beamSegments = [];
    this.staffState.contactPoints = null;
    this.staffState.hitPoint = null;
    const weapon = this.weapon();
    const config = weapon?.staff || {};
    this.staffState.bounceRemaining = Math.max(0, Math.round(config.bounces ?? 0));
    this.staffState.soulControlActive = false;
    this.staffState.soulControlPoint = null;
    StickWeaponState._clearStaffAura.call(this, this.staffState);
  },
  _handleStaffAttack(now, aimX, aimY){
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'staff') return;
    const state = this._ensureStaffState(false);
    if(!state) return;
    const origin = this.center();
    const targetX = aimX ?? (origin.x + this.dir * (weapon.staff?.range ?? 280));
    const targetY = aimY ?? origin.y;
    if(state.firing){
      state.lastAim = { x: targetX, y: targetY };
      state.bounceRemaining = Math.max(0, Math.round(weapon.staff?.bounces ?? 0));
      return;
    }
    const minCharge = weapon.staff?.minChargeToFire ?? 0;
    if(state.charge < minCharge){
      return;
    }
    state.firing = true;
    state.lastAim = { x: targetX, y: targetY };
    state.startedAt = now;
    state.bounceRemaining = Math.max(0, Math.round(weapon.staff?.bounces ?? 0));
    state.soulReleaseHandled = false;
    state.soulControlActive = true;
    state.soulControlPoint = { x: targetX, y: targetY };
    if(!Array.isArray(state.beamSegments)) state.beamSegments = [];
    state.beamSegments.length = 0;
    state.contactPoints = null;
    state.hitPoint = null;
    this.weaponVisible = true;
    this.weaponHand = this.dir >= 0 ? 'handR' : 'handL';
    this.weaponSwingUntil = now + 160;
    this.weaponReachMultiplier = 1;
    this._updateStaffBeam(now, 0);
  },
  _updateStaffBeam(now, dt){
    const weapon = this.weapon();
    const state = this._ensureStaffState(false);
    if(!weapon || weapon.kind !== 'staff' || !state || !state.firing) return;
    const config = weapon.staff || {};
    if(config.aura){
      this._updateStaffAura(state, weapon, config, dt, now);
      StickWeaponState._updateStaffSoulControl.call(this, state, weapon, config, dt, now);
      return;
    }
    const handName = this.weaponHand || (this.dir >= 0 ? 'handR' : 'handL');
    const hand = this.pointsByName[handName];
    if(!hand){
      this._stopStaffBeam();
      return;
    }
    const aim = state.lastAim || (this.world?.input?.aim ? { x: this.world.input.aim.x, y: this.world.input.aim.y } : { x: hand.x + this.dir * 160, y: hand.y - 20 });
    let dirX = aim.x - hand.x;
    let dirY = aim.y - hand.y;
    const len = Math.hypot(dirX, dirY);
    if(len < 0.0001){
      dirX = this.dir >= 0 ? 1 : -1;
      dirY = -0.1;
    }else{
      dirX /= len;
      dirY /= len;
    }
    const range = config.range ?? 320;
    const rectangles = this._solidRectangles().concat(this._decorRectangles());
    const segments = [];
    let remaining = range;
    let currentOrigin = { x: hand.x, y: hand.y };
    let currentDir = { x: dirX, y: dirY };
    let bounces = Math.max(0, Math.round(config.bounces ?? 0));
    let lastHit = null;
    let guard = 0;
    while(remaining > 4 && guard < 4){
      guard++;
      const hit = raycastEnvironment(currentOrigin, currentDir, remaining, rectangles);
      let travel = remaining;
      if(hit && hit.distance >= 0){
        travel = Math.min(remaining, hit.distance);
      }
      const endPoint = {
        x: currentOrigin.x + currentDir.x * travel,
        y: currentOrigin.y + currentDir.y * travel
      };
      segments.push({ start: { ...currentOrigin }, end: { ...endPoint }, normal: hit?.normal || null, hit });
      if(hit && travel <= remaining){
        lastHit = hit;
        const rectKind = hit.rect?.kind || null;
        const isDecor = rectKind === 'decor';
        const isBlock = rectKind !== 'decor';
        remaining -= travel;
        if(config.stopOnObjects && isDecor){
          break;
        }
        if(bounces > 0 && isBlock){
          const reflect = reflectVector(currentDir, hit.normal);
          if(!reflect){
            break;
          }
          currentOrigin = {
            x: endPoint.x + reflect.x * 0.5,
            y: endPoint.y + reflect.y * 0.5
          };
          currentDir = reflect;
          bounces -= 1;
          continue;
        }
        break;
      }else{
        lastHit = null;
        break;
      }
    }
    state.beamSegments = segments;
    if(lastHit){
      state.hitPoint = { x: lastHit.point.x, y: lastHit.point.y, kind: lastHit.rect?.kind || null };
      if(dt > 0){
        this._applyStaffImpactToGeometry(lastHit, weapon, dt);
      }
    }else if(segments.length){
      const tip = segments[segments.length - 1].end;
      state.hitPoint = { x: tip.x, y: tip.y, kind: 'range' };
    }else{
      state.hitPoint = null;
    }
    this._applyStaffBeamDamage(state, weapon, segments, dt, now);
    StickWeaponState._updateStaffSoulControl.call(this, state, weapon, config, dt, now);
  },
  _staffAuraRadiusMultiplier(auraConfig){
    let multiplier = 1;
    if(auraConfig && Number.isFinite(auraConfig.radiusMultiplier)){
      multiplier *= Math.max(0, auraConfig.radiusMultiplier);
    }
    if(typeof this.armorItem === 'function'){
      const armorItem = this.armorItem();
      if(armorItem && armorItem.type === 'armor' && typeof ARMOR_ITEMS === 'object' && ARMOR_ITEMS){
        const info = ARMOR_ITEMS[armorItem.id];
        if(info && Number.isFinite(info.staffAuraRadiusMultiplier)){
          multiplier *= Math.max(0, info.staffAuraRadiusMultiplier);
        }
      }
    }
    return multiplier;
  },
  _staffAuraBaseRadius(weapon, auraConfig){
    const base = Math.max(40, auraConfig?.radius ?? weapon.staff?.range ?? 200);
    const multiplier = StickWeaponState._staffAuraRadiusMultiplier.call(this, auraConfig);
    return base * multiplier;
  },
  _updateStaffAura(state, weapon, config, dt, now){
    if(!state || !weapon || !config || !config.aura) return;
    const world = this.world;
    if(!world){
      StickWeaponState._clearStaffAura.call(this, state);
      return;
    }
    const auraConfig = config.aura;
    const handName = this.weaponHand || (this.dir >= 0 ? 'handR' : 'handL');
    const hand = this.pointsByName[handName];
    const elbowName = handName === 'handL' ? 'elbowL' : 'elbowR';
    const elbow = this.pointsByName[elbowName];
    let dirX = this.dir >= 0 ? 1 : -1;
    let dirY = -0.1;
    if(hand && elbow){
      const dx = hand.x - elbow.x;
      const dy = hand.y - elbow.y;
      const len = Math.hypot(dx, dy) || 1;
      dirX = dx / len;
      dirY = dy / len;
    }
    const shaftLength = weapon.staff?.shaftLength ?? 56;
    let tipX;
    let tipY;
    if(hand){
      tipX = hand.x + dirX * shaftLength;
      tipY = hand.y + dirY * shaftLength;
    }else{
      const center = typeof this.center === 'function' ? this.center() : { x: 0, y: 0 };
      tipX = center.x + dirX * (config.range ?? 160);
      tipY = center.y - 20;
    }
    state.tipPosition = { x: tipX, y: tipY };
    const ownerCenter = typeof this.center === 'function'
      ? this.center()
      : { x: tipX, y: tipY };
    const auraCenter = ownerCenter ? { x: ownerCenter.x, y: ownerCenter.y } : { x: tipX, y: tipY };
    state.auraCenter = auraCenter;
    const radius = StickWeaponState._staffAuraBaseRadius.call(this, weapon, auraConfig);
    state.auraRadius = radius;
    const baseColor = auraConfig.color || config.beamGlow || weapon.color || '#ffffff';
    state.auraColor = baseColor;
    state.auraSwirlColor = auraConfig.swirlColor || config.beamColor || baseColor;
    const swirlSpeed = Number.isFinite(auraConfig.swirlSpeed) ? auraConfig.swirlSpeed : 0.75;
    const tauConst = (typeof TAU === 'number') ? TAU : Math.PI * 2;
    state.auraPhase = (state.auraPhase || 0) + Math.max(0, swirlSpeed) * dt;
    if(state.auraPhase > tauConst){
      state.auraPhase = state.auraPhase % tauConst;
    }
    state.auraActive = true;
    state.beamSegments = [];
    state.contactPoints = null;
    state.hitPoint = null;
    const sticks = Array.isArray(world.sticks) ? world.sticks : [];
    const nowMs = now;
    const ttl = Math.max(60, Number.isFinite(auraConfig.persistMs) ? auraConfig.persistMs : 240);
    const targetModeRaw = auraConfig.target;
    const targetMode = typeof targetModeRaw === 'string' ? targetModeRaw.toLowerCase() : 'allies';
    const affectsAllies = targetMode === 'allies' || targetMode === 'all';
    const affectsEnemies = targetMode === 'enemies' || targetMode === 'all';
    const includeSelf = auraConfig.includeSelf !== false;
    const attackMult = Number.isFinite(auraConfig.attackMultiplier) && auraConfig.attackMultiplier > 0
      ? auraConfig.attackMultiplier
      : 1;
    const defenseMult = Number.isFinite(auraConfig.defenseMultiplier) && auraConfig.defenseMultiplier > 0
      ? auraConfig.defenseMultiplier
      : 1;
    const healthMult = Number.isFinite(auraConfig.healthMultiplier) && auraConfig.healthMultiplier > 0
      ? auraConfig.healthMultiplier
      : 1;
    const newRecipients = new Set();
    const newNecro = new Set();
    const sourceId = state.auraSourceId || (state.auraSourceId = Symbol('staffAura'));
    const hasProjectileShield = !!auraConfig.projectileShield;
    if(state.auraVisualTargets instanceof Set){
      for(const prev of state.auraVisualTargets){
        if(prev && typeof prev.clearAuraVisual === 'function'){
          prev.clearAuraVisual(sourceId);
        }
      }
      state.auraVisualTargets.clear();
    }else{
      state.auraVisualTargets = new Set();
    }
    for(const target of sticks){
      if(!target || target.dead) continue;
      if(target === this && !includeSelf && target.isEnemy === this.isEnemy) continue;
      const center = typeof target.center === 'function' ? target.center() : null;
      if(!center) continue;
      const dx = center.x - auraCenter.x;
      const dy = center.y - auraCenter.y;
      if(Math.hypot(dx, dy) > radius) continue;
      if(affectsAllies && target.isEnemy === this.isEnemy){
        if(typeof target.applyAuraSource === 'function'){
          target.applyAuraSource(sourceId, { attack: attackMult, defense: defenseMult, health: healthMult }, nowMs, ttl);
        }
        if(hasProjectileShield && typeof target.applyProjectileShield === 'function'){
          target.applyProjectileShield(sourceId, {
            owner: this,
            config: auraConfig.projectileShield,
            now: nowMs,
            ttl
          });
        }
        newRecipients.add(target);
      }
      if(affectsEnemies && target.isEnemy !== this.isEnemy){
        // Staves no longer add glow visuals to enemies they affect.
      }
      const raiseConfig = auraConfig.raiseOnDeath;
      if(raiseConfig && target.isEnemy !== this.isEnemy){
        if(!(target.necromancerMarks instanceof Map)) target.necromancerMarks = new Map();
        target.necromancerMarks.set(sourceId, { owner: this, config: raiseConfig, updatedAt: nowMs });
        newNecro.add(target);
      }
    }
    if(!(state.auraRecipients instanceof Set)) state.auraRecipients = new Set();
    for(const prev of state.auraRecipients){
      if(!newRecipients.has(prev) && prev && typeof prev.clearAuraSource === 'function'){
        prev.clearAuraSource(sourceId);
        if(hasProjectileShield && typeof prev.clearProjectileShield === 'function'){
          prev.clearProjectileShield(sourceId);
        }
      }
    }
    state.auraRecipients = newRecipients;
    // Aura visuals are no longer applied; keep the tracking set empty for compatibility.
    if(!(state.necroMarkedEnemies instanceof Set)) state.necroMarkedEnemies = new Set();
    for(const prev of state.necroMarkedEnemies){
      if(!newNecro.has(prev) && prev && prev.necromancerMarks instanceof Map){
        prev.necromancerMarks.delete(sourceId);
        if(prev.necromancerMarks.size === 0) prev.necromancerMarks = null;
      }
    }
    state.necroMarkedEnemies = newNecro;
  },
  _updateStaffSoulControl(state, weapon, config, dt, now){
    if(!state || !weapon) return;
    const auraConfig = config && config.aura ? config.aura : {};
    const baseRadius = StickWeaponState._staffAuraBaseRadius.call(this, weapon, auraConfig);
    const souls = clamp(Math.round(state.soulCount || 0), 0, 10);
    const world = this.world;
    let aim = state.lastAim;
    if(world && world.selected === this && world.input?.aim){
      aim = { x: world.input.aim.x, y: world.input.aim.y };
    }
    const origin = (state.auraCenter && state.auraCenter.x !== undefined)
      ? state.auraCenter
      : (typeof this.center === 'function' ? this.center() : (state.tipPosition || null));
    const range = config.range !== undefined ? config.range : baseRadius * 1.2;
    const maxCharge = state.maxCharge || 1;
    const chargeRatio = clamp(maxCharge > 0 ? state.charge / maxCharge : 0, 0, 1);
    if(!aim && origin){
      aim = { x: origin.x + this.dir * range, y: origin.y };
    }else if(!aim){
      aim = origin ? { x: origin.x, y: origin.y } : { x: 0, y: 0 };
    }
    let desired = aim;
    if(origin){
      const dx = aim.x - origin.x;
      const dy = aim.y - origin.y;
      const dist = Math.hypot(dx, dy) || 1;
      const maxDist = range * (state.firing ? Math.max(0.35, chargeRatio) : 1);
      const limited = Math.max(0, Math.min(dist, maxDist));
      desired = {
        x: origin.x + dx / dist * limited,
        y: origin.y + dy / dist * limited
      };
    }
    if(!state.firing || !origin){
      desired = origin ? { x: origin.x, y: origin.y } : desired;
    }
    const previousPoint = state.soulControlPoint && Number.isFinite(state.soulControlPoint.x)
      ? state.soulControlPoint
      : (origin ? { x: origin.x, y: origin.y } : desired);
    let nextPoint = desired;
    const maxSpeed = Math.max(120, Number.isFinite(auraConfig.soulControlSpeed) ? auraConfig.soulControlSpeed : 720);
    if(dt > 0){
      const maxStep = maxSpeed * dt;
      const dx = desired.x - previousPoint.x;
      const dy = desired.y - previousPoint.y;
      const distance = Math.hypot(dx, dy);
      if(maxStep > 0 && distance > maxStep){
        const ratio = maxStep / distance;
        nextPoint = {
          x: previousPoint.x + dx * ratio,
          y: previousPoint.y + dy * ratio
        };
      }
    }
    state.soulControlPoint = nextPoint;
    state.soulControlActive = state.firing && souls > 0;
    const pulse = StickWeaponState._staffSoulPulseStrength(state, now);
    const radiusScale = 1 + souls * 0.06;
    const radius = baseRadius * radiusScale * (1 + pulse * 0.25);
    const color = weapon.color || auraConfig.color || weapon.staff?.beamGlow || '#ffffff';
    state.auraRadius = radius;
    state.auraColor = color;
    state.auraSwirlColor = auraConfig.swirlColor || (typeof lightenColor === 'function' ? lightenColor(color, 0.18) : color);
    state.auraCenter = origin ? { x: origin.x, y: origin.y } : nextPoint;
    const hasRecipients = state.auraRecipients instanceof Set && state.auraRecipients.size > 0;
    state.auraActive = state.firing || souls > 0 || hasRecipients;
    state.auraPhase = (state.auraPhase || 0) + dt * (state.firing ? 3 : 1.6);
    state.soulOrbitPhase = (state.soulOrbitPhase || 0) + dt * (state.firing ? 2.4 : 1.3);
    return radius;
  },
  _staffSoulPulseStrength(state, now){
    if(!state) return 0;
    let pulse = 0;
    if(state.soulPulseUntil && now < state.soulPulseUntil){
      const remaining = clamp((state.soulPulseUntil - now) / 480, 0, 1);
      pulse = Math.max(pulse, 0.32 * (1 - remaining));
    }
    if(state.soulBurstPulseUntil && now < state.soulBurstPulseUntil){
      const remaining = clamp((state.soulBurstPulseUntil - now) / 640, 0, 1);
      pulse = Math.max(pulse, 0.45 * (1 - remaining));
    }
    const decay = (state.auraPulseStrength || 0) * 0.88;
    pulse = Math.max(pulse, decay);
    state.auraPulseStrength = pulse;
    return pulse;
  },
  _releaseStaffSouls(reason='manual', point=null){
    const weapon = this.weapon();
    const state = this.staffState;
    if(!weapon || weapon.kind !== 'staff' || !state) return false;
    if(state.soulReleaseHandled){
      state.soulControlActive = false;
      state.soulControlPoint = null;
      return false;
    }
    const souls = clamp(Math.round(state.soulCount || 0), 0, 10);
    state.soulReleaseHandled = true;
    state.soulControlActive = false;
    const center = point || state.soulControlPoint || state.auraCenter || state.tipPosition || (typeof this.center === 'function' ? this.center() : { x: 0, y: 0 });
    if(souls <= 0){
      state.soulControlPoint = null;
      return false;
    }
    const result = StickWeaponState._triggerStaffSoulBurst.call(this, state, weapon, center, { reason });
    state.soulControlPoint = null;
    return result;
  },
  _triggerStaffSoulBurst(state, weapon, center, opts={}){
    if(!state || !weapon || !center) return false;
    const souls = clamp(Math.round(state.soulCount || 0), 0, 10);
    if(souls <= 0) return false;
    const world = this.world;
    if(!world){
      state.soulCount = 0;
      return false;
    }
    const auraConfig = weapon.staff?.aura || {};
    const baseRadius = StickWeaponState._staffAuraBaseRadius.call(this, weapon, auraConfig);
    const radius = baseRadius * Math.max(1.1, 1 + souls * 0.12);
    const damage = Math.max(1, Math.round(1 + souls * 0.8));
    const sticks = Array.isArray(world.sticks) ? world.sticks : [];
    for(const target of sticks){
      if(!target || target === this || target.dead) continue;
      if(target.isEnemy === this.isEnemy) continue;
      if(typeof target.takeDamage !== 'function') continue;
      const point = typeof target.center === 'function' ? target.center() : null;
      if(!point) continue;
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      if(Math.hypot(dx, dy) > radius) continue;
      const dir = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
      const element = weapon.staff?.element || weapon.element || this.element || 'magic';
      target.takeDamage(Math.max(1, Math.round(damage)), dir * 0.25, 0.16, this, {
        element,
        type: 'soulBurst'
      });
    }
    const nowTime = nowMs();
    state.soulCount = 0;
    state.soulPulseUntil = nowTime + 520;
    state.soulBurstPulseUntil = nowTime + 640;
    state.soulOrbitPhase = 0;
    state.lastSoulBurstAt = nowTime;
    if(world){
      if(!Array.isArray(world.particles)) world.particles = [];
      const count = 12 + souls * 2;
      const color = weapon.color || '#d6cfc5';
      for(let i=0;i<count;i++){
        const angle = (typeof TAU === 'number' ? TAU : Math.PI * 2) * (i / count);
        world.particles.push({
          type: 'soulBurst',
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * (80 + souls * 10),
          vy: Math.sin(angle) * (80 + souls * 10),
          life: 320,
          born: nowTime,
          color: colorWithAlpha && color.startsWith('#') ? colorWithAlpha(color, 0.65) : color,
          radius: 6 + souls,
          alpha: 0.5,
          decay: 0.94
        });
      }
    }
    return true;
  },
  _collectStaffSoul(fromPoint=null){
    const weapon = this.weapon();
    const state = this._ensureStaffState(false);
    if(!weapon || weapon.kind !== 'staff' || !state) return false;
    const maxSouls = 10;
    if(state.soulCount >= maxSouls) return false;
    state.soulCount = clamp((state.soulCount || 0) + 1, 0, maxSouls);
    const nowTime = nowMs();
    state.soulPulseUntil = Math.max(state.soulPulseUntil || 0, nowTime + 420);
    if(fromPoint){
      state.lastSoulOrigin = { x: fromPoint.x, y: fromPoint.y };
    }
    return true;
  },
  _clearStaffAura(state){
    if(!state) return;
    const sourceId = state.auraSourceId;
    const weapon = typeof this.weapon === 'function' ? this.weapon() : null;
    const auraShield = !!(weapon && weapon.kind === 'staff' && weapon.staff?.aura?.projectileShield);
    if(state.auraRecipients instanceof Set){
      for(const target of state.auraRecipients){
        if(target && typeof target.clearAuraSource === 'function'){
          target.clearAuraSource(sourceId);
        }
        if(auraShield && target && typeof target.clearProjectileShield === 'function'){
          target.clearProjectileShield(sourceId);
        }
      }
      state.auraRecipients.clear();
    }
    if(state.auraVisualTargets instanceof Set){
      for(const target of state.auraVisualTargets){
        if(target && typeof target.clearAuraVisual === 'function'){
          target.clearAuraVisual(sourceId);
        }
      }
      state.auraVisualTargets.clear();
    }
    if(state.necroMarkedEnemies instanceof Set){
      for(const enemy of state.necroMarkedEnemies){
        if(enemy && enemy.necromancerMarks instanceof Map){
          enemy.necromancerMarks.delete(sourceId);
          if(enemy.necromancerMarks.size === 0) enemy.necromancerMarks = null;
        }
      }
      state.necroMarkedEnemies.clear();
    }
    state.auraActive = false;
    state.auraCenter = null;
    state.auraRadius = 0;
    state.auraColor = null;
    state.auraSwirlColor = null;
  },
  _applyStaffImpactToGeometry(hit, weapon, dt){
    if(!hit || !weapon || dt <= 0) return;
    const world = this.world;
    if(!world) return;
    const rect = hit.rect;
    if(!rect) return;
    const config = weapon.staff || {};
    const damage = Math.max(0, (config.damagePerSecond ?? 24) * dt);
    if(rect.prop && rect.prop.breakable){
      rect.prop.health = (rect.prop.health ?? 30) - damage;
      if(rect.prop.health <= 0 && typeof breakDecorProp === 'function'){
        breakDecorProp(world, rect.prop);
      }
    }
    if(rect.wall){
      if(typeof rect.wall.health === 'number'){
        rect.wall.health = Math.max(0, rect.wall.health - damage);
      }
      rect.wall.shake = Math.max(rect.wall.shake ?? 0, 0.25);
      rect.wall.crumbleTimer = Math.max(rect.wall.crumbleTimer ?? 0, 0.25);
      if(rect.wall.health !== undefined && rect.wall.health <= 0 && typeof breakBreakableStructure === 'function'){
        breakBreakableStructure(world, rect.wall);
      }
    }
    const fieryImpact = typeof isFireElement === 'function' ? isFireElement(config.element) : config.element === 'fire';
    if(fieryImpact && typeof igniteFlammablesAt === 'function'){
      igniteFlammablesAt(world, hit.point.x, hit.point.y, config.beamRadius ?? 18, { intensity: 1.1 });
    }
  },
  _applyStaffBeamDamage(state, weapon, segments, dt, now){
    if(!state || !weapon || !Array.isArray(segments) || segments.length === 0 || dt < 0) return;
    const world = this.world;
    if(!world) return;
    const sticks = Array.isArray(world.sticks) ? world.sticks : [];
    const config = weapon.staff || {};
    const beamRadius = config.beamRadius ?? 14;
    const damagePerSecond = config.damagePerSecond ?? 24;
    const damageBuffer = state.damageBuffer || (state.damageBuffer = new Map());
    const contactPoints = [];
    for(const target of sticks){
      if(!target || target === this || target.dead) continue;
      if(this.isEnemy === target.isEnemy) continue;
      const center = typeof target.center === 'function' ? target.center() : null;
      if(!center) continue;
      const closest = closestPointOnSegments(center, segments);
      if(!closest || closest.distance > beamRadius) continue;
      const accumulated = (damageBuffer.get(target) || 0) + damagePerSecond * dt;
      let remaining = accumulated;
      if(remaining >= 1){
        const dmg = Math.max(1, Math.floor(remaining));
        const dir = closest.direction !== 0 ? Math.sign(closest.direction) : (this.dir >= 0 ? 1 : -1);
        target.takeDamage(dmg, dir * (config.knockScale ?? 0.2), 0.12, this, {
          element: config.element || weapon.element || this.element || 'physical'
        });
        if(!this.isEnemy) this.addXp(4);
        remaining -= dmg;
      }
      damageBuffer.set(target, remaining);
      contactPoints.push({ x: closest.point.x, y: closest.point.y, target });
    }
    for(const [key] of damageBuffer.entries()){
      if(!key || key.dead || key === this || key.world !== this.world || this.isEnemy === key.isEnemy){
        damageBuffer.delete(key);
      }
    }
    state.contactPoints = contactPoints;
    const fiery = typeof isFireElement === 'function' ? isFireElement(config.element) : config.element === 'fire';
    const interval = config.particleInterval ?? (fiery ? 90 : 120);
    if(fiery){
      for(const hit of contactPoints){
        const last = state.particleTimers.get(hit.target) || 0;
        if(now - last >= interval){
          spawnFireParticle(world, hit.x, hit.y, 1.1);
          state.particleTimers.set(hit.target, now);
        }
      }
      if(state.hitPoint && state.hitPoint.kind && now - (state.lastImpactParticle || 0) >= interval){
        spawnFireParticle(world, state.hitPoint.x, state.hitPoint.y, 0.9);
        state.lastImpactParticle = now;
      }
    }else{
      for(const hit of contactPoints){
        const last = state.particleTimers.get(hit.target) || 0;
        if(now - last >= interval){
          spawnArcaneSpark(world, hit.x, hit.y, weapon.staff?.beamColor || weapon.color || '#d5b6ff');
          state.particleTimers.set(hit.target, now);
        }
      }
      if(state.hitPoint && state.hitPoint.kind && now - (state.lastImpactParticle || 0) >= interval){
        spawnArcaneSpark(world, state.hitPoint.x, state.hitPoint.y, weapon.staff?.beamColor || weapon.color || '#d5b6ff', true);
        state.lastImpactParticle = now;
      }
    }
  },
  _consumeSpiritOrb(){
    const state = this._ensureSpiritWeaponState(false);
    if(!state || !Array.isArray(state.orbs) || state.orbs.length === 0) return null;
    const start = Number.isFinite(state.nextIndex) ? state.nextIndex : 0;
    for(let i=0;i<state.orbs.length;i++){
      const idx = (start + i) % state.orbs.length;
      const orb = state.orbs[idx];
      if(!orb || !orb.ready) continue;
      orb.ready = false;
      const regenMs = Math.max(120, state.regenMs || 0);
      orb.regenRemaining = regenMs;
      state.nextIndex = (idx + 1) % state.orbs.length;
      return { index: idx, orb, state };
    }
    return null;
  },
  _spiritOrbitCenter(){
    const head = this.pointsByName?.head;
    if(head){
      return { x: head.x, y: head.y - 10 };
    }
    const center = (typeof this.center === 'function') ? this.center() : null;
    if(center){
      return { x: center.x, y: center.y - 14 };
    }
    return null;
  },
  _spiritOrbPosition(index){
    const state = this.spiritState;
    if(!state || !Array.isArray(state.orbs)) return null;
    const slot = state.orbs[index];
    if(!slot) return null;
    const center = this._spiritOrbitCenter();
    if(!center) return null;
    const weapon = this.weapon();
    const radius = state.radius ?? weapon?.orbitRadius ?? 32;
    const angle = (state.rotation || 0) + (slot.slotAngle || 0);
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    return { x, y };
  },
  _baseGunReloadMs(weapon){
    if(!weapon) return 2000;
    const reload = weapon.reloadMs ?? 2000;
    return Math.max(0, reload);
  },
  _fastGunReloadMs(weapon){
    if(!weapon) return 500;
    const reload = weapon.fastReloadMs ?? 500;
    return Math.max(0, reload);
  },
  _desiredGunReloadMs(weaponId, weaponRef=null){
    const weapon = weaponRef
      || (weaponId && weaponId !== this.currentWeaponId() ? WEAPONS[weaponId] : this.weapon());
    if(!weapon) return 0;
    return this.isGunFastReloadActive(weaponId) ? this._fastGunReloadMs(weapon) : this._baseGunReloadMs(weapon);
  },
  _gunFastReloadCost(weapon){
    if(!weapon) return 0;
    const damage = weapon.projectileDamage ?? weapon.dmg ?? 0;
    return Math.max(1, Math.ceil(damage / 10));
  },
  _spendReloadCoins(amount){
    if(!this.world || amount <= 0) return false;
    const coins = this.world.coins ?? 0;
    if(coins < amount) return false;
    this.world.coins = coins - amount;
    if(this.world.profile){
      this.world.profile.coins = this.world.coins;
    }
    return true;
  },
  _syncGunStateOnEquip(){
    const weaponId = this.currentWeaponId();
    const weapon = this.weapon();
    if(!weapon || weapon.kind !== 'gun') return;
    const state = this._ensureGunState(weaponId, true);
    if(!state || !Array.isArray(state.bullets)) return;
    for(const slot of state.bullets){
      if(!slot) continue;
      slot.ready = true;
      slot.regenRemaining = 0;
      slot.spentAt = 0;
      slot.fastReloadActive = false;
      slot.fastReloadCost = 0;
      slot.reloadDuration = this._desiredGunReloadMs(weaponId, weapon);
    }
  },
  _ensureGunState(weaponId, forceReset=false){
    if(!weaponId) return null;
    const weapon = WEAPONS[weaponId];
    if(!weapon || weapon.kind !== 'gun') return null;
    if(!this.gunStates) this.gunStates = {};
    const capacity = Math.max(1, weapon.bulletCount || weapon.magazine || weapon.capacity || 6);
    const baseReload = this._baseGunReloadMs(weapon);
    const fastReload = this._fastGunReloadMs(weapon);
    const reloadMs = baseReload;
    let state = this.gunStates[weaponId];
    if(!state){
      state = { weaponId, bullets: [], capacity: 0, reloadMs, baseReloadMs: baseReload, fastReloadMs: fastReload, nextIndex: 0, lastFired: 0 };
      this.gunStates[weaponId] = state;
    }
    if(forceReset || state.capacity !== capacity){
      state.capacity = capacity;
      state.reloadMs = reloadMs;
      state.baseReloadMs = baseReload;
      state.fastReloadMs = fastReload;
      state.bullets = [];
      for(let i=0;i<capacity;i++){
        state.bullets.push({ ready: true, regenRemaining: 0, spentAt: 0, reloadDuration: reloadMs, fastReloadActive: false, fastReloadCost: 0 });
      }
      state.nextIndex = 0;
      return state;
    }
    state.reloadMs = reloadMs;
    state.baseReloadMs = baseReload;
    state.fastReloadMs = fastReload;
    if(!Array.isArray(state.bullets)) state.bullets = [];
    if(state.bullets.length < capacity){
      const missing = capacity - state.bullets.length;
      for(let i=0;i<missing;i++){
        state.bullets.push({ ready: true, regenRemaining: 0, spentAt: 0, reloadDuration: reloadMs, fastReloadActive: false, fastReloadCost: 0 });
      }
    }else if(state.bullets.length > capacity){
      state.bullets.splice(capacity);
    }
    state.capacity = capacity;
    return state;
  },
  _consumeGunRound(weapon, now){
    if(!weapon || weapon.kind !== 'gun') return null;
    const weaponId = this.currentWeaponId();
    const state = this._ensureGunState(weaponId);
    if(!state || !Array.isArray(state.bullets) || !state.bullets.length) return null;
    const start = Number.isFinite(state.nextIndex) ? state.nextIndex : 0;
    const baseReload = state.baseReloadMs ?? this._baseGunReloadMs(weapon);
    const fastReload = state.fastReloadMs ?? this._fastGunReloadMs(weapon);
    const wantsFast = this.isGunFastReloadActive(weaponId);
    for(let i=0;i<state.bullets.length;i++){
      const idx = (start + i) % state.bullets.length;
      const slot = state.bullets[idx];
      if(!slot || !slot.ready) continue;
      slot.ready = false;
      let reloadDuration = baseReload;
      slot.fastReloadActive = false;
      slot.fastReloadCost = 0;
      if(wantsFast){
        const cost = this._gunFastReloadCost(weapon);
        if(this._spendReloadCoins(cost)){
          reloadDuration = fastReload;
          slot.fastReloadActive = true;
          slot.fastReloadCost = cost;
        }
      }
      slot.reloadDuration = reloadDuration;
      slot.regenRemaining = reloadDuration;
      slot.spentAt = now;
      state.nextIndex = (idx + 1) % state.bullets.length;
      state.lastFired = now;
      return { index: idx, slot, state };
    }
    return null;
  },
  _syncHalfSlotState(forceReset=false){
    if(this.dead){
      this.halfSlotState = null;
      return null;
    }
    const offhand = this.offhandItem();
    const info = offhand && offhand.type === 'offhand' ? OFFHAND_ITEMS?.[offhand.id] : null;
    if(!info || !info.kind){
      if(this.halfSlotState) this.halfSlotState = null;
      return null;
    }
    const id = offhand.id;
    const kind = info.kind;
    if(!forceReset && this.halfSlotState && this.halfSlotState.id === id && this.halfSlotState.kind === kind){
      return this.halfSlotState;
    }
    if(kind === 'drone'){
      const center = typeof this.center === 'function' ? this.center() : null;
      const follow = info.followDistance ?? 44;
      const hover = info.hoverHeight ?? 28;
      const baseX = center ? center.x - this.dir * follow : 0;
      const baseY = center ? center.y - hover : 0;
      this.halfSlotState = {
        kind: 'drone',
        id,
        drone: {
          x: baseX,
          y: baseY,
          vx: 0,
          vy: 0,
          cooldown: 0,
          aimAngle: this.dir >= 0 ? Math.PI : 0,
          flash: 0
        }
      };
    }else if(kind === 'glyphOrbit'){
      const count = Math.max(1, info.glyphCount || 1);
      const glyphs = [];
      for(let i=0;i<count;i++){
        glyphs.push({
          slotAngle: TAU * (i / count),
          ready: true,
          regenRemaining: 0,
          formRatio: 1,
          x: 0,
          y: 0
        });
      }
      this.halfSlotState = {
        kind: 'glyphOrbit',
        id,
        rotation: 0,
        glyphs
      };
    }else{
      this.halfSlotState = { kind, id };
    }
    return this.halfSlotState;
  },
  _updateHalfSlotDrone(state, info, step){
    const world = this.world;
    if(!world) return;
    if(!state.drone){
      this._syncHalfSlotState(true);
      if(!state.drone) return;
    }
    const drone = state.drone;
    const center = typeof this.center === 'function' ? this.center() : null;
    if(!center) return;
    const follow = info.followDistance ?? 44;
    const hover = info.hoverHeight ?? 28;
    const targetX = center.x - this.dir * follow;
    const targetY = center.y - hover;
    const followLerp = clamp(step * 8, 0, 1);
    drone.x += (targetX - drone.x) * followLerp;
    drone.y += (targetY - drone.y) * followLerp;
    const msStep = Math.max(0, step) * 1000;
    drone.cooldown = Math.max(0, (drone.cooldown || 0) - msStep);
    if(drone.flash){
      drone.flash = Math.max(0, drone.flash - step * 4);
    }
    const range = info.range ?? 420;
    let best = null;
    for(const stick of world.sticks){
      if(!stick || stick === this || stick.dead) continue;
      if(stick.isEnemy === this.isEnemy) continue;
      const enemyCenter = typeof stick.center === 'function' ? stick.center() : null;
      if(!enemyCenter) continue;
      const dx = enemyCenter.x - drone.x;
      const dy = enemyCenter.y - drone.y;
      const dist = Math.hypot(dx, dy);
      if(!(dist > 0) || dist > range) continue;
      if(!this._hasHalfSlotLineOfSight({ x: drone.x, y: drone.y }, enemyCenter, info.losMargin ?? 12, dist)) continue;
      if(!best || dist < best.dist){
        best = { target: stick, center: enemyCenter, dist };
      }
    }
    if(best){
      const desired = Math.atan2(best.center.y - drone.y, best.center.x - drone.x);
      drone.aimAngle = this._lerpAngle(drone.aimAngle ?? desired, desired, clamp(step * 10, 0, 1));
      if(drone.cooldown <= 0 && typeof shootProjectile === 'function'){
        const knock = Number.isFinite(info.knockback) ? info.knockback : 90;
        const projectileKind = info.projectileKind || 'droneBolt';
        const projectileOpts = {
          damage: info.projectileDamage ?? 8,
          speed: info.projectileSpeed ?? 820,
          gravity: false,
          color: info.projectileColor || info.color || '#dff3ff',
          trailColor: info.trailColor,
          knock,
          origin: { x: drone.x, y: drone.y },
          target: best.center,
          ttl: info.projectileTtl ?? (projectileKind === 'droneSeekerMissile' ? 2600 : 1800),
          radius: info.projectileRadius ?? (projectileKind === 'droneSeekerMissile' ? 7.5 : 4.5)
        };
        if(projectileKind === 'droneSeekerMissile'){
          projectileOpts.homing = true;
          projectileOpts.maxSpeed = info.missileMaxSpeed ?? 780;
          projectileOpts.turnRate = info.missileTurnRate ?? 4.8;
          projectileOpts.seekForce = info.missileSeekForce ?? 960;
          projectileOpts.drag = info.missileDrag ?? 0.06;
          projectileOpts.blastRadius = info.missileBlastRadius ?? 96;
          projectileOpts.blastDamage = info.missileBlastDamage ?? (info.projectileDamage ?? 16);
          projectileOpts.effectColor = info.effectColor || info.projectileColor || info.color;
          projectileOpts.tipColor = info.effectColor || info.projectileColor || info.color;
          projectileOpts.accentColor = info.bodyColor || info.color;
          projectileOpts.length = info.missileLength ?? 28;
          projectileOpts.lockedTarget = best.target;
        }
        shootProjectile(this, null, projectileKind, projectileOpts, world);
        drone.cooldown = Math.max(0, info.cooldownMs ?? 600);
        drone.flash = 1;
        this._spawnHalfSlotSpark(drone.x, drone.y, info.accentColor || info.projectileColor || info.color, 4);
      }
    }else{
      const fallback = Math.atan2(center.y - drone.y, center.x - drone.x);
      drone.aimAngle = this._lerpAngle(drone.aimAngle ?? fallback, fallback, clamp(step * 3, 0, 1));
    }
  },
  _updateHalfSlotGlyphOrbit(state, info, step){
    const world = this.world;
    if(!world) return;
    if(!Array.isArray(state.glyphs) || !state.glyphs.length){
      this._syncHalfSlotState(true);
      if(!Array.isArray(state.glyphs) || !state.glyphs.length) return;
    }
    const center = typeof this.center === 'function' ? this.center() : null;
    if(!center) return;
    const radius = info.orbitRadius ?? 40;
    const speed = info.orbitSpeed ?? 1.4;
    const regenMs = Math.max(200, info.regenMs ?? 1500);
    const hitRadius = Math.max(6, info.hitRadius ?? 14);
    state.rotation = (state.rotation || 0) + speed * step;
    if(state.rotation > TAU || state.rotation < -TAU){
      state.rotation = state.rotation % TAU;
    }
    const msStep = Math.max(0, step) * 1000;
    for(const glyph of state.glyphs){
      if(!glyph) continue;
      const angle = (state.rotation || 0) + (glyph.slotAngle || 0);
      glyph.x = center.x + Math.cos(angle) * radius;
      glyph.y = center.y + Math.sin(angle) * radius;
      if(!glyph.ready){
        glyph.regenRemaining = Math.max(0, (glyph.regenRemaining ?? regenMs) - msStep);
        if(glyph.regenRemaining <= 0){
          glyph.ready = true;
          glyph.regenRemaining = 0;
        }
      }
      const ratio = glyph.ready ? 1 : clamp(1 - (glyph.regenRemaining || 0) / regenMs, 0, 1);
      glyph.formRatio = ratio;
      if(!glyph.ready) continue;
      for(const stick of world.sticks){
        if(!stick || stick === this || stick.dead) continue;
        if(stick.isEnemy === this.isEnemy) continue;
        const enemyCenter = typeof stick.center === 'function' ? stick.center() : null;
        if(!enemyCenter) continue;
        const dist = Math.hypot(enemyCenter.x - glyph.x, enemyCenter.y - glyph.y);
        if(dist > hitRadius) continue;
        const damage = info.contactDamage ?? 6;
        const knockScale = info.knockScale ?? 0.35;
        const horiz = dist > 0 ? ((enemyCenter.x - glyph.x) / dist) * knockScale : knockScale;
        if(typeof stick.takeDamage === 'function'){
          stick.takeDamage(damage, horiz, 0.12, this, {
            element: info.element || this.element || 'physical'
          });
        }
        if(!this.isEnemy && stick.isEnemy && typeof this.addXp === 'function'){
          this.addXp(6);
        }
        glyph.ready = false;
        glyph.regenRemaining = regenMs;
        glyph.formRatio = 0;
        this._spawnHalfSlotSpark(glyph.x, glyph.y, info.sparkColor || info.glyphColor || info.color, 6);
        break;
      }
    }
  },
  _spawnHalfSlotSpark(x, y, color, size=4){
    const world = this.world;
    if(!world) return;
    if(!world.particles) world.particles = [];
    const particle = {
      type: 'spark',
      style: 'spark',
      x,
      y,
      vx: rand(-60, 60),
      vy: rand(-90, -20),
      gravityScale: 0.4,
      life: 0,
      maxLife: 360,
      radius: Math.max(1.8, size ?? 4),
      color: color || '#f2f2ff',
      alpha: 0.9,
      fade: 1
    };
    if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'spark');
    world.particles.push(particle);
    const limit = 360;
    if(world.particles.length > limit){
      world.particles.splice(0, world.particles.length - limit);
    }
  },
  _hasHalfSlotLineOfSight(origin, target, margin=8, distanceHint=null){
    if(!origin || !target) return false;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dist = distanceHint !== null ? distanceHint : Math.hypot(dx, dy);
    if(!(dist > 0.0001)) return true;
    const dir = { x: dx / dist, y: dy / dist };
    const rects = this._solidRectangles();
    if(!rects.length) return true;
    const hit = raycastEnvironment(origin, dir, dist, rects);
    if(!hit) return true;
    const tolerance = Math.max(0, margin ?? 8);
    return hit.distance >= dist - tolerance;
  },
  _lerpAngle(current, target, factor){
    if(!Number.isFinite(target)) return current;
    if(!Number.isFinite(current)) return target;
    const delta = this._normalizeRadians(target - current);
    const t = clamp(factor ?? 0, 0, 1);
    return current + delta * t;
  }
};

function notifyStaffSoulHarvest(victim, source){
  if(!victim || !victim.world) return;
  const world = victim.world;
  const sticks = Array.isArray(world.sticks) ? world.sticks : [];
  const center = typeof victim.center === 'function'
    ? victim.center()
    : { x: victim.pointsByName?.pelvis?.x || 0, y: victim.pointsByName?.pelvis?.y || 0 };
  for(const stick of sticks){
    if(!stick || stick.dead || stick.isEnemy) continue;
    if(typeof stick.weapon !== 'function') continue;
    const weapon = stick.weapon();
    if(!weapon || weapon.kind !== 'staff') continue;
    const state = stick.staffState;
    if(!state || !state.auraActive) continue;
    const auraConfig = weapon.staff?.aura || {};
    const auraCenter = (state.auraCenter && state.auraCenter.x !== undefined)
      ? state.auraCenter
      : (typeof stick.center === 'function' ? stick.center() : null);
    const auraRadius = (state.auraRadius && state.auraRadius > 0)
      ? state.auraRadius
      : StickWeaponState._staffAuraBaseRadius.call(stick, weapon, auraConfig);
    if(!auraCenter || !(auraRadius > 0)) continue;
    const dx = center.x - auraCenter.x;
    const dy = center.y - auraCenter.y;
    if(Math.hypot(dx, dy) > auraRadius) continue;
    if(typeof StickWeaponState._collectStaffSoul !== 'function') continue;
    const collected = StickWeaponState._collectStaffSoul.call(stick, center);
    if(collected && world){
      if(!Array.isArray(world.particles)) world.particles = [];
      const now = nowMs();
      const color = weapon.color || '#d6cfc5';
      world.particles.push({
        type: 'staffSoul',
        x: center.x,
        y: center.y,
        vx: rand ? rand(-40, 40) : 0,
        vy: rand ? rand(-160, -60) : -80,
        gravityScale: 0.3,
        born: now,
        life: 0,
        maxLife: 540,
        alpha: 0.8,
        color: colorWithAlpha && color.startsWith('#') ? colorWithAlpha(color, 0.6) : color,
        radius: 6,
        fade: 0.96
      });
    }
  }
}
