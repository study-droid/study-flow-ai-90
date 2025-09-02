// Secure configuration loader for scripts
// Uses environment variables instead of hardcoded values

require('dotenv').config();

const getSupabaseConfig = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set in environment variables');
  }

  if (!serviceKey && !anonKey) {
    throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set');
  }

  return {
    url,
    serviceKey,
    anonKey
  };
};

module.exports = {
  getSupabaseConfig
};