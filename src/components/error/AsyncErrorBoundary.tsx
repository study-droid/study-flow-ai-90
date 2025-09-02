import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { log } from '@/lib/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
    
    if (props.resetKeys) {
      this.previousResetKeys = props.resetKeys;
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Log error details
    log.error('AsyncErrorBoundary caught error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.level || 'component',
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-retry after 5 seconds for the first 3 errors
    if (this.state.errorCount < 3) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 5000);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    
    // Reset if resetKeys have changed
    if (resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== this.previousResetKeys[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
        this.previousResetKeys = resetKeys;
      }
    }
    
    // Reset if props have changed and resetOnPropsChange is true
    if (resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    });
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, fallback, isolate, level = 'component' } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Different error UIs based on level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                  <CardTitle>Something went wrong</CardTitle>
                </div>
                <CardDescription>
                  We encountered an unexpected error. Please try refreshing the page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono text-muted-foreground">
                    {error.message}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={this.resetErrorBoundary} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline"
                  >
                    Refresh Page
                  </Button>
                </div>
                {errorCount > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Error occurred {errorCount} times
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }

      if (level === 'section') {
        return (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="font-medium">Failed to load this section</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message}
              </p>
              <Button onClick={this.resetErrorBoundary} size="sm">
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        );
      }

      // Component level error (minimal UI)
      if (isolate) {
        return (
          <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
            <p className="text-sm text-destructive">Component error</p>
            <Button 
              onClick={this.resetErrorBoundary} 
              variant="ghost" 
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        );
      }

      // Default component error
      return (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm">Failed to load</p>
          <Button
            onClick={this.resetErrorBoundary}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return children;
  }
}

// HOC for wrapping async components
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );
  
  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}