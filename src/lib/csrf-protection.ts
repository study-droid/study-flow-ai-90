import { SecureLogger } from '@/lib/secure-logger';

/**
 * CSRF Token Management
 * Implements double-submit cookie pattern for CSRF protection
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const TOKEN_LENGTH = 32;

/**
 * Generates a cryptographically secure random token
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Gets the current CSRF token or generates a new one
 */
export const getCSRFToken = (): string => {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    
    // Also set as a same-site cookie for double-submit pattern
    document.cookie = `${CSRF_TOKEN_KEY}=${token}; SameSite=Strict; Secure; Path=/`;
    
    SecureLogger.info('Generated new CSRF token');
  }
  
  return token;
};

/**
 * Validates a CSRF token
 */
export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!storedToken || !token) {
    SecureLogger.warn('CSRF validation failed: Missing token');
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  const valid = constantTimeCompare(token, storedToken);
  
  if (!valid) {
    SecureLogger.warn('CSRF validation failed: Token mismatch');
  }
  
  return valid;
};

/**
 * Constant-time string comparison to prevent timing attacks
 */
const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Refreshes the CSRF token
 */
export const refreshCSRFToken = (): string => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  return getCSRFToken();
};

/**
 * Adds CSRF token to request headers
 */
export const addCSRFHeader = (headers: HeadersInit = {}): HeadersInit => {
  const token = getCSRFToken();
  
  if (headers instanceof Headers) {
    headers.set(CSRF_TOKEN_HEADER, token);
    return headers;
  }
  
  return {
    ...headers,
    [CSRF_TOKEN_HEADER]: token
  };
};

/**
 * Creates a fetch wrapper with CSRF protection
 */
export const fetchWithCSRF = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Only add CSRF token for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  const requiresCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (requiresCSRF) {
    options.headers = addCSRFHeader(options.headers);
    
    // Ensure credentials are included for cookie-based auth
    options.credentials = options.credentials || 'same-origin';
  }
  
  try {
    const response = await fetch(url, options);
    
    // If CSRF validation failed on server, refresh token and retry once
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      
      if (errorData.error?.includes('CSRF')) {
        SecureLogger.warn('CSRF token rejected, refreshing and retrying');
        refreshCSRFToken();
        
        if (requiresCSRF) {
          options.headers = addCSRFHeader(options.headers);
        }
        
        return fetch(url, options);
      }
    }
    
    return response;
  } catch (error) {
    SecureLogger.error('Fetch with CSRF failed', error);
    throw error;
  }
};

/**
 * CSRF-protected form submission handler
 */
export const submitFormWithCSRF = async (
  form: HTMLFormElement,
  options?: {
    onSuccess?: (response: Response) => void;
    onError?: (error: Error) => void;
    additionalData?: Record<string, unknown>;
  }
): Promise<void> => {
  try {
    const formData = new FormData(form);
    
    // Add CSRF token to form data
    formData.append('csrf_token', getCSRFToken());
    
    // Add any additional data
    if (options?.additionalData) {
      Object.entries(options.additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    const response = await fetchWithCSRF(form.action || window.location.href, {
      method: form.method || 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Form submission failed: ${response.statusText}`);
    }
    
    options?.onSuccess?.(response);
  } catch (error: unknown) {
    SecureLogger.error('Form submission with CSRF failed', error);
    options?.onError?.(error);
  }
};

/**
 * React hook for CSRF protection
 */
export const useCSRFToken = () => {
  const [token, setToken] = React.useState<string>('');
  
  React.useEffect(() => {
    setToken(getCSRFToken());
  }, []);
  
  const refresh = React.useCallback(() => {
    const newToken = refreshCSRFToken();
    setToken(newToken);
    return newToken;
  }, []);
  
  return { token, refresh };
};

/**
 * Axios interceptor for CSRF protection (if using axios)
 */
export const setupAxiosCSRF = (axiosInstance: unknown) => {
  // Request interceptor to add CSRF token
  axiosInstance.interceptors.request.use(
    (config: unknown) => {
      const method = config.method?.toUpperCase();
      
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        config.headers[CSRF_TOKEN_HEADER] = getCSRFToken();
      }
      
      return config;
    },
    (error: unknown) => Promise.reject(error)
  );
  
  // Response interceptor to handle CSRF errors
  axiosInstance.interceptors.response.use(
    (response: unknown) => response,
    async (error: unknown) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 403 && 
          error.response?.data?.error?.includes('CSRF') &&
          !originalRequest._retry) {
        originalRequest._retry = true;
        refreshCSRFToken();
        originalRequest.headers[CSRF_TOKEN_HEADER] = getCSRFToken();
        return axiosInstance(originalRequest);
      }
      
      return Promise.reject(error);
    }
  );
};

// Import React for the hook
import React from 'react';

// Initialize CSRF token on module load
if (typeof window !== 'undefined') {
  getCSRFToken();
}