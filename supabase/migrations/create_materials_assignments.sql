-- Create materials table for subject resources
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('document', 'video', 'link', 'note', 'other')),
    url TEXT,
    content TEXT,
    file_path TEXT,
    file_size BIGINT,
    mime_type TEXT,
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    points DECIMAL(10, 2),
    grade DECIMAL(5, 2),
    submission_url TEXT,
    submission_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    reminder_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create study hours tracking table
CREATE TABLE IF NOT EXISTS public.study_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(5, 2) NOT NULL CHECK (hours >= 0),
    minutes INTEGER NOT NULL CHECK (minutes >= 0),
    session_count INTEGER DEFAULT 1,
    focus_score DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(subject_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_materials_subject_id ON public.materials(subject_id);
CREATE INDEX idx_materials_user_id ON public.materials(user_id);
CREATE INDEX idx_materials_type ON public.materials(type);
CREATE INDEX idx_materials_created_at ON public.materials(created_at DESC);

CREATE INDEX idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX idx_assignments_status ON public.assignments(status);
CREATE INDEX idx_assignments_priority ON public.assignments(priority);

CREATE INDEX idx_study_hours_subject_id ON public.study_hours(subject_id);
CREATE INDEX idx_study_hours_user_id ON public.study_hours(user_id);
CREATE INDEX idx_study_hours_date ON public.study_hours(date DESC);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_hours ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for materials
CREATE POLICY "Users can view their own materials" ON public.materials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own materials" ON public.materials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own materials" ON public.materials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own materials" ON public.materials
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for assignments
CREATE POLICY "Users can view their own assignments" ON public.assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assignments" ON public.assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" ON public.assignments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" ON public.assignments
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for study hours
CREATE POLICY "Users can view their own study hours" ON public.study_hours
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study hours" ON public.study_hours
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study hours" ON public.study_hours
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study hours" ON public.study_hours
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update study hours automatically
CREATE OR REPLACE FUNCTION update_study_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = TIMEZONE('utc', NOW());
    
    -- Calculate total minutes from hours
    IF NEW.hours IS NOT NULL THEN
        NEW.minutes = FLOOR(NEW.hours * 60);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON public.materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_hours_trigger
    BEFORE INSERT OR UPDATE ON public.study_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_study_hours();

-- Create function to check and update assignment status
CREATE OR REPLACE FUNCTION check_assignment_status()
RETURNS void AS $$
BEGIN
    -- Update overdue assignments
    UPDATE public.assignments
    SET status = 'overdue'
    WHERE status IN ('pending', 'in_progress')
      AND due_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to check assignment status (requires pg_cron extension)
-- This would run daily at midnight
-- SELECT cron.schedule('check-assignments', '0 0 * * *', 'SELECT check_assignment_status();');