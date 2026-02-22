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
        width: '28px',
        height: '28px',
        pointerEvents: 'none',
        zIndex: 2147483643,
        transform: 'translate(-50%, -50%)',
        filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
      }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cursorGrad" x1="3" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#5AC8FA" />
        </linearGradient>
      </defs>
      <path
        d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
        fill="url(#cursorGrad)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.8" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

export default memo(GestureCursor, (prevProps, nextProps) => {
  const dx = Math.abs(prevProps.cursorX - nextProps.cursorX);
  const dy = Math.abs(prevProps.cursorY - nextProps.cursorY);
  return (
    dx < 3 &&
    dy < 3 &&
    prevProps.settings.handEnabled === nextProps.settings.handEnabled
  );
});
