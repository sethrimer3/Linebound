# renderer.ts

## Purpose
Canvas 2D rendering for terrain, stickman, slime enemies, world map, weapon pickups, and camera management.

## Dependencies
### Imports / Script Dependencies
- `physics.ts` — Block type
- `stickman.ts` — Stickman, HEAD_RADIUS, EXTREMITY_SIZE
- `level.ts` — LevelInstance, MapNode, WeaponPickup, TILE_SIZE
- `enemies.ts` — Slime, SLIME_RADIUS

### Used By
- `game.ts` — calls drawing functions each frame

## Key Components
### Camera (class)
- Smooth follow with lerp, world↔screen coordinate conversion

### Drawing Functions
- clearCanvas, drawGround, drawBlocks, drawStickman, drawWeaponPickups, drawSlimes, drawWorldMap

### Terrain Sprite Logic (drawBlocks)
- **Surface detection:** a block is "exposed" when no full-height block sits directly above it (checked via a Set of occupied positions)
- **Exposed blocks:** lighter brown fill + drawGrassTop() — green grass strip with small blade bumps
- **Underground blocks:** darker fill, no grass
- **Thin platforms:** neutral stone-blue, never get grass

### Grass Rendering (drawGrassTop)
- 3 px base band + 2 px highlight strip + small blade bumps every 5 px
- Mirrors the prototype's per-surface grass sprite concept in pure canvas code

### Weapon Pickup Rendering (drawWeaponPickups)
- Floating glow animation (sin wave) + weapon icon + name label
- Icons drawn with canvas primitives: blades for melee, arc+string for ranged

### Slime Rendering (drawSlimes / drawSlime)
- Draws each living slime as a squash-stretched gradient ellipse with jelly highlight and eyes
- `squish` deformation: landing impact widens body (scaleX) and flattens it (scaleY)
- Drop shadow oval for depth; radial gradient body; specular highlight blob; two eyes with pupils
- Colors defined in COLORS: `slimeBody`, `slimeBodyDark`, `slimeHighlight`, `slimeEye`, `slimePupil`

### Stickman Rendering (drawStickman)
- Head = filled circle
- Spine = line (neck→pelvis)
- Each limb = two line segments with joint dot
- Hands/feet = small filled squares
- Equipped weapon drawn via drawHeldWeapon: melee = blade + crossguard from dominant hand; ranged = bow arc + string

## Watch Out For
- buildOccupiedSet only registers full-height blocks (h >= TILE_SIZE/2) to avoid platforms blocking grass from growing above solid terrain
- Eyes in drawSlime are drawn AFTER the ctx.restore() from the squish transform so they don't distort

## Change History
- **Build 3:** Initial implementation — full stickman rendering, world map, camera
- **Build 5:** Added terrain sprite logic (grass/underground), drawWeaponPickups, drawHeldWeapon; expanded COLORS palette
- **Build 7:** Added drawSlimes/drawSlime; added slime color entries to COLORS; imported Slime/SLIME_RADIUS from enemies.ts
