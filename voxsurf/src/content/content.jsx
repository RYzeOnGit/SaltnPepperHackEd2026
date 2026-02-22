import React from 'react';
import ReactDOM from 'react-dom/client';
import HUD from './components/HUD';
import GestureCursor from './components/GestureCursor';
import CalibrationOverlay from './components/CalibrationOverlay';
import { useFaceMesh } from './hooks/useFaceMesh';
import { useGesture } from './hooks/useGesture';
import '../styles.css';

function normalizeSettings(incoming) {
  const normalized = { ...incoming };

  if (normalized.handEnabled === undefined && normalized.eyeEnabled !== undefined) {
    normalized.handEnabled = Boolean(normalized.eyeEnabled);
  }

  if (normalized.handEnabled === undefined) {
    normalized.handEnabled = true;
  }

  return normalized;
}

function VoxSurfApp() {
  const [settings, setSettings] = React.useState({
    handEnabled: true,
    sensitivity: 1.0,
  });

  const [isCalibrating, setIsCalibrating] = React.useState(false);
  const [calibrationMode, setCalibrationMode] = React.useState('hand');

  const { handLandmarks, isTracking } = useFaceMesh(settings.handEnabled);
  const gesture = useGesture(settings, handLandmarks);
  const statusRef = React.useRef({
    handEnabled: settings.handEnabled,
    handTracking: isTracking,
    activeGesture: gesture.activeGesture,
    contextMode: gesture.contextMode,
  });

  React.useEffect(() => {
    statusRef.current = {
      handEnabled: settings.handEnabled,
      handTracking: isTracking,
      activeGesture: gesture.activeGesture,
      contextMode: gesture.contextMode,
    };
  }, [settings.handEnabled, isTracking, gesture.activeGesture, gesture.contextMode]);

  React.useEffect(() => {
    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      if (result.voxsurfSettings) {
        setSettings((prev) => normalizeSettings({ ...prev, ...result.voxsurfSettings }));
      }
    });

    const messageListener = (message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATE') {
        setSettings((prev) => normalizeSettings({ ...prev, ...message.settings }));
      } else if (message.type === 'START_CALIBRATION') {
        setCalibrationMode(message.mode || 'hand');
        setIsCalibrating(true);
      } else if (message.type === 'GET_STATUS') {
        sendResponse(statusRef.current);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  if (!settings.handEnabled) {
    return null;
  }

  const handleCalibrationComplete = () => {
    if (gesture.startCalibration) {
      gesture.startCalibration();
    }

    chrome.runtime.sendMessage({
      type: 'CALIBRATION_COMPLETE',
      mode: calibrationMode,
    });

    setIsCalibrating(false);
    setCalibrationMode('hand');
  };

  const handleCalibrationCancel = () => {
    setIsCalibrating(false);
    setCalibrationMode('hand');
  };

  return (
    <>
      <HUD
        settings={settings}
        isTracking={isTracking}
        activeGesture={gesture.activeGesture}
        isDwelling={gesture.isDwelling}
        dwellProgress={gesture.dwellProgress}
        contextMode={gesture.contextMode}
      />
      {isCalibrating && (
        <CalibrationOverlay
          isActive={isCalibrating}
          mode={calibrationMode}
          onComplete={handleCalibrationComplete}
          onCancel={handleCalibrationCancel}
        />
      )}
      {settings.handEnabled && (
        <GestureCursor
          cursorX={gesture.cursorX}
          cursorY={gesture.cursorY}
          settings={settings}
        />
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
