-- Comprehensive fix for all missing columns in tasks table
-- Run this script in your Supabase SQL editor (Dashboard > SQL Editor)

-- Step 1: Add assignment_type column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignment_type text;

-- Step 2: Add points column for grade weight
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS points integer;

-- Step 3: Add attachments column for resources and links
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachments text;

-- Step 4: Add constraints
DO $$ 
BEGIN
    -- Assignment type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'assignment_type_check'
    ) THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT assignment_type_check 
        CHECK (assignment_type IN ('homework', 'project', 'lab', 'essay', 'presentation', 'research', 'other') OR assignment_type IS NULL);
    END IF;
    
    -- Points constraint (must be positive)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'points_positive'
    ) THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT points_positive 
        CHECK (points >= 0 OR points IS NULL);
    END IF;
END $$;

-- Step 5: Update existing assignments with default values
UPDATE public.tasks
SET assignment_type = 'homework'
WHERE subject_id IS NOT NULL AND assignment_type IS NULL;

-- Step 6: Add column comments for documentation
COMMENT ON COLUMN public.tasks.assignment_type IS 'Type of assignment (homework, project, lab, essay, etc.) - only for tasks with subject_id';
COMMENT ON COLUMN public.tasks.points IS 'Points or grade weight for assignments';
COMMENT ON COLUMN public.tasks.attachments IS 'Resources, links, or file references for the task/assignment';

-- Step 7: Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'tasks'
    AND column_name IN ('assignment_type', 'points', 'attachments')
ORDER BY 
    column_name;

-- This should return 3 rows showing the new columns if successful