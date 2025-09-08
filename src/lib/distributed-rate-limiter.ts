/**
 * Distributed Rate Limiter using Supabase Database
 * Provides consistent rate limiting across multiple instances
 */

import { supabase } from '@/integrations/supabase/client';
import { SecureLogger } from './secure-logger';

export interface RateLimitConfig {
  maxRequests?: number;
  windowMinutes?: number;
  identifier?: string; // User ID, IP, or custom identifier
  endpoint?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date | null;
  retryAfter: number;
}

export class DistributedRateLimiter {
  private static readonly DEFAULT_MAX_REQUESTS = 60;
  private static readonly DEFAULT_WINDOW_MINUTES = 1;
  
  /**
   * Check rate limit for a request
   */
  static async checkLimit(config: RateLimitConfig = {}): Promise<RateLimitResult> {
    try {
      // Get user session for identifier
      const { data: { user } } = await supabase.auth.getUser();
      
      const identifier = config.identifier || user?.id || 'anonymous';
      const endpoint = config.endpoint || 'global';
      const maxRequests = config.maxRequests || this.DEFAULT_MAX_REQUESTS;
      const windowMinutes = config.windowMinutes || this.DEFAULT_WINDOW_MINUTES;
      
      // Call the database function
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });
      
      if (error) {
        SecureLogger.error('Rate limit check failed:', error);
        // On error, allow the request but log it
        return {
          allowed: true,
          limit: maxRequests,
          remaining: maxRequests,
          resetAt: null,
          retryAfter: 0
        };
      }
      
      // Parse the response
      const result: RateLimitResult = {
        allowed: data.allowed,
        limit: data.limit,
        remaining: data.remaining,
        resetAt: data.reset_at ? new Date(data.reset_at) : null,
        retryAfter: data.retry_after || 0
      };
      
      // Log rate limit hit
      if (!result.allowed) {
        SecureLogger.warn('Rate limit exceeded', {
          identifier: identifier.substring(0, 8) + '...',
          endpoint,
          retryAfter: result.retryAfter
        });
      }
      
      return result;
    } catch (error) {
      SecureLogger.error('Rate limiter error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        limit: this.DEFAULT_MAX_REQUESTS,
        remaining: this.DEFAULT_MAX_REQUESTS,
        resetAt: null,
        retryAfter: 0
      };
    }
  }
  
  /**
   * Get current rate limit status without incrementing
   */
  static async getStatus(config: RateLimitConfig = {}): Promise<RateLimitResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const identifier = config.identifier || user?.id || 'anonymous';
      const endpoint = config.endpoint || 'global';
      
      const { data, error } = await supabase.rpc('get_rate_limit_status', {
        p_identifier: identifier,
        p_endpoint: endpoint
      });
      
      if (error) {
        SecureLogger.error('Rate limit status check failed:', error);
        return {
          allowed: true,
          limit: this.DEFAULT_MAX_REQUESTS,
          remaining: this.DEFAULT_MAX_REQUESTS,
          resetAt: null,
          retryAfter: 0
        };
      }
      
      return {
        allowed: data.remaining > 0,
        limit: data.limit,
        remaining: data.remaining,
        resetAt: data.reset_at ? new Date(data.reset_at) : null,
        retryAfter: 0
      };
    } catch (error) {
      SecureLogger.error('Rate limit status error:', error);
      return {
        allowed: true,
        limit: this.DEFAULT_MAX_REQUESTS,
        remaining: this.DEFAULT_MAX_REQUESTS,
        resetAt: null,
        retryAfter: 0
      };
    }
  }
  
  /**
   * Rate limit middleware for fetch requests
   */
  static async fetchWithRateLimit(
    url: string,
    options: RequestInit = {},
    rateLimitConfig?: RateLimitConfig
  ): Promise<Response> {
    // Extract endpoint from URL
    const endpoint = rateLimitConfig?.endpoint || new URL(url).pathname;
    
    // Check rate limit
    const rateLimit = await this.checkLimit({
      ...rateLimitConfig,
      endpoint
    });
    
    if (!rateLimit.allowed) {
      // Return rate limit error response
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: rateLimit.retryAfter,
          resetAt: rateLimit.resetAt
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt?.toISOString() || '',
            'Retry-After': rateLimit.retryAfter.toString()
          }
        }
      );
    }
    
    // Make the request
    const response = await fetch(url, options);
    
    // Add rate limit headers to response
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-RateLimit-Limit', rateLimit.limit.toString());
    newHeaders.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    if (rateLimit.resetAt) {
      newHeaders.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
  
  /**
   * Get rate limit status
   */
  static async getRateLimitStatus(config?: RateLimitConfig): Promise<RateLimitResult> {
    return await this.getStatus(config);
  }
  
  /**
   * Check and update rate limit
   */
  static async checkRateLimit(config?: RateLimitConfig): Promise<RateLimitResult> {
    return await this.checkLimit(config);
  }
  
  /**
   * Decorator for rate-limited functions
   */
  static rateLimited(config?: RateLimitConfig) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const rateLimit = await DistributedRateLimiter.checkLimit({
          ...config,
          endpoint: config?.endpoint || `${target.constructor.name}.${propertyKey}`
        });
        
        if (!rateLimit.allowed) {
          throw new Error(
            `Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds`
          );
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  }
}

// Import React for the hook
import React from 'react';

// Export convenience functions
export const checkRateLimit = DistributedRateLimiter.checkLimit.bind(DistributedRateLimiter);
export const getRateLimitStatus = DistributedRateLimiter.getStatus.bind(DistributedRateLimiter);
export const fetchWithRateLimit = DistributedRateLimiter.fetchWithRateLimit.bind(DistributedRateLimiter);
export const useRateLimit = DistributedRateLimiter.useRateLimit.bind(DistributedRateLimiter);
export const rateLimited = DistributedRateLimiter.rateLimited.bind(DistributedRateLimiter);