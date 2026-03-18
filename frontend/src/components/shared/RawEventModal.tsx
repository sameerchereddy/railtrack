import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface RawEventModalProps {
  raw: Record<string, unknown> | null;
  onClose: () => void;
}

export const RawEventModal: React.FC<RawEventModalProps> = ({ raw, onClose }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (raw !== null) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [raw, handleKeyDown]);

  if (raw === null) return null;

  const formatted = JSON.stringify(raw, null, 2);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#0f1623',
          border: '1px solid #1e2d45',
          borderRadius: '10px',
          width: 'min(600px, 90vw)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid #1e2d45',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#e2e8f0' }}>
            Raw Event
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={{ overflow: 'auto', padding: '16px' }}>
          <pre
            style={{
              background: '#161e2e',
              border: '1px solid #1e2d45',
              borderRadius: '6px',
              padding: '14px',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
              color: '#94a3b8',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {formatted}
          </pre>
        </div>
      </div>
    </div>,
    document.body
  );
};
