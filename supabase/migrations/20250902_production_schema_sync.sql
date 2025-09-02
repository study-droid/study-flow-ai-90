-- ===================================
-- PRODUCTION SCHEMA SYNCHRONIZATION
-- Comprehensive fix for all database issues
-- ===================================

-- Start transaction for safety
BEGIN;

-- ===================================
-- 1. AI TUTOR MESSAGES TABLE FIXES
-- ===================================

-- Add missing feedback column (fixes PGRST204 error)
ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('helpful', 'not_helpful'));

-- Add professional architecture columns
ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS processing_result JSONB DEFAULT NULL;

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS response_type TEXT CHECK (response_type IN ('explanation', 'study_plan', 'practice', 'concept'));

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS cached BOOLEAN DEFAULT FALSE;

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS optimized BOOLEAN DEFAULT TRUE;

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS intent_type TEXT CHECK (intent_type IN ('greeting', 'question', 'request', 'casual', 'educational'));

ALTER TABLE public.ai_tutor_messages 
ADD COLUMN IF NOT EXISTS intent_confidence DECIMAL(3,2) CHECK (intent_confidence >= 0 AND intent_confidence <= 1);

-- ===================================
-- 2. ENSURE CORE TABLES EXIST
-- ===================================

-- Create AI Tutor Sessions if missing
CREATE TABLE IF NOT EXISTS public.ai_tutor_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  subject_name TEXT,
  topic TEXT,
  ai_provider TEXT DEFAULT 'deepseek',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  session_type TEXT DEFAULT 'chat' CHECK (session_type IN ('chat', 'study_plan', 'practice', 'concept')),
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI Tutor Study Plans
CREATE TABLE IF NOT EXISTS public.ai_tutor_study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  topics TEXT[] NOT NULL,
  duration_days INTEGER NOT NULL,
  plan_content TEXT NOT NULL,
  progress_percentage INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI Tutor Concepts
CREATE TABLE IF NOT EXISTS public.ai_tutor_concepts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  explanation TEXT NOT NULL,
  examples TEXT[],
  related_concepts TEXT[],
  is_bookmarked BOOLEAN DEFAULT false,
  understanding_rating INTEGER CHECK (understanding_rating >= 1 AND understanding_rating <= 5),
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI Tutor Practice Questions
CREATE TABLE IF NOT EXISTS public.ai_tutor_practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  correct_answer TEXT,
  explanation TEXT,
  options TEXT[],
  user_answer TEXT,
  is_correct BOOLEAN,
  attempts INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  time_spent INTEGER, -- seconds
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ===================================
-- 3. PERFORMANCE INDEXES
-- ===================================

-- Core indexes for ai_tutor_messages
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_session_user 
ON public.ai_tutor_messages(session_id, created_at DESC) 
WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_feedback 
ON public.ai_tutor_messages(feedback) 
WHERE feedback IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_quality_score 
ON public.ai_tutor_messages(quality_score) 
WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_response_type 
ON public.ai_tutor_messages(response_type) 
WHERE response_type IS NOT NULL;

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_user_active 
ON public.ai_tutor_sessions(user_id, status, updated_at DESC) 
WHERE is_archived = FALSE;

-- Indexes for study plans
CREATE INDEX IF NOT EXISTS idx_ai_tutor_study_plans_user_active 
ON public.ai_tutor_study_plans(user_id, is_active, updated_at DESC);

-- Indexes for concepts
CREATE INDEX IF NOT EXISTS idx_ai_tutor_concepts_user_subject 
ON public.ai_tutor_concepts(user_id, subject, created_at DESC);

-- Indexes for practice questions
CREATE INDEX IF NOT EXISTS idx_ai_tutor_practice_questions_user_subject 
ON public.ai_tutor_practice_questions(user_id, subject, topic, created_at DESC);

-- ===================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================

-- Enable RLS on all tables
ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_practice_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own ai_tutor_messages" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can insert their own ai_tutor_messages" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can update their own ai_tutor_messages" ON public.ai_tutor_messages;

-- AI Tutor Messages policies
CREATE POLICY "Users can view their own ai_tutor_messages" 
ON public.ai_tutor_messages FOR SELECT 
USING (
  session_id IN (
    SELECT id FROM public.ai_tutor_sessions 
    WHERE user_id = auth.uid()
  ) OR 
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own ai_tutor_messages" 
ON public.ai_tutor_messages FOR INSERT 
WITH CHECK (
  session_id IN (
    SELECT id FROM public.ai_tutor_sessions 
    WHERE user_id = auth.uid()
  ) OR 
  user_id = auth.uid()
);

CREATE POLICY "Users can update their own ai_tutor_messages" 
ON public.ai_tutor_messages FOR UPDATE 
USING (
  session_id IN (
    SELECT id FROM public.ai_tutor_sessions 
    WHERE user_id = auth.uid()
  ) OR 
  user_id = auth.uid()
);

-- AI Tutor Sessions policies
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.ai_tutor_sessions;
CREATE POLICY "Users can manage their own sessions" 
ON public.ai_tutor_sessions FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Study Plans policies
DROP POLICY IF EXISTS "Users can manage their own study plans" ON public.ai_tutor_study_plans;
CREATE POLICY "Users can manage their own study plans" 
ON public.ai_tutor_study_plans FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Concepts policies
DROP POLICY IF EXISTS "Users can manage their own concepts" ON public.ai_tutor_concepts;
CREATE POLICY "Users can manage their own concepts" 
ON public.ai_tutor_concepts FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Practice Questions policies
DROP POLICY IF EXISTS "Users can manage their own practice questions" ON public.ai_tutor_practice_questions;
CREATE POLICY "Users can manage their own practice questions" 
ON public.ai_tutor_practice_questions FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- ===================================
-- 5. HELPFUL FUNCTIONS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_ai_tutor_sessions_updated_at ON public.ai_tutor_sessions;
CREATE TRIGGER update_ai_tutor_sessions_updated_at 
    BEFORE UPDATE ON public.ai_tutor_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_tutor_study_plans_updated_at ON public.ai_tutor_study_plans;
CREATE TRIGGER update_ai_tutor_study_plans_updated_at 
    BEFORE UPDATE ON public.ai_tutor_study_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 6. DATA CONSISTENCY CHECKS
-- ===================================

-- Ensure all existing messages have proper session references
UPDATE public.ai_tutor_messages 
SET user_id = (
  SELECT user_id FROM public.ai_tutor_sessions 
  WHERE public.ai_tutor_sessions.id = public.ai_tutor_messages.session_id
)
WHERE user_id IS NULL AND session_id IS NOT NULL;

-- ===================================
-- 7. GRANTS AND PERMISSIONS
-- ===================================

-- Grant necessary permissions for authenticated users
GRANT ALL ON public.ai_tutor_messages TO authenticated;
GRANT ALL ON public.ai_tutor_sessions TO authenticated;
GRANT ALL ON public.ai_tutor_study_plans TO authenticated;
GRANT ALL ON public.ai_tutor_concepts TO authenticated;
GRANT ALL ON public.ai_tutor_practice_questions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ===================================

COMMENT ON TABLE public.ai_tutor_messages IS 'Stores all AI tutor conversation messages with enhanced metadata';
COMMENT ON COLUMN public.ai_tutor_messages.feedback IS 'User feedback on message helpfulness (helpful/not_helpful)';
COMMENT ON COLUMN public.ai_tutor_messages.processing_result IS 'JSON result from professional post-processing pipeline';
COMMENT ON COLUMN public.ai_tutor_messages.quality_score IS 'Quality score from professional pipeline (0-100)';
COMMENT ON COLUMN public.ai_tutor_messages.response_type IS 'Type of response (explanation/study_plan/practice/concept)';
COMMENT ON COLUMN public.ai_tutor_messages.cached IS 'Whether response was served from cache';
COMMENT ON COLUMN public.ai_tutor_messages.optimized IS 'Whether response was processed through optimization pipeline';
COMMENT ON COLUMN public.ai_tutor_messages.intent_type IS 'Detected intent type for the message';
COMMENT ON COLUMN public.ai_tutor_messages.intent_confidence IS 'Confidence score for intent detection (0-1)';

COMMENT ON TABLE public.ai_tutor_sessions IS 'AI tutoring sessions with enhanced tracking';
COMMENT ON TABLE public.ai_tutor_study_plans IS 'User study plans created by AI tutor';
COMMENT ON TABLE public.ai_tutor_concepts IS 'Educational concepts explained by AI tutor';
COMMENT ON TABLE public.ai_tutor_practice_questions IS 'Practice questions and answers from AI tutor';

-- Commit the transaction
COMMIT;

-- ===================================
-- 9. VERIFICATION QUERIES
-- ===================================

-- Verify table structures
DO $$
BEGIN
  -- Check if feedback column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_messages' 
    AND column_name = 'feedback'
  ) THEN
    RAISE NOTICE '✅ Production schema sync completed successfully: feedback column exists';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: feedback column missing';
  END IF;
  
  -- Check if study plans table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_tutor_study_plans'
  ) THEN
    RAISE NOTICE '✅ Study plans table exists';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: study plans table missing';
  END IF;
  
  -- Check if concepts table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_tutor_concepts'
  ) THEN
    RAISE NOTICE '✅ Concepts table exists';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: concepts table missing';
  END IF;
  
  -- Check if practice questions table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ai_tutor_practice_questions'
  ) THEN
    RAISE NOTICE '✅ Practice questions table exists';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: practice questions table missing';
  END IF;

  RAISE NOTICE '🎉 Production schema synchronization completed successfully!';
  RAISE NOTICE '📊 All tables and columns are now available for professional DeepSeek architecture';
END $$;