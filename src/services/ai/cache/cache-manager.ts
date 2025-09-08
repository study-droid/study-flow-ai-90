/**
 * Cache Manager
 * Manages multiple cache instances and policies for different use cases
 */

import { AIResponseCache, CacheConfig, CacheMetrics } from './ai-response-cache';
import { AIRequest, AIResponse } from '../ai-provider-router';

export interface CachePolicy {
  name: string;
  ttlMs: number;
  maxSize: number;
  similarityThreshold: number;
  enableSimilarityMatching: boolean;
  priority: number;
}

export interface CacheManagerConfig {
  defaultPolicy: string;
  policies: CachePolicy[];
  enableGlobalMetrics: boolean;
  maxTotalMemoryMB: number;
}

export interface GlobalCacheMetrics {
  totalCaches: number;
  totalEntries: number;
  totalMemoryUsage: number;
  globalHitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  policiesStats: Record<string, CacheMetrics>;
}

/**
 * Manages multiple cache instances with different policies
 */
export class CacheManager {
  private caches = new Map<string, AIResponseCache>();
  private config: CacheManagerConfig;
  private globalMetrics: GlobalCacheMetrics;

  constructor(config: Partial<CacheManagerConfig> = {}) {
    this.config = {
      defaultPolicy: 'standard',
      policies: [
        {
          name: 'standard',
          ttlMs: 30 * 60 * 1000, // 30 minutes
          maxSize: 500,
          similarityThreshold: 0.85,
          enableSimilarityMatching: true,
          priority: 1
        },
        {
          name: 'long-term',
          ttlMs: 24 * 60 * 60 * 1000, // 24 hours
          maxSize: 200,
          similarityThreshold: 0.9,
          enableSimilarityMatching: true,
          priority: 2
        },
        {
          name: 'session',
          ttlMs: 60 * 60 * 1000, // 1 hour
          maxSize: 100,
          similarityThreshold: 0.8,
          enableSimilarityMatching: false,
          priority: 0
        }
      ],
      enableGlobalMetrics: true,
      maxTotalMemoryMB: 100,
      ...config
    };

    this.initializeCaches();
    this.resetGlobalMetrics();
  }

  /**
   * Get cached response using the best available cache
   */
  async get(request: AIRequest, policyName?: string): Promise<{ hit: boolean; response?: AIResponse; source?: string; similarity?: number }> {
    const policy = policyName || this.selectBestPolicy(request);
    const cache = this.getCache(policy);
    
    if (!cache) {
      return { hit: false };
    }

    let result = await cache.get(request);
    let actualSource = policy;
    
    // If not found in primary cache, try session cache as fallback
    if (!result.hit && policy !== 'session') {
      const sessionCache = this.getCache('session');
      if (sessionCache) {
        const sessionResult = await sessionCache.get(request);
        if (sessionResult.hit) {
          result = sessionResult;
          actualSource = 'session';
        }
      }
    }
    
    if (this.config.enableGlobalMetrics) {
      this.globalMetrics.totalRequests++;
      if (result.hit) {
        this.globalMetrics.totalHits++;
      } else {
        this.globalMetrics.totalMisses++;
      }
      this.updateGlobalHitRate();
    }

    return {
      ...result,
      source: actualSource
    };
  }

  /**
   * Store response in appropriate cache(s)
   */
  async set(request: AIRequest, response: AIResponse, policyName?: string): Promise<boolean> {
    const policy = policyName || this.selectBestPolicy(request);
    const cache = this.getCache(policy);
    
    if (!cache) {
      return false;
    }

    // Check memory limits before caching
    if (!this.checkMemoryLimits()) {
      await this.performMemoryCleanup();
    }

    const success = await cache.set(request, response);
    
    // Also cache in session cache for immediate reuse (but don't double-count)
    if (policy !== 'session' && success) {
      const sessionCache = this.getCache('session');
      if (sessionCache) {
        await sessionCache.set(request, response);
      }
    }

    return success;
  }

  /**
   * Clear caches based on criteria
   */
  clear(criteria?: {
    policy?: string;
    olderThan?: number;
    providerId?: string;
    pattern?: RegExp;
  }): { policy: string; removed: number }[] {
    const results: { policy: string; removed: number }[] = [];
    
    if (criteria?.policy) {
      const cache = this.getCache(criteria.policy);
      if (cache) {
        const removed = cache.clear(criteria);
        results.push({ policy: criteria.policy, removed });
      }
    } else {
      // Clear all caches
      for (const [policyName, cache] of this.caches.entries()) {
        const removed = cache.clear(criteria);
        results.push({ policy: policyName, removed });
      }
    }
    
    this.updateGlobalMetrics();
    return results;
  }

  /**
   * Get global cache metrics
   */
  getGlobalMetrics(): GlobalCacheMetrics {
    this.updateGlobalMetrics();
    return { ...this.globalMetrics };
  }

  /**
   * Get metrics for a specific cache policy
   */
  getPolicyMetrics(policyName: string): CacheMetrics | null {
    const cache = this.getCache(policyName);
    return cache ? cache.getMetrics() : null;
  }

  /**
   * Get all available policies
   */
  getPolicies(): CachePolicy[] {
    return [...this.config.policies];
  }

  /**
   * Add or update a cache policy
   */
  addPolicy(policy: CachePolicy): void {
    const existingIndex = this.config.policies.findIndex(p => p.name === policy.name);
    
    if (existingIndex >= 0) {
      this.config.policies[existingIndex] = policy;
    } else {
      this.config.policies.push(policy);
    }
    
    // Reinitialize cache for this policy
    this.initializeCache(policy);
  }

  /**
   * Remove a cache policy
   */
  removePolicy(policyName: string): boolean {
    if (policyName === this.config.defaultPolicy) {
      throw new Error('Cannot remove default policy');
    }
    
    const cache = this.caches.get(policyName);
    if (cache) {
      cache.destroy();
      this.caches.delete(policyName);
    }
    
    const policyIndex = this.config.policies.findIndex(p => p.name === policyName);
    if (policyIndex >= 0) {
      this.config.policies.splice(policyIndex, 1);
      return true;
    }
    
    return false;
  }

  /**
   * Optimize all caches
   */
  optimizeAll(): { policy: string; removed: number; sizeSaved: number }[] {
    const results: { policy: string; removed: number; sizeSaved: number }[] = [];
    
    for (const [policyName, cache] of this.caches.entries()) {
      const result = cache.optimize();
      results.push({
        policy: policyName,
        removed: result.removed,
        sizeSaved: result.sizeSaved
      });
    }
    
    this.updateGlobalMetrics();
    return results;
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    const stats: Record<string, any> = {};
    
    for (const [policyName, cache] of this.caches.entries()) {
      stats[policyName] = cache.getStats();
    }
    
    return {
      policies: stats,
      global: this.globalMetrics,
      memoryUsage: this.calculateTotalMemoryUsage(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Destroy all caches and cleanup resources
   */
  destroy(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
    this.resetGlobalMetrics();
  }

  /**
   * Private helper methods
   */
  private initializeCaches(): void {
    for (const policy of this.config.policies) {
      this.initializeCache(policy);
    }
  }

  private initializeCache(policy: CachePolicy): void {
    const cacheConfig: Partial<CacheConfig> = {
      maxSize: policy.maxSize,
      ttlMs: policy.ttlMs,
      similarityThreshold: policy.similarityThreshold,
      enableSimilarityMatching: policy.enableSimilarityMatching,
      enableMetrics: this.config.enableGlobalMetrics
    };
    
    const existingCache = this.caches.get(policy.name);
    if (existingCache) {
      existingCache.destroy();
    }
    
    this.caches.set(policy.name, new AIResponseCache(cacheConfig));
  }

  private getCache(policyName: string): AIResponseCache | null {
    return this.caches.get(policyName) || null;
  }

  private selectBestPolicy(request: AIRequest): string {
    // Simple policy selection logic
    // In production, this could be more sophisticated based on request characteristics
    
    // Use long-term cache for educational content first (higher priority)
    const content = request.messages?.map(m => m.content).join(' ').toLowerCase() || '';
    if (content.includes('explain') || content.includes('definition') || content.includes('what is')) {
      // Check if long-term policy exists
      const longTermPolicy = this.config.policies.find(p => p.name === 'long-term');
      if (longTermPolicy) {
        return 'long-term';
      }
    }
    
    // Use session cache for quick follow-ups
    if ((request.messages?.length || 0) <= 2) {
      return 'session';
    }
    
    // Default to standard cache
    return this.config.defaultPolicy;
  }

  private checkMemoryLimits(): boolean {
    const totalMemory = this.calculateTotalMemoryUsage();
    return totalMemory < this.config.maxTotalMemoryMB;
  }

  private async performMemoryCleanup(): Promise<void> {
    // Sort policies by priority (lower priority gets cleaned first)
    const sortedPolicies = [...this.config.policies].sort((a, b) => a.priority - b.priority);
    
    for (const policy of sortedPolicies) {
      const cache = this.getCache(policy.name);
      if (cache) {
        cache.optimize();
        
        // Check if we're under the limit now
        if (this.checkMemoryLimits()) {
          break;
        }
      }
    }
  }

  private calculateTotalMemoryUsage(): number {
    let totalMemory = 0;
    
    for (const cache of this.caches.values()) {
      const metrics = cache.getMetrics();
      totalMemory += metrics.memoryUsage;
    }
    
    return totalMemory;
  }

  private updateGlobalMetrics(): void {
    if (!this.config.enableGlobalMetrics) return;
    
    let totalEntries = 0;
    let totalMemory = 0;
    const policiesStats: Record<string, CacheMetrics> = {};
    
    for (const [policyName, cache] of this.caches.entries()) {
      const metrics = cache.getMetrics();
      totalEntries += metrics.entriesCount;
      totalMemory += metrics.memoryUsage;
      policiesStats[policyName] = metrics;
    }
    
    this.globalMetrics.totalCaches = this.caches.size;
    this.globalMetrics.totalEntries = totalEntries;
    this.globalMetrics.totalMemoryUsage = totalMemory;
    this.globalMetrics.policiesStats = policiesStats;
  }

  private updateGlobalHitRate(): void {
    this.globalMetrics.globalHitRate = this.globalMetrics.totalRequests > 0
      ? this.globalMetrics.totalHits / this.globalMetrics.totalRequests
      : 0;
  }

  private resetGlobalMetrics(): void {
    this.globalMetrics = {
      totalCaches: 0,
      totalEntries: 0,
      totalMemoryUsage: 0,
      globalHitRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      policiesStats: {}
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.globalMetrics;
    
    if (metrics.globalHitRate < 0.3) {
      recommendations.push('Consider increasing cache TTL or similarity threshold to improve hit rate');
    }
    
    if (metrics.totalMemoryUsage > this.config.maxTotalMemoryMB * 0.8) {
      recommendations.push('Memory usage is high, consider reducing cache sizes or enabling compression');
    }
    
    if (metrics.totalEntries < 50) {
      recommendations.push('Cache usage is low, consider adjusting cache policies');
    }
    
    return recommendations;
  }
}

// Global cache manager instance
export const globalCacheManager = new CacheManager();