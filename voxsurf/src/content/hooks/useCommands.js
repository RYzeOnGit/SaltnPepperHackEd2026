import { useEffect, useRef, useCallback } from 'react';
import { useReader } from './useReader';

export function useCommands(voice, gazeTarget, overlay, settings, ai) {
  const reader = useReader(settings);
  const commandHistoryRef = useRef([]);
  const statsRef = useRef({
    commandsExecuted: 0,
    clicksByGaze: 0,
    clicksByVoice: 0,
  });

  const activeChallengeRef = useRef(null);

  // Listen for challenge start
  useEffect(() => {
    const listener = (message) => {
      if (message.type === 'START_CHALLENGE') {
        activeChallengeRef.current = message.challengeId;
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const checkChallengeCompletion = useCallback((action, gazeTarget) => {
    if (!activeChallengeRef.current) return;

    const challengeId = activeChallengeRef.current;
    let completed = false;

    // Challenge 1: First voice command
    if (challengeId === 1 && action && action.action) {
      completed = true;
    }
    // Challenge 2: Navigate to website
    else if (challengeId === 2 && action?.action === 'navigate') {
      completed = true;
    }
    // Challenge 3: Gaze highlight (handled by gazeTarget changes)
    else if (challengeId === 3 && gazeTarget?.gazeTarget) {
      completed = true;
    }
    // Challenge 4: Wink click (handled by gesture)
    else if (challengeId === 4 && action?.action === 'click' && action.source === 'wink') {
      completed = true;
    }
    // Challenge 5: Voice click
    else if (challengeId === 5 && action?.action === 'click' && action.source === 'voice') {
      completed = true;
    }
    // Challenge 6: Read page
    else if (challengeId === 6 && action?.action === 'read') {
      completed = true;
    }
    // Challenge 7: Page summary
    else if (challengeId === 7 && action?.action === 'summarize') {
      completed = true;
    }
    // Challenge 8: Fill form
    else if (challengeId === 8 && action?.action === 'type') {
      completed = true;
    }
    // Challenge 9: Head cursor (handled by gesture movement)
    else if (challengeId === 9 && action?.action === 'cursor_move') {
      completed = true;
    }
    // Challenge 10: Complete workflow (requires multiple actions)
    else if (challengeId === 10) {
      // Track workflow completion separately
      return;
    }

    if (completed) {
      document.dispatchEvent(new CustomEvent('voxsurf:challenge-complete', {
        detail: { challengeId },
      }));
      activeChallengeRef.current = null;
    }
  }, []);

  const executeAction = useCallback(async (action) => {
    // Dispatch command result
    document.dispatchEvent(new CustomEvent('voxsurf:command-result', {
      detail: {
        confidence: action?.confidence || null,
        success: null, // Will be set after execution
      },
    }));

    if (!action || action.confidence < 0.6) {
      if (action?.spoken_confirmation) {
        reader.read(action.spoken_confirmation);
      }
      document.dispatchEvent(new CustomEvent('voxsurf:command-result', {
        detail: { success: false },
      }));
      return;
    }

    // Speak confirmation
    if (action.spoken_confirmation) {
      reader.read(action.spoken_confirmation);
    }

    let success = true;

    // Execute action
    switch (action.action) {
      case 'click':
        if (action.target) {
          const element = overlay.elements.find((e) => e.index === action.target);
          if (element) {
            element.element.click();
            statsRef.current.clicksByVoice++;
            checkChallengeCompletion({ ...action, source: 'voice' }, gazeTarget);
          }
        } else if (gazeTarget.gazeTarget) {
          gazeTarget.gazeTarget.click();
          statsRef.current.clicksByGaze++;
          checkChallengeCompletion({ ...action, source: 'gaze' }, gazeTarget);
        }
        break;

      case 'type':
        if (gazeTarget.gazeTarget && (gazeTarget.gazeTarget.tagName === 'INPUT' || gazeTarget.gazeTarget.tagName === 'TEXTAREA')) {
          const input = gazeTarget.gazeTarget;
          input.focus();
          input.value = action.value || '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          checkChallengeCompletion(action, gazeTarget);
        }
        break;

      case 'scroll':
        const direction = action.value?.toLowerCase() || 'down';
        const amount = direction === 'down' ? 300 : direction === 'up' ? -300 : 0;
        window.scrollBy({ top: amount, behavior: 'smooth' });
        break;

      case 'navigate':
        if (action.value) {
          window.location.href = action.value;
          checkChallengeCompletion(action, gazeTarget);
        }
        break;

      case 'read':
        if (gazeTarget.gazeTarget) {
          reader.readElement(gazeTarget.gazeTarget);
        } else {
          reader.readPage();
        }
        checkChallengeCompletion(action, gazeTarget);
        break;

      case 'summarize':
        try {
          if (gazeTarget.gazeTarget) {
            const text = gazeTarget.gazeTarget.textContent || '';
            const summary = await ai.summarizePage(text, true); // Stream enabled
            if (summary.streaming) {
              // Handle streaming summary - create async generator
              const streamGenerator = (async function* () {
                yield summary.summary;
              })();
              reader.readStreaming(streamGenerator);
            } else {
              reader.read(summary.summary || summary);
            }
          } else {
            const pageText = reader.extractPageText();
            const summary = await ai.summarizePage(pageText, true);
            if (summary.streaming) {
              // Handle streaming summary - create async generator
              const streamGenerator = (async function* () {
                yield summary.summary;
              })();
              reader.readStreaming(streamGenerator);
            } else {
              reader.read(summary.summary || summary);
            }
          }
        } catch (error) {
          console.error('Summarize error:', error);
          success = false;
        }
        break;

      default:
        break;
    }

    // Dispatch final result
    document.dispatchEvent(new CustomEvent('voxsurf:command-result', {
      detail: { success },
    }));

    // Update stats
    statsRef.current.commandsExecuted++;
    chrome.storage.local.set({ voxsurfStats: statsRef.current });

    // Check challenge completion for voice commands
    if (action.action) {
      checkChallengeCompletion(action, gazeTarget);
    }

    // Add to history
    commandHistoryRef.current.push(action);
    if (commandHistoryRef.current.length > 5) {
      commandHistoryRef.current.shift();
    }
  }, [gazeTarget, overlay, reader, ai, checkChallengeCompletion]);

  const processCommand = useCallback(async (transcript) => {
    if (!transcript || !transcript.trim()) return;

    const context = {
      url: window.location.href,
      title: document.title,
      elements: overlay.elements,
      gazeTarget: gazeTarget.gazeTarget ? {
        index: gazeTarget.gazeTargetIndex,
        text: gazeTarget.gazeTargetLabel,
        type: gazeTarget.gazeTarget.tagName?.toLowerCase() || 'unknown',
      } : null,
      recentCommands: commandHistoryRef.current.map((c) => c.action),
    };

    try {
      const action = await ai.understandCommand(transcript, context);
      await executeAction(action);
    } catch (error) {
      console.error('Command processing error:', error);
      reader.read('Sorry, I encountered an error processing that command.');
      document.dispatchEvent(new CustomEvent('voxsurf:command-result', {
        detail: { success: false },
      }));
    }
  }, [gazeTarget, overlay, ai, reader, executeAction]);

  const lastProcessedRef = useRef('');

  useEffect(() => {
    if (!voice.lastTranscript || voice.lastTranscript === lastProcessedRef.current) return;
    
    lastProcessedRef.current = voice.lastTranscript;
    
    // Small delay to avoid processing the same transcript multiple times
    const timer = setTimeout(() => {
      processCommand(voice.lastTranscript);
    }, 100);

    return () => clearTimeout(timer);
  }, [voice.lastTranscript, processCommand]);

  // Track gaze target changes for challenge 3
  useEffect(() => {
    if (activeChallengeRef.current === 3 && gazeTarget.gazeTarget) {
      checkChallengeCompletion({ action: 'gaze_highlight' }, gazeTarget);
    }
  }, [gazeTarget.gazeTarget, checkChallengeCompletion]);

  return {
    executeAction,
    getCommandHistory: () => commandHistoryRef.current,
  };
}
