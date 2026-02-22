import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoice(settings) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const recognitionRef = useRef(null);
  const wakeWordRef = useRef(settings.wakeWord || '');
  // Counter to ensure each final transcript update is unique for useCommands
  const transcriptIdRef = useRef(0);

  useEffect(() => {
    wakeWordRef.current = settings.wakeWord || '';
  }, [settings.wakeWord]);

  const startListening = useCallback(() => {
    if (!settings.voiceEnabled || isSleeping) return;

    // Stop any existing recognition first to prevent abort loops
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    // Non-continuous: each utterance is a clean session (no accumulation).
    // Recognition stops after each finalized result, onend restarts it.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      // Only process the LATEST result segment, not all accumulated results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      // Show interim text for display only (HUD), NOT for command processing
      if (interim) {
        setInterimTranscript(interim);
      }

      if (finalTranscript) {
        setInterimTranscript('');
        handleCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Continue listening - don't stop
      } else if (event.error === 'aborted') {
        // Don't retry aborted — it means we intentionally stopped or a new one replaced it
        setIsListening(false);
      } else if (event.error === 'not-allowed') {
        setIsListening(false);
      } else {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Only restart if this is still the active recognition instance
      if (recognitionRef.current === recognition && settings.voiceEnabled && !isSleeping) {
        recognitionRef.current = null; // Clear ref before restart
        setTimeout(() => {
          if (settings.voiceEnabled && !isSleeping && !recognitionRef.current) {
            startListening();
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      recognitionRef.current = null;
    }
  }, [settings.voiceEnabled, isSleeping]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const handleCommand = async (transcript) => {
    // Check for wake word
    if (wakeWordRef.current && !transcript.toLowerCase().includes(wakeWordRef.current.toLowerCase())) {
      return;
    }

    // Remove wake word from transcript
    let cleanTranscript = transcript;
    if (wakeWordRef.current) {
      cleanTranscript = transcript.replace(new RegExp(wakeWordRef.current, 'gi'), '').trim();
    }

    // Tier 1: Local pattern matching (instant)
    const localCommand = matchLocalCommand(cleanTranscript);
    if (localCommand) {
      executeLocalCommand(localCommand);
      // Do NOT update lastTranscript — Tier 1 commands are handled here,
      // they should NOT also be sent to useCommands/AI
      return;
    }

    // Tier 2: AI processing — update lastTranscript so useCommands picks it up
    // Append unique ID to ensure React detects the change even if same text repeated
    transcriptIdRef.current++;
    setLastTranscript(cleanTranscript);
    setIsProcessing(true);
    // Reset processing after a delay (useCommands will handle actual processing)
    setTimeout(() => setIsProcessing(false), 2000);
  };

  const matchLocalCommand = (transcript) => {
    const lower = transcript.toLowerCase();
    
    if (lower.includes('sleep')) return { action: 'sleep' };
    if (lower.includes('wake up') || lower.includes('wake')) return { action: 'wake' };
    if (lower.includes('scroll down')) return { action: 'scroll', direction: 'down' };
    if (lower.includes('scroll up')) return { action: 'scroll', direction: 'up' };
    if (lower.includes('scroll to top')) return { action: 'scroll', direction: 'top' };
    if (lower.includes('scroll to bottom')) return { action: 'scroll', direction: 'bottom' };
    if (lower.includes('go back')) return { action: 'navigate', target: 'back' };
    if (lower.includes('go forward')) return { action: 'navigate', target: 'forward' };
    if (lower.includes('reload')) return { action: 'reload' };
    if (lower.includes('close tab')) return { action: 'closeTab' };
    if (lower.includes('new tab')) return { action: 'newTab' };
    if (lower.includes('pause reading')) return { action: 'pauseReading' };
    if (lower.includes('resume reading')) return { action: 'resumeReading' };
    if (lower.includes('minimize hud') || lower.includes('hide hud')) return { action: 'minimizeHUD' };
    if (lower.includes('show hud') || lower.includes('maximize hud')) return { action: 'showHUD' };

    // Click at cursor position — match "click", "click that", "click this", "click here", "click it"
    if (/\bclick\b/.test(lower)) return { action: 'clickAtCursor' };

    // Tab navigation
    if (lower.includes('next tab')) return { action: 'nextTab' };
    if (lower.includes('previous tab') || lower.includes('prev tab')) return { action: 'prevTab' };

    // Zoom
    if (lower.includes('zoom in')) return { action: 'zoomIn' };
    if (lower.includes('zoom out')) return { action: 'zoomOut' };
    if (lower.includes('reset zoom') || lower.includes('normal zoom')) return { action: 'zoomReset' };

    // Stop / cancel
    if (lower.includes('stop') || lower.includes('cancel')) return { action: 'stop' };

    // Error recovery commands
    if (lower.includes('undo')) return { action: 'undo' };
    if (lower.includes('repeat that') || lower.includes('do that again')) return { action: 'repeat' };
    if (lower.includes('what can i do here') || lower.includes('help')) return { action: 'contextualHelp' };
    if (lower.includes("i'm lost") || lower.includes('where am i')) return { action: 'describePage' };
    
    return null;
  };

  const executeLocalCommand = (command) => {
    switch (command.action) {
      case 'sleep':
        setIsSleeping(true);
        stopListening();
        speak('Going to sleep. Say wake up to activate.');
        break;
      case 'wake':
        setIsSleeping(false);
        startListening();
        speak('Awake and listening.');
        break;
      case 'scroll':
        const amount = command.direction === 'down' ? 300 : command.direction === 'up' ? -300 : 0;
        if (command.direction === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (command.direction === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: amount, behavior: 'smooth' });
        }
        speak(`Scrolling ${command.direction}`);
        break;
      case 'navigate':
        if (command.target === 'back') {
          window.history.back();
          speak('Going back');
        } else if (command.target === 'forward') {
          window.history.forward();
          speak('Going forward');
        }
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'closeTab':
        chrome.runtime.sendMessage({ type: 'CLOSE_TAB' });
        break;
      case 'newTab':
        chrome.runtime.sendMessage({ type: 'NEW_TAB' });
        break;
      case 'pauseReading':
      case 'resumeReading':
        // Handled by useReader
        break;
      case 'clickAtCursor':
        // Dispatch event — useGesture's cursor position determines the click target
        document.dispatchEvent(new CustomEvent('voxsurf:click-at-cursor', { composed: true }));
        speak('Clicking');
        break;
      case 'nextTab':
        chrome.runtime.sendMessage({ type: 'NEXT_TAB' });
        speak('Next tab');
        break;
      case 'prevTab':
        chrome.runtime.sendMessage({ type: 'PREV_TAB' });
        speak('Previous tab');
        break;
      case 'zoomIn':
        document.body.style.zoom = (parseFloat(document.body.style.zoom || '1') + 0.1).toFixed(1);
        speak('Zooming in');
        break;
      case 'zoomOut':
        document.body.style.zoom = (Math.max(0.3, parseFloat(document.body.style.zoom || '1') - 0.1)).toFixed(1);
        speak('Zooming out');
        break;
      case 'zoomReset':
        document.body.style.zoom = '1';
        speak('Zoom reset');
        break;
      case 'stop':
        window.stop();
        speechSynthesis.cancel();
        speak('Stopped');
        break;
      case 'undo':
        document.dispatchEvent(new CustomEvent('voxsurf:undo'));
        speak('Undoing last action');
        break;
      case 'repeat':
        document.dispatchEvent(new CustomEvent('voxsurf:repeat'));
        speak('Repeating last command');
        break;
      case 'contextualHelp':
        document.dispatchEvent(new CustomEvent('voxsurf:contextual-help'));
        speak('Getting help for this page');
        break;
      case 'describePage':
        const pageInfo = `${document.title} at ${window.location.href}`;
        speak(`You are on ${pageInfo}`);
        break;
      default:
        break;
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (settings.voiceEnabled && !isSleeping) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [settings.voiceEnabled, isSleeping, startListening, stopListening]);

  return {
    isListening,
    lastTranscript,
    interimTranscript,
    lastCommand,
    confidence,
    isProcessing,
    isSleeping,
    startListening,
    stopListening,
    speak,
  };
}
