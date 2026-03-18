import React from 'react';
import { TrainListPanel } from './TrainListPanel';
import { JourneyDetail } from './JourneyDetail';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useStore } from '../../store';
import { useIsMobile } from '../../lib/useIsMobile';

const TrainsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const selectedId = useStore((s) => s.selectedId);
  const setSelectedId = useStore((s) => s.setSelectedId);

  if (isMobile) {
    return (
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        {/* List — always rendered behind */}
        <ErrorBoundary>
          <TrainListPanel />
        </ErrorBoundary>

        {/* Detail — full-screen overlay when a train is selected */}
        {selectedId && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 200,
              background: '#080c14',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Back bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderBottom: '1px solid #1e2d45',
                background: '#0f1623',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0',
                }}
              >
                ← Back to trains
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ErrorBoundary>
                <JourneyDetail />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <ErrorBoundary>
        <TrainListPanel />
      </ErrorBoundary>
      <ErrorBoundary>
        <JourneyDetail />
      </ErrorBoundary>
    </div>
  );
};

export default TrainsPage;
