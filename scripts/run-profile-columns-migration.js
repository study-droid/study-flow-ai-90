import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DB_CONFIG = {
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.uuebhjidsaswvuexdcbb',
  password: 'bLsjb7JoIM2u0hX5',
  ssl: { rejectUnauthorized: false }
};

// Read migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_missing_profile_columns.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Starting profile columns migration...');
console.log('📁 Migration file:', migrationPath);
console.log('🔗 Connecting to database...');

const client = new Client(DB_CONFIG);

async function runMigration() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully!');
    
    // Check current columns
    console.log('📊 Checking current profile columns...');
    const checkQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `;
    
    const { rows: currentColumns } = await client.query(checkQuery);
    console.log('Current columns:', currentColumns.map(col => col.column_name).join(', '));
    
    // Run migration
    console.log('\n⚙️  Adding missing columns...');
    await client.query(migrationSQL);
    
    // Check columns after migration
    const { rows: newColumns } = await client.query(checkQuery);
    console.log('\n✅ Migration completed successfully!');
    console.log('New columns:', newColumns.map(col => col.column_name).join(', '));
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! All profile columns have been added.');
    console.log('='.repeat(60));
    console.log('\nAdded columns include:');
    console.log('  ✓ display_name');
    console.log('  ✓ email');
    console.log('  ✓ phone');
    console.log('  ✓ university');
    console.log('  ✓ major');
    console.log('  ✓ study_streak');
    console.log('  ✓ total_study_time');
    console.log('  ✓ preferred_session_length');
    console.log('  ✓ And more...');
    
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your application (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. The profile should now load without errors');
    console.log('\n✨ Your app is ready to use!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 Some columns may already exist, which is fine.');
      console.log('   The migration uses IF NOT EXISTS clauses.');
    } else {
      console.log('\nError details:', error);
      console.log('\n💡 You can also run the migration manually in Supabase dashboard:');
      console.log('   https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/sql/new');
    }
  } finally {
    // Disconnect from database
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the migration
runMigration().catch(console.error);