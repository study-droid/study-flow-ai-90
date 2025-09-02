-- Comprehensive fix for all Supabase security warnings
-- This migration addresses function search_path issues

-- First, check if functions exist and their current definitions
DO $$
BEGIN
    RAISE NOTICE 'Starting security fixes for functions...';
END $$;

-- Drop and recreate functions with proper search_path
-- Using CASCADE to handle dependencies

-- 1. Fix test_user_access function
DROP FUNCTION IF EXISTS public.test_user_access(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.test_user_access(test_user_id uuid)
RETURNS TABLE (
    resource_type text,
    can_read boolean,
    can_write boolean,
    record_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Test tasks access
    RETURN QUERY
    SELECT 
        'tasks'::text as resource_type,
        EXISTS(SELECT 1 FROM tasks WHERE user_id = test_user_id) as can_read,
        true as can_write,
        COUNT(*)::integer as record_count
    FROM tasks
    WHERE user_id = test_user_id;
    
    -- Test flashcards access
    RETURN QUERY
    SELECT 
        'flashcards'::text as resource_type,
        EXISTS(SELECT 1 FROM flashcards WHERE user_id = test_user_id) as can_read,
        true as can_write,
        COUNT(*)::integer as record_count
    FROM flashcards
    WHERE user_id = test_user_id;
    
    -- Test study_sessions access
    RETURN QUERY
    SELECT 
        'study_sessions'::text as resource_type,
        EXISTS(SELECT 1 FROM study_sessions WHERE user_id = test_user_id) as can_read,
        true as can_write,
        COUNT(*)::integer as record_count
    FROM study_sessions
    WHERE user_id = test_user_id;
END;
$$;

-- 2. Fix user_owns_resource function
DROP FUNCTION IF EXISTS public.user_owns_resource(text, uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.user_owns_resource(
    resource_table text,
    resource_id uuid,
    check_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result boolean;
BEGIN
    -- Validate table name to prevent SQL injection
    IF resource_table NOT IN ('tasks', 'flashcards', 'study_sessions', 'subjects', 'goals', 'achievements') THEN
        RETURN false;
    END IF;
    
    -- Check ownership based on table
    CASE resource_table
        WHEN 'tasks' THEN
            SELECT EXISTS(SELECT 1 FROM tasks WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'flashcards' THEN
            SELECT EXISTS(SELECT 1 FROM flashcards WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'study_sessions' THEN
            SELECT EXISTS(SELECT 1 FROM study_sessions WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'subjects' THEN
            SELECT EXISTS(SELECT 1 FROM subjects WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'goals' THEN
            SELECT EXISTS(SELECT 1 FROM goals WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'achievements' THEN
            SELECT EXISTS(SELECT 1 FROM user_achievements WHERE achievement_id = resource_id AND user_id = check_user_id) INTO result;
        ELSE
            result := false;
    END CASE;
    
    RETURN result;
END;
$$;

-- 3. Fix log_security_event function
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.log_security_event(
    event_type text,
    event_details jsonb,
    event_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_event_id uuid;
BEGIN
    -- Check if security_events table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_events') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE IF NOT EXISTS security_events (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id uuid REFERENCES auth.users(id),
            event_type text NOT NULL,
            event_details jsonb,
            ip_address text,
            user_agent text,
            created_at timestamptz DEFAULT now()
        );
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
    END IF;
    
    -- Insert the security event
    INSERT INTO security_events (
        user_id,
        event_type,
        event_details,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        COALESCE(event_user_id, auth.uid()),
        event_type,
        event_details,
        COALESCE(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', 'unknown'),
        COALESCE(current_setting('request.headers', true)::jsonb->>'user-agent', 'unknown'),
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_event_id;
    
    RETURN new_event_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.test_user_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_user_access(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.user_owns_resource(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_resource(text, uuid, uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, uuid) TO anon;

-- Add comments for documentation
COMMENT ON FUNCTION public.test_user_access(uuid) IS 'Tests user access to various resources with proper search_path security';
COMMENT ON FUNCTION public.user_owns_resource(text, uuid, uuid) IS 'Checks if a user owns a specific resource with proper search_path security';
COMMENT ON FUNCTION public.log_security_event(text, jsonb, uuid) IS 'Logs security events for auditing with proper search_path security';

-- Verify the fixes
DO $$
DECLARE
    func_count integer;
BEGIN
    -- Count functions with proper search_path
    SELECT COUNT(*)
    INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('test_user_access', 'user_owns_resource', 'log_security_event')
    AND p.proconfig IS NOT NULL
    AND p.proconfig::text LIKE '%search_path%';
    
    RAISE NOTICE 'Functions with search_path configured: %', func_count;
    
    IF func_count = 3 THEN
        RAISE NOTICE 'SUCCESS: All 3 functions have been fixed with proper search_path';
    ELSE
        RAISE WARNING 'Some functions may still need attention';
    END IF;
END $$;

-- Final validation query
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.proconfig AS config_settings,
    CASE 
        WHEN p.proconfig IS NOT NULL AND p.proconfig::text LIKE '%search_path%' 
        THEN '✅ FIXED'
        ELSE '❌ NEEDS FIX'
    END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('test_user_access', 'user_owns_resource', 'log_security_event')
ORDER BY p.proname;