/**
 * Input Validation Configuration and Utilities
 * Defines max lengths and validation rules for all form inputs
 */

import { validateInput } from './enhanced-security';

// Input length constraints
export const INPUT_LIMITS = {
  // User inputs
  email: { min: 5, max: 255 },
  password: { min: 8, max: 128 },
  displayName: { min: 1, max: 50 },
  username: { min: 3, max: 30 },
  
  // Content inputs
  title: { min: 1, max: 200 },
  description: { min: 0, max: 1000 },
  shortText: { min: 1, max: 100 },
  longText: { min: 0, max: 5000 },
  richText: { min: 0, max: 10000 },
  
  // Task/Study inputs
  taskName: { min: 1, max: 200 },
  taskDescription: { min: 0, max: 1000 },
  subjectName: { min: 1, max: 100 },
  topicName: { min: 1, max: 200 },
  notes: { min: 0, max: 5000 },
  
  // Flashcard inputs
  flashcardQuestion: { min: 1, max: 500 },
  flashcardAnswer: { min: 1, max: 1000 },
  
  // Search inputs
  searchQuery: { min: 1, max: 100 },
  tags: { min: 1, max: 50 },
  
  // File inputs
  fileName: { min: 1, max: 255 },
  fileDescription: { min: 0, max: 500 },
  
  // URL inputs
  url: { min: 10, max: 2048 },
  
  // Numbers
  percentage: { min: 0, max: 100 },
  score: { min: 0, max: 1000 },
  duration: { min: 1, max: 1440 }, // minutes in a day
  count: { min: 0, max: 9999 }
} as const;

/**
 * Validation rules for different input types
 */
export const VALIDATION_RULES = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Please enter a valid email address'
  },
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message: 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character'
  },
  username: {
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    message: 'Username must be 3-30 characters and contain only letters, numbers, underscore and hyphen'
  },
  url: {
    pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
    message: 'Please enter a valid URL'
  },
  alphanumeric: {
    pattern: /^[a-zA-Z0-9\s]+$/,
    message: 'Only letters, numbers and spaces are allowed'
  }
} as const;

/**
 * Input validation helper
 */
export class InputValidator {
  /**
   * Validate input with length and pattern checks
   */
  static validate(
    value: string,
    type: keyof typeof INPUT_LIMITS,
    customPattern?: RegExp
  ): {
    valid: boolean;
    error?: string;
    sanitized: string;
  } {
    const limits = INPUT_LIMITS[type];
    
    // Check if input exists for required fields
    if (!value && limits.min > 0) {
      return {
        valid: false,
        error: 'This field is required',
        sanitized: ''
      };
    }
    
    // Perform security validation
    const securityCheck = validateInput(
      value,
      this.getInputType(type),
      limits.max
    );
    
    if (!securityCheck.valid) {
      return {
        valid: false,
        error: securityCheck.threats[0] || 'Invalid input detected',
        sanitized: securityCheck.sanitized
      };
    }
    
    // Check length constraints
    if (securityCheck.sanitized.length < limits.min) {
      return {
        valid: false,
        error: `Must be at least ${limits.min} characters`,
        sanitized: securityCheck.sanitized
      };
    }
    
    if (securityCheck.sanitized.length > limits.max) {
      return {
        valid: false,
        error: `Must not exceed ${limits.max} characters`,
        sanitized: securityCheck.sanitized.substring(0, limits.max)
      };
    }
    
    // Check pattern if provided
    if (customPattern && !customPattern.test(securityCheck.sanitized)) {
      return {
        valid: false,
        error: 'Invalid format',
        sanitized: securityCheck.sanitized
      };
    }
    
    // Check specific validation rules
    const rule = this.getValidationRule(type);
    if (rule && !rule.pattern.test(securityCheck.sanitized)) {
      return {
        valid: false,
        error: rule.message,
        sanitized: securityCheck.sanitized
      };
    }
    
    return {
      valid: true,
      sanitized: securityCheck.sanitized
    };
  }
  
  /**
   * Get input type for security validation
   */
  private static getInputType(
    type: keyof typeof INPUT_LIMITS
  ): 'text' | 'email' | 'url' | 'number' | 'alphanumeric' {
    switch (type) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'percentage':
      case 'score':
      case 'duration':
      case 'count':
        return 'number';
      case 'username':
      case 'tags':
        return 'alphanumeric';
      default:
        return 'text';
    }
  }
  
  /**
   * Get validation rule for input type
   */
  private static getValidationRule(
    type: keyof typeof INPUT_LIMITS
  ): typeof VALIDATION_RULES[keyof typeof VALIDATION_RULES] | undefined {
    switch (type) {
      case 'email':
        return VALIDATION_RULES.email;
      case 'password':
        return VALIDATION_RULES.password;
      case 'username':
        return VALIDATION_RULES.username;
      case 'url':
        return VALIDATION_RULES.url;
      default:
        return undefined;
    }
  }
  
  /**
   * Validate multiple fields at once
   */
  static validateFields(
    fields: Record<string, { value: string; type: keyof typeof INPUT_LIMITS }>
  ): {
    valid: boolean;
    errors: Record<string, string>;
    sanitized: Record<string, string>;
  } {
    const errors: Record<string, string> = {};
    const sanitized: Record<string, string> = {};
    let valid = true;
    
    for (const [key, field] of Object.entries(fields)) {
      const result = this.validate(field.value, field.type);
      
      if (!result.valid) {
        valid = false;
        errors[key] = result.error || 'Invalid input';
      }
      
      sanitized[key] = result.sanitized;
    }
    
    return { valid, errors, sanitized };
  }
  
  /**
   * Create HTML input attributes for validation
   */
  static getInputAttributes(type: keyof typeof INPUT_LIMITS): {
    minLength?: number;
    maxLength: number;
    pattern?: string;
    required?: boolean;
    type?: string;
  } {
    const limits = INPUT_LIMITS[type];
    const rule = this.getValidationRule(type);
    
    return {
      minLength: limits.min > 0 ? limits.min : undefined,
      maxLength: limits.max,
      pattern: rule?.pattern.source,
      required: limits.min > 0,
      type: this.getHTMLInputType(type)
    };
  }
  
  /**
   * Get HTML input type
   */
  private static getHTMLInputType(type: keyof typeof INPUT_LIMITS): string {
    switch (type) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'url':
        return 'url';
      case 'percentage':
      case 'score':
      case 'duration':
      case 'count':
        return 'number';
      default:
        return 'text';
    }
  }
  
  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Get remaining characters for input
   */
  static getRemainingChars(
    value: string,
    type: keyof typeof INPUT_LIMITS
  ): number {
    const limits = INPUT_LIMITS[type];
    return Math.max(0, limits.max - value.length);
  }
  
  /**
   * Check if input is within limits
   */
  static isWithinLimits(
    value: string,
    type: keyof typeof INPUT_LIMITS
  ): boolean {
    const limits = INPUT_LIMITS[type];
    return value.length >= limits.min && value.length <= limits.max;
  }
}