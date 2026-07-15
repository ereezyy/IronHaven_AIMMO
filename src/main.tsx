import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#050507',
        color: '#c03a30',
        fontFamily: 'monospace',
        padding: '2rem',
      }}
    >
      <h2
        style={{
          color: '#c03a30',
          fontSize: 24,
          letterSpacing: '0.15em',
          marginBottom: 16,
        }}
      >
        RUNTIME ERROR
      </h2>
      <pre
        style={{
          color: '#888',
          maxWidth: 700,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {error.message}
      </pre>
      <p style={{ color: '#555', marginTop: 32 }}>
        Check browser console (F12) for stack trace.
      </p>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
