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
          top: `${item.rect.top - 25}px`,
          backgroundColor: isGazed ? '#3B82F6' : '#F59E0B',
          color: 'white',
          padding: isExpanded ? '4px 8px' : '2px 6px',
          borderRadius: '12px',
          fontSize: isExpanded ? '12px' : '11px',
          fontWeight: 'bold',
          zIndex: 2147483646,
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.15s ease',
          maxWidth: isExpanded ? '200px' : 'auto',
          whiteSpace: isExpanded ? 'normal' : 'nowrap',
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'clip' : 'ellipsis',
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
