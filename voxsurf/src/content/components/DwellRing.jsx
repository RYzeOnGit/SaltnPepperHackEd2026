import React from 'react';

export default function DwellRing({ isDwelling, dwellProgress, target }) {
  if (!isDwelling || !target || dwellProgress === 0) {
    return null;
  }

  const rect = target.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const centerX = rect.left + rect.width / 2 + scrollX;
  const centerY = rect.top + rect.height / 2 + scrollY;
  const radius = Math.max(rect.width, rect.height) / 2 + 10;

  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (dwellProgress / 100) * circumference;

  return (
    <svg
      style={{
        position: 'absolute',
        left: `${centerX}px`,
        top: `${centerY}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
        pointerEvents: 'none',
        zIndex: 2147483642,
        transform: 'translate(-50%, -50%)',
      }}
      viewBox={`0 0 ${radius * 2} ${radius * 2}`}
    >
      <circle
        cx={radius}
        cy={radius}
        r={radius - 2}
        fill="none"
        stroke="rgba(59, 130, 246, 0.3)"
        strokeWidth="3"
      />
      <circle
        cx={radius}
        cy={radius}
        r={radius - 2}
        fill="none"
        stroke="#3B82F6"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${radius} ${radius})`}
        style={{
          transition: 'stroke-dashoffset 0.1s linear',
        }}
      />
    </svg>
  );
}
