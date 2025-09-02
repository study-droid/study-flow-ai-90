import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, data } = await req.json();

    switch (type) {
      case 'csp-report': {
        // Handle CSP violation reports
        const cspReport = data['csp-report'];
        if (cspReport) {
          await supabase.from('security_audit_log').insert({
            event_type: 'suspicious_activity',
            details: {
              type: 'csp_violation',
              blocked_uri: cspReport['blocked-uri'],
              violated_directive: cspReport['violated-directive'],
              source_file: cspReport['source-file'],
              line_number: cspReport['line-number'],
            },
            severity: 'medium',
            ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
            user_agent: req.headers.get('user-agent'),
          });
        }
        break;
      }

      case 'security-event': {
        // Handle custom security events
        const { event_type, user_id, details, severity } = data;
        
        // Log the security event
        await supabase.from('security_audit_log').insert({
          event_type,
          user_id,
          details,
          severity: severity || 'low',
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
          user_agent: req.headers.get('user-agent'),
        });

        // Check for patterns that require immediate action
        if (severity === 'critical' || severity === 'high') {
          // Send notification to user
          await supabase.from('notifications').insert({
            user_id,
            title: 'Security Alert',
            message: `Suspicious activity detected: ${details.reason || 'Unknown'}`,
            type: 'system',
            priority: 'urgent',
            action_url: '/settings',
          });

          // Check rate limiting
          const { data: recentEvents } = await supabase
            .from('security_audit_log')
            .select('*')
            .eq('user_id', user_id)
            .eq('severity', severity)
            .gte('created_at', new Date(Date.now() - 3600000).toISOString())
            .order('created_at', { ascending: false });

          // If too many high-severity events, consider blocking the user
          if (recentEvents && recentEvents.length > 5) {
            // Update user status or trigger account review
            await supabase.from('profiles').update({
              status: 'under_review',
              status_reason: 'Multiple security events detected',
            }).eq('user_id', user_id);
          }
        }
        break;
      }

      case 'rate-limit-check': {
        // Check if user has exceeded rate limits
        const { user_id: userId, action } = data;
        
        const { data: rateLimitData } = await supabase
          .from('rate_limits')
          .select('*')
          .eq('user_id', userId)
          .eq('action', action)
          .single();

        if (rateLimitData) {
          const now = new Date();
          const blockedUntil = rateLimitData.blocked_until ? new Date(rateLimitData.blocked_until) : null;
          
          if (blockedUntil && blockedUntil > now) {
            return new Response(
              JSON.stringify({ 
                allowed: false, 
                message: 'Rate limit exceeded',
                blocked_until: blockedUntil.toISOString(),
              }),
              { 
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        }
        
        // Update rate limit counter
        await supabase.rpc('check_rate_limit', {
          p_user_id: userId,
          p_action: action,
          p_max_attempts: 60,
          p_window_minutes: 1,
        });
        
        break;
      }

      case 'anomaly-detection': {
        // Analyze user behavior for anomalies
        const { user_id: anomalyUserId, patterns } = data;
        
        // Get user's typical behavior patterns
        const { data: historicalData } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', anomalyUserId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString());

        if (historicalData) {
          // Simple anomaly detection based on deviation from normal patterns
          const avgSessionDuration = historicalData.reduce((sum, s) => sum + s.duration_minutes, 0) / historicalData.length;
          const currentDuration = patterns.session_duration;
          
          if (currentDuration > avgSessionDuration * 3 || currentDuration < avgSessionDuration * 0.1) {
            await supabase.from('security_audit_log').insert({
              event_type: 'suspicious_activity',
              user_id: anomalyUserId,
              details: {
                type: 'anomaly_detected',
                reason: 'Unusual session duration',
                expected: avgSessionDuration,
                actual: currentDuration,
              },
              severity: 'low',
            });
          }
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown event type' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Security monitor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});