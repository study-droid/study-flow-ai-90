/**
 * Script to check flashcard schema and fix any issues
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFlashcardSchema() {
  try {
    console.log('Checking flashcards table schema...');
    
    // Test a simple query to see if the table exists
    const { data, error } = await supabase
      .from('flashcards')
      .select('id, front_text, back_text')
      .limit(1);
    
    if (error) {
      console.error('Error querying flashcards table:', error);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Flashcards table does not exist');
        console.log('💡 Solution: Run the database migration to create the flashcards table');
        return;
      }
      
      if (error.message.includes('back_text') && error.message.includes('schema cache')) {
        console.log('❌ Schema cache issue detected');
        console.log('💡 Solution: The PostgREST schema cache needs to be refreshed');
        console.log('   This usually resolves itself within 1-2 minutes');
        console.log('   Or restart the Supabase project from the dashboard');
        return;
      }
      
      console.log('❌ Unknown error with flashcards table');
      return;
    }
    
    console.log('✅ Flashcards table exists and is accessible');
    console.log('✅ back_text column is available');
    
    if (data && data.length > 0) {
      console.log(`📊 Found ${data.length} flashcard(s) in the table`);
    } else {
      console.log('📝 Table is empty (no flashcards yet)');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkFlashcardSchema();