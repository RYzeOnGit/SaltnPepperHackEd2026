import React from 'react';

export default function MasterToggle({ settings, updateSettings }) {
  const toggleVoice = () => {
    updateSettings({ voiceEnabled: !settings.voiceEnabled });
  };

  const toggleEye = () => {
    updateSettings({ eyeEnabled: !settings.eyeEnabled });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Master Controls</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Voice Mode</h3>
              <p className="text-sm text-gray-400">Enable voice commands</p>
            </div>
            <button
              onClick={toggleVoice}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.voiceEnabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Eye Tracking</h3>
              <p className="text-sm text-gray-400">Enable gaze tracking & gestures</p>
            </div>
            <button
              onClick={toggleEye}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.eyeEnabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.eyeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="font-medium mb-2">Quick Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Voice:</span>
            <span className={settings.voiceEnabled ? 'text-green-400' : 'text-red-400'}>
              {settings.voiceEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Eyes:</span>
            <span className={settings.eyeEnabled ? 'text-green-400' : 'text-red-400'}>
              {settings.eyeEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
