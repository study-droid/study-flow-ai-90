-- Fix AI Tutor Messages Schema Issues
-- This migration addresses schema conflicts and missing columns

-- First, ensure the basic table structure exists
CREATE TABLE IF NOT EXISTS public.ai_tutor_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ai_tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add missing columns that may be expected by the application
ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS quality_score NUMERIC,
ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processing_result JSONB,
ADD COLUMN IF NOT EXISTS response_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace a function to populate user_id from session
CREATE OR REPLACE FUNCTION sync_message_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user_id from the associated session
  SELECT user_id INTO NEW.user_id 
  FROM public.ai_tutor_sessions 
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate user_id
DROP TRIGGER IF EXISTS sync_message_user_id_trigger ON public.ai_tutor_messages;
CREATE TRIGGER sync_message_user_id_trigger
  BEFORE INSERT OR UPDATE ON public.ai_tutor_messages
  FOR EACH ROW
  EXECUTE FUNCTION sync_message_user_id();

-- Update existing records to have user_id populated
UPDATE public.ai_tutor_messages 
SET user_id = (
  SELECT user_id 
  FROM public.ai_tutor_sessions 
  WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
)
WHERE user_id IS NULL;

-- Create indexes safely (only if they don't exist)
DO $$ 
BEGIN
  -- Session ID index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_session_id_new') THEN
    CREATE INDEX idx_ai_tutor_messages_session_id_new ON public.ai_tutor_messages(session_id);
  END IF;
  
  -- User ID index (now safe since we have the column)
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_user_id_new') THEN
    CREATE INDEX idx_ai_tutor_messages_user_id_new ON public.ai_tutor_messages(user_id);
  END IF;
  
  -- Timestamp/created_at indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_timestamp_new') THEN
    CREATE INDEX idx_ai_tutor_messages_timestamp_new ON public.ai_tutor_messages(timestamp DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_ai_tutor_messages_created_at_new') THEN
    CREATE INDEX idx_ai_tutor_messages_created_at_new ON public.ai_tutor_messages(created_at DESC);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can update messages in their sessions" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can delete messages from their sessions" ON public.ai_tutor_messages;

-- Create comprehensive RLS policies using both user_id and session-based checks
CREATE POLICY "Users can view their own messages" ON public.ai_tutor_messages
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own messages" ON public.ai_tutor_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.ai_tutor_messages
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages" ON public.ai_tutor_messages
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.ai_tutor_sessions
      WHERE ai_tutor_sessions.id = ai_tutor_messages.session_id
      AND ai_tutor_sessions.user_id = auth.uid()
    )
  );