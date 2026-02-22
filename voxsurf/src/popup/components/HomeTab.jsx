import React, { useState, useEffect } from 'react';

export default function HomeTab({ settings, updateSettings }) {
  const [stats, setStats] = useState({
    commandsExecuted: 0,
    timeActive: 0,
    pagesVisited: 0,
  });
  const [liveStatus, setLiveStatus] = useState({
    mic: false,
    eye: false,
    ai: 'idle',
  });

  useEffect(() => {
    // Get stats
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        setStats(result.voxsurfStats);
      }
    });

    // Get live status from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
          if (response) {
            setLiveStatus(response);
          }
        });
      }
    });

    const interval = setInterval(() => {
      chrome.storage.local.get(['voxsurfStats'], (result) => {
        if (result.voxsurfStats) {
          setStats(result.voxsurfStats);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Live Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  liveStatus.mic ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                }`}
              />
              <span>Microphone</span>
            </div>
            <span className={liveStatus.mic ? 'text-green-400' : 'text-gray-400'}>
              {liveStatus.mic ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  liveStatus.eye ? 'bg-blue-400' : 'bg-gray-500'
                }`}
              />
              <span>Eye Tracking</span>
            </div>
            <span className={liveStatus.eye ? 'text-blue-400' : 'text-gray-400'}>
              {liveStatus.eye ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  liveStatus.ai === 'thinking'
                    ? 'bg-yellow-400 animate-pulse'
                    : liveStatus.ai === 'responding'
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-gray-500'
                }`}
              />
              <span>AI</span>
            </div>
            <span className="text-gray-400 capitalize">{liveStatus.ai}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-indigo-400">{stats.commandsExecuted}</div>
            <div className="text-sm text-gray-400">Commands Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{formatTime(stats.timeActive)}</div>
            <div className="text-sm text-gray-400">Time Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{stats.pagesVisited}</div>
            <div className="text-sm text-gray-400">Pages Visited</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Master Controls</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Voice Mode</span>
            <button
              onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
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
            <span>Eye Tracking</span>
            <button
              onClick={() => updateSettings({ eyeEnabled: !settings.eyeEnabled })}
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
    </div>
  );
}
