-- Fix function search_path security issues
-- This migration sets the search_path for all functions to prevent security vulnerabilities

-- DROP existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.validate_rls_setup() CASCADE;
DROP FUNCTION IF EXISTS public.test_user_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.user_owns_resource(text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb, uuid) CASCADE;

-- 1. Recreate update_updated_at_column function
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 2. Recreate validate_rls_setup function
CREATE FUNCTION public.validate_rls_setup()
RETURNS TABLE (
    table_name text,
    has_rls boolean,
    policy_count integer
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        c.relrowsecurity as has_rls,
        COUNT(p.polname)::integer as policy_count
    FROM pg_class c
    LEFT JOIN pg_policy p ON c.oid = p.polrelid
    WHERE c.relnamespace = 'public'::regnamespace
        AND c.relkind = 'r'
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relname;
END;
$$;

-- 3. Recreate test_user_access function
CREATE FUNCTION public.test_user_access(test_user_id uuid)
RETURNS TABLE (
    resource_type text,
    can_read boolean,
    can_write boolean,
    record_count integer
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Test tasks access
    RETURN QUERY
    SELECT 
        'tasks'::text as resource_type,
        EXISTS(SELECT 1 FROM public.tasks WHERE user_id = test_user_id) as can_read,
        true as can_write, -- Assuming write access if read access exists
        COUNT(*)::integer as record_count
    FROM public.tasks
    WHERE user_id = test_user_id;
    
    -- Test flashcards access
    RETURN QUERY
    SELECT 
        'flashcards'::text as resource_type,
        EXISTS(SELECT 1 FROM public.flashcards WHERE user_id = test_user_id) as can_read,
        true as can_write,
        COUNT(*)::integer as record_count
    FROM public.flashcards
    WHERE user_id = test_user_id;
    
    -- Test study_sessions access
    RETURN QUERY
    SELECT 
        'study_sessions'::text as resource_type,
        EXISTS(SELECT 1 FROM public.study_sessions WHERE user_id = test_user_id) as can_read,
        true as can_write,
        COUNT(*)::integer as record_count
    FROM public.study_sessions
    WHERE user_id = test_user_id;
END;
$$;

-- 4. Recreate set_updated_at function
CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. Recreate user_owns_resource function
CREATE FUNCTION public.user_owns_resource(resource_table text, resource_id uuid, check_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
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
            SELECT EXISTS(SELECT 1 FROM public.tasks WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'flashcards' THEN
            SELECT EXISTS(SELECT 1 FROM public.flashcards WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'study_sessions' THEN
            SELECT EXISTS(SELECT 1 FROM public.study_sessions WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'subjects' THEN
            SELECT EXISTS(SELECT 1 FROM public.subjects WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'goals' THEN
            SELECT EXISTS(SELECT 1 FROM public.goals WHERE id = resource_id AND user_id = check_user_id) INTO result;
        WHEN 'achievements' THEN
            SELECT EXISTS(SELECT 1 FROM public.user_achievements WHERE achievement_id = resource_id AND user_id = check_user_id) INTO result;
        ELSE
            result := false;
    END CASE;
    
    RETURN result;
END;
$$;

-- 6. Recreate log_security_event function
CREATE FUNCTION public.log_security_event(
    event_type text,
    event_details jsonb,
    event_user_id uuid DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    new_event_id uuid;
BEGIN
    INSERT INTO public.security_events (
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

-- Recreate triggers that use these functions
-- Find and recreate all triggers that use update_updated_at_column or set_updated_at
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT DISTINCT event_object_table::text 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND action_statement LIKE '%update_updated_at_column%'
        OR action_statement LIKE '%set_updated_at%'
    LOOP
        -- Drop existing trigger
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', tbl, tbl);
        -- Recreate trigger
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', tbl, tbl);
    END LOOP;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_rls_setup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_user_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_resource(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, uuid) TO authenticated;

-- Add comment explaining the security fix
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically updates the updated_at timestamp. Fixed search_path for security.';
COMMENT ON FUNCTION public.validate_rls_setup() IS 'Validates RLS configuration for all tables. Fixed search_path for security.';
COMMENT ON FUNCTION public.test_user_access(uuid) IS 'Tests user access to various resources. Fixed search_path for security.';
COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger function to set updated_at timestamp. Fixed search_path for security.';
COMMENT ON FUNCTION public.user_owns_resource(text, uuid, uuid) IS 'Checks if a user owns a specific resource. Fixed search_path for security.';
COMMENT ON FUNCTION public.log_security_event(text, jsonb, uuid) IS 'Logs security events for auditing. Fixed search_path for security.';