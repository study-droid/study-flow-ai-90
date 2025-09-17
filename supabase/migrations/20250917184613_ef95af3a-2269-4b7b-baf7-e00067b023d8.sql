-- Study Teddy Complete Database Schema
-- Comprehensive SQL schema with authentication, RLS, and all required tables

-- ================================================
-- 1. ENUMS AND CUSTOM TYPES
-- ================================================

-- Academic levels
CREATE TYPE academic_level AS ENUM (
  'elementary',
  'middle_school', 
  'high_school',
  'undergraduate',
  'graduate',
  'postgraduate',
  'professional'
);

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM (
  'free',
  'premium',
  'pro',
  'enterprise'
);

-- Task status and priority
CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress', 
  'completed',
  'cancelled',
  'on_hold'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Study session types and status
CREATE TYPE study_session_type AS ENUM (
  'focus',
  'review',
  'practice',
  'exam_prep',
  'assignment',
  'research'
);

CREATE TYPE study_session_status AS ENUM (
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled'
);

-- Goal types and status
CREATE TYPE goal_type AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'semester',
  'yearly',
  'custom'
);

CREATE TYPE goal_unit AS ENUM (
  'hours',
  'minutes',
  'sessions',
  'tasks',
  'points',
  'percentage'
);

CREATE TYPE goal_status AS ENUM (
  'active',
  'completed',
  'paused',
  'cancelled',
  'overdue'
);

-- Calendar event types
CREATE TYPE event_type AS ENUM (
  'class',
  'exam',
  'assignment_due',
  'study_session',
  'meeting',
  'reminder',
  'deadline',
  'break'
);

-- AI provider types
CREATE TYPE ai_provider AS ENUM (
  'openai',
  'anthropic',
  'deepseek',
  'google',
  'local'
);

-- ================================================
-- 2. CORE USER MANAGEMENT
-- ================================================

-- User profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
      THEN first_name || ' ' || last_name
      WHEN first_name IS NOT NULL 
      THEN first_name
      WHEN last_name IS NOT NULL 
      THEN last_name
      ELSE email
    END
  ) STORED,
  avatar_url TEXT,
  date_of_birth DATE,
  academic_level academic_level DEFAULT 'high_school',
  subscription_tier subscription_tier DEFAULT 'free',
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  study_streak INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- User settings and preferences
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  study_reminder_time TIME DEFAULT '09:00:00',
  daily_goal_hours INTEGER DEFAULT 2,
  pomodoro_enabled BOOLEAN DEFAULT TRUE,
  pomodoro_work_duration INTEGER DEFAULT 25, -- minutes
  pomodoro_break_duration INTEGER DEFAULT 5, -- minutes  
  pomodoro_long_break_duration INTEGER DEFAULT 15, -- minutes
  ai_suggestions_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 3. SUBJECTS AND ORGANIZATION
-- ================================================

-- Study subjects/courses
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  
  CONSTRAINT subjects_name_user_unique UNIQUE (user_id, name)
);

-- ================================================
-- 4. TASKS AND ASSIGNMENTS
-- ================================================

-- Tasks and assignments
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  assignment_type TEXT,
  points INTEGER,
  tags TEXT[] DEFAULT '{}',
  attachments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 5. STUDY SESSIONS AND TRACKING
-- ================================================

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type study_session_type DEFAULT 'focus',
  status study_session_status DEFAULT 'planned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration INTEGER DEFAULT 0, -- actual duration in minutes
  planned_duration INTEGER, -- planned duration in minutes
  break_duration INTEGER DEFAULT 0, -- total break time in minutes
  pomodoro_count INTEGER DEFAULT 0,
  focus_score INTEGER CHECK (focus_score >= 0 AND focus_score <= 100),
  distractions INTEGER DEFAULT 0,
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Study goals
CREATE TABLE public.study_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type goal_type DEFAULT 'weekly',
  status goal_status DEFAULT 'active',
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  unit goal_unit DEFAULT 'hours',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Study streaks tracking
CREATE TABLE public.study_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_study_days INTEGER DEFAULT 0,
  last_study_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 6. FLASHCARDS SYSTEM
-- ================================================

-- Flashcard sets
CREATE TABLE public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_cards INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Individual flashcards
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[] DEFAULT '{}',
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
  review_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Flashcard study sessions
CREATE TABLE public.flashcard_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_set_id UUID REFERENCES public.flashcard_sets(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  cards_studied INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  cards_incorrect INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0, -- minutes
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 7. QUIZZES AND EXAMS
-- ================================================

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  total_questions INTEGER DEFAULT 0,
  time_limit INTEGER, -- minutes
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  answers JSONB DEFAULT '{}',
  time_taken INTEGER, -- minutes
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Exams
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  exam_date DATE,
  exam_time TIME,
  duration INTEGER, -- minutes
  location TEXT,
  total_marks INTEGER,
  passing_marks INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 8. AI TUTORING SYSTEM
-- ================================================

-- AI tutor sessions
CREATE TABLE public.ai_tutor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Study Session with Teddy',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  ai_provider ai_provider DEFAULT 'deepseek',
  total_messages INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  session_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- AI messages
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.ai_tutor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  ai_provider ai_provider,
  tokens_used INTEGER,
  response_time INTEGER, -- milliseconds
  message_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 9. CALENDAR AND EVENTS
-- ================================================

-- Calendar events
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  location TEXT,
  subject_name TEXT,
  color TEXT,
  recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern TEXT,
  notification_time INTEGER, -- minutes before event
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 10. NOTIFICATIONS SYSTEM
-- ================================================

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'reminder')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 11. ANALYTICS AND ACHIEVEMENTS
-- ================================================

-- Study analytics (aggregated data)
CREATE TABLE public.study_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  total_study_time INTEGER DEFAULT 0, -- minutes
  session_count INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  flashcards_studied INTEGER DEFAULT 0,
  ai_interactions INTEGER DEFAULT 0,
  average_focus_score DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  
  CONSTRAINT study_analytics_user_date_subject_unique UNIQUE (user_id, date, subject_id)
);

-- Achievements system
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  progress INTEGER DEFAULT 0,
  max_progress INTEGER DEFAULT 100,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ================================================
-- 12. INDEXES FOR PERFORMANCE
-- ================================================

-- User-based indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX idx_tasks_user_id_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_subject_id ON public.study_sessions(subject_id);
CREATE INDEX idx_flashcards_set_id ON public.flashcards(set_id);
CREATE INDEX idx_ai_messages_session_id ON public.ai_messages(session_id);
CREATE INDEX idx_calendar_events_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX idx_study_analytics_user_date ON public.study_analytics(user_id, date);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);

-- Time-based indexes
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at);
CREATE INDEX idx_study_sessions_started_at ON public.study_sessions(started_at);
CREATE INDEX idx_ai_tutor_sessions_last_activity ON public.ai_tutor_sessions(last_activity);

-- ================================================
-- 13. TRIGGERS AND FUNCTIONS
-- ================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON public.study_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_goals_updated_at BEFORE UPDATE ON public.study_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_study_streaks_updated_at BEFORE UPDATE ON public.study_streaks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flashcard_sets_updated_at BEFORE UPDATE ON public.flashcard_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flashcard_sessions_updated_at BEFORE UPDATE ON public.flashcard_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_tutor_sessions_updated_at BEFORE UPDATE ON public.ai_tutor_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    INSERT INTO public.study_streaks (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update study analytics automatically
CREATE OR REPLACE FUNCTION public.update_study_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only process if session is completed and has valid duration
    IF NEW.status = 'completed' AND NEW.duration > 0 THEN
        INSERT INTO public.study_analytics (user_id, date, subject_id, total_study_time, session_count)
        VALUES (
            NEW.user_id,
            DATE(COALESCE(NEW.completed_at, now())),
            NEW.subject_id,
            NEW.duration,
            1
        )
        ON CONFLICT (user_id, date, subject_id)
        DO UPDATE SET
            total_study_time = study_analytics.total_study_time + NEW.duration,
            session_count = study_analytics.session_count + 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for study analytics
CREATE TRIGGER update_study_analytics_trigger
    AFTER INSERT OR UPDATE ON public.study_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_study_analytics();

-- Update flashcard set totals
CREATE OR REPLACE FUNCTION public.update_flashcard_set_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.flashcard_sets
    SET total_cards = (
        SELECT COUNT(*)
        FROM public.flashcards
        WHERE set_id = COALESCE(NEW.set_id, OLD.set_id)
    )
    WHERE id = COALESCE(NEW.set_id, OLD.set_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for flashcard set totals
CREATE TRIGGER update_flashcard_set_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION public.update_flashcard_set_totals();

-- ================================================
-- 14. ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Subjects policies
CREATE POLICY "Users can manage their own subjects" ON public.subjects
    FOR ALL USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can manage their own tasks" ON public.tasks
    FOR ALL USING (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users can manage their own study sessions" ON public.study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Study goals policies
CREATE POLICY "Users can manage their own study goals" ON public.study_goals
    FOR ALL USING (auth.uid() = user_id);

-- Study streaks policies
CREATE POLICY "Users can manage their own study streaks" ON public.study_streaks
    FOR ALL USING (auth.uid() = user_id);

-- Flashcard sets policies
CREATE POLICY "Users can view their own flashcard sets" ON public.flashcard_sets
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage their own flashcard sets" ON public.flashcard_sets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sets" ON public.flashcard_sets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sets" ON public.flashcard_sets
    FOR DELETE USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

-- Flashcard sessions policies
CREATE POLICY "Users can manage their own flashcard sessions" ON public.flashcard_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Quizzes policies
CREATE POLICY "Users can manage their own quizzes" ON public.quizzes
    FOR ALL USING (auth.uid() = user_id);

-- Quiz attempts policies
CREATE POLICY "Users can manage their own quiz attempts" ON public.quiz_attempts
    FOR ALL USING (auth.uid() = user_id);

-- Exams policies
CREATE POLICY "Users can manage their own exams" ON public.exams
    FOR ALL USING (auth.uid() = user_id);

-- AI tutor sessions policies
CREATE POLICY "Users can manage their own AI sessions" ON public.ai_tutor_sessions
    FOR ALL USING (auth.uid() = user_id);

-- AI messages policies
CREATE POLICY "Users can manage their own AI messages" ON public.ai_messages
    FOR ALL USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can manage their own calendar events" ON public.calendar_events
    FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- Study analytics policies (read-only for users, system can insert/update)
CREATE POLICY "Users can view their own analytics" ON public.study_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage analytics" ON public.study_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update analytics" ON public.study_analytics
    FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Users can manage their own achievements" ON public.achievements
    FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- SCHEMA COMPLETE
-- ================================================