/**
 * Centralized CORS configuration for all Edge Functions
 * Restricts access to specific allowed origins with secure validation
 */

import { SecureLogger } from './lib/secure-logger.ts';

// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  
  // Default allowed origins - NO WILDCARDS for security
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://study-flow-ai.vercel.app',
    // Add specific preview deployments as needed
    'https://study-flow-ai-git-main.vercel.app',
    'https://study-flow-ai-production.vercel.app'
  ];
};

/**
 * Validate origin using URL parsing (more secure than regex)
 */
const isOriginAllowed = (origin: string, allowedOrigins: string[]): boolean => {
  if (!origin) return false;
  
  try {
    const originUrl = new URL(origin);
    
    return allowedOrigins.some(allowed => {
      try {
        const allowedUrl = new URL(allowed);
        
        // Check for Vercel preview deployments with proper validation
        if (allowedUrl.hostname === 'study-flow-ai.vercel.app') {
          // Allow main domain and specific subdomains
          if (originUrl.hostname === 'study-flow-ai.vercel.app') return true;
          
          // Check for valid Vercel preview pattern
          const vercelPreviewPattern = /^study-flow-ai-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/;
          if (vercelPreviewPattern.test(originUrl.hostname)) {
            SecureLogger.info('Allowed Vercel preview deployment', { 
              hostname: originUrl.hostname 
            });
            return true;
          }
        }
        
        // Exact match for protocol, hostname, and port
        return originUrl.protocol === allowedUrl.protocol &&
               originUrl.hostname === allowedUrl.hostname &&
               originUrl.port === allowedUrl.port;
      } catch {
        return false;
      }
    });
  } catch (error) {
    SecureLogger.warn('Invalid origin URL', { origin });
    return false;
  }
};

/**
 * Creates CORS headers based on the request origin
 */
export const getCorsHeaders = (request: Request): HeadersInit => {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  
  // Validate origin securely
  const isAllowed = isOriginAllowed(origin, allowedOrigins);
  
  // Only allow the specific origin if validated, never use wildcards
  const allowOrigin = isAllowed ? origin : 'null';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
};

/**
 * Handle CORS preflight requests
 */
export const handleCorsPreflightRequest = (request: Request): Response => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
};

/**
 * Add CORS headers to a response
 */
export const addCorsHeaders = (response: Response, request: Request): Response => {
  const corsHeaders = getCorsHeaders(request);
  
  // Clone the response and add CORS headers
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value as string);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};