import React from 'react';

interface VarPillProps {
  variation: string;
}

const VAR_STYLES: Record<string, React.CSSProperties> = {
  'ON TIME': {
    background: 'rgba(34,197,94,0.1)',
    color: '#86efac',
  },
  EARLY: {
    background: 'rgba(6,182,212,0.1)',
    color: '#67e8f9',
  },
  LATE: {
    background: 'rgba(239,68,68,0.1)',
    color: '#fca5a5',
  },
  'OFF ROUTE': {
    background: 'rgba(249,115,22,0.1)',
    color: '#fdba74',
  },
};

export const VarPill: React.FC<VarPillProps> = ({ variation }) => {
  const v = (variation || '').trim().toUpperCase();
  const style = VAR_STYLES[v];

  if (!style || !v) {
    return (
      <span style={{ color: '#475569', fontSize: '10px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        –
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...style,
      }}
    >
      {v}
    </span>
  );
};
