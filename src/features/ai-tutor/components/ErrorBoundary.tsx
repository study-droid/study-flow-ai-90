/**
 * Enhanced Error Boundary with Recovery Options
 * Provides graceful error handling with user-friendly messages and recovery actions
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Bug, 
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { errorHandler, type ClassifiedError } from '../services/error-handler.service';
import { logger } from '@/services/logging/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  classifiedError: ClassifiedError | null;
  isRecovering: boolean;
  recoveryAttempted: boolean;
  recoveryResult: string | null;
}

export class AITutorErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      classifiedError: null,
      isRecovering: false,
      recoveryAttempted: false,
      recoveryResult: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Classify the error using our error handler service
    const classifiedError = errorHandler.classifyError(error, {
      component: 'AITutorErrorBoundary',
      timestamp: Date.now()
    });

    logger.error('Error boundary caught error', 'ErrorBoundary', {
      category: classifiedError.category,
      severity: classifiedError.severity,
      message: error.message,
      stack: error.stack
    });

    return {
      hasError: true,
      classifiedError,
      isRecovering: false,
      recoveryAttempted: false,
      recoveryResult: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('Error boundary component stack', 'ErrorBoundary', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AITutorErrorBoundary'
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // Attempt automatic recovery if available
    if (this.state.classifiedError?.recoveryActions.some(action => action.automatic)) {
      this.attemptAutomaticRecovery();
    }
  }

  private attemptAutomaticRecovery = async () => {
    if (!this.state.classifiedError || this.state.isRecovering) return;

    this.setState({ isRecovering: true });

    try {
      const result = await errorHandler.attemptRecovery(
        this.state.classifiedError,
        async () => {
          // Simulate recovery by resetting error state
          this.setState({ hasError: false, classifiedError: null });
          return Promise.resolve();
        }
      );

      this.setState({
        isRecovering: false,
        recoveryAttempted: true,
        recoveryResult: result.success 
          ? `✅ ${result.message}` 
          : `❌ ${result.message}`
      });

      if (result.success) {
        // Reset error state after successful recovery
        setTimeout(() => {
          this.setState({
            hasError: false,
            classifiedError: null,
            recoveryAttempted: false,
            recoveryResult: null
          });
        }, 2000);
      }

    } catch (recoveryError) {
      logger.error('Automatic recovery failed', 'ErrorBoundary', {
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });

      this.setState({
        isRecovering: false,
        recoveryAttempted: true,
        recoveryResult: '❌ Automatic recovery failed'
      });
    }
  };

  private handleManualRecovery = async (action: () => void | Promise<void>) => {
    this.setState({ isRecovering: true });

    try {
      await action();
      
      this.setState({
        isRecovering: false,
        recoveryAttempted: true,
        recoveryResult: '✅ Manual recovery completed'
      });

      // Reset error state after manual recovery
      setTimeout(() => {
        this.setState({
          hasError: false,
          classifiedError: null,
          recoveryAttempted: false,
          recoveryResult: null
        });
      }, 1000);

    } catch (error) {
      logger.error('Manual recovery failed', 'ErrorBoundary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.setState({
        isRecovering: false,
        recoveryResult: '❌ Manual recovery failed'
      });
    }
  };

  private handleRetry = () => {
    if (this.retryCount >= this.maxRetries) {
      this.setState({
        recoveryResult: '❌ Maximum retry attempts reached'
      });
      return;
    }

    this.retryCount++;
    this.setState({
      hasError: false,
      classifiedError: null,
      isRecovering: false,
      recoveryAttempted: false,
      recoveryResult: null
    });
  };

  private getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { classifiedError, isRecovering, recoveryResult } = this.state;
    
    if (!classifiedError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    const userFriendlyMessage = errorHandler.getUserFriendlyMessage(classifiedError);

    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <CardTitle className="text-xl">{userFriendlyMessage.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className={this.getSeverityColor(classifiedError.severity)}
                    >
                      {classifiedError.severity}
                    </Badge>
                    <Badge variant="secondary">
                      {classifiedError.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Message */}
            <Alert>
              <AlertDescription className="text-base">
                {userFriendlyMessage.message}
              </AlertDescription>
            </Alert>

            {/* Recovery Status */}
            {recoveryResult && (
              <Alert className={recoveryResult.startsWith('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-center gap-2">
                  {recoveryResult.startsWith('✅') ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <AlertDescription>{recoveryResult}</AlertDescription>
                </div>
              </Alert>
            )}

            {/* Actionable Guidance */}
            {userFriendlyMessage.guidance.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">What you can do:</h4>
                <ul className="space-y-2">
                  {userFriendlyMessage.guidance.map((guidance, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full mt-2 shrink-0" />
                      {guidance}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recovery Actions */}
            <div className="flex flex-wrap gap-3">
              {/* Retry Button */}
              {classifiedError.retryable && this.retryCount < this.maxRetries && (
                <Button 
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  variant="default"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
                  Try Again ({this.maxRetries - this.retryCount} left)
                </Button>
              )}

              {/* Manual Recovery Actions */}
              {userFriendlyMessage.actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => this.handleManualRecovery(action.action)}
                  disabled={isRecovering}
                  variant={action.primary ? "default" : "outline"}
                >
                  {action.label}
                </Button>
              ))}

              {/* Home Button */}
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Error Details (Development) */}
            {(this.props.showErrorDetails || import.meta.env.DEV) && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  <Bug className="w-4 h-4 inline mr-2" />
                  Technical Details
                </summary>
                <div className="mt-3 p-4 bg-muted rounded-lg">
                  <div className="space-y-2 text-sm font-mono">
                    <div><strong>Error:</strong> {classifiedError.originalError.message}</div>
                    <div><strong>Code:</strong> {classifiedError.code}</div>
                    <div><strong>Category:</strong> {classifiedError.category}</div>
                    <div><strong>Retryable:</strong> {classifiedError.retryable ? 'Yes' : 'No'}</div>
                    <div><strong>Fallback Available:</strong> {classifiedError.fallbackAvailable ? 'Yes' : 'No'}</div>
                    {classifiedError.originalError.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Stack Trace</summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-32 bg-background p-2 rounded border">
                          {classifiedError.originalError.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </details>
            )}

            {/* Support Link */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                If this problem continues, please{' '}
                <Button variant="link" className="p-0 h-auto text-sm" asChild>
                  <a href="/support" target="_blank" rel="noopener noreferrer">
                    contact support
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
                {' '}with the error details above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AITutorErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AITutorErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook to manually trigger error boundary (for testing)
 */
export function useErrorBoundary() {
  return (error: Error) => {
    throw error;
  };
}