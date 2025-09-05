/**
 * Validation utilities for common patterns
 */

/**
 * Email validation using RFC 5322 regex
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 25;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 25;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 25;
  }
  
  // Number or special character check
  if (!/[\d\W]/.test(password)) {
    feedback.push('Password must contain at least one number or special character');
  } else {
    score += 25;
  }
  
  return {
    isValid: feedback.length === 0,
    score,
    feedback
  };
}

/**
 * URL validation
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * File type validation
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * File size validation
 */
export function isValidFileSize(file: File, maxSizeInBytes: number): boolean {
  return file.size <= maxSizeInBytes;
}

/**
 * Required field validation
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Numeric range validation
 */
export function isInRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Date range validation
 */
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Generic form validation
 */
export type ValidationRule<T> = (value: T) => string | null;

export function validate<T>(
  value: T,
  rules: ValidationRule<T>[]
): string | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

/**
 * Common validation rules
 */
export const validationRules = {
  required: <T>(value: T): string | null =>
    isRequired(value) ? null : 'This field is required',
    
  email: (value: string): string | null =>
    isValidEmail(value) ? null : 'Please enter a valid email address',
    
  minLength: (min: number) => (value: string): string | null =>
    value.length >= min ? null : `Must be at least ${min} characters`,
    
  maxLength: (max: number) => (value: string): string | null =>
    value.length <= max ? null : `Must be no more than ${max} characters`,
    
  pattern: (regex: RegExp, message: string) => (value: string): string | null =>
    regex.test(value) ? null : message
};