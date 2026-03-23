// decoration_registry.js
(function(global){
  const REGISTRY = {
    map: new Map(),
    list: [],
    ready: false,
    loading: null
  };

  const JSON_PATH = 'data/decorations.json';

  function cloneValue(value){
    if(Array.isArray(value)) return value.map(cloneValue);
    if(value && typeof value === 'object'){
      const clone = {};
      for(const key in value){
        clone[key] = cloneValue(value[key]);
      }
      return clone;
    }
    return value;
  }

  function normalizeDecoration(entry){
    if(!entry || !entry.id) return null;
    const id = String(entry.id);
    const label = entry.label ? String(entry.label) : id;
    const tool = entry.tool ? String(entry.tool) : null;
    const defaults = (entry.defaults && typeof entry.defaults === 'object')
      ? cloneValue(entry.defaults)
      : {};
    return { id, label, tool, defaults };
  }

  function registerDecorationDefinitions(entries){
    REGISTRY.map.clear();
    REGISTRY.list = [];
    const list = Array.isArray(entries) ? entries : [];
    for(const entry of list){
      const def = normalizeDecoration(entry);
      if(!def) continue;
      REGISTRY.map.set(def.id, def);
      REGISTRY.list.push(def);
    }
    REGISTRY.ready = true;
  }

  function getDecorationDefinition(id){
    if(!id) return null;
    const key = String(id);
    if(REGISTRY.map.has(key)) return REGISTRY.map.get(key);
    for(const def of REGISTRY.list){
      if(def.tool === key) return def;
    }
    return null;
  }

  function listDecorationDefinitions(){
    return REGISTRY.list.slice();
  }

  function applyDecorationDefinition(target, id){
    if(!target || typeof target !== 'object') return target;
    const resolvedId = id || target.id || target.tool || null;
    const def = resolvedId ? getDecorationDefinition(resolvedId) : null;
    if(!def) return target;
    const defaults = def.defaults || {};
    for(const key of Object.keys(defaults)){
      if(target[key] !== undefined) continue;
      target[key] = cloneValue(defaults[key]);
    }
    return target;
  }

  function initializeDecorationRegistry(){
    if(REGISTRY.ready) return Promise.resolve(REGISTRY.map);
    if(REGISTRY.loading) return REGISTRY.loading;
    if(typeof fetch !== 'function'){
      registerDecorationDefinitions([]);
      return Promise.resolve(REGISTRY.map);
    }
    REGISTRY.loading = fetch(JSON_PATH, { cache: 'no-store' })
      .then(response=>{
        if(!response.ok) throw new Error(`Failed to load ${JSON_PATH}: ${response.status}`);
        return response.json();
      })
      .then(json=>{
        const entries = Array.isArray(json?.decorations) ? json.decorations : [];
        registerDecorationDefinitions(entries);
        return REGISTRY.map;
      })
      .catch(err=>{
        console.warn('[Decorations] Unable to load decoration definitions', err);
        registerDecorationDefinitions([]);
        return REGISTRY.map;
      });
    return REGISTRY.loading;
  }

  global.registerDecorationDefinitions = registerDecorationDefinitions;
  global.getDecorationDefinition = getDecorationDefinition;
  global.listDecorationDefinitions = listDecorationDefinitions;
  global.applyDecorationDefinition = applyDecorationDefinition;
  global.initializeDecorationRegistry = initializeDecorationRegistry;
})(typeof window !== 'undefined' ? window : globalThis);
