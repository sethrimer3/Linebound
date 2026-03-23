// items.js
function canModifyLoadout(world){
  if(!world) return false;
  if(world.state === 'map') return true;
  if(world.state !== 'level') return false;
  const levelId = world.levelState?.def?.id || null;
  return levelId === 'worldTree';
}

const COIN_RADIUS = 6;
const COIN_BOUNCE = 0.35;
const COIN_FRICTION = 0.86;
const ITEM_MAGNET_RADIUS = 120;
const COIN_MAGNET_ACCEL = 1200;
const COIN_MAGNET_MAX_SPEED = 560;
const ITEM_MAGNET_ACCEL = 820;
const ITEM_MAGNET_MAX_SPEED = 420;
const BOSS_REWARD_ITEM_TYPE = 'bossReward';
const BOSS_REWARD_RADIUS = 12;
const BOSS_REWARD_GLOW = 'rgba(111, 233, 255, 0.6)';

function cloneCarriedItem(item){
  if(!item || typeof item !== 'object') return null;
  if(item.type === 'potion'){
    const heal = Math.max(1, Math.round(item.heal ?? 30));
    const payload = {
      type: 'potion',
      heal,
      id: item.id ? String(item.id) : 'potion',
      name: item.name ? String(item.name) : 'Potion'
    };
    if(item.description) payload.description = String(item.description);
    if(item.color) payload.color = String(item.color);
    return payload;
  }
  if(item.type === 'scoutDroneRemote'){
    return null;
  }
  return null;
}

function createPotionItem(options){
  const heal = Math.max(1, Math.round(options?.heal ?? 30));
  const id = options?.id ? String(options.id) : 'potion';
  const name = options?.name ? String(options.name) : 'Potion';
  const description = options?.description ? String(options.description) : 'Restores health when consumed.';
  const color = options?.color ? String(options.color) : '#6be36b';
  return cloneCarriedItem({ type: 'potion', id, heal, name, description, color });
}

function createScoutDroneRemoteItem(options={}){
  const id = options.id ? String(options.id) : 'scoutDroneRemote';
  const payload = { type: 'offhand', id };
  return typeof cloneEquipmentItem === 'function' ? cloneEquipmentItem(payload) : { ...payload };
}

function spawnBossRewardDrop(world, source){
  if(!world || !world.levelState?.isFinalScreen) return;
  const state = world.levelState;
  if(state.bossRewardSpawned || state.bossRewardClaimed) return;
  state.bossRewardSpawned = true;
  const origin = typeof source?.center === 'function' ? source.center() : { x: source?.x ?? world.width * 0.5, y: source?.y ?? world.height * 0.5 };
  const drop = {
    type: BOSS_REWARD_ITEM_TYPE,
    x: origin.x,
    y: origin.y - 28,
    vx: rand(-140, 140),
    vy: rand(-360, -220),
    picked: false
  };
  world.items.push(drop);
}

function spawnLoot(deadStick, world, killer=null){
  const baseX = deadStick.center().x;
  const ground = groundHeightAt(world, baseX, { surface: 'top' });
  const y = ground-16;
  let coins = Math.max(1, Math.floor(rand(2,5)));
  let potionChance = 0.45;
  let extraPotionChance = 0;
  const bonusBundles = [];
  const killerStick = killer && typeof killer.currentWeaponSlot === 'function' ? killer : null;
  if(killerStick && !killerStick.isEnemy){
    const weaponSlot = killerStick.currentWeaponSlot ? killerStick.currentWeaponSlot() : null;
    if(weaponSlot && weaponSlot.type === 'weapon' && weaponSlot.id === 'auricDagger'){
      const auricConfig = WEAPONS?.auricDagger?.auric || {};
      const multiplier = Number.isFinite(auricConfig.coinMultiplier) ? Math.max(1, auricConfig.coinMultiplier) : 1.5;
      coins = Math.max(1, Math.round(coins * multiplier));
      const potionBoost = Number.isFinite(auricConfig.potionBonus) ? auricConfig.potionBonus : 0;
      potionChance = clamp(potionChance + potionBoost, 0, 0.95);
      extraPotionChance = Number.isFinite(auricConfig.extraPotionChance) ? Math.max(0, auricConfig.extraPotionChance) : 0;
      const bonusRange = Array.isArray(auricConfig.bonusCoinRange) && auricConfig.bonusCoinRange.length >= 2
        ? auricConfig.bonusCoinRange
        : null;
      if(bonusRange){
        let extraCoins = Math.max(0, Math.round(rand(bonusRange[0], bonusRange[1])));
        while(extraCoins > 0){
          const bundle = Math.min(2, extraCoins);
          bonusBundles.push(bundle);
          extraCoins -= bundle;
        }
      }
    }
  }
  for(let i=0;i<coins;i++){
    world.items.push({
      type:'coin',
      x:baseX+rand(-30,30),
      y:y,
      picked:false,
      amt:1,
      vx:rand(-160,160),
      vy:rand(-520,-280)
    });
  }
  for(const amt of bonusBundles){
    world.items.push({
      type:'coin',
      x:baseX+rand(-34,34),
      y:y,
      picked:false,
      amt:Math.max(1, amt),
      vx:rand(-170,170),
      vy:rand(-540,-300)
    });
  }
  if(Math.random() < potionChance){
    world.items.push({type:'potion', heal: 30, name: 'Sap Flask', color: '#6be36b', x:baseX+rand(-20,20), y:y, picked:false});
  }
  if(extraPotionChance > 0 && Math.random() < extraPotionChance){
    world.items.push({type:'potion', heal: 30, name: 'Gilded Sap', color: '#ffd36b', x:baseX+rand(-24,24), y:y, picked:false});
  }
}
function dropItemFromInventory(item, world, player){
  if(!item) return false;
  if(!world || world.state !== 'level') return false;
  if(!player || typeof player.center !== 'function') return false;
  const pos = player.center();
  const ground = groundHeightAt(world, pos.x, { surface: 'top' });
  if(item.type === 'potion'){
    world.items.push({
      type: 'potion',
      heal: item.heal || 30,
      name: item.name || null,
      color: item.color || null,
      x: pos.x + rand(-10, 10),
      y: ground - 20,
      picked: false
    });
    return true;
  }
  return false;
}
function drawItems(ctx, world){
  for(const it of world.items){
    if(it.picked) continue;
    let restoreFilter = null;
    if(typeof stripCanvasFilters === 'function' && typeof shouldPreserveElementColor === 'function'){
      let element = null;
      if(it.type === 'weapon'){
        const weaponDef = WEAPONS?.[it.id];
        element = weaponDef?.element;
      }else if(it.element){
        element = it.element;
      }
      if(shouldPreserveElementColor(element)){
        restoreFilter = stripCanvasFilters(ctx, token=>typeof token === 'string' && token.toLowerCase().startsWith('grayscale'));
      }
    }
    if(it.type==='coin'){ ctx.fillStyle='#ffd36b'; ctx.beginPath(); ctx.arc(it.x,it.y,COIN_RADIUS,0,TAU); ctx.fill(); }
    else if(it.type==='potion'){ ctx.fillStyle=it.color || '#6be36b'; ctx.beginPath(); ctx.arc(it.x,it.y,8,0,TAU); ctx.fill(); }
    else if(it.type===BOSS_REWARD_ITEM_TYPE){ drawBossRewardItem(ctx, it); }
    else if(it.type==='weapon'){ drawWeaponPickupSprite(ctx, it, WEAPONS[it.id]); }
    else if(it.type==='armor'){ drawArmorPickupSprite(ctx, it, ARMOR_ITEMS?.[it.id]); }
    else if(it.type==='offhand'){ drawOffhandPickupSprite(ctx, it, OFFHAND_ITEMS?.[it.id]); }
    if(typeof restoreFilter === 'function') restoreFilter();
  }
}
function checkPickups(s, world){
  let weaponChanged = false;
  const now = nowMs();
  const audio = window.audioSystem;
  for(const it of world.items){
    if(it.picked) continue;
    if(Number.isFinite(it.pickupAvailableAt) && now < it.pickupAvailableAt) continue;
    const d = distance(s.center().x, s.center().y, it.x, it.y);
    if(d < 24){
      if(it.type==='coin'){
        it.picked=true;
        world.coins += it.amt;
        if(audio && typeof audio.playEffect === 'function'){
          audio.playEffect('coinPickup');
        }
      }else if(it.type==='potion'){
        if(s.heldItem){
          continue;
        }
        const potion = createPotionItem({
          id: it.id,
          name: it.name,
          heal: it.heal,
          description: it.description,
          color: it.color
        });
        if(!potion) continue;
        s.heldItem = cloneCarriedItem(potion);
        it.picked = true;
        if(typeof updateProfileEntryFromStick === 'function'){
          updateProfileEntryFromStick(world, s);
        }
        if(audio && typeof audio.playEffect === 'function'){
          audio.playEffect('potionPickup');
        }
      }else if(it.type===BOSS_REWARD_ITEM_TYPE){
        if(world?.levelState?.bossRewardClaimed){
          it.picked = true;
          continue;
        }
        const granted = typeof awardBossLevelReward === 'function' ? awardBossLevelReward(world, s) : false;
        if(granted){
          it.picked = true;
          if(audio && typeof audio.playEffect === 'function'){
            audio.playEffect('levelUp');
          }
        }
      }else if(it.type==='weapon'){
        const profile = world.profile;
        if(profile){
          if(!Array.isArray(profile.armory)) profile.armory = [];
          profile.armory.push({ type:'weapon', id: it.id });
          profile.armory = normalizeArmory(profile.armory);
          it.picked = true;
          if(audio && typeof audio.playEffect === 'function'){
            audio.playEffect('weaponPickup');
          }
        }
      }else if(it.type==='offhand'){
        const profile = world.profile;
        if(profile){
          if(!Array.isArray(profile.armory)) profile.armory = [];
          profile.armory.push({ type: 'offhand', id: it.id });
          profile.armory = normalizeArmory(profile.armory);
          it.picked = true;
          if(audio && typeof audio.playEffect === 'function'){
            audio.playEffect('weaponPickup');
          }
        }
      }else if(it.type==='armor'){
        const profile = world.profile;
        if(profile){
          if(!Array.isArray(profile.armory)) profile.armory = [];
          profile.armory.push({ type:'armor', id: it.id });
          profile.armory = normalizeArmory(profile.armory);
          it.picked = true;
          if(audio && typeof audio.playEffect === 'function'){
            audio.playEffect('weaponPickup');
          }
        }
      }
    }
  }
  if(weaponChanged){
    if(typeof syncTeamLoadout === 'function'){
      syncTeamLoadout(world);
    }else if(typeof s.refreshWeaponRig === 'function'){
      s.refreshWeaponRig();
    }
  }
}

function drawWeaponPickupSprite(ctx, item, weapon){
  const scale = 0.9;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(-Math.PI/6);
  let restoreFilter = null;
  if(typeof stripCanvasFilters === 'function' && typeof shouldPreserveElementColor === 'function'){
    if(shouldPreserveElementColor(weapon?.element)){
      restoreFilter = stripCanvasFilters(ctx, token=>typeof token === 'string' && token.toLowerCase().startsWith('grayscale'));
    }
  }

  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 7*scale, 6*scale, 2.5*scale, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle='#2f2723';
  ctx.fillRect(-1.6*scale, 2.5*scale, 3.2*scale, 6.5*scale);

  ctx.fillStyle='#d6cfc5';
  ctx.fillRect(-4.5*scale, 1.6*scale, 9*scale, 2.2*scale);

  ctx.fillStyle=weapon.color;
  ctx.strokeStyle='#f5f1ee';
  ctx.lineWidth=0.9;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(13*scale,-3*scale);
  ctx.lineTo(16*scale,0);
  ctx.lineTo(13*scale,3*scale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if(typeof restoreFilter === 'function') restoreFilter();
  ctx.restore();
}

function drawArmorPickupSprite(ctx, item, armor){
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(0.9, 0.9);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 14, 5, 0, 0, TAU);
  ctx.fill();

  const baseColor = armor?.color || '#9ea6c8';
  const trimColor = armor?.trimColor || '#f3f4ff';
  const primary = armor?.primaryColor || shadeColor(baseColor, -0.18);
  const secondary = armor?.secondaryColor || shadeColor(baseColor, -0.32);

  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, -8);
  ctx.lineTo(14, 10);
  ctx.lineTo(0, 24);
  ctx.lineTo(-14, 10);
  ctx.lineTo(-18, -8);
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = trimColor;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(10, -2);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 16);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fillStyle = primary;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(5, 4);
  ctx.lineTo(0, 12);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fillStyle = secondary;
  ctx.fill();

  ctx.restore();
}

function shadeColor(hex, amount){
  if(typeof hex !== 'string') return '#7f88b0';
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;
  if(cleaned.length !== 6) return hex;
  const num = parseInt(cleaned, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = clamp(Math.round(r + r * amount), 0, 255);
  g = clamp(Math.round(g + g * amount), 0, 255);
  b = clamp(Math.round(b + b * amount), 0, 255);
  const value = (r << 16) | (g << 8) | b;
  return `#${value.toString(16).padStart(6, '0')}`;
}

function drawBossRewardItem(ctx, item){
  ctx.save();
  ctx.translate(item.x, item.y);
  const pulse = 0.5 + Math.sin(nowMs() / 260) * 0.25;
  const radius = BOSS_REWARD_RADIUS * (1 + pulse * 0.1);
  const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.5, BOSS_REWARD_GLOW);
  gradient.addColorStop(1, 'rgba(40, 160, 220, 0.35)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240, 252, 255, 0.8)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawOffhandPickupSprite(ctx, item, offhand){
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(0.88, 0.88);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 8, 3, 0, 0, TAU);
  ctx.fill();

  if(offhand?.kind === 'torch'){
    const handle = offhand.handleColor || offhand.bodyColor || '#5b3a1f';
    const grip = offhand.gripColor || shadeColor(handle, -0.3);
    const metal = offhand.accentColor || '#f5e7c6';
    const flame = offhand.flameColor || offhand.color || '#ffce6b';
    const glow = offhand.glowColor || 'rgba(255, 236, 170, 0.75)';

    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(0, -20, 10, 16, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = handle;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(4, 14);
    ctx.lineTo(5.6, -4);
    ctx.lineTo(-5.6, -4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = grip;
    ctx.beginPath();
    ctx.moveTo(-4.6, -1);
    ctx.lineTo(4.6, -1);
    ctx.lineTo(4.2, -5.4);
    ctx.lineTo(-4.2, -5.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 5.8, 3.8, 0, 0, TAU);
    ctx.fill();

    const flameGradient = ctx.createRadialGradient(0, -18, 2, 0, -18, 14);
    flameGradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    flameGradient.addColorStop(0.5, flame);
    flameGradient.addColorStop(1, 'rgba(255, 180, 64, 0)');
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(6, -10, 0, -2);
    ctx.quadraticCurveTo(-6, -10, 0, -22);
    ctx.fill();
  }else{
    const base = offhand?.color || '#58d2ff';
    const accent = offhand?.accentColor || offhand?.trimColor || '#f5f7ff';
    const body = offhand?.bodyColor || shadeColor(base, -0.2);

    ctx.fillStyle = body;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(6, -12);
    ctx.lineTo(6, 6);
    ctx.quadraticCurveTo(6, 11, 1, 12);
    ctx.lineTo(-1, 12);
    ctx.quadraticCurveTo(-6, 11, -6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = base;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.lineTo(3, -2);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = accent;
    ctx.stroke();
  }

  ctx.restore();
}

function updateItemPhysics(world, dt){
  if(!world || !Array.isArray(world.items)) return;
  if(dt <= 0) return;
  const now = nowMs();
  const friends = Array.isArray(world.sticks) ? world.sticks.filter(s=>s && !s.isEnemy && !s.dead) : [];
  const targets = [];
  for(const stick of friends){
    const center = typeof stick.center === 'function' ? stick.center() : null;
    if(center) targets.push(center);
  }
  for(const item of world.items){
    if(!item || item.picked) continue;
    if(!Number.isFinite(item.vx)) item.vx = 0;
    if(!Number.isFinite(item.vy)) item.vy = 0;
    let nearest = null;
    let bestDist = Infinity;
    const pickupReady = !Number.isFinite(item.pickupAvailableAt) || now >= item.pickupAvailableAt;
    if(pickupReady){
      for(const center of targets){
        const dx = center.x - item.x;
        const dy = center.y - item.y;
        const dist = Math.hypot(dx, dy);
        if(dist < bestDist){
          bestDist = dist;
          nearest = { dx, dy, dist };
        }
      }
    }
    if(pickupReady && nearest && bestDist <= ITEM_MAGNET_RADIUS){
      const dirX = nearest.dist > 0 ? nearest.dx / nearest.dist : 0;
      const dirY = nearest.dist > 0 ? nearest.dy / nearest.dist : 0;
      const pull = 1 - bestDist / ITEM_MAGNET_RADIUS;
      const accel = (item.type === 'coin' ? COIN_MAGNET_ACCEL : ITEM_MAGNET_ACCEL) * pull;
      const maxSpeed = item.type === 'coin' ? COIN_MAGNET_MAX_SPEED : ITEM_MAGNET_MAX_SPEED;
      item.vx += dirX * accel * dt;
      item.vy += dirY * accel * dt;
      const speed = Math.hypot(item.vx, item.vy);
      if(maxSpeed > 0 && speed > maxSpeed){
        const scale = maxSpeed / speed;
        item.vx *= scale;
        item.vy *= scale;
      }
    }else if(item.type !== 'coin'){
      item.vx *= 0.7;
      item.vy *= 0.7;
      if(Math.abs(item.vx) < 1) item.vx = 0;
      if(Math.abs(item.vy) < 1) item.vy = 0;
    }
    if(item.type === 'coin'){
      const prevX = item.x;
      const prevY = item.y;
      item.vy += GRAVITY * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const ground = groundHeightAt(world, item.x, {
        surface: 'top',
        referenceY: prevY,
        referencePadding: COIN_RADIUS,
        velocityY: item.vy,
        maxStepUp: COIN_RADIUS * 2
      });
      const contactY = ground - COIN_RADIUS;
      if(item.y >= contactY){
        item.y = contactY;
        if(item.vy > 0){
          item.vy = -item.vy * COIN_BOUNCE;
          if(Math.abs(item.vy) < 28) item.vy = 0;
        }
        item.vx *= COIN_FRICTION;
        if(Math.abs(item.vx) < 10) item.vx = 0;
      }
      const worldWidth = Number.isFinite(world.width) ? world.width : null;
      if(item.x < COIN_RADIUS){
        item.x = COIN_RADIUS;
        if(item.vx < 0) item.vx = -item.vx * COIN_BOUNCE;
      }else if(worldWidth !== null && item.x > worldWidth - COIN_RADIUS){
        item.x = Math.max(COIN_RADIUS, worldWidth - COIN_RADIUS);
        if(item.vx > 0) item.vx = -item.vx * COIN_BOUNCE;
      }
      item.prevX = prevX;
      item.prevY = prevY;
    }else{
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const worldWidth = Number.isFinite(world.width) ? world.width : null;
      if(worldWidth !== null){
        if(item.x < COIN_RADIUS){
          item.x = COIN_RADIUS;
          if(item.vx < 0) item.vx = 0;
        }else if(item.x > worldWidth - COIN_RADIUS){
          item.x = Math.max(COIN_RADIUS, worldWidth - COIN_RADIUS);
          if(item.vx > 0) item.vx = 0;
        }
      }
    }
  }
}

if(typeof window !== 'undefined'){
  window.cloneCarriedItem = cloneCarriedItem;
  window.createPotionItem = createPotionItem;
}
