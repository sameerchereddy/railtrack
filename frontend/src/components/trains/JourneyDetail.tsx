import React from 'react';
import { useStore } from '../../store';
import { useTrainDetail } from '../../hooks/useTrainDetail';
import { JourneyMap } from './JourneyMap';
import { JourneyTrack } from './JourneyTrack';
import { JourneyTable } from './JourneyTable';
import { TocChip } from '../shared/TocChip';
import { statusClass, varLabel } from '../../lib/formatters';
import { tocLabel } from '../../lib/constants';

const JH_VAR_COLORS: Record<string, string> = {
  late: '#ef4444',
  early: '#06b6d4',
  ontime: '#22c55e',
  unknown: '#94a3b8',
  cancelled: '#ef4444',
  terminated: '#475569',
};

export const JourneyDetail: React.FC = () => {
  const selectedId = useStore((s) => s.selectedId);
  const { detail, loading } = useTrainDetail(selectedId);

  if (!selectedId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          color: '#475569',
          background: '#080c14',
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.3}
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          <circle cx="7" cy="17" r="1.5" />
          <circle cx="17" cy="17" r="1.5" />
        </svg>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8', margin: 0 }}>
          Select a train to track
        </h3>
        <p style={{ fontSize: '13px', color: '#475569', margin: 0, textAlign: 'center', maxWidth: '300px' }}>
          Pick any train from the list to see its live journey through stations.
        </p>
      </div>
    );
  }

  if (loading && !detail) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          background: '#080c14',
        }}
      >
        Loading journey…
      </div>
    );
  }

  if (!detail) return null;

  const sc = detail.cancelled ? 'cancelled' : detail.terminated ? 'terminated' : statusClass(detail.variation);
  const varStr = detail.cancelled
    ? 'Cancelled'
    : detail.terminated
    ? 'Terminated'
    : varLabel(detail.timetable_variation, detail.variation);
  const varColor = JH_VAR_COLORS[sc] ?? '#94a3b8';

  const stopsTxt = `${detail.journey.length} stop${detail.journey.length !== 1 ? 's' : ''}`;
  const dirTxt = detail.direction ? `· ${detail.direction}` : '';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#080c14',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1e2d45',
          background: '#0f1623',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '20px',
            fontWeight: 800,
            color: '#e2e8f0',
            letterSpacing: '0.5px',
            marginBottom: '6px',
          }}
        >
          {detail.train_id}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
          {detail.toc_id && <TocChip id={detail.toc_id} />}
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: varColor, fontWeight: 600 }}>{varStr}</span>
          <span style={{ color: '#475569' }}>·</span>
          <span style={{ color: '#94a3b8' }}>
            {stopsTxt} {dirTxt}
          </span>
          {detail.terminated && (
            <>
              <span style={{ color: '#475569' }}>·</span>
              <span style={{ color: '#475569' }}>Terminated</span>
            </>
          )}
          {detail.train_uid && (
            <>
              <span style={{ color: '#475569' }}>·</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: '11px',
                  color: '#475569',
                }}
              >
                UID {detail.train_uid}
              </span>
            </>
          )}
          {detail.toc_id && (
            <span style={{ color: '#64748b', fontSize: '11px' }}>{tocLabel(detail.toc_id)}</span>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <JourneyMap detail={detail} />
        <JourneyTrack detail={detail} />
        <JourneyTable detail={detail} />
      </div>
    </div>
  );
};
