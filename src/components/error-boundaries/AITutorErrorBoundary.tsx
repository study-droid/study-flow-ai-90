/**
 * AI Tutor Error Boundary
 * 
 * Comprehensive error boundary specifically designed for the AI tutor chat system.
 * Handles errors gracefully while preserving chat history and providing recovery options.
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/services/logging/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolateErrors?: boolean; // If true, errors won't bubble up
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
  lastErrorTime: number;
}

export class AITutorErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second
  private errorReportingEnabled = true;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    // Log error details
    logger.error('AI Tutor Error Boundary caught an error', 'AITutorErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Report error to monitoring service (if enabled)
    if (this.errorReportingEnabled) {
      this.reportError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // This would integrate with your error reporting service
      // For now, we'll just log it comprehensively
      const errorReport = {
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'anonymous', // You could get this from your auth context
        sessionId: sessionStorage.getItem('session_id') || 'unknown'
      };

      logger.error('Detailed error report', 'AITutorErrorBoundary', errorReport);
      
      // Here you could send to your error reporting service:
      // await errorReportingService.reportError(errorReport);
      
    } catch (reportingError) {
      logger.warn('Failed to report error', 'AITutorErrorBoundary', reportingError);
    }
  };

  private handleRetry = () => {
    const now = Date.now();
    const timeSinceLastError = now - this.state.lastErrorTime;
    
    // Prevent rapid retry attempts
    if (timeSinceLastError < this.retryDelay) {
      setTimeout(this.handleRetry, this.retryDelay - timeSinceLastError);
      return;
    }

    // Check retry limit
    if (this.state.retryCount >= this.maxRetries) {
      logger.warn(`Max retries (${this.maxRetries}) exceeded for error boundary`, 'AITutorErrorBoundary');
      return;
    }

    logger.info(`Retrying AI Tutor after error (attempt ${this.state.retryCount + 1}/${this.maxRetries})`, 'AITutorErrorBoundary');
    
    // Reset error state and increment retry count
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
      lastErrorTime: now
    });
  };

  private handleReset = () => {
    logger.info('Resetting AI Tutor error boundary', 'AITutorErrorBoundary');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  private handleRefreshPage = () => {
    logger.info('Refreshing page due to AI Tutor error', 'AITutorErrorBoundary');
    window.location.reload();
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('timeout')) {
      return 'Timeout Error';
    }
    if (stack.includes('markdown') || stack.includes('reactmarkdown')) {
      return 'Rendering Error';
    }
    if (stack.includes('streaming') || stack.includes('websocket')) {
      return 'Streaming Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    
    return 'Application Error';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const category = this.getErrorCategory(error);
    
    switch (category) {
      case 'Network Error':
        return 'Unable to connect to the AI service. Please check your internet connection.';
      case 'Timeout Error':
        return 'The AI service is taking longer than usual to respond. This might be due to high demand.';
      case 'Rendering Error':
        return 'There was an issue displaying the AI response. The content might be malformed.';
      case 'Streaming Error':
        return 'Lost connection while receiving the AI response. The message may be incomplete.';
      case 'Permission Error':
        return 'You may need to sign in again to continue using the AI Tutor.';
      default:
        return 'The AI Tutor encountered an unexpected issue. This has been reported for investigation.';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const errorCategory = this.state.error ? this.getErrorCategory(this.state.error) : 'Unknown Error';
      const userMessage = this.state.error ? this.getUserFriendlyMessage(this.state.error) : 'An unexpected error occurred.';

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl text-red-800">
                AI Tutor Temporarily Unavailable
              </CardTitle>
              <CardDescription className="text-base">
                {userMessage}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Details (for debugging) */}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Technical Details (for support)
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                  <p><strong>Category:</strong> {errorCategory}</p>
                  <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  <p><strong>Time:</strong> {new Date(this.state.lastErrorTime).toLocaleString()}</p>
                  {this.state.error && (
                    <p><strong>Message:</strong> {this.state.error.message}</p>
                  )}
                </div>
              </details>

              {/* Recovery Actions */}
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReset}
                  className="w-full"
                  variant="outline"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reset AI Tutor
                </Button>
                
                <Button 
                  onClick={this.handleRefreshPage}
                  className="w-full"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>

              {/* Helpful Information */}
              <div className="text-xs text-muted-foreground text-center mt-4">
                <p>Your chat history is preserved and will be restored when the issue is resolved.</p>
                <p className="mt-1">
                  If this problem persists, please contact support with Error ID: 
                  <code className="bg-muted px-1 rounded ml-1">{this.state.errorId}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
// HOC moved to './withAITutorErrorBoundary'

export default AITutorErrorBoundary;
