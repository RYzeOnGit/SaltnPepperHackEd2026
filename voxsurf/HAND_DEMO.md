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
  - Instagram Reels: pause/play current reel
  - Dino: jump
- `Two-finger V`:
  - Browser: smooth inertial vertical scroll
  - YouTube: left/right = seek 10s, up/down = volume
  - Instagram Reels: up/down = next/previous reel
- `Fist` (Dino) -> hold duck
- `Thumbs up`:
  - Dino: restart
- `Palm` (YouTube only) -> mute/unmute
- `Alt+Shift+L` / `Alt+Shift+H` -> next / previous browser tab

## 3. YouTube demo flow (60-90s)

1. Open a YouTube video page.
2. Confirm HUD shows `Mode: YouTube`.
3. Show controls in this order:
   - `Pinch` -> play/pause
   - `Two-finger swipe right` -> seek forward 10s
   - `Two-finger swipe left` -> seek backward 10s
   - `Two-finger up/down` -> volume up/down
   - `Palm` -> mute/unmute
4. Optional: point + pinch on a UI control (captions, settings) to show precision click still works.

## 4. Smooth scrolling demo flow (30-45s)

1. Open a long article or docs page.
2. Confirm HUD shows `Mode: Browser`.
3. Hold `Two-finger V` and move hand gently up/down.
4. Emphasize that scrolling is continuous and inertial (no jerky jumps).
5. Show quick stop by opening palm or switching to point.

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
   - `Pinch` repeatedly for jumps
   - Hold `Fist` while obstacle passes to duck
5. On game over:
   - `Thumbs up` to restart

## 6. Suggested live narration

- "The system auto-detects context: Browser, YouTube, or Dino."
- "On YouTube and Instagram Reels, the same core gestures map to media-specific controls."
- "For normal pages, two-finger movement gives smooth inertial scrolling."
- "For Dino, pinch is jump and fist is hold-duck, so both actions are one-hand and low-latency."

## 7. Troubleshooting before presenting

- If tracking is shaky, rerun hand calibration and lower sensitivity slightly.
- Keep hand centered in camera and avoid backlighting.
- If YouTube mode does not activate, refresh the tab once.
- If Dino controls do not trigger, click inside the game canvas once to focus it.
