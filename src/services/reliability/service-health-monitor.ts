/**
 * Service Health Monitor with Real-time Updates
 * Tracks service health status and provides real-time monitoring capabilities
 */

import { logger } from '@/services/logging/logger';
import { EnhancedCircuitBreaker, EnhancedCircuitBreakerConfig, CircuitBreakerState } from './enhanced-circuit-breaker';

export interface ServiceHealthStatus {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  metadata: Record<string, any>;
  circuitBreakerState: CircuitBreakerState;
  nextRecoveryAttempt?: number;
}

export interface ServiceHealthConfig {
  checkInterval: number;           // Health check interval (ms)
  timeout: number;                // Health check timeout (ms)
  retryAttempts: number;          // Number of retry attempts
  degradedThreshold: number;      // Response time threshold for degraded status (ms)
  unhealthyThreshold: number;     // Response time threshold for unhealthy status (ms)
  errorRateThreshold: number;     // Error rate threshold for unhealthy status (%)
  circuitBreakerConfig: EnhancedCircuitBreakerConfig;
}

export interface HealthCheckFunction {
  (serviceName: string): Promise<{
    responseTime: number;
    success: boolean;
    metadata?: Record<string, any>;
    error?: string;
  }>;
}

export class ServiceHealthMonitor {
  private services = new Map<string, {
    config: ServiceHealthConfig;
    circuitBreaker: EnhancedCircuitBreaker;
    healthCheck: HealthCheckFunction;
    status: ServiceHealthStatus;
    interval?: NodeJS.Timeout;
  }>();
  
  private listeners = new Set<(serviceName: string, status: ServiceHealthStatus) => void>();
  private isMonitoring = false;

  constructor() {
    logger.info('Service Health Monitor initialized', 'ServiceHealthMonitor');
  }

  /**
   * Register a service for health monitoring
   */
  public registerService(
    serviceName: string,
    healthCheck: HealthCheckFunction,
    config: Partial<ServiceHealthConfig> = {}
  ): void {
    const fullConfig: ServiceHealthConfig = {
      checkInterval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      retryAttempts: 3,
      degradedThreshold: 2000, // 2 seconds
      unhealthyThreshold: 5000, // 5 seconds
      errorRateThreshold: 10, // 10%
      circuitBreakerConfig: {
        failureThreshold: 5,
        timeout: 60000, // 1 minute
        successThreshold: 2,
        monitoringPeriod: 300000, // 5 minutes
        exponentialBackoffMultiplier: 2,
        maxTimeout: 300000, // 5 minutes
        healthCheckInterval: 30000, // 30 seconds
        automaticRecovery: true,
        onStateChange: (state) => {
          logger.info(`Circuit breaker state changed for ${serviceName}: ${state}`, 'ServiceHealthMonitor');
          this.updateServiceStatus(serviceName);
        },
        onHealthCheck: (isHealthy) => {
          logger.debug(`Health check result for ${serviceName}: ${isHealthy}`, 'ServiceHealthMonitor');
        }
      },
      ...config
    };

    const circuitBreaker = new EnhancedCircuitBreaker(serviceName, fullConfig.circuitBreakerConfig);

    const initialStatus: ServiceHealthStatus = {
      serviceName,
      status: 'healthy',
      lastCheck: Date.now(),
      responseTime: 0,
      errorRate: 0,
      uptime: 0,
      metadata: {},
      circuitBreakerState: CircuitBreakerState.CLOSED
    };

    this.services.set(serviceName, {
      config: fullConfig,
      circuitBreaker,
      healthCheck,
      status: initialStatus,
    });

    logger.info(`Service registered for health monitoring: ${serviceName}`, 'ServiceHealthMonitor', {
      checkInterval: fullConfig.checkInterval,
      timeout: fullConfig.timeout
    });

    // Start monitoring if not already started
    if (this.isMonitoring) {
      this.startServiceMonitoring(serviceName);
    }
  }

  /**
   * Unregister a service from health monitoring
   */
  public unregisterService(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (service) {
      if (service.interval) {
        clearInterval(service.interval);
      }
      service.circuitBreaker.destroy();
      this.services.delete(serviceName);
      
      logger.info(`Service unregistered from health monitoring: ${serviceName}`, 'ServiceHealthMonitor');
    }
  }

  /**
   * Start monitoring all registered services
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Service health monitoring already started', 'ServiceHealthMonitor');
      return;
    }

    this.isMonitoring = true;
    
    for (const serviceName of this.services.keys()) {
      this.startServiceMonitoring(serviceName);
    }

    logger.info(`Started health monitoring for ${this.services.size} services`, 'ServiceHealthMonitor');
  }

  /**
   * Stop monitoring all services
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    for (const [serviceName, service] of this.services.entries()) {
      if (service.interval) {
        clearInterval(service.interval);
        service.interval = undefined;
      }
    }

    logger.info('Stopped health monitoring for all services', 'ServiceHealthMonitor');
  }

  /**
   * Start monitoring for a specific service
   */
  private startServiceMonitoring(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    // Clear existing interval if any
    if (service.interval) {
      clearInterval(service.interval);
    }

    // Perform initial health check
    this.performHealthCheck(serviceName);

    // Set up periodic health checks
    service.interval = setInterval(() => {
      this.performHealthCheck(serviceName);
    }, service.config.checkInterval);

    logger.debug(`Started monitoring for service: ${serviceName}`, 'ServiceHealthMonitor');
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    const startTime = Date.now();

    try {
      // Use circuit breaker to execute health check
      const result = await service.circuitBreaker.execute(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), service.config.timeout);

        try {
          const checkResult = await service.healthCheck(serviceName);
          clearTimeout(timeoutId);
          return checkResult;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      });

      const responseTime = Date.now() - startTime;

      // Update service status based on health check result
      this.updateServiceHealthStatus(serviceName, {
        success: result.success,
        responseTime: result.responseTime || responseTime,
        metadata: result.metadata || {},
        error: result.error
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.updateServiceHealthStatus(serviceName, {
        success: false,
        responseTime,
        metadata: {},
        error: errorMessage
      });
    }
  }

  /**
   * Update service health status based on check result
   */
  private updateServiceHealthStatus(
    serviceName: string,
    result: {
      success: boolean;
      responseTime: number;
      metadata: Record<string, any>;
      error?: string;
    }
  ): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    const now = Date.now();
    const circuitStats = service.circuitBreaker.getStats();

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!result.success || circuitStats.state === CircuitBreakerState.OPEN) {
      status = 'unhealthy';
    } else if (
      result.responseTime > service.config.degradedThreshold ||
      circuitStats.errorRate > service.config.errorRateThreshold / 2 ||
      circuitStats.state === CircuitBreakerState.HALF_OPEN
    ) {
      status = 'degraded';
    }

    // Update service status
    const previousStatus = service.status.status;
    service.status = {
      serviceName,
      status,
      lastCheck: now,
      responseTime: result.responseTime,
      errorRate: circuitStats.errorRate,
      uptime: circuitStats.uptime,
      metadata: {
        ...result.metadata,
        error: result.error,
        circuitBreakerStats: circuitStats
      },
      circuitBreakerState: circuitStats.state,
      nextRecoveryAttempt: circuitStats.nextAttemptTime || undefined
    };

    // Log status changes
    if (previousStatus !== status) {
      logger.info(`Service health status changed: ${serviceName}`, 'ServiceHealthMonitor', {
        from: previousStatus,
        to: status,
        responseTime: result.responseTime,
        errorRate: circuitStats.errorRate
      });
    }

    // Notify listeners
    this.notifyListeners(serviceName, service.status);
  }

  /**
   * Update service status (called by circuit breaker state changes)
   */
  private updateServiceStatus(serviceName: string): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    const circuitStats = service.circuitBreaker.getStats();
    
    // Update circuit breaker related fields
    service.status.circuitBreakerState = circuitStats.state;
    service.status.nextRecoveryAttempt = circuitStats.nextAttemptTime || undefined;
    service.status.errorRate = circuitStats.errorRate;
    service.status.uptime = circuitStats.uptime;

    // Update overall status based on circuit breaker state
    if (circuitStats.state === CircuitBreakerState.OPEN) {
      service.status.status = 'unhealthy';
    } else if (circuitStats.state === CircuitBreakerState.HALF_OPEN) {
      service.status.status = 'degraded';
    }

    this.notifyListeners(serviceName, service.status);
  }

  /**
   * Get health status for a specific service
   */
  public getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    const service = this.services.get(serviceName);
    return service ? { ...service.status } : null;
  }

  /**
   * Get health status for all services
   */
  public getAllServiceHealth(): Record<string, ServiceHealthStatus> {
    const result: Record<string, ServiceHealthStatus> = {};
    
    for (const [serviceName, service] of this.services.entries()) {
      result[serviceName] = { ...service.status };
    }

    return result;
  }

  /**
   * Get overall system health summary
   */
  public getSystemHealthSummary(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
    criticalServicesDown: string[];
  } {
    const services = Array.from(this.services.values());
    const total = services.length;
    const healthy = services.filter(s => s.status.status === 'healthy').length;
    const degraded = services.filter(s => s.status.status === 'degraded').length;
    const unhealthy = services.filter(s => s.status.status === 'unhealthy').length;

    // Define critical services
    const criticalServices = ['edge-function-professional', 'database', 'deepseek-api'];
    const criticalServicesDown = services
      .filter(s => criticalServices.includes(s.status.serviceName) && s.status.status === 'unhealthy')
      .map(s => s.status.serviceName);

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (criticalServicesDown.length > 0 || unhealthy > total / 2) {
      overall = 'unhealthy';
    } else if (degraded > 0 || unhealthy > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services: { total, healthy, degraded, unhealthy },
      criticalServicesDown
    };
  }

  /**
   * Force health check for a specific service
   */
  public async forceHealthCheck(serviceName: string): Promise<ServiceHealthStatus | null> {
    await this.performHealthCheck(serviceName);
    return this.getServiceHealth(serviceName);
  }

  /**
   * Force health check for all services
   */
  public async forceHealthCheckAll(): Promise<Record<string, ServiceHealthStatus>> {
    const promises = Array.from(this.services.keys()).map(serviceName => 
      this.performHealthCheck(serviceName)
    );
    
    await Promise.allSettled(promises);
    return this.getAllServiceHealth();
  }

  /**
   * Reset circuit breaker for a service
   */
  public resetServiceCircuitBreaker(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (service) {
      service.circuitBreaker.forceClose();
      logger.info(`Circuit breaker reset for service: ${serviceName}`, 'ServiceHealthMonitor');
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  public resetAllCircuitBreakers(): void {
    for (const [serviceName, service] of this.services.entries()) {
      service.circuitBreaker.forceClose();
    }
    logger.info('All circuit breakers reset', 'ServiceHealthMonitor');
  }

  /**
   * Add listener for health status changes
   */
  public addListener(listener: (serviceName: string, status: ServiceHealthStatus) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for health status changes
   */
  public removeListener(listener: (serviceName: string, status: ServiceHealthStatus) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(serviceName: string, status: ServiceHealthStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(serviceName, status);
      } catch (error) {
        logger.error('Error in health status listener', 'ServiceHealthMonitor', error);
      }
    }
  }

  /**
   * Get circuit breaker for a service (for advanced operations)
   */
  public getCircuitBreaker(serviceName: string): EnhancedCircuitBreaker | null {
    const service = this.services.get(serviceName);
    return service ? service.circuitBreaker : null;
  }

  /**
   * Cleanup all resources
   */
  public destroy(): void {
    this.stopMonitoring();
    
    for (const [serviceName, service] of this.services.entries()) {
      service.circuitBreaker.destroy();
    }
    
    this.services.clear();
    this.listeners.clear();
    
    logger.info('Service Health Monitor destroyed', 'ServiceHealthMonitor');
  }
}

// Export singleton instance
export const serviceHealthMonitor = new ServiceHealthMonitor();

export default serviceHealthMonitor;