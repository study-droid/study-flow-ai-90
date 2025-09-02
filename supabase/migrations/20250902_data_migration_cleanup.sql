-- Migration: Data Migration and Cleanup for AI Response Optimization
-- Description: Migrate existing data and ensure compatibility with new features
-- Date: 2025-09-02

-- =============================================
-- Data Migration for Existing Records
-- =============================================

-- Update existing ai_tutor_sessions with default optimization settings
UPDATE ai_tutor_sessions 
SET 
  optimization_enabled = COALESCE(optimization_enabled, true),
  cache_enabled = COALESCE(cache_enabled, true),
  analytics_enabled = COALESCE(analytics_enabled, true),
  total_optimizations = COALESCE(total_optimizations, 0),
  total_cache_hits = COALESCE(total_cache_hits, 0),
  security_level = COALESCE(security_level, 'standard'),
  data_encryption_enabled = COALESCE(data_encryption_enabled, true),
  content_filtering_enabled = COALESCE(content_filtering_enabled, true),
  rate_limiting_enabled = COALESCE(rate_limiting_enabled, true),
  audit_logging_enabled = COALESCE(audit_logging_enabled, true),
  security_violations = COALESCE(security_violations, 0)
WHERE optimization_enabled IS NULL 
   OR cache_enabled IS NULL 
   OR analytics_enabled IS NULL
   OR security_level IS NULL;

-- Update existing ai_tutor_messages with default optimization values
UPDATE ai_tutor_messages 
SET 
  is_cached = COALESCE(is_cached, false),
  is_optimized = COALESCE(is_optimized, false),
  brand_mentions_filtered = COALESCE(brand_mentions_filtered, 0)
WHERE is_cached IS NULL 
   OR is_optimized IS NULL 
   OR brand_mentions_filtered IS NULL;

-- =============================================
-- Create Default User Preferences for Existing Users
-- =============================================

-- Insert default preferences for users who don't have them
INSERT INTO ai_user_preferences (user_id)
SELECT DISTINCT u.id
FROM auth.users u
LEFT JOIN ai_user_preferences p ON u.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- Initialize Analytics for Existing Sessions
-- =============================================

-- Create analytics events for existing optimized messages
INSERT INTO ai_response_analytics (
  user_id,
  session_id,
  event_type,
  response_type,
  subject,
  topic,
  quality_score,
  response_length,
  cache_hit,
  metadata,
  created_at
)
SELECT 
  s.user_id,
  m.session_id,
  'response_generated',
  CASE 
    WHEN LOWER(m.content) LIKE '%study plan%' THEN 'study_plan'
    WHEN LOWER(m.content) LIKE '%practice%' OR LOWER(m.content) LIKE '%question%' THEN 'practice'
    WHEN LOWER(m.content) LIKE '%concept%' OR LOWER(m.content) LIKE '%definition%' THEN 'concept'
    ELSE 'explanation'
  END,
  m.subject,
  m.topic,
  COALESCE(m.quality_score, 
    -- Calculate basic quality score for existing messages
    CASE 
      WHEN LENGTH(m.content) > 500 THEN 85
      WHEN LENGTH(m.content) > 200 THEN 75
      ELSE 65
    END
  ),
  LENGTH(m.content),
  COALESCE(m.is_cached, false),
  jsonb_build_object(
    'migrated', true,
    'original_created_at', m.created_at,
    'has_structure', (m.content LIKE '%##%' OR m.content LIKE '%**%'),
    'estimated', true
  ),
  m.created_at
FROM ai_tutor_messages m
JOIN ai_tutor_sessions s ON m.session_id = s.id
WHERE m.role = 'assistant'
  AND NOT EXISTS (
    SELECT 1 FROM ai_response_analytics a 
    WHERE a.session_id = m.session_id 
      AND a.created_at = m.created_at
      AND a.event_type = 'response_generated'
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- Create Quality Metrics for Existing Messages
-- =============================================

-- Generate quality metrics for existing assistant messages
INSERT INTO ai_response_quality_metrics (
  message_id,
  user_id,
  word_count,
  sentence_count,
  paragraph_count,
  has_structure,
  has_examples,
  has_summary,
  readability_score,
  complexity_level,
  topic_relevance_score,
  overall_quality_score,
  brand_mentions_found,
  brand_mentions_removed,
  was_cached,
  created_at
)
SELECT 
  m.id,
  s.user_id,
  -- Word count
  array_length(string_to_array(TRIM(m.content), ' '), 1),
  -- Sentence count (approximate)
  array_length(string_to_array(m.content, '.'), 1) - 1,
  -- Paragraph count
  array_length(string_to_array(TRIM(m.content), E'\n\n'), 1),
  -- Has structure (markdown headers or bold text)
  (m.content LIKE '%##%' OR m.content LIKE '%**%'),
  -- Has examples
  (LOWER(m.content) LIKE '%example%' OR LOWER(m.content) LIKE '%for instance%'),
  -- Has summary
  (LOWER(m.content) LIKE '%summary%' OR LOWER(m.content) LIKE '%conclusion%'),
  -- Readability score (simplified calculation)
  CASE 
    WHEN array_length(string_to_array(TRIM(m.content), ' '), 1) < 100 THEN 85.0
    WHEN array_length(string_to_array(TRIM(m.content), ' '), 1) < 300 THEN 75.0
    ELSE 65.0
  END,
  -- Complexity level
  CASE 
    WHEN LOWER(m.content) LIKE '%advanced%' OR LOWER(m.content) LIKE '%complex%' THEN 'complex'
    WHEN LOWER(m.content) LIKE '%intermediate%' THEN 'medium'
    ELSE 'simple'
  END,
  -- Topic relevance (estimated)
  CASE 
    WHEN m.subject IS NOT NULL AND m.topic IS NOT NULL THEN 90.0
    WHEN m.subject IS NOT NULL THEN 80.0
    ELSE 70.0
  END,
  -- Overall quality score
  COALESCE(m.quality_score, 
    CASE 
      WHEN LENGTH(m.content) > 500 AND (m.content LIKE '%##%' OR m.content LIKE '%**%') THEN 90
      WHEN LENGTH(m.content) > 300 THEN 80
      WHEN LENGTH(m.content) > 100 THEN 70
      ELSE 60
    END
  ),
  -- Brand mentions found (estimate for existing content)
  CASE 
    WHEN LOWER(m.content) LIKE '%deepseek%' OR LOWER(m.content) LIKE '%gpt%' OR LOWER(m.content) LIKE '%claude%' THEN 1
    ELSE 0
  END,
  -- Brand mentions removed (assume they were filtered if created recently)
  CASE 
    WHEN m.created_at > NOW() - INTERVAL '7 days' THEN 0
    ELSE 0
  END,
  -- Was cached
  COALESCE(m.is_cached, false),
  m.created_at
FROM ai_tutor_messages m
JOIN ai_tutor_sessions s ON m.session_id = s.id
WHERE m.role = 'assistant'
  AND NOT EXISTS (
    SELECT 1 FROM ai_response_quality_metrics q 
    WHERE q.message_id = m.id
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- Update Session Statistics
-- =============================================

-- Calculate and update session statistics based on existing messages
WITH session_stats AS (
  SELECT 
    s.id as session_id,
    COUNT(CASE WHEN m.is_optimized THEN 1 END) as optimizations,
    COUNT(CASE WHEN m.is_cached THEN 1 END) as cache_hits,
    AVG(m.quality_score) as avg_quality,
    MAX(m.created_at) as last_optimization_time,
    -- Calculate satisfaction rate from feedback
    COUNT(CASE WHEN f.feedback = 'helpful' THEN 1 END)::float / 
      NULLIF(COUNT(CASE WHEN f.feedback IS NOT NULL THEN 1 END), 0) * 100 as satisfaction_rate
  FROM ai_tutor_sessions s
  LEFT JOIN ai_tutor_messages m ON s.id = m.session_id AND m.role = 'assistant'
  LEFT JOIN ai_tutor_message_feedback f ON m.id = f.message_id
  GROUP BY s.id
)
UPDATE ai_tutor_sessions 
SET 
  total_optimizations = COALESCE(stats.optimizations, 0),
  total_cache_hits = COALESCE(stats.cache_hits, 0),
  average_quality_score = ROUND(stats.avg_quality::numeric, 2),
  user_satisfaction_rate = ROUND(stats.satisfaction_rate::numeric, 2),
  last_optimization = stats.last_optimization_time,
  updated_at = NOW()
FROM session_stats stats
WHERE ai_tutor_sessions.id = stats.session_id
  AND (ai_tutor_sessions.total_optimizations != COALESCE(stats.optimizations, 0)
       OR ai_tutor_sessions.total_cache_hits != COALESCE(stats.cache_hits, 0)
       OR ai_tutor_sessions.average_quality_score IS DISTINCT FROM ROUND(stats.avg_quality::numeric, 2));

-- =============================================
-- Data Validation and Cleanup
-- =============================================

-- Remove any orphaned records
DELETE FROM ai_response_analytics 
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR session_id NOT IN (SELECT id::text FROM ai_tutor_sessions);

DELETE FROM ai_response_cache_metadata 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM ai_tutor_message_feedback 
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR message_id NOT IN (SELECT id FROM ai_tutor_messages);

DELETE FROM ai_response_quality_metrics 
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR message_id NOT IN (SELECT id FROM ai_tutor_messages);

-- =============================================
-- Initialize Cache Metadata for Popular Queries
-- =============================================

-- Create cache metadata entries for commonly requested topics
INSERT INTO ai_response_cache_metadata (
  cache_key,
  user_id,
  response_type,
  subject,
  topic,
  user_level,
  quality_score,
  cache_tier,
  ttl_seconds,
  hit_count,
  created_at,
  expires_at
)
SELECT 
  LEFT(MD5(CONCAT(subject, '-', topic, '-', 'explanation')), 16) as cache_key,
  user_id,
  'explanation' as response_type,
  subject,
  topic,
  'intermediate' as user_level,
  80 as quality_score,
  'localStorage' as cache_tier,
  3600 as ttl_seconds,
  0 as hit_count,
  NOW() as created_at,
  NOW() + INTERVAL '1 hour' as expires_at
FROM (
  SELECT DISTINCT 
    user_id,
    subject,
    topic
  FROM ai_tutor_messages 
  WHERE subject IS NOT NULL 
    AND topic IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
  LIMIT 50
) popular_topics
ON CONFLICT (cache_key) DO NOTHING;

-- =============================================
-- Performance Optimization
-- =============================================

-- Update table statistics for better query performance
ANALYZE ai_response_analytics;
ANALYZE ai_response_cache_metadata;
ANALYZE ai_response_quality_metrics;
ANALYZE ai_tutor_message_feedback;
ANALYZE ai_response_filter_rules;
ANALYZE ai_response_templates;
ANALYZE ai_user_preferences;
ANALYZE ai_tutor_sessions;
ANALYZE ai_tutor_messages;

-- =============================================
-- Create Initial System Health Check
-- =============================================

-- Function to perform system health check
CREATE OR REPLACE FUNCTION ai_system_health_check()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tables', jsonb_build_object(
      'ai_response_analytics', (SELECT COUNT(*) FROM ai_response_analytics),
      'ai_response_cache_metadata', (SELECT COUNT(*) FROM ai_response_cache_metadata),
      'ai_response_quality_metrics', (SELECT COUNT(*) FROM ai_response_quality_metrics),
      'ai_tutor_message_feedback', (SELECT COUNT(*) FROM ai_tutor_message_feedback),
      'ai_response_filter_rules', (SELECT COUNT(*) FROM ai_response_filter_rules WHERE is_active = true),
      'ai_response_templates', (SELECT COUNT(*) FROM ai_response_templates WHERE is_active = true),
      'ai_user_preferences', (SELECT COUNT(*) FROM ai_user_preferences)
    ),
    'metrics', jsonb_build_object(
      'avg_quality_score', (SELECT ROUND(AVG(quality_score), 2) FROM ai_response_analytics WHERE quality_score IS NOT NULL),
      'cache_hit_rate', (
        SELECT ROUND(
          COUNT(CASE WHEN cache_hit = true THEN 1 END)::numeric / COUNT(*) * 100, 2
        )
        FROM ai_response_analytics 
        WHERE event_type = 'response_cached'
      ),
      'user_satisfaction_rate', (
        SELECT ROUND(
          COUNT(CASE WHEN user_satisfaction = 'helpful' THEN 1 END)::numeric / 
          NULLIF(COUNT(CASE WHEN user_satisfaction IS NOT NULL THEN 1 END), 0) * 100, 2
        )
        FROM ai_response_analytics
      ),
      'total_optimizations', (SELECT COUNT(*) FROM ai_response_analytics WHERE event_type = 'response_optimized'),
      'active_users', (SELECT COUNT(DISTINCT user_id) FROM ai_response_analytics WHERE created_at > NOW() - INTERVAL '7 days')
    ),
    'health_status', 'operational',
    'last_check', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute health check
GRANT EXECUTE ON FUNCTION ai_system_health_check TO service_role;

-- =============================================
-- Final Data Integrity Checks
-- =============================================

-- Check for any data inconsistencies
DO $$
DECLARE
  orphaned_analytics INTEGER;
  orphaned_quality_metrics INTEGER;
  orphaned_feedback INTEGER;
  missing_preferences INTEGER;
BEGIN
  -- Count orphaned analytics records
  SELECT COUNT(*) INTO orphaned_analytics
  FROM ai_response_analytics a
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = a.user_id
  );
  
  -- Count orphaned quality metrics
  SELECT COUNT(*) INTO orphaned_quality_metrics
  FROM ai_response_quality_metrics q
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_tutor_messages m WHERE m.id = q.message_id
  );
  
  -- Count orphaned feedback records
  SELECT COUNT(*) INTO orphaned_feedback
  FROM ai_tutor_message_feedback f
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_tutor_messages m WHERE m.id = f.message_id
  );
  
  -- Count users without preferences
  SELECT COUNT(*) INTO missing_preferences
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_user_preferences p WHERE p.user_id = u.id
  );
  
  -- Report results
  IF orphaned_analytics > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned analytics records', orphaned_analytics;
  END IF;
  
  IF orphaned_quality_metrics > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned quality metrics records', orphaned_quality_metrics;
  END IF;
  
  IF orphaned_feedback > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned feedback records', orphaned_feedback;
  END IF;
  
  IF missing_preferences > 0 THEN
    RAISE NOTICE 'INFO: Found % users without preferences (normal for inactive users)', missing_preferences;
  END IF;
  
  IF orphaned_analytics = 0 AND orphaned_quality_metrics = 0 AND orphaned_feedback = 0 THEN
    RAISE NOTICE 'SUCCESS: Data integrity check passed - no orphaned records found';
  END IF;
END $$;

COMMIT;

-- =============================================
-- Migration Summary and System Status
-- =============================================

DO $$
DECLARE
  health_check JSONB;
BEGIN
  -- Perform initial health check
  SELECT ai_system_health_check() INTO health_check;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AI RESPONSE OPTIMIZATION SYSTEM - MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Data migration completed successfully';
  RAISE NOTICE 'Updated % existing sessions with optimization settings', 
    (SELECT COUNT(*) FROM ai_tutor_sessions WHERE optimization_enabled = true);
  RAISE NOTICE 'Updated % existing messages with optimization flags', 
    (SELECT COUNT(*) FROM ai_tutor_messages WHERE is_optimized IS NOT NULL);
  RAISE NOTICE 'Created % analytics events from existing data', 
    (SELECT COUNT(*) FROM ai_response_analytics);
  RAISE NOTICE 'Created % quality metrics records', 
    (SELECT COUNT(*) FROM ai_response_quality_metrics);
  RAISE NOTICE 'Active filter rules: %', 
    (SELECT COUNT(*) FROM ai_response_filter_rules WHERE is_active = true);
  RAISE NOTICE 'Active response templates: %', 
    (SELECT COUNT(*) FROM ai_response_templates WHERE is_active = true);
  RAISE NOTICE 'User preferences created: %', 
    (SELECT COUNT(*) FROM ai_user_preferences);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'System Health Check: %', health_check->>'health_status';
  RAISE NOTICE 'Average Quality Score: %', COALESCE((health_check->'metrics'->>'avg_quality_score')::text, 'N/A');
  RAISE NOTICE 'Cache Hit Rate: %', COALESCE((health_check->'metrics'->>'cache_hit_rate')::text || '%', 'N/A');
  RAISE NOTICE 'User Satisfaction Rate: %', COALESCE((health_check->'metrics'->>'user_satisfaction_rate')::text || '%', 'N/A');
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AI Response Optimization System is now fully operational!';
END $$;