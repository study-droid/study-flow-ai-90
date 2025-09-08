/**
 * Error Recovery Hook
 * Provides error handling and recovery capabilities for AI tutor operations
 */

import { useState, useCallback, useRef } from 'react';
import { errorHandler, type ClassifiedError, type ErrorRecoveryResult } from '../services/error-handler.service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';
import { logger } from '@/services/logging/logger';
import { useToast } from '@/hooks/use-toast';

export interface ErrorRecoveryState {
  isRecovering: boolean;
  lastError: ClassifiedError | null;
  recoveryAttempts: number;
  recoveryHistory: Array<{
    timestamp: Date;
    error: ClassifiedError;
    result: ErrorRecoveryResult;
  }>;
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  showToasts?: boolean;
  autoRecover?: boolean;
  onError?: (error: ClassifiedError) => void;
  onRecovery?: (result: ErrorRecoveryResult) => void;
}

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    showToasts = true,
    autoRecover = true,
    onError,
    onRecovery
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<ErrorRecoveryState>({
    isRecovering: false,
    lastError: null,
    recoveryAttempts: 0,
    recoveryHistory: []
  });

  const operationRef = useRef<(() => Promise<any>) | null>(null);

  /**
   * Handle an error with automatic classification and recovery
   */
  const handleError = useCallback(async (
    error: Error,
    originalOperation?: () => Promise<any>,
    context?: Record<string, any>
  ): Promise<ErrorRecoveryResult | null> => {
    // Classify the error
    const classifiedError = errorHandler.classifyError(error, {
      ...context,
      timestamp: Date.now(),
      component: 'useErrorRecovery'
    });

    logger.error('Error handled by recovery hook', 'ErrorRecovery', {
      category: classifiedError.category,
      severity: classifiedError.severity,
      retryable: classifiedError.retryable,
      fallbackAvailable: classifiedError.fallbackAvailable
    });

    // Update state
    setState(prev => ({
      ...prev,
      lastError: classifiedError,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    // Store operation for potential retry
    if (originalOperation) {
      operationRef.current = originalOperation;
    }

    // Call error callback
    onError?.(classifiedError);

    // Show user-friendly toast notification
    if (showToasts) {
      const userMessage = errorHandler.getUserFriendlyMessage(classifiedError);
      toast({
        title: userMessage.title,
        description: userMessage.message,
        variant: classifiedError.severity === 'CRITICAL' || classifiedError.severity === 'HIGH' 
          ? 'destructive' 
          : 'default',
        duration: 5000
      });
    }

    // Attempt automatic recovery if enabled and within retry limits
    if (autoRecover && 
        classifiedError.retryable && 
        state.recoveryAttempts < maxRetries &&
        originalOperation) {
      
      return await attemptRecovery(classifiedError, originalOperation);
    }

    return null;
  }, [state.recoveryAttempts, maxRetries, autoRecover, showToasts, onError, toast]);

  /**
   * Attempt error recovery
   */
  const attemptRecovery = useCallback(async (
    classifiedError: ClassifiedError,
    originalOperation: () => Promise<any>
  ): Promise<ErrorRecoveryResult> => {
    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      const result = await errorHandler.attemptRecovery(classifiedError, originalOperation);

      // Update recovery history
      setState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            timestamp: new Date(),
            error: classifiedError,
            result
          }
        ].slice(-10) // Keep last 10 recovery attempts
      }));

      // Call recovery callback
      onRecovery?.(result);

      // Show success/failure toast
      if (showToasts) {
        toast({
          title: result.success ? '✅ Recovery Successful' : '❌ Recovery Failed',
          description: result.message,
          variant: result.success ? 'default' : 'destructive',
          duration: 3000
        });
      }

      // Reset recovery attempts on success
      if (result.success) {
        setState(prev => ({
          ...prev,
          recoveryAttempts: 0,
          lastError: null
        }));
      }

      return result;

    } catch (recoveryError) {
      const errorMessage = recoveryError instanceof Error 
        ? recoveryError.message 
        : 'Unknown recovery error';

      logger.error('Recovery attempt failed', 'ErrorRecovery', {
        originalError: classifiedError.message,
        recoveryError: errorMessage
      });

      const failedResult: ErrorRecoveryResult = {
        success: false,
        action: 'recovery_failed',
        message: `Recovery failed: ${errorMessage}`
      };

      setState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryHistory: [
          ...prev.recoveryHistory,
          {
            timestamp: new Date(),
            error: classifiedError,
            result: failedResult
          }
        ].slice(-10)
      }));

      if (showToasts) {
        toast({
          title: '❌ Recovery Failed',
          description: failedResult.message,
          variant: 'destructive',
          duration: 5000
        });
      }

      return failedResult;
    }
  }, [onRecovery, showToasts, toast]);

  /**
   * Manually retry the last operation
   */
  const retryLastOperation = useCallback(async (): Promise<ErrorRecoveryResult | null> => {
    if (!operationRef.current || !state.lastError) {
      return null;
    }

    if (state.recoveryAttempts >= maxRetries) {
      const result: ErrorRecoveryResult = {
        success: false,
        action: 'max_retries_exceeded',
        message: `Maximum retry attempts (${maxRetries}) exceeded`
      };

      if (showToasts) {
        toast({
          title: '❌ Max Retries Exceeded',
          description: result.message,
          variant: 'destructive'
        });
      }

      return result;
    }

    return await attemptRecovery(state.lastError, operationRef.current);
  }, [state.lastError, state.recoveryAttempts, maxRetries, attemptRecovery, showToasts, toast]);

  /**
   * Reset circuit breakers and clear error state
   */
  const resetServices = useCallback(() => {
    circuitBreakerManager.resetFailingCircuits();
    
    setState({
      isRecovering: false,
      lastError: null,
      recoveryAttempts: 0,
      recoveryHistory: []
    });

    if (showToasts) {
      toast({
        title: '🔄 Services Reset',
        description: 'All services have been reset and are ready to use.',
        duration: 3000
      });
    }

    logger.info('Services manually reset via error recovery hook', 'ErrorRecovery');
  }, [showToasts, toast]);

  /**
   * Get user-friendly error information
   */
  const getErrorInfo = useCallback(() => {
    if (!state.lastError) return null;
    
    return errorHandler.getUserFriendlyMessage(state.lastError);
  }, [state.lastError]);

  /**
   * Check if recovery is available for the current error
   */
  const canRecover = useCallback(() => {
    return !!(
      state.lastError?.retryable && 
      state.recoveryAttempts < maxRetries &&
      operationRef.current
    );
  }, [state.lastError, state.recoveryAttempts, maxRetries]);

  /**
   * Get service health status
   */
  const getServiceHealth = useCallback(() => {
    return circuitBreakerManager.getHealthSummary();
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastError: null,
      recoveryAttempts: 0
    }));
    operationRef.current = null;
  }, []);

  /**
   * Wrap an async operation with error handling
   */
  const withErrorHandling = useCallback(<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ) => {
    return async (): Promise<T> => {
      try {
        const result = await operation();
        
        // Clear error state on successful operation
        if (state.lastError) {
          clearError();
        }
        
        return result;
      } catch (error) {
        await handleError(
          error instanceof Error ? error : new Error(String(error)),
          operation,
          context
        );
        throw error; // Re-throw to maintain error propagation
      }
    };
  }, [handleError, clearError, state.lastError]);

  return {
    // State
    ...state,
    
    // Actions
    handleError,
    attemptRecovery,
    retryLastOperation,
    resetServices,
    clearError,
    
    // Utilities
    getErrorInfo,
    canRecover,
    getServiceHealth,
    withErrorHandling,
    
    // Computed
    hasError: !!state.lastError,
    canRetry: canRecover(),
    isHealthy: getServiceHealth().overallHealth === 'healthy'
  };
}