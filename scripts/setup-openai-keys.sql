-- Setup OpenAI API Keys in Supabase Secrets
-- Run this in Supabase Dashboard > Settings > Secrets

-- ⚠️ IMPORTANT: Replace the placeholder values with your actual API keys
-- ⚠️ NEVER commit this file with real API keys to Git!

-- Step 1: Go to Supabase Dashboard > Settings > Secrets
-- Step 2: Add these secrets with your actual API keys:

/*
Secret Name: OPEN_AI_KEY
Value: [Your primary OpenAI API key]
Description: Primary OpenAI API key for AI Tutor

Secret Name: OPEN_AI_KEY_QWEN  
Value: [Your fallback OpenAI API key]
Description: Fallback OpenAI API key if primary fails
*/

-- Alternative: Store in vault table (if you prefer database storage)
-- Run this after adding your keys to the store_api_key function:

-- Store primary OpenAI key
SELECT store_api_key(
  'openai_api_key',
  'YOUR_PRIMARY_OPENAI_KEY_HERE', -- Replace with actual key
  'openai'
);

-- Store fallback OpenAI key  
SELECT store_api_key(
  'open_ai_key_qwen',
  'YOUR_FALLBACK_OPENAI_KEY_HERE', -- Replace with actual key
  'openai'
);

-- Verify keys are stored (won't show actual values)
SELECT 
  key_name,
  provider,
  created_at,
  is_active
FROM api_vault
WHERE provider = 'openai'
ORDER BY created_at DESC;

-- Test the retrieval function
SELECT get_api_key('openai_api_key'); -- Should return encrypted value
SELECT get_api_key('open_ai_key_qwen'); -- Should return encrypted value