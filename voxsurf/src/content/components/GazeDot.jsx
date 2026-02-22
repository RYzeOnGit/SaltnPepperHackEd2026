import React, { useState, useEffect, useRef, memo } from 'react';

function GazeDot({ gazeX, gazeY }) {
  const [trail, setTrail] = useState([]);
  const trailRef = useRef([]);

  useEffect(() => {
    trailRef.current.push({ x: gazeX, y: gazeY, timestamp: Date.now() });

    if (trailRef.current.length > 5) {
      trailRef.current.shift();
    }

    const now = Date.now();
    trailRef.current = trailRef.current.filter((point) => now - point.timestamp < 200);

    setTrail([...trailRef.current]);
  }, [gazeX, gazeY]);

  return (
    <>
      {trail.map((point, index) => {
        const opacity = (index + 1) / trail.length * 0.5;
        const size = 10 - (trail.length - index - 1) * 1.5;

        return (
          <div
            key={`${point.timestamp}-${index}`}
            style={{
              position: 'fixed',
              left: `${point.x}px`,
              top: `${point.y}px`,
              width: `${Math.max(size, 3)}px`,
              height: `${Math.max(size, 3)}px`,
              borderRadius: '50%',
              background: `rgba(0, 122, 255, ${opacity})`,
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
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'rgba(0, 122, 255, 0.75)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          pointerEvents: 'none',
          zIndex: 2147483644,
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px rgba(0, 122, 255, 0.4), 0 0 20px rgba(0, 122, 255, 0.15)',
        }}
      />
    </>
  );
}

export default memo(GazeDot, (prevProps, nextProps) => {
  const dx = Math.abs(prevProps.gazeX - nextProps.gazeX);
  const dy = Math.abs(prevProps.gazeY - nextProps.gazeY);
  return dx < 5 && dy < 5;
});
