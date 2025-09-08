/**
 * Integration tests for AI Response Cache System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { globalCacheManager, CacheUtils } from '../index';
import type { AIRequest, AIResponse } from '../../ai-provider-router';

describe('Cache Integration', () => {
    const mockRequest: AIRequest = {
        messages: [
            { role: 'user', content: 'What is artificial intelligence?' }
        ],
        modelConfig: {
            temperature: 0.7,
            maxTokens: 1000,
            model: 'test-model'
        },
        requestId: 'integration-test-1'
    };

    const mockResponse: AIResponse = {
        id: 'response-1',
        content: 'Artificial intelligence is a branch of computer science that aims to create intelligent machines.',
        providerId: 'test-provider',
        cached: false,
        processingTime: 1000,
        requestId: 'integration-test-1',
        model: 'test-model',
        fallbackUsed: false,
        metadata: {}
    };

    beforeEach(() => {
        // Clear all caches before each test
        globalCacheManager.clear();
    });

    afterEach(() => {
        // Clean up after each test
        globalCacheManager.clear();
    });

    describe('Basic Cache Operations', () => {
        it('should cache and retrieve responses', async () => {
            // Store response
            const stored = await globalCacheManager.set(mockRequest, mockResponse);
            expect(stored).toBe(true);

            // Retrieve response
            const result = await globalCacheManager.get(mockRequest);
            expect(result.hit).toBe(true);
            expect(result.response?.content).toBe(mockResponse.content);
            expect(result.response?.cached).toBe(true);
        });

        it('should handle cache misses', async () => {
            const result = await globalCacheManager.get(mockRequest);
            expect(result.hit).toBe(false);
            expect(result.response).toBeUndefined();
        });

        it('should use appropriate cache policies', async () => {
            // Educational content should be cached appropriately
            const educationalRequest: AIRequest = {
                messages: [
                    { role: 'user', content: 'Explain what is machine learning' }
                ],
                modelConfig: mockRequest.modelConfig,
                requestId: 'educational-test'
            };

            await globalCacheManager.set(educationalRequest, mockResponse);
            const result = await globalCacheManager.get(educationalRequest);

            expect(result.hit).toBe(true);
            expect(result.source).toBeDefined();
        });
    });

    describe('Cache Utilities', () => {
        it('should create consistent cache keys', () => {
            const key1 = CacheUtils.createCacheKey(mockRequest.messages, mockRequest.modelConfig);
            const key2 = CacheUtils.createCacheKey(mockRequest.messages, mockRequest.modelConfig);

            expect(key1).toBe(key2);
            expect(typeof key1).toBe('string');
            expect(key1.length).toBeGreaterThan(0);
        });

        it('should determine if responses should be cached', () => {
            // Valid response should be cached
            expect(CacheUtils.shouldCache(mockRequest, mockResponse)).toBe(true);

            // Error response should not be cached
            const errorResponse = { ...mockResponse, error: 'Test error' };
            expect(CacheUtils.shouldCache(mockRequest, errorResponse)).toBe(false);

            // Streaming request should not be cached
            const streamingRequest = { ...mockRequest, stream: true };
            expect(CacheUtils.shouldCache(streamingRequest, mockResponse)).toBe(false);
        });

        it('should select appropriate cache policies', () => {
            // Educational content (should select long-term if available, otherwise standard)
            const educationalRequest = {
                messages: [{ role: 'user', content: 'Explain photosynthesis' }]
            };
            const policy = CacheUtils.selectCachePolicy(educationalRequest);
            expect(['standard', 'long-term']).toContain(policy);

            // Short conversation
            const shortRequest = {
                messages: [{ role: 'user', content: 'Hi' }]
            };
            expect(CacheUtils.selectCachePolicy(shortRequest)).toBe('session');

            // Default case
            const defaultRequest = {
                messages: [
                    { role: 'user', content: 'How do I solve this problem?' },
                    { role: 'assistant', content: 'Here are some steps...' },
                    { role: 'user', content: 'Can you elaborate?' }
                ]
            };
            expect(CacheUtils.selectCachePolicy(defaultRequest)).toBe('standard');
        });

        it('should format metrics correctly', () => {
            const mockMetrics = {
                hitRate: 0.75,
                memoryUsage: 12.5,
                entriesCount: 150,
                totalRequests: 1000,
                cacheHits: 750,
                cacheMisses: 250,
                similarityHits: 50
            };

            const formatted = CacheUtils.formatMetrics(mockMetrics);

            expect(formatted.hitRate).toBe('75.0%');
            expect(formatted.memoryUsage).toBe('12.5 MB');
            expect(formatted.totalEntries).toBe('150');
            expect(formatted.totalRequests).toBe('1,000');
            expect(formatted.cacheHits).toBe('750');
            expect(formatted.cacheMisses).toBe('250');
            expect(formatted.similarityHits).toBe('50');
        });
    });

    describe('Performance Metrics', () => {
        it('should track cache performance', async () => {
            // Generate some cache activity
            await globalCacheManager.set(mockRequest, mockResponse);
            await globalCacheManager.get(mockRequest); // Hit

            const differentRequest = {
                ...mockRequest,
                requestId: 'different-request',
                messages: [{ role: 'user', content: 'Different question' }]
            };
            await globalCacheManager.get(differentRequest); // Miss

            const metrics = globalCacheManager.getGlobalMetrics();

            expect(metrics.totalRequests).toBeGreaterThan(0);
            expect(metrics.totalHits).toBeGreaterThan(0);
            expect(metrics.totalMisses).toBeGreaterThan(0);
            expect(metrics.globalHitRate).toBeGreaterThan(0);
            expect(metrics.globalHitRate).toBeLessThanOrEqual(1);
        });

        it('should provide cache statistics', () => {
            const stats = globalCacheManager.getStats();

            expect(stats.policies).toBeDefined();
            expect(stats.global).toBeDefined();
            expect(stats.memoryUsage).toBeDefined();
            expect(Array.isArray(stats.recommendations)).toBe(true);
        });
    });

    describe('Cache Management', () => {
        it('should clear caches by criteria', async () => {
            // Add entries with different providers
            const response1 = { ...mockResponse, providerId: 'provider-1' };
            const response2 = { ...mockResponse, providerId: 'provider-2' };

            await globalCacheManager.set(mockRequest, response1);
            await globalCacheManager.set(
                { ...mockRequest, requestId: 'req-2' },
                response2
            );

            // Clear entries from specific provider
            const results = globalCacheManager.clear({ providerId: 'provider-1' });
            expect(Array.isArray(results)).toBe(true);
        });

        it('should optimize cache performance', async () => {
            // Add multiple entries
            for (let i = 0; i < 5; i++) {
                await globalCacheManager.set(
                    { ...mockRequest, requestId: `opt-req-${i}` },
                    { ...mockResponse, id: `opt-response-${i}` }
                );
            }

            const results = globalCacheManager.optimizeAll();
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid requests gracefully', async () => {
            const invalidRequest = {} as AIRequest;

            // Should not throw errors
            const stored = await globalCacheManager.set(invalidRequest, mockResponse);
            expect(typeof stored).toBe('boolean');

            const result = await globalCacheManager.get(invalidRequest);
            expect(typeof result.hit).toBe('boolean');
        });

        it('should handle cache operations when policies are missing', async () => {
            const result = await globalCacheManager.get(mockRequest, 'non-existent-policy');
            expect(result.hit).toBe(false);
        });
    });
});