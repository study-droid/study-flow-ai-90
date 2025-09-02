-- Create rate_limits table for distributed rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- Can be user_id, IP, or combination
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 minute'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for identifier + endpoint combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint 
ON public.rate_limits(identifier, endpoint);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end 
ON public.rate_limits(window_end);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only service role can access)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Calculate window
  v_window_start := NOW();
  v_window_end := NOW() + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Try to get existing rate limit record
  SELECT request_count, window_end
  INTO v_current_count, v_window_end
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint
    AND window_end > NOW()
  FOR UPDATE;
  
  -- If no record exists or window has expired
  IF NOT FOUND THEN
    -- Insert new record
    INSERT INTO public.rate_limits (
      identifier, 
      endpoint, 
      request_count, 
      window_start, 
      window_end
    )
    VALUES (
      p_identifier, 
      p_endpoint, 
      1, 
      v_window_start, 
      v_window_end
    )
    ON CONFLICT (identifier, endpoint)
    DO UPDATE SET
      request_count = 1,
      window_start = v_window_start,
      window_end = v_window_end,
      updated_at = NOW();
    
    v_current_count := 1;
  ELSE
    -- Check if limit exceeded
    IF v_current_count >= p_max_requests THEN
      v_result := json_build_object(
        'allowed', false,
        'limit', p_max_requests,
        'remaining', 0,
        'reset_at', v_window_end,
        'retry_after', EXTRACT(EPOCH FROM (v_window_end - NOW()))::INTEGER
      );
      RETURN v_result;
    END IF;
    
    -- Increment counter
    UPDATE public.rate_limits
    SET 
      request_count = request_count + 1,
      updated_at = NOW()
    WHERE identifier = p_identifier 
      AND endpoint = p_endpoint;
    
    v_current_count := v_current_count + 1;
  END IF;
  
  -- Return success with rate limit info
  v_result := json_build_object(
    'allowed', true,
    'limit', p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_current_count),
    'reset_at', v_window_end,
    'retry_after', 0
  );
  
  RETURN v_result;
END;
$$;

-- Create cleanup function to remove expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_end < NOW() - INTERVAL '5 minutes'
  RETURNING COUNT(*) INTO v_deleted_count;
  
  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

-- Create scheduled job to cleanup expired rate limits (requires pg_cron extension)
-- Note: Enable pg_cron in Supabase dashboard first
-- SELECT cron.schedule(
--   'cleanup-rate-limits',
--   '*/5 * * * *', -- Every 5 minutes
--   'SELECT cleanup_expired_rate_limits();'
-- );

-- Create function for getting current rate limit status
CREATE OR REPLACE FUNCTION get_rate_limit_status(
  p_identifier TEXT,
  p_endpoint TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
  v_result JSON;
BEGIN
  SELECT 
    request_count,
    window_end,
    60 as max_requests -- Default limit
  INTO v_record
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint
    AND window_end > NOW();
  
  IF FOUND THEN
    v_result := json_build_object(
      'current_count', v_record.request_count,
      'limit', v_record.max_requests,
      'remaining', GREATEST(0, v_record.max_requests - v_record.request_count),
      'reset_at', v_record.window_end,
      'active', true
    );
  ELSE
    v_result := json_build_object(
      'current_count', 0,
      'limit', 60,
      'remaining', 60,
      'reset_at', NULL,
      'active', false
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limit_status TO authenticated;