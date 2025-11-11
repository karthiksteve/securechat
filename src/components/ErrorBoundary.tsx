import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#0f172a',
          color: '#f1f5f9'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>⚠️ Configuration Error</h1>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '600px',
            border: '1px solid #334155'
          }}>
            <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#f87171' }}>
              {this.state.error?.message || 'Something went wrong'}
            </h2>
            <p style={{ marginBottom: '15px', color: '#cbd5e1' }}>
              This usually means environment variables are not set in Vercel.
            </p>
            <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '4px', fontSize: '14px' }}>
              <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Required environment variables:</p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>✓ VITE_SUPABASE_URL</li>
                <li>✓ VITE_SUPABASE_PUBLISHABLE_KEY</li>
                <li>✓ VITE_APP_URL</li>
              </ul>
            </div>
            <p style={{ marginTop: '15px', fontSize: '14px', color: '#94a3b8' }}>
              Go to Vercel → Settings → Environment Variables and add these values, then redeploy.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
