import React from 'react';
import ReactDOM from 'react-dom/client';
import HUD from './components/HUD';
import LabelOverlay from './components/LabelOverlay';
import GazeHighlight from './components/GazeHighlight';
import GazeDot from './components/GazeDot';
import GestureCursor from './components/GestureCursor';
import DwellRing from './components/DwellRing';
import CalibrationOverlay from './components/CalibrationOverlay';
import { useVoice } from './hooks/useVoice';
import { useFaceMesh } from './hooks/useFaceMesh';
import { useGesture } from './hooks/useGesture';
import { useGaze } from './hooks/useGaze';
import { useGazeTarget } from './hooks/useGazeTarget';
import { useOverlay } from './hooks/useOverlay';
import { useAI } from './hooks/useAI';
import { useCommands } from './hooks/useCommands';
import '../styles.css';

function VoxSurfApp() {
  const [settings, setSettings] = React.useState({
    voiceEnabled: true,
    eyeEnabled: true,
    openaiKey: '',
    wakeWord: '',
    sensitivity: 1.0,
    gazeSmoothing: 0.25,
    highlightColor: 'blue',
    showLabels: true,
    showGazeDot: false,
  });

  const [aiStatus, setAiStatus] = React.useState('idle');
  const [lastCommandConfidence, setLastCommandConfidence] = React.useState(null);
  const [lastCommandSuccess, setLastCommandSuccess] = React.useState(null);
  const [isCalibrating, setIsCalibrating] = React.useState(false);
  const [calibrationMode, setCalibrationMode] = React.useState(null);
  const [activeChallenge, setActiveChallenge] = React.useState(null);

  // Shared vision — single camera stream for face (gaze) + hand (gesture)
  const { landmarks, handLandmarks, isTracking } = useFaceMesh(settings.eyeEnabled);

  const voice = useVoice(settings);
  const gesture = useGesture(settings, handLandmarks);   // hand → cursor/scroll/click
  const gaze = useGaze(settings, landmarks);              // face → gaze tracking
  const gazeTarget = useGazeTarget(gaze, settings);
  const overlay = useOverlay(settings);
  const ai = useAI(settings);
  const commands = useCommands(voice, gazeTarget, overlay, settings, ai);

  React.useEffect(() => {
    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      if (result.voxsurfSettings) {
        setSettings((prev) => ({ ...prev, ...result.voxsurfSettings }));
      }
    });

    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATE') {
        setSettings((prev) => ({ ...prev, ...message.settings }));
      } else if (message.type === 'START_CALIBRATION') {
        setCalibrationMode(message.mode || 'gaze');
        setIsCalibrating(true);
      } else if (message.type === 'START_CHALLENGE') {
        setActiveChallenge(message.challengeId);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Listen for AI status updates
    const aiStatusListener = (e) => {
      setAiStatus(e.detail.status);
    };

    // Listen for command execution results
    const commandResultListener = (e) => {
      if (e.detail.confidence !== undefined) {
        setLastCommandConfidence(e.detail.confidence);
      }
      if (e.detail.success !== undefined) {
        setLastCommandSuccess(e.detail.success);
      }
    };

    document.addEventListener('voxsurf:ai-status', aiStatusListener);
    document.addEventListener('voxsurf:command-result', commandResultListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      document.removeEventListener('voxsurf:ai-status', aiStatusListener);
      document.removeEventListener('voxsurf:command-result', commandResultListener);
    };
  }, []);

  if (!settings.voiceEnabled && !settings.eyeEnabled) {
    return null;
  }

  const handleCalibrationComplete = () => {
    if (calibrationMode === 'head' && gesture.startCalibration) {
      gesture.startCalibration();
    } else if (calibrationMode === 'gaze' && gaze.startCalibration) {
      gaze.startCalibration();
    }

    chrome.runtime.sendMessage({
      type: 'CALIBRATION_COMPLETE',
      mode: calibrationMode,
    });

    setIsCalibrating(false);
    setCalibrationMode(null);
    if (voice.speak) {
      voice.speak('Calibration complete');
    }
  };

  const handleCalibrationCancel = () => {
    setIsCalibrating(false);
  };

  return (
    <>
      <HUD
        voice={voice}
        gaze={gaze}
        gazeTarget={gazeTarget}
        commands={commands}
        settings={settings}
        aiStatus={aiStatus}
        lastCommandConfidence={lastCommandConfidence}
        lastCommandSuccess={lastCommandSuccess}
        activeGesture={gesture.activeGesture}
      />
      {isCalibrating && (
        <CalibrationOverlay
          isActive={isCalibrating}
          mode={calibrationMode}
          onComplete={handleCalibrationComplete}
          onCancel={handleCalibrationCancel}
        />
      )}
      {settings.showLabels && (
        <LabelOverlay
          elements={overlay.elements}
          gazeTarget={gazeTarget}
          settings={settings}
        />
      )}
      <GazeHighlight
        gazeTarget={gazeTarget.gazeTarget}
        settings={settings}
      />
      {settings.showGazeDot && (
        <GazeDot gazeX={gaze.gazeX} gazeY={gaze.gazeY} />
      )}
      {settings.eyeEnabled && (
        <>
          <GestureCursor
            cursorX={gesture.cursorX}
            cursorY={gesture.cursorY}
            settings={settings}
          />
          <DwellRing
            isDwelling={gesture.isDwelling}
            dwellProgress={gesture.dwellProgress}
            target={gazeTarget.gazeTarget}
          />
        </>
      )}
    </>
  );
}

// Create Shadow DOM root
const shadowHost = document.createElement('div');
shadowHost.id = 'voxsurf-root';
shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483647;';
document.documentElement.appendChild(shadowHost);

const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
const container = document.createElement('div');
container.id = 'voxsurf-container';
shadowRoot.appendChild(container);

// Inject styles into shadow DOM
const styleElement = document.createElement('style');
styleElement.textContent = `
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`;
shadowRoot.appendChild(styleElement);

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <VoxSurfApp />
  </React.StrictMode>
);
