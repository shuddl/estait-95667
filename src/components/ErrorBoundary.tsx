"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Send error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to Sentry or similar
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
              <p className="text-white/70 mb-6">
                We apologize for the inconvenience. Please refresh the page or try again later.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="rounded-full bg-white text-black px-6 py-3 hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 text-left text-xs text-white/50">
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 overflow-auto">{this.state.error.stack}</pre>
                </details>
              )}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}