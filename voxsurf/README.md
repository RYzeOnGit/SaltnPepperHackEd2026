# VoxSurf 🎙️👁️

A voice-first Chrome extension for fully hands-free web browsing using voice commands + eye tracking as a mouse replacement, powered by OpenAI for intelligent command understanding and page reasoning.

## Features

- **Voice Commands**: Natural language commands powered by OpenAI GPT-4o
- **Eye Tracking**: Gaze-based highlighting and interaction using MediaPipe FaceMesh
- **Head Gestures**: Head pose-driven cursor movement
- **Wink Clicks**: Left/right eye winks for mouse clicks
- **AI-Powered Understanding**: Context-aware command interpretation
- **Page Intelligence**: Automatic page analysis and summarization
- **Reader Mode**: Text-to-speech for hands-free reading
- **Customizable**: Extensive settings for sensitivity, colors, and behavior

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
4. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Setup

1. Open the extension popup
2. Navigate to the "Voice" tab
3. Enter your OpenAI API key (required for AI features)
4. Configure eye tracking settings in the "Eyes" tab
5. Calibrate eye tracking using the "Start Calibration" button

## Usage

### Voice Commands

- **Navigation**: "go back", "reload", "open new tab"
- **Interaction**: "click that", "read this", "scroll down"
- **AI Commands**: "what's on this page", "summarize this", "fill this form"
- **Control**: "sleep", "wake up", "pause reading"

### Eye Tracking

- Look at elements to highlight them
- Wink with left eye for left click
- Wink with right eye for right click
- Dwell on elements for 1.2s for precision click

## Tech Stack

- Chrome Extension Manifest V3
- React 18 + Vite
- @crxjs/vite-plugin
- Tailwind CSS
- MediaPipe FaceMesh (via CDN)
- OpenAI GPT-4o API
- Mozilla Readability.js (via CDN)
- Web Speech API

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build
```

## License

MIT
