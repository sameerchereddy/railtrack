import React from 'react';
import { useStore } from '../../store';
import { TypeDonutChart } from './TypeDonutChart';
import { fmtNum, timeSince } from '../../lib/formatters';
import { MSG_TYPE_COLORS, tocLabel } from '../../lib/constants';
import { useIsMobile } from '../../lib/useIsMobile';

const sectionTitle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: '#64748b',
  marginBottom: '12px',
};

const statBlock: React.CSSProperties = {
  background: '#161e2e',
  border: '1px solid #1e2d45',
  borderRadius: '6px',
  padding: '10px 12px',
};

export const Sidebar: React.FC = () => {
  const stats = useStore((s) => s.stats);
  const isMobile = useIsMobile();

  if (!stats) {
    return (
      <aside
        style={{
          width: isMobile ? '100%' : '300px',
          background: '#0f1623',
          borderRight: isMobile ? 'none' : '1px solid #1e2d45',
          borderBottom: isMobile ? '1px solid #1e2d45' : 'none',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px', color: '#475569', fontSize: '12px' }}>Loading…</div>
      </aside>
    );
  }

  if (isMobile) {
    const varCounts = stats.variation_counts ?? {};
    return (
      <aside
        style={{
          width: '100%',
          background: '#0f1623',
          borderBottom: '1px solid #1e2d45',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>
            {fmtNum(stats.total)}
          </div>
        </div>
        <div style={{ width: '1px', height: '28px', background: '#1e2d45', flexShrink: 0 }} />
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            /min
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>
            {stats.events_per_minute}
          </div>
        </div>
        <div style={{ width: '1px', height: '28px', background: '#1e2d45', flexShrink: 0 }} />
        {[
          { label: 'On Time', key: 'ON TIME' as const, color: '#22c55e' },
          { label: 'Late', key: 'LATE' as const, color: '#ef4444' },
          { label: 'Early', key: 'EARLY' as const, color: '#06b6d4' },
        ].map(({ label, key, color }) => (
          <div key={key} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.4px' }}>{label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color }}>
                {fmtNum(varCounts[key] ?? 0)}
              </div>
            </div>
          </div>
        ))}
      </aside>
    );
  }

  const typeCounts = stats.type_counts ?? {};
  const varCounts = stats.variation_counts ?? {};
  const tocCounts = stats.toc_counts ?? {};

  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0) || 1;
  const sortedTypes = Object.entries(typeCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const sortedTocs = Object.entries(tocCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const tocMax = sortedTocs[0]?.[1] || 1;

  return (
    <aside
      style={{
        width: '300px',
        background: '#0f1623',
        borderRight: '1px solid #1e2d45',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      {/* Overview */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e2d45' }}>
        <div style={sectionTitle}>Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ ...statBlock, gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Total Events
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: '20px',
                fontWeight: 700,
                color: '#3b82f6',
                lineHeight: 1.2,
                marginTop: '3px',
              }}
            >
              {fmtNum(stats.total)}
            </div>
          </div>
          <div style={statBlock}>
            <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Events / min
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: '20px',
                fontWeight: 700,
                color: '#22c55e',
                lineHeight: 1.2,
                marginTop: '3px',
              }}
            >
              {stats.events_per_minute}
            </div>
          </div>
          <div style={statBlock}>
            <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Last Event
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: '11px',
                fontWeight: 700,
                color: '#eab308',
                lineHeight: 1.2,
                marginTop: '4px',
              }}
            >
              {timeSince(stats.last_event_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Event Types */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e2d45' }}>
        <div style={sectionTitle}>Event Types</div>
        <TypeDonutChart typeCounts={typeCounts} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
          {sortedTypes.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: MSG_TYPE_COLORS[k] ?? '#64748b',
                }}
              />
              <span
                style={{
                  flex: 1,
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {k}
              </span>
              <div
                style={{
                  flexBasis: '60px',
                  height: '4px',
                  background: '#1e2d45',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: '2px',
                    width: `${Math.round((v / total) * 100)}%`,
                    background: MSG_TYPE_COLORS[k] ?? '#64748b',
                    transition: 'width 0.4s',
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '11px',
                  color: '#64748b',
                  flexShrink: 0,
                }}
              >
                {fmtNum(v)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Variation Status */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e2d45' }}>
        <div style={sectionTitle}>Variation Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {[
            { label: 'On Time', key: 'ON TIME' as const, color: '#22c55e' },
            { label: 'Early', key: 'EARLY' as const, color: '#06b6d4' },
            { label: 'Late', key: 'LATE' as const, color: '#ef4444' },
            { label: 'Off Route', key: 'OFF ROUTE' as const, color: '#f97316' },
          ].map(({ label, key, color }) => (
            <div
              key={key}
              style={{
                background: '#161e2e',
                border: '1px solid #1e2d45',
                borderRadius: '6px',
                padding: '8px 10px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '16px',
                  fontWeight: 700,
                  color,
                  marginTop: '2px',
                }}
              >
                {fmtNum(varCounts[key] ?? 0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top TOCs */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1e2d45' }}>
        <div style={sectionTitle}>Top TOCs</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sortedTocs.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: '#06b6d4',
                }}
              />
              <span
                style={{
                  flex: 1,
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`TOC ${k}`}
              >
                {tocLabel(k)}
              </span>
              <div
                style={{
                  flexBasis: '60px',
                  height: '4px',
                  background: '#1e2d45',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: '2px',
                    width: `${Math.round((v / tocMax) * 100)}%`,
                    background: '#06b6d4',
                    transition: 'width 0.4s',
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '11px',
                  color: '#64748b',
                  flexShrink: 0,
                }}
              >
                {fmtNum(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
