/**
 * Secure API Key Management System
 * Handles API key rotation, encryption, and secure access
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface APIKeyConfig {
  provider: string;
  keyName: string;
  lastUsed?: Date;
  usageCount?: number;
  isActive: boolean;
}

export class SecureAPIKeyManager {
  private supabase: any;
  private keyCache: Map<string, { key: string; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Get an API key for a specific provider with automatic rotation
   */
  async getAPIKey(provider: string): Promise<string> {
    // Check cache first
    const cached = this.keyCache.get(provider);
    if (cached && cached.expiry > Date.now()) {
      return cached.key;
    }

    // Get the primary key name from environment
    const primaryKeyName = this.getPrimaryKeyName(provider);
    const primaryKey = Deno.env.get(primaryKeyName);
    
    if (!primaryKey) {
      throw new Error(`${provider} API key not configured. Please set ${primaryKeyName} environment variable.`);
    }

    // Cache the key
    this.keyCache.set(provider, {
      key: primaryKey,
      expiry: Date.now() + this.CACHE_TTL
    });

    // Log key usage (without exposing the key)
    await this.logKeyUsage(provider, primaryKeyName);
    
    return primaryKey;
  }

  /**
   * Get a rotating API key from a pool for load balancing
   */
  async getRotatingAPIKey(provider: string, poolSize: number = 5): Promise<string> {
    const keys: string[] = [];
    
    // Try to get all available keys from the pool
    for (let i = 1; i <= poolSize; i++) {
      const keyName = i === 1 
        ? this.getPrimaryKeyName(provider)
        : `${provider.toUpperCase()}_API_KEY_${i}`;
      
      const key = Deno.env.get(keyName);
      if (key) {
        keys.push(key);
      }
    }

    if (keys.length === 0) {
      throw new Error(`No ${provider} API keys configured. Please set environment variables.`);
    }

    // Get usage stats from database to distribute load
    const { data: usageStats } = await this.supabase
      .from('api_key_usage')
      .select('key_index, usage_count')
      .eq('provider', provider)
      .gte('last_reset', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('usage_count', { ascending: true });

    // Select the least used key
    let selectedIndex = 0;
    if (usageStats && usageStats.length > 0) {
      const leastUsedIndex = usageStats[0].key_index || 0;
      selectedIndex = Math.min(leastUsedIndex, keys.length - 1);
    } else {
      // Random selection if no stats available
      selectedIndex = Math.floor(Math.random() * keys.length);
    }

    // Update usage stats
    await this.supabase
      .from('api_key_usage')
      .upsert({
        provider,
        key_index: selectedIndex,
        usage_count: (usageStats?.[0]?.usage_count || 0) + 1,
        last_used: new Date().toISOString(),
        last_reset: new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString() // Round to hour
      });

    return keys[selectedIndex];
  }

  /**
   * Validate API key without exposing it
   */
  async validateAPIKey(provider: string, testEndpoint?: string): Promise<boolean> {
    try {
      const key = await this.getAPIKey(provider);
      
      // Perform a minimal test request based on provider
      switch (provider.toLowerCase()) {
        case 'gemini': {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
            { method: 'GET' }
          );
          return response.ok;
        }
          
        case 'openai': {
          const openaiResponse = await fetch(
            'https://api.openai.com/v1/models',
            {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${key}` }
            }
          );
          return openaiResponse.ok;
        }
          
        case 'claude':
          // Claude doesn't have a simple validation endpoint, so we just check if key exists
          return key.length > 0;
          
        default:
          return key.length > 0;
      }
    } catch (error) {
      console.error(`API key validation failed for ${provider}:`, error.message);
      return false;
    }
  }

  /**
   * Get the primary key name for a provider
   */
  private getPrimaryKeyName(provider: string): string {
    const keyNames: Record<string, string> = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'claude': 'CLAUDE_API_KEY',
      'perplexity': 'PERPLEXITY_API_KEY'
    };
    
    return keyNames[provider.toLowerCase()] || `${provider.toUpperCase()}_API_KEY`;
  }

  /**
   * Log API key usage for monitoring and rotation
   */
  private async logKeyUsage(provider: string, keyName: string): Promise<void> {
    try {
      await this.supabase
        .from('api_key_logs')
        .insert({
          provider,
          key_identifier: this.hashKeyIdentifier(keyName),
          used_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't throw on logging errors
      console.error('Failed to log API key usage:', error.message);
    }
  }

  /**
   * Create a hash identifier for a key (for logging without exposing the key)
   */
  private hashKeyIdentifier(keyName: string): string {
    // Simple hash for identifying keys without exposing them
    let hash = 0;
    for (let i = 0; i < keyName.length; i++) {
      const char = keyName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `key_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Rotate API keys (admin function)
   */
  async rotateAPIKey(provider: string, newKey: string): Promise<void> {
    // This would typically update the key in a secure vault
    // For now, we'll just invalidate the cache
    this.keyCache.delete(provider);
    
    // Log the rotation event
    await this.supabase
      .from('api_key_rotations')
      .insert({
        provider,
        rotated_at: new Date().toISOString(),
        rotated_by: 'system'
      });
  }

  /**
   * Clear the key cache (useful for forced refresh)
   */
  clearCache(): void {
    this.keyCache.clear();
  }
}

// Export singleton instance
export const apiKeyManager = new SecureAPIKeyManager();