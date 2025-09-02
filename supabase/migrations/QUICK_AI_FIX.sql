-- Quick fix for AI Tutor service - handles existing and new tables
-- Run this if you get "column does not exist" errors

-- Drop and recreate tables to ensure clean state
DROP TABLE IF EXISTS public.ai_tutor_messages CASCADE;
DROP TABLE IF EXISTS public.ai_tutor_sessions CASCADE;
DROP TABLE IF EXISTS public.api_usage_logs CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Create rate_limits table
CREATE TABLE public.rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    last_reset TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, service)
);

-- Create api_usage_logs table
CREATE TABLE public.api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    action TEXT NOT NULL,
    model TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_tutor_sessions table
CREATE TABLE public.ai_tutor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    ai_provider TEXT DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'claude', 'openai', 'perplexity')),
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_tutor_messages table
CREATE TABLE public.ai_tutor_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "rate_limits_policy" ON public.rate_limits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "api_usage_logs_policy" ON public.api_usage_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ai_tutor_sessions_policy" ON public.ai_tutor_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "ai_tutor_messages_select" ON public.ai_tutor_messages 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.ai_tutor_sessions 
        WHERE id = ai_tutor_messages.session_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "ai_tutor_messages_insert" ON public.ai_tutor_messages 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ai_tutor_sessions 
        WHERE id = ai_tutor_messages.session_id 
        AND user_id = auth.uid()
    )
);

-- Indexes
CREATE INDEX idx_rate_limits_user_service ON public.rate_limits(user_id, service);
CREATE INDEX idx_api_usage_logs_user_timestamp ON public.api_usage_logs(user_id, timestamp);
CREATE INDEX idx_ai_tutor_sessions_user_active ON public.ai_tutor_sessions(user_id, last_active DESC);
CREATE INDEX idx_ai_tutor_messages_session ON public.ai_tutor_messages(session_id, timestamp);

-- Refresh schema
NOTIFY pgrst, 'reload schema';

SELECT 'AI service tables recreated successfully! Now add GEMINI_API_KEY to Supabase environment variables.' as status;