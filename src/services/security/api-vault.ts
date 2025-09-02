/**
 * Secure API Key Vault
 * Manages encrypted storage and retrieval of API keys
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

interface VaultEntry {
  id: string;
  key_name: string;
  encrypted_value: string;
  iv: string;
  salt: string;
  created_at: string;
  last_accessed?: string;
  rotation_date?: string;
  expires_at?: string;
}

interface DecryptedKey {
  name: string;
  value: string;
  expiresAt?: Date;
}

export class SecureAPIVault {
  private static instance: SecureAPIVault;
  private encryptionKey: CryptoKey | null = null;
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12;
  private readonly SALT_LENGTH = 16;
  private readonly ITERATIONS = 100000;
  
  private constructor() {
    this.initializeVault();
  }
  
  static getInstance(): SecureAPIVault {
    if (!SecureAPIVault.instance) {
      SecureAPIVault.instance = new SecureAPIVault();
    }
    return SecureAPIVault.instance;
  }
  
  /**
   * Initialize the vault with master key
   */
  private async initializeVault() {
    try {
      // Get master password from environment (should be in secure storage)
      const masterPassword = import.meta.env.VITE_VAULT_MASTER_KEY || 
        await this.promptForMasterKey();
      
      if (masterPassword) {
        await this.deriveEncryptionKey(masterPassword);
      }
    } catch (error) {
      logger.error('Failed to initialize vault', 'SecureAPIVault', error);
    }
  }
  
  /**
   * Prompt user for master key (for development/setup)
   */
  private async promptForMasterKey(): Promise<string> {
    // In production, this would be retrieved from secure storage
    // or environment variable, not prompted
    return '';
  }
  
  /**
   * Derive encryption key from master password
   */
  private async deriveEncryptionKey(password: string): Promise<void> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Generate or retrieve salt
    const salt = await this.getOrCreateSalt();
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Derive AES key from password
    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Get or create salt for key derivation
   */
  private async getOrCreateSalt(): Promise<Uint8Array> {
    // Try to get existing salt from database
    const { data } = await supabase
      .from('vault_metadata')
      .select('salt')
      .eq('type', 'master')
      .single();
    
    if (data?.salt) {
      return this.base64ToUint8Array(data.salt);
    }
    
    // Generate new salt
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    
    // Store salt (only done once)
    await supabase
      .from('vault_metadata')
      .insert({
        type: 'master',
        salt: this.uint8ArrayToBase64(salt)
      });
    
    return salt;
  }
  
  /**
   * Store an API key in the vault
   */
  async storeKey(
    name: string,
    value: string,
    expiresInDays?: number
  ): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Vault not initialized');
    }
    
    try {
      // Generate IV for this encryption
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      
      // Encrypt the API key
      const encoder = new TextEncoder();
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        this.encryptionKey,
        encoder.encode(value)
      );
      
      // Calculate expiration date if specified
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;
      
      // Store encrypted key in database
      const { error } = await supabase
        .from('api_vault')
        .upsert({
          key_name: name,
          encrypted_value: this.arrayBufferToBase64(encrypted),
          iv: this.uint8ArrayToBase64(iv),
          salt: this.uint8ArrayToBase64(salt),
          expires_at: expiresAt?.toISOString()
        });
      
      if (error) throw error;

    } catch (error) {
      logger.error('Failed to store API key', 'SecureAPIVault', error);
      throw error;
    }
  }
  
  /**
   * Retrieve an API key from the vault
   */
  async retrieveKey(name: string): Promise<string | null> {
    if (!this.encryptionKey) {
      throw new Error('Vault not initialized');
    }
    
    try {
      // Get encrypted key from database
      const { data, error } = await supabase
        .from('api_vault')
        .select('*')
        .eq('key_name', name)
        .single();
      
      if (error || !data) {
        logger.error(`Key '${name}' not found in vault`, 'SecureAPIVault');
        return null;
      }
      
      // Check if key has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        logger.warn(`Key '${name}' has expired`, 'SecureAPIVault');
        await this.deleteKey(name);
        return null;
      }
      
      // Decrypt the key
      const iv = this.base64ToUint8Array(data.iv);
      const encryptedData = this.base64ToArrayBuffer(data.encrypted_value);
      
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        this.encryptionKey,
        encryptedData
      );
      
      // Update last accessed time
      await supabase
        .from('api_vault')
        .update({ last_accessed: new Date().toISOString() })
        .eq('key_name', name);
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      logger.error('Failed to retrieve API key', 'SecureAPIVault', error);
      return null;
    }
  }
  
  /**
   * List all keys in the vault (names only, not values)
   */
  async listKeys(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('api_vault')
        .select('key_name, expires_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out expired keys
      const validKeys = (data || []).filter(entry => {
        if (!entry.expires_at) return true;
        return new Date(entry.expires_at) > new Date();
      });
      
      return validKeys.map(entry => entry.key_name);
    } catch (error) {
      logger.error('Failed to list vault keys', 'SecureAPIVault', error);
      return [];
    }
  }
  
  /**
   * Rotate an API key
   */
  async rotateKey(name: string, newValue: string): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('Vault not initialized');
    }
    
    try {
      // Store the new key
      await this.storeKey(name, newValue);
      
      // Update rotation date
      await supabase
        .from('api_vault')
        .update({ rotation_date: new Date().toISOString() })
        .eq('key_name', name);

    } catch (error) {
      logger.error('Failed to rotate API key', 'SecureAPIVault', error);
      throw error;
    }
  }
  
  /**
   * Delete a key from the vault
   */
  async deleteKey(name: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_vault')
        .delete()
        .eq('key_name', name);
      
      if (error) throw error;

    } catch (error) {
      logger.error('Failed to delete API key', 'SecureAPIVault', error);
      throw error;
    }
  }
  
  /**
   * Check vault health and cleanup expired keys
   */
  async performMaintenance(): Promise<void> {
    try {
      // Delete expired keys
      const { error } = await supabase
        .from('api_vault')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      
      // Log maintenance
      await supabase
        .from('vault_logs')
        .insert({
          action: 'maintenance',
          timestamp: new Date().toISOString()
        });

    } catch (error) {
      logger.error('Vault maintenance failed', 'SecureAPIVault', error);
    }
  }
  
  /**
   * Export vault metadata (not keys) for backup
   */
  async exportMetadata(): Promise<any> {
    try {
      const { data } = await supabase
        .from('api_vault')
        .select('key_name, created_at, rotation_date, expires_at');
      
      return {
        exported_at: new Date().toISOString(),
        keys_count: data?.length || 0,
        keys: data || []
      };
    } catch (error) {
      logger.error('Failed to export vault metadata', 'SecureAPIVault', error);
      return null;
    }
  }
  
  // Utility functions for encoding/decoding
  
  private uint8ArrayToBase64(array: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, Array.from(array)));
  }
  
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
  
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const array = new Uint8Array(buffer);
    return this.uint8ArrayToBase64(array);
  }
  
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    return this.base64ToUint8Array(base64).buffer;
  }
}

// Export singleton instance
export const apiVault = SecureAPIVault.getInstance();