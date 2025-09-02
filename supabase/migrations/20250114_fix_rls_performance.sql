-- Fix RLS Performance Issues by replacing auth.uid() with (select auth.uid())
-- This prevents the function from being re-evaluated for each row

-- Drop and recreate policies for all affected tables
-- The change is to wrap auth.uid() in a subquery: (select auth.uid())

-- ============================================
-- POMODORO_SETTINGS
-- ============================================
DROP POLICY IF EXISTS "Users can view own pomodoro_settings" ON public.pomodoro_settings;
DROP POLICY IF EXISTS "Users can insert own pomodoro_settings" ON public.pomodoro_settings;
DROP POLICY IF EXISTS "Users can update own pomodoro_settings" ON public.pomodoro_settings;
DROP POLICY IF EXISTS "Users can delete own pomodoro_settings" ON public.pomodoro_settings;

CREATE POLICY "Users can view own pomodoro_settings" ON public.pomodoro_settings
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own pomodoro_settings" ON public.pomodoro_settings
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pomodoro_settings" ON public.pomodoro_settings
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own pomodoro_settings" ON public.pomodoro_settings
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PRACTICE_QUESTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own practice_questions" ON public.practice_questions;
DROP POLICY IF EXISTS "Users can insert own practice_questions" ON public.practice_questions;
DROP POLICY IF EXISTS "Users can update own practice_questions" ON public.practice_questions;
DROP POLICY IF EXISTS "Users can delete own practice_questions" ON public.practice_questions;

CREATE POLICY "Users can view own practice_questions" ON public.practice_questions
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own practice_questions" ON public.practice_questions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own practice_questions" ON public.practice_questions
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own practice_questions" ON public.practice_questions
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can view own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profiles" ON public.profiles;

CREATE POLICY "Users can view own profiles" ON public.profiles
    FOR SELECT USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profiles" ON public.profiles
    FOR INSERT WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profiles" ON public.profiles
    FOR UPDATE USING (id = (select auth.uid()));

CREATE POLICY "Users can delete own profiles" ON public.profiles
    FOR DELETE USING (id = (select auth.uid()));

-- ============================================
-- AI_TUTOR_FEEDBACK
-- ============================================
DROP POLICY IF EXISTS "Users can view own ai_tutor_feedback" ON public.ai_tutor_feedback;
DROP POLICY IF EXISTS "Users can insert own ai_tutor_feedback" ON public.ai_tutor_feedback;
DROP POLICY IF EXISTS "Users can update own ai_tutor_feedback" ON public.ai_tutor_feedback;
DROP POLICY IF EXISTS "Users can delete own ai_tutor_feedback" ON public.ai_tutor_feedback;

CREATE POLICY "Users can view own ai_tutor_feedback" ON public.ai_tutor_feedback
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own ai_tutor_feedback" ON public.ai_tutor_feedback
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own ai_tutor_feedback" ON public.ai_tutor_feedback
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own ai_tutor_feedback" ON public.ai_tutor_feedback
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- AI_TUTOR_MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Users can view own ai_tutor_messages" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can insert own ai_tutor_messages" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can update own ai_tutor_messages" ON public.ai_tutor_messages;
DROP POLICY IF EXISTS "Users can delete own ai_tutor_messages" ON public.ai_tutor_messages;

CREATE POLICY "Users can view own ai_tutor_messages" ON public.ai_tutor_messages
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own ai_tutor_messages" ON public.ai_tutor_messages
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own ai_tutor_messages" ON public.ai_tutor_messages
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own ai_tutor_messages" ON public.ai_tutor_messages
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- AI_TUTOR_SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own ai_tutor_sessions" ON public.ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can insert own ai_tutor_sessions" ON public.ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can update own ai_tutor_sessions" ON public.ai_tutor_sessions;
DROP POLICY IF EXISTS "Users can delete own ai_tutor_sessions" ON public.ai_tutor_sessions;

CREATE POLICY "Users can view own ai_tutor_sessions" ON public.ai_tutor_sessions
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own ai_tutor_sessions" ON public.ai_tutor_sessions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own ai_tutor_sessions" ON public.ai_tutor_sessions
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own ai_tutor_sessions" ON public.ai_tutor_sessions
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- AUDIT_LOGS
-- ============================================
DROP POLICY IF EXISTS "Users can view own audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can update own audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can delete own audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role only" ON public.audit_logs;

CREATE POLICY "Users can view own audit_logs" ON public.audit_logs
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own audit_logs" ON public.audit_logs
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own audit_logs" ON public.audit_logs
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- DAILY_STATISTICS
-- ============================================
DROP POLICY IF EXISTS "Users can view own daily_statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Users can insert own daily_statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Users can update own daily_statistics" ON public.daily_statistics;
DROP POLICY IF EXISTS "Users can delete own daily_statistics" ON public.daily_statistics;

CREATE POLICY "Users can view own daily_statistics" ON public.daily_statistics
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own daily_statistics" ON public.daily_statistics
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own daily_statistics" ON public.daily_statistics
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own daily_statistics" ON public.daily_statistics
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- FLASHCARD_DECKS
-- ============================================
DROP POLICY IF EXISTS "Users can view own flashcard_decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can insert own flashcard_decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can update own flashcard_decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can delete own flashcard_decks" ON public.flashcard_decks;

CREATE POLICY "Users can view own flashcard_decks" ON public.flashcard_decks
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own flashcard_decks" ON public.flashcard_decks
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own flashcard_decks" ON public.flashcard_decks
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own flashcard_decks" ON public.flashcard_decks
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- FLASHCARDS
-- ============================================
DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can update own flashcards" ON public.flashcards;
DROP POLICY IF EXISTS "Users can delete own flashcards" ON public.flashcards;

CREATE POLICY "Users can view own flashcards" ON public.flashcards
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own flashcards" ON public.flashcards
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own flashcards" ON public.flashcards
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own flashcards" ON public.flashcards
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- GOALS
-- ============================================
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- NOTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- RATE_LIMITS
-- ============================================
DROP POLICY IF EXISTS "Users can view own rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can update own rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can delete own rate_limits" ON public.rate_limits;

CREATE POLICY "Users can view own rate_limits" ON public.rate_limits
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own rate_limits" ON public.rate_limits
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own rate_limits" ON public.rate_limits
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own rate_limits" ON public.rate_limits
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_ANALYTICS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_analytics" ON public.study_analytics;
DROP POLICY IF EXISTS "Users can insert own study_analytics" ON public.study_analytics;
DROP POLICY IF EXISTS "Users can update own study_analytics" ON public.study_analytics;
DROP POLICY IF EXISTS "Users can delete own study_analytics" ON public.study_analytics;

CREATE POLICY "Users can view own study_analytics" ON public.study_analytics
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_analytics" ON public.study_analytics
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_analytics" ON public.study_analytics
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_analytics" ON public.study_analytics
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_GOALS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_goals" ON public.study_goals;
DROP POLICY IF EXISTS "Users can insert own study_goals" ON public.study_goals;
DROP POLICY IF EXISTS "Users can update own study_goals" ON public.study_goals;
DROP POLICY IF EXISTS "Users can delete own study_goals" ON public.study_goals;

CREATE POLICY "Users can view own study_goals" ON public.study_goals
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_goals" ON public.study_goals
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_goals" ON public.study_goals
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_goals" ON public.study_goals
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_MATERIALS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can insert own study_materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can update own study_materials" ON public.study_materials;
DROP POLICY IF EXISTS "Users can delete own study_materials" ON public.study_materials;

CREATE POLICY "Users can view own study_materials" ON public.study_materials
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_materials" ON public.study_materials
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_materials" ON public.study_materials
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_materials" ON public.study_materials
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_PLANS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can insert own study_plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can update own study_plans" ON public.study_plans;
DROP POLICY IF EXISTS "Users can delete own study_plans" ON public.study_plans;

CREATE POLICY "Users can view own study_plans" ON public.study_plans
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_plans" ON public.study_plans
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_plans" ON public.study_plans
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_plans" ON public.study_plans
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert own study_sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update own study_sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can delete own study_sessions" ON public.study_sessions;

CREATE POLICY "Users can view own study_sessions" ON public.study_sessions
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_sessions" ON public.study_sessions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_sessions" ON public.study_sessions
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_sessions" ON public.study_sessions
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- STUDY_STREAKS
-- ============================================
DROP POLICY IF EXISTS "Users can view own study_streaks" ON public.study_streaks;
DROP POLICY IF EXISTS "Users can insert own study_streaks" ON public.study_streaks;
DROP POLICY IF EXISTS "Users can update own study_streaks" ON public.study_streaks;
DROP POLICY IF EXISTS "Users can delete own study_streaks" ON public.study_streaks;

CREATE POLICY "Users can view own study_streaks" ON public.study_streaks
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own study_streaks" ON public.study_streaks
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own study_streaks" ON public.study_streaks
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own study_streaks" ON public.study_streaks
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- SUBJECT_ASSIGNMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own subject_assignments" ON public.subject_assignments;
DROP POLICY IF EXISTS "Users can insert own subject_assignments" ON public.subject_assignments;
DROP POLICY IF EXISTS "Users can update own subject_assignments" ON public.subject_assignments;
DROP POLICY IF EXISTS "Users can delete own subject_assignments" ON public.subject_assignments;

CREATE POLICY "Users can view own subject_assignments" ON public.subject_assignments
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own subject_assignments" ON public.subject_assignments
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subject_assignments" ON public.subject_assignments
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own subject_assignments" ON public.subject_assignments
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- SUBJECT_STATISTICS
-- ============================================
DROP POLICY IF EXISTS "Users can view own subject_statistics" ON public.subject_statistics;
DROP POLICY IF EXISTS "Users can insert own subject_statistics" ON public.subject_statistics;
DROP POLICY IF EXISTS "Users can update own subject_statistics" ON public.subject_statistics;
DROP POLICY IF EXISTS "Users can delete own subject_statistics" ON public.subject_statistics;

CREATE POLICY "Users can view own subject_statistics" ON public.subject_statistics
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own subject_statistics" ON public.subject_statistics
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subject_statistics" ON public.subject_statistics
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own subject_statistics" ON public.subject_statistics
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- SUBJECTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON public.subjects;

CREATE POLICY "Users can view own subjects" ON public.subjects
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own subjects" ON public.subjects
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subjects" ON public.subjects
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own subjects" ON public.subjects
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- TASKS
-- ============================================
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks" ON public.tasks
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tasks" ON public.tasks
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tasks" ON public.tasks
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tasks" ON public.tasks
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- TIMETABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Users can insert own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Users can update own timetable" ON public.timetable;
DROP POLICY IF EXISTS "Users can delete own timetable" ON public.timetable;

CREATE POLICY "Users can view own timetable" ON public.timetable
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own timetable" ON public.timetable
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own timetable" ON public.timetable
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own timetable" ON public.timetable
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- USER_ACHIEVEMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view own user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can delete own user_achievements" ON public.user_achievements;

CREATE POLICY "Users can view own user_achievements" ON public.user_achievements
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own user_achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own user_achievements" ON public.user_achievements
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own user_achievements" ON public.user_achievements
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- USER_SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view own user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete own user_sessions" ON public.user_sessions;

CREATE POLICY "Users can view own user_sessions" ON public.user_sessions
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own user_sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own user_sessions" ON public.user_sessions
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own user_sessions" ON public.user_sessions
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- USER_SETTINGS
-- ============================================
DROP POLICY IF EXISTS "Users can view own user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own user_settings" ON public.user_settings;

CREATE POLICY "Users can view own user_settings" ON public.user_settings
    FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own user_settings" ON public.user_settings
    FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own user_settings" ON public.user_settings
    FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own user_settings" ON public.user_settings
    FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- FIX ACHIEVEMENTS TABLE (multiple permissive policies)
-- ============================================
DROP POLICY IF EXISTS "No direct modifications" ON public.achievements;
DROP POLICY IF EXISTS "Users can view achievements" ON public.achievements;

-- Single consolidated policy for achievements
CREATE POLICY "Users can view achievements" ON public.achievements
    FOR SELECT USING (true); -- All users can view achievements (they're global)