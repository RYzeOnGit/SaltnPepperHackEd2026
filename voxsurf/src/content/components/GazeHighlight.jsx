import React, { useState, useEffect, useRef, memo } from 'react';

function GazeHighlight({ gazeTarget, settings }) {
  const [highlightStyle, setHighlightStyle] = useState(null);
  const highlightRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    if (!gazeTarget) {
      setHighlightStyle(null);
      return;
    }

    const updateHighlight = () => {
      const rect = gazeTarget.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      const colorMap = {
        blue: '#3B82F6',
        green: '#10B981',
        yellow: '#F59E0B',
        purple: '#8B5CF6',
      };

      const baseColor = colorMap[settings.highlightColor] || colorMap.blue;
      
      // Determine color based on element type
      const tagName = gazeTarget.tagName?.toLowerCase();
      let highlightColor = baseColor;
      if (tagName === 'a') highlightColor = colorMap.green;
      else if (tagName === 'input' || tagName === 'textarea') highlightColor = colorMap.yellow;
      else if (tagName === 'button') highlightColor = colorMap.purple;

      setHighlightStyle({
        position: 'absolute',
        left: `${rect.left + scrollX}px`,
        top: `${rect.top + scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: 'none',
        zIndex: 2147483645,
        border: `2px solid ${highlightColor}`,
        borderRadius: '4px',
        boxShadow: `0 0 20px ${highlightColor}40, 0 0 40px ${highlightColor}20`,
        animation: 'pulse 2s ease-in-out infinite',
        transition: 'all 0.15s ease',
        transform: 'scale(1.02)',
        transformOrigin: 'center',
      });
    };

    updateHighlight();

    // Update on scroll/resize
    const handleUpdate = () => {
      updateHighlight();
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    // Use ResizeObserver for element size changes
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(() => {
      updateHighlight();
    });

    resizeObserverRef.current.observe(gazeTarget);

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [gazeTarget, settings.highlightColor]);

  if (!highlightStyle) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.8;
              box-shadow: 0 0 20px ${highlightStyle.boxShadow.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#3B82F6'}40, 0 0 40px ${highlightStyle.boxShadow.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#3B82F6'}20;
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 30px ${highlightStyle.boxShadow.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#3B82F6'}60, 0 0 60px ${highlightStyle.boxShadow.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#3B82F6'}30;
            }
          }
        `}
      </style>
      <div ref={highlightRef} style={highlightStyle} />
    </>
  );
}

export default memo(GazeHighlight, (prevProps, nextProps) => {
  return (
    prevProps.gazeTarget === nextProps.gazeTarget &&
    prevProps.settings.highlightColor === nextProps.settings.highlightColor
  );
});
