import React, { useState, useEffect } from 'react';

export default function AISettings({ settings, updateSettings }) {
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || '');
  const [tokenUsage, setTokenUsage] = useState(0);
  const [alwaysUseAI, setAlwaysUseAI] = useState(settings.alwaysUseAI || false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(settings.aiConfidenceThreshold || 0.6);

  useEffect(() => {
    chrome.storage.local.get(['aiTokenUsage'], (result) => {
      if (result.aiTokenUsage) {
        setTokenUsage(result.aiTokenUsage);
      }
    });
  }, []);

  const saveOpenAIKey = () => {
    updateSettings({ openaiKey });
  };

  const updateThreshold = (value) => {
    const threshold = parseFloat(value);
    setConfidenceThreshold(threshold);
    updateSettings({ aiConfidenceThreshold: threshold });
  };

  const toggleAlwaysUseAI = () => {
    const newValue = !alwaysUseAI;
    setAlwaysUseAI(newValue);
    updateSettings({ alwaysUseAI: newValue });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">OpenAI Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={saveOpenAIKey}
                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-medium"
              >
                Save
              </button>
            </div>
            {openaiKey && (
              <p className="text-xs text-green-400 mt-2">✓ Key saved</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Model</label>
            <div className="bg-gray-700 px-4 py-2 rounded text-sm">
              gpt-4o
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">AI Behavior</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => updateThreshold(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Commands below this threshold will require confirmation
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Always Use AI</h3>
              <p className="text-sm text-gray-400">Skip Tier 1 local commands</p>
            </div>
            <button
              onClick={toggleAlwaysUseAI}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                alwaysUseAI ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  alwaysUseAI ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Token Usage</h2>
        <div className="text-2xl font-bold text-indigo-400 mb-2">
          {tokenUsage.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">Tokens used today</div>
        <button
          onClick={() => {
            chrome.storage.local.set({ aiTokenUsage: 0 });
            setTokenUsage(0);
          }}
          className="mt-4 w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium text-sm"
        >
          Reset Counter
        </button>
      </div>
    </div>
  );
}
