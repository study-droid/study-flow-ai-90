/**
 * Global Error Boundary
 * 
 * Catches all unhandled React errors throughout the entire application.
 * Provides comprehensive error reporting, user-friendly fallback UI,
 * and recovery mechanisms.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/services/logging/logger';
import { reportError } from '@/shared/utils/error';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableErrorReporting?: boolean;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorBoundaryStack: string[];
  userAgent: string;
  timestamp: string;
  retryCount: number;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  refreshPage: () => void;
  errorId: string;
}

interface ErrorReport {
  errorId: string;
  timestamp: string;
  message: string;
  stack: string;
  componentStack: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildInfo: {
    version: string;
    environment: string;
  };
  systemInfo: {
    viewport: string;
    colorScheme: string;
    language: string;
  };
  errorBoundaryStack: string[];
  retryCount: number;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private readonly maxRetries = 2;
  private readonly isDevelopment = import.meta.env.DEV;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorBoundaryStack: [],
      userAgent: navigator.userAgent,
      timestamp: '',
      retryCount: 0
    };

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date().toISOString(),
      errorBoundaryStack: ['GlobalErrorBoundary']
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableErrorReporting = true } = this.props;
    
    // Update state with detailed error info
    this.setState({
      errorInfo
    });

    // Log error locally
    logger.error('Global Error Boundary caught an error', 'GlobalErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        logger.error('Error handler itself threw an error', 'GlobalErrorBoundary', handlerError);
      }
    }

    // Report error if enabled
    if (enableErrorReporting) {
      this.reportErrorToServices(error, errorInfo);
    }

    // Track error patterns for debugging
    this.trackErrorPattern(error);
  }

  /**
   * Set up global error handlers for unhandled promises and JS errors
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection caught by Global Error Boundary', 'GlobalErrorBoundary', {
        reason: event.reason,
        promise: event.promise
      });

      // Create a synthetic error for consistent handling
      const syntheticError = new Error(
        event.reason instanceof Error ? event.reason.message : String(event.reason)
      );
      syntheticError.name = 'UnhandledPromiseRejection';
      syntheticError.stack = event.reason instanceof Error ? event.reason.stack : 'No stack trace available';

      // Report the error
      if (this.props.enableErrorReporting !== false) {
        this.reportErrorToServices(syntheticError, {
          componentStack: 'Promise rejection outside React component tree'
        } as ErrorInfo);
      }

      // Prevent the default browser behavior
      event.preventDefault();
    });

    // Handle general JavaScript errors
    window.addEventListener('error', (event) => {
      logger.error('JavaScript error caught by Global Error Boundary', 'GlobalErrorBoundary', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });

      if (event.error && this.props.enableErrorReporting !== false) {
        this.reportErrorToServices(event.error, {
          componentStack: `JavaScript error at ${event.filename}:${event.lineno}:${event.colno}`
        } as ErrorInfo);
      }
    });
  }

  /**
   * Report error to external services
   */
  private async reportErrorToServices(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const errorReport: ErrorReport = {
        errorId: this.state.errorId,
        timestamp: this.state.timestamp || new Date().toISOString(),
        message: error.message,
        stack: error.stack || 'No stack trace available',
        componentStack: errorInfo.componentStack,
        userAgent: this.state.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId(),
        buildInfo: {
          version: import.meta.env.VITE_APP_VERSION || 'unknown',
          environment: import.meta.env.NODE_ENV || 'unknown'
        },
        systemInfo: {
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          language: navigator.language
        },
        errorBoundaryStack: this.state.errorBoundaryStack,
        retryCount: this.state.retryCount
      };

      // Use the existing error reporting utility
      reportError(error, {
        errorReport,
        source: 'GlobalErrorBoundary'
      });

      // In a production environment, you would also send to external services:
      // - Sentry: Sentry.captureException(error, { extra: errorReport })
      // - Bugsnag: Bugsnag.notify(error, { metaData: errorReport })
      // - LogRocket: LogRocket.captureException(error)
      // - Custom API: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) })

    } catch (reportingError) {
      logger.error('Failed to report error to external services', 'GlobalErrorBoundary', reportingError);
    }
  }

  /**
   * Track error patterns for debugging and monitoring
   */
  private trackErrorPattern(error: Error): void {
    const errorKey = `${error.name}_${error.message}`;
    const existingCount = parseInt(localStorage.getItem(`error_count_${errorKey}`) || '0');
    const newCount = existingCount + 1;
    
    localStorage.setItem(`error_count_${errorKey}`, newCount.toString());
    localStorage.setItem(`last_error_${errorKey}`, new Date().toISOString());

    // Log pattern if it's becoming frequent
    if (newCount >= 3) {
      logger.warn(`Error pattern detected: ${errorKey} occurred ${newCount} times`, 'GlobalErrorBoundary', {
        errorName: error.name,
        errorMessage: error.message,
        occurrences: newCount
      });
    }
  }

  /**
   * Get current user ID (if available)
   */
  private getCurrentUserId(): string | undefined {
    try {
      // Try to get user ID from local storage or global state
      return localStorage.getItem('user_id') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get current session ID
   */
  private getSessionId(): string {
    try {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    } catch {
      return 'session_unknown';
    }
  }

  /**
   * Reset the error boundary state
   */
  private handleReset = (): void => {
    logger.info('Resetting Global Error Boundary', 'GlobalErrorBoundary', {
      errorId: this.state.errorId
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorBoundaryStack: [],
      timestamp: '',
      retryCount: 0
    });
  };

  /**
   * Refresh the entire page
   */
  private handleRefreshPage = (): void => {
    logger.info('Refreshing page due to global error', 'GlobalErrorBoundary', {
      errorId: this.state.errorId
    });
    
    window.location.reload();
  };

  /**
   * Retry rendering with incremented retry count
   */
  private handleRetry = (): void => {
    if (this.state.retryCount >= this.maxRetries) {
      logger.warn('Max retry attempts reached for Global Error Boundary', 'GlobalErrorBoundary');
      return;
    }

    logger.info(`Retrying after global error (attempt ${this.state.retryCount + 1}/${this.maxRetries})`, 'GlobalErrorBoundary');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorBoundaryStack: [],
      timestamp: '',
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Categorize error for better user messaging
   */
  private getErrorCategory(error: Error): {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userMessage: string;
    technicalMessage: string;
  } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network/API errors
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return {
        category: 'Network Error',
        severity: 'medium',
        userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
        technicalMessage: 'Network connectivity or API communication failure'
      };
    }

    // Memory/Resource errors
    if (message.includes('memory') || message.includes('maximum call stack')) {
      return {
        category: 'Resource Error',
        severity: 'high',
        userMessage: 'The application is using too many resources. Please refresh the page.',
        technicalMessage: 'Memory exhaustion or stack overflow detected'
      };
    }

    // Component rendering errors
    if (stack.includes('render') || stack.includes('component')) {
      return {
        category: 'Rendering Error',
        severity: 'medium',
        userMessage: 'There was a problem displaying this content. Some features may be temporarily unavailable.',
        technicalMessage: 'React component rendering failure'
      };
    }

    // Permission/Auth errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return {
        category: 'Authentication Error',
        severity: 'medium',
        userMessage: 'Your session may have expired. Please sign in again.',
        technicalMessage: 'Authentication or authorization failure'
      };
    }

    // Default case
    return {
      category: 'Application Error',
      severity: 'high',
      userMessage: 'Something unexpected happened. We\'ve been notified and are looking into it.',
      technicalMessage: 'Unhandled application exception'
    };
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo!}
            resetError={this.handleReset}
            refreshPage={this.handleRefreshPage}
            errorId={this.state.errorId}
          />
        );
      }

      const errorDetails = this.getErrorCategory(this.state.error);
      const canRetry = this.state.retryCount < this.maxRetries;
      const showTechnicalDetails = this.isDevelopment || this.props.showErrorDetails;

      return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <CardTitle className="text-2xl text-red-800 mb-2">
                Oops! Something went wrong
              </CardTitle>
              
              <CardDescription className="text-base leading-relaxed">
                {errorDetails.userMessage}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Severity Indicator */}
              <Alert variant={errorDetails.severity === 'critical' ? 'destructive' : 'default'}>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>{errorDetails.category}</strong>: {errorDetails.technicalMessage}
                </AlertDescription>
              </Alert>

              {/* Technical Details (Development/Debug) */}
              {showTechnicalDetails && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground font-medium">
                    Technical Details (for developers)
                  </summary>
                  <div className="mt-3 p-4 bg-muted rounded-md font-mono text-xs space-y-2">
                    <div><strong>Error ID:</strong> {this.state.errorId}</div>
                    <div><strong>Timestamp:</strong> {this.state.timestamp}</div>
                    <div><strong>Message:</strong> {this.state.error.message}</div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Recovery Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex-1"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReset}
                  className="flex-1"
                  variant={canRetry ? "outline" : "default"}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Reset Application
                </Button>
                
                <Button 
                  onClick={this.handleRefreshPage}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>

              {/* Support Information */}
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>If this problem persists, please contact support:</p>
                <div className="flex justify-center items-center gap-4 text-xs">
                  <span>Error ID: <code className="bg-muted px-2 py-1 rounded">{this.state.errorId}</code></span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(this.state.errorId);
                    }}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Copy ID
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping any component with global error boundary
 */
// HOC moved to './withGlobalErrorBoundary'

export default GlobalErrorBoundary;
