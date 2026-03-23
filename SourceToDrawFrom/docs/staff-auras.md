# Staff Aura & Necromancer Summon Notes

This document captures quick reference details for the new staff-based aura system and necromancer summons. It complements inline code comments and helps with future manual verification runs.

## Aura staffs

| Staff | Aura color | Primary effect | Multiplier | Notes |
| ----- | ---------- | -------------- | ---------- | ----- |
| War Chant | Red | Attack | ×1.5 attack | Buff applies to allies (including wielder) while the staff is sustained. |
| Bulwark | Blue | Defense | ×1.5 defense | Designed for defensive lineups; stacks multiplicatively with other sources. |
| Verdant | Green | Health | ×2 max HP | Health scaling recalculates current HP proportionally to prevent sudden drops. |
| Gravebind | Purple/Green | Necromancy | Raises temporary zombies | Enemies that die inside the aura spawn stickman zombies for 15s. |

* Aura range defaults to the gem tip of the staff and follows the wielder’s aim.
* Swirl effects animate slowly to keep the visual footprint subtle when multiple staffs overlap.
* Aura persistence ticks every ~0.26s to prevent flicker if the wielder briefly stops channeling.

## Necromancer zombies

* Spawn with necrotic claws (`necromancerZombieClaws`) and inherit the owner’s team alignment.
* Deal necrotic melee damage and despawn 15 seconds after creation.
* On spawn they recalculate base stats so additional auras/equipment can adjust them in real time.

## Suggested manual regression checks

1. Equip each staff on separate sticks and confirm overlapping auras stack multiplicatively.
2. Move enemies into the Gravebind aura, defeat them, and verify that zombies inherit ally status and expire after 15 seconds.
3. Toggle the staff beam off and ensure existing buffs decay gracefully after ~0.26s.
4. Watch the health bar while entering/leaving the Verdant aura to confirm proportional HP adjustments.
