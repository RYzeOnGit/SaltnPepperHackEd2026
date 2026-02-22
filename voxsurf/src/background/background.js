// Background service worker for VoxSurf

// #region agent log
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VOXSURF_DEBUG') {
    fetch('http://127.0.0.1:7242/ingest/6ec31616-2a2f-4e81-bc1d-202457a4aabc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload),
    }).catch(() => {});
    return false;
  }
});
// #endregion

chrome.runtime.onInstalled.addListener(() => {
  console.log('VoxSurf installed');
  
  // Initialize default settings
  chrome.storage.sync.set({
    voxsurfSettings: {
      voiceEnabled: true,
      eyeEnabled: true,
      openaiKey: '',
      wakeWord: '',
      sensitivity: 1.0,
      gazeSmoothing: 0.25,
      highlightColor: 'blue',
      showLabels: true,
      showGazeDot: false,
      readingSpeed: 1.0,
    },
  });

  // Initialize stats
  chrome.storage.local.set({
    voxsurfStats: {
      commandsExecuted: 0,
      timeActive: 0,
      pagesVisited: 0,
      clicksByGaze: 0,
      clicksByVoice: 0,
    },
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLOSE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.remove(tabs[0].id);
      }
    });
  } else if (message.type === 'NEW_TAB') {
    chrome.tabs.create({ url: 'about:newtab' });
  } else if (message.type === 'NEXT_TAB') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs[0] && tabs.length > 1) {
          const idx = tabs.findIndex((t) => t.id === activeTabs[0].id);
          const nextIdx = (idx + 1) % tabs.length;
          chrome.tabs.update(tabs[nextIdx].id, { active: true });
        }
      });
    });
  } else if (message.type === 'PREV_TAB') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs[0] && tabs.length > 1) {
          const idx = tabs.findIndex((t) => t.id === activeTabs[0].id);
          const prevIdx = (idx - 1 + tabs.length) % tabs.length;
          chrome.tabs.update(tabs[prevIdx].id, { active: true });
        }
      });
    });
  } else if (message.type === 'CALIBRATION_COMPLETE') {
    // Forward calibration completion to popup if open
    // This is handled by the popup's message listener
    return true; // Keep channel open for async response
  }
  return true;
});

// Track active time
let activeStartTime = null;

chrome.tabs.onActivated.addListener(() => {
  activeStartTime = Date.now();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    activeStartTime = Date.now();
    
    // Update pages visited stat
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        chrome.storage.local.set({
          voxsurfStats: {
            ...result.voxsurfStats,
            pagesVisited: (result.voxsurfStats.pagesVisited || 0) + 1,
          },
        });
      }
    });
  }
});

// Update active time periodically
setInterval(() => {
  if (activeStartTime) {
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      if (result.voxsurfStats) {
        const elapsed = Math.floor((Date.now() - activeStartTime) / 1000);
        chrome.storage.local.set({
          voxsurfStats: {
            ...result.voxsurfStats,
            timeActive: (result.voxsurfStats.timeActive || 0) + elapsed,
          },
        });
        activeStartTime = Date.now();
      }
    });
  }
}, 60000); // Update every minute
