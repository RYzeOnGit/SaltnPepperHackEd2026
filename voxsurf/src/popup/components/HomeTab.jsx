import React, { useState, useEffect } from 'react';

export default function HomeTab({ settings, updateSettings }) {
  const [stats, setStats] = useState({
    commandsExecuted: 0,
    timeActive: 0,
    pagesVisited: 0,
    clicksByHand: 0,
  });

  const [liveStatus, setLiveStatus] = useState({
    handEnabled: settings.handEnabled,
    handTracking: false,
    activeGesture: 'none',
    contextMode: 'browser',
    voiceEnabled: settings.voiceEnabled,
    voiceListening: false,
    voiceLastCommand: '',
    voiceLastHeard: '',
  });
  const [voiceDraft, setVoiceDraft] = useState({
    openaiKey: settings.openaiKey || '',
    wakeWord: settings.wakeWord || 'hey vox',
  });

  useEffect(() => {
    setVoiceDraft({
      openaiKey: settings.openaiKey || '',
      wakeWord: settings.wakeWord || 'hey vox',
    });
  }, [settings.openaiKey, settings.wakeWord]);

  useEffect(() => {
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        setStats(result.voxsurfStats);
      }
    });

    const statusTimer = setInterval(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (response) => {
            if (response) {
              setLiveStatus(response);
            }
          });
        }
      });
    }, 1000);

    const statsTimer = setInterval(() => {
      chrome.storage.local.get(['voxsurfStats'], (result) => {
        if (result.voxsurfStats) {
          setStats(result.voxsurfStats);
        }
      });
    }, 1000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(statsTimer);
    };
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
              <div className={`w-3 h-3 rounded-full ${liveStatus.handTracking ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              <span>Hand Tracking</span>
            </div>
            <span className={liveStatus.handTracking ? 'text-green-400' : 'text-gray-400'}>
              {liveStatus.handTracking ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Current Gesture</span>
            <span className="text-indigo-300 capitalize">{liveStatus.activeGesture || 'none'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Context Mode</span>
            <span className="text-emerald-300 capitalize">{liveStatus.contextMode || 'browser'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Voice Agent</span>
            <span
              className={
                liveStatus.voiceEnabled && liveStatus.voiceListening
                  ? 'text-green-400'
                  : liveStatus.voiceEnabled
                    ? 'text-yellow-300'
                    : 'text-gray-400'
              }
            >
              {liveStatus.voiceEnabled
                ? liveStatus.voiceListening
                  ? 'Listening'
                  : 'Enabled (idle)'
                : 'Disabled'}
            </span>
          </div>
          {liveStatus.voiceLastCommand && (
            <div className="text-xs text-gray-400">
              Last Voice Command: <span className="text-indigo-300">{liveStatus.voiceLastCommand}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-indigo-400">{stats.clicksByHand || 0}</div>
            <div className="text-sm text-gray-400">Hand Clicks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{formatTime(stats.timeActive || 0)}</div>
            <div className="text-sm text-gray-400">Time Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">{stats.pagesVisited || 0}</div>
            <div className="text-sm text-gray-400">Pages Visited</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Master Controls</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Hand Mode</span>
            <button
              onClick={() => updateSettings({ handEnabled: !settings.handEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.handEnabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.handEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span>Voice Agent</span>
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

          <div>
            <label className="block text-sm text-gray-400 mb-1">Wake Word</label>
            <input
              type="text"
              value={voiceDraft.wakeWord}
              onChange={(event) =>
                setVoiceDraft((prev) => ({ ...prev, wakeWord: event.target.value }))
              }
              onBlur={() =>
                updateSettings({
                  wakeWord: voiceDraft.wakeWord.trim() || 'hey vox',
                })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              placeholder="hey vox"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={voiceDraft.openaiKey}
              onChange={(event) =>
                setVoiceDraft((prev) => ({ ...prev, openaiKey: event.target.value }))
              }
              onBlur={() =>
                updateSettings({
                  openaiKey: voiceDraft.openaiKey.trim(),
                })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              placeholder="sk-..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Whisper voice agent uses this key for transcription and intro summaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
