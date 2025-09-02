/**
 * Rate Limiter for Authentication and API Calls
 * Implements exponential backoff and account protection
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  backoffUntil?: number;
  lastAttempt: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private attempts: Map<string, RateLimitRecord> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly backoffMultiplier: number;
  private readonly maxBackoffMs: number;
  
  constructor(
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    backoffMultiplier: number = 2,
    maxBackoffMs: number = 5 * 60 * 1000 // 5 minutes max backoff
  ) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.backoffMultiplier = backoffMultiplier;
    this.maxBackoffMs = maxBackoffMs;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }
  
  /**
   * Check if an action is rate limited
   * @param identifier - Unique identifier (e.g., user ID, IP, email)
   * @param action - Action type (e.g., 'login', 'api_call')
   * @returns Object with allowed status and wait time if blocked
   */
  async checkLimit(
    identifier: string, 
    action: string = 'default'
  ): Promise<{ allowed: boolean; waitTime?: number; attemptsRemaining?: number }> {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const record = this.attempts.get(key);
    
    // Check if in backoff period
    if (record?.backoffUntil && now < record.backoffUntil) {
      const waitTime = Math.ceil((record.backoffUntil - now) / 1000);
      return { 
        allowed: false, 
        waitTime,
        attemptsRemaining: 0
      };
    }
    
    // Check if window has expired
    if (!record || now > record.resetTime) {
      this.attempts.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
        lastAttempt: now
      });
      return { 
        allowed: true, 
        attemptsRemaining: this.maxAttempts - 1 
      };
    }
    
    // Check if limit exceeded
    if (record.count >= this.maxAttempts) {
      // Calculate exponential backoff
      const attemptsSinceLimit = record.count - this.maxAttempts + 1;
      const backoffMs = Math.min(
        1000 * Math.pow(this.backoffMultiplier, attemptsSinceLimit),
        this.maxBackoffMs
      );
      
      record.backoffUntil = now + backoffMs;
      record.count++;
      
      const waitTime = Math.ceil(backoffMs / 1000);
      return { 
        allowed: false, 
        waitTime,
        attemptsRemaining: 0
      };
    }
    
    // Increment counter
    record.count++;
    record.lastAttempt = now;
    
    return { 
      allowed: true, 
      attemptsRemaining: this.maxAttempts - record.count 
    };
  }
  
  /**
   * Record a successful action (resets the counter)
   */
  recordSuccess(identifier: string, action: string = 'default'): void {
    const key = `${identifier}:${action}`;
    this.attempts.delete(key);
  }
  
  /**
   * Record a failed attempt
   */
  async recordFailure(
    identifier: string, 
    action: string = 'default'
  ): Promise<{ shouldLockAccount: boolean; waitTime?: number }> {
    const result = await this.checkLimit(identifier, action);
    
    // Check if account should be locked (after many failures)
    const key = `${identifier}:${action}`;
    const record = this.attempts.get(key);
    
    if (record && record.count >= this.maxAttempts * 3) {
      // After 3x max attempts, suggest account lock
      return { 
        shouldLockAccount: true, 
        waitTime: result.waitTime 
      };
    }
    
    return { 
      shouldLockAccount: false, 
      waitTime: result.waitTime 
    };
  }
  
  /**
   * Get current status for an identifier
   */
  getStatus(identifier: string, action: string = 'default'): {
    attempts: number;
    isBlocked: boolean;
    nextResetTime?: Date;
    backoffUntil?: Date;
  } {
    const key = `${identifier}:${action}`;
    const record = this.attempts.get(key);
    const now = Date.now();
    
    if (!record) {
      return { attempts: 0, isBlocked: false };
    }
    
    return {
      attempts: record.count,
      isBlocked: record.count >= this.maxAttempts || (record.backoffUntil ? now < record.backoffUntil : false),
      nextResetTime: new Date(record.resetTime),
      backoffUntil: record.backoffUntil ? new Date(record.backoffUntil) : undefined
    };
  }
  
  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string, action?: string): void {
    if (action) {
      this.attempts.delete(`${identifier}:${action}`);
    } else {
      // Reset all actions for this identifier
      for (const key of this.attempts.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          this.attempts.delete(key);
        }
      }
    }
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.attempts.entries()) {
      // Remove entries that have expired and have no backoff
      if (now > record.resetTime && (!record.backoffUntil || now > record.backoffUntil)) {
        this.attempts.delete(key);
      }
    }
  }
  
  /**
   * Check rate limit for IP-based actions
   */
  async checkIPLimit(ip: string, action: string = 'request'): Promise<{
    allowed: boolean;
    waitTime?: number;
    attemptsRemaining?: number;
  }> {
    // More strict limits for IP-based rate limiting
    const strictLimiter = new RateLimiter(
      10, // 10 attempts
      60000, // 1 minute window
      3, // Faster backoff multiplier
      60000 // 1 minute max backoff
    );
    
    return strictLimiter.checkLimit(ip, action);
  }
}

// Export singleton instance for auth rate limiting
export const authRateLimiter = new RateLimiter(
  5,        // 5 login attempts
  15 * 60 * 1000, // 15 minute window
  2,        // Double backoff each time
  30 * 60 * 1000  // 30 minutes max backoff
);

// Export API rate limiter with different settings
export const apiRateLimiter = new RateLimiter(
  60,       // 60 requests
  60000,    // 1 minute window
  1.5,      // 1.5x backoff
  5 * 60 * 1000 // 5 minutes max backoff
);