/**
 * DeepSeek Error Boundary
 * Specialized error boundary for DeepSeek response rendering with fallback mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  FileText, 
  Bug, 
  Brain,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/services/logging/logger';

interface DeepSeekErrorBoundaryProps {
  children: ReactNode;
  fallbackContent?: string;
  messageId?: string;
  enableRawFallback?: boolean;
  enableRetry?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  onFallbackUsed?: (fallbackType: 'raw' | 'simple') => void;
  className?: string;
}

interface DeepSeekErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  fallbackType?: 'raw' | 'simple';
  errorId: string;
}

export class DeepSeekErrorBoundary extends Component<
  DeepSeekErrorBoundaryProps,
  DeepSeekErrorBoundaryState
> {
  private static readonly MAX_RETRIES = 3;
  private static readonly ERROR_PATTERNS = {
    MARKDOWN_PROCESSING: /markdown|processing|render/i,
    VALIDATION: /validation|schema|structure/i,
    STREAMING: /stream|chunk|buffer/i,
    MEMORY: /memory|heap|allocation/i,
    NETWORK: /network|fetch|request/i
  };

  constructor(props: DeepSeekErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0,
      errorId: this.generateErrorId()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DeepSeekErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.generateErrorId();
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error with context
    logger.error('DeepSeek rendering error caught by boundary', 'DeepSeekErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      messageId: this.props.messageId,
      retryCount: this.state.retryCount,
      errorId,
      errorType: this.categorizeError(error)
    });

    // Call error callback
    this.props.onError?.(error, errorInfo);

    // Auto-retry for certain error types
    if (this.shouldAutoRetry(error) && this.state.retryCount < DeepSeekErrorBoundary.MAX_RETRIES) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  private generateErrorId(): string {
    return `deepseek-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    for (const [category, pattern] of Object.entries(DeepSeekErrorBoundary.ERROR_PATTERNS)) {
      if (pattern.test(message)) {
        return category.toLowerCase();
      }
    }
    
    return 'unknown';
  }

  private shouldAutoRetry(error: Error): boolean {
    const errorType = this.categorizeError(error);
    
    // Auto-retry for transient errors
    return ['network', 'streaming', 'memory'].includes(errorType);
  }

  private handleRetry = () => {
    logger.info('Retrying DeepSeek component render', 'DeepSeekErrorBoundary', {
      retryCount: this.state.retryCount + 1,
      errorId: this.state.errorId
    });

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      fallbackType: undefined
    }));

    this.props.onRetry?.();
  };

  private handleRawFallback = () => {
    logger.info('Using raw content fallback', 'DeepSeekErrorBoundary', {
      messageId: this.props.messageId,
      errorId: this.state.errorId
    });

    this.setState({
      fallbackType: 'raw'
    });

    this.props.onFallbackUsed?.('raw');
  };

  private handleSimpleFallback = () => {
    logger.info('Using simple content fallback', 'DeepSeekErrorBoundary', {
      messageId: this.props.messageId,
      errorId: this.state.errorId
    });

    this.setState({
      fallbackType: 'simple'
    });

    this.props.onFallbackUsed?.('simple');
  };

  private renderRawFallback() {
    const { fallbackContent } = this.props;
    
    if (!fallbackContent) {
      return this.renderSimpleFallback();
    }

    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <FileText className="w-4 h-4" />
            Raw Content Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Rendering Issue</AlertTitle>
              <AlertDescription>
                Enhanced rendering failed. Displaying raw content as fallback.
              </AlertDescription>
            </Alert>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm font-mono overflow-x-auto">
                {fallbackContent}
              </pre>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Try Enhanced Rendering
              </Button>
              
              <Badge variant="secondary" className="text-xs">
                Raw Fallback Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  private renderSimpleFallback() {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <Bug className="w-4 h-4" />
            Rendering Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>DeepSeek Rendering Failed</AlertTitle>
              <AlertDescription>
                Unable to render the AI response. This might be due to complex content or a temporary issue.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= DeepSeekErrorBoundary.MAX_RETRIES}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Retry ({this.state.retryCount}/{DeepSeekErrorBoundary.MAX_RETRIES})
              </Button>
              
              {this.props.enableRawFallback && this.props.fallbackContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRawFallback}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-3 h-3" />
                  Show Raw Content
                </Button>
              )}
              
              <Badge variant="destructive" className="text-xs">
                Error ID: {this.state.errorId.slice(-8)}
              </Badge>
            </div>
            
            {/* Error details for debugging */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="text-xs font-mono space-y-2">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Type:</strong> {this.categorizeError(this.state.error)}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 text-xs overflow-x-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  render() {
    if (this.state.hasError) {
      // Show fallback based on type
      if (this.state.fallbackType === 'raw') {
        return this.renderRawFallback();
      } else {
        return this.renderSimpleFallback();
      }
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with DeepSeek error boundary
 */
export function withDeepSeekErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Partial<DeepSeekErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <DeepSeekErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </DeepSeekErrorBoundary>
  );

  WrappedComponent.displayName = `withDeepSeekErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default DeepSeekErrorBoundary;