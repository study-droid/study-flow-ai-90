import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp, x-nonce',
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

    const config = PROVIDERS[provider as keyof typeof PROVIDERS];
    if (!config || !config.apiKey) {
      throw new Error(`${provider} API key not configured`);
    }

    // Format request based on provider
    let requestBody: any;
    let url = config.endpoint;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'gemini') {
      url += `?key=${config.apiKey}`;
      requestBody = {
        contents: messages.map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }))
      };
    } else if (provider === 'claude') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      requestBody = {
        model: model || config.defaultModel,
        max_tokens: maxTokens || 1024,
        messages: messages.filter((msg: any) => msg.role !== 'system')
      };
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      requestBody = {
        model: model || config.defaultModel,
        messages,
        max_tokens: maxTokens || 1024,
        temperature: temperature || 0.7
      };
    }

    // Call provider API
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${provider} API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Return successful response
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('AI Proxy error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});