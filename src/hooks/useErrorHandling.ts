/**
 * useErrorHandling Hook
 * 
 * Comprehensive hook that provides error handling utilities for components.
 * Integrates with error monitoring, async error handling, and user feedback.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AppError, NetworkError, AuthenticationError } from '@/shared/utils/error';
import { withAsyncErrorHandling, AsyncResult, AsyncOperationOptions } from '@/utils/async-error-handler';
import { errorMonitoring, addBreadcrumb } from '@/services/error-monitoring';
import { logger } from '@/services/logging/logger';

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  reportError?: boolean;
  fallbackData?: any;
  retryCount?: number;
  context?: string;
}

export interface ErrorState {
  error: AppError | null;
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  canRetry: boolean;
}

export interface ErrorHandlingHook {
  // Error state
  errorState: ErrorState;
  
  // Error handling methods
  handleAsync: <T>(
    operation: () => Promise<T>, 
    options?: ErrorHandlingOptions
  ) => Promise<AsyncResult<T>>;
  
  handleError: (
    error: Error | AppError,
    options?: ErrorHandlingOptions
  ) => void;
  
  clearError: () => void;
  retry: () => Promise<void>;
  
  // Utility methods
  createErrorHandler: (options?: ErrorHandlingOptions) => (error: Error) => void;
  wrapAsyncOperation: <T>(
    operation: () => Promise<T>,
    options?: ErrorHandlingOptions
  ) => () => Promise<void>;
}

/**
 * Main error handling hook
 */
export const useErrorHandling = (
  defaultOptions: ErrorHandlingOptions = {}
): ErrorHandlingHook => {
  const { toast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    hasError: false,
    retryCount: 0,
    canRetry: false
  });
  
  // Keep track of the last failed operation for retry
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const lastOptionsRef = useRef<ErrorHandlingOptions>({});

  useEffect(() => {
    // Add breadcrumb when component mounts with error handling
    if (defaultOptions.context) {
      addBreadcrumb(`Error handling initialized: ${defaultOptions.context}`, 'info');
    }
  }, [defaultOptions.context]);

  /**
   * Handle async operations with comprehensive error management
   */
  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<AsyncResult<T>> => {
    const finalOptions = { ...defaultOptions, ...options };
    
    // Store operation for potential retry
    lastOperationRef.current = operation;
    lastOptionsRef.current = finalOptions;
    
    setErrorState(prev => ({ 
      ...prev, 
      isLoading: true, 
      hasError: false,
      error: null 
    }));

    try {
      // Add breadcrumb for operation start
      if (finalOptions.context) {
        addBreadcrumb(`Async operation started: ${finalOptions.context}`, 'info');
      }

      // Use the async error wrapper
      const result = await withAsyncErrorHandling(
        operation,
        {
          context: finalOptions.context,
          retries: finalOptions.retryCount || 0,
          fallback: finalOptions.fallbackData,
          suppressLogging: !finalOptions.logError
        } as AsyncOperationOptions
      );

      if (result.success) {
        // Clear error state on success
        setErrorState(prev => ({
          ...prev,
          isLoading: false,
          hasError: false,
          error: null,
          retryCount: 0,
          canRetry: false
        }));

        if (finalOptions.context) {
          addBreadcrumb(`Async operation succeeded: ${finalOptions.context}`, 'info');
        }

        return result;
      } else {
        // Handle operation failure
        const error = result.error!;
        await handleErrorInternal(error, finalOptions);
        return result;
      }

    } catch (error) {
      // Handle unexpected errors
      const appError = error instanceof AppError ? error : new AppError(
        error instanceof Error ? error.message : 'Unknown async error',
        'ASYNC_OPERATION_ERROR'
      );

      await handleErrorInternal(appError, finalOptions);

      return {
        success: false,
        error: appError,
        data: finalOptions.fallbackData
      };
    }
  }, [defaultOptions]);

  /**
   * Handle errors with comprehensive processing
   */
  const handleError = useCallback((
    error: Error | AppError,
    options: ErrorHandlingOptions = {}
  ): void => {
    const finalOptions = { ...defaultOptions, ...options };
    handleErrorInternal(error instanceof AppError ? error : new AppError(error.message), finalOptions);
  }, [defaultOptions]);

  /**
   * Internal error handling logic
   */
  const handleErrorInternal = useCallback(async (
    error: AppError,
    options: ErrorHandlingOptions
  ): Promise<void> => {
    const canRetry = isRetryableError(error) && 
                     errorState.retryCount < (options.retryCount || 3);

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error,
      hasError: true,
      isLoading: false,
      canRetry,
      retryCount: prev.retryCount + (lastOperationRef.current ? 1 : 0)
    }));

    // Log error
    if (options.logError !== false) {
      logger.error(`Error in ${options.context || 'component'}`, 'useErrorHandling', {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        context: options.context
      });
    }

    // Report error to monitoring service
    if (options.reportError !== false) {
      try {
        await errorMonitoring.reportError(error, 'user-interaction', {
          context: { feature: options.context },
          metadata: { 
            retryCount: errorState.retryCount,
            userInitiated: true 
          }
        });
      } catch (reportError) {
        logger.warn('Failed to report error to monitoring service', 'useErrorHandling', reportError);
      }
    }

    // Show user-friendly toast notification
    if (options.showToast !== false) {
      const userMessage = getUserFriendlyMessage(error);
      
      toast({
        variant: error.statusCode >= 500 ? 'destructive' : 'default',
        title: getErrorTitle(error),
        description: userMessage,
        action: canRetry ? (
          <button 
            onClick={retry}
            className="text-sm underline hover:no-underline"
          >
            Try Again
          </button>
        ) : undefined,
      });
    }

    // Add breadcrumb
    addBreadcrumb(`Error handled: ${error.message}`, 'error', {
      code: error.code,
      statusCode: error.statusCode,
      context: options.context,
      canRetry
    });
  }, [errorState.retryCount, toast]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setErrorState({
      error: null,
      isLoading: false,
      hasError: false,
      retryCount: 0,
      canRetry: false
    });
    
    lastOperationRef.current = null;
    lastOptionsRef.current = {};
    
    addBreadcrumb('Error state cleared', 'info');
  }, []);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current || !errorState.canRetry) {
      logger.warn('Cannot retry: no operation stored or retry not allowed', 'useErrorHandling');
      return;
    }

    const operation = lastOperationRef.current;
    const options = lastOptionsRef.current;

    addBreadcrumb(`Retrying operation: ${options.context}`, 'info', {
      retryAttempt: errorState.retryCount + 1
    });

    // Retry the operation
    await handleAsync(operation, options);
  }, [errorState.canRetry, errorState.retryCount, handleAsync]);

  /**
   * Create a reusable error handler function
   */
  const createErrorHandler = useCallback((
    options: ErrorHandlingOptions = {}
  ) => {
    return (error: Error): void => {
      handleError(error, options);
    };
  }, [handleError]);

  /**
   * Wrap async operations with error handling
   */
  const wrapAsyncOperation = useCallback(<T>(
    operation: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ) => {
    return async (): Promise<void> => {
      await handleAsync(operation, options);
    };
  }, [handleAsync]);

  return {
    errorState,
    handleAsync,
    handleError,
    clearError,
    retry,
    createErrorHandler,
    wrapAsyncOperation
  };
};

/**
 * Utility functions for error classification and messaging
 */
function isRetryableError(error: AppError): boolean {
  // Don't retry authentication, authorization, or validation errors
  if (error instanceof AuthenticationError) return false;
  if (error.statusCode >= 400 && error.statusCode < 500) return false;
  if (error.code.includes('VALIDATION')) return false;
  
  // Retry network errors, timeouts, and server errors
  if (error instanceof NetworkError) return true;
  if (error.code.includes('TIMEOUT')) return true;
  if (error.statusCode >= 500) return true;
  
  return false;
}

function getUserFriendlyMessage(error: AppError): string {
  if (error instanceof NetworkError) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  
  if (error instanceof AuthenticationError) {
    return 'Please sign in to continue.';
  }
  
  if (error.statusCode === 429) {
    return 'You\'re making requests too quickly. Please wait a moment and try again.';
  }
  
  if (error.statusCode >= 500) {
    return 'A server error occurred. We\'ve been notified and are working to fix it.';
  }
  
  if (error.statusCode === 404) {
    return 'The requested information could not be found.';
  }
  
  // Use the error message if it's user-friendly, otherwise provide a generic message
  if (error.message && error.message.length < 100 && !error.message.includes('stack')) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

function getErrorTitle(error: AppError): string {
  if (error instanceof NetworkError) {
    return 'Connection Error';
  }
  
  if (error instanceof AuthenticationError) {
    return 'Authentication Required';
  }
  
  if (error.statusCode >= 500) {
    return 'Server Error';
  }
  
  if (error.statusCode === 429) {
    return 'Too Many Requests';
  }
  
  if (error.statusCode === 404) {
    return 'Not Found';
  }
  
  return 'Error';
}

export default useErrorHandling;