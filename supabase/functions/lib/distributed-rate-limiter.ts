/**
 * Server-side Distributed Rate Limiter for Edge Functions
 * Uses Supabase database for consistent rate limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SecureLogger } from './secure-logger.ts';

export interface RateLimitOptions {
  identifier: string;
  endpoint: string;
  maxRequests?: number;
  windowMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date | null;
  retryAfter: number;
}

export class EdgeRateLimiter {
  private static supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  /**
   * Check and update rate limit
   */
  static async checkLimit(options: RateLimitOptions): Promise<RateLimitResult> {
    try {
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_identifier: options.identifier,
        p_endpoint: options.endpoint,
        p_max_requests: options.maxRequests || 60,
        p_window_minutes: options.windowMinutes || 1
      });
      
      if (error) {
        SecureLogger.error('Rate limit check failed', error);
        // Allow on error but log
        return {
          allowed: true,
          limit: options.maxRequests || 60,
          remaining: options.maxRequests || 60,
          resetAt: null,
          retryAfter: 0
        };
      }
      
      const result: RateLimitResult = {
        allowed: data.allowed,
        limit: data.limit,
        remaining: data.remaining,
        resetAt: data.reset_at ? new Date(data.reset_at) : null,
        retryAfter: data.retry_after || 0
      };
      
      if (!result.allowed) {
        SecureLogger.warn('Rate limit exceeded', {
          identifier: options.identifier.substring(0, 8) + '...',
          endpoint: options.endpoint,
          retryAfter: result.retryAfter
        });
      }
      
      return result;
    } catch (error) {
      SecureLogger.error('Rate limiter error', error);
      // Allow on error
      return {
        allowed: true,
        limit: options.maxRequests || 60,
        remaining: options.maxRequests || 60,
        resetAt: null,
        retryAfter: 0
      };
    }
  }
  
  /**
   * Rate limiting middleware for edge functions
   */
  static async middleware(
    req: Request,
    options: Partial<RateLimitOptions> = {}
  ): Promise<Response | null> {
    // Extract identifier (user ID from JWT or IP)
    const authHeader = req.headers.get('Authorization');
    let identifier = 'anonymous';
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await this.supabase.auth.getUser(token);
        if (user) {
          identifier = user.id;
        }
      } catch {
        // Use IP as fallback
        identifier = req.headers.get('CF-Connecting-IP') || 
                    req.headers.get('X-Forwarded-For') || 
                    'unknown';
      }
    } else {
      // Use IP for anonymous users
      identifier = req.headers.get('CF-Connecting-IP') || 
                  req.headers.get('X-Forwarded-For') || 
                  'unknown';
    }
    
    // Extract endpoint from URL
    const url = new URL(req.url);
    const endpoint = options.endpoint || url.pathname;
    
    // Check rate limit
    const rateLimit = await this.checkLimit({
      identifier,
      endpoint,
      maxRequests: options.maxRequests,
      windowMinutes: options.windowMinutes
    });
    
    // If rate limit exceeded, return 429 response
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please retry after ${rateLimit.retryAfter} seconds`,
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
    
    // Add rate limit headers to be included in response
    req.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    req.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    if (rateLimit.resetAt) {
      req.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
    }
    
    // Continue with request
    return null;
  }
  
  /**
   * Add rate limit headers to response
   */
  static addRateLimitHeaders(
    response: Response,
    rateLimit: RateLimitResult
  ): Response {
    const headers = new Headers(response.headers);
    
    headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    if (rateLimit.resetAt) {
      headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
    }
    if (!rateLimit.allowed) {
      headers.set('Retry-After', rateLimit.retryAfter.toString());
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
}

// Export convenience functions
export const checkRateLimit = EdgeRateLimiter.checkLimit.bind(EdgeRateLimiter);
export const rateLimitMiddleware = EdgeRateLimiter.middleware.bind(EdgeRateLimiter);
export const addRateLimitHeaders = EdgeRateLimiter.addRateLimitHeaders.bind(EdgeRateLimiter);