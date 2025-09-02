-- Create AI tutor sessions table
CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  ai_provider TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI tutor messages table
CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance (check if columns exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_sessions_user_id') THEN
    CREATE INDEX idx_ai_tutor_sessions_user_id ON public.ai_tutor_sessions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_sessions_created_at') THEN
    CREATE INDEX idx_ai_tutor_sessions_created_at ON public.ai_tutor_sessions(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_session_id') THEN
    CREATE INDEX idx_ai_tutor_messages_session_id ON public.ai_tutor_messages(session_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_timestamp') 
     AND EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_tutor_messages' 
                 AND column_name = 'timestamp') THEN
    CREATE INDEX idx_ai_tutor_messages_timestamp ON public.ai_tutor_messages(timestamp DESC);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_tutor_sessions
CREATE POLICY "Users can view their own sessions" ON public.ai_tutor_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.ai_tutor_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.ai_tutor_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.ai_tutor_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for ai_tutor_messages
CREATE POLICY "Users can view messages from their sessions" ON public.ai_tutor_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their sessions" ON public.ai_tutor_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their sessions" ON public.ai_tutor_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their sessions" ON public.ai_tutor_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

-- Create function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_tutor_sessions
  SET last_active = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_active when new message is added
CREATE TRIGGER update_session_last_active_trigger
AFTER INSERT ON public.ai_tutor_messages
FOR EACH ROW
EXECUTE FUNCTION update_session_last_active();