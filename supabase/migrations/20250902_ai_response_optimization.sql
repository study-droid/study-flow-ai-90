-- Migration: AI Response Optimization System
-- Description: Add tables and columns to support the new AI response optimization features
-- Date: 2025-09-02

-- Enable RLS and UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- AI Response Analytics Tables
-- =============================================

-- Table to store response analytics events
CREATE TABLE IF NOT EXISTS ai_response_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('response_generated', 'response_cached', 'response_filtered', 'response_optimized', 'user_feedback')),
  response_type VARCHAR(50) CHECK (response_type IN ('explanation', 'study_plan', 'practice', 'concept', 'general')),
  subject VARCHAR(255),
  topic VARCHAR(255),
  user_level VARCHAR(20) CHECK (user_level IN ('beginner', 'intermediate', 'advanced')),
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  optimization_time INTEGER, -- milliseconds
  response_length INTEGER,
  cache_hit BOOLEAN DEFAULT FALSE,
  brand_mentions_removed INTEGER DEFAULT 0,
  enhancements_applied TEXT[], -- array of applied enhancements
  user_satisfaction VARCHAR(20) CHECK (user_satisfaction IN ('helpful', 'not_helpful')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_ai_analytics_user_created (user_id, created_at DESC),
  INDEX idx_ai_analytics_session (session_id),
  INDEX idx_ai_analytics_event_type (event_type),
  INDEX idx_ai_analytics_response_type (response_type)
);

-- Enable RLS
ALTER TABLE ai_response_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own analytics" ON ai_response_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON ai_response_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Response Cache Metadata Table
-- =============================================

-- Table to store cache metadata for analytics
CREATE TABLE IF NOT EXISTS ai_response_cache_metadata (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cache_key VARCHAR(32) NOT NULL UNIQUE, -- SHA-256 hash (first 16 chars)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  response_type VARCHAR(50),
  subject VARCHAR(255),
  topic VARCHAR(255),
  user_level VARCHAR(20),
  quality_score INTEGER,
  cache_tier VARCHAR(20) CHECK (cache_tier IN ('memory', 'localStorage', 'indexedDB')),
  ttl_seconds INTEGER,
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_cache_metadata_key (cache_key),
  INDEX idx_cache_metadata_user (user_id),
  INDEX idx_cache_metadata_expires (expires_at)
);

-- Enable RLS
ALTER TABLE ai_response_cache_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own cache metadata" ON ai_response_cache_metadata
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Enhanced AI Tutor Sessions
-- =============================================

-- Add new columns to existing ai_tutor_sessions table
ALTER TABLE ai_tutor_sessions 
ADD COLUMN IF NOT EXISTS optimization_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS cache_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_optimizations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cache_hits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_quality_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS user_satisfaction_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS last_optimization TIMESTAMP WITH TIME ZONE;

-- =============================================
-- Enhanced AI Tutor Messages
-- =============================================

-- Add new columns to existing ai_tutor_messages table
ALTER TABLE ai_tutor_messages 
ADD COLUMN IF NOT EXISTS is_cached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS optimization_time INTEGER, -- milliseconds
ADD COLUMN IF NOT EXISTS brand_mentions_filtered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enhancements_applied TEXT[],
ADD COLUMN IF NOT EXISTS cache_key VARCHAR(32),
ADD COLUMN IF NOT EXISTS user_feedback VARCHAR(20) CHECK (user_feedback IN ('helpful', 'not_helpful')),
ADD COLUMN IF NOT EXISTS feedback_timestamp TIMESTAMP WITH TIME ZONE;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_messages_cached ON ai_tutor_messages(is_cached);
CREATE INDEX IF NOT EXISTS idx_messages_optimized ON ai_tutor_messages(is_optimized);
CREATE INDEX IF NOT EXISTS idx_messages_quality ON ai_tutor_messages(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_messages_feedback ON ai_tutor_messages(user_feedback);

-- =============================================
-- Response Filter Rules
-- =============================================

-- Table to store configurable filter rules
CREATE TABLE IF NOT EXISTS ai_response_filter_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('brand_filter', 'content_filter', 'technical_filter')),
  pattern TEXT NOT NULL, -- regex pattern
  replacement TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- execution order
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_filter_rules_type (rule_type),
  INDEX idx_filter_rules_active (is_active),
  INDEX idx_filter_rules_priority (priority)
);

-- Enable RLS
ALTER TABLE ai_response_filter_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only for now)
CREATE POLICY "Service role can manage filter rules" ON ai_response_filter_rules
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default filter rules
INSERT INTO ai_response_filter_rules (rule_name, rule_type, pattern, replacement, description, priority) VALUES
('DeepSeek Brand Filter', 'brand_filter', '\b(deepseek|deep seek|deep-seek)\b', 'AI', 'Remove DeepSeek brand mentions', 10),
('GPT Brand Filter', 'brand_filter', '\b(gpt|chatgpt|gpt-\d+)\b', 'AI', 'Remove GPT brand mentions', 10),
('Claude Brand Filter', 'brand_filter', '\b(claude|claude-\d+)\b', 'AI', 'Remove Claude brand mentions', 10),
('Gemini Brand Filter', 'brand_filter', '\b(gemini|bard)\b', 'AI', 'Remove Google AI brand mentions', 10),
('OpenAI Brand Filter', 'brand_filter', '\bopenai\b', 'AI technology', 'Remove OpenAI brand mentions', 10),
('Anthropic Brand Filter', 'brand_filter', '\banthropic\b', 'AI company', 'Remove Anthropic brand mentions', 10),
('API Technical Filter', 'technical_filter', '\b(api key|api token)\b', 'configuration', 'Remove API key references', 20),
('Endpoint Technical Filter', 'technical_filter', '\b(endpoint|url)\b', 'connection', 'Remove technical endpoint details', 20),
('Model Technical Filter', 'technical_filter', '\b(model|training data)\b', 'system', 'Remove model references', 20),
('Parameter Technical Filter', 'technical_filter', '\b(temperature|top_p|max_tokens)\b', 'settings', 'Remove parameter references', 20)
ON CONFLICT DO NOTHING;

-- =============================================
-- Response Templates
-- =============================================

-- Table to store response templates
CREATE TABLE IF NOT EXISTS ai_response_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_name VARCHAR(100) NOT NULL,
  response_type VARCHAR(50) NOT NULL,
  introduction TEXT,
  structure TEXT[], -- array of section headers
  required_sections TEXT[],
  optional_sections TEXT[],
  min_length INTEGER,
  max_length INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_templates_type (response_type),
  INDEX idx_templates_active (is_active)
);

-- Enable RLS
ALTER TABLE ai_response_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role only)
CREATE POLICY "Service role can manage templates" ON ai_response_templates
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default templates
INSERT INTO ai_response_templates (template_name, response_type, introduction, structure, required_sections, optional_sections, min_length, max_length) VALUES
('Explanation Template', 'explanation', 'Let me explain this concept clearly:', 
 ARRAY['## Overview', '## Detailed Explanation', '## Key Points', '## Examples', '## Summary'],
 ARRAY['Overview', 'Detailed Explanation', 'Summary'],
 ARRAY['Examples', 'Key Points'],
 200, 2000),
 
('Study Plan Template', 'study_plan', 'Here''s a comprehensive study plan tailored for you:',
 ARRAY['## 📅 Timeline', '## 📚 Topics to Cover', '## 🎯 Learning Objectives', '## 📝 Study Resources', '## 📊 Progress Tracking', '## ✅ Milestones'],
 ARRAY['Timeline', 'Topics to Cover', 'Learning Objectives'],
 ARRAY['Study Resources', 'Progress Tracking', 'Milestones'],
 300, 2500),
 
('Practice Template', 'practice', 'Here are practice questions to test your understanding:',
 ARRAY['## Questions', '## Hints', '## Solutions', '## Explanations', '## Additional Practice'],
 ARRAY['Questions'],
 ARRAY['Hints', 'Solutions', 'Explanations', 'Additional Practice'],
 150, 2000),
 
('Concept Template', 'concept', 'Let''s explore this concept in detail:',
 ARRAY['## 📖 Definition', '## 🔍 Detailed Explanation', '## 💡 Examples', '## 🔗 Related Concepts', '## ✅ Quick Check', '## 📚 Further Reading'],
 ARRAY['Definition', 'Detailed Explanation'],
 ARRAY['Examples', 'Related Concepts', 'Quick Check', 'Further Reading'],
 250, 2000)
ON CONFLICT DO NOTHING;

-- =============================================
-- User Preferences for Optimization
-- =============================================

-- Table to store user preferences for AI optimization
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  optimization_enabled BOOLEAN DEFAULT TRUE,
  cache_enabled BOOLEAN DEFAULT TRUE,
  analytics_enabled BOOLEAN DEFAULT TRUE,
  preferred_response_length VARCHAR(20) DEFAULT 'medium' CHECK (preferred_response_length IN ('short', 'medium', 'long')),
  preferred_explanation_style VARCHAR(20) DEFAULT 'structured' CHECK (preferred_explanation_style IN ('conversational', 'structured', 'detailed')),
  show_quality_indicators BOOLEAN DEFAULT TRUE,
  show_cache_indicators BOOLEAN DEFAULT TRUE,
  enable_feedback_prompts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own preferences" ON ai_user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to update ai_tutor_sessions statistics
CREATE OR REPLACE FUNCTION update_session_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session statistics when messages are added
  IF TG_OP = 'INSERT' AND NEW.role = 'assistant' THEN
    UPDATE ai_tutor_sessions SET
      total_optimizations = COALESCE(total_optimizations, 0) + CASE WHEN NEW.is_optimized THEN 1 ELSE 0 END,
      total_cache_hits = COALESCE(total_cache_hits, 0) + CASE WHEN NEW.is_cached THEN 1 ELSE 0 END,
      last_optimization = CASE WHEN NEW.is_optimized THEN NOW() ELSE last_optimization END,
      updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session statistics
DROP TRIGGER IF EXISTS trigger_update_session_stats ON ai_tutor_messages;
CREATE TRIGGER trigger_update_session_stats
  AFTER INSERT ON ai_tutor_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_statistics();

-- Function to clean up expired cache metadata
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_response_cache_metadata
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit_count(cache_key_param VARCHAR(32))
RETURNS void AS $$
BEGIN
  UPDATE ai_response_cache_metadata
  SET hit_count = hit_count + 1,
      last_accessed = NOW()
  WHERE cache_key = cache_key_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Analytics Views
-- =============================================

-- View for user analytics dashboard
CREATE OR REPLACE VIEW user_ai_analytics AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(CASE WHEN m.is_optimized THEN 1 END) as optimized_responses,
  COUNT(CASE WHEN m.is_cached THEN 1 END) as cached_responses,
  AVG(m.quality_score) as avg_quality_score,
  COUNT(CASE WHEN m.user_feedback = 'helpful' THEN 1 END)::float / 
    NULLIF(COUNT(CASE WHEN m.user_feedback IS NOT NULL THEN 1 END), 0) * 100 as satisfaction_rate,
  COUNT(CASE WHEN a.event_type = 'user_feedback' AND a.user_satisfaction = 'helpful' THEN 1 END) as positive_feedback,
  MAX(m.created_at) as last_interaction
FROM auth.users u
LEFT JOIN ai_tutor_sessions s ON u.id = s.user_id
LEFT JOIN ai_tutor_messages m ON s.id = m.session_id
LEFT JOIN ai_response_analytics a ON u.id = a.user_id
WHERE u.id = auth.uid()
GROUP BY u.id, u.email;

-- View for system performance metrics
CREATE OR REPLACE VIEW system_performance_metrics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'response_cached' AND cache_hit = true THEN 1 END) as cache_hits,
  COUNT(CASE WHEN event_type = 'response_cached' THEN 1 END) as cache_attempts,
  AVG(quality_score) as avg_quality_score,
  AVG(optimization_time) as avg_optimization_time,
  COUNT(CASE WHEN user_satisfaction = 'helpful' THEN 1 END)::float /
    NULLIF(COUNT(CASE WHEN user_satisfaction IS NOT NULL THEN 1 END), 0) * 100 as satisfaction_rate,
  SUM(brand_mentions_removed) as total_brands_filtered
FROM ai_response_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- =============================================
-- Scheduled Tasks (if pg_cron is available)
-- =============================================

-- Note: These require pg_cron extension which may not be available in all environments
-- Uncomment if pg_cron is available:

-- Daily cache cleanup
-- SELECT cron.schedule('cleanup-cache', '0 2 * * *', 'SELECT cleanup_expired_cache();');

-- Weekly analytics aggregation
-- SELECT cron.schedule('weekly-analytics', '0 0 * * 0', 'REFRESH MATERIALIZED VIEW IF EXISTS analytics_summary;');

-- =============================================
-- Grants and Permissions
-- =============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ai_response_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_response_cache_metadata TO authenticated;
GRANT SELECT, UPDATE ON ai_tutor_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_tutor_messages TO authenticated;
GRANT SELECT ON ai_response_filter_rules TO authenticated;
GRANT SELECT ON ai_response_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_user_preferences TO authenticated;

-- Grant access to views
GRANT SELECT ON user_ai_analytics TO authenticated;
GRANT SELECT ON system_performance_metrics TO service_role;

-- Grant function execution
GRANT EXECUTE ON FUNCTION increment_cache_hit_count TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_cache TO service_role;

COMMIT;

-- =============================================
-- Migration Complete
-- =============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'AI Response Optimization System migration completed successfully';
  RAISE NOTICE 'Tables created: ai_response_analytics, ai_response_cache_metadata, ai_response_filter_rules, ai_response_templates, ai_user_preferences';
  RAISE NOTICE 'Enhanced existing tables: ai_tutor_sessions, ai_tutor_messages';
  RAISE NOTICE 'Views created: user_ai_analytics, system_performance_metrics';
  RAISE NOTICE 'Functions created: update_session_statistics, cleanup_expired_cache, increment_cache_hit_count';
END $$;