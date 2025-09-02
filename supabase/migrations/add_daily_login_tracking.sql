-- Create daily login tracking table
CREATE TABLE IF NOT EXISTS public.daily_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    login_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, login_date) -- Prevent duplicate entries for same day
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_logins_user_id ON public.daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logins_date ON public.daily_logins(login_date);
CREATE INDEX IF NOT EXISTS idx_daily_logins_user_date ON public.daily_logins(user_id, login_date DESC);

-- Add streak tracking columns to profiles table if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS total_login_days INTEGER DEFAULT 0;

-- Create function to record daily login and update streaks
CREATE OR REPLACE FUNCTION record_daily_login(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_last_login DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_is_new_day BOOLEAN := FALSE;
BEGIN
    -- Get user's last login date and current streaks
    SELECT last_login_date, current_streak, longest_streak
    INTO v_last_login, v_current_streak, v_longest_streak
    FROM profiles
    WHERE user_id = p_user_id;

    -- Check if this is a new day login
    IF v_last_login IS NULL OR v_last_login < v_today THEN
        v_is_new_day := TRUE;
        
        -- Insert into daily_logins table (will fail silently if already exists due to unique constraint)
        INSERT INTO daily_logins (user_id, login_date)
        VALUES (p_user_id, v_today)
        ON CONFLICT (user_id, login_date) DO NOTHING;

        -- Calculate new streak
        IF v_last_login = v_yesterday THEN
            -- Continue the streak
            v_current_streak := COALESCE(v_current_streak, 0) + 1;
        ELSIF v_last_login < v_yesterday OR v_last_login IS NULL THEN
            -- Streak broken or first login
            v_current_streak := 1;
        END IF;

        -- Update longest streak if current is higher
        v_longest_streak := GREATEST(COALESCE(v_longest_streak, 0), v_current_streak);

        -- Update profile with new streak data
        UPDATE profiles
        SET 
            last_login_date = v_today,
            current_streak = v_current_streak,
            longest_streak = v_longest_streak,
            total_login_days = (
                SELECT COUNT(DISTINCT login_date) 
                FROM daily_logins 
                WHERE user_id = p_user_id
            ),
            study_streak = v_current_streak -- Also update the legacy field
        WHERE user_id = p_user_id;
    END IF;

    -- Return current status
    RETURN json_build_object(
        'is_new_day', v_is_new_day,
        'current_streak', v_current_streak,
        'longest_streak', v_longest_streak,
        'last_login', v_today
    );
END;
$$;

-- Create function to get user's login history
CREATE OR REPLACE FUNCTION get_login_history(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(login_date DATE, has_login BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days - 1) * INTERVAL '1 day',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS date
    )
    SELECT 
        ds.date AS login_date,
        CASE WHEN dl.login_date IS NOT NULL THEN TRUE ELSE FALSE END AS has_login
    FROM date_series ds
    LEFT JOIN daily_logins dl ON dl.login_date = ds.date AND dl.user_id = p_user_id
    ORDER BY ds.date DESC;
END;
$$;

-- Create function to recalculate streaks (for maintenance/fixes)
CREATE OR REPLACE FUNCTION recalculate_user_streaks(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_streak INTEGER := 0;
    v_temp_streak INTEGER := 0;
    v_longest_streak INTEGER := 0;
    v_last_date DATE := NULL;
    v_login_record RECORD;
BEGIN
    -- Reset current streak counter
    v_current_streak := 0;
    v_temp_streak := 0;
    
    -- Loop through login history in reverse chronological order
    FOR v_login_record IN 
        SELECT login_date 
        FROM daily_logins 
        WHERE user_id = p_user_id 
        ORDER BY login_date DESC
    LOOP
        IF v_last_date IS NULL THEN
            -- First record (most recent)
            IF v_login_record.login_date = CURRENT_DATE THEN
                v_current_streak := 1;
                v_temp_streak := 1;
            ELSIF v_login_record.login_date = CURRENT_DATE - INTERVAL '1 day' THEN
                v_current_streak := 1;
                v_temp_streak := 1;
            ELSE
                -- Streak is broken
                v_current_streak := 0;
                v_temp_streak := 1;
            END IF;
        ELSIF v_last_date - v_login_record.login_date = 1 THEN
            -- Consecutive day
            v_temp_streak := v_temp_streak + 1;
            IF v_current_streak > 0 THEN
                v_current_streak := v_temp_streak;
            END IF;
        ELSE
            -- Gap in dates, streak broken
            v_longest_streak := GREATEST(v_longest_streak, v_temp_streak);
            v_temp_streak := 1;
            IF v_current_streak > 0 THEN
                -- We've already passed today's streak
                v_current_streak := v_current_streak; -- Keep current value
            END IF;
        END IF;
        
        v_last_date := v_login_record.login_date;
    END LOOP;
    
    -- Final check for longest streak
    v_longest_streak := GREATEST(v_longest_streak, v_temp_streak);
    
    -- Update profile
    UPDATE profiles
    SET 
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        study_streak = v_current_streak,
        total_login_days = (
            SELECT COUNT(DISTINCT login_date) 
            FROM daily_logins 
            WHERE user_id = p_user_id
        )
    WHERE user_id = p_user_id;
END;
$$;

-- Enable Row Level Security
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own login history" ON public.daily_logins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert login records" ON public.daily_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.daily_logins TO authenticated;
GRANT EXECUTE ON FUNCTION record_daily_login TO authenticated;
GRANT EXECUTE ON FUNCTION get_login_history TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_user_streaks TO authenticated;