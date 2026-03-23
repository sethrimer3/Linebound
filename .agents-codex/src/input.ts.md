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
- jump, swipeLeft, swipeRight, touching, touchX, touchY

### bindInput(canvas) / unbindInput()
- Attaches/removes touch, mouse, and keyboard listeners

### pollKeyboard()
- Maps held keys (WASD/arrows/space) into InputState flags

## Implementation Notes
- Swipe detection uses start/end position + timing
- Tap (< 10px movement) triggers jump
- SWIPE_THRESHOLD = 30px, SWIPE_MAX_DURATION = 400ms

## Change History
- **Build 3:** Initial implementation
