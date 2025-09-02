-- AI Service Tables Migration
-- This creates the required tables for the AI Tutor service to function properly

-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, service)
);

-- Create api_usage_logs table for tracking API usage
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    action TEXT NOT NULL,
    model TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_tutor_sessions table for storing chat sessions
CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    ai_provider TEXT DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'claude', 'openai', 'perplexity')),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_archived column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_tutor_sessions' 
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.ai_tutor_sessions ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create ai_tutor_messages table for storing chat messages
CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for rate_limits
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits" ON public.rate_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits" ON public.rate_limits
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for api_usage_logs
CREATE POLICY "Users can view their own usage logs" ON public.api_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs" ON public.api_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_tutor_sessions
CREATE POLICY "Users can manage their own tutor sessions" ON public.ai_tutor_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for ai_tutor_messages
CREATE POLICY "Users can view messages from their sessions" ON public.ai_tutor_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_tutor_sessions 
            WHERE id = ai_tutor_messages.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their sessions" ON public.ai_tutor_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_tutor_sessions 
            WHERE id = ai_tutor_messages.session_id 
            AND user_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_service ON public.rate_limits(user_id, service);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_timestamp ON public.api_usage_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_user_active ON public.ai_tutor_sessions(user_id, last_active DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_session ON public.ai_tutor_messages(session_id, timestamp);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'AI service tables created successfully! 
Next steps:
1. Add GEMINI_API_KEY to Supabase environment variables
2. Optionally add Gemini_key_2 for backup
3. Test the AI Tutor functionality' as setup_complete;