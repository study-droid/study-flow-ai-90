/**
 * Enhanced AI Response Cache System
 * Implements intelligent response caching with similarity matching,
 * cache invalidation policies, and performance metrics
 */

import { AIRequest, AIResponse } from '../ai-provider-router';

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  similarityThreshold: number;
  enableSimilarityMatching: boolean;
  enableMetrics: boolean;
  compressionEnabled: boolean;
}

export interface CacheEntry {
  key: string;
  request: AIRequest;
  response: AIResponse;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  similarity?: number;
}

export interface CacheMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  similarityHits: number;
  hitRate: number;
  averageResponseTime: number;
  totalCacheSize: number;
  entriesCount: number;
  evictionsCount: number;
  memoryUsage: number;
}

export interface SimilarityMatch {
  entry: CacheEntry;
  similarity: number;
  reason: string;
}

/**
 * Enhanced AI Response Cache with intelligent similarity matching
 */
export class AIResponseCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttlMs: 30 * 60 * 1000, // 30 minutes
      similarityThreshold: 0.85,
      enableSimilarityMatching: true,
      enableMetrics: true,
      compressionEnabled: true,
      ...config
    };

    this.resetMetrics();
    this.startCleanupInterval();
  }

  /**
   * Get cached response for a request
   */
  async get(request: AIRequest): Promise<{ hit: boolean; response?: AIResponse; similarity?: number }> {
    if (this.config.enableMetrics) {
      this.metrics.totalRequests++;
    }

    const cacheKey = this.generateCacheKey(request);
    
    // Direct cache hit
    const directEntry = this.cache.get(cacheKey);
    if (directEntry && this.isEntryValid(directEntry)) {
      this.updateEntryAccess(directEntry);
      this.metrics.cacheHits++;
      
      return {
        hit: true,
        response: {
          ...directEntry.response,
          cached: true,
          cacheHit: true
        },
        similarity: 1.0 // Exact match
      };
    }

    // Similarity matching if enabled
    if (this.config.enableSimilarityMatching) {
      const similarMatch = await this.findSimilarEntry(request);
      if (similarMatch) {
        this.updateEntryAccess(similarMatch.entry);
        this.metrics.similarityHits++;
        this.metrics.cacheHits++;
        
        return {
          hit: true,
          response: {
            ...similarMatch.entry.response,
            cached: true,
            cacheHit: true,
            similarity: similarMatch.similarity
          },
          similarity: similarMatch.similarity
        };
      }
    }

    this.metrics.cacheMisses++;
    return { hit: false };
  }

  /**
   * Store response in cache
   */
  async set(request: AIRequest, response: AIResponse): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const size = this.calculateEntrySize(request, response);
      
      // Check if we need to evict entries
      await this.ensureCapacity(size);
      
      const entry: CacheEntry = {
        key: cacheKey,
        request: this.sanitizeRequest(request),
        response: this.sanitizeResponse(response),
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        size
      };

      this.cache.set(cacheKey, entry);
      this.updateCacheMetrics();
      
      return true;
    } catch (error) {
      console.error('Failed to cache AI response:', error);
      return false;
    }
  }

  /**
   * Clear cache entries based on criteria
   */
  clear(criteria?: {
    olderThan?: number;
    providerId?: string;
    pattern?: RegExp;
  }): number {
    let removedCount = 0;
    
    if (!criteria) {
      removedCount = this.cache.size;
      this.cache.clear();
    } else {
      for (const [key, entry] of this.cache.entries()) {
        let shouldRemove = false;
        
        if (criteria.olderThan && entry.timestamp < criteria.olderThan) {
          shouldRemove = true;
        }
        
        if (criteria.providerId && entry.response.providerId === criteria.providerId) {
          shouldRemove = true;
        }
        
        if (criteria.pattern && criteria.pattern.test(key)) {
          shouldRemove = true;
        }
        
        if (shouldRemove) {
          this.cache.delete(key);
          removedCount++;
        }
      }
    }
    
    this.updateCacheMetrics();
    return removedCount;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateCacheMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      totalEntries: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length 
        : 0,
      mostAccessed: entries.sort((a, b) => b.accessCount - a.accessCount).slice(0, 5),
      oldestEntry: entries.sort((a, b) => a.timestamp - b.timestamp)[0],
      newestEntry: entries.sort((a, b) => b.timestamp - a.timestamp)[0]
    };
  }

  /**
   * Optimize cache by removing least useful entries
   */
  optimize(): { removed: number; sizeSaved: number } {
    const entries = Array.from(this.cache.entries());
    
    if (entries.length === 0) {
      return { removed: 0, sizeSaved: 0 };
    }
    
    const now = Date.now();
    
    // Score entries based on access frequency, recency, and size
    const scoredEntries = entries.map(([key, entry]) => ({
      key,
      entry,
      score: this.calculateEntryScore(entry, now)
    }));
    
    // Sort by score (lower is worse)
    scoredEntries.sort((a, b) => a.score - b.score);
    
    // Remove bottom 20% of entries, but at least 1 if there are entries
    const toRemove = Math.max(1, Math.floor(scoredEntries.length * 0.2));
    let removed = 0;
    let sizeSaved = 0;
    
    for (let i = 0; i < toRemove && i < scoredEntries.length; i++) {
      const { key, entry } = scoredEntries[i];
      this.cache.delete(key);
      removed++;
      sizeSaved += entry.size;
      this.metrics.evictionsCount++;
    }
    
    this.updateCacheMetrics();
    
    return { removed, sizeSaved };
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.resetMetrics();
  }

  /**
   * Private helper methods
   */
  private generateCacheKey(request: AIRequest): string {
    // Create a deterministic cache key based on request content (excluding requestId for similarity)
    const keyData = {
      messages: request.messages?.map(m => ({ role: m.role, content: m.content.trim() })) || [],
      modelConfig: {
        temperature: request.modelConfig?.temperature,
        maxTokens: request.modelConfig?.maxTokens,
        model: request.modelConfig?.model
      },
      providerId: request.preferredProvider
      // Note: requestId is excluded to allow similarity matching
    };
    
    return this.hashObject(keyData);
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async findSimilarEntry(request: AIRequest): Promise<SimilarityMatch | null> {
    let bestMatch: SimilarityMatch | null = null;
    
    for (const entry of this.cache.values()) {
      if (!this.isEntryValid(entry)) continue;
      
      const similarity = this.calculateSimilarity(request, entry.request);
      
      if (similarity >= this.config.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = {
            entry,
            similarity,
            reason: `Similar request found (${(similarity * 100).toFixed(1)}% match)`
          };
        }
      }
    }
    
    return bestMatch;
  }

  private calculateSimilarity(req1: AIRequest, req2: AIRequest): number {
    // Compare message content similarity
    const messages1 = req1.messages?.map(m => m.content).join(' ') || '';
    const messages2 = req2.messages?.map(m => m.content).join(' ') || '';
    
    const contentSimilarity = this.calculateTextSimilarity(messages1, messages2);
    
    // Compare model configuration similarity
    const config1 = req1.modelConfig || {};
    const config2 = req2.modelConfig || {};
    
    let configSimilarity = 1.0;
    if (config1.model !== config2.model) configSimilarity *= 0.8;
    if (Math.abs((config1.temperature || 0.7) - (config2.temperature || 0.7)) > 0.2) {
      configSimilarity *= 0.9;
    }
    
    // Weighted average
    return (contentSimilarity * 0.8) + (configSimilarity * 0.2);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    // Normalize texts
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const norm1 = normalize(text1);
    const norm2 = normalize(text2);
    
    if (norm1 === norm2) return 1.0;
    
    // Simple Jaccard similarity with word stemming
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Also check for partial word matches to improve similarity detection
    let partialMatches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          partialMatches++;
          break;
        }
      }
    }
    
    const jaccardSimilarity = intersection.size / union.size;
    const partialSimilarity = partialMatches / Math.max(words1.size, words2.size);
    
    // Combine Jaccard and partial similarity
    return Math.max(jaccardSimilarity, partialSimilarity * 0.7);
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < this.config.ttlMs;
  }

  private updateEntryAccess(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private calculateEntrySize(request: AIRequest, response: AIResponse): number {
    // Estimate memory usage in bytes
    const requestSize = JSON.stringify(request).length * 2; // UTF-16
    const responseSize = JSON.stringify(response).length * 2;
    return requestSize + responseSize;
  }

  private sanitizeRequest(request: AIRequest): AIRequest {
    // Remove sensitive data and large objects for caching
    return {
      ...request,
      abortSignal: undefined, // Don't cache abort signals
      stream: false // Cached responses are not streamed
    };
  }

  private sanitizeResponse(response: AIResponse): AIResponse {
    // Remove or compress large response data
    return {
      ...response,
      cached: false, // Will be set to true when retrieved from cache
      cacheHit: false
    };
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    if (this.cache.size >= this.config.maxSize || 
        (currentSize + newEntrySize) > (this.config.maxSize * 1024 * 1024)) { // Assume maxSize is in MB
      
      // Use LRU eviction strategy
      const entries = Array.from(this.cache.entries());
      entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      // Remove oldest 25% of entries
      const toRemove = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
        this.metrics.evictionsCount++;
      }
    }
  }

  private calculateEntryScore(entry: CacheEntry, now: number): number {
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const accessFrequency = entry.accessCount / Math.max(1, age / (1000 * 60 * 60)); // accesses per hour
    
    // Higher score is better
    return accessFrequency * 1000 - (timeSinceAccess / 1000) - (entry.size / 1024);
  }

  private updateCacheMetrics(): void {
    if (!this.config.enableMetrics) return;
    
    const entries = Array.from(this.cache.values());
    
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? this.metrics.cacheHits / this.metrics.totalRequests 
      : 0;
    
    this.metrics.totalCacheSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    this.metrics.entriesCount = entries.length;
    this.metrics.memoryUsage = this.metrics.totalCacheSize / (1024 * 1024); // MB
  }

  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      similarityHits: 0,
      hitRate: 0,
      averageResponseTime: 0,
      totalCacheSize: 0,
      entriesCount: 0,
      evictionsCount: 0,
      memoryUsage: 0
    };
  }

  private startCleanupInterval(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.updateCacheMetrics();
    }
  }
}

// Singleton instance for global use
export const globalAICache = new AIResponseCache({
  maxSize: 500, // 500 entries
  ttlMs: 30 * 60 * 1000, // 30 minutes
  similarityThreshold: 0.85,
  enableSimilarityMatching: true,
  enableMetrics: true,
  compressionEnabled: true
});