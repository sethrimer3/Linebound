// particle_registry.js
(function(global){
  const REGISTRY = {
    map: new Map(),
    list: [],
    ready: false,
    loading: null
  };

  const JSON_PATH = 'data/particles.json';

  function normalizeDefinition(entry){
    if(!entry || !entry.id) return null;
    const id = String(entry.id);
    const style = entry.style ? String(entry.style) : id;
    const defaults = (entry.defaults && typeof entry.defaults === 'object') ? { ...entry.defaults } : {};
    return { id, style, defaults };
  }

  function registerParticleDefinitions(entries){
    REGISTRY.map.clear();
    REGISTRY.list = [];
    const list = Array.isArray(entries) ? entries : [];
    for(const entry of list){
      const def = normalizeDefinition(entry);
      if(!def) continue;
      REGISTRY.map.set(def.id, def);
      REGISTRY.list.push(def);
    }
    REGISTRY.ready = true;
  }

  function getParticleDefinition(id){
    if(!id) return null;
    const key = String(id);
    if(REGISTRY.map.has(key)) return REGISTRY.map.get(key);
    for(const def of REGISTRY.list){
      if(def.style === key) return def;
    }
    return null;
  }

  function getParticleDefinitionFor(particle){
    if(!particle) return null;
    const type = particle.type || particle.style || null;
    return type ? getParticleDefinition(type) : null;
  }

  function applyParticleDefinition(target, type){
    if(!target || typeof target !== 'object') return target;
    const resolvedType = type || target.type || target.style || null;
    if(resolvedType) target.type = resolvedType;
    const def = resolvedType ? getParticleDefinition(resolvedType) : null;
    if(def){
      if(!target.style) target.style = def.style;
      const defaults = def.defaults || {};
      for(const key of Object.keys(defaults)){
        if(target[key] === undefined){
          target[key] = defaults[key];
        }
      }
    }else if(resolvedType && !target.style){
      target.style = resolvedType;
    }
    return target;
  }

  function initializeParticleRegistry(){
    if(REGISTRY.ready) return Promise.resolve(REGISTRY.map);
    if(REGISTRY.loading) return REGISTRY.loading;
    if(typeof fetch !== 'function'){
      registerParticleDefinitions([]);
      return Promise.resolve(REGISTRY.map);
    }
    REGISTRY.loading = fetch(JSON_PATH, { cache: 'no-store' })
      .then(response=>{
        if(!response.ok) throw new Error(`Failed to load ${JSON_PATH}: ${response.status}`);
        return response.json();
      })
      .then(json=>{
        const entries = Array.isArray(json?.particles) ? json.particles : [];
        registerParticleDefinitions(entries);
        return REGISTRY.map;
      })
      .catch(err=>{
        console.warn('[Particles] Unable to load particle definitions', err);
        registerParticleDefinitions([]);
        return REGISTRY.map;
      });
    return REGISTRY.loading;
  }

  global.registerParticleDefinitions = registerParticleDefinitions;
  global.getParticleDefinition = getParticleDefinition;
  global.getParticleDefinitionFor = getParticleDefinitionFor;
  global.applyParticleDefinition = applyParticleDefinition;
  global.initializeParticleRegistry = initializeParticleRegistry;
})(typeof window !== 'undefined' ? window : globalThis);
