import React from 'react';

interface StatusDotProps {
  connected: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ connected }) => {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        flexShrink: 0,
        transition: 'background 0.4s',
        background: connected ? '#22c55e' : '#ef4444',
        boxShadow: connected ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
        animation: connected ? 'pulse 2s infinite' : 'none',
      }}
    />
  );
};
