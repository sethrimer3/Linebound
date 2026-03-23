# input.ts

## Purpose
Touch/swipe/keyboard input handler. Normalises all input into an InputState object read each frame.

## Dependencies
### Imports / Script Dependencies
- None (standalone module)

### Used By
- `game.ts` — binds input to canvas, polls each frame

## Key Components
### InputState
- `jump`, `swipeLeft`, `swipeRight`, `touching`, `touchX`, `touchY`
- `crouch` — true while S or ArrowDown is held
- `punch` — true during the frame a mouse click was detected
- `mouseX`, `mouseY` — cursor position (always tracked, even when not clicking)

### bindInput(canvas) / unbindInput()
- Attaches/removes touch, mouse, and keyboard listeners

### pollKeyboard()
- Maps held keys (WASD/arrows/space) into InputState flags
- S / ArrowDown → `state.crouch = true`

## Implementation Notes
- Swipe detection uses start/end position + timing (touch events only)
- Tap (< 10px movement) on touch → jump
- Mouse click (mousedown) → `punch = true` immediately; no jump-on-click for mouse
- `mouseX/Y` are updated on every `mousemove` regardless of click state
- SWIPE_THRESHOLD = 30px, SWIPE_MAX_DURATION = 400ms

## Change History
- **Build 3:** Initial implementation
- **Build 4:** Added `crouch`, `punch`, `mouseX`, `mouseY` fields; mouse click now fires punch; mouse move always tracks cursor
