/**
 * User-specific AI Connections Service
 * Manages individual user connections to AI providers
 */

import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/config';
import { AIProvider } from '@/services/mcp/mcp-client';
import { cryptoService } from '@/services/encryption/crypto-service';

export interface UserAIConnection {
  id: string;
  user_id: string;
  provider: AIProvider;
  connection_name: string;
  is_active: boolean;
  last_tested_at?: string;
  test_status: 'success' | 'failed' | 'pending';
  test_error?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionData {
  provider: AIProvider;
  connection_name: string;
  api_key: string;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  provider: AIProvider;
  model_info?: {
    name: string;
    capabilities: string[];
  };
}

class UserAIConnectionsService {
  private encryptionPassword: string;

  constructor() {
    // Get encryption password from environment or generate a secure one
    this.encryptionPassword = this.getEncryptionPassword();
  }

  private getEncryptionPassword(): string {
    // Try to get from environment variable first
    const envPassword = import.meta.env.VITE_ENCRYPTION_PASSWORD;
    if (envPassword) {
      return envPassword;
    }
    
    // For local development, use a combination of user ID and app-specific salt
    // In production, this MUST come from environment variable
    const appSalt = import.meta.env.VITE_APP_SALT || 'study-flow-ai-2024';
    return `${appSalt}-${window.location.hostname}`;
  }

  private async encryptApiKey(apiKey: string): Promise<string> {
    try {
      // Use proper AES-GCM encryption via Web Crypto API
      return await cryptoService.encrypt(apiKey, this.encryptionPassword);
    } catch (error) {
      log.error('Encryption error:', error);
      throw new Error('Failed to encrypt API key securely');
    }
  }

  private async decryptApiKey(encrypted: string): Promise<string> {
    try {
      // Use proper AES-GCM decryption via Web Crypto API
      return await cryptoService.decrypt(encrypted, this.encryptionPassword);
    } catch (error) {
      log.error('Decryption error:', error);
      throw new Error('Failed to decrypt API key - invalid or corrupted data');
    }
  }

  async createConnection(connectionData: CreateConnectionData): Promise<UserAIConnection> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Encrypt the API key using secure AES-GCM encryption
      const encryptedKey = await this.encryptApiKey(connectionData.api_key);

      // Test the connection first
      const testResult = await this.testConnection(connectionData.provider, connectionData.api_key);

      const { data, error } = await supabase
        .from('user_ai_connections')
        .insert([{
          user_id: user.id,
          provider: connectionData.provider,
          connection_name: connectionData.connection_name,
          api_key_encrypted: encryptedKey,
          test_status: testResult.success ? 'success' : 'failed',
          test_error: testResult.error,
          last_tested_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      log.info(`Created AI connection for ${connectionData.provider}:`, connectionData.connection_name);
      return data;
    } catch (error) {
      log.error('Error creating AI connection:', error);
      throw error;
    }
  }

  async getUserConnections(): Promise<UserAIConnection[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_ai_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      log.error('Error fetching user connections:', error);
      throw error;
    }
  }

  async getActiveConnections(): Promise<UserAIConnection[]> {
    try {
      const connections = await this.getUserConnections();
      return connections.filter(conn => conn.is_active && conn.test_status === 'success');
    } catch (error) {
      log.error('Error fetching active connections:', error);
      throw error;
    }
  }

  async getConnectionById(connectionId: string): Promise<UserAIConnection | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_ai_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      log.error('Error fetching connection by ID:', error);
      throw error;
    }
  }

  async getDecryptedApiKey(connectionId: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_ai_connections')
        .select('api_key_encrypted')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return await this.decryptApiKey(data.api_key_encrypted);
    } catch (error) {
      log.error('Error decrypting API key:', error);
      throw error;
    }
  }

  async testConnection(provider: AIProvider, apiKey: string): Promise<TestConnectionResult> {
    try {
      switch (provider) {
        case 'claude':
          return await this.testClaudeConnection(apiKey);
        case 'openai':
          return await this.testOpenAIConnection(apiKey);
        case 'gemini':
          return await this.testGeminiConnection(apiKey);
        case 'perplexity':
          return await this.testPerplexityConnection(apiKey);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider
      };
    }
  }

  private async testClaudeConnection(apiKey: string): Promise<TestConnectionResult> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    return {
      success: true,
      provider: 'claude',
      model_info: {
        name: 'Claude 3 Haiku',
        capabilities: ['text-generation', 'conversation', 'analysis']
      }
    };
  }

  private async testOpenAIConnection(apiKey: string): Promise<TestConnectionResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return {
      success: true,
      provider: 'openai',
      model_info: {
        name: 'GPT-3.5 Turbo',
        capabilities: ['text-generation', 'conversation', 'code-generation']
      }
    };
  }

  private async testGeminiConnection(apiKey: string): Promise<TestConnectionResult> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello! This is a connection test.' }]
        }],
        generationConfig: {
          maxOutputTokens: 10
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    return {
      success: true,
      provider: 'gemini',
      model_info: {
        name: 'Gemini 1.5 Flash',
        capabilities: ['text-generation', 'conversation', 'multimodal']
      }
    };
  }

  private async testPerplexityConnection(apiKey: string): Promise<TestConnectionResult> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'pplx-7b-chat',
        messages: [{ role: 'user', content: 'Hello! This is a connection test.' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${error}`);
    }

    return {
      success: true,
      provider: 'perplexity',
      model_info: {
        name: 'PPLX-7B-Chat',
        capabilities: ['text-generation', 'conversation', 'web-search']
      }
    };
  }

  async retestConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      const connection = await this.getConnectionById(connectionId);
      if (!connection) throw new Error('Connection not found');

      const apiKey = await this.getDecryptedApiKey(connectionId);
      const testResult = await this.testConnection(connection.provider, apiKey);

      // Update the connection with test results
      await supabase
        .from('user_ai_connections')
        .update({
          test_status: testResult.success ? 'success' : 'failed',
          test_error: testResult.error,
          last_tested_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      return testResult;
    } catch (error) {
      log.error('Error retesting connection:', error);
      throw error;
    }
  }

  async updateConnection(connectionId: string, updates: Partial<Pick<CreateConnectionData, 'connection_name' | 'api_key'>>): Promise<UserAIConnection> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};

      if (updates.connection_name) {
        updateData.connection_name = updates.connection_name;
      }

      if (updates.api_key) {
        updateData.api_key_encrypted = await this.encryptApiKey(updates.api_key);
        // Reset test status when API key changes
        updateData.test_status = 'pending';
        updateData.test_error = null;
        updateData.last_tested_at = null;
      }

      const { data, error } = await supabase
        .from('user_ai_connections')
        .update(updateData)
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      log.error('Error updating connection:', error);
      throw error;
    }
  }

  async toggleConnection(connectionId: string, isActive: boolean): Promise<UserAIConnection> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_ai_connections')
        .update({ is_active: isActive })
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      log.error('Error toggling connection:', error);
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_ai_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      log.info('Deleted AI connection:', connectionId);
    } catch (error) {
      log.error('Error deleting connection:', error);
      throw error;
    }
  }

  async incrementUsageCount(connectionId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_ai_connections')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      log.error('Error incrementing usage count:', error);
      // Don't throw - this is not critical
    }
  }

  getProviderInfo(provider: AIProvider) {
    const providerInfo = {
      claude: {
        name: 'Claude AI',
        company: 'Anthropic',
        description: 'Advanced conversational AI with strong reasoning capabilities',
        setupUrl: 'https://console.anthropic.com/',
        features: ['Long conversations', 'Code analysis', 'Creative writing', 'Research assistance']
      },
      openai: {
        name: 'ChatGPT',
        company: 'OpenAI',
        description: 'Versatile AI assistant with strong general capabilities',
        setupUrl: 'https://platform.openai.com/',
        features: ['Code generation', 'General knowledge', 'Creative tasks', 'Problem solving']
      },
      gemini: {
        name: 'Gemini',
        company: 'Google',
        description: 'Multi-modal AI with advanced reasoning and analysis',
        setupUrl: 'https://aistudio.google.com/',
        features: ['Multi-modal input', 'Fast responses', 'Integration with Google services', 'Advanced reasoning']
      },
      perplexity: {
        name: 'Perplexity AI',
        company: 'Perplexity',
        description: 'AI-powered search and research assistant',
        setupUrl: 'https://www.perplexity.ai/',
        features: ['Web search', 'Real-time information', 'Source citations', 'Research assistance']
      }
    };

    return providerInfo[provider];
  }
}

export const userAIConnectionsService = new UserAIConnectionsService();
export type { UserAIConnectionsService };