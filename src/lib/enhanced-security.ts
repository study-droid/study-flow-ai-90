/**
 * Enhanced Security Module with DOMPurify
 * Provides comprehensive XSS protection and input sanitization
 */

import DOMPurify from 'dompurify';
import { SecureLogger } from './secure-logger';

// Configure DOMPurify with strict settings
const purifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  FORCE_BODY: true,
  SANITIZE_DOM: true,
  KEEP_CONTENT: false,
  IN_PLACE: false
};

// Strict config for user input (no HTML at all)
const strictPurifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false
};

/**
 * Input validation and sanitization class
 */
export class SecurityValidator {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|INTO|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)\b)/gi,
    /('|"|;|--|\/\*|\*\/|xp_|sp_|0x)/gi,
    /(CAST|CONVERT|CHAR|NCHAR|VARCHAR|NVARCHAR|SUBSTRING|REPLACE)/gi
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /eval\(/gi,
    /expression\(/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  private static readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.\\/, 
    /%2e%2e%2f/gi,
    /%252e%252e%252f/gi
  ];

  private static readonly COMMAND_INJECTION_PATTERNS = [
    /[;&|`$()]/g,
    /\$\{.*\}/g
  ];

  /**
   * Sanitize HTML content for safe display
   */
  static sanitizeHTML(dirty: string, strict: boolean = false): string {
    if (!dirty || typeof dirty !== 'string') {
      return '';
    }

    try {
      const config = strict ? strictPurifyConfig : purifyConfig;
      const clean = DOMPurify.sanitize(dirty, config);
      
      // Log if content was modified
      if (import.meta.env.DEV && clean !== dirty) {
        SecureLogger.debug('Content sanitized', {
          originalLength: dirty.length,
          cleanLength: clean.length,
          removed: dirty.length - clean.length
        });
      }
      
      return clean;
    } catch (error) {
      SecureLogger.error('Sanitization error:', error);
      return '';
    }
  }

  /**
   * Sanitize user input for form fields
   */
  static sanitizeInput(input: string, type: 'text' | 'email' | 'url' | 'number' | 'alphanumeric' = 'text'): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // First, remove any HTML/scripts
    let sanitized = this.sanitizeHTML(input, true);

    // Apply type-specific sanitization
    switch (type) {
      case 'email':
        // Basic email sanitization
        sanitized = sanitized.toLowerCase().trim();
        sanitized = sanitized.replace(/[^a-z0-9.@_+-]/gi, '');
        break;
        
      case 'url':
        // URL sanitization
        try {
          const url = new URL(sanitized);
          if (['http:', 'https:'].includes(url.protocol)) {
            sanitized = url.href;
          } else {
            sanitized = '';
          }
        } catch {
          sanitized = '';
        }
        break;
        
      case 'number':
        // Number sanitization
        sanitized = sanitized.replace(/[^0-9.-]/g, '');
        break;
        
      case 'alphanumeric':
        // Alphanumeric only
        sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
        break;
        
      case 'text':
      default:
        // General text sanitization
        sanitized = sanitized.trim();
        // Remove control characters
        // eslint-disable-next-line no-control-regex
        sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        break;
    }

    return sanitized;
  }

  /**
   * Check for SQL injection attempts
   */
  static detectSQLInjection(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Check for XSS attempts
   */
  static detectXSS(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Check against known XSS patterns
    if (this.XSS_PATTERNS.some(pattern => pattern.test(input))) {
      return true;
    }

    // Check if DOMPurify would modify the content (indicates potential XSS)
    const sanitized = DOMPurify.sanitize(input, strictPurifyConfig);
    return sanitized !== input;
  }

  /**
   * Check for path traversal attempts
   */
  static detectPathTraversal(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Check for command injection attempts
   */
  static detectCommandInjection(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    return this.COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Comprehensive security validation
   */
  static validateInput(
    input: string,
    type: 'text' | 'email' | 'url' | 'number' | 'alphanumeric' = 'text',
    maxLength: number = 1000
  ): {
    valid: boolean;
    sanitized: string;
    threats: string[];
  } {
    const threats: string[] = [];

    // Check length
    if (input.length > maxLength) {
      threats.push(`Input exceeds maximum length of ${maxLength}`);
      input = input.substring(0, maxLength);
    }

    // Check for various injection attacks
    if (this.detectSQLInjection(input)) {
      threats.push('Potential SQL injection detected');
    }

    if (this.detectXSS(input)) {
      threats.push('Potential XSS attack detected');
    }

    if (this.detectPathTraversal(input)) {
      threats.push('Potential path traversal detected');
    }

    if (this.detectCommandInjection(input)) {
      threats.push('Potential command injection detected');
    }

    // Sanitize the input
    const sanitized = this.sanitizeInput(input, type);

    // Type-specific validation
    let valid = true;
    
    switch (type) {
      case 'email': {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        valid = emailRegex.test(sanitized);
        break;
      }
        
      case 'url':
        try {
          const url = new URL(sanitized);
          valid = ['http:', 'https:'].includes(url.protocol);
        } catch {
          valid = false;
        }
        break;
        
      case 'number':
        valid = !isNaN(Number(sanitized)) && sanitized !== '';
        break;
        
      case 'alphanumeric':
        valid = /^[a-zA-Z0-9\s]+$/.test(sanitized);
        break;
        
      default:
        valid = sanitized.length > 0;
    }

    // Log security threats if detected
    if (threats.length > 0 && import.meta.env.DEV) {
      SecureLogger.warn('Security threats detected', {
        type,
        threats,
        inputLength: input.length
      });
    }

    return {
      valid: valid && threats.length === 0,
      sanitized,
      threats
    };
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return 'unnamed';
    }

    // Remove path components
    fileName = fileName.replace(/^.*[\\/]/, '');
    
    // Remove dangerous characters
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Remove leading dots (hidden files)
    fileName = fileName.replace(/^\.+/, '');
    
    // Limit length
    if (fileName.length > 255) {
      const ext = fileName.match(/\.[^.]+$/)?.[0] || '';
      fileName = fileName.substring(0, 255 - ext.length) + ext;
    }

    return fileName || 'unnamed';
  }

  /**
   * Encode HTML entities
   */
  static encodeHTML(str: string): string {
    if (!str || typeof str !== 'string') {
      return '';
    }

    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return str.replace(/[&<>"'/]/g, char => htmlEntities[char]);
  }

  /**
   * Create safe JSON string
   */
  static safeJSONStringify(obj: Record<string, unknown>): string {
    try {
      // Remove circular references and functions
      const seen = new WeakSet();
      const sanitized = JSON.stringify(obj, (key, value) => {
        // Remove functions
        if (typeof value === 'function') {
          return undefined;
        }
        
        // Handle circular references
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        
        // Sanitize string values
        if (typeof value === 'string') {
          return this.sanitizeHTML(value, true);
        }
        
        return value;
      });
      
      return sanitized;
    } catch (error) {
      SecureLogger.error('JSON stringify error:', error);
      return '{}';
    }
  }

  /**
   * Validate and sanitize URL parameters
   */
  static sanitizeURLParams(params: URLSearchParams): URLSearchParams {
    const sanitized = new URLSearchParams();
    
    for (const [key, value] of params.entries()) {
      // Sanitize both key and value
      const cleanKey = this.sanitizeInput(key, 'alphanumeric');
      const cleanValue = this.sanitizeInput(value, 'text');
      
      if (cleanKey && cleanValue) {
        sanitized.set(cleanKey, cleanValue);
      }
    }
    
    return sanitized;
  }

  /**
   * Content Security Policy nonce generator
   */
  static generateCSPNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

// Export convenience functions
export const sanitizeHTML = SecurityValidator.sanitizeHTML.bind(SecurityValidator);
export const sanitizeInput = SecurityValidator.sanitizeInput.bind(SecurityValidator);
export const validateInput = SecurityValidator.validateInput.bind(SecurityValidator);
export const sanitizeFileName = SecurityValidator.sanitizeFileName.bind(SecurityValidator);
export const encodeHTML = SecurityValidator.encodeHTML.bind(SecurityValidator);

/**
 * Initialize security features
 */
export const initializeSecurity = () => {
  // Generate nonce for this session
  const nonce = SecurityValidator.generateCSPNonce();
  
  // TEMPORARILY DISABLED CSP IN DEVELOPMENT
  // The CSP is blocking localhost connections needed for AI dev server
  if (import.meta.env.DEV) {
    console.log('CSP disabled in development mode for localhost AI server access');
    // Store nonce for any legitimate inline scripts that need it
    (window as unknown).__CSP_NONCE__ = nonce;
    
    // Still add other security headers
    const securityHeaders = [
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
    ];
    
    securityHeaders.forEach(header => {
      const meta = document.createElement('meta');
      meta.httpEquiv = header['http-equiv'];
      meta.content = header.content;
      document.head.appendChild(meta);
    });
    
    return; // Exit early in development
  }
  
  // Production CSP only
  if (!import.meta.env.DEV) {
    const cspMeta = document.createElement('meta');
    cspMeta.httpEquiv = 'Content-Security-Policy';
    
    // CSP policy with unsafe-inline for styles (needed for React and Tailwind)
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' https://cdn.jsdelivr.net https://vercel.live`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://*.googleapis.com https://ai.google.dev https://api.openai.com https://api.anthropic.com https://openrouter.ai",
      "media-src 'self' https://cdn.freesound.org https: blob:",
      "object-src 'none'",
      "frame-src 'self' https://vercel.live",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];
    
    cspMeta.content = cspDirectives.join('; ');
    document.head.appendChild(cspMeta);
  }
  
  // Security headers are already added above in production
  // Store nonce for any legitimate inline scripts that need it (production only)
  if (!import.meta.env.DEV) {
    (window as unknown).__CSP_NONCE__ = nonce;
    
    // Add additional security headers via meta tags
    const securityHeaders = [
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
      // Note: X-Frame-Options removed as it should be set via HTTP header, not meta tag
    ];
    
    securityHeaders.forEach(header => {
      const meta = document.createElement('meta');
      meta.httpEquiv = header['http-equiv'];
      meta.content = header.content;
      document.head.appendChild(meta);
    });
    
    SecureLogger.info('Security features initialized with strict CSP');
  }
};