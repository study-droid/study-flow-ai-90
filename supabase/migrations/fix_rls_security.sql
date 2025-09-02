-- Fix RLS Security Issues for Study-Flow
-- This script enables RLS and creates proper policies for all tables

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

-- Core user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Learning content tables
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_data ENABLE ROW LEVEL SECURITY;

-- System tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- AI and system tables (if they exist)
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (if any exist)
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Achievements policies
DROP POLICY IF EXISTS "Everyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.achievements;

-- Study sessions policies
DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;

-- Study goals policies
DROP POLICY IF EXISTS "Users can manage own study goals" ON public.study_goals;

-- Flashcards policies
DROP POLICY IF EXISTS "Users can manage own flashcards" ON public.flashcards;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

-- Spaced repetition policies
DROP POLICY IF EXISTS "Users can manage own spaced repetition data" ON public.spaced_repetition_data;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ACHIEVEMENTS TABLE POLICIES
-- ============================================================================

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert achievements for users
CREATE POLICY "Service can insert achievements" ON public.achievements
    FOR INSERT WITH CHECK (true);

-- Users can update their own achievements
CREATE POLICY "Users can update own achievements" ON public.achievements
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- STUDY SESSIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own study sessions
CREATE POLICY "Users can view own study sessions" ON public.study_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own study sessions
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own study sessions
CREATE POLICY "Users can update own study sessions" ON public.study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own study sessions
CREATE POLICY "Users can delete own study sessions" ON public.study_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STUDY GOALS TABLE POLICIES
-- ============================================================================

-- Users can view their own study goals
CREATE POLICY "Users can view own study goals" ON public.study_goals
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own study goals
CREATE POLICY "Users can insert own study goals" ON public.study_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own study goals
CREATE POLICY "Users can update own study goals" ON public.study_goals
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own study goals
CREATE POLICY "Users can delete own study goals" ON public.study_goals
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FLASHCARDS TABLE POLICIES
-- ============================================================================

-- Users can view their own flashcards
CREATE POLICY "Users can view own flashcards" ON public.flashcards
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own flashcards
CREATE POLICY "Users can insert own flashcards" ON public.flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own flashcards
CREATE POLICY "Users can update own flashcards" ON public.flashcards
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own flashcards
CREATE POLICY "Users can delete own flashcards" ON public.flashcards
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- SPACED REPETITION DATA TABLE POLICIES
-- ============================================================================

-- Users can view their own spaced repetition data
CREATE POLICY "Users can view own spaced repetition data" ON public.spaced_repetition_data
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own spaced repetition data
CREATE POLICY "Users can insert own spaced repetition data" ON public.spaced_repetition_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own spaced repetition data
CREATE POLICY "Users can update own spaced repetition data" ON public.spaced_repetition_data
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own spaced repetition data
CREATE POLICY "Users can delete own spaced repetition data" ON public.spaced_repetition_data
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert notifications for users
CREATE POLICY "Service can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES (Admin access only)
-- ============================================================================

-- Only service role can access audit logs
CREATE POLICY "Service role can access audit logs" ON public.audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- AI TUTOR TABLES POLICIES
-- ============================================================================

-- AI Tutor Sessions
CREATE POLICY "Users can view own ai tutor sessions" ON public.ai_tutor_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai tutor sessions" ON public.ai_tutor_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai tutor sessions" ON public.ai_tutor_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- AI Tutor Messages
CREATE POLICY "Users can view own ai tutor messages" ON public.ai_tutor_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai tutor messages" ON public.ai_tutor_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SYSTEM TABLES POLICIES
-- ============================================================================

-- Rate Limits (system access only)
CREATE POLICY "Service role can access rate limits" ON public.rate_limits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- API Usage Logs (system access only)
CREATE POLICY "Service role can access api usage logs" ON public.api_usage_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaced_repetition_data TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tutor_sessions TO authenticated;
GRANT SELECT, INSERT ON public.ai_tutor_messages TO authenticated;

-- Grant service role full access to system tables
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.api_usage_logs TO service_role;

-- Allow service role to insert notifications and achievements
GRANT INSERT ON public.notifications TO service_role;
GRANT INSERT ON public.achievements TO service_role;

-- ============================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user owns a resource
CREATE OR REPLACE FUNCTION public.user_owns_resource(user_id UUID, resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_id = resource_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    action_type TEXT,
    table_name TEXT,
    record_id TEXT DEFAULT NULL,
    details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_data,
        ip_address,
        created_at
    ) VALUES (
        auth.uid(),
        action_type,
        table_name,
        record_id,
        details,
        COALESCE(current_setting('request.headers')::json->>'cf-connecting-ip', 
                current_setting('request.headers')::json->>'x-forwarded-for'),
        now()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Silently fail to avoid breaking main operations
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

DO $$
DECLARE
    table_record RECORD;
    rls_status BOOLEAN;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'profiles', 'achievements', 'study_sessions', 'study_goals', 
            'flashcards', 'spaced_repetition_data', 'notifications', 
            'audit_logs', 'ai_tutor_sessions', 'ai_tutor_messages',
            'rate_limits', 'api_usage_logs'
        )
    LOOP
        SELECT relrowsecurity INTO rls_status
        FROM pg_class
        WHERE relname = table_record.tablename
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
        
        IF NOT rls_status THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', table_record.tablename;
        END IF;
        
        RAISE NOTICE 'RLS enabled on table: %', table_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'All tables have RLS enabled successfully!';
END
$$;