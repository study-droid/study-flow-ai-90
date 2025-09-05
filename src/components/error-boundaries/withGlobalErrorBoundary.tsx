import React from 'react';
import GlobalErrorBoundary from './GlobalErrorBoundary';

interface Props {
  fallbackComponent?: React.ComponentType<unknown>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableErrorReporting?: boolean;
  showErrorDetails?: boolean;
}

export const withGlobalErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return React.forwardRef<unknown, P>((props, ref) => (
    <GlobalErrorBoundary {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </GlobalErrorBoundary>
  ));
};



