# css/style.css

## Purpose
Main stylesheet for all Linebound UI. Covers the app shell, build badge,
main menu scene, game scene canvas/overlay, and shared utility classes.

## Dependencies
### Imports / Script Dependencies
- None (pure CSS; no `@import` or external fonts)

### Used By
- `index.html` — linked in `<head>`

## Key Components

### CSS Custom Properties (`:root`)
Central design tokens:
- `--color-bg` / `--color-surface` — dark background layers
- `--color-primary` / `--color-primary-dk` — red accent used for title and primary button
- `--color-text` / `--color-text-muted` — foreground text
- `--color-success` / `--color-error` — feedback colours for save actions
- `--font-family`, `--gap-*`, `--radius` — spacing and typography tokens

### `.hidden`
`display: none !important` utility. Applied/removed by JS to show/hide scenes
and status messages.

### `#build-badge`
Fixed-position label in the top-left corner. `pointer-events: none` so it
never intercepts touch/click events.

### `.scene`
`position: absolute; inset: 0` — each scene fills the full viewport. Only one
should be visible at a time (the other has `.hidden`).

### `.menu-btn` / `.menu-btn.primary`
Outlined / filled button variants for the main menu. Hover, focus-visible, and
active states are all styled for keyboard and touch accessibility.

### `#game-canvas`
`position: absolute; inset: 0; width: 100%; height: 100%` — the canvas fills
the game scene. Actual pixel dimensions are set by `src/game.ts`.

## Implementation Notes
### Critical Details
- `user-select: none` on `body` prevents accidental text selection during swipe gestures.
- `overflow: hidden` on `html`/`body` prevents scroll bounce on mobile.
- `clamp()` is used on the menu title font-size to scale smoothly across viewport widths.

### Known Issues
- No dark/light theme toggle yet.

## Future Changes
### Planned
- Settings overlay styles
- HUD styles (health bar, weapon icon, score)
- Mobile-specific touch-target sizing

## Change History
- **2026-03-23 (build 2):** Created initial stylesheet with design tokens, menu,
  and game-scene styles.

## Watch Out For
- Adding `overflow` anywhere inside `#app` can break the full-viewport canvas layout.
- The `.hidden` class uses `!important` — don't fight it with inline styles.
