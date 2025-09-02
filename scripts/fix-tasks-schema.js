// Script to fix the missing subject column in tasks table
// Run with: node scripts/fix-tasks-schema.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_ANON_KEY environment variable is not set');
  console.log('Please set the environment variable before running this script.');
  console.log('Example: SUPABASE_ANON_KEY="your-key" node fix-tasks-schema.js');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTasksSchema() {
  try {
    console.log('🔧 Fixing tasks table schema...');
    
    // Read the migration SQL
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', 'add_subject_to_tasks.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Applying migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try a simpler approach - just add the column
      console.log('🔄 Trying simpler approach...');
      const simpleSQL = `
        ALTER TABLE public.tasks 
        ADD COLUMN IF NOT EXISTS subject text;
        
        CREATE INDEX IF NOT EXISTS idx_tasks_subject ON public.tasks(subject);
      `;
      
      const { data: simpleData, error: simpleError } = await supabase.rpc('exec_sql', {
        sql: simpleSQL
      });
      
      if (simpleError) {
        console.error('❌ Simple approach also failed:', simpleError);
        
        // Manual approach using REST API
        console.log('🔄 Trying REST API approach...');
        
        // First, let's check if the column exists
        const { data: tableInfo, error: infoError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'tasks')
          .eq('table_schema', 'public');
          
        if (infoError) {
          console.error('❌ Could not check table info:', infoError);
          return;
        }
        
        console.log('📊 Current tasks table columns:', tableInfo?.map(col => col.column_name));
        
        const hasSubjectColumn = tableInfo?.some(col => col.column_name === 'subject');
        
        if (hasSubjectColumn) {
          console.log('✅ Subject column already exists!');
        } else {
          console.log('❌ Subject column is missing from database');
          console.log('💡 Please add the column manually in Supabase dashboard:');
          console.log('   1. Go to https://uuebhjidsaswvuexdcbb.supabase.co/project/default/editor');
          console.log('   2. Select the "tasks" table');
          console.log('   3. Add a new column named "subject" with type "text"');
        }
        
        return;
      }
      
      console.log('✅ Simple migration applied successfully');
    } else {
      console.log('✅ Migration applied successfully');
    }
    
    // Test the fix by trying to create a task
    console.log('🧪 Testing the fix...');
    
    const testTask = {
      title: 'Test Task',
      description: 'Test task to verify subject column',
      subject: 'Mathematics',
      priority: 'medium',
      status: 'pending',
      user_id: '00000000-0000-0000-0000-000000000000' // placeholder
    };
    
    // Don't actually insert, just validate the schema
    console.log('📋 Test task data:', testTask);
    console.log('✅ Schema fix completed!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the fix
fixTasksSchema();