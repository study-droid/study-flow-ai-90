/**
 * Server-side Request Verification
 * Validates HMAC signatures on incoming requests
 */

import { SecureLogger } from './secure-logger.ts';

export class RequestVerifier {
  private static readonly SIGNATURE_HEADER = 'x-signature';
  private static readonly TIMESTAMP_HEADER = 'x-timestamp';
  private static readonly NONCE_HEADER = 'x-nonce';
  private static readonly MAX_REQUEST_AGE_MS = 300000; // 5 minutes
  private static usedNonces = new Map<string, number>();
  private static lastNonceCleanup = Date.now();
  
  /**
   * Get signing key from environment
   */
  private static async getSigningKey(): Promise<CryptoKey> {
    const signingKey = Deno.env.get('HMAC_SIGNING_KEY');
    
    if (!signingKey) {
      throw new Error('HMAC signing key not configured');
    }
    
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
  }

  /**
   * Verify request signature
   */
  static async verifyRequest(req: Request, body?: any): Promise<boolean> {
    try {
      // Extract headers
      const signature = req.headers.get(this.SIGNATURE_HEADER);
      const timestampStr = req.headers.get(this.TIMESTAMP_HEADER);
      const nonce = req.headers.get(this.NONCE_HEADER);
      
      if (!signature || !timestampStr || !nonce) {
        SecureLogger.warn('Missing signature headers');
        return false;
      }
      
      const timestamp = parseInt(timestampStr, 10);
      
      // Check timestamp
      const age = Date.now() - timestamp;
      if (age > this.MAX_REQUEST_AGE_MS || age < -60000) { // Allow 1 minute clock skew
        SecureLogger.warn('Request timestamp out of range', { age });
        return false;
      }
      
      // Check and store nonce
      if (this.usedNonces.has(nonce)) {
        const nonceTime = this.usedNonces.get(nonce)!;
        if (Date.now() - nonceTime < this.MAX_REQUEST_AGE_MS) {
          SecureLogger.warn('Nonce replay detected');
          return false;
        }
      }
      
      this.usedNonces.set(nonce, Date.now());
      
      // Clean up old nonces periodically
      this.cleanupNonces();
      
      // Get signing key
      const key = await this.getSigningKey();
      
      // Create message to verify
      const url = req.url;
      const method = req.method;
      const message = this.createSignatureMessage(method, url, timestamp, nonce, body);
      
      // Decode signature
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      
      // Verify signature
      const encoder = new TextEncoder();
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        encoder.encode(message)
      );
      
      if (!isValid) {
        SecureLogger.warn('Invalid request signature', {
          method,
          url,
          timestamp
        });
      } else {
        SecureLogger.debug('Request signature verified', {
          method,
          url
        });
      }
      
      return isValid;
    } catch (error) {
      SecureLogger.error('Request verification error', error);
      return false;
    }
  }

  /**
   * Create signature message
   */
  private static createSignatureMessage(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    body?: any
  ): string {
    const parts = [
      method.toUpperCase(),
      url,
      timestamp.toString(),
      nonce
    ];
    
    if (body) {
      const sortedBody = this.sortObjectKeys(body);
      parts.push(JSON.stringify(sortedBody));
    }
    
    return parts.join(':');
  }

  /**
   * Sort object keys recursively
   */
  private static sortObjectKeys(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    if (typeof obj === 'object') {
      const sorted: any = {};
      Object.keys(obj).sort().forEach(key => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
      return sorted;
    }
    
    return obj;
  }

  /**
   * Clean up old nonces
   */
  private static cleanupNonces(): void {
    const now = Date.now();
    
    // Only cleanup every 5 minutes
    if (now - this.lastNonceCleanup < 300000) {
      return;
    }
    
    this.lastNonceCleanup = now;
    
    // Remove nonces older than MAX_REQUEST_AGE_MS
    for (const [nonce, time] of this.usedNonces.entries()) {
      if (now - time > this.MAX_REQUEST_AGE_MS) {
        this.usedNonces.delete(nonce);
      }
    }
    
    SecureLogger.debug('Nonce cleanup completed', {
      remaining: this.usedNonces.size
    });
  }

  /**
   * Middleware to verify requests
   */
  static async middleware(
    req: Request,
    handler: (req: Request) => Promise<Response>
  ): Promise<Response> {
    // Skip verification for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return handler(req);
    }
    
    // Parse body if present
    let body: any;
    if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    
    // Verify request
    const isValid = await this.verifyRequest(req, body);
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid request signature' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Recreate request with body if it was consumed
    if (body !== undefined) {
      const newReq = new Request(req.url, {
        method: req.method,
        headers: req.headers,
        body: typeof body === 'string' ? body : JSON.stringify(body)
      });
      return handler(newReq);
    }
    
    return handler(req);
  }
}

// Export convenience functions
export const verifyRequest = RequestVerifier.verifyRequest.bind(RequestVerifier);
export const requestVerifierMiddleware = RequestVerifier.middleware.bind(RequestVerifier);