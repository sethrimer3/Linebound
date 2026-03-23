// stickman/damage_numbers.js

const DAMAGE_NUMBER_COOLDOWN_MS = 120;
const DAMAGE_NUMBER_FONT = '700 12px system-ui, sans-serif';

const ELEMENT_STYLE_MAP = (()=>{
  if(typeof window !== 'undefined' && window.ELEMENT_STYLE_MAP){
    return window.ELEMENT_STYLE_MAP;
  }
  const map = {
    physical: { label: 'Physical', color: '#e2e5f0', className: 'weapon-element-physical' },
    fire: { label: 'Fire', color: '#ff5a44', className: 'weapon-element-fire' },
    ice: { label: 'Ice', color: '#6bd1ff', className: 'weapon-element-ice' },
    light: { label: 'Light', color: '#ffe066', className: 'weapon-element-light' },
    chronometric: { label: 'Chronometric', color: '#9fe0ff', className: 'weapon-element-chronometric' },
    war: { label: 'War', color: '#ff6b6b', className: 'weapon-element-war' },
    void: { label: 'Void', color: '#b884ff', className: 'weapon-element-void' },
    explosive: { label: 'Explosive', color: '#ff9a4b', className: 'weapon-element-explosive' },
    necrotic: { label: 'Necrotic', color: '#7fe6b2', className: 'weapon-element-necrotic' },
    life: { label: 'Life', color: '#6df29a', className: 'weapon-element-life' }
  };
  if(typeof window !== 'undefined') window.ELEMENT_STYLE_MAP = map;
  return map;
})();

function resolveElementColor(element, fallback='#f0f0f0'){
  if(!element) return fallback;
  const key = String(element).trim().toLowerCase();
  const entry = ELEMENT_STYLE_MAP[key];
  return entry?.color || fallback;
}

function resolveElementLabel(element, fallback='Unknown'){
  if(!element) return fallback;
  const key = String(element).trim().toLowerCase();
  const entry = ELEMENT_STYLE_MAP[key];
  if(entry?.label) return entry.label;
  if(!key) return fallback;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatDamageNumberValue(amount){
  if(!Number.isFinite(amount) || amount <= 0) return null;
  if(amount >= 10) return Math.round(amount).toString();
  if(amount >= 1) return Math.round(amount).toString();
  const precise = amount.toFixed(1);
  return precise.replace(/\.0$/, '') || '1';
}

function resolveDamageNumberColor(source){
  if(!source) return '#f0f0f0';
  if(typeof source.damageNumberColor === 'string'){ return source.damageNumberColor; }
  const weapon = (typeof source.weapon === 'function') ? source.weapon() : null;
  if(weapon){
    if(typeof weapon.damageNumberColor === 'string') return weapon.damageNumberColor;
    if(typeof weapon.color === 'string' && weapon.color) return typeof safeHex === 'function' ? safeHex(weapon.color) || weapon.color : weapon.color;
    if(typeof weapon.projectileColor === 'string' && weapon.projectileColor){
      return typeof safeHex === 'function' ? safeHex(weapon.projectileColor) || weapon.projectileColor : weapon.projectileColor;
    }
  }
  if(typeof source.weaponColor === 'string'){ return source.weaponColor; }
  if(typeof source.accentColor === 'string' && source.accentColor){
    return typeof safeHex === 'function' ? safeHex(source.accentColor) || source.accentColor : source.accentColor;
  }
  if(typeof source.bodyColor === 'string' && source.bodyColor){
    return typeof safeHex === 'function' ? safeHex(source.bodyColor) || source.bodyColor : source.bodyColor;
  }
  return '#f0f0f0';
}

function spawnDamageNumber(world, stick, amount, options={}){
  const customText = typeof options.text === 'string' ? options.text.trim() : null;
  const textValue = customText || formatDamageNumberValue(amount);
  if(!world || !stick || !textValue) return;
  if(!Array.isArray(world.particles)) world.particles = [];
  const layer = options.layer === 'overlay' ? 'overlay' : 'default';
  const scale = typeof STICK_SCALE === 'number' ? STICK_SCALE : 1;
  let center = null;
  if(typeof stick.center === 'function'){
    try{
      center = stick.center();
    }catch(err){
      center = null;
    }
  }
  if(!center || !Number.isFinite(center.x) || !Number.isFinite(center.y)){
    const pelvis = typeof stick.pelvis === 'function' ? stick.pelvis() : stick.pointsByName?.pelvis;
    const pelvisX = Number.isFinite(pelvis?.x) ? pelvis.x : 0;
    const pelvisY = Number.isFinite(pelvis?.y) ? pelvis.y : 0;
    center = { x: pelvisX, y: pelvisY };
  }
  const head = stick.pointsByName?.head || null;
  const headRadius = 12 * scale;
  const source = options.source || null;
  let baseX = Number.isFinite(center.x) ? center.x : 0;
  let baseY = head && Number.isFinite(head.y)
    ? head.y - headRadius
    : (Number.isFinite(center.y) ? center.y : 0) - 42 * scale;
  if(source && typeof source.center === 'function'){
    let sourceCenter = null;
    try{
      sourceCenter = source.center();
    }catch(err){
      sourceCenter = null;
    }
    const sourceX = Number.isFinite(sourceCenter?.x) ? sourceCenter.x : baseX;
    const sourceY = Number.isFinite(sourceCenter?.y) ? sourceCenter.y : baseY + headRadius;
    const dx = baseX - sourceX;
    const dy = (Number.isFinite(center.y) ? center.y : baseY + headRadius) - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    baseX = baseX - (dx / len) * 22 * scale;
    baseY = baseY - (dy / len) * 10 * scale;
  }
  if(options.anchor){
    baseX = options.anchor.x ?? baseX;
    baseY = options.anchor.y ?? baseY;
  }
  const jitter = options.jitter ?? 6;
  const x = baseX + (typeof rand === 'function' ? rand(-jitter, jitter) : 0);
  const y = baseY + (typeof rand === 'function' ? rand(-jitter * 0.6, jitter * 0.4) : 0);
  const vx = options.vx ?? (typeof rand === 'function' ? rand(-18, 18) : 0);
  const vy = options.vy ?? -60;
  const particle = {
    type: 'text',
    style: 'text',
    layer,
    x,
    y,
    vx,
    vy,
    lift: options.lift ?? 90,
    gravityScale: 0,
    text: `${customText ? '' : (options.prefix || '')}${textValue}`,
    color: typeof safeHex === 'function' ? safeHex(options.color || '#f0f0f0') || (options.color || '#f0f0f0') : (options.color || '#f0f0f0'),
    strokeColor: options.strokeColor || 'rgba(10, 18, 28, 0.65)',
    strokeWidth: options.strokeWidth ?? 2,
    font: options.font || DAMAGE_NUMBER_FONT,
    life: 0,
    maxLife: options.maxLife ?? 520,
    fadeStart: options.fadeStart ?? 0.35,
    opacity: 1,
    disableFilters: !!options.disableFilters
  };
  if(typeof applyParticleDefinition === 'function') applyParticleDefinition(particle, 'text');
  world.particles.push(particle);
  if(typeof trimWorldParticles === 'function') trimWorldParticles(world, 420);
}
