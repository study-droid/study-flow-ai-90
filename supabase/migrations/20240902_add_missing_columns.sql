-- Add missing columns to ai_tutor_messages table
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS quality_score NUMERIC,
ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS processing_result JSONB,
ADD COLUMN IF NOT EXISTS response_type TEXT;

-- Add missing columns to ai_tutor_sessions table if needed
ALTER TABLE ai_tutor_sessions
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'deepseek',
ADD COLUMN IF NOT EXISTS model TEXT;

-- Create ai_tutor_message_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_tutor_message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  feedback TEXT CHECK (feedback IN ('helpful', 'not_helpful')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_session_id ON ai_tutor_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_user_id ON ai_tutor_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_created_at ON ai_tutor_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_user_id ON ai_tutor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_created_at ON ai_tutor_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_message_feedback_session_id ON ai_tutor_message_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_message_feedback_user_id ON ai_tutor_message_feedback(user_id);

-- Add RLS policies if not exists
ALTER TABLE ai_tutor_message_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first if they exist
DROP POLICY IF EXISTS "Users can insert their own feedback" ON ai_tutor_message_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON ai_tutor_message_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON ai_tutor_message_feedback;
DROP POLICY IF EXISTS "Users can delete their own feedback" ON ai_tutor_message_feedback;

-- Policy for users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON ai_tutor_message_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for users to view their own feedback
CREATE POLICY "Users can view their own feedback"
ON ai_tutor_message_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy for users to update their own feedback
CREATE POLICY "Users can update their own feedback"
ON ai_tutor_message_feedback
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own feedback
CREATE POLICY "Users can delete their own feedback"
ON ai_tutor_message_feedback
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);