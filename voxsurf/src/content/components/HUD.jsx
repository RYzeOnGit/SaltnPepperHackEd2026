import React, { useState, useEffect, useRef } from 'react';

export default function HUD({ voice, gaze, gazeTarget, commands, settings, aiStatus, lastCommandConfidence, lastCommandSuccess, activeGesture }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [position, setPosition] = useState({ top: '10px', right: '10px', bottom: 'auto', left: 'auto' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hudRef = useRef(null);
  const [flashState, setFlashState] = useState(null); // 'success' | 'error' | null
  const waveformRef = useRef(null);

  // Detect dark mode
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Load position from storage
  useEffect(() => {
    chrome.storage.local.get(['hudPosition'], (result) => {
      if (result.hudPosition) {
        setPosition(result.hudPosition);
      }
    });
  }, []);

  // Save position to storage
  const savePosition = (newPosition) => {
    setPosition(newPosition);
    chrome.storage.local.set({ hudPosition: newPosition });
  };

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    const rect = hudRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handle drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Snap to corners
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const hudWidth = 320;
      const hudHeight = hudRef.current?.offsetHeight || 400;
      const snapThreshold = 50;

      let newPosition = { top: 'auto', right: 'auto', bottom: 'auto', left: 'auto' };

      // Top-left
      if (newX < snapThreshold && newY < snapThreshold) {
        newPosition = { top: '10px', left: '10px', right: 'auto', bottom: 'auto' };
      }
      // Top-right
      else if (newX > windowWidth - hudWidth - snapThreshold && newY < snapThreshold) {
        newPosition = { top: '10px', right: '10px', left: 'auto', bottom: 'auto' };
      }
      // Bottom-left
      else if (newX < snapThreshold && newY > windowHeight - hudHeight - snapThreshold) {
        newPosition = { bottom: '10px', left: '10px', top: 'auto', right: 'auto' };
      }
      // Bottom-right
      else if (newX > windowWidth - hudWidth - snapThreshold && newY > windowHeight - hudHeight - snapThreshold) {
        newPosition = { bottom: '10px', right: '10px', top: 'auto', left: 'auto' };
      }
      // Free position
      else {
        newPosition = {
          top: `${newY}px`,
          left: `${newX}px`,
          right: 'auto',
          bottom: 'auto',
        };
      }

      savePosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle voice commands for HUD
  useEffect(() => {
    const handleCommand = (e) => {
      const cmd = e.detail?.toLowerCase() || '';
      if (cmd.includes('minimize hud') || cmd.includes('hide hud')) {
        setIsMinimized(true);
      } else if (cmd.includes('show hud') || cmd.includes('maximize hud')) {
        setIsMinimized(false);
      } else if (cmd.includes('move hud top left')) {
        savePosition({ top: '10px', left: '10px', right: 'auto', bottom: 'auto' });
      } else if (cmd.includes('move hud top right')) {
        savePosition({ top: '10px', right: '10px', left: 'auto', bottom: 'auto' });
      } else if (cmd.includes('move hud bottom left')) {
        savePosition({ bottom: '10px', left: '10px', top: 'auto', right: 'auto' });
      } else if (cmd.includes('move hud bottom right')) {
        savePosition({ bottom: '10px', right: '10px', top: 'auto', left: 'auto' });
      }
    };

    document.addEventListener('voxsurf:command', handleCommand);
    return () => document.removeEventListener('voxsurf:command', handleCommand);
  }, []);

  // Flash animations
  useEffect(() => {
    if (lastCommandSuccess === true) {
      setFlashState('success');
      setTimeout(() => setFlashState(null), 500);
    } else if (lastCommandSuccess === false) {
      setFlashState('error');
      setTimeout(() => setFlashState(null), 1000);
    }
  }, [lastCommandSuccess]);

  // Animated waveform
  useEffect(() => {
    if (!voice.isListening || !waveformRef.current) return;

    const bars = waveformRef.current.querySelectorAll('.wave-bar');
    const interval = setInterval(() => {
      bars.forEach((bar, i) => {
        const height = 20 + Math.random() * 30;
        bar.style.height = `${height}%`;
        bar.style.transition = 'height 0.1s ease';
      });
    }, 100);

    return () => clearInterval(interval);
  }, [voice.isListening]);

  if (isMinimized) {
    return (
      <div
        ref={hudRef}
        style={{
          position: 'fixed',
          ...position,
          zIndex: 2147483647,
          pointerEvents: 'auto',
        }}
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-indigo-600 text-white px-3 py-2 rounded shadow-lg hover:bg-indigo-700"
        >
          Show HUD
        </button>
      </div>
    );
  }

  const bgColor = isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = isDarkMode ? 'white' : 'black';
  const borderColor = isDarkMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)';

  return (
    <>
      <style>
        {`
          @keyframes flashSuccess {
            0%, 100% { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
            50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3); }
          }
          @keyframes pulseError {
            0%, 100% { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); }
            25% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3); }
            50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.6), 0 4px 6px rgba(0, 0, 0, 0.3); }
            75% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3); }
          }
        `}
      </style>
      <div
        ref={hudRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          ...position,
          width: '320px',
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          padding: '16px',
          zIndex: 2147483647,
          pointerEvents: 'auto',
          color: textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '14px',
          boxShadow: flashState === 'success' 
            ? '0 0 20px rgba(16, 185, 129, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3)'
            : flashState === 'error'
            ? '0 0 20px rgba(239, 68, 68, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px rgba(0, 0, 0, 0.3)',
          animation: flashState === 'success' 
            ? 'flashSuccess 0.5s ease'
            : flashState === 'error'
            ? 'pulseError 1s ease'
            : 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">🎙️ VoxSurf</h3>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Mic Status with Waveform */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {voice.isListening ? (
                <div
                  ref={waveformRef}
                  className="flex items-end gap-1 h-8"
                  style={{ width: '40px' }}
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="wave-bar bg-indigo-500 rounded"
                      style={{
                        width: '4px',
                        height: '20%',
                        minHeight: '4px',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-gray-500" />
              )}
              <span className="text-sm">
                {voice.isListening ? 'Listening...' : 'Voice Inactive'}
              </span>
            </div>
          </div>

          {/* AI Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                aiStatus === 'thinking'
                  ? 'bg-yellow-400 animate-pulse'
                  : aiStatus === 'responding'
                  ? 'bg-blue-400 animate-pulse'
                  : 'bg-gray-400'
              }`}
            />
            <span className="text-sm">
              AI: {aiStatus === 'thinking' ? 'Thinking...' : aiStatus === 'responding' ? 'Responding...' : 'Idle'}
            </span>
          </div>

          {/* Eye Tracking Status */}
          {gaze.isTracking && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-sm">Eye tracking active</span>
            </div>
          )}

          {/* Hand Gesture Status */}
          {activeGesture && activeGesture !== 'none' && (
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {activeGesture === 'point' && '☝️'}
                {activeGesture === 'pinch' && '🤏'}
                {activeGesture === 'scroll' && '✌️'}
                {activeGesture === 'palm' && '✋'}
                {activeGesture === 'thumbsup' && '👍'}
                {activeGesture === 'fist' && '✊'}
                {activeGesture === 'three-finger' && '🤟'}
              </span>
              <span className="text-sm capitalize">
                {activeGesture === 'point' && 'Pointing — cursor'}
                {activeGesture === 'pinch' && 'Pinch — click'}
                {activeGesture === 'scroll' && 'V-scroll'}
                {activeGesture === 'palm' && 'Palm — paused'}
                {activeGesture === 'thumbsup' && 'Thumbs up — back'}
                {activeGesture === 'fist' && 'Fist — grab scroll'}
                {activeGesture === 'three-finger' && '3-finger swipe'}
              </span>
            </div>
          )}

          {/* Looking At - Real-time updates */}
          {gazeTarget.gazeTarget && (
            <div className={`p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Looking at:
              </div>
              <div className="font-medium">{gazeTarget.gazeTargetLabel}</div>
              {gazeTarget.gazeTargetIndex && (
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Label #{gazeTarget.gazeTargetIndex}
                </div>
              )}
            </div>
          )}

          {/* Interim transcript (live preview while speaking) */}
          {voice.interimTranscript && (
            <div className={`p-2 rounded text-sm italic ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
              🎤 {voice.interimTranscript}
            </div>
          )}

          {/* Last Command with Confidence Bar */}
          {voice.lastTranscript && (
            <div className={`p-2 rounded text-sm ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Last command:
              </div>
              <div className="mb-2">{voice.lastTranscript}</div>
              {lastCommandConfidence !== null && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Confidence</span>
                    <span>{(lastCommandConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full transition-all duration-300 ${
                        lastCommandConfidence > 0.8
                          ? 'bg-green-500'
                          : lastCommandConfidence > 0.6
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${lastCommandConfidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fixation Duration */}
          {gaze.isFixating && (
            <div className="text-xs text-green-400">
              Fixated for {Math.round(gaze.fixationDuration / 1000)}s
            </div>
          )}

          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className={`w-full px-3 py-2 rounded text-sm font-medium ${
              isDarkMode
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900'
            }`}
          >
            {showSuggestions ? 'Hide' : 'Show'} Suggestions
          </button>

          {showSuggestions && (
            <div className={`p-3 rounded text-sm space-y-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="font-medium mb-2">Quick Commands:</div>
              <div>"scroll down" / "scroll up"</div>
              <div>"click that" / "read this"</div>
              <div>"go back" / "reload"</div>
              <div>"summarize this"</div>
              <div>"what's on this page"</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
