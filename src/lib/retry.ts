/**
 * Intelligent Retry Mechanism for AI API Calls
 * Features: Exponential backoff with jitter, circuit breaker, error categorization, and comprehensive logging
 */

import { logger } from './logger';

// Core interfaces
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitterEnabled?: boolean;
  jitterFactor?: number;
  strategy?: RetryStrategy;
  timeout?: number;
  abortSignal?: AbortSignal;
}

export interface RetryResult<T = any> {
  success: boolean;
  data?: T;
  attempts: number;
  totalTime: number;
  lastError?: Error;
  strategy?: string;
  circuitBreakerTriggered?: boolean;
}

export interface RetryPolicy {
  shouldRetry: (error: Error, attempt: number) => boolean;
  calculateDelay: (attempt: number, baseDelay: number, maxDelay: number, backoffFactor: number) => number;
  name: string;
}

export interface RetryMetrics {
  totalAttempts: number;
  successfulOperations: number;
  failedOperations: number;
  circuitBreakerTrips: number;
  averageRetryCount: number;
  totalRetryTime: number;
  errorsByCategory: Record<ErrorCategory, number>;
  lastReset: Date;
}

// Error categorization
export enum ErrorCategory {
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export enum RetryStrategy {
  NETWORK_TIMEOUT = 'network_timeout',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NO_RETRY = 'no_retry',
  CUSTOM = 'custom'
}

// Circuit breaker interface
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

// Custom error types
export class RetryableError extends Error {
  public readonly category: ErrorCategory;
  public readonly isRetryable: boolean;
  public readonly suggestedDelay?: number;

  constructor(
    message: string, 
    category: ErrorCategory, 
    isRetryable: boolean = true,
    suggestedDelay?: number
  ) {
    super(message);
    this.name = 'RetryableError';
    this.category = category;
    this.isRetryable = isRetryable;
    this.suggestedDelay = suggestedDelay;
  }
}

export class CircuitBreakerError extends Error {
  constructor(service: string) {
    super(`Circuit breaker is open for service: ${service}`);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Intelligent Retry Service
 */
export class IntelligentRetry {
  private static instance: IntelligentRetry;
  private metrics: RetryMetrics;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    successThreshold: 2
  };

  constructor() {
    this.resetMetrics();
  }

  static getInstance(): IntelligentRetry {
    if (!IntelligentRetry.instance) {
      IntelligentRetry.instance = new IntelligentRetry();
    }
    return IntelligentRetry.instance;
  }

  /**
   * Main retry method with intelligent error handling
   */
  async retry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    operationId?: string
  ): Promise<RetryResult<T>> {
    const finalConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitterEnabled: true,
      jitterFactor: 0.1,
      strategy: RetryStrategy.SERVER_ERROR,
      timeout: 30000,
      ...config
    };

    // Check circuit breaker if operation ID provided
    if (operationId && this.isCircuitBreakerOpen(operationId)) {
      const error = new CircuitBreakerError(operationId);
      this.metrics.circuitBreakerTrips++;
      logger.warn(`Circuit breaker open for operation: ${operationId}`);
      return {
        success: false,
        attempts: 0,
        totalTime: 0,
        lastError: error,
        circuitBreakerTriggered: true
      };
    }

    const startTime = Date.now();
    let lastError: Error;
    let attempt = 0;

    const policy = this.getRetryPolicy(finalConfig.strategy!);

    logger.debug(`Starting retry operation with strategy: ${policy.name}`, {
      operationId,
      config: finalConfig
    });

    while (attempt < finalConfig.maxAttempts) {
      attempt++;
      this.metrics.totalAttempts++;

      try {
        // Handle timeout if specified
        const result = finalConfig.timeout 
          ? await this.withTimeout(operation(), finalConfig.timeout, finalConfig.abortSignal)
          : await operation();

        // Success - record metrics and reset circuit breaker
        const totalTime = Date.now() - startTime;
        this.recordSuccess(operationId);
        this.metrics.successfulOperations++;

        logger.debug(`Operation succeeded on attempt ${attempt}`, {
          operationId,
          totalTime,
          attempts: attempt
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime,
          strategy: policy.name
        };

      } catch (error) {
        lastError = error as Error;
        const errorCategory = this.categorizeError(lastError);
        this.metrics.errorsByCategory[errorCategory]++;

        logger.debug(`Operation failed on attempt ${attempt}`, {
          operationId,
          error: lastError.message,
          category: errorCategory,
          attempt,
          maxAttempts: finalConfig.maxAttempts
        });

        // Check if we should retry this error
        if (!policy.shouldRetry(lastError, attempt) || attempt >= finalConfig.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const baseDelay = (lastError as RetryableError).suggestedDelay || finalConfig.baseDelay;
        const delay = policy.calculateDelay(
          attempt, 
          baseDelay, 
          finalConfig.maxDelay, 
          finalConfig.backoffFactor
        );

        const finalDelay = finalConfig.jitterEnabled 
          ? this.addJitter(delay, finalConfig.jitterFactor!)
          : delay;

        logger.debug(`Waiting ${finalDelay}ms before retry attempt ${attempt + 1}`, {
          operationId,
          delay: finalDelay,
          strategy: policy.name
        });

        // Wait before next attempt (unless aborted)
        if (finalConfig.abortSignal?.aborted) {
          throw new Error('Operation aborted');
        }

        await this.sleep(finalDelay);
      }
    }

    // All retries failed
    const totalTime = Date.now() - startTime;
    this.recordFailure(operationId);
    this.metrics.failedOperations++;

    logger.error(`Operation failed after ${attempt} attempts`, {
      operationId,
      totalTime,
      lastError: lastError.message,
      strategy: policy.name
    });

    return {
      success: false,
      attempts: attempt,
      totalTime,
      lastError,
      strategy: policy.name
    };
  }

  /**
   * Exponential backoff calculation with jitter
   */
  exponentialBackoff(
    attempt: number, 
    baseDelay: number, 
    maxDelay: number, 
    backoffFactor: number = 2
  ): number {
    const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
    return Math.floor(delay);
  }

  /**
   * Add jitter to prevent thundering herd
   */
  private addJitter(delay: number, jitterFactor: number): number {
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1); // -jitterFactor to +jitterFactor
    return Math.max(0, Math.floor(delay + jitter));
  }

  /**
   * Categorize errors for appropriate retry strategies
   */
  categorizeError(error: Error): ErrorCategory {
    if (error instanceof RetryableError) {
      return error.category;
    }

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || name.includes('network')) {
      return ErrorCategory.NETWORK;
    }

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('too many requests') ||
        message.includes('quota') || message.includes('429')) {
      return ErrorCategory.RATE_LIMIT;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted') ||
        name.includes('timeout') || name.includes('abort')) {
      return ErrorCategory.TIMEOUT;
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('invalid token') ||
        message.includes('401') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (message.includes('forbidden') || message.includes('403') ||
        message.includes('permission') || message.includes('authorization')) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || 
        message.includes('503') || message.includes('504') ||
        message.includes('server error') || message.includes('internal server')) {
      return ErrorCategory.SERVER_ERROR;
    }

    // Client errors (4xx)
    if (message.includes('400') || message.includes('bad request') ||
        message.includes('invalid') || message.includes('malformed')) {
      return ErrorCategory.CLIENT_ERROR;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine if error should be retried based on category
   */
  shouldRetryError(error: Error, attempt: number): boolean {
    if (error instanceof RetryableError) {
      return error.isRetryable;
    }

    const category = this.categorizeError(error);

    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.SERVER_ERROR:
        return true;
      
      case ErrorCategory.RATE_LIMIT:
        return attempt <= 5; // More attempts for rate limits
      
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.CLIENT_ERROR:
        return false;
      
      case ErrorCategory.UNKNOWN:
        return attempt <= 2; // Conservative retry for unknown errors
      
      default:
        return false;
    }
  }

  /**
   * Get retry policy based on strategy
   */
  private getRetryPolicy(strategy: RetryStrategy): RetryPolicy {
    switch (strategy) {
      case RetryStrategy.NETWORK_TIMEOUT:
        return {
          name: 'Network/Timeout',
          shouldRetry: (error, attempt) => {
            const category = this.categorizeError(error);
            return (category === ErrorCategory.NETWORK || 
                   category === ErrorCategory.TIMEOUT) && attempt <= 5;
          },
          calculateDelay: (attempt, base, max, factor) => 
            this.exponentialBackoff(attempt, base, max, 1.5) // Less aggressive backoff
        };

      case RetryStrategy.RATE_LIMIT:
        return {
          name: 'Rate Limit',
          shouldRetry: (error, attempt) => {
            const category = this.categorizeError(error);
            return category === ErrorCategory.RATE_LIMIT && attempt <= 8;
          },
          calculateDelay: (attempt, base, max, factor) => {
            // More aggressive backoff for rate limits
            const suggestedDelay = (error as RetryableError)?.suggestedDelay;
            return suggestedDelay || this.exponentialBackoff(attempt, base, max, factor);
          }
        };

      case RetryStrategy.SERVER_ERROR:
        return {
          name: 'Server Error',
          shouldRetry: (error, attempt) => {
            return this.shouldRetryError(error, attempt);
          },
          calculateDelay: (attempt, base, max, factor) =>
            this.exponentialBackoff(attempt, base, max, factor)
        };

      case RetryStrategy.NO_RETRY:
        return {
          name: 'No Retry',
          shouldRetry: () => false,
          calculateDelay: () => 0
        };

      default:
        return {
          name: 'Default',
          shouldRetry: (error, attempt) => this.shouldRetryError(error, attempt),
          calculateDelay: (attempt, base, max, factor) =>
            this.exponentialBackoff(attempt, base, max, factor)
        };
    }
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(operationId: string): boolean {
    const breaker = this.circuitBreakers.get(operationId);
    if (!breaker) return false;

    const now = Date.now();

    switch (breaker.state) {
      case 'open':
        if (now - breaker.lastFailureTime > this.circuitBreakerConfig.timeout) {
          breaker.state = 'half-open';
          breaker.successCount = 0;
          return false;
        }
        return true;

      case 'half-open':
        return false;

      case 'closed':
        return false;

      default:
        return false;
    }
  }

  private recordSuccess(operationId?: string): void {
    if (!operationId) return;

    const breaker = this.circuitBreakers.get(operationId);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.successCount++;
      if (breaker.successCount >= this.circuitBreakerConfig.successThreshold) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        logger.info(`Circuit breaker closed for operation: ${operationId}`);
      }
    } else if (breaker.state === 'closed') {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  private recordFailure(operationId?: string): void {
    if (!operationId) return;

    let breaker = this.circuitBreakers.get(operationId);
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      };
      this.circuitBreakers.set(operationId, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      breaker.state = 'open';
      logger.warn(`Circuit breaker opened for operation: ${operationId}`);
    }
  }

  /**
   * Add timeout wrapper to operations
   */
  private async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new RetryableError(
          `Operation timed out after ${timeoutMs}ms`,
          ErrorCategory.TIMEOUT,
          true
        ));
      }, timeoutMs);
    });

    // Handle abort signal
    const abortPromise = abortSignal ? new Promise<never>((_, reject) => {
      abortSignal.addEventListener('abort', () => {
        reject(new Error('Operation aborted'));
      });
    }) : null;

    try {
      const promises = [promise, timeoutPromise];
      if (abortPromise) promises.push(abortPromise);

      const result = await Promise.race(promises);
      clearTimeout(timeoutId);
      return result as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Utility sleep function
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current retry statistics
   */
  getRetryStats(): RetryMetrics {
    return {
      ...this.metrics,
      averageRetryCount: this.metrics.totalAttempts > 0 
        ? this.metrics.totalAttempts / (this.metrics.successfulOperations + this.metrics.failedOperations)
        : 0
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulOperations: 0,
      failedOperations: 0,
      circuitBreakerTrips: 0,
      averageRetryCount: 0,
      totalRetryTime: 0,
      errorsByCategory: {
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.RATE_LIMIT]: 0,
        [ErrorCategory.SERVER_ERROR]: 0,
        [ErrorCategory.CLIENT_ERROR]: 0,
        [ErrorCategory.AUTHENTICATION]: 0,
        [ErrorCategory.AUTHORIZATION]: 0,
        [ErrorCategory.TIMEOUT]: 0,
        [ErrorCategory.UNKNOWN]: 0
      },
      lastReset: new Date()
    };
  }

  /**
   * Reset circuit breaker for specific operation
   */
  resetCircuitBreaker(operationId: string): void {
    this.circuitBreakers.delete(operationId);
    logger.info(`Circuit breaker reset for operation: ${operationId}`);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(operationId: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(operationId) || null;
  }
}

// Export singleton instance
export const intelligentRetry = IntelligentRetry.getInstance();

// Convenience functions
export const retry = <T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  operationId?: string
): Promise<RetryResult<T>> => {
  return intelligentRetry.retry(operation, config, operationId);
};

export const exponentialBackoff = (
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffFactor: number = 2
): number => {
  return intelligentRetry.exponentialBackoff(attempt, baseDelay, maxDelay, backoffFactor);
};

export const shouldRetryError = (error: Error, attempt: number): boolean => {
  return intelligentRetry.shouldRetryError(error, attempt);
};

export const getRetryStats = (): RetryMetrics => {
  return intelligentRetry.getRetryStats();
};

// Predefined retry configurations
export const RetryConfigs = {
  // Aggressive retry for network issues
  NETWORK_AGGRESSIVE: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 8000,
    backoffFactor: 1.5,
    strategy: RetryStrategy.NETWORK_TIMEOUT,
    jitterEnabled: true
  } as Partial<RetryConfig>,

  // Conservative retry for rate limits
  RATE_LIMIT_CONSERVATIVE: {
    maxAttempts: 8,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffFactor: 2.5,
    strategy: RetryStrategy.RATE_LIMIT,
    jitterEnabled: true
  } as Partial<RetryConfig>,

  // Standard retry for server errors
  SERVER_ERROR_STANDARD: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    strategy: RetryStrategy.SERVER_ERROR,
    jitterEnabled: true
  } as Partial<RetryConfig>,

  // No retry for client errors
  NO_RETRY: {
    maxAttempts: 1,
    baseDelay: 0,
    maxDelay: 0,
    backoffFactor: 1,
    strategy: RetryStrategy.NO_RETRY,
    jitterEnabled: false
  } as Partial<RetryConfig>
};

export default intelligentRetry;