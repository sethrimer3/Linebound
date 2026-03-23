/**
 * level.ts
 * Level definitions and world-map system for Linebound.
 *
 * Levels are defined as tile grids where each character represents a block type.
 * The world map shows all levels as nodes connected by paths, inspired by the
 * prototype's world-map style.
 *
 * Tile legend:
 *   '.' = air
 *   '#' = solid block
 *   '<' = entry / spawn point
 *   '>' = exit / goal
 *   'p' = thin platform (walkable top, passable sides)
 */

import { Block } from './physics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Size of one tile in pixels. */
export const TILE_SIZE = 40;

/** Definition of a single level. */
export interface LevelDef {
  /** Unique level identifier (e.g. '1-1'). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** World-map node position (0–1 normalised). */
  mapX: number;
  mapY: number;
  /** Whether this level is unlocked by default. */
  unlocked: boolean;
  /** IDs of levels that must be completed before this unlocks. */
  requires: string[];
  /** Tile grid — array of equal-length strings, one per row. */
  tiles: string[];
  /** Player spawn column (tile index from left). */
  spawnCol: number;
  /** Player spawn row (tile index from top). */
  spawnRow: number;
  /** Optional theme color for the map node. */
  color?: string;
}

/** A parsed, playable level instance. */
export interface LevelInstance {
  /** The level definition this instance was built from. */
  def: LevelDef;
  /** All solid blocks extracted from the tile grid. */
  blocks: Block[];
  /** Player spawn position in world pixels. */
  spawnX: number;
  spawnY: number;
  /** Total width of the level in pixels. */
  width: number;
  /** Total height of the level in pixels. */
  height: number;
  /** Ground Y in world pixels (bottom of the tile grid). */
  groundY: number;
}

/** A node on the world map representing one level. */
export interface MapNode {
  id: string;
  name: string;
  x: number; // screen px (computed at render time)
  y: number;
  unlocked: boolean;
  completed: boolean;
  color: string;
}

// ---------------------------------------------------------------------------
// Level 1-1 definition
// ---------------------------------------------------------------------------

/**
 * The first level — a gentle introduction to movement.
 * Simple flat terrain with a few platforms to practice jumping.
 *
 * Layout: 30 columns × 16 rows
 * Spawn: column 2, row 13 (two tiles above ground)
 * Ground: row 15 (bottom row is solid)
 */
const LEVEL_1_1: LevelDef = {
  id: '1-1',
  name: 'First Steps',
  mapX: 0.2,
  mapY: 0.5,
  unlocked: true,
  requires: [],
  spawnCol: 2,
  spawnRow: 13,
  tiles: [
    // 30-column layout
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............ppppp...........',
    '..............................',
    '..............................',
    '........ppppp.........pppp...',
    '..............................',
    '..............................',
    '...ppppp..........pppp.......',
    '..............................',
    '..............................',
    '..........>...................',
    '##############################',
  ],
};

// ---------------------------------------------------------------------------
// Level registry
// ---------------------------------------------------------------------------

/** All defined levels, indexed by id. */
const LEVELS: Map<string, LevelDef> = new Map();

/** Register the built-in levels. */
function registerBuiltinLevels(): void {
  LEVELS.set(LEVEL_1_1.id, LEVEL_1_1);
}

// Run registration on module load
registerBuiltinLevels();

/**
 * Returns all registered level definitions.
 */
export function getAllLevels(): LevelDef[] {
  return Array.from(LEVELS.values());
}

/**
 * Returns a specific level definition by id, or undefined if not found.
 */
export function getLevelDef(id: string): LevelDef | undefined {
  return LEVELS.get(id);
}

// ---------------------------------------------------------------------------
// Level parsing — convert tile grid to physics blocks
// ---------------------------------------------------------------------------

/**
 * Parses a LevelDef into a playable LevelInstance.
 * Converts the tile grid into solid Block objects for the physics engine.
 *
 * @param def - The level definition to parse
 * @returns A ready-to-play LevelInstance
 */
export function parseLevel(def: LevelDef): LevelInstance {
  const rows = def.tiles.length;
  const cols = def.tiles[0]?.length ?? 0;
  const blocks: Block[] = [];

  for (let r = 0; r < rows; r++) {
    const row = def.tiles[r] ?? '';
    for (let c = 0; c < cols; c++) {
      const ch = row[c];
      if (ch === '#') {
        // Solid terrain block
        blocks.push({
          x: c * TILE_SIZE,
          y: r * TILE_SIZE,
          w: TILE_SIZE,
          h: TILE_SIZE,
        });
      } else if (ch === 'p') {
        // Thin platform — a block with minimal height at the top of the tile
        blocks.push({
          x: c * TILE_SIZE,
          y: r * TILE_SIZE,
          w: TILE_SIZE,
          h: 6,
        });
      }
    }
  }

  const width = cols * TILE_SIZE;
  const height = rows * TILE_SIZE;

  return {
    def,
    blocks,
    spawnX: def.spawnCol * TILE_SIZE + TILE_SIZE / 2,
    spawnY: def.spawnRow * TILE_SIZE,
    width,
    height,
    groundY: height, // Ground at the very bottom of the level
  };
}

// ---------------------------------------------------------------------------
// World map helpers
// ---------------------------------------------------------------------------

/**
 * Builds the list of world-map nodes from all registered levels.
 * Positions are normalised (0–1); the renderer converts to screen coords.
 *
 * @param completedIds - Set of level IDs the player has completed
 * @returns Array of MapNode objects ready for rendering
 */
export function buildWorldMap(completedIds: Set<string>): MapNode[] {
  const nodes: MapNode[] = [];

  for (const def of LEVELS.values()) {
    // Determine if unlocked: either default-unlocked or all prerequisites met
    const unlocked = def.unlocked ||
      def.requires.every(req => completedIds.has(req));

    nodes.push({
      id: def.id,
      name: def.name,
      x: def.mapX,
      y: def.mapY,
      unlocked,
      completed: completedIds.has(def.id),
      color: def.color ?? '#e94560',
    });
  }

  return nodes;
}
