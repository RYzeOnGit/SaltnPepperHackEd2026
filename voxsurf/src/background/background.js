// Background service worker for VoxSurf
import { base64ToUint8Array, normalizeAudioFormat } from '../shared/audioTransport.js';

async function transcribeAudioInBackground({ openaiKey, audioBase64, audioType }) {
  if (!audioBase64) {
    throw new Error('Missing audio payload');
  }

  const bytes = base64ToUint8Array(audioBase64);
  if (!bytes.byteLength) {
    throw new Error('Empty audio payload');
  }

  const format = normalizeAudioFormat(audioType);
  const blob = new Blob([bytes], { type: format.mimeType });
  const file = new File([blob], `voxsurf-${Date.now()}.${format.extension}`, {
    type: format.mimeType,
  });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append(
    'prompt',
    'Wake word is "hey vox". Transcribe short browser voice commands exactly. ' +
      'Common commands: "hey vox search mrbeast on youtube", "search ... on youtube", ' +
      '"summarize this section", "summarize comments section", "summarize this page".'
  );

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const baseMessage = errorData.error?.message || 'Whisper transcription failed';
    throw new Error(`${baseMessage} (mime=${format.mimeType}, bytes=${bytes.byteLength})`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

async function summarizeSectionInBackground({ openaiKey, sectionText, sectionLabel }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 180,
      messages: [
        {
          role: 'system',
          content:
            'You summarize web content concisely. Return only a short spoken-style summary in 2-3 sentences.',
        },
        {
          role: 'user',
          content: `Summarize the "${sectionLabel || 'section'}" content from this page:\n\n${sectionText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to summarize section');
  }

  const data = await response.json();
  const summary = (data.choices?.[0]?.message?.content || '').trim();
  if (!summary) {
    throw new Error('Summary response was empty');
  }
  return summary;
}

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
      handEnabled: true,
      sensitivity: 1.0,
      voiceEnabled: false,
      wakeWord: 'hey vox',
      openaiKey: '',
    },
  });

  // Initialize stats
  chrome.storage.local.set({
    voxsurfStats: {
      commandsExecuted: 0,
      timeActive: 0,
      pagesVisited: 0,
      clicksByHand: 0,
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
  } else if (message.type === 'OPENAI_WHISPER_TRANSCRIBE') {
    (async () => {
      try {
        const transcript = await transcribeAudioInBackground({
          openaiKey: message.openaiKey,
          audioBase64: message.audioBase64,
          audioType: message.audioType,
        });
        sendResponse({ ok: true, transcript });
      } catch (error) {
        let messageText = error instanceof Error ? error.message : 'Whisper transcription failed';
        if (messageText === 'Failed to fetch') {
          messageText =
            'Network request failed while calling Whisper. Check internet and that OpenAI API is reachable.';
        }
        sendResponse({ ok: false, error: messageText });
      }
    })();
    return true;
  } else if (message.type === 'OPENAI_SUMMARIZE_SECTION' || message.type === 'OPENAI_SUMMARIZE_INTRO') {
    (async () => {
      try {
        const summary = await summarizeSectionInBackground({
          openaiKey: message.openaiKey,
          sectionText: message.sectionText || message.introText || '',
          sectionLabel: message.sectionLabel || 'section',
        });
        sendResponse({ ok: true, summary });
      } catch (error) {
        let messageText = error instanceof Error ? error.message : 'Failed to summarize section';
        if (messageText === 'Failed to fetch') {
          messageText =
            'Network request failed while calling OpenAI. Check internet and that OpenAI API is reachable.';
        }
        sendResponse({ ok: false, error: messageText });
      }
    })();
    return true;
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
