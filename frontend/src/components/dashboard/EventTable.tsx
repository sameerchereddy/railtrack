import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { useStore } from '../../store';
import { useEventsWs } from '../../hooks/useEventsWs';
import { TypeBadge } from '../shared/TypeBadge';
import { VarPill } from '../shared/VarPill';
import { TocChip } from '../shared/TocChip';
import { RawEventModal } from '../shared/RawEventModal';
import { fmtIsoTime } from '../../lib/formatters';
import { useIsMobile } from '../../lib/useIsMobile';
import type { NrEvent } from '../../types/events';

const MSG_TYPES = [
  'Movement',
  'Activation',
  'Cancellation',
  'Reinstatement',
  'Change of Origin',
  'Change of Identity',
  'Change of Location',
];

const inputStyle: React.CSSProperties = {
  background: '#161e2e',
  border: '1px solid #1e2d45',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '12px',
  padding: '5px 10px',
  outline: 'none',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const selectStyle: React.CSSProperties = { ...inputStyle };

interface EventRowData {
  events: NrEvent[];
  onRowClick: (raw: Record<string, unknown>) => void;
  isMobile: boolean;
}

interface EventRowProps extends ListChildComponentProps<EventRowData> {}

const EventRow = React.memo(function EventRow({ index, style, data }: EventRowProps) {
  const ev = data.events[index];
  if (!ev) return null;

  const handleClick = () => data.onRowClick(ev.raw ?? {});

  const pillStyle = (eventType: string): React.CSSProperties => {
    if (eventType === 'DEPARTURE')
      return {
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        background: 'rgba(6,182,212,0.1)',
        color: '#67e8f9',
        fontFamily: 'Inter, system-ui, sans-serif',
      };
    if (eventType === 'ARRIVAL')
      return {
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 600,
        background: 'rgba(34,197,94,0.1)',
        color: '#86efac',
        fontFamily: 'Inter, system-ui, sans-serif',
      };
    return { color: '#475569', fontSize: '10px', fontFamily: 'Inter, system-ui, sans-serif' };
  };

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #1e2d45',
        cursor: 'pointer',
        fontSize: '11.5px',
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        color: '#94a3b8',
        transition: 'background 0.15s',
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(59,130,246,0.04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Time */}
      <div style={{ padding: '0 8px', width: data.isMobile ? '64px' : '80px', flexShrink: 0, color: '#64748b', fontSize: '10.5px' }}>
        {fmtIsoTime(ev.received_at)}
      </div>
      {/* Type */}
      <div style={{ padding: '0 8px', width: data.isMobile ? '120px' : '160px', flexShrink: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <TypeBadge label={ev.type_label} />
      </div>
      {/* Train ID */}
      <div style={{ padding: '0 8px', width: data.isMobile ? '90px' : '110px', flexShrink: 0, color: '#e2e8f0', fontWeight: 600, letterSpacing: '0.5px' }}>
        {ev.train_id || '–'}
      </div>
      {/* Event */}
      {!data.isMobile && (
        <div style={{ padding: '0 12px', width: '90px', flexShrink: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {ev.event_type ? (
            <span style={pillStyle(ev.event_type)}>{ev.event_type}</span>
          ) : (
            <span style={{ color: '#475569' }}>–</span>
          )}
        </div>
      )}
      {/* Status */}
      <div style={{ padding: '0 8px', width: data.isMobile ? '80px' : '100px', flexShrink: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <VarPill variation={ev.variation} />
      </div>
      {/* TOC — hidden on mobile */}
      {!data.isMobile && (
        <div style={{ padding: '0 12px', width: '180px', flexShrink: 0, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px' }}>
          {ev.toc_id ? <TocChip id={ev.toc_id} /> : <span style={{ color: '#475569' }}>–</span>}
        </div>
      )}
      {/* Stanox — hidden on mobile */}
      {!data.isMobile && (
        <div style={{ padding: '0 12px', width: '80px', flexShrink: 0 }}>
          {ev.loc_stanox || '–'}
        </div>
      )}
      {/* Platform — hidden on mobile */}
      {!data.isMobile && (
        <div style={{ padding: '0 12px', width: '80px', flexShrink: 0 }}>
          {ev.platform || '–'}
        </div>
      )}
    </div>
  );
});

export const EventTable: React.FC = () => {
  const allEvents = useStore((s) => s.allEvents);
  const paused = useStore((s) => s.paused);
  const pendingCount = useStore((s) => s.pendingCount);
  const setPaused = useStore((s) => s.setPaused);
  const flush = useStore((s) => s.flush);
  const isMobile = useIsMobile();

  const [filterType, setFilterType] = useState('');
  const [filterToc, setFilterToc] = useState('');
  const [filterTrain, setFilterTrain] = useState('');
  const [modalRaw, setModalRaw] = useState<Record<string, unknown> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEventsWs();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setListHeight(el.clientHeight - 33); // subtract header row
    });
    obs.observe(el);
    setListHeight(el.clientHeight - 33);
    return () => obs.disconnect();
  }, []);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (filterType && ev.type_label !== filterType) return false;
      if (filterToc && ev.toc_id !== filterToc) return false;
      if (filterTrain && !(ev.train_id ?? '').toUpperCase().includes(filterTrain.toUpperCase())) return false;
      return true;
    });
  }, [allEvents, filterType, filterToc, filterTrain]);

  const availableTocs = useMemo(() => {
    const seen = new Set<string>();
    for (const ev of allEvents) {
      if (ev.toc_id) seen.add(ev.toc_id);
    }
    return Array.from(seen).sort();
  }, [allEvents]);

  const handlePauseToggle = useCallback(() => {
    const newPaused = !paused;
    setPaused(newPaused);
    if (!newPaused && pendingCount > 0) {
      flush();
    }
  }, [paused, pendingCount, setPaused, flush]);

  const handleRowClick = useCallback((raw: Record<string, unknown>) => {
    setModalRaw(raw);
  }, []);

  const itemData: EventRowData = useMemo(
    () => ({ events: filteredEvents, onRowClick: handleRowClick, isMobile }),
    [filteredEvents, handleRowClick, isMobile]
  );

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    color: '#64748b',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    borderBottom: '2px solid #1e2d45',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        overflow: 'hidden',
        height: '100%',
        background: '#080c14',
      }}
    >
      {/* Header / filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '8px' : '12px',
          padding: isMobile ? '10px 12px' : '12px 20px',
          borderBottom: '1px solid #1e2d45',
          background: '#0f1623',
        }}
      >
        {/* Top row on mobile: title + pause button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: 0, whiteSpace: 'nowrap', flex: 1 }}>
            Live Event Stream
          </h2>
          {!isMobile && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: '11px',
                color: '#64748b',
                whiteSpace: 'nowrap',
              }}
            >
              showing {filteredEvents.length.toLocaleString()} events
              {paused && pendingCount > 0 && (
                <span style={{ color: '#eab308', marginLeft: '6px' }}>+ {pendingCount} pending</span>
              )}
            </span>
          )}
          <button
            onClick={handlePauseToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#161e2e',
              border: `1px solid ${paused ? '#eab308' : '#1e2d45'}`,
              borderRadius: '6px',
              color: paused ? '#eab308' : '#94a3b8',
              fontSize: '12px',
              fontWeight: 500,
              padding: '5px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              fontFamily: 'Inter, system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            {paused ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </>
            )}
          </button>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: '6px', flex: isMobile ? undefined : 1 }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ ...selectStyle, flex: 1, minWidth: 0 }}
          >
            <option value="">All Types</option>
            {MSG_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {!isMobile && (
            <select
              value={filterToc}
              onChange={(e) => setFilterToc(e.target.value)}
              style={selectStyle}
            >
              <option value="">All Operators</option>
              {availableTocs.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={filterTrain}
            onChange={(e) => setFilterTrain(e.target.value)}
            placeholder="Train ID…"
            style={{ ...inputStyle, width: isMobile ? '100px' : '120px', flexShrink: 0 }}
          />
        </div>

        {isMobile && (
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>
            {filteredEvents.length.toLocaleString()} events
            {paused && pendingCount > 0 && (
              <span style={{ color: '#eab308', marginLeft: '6px' }}>+ {pendingCount} pending</span>
            )}
          </span>
        )}
      </div>

      {/* Table */}
      <div ref={containerRef} style={{ overflow: 'hidden', position: 'relative' }}>
        {/* Sticky header row */}
        <div
          style={{
            display: 'flex',
            background: '#0f1623',
            borderBottom: '2px solid #1e2d45',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
        >
          <div style={{ ...thStyle, width: isMobile ? '64px' : '80px', flexShrink: 0 }}>Time</div>
          <div style={{ ...thStyle, width: isMobile ? '120px' : '160px', flexShrink: 0 }}>Type</div>
          <div style={{ ...thStyle, width: isMobile ? '90px' : '110px', flexShrink: 0 }}>Train</div>
          {!isMobile && <div style={{ ...thStyle, width: '90px', flexShrink: 0 }}>Event</div>}
          <div style={{ ...thStyle, width: isMobile ? '80px' : '100px', flexShrink: 0 }}>Status</div>
          {!isMobile && <div style={{ ...thStyle, width: '180px', flexShrink: 0 }}>TOC</div>}
          {!isMobile && <div style={{ ...thStyle, width: '80px', flexShrink: 0 }}>Stanox</div>}
          {!isMobile && <div style={{ ...thStyle, width: '80px', flexShrink: 0 }}>Platform</div>}
        </div>

        {filteredEvents.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '60px 20px',
              color: '#64748b',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p style={{ fontSize: '13px', margin: 0 }}>Waiting for events…</p>
          </div>
        ) : (
          <FixedSizeList
            height={listHeight}
            itemCount={filteredEvents.length}
            itemSize={33}
            width="100%"
            itemData={itemData}
          >
            {EventRow}
          </FixedSizeList>
        )}
      </div>

      <RawEventModal raw={modalRaw} onClose={() => setModalRaw(null)} />
    </div>
  );
};
