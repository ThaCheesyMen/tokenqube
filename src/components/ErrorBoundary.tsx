import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  onNavigate?: (page: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    if (this.props.onNavigate) {
      this.props.onNavigate('home');
      this.setState({ hasError: false, error: null, errorInfo: null });
    } else {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-red-950 to-gray-900 flex items-center justify-center px-4">
          <div className="text-center max-w-2xl">
            {/* Error Icon */}
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-16 h-16 text-red-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 animate-pulse"></div>
            </div>

            {/* Error Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Oops! Something Went Wrong
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Don't worry, this is on us. Our team has been notified and we're looking into it.
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-400/30 rounded-xl text-left overflow-auto max-h-64">
                <p className="font-mono text-sm text-red-300 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-indigo-500/50 hover:scale-105"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105"
              >
                <Home className="w-5 h-5" />
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-8 text-sm text-gray-500">
              If this keeps happening, please contact support with error code: 
              <span className="font-mono ml-2 text-red-400">
                {this.state.error?.name || 'UNKNOWN_ERROR'}
              </span>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
