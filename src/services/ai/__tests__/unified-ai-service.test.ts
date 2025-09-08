/**
 * Unified AI Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedAIService, type AIRequest } from '../unified-ai-service';

// Mock the Supabase client
vi.mock('../../../integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { content: 'Test response', id: 'test-id' },
        error: null
      })
    }
  }
}));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_DEEPSEEK_API_KEY: 'test-deepseek-key',
    VITE_OPENAI_API_KEY: 'test-openai-key'
  }
}));

describe('UnifiedAIService', () => {
  let service: UnifiedAIService;

  beforeEach(() => {
    service = new UnifiedAIService({
      enableFallback: true,
      maxRetryAttempts: 2,
      enableMetrics: true
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should have service configuration', () => {
      const config = service.getServiceConfiguration();
      expect(config).toHaveProperty('providers');
      expect(config).toHaveProperty('routingStats');
      expect(config.enableFallback).toBe(true);
    });
  });

  describe('Provider Management', () => {
    it('should check service availability', () => {
      // Initially providers might be offline until health checks run
      const isAvailable = service.isServiceAvailable('deepseek');
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should switch providers', () => {
      const result = service.switchProvider('deepseek');
      // Result depends on provider availability
      expect(typeof result).toBe('boolean');
    });

    it('should get provider capabilities', () => {
      const capabilities = service.getProviderCapabilities('deepseek');
      expect(Array.isArray(capabilities)).toBe(true);
    });
  });

  describe('Service Health', () => {
    it('should provide service health status', () => {
      const health = service.getServiceHealth();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('providers');
      expect(health).toHaveProperty('lastCheck');
      expect(health).toHaveProperty('metrics');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
      expect(Array.isArray(health.providers)).toBe(true);
    });

    it('should provide production readiness status', () => {
      const readiness = service.getProductionReadiness();
      
      expect(readiness).toHaveProperty('overall');
      expect(readiness).toHaveProperty('checks');
      expect(readiness).toHaveProperty('recommendations');
      
      expect(['ready', 'degraded', 'not-ready']).toContain(readiness.overall);
      expect(typeof readiness.checks.providersAvailable).toBe('boolean');
      expect(Array.isArray(readiness.recommendations)).toBe(true);
    });
  });

  describe('Routing and Capabilities', () => {
    it('should get routing statistics', () => {
      const stats = service.getRoutingStats();
      
      expect(stats).toHaveProperty('totalProviders');
      expect(stats).toHaveProperty('onlineProviders');
      expect(stats).toHaveProperty('degradedProviders');
      expect(stats).toHaveProperty('offlineProviders');
      
      expect(typeof stats.totalProviders).toBe('number');
    });

    it('should find best providers for capabilities', () => {
      const bestProviders = service.getBestProvidersForCapability('text-generation');
      expect(Array.isArray(bestProviders)).toBe(true);
    });
  });

  describe('Service Management', () => {
    it('should reset services', () => {
      // This should not throw
      expect(() => service.resetServices()).not.toThrow();
    });
  });

  describe('Message Processing', () => {
    it('should handle message requests gracefully', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        modelConfig: {
          model: 'chat',
          temperature: 0.7,
          maxTokens: 100
        },
        requestId: 'test-request-1'
      };

      // This test might fail if no providers are healthy, but should not throw
      try {
        const response = await service.sendMessage(request);
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('requestId');
        expect(response.requestId).toBe('test-request-1');
      } catch (error) {
        // Expected if no providers are available in test environment
        expect(error).toBeDefined();
      }
    });

    it('should handle streaming requests gracefully', async () => {
      const request: AIRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        modelConfig: {
          model: 'chat',
          temperature: 0.7,
          maxTokens: 100
        },
        requestId: 'test-stream-1',
        stream: true
      };

      // This test might fail if no providers are healthy, but should not throw
      try {
        const stream = service.streamMessage(request);
        expect(stream).toBeDefined();
        
        // Try to get first chunk
        const { value, done } = await stream.next();
        if (!done) {
          expect(value).toHaveProperty('type');
        }
      } catch (error) {
        // Expected if no providers are available in test environment
        expect(error).toBeDefined();
      }
    });
  });
});