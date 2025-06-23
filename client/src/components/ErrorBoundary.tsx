import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Check if it's a CSS-related error
    if (error.message.includes('CSS') || error.message.includes('style') || error.message.includes('tailwind')) {
      console.warn('CSS-related error detected, attempting to recover...');
      // Could trigger a CSS reload or fallback here
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with basic styles
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h1 style={{
              color: '#dc2626',
              fontSize: '1.5rem',
              marginBottom: '1rem'
            }}>
              Something went wrong
            </h1>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem'
            }}>
              The application encountered an error. This might be due to a styling issue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reload Application
            </button>
            {this.state.error && (
              <details style={{
                marginTop: '1rem',
                textAlign: 'left'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  Error Details
                </summary>
                <pre style={{
                  backgroundColor: '#f3f4f6',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '0.5rem'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 