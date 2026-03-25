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
  /**
   * XP awarded to the player upon completing this level.
   * Defaults to 80 if omitted.
   */
  xpReward?: number;
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
  /**
   * World-space center X of the exit tile ('>' in the grid).
   * undefined if no exit tile was found in the level.
   */
  exitX: number | undefined;
  /**
   * World-space center Y of the exit tile.
   * undefined if no exit tile was found in the level.
   */
  exitY: number | undefined;
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
  /**
   * IDs of levels this node connects back to (its prerequisite levels).
   * Used by the renderer to draw path lines between related nodes.
   */
  connections: string[];
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
  mapX: 0.08,
  mapY: 0.28,
  unlocked: true,
  requires: [],
  spawnCol: 2,
  spawnRow: 13,
  xpReward: 80,
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
  mapX: 0.20,
  mapY: 0.52,
  unlocked: false,
  requires: ['1-1'],
  spawnCol: 1,
  spawnRow: 13,
  color: '#7a9abf',
  xpReward: 100,
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
  mapX: 0.08,
  mapY: 0.72,
  unlocked: false,
  requires: ['1-2'],
  color: '#5a4a7a',
  spawnCol: 1,
  spawnRow: 14,
  xpReward: 120,
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
  mapX: 0.38,
  mapY: 0.28,
  unlocked: false,
  requires: ['1-3'],
  color: '#4caf50',
  spawnCol: 1,
  spawnRow: 15,
  xpReward: 150,
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
// Level 2-2 — Lava Passage
// ---------------------------------------------------------------------------

/**
 * Volcanic crossing — the ground splits into two sections separated by a chasm.
 * The player must time a jump across the gap; several platforms provide
 * safe footing on either side.
 * A greatsword and dagger are hidden on elevated platforms.
 *
 * Layout: 40 columns × 17 rows
 * Spawn: column 1, row 12
 * Ground: rows 14–16 (left solid 0-15, gap 16-22, right solid 23-39)
 */
const LEVEL_2_2: LevelDef = {
  id: '2-2',
  name: 'Lava Passage',
  mapX: 0.50,
  mapY: 0.52,
  unlocked: false,
  requires: ['2-1'],
  color: '#e8622a',
  spawnCol: 1,
  spawnRow: 12,
  xpReward: 180,
  tiles: [
    // 40-column layout — volcanic/lava biome
    '........................................',
    '........................................',
    '........................................',
    '..............ppppp.....................',
    '........................................',
    '..........G...................D.........',
    '....ppppp...........pppppp..............',
    '........................................',
    '........................................',
    '........................................',
    '....................pppppp..............',
    '........................................',
    '........................................',
    '.................................>......',
    '################.......#################',
    '################.......#################',
    '################.......#################',
  ],
};

// ---------------------------------------------------------------------------
// Level 2-3 — Cloud Crossing
// ---------------------------------------------------------------------------

/**
 * Sky-high platforming challenge — the ground has two large gaps.
 * Scattered platforms allow skilled players to cross safely.
 * Multiple weapon pedestals reward explorers on the high routes.
 *
 * Layout: 44 columns × 18 rows
 * Spawn: column 1, row 13
 * Ground: rows 15–17 (two gaps at cols 12-16 and 29-33)
 */
const LEVEL_2_3: LevelDef = {
  id: '2-3',
  name: 'Cloud Crossing',
  mapX: 0.38,
  mapY: 0.72,
  unlocked: false,
  requires: ['2-2'],
  color: '#64b5f6',
  spawnCol: 1,
  spawnRow: 13,
  xpReward: 210,
  tiles: [
    // 44-column layout — sky/cloud biome
    '............................................',
    '............................................',
    '............................................',
    '...............ppppppp......................',
    '............................................',
    '.....ppppp........................pppp......',
    '............................................',
    '..............pppppp.........ppppppp........',
    '............................................',
    '.....@..................................W...',
    '....ppppp.......ppppppp.................ppp.',
    '............................................',
    '............................................',
    '............................................',
    '................................>...........',
    '############.....############.....##########',
    '############.....############.....##########',
    '############.....############.....##########',
  ],
};

// ---------------------------------------------------------------------------
// Level 3-1 — Desert Mesa
// ---------------------------------------------------------------------------

/**
 * World 3 opener — arid desert with three raised mesa formations.
 * The flat ground is unbroken, but the mesa blocks force the player
 * to navigate around or over them.
 * Weapon pedestals sit on either side of the central mesa.
 *
 * Layout: 46 columns × 17 rows
 * Spawn: column 1, row 12
 * Ground: rows 15–16 (solid all the way across)
 */
const LEVEL_3_1: LevelDef = {
  id: '3-1',
  name: 'Desert Mesa',
  mapX: 0.68,
  mapY: 0.28,
  unlocked: false,
  requires: ['2-3'],
  color: '#d4a84b',
  spawnCol: 1,
  spawnRow: 12,
  xpReward: 250,
  tiles: [
    // 46-column layout — desert/sandy biome with mesa formations
    '..............................................',
    '..............................................',
    '######..............######..............######',
    '######..............######..............######',
    '######..............######..............######',
    '..............................................',
    '..............................................',
    '......ppppp...................ppppp...........',
    '.........G.....................D..............',
    '....ppppp...........ppppppp...........pppp....',
    '..............................................',
    '..............................................',
    '..............................................',
    '..............................................',
    '........................................>.....',
    '##############################################',
    '##############################################',
  ],
};

// ---------------------------------------------------------------------------
// Level 3-2 — Sand Drifts
// ---------------------------------------------------------------------------

/**
 * Rolling dunes with a ground gap and tricky multi-tier platforms.
 * All three weapon types are available to the skilled explorer.
 * The stacked platform rows create a unique vertical puzzle.
 *
 * Layout: 48 columns × 18 rows
 * Spawn: column 1, row 12
 * Ground: rows 15–17 (left solid 0-19, gap 20-26, right solid 27-47)
 */
const LEVEL_3_2: LevelDef = {
  id: '3-2',
  name: 'Sand Drifts',
  mapX: 0.80,
  mapY: 0.52,
  unlocked: false,
  requires: ['3-1'],
  color: '#c19a6b',
  spawnCol: 1,
  spawnRow: 12,
  xpReward: 290,
  tiles: [
    // 48-column layout — sandy desert with dune formations
    '................................................',
    '................................................',
    '...ppppp..........ppppp..........ppppp..........',
    '................................................',
    '.....G.........................D.........W......',
    '...ppppp.......ppppp..........ppppp.........pppp',
    '................................................',
    '................................................',
    '................................................',
    '........pppppp.....................pppppp.......',
    '................................................',
    '................................................',
    '................................................',
    '................................................',
    '........................................>.......',
    '####################.......#####################',
    '####################.......#####################',
    '####################.......#####################',
  ],
};

// ---------------------------------------------------------------------------
// Level 3-3 — Ancient Sanctum (final)
// ---------------------------------------------------------------------------

/**
 * The final challenge — a long ancient temple with multiple platform tiers.
 * Two chasms flank the central hall; mastery of all movement mechanics
 * is required to reach the exit deep in the sanctum.
 * Two greatsword and one dagger pedestal guard the inner chambers.
 *
 * Layout: 52 columns × 20 rows
 * Spawn: column 1, row 16
 * Ground: rows 18–19 (left solid 0-17, gap 18-24, right solid 25-51)
 */
const LEVEL_3_3: LevelDef = {
  id: '3-3',
  name: 'Ancient Sanctum',
  mapX: 0.68,
  mapY: 0.72,
  unlocked: false,
  requires: ['3-2'],
  color: '#ffd700',
  spawnCol: 1,
  spawnRow: 16,
  xpReward: 350,
  tiles: [
    // 52-column layout — ancient temple biome (final level)
    '....................................................',
    '....................................................',
    '......ppppp...........ppppp...........ppppp.........',
    '....................................................',
    '....................................................',
    '..........pppppppp..........pppppppp................',
    '....................................................',
    '.....G.........................D.............G......',
    '.ppppp.....pppppppp.....pppppppp.....ppppppp........',
    '....................................................',
    '....................................................',
    '....................................................',
    '....................................................',
    '..........................pppppppp..................',
    '....................................................',
    '....................................................',
    '....................................................',
    '....................................................',
    '..........................................>.........',
    '##################.......###########################',
  ],
};

// ---------------------------------------------------------------------------
// Level registry
// ---------------------------------------------------------------------------

/** All defined levels, indexed by id. */
const LEVELS: Map<string, LevelDef> = new Map();

/** Register the built-in levels in play order. */
function registerBuiltinLevels(): void {
  // World 1 — Tutorial / Forest
  LEVELS.set(LEVEL_1_1.id, LEVEL_1_1);
  LEVELS.set(LEVEL_1_2.id, LEVEL_1_2);
  LEVELS.set(LEVEL_1_3.id, LEVEL_1_3);
  // World 2 — Grasslands / Volcanic
  LEVELS.set(LEVEL_2_1.id, LEVEL_2_1);
  LEVELS.set(LEVEL_2_2.id, LEVEL_2_2);
  LEVELS.set(LEVEL_2_3.id, LEVEL_2_3);
  // World 3 — Desert / Ancient
  LEVELS.set(LEVEL_3_1.id, LEVEL_3_1);
  LEVELS.set(LEVEL_3_2.id, LEVEL_3_2);
  LEVELS.set(LEVEL_3_3.id, LEVEL_3_3);
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
 * and extracts all weapon pickups and the exit tile from the tile grid.
 *
 * @param def - The level definition to parse
 * @returns A ready-to-play LevelInstance
 */
export function parseLevel(def: LevelDef): LevelInstance {
  const rows = def.tiles.length;
  const cols = def.tiles[0]?.length ?? 0;
  const blocks: Block[] = [];
  const weaponPickups: WeaponPickup[] = [];
  let exitX: number | undefined;
  let exitY: number | undefined;

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
      } else if (ch === '>') {
        // Exit tile — record the centre of this tile as the exit position
        exitX = c * TILE_SIZE + TILE_SIZE / 2;
        exitY = r * TILE_SIZE + TILE_SIZE / 2;
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
    exitX,
    exitY,
  };
}

// ---------------------------------------------------------------------------
// World map helpers
// ---------------------------------------------------------------------------

/**
 * Builds the list of world-map nodes from all registered levels.
 * Positions are normalised (0–1); the renderer converts to screen coords.
 * Each node carries its `connections` list (the IDs of its prerequisites)
 * so the renderer can draw paths between related nodes.
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
      // Connections link each node back to its prerequisite levels;
      // used by the renderer to draw path lines on the world map.
      connections: def.requires,
    });
  }

  return nodes;
}
