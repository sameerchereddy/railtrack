import React from 'react';
import { useStore } from '../../store';
import { StatusDot } from '../shared/StatusDot';
import { useIsMobile } from '../../lib/useIsMobile';

export const NavBar: React.FC = () => {
  const mapMeta = useStore((s) => s.mapMeta);
  const isMobile = useIsMobile();

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '8px' : '16px',
        padding: isMobile ? '0 12px' : '0 20px',
        background: '#0f1623',
        borderBottom: '1px solid #1e2d45',
        position: 'relative',
        zIndex: 10,
        height: '56px',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          fontSize: isMobile ? '13px' : '15px',
          letterSpacing: '0.3px',
          whiteSpace: 'nowrap',
          color: '#e2e8f0',
          flexShrink: 0,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <path d="M6 11h.01M18 11h.01" />
        </svg>
        {!isMobile && 'Network Rail'}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: '20px',
            background: '#3b82f6',
            color: '#fff',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Live
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Connection indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#e2e8f0',
          flexShrink: 0,
        }}
      >
        <StatusDot connected={mapMeta?.connected ?? false} />
        {!isMobile && <span>{mapMeta?.connected ? 'Live' : 'Connecting…'}</span>}
      </div>
    </nav>
  );
};
