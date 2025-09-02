-- Migration: AI Response Optimization - Performance Indexes
-- Description: Additional indexes and optimizations for the AI response system
-- Date: 2025-09-02

-- =============================================
-- Performance Indexes
-- =============================================

-- Analytics table indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analytics_user_event_date 
ON ai_response_analytics (user_id, event_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analytics_session_type 
ON ai_response_analytics (session_id, response_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analytics_quality_score 
ON ai_response_analytics (quality_score DESC) 
WHERE quality_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analytics_optimization_time 
ON ai_response_analytics (optimization_time) 
WHERE optimization_time IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_analytics_user_satisfaction 
ON ai_response_analytics (user_id, user_satisfaction, created_at DESC) 
WHERE user_satisfaction IS NOT NULL;

-- Cache metadata indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_metadata_user_accessed 
ON ai_response_cache_metadata (user_id, last_accessed DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_metadata_quality_hits 
ON ai_response_cache_metadata (quality_score DESC, hit_count DESC) 
WHERE quality_score IS NOT NULL;

-- Messages table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_quality 
ON ai_tutor_messages (user_id, quality_score DESC) 
WHERE quality_score IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_session_optimized 
ON ai_tutor_messages (session_id, is_optimized, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_cache_key 
ON ai_tutor_messages (cache_key) 
WHERE cache_key IS NOT NULL;

-- Sessions table performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_optimization 
ON ai_tutor_sessions (user_id, optimization_enabled, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_quality_satisfaction 
ON ai_tutor_sessions (average_quality_score DESC, user_satisfaction_rate DESC) 
WHERE average_quality_score IS NOT NULL;

-- =============================================
-- Partial Indexes for Filtered Queries
-- =============================================

-- Index for active filter rules only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_filter_rules_active_priority 
ON ai_response_filter_rules (priority, rule_type) 
WHERE is_active = true;

-- Index for active templates only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_active_type 
ON ai_response_templates (response_type) 
WHERE is_active = true;

-- Index for recent analytics events (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_recent 
ON ai_response_analytics (event_type, created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '30 days');

-- =============================================
-- Composite Indexes for Complex Queries
-- =============================================

-- For user dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_feedback_date 
ON ai_tutor_messages (user_id, user_feedback, created_at DESC) 
WHERE user_feedback IS NOT NULL;

-- For analytics aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_date_type_satisfaction 
ON ai_response_analytics (DATE_TRUNC('day', created_at), event_type, user_satisfaction);

-- For cache performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cache_performance 
ON ai_response_cache_metadata (cache_tier, hit_count DESC, created_at DESC);

-- =============================================
-- Materialized Views for Heavy Queries
-- =============================================

-- Daily analytics summary (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_responses,
  COUNT(CASE WHEN cache_hit = true THEN 1 END) as cache_hits,
  ROUND(AVG(quality_score), 2) as avg_quality_score,
  ROUND(AVG(optimization_time), 2) as avg_optimization_time,
  COUNT(CASE WHEN user_satisfaction = 'helpful' THEN 1 END) as helpful_responses,
  COUNT(CASE WHEN user_satisfaction = 'not_helpful' THEN 1 END) as not_helpful_responses,
  SUM(brand_mentions_removed) as brands_filtered,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT session_id) as active_sessions
FROM ai_response_analytics
WHERE created_at >= (CURRENT_DATE - INTERVAL '90 days')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_analytics_date 
ON daily_analytics_summary (date);

-- User performance summary (refresh weekly)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_performance_summary AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(m.id) as total_messages,
  ROUND(AVG(m.quality_score), 2) as avg_quality_score,
  COUNT(CASE WHEN m.is_cached THEN 1 END)::float / COUNT(m.id) * 100 as cache_hit_rate,
  COUNT(CASE WHEN m.user_feedback = 'helpful' THEN 1 END)::float / 
    NULLIF(COUNT(CASE WHEN m.user_feedback IS NOT NULL THEN 1 END), 0) * 100 as satisfaction_rate,
  MAX(m.created_at) as last_activity,
  EXTRACT(days FROM (NOW() - MAX(m.created_at))) as days_since_last_activity
FROM auth.users u
LEFT JOIN ai_tutor_sessions s ON u.id = s.user_id
LEFT JOIN ai_tutor_messages m ON s.id = m.session_id
WHERE m.created_at >= (NOW() - INTERVAL '30 days')
GROUP BY u.id
HAVING COUNT(m.id) > 0;

-- Create unique index on user performance summary
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_performance_user_id 
ON user_performance_summary (user_id);

-- =============================================
-- Functions for Materialized View Refresh
-- =============================================

-- Function to refresh daily analytics
CREATE OR REPLACE FUNCTION refresh_daily_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
  RAISE NOTICE 'Daily analytics summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to refresh user performance summary
CREATE OR REPLACE FUNCTION refresh_user_performance()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_performance_summary;
  RAISE NOTICE 'User performance summary refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Additional Utility Functions
-- =============================================

-- Function to get user optimization stats
CREATE OR REPLACE FUNCTION get_user_optimization_stats(user_uuid UUID)
RETURNS TABLE (
  total_optimizations BIGINT,
  cache_hits BIGINT,
  avg_quality NUMERIC,
  satisfaction_rate NUMERIC,
  most_used_enhancement TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(CASE WHEN event_type = 'response_optimized' THEN 1 END),
    COUNT(CASE WHEN cache_hit = true THEN 1 END),
    ROUND(AVG(quality_score), 2),
    COUNT(CASE WHEN user_satisfaction = 'helpful' THEN 1 END)::numeric / 
      NULLIF(COUNT(CASE WHEN user_satisfaction IS NOT NULL THEN 1 END), 0) * 100,
    (
      SELECT enhancement
      FROM (
        SELECT UNNEST(enhancements_applied) as enhancement
        FROM ai_response_analytics
        WHERE user_id = user_uuid AND enhancements_applied IS NOT NULL
      ) t
      GROUP BY enhancement
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  FROM ai_response_analytics
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cache efficiency stats
CREATE OR REPLACE FUNCTION get_cache_efficiency_stats()
RETURNS TABLE (
  total_cache_entries BIGINT,
  avg_hit_count NUMERIC,
  cache_hit_rate NUMERIC,
  most_popular_subject TEXT,
  storage_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*),
    ROUND(AVG(hit_count), 2),
    (SELECT 
       COUNT(CASE WHEN cache_hit = true THEN 1 END)::numeric / COUNT(*) * 100
     FROM ai_response_analytics 
     WHERE event_type = 'response_cached'),
    (SELECT subject 
     FROM ai_response_cache_metadata 
     WHERE subject IS NOT NULL 
     GROUP BY subject 
     ORDER BY COUNT(*) DESC 
     LIMIT 1),
    (SELECT jsonb_object_agg(cache_tier, tier_count)
     FROM (
       SELECT cache_tier, COUNT(*) as tier_count
       FROM ai_response_cache_metadata
       GROUP BY cache_tier
     ) tier_stats)
  FROM ai_response_cache_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Performance Monitoring Views
-- =============================================

-- View for monitoring slow optimizations
CREATE OR REPLACE VIEW slow_optimizations AS
SELECT 
  session_id,
  user_id,
  response_type,
  subject,
  optimization_time,
  quality_score,
  created_at
FROM ai_response_analytics
WHERE optimization_time > 5000 -- slower than 5 seconds
  AND event_type = 'response_optimized'
ORDER BY optimization_time DESC;

-- View for monitoring cache performance
CREATE OR REPLACE VIEW cache_performance AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN cache_hit = true THEN 1 END) as cache_hits,
  COUNT(CASE WHEN cache_hit = true THEN 1 END)::float / COUNT(*) * 100 as hit_rate,
  AVG(optimization_time) as avg_response_time
FROM ai_response_analytics
WHERE event_type = 'response_cached'
  AND created_at >= (NOW() - INTERVAL '24 hours')
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View for quality trends
CREATE OR REPLACE VIEW quality_trends AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  response_type,
  COUNT(*) as responses,
  ROUND(AVG(quality_score), 2) as avg_quality,
  ROUND(STDDEV(quality_score), 2) as quality_stddev,
  MIN(quality_score) as min_quality,
  MAX(quality_score) as max_quality
FROM ai_response_analytics
WHERE quality_score IS NOT NULL
  AND created_at >= (NOW() - INTERVAL '30 days')
GROUP BY DATE_TRUNC('day', created_at), response_type
ORDER BY date DESC, response_type;

-- =============================================
-- Cleanup and Maintenance
-- =============================================

-- Function to archive old analytics data
CREATE OR REPLACE FUNCTION archive_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_response_analytics
  WHERE created_at < (NOW() - (days_to_keep || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Archived % old analytics records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_optimization_stats()
RETURNS void AS $$
BEGIN
  -- Update table statistics for better query planning
  ANALYZE ai_response_analytics;
  ANALYZE ai_response_cache_metadata;
  ANALYZE ai_tutor_messages;
  ANALYZE ai_tutor_sessions;
  
  RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Grants for New Objects
-- =============================================

-- Grant permissions on materialized views
GRANT SELECT ON daily_analytics_summary TO authenticated;
GRANT SELECT ON user_performance_summary TO authenticated;

-- Grant permissions on performance views  
GRANT SELECT ON slow_optimizations TO service_role;
GRANT SELECT ON cache_performance TO service_role;
GRANT SELECT ON quality_trends TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_optimization_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_efficiency_stats TO service_role;
GRANT EXECUTE ON FUNCTION refresh_daily_analytics TO service_role;
GRANT EXECUTE ON FUNCTION refresh_user_performance TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_analytics TO service_role;
GRANT EXECUTE ON FUNCTION update_optimization_stats TO service_role;

COMMIT;

-- =============================================
-- Performance Index Creation Complete
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'AI Response Optimization performance indexes migration completed';
  RAISE NOTICE 'Created % indexes for improved query performance', 15;
  RAISE NOTICE 'Created materialized views: daily_analytics_summary, user_performance_summary';
  RAISE NOTICE 'Created utility functions for stats and maintenance';
  RAISE NOTICE 'Created performance monitoring views';
END $$;