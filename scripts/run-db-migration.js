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

// Read migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_profiles_user_id.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Starting database migration...');
console.log('📁 Migration file:', migrationPath);
console.log('🔗 Connecting to database...');

const client = new Client(DB_CONFIG);

async function runMigration() {
  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database successfully!');
    
    // Run migration
    console.log('⚙️  Running migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! The profiles.user_id column has been added.');
    console.log('='.repeat(60));
    console.log('\n📋 Next steps:');
    console.log('1. Clear your browser\'s local storage:');
    console.log('   - Press F12 to open DevTools');
    console.log('   - Go to Application tab');
    console.log('   - Find Local Storage → http://localhost:8082');
    console.log('   - Right-click and select "Clear"');
    console.log('2. Refresh your application');
    console.log('\n✨ Your app should now work without the user_id error!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 It looks like the migration may have already been applied.');
      console.log('   Try clearing your browser cache and refreshing the app.');
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