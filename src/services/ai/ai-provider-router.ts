/**
 * Multi-Provider AI Service Router
 * Intelligent routing between multiple AI providers with priority-based selection
 */

import type { 
  AIMessage, 
  AIModelConfig, 
  AIStreamChunk,
  TokenUsage 
} from '../../types/ai-tutor';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'edge-function' | 'direct-api';
  endpoint: string;
  models: string[];
  capabilities: AIProviderCapability[];
  priority: number;
  rateLimit: RateLimitConfig;
  healthCheck?: {
    endpoint: string;
    timeout: number;
  };
  authentication: {
    type: 'bearer' | 'api-key' | 'oauth';
    keyName?: string;
  };
}

export interface AIProviderCapability {
  type: 'text-generation' | 'code-generation' | 'reasoning' | 'creative-writing' | 'math' | 'streaming';
  quality: 'low' | 'medium' | 'high' | 'excellent';
  speed: 'slow' | 'medium' | 'fast' | 'very-fast';
  costTier: 'free' | 'low' | 'medium' | 'high';
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute?: number;
  tokensPerHour?: number;
  burstLimit?: number;
}

export interface ProviderHealth {
  id: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime: number;
  errorRate: number;
  lastSuccess: Date;
  lastCheck: Date;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  availableModels: string[];
}

export interface AIRequest {
  messages: AIMessage[];
  modelConfig: AIModelConfig;
  requestId: string;
  priority?: 'low' | 'normal' | 'high';
  requiredCapabilities?: string[];
  preferredProvider?: string;
  fallbackChain?: string[];
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface AIResponse {
  id: string;
  content: string;
  usage?: TokenUsage;
  model: string;
  providerId: string;
  cached: boolean;
  processingTime: number;
  requestId: string;
  fallbackUsed?: boolean;
  metadata?: {
    responseType: string;
    difficulty: string;
    estimatedReadTime: number;
  };
}

export interface ProviderSelectionCriteria {
  requiredCapabilities?: string[];
  preferredSpeed?: 'slow' | 'medium' | 'fast' | 'very-fast';
  maxCostTier?: 'free' | 'low' | 'medium' | 'high';
  excludeProviders?: string[];
  requireStreaming?: boolean;
}

export class AIProviderRouter {
  private providers: Map<string, AIProviderConfig> = new Map();
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private fallbackChains: Map<string, string[]> = new Map();
  private defaultFallbackChain: string[] = [];

  constructor() {
    this.initializeDefaultProviders();
    this.setupHealthMonitoring();
  }

  /**
   * Initialize default AI providers with their configurations
   */
  private initializeDefaultProviders(): void {
    // DeepSeek Provider
    this.addProvider({
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'direct-api',
      endpoint: 'https://api.deepseek.com',
      models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
      capabilities: [
        { type: 'text-generation', quality: 'high', speed: 'fast', costTier: 'low' },
        { type: 'code-generation', quality: 'excellent', speed: 'fast', costTier: 'low' },
        { type: 'reasoning', quality: 'excellent', speed: 'medium', costTier: 'low' },
        { type: 'streaming', quality: 'high', speed: 'fast', costTier: 'low' }
      ],
      priority: 1,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        tokensPerMinute: 100000,
        burstLimit: 10
      },
      healthCheck: {
        endpoint: '/v1/models',
        timeout: 5000
      },
      authentication: {
        type: 'bearer',
        keyName: 'VITE_DEEPSEEK_API_KEY'
      }
    });

    // Edge Function Professional Provider
    this.addProvider({
      id: 'edge-function-professional',
      name: 'Professional AI (Edge Function)',
      type: 'edge-function',
      endpoint: '/functions/v1/ai-tutor-professional',
      models: ['gpt-4', 'claude-3-sonnet', 'gemini-pro'],
      capabilities: [
        { type: 'text-generation', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'reasoning', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'creative-writing', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'streaming', quality: 'excellent', speed: 'medium', costTier: 'high' }
      ],
      priority: 2,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        burstLimit: 5
      },
      authentication: {
        type: 'bearer'
      }
    });

    // OpenAI Provider
    this.addProvider({
      id: 'openai',
      name: 'OpenAI',
      type: 'direct-api',
      endpoint: 'https://api.openai.com',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      capabilities: [
        { type: 'text-generation', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'code-generation', quality: 'high', speed: 'medium', costTier: 'high' },
        { type: 'reasoning', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'creative-writing', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'streaming', quality: 'excellent', speed: 'medium', costTier: 'high' }
      ],
      priority: 3,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        tokensPerMinute: 90000,
        burstLimit: 10
      },
      healthCheck: {
        endpoint: '/v1/models',
        timeout: 5000
      },
      authentication: {
        type: 'bearer',
        keyName: 'VITE_OPENAI_API_KEY'
      }
    });

    // Anthropic Claude Provider
    this.addProvider({
      id: 'anthropic',
      name: 'Anthropic Claude',
      type: 'direct-api',
      endpoint: 'https://api.anthropic.com',
      models: ['claude-3-sonnet', 'claude-3-haiku', 'claude-3-opus'],
      capabilities: [
        { type: 'text-generation', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'reasoning', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'creative-writing', quality: 'excellent', speed: 'medium', costTier: 'high' },
        { type: 'code-generation', quality: 'high', speed: 'medium', costTier: 'high' },
        { type: 'streaming', quality: 'excellent', speed: 'medium', costTier: 'high' }
      ],
      priority: 4,
      rateLimit: {
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        tokensPerMinute: 80000,
        burstLimit: 8
      },
      healthCheck: {
        endpoint: '/v1/messages',
        timeout: 5000
      },
      authentication: {
        type: 'api-key',
        keyName: 'VITE_ANTHROPIC_API_KEY'
      }
    });

    // Google Gemini Provider
    this.addProvider({
      id: 'gemini',
      name: 'Google Gemini',
      type: 'direct-api',
      endpoint: 'https://generativelanguage.googleapis.com',
      models: ['gemini-pro', 'gemini-pro-vision'],
      capabilities: [
        { type: 'text-generation', quality: 'high', speed: 'fast', costTier: 'medium' },
        { type: 'reasoning', quality: 'high', speed: 'fast', costTier: 'medium' },
        { type: 'creative-writing', quality: 'high', speed: 'fast', costTier: 'medium' },
        { type: 'streaming', quality: 'high', speed: 'fast', costTier: 'medium' }
      ],
      priority: 5,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1500,
        burstLimit: 15
      },
      healthCheck: {
        endpoint: '/v1/models',
        timeout: 5000
      },
      authentication: {
        type: 'api-key',
        keyName: 'VITE_GEMINI_API_KEY'
      }
    });

    // Set up default fallback chain based on priority
    this.defaultFallbackChain = ['deepseek', 'edge-function-professional', 'openai', 'anthropic', 'gemini'];
  }

  /**
   * Add a new AI provider to the router
   */
  addProvider(config: AIProviderConfig): void {
    this.providers.set(config.id, config);
    
    // Initialize health status
    this.providerHealth.set(config.id, {
      id: config.id,
      status: 'offline',
      responseTime: 0,
      errorRate: 0,
      lastSuccess: new Date(0),
      lastCheck: new Date(0),
      circuitBreakerState: 'closed',
      availableModels: config.models
    });
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get providers that match specific capabilities
   */
  getProvidersWithCapabilities(requiredCapabilities: string[]): AIProviderConfig[] {
    return this.getAvailableProviders().filter(provider => {
      return requiredCapabilities.every(required => 
        provider.capabilities.some(cap => cap.type === required)
      );
    });
  }

  /**
   * Select the best provider based on criteria and health status
   */
  selectProvider(criteria: ProviderSelectionCriteria = {}): AIProviderConfig | null {
    let candidates = this.getAvailableProviders();

    // Filter by required capabilities
    if (criteria.requiredCapabilities?.length) {
      candidates = candidates.filter(provider => 
        criteria.requiredCapabilities!.every(required => 
          provider.capabilities.some(cap => cap.type === required)
        )
      );
    }

    // Filter by streaming requirement
    if (criteria.requireStreaming) {
      candidates = candidates.filter(provider =>
        provider.capabilities.some(cap => cap.type === 'streaming')
      );
    }

    // Filter by cost tier
    if (criteria.maxCostTier) {
      const costOrder = ['free', 'low', 'medium', 'high'];
      const maxCostIndex = costOrder.indexOf(criteria.maxCostTier);
      
      candidates = candidates.filter(provider =>
        provider.capabilities.some(cap => 
          costOrder.indexOf(cap.costTier) <= maxCostIndex
        )
      );
    }

    // Exclude specific providers
    if (criteria.excludeProviders?.length) {
      candidates = candidates.filter(provider =>
        !criteria.excludeProviders!.includes(provider.id)
      );
    }

    // Filter by health status - only include healthy providers
    candidates = candidates.filter(provider => {
      const health = this.providerHealth.get(provider.id);
      return health?.status === 'online' || health?.status === 'degraded';
    });

    if (candidates.length === 0) {
      return null;
    }

    // Score providers based on multiple factors
    const scoredProviders = candidates.map(provider => {
      const health = this.providerHealth.get(provider.id)!;
      let score = 0;

      // Priority score (lower priority number = higher score)
      score += (10 - provider.priority) * 10;

      // Health score
      if (health.status === 'online') score += 20;
      else if (health.status === 'degraded') score += 10;

      // Response time score (faster = better)
      if (health.responseTime > 0) {
        score += Math.max(0, 20 - (health.responseTime / 100));
      }

      // Error rate score (lower error rate = better)
      score += Math.max(0, 20 - (health.errorRate * 20));

      // Speed preference score
      if (criteria.preferredSpeed) {
        const speedMatch = provider.capabilities.find(cap => 
          cap.speed === criteria.preferredSpeed
        );
        if (speedMatch) score += 15;
      }

      return { provider, score };
    });

    // Sort by score and return the best provider
    scoredProviders.sort((a, b) => b.score - a.score);
    return scoredProviders[0].provider;
  }

  /**
   * Get fallback chain for a specific provider or use default
   */
  getFallbackChain(providerId?: string): string[] {
    if (providerId && this.fallbackChains.has(providerId)) {
      return this.fallbackChains.get(providerId)!;
    }
    return this.defaultFallbackChain;
  }

  /**
   * Set custom fallback chain for a provider
   */
  setFallbackChain(providerId: string, chain: string[]): void {
    this.fallbackChains.set(providerId, chain);
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerId: string): ProviderHealth | null {
    return this.providerHealth.get(providerId) || null;
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): ProviderHealth[] {
    return Array.from(this.providerHealth.values());
  }

  /**
   * Update provider health status
   */
  updateProviderHealth(providerId: string, update: Partial<ProviderHealth>): void {
    const current = this.providerHealth.get(providerId);
    if (current) {
      this.providerHealth.set(providerId, {
        ...current,
        ...update,
        lastCheck: new Date()
      });
    }
  }

  /**
   * Check if a provider is available for requests
   */
  isProviderAvailable(providerId: string): boolean {
    const health = this.providerHealth.get(providerId);
    return health?.status === 'online' || health?.status === 'degraded';
  }

  /**
   * Get provider configuration by ID
   */
  getProvider(providerId: string): AIProviderConfig | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Setup health monitoring for all providers
   */
  private setupHealthMonitoring(): void {
    // Initial health check for all providers
    this.performHealthChecks();

    // Set up periodic health checks every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const providers = Array.from(this.providers.values());
    
    await Promise.allSettled(
      providers.map(provider => this.checkProviderHealth(provider))
    );
  }

  /**
   * Check health of a specific provider
   */
  private async checkProviderHealth(provider: AIProviderConfig): Promise<void> {
    const startTime = performance.now();
    
    try {
      if (!provider.healthCheck) {
        // If no health check endpoint, assume online if we have API key
        const hasApiKey = this.hasValidApiKey(provider);
        this.updateProviderHealth(provider.id, {
          status: hasApiKey ? 'online' : 'offline',
          responseTime: 0,
          lastCheck: new Date()
        });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), provider.healthCheck.timeout);

      const response = await fetch(`${provider.endpoint}${provider.healthCheck.endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(provider),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      if (response.ok) {
        this.updateProviderHealth(provider.id, {
          status: 'online',
          responseTime,
          lastSuccess: new Date()
        });
      } else {
        this.updateProviderHealth(provider.id, {
          status: 'degraded',
          responseTime
        });
      }

    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.updateProviderHealth(provider.id, {
        status: 'offline',
        responseTime
      });
    }
  }

  /**
   * Check if provider has valid API key
   */
  private hasValidApiKey(provider: AIProviderConfig): boolean {
    if (!provider.authentication.keyName) {
      return true; // Edge functions don't need API keys
    }
    
    const apiKey = import.meta.env[provider.authentication.keyName];
    return !!apiKey && apiKey.length > 0;
  }

  /**
   * Get authentication headers for a provider
   */
  private getAuthHeaders(provider: AIProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    if (provider.authentication.keyName) {
      const apiKey = import.meta.env[provider.authentication.keyName];
      
      if (apiKey) {
        if (provider.authentication.type === 'bearer') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        } else if (provider.authentication.type === 'api-key') {
          headers['x-api-key'] = apiKey;
        }
      }
    }

    return headers;
  }

  /**
   * Get provider capabilities summary
   */
  getProviderCapabilities(providerId: string): AIProviderCapability[] {
    const provider = this.providers.get(providerId);
    return provider?.capabilities || [];
  }

  /**
   * Find providers that excel at specific capability types
   */
  getBestProvidersForCapability(capabilityType: string): AIProviderConfig[] {
    return this.getAvailableProviders()
      .filter(provider => 
        provider.capabilities.some(cap => 
          cap.type === capabilityType && 
          (cap.quality === 'high' || cap.quality === 'excellent')
        )
      )
      .sort((a, b) => {
        const aCapability = a.capabilities.find(cap => cap.type === capabilityType);
        const bCapability = b.capabilities.find(cap => cap.type === capabilityType);
        
        const qualityOrder = ['low', 'medium', 'high', 'excellent'];
        const aQuality = qualityOrder.indexOf(aCapability?.quality || 'low');
        const bQuality = qualityOrder.indexOf(bCapability?.quality || 'low');
        
        return bQuality - aQuality; // Higher quality first
      });
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalProviders: number;
    onlineProviders: number;
    degradedProviders: number;
    offlineProviders: number;
    averageResponseTime: number;
  } {
    const healthStatuses = Array.from(this.providerHealth.values());
    
    const onlineCount = healthStatuses.filter(h => h.status === 'online').length;
    const degradedCount = healthStatuses.filter(h => h.status === 'degraded').length;
    const offlineCount = healthStatuses.filter(h => h.status === 'offline').length;
    
    const avgResponseTime = healthStatuses.reduce((sum, h) => sum + h.responseTime, 0) / healthStatuses.length;

    return {
      totalProviders: this.providers.size,
      onlineProviders: onlineCount,
      degradedProviders: degradedCount,
      offlineProviders: offlineCount,
      averageResponseTime: avgResponseTime
    };
  }
}

// Singleton instance
export const aiProviderRouter = new AIProviderRouter();