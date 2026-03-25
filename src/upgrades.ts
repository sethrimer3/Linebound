/**
 * upgrades.ts
 * Player stat and upgrade system for Linebound.
 *
 * Stats scale by 1.1× per level — smooth progression that avoids the
 * exponential runaway of the old 2× doubling used in the prototype.
 *
 * Three upgradeable stats boosted by spending skill points:
 *   health  — increases max HP
 *   attack  — increases weapon damage multiplier
 *   defense — adds flat damage reduction per hit
 *
 * Skill points are earned at every level-up (SKILL_POINTS_PER_LEVEL per level).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XP needed to reach level 2 from level 1. */
const BASE_XP = 100;

/**
 * Each successive level requires 1.1× the XP of the previous one.
 * (Old prototype used 2×; 1.1× gives a gentler, more satisfying curve.)
 */
export const LEVEL_XP_FACTOR = 1.1;

/** Base max HP at level 1 before any skill bonuses. */
export const BASE_MAX_HP = 100;

/** Base attack multiplier at level 1 (1.0 = unmodified weapon damage). */
export const BASE_ATTACK_MULT = 1.0;

/** Base flat damage reduction at level 1. */
export const BASE_DEFENSE = 0;

/**
 * Base stats multiply by this factor each level.
 * Level 2 = base × 1.1, level 3 = base × 1.21, and so on.
 */
export const STAT_LEVEL_FACTOR = 1.1;

/**
 * Each skill point invested in a stat multiplies it by this factor.
 * The bonuses compound: 3 points = 1.1³ = 1.331× the base.
 */
export const SKILL_POINT_FACTOR = 1.1;

/** Skill points awarded for each level-up. */
export const SKILL_POINTS_PER_LEVEL = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Number of points the player has invested in each upgradeable stat. */
export interface SkillAllocations {
  /** Points in max HP. */
  health: number;
  /** Points in attack damage multiplier. */
  attack: number;
  /** Points in flat damage reduction. */
  defense: number;
}

/** Full player stat record — persisted in the save file. */
export interface PlayerStats {
  /** Current character level (starts at 1). */
  level: number;
  /** XP accumulated toward the next level. */
  xp: number;
  /** XP required to reach the next level from the current one. */
  xpToNext: number;
  /** Unspent skill points available to allocate. */
  skillPoints: number;
  /** Points invested in each stat. */
  skills: SkillAllocations;
}

/** Resolved, ready-to-use stat values derived from a PlayerStats record. */
export interface EffectiveStats {
  /** Maximum HP the player can have. */
  maxHp: number;
  /**
   * Multiplier applied to weapon base damage.
   * 1.0 = unmodified, 1.5 = 50% more damage.
   */
  attackMult: number;
  /**
   * Flat damage reduction subtracted from each incoming hit.
   * Always leaves at least 1 damage through so every hit stings.
   */
  defense: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the XP needed to advance from `level` to `level + 1`.
 * Uses 1.1× scaling: xpForLevel(1) = 100, xpForLevel(2) = 110, etc.
 *
 * @param level - Current level (1-based)
 */
export function xpForLevel(level: number): number {
  return Math.round(BASE_XP * Math.pow(LEVEL_XP_FACTOR, level - 1));
}

/**
 * Creates a default PlayerStats object for a brand-new player at level 1
 * with no skill points spent.
 */
export function createDefaultStats(): PlayerStats {
  return {
    level: 1,
    xp: 0,
    xpToNext: xpForLevel(1),
    skillPoints: 0,
    skills: { health: 0, attack: 0, defense: 0 },
  };
}

/**
 * Derives effective combat stats from a PlayerStats record.
 *
 * Formula for HP and attack:
 *   baseStat × STAT_LEVEL_FACTOR^(level − 1) × SKILL_POINT_FACTOR^(skill pts)
 *
 * Defense is additive (2 points of flat reduction per skill point) and also
 * benefits from the level multiplier.
 *
 * @param stats - Player stats to derive from
 * @returns Resolved EffectiveStats
 */
export function computeEffectiveStats(stats: PlayerStats): EffectiveStats {
  // Each level multiplies base stats by STAT_LEVEL_FACTOR
  const levelMult = Math.pow(STAT_LEVEL_FACTOR, stats.level - 1);

  return {
    maxHp: Math.round(
      BASE_MAX_HP * levelMult * Math.pow(SKILL_POINT_FACTOR, stats.skills.health),
    ),
    attackMult: parseFloat(
      (BASE_ATTACK_MULT * levelMult * Math.pow(SKILL_POINT_FACTOR, stats.skills.attack)).toFixed(2),
    ),
    // Defense: 2 flat reduction per invested point, also scaled by level
    defense: Math.round(stats.skills.defense * 2 * levelMult),
  };
}

/**
 * Awards XP to the player and handles any resulting level-ups.
 * Loops to support multiple simultaneous level-ups (e.g. after a big XP reward).
 *
 * @param stats  - Player stats (mutated in-place)
 * @param amount - Amount of XP to award (must be ≥ 0)
 * @returns Number of levels gained (0 if no level-up occurred)
 */
export function addXp(stats: PlayerStats, amount: number): number {
  if (amount <= 0) return 0;

  stats.xp += amount;
  let levelsGained = 0;

  // Loop to handle multiple back-to-back level-ups
  while (stats.xp >= stats.xpToNext) {
    stats.xp -= stats.xpToNext;        // Carry excess XP into the next level
    stats.level += 1;
    stats.skillPoints += SKILL_POINTS_PER_LEVEL;
    stats.xpToNext = xpForLevel(stats.level);
    levelsGained += 1;
  }

  return levelsGained;
}

/**
 * Spends one skill point on the given stat.
 * Returns false (no-op) if the player has no available skill points.
 *
 * @param stats - Player stats (mutated in-place)
 * @param stat  - Which stat to invest in ('health' | 'attack' | 'defense')
 */
export function spendSkillPoint(
  stats: PlayerStats,
  stat: keyof SkillAllocations,
): boolean {
  if (stats.skillPoints <= 0) return false;
  stats.skillPoints -= 1;
  stats.skills[stat] += 1;
  return true;
}

/**
 * Resets all skill allocations and refunds every spent point.
 * Allows the player to fully reallocate their stats (respec).
 *
 * @param stats - Player stats (mutated in-place)
 */
export function resetSkills(stats: PlayerStats): void {
  const spent =
    stats.skills.health + stats.skills.attack + stats.skills.defense;
  stats.skills = { health: 0, attack: 0, defense: 0 };
  stats.skillPoints += spent;
}
