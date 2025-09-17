-- Add missing database functions for AI service

-- Create increment_rate_limit function
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_window_start TIMESTAMP WITH TIME ZONE
) RETURNS VOID AS $$
BEGIN
  UPDATE rate_limits 
  SET requests_count = requests_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id 
    AND window_start = p_window_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  requests_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, window_start)
);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for rate_limits
CREATE POLICY "Users can manage their own rate limits"
ON rate_limits
FOR ALL
USING (auth.uid() = user_id);

-- Create api_usage_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for api_usage_logs
CREATE POLICY "Users can view their own API usage logs"
ON api_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage logs"
ON api_usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window 
ON rate_limits(user_id, window_start);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_timestamp 
ON api_usage_logs(user_id, request_timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_user_id 
ON ai_tutor_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id 
ON ai_messages(session_id);