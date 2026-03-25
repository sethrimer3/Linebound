# src/save.ts

## Purpose
Handles all save-game functionality: in-memory schema definition, reading from
and writing to `localStorage`, exporting to a JSON file, and importing from a
user-selected JSON file.

## Dependencies
### Imports
- `upgrades.ts` — `PlayerStats`, `createDefaultStats` for `SaveData.playerStats`

### Used By
- `src/menu.ts` — `exportSave`, `importSave`, `SaveData`
- `src/main.ts` — `loadSave`, `createDefaultSave`, `persistSave`

## Key Components

### `SaveData` (exported interface)
The canonical shape of the save object.
```ts
interface SaveData {
  version: number;          // Schema version (currently 2)
  timestamp: number;        // Unix epoch ms
  playerName: string;       // Defaults to 'Player'
  completedLevels: string[]; // IDs of completed levels
  playerStats: PlayerStats; // Level, XP, skill points and allocations
}
```
Increment `SAVE_VERSION` and add migration logic in `loadSave()` whenever this
shape changes.

### `createDefaultSave()`
Returns a fresh `SaveData` with `version: 2`, current timestamp, empty
`completedLevels`, and default `playerStats` (from `upgrades.ts`).

### `loadSave()`
Reads and parses from `localStorage[SAVE_KEY]`. Returns `null` on missing data
or parse failure (logs a warning). Does NOT throw. Migrates v1 saves by
backfilling a default `playerStats` if the field is absent.

### `persistSave(data)`
Stamps a new `timestamp` and writes to `localStorage`. Called on every state
change that should be persisted.

### `exportSave()`
Creates an `application/json` Blob from the current save, creates an object URL,
programmatically clicks a temporary `<a>` element to trigger a download, then
revokes the URL.

### `importSave(onSuccess, onError)`
Opens a `<input type="file">` picker. On selection, reads the file as text,
parses it, validates the `version` field, persists it, and calls `onSuccess`.
Calls `onError` on any failure.

## Terminology
- **SAVE_KEY** — the `localStorage` key: `'linebound_save'`
- **SAVE_VERSION** — the current schema version (integer, starts at 1)

## Implementation Notes
### Critical Details
- All JSON parsing is wrapped in `try/catch` to handle malformed files gracefully.
- `importSave` validates that `parsed.version` is a `number` before accepting.
- Export uses `URL.createObjectURL` + `URL.revokeObjectURL` to avoid memory leaks.

### Known Issues
- No save migration logic yet (only version 1 exists).

## Future Changes
### Planned
- Add migration path when `SAVE_VERSION` > 1
- Store more player progress data (level, equipment, etc.)
- Multiple save slots

## Change History
- **2026-03-25 (build 6):** Bumped schema to `SAVE_VERSION = 2`; added `playerStats: PlayerStats`
  to `SaveData`; updated `createDefaultSave` and `loadSave` (with v1→v2 migration).
- **2026-03-23 (build 2):** Created initial save module with localStorage persistence,
  file export, and file import.

## Watch Out For
- `importSave()` is asynchronous (file read + FileReader). The callbacks are
  called on a microtask, not synchronously.
- Never use `innerHTML` with save data — always use `textContent` or JSON APIs.
