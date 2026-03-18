import React from 'react';
import { tocName } from '../../lib/constants';

interface TocChipProps {
  id: string;
}

export const TocChip: React.FC<TocChipProps> = ({ id }) => {
  if (!id) return null;
  return (
    <span
      title={`TOC ${id}`}
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 600,
        background: '#161e2e',
        color: '#06b6d4',
        border: '1px solid #1e2d45',
        maxWidth: '180px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {tocName(id)}
    </span>
  );
};
