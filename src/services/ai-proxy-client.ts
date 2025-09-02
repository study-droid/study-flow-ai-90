import { supabase } from '@/integrations/supabase/client';
import { SecureLogger } from '@/lib/secure-logger';
import { RequestSigner } from '@/lib/request-signer';

export interface AIProxyRequest {
  provider: 'claude' | 'openai' | 'gemini' | 'perplexity';
  action: 'chat' | 'completion' | 'embedding';
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProxyResponse {
  data?: any;
  error?: string;
}

class AIProxyClient {
  private async makeRequest(request: AIProxyRequest): Promise<AIProxyResponse> {
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Skip local dev server - always use Supabase Edge Function
      // This avoids CSP issues and makes the app work in production
      const USE_LOCAL_DEV_SERVER = false; // Disabled to fix CSP issues
      
      if (import.meta.env.DEV && USE_LOCAL_DEV_SERVER) {
        // Local dev server code (disabled)
        // This was causing CSP violations in production
      }

      // Production: use Supabase Edge Function
      const url = `${supabase.functionsUrl}/ai-proxy-secure`;
      const { signature, timestamp, nonce } = await RequestSigner.signRequest(
        'POST',
        url,
        request
      );

      // Call the edge function with signature headers
      const { data, error } = await supabase.functions.invoke('ai-proxy-secure', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'X-Signature': signature,
          'X-Timestamp': timestamp.toString(),
          'X-Nonce': nonce
        }
      });

      // Log sanitized information for debugging
      if (import.meta.env.DEV) {
        SecureLogger.debug('Edge Function Response:', {
          hasData: !!data,
          hasError: !!error,
          provider: request.provider,
          action: request.action,
          hasMessages: !!request.messages?.length
          // Never log: data, error details, tokens
        });
      }

      if (error) {
        SecureLogger.error('Edge Function Error:', {
          message: error.message,
          status: error.status,
          provider: request.provider
          // Never log: full error object, tokens, sensitive details
        });
        throw error;
      }

      return { data };
    } catch (error: any) {
      // Log sanitized error in development only
      if (import.meta.env.DEV) {
        SecureLogger.error('AI Proxy request failed:', {
          message: error.message,
          provider: request.provider,
          action: request.action,
          status: error.status
          // Never log: tokens, headers, full error object
        });
      }
      
      // Return more specific error messages based on the error
      if (error.message?.includes('rate limit') || error.status === 429) {
        return { error: 'You have exceeded the rate limit. Please wait a moment before trying again.' };
      }
      
      if (error.message?.includes('authentication') || error.status === 401) {
        return { error: 'Please sign in to use AI features.' };
      }
      
      if (error.message?.includes('not configured') || error.message?.includes('API key not configured')) {
        return { error: 'AI service is not set up yet. Please run the AI_SERVICE_TABLES_FIX.sql migration and add API keys to Supabase environment variables.' };
      }
      
      if (error.message?.includes('API key') || error.message?.includes('Invalid API')) {
        return { error: 'Invalid API key configuration. Please check Supabase environment variables.' };
      }

      if (error.message?.includes('Function not found') || error.status === 404) {
        return { error: 'AI service function not deployed. Please check Supabase Edge Functions.' };
      }

      if (error.message?.includes('does not exist') && error.message?.includes('table')) {
        return { error: 'Database tables missing. Please run the AI_SERVICE_TABLES_FIX.sql migration in Supabase.' };
      }

      if (error.status === 503 || error.message?.includes('overloaded')) {
        return { error: 'AI service is currently overloaded. Please try again in a few moments.' };
      }

      if (error.status === 500) {
        return { error: 'Internal server error. Please check Supabase logs and ensure all environment variables are set.' };
      }
      
      // In development, show more details
      if (import.meta.env.DEV) {
        return { 
          error: `AI service error: ${error.message || 'Unknown error'} (Status: ${error.status || 'N/A'})${error.details ? ` - ${error.details}` : ''}` 
        };
      }
      
      return { 
        error: 'AI service is temporarily unavailable. Please check setup guide or try again later.' 
      };
    }
  }

  async sendChatMessage(
    provider: AIProxyRequest['provider'],
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIProxyResponse> {
    return this.makeRequest({
      provider,
      action: 'chat',
      messages,
      ...options
    });
  }

  async generateCompletion(
    provider: AIProxyRequest['provider'],
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIProxyResponse> {
    return this.makeRequest({
      provider,
      action: 'completion',
      prompt,
      ...options
    });
  }

  async generateEmbedding(
    provider: 'openai',
    text: string
  ): Promise<AIProxyResponse> {
    return this.makeRequest({
      provider,
      action: 'embedding',
      prompt: text
    });
  }

  // Specific provider methods for convenience
  async sendClaudeMessage(
    messages: Array<{ role: string; content: string }>,
    model = 'claude-3-opus-20240229'
  ): Promise<AIProxyResponse> {
    return this.sendChatMessage('claude', messages, { model });
  }

  async sendGeminiMessage(
    messages: Array<{ role: string; content: string }>,
    model = 'gemini-1.5-flash'
  ): Promise<AIProxyResponse> {
    return this.sendChatMessage('gemini', messages, { model });
  }

  async sendOpenAIMessage(
    messages: Array<{ role: string; content: string }>,
    model = 'gpt-4'
  ): Promise<AIProxyResponse> {
    return this.sendChatMessage('openai', messages, { model });
  }

  async sendPerplexityMessage(
    messages: Array<{ role: string; content: string }>,
    model = 'pplx-7b-online'
  ): Promise<AIProxyResponse> {
    return this.sendChatMessage('perplexity', messages, { model });
  }
}

// Export singleton instance
export const aiProxyClient = new AIProxyClient();