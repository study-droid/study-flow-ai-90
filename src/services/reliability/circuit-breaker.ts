/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures and provides automatic recovery
 */

import { logger } from '@/services/logging/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not calling downstream service
  HALF_OPEN = 'HALF_OPEN' // Testing if downstream service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  timeout: number;              // Time to wait before attempting to close circuit (ms)
  successThreshold: number;     // Number of successes needed to close circuit in HALF_OPEN state
  monitoringPeriod: number;     // Period to monitor failures (ms)
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  uptime: number;
  errorRate: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttempt = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private readonly startTime = Date.now();

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    logger.info(`Circuit breaker initialized: ${name}`, 'CircuitBreaker', {
      failureThreshold: config.failureThreshold,
      timeout: config.timeout,
      successThreshold: config.successThreshold
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        this.config.onFailure?.(error);
        throw error;
      } else {
        // Move to HALF_OPEN state
        this.setState(CircuitBreakerState.HALF_OPEN);
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
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.config.onSuccess?.();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.setState(CircuitBreakerState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.reset();
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    this.config.onFailure?.(error);

    logger.warn(`Circuit breaker failure: ${this.name}`, 'CircuitBreaker', {
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error.message
    });

    if (this.state === CircuitBreakerState.HALF_OPEN || 
        this.failureCount >= this.config.failureThreshold) {
      this.setState(CircuitBreakerState.OPEN);
      this.nextAttempt = Date.now() + this.config.timeout;
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
   * Set circuit breaker state
   */
  private setState(newState: CircuitBreakerState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      
      logger.info(`Circuit breaker state changed: ${this.name}`, 'CircuitBreaker', {
        from: oldState,
        to: newState,
        failureCount: this.failureCount
      });

      this.config.onStateChange?.(newState);
    }
  }

  /**
   * Get current statistics
   */
  public getStats(): CircuitBreakerStats {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.totalRequests > 0 
      ? (this.totalFailures / this.totalRequests) * 100 
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      uptime,
      errorRate
    };
  }

  /**
   * Get current state
   */
  public getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Force circuit to OPEN state (for testing or manual intervention)
   */
  public forceOpen(): void {
    logger.warn(`Circuit breaker manually opened: ${this.name}`, 'CircuitBreaker');
    this.setState(CircuitBreakerState.OPEN);
    this.nextAttempt = Date.now() + this.config.timeout;
  }

  /**
   * Force circuit to CLOSED state (for testing or manual intervention)
   */
  public forceClose(): void {
    logger.info(`Circuit breaker manually closed: ${this.name}`, 'CircuitBreaker');
    this.setState(CircuitBreakerState.CLOSED);
    this.reset();
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
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private defaultConfigs = new Map<string, CircuitBreakerConfig>();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default configurations for different service types
   */
  private initializeDefaultConfigs(): void {
    // Edge Function Professional
    this.defaultConfigs.set('edge-function-professional', {
      failureThreshold: 3,
      timeout: 30000, // 30 seconds
      successThreshold: 2,
      monitoringPeriod: 60000, // 1 minute
      onStateChange: (state) => {
        logger.info(`Edge Function Professional circuit breaker: ${state}`, 'CircuitBreakerManager');
      }
    });

    // Edge Function Legacy
    this.defaultConfigs.set('edge-function-legacy', {
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      successThreshold: 3,
      monitoringPeriod: 120000, // 2 minutes
      onStateChange: (state) => {
        logger.info(`Edge Function Legacy circuit breaker: ${state}`, 'CircuitBreakerManager');
      }
    });

    // DeepSeek API
    this.defaultConfigs.set('deepseek-api', {
      failureThreshold: 3,
      timeout: 60000, // 1 minute
      successThreshold: 2,
      monitoringPeriod: 180000, // 3 minutes
      onStateChange: (state) => {
        logger.info(`DeepSeek API circuit breaker: ${state}`, 'CircuitBreakerManager');
      }
    });

    // Database
    this.defaultConfigs.set('database', {
      failureThreshold: 2,
      timeout: 15000, // 15 seconds
      successThreshold: 1,
      monitoringPeriod: 30000, // 30 seconds
      onStateChange: (state) => {
        logger.warn(`Database circuit breaker: ${state}`, 'CircuitBreakerManager');
      }
    });

    // Generic API
    this.defaultConfigs.set('generic-api', {
      failureThreshold: 3,
      timeout: 30000, // 30 seconds
      successThreshold: 2,
      monitoringPeriod: 60000, // 1 minute
      onStateChange: (state) => {
        logger.info(`Generic API circuit breaker: ${state}`, 'CircuitBreakerManager');
      }
    });
  }

  /**
   * Get or create a circuit breaker for a service
   */
  public getCircuitBreaker(
    serviceName: string, 
    customConfig?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (this.breakers.has(serviceName)) {
      return this.breakers.get(serviceName)!;
    }

    // Determine service type for default config
    let serviceType = 'generic-api';
    if (serviceName.includes('edge-function-professional')) {
      serviceType = 'edge-function-professional';
    } else if (serviceName.includes('edge-function') || serviceName.includes('ai-proxy')) {
      serviceType = 'edge-function-legacy';
    } else if (serviceName.includes('deepseek')) {
      serviceType = 'deepseek-api';
    } else if (serviceName.includes('database') || serviceName.includes('supabase')) {
      serviceType = 'database';
    }

    const defaultConfig = this.defaultConfigs.get(serviceType)!;
    const config = { ...defaultConfig, ...customConfig };

    const breaker = new CircuitBreaker(serviceName, config);
    this.breakers.set(serviceName, breaker);

    return breaker;
  }

  /**
   * Get statistics for all circuit breakers
   */
  public getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }

    return stats;
  }

  /**
   * Get circuit breakers that are currently open
   */
  public getOpenCircuits(): string[] {
    const openCircuits: string[] = [];
    
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.getState() === CircuitBreakerState.OPEN) {
        openCircuits.push(name);
      }
    }

    return openCircuits;
  }

  /**
   * Get healthy circuit breakers (closed state)
   */
  public getHealthyCircuits(): string[] {
    const healthyCircuits: string[] = [];
    
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.getState() === CircuitBreakerState.CLOSED) {
        healthyCircuits.push(name);
      }
    }

    return healthyCircuits;
  }

  /**
   * Reset all circuit breakers (for testing or recovery)
   */
  public resetAll(): void {
    logger.info('Resetting all circuit breakers', 'CircuitBreakerManager');
    
    for (const [name, breaker] of this.breakers.entries()) {
      breaker.forceClose();
    }
  }

  /**
   * Get summary of circuit breaker health
   */
  public getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const total = this.breakers.size;
    const healthy = this.getHealthyCircuits().length;
    const failed = this.getOpenCircuits().length;
    const degraded = total - healthy - failed; // HALF_OPEN circuits

    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (failed > 0) {
      overallHealth = failed >= total / 2 ? 'unhealthy' : 'degraded';
    } else if (degraded > 0) {
      overallHealth = 'degraded';
    }

    return {
      total,
      healthy,
      degraded,
      failed,
      overallHealth
    };
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

export default circuitBreakerManager;