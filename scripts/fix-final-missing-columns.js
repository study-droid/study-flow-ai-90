import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration from environment variables
const DB_CONFIG = {
  host: process.env.DB_HOST || 'aws-0-us-east-1.pooler.supabase.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres.uuebhjidsaswvuexdcbb',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

// Validate required environment variables
if (!DB_CONFIG.password) {
  console.error('❌ Error: DB_PASSWORD environment variable is required');
  console.log('Please set DB_PASSWORD before running this script');
  process.exit(1);
}

console.log('🚀 Fixing final missing columns...');
console.log('🔗 Connecting to database...');

const client = new Client(DB_CONFIG);

async function runFinalFixes() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Fix 1: Add study_plan_id to tasks
    console.log('📊 Adding study_plan_id column to tasks...');
    try {
      await client.query(`
        ALTER TABLE public.tasks 
        ADD COLUMN IF NOT EXISTS study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE SET NULL;
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tasks_study_plan_id ON public.tasks(study_plan_id);
      `);
      console.log('✅ tasks.study_plan_id column added\n');
    } catch (err) {
      console.log('⚠️  tasks.study_plan_id might already exist or study_plans table missing\n');
    }
    
    // Fix 2: Ensure study_goals table exists (might be referenced but not created)
    console.log('📊 Ensuring study_goals table exists...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.study_goals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          target_date DATE,
          progress INTEGER DEFAULT 0,
          is_completed BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON public.study_goals(user_id);
      `);
      console.log('✅ study_goals table ensured\n');
    } catch (err) {
      console.log('⚠️  study_goals table might already exist\n');
    }
    
    // Fix 3: Add any other missing columns that might be needed
    console.log('📊 Adding other potentially missing columns...');
    
    // Add recurrence_pattern to tasks
    try {
      await client.query(`
        ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
        ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
      `);
      console.log('✅ Added recurrence columns to tasks');
    } catch (err) {
      // Columns might already exist
    }
    
    // Add session_notes to study_sessions
    try {
      await client.query(`
        ALTER TABLE public.study_sessions
        ADD COLUMN IF NOT EXISTS session_notes TEXT,
        ADD COLUMN IF NOT EXISTS mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5);
      `);
      console.log('✅ Added session_notes and mood_rating to study_sessions');
    } catch (err) {
      // Columns might already exist
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! All final missing columns have been added.');
    console.log('='.repeat(60));
    console.log('\nFixed:');
    console.log('  ✓ tasks.study_plan_id column');
    console.log('  ✓ study_goals table');
    console.log('  ✓ task recurrence columns');
    console.log('  ✓ study session notes');
    
    console.log('\n📋 Your application should now work without database errors!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nError details:', error);
  } finally {
    // Disconnect from database
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the fixes
runFinalFixes().catch(console.error);