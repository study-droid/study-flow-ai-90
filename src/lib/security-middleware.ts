/**
 * Security middleware and utilities for production environment
 * Comprehensive security measures including rate limiting, input sanitization, and CSRF protection
 */

import { config, log } from '@/lib/config';
import { createAuditLog } from '@/lib/security';
import { validateData } from '@/lib/validation-schemas';
import { z } from 'zod';

// Rate limiting implementation
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.requests.entries()) {
        if (now > data.resetTime) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  check(identifier: string, limit: number = 60, windowMs: number = 60000): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / windowMs)}`;
    const existing = this.requests.get(key);

    if (!existing || now > existing.resetTime) {
      const resetTime = now + windowMs;
      this.requests.set(key, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: existing.resetTime };
    }

    existing.count++;
    return { allowed: true, remaining: limit - existing.count, resetTime: existing.resetTime };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Input sanitization utilities
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeText = (input: string): string => {
  return input
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

export const sanitizeFileName = (input: string): string => {
  return input
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
};

// Content Security Policy helper
export const generateCSPHeader = (): string => {
  const { cspSources } = config.security;
  
  const directives = [
    `default-src 'self'`,
    `script-src ${cspSources.script.join(' ')}`,
    `style-src ${cspSources.style.join(' ')}`,
    `img-src ${cspSources.img.join(' ')}`,
    `connect-src ${cspSources.connect.join(' ')}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`
  ];

  return directives.join('; ');
};

// CSRF token management
class CSRFTokenManager {
  private tokens: Map<string, { token: string; expires: number }> = new Map();

  generateToken(userId: string): string {
    const token = crypto.randomUUID();
    const expires = Date.now() + (30 * 60 * 1000); // 30 minutes
    
    this.tokens.set(userId, { token, expires });
    
    // Clean up expired tokens
    setTimeout(() => {
      const stored = this.tokens.get(userId);
      if (stored && stored.token === token && Date.now() > stored.expires) {
        this.tokens.delete(userId);
      }
    }, expires - Date.now());
    
    return token;
  }

  validateToken(userId: string, token: string): boolean {
    const stored = this.tokens.get(userId);
    
    if (!stored) {
      log.warn(`CSRF validation failed: No token found for user ${userId}`);
      return false;
    }
    
    if (Date.now() > stored.expires) {
      this.tokens.delete(userId);
      log.warn(`CSRF validation failed: Token expired for user ${userId}`);
      return false;
    }
    
    if (stored.token !== token) {
      log.warn(`CSRF validation failed: Token mismatch for user ${userId}`);
      return false;
    }
    
    return true;
  }

  revokeToken(userId: string): void {
    this.tokens.delete(userId);
  }
}

export const csrfTokenManager = new CSRFTokenManager();

// Request validation middleware
export interface SecurityMiddlewareOptions {
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  validateSchema?: z.ZodSchema<unknown>;
  requireCSRF?: boolean;
  auditLog?: boolean;
  sanitizeInput?: boolean;
}

export const securityMiddleware = (
  userId: string,
  operation: string,
  data?: any,
  options: SecurityMiddlewareOptions = {}
): {
  allowed: boolean;
  error?: string;
  sanitizedData?: any;
  csrfToken?: string;
} => {
  try {
    const {
      rateLimit = { requests: config.security.rateLimitRequestsPerMinute, windowMs: 60000 },
      validateSchema,
      requireCSRF = false,
      auditLog = true,
      sanitizeInput = true
    } = options;

    // Rate limiting check
    const rateLimitResult = rateLimiter.check(
      `${userId}:${operation}`,
      rateLimit.requests,
      rateLimit.windowMs
    );

    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit exceeded for user ${userId} on operation ${operation}`);
      return {
        allowed: false,
        error: 'Rate limit exceeded. Please try again later.'
      };
    }

    // CSRF token validation
    if (requireCSRF && data?.csrfToken) {
      if (!csrfTokenManager.validateToken(userId, data.csrfToken)) {
        return {
          allowed: false,
          error: 'Invalid CSRF token'
        };
      }
    }

    // Input validation
    let sanitizedData = data;
    if (validateSchema && data) {
      try {
        sanitizedData = validateData(validateSchema, data);
      } catch (error) {
        log.warn(`Validation failed for user ${userId} on operation ${operation}: ${error.message}`);
        return {
          allowed: false,
          error: `Validation error: ${error.message}`
        };
      }
    }

    // Input sanitization
    if (sanitizeInput && sanitizedData && typeof sanitizedData === 'object') {
      sanitizedData = sanitizeObjectInputs(sanitizedData);
    }

    // Audit logging
    if (auditLog) {
      createAuditLog(`security_check_${operation}`, {
        userId,
        operation,
        rateLimitRemaining: rateLimitResult.remaining,
        dataSize: data ? JSON.stringify(data).length : 0
      });
    }

    // Generate new CSRF token for next request
    const csrfToken = csrfTokenManager.generateToken(userId);

    return {
      allowed: true,
      sanitizedData,
      csrfToken
    };

  } catch (error) {
    log.error(`Security middleware error for user ${userId} on operation ${operation}:`, error);
    return {
      allowed: false,
      error: 'Security validation failed'
    };
  }
};

// Deep sanitization of object inputs
const sanitizeObjectInputs = (obj: Record<string, unknown>): any => {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectInputs);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeObjectInputs(value);
    }
    return sanitized;
  }
  
  return obj;
};

// File upload security
export const validateFileUpload = (file: File): {
  valid: boolean;
  error?: string;
} => {
  const maxSize = config.security.maxFileUploadSize;
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv'
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed'
    };
  }

  // Check file name
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    return {
      valid: false,
      error: 'File name contains invalid characters'
    };
  }

  return { valid: true };
};

// Session security utilities
export const generateSecureSessionId = (): string => {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
};

export const hashSensitiveData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// IP address validation and geolocation checking
export const validateIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Security headers for HTTP responses
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': generateCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
};

// Anomaly detection for suspicious activity
export const detectAnomalousActivity = (
  userId: string,
  activity: {
    operation: string;
    userAgent?: string;
    ipAddress?: string;
    requestSize?: number;
    timestamp: number;
  }
): {
  suspicious: boolean;
  reasons: string[];
} => {
  const reasons: string[] = [];

  // Check for unusual request patterns
  const recentRequests = rateLimiter.check(`anomaly_${userId}`, 1000, 60000);
  if (recentRequests.remaining < 900) {
    reasons.push('High request frequency');
  }

  // Check request size
  if (activity.requestSize && activity.requestSize > 1024 * 1024) {
    reasons.push('Unusually large request');
  }

  // Check for suspicious user agents
  if (activity.userAgent) {
    const suspiciousAgents = ['curl', 'wget', 'python', 'bot', 'crawler'];
    if (suspiciousAgents.some(agent => 
      activity.userAgent!.toLowerCase().includes(agent)
    )) {
      reasons.push('Suspicious user agent');
    }
  }

  // Check for rapid operations
  const rapidCheck = rateLimiter.check(`rapid_${userId}`, 5, 1000);
  if (!rapidCheck.allowed) {
    reasons.push('Rapid successive operations');
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  };
};

// Cleanup function for when the application shuts down
export const cleanupSecurity = () => {
  rateLimiter.destroy();
};

// Auto-cleanup on module unload (browser environment)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupSecurity();
  });
}

// Export security constants
export const SECURITY_CONSTANTS = {
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRED_COMPLEXITY: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BATCH_SIZE: 50,
} as const;