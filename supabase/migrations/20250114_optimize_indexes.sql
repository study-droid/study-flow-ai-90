-- Optimize database indexes based on Supabase linter recommendations
-- This migration adds missing indexes for foreign keys and comments on unused indexes

-- ============================================
-- ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================
-- These indexes will improve JOIN performance and foreign key constraint checking

-- ai_tutor_messages.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_ai_tutor_messages_user_id 
ON public.ai_tutor_messages(user_id);

-- flashcard_decks.subject_id foreign key
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject_id 
ON public.flashcard_decks(subject_id);

-- practice_questions.ai_session_id foreign key
CREATE INDEX IF NOT EXISTS idx_practice_questions_ai_session_id 
ON public.practice_questions(ai_session_id);

-- study_plans.ai_session_id foreign key
CREATE INDEX IF NOT EXISTS idx_study_plans_ai_session_id 
ON public.study_plans(ai_session_id);

-- study_sessions.goal_id foreign key
CREATE INDEX IF NOT EXISTS idx_study_sessions_goal_id 
ON public.study_sessions(goal_id);

-- study_sessions.task_id foreign key
CREATE INDEX IF NOT EXISTS idx_study_sessions_task_id 
ON public.study_sessions(task_id);

-- subject_statistics.subject_id foreign key
CREATE INDEX IF NOT EXISTS idx_subject_statistics_subject_id 
ON public.subject_statistics(subject_id);

-- tasks.parent_task_id foreign key (self-referential)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id 
ON public.tasks(parent_task_id);

-- ============================================
-- COMMENT ON UNUSED INDEXES
-- ============================================
-- These indexes haven't been used yet according to the linter
-- We'll keep them but add comments for future review
-- If they remain unused after monitoring, they can be dropped to save storage

-- Profiles table
COMMENT ON INDEX idx_profiles_created_at IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_profiles_email IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_profiles_university IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_profiles_setup_completed IS 'UNUSED - Consider removing if still unused after monitoring';

-- Subjects table
COMMENT ON INDEX idx_subjects_name IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_subjects_tags IS 'UNUSED - Consider removing if still unused after monitoring';

-- Tasks table
COMMENT ON INDEX idx_tasks_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_tasks_status IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_tasks_priority IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_tasks_due_date IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_tasks_user_status_archived IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_tasks_study_plan_id IS 'UNUSED - Consider removing if still unused after monitoring';

-- Goals table
COMMENT ON INDEX idx_goals_user_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_goals_status IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_goals_target_date IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Sessions table
COMMENT ON INDEX idx_study_sessions_user_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_sessions_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_sessions_started_at IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_sessions_completed IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_sessions_completed_at IS 'UNUSED - Consider removing if still unused after monitoring';

-- Timetable table
COMMENT ON INDEX idx_timetable_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_timetable_day_of_week IS 'UNUSED - Consider removing if still unused after monitoring';

-- AI Tutor tables
COMMENT ON INDEX idx_ai_sessions_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_ai_sessions_status IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_ai_messages_session_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_feedback_session_id IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Materials table
COMMENT ON INDEX idx_materials_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_materials_type IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_materials_completed IS 'UNUSED - Consider removing if still unused after monitoring';

-- Subject Assignments table
COMMENT ON INDEX idx_assignments_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_assignments_due_date IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Plans table
COMMENT ON INDEX idx_study_plans_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_plans_status IS 'UNUSED - Consider removing if still unused after monitoring';

-- Practice Questions table
COMMENT ON INDEX idx_questions_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_questions_topic IS 'UNUSED - Consider removing if still unused after monitoring';

-- Notifications table
COMMENT ON INDEX idx_notifications_user_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_notifications_read IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_notifications_created_at IS 'UNUSED - Consider removing if still unused after monitoring';

-- User Achievements table
COMMENT ON INDEX idx_user_achievements_achievement_id IS 'UNUSED - Consider removing if still unused after monitoring';

-- Daily Statistics table
COMMENT ON INDEX idx_daily_stats_date IS 'UNUSED - Consider removing if still unused after monitoring';

-- Audit Logs table
COMMENT ON INDEX idx_audit_logs_table_name IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_audit_logs_created_at IS 'UNUSED - Consider removing if still unused after monitoring';

-- User Sessions table
COMMENT ON INDEX idx_user_sessions_token IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Goals table
COMMENT ON INDEX idx_study_goals_user_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_goals_status IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_goals_deadline IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_goals_subject_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_goals_priority IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Streaks table
COMMENT ON INDEX idx_study_streaks_last_date IS 'UNUSED - Consider removing if still unused after monitoring';

-- Study Analytics table
COMMENT ON INDEX idx_study_analytics_user_id IS 'UNUSED - Consider removing if still unused after monitoring';
COMMENT ON INDEX idx_study_analytics_date IS 'UNUSED - Consider removing if still unused after monitoring';

-- Flashcards table
COMMENT ON INDEX idx_flashcards_subject IS 'UNUSED - Consider removing if still unused after monitoring';

-- ============================================
-- OPTIONAL: DROP UNUSED INDEXES
-- ============================================
-- Uncomment these lines if you want to drop unused indexes to save storage
-- Make sure your application doesn't need them first!

/*
-- Example of dropping unused indexes (uncomment if needed):
DROP INDEX IF EXISTS idx_profiles_created_at;
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_university;
DROP INDEX IF EXISTS idx_profiles_setup_completed;
-- ... continue for other unused indexes
*/

-- ============================================
-- STATISTICS UPDATE
-- ============================================
-- Update table statistics for query planner optimization
ANALYZE public.ai_tutor_messages;
ANALYZE public.flashcard_decks;
ANALYZE public.practice_questions;
ANALYZE public.study_plans;
ANALYZE public.study_sessions;
ANALYZE public.subject_statistics;
ANALYZE public.tasks;