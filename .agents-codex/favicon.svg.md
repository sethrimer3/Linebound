# favicon.svg

## Purpose
Defines the browser tab/site icon for Linebound as a compact SVG asset. The
icon depicts a white stickman in a ready stance on a black background holding
a light-brown sword to match the game's stickman combat identity.

## Dependencies
### Imports / Script Dependencies
- None (static SVG file)

### Used By
- `index.html` via `<link rel="icon" type="image/svg+xml" href="favicon.svg">`

## Key Components
### Black background rectangle
- **Purpose:** Provides strong contrast for the silhouette and sword.

### White stickman primitives
- **Purpose:** Uses simple circle/line shapes to draw head, torso, arms, and
  legs in a readable low-detail icon style.

### Light-brown sword + darker hilt
- **Purpose:** Communicates combat role while staying legible at favicon size.

## Terminology
- **favicon:** A small icon shown in browser tabs, bookmarks, and app shortcuts.

## Implementation Notes
### Critical Details
- Uses `viewBox="0 0 64 64"` for clean scaling at common favicon dimensions.
- Uses high-contrast colors so the design remains visible at 16x16 and 32x32.

### Known Issues
- Extremely small render sizes may simplify/alias line details differently
  across browser engines.

## Future Changes
### Planned
- None.

### Needed
- If a PNG/ICO fallback is required for legacy environments, export from this
  SVG and add alternate icon links in `index.html`.

## Change History
- **2026-04-05 (build 8):** Added initial favicon artwork.

## Watch Out For
- Keep the icon palette consistent with the requested design (white stickman,
  black background, light-brown sword).
