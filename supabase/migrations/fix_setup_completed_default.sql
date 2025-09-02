-- Fix setup_completed column to allow null for new users
-- This ensures new users see onboarding instead of being treated as having skipped it

-- Remove the default constraint on setup_completed column
ALTER TABLE public.profiles 
ALTER COLUMN setup_completed DROP DEFAULT;