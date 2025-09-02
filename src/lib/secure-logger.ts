/**
 * Secure Logging Utility
 * Sanitizes sensitive data before logging to prevent information leakage
 */

export class SecureLogger {
  private static readonly sensitivePatterns = [
    /api[_-]?key/gi,
    /password/gi,
    /token/gi,
    /secret/gi,
    /authorization/gi,
    /bearer/gi,
    /credential/gi,
    /private[_-]?key/gi,
    /access[_-]?token/gi,
    /refresh[_-]?token/gi,
    /session[_-]?id/gi,
    /csrf/gi,
    /cookie/gi
  ];

  private static readonly sensitiveValuePatterns = [
    /^sk-[A-Za-z0-9]{48}$/,  // OpenAI API keys
    /^AIza[A-Za-z0-9_-]{35}$/, // Google API keys
    /^[A-Za-z0-9]{32,}$/,      // Generic long tokens
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT tokens
  ];

  /**
   * Check if a key name indicates sensitive data
   */
  private static isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Check if a value looks like sensitive data
   */
  private static isSensitiveValue(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    
    // Check if it matches known sensitive patterns
    if (this.sensitiveValuePatterns.some(pattern => pattern.test(value))) {
      return true;
    }
    
    // Check if it's a long string that might be a token
    if (value.length > 30 && /^[A-Za-z0-9_-]+$/.test(value)) {
      return true;
    }
    
    return false;
  }

  /**
   * Redact sensitive information from a string
   */
  private static redactString(text: string): string {
    // Redact API keys and tokens
    let redacted = text.replace(/[A-Za-z0-9]{32,}/g, (match) => {
      if (this.isSensitiveValue(match)) {
        return `[REDACTED_${match.slice(0, 4)}...${match.slice(-4)}]`;
      }
      return match;
    });
    
    // Redact email addresses (keep domain for debugging)
    redacted = redacted.replace(
      /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      (match, local, domain) => `[EMAIL_***@${domain}]`
    );
    
    // Redact credit card numbers
    redacted = redacted.replace(
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      '[REDACTED_CARD]'
    );
    
    // Redact SSN-like patterns
    redacted = redacted.replace(
      /\b\d{3}-\d{2}-\d{4}\b/g,
      '[REDACTED_SSN]'
    );
    
    return redacted;
  }

  /**
   * Sanitize an object or value for logging
   */
  static sanitize(data: any, depth: number = 0): unknown {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[MAX_DEPTH_EXCEEDED]';
    }
    
    // Handle null/undefined
    if (data == null) {
      return data;
    }
    
    // Handle strings
    if (typeof data === 'string') {
      return this.redactString(data);
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, depth + 1));
    }
    
    // Handle objects
    if (typeof data === 'object') {
      const sanitized: any = {};
      
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Check if the key indicates sensitive data
          if (this.isSensitiveKey(key)) {
            sanitized[key] = '[REDACTED]';
          } else if (this.isSensitiveValue(data[key])) {
            sanitized[key] = '[REDACTED_VALUE]';
          } else {
            sanitized[key] = this.sanitize(data[key], depth + 1);
          }
        }
      }
      
      return sanitized;
    }
    
    // Return primitives as-is
    return data;
  }

  /**
   * Safe console.log replacement
   */
  static log(...args: unknown[]): void {
    if (import.meta.env.PROD) {
      // In production, don't log at all unless explicitly enabled
      if (!import.meta.env.VITE_ENABLE_PRODUCTION_LOGS) {
        return;
      }
    }
    
    const sanitizedArgs = args.map(arg => this.sanitize(arg));
    console.log(...sanitizedArgs);
  }

  /**
   * Safe console.error replacement
   */
  static error(...args: unknown[]): void {
    const sanitizedArgs = args.map(arg => this.sanitize(arg));
    console.error(...sanitizedArgs);
  }

  /**
   * Safe console.warn replacement
   */
  static warn(...args: unknown[]): void {
    if (import.meta.env.PROD) {
      // In production, only log warnings if enabled
      if (!import.meta.env.VITE_ENABLE_PRODUCTION_LOGS) {
        return;
      }
    }
    
    const sanitizedArgs = args.map(arg => this.sanitize(arg));
    console.warn(...sanitizedArgs);
  }

  /**
   * Safe console.info replacement
   */
  static info(...args: unknown[]): void {
    if (import.meta.env.PROD) {
      // In production, don't log info unless explicitly enabled
      if (!import.meta.env.VITE_ENABLE_PRODUCTION_LOGS) {
        return;
      }
    }
    
    const sanitizedArgs = args.map(arg => this.sanitize(arg));
    console.info(...sanitizedArgs);
  }

  /**
   * Safe console.debug replacement
   */
  static debug(...args: unknown[]): void {
    if (import.meta.env.PROD) {
      // Never log debug in production
      return;
    }
    
    const sanitizedArgs = args.map(arg => this.sanitize(arg));
    console.debug(...sanitizedArgs);
  }

  /**
   * Create a sanitized error object for logging
   */
  static sanitizeError(error: any): object {
    if (!error) return { error: 'Unknown error' };
    
    const sanitized: any = {
      message: this.redactString(error.message || 'Unknown error'),
      name: error.name || 'Error',
      code: error.code,
    };
    
    // Only include stack trace in development
    if (import.meta.env.DEV && error.stack) {
      sanitized.stack = this.redactString(error.stack);
    }
    
    // Sanitize any additional properties
    for (const key in error) {
      if (!['message', 'name', 'code', 'stack'].includes(key)) {
        sanitized[key] = this.sanitize(error[key]);
      }
    }
    
    return sanitized;
  }
}

// Export convenience methods
export const secureLog = SecureLogger.log.bind(SecureLogger);
export const secureError = SecureLogger.error.bind(SecureLogger);
export const secureWarn = SecureLogger.warn.bind(SecureLogger);
export const secureInfo = SecureLogger.info.bind(SecureLogger);
export const secureDebug = SecureLogger.debug.bind(SecureLogger);