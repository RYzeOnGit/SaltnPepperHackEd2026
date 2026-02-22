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
   - Go to the "Home" tab
   - Enable `Voice Agent` if you want wake-word voice commands
   - Paste your OpenAI API key
   - Set wake word (default: `hey vox`)
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
   - Make a fist and move up/down for smooth scrolling

3. **YouTube Controls**
   - Pinch to toggle play/pause
   - Two fingers up (index + middle) to seek forward +10s
   - Thumb + pinky out (shaka) to seek backward -10s
   - Three fingers up (index + middle + ring) for volume up
   - Three fingers down (inverted) for volume down
   - Rock sign (index + pinky up) to toggle fullscreen
   - Palm to mute/unmute

4. **Dino Controls**
   - Open a Dino web version (e.g. chromedino.com)
   - Pinch (thumb + index) to jump
   - Two fingers (index + middle) to duck while held
   - Thumbs-up to restart
   - Point + hold pinch (~0.3s) to click game mode/options UI

5. **YouTube Shorts**
   - Open youtube.com/shorts
   - Point cursor like a mouse
   - Pinch to click wherever the cursor is (mouse-style click)
   - Two fingers up (index + middle) to move to next short (scroll down)
   - Thumb + pinky out (shaka) to move to previous short

6. **Tab Switching**
   - `Alt+Shift+L` for next tab
   - `Alt+Shift+H` for previous tab

7. **Whisper Voice Agent**
   - Use the **Voice** toggle in the popup header for quick on/off
   - Say `hey vox search mrbeast on youtube`
   - Say `hey vox summarize this section`
   - Or `hey vox summarize comments section`
   - If wake word is spoken alone, say the command within ~12 seconds
   - Speech is processed after roughly a 1-second silence gap

## Troubleshooting

- **Camera not working**: Ensure camera permissions are granted in Chrome settings
- **Voice not working**: Enable microphone permission and verify OpenAI key in Home tab
- **Tracking inaccurate**: Recalibrate with "Start Hand Calibration"
- **Tab switching shortcut not working**: Click once on page background and retry `Alt+Shift+L/H`
- **Dino not responding**: Click inside the game canvas once to focus input

## Notes

- The extension requires camera access for hand tracking
- Voice agent uses microphone + OpenAI Whisper when enabled
- All settings are stored in Chrome's sync storage
