import React, { useState, useEffect } from 'react';

export default function StatsPanel({ settings }) {
  const [stats, setStats] = useState({
    commandsExecuted: 0,
    timeActive: 0,
    pagesVisited: 0,
    clicksByHand: 0,
  });

  useEffect(() => {
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        setStats(result.voxsurfStats);
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
    <div className="space-y-3">
      <div className="glass-panel p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Usage Statistics</h2>
        <div className="space-y-0">
          <StatRow label="Commands Executed" value={stats.commandsExecuted} color="text-apple-blue" />
          <div className="glass-divider" />
          <StatRow label="Time Active" value={formatTime(stats.timeActive)} color="text-apple-green" />
          <div className="glass-divider" />
          <StatRow label="Pages Visited" value={stats.pagesVisited} color="text-apple-purple" />
          <div className="glass-divider" />
          <StatRow label="Hand Clicks" value={stats.clicksByHand || 0} color="text-apple-teal" />
        </div>
      </div>

      <div className="glass-panel p-4">
        <button
          onClick={() => {
            chrome.storage.local.set({ voxsurfStats: {
              commandsExecuted: 0,
              timeActive: 0,
              pagesVisited: 0,
              clicksByHand: 0,
            }});
            setStats({
              commandsExecuted: 0,
              timeActive: 0,
              pagesVisited: 0,
              clicksByHand: 0,
            });
          }}
          className="glass-btn-danger w-full px-4 py-2.5 text-sm"
        >
          Reset Statistics
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-xl font-semibold ${color} tabular-nums`}>{value}</span>
    </div>
  );
}
