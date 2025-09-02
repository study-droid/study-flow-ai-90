/**
 * Secure API Key Storage Script
 * ⚠️ WARNING: NEVER commit this file with actual API keys!
 * 
 * This script helps you securely store API keys in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const { config } = require('./config');

// Create readline interface for secure input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Hide input for API key entry
const hidden = (query) => new Promise((resolve) => {
  const stdin = process.stdin;
  const stdout = process.stdout;
  
  stdin.on('data', (char) => {
    char = char + '';
    if (char === '\n' || char === '\r' || char === '\u0004') {
      stdin.removeAllListeners('data');
      stdout.write('\n');
      resolve();
    } else if (char === '\u0003') {
      process.exit();
    } else {
      stdout.write('*');
    }
  });
  
  stdout.write(query);
  stdin.setRawMode(true);
  stdin.resume();
});

async function storeApiKey() {
  // Initialize Supabase client
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔐 Secure API Key Storage');
  console.log('========================\n');
  
  // Get provider choice
  const provider = await new Promise((resolve) => {
    rl.question('Select provider (openai/gemini/claude): ', resolve);
  });

  // Get API key securely (input will be hidden)
  console.log('\nEnter your API key (input will be hidden):');
  
  const apiKey = await new Promise((resolve) => {
    // Set terminal to hide input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    let key = '';
    process.stdin.on('data', (char) => {
      char = char.toString();
      
      if (char === '\n' || char === '\r') {
        process.stdin.removeAllListeners('data');
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        console.log(''); // New line after hidden input
        resolve(key);
      } else if (char === '\u0003') {
        // Handle Ctrl+C
        process.exit();
      } else if (char === '\u007f') {
        // Handle backspace
        if (key.length > 0) {
          key = key.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        key += char;
        process.stdout.write('*');
      }
    });
    
    process.stdin.resume();
  });

  // Store the API key using the SQL function
  try {
    console.log('\n📝 Storing API key...');
    
    const { data, error } = await supabase
      .rpc('store_api_key', {
        p_key_name: `${provider}_api_key`,
        p_key_value: apiKey,
        p_provider: provider
      });

    if (error) {
      console.error('❌ Error storing API key:', error.message);
    } else {
      console.log('✅ API key stored successfully!');
      console.log(`   Key name: ${provider}_api_key`);
      console.log('   The key is now securely stored in Supabase');
      
      // List all stored keys
      const { data: keys } = await supabase.rpc('list_api_keys');
      if (keys) {
        console.log('\n📋 Your stored API keys:');
        console.log(JSON.stringify(keys, null, 2));
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  rl.close();
  process.exit(0);
}

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

// Run the script
console.log('⚠️  SECURITY REMINDER:');
console.log('   1. NEVER share your API keys');
console.log('   2. NEVER commit API keys to Git');
console.log('   3. Rotate keys regularly');
console.log('   4. Revoke compromised keys immediately\n');

storeApiKey();