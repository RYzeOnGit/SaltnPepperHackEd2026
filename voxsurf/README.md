# VoxSurf 🖐️

A hand-gesture Chrome extension for hands-free web browsing using MediaPipe hand tracking.

## Features

- **Hand Cursor**: Move cursor with index finger pointing
- **Pinch Click**: Thumb + index pinch to click
- **Smooth Scroll**: Inertial up/down scroll using 2-finger V gesture
- **Fist Grab Scroll**: Drag-style scrolling with fist motion
- **Navigation Gestures**: Thumbs up and 3-finger swipe for back/forward
- **YouTube Mode**: Pinch play/pause, 2-finger seek/volume, palm mute
- **Instagram Reels Mode**: 2-finger next/prev reel and pinch pause/play
- **Dino Mode**: Pinch jump, fist duck, thumbs-up restart
- **Tab Hotkeys**: `Alt+Shift+L` (next tab), `Alt+Shift+H` (previous tab)
- **Dwell Click**: Hold pointer steady to auto-click
- **Calibration + Sensitivity**: Tune hand control precision

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   In WSL, this also auto-syncs `dist` into Windows:
   - Default target: `/mnt/c/Users/<detected-user>/Desktop/voxsurf-dist`
   - Optional override: set `VOXSURF_WINDOWS_DIST_DIR`
4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Setup

1. Open the extension popup
2. Open the "Hands" tab
3. Tune sensitivity
4. Run hand calibration

## Usage

### Hand Gestures

- Point (index finger) to move cursor
- Pinch (thumb + index) to click
- Two fingers (V) to scroll
- Fist for grab-scroll
- Thumbs up for back
- Three-finger swipe for back/forward
- Hold still for dwell click

### Demo Guide

- Full live-demo script: `HAND_DEMO.md`

## Tech Stack

- Chrome Extension Manifest V3
- React 18 + Vite
- @crxjs/vite-plugin
- Tailwind CSS
- MediaPipe Hand Landmarker

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build
```

## License

MIT
