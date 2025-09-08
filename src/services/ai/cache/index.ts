/**
 * AI Response Cache System
 * Enhanced caching with similarity matching, intelligent policies, and performance monitoring
 */

// Core cache implementation
export {
  AIResponseCache,
  globalAICache,
  type CacheConfig,
  type CacheEntry,
  type CacheMetrics,
  type SimilarityMatch
} from './ai-response-cache';

// Cache management
export {
  CacheManager,
  globalCacheManager,
  type CachePolicy,
  type CacheManagerConfig,
  type GlobalCacheMetrics
} from './cache-manager';

// Performance monitoring
export {
  CacheMonitor,
  createCacheMonitor,
  type CachePerformanceReport,
  type CacheAlert,
  type CacheMonitorConfig
} from './cache-monitor';

// Utility functions for cache integration
export const CacheUtils = {
  /**
   * Create a cache key from request parameters
   */
  createCacheKey: (messages: any[], modelConfig?: any): string => {
    const keyData = {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      modelConfig: modelConfig ? {
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        model: modelConfig.model
      } : undefined
    };
    
    const str = JSON.stringify(keyData, Object.keys(keyData).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * Check if a response should be cached
   */
  shouldCache: (request: any, response: any): boolean => {
    // Don't cache error responses
    if (response.error || response.metadata?.error) {
      return false;
    }
    
    // Don't cache streaming responses
    if (request.stream) {
      return false;
    }
    
    // Don't cache very short responses (likely errors or incomplete)
    if (response.content && response.content.length < 10) {
      return false;
    }
    
    return true;
  },

  /**
   * Determine cache policy based on request characteristics
   */
  selectCachePolicy: (request: any): string => {
    const content = request.messages?.map((m: any) => m.content).join(' ').toLowerCase() || '';
    
    // Educational content gets long-term caching
    if (content.includes('explain') || content.includes('definition') || content.includes('what is')) {
      return 'long-term';
    }
    
    // Quick follow-ups get session caching
    if (request.messages?.length <= 2) {
      return 'session';
    }
    
    // Default to standard caching
    return 'standard';
  },

  /**
   * Format cache metrics for display
   */
  formatMetrics: (metrics: any) => ({
    hitRate: `${(metrics.hitRate * 100).toFixed(1)}%`,
    memoryUsage: `${metrics.memoryUsage.toFixed(1)} MB`,
    totalEntries: metrics.entriesCount.toLocaleString(),
    totalRequests: metrics.totalRequests.toLocaleString(),
    cacheHits: metrics.cacheHits.toLocaleString(),
    cacheMisses: metrics.cacheMisses.toLocaleString(),
    similarityHits: metrics.similarityHits?.toLocaleString() || '0'
  })
};

// Cache configuration presets
export const CachePresets = {
  development: {
    maxSize: 100,
    ttlMs: 10 * 60 * 1000, // 10 minutes
    similarityThreshold: 0.8,
    enableSimilarityMatching: true,
    enableMetrics: true
  },
  
  production: {
    maxSize: 1000,
    ttlMs: 60 * 60 * 1000, // 1 hour
    similarityThreshold: 0.85,
    enableSimilarityMatching: true,
    enableMetrics: true
  },
  
  memory_optimized: {
    maxSize: 200,
    ttlMs: 20 * 60 * 1000, // 20 minutes
    similarityThreshold: 0.9,
    enableSimilarityMatching: false,
    enableMetrics: false
  },
  
  performance_optimized: {
    maxSize: 2000,
    ttlMs: 2 * 60 * 60 * 1000, // 2 hours
    similarityThreshold: 0.8,
    enableSimilarityMatching: true,
    enableMetrics: true
  }
};