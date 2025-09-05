/**
 * Streaming Error Boundary
 * 
 * Specialized error boundary for streaming components and real-time features.
 * Handles connection issues, streaming failures, and recovery mechanisms.
 */

import React, { Component, ReactNode } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/services/logging/logger';

interface Props {
  children: ReactNode;
  onStreamingError?: (error: Error) => void;
  onRecovery?: () => void;
  enableAutoRecovery?: boolean;
  recoveryInterval?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export class StreamingErrorBoundary extends Component<Props, State> {
  private maxRecoveryAttempts = 5;
  private recoveryTimer?: NodeJS.Timeout;
  private recoveryInterval: number;

  constructor(props: Props) {
    super(props);
    
    this.recoveryInterval = props.recoveryInterval || 3000; // 3 seconds default
    
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: 0,
      connectionStatus: 'connected'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Determine if this is a streaming-related error
    const isStreamingError = 
      error.message.includes('stream') ||
      error.message.includes('connection') ||
      error.message.includes('websocket') ||
      error.message.includes('timeout') ||
      error.message.includes('network');

    return {
      hasError: true,
      error,
      connectionStatus: isStreamingError ? 'disconnected' : 'connected'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onStreamingError } = this.props;
    
    logger.error('Streaming Error Boundary caught an error', 'StreamingErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      connectionStatus: this.state.connectionStatus
    });

    // Call custom error handler if provided
    if (onStreamingError) {
      onStreamingError(error);
    }

    // Start auto-recovery if enabled
    if (this.props.enableAutoRecovery && this.isStreamingError(error)) {
      this.startAutoRecovery();
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  private isStreamingError = (error: Error): boolean => {
    const streamingKeywords = [
      'stream', 'connection', 'websocket', 'timeout', 
      'network', 'aborted', 'fetch', 'cors'
    ];
    
    return streamingKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  };

  private startAutoRecovery = () => {
    if (this.state.recoveryAttempts >= this.maxRecoveryAttempts) {
      logger.warn('Max recovery attempts reached', 'StreamingErrorBoundary');
      this.setState({ connectionStatus: 'disconnected' });
      return;
    }

    this.setState({ 
      isRecovering: true,
      connectionStatus: 'reconnecting'
    });

    logger.info(`Starting auto-recovery attempt ${this.state.recoveryAttempts + 1}`, 'StreamingErrorBoundary');

    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, this.recoveryInterval * Math.pow(2, this.state.recoveryAttempts)); // Exponential backoff
  };

  private attemptRecovery = () => {
    const { onRecovery } = this.props;
    
    logger.info('Attempting streaming recovery', 'StreamingErrorBoundary');
    
    this.setState({
      hasError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: this.state.recoveryAttempts + 1,
      lastRecoveryTime: Date.now(),
      connectionStatus: 'connected'
    });

    // Call custom recovery handler if provided
    if (onRecovery) {
      onRecovery();
    }
  };

  private handleManualRetry = () => {
    logger.info('Manual retry initiated', 'StreamingErrorBoundary');
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.attemptRecovery();
  };

  private handleReset = () => {
    logger.info('Resetting streaming error boundary', 'StreamingErrorBoundary');
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.setState({
      hasError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: 0,
      connectionStatus: 'connected'
    });
  };

  private getErrorType = (error: Error): 'connection' | 'timeout' | 'stream' | 'other' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('network')) {
      return 'connection';
    }
    if (message.includes('timeout')) {
      return 'timeout';
    }
    if (message.includes('stream') || message.includes('websocket')) {
      return 'stream';
    }
    
    return 'other';
  };

  private getErrorMessage = (error: Error): string => {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case 'connection':
        return 'Connection to the AI service was lost. Attempting to reconnect...';
      case 'timeout':
        return 'The connection timed out. This may be due to network issues or high server load.';
      case 'stream':
        return 'The data stream was interrupted. This may cause incomplete responses.';
      default:
        return 'An error occurred while communicating with the AI service.';
    }
  };

  private getConnectionIcon = () => {
    switch (this.state.connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-600" />;
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  private getStatusMessage = (): string => {
    switch (this.state.connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Connection Lost';
      case 'reconnecting':
        return `Reconnecting... (${this.state.recoveryAttempts}/${this.maxRecoveryAttempts})`;
      default:
        return 'Unknown Status';
    }
  };

  render() {
    // Show connection status indicator
    const showConnectionStatus = 
      this.state.connectionStatus !== 'connected' || 
      this.state.hasError;

    if (this.state.hasError) {
      const errorMessage = this.state.error ? this.getErrorMessage(this.state.error) : 'An unknown error occurred.';
      const canRetry = this.state.recoveryAttempts < this.maxRecoveryAttempts;

      return (
        <div className="space-y-4">
          {/* Connection Status Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              {this.getConnectionIcon()}
              <span className="text-sm font-medium">
                {this.getStatusMessage()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {canRetry && !this.state.isRecovering && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRecovering}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={this.handleReset}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Streaming Error</AlertTitle>
            <AlertDescription className="mt-2">
              {errorMessage}
              
              {this.state.recoveryAttempts > 0 && (
                <div className="mt-2 text-xs">
                  Recovery attempts: {this.state.recoveryAttempts}/{this.maxRecoveryAttempts}
                </div>
              )}
              
              {!canRetry && (
                <div className="mt-2 text-xs">
                  Maximum retry attempts reached. Please refresh the page or contact support.
                </div>
              )}
            </AlertDescription>
          </Alert>

          {/* Show children with overlay when recovering */}
          <div className={`relative ${this.state.isRecovering ? 'opacity-75 pointer-events-none' : ''}`}>
            {this.props.children}
            
            {this.state.isRecovering && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Reconnecting...
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show connection status bar if not connected
    if (showConnectionStatus) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded border">
            <div className="flex items-center gap-2">
              {this.getConnectionIcon()}
              <span className="text-xs">
                {this.getStatusMessage()}
              </span>
            </div>
          </div>
          {this.props.children}
        </div>
      );
    }

    return this.props.children;
  }
}

export default StreamingErrorBoundary;