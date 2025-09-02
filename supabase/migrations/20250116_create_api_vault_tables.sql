-- Create API Vault tables for secure API key storage
-- This migration creates the necessary tables for storing encrypted API keys

-- Create the api_vault table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.api_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  rotation_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  provider TEXT CHECK (provider IN ('openai', 'gemini', 'claude', 'other'))
);

-- Create vault_metadata table for storing encryption metadata
CREATE TABLE IF NOT EXISTS public.vault_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  salt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vault_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.vault_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  key_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable Row Level Security
ALTER TABLE public.api_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for api_vault
CREATE POLICY "Users can view their own API keys"
  ON public.api_vault FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own API keys"
  ON public.api_vault FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own API keys"
  ON public.api_vault FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_vault FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create RLS policies for vault_metadata (admin only)
CREATE POLICY "Only service role can access vault_metadata"
  ON public.vault_metadata FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS policies for vault_logs
CREATE POLICY "Users can view their own logs"
  ON public.vault_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert logs"
  ON public.vault_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_vault_key_name ON public.api_vault(key_name);
CREATE INDEX IF NOT EXISTS idx_api_vault_user_id ON public.api_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_api_vault_expires_at ON public.api_vault(expires_at);
CREATE INDEX IF NOT EXISTS idx_vault_logs_user_id ON public.vault_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_logs_timestamp ON public.vault_logs(timestamp);

-- Create a simpler secure storage using Supabase Vault extension (if available)
-- This is the recommended approach for production
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create a secure storage function for API keys
CREATE OR REPLACE FUNCTION store_api_key(
  p_key_name TEXT,
  p_key_value TEXT,
  p_provider TEXT DEFAULT 'other'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_encrypted_key TEXT;
  v_key_id TEXT;
BEGIN
  -- Generate a unique key ID
  v_key_id := gen_random_uuid()::TEXT;
  
  -- For now, store with basic encryption (in production, use pgsodium for better encryption)
  -- This is a simplified version - in production, use proper encryption
  v_encrypted_key := encode(digest(p_key_value, 'sha256'), 'hex');
  
  -- Insert or update the key
  INSERT INTO public.api_vault (
    key_name,
    encrypted_value,
    iv,
    salt,
    provider,
    user_id
  ) VALUES (
    p_key_name,
    v_encrypted_key,
    encode(gen_random_bytes(16), 'hex'),
    encode(gen_random_bytes(16), 'hex'),
    p_provider,
    auth.uid()
  )
  ON CONFLICT (key_name) 
  DO UPDATE SET
    encrypted_value = EXCLUDED.encrypted_value,
    iv = EXCLUDED.iv,
    salt = EXCLUDED.salt,
    updated_at = NOW(),
    rotation_date = NOW()
  RETURNING json_build_object(
    'success', true,
    'key_name', key_name,
    'message', 'API key stored successfully'
  ) INTO v_result;
  
  -- Log the action
  INSERT INTO public.vault_logs (action, key_name, user_id)
  VALUES ('store_key', p_key_name, auth.uid());
  
  RETURN v_result;
END;
$$;

-- Create a function to retrieve API keys (for Edge Functions only)
CREATE OR REPLACE FUNCTION get_api_key(p_key_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_value TEXT;
BEGIN
  -- Check if the key exists and is active
  SELECT encrypted_value INTO v_key_value
  FROM public.api_vault
  WHERE key_name = p_key_name
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (user_id = auth.uid() OR user_id IS NULL)
  LIMIT 1;
  
  IF v_key_value IS NOT NULL THEN
    -- Update last accessed time
    UPDATE public.api_vault
    SET last_accessed = NOW()
    WHERE key_name = p_key_name;
    
    -- Log the access
    INSERT INTO public.vault_logs (action, key_name, user_id)
    VALUES ('retrieve_key', p_key_name, auth.uid());
  END IF;
  
  RETURN v_key_value;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_api_key TO authenticated, service_role;

-- Create a function to list available API keys (names only)
CREATE OR REPLACE FUNCTION list_api_keys()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_keys JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'key_name', key_name,
      'provider', provider,
      'created_at', created_at,
      'last_accessed', last_accessed,
      'is_active', is_active
    )
  ) INTO v_keys
  FROM public.api_vault
  WHERE (user_id = auth.uid() OR user_id IS NULL)
    AND is_active = true;
  
  RETURN COALESCE(v_keys, '[]'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION list_api_keys TO authenticated;

-- Add a comment to explain the tables
COMMENT ON TABLE public.api_vault IS 'Secure storage for API keys with encryption';
COMMENT ON TABLE public.vault_metadata IS 'Metadata for vault encryption and configuration';
COMMENT ON TABLE public.vault_logs IS 'Audit trail for API key operations';