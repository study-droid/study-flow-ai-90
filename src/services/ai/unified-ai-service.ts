/**
 * Unified AI Service
 * Main service that orchestrates multiple AI providers through the router
 */

import { 
  AIProviderRouter, 
  type AIProviderConfig, 
  type AIRequest, 
  type AIResponse, 
  type ProviderHealth,
  type ProviderSelectionCriteria 
} from './ai-provider-router';
import { DeepSeekProvider } from './providers/deepseek-provider';
import { EdgeFunctionProvider } from './providers/edge-function-provider';
import { BaseAIProvider } from './providers/base-provider';
import type { AIStreamChunk } from '../../types/ai-tutor';
import { 
  globalCacheManager, 
  CacheUtils, 
  type CacheMetrics,
  type GlobalCacheMetrics 
} from './cache';

export interface UnifiedAIServiceConfig {
  defaultProvider?: string;
  enableFallback?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cachePolicy?: string;
}

export interface ServiceHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  providers: ProviderHealth[];
  lastCheck: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export interface ProductionReadiness {
  overall: 'ready' | 'degraded' | 'not-ready';
  checks: {
    providersAvailable: boolean;
    healthyProviders: number;
    configurationValid: boolean;
    fallbacksConfigured: boolean;
  };
  recommendations: string[];
}

export class UnifiedAIService {
  private router: AIProviderRouter;
  private providers: Map<string, BaseAIProvider> = new Map();
  private config: UnifiedAIServiceConfig;
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
  };

  constructor(config: UnifiedAIServiceConfig = {}) {
    this.config = {
      enableFallback: true,
      maxRetryAttempts: 3,
      retryDelay: 1000,
      enableMetrics: true,
      enableCaching: true,
      cachePolicy: 'standard',
      ...config
    };

    this.router = new AIProviderRouter();
    this.resetMetrics();
    this.initializeProviders();
  }

  /**
   * Initialize all AI providers
   */
  private initializeProviders(): void {
    // Initialize DeepSeek provider
    const deepSeekProvider = new DeepSeekProvider();
    this.providers.set('deepseek', deepSeekProvider);

    // Initialize Edge Function provider for professional AI
    const edgeFunctionProvider = new EdgeFunctionProvider({
      functionName: 'ai-tutor-professional'
    });
    this.providers.set('edge-function-professional', edgeFunctionProvider);

    // TODO: Add other providers (OpenAI, Anthropic, Gemini) when implemented
  }

  /**
   * Send a message to the best available AI provider
   */
  async sendMessage(request: AIRequest): Promise<AIResponse> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Check cache first if caching is enabled
      if (this.config.enableCaching && !request.stream) {
        const cacheResult = await globalCacheManager.get(request, this.config.cachePolicy);
        if (cacheResult.hit && cacheResult.response) {
          const processingTime = performance.now() - startTime;
          this.metrics.successfulRequests++;
          this.metrics.totalResponseTime += processingTime;
          
          return {
            ...cacheResult.response,
            processingTime,
            cached: true,
            cacheHit: true
          };
        }
      }
      // Select the best provider based on request criteria
      const criteria: ProviderSelectionCriteria = {
        requiredCapabilities: request.requiredCapabilities,
        requireStreaming: request.stream,
        excludeProviders: []
      };

      let selectedProvider: AIProviderConfig | null = null;
      
      // Use preferred provider if specified and available
      if (request.preferredProvider) {
        const preferredConfig = this.router.getProvider(request.preferredProvider);
        if (preferredConfig && this.router.isProviderAvailable(request.preferredProvider)) {
          selectedProvider = preferredConfig;
        }
      }

      // Otherwise, select best available provider
      if (!selectedProvider) {
        selectedProvider = this.router.selectProvider(criteria);
      }

      if (!selectedProvider) {
        throw new Error('No available AI providers found');
      }

      // Get the provider instance
      const providerInstance = this.providers.get(selectedProvider.id);
      if (!providerInstance) {
        throw new Error(`Provider ${selectedProvider.id} not initialized`);
      }

      // Make the request
      const response = await this.makeRequestWithFallback(
        providerInstance, 
        request, 
        selectedProvider.id
      );

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.metrics.successfulRequests++;
      this.metrics.totalResponseTime += processingTime;

      // Cache the response if caching is enabled and response should be cached
      if (this.config.enableCaching && CacheUtils.shouldCache(request, response)) {
        await globalCacheManager.set(request, response, this.config.cachePolicy);
      }

      return response;

    } catch (error) {
      this.metrics.failedRequests++;
      
      const processingTime = performance.now() - startTime;
      return {
        id: `error_${Date.now()}`,
        content: `I apologize, but I'm experiencing technical difficulties. Please try again in a moment.`,
        providerId: 'error',
        cached: false,
        processingTime,
        requestId: request.requestId,
        model: 'error',
        fallbackUsed: true,
        metadata: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Stream a message from the best available AI provider
   */
  async *streamMessage(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    this.metrics.totalRequests++;

    try {
      // Select provider with streaming capability
      const criteria: ProviderSelectionCriteria = {
        requiredCapabilities: [...(request.requiredCapabilities || []), 'streaming'],
        requireStreaming: true
      };

      let selectedProvider = this.router.selectProvider(criteria);
      
      if (!selectedProvider) {
        yield { type: 'error', error: 'No streaming providers available' };
        return;
      }

      const providerInstance = this.providers.get(selectedProvider.id);
      if (!providerInstance) {
        yield { type: 'error', error: `Provider ${selectedProvider.id} not initialized` };
        return;
      }

      // Stream from the provider
      const baseRequest = {
        messages: request.messages,
        modelConfig: request.modelConfig,
        requestId: request.requestId,
        stream: true,
        abortSignal: request.abortSignal
      };

      yield* providerInstance.stream(baseRequest);
      this.metrics.successfulRequests++;

    } catch (error) {
      this.metrics.failedRequests++;
      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown streaming error' 
      };
    }
  }

  /**
   * Make request with fallback support
   */
  private async makeRequestWithFallback(
    provider: BaseAIProvider, 
    request: AIRequest, 
    providerId: string
  ): Promise<AIResponse> {
    const baseRequest = {
      messages: request.messages,
      modelConfig: request.modelConfig,
      requestId: request.requestId,
      stream: false,
      abortSignal: request.abortSignal
    };

    try {
      const response = await provider.complete(baseRequest);
      
      // Update provider health on success
      this.router.updateProviderHealth(providerId, {
        status: 'online',
        lastSuccess: new Date()
      });

      return {
        ...response,
        providerId,
        fallbackUsed: false
      };

    } catch (error) {
      // Update provider health on failure
      this.router.updateProviderHealth(providerId, {
        status: 'degraded'
      });

      if (!this.config.enableFallback) {
        throw error;
      }

      // Try fallback providers
      const fallbackChain = this.router.getFallbackChain(providerId);
      
      for (const fallbackId of fallbackChain) {
        if (fallbackId === providerId) continue; // Skip the failed provider
        
        if (!this.router.isProviderAvailable(fallbackId)) continue;
        
        const fallbackProvider = this.providers.get(fallbackId);
        if (!fallbackProvider) continue;

        try {
          const response = await fallbackProvider.complete(baseRequest);
          
          // Update fallback provider health on success
          this.router.updateProviderHealth(fallbackId, {
            status: 'online',
            lastSuccess: new Date()
          });

          return {
            ...response,
            providerId: fallbackId,
            fallbackUsed: true
          };

        } catch (fallbackError) {
          // Update fallback provider health on failure
          this.router.updateProviderHealth(fallbackId, {
            status: 'degraded'
          });
          
          continue; // Try next fallback
        }
      }

      // All providers failed
      throw error;
    }
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): AIProviderConfig[] {
    return this.router.getAvailableProviders();
  }

  /**
   * Get service health status
   */
  getServiceHealth(): ServiceHealthStatus {
    const providerHealths = this.router.getAllProviderHealth();
    const onlineCount = providerHealths.filter(h => h.status === 'online').length;
    const degradedCount = providerHealths.filter(h => h.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (onlineCount === 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0 || onlineCount < providerHealths.length / 2) {
      overall = 'degraded';
    }

    return {
      overall,
      providers: providerHealths,
      lastCheck: new Date(),
      metrics: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        averageResponseTime: this.getAverageResponseTime()
      }
    };
  }

  /**
   * Check if a specific service is available
   */
  isServiceAvailable(providerId: string): boolean {
    return this.router.isProviderAvailable(providerId);
  }

  /**
   * Get service configuration
   */
  getServiceConfiguration(): Record<string, any> {
    return {
      ...this.config,
      providers: this.router.getAvailableProviders().map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        capabilities: p.capabilities,
        priority: p.priority
      })),
      routingStats: this.router.getRoutingStats()
    };
  }

  /**
   * Get production readiness status
   */
  getProductionReadiness(): ProductionReadiness {
    const providers = this.router.getAvailableProviders();
    const healthyProviders = this.router.getAllProviderHealth()
      .filter(h => h.status === 'online').length;
    
    const checks = {
      providersAvailable: providers.length > 0,
      healthyProviders,
      configurationValid: this.validateConfiguration(),
      fallbacksConfigured: this.router.getFallbackChain().length > 1
    };

    const recommendations: string[] = [];
    
    if (!checks.providersAvailable) {
      recommendations.push('Configure at least one AI provider');
    }
    
    if (checks.healthyProviders === 0) {
      recommendations.push('Ensure at least one provider is healthy');
    }
    
    if (!checks.fallbacksConfigured) {
      recommendations.push('Configure fallback providers for reliability');
    }

    let overall: 'ready' | 'degraded' | 'not-ready' = 'ready';
    
    if (!checks.providersAvailable || checks.healthyProviders === 0) {
      overall = 'not-ready';
    } else if (checks.healthyProviders < 2 || !checks.fallbacksConfigured) {
      overall = 'degraded';
    }

    return {
      overall,
      checks,
      recommendations
    };
  }

  /**
   * Switch to a specific provider
   */
  switchProvider(providerId: string): boolean {
    const provider = this.router.getProvider(providerId);
    if (!provider || !this.router.isProviderAvailable(providerId)) {
      return false;
    }

    this.config.defaultProvider = providerId;
    return true;
  }

  /**
   * Reset all services (circuit breakers, caches, etc.)
   */
  resetServices(): void {
    this.resetMetrics();
    
    // Reset individual provider metrics
    for (const provider of this.providers.values()) {
      provider.resetMetrics();
    }

    // Reset provider health to trigger fresh checks
    for (const providerId of this.providers.keys()) {
      this.router.updateProviderHealth(providerId, {
        status: 'offline',
        lastCheck: new Date(0)
      });
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats() {
    return this.router.getRoutingStats();
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(providerId: string) {
    return this.router.getProviderCapabilities(providerId);
  }

  /**
   * Get best providers for a specific capability
   */
  getBestProvidersForCapability(capabilityType: string) {
    return this.router.getBestProvidersForCapability(capabilityType);
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics(): GlobalCacheMetrics {
    return globalCacheManager.getGlobalMetrics();
  }

  /**
   * Clear cache with optional criteria
   */
  clearCache(criteria?: {
    policy?: string;
    olderThan?: number;
    providerId?: string;
    pattern?: RegExp;
  }): { policy: string; removed: number }[] {
    return globalCacheManager.clear(criteria);
  }

  /**
   * Optimize cache performance
   */
  optimizeCache(): { policy: string; removed: number; sizeSaved: number }[] {
    return globalCacheManager.optimizeAll();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return globalCacheManager.getStats();
  }

  /**
   * Enable or disable caching
   */
  setCachingEnabled(enabled: boolean): void {
    this.config.enableCaching = enabled;
  }

  /**
   * Set cache policy
   */
  setCachePolicy(policy: string): void {
    this.config.cachePolicy = policy;
  }

  /**
   * Private helper methods
   */
  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0
    };
  }

  private getAverageResponseTime(): number {
    if (this.metrics.successfulRequests === 0) return 0;
    return this.metrics.totalResponseTime / this.metrics.successfulRequests;
  }

  private validateConfiguration(): boolean {
    // Basic configuration validation
    return this.providers.size > 0 && this.router.getAvailableProviders().length > 0;
  }
}

// Singleton instance
export const unifiedAIService = new UnifiedAIService();