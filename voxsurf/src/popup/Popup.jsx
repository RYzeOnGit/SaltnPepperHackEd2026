import React, { useState, useEffect } from 'react';
import HomeTab from './components/HomeTab';
import VoiceSettings from './components/VoiceSettings';
import EyeSettings from './components/EyeSettings';
import CameraPreview from './components/CameraPreview';
import AISettings from './components/AISettings';
import ReaderSettings from './components/ReaderSettings';
import AppearanceSettings from './components/AppearanceSettings';
import CustomCommands from './components/CustomCommands';
import ChallengeMode from './components/ChallengeMode';
import StatsPanel from './components/StatsPanel';
import Onboarding from './components/Onboarding';
import DemoMode from './components/DemoMode';

export default function Popup() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    eyeEnabled: true,
    openaiKey: '',
    wakeWord: '',
    sensitivity: 1.0,
    gazeSmoothing: 0.25,
    highlightColor: 'blue',
    showLabels: true,
    showGazeDot: false,
  });

  useEffect(() => {
    // Check if onboarding is complete
    chrome.storage.local.get(['onboardingComplete'], (result) => {
      if (!result.onboardingComplete) {
        setShowOnboarding(true);
      }
    });

    chrome.storage.sync.get(['voxsurfSettings'], (result) => {
      if (result.voxsurfSettings) {
        setSettings({ ...settings, ...result.voxsurfSettings });
      }
    });
  }, []);

  const updateSettings = (updates) => {
    const newSettings = { ...settings, ...updates };
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

  if (showOnboarding) {
    return (
      <div className="w-full h-full">
        <Onboarding
          onComplete={() => {
            setShowOnboarding(false);
            chrome.storage.local.set({ onboardingComplete: true });
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 text-white">
      <div className="flex flex-col h-full">
        <header className="bg-indigo-600 p-4 text-center">
          <h1 className="text-2xl font-bold">🎙️ VoxSurf</h1>
          <p className="text-sm text-indigo-200">Hands-free web browsing</p>
        </header>

        <div className="flex border-b border-gray-700 overflow-x-auto">
          {[
            { id: 'home', label: 'Home' },
            { id: 'voice', label: 'Voice' },
            { id: 'eyes', label: 'Eyes' },
            { id: 'ai', label: 'AI' },
            { id: 'reading', label: 'Reading' },
            { id: 'appearance', label: 'Appearance' },
            { id: 'commands', label: 'Commands' },
            { id: 'challenge', label: 'Challenge' },
            { id: 'demo', label: 'Demo' },
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
          {activeTab === 'voice' && (
            <VoiceSettings settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'eyes' && (
            <>
              <EyeSettings settings={settings} updateSettings={updateSettings} />
              <CameraPreview settings={settings} />
            </>
          )}
          {activeTab === 'ai' && (
            <AISettings settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'reading' && (
            <ReaderSettings settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'appearance' && (
            <AppearanceSettings settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'commands' && (
            <CustomCommands settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'challenge' && (
            <ChallengeMode settings={settings} />
          )}
          {activeTab === 'demo' && (
            <DemoMode settings={settings} updateSettings={updateSettings} />
          )}
          {activeTab === 'stats' && (
            <StatsPanel settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
}
