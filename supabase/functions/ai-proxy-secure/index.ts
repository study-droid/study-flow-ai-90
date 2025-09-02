import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AIRequest {
  provider?: 'openai' | 'gemini' | 'claude' | 'deepseek';
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  messages?: Array<{ role: string; content: string }>;
}

// CORS headers - Production ready with all required headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, authorization, X-Client-Info, x-client-info, apikey, Content-Type, content-type, X-Signature, x-signature, X-Timestamp, x-timestamp, X-Nonce, x-nonce',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// API key configuration with DeepSeek as primary/default
const API_KEY_CONFIG = {
  deepseek: {
    primary: 'DEEPSEEK_API_KEY',
    fallback: 'VITE_DEEPSEEK_API_KEY'
  },
  gemini: {
    primary: 'GEMINI_API_KEY',
    fallback: 'VITE_GEMINI_API_KEY'
  },
  openai: {
    primary: 'OPENAI_API_KEY',
    fallback: 'OPEN_AI_KEY'
  },
  claude: {
    primary: 'CLAUDE_API_KEY',
    fallback: 'VITE_CLAUDE_API_KEY'
  }
};

// Default provider is DeepSeek
const DEFAULT_PROVIDER = 'deepseek';

// Updated model names - using latest available models
const DEFAULT_MODELS = {
  deepseek: 'deepseek-chat',         // DeepSeek general model (default)
  gemini: 'gemini-1.5-flash',        // Fast and efficient
  openai: 'gpt-3.5-turbo',          // Cost-effective OpenAI model
  claude: 'claude-3-haiku-20240307'  // Fast Claude model
};

serve(async (req) => {
  console.log('AI Proxy Secure - Request:', req.method, new URL(req.url).pathname);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Parse request body
    const requestBody: AIRequest = await req.json();
    const {
      provider = DEFAULT_PROVIDER,
      prompt,
      model,
      temperature = 0.7,
      max_tokens = 2000,
      messages
    } = requestBody;

    // Validate request
    if (!prompt && !messages) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request',
          message: 'Please provide a prompt or messages array'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing request - Provider: ${provider}, Model: ${model || 'default'}`);

    // Get API key with fallback logic
    const apiKeyResult = await getApiKey(provider);
    
    if (!apiKeyResult) {
      // Try DeepSeek as fallback if original provider fails
      if (provider !== 'deepseek') {
        console.log(`${provider} not available, trying DeepSeek as fallback`);
        const deepseekKey = await getApiKey('deepseek');
        if (deepseekKey) {
          // Use DeepSeek as fallback
          const response = await callDeepSeek(
            deepseekKey,
            prompt || formatMessages(messages),
            DEFAULT_MODELS.deepseek,
            temperature,
            max_tokens,
            messages
          );
          response.metadata = {
            requested_provider: provider,
            actual_provider: 'deepseek',
            reason: 'Fallback to available provider'
          };
          return new Response(
            JSON.stringify(response),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      return new Response(
        JSON.stringify({ 
          error: 'API keys not configured',
          message: 'AI service is not available. Please configure API keys.',
          setup: {
            instruction: 'Add your API keys to Supabase Edge Function secrets',
            required: 'DEEPSEEK_API_KEY from DeepSeek',
            optional: [
              'GEMINI_API_KEY from https://makersuite.google.com/app/apikey',
              'OPENAI_API_KEY from https://platform.openai.com/api-keys',
              'CLAUDE_API_KEY from https://console.anthropic.com/'
            ]
          }
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Make the API call
    let response;
    const actualModel = model || DEFAULT_MODELS[provider];
    const finalPrompt = prompt || formatMessages(messages);

    try {
      switch (provider) {
        case 'deepseek':
          response = await callDeepSeek(apiKeyResult, finalPrompt, actualModel, temperature, max_tokens, messages);
          break;
        case 'gemini':
          response = await callGemini(apiKeyResult, finalPrompt, actualModel, temperature, max_tokens);
          break;
        case 'openai':
          response = await callOpenAI(apiKeyResult, finalPrompt, actualModel, temperature, max_tokens, messages);
          break;
        case 'claude':
          response = await callClaude(apiKeyResult, finalPrompt, actualModel, temperature, max_tokens);
          break;
        default:
          // Default to DeepSeek
          response = await callDeepSeek(apiKeyResult, finalPrompt, actualModel, temperature, max_tokens, messages);
          break;
      }
    } catch (apiError) {
      console.error(`API call failed for ${provider}:`, apiError);
      
      // If primary provider fails, try DeepSeek as fallback
      if (provider !== 'deepseek') {
        console.log('Primary provider failed, attempting DeepSeek fallback');
        const deepseekKey = await getApiKey('deepseek');
        if (deepseekKey) {
          try {
            response = await callDeepSeek(
              deepseekKey,
              finalPrompt,
              DEFAULT_MODELS.deepseek,
              temperature,
              max_tokens,
              messages
            );
            response.metadata = {
              requested_provider: provider,
              actual_provider: 'deepseek',
              reason: 'Primary provider failed, using fallback'
            };
          } catch (fallbackError) {
            console.error('DeepSeek fallback also failed:', fallbackError);
            throw apiError; // Throw original error
          }
        } else {
          throw apiError;
        }
      } else {
        throw apiError;
      }
    }

    // Return successful response
    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in AI proxy:', error);
    
    // Determine appropriate error message and status
    let userMessage = 'AI service temporarily unavailable';
    let statusCode = 500;
    
    if (error.message?.includes('quota')) {
      userMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('API key')) {
      userMessage = 'Invalid API configuration. Please check your API keys.';
      statusCode = 503;
    } else if (error.message?.includes('model')) {
      userMessage = 'Invalid model specified. Please use a supported model.';
      statusCode = 400;
    } else if (error.message?.includes('safety')) {
      userMessage = 'Response blocked by safety filters. Please rephrase your request.';
      statusCode = 400;
    }

    return new Response(
      JSON.stringify({ 
        error: userMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to get API key with fallback
async function getApiKey(provider: string): Promise<string | null> {
  const config = API_KEY_CONFIG[provider];
  if (!config) return null;

  // Try primary key
  let apiKey = Deno.env.get(config.primary);
  if (apiKey && apiKey !== 'your_key_here' && !apiKey.includes('REPLACE')) {
    return apiKey;
  }

  // Try fallback key
  if (config.fallback) {
    apiKey = Deno.env.get(config.fallback);
    if (apiKey && apiKey !== 'your_key_here' && !apiKey.includes('REPLACE')) {
      return apiKey;
    }
  }

  console.log(`No valid API key found for ${provider}`);
  return null;
}

// Helper function to format messages array as prompt
function formatMessages(messages?: Array<{ role: string; content: string }>): string {
  if (!messages || messages.length === 0) return '';
  return messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
}

// Gemini API call
async function callGemini(
  apiKey: string,
  prompt: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<any> {
  // Validate and adjust model name
  const validModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
  const actualModel = validModels.includes(model) ? model : 'gemini-1.5-flash';
  
  console.log(`Calling Gemini with model: ${actualModel}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens,
          topK: 40,
          topP: 0.95
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated - content may have been blocked by safety filters');
  }

  return {
    provider: 'gemini',
    model: actualModel,
    content: data.candidates[0].content.parts[0].text,
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount,
      completion_tokens: data.usageMetadata?.candidatesTokenCount,
      total_tokens: data.usageMetadata?.totalTokenCount
    }
  };
}

// OpenAI API call (supports OpenRouter)
async function callOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
  messages?: Array<{ role: string; content: string }>
): Promise<any> {
  // Check if it's an OpenRouter key
  const isOpenRouter = apiKey.startsWith('sk-or-');
  const apiUrl = isOpenRouter 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  
  // Adjust model for OpenRouter
  const actualModel = isOpenRouter && !model.includes('/') 
    ? `openai/${model}`
    : model;

  console.log(`Calling ${isOpenRouter ? 'OpenRouter' : 'OpenAI'} with model: ${actualModel}`);

  const chatMessages = messages || [{ role: 'user', content: prompt }];
  
  const headers: any = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'https://study-flow.net';
    headers['X-Title'] = 'StudyFlow AI';
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: actualModel,
      messages: chatMessages,
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();

  return {
    provider: isOpenRouter ? 'openrouter' : 'openai',
    model: actualModel,
    content: data.choices[0].message.content,
    usage: data.usage
  };
}

// Claude API call
async function callClaude(
  apiKey: string,
  prompt: string,
  model: string,
  temperature: number,
  maxTokens: number
): Promise<any> {
  // Validate model
  const validModels = [
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229'
  ];
  const actualModel = validModels.includes(model) ? model : 'claude-3-haiku-20240307';

  console.log(`Calling Claude with model: ${actualModel}`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: actualModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Claude API error:', error);
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();

  return {
    provider: 'claude',
    model: actualModel,
    content: data.content[0].text,
    usage: {
      prompt_tokens: data.usage?.input_tokens,
      completion_tokens: data.usage?.output_tokens,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  };
}

// DeepSeek API call (OpenAI-compatible)
async function callDeepSeek(
  apiKey: string,
  prompt: string,
  model: string,
  temperature: number,
  maxTokens: number,
  messages?: Array<{ role: string; content: string }>
): Promise<any> {
  // Use provided API key
  const finalApiKey = apiKey;
  
  // Validate model
  const validModels = ['deepseek-chat', 'deepseek-reasoner'];
  const actualModel = validModels.includes(model) ? model : 'deepseek-chat';
  
  console.log(`Calling DeepSeek with model: ${actualModel}`);

  // Use messages if provided, otherwise create from prompt
  const chatMessages = messages || [{ role: 'user', content: prompt }];
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${finalApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: actualModel,
      messages: chatMessages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('DeepSeek API error:', error);
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();

  return {
    provider: 'deepseek',
    model: actualModel,
    content: data.choices[0].message.content,
    usage: data.usage
  };
}