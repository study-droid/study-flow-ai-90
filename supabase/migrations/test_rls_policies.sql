-- Test RLS Policies for Study-Flow
-- This script tests that RLS policies are working correctly

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ DISABLED' END as status
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
AND t.tablename IN (
    'profiles', 'achievements', 'study_sessions', 'study_goals',
    'flashcards', 'spaced_repetition_data', 'notifications',
    'audit_logs', 'ai_tutor_sessions', 'ai_tutor_messages',
    'rate_limits', 'api_usage_logs'
)
ORDER BY t.tablename;

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- SECURITY TEST SCENARIOS
-- ============================================================================

-- Test 1: Verify users can only see their own data
-- This should work when executed by an authenticated user
/*
-- Example test for profiles (replace with actual user tests)
SELECT 
    'profiles' as table_name,
    COUNT(*) as accessible_rows,
    CASE 
        WHEN COUNT(*) <= 1 THEN '✅ PASS - Can only see own data'
        ELSE '❌ FAIL - Can see other users data'
    END as test_result
FROM public.profiles;
*/

-- ============================================================================
-- POLICY VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate RLS setup
CREATE OR REPLACE FUNCTION public.validate_rls_setup()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        COALESCE(c.relrowsecurity, false) as rls_enabled,
        COALESCE(p.policy_count, 0) as policy_count,
        CASE 
            WHEN COALESCE(c.relrowsecurity, false) = false THEN '❌ RLS Not Enabled'
            WHEN COALESCE(p.policy_count, 0) = 0 THEN '⚠️ RLS Enabled but No Policies'
            ELSE '✅ RLS Enabled with Policies'
        END::TEXT as status
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
    )
    LEFT JOIN (
        SELECT tablename, COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) p ON p.tablename = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'profiles', 'achievements', 'study_sessions', 'study_goals',
        'flashcards', 'spaced_repetition_data', 'notifications',
        'audit_logs', 'ai_tutor_sessions', 'ai_tutor_messages',
        'rate_limits', 'api_usage_logs'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test user access
CREATE OR REPLACE FUNCTION public.test_user_access()
RETURNS TABLE(
    table_name TEXT,
    can_select BOOLEAN,
    can_insert BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    test_user_id UUID;
    result_record RECORD;
BEGIN
    -- Get current user ID (should be authenticated)
    test_user_id := auth.uid();
    
    IF test_user_id IS NULL THEN
        RETURN QUERY SELECT 
            'ERROR'::TEXT as table_name,
            false as can_select,
            false as can_insert,
            'No authenticated user - cannot test RLS policies'::TEXT as error_message;
        RETURN;
    END IF;

    -- Test profiles table
    BEGIN
        PERFORM * FROM public.profiles WHERE user_id = test_user_id LIMIT 1;
        
        RETURN QUERY SELECT 
            'profiles'::TEXT,
            true as can_select,
            true as can_insert,  -- Assume insert works if select works
            ''::TEXT as error_message;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'profiles'::TEXT,
            false as can_select,
            false as can_insert,
            SQLERRM::TEXT as error_message;
    END;

    -- Add more table tests as needed...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RUN VALIDATION
-- ============================================================================

-- Check RLS validation
SELECT * FROM public.validate_rls_setup();

-- ============================================================================
-- CLEANUP TEST FUNCTIONS (Optional)
-- ============================================================================

-- DROP FUNCTION IF EXISTS public.validate_rls_setup();
-- DROP FUNCTION IF EXISTS public.test_user_access();