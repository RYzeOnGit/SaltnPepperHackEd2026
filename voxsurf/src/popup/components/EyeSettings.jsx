import React from 'react';

export default function EyeSettings({ settings, updateSettings }) {
  const updateSensitivity = (value) => {
    updateSettings({ sensitivity: parseFloat(value) });
  };

  const startCalibration = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        alert('No active tab found. Please open a webpage first.');
        return;
      }

      const tab = tabs[0];
      const url = tab.url || '';

      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
        alert('Calibration cannot run on browser internal pages. Please navigate to a regular website and try again.');
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/content.jsx'],
        });
      } catch (injectError) {
        // Content script may already be present.
      }

      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: 'START_CALIBRATION', mode: 'hand' }, () => {
          if (chrome.runtime.lastError) {
            alert('Failed to start calibration. Open a regular webpage and try again.');
          } else {
            alert('Hand calibration started. Move your hand cursor to each dot.');
          }
        });
      }, 400);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Hand Cursor Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Sensitivity: {settings.sensitivity.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.sensitivity}
              onChange={(e) => updateSensitivity(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Higher sensitivity moves the cursor farther for the same hand movement.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Calibration</h2>
        <p className="text-sm text-gray-400 mb-4">
          Improve gesture precision by calibrating cursor reach with a 9-point pass.
        </p>
        <button
          onClick={startCalibration}
          className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-medium"
        >
          Start Hand Calibration
        </button>
      </div>
    </div>
  );
}
