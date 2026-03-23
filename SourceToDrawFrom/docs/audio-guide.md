# Audio Integration Guide

## Current building blocks
- `js/audio.js` boots an `AudioContext`, wires master/music/effects gain nodes, and exposes the `audioSystem` global with helpers such as `playEffect`, `applySettings`, and `prepareUnlock`.
- Gameplay code already gates its calls behind `window.audioSystem` checks (for example the pickup flow in `js/items.js` and impact logic in `js/stickman.js`). This means new effects only need identifiers and playback logic inside `playEffect` to light up existing hooks.
- The settings menu (`js/hud.js`) persists `master`, `music`, and `effects` sliders and pushes them into `audioSystem.applySettings`, so volume control is already plumbed through the UI.

## Adding and managing sound effects
1. **Register the asset** – Extend the `SAMPLE_FILES` map in `js/audio.js` when you need to stream an external clip (for example long ambiences or door creaks). Procedural beeps, hits, and UI cues can stay fully synthesized inside the `playEffect` switch.
2. **Synthesize or fetch** – For short one-shots, follow the existing oscillators/noise pattern in the `playEffect` cases. If you fetch, rely on `fetchSampleBuffer` so decoded buffers are cached.
3. **Call sites** – Prefer invoking `audioSystem.playEffect(id, options)` from the domain logic that already knows about the event (weapon fire, UI click, etc.). The scaffolding is already in place across `js/main.js`, `js/items.js`, `js/stickman.js`, `js/projectiles.js`, and `js/hud.js`; you mainly need to choose expressive IDs and implement the corresponding case in `playEffect`.
4. **Mix balance** – Use the provided gain nodes (`effectsGain`, `musicGain`, `masterGain`) rather than creating new outputs. This keeps the sliders in sync and respects the pause/unlock helpers.

## Layering in music
1. **Create a music controller** – Add a small helper inside `js/audio.js` that owns a single `AudioBufferSourceNode` (or `MediaElementAudioSourceNode` if you need streamable tracks). Reuse the exported `musicGain` so the existing settings sliders keep working.
2. **Track lifecycle** – Expose `audioSystem.playMusic(id, { loop, fade })`, `audioSystem.stopMusic({ fade })`, and `audioSystem.preloadMusic(ids)` helpers. Internally, reuse the `SAMPLE_FILES` cache, but place long-form tracks under a `music/` subfolder and keep them out of the procedural `playEffect` switch.
3. **State hooks** – In `js/main.js` you already have a world state machine (`map` vs `level`) plus event transitions (`loadLevel`, `returnToMap`, boss defeated). Call the music helpers from those transitions so the soundtrack swaps cleanly. Remember to gate calls behind `audioSystem.supported` just like the existing effect triggers.
4. **Fades and loops** – Implement lightweight fades by ramping the `musicGain.gain` value over 0.4–1.0 seconds. Loop points can be handled by setting `source.loop = true` and `source.loopStart/loopEnd` if the asset provides seamless loops.
5. **Pause handling** – Tie into the existing `audioSystem.prepareUnlock()` workflow and consider pausing music when the game enters a menu overlay by reducing `musicGain` temporarily or stopping the source.

## Asset and performance guidelines
- Keep compressed audio under `/sounds` for SFX and `/music` for longer pieces. Use `.ogg` or `.mp3` for browser compatibility, and document new IDs inline in `js/audio.js`.
- Batch preload critical tracks during the loading screen or first visit to the map to avoid hitches during gameplay; non-critical themes can lazy-load on demand through the shared cache.
- Watch out for overlapping procedural voices. If you create long decay tails, clamp their gain envelopes so stacked playbacks do not clip against `masterGain`.
- Test on mobile/low-end browsers where `AudioContext` unlock rules are strict. The existing `prepareUnlock` helper already binds to user input events—make sure any new UI entry points (e.g., a dedicated "Enable Audio" button) call it as well.

Following these steps lets you take advantage of the existing plumbing (`audioSystem`, cached buffers, settings menu) while layering in richer soundscapes without restructuring the game loop.
