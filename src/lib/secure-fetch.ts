/**
 * Secure Fetch Wrapper
 * Adds security layers to all API calls
 */

import { apiSecurity, InputSanitizer, RequestValidator } from './api-security';
import { logger } from '@/services/logging/logger';
import { supabase } from '@/integrations/supabase/client';

interface SecureFetchOptions extends RequestInit {
  skipAuth?: boolean;
  skipSanitization?: boolean;
  timeout?: number;
  retries?: number;
  sanitizeResponse?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

/**
 * Create abort controller with timeout
 */
function createAbortController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true;
  }
  
  // Timeout errors
  if (error.name === 'AbortError') {
    return true;
  }
  
  // HTTP status codes that are retryable
  if (error.status) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.status);
  }
  
  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Secure fetch wrapper with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryConfig: RetryConfig
): Promise<Response> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Check if response is OK or if it's a client error (no retry needed)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error - might be retryable
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (lastError as any).status = response.status;
      
      if (!isRetryableError(lastError)) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error)) {
        throw error;
      }
    }
    
    // Don't sleep after the last attempt
    if (attempt < retryConfig.maxRetries) {
      const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
      logger.debug(`Retrying request (attempt ${attempt + 1}/${retryConfig.maxRetries})`, 'SecureFetch', {
        url,
        delay,
      });
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Secure fetch implementation
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const {
    skipAuth = false,
    skipSanitization = false,
    timeout = 30000,
    retries = DEFAULT_RETRY_CONFIG.maxRetries,
    sanitizeResponse = true,
    ...fetchOptions
  } = options;

  try {
    // Create a new URL object for validation
    const urlObject = new URL(url, window.location.origin);
    
    // Validate URL
    if (!InputSanitizer.isValidUrl(urlObject.href)) {
      throw new Error('Invalid URL');
    }

    // Prepare headers
    const headers = new Headers(fetchOptions.headers);
    
    // Add security headers
    if (!headers.has('Content-Type') && fetchOptions.body) {
      headers.set('Content-Type', 'application/json');
    }
    
    // Add authentication if not skipped
    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      }
    }

    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    // Sanitize request body
    let body = fetchOptions.body;
    if (body && !skipSanitization) {
      if (typeof body === 'string') {
        try {
          const parsed = JSON.parse(body);
          const sanitized = InputSanitizer.sanitizeObject(parsed);
          body = JSON.stringify(sanitized);
        } catch {
          // Not JSON, sanitize as string
          body = InputSanitizer.sanitizeString(body);
        }
      } else if (typeof body === 'object' && !(body instanceof FormData)) {
        body = JSON.stringify(InputSanitizer.sanitizeObject(body));
      }
    }

    // Create request object
    const request = new Request(url, {
      ...fetchOptions,
      headers,
      body,
    });

    // Validate request
    const validation = await apiSecurity.validateRequest(request);
    if (!validation.valid) {
      throw new Error(validation.error || 'Request validation failed');
    }

    // Create abort controller for timeout
    const controller = createAbortController(timeout);
    
    // Prepare fetch options with abort signal
    const finalOptions: RequestInit = {
      ...fetchOptions,
      headers,
      body,
      signal: controller.signal,
    };

    // Execute fetch with retry logic
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: retries,
    };
    
    const response = await fetchWithRetry(url, finalOptions, retryConfig);

    // Log the request
    logger.debug('API request completed', 'SecureFetch', {
      url: urlObject.pathname,
      method: fetchOptions.method || 'GET',
      status: response.status,
    });

    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      (error as any).status = response.status;
      (error as any).response = response;
      throw error;
    }

    return response;
  } catch (error) {
    logger.error('Secure fetch error', 'SecureFetch', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Secure JSON fetch helper
 */
export async function secureJsonFetch<T = any>(
  url: string,
  options: SecureFetchOptions = {}
): Promise<T> {
  const response = await secureFetch(url, options);
  const data = await response.json();
  
  // Optionally sanitize response data
  if (options.sanitizeResponse !== false) {
    return InputSanitizer.sanitizeObject(data) as T;
  }
  
  return data as T;
}

/**
 * API client with built-in security
 */
export class SecureAPIClient {
  private baseUrl: string;
  private defaultOptions: SecureFetchOptions;

  constructor(baseUrl: string, defaultOptions: SecureFetchOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions;
  }

  /**
   * GET request
   */
  async get<T = any>(path: string, options?: SecureFetchOptions): Promise<T> {
    return secureJsonFetch<T>(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(
    path: string,
    data?: any,
    options?: SecureFetchOptions
  ): Promise<T> {
    return secureJsonFetch<T>(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    path: string,
    data?: any,
    options?: SecureFetchOptions
  ): Promise<T> {
    return secureJsonFetch<T>(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    path: string,
    data?: any,
    options?: SecureFetchOptions
  ): Promise<T> {
    return secureJsonFetch<T>(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(path: string, options?: SecureFetchOptions): Promise<T> {
    return secureJsonFetch<T>(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload file
   */
  async upload<T = any>(
    path: string,
    file: File,
    options?: SecureFetchOptions
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await secureFetch(`${this.baseUrl}${path}`, {
      ...this.defaultOptions,
      ...options,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(options?.headers as any),
      },
    });
    
    return response.json();
  }
}

/**
 * Create a secure API client instance
 */
export function createSecureClient(
  baseUrl: string = import.meta.env.VITE_API_URL || '',
  options?: SecureFetchOptions
): SecureAPIClient {
  return new SecureAPIClient(baseUrl, options);
}

// Export default client
export const apiClient = createSecureClient();