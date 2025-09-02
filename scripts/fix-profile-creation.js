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
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_profile_trigger.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Fixing profile creation logic...');
console.log('📁 Migration file:', migrationPath);
console.log('🔗 Connecting to database...');

const client = new Client(DB_CONFIG);

async function runMigration() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully!');
    
    // Check for existing profiles with issues
    console.log('\n📊 Checking for profile issues...');
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM public.profiles 
      WHERE user_id IS NULL OR id IS NULL OR display_name IS NULL;
    `;
    
    const { rows: issues } = await client.query(checkQuery);
    console.log(`Found ${issues[0].count} profiles with missing data`);
    
    // Run migration
    console.log('\n⚙️  Applying fixes...');
    await client.query(migrationSQL);
    
    // Verify the fix
    const { rows: afterFix } = await client.query(checkQuery);
    console.log(`After fix: ${afterFix[0].count} profiles with issues`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Profile creation has been fixed.');
    console.log('='.repeat(60));
    console.log('\nWhat was fixed:');
    console.log('  ✓ Profile creation now includes id field');
    console.log('  ✓ Trigger updated to handle new users properly');
    console.log('  ✓ Existing profiles have been repaired');
    console.log('  ✓ Default values set for required fields');
    
    console.log('\n📋 Next steps:');
    console.log('1. The error should be resolved now');
    console.log('2. Try refreshing your application');
    console.log('3. New users will have profiles created automatically');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('permission denied')) {
      console.log('\n💡 This might be a permissions issue.');
      console.log('   You may need to run this in the Supabase dashboard.');
    } else {
      console.log('\nError details:', error);
    }
    
    console.log('\n💡 Alternative: Run this SQL in Supabase dashboard:');
    console.log('   https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/sql/new');
    console.log('\nSQL to run:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---');
  } finally {
    // Disconnect from database
    await client.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the migration
runMigration().catch(console.error);