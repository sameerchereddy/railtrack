import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/layout/NavBar';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

const MapPage = lazy(() => import('./components/map/MapPage'));

const PageFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#475569',
      fontSize: '13px',
    }}
  >
    Loading…
  </div>
);

function App() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '56px 1fr',
        height: '100vh',
        maxHeight: '-webkit-fill-available',
        overflow: 'hidden',
      }}
    >
      <NavBar />
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
