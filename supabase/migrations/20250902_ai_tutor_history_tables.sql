-- ===================================
-- AI TUTOR HISTORY AND ENHANCEMENT TABLES
-- ===================================

-- Create study plans history table
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

-- Create concepts history table
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

-- Create practice questions history table
CREATE TABLE IF NOT EXISTS public.ai_tutor_practice_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.ai_tutor_sessions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  correct_answer TEXT,
  user_answer TEXT,
  is_correct BOOLEAN,
  explanation TEXT,
  hints TEXT[],
  time_spent_seconds INTEGER,
  is_bookmarked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create AI recommendations table
CREATE TABLE IF NOT EXISTS public.ai_tutor_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT CHECK (recommendation_type IN ('study_time', 'focus_area', 'learning_method', 'practice', 'review')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  action_items TEXT[],
  expected_impact TEXT,
  is_applied BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create bookmarks table for quick access
CREATE TABLE IF NOT EXISTS public.ai_tutor_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('study_plan', 'concept', 'question', 'session', 'message')),
  item_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, item_type, item_id)
);

-- Create feedback table for messages
CREATE TABLE IF NOT EXISTS public.ai_tutor_message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.ai_tutor_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type TEXT CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'unclear')),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Add new columns to existing tables
ALTER TABLE public.ai_tutor_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'chat' CHECK (session_type IN ('chat', 'study_plan', 'concept', 'practice')),
ADD COLUMN IF NOT EXISTS subject_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS feedback TEXT;

ALTER TABLE public.ai_tutor_messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'code', 'markdown', 'question', 'answer')),
ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.ai_tutor_study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_created_at ON public.ai_tutor_study_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject ON public.ai_tutor_study_plans(subject);
CREATE INDEX IF NOT EXISTS idx_study_plans_active ON public.ai_tutor_study_plans(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON public.ai_tutor_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_concepts_subject ON public.ai_tutor_concepts(subject);
CREATE INDEX IF NOT EXISTS idx_concepts_created_at ON public.ai_tutor_concepts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concepts_bookmarked ON public.ai_tutor_concepts(is_bookmarked) WHERE is_bookmarked = true;

CREATE INDEX IF NOT EXISTS idx_practice_questions_user_id ON public.ai_tutor_practice_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_questions_subject ON public.ai_tutor_practice_questions(subject);
CREATE INDEX IF NOT EXISTS idx_practice_questions_topic ON public.ai_tutor_practice_questions(topic);
CREATE INDEX IF NOT EXISTS idx_practice_questions_created_at ON public.ai_tutor_practice_questions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.ai_tutor_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.ai_tutor_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON public.ai_tutor_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_recommendations_active ON public.ai_tutor_recommendations(is_applied, is_dismissed) WHERE is_applied = false AND is_dismissed = false;

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.ai_tutor_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_item_type ON public.ai_tutor_bookmarks(item_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.ai_tutor_bookmarks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON public.ai_tutor_message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_user_id ON public.ai_tutor_message_feedback(user_id);

-- Enable Row Level Security
ALTER TABLE public.ai_tutor_study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_message_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for study plans
CREATE POLICY "Users can view their own study plans" ON public.ai_tutor_study_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study plans" ON public.ai_tutor_study_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans" ON public.ai_tutor_study_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans" ON public.ai_tutor_study_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for concepts
CREATE POLICY "Users can view their own concepts" ON public.ai_tutor_concepts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concepts" ON public.ai_tutor_concepts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts" ON public.ai_tutor_concepts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts" ON public.ai_tutor_concepts
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for practice questions
CREATE POLICY "Users can view their own practice questions" ON public.ai_tutor_practice_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own practice questions" ON public.ai_tutor_practice_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice questions" ON public.ai_tutor_practice_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice questions" ON public.ai_tutor_practice_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for recommendations
CREATE POLICY "Users can view their own recommendations" ON public.ai_tutor_recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations" ON public.ai_tutor_recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" ON public.ai_tutor_recommendations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations" ON public.ai_tutor_recommendations
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for bookmarks
CREATE POLICY "Users can view their own bookmarks" ON public.ai_tutor_bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks" ON public.ai_tutor_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks" ON public.ai_tutor_bookmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks" ON public.ai_tutor_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for message feedback
CREATE POLICY "Users can view their own message feedback" ON public.ai_tutor_message_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own message feedback" ON public.ai_tutor_message_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message feedback" ON public.ai_tutor_message_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message feedback" ON public.ai_tutor_message_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_study_plans_updated_at
BEFORE UPDATE ON public.ai_tutor_study_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-expire old recommendations
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS void AS $$
BEGIN
  UPDATE public.ai_tutor_recommendations
  SET is_dismissed = true, dismissed_at = NOW()
  WHERE expires_at < NOW() 
    AND is_applied = false 
    AND is_dismissed = false;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to expire recommendations (requires pg_cron extension)
-- Note: This needs to be set up separately if pg_cron is available
-- SELECT cron.schedule('expire-recommendations', '0 0 * * *', 'SELECT expire_old_recommendations();');