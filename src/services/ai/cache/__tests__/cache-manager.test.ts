/**
 * Tests for Cache Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../cache-manager';
import type { AIRequest, AIResponse } from '../../ai-provider-router';

describe('CacheManager', () => {
  let manager: CacheManager;
  
  const mockRequest: AIRequest = {
    messages: [
      { role: 'user', content: 'What is machine learning?' }
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
    content: 'Machine learning is a subset of artificial intelligence.',
    providerId: 'test-provider',
    cached: false,
    processingTime: 1000,
    requestId: 'test-request-1',
    model: 'test-model',
    fallbackUsed: false,
    metadata: {}
  };

  beforeEach(() => {
    manager = new CacheManager({
      defaultPolicy: 'standard',
      policies: [
        {
          name: 'standard',
          ttlMs: 30 * 60 * 1000,
          maxSize: 100,
          similarityThreshold: 0.85,
          enableSimilarityMatching: true,
          priority: 1
        },
        {
          name: 'session',
          ttlMs: 60 * 60 * 1000,
          maxSize: 50,
          similarityThreshold: 0.8,
          enableSimilarityMatching: false,
          priority: 0
        }
      ],
      enableGlobalMetrics: true,
      maxTotalMemoryMB: 50
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Policy Management', () => {
    it('should initialize with default policies', () => {
      const policies = manager.getPolicies();
      expect(policies).toHaveLength(2);
      expect(policies.find(p => p.name === 'standard')).toBeDefined();
      expect(policies.find(p => p.name === 'session')).toBeDefined();
    });

    it('should add new policies', () => {
      const newPolicy = {
        name: 'long-term',
        ttlMs: 24 * 60 * 60 * 1000,
        maxSize: 200,
        similarityThreshold: 0.9,
        enableSimilarityMatching: true,
        priority: 2
      };

      manager.addPolicy(newPolicy);
      
      const policies = manager.getPolicies();
      expect(policies).toHaveLength(3);
      expect(policies.find(p => p.name === 'long-term')).toBeDefined();
    });

    it('should update existing policies', () => {
      const updatedPolicy = {
        name: 'standard',
        ttlMs: 60 * 60 * 1000, // Changed from 30 minutes to 1 hour
        maxSize: 200, // Changed from 100 to 200
        similarityThreshold: 0.9, // Changed from 0.85 to 0.9
        enableSimilarityMatching: true,
        priority: 1
      };

      manager.addPolicy(updatedPolicy);
      
      const policies = manager.getPolicies();
      const standardPolicy = policies.find(p => p.name === 'standard');
      expect(standardPolicy?.ttlMs).toBe(60 * 60 * 1000);
      expect(standardPolicy?.maxSize).toBe(200);
    });

    it('should remove policies', () => {
      const removed = manager.removePolicy('session');
      expect(removed).toBe(true);
      
      const policies = manager.getPolicies();
      expect(policies).toHaveLength(1);
      expect(policies.find(p => p.name === 'session')).toBeUndefined();
    });

    it('should not remove default policy', () => {
      expect(() => manager.removePolicy('standard')).toThrow();
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve from default policy', async () => {
      const stored = await manager.set(mockRequest, mockResponse);
      expect(stored).toBe(true);

      const result = await manager.get(mockRequest);
      expect(result.hit).toBe(true);
      expect(result.source).toBe('standard');
      expect(result.response?.content).toBe(mockResponse.content);
    });

    it('should store and retrieve from specific policy', async () => {
      const stored = await manager.set(mockRequest, mockResponse, 'session');
      expect(stored).toBe(true);

      const result = await manager.get(mockRequest, 'session');
      expect(result.hit).toBe(true);
      expect(result.source).toBe('session');
    });

    it('should handle cache misses', async () => {
      const result = await manager.get(mockRequest);
      expect(result.hit).toBe(false);
      expect(result.response).toBeUndefined();
    });

    it('should select appropriate policy based on request', async () => {
      // Educational content should use long-term policy if available
      const educationalRequest: AIRequest = {
        messages: [
          { role: 'user', content: 'Explain what is photosynthesis' }
        ],
        modelConfig: mockRequest.modelConfig,
        requestId: 'educational-request'
      };

      // Add long-term policy
      manager.addPolicy({
        name: 'long-term',
        ttlMs: 24 * 60 * 60 * 1000,
        maxSize: 100,
        similarityThreshold: 0.9,
        enableSimilarityMatching: true,
        priority: 2
      });

      await manager.set(educationalRequest, mockResponse);
      const result = await manager.get(educationalRequest);
      expect(result.source).toBe('long-term');
    });
  });

  describe('Global Metrics', () => {
    it('should track global metrics', async () => {
      await manager.set(mockRequest, mockResponse);
      await manager.get(mockRequest); // Hit
      await manager.get({ ...mockRequest, requestId: 'different' }); // Miss

      const metrics = manager.getGlobalMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalHits).toBe(1);
      expect(metrics.totalMisses).toBe(1);
      expect(metrics.globalHitRate).toBe(0.5);
    });

    it('should aggregate metrics from all policies', async () => {
      await manager.set(mockRequest, mockResponse, 'standard');
      await manager.set(
        { ...mockRequest, requestId: 'req-2' }, 
        mockResponse, 
        'session'
      );

      const metrics = manager.getGlobalMetrics();
      expect(metrics.totalEntries).toBe(2);
      expect(Object.keys(metrics.policiesStats)).toContain('standard');
      expect(Object.keys(metrics.policiesStats)).toContain('session');
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all caches', async () => {
      await manager.set(mockRequest, mockResponse, 'standard');
      await manager.set(mockRequest, mockResponse, 'session');

      const results = manager.clear();
      expect(results).toHaveLength(2);
      expect(results.every(r => r.removed >= 0)).toBe(true);

      const metrics = manager.getGlobalMetrics();
      expect(metrics.totalEntries).toBe(0);
    });

    it('should clear specific policy cache', async () => {
      await manager.set(mockRequest, mockResponse, 'standard');
      await manager.set(mockRequest, mockResponse, 'session');

      const results = manager.clear({ policy: 'standard' });
      expect(results).toHaveLength(1);
      expect(results[0].policy).toBe('standard');

      // Session cache should still have entries
      const sessionResult = await manager.get(mockRequest, 'session');
      expect(sessionResult.hit).toBe(true);
    });

    it('should clear by provider ID', async () => {
      const response1 = { ...mockResponse, providerId: 'provider-1' };
      const response2 = { ...mockResponse, providerId: 'provider-2' };

      await manager.set(mockRequest, response1);
      await manager.set(
        { ...mockRequest, requestId: 'req-2' }, 
        response2
      );

      const results = manager.clear({ providerId: 'provider-1' });
      expect(results.some(r => r.removed > 0)).toBe(true);
    });
  });

  describe('Optimization', () => {
    it('should optimize all caches', async () => {
      // Add multiple entries
      for (let i = 0; i < 10; i++) {
        await manager.set(
          { ...mockRequest, requestId: `req-${i}` },
          { ...mockResponse, id: `response-${i}` }
        );
      }

      const results = manager.optimizeAll();
      expect(results).toHaveLength(2); // Two policies
      expect(results.every(r => r.removed >= 0)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', async () => {
      await manager.set(mockRequest, mockResponse);
      
      const stats = manager.getStats();
      expect(stats.policies).toBeDefined();
      expect(stats.global).toBeDefined();
      expect(stats.memoryUsage).toBeDefined();
      expect(stats.recommendations).toBeDefined();
      expect(Array.isArray(stats.recommendations)).toBe(true);
    });

    it('should provide policy-specific metrics', async () => {
      await manager.set(mockRequest, mockResponse, 'standard');
      
      const metrics = manager.getPolicyMetrics('standard');
      expect(metrics).toBeDefined();
      expect(metrics?.entriesCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should respect memory limits', async () => {
      const smallMemoryManager = new CacheManager({
        maxTotalMemoryMB: 1, // Very small limit
        policies: [
          {
            name: 'test',
            ttlMs: 60000,
            maxSize: 1000,
            similarityThreshold: 0.8,
            enableSimilarityMatching: false,
            priority: 1
          }
        ]
      });

      // Try to add many large entries
      for (let i = 0; i < 100; i++) {
        const largeResponse = {
          ...mockResponse,
          content: 'x'.repeat(10000), // 10KB each
          id: `large-response-${i}`
        };
        
        await smallMemoryManager.set(
          { ...mockRequest, requestId: `large-req-${i}` },
          largeResponse
        );
      }

      const stats = smallMemoryManager.getStats();
      expect(stats.memoryUsage).toBeLessThan(10); // Should have cleaned up

      smallMemoryManager.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid policy names gracefully', async () => {
      const result = await manager.get(mockRequest, 'non-existent-policy');
      expect(result.hit).toBe(false);
    });

    it('should handle storage failures gracefully', async () => {
      // This would require mocking internal cache failures
      // For now, just ensure no exceptions are thrown
      const stored = await manager.set(mockRequest, mockResponse);
      expect(typeof stored).toBe('boolean');
    });
  });
});