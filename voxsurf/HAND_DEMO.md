# VoxSurf Hand Gesture Demo Script

## 1. Pre-demo setup

1. Build and sync:
   ```bash
   cd voxsurf
   npm run build
   ```
2. In Chrome, load unpacked extension from your synced folder (`C:\Users\ryanc\meow`).
3. Open the VoxSurf popup:
   - Turn on `Hand Mode`
   - Open `Hands` tab
   - Set sensitivity around `1.1x` to `1.3x`
   - Run `Start Hand Calibration`
4. In popup `Home` tab, verify:
   - `Hand Tracking: Active`
   - Context mode updates when changing websites

## 2. Gesture legend used in demo

- `Point (index finger)` -> move cursor
- `Pinch (thumb + index)`:
  - Browser: click
  - YouTube: play/pause
  - YouTube Shorts: mouse-style click at cursor
  - Dino: jump
- `Fist`:
  - Browser: smooth scroll up/down by moving hand vertically
- `Two-finger up/down`:
  - YouTube: seek/volume control gesture
- `Two-finger up`:
  - YouTube Shorts: next short (scroll down)
- `Thumb + pinky out`:
  - YouTube Shorts: previous short
- `Two fingers (index + middle)`:
  - Dino: hold duck
- `Thumbs up`:
  - Dino: restart
- `Palm` (YouTube only) -> mute/unmute
- `Alt+Shift+L` / `Alt+Shift+H` -> next / previous browser tab

## 3. YouTube demo flow (60-90s)

1. Open a YouTube video page.
2. Confirm HUD shows `Mode: YouTube`.
3. Show controls in this order:
   - `Pinch` -> play/pause
   - `Two-finger right` -> seek forward 10s
   - `Two-finger left` -> seek backward 10s
   - `Two-finger up/down` -> volume up/down
   - `Palm` -> mute/unmute
4. Optional: point + pinch on a UI control (captions, settings) to show precision click still works.

## 4. Smooth scrolling demo flow (30-45s)

1. Open a long article or docs page.
2. Confirm HUD shows `Mode: Browser`.
3. Make a `Fist`, then move hand up/down to scroll.
4. Emphasize that scrolling is continuous and inertial (no jerky jumps).
5. Show quick stop by opening hand or switching to point.

## 4.2 YouTube Shorts demo flow (30-45s)

1. Open `youtube.com/shorts`.
2. Confirm HUD shows `Mode: YouTube Shorts`.
3. Point at Shorts controls (play/mute) and `Pinch` to click.
4. Raise `Two-finger up` to move to next short.
5. Show `Thumb + pinky out` to move back to previous short.

## 4.5 Tab switching demo flow (10-20s)

1. Open 3+ tabs in one Chrome window.
2. Stay on a normal site so HUD shows `Mode: Browser`.
3. Press `Alt+Shift+L` to move right and `Alt+Shift+H` to move left.
4. Show tab changes quickly without using the mouse.

## 5. Dino game demo flow (45-60s)

## Important

`chrome://dino` pages do not allow extension content scripts. Use a Dino web version, e.g.:
- `https://chromedino.com/`

Steps:

1. Open Dino web game page.
2. Confirm HUD shows `Mode: Dino`.
3. Start game:
   - `Pinch` -> jump
4. During gameplay:
   - Raise `Two fingers` while obstacle passes to duck (hold = keep ducking)
   - Use quick `Pinch` for each jump
   - Use `Point + hold Pinch (~0.3s)` on game UI buttons to change game modes/options
5. On game over:
   - `Thumbs up` to restart

## 6. Suggested live narration

- "The system auto-detects context: Browser, YouTube, YouTube Shorts, or Dino."
- "On YouTube and YouTube Shorts, the same core gestures map to media-specific controls."
- "For normal pages, fist + vertical motion gives smooth inertial scrolling."
- "For Dino, pinch jumps and two fingers duck-hold, so controls stay simple."

## 7. Troubleshooting before presenting

- If tracking is shaky, rerun hand calibration and lower sensitivity slightly.
- Keep hand centered in camera and avoid backlighting.
- If YouTube mode does not activate, refresh the tab once.
- If Dino controls do not trigger, click inside the game canvas once to focus it.
