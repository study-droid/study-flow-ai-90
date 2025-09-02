-- Create missing tables that are referenced in the codebase

-- Create user_ai_connections table for AI provider integrations
CREATE TABLE IF NOT EXISTS public.user_ai_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('claude', 'openai', 'gemini', 'perplexity')),
    connection_name TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status TEXT DEFAULT 'pending' CHECK (test_status IN ('success', 'failed', 'pending')),
    test_error TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create focus_sessions table (even though it should use study_sessions, this prevents 404s)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'focus',
    duration_minutes INTEGER NOT NULL,
    subject TEXT,
    notes TEXT,
    focus_score DECIMAL(3, 2) CHECK (focus_score >= 0 AND focus_score <= 10),
    interruptions INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_ai_connections_user_id ON public.user_ai_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_connections_provider ON public.user_ai_connections(provider);
CREATE INDEX IF NOT EXISTS idx_user_ai_connections_is_active ON public.user_ai_connections(is_active);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_at ON public.focus_sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_session_type ON public.focus_sessions(session_type);

-- Enable Row Level Security
ALTER TABLE public.user_ai_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_ai_connections
CREATE POLICY "Users can view their own AI connections" ON public.user_ai_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI connections" ON public.user_ai_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI connections" ON public.user_ai_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI connections" ON public.user_ai_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for focus_sessions
CREATE POLICY "Users can view their own focus sessions" ON public.focus_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions" ON public.focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions" ON public.focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions" ON public.focus_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_ai_connections_updated_at
    BEFORE UPDATE ON public.user_ai_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_sessions_updated_at
    BEFORE UPDATE ON public.focus_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();