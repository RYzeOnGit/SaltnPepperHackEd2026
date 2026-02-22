import React, { useEffect, useState, memo } from 'react';

function LabelOverlay({ elements, gazeTarget, settings }) {
  const [expandedLabels, setExpandedLabels] = useState(new Set());

  useEffect(() => {
    if (gazeTarget.gazeTargetIndex) {
      setExpandedLabels((prev) => new Set([...prev, gazeTarget.gazeTargetIndex]));
    }
  }, [gazeTarget.gazeTargetIndex]);

  if (!settings.showLabels || elements.length === 0) {
    return null;
  }

  return (
    <>
      {elements.map((item) => {
        const isGazed = gazeTarget.gazeTargetIndex === item.index;
        const isExpanded = expandedLabels.has(item.index);

        const badgeStyle = {
          position: 'absolute',
          left: `${item.rect.left}px`,
          top: `${item.rect.top - 26}px`,
          background: isGazed
            ? 'rgba(0, 122, 255, 0.55)'
            : 'rgba(30, 30, 45, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isGazed
            ? '1px solid rgba(0, 122, 255, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          padding: isExpanded ? '4px 10px' : '3px 8px',
          borderRadius: '999px',
          fontSize: isExpanded ? '11px' : '10px',
          fontWeight: 600,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          zIndex: 2147483646,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          maxWidth: isExpanded ? '200px' : 'auto',
          whiteSpace: isExpanded ? 'normal' : 'nowrap',
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'clip' : 'ellipsis',
          letterSpacing: '-0.01em',
        };

        const labelText = isExpanded
          ? `${item.index}: ${item.text || item.ariaLabel || item.placeholder || item.type}`
          : item.index;

        return (
          <div key={item.id} style={badgeStyle}>
            {labelText}
          </div>
        );
      })}
    </>
  );
}

export default memo(LabelOverlay, (prevProps, nextProps) => {
  return (
    prevProps.elements.length === nextProps.elements.length &&
    prevProps.gazeTarget.gazeTargetIndex === nextProps.gazeTarget.gazeTargetIndex &&
    prevProps.settings.showLabels === nextProps.settings.showLabels
  );
});
