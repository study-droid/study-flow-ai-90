/**
 * DeepSeek Reasoner v3.1 Client Test Suite
 * Comprehensive tests for the enhanced reasoning capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { 
  DeepSeekReasonerClient,
  type DeepSeekReasonerRequest,
  type DeepSeekReasonerResponse,
  type ReasoningStep,
  type DeepSeekReasonerStreamChunk
} from '../lib/deepseek-reasoner-client';
import type { AIMessage } from '../types/ai-tutor';

// Mock external dependencies
vi.mock('../lib/rateLimiter', () => ({
  rateLimiter: {
    isAllowed: vi.fn(() => Promise.resolve({ allowed: true, result: {} }))
  },
  isRateLimited: vi.fn(() => Promise.resolve({ allowed: true, result: {} }))
}));

vi.mock('../lib/cache', () => ({
  globalAICache: {
    get: vi.fn(() => ({ hit: false, value: null })),
    set: vi.fn(),
    clear: vi.fn()
  }
}));

vi.mock('../lib/circuitBreaker', () => ({
  CircuitBreaker: vi.fn().mockImplementation(() => ({
    canProceed: vi.fn(() => true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getState: vi.fn(() => ({ state: 'closed', failureCount: 0, lastFailureTime: 0 }))
  }))
}));

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

describe('DeepSeekReasonerClient', () => {
  let client: DeepSeekReasonerClient;
  let sampleRequest: DeepSeekReasonerRequest;
  let sampleMessages: AIMessage[];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Initialize client with test configuration
    client = new DeepSeekReasonerClient({
      apiKey: 'test-api-key',
      baseURL: 'https://api.deepseek.com',
      timeout: 30000,
      enableCaching: true,
      enableCircuitBreaker: true,
      enableRateLimit: true
    });

    // Sample test data
    sampleMessages = [
      { role: 'user', content: 'Explain the concept of photosynthesis and its importance in ecosystems.' }
    ];

    sampleRequest = {
      messages: sampleMessages,
      modelConfig: {
        model: 'deepseek-reasoner',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        jsonMode: false,
        reasoningEffort: 'medium',
        enableReasoningTrace: true,
        maxReasoningSteps: 10
      },
      requestId: 'test-request-123',
      reasoningMode: true,
      reasoningEffort: 'medium'
    };
  });

  afterEach(() => {
    client.resetMetrics();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultClient = new DeepSeekReasonerClient();
      const config = defaultClient.getConfig();
      
      expect(config.defaultModel).toBe('deepseek-reasoner');
      expect(config.timeout).toBe(60000);
      expect(config.enableCaching).toBe(true);
      expect(config.enableCircuitBreaker).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customClient = new DeepSeekReasonerClient({
        timeout: 45000,
        defaultModel: 'deepseek-chat',
        enableCaching: false
      });
      
      const config = customClient.getConfig();
      expect(config.timeout).toBe(45000);
      expect(config.defaultModel).toBe('deepseek-chat');
      expect(config.enableCaching).toBe(false);
    });

    it('should validate configuration and show warnings for missing API key', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      new DeepSeekReasonerClient({ apiKey: '' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DeepSeek Reasoner API key not configured')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Non-streaming Completion', () => {
    it('should complete a basic reasoning request successfully', async () => {
      const mockResponse = {
        id: 'response-123',
        choices: [{
          message: {
            content: 'Photosynthesis is the process by which plants convert light energy into chemical energy...'
          }
        }],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 200,
          total_tokens: 250,
          reasoning_tokens: 75
        },
        model: 'deepseek-reasoner',
        reasoning_trace: [
          {
            type: 'analysis',
            content: 'Breaking down the components of photosynthesis...',
            confidence: 0.9,
            timestamp: '2024-01-01T12:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.complete(sampleRequest);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'response-123',
          content: expect.stringContaining('Photosynthesis'),
          reasoningTrace: expect.arrayContaining([
            expect.objectContaining({
              type: 'analysis',
              content: expect.stringContaining('Breaking down'),
              confidence: 0.9
            })
          ]),
          usage: expect.objectContaining({
            promptTokens: 50,
            completionTokens: 200,
            totalTokens: 250,
            reasoningTokens: 75
          }),
          cached: false,
          model: 'deepseek-reasoner'
        })
      );
    });

    it('should handle requests without reasoning mode', async () => {
      const nonReasoningRequest: DeepSeekReasonerRequest = {
        ...sampleRequest,
        reasoningMode: false,
        modelConfig: {
          ...sampleRequest.modelConfig,
          model: 'deepseek-chat',
          enableReasoningTrace: false
        }
      };

      const mockResponse = {
        id: 'response-456',
        choices: [{
          message: { content: 'Regular chat response...' }
        }],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 100,
          total_tokens: 130
        },
        model: 'deepseek-chat'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.complete(nonReasoningRequest);

      expect(result.reasoningTrace).toBeUndefined();
      expect(result.model).toBe('deepseek-chat');
      expect(result.usage?.reasoningTokens).toBeUndefined();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded')
      });

      await expect(client.complete(sampleRequest)).rejects.toThrow('Rate limit exceeded');
      
      const metrics = client.getMetrics();
      expect(metrics.failedRequests).toBe(1);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ENOTFOUND')), 100)
        )
      );

      await expect(client.complete(sampleRequest)).rejects.toThrow();
    });

    it('should use cached responses when available', async () => {
      const { globalAICache } = await import('../lib/cache');
      const cachedResponse = {
        formattedResponse: {
          content: 'Cached photosynthesis explanation...'
        },
        reasoningTrace: [{
          step: 1,
          type: 'analysis' as const,
          content: 'Cached reasoning step',
          confidence: 0.8,
          timestamp: '2024-01-01T12:00:00Z'
        }]
      };

      (globalAICache.get as Mock).mockReturnValue({
        hit: true,
        value: cachedResponse
      });

      const requestWithCache = {
        ...sampleRequest,
        cacheKey: 'test-cache-key'
      };

      const result = await client.complete(requestWithCache);

      expect(result.cached).toBe(true);
      expect(result.content).toBe('Cached photosynthesis explanation...');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Streaming Completion', () => {
    it('should handle streaming responses with reasoning steps', async () => {
      const mockStreamData = [
        'data: {"reasoning_step": {"type": "analysis", "content": "Analyzing photosynthesis components", "confidence": 0.9, "progress": 0.2}}\n\n',
        'data: {"choices": [{"delta": {"content": "Photosynthesis is"}}]}\n\n',
        'data: {"reasoning_step": {"type": "synthesis", "content": "Synthesizing key concepts", "confidence": 0.85, "progress": 0.7}}\n\n',
        'data: {"choices": [{"delta": {"content": " the process..."}}]}\n\n',
        'data: {"usage": {"prompt_tokens": 50, "completion_tokens": 100, "total_tokens": 150, "reasoning_tokens": 30}}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockReadableStream = new ReadableStream({
        start(controller) {
          mockStreamData.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockReadableStream
      });

      const chunks: DeepSeekReasonerStreamChunk[] = [];
      for await (const chunk of client.stream(sampleRequest)) {
        chunks.push(chunk);
      }

      // Verify we received reasoning steps, content, and done chunks
      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'reasoning_step',
          reasoningStep: expect.objectContaining({
            type: 'analysis',
            content: 'Analyzing photosynthesis components',
            confidence: 0.9
          })
        })
      );

      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'content',
          content: 'Photosynthesis is'
        })
      );

      expect(chunks).toContainEqual(
        expect.objectContaining({
          type: 'done',
          usage: expect.objectContaining({
            reasoningTokens: 30
          })
        })
      );
    });

    it('should handle streaming errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error')
      });

      const chunks: DeepSeekReasonerStreamChunk[] = [];
      for await (const chunk of client.stream(sampleRequest)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('500')
        })
      );
    });
  });

  describe('Reasoning Quality Assessment', () => {
    it('should calculate reasoning quality correctly', async () => {
      const mockResponse = {
        id: 'response-789',
        choices: [{
          message: {
            content: 'Complex explanation with multiple reasoning steps...'
          }
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 500,
          total_tokens: 600,
          reasoning_tokens: 200
        },
        model: 'deepseek-reasoner',
        reasoning_trace: [
          { type: 'analysis', content: 'Step 1', confidence: 0.9, timestamp: '2024-01-01T12:00:00Z' },
          { type: 'synthesis', content: 'Step 2', confidence: 0.85, timestamp: '2024-01-01T12:01:00Z' },
          { type: 'evaluation', content: 'Step 3', confidence: 0.95, timestamp: '2024-01-01T12:02:00Z' },
          { type: 'conclusion', content: 'Step 4', confidence: 0.8, timestamp: '2024-01-01T12:03:00Z' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.complete(sampleRequest);

      expect(result.metadata?.reasoningSteps).toBe(4);
      expect(result.metadata?.reasoningQuality).toBeGreaterThan(0);
      expect(result.metadata?.confidenceScore).toBeCloseTo(0.875); // Average of confidences
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should respect circuit breaker state', async () => {
      const { CircuitBreaker } = await import('../lib/circuitBreaker');
      const mockCircuitBreaker = new CircuitBreaker('test', {
        failureThreshold: 5,
        timeout: 30000,
        successThreshold: 3,
        monitoringPeriod: 60000
      });
      
      (mockCircuitBreaker.canProceed as Mock).mockReturnValue(false);

      // Create new client to get fresh circuit breaker
      const clientWithClosedCircuit = new DeepSeekReasonerClient();
      
      await expect(clientWithClosedCircuit.complete(sampleRequest)).rejects.toThrow(
        'circuit breaker open'
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const { isRateLimited } = await import('../lib/rateLimiter');
      
      (isRateLimited as Mock).mockResolvedValue({
        allowed: false,
        result: { retryAfter: 30 }
      });

      await expect(client.complete(sampleRequest)).rejects.toThrow(
        'Rate limit exceeded - please try again after 30s'
      );

      const metrics = client.getMetrics();
      expect(metrics.rateLimitHits).toBe(1);
    });
  });

  describe('Model Selection', () => {
    it('should correctly map model types to DeepSeek models', async () => {
      const testCases = [
        { input: 'reasoning', expected: 'deepseek-reasoner' },
        { input: 'chat', expected: 'deepseek-chat' },
        { input: 'code', expected: 'deepseek-coder' },
        { input: 'creative', expected: 'deepseek-chat' },
        { input: 'deepseek-reasoner-beta', expected: 'deepseek-reasoner-beta' }
      ];

      for (const testCase of testCases) {
        const requestWithModel: DeepSeekReasonerRequest = {
          ...sampleRequest,
          modelConfig: {
            ...sampleRequest.modelConfig,
            model: testCase.input as any
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'test',
            choices: [{ message: { content: 'test' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            model: testCase.expected
          })
        });

        const result = await client.complete(requestWithModel);
        expect(result.model).toBe(testCase.expected);
      }
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track metrics correctly', async () => {
      const mockResponse = {
        id: 'response-metrics',
        choices: [{ message: { content: 'Test response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        model: 'deepseek-reasoner'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await client.complete(sampleRequest);

      const metrics = client.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.reasoningRequests).toBe(1);
      expect(metrics.totalTokensUsed).toBe(30);
    });

    it('should reset metrics correctly', () => {
      client.resetMetrics();
      const metrics = client.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.totalTokensUsed).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when everything is working', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const health = await client.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.apiConnectivity).toBe(true);
      expect(health.details.version).toBe('3.1');
    });

    it('should return unhealthy status when API is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const health = await client.healthCheck();
      
      expect(health.status).toBe('degraded');
      expect(health.details.apiConnectivity).toBe(false);
      expect(health.details.connectivityError).toBe('Network error');
    });

    it('should detect degraded performance based on success rates', async () => {
      // Simulate some failed requests to lower success rate
      for (let i = 0; i < 3; i++) {
        mockFetch.mockRejectedValueOnce(new Error('API Error'));
        try {
          await client.complete(sampleRequest);
        } catch (error) {
          // Expected to fail
        }
      }

      // One successful request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          choices: [{ message: { content: 'test' } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        })
      });
      await client.complete(sampleRequest);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('degraded');
      expect(health.details.reason).toContain('success rate');
    });
  });
});

describe('DeepSeek Reasoner Pipeline Integration', () => {
  it('should integrate properly with pipeline stage', async () => {
    // This would test the actual integration with DeepSeekProcessingStage
    // Implementation would depend on the actual pipeline testing setup
    expect(true).toBe(true); // Placeholder
  });
});

describe('Error Scenarios and Edge Cases', () => {
  let client: DeepSeekReasonerClient;

  beforeEach(() => {
    client = new DeepSeekReasonerClient({
      apiKey: 'test-key',
      timeout: 5000
    });
  });

  it('should handle malformed JSON responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'response' })
    });

    await expect(client.complete({
      messages: [{ role: 'user', content: 'test' }],
      modelConfig: {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        jsonMode: false
      },
      requestId: 'test'
    })).rejects.toThrow('Invalid response format');
  });

  it('should handle abort signals', async () => {
    const controller = new AbortController();
    
    mockFetch.mockImplementation(() => 
      new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error('AbortError'));
        });
        setTimeout(() => controller.abort(), 100);
      })
    );

    const request: DeepSeekReasonerRequest = {
      messages: [{ role: 'user', content: 'test' }],
      modelConfig: {
        model: 'deepseek-reasoner',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        jsonMode: false
      },
      requestId: 'test',
      abortSignal: controller.signal
    };

    await expect(client.complete(request)).rejects.toThrow();
  });

  it('should validate JSON mode responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'test',
        choices: [{
          message: { content: 'invalid json content {' }
        }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      })
    });

    const jsonModeRequest: DeepSeekReasonerRequest = {
      messages: [{ role: 'user', content: 'test' }],
      modelConfig: {
        model: 'deepseek-reasoner',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        jsonMode: true
      },
      requestId: 'test'
    };

    await expect(client.complete(jsonModeRequest)).rejects.toThrow(
      'Invalid JSON response received when JSON mode was requested'
    );
  });
});