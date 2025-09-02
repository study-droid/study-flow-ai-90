-- Migration: Add Professional DeepSeek Architecture Columns
-- Created: 2025-09-02
-- Purpose: Add missing columns for professional DeepSeek functionality

-- Add feedback column to ai_tutor_messages (missing column causing PGRST204 error)
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('helpful', 'not_helpful'));

-- Add processing_result column for storing professional pipeline results
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS processing_result JSONB;

-- Add quality_score column for quality metrics
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);

-- Add response_type column for categorization
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS response_type TEXT CHECK (response_type IN ('explanation', 'study_plan', 'practice', 'concept'));

-- Add cached column to track cache hits
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT FALSE;

-- Add optimized column to track optimization status
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS optimized BOOLEAN DEFAULT FALSE;

-- Create index on quality_score for performance
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_quality_score 
ON ai_tutor_messages(quality_score);

-- Create index on response_type for filtering
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_response_type 
ON ai_tutor_messages(response_type);

-- Create index on feedback for analytics
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_feedback 
ON ai_tutor_messages(feedback);

-- Update RLS policies to include new columns (if RLS is enabled)
-- Note: This assumes the existing RLS policies need to be updated

-- Update existing policy to include new columns
DROP POLICY IF EXISTS "Users can view their own ai_tutor_messages" ON ai_tutor_messages;
CREATE POLICY "Users can view their own ai_tutor_messages" 
ON ai_tutor_messages FOR SELECT 
USING (
  session_id IN (
    SELECT id FROM ai_tutor_sessions 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own ai_tutor_messages" ON ai_tutor_messages;
CREATE POLICY "Users can insert their own ai_tutor_messages" 
ON ai_tutor_messages FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT id FROM ai_tutor_sessions 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own ai_tutor_messages" ON ai_tutor_messages;
CREATE POLICY "Users can update their own ai_tutor_messages" 
ON ai_tutor_messages FOR UPDATE 
USING (
  session_id IN (
    SELECT id FROM ai_tutor_sessions 
    WHERE user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON COLUMN ai_tutor_messages.feedback IS 'User feedback on message helpfulness (helpful/not_helpful)';
COMMENT ON COLUMN ai_tutor_messages.processing_result IS 'JSON result from professional post-processing pipeline';
COMMENT ON COLUMN ai_tutor_messages.quality_score IS 'Quality score from professional pipeline (0-100)';
COMMENT ON COLUMN ai_tutor_messages.response_type IS 'Type of response (explanation/study_plan/practice/concept)';
COMMENT ON COLUMN ai_tutor_messages.cached IS 'Whether response was served from cache';
COMMENT ON COLUMN ai_tutor_messages.optimized IS 'Whether response was processed through optimization pipeline';

-- Verify the changes
DO $$
BEGIN
  -- Check if columns were added successfully
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_messages' 
    AND column_name = 'feedback'
  ) THEN
    RAISE NOTICE 'Migration completed successfully: feedback column added';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_messages' 
    AND column_name = 'processing_result'
  ) THEN
    RAISE NOTICE 'Migration completed successfully: processing_result column added';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_messages' 
    AND column_name = 'quality_score'
  ) THEN
    RAISE NOTICE 'Migration completed successfully: quality_score column added';
  END IF;
END $$;