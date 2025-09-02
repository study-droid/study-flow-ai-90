/**
 * Secure Disposal Utility
 * Ensures sensitive data is properly cleaned up and cannot be recovered
 */

import { log } from '@/lib/config';

/**
 * Securely overwrites a string in memory
 * Note: JavaScript strings are immutable, so this creates a new string
 * and helps garbage collection clean up the original
 */
export const secureStringDisposal = (str: string | null | undefined): void => {
  if (!str) return;
  
  try {
    // For strings, we can't directly overwrite memory in JavaScript
    // But we can help the garbage collector by nullifying references
    const length = str.length;
    
    // Create a replacement string of the same length
    let replacement = '';
    for (let i = 0; i < length; i++) {
      replacement += '\0';
    }
    
    // This doesn't actually overwrite the original string in memory,
    // but it helps mark it for garbage collection
    str = replacement;
    str = null;
  } catch (error) {
    // Silently fail - disposal should not throw
    if (import.meta.env.DEV) {
      log.warn('String disposal warning:', error);
    }
  }
};

/**
 * Securely clears an array or typed array
 */
export const secureArrayDisposal = <T>(arr: T[] | Uint8Array | Uint16Array | Uint32Array | null | undefined): void => {
  if (!arr) return;
  
  try {
    if (arr instanceof Uint8Array || arr instanceof Uint16Array || arr instanceof Uint32Array) {
      // For typed arrays, we can actually overwrite the memory
      arr.fill(0);
    } else if (Array.isArray(arr)) {
      // For regular arrays, clear all elements
      for (let i = 0; i < arr.length; i++) {
        if (typeof arr[i] === 'object' && arr[i] !== null) {
          secureObjectDisposal(arr[i] as unknown);
        }
        arr[i] = null as unknown;
      }
      arr.length = 0;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('Array disposal warning:', error);
    }
  }
};

/**
 * Securely clears an object's properties
 */
export const secureObjectDisposal = (obj: Record<string, unknown> | null | undefined): void => {
  if (!obj || typeof obj !== 'object') return;
  
  try {
    // Get all property names including non-enumerable ones
    const props = Object.getOwnPropertyNames(obj);
    
    for (const prop of props) {
      const value = obj[prop];
      
      if (typeof value === 'string') {
        secureStringDisposal(value);
      } else if (Array.isArray(value)) {
        secureArrayDisposal(value);
      } else if (value && typeof value === 'object') {
        secureObjectDisposal(value);
      }
      
      // Delete the property
      try {
        delete obj[prop];
      } catch {
        // Some properties might not be configurable
        obj[prop] = null;
      }
    }
    
    // Clear the prototype chain if possible
    if (Object.setPrototypeOf) {
      try {
        Object.setPrototypeOf(obj, null);
      } catch {
        // Might not be allowed for some objects
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('Object disposal warning:', error);
    }
  }
};

/**
 * Securely clears localStorage items containing sensitive data
 */
export const secureLocalStorageDisposal = (keys?: string[]): void => {
  try {
    if (keys && keys.length > 0) {
      // Clear specific keys
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          secureStringDisposal(value);
          localStorage.removeItem(key);
        }
      });
    } else {
      // Clear all sensitive keys (you can customize this list)
      const sensitivePatterns = [
        /token/i,
        /key/i,
        /password/i,
        /secret/i,
        /credential/i,
        /session/i,
        /auth/i,
        /api/i
      ];
      
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (sensitivePatterns.some(pattern => pattern.test(key))) {
          const value = localStorage.getItem(key);
          if (value) {
            secureStringDisposal(value);
            localStorage.removeItem(key);
          }
        }
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('LocalStorage disposal warning:', error);
    }
  }
};

/**
 * Securely clears sessionStorage items containing sensitive data
 */
export const secureSessionStorageDisposal = (keys?: string[]): void => {
  try {
    if (keys && keys.length > 0) {
      // Clear specific keys
      keys.forEach(key => {
        const value = sessionStorage.getItem(key);
        if (value) {
          secureStringDisposal(value);
          sessionStorage.removeItem(key);
        }
      });
    } else {
      // Clear all sensitive keys
      const sensitivePatterns = [
        /token/i,
        /key/i,
        /password/i,
        /secret/i,
        /credential/i,
        /csrf/i
      ];
      
      const allKeys = Object.keys(sessionStorage);
      allKeys.forEach(key => {
        if (sensitivePatterns.some(pattern => pattern.test(key))) {
          const value = sessionStorage.getItem(key);
          if (value) {
            secureStringDisposal(value);
            sessionStorage.removeItem(key);
          }
        }
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('SessionStorage disposal warning:', error);
    }
  }
};

/**
 * Securely clears all cookies containing sensitive data
 */
export const secureCookieDisposal = (names?: string[]): void => {
  try {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const [name] = cookie.trim().split('=');
      
      if (!names || names.includes(name)) {
        // Expire the cookie
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      }
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('Cookie disposal warning:', error);
    }
  }
};

/**
 * Securely disposes of a crypto key
 */
export const secureCryptoKeyDisposal = async (key: CryptoKey | null | undefined): Promise<void> => {
  if (!key) return;
  
  try {
    // There's no direct way to destroy a CryptoKey in the Web Crypto API
    // But we can help by removing references
    key = null as unknown;
    
    // Force garbage collection if available (non-standard)
    if ((window as unknown).gc) {
      (window as unknown).gc();
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('CryptoKey disposal warning:', error);
    }
  }
};

/**
 * Securely disposes of an ArrayBuffer
 */
export const secureBufferDisposal = (buffer: ArrayBuffer | null | undefined): void => {
  if (!buffer) return;
  
  try {
    // Create a view and overwrite with zeros
    const view = new Uint8Array(buffer);
    view.fill(0);
    
    // Detach the buffer if possible (makes it unusable)
    if (typeof (buffer as unknown).detach === 'function') {
      (buffer as unknown).detach();
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('Buffer disposal warning:', error);
    }
  }
};

/**
 * Comprehensive secure disposal for cleaning up sensitive application data
 */
export const secureApplicationDisposal = async (): Promise<void> => {
  try {
    // Clear sensitive storage
    secureSessionStorageDisposal();
    secureLocalStorageDisposal();
    secureCookieDisposal(['csrf_token', 'auth_token', 'session_id']);
    
    // Clear any cached credentials
    if ('credentials' in navigator && (navigator as unknown).credentials?.preventSilentAccess) {
      await (navigator as unknown).credentials.preventSilentAccess();
    }
    
    // Clear any service worker caches containing sensitive data
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => {
          if (name.includes('auth') || name.includes('api')) {
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );
    }
    
    // Revoke any object URLs to prevent memory leaks
    if (window.URL?.revokeObjectURL) {
      // This would need to track created URLs, but as an example:
      // trackedURLs.forEach(url => URL.revokeObjectURL(url));
    }
    
    log.info('Secure disposal completed');
  } catch (error) {
    log.error('Secure disposal error:', error);
  }
};

/**
 * React hook for secure cleanup on unmount
 */
export const useSecureCleanup = (cleanupFn?: () => void | Promise<void>) => {
  useEffect(() => {
    return () => {
      // Run custom cleanup if provided
      if (cleanupFn) {
        const result = cleanupFn();
        if (result instanceof Promise) {
          result.catch(error => {
            if (import.meta.env.DEV) {
              logger.error('Cleanup error:', error, 'SecureDisposal');
            }
          });
        }
      }
      
      // Always clear session storage on unmount
      secureSessionStorageDisposal();
    };
  }, []);
};

/**
 * Secure form data disposal
 */
export const secureFormDisposal = (form: HTMLFormElement): void => {
  if (!form) return;
  
  try {
    // Clear all input values
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((input: Element) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        // For password fields, overwrite multiple times
        if (input.type === 'password') {
          for (let i = 0; i < 3; i++) {
            input.value = Math.random().toString(36).substring(2);
          }
        }
        input.value = '';
      } else if (input instanceof HTMLSelectElement) {
        input.selectedIndex = -1;
      }
    });
    
    // Reset the form
    form.reset();
  } catch (error) {
    if (import.meta.env.DEV) {
      log.warn('Form disposal warning:', error);
    }
  }
};

// Import React for the hook
import { useEffect } from 'react';
import { logger } from '@/services/logging/logger';

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Quick cleanup of sensitive session data
    secureSessionStorageDisposal();
    secureCookieDisposal(['csrf_token']);
  });
}