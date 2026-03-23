# Save Files

This directory is used by the game at runtime to store the autosave payload
(`savegame.json`). The browser build falls back to `localStorage`, while
desktop shells that expose `fs` write directly to this folder.
