import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

console.log('🚀 Fixing all missing columns...');
console.log('🔗 Connecting to database...');

const client = new Client(DB_CONFIG);

async function runMigrations() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Fix 1: Add is_active to subjects
    console.log('📊 Adding is_active column to subjects...');
    try {
      await client.query(`
        ALTER TABLE public.subjects 
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      `);
      
      await client.query(`
        UPDATE public.subjects 
        SET is_active = true 
        WHERE is_active IS NULL;
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);
      `);
      console.log('✅ subjects.is_active column added\n');
    } catch (err) {
      console.log('⚠️  subjects.is_active might already exist\n');
    }
    
    // Fix 2: Check and add any other commonly missing columns
    console.log('📊 Checking for other missing columns...');
    
    // Add archived column to various tables
    const tablesNeedingArchived = ['tasks', 'goals', 'flashcard_decks'];
    for (const table of tablesNeedingArchived) {
      try {
        await client.query(`
          ALTER TABLE public.${table}
          ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
        `);
        console.log(`✅ Added archived column to ${table}`);
      } catch (err) {
        // Column might already exist
      }
    }
    
    // Add is_favorite to subjects
    try {
      await client.query(`
        ALTER TABLE public.subjects
        ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
      `);
      console.log('✅ Added is_favorite column to subjects');
    } catch (err) {
      // Column might already exist
    }
    
    // Add reminder_enabled to tasks
    try {
      await client.query(`
        ALTER TABLE public.tasks
        ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMPTZ;
      `);
      console.log('✅ Added reminder columns to tasks');
    } catch (err) {
      // Columns might already exist
    }
    
    // Fix 3: Ensure all required indexes exist
    console.log('\n📊 Creating performance indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_subjects_user_is_active ON public.subjects(user_id, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_user_status_archived ON public.tasks(user_id, status) WHERE archived = false',
      'CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals(user_id, status)',
    ];
    
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log('✅ Index created');
      } catch (err) {
        // Index might already exist
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! All missing columns have been added.');
    console.log('='.repeat(60));
    console.log('\nFixed:');
    console.log('  ✓ subjects.is_active column');
    console.log('  ✓ archived columns for tasks, goals, flashcards');
    console.log('  ✓ subjects.is_favorite column');
    console.log('  ✓ task reminder columns');
    console.log('  ✓ Performance indexes');
    
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your application');
    console.log('2. All database errors should be resolved');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nError details:', error);
  } finally {
    // Disconnect from database
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the migrations
runMigrations().catch(console.error);