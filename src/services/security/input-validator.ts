/**
 * Input Validation Service
 * Comprehensive input validation and sanitization for security
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';
import { logger } from '@/services/logging/logger';
import { auditLogger } from './audit-logger';

// Common validation schemas
export const ValidationSchemas = {
  // AI Message validation
  aiMessage: z.object({
    content: z.string()
      .min(1, 'Message cannot be empty')
      .max(10000, 'Message too long')
      .refine(
        (content) => !/<script|javascript:|data:|vbscript:/i.test(content),
        'Potentially malicious content detected'
      ),
    sessionId: z.string().uuid('Invalid session ID'),
    role: z.enum(['user', 'assistant', 'system']),
    metadata: z.object({
      timestamp: z.number().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    }).optional()
  }),

  // API Key validation
  apiKey: z.string()
    .min(10, 'API key too short')
    .max(500, 'API key too long')
    .refine(
      (key) => /^[a-zA-Z0-9\-_\.]+$/.test(key),
      'API key contains invalid characters'
    ),

  // User input validation
  userInput: z.string()
    .max(50000, 'Input too long')
    .refine(
      (input) => !/<script|javascript:|data:|vbscript:|on\w+=/i.test(input),
      'Potentially malicious content detected'
    ),

  // File upload validation
  fileUpload: z.object({
    name: z.string()
      .max(255, 'Filename too long')
      .refine(
        (name) => /^[a-zA-Z0-9\-_\.\s]+$/.test(name),
        'Invalid filename characters'
      ),
    size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
    type: z.string().refine(
      (type) => ['text/plain', 'text/markdown', 'application/json'].includes(type),
      'Invalid file type'
    )
  }),

  // URL validation
  url: z.string().url('Invalid URL format').refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    'Only HTTP/HTTPS URLs allowed'
  )
};

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: string[];
  sanitizedData?: T;
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripTags?: boolean;
  maxLength?: number;
}

export class InputValidator {
  private static instance: InputValidator;
  
  static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * Validate input against a Zod schema
   */
  validate<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): ValidationResult<T> {
    try {
      const result = schema.safeParse(data);
      
      if (result.success) {
        // Log successful validation for audit
        auditLogger.logSecurityEvent({
          type: 'input_validation',
          action: 'validation_success',
          context: context || 'unknown',
          metadata: { dataType: typeof data }
        });

        return {
          isValid: true,
          data: result.data,
          errors: [],
          sanitizedData: this.sanitizeData(result.data)
        };
      } else {
        // Log validation failure
        auditLogger.logSecurityEvent({
          type: 'input_validation',
          action: 'validation_failed',
          context: context || 'unknown',
          metadata: { 
            errors: result.error.errors.map(e => e.message),
            dataType: typeof data
          }
        });

        return {
          isValid: false,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
    } catch (error) {
      logger.error('Validation error', 'InputValidator', error);
      
      auditLogger.logSecurityEvent({
        type: 'input_validation',
        action: 'validation_error',
        context: context || 'unknown',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      return {
        isValid: false,
        errors: ['Validation failed due to internal error']
      };
    }
  }

  /**
   * Sanitize HTML content to prevent XSS
   */
  sanitizeHtml(content: string, options: SanitizationOptions = {}): string {
    try {
      const config = {
        ALLOWED_TAGS: options.allowedTags || [
          'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 
          'code', 'pre', 'a'
        ],
        ALLOWED_ATTR: options.allowedAttributes || {
          'a': ['href', 'title'],
          'code': ['class'],
          'pre': ['class']
        },
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
        ALLOW_DATA_ATTR: false,
        SANITIZE_DOM: true,
        KEEP_CONTENT: true
      };

      let sanitized = DOMPurify.sanitize(content, config);

      // Additional sanitization
      if (options.stripTags) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      }

      if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength) + '...';
      }

      // Log sanitization for audit
      if (sanitized !== content) {
        auditLogger.logSecurityEvent({
          type: 'content_sanitization',
          action: 'content_modified',
          metadata: { 
            originalLength: content.length,
            sanitizedLength: sanitized.length,
            tagsRemoved: content !== sanitized
          }
        });
      }

      return sanitized;
    } catch (error) {
      logger.error('HTML sanitization error', 'InputValidator', error);
      
      auditLogger.logSecurityEvent({
        type: 'content_sanitization',
        action: 'sanitization_error',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Return empty string on error for security
      return '';
    }
  }

  /**
   * Sanitize text content (remove potential script injections)
   */
  sanitizeText(text: string): string {
    try {
      // Remove potential script injections
      let sanitized = text
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

      // Remove null bytes and control characters
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // Normalize whitespace
      sanitized = sanitized.replace(/\s+/g, ' ').trim();

      return sanitized;
    } catch (error) {
      logger.error('Text sanitization error', 'InputValidator', error);
      return '';
    }
  }

  /**
   * Validate and sanitize AI message content
   */
  validateAIMessage(message: any): ValidationResult {
    const validation = this.validate(ValidationSchemas.aiMessage, message, 'ai_message');
    
    if (validation.isValid && validation.data) {
      // Additional sanitization for AI messages
      const sanitizedContent = this.sanitizeText(validation.data.content);
      
      return {
        ...validation,
        sanitizedData: {
          ...validation.data,
          content: sanitizedContent
        }
      };
    }

    return validation;
  }

  /**
   * Validate API key format and security
   */
  validateApiKey(key: string, provider?: string): ValidationResult<string> {
    const validation = this.validate(ValidationSchemas.apiKey, key, `api_key_${provider || 'unknown'}`);
    
    if (validation.isValid) {
      // Additional security checks for API keys
      const suspiciousPatterns = [
        /password/i,
        /secret/i,
        /token.*test/i,
        /fake/i,
        /demo/i
      ];

      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(key));
      
      if (isSuspicious) {
        auditLogger.logSecurityEvent({
          type: 'api_key_validation',
          action: 'suspicious_key_detected',
          context: provider || 'unknown',
          metadata: { keyLength: key.length }
        });

        return {
          isValid: false,
          errors: ['API key appears to be invalid or test key']
        };
      }
    }

    return validation;
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(file: File): ValidationResult {
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type
    };

    const validation = this.validate(ValidationSchemas.fileUpload, fileData, 'file_upload');
    
    if (validation.isValid) {
      // Additional security checks
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
      const hasExtension = dangerousExtensions.some(ext => 
        file.name.toLowerCase().endsWith(ext)
      );

      if (hasExtension) {
        auditLogger.logSecurityEvent({
          type: 'file_upload',
          action: 'dangerous_file_blocked',
          metadata: { filename: file.name, size: file.size }
        });

        return {
          isValid: false,
          errors: ['File type not allowed for security reasons']
        };
      }
    }

    return validation;
  }

  /**
   * Sanitize data recursively
   */
  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Rate limiting validation
   */
  validateRateLimit(userId: string, action: string, limit: number, windowMs: number): boolean {
    // This would integrate with a rate limiting service
    // For now, return true (implement actual rate limiting logic)
    return true;
  }

  /**
   * Validate URL for safety
   */
  validateUrl(url: string): ValidationResult<string> {
    const validation = this.validate(ValidationSchemas.url, url, 'url_validation');
    
    if (validation.isValid) {
      try {
        const parsed = new URL(url);
        
        // Block dangerous protocols and hosts
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
        const isBlocked = blockedHosts.some(host => 
          parsed.hostname.includes(host)
        );

        if (isBlocked) {
          auditLogger.logSecurityEvent({
            type: 'url_validation',
            action: 'blocked_url',
            metadata: { url: parsed.hostname }
          });

          return {
            isValid: false,
            errors: ['URL not allowed for security reasons']
          };
        }
      } catch (error) {
        return {
          isValid: false,
          errors: ['Invalid URL format']
        };
      }
    }

    return validation;
  }
}

// Export singleton instance
export const inputValidator = InputValidator.getInstance();