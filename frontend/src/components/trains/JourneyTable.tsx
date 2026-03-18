import React from 'react';
import type { TrainDetail, JourneyStop } from '../../types/trains';
import { fmtMsTime, statusClass } from '../../lib/formatters';

interface JourneyTableProps {
  detail: TrainDetail;
}

function varStr(stop: JourneyStop): { text: string; cls: string } {
  if (stop.is_projected || !stop.variation_status) return { text: '', cls: '' };
  const sc = statusClass(stop.variation_status);
  const n = Math.round(Math.abs(stop.timetable_variation)) || 0;
  const text = sc === 'ontime' ? '0' : sc === 'late' ? `+${n}` : `${n}`;
  const cls =
    sc === 'ontime'
      ? '#22c55e'
      : sc === 'late'
      ? '#ef4444'
      : sc === 'early'
      ? '#06b6d4'
      : '';
  return { text, cls };
}

export const JourneyTable: React.FC<JourneyTableProps> = ({ detail }) => {
  const journey = detail.journey;

  const currentIdx =
    journey.length - 1 - (journey[journey.length - 1]?.is_projected ? 1 : 0);

  const thStyle: React.CSSProperties = {
    padding: '8px 14px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#475569',
    borderBottom: '2px solid #1e2d45',
    whiteSpace: 'nowrap',
    fontFamily: 'Inter, system-ui, sans-serif',
  };

  const tdStyle: React.CSSProperties = {
    padding: '7px 14px',
    color: '#94a3b8',
    borderBottom: '1px solid #1e2d45',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    fontSize: '11.5px',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: '#0f1623' }}>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Stanox</th>
            <th style={thStyle}>Station</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Planned</th>
            <th style={thStyle}>Actual</th>
            <th style={thStyle}>Var</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Platform</th>
            <th style={thStyle}>Direction</th>
          </tr>
        </thead>
        <tbody>
          {journey.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ ...tdStyle, color: '#475569', padding: '20px' }}>
                No movement events yet.
              </td>
            </tr>
          ) : (
            journey.map((stop, i) => {
              const isCurrent = i === currentIdx && !detail.terminated;
              const isProjected = !!stop.is_projected;
              const { text: varText, cls: varColor } = varStr(stop);
              const name =
                stop.stanox_name && stop.stanox_name !== stop.stanox
                  ? stop.stanox_name
                  : '–';

              let etype = stop.event_type || '';
              let epill: React.ReactNode = null;
              if (isProjected) {
                epill = (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: '#161e2e',
                      color: '#475569',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    NEXT
                  </span>
                );
              } else if (etype === 'DEPARTURE') {
                epill = (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(6,182,212,0.1)',
                      color: '#67e8f9',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    DEP
                  </span>
                );
              } else if (etype === 'ARRIVAL') {
                epill = (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(34,197,94,0.1)',
                      color: '#86efac',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    ARR
                  </span>
                );
              } else if (etype) {
                epill = (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(168,85,247,0.1)',
                      color: '#d8b4fe',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {etype}
                  </span>
                );
              }

              const vs = stop.variation_status || (isProjected ? '' : '–');

              return (
                <tr
                  key={`${stop.stanox}-${i}`}
                  style={{
                    background: isCurrent ? 'rgba(59,130,246,0.15)' : 'transparent',
                    opacity: isProjected ? 0.55 : 1,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent)
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        'rgba(59,130,246,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = isCurrent
                      ? 'rgba(59,130,246,0.15)'
                      : 'transparent';
                  }}
                >
                  <td style={{ ...tdStyle, color: '#475569', fontSize: '11px' }}>{i + 1}</td>
                  <td style={tdStyle}>{stop.stanox}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px' }}>
                    {name}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'Inter, system-ui, sans-serif' }}>{epill}</td>
                  <td style={tdStyle}>{fmtMsTime(stop.planned_ts)}</td>
                  <td style={tdStyle}>{fmtMsTime(stop.actual_ts)}</td>
                  <td style={{ ...tdStyle, color: varColor || '#94a3b8', fontWeight: varText ? 600 : 400 }}>
                    {varText}
                  </td>
                  <td style={tdStyle}>{vs}</td>
                  <td style={tdStyle}>{stop.platform || '–'}</td>
                  <td style={{ ...tdStyle, fontSize: '10px', color: '#475569' }}>
                    {stop.direction || '–'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
