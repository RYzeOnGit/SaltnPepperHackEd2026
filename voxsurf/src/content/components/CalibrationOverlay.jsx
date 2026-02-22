import React, { useState, useEffect } from 'react';

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

    // Start collecting data for current point after a delay
    const timer = setTimeout(() => {
      setIsCollecting(true);
      // Collect for 2 seconds
      setTimeout(() => {
        setIsCollecting(false);
        if (currentPoint < calibrationPoints.length - 1) {
          setCurrentPoint(currentPoint + 1);
        } else {
          // Calibration complete
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 2147483646,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${screenX}px`,
          top: `${screenY}px`,
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: `4px solid ${isCollecting ? '#10B981' : '#3B82F6'}`,
          backgroundColor: isCollecting ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          boxShadow: `0 0 30px ${isCollecting ? '#10B981' : '#3B82F6'}`,
          animation: isCollecting ? 'pulse 1s ease-in-out infinite' : 'none',
        }}
      >
        {current.label}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          fontSize: '18px',
          marginTop: '100px',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          Point {currentPoint + 1} of {calibrationPoints.length}
        </div>
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
          {isCollecting
            ? 'Hold your hand steady on the dot while we collect tracking data...'
            : 'Move your hand so the cursor lands on each dot.'}
        </div>
      </div>

      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          backgroundColor: '#EF4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Cancel
      </button>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.8;
            }
          }
        `}
      </style>
    </div>
  );
}
