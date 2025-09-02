import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { getSupabaseUrl, getSupabaseAnonKey, log } from '@/lib/config';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: window?.localStorage || undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    debug: import.meta.env.VITE_DEV_MODE === 'true',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'study-flow-ai-client',
      'Content-Type': 'application/json',
    },
  },
  // Disable realtime to prevent unnecessary WebSocket connections
  realtime: false,
});

// Enhanced error handling wrapper for Supabase calls
export async function withErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<T> {
  try {
    log.debug(`Starting ${context}`);
    const { data, error } = await operation();
    
    if (error) {
      log.error(`${context} failed:`, error);
      
      // Handle specific error types
      if (error.message?.includes('CORS')) {
        throw new Error('Network connection issue. Please refresh the page and try again.');
      } else if (error.message?.includes('auth')) {
        throw new Error('Authentication required. Please sign in and try again.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw new Error(error.message || `Failed to ${context}`);
    }
    
    log.debug(`${context} completed successfully`);
    return data as T;
  } catch (error: any) {
    log.error(`${context} exception:`, error);
    
    if (error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
    }
    
    throw error;
  }
}

// Initialize auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  log.debug('Auth state change:', event, session?.user?.id);
  
  if (event === 'SIGNED_IN') {
    log.info('User signed in:', session?.user?.email);
  } else if (event === 'SIGNED_OUT') {
    log.info('User signed out');
  }
});

// Network connection status monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    log.info('Network connection restored');
  });

  window.addEventListener('offline', () => {
    log.warn('Network connection lost - app will work with cached data');
  });
}