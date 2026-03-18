import React, { memo, useCallback } from 'react';
import type { TrainSummary } from '../../types/trains';
import { TocChip } from '../shared/TocChip';
import { timeSince, statusClass, varLabel } from '../../lib/formatters';

interface TrainCardProps {
  train: TrainSummary;
  selected: boolean;
  onClick: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  late: '#ef4444',
  early: '#06b6d4',
  ontime: '#22c55e',
  unknown: '#475569',
  cancelled: '#ef4444',
  terminated: '#475569',
};

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  late: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  early: {
    background: 'rgba(6,182,212,0.12)',
    color: '#67e8f9',
    border: '1px solid rgba(6,182,212,0.3)',
  },
  ontime: {
    background: 'rgba(34,197,94,0.12)',
    color: '#86efac',
    border: '1px solid rgba(34,197,94,0.25)',
  },
  unknown: {
    background: 'rgba(100,116,139,0.15)',
    color: '#94a3b8',
    border: '1px solid rgba(100,116,139,0.3)',
  },
  cancelled: {
    background: 'rgba(239,68,68,0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  terminated: {
    background: 'rgba(100,116,139,0.15)',
    color: '#94a3b8',
    border: '1px solid rgba(100,116,139,0.3)',
  },
};

export const TrainCard: React.FC<TrainCardProps> = memo(({ train, selected, onClick }) => {
  const handleClick = useCallback(() => onClick(), [onClick]);

  const sc = train.cancelled
    ? 'cancelled'
    : train.terminated
    ? 'terminated'
    : statusClass(train.variation);

  const label = train.cancelled
    ? 'Cancelled'
    : train.terminated
    ? 'Terminated'
    : varLabel(train.timetable_variation, train.variation);

  const borderColor = STATUS_COLORS[sc] ?? '#1e2d45';
  const from = train.last_stanox_name || train.last_stanox || '–';
  const to = train.next_stanox_name || train.next_stanox || '?';
  const arrow =
    train.direction === 'DOWN' ? '↓' : train.direction === 'UP' ? '↑' : '→';

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #1e2d45',
        cursor: 'pointer',
        borderLeft: `3px solid ${borderColor}`,
        background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
            fontSize: '13px',
            fontWeight: 600,
            color: '#e2e8f0',
            letterSpacing: '0.5px',
          }}
        >
          {train.train_id}
        </span>
        {train.toc_id && <TocChip id={train.toc_id} />}
        {label && (
          <span
            style={{
              display: 'inline-block',
              padding: '1px 7px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              ...(BADGE_STYLES[sc] ?? BADGE_STYLES.unknown),
            }}
          >
            {label}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {arrow} {from}
        {train.next_stanox ? ` → ${to}` : ''}
      </div>
      <div style={{ fontSize: '11px', color: '#475569' }}>
        {train.stop_count} stop{train.stop_count !== 1 ? 's' : ''} · {timeSince(train.last_event_at)}
      </div>
    </div>
  );
});

TrainCard.displayName = 'TrainCard';
