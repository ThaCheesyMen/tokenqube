import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] rounded-xl p-8 max-w-2xl w-full border border-[#202225]">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-400 mt-1">
                  We're sorry for the inconvenience
                </p>
              </div>
            </div>

            <div className="bg-[#202225] rounded-lg p-4 mb-6">
              <p className="text-red-400 font-mono text-sm mb-2">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-2">
                  <summary className="text-gray-400 text-xs cursor-pointer hover:text-white">
                    Show technical details
                  </summary>
                  <pre className="text-gray-500 text-xs mt-2 overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition font-medium"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 px-6 py-3 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#4f5660] transition font-medium"
              >
                Go to Dashboard
              </button>
            </div>

            <p className="text-gray-500 text-sm text-center mt-4">
              If this problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

