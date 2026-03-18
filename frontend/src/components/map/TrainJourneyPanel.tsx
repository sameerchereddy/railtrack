import React from 'react';
import { tocName } from '../../lib/constants';
import { useIsMobile } from '../../lib/useIsMobile';
import type { TrainDetail, JourneyStop } from '../../types/trains';

interface TrainJourneyPanelProps {
  trainId: string;
  detail: TrainDetail | null;
  loading: boolean;
  onClose: () => void;
}

function variationColor(v: string): string {
  const s = (v || '').trim().toUpperCase();
  if (s === 'LATE') return '#ef4444';
  if (s === 'ON TIME') return '#22c55e';
  if (s === 'EARLY') return '#06b6d4';
  return '#64748b';
}

function fmtTs(ts: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function VariationBadge({ variation, cancelled }: { variation: string; cancelled?: boolean }) {
  if (cancelled) {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '10px',
          fontWeight: 700,
          background: 'rgba(100,116,139,0.15)',
          color: '#94a3b8',
          border: '1px solid rgba(100,116,139,0.3)',
        }}
      >
        Cancelled
      </span>
    );
  }
  const v = (variation || '').trim().toUpperCase();
  if (v === 'ON TIME') {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '10px',
          fontWeight: 700,
          background: 'rgba(34,197,94,0.15)',
          color: '#86efac',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        On Time
      </span>
    );
  }
  if (v === 'LATE') {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '10px',
          fontWeight: 700,
          background: 'rgba(239,68,68,0.15)',
          color: '#fca5a5',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        Late
      </span>
    );
  }
  if (v === 'EARLY') {
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '20px',
          fontSize: '10px',
          fontWeight: 700,
          background: 'rgba(6,182,212,0.12)',
          color: '#67e8f9',
          border: '1px solid rgba(6,182,212,0.3)',
        }}
      >
        Early
      </span>
    );
  }
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: 700,
        background: 'rgba(100,116,139,0.15)',
        color: '#94a3b8',
        border: '1px solid rgba(100,116,139,0.3)',
      }}
    >
      {variation || '–'}
    </span>
  );
}

function StopRow({
  stop,
  isLast,
  isCurrent,
}: {
  stop: JourneyStop;
  isLast: boolean;
  isCurrent: boolean;
}) {
  const isVisited = (stop.actual_ts ?? 0) > 0 && !stop.is_projected;
  const lineColor = isVisited ? variationColor(stop.variation_status) : '#1e2d45';
  const plannedStr = stop.planned_ts ? fmtTs(stop.planned_ts) : '';
  const actualStr = stop.actual_ts ? fmtTs(stop.actual_ts) : '';
  const varColor = variationColor(stop.variation_status);
  const delayNum = stop.timetable_variation ?? 0;

  let eventLabel = '';
  if (stop.event_type === 'ARRIVAL') eventLabel = 'ARR';
  else if (stop.event_type === 'DEPARTURE') eventLabel = 'DEP';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '0',
        background: isCurrent ? 'rgba(59,130,246,0.08)' : 'transparent',
        borderLeft: isCurrent ? '2px solid #3b82f6' : '2px solid transparent',
        paddingLeft: '8px',
        paddingTop: '6px',
        paddingBottom: '6px',
        paddingRight: '12px',
        position: 'relative',
      }}
    >
      {/* Timeline column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          marginRight: '10px',
          width: '14px',
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isVisited ? lineColor : 'transparent',
            border: isVisited ? 'none' : `1.5px solid rgba(255,255,255,0.2)`,
            flexShrink: 0,
            zIndex: 1,
            marginTop: '2px',
          }}
        />
        {/* Line below dot */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              minHeight: '20px',
              background: isVisited ? lineColor : 'transparent',
              borderLeft: isVisited ? 'none' : '2px dashed #1e2d45',
              marginTop: '2px',
            }}
          />
        )}
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Station name row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            marginBottom: '3px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: isVisited ? 600 : 400,
              color: isVisited ? '#e2e8f0' : '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '160px',
            }}
          >
            {stop.stanox_name || stop.stanox}
          </span>

          {/* is_projected label */}
          {stop.is_projected && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#f59e0b',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '4px',
                padding: '1px 5px',
                letterSpacing: '0.5px',
              }}
            >
              NEXT →
            </span>
          )}

          {/* Event type */}
          {eventLabel && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#475569',
                background: 'rgba(71,85,105,0.2)',
                borderRadius: '3px',
                padding: '1px 5px',
                letterSpacing: '0.5px',
              }}
            >
              {eventLabel}
            </span>
          )}
        </div>

        {/* Times row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Planned time */}
          {plannedStr && (
            <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
              {plannedStr}
            </span>
          )}

          {/* Actual time */}
          {actualStr && (
            <span
              style={{
                fontSize: '11px',
                color: varColor,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {actualStr}
            </span>
          )}

          {/* Delay */}
          {delayNum !== 0 && (
            <span
              style={{
                fontSize: '10px',
                color: delayNum > 0 ? '#ef4444' : '#06b6d4',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              {delayNum > 0 ? `+${delayNum}m` : `${delayNum}m`}
            </span>
          )}

          {/* Platform */}
          {stop.platform && (
            <span style={{ fontSize: '10px', color: '#334155', marginLeft: 'auto' }}>
              Plat {stop.platform}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const TrainJourneyPanel: React.FC<TrainJourneyPanelProps> = ({
  trainId,
  detail,
  loading,
  onClose,
}) => {
  const isMobile = useIsMobile();

  // Find the index of the last visited stop
  const lastVisitedIdx = React.useMemo(() => {
    if (!detail) return -1;
    let idx = -1;
    detail.journey.forEach((s, i) => {
      if ((s.actual_ts ?? 0) > 0 && !s.is_projected) idx = i;
    });
    return idx;
  }, [detail]);

  const delayStr = detail?.timetable_variation
    ? detail.timetable_variation > 0
      ? `+${detail.timetable_variation}m`
      : `${detail.timetable_variation}m`
    : '';

  const delayColor =
    detail?.timetable_variation !== undefined && detail.timetable_variation !== 0
      ? detail.timetable_variation > 0
        ? '#ef4444'
        : '#06b6d4'
      : '#64748b';

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '62vh',
        zIndex: 900,
        background: 'rgba(8,12,20,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #1e2d45',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }
    : {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '300px',
        height: '100%',
        zIndex: 900,
        background: 'rgba(8,12,20,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderLeft: '1px solid #1e2d45',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      };

  return (
    <div style={panelStyle}>
      {/* Mobile drag handle */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '10px',
            paddingBottom: '2px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              background: '#334155',
            }}
          />
        </div>
      )}
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #1e2d45',
          flexShrink: 0,
        }}
      >
        {/* Top row: label + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: '#475569',
            }}
          >
            Journey Detail
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0 2px',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Train ID + badges row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 800,
              color: '#e2e8f0',
            }}
          >
            {trainId}
          </span>
          {detail && (
            <VariationBadge variation={detail.variation} cancelled={detail.cancelled} />
          )}
          {delayStr && (
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: delayColor,
              }}
            >
              {delayStr}
            </span>
          )}
        </div>

        {/* TOC chip */}
        {detail?.toc_id && (
          <div style={{ marginBottom: '8px' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(59,130,246,0.15)',
                color: '#93c5fd',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              {tocName(detail.toc_id)}
            </span>
          </div>
        )}

        {/* Origin → current location */}
        {detail && (
          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: '#94a3b8' }}>
              {detail.origin_stanox_name || detail.origin_stanox}
            </span>
            <span style={{ color: '#334155' }}>→</span>
            <span style={{ color: '#94a3b8' }}>
              {detail.last_stanox_name || detail.last_stanox}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            fontSize: '13px',
          }}
        >
          Loading…
        </div>
      ) : detail ? (
        <>
          {/* No-coords warning */}
          {(() => {
            const missingCoords = detail.journey.filter(
              (s) => !s.is_projected && s.lat == null
            ).length;
            if (missingCoords === 0) return null;
            const total = detail.journey.filter((s) => !s.is_projected).length;
            return (
              <div
                style={{
                  margin: '8px 12px 0',
                  padding: '6px 10px',
                  background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.25)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  flexShrink: 0,
                }}
              >
                <span style={{ flexShrink: 0 }}>⚠</span>
                <span>
                  {missingCoords === total
                    ? 'No map coordinates — this path runs through junctions or freight lines not in our station database.'
                    : `${missingCoords} of ${total} stops lack coordinates (junctions/freight). Route shown partially.`}
                </span>
              </div>
            );
          })()}

          {/* Progress indicator */}
          <div
            style={{
              padding: '8px 16px 4px',
              fontSize: '11px',
              color: '#475569',
              flexShrink: 0,
              borderBottom: '1px solid rgba(30,45,69,0.5)',
            }}
          >
            Stop {lastVisitedIdx + 1} of {detail.journey.length}
          </div>

          {/* Scrollable stop list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingTop: '4px',
              paddingBottom: '16px',
            }}
          >
            {detail.journey.map((stop, idx) => (
              <StopRow
                key={`${stop.stanox}-${stop.seq}-${stop.event_type}`}
                stop={stop}
                isLast={idx === detail.journey.length - 1}
                isCurrent={idx === lastVisitedIdx}
              />
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#334155',
            fontSize: '12px',
          }}
        >
          No journey data
        </div>
      )}
    </div>
  );
};
