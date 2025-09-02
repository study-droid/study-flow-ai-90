// Security utilities and helpers
import { log } from '@/lib/config';
import DOMPurify from 'dompurify';

// Rate limiting store (in-memory for client-side simulation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting function
export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const stored = rateLimitStore.get(key);
  
  if (!stored || now > stored.resetTime) {
    // Reset window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }
  
  if (stored.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: stored.resetTime };
  }
  
  stored.count++;
  rateLimitStore.set(key, stored);
  return { allowed: true, remaining: limit - stored.count, resetTime: stored.resetTime };
};

// Content Security Policy headers
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': [
    "'self'", 
    'https://*.supabase.co', 
    'wss://*.supabase.co',
    'https://generativelanguage.googleapis.com',
    'https://*.googleapis.com',
    'https://ai.google.dev'
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// Generate CSP header string
export const generateCSPHeader = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

// Security headers that should be set
export const SECURITY_HEADERS = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  hexColor: /^#[0-9A-F]{6}$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  time24: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  safeText: /^[a-zA-Z0-9\s.,!?'-]*$/,
};

// Secure random string generation
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include special characters');
  
  if (password.length >= 12) score += 1;
  
  const isStrong = score >= 4;
  
  return {
    score,
    feedback,
    isStrong,
  };
};

// Safe JSON parsing
export const safeJSONParse = <T>(input: string, fallback: T): T => {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
};

// URL validation
export const isValidURL = (url: string): boolean => {
  try {
    const parsedURL = new URL(url);
    return ['http:', 'https:'].includes(parsedURL.protocol);
  } catch {
    return false;
  }
};

// Prevent XSS in dynamic content - Using DOMPurify for secure sanitization
export const escapeHtml = (text: string): string => {
  // For plain text escaping (no HTML allowed)
  const div = document.createElement('div');
  div.textContent = text;
  return div.textContent || '';
};

// Sanitize HTML content safely
export const sanitizeHtml = (html: string, options?: DOMPurify.Config): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    ...options
  });
};

// Sanitize user input for display
export const sanitizeUserInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Session management helpers
export const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  renewThreshold: 60 * 60 * 1000, // Renew if less than 1 hour remaining
  idleTimeout: 30 * 60 * 1000, // 30 minutes idle timeout
};

// Activity tracking for session management
let lastActivity = Date.now();

export const updateLastActivity = (): void => {
  lastActivity = Date.now();
};

export const getIdleTime = (): number => {
  return Date.now() - lastActivity;
};

export const isSessionExpired = (): boolean => {
  return getIdleTime() > SESSION_CONFIG.idleTimeout;
};

// Audit logging helper
export const createAuditLog = (action: string, details: Record<string, any> = {}): void => {
  log.info('AUDIT_LOG:', {
    timestamp: new Date().toISOString(),
    action,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  });
};