import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Provider configurations
const PROVIDERS = {
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    apiKey: Deno.env.get('GEMINI_API_KEY'),
    defaultModel: 'gemini-1.5-flash'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: Deno.env.get('OPENAI_API_KEY'),
    defaultModel: 'gpt-4o-mini'
  },
  claude: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: Deno.env.get('CLAUDE_API_KEY'),
    defaultModel: 'claude-3-haiku-20240307'
  },
  deepseek: {
    endpoint: 'https://api.deepseek.com/chat/completions',
    apiKey: Deno.env.get('DEEPSEEK_API_KEY'),
    defaultModel: 'deepseek-chat'
  }
};

// Rate limiting check
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .gte('window_start', new Date(Date.now() - 60000).toISOString()) // Last minute
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      console.error('Rate limit check error:', error);
      return true; // Allow on error
    }

    if (!data) return true; // No rate limit record, allow

    return data.requests_count < 60; // 60 requests per minute limit
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error
  }
}

// Update rate limit
async function updateRateLimit(userId: string): Promise<void> {
  try {
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000); // Round to minute
    
    await supabase
      .from('rate_limits')
      .upsert({
        user_id: userId,
        window_start: windowStart.toISOString(),
        requests_count: 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,window_start',
        ignoreDuplicates: false
      });

    // Increment if already exists
    await supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_window_start: windowStart.toISOString()
    });
  } catch (error) {
    console.error('Rate limit update failed:', error);
  }
}

// Log API usage
async function logAPIUsage(userId: string, provider: string, model: string, tokensUsed: number): Promise<void> {
  try {
    await supabase
      .from('api_usage_logs')
      .insert({
        user_id: userId,
        provider,
        model,
        tokens_used: tokensUsed,
        request_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('API usage logging failed:', error);
  }
}

// Format messages for different providers
function formatMessagesForProvider(provider: string, messages: any[]): any {
  switch (provider) {
    case 'gemini':
      return {
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      };
    
    case 'claude':
      return {
        model: PROVIDERS.claude.defaultModel,
        max_tokens: 1024,
        messages: messages.filter(msg => msg.role !== 'system')
      };
    
    case 'openai':
    case 'deepseek':
      return {
        model: PROVIDERS[provider as keyof typeof PROVIDERS].defaultModel,
        messages,
        max_tokens: 1024,
        temperature: 0.7
      };
    
    default:
      return { messages };
  }
}

// Make API request to provider
async function callProvider(provider: string, payload: any): Promise<any> {
  const config = PROVIDERS[provider as keyof typeof PROVIDERS];
  
  if (!config || !config.apiKey) {
    throw new Error(`${provider} API key not configured`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Set authorization header based on provider
  switch (provider) {
    case 'gemini':
      // Gemini uses query parameter
      break;
    case 'claude':
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'openai':
    case 'deepseek':
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      break;
  }

  let url = config.endpoint;
  if (provider === 'gemini') {
    url += `?key=${config.apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider} API error:`, response.status, errorText);
    throw new Error(`${provider} API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Extract response content based on provider
function extractContent(provider: string, response: any): string {
  switch (provider) {
    case 'gemini':
      return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    case 'claude':
      return response.content?.[0]?.text || '';
    
    case 'openai':
    case 'deepseek':
      return response.choices?.[0]?.message?.content || '';
    
    default:
      return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Parse request body
    const { provider, action, messages, prompt, model, temperature, maxTokens } = await req.json();

    if (!provider || !action) {
      throw new Error('Missing required parameters: provider and action');
    }

    // Check rate limits
    const canProceed = await checkRateLimit(user.id);
    if (!canProceed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before making another request.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update rate limit
    await updateRateLimit(user.id);

    let response: any;
    let content: string;

    if (action === 'chat' && messages) {
      // Format messages for the specific provider
      const formattedPayload = formatMessagesForProvider(provider, messages);
      
      // Override model and temperature if provided
      if (model) formattedPayload.model = model;
      if (temperature !== undefined) formattedPayload.temperature = temperature;
      if (maxTokens) formattedPayload.max_tokens = maxTokens;

      // Call the provider API
      response = await callProvider(provider, formattedPayload);
      content = extractContent(provider, response);

    } else if (action === 'completion' && prompt) {
      // Convert prompt to messages format
      const messagePayload = formatMessagesForProvider(provider, [
        { role: 'user', content: prompt }
      ]);
      
      if (model) messagePayload.model = model;
      if (temperature !== undefined) messagePayload.temperature = temperature;
      if (maxTokens) messagePayload.max_tokens = maxTokens;

      response = await callProvider(provider, messagePayload);
      content = extractContent(provider, response);

    } else {
      throw new Error(`Unsupported action: ${action}`);
    }

    // Log API usage (estimate tokens - in production, extract from response)
    const estimatedTokens = Math.ceil((content.length + (prompt?.length || 0)) / 4);
    await logAPIUsage(user.id, provider, model || 'default', estimatedTokens);

    // Return successful response
    return new Response(
      JSON.stringify({ 
        data: response,
        content,
        provider,
        model: model || PROVIDERS[provider as keyof typeof PROVIDERS]?.defaultModel
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('AI Proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { 
        status: error.message?.includes('Rate limit') ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});