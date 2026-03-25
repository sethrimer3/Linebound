/**
 * game.ts
 * Main game scene for Linebound.
 *
 * Orchestrates two sub-states:
 *   1. **World Map** — level-select screen drawn on the canvas.
 *   2. **Gameplay**  — physics simulation, stickman, terrain, camera.
 *
 * The render loop runs continuously while the game scene is visible.
 */

import { GameState } from './main';
import { World } from './physics';
import { Stickman, createStickman } from './stickman';
import {
  parseLevel, getLevelDef, buildWorldMap,
  type LevelInstance, type MapNode,
} from './level';
import {
  bindInput, unbindInput, resetInput, getInput, pollKeyboard,
} from './input';
import {
  Camera, clearCanvas, drawGround, drawBlocks,
  drawStickman, drawWorldMap, drawWeaponPickups,
} from './renderer';
import { loadSave, persistSave } from './save';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** DOM id for the game scene wrapper. */
const GAME_SCENE_ID = 'scene-game';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Canvas element used for rendering. */
let canvas: HTMLCanvasElement | null = null;

/** 2D rendering context. */
let ctx: CanvasRenderingContext2D | null = null;

/** requestAnimationFrame handle for cancellation. */
let rafId: number | null = null;

/** Current sub-state: 'map' (level select) or 'play' (in a level). */
let subState: 'map' | 'play' = 'map';

// -- World map state --
let mapNodes: MapNode[] = [];
let selectedMapId: string | null = '1-1';

// -- Gameplay state --
let physicsWorld: World | null = null;
let playerStick: Stickman | null = null;
let levelInstance: LevelInstance | null = null;
let camera: Camera | null = null;

/** Accumulated gameplay time in seconds (used for pickup animation). */
let gameTime = 0;

/** Callback to return to the main menu. */
let onBackCallback: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialises the game scene: grabs the canvas, sizes it, sets up input,
 * and starts the render loop. Begins on the world map.
 *
 * @param onBack - Called when the player presses "Back to Menu".
 */
export function initGame(onBack: () => void): void {
  const scene = document.getElementById(GAME_SCENE_ID);
  if (!scene) {
    console.error('[game] Scene element not found:', GAME_SCENE_ID);
    return;
  }
  scene.classList.remove('hidden');

  canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('[game] Canvas element not found: #game-canvas');
    return;
  }

  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Bind touch / mouse / keyboard input
  bindInput(canvas);

  onBackCallback = onBack;

  // Wire up back button
  const backBtn = document.getElementById('btn-back-to-menu');
  backBtn?.addEventListener('click', handleBack);

  // Start on the world map
  enterMap();
  startRenderLoop();
}

/**
 * Tears down the game scene completely.
 */
export function stopGame(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  unbindInput();
  window.removeEventListener('resize', resizeCanvas);

  physicsWorld = null;
  playerStick = null;
  levelInstance = null;
  camera = null;

  const scene = document.getElementById(GAME_SCENE_ID);
  scene?.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Sub-state transitions
// ---------------------------------------------------------------------------

/** Enters the world-map sub-state (level select). */
function enterMap(): void {
  subState = 'map';
  physicsWorld = null;
  playerStick = null;
  levelInstance = null;

  // Build map nodes from save data
  const save = loadSave();
  const completed = new Set(save?.completedLevels ?? []);
  mapNodes = buildWorldMap(completed);
  selectedMapId = mapNodes[0]?.id ?? null;
}

/**
 * Enters the gameplay sub-state for a specific level.
 */
function enterLevel(levelId: string): void {
  const def = getLevelDef(levelId);
  if (!def) {
    console.warn('[game] Level not found:', levelId);
    return;
  }

  const instance = parseLevel(def);
  levelInstance = instance;

  // Reset gameplay timer so pickup animations start fresh
  gameTime = 0;

  // Create physics world and populate with terrain blocks
  const world = new World();
  world.groundY = instance.groundY;
  world.blocks = instance.blocks;
  physicsWorld = world;

  // Spawn the player stickman at the level's spawn point
  playerStick = createStickman(
    instance.spawnX, instance.spawnY, world, true,
  );

  // Set up camera
  camera = new Camera();
  camera.resize(canvas?.width ?? 800, canvas?.height ?? 600);
  camera.x = instance.spawnX;
  camera.y = instance.spawnY - 100;

  subState = 'play';
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/** Back button handler — returns to map or to main menu. */
function handleBack(): void {
  if (subState === 'play') {
    enterMap();
  } else {
    stopGame();
    onBackCallback?.();
  }
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

/** Resizes the canvas to fill the viewport. */
function resizeCanvas(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera?.resize(canvas.width, canvas.height);
}

/** Starts the main render/update loop. */
function startRenderLoop(): void {
  let lastTime = performance.now();

  function loop(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    resetInput();
    pollKeyboard();

    if (subState === 'map') {
      updateMap(dt);
      drawMapFrame();
    } else {
      updatePlay(dt);
      drawPlayFrame(dt);
    }

    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Map update & draw
// ---------------------------------------------------------------------------

/** Handles input on the world map (select level, enter). */
function updateMap(_dt: number): void {
  const input = getInput();
  if (input.jump && selectedMapId) {
    const node = mapNodes.find(n => n.id === selectedMapId);
    if (node?.unlocked) {
      enterLevel(selectedMapId);
    }
  }
}

/** Draws the world map frame. */
function drawMapFrame(): void {
  if (!ctx || !canvas) return;
  drawWorldMap(ctx, mapNodes, canvas.width, canvas.height, selectedMapId);
}

// ---------------------------------------------------------------------------
// Gameplay update & draw
// ---------------------------------------------------------------------------

/**
 * Radius in world pixels within which the player can collect a weapon pickup.
 * The player's pelvis position is used as the collection center.
 */
const PICKUP_COLLECT_RADIUS = 30;

/** Pre-computed squared pickup collection radius to avoid per-frame multiply. */
const PICKUP_COLLECT_RADIUS_SQ = PICKUP_COLLECT_RADIUS * PICKUP_COLLECT_RADIUS;

/** Updates physics, stickman, and input during gameplay. */
function updatePlay(dt: number): void {
  if (!physicsWorld || !playerStick || !canvas || !camera) return;

  // Accumulate gameplay time for animations
  gameTime += dt;

  const input = getInput();

  // Jump on swipe-up / tap / spacebar / W / ArrowUp
  if (input.jump) {
    playerStick.jump();
  }

  // Turn around on horizontal swipe / A,D / ArrowLeft,Right
  if (input.swipeLeft && playerStick.facing === 1) {
    playerStick.turnAround();
  } else if (input.swipeRight && playerStick.facing === -1) {
    playerStick.turnAround();
  }

  // Crouch while S / ArrowDown is held
  playerStick.crouching = input.crouch;

  // Punch toward the mouse cursor on click
  if (input.punch) {
    // Screen → world coordinate conversion:
    //   screenX = worldX - camera.x + canvas.width / 2
    //   worldX  = screenX + camera.x - canvas.width / 2
    // (same formula applies to Y)
    const worldPunchX = input.mouseX + camera.x - canvas.width / 2;
    const worldPunchY = input.mouseY + camera.y - canvas.height / 2;
    playerStick.punch(worldPunchX, worldPunchY, dt);
  }

  // Update stickman AI / walk cycle before physics step
  playerStick.update(dt, physicsWorld);

  // Step physics
  physicsWorld.step(dt);

  // Camera follows player
  const center = playerStick.center;
  camera.follow(center.x, center.y - 60, dt);

  // Check weapon pickup collection — player pelvis is the collection point
  checkWeaponPickups();
}

/**
 * Checks if the player is close enough to any uncollected weapon pickup
 * and automatically equips it.  The pickup is marked collected so it
 * disappears from the level on the next draw.
 */
function checkWeaponPickups(): void {
  if (!levelInstance || !playerStick) return;

  const px = playerStick.pelvis.x;
  const py = playerStick.pelvis.y;

  for (const pickup of levelInstance.weaponPickups) {
    if (pickup.collected) continue;

    const dx = px - pickup.x;
    const dy = py - pickup.y;
    if (dx * dx + dy * dy <= PICKUP_COLLECT_RADIUS_SQ) {
      // Player is close enough — equip the weapon
      playerStick.equipWeapon(pickup.weapon);
      pickup.collected = true;
    }
  }
}

/** Draws one gameplay frame: terrain, stickman, UI. */
function drawPlayFrame(_dt: number): void {
  if (!ctx || !canvas || !camera || !levelInstance || !playerStick) return;

  clearCanvas(ctx, canvas.width, canvas.height);

  // Apply camera transform for world-space drawing
  camera.applyTransform(ctx);

  drawGround(ctx, levelInstance.groundY, levelInstance.width);
  drawBlocks(ctx, levelInstance.blocks);
  // Draw weapon pickups in world space (before stickman so player renders on top)
  drawWeaponPickups(ctx, levelInstance.weaponPickups, gameTime);
  drawStickman(ctx, playerStick);

  ctx.restore(); // Undo camera transform

  // HUD text — level name (screen-space)
  ctx.fillStyle = '#888';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `Level ${levelInstance.def.id}: ${levelInstance.def.name}`,
    60, 12,
  );

  // HUD — equipped weapon name (bottom-left)
  if (playerStick.weapon) {
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`⚔ ${playerStick.weapon.name}`, 60, canvas.height - 20);
  }
}

// Re-export the GameState type so other modules can refer to it without
// importing from main.ts directly (avoids circular dependencies).
export type { GameState };
