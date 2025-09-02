import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Generate cryptographically secure nonce
const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Generate strict Content Security Policy
const generateCSP = (nonce: string): string => {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://cdn.jsdelivr.net`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `img-src 'self' data: https://*.supabase.co blob: https://avatars.githubusercontent.com`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
    `block-all-mixed-content`,
  ];

  return directives.join('; ');
};

serve(async (req) => {
  // Generate nonce for this request
  const nonce = generateNonce();
  
  // Get the original response
  const url = new URL(req.url);
  
  // Forward the request to the origin
  const originUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
  const originResponse = await fetch(originUrl, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // Clone the response to add security headers
  const response = new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: new Headers(originResponse.headers),
  });

  // Add comprehensive security headers
  response.headers.set('Content-Security-Policy', generateCSP(nonce));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '0'); // Disabled in favor of CSP
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Nonce', nonce); // Pass nonce to client

  // Add CSP report-only header for monitoring
  response.headers.set('Content-Security-Policy-Report-Only', 
    `${generateCSP(nonce)}; report-uri /api/csp-report`);

  return response;
});