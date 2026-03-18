import React, { useEffect, useRef } from 'react';
import type { TrainDetail } from '../../types/trains';
import { collapseJourney, fmtMsTime, statusClass, type CollapsedStop } from '../../lib/formatters';

interface JourneyTrackProps {
  detail: TrainDetail;
}

function stopStatusCls(stop: CollapsedStop): string {
  if (stop.is_projected) return 'projected';
  const v = (stop.variation_status || '').trim().toUpperCase();
  if (v === 'LATE') return 'late';
  if (v === 'EARLY') return 'early';
  if (v === 'ON TIME') return 'past';
  return 'unknown-s';
}

function connColor(stop: CollapsedStop): string {
  if (stop.is_projected) return 'dashed';
  const v = (stop.variation_status || '').trim().toUpperCase();
  if (v === 'LATE') return '#ef4444';
  if (v === 'EARLY') return '#06b6d4';
  if (v === 'ON TIME') return '#22c55e';
  return '#253550';
}

function dotStyle(sc: string, isCurrent: boolean): React.CSSProperties {
  if (isCurrent) {
    return {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: '#3b82f6',
      border: '3px solid #3b82f6',
      boxShadow: '0 0 0 5px rgba(59,130,246,0.25), 0 0 20px rgba(59,130,246,0.4)',
      position: 'relative',
      zIndex: 2,
      flexShrink: 0,
      transition: 'box-shadow 0.3s',
    };
  }
  if (sc === 'projected') {
    return {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: 'transparent',
      border: '2px dashed #475569',
      position: 'relative',
      zIndex: 2,
      flexShrink: 0,
    };
  }
  const colors: Record<string, string> = {
    past: '#22c55e',
    late: '#ef4444',
    early: '#06b6d4',
    'unknown-s': '#475569',
  };
  const c = colors[sc] ?? '#475569';
  return {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: c,
    border: `3px solid ${c}`,
    position: 'relative',
    zIndex: 2,
    flexShrink: 0,
    transition: 'box-shadow 0.3s',
  };
}

export const JourneyTrack: React.FC<JourneyTrackProps> = ({ detail }) => {
  const journey = collapseJourney(detail.journey);
  const trackRef = useRef<HTMLDivElement>(null);

  // Current stop index = last non-projected
  let currentIdx = journey.length - 1;
  while (currentIdx >= 0 && journey[currentIdx].is_projected) currentIdx--;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const currentStop = el.querySelector<HTMLElement>(`[data-idx="${currentIdx}"]`);
    if (currentStop) {
      setTimeout(() => {
        currentStop.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 100);
    }
  }, [currentIdx, detail.train_id]);

  if (journey.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          color: '#475569',
          fontSize: '13px',
          borderBottom: '1px solid #1e2d45',
        }}
      >
        No movement events yet.
      </div>
    );
  }

  return (
    <div
      style={{
        borderBottom: '1px solid #1e2d45',
        overflowX: 'auto',
        flexShrink: 0,
        padding: '0 16px',
        scrollbarWidth: 'thin',
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          minWidth: 'max-content',
          paddingTop: '36px',
          paddingBottom: '12px',
        }}
      >
        {journey.map((stop, i) => {
          const isCurrent = i === currentIdx && !detail.terminated;
          const sc = isCurrent ? 'current' : stopStatusCls(stop);
          const isProjected = !!stop.is_projected;

          // Time display
          let timeDisplay = '';
          if (stop.event_type === 'ARR/DEP') {
            const a = fmtMsTime(stop.arr_ts);
            const d = fmtMsTime(stop.dep_ts);
            timeDisplay = (a !== '–' ? a : '') + (d !== '–' && d !== a ? ` / ${d}` : '');
          } else {
            timeDisplay = fmtMsTime(stop.actual_ts);
          }

          // Variation label
          let varHtml: React.ReactNode = null;
          if (!isProjected && stop.variation_status) {
            const vc = statusClass(stop.variation_status);
            const n = Math.abs(Math.round(stop.timetable_variation)) || 0;
            const txt =
              vc === 'ontime' ? '✓ on time' : vc === 'late' ? `+${n}m` : `-${n}m`;
            const varColor =
              vc === 'ontime' ? '#22c55e' : vc === 'late' ? '#ef4444' : '#06b6d4';
            varHtml = (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: varColor,
                  marginTop: '2px',
                }}
              >
                {txt}
              </div>
            );
          }

          const name =
            stop.stanox_name && stop.stanox_name !== stop.stanox ? stop.stanox_name : '';
          const etypeStr = stop.event_type || (isProjected ? 'NEXT' : '');

          // Connector before this stop
          const connector =
            i > 0 ? (
              <div
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '26px',
                  height: '4px',
                  flex: '0 0 56px',
                  borderRadius: '2px',
                  ...(connColor(journey[i - 1]) === 'dashed'
                    ? {
                        backgroundImage: `repeating-linear-gradient(90deg, #475569 0, #475569 8px, transparent 8px, transparent 16px)`,
                      }
                    : i === currentIdx
                    ? {
                        background: `linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.2))`,
                      }
                    : {
                        background: connColor(journey[i - 1]),
                      }),
                }}
              />
            ) : null;

          return (
            <React.Fragment key={`${stop.stanox}-${i}`}>
              {connector}
              <div
                data-idx={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '110px',
                  position: 'relative',
                }}
              >
                {/* Dot area */}
                <div
                  style={{
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    width: '100%',
                  }}
                >
                  {isCurrent && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-32px',
                        fontSize: '22px',
                        zIndex: 3,
                        animation: 'locoBounce 1.8s ease-in-out infinite',
                        filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.7))',
                      }}
                    >
                      🚂
                    </div>
                  )}
                  <div style={dotStyle(sc, isCurrent)} />
                  {isCurrent && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '2px solid #3b82f6',
                        opacity: 0.5,
                        animation: 'trackPulse 2s ease-out infinite',
                      }}
                    />
                  )}
                </div>

                {/* Label */}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px 0',
                    minWidth: '110px',
                  }}
                >
                  {name && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        lineHeight: 1.2,
                        marginBottom: '2px',
                      }}
                    >
                      {name}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: '9px',
                      color: '#475569',
                      marginBottom: '3px',
                    }}
                  >
                    {stop.stanox}
                  </div>
                  {etypeStr && (
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: '#475569',
                        marginBottom: '2px',
                      }}
                    >
                      {etypeStr}
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#94a3b8',
                    }}
                  >
                    {timeDisplay}
                  </div>
                  {varHtml}
                  {isProjected && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#475569',
                        fontStyle: 'italic',
                        marginTop: '2px',
                      }}
                    >
                      next expected
                    </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
