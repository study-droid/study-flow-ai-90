-- ============================================
-- COMPLETE DATABASE FIX SCRIPT
-- Run this in Supabase SQL Editor to fix all schema issues
-- ============================================

-- 1. FIX TASKS TABLE - Add missing columns
-- ============================================
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignment_type text,
ADD COLUMN IF NOT EXISTS points integer,
ADD COLUMN IF NOT EXISTS attachments text;

-- Add constraints for tasks table
DO $$ 
BEGIN
    -- Assignment type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'assignment_type_check'
    ) THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT assignment_type_check 
        CHECK (assignment_type IN ('homework', 'project', 'lab', 'essay', 'presentation', 'research', 'other') OR assignment_type IS NULL);
    END IF;
    
    -- Points constraint (must be positive)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'points_positive'
    ) THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT points_positive 
        CHECK (points >= 0 OR points IS NULL);
    END IF;
END $$;

-- Update existing assignments with default values
UPDATE public.tasks
SET assignment_type = 'homework'
WHERE subject_id IS NOT NULL AND assignment_type IS NULL;

-- Add column comments for documentation
COMMENT ON COLUMN public.tasks.assignment_type IS 'Type of assignment (homework, project, lab, essay, etc.) - only for tasks with subject_id';
COMMENT ON COLUMN public.tasks.points IS 'Points or grade weight for assignments';
COMMENT ON COLUMN public.tasks.attachments IS 'Resources, links, or file references for the task/assignment';

-- 2. CREATE CALENDAR_EVENTS TABLE IF NOT EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    event_type text NOT NULL CHECK (event_type IN ('study', 'assignment', 'exam', 'quiz', 'flashcard', 'reminder')),
    event_date date NOT NULL,
    event_time time,
    subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name text,
    color text,
    recurring boolean DEFAULT false,
    recurring_pattern text CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly') OR recurring_pattern IS NULL),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can create their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own calendar events" ON public.calendar_events;

-- Create new policies
CREATE POLICY "Users can view their own calendar events"
    ON public.calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
    ON public.calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON public.calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON public.calendar_events FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON public.calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_subject_id ON public.calendar_events(subject_id);

-- 3. FIX USER_SETTINGS TABLE - Ensure all columns exist
-- ============================================
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light',
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS study_reminder_time time,
ADD COLUMN IF NOT EXISTS daily_goal_hours integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS pomodoro_work_duration integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS pomodoro_break_duration integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS pomodoro_long_break_duration integer DEFAULT 15;

-- 4. FIX FLASHCARDS TABLE - Ensure all columns exist
-- ============================================
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard') OR difficulty IS NULL),
ADD COLUMN IF NOT EXISTS last_reviewed timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS mastery_level integer DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 100);

-- 5. FIX STUDY_SESSIONS TABLE - Ensure all columns exist
-- ============================================
ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS break_duration integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS focus_rating integer CHECK (focus_rating >= 1 AND focus_rating <= 5 OR focus_rating IS NULL),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- 6. FIX ACHIEVEMENTS TABLE - Ensure all columns exist
-- ============================================
ALTER TABLE public.achievements
ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_progress integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;

-- 7. CREATE MISSING INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON public.study_sessions(subject_id);

-- 8. VERIFY ALL CHANGES
-- ============================================
-- Check tasks table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'tasks'
    AND column_name IN ('assignment_type', 'points', 'attachments')
ORDER BY 
    column_name;

-- Check calendar_events table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'calendar_events'
) as calendar_events_exists;

-- Count total fixes applied
SELECT 'Database schema fixes completed successfully!' as status;