import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Get API key from environment or use default
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || 'sk-e4f1da719783415d84e3eee0e669b829';
    
    // Parse request body
    const { prompt, messages, temperature = 0.7, max_tokens = 2000 } = await req.json();
    
    // Prepare messages for DeepSeek
    const chatMessages = messages || [{ role: 'user', content: prompt || 'Hello' }];
    
    console.log('Calling DeepSeek API...');
    
    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: chatMessages,
        temperature: temperature,
        max_tokens: max_tokens,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'DeepSeek API error', 
          details: error 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // Return successful response
    return new Response(
      JSON.stringify({
        provider: 'deepseek',
        model: 'deepseek-chat',
        content: data.choices[0].message.content,
        usage: data.usage
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});