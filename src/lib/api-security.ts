/**
 * API Security Enhancement Module
 * Implements additional security measures for API calls
 */

import { logger } from '@/services/logging/logger';

// Security configuration
const SECURITY_CONFIG = {
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 1000,
  maxPayloadSize: 5 * 1024 * 1024, // 5MB
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://study-flow-ai.vercel.app',
    import.meta.env.VITE_APP_URL,
  ].filter(Boolean),
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'auth',
    'authorization',
    'credit_card',
    'ssn',
    'private_key',
  ],
};

/**
 * Rate limiting implementation
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequests: number;

  constructor(maxRequests: number = SECURITY_CONFIG.maxRequestsPerMinute) {
    this.maxRequests = maxRequests;
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * Check if request should be allowed
   */
  public shouldAllow(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    if (recentRequests.length >= this.maxRequests) {
      logger.warn('Rate limit exceeded', 'RateLimiter', {
        identifier,
        requests: recentRequests.length,
        limit: this.maxRequests,
      });
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  public reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

/**
 * Input sanitization
 */
export class InputSanitizer {
  /**
   * Sanitize string input
   */
  public static sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    
    // Remove control characters except tabs and newlines
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  public static sanitizeObject(obj: any, depth: number = 0): any {
    const maxDepth = 10;
    
    if (depth > maxDepth) {
      logger.warn('Max sanitization depth reached', 'InputSanitizer');
      return null;
    }
    
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive fields
        if (SECURITY_CONFIG.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          continue;
        }
        
        const sanitizedKey = this.sanitizeString(key);
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
        }
      }
      return sanitized;
    }
    
    return null;
  }

  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  public static isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Escape HTML entities
   */
  public static escapeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
  }
}

/**
 * Request validator
 */
export class RequestValidator {
  /**
   * Validate request payload size
   */
  public static validatePayloadSize(payload: any): boolean {
    const size = JSON.stringify(payload).length;
    if (size > SECURITY_CONFIG.maxPayloadSize) {
      logger.error('Payload size exceeded', 'RequestValidator', {
        size,
        limit: SECURITY_CONFIG.maxPayloadSize,
      });
      return false;
    }
    return true;
  }

  /**
   * Validate request origin
   */
  public static validateOrigin(origin: string | undefined): boolean {
    if (!origin) {
      return true; // Allow requests without origin (e.g., mobile apps)
    }
    
    const isAllowed = SECURITY_CONFIG.allowedOrigins.some(allowed => {
      if (!allowed) return false;
      return origin === allowed || origin.startsWith(allowed);
    });
    
    if (!isAllowed) {
      logger.warn('Invalid origin', 'RequestValidator', { origin });
    }
    
    return isAllowed;
  }

  /**
   * Validate request headers
   */
  public static validateHeaders(headers: Headers): boolean {
    // Check for required security headers
    const contentType = headers.get('content-type');
    
    // For JSON requests, ensure proper content type
    if (contentType && !contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data')) {
      logger.warn('Invalid content type', 'RequestValidator', { contentType });
      return false;
    }
    
    return true;
  }
}

/**
 * API Security Manager
 */
export class APISecurityManager {
  private static instance: APISecurityManager;
  private rateLimiter: RateLimiter;
  private readonly sessionTokens: Map<string, number> = new Map();

  private constructor() {
    this.rateLimiter = new RateLimiter();
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupTokens(), 3600000);
  }

  public static getInstance(): APISecurityManager {
    if (!APISecurityManager.instance) {
      APISecurityManager.instance = new APISecurityManager();
    }
    return APISecurityManager.instance;
  }

  /**
   * Validate API request
   */
  public async validateRequest(
    request: Request,
    userId?: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check rate limiting
      const identifier = userId || request.headers.get('x-forwarded-for') || 'anonymous';
      if (!this.rateLimiter.shouldAllow(identifier)) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      // Validate origin
      const origin = request.headers.get('origin') || undefined;
      if (!RequestValidator.validateOrigin(origin)) {
        return { valid: false, error: 'Invalid origin' };
      }

      // Validate headers
      if (!RequestValidator.validateHeaders(request.headers)) {
        return { valid: false, error: 'Invalid headers' };
      }

      // Validate payload size for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const payload = await request.clone().json();
          if (!RequestValidator.validatePayloadSize(payload)) {
            return { valid: false, error: 'Payload too large' };
          }
        } catch (error) {
          // If JSON parsing fails, it might be form data
          logger.debug('Could not parse JSON payload', 'APISecurityManager', error);
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('Request validation error', 'APISecurityManager', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Generate secure token
   */
  public generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Store token with timestamp
    this.sessionTokens.set(token, Date.now());
    
    return token;
  }

  /**
   * Validate token
   */
  public validateToken(token: string): boolean {
    const timestamp = this.sessionTokens.get(token);
    if (!timestamp) {
      return false;
    }
    
    // Token expires after 24 hours
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > maxAge) {
      this.sessionTokens.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupTokens(): void {
    const maxAge = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    for (const [token, timestamp] of this.sessionTokens.entries()) {
      if (now - timestamp > maxAge) {
        this.sessionTokens.delete(token);
      }
    }
  }

  /**
   * Reset rate limit for a user
   */
  public resetRateLimit(identifier: string): void {
    this.rateLimiter.reset(identifier);
  }
}

/**
 * Content Security Policy builder
 */
export class CSPBuilder {
  private directives: Map<string, string[]> = new Map();

  constructor() {
    // Set default CSP directives
    this.directive('default-src', ["'self'"]);
    this.directive('script-src', ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://apis.google.com']);
    this.directive('style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    this.directive('font-src', ["'self'", 'https://fonts.gstatic.com']);
    this.directive('img-src', ["'self'", 'data:', 'blob:', 'https:']);
    this.directive('connect-src', ["'self'", 'https://*.supabase.co', 'https://api.openai.com']);
    this.directive('frame-src', ["'none'"]);
    this.directive('object-src', ["'none'"]);
    this.directive('base-uri', ["'self'"]);
    this.directive('form-action', ["'self'"]);
    this.directive('upgrade-insecure-requests', []);
  }

  /**
   * Add or update a directive
   */
  public directive(name: string, values: string[]): this {
    this.directives.set(name, values);
    return this;
  }

  /**
   * Build CSP string
   */
  public build(): string {
    const parts: string[] = [];
    
    for (const [directive, values] of this.directives.entries()) {
      if (values.length === 0) {
        parts.push(directive);
      } else {
        parts.push(`${directive} ${values.join(' ')}`);
      }
    }
    
    return parts.join('; ');
  }
}

// Export singleton instance
export const apiSecurity = APISecurityManager.getInstance();

// Export CSP header
export const defaultCSP = new CSPBuilder().build();