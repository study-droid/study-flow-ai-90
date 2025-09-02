/**
 * Request Signing and HMAC Validation
 * Ensures requests between frontend and backend cannot be tampered with
 */

import { SecureLogger } from './secure-logger';

export class RequestSigner {
  private static readonly SIGNATURE_HEADER = 'X-Signature';
  private static readonly TIMESTAMP_HEADER = 'X-Timestamp';
  private static readonly NONCE_HEADER = 'X-Nonce';
  private static readonly MAX_REQUEST_AGE_MS = 300000; // 5 minutes
  private static usedNonces = new Set<string>();
  
  /**
   * Generate a cryptographic nonce
   */
  private static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Get or derive signing key
   */
  private static async getSigningKey(): Promise<CryptoKey> {
    // In production, this should be derived from user session
    // For now, we'll use a derived key from the session token
    const encoder = new TextEncoder();
    
    // Get session token (this is just for signing, not the actual key)
    const sessionToken = localStorage.getItem('sb-session-token') || 'default';
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionToken),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('study-flow-hmac-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Sign a request
   */
  static async signRequest(
    method: string,
    url: string,
    body?: any
  ): Promise<{ signature: string; timestamp: number; nonce: string }> {
    try {
      const timestamp = Date.now();
      const nonce = this.generateNonce();
      const key = await this.getSigningKey();
      
      // Create message to sign
      const message = this.createSignatureMessage(method, url, timestamp, nonce, body);
      
      // Sign the message
      const encoder = new TextEncoder();
      const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(message)
      );
      
      // Convert to base64
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
      
      SecureLogger.debug('Request signed', {
        method,
        url,
        timestamp,
        nonce: nonce.substring(0, 8) + '...'
      });
      
      return {
        signature: signatureBase64,
        timestamp,
        nonce
      };
    } catch (error) {
      SecureLogger.error('Failed to sign request:', error);
      throw new Error('Request signing failed');
    }
  }

  /**
   * Verify a request signature
   */
  static async verifyRequest(
    signature: string,
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    body?: any
  ): Promise<boolean> {
    try {
      // Check timestamp is within acceptable range
      const age = Date.now() - timestamp;
      if (age > this.MAX_REQUEST_AGE_MS || age < 0) {
        SecureLogger.warn('Request timestamp out of range', { age });
        return false;
      }
      
      // Check nonce hasn't been used
      if (this.usedNonces.has(nonce)) {
        SecureLogger.warn('Nonce already used', { nonce: nonce.substring(0, 8) + '...' });
        return false;
      }
      
      // Add nonce to used set
      this.usedNonces.add(nonce);
      
      // Clean up old nonces periodically
      if (this.usedNonces.size > 1000) {
        this.usedNonces.clear();
      }
      
      const key = await this.getSigningKey();
      
      // Create message to verify
      const message = this.createSignatureMessage(method, url, timestamp, nonce, body);
      
      // Decode signature from base64
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
        SecureLogger.warn('Invalid request signature');
      }
      
      return isValid;
    } catch (error) {
      SecureLogger.error('Failed to verify request:', error);
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
      // Sort keys for consistent ordering
      const sortedBody = this.sortObjectKeys(body);
      parts.push(JSON.stringify(sortedBody));
    }
    
    return parts.join(':');
  }

  /**
   * Sort object keys recursively for consistent signing
   */
  private static sortObjectKeys(obj: Record<string, unknown>): unknown {
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
   * Add signature headers to a fetch request
   */
  static async addSignatureHeaders(
    url: string,
    options: RequestInit = {}
  ): Promise<RequestInit> {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    
    const { signature, timestamp, nonce } = await this.signRequest(
      method,
      url,
      body
    );
    
    const headers = new Headers(options.headers);
    headers.set(this.SIGNATURE_HEADER, signature);
    headers.set(this.TIMESTAMP_HEADER, timestamp.toString());
    headers.set(this.NONCE_HEADER, nonce);
    
    return {
      ...options,
      headers
    };
  }

  /**
   * Extract signature headers from a request
   */
  static extractSignatureHeaders(headers: Headers): {
    signature?: string;
    timestamp?: number;
    nonce?: string;
  } {
    const signature = headers.get(this.SIGNATURE_HEADER) || undefined;
    const timestampStr = headers.get(this.TIMESTAMP_HEADER);
    const nonce = headers.get(this.NONCE_HEADER) || undefined;
    
    return {
      signature,
      timestamp: timestampStr ? parseInt(timestampStr, 10) : undefined,
      nonce
    };
  }
}

// Export convenience functions
export const signRequest = RequestSigner.signRequest.bind(RequestSigner);
export const verifyRequest = RequestSigner.verifyRequest.bind(RequestSigner);
export const addSignatureHeaders = RequestSigner.addSignatureHeaders.bind(RequestSigner);