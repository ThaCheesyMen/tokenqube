import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and error tracking service
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = '/#/dashboard';
    this.handleReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-[#1a1a1a] rounded-xl border border-red-500/20 p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                  <AlertTriangle className="w-16 h-16 text-red-500" />
                </div>
              </div>

              {/* Error Title */}
              <h1 className="text-3xl font-bold text-white text-center mb-4">
                Oops! Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-gray-400 text-center mb-6">
                We encountered an unexpected error. Don't worry, we've logged it and will fix it soon!
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-[#0f0f0f] rounded-lg border border-[#202225]">
                  <p className="text-red-400 font-mono text-sm mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-400">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-48">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-[#202225] hover:bg-[#2f3136] text-white rounded-lg font-semibold transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Go to Dashboard
                </button>
              </div>

              {/* Support Info */}
              <div className="mt-8 pt-6 border-t border-[#202225] text-center">
                <p className="text-sm text-gray-500">
                  Need help? Contact our{' '}
                  <a 
                    href="mailto:support@tokenqube.com" 
                    className="text-[#8B5CF6] hover:text-[#7C3AED] transition-colors"
                  >
                    support team
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component-level error boundary for smaller UI sections
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary
      fallback={
        <div className="bg-[#1a1a1a] rounded-lg border border-red-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-white font-semibold">Failed to load component</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            This section couldn't be loaded. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Page
          </button>
        </div>
      }
    >
      {children}
    </PageErrorBoundary>
  );
}

export default PageErrorBoundary;

