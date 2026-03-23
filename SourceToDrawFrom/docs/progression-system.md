# Progression & Difficulty Framework

This document outlines the planned progression loop for Legend of Stick RPG, covering baseline stats, level scaling, and how players grow their characters through map clears and skill investments.

## Base Combat Stats

| Entity  | Hit Points | Attack | Defense |
|---------|------------|--------|---------|
| Player  | 50         | 1      | 1       |
| Enemy   | 10         | 5      | 2       |

- **Attack** drives the raw damage dealt by weapons before mitigation.
- **Defense** reduces incoming damage by a random value between `0` and the defender's defense rating (inclusive) on every hit.
- **Hit points** are maximum health; death occurs when the value reaches zero.

## Enemy Scaling Across the Map

Maps are broken into sequential screens (for example, `1-1`, `1-2`, `1-3`, ...). Each screen raises the challenge by applying a multiplicative level modifier to every enemy stat:

- Level `n` applies a `×n` multiplier to enemy hit points, attack, and defense.
- Example: a level three (`1-3`) encounter creates enemies with `30` HP, `15` attack, and `6` defense.

This predictable scaling ensures that difficulty ramps consistently while preserving the relative strengths of different enemy archetypes.

## Player Progression Without XP

Experience points are temporarily removed from the loop. Instead, player power increases are tied to beating the mini-boss or boss that anchors the final screen of each map segment.

- Defeating the map's climactic encounter grants a **special drop**.
- Picking up the drop immediately increases the player's level and awards **three skill points**.
- The player's level acts purely as a record of how many of these drops they have claimed.

## Skill Points & World Tree Upgrades

Skill points are spent at the **World Tree's skill tomb**. Each point unlocks one tier of a permanent, global multiplier for a specific stat:

- Spending a point on **Attack** sets the player's attack multiplier to `×2`. Additional points continue to stack additively: the second point becomes `×3`, the third `×4`, and so on.
- The same additive progression applies independently to **Defense** and **Maximum Health** multipliers.
- These multipliers affect every relevant source: all equipped weapons benefit from the attack multiplier, armor contributes via the defense multiplier, and total hit points (base plus gear) scale with the health multiplier.

Because the multipliers scale additively with each skill point, players must decide how to balance their offensive, defensive, and survivability investments as they advance through the World Tree.
