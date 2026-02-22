import React, { useState, useEffect, useRef } from 'react';

const GESTURE_LABELS = {
  pinch: 'Pinch action',
  point: 'Pointing cursor',
  'scroll-up': 'Two-finger up',
  'scroll-down': 'Two-finger down',
  'shorts-prev': 'Shorts previous',
  'yt-forward': 'YouTube +10s',
  'yt-backward': 'YouTube -10s',
  'yt-vol-up': 'YouTube volume up',
  'yt-vol-down': 'YouTube volume down',
  'yt-fullscreen': 'YouTube fullscreen',
  'dino-duck': 'Dino duck hold',
  palm: 'Palm mute toggle',
  thumbsup: 'Thumbs up back',
  fist: 'Fist grab scroll',
  'three-finger': 'Three-finger swipe',
  none: 'Waiting for hand',
};

const MODE_LABELS = {
  browser: 'Browser',
  youtube: 'YouTube',
  'youtube-shorts': 'YouTube Shorts',
  instagram: 'Instagram Reels',
  dino: 'Dino',
};

const MODE_HINTS = {
  browser: 'Point + pinch click. Use fist and move hand up/down for smooth scroll. Tabs: Alt+Shift+L/H.',
  youtube: 'Point then pinch to click any UI (results, videos, buttons). Pinch empty area play/pause, 2-finger up +10s, thumb+pinky -10s, 3-finger up/down volume, rock sign fullscreen, palm mute.',
  'youtube-shorts': 'Point + pinch acts like mouse click. Two-finger up = next short, thumb+pinky out = previous short.',
  instagram: 'Point to controls, pinch to click play/mute. Use fist up/down to move reels.',
  dino: 'Pinch to jump, 2 fingers hold duck, hold-pinch on UI to click mode buttons.',
};

export default function HUD({
  settings,
  isTracking,
  activeGesture,
  isDwelling,
  dwellProgress,
  contextMode,
  voiceEnabled,
  voiceListening,
  voiceProcessing,
  voiceLastHeard,
  voiceError,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ top: '10px', right: '10px', bottom: 'auto', left: 'auto' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hudRef = useRef(null);

  useEffect(() => {
    chrome.storage.local.get(['hudPosition'], (result) => {
      if (result.hudPosition) {
        setPosition(result.hudPosition);
      }
    });
  }, []);

  const savePosition = (newPosition) => {
    setPosition(newPosition);
    chrome.storage.local.set({ hudPosition: newPosition });
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDragging(true);
    const rect = hudRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      savePosition({
        top: `${Math.max(8, newY)}px`,
        left: `${Math.max(8, newX)}px`,
        right: 'auto',
        bottom: 'auto',
      });
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

  if (!settings.handEnabled) {
    return null;
  }

  if (isMinimized) {
    return (
      <div ref={hudRef} style={{ position: 'fixed', ...position, zIndex: 2147483647, pointerEvents: 'auto' }}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-indigo-600 text-white px-3 py-2 rounded shadow-lg hover:bg-indigo-700"
        >
          Show Hand HUD
        </button>
      </div>
    );
  }

  const gestureText = GESTURE_LABELS[activeGesture] || 'Tracking hand';
  const modeLabel = MODE_LABELS[contextMode] || 'Browser';
  const modeHint = MODE_HINTS[contextMode] || MODE_HINTS.browser;
  const voiceStatus = !voiceEnabled
    ? 'Disabled'
    : voiceError
      ? 'Error'
      : voiceProcessing
        ? 'Processing'
        : voiceListening
          ? 'Listening'
          : 'Idle';
  const voiceStatusClass = !voiceEnabled
    ? 'text-gray-400'
    : voiceError
      ? 'text-red-400'
      : voiceProcessing
        ? 'text-yellow-300'
        : voiceListening
          ? 'text-green-400'
          : 'text-gray-300';
  const heardPreview = (voiceLastHeard || '').trim();

  return (
    <div
      ref={hudRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        ...position,
        width: '320px',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '8px',
        padding: '14px',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        color: '#FFFFFF',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base">VoxSurf Hands</h3>
        <button onClick={() => setIsMinimized(true)} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Camera tracking</span>
          <span className={isTracking ? 'text-green-400' : 'text-red-400'}>{isTracking ? 'Active' : 'Not tracking'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Gesture</span>
          <span className="text-indigo-300">{gestureText}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Mode</span>
          <span className="text-emerald-300">{modeLabel}</span>
        </div>

        <div className="text-xs text-gray-400 pt-1">{modeHint}</div>

        <div className="pt-2 border-t border-gray-700/60">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Voice</span>
            <span className={voiceStatusClass}>{voiceStatus}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Wake word: <span className="text-indigo-300">{settings.wakeWord || 'hey vox'}</span>
          </div>
          {heardPreview && (
            <div className="text-xs text-gray-400 mt-1">
              Heard: <span className="text-emerald-300">{heardPreview.slice(0, 80)}</span>
            </div>
          )}
          {voiceError && (
            <div className="text-xs text-red-300 mt-1">
              {voiceError}
            </div>
          )}
        </div>

        {isDwelling && (
          <div className="pt-2">
            <div className="text-xs text-gray-400 mb-1">Dwell click charge</div>
            <div className="w-full h-2 rounded bg-gray-700 overflow-hidden">
              <div
                className="h-2 bg-blue-500 transition-all duration-75"
                style={{ width: `${Math.round(dwellProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
