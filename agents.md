# Agents Documentation Guidelines

## Build Information

**Current Build Number: 2**

> **IMPORTANT:** With each pull request, you must increment the build number by one in **THREE** places:
>
> 1. Update the build number in this file (`agents.md`) — the `**Current Build Number:**` line above
> 2. Update the `<meta name="build" content="N">` tag in `index.html`
> 3. Update the visible `<div id="build-badge">build N</div>` text in `index.html`
>
> All three values must always stay in sync. The build badge is rendered in the top-left corner of every screen so players and developers can easily identify which version is running.

---

## About This Repository

**Linebound** is an HTML and JavaScript Stickman RPG game built from scratch. The core concept:

- Stickmen can be outfitted with weapons and will **auto-move forward**.
- The **player swipes** to make stickmen change direction, jump, or trigger abilities.
- Planned abilities include things like a **grapple-hook**, and more advanced skills as the game grows.
- The game targets mobile-friendly browser play with touch/swipe input at its core.

### ⚠️ SourceToDrawFrom — Reference Only

The `SourceToDrawFrom/` folder contains an **old prototype repository** for this game concept. It is kept here as a **reference and resource only**.

- **Do NOT use it directly** or copy-paste code from it without careful review and adaptation.
- It is a prototype — its architecture, patterns, and code quality may not match the direction of Linebound.
- Treat it like a design document or sketchbook: look at it for ideas and understanding, but build Linebound cleanly from scratch.

---

## Purpose

This document provides guidelines for AI agents working with the Linebound codebase. Following these guidelines ensures code quality, maintainability, and effective collaboration between agents and developers.

---

## Core Principles

### 1. Code Comments

Leave comments on every reasonable chunk of code explaining what it does.

- Add comments for complex logic, algorithms, or non-obvious behavior
- Document function purposes, parameters, and return values
- Explain **WHY** code does something, not just **WHAT** it does
- Use inline comments for tricky sections within functions
- Keep comments up-to-date when code changes

**Good Examples:**

```js
// Apply swipe velocity to stickman based on normalized swipe direction and magnitude
const swipeForce = swipeDir.normalize().scale(swipeMagnitude * SWIPE_FORCE_MULTIPLIER);
stickman.applyForce(swipeForce);

/**
 * Updates the stickman's position and handles terrain collision.
 * Moves the character forward automatically; swipe input modifies trajectory.
 * @param {Stickman} stickman - The character to update
 * @param {number} dt - Delta time in seconds since last frame
 */
function updateStickman(stickman, dt) { ... }
```

**Avoid:**

```js
// Bad: States the obvious
let x = 5; // Set x to 5

// Bad: Redundant
function getStickman() { ... } // Gets stickman
```

---

### 2. Report Unused Code

Identify and report unused sections of code or features.

When you encounter code that appears to be:

- Unused functions or variables
- Dead code paths
- Commented-out code blocks
- Deprecated features still in the codebase
- Redundant implementations

**Action:** Document findings in the corresponding `.agents-codex` file under a "Potential Issues" or "Unused Code" section. Include:

- Location (file and line numbers)
- Description of the unused code
- Reason why it appears unused
- Recommendation (remove, refactor, or investigate further)

**Example:**

```markdown
## Potential Issues

### Unused Code
- **Location:** `js/stickman.js:200-220`
- **Description:** `oldGrappleHookDraft()` function
- **Reason:** Superseded by the new `abilities.js` implementation; no references found
- **Recommendation:** Remove after confirming with team
```

---

### 3. Update Codex Files

Update the associated agents codex file whenever you make changes.

Whenever you modify a file:

- Update the corresponding `.agents-codex/<filename>.md` file
- Document what changed and why
- Update dependencies if new imports or script tags were added
- Add any new terminology or concepts
- Note any breaking changes or migration needs

---

## Agents Codex System

### Directory Structure

All codex files are stored in the `.agents-codex/` directory, mirroring the source structure:

```
.agents-codex/
├── js/
│   ├── main.js.md
│   ├── stickman.js.md
│   ├── physics.js.md
│   ├── input.js.md
│   ├── abilities.js.md
│   └── ...
├── css/
│   └── style.css.md
└── index.html.md
```

### Codex File Format

Each codex file should follow this structure:

```markdown
# [Filename]

## Purpose
Brief description of what this file does and its role in the project.

## Dependencies
### Imports / Script Dependencies
- List of files this file depends on
- External libraries used

### Used By
- List of files or systems that rely on this file

## Key Components
### [Component/Function Name]
- **Purpose:** What it does
- **Parameters:** If applicable
- **Returns:** If applicable
- **Notes:** Important implementation details

## Terminology
- **Term:** Definition specific to this file's context

## Implementation Notes
### Critical Details
- Important algorithms or patterns used
- Performance considerations
- Edge cases handled

### Known Issues
- Current bugs or limitations
- Workarounds in place

## Future Changes
### Planned
- Features or refactors planned for this file

### Needed
- Improvements identified by agents or developers

## Change History
- **[Date]:** Description of significant changes made

## Watch Out For
- Common pitfalls when editing this file
- Areas requiring extra care
- Security considerations
```

---

## Best Practices

### When Adding New Code
- Follow the [Code Style](#code-style) standards defined below
- Add appropriate comments as you code
- Create or update the codex file
- Document any new terminology
- Note any new dependencies added or script order changes in `index.html`

### When Reviewing Code
- Check for unused imports, functions, or variables
- Verify comments are accurate and helpful
- Update codex files with new information
- Flag code smells or improvement opportunities

### When Debugging
- Document the issue in the relevant codex file
- Add comments explaining the fix
- Note edge cases discovered
- Update the "Watch Out For" section in the codex

### When Refactoring
- Update all affected codex files
- Note breaking changes
- Update dependency lists
- Document migration path if needed

---

## Code Style

Maintain these standards consistently across all JavaScript and HTML files:

- **Indentation:** Two spaces (no tabs)
- **Semicolons:** Always use trailing semicolons
- **Variable declarations:** Prefer `const`/`let`; avoid `var`
- **String literals:** Use template literals `` ` ` `` for string assembly with dynamic content; use single quotes for plain strings
- **Function size:** Keep functions under **~60 lines of executable code** (not counting blank lines, comments, or closing braces). If a function grows beyond this, consider breaking it into smaller, well-named helpers
- **Side effects:** Write pure helper functions where possible; keep side effects localized and clearly documented
- **Data structures:** Favor object literals for configuration data (weapons, abilities, levels); document each key inline with comments
- **DOM manipulation:** Cache DOM references outside hot paths; avoid repeated `querySelector` calls inside the render loop
- **Input sanitization:** Sanitize any user-supplied or external data before injecting it into the DOM

---

## File-Specific Guidelines

### JavaScript Files
- Use JSDoc comments for functions
- Document complex type expectations and data shapes in comments
- Explain any non-obvious algorithmic choices (physics, collision, AI)
- Note any global variables introduced and where they're consumed
- Keep functions under ~60 lines of **executable code** (see [Code Style](#code-style)); refactor into smaller helpers if they grow larger

### HTML (`index.html`)
- Scripts are loaded sequentially with shared globals — **maintain load order**
- Add new scripts at the appropriate section (utilities → physics → gameplay data → entities → UI → orchestration)
- Comment each script tag or section group so its role is clear

### CSS Files
- Comment the purpose of non-obvious selectors or rules
- Group related styles together with section comments

### Configuration / Data Files
- Explain each key's purpose inline with comments
- Document expected value types and ranges

---

## Game Architecture Guidelines

### Input (Swipe / Touch)
- All player input is swipe/touch-based — keep input handling in a dedicated `input.js` module
- Swipe detection should compute direction and magnitude and expose them cleanly to gameplay systems
- Avoid hardcoding swipe thresholds in gameplay code; define them as named constants

### Stickman Characters
- Stickmen auto-move forward; lateral direction, jumps, and abilities are player-triggered via swipe
- Keep character state (position, velocity, equipped weapon, health) encapsulated per-character
- Weapon equip/unequip logic should live in a dedicated module and not bleed into rendering or physics

### Abilities
- Planned abilities include grapple-hook and more — design the ability system to be extensible from the start
- Each ability should be a self-contained data/behavior entry (similar to weapons) and registered in an ability registry
- Ability cooldowns, trigger conditions, and effects should be clearly documented in codex files

### Physics
- Use a simple, deterministic update loop (verlet or Euler integration)
- Avoid allocations inside the per-frame loop (reuse vectors, avoid `new` in hot paths)
- Document any physics constants (gravity, friction, bounce) and where they live

---

## Security Considerations

When working with code:

- Flag any hardcoded credentials or secrets
- Note authentication/authorization logic if added
- Document input validation and sanitization (especially for any user-saved data or level imports)
- Report potential security vulnerabilities

---

## Performance Considerations

- Document performance-critical sections (render loop, physics update, collision detection)
- Note optimization opportunities
- Avoid unnecessary DOM queries per frame — cache references
- Report potential bottlenecks

---

## Testing Requirements

- Note which code lacks test coverage
- Document test coverage gaps
- Suggest test cases for complex logic (physics edge cases, ability interactions)
- Update codex when test requirements change
- For manual testing: run a local server (`npx serve` or `python -m http.server`) and exercise affected mechanics; watch the browser console for errors

---

## Communication

When documenting in codex files:

- Be clear and concise
- Use examples when helpful
- Keep information current
- Don't duplicate information already in code comments
- Focus on context and reasoning

---

## Maintenance

- Review and update codex files regularly
- Remove outdated information
- Consolidate related notes
- Keep consistent formatting

---

## Questions?

If you're unsure about:

- Whether code is unused
- How to document something
- What level of detail to include

**Default to including it.** More documentation is better than less, as long as it's accurate and useful.

---

*Remember: The goal is to make the Linebound codebase easier to understand, maintain, and improve for both AI agents and human developers. Your documentation efforts directly contribute to the project's long-term success.*
