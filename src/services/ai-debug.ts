import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

// Debug function to test AI service
export async function debugAIService() {

  try {
    // Step 1: Check authentication
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      logger.error('❌ Authentication failed:', authError?.message || 'No session', 'AiDebug');
      return { step: 'auth', error: 'Not authenticated' };
    }

    // Step 2: Check database tables
    
    const requiredTables = ['rate_limits', 'api_usage_logs', 'ai_tutor_sessions'];
    
    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          logger.error(`❌ Table ${table}:`, error.message, 'AiDebug');
          return { step: 'database', error: `Table ${table} error: ${error.message}` };
        } else {
          
        }
      } catch (e) {
        logger.error(`❌ Table ${table}:`, e, 'AiDebug');
        return { step: 'database', error: `Table ${table} failed: ${e.message}` };
      }
    }
    
    // Step 3: Test Edge Function with minimal request
    
    const testRequest = {
      provider: 'gemini' as const,
      action: 'chat' as const,
      messages: [{ role: 'user', content: 'Hello' }]
    };

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: testRequest,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error('❌ Edge Function Error:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        details: error.details,
        fullError: error
      });
      return { 
        step: 'edge_function', 
        error: `Edge Function failed: ${error.message}`,
        details: error
      };
    }

    // Step 4: Validate response structure
    
    if (!data) {
      return { step: 'validation', error: 'No data returned from Edge Function' };
    }
    
    if (data.error) {
      logger.error('❌ AI Service returned error:', data.error, 'AiDebug');
      return { step: 'ai_service', error: data.error, details: data };
    }
    
    const hasValidResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!hasValidResponse) {
      logger.error('❌ Invalid response structure:', data, 'AiDebug');
      return { step: 'validation', error: 'Invalid response structure', data };
    }

    return { 
      step: 'success', 
      message: 'AI Service is working correctly',
      response: hasValidResponse
    };
    
  } catch (error: any) {
    logger.error('💥 Unexpected error during debug:', error, 'AiDebug');
    return { 
      step: 'unexpected', 
      error: error.message || 'Unknown error',
      stack: error.stack
    };
  }
}

// Add this to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).debugAIService = debugAIService;
}