# Non-Stick Enemy Reference

This reference lists the current enemies that use the rectangular hitbox path rather than the legacy stick rig. Each entry includes the default hitbox size (width × height in pixels) after archetype configuration.

| Enemy Kind | Hitbox (w × h) | Notes |
| --- | --- | --- |
| sandBlock | 112 × 96 | Ground hopper built from compact sand bricks. |
| sandWanderer | 88 × 120 | Wandering shade that slings sand bursts from mid-range. |
| slimeCube | 72 × 52 | Gelatinous cube that lunges with heavy hops. |
| baldRoller | 68 × 64 | Rolling brute that shoulder-checks targets. |
| tripodSpinner | 66 × 84 | Three-legged walker that pivots and stomps. |
| glyphGyre | 96 × 96 | Hovering glyph orb that fires void beams. |
| realmGuardian | 264 × 341 | Immobile void guardian towering over intruders. |
| tricylicSlasher | 92 × 92 | Flying triangle that accelerates into blinding charge runs. |

Hitbox sizes are derived from archetype metadata in `js/levels.js`. Level or encounter overrides can still provide custom `hitboxWidth`, `hitboxHeight`, or `hitboxOffsetY` values when unique sizing is needed.

Projectile hit detection now queries the same rectangular hitboxes via `Stick.distanceToPoint`, so both melee and ranged attacks respect the visual footprint of these enemies.
