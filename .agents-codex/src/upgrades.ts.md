# upgrades.ts

## Purpose
Provides the player stat and upgrade system for Linebound. Defines how player stats
scale with level-ups (1.1× per level), how skill points are earned and spent, and
how effective combat stats are computed from the player's current level and skill
allocations.

## Dependencies
### Imports / Script Dependencies
- None (pure data/logic module — no canvas, DOM, or physics imports)

### Used By
- `save.ts` — `PlayerStats` and `createDefaultStats()` are stored in `SaveData`
- `game.ts` — `addXp`, `spendSkillPoint`, `resetSkills` called during gameplay
- `renderer.ts` — `computeEffectiveStats`, `xpForLevel` used to render the stats panel

## Key Components

### `PlayerStats` (interface)
- **Purpose:** The full serialisable stat record for the player.
- **Fields:** `level`, `xp`, `xpToNext`, `skillPoints`, `skills: SkillAllocations`

### `SkillAllocations` (interface)
- **Purpose:** Tracks how many skill points have been invested in each stat.
- **Fields:** `health`, `attack`, `defense` (all non-negative integers)

### `EffectiveStats` (interface)
- **Purpose:** Resolved combat values derived from a `PlayerStats` record.
- **Fields:** `maxHp`, `attackMult`, `defense`

### `xpForLevel(level)`
- **Purpose:** XP required to advance from `level` to `level + 1`.
- **Formula:** `round(100 × 1.1^(level − 1))`
- **Examples:** level 1 → 100 XP, level 2 → 110, level 3 → 121 …

### `createDefaultStats()`
- **Purpose:** Constructs a fresh level-1 `PlayerStats` with no points spent.

### `computeEffectiveStats(stats)`
- **Purpose:** Derives maxHp, attackMult, defense from level + skill allocations.
- **Formula (HP/ATK):** `base × STAT_LEVEL_FACTOR^(level−1) × SKILL_POINT_FACTOR^(pts)`
- **Formula (DEF):** `skills.defense × 2 × levelMult` (additive, flat reduction)

### `addXp(stats, amount)`
- **Purpose:** Awards XP and loops through level-ups, granting `SKILL_POINTS_PER_LEVEL` per level.
- **Returns:** Number of levels gained.

### `spendSkillPoint(stats, stat)`
- **Purpose:** Deducts one skill point and increments the chosen stat allocation.
- **Returns:** `false` if no points available.

### `resetSkills(stats)`
- **Purpose:** Clears all allocations and refunds every spent point (full respec).

## Terminology
- **Skill point:** A spendable currency earned by leveling up, used to boost stats.
- **Skill allocation:** A count of skill points invested in a specific stat.
- **Effective stat:** The resolved value after applying level and allocation multipliers.

## Implementation Notes
### Critical Details
- All level/stat scaling uses 1.1× (STAT_LEVEL_FACTOR) instead of the old prototype's
  2× — this is intentional and documented in the problem statement.
- `addXp` loops to handle multiple level-ups from a single award.
- Defense uses a different formula (additive flat reduction) than HP/attack (multiplicative).
- `SKILL_POINTS_PER_LEVEL = 2` — two points per level-up for meaningful per-level choices.

## Change History
- **2026-03-25:** Created — clean port of the old prototype's upgrade system with 1.1× scaling.
