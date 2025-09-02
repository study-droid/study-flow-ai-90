const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uuebhjidsaswvuexdcbb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_profiles_user_id.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('Running migration to fix profiles.user_id column...');
console.log('Migration file:', migrationPath);

// Since we can't run raw SQL directly through the JS client,
// we'll provide instructions for the user
console.log('\n' + '='.repeat(80));
console.log('IMPORTANT: Manual Database Update Required');
console.log('='.repeat(80));
console.log('\nThe Supabase JavaScript client cannot execute raw SQL migrations directly.');
console.log('Please follow these steps:\n');
console.log('1. Go to your Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/sql/new\n');
console.log('2. Copy and paste the following SQL:\n');
console.log('-'.repeat(80));
console.log(migrationSQL);
console.log('-'.repeat(80));
console.log('\n3. Click "Run" to execute the migration\n');
console.log('4. Clear your browser\'s local storage:');
console.log('   - Open DevTools (F12)');
console.log('   - Go to Application tab');
console.log('   - Find Local Storage → http://localhost:8082');
console.log('   - Right-click and Clear\n');
console.log('5. Refresh your application\n');
console.log('The migration will add the user_id column to the profiles table');
console.log('and fix the authentication issues you\'re experiencing.');
console.log('='.repeat(80));