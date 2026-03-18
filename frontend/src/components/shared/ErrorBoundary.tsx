import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: '#0f1623',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '24px 32px',
              maxWidth: '500px',
              width: '100%',
            }}
          >
            <h2
              style={{
                color: '#fca5a5',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '6px 16px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '6px',
                color: '#fca5a5',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
