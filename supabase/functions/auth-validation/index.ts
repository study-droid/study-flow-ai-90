import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../cors-config.ts';
import { SecureLogger } from '../lib/secure-logger.ts';

interface ValidationRequest {
  email: string;
  action: 'validate' | 'signup';
}

// Server-side email domain restrictions
const ALLOWED_EMAIL_DOMAINS = [
  '@gmail.com',
  '@hotmail.com',
  '@outlook.com',
  '@yahoo.com',
  '@protonmail.com',
  '@icloud.com'
];

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }
  
  const corsHeaders = getCorsHeaders(req);
  
  try {
    // Parse request
    const { email, action }: ValidationRequest = await req.json();
    
    if (!email || !action) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Missing required parameters' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid email format' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check domain restrictions
    const emailLower = email.toLowerCase();
    const isDomainAllowed = ALLOWED_EMAIL_DOMAINS.some(domain => 
      emailLower.endsWith(domain)
    );

    if (!isDomainAllowed) {
      SecureLogger.warn('Email domain not allowed', { 
        email: emailLower.replace(/^[^@]+/, '***'), // Partially redact email
        action 
      });
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Email domain not allowed. Please use one of: ${ALLOWED_EMAIL_DOMAINS.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional validation for signup
    if (action === 'signup') {
      // Check for disposable email providers
      const disposableProviders = [
        'tempmail',
        'guerrillamail',
        '10minutemail',
        'mailinator',
        'throwaway'
      ];
      
      const isDisposable = disposableProviders.some(provider => 
        emailLower.includes(provider)
      );
      
      if (isDisposable) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Disposable email addresses are not allowed' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check email length
      if (email.length > 254) { // RFC 5321 max email length
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Email address is too long' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log successful validation (without PII)
    SecureLogger.info('Email validation successful', { 
      action,
      domain: emailLower.split('@')[1]
    });

    return new Response(
      JSON.stringify({ 
        valid: true,
        message: 'Email validation successful'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    SecureLogger.error('Email validation error', error);
    
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: 'Validation service error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});