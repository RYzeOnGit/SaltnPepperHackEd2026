import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayBufferToBase64 } from '../../shared/audioTransport.js';

const CHUNK_MS = 1800;
const MIN_BLOB_BYTES = 2500;
const FOLLOW_UP_WINDOW_MS = 9000;
const SUMMARIZE_COMMAND_REGEX = /\bsummari[sz]e\b/i;
const SECTION_MIN_CHARS = 120;
const SECTION_MAX_CHARS = 2600;

function collapseWhitespace(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(text) {
  return collapseWhitespace(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSummarizeCommand(commandText) {
  const command = collapseWhitespace(commandText);
  if (!SUMMARIZE_COMMAND_REGEX.test(command)) return null;

  let sectionText = command.replace(/^.*?\bsummari[sz]e\b/i, '').trim();
  sectionText = sectionText.replace(/^(?:the|a|an)\s+/i, '');
  sectionText = sectionText.replace(/\s+(?:of|on)\s+(?:this\s+)?page[.!?]*$/i, '');
  sectionText = sectionText.replace(/\s+please[.!?]*$/i, '');
  sectionText = sectionText.replace(/[.!?]+$/g, '').trim();

  if (!sectionText || /^(?:this|current)(?:\s+section)?$/i.test(sectionText)) {
    return { sectionKey: 'current', sectionLabel: 'this section' };
  }

  if (
    /^(?:entire|whole)?\s*page$/i.test(sectionText) ||
    /^(?:all|everything)$/i.test(sectionText)
  ) {
    return { sectionKey: 'page', sectionLabel: 'this page' };
  }

  const prefixMatch = sectionText.match(/^section\s+(.+)$/i);
  if (prefixMatch) {
    sectionText = collapseWhitespace(prefixMatch[1]);
  }

  const suffixMatch = sectionText.match(/^(.+?)\s+section$/i);
  if (suffixMatch) {
    sectionText = collapseWhitespace(suffixMatch[1]);
  }

  if (!sectionText) {
    return { sectionKey: 'current', sectionLabel: 'this section' };
  }

  return { sectionKey: 'named', sectionLabel: sectionText };
}

function getSelectionText() {
  const selected = collapseWhitespace(window.getSelection?.()?.toString() || '');
  return selected.length >= SECTION_MIN_CHARS ? selected.slice(0, SECTION_MAX_CHARS) : '';
}

function extractNodeText(node) {
  if (!node) return '';

  const heading = collapseWhitespace(node.querySelector('h1, h2, h3')?.textContent || '');
  const blocks = Array.from(node.querySelectorAll('p, li'))
    .map((item) => collapseWhitespace(item.textContent))
    .filter((text) => text.length > 30)
    .slice(0, 8);

  const structured = collapseWhitespace([heading, ...blocks].join(' '));
  if (structured.length >= SECTION_MIN_CHARS) {
    return structured.slice(0, SECTION_MAX_CHARS);
  }

  const fallback = collapseWhitespace(node.innerText || node.textContent || '');
  return fallback.length >= SECTION_MIN_CHARS ? fallback.slice(0, SECTION_MAX_CHARS) : '';
}

function scoreMatch(haystack, phrase, tokens) {
  if (!haystack || !phrase) return 0;
  let score = 0;
  if (haystack.includes(phrase)) score += 6;
  tokens.forEach((token) => {
    if (token.length > 1 && haystack.includes(token)) score += 1;
  });
  return score;
}

function findClosestContentContainer(node) {
  let current = node instanceof Element ? node : node?.parentElement;
  while (current && current !== document.body) {
    const tag = current.tagName?.toLowerCase();
    const role = current.getAttribute?.('role') || '';
    if (
      tag === 'section' ||
      tag === 'article' ||
      tag === 'main' ||
      tag === 'aside' ||
      tag === 'nav' ||
      tag === 'div' ||
      role === 'region' ||
      role === 'main'
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return document.querySelector('main, article, section') || document.body;
}

function findSectionNodeByName(sectionLabel) {
  const normalizedPhrase = normalizeForMatch(sectionLabel);
  if (!normalizedPhrase) return null;
  const tokens = normalizedPhrase.split(' ').filter(Boolean);

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let bestHeading = null;
  let bestHeadingScore = 0;
  for (const heading of headings) {
    const headingText = normalizeForMatch(heading.textContent || '');
    const score = scoreMatch(headingText, normalizedPhrase, tokens);
    if (score > bestHeadingScore) {
      bestHeadingScore = score;
      bestHeading = heading;
    }
  }
  if (bestHeading && bestHeadingScore > 0) {
    return findClosestContentContainer(bestHeading);
  }

  const attrCandidates = Array.from(
    document.querySelectorAll('[id], [class], [aria-label], [data-testid], [data-section]')
  ).slice(0, 1800);

  let bestNode = null;
  let bestScore = 0;
  for (const node of attrCandidates) {
    const className =
      typeof node.className === 'string' ? node.className : node.className?.baseVal || '';
    const labelText = normalizeForMatch(
      [
        node.id || '',
        className || '',
        node.getAttribute('aria-label') || '',
        node.getAttribute('data-testid') || '',
        node.getAttribute('data-section') || '',
      ].join(' ')
    );
    const score = scoreMatch(labelText, normalizedPhrase, tokens);
    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestScore > 0 ? findClosestContentContainer(bestNode) : null;
}

function resolveCurrentSectionNode() {
  const selection = window.getSelection?.();
  if (selection?.rangeCount && selection.anchorNode) {
    return findClosestContentContainer(selection.anchorNode);
  }

  if (document.activeElement) {
    return findClosestContentContainer(document.activeElement);
  }

  const pointNode = document.elementFromPoint(
    Math.floor(window.innerWidth / 2),
    Math.floor(window.innerHeight / 3)
  );
  if (pointNode) {
    return findClosestContentContainer(pointNode);
  }

  return document.querySelector('main, article, section') || document.body;
}

function extractSectionTextFromPage(sectionRequest) {
  const request = sectionRequest || { sectionKey: 'current', sectionLabel: 'this section' };

  if (request.sectionKey === 'page') {
    const pageText = collapseWhitespace(document.body?.innerText || '');
    return { text: pageText.slice(0, SECTION_MAX_CHARS), resolvedLabel: 'this page' };
  }

  if (request.sectionKey === 'current') {
    const selectedText = getSelectionText();
    if (selectedText) {
      return { text: selectedText, resolvedLabel: 'selected text' };
    }
    const currentNode = resolveCurrentSectionNode();
    const text = extractNodeText(currentNode);
    if (text) {
      return { text, resolvedLabel: 'this section' };
    }
  }

  if (request.sectionKey === 'named') {
    const targetNode = findSectionNodeByName(request.sectionLabel);
    const text = extractNodeText(targetNode);
    if (text) {
      return { text, resolvedLabel: request.sectionLabel };
    }
  }

  const fallback = collapseWhitespace(document.body?.innerText || '');
  return { text: fallback.slice(0, SECTION_MAX_CHARS), resolvedLabel: 'this page' };
}

function matchYouTubeSearchCommand(commandText) {
  const command = collapseWhitespace(commandText);
  const patterns = [
    /^(?:please\s+)?(?:search|find)\s+(.+?)\s+(?:on|in)\s+youtube(?:\s+please)?[.!?]*$/i,
    /^youtube\s+search\s+(.+?)(?:\s+please)?[.!?]*$/i,
    /^(?:please\s+)?play\s+(.+?)\s+on\s+youtube(?:\s+please)?[.!?]*$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (!match) continue;
    const query = collapseWhitespace(match[1]);
    if (query) return query;
  }

  return '';
}

function isDirectCommandTranscript(transcript) {
  return Boolean(matchYouTubeSearchCommand(transcript) || parseSummarizeCommand(transcript));
}

function extractWakeCommand(transcript, wakeWord) {
  const normalizedWake = collapseWhitespace(wakeWord).toLowerCase();
  const normalizedTranscript = collapseWhitespace(transcript).toLowerCase();

  if (!normalizedWake) return { heardWake: true, commandText: transcript };

  let index = normalizedTranscript.indexOf(normalizedWake);
  let matchedLength = normalizedWake.length;

  // Whisper often mishears "vox" as "box" or "fox". Accept those for default wake word.
  if (index === -1 && normalizedWake === 'hey vox') {
    const aliasRegex = /\bhey\s+(vox|box|fox|voks|vax)\b/i;
    const match = normalizedTranscript.match(aliasRegex);
    if (match?.index !== undefined) {
      index = match.index;
      matchedLength = match[0].length;
    }
  }

  if (index === -1) {
    return { heardWake: false, commandText: '' };
  }

  const afterWake = transcript
    .slice(index + matchedLength)
    .replace(/^[,\s:;.-]+/, '')
    .trim();

  return { heardWake: true, commandText: afterWake };
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

export function useWhisperVoiceAgent(settings) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const recorderMimeTypeRef = useRef('audio/webm');
  const shouldListenRef = useRef(false);
  const cycleStopTimerRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const busyRef = useRef(false);
  const startingRef = useRef(false);
  const awaitingCommandUntilRef = useRef(0);
  const wakeWordRef = useRef((settings.wakeWord || 'hey vox').toLowerCase());

  useEffect(() => {
    wakeWordRef.current = collapseWhitespace(settings.wakeWord || 'hey vox').toLowerCase();
  }, [settings.wakeWord]);

  const speak = useCallback((text) => {
    const utteranceText = collapseWhitespace(text);
    if (!utteranceText || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, []);

  const bumpCommandStat = useCallback(() => {
    chrome.storage.local.get(['voxsurfStats'], (result) => {
      const stats = result.voxsurfStats || {};
      chrome.storage.local.set({
        voxsurfStats: {
          ...stats,
          commandsExecuted: (stats.commandsExecuted || 0) + 1,
        },
      });
    });
  }, []);

  const transcribeChunk = useCallback(
    async (audioBlob) => {
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioBase64 = arrayBufferToBase64(audioBuffer);
      const response = await sendRuntimeMessage({
        type: 'OPENAI_WHISPER_TRANSCRIBE',
        openaiKey: settings.openaiKey,
        audioBase64,
        audioType: audioBlob.type || recorderMimeTypeRef.current || 'audio/webm',
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Whisper transcription failed');
      }

      return collapseWhitespace(response.transcript || '');
    },
    [settings.openaiKey]
  );

  const summarizeSection = useCallback(
    async (sectionRequest) => {
      const { text: sectionText, resolvedLabel } = extractSectionTextFromPage(sectionRequest);
      if (!sectionText) {
        const fallback = 'I could not find enough text for that section.';
        setLastResponse(fallback);
        speak(fallback);
        return;
      }

      const response = await sendRuntimeMessage({
        type: 'OPENAI_SUMMARIZE_SECTION',
        openaiKey: settings.openaiKey,
        sectionText,
        sectionLabel: resolvedLabel || sectionRequest?.sectionLabel || 'this section',
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to summarize section');
      }

      const summary = collapseWhitespace(response.summary || '');
      if (!summary) {
        throw new Error('Summary response was empty');
      }

      setLastResponse(summary);
      speak(summary.slice(0, 320));
    },
    [settings.openaiKey, speak]
  );

  const executeCommand = useCallback(
    async (rawCommand) => {
      const command = collapseWhitespace(rawCommand);
      if (!command) return;

      setLastCommand(command);
      setError('');

      const query = matchYouTubeSearchCommand(command);
      if (query) {
        bumpCommandStat();
        speak(`Searching YouTube for ${query}`);
        window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        return;
      }

      const summarizeRequest = parseSummarizeCommand(command);
      if (summarizeRequest) {
        bumpCommandStat();
        const spokenTarget = summarizeRequest.sectionLabel || 'this section';
        speak(`Summarizing ${spokenTarget}.`);
        await summarizeSection(summarizeRequest);
        return;
      }

      speak('I heard you, but I only support YouTube search and section summary right now.');
    },
    [bumpCommandStat, speak, summarizeSection]
  );

  const processTranscript = useCallback(
    async (transcript) => {
      if (!transcript) return;

      const now = Date.now();
      const { heardWake, commandText } = extractWakeCommand(transcript, wakeWordRef.current);
      const inFollowUpWindow = now < awaitingCommandUntilRef.current;
      const directCommand = isDirectCommandTranscript(transcript);

      // Ignore ambient speech that isn't wake-word or a clear command.
      if (!heardWake && !inFollowUpWindow && !directCommand) {
        return;
      }

      setLastHeard(transcript);

      if (heardWake) {
        awaitingCommandUntilRef.current = now + FOLLOW_UP_WINDOW_MS;
        if (commandText) {
          await executeCommand(commandText);
          awaitingCommandUntilRef.current = 0;
        } else {
          speak('Hi, how may I help you?');
        }
        return;
      }

      if (directCommand || inFollowUpWindow) {
        await executeCommand(transcript);
        awaitingCommandUntilRef.current = 0;
      }
    },
    [executeCommand, speak]
  );

  const onChunk = useCallback(
    async (blob) => {
      if (!settings.voiceEnabled || !settings.openaiKey) return;
      if (!blob || blob.size < MIN_BLOB_BYTES) return;
      if (busyRef.current) return;
      if (document.visibilityState !== 'visible') return;

      busyRef.current = true;
      setIsProcessing(true);

      try {
        const transcript = await transcribeChunk(blob);
        setError('');
        if (transcript) {
          await processTranscript(transcript);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Voice agent error';
        setError(message);
        console.error('VoxSurf Whisper voice agent error:', err);
      } finally {
        busyRef.current = false;
        setIsProcessing(false);
      }
    },
    [settings.voiceEnabled, settings.openaiKey, transcribeChunk, processTranscript]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    chunkBufferRef.current = [];
    if (cycleStopTimerRef.current) {
      window.clearTimeout(cycleStopTimerRef.current);
      cycleStopTimerRef.current = null;
    }

    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (error) {
        // Ignore stop errors.
      }
    }

    const stream = streamRef.current;
    streamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setIsListening(false);
    setIsProcessing(false);
    startingRef.current = false;
  }, []);

  const startListening = useCallback(async () => {
    if (window.top !== window) return;
    if (!settings.voiceEnabled || !settings.openaiKey) return;
    if (recorderRef.current || startingRef.current) return;

    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('MediaRecorder is not supported in this browser');
      return;
    }

    startingRef.current = true;
    shouldListenRef.current = true;
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeCandidates.find((candidate) =>
        typeof MediaRecorder.isTypeSupported === 'function'
          ? MediaRecorder.isTypeSupported(candidate)
          : false
      );

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderMimeTypeRef.current = recorder.mimeType || mimeType || 'audio/webm';

      const beginCaptureCycle = () => {
        const activeRecorder = recorderRef.current;
        if (!activeRecorder || activeRecorder !== recorder || !shouldListenRef.current) return;
        if (activeRecorder.state !== 'inactive') return;

        chunkBufferRef.current = [];
        try {
          activeRecorder.start();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to start microphone recording');
          return;
        }

        setIsListening(true);
        cycleStopTimerRef.current = window.setTimeout(() => {
          const currentRecorder = recorderRef.current;
          if (!currentRecorder || currentRecorder !== recorder) return;
          if (currentRecorder.state === 'recording') {
            try {
              currentRecorder.stop();
            } catch (error) {
              // Ignore stop errors.
            }
          }
        }, CHUNK_MS);
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunkBufferRef.current.push(event.data);
        }
      };
      recorder.onerror = (event) => {
        setError(event.error?.message || 'Microphone recording error');
      };
      recorder.onstop = async () => {
        if (cycleStopTimerRef.current) {
          window.clearTimeout(cycleStopTimerRef.current);
          cycleStopTimerRef.current = null;
        }

        const chunks = chunkBufferRef.current;
        chunkBufferRef.current = [];

        if (chunks.length > 0) {
          const cycleBlob = new Blob(chunks, { type: recorderMimeTypeRef.current });
          await onChunk(cycleBlob);
        }

        if (shouldListenRef.current && recorderRef.current === recorder && streamRef.current) {
          beginCaptureCycle();
          return;
        }

        setIsListening(false);
      };

      recorderRef.current = recorder;
      beginCaptureCycle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      console.error('Failed to start VoxSurf voice agent:', err);
      stopListening();
    } finally {
      startingRef.current = false;
    }
  }, [onChunk, settings.voiceEnabled, settings.openaiKey, stopListening]);

  useEffect(() => {
    if (settings.voiceEnabled && settings.openaiKey) {
      startListening();
    } else {
      stopListening();
    }

    return () => stopListening();
  }, [settings.voiceEnabled, settings.openaiKey, startListening, stopListening]);

  return {
    isListening,
    isProcessing,
    lastHeard,
    lastCommand,
    lastResponse,
    error,
  };
}
