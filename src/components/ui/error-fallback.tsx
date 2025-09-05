/**
 * User-Friendly Error Fallback Components
 * 
 * Comprehensive collection of error fallback components with recovery mechanisms,
 * user-friendly messaging, and accessible interfaces.
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Mail, 
  ExternalLink, 
  Copy,
  CheckCircle,
  WifiOff,
  AlertCircle,
  Bug,
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

export interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: any;
  resetError?: () => void;
  refreshPage?: () => void;
  errorId?: string;
  context?: string;
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Network Error Fallback - For connection issues
 */
export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({
  resetError,
  refreshPage,
  canRetry = true,
  retryCount = 0,
  maxRetries = 3
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleRetryWithDelay = async () => {
    setIsRetrying(true);
    setCountdown(3);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRetrying(false);
          resetError?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-blue-800">Connection Issue</CardTitle>
          <CardDescription>
            We're having trouble connecting to our servers. This is usually temporary.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What you can try:</AlertTitle>
            <AlertDescription className="mt-2 space-y-1">
              <div>• Check your internet connection</div>
              <div>• Refresh the page</div>
              <div>• Try again in a few moments</div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            {canRetry && !isRetrying && (
              <Button 
                onClick={handleRetryWithDelay}
                className="w-full"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryCount >= maxRetries 
                  ? 'Max retries reached' 
                  : `Retry Connection (${maxRetries - retryCount} attempts left)`
                }
              </Button>
            )}
            
            {isRetrying && (
              <div className="space-y-2">
                <div className="text-center text-sm text-muted-foreground">
                  Retrying in {countdown} seconds...
                </div>
                <Progress value={(3 - countdown) / 3 * 100} className="w-full" />
              </div>
            )}
            
            <Button 
              onClick={refreshPage}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            If the problem persists, please check your network settings or contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Authentication Error Fallback - For auth issues
 */
export const AuthErrorFallback: React.FC<ErrorFallbackProps> = ({
  resetError,
  refreshPage,
  error
}) => {
  const handleSignIn = () => {
    // Navigate to sign in page
    window.location.href = '/auth';
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    refreshPage?.();
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl text-yellow-800">Authentication Required</CardTitle>
          <CardDescription>
            Your session may have expired or you need to sign in to continue.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription className="mt-2">
              {error?.message || 'Your authentication credentials are no longer valid. This happens for security reasons.'}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button onClick={handleSignIn} className="w-full">
              <Shield className="w-4 h-4 mr-2" />
              Sign In Again
            </Button>
            
            <Button 
              onClick={handleClearCache}
              variant="outline"
              className="w-full"
            >
              Clear Cache & Refresh
            </Button>
            
            <Button 
              onClick={resetError}
              variant="ghost"
              className="w-full"
            >
              Try Without Signing In
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Your data is safe. Sign in to access all features.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Rate Limit Error Fallback - For API rate limiting
 */
export const RateLimitErrorFallback: React.FC<ErrorFallbackProps> = ({
  resetError,
  error
}) => {
  const [timeRemaining, setTimeRemaining] = useState(60); // Start with 1 minute
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <CardTitle className="text-xl text-purple-800">Please Wait</CardTitle>
          <CardDescription>
            You've reached the usage limit. Please wait before trying again.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Rate Limit Reached</AlertTitle>
            <AlertDescription className="mt-2">
              {error?.message || 'To ensure fair usage for all users, we limit the number of requests per minute.'}
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-2">
            <div className="text-2xl font-mono font-bold">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-muted-foreground">
              Time remaining until you can try again
            </div>
            <Progress value={(60 - timeRemaining) / 60 * 100} className="w-full" />
          </div>

          <Button 
            onClick={resetError}
            className="w-full"
            disabled={timeRemaining > 0}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {timeRemaining > 0 ? 'Please wait...' : 'Try Again'}
          </Button>

          <div className="text-xs text-center text-muted-foreground">
            Consider upgrading your plan for higher usage limits.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Server Error Fallback - For 5xx errors
 */
export const ServerErrorFallback: React.FC<ErrorFallbackProps> = ({
  resetError,
  refreshPage,
  errorId,
  canRetry = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyErrorId = async () => {
    if (errorId) {
      await navigator.clipboard.writeText(errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReportIssue = () => {
    const subject = encodeURIComponent('Server Error Report');
    const body = encodeURIComponent(`Error ID: ${errorId}\nTime: ${new Date().toISOString()}\n\nPlease describe what you were doing when this error occurred:`);
    window.open(`mailto:support@studyflow.ai?subject=${subject}&body=${body}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-800">Server Error</CardTitle>
          <CardDescription>
            Something went wrong on our end. We've been automatically notified.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <Bug className="h-4 w-4" />
            <AlertTitle>What we're doing:</AlertTitle>
            <AlertDescription className="mt-2 space-y-1">
              <div>• Our team has been notified</div>
              <div>• We're working to fix this quickly</div>
              <div>• Your data is safe</div>
            </AlertDescription>
          </Alert>

          {errorId && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Error Reference:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-2 py-1 rounded text-xs">
                  {errorId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyErrorId}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button onClick={resetError} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button onClick={refreshPage} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button onClick={handleReportIssue} variant="ghost" className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Try refreshing the page or check our status page for updates.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Generic Error Fallback - For unknown errors
 */
export const GenericErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  refreshPage,
  errorId,
  context = 'application'
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-gray-600" />
          </div>
          <CardTitle className="text-xl text-gray-800">Unexpected Error</CardTitle>
          <CardDescription>
            Something unexpected happened in the {context}. Don't worry - your data is safe.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <Bug className="h-4 w-4" />
            <AlertTitle>What we know:</AlertTitle>
            <AlertDescription className="mt-2">
              An unexpected error occurred, but we've captured the details and our team will investigate.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button onClick={resetError} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button onClick={refreshPage} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          </div>

          {(error || errorId) && (
            <>
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full justify-between"
              >
                <span>Technical Details</span>
                {showDetails ? '▼' : '▶'}
              </Button>
              
              {showDetails && (
                <div className="space-y-2 text-xs bg-muted p-3 rounded">
                  {errorId && (
                    <div>
                      <strong>Error ID:</strong> {errorId}
                    </div>
                  )}
                  {error?.message && (
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                  )}
                  <div>
                    <strong>Time:</strong> {new Date().toLocaleString()}
                  </div>
                  <div>
                    <strong>Context:</strong> {context}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Loading Error Fallback - For errors during loading states
 */
export const LoadingErrorFallback: React.FC<ErrorFallbackProps & {
  resource?: string;
}> = ({ 
  resource = 'data', 
  resetError, 
  canRetry = true 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-8 h-8 text-orange-500 mb-4" />
      <h3 className="font-semibold text-lg mb-2">
        Failed to Load {resource}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        We couldn't load the {resource} you requested. This might be due to a network issue or server problem.
      </p>
      
      {canRetry && (
        <div className="space-x-2">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Inline Error Display - For smaller error contexts
 */
export const InlineErrorDisplay: React.FC<ErrorFallbackProps & {
  compact?: boolean;
}> = ({ 
  error, 
  resetError, 
  canRetry = true, 
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-red-700 flex-1">
          {error?.message || 'An error occurred'}
        </span>
        {canRetry && (
          <Button 
            onClick={resetError} 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        {error?.message || 'An unexpected error occurred'}
        {canRetry && (
          <Button 
            onClick={resetError} 
            variant="ghost" 
            size="sm" 
            className="ml-2 h-auto p-1 text-xs underline"
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export {
  NetworkErrorFallback as NetworkError,
  AuthErrorFallback as AuthError,
  RateLimitErrorFallback as RateLimitError,
  ServerErrorFallback as ServerError,
  GenericErrorFallback as GenericError,
  LoadingErrorFallback as LoadingError,
  InlineErrorDisplay as InlineError
};