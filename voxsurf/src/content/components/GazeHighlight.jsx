import React, { useState, useEffect, useRef, memo } from 'react';

const APPLE_COLORS = {
  blue: '#007AFF',
  green: '#34C759',
  yellow: '#FFCC00',
  purple: '#AF52DE',
};

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

      const baseColor = APPLE_COLORS[settings.highlightColor] || APPLE_COLORS.blue;

      const tagName = gazeTarget.tagName?.toLowerCase();
      let highlightColor = baseColor;
      if (tagName === 'a') highlightColor = APPLE_COLORS.green;
      else if (tagName === 'input' || tagName === 'textarea') highlightColor = APPLE_COLORS.yellow;
      else if (tagName === 'button') highlightColor = APPLE_COLORS.purple;

      setHighlightStyle({
        position: 'absolute',
        left: `${rect.left + scrollX}px`,
        top: `${rect.top + scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: 'none',
        zIndex: 2147483645,
        border: `1.5px solid ${highlightColor}`,
        borderRadius: '8px',
        boxShadow: `0 0 16px ${highlightColor}30, 0 0 32px ${highlightColor}15`,
        animation: 'gazeHighlightPulse 2.5s ease-in-out infinite',
        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        transform: 'scale(1.01)',
        transformOrigin: 'center',
        _color: highlightColor,
      });
    };

    updateHighlight();

    const handleUpdate = () => updateHighlight();

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(() => updateHighlight());
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

  const color = highlightStyle._color || '#007AFF';

  return (
    <>
      <style>
        {`
          @keyframes gazeHighlightPulse {
            0%, 100% {
              opacity: 0.75;
              box-shadow: 0 0 16px ${color}30, 0 0 32px ${color}15;
            }
            50% {
              opacity: 1;
              box-shadow: 0 0 24px ${color}45, 0 0 48px ${color}20;
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
