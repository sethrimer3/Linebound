// audio.js

(function(){
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx){
    window.audioSystem = {
      supported: false,
      playEffect: ()=>{},
      applySettings: ()=>{},
      prepareUnlock: ()=>{}
    };
    return;
  }

  const ctx = new AudioCtx();
  const masterGain = ctx.createGain();
  const musicGain = ctx.createGain();
  const effectsGain = ctx.createGain();

  const SAMPLE_FILES = {
    exitDoorOpen: 'sounds/exit_door_open.ogg'
  };

  const sampleCache = new Map();

  const state = {
    unlocked: ctx.state === 'running',
    master: 0.5,
    music: 0.5,
    effects: 0.425
  };

  masterGain.gain.value = state.master;
  musicGain.gain.value = state.music;
  effectsGain.gain.value = state.effects;

  musicGain.connect(masterGain);
  effectsGain.connect(masterGain);
  masterGain.connect(ctx.destination);

  function updateGains(){
    masterGain.gain.value = state.master;
    musicGain.gain.value = state.music;
    effectsGain.gain.value = state.effects;
  }

  function setMasterVolume(value){
    const fallback = Number.isFinite(value) ? value : 50;
    const normalized = clamp(fallback / 100, 0, 1);
    state.master = normalized;
    updateGains();
  }

  function setEffectsVolume(value){
    const fallback = Number.isFinite(value) ? value : 50;
    const normalized = clamp(fallback / 100, 0, 1);
    state.effects = normalized * 0.85;
    updateGains();
  }

  function setMusicVolume(value){
    const fallback = Number.isFinite(value) ? value : 50;
    const normalized = clamp(fallback / 100, 0, 1);
    state.music = normalized;
    updateGains();
  }

  function applySettings(settings){
    if(!settings) return;
    setMasterVolume(settings.master);
    setMusicVolume(settings.music);
    setEffectsVolume(settings.effects);
  }

  function ensureContext(){
    if(!ctx) return;
    if(ctx.state === 'suspended'){
      ctx.resume();
    }
  }

  let unlockBound = false;
  function prepareUnlock(){
    if(state.unlocked) return;
    if(unlockBound) return;
    unlockBound = true;
    const events = ['pointerdown','touchstart','keydown'];
    const unlock = ()=>{
      ensureContext();
      state.unlocked = true;
      for(const evt of events){
        window.removeEventListener(evt, unlock);
      }
    };
    for(const evt of events){
      const options = evt === 'keydown' ? { once: true } : { once: true, passive: true };
      window.addEventListener(evt, unlock, options);
    }
  }

  prepareUnlock();

  function isAudioBuffer(value){
    return !!(value && typeof value.getChannelData === 'function');
  }

  function decodeBuffer(arrayBuffer){
    return new Promise((resolve, reject)=>{
      let settled = false;
      const onSuccess = buffer=>{
        if(settled) return;
        settled = true;
        resolve(buffer);
      };
      const onError = err=>{
        if(settled) return;
        settled = true;
        reject(err);
      };
      const maybePromise = ctx.decodeAudioData(arrayBuffer, onSuccess, onError);
      if(maybePromise && typeof maybePromise.then === 'function'){
        maybePromise.then(onSuccess, onError);
      }
    });
  }

  function fetchSampleBuffer(id){
    if(!SAMPLE_FILES[id]) return Promise.resolve(null);
    const cached = sampleCache.get(id);
    if(isAudioBuffer(cached)) return Promise.resolve(cached);
    if(cached) return cached;
    const url = SAMPLE_FILES[id];
    const promise = fetch(url).then(response=>{
      if(!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
      return response.arrayBuffer();
    }).then(arrayBuffer=>decodeBuffer(arrayBuffer)).then(buffer=>{
      sampleCache.set(id, buffer);
      return buffer;
    }).catch(err=>{
      console.error('[audio] Failed to load sample', id, err);
      sampleCache.delete(id);
      return null;
    });
    sampleCache.set(id, promise);
    return promise;
  }

  function createNoise(duration=0.2, falloffPower=1.8){
    const length = Math.max(1, Math.floor(duration * ctx.sampleRate));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<length;i++){
      const t = i / length;
      const falloff = Math.pow(1 - t, falloffPower);
      data[i] = (Math.random() * 2 - 1) * falloff;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = false;
    return source;
  }

  function playEffect(name, options={}){
    if(!ctx) return;
    prepareUnlock();
    ensureContext();
    const now = ctx.currentTime;
    switch(name){
      case 'land':{
        const strength = clamp(typeof options.strength === 'number' ? options.strength : 0.4, 0.1, 1.6);
        const body = ctx.createOscillator();
        body.type = 'sine';
        body.frequency.setValueAtTime(140, now);
        body.frequency.exponentialRampToValueAtTime(54, now + 0.36);
        const bodyFilter = ctx.createBiquadFilter();
        bodyFilter.type = 'lowpass';
        bodyFilter.frequency.setValueAtTime(260, now);
        bodyFilter.Q.setValueAtTime(0.7, now);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.0001, now);
        bodyGain.gain.exponentialRampToValueAtTime(Math.max(0.04, 0.28 * strength), now + 0.02);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
        body.connect(bodyFilter);
        bodyFilter.connect(bodyGain);
        bodyGain.connect(effectsGain);
        body.start(now);
        body.stop(now + 0.46);

        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(68, now);
        sub.frequency.exponentialRampToValueAtTime(38, now + 0.28);
        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.exponentialRampToValueAtTime(Math.max(0.02, 0.16 * strength), now + 0.03);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        sub.connect(subGain);
        subGain.connect(effectsGain);
        sub.start(now);
        sub.stop(now + 0.34);

        const noise = createNoise(0.24, 2.8);
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(420, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.16 * strength, now + 0.015);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(effectsGain);
        noise.start(now);
        noise.stop(now + 0.26);
        break;
      }
      case 'swordHit':{
        const body = ctx.createOscillator();
        body.type = 'triangle';
        body.frequency.setValueAtTime(520, now);
        body.frequency.exponentialRampToValueAtTime(240, now + 0.14);
        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.0001, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.3, now + 0.006);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        body.connect(bodyGain);
        bodyGain.connect(effectsGain);
        body.start(now);
        body.stop(now + 0.22);

        const shimmer = ctx.createOscillator();
        shimmer.type = 'square';
        shimmer.frequency.setValueAtTime(880, now);
        shimmer.frequency.linearRampToValueAtTime(1120, now + 0.05);
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0.0001, now);
        shimmerGain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(effectsGain);
        shimmer.start(now);
        shimmer.stop(now + 0.14);
        break;
      }
      case 'projectileFire':{
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.22);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }
      case 'npcBabble':{
        const osc = ctx.createOscillator();
        osc.type = Math.random() < 0.5 ? 'triangle' : 'square';
        const baseFreq = 640 + Math.random() * 240;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq + 50, now + 0.1);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(baseFreq, now);
        filter.Q.setValueAtTime(5.5, now);
        const gain = ctx.createGain();
        const volume = clamp(typeof options.volume === 'number' ? options.volume : 0.4, 0.05, 1);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.085 * volume, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(7 + Math.random() * 5, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(baseFreq * 0.02, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        lfo.start(now);
        osc.stop(now + 0.16);
        lfo.stop(now + 0.16);
        break;
      }
      case 'coinPickup':{
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(940, now);
        osc.frequency.exponentialRampToValueAtTime(1480, now + 0.12);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.24);

        const shimmer = ctx.createOscillator();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(1240, now + 0.04);
        shimmer.frequency.exponentialRampToValueAtTime(1820, now + 0.16);
        const shimmerGain = ctx.createGain();
        shimmerGain.gain.setValueAtTime(0.0001, now + 0.04);
        shimmerGain.gain.exponentialRampToValueAtTime(0.16, now + 0.06);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(effectsGain);
        shimmer.start(now + 0.04);
        shimmer.stop(now + 0.28);
        break;
      }
      case 'potionPickup':{
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.linearRampToValueAtTime(720, now + 0.26);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.36);

        const noise = createNoise(0.32, 2.4);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        noise.connect(noiseGain);
        noiseGain.connect(effectsGain);
        noise.start(now);
        noise.stop(now + 0.32);
        break;
      }
      case 'weaponPickup':{
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.26, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.32);

        const thump = ctx.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(140, now);
        thump.frequency.exponentialRampToValueAtTime(90, now + 0.22);
        const thumpGain = ctx.createGain();
        thumpGain.gain.setValueAtTime(0.0001, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        thump.connect(thumpGain);
        thumpGain.connect(effectsGain);
        thump.start(now);
        thump.stop(now + 0.3);
        break;
      }
      case 'menuOpen':{
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(660, now + 0.18);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }
      case 'menuClose':{
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.22);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.14, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'playerHit':{
        const strength = clamp(typeof options.strength === 'number' ? options.strength : 0.4, 0.1, 1.2);
        const thud = ctx.createOscillator();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(220, now);
        thud.frequency.exponentialRampToValueAtTime(120, now + 0.24);
        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.0001, now);
        thudGain.gain.exponentialRampToValueAtTime(0.2 * strength, now + 0.015);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        thud.connect(thudGain);
        thudGain.connect(effectsGain);
        thud.start(now);
        thud.stop(now + 0.34);

        const grit = createNoise(0.24, 2.1);
        const gritGain = ctx.createGain();
        gritGain.gain.setValueAtTime(0.0001, now);
        gritGain.gain.exponentialRampToValueAtTime(0.12 * strength, now + 0.01);
        gritGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        grit.connect(gritGain);
        gritGain.connect(effectsGain);
        grit.start(now);
        grit.stop(now + 0.22);
        break;
      }
      case 'levelUp':{
        const baseFreq = 480;
        for(let i=0;i<3;i++){
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const start = baseFreq + i * 160;
          osc.frequency.setValueAtTime(start, now + i * 0.06);
          osc.frequency.exponentialRampToValueAtTime(start + 220, now + 0.24 + i * 0.06);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04 + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.06);
          osc.connect(gain);
          gain.connect(effectsGain);
          osc.start(now + i * 0.06);
          osc.stop(now + 0.32 + i * 0.06);
        }
        break;
      }
      case 'mapHover':{
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(540, now);
        osc.frequency.linearRampToValueAtTime(680, now + 0.12);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'mapClick':{
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        osc.connect(gain);
        gain.connect(effectsGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }
      case 'exitDoorOpen':{
        fetchSampleBuffer('exitDoorOpen').then(buffer=>{
          if(!buffer) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gainNode = ctx.createGain();
          const startTime = ctx.currentTime;
          const volume = clamp(typeof options.volume === 'number' ? options.volume : 0.28, 0, 1);
          gainNode.gain.setValueAtTime(volume, startTime);
          source.connect(gainNode);
          gainNode.connect(effectsGain);
          source.start(startTime);
          source.stop(startTime + buffer.duration + 0.05);
        });
        break;
      }
      default:
        break;
    }
  }

  window.audioSystem = {
    supported: true,
    context: ctx,
    playEffect,
    applySettings,
    prepareUnlock,
    setMasterVolume,
    setMusicVolume,
    setEffectsVolume,
    musicGain
  };
})();
