/**
 * Secure Encryption Service using Web Crypto API
 * Provides AES-GCM encryption for sensitive data
 */

export class CryptoService {
  private algorithm = 'AES-GCM';
  private keyLength = 256;
  private saltLength = 16;
  private ivLength = 12;
  private tagLength = 128;
  private iterations = 100000;

  /**
   * Derives an encryption key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string using AES-GCM
   * Returns base64 encoded string containing salt, iv, and ciphertext
   */
  async encrypt(plaintext: string, password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      const key = await this.deriveKey(password, salt);
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv,
          tagLength: this.tagLength
        },
        key,
        encoder.encode(plaintext)
      );

      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts a base64 encoded string encrypted with encrypt()
   */
  async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // Extract salt, iv, and ciphertext
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const ciphertext = combined.slice(this.saltLength + this.ivLength);

      const key = await this.deriveKey(password, salt);
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv,
          tagLength: this.tagLength
        },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
    }
  }

  /**
   * Generates a secure random encryption key
   */
  generateSecureKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash a string using SHA-256 (for non-sensitive comparisons)
   */
  async hash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const cryptoService = new CryptoService();