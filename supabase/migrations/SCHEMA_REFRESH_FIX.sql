-- Force schema refresh for AI Tutor tables
-- This fixes the "Could not find the 'subject' column" error

-- First ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    ai_provider TEXT DEFAULT 'gemini',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add subject column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'ai_tutor_sessions' 
        AND column_name = 'subject'
    ) THEN
        ALTER TABLE public.ai_tutor_sessions ADD COLUMN subject TEXT NOT NULL DEFAULT 'General';
        UPDATE public.ai_tutor_sessions SET subject = 'General' WHERE subject IS NULL;
    END IF;

    -- Add ai_provider column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'ai_tutor_sessions' 
        AND column_name = 'ai_provider'
    ) THEN
        ALTER TABLE public.ai_tutor_sessions ADD COLUMN ai_provider TEXT DEFAULT 'gemini';
    END IF;

    -- Add is_archived column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'ai_tutor_sessions' 
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.ai_tutor_sessions ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "ai_tutor_sessions_policy" ON public.ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can manage their own tutor sessions" ON public.ai_tutor_sessions;

-- Create comprehensive RLS policy
CREATE POLICY "ai_tutor_sessions_policy" ON public.ai_tutor_sessions
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Force PostgREST to reload the schema cache
-- This is the critical step that fixes the "column not found" error
NOTIFY pgrst, 'reload schema';

-- Alternative method to force schema reload
COMMENT ON TABLE public.ai_tutor_sessions IS 'AI tutor sessions table - schema refreshed';

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ai_tutor_sessions'
ORDER BY ordinal_position;