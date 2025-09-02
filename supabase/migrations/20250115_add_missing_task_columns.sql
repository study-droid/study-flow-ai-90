-- Add missing columns to tasks table for assignment functionality

-- Add points column (for grade weight/points)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS points integer;

-- Add attachments column (for resources and links)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachments text;

-- Add constraints
ALTER TABLE public.tasks
ADD CONSTRAINT points_positive CHECK (points >= 0 OR points IS NULL);

-- Add comments for clarity
COMMENT ON COLUMN public.tasks.points IS 'Points or grade weight for assignments';
COMMENT ON COLUMN public.tasks.attachments IS 'Resources, links, or file references for the task/assignment';