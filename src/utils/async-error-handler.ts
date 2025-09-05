/**
 * Async Error Handler Utilities
 * 
 * Comprehensive utilities for handling async operations, Promise rejections,
 * and providing consistent error management across the application.
 */

import { AppError, safeAsync, retryWithBackoff } from '@/shared/utils/error';
import { logger } from '@/services/logging/logger';

export type AsyncResult<T> = {
  data?: T;
  error?: AppError;
  success: boolean;
};

export type AsyncOperationOptions = {
  timeout?: number;
  retries?: number;
  fallback?: any;
  context?: string;
  suppressLogging?: boolean;
};

export type AsyncBatchResult<T> = {
  results: AsyncResult<T>[];
  successCount: number;
  errorCount: number;
  allSucceeded: boolean;
  someSucceeded: boolean;
};

/**
 * Enhanced async wrapper with comprehensive error handling
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  options: AsyncOperationOptions = {}
): Promise<AsyncResult<T>> {
  const {
    timeout = 30000,
    retries = 0,
    fallback,
    context = 'async-operation',
    suppressLogging = false
  } = options;

  try {
    let result: T;

    // Wrap with timeout if specified
    if (timeout > 0) {
      result = await Promise.race([
        retries > 0 
          ? retryWithBackoff(operation, retries)
          : operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new AppError(`Operation timeout after ${timeout}ms`, 'TIMEOUT_ERROR')), timeout)
        )
      ]);
    } else {
      result = retries > 0 
        ? await retryWithBackoff(operation, retries)
        : await operation();
    }

    if (!suppressLogging) {
      logger.info(`Async operation succeeded: ${context}`, 'AsyncErrorHandler');
    }

    return {
      data: result,
      success: true
    };

  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Unknown async error',
          'ASYNC_ERROR',
          500,
          true,
          { context, originalError: error }
        );

    if (!suppressLogging) {
      logger.error(`Async operation failed: ${context}`, 'AsyncErrorHandler', {
        error: appError.message,
        code: appError.code,
        context
      });
    }

    return {
      data: fallback,
      error: appError,
      success: false
    };
  }
}

/**
 * Safe async wrapper that never throws - returns tuple instead
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<[AppError | null, T | null]> {
  try {
    const result = await operation();
    return [null, result];
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error instanceof Error ? error.message : 'Unknown error',
          'SAFE_ASYNC_ERROR',
          500,
          true,
          { context, originalError: error }
        );

    logger.error(`Safe async operation failed: ${context}`, 'AsyncErrorHandler', {
      error: appError.message,
      code: appError.code
    });

    return [appError, null];
  }
}

/**
 * Batch async operations with individual error handling
 */
export async function batchAsyncOperations<T>(
  operations: (() => Promise<T>)[],
  options: AsyncOperationOptions & {
    failFast?: boolean;
    concurrency?: number;
  } = {}
): Promise<AsyncBatchResult<T>> {
  const {
    failFast = false,
    concurrency = operations.length,
    context = 'batch-operations',
    suppressLogging = false
  } = options;

  if (!suppressLogging) {
    logger.info(`Starting batch async operations: ${operations.length} operations`, 'AsyncErrorHandler', { context });
  }

  const results: AsyncResult<T>[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Process operations in batches based on concurrency limit
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchPromises = batch.map(async (operation, index) => {
      const operationContext = `${context}[${i + index}]`;
      
      try {
        const result = await withAsyncErrorHandling(operation, {
          ...options,
          context: operationContext,
          suppressLogging: true // We'll log at batch level
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          if (failFast) {
            throw result.error;
          }
        }

        return result;
      } catch (error) {
        const failedResult: AsyncResult<T> = {
          error: error instanceof AppError ? error : new AppError(
            error instanceof Error ? error.message : 'Batch operation failed',
            'BATCH_OPERATION_ERROR'
          ),
          success: false
        };
        errorCount++;
        return failedResult;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      if (failFast) {
        throw error;
      }
    }
  }

  const batchResult: AsyncBatchResult<T> = {
    results,
    successCount,
    errorCount,
    allSucceeded: errorCount === 0,
    someSucceeded: successCount > 0
  };

  if (!suppressLogging) {
    logger.info(`Batch async operations completed`, 'AsyncErrorHandler', {
      context,
      total: operations.length,
      succeeded: successCount,
      failed: errorCount,
      successRate: `${Math.round((successCount / operations.length) * 100)}%`
    });
  }

  return batchResult;
}

/**
 * Debounced async operation to prevent rapid successive calls
 */
export class DebouncedAsyncOperation<T> {
  private timeoutId?: NodeJS.Timeout;
  private lastResult?: AsyncResult<T>;

  constructor(
    private operation: () => Promise<T>,
    private delay: number = 300,
    private options: AsyncOperationOptions = {}
  ) {}

  async execute(): Promise<AsyncResult<T>> {
    return new Promise((resolve) => {
      // Clear existing timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Set new timeout
      this.timeoutId = setTimeout(async () => {
        const result = await withAsyncErrorHandling(this.operation, {
          ...this.options,
          context: `debounced-${this.options.context || 'operation'}`
        });
        
        this.lastResult = result;
        resolve(result);
      }, this.delay);
    });
  }

  getLastResult(): AsyncResult<T> | undefined {
    return this.lastResult;
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}

/**
 * Throttled async operation to limit execution frequency
 */
export class ThrottledAsyncOperation<T> {
  private lastExecuted = 0;
  private pending: Promise<AsyncResult<T>> | null = null;

  constructor(
    private operation: () => Promise<T>,
    private interval: number = 1000,
    private options: AsyncOperationOptions = {}
  ) {}

  async execute(): Promise<AsyncResult<T>> {
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecuted;

    // If we're within the throttle interval, return pending operation or last result
    if (timeSinceLastExecution < this.interval && this.pending) {
      return this.pending;
    }

    // Execute the operation
    this.lastExecuted = now;
    this.pending = withAsyncErrorHandling(this.operation, {
      ...this.options,
      context: `throttled-${this.options.context || 'operation'}`
    });

    const result = await this.pending;
    this.pending = null;
    return result;
  }
}

/**
 * Async operation queue for sequential execution
 */
export class AsyncOperationQueue<T> {
  private queue: (() => Promise<AsyncResult<T>>)[] = [];
  private isProcessing = false;
  private results: AsyncResult<T>[] = [];

  constructor(
    private options: AsyncOperationOptions & {
      autoStart?: boolean;
      onComplete?: (results: AsyncResult<T>[]) => void;
      onError?: (error: AppError) => void;
    } = {}
  ) {}

  add(operation: () => Promise<T>): void {
    this.queue.push(async () => {
      return withAsyncErrorHandling(operation, {
        ...this.options,
        context: `queue-operation-${this.queue.length}`
      });
    });

    if (this.options.autoStart !== false && !this.isProcessing) {
      this.process();
    }
  }

  async process(): Promise<AsyncResult<T>[]> {
    if (this.isProcessing) {
      return this.results;
    }

    this.isProcessing = true;
    this.results = [];

    logger.info(`Processing async operation queue: ${this.queue.length} operations`, 'AsyncErrorHandler');

    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift()!;
        const result = await operation();
        this.results.push(result);

        if (!result.success && this.options.onError) {
          this.options.onError(result.error!);
        }
      }

      if (this.options.onComplete) {
        this.options.onComplete(this.results);
      }

      return this.results;
    } finally {
      this.isProcessing = false;
    }
  }

  clear(): void {
    this.queue = [];
    this.results = [];
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isActive(): boolean {
    return this.isProcessing;
  }
}

/**
 * Async operation with automatic retry and circuit breaker
 */
export class ResilientAsyncOperation<T> {
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private isCircuitOpen = false;
  
  constructor(
    private operation: () => Promise<T>,
    private config: {
      maxConsecutiveFailures?: number;
      circuitOpenTime?: number;
      retryOptions?: AsyncOperationOptions;
    } = {}
  ) {
    const {
      maxConsecutiveFailures = 5,
      circuitOpenTime = 60000 // 1 minute
    } = config;

    this.config.maxConsecutiveFailures = maxConsecutiveFailures;
    this.config.circuitOpenTime = circuitOpenTime;
  }

  async execute(): Promise<AsyncResult<T>> {
    // Check if circuit is open
    if (this.isCircuitOpen) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.config.circuitOpenTime!) {
        return {
          error: new AppError(
            'Circuit breaker is open - too many consecutive failures',
            'CIRCUIT_BREAKER_OPEN',
            503
          ),
          success: false
        };
      } else {
        // Try to close circuit
        this.isCircuitOpen = false;
        this.consecutiveFailures = 0;
        logger.info('Circuit breaker attempting to close', 'AsyncErrorHandler');
      }
    }

    const result = await withAsyncErrorHandling(this.operation, {
      context: 'resilient-operation',
      ...this.config.retryOptions
    });

    if (result.success) {
      // Reset failure count on success
      this.consecutiveFailures = 0;
      if (this.isCircuitOpen) {
        this.isCircuitOpen = false;
        logger.info('Circuit breaker closed after successful operation', 'AsyncErrorHandler');
      }
    } else {
      // Increment failure count
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      // Open circuit if too many consecutive failures
      if (this.consecutiveFailures >= this.config.maxConsecutiveFailures!) {
        this.isCircuitOpen = true;
        logger.warn(`Circuit breaker opened after ${this.consecutiveFailures} consecutive failures`, 'AsyncErrorHandler');
      }
    }

    return result;
  }

  getState(): {
    consecutiveFailures: number;
    isCircuitOpen: boolean;
    lastFailureTime: number;
  } {
    return {
      consecutiveFailures: this.consecutiveFailures,
      isCircuitOpen: this.isCircuitOpen,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.isCircuitOpen = false;
    this.lastFailureTime = 0;
  }
}

/**
 * Setup global Promise rejection handler
 */
export function setupGlobalAsyncErrorHandling(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    logger.error('Unhandled Promise rejection', 'AsyncErrorHandler', {
      message: error.message,
      stack: error.stack,
      reason: event.reason
    });

    // Convert to AppError for consistency
    const appError = new AppError(
      error.message,
      'UNHANDLED_PROMISE_REJECTION',
      500,
      true,
      { originalReason: event.reason }
    );

    // You could integrate with global error boundary here
    // or send to error reporting service

    // Prevent the default browser console error
    event.preventDefault();
  });

  // Handle general JavaScript errors in async contexts
  window.addEventListener('error', (event) => {
    if (event.error) {
      logger.error('Unhandled JavaScript error', 'AsyncErrorHandler', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    }
  });

  logger.info('Global async error handling setup completed', 'AsyncErrorHandler');
}

// Export convenience functions
export {
  safeAsync,
  retryWithBackoff
} from '@/shared/utils/error';