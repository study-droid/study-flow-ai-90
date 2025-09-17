/**
 * AI Provider Health Monitoring Service
 * Monitors the health and availability of different AI providers
 */

import { logger } from '@/services/logging/logger';
import { aiProxyClient } from './ai-proxy-client';

export interface ProviderStatus {
  provider: string;
  isHealthy: boolean;
  lastChecked: Date;
  responseTime: number;
  errorCount: number;
  consecutiveErrors: number;
  lastError?: string;
}

export interface HealthSummary {
  totalProviders: number;
  healthyProviders: number;
  unhealthyProviders: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

class AIProviderHealthService {
  private statusMap = new Map<string, ProviderStatus>();
  private healthCheckInterval: number | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
  private readonly MAX_CONSECUTIVE_ERRORS = 3;
  private readonly HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

  private readonly PROVIDERS = ['deepseek', 'openai', 'gemini', 'claude', 'perplexity'];

  constructor() {
    // Initialize all providers as unknown
    this.PROVIDERS.forEach(provider => {
      this.statusMap.set(provider, {
        provider,
        isHealthy: true, // Assume healthy until proven otherwise
        lastChecked: new Date(),
        responseTime: 0,
        errorCount: 0,
        consecutiveErrors: 0
      });
    });
  }

  /**
   * Start automatic health monitoring
   */
  startMonitoring(): void {
    if (this.healthCheckInterval) {
      this.stopMonitoring();
    }

    logger.info('Starting AI provider health monitoring', 'ProviderHealth');
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule periodic health checks
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Stop automatic health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped AI provider health monitoring', 'ProviderHealth');
    }
  }

  /**
   * Perform health check for all providers
   */
  private async performHealthCheck(): Promise<void> {
    logger.info('Performing health check for all providers', 'ProviderHealth');

    const healthPromises = this.PROVIDERS.map(provider => 
      this.checkProviderHealth(provider)
    );

    await Promise.allSettled(healthPromises);
    
    const summary = this.getHealthSummary();
    logger.info('Health check completed', 'ProviderHealth', summary);
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(provider: string): Promise<ProviderStatus> {
    const startTime = Date.now();
    const currentStatus = this.statusMap.get(provider);

    try {
      // Send a simple test message to check provider availability
      const testMessage = [{ role: 'user', content: 'Hello' }];
      
      const response = await Promise.race([
        aiProxyClient.sendChatMessage(provider as any, testMessage, { maxTokens: 10 }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.HEALTH_CHECK_TIMEOUT)
        )
      ]);

      const responseTime = Date.now() - startTime;

      if (response && !response.error) {
        // Provider is healthy
        const newStatus: ProviderStatus = {
          provider,
          isHealthy: true,
          lastChecked: new Date(),
          responseTime,
          errorCount: currentStatus?.errorCount || 0,
          consecutiveErrors: 0 // Reset consecutive errors on success
        };

        this.statusMap.set(provider, newStatus);
        
        logger.debug(`Provider ${provider} is healthy`, 'ProviderHealth', {
          responseTime: `${responseTime}ms`
        });

        return newStatus;
      } else {
        throw new Error(response?.error || 'Unknown error');
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const errorCount = (currentStatus?.errorCount || 0) + 1;
      const consecutiveErrors = (currentStatus?.consecutiveErrors || 0) + 1;
      const isHealthy = consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS;

      const newStatus: ProviderStatus = {
        provider,
        isHealthy,
        lastChecked: new Date(),
        responseTime,
        errorCount,
        consecutiveErrors,
        lastError: error.message
      };

      this.statusMap.set(provider, newStatus);

      logger.warn(`Provider ${provider} health check failed`, 'ProviderHealth', {
        error: error.message,
        consecutiveErrors,
        isHealthy
      });

      return newStatus;
    }
  }

  /**
   * Get status of a specific provider
   */
  getProviderStatus(provider: string): ProviderStatus | undefined {
    return this.statusMap.get(provider);
  }

  /**
   * Get all provider statuses
   */
  getAllProviderStatuses(): ProviderStatus[] {
    return Array.from(this.statusMap.values());
  }

  /**
   * Get healthy providers only
   */
  getHealthyProviders(): string[] {
    return Array.from(this.statusMap.values())
      .filter(status => status.isHealthy)
      .map(status => status.provider);
  }

  /**
   * Get the best available provider based on health and response time
   */
  getBestProvider(): string | null {
    const healthyProviders = Array.from(this.statusMap.values())
      .filter(status => status.isHealthy)
      .sort((a, b) => a.responseTime - b.responseTime);

    return healthyProviders.length > 0 ? healthyProviders[0].provider : null;
  }

  /**
   * Get overall health summary
   */
  getHealthSummary(): HealthSummary {
    const statuses = Array.from(this.statusMap.values());
    const healthyCount = statuses.filter(s => s.isHealthy).length;
    const avgResponseTime = statuses.length > 0 
      ? statuses.reduce((sum, s) => sum + s.responseTime, 0) / statuses.length 
      : 0;

    return {
      totalProviders: statuses.length,
      healthyProviders: healthyCount,
      unhealthyProviders: statuses.length - healthyCount,
      averageResponseTime: Math.round(avgResponseTime),
      lastUpdated: new Date()
    };
  }

  /**
   * Record a provider error (called externally when errors occur)
   */
  recordProviderError(provider: string, error: string): void {
    const currentStatus = this.statusMap.get(provider);
    if (currentStatus) {
      const errorCount = currentStatus.errorCount + 1;
      const consecutiveErrors = currentStatus.consecutiveErrors + 1;
      const isHealthy = consecutiveErrors < this.MAX_CONSECUTIVE_ERRORS;

      this.statusMap.set(provider, {
        ...currentStatus,
        isHealthy,
        errorCount,
        consecutiveErrors,
        lastError: error,
        lastChecked: new Date()
      });

      logger.warn(`Recorded error for provider ${provider}`, 'ProviderHealth', {
        error,
        consecutiveErrors,
        isHealthy
      });
    }
  }

  /**
   * Record a successful provider interaction
   */
  recordProviderSuccess(provider: string, responseTime: number): void {
    const currentStatus = this.statusMap.get(provider);
    if (currentStatus) {
      this.statusMap.set(provider, {
        ...currentStatus,
        isHealthy: true,
        consecutiveErrors: 0, // Reset on success
        responseTime,
        lastChecked: new Date()
      });
    }
  }

  /**
   * Reset all provider health data
   */
  resetAllProviders(): void {
    this.PROVIDERS.forEach(provider => {
      this.statusMap.set(provider, {
        provider,
        isHealthy: true,
        lastChecked: new Date(),
        responseTime: 0,
        errorCount: 0,
        consecutiveErrors: 0
      });
    });

    logger.info('Reset all provider health data', 'ProviderHealth');
  }
}

// Export singleton instance
export const aiProviderHealth = new AIProviderHealthService();

// Auto-start monitoring in development
if (import.meta.env.DEV) {
  aiProviderHealth.startMonitoring();
}