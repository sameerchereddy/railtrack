import React from 'react';
import { tocLabel } from '../../lib/constants';
import { useIsMobile } from '../../lib/useIsMobile';

interface MapControlsProps {
  tocFilter: string;
  statusFilter: string;
  selectedTrainId: string | null;
  visibleCount: number;
  tocs: string[];
  onTocChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onClearSelection: () => void;
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(8,12,20,0.95)',
  border: '1px solid #1e2d45',
  borderRadius: '6px',
  color: '#cbd5e1',
  fontFamily: 'monospace',
  fontSize: '12px',
  padding: '5px 8px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  minWidth: '130px',
  flex: 1,
};

export const MapControls: React.FC<MapControlsProps> = ({
  tocFilter,
  statusFilter,
  selectedTrainId,
  visibleCount,
  tocs,
  onTocChange,
  onStatusChange,
  onClearSelection,
}) => {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'absolute',
        top: isMobile ? 8 : 14,
        left: isMobile ? 8 : 14,
        right: isMobile ? 8 : 'auto',
        zIndex: 1000,
        background: 'rgba(8,12,20,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid #1e2d45',
        borderRadius: '10px',
        padding: isMobile ? '8px 10px' : '10px 14px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
        {/* Operator filter */}
        <select
          value={tocFilter}
          onChange={(e) => onTocChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Operators</option>
          {tocs.map((id) => (
            <option key={id} value={id}>
              {tocLabel(id)}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{ ...selectStyle, minWidth: '100px' }}
        >
          <option value="">All Status</option>
          <option value="LATE">Late</option>
          <option value="ON TIME">On Time</option>
          <option value="EARLY">Early</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Count badge */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#475569',
            whiteSpace: 'nowrap',
            paddingLeft: '2px',
          }}
        >
          {visibleCount} trains
        </span>

        {/* Selected train pill */}
        {selectedTrainId && (
          <button
            onClick={onClearSelection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: '20px',
              color: '#93c5fd',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isMobile ? selectedTrainId : `Train ${selectedTrainId}`}
            <span style={{ fontSize: '12px', lineHeight: 1, opacity: 0.8 }}>✕</span>
          </button>
        )}
      </div>
    </div>
  );
};
