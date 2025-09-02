-- Configure Gemini as Default AI Provider for StudyFlow
-- This migration sets up Gemini as the primary AI tutor

-- Create or update the AI configuration table
CREATE TABLE IF NOT EXISTS public.ai_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Gemini as default provider configuration
INSERT INTO public.ai_config (key, value)
VALUES 
    ('default_provider', '"gemini"'::jsonb),
    ('gemini_config', '{
        "model": "gemini-1.5-flash",
        "temperature": 0.7,
        "max_tokens": 2000,
        "streaming": true,
        "tools_enabled": true
    }'::jsonb),
    ('provider_priority', '["gemini", "openai", "claude"]'::jsonb)
ON CONFLICT (key) 
DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Update existing AI tutor sessions to use Gemini if they don't have a provider
UPDATE public.ai_tutor_sessions 
SET ai_provider = 'gemini'
WHERE ai_provider IS NULL OR ai_provider = '';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_provider 
ON public.ai_tutor_sessions(ai_provider);

-- Add Gemini-specific columns if they don't exist
ALTER TABLE public.ai_tutor_sessions 
ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'gemini-1.5-flash',
ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}'::jsonb;

-- Create a function to get the default AI provider
CREATE OR REPLACE FUNCTION get_default_ai_provider()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT value->>'provider' FROM public.ai_config WHERE key = 'default_provider'),
        'gemini'
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get provider configuration
CREATE OR REPLACE FUNCTION get_ai_provider_config(provider_name TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE(
        (SELECT value FROM public.ai_config WHERE key = provider_name || '_config'),
        CASE 
            WHEN provider_name = 'gemini' THEN '{
                "model": "gemini-1.5-flash",
                "temperature": 0.7,
                "max_tokens": 2000
            }'::jsonb
            WHEN provider_name = 'openai' THEN '{
                "model": "gpt-3.5-turbo",
                "temperature": 0.7,
                "max_tokens": 2000
            }'::jsonb
            ELSE '{}'::jsonb
        END
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON public.ai_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_default_ai_provider() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_provider_config(TEXT) TO authenticated;

-- Add RLS policies for ai_config table
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read AI configuration
CREATE POLICY "Allow authenticated users to read AI config" ON public.ai_config
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow service role to modify AI configuration
CREATE POLICY "Only service role can modify AI config" ON public.ai_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Log the configuration change
INSERT INTO public.system_logs (action, details, created_at)
VALUES (
    'ai_provider_configured',
    jsonb_build_object(
        'provider', 'gemini',
        'model', 'gemini-1.5-flash',
        'configured_at', NOW()
    ),
    NOW()
) ON CONFLICT DO NOTHING;

-- Create a view for easy access to current AI configuration
CREATE OR REPLACE VIEW public.current_ai_config AS
SELECT 
    (SELECT value->>'provider' FROM ai_config WHERE key = 'default_provider') as default_provider,
    (SELECT value FROM ai_config WHERE key = 'gemini_config') as gemini_config,
    (SELECT value FROM ai_config WHERE key = 'openai_config') as openai_config,
    (SELECT value FROM ai_config WHERE key = 'claude_config') as claude_config,
    (SELECT value FROM ai_config WHERE key = 'provider_priority') as provider_priority;

-- Grant read access to the view
GRANT SELECT ON public.current_ai_config TO authenticated;

COMMENT ON TABLE public.ai_config IS 'AI provider configuration for StudyFlow';
COMMENT ON COLUMN public.ai_config.key IS 'Configuration key (e.g., default_provider, gemini_config)';
COMMENT ON COLUMN public.ai_config.value IS 'Configuration value in JSONB format';
COMMENT ON VIEW public.current_ai_config IS 'Current AI provider configuration view';