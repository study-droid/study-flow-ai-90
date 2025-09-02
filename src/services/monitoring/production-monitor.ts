/**
 * Production Monitoring System
 * Enterprise-grade monitoring and health checks for StudyFlow AI
 */

import { logger } from '@/services/logging/logger';
import { supabase } from '@/integrations/supabase/client';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: HealthCheckResult[];
  uptime: number;
  performance: {
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  timestamp: string;
}

export interface AlertConfig {
  component: string;
  threshold: {
    responseTime: number; // ms
    errorRate: number; // percentage
    consecutiveFailures: number;
  };
  actions: {
    fallbackEnabled: boolean;
    notifyAdmin: boolean;
    autoRestart: boolean;
  };
}

class ProductionMonitor {
  private healthChecks = new Map<string, HealthCheckResult>();
  private performanceMetrics = new Map<string, number[]>();
  private alertConfigs: AlertConfig[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private readonly MONITORING_INTERVAL = 60000; // 1 minute
  private readonly METRICS_RETENTION = 24 * 60; // 24 hours

  constructor() {
    this.initializeDefaultAlerts();
    this.startMonitoring();
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlerts(): void {
    this.alertConfigs = [
      {
        component: 'edge-function-professional',
        threshold: {
          responseTime: 5000,
          errorRate: 10,
          consecutiveFailures: 3
        },
        actions: {
          fallbackEnabled: true,
          notifyAdmin: true,
          autoRestart: false
        }
      },
      {
        component: 'edge-function-legacy',
        threshold: {
          responseTime: 8000,
          errorRate: 15,
          consecutiveFailures: 5
        },
        actions: {
          fallbackEnabled: true,
          notifyAdmin: true,
          autoRestart: false
        }
      },
      {
        component: 'database',
        threshold: {
          responseTime: 3000,
          errorRate: 5,
          consecutiveFailures: 2
        },
        actions: {
          fallbackEnabled: false,
          notifyAdmin: true,
          autoRestart: false
        }
      },
      {
        component: 'deepseek-api',
        threshold: {
          responseTime: 15000,
          errorRate: 20,
          consecutiveFailures: 3
        },
        actions: {
          fallbackEnabled: true,
          notifyAdmin: false,
          autoRestart: false
        }
      }
    ];
  }

  /**
   * Start comprehensive system monitoring
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Monitoring already running', 'ProductionMonitor');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting production monitoring', 'ProductionMonitor');

    // Initial health check
    this.performHealthCheck().catch(error => {
      logger.error('Initial health check failed', 'ProductionMonitor', error);
    });

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Periodic health check failed', 'ProductionMonitor', error);
      });
    }, this.MONITORING_INTERVAL);

    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Stopped production monitoring', 'ProductionMonitor');
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const components: HealthCheckResult[] = [];

    // Check Edge Function Professional
    const professionalHealth = await this.checkEdgeFunctionHealth(
      'edge-function-professional',
      'https://uuebhjidsaswvuexdcbb.supabase.co/functions/v1/deepseek-ai-professional'
    );
    components.push(professionalHealth);

    // Check Edge Function Legacy
    const legacyHealth = await this.checkEdgeFunctionHealth(
      'edge-function-legacy',
      'https://uuebhjidsaswvuexdcbb.supabase.co/functions/v1/ai-proxy-secure'
    );
    components.push(legacyHealth);

    // Check Database
    const databaseHealth = await this.checkDatabaseHealth();
    components.push(databaseHealth);

    // Check DeepSeek API directly
    const deepseekHealth = await this.checkDeepSeekAPI();
    components.push(deepseekHealth);

    // Update health check results
    components.forEach(result => {
      this.healthChecks.set(result.component, result);
    });

    // Calculate overall health
    const overallStatus = this.calculateOverallHealth(components);

    // Record performance metrics
    const totalTime = Date.now() - startTime;
    this.recordMetric('system-health-check', totalTime);

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      components,
      uptime: this.getUptime(),
      performance: this.getPerformanceMetrics(),
      timestamp: new Date().toISOString()
    };

    // Process alerts
    await this.processAlerts(systemHealth);

    logger.info('Health check completed', 'ProductionMonitor', {
      overall: overallStatus,
      responseTime: totalTime,
      componentCount: components.length
    });

    return systemHealth;
  }

  /**
   * Check Edge Function health
   */
  private async checkEdgeFunctionHealth(
    component: string,
    url: string
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          component,
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();

      return {
        component,
        status: 'healthy',
        responseTime,
        metadata: {
          httpStatus: response.status,
          apiKeyConfigured: data.apiKeyConfigured,
          functionStatus: data.status
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component,
        status: 'unhealthy',
        responseTime,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple query to test database connectivity
      const { data, error } = await supabase
        .from('ai_tutor_sessions')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          component: 'database',
          status: 'unhealthy',
          responseTime,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }

      return {
        component: 'database',
        status: 'healthy',
        responseTime,
        metadata: {
          queryType: 'count',
          resultCount: data?.length || 0
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message || 'Database connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check DeepSeek API health
   */
  private async checkDeepSeekAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch('https://api.deepseek.com/v1/models', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer sk-e4f1da719783415d84e3eee0e669b829`,
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 401) {
          return {
            component: 'deepseek-api',
            status: 'degraded',
            responseTime,
            error: 'API key authentication failed',
            metadata: { httpStatus: response.status },
            timestamp: new Date().toISOString()
          };
        }

        return {
          component: 'deepseek-api',
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();

      return {
        component: 'deepseek-api',
        status: 'healthy',
        responseTime,
        metadata: {
          httpStatus: response.status,
          modelCount: data.data?.length || 0
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'deepseek-api',
        status: 'unhealthy',
        responseTime,
        error: error.message || 'API connection failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(components: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const healthyCount = components.filter(c => c.status === 'healthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;

    // If any critical component is unhealthy, system is unhealthy
    const criticalComponents = ['edge-function-professional', 'database'];
    const criticalUnhealthy = components
      .filter(c => criticalComponents.includes(c.component))
      .some(c => c.status === 'unhealthy');

    if (criticalUnhealthy) {
      return 'unhealthy';
    }

    // If more than half are unhealthy, system is unhealthy
    if (unhealthyCount > components.length / 2) {
      return 'unhealthy';
    }

    // If any component is degraded or some are unhealthy, system is degraded
    if (degradedCount > 0 || unhealthyCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Record performance metric
   */
  private recordMetric(key: string, value: number): void {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }

    const metrics = this.performanceMetrics.get(key)!;
    metrics.push(value);

    // Keep only recent metrics
    if (metrics.length > this.METRICS_RETENTION) {
      metrics.splice(0, metrics.length - this.METRICS_RETENTION);
    }
  }

  /**
   * Get performance metrics summary
   */
  private getPerformanceMetrics(): {
    averageResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  } {
    const healthCheckMetrics = this.performanceMetrics.get('system-health-check') || [];
    const averageResponseTime = healthCheckMetrics.length > 0
      ? healthCheckMetrics.reduce((sum, time) => sum + time, 0) / healthCheckMetrics.length
      : 0;

    // Calculate error rate from recent health checks
    const recentComponents = Array.from(this.healthChecks.values());
    const errorRate = recentComponents.length > 0
      ? (recentComponents.filter(c => c.status === 'unhealthy').length / recentComponents.length) * 100
      : 0;

    // Estimate requests per minute based on monitoring frequency
    const requestsPerMinute = Math.round(60000 / this.MONITORING_INTERVAL);

    return {
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerMinute
    };
  }

  /**
   * Get system uptime
   */
  private getUptime(): number {
    // In browser environment, use page load time as a proxy for uptime
    if (typeof window !== 'undefined' && window.performance) {
      const uptimeMs = Date.now() - window.performance.timing.navigationStart;
      return Math.round(uptimeMs / 1000);
    }
    return 0;
  }

  /**
   * Process alerts based on health check results
   */
  private async processAlerts(systemHealth: SystemHealth): Promise<void> {
    for (const component of systemHealth.components) {
      const alertConfig = this.alertConfigs.find(config => config.component === component.component);
      if (!alertConfig) continue;

      const shouldAlert = this.shouldTriggerAlert(component, alertConfig);
      if (shouldAlert) {
        await this.handleAlert(component, alertConfig, systemHealth);
      }
    }
  }

  /**
   * Determine if alert should be triggered
   */
  private shouldTriggerAlert(component: HealthCheckResult, config: AlertConfig): boolean {
    // Check response time threshold
    if (component.responseTime > config.threshold.responseTime) {
      logger.warn(`Response time threshold exceeded for ${component.component}`, 'ProductionMonitor', {
        responseTime: component.responseTime,
        threshold: config.threshold.responseTime
      });
      return true;
    }

    // Check if component is unhealthy
    if (component.status === 'unhealthy') {
      logger.warn(`Component unhealthy: ${component.component}`, 'ProductionMonitor', {
        error: component.error
      });
      return true;
    }

    return false;
  }

  /**
   * Handle alert actions
   */
  private async handleAlert(
    component: HealthCheckResult,
    config: AlertConfig,
    systemHealth: SystemHealth
  ): Promise<void> {
    logger.warn(`Alert triggered for ${component.component}`, 'ProductionMonitor', {
      component: component.component,
      status: component.status,
      responseTime: component.responseTime,
      error: component.error
    });

    if (config.actions.fallbackEnabled) {
      await this.enableFallbackMechanism(component.component);
    }

    if (config.actions.notifyAdmin) {
      await this.notifyAdmin(component, systemHealth);
    }

    if (config.actions.autoRestart) {
      await this.attemptAutoRestart(component.component);
    }
  }

  /**
   * Enable fallback mechanism for component
   */
  private async enableFallbackMechanism(componentName: string): Promise<void> {
    logger.info(`Enabling fallback mechanism for ${componentName}`, 'ProductionMonitor');
    
    // This would trigger fallback logic in the unified AI service
    // For now, just log the action
  }

  /**
   * Notify admin about system issues
   */
  private async notifyAdmin(component: HealthCheckResult, systemHealth: SystemHealth): Promise<void> {
    const alertData = {
      component: component.component,
      status: component.status,
      error: component.error,
      responseTime: component.responseTime,
      systemHealth: systemHealth.overall,
      timestamp: component.timestamp,
      url: window.location.href
    };

    logger.error('Admin notification triggered', 'ProductionMonitor', alertData);

    // In a real implementation, this would send notifications via:
    // - Email
    // - SMS
    // - Slack/Discord webhook
    // - Push notification to admin dashboard
  }

  /**
   * Attempt automatic restart of component
   */
  private async attemptAutoRestart(componentName: string): Promise<void> {
    logger.warn(`Auto-restart attempted for ${componentName}`, 'ProductionMonitor');
    
    // This would implement restart logic specific to each component
    // For Edge Functions, this might involve re-deploying
    // For services, this might involve restarting processes
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      if (metrics.length > this.METRICS_RETENTION) {
        metrics.splice(0, metrics.length - this.METRICS_RETENTION);
      }
    }
  }

  /**
   * Get current health status
   */
  public getCurrentHealth(): SystemHealth | null {
    const components = Array.from(this.healthChecks.values());
    if (components.length === 0) return null;

    return {
      overall: this.calculateOverallHealth(components),
      components,
      uptime: this.getUptime(),
      performance: this.getPerformanceMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health check history for specific component
   */
  public getComponentHealth(componentName: string): HealthCheckResult | null {
    return this.healthChecks.get(componentName) || null;
  }

  /**
   * Force immediate health check
   */
  public async forceHealthCheck(): Promise<SystemHealth> {
    logger.info('Forcing immediate health check', 'ProductionMonitor');
    return await this.performHealthCheck();
  }
}

// Export singleton instance
export const productionMonitor = new ProductionMonitor();

export default productionMonitor;