# Layout Symbol Coverage

The table below captures which interactive layout objects currently have dedicated symbol glyphs in `js/levels.js` and which rely solely on manual placement without an associated glyph. Counts were produced by scanning the symbol legends and `objects` arrays in the level data, and the references point to representative definitions.

## Objects with layout symbols

* The default legend in `DEFAULT_LAYOUT_SYMBOLS` now ships glyphs for every developer palette interactive and ambience item except the shopkeeper and punching bag. Newly covered objects include torches, glow crystals, lava spouts, treasure chests, sword pedestals, toggle blocks/platforms, damage-gated crumble walls, auric beacons, chrono fields, wind lifts, steam vents, rain fields, star fields, foreground sun rays/shadows, void portals and symbols, rafts, boats, world tree branches, canopy leaves, physics boxes, soft hexagons, firefly jar swarms, and resting sticks. 【F:js/levels.js†L77-L137】
* Existing entries for crates, tufts, sprouts, crumble walls, spawners, chronospheres, water spouts, fluids, skill pedestals, doors, and weapon pickups remain available for quick layout sketching. 【F:js/levels.js†L77-L104】

## Objects without layout symbols

* Shopkeepers and punching bags still rely on manual placement so their bespoke interaction data can be authored explicitly. 【F:js/levels.js†L12386-L12480】
