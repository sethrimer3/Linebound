/**
 * renderer.ts
 * Canvas rendering for Linebound.
 *
 * Draws:
 *   • Terrain blocks (from the parsed level)
 *   • The stickman (head circle, body line, jointed limbs, square hands/feet)
 *   • The world map (level nodes connected by paths)
 *   • Camera management (follows the player stickman)
 *
 * All drawing is done with the Canvas 2D API. Coordinates are in world-space;
 * the camera transform maps world → screen.
 */

import { Block } from './physics';
import { Stickman, HEAD_RADIUS, EXTREMITY_SIZE } from './stickman';
import { LevelInstance, MapNode, TILE_SIZE } from './level';

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
  block: '#2a2a4e',
  blockEdge: '#3a3a5e',
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
 * Draws all terrain blocks from a level instance.
 */
export function drawBlocks(
  ctx: CanvasRenderingContext2D, blocks: Block[],
): void {
  for (const b of blocks) {
    // Block fill
    ctx.fillStyle = b.h < TILE_SIZE ? COLORS.platform : COLORS.block;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Block edge highlight (top and left edges lighter)
    ctx.strokeStyle = COLORS.blockEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
  }
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
 */
export function drawStickman(
  ctx: CanvasRenderingContext2D, s: Stickman,
): void {
  if (!s.alive) return;

  ctx.strokeStyle = COLORS.stickman;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // -- Head (circle) --
  ctx.fillStyle = COLORS.stickmanHead;
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
  drawLine(ctx, s.pelvis.x, s.pelvis.y, s.kneeR.x, s.kneeR.y);
  drawLine(ctx, s.kneeR.x, s.kneeR.y, s.footR.x, s.footR.y);

  // -- Hands (small squares) --
  ctx.fillStyle = COLORS.stickmanExtremity;
  drawSquare(ctx, s.handL.x, s.handL.y, EXTREMITY_SIZE);
  drawSquare(ctx, s.handR.x, s.handR.y, EXTREMITY_SIZE);

  // -- Feet (small squares) --
  drawSquare(ctx, s.footL.x, s.footL.y, EXTREMITY_SIZE);
  drawSquare(ctx, s.footR.x, s.footR.y, EXTREMITY_SIZE);

  // -- Joint dots (elbows and knees) --
  ctx.fillStyle = COLORS.stickman;
  drawDot(ctx, s.elbowL.x, s.elbowL.y, 2);
  drawDot(ctx, s.elbowR.x, s.elbowR.y, 2);
  drawDot(ctx, s.kneeL.x, s.kneeL.y, 2);
  drawDot(ctx, s.kneeR.x, s.kneeR.y, 2);
}

/**
 * Draws the world map: nodes for each level, connected by paths.
 * Nodes show lock/unlock/complete state.
 */
export function drawWorldMap(
  ctx: CanvasRenderingContext2D,
  nodes: MapNode[],
  screenW: number,
  screenH: number,
  selectedId: string | null,
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

  // Convert normalised positions to screen coords with padding
  const padX = 80;
  const padY = 100;
  const mapW = screenW - padX * 2;
  const mapH = screenH - padY * 2;

  const screenNodes = nodes.map(n => ({
    ...n,
    sx: padX + n.x * mapW,
    sy: padY + n.y * mapH,
  }));

  // Draw paths between sequential nodes
  ctx.strokeStyle = COLORS.mapPath;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  for (let i = 1; i < screenNodes.length; i++) {
    const prev = screenNodes[i - 1]!;
    const curr = screenNodes[i]!;
    ctx.beginPath();
    ctx.moveTo(prev.sx, prev.sy);
    ctx.lineTo(curr.sx, curr.sy);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Draw nodes
  const nodeRadius = 18;
  for (const n of screenNodes) {
    // Node circle
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

    // Level name label below
    ctx.fillStyle = n.unlocked ? COLORS.text : COLORS.muted;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(n.name, n.sx, n.sy + nodeRadius + 8);

    // Level id above
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

  // Instructions at bottom
  ctx.fillStyle = COLORS.muted;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    'Tap a level to play  •  Swipe up or press Space to start',
    screenW / 2, screenH - 20,
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
