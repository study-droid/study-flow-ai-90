-- Fix user_settings table schema to match the code expectations

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add break_reminders column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'break_reminders' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN break_reminders BOOLEAN DEFAULT true;
    END IF;

    -- Add session_reminders column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'session_reminders' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN session_reminders BOOLEAN DEFAULT true;
    END IF;

    -- Add daily_goal_reminders column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'daily_goal_reminders' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN daily_goal_reminders BOOLEAN DEFAULT true;
    END IF;

    -- Add week_start_day column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'week_start_day' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN week_start_day INTEGER DEFAULT 1;
    END IF;

    -- Add pomodoro_work_duration column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'pomodoro_work_duration' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN pomodoro_work_duration INTEGER DEFAULT 25;
    END IF;

    -- Add pomodoro_short_break column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'pomodoro_short_break' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN pomodoro_short_break INTEGER DEFAULT 5;
    END IF;

    -- Add pomodoro_long_break column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'pomodoro_long_break' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN pomodoro_long_break INTEGER DEFAULT 15;
    END IF;

    -- Add pomodoro_sessions_until_long_break column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'pomodoro_sessions_until_long_break' 
                   AND table_schema = 'public') THEN
        ALTER TABLE public.user_settings ADD COLUMN pomodoro_sessions_until_long_break INTEGER DEFAULT 4;
    END IF;
END $$;