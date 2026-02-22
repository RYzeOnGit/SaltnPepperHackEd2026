# VoxSurf Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Google Chrome browser

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd voxsurf
   npm install
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```
   This will create a `dist` folder with the compiled extension.
   In WSL, this also auto-syncs `dist` to Windows at:
   - Default: `/mnt/c/Users/<detected-user>/Desktop/voxsurf-dist`
   - Override with env var: `VOXSURF_WINDOWS_DIST_DIR=/mnt/c/Users/<you>/...`

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the voxsurf directory

4. **Configure the Extension**
   - Click the VoxSurf extension icon in Chrome toolbar
   - Go to the "Hands" tab
   - Set hand sensitivity
   - Click "Start Hand Calibration"

## Development Mode

For development with hot reload:

```bash
npm run dev
```

Then load the extension from the `dist` folder (it will auto-reload on changes).

## Features to Test

1. **Point + Click**
   - Point with index finger to move cursor
   - Pinch thumb+index to click

2. **Smooth Scrolling**
   - Use two fingers (V shape) to scroll
   - Make a fist and move up/down for grab-scroll

3. **YouTube Controls**
   - Pinch to toggle play/pause
   - Two-finger left/right to seek ±10s
   - Two-finger up/down for volume
   - Palm to mute/unmute

4. **Dino Controls**
   - Open a Dino web version (e.g. chromedino.com)
   - Pinch to jump, fist-hold to duck, thumbs-up to restart

5. **Instagram Reels**
   - Open instagram.com/reels
   - Use two-finger up/down to move between reels
   - Pinch to pause/play current reel

6. **Tab Switching**
   - `Alt+Shift+L` for next tab
   - `Alt+Shift+H` for previous tab

## Troubleshooting

- **Camera not working**: Ensure camera permissions are granted in Chrome settings
- **Tracking inaccurate**: Recalibrate with "Start Hand Calibration"
- **Tab switching shortcut not working**: Click once on page background and retry `Alt+Shift+L/H`
- **Dino not responding**: Click inside the game canvas once to focus input

## Notes

- The extension requires camera access for hand tracking
- The extension does not use microphone or voice command input in this mode
- All settings are stored in Chrome's sync storage
