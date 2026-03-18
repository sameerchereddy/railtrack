import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import { useStore } from '../../store';
import { useTrainsWs } from '../../hooks/useTrainsWs';
import { TrainCard } from './TrainCard';
import { tocLabel } from '../../lib/constants';
import { statusClass } from '../../lib/formatters';
import { useIsMobile } from '../../lib/useIsMobile';
import type { TrainSummary } from '../../types/trains';

interface ListItemData {
  trains: TrainSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ListItem = React.memo(function ListItem({
  index,
  style,
  data,
}: ListChildComponentProps<ListItemData>) {
  const train = data.trains[index];
  if (!train) return null;

  const handleClick = () => data.onSelect(train.train_id);

  return (
    <div style={style}>
      <TrainCard
        train={train}
        selected={data.selectedId === train.train_id}
        onClick={handleClick}
      />
    </div>
  );
});

const inputStyle: React.CSSProperties = {
  background: '#161e2e',
  border: '1px solid #1e2d45',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '12px',
  padding: '5px 10px',
  outline: 'none',
  fontFamily: 'Inter, system-ui, sans-serif',
  flex: 1,
};

export const TrainListPanel: React.FC = () => {
  const trainList = useStore((s) => s.trainList);
  const selectedId = useStore((s) => s.selectedId);
  const setSelectedId = useStore((s) => s.setSelectedId);
  const isMobile = useIsMobile();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterToc, setFilterToc] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(500);

  useTrainsWs();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setListHeight(el.clientHeight));
    obs.observe(el);
    setListHeight(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  const filteredTrains = useMemo(() => {
    return trainList.filter((t) => {
      if (filterStatus && t.variation !== filterStatus && !(filterStatus === 'cancelled' && t.cancelled)) return false;
      if (filterToc && t.toc_id !== filterToc) return false;
      if (filterSearch && !t.train_id.toUpperCase().includes(filterSearch.toUpperCase())) return false;
      return true;
    });
  }, [trainList, filterStatus, filterToc, filterSearch]);

  const availableTocs = useMemo(() => {
    const seen = new Set<string>();
    for (const t of trainList) {
      if (t.toc_id) seen.add(t.toc_id);
    }
    return Array.from(seen).sort();
  }, [trainList]);

  const onSelect = useCallback(
    (id: string) => setSelectedId(id),
    [setSelectedId]
  );

  const itemData: ListItemData = useMemo(
    () => ({ trains: filteredTrains, selectedId, onSelect }),
    [filteredTrains, selectedId, onSelect]
  );

  const groupedCounts = useMemo(() => {
    const counts: Record<string, number> = { late: 0, ontime: 0, early: 0 };
    for (const t of trainList) {
      const sc = statusClass(t.variation);
      if (sc in counts) counts[sc] = (counts[sc] ?? 0) + 1;
    }
    return counts;
  }, [trainList]);

  return (
    <div
      style={{
        width: isMobile ? '100%' : '340px',
        flexShrink: 0,
        background: '#0f1623',
        borderRight: isMobile ? 'none' : '1px solid #1e2d45',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid #1e2d45',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
          Live Trains
        </span>
        <span
          style={{
            padding: '1px 8px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            background: 'rgba(59,130,246,0.15)',
            color: '#93c5fd',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {filteredTrains.length}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '10px' }}>
          <span style={{ color: '#ef4444' }}>{groupedCounts.late} late</span>
          <span style={{ color: '#22c55e' }}>{groupedCounts.ontime} on time</span>
          <span style={{ color: '#06b6d4' }}>{groupedCounts.early} early</span>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid #1e2d45',
          display: 'flex',
          gap: '6px',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ ...inputStyle, flex: '0 0 auto', width: '100px' }}
        >
          <option value="">All Status</option>
          <option value="LATE">Late</option>
          <option value="ON TIME">On Time</option>
          <option value="EARLY">Early</option>
        </select>
        <select
          value={filterToc}
          onChange={(e) => setFilterToc(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Operators</option>
          {availableTocs.map((id) => (
            <option key={id} value={id}>{tocLabel(id)}</option>
          ))}
        </select>
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Train ID…"
          style={{ ...inputStyle, flex: '0 0 90px', width: '90px' }}
        />
      </div>

      {/* List */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }}>
        {filteredTrains.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '#475569',
              fontSize: '13px',
            }}
          >
            No trains match the filter.
          </div>
        ) : (
          <FixedSizeList
            height={listHeight}
            itemCount={filteredTrains.length}
            itemSize={78}
            width="100%"
            itemData={itemData}
          >
            {ListItem}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
};
