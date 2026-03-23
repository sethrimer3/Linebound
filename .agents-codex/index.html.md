# index.html

## Purpose
Root HTML entry point for the Linebound game. Loaded directly by the browser
(and served by GitHub Pages). Defines the two scenes (main menu and game) and
loads the compiled TypeScript bundle.

## Dependencies
### Script Dependencies
- `dist/bundle.js` — esbuild output; compiled from `src/main.ts` (and its imports)

### Stylesheet Dependencies
- `css/style.css` — all game and menu styles

### Used By
- GitHub Pages (served as the default page at the site root)
- Local development (`npx serve .` or `python -m http.server`)

## Key Components

### `<meta name="build">`
Tracks the current build number. Must be updated (along with `agents.md` and
the `#build-badge` div) every time an AI agent submits a PR.

### `#build-badge`
A fixed `<div>` rendered in the top-left corner of every screen showing the
current build number. Styled via `#build-badge` in `css/style.css`. Has
`aria-hidden="true"` because it carries no semantic meaning for screen readers.

### `#scene-menu`
Contains the main menu: title, four action buttons, and a status message area.
Hidden/shown by `src/menu.ts`.

### `#scene-game`
Contains a `<canvas>` for rendering the game world, plus a "Back to Menu"
overlay button. Hidden/shown by `src/game.ts`.

## Terminology
- **scene** — A full-viewport `<section>` that represents one UI state
  (menu or game). Only one scene is visible at a time.

## Implementation Notes
### Critical Details
- Scene transitions are handled purely in JS/TS via `.hidden` class toggling;
  no page reloads occur.
- Script order: CSS loads first; `dist/bundle.js` loads at the end of `<body>`
  so the DOM is ready before any TS code runs.

### Known Issues
- None at this time.

## Future Changes
### Planned
- Add a Settings scene/overlay
- Add a loading screen while the bundle is fetching on slow connections

### Needed
- Consider adding a `<noscript>` fallback message

## Change History
- **2026-03-23 (build 2):** Created initial HTML structure with main menu and
  game scene stubs; added build badge; wired to TypeScript bundle.

## Watch Out For
- All three build-number locations (`agents.md`, `<meta name="build">`,
  `#build-badge`) must be kept in sync on every PR.
- `dist/bundle.js` must be committed (or built by CI) before the page works.
  Do not reference `src/` TypeScript files directly from HTML.
