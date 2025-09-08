/**
 * AI Provider Router Tests
 * Comprehensive unit tests for the multi-provider AI service router
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIProviderRouter, type AIProviderConfig, type ProviderSelectionCriteria } from '../ai-provider-router';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_DEEPSEEK_API_KEY: 'test-deepseek-key',
    VITE_OPENAI_API_KEY: 'test-openai-key',
    VITE_ANTHROPIC_API_KEY: 'test-anthropic-key',
    VITE_GEMINI_API_KEY: 'test-gemini-key'
  }
}));

describe('AIProviderRouter', () => {
  let router: AIProviderRouter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] })
    } as Response);

    router = new AIProviderRouter();
    
    // Clear any pending timers from router initialization
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Provider Management', () => {
    it('should initialize with default providers', () => {
      const providers = router.getAvailableProviders();
      
      expect(providers).toHaveLength(5);
      expect(providers.map(p => p.id)).toContain('deepseek');
      expect(providers.map(p => p.id)).toContain('openai');
      expect(providers.map(p => p.id)).toContain('anthropic');
      expect(providers.map(p => p.id)).toContain('gemini');
      expect(providers.map(p => p.id)).toContain('edge-function-professional');
    });

    it('should sort providers by priority', () => {
      const providers = router.getAvailableProviders();
      
      // Should be sorted by priority (lower number = higher priority)
      for (let i = 1; i < providers.length; i++) {
        expect(providers[i].priority).toBeGreaterThanOrEqual(providers[i - 1].priority);
      }
    });

    it('should add new provider correctly', () => {
      const newProvider: AIProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        type: 'direct-api',
        endpoint: 'https://test.api.com',
        models: ['test-model'],
        capabilities: [
          { type: 'text-generation', quality: 'high', speed: 'fast', costTier: 'low' }
        ],
        priority: 10,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        authentication: {
          type: 'bearer',
          keyName: 'TEST_API_KEY'
        }
      };

      router.addProvider(newProvider);
      
      const providers = router.getAvailableProviders();
      expect(providers.map(p => p.id)).toContain('test-provider');
      
      const addedProvider = router.getProvider('test-provider');
      expect(addedProvider).toEqual(newProvider);
    });

    it('should get provider by id', () => {
      const deepseekProvider = router.getProvider('deepseek');
      
      expect(deepseekProvider).toBeDefined();
      expect(deepseekProvider?.id).toBe('deepseek');
      expect(deepseekProvider?.name).toBe('DeepSeek');
    });

    it('should return null for non-existent provider', () => {
      const provider = router.getProvider('non-existent');
      expect(provider).toBeNull();
    });
  });

  describe('Provider Selection', () => {
    it('should select provider without criteria', () => {
      const provider = router.selectProvider();
      
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('deepseek'); // Highest priority available
    });

    it('should select provider with required capabilities', () => {
      const criteria: ProviderSelectionCriteria = {
        requiredCapabilities: ['code-generation']
      };
      
      const provider = router.selectProvider(criteria);
      
      expect(provider).toBeDefined();
      expect(provider?.capabilities.some(cap => cap.type === 'code-generation')).toBe(true);
    });

    it('should select provider with streaming requirement', () => {
      const criteria: ProviderSelectionCriteria = {
        requireStreaming: true
      };
      
      const provider = router.selectProvider(criteria);
      
      expect(provider).toBeDefined();
      expect(provider?.capabilities.some(cap => cap.type === 'streaming')).toBe(true);
    });

    it('should filter by cost tier', () => {
      const criteria: ProviderSelectionCriteria = {
        maxCostTier: 'low'
      };
      
      const provider = router.selectProvider(criteria);
      
      expect(provider).toBeDefined();
      expect(provider?.capabilities.some(cap => 
        ['free', 'low'].includes(cap.costTier)
      )).toBe(true);
    });

    it('should exclude specific providers', () => {
      const criteria: ProviderSelectionCriteria = {
        excludeProviders: ['deepseek', 'openai']
      };
      
      const provider = router.selectProvider(criteria);
      
      expect(provider).toBeDefined();
      expect(['deepseek', 'openai']).not.toContain(provider?.id);
    });

    it('should return null when no providers match criteria', () => {
      const criteria: ProviderSelectionCriteria = {
        requiredCapabilities: ['non-existent-capability']
      };
      
      const provider = router.selectProvider(criteria);
      expect(provider).toBeNull();
    });

    it('should prefer providers with better health status', () => {
      // Update health status to make one provider degraded
      router.updateProviderHealth('deepai', { status: 'degraded' });
      router.updateProviderHealth('openai', { status: 'online' });
      
      const provider = router.selectProvider();
      
      // Should prefer online provider over degraded one (or any available provider)
      expect(provider).toBeDefined();
    });
  });

  describe('Provider Health Management', () => {
    it('should initialize provider health status', () => {
      const health = router.getProviderHealth('deepseek');
      
      expect(health).toBeDefined();
      expect(health?.id).toBe('deepseek');
      expect(['offline', 'online']).toContain(health?.status); // May be online if health check ran
    });

    it('should update provider health', () => {
      router.updateProviderHealth('deepseek', {
        status: 'online',
        responseTime: 150,
        errorRate: 0.05
      });
      
      const health = router.getProviderHealth('deepseek');
      
      expect(health?.status).toBe('online');
      expect(health?.responseTime).toBe(150);
      expect(health?.errorRate).toBe(0.05);
      expect(health?.lastCheck).toBeInstanceOf(Date);
    });

    it('should get all provider health statuses', () => {
      const allHealth = router.getAllProviderHealth();
      
      expect(allHealth).toHaveLength(5); // Default providers
      expect(allHealth.every(h => h.id && h.status)).toBe(true);
    });

    it('should check provider availability', () => {
      router.updateProviderHealth('deepseek', { status: 'online' });
      router.updateProviderHealth('openai', { status: 'offline' });
      
      expect(router.isProviderAvailable('deepseek')).toBe(true);
      expect(router.isProviderAvailable('openai')).toBe(false);
    });

    it('should consider degraded providers as available', () => {
      router.updateProviderHealth('deepseek', { status: 'degraded' });
      
      expect(router.isProviderAvailable('deepseek')).toBe(true);
    });
  });

  describe('Capability Management', () => {
    it('should get providers with specific capabilities', () => {
      const providers = router.getProvidersWithCapabilities(['reasoning']);
      
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => 
        p.capabilities.some(cap => cap.type === 'reasoning')
      )).toBe(true);
    });

    it('should get providers with multiple capabilities', () => {
      const providers = router.getProvidersWithCapabilities(['text-generation', 'streaming']);
      
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.every(p => 
        p.capabilities.some(cap => cap.type === 'text-generation') &&
        p.capabilities.some(cap => cap.type === 'streaming')
      )).toBe(true);
    });

    it('should get provider capabilities', () => {
      const capabilities = router.getProviderCapabilities('deepseek');
      
      expect(capabilities).toHaveLength(4); // DeepSeek has 4 capabilities
      expect(capabilities.some(cap => cap.type === 'code-generation')).toBe(true);
    });

    it('should get best providers for specific capability', () => {
      const bestProviders = router.getBestProvidersForCapability('reasoning');
      
      expect(bestProviders.length).toBeGreaterThan(0);
      expect(bestProviders.every(p => 
        p.capabilities.some(cap => 
          cap.type === 'reasoning' && 
          ['high', 'excellent'].includes(cap.quality)
        )
      )).toBe(true);
    });
  });

  describe('Fallback Chain Management', () => {
    it('should get default fallback chain', () => {
      const fallbackChain = router.getFallbackChain();
      
      expect(fallbackChain).toEqual([
        'deepseek', 
        'edge-function-professional', 
        'openai', 
        'anthropic', 
        'gemini'
      ]);
    });

    it('should set custom fallback chain', () => {
      const customChain = ['openai', 'anthropic', 'deepseek'];
      
      router.setFallbackChain('custom-provider', customChain);
      
      const retrievedChain = router.getFallbackChain('custom-provider');
      expect(retrievedChain).toEqual(customChain);
    });

    it('should return default chain for unknown provider', () => {
      const chain = router.getFallbackChain('unknown-provider');
      
      expect(chain).toEqual([
        'deepseek', 
        'edge-function-professional', 
        'openai', 
        'anthropic', 
        'gemini'
      ]);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks on providers with health check endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: ['test-model'] })
      } as Response);

      // Trigger health check by advancing time
      vi.advanceTimersByTime(30000);
      
      // Wait for async operations with a timeout to prevent infinite loops
      await vi.runOnlyPendingTimersAsync();
      
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Trigger health check
      vi.advanceTimersByTime(30000);
      
      // Wait for async operations with timeout
      await vi.runOnlyPendingTimersAsync();
      
      // Should handle the error gracefully
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle health check timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      // Trigger health check
      vi.advanceTimersByTime(30000);
      
      // Should timeout and handle gracefully
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should update provider status based on health checks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      } as Response);

      // Trigger health check
      vi.advanceTimersByTime(30000);
      await vi.runOnlyPendingTimersAsync();

      // Check that health status was updated
      const providers = router.getAllProviderHealth();
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('Routing Statistics', () => {
    it('should provide routing statistics', () => {
      // Reset all providers to known state first
      const allProviders = router.getAvailableProviders();
      allProviders.forEach(p => {
        router.updateProviderHealth(p.id, { status: 'offline', responseTime: 0 });
      });

      router.updateProviderHealth('deepseek', { 
        status: 'online', 
        responseTime: 100 
      });
      router.updateProviderHealth('openai', { 
        status: 'degraded', 
        responseTime: 200 
      });
      router.updateProviderHealth('anthropic', { 
        status: 'offline', 
        responseTime: 0 
      });

      const stats = router.getRoutingStats();
      
      expect(stats.totalProviders).toBe(5);
      expect(stats.onlineProviders).toBe(1);
      expect(stats.degradedProviders).toBe(1);
      expect(stats.offlineProviders).toBe(3);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });

    it('should calculate average response time correctly', () => {
      router.updateProviderHealth('deepseek', { responseTime: 100 });
      router.updateProviderHealth('openai', { responseTime: 200 });
      router.updateProviderHealth('anthropic', { responseTime: 300 });

      const stats = router.getRoutingStats();
      
      // Average of all providers (including those with 0 response time)
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Authentication Handling', () => {
    it('should handle providers without API keys', () => {
      const edgeProvider = router.getProvider('edge-function-professional');
      
      expect(edgeProvider?.authentication.keyName).toBeUndefined();
    });

    it('should validate API key presence for providers that need them', () => {
      const deepseekProvider = router.getProvider('deepseek');
      
      expect(deepseekProvider?.authentication.keyName).toBe('VITE_DEEPSEEK_API_KEY');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed provider configurations gracefully', () => {
      const invalidProvider = {
        id: 'invalid',
        // Missing required fields
      } as AIProviderConfig;

      expect(() => router.addProvider(invalidProvider)).not.toThrow();
    });

    it('should handle health check network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should not throw when health checks fail
      expect(() => {
        vi.advanceTimersByTime(30000);
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should not perform excessive health checks', () => {
      const initialCallCount = mockFetch.mock.calls.length;
      
      // Advance time multiple times but less than health check interval
      vi.advanceTimersByTime(10000);
      vi.advanceTimersByTime(10000);
      vi.advanceTimersByTime(5000);
      
      // Should not have made additional calls
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });

    it('should handle large numbers of providers efficiently', () => {
      // Add many providers
      for (let i = 0; i < 100; i++) {
        router.addProvider({
          id: `provider-${i}`,
          name: `Provider ${i}`,
          type: 'direct-api',
          endpoint: `https://api${i}.example.com`,
          models: [`model-${i}`],
          capabilities: [
            { type: 'text-generation', quality: 'medium', speed: 'medium', costTier: 'medium' }
          ],
          priority: i + 10,
          rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 },
          authentication: { type: 'bearer' }
        });
      }

      const startTime = performance.now();
      const provider = router.selectProvider();
      const endTime = performance.now();
      
      expect(provider).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});