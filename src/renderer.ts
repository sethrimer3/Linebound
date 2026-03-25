/**
 * renderer.ts
 * Canvas rendering for Linebound.
 *
 * Draws:
 *   • Terrain blocks (from the parsed level) with surface/underground sprites:
 *       - Surface blocks (air directly above) get a green grass top strip
 *       - Underground blocks get a brown dirt fill
 *   • Weapon pickups as glowing icons on the ground
 *   • The stickman (head circle, body line, jointed limbs, square hands/feet)
 *     with any equipped weapon drawn in the dominant hand
 *   • The world map (level nodes connected by paths)
 *   • Camera management (follows the player stickman)
 *
 * All drawing is done with the Canvas 2D API. Coordinates are in world-space;
 * the camera transform maps world → screen.
 */

import { Block } from './physics';
import { Stickman, HEAD_RADIUS, EXTREMITY_SIZE } from './stickman';
import { LevelInstance, MapNode, WeaponPickup, TILE_SIZE } from './level';
import { WeaponDef } from './weapons';
import { PlayerStats, computeEffectiveStats, xpForLevel } from './upgrades';
import { Slime, SLIME_RADIUS } from './enemies';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

/** Color palette for rendering. Matches the CSS color scheme. */
const COLORS = {
  bg: '#0d0d1a',
  surface: '#1a1a2e',
  primary: '#e94560',
  primaryDk: '#c73652',
  text: '#e0e0e0',
  muted: '#888888',
  // Underground blocks — dark earth fill
  block: '#2d1f12',
  blockEdge: '#3d2a18',
  // Surface blocks — slightly lighter brown dirt with grass on top
  blockSurface: '#3a2410',
  blockSurfaceEdge: '#4a3020',
  // Grass strip on exposed block tops
  grass: '#3a8c30',
  grassHighlight: '#52c444',
  // Thin platform color
  platform: '#4a4a6e',
  ground: '#333355',
  stickman: '#e0e0e0',
  stickmanHead: '#e0e0e0',
  stickmanExtremity: '#cccccc',
  sky: '#0d0d1a',
  mapPath: '#333355',
  mapNodeLocked: '#444444',
  mapNodeUnlocked: '#e94560',
  mapNodeCompleted: '#4caf50',
  // Weapon pickup glow
  pickupGlow: 'rgba(255, 220, 80, 0.55)',
  pickupIcon: '#ffe066',
  // Slime enemy colors — classic green blob
  slimeBody: '#3dba4e',
  slimeBodyDark: '#2a8a36',
  slimeHighlight: 'rgba(200, 255, 210, 0.55)',
  slimeEye: '#ffffff',
  slimePupil: '#1a1a1a',
  // Enemy stickman colors — red/crimson to distinguish from the player
  enemyStickman: '#ff4040',
  enemyStickmanHead: '#ff4040',
  // Hit flash — bright white flashes when any stickman takes damage
  hitFlash: '#ffffff',
};

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/** Simple 2D camera that follows a target with smooth lerp. */
export class Camera {
  /** Camera center x in world coordinates. */
  x = 0;
  /** Camera center y in world coordinates. */
  y = 0;
  /** Viewport width in pixels. */
  width = 800;
  /** Viewport height in pixels. */
  height = 600;
  /** Lerp speed for following — higher = snappier. */
  followSpeed = 4.0;

  /**
   * Smoothly follows a target position.
   */
  follow(targetX: number, targetY: number, dt: number): void {
    const lerp = 1 - Math.exp(-this.followSpeed * dt);
    this.x += (targetX - this.x) * lerp;
    this.y += (targetY - this.y) * lerp;
  }

  /**
   * Sets the viewport size (should match canvas dimensions).
   */
  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  /**
   * Converts world x to screen x.
   */
  toScreenX(worldX: number): number {
    return worldX - this.x + this.width / 2;
  }

  /**
   * Converts world y to screen y.
   */
  toScreenY(worldY: number): number {
    return worldY - this.y + this.height / 2;
  }

  /**
   * Applies camera transform to the canvas context.
   * Call before drawing world-space objects; call ctx.restore() after.
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(
      -this.x + this.width / 2,
      -this.y + this.height / 2,
    );
  }
}

// ---------------------------------------------------------------------------
// Drawing functions
// ---------------------------------------------------------------------------

/**
 * Clears the entire canvas with the background color.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D, w: number, h: number,
): void {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draws the ground plane as a filled rectangle below the level.
 * Extends infinitely downward visually.
 */
export function drawGround(
  ctx: CanvasRenderingContext2D, groundY: number, levelWidth: number,
): void {
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(-500, groundY, levelWidth + 1000, 2000);

  // Ground surface line
  ctx.strokeStyle = COLORS.blockEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-500, groundY);
  ctx.lineTo(levelWidth + 500, groundY);
  ctx.stroke();
}

/**
 * Builds a Set of block top-left positions (encoded as `"x,y"`) so the
 * terrain renderer can quickly check whether a tile position is occupied.
 * Used to determine which block tops are exposed to open air (surface) and
 * which are buried underneath other blocks (underground).
 *
 * @param blocks - All solid blocks in the level
 * @returns A Set of "x,y" strings for occupied tile-top-left positions
 */
function buildOccupiedSet(blocks: Block[]): Set<string> {
  const occupied = new Set<string>();
  for (const b of blocks) {
    // Only track full-height tiles for the surface-detection check;
    // thin platforms (h < TILE_SIZE / 2) are never "above" a block.
    if (b.h >= TILE_SIZE / 2) {
      occupied.add(`${b.x},${b.y}`);
    }
  }
  return occupied;
}

/**
 * Draws all terrain blocks from a level instance.
 *
 * Surface detection:
 *   A block is "surface-exposed" when there is no other full-height block
 *   directly above it (at x, y - TILE_SIZE). Surface blocks receive:
 *     • A lighter dirt-brown fill to simulate exposed soil
 *     • A green grass strip across the top edge (3 px main, 2 px highlight)
 *   Underground blocks use a darker fill with no grass.
 *
 * Thin platforms (h < TILE_SIZE) are always drawn in a neutral accent color.
 */
export function drawBlocks(
  ctx: CanvasRenderingContext2D, blocks: Block[],
): void {
  // Pre-compute which positions contain a block (for O(1) neighbour lookup)
  const occupied = buildOccupiedSet(blocks);

  for (const b of blocks) {
    const isPlatform = b.h < TILE_SIZE / 2;

    if (isPlatform) {
      // Thin platform — neutral stone-blue accent
      ctx.fillStyle = COLORS.platform;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = COLORS.blockEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      continue;
    }

    // Check if the tile directly above this block is empty (surface-exposed)
    const aboveKey = `${b.x},${b.y - TILE_SIZE}`;
    const isExposed = !occupied.has(aboveKey);

    // Choose fill/edge colors based on exposure
    ctx.fillStyle = isExposed ? COLORS.blockSurface : COLORS.block;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.strokeStyle = isExposed ? COLORS.blockSurfaceEdge : COLORS.blockEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

    // Draw grass on the top of surface-exposed blocks
    if (isExposed) {
      drawGrassTop(ctx, b.x, b.y, b.w);
    }
  }
}

// Grass blade tuning constants
/** Horizontal spacing between grass blades in pixels. */
const BLADE_SPACING = 5;
/** Width of each grass blade in pixels. */
const BLADE_WIDTH = 2;
/** Short blade height (most blades). */
const BLADE_HEIGHT_SHORT = 3;
/** Tall blade height (every 3rd blade for variety). */
const BLADE_HEIGHT_TALL = 5;

/**
 * Draws a grass strip along the top edge of a surface block.
 *
 * The strip consists of:
 *   • A 3-pixel-tall base band in `COLORS.grass`
 *   • A 2-pixel-tall highlight band just above it in `COLORS.grassHighlight`
 *
 * Small blade bumps are painted at regular intervals to give the grass a
 * natural irregular silhouette, matching the prototype's grass sprite style.
 *
 * @param ctx - Canvas context (no transform needed — world coords)
 * @param bx  - Block left edge in world pixels
 * @param by  - Block top edge in world pixels
 * @param bw  - Block width in world pixels
 */
function drawGrassTop(
  ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number,
): void {
  // Base grass band — 3 px tall across the full width
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(bx, by, bw, 3);

  // Lighter highlight strip — 2 px tall at the very top edge
  ctx.fillStyle = COLORS.grassHighlight;
  ctx.fillRect(bx, by, bw, 2);

  // Small grass blades: short vertical bumps, spaced every BLADE_SPACING px
  ctx.fillStyle = COLORS.grass;
  for (let bx2 = bx + 2; bx2 < bx + bw - 2; bx2 += BLADE_SPACING) {
    // Every 3rd blade is taller for a natural irregular silhouette
    const bladeH = (Math.floor((bx2 - bx) / BLADE_SPACING) % 3 === 0)
      ? BLADE_HEIGHT_TALL
      : BLADE_HEIGHT_SHORT;
    ctx.fillRect(bx2, by - bladeH + 2, BLADE_WIDTH, bladeH);
  }
}

/**
 * Draws all weapon pickup items in the level.
 *
 * Each pickup is rendered as:
 *   • A soft radial glow behind the icon
 *   • A small sword/bow icon (drawn with canvas primitives, no sprites needed)
 *   • The weapon name as small text below the icon
 *
 * Collected pickups are skipped.
 *
 * @param ctx     - Canvas context (already in world coordinates)
 * @param pickups - Weapon pickup array from LevelInstance
 * @param time    - Current time in seconds (for pulsing animation)
 */
export function drawWeaponPickups(
  ctx: CanvasRenderingContext2D,
  pickups: WeaponPickup[],
  time: number,
): void {
  for (const p of pickups) {
    if (p.collected) continue;

    // Gentle vertical float: ±3 px over a 2-second cycle
    const floatY = p.y - 18 + Math.sin(time * Math.PI) * 3;

    // Glow ring — pulses softly
    const alpha = 0.35 + 0.2 * Math.sin(time * 2 * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.pickupGlow;
    ctx.beginPath();
    ctx.arc(p.x, floatY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Weapon icon — simple geometric shape per weapon kind
    ctx.save();
    ctx.translate(p.x, floatY);
    drawWeaponIcon(ctx, p.weapon);
    ctx.restore();

    // Weapon name label below the icon
    ctx.fillStyle = COLORS.pickupIcon;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(p.weapon.name, p.x, floatY + 14);
  }
}

/**
 * Draws a small iconic representation of a weapon, centred at (0, 0).
 * The icon is purely geometric — no image assets required.
 *
 * @param ctx    - Canvas context (translated to icon centre)
 * @param weapon - WeaponDef whose kind/color determine the shape
 */
function drawWeaponIcon(ctx: CanvasRenderingContext2D, weapon: WeaponDef): void {
  const color = weapon.color;
  const len = (weapon.bladeLength ?? 28) * 0.4; // scale down for icon

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  if (weapon.kind === 'ranged') {
    // Bow: a curved arc with a taut string
    ctx.beginPath();
    ctx.arc(0, 0, len * 0.8, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    // String
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.7);
    ctx.lineTo(0, len * 0.7);
    ctx.stroke();
    // Arrow shaft + tip
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, 0);
    ctx.lineTo(len * 0.6, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(len * 0.6, 0);
    ctx.lineTo(len * 0.35, -4);
    ctx.lineTo(len * 0.35, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // Sword / dagger / greatsword: a simple blade + crossguard
    // Blade
    ctx.beginPath();
    ctx.moveTo(0, len * 0.9);
    ctx.lineTo(0, -len * 0.3);
    ctx.stroke();
    // Tip
    ctx.beginPath();
    ctx.moveTo(-2, -len * 0.3);
    ctx.lineTo(0, -len * 0.9);
    ctx.lineTo(2, -len * 0.3);
    ctx.closePath();
    ctx.fill();
    // Crossguard
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, len * 0.35);
    ctx.lineTo(len * 0.5, len * 0.35);
    ctx.stroke();
    // Handle
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7a5a30';
    ctx.beginPath();
    ctx.moveTo(0, len * 0.35);
    ctx.lineTo(0, len * 0.9);
    ctx.stroke();
  }
}

/**
 * Draws the level exit marker at the given world position.
 * Renders a glowing arched doorway to show the player where the goal is.
 *
 * @param ctx   - Canvas context (already in world coordinates)
 * @param x     - World x of the exit tile centre
 * @param y     - World y of the exit tile centre
 * @param time  - Current time in seconds (for pulsing glow)
 */
export function drawExitMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
): void {
  const pulse = 0.55 + 0.25 * Math.sin(time * 2 * Math.PI);
  const w = 22;
  const h = 34;

  // Glow halo around the door
  ctx.save();
  ctx.globalAlpha = pulse * 0.4;
  const grad = ctx.createRadialGradient(x, y - h / 2, 4, x, y - h / 2, 32);
  grad.addColorStop(0, '#4cff96');
  grad.addColorStop(1, 'rgba(76, 255, 150, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y - h / 2, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Door frame — two pillars
  ctx.fillStyle = '#5a7a60';
  ctx.fillRect(x - w / 2 - 4, y - h, 5, h);   // left pillar
  ctx.fillRect(x + w / 2 - 1, y - h, 5, h);   // right pillar

  // Arch (semicircle top)
  ctx.strokeStyle = '#5a7a60';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 1.5, y - h, w / 2 + 2, Math.PI, 0);
  ctx.stroke();

  // Door fill — glowing green portal
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#1e4d2e';
  ctx.fillRect(x - w / 2, y - h, w, h);
  // Inner glow
  const innerGrad = ctx.createLinearGradient(x, y - h, x, y);
  innerGrad.addColorStop(0, 'rgba(76, 255, 120, 0.6)');
  innerGrad.addColorStop(1, 'rgba(76, 255, 120, 0.05)');
  ctx.fillStyle = innerGrad;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.restore();

  // 'EXIT' label above
  ctx.fillStyle = '#4cff96';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('EXIT', x, y - h - 4);
}

/**
 * Draws all living slime enemies in the level.
 *
 * Each slime is rendered as a squashed ellipse with:
 *   • A dark-green shadow ellipse at ground level for depth
 *   • A gradient-filled main body that squishes vertically on landing
 *   • A specular highlight blob on the upper-left for a jelly sheen
 *   • Two eyes (white circle + dark pupil) that look alive
 *
 * Dead slimes are skipped automatically.
 *
 * @param ctx    - Canvas 2D context (already in world coordinates)
 * @param slimes - Array of slime entities from the game state
 */
export function drawSlimes(
  ctx: CanvasRenderingContext2D,
  slimes: Slime[],
): void {
  for (const slime of slimes) {
    if (!slime.alive) continue;
    drawSlime(ctx, slime);
  }
}

/**
 * Draws a single slime at its current position.
 * Applies a squish/stretch deformation based on `slime.squish`:
 *   • squish > 0 → widen and shorten (landing impact)
 *   • squish = 0 → perfect circle at rest
 *
 * @param ctx   - Canvas 2D context (world coordinates)
 * @param slime - The slime to draw
 */
function drawSlime(ctx: CanvasRenderingContext2D, slime: Slime): void {
  const r = slime.radius;
  const cx = slime.x;
  // slime.y is the centre of the hitbox circle (bottom = slime.y + radius)
  const cy = slime.y;

  // Squish deformation: squish > 0 makes it wider and flatter
  const scaleX = 1 + slime.squish * 0.45;
  const scaleY = 1 - slime.squish * 0.3;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scaleX, scaleY);

  // Drop shadow — faint dark oval below the body to suggest ground contact
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main body — radial gradient from bright green to dark green
  const bodyGrad = ctx.createRadialGradient(
    -r * 0.25, -r * 0.3, r * 0.1,  // inner highlight offset slightly up-left
    0, 0, r,                          // outer edge at full radius
  );
  bodyGrad.addColorStop(0, COLORS.slimeBody);
  bodyGrad.addColorStop(1, COLORS.slimeBodyDark);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Jelly highlight — a small bright translucent oval in the upper-left
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.35, r * 0.28, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.slimeHighlight;
  ctx.fill();

  ctx.restore(); // undo scale/translate for eyes

  // Eyes — drawn in un-squished space so they don't distort oddly
  const eyeOffsetX = r * 0.28;
  const eyeOffsetY = -r * 0.1;
  const eyeR = r * 0.2;
  const pupilR = eyeR * 0.55;

  // Left eye (white)
  ctx.beginPath();
  ctx.arc(cx - eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.slimeEye;
  ctx.fill();

  // Right eye (white)
  ctx.beginPath();
  ctx.arc(cx + eyeOffsetX, cy + eyeOffsetY, eyeR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.slimeEye;
  ctx.fill();

  // Left pupil
  ctx.beginPath();
  ctx.arc(cx - eyeOffsetX + 1, cy + eyeOffsetY + 1, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.slimePupil;
  ctx.fill();

  // Right pupil
  ctx.beginPath();
  ctx.arc(cx + eyeOffsetX + 1, cy + eyeOffsetY + 1, pupilR, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.slimePupil;
  ctx.fill();
}

/**
 * Draws a Stickman on the canvas.
 *
 * Anatomy rendered:
 *   • Head: filled circle
 *   • Spine: line from neck to pelvis
 *   • Arms: neck → elbow → hand (two segments per arm)
 *   • Legs: pelvis → knee → foot (two segments per leg)
 *   • Hands & feet: small filled squares
 *
 * Visual effects:
 *   • `strokeColor` — custom body/head color (default white for player, red for enemies)
 *   • `hitFlashTimer` — stickman flashes white briefly when damaged
 *   • `deathTimer` — dying stickman fades out over its ragdoll period
 *
 * @param ctx     - Canvas context (world coordinates)
 * @param s       - The stickman to draw
 * @param options - Optional rendering overrides
 */
export function drawStickman(
  ctx: CanvasRenderingContext2D,
  s: Stickman,
  options?: { showHpBar?: boolean },
): void {
  // Stickmen with deathTimer === -1 and !alive have been fully removed — skip
  if (!s.alive && s.deathTimer < 0) return;

  // Dying stickmen (alive=false, deathTimer≥0) fade out over their last second
  if (!s.alive && s.deathTimer >= 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, s.deathTimer));
  }

  // Hit-flash: render the whole skeleton white while hitFlashTimer > 0
  const flashing = s.hitFlashTimer > 0;
  const bodyColor = flashing ? COLORS.hitFlash : (s.strokeColor ?? COLORS.stickman);
  const headFill  = flashing ? COLORS.hitFlash : (s.strokeColor ?? COLORS.stickmanHead);
  const extFill   = flashing ? COLORS.hitFlash : COLORS.stickmanExtremity;

  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // -- Head (circle) --
  ctx.fillStyle = headFill;
  ctx.beginPath();
  ctx.arc(s.head.x, s.head.y, HEAD_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // -- Spine (neck → pelvis) --
  drawLine(ctx, s.neck.x, s.neck.y, s.pelvis.x, s.pelvis.y);

  // -- Left arm (neck → elbowL → handL) --
  drawLine(ctx, s.neck.x, s.neck.y, s.elbowL.x, s.elbowL.y);
  drawLine(ctx, s.elbowL.x, s.elbowL.y, s.handL.x, s.handL.y);

  // -- Right arm (neck → elbowR → handR) --
  drawLine(ctx, s.neck.x, s.neck.y, s.elbowR.x, s.elbowR.y);
  drawLine(ctx, s.elbowR.x, s.elbowR.y, s.handR.x, s.handR.y);

  // -- Left leg (pelvis → kneeL → footL) --
  drawLine(ctx, s.pelvis.x, s.pelvis.y, s.kneeL.x, s.kneeL.y);
  drawLine(ctx, s.kneeL.x, s.kneeL.y, s.footL.x, s.footL.y);

  // -- Right leg (pelvis → kneeR → footR) --
  drawLine(ctx, s.pelvis.x, s.pelvis.y, s.kneeR.x, s.pelvis.y);
  drawLine(ctx, s.pelvis.x, s.pelvis.y, s.kneeR.x, s.kneeR.y);
  drawLine(ctx, s.kneeR.x, s.kneeR.y, s.footR.x, s.footR.y);

  // -- Hands (small squares) --
  ctx.fillStyle = extFill;
  drawSquare(ctx, s.handL.x, s.handL.y, EXTREMITY_SIZE);
  drawSquare(ctx, s.handR.x, s.handR.y, EXTREMITY_SIZE);

  // -- Feet (small squares) --
  drawSquare(ctx, s.footL.x, s.footL.y, EXTREMITY_SIZE);
  drawSquare(ctx, s.footR.x, s.footR.y, EXTREMITY_SIZE);

  // -- Joint dots (elbows and knees) --
  ctx.fillStyle = bodyColor;
  drawDot(ctx, s.elbowL.x, s.elbowL.y, 2);
  drawDot(ctx, s.elbowR.x, s.elbowR.y, 2);
  drawDot(ctx, s.kneeL.x, s.kneeL.y, 2);
  drawDot(ctx, s.kneeR.x, s.kneeR.y, 2);

  // -- Equipped weapon (only when alive) --
  if (s.weapon && s.alive) {
    drawHeldWeapon(ctx, s);
  }

  // -- HP bar (drawn above head when damaged, if requested) --
  if (options?.showHpBar && s.alive && s.hp < s.maxHp) {
    drawStickmanHpBar(ctx, s);
  }

  // Restore alpha from death-fade
  if (!s.alive && s.deathTimer >= 0) {
    ctx.restore();
  }
}

/**
 * Draws the weapon held by a stickman, extending from their dominant hand.
 *
 * Melee weapons (sword, dagger, greatsword):
 *   Drawn as a blade extending from the hand position in the stickman's
 *   facing direction, angled slightly downward to look natural at rest.
 *
 * Ranged weapons (bow):
 *   Drawn as a vertical arc between the two hands to suggest the bow is
 *   held up and ready.
 *
 * @param ctx - Canvas 2D context (already in world coordinates)
 * @param s   - The stickman whose weapon is being drawn
 */
function drawHeldWeapon(ctx: CanvasRenderingContext2D, s: Stickman): void {
  const w = s.weapon!;

  // Dominant hand is on the facing side
  const hand = s.facing === 1 ? s.handR : s.handL;
  const elbow = s.facing === 1 ? s.elbowR : s.elbowL;

  const bladeLen = w.bladeLength ?? w.range * 0.85;
  const color = w.color;
  const highlight = w.highlightColor ?? '#ffffff';

  ctx.save();
  ctx.lineCap = 'round';

  if (w.kind === 'ranged') {
    // Bow — arc drawn between the two hands with a taut string
    const hx = (s.handL.x + s.handR.x) / 2;
    const hy = (s.handL.y + s.handR.y) / 2;
    // Bow body: arc curving away from the facing direction
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const bowRadius = bladeLen * 0.5;
    const bowAngle = 0.7; // arc half-angle in radians
    const startAngle = -Math.PI / 2 - bowAngle;
    const endAngle = -Math.PI / 2 + bowAngle;
    ctx.arc(hx - s.facing * bowRadius * 0.3, hy, bowRadius, startAngle, endAngle);
    ctx.stroke();
    // String
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.handL.x, s.handL.y);
    ctx.lineTo(s.handR.x, s.handR.y);
    ctx.stroke();
  } else {
    // Melee blade — extends from the hand outward in the facing direction
    // Angle: slightly downward tilt for a natural resting pose
    const angle = Math.atan2(
      hand.y - elbow.y,
      hand.x - elbow.x,
    );
    const tipX = hand.x + Math.cos(angle) * bladeLen;
    const tipY = hand.y + Math.sin(angle) * bladeLen;

    // Blade body
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Blade highlight — thinner line offset slightly for a metallic sheen
    ctx.strokeStyle = highlight;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(hand.x + 1, hand.y);
    ctx.lineTo(tipX + 1, tipY);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Crossguard — perpendicular to the blade at the grip end
    const guardLen = w.grip === 'twoHand' ? 8 : 5;
    const perpX = -Math.sin(angle) * guardLen;
    const perpY = Math.cos(angle) * guardLen;
    ctx.strokeStyle = '#7a5a30';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hand.x - perpX, hand.y - perpY);
    ctx.lineTo(hand.x + perpX, hand.y + perpY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Width of the stats panel in pixels.
 * Must match the reservation in drawWorldMap (subtracted from mapW).
 */
const STATS_PANEL_WIDTH = 180;

/**
 * Draws the world map: nodes for each level connected by prerequisite paths,
 * plus a player stats panel in the top-right corner.
 *
 * Paths are drawn using each node's `connections` list (its prerequisites)
 * rather than sequential index order, so branching layouts are supported.
 *
 * @param ctx        - Canvas rendering context
 * @param nodes      - Level nodes built by buildWorldMap()
 * @param screenW    - Canvas width in pixels
 * @param screenH    - Canvas height in pixels
 * @param selectedId - ID of the currently highlighted node (or null)
 * @param stats      - Player stats to display in the corner panel
 * @param levelUpMsg - Optional level-up banner text (fades out over time)
 */
export function drawWorldMap(
  ctx: CanvasRenderingContext2D,
  nodes: MapNode[],
  screenW: number,
  screenH: number,
  selectedId: string | null,
  stats: PlayerStats,
  levelUpMsg?: string,
): void {
  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, screenW, screenH);

  // Title
  ctx.fillStyle = COLORS.primary;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('World Map', screenW / 2, 30);

  if (nodes.length === 0) return;

  // Convert normalised positions to screen coords with padding.
  // Leave extra right padding for the stats panel.
  const padX = 80;
  const padY = 100;
  const mapW = screenW - padX * 2 - STATS_PANEL_WIDTH; // reserve space for stats panel
  const mapH = screenH - padY * 2;

  // Build a lookup from id → screen position for path drawing
  const nodeById = new Map<string, { sx: number; sy: number }>();
  const screenNodes = nodes.map(n => {
    const sn = {
      ...n,
      sx: padX + n.x * mapW,
      sy: padY + n.y * mapH,
    };
    nodeById.set(n.id, { sx: sn.sx, sy: sn.sy });
    return sn;
  });

  // Draw prerequisite paths — connect each node back to its required nodes
  ctx.strokeStyle = COLORS.mapPath;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  for (const n of screenNodes) {
    for (const reqId of n.connections) {
      const parent = nodeById.get(reqId);
      if (!parent) continue;
      ctx.beginPath();
      ctx.moveTo(parent.sx, parent.sy);
      ctx.lineTo(n.sx, n.sy);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Draw nodes
  const nodeRadius = 18;
  for (const n of screenNodes) {
    // Fill color: locked = grey, completed = green, unlocked = node color
    let fillColor = COLORS.mapNodeLocked;
    if (n.completed) fillColor = COLORS.mapNodeCompleted;
    else if (n.unlocked) fillColor = n.color;

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(n.sx, n.sy, nodeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Selected highlight ring
    if (n.id === selectedId) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(n.sx, n.sy, nodeRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = n.unlocked ? '#ffffff44' : '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(n.sx, n.sy, nodeRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Level name label below node
    ctx.fillStyle = n.unlocked ? COLORS.text : COLORS.muted;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(n.name, n.sx, n.sy + nodeRadius + 8);

    // Level id above node
    ctx.fillStyle = COLORS.muted;
    ctx.font = 'bold 11px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(n.id, n.sx, n.sy - nodeRadius - 4);

    // Lock icon for locked levels
    if (!n.unlocked) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', n.sx, n.sy);
    }
  }

  // ---- Stats panel (top-right corner) ----
  drawStatsPanel(ctx, stats, screenW);

  // ---- Level-up banner ----
  if (levelUpMsg) {
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(levelUpMsg, screenW / 2, 80);
  }

  // Instructions at bottom
  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    'Tap a level to play  •  Space/Enter to start  •  1/2/3: spend skill pts  •  R: reset skills',
    screenW / 2, screenH - 20,
  );
}

/**
 * Draws the player stat panel in the top-right corner of the world map.
 * Shows level, XP bar, effective stats, and skill-point spending hints.
 *
 * @param ctx    - Canvas rendering context
 * @param stats  - Player stats to display
 * @param screenW - Canvas width
 */
function drawStatsPanel(
  ctx: CanvasRenderingContext2D,
  stats: PlayerStats,
  screenW: number,
): void {
  const effective = computeEffectiveStats(stats);
  const panelW = 170;
  const panelH = 210;
  const panelX = screenW - panelW - 10;
  const panelY = 10;
  const pad = 10;

  // Panel background
  ctx.fillStyle = 'rgba(13, 13, 26, 0.88)';
  ctx.strokeStyle = '#333355';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();

  let y = panelY + pad;

  // Title row
  ctx.fillStyle = COLORS.primary;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Player Stats', panelX + pad, y);
  y += 20;

  // Level row
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Level ${stats.level}`, panelX + pad, y);
  y += 18;

  // XP bar
  const barW = panelW - pad * 2;
  const barH = 8;
  const xpRatio = stats.xpToNext > 0 ? Math.min(1, stats.xp / stats.xpToNext) : 0;
  ctx.fillStyle = '#222244';
  ctx.fillRect(panelX + pad, y, barW, barH);
  ctx.fillStyle = '#7b68ee';
  ctx.fillRect(panelX + pad, y, Math.round(barW * xpRatio), barH);
  ctx.strokeStyle = '#444466';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + pad, y, barW, barH);
  y += barH + 4;

  // XP numbers
  ctx.fillStyle = COLORS.muted;
  ctx.font = '10px sans-serif';
  ctx.fillText(`XP: ${stats.xp} / ${stats.xpToNext}`, panelX + pad, y);
  y += 16;

  // Divider
  ctx.strokeStyle = '#333355';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + pad, y);
  ctx.lineTo(panelX + panelW - pad, y);
  ctx.stroke();
  y += 8;

  // Effective stat rows
  const statLines = [
    { label: '❤ HP', value: `${effective.maxHp}`, pts: stats.skills.health, key: '1' },
    { label: '⚔ ATK', value: `×${effective.attackMult.toFixed(2)}`, pts: stats.skills.attack, key: '2' },
    { label: '🛡 DEF', value: `${effective.defense}`, pts: stats.skills.defense, key: '3' },
  ];
  for (const row of statLines) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${row.label}: ${row.value}`, panelX + pad, y);
    // Skill allocation indicator
    ctx.fillStyle = COLORS.muted;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`[${row.pts}pts]  [${row.key}]`, panelX + panelW - pad, y + 2);
    y += 18;
  }

  y += 4;

  // Skill points available
  const hasPoints = stats.skillPoints > 0;
  ctx.fillStyle = hasPoints ? '#ffe066' : COLORS.muted;
  ctx.font = hasPoints ? 'bold 11px sans-serif' : '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    hasPoints
      ? `★ ${stats.skillPoints} skill pts available!`
      : 'No skill points available',
    panelX + pad, y,
  );
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

/** Draws a line between two points. */
function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Draws a small filled square centred at (x, y). */
function drawSquare(
  ctx: CanvasRenderingContext2D, x: number, y: number, halfSize: number,
): void {
  ctx.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
}

/** Draws a small filled circle at (x, y). */
function drawDot(
  ctx: CanvasRenderingContext2D, x: number, y: number, r: number,
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
