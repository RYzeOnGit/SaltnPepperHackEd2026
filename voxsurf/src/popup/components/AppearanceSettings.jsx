import React from 'react';

export default function AppearanceSettings({ settings, updateSettings }) {
  const updateHighlightColor = (color) => {
    updateSettings({ highlightColor: color });
  };

  const updateLabelColor = (color) => {
    updateSettings({ labelColor: color });
  };

  const updateLabelSize = (size) => {
    updateSettings({ labelSize: size });
  };

  const toggleGazeDot = () => {
    updateSettings({ showGazeDot: !settings.showGazeDot });
  };

  const updateHUDPosition = (position) => {
    updateSettings({ hudDefaultPosition: position });
    chrome.storage.local.set({ hudPosition: position });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Gaze Highlight</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color</label>
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
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Element Labels</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color</label>
            <div className="flex gap-2">
              {['yellow', 'white', 'green', 'high-contrast'].map((color) => (
                <button
                  key={color}
                  onClick={() => updateLabelColor(color)}
                  className={`px-4 py-2 rounded border-2 ${
                    (settings.labelColor || 'yellow') === color
                      ? 'border-white'
                      : 'border-gray-600'
                  } ${
                    color === 'yellow' ? 'bg-yellow-500' :
                    color === 'white' ? 'bg-white text-black' :
                    color === 'green' ? 'bg-green-500' :
                    'bg-black text-white border-white'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Size: {settings.labelSize || 'medium'}
            </label>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={settings.labelSize || 1.0}
              onChange={(e) => updateLabelSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Gaze Dot</h2>
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

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">HUD Position</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'top-left', label: 'Top Left' },
            { id: 'top-right', label: 'Top Right' },
            { id: 'bottom-left', label: 'Bottom Left' },
            { id: 'bottom-right', label: 'Bottom Right' },
          ].map((pos) => (
            <button
              key={pos.id}
              onClick={() => {
                const positionMap = {
                  'top-left': { top: '10px', left: '10px', right: 'auto', bottom: 'auto' },
                  'top-right': { top: '10px', right: '10px', left: 'auto', bottom: 'auto' },
                  'bottom-left': { bottom: '10px', left: '10px', top: 'auto', right: 'auto' },
                  'bottom-right': { bottom: '10px', right: '10px', top: 'auto', left: 'auto' },
                };
                updateHUDPosition(positionMap[pos.id]);
              }}
              className={`px-4 py-2 rounded border ${
                (settings.hudDefaultPosition?.top === '10px' && pos.id === 'top-left') ||
                (settings.hudDefaultPosition?.right === '10px' && pos.id === 'top-right') ||
                (settings.hudDefaultPosition?.bottom === '10px' && pos.id === 'bottom-right')
                  ? 'bg-indigo-600 border-indigo-400'
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
