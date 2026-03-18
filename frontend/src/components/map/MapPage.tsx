import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LiveMap } from './LiveMap';
import { StatsPanel } from './StatsPanel';
import { MapControls } from './MapControls';
import { TrainJourneyPanel } from './TrainJourneyPanel';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useStore } from '../../store';
import { tocName } from '../../lib/constants';
import { useIsMobile } from '../../lib/useIsMobile';
import type { TrainDetail } from '../../types/trains';

const MapPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [tocFilter, setTocFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TrainDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const trainData = useStore((s) => s.trainData);

  // Derive unique sorted TOC IDs present in live data
  const availableTocs = useMemo(() => {
    const ids = new Set<string>();
    for (const t of Object.values(trainData)) {
      if (t.toc_id) ids.add(t.toc_id);
    }
    return Array.from(ids).sort((a, b) => tocName(a).localeCompare(tocName(b)));
  }, [trainData]);

  // Derive visible count based on current filters
  const visibleCount = useMemo(() => {
    let count = 0;
    for (const t of Object.values(trainData)) {
      if (tocFilter && t.toc_id !== tocFilter) continue;
      if (statusFilter) {
        const v = (t.variation || '').trim().toUpperCase();
        if (statusFilter === 'Cancelled') {
          if (!t.cancelled) continue;
        } else if (v !== statusFilter) {
          continue;
        }
      }
      count++;
    }
    return count;
  }, [trainData, tocFilter, statusFilter]);

  // Fetch detail when a train is selected
  useEffect(() => {
    if (!selectedTrainId) {
      setSelectedDetail(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setSelectedDetail(null);

    fetch(`/api/trains/${selectedTrainId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<TrainDetail>;
      })
      .then((data) => {
        if (!cancelled) {
          setSelectedDetail(data);
          setDetailLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedDetail(null);
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTrainId]);

  const handleTrainSelect = useCallback((trainId: string | null) => {
    setSelectedTrainId(trainId);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTrainId(null);
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Map */}
      <ErrorBoundary>
        <LiveMap
          tocFilter={tocFilter}
          statusFilter={statusFilter}
          selectedTrainId={selectedTrainId}
          selectedDetail={selectedDetail}
          onTrainSelect={handleTrainSelect}
        />
      </ErrorBoundary>

      {/* Controls */}
      <MapControls
        tocFilter={tocFilter}
        statusFilter={statusFilter}
        selectedTrainId={selectedTrainId}
        visibleCount={visibleCount}
        tocs={availableTocs}
        onTocChange={setTocFilter}
        onStatusChange={setStatusFilter}
        onClearSelection={handleClearSelection}
      />

      {/* Stats — hidden on mobile when journey panel open */}
      {!(isMobile && selectedTrainId) && (
        <ErrorBoundary>
          <StatsPanel />
        </ErrorBoundary>
      )}

      {/* Journey panel */}
      {selectedTrainId && (
        <TrainJourneyPanel
          trainId={selectedTrainId}
          detail={selectedDetail}
          loading={detailLoading}
          onClose={handleClearSelection}
        />
      )}

      {/* Legend — bottom right, hidden on mobile when journey panel open */}
      {!(isMobile && selectedTrainId) && <div
        style={{
          position: 'absolute',
          bottom: '28px',
          right: isMobile ? '8px' : '14px',
          zIndex: 1000,
          background: 'rgba(8,12,20,0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #1e2d45',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '11px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#475569',
            marginBottom: '8px',
          }}
        >
          Legend
        </div>

        {/* Train status dots */}
        {[
          { color: '#22c55e', label: 'On Time' },
          { color: '#ef4444', label: 'Late' },
          { color: '#06b6d4', label: 'Early' },
          { color: '#eab308', label: 'Unknown' },
          { color: '#475569', label: 'Terminated', opacity: 0.6 },
        ].map(({ color, label, opacity }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '5px',
              color: '#94a3b8',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                opacity: opacity ?? 1,
              }}
            />
            {label}
          </div>
        ))}

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid #1e2d45',
            margin: '8px 0',
          }}
        />

        {/* Route legend */}
        {/* Completed path */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '5px',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '3px',
              background: '#22c55e',
              flexShrink: 0,
              borderRadius: '2px',
            }}
          />
          Completed path
        </div>

        {/* Remaining path */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '5px',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '2px',
              background: 'none',
              borderTop: '2px dashed rgba(255,255,255,0.35)',
              flexShrink: 0,
            }}
          />
          Remaining path
        </div>

        {/* Visited stop */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '5px',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              flexShrink: 0,
            }}
          />
          Visited stop
        </div>

        {/* Planned stop */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '5px',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.35)',
              background: 'transparent',
              flexShrink: 0,
            }}
          />
          Planned stop
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: '#475569' }}>
          Dots animate between stations
        </div>
      </div>}
    </div>
  );
};

export default MapPage;
