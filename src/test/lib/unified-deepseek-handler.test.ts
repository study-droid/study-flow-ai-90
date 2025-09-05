/**
 * Tests for Unified DeepSeek Handler
 * Comprehensive testing of the production-ready DeepSeek API handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  UnifiedDeepSeekHandler, 
  callDeepSeek, 
  streamDeepSeek,
  getDeepSeekMetrics,
  performDeepSeekHealthCheck 
} from '../../lib/unified-deepseek-handler';
import type { DeepSeekRequest, DeepSeekConfig } from '../../lib/unified-deepseek-handler';

// Mock dependencies
vi.mock('../../lib/rateLimiter', () => ({
  allow: vi.fn(() => true),
  getBucketStatus: vi.fn(() => ({ tokens: 100, capacity: 100, priority: 'normal' }))
}));

vi.mock('../../lib/cache', () => ({
  globalAICache: {
    get: vi.fn(() => ({ hit: false, value: null })),
    set: vi.fn(() => true),
    getStats: vi.fn(() => ({
      size: 10,
      hitRate: 75,
      averageQuality: 85,
      compressionRatio: 0.7
    })),
    cleanup: vi.fn(() => 5)
  }
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UnifiedDeepSeekHandler', () => {
  let handler: UnifiedDeepSeekHandler;
  let mockRequest: DeepSeekRequest;

  beforeEach(() => {
    handler = new UnifiedDeepSeekHandler({
      apiKey: 'test-api-key',
      baseURL: 'https://test-api.deepseek.com',
      timeout: 5000,
      maxRetries: 2
    });

    mockRequest = {
      messages: [
        { role: 'user', content: 'Test question' }
      ],
      modelConfig: {
        model: 'chat',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        jsonMode: false
      },
      requestId: 'test-request-123',
      priority: 'normal',
      cacheKey: 'test-cache-key'
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultHandler = new UnifiedDeepSeekHandler();
      const config = defaultHandler.getConfig();
      
      expect(config.baseURL).toBe('https://api.deepseek.com');
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
      expect(config.enableRateLimit).toBe(true);
      expect(config.enableCircuitBreaker).toBe(true);
      expect(config.enableCaching).toBe(true);
    });

    it('should override default configuration', () => {
      const customConfig: DeepSeekConfig = {
        baseURL: 'https://custom.api.com',
        timeout: 10000,
        maxRetries: 1,
        enableRateLimit: false
      };

      const customHandler = new UnifiedDeepSeekHandler(customConfig);
      const config = customHandler.getConfig();

      expect(config.baseURL).toBe('https://custom.api.com');
      expect(config.timeout).toBe(10000);
      expect(config.maxRetries).toBe(1);
      expect(config.enableRateLimit).toBe(false);
    });

    it('should update configuration', () => {
      handler.updateConfig({ timeout: 15000, maxRetries: 5 });
      const config = handler.getConfig();
      
      expect(config.timeout).toBe(15000);
      expect(config.maxRetries).toBe(5);
    });
  });

  describe('Successful API Calls', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'response-123',
          model: 'deepseek-chat',
          choices: [{
            message: {
              content: 'This is a test response from DeepSeek.'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25
          }
        })
      });
    });

    it('should complete a successful request', async () => {
      const response = await handler.complete(mockRequest);

      expect(response.id).toBe('response-123');
      expect(response.content).toBe('This is a test response from DeepSeek.');
      expect(response.cached).toBe(false);
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 15,
        totalTokens: 25
      });
      expect(response.requestId).toBe('test-request-123');
    });

    it('should track metrics for successful requests', async () => {
      await handler.complete(mockRequest);
      
      const metrics = handler.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.totalTokensUsed).toBe(25);
    });

    it('should use correct model names', async () => {
      const requests = [
        { ...mockRequest, modelConfig: { ...mockRequest.modelConfig, model: 'chat' } },
        { ...mockRequest, modelConfig: { ...mockRequest.modelConfig, model: 'reasoning' } },
        { ...mockRequest, modelConfig: { ...mockRequest.modelConfig, model: 'code' } }
      ];

      for (const req of requests) {
        await handler.complete(req);
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);
      const calls = mockFetch.mock.calls;
      
      expect(JSON.parse(calls[0][1].body).model).toBe('deepseek-chat');
      expect(JSON.parse(calls[1][1].body).model).toBe('deepseek-reasoner');
      expect(JSON.parse(calls[2][1].body).model).toBe('deepseek-coder');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      });

      const response = await handler.complete(mockRequest);

      expect(response.content).toContain('I apologize, but I encountered an error');
      expect(response.cached).toBe(false);
      
      const metrics = handler.getMetrics();
      expect(metrics.failedRequests).toBe(1);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const response = await handler.complete(mockRequest);

      expect(response.content).toContain('I apologize, but I encountered an error');
      const metrics = handler.getMetrics();
      expect(metrics.failedRequests).toBeGreaterThan(0);
    });

    it('should validate JSON mode responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'response-123',
          model: 'deepseek-chat',
          choices: [{
            message: {
              content: 'This is not valid JSON'
            }
          }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
        })
      });

      const jsonModeRequest = {
        ...mockRequest,
        modelConfig: { ...mockRequest.modelConfig, jsonMode: true }
      };

      const response = await handler.complete(jsonModeRequest);
      expect(response.content).toContain('I apologize, but I encountered an error');
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failures', async () => {
      // Simulate multiple failures
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Make several failed requests to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await handler.complete(mockRequest);
      }

      const circuitStatus = handler.getCircuitBreakerStatus();
      expect(circuitStatus.failureCount).toBeGreaterThan(0);
    });

    it('should block requests when circuit breaker is open', async () => {
      // First, cause failures to open the circuit breaker
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      
      for (let i = 0; i < 6; i++) {
        await handler.complete(mockRequest);
      }

      // Now the circuit breaker should be open
      const response = await handler.complete(mockRequest);
      expect(response.content).toContain('circuit breaker open');
      
      const metrics = handler.getMetrics();
      expect(metrics.circuitBreakerTrips).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const { allow } = await import('../../lib/rateLimiter');
      (allow as any).mockReturnValue(false);

      const response = await handler.complete(mockRequest);
      expect(response.content).toContain('Rate limit exceeded');
      
      const metrics = handler.getMetrics();
      expect(metrics.rateLimitHits).toBe(1);
    });

    it('should get rate limit status', () => {
      const status = handler.getRateLimitStatus('test-request-123');
      expect(status).toEqual({
        tokens: 100,
        capacity: 100,
        priority: 'normal'
      });
    });
  });

  describe('Caching', () => {
    it('should return cached responses when available', async () => {
      const { globalAICache } = await import('../../lib/cache');
      (globalAICache.get as any).mockReturnValue({
        hit: true,
        value: {
          formattedResponse: { content: 'Cached response' }
        }
      });

      const response = await handler.complete(mockRequest);
      
      expect(response.content).toBe('Cached response');
      expect(response.cached).toBe(true);
      
      const metrics = handler.getMetrics();
      expect(metrics.cachedRequests).toBe(1);
    });

    it('should skip caching when disabled', async () => {
      const noCacheHandler = new UnifiedDeepSeekHandler({
        enableCaching: false
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Fresh response' } }],
          usage: { total_tokens: 10 }
        })
      });

      const response = await noCacheHandler.complete(mockRequest);
      expect(response.cached).toBe(false);
    });
  });

  describe('Streaming', () => {
    it('should handle streaming responses', async () => {
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: {"usage":{"total_tokens":5}}\n',
        'data: [DONE]\n'
      ];

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamData[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamData[1]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamData[2]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(streamData[3]) })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn()
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: {
          getReader: () => mockReader
        }
      });

      const chunks = [];
      for await (const chunk of handler.stream(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3); // 2 content chunks + 1 done chunk
      expect(chunks[0]).toEqual({ type: 'content', content: 'Hello' });
      expect(chunks[1]).toEqual({ type: 'content', content: ' world' });
      expect(chunks[2].type).toBe('done');
    });

    it('should handle streaming errors', async () => {
      mockFetch.mockRejectedValue(new Error('Stream error'));

      const chunks = [];
      for await (const chunk of handler.stream(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].type).toBe('error');
      expect(chunks[0].error).toContain('Stream error');
    });
  });

  describe('Health Check', () => {
    it('should perform comprehensive health check', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: [] })
      });

      const health = await handler.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.apiKey).toBe(true);
      expect(health.details.apiConnectivity).toBe(true);
    });

    it('should detect unhealthy status', async () => {
      mockFetch.mockRejectedValue(new Error('API unreachable'));

      const health = await handler.healthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.details.apiConnectivity).toBe(false);
    });
  });

  describe('Convenience Functions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Response from convenience function' } }],
          usage: { total_tokens: 10 }
        })
      });
    });

    it('should call DeepSeek via convenience function', async () => {
      const response = await callDeepSeek(mockRequest);
      expect(response.content).toBe('Response from convenience function');
    });

    it('should stream DeepSeek via convenience function', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test"}}]}\n') })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: [DONE]\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn()
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      });

      const chunks = [];
      for await (const chunk of streamDeepSeek(mockRequest)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should get metrics via convenience function', () => {
      const metrics = getDeepSeekMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalRequests).toBe('number');
    });

    it('should perform health check via convenience function', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      
      const health = await performDeepSeekHealthCheck();
      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track comprehensive metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Metric test' } }],
          usage: { total_tokens: 20 }
        })
      });

      await handler.complete(mockRequest);
      await handler.complete(mockRequest);

      const metrics = handler.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.totalTokensUsed).toBe(40);
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      handler.resetMetrics();
      const metrics = handler.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageLatency).toBe(0);
    });
  });
});