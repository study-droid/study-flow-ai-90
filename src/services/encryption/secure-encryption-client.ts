/**
 * Secure Encryption Client
 * Uses backend encryption service instead of client-side keys
 */

import { supabase } from '@/integrations/supabase/client';
import { SecureLogger } from '@/lib/secure-logger';

export class SecureEncryptionClient {
  private static readonly ENCRYPTION_ENDPOINT = '/encryption';

  /**
   * Encrypt data using backend service
   */
  static async encrypt(data: string): Promise<string> {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('encryption', {
        body: {
          action: 'encrypt',
          data
        }
      });

      if (response.error) {
        throw response.error;
      }

      return response.data.result;
    } catch (error) {
      SecureLogger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using backend service
   */
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('encryption', {
        body: {
          action: 'decrypt',
          data: encryptedData
        }
      });

      if (response.error) {
        throw response.error;
      }

      return response.data.result;
    } catch (error) {
      SecureLogger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if encryption service is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      return !!session?.session?.access_token;
    } catch {
      return false;
    }
  }
}

// Export convenience functions
export const encrypt = SecureEncryptionClient.encrypt.bind(SecureEncryptionClient);
export const decrypt = SecureEncryptionClient.decrypt.bind(SecureEncryptionClient);
export const isEncryptionAvailable = SecureEncryptionClient.isAvailable.bind(SecureEncryptionClient);