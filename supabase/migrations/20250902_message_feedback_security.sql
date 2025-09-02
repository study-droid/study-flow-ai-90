-- Migration: Message Feedback and Security Enhancements
-- Description: Enhanced message feedback system and security for AI responses
-- Date: 2025-09-02

-- =============================================
-- Enhanced Message Feedback System
-- =============================================

-- Create enhanced message feedback table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS ai_tutor_message_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES ai_tutor_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  feedback VARCHAR(20) NOT NULL CHECK (feedback IN ('helpful', 'not_helpful')),
  feedback_details TEXT, -- optional detailed feedback
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  response_relevance INTEGER CHECK (response_relevance BETWEEN 1 AND 5),
  response_clarity INTEGER CHECK (response_clarity BETWEEN 1 AND 5),
  would_recommend BOOLEAN,
  improvement_suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate feedback per user per message
  UNIQUE(message_id, user_id)
);

-- Create indexes for ai_tutor_message_feedback
CREATE INDEX IF NOT EXISTS idx_feedback_message ON ai_tutor_message_feedback (message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON ai_tutor_message_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON ai_tutor_message_feedback (session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON ai_tutor_message_feedback (feedback, quality_rating);

-- Enable RLS
ALTER TABLE ai_tutor_message_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own feedback" ON ai_tutor_message_feedback
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Response Quality Metrics
-- =============================================

-- Table to store detailed quality metrics for responses
CREATE TABLE IF NOT EXISTS ai_response_quality_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES ai_tutor_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content Quality Metrics
  word_count INTEGER,
  sentence_count INTEGER,
  paragraph_count INTEGER,
  has_structure BOOLEAN DEFAULT FALSE,
  has_examples BOOLEAN DEFAULT FALSE,
  has_summary BOOLEAN DEFAULT FALSE,
  
  -- Technical Quality Metrics
  readability_score DECIMAL(5,2),
  complexity_level VARCHAR(20) CHECK (complexity_level IN ('simple', 'medium', 'complex')),
  topic_relevance_score DECIMAL(5,2),
  factual_accuracy_score DECIMAL(5,2),
  
  -- Optimization Metrics
  brand_mentions_found INTEGER DEFAULT 0,
  brand_mentions_removed INTEGER DEFAULT 0,
  technical_terms_filtered INTEGER DEFAULT 0,
  enhancements_applied TEXT[],
  optimization_duration INTEGER, -- milliseconds
  
  -- Cache Metrics
  cache_key VARCHAR(32),
  cache_tier VARCHAR(20) CHECK (cache_tier IN ('memory', 'localStorage', 'indexedDB')),
  cache_ttl INTEGER,
  was_cached BOOLEAN DEFAULT FALSE,
  
  -- Computed Overall Score
  overall_quality_score INTEGER CHECK (overall_quality_score BETWEEN 0 AND 100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ai_response_quality_metrics
CREATE INDEX IF NOT EXISTS idx_quality_message ON ai_response_quality_metrics (message_id);
CREATE INDEX IF NOT EXISTS idx_quality_user ON ai_response_quality_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_quality_score ON ai_response_quality_metrics (overall_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_quality_optimization ON ai_response_quality_metrics (optimization_duration);
CREATE INDEX IF NOT EXISTS idx_quality_cache ON ai_response_quality_metrics (was_cached, cache_tier);

-- Enable RLS
ALTER TABLE ai_response_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own quality metrics" ON ai_response_quality_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert quality metrics" ON ai_response_quality_metrics
  FOR INSERT WITH CHECK (true); -- Allow system inserts

-- =============================================
-- AI Provider Security and Monitoring
-- =============================================

-- Table to track AI provider usage and security
CREATE TABLE IF NOT EXISTS ai_provider_security_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  
  -- Request Details
  request_type VARCHAR(50),
  request_size INTEGER, -- bytes
  response_size INTEGER, -- bytes
  processing_time INTEGER, -- milliseconds
  
  -- Security Metrics
  input_sanitized BOOLEAN DEFAULT FALSE,
  output_filtered BOOLEAN DEFAULT FALSE,
  brand_filtering_applied BOOLEAN DEFAULT FALSE,
  content_moderation_applied BOOLEAN DEFAULT FALSE,
  
  -- Rate Limiting
  requests_in_window INTEGER,
  rate_limit_hit BOOLEAN DEFAULT FALSE,
  
  -- Error Tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_type VARCHAR(100),
  error_message TEXT,
  
  -- Compliance
  data_retention_compliant BOOLEAN DEFAULT TRUE,
  privacy_preserved BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for ai_provider_security_log
CREATE INDEX IF NOT EXISTS idx_security_user ON ai_provider_security_log (user_id);
CREATE INDEX IF NOT EXISTS idx_security_provider ON ai_provider_security_log (provider);
CREATE INDEX IF NOT EXISTS idx_security_errors ON ai_provider_security_log (error_occurred, created_at);
CREATE INDEX IF NOT EXISTS idx_security_rate_limit ON ai_provider_security_log (rate_limit_hit, created_at);

-- Enable RLS
ALTER TABLE ai_provider_security_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - only service role can access security logs
CREATE POLICY "Service role can manage security logs" ON ai_provider_security_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- Enhanced Session Security
-- =============================================

-- Add security columns to ai_tutor_sessions if they don't exist
ALTER TABLE ai_tutor_sessions 
ADD COLUMN IF NOT EXISTS security_level VARCHAR(20) DEFAULT 'standard' CHECK (security_level IN ('minimal', 'standard', 'enhanced')),
ADD COLUMN IF NOT EXISTS data_encryption_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS content_filtering_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS rate_limiting_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS audit_logging_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_security_check TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS security_violations INTEGER DEFAULT 0;

-- =============================================
-- Real-time Analytics Triggers
-- =============================================

-- Function to update real-time analytics when feedback is given
CREATE OR REPLACE FUNCTION update_feedback_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert analytics event for feedback
  INSERT INTO ai_response_analytics (
    user_id,
    session_id,
    event_type,
    user_satisfaction,
    metadata,
    created_at
  ) VALUES (
    NEW.user_id,
    NEW.session_id,
    'user_feedback',
    NEW.feedback,
    jsonb_build_object(
      'quality_rating', NEW.quality_rating,
      'response_relevance', NEW.response_relevance,
      'response_clarity', NEW.response_clarity,
      'would_recommend', NEW.would_recommend,
      'has_suggestions', (NEW.improvement_suggestions IS NOT NULL)
    ),
    NEW.created_at
  );
  
  -- Update session satisfaction rate
  UPDATE ai_tutor_sessions SET
    user_satisfaction_rate = (
      SELECT COUNT(CASE WHEN f.feedback = 'helpful' THEN 1 END)::float /
             COUNT(*) * 100
      FROM ai_tutor_message_feedback f
      JOIN ai_tutor_messages m ON f.message_id = m.id
      WHERE m.session_id = NEW.session_id
    ),
    updated_at = NOW()
  WHERE id = NEW.session_id::uuid;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for feedback analytics
DROP TRIGGER IF EXISTS trigger_feedback_analytics ON ai_tutor_message_feedback;
CREATE TRIGGER trigger_feedback_analytics
  AFTER INSERT ON ai_tutor_message_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_analytics();

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any changes to security-sensitive data
  IF TG_OP = 'UPDATE' THEN
    IF OLD.security_level != NEW.security_level OR 
       OLD.content_filtering_enabled != NEW.content_filtering_enabled THEN
      
      UPDATE ai_tutor_sessions SET
        last_security_check = NOW()
      WHERE id = NEW.id;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for security logging
DROP TRIGGER IF EXISTS trigger_security_log ON ai_tutor_sessions;
CREATE TRIGGER trigger_security_log
  AFTER UPDATE ON ai_tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_security_event();

-- =============================================
-- Enhanced Analytics Views
-- =============================================

-- View for user feedback analytics
CREATE OR REPLACE VIEW user_feedback_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(f.id) as total_feedback,
  COUNT(CASE WHEN f.feedback = 'helpful' THEN 1 END) as helpful_count,
  COUNT(CASE WHEN f.feedback = 'not_helpful' THEN 1 END) as not_helpful_count,
  COUNT(CASE WHEN f.feedback = 'helpful' THEN 1 END)::float / COUNT(f.id) * 100 as satisfaction_rate,
  AVG(f.quality_rating) as avg_quality_rating,
  AVG(f.response_relevance) as avg_relevance_rating,
  AVG(f.response_clarity) as avg_clarity_rating,
  COUNT(CASE WHEN f.would_recommend = true THEN 1 END)::float / 
    COUNT(CASE WHEN f.would_recommend IS NOT NULL THEN 1 END) * 100 as recommendation_rate,
  COUNT(CASE WHEN f.improvement_suggestions IS NOT NULL THEN 1 END) as suggestions_provided
FROM auth.users u
LEFT JOIN ai_tutor_message_feedback f ON u.id = f.user_id
WHERE u.id = auth.uid()
GROUP BY u.id, u.email;

-- View for quality metrics analysis
CREATE OR REPLACE VIEW quality_metrics_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_responses,
  AVG(word_count) as avg_word_count,
  AVG(readability_score) as avg_readability,
  AVG(topic_relevance_score) as avg_relevance,
  AVG(factual_accuracy_score) as avg_accuracy,
  AVG(overall_quality_score) as avg_quality,
  COUNT(CASE WHEN has_structure THEN 1 END)::float / COUNT(*) * 100 as structure_rate,
  COUNT(CASE WHEN has_examples THEN 1 END)::float / COUNT(*) * 100 as examples_rate,
  AVG(optimization_duration) as avg_optimization_time,
  COUNT(CASE WHEN was_cached THEN 1 END)::float / COUNT(*) * 100 as cache_rate
FROM ai_response_quality_metrics
WHERE created_at >= (NOW() - INTERVAL '30 days')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for security monitoring
CREATE OR REPLACE VIEW security_monitoring AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  provider,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN error_occurred THEN 1 END) as errors,
  COUNT(CASE WHEN rate_limit_hit THEN 1 END) as rate_limits,
  AVG(processing_time) as avg_processing_time,
  COUNT(CASE WHEN brand_filtering_applied THEN 1 END)::float / COUNT(*) * 100 as filtering_rate,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_provider_security_log
WHERE created_at >= (NOW() - INTERVAL '24 hours')
GROUP BY DATE_TRUNC('hour', created_at), provider
ORDER BY hour DESC, provider;

-- =============================================
-- Utility Functions for Analytics
-- =============================================

-- Function to get comprehensive user stats
CREATE OR REPLACE FUNCTION get_user_comprehensive_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sessions', jsonb_build_object(
      'total', COUNT(DISTINCT s.id),
      'with_feedback', COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN s.id END),
      'avg_satisfaction', AVG(s.user_satisfaction_rate)
    ),
    'messages', jsonb_build_object(
      'total', COUNT(DISTINCT m.id),
      'optimized', COUNT(CASE WHEN m.is_optimized THEN 1 END),
      'cached', COUNT(CASE WHEN m.is_cached THEN 1 END),
      'avg_quality', AVG(m.quality_score)
    ),
    'feedback', jsonb_build_object(
      'total', COUNT(DISTINCT f.id),
      'helpful', COUNT(CASE WHEN f.feedback = 'helpful' THEN 1 END),
      'avg_quality_rating', AVG(f.quality_rating),
      'recommendation_rate', COUNT(CASE WHEN f.would_recommend THEN 1 END)::float / 
                           NULLIF(COUNT(CASE WHEN f.would_recommend IS NOT NULL THEN 1 END), 0) * 100
    ),
    'activity', jsonb_build_object(
      'first_interaction', MIN(s.created_at),
      'last_interaction', MAX(m.created_at),
      'total_days_active', COUNT(DISTINCT DATE_TRUNC('day', m.created_at))
    )
  ) INTO result
  FROM ai_tutor_sessions s
  LEFT JOIN ai_tutor_messages m ON s.id = m.session_id
  LEFT JOIN ai_tutor_message_feedback f ON m.id = f.message_id
  WHERE s.user_id = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old logs and maintain performance
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  security_deleted INTEGER;
  quality_deleted INTEGER;
  result JSONB;
BEGIN
  -- Clean up old security logs
  DELETE FROM ai_provider_security_log
  WHERE created_at < (NOW() - (days_to_keep || ' days')::INTERVAL);
  GET DIAGNOSTICS security_deleted = ROW_COUNT;
  
  -- Clean up old quality metrics (keep more for analysis)
  DELETE FROM ai_response_quality_metrics
  WHERE created_at < (NOW() - (days_to_keep * 2 || ' days')::INTERVAL);
  GET DIAGNOSTICS quality_deleted = ROW_COUNT;
  
  -- Update statistics
  ANALYZE ai_provider_security_log;
  ANALYZE ai_response_quality_metrics;
  ANALYZE ai_tutor_message_feedback;
  
  SELECT jsonb_build_object(
    'security_logs_deleted', security_deleted,
    'quality_metrics_deleted', quality_deleted,
    'cleanup_completed_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Grants and Permissions
-- =============================================

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE ON ai_tutor_message_feedback TO authenticated;
GRANT SELECT ON ai_response_quality_metrics TO authenticated;
GRANT INSERT ON ai_response_quality_metrics TO service_role;

-- Grant permissions on views
GRANT SELECT ON user_feedback_analytics TO authenticated;
GRANT SELECT ON quality_metrics_summary TO authenticated;
GRANT SELECT ON security_monitoring TO service_role;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_user_comprehensive_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_logs TO service_role;

-- =============================================
-- Migration Complete
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Message feedback and security migration completed';
  RAISE NOTICE 'Enhanced tables: ai_tutor_message_feedback, ai_response_quality_metrics, ai_provider_security_log';
  RAISE NOTICE 'Added security columns to ai_tutor_sessions';
  RAISE NOTICE 'Created comprehensive analytics views and utility functions';
  RAISE NOTICE 'Implemented real-time feedback tracking and security logging';
END $$;