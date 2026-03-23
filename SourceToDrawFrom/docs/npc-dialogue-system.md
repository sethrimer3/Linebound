# NPC Dialogue System

The World Tree level now supports ambient non-player characters that greet the player with short lines of dialog.
This document captures the knobs available to stage designers when adding new NPC stickfolk.

## Placement authoring

Layout exports can include objects with `"type": "npc"`. During level compilation these entries end up inside `level.npcPlacements`.
Each placement supports the following properties:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | string | auto-generated | Stable identifier used when re-exporting from the editor. |
| `x`, `y` | number | derived from tile placement | World coordinate for the NPC. `y` is optional—if omitted the helper searches for the ground height. |
| `spawnOffsetY` | number | `-40` | Vertical offset applied after the ground height is determined. |
| `screenIndex` | number | `null` | If set, the NPC only spawns on that screen. |
| `lines` | string[] | `['...']` | Dialog lines that loop while the player remains nearby. |
| `talkRadius` | number | `150` | Distance in pixels required to trigger the dialog. |
| `revealSpeed` | number | `56` | Characters revealed per second during the typewriter effect. |
| `holdDuration` | number | `1.8` | Seconds to hold a finished line before advancing. |
| `hatOffset` | number | `26` | Vertical offset for the speech bubble relative to the straw hat. |
| `headColor` | string | `#aee6ff` | Override for the friendly stroke color used for the NPC's head. |
| `brimColor` | string | `'#e1c170'` | Optional override for the straw hat brim color. |
| `bandColor` | string | `'#8f4d1c'` | Optional override for the hat band color. |
| `hatStrokeColor` | string | `'#ba8b3c'` | Optional override for the hat outline color. |
| `facing` | `'left' \| 'right'` | `'right'` | Initial facing direction. |
| `name` | string | `null` | Optional label that renders below the stick during developer hover. |

## Runtime behavior

* NPCs spawn as invulnerable sticks flagged with `isNpc`. They never participate in pickups or combat routines.
* Dialog uses a pixel-style font and fades in/out above the straw hat. Characters appear rapidly while a high-pitched babble effect (`npcBabble`) plays.
* Health and stamina widgets are suppressed for these entities, keeping the HUD focused on the player party.
* NPC bodies respect grass sway exclusion so they do not shake the foliage when idling.

Use these controls to craft ambient world-building moments without touching the combat roster.
