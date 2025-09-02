import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check what environment variables are available
    const keys = {
      OPEN_AI_KEY: !!Deno.env.get('OPEN_AI_KEY'),
      OPEN_AI_KEY_QWEN: !!Deno.env.get('OPEN_AI_KEY_QWEN'),
      OPENAI_API_KEY: !!Deno.env.get('OPENAI_API_KEY'),
      GEMINI_API_KEY: !!Deno.env.get('GEMINI_API_KEY'),
      CLAUDE_API_KEY: !!Deno.env.get('CLAUDE_API_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    };

    // Get the actual primary key (masked)
    const primaryKey = Deno.env.get('OPEN_AI_KEY');
    const fallbackKey = Deno.env.get('OPEN_AI_KEY_QWEN');
    
    const result = {
      message: 'Environment check complete',
      keys_found: keys,
      primary_key_length: primaryKey ? primaryKey.length : 0,
      fallback_key_length: fallbackKey ? fallbackKey.length : 0,
      primary_key_preview: primaryKey ? `${primaryKey.substring(0, 7)}...` : 'NOT FOUND',
      fallback_key_preview: fallbackKey ? `${fallbackKey.substring(0, 7)}...` : 'NOT FOUND',
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});