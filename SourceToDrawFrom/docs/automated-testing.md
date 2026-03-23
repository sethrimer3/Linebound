# Automated data validation suite

An automated test suite is a collection of scripts that run without manual
interaction to verify that the game data and code behave as expected. Instead
of loading the game in a browser and clicking through scenarios, the automated
suite executes programmatic checks and reports any failures. This helps catch
regressions early and gives quick feedback when adding new content.

## What is included

The first automated suite for this project focuses on validating weapon and
projectile data:

- **Ranged weapons reference defined projectiles.** Every weapon that declares
a `projectile` field must point to an entry that exists in `PROJECTILES`.
- **Projectiles referenced by weapons expose speed information.** Ensures each
projectile used by a weapon defines either `speed` or `speedRange`, which keeps
the firing logic consistent.

These checks live in `tests/validate-data.js`. The script loads the existing
data files inside a sandbox and runs the assertions above.

## How to run the suite

1. Install Node.js 16 or newer (already available in the development container).
2. From the repository root, execute:

   ```bash
   npm test
   ```

3. Review the console output. Passing tests are marked with `✅` while failures
   are marked with `❌` along with an explanatory message.

You can extend the suite by adding new `test` calls inside
`tests/validate-data.js` or by creating additional scripts and wiring them into
the `npm test` command.
