#!/usr/bin/env node

/**
 * Direct Database Migration Script
 * 
 * This script connects directly to your Supabase database and applies the migration.
 * 
 * Usage:
 * 1. Set your database password as an environment variable:
 *    export DB_PASSWORD="your-database-password"
 * 
 * 2. Run the script:
 *    node scripts/apply-migration.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
const DB_HOST = 'aws-0-us-east-1.pooler.supabase.com';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres.uuebhjidsaswvuexdcbb';

// Get password from environment or prompt user
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Error: Database password not provided');
  console.log('\nTo run this migration, you need your Supabase database password.');
  console.log('\nYou can find it in your Supabase dashboard:');
  console.log('1. Go to: https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/settings/database');
  console.log('2. Look for "Database Password" section');
  console.log('3. Copy your password');
  console.log('\nThen run this command with your password:');
  console.log('  On Windows (PowerShell):');
  console.log('    $env:DB_PASSWORD="your-password-here"; node scripts/apply-migration.js');
  console.log('  On Mac/Linux:');
  console.log('    DB_PASSWORD="your-password-here" node scripts/apply-migration.js');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'fix_profiles_user_id.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Migration Ready to Apply');
console.log('============================');
console.log('Database:', `${DB_HOST}:${DB_PORT}/${DB_NAME}`);
console.log('User:', DB_USER);
console.log('Migration file:', migrationPath);
console.log('\n🔄 Attempting to connect to database...');

// Since we don't have pg installed, provide manual instructions
console.log('\n' + '='.repeat(80));
console.log('⚠️  MANUAL MIGRATION REQUIRED');
console.log('='.repeat(80));
console.log('\nTo apply this migration, please choose one of these options:\n');

console.log('OPTION 1: Supabase Dashboard (Easiest)');
console.log('---------------------------------------');
console.log('1. Go to: https://supabase.com/dashboard/project/uuebhjidsaswvuexdcbb/sql/new');
console.log('2. Paste the SQL below and click "Run"\n');

console.log('OPTION 2: Using psql Command Line');
console.log('----------------------------------');
console.log('If you have PostgreSQL installed locally, run:');
console.log(`psql "postgresql://${DB_USER}:[YOUR-PASSWORD]@${DB_HOST}:${DB_PORT}/${DB_NAME}" -f "${migrationPath}"`);

console.log('\n' + '='.repeat(80));
console.log('SQL TO RUN:');
console.log('='.repeat(80));
console.log(migrationSQL);
console.log('='.repeat(80));

console.log('\n✅ After running the migration:');
console.log('1. Clear browser local storage (F12 → Application → Local Storage → Clear)');
console.log('2. Refresh your application');
console.log('\nThis will fix the "column profiles.user_id does not exist" error.');