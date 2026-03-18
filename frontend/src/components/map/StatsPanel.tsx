import React from 'react';
import { useStore } from '../../store';
import { StatusDot } from '../shared/StatusDot';
import { useIsMobile } from '../../lib/useIsMobile';

export const StatsPanel: React.FC = () => {
  const mapMeta = useStore((s) => s.mapMeta);
  const isMobile = useIsMobile();

  const connected = mapMeta?.connected ?? false;

  if (isMobile) {
    // Compact horizontal strip at the bottom-left on mobile
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '8px',
          zIndex: 1000,
          background: 'rgba(8,12,20,0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #1e2d45',
          borderRadius: '8px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '11px',
        }}
      >
        <StatusDot connected={connected} />
        {[
          { color: '#22c55e', value: mapMeta?.on_time },
          { color: '#ef4444', value: mapMeta?.late },
          { color: '#06b6d4', value: mapMeta?.early },
        ].map(({ color, value }, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: color,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                color,
                fontSize: '11px',
              }}
            >
              {value ?? '–'}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '28px',
        left: '14px',
        zIndex: 1000,
        background: 'rgba(8,12,20,0.88)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #1e2d45',
        borderRadius: '10px',
        padding: '14px 16px',
        minWidth: '200px',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: '#475569',
          marginBottom: '10px',
        }}
      >
        Live Trains
      </div>

      {[
        { label: 'On Time', value: mapMeta?.on_time, color: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
        { label: 'Late', value: mapMeta?.late, color: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
        { label: 'Early', value: mapMeta?.early, color: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
        { label: 'Cancelled', value: mapMeta?.cancelled, color: '#475569', glow: 'none' },
      ].map(({ label, value, color, glow }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '7px',
          }}
        >
          <div
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              flexShrink: 0,
              background: color,
              boxShadow: glow !== 'none' ? `0 0 6px ${glow}` : 'none',
            }}
          />
          <span style={{ color: '#94a3b8', flex: 1 }}>{label}</span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontWeight: 700,
              fontSize: '13px',
              color,
            }}
          >
            {value ?? '–'}
          </span>
        </div>
      ))}

      <div style={{ height: '1px', background: '#1e2d45', margin: '8px 0' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#475569',
          fontSize: '11px',
          marginBottom: '4px',
        }}
      >
        <span>On map</span>
        <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#94a3b8' }}>
          {mapMeta?.mappable ?? '–'}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#475569',
          fontSize: '11px',
          marginBottom: '8px',
        }}
      >
        <span>Events/min</span>
        <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#94a3b8' }}>
          {mapMeta?.events_per_minute ?? '–'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <StatusDot connected={connected} />
        <span style={{ color: '#94a3b8' }}>{connected ? 'Live' : 'Connecting…'}</span>
      </div>
    </div>
  );
};
