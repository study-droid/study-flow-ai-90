/**
 * API Error Interceptor and Response Handler
 * 
 * Provides centralized error handling, retry logic, timeout management,
 * and consistent error response formatting for all API calls.
 */

import { AppError, NetworkError, AuthenticationError, AuthorizationError, RateLimitError, NotFoundError } from '@/shared/utils/error';
import { logger } from '@/services/logging/logger';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';

export interface APIErrorContext {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  retryCount: number;
  timestamp: string;
  requestId: string;
}

export interface APIErrorResponse {
  error: AppError;
  context: APIErrorContext;
  canRetry: boolean;
  suggestedAction: 'retry' | 'authenticate' | 'fallback' | 'abort';
  fallbackData?: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: Error, attemptNumber: number) => boolean;
}

export interface TimeoutConfig {
  timeout: number;
  abortOnTimeout: boolean;
}

export class APIErrorInterceptor {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 2, // Reduced from 3 to minimize noise
    baseDelay: 1500, // Increased initial delay
    maxDelay: 8000, // Slightly reduced max delay
    retryCondition: (error, attempt) => {
      // Never retry authentication, authorization, or client errors
      if (error instanceof AuthenticationError || 
          error instanceof AuthorizationError ||
          (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500)) {
        return false;
      }
      
      // Don't retry if circuit breaker is explicitly OPEN (complete failure)
      if (error.message.includes('Circuit breaker is OPEN')) {
        return false;
      }
      
      // Limit retries for circuit breaker failures to reduce noise
      if (error.message.includes('Circuit breaker') && attempt >= 1) {
        return false;
      }
      
      // More selective retrying for network errors
      if (error instanceof NetworkError) {
        // Only retry timeout or server errors
        return (error.message.includes('timeout') || 
                error.message.includes('50')) && attempt < this.defaultRetryConfig.maxRetries;
      }
      
      return attempt < this.defaultRetryConfig.maxRetries;
    }
  };

  private readonly defaultTimeoutConfig: TimeoutConfig = {
    timeout: 30000, // 30 seconds
    abortOnTimeout: true
  };

  private requestCounter = 0;

  constructor() {
    // Set up global fetch interception for automatic error handling
    this.interceptFetch();
  }

  /**
   * Intercept global fetch to add automatic error handling
   */
  private interceptFetch(): void {
    const originalFetch = window.fetch;
    
    // Store original fetch for fallback services to bypass circuit breakers
    (globalThis as any).__originalFetch = originalFetch;
    
    window.fetch = async (...args): Promise<Response> => {
      const [url, options = {}] = args;
      const requestId = this.generateRequestId();
      
      try {
        // Apply circuit breaker based on URL
        const serviceName = this.getServiceNameFromUrl(url.toString());
        const circuitBreaker = circuitBreakerManager.getCircuitBreaker(serviceName);
        
        return await circuitBreaker.execute(async () => {
          return await this.fetchWithErrorHandling(url, options, requestId);
        });
        
      } catch (error) {
        // Convert to APIError if not already
        if (!(error instanceof AppError)) {
          const apiError = this.createAPIError(error as Error, url.toString(), options.method || 'GET');
          throw apiError;
        }
        throw error;
      }
    };
  }

  /**
   * Enhanced fetch with comprehensive error handling
   */
  private async fetchWithErrorHandling(
    url: RequestInfo | URL,
    options: RequestInit = {},
    requestId: string,
    retryConfig: RetryConfig = this.defaultRetryConfig,
    timeoutConfig: TimeoutConfig = this.defaultTimeoutConfig
  ): Promise<Response> {
    const urlString = url.toString();
    const method = options.method || 'GET';
    
    logger.info(`API Request: ${method} ${urlString}`, 'APIErrorInterceptor', { requestId });

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeRequestWithTimeout(url, options, timeoutConfig, requestId);
        
        // Handle HTTP error responses
        if (!response.ok) {
          const errorResponse = await this.handleHTTPError(response, urlString, method, requestId, attempt);
          lastError = errorResponse.error;
          
          // Check if we should retry
          if (errorResponse.canRetry && retryConfig.retryCondition) {
            const shouldRetry = retryConfig.retryCondition(lastError, attempt);
            if (shouldRetry && attempt < retryConfig.maxRetries) {
              const delay = this.calculateRetryDelay(attempt, retryConfig);
              // Only log retry warnings for final attempts or critical errors
              if (attempt === retryConfig.maxRetries - 1 || response.status >= 500) {
                logger.warn(`Retrying request after ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`, 'APIErrorInterceptor', {
                  requestId,
                  url: urlString.split('/').pop(), // Only log endpoint name
                  error: lastError.message.substring(0, 100) // Truncate error message
                });
              }
              await this.delay(delay);
              continue;
            }
          }
          
          throw lastError;
        }

        // Success response
        logger.info(`API Response: ${method} ${urlString} - ${response.status}`, 'APIErrorInterceptor', {
          requestId,
          status: response.status,
          attempt: attempt + 1
        });
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if we should retry network/timeout errors
        if (retryConfig.retryCondition && retryConfig.retryCondition(lastError, attempt)) {
          if (attempt < retryConfig.maxRetries) {
            const delay = this.calculateRetryDelay(attempt, retryConfig);
            // Only log if this is a critical retry or the final attempt
            // Only log circuit breaker retries on the final attempt to reduce noise
            if (attempt === retryConfig.maxRetries - 1 || 
               (lastError.message.includes('Circuit breaker') && attempt >= 1)) {
              logger.warn(`Retrying request after error (attempt ${attempt + 1}/${retryConfig.maxRetries})`, 'APIErrorInterceptor', {
                requestId,
                endpoint: urlString.split('/').pop(),
                errorType: lastError.message.includes('Circuit breaker') ? 'Circuit breaker protection' : 'Network error',
                delay
              });
            }
            await this.delay(delay);
            continue;
          }
        }
        
        throw lastError;
      }
    }

    // If we get here, all retries failed
    throw lastError || new NetworkError('All retry attempts failed');
  }

  /**
   * Execute request with timeout handling
   */
  private async executeRequestWithTimeout(
    url: RequestInfo | URL,
    options: RequestInit,
    timeoutConfig: TimeoutConfig,
    requestId: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (timeoutConfig.abortOnTimeout) {
        controller.abort();
      }
    }, timeoutConfig.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'X-Request-ID': requestId,
          'X-Timestamp': new Date().toISOString()
        }
      });

      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${timeoutConfig.timeout}ms`, {
          url: url.toString(),
          timeout: timeoutConfig.timeout,
          requestId
        });
      }
      
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHTTPError(
    response: Response,
    url: string,
    method: string,
    requestId: string,
    attempt: number
  ): Promise<APIErrorResponse> {
    let errorBody: any = null;
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    // Try to extract error details from response body
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text.substring(0, 200); // Limit error message length
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse error response body', 'APIErrorInterceptor', { 
        requestId, 
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error' 
      });
    }

    // Create appropriate error type based on status code
    let error: AppError;
    let canRetry = false;
    let suggestedAction: 'retry' | 'authenticate' | 'fallback' | 'abort' = 'abort';

    switch (response.status) {
      case 400:
        error = new AppError(errorMessage, 'BAD_REQUEST', 400, true, { errorBody, url, method });
        suggestedAction = 'abort';
        break;
        
      case 401:
        error = new AuthenticationError(errorMessage);
        suggestedAction = 'authenticate';
        break;
        
      case 403:
        error = new AuthorizationError(errorMessage);
        suggestedAction = 'authenticate';
        break;
        
      case 404:
        error = new NotFoundError('Resource', url);
        suggestedAction = 'fallback';
        break;
        
      case 408: // Request Timeout
      case 429: // Rate Limited
        if (response.status === 429) {
          error = new RateLimitError(errorMessage);
        } else {
          error = new NetworkError(errorMessage, { timeout: true });
        }
        canRetry = true;
        suggestedAction = 'retry';
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        error = new NetworkError(errorMessage, { 
          statusCode: response.status,
          isServerError: true,
          errorBody,
          url,
          method 
        });
        canRetry = true;
        suggestedAction = 'retry';
        break;
        
      default:
        error = new AppError(errorMessage, 'HTTP_ERROR', response.status, true, { 
          errorBody, 
          url, 
          method 
        });
        canRetry = response.status >= 500; // Only retry server errors
        suggestedAction = canRetry ? 'retry' : 'fallback';
    }

    const context: APIErrorContext = {
      url,
      method,
      headers: Object.fromEntries(response.headers.entries()),
      body: errorBody,
      retryCount: attempt,
      timestamp: new Date().toISOString(),
      requestId
    };

    logger.error(`API Error: ${method} ${url}`, 'APIErrorInterceptor', {
      status: response.status,
      message: errorMessage,
      context,
      canRetry,
      suggestedAction
    });

    return {
      error,
      context,
      canRetry,
      suggestedAction,
      fallbackData: this.getFallbackData(url, method)
    };
  }

  /**
   * Create API error from JavaScript error
   */
  private createAPIError(error: Error, url: string, method: string): AppError {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return new NetworkError('Network connection failed', { 
        originalError: error.message,
        url,
        method 
      });
    }

    if (error.name === 'AbortError') {
      return new NetworkError('Request was aborted', { 
        originalError: error.message,
        url,
        method,
        aborted: true 
      });
    }

    return new AppError(error.message, 'REQUEST_ERROR', 0, true, { 
      originalError: error.name,
      url,
      method,
      stack: error.stack 
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(2, attempt),
      config.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    this.requestCounter++;
    return `req_${Date.now()}_${this.requestCounter}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * Extract service name from URL for circuit breaker
   */
  private getServiceNameFromUrl(url: string): string {
    // Skip circuit breaker for AI services - use direct calls
    if (this.isAIService(url)) {
      return 'bypass-circuit-breaker';
    }
    
    // Modern DeepSeek AI Professional service
    if (url.includes('ai-tutor-professional')) {
      return 'edge-function-professional';
    }
    // Legacy AI services
    if (url.includes('deepseek-ai') || url.includes('ai-proxy') || url.includes('functions/v1')) {
      return 'edge-function-legacy';
    }
    // Direct DeepSeek API
    if (url.includes('api.deepseek.com')) {
      return 'deepseek-api';
    }
    // Database operations
    if (url.includes('supabase.co') && !url.includes('functions')) {
      return 'database';
    }
    // Semantic search and analytics
    if (url.includes('semantic-search') || url.includes('ai-study-analytics') || url.includes('ai-study-recommendations')) {
      return 'edge-function-analytics';
    }
    return 'generic-api';
  }

  /**
   * Check if URL is for AI service that should bypass interceptor
   */
  private isAIService(url: string): boolean {
    const aiServicePatterns = [
      '/ai-tutor-professional',
      '/deepseek-ai',
      'api.deepseek.com',
      '/ai-proxy',
      '/semantic-search'
    ];
    
    return aiServicePatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Get fallback data for failed requests
   */
  private getFallbackData(url: string, method: string): any {
    // Return appropriate fallback data based on the endpoint
    if (method === 'GET') {
      if (url.includes('/api/recommendations')) {
        return { recommendations: [], message: 'Using cached recommendations' };
      }
      if (url.includes('/api/sessions')) {
        return { sessions: [], message: 'No sessions available offline' };
      }
    }
    return null;
  }

  /**
   * Create a configured fetch wrapper for specific APIs
   */
  public createAPIClient(baseConfig: {
    baseURL?: string;
    defaultHeaders?: Record<string, string>;
    retryConfig?: Partial<RetryConfig>;
    timeoutConfig?: Partial<TimeoutConfig>;
  }) {
    const retryConfig = { ...this.defaultRetryConfig, ...baseConfig.retryConfig };
    const timeoutConfig = { ...this.defaultTimeoutConfig, ...baseConfig.timeoutConfig };

    return {
      get: (url: string, options: RequestInit = {}) => this.request(url, { ...options, method: 'GET' }, baseConfig, retryConfig, timeoutConfig),
      post: (url: string, data?: any, options: RequestInit = {}) => this.request(url, { 
        ...options, 
        method: 'POST', 
        body: data ? JSON.stringify(data) : undefined,
        headers: { 'Content-Type': 'application/json', ...options.headers }
      }, baseConfig, retryConfig, timeoutConfig),
      put: (url: string, data?: any, options: RequestInit = {}) => this.request(url, { 
        ...options, 
        method: 'PUT', 
        body: data ? JSON.stringify(data) : undefined,
        headers: { 'Content-Type': 'application/json', ...options.headers }
      }, baseConfig, retryConfig, timeoutConfig),
      delete: (url: string, options: RequestInit = {}) => this.request(url, { ...options, method: 'DELETE' }, baseConfig, retryConfig, timeoutConfig),
    };
  }

  /**
   * Make a request with full error handling
   */
  private async request(
    url: string, 
    options: RequestInit, 
    baseConfig: any,
    retryConfig: RetryConfig, 
    timeoutConfig: TimeoutConfig
  ): Promise<Response> {
    const fullUrl = baseConfig.baseURL ? `${baseConfig.baseURL}${url}` : url;
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...baseConfig.defaultHeaders,
        ...options.headers
      }
    };

    return this.fetchWithErrorHandling(fullUrl, requestOptions, this.generateRequestId(), retryConfig, timeoutConfig);
  }
}

// Export singleton instance
export const apiErrorInterceptor = new APIErrorInterceptor();

// Export convenience function for manual error handling
export async function handleAPICall<T>(
  apiCall: () => Promise<T>,
  fallbackData?: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof AppError) {
      logger.error('API call failed with handled error', 'APIErrorInterceptor', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      });
      
      // Return fallback data if available
      if (fallbackData !== undefined) {
        logger.info('Returning fallback data due to API error', 'APIErrorInterceptor');
        return fallbackData;
      }
    }
    
    throw error;
  }
}

export default apiErrorInterceptor;