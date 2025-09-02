-- Fix flashcards table schema and refresh PostgREST cache
-- This migration ensures the flashcards table has all required columns

-- Create flashcards table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    subject TEXT,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    next_review TIMESTAMPTZ DEFAULT NOW(),
    next_review_date TIMESTAMPTZ DEFAULT NOW(),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,
    easiness_factor FLOAT DEFAULT 2.5 CHECK (easiness_factor >= 1.3),
    interval_days INTEGER DEFAULT 1 CHECK (interval_days >= 1),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'back_text') THEN
        ALTER TABLE public.flashcards ADD COLUMN back_text TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'front_text') THEN
        ALTER TABLE public.flashcards ADD COLUMN front_text TEXT NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'next_review_date') THEN
        ALTER TABLE public.flashcards ADD COLUMN next_review_date TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'correct_count') THEN
        ALTER TABLE public.flashcards ADD COLUMN correct_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'current_streak') THEN
        ALTER TABLE public.flashcards ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'subject') THEN
        ALTER TABLE public.flashcards ADD COLUMN subject TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'difficulty') THEN
        ALTER TABLE public.flashcards ADD COLUMN difficulty TEXT DEFAULT 'medium';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'review_count') THEN
        ALTER TABLE public.flashcards ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'correct_streak') THEN
        ALTER TABLE public.flashcards ADD COLUMN correct_streak INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'easiness_factor') THEN
        ALTER TABLE public.flashcards ADD COLUMN easiness_factor FLOAT DEFAULT 2.5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'interval_days') THEN
        ALTER TABLE public.flashcards ADD COLUMN interval_days INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'tags') THEN
        ALTER TABLE public.flashcards ADD COLUMN tags TEXT[];
    END IF;
    
    -- Fix data consistency issues
    UPDATE public.flashcards 
    SET front_text = '' 
    WHERE front_text IS NULL;
    
    UPDATE public.flashcards 
    SET back_text = '' 
    WHERE back_text IS NULL;
    
    UPDATE public.flashcards 
    SET next_review_date = next_review 
    WHERE next_review_date IS NULL AND next_review IS NOT NULL;
    
    -- Remove duplicate next_review column if both exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'next_review') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'next_review_date') THEN
        UPDATE public.flashcards 
        SET next_review_date = COALESCE(next_review_date, next_review);
        ALTER TABLE public.flashcards DROP COLUMN IF EXISTS next_review;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;
CREATE POLICY "Users can view their own flashcards" ON public.flashcards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.flashcards;
CREATE POLICY "Users can insert their own flashcards" ON public.flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
CREATE POLICY "Users can update their own flashcards" ON public.flashcards
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete their own flashcards" ON public.flashcards
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_flashcards_updated_at ON public.flashcards;
CREATE TRIGGER trigger_flashcards_updated_at
    BEFORE UPDATE ON public.flashcards
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Create indexes for performance (only if columns exist)
DO $$
BEGIN
    -- Always create user_id index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_user_id') THEN
        CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
    END IF;
    
    -- Create next_review_date index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_next_review_date') THEN
        CREATE INDEX idx_flashcards_next_review_date ON public.flashcards(next_review_date);
    END IF;
    
    -- Create subject index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'subject') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_subject') THEN
            CREATE INDEX idx_flashcards_subject ON public.flashcards(subject);
        END IF;
    END IF;
    
    -- Create tags index if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'tags') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_flashcards_tags') THEN
            CREATE INDEX idx_flashcards_tags ON public.flashcards USING GIN(tags);
        END IF;
    END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';