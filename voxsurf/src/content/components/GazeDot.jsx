import React, { useState, useEffect, useRef, memo } from 'react';

function GazeDot({ gazeX, gazeY }) {
  const [trail, setTrail] = useState([]);
  const trailRef = useRef([]);

  useEffect(() => {
    trailRef.current.push({ x: gazeX, y: gazeY, timestamp: Date.now() });
    
    // Keep last 5 positions
    if (trailRef.current.length > 5) {
      trailRef.current.shift();
    }

    // Remove old positions (older than 200ms)
    const now = Date.now();
    trailRef.current = trailRef.current.filter((point) => now - point.timestamp < 200);

    setTrail([...trailRef.current]);
  }, [gazeX, gazeY]);

  return (
    <>
      {trail.map((point, index) => {
        const opacity = (index + 1) / trail.length * 0.6;
        const size = 12 - (trail.length - index - 1) * 2;

        return (
          <div
            key={`${point.timestamp}-${index}`}
            style={{
              position: 'fixed',
              left: `${point.x}px`,
              top: `${point.y}px`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              backgroundColor: `rgba(59, 130, 246, ${opacity})`,
              pointerEvents: 'none',
              zIndex: 2147483644,
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.1s ease',
            }}
          />
        );
      })}
      <div
        style={{
          position: 'fixed',
          left: `${gazeX}px`,
          top: `${gazeY}px`,
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          border: '2px solid rgba(255, 255, 255, 0.9)',
          pointerEvents: 'none',
          zIndex: 2147483644,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
        }}
      />
    </>
  );
}

export default memo(GazeDot, (prevProps, nextProps) => {
  // Only re-render if position changed significantly (more than 5px)
  const dx = Math.abs(prevProps.gazeX - nextProps.gazeX);
  const dy = Math.abs(prevProps.gazeY - nextProps.gazeY);
  return dx < 5 && dy < 5;
});
