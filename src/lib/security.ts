/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive input validation for user data
 */

import DOMPurify from 'dompurify';

export class InputValidator {
  // Email validation with strict regex
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Password strength validation
  static isStrongPassword(password: string): boolean {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(content: string): string {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: []
    });
  }

  // Validate and sanitize user names
  static sanitizeName(name: string): string {
    return name
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous chars
      .substring(0, 100); // Limit length
  }

  // Validate UUID format
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Sanitize search queries
  static sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      .replace(/[<>'"&\\]/g, '') // Remove XSS chars
      .replace(/[%_]/g, '\\$&') // Escape SQL wildcards
      .substring(0, 200); // Limit length
  }

  // Validate file uploads
  static isValidFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return extension ? allowedTypes.includes(extension) : false;
  }

  // Rate limiting helper
  static createRateLimiter(maxRequests: number, windowMs: number) {
    const requests = new Map<string, number[]>();
    
    return (identifier: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      validRequests.push(now);
      requests.set(identifier, validRequests);
      return true; // Request allowed
    };
  }

  // Validate and sanitize study session data
  static validateStudySession(data: any): {
    valid: boolean;
    errors: string[];
    sanitizedData?: any;
  } {
    const errors: string[] = [];
    const sanitizedData: any = {};

    // Validate title
    if (!data.title || typeof data.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else {
      sanitizedData.title = this.sanitizeName(data.title);
    }

    // Validate duration
    if (data.duration !== undefined) {
      const duration = parseInt(data.duration);
      if (isNaN(duration) || duration < 0 || duration > 86400) { // Max 24 hours
        errors.push('Duration must be a valid number between 0 and 86400 seconds');
      } else {
        sanitizedData.duration = duration;
      }
    }

    // Validate subject_id if provided
    if (data.subject_id && !this.isValidUUID(data.subject_id)) {
      errors.push('Subject ID must be a valid UUID');
    } else if (data.subject_id) {
      sanitizedData.subject_id = data.subject_id;
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    };
  }
}

// Rate limiters for different operations
export const authRateLimiter = InputValidator.createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const apiRateLimiter = InputValidator.createRateLimiter(100, 60 * 1000); // 100 requests per minute
export const aiRateLimiter = InputValidator.createRateLimiter(10, 60 * 1000); // 10 AI requests per minute