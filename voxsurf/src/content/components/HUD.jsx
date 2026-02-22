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

const glassBase = {
  background: 'rgba(20, 20, 35, 0.65)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
};

const dividerStyle = {
  height: '1px',
  background: 'rgba(255, 255, 255, 0.06)',
  margin: '0',
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
          style={{
            ...glassBase,
            padding: '8px 16px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isTracking ? '#34C759' : 'rgba(255,255,255,0.2)',
          }} />
          VoxSurf
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
  const voiceColor = !voiceEnabled
    ? 'rgba(255,255,255,0.3)'
    : voiceError
      ? '#FF3B30'
      : voiceProcessing
        ? '#FFCC00'
        : voiceListening
          ? '#34C759'
          : 'rgba(255,255,255,0.5)';
  const heardPreview = (voiceLastHeard || '').trim();

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  };

  const labelStyle = {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.55)',
    fontWeight: 400,
  };

  return (
    <div
      ref={hudRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        ...position,
        width: '300px',
        ...glassBase,
        padding: '16px',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        color: '#FFFFFF',
        fontSize: '13px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>VoxSurf</span>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Status rows */}
      <div style={rowStyle}>
        <span style={labelStyle}>Camera</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500 }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isTracking ? '#34C759' : '#FF3B30',
          }} />
          <span style={{ color: isTracking ? '#34C759' : '#FF3B30' }}>
            {isTracking ? 'Active' : 'Off'}
          </span>
        </span>
      </div>

      <div style={dividerStyle} />

      <div style={rowStyle}>
        <span style={labelStyle}>Gesture</span>
        <span style={{ color: '#007AFF', fontSize: '13px', fontWeight: 500 }}>{gestureText}</span>
      </div>

      <div style={dividerStyle} />

      <div style={rowStyle}>
        <span style={labelStyle}>Mode</span>
        <span style={{ color: '#34C759', fontSize: '13px', fontWeight: 500 }}>{modeLabel}</span>
      </div>

      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', padding: '4px 0 8px', lineHeight: '1.4' }}>
        {modeHint}
      </div>

      <div style={dividerStyle} />

      {/* Voice section */}
      <div style={{ ...rowStyle, paddingTop: '10px' }}>
        <span style={labelStyle}>Voice</span>
        <span style={{ color: voiceColor, fontSize: '13px', fontWeight: 500 }}>{voiceStatus}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', paddingBottom: '4px' }}>
        Wake: <span style={{ color: '#007AFF' }}>{settings.wakeWord || 'hey vox'}</span>
      </div>
      {heardPreview && (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', paddingBottom: '4px' }}>
          Heard: <span style={{ color: '#34C759' }}>{heardPreview.slice(0, 80)}</span>
        </div>
      )}
      {voiceError && (
        <div style={{ fontSize: '11px', color: '#FF3B30', paddingBottom: '4px' }}>
          {voiceError}
        </div>
      )}

      {/* Dwell progress */}
      {isDwelling && (
        <div style={{ paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Dwell click</div>
          <div style={{
            width: '100%',
            height: '3px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '3px',
              borderRadius: '2px',
              background: '#007AFF',
              width: `${Math.round(dwellProgress * 100)}%`,
              transition: 'width 0.08s linear',
              boxShadow: '0 0 8px rgba(0, 122, 255, 0.4)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
