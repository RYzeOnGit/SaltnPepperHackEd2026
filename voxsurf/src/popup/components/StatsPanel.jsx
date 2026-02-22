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
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Commands Executed</span>
            <span className="text-2xl font-bold text-indigo-400">{stats.commandsExecuted}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Time Active</span>
            <span className="text-2xl font-bold text-indigo-400">{formatTime(stats.timeActive)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Pages Visited</span>
            <span className="text-2xl font-bold text-indigo-400">{stats.pagesVisited}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Hand Clicks</span>
            <span className="text-2xl font-bold text-green-400">{stats.clicksByHand || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
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
          className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-medium"
        >
          Reset Statistics
        </button>
      </div>
    </div>
  );
}
