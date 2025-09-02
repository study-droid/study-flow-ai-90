-- Fix for assignment_type column missing error
-- Run this script in your Supabase SQL editor (Dashboard > SQL Editor)

-- Step 1: Add assignment_type column to tasks table if it doesn't exist
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignment_type text;

-- Step 2: Add check constraint for valid assignment types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'assignment_type_check'
    ) THEN
        ALTER TABLE public.tasks
        ADD CONSTRAINT assignment_type_check 
        CHECK (assignment_type IN ('homework', 'project', 'lab', 'essay', 'presentation', 'research', 'other') OR assignment_type IS NULL);
    END IF;
END $$;

-- Step 3: Update existing tasks that have subject_id to have a default assignment_type
UPDATE public.tasks
SET assignment_type = 'homework'
WHERE subject_id IS NOT NULL AND assignment_type IS NULL;

-- Step 4: Add comment for clarity
COMMENT ON COLUMN public.tasks.assignment_type IS 'Type of assignment (homework, project, lab, essay, etc.) - only for tasks with subject_id';

-- Step 5: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'tasks'
    AND column_name = 'assignment_type';

-- This should return the assignment_type column details if successful