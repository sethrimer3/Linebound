# STICK-RPG Agent Handbook

Welcome to the Stick Ranger-inspired RPG prototype. This document is the coordination guide for all AI agents working in this repository. It describes the project structure, coding conventions, and the expectations for implementing new features or fixing bugs.

## Project overview

The game is a browser-based physics brawler written in vanilla JavaScript. The `index.html` file loads modular scripts that share a global scope. The main render/update loop lives in `js/main.js`, which orchestrates physics, AI, UI, and developer tooling.

Key high-level systems:

- **Physics core (`js/physics.js`)** – Provides a lightweight verlet-style integrator. `Point`, `Dist`, and `OneWayDist` implement the particle/constraint system used by characters, projectiles, and environmental props.
- **Entity rigging (`js/stickman.js`)** – Defines the playable “stick” characters, their skeleton rigs, animation helpers, combat combos, and weapon handling.
- **World orchestration (`js/main.js`)** – Owns the world object, update/render loops, state machine (`'map'` vs `'level'`), developer panel lifecycle, projectile/particle updates, and HUD refresh.
- **Weapons & projectiles (`js/weapons.js`, `js/projectiles.js`)** – Contain data-driven weapon definitions and projectile behavior factories (speed, lifespan, special effects, AoE, etc.). When adding new weapons/projectiles, keep naming consistent and update both files.
- **Items & drops (`js/items.js`)** – Handles inventory slot contents, drops, pickup logic, and coin/XP rewards.
- **HUD & menus (`js/hud.js`)** – Renders the HUD, drag-and-drop inventory UI, menu overlay, and input delegation for UI interactions.
- **Level data (`js/levels.js`)** – Houses stage layouts, palette definitions, screen-by-screen enemy waves, and boss metadata. Developer-mode exports feed back into these structures.
- **Developer tooling (`js/devtools.js`)** – Manages the editor overlay, layout/enemy editing, serialization, and toggling developer mode from the pause menu.
- **Input shim (`js/input.js`)** – Simple shared state object for keyboard/mouse input.
- **Placeholder enemy logic (`js/enemies.js`)** – Currently minimal. Extend this file when implementing differentiated AI routines.

The `css/` directory controls appearance, and `saves/` stores exported layouts/save data. Everything is shipped as static assets—there is no build step.

## File loading order & globals

Scripts are loaded sequentially in `index.html`. Because the code relies on shared globals instead of modules, maintain load-order assumptions (utilities, physics, gameplay data, entities, UI, then orchestration). When adding a new script, append it in `index.html` at the appropriate section.

## Coding conventions

- Use **two-space indentation** and **trailing semicolons** to match the existing style.
- Prefer `const`/`let`; avoid `var`.
- Write **pure helper functions** where possible; keep side effects localized.
- Favor object literals for configuration data (weapons, projectiles, levels). Document any new keys inline with comments.
- Keep functions small and composable. If a function grows beyond ~60 lines, consider breaking it apart.
- Use template literals for DOM string assembly, and sanitize inputs before injecting dynamic content.
- When modifying physics or rendering code, be mindful of performance in the animation loop. Avoid allocations inside tight per-frame loops.

## Adding or modifying gameplay systems

- **Player/ally changes**: Extend `Stick` methods in `js/stickman.js`. Ensure `Stick.update`, `Stick.draw`, and `Stick.ai` remain deterministic with respect to `dt` and world state.
- **Enemy behavior**: Implement AI helpers in `js/enemies.js` and wire them into the stick factory in `Stick.spawnEnemy` (see `js/stickman.js`). Keep enemy definitions declarative, then reference them in `js/levels.js`.
- **Weapons/projectiles**: Define new entries in `WEAPONS` (`js/weapons.js`) and matching projectile logic in `createProjectile` (`js/projectiles.js`). Handle special effects (AoE, DoT, pulls) centrally to keep behavior consistent.
- **Levels & map**: Update `LEVEL_DEFS` in `js/levels.js`. Each screen can specify `enemies`, `enemyPlacements`, optional `boss`, and a layout override. Run the developer panel (`toggle developer mode` in the pause menu) to author terrain and placements; export JSON and merge into the level data.
- **UI updates**: Adjust HUD/menu rendering in `js/hud.js`. Defer DOM queries to render functions and event delegation set up once (see the guard `world.ui.listenersAttached`).
- **Saving/loading**: Persistence currently uses localStorage (`SAVE_STORAGE_KEY`) and JSON exports. If you add new state, update serialization helpers in `js/main.js` and ensure backward compatibility.

## Testing & verification

Automated tests are not yet wired up. Perform the following checks before committing gameplay changes:

1. `python -m http.server` (or `npx serve`) from the repository root, then browse to `http://localhost:8000/index.html`.
2. Exercise the affected mechanics: combat, inventory drag/drop, developer mode toggles, etc.
3. Watch the browser console for errors or warnings.

Documentation-only edits (such as modifying this file) do not require the manual playtest, but proofread for clarity.

## Code review checklist for agents

Before committing:

- [ ] `git status` is clean except for intentional changes.
- [ ] Manual playtest completed if gameplay/UI code changed.
- [ ] New configuration keys and constants are documented with inline comments.
- [ ] Functions remain under 60 lines or are refactored for readability.
- [ ] No unused globals or dead code left behind.
- [ ] `index.html` script order updated if new files were added.
- [ ] Saved JSON layouts validated by loading them in-game.

## Communication

When opening a PR (via the `make_pr` tool), include:

- **Summary** – High-level overview of the feature/fix.
- **Testing** – Steps taken (include manual playtest description if applicable).
- **Risks/Mitigations** – Call out fragile systems touched (physics, inventory, developer mode, etc.).

Feel free to extend this handbook with new best practices as the project evolves.
