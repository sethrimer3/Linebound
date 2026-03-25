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
 *   '@' = weapon pickup (defaults to sword)
 *   'S' = sword pedestal  (grants sword on walk-over)
 *   'D' = dagger pedestal (grants dagger on walk-over)
 *   'G' = greatsword pedestal
 *   'W' = bow pedestal
 */

import { Block } from './physics';
import { WeaponDef, getWeaponDef } from './weapons';

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
  /** Weapon pickup items placed in the level. */
  weaponPickups: WeaponPickup[];
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

/**
 * A weapon pickup that the player can walk over to equip the weapon.
 * Disappears once collected.
 */
export interface WeaponPickup {
  /** World x of the pickup (tile center). */
  x: number;
  /** World y of the pickup (tile center). */
  y: number;
  /** The weapon awarded on collection. */
  weapon: WeaponDef;
  /** True once the player has picked this up. */
  collected: boolean;
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
 * Simple flat meadow terrain with a few platforms to practice jumping.
 * A sword pedestal waits near the entry point.
 *
 * Layout: 30 columns × 16 rows
 * Spawn: column 2, row 13 (just above ground)
 * Ground: row 15 (bottom row is solid)
 *
 * Tile notes:
 *   '@' — sword pickup on the ground
 *   '>' — exit door
 */
const LEVEL_1_1: LevelDef = {
  id: '1-1',
  name: 'First Steps',
  mapX: 0.15,
  mapY: 0.5,
  unlocked: true,
  requires: [],
  spawnCol: 2,
  spawnRow: 13,
  tiles: [
    // 30-column layout — meadow biome
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............................',
    '..............ppppp...........',
    '..............................',
    '..............................',
    '........ppppp.........pppp....',
    '..............................',
    '......@.......................',
    '...ppppp..........pppp........',
    '..............................',
    '..............................',
    '...................>..........',
    '##############################',
  ],
};

// ---------------------------------------------------------------------------
// Level 1-2 — Stone Bridge
// ---------------------------------------------------------------------------

/**
 * Second level — introduces gaps and a bridge section.
 * The player must jump across missing ground tiles.
 * A dagger pickup rewards careful exploration of the upper path.
 *
 * Layout: 36 columns × 16 rows
 * Spawn: column 1, row 13
 * Ground: row 15 solid (with a gap in the middle)
 */
const LEVEL_1_2: LevelDef = {
  id: '1-2',
  name: 'Stone Bridge',
  mapX: 0.35,
  mapY: 0.4,
  unlocked: false,
  requires: ['1-1'],
  spawnCol: 1,
  spawnRow: 13,
  color: '#7a9abf',
  tiles: [
    // 36-column layout — stone/grey biome
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '............pppppppp................',
    '....................................',
    '............@.......................',
    '....ppppp..........ppppp............',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '........>...........................',
    '########......####......############',
  ],
};

// ---------------------------------------------------------------------------
// Level 1-3 — Underground Cave
// ---------------------------------------------------------------------------

/**
 * Third level — tight cave with a low ceiling.
 * The enclosed terrain means the player must crouch and time jumps carefully.
 * Greatsword pedestal deep in the cave rewards exploration.
 *
 * Layout: 32 columns × 18 rows
 * Spawn: column 1, row 14
 * The entire top and bottom are solid; a cave corridor runs through rows 10–14.
 */
const LEVEL_1_3: LevelDef = {
  id: '1-3',
  name: 'Underground Cave',
  mapX: 0.55,
  mapY: 0.65,
  unlocked: false,
  requires: ['1-2'],
  color: '#5a4a7a',
  spawnCol: 1,
  spawnRow: 14,
  tiles: [
    // 32-column layout — underground/cave biome
    '################################',
    '################################',
    '################################',
    '#############################..#',
    '######################.......##.',
    '#################..........###..',
    '###########..............####...',
    '#######....................###..',
    '###.........................##..',
    '#....@......................##..',
    '#.......................>....##.',
    '#...........................###.',
    '#.........................#####.',
    '##.....................#######..',
    '##.......................######.',
    '##########################...##.',
    '################################',
    '################################',
  ],
};

// ---------------------------------------------------------------------------
// Level 2-1 — Grasslands
// ---------------------------------------------------------------------------

/**
 * World 2 opener — wide open meadow with rolling terrain and tall platforms.
 * Introduces the bow weapon.
 * Longer level to encourage the auto-walk mechanic.
 *
 * Layout: 50 columns × 18 rows
 * Spawn: column 1, row 15
 */
const LEVEL_2_1: LevelDef = {
  id: '2-1',
  name: 'Grasslands',
  mapX: 0.75,
  mapY: 0.3,
  unlocked: false,
  requires: ['1-3'],
  color: '#4caf50',
  spawnCol: 1,
  spawnRow: 15,
  tiles: [
    // 50-column layout — bright meadow/grasslands biome
    '..................................................',
    '..................................................',
    '..................................................',
    '..................................................',
    '...........................pppppp.................',
    '..................................................',
    '..................................................',
    '.......pppppp...............................ppppp.',
    '..................................................',
    '..................................................',
    '...ppppp.........ppppp......pppppp................',
    '..................................................',
    '.....@..........W.......................W.........',
    '...ppppp.........ppppp......pppppp................',
    '..................................................',
    '..................................................',
    '.......................................>..........',
    '##################################################',
  ],
};

// ---------------------------------------------------------------------------
// Level registry
// ---------------------------------------------------------------------------

/** All defined levels, indexed by id. */
const LEVELS: Map<string, LevelDef> = new Map();

/** Register the built-in levels in play order. */
function registerBuiltinLevels(): void {
  LEVELS.set(LEVEL_1_1.id, LEVEL_1_1);
  LEVELS.set(LEVEL_1_2.id, LEVEL_1_2);
  LEVELS.set(LEVEL_1_3.id, LEVEL_1_3);
  LEVELS.set(LEVEL_2_1.id, LEVEL_2_1);
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
 * Maps weapon tile characters to weapon IDs.
 * '@' is the generic pickup (defaults to sword); uppercase letters are
 * specific weapon pedestals placed by level designers.
 */
const WEAPON_TILE_MAP: Record<string, string> = {
  '@': 'sword',     // Generic weapon pickup — grants a sword
  'S': 'sword',     // Sword pedestal
  'D': 'dagger',    // Dagger pedestal
  'G': 'greatsword', // Greatsword pedestal
  'W': 'bow',       // Bow pedestal
};

/**
 * Parses a LevelDef into a playable LevelInstance.
 * Converts the tile grid into solid Block objects for the physics engine
 * and extracts all weapon pickups from the tile grid.
 *
 * @param def - The level definition to parse
 * @returns A ready-to-play LevelInstance
 */
export function parseLevel(def: LevelDef): LevelInstance {
  const rows = def.tiles.length;
  const cols = def.tiles[0]?.length ?? 0;
  const blocks: Block[] = [];
  const weaponPickups: WeaponPickup[] = [];

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
      } else if (ch && ch in WEAPON_TILE_MAP) {
        // Weapon pickup placed on the ground at this tile position
        const weaponId = WEAPON_TILE_MAP[ch as keyof typeof WEAPON_TILE_MAP]!;
        const weapon = getWeaponDef(weaponId);
        if (weapon) {
          weaponPickups.push({
            x: c * TILE_SIZE + TILE_SIZE / 2,
            y: r * TILE_SIZE + TILE_SIZE / 2,
            weapon,
            collected: false,
          });
        }
      }
    }
  }

  const width = cols * TILE_SIZE;
  const height = rows * TILE_SIZE;

  return {
    def,
    blocks,
    weaponPickups,
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
