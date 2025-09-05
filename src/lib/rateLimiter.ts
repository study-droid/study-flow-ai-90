/**
 * Production-ready rate limiter using token bucket algorithm
 * Supports per-user and global rate limiting with configurable parameters
 */

export interface RateLimitConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Maximum burst size (tokens in bucket) */
  burstSize: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Token refill rate per millisecond */
  refillRate: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining tokens/requests */
  remaining: number;
  /** Time when limits reset (Unix timestamp) */
  resetTime: number;
  /** Total requests in current window */
  totalRequests: number;
  /** Time until next token refill */
  retryAfter?: number;
}

export interface RateLimitStats {
  /** Total active users */
  activeUsers: number;
  /** Total requests processed */
  totalRequests: number;
  /** Total requests blocked */
  blockedRequests: number;
  /** Memory usage stats */
  memoryUsage: {
    userBuckets: number;
    endpointBuckets: number;
    totalEntries: number;
  };
}

interface TokenBucket {
  /** Current tokens in bucket */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Total requests made */
  totalRequests: number;
  /** Bucket configuration */
  config: RateLimitConfig;
  /** Expiry timestamp for cleanup */
  expiresAt: number;
}

interface RateLimitStore {
  /** Per-user token buckets */
  userBuckets: Map<string, Map<string, TokenBucket>>;
  /** Global endpoint buckets */
  globalBuckets: Map<string, TokenBucket>;
  /** Statistics tracking */
  stats: {
    totalRequests: number;
    blockedRequests: number;
    startTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes
  private readonly defaultTTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.store = {
      userBuckets: new Map(),
      globalBuckets: new Map(),
      stats: {
        totalRequests: 0,
        blockedRequests: 0,
        startTime: Date.now(),
      },
    };

    this.startCleanupProcess();
  }

  /**
   * Check if a request should be allowed based on rate limits
   */
  async checkLimit(
    userId: string,
    endpoint: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      const rateLimitConfig = this.mergeConfig(config);
      const now = Date.now();

      // Check user-specific limit
      const userResult = this.checkUserLimit(userId, endpoint, rateLimitConfig, now);
      
      // Check global endpoint limit
      const globalResult = this.checkGlobalLimit(endpoint, rateLimitConfig, now);

      // Use the most restrictive result
      const result = userResult.allowed && globalResult.allowed 
        ? userResult 
        : (!userResult.allowed ? userResult : globalResult);

      // Update statistics
      this.store.stats.totalRequests++;
      if (!result.allowed) {
        this.store.stats.blockedRequests++;
      }

      return result;
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: 1,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
      };
    }
  }

  /**
   * Reset rate limits for a specific user
   */
  async resetLimits(userId: string): Promise<void> {
    try {
      this.store.userBuckets.delete(userId);
      console.log(`Rate limits reset for user: ${userId}`);
    } catch (error) {
      console.error('Error resetting limits:', error);
      throw new Error('Failed to reset rate limits');
    }
  }

  /**
   * Get comprehensive rate limiter statistics
   */
  async getStats(): Promise<RateLimitStats> {
    try {
      let totalUserBuckets = 0;
      this.store.userBuckets.forEach(userMap => {
        totalUserBuckets += userMap.size;
      });

      return {
        activeUsers: this.store.userBuckets.size,
        totalRequests: this.store.stats.totalRequests,
        blockedRequests: this.store.stats.blockedRequests,
        memoryUsage: {
          userBuckets: totalUserBuckets,
          endpointBuckets: this.store.globalBuckets.size,
          totalEntries: totalUserBuckets + this.store.globalBuckets.size,
        },
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw new Error('Failed to retrieve rate limiter statistics');
    }
  }

  /**
   * Manual cleanup of expired entries
   */
  async cleanup(): Promise<number> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean up user buckets
      for (const [userId, userMap] of this.store.userBuckets.entries()) {
        for (const [endpoint, bucket] of userMap.entries()) {
          if (bucket.expiresAt < now) {
            userMap.delete(endpoint);
            cleanedCount++;
          }
        }
        // Remove empty user maps
        if (userMap.size === 0) {
          this.store.userBuckets.delete(userId);
        }
      }

      // Clean up global buckets
      for (const [endpoint, bucket] of this.store.globalBuckets.entries()) {
        if (bucket.expiresAt < now) {
          this.store.globalBuckets.delete(endpoint);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired rate limit entries`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Shutdown the rate limiter and cleanup resources
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.userBuckets.clear();
    this.store.globalBuckets.clear();
    console.log('Rate limiter shutdown complete');
  }

  private checkUserLimit(
    userId: string,
    endpoint: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitResult {
    let userMap = this.store.userBuckets.get(userId);
    if (!userMap) {
      userMap = new Map();
      this.store.userBuckets.set(userId, userMap);
    }

    let bucket = userMap.get(endpoint);
    if (!bucket) {
      bucket = this.createBucket(config, now);
      userMap.set(endpoint, bucket);
    }

    return this.consumeToken(bucket, now);
  }

  private checkGlobalLimit(
    endpoint: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitResult {
    // Global limits with higher thresholds
    const globalConfig: RateLimitConfig = {
      ...config,
      requestsPerMinute: config.requestsPerMinute * 10,
      burstSize: config.burstSize * 5,
    };

    let bucket = this.store.globalBuckets.get(endpoint);
    if (!bucket) {
      bucket = this.createBucket(globalConfig, now);
      this.store.globalBuckets.set(endpoint, bucket);
    }

    return this.consumeToken(bucket, now);
  }

  private createBucket(config: RateLimitConfig, now: number): TokenBucket {
    return {
      tokens: config.burstSize,
      lastRefill: now,
      totalRequests: 0,
      config,
      expiresAt: now + this.defaultTTL,
    };
  }

  private consumeToken(bucket: TokenBucket, now: number): RateLimitResult {
    // Refill tokens based on elapsed time
    this.refillBucket(bucket, now);

    const resetTime = now + bucket.config.windowMs;
    
    if (bucket.tokens >= 1) {
      // Allow request
      bucket.tokens -= 1;
      bucket.totalRequests += 1;
      bucket.expiresAt = now + this.defaultTTL; // Extend expiry

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime,
        totalRequests: bucket.totalRequests,
      };
    } else {
      // Reject request
      const retryAfter = Math.ceil(
        (1 - bucket.tokens) / bucket.config.refillRate
      );

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        totalRequests: bucket.totalRequests,
        retryAfter,
      };
    }
  }

  private refillBucket(bucket: TokenBucket, now: number): void {
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.config.refillRate;
    
    bucket.tokens = Math.min(
      bucket.config.burstSize,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }

  private mergeConfig(config?: Partial<RateLimitConfig>): RateLimitConfig {
    const defaultConfig: RateLimitConfig = {
      requestsPerMinute: 60,
      burstSize: 10,
      windowMs: 60 * 1000, // 1 minute
      refillRate: 1 / 1000, // 1 token per second
    };

    if (!config) return defaultConfig;

    const merged = { ...defaultConfig, ...config };
    
    // Recalculate refill rate if requests per minute changed
    if (config.requestsPerMinute) {
      merged.refillRate = config.requestsPerMinute / (60 * 1000);
    }

    return merged;
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanup();
    }, this.cleanupIntervalMs);
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Default configurations for different endpoints
export const RateLimitConfigs = {
  ai_tutor_chat: {
    requestsPerMinute: 30,
    burstSize: 5,
    windowMs: 60 * 1000,
  },
  ai_tutor_analysis: {
    requestsPerMinute: 15,
    burstSize: 3,
    windowMs: 60 * 1000,
  },
  ai_recommendations: {
    requestsPerMinute: 20,
    burstSize: 4,
    windowMs: 60 * 1000,
  },
  default: {
    requestsPerMinute: 60,
    burstSize: 10,
    windowMs: 60 * 1000,
  },
} as const;

/**
 * Middleware helper for easy integration
 */
export const createRateLimitMiddleware = (
  endpoint: keyof typeof RateLimitConfigs
) => {
  return async (userId: string): Promise<RateLimitResult> => {
    const config = RateLimitConfigs[endpoint] || RateLimitConfigs.default;
    return rateLimiter.checkLimit(userId, endpoint, config);
  };
};

/**
 * Utility function to check if rate limit allows request
 */
export const isRateLimited = async (
  userId: string,
  endpoint: string,
  config?: Partial<RateLimitConfig>
): Promise<{ allowed: boolean; result: RateLimitResult }> => {
  const result = await rateLimiter.checkLimit(userId, endpoint, config);
  return {
    allowed: result.allowed,
    result,
  };
};

/**
 * Simple allow function for backward compatibility
 */
export const allow = async (
  userId: string,
  endpoint: string,
  config?: Partial<RateLimitConfig>
): Promise<boolean> => {
  const result = await rateLimiter.checkLimit(userId, endpoint, config);
  return result.allowed;
};

// Handle process cleanup
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => rateLimiter.shutdown());
  process.on('SIGINT', () => rateLimiter.shutdown());
}