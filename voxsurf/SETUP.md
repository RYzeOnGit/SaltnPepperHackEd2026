# VoxSurf Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Google Chrome browser
- OpenAI API key (for AI features)

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

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from the voxsurf directory

4. **Configure the Extension**
   - Click the VoxSurf extension icon in Chrome toolbar
   - Go to the "Voice" tab
   - Enter your OpenAI API key
   - Go to the "Eyes" tab
   - Click "Start Calibration" to calibrate eye tracking

## Development Mode

For development with hot reload:

```bash
npm run dev
```

Then load the extension from the `dist` folder (it will auto-reload on changes).

## Features to Test

1. **Voice Commands**
   - Say "scroll down" or "scroll up"
   - Say "go back" or "reload"
   - Say "click that" while looking at an element
   - Say "read this" while looking at text

2. **Eye Tracking**
   - Look at different elements to see highlights
   - Wink with left eye for left click
   - Wink with right eye for right click

3. **AI Features**
   - Say "what's on this page" for page analysis
   - Say "summarize this" while looking at content
   - Say "fill this form" on form pages

## Troubleshooting

- **Camera not working**: Ensure camera permissions are granted in Chrome settings
- **Voice not working**: Check microphone permissions and ensure Web Speech API is supported
- **AI commands failing**: Verify OpenAI API key is correct and has credits
- **Eye tracking inaccurate**: Recalibrate using the "Start Calibration" button

## Notes

- The extension requires camera access for eye tracking
- The extension requires microphone access for voice commands
- OpenAI API calls are made directly from your browser (your API key is stored locally)
- All settings are stored in Chrome's sync storage
