-- Add dashboard_layout column to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN dashboard_layout JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN public.user_settings.dashboard_layout IS 'Stores user''s customized dashboard widget layout and preferences';