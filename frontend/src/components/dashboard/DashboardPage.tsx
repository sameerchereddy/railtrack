import React from 'react';
import { Sidebar } from './Sidebar';
import { EventTable } from './EventTable';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useIsMobile } from '../../lib/useIsMobile';

const DashboardPage: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '300px 1fr',
        gridTemplateRows: isMobile ? 'auto 1fr' : '1fr',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary>
        <EventTable />
      </ErrorBoundary>
    </div>
  );
};

export default DashboardPage;
