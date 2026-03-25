/**
 * save.ts
 * Handles serializing/deserializing game state to/from localStorage,
 * and provides export-to-file and import-from-file helpers for the save menu.
 */

import { PlayerStats, createDefaultStats } from './upgrades';

/** Shape of the saved game data. Extend this as the game grows. */
export interface SaveData {
  version: number;          // Schema version — bump when the shape changes
  timestamp: number;        // Unix epoch ms when the save was written
  playerName: string;       // Defaults to 'Player'; not yet surfaced in gameplay
  completedLevels: string[]; // IDs of levels the player has completed
  /**
   * Player stat record — level, XP, skill points and allocations.
   * Absent in schema version 1 saves; filled with defaults on load.
   */
  playerStats: PlayerStats;
}

/** The localStorage key under which the save is stored. */
const SAVE_KEY = 'linebound_save';

/** Current schema version — increment if SaveData shape ever changes. */
const SAVE_VERSION = 2;

/**
 * Creates a fresh, default SaveData object.
 * Used when no prior save exists.
 */
export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    playerName: 'Player',
    completedLevels: [],
    playerStats: createDefaultStats(),
  };
}

/**
 * Loads and parses the save from localStorage.
 * Returns null if nothing is stored or if the stored JSON is malformed.
 * Migrates version 1 saves (no playerStats) by adding default stats.
 */
export function loadSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SaveData;
    // Basic version check — in future we can add migration logic here
    if (typeof parsed.version !== 'number') return null;

    // Migrate v1 → v2: backfill playerStats if absent
    if (!parsed.playerStats) {
      parsed.playerStats = createDefaultStats();
    }

    return parsed;
  } catch {
    console.warn('[save] Failed to parse saved data; starting fresh.');
    return null;
  }
}

/**
 * Writes the given SaveData to localStorage.
 * Always stamps a fresh timestamp before saving.
 */
export function persistSave(data: SaveData): void {
  const toWrite: SaveData = { ...data, timestamp: Date.now() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(toWrite));
}

/**
 * Triggers a browser download of the current save as a JSON file.
 * Safe to call even when there is no save yet (downloads a default save).
 */
export function exportSave(): void {
  const data = loadSave() ?? createDefaultSave();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor, click it, then clean up
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `linebound_save_${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Opens a file picker and imports a JSON save file.
 * Calls onSuccess(data) if the file is valid, or onError(message) on failure.
 *
 * @param onSuccess - Called with the parsed SaveData on success
 * @param onError   - Called with an error message string on failure
 */
export function importSave(
  onSuccess: (data: SaveData) => void,
  onError: (msg: string) => void,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result;
        if (typeof raw !== 'string') throw new Error('Unexpected file content type');

        const parsed = JSON.parse(raw) as SaveData;
        if (typeof parsed.version !== 'number') {
          throw new Error('Invalid save file: missing version field');
        }

        // Persist the imported save so it survives a page refresh
        persistSave(parsed);
        onSuccess(parsed);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Unknown error reading save file');
      }
    };
    reader.readAsText(file);
  });

  input.click();
}
