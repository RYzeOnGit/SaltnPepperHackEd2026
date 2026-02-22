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

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'hands', label: 'Hands' },
  { id: 'stats', label: 'Stats' },
];

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
    <div className="w-full h-full min-h-[600px] text-white font-sf"
      style={{ background: 'linear-gradient(145deg, #0a0a0f 0%, #12121f 50%, #1a1a2e 100%)' }}>
      <div className="flex flex-col h-full">

        {/* Header */}
        <header className="glass-panel px-5 py-4 mx-3 mt-3" style={{ borderRadius: '16px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">VoxSurf</h1>
              <p className="text-xs text-white/40 mt-0.5 font-normal">Hand + voice control</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-white/40 font-medium">Voice</span>
              <button
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className="apple-toggle"
                data-active={settings.voiceEnabled ? 'true' : 'false'}
                title={settings.voiceEnabled ? 'Disable voice agent' : 'Enable voice agent'}
                aria-label={settings.voiceEnabled ? 'Disable voice agent' : 'Enable voice agent'}
              >
                <span className="apple-toggle-knob" />
              </button>
            </div>
          </div>
        </header>

        {/* Segmented Control */}
        <div className="px-3 pt-3">
          <div className="segmented-control">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="segmented-control-btn"
                data-active={activeTab === tab.id ? 'true' : 'false'}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="animate-fade-in">
            {activeTab === 'home' && (
              <HomeTab settings={settings} updateSettings={updateSettings} />
            )}
            {activeTab === 'hands' && (
              <>
                <EyeSettings settings={settings} updateSettings={updateSettings} />
                <div className="mt-3">
                  <CameraPreview settings={settings} />
                </div>
              </>
            )}
            {activeTab === 'stats' && (
              <StatsPanel settings={settings} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
