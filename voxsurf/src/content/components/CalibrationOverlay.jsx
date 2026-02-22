import React, { useState, useEffect } from 'react';

const glassBase = {
  background: 'rgba(20, 20, 35, 0.65)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
};

export default function CalibrationOverlay({ isActive, mode = 'hand', onComplete, onCancel }) {
  const [currentPoint, setCurrentPoint] = useState(0);
  const [isCollecting, setIsCollecting] = useState(false);

  const calibrationPoints = [
    { x: 0.1, y: 0.1, label: '1' },
    { x: 0.5, y: 0.1, label: '2' },
    { x: 0.9, y: 0.1, label: '3' },
    { x: 0.1, y: 0.5, label: '4' },
    { x: 0.5, y: 0.5, label: '5' },
    { x: 0.9, y: 0.5, label: '6' },
    { x: 0.1, y: 0.9, label: '7' },
    { x: 0.5, y: 0.9, label: '8' },
    { x: 0.9, y: 0.9, label: '9' },
  ];

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      setIsCollecting(true);
      setTimeout(() => {
        setIsCollecting(false);
        if (currentPoint < calibrationPoints.length - 1) {
          setCurrentPoint(currentPoint + 1);
        } else {
          onComplete();
        }
      }, 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isActive, currentPoint]);

  if (!isActive) return null;

  const current = calibrationPoints[currentPoint];
  const screenX = current.x * window.innerWidth;
  const screenY = current.y * window.innerHeight;
  const accentColor = isCollecting ? '#34C759' : '#007AFF';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2147483646,
        pointerEvents: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
      }}
    >
      {/* Calibration dot */}
      <div
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: 'translate(-50%, -50%)',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: `2px solid ${accentColor}`,
          background: isCollecting
            ? 'rgba(52, 199, 89, 0.12)'
            : 'rgba(0, 122, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 600,
          color: 'white',
          boxShadow: `0 0 24px ${accentColor}50, 0 0 48px ${accentColor}20`,
          animation: isCollecting ? 'calibPulse 1.2s ease-in-out infinite' : 'none',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {current.label}
      </div>

      {/* Center info card */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          ...glassBase,
          borderRadius: '16px',
          padding: '20px 32px',
          minWidth: '280px',
        }}
      >
        <div style={{ color: 'white', fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
          Point {currentPoint + 1} of {calibrationPoints.length}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: '1.4' }}>
          {isCollecting
            ? 'Hold steady while we capture tracking data...'
            : 'Move your hand cursor onto the dot.'}
        </div>
        {/* Progress bar */}
        <div style={{
          marginTop: '12px',
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '3px',
            borderRadius: '2px',
            background: '#007AFF',
            width: `${((currentPoint + (isCollecting ? 0.5 : 0)) / calibrationPoints.length) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          ...glassBase,
          background: 'rgba(255, 59, 48, 0.15)',
          border: '1px solid rgba(255, 59, 48, 0.3)',
          borderRadius: '12px',
          color: '#FF3B30',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        Cancel
      </button>

      <style>
        {`
          @keyframes calibPulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.12);
              opacity: 0.85;
            }
          }
        `}
      </style>
    </div>
  );
}
