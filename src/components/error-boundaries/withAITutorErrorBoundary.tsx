import React from 'react';
import AITutorErrorBoundary from './AITutorErrorBoundary';

interface Props {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolateErrors?: boolean;
}

export const withAITutorErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Props
) => {
  return React.forwardRef<unknown, P>((props, ref) => (
    <AITutorErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </AITutorErrorBoundary>
  ));
};


