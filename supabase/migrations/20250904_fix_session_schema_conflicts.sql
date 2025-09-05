-- Fix AI Tutor Sessions Schema Conflicts
-- This migration resolves the mismatch between last_active and updated_at columns
-- Root cause: Previous migrations may have replaced last_active with updated_at

BEGIN;

-- ===================================
-- 1. ENSURE BOTH COLUMNS EXIST
-- ===================================

-- Add last_active column if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_sessions' 
    AND column_name = 'last_active'
  ) THEN
    ALTER TABLE public.ai_tutor_sessions 
    ADD COLUMN last_active TIMESTAMPTZ DEFAULT NOW();
    
    -- Initialize last_active from updated_at if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'ai_tutor_sessions' 
      AND column_name = 'updated_at'
    ) THEN
      UPDATE public.ai_tutor_sessions 
      SET last_active = COALESCE(updated_at, created_at, NOW());
    ELSE
      UPDATE public.ai_tutor_sessions 
      SET last_active = COALESCE(created_at, NOW());
    END IF;
    
    RAISE NOTICE '✅ Added last_active column to ai_tutor_sessions';
  ELSE
    RAISE NOTICE '✅ last_active column already exists';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist (for enhanced tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_sessions' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.ai_tutor_sessions 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Initialize updated_at from last_active
    UPDATE public.ai_tutor_sessions 
    SET updated_at = COALESCE(last_active, created_at, NOW());
    
    RAISE NOTICE '✅ Added updated_at column to ai_tutor_sessions';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists';
  END IF;
END $$;

-- ===================================
-- 2. CREATE SYNC FUNCTION
-- ===================================

-- Function to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_session_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- When last_active is updated, also update updated_at
  IF NEW.last_active IS DISTINCT FROM OLD.last_active THEN
    NEW.updated_at = NEW.last_active;
  END IF;
  
  -- When updated_at is updated, also update last_active
  IF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    NEW.last_active = NEW.updated_at;
  END IF;
  
  -- If neither was explicitly set, update both to NOW
  IF NEW.updated_at = OLD.updated_at AND NEW.last_active = OLD.last_active THEN
    NEW.updated_at = NOW();
    NEW.last_active = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 3. CREATE TRIGGER FOR SYNC
-- ===================================

-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS sync_session_timestamps_trigger ON public.ai_tutor_sessions;
DROP TRIGGER IF EXISTS update_ai_tutor_sessions_updated_at ON public.ai_tutor_sessions;

-- Create new sync trigger
CREATE TRIGGER sync_session_timestamps_trigger
  BEFORE UPDATE ON public.ai_tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION sync_session_timestamps();

-- ===================================
-- 4. UPDATE EXISTING RECORDS
-- ===================================

-- Ensure all existing records have both timestamps populated
UPDATE public.ai_tutor_sessions 
SET 
  last_active = COALESCE(last_active, updated_at, created_at, NOW()),
  updated_at = COALESCE(updated_at, last_active, created_at, NOW())
WHERE last_active IS NULL OR updated_at IS NULL;

-- ===================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ===================================

-- Index for last_active (used by application queries)
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_last_active 
ON public.ai_tutor_sessions(last_active DESC);

-- Index for updated_at (used by newer queries)
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_updated_at 
ON public.ai_tutor_sessions(updated_at DESC);

-- ===================================
-- 6. VERIFICATION
-- ===================================

DO $$
BEGIN
  -- Verify both columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_sessions' 
    AND column_name = 'last_active'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_tutor_sessions' 
    AND column_name = 'updated_at'
  ) THEN
    RAISE NOTICE '✅ Schema fix completed successfully: Both last_active and updated_at columns exist';
  ELSE
    RAISE EXCEPTION '❌ Schema fix failed: Missing required columns';
  END IF;
  
  -- Check for any NULL timestamps
  IF EXISTS (
    SELECT 1 FROM public.ai_tutor_sessions 
    WHERE last_active IS NULL OR updated_at IS NULL
  ) THEN
    RAISE WARNING '⚠️  Some sessions have NULL timestamps - data migration may need review';
  ELSE
    RAISE NOTICE '✅ All sessions have valid timestamps';
  END IF;
END $$;

COMMIT;

-- ===================================
-- 7. DOCUMENTATION
-- ===================================

COMMENT ON COLUMN public.ai_tutor_sessions.last_active IS 'Last activity timestamp (legacy compatibility)';
COMMENT ON COLUMN public.ai_tutor_sessions.updated_at IS 'Last update timestamp (enhanced tracking)';
COMMENT ON FUNCTION sync_session_timestamps() IS 'Keeps last_active and updated_at columns synchronized';