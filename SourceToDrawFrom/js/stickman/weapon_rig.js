// stickman/weapon_rig.js

const StickWeaponRig = {
  refreshWeaponRig(now){
    const t = now !== undefined ? now : nowMs();
    this._updateWeaponRig(t);
    this._ensureSpiritWeaponState();
    this._syncSummonerStateOnEquip();
  },

  _updateWeaponRig(now){
    if(this.isEnemy){
      if(this.weaponRig) this._removeWeaponRig();
      return;
    }
    const world = this.world;
    if(!world){
      if(this.weaponRig) this._removeWeaponRig();
      return;
    }
    const weaponId = this.currentWeaponId();
    const rigInfo = this._rigInfoForWeapon(weaponId);
    if(!rigInfo){
      if(this.weaponRig) this._removeWeaponRig();
      return;
    }
    if(!this.weaponRig
      || this.weaponRig.type !== rigInfo.type
      || this.weaponRig.variant !== rigInfo.variant){
      this._removeWeaponRig();
      if(rigInfo.type === 'sword') this._initSwordRig(rigInfo.variant);
    }
    if(this.weaponRig && this.weaponRig.type === 'sword'){
      this._updateSwordRigState(now);
    }
  },

  _rigInfoForWeapon(weaponId){
    if(!weaponId) return null;
    if(weaponId === 'sword') return { type: 'sword', variant: 'sword' };
    if(weaponId === 'sigilBlade') return { type: 'sword', variant: 'sword' };
    if(weaponId === 'auricDagger') return { type: 'sword', variant: 'sword' };
    if(weaponId === 'chronoBlade') return { type: 'sword', variant: 'sword' };
    if(weaponId === 'greatsword') return { type: 'sword', variant: 'greatsword' };
    if(weaponId === 'crumblingClaymore' || weaponId === 'photostigma') return { type: 'sword', variant: 'greatsword' };
    return null;
  },

  _initSwordRig(variant='sword'){
    const world = this.world;
    if(!world) return;
    const config = swordVariantConfig(variant);
    const pelvis = this.pelvis();
    const idleDir = swordIdleDirectionForDir(this.dir, config);
    const baseBack = config.baseBack ?? 52;
    const baseDown = config.baseDown ?? 72;
    const baseX = pelvis ? pelvis.x + idleDir * baseBack : 0;
    const baseY = pelvis ? pelvis.y + baseDown : 0;
    const tip = new Point(baseX, baseY);
    tip.owner = this;
    tip.mass = config.tipMass ?? 2.6;
    tip.groundFriction = 0;
    tip.restTerrainRadius = 0;
    tip.attackTerrainRadius = 0;
    tip.terrainRadius = 0;
    tip.ignoreTerrain = true;
    tip.isSwordTip = true;
    if(config.dragStyle){
      const ground = groundHeightAt(world, baseX, { surface: 'top' });
      const clampedY = Math.min(baseY, ground);
      tip.teleport(baseX, clampedY);
    }else{
      tip.teleport(baseX, baseY);
    }
    this.points.push(tip);
    this.pointsByName.swordTip = tip;
    world.points.push(tip);
    this.weaponRig = {
      type: 'sword',
      variant,
      tip,
      constraints: [],
      handName: null,
      sparks: [],
      nextSparkTime: 0,
      handRestLength: null,
      elbowRestLength: null,
      restTerrainRadius: 0,
      attackTerrainRadius: 0,
      trail: [],
      trailLife: config.trailLife ?? 160,
      trailAlpha: config.trailAlpha ?? 0.6,
      trailWidthScale: config.trailWidthScale ?? 0.78,
      trailGlow: config.trailGlow ?? 0,
      switchGhostLife: config.switchGhostLife ?? 200,
      switchGhostMax: config.switchGhostMax ?? 3,
      switchGhostAlpha: config.switchGhostAlpha ?? 0.6,
      handSwitchGhosts: [],
      comboSpinState: null,
      dragDropMargin: config.dragDropMargin ?? 10,
      dragDropPull: config.dragDropPull ?? 0.28,
      forceDrop: false,
      dropTargetY: null
    };
    this._rebuildSwordConstraints();
  },

  _rebuildSwordConstraints(){
    const rig = this.weaponRig;
    const world = this.world;
    if(!rig || rig.type !== 'sword' || !world) return;
    if(rig.constraints && rig.constraints.length){
      for(const c of rig.constraints){
        const idx = world.constraints.indexOf(c);
        if(idx >= 0) world.constraints.splice(idx, 1);
      }
    }
    rig.constraints = [];
    const tip = rig.tip;
    if(!tip) return;
    const config = swordVariantConfig(rig.variant);
    const handName = swordGripHandForDir(this.dir, config);
    const elbowName = swordGripElbowForDir(this.dir, config);
    const hand = this.pointsByName[handName];
    const elbow = this.pointsByName[elbowName];
    if(!hand || !elbow) return;
    const handMin = config.handRestMin ?? 80;
    const elbowMin = config.elbowRestMin ?? 62;
    const handMax = Math.max(handMin, config.handRestMax ?? handMin * 1.6);
    const elbowMax = Math.max(elbowMin, config.elbowRestMax ?? elbowMin * 1.6);
    const currentHand = Math.hypot(hand.x - tip.x, hand.y - tip.y);
    const measuredHand = Number.isFinite(currentHand) ? currentHand : handMin;
    const currentElbow = Math.hypot(elbow.x - tip.x, elbow.y - tip.y);
    const measuredElbow = Number.isFinite(currentElbow) ? currentElbow : elbowMin;
    if(rig.handRestLength == null){
      const defaultHand = Number.isFinite(config.handRest) ? config.handRest : handMin;
      const desiredHand = Math.max(handMin, defaultHand, measuredHand);
      rig.handRestLength = clamp(desiredHand, handMin, handMax);
    }else{
      rig.handRestLength = clamp(rig.handRestLength, handMin, handMax);
    }
    if(rig.elbowRestLength == null){
      const defaultElbow = Number.isFinite(config.elbowRest) ? config.elbowRest : elbowMin;
      const desiredElbow = Math.max(elbowMin, defaultElbow, measuredElbow);
      rig.elbowRestLength = clamp(desiredElbow, elbowMin, elbowMax);
    }else{
      rig.elbowRestLength = clamp(rig.elbowRestLength, elbowMin, elbowMax);
    }
    const handRest = rig.handRestLength;
    const elbowRest = rig.elbowRestLength;
    const useOneWay = config.oneWayConstraints && typeof OneWayDist === 'function';
    const ConstraintCtor = useOneWay ? OneWayDist : Dist;
    const linkHand = new ConstraintCtor(hand, tip, handRest, config.handStiffness ?? 0.22);
    const linkElbow = new ConstraintCtor(elbow, tip, elbowRest, config.elbowStiffness ?? 0.18);
    rig.constraints.push(linkHand, linkElbow);
    rig.handName = handName;
    world.constraints.push(linkHand);
    world.constraints.push(linkElbow);
    rig.constraintsDetached = false;
  },

  _detachSwordConstraints(){
    const rig = this.weaponRig;
    const world = this.world;
    if(!rig || rig.type !== 'sword' || !world) return;
    if(!Array.isArray(rig.constraints) || !rig.constraints.length) return;
    if(rig.constraintsDetached) return;
    for(const c of rig.constraints){
      const idx = world.constraints.indexOf(c);
      if(idx >= 0) world.constraints.splice(idx, 1);
    }
    rig.constraintsDetached = true;
  },

  _ensureSwordConstraintsAttached(){
    const rig = this.weaponRig;
    const world = this.world;
    if(!rig || rig.type !== 'sword' || !world) return;
    if(!Array.isArray(rig.constraints) || !rig.constraints.length){
      this._rebuildSwordConstraints();
      return;
    }
    if(!rig.constraintsDetached) return;
    for(const c of rig.constraints){
      if(world.constraints.indexOf(c) === -1){
        world.constraints.push(c);
      }
    }
    rig.constraintsDetached = false;
  },

  _removeWeaponRig(){
    const rig = this.weaponRig;
    if(!rig) return;
    const world = this.world;
    if(rig.constraints && world){
      for(const c of rig.constraints){
        const idx = world.constraints.indexOf(c);
        if(idx >= 0) world.constraints.splice(idx, 1);
      }
    }
    const tip = rig.tip;
    if(tip){
      if(world){
        const wIdx = world.points.indexOf(tip);
        if(wIdx >= 0) world.points.splice(wIdx, 1);
      }
      const pIdx = this.points.indexOf(tip);
      if(pIdx >= 0) this.points.splice(pIdx, 1);
      if(this.pointsByName.swordTip === tip) delete this.pointsByName.swordTip;
      tip.owner = null;
    }
    this._endWeaponSheathGrab();
    rig.comboSpinState = null;
    rig.comboFirstSwingState = null;
    this.weaponRig = null;
    this.weaponSheathPose = null;
    this.weaponSheathed = false;
  },

  _updateSwordRigState(now){
    const rig = this.weaponRig;
    const world = this.world;
    if(!rig || rig.type !== 'sword'){ return; }
    if(!world){ this._removeWeaponRig(); return; }
    const tip = rig.tip;
    if(!tip){ this._removeWeaponRig(); return; }

    const config = swordVariantConfig(rig.variant);
    const weaponDef = typeof this.weapon === 'function' ? this.weapon() : null;
    const timeBladeConfig = weaponDef?.timeBlade || null;
    const weaponElement = (weaponDef?.element || '').toString().toLowerCase();
    const spawnIceTrail = weaponElement === 'ice' && typeof spawnIceTrailParticle === 'function';
    if(!Number.isFinite(rig.lastIceTrailAt)) rig.lastIceTrailAt = 0;
    const drawn = (!config.dragStyle) || (this.weaponVisible && this.weaponHand);
    tip.owner = this;
    tip.mass = config.tipMass ?? 2.8;
    tip.groundFriction = 0;
    tip.isSwordTip = true;
    tip.poseTargetX = tip.x;
    tip.poseTargetY = tip.y;

    const swinging = this.weaponVisible && now < this.weaponSwingUntil;
    const terrainIgnoreActive = now < (this.weaponTerrainIgnoreUntil || 0);
    if(swinging || terrainIgnoreActive){
      tip.grounded = false;
      tip.preGroundContact = false;
    }
    tip.restTerrainRadius = 0;
    tip.attackTerrainRadius = 0;
    tip.terrainRadius = 0;
    tip.ignoreTerrain = true;
    rig.forceDrop = false;
    rig.dropTargetY = null;

    rig.trailLife = config.trailLife ?? rig.trailLife ?? 160;
    rig.trailAlpha = config.trailAlpha ?? rig.trailAlpha ?? 0.6;
    rig.trailWidthScale = config.trailWidthScale ?? rig.trailWidthScale ?? 0.78;
    rig.trailGlow = config.trailGlow ?? rig.trailGlow ?? 0;
    rig.switchGhostLife = config.switchGhostLife ?? rig.switchGhostLife ?? 200;
    rig.switchGhostMax = config.switchGhostMax ?? rig.switchGhostMax ?? 3;
    rig.switchGhostAlpha = config.switchGhostAlpha ?? rig.switchGhostAlpha ?? 0.6;
    rig.dragDropMargin = config.dragDropMargin ?? rig.dragDropMargin ?? 10;
    rig.dragDropPull = config.dragDropPull ?? rig.dragDropPull ?? 0.28;
    rig.trail = rig.trail || [];
    rig.handSwitchGhosts = rig.handSwitchGhosts || [];
    const trail = rig.trail;
    const allowTrail = isHighGraphicsEnabled(world);
    if(swinging && allowTrail){
      trail.push({ x: tip.x, y: tip.y, time: now });
      const maxTrail = config.trailMaxPoints ?? 28;
      if(trail.length > maxTrail){
        trail.splice(0, trail.length - maxTrail);
      }
      if(spawnIceTrail){
        const lastSpawn = rig.lastIceTrailAt || 0;
        if(now - lastSpawn > 36){
          const dx = (tip.x ?? 0) - (tip.prevX ?? tip.x ?? 0);
          const dy = (tip.y ?? 0) - (tip.prevY ?? tip.y ?? 0);
          const speed = Math.hypot(dx, dy);
          if(speed > 4){
            spawnIceTrailParticle(world, tip.x, tip.y, {
              width: 10,
              height: 14,
              opacity: 0.7,
              maxLife: 520,
              cap: 360,
              owner: this,
              slowMultiplier: weaponDef?.iceSlowMultiplier,
              slowDurationMs: weaponDef?.iceSlowDurationMs
            });
            rig.lastIceTrailAt = now;
          }
        }
      }
    }
    const life = rig.trailLife ?? 160;
    if(!allowTrail){
      if(trail.length) trail.length = 0;
    }else{
      while(trail.length && now - trail[0].time > life){
        trail.shift();
      }
    }
    if(rig.handSwitchGhosts.length){
      const ghostLife = rig.switchGhostLife ?? 200;
      for(let i = rig.handSwitchGhosts.length - 1; i >= 0; i--){
        if(now - rig.handSwitchGhosts[i].time > ghostLife){
          rig.handSwitchGhosts.splice(i, 1);
        }
      }
      const maxGhosts = rig.switchGhostMax ?? 3;
      while(rig.handSwitchGhosts.length > maxGhosts){
        rig.handSwitchGhosts.shift();
      }
    }

    const pelvis = this.pelvis();
    tip.poseTargetY = tip.poseTargetY ?? tip.y;

    const sheathed = !!this.weaponSheathed && !this.weaponVisible && !this.comboAnim;
    tip.ignoreGround = false;
    if(sheathed){
      this._detachSwordConstraints();
      tip.dragged = true;
      if(pelvis){
        const pose = computeSwordSheathPose(this, config);
        if(pose){
          tip.teleport(pose.tip.x, pose.tip.y);
          this.weaponSheathPose = pose;
          if(this.weaponSheathGrabUntil > now){
            this.weaponSheathGrabHand = this.dir >= 0 ? 'handR' : 'handL';
          }
          if(Array.isArray(rig.trail)) rig.trail.length = 0;
          if(Array.isArray(rig.timeBladeTrail)) rig.timeBladeTrail.length = 0;
          if(Array.isArray(rig.sparks)) rig.sparks.length = 0;
          rig.scraping = false;
        }
      }
      tip.ignoreGround = true;
      tip.ignoreTerrain = true;
      tip.terrainRadius = 0;
      tip.restTerrainRadius = 0;
      tip.attackTerrainRadius = 0;
      tip.platformId = null;
      tip.grounded = false;
      tip.preGroundContact = false;
      tip.vx = 0;
      tip.vy = 0;
      tip.prevX = tip.x;
      tip.prevY = tip.y;
      tip.wallContact = false;
      tip.wallContactDir = 0;
      if(tip.lastWallDir) tip.lastWallDir = 0;
      tip.poseTargetX = tip.x;
      tip.poseTargetY = tip.y;
      rig.comboSpinState = null;
      rig.comboFirstSwingState = null;
      return;
    }

    if(this.weaponSheathPose){
      this.weaponSheathPose = null;
    }
    this._endWeaponSheathGrab();
    this._ensureSwordConstraintsAttached();
    tip.dragged = false;

    if(timeBladeConfig){
      const delay = Math.max(0, timeBladeConfig.trailDelayMs ?? timeBladeConfig.echoDelayMs ?? 3000);
      const life = Math.max(60, timeBladeConfig.trailLifeMs ?? rig.trailLife ?? 160);
      const maxPoints = Math.max(4, timeBladeConfig.trailMaxPoints ?? 96);
      rig.timeBladeTrailDelay = delay;
      rig.timeBladeTrailLife = life;
      rig.timeBladeTrailColor = timeBladeConfig.trailColor || '#ffffff';
      rig.timeBladeTrailWidthScale = timeBladeConfig.trailWidthScale ?? 1.25;
      const trail = rig.timeBladeTrail || (rig.timeBladeTrail = []);
      if(allowTrail){
        trail.push({ x: tip.x, y: tip.y, time: now });
        if(trail.length > maxPoints){
          trail.splice(0, trail.length - maxPoints);
        }
        const expireBefore = now - (delay + life);
        while(trail.length && trail[0].time < expireBefore){
          trail.shift();
        }
      }else if(trail.length){
        trail.length = 0;
      }
    }else if(Array.isArray(rig.timeBladeTrail) && rig.timeBladeTrail.length){
      rig.timeBladeTrail.length = 0;
    }

    const desiredHand = swordGripHandForDir(this.dir, config);
    if(rig.handName !== desiredHand){
      const prevHandName = rig.handName;
      const prevHandPoint = prevHandName ? this.pointsByName[prevHandName] : null;
      const prevHand = prevHandPoint ? { x: prevHandPoint.x, y: prevHandPoint.y } : null;
      const prevTip = { x: tip.x, y: tip.y };
      rig.handName = desiredHand;
      this._rebuildSwordConstraints();
      if(pelvis){
        const idleDir = swordIdleDirectionForDir(this.dir, config);
        const baseBack = config.baseBack ?? 52;
        const baseDown = config.baseDown ?? 72;
        const baseX = pelvis.x + idleDir * baseBack;
        const baseY = pelvis.y + baseDown;
        if(config.dragStyle){
          const ground = groundHeightAt(world, baseX, { surface: 'top' });
          const y = Math.min(baseY, ground);
          tip.teleport(baseX, y);
        }else{
          tip.teleport(baseX, baseY);
        }
        tip.vx = 0;
        tip.vy = 0;
      }
      const newHandPoint = this.pointsByName[desiredHand];
      const newHand = newHandPoint ? { x: newHandPoint.x, y: newHandPoint.y } : null;
      const newTip = { x: tip.x, y: tip.y };
      if(prevHand && newHand){
        rig.handSwitchGhosts.push({
          oldHand: prevHand,
          oldTip: prevTip,
          newHand,
          newTip,
          time: now
        });
        const maxGhosts = rig.switchGhostMax ?? 3;
        if(rig.handSwitchGhosts.length > maxGhosts){
          rig.handSwitchGhosts.splice(0, rig.handSwitchGhosts.length - maxGhosts);
        }
      }
    }

    if(pelvis){
      if(config.dragStyle && !drawn){
        const backDir = swordIdleDirectionForDir(this.dir, config);
        const targetBack = config.targetBack ?? 54;
        const targetDown = config.targetDown ?? 72;
        const targetX = pelvis.x + backDir * targetBack;
        const targetYBase = pelvis.y + targetDown;
        const ground = groundHeightAt(world, targetX, { surface: 'top' });
        const targetY = Math.min(targetYBase, ground);
        const pullStrength = config.pullStrength ?? 0.18;
        const pullX = config.pullX ?? 0.12;
        const pullY = config.pullY ?? 0.16;
        tip.vx += (targetX - tip.x) * pullStrength * pullX;
        tip.vy += (targetY - tip.y) * pullStrength * pullY;
      }else if(!config.dragStyle){
        const idleDir = swordIdleDirectionForDir(this.dir, config);
        const targetBack = config.targetBack ?? 32;
        const targetDown = config.targetDown ?? -60;
        const targetX = pelvis.x + idleDir * targetBack;
        const targetY = pelvis.y + targetDown;
        const pullStrength = config.pullStrength ?? 0.22;
        const pullX = config.pullX ?? 0.14;
        const pullY = config.pullY ?? 0.18;
        tip.vx += (targetX - tip.x) * pullStrength * pullX;
        tip.vy += (targetY - tip.y) * pullStrength * pullY;
      }
    }

    const dt = world.lastDt ?? (1/60);
    if(dt > 0){
      const tipSpeed = Math.hypot(tip.vx, tip.vy);
      const groundLevel = (config.dragStyle && !drawn && world) ? groundHeightAt(world, tip.x, { surface: 'top' }) : null;
      const manualGrounded = groundLevel !== null ? (tip.y >= groundLevel - 1) : false;
      const grounded = tip.grounded || tip.preGroundContact || manualGrounded;
      const sparkSpeed = config.sparkSpeedThreshold ?? 60;
      if(grounded && tipSpeed > sparkSpeed){
        if(now >= (rig.nextSparkTime || 0)){
          const cooldown = config.sparkCooldown ?? 60;
          rig.nextSparkTime = now + cooldown;
          const burstThreshold = config.sparkBurstThreshold ?? 200;
          const minCount = config.sparkMinCount ?? 1;
          const burstCount = config.sparkBurstCount ?? Math.max(3, minCount);
          const sparkCount = tipSpeed > burstThreshold ? burstCount : minCount;
          rig.sparks = rig.sparks || [];
          const sideRange = config.sparkSide || { min: -70, max: 40 };
          const upRange = config.sparkUp || { min: -140, max: -80 };
          const backRange = config.sparkBack || { min: 20, max: 60 };
          const xRange = config.sparkXOffset || { min: -6, max: 6 };
          const yRange = config.sparkYOffset || { min: 1, max: 5 };
          for(let i=0;i<sparkCount;i++){
            rig.sparks.push({
              x: tip.x + rand(xRange.min, xRange.max),
              y: tip.y - rand(yRange.min, yRange.max),
              vx: rand(sideRange.min, sideRange.max) - this.dir * rand(backRange.min, backRange.max),
              vy: rand(upRange.min, upRange.max),
              life: 0,
              maxLife: rand(140, 240)
            });
          }
          const maxSparks = config.maxSparks ?? 32;
          if(rig.sparks.length > maxSparks){
            rig.sparks.splice(0, rig.sparks.length - maxSparks);
          }
        }
        rig.scraping = true;
      }else{
        rig.scraping = false;
      }
      if(rig.sparks && rig.sparks.length){
        const dtMs = dt * 1000;
        const gravity = 900;
        const survivors = [];
        for(const s of rig.sparks){
          s.life += dtMs;
          if(s.life >= s.maxLife) continue;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += gravity * dt;
          survivors.push(s);
        }
        rig.sparks = survivors;
      }
    }

    if(!this.comboAnim){
      const lag = this.armLagOutput[rig.handName];
      if(lag){
        const idleLag = config.idleLag || { x: -36, y: 28 };
        const lagX = this.dir >= 0 ? idleLag.x : -idleLag.x;
        lag.x += lagX;
        lag.y += idleLag.y;
      }
    }
  },

  _applySwordComboPose(now){
    const rig = this.weaponRig;
    if(!rig || rig.type !== 'sword') return;
    const tip = rig.tip;
    if(!tip){
      rig.comboSpinState = null;
      rig.comboFirstSwingState = null;
      return;
    }
    const anim = this.comboAnim;
    if(!anim){
      rig.comboSpinState = null;
      rig.comboFirstSwingState = null;
      return;
    }
    const duration = Math.max(1, anim.end - anim.start);
    const progress = clamp((now - anim.start) / duration, 0, 1);
    if(progress >= 1){
      rig.comboSpinState = null;
      rig.comboFirstSwingState = null;
      return;
    }
    const hand = this.pointsByName[anim.hand];
    if(!hand){
      rig.comboSpinState = null;
      rig.comboFirstSwingState = null;
      return;
    }
    const config = swordVariantConfig(rig.variant);
    const spinCount = Math.max(0, anim.spinCount || 0);
    if(anim.step === 1){
      const facingDir = anim.facing >= 0 ? 1 : -1;
      const swingDir = facingDir >= 0 ? -1 : 1;
      let state = rig.comboFirstSwingState;
      if(state && progress + 1e-3 < (state.lastProgress ?? 0)){
        state = null;
      }
      let baseAngle;
      let radius;
      const restLength = rig.handRestLength ?? config.handRestMin ?? 80;
      const minRadius = restLength * 0.75;
      const maxRadiusScale = Math.max(1, config.firstSwingMaxRadius ?? 2.6);
      const maxRadius = restLength * maxRadiusScale;
      if(!state || state.step !== 1 || state.handName !== anim.hand){
        const dx = tip.x - hand.x;
        const dy = tip.y - hand.y;
        const defaultRadius = Math.hypot(dx, dy);
        const resolvedRadius = isFinite(defaultRadius) ? defaultRadius : restLength;
        radius = clamp(resolvedRadius, minRadius, maxRadius);
        const aimAngle = Number.isFinite(anim.aimAngle) ? anim.aimAngle : null;
        if(aimAngle !== null){
          baseAngle = aimAngle - swingDir * Math.PI;
        }else{
          baseAngle = Math.atan2(dy, dx);
        }
        state = {
          step: 1,
          handName: anim.hand,
          baseAngle,
          radius,
          lastProgress: progress
        };
      }else{
        baseAngle = state.baseAngle;
        radius = clamp(state.radius, minRadius, maxRadius);
        state.radius = radius;
        state.lastProgress = progress;
      }
      const angle = baseAngle + swingDir * Math.PI * progress;
      const targetX = hand.x + Math.cos(angle) * radius;
      const targetY = hand.y + Math.sin(angle) * radius;
      const follow = clamp(config.firstSwingTipFollow ?? 1, 0, 1);
      if(follow >= 1){
        tip.x = targetX;
        tip.y = targetY;
      }else if(follow > 0){
        tip.x += (targetX - tip.x) * follow;
        tip.y += (targetY - tip.y) * follow;
      }
      rig.comboFirstSwingState = state;
      rig.comboSpinState = null;
      if(Array.isArray(rig.trail) && rig.trail.length){
        const last = rig.trail[rig.trail.length - 1];
        if(last && last.time === now){
          last.x = tip.x;
          last.y = tip.y;
        }
      }
      return;
    }
    rig.comboFirstSwingState = null;
    if(spinCount <= 0){
      rig.comboSpinState = null;
      return;
    }
    const spinDir = anim.spinDir ?? (this.dir >= 0 ? -1 : 1);
    let state = rig.comboSpinState;
    if(state && progress + 1e-3 < (state.lastProgress ?? 0)){
      state = null;
    }
    const restLength = rig.handRestLength ?? config.handRestMin ?? 80;
    const baseRadius = Math.max(12 * STICK_SCALE, restLength * (anim.spinRadius ?? 1));
    const maxRadiusScale = Math.max(1, config.spinRadiusClamp ?? 1.5);
    const maxRadius = baseRadius * maxRadiusScale;
    let baseAngle;
    let radius;
    if(!state || state.step !== anim.step || state.handName !== anim.hand){
      const dx = tip.x - hand.x;
      const dy = tip.y - hand.y;
      const currentRadius = Math.hypot(dx, dy);
      const measured = currentRadius > 0 ? Math.max(baseRadius, currentRadius) : baseRadius;
      radius = clamp(measured, baseRadius, maxRadius);
      baseAngle = Math.atan2(dy, dx);
      state = {
        step: anim.step,
        handName: anim.hand,
        baseAngle,
        radius,
        lastProgress: progress
      };
    }else{
      baseAngle = state.baseAngle;
      radius = clamp(state.radius, baseRadius, maxRadius);
      state.lastProgress = progress;
      state.radius = radius;
    }
    const follow = clamp(config.spinTipFollow ?? 1, 0, 1);
    let angle = baseAngle + spinDir * TAU * spinCount * progress;
    const targetX = hand.x + Math.cos(angle) * radius;
    const targetY = hand.y + Math.sin(angle) * radius;
    tip.x += (targetX - tip.x) * follow;
    tip.y += (targetY - tip.y) * follow;
    rig.comboSpinState = state;
    if(Array.isArray(rig.trail) && rig.trail.length){
      const last = rig.trail[rig.trail.length - 1];
      if(last && last.time === now){
        last.x = tip.x;
        last.y = tip.y;
      }
    }
  }
};
