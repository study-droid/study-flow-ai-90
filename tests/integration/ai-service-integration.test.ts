/**
 * AI Service Integration Tests
 * End-to-end integration tests for AI service flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIProviderRouter } from '@/services/ai/ai-provider-router';
import { EnhancedCircuitBreaker, CircuitBreakerState } from '@/services/reliability/enhanced-circuit-breaker';
import { performanceMetrics } from '@/services/monitoring/performance-metrics';
import { inputValidator } from '@/services/security/input-validator';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_DEEPSEEK_API_KEY: 'test-deepseek-key',
    VITE_OPENAI_API_KEY: 'test-openai-key',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key'
  }
}));

// Mock logger
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock audit logger
vi.mock('@/services/security/audit-logger', () => ({
  auditLogger: {
    logSecurityEvent: vi.fn()
  }
}));

describe('AI Service Integration Tests', () => {
  let router: AIProviderRouter;
  let circuitBreaker: EnhancedCircuitBreaker;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockFetch = vi.mocked(fetch);
    router = new AIProviderRouter();
    
    circuitBreaker = new EnhancedCircuitBreaker('test-ai-service', {
      failureThreshold: 3,
      timeout: 1000,
      successThreshold: 2,
      monitoringPeriod: 5000,
      exponentialBackoffMultiplier: 2,
      maxTimeout: 10000,
      healthCheckInterval: 5000,
      automaticRecovery: true
    });
  });

  afterEach(() => {
    circuitBreaker.destroy();
    vi.useRealTimers();
  });

  describe('Complete AI Request Flow', () => {
    it('should handle successful AI request with all components', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'This is a helpful response from the AI.'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25
          }
        })
      } as Response);

      // Validate input message
      const inputMessage = {
        content: 'What is machine learning?',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      const validationResult = inputValidator.validateAIMessage(inputMessage);
      expect(validationResult.isValid).toBe(true);

      // Select provider
      const provider = router.selectProvider({
        requiredCapabilities: ['text-generation'],
        requireStreaming: false
      });
      expect(provider).toBeDefined();

      // Execute through circuit breaker with performance tracking
      const aiRequest = async () => {
        const response = await fetch(`${provider!.endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: provider!.models[0],
            messages: [inputMessage],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        return response.json();
      };

      const result = await performanceMetrics.trackAPICall(
        'ai-request',
        () => circuitBreaker.execute(aiRequest)
      );

      expect(result.choices[0].message.content).toBe('This is a helpful response from the AI.');
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.isHealthy).toBe(true);
    });

    it('should handle provider fallback on failure', async () => {
      // Mock first provider failure
      mockFetch
        .mockRejectedValueOnce(new Error('Primary provider failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Response from fallback provider'
              }
            }]
          })
        } as Response);

      const inputMessage = {
        content: 'Test message',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      // Validate input
      const validationResult = inputValidator.validateAIMessage(inputMessage);
      expect(validationResult.isValid).toBe(true);

      // Get fallback chain
      const fallbackChain = router.getFallbackChain();
      expect(fallbackChain.length).toBeGreaterThan(1);

      let result;
      let lastError;

      // Try providers in fallback chain
      for (const providerId of fallbackChain) {
        const provider = router.getProvider(providerId);
        if (!provider || !router.isProviderAvailable(providerId)) {
          continue;
        }

        try {
          const aiRequest = async () => {
            const response = await fetch(`${provider.endpoint}/v1/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: provider.models[0],
                messages: [inputMessage]
              })
            });

            if (!response.ok) {
              throw new Error(`Provider ${providerId} failed`);
            }

            return response.json();
          };

          result = await circuitBreaker.execute(aiRequest);
          break;
        } catch (error) {
          lastError = error;
          // Update provider health
          router.updateProviderHealth(providerId, {
            status: 'offline',
            errorRate: 1.0
          });
          continue;
        }
      }

      expect(result).toBeDefined();
      expect(result.choices[0].message.content).toBe('Response from fallback provider');
    });

    it('should handle circuit breaker opening and recovery', async () => {
      // Mock consistent failures to open circuit breaker
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const inputMessage = {
        content: 'Test message',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      const aiRequest = async () => {
        const response = await fetch('/api/ai', {
          method: 'POST',
          body: JSON.stringify({ message: inputMessage })
        });
        
        if (!response.ok) {
          throw new Error('API failed');
        }
        
        return response.json();
      };

      // Fail enough times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(aiRequest)).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next call should fail fast
      await expect(circuitBreaker.execute(aiRequest)).rejects.toThrow('Circuit breaker is OPEN');

      // Advance time to allow recovery attempt
      vi.advanceTimersByTime(1100);

      // Mock successful response for recovery
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      // Should transition to HALF_OPEN and then CLOSED on success
      const result = await circuitBreaker.execute(aiRequest);
      expect(result.success).toBe(true);
    });

    it('should validate and sanitize malicious input', async () => {
      const maliciousMessage = {
        content: 'Tell me about <script>alert("xss")</script> security',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      const validationResult = inputValidator.validateAIMessage(maliciousMessage);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.includes('malicious content'))).toBe(true);

      // Should not proceed with invalid input
      expect(validationResult.data).toBeUndefined();
    });

    it('should track performance metrics throughout the flow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'AI response' } }]
        })
      } as Response);

      const inputMessage = {
        content: 'Valid test message',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      // Track the entire flow
      await performanceMetrics.trackAPICall('complete-ai-flow', async () => {
        // Validate input
        const validation = inputValidator.validateAIMessage(inputMessage);
        if (!validation.isValid) {
          throw new Error('Invalid input');
        }

        // Select provider
        const provider = router.selectProvider();
        if (!provider) {
          throw new Error('No provider available');
        }

        // Execute request
        const response = await fetch(`${provider.endpoint}/api`, {
          method: 'POST',
          body: JSON.stringify(inputMessage)
        });

        return response.json();
      });

      const metrics = performanceMetrics.getMetricsSummary();
      expect(metrics.totalMetrics).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Provider Health Integration', () => {
    it('should update provider health based on request outcomes', async () => {
      const providerId = 'deepseek';
      
      // Mock successful request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      } as Response);

      const provider = router.getProvider(providerId);
      expect(provider).toBeDefined();

      // Simulate successful request
      const startTime = performance.now();
      await fetch(`${provider!.endpoint}/test`);
      const responseTime = performance.now() - startTime;

      router.updateProviderHealth(providerId, {
        status: 'online',
        responseTime,
        lastSuccess: new Date(),
        errorRate: 0
      });

      const health = router.getProviderHealth(providerId);
      expect(health?.status).toBe('online');
      expect(health?.responseTime).toBe(responseTime);
      expect(health?.errorRate).toBe(0);
    });

    it('should handle provider degradation gracefully', async () => {
      const providerId = 'openai';
      
      // Simulate degraded performance
      router.updateProviderHealth(providerId, {
        status: 'degraded',
        responseTime: 5000, // Slow response
        errorRate: 0.3 // 30% error rate
      });

      // Provider should still be available but with lower priority
      expect(router.isProviderAvailable(providerId)).toBe(true);

      const provider = router.selectProvider();
      // Should prefer healthier providers
      expect(provider?.id).not.toBe(providerId);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from temporary network issues', async () => {
      // Mock network failure followed by success
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recovered: true })
        } as Response);

      const aiRequest = async () => {
        const response = await fetch('/api/ai');
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      };

      // First two attempts should fail
      await expect(circuitBreaker.execute(aiRequest)).rejects.toThrow();
      await expect(circuitBreaker.execute(aiRequest)).rejects.toThrow();

      // Third attempt should succeed
      const result = await circuitBreaker.execute(aiRequest);
      expect(result.recovered).toBe(true);

      // Circuit should remain closed
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      // Mock rate limit responses
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response);

      const aiRequest = async () => {
        const response = await fetch('/api/ai');
        if (response.status === 429) {
          throw new Error('Rate limited');
        }
        if (!response.ok) {
          throw new Error('Request failed');
        }
        return response.json();
      };

      // First request should fail with rate limit
      await expect(circuitBreaker.execute(aiRequest)).rejects.toThrow('Rate limited');

      // Advance time to simulate backoff
      vi.advanceTimersByTime(1000);

      // Second request should succeed
      const result = await circuitBreaker.execute(aiRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('Security Integration', () => {
    it('should prevent injection attacks throughout the flow', async () => {
      const maliciousInputs = [
        'Normal text <script>alert("xss")</script>',
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'Tell me about onload=alert(1) security'
      ];

      for (const maliciousContent of maliciousInputs) {
        const message = {
          content: maliciousContent,
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          role: 'user' as const
        };

        const validation = inputValidator.validateAIMessage(message);
        expect(validation.isValid).toBe(false);
        
        // Should not proceed with malicious input
        expect(validation.errors.some(e => 
          e.includes('malicious content') || e.includes('Invalid')
        )).toBe(true);
      }
    });

    it('should sanitize output before returning to user', async () => {
      // Mock AI response with potentially dangerous content
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'Here is some code: <script>alert("from ai")</script>'
            }
          }]
        })
      } as Response);

      const validMessage = {
        content: 'Show me some JavaScript code',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      const validation = inputValidator.validateAIMessage(validMessage);
      expect(validation.isValid).toBe(true);

      const response = await fetch('/api/ai');
      const data = await response.json();
      
      // Sanitize the AI response
      const sanitizedContent = inputValidator.sanitizeHtml(
        data.choices[0].message.content
      );

      expect(sanitizedContent).not.toContain('<script>');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ message: { content: 'Response' } }] 
        })
      } as Response);

      const validMessage = {
        content: 'Test concurrent request',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user' as const
      };

      const aiRequest = async () => {
        const response = await fetch('/api/ai', {
          method: 'POST',
          body: JSON.stringify(validMessage)
        });
        return response.json();
      };

      // Execute multiple concurrent requests
      const concurrentRequests = Array(10).fill(null).map(() =>
        performanceMetrics.trackAPICall(
          'concurrent-test',
          () => circuitBreaker.execute(aiRequest)
        )
      );

      const results = await Promise.all(concurrentRequests);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.choices[0].message.content === 'Response')).toBe(true);

      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.totalSuccesses).toBe(10);
      expect(stats.errorRate).toBe(0);
    });

    it('should maintain performance metrics accuracy under load', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);

      // Generate load
      const requests = Array(50).fill(null).map((_, i) =>
        performanceMetrics.trackAPICall(`load-test-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return { requestId: i };
        })
      );

      await Promise.all(requests);

      const metrics = performanceMetrics.getMetricsSummary();
      expect(metrics.totalMetrics).toBeGreaterThanOrEqual(50);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide comprehensive system health status', () => {
      // Update various provider health statuses
      router.updateProviderHealth('deepseek', { 
        status: 'online', 
        responseTime: 150,
        errorRate: 0.02
      });
      router.updateProviderHealth('openai', { 
        status: 'degraded', 
        responseTime: 800,
        errorRate: 0.15
      });
      router.updateProviderHealth('anthropic', { 
        status: 'offline',
        errorRate: 1.0
      });

      const routingStats = router.getRoutingStats();
      const circuitStats = circuitBreaker.getStats();
      const performanceStats = performanceMetrics.getMetricsSummary();

      expect(routingStats.onlineProviders).toBe(1);
      expect(routingStats.degradedProviders).toBe(1);
      expect(routingStats.offlineProviders).toBe(3);

      expect(circuitStats.state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitStats.isHealthy).toBe(true);

      expect(performanceStats).toHaveProperty('totalMetrics');
      expect(performanceStats).toHaveProperty('averageResponseTime');
      expect(performanceStats).toHaveProperty('errorRate');
    });

    it('should track end-to-end request tracing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ traced: true })
      } as Response);

      const requestId = 'trace-test-123';
      
      await performanceMetrics.trackAPICall('traced-request', async () => {
        // Simulate request with tracing
        performanceMetrics.recordMetric({
          type: 'api_call',
          value: 200,
          metadata: { 
            requestId,
            phase: 'validation'
          }
        });

        performanceMetrics.recordMetric({
          type: 'api_call',
          value: 150,
          metadata: { 
            requestId,
            phase: 'provider-selection'
          }
        });

        performanceMetrics.recordMetric({
          type: 'api_call',
          value: 500,
          metadata: { 
            requestId,
            phase: 'ai-request'
          }
        });

        return { requestId };
      });

      const exported = performanceMetrics.exportMetrics();
      const tracedMetrics = exported.performance.filter(m => 
        m.metadata?.requestId === requestId
      );

      expect(tracedMetrics).toHaveLength(4); // 3 manual + 1 from trackAPICall
    });
  });
});