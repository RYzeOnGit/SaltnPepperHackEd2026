import React, { memo } from 'react';

function GestureCursor({ cursorX, cursorY, settings }) {
  if (!settings.handEnabled) {
    return null;
  }

  return (
    <svg
      style={{
        position: 'fixed',
        left: `${cursorX}px`,
        top: `${cursorY}px`,
        width: '24px',
        height: '24px',
        pointerEvents: 'none',
        zIndex: 2147483643,
        transform: 'translate(-50%, -50%)',
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
        fill="#3B82F6"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
    </svg>
  );
}

export default memo(GestureCursor, (prevProps, nextProps) => {
  // Only re-render if position changed significantly (more than 3px) or settings changed
  const dx = Math.abs(prevProps.cursorX - nextProps.cursorX);
  const dy = Math.abs(prevProps.cursorY - nextProps.cursorY);
  return (
    dx < 3 &&
    dy < 3 &&
    prevProps.settings.handEnabled === nextProps.settings.handEnabled
  );
});
