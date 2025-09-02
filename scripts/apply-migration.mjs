#!/usr/bin/env node

/**
 * Apply database migration to add missing subject column to tasks table
 * Uses direct Supabase connection with service role key
 */

import { createClient } from '@supabase/supabase-js';

// Database credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Error: SUPABASE_ANON_KEY environment variable is not set');
  console.log('Please set the environment variable before running this script.');
  console.log('Example: SUPABASE_ANON_KEY="your-key" node apply-migration.mjs');
  process.exit(1);
}

// PostgreSQL connection string from environment
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@host:5432/database';

console.log('🔧 Applying database migration to fix tasks table...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    // First, check if the subject column already exists
    console.log('📊 Checking current tasks table structure...');
    
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'tasks' })
      .select('*');
    
    if (columnsError) {
      console.log('⚠️  Could not check table columns (this is normal if the function doesn\'t exist)');
      console.log('    Proceeding with migration attempt...\n');
    } else if (columns) {
      console.log('Current columns:', columns.map(c => c.column_name).join(', '));
      
      if (columns.some(c => c.column_name === 'subject')) {
        console.log('✅ Subject column already exists! No migration needed.');
        return;
      }
    }

    // Since we can't run raw SQL through the JS client, we'll test by trying to insert
    console.log('\n🧪 Testing if subject column exists by attempting an insert...');
    
    const testData = {
      title: 'Migration Test Task',
      user_id: '00000000-0000-0000-0000-000000000000',
      subject: 'Test Subject',
      priority: 'low',
      status: 'pending'
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([testData])
      .select();
    
    if (error) {
      if (error.message?.includes('subject') && error.message?.includes('column')) {
        console.log('\n❌ Subject column is missing from the database.');
        console.log('\n📝 MANUAL FIX REQUIRED:');
        console.log('════════════════════════════════════════════════════════');
        console.log('\n Option 1: Supabase Dashboard (Easiest)');
        console.log(' 1. Go to: https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/editor');
        console.log(' 2. Click on the "tasks" table');
        console.log(' 3. Click "Add column" button');
        console.log(' 4. Set:');
        console.log('    - Name: subject');
        console.log('    - Type: text');
        console.log('    - Nullable: ✅ (checked)');
        console.log(' 5. Click "Save"');
        
        console.log('\n Option 2: SQL Editor in Supabase');
        console.log(' 1. Go to: https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/sql');
        console.log(' 2. Run this SQL:');
        console.log('\n   ALTER TABLE public.tasks');
        console.log('   ADD COLUMN IF NOT EXISTS subject text;');
        console.log('\n   CREATE INDEX IF NOT EXISTS idx_tasks_subject');
        console.log('   ON public.tasks(subject);');
        console.log('\n   CREATE INDEX IF NOT EXISTS idx_tasks_user_subject');
        console.log('   ON public.tasks(user_id, subject);');
        
        console.log('\n Option 3: Using psql (if you have it installed)');
        console.log(` psql "${connectionString}" -c "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject text;"`);
        
        console.log('\n════════════════════════════════════════════════════════');
      } else {
        console.log('\n⚠️  Unexpected error:', error.message);
      }
    } else {
      console.log('✅ Subject column exists and is working!');
      
      // Clean up test data
      if (data && data[0]) {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', data[0].id);
        console.log('🧹 Cleaned up test data');
      }
    }
    
    console.log('\n📌 Connection Details:');
    console.log('   Supabase URL:', supabaseUrl);
    console.log('   Database:', 'postgres');
    console.log('   Host:', 'db.uuebhjidsaswvuexdcbb.supabase.co');
    console.log('   Port:', '5432');
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  }
}

// Run the migration
applyMigration();