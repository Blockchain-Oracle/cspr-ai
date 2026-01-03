'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared/Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  theme?: 'light' | 'dark';
}

export function ErrorFallback({
  error,
  resetError,
  theme = 'dark',
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 p-8 text-center bg-card rounded-xl border border-destructive/20 shadow-sm animate-in fade-in zoom-in-95 duration-300">
       <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
       </div>
       <h2 className="text-xl font-bold">Something went wrong</h2>
       <p className="text-muted-foreground max-w-sm text-sm break-words">{error.message || "An unexpected error occurred."}</p>
       <Button onClick={resetError} variant="outline" className="mt-4 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
         Try again
       </Button>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error!}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}