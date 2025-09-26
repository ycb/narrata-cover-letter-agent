import React from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AlertTriangle } from 'lucide-react';

interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
  loadingText?: string;
  errorTitle?: string;
  className?: string;
}

export function LoadingState({
  isLoading,
  error,
  onRetry,
  children,
  loadingText = 'Loading...',
  errorTitle = 'Error',
  className = ''
}: LoadingStateProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">{loadingText}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
          <h3 className="text-xl font-semibold text-foreground">{errorTitle}</h3>
          <p className="text-muted-foreground">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-primary hover:underline"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default LoadingState;
