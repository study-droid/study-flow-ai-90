-- Create API Vault tables for secure key storage
-- This stores encrypted API keys with metadata

-- Create vault metadata table
CREATE TABLE IF NOT EXISTS public.vault_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL,
    salt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(type)
);

-- Create API vault table
CREATE TABLE IF NOT EXISTS public.api_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT NOT NULL UNIQUE,
    encrypted_value TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_accessed TIMESTAMP WITH TIME ZONE,
    rotation_date TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create vault logs table for audit trail
CREATE TABLE IF NOT EXISTS public.vault_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    key_name TEXT,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    details JSONB DEFAULT '{}'::jsonb
);

-- Create API key usage tracking
CREATE TABLE IF NOT EXISTS public.api_key_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    key_index INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create API key logs (for monitoring without exposing keys)
CREATE TABLE IF NOT EXISTS public.api_key_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    key_identifier TEXT NOT NULL, -- Hashed identifier, not the actual key
    used_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Create API key rotations table
CREATE TABLE IF NOT EXISTS public.api_key_rotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    rotated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    rotated_by TEXT NOT NULL,
    old_key_hash TEXT, -- Store hash of old key for audit
    reason TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_api_vault_key_name ON public.api_vault(key_name);
CREATE INDEX idx_api_vault_expires_at ON public.api_vault(expires_at);
CREATE INDEX idx_vault_logs_timestamp ON public.vault_logs(timestamp DESC);
CREATE INDEX idx_vault_logs_key_name ON public.vault_logs(key_name);
CREATE INDEX idx_api_key_usage_provider ON public.api_key_usage(provider);
CREATE INDEX idx_api_key_logs_provider ON public.api_key_logs(provider);
CREATE INDEX idx_api_key_logs_used_at ON public.api_key_logs(used_at DESC);

-- Enable Row Level Security
ALTER TABLE public.vault_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_rotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vault_metadata (admin only)
CREATE POLICY "Only service role can access vault metadata" ON public.vault_metadata
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for api_vault (admin only)
CREATE POLICY "Only service role can access api vault" ON public.api_vault
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for vault_logs (read-only for authenticated users)
CREATE POLICY "Authenticated users can view vault logs" ON public.vault_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can write vault logs" ON public.vault_logs
    FOR INSERT USING (auth.role() = 'service_role');

-- RLS Policies for api_key_usage
CREATE POLICY "Service role full access to api_key_usage" ON public.api_key_usage
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for api_key_logs
CREATE POLICY "Service role full access to api_key_logs" ON public.api_key_logs
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for api_key_rotations
CREATE POLICY "Service role full access to api_key_rotations" ON public.api_key_rotations
    FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up expired vault entries
CREATE OR REPLACE FUNCTION cleanup_expired_vault_entries()
RETURNS void AS $$
BEGIN
    -- Delete expired API keys
    DELETE FROM public.api_vault
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Log the cleanup
    INSERT INTO public.vault_logs (action, details)
    VALUES ('cleanup', jsonb_build_object('deleted_expired', true, 'timestamp', NOW()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API key access
CREATE OR REPLACE FUNCTION log_api_key_access()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.last_accessed IS NOT NULL THEN
        INSERT INTO public.vault_logs (action, key_name, timestamp)
        VALUES ('access', NEW.key_name, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for logging access
CREATE TRIGGER log_vault_access
    AFTER UPDATE ON public.api_vault
    FOR EACH ROW
    EXECUTE FUNCTION log_api_key_access();

-- Schedule periodic cleanup (requires pg_cron extension)
-- This would run daily at 2 AM
-- SELECT cron.schedule('cleanup-expired-keys', '0 2 * * *', 'SELECT cleanup_expired_vault_entries();');

-- Initial setup message
DO $$
BEGIN
    RAISE NOTICE 'API Vault tables created successfully. Remember to:';
    RAISE NOTICE '1. Set up the master encryption key securely';
    RAISE NOTICE '2. Enable pg_cron for scheduled cleanup if available';
    RAISE NOTICE '3. Configure proper access controls in your application';
    RAISE NOTICE '4. Implement key rotation policies';
END $$;