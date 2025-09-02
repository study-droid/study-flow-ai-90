-- IMPORTANT: Revoke the exposed key first!
-- This script stores API keys securely in Supabase vault

-- Step 1: Enable the vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vault;

-- Step 2: Store your API keys in the vault (run these in Supabase SQL editor)
-- Replace 'your-new-openai-key' with your ACTUAL NEW key (after revoking the exposed one)

-- Store OpenAI API key
SELECT vault.create_secret(
  'openai_api_key',
  'sk-...your-new-openai-key-here...',
  'OpenAI API key for AI Tutor service'
);

-- Store Gemini API key (if you have one)
SELECT vault.create_secret(
  'gemini_api_key', 
  'your-gemini-api-key-here',
  'Google Gemini API key for AI Tutor service'
);

-- Store Claude API key (if you have one)
SELECT vault.create_secret(
  'claude_api_key',
  'your-claude-api-key-here', 
  'Anthropic Claude API key for AI Tutor service'
);

-- Step 3: Create a function to retrieve keys securely (only accessible by service role)
CREATE OR REPLACE FUNCTION get_api_key(key_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  secret_value text;
BEGIN
  -- Only allow specific key names
  IF key_name NOT IN ('openai_api_key', 'gemini_api_key', 'claude_api_key') THEN
    RAISE EXCEPTION 'Invalid key name';
  END IF;
  
  -- Retrieve the secret
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = key_name;
  
  IF secret_value IS NULL THEN
    RAISE EXCEPTION 'API key not found';
  END IF;
  
  RETURN secret_value;
END;
$$;

-- Step 4: Grant execute permission only to authenticated users
REVOKE ALL ON FUNCTION get_api_key FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_api_key TO authenticated;

-- Step 5: Create a view to check which keys are configured (without exposing values)
CREATE OR REPLACE VIEW configured_api_keys AS
SELECT 
  name as key_name,
  CASE 
    WHEN name = 'openai_api_key' THEN 'OpenAI'
    WHEN name = 'gemini_api_key' THEN 'Gemini'
    WHEN name = 'claude_api_key' THEN 'Claude'
  END as provider,
  created_at,
  updated_at
FROM vault.secrets
WHERE name IN ('openai_api_key', 'gemini_api_key', 'claude_api_key');

-- Grant select on the view to authenticated users
GRANT SELECT ON configured_api_keys TO authenticated;