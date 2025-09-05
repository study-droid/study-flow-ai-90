/**
 * Response Cache Service - Intelligent caching for DeepSeek responses
 * Based on ai_map.md specification
 */

import type { ProcessedResponse } from './deepseek-response-processor';

interface CacheEntry {
  response: ProcessedResponse;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  hash: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of cached responses
  enableHashing?: boolean; // Enable content-based hashing
}

export class ResponseCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL = 30 * 60 * 1000; // 30 minutes
  private readonly maxSize = 100;
  private readonly enableHashing = true;

  constructor(private options: CacheOptions = {}) {}

  /**
   * Generate cache key from message and context
   */
  private generateCacheKey(message: string, context?: any): string {
    const baseKey = message.toLowerCase().trim();
    
    if (this.enableHashing) {
      // Simple hash for content-based caching
      let hash = 0;
      for (let i = 0; i < baseKey.length; i++) {
        const char = baseKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `${Math.abs(hash).toString(36)}_${baseKey.length}`;
    }
    
    return baseKey;
  }

  /**
   * Check if response is in cache and still valid
   */
  getCachedResponse(message: string, context?: any): ProcessedResponse | null {
    const key = this.generateCacheKey(message, context);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const ttl = this.options.ttl || this.defaultTTL;
    const isExpired = Date.now() - entry.timestamp > ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      console.log('🗑️ Response Cache: Expired entry removed', { key });
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    console.log('✅ Response Cache: Cache hit', { 
      key, 
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount 
    });
    
    // Mark as cache hit
    const cachedResponse = {
      ...entry.response,
      metadata: {
        ...entry.response.metadata,
        cacheHit: true,
        source: 'cache' as const,
        cachedAt: entry.timestamp,
        accessCount: entry.accessCount
      }
    };
    
    return cachedResponse;
  }

  /**
   * Cache a processed response
   */
  cacheResponse(message: string, response: ProcessedResponse, context?: any): void {
    const key = this.generateCacheKey(message, context);
    const maxSize = this.options.maxSize || this.maxSize;
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= maxSize) {
      this.evictOldest();
    }
    
    // Create simple hash of response content for deduplication
    const contentHash = this.hashContent(response.content);
    
    const entry: CacheEntry = {
      response: {
        ...response,
        metadata: {
          ...response.metadata,
          cacheHit: false,
          cachedAt: Date.now()
        }
      },
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      hash: contentHash
    };
    
    this.cache.set(key, entry);
    
    console.log('💾 Response Cache: Cached response', { 
      key, 
      contentLength: response.content.length,
      cacheSize: this.cache.size 
    });
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldest(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log('🗑️ Response Cache: Evicted oldest entry', { key: oldestKey });
    }
  }

  /**
   * Generate simple hash of content for deduplication
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const ttl = this.options.ttl || this.defaultTTL;
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log('🗑️ Response Cache: Cleaned up expired entries', { 
        count: expiredKeys.length,
        remaining: this.cache.size 
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalRequests: number;
    totalHits: number;
  } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const entry of this.cache.values()) {
      totalRequests += entry.accessCount;
      if (entry.accessCount > 0) {
        totalHits += entry.accessCount;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize || this.maxSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      totalRequests,
      totalHits
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log('🗑️ Response Cache: Cleared all entries', { previousSize: size });
  }
}

// Global cache instance
export const responseCacheService = new ResponseCacheService({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
  enableHashing: true
});

// Cleanup expired entries every 5 minutes
setInterval(() => {
  responseCacheService.cleanup();
}, 5 * 60 * 1000);