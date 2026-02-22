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
    <div className="space-y-3">
      {/* Sensitivity */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Cursor Settings</h2>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/70">Sensitivity</span>
            <span className="text-sm font-medium text-apple-blue tabular-nums">
              {settings.sensitivity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={settings.sensitivity}
            onChange={(e) => updateSensitivity(e.target.value)}
            className="w-full"
          />
          <p className="text-[11px] text-white/25 mt-2.5 leading-relaxed">
            Higher values move the cursor farther for the same hand movement.
          </p>
        </div>
      </div>

      {/* Calibration */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Calibration</h2>
        <p className="text-xs text-white/30 mb-4 leading-relaxed">
          Improve gesture precision by calibrating cursor reach with a 9-point pass.
        </p>
        <button
          onClick={startCalibration}
          className="glass-btn-solid w-full px-4 py-2.5 text-sm"
        >
          Start Hand Calibration
        </button>
      </div>
    </div>
  );
}
