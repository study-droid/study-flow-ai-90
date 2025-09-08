/**
 * Tests for AI Response Cache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIResponseCache } from '../ai-response-cache';
import type { AIRequest, AIResponse } from '../../ai-provider-router';

describe('AIResponseCache', () => {
  let cache: AIResponseCache;
  
  const mockRequest: AIRequest = {
    messages: [
      { role: 'user', content: 'What is photosynthesis?' }
    ],
    modelConfig: {
      temperature: 0.7,
      maxTokens: 1000,
      model: 'test-model'
    },
    requestId: 'test-request-1'
  };

  const mockResponse: AIResponse = {
    id: 'response-1',
    content: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
    providerId: 'test-provider',
    cached: false,
    processingTime: 1000,
    requestId: 'test-request-1',
    model: 'test-model',
    fallbackUsed: false,
    metadata: {}
  };

  beforeEach(() => {
    cache = new AIResponseCache({
      maxSize: 10,
      ttlMs: 60000, // 1 minute
      similarityThreshold: 0.8,
      enableSimilarityMatching: true,
      enableMetrics: true
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Caching', () => {
    it('should store and retrieve responses', async () => {
      // Store response
      const stored = await cache.set(mockRequest, mockResponse);
      expect(stored).toBe(true);

      // Retrieve response
      const result = await cache.get(mockRequest);
      expect(result.hit).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response?.content).toBe(mockResponse.content);
      expect(result.response?.cached).toBe(true);
    });

    it('should return cache miss for non-existent entries', async () => {
      const result = await cache.get(mockRequest);
      expect(result.hit).toBe(false);
      expect(result.response).toBeUndefined();
    });

    it('should handle cache key generation consistently', async () => {
      await cache.set(mockRequest, mockResponse);
      
      // Same request should hit cache
      const result1 = await cache.get(mockRequest);
      expect(result1.hit).toBe(true);

      // Identical request should also hit cache
      const identicalRequest = { ...mockRequest };
      const result2 = await cache.get(identicalRequest);
      expect(result2.hit).toBe(true);
    });
  });

  describe('Similarity Matching', () => {
    it('should find similar requests', async () => {
      await cache.set(mockRequest, mockResponse);

      const similarRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'Explain photosynthesis process' }
        ],
        modelConfig: mockRequest.modelConfig,
        requestId: 'test-request-2'
      };

      const result = await cache.get(similarRequest);
      expect(result.hit).toBe(true);
      if (result.similarity !== undefined) {
        expect(result.similarity).toBeGreaterThan(0.5);
      }
    });

    it('should not match dissimilar requests', async () => {
      await cache.set(mockRequest, mockResponse);

      const dissimilarRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'What is the capital of France?' }
        ],
        modelConfig: mockRequest.modelConfig,
        requestId: 'test-request-3'
      };

      const result = await cache.get(dissimilarRequest);
      expect(result.hit).toBe(false);
    });

    it('should respect similarity threshold', async () => {
      const strictCache = new AIResponseCache({
        similarityThreshold: 0.95,
        enableSimilarityMatching: true
      });

      await strictCache.set(mockRequest, mockResponse);

      const slightlyDifferentRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'What is photosynthesis exactly?' }
        ],
        modelConfig: mockRequest.modelConfig,
        requestId: 'test-request-4'
      };

      const result = await strictCache.get(slightlyDifferentRequest);
      expect(result.hit).toBe(false);

      strictCache.destroy();
    });
  });

  describe('Cache Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new AIResponseCache({
        ttlMs: 100 // 100ms
      });

      await shortTtlCache.set(mockRequest, mockResponse);
      
      // Should hit immediately
      let result = await shortTtlCache.get(mockRequest);
      expect(result.hit).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should miss after expiration
      result = await shortTtlCache.get(mockRequest);
      expect(result.hit).toBe(false);

      shortTtlCache.destroy();
    });
  });

  describe('Cache Management', () => {
    it('should track access count and last accessed time', async () => {
      await cache.set(mockRequest, mockResponse);
      
      // Access multiple times
      await cache.get(mockRequest);
      await cache.get(mockRequest);
      await cache.get(mockRequest);

      const stats = cache.getStats();
      const entry = stats.mostAccessed[0];
      expect(entry.accessCount).toBeGreaterThan(1);
    });

    it('should clear cache entries', async () => {
      await cache.set(mockRequest, mockResponse);
      
      let result = await cache.get(mockRequest);
      expect(result.hit).toBe(true);

      const removed = cache.clear();
      expect(removed).toBe(1);

      result = await cache.get(mockRequest);
      expect(result.hit).toBe(false);
    });

    it('should clear cache entries by criteria', async () => {
      const request1 = { ...mockRequest, requestId: 'req-1' };
      const request2 = { 
        ...mockRequest, 
        requestId: 'req-2',
        messages: [{ role: 'user', content: 'Different question' }]
      };

      await cache.set(request1, { ...mockResponse, providerId: 'provider-1' });
      await cache.set(request2, { ...mockResponse, providerId: 'provider-2' });

      // Clear entries from specific provider
      const removed = cache.clear({ providerId: 'provider-1' });
      expect(removed).toBe(1);

      // Check that only one entry remains
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should optimize cache by removing low-value entries', async () => {
      // Fill cache with entries
      for (let i = 0; i < 5; i++) {
        const request = {
          ...mockRequest,
          requestId: `req-${i}`,
          messages: [{ role: 'user', content: `Question ${i}` }]
        };
        await cache.set(request, { ...mockResponse, id: `response-${i}` });
      }

      const result = cache.optimize();
      expect(result.removed).toBeGreaterThan(0);
      expect(result.sizeSaved).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    it('should track cache metrics', async () => {
      // Generate some cache activity
      await cache.set(mockRequest, mockResponse);
      await cache.get(mockRequest); // Hit
      await cache.get({ ...mockRequest, requestId: 'different' }); // Miss

      const metrics = cache.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.hitRate).toBe(0.5);
      expect(metrics.entriesCount).toBe(1);
    });

    it('should calculate memory usage', async () => {
      await cache.set(mockRequest, mockResponse);
      
      const metrics = cache.getMetrics();
      expect(metrics.totalCacheSize).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid requests gracefully', async () => {
      const invalidRequest = {} as AIRequest;
      
      const stored = await cache.set(invalidRequest, mockResponse);
      expect(stored).toBe(true); // Should not throw

      const result = await cache.get(invalidRequest);
      expect(result.hit).toBe(true); // Should work with consistent key generation
    });

    it('should handle large responses', async () => {
      const largeResponse = {
        ...mockResponse,
        content: 'x'.repeat(100000) // 100KB response
      };

      const stored = await cache.set(mockRequest, largeResponse);
      expect(stored).toBe(true);

      const result = await cache.get(mockRequest);
      expect(result.hit).toBe(true);
      expect(result.response?.content).toBe(largeResponse.content);
    });
  });

  describe('Configuration', () => {
    it('should respect disabled similarity matching', async () => {
      const noSimilarityCache = new AIResponseCache({
        enableSimilarityMatching: false
      });

      await noSimilarityCache.set(mockRequest, mockResponse);

      const similarRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'Explain photosynthesis' }
        ],
        modelConfig: mockRequest.modelConfig,
        requestId: 'test-request-similar'
      };

      const result = await noSimilarityCache.get(similarRequest);
      expect(result.hit).toBe(false); // Should not find similar match

      noSimilarityCache.destroy();
    });

    it('should respect disabled metrics', async () => {
      const noMetricsCache = new AIResponseCache({
        enableMetrics: false
      });

      await noMetricsCache.set(mockRequest, mockResponse);
      await noMetricsCache.get(mockRequest);

      const metrics = noMetricsCache.getMetrics();
      expect(metrics.totalRequests).toBe(0); // Metrics should not be tracked

      noMetricsCache.destroy();
    });
  });
});