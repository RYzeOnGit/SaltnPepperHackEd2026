import React from 'react';

export default function EyeSettings({ settings, updateSettings }) {
  const updateSensitivity = (value) => {
    updateSettings({ sensitivity: parseFloat(value) });
  };

  const updateGazeSmoothing = (value) => {
    updateSettings({ gazeSmoothing: parseFloat(value) });
  };

  const updateHighlightColor = (color) => {
    updateSettings({ highlightColor: color });
  };

  const toggleLabels = () => {
    updateSettings({ showLabels: !settings.showLabels });
  };

  const toggleGazeDot = () => {
    updateSettings({ showGazeDot: !settings.showGazeDot });
  };

  const startCalibration = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        alert('No active tab found. Please open a webpage first.');
        return;
      }

      const tab = tabs[0];
      const url = tab.url || '';

      // Check if it's a chrome:// or chrome-extension:// page
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        alert('Calibration cannot run on browser internal pages. Please navigate to a regular website (e.g., google.com) and try again.');
        return;
      }

      // Try to inject content script if needed (for pages that might not have it yet)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content.jsx'],
        });
      } catch (injectError) {
        // Content script might already be injected, or injection failed
      }

      // Wait a bit for script to initialize, then send message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'START_CALIBRATION',
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to send calibration message:', chrome.runtime.lastError.message);
            alert('Failed to start calibration. Make sure you are on a regular webpage (not chrome:// pages) and the extension is enabled.');
          } else {
            alert('Calibration started! Look at the 9 calibration points on screen.');
          }
        });
      }, 500);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Cursor Sensitivity</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Head Cursor: {settings.sensitivity.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.sensitivity}
              onChange={(e) => updateSensitivity(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Gaze Smoothing: {(settings.gazeSmoothing * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={settings.gazeSmoothing}
              onChange={(e) => updateGazeSmoothing(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Visual Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Highlight Color</label>
            <div className="flex gap-2">
              {['blue', 'green', 'yellow', 'purple'].map((color) => (
                <button
                  key={color}
                  onClick={() => updateHighlightColor(color)}
                  className={`w-12 h-12 rounded border-2 ${
                    settings.highlightColor === color
                      ? 'border-white'
                      : 'border-gray-600'
                  } bg-${color}-500`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Show Element Labels</h3>
              <p className="text-sm text-gray-400">Numbered badges on interactive elements</p>
            </div>
            <button
              onClick={toggleLabels}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showLabels ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showLabels ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Show Gaze Dot</h3>
              <p className="text-sm text-gray-400">Visual indicator of gaze position</p>
            </div>
            <button
              onClick={toggleGazeDot}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.showGazeDot ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.showGazeDot ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Calibration</h2>
        <p className="text-sm text-gray-400 mb-4">
          Calibrate eye tracking for accurate gaze detection. Follow the 9-point calibration pattern.
        </p>
        <button
          onClick={startCalibration}
          className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-medium"
        >
          Start Calibration
        </button>
      </div>
    </div>
  );
}
