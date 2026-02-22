import React, { useState } from 'react';

export default function ReaderSettings({ settings, updateSettings }) {
  const [readingSpeed, setReadingSpeed] = useState(settings.readingSpeed || 1.0);

  const updateSpeed = (value) => {
    const speed = parseFloat(value);
    setReadingSpeed(speed);
    updateSettings({ readingSpeed: speed });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Reading Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Reading Speed: {readingSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={readingSpeed}
              onChange={(e) => updateSpeed(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Reader Commands</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <div>&quot;read this&quot; - Read the element you&apos;re looking at</div>
          <div>&quot;read page&quot; - Read the entire page</div>
          <div>&quot;summarize this&quot; - AI summary of gazed content</div>
          <div>&quot;key points&quot; - Extract main points from page</div>
          <div>&quot;pause reading&quot; / &quot;resume reading&quot; - Control playback</div>
        </div>
      </div>
    </div>
  );
}
