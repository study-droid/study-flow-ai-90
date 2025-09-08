/**
 * Enhanced Circuit Breaker with Automatic Recovery and Health Monitoring
 * Implements intelligent service management with exponential backoff and real-time health tracking
 */

import { logger } from '@/services/logging/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not calling downstream service
  HALF_OPEN = 'HALF_OPEN' // Testing if downstream service has recovered
}

export interface EnhancedCircuitBreakerConfig {
  failureThreshold: number;           // Number of failures before opening circuit
  timeout: number;                    // Time to wait before attempting to close circuit (ms)
  successThreshold: number;           // Number of successes needed to close circuit in HALF_OPEN state
  monitoringPeriod: number;          // Period to monitor failures (ms)
  exponentialBackoffMultiplier: number; // Multiplier for exponential backoff (default: 2)
  maxTimeout: number;                // Maximum timeout for exponential backoff (ms)
  healthCheckInterval: number;       // Interval for automatic health checks (ms)
  automaticRecovery: boolean;        // Enable automatic recovery attempts
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
  onHealthCheck?: (isHealthy: boolean) => void;
}

export interface EnhancedCircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number;
  errorRate: number;
  currentTimeout: number;
  nextAttemptTime: number | null;
  healthCheckCount: number;
  lastHealthCheckTime: number | null;
  consecutiveHealthCheckFailures: number;
  isHealthy: boolean;
}

export class EnhancedCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttempt = 0;
  private currentTimeout: number;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly startTime = Date.now();
  private healthCheckInterval?: NodeJS.Timeout;
  private healthCheckCount = 0;
  private lastHealthCheckTime: number | null = null;
  private consecutiveHealthCheckFailures = 0;
  private isHealthy = true;

  constructor(
    private readonly name: string,
    private readonly config: EnhancedCircuitBreakerConfig
  ) {
    // Initialize current timeout to base timeout
    this.currentTimeout = config.timeout;
    
    // Start automatic health monitoring if enabled
    if (config.automaticRecovery && config.healthCheckInterval > 0) {
      this.startHealthMonitoring();
    }
    
    logger.info(`Enhanced circuit breaker initialized: ${name}`, 'EnhancedCircuitBreaker', {
      failureThreshold: config.failureThreshold,
      timeout: config.timeout,
      successThreshold: config.successThreshold,
      automaticRecovery: config.automaticRecovery,
      healthCheckInterval: config.healthCheckInterval
    });
  }

  /**
   * Execute a function with enhanced circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}. Next attempt in ${Math.round((this.nextAttempt - Date.now()) / 1000)}s`);
        this.config.onFailure?.(error);
        throw error;
      } else {
        // Move to HALF_OPEN state for recovery attempt
        this.setState(CircuitBreakerState.HALF_OPEN);
        logger.info(`Circuit breaker attempting recovery: ${this.name}`, 'EnhancedCircuitBreaker');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful execution with intelligent recovery
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();
    this.consecutiveHealthCheckFailures = 0;
    this.isHealthy = true;
    this.config.onSuccess?.();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      logger.info(`Circuit breaker recovery progress: ${this.name}`, 'EnhancedCircuitBreaker', {
        successCount: this.successCount,
        successThreshold: this.config.successThreshold
      });
      
      if (this.successCount >= this.config.successThreshold) {
        this.setState(CircuitBreakerState.CLOSED);
        this.reset();
        // Reset timeout to base value on successful recovery
        this.currentTimeout = this.config.timeout;
        logger.info(`Circuit breaker successfully recovered: ${this.name}`, 'EnhancedCircuitBreaker');
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.reset();
    }
  }

  /**
   * Handle failed execution with exponential backoff
   */
  private onFailure(error: Error): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.isHealthy = false;
    
    this.config.onFailure?.(error);

    logger.warn(`Circuit breaker failure: ${this.name}`, 'EnhancedCircuitBreaker', {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error.message,
      currentTimeout: this.currentTimeout
    });

    if (this.state === CircuitBreakerState.HALF_OPEN || 
        this.failureCount >= this.config.failureThreshold) {
      
      // Apply exponential backoff
      if (this.state === CircuitBreakerState.OPEN) {
        this.currentTimeout = Math.min(
          this.currentTimeout * this.config.exponentialBackoffMultiplier,
          this.config.maxTimeout
        );
      }
      
      this.setState(CircuitBreakerState.OPEN);
      this.nextAttempt = Date.now() + this.currentTimeout;
      
      logger.warn(`Circuit breaker opened with exponential backoff: ${this.name}`, 'EnhancedCircuitBreaker', {
        timeout: this.currentTimeout,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  /**
   * Reset failure counters
   */
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Set circuit breaker state with enhanced logging
   */
  private setState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      logger.info(`Circuit breaker state changed: ${this.name}`, 'EnhancedCircuitBreaker', {
        from: oldState,
        to: newState,
        failureCount: this.failureCount,
        currentTimeout: this.currentTimeout
      });

      this.config.onStateChange?.(newState);
    }
  }

  /**
   * Start automatic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    logger.info(`Health monitoring started for circuit breaker: ${this.name}`, 'EnhancedCircuitBreaker', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * Perform automatic health check
   */
  private async performHealthCheck(): Promise<void> {
    this.healthCheckCount++;
    this.lastHealthCheckTime = Date.now();

    try {
      // Only perform health checks when circuit is OPEN
      if (this.state !== CircuitBreakerState.OPEN) {
        return;
      }

      // Simple health check - if we're past the next attempt time, try to recover
      if (Date.now() >= this.nextAttempt) {
        logger.info(`Health check triggering recovery attempt: ${this.name}`, 'EnhancedCircuitBreaker');
        this.setState(CircuitBreakerState.HALF_OPEN);
        this.consecutiveHealthCheckFailures = 0;
        this.config.onHealthCheck?.(true);
      }
    } catch (error) {
      this.consecutiveHealthCheckFailures++;
      logger.warn(`Health check failed for circuit breaker: ${this.name}`, 'EnhancedCircuitBreaker', {
        consecutiveFailures: this.consecutiveHealthCheckFailures,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.config.onHealthCheck?.(false);
    }
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info(`Health monitoring stopped for circuit breaker: ${this.name}`, 'EnhancedCircuitBreaker');
    }
  }

  /**
   * Get enhanced statistics
   */
  public getStats(): EnhancedCircuitBreakerStats {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.totalRequests > 0 
      ? (this.totalFailures / this.totalRequests) * 100 
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime,
      errorRate,
      currentTimeout: this.currentTimeout,
      nextAttemptTime: this.state === CircuitBreakerState.OPEN ? this.nextAttempt : null,
      healthCheckCount: this.healthCheckCount,
      lastHealthCheckTime: this.lastHealthCheckTime,
      consecutiveHealthCheckFailures: this.consecutiveHealthCheckFailures,
      isHealthy: this.isHealthy
    };
  }

  /**
   * Get current state
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force circuit to OPEN state with exponential backoff
   */
  public forceOpen(): void {
    logger.warn(`Circuit breaker manually opened: ${this.name}`, 'EnhancedCircuitBreaker');
    this.setState(CircuitBreakerState.OPEN);
    this.nextAttempt = Date.now() + this.currentTimeout;
  }

  /**
   * Force circuit to CLOSED state and reset backoff
   */
  public forceClose(): void {
    logger.info(`Circuit breaker manually closed: ${this.name}`, 'EnhancedCircuitBreaker');
    this.setState(CircuitBreakerState.CLOSED);
    this.reset();
    this.currentTimeout = this.config.timeout; // Reset to base timeout
    this.isHealthy = true;
    this.consecutiveHealthCheckFailures = 0;
  }

  /**
   * Check if circuit is allowing requests
   */
  public isCallAllowed(): boolean {
    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    if (this.state === CircuitBreakerState.OPEN && Date.now() >= this.nextAttempt) {
      return true;
    }

    return false;
  }

  /**
   * Get time until next recovery attempt
   */
  public getTimeUntilNextAttempt(): number {
    if (this.state !== CircuitBreakerState.OPEN) {
      return 0;
    }
    return Math.max(0, this.nextAttempt - Date.now());
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopHealthMonitoring();
    logger.info(`Circuit breaker destroyed: ${this.name}`, 'EnhancedCircuitBreaker');
  }
}