import React, { useState, useEffect } from 'react';
import HomeTab from './components/HomeTab';
import EyeSettings from './components/EyeSettings';
import CameraPreview from './components/CameraPreview';
import StatsPanel from './components/StatsPanel';

function normalizeSettings(incoming) {
  const normalized = { ...incoming };

  if (normalized.handEnabled === undefined && normalized.eyeEnabled !== undefined) {
    normalized.handEnabled = Boolean(normalized.eyeEnabled);
  }

  if (normalized.handEnabled === undefined) {
    normalized.handEnabled = true;
  }

  if (normalized.sensitivity === undefined) {
    normalized.sensitivity = 1.0;
  }

  if (normalized.voiceEnabled === undefined) {
    normalized.voiceEnabled = false;
  }

  if (normalized.wakeWord === undefined) {
    normalized.wakeWord = 'hey vox';
  }

  if (normalized.openaiKey === undefined) {
    normalized.openaiKey = '';
  }

  return normalized;
}

export default function Popup() {
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState({
    handEnabled: true,
    sensitivity: 1.0,
    voiceEnabled: false,
    wakeWord: 'hey vox',
    openaiKey: '',
  });

  useEffect(() => {
    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      if (result.voxsurfSettings) {
        setSettings((prev) => normalizeSettings({ ...prev, ...result.voxsurfSettings }));
      }
    });
  }, []);

  const updateSettings = (updates) => {
    const newSettings = normalizeSettings({ ...settings, ...updates });
    setSettings(newSettings);

    chrome.storage.sync.set({ voxsurfSettings: newSettings });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SETTINGS_UPDATE',
          settings: newSettings,
        });
      }
    });
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white">
      <div className="flex flex-col h-full">
        <header className="bg-indigo-600 p-4 text-center">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <h1 className="text-2xl font-bold">🖐️ VoxSurf</h1>
              <p className="text-sm text-indigo-200">Hand + voice control mode</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-100">Voice</span>
              <button
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.voiceEnabled ? 'bg-emerald-500' : 'bg-indigo-300/40'
                }`}
                title={settings.voiceEnabled ? 'Disable voice agent' : 'Enable voice agent'}
                aria-label={settings.voiceEnabled ? 'Disable voice agent' : 'Enable voice agent'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </header>

        <div className="flex border-b border-gray-700 overflow-x-auto">
          {[
            { id: 'home', label: 'Home' },
            { id: 'hands', label: 'Hands' },
            { id: 'stats', label: 'Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-b-2 border-indigo-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'home' && (
            <HomeTab settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'hands' && (
            <>
              <EyeSettings settings={settings} updateSettings={updateSettings} />
              <CameraPreview settings={settings} />
            </>
          )}
          {activeTab === 'stats' && (
            <StatsPanel settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
}
