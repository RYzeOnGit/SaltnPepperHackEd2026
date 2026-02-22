import React, { useState } from 'react';

export default function VoiceSettings({ settings, updateSettings }) {
  const [openaiKey, setOpenaiKey] = useState(settings.openaiKey || '');
  const [wakeWord, setWakeWord] = useState(settings.wakeWord || '');

  const saveOpenAIKey = () => {
    updateSettings({ openaiKey });
  };

  const saveWakeWord = () => {
    updateSettings({ wakeWord });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">OpenAI API Key</h2>
        <p className="text-sm text-gray-400 mb-4">
          Required for AI-powered command understanding. Your key is stored locally and never sent to our servers.
        </p>
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

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Wake Word</h2>
        <p className="text-sm text-gray-400 mb-4">
          Say this word to activate voice mode. Leave empty for always-on mode.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={wakeWord}
            onChange={(e) => setWakeWord(e.target.value)}
            placeholder="hey vox"
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={saveWakeWord}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded font-medium"
          >
            Save
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Voice Commands</h2>
        <div className="space-y-2 text-sm">
          <div className="text-gray-300">
            <strong>Navigation:</strong> "go back", "reload", "open new tab"
          </div>
          <div className="text-gray-300">
            <strong>Interaction:</strong> "click that", "read this", "scroll down"
          </div>
          <div className="text-gray-300">
            <strong>AI Commands:</strong> "what's on this page", "summarize this", "fill this form"
          </div>
          <div className="text-gray-300">
            <strong>Control:</strong> "sleep", "wake up", "pause reading"
          </div>
        </div>
      </div>
    </div>
  );
}
