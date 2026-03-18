import React from 'react';
import { MSG_TYPE_COLORS } from '../../lib/constants';

interface TypeBadgeProps {
  label: string;
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  Movement: {
    background: 'rgba(59,130,246,0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(59,130,246,0.3)',
  },
  Activation: {
    background: 'rgba(34,197,94,0.12)',
    color: '#86efac',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  Cancellation: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  Reinstatement: {
    background: 'rgba(168,85,247,0.15)',
    color: '#d8b4fe',
    border: '1px solid rgba(168,85,247,0.3)',
  },
};

const OTHER_STYLE: React.CSSProperties = {
  background: 'rgba(100,116,139,0.15)',
  color: '#94a3b8',
  border: '1px solid rgba(100,116,139,0.3)',
};

export const TypeBadge: React.FC<TypeBadgeProps> = ({ label }) => {
  const style = BADGE_STYLES[label] ?? OTHER_STYLE;
  const dotColor = MSG_TYPE_COLORS[label] ?? '#64748b';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {label || '–'}
    </span>
  );
};
