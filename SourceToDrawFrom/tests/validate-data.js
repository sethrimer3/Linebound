const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.join(__dirname, '..');
const context = { console };
vm.createContext(context);

function loadScript(relPath) {
  const code = fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

loadScript('js/projectiles.js');
loadScript('js/weapons.js');
loadScript('js/levels.js');

let levelDefinitions = [];
if (typeof context.initializeLevelDefinitions === 'function') {
  try {
    const defs = context.initializeLevelDefinitions();
    if (Array.isArray(defs)) {
      levelDefinitions = defs;
    }
  } catch (err) {
    throw err;
  }
}

if (!levelDefinitions.length && Array.isArray(context.LEVEL_DEFS)) {
  levelDefinitions = context.LEVEL_DEFS;
}

if (typeof context.loadLevelDefinitions === 'function') {
  const maybePromise = context.loadLevelDefinitions();
  if (Array.isArray(maybePromise) && !levelDefinitions.length) {
    levelDefinitions = maybePromise;
  } else if (!levelDefinitions.length && Array.isArray(context.LEVEL_DEFS)) {
    levelDefinitions = context.LEVEL_DEFS;
  }
  if (maybePromise && typeof maybePromise.then === 'function') {
    maybePromise.catch((err) => {
      throw err;
    });
  }
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

test('ranged weapons reference defined projectiles', () => {
  const weapons = context.WEAPONS || {};
  const projectiles = context.PROJECTILES || {};
  Object.entries(weapons).forEach(([weaponKey, weapon]) => {
    if (!weapon.projectile) {
      return;
    }
    assert(
        Object.prototype.hasOwnProperty.call(projectiles, weapon.projectile),
        `Weapon "${weaponKey}" references missing projectile "${weapon.projectile}"`
    );
  });
});

test('projectiles used by weapons expose base speed data', () => {
  const weapons = context.WEAPONS || {};
  const projectiles = context.PROJECTILES || {};
  Object.values(weapons)
      .filter((weapon) => weapon.projectile)
      .forEach((weapon) => {
        const projectile = projectiles[weapon.projectile];
        assert(
            projectile.speed || projectile.speedRange,
            `Projectile "${weapon.projectile}" should define speed or speedRange`
        );
      });
});

test('level screens provide layouts with consistent dimensions', () => {
  assert(levelDefinitions.length > 0, 'No level definitions loaded');
  levelDefinitions.forEach((def) => {
    const fallbackLayout = def.layout || {};
    const fallbackTiles = fallbackLayout.tiles || [];
    const fallbackCols = fallbackLayout.cols || ((fallbackTiles[0] || '').length);
    const fallbackRows = fallbackLayout.rows || fallbackTiles.length;
    (def.screens || []).forEach((screen, index) => {
      const layout = screen.layout || fallbackLayout;
      assert(layout, `Screen ${index} of ${def.id || def.sourceFile || 'unknown'} is missing a layout and stage has none`);
      const tiles = layout.tiles || [];
      const rows = layout.rows || tiles.length || fallbackRows;
      const cols = layout.cols || ((tiles[0] || '').length) || fallbackCols;
      assert(Array.isArray(tiles) && tiles.length === rows,
          `Layout tiles length mismatch in ${def.id || def.sourceFile || 'unknown'} screen ${index}`);
      tiles.forEach((row, rowIndex) => {
        assert(
            typeof row === 'string' && row.length === cols,
            `Layout row ${rowIndex} in ${def.id || def.sourceFile || 'unknown'} screen ${index} expected length ${cols}`
        );
      });
    });
  });
});

let failures = 0;

tests.forEach(({ name, fn }) => {
  try {
    fn();
    console.log(`\u2705 ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`\u274c ${name}`);
    console.error(`    ${err.message}`);
  }
});

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`\nAll ${tests.length} tests passed.`);
}
