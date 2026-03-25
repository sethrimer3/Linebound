/**
 * weapons.ts
 * Weapon definitions for Linebound.
 *
 * Weapons are pure data records describing how each weapon behaves and how
 * it is rendered when held by a stickman. The gameplay systems (stickman,
 * renderer, game) read from these definitions rather than hard-coding values.
 *
 * Adapted from the prototype's WEAPON_DEFS table — simplified, typed, and
 * cleaned up for the new engine.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The broad combat category of a weapon.
 *   melee   — swings in an arc close to the wielder
 *   ranged  — fires a projectile toward the target
 */
export type WeaponKind = 'melee' | 'ranged';

/**
 * One-hand vs two-hand determines arm animation and stance.
 *   oneHand  — dominant hand only; off-hand hangs free
 *   twoHand  — both hands grip the weapon
 */
export type WeaponGrip = 'oneHand' | 'twoHand';

/**
 * Static definition for a single weapon archetype.
 * All numeric ranges are in world pixels / milliseconds.
 */
export interface WeaponDef {
  /** Unique string key (e.g. 'sword'). */
  id: string;
  /** Display name shown in the HUD. */
  name: string;
  /** Broad combat category. */
  kind: WeaponKind;
  /** One-hand vs two-hand grip. */
  grip: WeaponGrip;
  /**
   * Attack reach in pixels.
   * For melee: radius of the hit arc from the hand.
   * For ranged: initial speed of the projectile (px/s).
   */
  range: number;
  /**
   * Angular spread of the hit arc in radians (melee only).
   * 0 = stab, Math.PI = full half-circle sweep.
   */
  arc: number;
  /** Base damage dealt per hit (before any multipliers). */
  dmg: number;
  /** Time in milliseconds between attacks (cooldown). */
  cooldown: number;
  /** Swing animation duration in milliseconds (melee only). */
  swingDuration: number;
  /** Horizontal knockback impulse applied to the target on hit (px/s). */
  knock: number;
  /** Primary color used when drawing the weapon blade/shaft. */
  color: string;
  /** Optional secondary/highlight color for the blade edge. */
  highlightColor?: string;
  /**
   * Visual length of the blade in pixels (used by the renderer).
   * Defaults to `range * 0.85` if not set.
   */
  bladeLength?: number;
}

// ---------------------------------------------------------------------------
// Weapon registry
// ---------------------------------------------------------------------------

/**
 * All built-in weapon definitions.
 * Keys match the `id` field for O(1) lookup.
 *
 * Derivation guide from old prototype:
 *   dmg       — carried over as-is (prototype used 2 as a baseline)
 *   range     — same pixels (engine tile size is identical at 40 px/tile)
 *   cooldown  — same milliseconds
 *   knock     — same px/s impulse
 *   arc       — same radians
 */
const WEAPON_REGISTRY: Record<string, WeaponDef> = {

  // ---- Sword ---------------------------------------------------------------
  // Classic one-handed melee weapon: moderate range, quick cooldown.
  // The baseline starter weapon found in level 1-1.
  sword: {
    id: 'sword',
    name: 'Sword',
    kind: 'melee',
    grip: 'oneHand',
    range: 42,
    arc: 1.0,
    dmg: 2,
    cooldown: 550,
    swingDuration: 220,
    knock: 160,
    color: '#d0d0ff',
    highlightColor: '#ffffff',
    bladeLength: 36,
  },

  // ---- Dagger --------------------------------------------------------------
  // Short, fast weapon: half the range of a sword but nearly double the
  // attack rate. Great for quick enemies in tight corridors.
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    kind: 'melee',
    grip: 'oneHand',
    range: 28,
    arc: 0.8,
    dmg: 1,
    cooldown: 320,
    swingDuration: 140,
    knock: 90,
    color: '#ffd36b',
    highlightColor: '#fff5cc',
    bladeLength: 22,
  },

  // ---- Greatsword ----------------------------------------------------------
  // Slow two-hander with a wide sweeping arc. High damage and knockback
  // but the long cooldown leaves the wielder briefly vulnerable.
  greatsword: {
    id: 'greatsword',
    name: 'Greatsword',
    kind: 'melee',
    grip: 'twoHand',
    range: 64,
    arc: 1.2,
    dmg: 4,
    cooldown: 820,
    swingDuration: 320,
    knock: 260,
    color: '#a3d8ff',
    highlightColor: '#dff0ff',
    bladeLength: 56,
  },

  // ---- Bow -----------------------------------------------------------------
  // Ranged weapon that fires a projectile in the stickman's facing direction.
  // `range` here represents projectile launch speed (px/s).
  // Wide arc is unused for ranged weapons.
  bow: {
    id: 'bow',
    name: 'Bow',
    kind: 'ranged',
    grip: 'twoHand',
    range: 520,     // projectile speed px/s
    arc: 0.05,      // slight spread
    dmg: 3,
    cooldown: 700,
    swingDuration: 0, // no swing animation for ranged
    knock: 120,
    color: '#8b6914',
    highlightColor: '#c8a84b',
    bladeLength: 28,  // visual arrow length
  },
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns the WeaponDef for the given id, or undefined if not found.
 */
export function getWeaponDef(id: string): WeaponDef | undefined {
  return WEAPON_REGISTRY[id];
}

/**
 * Returns all registered weapon definitions as an array.
 */
export function getAllWeapons(): WeaponDef[] {
  return Object.values(WEAPON_REGISTRY);
}
