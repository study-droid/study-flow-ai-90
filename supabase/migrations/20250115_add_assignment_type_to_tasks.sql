-- Add assignment_type column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assignment_type text;

-- Add check constraint for valid assignment types
ALTER TABLE public.tasks
ADD CONSTRAINT assignment_type_check 
CHECK (assignment_type IN ('homework', 'project', 'lab', 'essay', 'presentation', 'research', 'other') OR assignment_type IS NULL);

-- Update existing tasks that have subject_id to have a default assignment_type
UPDATE public.tasks
SET assignment_type = 'homework'
WHERE subject_id IS NOT NULL AND assignment_type IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.tasks.assignment_type IS 'Type of assignment (homework, project, lab, etc.) - only for tasks with subject_id';