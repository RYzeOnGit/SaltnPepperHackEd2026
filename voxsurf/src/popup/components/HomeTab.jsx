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
    <div className="space-y-3">

      {/* Live Status */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Live Status</h2>
        <div className="space-y-0">
          <StatusRow
            label="Hand Tracking"
            value={liveStatus.handTracking ? 'Active' : 'Inactive'}
            active={liveStatus.handTracking}
            dot
          />
          <div className="glass-divider" />
          <StatusRow
            label="Gesture"
            value={liveStatus.activeGesture || 'none'}
            valueClass="text-apple-blue capitalize"
          />
          <div className="glass-divider" />
          <StatusRow
            label="Context"
            value={liveStatus.contextMode || 'browser'}
            valueClass="text-apple-green capitalize"
          />
          <div className="glass-divider" />
          <StatusRow
            label="Voice Agent"
            value={
              liveStatus.voiceEnabled
                ? liveStatus.voiceListening
                  ? 'Listening'
                  : 'Enabled'
                : 'Disabled'
            }
            active={liveStatus.voiceEnabled && liveStatus.voiceListening}
            dot={liveStatus.voiceEnabled}
            dotColor={
              liveStatus.voiceEnabled && liveStatus.voiceListening
                ? 'bg-apple-green'
                : 'bg-apple-orange'
            }
            valueClass={
              liveStatus.voiceEnabled && liveStatus.voiceListening
                ? 'text-apple-green'
                : liveStatus.voiceEnabled
                  ? 'text-apple-orange'
                  : 'text-white/30'
            }
          />
          {liveStatus.voiceLastCommand && (
            <>
              <div className="glass-divider" />
              <div className="py-2.5">
                <span className="text-xs text-white/30">Last command: </span>
                <span className="text-xs text-apple-blue">{liveStatus.voiceLastCommand}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Quick Stats</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatItem value={stats.clicksByHand || 0} label="Clicks" color="text-apple-blue" />
          <StatItem value={formatTime(stats.timeActive || 0)} label="Active" color="text-apple-green" />
          <StatItem value={stats.pagesVisited || 0} label="Pages" color="text-apple-purple" />
        </div>
      </div>

      {/* Master Controls */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Controls</h2>
        <div className="space-y-0">
          <ToggleRow
            label="Hand Mode"
            active={settings.handEnabled}
            onChange={() => updateSettings({ handEnabled: !settings.handEnabled })}
          />
          <div className="glass-divider" />
          <ToggleRow
            label="Voice Agent"
            active={settings.voiceEnabled}
            onChange={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
          />
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">Wake Word</label>
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
              className="glass-input w-full px-3.5 py-2.5 text-sm"
              placeholder="hey vox"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/40 mb-1.5">OpenAI API Key</label>
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
              className="glass-input w-full px-3.5 py-2.5 text-sm"
              placeholder="sk-..."
            />
            <p className="text-[11px] text-white/25 mt-1.5 leading-relaxed">
              Used for Whisper transcription and page summaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, active, dot, dotColor, valueClass }) {
  const defaultDotColor = active ? 'bg-apple-green' : 'bg-white/20';
  const resolvedDotColor = dotColor || defaultDotColor;
  const defaultValueClass = active ? 'text-apple-green' : 'text-white/40';
  const resolvedValueClass = valueClass || defaultValueClass;

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        {dot && (
          <div className={`w-2 h-2 rounded-full ${resolvedDotColor} ${active ? 'animate-status-pulse' : ''}`} />
        )}
        <span className="text-sm text-white/70">{label}</span>
      </div>
      <span className={`text-sm font-medium ${resolvedValueClass}`}>{value}</span>
    </div>
  );
}

function StatItem({ value, label, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-semibold ${color} tabular-nums`}>{value}</div>
      <div className="text-[11px] text-white/30 mt-1">{label}</div>
    </div>
  );
}

function ToggleRow({ label, active, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-white/70">{label}</span>
      <button
        onClick={onChange}
        className="apple-toggle"
        data-active={active ? 'true' : 'false'}
      >
        <span className="apple-toggle-knob" />
      </button>
    </div>
  );
}
